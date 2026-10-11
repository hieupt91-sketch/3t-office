# Ribbon Gap Audit — Round 3 (vs Microsoft Word/Excel/PowerPoint 365)

Method: read the full current ribbon structure (`apps/writer/writer-ribbon.js`, `apps/sheet/sheet-ribbon.js`, `apps/slides/slides-ribbon.js`) and the full command inventory (`platform/commands/command-definitions.js`), then compared tab-by-tab/group-by-group against real Office 365's actual ribbon layout from trained knowledge. Cross-checked against prior audits (`HANDOFF-RIBBON-GAPS-REAL-OFFICE.md`, `HANDOFF-WRITER-RIBBON-BREADTH.md`, `HANDOFF-SHEET-SLIDES-RIBBON-BREADTH.md`) to avoid re-flagging closed items — those already fixed Sheet Font/Alignment/Number and Writer Change Case/Sort/Formatting Marks/Shading/Borders, so they are NOT repeated here. No live browser testing was done (pure reading + comparison); implementers should verify behavior live as usual.

A recurring pattern found across all three apps this round: **a command exists in `command-definitions.js` (sometimes with a correct shortcut) but has no ribbon button at all**, so it's functionally invisible to users — the same class of bug found and fixed for `common.view.ribbonToggle` earlier this session. These are flagged explicitly below since they're the cheapest, highest-confidence fixes (no new logic, just ribbon wiring).

---

## VN Writer (vs Word 365)

| Priority | Tab / Group | Gap | Real Word behavior |
|---|---|---|---|
| **High** | Home / Font | **`writer.font.grow`/`writer.font.shrink` commands exist (shortcut Ctrl+Shift+>/< already correct) but have no ribbon button** | Two small buttons next to the font-size box that bump the selection's point size up/down through the standard size ladder |
| **High** | Home / Paragraph | **`writer.para.spacing1`/`spacing15`/`spacing2` commands exist (Ctrl+1/5/2, correct shortcuts) but have no ribbon button** | A "Line and Paragraph Spacing" dropdown button (single/1.15/1.5/double + "Add Space Before/After Paragraph") |
| **High** | Review | **No Word Count feature anywhere in the app** (grepped `apps/writer/` and the shell status bar — genuinely absent, not just unwired) | Review tab has a "Word Count" button opening a dialog with words/characters/paragraphs/lines; Word also usually live-updates a word count in the status bar |
| **High** | Review / Tracking | Only bulk Accept All / Reject All exist — no accept/reject ONE change at a time, no Previous/Next change navigation | Real Word's Changes group: Accept, Reject, Previous, Next — the normal way to review a document one edit at a time |
| Medium | Insert / Text | **WordArt exists for Slides (`slides.insert.wordart`) but was never added to Writer's Insert > Text group**, despite Word having WordArt too | Word's Insert > Text group includes WordArt (styled decorative text), same feature Slides already has — likely near-zero new logic needed, mostly ribbon + reusing the Slides WordArt dialog/rendering approach adapted for a Writer text run |
| Medium | Layout | No Section Breaks (only a plain Page Break exists, via Insert tab) | Real Word's Layout > Breaks dropdown includes Page Break, Column Break, and three Section Break types (Next Page/Continuous/Even-Odd) — needed for documents with mixed page setups (e.g., one section landscape for a wide table, rest portrait) |
| Medium | Layout | No Paragraph spacing-before/after quick control on the Layout tab | Real Word Layout tab has a small Paragraph group with Indent Left/Right and Spacing Before/After number inputs |
| Medium | Design | No "Page Color" command (only Watermark + Page Border exist) | Real Word Design > Page Background includes Page Color (solid/gradient/picture page background) |
| Medium | Comments (Insert + Review) | No comment Previous/Next/Delete/Resolve navigation — only "insert new comment" | Real Word lets you step through existing comments and delete/resolve them from the ribbon, not just add new ones |
| Low | View | No Outline view or Draft view | Rarely needed for the kind of documents VN Office's Vietnamese admin-user base produces; low priority |
| Low | Mailings | No Envelopes/Labels (Create group), no Address Block/Greeting Line helpers | Used specifically for mail-merge letters; Insert Merge Field alone can substitute in the interim |
| Low | References | No Index / Table of Authorities | Rare outside legal/academic documents; skip unless a user specifically asks |

