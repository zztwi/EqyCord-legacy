/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "../tweak/style.css";

import { eqycordBadgeIcons } from "@api/eqycordBadges";
import { refreshCommunityBadges, startCommunityBadges } from "@api/eqycordBadgeService";
import { HeaderBarButton } from "@api/HeaderBar";
import { communityBadgeDefinitions, CommunityBadgeId } from "@shared/eqyCommunityBadges";
import { isDiscordId } from "@shared/eqyCustomProfile";
import { addLeftTool, removeLeftTool } from "@utils/eqyLeftToolbar";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { React, UserStore, useStateFromStores } from "@webpack/common";

import { connectAccount, isConnected, request } from "../customProfile/service";

const owner = "380070146317877249";
function Icon(props: any) { return <svg {...props} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5" /><path d="m8.2 11.3-1.2 9.7 5-3 5 3-1.2-9.7" /></svg>; }
function Panel(props: any) {
    const [id, setId] = React.useState(""), [badge, setBadge] = React.useState<CommunityBadgeId>("contributor"), [busy, setBusy] = React.useState(false), [message, setMessage] = React.useState("");
    const [search, setSearch] = React.useState("");
    const visibleBadges = communityBadgeDefinitions.filter(({ asset, title }) => `${asset} ${title}`.toLowerCase().includes(search.trim().toLowerCase()));
    const selectionVisible = visibleBadges.some(({ asset }) => asset === badge);
    const selectedBadge = communityBadgeDefinitions.find(({ asset }) => asset === badge)!;
    const groupName = React.useId();
    async function act(method: "PUT" | "DELETE") {
        if (!selectionVisible || busy) return;
        setBusy(true); setMessage("");
        try {
            if (UserStore.getCurrentUser()?.id !== owner) throw new Error("Owner access required");
            if (!isDiscordId(id.trim())) throw new Error("Enter a valid Discord user ID");
            if (!await isConnected()) await connectAccount();
            await request("/admin/badges", { method, body: JSON.stringify({ userId: id.trim(), badge }) });
            await refreshCommunityBadges();
            setMessage(method === "PUT" ? "Badge assigned. Clients refresh within one minute." : "Badge revoked.");
        } catch (e) { setMessage(e instanceof Error ? e.message : "Could not update badges"); }
        finally { setBusy(false); }
    }
    const Root = ModalRoot as React.ComponentType<any>;
    const Header = ModalHeader as React.ComponentType<any>, Content = ModalContent as React.ComponentType<any>, Close = ModalCloseButton as React.ComponentType<any>;
    const Footer = ModalFooter as React.ComponentType<any>;
    return <Root {...props} size="medium" className="eqy-tweak-panel eqy-badge-panel">
        <Header className="eqy-tweak-header"><span className="eqy-tweak-heading-icon"><Icon /></span><h2>Community badges</h2><span className="eqy-tweak-close"><Close onClick={props.onClose} /></span></Header>
        <Content className="eqy-tweak-content">
            <p className="eqy-tweak-intro">Choose a badge for an EqyCord member. Only your verified Discord account can make changes.</p>
            <label>Discord user ID<input aria-label="Discord user ID" placeholder="Enter the member’s Discord ID" value={id} onChange={e => setId(e.target.value)} maxLength={20} disabled={busy} /></label>
            <label>Search badges<input type="search" aria-label="Search badges" placeholder="Search by badge name" value={search} onChange={e => setSearch(e.target.value)} disabled={busy} /></label>
            <fieldset className="eqy-badge-choices" disabled={busy}>
                <legend>Available badges · {visibleBadges.length}</legend>
                {visibleBadges.map(({ asset, title, hint }) => <label key={asset} className="eqy-badge-choice">
                    <input type="radio" name={groupName} value={asset} checked={badge === asset} onChange={() => setBadge(asset)} />
                    <img className="eqy-badge-choice-image" src={eqycordBadgeIcons[asset]} alt="" />
                    <span><strong>{title}</strong><small>{hint}</small></span>
                    <span className="eqy-badge-choice-check" aria-hidden="true">{badge === asset ? "✓" : ""}</span>
                </label>)}
                {!visibleBadges.length && <p className="eqy-badge-empty" role="status">No badges match your search.</p>}
            </fieldset>
        </Content>
        <Footer className="eqy-badge-footer">
            <div className="eqy-badge-selection"><img src={eqycordBadgeIcons[badge]} alt="" /><span>{selectionVisible ? selectedBadge.title : "Choose a badge from the results"}</span></div>
            <div className="eqy-tweak-actions"><button disabled={busy || !selectionVisible} onClick={() => void act("PUT")}>Assign badge</button><button className="eqy-tweak-secondary" disabled={busy || !selectionVisible} onClick={() => void act("DELETE")}>Revoke badge</button></div>
            {message && <p className="eqy-tweak-status" role="status">{message}</p>}
        </Footer>
    </Root>;
}
function Button() {
    const id = useStateFromStores([UserStore], () => UserStore.getCurrentUser()?.id);
    return id === owner ? <HeaderBarButton icon={Icon} tooltip="Manage community badges" onClick={() => openModal(props => <Panel {...props} />)} /> : null;
}
export default definePlugin({ name: "EqyCordBadgeManager", description: "Owner-only community badge management with previews and search.", authors: [{ name: "0009cx0", id: 380070146317877249n }], enabledByDefault: true,
    start() { startCommunityBadges(); addLeftTool("badges", () => <Button />); }, stop() { removeLeftTool("badges"); }
});



