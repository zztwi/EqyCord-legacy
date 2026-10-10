# Plugin audit — 2026-10-10

Scope: complete generated catalog, static checks, desktop/web builds, automatic tests, provider HTTP probes, and existing Canary logs. Startup is not proof that every feature works. Disabled plugins were not enabled in bulk. CustomProfile was visually tested in a real browser with mocked Discord components. Transmitted audio/video were measured using two real WebRTC peers. No real two-account Discord voice test was performed. The updated Canary startup requested Ghost successfully; this does not prove button interaction or audio behavior.

## Corrected failures

- DiscordDevBanner: removed its unreliable internal-build patches.
- MoreUserTags: restored the missing NicknameIconsAPI from the exact imported Equicord source, retaining its author/license.
- ChannelTabs, IconViewer, Streaks: internal ConcatenatedModules was present on disk but excluded by the runtime loader; its core directory is now included.
- CustomProfile: readable text/controls with modern Discord variables and fallback colors, larger headings, paired identity/image fields, styled file picker and a scrollable body.
- CustomProfile follow-up: inputs now use the same surface/borders as badge selectors. Badges offers all ten original options except Partnered Server Owner and Moderator Programs Alumni; Nitro, boost and Special badges remain separate. Explicit black/white colors also project premium profile styling onto global and guild profiles without changing account privileges or canonical records. Regression coverage verifies both colors, removed badge selections and restoration.
- FreezeCam, FakeLagVoice, VoiceTroll: distinct camera/pause, broken waveform and robot SVGs (set A), adjacent priorities and compact 24px controls. A browser preview verifies independent toggles and no overflow in a 335px panel with mocked native components. Fresh web installs enable the three plugins before capture, with their effects OFF; saved explicit OFF choices remain respected. The real Brave MAIN-world extension passed a local-fixture load test. See WEB-CLIENT.md.
- Profile sharing: real Discord OAuth, authenticated owner write/read, private-field exclusion, replay rejection and session revocation passed against the deployed Cloudflare service.

- Translate+ and MessageTranslate: desktop CSP blocked translate.googleapis.com. Exact Google and optional Toki provider domains now have connection-only permissions.
- Translate+: missing mounted message setter and provider failures now show a toast rather than an unhandled rejection or a false translated message. Requests time out after 15 seconds.
- MessageTranslate: network failures allow retry after 30 seconds; edited message text invalidates the cache. Malformed responses are rejected.
- PingNotifications: removed obsolete channel.isMuted; use UserGuildSettingsStore.
- BadgeAPI: the imported optional donor API is absent in this fork. Skip that source without breaking all standard profile badges.

## Remaining findings and limits

- The fb979988 Canary startup check exposed an omitted imported-native registry: MessageLoggerEnhanced failed at Native.init. The desktop bundler now includes equicordplugins native modules; a built-artifact regression verifies their IPC registration. This fixes the shared cause for imported file/system plugins, but does not establish every plugin's runtime compatibility.

- ShowHiddenChannels: historical no-effect patch warnings. Some features may be incompatible with Canary; no current module capture was available to validate a correction.
- RPC: port 6463 occupied while another Discord instance runs; environment conflict.
- KeyboardSounds audio asset_404 was traced during restart to CSP blocking GitHub sound assets. Both the exact sound repository URL prefix and its raw redirect now have media-only permissions. The sample asset returned HTTP 200 audio/mpeg. Audible playback still requires a manual check.
- Invalid spellchecker locale remains an environment/configuration issue.
- Google classic returned HTTP 200 for ciao; upstream Translate returned HTTP 200 for come stai → How are you. Toki Pona POST returned HTTP 200. These service probes do not establish browser/UI functionality. DeepL and Kagi need credentials and remain untested.
- Ghost modifies only the outgoing voice-state copy; it does not change media-engine flags. Discord audio delivery remains unverified. Server confirmation alone proves neither remote appearance nor audio behavior.
- The earlier Canary app-1.0.1218 loader pointed to Desktop/EqyCord/dist without installer ownership metadata. That legacy loader passes read-only verification; verified legacy migration, owned repair and original-byte restoration pass fixture tests. See WINDOWS-INSTALLER.md for the current migration procedure and limits.

## Manual checks

1. Translate+: select a target language, right-click a foreign-language text message → Translate. Check text beneath the message.
2. MessageTranslate: targetLanguage it; remove excluded language codes you want translated; showOriginal trans-in-subtext. Receive an English message from another account. Own messages are skipped by default.
3. Translate: test separately with Google, sent output English, outgoing translation enabled. Avoid multiple outgoing translators at once.
4. Ghost: restart after enabling, then join a voice channel. The button appears beside native controls with a red slash while inactive. Activate it; a second account must check both flags while you test listening and microphone behavior. Disable it and check restoration. Without confirmation it times out and restores the original flags.

## Catalog

383 registered catalog entries, including 199 retained imports, Ghost, seven Endcord utilities and five new plugins. Internal API modules are registered separately. Origin is a distribution label; source authorship stays intact.

