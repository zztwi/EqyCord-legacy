# EqyCord Windows setup

Share **EqyCord-Setup.exe**. It contains the tested client build, a private Node.js runtime, the checksum-pinned upstream Vencord patcher CLI, licenses, and matching EqyCord and patcher source archives. It does not contain user settings, account data, tokens, or Discord archives.

## Interface

The selected Phantom mark appears next to EqyCord, on the loading surface, and in the executable/window icon. It uses a transparent background with a thin light outline and includes icon sizes of 16, 24, 32, 48, 64, 128, and 256 pixels.

The English introduction uses EqyCord's brand and Phantom identity. The footer credits EqyCord's creator as `0009cx0` and links to `https://discord.com/users/380070146317877249`, immediately before Licenses & source. That action opens a fixed URL in the default browser; the embedded surface never accepts arbitrary URLs. Original upstream credits, source notices, and licenses are retained.

The top left shows Phantom Edition and a Help link to the EqyCord Discord community at `https://discord.gg/Kexjx2GH3B`. Help opens this fixed invite in the default browser and is also available in the native fallback. Package tests click the actual Help button and check its native bridge action and destination, with external browser launch intercepted during testing.

New desktop users receive the shared starter preset from `src/shared/eqyStarterPreset.json` automatically on their first Discord launch. It is based on the owner's approved custom settings export, including enabled plugins and plugin preferences. The saved screenshare source/thumbnail is omitted and cloud authentication, sync, and sync version are reset. This shareable preset is embedded in the client build; account data and existing personal settings directories are not packaged. An existing `settings.json` (including one from Vencord) is never replaced, and existing QuickCSS is preserved. Preferences stay editable in Settings afterward, and reinstalling does not reset them. Settings use the existing Vencord-compatible desktop data path; the preset does not install a separate Vencord client.

Both loading and installation windows retain square outer corners. The loading screen has a large Phantom mark on the right; Phantom Edition uses bold text. Both screens retain the standard Windows title bar, the Phantom icon and native window controls. The English interface has a translucent installation panel without duplicate window controls inside the page. Its full-window Mesh Drift background is a WebGL shader: five drifting points carry the ground color `#DCDCD8` and accents `#F5C7B8` / `#C9D8F0`, blended by inverse distance. Hashed value noise, six-octave fbm, and a two-level domain warp soften the motion. Pointer intensity rises and relaxes smoothly. There are no simulated browser or device selectors.

Windows' reduced-motion preference renders a single frame. Resizing can redraw that frame; pointer movement does not animate it. The shader pauses when the document is hidden. If WebGL is unavailable or its context is lost, a static CSS surface appears behind the same usable controls. If the entire web surface cannot initialize, the native install/verify/uninstall interface remains available.

