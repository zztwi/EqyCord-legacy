# EqyCord community recognition

Settings → EqyCord shows independent community cards:

- **Support the Project** remains visible to everyone. A separate gold **Contributions / Thank you for contributing!** card appears only for accounts assigned the EqyCord Contributor badge.
- **Help Shape the Next Plugin** becomes **Thank You for Shaping Our Plugins** only for accounts assigned the EqyCord Plugin Innovator badge. Everyone else sees the Discord ticket instructions and the bold requirement to submit at least five valid plugin ideas for review. Submission does not guarantee approval or a badge.

The Contributor and Plugin Innovator badges are independent of Staff, Creator, and the cosmetic CustomProfile badge picker. Neither badge is automatically granted for opening a ticket, submitting ideas, donating, or installing the client.

Staff and Creator assignments remain bundled in `src/shared/eqycordBadgeAssignments.json`. Contributor and Plugin Innovator assignments now live in the profile service database. The owner-only panel beside the navigation arrows requires verified Discord sign-in and is restricted server-side to account `380070146317877249`. Grants and revocations are audited; clients refresh the public badge registry once per minute while visible. A rebuild is no longer required for those two community badges. They do not grant Discord privileges.

The community button opens https://discord.gg/Kexjx2GH3B. PayPal donations are intentionally disabled until the owner provides a payment URL. Configure `donationUrl` in `src/shared/eqycordCommunity.json` when that URL is available. No payment destination or transaction is created automatically.
