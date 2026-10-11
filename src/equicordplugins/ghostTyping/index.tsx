/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChatBarButton } from "@api/ChatButtons";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { React, RestAPI, showToast } from "@webpack/common";

import { TypingPulse } from "./state";
const settings = definePluginSettings({ duration: { type: OptionType.NUMBER, description: "Typing duration in seconds (5–120). Stop takes effect after Discord's current indicator expires, usually within 10 seconds.", default: 15 } });
const pulse = new TypingPulse(async channel => { await RestAPI.post({ url: `/channels/${channel}/typing` }); }, () => showToast("Typing stopped: Discord rejected the request", "failure"));
function Icon(props: any) { return <svg {...props} width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>; }
function Button({ channel, disabled, isMainChat }: any) {
    const active = React.useSyncExternalStore(pulse.subscribe, pulse.snapshot) === channel.id;
    if (!isMainChat || disabled) return null;
    return <ChatBarButton tooltip={active ? "Stop Ghost Typing" : "Start Ghost Typing"} onClick={() => active ? pulse.stop() : pulse.start(channel.id, settings.store.duration)}><Icon /></ChatBarButton>;
}
export default definePlugin({ name: "GhostTyping", description: "Send bounded typing indicators without sending a message. Stop and automatic expiry stop further pulses.", authors: [{ name: "0009cx0", id: 380070146317877249n }], dependencies: ["ChatInputButtonAPI"], settings,
    chatBarButton: { icon: Icon, render: Button }, stop() { pulse.stop(); }, flux: { CHANNEL_SELECT() { pulse.stop(); }, LOGOUT() { pulse.stop(); }, CONNECTION_CLOSED() { pulse.stop(); } } });
