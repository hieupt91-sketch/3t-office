# Báo cáo Kiểm toán và Chuẩn hóa Giao diện — Hạng mục CH-8 (3T Office)

**Ngày thực hiện:** 01/10/2026  
**Nhánh:** `feat/ch8-ui-help-consistency-agy`  
**Bộ ứng dụng kiểm toán:** 3T Doc (Văn bản), 3T Sheet (Bảng tính), 3T Slide (Trình chiếu)  
**Tiêu chuẩn quy chiếu:** `docs/SPEC-HANG-MUC-CHUNG.md` mục CH-8 (Giao diện và Trợ giúp thống nhất), `03-ui-ux/ACCESSIBILITY.md`, `03-ui-ux/UI-KIT-RULES.md`.

---

## 1. Bảng kiểm toán tổng hợp từng phần tử, từng ứng dụng (Trước và Sau khi chuẩn hóa)

| STT | Phần tử giao diện / Hành vi | Ứng dụng | Hiện trạng trước kiểm toán (Trước) | Hiện trạng sau chuẩn hóa (Sau) | Trạng thái |
|:---:|---|---|---|---|:---:|
| **1** | **Thứ tự các tab Ribbon** | **3T Doc** | `[Trang đầu, Chèn, Thiết kế, Bố cục, Tham chiếu, Trộn thư, Đánh giá, Chế độ xem, Trợ giúp, 3T AI]` | Giữ chuẩn: `[home, insert, design, layout, references, mailings, review, view, help, ai]` | **ĐẠT** |
| | | **3T Sheet** | `[Trang đầu, Công thức, Dữ liệu, Chèn, Bố trí trang, ...]` (Tab Công thức và Dữ liệu bị đẩy lên trước tab Chèn) | **Đã đảo chuẩn theo Office Suite**: `[home, insert, pageLayout, formulas, data, review, view, help, ai]` (Trang đầu → Chèn → Bố cục → Công thức → Dữ liệu → Xem lại → Xem → Trợ giúp → AI) | **ĐẠT** |
| | | **3T Slide** | `[home, insert, design, transitions, animations, slideshow, review, view, help, ai]` | Giữ chuẩn: `[Trang đầu, Chèn, Thiết kế, Chuyển tiếp, Hoạt hình, Trình chiếu, Xem lại, Xem, Trợ giúp, 3T AI]` | **ĐẠT** |
| **2** | **Khoảng cách và chiều cao Ribbon** | **Cả 3 app** | Chiều cao tab bar 34px, thân ribbon 94px, padding 0 8px; một số nút nhỏ thiếu padding đồng nhất. | Đồng nhất 100% qua token CSS `--vno-ribbon-tabs-height: 34px`, `--vno-ribbon-body-height: 94px`, khoảng cách nút chuẩn 2px/4px, icon vector chuẩn 16px/24px. | **ĐẠT** |
| **3** | **Menu Tệp Backstage** | **Cả 3 app** | Chỉ có Mới, Mở, Lưu, In, Xuất PDF, Giới thiệu; thiếu Đóng, Tùy chọn; thứ tự chưa khớp hoàn toàn. | **Đầy đủ 100% danh mục chuẩn**: Mới, Mở, Lưu, Lưu bản sao (Save As), In, Xuất PDF, Đóng, Tùy chọn (Options), Giới thiệu 3T Office / Tài khoản. | **ĐẠT** |
| **4** | **Thanh trạng thái (Status Bar)** | **3T Doc** | Trái: "Sẵn sàng \| Tiếng Việt", phải: nhãn phần trăm tĩnh hoặc thanh trượt chưa đồng bộ hai chiều. | Trái: Trang/từ ngữ, Trạng thái tài liệu, Ngôn ngữ, Bảng mã Unicode NFC; Phải: Cụm thu phóng đồng nhất (`-`, slider 50%–200%, `+`, phần trăm text). | **ĐẠT** |
| | | **3T Sheet** | Trái: Ô tọa độ, Đếm, Trung bình, Tổng cộng; Phải: chỉ có text zoom đơn giản. | Tích hợp đầy đủ cụm thanh trượt thu phóng đồng nhất giống 3T Doc và 3T Slide, đồng bộ với lưới bảng tính. | **ĐẠT** |
| | | **3T Slide** | Trái: Trang chiếu X/Y, Tỷ lệ 16:9 HD, Tiếng Việt; Phải: zoom slider thiếu nút +/- trực quan. | Tích hợp đầy đủ cụm thanh trượt thu phóng đồng nhất (`-`, slider, `+`, text %). | **ĐẠT** |
| **5** | **Thu phóng: Ctrl + lăn chuột** | **Cả 3 app** | Chỉ cuộn trang bình thường; sự kiện wheel khi giữ phím Ctrl không thay đổi tỷ lệ thu phóng hoặc bị trình duyệt can thiệp. | **Bắt sự kiện `wheel` với `ctrlKey`**: tăng/giảm bước 10%, kẹp trong ngưỡng 50% – 200%, cập nhật ngay cả hiển thị lẫn bộ điều khiển trang/lưới/slide. | **ĐẠT** |
| **6** | **Thu phóng: Phím tắt Ctrl+0** | **Cả 3 app** | Bị trình duyệt hoặc WebView2 nuốt, không đồng bộ lại slider và hiển thị tài liệu. | **Đăng ký lệnh toàn cục `common.view.zoomReset`**: nhấn Ctrl+0 lập tức đặt lại mức thu phóng về chính xác 100%, đồng bộ slider và nhãn phần trăm. | **ĐẠT** |
| **7** | **Danh sách tệp gần đây (Recent files)** | **Cả 3 app** | Mỗi app lưu định dạng khác nhau hoặc không hiển thị nút gỡ từng tệp / xóa sạch lịch sử. | Dùng chung `RecentFilesManager` trong `platform/recent/recent-manager.js`: lưu tối đa 10 tệp, có nút gỡ từng mục, nút xóa sạch lịch sử và empty-state thân thiện. | **ĐẠT** |
| **8** | **Thứ tự nút trong Hộp thoại** | **Cả 3 app** | Một số hộp thoại đặt nút Đồng ý trước Hủy; một số đặt Hủy trước Đồng ý; thiếu nhất quán. | **Chuẩn hóa toàn bộ hộp thoại**: Nút phụ/Hủy bỏ (Cancel) nằm trước, Nút chính/Đồng ý/Lưu (Primary) nằm sau cùng bên phải. | **ĐẠT** |
| **9** | **Bàn phím hộp thoại** | **Cả 3 app** | Phím Esc không đóng được một số modal; phím Enter không kích hoạt nút mặc định; phím Tab thoát ra ngoài nền. | **Chuẩn hóa Accessibility**: Enter kích hoạt nút hành động chính (hoặc nút đang focus), Esc đóng/hủy bỏ, Tab và Shift+Tab bẫy tiêu điểm (focus trap) khép kín trong modal. | **ĐẠT** |
| **10** | **KeyTips (Phím tắt Ribbon bằng Alt)** | **Cả 3 app** | Chưa có hoặc chỉ là prototype đơn giản tiếng Anh (F, H, N...), bấm một lần tắt luôn, không lùi cấp được. | **Hệ thống KeyTips 2 cấp chuẩn Office**: Alt bật/tắt; Cấp 1 hiện huy hiệu tiếng Việt trên Tabs (`T, D, C, B, M, L, S, U, P, H, X, V, G, A`); Cấp 2 mở tab và gắn huy hiệu lên các nút lệnh; Esc lùi từng cấp. | **ĐẠT** |
| **11** | **Trợ giúp F1 theo ngữ cảnh** | **Cả 3 app** | Nhấn F1 chỉ mở trang trợ giúp mặc định, không biết người dùng đang đứng ở nút ribbon hay hộp thoại nào. | **Định vị ngữ cảnh tự động**: F1 kiểm tra nút ribbon hoặc hộp thoại đang focus, tra cứu catalog và mở ngay bài hướng dẫn tương ứng; nếu không có focus cụ thể sẽ mở bài trợ giúp chung. | **ĐẠT** |
| **12** | **Trang "Có gì mới" (Release Notes)** | **Cả 3 app** | Chưa có cơ chế đọc ghi chú phát hành theo phiên bản cài đặt. | Bổ sung bài `common.help.whatsNew` và nút "Có gì mới" trong panel Trợ giúp: nạp nội dung từ `release-notes.txt` hoặc bridge Python; hiển thị thông báo tiếng Việt rõ ràng khi thiếu tệp. | **ĐẠT** |
| **13** | **Quét chuỗi hiển thị người dùng** | **Cả 3 app** | Còn sót rải rác tên cũ `VN Writer`, `VN Sheet`, `VN Slides`, `VN Office`, `VN AI` trong một số bài viết và thông báo. | Quét sạch 100% tên cũ trong `platform/i18n`, `platform/help`, `platform/ui-kit`, `apps/`; đảm bảo chỉ sử dụng tên thương hiệu chính thức: **3T Office**, **3T Doc**, **3T Sheet**, **3T Slide**. | **ĐẠT** |
| **14** | **Giao diện Sáng/Tối & Cỡ chữ** | **Cả 3 app** | Chưa có hộp thoại Tùy chọn để người dùng chỉnh cỡ chữ; chỉ có nút đổi theme nhanh trên header. | Bổ sung Hộp thoại Tùy chọn 3T Office trong Backstage (Theme Sáng/Tối + Cỡ chữ Tiêu chuẩn / Lớn / Rất lớn), áp dụng đồng bộ tức thì cho cả 3 ứng dụng qua CSS variables. | **ĐẠT** |

