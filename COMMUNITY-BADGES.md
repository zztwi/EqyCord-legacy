# EqyCord community recognition

Settings → EqyCord shows two independent cards:

- **Support the Project** becomes **Thank You for Contributing** only for accounts assigned the EqyCord Contributor badge.
- **Help Shape the Next Plugin** becomes **Thank You for Shaping Our Plugins** only for accounts assigned the EqyCord Plugin Innovator badge. Everyone else sees the Discord ticket instructions and the bold requirement to submit at least five valid plugin ideas for review. Submission does not guarantee approval or a badge.

The Contributor and Plugin Innovator badges are independent of Staff, Creator, and the cosmetic CustomProfile badge picker. Neither badge is automatically granted for opening a ticket, submitting ideas, donating, or installing the client.

Official EqyCord assignments are stored in `src/shared/eqycordBadgeAssignments.json`. Add a Discord user ID to `contributor` or `innovator` only after the owner grants that recognition, then rebuild and distribute the updated client. Both lists initially contain no users. Existing Staff and Creator assignments are preserved. These are EqyCord badges, visible to clients with the updated assignments; they do not grant Discord privileges. Bundled assignment changes require a client update; no live badge administration service is configured.

The community button opens https://discord.gg/Kexjx2GH3B. PayPal donations are intentionally disabled until the owner provides a payment URL. Configure `donationUrl` in `src/shared/eqycordCommunity.json` when that URL is available. No payment destination or transaction is created automatically.
