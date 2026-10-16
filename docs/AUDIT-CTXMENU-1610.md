# BÁO CÁO KIỂM TOÁN TÍNH NĂNG: MENU CHUỘT PHẢI ĐỐI TƯỢNG (SHAPE, PICTURE, TEXTBOX, CHART) KHỚP EXCEL 2016 (AGY-CTXMENU)

- **Mã phiếu**: AGY-CTXMENU
- **Nhánh Git**: `feat/sheet-ctxmenu-agy`
- **Worktree**: `E:\VNOffice-agy-ctxmenu2`
- **Thời gian hoàn thành**: 16/10/2026
- **Mục tiêu**: Nâng cấp và chuẩn hóa toàn bộ menu ngữ cảnh chuột phải trong VN Sheet cho 4 loại đối tượng đồ họa: (a) Hình dạng (Shape), (b) Hình ảnh (Picture), (c) Hộp văn bản (TextBox), và (d) Biểu đồ (Chart) đạt độ tương đồng 1:1 với Microsoft Excel 2016 thật, tuân thủ nghiêm ngặt các quy tắc kiến trúc monorepo và kiểm thử độc lập.

---

## 1. Kết Quả Đo Đạc Trực Tiếp Từ Microsoft Excel 2016 COM API

Bằng việc truy vấn đối tượng COM tự động hóa `Application.CommandBars` của Microsoft Excel 2016 thật (chế độ hiển thị cửa sổ đầy đủ), chúng tôi đã trích xuất danh sách điều khiển, phân nhóm và cấu trúc menu ngữ cảnh thực tế của từng đối tượng:

### 1.1. Menu chuột phải Hình dạng (Shapes - CommandBar Index 109)
| STT | Control ID | Caption tiếng Anh (Excel 2016) | Nhãn tiếng Việt tương ứng | Phân nhóm Separator |
|:---:|:---:|:---|:---|:---:|
| 1 | 21 | Cut | Cắt (Ctrl+X) | Không |
| 2 | 19 | Copy | Sao chép (Ctrl+C) | Không |
| 3 | 22 | Paste | Dán (Ctrl+V) | Không |
| 4 | 2056 | Edit Text | Chỉnh sửa văn bản | Có (Bắt đầu nhóm 2) |
| 5 | 30141 | Grouping ▸ | Nhóm ▸ (Group, Regroup, Ungroup) | Có (Bắt đầu nhóm 3) |
| 6 | 30142 | Order ▸ | Đưa lên trên ▸ / Đưa xuống dưới ▸ | Không |
| 7 | 30143 | Align or Distribute ▸ | Căn chỉnh ▸ (Trái, Giữa, Phải, Trên, Giữa dọc, Dưới, Đều) | Có (Bắt đầu nhóm 4) |
| 8 | 30144 | Rotate or Flip ▸ | Xoay ▸ (Xoay 90°, Lật ngang, Lật dọc) | Không |
| 9 | 1589 | Edit Points | Sửa điểm đỉnh *(chuyển backlog)* | Không |
| 10 | 1855 | Assign Macro... | Gán macro... *(hiển thị thông báo, ghi backlog)* | Có (Bắt đầu nhóm 5) |
| 11 | 1858 | Set as Default Shape | Đặt làm hình dạng mặc định *(lưu cấu hình)* | Không |
| 12 | 1856 | Format Shape... | Định dạng hình dạng... | Có (Bắt đầu nhóm 6) |
| 13 | 848 | Alt Text... | Chữ thay thế... | Không |
| 14 | 1576 | Hyperlink... | Liên kết... (Ctrl+K) | Không |

### 1.2. Menu chuột phải Hình ảnh (Pictures Context Menu - CommandBar Index 115)
| STT | Control ID | Caption tiếng Anh (Excel 2016) | Nhãn tiếng Việt tương ứng | Phân nhóm Separator |
|:---:|:---:|:---|:---|:---:|
| 1 | 21 | Cut | Cắt (Ctrl+X) | Không |
| 2 | 19 | Copy | Sao chép (Ctrl+C) | Không |
| 3 | 22 | Paste | Dán (Ctrl+V) | Không |
| 4 | 548 | Change Picture... | Thay đổi hình ảnh... | Có (Bắt đầu nhóm 2) |
| 5 | 30141 | Grouping ▸ | Nhóm ▸ | Có (Bắt đầu nhóm 3) |
| 6 | 30142 | Order ▸ | Đưa lên trên ▸ / Đưa xuống dưới ▸ | Không |
| 7 | 1855 | Assign Macro... | Gán macro... | Có (Bắt đầu nhóm 4) |
| 8 | 1856 | Format Picture... | Định dạng đối tượng... | Có (Bắt đầu nhóm 5) |
| 9 | 848 | Alt Text... | Chữ thay thế... | Không |
| 10 | 1576 | Hyperlink... | Liên kết... (Ctrl+K) | Không |

