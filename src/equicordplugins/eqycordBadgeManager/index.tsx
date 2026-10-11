/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "../tweak/style.css";

import { refreshCommunityBadges, startCommunityBadges } from "@api/eqycordBadgeService";
import { HeaderBarButton } from "@api/HeaderBar";
import { isDiscordId } from "@shared/eqyCustomProfile";
import { addLeftTool, removeLeftTool } from "@utils/eqyLeftToolbar";
import { ModalCloseButton, ModalContent, ModalHeader, ModalRoot, openModal } from "@utils/modal";
import definePlugin from "@utils/types";
import { React, UserStore, useStateFromStores } from "@webpack/common";

import { connectAccount, isConnected, request } from "../customProfile/service";

const owner = "380070146317877249";
function Icon(props: any) { return <svg {...props} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 2 7 4v6c0 5-7 10-7 10S5 17 5 12V6Z" /><path d="m8 12 3 3 5-6" /></svg>; }
function Panel(props: any) {
    const [id, setId] = React.useState(""), [badge, setBadge] = React.useState("contributor"), [busy, setBusy] = React.useState(false), [message, setMessage] = React.useState("");
    async function act(method: "PUT" | "DELETE") {
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
    return <Root {...props} size="medium" className="eqy-tweak-panel"><Header className="eqy-tweak-header"><span className="eqy-tweak-heading-icon"><Icon /></span><h2>Community badges</h2><span className="eqy-tweak-close"><Close onClick={props.onClose} /></span></Header><Content className="eqy-tweak-content"><p className="eqy-tweak-intro">Assign community badges to EqyCord members. Only your verified Discord account can make changes.</p><section className="eqy-tweak-section"><h3>Badge assignment</h3><label>Discord user ID<input aria-label="Discord user ID" placeholder="Enter the member’s Discord ID" value={id} onChange={e => setId(e.target.value)} maxLength={20} /></label><label>Badge<select aria-label="Badge" value={badge} onChange={e => setBadge(e.target.value)}><option value="contributor">Contributor</option><option value="innovator">Plugin Innovator</option></select></label></section><div className="eqy-tweak-actions"><button disabled={busy} onClick={() => void act("PUT")}>Assign badge</button><button className="eqy-tweak-secondary" disabled={busy} onClick={() => void act("DELETE")}>Revoke badge</button></div>{message && <p className="eqy-tweak-status" role="status">{message}</p>}</Content></Root>;
}
function Button() {
    const id = useStateFromStores([UserStore], () => UserStore.getCurrentUser()?.id);
    return id === owner ? <HeaderBarButton icon={Icon} tooltip="Manage community badges" onClick={() => openModal(props => <Panel {...props} />)} /> : null;
}
export default definePlugin({ name: "EqyCordBadgeManager", description: "Owner-only Contributor and Plugin Innovator badge management.", authors: [{ name: "0009cx0", id: 380070146317877249n }], enabledByDefault: true,
    start() { startCommunityBadges(); addLeftTool("badges", () => <Button />); }, stop() { removeLeftTool("badges"); }
});



