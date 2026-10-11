/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import "./PluginModal.css";

import { generateId } from "@api/Commands";
import { hasAnyVisibleSettings, isSettingHidden } from "@api/PluginManager";
import { useSettings } from "@api/Settings";
import { BaseText } from "@components/BaseText";
import ErrorBoundary from "@components/ErrorBoundary";
import { debounce } from "@shared/debounce";
import { getPluginDisplayName, getPluginDisplayText, getPluginOrigin } from "@shared/eqyPluginOrigins";
import { gitRemote } from "@shared/vencordUserAgent";
import { EqyCordAuthor, EqyCordAuthors } from "@utils/constants";
import { classNameFactory } from "@utils/css";
import { proxyLazy } from "@utils/lazy";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import { OptionType, Plugin, PluginTag } from "@utils/types";
import { RenderModalProps, User } from "@vencord/discord-types";
import { findCssClassesLazy } from "@webpack";
import { Clickable, FluxDispatcher, Forms, Modal, openModal, React, Text, Tooltip, useEffect, useMemo, UserStore, UserSummaryItem, UserUtils, useState } from "@webpack/common";
import eqyCordAuthorAvatar from "file://./eqycord-author-0009cx0.png?base64";
import { Constructor } from "type-fest";

import gitHash from "~git-hash";
import { PluginMeta } from "~plugins";

import { OptionComponentMap } from "./components";
import { openContributorModal } from "./ContributorModal";
import { FavoriteButton, GithubButton, WebsiteButton } from "./PluginModalButtons";

const cl = classNameFactory("vc-plugin-modal-");

const AvatarStyles = findCssClassesLazy("moreUsers", "avatar", "clickableAvatar");
const UserRecord: Constructor<Partial<User>> = proxyLazy(() => UserStore.getCurrentUser().constructor) as any;

interface PluginModalProps extends RenderModalProps {
    plugin: Plugin;
    onRestartNeeded(key: string): void;
}

function makeDummyUser(user: { username: string; id?: string; avatar?: string; }) {
    const newUser = new UserRecord({
        username: user.username,
        id: user.id ?? generateId(),
        avatar: user.avatar,
        /** To stop discord making unwanted requests... */
        bot: true,
    });

    FluxDispatcher.dispatch({
        type: "USER_UPDATE",
        user: newUser,
    });

    return newUser;
}

function PluginTags({ tags }: { tags: PluginTag[]; }) {
    return (
        <div className={cl("tags")}>
            {tags.map(tag => (
                <div key={tag} className={cl("tag")}>{tag}</div>
            ))}
        </div>
    );
}

