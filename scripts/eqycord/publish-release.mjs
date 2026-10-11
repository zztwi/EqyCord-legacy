/* EqyCord contributors, 2026. SPDX-License-Identifier: GPL-3.0-or-later */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { unzipSync } from "fflate";

const sourceRepo = "zztwi/EqyCord", releaseRepo = "zztwi/EqyCord-releases";
const mode = process.argv[2];
assert(["--prepare", "--publish", "--private-development"].includes(mode), "Use --prepare, --publish or --private-development");
let token = process.env.GH_TOKEN;
if (!token) {
    const result = spawnSync("git", ["credential", "fill"], { input: "protocol=https\nhost=github.com\n\n", encoding: "utf8", windowsHide: true });
    assert.equal(result.status, 0, "GitHub authorization unavailable");
    token = result.stdout.split("\n").find(line => line.startsWith("password="))?.slice(9);
}
assert(token, "GitHub authorization unavailable");
const headers = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "EqyCord-release" };
async function api(path, method = "GET", body) {
    const response = await fetch(`https://api.github.com${path}`, { method, headers: { ...headers, "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw Error(`GitHub API ${response.status}: ${path}`);
    return response.json();
}
const sha = data => createHash("sha256").update(data).digest("hex");
if (mode === "--prepare") {
    const existing = await fetch(`https://api.github.com/repos/${releaseRepo}`, { headers, signal: AbortSignal.timeout(30000) });
    if (existing.status === 404) await api("/user/repos", "POST", { name: "EqyCord-releases", description: "Official EqyCord downloads, checksummed updates and corresponding GPL source archives", private: false, auto_init: true });
    else assert(existing.ok, "Could not inspect release repository");
    const repository = await api(`/repos/${releaseRepo}`);
    assert(repository.permissions?.admin && !repository.private, "Public release repository must be owned by this account");
    const readme = "# EqyCord\n\n[Download the latest release](https://github.com/zztwi/EqyCord-releases/releases/latest).\n\nThis repository contains official downloads and update manifests. Development is maintained separately in a private repository. Each distributed version includes its corresponding GPL-3.0-or-later source in EqyCord-source.zip; recipients may study, modify and redistribute covered code under that license. Vencord, Equicord and imported plugin notices are preserved inside the source and installer.\n\n## Downloads\n\n- EqyCord-Setup.exe: Windows x64 installer for Stable, PTB and Canary.\n- EqyCord-Web.zip: portable browser package; replace and reopen it manually when updating.\n- SHA-256 files: checksums for those downloads.\n- EqyCord-source.zip: matching source, license and custom-plugin instructions. Personal plugins use src/userplugins and a source build.\n\nNative update assets and eqycord-update.json are used by the official client updater. Builds from before the public-channel migration need the new installer once. No GitHub token or payment method is needed by recipients to download public releases.\n\nPublication is performed locally after validation while hosted Actions is unavailable. No future release is published without running the release process.\n\nUnofficial Discord modification; not affiliated with Discord, Vencord or Equicord. [Community](https://discord.gg/Kexjx2GH3B).\n";
    for (const [path, content] of [["README.md", readme], ["LICENSE", readFileSync("LICENSE", "utf8")]]) {
        const response = await fetch(`https://api.github.com/repos/${releaseRepo}/contents/${path}`, { headers });
        const old = response.ok ? await response.json() : undefined;
        if (old && Buffer.from(old.content.replace(/\s/g, ""), "base64").toString() === content) continue;
        await api(`/repos/${releaseRepo}/contents/${path}`, "PUT", { message: `Document EqyCord distribution: ${path}`, content: Buffer.from(content).toString("base64"), ...(old ? { sha: old.sha } : {}) });
    }
    console.log(`Prepared public release repository: https://github.com/${releaseRepo}`);
} else if (mode === "--publish") {
    assert.equal(execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(), "", "Commit exact source before publication");
    const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
    const short = commit.slice(0, 8), tag = `eqycord-${short}`;
    const manifest = JSON.parse(readFileSync("dist/eqycord-update.json", "utf8"));
    assert.equal(manifest.commit, commit);
    const ancestry = execFileSync("git", ["rev-list", "--max-count=10001", "HEAD"], { encoding: "utf8" }).trim().split("\n").slice(1);
    assert.deepEqual(manifest.ancestors, ancestry);
    const source = unzipSync(new Uint8Array(readFileSync("dist/EqyCord-source.zip")), { filter: file => file.name === "SOURCE-COMMIT.txt" });
    assert.equal(Buffer.from(source["SOURCE-COMMIT.txt"]).toString().trim(), commit, "Source archive must match published build");
    const files = Object.keys(manifest.files).map(name => [name, `dist/${name}`]);
    for (const [name, path] of files) assert.equal(sha(readFileSync(path)), manifest.files[name], name);
    files.push(["eqycord-update.json", "dist/eqycord-update.json"], ["EqyCord-source.zip", "dist/EqyCord-source.zip"], ["extension-chrome.zip", "dist/extension-chrome.zip"], ["extension-firefox.zip", "dist/extension-firefox.zip"], ["EqyCord-Setup.exe", `work/windows-setup-${short}/EqyCord-Setup.exe`], ["EqyCord-Web.zip", `work/EqyCord-Web-${short}.zip`]);
    // Read all required packages before creating a draft, then release only after every upload succeeds.
    const uploads = files.map(([name, path]) => ({ name, bytes: readFileSync(path) }));
    for (const name of ["EqyCord-Setup.exe", "EqyCord-Web.zip"]) {
        const asset = uploads.find(item => item.name === name);
        uploads.push({ name: name + ".sha256", bytes: Buffer.from(`${sha(asset.bytes)}  ${name}\n`) });
    }
    const release = await api(`/repos/${releaseRepo}/releases`, "POST", { tag_name: tag, target_commitish: "main", name: `EqyCord ${short}`, body: "Official EqyCord build. Public update channel; corresponding GPL source and SHA-256 checksums included. Personal plugins remain separate from the maintained catalog. Older native builds require this installer once. Locally validated and published without GitHub Actions.", draft: true, prerelease: false });
    for (const asset of uploads) {
        const response = await fetch(release.upload_url.split("{")[0] + "?name=" + encodeURIComponent(asset.name), { method: "POST", headers: { ...headers, "Content-Type": "application/octet-stream" }, body: asset.bytes, signal: AbortSignal.timeout(180000) });
        assert(response.ok, `Asset upload failed: ${asset.name} (${response.status})`);
        console.log(`Uploaded ${asset.name}`);
    }
    const published = await api(`/repos/${releaseRepo}/releases/${release.id}`, "PATCH", { draft: false, make_latest: "true" });
    console.log(`Published ${published.html_url}`);
} else {
    const latest = await api(`/repos/${releaseRepo}/releases/latest`);
    assert(!latest.draft && !latest.prerelease);
    for (const name of ["EqyCord-Setup.exe", "EqyCord-Web.zip", "EqyCord-source.zip", "eqycord-update.json"]) assert(latest.assets.some(asset => asset.name === name), `Missing public asset: ${name}`);
    const source = await api(`/repos/${sourceRepo}`);
    assert(source.permissions?.admin, "Development repository admin permission required");
    if (!source.private) await api(`/repos/${sourceRepo}`, "PATCH", { private: true });
    assert((await api(`/repos/${sourceRepo}`)).private, "Development repository must be private");
    console.log(`Private development verified: ${sourceRepo}; public release: ${latest.html_url}`);
}
