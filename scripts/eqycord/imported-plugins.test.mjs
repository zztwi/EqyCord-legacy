/* EqyCord contributors, 2026. SPDX-License-Identifier: GPL-3.0-or-later */
import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const me = "380070146317877249";
async function loadPlugin(name, extra = {}) {
    const data = new Map(), events = new Map(), documentEvents = new Map();
    const calls = { delete: [], reactions: [], notifications: [], dispatch: [], badge: [] };
    const realUser = { id: me, username: "original", globalName: "Original" };
    const common = {
        UserStore: { getCurrentUser: () => realUser, getUser: id => id === me ? realUser : undefined },
        UserProfileStore: { getUserProfile: () => ({ bio: "original bio" }) },
        IconUtils: { getUserAvatarURL: () => "https://cdn.discordapp.com/original.png" },
        FluxDispatcher: { subscribe: (e, fn) => events.set(e, fn), unsubscribe: e => events.delete(e), dispatch: event => calls.dispatch.push(event) },
        SelectedChannelStore: { getChannelId: () => "channel" },
        ChannelStore: { getChannel: () => ({ guild_id: "server" }) },
        MessageStore: { getMessages: () => ({ toArray: () => [{ id: "one", author: { id: me } }, { id: "other", author: { id: "other" } }, { id: "latest", author: { id: me } }] }) },
        RestAPI: { del: async options => { calls.delete.push(options.url); }, put: async options => { calls.reactions.push(options.url); } },
        NavigationRouter: { transitionTo() {} }, showToast() {}, React: {}, Forms: {},
        ...extra.common
    };
    const modules = {
        "@utils/types": { default: x => x, OptionType: { STRING: 1, BOOLEAN: 2, SELECT: 3, NUMBER: 4, COMPONENT: 5 } },
        "@utils/constants": { EquicordDevs: new Proxy({}, { get: (_, name) => ({ name, id: 0n }) }) },
        "@utils/Logger": { Logger: class { warn() {} error() {} } },
        "@api/Settings": { definePluginSettings: options => ({ store: Object.fromEntries(Object.entries(options).map(([name, value]) => [name, value.default ?? value.options?.find(x => x.default)?.value])) }) },
        "@api/DataStore": { get: async key => structuredClone(data.get(key)), set: async (key, value) => { data.set(key, structuredClone(value)); } },
        "@api/Commands": { ApplicationCommandInputType: { BOT: 1 }, ApplicationCommandOptionType: { INTEGER: 1, STRING: 2 }, findOption: (opts, name, fallback) => opts[name] ?? fallback, sendBotMessage() {} },
        "@api/Notifications": { showNotification: options => calls.notifications.push(options) },
        "@api/Badges": { addProfileBadge: b => calls.badge.push(b), removeProfileBadge: b => calls.badge.splice(calls.badge.indexOf(b), 1) },
        "@api/HeaderBar": { HeaderBarButton() {} },
        "@utils/modal": { ModalCloseButton() {}, ModalContent() {}, ModalFooter() {}, ModalHeader() {}, ModalRoot() {}, openModal() {} },
        "@webpack/common": common
    };
    const { outputFiles } = await build({ entryPoints: [`src/equicordplugins/${name}/index.${["quickDelete", "remindMe", "autoReact"].includes(name) ? "ts" : "tsx"}`], bundle: true, write: false, format: "cjs", platform: "node", logLevel: "silent", define: { IS_WEB: "false" }, plugins: [{ name: "mocks", setup(builder) {
        builder.onResolve({ filter: /^@/ }, args => modules[args.path] ? { path: args.path, namespace: "mock" } : undefined);
        builder.onLoad({ filter: /.*/, namespace: "mock" }, args => ({ contents: Object.keys(modules[args.path]).map(key => key === "default" ? `export default __mocks[${JSON.stringify(args.path)}].default;` : `export const ${key}=__mocks[${JSON.stringify(args.path)}][${JSON.stringify(key)}];`).join("\n") }));
        builder.onLoad({ filter: /\.css$/ }, () => ({ contents: "", loader: "js" }));
    } }] });
    const module = { exports: {} };
    const doc = { addEventListener: (key, fn) => documentEvents.set(key, fn), removeEventListener: key => documentEvents.delete(key), hidden: false };
    new Function("module", "exports", "__mocks", "document", outputFiles[0].text)(module, module.exports, modules, doc);
    return { plugin: module.exports.default, calls, data, common, events, documentEvents, realUser };
}

test("QuickDelete ignores repeats, selects last own message and unregisters shortcut", async () => {
    const { plugin, documentEvents, calls } = await loadPlugin("quickDelete");
    plugin.start();
    const handler = documentEvents.get("keydown");
    await handler({ altKey: true, key: "Delete", repeat: true });
    assert.equal(calls.delete.length, 0);
    await handler({ altKey: true, key: "Delete", preventDefault() {} });
    assert.deepEqual(calls.delete, ["/channels/channel/messages/latest"]);
    plugin.stop(); assert.equal(documentEvents.size, 0);
});

test("AutoReact validates malformed rules and deduplicates events and matching rules", async () => {
    const { plugin, events, calls } = await loadPlugin("autoReact");
    plugin.start();
    const handler = events.get("MESSAGE_CREATE");
    plugin.settings.store.rules = '{"keyword":"gg"}';
    handler({ message: { id: "invalid", content: "gg", author: { id: me } } });
    assert.equal(calls.reactions.length, 0);
    plugin.settings.store.rules = JSON.stringify([null, { keyword: 1 }, { keyword: "gg", emoji: "🎉" }, { keyword: "gg", emoji: "🎉" }]);
    const event = { message: { id: "valid", channel_id: "channel", content: "GG", author: { id: me } } };
    handler(event); handler(event);
    assert.equal(calls.reactions.length, 1);
    plugin.stop(); assert.equal(events.size, 0);
});

