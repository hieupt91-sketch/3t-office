# Xac minh tinh nang Word 2016 trong VN Writer

| Tinh nang | Trang thai | Bang chung | Thieu gi |
|---|---|---|---|

## TRANG DAU (Home)

| Tinh nang | Trang thai | Bang chung | Thieu gi |
|---|---|---|---|
| Format Painter | Co | adapters/libreoffice/writer/writer-adapter.js:7956,11993-12085; apps/writer/writer-ribbon.js (UI); platform/commands/command-dispatch-mapper.js:27 | - |
| Doi hoa/thuong (Change Case) | Mot phan | platform/commands/command-dispatch-mapper.js:74 (.uno:ChangeCaseToUpper); platform/help/entries-writer.js:655 (chi "doi chu hoa", "chu thuong"); platform/i18n/strings-vi.js:733-734 (chi label subscript/superscript) | Thieu: Change Case dialog voi cac lua chon Sentence case, lowercase, UPPERCASE, Capitalize Each Word, tOGGLE cASE; shortcut Shift+F3 |
| Xoa dinh dang (Clear All Formatting) | Co | platform/ui-kit/components.js:29 (icon clearFormat); platform/commands/command-definitions.js (writer.text.clearFormat); adapters/libreoffice/writer/writer-adapter.js (execCommand clearFormat) | - |
| Subscript/Superscript | Co | adapters/libreoffice/writer/writer-adapter.js:7656-7663; platform/commands/command-definitions.js:92-93; apps/writer/writer-ribbon.js:116-117; platform/i18n/strings-vi.js:733-734; platform/help/entries-writer.js:361-362 | - |
| Text Effects | Chua co | Khong tim thay "text effect" / "TextEffect" / "writer.text.effect" trong tat ca file .js | Can them: Outline, Shadow, Reflection, Glow, Number Styles, Ligatures, Stylistic Sets |
| Highlight | Co | adapters/libreoffice/writer/writer-adapter.js:7826; platform/commands/command-definitions.js:107; apps/writer/writer-ribbon.js:120; platform/i18n/strings-vi.js:743; platform/help/entries-writer.js:365 | - |
| Font color | Co | adapters/libreoffice/writer/writer-adapter.js:7821; platform/commands/command-definitions.js:106; apps/writer/writer-ribbon.js:121; platform/i18n/strings-vi.js:742; platform/help/entries-writer.js:364 | - |
| Bullet/Numbering/Multilevel list | Co | adapters/libreoffice/writer/writer-adapter.js:194,7764-7780,9361-9362; apps/writer/writer-ribbon.js:141-153; apps/writer/writer-app.js:813-821; platform/commands/command-definitions.js:121-123; platform/i18n/strings-vi.js:714,755 | - |
| Giam/Tang thut le (Indent Dec/Inc) | Co | adapters/libreoffice/writer/writer-adapter.js:1289,1325-1342,1587-1623; apps/writer/writer-ribbon.js:156-157; apps/writer/paragraph-indent.js; platform/commands/command-definitions.js (writer.para.indentInc/Dec) | - |
| Sort paragraphs | Co | apps/writer/writer-ribbon.js:158; platform/ui-kit/icons.js:167 (paragraphSort); platform/commands/command-definitions.js (writer.para.sort) | Can kiem tra logic sort thuc te trong adapter |
| Show/Hide paragraph marks | Chua co | Chi tim thay "paragraph mark" trong word-count.js:183,389 va test; khong co command/UI toggle | Can them: command writer.para.showFormattingMarks, icon, toggle hien thi ky tu an |
| Align (trai/giua/phai/deu) | Co | adapters/libreoffice/writer/writer-adapter.js:7708-7718,9357-9359; apps/writer/writer-ribbon.js:178-180; platform/commands/command-definitions.js:110-113; platform/i18n/strings-vi.js:744-746 | - |
| Line spacing | Co | adapters/libreoffice/writer/writer-adapter.js:659,707-719,1454-1464; apps/writer/writer-ribbon.js:184-196; platform/commands/command-definitions.js:114-117; platform/i18n/strings-vi.js:396,399 | - |
| Shading | Co | adapters/libreoffice/writer/writer-adapter.js:697,1430-1432,7734-7735; apps/writer/writer-ribbon.js:199; platform/commands/command-definitions.js:132; platform/i18n/strings-vi.js:770; platform/help/entries-writer.js:685 | - |
| Borders | Co | adapters/libreoffice/writer/writer-adapter.js:698,1435-1442,7737-7738; apps/writer/writer-ribbon.js (tableBordersShading group); platform/commands/command-definitions.js (writer.para.borders, writer.table.borders*) | - |
| Styles gallery + Create/Modify/Manage Styles | Co | adapters/libreoffice/writer/writer-adapter.js:23,640,7991-7992,9294-9457; apps/writer/style-gallery.js; apps/writer/writer-app.js:35,353-532; platform/commands/command-definitions.js:103-104; platform/i18n/strings-vi.js:740,1230 | Can kiem tra: Create Style, Modify Style, Manage Styles dialog |
| Find/Replace nang cao (wildcards, format, special) | Mot phan | platform/find/find-engine.js:165 (FindReplaceEngine); platform/find/find-dialog.js:132; adapters/libreoffice/writer/writer-adapter.js:7,730-731,12528-12530; tests/unit/writer-find-replace-dom.test.js | Thieu: wildcard search, format search (font, paragraph, style), special characters (^p, ^t, ^?), "Use wildcards" checkbox, "Format" button, "Special" button |
| Select All/Select Objects | Co | adapters/libreoffice/writer/writer-adapter.js:720,7941-7942; platform/commands/command-definitions.js:30,81; platform/i18n/strings-vi.js:447; apps/writer/writer-ribbon.js:246; platform/help/entries-writer.js:1106,1376 | Select Objects rieng (chon hinh anh, bang, doi tuong) can kiem tra |

