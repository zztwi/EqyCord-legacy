/*
 * EqyCord, a Discord client mod based on Vencord
 * Copyright (c) 2026 EqyCord contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import test from "node:test";
import { build } from "esbuild";

const require = createRequire(import.meta.url);
const preset = JSON.parse(readFileSync("src/shared/eqyStarterPreset.json", "utf8"));

async function load(entry, dataRoot) {
    const { outputFiles } = await build({ entryPoints: [entry], bundle: true, write: false, format: "cjs", platform: "node", external: ["electron"], logLevel: "silent" });
    const module = { exports: {} };
    const ipc = { on() {}, handle() {} };
    const mockRequire = name => name === "electron" ? { ipcMain: ipc } : require(name);
    new Function("module", "exports", "require", "process", outputFiles[0].text)(module, module.exports, mockRequire, { env: { VENCORD_USER_DATA_DIR: dataRoot }, argv: [] });
    return module.exports;
}

function fixture() {
    mkdirSync("work", { recursive: true });
    return mkdtempSync(join("work", "starter-settings-test-"));
}

test("desktop settings start from the shared preset on the first launch", async () => {
    const root = fixture();
    try {
        const { RendererSettings } = await load("src/main/settings.ts", root);
        assert.deepEqual(RendererSettings.plain, preset.settings);
        assert.deepEqual(JSON.parse(readFileSync(join(root, "settings", "settings.json"), "utf8")), preset.settings);
        assert.equal(readFileSync(join(root, "settings", "quickCss.css"), "utf8"), preset.quickCss);
        assert.equal(RendererSettings.plain.plugins.Ghost.enabled, true);
        assert.equal(RendererSettings.plain.plugins["Translate+"].enabled, true);
    } finally { rmSync(root, { recursive: true, force: true }); }
});

test("existing preferences and QuickCSS survive subsequent launches", async () => {
    const root = fixture();
    const settingsDir = join(root, "settings");
    mkdirSync(settingsDir);
    const custom = '{"plugins":{"Ghost":{"enabled":false}},"localOnly":"keep"}';
    const css = ".personal { color: red; }";
    writeFileSync(join(settingsDir, "settings.json"), custom);
    writeFileSync(join(settingsDir, "quickCss.css"), css);
    try {
        const { RendererSettings } = await load("src/main/settings.ts", root);
        assert.equal(RendererSettings.plain.plugins.Ghost.enabled, false);
        assert.equal(readFileSync(join(settingsDir, "settings.json"), "utf8"), custom);
        assert.equal(readFileSync(join(settingsDir, "quickCss.css"), "utf8"), css);
        const { initializeStarterSettings } = await load("src/main/eqyStarterSettings.ts", root);
        assert.equal(initializeStarterSettings(settingsDir), false);
    } finally { rmSync(root, { recursive: true, force: true }); }
});

test("starter settings preserve standalone QuickCSS and never replace damaged existing preferences", async () => {
    const root = fixture();
    try {
        const { initializeStarterSettings } = await load("src/main/eqyStarterSettings.ts", root);
        writeFileSync(join(root, "quickCss.css"), "keep-existing-css");
        assert.equal(initializeStarterSettings(root), true);
        assert.equal(readFileSync(join(root, "quickCss.css"), "utf8"), "keep-existing-css");
        writeFileSync(join(root, "settings.json"), "damaged-user-file");
        assert.equal(initializeStarterSettings(root), false);
        assert.equal(readFileSync(join(root, "settings.json"), "utf8"), "damaged-user-file");
    } finally { rmSync(root, { recursive: true, force: true }); }
});

test("starter preset has no saved screenshare image or authenticated cloud session", () => {
    assert.equal(preset.settings.cloud.authenticated, false);
    assert.equal(preset.settings.cloud.settingsSync, false);
    assert.equal(preset.settings.cloud.settingsSyncVersion, 0);
    assert.equal(Object.hasOwn(preset.settings.plugins.InstantScreenshare, "streamMedia"), false);
    assert.equal(preset.quickCss, "");
    const catalog = JSON.parse(readFileSync("dist/plugins.json", "utf8"));
    const available = new Set(catalog.map(plugin => plugin.name));
    const unavailableEnabled = Object.entries(preset.settings.plugins)
        .filter(([name, settings]) => settings.enabled && !available.has(name) && !name.endsWith("API"))
        .map(([name]) => name);
    assert.deepEqual(unavailableEnabled, []);
});
