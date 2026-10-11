/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Original Endcord source notice (retained under GPL-3.0-or-later):
/*
 * Endcord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType } from "@utils/types";
import { FluxDispatcher, RestAPI, UserStore } from "@webpack/common";

const logger = new Logger("AutoReact");
const seen = new Set<string>();
let lastReactionAt = 0;

interface Rule {
    keyword: string;
    emoji: string;
    caseSensitive?: boolean;
}

interface MessageAuthor { id: string; bot?: boolean; }
interface MessagePayload {
    message: { id: string; channel_id: string; content?: string; author: MessageAuthor; };
    optimistic?: boolean;
}

const settings = definePluginSettings({
    rules: {
        description: 'JSON array of rules, e.g. [{"keyword":"lol","emoji":"😂"},{"keyword":"gg","emoji":"🎉"}]. Custom emojis: use <:name:id> format.',
        type: OptionType.STRING,
        default: "[]",
    },
    onlyOwnMessages: {
        description: "Only auto-react to messages you send.",
        type: OptionType.BOOLEAN,
        default: false,
    },
    ignoreBots: {
        description: "Skip messages from bots.",
        type: OptionType.BOOLEAN,
        default: true,
    },
});

function getRules(): Rule[] {
    try {
        const parsed = JSON.parse(settings.store.rules);
        if (!Array.isArray(parsed)) return [];
        return parsed.slice(0, 20).filter(rule => rule && typeof rule.keyword === "string" && typeof rule.emoji === "string" && rule.keyword.length <= 200 && rule.emoji.length <= 100);
    } catch (e) {
        logger.warn("Failed to parse rules JSON:", e);
        return [];
    }
}

function formatEmoji(emoji: string): string {
    // <:name:id> or <a:name:id> → name:id (URL-encoded)
    const match = emoji.match(/^<a?:(\w+):(\d+)>$/);
    if (match) return encodeURIComponent(`${match[1]}:${match[2]}`);
    return encodeURIComponent(emoji);
}

function onMessageCreate({ message, optimistic }: MessagePayload) {
    if (optimistic) return;
    if (!message?.content || !message?.id || !message.author || seen.has(message.id)) return;
    seen.add(message.id);
    if (seen.size > 1000) seen.delete(seen.values().next().value!);

    const currentUserId = UserStore.getCurrentUser()?.id;
    if (settings.store.onlyOwnMessages && message.author.id !== currentUserId) return;
    if (settings.store.ignoreBots && message.author.bot) return;

    const rules = getRules();
    const reactions = new Set<string>();
    for (const rule of rules) {
        if (!rule.keyword || !rule.emoji) continue;

        const content = rule.caseSensitive ? message.content : message.content.toLowerCase();
        const keyword = rule.caseSensitive ? rule.keyword : rule.keyword.toLowerCase();
        if (!content.includes(keyword)) continue;

        if (reactions.has(rule.emoji) || Date.now() - lastReactionAt < 1000) continue;
        reactions.add(rule.emoji);
        lastReactionAt = Date.now();
        RestAPI.put({
            url: `/channels/${message.channel_id}/messages/${message.id}/reactions/${formatEmoji(rule.emoji)}/@me`,
        }).catch(() => {});
    }
}

export default definePlugin({
    name: "AutoReact",
    description: "Automatically react to messages containing specific keywords.",
    tags: ["Utility", "Chat"],
    authors: [EquicordDevs.endcord_Sharp],
    settings,

    start() {
        FluxDispatcher.subscribe("MESSAGE_CREATE", onMessageCreate);
    },

    stop() {
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", onMessageCreate);
        seen.clear();
        lastReactionAt = 0;
    },
});
