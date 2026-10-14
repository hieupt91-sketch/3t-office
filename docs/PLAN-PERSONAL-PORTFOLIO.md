# Plan gate — Personal portfolio

## Objective

Build a local-only, bilingual Vietnamese/English portfolio for Phạm Trung Hiếu under `portfolio/`. The experience must remain profile-first; the project request form stays closed until the visitor activates the single floating contact button.

## Current capability

The monorepo does not contain a personal portfolio application. Existing VN Office application, platform, adapter, and LibreOffice layers are unrelated and will not be modified.

## Files and modules

- `portfolio/src/content` and `portfolio/src/data`: verified bilingual copy and structured profile/project/service data.
- `portfolio/src/components`: semantic sections, language control, media-rich project cards, floating action button, and accessible request dialog.
- `portfolio/src/lib`: client validation and configurable provider submission adapter.
- `portfolio/src/styles`: a focused dark visual system, responsive layout, pointer/reveal effects, and reduced-motion behavior.
- `portfolio/tests`: validation and key rendering/interaction coverage.
- `portfolio/README.md`: local development, content editing, provider configuration, privacy, and pre-deployment checklist.
- `09-templates/AGENT-HANDOFF.md`: completion evidence.

## Dependencies

- React, React DOM, TypeScript, and Vite as explicitly selected by the product specification.
- Vitest, Testing Library, jsdom, and ESLint for local verification.
- No runtime backend dependency. Form submission uses an optional public HTTPS form endpoint configured through `VITE_FORM_ENDPOINT`.

## Risks and mitigations

- Missing portrait, logos, and approved screenshots: use original typographic/monogram treatments only; do not fabricate imagery.
- Unconfirmed biography, technology, dates, roles, social links, and product statuses: omit claims and keep the confirmation list in the README.
- No configured form provider: show an explicit demo/unavailable state and never report false success.
- Form privacy/security: whitelist fields, validate client-side, use a honeypot, avoid persistence/logging, and document that provider-side validation/rate limiting remains mandatory.
- Accessibility regressions in the dialog: implement initial focus, focus trap, Escape/backdrop/close behavior, dirty-form confirmation, scroll lock, and focus restoration; verify with automated and browser checks.

## Test plan

1. Run unit/component tests for validation, initial closed state, opening/closing, and demo submission behavior.
2. Run ESLint, TypeScript checks, and the production Vite build.
3. Run a local production preview and inspect desktop and mobile layouts, language changes, keyboard focus, effects, media, and dialog behavior.
4. Scan source/build output for credentials and prohibited personal details.
5. Record only commands actually run as PASS/FAIL/NOT RUN/BLOCKED.

## Rollback

Remove the isolated `portfolio/` directory, this plan, and the appended handoff entry. No VN Office runtime or shared platform behavior is changed.
