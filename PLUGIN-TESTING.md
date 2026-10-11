# Testing the imported EqyCord plugins

All seven plugins are available under the EqyCord origin filter. Enable them individually. Existing plugin preferences are not reset. Plugins with patches can require a Discord restart.

| Plugin | Manual check |
| --- | --- |
| QuickDelete | Send a disposable message, press Alt+Delete once, confirm only your latest message in the current chat disappears. Holding the key should not delete multiple messages. Alternate shortcut is Ctrl+Shift+Delete. |
| RemindMe | Use `/remindme` with amount `1`, unit `minutes`, and a test message. Restart before it is due and verify one notification appears. Clicking it opens the original channel. Reminders survive restarts and are scoped to the current account. |
| AutoReact | In plugin settings enter `[{"keyword":"gg","emoji":"🎉"}]`. Receive/send a message containing `gg` in a test channel and check one reaction. Try invalid JSON and confirm Discord does not crash. Reactions are real; the plugin limits rapid bursts. |
| SmoothType | Focus the message editor, type and move the caret. Change delay, easing and color. Disable the plugin while typing: the native caret returns and the custom caret disappears. |
| FakeTag | Enable the tag in plugin settings, choose text and an image, reopen your profile. The tag is local. Disable it and verify normal tag rendering returns. |
| FakeConnections | Add a connection through settings, save, reopen your profile. Confirm the simulated connection displays locally, then remove it. |
| CustomProfile | Open the pencil icon in the header or Open Custom Profile in settings. Change display name, bio and a badge style, Save, reopen your profile. Save/load a preset. Reset and confirm the originals return. Disable the plugin and confirm its hooks/styles disappear. The profile service is deployed: Connect Discord account, then explicitly enable sharing and Save. Check with a second connected EqyCord client; allow up to one minute for cache refresh. |

CustomProfile cosmetic values can overlap with other profile plugins; test it together with FakeTag and FakeProfileThemes. Banner/effect/decoration patches depend on the current Discord build and require a real Canary check; compilation alone does not establish compatibility.

Profile colors apply automatically when either color is explicitly chosen. Test Color 1 and Color 2 as #000000, Save and reopen the global and server profile popouts; repeat with #FFFFFF. Clear both colors and verify the native theme returns. This changes only the profile appearance, not account privileges. The Badges section offers all ten original options except Partnered Server Owner and Moderator Programs Alumni. Other badge categories remain separate.

For the configured browser client, launch EqyCord-Web.cmd from its complete package (Brave required) and sign in yourself. Fresh web installs preload FreezeCam, FakeLagVoice and VoiceTroll with effects OFF. Enable permissions personally when requested, then join a test call and use camera/pause, broken-waveform and robot controls. Browser preferences and OAuth sessions are separate from Canary. See WEB-CLIENT.md.

The profile service setup and two-account sharing test are documented in `services/profile-api/README.md`.

## New presence and media plugins

All five are independent and initially disabled. Settings and preset controls are in English. DiscordDevBanner has been removed because its internal-build patches were unreliable.

| Plugin | Check and actual compatibility |
| --- | --- |
| FakePlaying | Enable the plugin, configure a valid Discord application ID and game text, then enable Publish. With Discord activity visibility enabled, ask a second normal Discord account to check your game/details/timer. Images require asset keys uploaded to that application. Text edits are coalesced at five-second intervals; disabling clears its own activity immediately. Presets do not enable publishing by themselves. Avoid another custom Rich Presence plugin during this test. Remote Discord rendering remains unverified. |
| GhostTyping | Enable the plugin and press the three-dot typing button in a writable chat. Check with another normal Discord client. Press again to stop; no message is sent. Existing indicators expire on Discord's timer, usually within ten seconds. Pulses are bounded to once per nine seconds and stop on channel change, disconnect, logout, expiry or rejected request. Remote Discord visibility remains unverified. |
| FreezeCam | **WebRTC calls only; native Canary webcam is unsupported.** Enable before obtaining camera media in a browser call. Press the media control or Freeze toggle; check the receiver sees the last frame or uploaded image. Unfreeze and disable the plugin; live video returns. Audio is independent. A real two-peer browser test passed for transmitted freeze/unfreeze and restoration. A real Discord call still needs testing. |
| FakeLagVoice | **WebRTC calls only; native Canary microphone is unsupported.** Enable before joining a browser call. Select Light/Medium/Extreme and enable the effect with the media control. Ask the receiver to listen to cuts/delay/glitches. Packet Loss means audio gaps; no network packets are altered. Disabling the effect restores dry samples; disabling the plugin replaces the transmitted track with the original. Real two-peer receiver audio-cut and restoration tests passed. |
| VoiceTroll | **WebRTC calls only; native Canary microphone is unsupported.** Enable before joining a browser call. Choose an effect and intensity, then enable it. Deep/High support semitone changes; Echo and Distorted have their own controls. Save/load a preset, then disable and check original voice. Shares the engine with FakeLagVoice, applying voice before lag. Real DSP tests cover all eight effects; a real two-peer receiver robot-effect test passed. A real Discord call still needs testing. |

The media controls report missing outgoing WebRTC media rather than claiming to process native Canary media. Settings cannot activate an unsupported native microphone/camera. Only locally captured microphone/webcam tracks are eligible: incoming audio and screen shares are never processed. Camera-off and microphone-off controls must remain respected. If a peer refuses track replacement, the bridge remains in dry/live mode until capture ends instead of abruptly silencing a transmitted track.

Native desktop media needs a compatible capture bridge that is not yet implemented. These three plugins are not claimed as functional in native Canary calls. Do not announce desktop support or remote Discord visibility based only on successful compilation.
