# DECISIONS LOG

Per docs/09 §2.7 — every change to controls, camera, pixel scale, save schema or target
baseline gets an entry. Newest first.

## 2026-08-04 — Phase 0 stack pins & environment notes

- **Stack:** Phaser `4.2.1` (npm latest), TypeScript strict, Vite 6, Vitest 2,
  Playwright 1.49, ESLint 9 + typescript-eslint. Exact resolved versions are pinned by
  `package-lock.json`; re-run the G1 device spike after any major upgrade.
- **Scaffold:** hand-rolled (not the official Phaser template) so the docs/05 directory
  shape exists from the first commit with no demo code to strip.
- **Playwright browsers:** Chromium only in this environment (pre-installed). Firefox +
  WebKit projects are added at Phase 5 hardening; physical iOS Safari remains the real
  quality bar per the Master Plan.
- **Content validation:** hand-rolled validators (src/content/schemas.ts) instead of a
  zod dependency — keeps the runtime bundle free of a validation library; revisit only
  if schema complexity outgrows it (owner: engineering).
- **Domain purity:** enforced twice — ESLint no-restricted-imports/globals on
  src/domain, plus a filesystem grep test in CI (tests/unit/domain-purity.test.ts).
- **Save:** SaveV1 as specified in docs/05 §7 (includes trust + promises from the v2
  merged bible). Atomic current/previous rotation with quarantine of corrupt records.
- **Art path:** code-first per user decision (docs/07 §1) — all art programmatically
  authored, upgrade decisions deferred until after the vertical slice.
