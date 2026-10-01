# HANDOFF — Chuẩn hóa tên gọi giao diện người dùng và ẩn Engine nội bộ (User-Facing Names & Engine Encapsulation)

> **Dự án**: 3T Office (Doc, Sheet, Slide)  
> **Nhiệm vụ**: Loại bỏ hoàn toàn các chuỗi hiển thị lộ tên engine nội bộ (`LibreOffice`, `soffice`, `OpenOffice`, `UNO`, `headless`, `FODT/FODS/FODP`, `command-definitions.js`...), tên sản phẩm bên thứ ba (`Microsoft`, `Word`, `Excel`, `PowerPoint`, `Office 365`, `WPS`) và tên dài dư thừa (`3T Doc`, `3T Sheet`, `3T Slide`). Chuẩn hóa tên ứng dụng thành **Doc**, **Sheet**, **Slide** và tên bộ sản phẩm là **3T Office**.  
> **Nhánh thực hiện**: `chore/user-facing-names-codex` (worktree `E:\VNOffice-codex-names`, từ `main b45684ff`).  
> **Quy chuẩn định danh (Quyết định 01/10 của Chủ sở hữu)**:
> - **A. Tên bộ sản phẩm**: Giữ tên **3T Office** cho bộ cài đặt (installer), thư mục Start Menu, mục gỡ cài đặt (uninstall), hộp thoại Giới thiệu (About), thông báo cập nhật cấp suite và tiêu đề trang web. Ở mọi nơi khác, tên ứng dụng viết ngắn gọn: **Doc**, **Sheet**, **Slide** (tuyệt đối không dùng `3T Doc`, `3T Sheet`, `3T Slide`). Định dạng tiêu đề cửa sổ: `Tài liệu 1.docx — Doc`, `Bảng tính 1.xlsx — Sheet`, `Bản trình bày 1.pptx — Slide`.
> - **B. Ẩn engine nội bộ**: Người dùng không nhìn thấy engine bên trong. Không hiển thị `LibreOffice`, `soffice`, `OpenOffice`, `UNO`, `headless`, `FODT/FODS/FODP`, cấu trúc ODF, tên tệp mã nguồn (`command-definitions.js`...). Không hiển thị tên thương mại Microsoft (`Word`, `Excel`, `PowerPoint`, `Office 365`) hoặc `WPS`; thay bằng "phần mềm văn phòng khác" hoặc tên định dạng `.docx/.xlsx/.pptx`.
> - **C. Ngoại lệ pháp lý (bắt buộc giữ)**: Ghi nhận bản quyền nguồn mở bên thứ ba trong `platform/about/about-dialog.js` và `THIRD-PARTY-NOTICES` phải giữ nguyên tên `LibreOffice` và giấy phép `MPL-2.0` theo yêu cầu pháp lý của giấy phép mã nguồn mở.

---

## 1. Danh sách các nơi chủ động giữ "3T Office" và "LibreOffice"

### 1.1. Các vị trí chủ động giữ tên bộ sản phẩm "3T Office"
1. **Bộ cài đặt Windows (`scripts/installer/vnoffice.nsi`)**:
   - Tên gói cài đặt: `3T Office`
   - Thư mục Start Menu: `3T Office`
   - Mục quản lý ứng dụng Windows (Add/Remove Programs): `3T Office`
2. **Hộp thoại Giới thiệu (`platform/about/about-dialog.js`)**:
   - Tiêu đề sản phẩm: `3T Office`
   - Bản quyền thương hiệu: `© 2024–2026 3T Technology`
3. **Tiêu đề trang web & Shell gốc (`index.html`)**:
   - Thẻ `<title>`: `3T Office — Bộ Ứng Dụng Văn Phòng Việt`
   - Nhãn danh mục chuyển đổi ứng dụng: `Bộ ứng dụng 3T Office`
4. **Tài liệu hướng dẫn triển khai & Ghi chú phát hành**:
   - `scripts/pilot/CAI-DAT.txt`: Hướng dẫn cài đặt bộ văn phòng 3T Office.
   - `release-notes.txt`: Bản tin phát hành cho bộ ứng dụng 3T Office.
5. **Thông báo hệ thống cấp suite**:
   - Thông báo bản cập nhật mới sẵn sàng cho toàn bộ 3T Office.

### 1.2. Các vị trí chủ động giữ tên "LibreOffice" (Ngoại lệ pháp lý độc quyền)
1. **Hộp thoại Giới thiệu (`platform/about/about-dialog.js`)**:
   - Dòng ghi nhận giấy phép bên thứ ba: `name: "LibreOffice", version: "7.6+", license: "MPL-2.0", purpose: "Xử lý tài liệu"`.
2. **Tệp thông cáo pháp lý bản quyền (`THIRD-PARTY-NOTICES`, `NOTICE-VI.txt`, `NOTICE-VI.rtf`)**:
   - Trích dẫn đầy đủ điều khoản giấy phép mã nguồn mở MPL-2.0 của LibreOffice.
3. **Mã nguồn nội bộ (không hiển thị tới người dùng)**:
   - Tên module kỹ thuật `adapters/libreoffice/**`, tên biến nội bộ, ghi chú giải thích kiến trúc bên dưới.

---

## 2. Bằng chứng kiểm tra trực tiếp qua CDP Desktop (Desktop Proof via CDP Only)