## CHEN (Insert)

| Tinh nang | Trang thai | Bang chung | Thieu gi |
|---|---|---|---|
| Cover Page | Co | adapters/libreoffice/writer/writer-adapter.js:39,734-735,8939-9041; apps/writer/cover-page.js; apps/writer/writer-ribbon.js:269-276; platform/commands/command-definitions.js:169-170; platform/i18n/strings-vi.js:807-808; platform/help/entries-writer.js:1389-1395 | - |
| Blank Page | Co | adapters/libreoffice/writer/writer-adapter.js:722,8911-8912,9045-9052; apps/writer/writer-ribbon.js:280,422; platform/commands/command-definitions.js (writer.page.blank) | - |
| Page Break | Co | adapters/libreoffice/writer/writer-adapter.js:721,7839-7844,9045-9052; apps/writer/writer-ribbon.js:280,422; platform/commands/command-definitions.js (writer.page.break); platform/ui-kit/icons.js:116 (pageBreak); command-dispatch-mapper.js:104 | - |
| Table (insert/draw/Quick Tables/convert text to table) | Mot phan | apps/writer/writer-ribbon.js:284-289 (insert, fromText); apps/writer/writer-table.js (controller); adapters/libreoffice/writer/writer-adapter.js (import/export tables); platform/commands/command-definitions.js (writer.table.*) | Thieu: Draw Table (keo thoa tao bang), Quick Tables (bang san co), Convert Text to Table dialog |
| Pictures | Co | adapters/libreoffice/writer/writer-adapter.js (import/export images); apps/writer/writer-ribbon.js (image insert); platform/commands/command-definitions.js:165 (writer.image.insert); platform/i18n/strings-vi.js:801 | - |
| Online Pictures | Chua co | Khong tim thay "online picture" / "online image" / "bing image" / "stock image" trong .js | Can them: tim kiem hinh anh tren web (Bing/Unsplash/Pexels), chen truc tiep |
| Shapes | Co | adapters/libreoffice/writer/writer-adapter.js:30,402-404,672,8056-8057,10549-10647; apps/writer/writer-illustrations.js (SHAPE_TYPES, showShapeDialog); apps/writer/writer-ribbon.shapes; platform/commands/command-definitions.js (writer.shape.insert) | - |
| SmartArt | Co | apps/writer/writer-illustrations.js:361-379 (showDiagramDialog); adapters/libreoffice/writer/writer-adapter.js:30,674,8062-8063,10567-10856; platform/commands/command-definitions.js (writer.diagram.insert); platform/i18n/strings-en.js:804; platform/help/entries-writer.js:706-710 | Ten goi la "Sơ đồ" (Diagram) thay vi "SmartArt" |
| Chart | Co | adapters/libreoffice/writer/writer-adapter.js:30,674,8062-8063,10832-10856,13268-13410; apps/writer/writer-illustrations.js (showChartDialog, generateChartHtml); platform/commands/command-definitions.js (writer.chart.insert) | - |
| Screenshot | Chua co | Chi tim thay "screenshot" trong tests/unit/3t-web.test.js:198 va server/3t-web/js/main.js:132-133 (anh preview web); khong co trong writer adapter/ribbon | Can them: chup man hinh/cua so, chen Screen Clipping |
| Hyperlink | Co | adapters/libreoffice/writer/writer-adapter.js:7,605,7950-7951,10862-10944; platform/commands/command-definitions.js:33; platform/i18n/strings-vi.js:450; platform/ui-kit/dialogs.js (showHyperlinkDialog) | - |
| Bookmark | Co | adapters/libreoffice/writer/writer-adapter.js:35,682,8083-8084,11354-11427; platform/commands/command-definitions.js:181; apps/writer/bookmark-utils.js; platform/i18n/strings-vi.js:838; platform/help/entries-writer.js (bookmark) | - |
| Cross-reference | Co | adapters/libreoffice/writer/writer-adapter.js:683,8087,11381-11439; platform/commands/command-definitions.js (writer.insert.crossReference); platform/i18n/strings-en.js:838; apps/writer/insert-dialogs.js (showCrossReferenceDialog) | - |
| Header/Footer/Page Number | Co | adapters/libreoffice/writer/writer-adapter.js (header/footer import/export); platform/commands/command-definitions.js (writer.page.headerFooter); apps/writer/page-decorations.js (showWatermarkDialog, showPageBorderDialog); apps/writer/writer-ribbon.js (Header/Footer group) | Can kiem tra: Page Number gallery (Top/Bottom/Page Margins/Current Position), Format Page Numbers dialog |
| Text Box | Co | adapters/libreoffice/writer/writer-adapter.js:676,8065-8066,10991-11047,13435-13445,14091-14092; apps/writer/writer-ribbon.js; platform/commands/command-definitions.js (writer.insert.textbox) | - |
| Quick Parts/Building Blocks | Chua co | Khong tim thay "quick part" / "building block" / "auto text" / "QuickPart" trong .js | Can them: AutoText, Document Property, Field, Building Blocks Organizer |
| WordArt | Co | adapters/libreoffice/writer/writer-adapter.js:34,405,677,678,688,8068-8069,11059-11339,13230-14152; apps/writer/writer-wordart.js (buildWriterWordArtHtml, WORDART_PRESETS, showWordArtDialog); platform/commands/command-definitions.js (writer.insert.wordart, writer.format.dropCap); command-dispatch-mapper.js:108 | - |
| Drop Cap | Co | adapters/libreoffice/writer/writer-adapter.js:678,8072,11059-11117; platform/commands/command-definitions.js (writer.format.dropCap); command-dispatch-mapper.js:109 | - |
| Signature Line | Chua co | Khong tim thay "signature line" / "SignatureLine" / "chu ky" / "digital signature" trong writer .js | Can them: Microsoft Office Signature Line, Digital Signature |
| Date & Time | Co | adapters/libreoffice/writer/writer-adapter.js:33,679,10862?; platform/ui-kit/datetime-picker.js (formatDateTime, showDateTimeDialog); platform/i18n/strings-vi.js (datetime); apps/writer/insert-dialogs.js | - |
| Object | Chua co | Khong tim thay "insert object" / "Object" / "OLE" / "embed object" trong writer .js | Can them: Insert Object dialog (Create New / Create from File), OLE embedding |
| Equation | Co | adapters/libreoffice/writer/writer-adapter.js:61,87-95,407-409,435-467,470-567,577; apps/writer/equation-editor.js; platform/commands/command-definitions.js (writer.insert.equation); platform/i18n/strings-vi.js | - |
| Symbol | Co | adapters/libreoffice/writer/writer-adapter.js:32,681; platform/ui-kit/symbol-picker.js (showSymbolPicker); platform/commands/command-definitions.js (writer.insert.symbol); platform/i18n/strings-vi.js:836; platform/help/entries-writer.js | - |

