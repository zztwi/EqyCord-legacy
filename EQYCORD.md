# EqyCord

EqyCord is an independent, unofficial Discord client modification. It is not affiliated with Discord, Vencord, or Equicord. Client modifications may conflict with [Discord's Terms](https://discord.com/terms).

## Plugin inventory

EqyCord retains all 185 standard Vencord plugin definitions and retains 199 of the 200 imported Equicord plugin definitions (DiscordDevBanner was retired) from Equicord source commit `51eab49cce4566e51f65f29cc0eaae50efdd48d4`, together with the API modules they require. Five separate EqyCord presence/media plugins and seven imported Endcord utilities are also included; see PLUGIN-TESTING.md for actual compatibility. The imported plugin source has no duplicate plugin names in the retained Vencord inventory.

The plugin origin filter has three choices: **Vencord**, **EqyCord**, and **Community**. Imported Equicord modules are grouped under **EqyCord**. In plugin details, EqyCord-origin entries show the EqyCord profile `0009cx0` (Discord ID `380070146317877249`); Vencord plugin author displays are unchanged. Original copyright notices, source author metadata, and GPL license headers remain in the imported source. User-facing plugin names and descriptions replace the upstream Equicord brand with EqyCord while keeping internal plugin IDs stable.

The earlier prototype translation, search, and voice utility plugins have been removed. A new experimental Ghost voice button is included, with two-account audio verification still required. EqyCord Staff and Creator profile badges are bundled for the two accounts documented in BADGES.md. Standard Vencord plugins remain available. Platform-specific plugin exclusions still apply.

## Settings and backups

EqyCord keeps the existing plugin cards, toggles, dependency handling, and settings controls, and adds the origin filter. Other settings sections keep their EqyCord identity while using the original compatible Vencord APIs.

Backup import/export keeps the Vencord JSON shape: `{ settings: { ... }, quickCss: "..." }`. Import validates the envelope and rejects prototype-related keys while preserving unknown plugin settings for compatibility. A backup contains settings, not plugin code.

Official native builds update from the public `zztwi/EqyCord-releases` channel using checksummed release manifests. Development stays in the private `zztwi/EqyCord` repository. The updater validates source ancestry recorded in the trusted release manifest without accessing private Git history. Personal plugins and source-archive builds disable automatic updates so official releases cannot replace those custom builds. See CUSTOM-PLUGINS.md. Older installations need the public-channel installer once; Web packages are replaced manually.

## Windows install and restore

The distributable EqyCord-Setup.exe supports Stable, PTB, and Canary when the installed client layout is compatible. It includes a private Node.js runtime and stores the client in a permanent per-user build folder; recipients do not need to install Node or retain the download. See WINDOWS-INSTALLER.md for requirements, verification, restoration, and distribution.

The older EqyCord-Windows.cmd developer launcher still requires Node.js 22 or later and its original package folder. The developer injector requires the selected Discord channel to be fully closed. The setup executable closes and restarts that channel automatically for install, repair and restoration. Both refuse foreign modifications and support verified restoration.

## Source and credits

EqyCord is distributed under GPL-3.0-or-later. The Vencord and Equicord source files retain their original copyright notices, authors, license text, and required notices. The complete source and root license are included with the package. EqyCord is not endorsed by either project.
