/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { fetchBuffer, fetchJson } from "@main/utils/http";
import { IpcEvents } from "@shared/IpcEvents";
import { VENCORD_USER_AGENT } from "@shared/vencordUserAgent";
import { createHash } from "crypto";
import { ipcMain } from "electron";
import { readFile, rename, unlink,writeFile } from "fs/promises";
import { join, resolve } from "path";

import gitHash from "~git-hash";

import { serializeErrors, VENCORD_FILES } from "./common";

const REPO = "zztwi/EqyCord-releases";
const API_BASE = `https://api.github.com/repos/${REPO}`;
interface Manifest { commit: string; ancestors: string[]; files: Record<string, string>; }
let pending: { manifest: Manifest; urls: Record<string, string>; } | undefined;
const digest = (data: Buffer) => createHash("sha256").update(data).digest("hex");
async function githubGet(endpoint: string) {
    return fetchJson<any>(API_BASE + endpoint, { headers: { Accept: "application/vnd.github+json", "User-Agent": VENCORD_USER_AGENT }, signal: AbortSignal.timeout(20000) });
}
function trusted(url: string) {
    const parsed = new URL(url);
    if (parsed.origin !== "https://github.com" || !parsed.pathname.startsWith(`/${REPO}/releases/download/`)) throw new Error("Unexpected release asset origin");
    return parsed.href;
}
async function fetchUpdates() {
    pending = undefined;
    let data: any;
    try { data = await githubGet("/releases/latest"); }
    catch (error) { if (String(error).includes("404")) return false; throw error; }
    if (data.draft || data.prerelease) return false;
    const urls: Record<string, string> = {};
    for (const asset of data.assets ?? []) if ([...VENCORD_FILES, "eqycord-update.json"].includes(asset.name)) urls[asset.name] = trusted(asset.browser_download_url);
    if (!urls["eqycord-update.json"]) throw new Error("Release has no EqyCord update manifest");
    const manifest = await fetchJson<Manifest>(urls["eqycord-update.json"], { signal: AbortSignal.timeout(20000) });
    if (!/^[a-f0-9]{40}$/.test(manifest.commit) || !VENCORD_FILES.every(name => /^[a-f0-9]{64}$/.test(manifest.files?.[name]) && urls[name])) throw new Error("Incomplete release manifest");
    if (manifest.commit.startsWith(gitHash)) return false;
    // Source history is private. The trusted release manifest records its ancestry.
    if (!/^[a-f0-9]{7,40}$/.test(gitHash) || !Array.isArray(manifest.ancestors) || manifest.ancestors.length > 10000
        || manifest.ancestors.some(hash => !/^[a-f0-9]{40}$/.test(hash))
        || !manifest.ancestors.some(hash => hash.startsWith(gitHash))) throw new Error("This release does not extend your installed EqyCord build");
    pending = { manifest, urls };
    return true;
}
async function changes() {
    if (!await fetchUpdates()) return [];
    return [{ hash: pending!.manifest.commit.slice(0, 7), author: "EqyCord", message: "Validated EqyCord release" }];
}
async function applyUpdates() {
    if (!pending) throw new Error("Check for updates first");
    const release = pending;
    const files = await Promise.all(VENCORD_FILES.map(async name => {
        const data = await fetchBuffer(release.urls[name], { signal: AbortSignal.timeout(60000) });
        if (data.length > 25000000 || digest(data) !== release.manifest.files[name]) throw new Error("Update checksum mismatch: " + name);
        return { name, data, old: await readFile(join(__dirname, name)) };
    }));
    const statePath = IS_DISCORD_DESKTOP ? join(process.resourcesPath, ".eqycord-install.json") : undefined;
    const stateBytes = statePath ? await readFile(statePath) : undefined;
    const state = stateBytes ? JSON.parse(stateBytes.toString()) : undefined;
    if (state) {
        if (resolve(state.project, "dist") !== resolve(__dirname)) throw new Error("This build is not the managed EqyCord installation");
        if (digest(await readFile(join(process.resourcesPath, "_app.asar"))) !== state.originalHash || digest(await readFile(join(process.resourcesPath, "app.asar"))) !== state.patchedHash) throw new Error("Discord installation changed; repair it before updating");
        for (const file of files) if (state.buildHashes?.[file.name] !== digest(file.old)) throw new Error("Installed build changed; repair it before updating");
    }
    const written: string[] = [];
    try {
        for (const file of files) {
            const destination = join(__dirname, file.name);
            await writeFile(destination + ".update", file.data);
            await rename(destination + ".update", destination);
            written.push(file.name);
        }
        if (statePath && state) {
            state.buildHashes = Object.fromEntries(files.map(file => [file.name, digest(file.data)]));
            state.updateCommit = release.manifest.commit;
            await writeFile(statePath + ".update", JSON.stringify(state, null, 2));
            await rename(statePath + ".update", statePath);
        }
    } catch (error) {
        for (const file of files) if (written.includes(file.name)) await writeFile(join(__dirname, file.name), file.old);
        if (statePath && stateBytes) await writeFile(statePath, stateBytes);
        throw error;
    } finally {
        await Promise.all(files.map(file => unlink(join(__dirname, file.name) + ".update").catch(() => {})));
        pending = undefined;
    }
    return true;
}
ipcMain.handle(IpcEvents.GET_REPO, serializeErrors(() => `https://github.com/${REPO}`));
ipcMain.handle(IpcEvents.GET_UPDATES, serializeErrors(changes));
ipcMain.handle(IpcEvents.UPDATE, serializeErrors(fetchUpdates));
ipcMain.handle(IpcEvents.BUILD, serializeErrors(applyUpdates));
