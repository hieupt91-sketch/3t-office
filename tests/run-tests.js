/**
 * VN Office — Master Test Runner
 * Tuân thủ quy định 06-testing/TESTING-STANDARD.md
 */

import { runCommandBusTests } from "./unit/command-bus.test.js";
import { runWriterInteractiveRulerTests } from "./unit/writer-interactive-ruler.test.js";
import { runWriterNavigationPaneTests } from "./unit/writer-nav-pane.test.js";
import { runAdapterMappingTests } from "./unit/adapter-mapping.test.js";
import { runSuiteSmokeTests } from "./smoke/suite-smoke.test.js";
import { runFormulaEngineTests } from "./unit/formula-engine.test.js";
import { runStructuredReferenceTests } from "./unit/structured-references.test.js";
import { runSheetTableTests } from "./unit/sheet-table.test.js";
import { runSheetTemplateSaveTests } from "./unit/sheet-template-save.test.js";
import { runSheetCfGoldenTests } from "./unit/sheet-cf-golden.test.js";
import { runSheetSeriesTests } from "./unit/sheet-series.test.js";
import { runFunctionGoldenTests } from "./unit/function-golden.test.js";
import { runSheetExternalLinksTests } from "./unit/sheet-external-links.test.js";
import { runSheetVndWordsTests } from "./unit/sheet-vnd-words.test.js";
import { runSheetFormulaOdfTests } from "./unit/sheet-formula-odf.test.js";
import { runFormulaAutocompleteTests } from "./unit/formula-autocomplete.test.js";
import { runSheetFormulaEntryTests } from "./unit/sheet-formula-entry.test.js";
import { runI18nTests } from "./unit/i18n.test.js";
import { run3TDisplayNameTests } from "./unit/3t-display-name.test.js";
import { runI18nHardcodedEnglishTests } from "./unit/i18n-hardcoded-english.test.js";
import { runSyntaxCheckTests } from "./unit/syntax-check.test.js";
import { runHtmlSmokeTests } from "./smoke/html-smoke.test.js";
import { runAiServiceTests } from "./unit/ai-service.test.js";
import { runApiKeyManagerTests } from "./unit/api-key-manager.test.js";
import { runCloudProviderTests } from "./unit/cloud-providers.test.js";
import { runSheetFileIoTests } from "./unit/sheet-file-io.test.js";
import { runSheetOpenPayloadTests } from "./unit/sheet-open-payload.test.js";
import { runSlidesFileIoTests } from "./unit/slides-file-io.test.js";
import { runMultiSheetTests } from "./unit/sheet-multi-sheet.test.js";
import { runWriterCommentsTests } from "./unit/writer-comments.test.js";
import { runSlidesAnimationsNotesTests } from "./unit/slides-animations-notes.test.js";
import { runSheetRulesValidationTests } from "./unit/sheet-rules-validation.test.js";
import { runSheetCfDvExcel2016ParityTests } from "./unit/sheet-cf-dv-excel2016-parity.test.js";
import { runWriterTrackChangesTests } from "./unit/writer-track-changes.test.js";
import { runWriterDocumentReviewTests } from "./unit/writer-document-review.test.js";
import { runWriterReviewExportTests } from "./unit/writer-review-export.test.js";
import { runWriterDocumentPropertiesTests } from "./unit/writer-document-properties.test.js";
import { runSheetFileInfoTests } from "./unit/sheet-file-info.test.js";
import { runWriterAutoCorrectTests } from "./unit/writer-auto-correct.test.js";
import { runWriterPrintPreviewTests } from "./unit/writer-print-preview.test.js";
import { runSlidesLayoutsTests } from "./unit/slides-layouts.test.js";
import { runSheetChartTests } from "./unit/sheet-charts.test.js";
import { runSheetUndoRedoTests } from "./unit/sheet-undo-redo.test.js";
import { runWriterUndoRedoTests } from "./unit/writer-undo-redo.test.js";
import { runSheetLookupConditionalFunctionTests } from "./unit/sheet-lookup-conditional-functions.test.js";
import { runSheetPivotTableTests } from "./unit/sheet-pivot-table.test.js";
import { runSlidesSorterViewTests } from "./unit/slides-sorter-view.test.js";
import { runWriterTocFootnotesTests } from "./unit/writer-toc-footnotes.test.js";
import { runSheetNamedRangesTextDateTests } from "./unit/sheet-named-ranges-text-date.test.js";
import { runWriterMailMergeTests } from "./unit/writer-mail-merge.test.js";
import { runSheetCommentsPrintAreaTests } from "./unit/sheet-comments-printarea.test.js";
import { runSlidesTimingsMediaTests } from "./unit/slides-timings-media.test.js";
import { runWriterStyleGalleryWatermarkTests } from "./unit/writer-style-gallery-watermark.test.js";
import { runSheetViewSlidesCommentsTests } from "./unit/sheet-view-slides-comments.test.js";
import { runWriterColumnsTests } from "./unit/writer-columns.test.js";
import { runSheetRowColInsertTests } from "./unit/sheet-row-col-insert.test.js";
import { runSheetSlidesI18nShortcutTests } from "./unit/sheet-slides-i18n-shortcuts.test.js";
import { runWriterI18nShortcutsTests } from "./unit/writer-i18n-shortcuts.test.js";
import { runSheetArrayFormulaTests } from "./unit/sheet-array-formulas.test.js";
import { runSlidesDiagramTests } from "./unit/slides-diagrams.test.js";
import { runShortcutScopeTests } from "./unit/shortcut-scope.test.js";
import { runWriterRefMailAuditTests } from "./unit/writer-refmail-audit.test.js";
import { runSheetImageTests } from "./unit/sheet-images.test.js";
import { runSheetObjectMenuTests } from "./unit/sheet-object-menu.test.js";
import { runSlidesSlideSizeTests } from "./unit/slides-slide-size.test.js";
import { runWriterRibbonBreadthTests } from "./unit/writer-ribbon-breadth.test.js";
import { runSheetKeyboardAuditTests } from "./unit/sheet-keyboard-audit.test.js";
import { runSheetFormatCellsTests } from "./unit/sheet-format-cells.test.js";
import { runSheetEditingStylesTests } from "./unit/sheet-editing-styles.test.js";
import { runSheetReferenceFunctionTests } from "./unit/sheet-reference-functions.test.js";
import { runSheetExcel2016FunctionGapTests } from "./unit/sheet-excel2016-function-gaps.test.js";
import { runSheetMathStatFunctionTests } from "./unit/sheet-math-stat-functions.test.js";
import { runSheetTextFunctionTests } from "./unit/sheet-text-functions.test.js";
import { runSheetDateFunctionTests } from "./unit/sheet-date-functions.test.js";
import { runSheetMouseShortcutsTests } from "./unit/sheet-mouse-shortcuts.test.js";
import { runWriterMouseShortcutsTests } from "./unit/writer-mouse-shortcuts.test.js";
import { runRibbonGapsRealOfficeTests } from "./unit/ribbon-gaps-real-office.test.js";
import { runSlidesMouseShortcutsTests } from "./unit/slides-mouse-shortcuts.test.js";
import { runWriterSlidesInsertGapsTests } from "./unit/writer-slides-insert-gaps.test.js";
import { runWriterViewOutlineDraftTests } from "./unit/writer-view-outline-draft.test.js";
import { runWriterChangeCaseTests } from "./unit/writer-change-case.test.js";
import { runWriterTrackChangesDisplayTests } from "./unit/writer-track-changes-display.test.js";
import { runWriterDocumentInspectorTests } from "./unit/writer-document-inspector.test.js";
import { runWriterEquationEditorTests } from "./unit/writer-equation-editor.test.js";
import { runSheetDataToolsTests } from "./unit/sheet-data-tools.test.js";
import { runSlidesDialogsA11yTests } from "./unit/slides-dialogs-a11y.test.js";
import { runColorContrastAuditTests } from "./unit/color-contrast-audit.test.js";
import { runRealOfficeImportFidelityTests } from "./unit/real-office-import-fidelity.test.js";
import { runVietnameseSpellcheckerTests } from "./unit/vi-spellchecker.test.js";
import { runSheetSlidesViewTabTests } from "./unit/sheet-slides-view-tab.test.js";
import { runSlidesSpellcheckViTests } from "./unit/slides-spellcheck-vi.test.js";
import { runSheetSpellcheckViTests } from "./unit/sheet-spellcheck-vi.test.js";
import { runSheetFormulasTabTests } from "./unit/sheet-formulas-tab.test.js";
import { runSheetClearNotesLinksTests } from "./unit/sheet-clear-notes-links.test.js";
import { runSheetStructureEditTests } from "./unit/sheet-structure-edit.test.js";
import { runFormulaRefShiftTests } from "./unit/formula-ref-shift.test.js";
import { runDesktopLaunchContextTests } from "./unit/desktop-launch-context.test.js";
import { runSheetCfValidationFodsRoundTripTests } from "./unit/sheet-cf-validation-fods-roundtrip.test.js";
import { runWriterTrackChangesImportTests } from "./unit/writer-trackchanges-import.test.js";
import { runWriterCommentsImportTests } from "./unit/writer-comments-import.test.js";
import { runSheetPivotImportTests } from "./unit/sheet-pivot-import.test.js";
import { runSheetPivotSaveFodsTests } from "./unit/sheet-pivot-save-fods.test.js";
import { runSheetMergeCellsTests } from "./unit/sheet-merge-cells.test.js";
import { runSheetPasteSpecialTests } from "./unit/sheet-paste-special.test.js";
import { runSheetCopyPasteFormatTests } from "./unit/sheet-copy-paste-format.test.js";
import { runOfficeClipboardTests } from "./unit/office-clipboard.test.js";
import { runCrossAppPasteTests } from "./unit/cross-app-paste.test.js";
import { runSlidesSmartartImportTests } from "./unit/slides-smartart-import.test.js";
import { runSlidesRotatedShapePositionTests } from "./unit/slides-rotated-shape-position.test.js";
import { runSlidesBasicsG8Tests } from "./unit/slides-basics-g8.test.js";
import { runWriterHeaderFooterImportTests } from "./unit/writer-headerfooter-import.test.js";
import { runWriterFootnotesImportTests } from "./unit/writer-footnotes-import.test.js";
import { runSlidesDiagramGroupSelectTests } from "./unit/slides-diagram-group-select.test.js";
import { runSlidesSpeakernotesImportTests } from "./unit/slides-speakernotes-import.test.js";
import { runSheetChartsImportTests } from "./unit/sheet-charts-import.test.js";
import { runWriterTablesImportTests } from "./unit/writer-tables-import.test.js";
import { runA11yAuditNewFeaturesTests } from "./unit/a11y-audit-new-features.test.js";
import { runSlidesWordArtTests } from "./unit/slides-wordart.test.js";
import { runSheetFormatPainterTests } from "./unit/sheet-format-painter.test.js";
import { runSheetGoalSeekTests } from "./unit/sheet-goal-seek.test.js";
import { runSheetWhatIfAnalysisTests } from "./unit/sheet-what-if-analysis.test.js";
import { runSheetPivotChartTests } from "./unit/sheet-pivot-chart.test.js";
import { runWriterArrangeTests } from "./unit/writer-arrange.test.js";
import { runSheetArrangeTests } from "./unit/sheet-arrange.test.js";
import { runSlidesHideSlideTests } from "./unit/slides-hide-slide.test.js";
import { runSlidesChartTests } from "./unit/slides-charts.test.js";
import { runWriterCitationsTests } from "./unit/writer-citations.test.js";
import { runSlidesFontParagraphTests } from "./unit/slides-font-paragraph.test.js";
import { runWriterCaptionsTests } from "./unit/writer-captions.test.js";
import { runWriterW4Tests } from "./unit/writer-w4.test.js";
import { runSheetFormatDropdownTests } from "./unit/sheet-format-dropdown.test.js";
import { runSheetRenameMoveProtectTests } from "./unit/sheet-rename-move-protect.test.js";
import { runSheetProtectWorkbookTests } from "./unit/sheet-protect-workbook.test.js";
import { runSlidesEditingGroupTests } from "./unit/slides-editing-group.test.js";
import { runSlidesFormatPainterTests } from "./unit/slides-format-painter.test.js";
import { runSlidesClipboardTests } from "./unit/slides-clipboard.test.js";
import { runSlidesSpellcheckRibbonTests } from "./unit/slides-spellcheck-ribbon.test.js";
import { runSlidesFormatBackgroundTests } from "./unit/slides-format-background.test.js";
import { runWriterWordCountTests } from "./unit/writer-word-count.test.js";
import { runWriterParagraphDialogTests } from "./unit/writer-paragraph-dialog.test.js";
import { runWriterTextToTableTests } from "./unit/writer-text-to-table.test.js";
import { runWriterPictureToolsTests } from "./unit/writer-picture-tools.test.js";
import { runWriterTextEffectsTests } from "./unit/writer-text-effects.test.js";
import { runI18nFlatKeyTests } from "./unit/i18n-flat-keys.test.js";
import { runHeaderThemeTests } from "./unit/header-theme.test.js";
import { runOfficeClipboardWordPasteTests } from "./unit/office-clipboard-word-paste.test.js";
import { runWriterTableRangesIncrementalTests } from "./unit/writer-table-ranges-incremental.test.js";
import { runWriterHelpTests } from "./unit/writer-help.test.js";
import { runWriterParagraphSortTests } from "./unit/writer-paragraph-sort.test.js";
import { runWriterSectionBreaksPageColorTests } from "./unit/writer-sectionbreaks-pagecolor.test.js";
import { runSheetHelpTests } from "./unit/sheet-help.test.js";
import { runSlidesHelpTests } from "./unit/slides-help.test.js";
import { runSlidesFixL2RoundtripTests } from "./unit/slides-fix-l2-roundtrip.test.js";
import { runSlidesFixL2DuplicateTests } from "./unit/slides-fix-l2-duplicate.test.js";
import { runHelpCoverageTests } from "./unit/help-coverage.test.js";
import { runHelpGettingStartedTests } from "./unit/help-getting-started.test.js";
import { runHelpRibbonLocationTests } from "./unit/help-ribbon-location.test.js";
import { runHelpShortcutConsistencyTests } from "./unit/help-shortcut-consistency.test.js";
import { runWriterWordArtTests } from "./unit/writer-wordart.test.js";
import { runSlidesAnimationPaneSetupShowTests } from "./unit/slides-animation-pane-setup-show.test.js";
import { runWriterIllustrationDialogTests } from "./unit/writer-illustration-dialogs.test.js";
import { runSheetEvaluateFormulaTests } from "./unit/sheet-evaluate-formula.test.js";
import { runSheetConsolidateTests } from "./unit/sheet-consolidate.test.js";
import { runSlidesSectionsTests } from "./unit/slides-sections.test.js";
import { runWriterEnvelopesLabelsTests } from "./unit/writer-envelopes-labels.test.js";
import { runSheetRealexportFodsTests } from "./unit/sheet-realexport-fods.test.js";
import { runWriterFodtPhaseATests } from "./unit/writer-fodt-phase-a.test.js";
import { runSheetXlsxNativePostprocessTests } from "./unit/sheet-xlsx-native-postprocess.test.js";
import { runSheetXlsxNativeOpenOverlayTests } from "./unit/sheet-xlsx-native-open-overlay.test.js";
import { runSlidesPptxMasterLogoTests } from "./unit/slides-pptx-master-logo.test.js";
import { runWriterFodtPhaseBTests } from "./unit/writer-fodt-phase-b.test.js";
import { runWriterFodtPhaseB2Tests } from "./unit/writer-fodt-phase-b2.test.js";
import { runWriterFodtPhaseCTests } from "./unit/writer-fodt-phase-c.test.js";
import { runWriterFodtPhaseDTests } from "./unit/writer-fodt-phase-d.test.js";
import { runWriterFodtPhaseE1Tests } from "./unit/writer-fodt-phase-e1.test.js";
import { runWriterFodtPhaseE2Tests } from "./unit/writer-fodt-phase-e2.test.js";
import { runWriterFodtPhaseE3WordArtTests } from "./unit/writer-fodt-phase-e3-wordart.test.js";
import { runWriterFodtPhaseE4ChartTests } from "./unit/writer-fodt-phase-e4-chart.test.js";
import { runSlidesPptxSectionListTests } from "./unit/slides-pptx-section-list.test.js";
import { runSlidesPptxSectionsOpenOverlayTests } from "./unit/slides-pptx-sections-open-overlay.test.js";
import { runSlidesPptxMasterLogoOpenOverlayTests } from "./unit/slides-pptx-masterlogo-open-overlay.test.js";
import { runSlidesPptxShowPropertiesTests } from "./unit/slides-pptx-show-properties.test.js";
import { runSlidesHeaderFooterPptxTests } from "./unit/slides-header-footer-pptx.test.js";
import { runSlidesPptxSlideSizeTests } from "./unit/slides-pptx-slide-size.test.js";
import { runSlidesTextVerticalDirectionTests } from "./unit/slides-text-vertical-direction.test.js";
import { runSheetFreezePanesRealTests } from "./unit/sheet-freeze-panes-real.test.js";
import { runSheetImageImportExportTests } from "./unit/sheet-image-import-export.test.js";
import { runSheetStatusBarSumTests } from "./unit/sheet-status-bar-sum.test.js";
import { runSheetRangeSelectionTests } from "./unit/sheet-range-selection.test.js";
import { runSheetAutoFillTests } from "./unit/sheet-autofill.test.js";
import { runSheetFillJustifyTests } from "./unit/sheet-fill-justify.test.js";
import { runSheetCalcOptionsTests } from "./unit/sheet-calc-options.test.js";
import { runSheetExternalLinksDialogTests } from "./unit/sheet-external-links-dialog.test.js";
import { runSlidesPptxSetupShowOpenOverlayTests } from "./unit/slides-pptx-setup-show-open-overlay.test.js";
import { runWriterParagraphSpacingTests } from "./unit/writer-paragraph-spacing.test.js";
import { runWriterFindReplaceDomTests } from "./unit/writer-find-replace-dom.test.js";
import { runSharedFindReplaceTests } from "./unit/find-replace-shared.test.js";
import { runWriterLineNumbersTests } from "./unit/writer-line-numbers.test.js";
import { runSheetCellOrientationTests } from "./unit/sheet-cell-orientation.test.js";
import { runWriterMultilevelListTests } from "./unit/writer-multilevel-list.test.js";
import { runSheetPrintPreviewTests } from "./unit/sheet-print-preview.test.js";
import { runSlidesPrintPreviewTests } from "./unit/slides-print-preview.test.js";
import { runSheetPagesetupRealFileImportTests } from "./unit/sheet-pagesetup-real-file-import.test.js";
import { runSheetPrintTitlesRealFileImportTests } from "./unit/sheet-print-titles-real-file-import.test.js";
import { runSheetPrintTitlesGridSelectionTests } from "./unit/sheet-print-titles-grid-selection.test.js";
import { runSheetGridInsertFormulaTests } from "./unit/sheet-grid-insert-formula.test.js";
import { runWriterFodtRealDocxParsingTests } from "./unit/writer-fodt-real-docx-parsing.test.js";
import { runBackstagePrintThumbnailTests } from "./unit/backstage-print-thumbnail.test.js";
import { runSlidesShapeAlignmentTests } from "./unit/slides-shape-alignment.test.js";
import { runWriterFodtRotatedShapePositionTests } from "./unit/writer-fodt-rotated-shape-position.test.js";
import { runSlidesShapeRotationHandleTests } from "./unit/slides-shape-rotation-handle.test.js";
import { runSlidesShapeRotationSerializeTests } from "./unit/slides-shape-rotation-serialize.test.js";
import { runSlidesShapeRotatedResizeTests } from "./unit/slides-shape-rotated-resize.test.js";
import { runWriterFodtRealFileGapsBatch2Tests } from "./unit/writer-fodt-real-file-gaps-batch2.test.js";
import { runMacroManagerTests } from "./unit/macro-manager.test.js";
import { runWriterFloatingImageImportTests } from "./unit/writer-floating-image-import.test.js";
import { runWriterTablePaintBordersTests } from "./unit/writer-table-paint-borders.test.js";
import { runWriterPageHairlineTests } from "./unit/writer-page-hairline.test.js";
import { runAiFeaturesBatch2Tests } from "./unit/ai-features-batch2.test.js";
import { runBlankDefaultTests } from "./unit/blank-default.test.js";
import { runSheetLoadFodsBlankTests } from "./unit/sheet-load-fods-blank.test.js";
import { runSheetFodsRepeatExpandTests } from "./unit/sheet-fods-repeat-expand.test.js";
import { runSheetImportCellStylesTests } from "./unit/sheet-import-cell-styles.test.js";
import { runSheetImportRichTextTests } from "./unit/sheet-import-rich-text.test.js";
import { runSheetCellTextFitTests } from "./unit/sheet-cell-text-fit.test.js";
import { runSheetImportAuditTests } from "./unit/sheet-import-audit.test.js";
import { runSheetSaveFidelityTests } from "./unit/sheet-save-fidelity.test.js";
import { runWriterExportDocxWordCompatTests } from "./unit/writer-export-docx-word-compat.test.js";
import { runSheetVirtualScrollRowHeightTests } from "./unit/sheet-virtual-scroll-row-heights.test.js";
import { runSlidesImportFidelityTests } from "./unit/slides-import-fidelity.test.js";
import { runSlidesSaveFidelityTests } from "./unit/slides-save-fidelity.test.js";
import { runWriterDocxAuditTests } from "./unit/writer-docx-audit.test.js";
import { runWriterDocFontSpacingTests } from "./unit/writer-doc-font-spacing.test.js";
import { runWriterZoomWheelTests } from "./unit/writer-zoom-wheel.test.js";
import { runWriterLegacyKeepNextTests } from "./unit/writer-legacy-keep-next.test.js";
import { runSheetDateValuesTests } from "./unit/sheet-date-values.test.js";
import { runNotificationBarTests } from "./unit/notification-bar.test.js";
import { runOfflineResourcesTests } from "./unit/offline-resources.test.js";
import { runErrorReportingTests } from "./unit/error-reporting.test.js";
import { runAutoRecoverTests } from "./unit/autorecover.test.js";
import { runUpdaterUiTests } from "./unit/updater-ui.test.js";
import { run3tBrandUxTests } from "./unit/3t-brand-ux.test.js";
import { runRibbonCommandHandlersTests } from "./unit/ribbon-command-handlers.test.js";
import { runSheetWatchWindowTests } from "./unit/sheet-watch-window.test.js";
import { runOfficeShortcutCoverageTests } from "./unit/office-shortcut-coverage.test.js";
import { runMissingOfficeShortcutsTests } from "./unit/missing-office-shortcuts.test.js";
import { runSlidesPenLaserTests } from "./unit/slides-pen-laser.test.js";
import { runBasicEditingKeysTests } from "./unit/basic-editing-keys.test.js";
import { runCh9AutoRecoverTests } from "./unit/ch9-autorecover.test.js";
import { runCh9ProcessCleanupTests } from "./unit/ch9-process-cleanup.test.js";
import { runCh9PerformanceLogTests } from "./unit/ch9-performance-log.test.js";
import { runUiConsistencyAndStringScannerTests } from "./unit/ui-user-visible-strings.test.js";
import { runOsInputGuardTests } from "./unit/os-input-guard.test.js";
import { runPrintEngineNameTests } from "./unit/print-engine-name.test.js";
import { runWriterTableControlsTests } from "./unit/writer-table-controls.test.js";
import { runVietnameseImeUnitTests } from "./unit/vietnamese-ime.test.js";
import { runSheetNativeCellValuesTests } from "./unit/sheet-native-cell-values.test.js";
import { runSheetPrintSetupRoundTripTests } from "./unit/sheet-print-setup-roundtrip.test.js";
import { runSheetC3C7C8GapTests } from "./unit/sheet-c3-c7-c8-gaps.test.js";
import { runWriterPictureResizeWrapTests } from "./unit/writer-picture-resize-wrap.test.js";
import { runWriterNumberedListRestartTests } from "./unit/writer-numbered-list-restart.test.js";
import { runWriterVerticalRulerTests } from "./unit/writer-vertical-ruler.test.js";
import { runWriterSpellingSuggestionsTests } from "./unit/writer-spelling-suggestions.test.js";
import { runWriterClipboardTests } from "./unit/writer-clipboard.test.js";
import { runSlidesBasicsAuditTests } from "./unit/slides-basics-audit.test.js";
import { runWriterDocNotRunBasicsTests } from "./unit/writer-doc-notrun-basics.test.js";
import { runSpellcheckUiUndoTests } from "./unit/spellcheck-ui-undo.test.js";
import { runSheetGridExtentTests } from "./unit/sheet-grid-extent.test.js";
import { runSpellcheckInlineToggleTests } from "./unit/spellcheck-inline-toggle.test.js";
import { runCh81ConsistencyTests } from "./unit/ch8-1-consistency.test.js";
import { runSharedInsertCapabilitiesTests } from "./unit/shared-insert-capabilities.test.js";

