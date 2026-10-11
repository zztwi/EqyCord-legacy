/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Original Endcord source notice (retained under GPL-3.0-or-later):
/*
 * Endcord, a vaporwave-inspired Discord client mod
 * Copyright (c) 2026 unfamiliardev
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { showNotification } from "@api/Notifications";
import { EquicordDevs } from "@utils/constants";
import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { ChannelStore, FluxDispatcher, NavigationRouter, UserStore } from "@webpack/common";

interface Reminder {
    id: string;
    text: string;
    time: number;
    channelId: string;
}

const KEY = "EqyCord_reminders";
const UNITS: Record<string, number> = {
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000
};

const timers = new Set<ReturnType<typeof setTimeout>>();
const logger = new Logger("RemindMe");
let active = false;
let generation = 0;
let storageQueue: Promise<unknown> = Promise.resolve();
function mutate(key: string, change: (list: Reminder[]) => Reminder[]) {
    const task = storageQueue.then(async () => {
        const list = await DataStore.get<Reminder[]>(key) ?? [];
        await DataStore.set(key, change(list));
    });
    storageQueue = task.catch(() => {});
    return task;
}

function fire(r: Reminder) {
    showNotification({
        title: "⏰ Reminder",
        body: r.text,
        onClick: () => NavigationRouter.transitionTo(`/channels/${ChannelStore.getChannel(r.channelId)?.guild_id ?? "@me"}/${r.channelId}`)
    });
}

function schedule(r: Reminder, key: string, owner: string, version: number) {
    if (!active || version !== generation) return;
    const delay = r.time - Date.now();
    const id = setTimeout(async () => {
        timers.delete(id);
        if (!active || version !== generation || UserStore.getCurrentUser()?.id !== owner) return;
        if (r.time > Date.now()) { schedule(r, key, owner, version); return; }
        try {
            let found = false;
            await mutate(key, list => list.filter(x => { if (x.id !== r.id) return true; found = true; return false; }));
            if (found && active && version === generation) fire(r);
        } catch (error) { logger.error("Could not complete reminder", error); }
    }, Math.max(0, Math.min(delay, 2_147_483_647)));
    timers.add(id);
}
function clearTimers() {
    generation++;
    timers.forEach(clearTimeout);
    timers.clear();
}
async function loadReminders() {
    clearTimers();
    const version = generation;
    const owner = UserStore.getCurrentUser()?.id;
    if (!owner) return;
    const key = `${KEY}:${owner}`;
    const list = await DataStore.get<Reminder[]>(key) ?? [];
    if (active && version === generation) list.slice(0, 100).forEach(r => schedule(r, key, owner, version));
}

export default definePlugin({
    name: "RemindMe",
    description: "/remindme <amount> <m|h|d> <text> pings you with a desktop notification later. Survives restarts.",
    authors: [EquicordDevs.endcord_unfamiliardev, EquicordDevs.endcord_ewlle, EquicordDevs.endcord_rootpoi, EquicordDevs.endcord_kraethis],
    dependencies: ["CommandsAPI"],

    async start() {
        active = true;
        FluxDispatcher.subscribe("CONNECTION_OPEN", loadReminders);
        await loadReminders();
    },

    stop() {
        active = false;
        FluxDispatcher.unsubscribe("CONNECTION_OPEN", loadReminders);
        clearTimers();
    },

    commands: [
        {
            name: "remindme",
            description: "Set a reminder",
            inputType: ApplicationCommandInputType.BOT,
            options: [
                { name: "amount", description: "How many units from now", type: ApplicationCommandOptionType.INTEGER, required: true },
                {
                    name: "unit", description: "Unit of time", type: ApplicationCommandOptionType.STRING, required: true,
                    choices: [
                        { name: "minutes", value: "m", label: "minutes" },
                        { name: "hours", value: "h", label: "hours" },
                        { name: "days", value: "d", label: "days" }
                    ]
                },
                { name: "text", description: "What to remind you about", type: ApplicationCommandOptionType.STRING, required: true }
            ],
            execute: async (opts, ctx) => {
                const amount = findOption(opts, "amount", 0);
                const unit = findOption(opts, "unit", "m");
                const text = findOption(opts, "text", "");
                if (!Number.isSafeInteger(amount) || amount <= 0 || amount * (UNITS[unit] ?? 0) > 365 * UNITS.d || !text.trim() || text.length > 1000) {
                    sendBotMessage(ctx.channel.id, { content: "Choose a positive duration up to one year and a reminder shorter than 1000 characters." });
                    return;
                }
                const owner = UserStore.getCurrentUser().id;
                const key = `${KEY}:${owner}`;
                const reminder: Reminder = { id: crypto.randomUUID(), text, time: Date.now() + amount * UNITS[unit], channelId: ctx.channel.id };
                await mutate(key, list => { if (list.length >= 100) throw new Error("You already have 100 reminders"); return [...list, reminder]; });
                schedule(reminder, key, owner, generation);
                sendBotMessage(ctx.channel.id, { content: `⏰ Okay! I'll remind you about **${text}** <t:${Math.floor(reminder.time / 1000)}:R>.` });
            }
        }
    ]
});
