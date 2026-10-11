# EqyCord community recognition

Settings → EqyCord shows independent community cards:

- **Support the Project** remains visible to everyone. A separate gold **Contributions / Thank you for contributing!** card appears only for accounts assigned the EqyCord Contributor badge.
- **Help Shape the Next Plugin** becomes **Thank You for Shaping Our Plugins** only for accounts assigned the EqyCord Plugin Innovator badge. Everyone else sees the Discord ticket instructions and the bold requirement to submit at least five valid plugin ideas for review. Submission does not guarantee approval or a badge.

All community badges are independent of Staff, Creator, and the cosmetic CustomProfile badge picker. No badge is automatically granted for opening a ticket, submitting ideas, donating, or installing the client.

Staff and Creator assignments remain bundled in `src/shared/eqycordBadgeAssignments.json`. The ten community badge assignments live in the profile service database. The owner-only panel beside the navigation arrows requires verified Discord sign-in and is restricted server-side to account `380070146317877249`. Search by name, select the card with its image, enter the member's Discord ID, then Assign badge or Revoke badge. The selected image and actions remain visible below the scrolling list.

| Badge | Image | Recognition |
| --- | --- | --- |
| Contributor | Heart with sparkle | Supports the project |
| Plugin Innovator | Mint lightbulb | Helps shape new plugins |
| Limited Edition | Faceted crystal | Special community occasions |
| Veteran | Blue hourglass | Long-standing members |
| Collab Partner | Blue and mint handshake | Collaborations with EqyCord |
| Event Winner | Gold trophy | Community event winners |
| Community Spark | Orange sparkle | Brings the community together |
| Support | Pink heart and supporting hand | Helps sustain EqyCord |
| Beta Tester | Lavender flask | Tests new releases |
| First 10 | Gold medal marked 10 | One of the first ten members |

First 10 is assigned manually and capped at ten accounts by the database. Repeat grants do not consume another place; revoking it frees a place. Grants and revocations are audited. Clients refresh the public registry once per minute while visible; assigning community badges requires no rebuild. Badges appear in EqyCord profiles and do not grant Discord privileges. Official Discord clients do not render them. The shared catalog in `src/shared/eqyCommunityBadges.ts` supplies the server allowlist and assignment panel.

The community button opens https://discord.gg/Kexjx2GH3B. PayPal donations are intentionally disabled until the owner provides a payment URL. Configure `donationUrl` in `src/shared/eqycordCommunity.json` when that URL is available. No payment destination or transaction is created automatically.