**Note:** Captions & Table of Figures (Word's References > Captions group) was already identified as missing and is currently being implemented in a separate task — not re-listed here as a fresh gap.

---

## VN Sheet (vs Excel 365)

| Priority | Tab / Group | Gap | Real Excel behavior |
|---|---|---|---|
| **High** | Home / Cells | No "Format" dropdown at all (Row Height, AutoFit Row Height, Column Width, AutoFit Column Width, Hide & Unhide, Rename Sheet, Move or Copy Sheet, Protect Sheet) | This is one of Excel's most-used dropdowns for everyday spreadsheet housekeeping; entirely absent from VN Sheet's Cells group, which currently only has Insert/Delete row & column |
| **High** | Page Layout | No "Scale to Fit" (Width/Height/Scale %) | Extremely common for printing Vietnamese reports/tables that need to fit on one page width — currently only margins/orientation/size/print-titles exist |
| Medium | Insert / Charts | No PivotChart button (Pivot Table already exists and works) | Real Excel's Insert > Charts group includes a PivotChart button alongside regular charts, as a natural companion to the existing Pivot Table feature |
| Medium | Data | "What-If Analysis" only has Goal Seek — no Data Table, no Scenario Manager | Real Excel groups all three under one What-If Analysis dropdown; Data Table and Scenario Manager are commonly used for budget/planning spreadsheets |
| Medium | Review | No Protect Sheet / Protect Workbook | Commonly needed for shared administrative spreadsheets to prevent accidental edits to formulas/headers — worth scoping carefully since "real" protection has security implications, but even a UI-level lock (matching what LibreOffice/Excel itself provide, not a security boundary) has real value |
| Medium | Insert / Text | No Header & Footer entry point on Sheet's Insert tab (Writer has header/footer; Sheet doesn't seem to expose an equivalent for printed reports) | Real Excel's Insert > Text > Header & Footer switches to Page Layout view for print header/footer setup — verify whether this exists anywhere in Sheet before treating as a full gap, since it may be reachable a different way |
| Low | Data | No Consolidate | Used for combining data from multiple sheets/workbooks — moderately useful in Vietnamese accounting contexts but more complex to implement correctly |
| Low | Formulas | No "Evaluate Formula" step-through debugger | Nice-to-have, low frequency of use relative to implementation cost |
| Low | View / Window | No Split or Arrange All | Minor convenience; Freeze Panes (the more commonly used feature) already exists |

Sheet's Formulas tab is already very close to 1:1 parity with real Excel — no action needed there beyond the two low-priority items above.

---

## VN Slides (vs PowerPoint 365)