export default function PluginModal({ plugin, onRestartNeeded, onClose, transitionState }: PluginModalProps) {
    const pluginSettings = useSettings([`plugins.${plugin.name}.*`]).plugins[plugin.name];
    const hasSettings = hasAnyVisibleSettings(plugin);
    const pluginMeta = PluginMeta[plugin.name];
    const origin = getPluginOrigin(plugin.name, pluginMeta.userPlugin, pluginMeta.folderName);
    const displayAuthors = origin === "EqyCord" ? EqyCordAuthors : plugin.authors;

    // avoid layout shift by showing dummy users while loading users
    const fallbackAuthors = useMemo(() => [makeDummyUser({ username: "Loading...", id: "-1465912127305809920" })], []);
    const [authors, setAuthors] = useState<Partial<User>[]>([]);

    useEffect(() => {
        (async () => {
            for (const user of displayAuthors.slice(0, 6)) {
                try {
                    const author = user.id
                        ? await UserUtils.getUser(String(user.id))
                            .catch(() => makeDummyUser({ username: user.name }))
                        : makeDummyUser({ username: user.name });

                    setAuthors(a => [...a, author]);
                } catch (e) {
                    continue;
                }
            }
        })();
    }, [displayAuthors]);

    function renderSettings() {
        const { settings } = plugin;
        if (!hasSettings || !settings)
            return <Forms.FormText>There are no settings for this plugin.</Forms.FormText>;

        const options = Object.entries(settings.def).map(([key, setting]) => {
            if (setting.type === OptionType.CUSTOM) return null;

            if (isSettingHidden(settings, setting)) return null;

            const displaySetting = origin === "EqyCord" && setting.type !== OptionType.COMPONENT
                ? {
                    ...setting,
                    description: getPluginDisplayText(setting.description, origin),
                    ...(setting.displayName && { displayName: getPluginDisplayText(setting.displayName, origin) }),
                    ...(setting.placeholder && { placeholder: getPluginDisplayText(setting.placeholder, origin) }),
                    ...(setting.type === OptionType.SELECT && {
                        options: setting.options.map(option => ({
                            ...option,
                            label: getPluginDisplayText(option.label, origin)
                        }))
                    })
                }
                : setting;

            function onChange(newValue: any) {
                const option = plugin.settings!.def[key];
                if (!option || option.type === OptionType.CUSTOM) return;

                pluginSettings[key] = newValue;

                if (option.restartNeeded) onRestartNeeded(key);
            }

            const Component = OptionComponentMap[setting.type];
            return (
                <ErrorBoundary noop key={key}>
                    <Component
                        id={key}
                        setting={displaySetting}
                        onChange={debounce(onChange)}
                        pluginSettings={pluginSettings}
                        definedSettings={settings}
                        closePluginSettings={onClose}
                    />
                </ErrorBoundary>
            );
        });

        return (
            <div className="vc-plugins-settings">
                {options}
            </div>
        );
    }

    function renderMoreUsers(_label: string, count: number) {
        const sliceCount = displayAuthors.length - count;
        const sliceStart = displayAuthors.length - sliceCount;
        const sliceEnd = sliceStart + displayAuthors.length - count;

        return (
            <Tooltip text={displayAuthors.slice(sliceStart, sliceEnd).map(u => u.name).join(", ")}>
                {({ onMouseEnter, onMouseLeave }) => (
                    <div
                        className={AvatarStyles.moreUsers}
                        onMouseEnter={onMouseEnter}
                        onMouseLeave={onMouseLeave}
                    >
                        +{sliceCount}
                    </div>
                )}
            </Tooltip>
        );
    }

    return (
        <Modal
            transitionState={transitionState}
            onClose={onClose}
            size="lg"
            title={
                <div className={cl("header")}>
            <BaseText tag="h1" weight="semibold" size="lg">{getPluginDisplayName(plugin.name, origin)}</BaseText>
                    {!pluginMeta.userPlugin && (
                        <div className="vc-settings-modal-links">
                            <FavoriteButton
                                isFavorite={pluginSettings.isFavorite ?? false}
                                onClick={() => pluginSettings.isFavorite = !pluginSettings.isFavorite}
                            />
                            {origin === "Vencord" && <WebsiteButton
                                text="View more info"
                                href={`https://vencord.dev/plugins/${plugin.name}`}
                            />}
                            <GithubButton
                                text="View source code"
                                href={`https://github.com/${gitRemote}/tree/${gitHash}/src/plugins/${pluginMeta.folderName}`}
                            />
                        </div>
                    )}
                </div>
            }
            subtitle={
                <div className={cl("info")}>
                    <div>
                        <Forms.FormText>{getPluginDisplayText(plugin.description, origin)}</Forms.FormText>
                        <Forms.FormText>{origin}{origin !== "Community" && " · GPL-3.0-or-later"}</Forms.FormText>
                        {!!plugin.tags?.length && <PluginTags tags={plugin.tags} />}
                    </div>
                </div>
            }
        >
            <div className={"vc-settings-modal-content"}>
                <section>
                    <Text variant="heading-lg/semibold" className={classes(Margins.top8, Margins.bottom8)}>Authors</Text>
                    <div style={{ width: "fit-content" }}>
                        <ErrorBoundary noop>
                            <UserSummaryItem
                                users={authors.length ? authors : fallbackAuthors}
                                guildId={undefined}
                                renderIcon={false}
                                max={6}
                                showDefaultAvatarsForNullUsers
                                renderMoreUsers={renderMoreUsers}
                                renderUser={(user: User) => (
                                    <Clickable
                                        className={AvatarStyles.clickableAvatar}
                                        onClick={() => openContributorModal(user)}
                                    >
                                        <img
                                            className={AvatarStyles.avatar}
                                            src={user.id === String(EqyCordAuthor.id)
                                                ? `data:image/png;base64,${eqyCordAuthorAvatar}`
                                                : user.getAvatarURL(void 0, 80, true)}
                                            alt={user.username}
                                            title={user.username}
                                        />
                                    </Clickable>
                                )}
                            />
                        </ErrorBoundary>
                    </div>
                </section>

                {!!plugin.settingsAboutComponent && (
                    <div className={Margins.top16}>
                        <section>
                            <ErrorBoundary message="An error occurred while rendering this plugin's custom Info Component">
                                <plugin.settingsAboutComponent />
                            </ErrorBoundary>
                        </section>
                    </div>
                )}

                <section>
                    <Text variant="heading-lg/semibold" className={classes(Margins.top16, Margins.bottom8)}>Settings</Text>
                    {renderSettings()}
                </section>
            </div>
        </Modal>
    );
}

export function openPluginModal(plugin: Plugin, onRestartNeeded?: (pluginName: string, key: string) => void) {
    openModal(modalProps => (
        <PluginModal
            {...modalProps}
            plugin={plugin}
            onRestartNeeded={(key: string) => onRestartNeeded?.(plugin.name, key)}
        />
    ));
}
