/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "@utils/eqyMedia/styles.css";

import { definePluginSettings } from "@api/Settings";
import { EffectButton, FreezeIcon } from "@utils/eqyMedia/controls";
import { acquire, freeze, release } from "@utils/eqyMedia/engine";
import { mediaNotice } from "@utils/eqyMedia/notice";
import definePlugin, { OptionType } from "@utils/types";
import { React } from "@webpack/common";

const settings = definePluginSettings({
    frozen: { type: OptionType.BOOLEAN, description: "Freeze an outgoing WebRTC webcam. Native Canary camera is unsupported. Enable plugin before joining a browser call.", default: false, onChange: value => { void freeze(value, settings.store.image).catch(e => { if (value) settings.store.frozen = false; mediaNotice(e.message, "failure"); }); } },
    upload: { type: OptionType.COMPONENT, description: "Optional still image (stored locally).", component: () => <ImagePicker /> }
}).withPrivateSettings<{ image?: string; }>();
function ImagePicker() {
    const config = settings.use();
    return <div className="eqy-effect-settings"><input aria-label="Freeze image" type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 1_000_000) { mediaNotice("Choose an image smaller than 1 MB", "failure"); return; } const reader = new FileReader(); reader.onload = () => { settings.store.image = String(reader.result); if (config.frozen) void freeze(true, settings.store.image).catch(e => mediaNotice(e.message, "failure")); }; reader.readAsDataURL(file); }} /><button onClick={() => { settings.store.image = undefined; if (config.frozen) void freeze(false).then(() => freeze(true)).catch(e => mediaNotice(e.message, "failure")); }}>Use camera frame</button></div>;
}
function Button() { const config = settings.use(); return <EffectButton icon={FreezeIcon} name="FreezeCam" kind="video" active={config.frozen} onClick={() => { settings.store.frozen = !config.frozen; }} />; }
export default definePlugin({ name: "FreezeCam", description: "Freeze the outgoing WebRTC camera while audio stays independent. Native Canary video requires a separate compatible capture bridge.", authors: [{ name: "0009cx0", id: 380070146317877249n }], dependencies: ["UserAreaAPI"], settings, userAreaButton: { icon: FreezeIcon, render: Button, priority: 20 },
    enabledByDefault: IS_WEB,
    start() { settings.store.frozen = false; acquire("FreezeCam"); }, stop() { settings.store.frozen = false; release("FreezeCam"); }, flux: { VOICE_CHANNEL_SELECT() { settings.store.frozen = false; }, LOGOUT() { settings.store.frozen = false; } } });
