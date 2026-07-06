# design-sync notes — Anees Health platform

Repo-specific gotchas for future syncs. Read before re-running.

- **This repo is a Next.js APP, not a component package.** The user scoped the sync to **tokens & styles only** (2026-07-04) — no component previews by choice. The converter runs against a shim package at `.design-sync/tokens-pkg/` (`cfg.entry` points at its empty `index.mjs`), which triggers the converter's native tokens-only path.
- **`cfg.buildCmd` (`node .design-sync/build-tokens.mjs`) must run before the converter.** It (1) downloads Plus Jakarta Sans + IBM Plex Sans Arabic woff2s from Google Fonts into `tokens-pkg/fonts/` — skipped when `fonts/fonts.css` exists; delete the dir to refetch — and (2) compiles `tokens-pkg/styles.scss` with the repo's own `sass`, prepending the site's self-hosted Bootstrap (`public/assets/css/bootstrap.min.css`). Fonts + compiled CSS are gitignored; a fresh clone needs one `buildCmd` run (network required for the font fetch).
- **The repo's SCSS uses the Next.js `@/` alias** (e.g. `mixins.scss` does `@use "@/assets/scss/utils/variables"`). Plain sass can't resolve it — `build-tokens.mjs` carries a custom importer mapping `@/` → `src/`. If more aliases appear, extend that importer.
- **`tokens-pkg/styles.scss` copies the design-language subset of `src/styles/globals.scss` verbatim** (resets, body, headings, links, cards, buttons, forms, surfaces, focus rings). App chrome (breadcrumb bar, WhatsApp button, chat launcher, skip-link, reveal animation) is deliberately excluded. **Drift risk:** if globals.scss's base styles change, the copy must be refreshed by hand.
- **"Avenir Next" is an OS-fallback family** in `--font-sans-en`, never shipped by the app either → `cfg.runtimeFontPrefixes`. "Segoe UI" (also in the stack) isn't flagged by validate.
- **Render check runs against system Chrome** — no playwright browser cache on this machine; set `DS_CHROMIUM_PATH="C:\Program Files\Google\Chrome\Application\chrome.exe"` when running validate/resync (playwright npm pkg is installed in `.ds-sync/`). With zero components the check is 0/0 either way.
- **Known validate info lines (triaged, not new):** `tokens: … (3 missing, below threshold)` — Bootstrap-referenced vars it doesn't define itself; non-blocking. `[ZERO_MATCH] … treating as tokens-only DS` — expected, this IS a tokens-only sync.
- **First `resync.mjs` invocation once failed with `skipped: prior_failure` on all steps; the immediate re-run was fully green.** If it recurs, re-run once before debugging.
- **2026-07-04: first upload COMPLETED.** An earlier same-day session built + validated the bundle locally but couldn't upload (DesignSync tool wasn't authorized). A later session (also 2026-07-04) authorized DesignSync and uploaded the tokens-only bundle into the user's existing empty **"Design System"** project — `projectId: ee13b2e2-1db9-44bb-a770-b2dfe518a26c` (owner Mahmoud Darwish), now pinned in `config.json`. 24 content files + sentinel + `_ds_sync.json` anchor written; reconcile found no orphans. Future runs are re-syncs (anchored) — `resync.mjs` with `--remote`.
  - `localDir` for `finalize_plan`/`write_files` must be the **absolute** path to `ds-bundle/` — a relative `./ds-bundle` double-resolved to `...\ds-bundle\ds-bundle` (ENOENT).

## Re-sync risks
- The globals.scss copy in `tokens-pkg/styles.scss` goes stale silently — diff it against `src/styles/globals.scss`'s base sections on every re-sync.
- `tokens-pkg` version pins nothing: tokens come live from `src/assets/scss` at compile time (good), but Bootstrap is read from `public/assets/css/bootstrap.min.css` — if the app upgrades/removes it, the concat in `build-tokens.mjs` breaks or ships a stale base layer.
- Font files are network-fetched (Google Fonts) and gitignored — a refetch may pull newer glyph versions; harmless, but hashes in `_ds_sync.json` will churn.
- Conventions header (`conventions.md`) enumerates token/class names — re-validate them against the fresh `_ds_bundle.css` on every re-sync (grep for `--<name>:` / `.<class>`).
- No Storybook exists anywhere (user confirmed 2026-07-04) — don't re-ask.
