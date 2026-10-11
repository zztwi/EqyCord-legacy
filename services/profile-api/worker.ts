/* EqyCord profile service. Copyright (c) 2026 EqyCord contributors. SPDX-License-Identifier: GPL-3.0-or-later */
import { isDiscordId, profileApiOrigin, publicCustomProfile } from "../../src/shared/eqyCustomProfile";
import { communityBadgeIds, isCommunityBadgeId } from "../../src/shared/eqyCommunityBadges";

interface Statement {
    bind(...values: unknown[]): Statement;
    first<T = Record<string, unknown>>(): Promise<T | null>;
    all<T>(): Promise<{ results: T[] }>;
    run(): Promise<unknown>;
}
interface Env {
    DB: { prepare(sql: string): Statement; batch(statements: Statement[]): Promise<unknown>; };
    DISCORD_CLIENT_ID: string;
    DISCORD_CLIENT_SECRET: string;
    PUBLIC_ORIGIN: string;
    BADGE_OWNER_ID?: string;
}
const allowedOrigins = new Set(["https://discord.com", "https://canary.discord.com", "https://ptb.discord.com"]);
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
const random = () => b64(crypto.getRandomValues(new Uint8Array(32)));
const hash = async (text: string) => b64(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))));
const json = (value: unknown, status = 200) => Response.json(value, { status });

