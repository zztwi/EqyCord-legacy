/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Adapted from Endcord CustomProfile by pepsify.
// Original copyright (c) 2026 Vendicated and contributors, GPL-3.0-or-later.
// EqyCord adaptations copyright (c) 2026 EqyCord contributors.


export const FLAG = {
    STAFF: 1,
    PARTNER: 2,
    HYPESQUAD: 4,
    BUG_HUNTER_1: 8,
    BRAVERY: 64,
    BRILLIANCE: 128,
    BALANCE: 256,
    EARLY_SUPPORTER: 512,
    BUG_HUNTER_2: 16384,
    DEV_VERIFIED: 131072,
    MOD_ALUMNI: 262144,
    ACTIVE_DEVELOPER: 4194304,
};

const OLD_NAME_BADGE_ICON = "https://cdn.discordapp.com/badge-icons/6de6d34650760ba5551a79732e98ed60.png";

export const BADGES = [
    { label: "Discord Staff", flag: FLAG.STAFF, icon: "https://cdn.discordapp.com/badge-icons/5e74e9b61934fc1f67c65515d1f7e60d.png" },
    { label: "HypeSquad Events", flag: FLAG.HYPESQUAD, icon: "https://cdn.discordapp.com/badge-icons/bf01d1073931f921909045f3a39fd264.png" },
    { label: "HypeSquad Bravery", flag: FLAG.BRAVERY, icon: "https://cdn.discordapp.com/badge-icons/8a88d63823d8a71cd5e390baa45efa02.png" },
    { label: "HypeSquad Brilliance", flag: FLAG.BRILLIANCE, icon: "https://cdn.discordapp.com/badge-icons/011940fd013da3f7fb926e4a1cd2e618.png" },
    { label: "HypeSquad Balance", flag: FLAG.BALANCE, icon: "https://cdn.discordapp.com/badge-icons/3aa41de486fa12454c3761e8e223442e.png" },
    { label: "Early Supporter", flag: FLAG.EARLY_SUPPORTER, icon: "https://cdn.discordapp.com/badge-icons/7060786766c9c840eb3019e725d2b358.png" },
    { label: "Bug Hunter Level 2", flag: FLAG.BUG_HUNTER_2, icon: "https://cdn.discordapp.com/badge-icons/848f79194d4be5ff5f81505cbd0ce1e6.png" },
    { label: "Bug Hunter Level 1", flag: FLAG.BUG_HUNTER_1, icon: "https://cdn.discordapp.com/badge-icons/2717692c7dca7289b35297368a940dd0.png" },
    { label: "Early Verified Bot Developer", flag: FLAG.DEV_VERIFIED, icon: "https://cdn.discordapp.com/badge-icons/6df5892e0f35b051f8b61eace34f4967.png" },
    { label: "Active Developer", flag: FLAG.ACTIVE_DEVELOPER, icon: "https://cdn.discordapp.com/badge-icons/6bdc42827a38498929a4920da12695d9.png" },
];

export const SPECIAL_BADGES: Record<string, { label: string; icon: string }> = {
    oldname: { label: "Old username", icon: OLD_NAME_BADGE_ICON },
    quest: { label: "Completed a quest", icon: "https://cdn.discordapp.com/badge-icons/7d9ae358c8c5e118768335dbe68b4fb8.png" },
    meadow: { label: "Last Meadow Online", icon: "https://cdn.discordapp.com/badge-icons/ca105ad9cfc8580c765101d17bbb2323.png" },
    orbs: { label: "Orbs — Apprentice", icon: "https://cdn.discordapp.com/badge-icons/83d8a1eb09a8d64e59233eec5d4d5c2d.png" },
};

