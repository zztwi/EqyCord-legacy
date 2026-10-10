# EqyCord profile badges

EqyCord Staff (crossed tools) and EqyCord Creator (blue seal with white check) are bundled as transparent SVG assets. Both are assigned to Discord IDs 380070146317877249 and 1306071807815712828.

The required BadgeAPI includes these badges automatically. No optional plugin, network request, token, or local account setting is needed. Any user running this build can see the badges on either assigned profile. Vanilla Discord and older builds without the assignments do not display them.

Assignments live in src/shared/eqycordBadges.ts; profile integration lives in src/api/eqycordBadges.ts. Changes to the bundled list require an updated build. This is not a hosted, live-updating badge service.

The symbols identify roles in EqyCord; no official Discord account flags are changed. Tooltips are EqyCord Staff and EqyCord Creator.

Verification: assignment and asset integration tests pass for both IDs and an unrelated ID. Desktop/web builds and type checking pass. Open both profiles after reload and hover each badge to confirm the tooltips; visual rendering in Discord and cross-client display still require a manual check.
# Community recognition

Two additional independent badges are defined: **EqyCord Contributor** (heart) and **EqyCord Plugin Innovator** (lightbulb). Neither is assigned by default. Their assignments in `src/shared/eqycordBadgeAssignments.json` determine both profile badge visibility and the corresponding settings thank-you cards. Staff and Creator badges do not unlock these cards. See `COMMUNITY-BADGES.md` for assignment and donation configuration.

