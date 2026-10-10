/*
 * EqyCord, a Discord client mod based on Vencord
 * Copyright (c) 2026 EqyCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./CommunityCards.css";

import { hasEqyCordBadge } from "@shared/eqycordBadges";
import community from "@shared/eqycordCommunity.json";
import { UserStore, useStateFromStores } from "@webpack/common";

import { SpecialCard } from "./SpecialCard";

function DiscordLink() {
    return (
        <button type="button" className="eqy-community-link" onClick={() => VencordNative.native.openExternal(community.discordUrl)}>
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                <path fill="currentColor" d="M19.7 5.2a18 18 0 0 0-4.4-1.4l-.6 1.3a16 16 0 0 0-5.4 0l-.6-1.3a18 18 0 0 0-4.4 1.4C1.5 9.4.7 13.5 1.1 17.5a18 18 0 0 0 5.4 2.7l1.1-1.8-1.7-.8.4-.3a13 13 0 0 0 11.4 0l.4.3-1.7.8 1.1 1.8a18 18 0 0 0 5.4-2.7c.5-4.6-.8-8.6-3.2-12.3ZM8 14.7c-1 0-1.8-1-1.8-2.1S7 10.5 8 10.5s1.8 1 1.8 2.1S9 14.7 8 14.7Zm8 0c-1 0-1.8-1-1.8-2.1s.8-2.1 1.8-2.1 1.8 1 1.8 2.1-.8 2.1-1.8 2.1Z" />
            </svg>
            Join the EqyCord Discord
        </button>
    );
}

export function CommunityCards() {
    const userId = useStateFromStores([UserStore], () => UserStore.getCurrentUser()?.id);
    const contributor = hasEqyCordBadge(userId, "contributor");
    const innovator = hasEqyCordBadge(userId, "innovator");
    const donationUrl = community.donationUrl as string | null;

    return (
        <section className="eqy-community-cards" aria-label="Support and community recognition">
            <SpecialCard
                backgroundColor="#d1c2f5"
                title={contributor ? "Thank You for Contributing" : "Support the Project"}
                subtitle={contributor ? "EqyCord Contributor" : "Help EqyCord keep growing"}
                description={contributor
                    ? "Your support helps us improve EqyCord. You have received the Contributor badge as a thank-you. We appreciate you being part of the project."
                    : donationUrl
                        ? "Support the development of EqyCord with a donation. Every contribution helps us improve the client."
                        : "Support the development of EqyCord. PayPal donations are not available yet; you can join our Discord to find other ways to contribute."}
            >
                {!contributor && <button type="button" className="eqy-community-link" disabled={!donationUrl} onClick={() => donationUrl && VencordNative.native.openExternal(donationUrl)}>♥ Donate with PayPal</button>}
                <DiscordLink />
            </SpecialCard>
            <SpecialCard
                backgroundColor="#bce4d6"
                title={innovator ? "Thank You for Shaping Our Plugins" : "Help Shape the Next Plugin"}
                subtitle="EqyCord Plugin Innovator"
                description={innovator
                    ? "You have received the Plugin Innovator badge for helping shape EqyCord's plugins. Thank you for sharing your ideas and helping us build something better."
                    : "Have ideas for new plugins? Join our Discord, open a ticket, and share your suggestions to be considered for the Plugin Innovator badge."}
            >
                {!innovator && (
                    <p className="eqy-community-requirement"><strong>Submit at least five valid plugin ideas for review.</strong><br />Ideas are evaluated by the team. Submission does not guarantee approval or a badge.</p>
                )}
                <DiscordLink />
            </SpecialCard>
        </section>
    );
}
