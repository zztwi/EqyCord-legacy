/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { app } from "electron";

export function sampleMetrics() {
    const processes = app.getAppMetrics();
    return {
        cpuPercent: processes.reduce((sum, entry) => sum + entry.cpu.percentCPUUsage, 0),
        processMemoryMB: processes.reduce((sum, entry) => sum + entry.memory.workingSetSize, 0) / 1024
    };
}