## THIET KE (Design)

| Tinh nang | Trang thai | Bang chung | Thieu gi |
|---|---|---|---|
| Themes/Colors/Fonts | Co | apps/writer/theme-gallery.js (DOCUMENT_THEMES, showThemeGalleryDialog); adapters/libreoffice/writer/writer-adapter.js:31,675,8089-8090,11491; apps/writer/writer-ribbon.js:375; platform/commands/command-definitions.js:105; platform/i18n/strings-vi.js:741; platform/help/entries-writer.js:634-636 | Theme Colors va Theme Fonts rieng (dropdown chon mau/chu rieng) can kiem tra |
| Paragraph Spacing | Co | adapters/libreoffice/writer/writer-adapter.js:699-700,1445-1480,7741-7744; platform/commands/command-definitions.js (writer.para.spacingBefore, writer.para.spacingAfter); platform/help/entries-writer.js:466; tests/unit/writer-paragraph-spacing.test.js | - |
| Watermark | Co | adapters/libreoffice/writer/writer-adapter.js:24,388,641,8032-8033,10376-10439; apps/writer/page-decorations.js (showWatermarkDialog); apps/writer/writer-ribbon.js:383,533; platform/commands/command-definitions.js (writer.page.watermark); platform/i18n/strings-vi.js (watermark) | - |
| Page Color | Co | adapters/libreoffice/writer/writer-adapter.js:24,642,8035-8036,9472-9479,10369-10373; apps/writer/page-decorations.js (showPageColorDialog); apps/writer/writer-ribbon.js:384; platform/commands/command-definitions.js (writer.page.color); platform/i18n/strings-vi.js (pageColor) | - |
| Page Borders | Co | adapters/libreoffice/writer/writer-adapter.js:24,390,655,8038-8039,10452-10490; apps/writer/page-decorations.js (showPageBorderDialog); apps/writer/writer-ribbon.js:385,534; platform/commands/command-definitions.js (writer.page.border); platform/i18n/strings-vi.js (pageBorder) | - |

