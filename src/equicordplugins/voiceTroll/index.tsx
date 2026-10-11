/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "@utils/eqyMedia/styles.css";

import { definePluginSettings } from "@api/Settings";
import { EffectButton, VoiceIcon } from "@utils/eqyMedia/controls";
import { MediaDiagnostics } from "@utils/eqyMedia/diagnostics";
import { acquire, hasOutgoing, release, setVoice } from "@utils/eqyMedia/engine";
import { mediaNotice } from "@utils/eqyMedia/notice";
import definePlugin, { OptionType } from "@utils/types";
import { React } from "@webpack/common";
const settings = definePluginSettings({
    diagnostics: { type: OptionType.COMPONENT, description: "Media engine diagnostics (local counters only).", component: () => <MediaDiagnostics /> },
    active: { type: OptionType.BOOLEAN, description: "Apply voice effects to your outgoing WebRTC microphone. Native Canary audio is unsupported.", default: false, onChange: value => { if (value && !hasOutgoing("audio")) { settings.store.active = false; mediaNotice("No browser microphone detected. Enable this plugin before starting the call.", "failure"); } } },
    effect: { type: OptionType.SELECT, description: "Voice effect.", options: [{ label: "Robot Voice", value: "robot", default: true }, { label: "Deep Voice", value: "deep" }, { label: "High Pitch", value: "high" }, { label: "Radio Voice", value: "radio" }, { label: "Echo", value: "echo" }, { label: "Megaphone", value: "megaphone" }, { label: "Metallic Voice", value: "metallic" }, { label: "Distorted Voice", value: "distorted" }] },
    intensity: { type: OptionType.SLIDER, description: "Blend between original and effected voice.", markers: [0, 0.25, 0.5, 0.75, 1], default: 1 },
    pitch: { type: OptionType.NUMBER, description: "Pitch shift in semitones (-12–12); 0 uses the Deep/High default.", default: 0 },
    echo: { type: OptionType.NUMBER, description: "Echo delay in seconds (0.04–0.8).", default: 0.8 },
    distortion: { type: OptionType.SLIDER, description: "Distortion amount.", markers: [0, 0.25, 0.5, 0.75, 1], default: 1 },
    presets: { type: OptionType.COMPONENT, description: "Save and load voice presets.", component: () => <Presets /> }
}).withPrivateSettings<{ strongDefaultsVersion?: number; saved?: { name: string; effect: string; intensity: number; pitch: number; echo: number; distortion: number; }[]; }>();
function Presets() {
    const config = settings.use(); const [name, setName] = React.useState("");
    return <div className="eqy-effect-settings"><input aria-label="Preset name" maxLength={32} value={name} onChange={e => setName(e.target.value)} /><button disabled={!name.trim() || (config.saved?.length ?? 0) >= 20} onClick={() => { const { effect, intensity, pitch, echo, distortion } = config; settings.store.saved = [...config.saved ?? [], { name: name.trim(), effect, intensity, pitch, echo, distortion }]; setName(""); }}>Save preset</button>{config.saved?.map((p, i) => <div key={i}><button onClick={() => { settings.store.effect = p.effect; settings.store.intensity = p.intensity; settings.store.pitch = p.pitch; settings.store.echo = p.echo; settings.store.distortion = p.distortion; }}>{p.name}</button><button aria-label={`Delete ${p.name}`} onClick={() => { settings.store.saved = config.saved?.filter((_, n) => n !== i); }}>×</button></div>)}</div>;
}
function Button() { const config = settings.use(); return <EffectButton icon={VoiceIcon} name="VoiceTroll" kind="audio" active={config.active} onClick={() => { settings.store.active = !config.active; }} />; }
export default definePlugin({ name: "VoiceTroll", description: "Live outgoing WebRTC voice effects with presets and a shared audio engine. Native Canary audio requires a compatible capture bridge.", authors: [{ name: "0009cx0", id: 380070146317877249n }], dependencies: ["UserAreaAPI"], settings, userAreaButton: { icon: VoiceIcon, render: Button, priority: 22 },
    enabledByDefault: IS_WEB,
    start() { if (!settings.store.strongDefaultsVersion) { settings.store.intensity = 1; settings.store.echo = 0.8; settings.store.distortion = 1; settings.store.strongDefaultsVersion = 1; } settings.store.active = false; acquire("VoiceTroll"); setVoice(() => ({ ...settings.store, enabled: settings.store.active })); }, stop() { release("VoiceTroll"); } });
