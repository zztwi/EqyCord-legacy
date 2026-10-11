/* EqyCord contributors, 2026. SPDX-License-Identifier: GPL-3.0-or-later */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";
import test from "node:test";
import { build } from "esbuild";
import puppeteer from "puppeteer-core";

const executablePath = process.env.EQYCORD_TEST_BROWSER ?? "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe";
for (const downstream of [false, true]) test(`real WebRTC receiver observes media effects and restoration (${downstream ? "Web Audio graph" : "direct track"})`, { skip: !existsSync(executablePath), timeout: 60000 }, async () => {
    const bundled = await build({ entryPoints: ["src/utils/eqyMedia/engine.ts"], bundle: true, write: false, format: "iife", globalName: "EqyMedia", platform: "browser", logLevel: "silent" });
    const script = bundled.outputFiles[0].text;
    const server = createServer((req, res) => {
        res.setHeader("Content-Type", req.url === "/engine.js" ? "text/javascript" : "text/html");
        res.end(req.url === "/engine.js" ? script : '<!doctype html><html><body><script src="/engine.js"></script></body></html>');
    });
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    let browser;
    try {
        // A continuous known signal avoids confusing Chromium's intermittent
        // built-in test microphone with an effect-induced audio gap.
        mkdirSync("work/media-verification", { recursive: true });
        const wav = Buffer.alloc(44 + 48000 * 2);
        wav.write("RIFF"); wav.writeUInt32LE(wav.length - 8, 4); wav.write("WAVEfmt ", 8);
        wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
        wav.writeUInt32LE(48000, 24); wav.writeUInt32LE(96000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
        wav.write("data", 36); wav.writeUInt32LE(96000, 40);
        for (let n = 0; n < 48000; n++) wav.writeInt16LE(Math.round(Math.sin(n * 2 * Math.PI * 440 / 48000) * 13000), 44 + n * 2);
        const audioFile = resolve("work/media-verification/input.wav"); writeFileSync(audioFile, wav);
        browser = await puppeteer.launch({ executablePath, headless: true, args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", `--use-file-for-fake-audio-capture=${audioFile}`, "--autoplay-policy=no-user-gesture-required"] });
        const page = await browser.newPage();
        const errors = []; page.on("pageerror", e => errors.push(e.message));
        await page.goto(`http://127.0.0.1:${server.address().port}`);
        const report = await page.evaluate(async downstream => {
            const media = window.EqyMedia;
            const originalGet = navigator.mediaDevices.getUserMedia;
            const originalAdd = RTCPeerConnection.prototype.addTrack;
            const originalSource = AudioContext.prototype.createMediaStreamSource;
            const originalConnect = AudioNode.prototype.connect;
            const originalDestination = AudioContext.prototype.createMediaStreamDestination;
            media.acquire("FreezeCam"); media.acquire("VoiceTroll"); media.acquire("FakeLagVoice");
            const captured = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: { width: 320, height: 240 } });
            const sourceAudio = captured.getAudioTracks()[0], sourceVideo = captured.getVideoTracks()[0];
            const a = new RTCPeerConnection(), b = new RTCPeerConnection();
            a.onicecandidate = e => { if (e.candidate) void b.addIceCandidate(e.candidate); };
            b.onicecandidate = e => { if (e.candidate) void a.addIceCandidate(e.candidate); };
            const remote = new MediaStream();
            b.ontrack = e => remote.addTrack(e.track);
            const graph = downstream ? new AudioContext() : undefined;
            await graph?.resume();
            const graphDestination = graph?.createMediaStreamDestination();
            const graphInput = graph?.createMediaStreamSource(new MediaStream([sourceAudio]));
            graphInput?.connect(graphDestination);
            const transmittedAudio = graphDestination?.stream.getAudioTracks()[0] ?? sourceAudio;
            if (downstream && !media.hasOutgoing("audio")) throw new Error("Web Audio capture was not detected");
            const audioSender = a.addTrack(transmittedAudio, captured), videoSender = a.addTrack(sourceVideo, captured);
            if ((!downstream && audioSender.track === sourceAudio) || videoSender.track === sourceVideo) throw new Error("Sender did not use processed tracks");
            await a.setLocalDescription(await a.createOffer()); await b.setRemoteDescription(a.localDescription);
            await b.setLocalDescription(await b.createAnswer()); await a.setRemoteDescription(b.localDescription);
            const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
            for (let n = 0; n < 100 && (b.connectionState !== "connected" || remote.getTracks().length < 2); n++) await wait(50);
            if (b.connectionState !== "connected") throw new Error("Loopback peers did not connect");
            const video = document.createElement("video"); video.muted = true; video.srcObject = remote; document.body.append(video); await video.play();
            const canvas = document.createElement("canvas"); canvas.width = 80; canvas.height = 60;
            const ctx = canvas.getContext("2d");
            const pixels = () => { ctx.drawImage(video, 0, 0, 80, 60); return ctx.getImageData(0, 0, 80, 60).data; };
            const difference = (x, y) => x.reduce((sum, v, n) => sum + Math.abs(v - y[n]), 0) / x.length;
            await wait(500); const before = pixels(); await wait(350); const moving = difference(before, pixels());
            await media.freeze(true); await wait(500); const frozen = pixels(); await wait(400); const still = difference(frozen, pixels());
            await media.freeze(false); await wait(500); const resumed = pixels(); await wait(400); const live = difference(resumed, pixels());
            if (!(moving > 0.3 && still < 0.1 && live > 0.3)) throw new Error(`Remote video failed: moving=${moving}, frozen=${still}, resumed=${live}`);
            const image = document.createElement("canvas"); image.width = 40; image.height = 40;
            const imageCtx = image.getContext("2d"); imageCtx.fillStyle = "#00ff00"; imageCtx.fillRect(0, 0, 40, 40);
            await media.freeze(true, image.toDataURL("image/png")); await wait(500);
            const imagePixel = pixels().slice(0, 4);
            if (!(imagePixel[1] > 200 && imagePixel[0] < 30 && imagePixel[2] < 30)) throw new Error("Custom image did not reach the remote receiver");
            const audioCtx = new AudioContext(); await audioCtx.resume();
            const analyser = audioCtx.createAnalyser(); analyser.fftSize = 2048;
            audioCtx.createMediaStreamSource(new MediaStream(remote.getAudioTracks())).connect(analyser);
            const buffer = new Float32Array(analyser.fftSize);
            const rms = async () => { let energy = 0; for (let i = 0; i < 8; i++) { analyser.getFloatTimeDomainData(buffer); energy += buffer.reduce((s, v) => s + v * v, 0) / buffer.length; await wait(40); } return Math.sqrt(energy / 8); };
            const dry = await rms();
            if (dry <= 0.001) throw new Error("Camera freezing affected outgoing audio");
            await media.freeze(false);
            sourceAudio.enabled = false; await wait(500); const muted = await rms();
            sourceAudio.enabled = true; await wait(500);
            if (muted > dry * 0.1) throw new Error("The native microphone-off track flag was not respected");
            const incomingSender = b.addTrack(remote.getAudioTracks()[0], remote);
            if (incomingSender.track !== remote.getAudioTracks()[0]) throw new Error("Incoming audio was intercepted");
            b.removeTrack(incomingSender);
            media.setVoice(() => ({ enabled: true, effect: "robot", intensity: 1, pitch: 0, echo: 0.2, distortion: 0.5 }));
            await wait(500); const robot = await rms();
            if (Math.abs(robot - dry) < dry * 0.05) throw new Error(`Receiver did not hear the robot effect: dry=${dry}, robot=${robot}`);
            const diagnostics = media.diagnostics();
            if (!(diagnostics.captures > 0 && diagnostics.audioBlocks > 0 && diagnostics.effectedBlocks > 0)) throw new Error("Diagnostics failed to observe capture and effect processing");
            if (downstream && diagnostics.microphones[0].derivedGraphSenders !== 1) throw new Error("Derived graph sender lineage was not detected");
            if (diagnostics.microphones[0].processing.effectedBlocks === 0) throw new Error("Capture-level processing counters are missing");
            if (diagnostics.microphones[0].graphInput !== downstream) throw new Error("Diagnostics conflated graph processing and observed senders");
            if (diagnostics.remoteDiscordTransmission !== "Not verified") throw new Error("Diagnostics claimed a Discord call was verified");
            media.setVoice(() => ({ enabled: false }));
            media.setLag(() => ({ enabled: true, effect: "cut", intensity: 1, frequency: 5, duration: 1, delay: 0 }));
            await wait(500); const gaps = await rms();
            media.setLag(() => ({ enabled: false }));
            await wait(500); const restored = await rms();
            if (!(dry > 0.001 && gaps < dry * 0.75 && restored > gaps * 1.25)) throw new Error(`Remote audio failed: dry=${dry}, gaps=${gaps}, restored=${restored}`);
            media.release("FakeLagVoice"); media.release("VoiceTroll"); media.release("FreezeCam");
            for (let n = 0; n < 100 && (audioSender.track !== transmittedAudio || videoSender.track !== sourceVideo); n++) await wait(10);
            if (audioSender.track !== transmittedAudio || videoSender.track !== sourceVideo) throw new Error("Original transmitted tracks were not restored");
            if (AudioNode.prototype.connect !== originalConnect || AudioContext.prototype.createMediaStreamDestination !== originalDestination) throw new Error("Graph tracing hooks were not restored");
            if (AudioContext.prototype.createMediaStreamSource !== originalSource) throw new Error("Web Audio hook was not restored");
            if (navigator.mediaDevices.getUserMedia !== originalGet || RTCPeerConnection.prototype.addTrack !== originalAdd) throw new Error("Hooks were not restored");
            if (sourceAudio.readyState !== "live" || sourceVideo.readyState !== "live") throw new Error("Original capture was stopped");
            if (downstream) { await wait(500); const stoppedEffects = await rms(); if (Math.abs(stoppedEffects - dry) > dry * 0.3) throw new Error("Disabling plugins did not restore dry graph audio"); }
            graphInput?.disconnect(); await graph?.close();
            a.close(); b.close(); captured.getTracks().forEach(t => t.stop()); await audioCtx.close();
            if (media.diagnostics().microphones.length !== 0) throw new Error("Stopped captures leaked audio bridges");
            // A local stop must clean up even though the browser emits no ended event.
            media.acquire("VoiceTroll");
            for (let i = 0; i < 3; i++) {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(track => track.stop());
                if (media.diagnostics().microphones.length !== 0) throw new Error("Repeated microphone tests leaked processors");
            }
            media.release("VoiceTroll");
            return { remoteVideo: { moving, still, live, customImage: true }, remoteAudio: { dry, muted, robot, gaps, restored }, incomingMediaUntouched: true, originalTracksRestored: true, hooksRestored: true, nativeCanaryTested: false, realDiscordCallTested: false, downstreamWebAudio: downstream };
        }, downstream);
        assert.deepEqual(errors, []);
        mkdirSync("work/media-verification", { recursive: true });
        writeFileSync("work/media-verification/results.json", JSON.stringify(report, null, 2));
        console.log("PASS: transmitted media measured at a real WebRTC receiver; this is not a Discord native-call test.");
    } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
});
