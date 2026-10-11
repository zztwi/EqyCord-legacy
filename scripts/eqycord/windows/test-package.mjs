/* EqyCord contributors, 2026. SPDX-License-Identifier: GPL-3.0-or-later */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const setup = resolve(process.argv[2] ?? "");
assert.ok(setup.endsWith(".exe") && existsSync(setup), "Pass the built setup executable.");
const testRoot = mkdtempSync(join(repository, "work", "setup-package-test-"));
const lifecycleTest = join(testRoot, "LifecycleTests.exe");
const compileLifecycle = spawnSync(join(process.env.WINDIR, "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe"), [
    "/nologo", "/target:exe", "/platform:x64", `/out:${lifecycleTest}`,
    join(repository, "scripts/eqycord/windows/DiscordLifecycle.cs"),
    join(repository, "scripts/eqycord/windows/DiscordLifecycleTests.cs")
], { windowsHide: true, encoding: "utf8", timeout: 30000 });
assert.equal(compileLifecycle.status, 0, compileLifecycle.stdout || compileLifecycle.stderr);
const lifecycle = spawnSync(lifecycleTest, [], { windowsHide: true, encoding: "utf8", timeout: 60000 });
assert.equal(lifecycle.status, 0, lifecycle.stderr || lifecycle.error?.message);
console.log(lifecycle.stdout.trim());
const uiReport = join(testRoot, "ui");
const ui = spawnSync(setup, ["--ui-test", uiReport], { windowsHide: true, timeout: 90000 });
assert.equal(ui.status, 0, existsSync(join(uiReport, "error.txt")) ? readFileSync(join(uiReport, "error.txt"), "utf8") : "Setup UI must start and close without changing Discord.");
const uiResults = JSON.parse(readFileSync(join(uiReport, "results.json"), "utf8"));
assert.equal(uiResults.squareWindow, true);
assert.equal(uiResults.nativeTitleBar, true);
assert.equal(uiResults.noDuplicateWindowControls, true);
assert.ok(existsSync(join(uiReport, "loading.png")));
assert.ok(["animated", "reduced-motion"].includes(uiResults.initial.mesh.mode));
assert.equal(uiResults.initial.mesh.error, "");
assert.equal(uiResults.initial.overflow, false);
assert.deepEqual(uiResults.helpLink, { action: "help", url: "https://discord.gg/Kexjx2GH3B" });
assert.equal(uiResults.bridge.action, "install");
assert.equal(uiResults.bridge.branch, "canary");
assert.match(uiResults.controls, /PASS:/);
assert.equal(uiResults.animation.mode, "animated");
assert.ok(uiResults.animation.intensity > 0);
assert.equal(uiResults.reducedMotion.mode, "reduced-motion");
assert.equal(uiResults.reducedMotion.intensity, 0);
assert.deepEqual(uiResults.fallback, { mode: "fallback", visible: true });
assert.equal(spawnSync(setup, ["--native-smoke"], { windowsHide: true, timeout: 15000 }).status, 0, "Native fallback must still start.");
console.log("PASS: real WebGL rendering, UI action bridge (no patching), keyboard controls, busy/error states, pointer smoothing, reduced motion, static fallback, and native fallback startup.");
const extracted = join(testRoot, "extracted");
mkdirSync(extracted);
writeFileSync(join(extracted, "BADGES.md.extracting"), "interrupted-extraction");
const run = () => spawnSync(setup, ["--extract-only", extracted], { windowsHide: true, timeout: 120000 });
assert.equal(run().status, 0, "Package extraction must succeed.");
assert.equal(run().status, 0, "Extraction must be idempotent.");
const info = JSON.parse(readFileSync(join(extracted, "BUILD-INFO.json"), "utf8").replace(/^\uFEFF/, ""));
assert.equal(info.NodeVersion, "22.14.0");
assert.equal(info.WebView2FixedRuntimeVersion, "154.0.4258.62");
assert.equal(info.StarterPresetSHA256, createHash("sha256").update(readFileSync(join(repository, "src", "shared", "eqyStarterPreset.json"))).digest("hex"));
const manifest = JSON.parse(readFileSync(join(dirname(setup), "payload", "manifest.json"), "utf8").replace(/^\uFEFF/, ""));
for (const [name, digest] of Object.entries(manifest.Files)) {
    assert.equal(createHash("sha256").update(readFileSync(join(extracted, name))).digest("hex"), digest, name);
    assert.doesNotMatch(name, /settings-before|settings\.json$|quickCss\.css$|last-restart/, "No personal data in package");
}
console.log("PASS: self-contained extraction, exact payload hashes, repeat extraction, and no personal settings.");

const fixture = join(testRoot, "FixtureDevelopment");
const resources = join(fixture, "app-1.0.1", "resources");
mkdirSync(resources, { recursive: true });
writeFileSync(join(resources, "app.asar"), "original-fixture-discord-archive");
const installerModule = pathToFileURL(join(extracted, "scripts", "eqycord", "installer.mjs")).href;
const script = `
    import assert from 'node:assert/strict';
    import { readFileSync, existsSync } from 'node:fs';
    import { operate } from ${JSON.stringify(installerModule)};
    const root = ${JSON.stringify(fixture)};
    const project = ${JSON.stringify(extracted)};
    const app = ${JSON.stringify(join(resources, "app.asar"))};
    const original = readFileSync(app);
    await operate('install', root, 'stable', project);
    await operate('verify', root, 'stable', project);
    await operate('repair', root, 'stable', project);
    await operate('verify', root, 'stable', project);
    await operate('uninstall', root, 'stable', project);
    assert.deepEqual(readFileSync(app), original);
    assert.equal(existsSync(${JSON.stringify(join(resources, "_app.asar"))}), false);
    assert.equal(existsSync(${JSON.stringify(join(resources, ".eqycord-install.json"))}), false);
    console.log('PASS: bundled Node runtime installed, verified, and restored exact original bytes on a fixture.');
`;
const fixtureResult = spawnSync(join(extracted, "runtime", "node.exe"), ["--input-type=module", "-e", script], { windowsHide: true, encoding: "utf8", timeout: 120000 });
assert.equal(fixtureResult.status, 0, fixtureResult.stderr || fixtureResult.error?.message);
console.log(fixtureResult.stdout.trim());

const altered = join(extracted, "BADGES.md");
writeFileSync(altered, "changed-by-fixture");
assert.equal(run().status, 1, "Changed installed package files must be refused.");
assert.equal(readFileSync(altered, "utf8"), "changed-by-fixture", "Changed files must not be overwritten.");
console.log("PASS: changed package files refused without overwrite.");
const recoveryRecord = join(testRoot, "recovery.txt");
assert.equal(spawnSync(setup, ["--recovery-extraction-test", extracted, recoveryRecord], { windowsHide: true, timeout: 120000 }).status, 0);
const fresh = readFileSync(recoveryRecord, "utf8");
assert.notEqual(fresh, extracted);
assert.equal(dirname(fresh), testRoot);
assert.equal(readFileSync(altered, "utf8"), "changed-by-fixture");
for (const [name, digest] of Object.entries(manifest.Files))
    assert.equal(createHash("sha256").update(readFileSync(join(fresh, name))).digest("hex"), digest, "Recovery " + name);
console.log("PASS: repair tools recover into a fresh verified directory without overwriting damaged files.");
console.log("Fixture artifacts retained at " + testRoot);
