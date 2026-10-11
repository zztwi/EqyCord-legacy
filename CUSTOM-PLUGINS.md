# Personal plugins

EqyCord uses Vencord's source-build model. The official installer includes the maintained plugin catalog. Personal plugins belong to the user's own build and never become official merely by installing them. Development takes place in the private `zztwi/EqyCord` repository; recipients can obtain the corresponding GPL source as `EqyCord-source.zip` from the public `zztwi/EqyCord-releases` release channel.

Extract a release's source archive to a permanent folder, install Node.js 22 or newer and the pnpm version in package.json, then run `pnpm install --frozen-lockfile`. Create `src/userplugins` and place each plugin either in a single `.ts`/`.tsx` file or in its own folder with an `index.ts`/`index.tsx` entry point. Do not leave empty plugin folders. Use unique plugin names.

```text
src/userplugins/myPlugin.ts
src/userplugins/anotherPlugin/index.tsx
```

Run `pnpm buildStandalone` for desktop or `pnpm buildWeb` for the browser. Personal entries appear under the Community origin and retain their own settings and toggles. `src/userplugins` is ignored by Git, so personal files are not accidentally committed to the maintained catalog. Existing APIs and dependency handling remain available.

On Windows, the source injector can install a build with `pnpm inject -- --branch canary` (also stable or ptb). Close that Discord channel completely first. It refuses to overwrite a different managed project or a foreign modification. If the official EqyCord installer owns the current installation, restore it with that installer before installing your personal source build. Keep the extracted folder: its dist files are needed by the loader. Do not attempt to bypass ownership checks.

Source archives contain no `.git` repository. Their updater is disabled; rebuild manually when adopting a new source release and preserve your userplugins separately. Official native packages use the public release channel. Builds created before this channel migration need the new official installer once. The browser package must be replaced and reopened manually.

Adding a personal plugin does not authorize changes to official releases, accounts, badges or server databases. GPL rights to modify and redistribute covered code remain in place; preserve licensing, copyright notices and corresponding source when distributing a modified build. Upstream reference: https://docs.vencord.dev/installing/custom-plugins/.
