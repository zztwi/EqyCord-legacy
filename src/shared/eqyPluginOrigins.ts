/*
 * EqyCord, a Discord client mod based on Vencord
 * Copyright (c) 2026 EqyCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type PluginOrigin = "EqyCord" | "Vencord" | "Community";

export function getPluginOrigin(_name: string, isUserPlugin?: boolean, folderName?: string): PluginOrigin {
    if (isUserPlugin) return "Community";
    if (folderName?.startsWith("src/equicordplugins/")) return "EqyCord";
    return "Vencord";
}

export function getPluginDisplayText(text: string, origin: PluginOrigin): string {
    if (origin !== "EqyCord") return text;

    return text
        .replace(/EquicordToolbox/gi, "EqyCord Toolbox")
        .replace(/Equicord/gi, "EqyCord");
}

export function getPluginDisplayName(name: string, origin: PluginOrigin): string {
    return getPluginDisplayText(name, origin);
}

export function matchesPluginOrigin(name: string, isUserPlugin: boolean | undefined, origin: PluginOrigin | "All", folderName?: string): boolean {
    return origin === "All" || getPluginOrigin(name, isUserPlugin, folderName) === origin;
}