## BO TRI (Layout)

| Tinh nang | Trang thai | Bang chung | Thieu gi |
|---|---|---|---|
| Margins | Co | adapters/libreoffice/writer/writer-adapter.js:656,7535-7571,8020-8024; apps/writer/page-setup-dialog.js; apps/writer/writer-ribbon.js:402; platform/commands/command-definitions.js:205; platform/i18n/strings-vi.js:856; command-dispatch-mapper.js:124 | - |
| Orientation | Co | adapters/libreoffice/writer/writer-adapter.js:656,7535-7571,8027-8030; apps/writer/page-setup-dialog.js; apps/writer/writer-ribbon.js:403; platform/commands/command-definitions.js:206; platform/i18n/strings-vi.js:857; command-dispatch-mapper.js:125 | - |
| Size | Co | adapters/libreoffice/writer/writer-adapter.js:656,7535-7571,8027-8030; apps/writer/page-setup-dialog.js; apps/writer/writer-ribbon.js:404; platform/commands/command-definitions.js:207; platform/i18n/strings-vi.js:858; command-dispatch-mapper.js:126 | - |
| Columns | Co | adapters/libreoffice/writer/writer-adapter.js:11514-11561,11842-11872; apps/writer/columns-dialog.js; platform/commands/command-definitions.js (writer.page.columns); platform/i18n/strings-vi.js (columns) | - |
| Breaks (page/column/section) | Co | adapters/libreoffice/writer/writer-adapter.js:643-653,7839-7870,9496-9749,9995-10005; apps/writer/writer-ribbon.js:423-427,437-451; platform/commands/command-definitions.js:216-217 (writer.break.column, writer.section.*); platform/i18n/strings-vi.js:868,870-873; platform/help/entries-writer.js:118 | - |
| Line Numbers | Co | adapters/libreoffice/writer/writer-adapter.js:401,11531-11561,15373; platform/commands/command-definitions.js (writer.page.lineNumbers); platform/i18n/strings-vi.js (lineNumbers); platform/help/entries-writer.js | - |
| Hyphenation | Chua co | Khong tim thay "hyphenation" / "Hyphenation" / "writer.hyphenation" / "ngat tu" / "tu ngat" trong .js | Can them: Automatic/None/Manual hyphenation, Hyphenation zone, Limit consecutive hyphens |
| Indent/Spacing | Co | adapters/libreoffice/writer/writer-adapter.js:699-700,1289-1342,1445-1480,1587-1623; apps/writer/paragraph-dialog.js; apps/writer/paragraph-indent.js; platform/commands/command-definitions.js (writer.para.indentInc/Dec, spacingBefore/After, lineSpacing) | - |
| Position/Wrap Text/Bring Forward/Align/Group/Rotate | Mot phan | adapters/libreoffice/writer/writer-adapter.js (shapes: moveShape, _renderShapes); apps/writer/writer-arrange.js (arrange commands); platform/commands/command-definitions.js (writer.arrange.*); apps/writer/writer-ribbon.js (tableAlignGroup: alignTop/Middle/Bottom) | Thieu: Position (More Layout Options), Wrap Text (Square/Tight/Through/Top and Bottom/Behind/In Front), Bring Forward/Send Backward, Group/Ungroup, Rotate (More Rotation Options) - can kiem tra writer-arrange.js |

