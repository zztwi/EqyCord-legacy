/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { UserAreaButton } from "@api/UserArea";
import { mediaNotice } from "@utils/eqyMedia/notice";
import { React } from "@webpack/common";

import { hasOutgoing, snapshot, subscribe } from "./engine";
function Icon({ children, off, ...props }: any) { return <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{children}{off && <path d="M3 21 21 3" stroke="var(--status-danger, #f23f43)" strokeWidth="2" />}</svg>; }
export function FreezeIcon(props: any) { return <Icon {...props}><rect x="2.5" y="5.5" width="13" height="13" rx="3" /><path d="m15.5 10 5-3v10l-5-3M7 9v6m4-6v6" /></Icon>; }
export function LagIcon(props: any) { return <Icon {...props}><path d="M2 12h3l2-7 3 14 2-7m4 0h2l2-5 2 5M14 4v3m0 10v3" /></Icon>; }
export function VoiceIcon(props: any) { return <Icon {...props}><rect x="4" y="7" width="16" height="13" rx="4" /><path d="M12 7V3m-3 0h6M1.5 11v5m21-5v5M8 16h8" /><circle cx="8" cy="12" r="1" /><circle cx="16" cy="12" r="1" /></Icon>; }
export function EffectButton({ name, kind, active, icon: ControlIcon, onClick }: { name: string; kind: string; active: boolean; icon: React.ComponentType<any>; onClick(): void; }) {
    React.useSyncExternalStore(subscribe, snapshot);
    const available = hasOutgoing(kind);
    return <UserAreaButton className="eqy-media-control" icon={<ControlIcon off={!available || !active} />} tooltipText={available ? `${name}: ${active ? "ON — click to stop" : "OFF — click to enable"}` : `${name}: no browser ${kind} capture detected.`} aria-label={name} role="switch" aria-checked={available && active} orangeGlow={available && active} onClick={() => { if (!available) mediaNotice("No browser capture detected. Enable the plugin before joining a call. For FreezeCam, also turn on your camera.", "failure"); else onClick(); }} />;
}
