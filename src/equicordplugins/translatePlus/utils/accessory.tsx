/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { languages } from "@equicordplugins/translatePlus/misc/languages";
import { cl, Translation } from "@equicordplugins/translatePlus/misc/types";
import { Message } from "@vencord/discord-types";
import { Parser, showToast, useEffect, useState } from "@webpack/common";

import { Icon } from "./icon";
import { translate } from "./translator";

const setters = new Map();

export function Accessory({ message }: { message: Message; }) {
    const [translation, setTranslation] = useState<Translation | undefined>(undefined);

    useEffect(() => {
        if ((message as any).vencordEmbeddedBy) return;

        setters.set(message.id, setTranslation);

        return () => void setters.delete(message.id);
    }, [message.id]);

    if (!translation) return null;

    return (
        <div className={cl("accessory")}>
            <Icon height={16} width={16} />
            {Parser.parse(translation.text)}
            {" "}
            (translated from {languages[translation.src] ?? translation.src} - <button onClick={() => setTranslation(undefined)} className={cl("dismiss")}>Dismiss</button>)
        </div>
    );
}

export async function handleTranslate(message: Message) {
    try {
        const translation = await translate(message.content);
        const setter = setters.get(message.id);
        if (setter) setter(translation);
        else showToast("Open the message in its channel to display its translation.", "failure");
    } catch (error) {
        console.error("[TranslatePlus] Translation failed:", error);
        showToast("Translation failed. Check your connection and try again.", "failure");
    }
}