## THAM CHIEU (References)

| Tinh nang | Trang thai | Bang chung | Thieu gi |
|---|---|---|---|
| Table of Contents | Co | adapters/libreoffice/writer/writer-adapter.js:609-610,8092-8097,18730-18803; apps/writer/writer-ribbon.js:681-682; platform/commands/command-definitions.js:239-240; platform/i18n/strings-vi.js:900-901; platform/help/entries-writer.js:305-307 | - |
| Add Text/Update Table | Co | adapters/libreoffice/writer/writer-adapter.js:610,8095-8097; platform/commands/command-definitions.js:240 (writer.reference.tocUpdate) | - |
| Footnote/Endnote | Co | adapters/libreoffice/writer/writer-adapter.js:611-612,8098-8103,19154-19467; apps/writer/writer-ribbon.js:690-691; platform/commands/command-definitions.js:241-242; platform/i18n/strings-vi.js:902-903; platform/help/entries-writer.js:858-860 | - |
| Insert Citation/Bibliography/Manage Sources | Co | adapters/libreoffice/writer/writer-adapter.js:613-616,8104-8110,19644-19712; apps/writer/citations.js; apps/writer/writer-ribbon.js:695-707; platform/commands/command-definitions.js:243-246; platform/i18n/strings-vi.js:904-907; platform/help/entries-writer.js:203-209 | - |
| Captions | Co | adapters/libreoffice/writer/writer-adapter.js:617-618,8107-8110,19966-20038; apps/writer/captions.js; apps/writer/writer-ribbon.js:715-720; platform/commands/command-definitions.js:247-249; platform/i18n/strings-vi.js:908-910; platform/help/entries-writer.js:225-230 | - |
| Insert Table of Figures | Co | adapters/libreoffice/writer/writer-adapter.js:618-619,8107-8110,20156-20214; platform/commands/command-definitions.js:248-249; platform/i18n/strings-vi.js:909-910 | - |
| Mark Entry/Insert Index | Chua co | Khong tim thay "mark entry" / "insert index" / "writer.index" / "chi muc" / "dao tu" trong .js | Can them: Mark Entry, Insert Index, Concordance file, AutoMark |

## THU/MAIL (Mailings)

| Tinh nang | Trang thai | Bang chung | Thieu gi |
|---|---|---|---|
| Envelopes | Co | apps/writer/envelopes-labels.js (showEnvelopeDialog, generateEnvelopeHtml); platform/commands/command-definitions.js (writer.mail.envelope); apps/writer/writer-ribbon.js | - |
| Labels | Co | apps/writer/envelopes-labels.js (showLabelDialog, generateLabelHtml); platform/commands/command-definitions.js (writer.mail.label); apps/writer/writer-ribbon.js | - |
| Start Mail Merge | Co | apps/writer/mail-merge.js (showMailMergeDialog, startMailMerge); apps/writer/mail-merge-data.js; apps/writer/writer-ribbon.js (mailings tab) | - |
| Select Recipients | Co | apps/writer/mail-merge.js (recipient selection); apps/writer/mail-merge-data.js (recipient data) | - |
| Insert Merge Field | Co | apps/writer/mail-merge.js (merge field insertion); apps/writer/writer-ribbon.js | - |
| Rules | Chua co | Khong tim thay "mail merge rule" / "skip record" / "next record" / "if then else" / "fill in" / "ask" / "set bookmark" trong .js | Can them: Skip Record If, Next Record If, If...Then...Else, Fill In, Ask, Set Bookmark |
| Preview Results | Co | apps/writer/mail-merge.js (preview merge results) | - |
| Finish & Merge | Co | apps/writer/mail-merge.js (finishMailMerge, mergeToNewDocument, mergeToPrinter, mergeToEmail) | - |

