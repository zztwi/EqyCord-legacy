/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { setCommunityBadgeAssignments } from "@shared/eqycordBadges";
import config from "@shared/eqyProfileService.json";
import { UserProfileStore, UserStore } from "@webpack/common";

let timer: ReturnType<typeof setInterval> | undefined;
let pending = false;
export async function refreshCommunityBadges() {
    if (pending) return;
    pending = true;
    try {
        const response = await fetch(`${config.origin}/badges`, { signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error("Could not retrieve community badges");
        setCommunityBadgeAssignments(await response.json());
        (UserStore as any).emitChange?.();
        (UserProfileStore as any).emitChange?.();
    } finally { pending = false; }
}
export function startCommunityBadges() {
    if (timer) return;
    void refreshCommunityBadges().catch(() => {});
    timer = setInterval(() => { if (!document.hidden) void refreshCommunityBadges().catch(() => {}); }, 60000);
}
