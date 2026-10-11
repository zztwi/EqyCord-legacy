/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface VoiceEffect { enabled: boolean; effect: string; intensity: number; pitch: number; echo: number; distortion: number; }
export interface LagEffect { enabled: boolean; effect: string; intensity: number; frequency: number; duration: number; delay: number; }
export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(v) ? v : min));

/** Bounded per-channel delay memory. No incoming/remote audio is processed. */
export class VoiceDSP {
    private ring: Float32Array;
    private position = 0;
    private count = 0;
    private low = 0;
    private previous = 0;
    private pitchPhase = 0;
    private lagRing: Float32Array;
    private gate = 1;
    constructor(private rate: number) { this.ring = new Float32Array(Math.ceil(rate * 2)); this.lagRing = new Float32Array(this.ring.length); }
    process(input: Float32Array, output: Float32Array, voice: VoiceEffect, lag: LagEffect) {
        const level = clamp(voice.intensity, 0, 1), strength = clamp(lag.intensity, 0, 1);
        for (let i = 0; i < output.length; i++) {
            const dry = input[i] ?? 0;
            const time = this.count++ / this.rate;
            const read = (seconds: number) => this.ring[(this.position - Math.round(seconds * this.rate) + this.ring.length) % this.ring.length];
            let sample = dry;
            if (voice.enabled) {
                const { effect } = voice;
                let wet = dry;
                if (effect === "deep" || effect === "high") {
                    const ratio = Math.pow(2, clamp(voice.pitch || (effect === "deep" ? -5 : 5), -12, 12) / 12);
                    const window = 0.06;
                    this.pitchPhase = (this.pitchPhase + (1 - ratio) / (this.rate * window) + 1) % 1;
                    const phase2 = (this.pitchPhase + 0.5) % 1;
                    const weight = 0.5 - 0.5 * Math.cos(this.pitchPhase * 2 * Math.PI);
                    wet = read(0.01 + this.pitchPhase * window) * weight + read(0.01 + phase2 * window) * (1 - weight);
                } else if (effect === "robot" || effect === "metallic") {
                    wet *= Math.sin(time * 2 * Math.PI * (effect === "robot" ? 38 : 110));
                } else if (effect === "radio" || effect === "megaphone") {
                    this.low += 0.18 * (dry - this.low);
                    wet = this.low - this.previous;
                    this.previous += 0.025 * (this.low - this.previous);
                    wet = Math.tanh(wet * (effect === "megaphone" ? 6 : 2));
                } else if (effect === "echo") wet = dry * 0.7 + read(clamp(voice.echo, 0.04, 0.8)) * 0.3;
                else if (effect === "distorted") wet = Math.tanh(dry * (1 + clamp(voice.distortion, 0, 1) * 18)) * 0.65;
                sample = dry * (1 - level) + wet * level;
            }
            this.lagRing[this.position] = sample;
            if (lag.enabled) {
                const phase = (time * clamp(lag.frequency, 0.1, 5)) % 1;
                const interrupt = phase < Math.min(0.85, clamp(lag.duration, 0.02, 1) * clamp(lag.frequency, 0.1, 5));
                const delayed = this.lagRing[(this.position - Math.round(clamp(lag.delay, 0, 1.5) * this.rate) + this.ring.length) % this.ring.length];
                const loss = interrupt && Math.sin(Math.floor(time * 50) * 127.1 + 311.7) > -0.3;
                const target = ((lag.effect === "cut" && interrupt) || (lag.effect === "loss" && loss)) ? 1 - strength : 1;
                this.gate += Math.min(1, 1 / (this.rate * 0.003)) * (target - this.gate);
                if (lag.effect === "delay") sample = sample * (1 - strength) + delayed * strength;
                else if (lag.effect === "cut" || lag.effect === "loss") sample *= this.gate;
                else if (lag.effect === "robotic") sample = sample * (1 - strength) + Math.round(sample * 16) / 16 * Math.sin(time * 230) * strength;
                else if (lag.effect === "glitch" && interrupt) sample = sample * (1 - strength) + read(0.025) * strength;
            }
            // Preserve exact samples when both effects are off.
            output[i] = voice.enabled || lag.enabled ? clamp(sample, -0.92, 0.92) : dry;
            this.ring[this.position] = dry;
            this.position = (this.position + 1) % this.ring.length;
        }
    }
}
