/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface Measurement { frames: number; fps: number; p95: number; longTasks: number | null; heapMB: number | null; cpuPercent?: number | null; processMemoryMB?: number | null; }
export async function measure(signal: AbortSignal, duration = 6000): Promise<Measurement> {
    if (document.hidden) throw new Error("Keep Discord visible during the measurement.");
    const intervals: number[] = [];
    let longTasks: number | null = null;
    let observer: PerformanceObserver | undefined;
    if (PerformanceObserver.supportedEntryTypes.includes("longtask")) {
        longTasks = 0;
        observer = new PerformanceObserver(list => { longTasks! += list.getEntries().length; });
        observer.observe({ type: "longtask", buffered: false });
    }
    try {
        await new Promise<void>((resolve, reject) => {
            const start = performance.now(); let last = start, frame = 0;
            const abort = () => { cancelAnimationFrame(frame); reject(new Error("Measurement cancelled.")); };
            const tick = (now: number) => {
                if (signal.aborted || document.hidden) { signal.removeEventListener("abort", abort); cancelAnimationFrame(frame); reject(new Error("Measurement interrupted. Keep Discord visible.")); return; }
                intervals.push(now - last); last = now;
                if (now - start >= duration) { signal.removeEventListener("abort", abort); resolve(); }
                else frame = requestAnimationFrame(tick);
            };
            signal.addEventListener("abort", abort, { once: true });
            frame = requestAnimationFrame(tick);
        });
        const sorted = intervals.slice().sort((a, b) => a - b);
        const { memory } = (performance as Performance & { memory?: { usedJSHeapSize: number } });
        return { frames: intervals.length, fps: intervals.length * 1000 / intervals.reduce((a, b) => a + b, 0), p95: sorted[Math.floor((sorted.length - 1) * 0.95)], longTasks, heapMB: memory ? memory.usedJSHeapSize / 1048576 : null };
    } finally { observer?.disconnect(); }
}

