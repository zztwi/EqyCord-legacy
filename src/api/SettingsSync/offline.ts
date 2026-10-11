/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { PlainSettings } from "@api/Settings";
import { parseSettingsBackup } from "@shared/eqySettingsBackup";
import { Logger } from "@utils/Logger";
import { chooseFile, saveFile } from "@utils/web";
import { moment, showToast } from "@webpack/common";

const toastSuccess = () =>
    showToast("Settings successfully imported. Restart to apply changes!", "success");

const toastFailure = (err: any) =>
    showToast(`Failed to import settings: ${String(err)}`, "failure");

const logger = new Logger("SettingsSync:Offline", "#39b7e0");

export async function importSettings(data: string) {
    const parsed = parseSettingsBackup(data);
    const previous = VencordNative.settings.get();
    const imported = { ...previous, ...parsed.settings };
    const previousCss = await VencordNative.quickCss.get();
    try {
        await VencordNative.settings.set(imported);
        await VencordNative.quickCss.set(parsed.quickCss);
    } catch (error) {
        // Restore persisted state if either write fails. Do not update memory first.
        await VencordNative.settings.set(previous);
        await VencordNative.quickCss.set(previousCss);
        throw error;
    }
    Object.assign(PlainSettings, imported);
}

export async function exportSettings({ minify }: { minify?: boolean; } = {}) {
    const settings = VencordNative.settings.get();
    const quickCss = await VencordNative.quickCss.get();
    return JSON.stringify({ settings, quickCss }, null, minify ? undefined : 4);
}

export async function downloadSettingsBackup() {
    const filename = `eqycord-settings-backup-${moment().format("YYYY-MM-DD")}.json`;
    const backup = await exportSettings();
    const data = new TextEncoder().encode(backup);

    if (IS_DISCORD_DESKTOP) {
        DiscordNative.fileManager.saveWithDialog(data, filename);
    } else {
        saveFile(new File([data], filename, { type: "application/json" }));
    }
}

export async function uploadSettingsBackup(showToast = true): Promise<void> {
    if (IS_DISCORD_DESKTOP) {
        const [file] = await DiscordNative.fileManager.openFiles({
            filters: [
                { name: "EqyCord / Vencord Settings Backup", extensions: ["json"] },
                { name: "all", extensions: ["*"] }
            ]
        });

        if (file) {
            try {
                await importSettings(new TextDecoder().decode(file.data));
                if (showToast) toastSuccess();
            } catch (err) {
                logger.error(err);
                if (showToast) toastFailure(err);
            }
        }
    } else {
        const file = await chooseFile("application/json");
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async () => {
            try {
                await importSettings(reader.result as string);
                if (showToast) toastSuccess();
            } catch (err) {
                logger.error(err);
                if (showToast) toastFailure(err);
            }
        };
        reader.readAsText(file);
    }
}
