/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "@utils/eqyMedia/styles.css";

import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { ApplicationAssetUtils, FluxDispatcher, React, showToast } from "@webpack/common";

let running = false, revision = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let lastPublished = 0;
function schedule() {
    clearTimeout(timer); ++revision;
    if (!running) return;
    if (!settings.store.active) { clear(); return; }
    timer = setTimeout(() => void publish(), Math.max(500, 5000 - (Date.now() - lastPublished)));
}
const settings = definePluginSettings({
    active: { type: OptionType.BOOLEAN, description: "Publish your custom game activity. Discord activity visibility must also be enabled.", default: false, onChange: schedule },
    applicationId: { type: OptionType.STRING, description: "Discord application ID. Upload image assets in that application's Rich Presence page.", default: "1558477119158231060", onChange: schedule },
    game: { type: OptionType.STRING, description: "Game name (2–128 characters; Discord may use the application's registered name).", default: "EqyCord", onChange: schedule },
    details: { type: OptionType.STRING, description: "Description (up to 128 characters).", default: "", onChange: schedule },
    state: { type: OptionType.STRING, description: "Activity status (up to 128 characters).", default: "", onChange: schedule },
    largeImage: { type: OptionType.STRING, description: "Large image asset key from the selected Discord application.", default: "", onChange: schedule },
    smallImage: { type: OptionType.STRING, description: "Small image asset key from the selected Discord application.", default: "", onChange: schedule },
    timer: { type: OptionType.SELECT, description: "Timer style.", options: [{ label: "None", value: "none", default: true }, { label: "Elapsed", value: "elapsed" }, { label: "Countdown", value: "countdown" }], onChange: schedule },
    minutes: { type: OptionType.NUMBER, description: "Countdown duration in minutes (1–1440).", default: 60, onChange: schedule },
    presets: { type: OptionType.COMPONENT, description: "Saved activities.", component: () => <Presets /> }
}).withPrivateSettings<{ saved?: { name: string; values: Record<string, any> }[]; }>();
const fields = ["applicationId", "game", "details", "state", "largeImage", "smallImage", "timer", "minutes"] as const;
function Presets() {
    const [name, setName] = React.useState("");
    const store = settings.use();
    return <div className="eqy-effect-settings"><input aria-label="Preset name" maxLength={32} value={name} onChange={e => setName(e.target.value)} /><button disabled={!name.trim() || (store.saved?.length ?? 0) >= 20} onClick={() => { settings.store.saved = [...store.saved ?? [], { name: name.trim(), values: Object.fromEntries(fields.map(k => [k, store[k]])) }]; setName(""); }}>Save preset</button>{store.saved?.map((p, i) => <div key={i}><button onClick={() => { for (const k of fields) if (k in p.values) (settings.store as any)[k] = p.values[k]; schedule(); }}>{p.name}</button><button aria-label={`Delete ${p.name}`} onClick={() => { settings.store.saved = store.saved?.filter((_, n) => n !== i); }}>×</button></div>)}</div>;
}
async function publish() {
    const token = ++revision;
    if (!running) return;
    const config = { ...settings.store };
    if (!config.active) { clear(); return; }
    try {
        if (!/^\d{17,20}$/.test(config.applicationId) || config.game.trim().length < 2 || config.game.length > 128 || config.details.length > 128 || config.state.length > 128) throw new Error("Use a valid application ID and activity text up to 128 characters");
        const keys = [config.largeImage, config.smallImage];
        const assets = keys.some(Boolean) ? await ApplicationAssetUtils.fetchAssetIds(config.applicationId, keys.filter(Boolean)) : [];
        if (!running || token !== revision) return;
        let index = 0;
        const now = Date.now();
        lastPublished = now;
        FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", socketId: "EqyCordFakePlaying", activity: {
            application_id: config.applicationId, name: config.game.trim(), type: 0, flags: 1,
            ...(config.details ? { details: config.details } : {}), ...(config.state ? { state: config.state } : {}),
            ...(keys.some(Boolean) ? { assets: { ...(config.largeImage ? { large_image: assets[index++], large_text: config.game } : {}), ...(config.smallImage ? { small_image: assets[index++] } : {}) } } : {}),
            ...(config.timer !== "none" ? { timestamps: { start: now, ...(config.timer === "countdown" ? { end: now + Math.max(1, Math.min(1440, config.minutes || 1)) * 60_000 } : {}) } } : {})
        } });
    } catch (e) { clear(); showToast(e instanceof Error ? e.message : "Could not publish activity", "failure"); }
}
function clear() { FluxDispatcher.dispatch({ type: "LOCAL_ACTIVITY_UPDATE", socketId: "EqyCordFakePlaying", activity: null }); }
export default definePlugin({ name: "FakePlaying", description: "Publish a custom game Rich Presence through Discord's normal activity pipeline. Remote visibility needs a second-client test.", authors: [{ name: "0009cx0", id: 380070146317877249n }], settings,
    start() { running = true; schedule(); }, stop() { running = false; clearTimeout(timer); ++revision; clear(); }, flux: { LOGOUT() { settings.store.active = false; ++revision; clearTimeout(timer); clear(); } } });
