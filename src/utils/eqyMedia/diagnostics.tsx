/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React } from "@webpack/common";

import { diagnostics } from "./engine";

export function MediaDiagnostics() {
    const [state, setState] = React.useState(diagnostics);
    const [copied, setCopied] = React.useState(false);
    React.useEffect(() => {
        const timer = setInterval(() => setState(diagnostics()), 1000);
        return () => clearInterval(timer);
    }, []);
    return <div className="eqy-effect-settings">
        <p>Local engine diagnostics. This does not confirm that Discord transmits the effects.</p>
        <pre style={{ whiteSpace: "pre-wrap", color: "var(--text-normal, #eee)", fontSize: 12 }}>{JSON.stringify(state, null, 2)}</pre>
        <button onClick={() => { void navigator.clipboard.writeText(JSON.stringify(diagnostics(), null, 2)).then(() => setCopied(true), () => setCopied(false)); }}>{copied ? "Copied" : "Copy diagnostics"}</button>
    </div>;
}