## XEM LAI (Review)

| Tinh nang | Trang thai | Bang chung | Thieu gi |
|---|---|---|---|
| Spelling & Grammar | Co | adapters/libreoffice/writer/writer-adapter.js (spellcheck integration); platform/text/vi-spellchecker.js; platform/text/spellcheck-dom-controller.js; apps/writer/writer-app.js:229,482,499; apps/writer/writer-ribbon.js:795; platform/commands/command-definitions.js:201 (writer.review.toggleSpellCheck); platform/i18n/strings-vi.js:854 | Grammar check (kiem tra ngap phap) chua co - chi co spellcheck tieng Viet |
| Thesaurus | Chua co | Khong tim thay "thesaurus" / "Thesaurus" / "tu dong nghia" / "synonym" trong writer .js | Can them: Thesaurus, Synonyms, Research pane |
| Word Count | Co | apps/writer/word-count.js; adapters/libreoffice/writer/writer-adapter.js:598,7607; apps/writer/writer-ribbon.js:796; platform/commands/command-definitions.js:200; platform/i18n/strings-vi.js:853; platform/help/entries-writer.js:161-163 | - |
| Translate | Chua co | Khong tim thay "translate" / "Translate" / "dich" / "translation" trong writer .js | Can them: Translate Document, Translate Selected Text, Mini Translator |
| New/Delete/Next/Previous Comment | Co | adapters/libreoffice/writer/writer-adapter.js:586-590,8294-8316; apps/writer/writer-ribbon.js:808-817; platform/commands/command-definitions.js:188-192; platform/i18n/strings-vi.js:841-845; platform/help/entries-writer.js:339-340 | - |
| Track Changes | Co | adapters/libreoffice/writer/writer-adapter.js (track changes: _activeTrackChange, _clearTrackChangeHighlight, import/export); platform/commands/command-definitions.js (writer.review.trackChanges); platform/i18n/strings-vi.js; platform/help/entries-writer.js | Can kiem tra: Track Changes on/off, Lock Tracking, Change Tracking Options |
| Simple/All Markup | Mot phan | adapters/libreoffice/writer/writer-adapter.js (track changes display); apps/writer/writer-ribbon.js (tracking display options) | Can kiem tra: Simple Markup, All Markup, No Markup, Original display modes |
| Accept/Reject | Co | adapters/libreoffice/writer/writer-adapter.js (accept/reject changes); apps/writer/writer-ribbon.js (accept/reject buttons) | - |
| Compare | Chua co | Khong tim thay "compare" / "Compare" / "writer.review.compare" / "so sanh" trong writer .js | Can them: Compare Documents, Combine Documents |
| Combine | Chua co | Khong tim thay "combine" / "Combine" / "writer.review.combine" / "hop nhat" trong writer .js | Can them: Combine revisions from multiple authors |
| Restrict Editing | Chua co | Khong tim thay "restrict editing" / "RestrictEditing" / "writer.review.restrict" / "han che chinh sua" trong writer .js | Can them: Restrict Editing, Editing Restrictions, Start Enforcement, Exceptions |

## XEM (View)

