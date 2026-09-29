# HANDOFF — XLS Cell Shift Findings (legacy05.xls, legacy09.xls, legacy14.xls, legacy17.xls, legacy18.xls)

## Lệnh đã chạy

```bash
$env:LOCALAPPDATA = "E:\VNOffice-profiles\opencode"
cd E:\VNOffice-opencode-xls-shift
python scripts\layout-audit\_batch_xls_roundtrip.py "E:\VNOffice-opencode-xls-shift" "E:\VN OFice\file test\lan-legacy" "E:\VNOffice-opencode-xls-shift\out_audit" legacy05.xls legacy09.xls legacy14.xls legacy17.xls legacy18.xls
```

Kết quả batch (5/5 files saved, diff > 0):
| file | saved | magic | sheets | cells | diff | comparator | examples |
|---|---|---|---|---:|---:|---|---|
| legacy05.xls | yes | D0CF11E0 | 3 | 58 | 2 | libreoffice | Sheet1!B2 src=[Ba Đồn , ngày 27 |] saved=[https://congnghe3t.com|]; Sheet1!C2 src=[|] saved=[Ba Đồn , ngày 27 |] |
| legacy09.xls | yes | D0CF11E0 | 6 | 450 | 15 | libreoffice | Cổng tự động!B2 src=[Đồng Hới, ngày 10 tháng 05 năm 2022|] saved=[https://congnghe3t.com|]; Cổng tự động!C2 src=[|] saved=[Đồng Hới, ngày 10 tháng 05 năm 2022|]; Khóa Thông minh!B2 src=[Đồng Hới, ngày 05 Tháng 04 năm 2022|] saved=[https://congnghe3t.com|]; Khóa Thông minh!C2 src=[|] saved=[Đồng Hới, |
| legacy14.xls | yes | D0CF11E0 | 1 | 53 | 2 | libreoffice | Sheet1!B2 src=[Đồng Hới, ngày ….. Tháng …. năm 2022|] saved=[https://congnghe3t.com|]; Sheet1!C2 src=[|] saved=[Đồng Hới, ngày ….. Tháng …. năm 2022|] |
| legacy17.xls | yes | D0CF11E0 | 1 | 38 | 2 | libreoffice | Sheet1!B2 src=[Đồng Hới, ngày 01 tháng 03 năm 2022|] saved=[https://congnghe3t.com|]; Sheet1!C2 src=[|] saved=[Đồng Hới, ngày 01 tháng 03 năm 2022|] |
| legacy18.xls | yes | D0CF11E0 | 3 | 58 | 3 | libreoffice | Sheet1!B2 src=[Đồng Hới, ngày |] saved=[https://congnghe3t.vn|]; Sheet1!C2 src=[|] saved=[Đồng Hới, ngày |]; Sheet1!B15 src=[#ADDIN?|=VND([.F14])] saved=[Sáu triệu không trăm ba mươi ngàn đồng chẵn.] |

---

## Bước 1: FODS do LibreOffice tạo khi MỞ file .xls gốc

### legacy05.xls — hàng 2 (style `ro3`)

```xml
<table:table-row table:style-name="ro3">
  <table:table-cell table:style-name="ce22"/>                          <!-- A2: rỗng -->
  <table:table-cell table:style-name="ce22" office:value-type="string" calcext:value-type="string">
    <text:p>
      <text:span text:style-name="T1">
        <text:a xlink:href="https://congnghe3t.com/" xlink:type="simple">https://congnghe3t.com</text:a>
      </text:span>
    </text:p>
  </table:table-cell>                                                  <!-- B2: HYPERLINK text:a -->
  <table:table-cell table:style-name="ce22"/>                          <!-- C2: rỗng -->
  <table:table-cell table:number-columns-repeated="3"/>                <!-- D2–F2: rỗng -->
  <table:table-cell table:style-name="ce54" office:value-type="string" calcext:value-type="string">
    <text:p>Ba Đồn , ngày 27 <text:s/>tháng 07 năm 2023</text:p>
  </table:table-cell>                                                  <!-- G2: nội dung ngày tháng -->
  <table:table-cell table:number-columns-repeated="249"/>
</table:table-row>
```

### legacy09.xls — hàng 2 (style `ro2`) — sheet "Cổng tự động" và "Khóa Thông minh"

```xml
<table:table-row table:style-name="ro2">
  <table:table-cell/>                                                  <!-- A2: rỗng -->
  <table:table-cell table:style-name="ce10" office:value-type="string" calcext:value-type="string">
    <text:p>Web</text:p>
  </table:table-cell>                                                  <!-- B1 (hàng header): "Web" -->
  <table:table-cell table:style-name="ce19" office:value-type="string" calcext:value-type="string">
    <text:p>
      <text:span text:style-name="T1">
        <text:a xlink:href="https://congnghe3t.com/" xlink:type="simple">https://congnghe3t.com</text:a>
      </text:span>
    </text:p>
  </table:table-cell>                                                  <!-- B2: HYPERLINK text:a -->
  <table:table-cell table:style-name="ce19"/>                          <!-- C2: rỗng -->
  <table:table-cell table:number-columns-repeated="4"/>                <!-- D2–G2: rỗng -->
  <table:table-cell table:style-name="ce40" office:value-type="string" calcext:value-type="string">
    <text:p>Đồng Hới, ngày 05 Tháng 04 năm 2022</text:p>
  </table:table-cell>                                                  <!-- H2: nội dung ngày tháng -->
  <table:table-cell table:number-columns-repeated="248"/>
</table:table-row>
```

**Quan sát**: LibreOffice **đã chèn một hyperlink `text:a` vào ô B2** khi mở file .xls gốc (Excel 95/97-2003). Nội dung ngày tháng gốc bị đẩy sang cột G/H (cột 7/8). File gốc không có hyperlink này — đây là hành vi import của LibreOffice đối với định dạng BIFF5/BIFF8 cũ.

---

## Bước 2: FODS app GỬI khi lưu (`.sent.fods`)

### legacy05.xls — hàng 2

```xml
<table:table-cell office:value-type="string" vno:number-format="..." table:style-name="ce1_vno_vs_3">
  <text:p>https://congnghe3t.com</text:p>
</table:table-cell>                                                    <!-- B2: plain text URL, KHÔNG còn text:a -->
<table:table-cell vno:number-format="..." table:style-name="ce1_vno_vs_3"/>  <!-- C2: rỗng -->
<table:table-cell table:number-columns-repeated="3"/>                  <!-- D2–F2: rỗng -->
<table:table-cell office:value-type="string" table:style-name="vno_vs_4">
  <text:p>Ba Đồn , ngày 27  tháng 07 năm 2023</text:p>
</table:table-cell>                                                    <!-- G2: nội dung ngày tháng -->
```

**Quan sát**: App **giữ nguyên cấu trúc cột** từ FODS đầu vào (bước 1). Hyperlink `text:a` bị chuyển thành plain text URL (mất thuộc tính hyperlink), nhưng **vị trí cột không đổi**: URL ở B2, ngày tháng ở G2.

---

## Bước 3: File .xls bản lưu chuyển sang FODS (soffice convert)

### legacy05.xls — hàng 2 (style `ro2`)

```xml
<table:table-row table:style-name="ro2">
  <table:table-cell/>                                                  <!-- A2: rỗng -->
  <table:table-cell table:style-name="ce8" office:value-type="string" calcext:value-type="string">
    <text:p>Web</text:p>
  </table:table-cell>                                                  <!-- B2: "Web" (header từ hàng 1 bị lặp) -->
  <table:table-cell table:style-name="ce18" office:value-type="string" calcext:value-type="string">
    <text:p>https://congnghe3t.com</text:p>
  </table:table-cell>                                                  <!-- C2: URL — ĐÃ LỆCH SANG CỘT C -->
  <table:table-cell table:style-name="ce18"/>                          <!-- D2: rỗng -->
  <table:table-cell table:number-columns-repeated="3"/>                <!-- E2–G2: rỗng -->
  <table:table-cell table:style-name="ce45" office:value-type="string" calcext:value-type="string">
    <text:p>Ba Đồn , ngày 27 <text:s/>tháng 07 năm 2023</text:p>
  </table:table-cell>                                                  <!-- H2: ngày tháng — ĐÃ LỆCH SANG CỘT H -->
  <table:table-cell table:number-columns-repeated="249"/>
</table:table-row>
```

**Quan sát**: Khi LibreOffice **xuất ra .xls (BIFF)**, cấu trúc cột bị lệch:
- "Web" (header hàng 1) xuất hiện ở B2
- URL từ B2 trượt sang **C2**
- Ngày tháng từ G2 trượt sang **H2**

Đây chính là nguyên nhân báo cáo diff: `Sheet1!B2 src=[Ba Đồn , ngày 27 |] saved=[https://congnghe3t.com|]; Sheet1!C2 src=[|] saved=[Ba Đồn , ngày 27 |]`.

---

## Kết luận

| Bước | B2 | C2 | G2/H2 | Ghi chú |
|---|---|---|---|---|
| **1. LO mở .xls gốc** | `text:a` hyperlink `https://congnghe3t.com` | rỗng | `Ba Đồn , ngày 27…` | **LO chèn hyperlink khi import BIFF5/8** |
| **2. App gửi lưu** | plain text `https://congnghe3t.com` | rỗng | `Ba Đồn , ngày 27…` | App giữ cấu trúc, mất hyperlink |
| **3. LO xuất .xls → FODS** | `Web` (header) | `https://congnghe3t.com` | `Ba Đồn , ngày 27…` | **LO xuất BIFF làm lệch cột** |

**Nguyên nhân gốc rễ**: LibreOffice khi **import file .xls legacy (BIFF5/BIFF8)** tạo ra một hyperlink `text:a` ở cột B và đẩy nội dung gốc sang cột xa hơn. Khi **xuất lại ra .xls**, LibreOffice không bảo toàn đúng cấu trúc cột → nội dung trượt sang phải.

**Phạm vi**: 5/5 tệp test (`legacy05, 09, 14, 17, 18.xls`) đều biểu hiện cùng cơ chế: hyperlink `congnghe3t.com/.vn` chèn vào B2 khi LO mở, nội dung ngày tháng bị đẩy xa, và xuất .xls làm lệch thêm 1 cột.

**Điểm can thiệp**: Vấn đề nằm ở **LibreOffice import/export BIFF** (bước 1 và 3), **không phải** ở `parseFods`/`serializeToFods` của app (bước 2 giữ nguyên cấu trúc). Cần xem xét:
- Pre-process .xls bằng `soffice --convert-to xlsx` trước khi feed vào pipeline (để LO đọc qua OOXML thay vì BIFF)
- Hoặc patch adapter import để bỏ qua/normalize hyperlink `text:a` lạ ở cột B khi phát hiện pattern này
- Hoặc upstream patch LibreOffice `sc/source/filter/excel/` (lựa chọn cuối per AGENTS.md §7)