async function body(request: Request) {
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new Error("Expected JSON");
    const text = await request.text();
    if (text.length > 16_384) throw new Error("Request too large");
    return JSON.parse(text);
}
async function limited(env: Env, key: string, max: number, now: number) {
    const bucket = `${key}:${Math.floor(now / 60_000)}`;
    const row = await env.DB.prepare("INSERT INTO rate_limits(key,hits,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET hits=hits+1 RETURNING hits").bind(bucket, now + 120_000).first<{ hits: number }>();
    return (row?.hits ?? max + 1) > max;
}
async function session(request: Request, env: Env, now: number) {
    const token = request.headers.get("authorization")?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
    if (!token) return null;
    return env.DB.prepare("SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?").bind(await hash(token), now).first<{ user_id: string }>();
}
function page(text: string, status = 200) {
    return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><title>EqyCord</title><body><h1>EqyCord profile sharing</h1><p>${text}</p></body></html>`, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'", "Referrer-Policy": "no-referrer" } });
}

async function route(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = profileApiOrigin(env.PUBLIC_ORIGIN);
    if (!origin || !isDiscordId(env.DISCORD_CLIENT_ID) || !env.DISCORD_CLIENT_SECRET) return json({ error: "Service not configured" }, 503);
    const now = Date.now();
    const ip = request.headers.get("CF-Connecting-IP") ?? "local";
    if (url.pathname === "/badges" && request.method === "GET") {
        if (await limited(env, `badges:${ip}`, 60, now)) return json({ error: "Please try again later" }, 429);
        const rows = await env.DB.prepare("SELECT user_id,badge FROM badges ORDER BY user_id LIMIT 50000").all<{ user_id: string; badge: string }>();
        return json(Object.fromEntries(communityBadgeIds.map(badge => [badge, rows.results.filter(x => x.badge === badge).map(x => x.user_id).slice(0, 5000)])));
    }
    if (url.pathname.startsWith("/auth/") && await limited(env, `auth:${ip}`, 30, now)) return json({ error: "Please try again later" }, 429);

    if (url.pathname === "/auth/start" && request.method === "POST") {
        const data = await body(request);
        if (!/^[A-Za-z0-9_-]{43}$/.test(data.challenge ?? "")) return json({ error: "Invalid challenge" }, 400);
        const state = random();
        await env.DB.prepare("INSERT INTO oauth_pending(state,challenge,expires_at) VALUES (?,?,?)").bind(state, data.challenge, now + 600_000).run();
        await env.DB.batch([
            env.DB.prepare("DELETE FROM oauth_pending WHERE expires_at<?").bind(now),
            env.DB.prepare("DELETE FROM sessions WHERE expires_at<?").bind(now),
            env.DB.prepare("DELETE FROM rate_limits WHERE expires_at<?").bind(now)
        ]);
        return json({ state, authorizeUrl: `${origin}/auth/authorize?state=${state}` });
    }
    if (url.pathname === "/auth/authorize" && request.method === "GET") {
        const state = url.searchParams.get("state") ?? "";
        const row = await env.DB.prepare("SELECT state FROM oauth_pending WHERE state=? AND expires_at>? AND user_id IS NULL").bind(state, now).first();
        if (!row) return page("This sign-in link expired. Please start again from EqyCord.", 400);
        const authorize = new URL("https://discord.com/oauth2/authorize");
        authorize.search = new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID, response_type: "code", scope: "identify", state, redirect_uri: `${origin}/auth/callback`, prompt: "consent" }).toString();
        return new Response(null, { status: 302, headers: { Location: authorize.href, "Set-Cookie": `__Host-eqy_oauth=${state}; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=600` } });
    }
    if (url.pathname === "/auth/callback" && request.method === "GET") {
        const state = url.searchParams.get("state") ?? "";
        const cookie = request.headers.get("cookie")?.match(/(?:^|;\s*)__Host-eqy_oauth=([A-Za-z0-9_-]{43})(?:;|$)/)?.[1];
        if (cookie !== state || !/^[A-Za-z0-9_-]{43}$/.test(state)) return page("Invalid sign-in state. Please start again from EqyCord.", 400);
        const row = await env.DB.prepare("SELECT state FROM oauth_pending WHERE state=? AND expires_at>? AND user_id IS NULL").bind(state, now).first();
        if (!row || !url.searchParams.get("code")) return page("Sign-in expired or was cancelled.", 400);
        const tokenResponse = await fetch("https://discord.com/api/oauth2/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID, client_secret: env.DISCORD_CLIENT_SECRET, grant_type: "authorization_code", code: url.searchParams.get("code")!, redirect_uri: `${origin}/auth/callback` }), signal: AbortSignal.timeout(15_000) });
        if (!tokenResponse.ok) return page("Discord could not complete sign-in. Please try again.", 502);
        const tokens = await tokenResponse.json() as { access_token: string };
        const identity = await fetch("https://discord.com/api/v10/users/@me", { headers: { Authorization: `Bearer ${tokens.access_token}` }, signal: AbortSignal.timeout(15_000) });
        // OAuth access is used only to establish identity; do not store Discord tokens.
        await fetch("https://discord.com/api/oauth2/token/revoke", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID, client_secret: env.DISCORD_CLIENT_SECRET, token: tokens.access_token, token_type_hint: "access_token" }), signal: AbortSignal.timeout(15_000) }).catch(() => {});
        if (!identity.ok) return page("Discord could not verify your account.", 502);
        const user = await identity.json() as { id: string };
        if (!isDiscordId(user.id)) return page("Invalid Discord identity.", 502);
        await env.DB.prepare("UPDATE oauth_pending SET user_id=? WHERE state=? AND user_id IS NULL AND expires_at>?").bind(user.id, state, now).run();
        const response = page("Account verified. Return to EqyCord to finish connecting. Sharing stays off until you enable it.");
        response.headers.set("Set-Cookie", "__Host-eqy_oauth=; Secure; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
        return response;
    }
    if (url.pathname === "/auth/finish" && request.method === "POST") {
        const data = await body(request);
        if (!/^[A-Za-z0-9_-]{43}$/.test(data.verifier ?? "") || !/^[A-Za-z0-9_-]{43}$/.test(data.state ?? "")) return json({ error: "Invalid sign-in" }, 400);
        const row = await env.DB.prepare("DELETE FROM oauth_pending WHERE state=? AND challenge=? AND expires_at>? AND user_id IS NOT NULL RETURNING user_id").bind(data.state, await hash(data.verifier), now).first<{ user_id: string }>();
        if (!row) return json({ pending: true }, 202);
        const token = random();
        await env.DB.prepare("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES (?,?,?)").bind(await hash(token), row.user_id, now + 30 * 86_400_000).run();
        return json({ token, userId: row.user_id });
    }
    const auth = await session(request, env, now);
    if (!auth) return json({ error: "Connect your Discord account first" }, 401);
    if (await limited(env, `user:${auth.user_id}`, 120, now)) return json({ error: "Please try again later" }, 429);
    if (url.pathname === "/admin/badges") {
        if (!isDiscordId(env.BADGE_OWNER_ID) || auth.user_id !== env.BADGE_OWNER_ID) return json({ error: "Owner access required" }, 403);
        if (request.method === "GET") return json({ owner: true });
        if (request.method !== "PUT" && request.method !== "DELETE") return json({ error: "Method not allowed" }, 405);
        const data = await body(request);
        if (!isDiscordId(data.userId) || !isCommunityBadgeId(data.badge)) return json({ error: "Invalid badge assignment" }, 400);
        await env.DB.batch([
            request.method === "PUT"
                ? env.DB.prepare("INSERT INTO badges(user_id,badge,assigned_by,updated_at) VALUES (?,?,?,?) ON CONFLICT(user_id,badge) DO UPDATE SET assigned_by=excluded.assigned_by,updated_at=excluded.updated_at").bind(data.userId, data.badge, auth.user_id, now)
                : env.DB.prepare("DELETE FROM badges WHERE user_id=? AND badge=?").bind(data.userId, data.badge),
            env.DB.prepare("INSERT INTO badge_audit(actor_id,user_id,badge,action,created_at) VALUES (?,?,?,?,?)").bind(auth.user_id, data.userId, data.badge, request.method === "PUT" ? "grant" : "revoke", now)
        ]);
        return json({ ok: true });
    }
    if (url.pathname === "/profiles" && request.method === "GET") {
        const ids = [...new Set((url.searchParams.get("ids") ?? "").split(","))];
        if (ids.length > 50 || ids.some(id => !isDiscordId(id))) return json({ error: "Invalid profile IDs" }, 400);
        const rows = await env.DB.prepare(`SELECT user_id,data FROM profiles WHERE user_id IN (${ids.map(() => "?").join(",")})`).bind(...ids).all<{ user_id: string; data: string }>();
        return json(Object.fromEntries(rows.results.map(row => [row.user_id, publicCustomProfile(JSON.parse(row.data))])));
    }
    if (url.pathname === "/profile" && request.method === "PUT") {
        const data = publicCustomProfile(await body(request));
        await env.DB.prepare("INSERT INTO profiles(user_id,data,updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at").bind(auth.user_id, JSON.stringify(data), now).run();
        return json({ ok: true });
    }
    if (url.pathname === "/profile" && request.method === "DELETE") {
        await env.DB.prepare("DELETE FROM profiles WHERE user_id=?").bind(auth.user_id).run();
        return json({ ok: true });
    }
    if (url.pathname === "/session" && request.method === "DELETE") {
        await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await hash(request.headers.get("authorization")!.slice(7))).run();
        return json({ ok: true });
    }
    return json({ error: "Not found" }, 404);
}

export default {
    async fetch(request: Request, env: Env) {
        const origin = request.headers.get("origin");
        if (origin && !allowedOrigins.has(origin)) return json({ error: "Origin not allowed" }, 403);
        let response: Response;
        if (request.method === "OPTIONS") response = new Response(null, { status: 204 });
        else {
            try { response = await route(request, env); }
            catch (error) {
                if (error instanceof Error && error.message.includes("FIRST10_LIMIT")) response = json({ error: "First 10 can be assigned to at most ten members. Revoke an existing assignment before choosing a replacement." }, 409);
                else response = json({ error: error instanceof SyntaxError || error instanceof RangeError ? "Invalid request" : error instanceof Error && /Invalid|Use an|Expected|too large/.test(error.message) ? error.message : "Service unavailable" }, error instanceof SyntaxError || error instanceof RangeError || error instanceof Error && /Invalid|Use an|Expected|too large/.test(error.message) ? 400 : 503);
            }
        }
        response.headers.set("Cache-Control", "no-store");
        response.headers.set("X-Content-Type-Options", "nosniff");
        if (origin) {
            response.headers.set("Access-Control-Allow-Origin", origin);
            response.headers.set("Vary", "Origin");
            response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        }
        return response;
    }
};
