/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { CustomProfileData, isDiscordId, profileApiOrigin, publicCustomProfile } from "@shared/eqyCustomProfile";
import config from "@shared/eqyProfileService.json";
import { UserStore } from "@webpack/common";

export const serviceOrigin = profileApiOrigin(config.origin);
const KEY = "eqycord.profileSessions.v1";
const pendingIds = new Set<string>();
const fetchedAt = new Map<string, number>();
let active = false;
let timer: ReturnType<typeof setInterval> | undefined;
let onProfile: (id: string, profile: CustomProfileData | null) => void;
let inFlight = false;
let loginController: AbortController | undefined;
async function tokenFor(id: string) {
    const sessions = await DataStore.get<Record<string, string>>(KEY);
    return sessions?.[id];
}
export async function request(path: string, init: RequestInit = {}) {
    if (!serviceOrigin) throw new Error("Profile sharing service is not configured yet");
    const id = UserStore.getCurrentUser()?.id;
    const token = id && await tokenFor(id);
    if (!token) throw new Error("Connect your Discord account first");
    const response = await fetch(`${serviceOrigin}${path}`, { ...init, signal: AbortSignal.timeout(15_000), headers: { "Content-Type": "application/json", ...init.headers, Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error(response.status === 401 ? "Reconnect your Discord account" : response.status === 429 ? "Please try again later" : "Profile service is unavailable");
    return response.json();
}
export async function isConnected() {
    const id = UserStore.getCurrentUser()?.id;
    return !!(id && await tokenFor(id));
}
export async function connectAccount() {
    if (!serviceOrigin) throw new Error("Profile sharing service is not configured yet");
    loginController?.abort();
    const controller = loginController = new AbortController();
    const userId = UserStore.getCurrentUser()?.id;
    if (!userId) throw new Error("Sign into Discord first");
    if (!IS_WEB && !await VencordNative.csp.isDomainAllowed(serviceOrigin, ["connect-src"])) {
        const result = await VencordNative.csp.requestAddOverride(serviceOrigin, ["connect-src"], "EqyCord Custom Profile");
        if (result !== "ok") throw new Error("Profile service connection was not allowed");
        throw new Error("Restart Discord to enable the profile service connection, then connect again");
    }
    const b64 = (v: Uint8Array) => btoa(String.fromCharCode(...v)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
    const verifier = b64(crypto.getRandomValues(new Uint8Array(32)));
    const challenge = b64(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
    const start = await fetch(`${serviceOrigin}/auth/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challenge }), signal: AbortSignal.timeout(15_000) });
    if (!start.ok) throw new Error("Profile service is unavailable");
    const { state, authorizeUrl } = await start.json();
    const target = new URL(authorizeUrl);
    if (target.origin !== serviceOrigin || target.pathname !== "/auth/authorize" || !/^[A-Za-z0-9_-]{43}$/.test(state)) throw new Error("Invalid sign-in response");
    if (IS_WEB) window.open(target.href, "_blank", "noopener,noreferrer");
    else VencordNative.native.openExternal(target.href);
    const deadline = Date.now() + 300_000;
    while (!controller.signal.aborted && Date.now() < deadline) {
        await new Promise<void>((resolve, reject) => {
            const finish = () => { controller.signal.removeEventListener("abort", abort); resolve(); };
            const handle = setTimeout(finish, 3000);
            const abort = () => { clearTimeout(handle); reject(new Error("Sign-in cancelled")); };
            controller.signal.addEventListener("abort", abort, { once: true });
        });
        const response = await fetch(`${serviceOrigin}/auth/finish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ state, verifier }), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) });
        if (response.status === 202) continue;
        if (!response.ok) throw new Error("Could not complete sign-in");
        const result = await response.json();
        if (result.userId !== userId || UserStore.getCurrentUser()?.id !== userId) {
            await fetch(`${serviceOrigin}/session`, { method: "DELETE", headers: { Authorization: `Bearer ${result.token}` }, signal: AbortSignal.timeout(15_000) }).catch(() => {});
            throw new Error("Authorize the same account that is currently open in Discord");
        }
        if (!/^[A-Za-z0-9_-]{43}$/.test(result.token)) throw new Error("Invalid session");
        const sessions = await DataStore.get<Record<string, string>>(KEY) ?? {};
        await DataStore.set(KEY, { ...sessions, [userId]: result.token });
        return;
    }
    throw new Error("Sign-in timed out");
}
export async function disconnectAccount() {
    await request("/session", { method: "DELETE" });
    const sessions = await DataStore.get<Record<string, string>>(KEY) ?? {};
    delete sessions[UserStore.getCurrentUser().id];
    await DataStore.set(KEY, sessions);
    fetchedAt.clear();
}
export async function publishProfile(data: CustomProfileData) {
    await request("/profile", { method: "PUT", body: JSON.stringify(publicCustomProfile(data)) });
}
export async function removeSharedProfile() {
    await request("/profile", { method: "DELETE" });
}
export function queueProfile(id: string) {
    if (active && serviceOrigin && isDiscordId(id) && Date.now() - (fetchedAt.get(id) ?? 0) > 60_000) pendingIds.add(id);
}
async function flush() {
    if (!active || inFlight || !pendingIds.size || document.hidden || !await isConnected()) return;
    inFlight = true;
    const ids = [...pendingIds].slice(0, 50);
    ids.forEach(id => pendingIds.delete(id));
    try {
        const profiles = await request(`/profiles?ids=${ids.join(",")}`);
        if (active) for (const id of ids) {
            fetchedAt.set(id, Date.now());
            onProfile(id, profiles[id] ? publicCustomProfile(profiles[id]) : null);
        }
    } catch {
        ids.forEach(id => fetchedAt.set(id, Date.now()));
    } finally { inFlight = false; }
}
export function startService(listener: typeof onProfile) {
    active = true;
    onProfile = listener;
    timer = setInterval(() => { void flush(); }, 5000);
}
export function stopService() {
    active = false;
    if (timer) clearInterval(timer);
    loginController?.abort();
    pendingIds.clear();
    fetchedAt.clear();
}