| Priority | Tab / Group | Gap | Real PowerPoint behavior |
|---|---|---|---|
| **High** | Home / Clipboard | **No Format Painter for Slides** — Writer and Sheet both have it (`common.edit.formatPainter`, `sheet.edit.formatPainter`), Slides doesn't | Real PowerPoint's Home > Clipboard group includes Format Painter same as Word/Excel; likely mostly ribbon + adapter wiring reusing the existing cross-app formatPainter pattern |
| **High** | Review | **Slides' spellcheck (already built per `HANDOFF-SLIDES-SPELLCHECK-VI.md`) has no ribbon exposure at all** — no Review tab button, only reachable via F7 if even that's wired for Slides | Same "command exists, invisible in UI" pattern as `common.view.ribbonToggle` earlier this session — verify what invocation path currently exists and add a Review > Proofing button pointing at it |
| **High** | Design / Customize | No "Format Background" command | One of PowerPoint's most-used Design-tab features — set a slide's (or all slides') background to a solid color, gradient, or picture. Currently Slides only has Slide Size in Customize |
| Medium | Home | No Editing group (Find/Replace/Select) — Writer already has these commands (`common.edit.find`/`common.edit.replace`) that could likely be reused directly for Slides text search | Real PowerPoint Home tab ends with a Find/Replace/Select group, same commands Writer already exposes |
| Medium | Animations | Only a single "apply one animation" button — no Animation Pane (list of all animations on a slide with reorder/retiming), no way to sequence multiple animated objects | Real PowerPoint's Animation Pane is core to building any slide with more than one animated element; verify current capability before scoping — may already support multiple animations without a pane, just missing the pane's list/reorder UI |
| Medium | Slide Show / Set Up | No "Set Up Slide Show" dialog (loop continuously until Esc, show without narration, pen/laser pointer color) | Moderate value, self-contained dialog feature |
| Low | Home / Slides group | Verify Section (grouping slides into named sections) is reachable from Home's Slides group — Sections were built in an earlier task per project history but may not be exposed at this specific location | If Sections already exist elsewhere (e.g., a separate menu), this is a placement/discoverability note, not a missing feature |
| Low | View | No Outline view | Lower priority — most Vietnamese presentation authors work slide-by-slide rather than in outline mode |
| Low | Slide Show | No Custom Slide Show (define a named subset/reordering of slides for a specific audience) | Niche but real feature; low priority |
| Low | Review / Comments | Same comment Previous/Next/Delete navigation gap as Writer/Sheet | See cross-app note below |

---

## Cross-app pattern worth fixing once, consistently

**Comment navigation** (Previous/Next/Delete/Resolve) is missing identically in Writer, Sheet, and Slides — all three currently only support inserting a new comment. Worth doing as a single shared-pattern task across all three rather than three separate one-off fixes, since the UI/UX should be identical everywhere.

**"Command exists, no ribbon button" bugs**: two confirmed this round (Writer font grow/shrink, Writer paragraph spacing) plus one strongly suspected (Slides spellcheck). Before implementing any of these as new features, first grep `command-definitions.js` and the adapter files for an existing handler — some of this may be a five-line ribbon-wiring fix rather than new logic, exactly like the ribbon-collapse fix earlier this session.

---

## Top 10 — suggested individual Codex/Grok task assignments, prioritized

1. **Writer: wire up Font Grow/Shrink + Paragraph Line Spacing buttons** (commands + shortcuts already exist and are correct — pure ribbon wiring, cheapest possible win).
2. **Writer: Word Count** (Review tab button + dialog: words/characters/paragraphs/lines; confirmed to not exist anywhere in the app).
3. **Sheet: Home > Cells "Format" dropdown** (Row Height, Column Width, AutoFit both, Hide/Unhide rows & columns, Rename Sheet, Move/Copy Sheet) — very high daily-use value, currently completely absent.
4. **Slides: Format Painter** (reuse the existing Writer/Sheet Format Painter pattern for Slides text/shapes).
5. **Slides: expose the existing spellcheck feature on the Review ribbon tab** (verify current invocation path first — likely a small wiring fix, not new logic).
6. **Slides: Format Background** (solid/gradient/picture background for current slide or all slides — Design tab, Customize group).
7. **Sheet: Page Layout "Scale to Fit"** (Width/Height/Scale % — very commonly needed for printing).
8. **Writer: Track Changes individual Accept/Reject + Previous/Next navigation** (currently only bulk Accept All/Reject All exist).
9. **Writer: WordArt on the Insert tab** (feature already fully built for Slides — port the ribbon entry + adapt for a Writer text run).
10. **Cross-app: Comment Previous/Next/Delete/Resolve navigation** for Writer, Sheet, and Slides as one consistent shared-pattern task (currently all three only support inserting a new comment).
