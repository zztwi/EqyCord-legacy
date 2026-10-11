# Imported Endcord plugins

Source: https://github.com/rootpoii/Endcord, commit `27c2964e0ff89d4629e6541a179add0442efde1b`.

QuickDelete, RemindMe, AutoReact, SmoothType, FakeTag, FakeConnections, and the CustomProfile icon/badge asset definitions were adapted under GPL-3.0-or-later. Original copyright notices are retained in the imported source. EqyCord branding identifies the distribution, not exclusive authorship.

| Component | Original source attribution |
| --- | --- |
| QuickDelete, AutoReact, FakeTag | Sharp; source copyright 2026 Vendicated and contributors |
| RemindMe | Copyright 2026 unfamiliardev; plugin metadata also names ewlle, rootpoi, kraethis |
| SmoothType | Sharp; ported from Nightcord by coll/viciouscal; copyright 2024 Vendicated and contributors; https://git.nightcord.su/nightcord/nightcord |
| FakeConnections | lastclipped; copyright 2026 Vendicated and contributors |
| CustomProfile source assets and design reference | pepsify; copyright 2026 Vendicated and contributors |
| EqyCord CustomProfile client, shared schema and profile service | Copyright 2026 EqyCord contributors |

The Endcord developer table supplies a fallback Discord ID for unknown authors. EqyCord keeps those names but leaves unverified IDs unset rather than linking them to a different person's account.

CustomProfile was rewritten for EqyCord's APIs and lifecycle. It does not use Endcord's remote profile backend or donor-badge cache. Custom styles are separate from real Discord badges. The gifting-image URLs owned by Endcord were excluded; the shared badge selector uses the source's Discord CDN icons for the supported styles.

Existing Vencord and Equicord notices and licenses remain applicable to their original code.

The community cards reuse the SpecialCard layout shared by Vencord and Endcord, with their Discord CDN decorative sticker backgrounds and donation/contribution illustrations. Original component notices remain intact. The Plugin Innovator illustration is EqyCord's existing badge SVG. References: https://github.com/rootpoii/endcord and https://github.com/Vencord/Vencord/tree/main/src/components/settings .