export const NITRO_LEVELS = [
    { label: "Nitro (0 months)", icon: "https://cdn.discordapp.com/badge-icons/2ba85e8026a8614b640c2837bcdfe21b.png" },
    { label: "Bronze (1 month)", icon: "https://cdn.discordapp.com/badge-icons/4f33c4a9c64ce221936bd256c356f91f.png" },
    { label: "Silver (3 months)", icon: "https://cdn.discordapp.com/badge-icons/4514fab914bdbfb4ad2fa23df76121a6.png" },
    { label: "Gold (6 months)", icon: "https://cdn.discordapp.com/badge-icons/2895086c18d5531d499862e41d1155a6.png" },
    { label: "Platinum (12 months)", icon: "https://cdn.discordapp.com/badge-icons/0334688279c8359120922938dcb1d6f8.png" },
    { label: "Diamond (24 months)", icon: "https://cdn.discordapp.com/badge-icons/0d61871f72bb9a33a7ae568c1fb4f20a.png" },
    { label: "Emerald (36 months)", icon: "https://cdn.discordapp.com/badge-icons/11e2d339068b55d3a506cff34d3780f3.png" },
    { label: "Ruby (60 months)", icon: "https://cdn.discordapp.com/badge-icons/cd5e2cfd9d7f27a8cdcd3e8a8d5dc9f4.png" },
    { label: "Opal (72 months)", icon: "https://cdn.discordapp.com/badge-icons/5b154df19c53dce2af92c9b61e6be5e2.png" },
];
const NITRO_LEVEL_MONTHS = [0, 1, 3, 6, 12, 24, 36, 60, 72];

const BOOST_LABELS_RAW = [
    "1 Month", "2 Months", "3 Months", "6 Months",
    "9 Months", "12 Months", "15 Months", "18 Months", "24 Months"
];
export const BOOST_LABELS = BOOST_LABELS_RAW.map(l => l);
const BOOST_MONTHS = [1, 2, 3, 6, 9, 12, 15, 18, 24];
export const BOOST_ICONS = [
    "https://cdn.discordapp.com/badge-icons/51040c70d4f20a921ad6674ff86fc95c.png",
    "https://cdn.discordapp.com/badge-icons/0e4080d1d333bc7ad29ef6528b6f2fb7.png",
    "https://cdn.discordapp.com/badge-icons/72bed924410c304dbe3d00a6e593ff59.png",
    "https://cdn.discordapp.com/badge-icons/df199d2050d3ed4ebf84d64ae83989f8.png",
    "https://cdn.discordapp.com/badge-icons/996b3e870e8a22ce519b3a50e6bdd52f.png",
    "https://cdn.discordapp.com/badge-icons/991c9f39ee33d7537d9f408c3e53141e.png",
    "https://cdn.discordapp.com/badge-icons/cb3ae83c15e970e8f3d410bc62cb8b99.png",
    "https://cdn.discordapp.com/badge-icons/7142225d31238f6387d9f09efaa02759.png",
    "https://cdn.discordapp.com/badge-icons/ec92202290b48d0879b7413d2dde3bab.png",
];

