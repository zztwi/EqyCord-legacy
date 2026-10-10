/*
 * EqyCord, a Discord client mod based on Vencord
 * Copyright (c) 2026 EqyCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assignments from "./eqycordBadgeAssignments.json";

export const eqycordBadgeDefinitions = Object.freeze([
    { id: "eqycord_staff", description: "EqyCord Staff", asset: "staff" },
    { id: "eqycord_creator", description: "EqyCord Creator", asset: "creator" },
    { id: "eqycord_contributor", description: "EqyCord Contributor", asset: "contributor" },
    { id: "eqycord_innovator", description: "EqyCord Plugin Innovator", asset: "innovator" }
] as const);

export type EqyCordBadgeAsset = typeof eqycordBadgeDefinitions[number]["asset"];

export function hasEqyCordBadge(userId: string | undefined, asset: EqyCordBadgeAsset, registry: Record<EqyCordBadgeAsset, readonly string[]> = assignments): boolean {
    return !!userId && registry[asset].includes(userId);
}

export function hasEqyCordBadges(userId: string): boolean {
    return eqycordBadgeDefinitions.some(badge => hasEqyCordBadge(userId, badge.asset));
}
