# Validation record

## Current plugin inventory update

- Vencord standard plugin definitions retained: 185.
- Equicord plugin definitions imported and categorized as EqyCord: 200, from source commit `51eab49cce4566e51f65f29cc0eaae50efdd48d4`.
- Exact duplicate plugin names between the two inventories: 0.
- The earlier EqyCord prototype plugin implementations were removed, including the Ghost voice button and the custom translation, message/attachment search, and voice utility plugins.
- Original Vencord and Equicord author records, source notices, and GPL headers remain in the source. Plugin details display `0009cx0` for EqyCord-origin plugins; Vencord plugin author displays remain unchanged.

## Checks for this update

For this update, `pnpm install --frozen-lockfile` passed, `pnpm test` passed all 10 tests with no failures or skips, and `pnpm buildWeb` passed. The test suite checks desktop builds, TypeScript, ESLint, CSS lint, generated plugin metadata, plugin origin assignment, duplicate names, backup parsing, original Vencord notices, and Windows installer fixtures. The standalone Windows desktop build is produced by `pnpm test`.

Canary must be updated and restarted to verify the plugin manager shows EqyCord branding and the selected EqyCord author profile in plugin details. Canary compatibility does not establish compatibility with Stable or PTB.