import { runKeepFocusUnitTests } from "./unit/ch4-6-keep-focus.test.js";
import { runSheetFormulaBarDisplayTests } from "./unit/sheet-formula-bar-display.test.js";
import { runContextMenuUnitTests } from "./unit/context-menu.test.js";
import { runSheetOverlapAutofitStatusTests } from "./unit/sheet-overlap-autofit-status.test.js";
import { runSheetFormulaHintsTests } from "./unit/sheet-formula-hints.test.js";
import { runSheetPayloadP2EquivalenceTests } from "./unit/sheet-payload-p2-equivalence.test.js";
import { runWriterSectionMarkerP3Tests } from "./unit/writer-section-marker-p3.test.js";
import { runMouseOpsParityTests } from "./unit/mouse-ops-parity.test.js";
import { runSheetQuickViewTests } from "./unit/sheet-quick-view.test.js";
import { runSheetSwitchWindowTests } from "./unit/sheet-switch-window.test.js";
import { runLicenseKeyFormatTests } from "./unit/license-key-format.test.js";
import { runUnoBridgeContentStageTests } from "./unit/uno-bridge-content-stage.test.js";
import { runWriterCoverPageTests } from "./unit/writer-cover-page.test.js";
import { runWriterDialogsD16Tests } from "./unit/writer-dialogs-d16.test.js";
import { runWriterLineSpacingRenderTests } from "./unit/writer-line-spacing-render.test.js";
import { runWriterHeadingShortcutsTests } from "./unit/writer-heading-shortcuts.test.js";
import { runWriterTextBoxDefaultsT8Tests } from "./unit/writer-textbox-defaults-t8.test.js";
import { runWriterFontLadderTests } from "./unit/writer-font-ladder.test.js";
import { runWriterTableEditsExportTests } from "./unit/writer-table-edits-export.test.js";
import { runWriterParagraphIndentTests } from "./unit/writer-paragraph-indent.test.js";
import { runPanelOverlayUiP1Tests } from "./unit/panel-overlay-ui-p1.test.js";
import { runSpellcheckPendingStyleTests } from "./unit/spellcheck-pending-style.test.js";
import { runSheetStyleExportWrapBorderAlignTests } from "./unit/sheet-style-export-wrap-border-align.test.js";
import { runWriterWordW7Tests } from "./unit/writer-word-w7.test.js";

