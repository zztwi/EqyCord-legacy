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

import { get as dsGet, set as dsSet } from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { EquicordDevs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { React, UserStore } from "@webpack/common";
import virtualMerge from "virtual-merge";

const DS_BADGE_KEY = "FakeTag_badgeDataUrl";

let originalGetCurrentUser: (() => ReturnType<typeof UserStore.getCurrentUser>) | null = null;
let originalGetUser: ((id: string) => ReturnType<typeof UserStore.getUser>) | null = null;
let currentWrapper: (() => any) | null = null;
let userWrapper: ((id: string) => any) | null = null;
let patchActive = false;
let cachedBadgeUrl: string = "";

async function loadBadge() {
    const stored = await dsGet<string>(DS_BADGE_KEY);
    cachedBadgeUrl = stored ?? "";
}

async function saveBadge(url: string) {
    cachedBadgeUrl = url;
    await dsSet(DS_BADGE_KEY, url);
}

function buildFakePrimaryGuild() {
    const { tag } = settings.store;
    if (!tag.trim()) return null;
    const badge = cachedBadgeUrl || settings.store.badgeUrl.trim() || null;
    return {
        tag: tag.trim().slice(0, 5).toUpperCase(),
        badge,
        identityEnabled: true,
        identityGuildId: "0",
    };
}

function wrapUser(user: any) {
    const fake = buildFakePrimaryGuild();
    if (!fake) return user;
    return virtualMerge(user, { primaryGuild: fake });
}

function getMyId() {
    return originalGetCurrentUser?.()?.id ?? UserStore.getCurrentUser()?.id;
}

function applyPatch() {
    if (originalGetCurrentUser) return;
    originalGetCurrentUser = UserStore.getCurrentUser.bind(UserStore);
    originalGetUser = (UserStore as any).getUser.bind(UserStore);
    const getCurrent = originalGetCurrentUser;
    const getUser = originalGetUser!;
    patchActive = true;

    currentWrapper = (UserStore as any).getCurrentUser = function () {
        const user = getCurrent();
        if (!user || !patchActive) return user;
        return wrapUser(user);
    };

    userWrapper = (UserStore as any).getUser = function (id: string) {
        const user = getUser(id);
        if (!user || !patchActive || id !== getCurrent()?.id) return user;
        return wrapUser(user);
    };

    notifyUpdate();
}

function removePatch() {
    if (!originalGetCurrentUser) return;
    patchActive = false;
    if (UserStore.getCurrentUser === currentWrapper) (UserStore as any).getCurrentUser = originalGetCurrentUser;
    if (UserStore.getUser === userWrapper) (UserStore as any).getUser = originalGetUser;
    originalGetCurrentUser = null;
    originalGetUser = null;
    notifyUpdate();
}

function notifyUpdate() {
    (UserStore as any).emitChange?.();
}

function BadgeUploader() {
    const [preview, setPreview] = React.useState<string>(cachedBadgeUrl);
    const inputRef = React.useRef<HTMLInputElement>(null);

    function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async ev => {
            const dataUrl = ev.target?.result as string;
            await saveBadge(dataUrl);
            setPreview(dataUrl);
            if (settings.store.enabled) notifyUpdate();
        };
        reader.readAsDataURL(file);
    }

    async function clear() {
        await saveBadge("");
        setPreview("");
        if (inputRef.current) inputRef.current.value = "";
        if (settings.store.enabled) notifyUpdate();
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 12, color: "var(--header-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Badge Image
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {preview && (
                    <img
                        src={preview}
                        alt="badge preview"
                        style={{ width: 32, height: 32, borderRadius: 4, objectFit: "contain", background: "var(--background-secondary)", flexShrink: 0 }}
                    />
                )}
                <button
                    style={{
                        padding: "6px 14px", borderRadius: 4, border: "none", cursor: "pointer",
                        background: "var(--brand-500)", color: "#fff", fontSize: 13, fontWeight: 600,
                    }}
                    onClick={() => inputRef.current?.click()}
                >
                    {preview ? "Change image" : "Upload image"}
                </button>
                {preview && (
                    <button
                        style={{
                            padding: "6px 14px", borderRadius: 4, border: "none", cursor: "pointer",
                            background: "var(--background-secondary)", color: "var(--text-normal)", fontSize: 13,
                        }}
                        onClick={clear}
                    >
                        Remove
                    </button>
                )}
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleFile}
                />
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Or paste a URL in the field below — uploaded image takes priority.
            </div>
        </div>
    );
}

const settings = definePluginSettings({
    enabled: {
        type: OptionType.BOOLEAN,
        description: "Show the fake tag next to your name.",
        default: false,
        onChange(v: boolean) {
            if (v) applyPatch(); else removePatch();
        },
    },
    tag: {
        type: OptionType.STRING,
        description: "Tag text (up to 5 chars, auto-uppercased).",
        default: "EQY",
        onChange() {
            if (settings.store.enabled) notifyUpdate();
        },
    },
    _badgeUploader: {
        type: OptionType.COMPONENT,
        description: "",
        component: BadgeUploader,
    },
    badgeUrl: {
        type: OptionType.STRING,
        description: "Badge image URL (e.g. https://cdn.discordapp.com/emojis/ID.png). Ignored if an image is uploaded above.",
        default: "",
        onChange() {
            if (settings.store.enabled) notifyUpdate();
        },
    },
});

export default definePlugin({
    name: "FakeTag",
    description: "Adds a fake clan tag and badge emoji next to your username. Client-side only.",
    tags: ["Customisation", "Fun"],
    authors: [EquicordDevs.endcord_Sharp],
    settings,

    async start() {
        await loadBadge();
        if (settings.store.enabled) applyPatch();
    },

    stop() {
        removePatch();
    },
});