| Tinh nang | Trang thai | Bang chung | Thieu gi |
|---|---|---|---|
| Read Mode | Co | adapters/libreoffice/common/command-dispatch-mapper.js:43 (writer.view.readMode -> .uno:FullScreen); apps/writer/writer-view-controller.js (reading view); platform/commands/command-definitions.js (writer.view.readMode); platform/i18n/strings-vi.js:887 | - |
| Print Layout | Co | adapters/libreoffice/common/command-dispatch-mapper.js:41 (writer.view.printLayout -> .uno:PrintLayout); platform/commands/command-definitions.js; platform/i18n/strings-vi.js:885 | - |
| Web Layout | Co | adapters/libreoffice/common/command-dispatch-mapper.js:42 (writer.view.webLayout -> .uno:BrowseView); platform/commands/command-definitions.js; platform/i18n/strings-vi.js:886 | - |
| Outline | Chua co | Khong tim thay "outline" / "Outline" / "writer.view.outline" / "view.outline" / "dang bai" trong writer .js | Can them: Outline View, Outline level, Show/Hide Level |
| Draft | Chua co | Khong tim thay "draft" / "Draft" / "writer.view.draft" / "che do nhap" trong writer .js | Can them: Draft View (khong hien header/footer/margin) |
| Ruler | Co | adapters/libreoffice/common/command-dispatch-mapper.js:44 (writer.view.ruler -> .uno:ShowRuler); apps/writer/writer-ruler-controller.js; platform/commands/command-definitions.js; platform/i18n/strings-vi.js:888 | - |
| Gridlines | Co | adapters/libreoffice/common/command-dispatch-mapper.js:45 (writer.view.gridlines -> .uno:GridVisible); platform/commands/command-definitions.js; platform/i18n/strings-vi.js:893 | - |
| Navigation Pane | Co | apps/writer/writer-nav-pane.js; apps/writer/writer-view-controller.js:52,67; apps/writer/writer-ribbon.js:873; platform/commands/command-definitions.js (writer.view.navigationPane); platform/i18n/strings-vi.js:889; platform/help/entries-writer.js | - |
| Zoom (dialog/100%/One Page/Multiple Pages/Page Width) | Co | adapters/libreoffice/common/command-dispatch-mapper.js:35-51 (zoomIn/Out/Reset/100/PageWidth); adapters/libreoffice/writer/writer-adapter.js:16420-16769 (print preview zoom); apps/writer/writer-ribbon.js; platform/commands/command-definitions.js; platform/i18n/strings-vi.js:894-899 | One Page / Multiple Pages zoom mode can kiem tra |
| New Window | Co | adapters/libreoffice/common/command-dispatch-mapper.js:51 (writer.view.newWindow -> .uno:NewWindow); platform/commands/command-definitions.js; platform/i18n/strings-vi.js:899 | - |
| Arrange All | Chua co | Khong tim thay "arrange all" / "ArrangeAll" / "writer.view.arrange" / "sap xep tat ca" trong writer .js | Can them: Arrange All windows (tile/cascade) |
| Split | Co | adapters/libreoffice/sheet/sheet-adapter.js:401 (sheet.view.split); platform/commands/command-definitions.js (sheet.view.split); writer co the co nhuong | Can kiem tra writer.view.split |
| View Side by Side | Chua co | Khong tim thay "side by side" / "SideBySide" / "writer.view.sideBySide" / "song song" trong writer .js | Can them: View Side by Side, Synchronous Scrolling |
| Switch Windows | Chua co | Khong tim thay "switch window" / "SwitchWindow" / "writer.view.switchWindow" / "chuyen cua so" trong writer .js | Can them: Switch Windows list |
| Macros | Chua co | Khong tim thay "macro" / "Macro" / "writer.macro" / "macro manager" trong writer .js (chi co platform/commands/macro-manager.js cho platform) | Can them: View Macros, Record Macro, Macro Security |

## TEP (File)

| Tinh nang | Trang thai | Bang chung | Thieu gi |
|---|---|---|---|
| Open recent | Co | main.py (file handling); adapters/libreoffice/common/command-dispatch-mapper.js:10 (common.file.open); platform/commands/command-definitions.js | - |
| Save As (DOCX/DOC/ODT/RTF/PDF/TXT) | Mot phan | adapters/libreoffice/common/command-dispatch-mapper.js:12 (common.file.saveAs -> .uno:SaveAs); common.file.exportPdf -> .uno:ExportDirectToPDF; apps/writer/writer-adapter.js:8002-8017; main.py (file export) | Can kiem tra tat ca dinh dang: DOCX, DOC, ODT, RTF, PDF, TXT, HTML, XML |
| Print preview | Co | adapters/libreoffice/writer/writer-adapter.js:16420-16769 (openPrintPreview); apps/writer/writer-ribbon.js:543; platform/commands/command-definitions.js (writer.file.printPreview); command-dispatch-mapper.js:134 | - |
| Export PDF | Co | adapters/libreoffice/common/command-dispatch-mapper.js:13 (common.file.exportPdf -> .uno:ExportDirectToPDF); adapters/libreoffice/common/uno-bridge.js:306; main.py | - |
| Document Properties | Chua co | Khong tim thay "document property" / "DocumentProperty" / "writer.file.property" / "thuoc tinh tai lieu" trong writer .js | Can them: Document Properties dialog (General/Summary/Statistics/Contents/Custom) |
| Protect Document (password/encrypt) | Chua co | Khong tim thay "protect document" / "ProtectDocument" / "encrypt" / "mat khau" / "password" trong writer .js | Can them: Encrypt with Password, Restrict Editing, Add Digital Signature, Mark as Final |
| Inspect Document | Chua co | Khong tim thay "inspect document" / "InspectDocument" / "kiem tra tai lieu" / "document inspector" trong writer .js | Can them: Document Inspector (comments, revisions, versions, annotations, hidden text, personal info) |
| Info | Mot phan | main.py (app info); adapters/libreoffice/common/uno-bridge.js (file info) | Can kiem tra: File Info panel (Permissions, Prepare for Sharing, Versions, Browser File Sizes) |

