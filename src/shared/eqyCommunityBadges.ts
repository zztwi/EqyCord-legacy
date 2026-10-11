/*
 * EqyCord, a Discord client mod based on Vencord
 * Copyright (c) 2026 EqyCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// This catalogue is shared by the owner panel and the server grant allowlist.
export const communityBadgeDefinitions = Object.freeze([
    { asset: "contributor", title: "Contributor", hint: "Supports the project" },
    { asset: "innovator", title: "Plugin Innovator", hint: "Helps shape new plugins" },
    { asset: "limitedEdition", title: "Limited Edition", hint: "Special community occasions" },
    { asset: "veteran", title: "Veteran", hint: "A long-standing community member" },
    { asset: "collabPartner", title: "Collab Partner", hint: "Collaborates with EqyCord" },
    { asset: "eventWinner", title: "Event Winner", hint: "Winner of a community event" },
    { asset: "communitySpark", title: "Community Spark", hint: "Brings the community together" },
    { asset: "support", title: "Support", hint: "Helps sustain EqyCord" },
    { asset: "betaTester", title: "Beta Tester", hint: "Tests new releases" },
    { asset: "first10", title: "First 10", hint: "One of the first ten members" }
] as const);

export type CommunityBadgeId = typeof communityBadgeDefinitions[number]["asset"];
export const communityBadgeIds: readonly CommunityBadgeId[] = communityBadgeDefinitions.map(badge => badge.asset);
export function isCommunityBadgeId(value: unknown): value is CommunityBadgeId {
    return typeof value === "string" && communityBadgeIds.includes(value as CommunityBadgeId);
}