| Plugin | Target | Audit status |
| --- | --- | --- |
| AccountPanelServerProfile | Universal | Registered and statically checked; Discord feature behavior untested |
| AddAttachments | Universal | Registered and statically checked; Discord feature behavior untested |
| AdvancedPermissions | Universal | Registered and statically checked; Discord feature behavior untested |
| AltKrispSwitch | Universal | Registered and statically checked; Discord feature behavior untested |
| AlwaysAnimate | Universal | Registered and statically checked; Discord feature behavior untested |
| AlwaysExpandProfiles | Universal | Registered and statically checked; Discord feature behavior untested |
| AlwaysExpandRoles | Universal | Registered and statically checked; Discord feature behavior untested |
| AlwaysTrust | Universal | Registered and statically checked; Discord feature behavior untested |
| Animalese | Universal | Registered and statically checked; Discord feature behavior untested |
| AnonymiseFileNames | Universal | Registered and statically checked; Discord feature behavior untested |
| AtSomeone | Universal | Registered and statically checked; Discord feature behavior untested |
| AutoDNDWhilePlaying | discordDesktop | Registered and statically checked; Discord feature behavior untested |
| AutoJumpToMessage | Universal | Registered and statically checked; Discord feature behavior untested |
| AutoReact | Universal | Registered and statically checked; Discord feature behavior untested |
| AutoZipper | Universal | Registered and statically checked; Discord feature behavior untested |
| BannersEverywhere | Universal | Registered and statically checked; Discord feature behavior untested |
| BetterActivities | Universal | Registered and statically checked; Discord feature behavior untested |
| BetterAudioPlayer | Universal | Registered and statically checked; Discord feature behavior untested |
| BetterBanReasons | Universal | Registered and statically checked; Discord feature behavior untested |
| BetterBlockedUsers | Universal | Registered and statically checked; Discord feature behavior untested |
| BetterCommands | Universal | Registered and statically checked; Discord feature behavior untested |
| BetterFolders | Universal | Registered and statically checked; Discord feature behavior untested |
| BetterForwards | Universal | Registered and statically checked; Discord feature behavior untested |
| BetterGifAltText | Universal | Registered and statically checked; Discord feature behavior untested |
| BetterGifPicker | Universal | Registered and statically checked; Discord feature behavior untested |
| BetterImageEditor | Universal | Registered and statically checked; Discord feature behavior untested |
| BetterInvites | Universal | Registered and statically checked; Discord feature behavior untested |
| BetterPlusReacts | Universal | Registered and statically checked; Discord feature behavior untested |
| BetterRoleContext | Universal | Registered and statically checked; Discord feature behavior untested |
| BetterRoleDot | Universal | Registered and statically checked; Discord feature behavior untested |
| BetterSessions | Universal | Registered and statically checked; Discord feature behavior untested |
| BetterSettings | Universal | Registered and statically checked; Discord feature behavior untested |
| BetterUploadButton | Universal | Registered and statically checked; Discord feature behavior untested |
| BiggerStreamPreview | Universal | Registered and statically checked; Discord feature behavior untested |
| BlockKeywords | Universal | Registered and statically checked; Discord feature behavior untested |
| BlockKrisp | Universal | Registered and statically checked; Discord feature behavior untested |
| BlurNSFW | Universal | Registered and statically checked; Discord feature behavior untested |
| BypassPinPrompt | Universal | Registered and statically checked; Discord feature behavior untested |
| BypassStatus | Universal | Registered and statically checked; Discord feature behavior untested |
| CallTimer | Universal | Registered and statically checked; Discord feature behavior untested |
| CancelFriendRequest | Universal | Registered and statically checked; Discord feature behavior untested |
| ChannelBadges | Universal | Registered and statically checked; Discord feature behavior untested |
| ChannelTabs | Universal | Registered and statically checked; Discord feature behavior untested |
| CharacterCounter | Universal | Registered and statically checked; Discord feature behavior untested |
| CleanChannelName | Universal | Registered and statically checked; Discord feature behavior untested |
| CleanerChannelGroups | Universal | Registered and statically checked; Discord feature behavior untested |
| ClearURLs | Universal | Registered and statically checked; Discord feature behavior untested |
| ClickableRoles | Universal | Registered and statically checked; Discord feature behavior untested |
| ClientSideBlock | Universal | Registered and statically checked; Discord feature behavior untested |
| ClientTheme | Universal | Registered and statically checked; Discord feature behavior untested |
| ClipsEnhancements | discordDesktop | Registered and statically checked; Discord feature behavior untested |
| ClipUpload | desktop | Registered and statically checked; Discord feature behavior untested |
| CollapsibleUI | Universal | Registered and statically checked; Discord feature behavior untested |
| ColorSighted | Universal | Registered and statically checked; Discord feature behavior untested |
| CommandPalette | Universal | Registered and statically checked; Discord feature behavior untested |
| ConcatenatedComponentExtractor | Universal | Registered and statically checked; Discord feature behavior untested |
| ConsoleJanitor | Universal | Registered and statically checked; Discord feature behavior untested |
| ConsoleShortcuts | Universal | Registered and statically checked; Discord feature behavior untested |
| ContentWarning | Universal | Registered and statically checked; Discord feature behavior untested |
| CopyEmojiMarkdown | Universal | Registered and statically checked; Discord feature behavior untested |
| CopyFileContents | Universal | Registered and statically checked; Discord feature behavior untested |
| CopyProfileColors | Universal | Registered and statically checked; Discord feature behavior untested |
| CopyStatusUrls | Universal | Registered and statically checked; Discord feature behavior untested |
| CopyStickerLinks | Universal | Registered and statically checked; Discord feature behavior untested |
| CopyUserMention | Universal | Registered and statically checked; Discord feature behavior untested |
| CopyUserURLs | Universal | Registered and statically checked; Discord feature behavior untested |
| CrashHandler | Universal | Registered and statically checked; Discord feature behavior untested |
| CursorBuddy | Universal | Registered and statically checked; Discord feature behavior untested |
| CustomCommands | Universal | Registered and statically checked; Discord feature behavior untested |
| CustomFolderIcons | Universal | Registered and statically checked; Discord feature behavior untested |
| CustomIdle | Universal | Registered and statically checked; Discord feature behavior untested |
| CustomProfile | Universal | Browser editor and live authenticated API tests pass; two-client rendering untested |
| CustomRPC | Universal | Registered and statically checked; Discord feature behavior untested |
| CustomSounds | Universal | Registered and statically checked; Discord feature behavior untested |
| CustomStatusTimeouts | Universal | Registered and statically checked; Discord feature behavior untested |
| CustomTimestamps | Universal | Registered and statically checked; Discord feature behavior untested |
| CustomUserColors | Universal | Registered and statically checked; Discord feature behavior untested |
| Dearrow | Universal | Registered and statically checked; Discord feature behavior untested |
| Declutter | Universal | Registered and statically checked; Discord feature behavior untested |
| DecodeBase64 | Universal | Registered and statically checked; Discord feature behavior untested |
| Decor | Universal | Registered and statically checked; Discord feature behavior untested |
| DevCompanion | dev | Registered and statically checked; Discord feature behavior untested |
| DisableCallIdle | Universal | Registered and statically checked; Discord feature behavior untested |
| DisableCameras | Universal | Registered and statically checked; Discord feature behavior untested |
| DisableDeepLinks | web | Registered and statically checked; Discord feature behavior untested |
| DontRoundMyTimestamps | Universal | Registered and statically checked; Discord feature behavior untested |
| DownloadAllAttachments | Universal | Registered and statically checked; Discord feature behavior untested |
| DragFavoriteEmotes | Universal | Registered and statically checked; Discord feature behavior untested |
| Dragify | Universal | Registered and statically checked; Discord feature behavior untested |
| ElementHighlighter | dev | Registered and statically checked; Discord feature behavior untested |
| EquibopStreamFixes | equibop | Registered and statically checked; Discord feature behavior untested |
| EquicordHelper | Universal | Registered and statically checked; Discord feature behavior untested |
| EquicordToolbox | Universal | Registered and statically checked; Discord feature behavior untested |
| Equissant | Universal | Registered and statically checked; Discord feature behavior untested |
| ExitSounds | Universal | Registered and statically checked; Discord feature behavior untested |
| Experiments | Universal | Registered and statically checked; Discord feature behavior untested |
| ExportMessages | Universal | Registered and statically checked; Discord feature behavior untested |
| ExpressionCloner | Universal | Registered and statically checked; Discord feature behavior untested |
| F8Break | Universal | Registered and statically checked; Discord feature behavior untested |
| FakeConnections | Universal | Registered and statically checked; Discord feature behavior untested |
| FakeLagVoice | Universal | Outgoing WebRTC receiver tests pass; native Canary unsupported; Discord call untested |
| FakeNitro | Universal | Registered and statically checked; Discord feature behavior untested |
| FakePlaying | Universal | Lifecycle/rate tests pass; remote Discord visibility untested |
| FakeProfileThemes | Universal | Registered and statically checked; Discord feature behavior untested |
| FakeTag | Universal | Registered and statically checked; Discord feature behavior untested |
| FastDeleteChannels | Universal | Registered and statically checked; Discord feature behavior untested |
| FavoriteEmojiFirst | Universal | Registered and statically checked; Discord feature behavior untested |
| FavouriteAnything | Universal | Registered and statically checked; Discord feature behavior untested |
| FileUpload | Universal | Registered and statically checked; Discord feature behavior untested |
| FindReply | Universal | Registered and statically checked; Discord feature behavior untested |
| FixCodeblockGap | Universal | Registered and statically checked; Discord feature behavior untested |
| FixDiscordCss | Universal | Registered and statically checked; Discord feature behavior untested |
| FixFileExtensions | Universal | Registered and statically checked; Discord feature behavior untested |
| FixImagesQuality | Universal | Registered and statically checked; Discord feature behavior untested |
| FixSpotifyEmbeds | desktop | Registered and statically checked; Discord feature behavior untested |
| FixYoutubeEmbeds | desktop | Registered and statically checked; Discord feature behavior untested |
| FollowVoiceUser | Universal | Registered and statically checked; Discord feature behavior untested |
| FontLoader | Universal | Registered and statically checked; Discord feature behavior untested |
| ForceOwnerCrown | Universal | Registered and statically checked; Discord feature behavior untested |
| FreezeCam | Universal | Outgoing WebRTC receiver tests pass; native Canary unsupported; Discord call untested |
| FrequentQuickSwitcher | Universal | Registered and statically checked; Discord feature behavior untested |
| FriendCodes | Universal | Registered and statically checked; Discord feature behavior untested |
| FriendInvites | Universal | Registered and statically checked; Discord feature behavior untested |
| FriendshipRanks | Universal | Registered and statically checked; Discord feature behavior untested |
| FriendTags | Universal | Registered and statically checked; Discord feature behavior untested |
| FullSearchContext | Universal | Registered and statically checked; Discord feature behavior untested |
| FullUserInChatbox | Universal | Registered and statically checked; Discord feature behavior untested |
| FullVCPFP | Universal | Registered and statically checked; Discord feature behavior untested |
| GameActivityToggle | Universal | Registered and statically checked; Discord feature behavior untested |
| Ghost | Universal | Registered and statically checked; Discord feature behavior untested |
| Ghosted | Universal | Registered and statically checked; Discord feature behavior untested |
| GhostTyping | Universal | Lifecycle/rate tests pass; remote Discord visibility untested |
| GifCollections | Universal | Registered and statically checked; Discord feature behavior untested |
| GifMaker | Universal | Registered and statically checked; Discord feature behavior untested |
| GifPaste | Universal | Registered and statically checked; Discord feature behavior untested |
| GifProviderSwitcher | Universal | Registered and statically checked; Discord feature behavior untested |
| GitHubRepos | Universal | Registered and statically checked; Discord feature behavior untested |
| GlobalBadges | Universal | Registered and statically checked; Discord feature behavior untested |
| GoogleThat | Universal | Registered and statically checked; Discord feature behavior untested |
| GreetStickerPicker | Universal | Registered and statically checked; Discord feature behavior untested |
| GuildPickerDumper | Universal | Registered and statically checked; Discord feature behavior untested |
| HideChatButtons | Universal | Registered and statically checked; Discord feature behavior untested |
| HideMedia | Universal | Registered and statically checked; Discord feature behavior untested |
| HideMessages | Universal | Registered and statically checked; Discord feature behavior untested |
| HideServers | Universal | Registered and statically checked; Discord feature behavior untested |
| HomeTyping | Universal | Registered and statically checked; Discord feature behavior untested |
| HopOn | Universal | Registered and statically checked; Discord feature behavior untested |
| Husk | Universal | Registered and statically checked; Discord feature behavior untested |
| IconViewer | Universal | Registered and statically checked; Discord feature behavior untested |
| IdleAutoRestart | Universal | Registered and statically checked; Discord feature behavior untested |
| IgnoreActivities | Universal | Registered and statically checked; Discord feature behavior untested |
| IgnoreCalls | Universal | Registered and statically checked; Discord feature behavior untested |
| iLoveSpam | Universal | Registered and statically checked; Discord feature behavior untested |
| ImageFilename | Universal | Registered and statically checked; Discord feature behavior untested |
| ImageLink | Universal | Registered and statically checked; Discord feature behavior untested |
| ImageZoom | Universal | Registered and statically checked; Discord feature behavior untested |
| ImplicitRelationships | Universal | Registered and statically checked; Discord feature behavior untested |
| Ingtoninator | Universal | Registered and statically checked; Discord feature behavior untested |
| InRole | Universal | Registered and statically checked; Discord feature behavior untested |
| InstantScreenshare | Universal | Registered and statically checked; Discord feature behavior untested |
| InvisibleChat | desktop | Registered and statically checked; Discord feature behavior untested |
| InviteDefaults | Universal | Registered and statically checked; Discord feature behavior untested |
| IrcColors | Universal | Registered and statically checked; Discord feature behavior untested |
| IRememberYou | Universal | Registered and statically checked; Discord feature behavior untested |
| JumpTo | Universal | Registered and statically checked; Discord feature behavior untested |
| KeepCurrentChannel | Universal | Registered and statically checked; Discord feature behavior untested |
| KeyboardNavigation | Universal | Registered and statically checked; Discord feature behavior untested |
| KeyboardSounds | Universal | Registered and statically checked; Discord feature behavior untested |
| KeywordNotify | Universal | Registered and statically checked; Discord feature behavior untested |
| LastActive | Universal | Registered and statically checked; Discord feature behavior untested |
| LimitlessScreenshare | Universal | Registered and statically checked; Discord feature behavior untested |
| LoadingQuotes | Universal | Registered and statically checked; Discord feature behavior untested |
| LoginWithQR | Universal | Registered and statically checked; Discord feature behavior untested |
| MarkdownTables | Universal | Registered and statically checked; Discord feature behavior untested |
| MediaPlaybackSpeed | Universal | Registered and statically checked; Discord feature behavior untested |
| MemberCount | Universal | Registered and statically checked; Discord feature behavior untested |
| MentionAvatars | Universal | Registered and statically checked; Discord feature behavior untested |
| MessageBurst | Universal | Registered and statically checked; Discord feature behavior untested |
| MessageClickActions | Universal | Registered and statically checked; Discord feature behavior untested |
| MessageColors | Universal | Registered and statically checked; Discord feature behavior untested |
| MessageFetchTimer | Universal | Registered and statically checked; Discord feature behavior untested |
| MessageLatency | Universal | Registered and statically checked; Discord feature behavior untested |
| MessageLinkEmbeds | Universal | Registered and statically checked; Discord feature behavior untested |
| MessageLinkTooltip | Universal | Registered and statically checked; Discord feature behavior untested |
| MessageLogger | Universal | Registered and statically checked; Discord feature behavior untested |
| MessageLoggerEnhanced | Universal | Registered and statically checked; Discord feature behavior untested |
| MessageNotifier | Universal | Registered and statically checked; Discord feature behavior untested |
| MessagePeek | Universal | Registered and statically checked; Discord feature behavior untested |
| MessageTranslate | Universal | Registered and statically checked; Discord feature behavior untested |
| MicLoopbackTester | Universal | Registered and statically checked; Discord feature behavior untested |
| MiddleClickTweaks | Universal | Registered and statically checked; Discord feature behavior untested |
| MoreCommands | Universal | Registered and statically checked; Discord feature behavior untested |
| MoreQuickReactions | Universal | Registered and statically checked; Discord feature behavior untested |
| MoreStickers | Universal | Registered and statically checked; Discord feature behavior untested |
| MoreUserTags | Universal | Registered and statically checked; Discord feature behavior untested |
| Moyai | Universal | Registered and statically checked; Discord feature behavior untested |
| MusicControls | Universal | Registered and statically checked; Discord feature behavior untested |
| MusicRichPresence | Universal | Registered and statically checked; Discord feature behavior untested |
| MutualGroupDMs | Universal | Registered and statically checked; Discord feature behavior untested |
| NeverPausePreviews | Universal | Registered and statically checked; Discord feature behavior untested |
| NewGuildSettings | Universal | Registered and statically checked; Discord feature behavior untested |
| NewPluginsManager | Universal | Registered and statically checked; Discord feature behavior untested |
| NoBlockedMessages | Universal | Registered and statically checked; Discord feature behavior untested |
| NoDevtoolsWarning | Universal | Registered and statically checked; Discord feature behavior untested |
| NoF1 | Universal | Registered and statically checked; Discord feature behavior untested |
| NoMaskedUrlPaste | Universal | Registered and statically checked; Discord feature behavior untested |
| NoMiddleClickPaste | Universal | Registered and statically checked; Discord feature behavior untested |
| NoMosaic | Universal | Registered and statically checked; Discord feature behavior untested |
| NoNitroUpsell | Universal | Registered and statically checked; Discord feature behavior untested |
| NoOnboardingDelay | Universal | Registered and statically checked; Discord feature behavior untested |
| NoPendingCount | Universal | Registered and statically checked; Discord feature behavior untested |
| NoProfileThemes | Universal | Registered and statically checked; Discord feature behavior untested |
| NoPushToTalk | Universal | Registered and statically checked; Discord feature behavior untested |
| NoReplyMention | Universal | Registered and statically checked; Discord feature behavior untested |
| NormalizeMessageLinks | Universal | Registered and statically checked; Discord feature behavior untested |
| NoRoleHeaders | Universal | Registered and statically checked; Discord feature behavior untested |
| NoRPC | discordDesktop | Registered and statically checked; Discord feature behavior untested |
| NoServerEmojis | Universal | Registered and statically checked; Discord feature behavior untested |
| NoSystemBadge | discordDesktop | Registered and statically checked; Discord feature behavior untested |
| NotificationTitle | discordDesktop | Registered and statically checked; Discord feature behavior untested |
| NotificationVolume | Universal | Registered and statically checked; Discord feature behavior untested |
| NoTrack | Universal | Registered and statically checked; Discord feature behavior untested |
| NoTypingAnimation | Universal | Registered and statically checked; Discord feature behavior untested |
| NoUnblockToJump | Universal | Registered and statically checked; Discord feature behavior untested |
| oneko | Universal | Registered and statically checked; Discord feature behavior untested |
| OnePingPerDM | Universal | Registered and statically checked; Discord feature behavior untested |
| OpenInApp | Universal | Registered and statically checked; Discord feature behavior untested |
| OrbolayBridge | Universal | Registered and statically checked; Discord feature behavior untested |
| OverrideForumDefaults | Universal | Registered and statically checked; Discord feature behavior untested |
| PartyMode | Universal | Registered and statically checked; Discord feature behavior untested |
| PauseInvitesForever | Universal | Registered and statically checked; Discord feature behavior untested |
| PermissionFreeWill | Universal | Registered and statically checked; Discord feature behavior untested |
| PermissionsViewer | Universal | Registered and statically checked; Discord feature behavior untested |
| petpet | Universal | Registered and statically checked; Discord feature behavior untested |
| PictureInPicture | Universal | Registered and statically checked; Discord feature behavior untested |
| PinDMs | Universal | Registered and statically checked; Discord feature behavior untested |
| PingNotifications | Universal | Registered and statically checked; Discord feature behavior untested |
| PinIcon | Universal | Registered and statically checked; Discord feature behavior untested |
| PlainFolderIcon | Universal | Registered and statically checked; Discord feature behavior untested |
| PlatformIndicators | Universal | Registered and statically checked; Discord feature behavior untested |
| PlatformSpoofer | Universal | Registered and statically checked; Discord feature behavior untested |
| PolishWording | Universal | Registered and statically checked; Discord feature behavior untested |
| PreviewMessage | Universal | Registered and statically checked; Discord feature behavior untested |
| ProfileSets | Universal | Registered and statically checked; Discord feature behavior untested |
| Questify | Universal | Registered and statically checked; Discord feature behavior untested |
| QuickDelete | Universal | Registered and statically checked; Discord feature behavior untested |
| QuickMention | Universal | Registered and statically checked; Discord feature behavior untested |
| QuickReply | Universal | Registered and statically checked; Discord feature behavior untested |
| QuickThemeSwitcher | discordDesktop | Registered and statically checked; Discord feature behavior untested |
| Quoter | Universal | Registered and statically checked; Discord feature behavior untested |
| RandomVoice | Universal | Registered and statically checked; Discord feature behavior untested |
| ReactErrorDecoder | Universal | Registered and statically checked; Discord feature behavior untested |
| ReactionTimestamps | Universal | Registered and statically checked; Discord feature behavior untested |
| ReadAllNotificationsButton | Universal | Registered and statically checked; Discord feature behavior untested |
| RecentDMSwitcher | Universal | Registered and statically checked; Discord feature behavior untested |
| RelationshipNotifier | Universal | Registered and statically checked; Discord feature behavior untested |
| RemindMe | Universal | Registered and statically checked; Discord feature behavior untested |
| RemixRevived | Universal | Registered and statically checked; Discord feature behavior untested |
| RepeatMessages | Universal | Registered and statically checked; Discord feature behavior untested |
| ReplaceGoogleSearch | Universal | Registered and statically checked; Discord feature behavior untested |
| ReplyPingControl | Universal | Registered and statically checked; Discord feature behavior untested |
| ReplyTimestamp | Universal | Registered and statically checked; Discord feature behavior untested |
| RevealAllSpoilers | Universal | Registered and statically checked; Discord feature behavior untested |
| ReverseImageSearch | Universal | Registered and statically checked; Discord feature behavior untested |
| ReviewDB | Universal | Registered and statically checked; Discord feature behavior untested |
| RichMagnetLinks | Universal | Registered and statically checked; Discord feature behavior untested |
| RichPresence | Universal | Registered and statically checked; Discord feature behavior untested |
| RoleColorEverywhere | Universal | Registered and statically checked; Discord feature behavior untested |
| RPCEditor | Universal | Registered and statically checked; Discord feature behavior untested |
| SaveFavoriteGIFs | Universal | Registered and statically checked; Discord feature behavior untested |
| ScheduledMessages | Universal | Registered and statically checked; Discord feature behavior untested |
| ScreenRecorder | equibop | Registered and statically checked; Discord feature behavior untested |
| SearchFix | Universal | Registered and statically checked; Discord feature behavior untested |
| SecretRingToneEnabler | Universal | Registered and statically checked; Discord feature behavior untested |
| SedEnhanced | Universal | Registered and statically checked; Discord feature behavior untested |
| SekaiStickers | Universal | Registered and statically checked; Discord feature behavior untested |
| SendTimestamps | Universal | Registered and statically checked; Discord feature behavior untested |
| ServerInfo | Universal | Registered and statically checked; Discord feature behavior untested |
| ServerListIndicators | Universal | Registered and statically checked; Discord feature behavior untested |
| ServerSearch | Universal | Registered and statically checked; Discord feature behavior untested |
| Settings | Universal | Registered and statically checked; Discord feature behavior untested |
| ShikiCodeblocks | desktop | Registered and statically checked; Discord feature behavior untested |
| ShowAllMessageButtons | Universal | Registered and statically checked; Discord feature behavior untested |
| ShowBadgesInChat | Universal | Registered and statically checked; Discord feature behavior untested |
| ShowConnections | Universal | Registered and statically checked; Discord feature behavior untested |
| ShowHiddenChannels | Universal | Registered and statically checked; Discord feature behavior untested |
| ShowHiddenThings | Universal | Registered and statically checked; Discord feature behavior untested |
| ShowMessageEmbeds | Universal | Registered and statically checked; Discord feature behavior untested |
| ShowMeYourName | Universal | Registered and statically checked; Discord feature behavior untested |
| ShowResourceChannels | Universal | Registered and statically checked; Discord feature behavior untested |
| ShowRolesInChat | Universal | Registered and statically checked; Discord feature behavior untested |
| ShowSongName | Universal | Registered and statically checked; Discord feature behavior untested |
| ShowTimeoutDuration | Universal | Registered and statically checked; Discord feature behavior untested |
| SidebarChat | Universal | Registered and statically checked; Discord feature behavior untested |
| Signature | Universal | Registered and statically checked; Discord feature behavior untested |
| SilenceUsers | Universal | Registered and statically checked; Discord feature behavior untested |
| SilentMessageToggle | Universal | Registered and statically checked; Discord feature behavior untested |
| SilentTyping | Universal | Registered and statically checked; Discord feature behavior untested |
| SmoothType | Universal | Registered and statically checked; Discord feature behavior untested |
| Snowfall | Universal | Registered and statically checked; Discord feature behavior untested |
| SongLink | desktop | Registered and statically checked; Discord feature behavior untested |
| SongSpotlight | desktop | Registered and statically checked; Discord feature behavior untested |
| SortFriendRequests | Universal | Registered and statically checked; Discord feature behavior untested |
| SplitLargeMessages | Universal | Registered and statically checked; Discord feature behavior untested |
| SpotifyControls | Universal | Registered and statically checked; Discord feature behavior untested |
| SpotifyCrack | Universal | Registered and statically checked; Discord feature behavior untested |
| SpotifyShareCommands | Universal | Registered and statically checked; Discord feature behavior untested |
| StartupTimings | Universal | Registered and statically checked; Discord feature behavior untested |
| StatusPresets | Universal | Registered and statically checked; Discord feature behavior untested |
| StatusWhileActive | desktop | Registered and statically checked; Discord feature behavior untested |
| SteamStatusSync | Universal | Registered and statically checked; Discord feature behavior untested |
| StickerBlocker | Universal | Registered and statically checked; Discord feature behavior untested |
| StickerPaste | Universal | Registered and statically checked; Discord feature behavior untested |
| StopAutoUnread | Universal | Registered and statically checked; Discord feature behavior untested |
| Streaks | Universal | Registered and statically checked; Discord feature behavior untested |
| StreamerModeOnStream | Universal | Registered and statically checked; Discord feature behavior untested |
| StreamingCodecDisabler | Universal | Registered and statically checked; Discord feature behavior untested |
| SuperReactionTweaks | Universal | Registered and statically checked; Discord feature behavior untested |
| SupportHelper | Universal | Registered and statically checked; Discord feature behavior untested |
| TalkInReverse | Universal | Registered and statically checked; Discord feature behavior untested |
| TextReplace | Universal | Registered and statically checked; Discord feature behavior untested |
| ThemeAttributes | Universal | Registered and statically checked; Discord feature behavior untested |
| ThemeLibrary | Universal | Registered and statically checked; Discord feature behavior untested |
| TidalEmbeds | Universal | Registered and statically checked; Discord feature behavior untested |
| Timezones | Universal | Registered and statically checked; Discord feature behavior untested |
| Title | Universal | Registered and statically checked; Discord feature behavior untested |
| ToastNotifications | Universal | Registered and statically checked; Discord feature behavior untested |
| ToggleVideoBind | Universal | Registered and statically checked; Discord feature behavior untested |
| ToneIndicators | Universal | Registered and statically checked; Discord feature behavior untested |
| Translate | Universal | Registered and statically checked; Discord feature behavior untested |
| Translate+ | Universal | Registered and statically checked; Discord feature behavior untested |
| TriviaAI | Universal | Registered and statically checked; Discord feature behavior untested |
| TypingIndicator | Universal | Registered and statically checked; Discord feature behavior untested |
| TypingTweaks | Universal | Registered and statically checked; Discord feature behavior untested |
| Unindent | Universal | Registered and statically checked; Discord feature behavior untested |
| UnitConverter | Universal | Registered and statically checked; Discord feature behavior untested |
| UniversalMention | Universal | Registered and statically checked; Discord feature behavior untested |
| UnlimitedAccounts | Universal | Registered and statically checked; Discord feature behavior untested |
| UnlockedAvatarZoom | Universal | Registered and statically checked; Discord feature behavior untested |
| UnreadCountBadge | Universal | Registered and statically checked; Discord feature behavior untested |
| UnsuppressEmbeds | Universal | Registered and statically checked; Discord feature behavior untested |
| UrlHighlighter | Universal | Registered and statically checked; Discord feature behavior untested |
| UserMessagesPronouns | Universal | Registered and statically checked; Discord feature behavior untested |
| UserPFP | Universal | Registered and statically checked; Discord feature behavior untested |
| UserpluginInstaller | dev | Registered and statically checked; Discord feature behavior untested |
| UserVoiceShow | Universal | Registered and statically checked; Discord feature behavior untested |
| USRBG | Universal | Registered and statically checked; Discord feature behavior untested |
| ValidReply | Universal | Registered and statically checked; Discord feature behavior untested |
| ValidUser | Universal | Registered and statically checked; Discord feature behavior untested |
| VcNarrator | Universal | Registered and statically checked; Discord feature behavior untested |
| VCPanelSettings | Universal | Registered and statically checked; Discord feature behavior untested |
| VencordToolbox | Universal | Registered and statically checked; Discord feature behavior untested |
| ViewIcons | Universal | Registered and statically checked; Discord feature behavior untested |
| ViewRaw | Universal | Registered and statically checked; Discord feature behavior untested |
| VoiceButtons | Universal | Registered and statically checked; Discord feature behavior untested |
| VoiceChannelLog | Universal | Registered and statically checked; Discord feature behavior untested |
| VoiceChatDoubleClick | Universal | Registered and statically checked; Discord feature behavior untested |
| VoiceChatUtilities | Universal | Registered and statically checked; Discord feature behavior untested |
| VoiceDownload | Universal | Registered and statically checked; Discord feature behavior untested |
| VoiceJoinMessages | Universal | Registered and statically checked; Discord feature behavior untested |
| VoiceMessages | Universal | Registered and statically checked; Discord feature behavior untested |
| VoiceMessagesInBackground | Universal | Registered and statically checked; Discord feature behavior untested |
| VoiceMessageTranscriber | desktop | Registered and statically checked; Discord feature behavior untested |
| VoiceRejoin | Universal | Registered and statically checked; Discord feature behavior untested |
| VoiceStats | Universal | Registered and statically checked; Discord feature behavior untested |
| VoiceTroll | Universal | Outgoing WebRTC receiver tests pass; native Canary unsupported; Discord call untested |
| VolumeBooster | Universal | Registered and statically checked; Discord feature behavior untested |
| WaitForSlot | Universal | Registered and statically checked; Discord feature behavior untested |
| WebContextMenus | web | Registered and statically checked; Discord feature behavior untested |
| WebKeybinds | web | Registered and statically checked; Discord feature behavior untested |
| WebpackTarball | Universal | Registered and statically checked; Discord feature behavior untested |
| WebPWA | browser | Registered and statically checked; Discord feature behavior untested |
| WebRichPresence (arRPC) | web | Registered and statically checked; Discord feature behavior untested |
| WebScreenShare | browser | Registered and statically checked; Discord feature behavior untested |
| WebScreenShareFixes | web | Registered and statically checked; Discord feature behavior untested |
| WhitelistedEmojis | Universal | Registered and statically checked; Discord feature behavior untested |
| WhoReacted | Universal | Registered and statically checked; Discord feature behavior untested |
| WhosWatching | Universal | Registered and statically checked; Discord feature behavior untested |
| WigglyText | Universal | Registered and statically checked; Discord feature behavior untested |
| WriteUpperCase | Universal | Registered and statically checked; Discord feature behavior untested |
| XSOverlay | Universal | Registered and statically checked; Discord feature behavior untested |
| YoutubeAdblock | desktop | Registered and statically checked; Discord feature behavior untested |
| ZipPreview | Universal | Registered and statically checked; Discord feature behavior untested |

