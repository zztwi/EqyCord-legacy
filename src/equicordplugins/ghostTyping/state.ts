/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export class TypingPulse {
    channel: string | undefined;
    private timer: ReturnType<typeof setTimeout> | undefined;
    private revision = 0;
    private lastSent = 0;
    private listeners = new Set<() => void>();
    subscribe = (f: () => void) => { this.listeners.add(f); return () => this.listeners.delete(f); };
    snapshot = () => this.channel ?? "";
    constructor(private send: (channel: string) => Promise<void>, private fail: (e: unknown) => void) { }
    start(channel: string, seconds: number) {
        this.stop(); this.channel = channel; this.listeners.forEach(f => f());
        const { revision } = this, until = Date.now() + Math.max(5, Math.min(120, seconds || 15)) * 1000;
        const pulse = async () => {
            if (revision !== this.revision) return;
            if (Date.now() >= until) { this.stop(); return; }
            const wait = Math.max(0, 9000 - (Date.now() - this.lastSent));
            if (wait) { this.timer = setTimeout(() => void pulse(), wait); return; }
            this.lastSent = Date.now();
            try { await this.send(channel); } catch (e) { if (revision === this.revision) { this.stop(); this.fail(e); } return; }
            if (revision === this.revision) this.timer = setTimeout(() => void pulse(), Math.min(9000, until - Date.now()));
        };
        void pulse();
    }
    stop() { ++this.revision; clearTimeout(this.timer); this.timer = undefined; this.channel = undefined; this.listeners.forEach(f => f()); }
}
