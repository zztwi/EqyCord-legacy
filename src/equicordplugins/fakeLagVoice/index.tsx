/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "@utils/eqyMedia/styles.css";

import { definePluginSettings } from "@api/Settings";
import { EffectButton, LagIcon } from "@utils/eqyMedia/controls";
import { MediaDiagnostics } from "@utils/eqyMedia/diagnostics";
import { acquire, hasOutgoing, release, setLag } from "@utils/eqyMedia/engine";
import { mediaNotice } from "@utils/eqyMedia/notice";
import definePlugin, { OptionType } from "@utils/types";
import { React } from "@webpack/common";
const settings = definePluginSettings({
    diagnostics: { type: OptionType.COMPONENT, description: "Media engine diagnostics (local counters only).", component: () => <MediaDiagnostics /> },
    active: { type: OptionType.BOOLEAN, description: "Apply effects to your outgoing WebRTC microphone. Native Canary audio is unsupported.", default: false, onChange: value => { if (value && !hasOutgoing("audio")) { settings.store.active = false; mediaNotice("No browser microphone detected. Enable this plugin before starting the call.", "failure"); } } },
    effect: { type: OptionType.SELECT, description: "Audio effect; no network packets are altered.", options: [{ label: "Voice Cut", value: "cut", default: true }, { label: "Packet Loss (audio gaps)", value: "loss" }, { label: "Robotic Lag", value: "robotic" }, { label: "Delay", value: "delay" }, { label: "Glitch", value: "glitch" }] },
    intensity: { type: OptionType.SLIDER, description: "Effect intensity.", markers: [0, 0.25, 0.5, 0.75, 1], default: 1 },
    frequency: { type: OptionType.NUMBER, description: "Interruptions per second (0.1–5).", default: 3 },
    duration: { type: OptionType.NUMBER, description: "Interruption duration in seconds (0.02–1).", default: 0.2 },
    delay: { type: OptionType.NUMBER, description: "Delay in seconds (0–1.5).", default: 1.5 },
    presets: { type: OptionType.COMPONENT, description: "Quick presets.", component: () => <div className="eqy-effect-settings">{[["Light", 0.25, 0.5, 0.08], ["Medium", 0.5, 1, 0.15], ["Extreme", 1, 3, 0.2]].map(([label, intensity, frequency, duration]) => <button key={label} onClick={() => { settings.store.intensity = Number(intensity); settings.store.frequency = Number(frequency); settings.store.duration = Number(duration); }}>{label}</button>)}</div> }
}).withPrivateSettings<{ strongDefaultsVersion?: number; }>();
function Button() { const config = settings.use(); return <EffectButton icon={LagIcon} name="FakeLagVoice" kind="audio" active={config.active} onClick={() => { settings.store.active = !config.active; }} />; }
export default definePlugin({ name: "FakeLagVoice", description: "Apply gaps, delay and digital glitches to your outgoing WebRTC audio. Native Canary audio requires a compatible capture bridge.", authors: [{ name: "0009cx0", id: 380070146317877249n }], dependencies: ["UserAreaAPI"], settings, userAreaButton: { icon: LagIcon, render: Button, priority: 21 },
    enabledByDefault: IS_WEB,
    start() { if (!settings.store.strongDefaultsVersion) { settings.store.intensity = 1; settings.store.frequency = 3; settings.store.duration = 0.2; settings.store.delay = 1.5; settings.store.strongDefaultsVersion = 1; } settings.store.active = false; acquire("FakeLagVoice"); setLag(() => ({ ...settings.store, enabled: settings.store.active })); }, stop() { release("FakeLagVoice"); } });
