/*
 * EqyCord, a Discord client mod based on Vencord
 * Copyright (c) 2026 EqyCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "@utils/eqyMedia/styles.css";

import { UserAreaButton, UserAreaRenderProps } from "@api/UserArea";
import { mediaNotice } from "@utils/eqyMedia/notice";
import definePlugin from "@utils/types";
import { AuthenticationStore, React, SelectedChannelStore, UserStore, useStateFromStores } from "@webpack/common";

import { GhostController, VoiceSocket, VoiceState } from "./state";

const ghost = new GhostController(() => SelectedChannelStore.getVoiceChannelId(), message => mediaNotice(message, "failure"));


function GhostIcon({ active, className }: { active?: boolean; className?: string; }) {
    return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2a8 8 0 0 0-8 8v11a1 1 0 0 0 1.6.8L8 20l3.4 2.6a1 1 0 0 0 1.2 0L16 20l2.4 1.8A1 1 0 0 0 20 21V10a8 8 0 0 0-8-8Zm-3 8a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm6 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" />
        {!active && <path d="M3 21 21 3" stroke="var(--status-danger, #f23f43)" strokeWidth="2.5" />}
    </svg>;
}

function useGhostState() { return React.useSyncExternalStore(ghost.subscribe, ghost.snapshot); }

function GhostButton({ iconForeground, hideTooltips, nameplate }: UserAreaRenderProps) {
    useGhostState();
    const connected = useStateFromStores([SelectedChannelStore], () => !!SelectedChannelStore.getVoiceChannelId());
    const label = !connected ? "Ghost — join a voice channel"
        : !ghost.available ? "Ghost unavailable — reconnect after enabling this plugin"
            : ghost.pending ? "Ghost — awaiting server confirmation; click to cancel"
                : ghost.confirmed ? "Ghost active (experimental) — click to restore voice status"
                    : "Enable Ghost (experimental)";
    return <UserAreaButton
        icon={<GhostIcon active={ghost.confirmed} className={iconForeground} />}
        tooltipText={hideTooltips ? undefined : label}
        aria-label={label}
        role="switch"
        aria-checked={ghost.confirmed}
        disabled={!connected || !ghost.available}
        plated={nameplate != null}
        onClick={() => ghost.toggle()}
    />;
}

export default definePlugin({
    name: "Ghost",
    enabledByDefault: true,
    description: "EqyCord Ghost: an experimental voice-panel button that reports mute/deafen separately from local audio. Two-account audio verification required.",
    tags: ["Voice"],
    authors: [{ name: "0009cx0", id: 380070146317877249n }],
    dependencies: ["UserAreaAPI"],
    userAreaButton: { icon: GhostIcon, render: props => <GhostButton {...props} />, priority: 19 },
    patches: [
        {
            find: /voiceStateUpdate\(\i\)\{/,
            replacement: {
                match: /voiceStateUpdate\((\i)\)\{/,
                replace: "$&$1=$self.prepareVoiceState($1,this);"
            }
        }
    ],
    start() { ghost.start(); },
    stop() { ghost.stop(); },
    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: { userId: string; sessionId: string; channelId: string | null; selfMute: boolean; selfDeaf: boolean; }[]; }) {
            const userId = UserStore.getCurrentUser()?.id;
            for (const state of voiceStates) {
                if (state.userId === userId && state.sessionId === AuthenticationStore.getSessionId()
                    && state.channelId === SelectedChannelStore.getVoiceChannelId()) ghost.acknowledge(state);
            }
        },
        VOICE_CHANNEL_SELECT({ channelId }: { channelId: string | null; }) { ghost.channelChanged(channelId); },
        CONNECTION_CLOSED() { ghost.resetConnection(); },
        LOGOUT() { ghost.resetConnection(); }
    },
    useGhostState,

    prepareVoiceState(state: VoiceState, socket: VoiceSocket) { return ghost.prepare(state, socket); }
});