async function runAll() {
  console.log("==================================================");
  console.log("      VN OFFICE AUTOMATED TEST SUITE RUNNER       ");
  console.log("==================================================");

  let total = 0;
  let passed = 0;
  let failed = 0;
  const originalDocument = globalThis.document;
  const originalMutationObserver = globalThis.MutationObserver;

  const suites = [
    { title: "1. Unit Tests — Command Bus", runner: runCommandBusTests },
    { title: "2. Unit Tests — LibreOffice Adapter Mapping", runner: runAdapterMappingTests },
    { title: "3. Unit Tests — Excel Spreadsheet Formula Engine", runner: runFormulaEngineTests },
    { title: "3b. Unit Tests — Tham chiếu có cấu trúc Table[Cột]", runner: runStructuredReferenceTests },
    { title: "3b2. Unit Tests — Thao tác Bảng Table/ListObject (AGY-TABLE)", runner: runSheetTableTests },
    { title: "3b3. Unit Tests — Lưu thành mẫu .xltx (Sheet)", runner: runSheetTemplateSaveTests },
    { title: "3b4. Unit Tests — Định dạng có điều kiện đối chiếu Excel 2016 + ROW()/COLUMN()", runner: runSheetCfGoldenTests },
    { title: "3c. Unit Tests — Điền > Chuỗi (Series)", runner: runSheetSeriesTests },
    { title: "3d. Unit Tests — Hàm đối chiếu Excel 2016 (bộ giá trị vàng)", runner: runFunctionGoldenTests },
    { title: "4. Unit Tests — Sheet external workbook links", runner: runSheetExternalLinksTests },
    { title: "5. Unit Tests — VND() số tiền bằng chữ", runner: runSheetVndWordsTests },
    { title: "6. Unit Tests — Sheet công thức #REF! ⇄ ODF", runner: runSheetFormulaOdfTests },
    { title: "7. Unit Tests — Formula Autocomplete & Parameter IntelliSense", runner: runFormulaAutocompleteTests },
    { title: "8. Unit Tests — Sheet Excel-Style Formula Entry", runner: runSheetFormulaEntryTests },
    { title: "9. Unit Tests — Vietnamese i18n Localization Layer", runner: runI18nTests },
    { title: "10. Regression Guard — 3T display names in i18n and Help", runner: run3TDisplayNameTests },
    { title: "11. Regression Guard — Hard-coded English UI Text Scan", runner: runI18nHardcodedEnglishTests },
    { title: "12. Smoke Tests — Suite & Vietnamese Unicode", runner: runSuiteSmokeTests },
    { title: "13. Syntax & Codebase Integrity — node --check", runner: runSyntaxCheckTests },
    { title: "14. Regression Guard — Offline Resources (no external CDN runtime loads)", runner: runOfflineResourcesTests },
    { title: "15. Smoke Tests — Application Entrypoints & index.html Runtime", runner: runHtmlSmokeTests },
    { title: "16. Unit Tests — AI Service Provider Orchestration", runner: runAiServiceTests },
    { title: "17. Unit Tests — AI API Key Manager", runner: runApiKeyManagerTests },
    { title: "18. Unit Tests — AI Cloud Providers (mock fetch)", runner: runCloudProviderTests },
    { title: "19. Unit Tests — VN Sheet Real File I/O & CSV Adapter", runner: runSheetFileIoTests },
    { title: "20. Unit Tests — VN Sheet compact open payload and FODS fallback", runner: runSheetOpenPayloadTests },
    { title: "21. Unit Tests — VN Slides Real File I/O & FODP Adapter", runner: runSlidesFileIoTests },
    { title: "22. Unit Tests — VN Sheet Multi-Sheet Data Isolation", runner: runMultiSheetTests },
    { title: "23. Behavioral Tests — VN Writer Comments", runner: runWriterCommentsTests },
    { title: "24. Unit Tests — VN Slides Object Animations & Speaker Notes", runner: runSlidesAnimationsNotesTests },
    { title: "25. Behavioral Tests — Sheet Conditional Formatting & Data Validation", runner: runSheetRulesValidationTests },
    { title: "25b. Unit Tests — Sheet CF/DV Excel 2016 Parity", runner: runSheetCfDvExcel2016ParityTests },
    { title: "26. Behavioral Tests — VN Writer Track Changes", runner: runWriterTrackChangesTests },
    { title: "26b. Behavioral Tests — VN Writer Compare & Protect", runner: runWriterDocumentReviewTests },
    { title: "27. Behavioral Tests — VN Writer Print Preview", runner: runWriterPrintPreviewTests },
    { title: "28. Behavioral Tests — VN Slides Slide Layouts", runner: runSlidesLayoutsTests },
    { title: "29. Behavioral Tests — VN Sheet Live Charts", runner: runSheetChartTests },
    { title: "30. Behavioral Tests — VN Sheet Deep Undo/Redo", runner: runSheetUndoRedoTests },
    { title: "31. Behavioral Tests — VN Writer Deep Undo/Redo History", runner: runWriterUndoRedoTests },
    { title: "32. Unit Tests — VN Sheet Lookup & Conditional Functions", runner: runSheetLookupConditionalFunctionTests },
    { title: "33. Behavioral Tests — VN Sheet Pivot Table", runner: runSheetPivotTableTests },
    { title: "34. Behavioral Tests — VN Slides Slide Sorter View", runner: runSlidesSorterViewTests },
    { title: "35. Behavioral Tests — VN Writer Table of Contents & Footnotes/Endnotes", runner: runWriterTocFootnotesTests },
    { title: "36. Behavioral Tests — VN Sheet Named Ranges & Advanced TEXT/DATE", runner: runSheetNamedRangesTextDateTests },
    { title: "37. Behavioral Tests — VN Writer Mail Merge", runner: runWriterMailMergeTests },
    { title: "38. Behavioral Tests — VN Sheet Comments, Print Area & Page Breaks", runner: runSheetCommentsPrintAreaTests },
    { title: "39. Behavioral Tests — VN Slides Rehearse Timings & Embed Media", runner: runSlidesTimingsMediaTests },
    { title: "40. Behavioral Tests — VN Writer Style Gallery & Watermark / Page Border", runner: runWriterStyleGalleryWatermarkTests },
    { title: "41. Behavioral Tests — VN Sheet View & VN Slides Review Comments", runner: runSheetViewSlidesCommentsTests },
    { title: "42. Behavioral Tests — VN Writer Columns", runner: runWriterColumnsTests },
    { title: "43. Behavioral Tests — VN Sheet Row & Column Insert", runner: runSheetRowColInsertTests },
    { title: "44. Behavioral Tests — Sheet/Slides i18n & Standard Shortcuts", runner: runSheetSlidesI18nShortcutTests },
    { title: "45. Behavioral & Unit Tests — VN Writer i18n & Word Shortcuts", runner: runWriterI18nShortcutsTests },
    { title: "46. Behavioral Tests — VN Sheet Cross-Sheet & Array Formulas", runner: runSheetArrayFormulaTests },
    { title: "47. Behavioral Tests — VN Slides SmartArt-like Diagrams", runner: runSlidesDiagramTests },
    { title: "48. Runtime Tests — Active App Shortcut Scope", runner: runShortcutScopeTests },
    { title: "49. Behavioral & Unit Tests — VN Writer References & Mailings Audit", runner: runWriterRefMailAuditTests },
    { title: "50. Behavioral Tests — VN Sheet Insert Pictures", runner: runSheetImageTests },
    { title: "51. Behavioral Tests — VN Slides Slide Size", runner: runSlidesSlideSizeTests },
    { title: "52. Behavioral & Unit Tests — VN Writer Ribbon Breadth (Sub/Sup, Illustrations, Themes, Links)", runner: runWriterRibbonBreadthTests },
    { title: "53. Behavioral & Unit Tests — VN Sheet Keyboard Entry & Formula Evaluation", runner: runSheetKeyboardAuditTests },
    { title: "54. Behavioral & Unit Tests — VN Sheet Format Cells Dialog & Number Formats", runner: runSheetFormatCellsTests },
    { title: "55. Behavioral & Unit Tests — VN Sheet Styles & Editing Groups", runner: runSheetEditingStylesTests },
    { title: "56. Unit Tests — VN Sheet Cross-Sheet Reference Functions", runner: runSheetReferenceFunctionTests },
    { title: "E1. Unit Tests — Excel 2016 Legacy Function Gaps", runner: runSheetExcel2016FunctionGapTests },
    { title: "57. Unit Tests — VN Sheet Math & Statistics Functions", runner: runSheetMathStatFunctionTests },
    { title: "58. Unit Tests — VN Sheet Text Functions", runner: runSheetTextFunctionTests },
    { title: "59. Unit Tests — VN Sheet Date Functions", runner: runSheetDateFunctionTests },
    { title: "60. Behavioral & Unit Tests — VN Sheet Mouse Interactions & Office Parity Shortcuts", runner: runSheetMouseShortcutsTests },
    { title: "61. Behavioral & Unit Tests — VN Writer Mouse Interactions & Office Parity Shortcuts", runner: runWriterMouseShortcutsTests },
    { title: "62. Behavioral & Unit Tests — Real Office Home Ribbon Gaps", runner: runRibbonGapsRealOfficeTests },
    { title: "63. Behavioral & Unit Tests — VN Slides Mouse Interactions & Office Parity Shortcuts", runner: runSlidesMouseShortcutsTests },
    { title: "64. Behavioral & Unit Tests — Writer/Slides Insert Tab Gaps (Word/PowerPoint)", runner: runWriterSlidesInsertGapsTests },
    { title: "65. Unit Tests — 3T Doc linear equation format and native MathML structures", runner: runWriterEquationEditorTests },
    { title: "66. Behavioral & Unit Tests — VN Sheet Data Tools & Outline", runner: runSheetDataToolsTests },
    { title: "67. Behavioral & Unit Tests — VN Slides Dialogs & Overlays Accessibility (WCAG 2.1 / ARIA)", runner: runSlidesDialogsA11yTests },
    { title: "68. Automated Audit — Suite-Wide WCAG 2.1 Color Contrast (AA / AAA)", runner: runColorContrastAuditTests },
    { title: "69. Unit Tests — Real Office File Import Fidelity (DOCX/XLSX/PPTX via soffice HTML/FODS/FODP)", runner: runRealOfficeImportFidelityTests },
    { title: "70. Unit Tests — Vietnamese Writer Spellchecker", runner: runVietnameseSpellcheckerTests },
    { title: "71. Behavioral & Unit Tests — VN Sheet & VN Slides Real View Tabs", runner: runSheetSlidesViewTabTests },
    { title: "72. Behavioral & Unit Tests — Vietnamese Slides Spellchecker", runner: runSlidesSpellcheckViTests },
    { title: "73. Behavioral & Unit Tests — Vietnamese Sheet Spellchecker (F7 dialog scan)", runner: runSheetSpellcheckViTests },
    { title: "74. Behavioral & Unit Tests — VN Sheet Real Formulas Tab (Function Library, Defined Names, Auditing, Calculation Mode)", runner: runSheetFormulasTabTests },
  { title: "Behavioral & Unit Tests — VN Sheet Xóa ghi chú / Xóa siêu liên kết (undo, redo)", runner: runSheetClearNotesLinksTests },
  { title: "Behavioral & Unit Tests — VN Sheet chèn/xóa hàng cột: công thức mọi trang, hoàn tác, sắp xếp", runner: runSheetStructureEditTests },
  { title: "Unit Tests — dịch tham chiếu công thức khi chèn/xóa/sao chép (EXCEL-E2)", runner: runFormulaRefShiftTests },
    { title: "75. Desktop Launch Context — Single App & Web Suite Mode", runner: runDesktopLaunchContextTests },
    { title: "76. Round-trip Tests — VN Sheet CF & Data Validation Save FODS", runner: runSheetCfValidationFodsRoundTripTests },
    { title: "77. Unit Tests — Writer Track Changes Import Fidelity (real DOCX w:ins/w:del)", runner: runWriterTrackChangesImportTests },
    { title: "78. Unit Tests — Writer Comments Import Fidelity (real DOCX w:comment)", runner: runWriterCommentsImportTests },
    { title: "79. Unit Tests — Sheet Pivot Table Import Fidelity (real XLSX DataPilot)", runner: runSheetPivotImportTests },
    { title: "80. Round-trip Tests — Sheet Pivot Table Save FODS", runner: runSheetPivotSaveFodsTests },
    { title: "81. Behavioral Tests — VN Sheet Merge Cells", runner: runSheetMergeCellsTests },
    { title: "82. Behavioral Tests — VN Sheet Paste Special", runner: runSheetPasteSpecialTests },
    { title: "82b. Behavioral Tests — VN Sheet Copy Cut Paste Formatting Preservation", runner: runSheetCopyPasteFormatTests },
    { title: "83. Unit Tests — Slides SmartArt Import Fidelity (real PPTX DrawingML → FODP)", runner: runSlidesSmartartImportTests },
    { title: "84. Unit Tests — Writer Header/Footer Import Fidelity (real DOCX → StarWriter HTML)", runner: runWriterHeaderFooterImportTests },
    { title: "85. Behavioral Tests — VN Slides Diagram Group Select / Move / Delete", runner: runSlidesDiagramGroupSelectTests },
    { title: "86. Unit Tests — Writer Footnotes/Endnotes Import Fidelity (real DOCX → StarWriter HTML)", runner: runWriterFootnotesImportTests },
    { title: "87. Unit Tests — Slides Speaker Notes Import Fidelity (real PPTX notesSlides → FODP)", runner: runSlidesSpeakernotesImportTests },
    { title: "88. Unit Tests — Sheet Charts Import Fidelity (real XLSX DrawingML chart → FODS)", runner: runSheetChartsImportTests },
    { title: "89. Unit Tests — Writer Tables Import Fidelity (real DOCX w:tbl merge/border/shading)", runner: runWriterTablesImportTests },
    { title: "90. Behavioral Tests — VN Slides WordArt (chữ nghệ thuật)", runner: runSlidesWordArtTests },
    { title: "91. Behavioral Tests — VN Sheet Format Painter", runner: runSheetFormatPainterTests },
    { title: "92. Accessibility Audit — Keyboard Navigation for New Features (Paste Special, Merge Cells, Sections, WordArt, SmartArt Group Select, Dark Mode Toggle)", runner: runA11yAuditNewFeaturesTests },
    { title: "93. Behavioral Tests — VN Sheet Goal Seek", runner: runSheetGoalSeekTests },
    { title: "94. Behavioral Tests — VN Sheet What-If Analysis", runner: runSheetWhatIfAnalysisTests },
    { title: "95. Behavioral Tests — VN Sheet PivotChart", runner: runSheetPivotChartTests },
    { title: "96. Behavioral Tests — VN Writer Arrange Group", runner: runWriterArrangeTests },
    { title: "97. Behavioral Tests — VN Slides Hide Slide (Ẩn trang chiếu)", runner: runSlidesHideSlideTests },
    { title: "98. Behavioral Tests — VN Slides Insert Chart", runner: runSlidesChartTests },
    { title: "99. Behavioral Tests — VN Writer Citations & Bibliography", runner: runWriterCitationsTests },
    { title: "100. Behavioral Tests — VN Slides Font & Paragraph (Home tab)", runner: runSlidesFontParagraphTests },
    { title: "101. Behavioral Tests — VN Writer Captions & Table of Figures", runner: runWriterCaptionsTests },
    { title: "WORD-W4. Writer Rules, Index, Reusable Blocks & Hyphenation", runner: runWriterW4Tests },
    { title: "102. Behavioral Tests — VN Sheet Home Cells Format dropdown (row/col size & hide)", runner: runSheetFormatDropdownTests },
    { title: "103. Behavioral Tests — VN Sheet Rename / Move-Copy / Protect Sheet", runner: runSheetRenameMoveProtectTests },
    { title: "104. Behavioral Tests — VN Sheet Protect Workbook", runner: runSheetProtectWorkbookTests },
    { title: "105. Behavioral Tests — VN Slides Home Editing group (Find/Replace/Select)", runner: runSlidesEditingGroupTests },
    { title: "106. Behavioral Tests — VN Slides Format Painter", runner: runSlidesFormatPainterTests },
    { title: "107. Behavioral Tests — VN Slides Clipboard (Cut/Copy/Paste in text boxes)", runner: runSlidesClipboardTests },
    { title: "108. Behavioral Tests — VN Slides Review Spellcheck Ribbon", runner: runSlidesSpellcheckRibbonTests },
    { title: "109. Behavioral Tests — VN Slides Format Background", runner: runSlidesFormatBackgroundTests },
    { title: "110. Behavioral Tests — VN Writer Word Count", runner: runWriterWordCountTests },
    { title: "111. Behavioral Tests — VN Writer In-app Help", runner: runWriterHelpTests },
    { title: "Writer Sort: báo hướng dẫn khi thiếu hai đoạn", runner: runWriterParagraphSortTests },
    { title: "112. Behavioral Tests — VN Writer Section Breaks & Page Color", runner: runWriterSectionBreaksPageColorTests },
    { title: "113. Behavioral Tests — VN Sheet In-app Help", runner: runSheetHelpTests },
    { title: "114. Behavioral Tests — VN Slides In-app Help", runner: runSlidesHelpTests },
    { title: "FIX-L2. Slides FODP import/save round trip", runner: runSlidesFixL2RoundtripTests },
    { title: "FIX-L2. Ribbon duplicate with a shape selected", runner: runSlidesFixL2DuplicateTests },
    { title: "115. Regression Guard — Help Coverage (100% Writer, Sheet & Slides Ribbon Commands, Catalog Quality & Shared Platform)", runner: runHelpCoverageTests },
    { title: "116. Regression Guard — Help ⇄ Ribbon Location Consistency (commandIds thật, tab/nhóm khớp ribbon hiện tại)", runner: runHelpRibbonLocationTests },
    { title: "117. Regression Guard — Help ⇄ Shortcut Consistency (shortcut trong Help khớp command-definitions + app binds)", runner: runHelpShortcutConsistencyTests },
    { title: "118. Regression Guard — Help Bắt đầu nhanh / Phím tắt / Khác biệt (tab, nhóm, phím tắt có thật)", runner: runHelpGettingStartedTests },
    { title: "119. Behavioral Tests — VN Writer WordArt (chữ nghệ thuật)", runner: runWriterWordArtTests },
    { title: "120. Behavioral Tests — VN Slides Animation Pane & Set Up Slide Show", runner: runSlidesAnimationPaneSetupShowTests },
    { title: "121. Behavioral Tests — VN Writer Illustration Dialogs (Shape/Diagram/Chart pickers)", runner: runWriterIllustrationDialogTests },
    { title: "122. Behavioral Tests — VN Sheet Evaluate Formula", runner: runSheetEvaluateFormulaTests },
    { title: "123. Behavioral Tests — VN Sheet Consolidate (Hợp nhất dữ liệu)", runner: runSheetConsolidateTests },
    { title: "124. Behavioral Tests — VN Slides Sections (nhóm trang chiếu)", runner: runSlidesSectionsTests },
    { title: "125. Behavioral Tests — VN Writer Envelopes & Labels (Mailings > Create)", runner: runWriterEnvelopesLabelsTests },
    { title: "126. Unit Tests — Sheet FODS real-export serialize (charts, page-break, sparkline, protect, outline)", runner: runSheetRealexportFodsTests },
    { title: "127. Unit Tests — Writer FODT Phase A serialize/parse", runner: runWriterFodtPhaseATests },
    { title: "128. Unit Tests — Sheet native XLSX post-process (workbookProtection lockStructure)", runner: runSheetXlsxNativePostprocessTests },
    { title: "129. Unit Tests — Sheet native XLSX open overlay (lockStructure → structure-protected)", runner: runSheetXlsxNativeOpenOverlayTests },
    { title: "130. Unit Tests — Slides native PPTX post-process (Slide Master logo p:sp)", runner: runSlidesPptxMasterLogoTests },
    { title: "131. Unit Tests — Writer FODT Phase B (table, image)", runner: runWriterFodtPhaseBTests },
    { title: "132. Unit Tests — Writer FODT Phase B.2 (JPEG/GIF/WEBP, Text Box/shape)", runner: runWriterFodtPhaseB2Tests },
    { title: "133. Unit Tests — Writer FODT Phase C (page-layout, header/footer, section geometry)", runner: runWriterFodtPhaseCTests },
    { title: "134. Unit Tests — Writer FODT Phase D (footnote/endnote, comment, TOC)", runner: runWriterFodtPhaseDTests },
    { title: "135. Unit Tests — Writer FODT Phase E.1 (Track Changes)", runner: runWriterFodtPhaseE1Tests },
    { title: "136. Unit Tests — Writer FODT Phase E.2 (Watermark)", runner: runWriterFodtPhaseE2Tests },
    { title: "137. Unit Tests — Writer FODT Phase E.3 (WordArt Fontwork)", runner: runWriterFodtPhaseE3WordArtTests },
    { title: "138. Unit Tests — Writer FODT Phase E.4 (Chart native)", runner: runWriterFodtPhaseE4ChartTests },
    { title: "139. Unit Tests — Slides native PPTX post-process (p14:sectionLst)", runner: runSlidesPptxSectionListTests },
    { title: "140. Unit Tests — Slides native PPTX open overlay (p14:sectionLst → vno:section-*)", runner: runSlidesPptxSectionsOpenOverlayTests },
    { title: "141. Unit Tests — Slides native PPTX open overlay (VNOfficeMasterLogo → vno:master-theme)", runner: runSlidesPptxMasterLogoOpenOverlayTests },
    { title: "142. Unit Tests — Slides native PPTX post-process (p:showPr Set Up Show)", runner: runSlidesPptxShowPropertiesTests },
    { title: "143. Unit Tests — Slides native PPTX open overlay (p:showPr → vno Set Up Show)", runner: runSlidesPptxSetupShowOpenOverlayTests },
    { title: "144. Unit Tests — Slides native header/footer placeholders save and reopen", runner: runSlidesHeaderFooterPptxTests },
    { title: "144. Unit Tests — Writer paragraph spacing before/after (pt)", runner: runWriterParagraphSpacingTests },
    { title: "145. Unit Tests — Writer find/replace preserves inline formatting nodes", runner: runWriterFindReplaceDomTests },
    { title: "146. Unit Tests — Writer line numbers (FODT linenumbering-configuration)", runner: runWriterLineNumbersTests },
    { title: "147. Unit Tests — VN Sheet cell text orientation (FODS rotation + XLSX textRotation)", runner: runSheetCellOrientationTests },
    { title: "148. Unit Tests — Writer multilevel list (3 presets × 3 levels)", runner: runWriterMultilevelListTests },
    { title: "149. Unit & Behavioral Tests — VN Sheet Print Preview (Ctrl+F2) + in thật (Ctrl+P)", runner: runSheetPrintPreviewTests },
    { title: "150. Unit & Behavioral Tests — VN Slides Print Preview (Ctrl+F2) + in thật (Ctrl+P)", runner: runSlidesPrintPreviewTests },
    { title: "151. Unit Tests — VN Sheet Page Setup: đọc đúng file ODF thật (không phụ thuộc thuộc tính riêng vno:page-*)", runner: runSheetPagesetupRealFileImportTests },
    { title: "152. Unit Tests — VN Sheet Print Titles: đọc đúng Print Titles từ file ODF thật (_xlnm.Print_Titles)", runner: runSheetPrintTitlesRealFileImportTests },
    { title: "153. Unit Tests — VN Sheet Print Titles: nhập tham chiếu $1:$2/$A:$B + chọn trên lưới + serialisation", runner: runSheetPrintTitlesGridSelectionTests },
    { title: "FIX-S12 Unit Tests — Sheet AutoSum/AutoAverage tự nhận dải liền kề", runner: runSheetGridInsertFormulaTests },
    { title: "154. Unit Tests — Writer parseFodt(): đọc đúng file FODT thật từ vòng chuyển đổi DOCX (page-layout regex + text:sequence-decls)", runner: runWriterFodtRealDocxParsingTests },
    { title: "155. Unit & Behavioral Tests — VN Office Backstage Print Thumbnail & Live Preview", runner: runBackstagePrintThumbnailTests },
    { title: "156. Unit & Behavioral Tests — VN Slides Multi-Shape Align/Distribute (GAP-SLIDES-01/02/03)", runner: runSlidesShapeAlignmentTests },
    { title: "157. Unit Tests — Slides native PPTX post-process (p:sldSz khổ trang chiếu thật)", runner: runSlidesPptxSlideSizeTests },
    { title: "158. Unit Tests — VN Slides Text Vertical Align & Direction (GAP-SLIDES-05/06)", runner: runSlidesTextVerticalDirectionTests },
    { title: "159. Unit Tests — VN Sheet Freeze Panes thật (cố định theo Ô đang chọn + sửa lỗi ảo hóa hàng)", runner: runSheetFreezePanesRealTests },
    { title: "160. Unit Tests — VN Sheet đọc/ghi ảnh nhúng (draw:image) từ file thật + round-trip Lưu/Mở", runner: runSheetImageImportExportTests },
    { title: "161. Unit Tests — VN Slides: vị trí hình bị xoay trong PPTX thật (draw:transform rotate/translate)", runner: runSlidesRotatedShapePositionTests },
    { title: "162. Unit Tests — VN Writer: vị trí hình/text box bị xoay trong FODT (draw:transform rotate/translate)", runner: runWriterFodtRotatedShapePositionTests },
    { title: "163. Unit Tests — VN Sheet thanh trạng thái Sum/Average/Count: chỉ tính vùng đang chọn, không xén dấu thập phân", runner: runSheetStatusBarSumTests },
    { title: "164. Unit Tests — VN Slides Tay Cầm Xoay Tương Tác (Rotation Handle & Undo/Redo)", runner: runSlidesShapeRotationHandleTests },
    { title: "165. Unit Tests — VN Slides Serialize Góc Xoay Hình (shape.rotation → draw:transform FODP)", runner: runSlidesShapeRotationSerializeTests },
    { title: "166. Unit Tests — VN Slides Co Giãn Hình Đã Xoay (Rotated Shape Resize Math & Anchor Invariance)", runner: runSlidesShapeRotatedResizeTests },
    { title: "167. Unit Tests — Writer parseFodt(): 3 lỗi thật từ file .doc người dùng (header/footer diff, table multi-p, draw:connector)", runner: runWriterFodtRealFileGapsBatch2Tests },
    { title: "168. Unit Tests — VN Office Macro cơ bản (ghi/phát lại thao tác qua Command Bus)", runner: runMacroManagerTests },
    { title: "169. Unit Tests — Writer floating image (sd-abs-pos) import normalization", runner: runWriterFloatingImageImportTests },
    { title: "170. Unit Tests — Writer W44/W47 paint-only table borders keep cell padding", runner: runWriterTablePaintBordersTests },
    { title: "171. Unit Tests — Writer W48 page column, W49 missing-font line ratio, W50 image descent", runner: runWriterPageHairlineTests },
    { title: "172. Unit Tests — AI Features Batch 2 (Dịch thuật, Viết nháp, Giải thích CT, Tạo CT từ mô tả)", runner: runAiFeaturesBatch2Tests },
    { title: "173. Unit Tests — Blank Default (Writer/Sheet/Slides mặc định trang trắng thật)", runner: runBlankDefaultTests },
    { title: "174. Integration Tests — Sheet loadFromFods after isBlank mount MUST populate data", runner: runSheetLoadFodsBlankTests },
    { title: "175. Unit Tests — parseFods repeat expansion: perf + data integrity + serialize round-trip", runner: runSheetFodsRepeatExpandTests },
    { title: "176. Unit Tests — Sheet import cell visual styles (background/border/font/alignment) + sheet visibility + round-trip", runner: runSheetImportCellStylesTests },
    { title: "177. Unit Tests — Sheet import rich text (multi-run styled cells in FODS) + round-trip + render + edit clears richText", runner: runSheetImportRichTextTests },
    { title: "178. Unit Tests — Sheet cell text fit, font size precision, padding & text overflow (Excel 2016 parity)", runner: runSheetCellTextFitTests },
    { title: "179. Unit Tests — Sheet XLSX import audit", runner: runSheetImportAuditTests },
    { title: "180. Unit Tests — Sheet save fidelity: font-face-decls, newline preservation, rich-text paragraph split", runner: runSheetSaveFidelityTests },
    { title: "181. Unit Tests — Writer DOCX export Word 2016 compat (strip span dimension/position for LO HTML→Writer import)", runner: runWriterExportDocxWordCompatTests },
    { title: "182. Unit Tests — Sheet Virtual Scroll with Variable Row Heights (prefix-sum cache, binary search, spacers)", runner: runSheetVirtualScrollRowHeightTests },
    { title: "183. Unit Tests — Slides PPTX/FODP Import Fidelity", runner: runSlidesImportFidelityTests },
    { title: "184. Unit Tests — Slides Save Fidelity (PowerPoint 2016 parity: quotes, line-height, fo:clip, master chrome)", runner: runSlidesSaveFidelityTests },
    { title: "185. Unit Tests — Writer DOCX effective-format audit", runner: runWriterDocxAuditTests },
    { title: "186. Unit Tests — Writer doc font / line spacing (Word multiple x font ratio, anchor <br>, imported class)", runner: runWriterDocFontSpacingTests },
    { title: "187. Unit Tests — Sheet date/time cell values (office:date-value round trip)", runner: runSheetDateValuesTests },
    { title: "188. Unit Tests — UI Kit Notification Bar & WCAG AA Color Contrast", runner: runNotificationBarTests },
    { title: "189. Unit Tests — Signed Updater UI and Help", runner: runUpdaterUiTests },
    { title: "190. Unit Tests — Writer legacy DOC keepNext import and pagination", runner: runWriterLegacyKeepNextTests },
    { title: "191. Unit Tests — Shared error reporting hooks, consent and feedback dialogs", runner: runErrorReportingTests },
    { title: "192. Unit Tests — Shared AutoRecover dirty tracking, timer, and recovery dialog behavior", runner: runAutoRecoverTests },
    { title: "193. Unit Tests — G8 VN Slides basics vs PowerPoint 2016 (slides, text, objects, show, notes, save)", runner: runSlidesBasicsG8Tests },
    { title: "194. Unit Tests — 3T Office Brand UX (About Dialog)", runner: run3tBrandUxTests },
    { title: "195. Unit Tests — 100% Ribbon Command Handlers & Definitions (Zero Silent NO-OPs)", runner: runRibbonCommandHandlersTests },
    { title: "196. Unit Tests — Sheet Watch Window (Excel parity: 6 columns, multi-sheet, draggable, keyboard, real-time)", runner: runSheetWatchWindowTests },
    { title: "197. Regression Guard — Microsoft Office Shortcut Coverage (Word/Excel/PowerPoint)", runner: runOfficeShortcutCoverageTests },
    { title: "198. Unit Tests — Office Missing Shortcuts (Ctrl+], Ctrl+[, Ctrl+Shift++, Shift+F11, Ctrl+-, F11) & Undo", runner: runMissingOfficeShortcutsTests },
    { title: "199. Unit Tests — Slides F5 Pen and Laser Pointer (Ctrl+P, Ctrl+L, Ctrl+A, E, Color, Keep/Discard ink)", runner: runSlidesPenLaserTests },
    { title: "200. Unit Tests — VN Sheet range selection anchors, multi-area status and drag auto-scroll math", runner: runSheetRangeSelectionTests },
    { title: "201. Unit Tests — 3T Doc and 3T Sheet basic editing keys and clipboard", runner: runBasicEditingKeysTests },
    { title: "202. Unit Tests — Shared Find and Replace (CH-7.1) for 3T Doc, 3T Sheet and 3T Slide", runner: runSharedFindReplaceTests },
    { title: "203. Unit Tests — CH-8 UI Consistency, KeyTips, Contextual F1 & String Scanner", runner: runUiConsistencyAndStringScannerTests },
    { title: "204. Safety Regression — source and tests use CDP, never OS-level input or by-name process kill", runner: runOsInputGuardTests },
    { title: "205. CH-3/CH-8 — Hộp thoại In không lộ tên thư viện bên trong", runner: runPrintEngineNameTests },
    { title: "206. CH-4.7 — Vietnamese IME typing, burst normalizer, caret preservation, undo coalescing & NFC normalization", runner: runVietnameseImeUnitTests },
    { title: "207. Unit Tests — VN Sheet AutoFill date sequences and double-click fill", runner: runSheetAutoFillTests },
    { title: "208. Unit Tests — VN Sheet native numeric/date cell values, external paste, fill and FODS types", runner: runSheetNativeCellValuesTests },
    { title: "209. Unit Tests — VN Sheet print setup XLSX reopen round-trip", runner: runSheetPrintSetupRoundTripTests },
    { title: "210. Unit Tests — VN Sheet C3/C7/C8 selection, tabs and sort", runner: runSheetC3C7C8GapTests },
    { title: "211. Unit Tests — Slide basics editing, placeholders undo, Tab indent, shape Enter, picture resize & sorter keys", runner: runSlidesBasicsAuditTests },
    { title: "212. CH-9.2 — AutoRecover 2 phút, dialog và Help cho 3 app", runner: runCh9AutoRecoverTests },
    { title: "213. CH-9.4 — PID ledger, orphan sweep an toàn và Help", runner: runCh9ProcessCleanupTests },
    { title: "214. CH-9.5 — JSONL hiệu năng, Options bridge, rotation và Help", runner: runCh9PerformanceLogTests },
    { title: "215. Unit Tests — VN Writer Ctrl+wheel zoom", runner: runWriterZoomWheelTests },
    { title: "216. Unit Tests — VN Writer table controls, move handle, drag resize and contextual ribbon tabs", runner: runWriterTableControlsTests },
    { title: "217. Unit Tests — VN Writer picture resize handles, aspect ratio & wrap text", runner: runWriterPictureResizeWrapTests },
    { title: "218. Unit Tests — VN Writer numbered list restart at 1 and continue numbering", runner: runWriterNumberedListRestartTests },
    { title: "219. Unit Tests — VN Writer vertical ruler and scroll/zoom synchronization", runner: runWriterVerticalRulerTests },
    { title: "220. Unit Tests — VN Writer spelling suggestions and context ranking", runner: runWriterSpellingSuggestionsTests },
    { title: "221. Unit Tests — VN Writer Clipboard Cut/Copy/Paste & Sanitization", runner: runWriterClipboardTests },
    { title: "222. Unit Tests — VN Writer font shortcut Ctrl+Shift+F & unsaved dialog keyboard navigation", runner: runWriterDocNotRunBasicsTests },
    { title: "223. Unit Tests — CH-7.2 Vietnamese spellcheck UI suggestions, 1-step undo, onReplace callback & normalizer bridge", runner: runSpellcheckUiUndoTests },
    { title: "224. Unit Tests — Sheet Grid Extent (1,048,576 rows x 16,384 columns virtualization & navigation)", runner: runSheetGridExtentTests },
    { title: "225. Unit Tests — CH-7.2 Sheet inline spellcheck, contextmenu suggestions, 1-step undo & 3-app spellcheck toggle persistence", runner: runSpellcheckInlineToggleTests },
    { title: "226. Unit Tests — CH-8.1 UI Consistency: Backstage, Recent Files, Status Bar, View Modes, Zoom & Shortcuts", runner: runCh81ConsistencyTests },
    { title: "227. Unit Tests — Office Clipboard Interop (Sheet Excel/Calc HTML, TSV, Writer Word HTML cleaning)", runner: runOfficeClipboardTests },
    { title: "228. Unit Tests — Cross-App Paste (Doc, Sheet, Slide Interoperability)", runner: runCrossAppPasteTests },
    { title: "229. Unit Tests — Writer DOCX review range export metadata", runner: runWriterReviewExportTests },
    { title: "230. Unit Tests — CH-7.3 Shared Insert Dialogs & Capabilities (Symbol, Hyperlink, Shapes, Textbox, Picture)", runner: runSharedInsertCapabilitiesTests },
    { title: "231. Unit Tests — CH-4.6 Editor Focus Keeper & Enter Button Guard (Doc, Sheet, Slide)", runner: runKeepFocusUnitTests },
    { title: "232. Unit Tests — Sheet: thanh công thức hiện ngày/giờ/phần trăm như Excel", runner: runSheetFormulaBarDisplayTests },
    { title: "233. Unit Tests — Shared Context Menu & Submenus (Doc & Sheet)", runner: runContextMenuUnitTests },
    { title: "234. Unit Tests — VN Writer interactive ruler", runner: runWriterInteractiveRulerTests },
    { title: "235. Unit Tests — Sheet auto-fit date/time on default column & currency symbol on status bar", runner: runSheetOverlapAutofitStatusTests },
    { title: "236. Unit Tests — Sheet Formula IntelliSense, Vietnamese hints & Composing visual", runner: runSheetFormulaHintsTests },
    { title: "237. Unit Tests — Sheet payload P2 equivalence and legacy rollback", runner: runSheetPayloadP2EquivalenceTests },
    { title: "238. Unit Tests — Writer section marker lookup P3 (equal to legacy regex, linear)", runner: runWriterSectionMarkerP3Tests },
    { title: "239. Unit Tests — Mouse Operations Parity & Sheet Cell Overflow", runner: runMouseOpsParityTests },
    { title: "240. Unit Tests — P8 Sheet quick view cache, format mapping and seamless transition", runner: runSheetQuickViewTests },
    { title: "241. Unit Tests — Sheet switch recomputes the virtual window (lan14 Sheet2 DOM explosion)", runner: runSheetSwitchWindowTests },
    { title: "242. Unit Tests — License key input formatting", runner: runLicenseKeyFormatTests },
    { title: "243. Unit Tests — Chunked hand-over of very large save content", runner: runUnoBridgeContentStageTests },
    { title: "244. Unit Tests — VN Writer Paragraph dialog (Đoạn văn)", runner: runWriterParagraphDialogTests },
  { title: "246. Unit Tests — VN Writer Văn bản thành bảng và Trang trắng", runner: runWriterTextToTableTests },
  { title: "246b. Unit Tests — VN Writer Picture Tools (Crop, Corrections, Compress, Reset)", runner: runWriterPictureToolsTests },
  { title: "246c. Unit Tests — VN Writer Text Effects (Outline, Shadow, Glow)", runner: runWriterTextEffectsTests },
  { title: "247. Unit Tests — i18n khóa phẳng và chuỗi dự phòng", runner: runI18nFlatKeyTests },
  { title: "248. Unit Tests — Tùy biến khu vực tiêu đề (màu/hình ảnh)", runner: runHeaderThemeTests },
  { title: "249. Unit Tests — Dán từ Word (danh sách, font, an toàn)", runner: runOfficeClipboardWordPasteTests },
    { title: "245. Unit Tests — VN Writer table ranges computed once (incremental) equal the rescanning version", runner: runWriterTableRangesIncrementalTests },
    { title: "247. Unit Tests — VN Writer Trang bìa (Cover Page)", runner: runWriterCoverPageTests },
    { title: "248. Unit Tests — VN Writer Dialogs & Keyboard Focus (TICKET D16)", runner: runWriterDialogsD16Tests },
    { title: "249. Unit Tests — VN Writer Navigation Pane", runner: runWriterNavigationPaneTests },
    { title: "250. Unit Tests — VN Writer Line Spacing Rendering & Scale", runner: runWriterLineSpacingRenderTests },
    { title: "251. Unit Tests — VN Writer Heading Styles & Shortcuts", runner: runWriterHeadingShortcutsTests },
    { title: "251b. Unit Tests — VN Writer Text Box Word Default Size (FIX-T8)", runner: runWriterTextBoxDefaultsT8Tests },
    { title: "252. Unit Tests — VN Writer Font Ladder & Sizing", runner: runWriterFontLadderTests },
    { title: "253. Unit Tests — VN Writer Paragraph Indent (1,27 cm)", runner: runWriterParagraphIndentTests },
    { title: "254. Unit Tests — VN Writer Table Edits Export", runner: runWriterTableEditsExportTests },
    { title: "255. Unit Tests — VN Office Panel Overlay & Drawer (TICKET UI-P1)", runner: runPanelOverlayUiP1Tests },
    { title: "S-X. Unit Tests — Sheet lưu XLSX giữ Gói văn bản, Căn phải và Viền (đối chiếu Excel thật)", runner: runSheetStyleExportWrapBorderAlignTests },
    { title: "U1. Unit Tests — Ctrl+B/I/U tại con trỏ không bị kiểm tra chính tả xóa kiểu sắp gõ", runner: runSpellcheckPendingStyleTests },
    { title: "S-OBJ. Unit Tests — Sheet Object Context Menu & Page Setup Sheet Tab (agy)", runner: runSheetObjectMenuTests },
    { title: "256. Unit Tests — Writer DOCX document properties metadata", runner: runWriterDocumentPropertiesTests },
    { title: "257. Unit Tests — Writer AutoCorrect and Vietnamese-safe transforms", runner: runWriterAutoCorrectTests },
    { title: "258. Unit Tests — Writer Outline, Draft Views and Collapsible Headings (WORD-W2)", runner: runWriterViewOutlineDraftTests },
    { title: "259. Unit Tests — Writer Change Case (WORD-W5)", runner: runWriterChangeCaseTests },
    { title: "260. Unit Tests — Writer Track Changes Display Modes (WORD-W5)", runner: runWriterTrackChangesDisplayTests },
    { title: "261. Unit Tests — Writer Document Inspector (WORD-W5)", runner: runWriterDocumentInspectorTests },
    { title: "262. Unit Tests — Writer WORD-W7 Balloons, Mark as Final and Save As (agy)", runner: runWriterWordW7Tests },
    { title: "263. Unit Tests — Sheet XLSX Document Properties & Mark as Final (AGY-SHEET-INFO)", runner: runSheetFileInfoTests },
    { title: "264. Unit Tests — Sheet Paste Special (values, formulas, formats, transpose, operations, skipBlanks)", runner: runSheetPasteSpecialTests },
    { title: "265. Unit Tests — Sheet Fill Justify & Alignment Styles (AGY-JUSTIFY)", runner: runSheetFillJustifyTests },
    { title: "266. Unit Tests — Sheet Arrange Z-Order, Align, Distribute, Group, Rotate/Flip, Selection Pane (AGY-ARRANGE)", runner: runSheetArrangeTests },
    { title: "267. Unit Tests — Sheet Calculation Options & Formula Parity (AGY-CALC)", runner: runSheetCalcOptionsTests },
    { title: "268. Unit Tests — Sheet External Links & Edit Links Dialog (AGY-LINKS)", runner: runSheetExternalLinksDialogTests }
  ];

  for (const suite of suites) {
    console.log(`\n▶ Đang chạy: ${suite.title}`);
    try {
      const results = await suite.runner();
      for (const res of results) {
        total++;
        if (res.pass) {
          passed++;
          console.log(`  [PASS] ${res.name}`);
        } else {
          failed++;
          console.log(`  [FAIL] ${res.name}`);
          if (res.error) {
            console.error(`    ↳ Chi tiết: ${res.error}`);
          }
        }
      }
    } catch (err) {
      console.error(`  [ERROR] Lỗi không mong muốn trong suite:`, err);
      failed++;
    } finally {
      globalThis.document = originalDocument;
      globalThis.MutationObserver = originalMutationObserver;
    }
  }

  console.log("\n==================================================");
  console.log(`KẾT QUẢ KIỂM THỬ: ${passed}/${total} PASS | ${failed} FAIL`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("Toàn bộ các bài kiểm tra đều đạt chuẩn chất lượng.");
    process.exit(0);
  }
}

runAll();
