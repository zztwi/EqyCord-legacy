# Hosted workflow status

On 2026-10-11, GitHub's check annotations for the test and EqyCord release workflows reported: “The job was not started because your account is locked due to a billing issue.” Jobs had no executed test steps or downloadable logs. Example: https://github.com/zztwi/EqyCord/actions/runs/38099580021.

This is an account restriction, not a test assertion failure. Repository code cannot resolve GitHub billing. To avoid repeated failed-run emails while the account is locked, the two hosted jobs in this fork are gated by the Actions repository variable `EQYCORD_HOSTED_CI`. They run only when its value is `true`. The general test workflow retains its normal behavior in other repositories. Manual dispatch is available after the gate is enabled. Do not interpret a skipped workflow as a passing hosted test.

Resolve the account's billing restriction in GitHub account settings, then create or update `EQYCORD_HOSTED_CI=true` under repository Settings → Secrets and variables → Actions → Variables. Dispatch test first and inspect its result before dispatching the release workflow. No credentials or payment details belong in source.

Until hosted runners are available, require local `pnpm test`, service TypeScript checks and `pnpm buildWeb` before publishing. The community badge expansion passed all 49 local regression tests, desktop compilation, type/lint/style checks and component preview checks. Service tests use SQLite and mocked OAuth; the component preview uses mocked Discord APIs. These are not hosted-runner results or a live Discord UI test.
