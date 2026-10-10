/* SPDX-License-Identifier: GPL-3.0-or-later */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { build } from "esbuild";

test("both EqyCord badges are bundled for both assigned accounts and no other user", async () => {
    const { outputFiles } = await build({ entryPoints: ["src/api/eqycordBadges.ts"], bundle: true, write: false, format: "cjs", platform: "node", logLevel: "silent",
        plugins: [{ name: "badge-assets", setup(builder) {
            builder.onResolve({ filter: /^file:\/\// }, args => ({ path: resolve(args.resolveDir, args.path.slice(7).split("?")[0]), namespace: "badge-svg" }));
            builder.onLoad({ filter: /.*/, namespace: "badge-svg" }, args => ({ contents: "export default " + JSON.stringify(readFileSync(args.path).toString("base64")) }));
        } }]
    });
    const module = { exports: {} };
    new Function("module", "exports", outputFiles[0].text)(module, module.exports);
    const badges = module.exports.eqycordProfileBadges;
    for (const userId of ["380070146317877249", "1306071807815712828"]) {
        assert.deepEqual(badges.filter(b => b.shouldShow({ userId })).map(b => b.description), ["EqyCord Staff", "EqyCord Creator"]);
    }
    assert.deepEqual(badges.filter(b => b.shouldShow({ userId: "123" })), []);
    assert.equal(new Set(badges.map(b => b.id)).size, 4);
    for (const badge of badges) {
        assert.ok(badge.iconSrc.startsWith("data:image/svg+xml;base64,"));
        const svg = Buffer.from(badge.iconSrc.split(",")[1], "base64").toString("utf8");
        assert.match(svg, /<svg/);
        assert.doesNotMatch(svg, /<image|<script|<rect[^>]*width="32"/);
    }
});

test("community recognition badges are independent and never granted to unassigned users", async () => {
    const { outputFiles } = await build({ entryPoints: ["src/shared/eqycordBadges.ts"], bundle: true, write: false, format: "cjs", platform: "node", logLevel: "silent" });
    const module = { exports: {} };
    new Function("module", "exports", outputFiles[0].text)(module, module.exports);
    const { hasEqyCordBadge } = module.exports;
    const fixture = { staff: ["staff"], creator: ["creator"], contributor: ["donor", "both"], innovator: ["idea", "both"] };
    assert.equal(hasEqyCordBadge("donor", "contributor", fixture), true);
    assert.equal(hasEqyCordBadge("donor", "innovator", fixture), false);
    assert.equal(hasEqyCordBadge("idea", "contributor", fixture), false);
    assert.equal(hasEqyCordBadge("idea", "innovator", fixture), true);
    assert.equal(hasEqyCordBadge("both", "contributor", fixture), true);
    assert.equal(hasEqyCordBadge("both", "innovator", fixture), true);
    for (const user of ["staff", "creator", "new", undefined]) {
        assert.equal(hasEqyCordBadge(user, "contributor", fixture), false);
        assert.equal(hasEqyCordBadge(user, "innovator", fixture), false);
    }
    for (const user of ["380070146317877249", "1306071807815712828", undefined]) {
        assert.equal(hasEqyCordBadge(user, "contributor"), false);
        assert.equal(hasEqyCordBadge(user, "innovator"), false);
    }
});
