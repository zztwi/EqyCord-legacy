/*
 * EqyCord, a Discord client mod based on Vencord
 * Copyright (c) 2026 EqyCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import test from "node:test";

import { inspectInstall, operate, parseArguments, PROJECT } from "./installer.mjs";

function fixture() {
    const work = join(PROJECT, "work");
    mkdirSync(work, { recursive: true });
    const temporary = mkdtempSync(join(work, "installer-test-"));
    // Upstream would terminate a process named DiscordDevelopment.exe, never the
    // user's Stable/PTB/Canary. The wrapper also verifies that it is closed.
    const location = join(temporary, "FixtureDevelopment");
    const resources = join(location, "app-1.0.1", "resources");
    mkdirSync(resources, { recursive: true });
    writeFileSync(join(resources, "app.asar"), "fixture-original-discord-archive");
    return { location, resources, cleanup() {
        const child = relative(work, resolve(temporary));
        assert.ok(child && !child.startsWith(".."));
        rmSync(temporary, { recursive: true, force: true });
    } };
}

test("Windows preflight detects legacy layout and rejects invalid/ambiguous versions", () => {
    const f = fixture();
    try {
        assert.equal(inspectInstall(f.location, "canary").patched, false);
        assert.throws(() => inspectInstall(f.location, "unknown"), /Supported channels/);
        mkdirSync(join(f.location, "app-1.0.9", "resources"), { recursive: true });
        mkdirSync(join(f.location, "app-1.0.10", "resources"), { recursive: true });
        assert.throws(() => inspectInstall(f.location), /Ambiguous/);
    } finally { f.cleanup(); }
});

test("installer rejects mistyped, missing, duplicate and unsafe CLI arguments", () => {
    assert.deepEqual(parseArguments(["install", "--branch", "canary"]), { action: "install", branch: "canary", location: undefined, appVersion: undefined });
    assert.equal(parseArguments(["repair"]).action, "repair");
    for (const args of [["repait"], ["install", "--brnach", "canary"], ["install", "--branch"], ["install", "--branch", "canary", "--branch", "stable"], ["uninstall", "--app-version", "../app-1.0.1"]]) {
        assert.throws(() => parseArguments(args));
    }
});

test("Windows uninstall can restore the owned old version after Discord creates a newer version", { skip: process.platform !== "win32" }, async () => {
    const f = fixture();
    try {
        const original = readFileSync(join(f.resources, "app.asar"));
        await operate("install", f.location);
        const newer = join(f.location, "app-1.0.2", "resources");
        mkdirSync(newer, { recursive: true });
        writeFileSync(join(newer, "app.asar"), "new-discord-version");
        assert.deepEqual(inspectInstall(f.location).ownedVersions, ["app-1.0.1"]);
        await assert.rejects(operate("uninstall", f.location), /No owned/);
        await operate("verify", f.location, "stable", PROJECT, "app-1.0.1");
        await operate("uninstall", f.location, "stable", PROJECT, "app-1.0.1");
        assert.deepEqual(readFileSync(join(f.resources, "app.asar")), original);
        assert.equal(readFileSync(join(newer, "app.asar"), "utf8"), "new-discord-version");
        assert.deepEqual(inspectInstall(f.location).ownedVersions, []);
    } finally { f.cleanup(); }
});

test("Windows installer refuses to overwrite an existing foreign patch", { skip: process.platform !== "win32" }, async () => {
    const f = fixture();
    try {
        writeFileSync(join(f.resources, "_app.asar"), "foreign-original");
        await assert.rejects(operate("install", f.location), /Already patched/);
        await assert.rejects(operate("uninstall", f.location), /No owned/);
    } finally { f.cleanup(); }
});

test("pinned Windows installer installs, verifies, detects tampering and restores exact original bytes on a fixture", { skip: process.platform !== "win32" }, async () => {
    const f = fixture();
    try {
        const original = readFileSync(join(f.resources, "app.asar"));
        const installed = await operate("install", f.location);
        assert.equal(installed.patched, true);
        assert.equal((await operate("verify", f.location)).verified, true);
        assert.deepEqual(readFileSync(join(f.resources, "_app.asar")), original);
        const backup = join(f.resources, "_app.asar");
        writeFileSync(backup, "tampered");
        await assert.rejects(operate("verify", f.location), /verification failed/);
        await assert.rejects(operate("uninstall", f.location), /unsafe restoration/);
        writeFileSync(backup, original);
        assert.equal((await operate("uninstall", f.location)).patched, false);
        assert.deepEqual(readFileSync(join(f.resources, "app.asar")), original);
        assert.equal(existsSync(join(f.resources, ".eqycord-install.json")), false);
        console.log("Fixture restore SHA256: " + createHash("sha256").update(original).digest("hex"));
    } finally { f.cleanup(); }
});

test("repair replaces an owned build and keeps the exact original restoration archive", { skip: process.platform !== "win32" }, async () => {
    const f = fixture();
    try {
        const original = readFileSync(join(f.resources, "app.asar"));
        await operate("install", f.location);
        await operate("repair", f.location);
        await operate("verify", f.location);
        assert.deepEqual(readFileSync(join(f.resources, "_app.asar")), original);
        assert.equal(existsSync(join(f.resources, ".eqycord-repair.tmp")), false);
        await operate("uninstall", f.location);
        assert.deepEqual(readFileSync(join(f.resources, "app.asar")), original);
    } finally { f.cleanup(); }
});

test("verified legacy Desktop loader migrates to the current package; altered loaders are refused", { skip: process.platform !== "win32" }, async () => {
    const f = fixture();
    try {
        const legacy = join(f.location, "legacy-project");
        mkdirSync(join(legacy, "dist", "Installer"), { recursive: true });
        for (const file of ["patcher.js", "preload.js", "renderer.js", "renderer.css", "Installer/VencordInstallerCli.exe"])
            copyFileSync(join(PROJECT, "dist", file), join(legacy, "dist", file));
        const original = readFileSync(join(f.resources, "app.asar"));
        await operate("install", f.location, "stable", legacy);
        unlinkSync(join(f.resources, ".eqycord-install.json"));
        writeFileSync(join(legacy, "BUILD-UPDATE.json"), JSON.stringify({ RendererSHA256: createHash("sha256").update(readFileSync(join(legacy, "dist", "renderer.js"))).digest("hex") }));
        await operate("verify", f.location, "stable", legacy);
        const loader = readFileSync(join(f.resources, "app.asar"));
        writeFileSync(join(f.resources, "app.asar"), Buffer.concat([loader, Buffer.from("changed")]));
        await assert.rejects(operate("repair", f.location, "stable", PROJECT, undefined, legacy), /Legacy.*verification failed/);
        assert.deepEqual(readFileSync(join(f.resources, "_app.asar")), original);
        writeFileSync(join(f.resources, "app.asar"), loader);
        await operate("repair", f.location, "stable", PROJECT, undefined, legacy);
        await operate("verify", f.location);
        const state = JSON.parse(readFileSync(join(f.resources, ".eqycord-install.json"), "utf8"));
        assert.equal(state.project, PROJECT);
        await operate("uninstall", f.location);
        assert.deepEqual(readFileSync(join(f.resources, "app.asar")), original);
    } finally { f.cleanup(); }
});

test("repair refuses a changed original backup without altering the existing loader", { skip: process.platform !== "win32" }, async () => {
    const f = fixture();
    try {
        await operate("install", f.location);
        const loader = readFileSync(join(f.resources, "app.asar"));
        writeFileSync(join(f.resources, "_app.asar"), "changed-original");
        await assert.rejects(operate("repair", f.location), /unsafe repair/);
        assert.deepEqual(readFileSync(join(f.resources, "app.asar")), loader);
    } finally { f.cleanup(); }
});