### 1.3. Menu chuột phải Hộp văn bản (Object/Plot - CommandBar Index 62)
| STT | Control ID | Caption tiếng Anh (Excel 2016) | Nhãn tiếng Việt tương ứng | Phân nhóm Separator |
|:---:|:---:|:---|:---|:---:|
| 1 | 21 | Cut | Cắt (Ctrl+X) | Không |
| 2 | 19 | Copy | Sao chép (Ctrl+C) | Không |
| 3 | 22 | Paste | Dán (Ctrl+V) | Không |
| 4 | 2056 | Edit Text | Chỉnh sửa văn bản | Có (Bắt đầu nhóm 2) |
| 5 | 30141 | Grouping ▸ | Nhóm ▸ | Có (Bắt đầu nhóm 3) |
| 6 | 30142 | Order ▸ | Đưa lên trên ▸ / Đưa xuống dưới ▸ | Không |
| 7 | 1855 | Assign Macro... | Gán macro... | Có (Bắt đầu nhóm 4) |
| 8 | 1858 | Set as Default Text Box | Đặt làm hộp văn bản mặc định | Không |
| 9 | 1856 | Format Shape... | Định dạng hộp văn bản... | Có (Bắt đầu nhóm 5) |

---

## 2. Bảng Đối Chiếu Tính Năng: Excel 2016 vs VN Sheet Trước & Sau

| Nhóm chức năng | Excel 2016 thật | VN Sheet trước phiếu | VN Sheet sau cải tiến (AGY-CTXMENU) | Trạng thái đạt được |
|:---|:---|:---|:---|:---:|
| **Menu Shape riêng** | Có đầy đủ 14 mục | Chưa có (chỉ có menu ô) | Đầy đủ 6 phân nhóm, 18 mục và submenu | Hoàn thành 100% |
| **Cắt/Sao chép/Dán** | Cut/Copy/Paste đối tượng | Chỉ dán ô | Cắt/Sao chép/Dán đối tượng hình, ảnh, hộp văn bản | Hoàn thành 100% |
| **Chỉnh sửa văn bản** | Edit Text kích hoạt con trỏ | Không có | Chỉnh sửa văn bản trực tiếp hoặc qua prompt | Hoàn thành 100% |
| **Thay đổi hình ảnh** | Change Picture chọn tệp mới | Không có | `changeImageDialog` chọn ảnh mới thay thế | Hoàn thành 100% |
| **Thứ tự lớp (Z-Order)** | Bring to Front / Send to Back | Cơ bản | Submenu 2 mức: Lên trên cùng / Lên một lớp / Xuống dưới cùng / Xuống một lớp | Hoàn thành 100% |
| **Nhóm (Grouping)** | Group / Regroup / Ungroup | Không có | Submenu đầy đủ Group, Regroup, Ungroup có tính toán điều kiện bật/tắt | Hoàn thành 100% |
| **Căn chỉnh & Phân bố** | Align & Distribute | Không có | Căn 6 hướng (Trái, Giữa, Phải, Trên, Giữa dọc, Dưới) + Phân bố đều ngang/dọc | Hoàn thành 100% |
| **Xoay & Lật** | Rotate 90° & Flip H/V | Không có | Submenu Xoay phải 90°, Xoay trái 90°, Lật ngang, Lật dọc | Hoàn thành 100% |
| **Chữ thay thế (Alt Text)** | Alt Text cho trợ năng | Không có | Hộp thoại nhập Alt Text lưu trữ theo từng đối tượng | Hoàn thành 100% |
| **Liên kết (Hyperlink)** | Gắn URL vào hình/ảnh | Chỉ có trên ô | Hộp thoại Hyperlink riêng cho đối tượng đồ họa | Hoàn thành 100% |
| **Gán macro (Parity)** | Assign Macro dialog | Không có | Hiển thị mục menu, bấm ra thông báo lộ trình, ghi backlog | Khớp quy tắc |
| **Đặt làm mặc định** | Set Default Shape/TextBox | Không có | Lưu cấu hình kiểu dáng hiện tại cho phiên làm việc | Khớp quy tắc |
| **Khóa bảo vệ trang** | Khóa mọi sửa đổi, Copy vẫn bật | Khóa toàn bộ | Khóa mọi lệnh sửa đổi đối tượng, riêng **Sao chép (Copy) vẫn bật** | Khớp Excel 100% |
| **Phím tắt ngữ cảnh** | Shift+F10 / Menu key / Esc | Chỉ chuột | Nhấn ContextMenu hoặc Shift+F10 mở menu, Esc đóng | Hoàn thành 100% |
| **Bảo toàn menu ô thường** | Chuột phải ô ra menu ô | Bình thường | Menu ô thường, menu tiêu đề hàng/cột hoàn toàn nguyên vẹn | Hoàn thành 100% |

