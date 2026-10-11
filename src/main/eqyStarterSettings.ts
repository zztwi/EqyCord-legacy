/*
 * EqyCord, a Discord client mod based on Vencord
 * Copyright (c) 2026 EqyCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { parseSettingsBackup } from "@shared/eqySettingsBackup";
import starterPreset from "@shared/eqyStarterPreset.json";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const preset = parseSettingsBackup(JSON.stringify(starterPreset));

/** Seed the shared desktop settings once; even an empty or damaged existing file belongs to its user. */
export function initializeStarterSettings(settingsDir: string): boolean {
    const settingsFile = join(settingsDir, "settings.json");
    if (existsSync(settingsFile)) return false;

    mkdirSync(settingsDir, { recursive: true });
    try {
        writeFileSync(join(settingsDir, "quickCss.css"), preset.quickCss, { flag: "wx" });
    } catch (error: any) {
        if (error.code !== "EEXIST") throw error;
    }
    try {
        writeFileSync(settingsFile, JSON.stringify(preset.settings, null, 4), { flag: "wx" });
        return true;
    } catch (error: any) {
        if (error.code !== "EEXIST") throw error;
        return false;
    }
}