The executable embeds Microsoft WebView2 SDK 1.0.2903.40 and a private fixed x64 runtime 154.0.4258.62 from [Microsoft's runtime distribution](https://developer.microsoft.com/en-us/microsoft-edge/webview2/). Both downloads have pinned SHA-256 hashes. No global WebView2 installation or first-launch network download is required. The runtime retains its Microsoft/Chromium notices and bundled third-party license resources; it is not EqyCord-authored code. First launch extracts roughly 700 MB of runtime files under `%LOCALAPPDATA%/EqyCord/setup-ui`, and later launches check their hashes. The standalone EXE is larger because it includes this runtime. Fixed runtime updates require rebuilding and distributing a new setup; the build script pins the tested version explicitly.

Only the embedded local document can send setup actions. External navigation and new windows are blocked, the content policy prohibits network requests, and action/channel inputs are checked by the native controller. No web page can supply arbitrary commands or paths.

## Install

Windows 10/11 x64 with .NET Framework 4.8 and a normal desktop Discord installation is required. Stable, PTB, and Canary are offered subject to compatibility. Microsoft Store and other layouts are not supported.

1. Open EqyCord-Setup.exe and choose Stable, PTB, or Canary.
2. Click Install / Repair EqyCord. The selected client closes automatically, including its background processes. This disconnects any call in that client.
3. The setup applies the change and restarts the selected Discord channel automatically, even if it was initially closed.

The setup attempts a graceful close before terminating remaining processes belonging to the selected installation. Other Discord channels and installations stay open. Paths are checked before stopping processes; if the client cannot be closed, files are not patched. If patching fails after a running client was closed, the setup tries to reopen it and retains the original error. Restart-launcher failures are reported instead of claiming a successful restart.

The setup does not install Node globally and does not require a terminal or administrator rights for normal per-user Discord installations. Files are kept in `%LOCALAPPDATA%/EqyCord/builds/<commit>`. The downloaded setup can be deleted after installation; keep the installed build folder.

Existing client mods are not overwritten. Uninstall them using their own installer first. To update or repair an owned EqyCord installation, click Install / Repair EqyCord; it automatically closes and restarts Discord. The original Discord archive is retained and verified; a failed replacement keeps recovery files. Automatic client updates can invalidate a patch and may require reinstalling.

## Verify and restore

Verify checks the patch, original backup, and installed client files without restarting Discord. Restore closes the selected client, restores the exact original Discord archive, checks its hash, and restarts Discord; it preserves settings and source files. The setup discovers its owned installation from Discord metadata, including an older app directory after Discord updates. Unknown, modified, or foreign patches are refused.

The older Desktop/EqyCord distribution can be verified, migrated or restored only when its exact pinned loader matches and BUILD-UPDATE.json matches the renderer checksum. This records the existing original backup hash during migration; it cannot establish the historical integrity of an unrecorded legacy backup. Foreign or altered legacy loaders are refused. If Discord has already created a newer app directory, restore the older owned version before repairing the current version.

## Distribution and visibility

The Staff and Creator badge assignments are bundled for IDs 380070146317877249 and 1306071807815712828. Clients running this build can display them; older builds and normal Discord do not. No hosted badge service is configured.

The executable is unsigned: Windows may show an unknown-publisher or SmartScreen warning. Do not tell recipients to disable their security software. Distribute the original file and its SHA-256 checksum. No public download page is automatically created by building the executable.

EqyCord is an unofficial mod and may conflict with Discord's Terms. Original Vencord/Equicord source credits and GPL-3.0-or-later notices remain included. Node's license and the patcher's source/license are included separately.

## Build and validation

Build the standalone desktop client, commit the exact source, then run `scripts/eqycord/windows/build.ps1` in PowerShell 7 from the repository. The Windows compiler and private Node runtime are pinned in that script. The embedded payload has a manifest of file hashes; extraction refuses traversal, directory links, or changed existing files.

The `--extract-only <directory>` argument is for package tests and does not patch Discord. Test extraction, bundled-runtime install/verify/uninstall on an isolated fixture, changed-file refusal, and the user interface separately. A passing fixture test does not establish every plugin's runtime compatibility on another machine.

Run `node scripts/eqycord/windows/test-package.mjs <setup.exe>` to check the built package. It uses `--ui-test <report-directory>` to render the actual embedded surface and capture ready, error, success, reduced-motion, and static fallback PNGs. It checks WebGL compilation/rendering, selected-client actions reaching the native bridge, keyboard selection, busy controls, error recovery, pointer smoothing, and the reduced-motion single-frame path. Patching actions are intercepted during this test, so it never modifies a real Discord installation. It separately checks native fallback startup and uses `--extract-only` for fixture extraction/install/verify/uninstall. Review the generated PNGs visually; passing UI tests do not establish real-client installation on every supported channel. Fixture artifacts remain under the ignored `work` directory. `--ui-smoke` is also available for a shorter invisible startup check.

Packaged client updates are now available through Settings > Updater from the checksummed zztwi/EqyCord release channel. Managed build verification metadata is updated along with the payload; original Discord archives and user preferences are retained. See PERFORMANCE-TOOLS.md for Tweak, live profile preview and owner badge administration.
