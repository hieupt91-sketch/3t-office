# Agent Handoff
TASK: Personal portfolio premium polish & Vercel deployment preparation
AGENT/ROLE: AGY (Antigravity) / Web Product Engineering & Art Direction
BRANCH: agy/personal-portfolio-premium
WORKTREE: /Volumes/Data/Worktrees/agy-personal-portfolio-premium
OBJECTIVE: Deliver executive-level premium visual polish for Pham Trung Hieu's bilingual portfolio, replace all placeholder graphics with authentic first-party product screenshots and official 3T logo, fix layered UI and double scrollbars across devices (desktop, tablet <=1024, mobile <=640), add phone contact, convert English budget ranges to natural USD equivalents with live currency note, verify 7/7 tests, and push the branch to GitHub for Vercel deployment.
FINDINGS: The 3T logo (1024x1024 RGBA) was fetched directly from 3tcomputer.com and integrated into the company section. All 6 projects now feature authentic high-resolution screenshots. Double scrollbars on modal were resolved by scoping scroll purely to .dialog-panel with overflow-x hidden. Budget dropdown in EN now displays USD values ($400-$4,000+) with localized explanatory disclaimer. All responsive breakpoints for tablet and mobile were tuned to prevent horizontal scroll leaks.
IMPLEMENTATION SUMMARY: Updated projects.ts with real imagery; updated copy.ts with phone number (+84 967 136 099) and USD budget notes; updated services.ts with USD ranges; updated globals.css with premium dark aesthetic, grain noise, pointer radial glow, orbit rings, and isolated scroll containers; updated Sections.tsx with staggered animations and 3T logo; updated ServiceRequestModal.tsx with robust note prop and clean form grid; added vercel.json SPA rewrites; pushed branch `agy/personal-portfolio-premium` to GitHub remote.
FILES CHANGED: portfolio/index.html; portfolio/src/data/projects.ts; portfolio/src/data/services.ts; portfolio/src/content/copy.ts; portfolio/src/styles/globals.css; portfolio/src/components/Header.tsx; portfolio/src/components/Hero.tsx; portfolio/src/components/Sections.tsx; portfolio/src/components/ServiceRequestModal.tsx; portfolio/vercel.json; portfolio/tests/App.test.tsx; 09-templates/AGENT-HANDOFF.md.
COMMANDS RUN: npm install; npm run typecheck; npm run lint; npm test; npm run build; git commit; git push -u origin agy/personal-portfolio-premium.
BUILD RESULT: PASS — Production build (23.1 kB CSS, 256.4 kB JS, gzip 80.5 kB).
TEST RESULTS: PASS — Vitest 7/7; TypeScript; ESLint.
KNOWN FAILURES: None.
RISKS: Connecting live email provider (Formspree/Getform) still required for real form delivery to inbox.
DEPENDENCIES/BLOCKERS: None. Branch is pushed to GitHub.
CORE PATCH ID (if any): None.
NEXT ACTION: User completes 30-second Vercel import to get live phamtrunghieu.vercel.app URL.

---

