/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import * as DataStore from "@api/DataStore";
import { HeaderBarButton } from "@api/HeaderBar";
import { UserSettings } from "@api/UserSettings";
import { ModalCloseButton, ModalContent, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import definePlugin, { PluginNative } from "@utils/types";
import { React, UserStore } from "@webpack/common";

import { measure, Measurement } from "./diagnostics";

interface Change { group: string; name: string; before: boolean; applied: boolean; }
let changes: Change[] = [];
let controller: AbortController | undefined;
let enabled = false;
let pendingMutation: Promise<void> | undefined;
let appliedUser: string | undefined;
const key = (id: string) => `eqycord.tweak.${id}`;
const Native = !IS_WEB ? VencordNative.pluginHelpers.Tweak as PluginNative<typeof import("./native")> : undefined;
async function measurement(signal: AbortSignal) {
    await Native?.sampleMetrics().catch(() => {});
    const result = await measure(signal);
    const native = await Native?.sampleMetrics().catch(() => undefined);
    return { ...result, cpuPercent: native?.cpuPercent ?? null, processMemoryMB: native?.processMemoryMB ?? null };
}
const desired: Record<string, boolean> = { gifAutoPlay: false, animateEmoji: false, stickersAnimate: false, reducedMotion: true };
const labels: Record<string, string> = { gifAutoPlay: "Automatic GIF playback", animateEmoji: "Animated emoji", stickersAnimate: "Animated stickers", reducedMotion: "Reduced motion" };
function candidates() {
    return Object.values(UserSettings ?? {}).filter(x => x && typeof x.getSetting === "function" && Object.hasOwn(desired, x.userSettingsAPIName) && typeof x.getSetting() === "boolean");
}
async function restore() {
    const user = UserStore.getCurrentUser()?.id;
    if (!user) return;
    if (appliedUser !== user) { document.documentElement.classList.remove("eqy-tweak-optimized"); return; }
    const all = Object.values(UserSettings ?? {});
    const remaining: Change[] = [];
    for (const change of changes) {
        const setting = all.find(x => x?.userSettingsAPIGroup === change.group && x.userSettingsAPIName === change.name);
        try { if (!setting) { remaining.push(change); continue; } if (setting.getSetting() === change.applied) await setting.updateSetting(change.before); }
        catch { remaining.push(change); }
    }
    changes = remaining;
    await DataStore.set(key(user), changes);
    document.documentElement.classList.remove("eqy-tweak-optimized");
    if (remaining.length) throw new Error("Some settings could not be restored. Try Restore again.");
}
async function optimize() {
    const user = UserStore.getCurrentUser()?.id;
    if (!user) throw new Error("Sign into Discord first.");
    if (appliedUser !== user) { changes = await DataStore.get<Change[]>(key(user)) ?? []; appliedUser = user; }
    for (const setting of candidates()) {
        if (!enabled || controller?.signal.aborted || UserStore.getCurrentUser()?.id !== user) throw new Error("Optimization interrupted. Restore settings to undo applied changes.");
        const applied = desired[setting.userSettingsAPIName];
        if (setting.getSetting() === applied) continue;
        const change = { group: setting.userSettingsAPIGroup, name: setting.userSettingsAPIName, before: setting.getSetting(), applied };
        if (!changes.some(x => x.group === change.group && x.name === change.name)) changes.push(change);
        await DataStore.set(key(user), changes);
        await setting.updateSetting(applied);
    }
    if (enabled) document.documentElement.classList.add("eqy-tweak-optimized");
}
function Icon(props: any) { return <svg {...props} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2 4 14h7l-1 8 10-13h-8Z" /></svg>; }
function Panel(props: any) {
    const [before, setBefore] = React.useState<Measurement | null>(null), [after, setAfter] = React.useState<Measurement | null>(null);
    const [busy, setBusy] = React.useState(false), [error, setError] = React.useState(""), [applied, setApplied] = React.useState(changes.length > 0);
    React.useEffect(() => () => controller?.abort(), []);
    async function run(action: "measure" | "optimize" | "restore") {
        setBusy(true); setError(""); controller?.abort(); controller = new AbortController();
        try {
            if (action === "restore") { await restore(); setApplied(false); setAfter(null); }
            else if (action === "measure") { setBefore(await measurement(controller.signal)); setAfter(null); }
            else { if (!before) throw new Error("Run diagnostics before optimizing."); pendingMutation = optimize(); await pendingMutation; pendingMutation = undefined; setApplied(true); setAfter(await measurement(controller.signal)); }
        } catch (e) { setError(e instanceof Error ? e.message : "Could not complete diagnostics."); }
        finally { pendingMutation = undefined; setApplied(changes.length > 0 || document.documentElement.classList.contains("eqy-tweak-optimized")); setBusy(false); }
    }
    const Root = ModalRoot as React.ComponentType<any>;
    const Header = ModalHeader as React.ComponentType<any>, Content = ModalContent as React.ComponentType<any>, Close = ModalCloseButton as React.ComponentType<any>;
    return <Root {...props} className="eqy-tweak-panel" size="medium"><Header className="eqy-tweak-header"><span className="eqy-tweak-heading-icon"><Icon /></span><h2>Tweak</h2><span className="eqy-tweak-close"><Close onClick={props.onClose} /></span></Header><Content className="eqy-tweak-content">
        <p className="eqy-tweak-intro">Measure your interface, reduce automatic animations, then compare the results in the same screen.</p>
        <div className="eqy-tweak-actions"><button disabled={busy} onClick={() => void run("measure")}>1. Run diagnostics</button><button disabled={busy || !before} onClick={() => void run("optimize")}>2. Optimize & compare</button><button className="eqy-tweak-secondary" disabled={busy || !applied} onClick={() => void run("restore")}>Restore settings</button></div>
        {busy && <p role="status">Measuring for six seconds… keep this window visible.</p>}
        {(before || after) && <table><thead><tr><th>Measured locally</th><th>Before</th><th>After</th></tr></thead><tbody>{([ ["Interface frames / second", "fps"], ["95th percentile frame time (ms)", "p95"], ["Long tasks", "longTasks"], ["JavaScript heap (MB)", "heapMB"], ["Discord process CPU (%)", "cpuPercent"], ["Process working sets (MB)", "processMemoryMB"] ] as const).map(([label, field]) => <tr key={field}><td>{label}</td>{[before, after].map((result, i) => <td key={i}>{result?.[field] == null ? "Unavailable" : result[field]!.toFixed(1)}</td>)}</tr>)}</tbody></table>}
        <section className="eqy-tweak-section"><h3>Available automatic changes</h3><ul className="eqy-tweak-options">{candidates().map(x => <li key={`${x.userSettingsAPIGroup}.${x.userSettingsAPIName}`}><span>{labels[x.userSettingsAPIName]}</span><span className="eqy-tweak-value">{x.getSetting() ? "On" : "Off"}</span></li>)}<li><span>Decorative interface animation and transitions</span></li></ul></section>
        <section className="eqy-tweak-section"><h3>Additional checks</h3><p>Review game overlay, Clips recording, high-resolution streams, video backgrounds and heavy themes in Discord settings.</p><details><summary>About these measurements</summary><p>Tweak keeps voice, screen sharing and notifications working. Hardware acceleration is not changed automatically.</p><p>CPU and process memory are available on desktop only. Working sets can include shared memory. These are not game FPS or total system CPU. Compare under the same conditions; a smaller frame time is better. Unsupported measurements are marked unavailable.</p></details></section>
        {error && <p role="alert">{error}</p>}
    </Content></Root>;
}
export default definePlugin({ name: "Tweak", description: "Performance diagnostics, reversible animation optimizations and before/after measurements.", authors: [{ name: "0009cx0", id: 380070146317877249n }], dependencies: ["UserSettingsAPI", "HeaderBarAPI"], enabledByDefault: true,
    headerBarButton: { icon: Icon, render: () => <HeaderBarButton icon={Icon} tooltip="Tweak" onClick={() => openModal(props => <Panel {...props} />)} />, priority: 15 },
    async start() { enabled = true; const id = UserStore.getCurrentUser()?.id; appliedUser = id; changes = id ? await DataStore.get<Change[]>(key(id)) ?? [] : []; if (!enabled) return; if (changes.length) document.documentElement.classList.add("eqy-tweak-optimized"); },
    stop() { enabled = false; controller?.abort(); void (pendingMutation ?? Promise.resolve()).catch(() => {}).then(restore).catch(() => {}); }
});




