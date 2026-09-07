# HANDOFF: VN Slides Ribbon Toggle Overlap Fix

## Issue Summary
When toggling the Ribbon (collapse/expand) in VN Slides, the slide canvas could be partially covered by the Ribbon at small viewport sizes, particularly 1280x720 (HD).

## Root Cause
The `.vno-slide-stage` element used `justify-content: center` combined with `overflow: auto`. When the slide canvas (540px tall) exceeded the available stage height (~467px at 1280x720), the CSS centering caused the content to overflow **upward** by ~53px, pushing the canvas behind the Ribbon.

### Math at 1280x720 (before fix):
- Viewport: 720px
- Topbar: 44px, Ribbon: 132px, Statusbar: 28px
- Available for stage: 720 - 44 - 132 - 28 = 516px
- Stage padding: 48px (24px top + 24px bottom)
- Available content area: 516 - 48 = 468px
- Canvas height: 540px (exceeds 468px!)
- With `justify-content: center`: overflow = 540 - 468 = 72px, top overflow = 36px
- Canvas top: 177px (ribbon bottom) + 24px (padding) - 36px (overflow) = **165px**
- **Result: Canvas top (165px) < Ribbon bottom (177px) = -12px overlap**

## Fix
Two CSS changes in `apps/slides/slides.css`:

1. **Removed `justify-content: center`** from `.vno-slide-stage` — prevents upward overflow when content exceeds container height.

2. **Added `margin: auto`** to `.vno-slide-workspace` — provides safe centering: centers content when it fits, but prevents upward overflow when content exceeds the container.

### Behavior after fix:
- When content fits: `margin: auto` centers the workspace vertically (same visual as before)
- When content overflows: workspace starts from the top, no upward overflow behind the Ribbon
- At 1280x720: gap increased from -20.5px to +24px

## Files Changed
- `apps/slides/slides.css`: Lines 148-158 (stage) and 1644-1651 (workspace)

## Test Results

### Required Tests
| Test | Result |
|------|--------|
| `node scripts/check-syntax.js` | 88/88 PASS |
| `node tests/run-tests.js` | 1403/1403 PASS |
| `node tests/live/ribbon-audit-1280.playwright.mjs` | 100% PASS (0 failures) |

### New Playwright Test: `tests/live/slides-ribbon-toggle-overlap.playwright.mjs`
Tests ribbon collapse/expand at 4 viewport sizes (1920x1080, 1440x900, 1366x768, 1280x720) with:
- Default state measurement
- Single collapse/expand toggle
- 5 rapid toggles
- Notes panel expanded
- All 8 Slides ribbon tabs

| Viewport | Before Fix | After Fix |
|----------|-----------|-----------|
| 1920x1080 | 142px gap | 142px gap |
| 1440x900 | 52px gap | 52px gap |
| 1366x768 | 3.5px gap | 24px gap |
| 1280x720 | **-20.5px overlap** | 24px gap |

## Verification
All scenarios tested:
- All 8 Slides ribbon tabs (home, insert, design, transitions, animations, slideshow, review, view)
- Notes panel expanded
- Rapid toggle (5 times)
- 4 viewport sizes including HD (1280x720)
- No JavaScript errors in console

## Risk Assessment
- **Low risk**: Pure CSS change, no JavaScript logic affected
- **No breaking changes**: Centering behavior preserved when content fits; only overflow direction changed
- **Affects only VN Slides**: No impact on VN Writer or VN Sheet