---

## 2. Chi tiết kỹ thuật các giải pháp đã triển khai

### 2.1. Chuẩn hóa KeyTips 2 cấp độ (CH-8.2)
- Module: `platform/ribbon/keytips.js` (`KeyTipsManager`) kết hợp `platform/commands/shortcut-manager.js`.
- Bấm và thả phím `Alt`:
  - Cấp 1 (Ribbon Tabs):
    - `T`: Menu Tệp (File)
    - `D`: Trang đầu (Home)
    - `C`: Chèn (Insert)
    - `B`: Bố cục / Bố trí trang (Layout)
    - `K`: Thiết kế (Design - Slide/Doc)
    - `M`: Công thức (Formulas - Sheet)
    - `L`: Dữ liệu (Data - Sheet)
    - `S`: Tham chiếu (References - Doc) / Trình chiếu (SlideShow - Slide)
    - `U`: Gửi thư / Trộn thư (Mailings - Doc)
    - `P`: Chuyển tiếp (Transitions - Slide)
    - `H`: Hoạt hình (Animations - Slide)
    - `X`: Xem lại / Xem xét / Đánh giá (Review)
    - `V`: Xem / Chế độ xem (View)
    - `G`: Trợ giúp (Help)
    - `A`: Trợ lý 3T AI
  - Cấp 2 (Tab Content / Backstage):
    - Tự động sinh huy hiệu phím tắt trên toàn bộ các nút lệnh, ô chọn, dropdown và dialog launcher đang hiển thị trong tab được kích hoạt.
    - Bấm ký tự để kích hoạt lệnh ngay tức khắc.
    - Nhấn `Escape` lùi từ Cấp 2 về Cấp 1; nhấn `Escape` ở Cấp 1 đóng hoàn toàn KeyTips.

