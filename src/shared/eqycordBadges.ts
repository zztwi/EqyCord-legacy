/*
 * EqyCord, a Discord client mod based on Vencord
 * Copyright (c) 2026 EqyCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { communityBadgeDefinitions, CommunityBadgeId, communityBadgeIds } from "./eqyCommunityBadges";
import assignments from "./eqycordBadgeAssignments.json";

export const eqycordBadgeDefinitions = Object.freeze([
    { id: "eqycord_staff", description: "EqyCord Staff", asset: "staff" },
    { id: "eqycord_creator", description: "EqyCord Creator", asset: "creator" },
    ...communityBadgeDefinitions.map(badge => ({ id: `eqycord_${badge.asset}`, description: `EqyCord ${badge.title}`, asset: badge.asset }))
] as const);

export type EqyCordBadgeAsset = typeof eqycordBadgeDefinitions[number]["asset"];
const emptyCommunityAssignments = communityBadgeIds.reduce((result, id) => {
    result[id] = [];
    return result;
}, {} as Record<CommunityBadgeId, readonly string[]>);
let liveAssignments: Record<EqyCordBadgeAsset, readonly string[]> = { ...emptyCommunityAssignments, ...assignments };
let revision = 0;
const listeners = new Set<() => void>();
export const communityBadgesRevision = () => revision;
export const subscribeCommunityBadges = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function setCommunityBadgeAssignments(data: unknown) {
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid community badges");
    const incoming = data as Record<string, unknown>;
    const next = { ...emptyCommunityAssignments };
    for (const badge of communityBadgeIds) {
        const list = incoming[badge] ?? [];
        if (!Array.isArray(list) || list.length > 5000 || list.some(id => typeof id !== "string" || !/^\d{17,20}$/.test(id))) throw new Error("Invalid community badges");
        next[badge] = [...new Set(list)];
    }
    liveAssignments = { ...assignments, ...next };
    revision++;
    listeners.forEach(listener => listener());
}

export function hasEqyCordBadge(userId: string | undefined, asset: EqyCordBadgeAsset, registry: Record<EqyCordBadgeAsset, readonly string[]> = liveAssignments): boolean {
    return !!userId && !!registry[asset]?.includes(userId);
}

export function hasEqyCordBadges(userId: string): boolean {
    return eqycordBadgeDefinitions.some(badge => hasEqyCordBadge(userId, badge.asset));
}