export const AVATAR_DECORATIONS = [
    { id: "1144307957425778779", label: "Hearts" },
    { id: "1144308196723408958", label: "Hearts Animated" },
    { id: "1212569433839636530", label: "Lofi Cafe" },
    { id: "1481387347642810480", label: "Winter" },
    { id: "1343751617362661526", label: "Magic Orb" },
    { id: "1373015260465987705", label: "Dragon" },
    { id: "1333866045303423026", label: "Ghost" },
    { id: "1144308439720394944", label: "Sakura Drift" },
    { id: "1432550258126229565", label: "Neon" },
    { id: "1462116613632426014", label: "Cyber City" },
    { id: "1462116613682757888", label: "Retro" },
    { id: "1144307629225672846", label: "Fire" },
    { id: "1341506443718688768", label: "Void" },
    { id: "1447654090640330763", label: "Celestial" },
    { id: "1483857762890022923", label: "Snowy" },
    { id: "1479561706672885811", label: "Ice" },
    { id: "1212569856189407352", label: "Cozy" },
    { id: "1485784028710830242", label: "New Year" },
    { id: "1341506444150702080", label: "Abyss" },
    { id: "1232071712695386162", label: "Spring" },
    { id: "1220514048068812901", label: "Summer" },
    { id: "1427463138634109026", label: "Autumn" },
    { id: "1341506443865489408", label: "Darkness" },
    { id: "1144003752978829455", label: "Flaming Sword" },
    { id: "1144006094134456352", label: "Magical Potion" },
    { id: "1144046002110738634", label: "Fairy Sprites" },
    { id: "1144048390594908212", label: "Wizard's Staff" },
    { id: "1144048977138946230", label: "Glowing Runes" },
    { id: "1144049316009353338", label: "Defensive Shield" },
    { id: "1144049603109470370", label: "Skull Medallion" },
    { id: "1144049924397334651", label: "Treasure and Key" },
    { id: "1207047014769234001", label: "Fire Element" },
    { id: "1207047597294886923", label: "Water" },
    { id: "1207047808838799410", label: "Air" },
    { id: "1207048049571139584", label: "Earth" },
    { id: "1207048289610899526", label: "Lightning" },
    { id: "1207048656289534022", label: "Balance" },
    { id: "1232070870093008937", label: "Stardust" },
    { id: "1232071157746765906", label: "Black Hole" },
    { id: "1232071712695386162", label: "Constellations" },
    { id: "1232072121950146560", label: "Solar Orbit" },
    { id: "1232072520249643028", label: "UFO" },
    { id: "1232072859485208687", label: "Astronaut Helmet" },
    { id: "1197344326133502032", label: "Glitch" },
    { id: "1197344396983664670", label: "Cybernetic" },
    { id: "1197344575832981605", label: "Digital Sunrise" },
    { id: "1197344636558114986", label: "Implant" },
];

function getDecorationUrl(assetId: string, animated = false): string {
    return `https://cdn.discordapp.com/media/v1/collectibles-shop/${assetId}/${animated ? "animated" : "static"}`;
}

export const PROFILE_EFFECTS = [
    { id: "1139323092645183591", label: "Hydro Blast" },
    { id: "1139323093991575696", label: "Sakura Dreams" },
    { id: "1139323099251232828", label: "Mystic Vines" },
    { id: "1139323099687436419", label: "Pixie Dust" },
    { id: "1212582298893946880", label: "Dreamy" },
    { id: "1212582372877541427", label: "Ki Detonate" },
    { id: "1212582452640350238", label: "Sushi Mania" },
    { id: "1139323100568244355", label: "Magic Hearts" },
    { id: "1139323093551165533", label: "Shatter" },
    { id: "1139323101008642101", label: "Shuriken Strike" },
    { id: "1139323101881061466", label: "Power Surge" },
    { id: "1158572178179108968", label: "Ghoulish Graffiti" },
    { id: "1158572275507937342", label: "Dark Omens" },
    { id: "1197344693630009424", label: "Nightrunner" },
    { id: "1197344764174008452", label: "Uplink Error" },
    { id: "1217626509737459852", label: "Petal Serenade" },
    { id: "1217627051217911848", label: "Fellowship of the Spring" },
    { id: "1217627230818009171", label: "Spring Bloom" },
    { id: "1228233390260486164", label: "Study Spot" },
    { id: "1228234634379132958", label: "All Nighter" },
    { id: "1237654783209508904", label: "Jolly Roger" },
    { id: "1237654867330469949", label: "Forgotten Treasure" },
    { id: "1237654942202990602", label: "Haunted Man O' War" },
    { id: "1232073286582538261", label: "Shooting Stars" },
    { id: "1232073608168472638", label: "Twilight" },
    { id: "1207049115339591681", label: "Rock Slide" },
    { id: "1207049364464345158", label: "Vortex" },
    { id: "1207049498065375343", label: "Mastery" },
    { id: "1245088205330710539", label: "Turbo Drive" },
    { id: "1245088254647205991", label: "Twinkle Trails" },
];