Web audio graph correction: locally captured microphone inputs are now processed before an application Web Audio graph, so a derived destination track retains voice and lag effects. A direct-track test and a downstream-graph test both measure audio at a real remote WebRTC receiver, including mute and dry restoration after disabling plugins. The old engine fails the graph regression with "Web Audio capture was not detected". A dry bridge remains alive until the original capture ends when an existing downstream graph still consumes it. This is not proof of compatibility with a live Discord call; that check remains required. Browser warnings now describe missing capture without incorrectly identifying the browser as Canary.

Live user test on Web build 88267cd4: another Discord participant heard no voice effect. Web Audio loopback tests do not establish Discord integration. VoiceTroll and FakeLagVoice now expose local capture/processing/sender counters to diagnose this failure; no audio, device names, user IDs or call data are collected. A graph consumer alone is not proof of remote transmission.

Capture lifecycle correction: locally calling MediaStreamTrack.stop() does not dispatch ended. Per-capture stop hooks now close processors and remove stale bridges immediately, preserving the original stop method and leaving unrelated tracks untouched. Regression tests stop and reacquire the microphone repeatedly and verify no retained bridges. Diagnostics now report per-capture sample processing levels and distinguish direct senders from derived Web Audio sender lineage. Lineage is historical provenance, not remote delivery confirmation. The user confirmed both effects ON with increasing processed sample counters, but heard no remote effect; the live Discord integration remains unresolved.

User confirmation: audible VoiceTroll and Extreme FakeLagVoice effects and stop behavior work in their Discord Web call. Initial settings now use full effect intensity; FakeLagVoice uses Extreme. A one-time settings upgrade keeps subsequent customization and saved presets. Ghost defaults ON for fresh profiles and has a compact adjacent user-area button; saved explicit OFF choices remain respected. Native Canary module inspection found no exposed outgoing processed-PCM input in its JavaScript wrapper; native routing remains unsupported and no virtual audio driver was installed.
### Desktop screenshare parity

The browser stream picker is provided by WebScreenShare and does not run on native Canary. The desktop LimitlessScreenshare defaults now include 2160p (4K) and 120fps presets, with the resolution slider capped at 2160p by default. Existing custom preset lists and explicit slider limits are preserved. This exposes requested quality options; actual capture and receiver quality depend on the source, encoder and Discord transport. The updated Canary menus and end-to-end 4K transmission still require a real streaming test.

