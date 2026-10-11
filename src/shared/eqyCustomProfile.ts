/*
 * EqyCord, a Discord client mod based on Vencord
 * Copyright (c) 2026 EqyCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface CustomProfileData {
    username?: string;
    globalName?: string;
    avatar?: string;
    banner?: string;
    bio?: string;
    pronouns?: string;
    accentColor?: number;
    accentColor2?: number;
    badgeFlags?: number;
    createdAt?: string;
    nitro?: boolean;
    nitroLevel?: number;
    boostMonths?: number;
    customBadgeIds?: string[];
    oldName?: string;
    decorationAsset?: string;
    profileEffectId?: string;
    email?: string;
    phone?: string;
}

const textLimits = { username: 32, globalName: 32, bio: 190, pronouns: 40, oldName: 5 };

export function isDiscordId(value: unknown): value is string {
    return typeof value === "string" && /^\d{17,20}$/.test(value);
}

export function isProfileImage(value: unknown, local = false): value is string {
    if (typeof value !== "string") return false;
    if (local && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value)) return value.length <= 350_000;
    try {
        const url = new URL(value);
        return url.protocol === "https:" && !url.username && !url.password && value.length <= 2048;
    } catch { return false; }
}

// Allowlist shared fields: private contact details never enter the API payload.
export function publicCustomProfile(input: unknown): CustomProfileData {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid profile");
    const source = input as Record<string, unknown>;
    const result: CustomProfileData = {};
    for (const [key, limit] of Object.entries(textLimits)) {
        const value = source[key];
        if (value == null || value === "") continue;
        if (typeof value !== "string" || value.length > limit) throw new Error(`Invalid ${key}`);
        (result as Record<string, unknown>)[key] = value;
    }
    for (const key of ["avatar", "banner"] as const) {
        const value = source[key];
        if (value == null || value === "") continue;
        if (!isProfileImage(value)) throw new Error(`Use an HTTPS URL to share your ${key}`);
        result[key] = value;
    }
    for (const [key, max] of Object.entries({ accentColor: 0xffffff, accentColor2: 0xffffff, badgeFlags: 0x7fffffff, nitroLevel: 8, boostMonths: 8 })) {
        const value = source[key];
        if (value == null) continue;
        if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > max) throw new Error(`Invalid ${key}`);
        (result as Record<string, unknown>)[key] = value;
    }
    if (source.nitro != null) {
        if (typeof source.nitro !== "boolean") throw new Error("Invalid Nitro preview");
        result.nitro = source.nitro;
    }
    if (source.createdAt) {
        const date = source.createdAt;
        if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error("Invalid date");
        result.createdAt = date;
    }
    for (const key of ["decorationAsset", "profileEffectId"] as const) {
        if (source[key]) {
            if (!isDiscordId(source[key])) throw new Error(`Invalid ${key}`);
            result[key] = source[key] as string;
        }
    }
    if (source.customBadgeIds != null) {
        if (!Array.isArray(source.customBadgeIds) || source.customBadgeIds.length > 4 || source.customBadgeIds.some(x => !["oldname", "quest", "meadow", "orbs"].includes(x))) throw new Error("Invalid badges");
        result.customBadgeIds = [...new Set(source.customBadgeIds)] as string[];
    }
    return result;
}

export function profileApiOrigin(value: string): string {
    if (!value) return "";
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("Profile API must be an HTTPS origin");
    return url.origin;
}
