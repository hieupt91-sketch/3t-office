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