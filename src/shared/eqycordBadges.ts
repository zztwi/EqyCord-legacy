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
let liveAssignments: Record<EqyCordBadgeAsset, readonly string[]> = assignments;
let revision = 0;
const listeners = new Set<() => void>();
export const communityBadgesRevision = () => revision;
export const subscribeCommunityBadges = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function setCommunityBadgeAssignments(data: { contributor: string[]; innovator: string[]; }) {
    for (const list of [data.contributor, data.innovator]) if (!Array.isArray(list) || list.length > 5000 || list.some(id => !/^\d{17,20}$/.test(id))) throw new Error("Invalid community badges");
    liveAssignments = { ...assignments, contributor: [...new Set(data.contributor)], innovator: [...new Set(data.innovator)] };
    revision++;
    listeners.forEach(listener => listener());
}

export function hasEqyCordBadge(userId: string | undefined, asset: EqyCordBadgeAsset, registry: Record<EqyCordBadgeAsset, readonly string[]> = liveAssignments): boolean {
    return !!userId && registry[asset].includes(userId);
}

export function hasEqyCordBadges(userId: string): boolean {
    return eqycordBadgeDefinitions.some(badge => hasEqyCordBadge(userId, badge.asset));
}
