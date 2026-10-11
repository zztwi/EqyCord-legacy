# EqyCord profile service

The profile API is deployed on Cloudflare Workers with D1 storage. The client pins `https://eqycord-profiles.zz0009cx0.workers.dev` with an exact connection policy. Sharing remains opt-in and requires account verification.

## Provisioning status (2026-10-10)

- Discord application: `EqyCord`, client ID `1558477119158231060`.
- OAuth callback saved: `https://eqycord-profiles.zz0009cx0.workers.dev/auth/callback`.
- Profile API deployed at that origin; preview URLs disabled.
- D1 ID `ffa76a4b-55ca-4ec5-abc8-0a040d7eae26`: all six schema statements applied remotely and the four service tables verified with a live query.
- OAuth client secret stored encrypted in Cloudflare; not stored in source or the client build.
- Live Discord OAuth completed on 2026-10-10 with the real account owner. Authenticated read and owner write/readback passed; unknown identity/contact fields were excluded, replay was rejected, the original profile was restored, and the test session was revoked. Unauthenticated and revoked-session reads returned 401. Rendering in two real EqyCord clients still requires verification.

## Behavior

Connected EqyCord clients retrieve styles for profiles they encounter. They render custom names, profile data and badge styles locally. Official Discord clients do not render these changes. This is cosmetic customization; it does not grant Nitro, staff status, real badges, or alter the server account creation date.

API access authenticates Discord accounts, not installed software. It cannot prove that an authenticated requester uses EqyCord: a compatible client could call the API. Shared profile data is visible to authenticated users of this service. Do not promise exclusive or confidential visibility based on the client name.

The client starts a sign-in challenge, opens a browser OAuth flow with only the `identify` scope, and polls for completion with its secret verifier. The callback validates a browser-bound state cookie. Discord OAuth access is used to read the account ID and then revoked; Discord account tokens and OAuth client secrets never enter the client build. Service sessions use random opaque tokens stored hashed in D1 and expire after 30 days. Writes and deletes always use the authenticated identity, regardless of submitted user IDs.

Profile sharing is off by default. The user must connect their current Discord account and explicitly enable sharing. Email and phone previews stay local. Sharing images requires HTTPS URLs; local uploaded images stay local. Incoming/outgoing profiles use a strict field allowlist. Shared profiles can be deleted by turning sharing off and saving or resetting. Disabling the client plugin stops retrieval and cosmetic hooks, but does not delete an already published profile.

## Activation

Required external setup: a Cloudflare account and a Discord application owned by the project maintainer. No paid domain is required; a Worker `workers.dev` address can be used.

1. Sign in to Cloudflare using Wrangler: `pnpm dlx wrangler login`.
2. From `services/profile-api`, create D1: `pnpm dlx wrangler d1 create eqycord-profiles`. Put its database ID in `wrangler.toml`.
3. Apply the schema: `pnpm dlx wrangler d1 execute eqycord-profiles --remote --file schema.sql`.
4. Create an application in the Discord Developer Portal. Set `DISCORD_CLIENT_ID` and `PUBLIC_ORIGIN` in `wrangler.toml`. Register exactly `https://YOUR_WORKER_HOST/auth/callback` as an OAuth2 redirect.
5. Store the OAuth client secret in Cloudflare: `pnpm dlx wrangler secret put DISCORD_CLIENT_SECRET`. Do not commit or paste it into chat.
6. Deploy: `pnpm dlx wrangler deploy`.
7. Set `src/shared/eqyProfileService.json` to that exact HTTPS origin. Rebuild and distribute EqyCord. This pins the same service for users; their plugin settings do not accept arbitrary API destinations.
8. Test with two real Discord accounts before announcing cross-client availability: connect each account, enable sharing on account A, reopen A's profile in client B, then disable sharing and confirm B refreshes. Never use the Discord user token.

The client batches at most 50 encountered IDs and caches them for one minute. Account changes invalidate session lookups. Request limits bound sign-in and authenticated requests. No unbounded public profile-directory endpoint is exposed. D1 storage and per-minute counters should be monitored under the project's Cloudflare quota; only expired sessions, pending logins and counters are removed automatically during new sign-ins.

## Local verification

From repository root:

```sh
pnpm exec tsc -p services/profile-api/tsconfig.json
node --test scripts/eqycord/profile-service.test.mjs
```

Tests use real SQLite with a D1 adapter and mocked Discord OAuth responses. They verify schema filtering, private-field exclusion, owner-only writes/reset, expired sessions, CORS, OAuth state/cookie/challenge checks, one-time issuance and throttling. They do not establish that a live Cloudflare deployment or Discord application has been configured.

GPL-3.0-or-later. See `ENDCORD-PLUGIN-NOTICES.md` for the imported source attribution.

## Community badges

On 2026-10-11 the existing database was backed up, the expansion migration applied and the updated Worker deployed. The live public registry returned all ten keys; existing badge and audit counts were preserved and the First 10 trigger was present. No new badge assignments were made during deployment. Live owner assignment through Discord's interface still requires a user interaction; local tests cover the authenticated endpoint and panel selection.

The `/badges` endpoint publishes all ten community badge assignments: Contributor, Plugin Innovator, Limited Edition, Veteran, Collab Partner, Event Winner, Community Spark, Support, Beta Tester and First 10. The shared catalog supplies the client and server allowlists. Verified owner account `380070146317877249` alone can PUT or DELETE `/admin/badges`. Staff and Creator are not writable here. `BADGE_OWNER_ID` is checked server-side, missing owner configuration denies writes, and each grant/revoke is recorded in `badge_audit`. Client registry refreshes do not require profile sharing to be enabled. A database trigger caps First 10 at ten accounts; capacity errors return 409. Repeated grants are idempotent and revocation frees capacity.

For an existing database with the original two-badge CHECK constraint, export a backup before expanding it:

```sh
pnpm dlx wrangler@4.149.0 d1 export eqycord-profiles --remote --output before-badge-expansion.sql
pnpm dlx wrangler@4.149.0 d1 migrations apply eqycord-profiles --remote
pnpm dlx wrangler@4.149.0 deploy
```

Migration `0001_expand_community_badges.sql` preserves prior assignments, profiles, sessions and audit history. Keep the export private; it includes service data. New installations can apply `schema.sql` directly. Local SQLite tests verify migration preservation, every badge's owner-only grant/revoke, and First 10 capacity. Existing clients can ignore new registry keys; missing new keys default to empty lists.
