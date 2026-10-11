/* EqyCord contributors, 2026. SPDX-License-Identifier: GPL-3.0-or-later */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { build } from "esbuild";

async function fixture() {
    const project = mkdtempSync(join(tmpdir(), "eqy-updater-")), dist = join(project, "dist"), resources = join(project, "resources");
    mkdirSync(dist); mkdirSync(resources);
    const names = ["patcher.js", "preload.js", "renderer.js", "renderer.css"];
    const hash = value => createHash("sha256").update(value).digest("hex");
    const original = Object.fromEntries(names.map(name => [name, Buffer.from("old " + name)]));
    const fresh = Object.fromEntries(names.map(name => [name, Buffer.from("new " + name)]));
    names.forEach(name => writeFileSync(join(dist, name), original[name]));
    const statePath = join(resources, ".eqycord-install.json");
    writeFileSync(join(resources, "_app.asar"), "unchanged original");
    writeFileSync(join(resources, "app.asar"), "owned patch");
    writeFileSync(statePath, JSON.stringify({ project, originalHash: hash("unchanged original"), patchedHash: hash("owned patch"), buildHashes: Object.fromEntries(names.map(name => [name, hash(original[name])])) }));
    const base = "https://github.com/zztwi/EqyCord-releases/releases/download/eqycord-test/";
    const assets = [...names, "eqycord-update.json"].map(name => ({ name, browser_download_url: base + name }));
    const manifest = { commit: "b".repeat(40), ancestors: ["a".repeat(40)], files: Object.fromEntries(names.map(name => [name, hash(fresh[name])])) };
    const handlers = {}, state = { corrupt: false, failWrite: false };
    globalThis.__eqyUpdaterFixture = { handlers, state, assets, manifest, fresh, base };
    const result = await build({ entryPoints: ["src/main/updater/http.ts"], bundle: true, write: false, platform: "node", format: "cjs", define: { IS_DISCORD_DESKTOP: "true" }, plugins: [{ name: "fixture", setup(b) {
        b.onResolve({ filter: /^(electron|~git-hash|@main\/utils\/http|@shared\/IpcEvents|@shared\/vencordUserAgent|fs\/promises)$/ }, args => ({ path: args.path, namespace: "mock" }));
        b.onLoad({ filter: /.*/, namespace: "mock" }, args => {
            const code = args.path === "electron" ? "export const ipcMain={handle:(key,fn)=>globalThis.__eqyUpdaterFixture.handlers[key]=fn};"
                : args.path === "~git-hash" ? "export default 'aaaaaaa';"
                    : args.path === "@shared/IpcEvents" ? "export const IpcEvents={GET_REPO:'repo',GET_UPDATES:'check',UPDATE:'update',BUILD:'build'};"
                        : args.path === "@shared/vencordUserAgent" ? "export const VENCORD_USER_AGENT='fixture';"
                            : args.path === "fs/promises" ? "const fs=require('node:fs/promises');export const readFile=fs.readFile,rename=fs.rename,unlink=fs.unlink;export async function writeFile(path,data){if(globalThis.__eqyUpdaterFixture.state.failWrite&&path.endsWith('preload.js.update'))throw Error('disk fixture failure');return fs.writeFile(path,data)}"
                                : "export async function fetchJson(url){if(url.includes('/compare/'))throw Error('Private Git history unavailable');const x=globalThis.__eqyUpdaterFixture;return url.endsWith('/releases/latest')?{assets:x.assets}:x.manifest}export async function fetchBuffer(url){const x=globalThis.__eqyUpdaterFixture;return x.state.corrupt?Buffer.from('corrupt'):x.fresh[url.split('/').pop()]}";
            return { contents: code, loader: "js" };
        });
    } }] });
    const oldResources = process.resourcesPath;
    process.resourcesPath = resources;
    new Function("require", "__dirname", result.outputFiles[0].text)(await import("node:module").then(m => m.createRequire(import.meta.url)), dist);
    return { handlers, state, names, original, fresh, dist, statePath, assets, manifest, base, finish: () => { process.resourcesPath = oldResources; delete globalThis.__eqyUpdaterFixture; } };
}
test("Managed updater verifies checksums, updates ownership hashes and preserves restoration metadata", async () => {
    const f = await fixture();
    try {
        assert.equal((await f.handlers.check()).value.length, 1);
        assert.equal((await f.handlers.update()).value, true);
        assert.equal((await f.handlers.build()).value, true);
        f.names.forEach(name => assert.deepEqual(readFileSync(join(f.dist, name)), f.fresh[name]));
        assert.equal(JSON.parse(readFileSync(f.statePath)).originalHash, createHash("sha256").update("unchanged original").digest("hex"));
        assert.equal(JSON.parse(readFileSync(f.statePath)).updateCommit, "b".repeat(40));
    } finally { f.finish(); }
});
test("Updater rejects corrupt downloads, external URLs and rolls back partial writes", async () => {
    const f = await fixture();
    try {
        await f.handlers.update(); f.state.corrupt = true;
        assert.equal((await f.handlers.build()).ok, false);
        f.names.forEach(name => assert.deepEqual(readFileSync(join(f.dist, name)), f.original[name]));
        f.state.corrupt = false; await f.handlers.update(); f.state.failWrite = true;
        assert.equal((await f.handlers.build()).ok, false);
        f.names.forEach(name => assert.deepEqual(readFileSync(join(f.dist, name)), f.original[name]));
        f.assets[0].browser_download_url = "https://example.com/patcher.js";
        assert.equal((await f.handlers.update()).ok, false);
        f.assets[0].browser_download_url = f.base + "patcher.js";
    } finally { f.finish(); }
});

test("Public release channel validates private-source ancestry without exposing Git history", async () => {
    const f = await fixture();
    try {
        assert.equal((await f.handlers.repo()).value, "https://github.com/zztwi/EqyCord-releases");
        assert.equal((await f.handlers.update()).value, true);
        f.manifest.ancestors = ["c".repeat(40)];
        assert.equal((await f.handlers.update()).ok, false, "Unrelated or older release rejected");
        f.manifest.ancestors = ["invalid"];
        assert.equal((await f.handlers.update()).ok, false, "Malformed ancestry rejected");
        f.manifest.ancestors = ["a".repeat(40)];
        f.manifest.commit = "a".repeat(40);
        assert.equal((await f.handlers.update()).value, false, "Installed release does not update itself");
    } finally { f.finish(); }
});
