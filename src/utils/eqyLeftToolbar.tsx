/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createRoot, React } from "@webpack/common";

const entries = new Map<string, () => React.ReactNode>();
let observer: MutationObserver | undefined;
let host: HTMLSpanElement | undefined;
let root: ReturnType<typeof createRoot> | undefined;
let queued = false;
function mount() {
    queued = false;
    if (!entries.size) return;
    const back = document.querySelector<HTMLElement>('[aria-label="Back"], [aria-label="Go back"], [aria-label="Indietro"], [aria-label="Torna indietro"]');
    const forward = document.querySelector<HTMLElement>('[aria-label="Forward"], [aria-label="Go forward"], [aria-label="Avanti"]');
    const navigation = back?.parentElement;
    if (!navigation || !forward || !navigation.contains(forward)) return;
    if (!host?.isConnected) {
        root?.unmount();
        host = document.createElement("span");
        host.className = "eqy-left-tools";
        host.style.cssText = "display:inline-flex;align-items:center;gap:4px;app-region:no-drag;-webkit-app-region:no-drag";
        navigation.append(host);
        root = createRoot(host);
    }
    root?.render(<>{[...entries].map(([key, Button]) => <React.Fragment key={key}><Button /></React.Fragment>)}</>);
}
export function addLeftTool(id: string, render: () => React.ReactNode) {
    entries.set(id, render);
    if (!observer) {
        observer = new MutationObserver(records => {
            if (host?.isConnected) return;
            if (records.every(record => host?.contains(record.target))) return;
            if (!queued) { queued = true; requestAnimationFrame(mount); }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }
    mount();
}
export function removeLeftTool(id: string) {
    entries.delete(id);
    if (entries.size) mount();
    else { observer?.disconnect(); observer = undefined; root?.unmount(); root = undefined; host?.remove(); host = undefined; }
}