Kiểm tra trực tiếp trên môi trường Windows Desktop thật bằng WebView2 CDP (`tests/live/cdp/user-facing-names.mjs`) thông qua tham số `--remote-debugging-port`. Tuyệt đối không dùng bất kỳ API cấp OS nào (không SendKeys, SendInput, mouse_event, pyautogui):
- Khởi động từng ứng dụng với lệnh: `python -s main.py --app=<app>`
- Quét toàn bộ cây DOM (`TreeWalker` duyệt tất cả text node hiển thị, bỏ qua `<script>`, `<style>`, phần tử ẩn, kèm theo thuộc tính `title`, `aria-label`, `placeholder`)
- Kiểm tra 3 giai đoạn: Màn hình ban đầu, Hộp thoại Trợ giúp F1, và Hộp thoại In (Ctrl+P)
- **Kết quả: 0 vi phạm (0 matches) trên cả 3 ứng dụng Doc, Sheet, Slide.**

### Kết quả chi tiết xuất từ `docs/user-facing-names-cdp.json`:

```json
[
  {
    "app": "writer",
    "port": 49182,
    "command": "python -s main.py --app=writer",
    "browserArguments": "--remote-debugging-port=49182",
    "stages": [
      {
        "stage": "initial",
        "title": "Tài liệu 1.docx — Doc",
        "textNodes": 46,
        "attributes": 121,
        "matchCount": 0,
        "matches": []
      },
      {
        "stage": "F1 help",
        "title": "Tài liệu 1.docx — Doc",
        "textNodes": 196,
        "attributes": 142,
        "matchCount": 0,
        "matches": []
      },
      {
        "stage": "print",
        "title": "Tài liệu 1.docx — Doc",
        "textNodes": 80,
        "attributes": 143,
        "matchCount": 0,
        "matches": []
      }
    ],
    "printStatus": "Sẵn sàng in.",
    "printPreviewImages": 1
  },
  {
    "app": "sheet",
    "port": 49393,
    "command": "python -s main.py --app=sheet",
    "browserArguments": "--remote-debugging-port=49393",
    "stages": [
      {
        "stage": "initial",
        "title": "Bảng tính 1.xlsx — Sheet",
        "textNodes": 124,
        "attributes": 254,
        "matchCount": 0,
        "matches": []
      },
      {
        "stage": "F1 help",
        "title": "Bảng tính 1.xlsx — Sheet",
        "textNodes": 271,
        "attributes": 262,
        "matchCount": 0,
        "matches": []
      },
      {
        "stage": "print",
        "title": "Bảng tính 1.xlsx — Sheet",
        "textNodes": 150,
        "attributes": 263,
        "matchCount": 0,
        "matches": []
      }
    ],
    "printStatus": "Sẵn sàng in.",
    "printPreviewImages": 1
  },
  {
    "app": "slides",
    "port": 49775,
    "command": "python -s main.py --app=slides",
    "browserArguments": "--remote-debugging-port=49775",
    "stages": [
      {
        "stage": "initial",
        "title": "Bản trình bày 1.pptx — Slide",
        "textNodes": 62,
        "attributes": 131,
        "matchCount": 0,
        "matches": []
      },
      {
        "stage": "F1 help",
        "title": "Bản trình bày 1.pptx — Slide",
        "textNodes": 170,
        "attributes": 138,
        "matchCount": 0,
        "matches": []
      },
      {
        "stage": "print",
        "title": "Bản trình bày 1.pptx — Slide",
        "textNodes": 84,
        "attributes": 140,
        "matchCount": 0,
        "matches": []
      }
    ],
    "printStatus": "Sẵn sàng in.",
    "printPreviewImages": 1
  }
]
```

---

## 3. Kết quả các cổng kiểm thử (Gates Verification)

### 3.1. Master Test Runner (`node tests/run-tests.js`)
```text
==================================================
KẾT QUẢ KIỂM THỬ: 2310/2310 PASS | 0 FAIL
==================================================
Toàn bộ các bài kiểm tra đều đạt chuẩn chất lượng.
```

### 3.2. Python Unit Tests (`python -m unittest discover -s tests`)
```text
----------------------------------------------------------------------
Ran 549 tests in 393.081s

OK
```

### 3.3. Bộ quét chuỗi giao diện (`tests/unit/ui-user-visible-strings.test.js` & `tests/unit/user-visible-source-scanner.js`)
- Quét toàn bộ danh mục Trợ giúp (`platform/help/`), bản dịch song ngữ `i18n` (`vi` và `en`), nhãn Ribbon và tooltip, mã HTML hộp thoại, thông báo trạng thái, tệp mẫu tài liệu khởi tạo ban đầu, `index.html`, bộ cài `vnoffice.nsi`, hướng dẫn `CAI-DAT.txt`, `release-notes.txt`, và tiêu đề cửa sổ trong `main.py`.
- Mọi chuỗi hiển thị đều tuân thủ biểu thức kiểm soát:
  `LibreOffice|soffice|OpenOffice|\bUNO\b|headless|FOD[TSP]|Microsoft|PowerPoint|Office 365|\bWPS\b|(?<![-\w])(Word|Excel)(?![-\w])|3T (Doc|Sheet|Slide)|chuan chuan|chuẩn chuẩn|\.js\b`
- Ngoại lệ duy nhất được cho phép là mục giấy phép mã nguồn mở trong `about-dialog.js` và tệp `THIRD-PARTY-NOTICES`.

---

## 4. Trạng thái kết luận (Conclusion)

**READY TO MERGE**
- 100% yêu cầu về quy chuẩn đặt tên và che giấu engine nội bộ đã hoàn tất trọn vẹn.
- Toàn bộ 2310 bài test Node.js và 549 bài test Python đều đạt kết quả PASS 100% (0 lỗi, 0 thất bại).
- Bằng chứng kiểm tra CDP trên ứng dụng Desktop thật đạt 0 vi phạm trên cả 3 ứng dụng Doc, Sheet và Slide.
