# Plan — macOS ribbon responsive/theme discoverability

## Objective

Make the desktop shell remain usable when the macOS window narrows and make both
theme concepts discoverable: application Light/Dark appearance in the title bar,
and document theme galleries in the same ribbon tabs as Word/Excel/PowerPoint.

## Current capability and evidence

- `RibbonHost.updateAdaptiveLayout()` already has compact/icon-only/collapsed
  stages, but the top bar can overflow before its theme button is reachable.
- Writer theme is on Design, Sheet themes on Page Layout, Slides themes on
  Design. The app Light/Dark toggle is currently only in the top bar.

## Scope/files

- `platform/shell/shell.css`: allow top-bar regions to shrink and collapse labels
  at narrow widths; preserve accessible icon/title text.
- `platform/ribbon/ribbon-host.js`: expose a stable compact-state hook and keep
  adaptive measurement tied to the actual container width.
- `platform/shell/app-shell.js`: add an explicit accessible appearance action in
  the compact top-bar control group if the label is hidden.
- focused UI tests for adaptive ribbon/theme discoverability.

## Risks and rollback

- Risk: hiding labels could reduce discoverability; keep `aria-label` and `title`
  and retain full labels at normal widths.
- Rollback: revert this branch's UI commit; no document format or security change.

## Test plan

- static ribbon inventory and syntax checks;
- DOM/unit tests for appearance action and responsive classes;
- native startup/build; visual CDP smoke at wide and narrow viewports once the
  native CDP endpoint is available.
