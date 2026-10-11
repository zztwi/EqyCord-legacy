/* EqyCord contributors, 2026. SPDX-License-Identifier: GPL-3.0-or-later */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
const names = ["patcher.js", "preload.js", "renderer.js", "renderer.css", "vencordDesktopMain.js", "vencordDesktopPreload.js", "vencordDesktopRenderer.js", "vencordDesktopRenderer.css"];
const commit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const files = Object.fromEntries(names.map(name => [name, createHash("sha256").update(readFileSync(`dist/${name}`)).digest("hex")]));
const ancestors = execFileSync("git", ["rev-list", "--max-count=10001", "HEAD"], { encoding: "utf8" }).trim().split("\n").slice(1);
writeFileSync("dist/eqycord-update.json", JSON.stringify({ commit, ancestors, files }, null, 2));
console.log(`EqyCord update manifest: ${commit}`);