## KHAC (Other)

| Tinh nang | Trang thai | Bang chung | Thieu gi |
|---|---|---|---|
| Tables Tools (Merge/Split cells, Cell Alignment, AutoFit, Repeat Header Rows, Sort, Formula, Table Styles, Borders) | Co | adapters/libreoffice/writer/writer-adapter.js:8431-8456,8507-8847; apps/writer/writer-table.js; apps/writer/writer-ribbon.js (tableDesign, tableLayout tabs); platform/commands/command-definitions.js (writer.table.*); platform/i18n/strings-vi.js | - |
| Picture Tools (Crop, Size, Wrap, Rotate, Corrections) | Mot phan | adapters/libreoffice/writer/writer-adapter.js (images); apps/writer/writer-arrange.js (WRAP_MODES: inline, square, tight, behind, front, topBottom); apps/writer/writer-ribbon.js (picture tools contextual tab) | Thieu: Crop (cat hinh), Corrections (Sharpen/Soften, Brightness/Contrast), Artistic Effects, Remove Background, Compress Pictures, Change Picture, Reset Picture |
| Mouse: chuot phai (van ban, bang, hinh, tieu de) | Co | apps/writer/writer-table.js (context menu); apps/writer/writer-app.js (context menus); platform/ui-kit/context-menu.js | - |
| Keo thuc (Drag & Drop) | Co | apps/writer/writer-table.js (column/row resize drag); apps/writer/writer-ruler-controller.js (marker drag); apps/writer/writer-arrange.js (shape drag) | - |
| Tab stops | Co | apps/writer/tab-stops.js; apps/writer/paragraph-dialog.js; platform/commands/command-definitions.js (writer.paragraph.tabStops, writer.format.tabStops); platform/i18n/strings-vi.js | - |
| Spell check inline | Co | platform/text/vi-spellchecker.js; platform/text/spellcheck-dom-controller.js; apps/writer/writer-app.js:229,482,499; apps/sheet/sheet-inline-spellcheck.js | - |
| AutoCorrect | Chua co | Khong tim thay "autocorrect" / "AutoCorrect" / "tu dong sua" / "tu dong thay the" trong writer .js | Can them: AutoCorrect options, Replace text as you type, Exceptions, Math AutoCorrect |
| Auto numbering | Co | adapters/libreoffice/writer/writer-adapter.js (multilevel list, numbered list); apps/writer/writer-ribbon.js:142,146-153; apps/writer/writer-app.js:814-821 | - |
| Smart quotes | Chua co | Khong tim thay "smart quote" / "SmartQuote" / "ngoac don thong minh" / "ngoac kep thong minh" trong writer .js | Can them: "Straight quotes" with "Smart quotes", AutoFormat As You Type |
| Line/page/section navigation | Co | apps/writer/writer-nav-pane.js (heading navigation); apps/writer/writer-app.js (page navigation); adapters/libreoffice/writer/writer-adapter.js (section breaks) | - |
| Track changes balloons | Mot phan | adapters/libreoffice/writer/writer-adapter.js (track changes import/export); platform/help/entries-writer.js (balloons) | Can kiem tra: Show revisions in balloons, Show only comments and formatting in balloons |
| Styles pane | Co | apps/writer/style-gallery.js (style gallery dropdown/strip); adapters/libreoffice/writer/writer-adapter.js (writer.style.gallery); apps/writer/writer-ribbon.js:228,375 | Can kiem tra: Styles pane (dong ben phai), Manage Styles, Style Inspector |
| Dictate | Chua co | Khong tim thay "dictate" / "Dictate" / "nhap bang gioi" / "voice typing" trong writer .js (X trong danh sach) | Yeu cau tinh nang AI/cloud rieng, can xin phep |