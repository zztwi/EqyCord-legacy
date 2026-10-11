/* EqyCord contributors, 2026. SPDX-License-Identifier: GPL-3.0-or-later */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { build } from "esbuild";

async function load(entry) {
    const { outputFiles } = await build({ entryPoints: [entry], bundle: true, write: false, format: "cjs", platform: "node", logLevel: "silent" });
    const module = { exports: {} };
    new Function("module", "exports", outputFiles[0].text)(module, module.exports);
    return module.exports;
}
const schema = await load("src/shared/eqyCustomProfile.ts");
test("Client pins the deployed profile origin with an exact connect-src policy", () => {
    const { origin } = JSON.parse(readFileSync("src/shared/eqyProfileService.json", "utf8"));
    assert.equal(schema.profileApiOrigin(origin), "https://eqycord-profiles.zz0009cx0.workers.dev");
    const csp = readFileSync("src/main/csp/index.ts", "utf8");
    assert.ok(csp.includes(`"${origin}": ConnectSrc`));
    assert.ok(!csp.includes('"*.workers.dev"'));
});
const worker = (await load("services/profile-api/worker.ts")).default;
const { communityBadgeIds } = await load("src/shared/eqyCommunityBadges.ts");
const emptyBadges = () => Object.fromEntries(communityBadgeIds.map(id => [id, []]));
const userA = "380070146317877249", userB = "1306071807815712828";
function fixture() {
    const db = new DatabaseSync(":memory:");
    db.exec(readFileSync("services/profile-api/schema.sql", "utf8"));
    const env = {
        DISCORD_CLIENT_ID: userA, DISCORD_CLIENT_SECRET: "test-secret", PUBLIC_ORIGIN: "https://profiles.example.com",
        DB: {
            prepare(sql) {
                let values = [];
                return { bind(...args) { values = args; return this; }, async first() { return db.prepare(sql).get(...values) ?? null; }, async all() { return { results: db.prepare(sql).all(...values) }; }, async run() { return db.prepare(sql).run(...values); } };
            }, async batch(statements) { db.exec("BEGIN"); try { const results = await Promise.all(statements.map(x => x.run())); db.exec("COMMIT"); return results; } catch (e) { db.exec("ROLLBACK"); throw e; } }
        }
    };
    const send = (path, method = "GET", body, token, headers = {}) => worker.fetch(new Request(env.PUBLIC_ORIGIN + path, { method, headers: { Origin: "https://discord.com", ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, body: body && JSON.stringify(body) }), env);
    const addSession = (id, token) => db.prepare("INSERT INTO sessions VALUES (?,?,?)").run(createHash("sha256").update(token).digest("base64url"), id, Date.now() + 60_000);
    return { db, env, send, addSession };
}

test("Profile payload strips contacts, identity injection and unrecognized keys; rejects invalid images and dates", () => {
    assert.deepEqual(schema.publicCustomProfile({ globalName: "Name", email: "private", phone: "private", userId: userB, token: "secret", unknown: 4 }), { globalName: "Name" });
    for (const value of [{ avatar: "javascript:alert(1)" }, { banner: "data:image/png;base64,YQ==" }, { avatar: "https://name:password@example.com/avatar.png" }, { createdAt: "2026-02-30" }, { globalName: "x".repeat(33) }, { badgeFlags: -1 }, { nitroLevel: 100 }, { customBadgeIds: ["creator"] }]) assert.throws(() => schema.publicCustomProfile(value));
    assert.equal(schema.profileApiOrigin("https://profiles.example.com"), "https://profiles.example.com");
    assert.equal(schema.profileApiOrigin(""), "");
    for (const value of ["http://example.com", "https://a:b@example.com", "https://example.com/profile?token=abc"]) assert.throws(() => schema.profileApiOrigin(value));
});

test("API requires verified sessions, enforces owner writes and reset, and excludes private data", async () => {
    const { db, send, addSession } = fixture();
    const a = "a".repeat(43), b = "b".repeat(43);
    addSession(userA, a); addSession(userB, b);
    assert.equal((await send(`/profiles?ids=${userA}`)).status, 401);
    assert.equal((await send("/profile", "PUT", { globalName: "A" })).status, 401);
    assert.equal((await send("/profile", "PUT", { globalName: "A", userId: userB, email: "private", phone: "private" }, a)).status, 200);
    assert.equal(db.prepare("SELECT user_id FROM profiles").get().user_id, userA);
    const view = await (await send(`/profiles?ids=${userA},${userB}`, "GET", undefined, b)).json();
    assert.deepEqual(view, { [userA]: { globalName: "A" } });
    assert.equal((await send("/profile", "PUT", { globalName: "B" }, b)).status, 200);
    assert.equal((await send("/profile", "DELETE", undefined, a)).status, 200);
    assert.deepEqual(await (await send(`/profiles?ids=${userA},${userB}`, "GET", undefined, b)).json(), { [userB]: { globalName: "B" } });
    assert.equal((await send("/profile", "PUT", { avatar: "file:///secret" }, b)).status, 400);
    assert.equal((await send("/session", "DELETE", undefined, b)).status, 200);
    assert.equal((await send(`/profiles?ids=${userA}`, "GET", undefined, b)).status, 401);
    db.close();
});

test("OAuth state, browser binding, challenge verification and one-use token issuance", async () => {
    const { db, env, send } = fixture();
    const verifier = "v".repeat(43);
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const start = await send("/auth/start", "POST", { challenge });
    const { state, authorizeUrl } = await start.json();
    assert.equal(new URL(authorizeUrl).origin, env.PUBLIC_ORIGIN);
    const authorize = await worker.fetch(new Request(authorizeUrl), env);
    assert.equal(authorize.status, 302);
    assert.equal(new URL(authorize.headers.get("location")).searchParams.get("scope"), "identify");
    assert.match(authorize.headers.get("set-cookie"), /Secure; HttpOnly; SameSite=Lax/);
    assert.equal((await send("/auth/finish", "POST", { state, verifier })).status, 202);
    assert.equal((await send(`/auth/callback?state=${state}&code=test`)).status, 400);
    const previousFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (url, init) => {
        calls.push({ url: String(url), init });
        if (String(url).endsWith("/users/@me")) return Response.json({ id: userA });
        if (String(url).endsWith("/revoke")) return new Response(null, { status: 200 });
        return Response.json({ access_token: "test-oauth-access" });
    };
    try {
        assert.equal((await worker.fetch(new Request(`${env.PUBLIC_ORIGIN}/auth/callback?state=${state}&code=test`, { headers: { Cookie: `__Host-eqy_oauth=${state}` } }), env)).status, 200);
        assert.equal((await send("/auth/finish", "POST", { state, verifier: "z".repeat(43) })).status, 202);
        const finish = await send("/auth/finish", "POST", { state, verifier });
        assert.equal(finish.status, 200);
        const session = await finish.json();
        assert.equal(session.userId, userA);
        assert.equal((await send("/auth/finish", "POST", { state, verifier })).status, 202);
        assert.equal(db.prepare("SELECT token_hash FROM sessions").get().token_hash, createHash("sha256").update(session.token).digest("base64url"));
        assert.equal(calls.filter(c => c.url.endsWith("/revoke")).length, 1);
        assert.ok(!db.prepare("SELECT * FROM sessions").get().access_token);
    } finally { globalThis.fetch = previousFetch; db.close(); }
});

test("Expired sessions, CORS, malformed requests and sign-in throttling", async () => {
    const { db, send, addSession } = fixture();
    const token = "t".repeat(43); addSession(userA, token);
    db.prepare("UPDATE sessions SET expires_at=0").run();
    assert.equal((await send(`/profiles?ids=${userA}`, "GET", undefined, token)).status, 401);
    assert.equal((await send("/auth/start", "POST", { challenge: "c".repeat(43) }, undefined, { Origin: "https://attacker.example" })).status, 403);
    assert.equal((await send("/auth/start", "POST", { challenge: "bad" })).status, 400);
    let last;
    for (let i = 0; i < 31; i++) last = await send("/auth/start", "POST", { challenge: "c".repeat(43) });
    assert.equal(last.status, 429);
    db.close();
});

test("Community badges require verified owner writes, reject staff grants and log revocation", async () => {
    const { db, env, send, addSession } = fixture();
    env.BADGE_OWNER_ID = userA;
    const a = "a".repeat(43), b = "b".repeat(43);
    addSession(userA, a); addSession(userB, b);
    const assignment = { userId: userB, badge: "contributor" };
    assert.equal((await send("/admin/badges", "PUT", assignment)).status, 401);
    assert.equal((await send("/admin/badges", "PUT", assignment, b)).status, 403);
    assert.equal((await send("/admin/badges", "PUT", { ...assignment, badge: "staff" }, a)).status, 400);
    assert.equal((await send("/admin/badges", "PUT", assignment, a)).status, 200);
    assert.deepEqual(await (await send("/badges")).json(), { ...emptyBadges(), contributor: [userB] });
    assert.equal((await send("/admin/badges", "PUT", { ...assignment, badge: "innovator" }, a)).status, 200);
    assert.equal((await send("/admin/badges", "DELETE", assignment, a)).status, 200);
    assert.deepEqual(await (await send("/badges")).json(), { ...emptyBadges(), innovator: [userB] });
    assert.equal(db.prepare("SELECT count(*) AS n FROM badge_audit").get().n, 3);
    delete env.BADGE_OWNER_ID;
    assert.equal((await send("/admin/badges", "DELETE", { ...assignment, badge: "innovator" }, a)).status, 403);
    db.close();
});

test("Every community badge grants and revokes independently through verified owner sessions", async () => {
    const { db, env, send, addSession } = fixture();
    env.BADGE_OWNER_ID = userA;
    const token = "a".repeat(43); addSession(userA, token);
    for (const badge of communityBadgeIds) {
        assert.equal((await send("/admin/badges", "PUT", { userId: userB, badge }, token)).status, 200, badge);
        assert.deepEqual((await (await send("/badges")).json())[badge], [userB]);
        assert.equal((await send("/admin/badges", "DELETE", { userId: userB, badge }, token)).status, 200);
        assert.deepEqual(await (await send("/badges")).json(), emptyBadges());
    }
    assert.equal(db.prepare("SELECT count(*) AS n FROM badge_audit").get().n, 20);
    db.close();
});

test("First 10 is capped atomically, repeat assignments work and revocation frees a place", async () => {
    const { db, env, send, addSession } = fixture();
    env.BADGE_OWNER_ID = userA;
    const token = "a".repeat(43); addSession(userA, token);
    const ids = Array.from({ length: 11 }, (_, i) => String(123456789012345670n + BigInt(i)));
    for (const userId of ids.slice(0, 10)) assert.equal((await send("/admin/badges", "PUT", { userId, badge: "first10" }, token)).status, 200);
    assert.equal((await send("/admin/badges", "PUT", { userId: ids[0], badge: "first10" }, token)).status, 200);
    const rejected = await send("/admin/badges", "PUT", { userId: ids[10], badge: "first10" }, token);
    assert.equal(rejected.status, 409);
    assert.match((await rejected.json()).error, /ten members/);
    assert.equal(db.prepare("SELECT count(*) AS n FROM badge_audit").get().n, 11);
    assert.equal((await send("/admin/badges", "DELETE", { userId: ids[0], badge: "first10" }, token)).status, 200);
    assert.equal((await send("/admin/badges", "PUT", { userId: ids[10], badge: "first10" }, token)).status, 200);
    assert.equal((await (await send("/badges")).json()).first10.length, 10);
    db.close();
});

test("Badge schema migration preserves prior assignments, audit history and profiles", () => {
    const { db } = fixture();
    db.exec("DROP TABLE badges; CREATE TABLE badges(user_id TEXT NOT NULL,badge TEXT NOT NULL CHECK(badge IN ('contributor','innovator')),assigned_by TEXT NOT NULL,updated_at INTEGER NOT NULL,PRIMARY KEY(user_id,badge));");
    db.prepare("INSERT INTO badges VALUES (?,?,?,?)").run(userB, "contributor", userA, 1);
    db.prepare("INSERT INTO profiles VALUES (?,?,?)").run(userA, '{"globalName":"Keep"}', 2);
    db.prepare("INSERT INTO badge_audit(actor_id,user_id,badge,action,created_at) VALUES (?,?,?,?,?)").run(userA, userB, "contributor", "grant", 1);
    db.exec("BEGIN");
    db.exec(readFileSync("services/profile-api/migrations/0001_expand_community_badges.sql", "utf8"));
    db.exec("COMMIT");
    assert.equal(db.prepare("SELECT badge FROM badges WHERE user_id=?").get(userB).badge, "contributor");
    assert.equal(db.prepare("SELECT data FROM profiles").get().data, '{"globalName":"Keep"}');
    assert.equal(db.prepare("SELECT count(*) AS n FROM badge_audit").get().n, 1);
    db.prepare("INSERT INTO badges VALUES (?,?,?,?)").run(userB, "limitedEdition", userA, 3);
    assert.throws(() => db.prepare("INSERT INTO badges VALUES (?,?,?,?)").run(userB, "staff", userA, 4));
    db.close();
});
