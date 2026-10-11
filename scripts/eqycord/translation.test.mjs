/* SPDX-License-Identifier: GPL-3.0-or-later */
import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

async function load(entry, fetchMock) {
    const { outputFiles } = await build({
        entryPoints: [entry], bundle: true, write: false, format: "cjs", platform: "node", logLevel: "silent",
        plugins: [{ name: "translation-test-dependencies", setup(builder) {
            builder.onResolve({ filter: /settings$|@utils\/Logger/ }, args => ({ path: args.path, namespace: "test" }));
            builder.onLoad({ filter: /.*/, namespace: "test" }, args => ({ contents: args.path.includes("Logger")
                ? 'export class Logger { error() {} }'
                : 'export const settings = { store: { target: "en", targetLanguage: "en", confidenceRequirement: 0.8, toki: false, sitelen: false, shavian: false } }; export const getExcludedLanguages = () => new Set();'
            }));
        } }]
    });
    const module = { exports: {} };
    new Function("module", "exports", "fetch", outputFiles[0].text)(module, module.exports, fetchMock);
    return module.exports;
}

const response = text => ({ ok: true, json: async () => ({ src: "it", confidence: 1, sentences: [{ trans: text }] }) });

test("Translate+ returns translation and propagates provider errors", async () => {
    const translator = await load("src/equicordplugins/translatePlus/utils/translator.ts", async () => response("Hello"));
    assert.deepEqual(await translator.translate("ciao"), { src: "it", text: "Hello" });
    const broken = await load("src/equicordplugins/translatePlus/utils/translator.ts", async () => ({ ok: false, status: 429 }));
    await assert.rejects(broken.translate("ciao"), /429/);
});

test("MessageTranslate caches success, refetches edits, and allows recovery after failure", async () => {
    let requests = 0;
    let fail = false;
    const translator = await load("src/equicordplugins/messageTranslate/utils/translate.ts", async () => {
        requests++;
        if (fail) throw new Error("Network unavailable");
        return response("Hello " + requests);
    });
    assert.equal((await translator.translate("1", "ciao")).translated, "Hello 1");
    await translator.translate("1", "ciao");
    assert.equal(requests, 1);
    await translator.translate("1", "salve");
    assert.equal(requests, 2);
    fail = true;
    assert.equal(await translator.translate("2", "ciao"), null);
    assert.equal(translator.hasFailed("2", "ciao"), true);
    const now = Date.now;
    Date.now = () => now() + 31000;
    try {
        assert.equal(translator.hasFailed("2", "ciao"), false);
        fail = false;
        assert.ok(await translator.translate("2", "ciao"));
    } finally { Date.now = now; }
});
