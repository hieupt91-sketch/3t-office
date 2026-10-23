# Spec — Cầu nối WKWebView ↔ OOXMLKit (chuẩn bị Phase 7, iOS/iPadOS)

Trạng thái: **LÕI ĐÃ HIỆN THỰC + TEST (23/10)** — `OOXMLBridge` (giao thức JSON) + `OOXMLWebViewBridge` (nối WKWebView, chỉ Apple). Còn lại: nối UI/document picker thật (cần thiết bị). · 23/10/2026 · Liên quan: `ADR-OOXMLKIT-LOI-DUNG-CHUNG.md` (Mức B đã duyệt), `KE-HOACH-OOXMLKIT-PHASES.md` (Phase 7), `SPEC-MOBILE.md`.

## 1. Mục tiêu
Giao diện web hiện có (ribbon, lưới Sheet, trình soạn Doc, canvas Slide) chạy trong **WKWebView**; **OOXMLKit** (Swift, native) lo đọc/sửa/ghi tệp — **hoàn toàn trong tiến trình app, không mạng**. Spec này định nghĩa hợp đồng nhắn tin giữa hai bên để Phase 7 code theo, không phải nghĩ lại.

## 2. Kênh nhắn tin
- JS → Swift: `window.webkit.messageHandlers.ooxml.postMessage(req)` với `WKScriptMessageHandlerWithReply` (iOS 14+) → trả `Promise`. Mỗi `req` có `{id, op, args}`; Swift trả `{id, ok, result|error}`.
- Swift → JS (sự kiện, vd tiến độ lưu): `webView.evaluateJavaScript("window.ooxmlEvent(...)")`.
- Tài liệu đang mở giữ ở phía Swift bằng **handle** (chuỗi) — JS không cầm cả model, chỉ xin phần cần (một sheet, một vùng ô, một đoạn) để tiết kiệm RAM (điện thoại).

## 3. Các thao tác (op) — ánh xạ thẳng vào API OOXMLKit đã có
| op | args | result | API OOXMLKit |
|---|---|---|---|
| `open` | `{bookmark}` (security-scoped URL) | `{handle, kind, sheets|paragraphs|slides…}` | `Workbook/WordDocument/Presentation(contentsOf:)` |
| `close` | `{handle}` | `{}` | giải phóng |
| `sheet.read` | `{handle, sheet, range}` | `{cells:[{ref,value,formula,style}]}` | `Worksheet.cells`/`cell(_:)` |
| `sheet.setValue` | `{handle, sheet, ref, value}` | `{}` | `Worksheet.setValue` |
| `sheet.setFormula` | `{handle, sheet, ref, formula, cached}` | `{}` | `Worksheet.setFormula` |
| `sheet.format` | `{handle, sheet, ref, change}` | `{}` | `Worksheet.applyFormat` |
| `sheet.insertRows/deleteRows/insertCols/deleteCols` | `{handle, sheet, at, count}` | `{}` | Phase 5 API |
| `sheet.add/rename/delete` | `{handle, name|old,new}` | `{}` | `Workbook.addWorksheet/renameSheet/deleteSheet` |
| `doc.read` | `{handle, from, count}` | `{paragraphs:[{text,style,runs}]}` | `WordStory.paragraphs` |
| `doc.setText/insertPara/replace` | … | `{}` | `Paragraph.setText`, `insertParagraph`, `replaceText` |
| `slide.read/setText/addNotes/add/delete/move` | … | … | `Presentation`/`Slide` API |
| `save` | `{handle}` | `{}` (ghi nguyên tử, tự kiểm hợp lệ) | `*.save(to:)` |
| `exportBytes` | `{handle}` | `{base64}` (để chia sẻ) | `*.save()` |

`value` dùng JSON: `{t:"n|s|b|e|empty", v:…}` khớp `CellValue`. `change` khớp `CellFormatChange`.

## 4. Tệp & quyền (iOS/iPadOS)
- Mở/lưu qua `UIDocumentPickerViewController` + `UIDocument`/`NSFileCoordinator`; giữ **security-scoped bookmark** để mở lại (iCloud Drive/Files). JS chỉ thấy `bookmark`, không thấy đường dẫn thật.
- Lưu tự động khi app vào nền (`scenePhase`), dùng `save(to:)` nguyên tử sẵn có.
- Tính công thức: gọi engine JS `apps/sheet/formula-engine.js` trong WebView để điền `cached` trước khi `setFormula` (OOXMLKit không tự tính).

## 5. Bộ nhớ (điện thoại)
- Không trả cả sheet 300k ô một lần: `sheet.read` theo `range` (ô nhìn thấy + đệm). OOXMLKit giữ DOM; cân nhắc giới hạn kích thước tệp mở trực tiếp (cảnh báo khi >~20–50 MB) — đo trên thiết bị thật (Phase 6b).

## 6. Hướng dẫn sử dụng (bắt buộc — AGENTS.md §10)
Mỗi thao tác mở ra cho người dùng (mở/lưu/chia sẻ, sửa ô, định dạng, chèn/xóa hàng…) phải kèm nội dung Trợ giúp tiếng Việt khi làm UI: làm gì, chạm ở đâu, các bước. Viết cùng lúc với tính năng, không để sau.

## 7. Việc Phase 7 (khi duyệt)
1. Lớp `OOXMLBridge` (Swift) hiện thực §3 + test đơn vị cho từng op (không cần UI).
2. Nhúng WebView + handler; mở/lưu qua document picker; lưu tự động.
3. Bố cục cảm ứng iPhone (một cột) và iPad (Split View, bàn phím rời, Pencil).
4. Trợ giúp tiếng Việt cho từng thao tác.
5. Thứ tự: **Sheet → Doc → Slide** (giá trị cao nhất trước).