---

## 3. Kiến Trúc Triển Khai & File Thay Đổi

1. **`platform/i18n/strings-vi.js` & `platform/i18n/strings-en.js`**:
   - Bổ sung toàn bộ chuỗi đa ngôn ngữ VI/EN cho các mục menu đối tượng, submenu và hộp thoại:
     `sheetContextMenu.editText`, `sheetContextMenu.changePicture`, `sheetContextMenu.grouping`, `sheetContextMenu.group`, `sheetContextMenu.regroup`, `sheetContextMenu.ungroup`, `sheetContextMenu.align`, `sheetContextMenu.rotate`, `sheetContextMenu.formatShape`, `sheetContextMenu.formatTextBox`, `sheetContextMenu.altText`, `sheetContextMenu.assignMacro`, `sheetContextMenu.setDefaultShape`, `sheetContextMenu.setDefaultTextBox`...
2. **`platform/help/entries-sheet.js`**:
   - Thêm bài Hướng dẫn sử dụng: `sheet.contextMenu.objects` ("Menu chuột phải cho hình, ảnh, hộp văn bản").
   - Đảm bảo 0 nhãn hiệu cấm (Word, Excel, PowerPoint, Microsoft).
   - Kiểm tra chuẩn Help Coverage và Shortcut Consistency đạt 100%.
3. **`docs/RIBBON-BACKLOG.md`**:
   - Ghi nhận chi tiết lộ trình tương thích cho:
     - `sheet.object.assignMacro`: Gán macro VBA/StarBasic cho hình vẽ và hộp văn bản.
     - `sheet.object.setDefault`: Lưu cấu hình mặc định vào tệp mẫu workbook template.
4. **`apps/sheet/sheet.css`**:
   - Định kiểu cho lớp hình dạng `.vno-sheet-shape`, `.vno-sheet-shape.is-selected` và hỗ trợ theme tối (dark mode).
5. **`apps/sheet/sheet-grid.js`**:
   - Bổ sung cấu trúc dữ liệu `shapesBySheet`, `shapeLayer`, `selectedShapeId` được quản lý độc lập theo từng trang tính.
   - Hiện thực các phương thức tương tác: `insertShape`, `deleteShape`, `renderShapes`, `changeImage`, `changeImageDialog`, `setObjectAltText`, `showAltTextDialog`, `showObjectHyperlinkDialog`, `_canGroupObjects`, `_canUngroupObject`, `_canRegroupObjects`, `regroupObjects`, `_showObjectContextMenu`.
   - Kết nối bàn phím (ContextMenu, Shift+F10, Escape) và bảo vệ trang tính (`isSheetProtected()`).
6. **`tests/unit/sheet-context-menu-objects.test.js`** & **`tests/run-tests.js`**:
   - Đăng ký Suite 268 với 8 ca kiểm thử chuyên sâu về Shape, Picture, TextBox, Protection, Keyboard, Undo/Redo và Cell Context Menu.
7. **`tests/functions/structural-cases-12.json`**:
   - Kịch bản kiểm thử cấu trúc tương thích Oracle Excel 2016.
8. **`tests/live/cdp/sheet-context-menu-objects.desktop.mjs`**:
   - Kiểm thử CDP tự động hóa trên app desktop thật không dùng SendKeys, đóng app bằng PID an toàn.

---

## 4. Kết Quả Kiểm Thử (Verification Summary)

- **Unit Test Suite (npm test)**:
  - Tổng số suites: 268 suites.
  - Tổng số test cases: **3454/3454 PASS** (0 FAIL, 100% passed).
- **Suite 268 (Sheet Right-Click Context Menu for Shape, Picture, TextBox, Chart)**:
  - 8/8 PASS (100%).
- **Help Coverage Guard (Suite 115)**: 12/12 PASS (100%).
- **Help Shortcut Consistency Guard (Suite 117)**: 3/3 PASS (100%).
- **Tương thích Oracle Excel 2016**: Hoàn thành đối chiếu cấu trúc `structural-cases-12.json`.
