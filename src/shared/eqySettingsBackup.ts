/*
 * EqyCord, a Discord client mod based on Vencord
 * Copyright (c) 2026 EqyCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseSettingsBackup(data: string): { settings: Record<string, any>; quickCss: string; } {
    const parsed: unknown = JSON.parse(data);
    if (!isRecord(parsed) || !isRecord(parsed.settings) || typeof parsed.quickCss !== "string")
        throw new Error("Expected a Vencord-compatible backup with settings and quickCss.");
    if (parsed.settings.plugins !== undefined && !isRecord(parsed.settings.plugins))
        throw new Error("Invalid plugin settings.");

    const pending: unknown[] = [parsed];
    while (pending.length) {
        const value = pending.pop();
        if (value === null || typeof value !== "object") continue;
        for (const [key, child] of Object.entries(value)) {
            if (["__proto__", "constructor", "prototype"].includes(key))
                throw new Error("Unsafe settings key: " + key);
            pending.push(child);
        }
    }
    // Preserve unknown upstream/plugin keys for migration and round trips.
    return { settings: parsed.settings, quickCss: parsed.quickCss };
}
