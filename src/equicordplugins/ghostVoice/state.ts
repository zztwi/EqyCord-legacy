/*
 * EqyCord, a Discord client mod based on Vencord
 * Copyright (c) 2026 EqyCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface VoiceState {
    guildId?: string | null;
    channelId?: string | null;
    selfMute?: boolean;
    selfDeaf?: boolean;
    [key: string]: unknown;
}

export interface VoiceSocket {
    voiceStateUpdate(state: VoiceState): void;
    isSessionEstablished(): boolean;
}

/** Only modifies the outgoing voice-state copy. Never changes media-engine state or permissions. */
export class GhostController {
    private running = false;
    private enabled = false;
    confirmed = false;
    private socket?: VoiceSocket;
    private localState?: VoiceState;
    private timer?: ReturnType<typeof setTimeout>;
    private revision = 0;
    private listeners = new Set<() => void>();

    constructor(private channel: () => string | null | undefined, private report: (message: string) => void, private timeout = 5000) {}

    subscribe = (listener: () => void) => {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    };
    snapshot = () => this.revision;
    private emit() { this.revision++; for (const listener of this.listeners) listener(); }
    get pending() { return this.enabled && !this.confirmed; }
    get available() {
        return this.running && !!this.socket && !!this.channel() && this.localState?.channelId === this.channel();
    }

    start() { this.running = true; this.emit(); }
    stop() { this.disable(true); this.running = false; this.socket = undefined; this.localState = undefined; this.emit(); }

    prepare(state: VoiceState, socket: VoiceSocket): VoiceState {
        if (!this.running) return state;
        if (socket !== this.socket || state.channelId !== this.localState?.channelId) this.disable(false);
        this.socket = socket;
        this.localState = { ...state };
        this.emit();
        return this.enabled && state.channelId ? { ...state, selfMute: true, selfDeaf: true } : state;
    }

    toggle() {
        if (this.enabled) { this.disable(true); return; }
        if (!this.available || !this.socket?.isSessionEstablished()) return;
        this.enabled = true;
        this.confirmed = false;
        this.timer = setTimeout(() => {
            this.disable(true);
            this.report("EqyCord: Ghost was not confirmed and has been disabled. Check your normal voice status.");
        }, this.timeout);
        this.emit();
        this.send();
    }

    acknowledge(state: { channelId: string | null; selfMute: boolean; selfDeaf: boolean; }) {
        if (!this.enabled || state.channelId !== this.localState?.channelId) return;
        if (state.selfMute && state.selfDeaf) {
            clearTimeout(this.timer);
            this.confirmed = true;
            this.emit();
        } else if (this.confirmed) {
            this.disable(true);
            this.report("EqyCord: Ghost status changed remotely. Ghost has been disabled.");
        }
    }

    channelChanged(channelId: string | null) {
        if (channelId !== this.localState?.channelId) this.disable(false);
    }
    resetConnection() {
        this.disable(false);
        this.socket = undefined;
        this.localState = undefined;
        this.emit();
    }

    private disable(restore: boolean) {
        const wasEnabled = this.enabled;
        this.enabled = this.confirmed = false;
        clearTimeout(this.timer);
        this.timer = undefined;
        this.emit();
        if (restore && wasEnabled && this.available) this.send();
    }

    private send() {
        try {
            if (!this.socket?.isSessionEstablished() || !this.localState) throw new Error("Voice connection unavailable");
            this.socket.voiceStateUpdate({ ...this.localState });
        } catch {
            this.disable(false);
            this.report("EqyCord: Ghost could not update voice status. Check Discord's voice controls or reconnect.");
        }
    }
}
