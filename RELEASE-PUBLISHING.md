# Private development, public releases

The maintained source repository is `zztwi/EqyCord` (private). The public `zztwi/EqyCord-releases` repository contains download instructions, the license and releases. Matching GPL source archives remain available to every recipient, including their right to modify and redistribute covered code. Released source is not confidential; unreleased development and repository management remain private. Previously public copies cannot be recalled.

Publication does not require GitHub Actions or a billing payment method. The owner can validate, compile and publish from this Windows PC using existing GitHub authorization. No token is embedded in an installer or source archive. The source repository's automatic jobs stay gated by `EQYCORD_HOSTED_CI` until its account restriction is resolved. Creating the public release repository does not clear that restriction.

Commit the exact source, require a clean working tree and run:

```powershell
pnpm test
pnpm exec tsc -p services/profile-api/tsconfig.json
pnpm buildStandalone
pnpm buildWeb
node scripts/eqycord/release-manifest.mjs
git archive --format=zip --output=dist/EqyCord-source.zip HEAD
./scripts/eqycord/web/package.ps1
./scripts/eqycord/windows/build.ps1
node scripts/eqycord/publish-release.mjs --publish
```

Stop on any failure; do not publish stale artifacts. The publisher checks source identity, update checksums and ancestry, then uploads a draft and publishes only after all assets succeed. A failed upload leaves a draft requiring review before retry. The installer and Web packages are included with their SHA-256 files. Each new version still requires this process; nothing publishes unattended while hosted CI is off.

The public manifest records source ancestor hashes, so native update checks never need access to the private repository or GitHub credentials. It remains trusted through the pinned release repository; SHA-256 checksums detect changed downloads, not compromise of the maintainer's account. The installer retains original archives, ownership verification and rollback. Older builds that pinned the original repository require the new installer once. Web packages are updated manually.

`SOURCE-COMMIT.txt` is substituted by Git archive so recipients can build the source without the private Git history. Archive and personal-plugin builds disable official updates to preserve custom code. See CUSTOM-PLUGINS.md.

After resolving account billing, hosted publication also needs a repository secret `EQYCORD_RELEASE_TOKEN` with contents-write access to the public release repository. The source repository's default GITHUB_TOKEN cannot publish to another repository. No broad credential was saved as that secret during migration; local publication remains the configured path.
