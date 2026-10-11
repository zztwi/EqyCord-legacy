/* EqyCord contributors, 2026. SPDX-License-Identifier: GPL-3.0-or-later */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

test("Source archives build without Git identity and personal plugins disable official updates", () => {
    const common = pathToFileURL(resolve("scripts/build/common.mjs")).href;
    const fixture = mkdtempSync(join(tmpdir(), "eqy-source-build-"));
    writeFileSync(join(fixture, "package.json"), readFileSync("package.json"));
    mkdirSync(join(fixture, "scripts/build/module"), { recursive: true });
    writeFileSync(join(fixture, "scripts/build/module/style.js"), readFileSync("scripts/build/module/style.js"));
    const inspect = () => {
        const code = `process.argv.push('--standalone');const m=await import(${JSON.stringify(common)});console.log(JSON.stringify({hash:m.gitHash,disabled:m.IS_UPDATER_DISABLED}));`;
        const result = spawnSync(process.execPath, ["--input-type=module", "-e", code], { cwd: fixture, env: { ...process.env, VENCORD_HASH: "", VENCORD_REMOTE: "" }, encoding: "utf8", windowsHide: true });
        assert.equal(result.status, 0, result.stderr);
        return JSON.parse(result.stdout.trim());
    };
    writeFileSync(join(fixture, "SOURCE-COMMIT.txt"), "b".repeat(40));
    assert.deepEqual(inspect(), { hash: "bbbbbbbb", disabled: true });
    mkdirSync(join(fixture, "src/userplugins"), { recursive: true });
    writeFileSync(join(fixture, "src/userplugins/personal.ts"), "export default {};");
    writeFileSync(join(fixture, "SOURCE-COMMIT.txt"), "$Format:%H$");
    const code = `process.argv.push('--standalone');const m=await import(${JSON.stringify(common)});console.log(JSON.stringify({disabled:m.IS_UPDATER_DISABLED}));`;
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", code], { cwd: fixture, env: { ...process.env, VENCORD_HASH: "cccccccc", VENCORD_REMOTE: "zztwi/EqyCord-releases" }, encoding: "utf8", windowsHide: true });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout.trim()), { disabled: true });
});
