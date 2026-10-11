/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { LagEffect, VoiceDSP, VoiceEffect } from "./dsp";

interface Pipe { source: MediaStreamTrack; output: MediaStreamTrack; senders: Set<RTCRtpSender>; metrics?: { blocks: number; effectedBlocks: number; inputRms: number; outputRms: number; }; downstream?: boolean; close(): void; }
const audio = new Map<MediaStreamTrack, Pipe>();
const cameras = new Map<MediaStreamTrack, Pipe>();
const captured = new WeakSet<MediaStreamTrack>();
const graphOrigins = new WeakMap<AudioNode, Set<Pipe>>();
const graphEdges = new WeakMap<AudioNode, Set<AudioNode>>();
const graphSinks = new WeakMap<AudioNode, MediaStreamTrack[]>();
const graphTracks = new WeakMap<MediaStreamTrack, Set<Pipe>>();
const graphSenders = new Map<RTCRtpSender, Set<Pipe>>();
const senderTracks = new Map<RTCRtpSender, MediaStreamTrack>();
function propagate(node: AudioNode, origins: Set<Pipe>, visited = new Set<AudioNode>()) {
    if (visited.has(node)) return;
    visited.add(node);
    const accumulated = graphOrigins.get(node) ?? new Set<Pipe>();
    origins.forEach(pipe => accumulated.add(pipe));
    graphOrigins.set(node, accumulated);
    for (const track of graphSinks.get(node) ?? []) graphTracks.set(track, accumulated);
    for (const next of graphEdges.get(node) ?? []) propagate(next, accumulated, visited);
}
const owners = new Set<string>();
const listeners = new Set<() => void>();
let generation = 0;
let frozen = false;
let image: HTMLImageElement | undefined;
let voice = () => ({ enabled: false } as VoiceEffect);
let lag = () => ({ enabled: false } as LagEffect);
let restore: (() => void)[] = [];
let freezeRevision = 0;
const counters = { captures: 0, audioBlocks: 0, effectedBlocks: 0, graphInputs: 0, senderAttachments: 0, captureFailures: 0 };
let lastFailure = "none";
/** Local counters only: no audio, account identifiers, device names or call data. */
export function diagnostics() {
    return {
        ...counters, lastFailure,
        enabledPlugins: [...owners], voiceEffectOn: !!voice().enabled, lagEffectOn: !!lag().enabled,
        microphones: [...audio.values()].map(pipe => ({
            captureLive: pipe.source.readyState === "live", captureEnabled: pipe.source.enabled,
            outputLive: pipe.output.readyState === "live", graphInput: !!pipe.downstream,
            observedSenders: pipe.senders.size,
            derivedGraphSenders: [...graphSenders.values()].filter(origins => origins.has(pipe)).length,
            processing: pipe.metrics
        })),
        cameras: cameras.size,
        senderTracks: [...senderTracks.values()].map(track => ({ kind: track.kind, live: track.readyState === "live", enabled: track.enabled, processedGraph: !!graphTracks.get(track)?.size })),
        remoteDiscordTransmission: "Not verified"
    };
}
export const subscribe = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener); };
export const snapshot = () => [...audio.values(), ...cameras.values()].filter(p => p.source.readyState === "live" && (p.senders.size || p.downstream)).map(p => p.source.kind).sort().join(",");
const notify = () => listeners.forEach(f => f());
export const hasOutgoing = (kind: string) => snapshot().split(",").includes(kind);
export function setVoice(get: typeof voice) { voice = get; }
export function setLag(get: typeof lag) { lag = get; }
export async function freeze(value: boolean, data?: string) {
    const epoch = ++freezeRevision;
    if (!value) { frozen = false; image = undefined; return; }
    if (value && !hasOutgoing("video")) throw new Error("No browser camera detected. Enable FreezeCam before starting the call, then turn on your camera.");
    if (data) {
        if (!/^data:image\/(png|jpeg|webp);base64,/.test(data) || data.length > 2_000_000) throw new Error("Choose a PNG, JPEG or WebP image smaller than 1 MB");
        const next = new Image(); next.src = data; await next.decode(); if (epoch !== freezeRevision) return; image = next;
    } else { image = undefined; frozen = false; await new Promise(resolve => setTimeout(resolve, 40)); if (epoch !== freezeRevision) return; }
    frozen = value;
}
async function processAudio(source: MediaStreamTrack): Promise<Pipe> {
    const ctx = new AudioContext({ latencyHint: "interactive" });
    await ctx.resume();
    const input = ctx.createMediaStreamSource(new MediaStream([source]));
    // ScriptProcessor is used for compatibility without loading remote worklet code.
    const processor = ctx.createScriptProcessor(2048, 1, 1);
    const output = ctx.createMediaStreamDestination();
    const dsp = new VoiceDSP(ctx.sampleRate);
    const metrics = { blocks: 0, effectedBlocks: 0, inputRms: 0, outputRms: 0 };
    processor.onaudioprocess = event => {
        counters.audioBlocks++; metrics.blocks++;
        const voiceConfig = voice(), lagConfig = lag();
        if (voiceConfig.enabled || lagConfig.enabled) { counters.effectedBlocks++; metrics.effectedBlocks++; }
        const inputSamples = event.inputBuffer.getChannelData(0), outputSamples = event.outputBuffer.getChannelData(0);
        dsp.process(inputSamples, outputSamples, voiceConfig, lagConfig);
        if (metrics.blocks % 8 === 0) {
            metrics.inputRms = Math.sqrt(inputSamples.reduce((sum, sample) => sum + sample * sample, 0) / inputSamples.length);
            metrics.outputRms = Math.sqrt(outputSamples.reduce((sum, sample) => sum + sample * sample, 0) / outputSamples.length);
        }
    };
    input.connect(processor); processor.connect(output);
    const track = output.stream.getAudioTracks()[0];
    let closed = false;
    return { source, output: track, senders: new Set(), metrics, close() { if (closed) return; closed = true; processor.onaudioprocess = null; input.disconnect(); processor.disconnect(); track.stop(); void ctx.close().catch(() => {}); } };
}
async function processCamera(source: MediaStreamTrack): Promise<Pipe> {
    const video = document.createElement("video"); video.muted = true; video.playsInline = true;
    video.srcObject = new MediaStream([source]); await video.play();
    const canvas = document.createElement("canvas");
    const width = video.videoWidth || source.getSettings().width || 640;
    const height = video.videoHeight || source.getSettings().height || 480;
    const scale = Math.min(1, 1280 / width, 720 / height);
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext("2d")!;
    const stream = canvas.captureStream(30);
    const track = stream.getVideoTracks()[0];
    const draw = () => {
        if (!source.enabled || source.muted || source.readyState === "ended") { ctx.fillStyle = "black"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
        else if (frozen && image) ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        else if (!frozen) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    };
    draw(); const timer = setInterval(draw, 1000 / 30);
    let closed = false;
    return { source, output: track, senders: new Set(), close() { if (closed) return; closed = true; clearInterval(timer); video.pause(); video.srcObject = null; track.stop(); } };
}
function registerPipe(pipe: Pipe) {
    const { source } = pipe;
    const map = source.kind === "audio" ? audio : cameras;
    const { close } = pipe;
    const { stop } = source;
    const ownStop = Object.getOwnPropertyDescriptor(source, "stop");
    let closed = false;
    const stopHook = function (this: MediaStreamTrack) {
        try { stop.call(this); } finally { if (this === source) pipe.close(); }
    };
    const ended = () => pipe.close();
    pipe.close = () => {
        if (closed) return;
        closed = true;
        source.removeEventListener("ended", ended);
        if (source.stop === stopHook) {
            if (ownStop) Object.defineProperty(source, "stop", ownStop);
            else Reflect.deleteProperty(source, "stop");
        }
        if (map.get(source) === pipe) map.delete(source);
        close();
        notify();
    };
    // Calling track.stop() does not emit the browser's ended event.
    source.stop = stopHook;
    source.addEventListener("ended", ended, { once: true });
    map.set(source, pipe);
}
function pipeFor(track: MediaStreamTrack) { return audio.get(track) ?? cameras.get(track) ?? [...audio.values(), ...cameras.values()].find(p => p.output === track); }
function attach(sender: RTCRtpSender, track: MediaStreamTrack | null) {
    if (track) { counters.senderAttachments++; senderTracks.set(sender, track); } else senderTracks.delete(sender);
    graphSenders.delete(sender);
    if (track && graphTracks.get(track)?.size) graphSenders.set(sender, graphTracks.get(track)!);
    for (const pipe of [...audio.values(), ...cameras.values()]) pipe.senders.delete(sender);
    if (track) pipeFor(track)?.senders.add(sender);
    notify();
}
export function acquire(owner: string) {
    if (owners.has(owner)) return;
    owners.add(owner);
    if (owners.size !== 1) return;
    const epoch = ++generation;
    const media = navigator.mediaDevices;
    if (!media || typeof RTCPeerConnection === "undefined") return;
    const original = media.getUserMedia;
    const get = async function (this: MediaDevices, constraints: MediaStreamConstraints) {
        const stream = await original.call(this, constraints);
        counters.captures++;
        for (const source of stream.getTracks()) {
            captured.add(source);
            if (epoch !== generation) continue;
            try {
                if (source.kind === "video" && !owners.has("FreezeCam")) continue;
                if (source.kind === "audio" && !owners.has("VoiceTroll") && !owners.has("FakeLagVoice")) continue;
                const pipe = source.kind === "audio" ? await processAudio(source) : await processCamera(source);
                if (epoch !== generation || source.readyState === "ended" || (source.kind === "video" ? !owners.has("FreezeCam") : !owners.has("VoiceTroll") && !owners.has("FakeLagVoice"))) { pipe.close(); continue; }
                registerPipe(pipe);
            } catch (error) { counters.captureFailures++; lastFailure = error instanceof Error ? error.name : "UnknownError"; /* Leave original capture untouched. */ }
        }
        return stream;
    };
    media.getUserMedia = get;
    // Applications can send a Web Audio destination rather than the original
    // capture track. Process the locally captured input before that graph.
    const contextPrototype = AudioContext.prototype;
    const createSource = contextPrototype.createMediaStreamSource;
    const sourceHook = function (this: AudioContext, stream: MediaStream) {
        const tracks = stream.getAudioTracks();
        const pipes = tracks.map(track => captured.has(track) ? pipeFor(track) : undefined);
        const result = createSource.call(this, pipes.some(Boolean)
            ? new MediaStream(tracks.map((track, index) => pipes[index]?.output ?? track))
            : stream);
        for (const pipe of pipes) if (pipe) { pipe.downstream = true; counters.graphInputs++; }
        propagate(result, new Set(pipes.filter((pipe): pipe is Pipe => !!pipe)));
        notify();
        return result;
    };
    contextPrototype.createMediaStreamSource = sourceHook;
    const createDestination = contextPrototype.createMediaStreamDestination;
    const destinationHook = function (this: AudioContext) {
        const result = createDestination.call(this);
        graphSinks.set(result, result.stream.getAudioTracks());
        return result;
    };
    contextPrototype.createMediaStreamDestination = destinationHook;
    const { connect } = AudioNode.prototype;
    const connectHook = function (this: AudioNode, destination: AudioNode | AudioParam, ...args: number[]) {
        const result = Reflect.apply(connect, this, [destination, ...args]);
        if (destination instanceof AudioNode) {
            const edges = graphEdges.get(this) ?? new Set<AudioNode>();
            edges.add(destination); graphEdges.set(this, edges);
            propagate(destination, graphOrigins.get(this) ?? new Set<Pipe>());
        }
        return result;
    } as AudioNode["connect"];
    AudioNode.prototype.connect = connectHook;
    const pc = RTCPeerConnection.prototype;
    const add = pc.addTrack, transceiver = pc.addTransceiver, replace = RTCRtpSender.prototype.replaceTrack, remove = pc.removeTrack, { close } = pc;
    const addHook = function (this: RTCPeerConnection, track: MediaStreamTrack, ...streams: MediaStream[]) {
        const pipe = captured.has(track) ? pipeFor(track) : undefined;
        const sender = add.call(this, pipe?.output ?? track, ...streams); attach(sender, track); return sender;
    };
    const transceiverHook = function (this: RTCPeerConnection, track: MediaStreamTrack | string, init?: RTCRtpTransceiverInit) {
        const pipe = typeof track !== "string" && captured.has(track) ? pipeFor(track) : undefined;
        const result = transceiver.call(this, pipe?.output ?? track, init);
        if (typeof track !== "string") attach(result.sender, track);
        return result;
    };
    const replaceHook = async function (this: RTCRtpSender, track: MediaStreamTrack | null) {
        const pipe = track && captured.has(track) ? pipeFor(track) : undefined;
        await replace.call(this, pipe?.output ?? track); attach(this, track);
    };
    const removeHook = function (this: RTCPeerConnection, sender: RTCRtpSender) { remove.call(this, sender); attach(sender, null); };
    const closeHook = function (this: RTCPeerConnection) { for (const sender of this.getSenders()) attach(sender, null); close.call(this); };
    pc.addTrack = addHook; pc.addTransceiver = transceiverHook; RTCRtpSender.prototype.replaceTrack = replaceHook;
    pc.removeTrack = removeHook; pc.close = closeHook;
    restore = [() => { if (AudioNode.prototype.connect === connectHook) AudioNode.prototype.connect = connect; if (contextPrototype.createMediaStreamDestination === destinationHook) contextPrototype.createMediaStreamDestination = createDestination; }, () => { if (contextPrototype.createMediaStreamSource === sourceHook) contextPrototype.createMediaStreamSource = createSource; }, () => { if (media.getUserMedia === get) media.getUserMedia = original; }, () => { if (pc.addTrack === addHook) pc.addTrack = add; if (pc.addTransceiver === transceiverHook) pc.addTransceiver = transceiver; if (pc.removeTrack === removeHook) pc.removeTrack = remove; if (pc.close === closeHook) pc.close = close; if (RTCRtpSender.prototype.replaceTrack === replaceHook) RTCRtpSender.prototype.replaceTrack = replace; }];
}
export function release(owner: string) {
    owners.delete(owner);
    if (owner === "FreezeCam") { ++freezeRevision; frozen = false; image = undefined; }
    if (owner === "VoiceTroll") setVoice(() => ({ enabled: false } as VoiceEffect));
    if (owner === "FakeLagVoice") setLag(() => ({ enabled: false } as LagEffect));
    const pipes: Pipe[] = [];
    if (!owners.has("VoiceTroll") && !owners.has("FakeLagVoice")) { pipes.push(...audio.values()); audio.clear(); }
    if (!owners.has("FreezeCam")) { pipes.push(...cameras.values()); cameras.clear(); }
    if (!owners.size) { ++generation; restore.forEach(f => f()); restore = []; }
    notify();
    for (const pipe of pipes) void Promise.allSettled([...pipe.senders].map(sender => sender.replaceTrack(pipe.source.readyState === "live" ? pipe.source : null))).then(results => {
        if (pipe.source.readyState === "ended" || (results.every(r => r.status === "fulfilled") && !pipe.downstream)) pipe.close();
        else {
            // Keep a dry bridge for downstream Web Audio consumers or failed
            // renegotiation until the original capture ends, rather
            // than stopping a track that a peer is still transmitting.
            const map = pipe.source.kind === "audio" ? audio : cameras;
            map.set(pipe.source, pipe); notify();
        }
    });
}