test("RemindMe persists concurrent reminders, supports long timers, and fires overdue reminders once", async () => {
    const { plugin, data, calls } = await loadPlugin("remindMe");
    const key = `EqyCord_reminders:${me}`;
    data.set(key, [{ id: "due", text: "saved reminder", time: Date.now() - 1000, channelId: "channel" }]);
    await plugin.start();
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(calls.notifications.length, 1);
    assert.deepEqual(data.get(key), []);
    plugin.stop(); await plugin.start();
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(calls.notifications.length, 1);
    await Promise.all([plugin.commands[0].execute({ amount: 30, unit: "d", text: "long timer" }, { channel: { id: "channel" } }), plugin.commands[0].execute({ amount: 1, unit: "m", text: "short timer" }, { channel: { id: "channel" } })]);
    assert.equal(data.get(key).length, 2);
    plugin.stop();
});

test("CustomProfile restores hooks and keeps styled identities out of canonical store updates", async () => {
    const { plugin, data, common, calls, realUser } = await loadPlugin("customProfile");
    const originalGetUser = common.UserStore.getUser;
    data.set("eqycord.customProfiles.v1", { [me]: { enabled: true, shared: false, presets: [], data: { globalName: "Styled", bio: "New bio", badgeFlags: 1, avatar: "https://cdn.discordapp.com/new.png" } } });
    await plugin.start();
    assert.equal(common.UserStore.getUser(me).globalName, "Styled");
    assert.equal(common.UserProfileStore.getUserProfile(me).bio, "New bio");
    assert.equal(common.IconUtils.getUserAvatarURL(realUser), "https://cdn.discordapp.com/new.png");
    assert.equal(realUser.globalName, "Original");
    assert.match(calls.badge[0].getBadges({ userId: me })[0].description, /EqyCord profile style/);
    plugin.stop();
    assert.equal(common.UserStore.getUser, originalGetUser);
    assert.equal(common.UserStore.getUser(me).globalName, "Original");
    assert.equal(calls.badge.length, 0);
    assert.ok(calls.dispatch.every(event => event.user === realUser && event.user.globalName === "Original"));
});

test("CustomProfile applies black and white to global and guild profile themes without changing account privileges", async () => {
    for (const color of [0, 0xffffff]) {
        const original = { bio: "original", themeColors: [123, 456], premiumType: 0 };
        const guild = { bio: "guild bio", themeColors: [789, 123] };
        const cp = await loadPlugin("customProfile", { common: { UserProfileStore: { getUserProfile: () => original, getGuildMemberProfile: () => guild } } });
        const originalGet = cp.common.UserProfileStore.getGuildMemberProfile;
        cp.data.set("eqycord.customProfiles.v1", { [me]: { enabled: true, shared: false, presets: [], data: { accentColor: color, accentColor2: color, nitro: false, badgeFlags: 1 | 2 | 131072 } } });
        await cp.plugin.start();
        const styled = cp.common.UserProfileStore.getUserProfile(me);
        assert.deepEqual(styled.themeColors, [color, color]);
        assert.equal(styled.premiumType, 2);
        assert.deepEqual(cp.common.UserProfileStore.getGuildMemberProfile(me, "guild").themeColors, [color, color]);
        assert.equal(cp.common.UserProfileStore.getGuildMemberProfile(me, "guild").bio, "guild bio");
        assert.equal(cp.common.UserStore.getCurrentUser().premiumType, undefined);
        assert.deepEqual(original.themeColors, [123, 456]);
        assert.deepEqual(guild.themeColors, [789, 123]);
        assert.deepEqual(cp.calls.badge[0].getBadges({ userId: me }).map(b => b.description), ["EqyCord profile style: Discord Staff", "EqyCord profile style: Early Verified Bot Developer"]);
        cp.plugin.stop();
        assert.equal(cp.common.UserProfileStore.getGuildMemberProfile, originalGet);
        assert.deepEqual(cp.common.UserProfileStore.getUserProfile(me).themeColors, [123, 456]);
    }
});

test("FakeTag and CustomProfile can stop in either order without restoring stale appearances", async () => {
    for (const first of ["tag", "profile"]) {
        const cp = await loadPlugin("customProfile");
        const tag = await loadPlugin("fakeTag", { common: cp.common });
        cp.data.set("eqycord.customProfiles.v1", { [me]: { enabled: true, shared: false, presets: [], data: { globalName: "Styled" } } });
        tag.plugin.settings.store.enabled = true;
        tag.plugin.settings.store.tag = "EQY";
        await cp.plugin.start(); await tag.plugin.start();
        assert.equal(cp.common.UserStore.getCurrentUser().globalName, "Styled");
        assert.equal(cp.common.UserStore.getCurrentUser().primaryGuild.tag, "EQY");
        if (first === "tag") { tag.plugin.stop(); cp.plugin.stop(); }
        else { cp.plugin.stop(); tag.plugin.stop(); }
        assert.equal(cp.common.UserStore.getCurrentUser().globalName, "Original");
        assert.equal(cp.common.UserStore.getCurrentUser().primaryGuild, undefined);
        assert.equal(cp.realUser.globalName, "Original");
    }
});
