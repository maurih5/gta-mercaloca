# Decision: PR #125 "Release: dev → main"

## Decision
**Approve and merge as a merge commit** (not squash, to keep dev history). All three participants (Chair, Pragmatist, Skeptic) converged on this.

## Why
- Release PR bundling 9 already-reviewed PRs (#112, #116–#119, #121–#124); 15 files, +971/−88.
- CI green: site build, Tests, ~150 per-test checks. `selfcheck.js` 134/134 passes locally (Skeptic). PR is mergeable; head=dev so the new "PRs to main must come from dev" rule passes.
- Bank/corralito money paths verified by reading code: `P.bank` is only changed at `game.js:1103` (`floor(bank/2)`, gated by `bank >= CORRALITO_MIN` and `inPlay`) and `shop.js:121` (clamped with `Math.min`). No negative/NaN path; net decode uses `a[29] || 0`.
- Version skew: join handshake rejects mismatched `VERSION` (tested). `VERSION` is `'local'` in `js/constants.js` and is presumably stamped per build by CI (not confirmed). So old-client/new-host mismatch is rejected rather than misparsed, provided that stamping happens.
- Cost of waiting (dev drifting further) exceeds residual risk.

## Options that lost
- **Hold for a full manual/multiplayer playtest before merge:** rejected; each part was reviewed entering dev and a post-merge smoke is cheaper.
- **Squash merge:** rejected; loses per-feature history from dev.
- **Request changes for cleanups (`aplica`, bank leak):** rejected; none are correctness bugs.

## Not verified
- `game.js` (+205) and `renderer.js` (+207) were not read line by line by any participant; coverage relies on selfcheck, which is simulation-level. The net snapshot change and renderer are only smoke-tested.

## Post-merge actions
- Smoke the live site: 2-player online, boliche enter/exit, bank deposit, helicopter (Gaspi). Revert the merge if broken.
- Confirm the release/tag workflow ran on main and that `VERSION` is stamped by the build.
- Tell players to hard-refresh.

## Open follow-ups (separate issues, non-blocking)
- Remove dead `const aplica = true;` in `.github/workflows/build-pr.yml`.
- Send `bank` only for the owning player in `net.js:304` (currently every player's bank goes to all clients; low stakes).
- Document that hotfixes to main must now go via dev (no emergency path); decide if one is needed.
- Check the boliche exit path: `inPlay` now excludes `P.party`, so a failed exit would leave a player immune to cops/AI.
