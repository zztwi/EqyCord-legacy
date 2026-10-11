/* EqyCord contributors, 2026. SPDX-License-Identifier: GPL-3.0-or-later */
import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

async function load(entry) {
    const result = await build({ entryPoints: [entry], bundle: true, write: false, format: "cjs", platform: "node", logLevel: "silent" });
    const module = { exports: {} };
    new Function("module", "exports", result.outputFiles[0].text)(module, module.exports);
    return module.exports;
}
const offVoice = { enabled: false, effect: "robot", intensity: 1, pitch: 0, echo: 0.2, distortion: 0.8 };
const offLag = { enabled: false, effect: "cut", intensity: 1, frequency: 2, duration: 0.2, delay: 0.2 };
test("voice DSP preserves dry samples, bounds every effect and composes voice with lag", async () => {
    const { VoiceDSP } = await load("src/utils/eqyMedia/dsp.ts");
    const input = Float32Array.from({ length: 48000 }, (_, n) => 0.6 * Math.sin(n * 2 * Math.PI * 440 / 48000));
    const out = new Float32Array(input.length);
    new VoiceDSP(48000).process(input, out, offVoice, offLag);
    assert.deepEqual(out, input);
    const outputs = [];
    for (const effect of ["robot", "deep", "high", "radio", "echo", "megaphone", "metallic", "distorted"]) {
        new VoiceDSP(48000).process(input, out, { ...offVoice, enabled: true, effect }, offLag);
        assert.ok(out.every(v => Number.isFinite(v) && Math.abs(v) <= 0.921), effect);
        const difference = out.reduce((sum, v, i) => sum + Math.abs(v - input[i]), 0);
        assert.ok(difference > 100, effect);
        for (const previous of outputs) assert.ok(out.some((v, n) => Math.abs(v - previous[n]) > 0.01), "Each voice effect must produce a distinct signal");
        outputs.push(out.slice());
    }
    for (const effect of ["cut", "loss", "robotic", "delay", "glitch"]) {
        new VoiceDSP(48000).process(input, out, offVoice, { ...offLag, enabled: true, effect });
        assert.ok(out.every(v => Number.isFinite(v) && Math.abs(v) <= 0.921), effect);
        assert.ok(out.some((v, i) => Math.abs(v - input[i]) > 0.2), effect);
    }
    new VoiceDSP(48000).process(input, out, { ...offVoice, enabled: true }, { ...offLag, enabled: true, effect: "delay" });
    const robot = new Float32Array(input.length);
    new VoiceDSP(48000).process(input, robot, { ...offVoice, enabled: true }, offLag);
    for (let n = 10000; n < 11000; n++) assert.ok(Math.abs(out[n] - robot[n - 9600]) < 1e-6, "Delay preserves the upstream voice effect");
    new VoiceDSP(48000).process(input, out, { ...offVoice, enabled: true, intensity: NaN }, { ...offLag, enabled: true, intensity: Infinity, frequency: NaN, duration: Infinity });
    assert.ok(out.every(Number.isFinite));
});
test("GhostTyping stops on cancellation and rejected requests without sending messages", async () => {
    const { TypingPulse } = await load("src/equicordplugins/ghostTyping/state.ts");
    const sent = [], failures = [];
    const pulse = new TypingPulse(async id => { sent.push(id); }, e => failures.push(e));
    pulse.start("channel-a", 30);
    await Promise.resolve();
    assert.deepEqual(sent, ["channel-a"]);
    pulse.start("channel-b", 30);
    await Promise.resolve();
    assert.equal(sent.length, 1, "Switching channels must not bypass the nine-second bound");
    pulse.stop();
    assert.equal(pulse.snapshot(), "");
    const rejected = new TypingPulse(async () => { throw new Error("429"); }, e => failures.push(e));
    rejected.start("channel-a", 30);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(rejected.snapshot(), "");
    assert.equal(failures.length, 1);
});

test("GhostTyping auto-expires and never pulses more than once per nine seconds", async t => {
    const { TypingPulse } = await load("src/equicordplugins/ghostTyping/state.ts");
    t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 100000 });
    const sent = [];
    const pulse = new TypingPulse(async id => sent.push([id, Date.now()]), () => {});
    pulse.start("chat", 20); await Promise.resolve();
    t.mock.timers.tick(9000); await Promise.resolve();
    t.mock.timers.tick(9000); await Promise.resolve();
    t.mock.timers.tick(2000); await Promise.resolve();
    assert.equal(sent.length, 3);
    assert.equal(pulse.snapshot(), "");
    for (let n = 1; n < sent.length; n++) assert.ok(sent[n][1] - sent[n - 1][1] >= 9000);
});

test("FakePlaying coalesces presence changes and ignores assets resolved after disable", async t => {
    const calls = [], failures = [];
    let finishAssets;
    const api = {
        definePluginSettings(defs) {
            const initial = Object.fromEntries(Object.entries(defs).map(([key, option]) => [key, option.default ?? option.options?.find(x => x.default)?.value]));
            const store = new Proxy(initial, { set(target, key, value) { target[key] = value; defs[key]?.onChange?.(value); return true; } });
            return { store, withPrivateSettings() { return this; }, use() { return store; } };
        },
        ApplicationAssetUtils: { fetchAssetIds: () => new Promise(resolve => { finishAssets = resolve; }) },
        FluxDispatcher: { dispatch: value => calls.push(value) },
        showToast: value => failures.push(value)
    };
    globalThis.__eqyPresenceTest = api;
    const bundled = await build({ entryPoints: ["src/equicordplugins/fakePlaying/index.tsx"], bundle: true, write: false, format: "cjs", platform: "node", logLevel: "silent", plugins: [{ name: "presence-test", setup(builder) {
        builder.onResolve({ filter: /^@/ }, args => ({ path: args.path, namespace: "test" }));
        builder.onLoad({ filter: /.*/, namespace: "test" }, args => ({ contents: args.path.endsWith(".css") ? "" : args.path === "@utils/types" ? "export default x=>x;export const OptionType={};" : args.path === "@api/Settings" ? "export const definePluginSettings=globalThis.__eqyPresenceTest.definePluginSettings;" : "export const {ApplicationAssetUtils,FluxDispatcher,showToast}=globalThis.__eqyPresenceTest;export const React={};" }));
    } }] });
    const module = { exports: {} }; new Function("module", "exports", bundled.outputFiles[0].text)(module, module.exports);
    const plugin = module.exports.default;
    t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 100000 });
    try {
        plugin.start(); plugin.settings.store.active = true;
        for (const game of ["First", "Second", "Latest"]) plugin.settings.store.game = game;
        t.mock.timers.tick(500); await Promise.resolve();
        assert.equal(calls.filter(c => c.activity).length, 1);
        assert.equal(calls.at(-1).activity.name, "Latest");
        assert.equal(calls.at(-1).type, "LOCAL_ACTIVITY_UPDATE");
        plugin.settings.store.largeImage = "asset";
        t.mock.timers.tick(5000); await Promise.resolve();
        assert.equal(typeof finishAssets, "function");
        plugin.settings.store.active = false;
        finishAssets(["resolved"]); await Promise.resolve();
        assert.equal(calls.at(-1).activity, null);
        assert.equal(calls.filter(c => c.activity).length, 1);
        assert.deepEqual(failures, []);
    } finally { plugin.stop(); delete globalThis.__eqyPresenceTest; }
});