### 2.2. Trợ giúp F1 theo ngữ cảnh và trang "Có gì mới" (CH-8.3)
- Module: `platform/help/help-service.js` (`findHelpEntryForContext`), `platform/help/help-panel.js`, `platform/help/entries-consistency.js`.
- Khi người dùng nhấn `F1`:
  - Tự động phân tích `document.activeElement`:
    - Nếu là nút lệnh ribbon có `data-command-id`: tra cứu bài viết theo command ID.
    - Nếu đang mở hộp thoại (`role="dialog"`, `.vno-dialog-box`): định vị đúng bài hướng dẫn cho hộp thoại đó (Tùy chọn, Giới thiệu, Ký hiệu, Tìm kiếm...).
    - Nếu đang focus tab: định vị theo tên tab.
  - Tự động mở `HelpPanel` tới đúng bài viết tương ứng.
- Trang "Có gì mới":
  - Tích hợp nút "Có gì mới" trên thanh tiêu đề panel Trợ giúp.
  - Tự động nạp tệp `release-notes.txt` phân phối cùng ứng dụng.
  - Trường hợp thiếu tệp ghi chú phát hành, hiển thị thông báo tiếng Việt lịch sự, rõ ràng.

### 2.3. Hộp thoại Tùy chọn và Đồng bộ Cỡ chữ hiển thị (CH-8.5)
- Module: `platform/theme/theme-manager.js`, `platform/theme/tokens.css`, `platform/shell/app-shell.js` (`showOptionsDialog`).
- Cung cấp 3 mức tỷ lệ kích thước chữ giao diện:
  - `normal`: Tiêu chuẩn (100%)
  - `large`: Lớn (115% - `[data-ui-font-size="large"]`)
  - `xlarge`: Rất lớn (130% - `[data-ui-font-size="xlarge"]`)
- Lưu trữ trong `localStorage` (`vno-ui-font-size`), áp dụng đồng bộ ngay lập tức cho toàn bộ giao diện 3T Doc, 3T Sheet và 3T Slide.

### 2.4. Đồng bộ Thu phóng và phím tắt Ctrl+0 (CH-8.1)
- Lắng nghe sự kiện `wheel` với `ctrlKey` ở chế độ capture trên container soạn thảo để phóng to/thu nhỏ mượt mà từng bước 10%.
- Tổ hợp phím `Ctrl+0` toàn cục kích hoạt `common.view.zoomReset`, đặt lại tỷ lệ 100%.
- Cụm điều khiển thanh trạng thái (nút `-`, slider, nút `+`, label `%`) đồng bộ 2 chiều với `WriterViewController`, `SheetGrid` và `SlidesCanvasController`.
