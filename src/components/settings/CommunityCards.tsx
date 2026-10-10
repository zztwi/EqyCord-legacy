/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./CommunityCards.css";

import { hasEqyCordBadge } from "@shared/eqycordBadges";
import community from "@shared/eqycordCommunity.json";
import { UserStore, useStateFromStores } from "@webpack/common";
import innovatorIcon from "file://../../assets/eqycord-badges/innovator.svg?base64";

import { SpecialCard } from "./SpecialCard";

function DiscordLabel() {
    return (
        <span className="eqy-community-discord-label">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path fill="currentColor" d="M19.7 5.2a18 18 0 0 0-4.4-1.4l-.6 1.3a16 16 0 0 0-5.4 0l-.6-1.3a18 18 0 0 0-4.4 1.4C1.5 9.4.7 13.5 1.1 17.5a18 18 0 0 0 5.4 2.7l1.1-1.8-1.7-.8.4-.3a13 13 0 0 0 11.4 0l.4.3-1.7.8 1.1 1.8a18 18 0 0 0 5.4-2.7c.5-4.6-.8-8.6-3.2-12.3ZM8 14.7c-1 0-1.8-1-1.8-2.1S7 10.5 8 10.5s1.8 1 1.8 2.1S9 14.7 8 14.7Zm8 0c-1 0-1.8-1-1.8-2.1s.8-2.1 1.8-2.1 1.8 1 1.8 2.1-.8 2.1-1.8 2.1Z" />
            </svg>
            Join the EqyCord Discord
        </span>
    );
}

function DiscordLink() {
    return <button type="button" className="eqy-community-link" onClick={() => VencordNative.native.openExternal(community.discordUrl)}><DiscordLabel /></button>;
}

export function CommunityCards() {
    const userId = useStateFromStores([UserStore], () => UserStore.getCurrentUser()?.id);
    const contributor = hasEqyCordBadge(userId, "contributor");
    const innovator = hasEqyCordBadge(userId, "innovator");
    const donationUrl = community.donationUrl as string | null;

    return (
        <section className="eqy-community-cards" aria-label="Support and community recognition">
            <SpecialCard
                backgroundColor="#c3a3ce"
                backgroundImage="https://media.discordapp.net/stickers/1311070116305436712.png?size=2048"
                cardImage="https://media.discordapp.net/stickers/1039992459209490513.png"
                title="Support the Project"
                description={donationUrl
                    ? "Please consider supporting the development of EqyCord by donating!"
                    : "Help support EqyCord's development. PayPal donations are not available yet."}
            >
                <button type="button" className="eqy-community-link eqy-community-donate" aria-label="Donate with PayPal" disabled={!donationUrl} onClick={() => donationUrl && VencordNative.native.openExternal(donationUrl)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21 3.5 12.5C-2 7 5 0 10 5l2 2 2-2c5-5 12 2 6.5 7.5Z" fill="none" stroke="#e455a3" strokeWidth="2" strokeLinejoin="round" /></svg>
                    Donate
                </button>
                <DiscordLink />
            </SpecialCard>
            {contributor && (
                <SpecialCard
                    backgroundColor="#EDCC87"
                    backgroundImage="https://media.discordapp.net/stickers/1311070166481895484.png?size=2048"
                    cardImage="https://cdn.discordapp.com/emojis/1026533070955872337.png"
                    title="Contributions"
                    subtitle="Thank you for contributing!"
                    description="You've received the EqyCord Contributor badge. Thank you for supporting the project!"
                    buttonTitle={<DiscordLabel />}
                    buttonOnClick={() => VencordNative.native.openExternal(community.discordUrl)}
                />
            )}
            <SpecialCard
                backgroundColor="#bce4d6"
                backgroundImage="https://media.discordapp.net/stickers/1311070166481895484.png?size=2048"
                cardImage={`data:image/svg+xml;base64,${innovatorIcon}`}
                title="Plugin Ideas"
                subtitle={innovator ? "Thank you for shaping our plugins!" : "Help shape the next plugin"}
                description={innovator
                    ? "You've received the Plugin Innovator badge. Thank you for sharing your ideas and helping us create plugins!"
                    : "Join our Discord, open a ticket, and share your plugin ideas to be considered for the Plugin Innovator badge."}
                buttonTitle={<DiscordLabel />}
                buttonOnClick={() => VencordNative.native.openExternal(community.discordUrl)}
            >
                {!innovator && (
                    <p className="eqy-community-requirement"><strong>Submit at least five valid plugin ideas for review.</strong><br />Ideas are evaluated by the team. Submission does not guarantee approval or a badge.</p>
                )}
            </SpecialCard>
        </section>
    );
}

