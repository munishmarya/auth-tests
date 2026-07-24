# auth-tests

Standalone Playwright suite for the Property Manager app (`auth-server` + `auth-client`). Only a `main` branch — no CI/CD deploy workflow, run on demand against the live test server.

## Config
- `playwright.config.js` — `baseURL: https://testpmsmmarya.duckdns.org`, `testDir: ./tests`. Tests run against the real deployed test server, not a local dev server — make sure app changes are deployed before running specs that exercise them.
- `auth/*.json` — pre-generated storage states (`adminStorage.json`, `tenantStorage.json`, etc.) used via `test.use({ storageState: ... })` per describe block to run as a given role. Regenerate via `capture-auth.js` if credentials/roles change.

## Conventions
- Specs are organized by feature area (`transactions.spec.js`, `units-leases.spec.js`, `visibility-scoping.spec.js`, `reports-detailed.spec.js`, etc.) — add new tests to the matching file/describe block rather than creating a new file per test.
- Test IDs follow a `PREFIX.N` naming scheme per file (e.g. `TX.23`, `RPT.2`, `S.9`, `3.9`) — check the highest existing number in the relevant describe block and continue the sequence.
- Visibility/scoping tests (`visibility-scoping.spec.js`) historically only asserted *absence* of other people's data, sometimes skipping entirely when a collection was empty for that role — this pattern can hide backend regressions (e.g. the migration 013 `?=`/`=` landlord filter bug wouldn't have been caught). Prefer positive, non-skippable assertions ("at least one own record visible") alongside negative ones when adding new scoping tests.
- Server-side validation (dr/cr integrity, etc.) is tested by hitting the PocketBase API directly with `request` + a token pulled from localStorage, not just through the UI — see the `TX.26`-style tests in `transactions.spec.js`.

## Running
- No deploy step in this repo — after `git push`, tests are simply available to run; nothing auto-executes them.
- Full run: standard `npx playwright test`. Confirm the app change is actually live on the test server (see `auth-client/CLAUDE.md` deploy section) before trusting a failing/passing result.
