/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { unregisterCommand } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { registerTagCommand } from ".";
import { SettingsTagList } from "./SettingsTagList";

export const settings = definePluginSettings({
    tagsList: {
        type: OptionType.CUSTOM,
        description: "The custom commands and their saved messages.",
        default: {} as Record<string, Tag>,
    },
    tagComponent: {
        type: OptionType.COMPONENT,
        component: SettingsTagList
    }
});

export interface Tag {
    name: string;
    message: string;
}

export function getTags() {
    return Object.values(settings.store.tagsList) as Tag[];
}

export function getTag(name: string): Tag | undefined {
    return (settings.store.tagsList as Record<string, Tag>)[name];
}

export function addTag(tag: Tag) {
    unregisterCommand(tag.name);

    settings.store.tagsList[tag.name] = tag;
    registerTagCommand(tag);
}

export function removeTag(name: string) {
    delete settings.store.tagsList[name];
    unregisterCommand(name);
}