# Agent Handoff
TASK: Personal portfolio v1 — local implementation and QA
AGENT/ROLE: Codex primary + AGY independent reviewer / Web product engineering
BRANCH: feat/personal-portfolio
WORKTREE: /Volumes/Data/Worktrees/personal-portfolio
OBJECTIVE: Build the bilingual, profile-first portfolio from PERSONAL_PORTFOLIO_FULL_SPEC.md, including responsive i18n, verified product/project content, a focused visual direction, and an accessible service-request dialog that remains closed until explicitly opened; keep the work local and do not deploy.
FINDINGS: No portfolio existed in the monorepo. The existing `server/3t-web` serves a different company site and was left untouched. Private birth date/place and all unconfirmed biography, technology, social, role, and status claims were excluded from frontend source and build output. A real email provider cannot be completed safely until the owner selects/configures it and approves its retention/privacy terms.
IMPLEMENTATION SUMMARY: Added an isolated React/TypeScript/Vite app under `portfolio/`; structured VI/EN content and project data; a responsive dark visual direction with pointer glow, scroll reveal, layered motion and reduced-motion fallback; mobile navigation; richer source-verified summaries for 4 products and 2 client projects; locally stored first-party imagery from 3T Office, ZCP, and Happy Kids; dynamic language metadata; floating service action; accessible native dialog with focus restoration/trap, dirty-close confirmation, scroll lock, in-dialog language switching, field errors, whitelist validation, honeypot, double-submit guard, and explicit no-fake-success preview mode. Removed the role-led headline and theme switch so the portfolio centers on personal product-building work. The Sites skill influenced the presentation-led narrative, local preview workflow, and no-deploy handoff.
FILES CHANGED: docs/PLAN-PERSONAL-PORTFOLIO.md; portfolio/**; 09-templates/AGENT-HANDOFF.md.
COMMANDS RUN: Sites dependency installer; npm install (lock refresh for patched Vitest); npm audit --audit-level=moderate; npm run typecheck; npm run lint; npm test; npm run build; npm run preview; source privacy/secret scan; Chrome desktop and 390x844 browser QA with modal/language/overflow/console checks.
BUILD RESULT: PASS — Vite production build completed; output JS 251.12 kB (78.43 kB gzip), CSS 14.17 kB (4.08 kB gzip).
TEST RESULTS: PASS — Vitest 7/7; ESLint; TypeScript; npm audit (0 vulnerabilities). PASS — real Chrome desktop and 390x844 checks: no horizontal overflow, modal closed on initial load, dialog width 374px at 390px viewport, body scroll locked while open, language changed to EN inside the open modal without closing it, no console errors.
KNOWN FAILURES: Real provider submission/inbox/spam verification is BLOCKED because no provider account, verified endpoint, retention/privacy decision, or domain was supplied. Lighthouse, screen-reader software, 200/400% zoom, forced-colors, and physical mobile-keyboard testing are NOT RUN.
RISKS: Provider-side rate limiting, validation, origin restriction, retention, privacy notice, and anti-spam remain mandatory before enabling live submission. Placeholder typographic visuals must be replaced only with approved real assets. Canonical/OG image/robots/sitemap require the final domain.
DEPENDENCIES/BLOCKERS: Owner decisions listed in `portfolio/README.md`, especially legal company name, role/Founder wording, public social links, approved imagery, project roles/statuses/technology, provider/privacy policy, and final domain.
CORE PATCH ID (if any): None.
NEXT ACTION: Owner reviews the local UI/content and answers the confirmation checklist; then configure a verified form provider and run real inbox/spam/security/a11y/Lighthouse gates before any deployment.

---

# Agent Handoff
TASK: macOS 0.9.11 native app create/edit/save/close/reopen round-trip
AGENT/ROLE: Codex / macOS Native QA
BRANCH: codex/macos-native-roundtrip
WORKTREE: /Users/hieupc/.codex/worktrees/macos-native-roundtrip/3t-office
OBJECTIVE: Build the Xcode launchers and verify Doc, Sheet, and Slide through the real `.app`/Qt desktop path, without `scripts/serve.js` or an external browser, including create/edit/save/close/reopen and native OOXML inspection.
FINDINGS: All three Xcode launchers started their own Python `main.py` child through the Qt backend. Doc saved two Vietnamese paragraphs and reopened them as two paragraphs. Sheet saved text, numeric value 9999, and formula `=B2*2`; reopening returned cached value 19998 with the formula retained. Slide saved and reopened its Vietnamese title/body and native editable text-box shapes. Reopened desktop screenshots were captured directly from each running Qt page at 1920x942 (Doc) and 1366x820 (Sheet/Slide), then visually inspected.
IMPLEMENTATION SUMMARY: No product source changes were required. Test artifacts and screenshots were generated under `/tmp/vno-native-evidence`; all launcher and Python child processes created by this task were terminated after verification.
FILES CHANGED: `09-templates/AGENT-HANDOFF.md` only.
COMMANDS RUN: `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer ports/macos/scripts/build-development.sh /tmp/vno-native-roundtrip-apps`; launched `/tmp/vno-native-roundtrip-apps/{Doc,Sheet,Slide}.app/Contents/MacOS/{Doc,Sheet,Slide}` with isolated HOME/version-root/runtime and per-app Qt CDP ports; invoked the app's own save bridge; closed the editor window and reopened the saved path through its `.app` launcher; inspected the reopened in-app model and OOXML ZIP; `unzip -t`; `sips`; SHA-256 evidence checks.
BUILD RESULT: PASS — universal arm64+x86_64 Doc.app, Sheet.app, and Slide.app built successfully; development-bundle validator passed all three.
TEST RESULTS: PASS — Doc `.docx`: 2/2 Vietnamese paragraphs present after reopen and `word/document.xml` contains two `w:p`; Sheet `.xlsx`: A1/B1/A2/B2 and B3 formula/value persisted (`=B2*2`, 19998); Slide `.pptx`: title/body and two editable text-box shapes persisted. `unzip -t` reported no compressed-data errors for all three files. Screenshot SHA-256: Doc `31ae5e8110fcc2a3a739bb9ade6978f1212373fa7ac31731ef040aa46706abec`; Sheet `f0925e12f85e2aa388667a885c2d62ee5fac93d5d4640bf106cd19795cc50837`; Slide `65cfa191c18a31ebfafe75eccb42937fe4f102977907735529476fd8130f0618`.
KNOWN FAILURES: None in this focused native round-trip.
RISKS: This verifies the development `.app` bundles using the repository virtualenv and installed LibreOffice. It does not prove the future self-contained signed/notarized DMG works on a clean Mac.
DEPENDENCIES/BLOCKERS: Production runtime embedding, code signing/notarization, and clean-machine DMG testing remain outside this task.
CORE PATCH ID (if any): None.
NEXT ACTION: Merge this evidence handoff, then repeat the same three-file gate against the final self-contained DMG on a clean macOS account before pilot distribution.

---

# Agent Handoff
TASK: macOS 0.9.11 offline pilot runtime packaging
AGENT/ROLE: Codex / macOS Packaging
BRANCH: codex/macos-runtime-packaging-0911
WORKTREE: /Volumes/Data/Worktrees/macos-runtime-packaging-0911
OBJECTIVE: Build a self-contained Apple Silicon pilot layout with three native app launchers, Python/PySide6/QtWebEngine, versioned VN Office source, and LibreOffice, without downloading dependencies or signing/notarizing.
FINDINGS: The local tested runtime is arm64 Python 3.12.15 with PySide6 6.12.0 and pywebview 6.2.1; LibreOffice is 26.8.0.3 arm64. The final layout is 2.1 GB. Launcher bootstrap needed an explicitly relative `current -> app-0.9.11` symlink; using Foundation's URL overload accidentally produced an absolute path, caught by clean-root native smoke and fixed. Intel remains unsupported because the embedded Python runtime is arm64-only.
IMPLEMENTATION SUMMARY: Added plan gate, atomic staging build, runtime/legal metadata validator, pilot/source-offer notices, first-run seed bootstrap into Application Support, embedded LibreOffice discovery, and relative-output normalization for the Xcode development build. No network dependencies, secrets, signing, notarization, or DMG work was performed.
FILES CHANGED: docs/macos/PLAN-PILOT-OFFLINE-PACKAGING-0.9.11.md; ports/macos/launcher/AppDelegate.swift; ports/macos/scripts/build-development.sh; ports/macos/scripts/build-offline-pilot.sh; ports/macos/scripts/validate-offline-pilot.py; ports/macos/legal/PILOT-README.txt; ports/macos/legal/SOURCE-OFFER.txt; 09-templates/AGENT-HANDOFF.md.
COMMANDS RUN: bash syntax and Python compile checks; relative-path Xcode development build; three complete offline pilot builds; standalone artifact validator; launcher print-command smoke for Doc/Sheet/Slide; native Doc.app start with isolated HOME/application-support root and embedded-server probe.
BUILD RESULT: PASS — Xcode built and validated Doc.app, Sheet.app and Slide.app; offline artifact created at ignored path build/macos-offline-pilot (2.1 GB).
TEST RESULTS: PASS — artifact validator imported PySide6, QtWebEngineWidgets and pywebview from packaged Runtime; checked required files, bundle app kinds, arm64 binaries and all symlinks staying inside artifact. PASS — clean-root Doc.app bootstrap produced relative current symlink, started packaged Python from app-0.9.11 and served UI at its embedded localhost server. PASS — launcher command smoke for all three apps. Full Node/Python suites: NOT RUN because changes are confined to macOS launcher/packaging and prior integration suites are owned by the parent task.
KNOWN FAILURES: None in packaging build/validator/smoke. Visual interaction and save/reopen workflows from the final packaged artifact are NOT RUN in this subtask.
RISKS: Unsigned/unnotarized pilot may trigger Gatekeeper. Legal files are staging only, not a legal-release-ready determination; public release still needs exact archived corresponding sources and final notice review. Intel is NOT SUPPORTED. The 2.1 GB unpacked size should be optimized after functional pilot acceptance.
DEPENDENCIES/BLOCKERS: Developer ID/notarization and DMG require the owner's Apple Developer credentials and were intentionally not attempted. Intel requires a matching x86_64/universal Python/Qt/LibreOffice runtime.
CORE PATCH ID (if any): None.
NEXT ACTION: Parent should cherry-pick this commit, rebuild from approved runtime paths, visually test final Doc/Sheet/Slide artifact and document save/reopen on a clean Apple Silicon account, then proceed to signing/notarization/DMG when credentials are available.

---

# Agent Handoff
TASK: FIX-P1b (Sheet formula regression audit and P1 edit latency)
AGENT/ROLE: Codex / Sheet QA
BRANCH: fix/sheet-p1b-codex
WORKTREE: E:\VNOffice-codex-fp1b
OBJECTIVE: Verify each of the 28 real XLSX files matches its pre-P1 formula-cache baseline, lan01 remains 100%, and quick-view first-character/Enter latency stays within 100/300 ms.
FINDINGS: The corrected desktop audit matches the pre-P1 baseline commit 0be02c89 exactly for all 28 files: 72,707/72,837 (99.82%); lan01 is 865/865 (100%). The background preview check on lan01 verified 78/78 visible cross-sheet formulas. Closed external-workbook formulas must use the workbook's stored cached values, matching the app's offline behavior. Latency probe results (first key / Enter): lan01 39/42 ms; lan04 35/43 ms; lan06 32/48 ms; lan09 32/46 ms; lan16 40/47 ms. Each edit was retained in the quick-view journal during 12% background load. XLSX round-trip audit: 7/8 PASS; lan11 has a conditional-formatting L2 difference already present in the pre-P1 structural audit.
IMPLEMENTATION SUMMARY: Corrected audit timing and offline external-link semantics, added per-file baseline gates and quick-view checks, and made the typing probe wait for the editable preview and verify a retained edit. No product source changes were needed because the desktop formula results already meet the ticket baseline.
FILES CHANGED: scripts/audit-0610/sheet_formulas_vs_cache.mjs; scripts/audit-0610/probe_typing_cost.mjs; 09-templates/AGENT-HANDOFF.md.
COMMANDS RUN: npm test; python -m unittest discover -s tests; 28-file desktop sheet_formulas_vs_cache audit against 0be02c89; dirty-save XLSX round-trip for lan01/02/04/06/09/11/22/26; desktop CDP typing probe for lan01/04/06/09/16; node --check scripts/audit-0610/probe_typing_cost.mjs. Desktop runs used VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-fp1b and E: TEMP/TMP.
BUILD RESULT: NOT RUN (no build was required by the ticket).
TEST RESULTS: PASS — npm test 3119/3119; Python unittest 912 tests; formula baseline gate 28/28 files with zero per-file regressions; typing metrics all within thresholds. XLSX round-trip 7/8 PASS; lan11's L2 CF difference is documented in the pre-P1 structural audit.
KNOWN FAILURES: No formula-baseline regressions. lan02 (2/4), lan14 (68,121/68,125), lan19 (4/5), and lan28 (152/275) retain the same pre-P1 per-file results; lan23 has no formulas to evaluate. lan11 CF L2 is pre-existing.
RISKS: The formula-cache check intentionally treats closed external workbook links as stored offline values; recalculating those formulas without the linked workbook does not represent app behavior.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None.
NEXT ACTION: Review the committed audit/handoff changes, then merge FIX-P1b. P2 merge is not required for this task because no product formula changes were needed.

---

# Agent Handoff
TASK: E0 — Restore VLOOKUP for numeric lookup values and text identifier keys
AGENT/ROLE: Codex / Sheet Formula Engine
BRANCH: fix/excel-e0-codex
WORKTREE: E:\VNOffice-codex-fe0
OBJECTIVE: Fix the first-load formula-cache regression on lan28 and verify all 28 real workbooks without per-file regressions.
FINDINGS: On the desktop load path, lan28 had 12 sheets and the lookup source was fully loaded (315 cells, 105 populated A-column keys). B3 loaded as numeric 20413. Source key A40 was text-formatted "00020413" and passed the existing text-cell marker, but the exact-lookup index's numeric branch only checked numMap and concluded #N/A before considering eligible text identifiers.
IMPLEMENTATION SUMMARY: Added a numericTextMap to both regular lookup indexes and whole-column VLOOKUP indexes for text-formatted zero-padded identifiers and six-or-more-digit codes. Numeric exact lookup consults this index after the native numeric index misses, while short text such as "5" remains distinct from number 5. Existing FormulaEngine regression cases cover zero-padded IDs, long digit codes, and short numeric text.
FILES CHANGED: apps/sheet/formula-engine.js; 09-templates/AGENT-HANDOFF.md.
COMMANDS RUN: npm test; desktop 28-file audit: node --experimental-websocket scripts/audit-0610/sheet_formulas_vs_cache.mjs --force --report E:\VNOffice-temp\e0-audit-28-after.md. All desktop profile and TEMP data were stored under E:\VNOffice-temp.
BUILD RESULT: NOT RUN (no build requested or required for this JavaScript engine change).
TEST RESULTS: PASS — npm test 3136/3136. Fresh --force audit evaluated 72,837 formulas across all 28 files; lan28 improved from 152/275 (55.27%) to 270/275 (98.18%), exceeding 0.9.9's 97.45% gate. Lan28 VLOOKUP mismatches were eliminated. Other recorded baseline exceptions remained unchanged: lan02 2/4, lan14 68,121/68,125, lan19 4/5; lan23 had no evaluable formulas.
KNOWN FAILURES: The five remaining lan28 mismatches are outside VLOOKUP; report examples include S18, M1, A2, and B2. The audit report is on E:\VNOffice-temp and was not added to the repository.
RISKS: Numeric-to-text matching is limited to text-formatted zero-padded identifiers or digit strings of at least six characters, preserving the existing distinction for short numeric text.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None.
NEXT ACTION: Commit this E0 fix for independent review and merge following review.
