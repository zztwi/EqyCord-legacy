/* EqyCord contributors, 2026. SPDX-License-Identifier: GPL-3.0-or-later */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import puppeteer from "puppeteer-core";

const executablePath = process.env.EQYCORD_TEST_BROWSER ?? "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe";
assert.ok(existsSync(executablePath), "A supported Chromium test browser is required.");
const extension = resolve(process.argv[2] ?? "dist/chromium-unpacked");
assert.ok(existsSync(resolve(extension, "manifest.json")), "Build the web extension before testing.");
const browser = await puppeteer.launch({ executablePath, headless: true, args: [`--load-extension=${extension}`, `--disable-extensions-except=${extension}`] });
try {
    const page = await browser.newPage();
    // This is an entirely local fixture delivered through request interception.
    // No login, real Discord page, messages or personal profile are accessed.
    await page.setRequestInterception(true);
    page.on("request", request => {
        if (request.url().startsWith("chrome-extension:")) void request.continue();
        else if (request.isNavigationRequest()) void request.respond({ status: 200, contentType: "text/html", body: '<!doctype html><html><head><title>EqyCord extension fixture</title></head><body><h1>EqyCord extension fixture</h1></body></html>' });
        else void request.abort();
    });
    await page.goto("https://discord.com/channels/@me");
    await page.waitForFunction(() => !!window.Vencord?.Plugins?.plugins?.VoiceTroll, { timeout: 15000 });
    const report = await page.evaluate(() => {
        const names = ["FreezeCam", "FakeLagVoice", "VoiceTroll"];
        return {
            loaded: names.map(name => ({ name, enabledByDefault: window.Vencord.Plugins.plugins[name].enabledByDefault, configuredEnabled: window.Vencord.Settings.plugins[name].enabled, active: window.Vencord.Settings.plugins[name][name === "FreezeCam" ? "frozen" : "active"] })),
            api: !!window.Vencord.Plugins.plugins.UserAreaAPI,
            ghostEnabled: window.Vencord.Settings.plugins.Ghost.enabled,
            fixture: document.title === "EqyCord extension fixture"
        };
    });
    assert.ok(report.fixture);
    assert.ok(report.api);
    assert.equal(report.ghostEnabled, true);
    for (const plugin of report.loaded) {
        assert.equal(plugin.enabledByDefault, true);
        assert.equal(plugin.configuredEnabled, true);
        assert.equal(plugin.active, false);
    }
    const migration = await page.evaluate(() => {
        const voice = window.Vencord.Plugins.plugins.VoiceTroll, lag = window.Vencord.Plugins.plugins.FakeLagVoice;
        voice.start(); lag.start();
        const initial = { voice: voice.settings.store.intensity, lag: lag.settings.store.intensity, frequency: lag.settings.store.frequency, duration: lag.settings.store.duration, voiceOff: !voice.settings.store.active, lagOff: !lag.settings.store.active };
        voice.settings.store.intensity = 0.4; lag.settings.store.frequency = 0.7;
        voice.stop(); lag.stop(); voice.start(); lag.start();
        const preserved = { voice: voice.settings.store.intensity, frequency: lag.settings.store.frequency };
        voice.stop(); lag.stop();
        return { initial, preserved };
    });
    assert.deepEqual(migration.initial, { voice: 1, lag: 1, frequency: 3, duration: 0.2, voiceOff: true, lagOff: true });
    assert.deepEqual(migration.preserved, { voice: 0.4, frequency: 0.7 });
    await page.evaluate(() => window.VencordNative.settings.set({ plugins: { VoiceTroll: { enabled: false } } }));
    await page.reload();
    await page.waitForFunction(() => !!window.Vencord?.Settings?.plugins?.VoiceTroll, { timeout: 15000 });
    assert.equal(await page.evaluate(() => window.Vencord.Settings.plugins.VoiceTroll.enabled), false, "An explicit saved OFF choice must stay OFF");
    mkdirSync("work/web-verification", { recursive: true });
    writeFileSync("work/web-verification/extension.json", JSON.stringify({ ...report, savedOffRespected: true, actualDiscordPageTested: false }, null, 2));
    console.log("PASS: packaged MAIN-world extension loads in Brave; three web plugins default ON with effects OFF; explicit saved OFF remains respected. Own local fixture, not a Discord call test.");
} finally { await browser.close(); }
