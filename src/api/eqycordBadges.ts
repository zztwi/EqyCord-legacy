/*
 * EqyCord, a Discord client mod based on Vencord
 * Copyright (c) 2026 EqyCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { eqycordBadgeDefinitions, hasEqyCordBadge } from "@shared/eqycordBadges";
import betaTesterIcon from "file://../assets/eqycord-badges/beta-tester.svg?base64";
import collabPartnerIcon from "file://../assets/eqycord-badges/collab-partner.svg?base64";
import communitySparkIcon from "file://../assets/eqycord-badges/community-spark.svg?base64";
import contributorIcon from "file://../assets/eqycord-badges/contributor.svg?base64";
import creatorIcon from "file://../assets/eqycord-badges/creator.svg?base64";
import eventWinnerIcon from "file://../assets/eqycord-badges/event-winner.svg?base64";
import first10Icon from "file://../assets/eqycord-badges/first-10.svg?base64";
import innovatorIcon from "file://../assets/eqycord-badges/innovator.svg?base64";
import limitedEditionIcon from "file://../assets/eqycord-badges/limited-edition.svg?base64";
import staffIcon from "file://../assets/eqycord-badges/staff.svg?base64";
import supportIcon from "file://../assets/eqycord-badges/support.svg?base64";
import veteranIcon from "file://../assets/eqycord-badges/veteran.svg?base64";

import type { ProfileBadge } from "./Badges";

const icons = { staff: staffIcon, creator: creatorIcon, contributor: contributorIcon, innovator: innovatorIcon, limitedEdition: limitedEditionIcon, veteran: veteranIcon, collabPartner: collabPartnerIcon, eventWinner: eventWinnerIcon, communitySpark: communitySparkIcon, support: supportIcon, betaTester: betaTesterIcon, first10: first10Icon };
export const eqycordBadgeIcons = Object.fromEntries(Object.entries(icons).map(([id, icon]) => [id, `data:image/svg+xml;base64,${icon}`])) as Record<keyof typeof icons, string>;

// Staff/Creator are bundled; community assignments are refreshed from the service.
export const eqycordProfileBadges: ProfileBadge[] = eqycordBadgeDefinitions.map(badge => ({
    id: badge.id,
    description: badge.description,
    iconSrc: eqycordBadgeIcons[badge.asset],
    shouldShow: ({ userId }) => hasEqyCordBadge(userId, badge.asset)
}));
