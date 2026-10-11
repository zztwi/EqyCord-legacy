/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

let timer: ReturnType<typeof setTimeout>;
let notice: HTMLDivElement | undefined;

/** In-app warning independent of Discord's changing toast modules. */
export function mediaNotice(message: string, _type?: string) {
    clearTimeout(timer);
    notice?.remove();
    notice = document.createElement("div");
    notice.setAttribute("role", "alert");
    notice.textContent = message;
    Object.assign(notice.style, {
        position: "fixed", bottom: "90px", left: "16px", maxWidth: "360px",
        padding: "14px 18px", borderRadius: "8px", zIndex: "10000",
        background: "var(--background-secondary, #2b2d31)",
        color: "var(--text-normal, #f2f3f5)", fontSize: "14px",
        boxShadow: "0 4px 16px #0006", lineHeight: "1.5"
    });
    document.body.append(notice);
    timer = setTimeout(() => { notice?.remove(); notice = undefined; }, 8000);
}
