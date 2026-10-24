# W0 — KIỂM KÊ ĐIỂM CHẠM LIBREOFFICE TRONG MÃ NGUỒN (soffice/UNO)

- **Worktree / nhánh:** `E:\VNOffice-oc-inventory` — nhánh `docs/lo-inventory-opencode` (nền `main` @ `49e8c8d8`).
- **Phạm vi:** chỉ đọc mã + viết tài liệu này; KHÔNG sửa mã; KHÔNG kill process.
- **Ngày kiểm kê:** 24/10/2026.
- **Khung đánh giá:** 5 vai trò LibreOffice theo `docs/ios/ADR-OOXMLKIT-LOI-DUNG-CHUNG.md` mục 2: (1) đọc/ghi OOXML, (2) tính công thức, (3) hiển thị/dàn trang, (4) xuất PDF/in, (5) định dạng cũ.
- **Quy tắc số liệu:** mọi con số dưới đây đều có lệnh thật đã chạy trong worktree này, ghi ngay cạnh. Số "dòng theo nhóm" của `ooxml_zip_patch.py` tính từ khoảng dòng giữa các `def` liền kề (script AST) — mang tính khoảng, độ chính xác ±vài trăm dòng.

## 1. Phương pháp

```text
git grep -n -i -E "soffice|libreoffice|pyuno|officeLoader|org\.openoffice" -- main.py adapters platform scripts apps server tools
  → Measure-Object -Line = 1081 dòng khớp; bản -l = 166 tệp
```
Phân loại: **điểm gọi thật** (soffice/UNO thực sự chạy) tách khỏi **nhãn UI/comment**. Kênh gọi tồn tại trong mã:
1. `subprocess` → `soffice --headless --convert-to/--print-to-file` (CLI, profile riêng `-env:UserInstallation`);
2. **worker UNO persistent**: `main.py` spawn python kề bên LibreOffice chạy `soffice_uno_worker.py` → soffice `--accept=pipe,name=…` → JSON-lines qua stdin/stdout;
3. UI web (JS) chỉ serialize nội dung và gọi `pywebview.api.*` — grep `child_process|spawn|execFile` trên toàn bộ JS adapter → **0 khớp spawn thật** (chỉ `RegExp .exec`).

## 2. Số liệu tổng

| Chỉ tiêu | Lệnh đã chạy | Kết quả |
|---|---|---|
| Tổng dòng khớp (bộ trên) | `… Measure-Object -Line` | **1081 dòng / 166 tệp** |
| `main.py` | `git grep -c -i -E "soffice\|libreoffice\|pyuno\|officeLoader\|org\.openoffice" -- main.py` | **195** (tệp 6.154 dòng — `(Get-Content main.py).Count`; **117** def/class — `git grep -c "^def \|^class " -- main.py`) |
| `adapters/**` | `git grep -c -i … -- adapters` | 20 tệp khớp; điểm gọi thật tập trung ở `soffice_uno_worker.py` + `ooxml_zip_patch.py` |
| `platform/**` | tương tự | 18 tệp; thật = `os_services/*`, `process_lifecycle/process_tracker.py`, `print/*` |
| `scripts/**` | `git grep -c -i -E "soffice\|libreoffice" -- scripts` | 100+ tệp oracle/audit (mục 3.6) |
| `apps/**` | `git grep -c -i -E "soffice\|libreoffice" -- apps` | 19 tệp — **toàn bộ comment/label/import adapter** |
| `ooxml_zip_patch.py` | `(Get-Content …).Count` | **31.182 dòng** |
| Hàm trong `ooxml_zip_patch.py` | `git grep -c "^def "` / `git grep -c "^class "` | **757 def + 5 class** |
| `soffice_uno_worker.py` | `(Get-Content …).Count` | **530 dòng** |

Chốt thêm: `_run_soffice_convert(` được gọi **18** chỗ trong main.py (`git grep -n "_run_soffice_convert(" -- main.py | Measure-Object -Line` = 18); `_PERSISTENT_SOFFICE.operation|view_operation` gọi **7** chỗ.

## 3. Danh mục điểm gọi chi tiết

### 3.1 `main.py` — trung tâm điều phối

#### a) Tìm engine & hồ sơ
| tệp:dòng | Hàm | Mục đích | Kênh |
|---|---|---|---|
| `main.py:763` | `find_soffice` | Chọn engine qua `platform.os_services.launcher.find_document_engine`; fallback `_legacy_find_soffice` (`:771–807` quét tools/libreoffice đóng gói, Program Files (x86), `/Applications/LibreOffice.app`, `/usr/bin/soffice`, `snap`, rồi `shutil.which`) | filesystem |
| `main.py:810` | `SOFFICE_PATH` | Đường dẫn engine dùng chung | — |
| `main.py:1399–1443` | `_profile_uri` + profile riêng | `lo-profile-<app>` cho từng app, sao chép hồ sơ seed, né MAX_PATH | filesystem |
| `main.py:4668–4671` | `engine_status` | UI hỏi engine có thật không | pywebview |

#### b) Worker UNO persistent
| tệp:dòng | Hàm | Mục đích |
|---|---|---|
| `main.py:862–870` | `_PersistentSoffice*Error` | Phân loại lỗi transport/conversion của UNO |
| `main.py:874–1019` | `_SofficeUnoWorker` | Spawn worker (`subprocess.Popen` :902 với python.exe kề bên soffice); handshake nhận `soffice_pid` :937→ `register_tree("soffice")` :941; nhận phản hồi JSON-lines :977–997 |
| `main.py:1096–1273` | `_PersistentSofficeManager` | Đóng mọi app dùng 1 worker; `convert` retry transport :1188–1221; retry riêng cho in/PDF vì driver in hay ngắt UNO :1235–1257; `release_for_cli_fallback`; `warm_profile_filter`; `shutdown` (`:3272`, `:4607–4611`, `:6128–6140`) |

#### c) CLI chuyển đổi
| tệp:dòng | Hàm | Mục đích |
|---|---|---|
| `main.py:1496–1674` | `_run_soffice_convert` | Lệnh convert thật (18 lời gọi): UNO persistent khi bật (`:1611`), **CLI là nguồn đúng khi thiếu/crash UNO** (`:1654`); `--convert-to` + temp dir; `soffice.com` trên Windows :1541–1545; phân loại lỗi `SofficeTimeout/ExitError/OutputMissing` :1662–1674 |

#### d) Vai trò (1): đọc/ghi OOXML — luồng MỞ
| tệp:dòng | Hàm | Mục đích |
|---|---|---|
| `main.py:1688–1705` | `_ooxml_zip_patch()` | Nạp module Python `ooxml_zip_patch.py` (post-process OOXML, dùng cho cả luồng chính và P1b worker) |
| `main.py:1711–1720` | `_ooxml_encryption()` | Nạp adapter mã hoá/mở mật khẩu (python thuần — không UNO) |
| `main.py:4995–5010` | mở tệp mã hoá (office_encryption) | OOXML mã hoá (Agile AES-256) → bytes thật |
| `main.py:5013–5018` | `.doc` legacy | Normalize qua filter DOCX của LibreOffice trước khi vào đường import HTML Writer |
| `main.py:5032–5040` | `make_all_sheets_visible_for_import` | XLSX nhiều sheet ẩn → cho hiện toàn bộ trước import |
| `main.py:5048–5056` | luồng convert mở tệp | `XLSX→FODS`, `DOCX→HTML`, `PPTX→FODP`; bấm giờ bước `document_open_stage phase="soffice_convert"` |
| `main.py:5035–5045` | `prefetch_sheet_open_metadata` thread | Quét metadata XLSX **song song** với convert LO (tối ưu thời gian mở) |
| `main.py:5150–5160` | `build_sheet_open_payload` | Đóng gói payload mở nhanh Sheet từ FODS (thuần Python) |
| `main.py:1797+` | hàm patch sau convert | "Patch native OOXML that LibreOffice omitted, after soffice convert": XLSX lockStructure; PPTX logo/section/show; writer đầy đủ qua `postprocess_writer_docx` |
| `main.py:2234` | restore sau mở | Trả lại cờ native LibreOffice drop (lockStructure ↔ table:structure-protected; p14:sectionLst ↔ vno:section-*) |

#### e) Vai trò (1): luồng LƯU (Save in place / Save As)
| tệp:dòng | Hàm | Mục đích |
|---|---|---|
| `main.py:2555–2583` | `_sheet_fods_for_export` | Sửa FODS TRƯỚC khi export: xuất `.xls` → hàm VND() thành text (LO không mang được add-in); `.xlsx` giữ công thức |
| `main.py:2588–2622` | `_write_save_source` + `_convert_save_source_to_native` | Route chung Lưu/Lưu-hộp/PDF/In: ghi (html/fods/fodp draft) → `_run_soffice_convert` → patch OOXML (`ooxml_zip_patch.py` restores), đo `sofficeConvertMs` :2622 |
| `main.py:1909,1977,1997,2017,2037` | convert phụ | DOCX trung gian cho chart/diagram/WordArt/watermark mới (Writer) |
| `main.py:2060–2110` | `WRITER_DOC_EXPORT_VIA_DOCX` | Xuất `.doc` cũ: docx trung gian → `prepare_writer_docx_for_legacy_doc_export` (làm phẳng mc:AlternateContent) → `soffice --convert-to doc` |

#### f) Vai trò (4): PDF / In
| tệp:dòng | Hàm | Mục đích |
|---|---|---|
| `main.py:2713–2724` | `_convert_print_source_to_pdf` | Đổi bản in gốc → PDF bằng filter tương ứng |
| `main.py:2796–2800` | `_convert_print_notes_to_pdf` | PDF trang ghi chú/notes (console_launcher) |
| `main.py:2826–2842` | `_inspect_print_pdf_pages` | Đếm trang preview: pipeline nhanh python; fallback/verify → UNO `inspect_pdf` :2835–2838 |
| `main.py:2877–2940` | `_print_pdf_to_target_file` | In vào "Microsoft Print to PDF" thẳng ra tệp không hộp thoại: `soffice --print-to-file --printer-name …` (toàn bộ command :2896–2919) |
| `main.py:2941–2945` | `_print_pdf_job` → op UNO `print_pdf` | In thật qua worker |

#### g) Vai trò (3): hiển thị/dàn trang (phần LibreOffice còn giữ)
| tệp:dòng | Hàm | Mục đích |
|---|---|---|
| `main.py:3529` | `render_page` (preview) | UNO `render_pdf_page` → PNG từng trang PDF |
| `main.py:4048–4110` | `sheet_view_open/view_window/view_close` | P8: mở giữ tài liệu XLSX trong LO headless, đọc viewport (giá trị, công thức, định dạng khối) buffer cho webview |
| `main.py:4798–4852` | prewarm worker sau first paint | Overlap cold start của LO với editing thay vì chặn lần in đầu (`VNO_PRINT_PREWARM_WORKER=0` tắt) |

#### h) Warmup & vòng đời
| tệp:dòng | Hàm | Mục đích |
|---|---|---|
| `main.py:5805–5879` | `_write_profile_warmup_docx/xlsx/pptx` | Tệp tối thiểu hợp lệ để LO đăng ký import filter |
| `main.py:5881–5914` | `_warmup_libreoffice_profiles` (CLI `--warmup-libreoffice-profiles` :5923) | Làm ấm profile Writer(html)/Sheet(fods) khi cài |
| `main.py:6032` | `VNOFFICE_DISABLE_UNO` | Tắt worker persistent (chỉ còn CLI) |
| `main.py:6128–6140` | shutdown khi app đóng | `_PERSISTENT_SOFFICE.shutdown()` — worker chấm dứt (`desktop.terminate()`), rồi dọn process tree |
| `main.py:3745` | About/acknowledgement | Chuỗi third-party "LibreOffice 7.6+" |

### 3.2 `adapters/libreoffice/common/soffice_uno_worker.py` — điểm duy nhất nắm `import uno`
Khởi động (`soffice_uno_worker.py:428–474`) — `import uno` :444 (từ program kề bên soffice), `Popen(soffice, --headless --invisible … --accept=pipe,name=… -env:UserInstallation=…)` :448–469, nối pipe qua `UnoUrlResolver` (`_connect` :38–52), lấy `com.sun.star.frame.Desktop` :473, vòng dispatch JSON-lines :494–513 (ops: shutdown/convert/inspect_pdf/render_pdf_page/print_pdf/view_open/view_window/view_close).

| op | Hàm (tệp:dòng) | Lệnh UNO thật |
|---|---|---|
| `convert` | `_convert` :59–110 | Hidden/ReadOnly + FilterName/FilterOptions :64–79 → `loadComponentFromURL` :82–83 → `storeToURL` (FilterName đích + Overwrite) :95–96 → close :100–104 |
| `inspect_pdf` | `_inspect_pdf` :150–160 | load ẩn (`_load_hidden_document` :117–129) → `getDrawPages().getCount()` :153 |
| `render_pdf_page` | `_render_pdf_page` :162–187 | `setCurrentPage` :174 → `storeToURL` FilterName=`draw_png_Export` :175–181 |
| `print_pdf` | `_print_pdf` :189–216 | `document.print(PrinterName/CopyCount/Pages/Wait)` :199–206 |
| `view_open` | `_view_open` :219–266 | `getSheets`, `createCursor`, `gotoEndOfUsedArea`, `getRangeAddress` :225–246; cache `_VIEW_DOCUMENTS` |
| `view_window` | `_view_window` :268–380 | `getCellRangeByPosition`, `getDataArray`, `getFormulaArray`, Width/Height/IsVisible :273–324; khối định dạng `_view_format_blocks` :339–356 (`getCellFormatRanges`, `getNumberFormats.getByKey`) |
| `view_close` | `_view_close` :380–392 | close(True)/dispose |
| `shutdown` | `_stop_server` :394–415 | `desktop.terminate()` + taskkill /PID |

### 3.3 `adapters/libreoffice/**` phần JS — KHÔNG gọi UNO/soffice trực tiếp
Xác minh `git grep -n -E "child_process|spawn|execFile"` trên các tệp JS → 0 spawn. Vai trò:

| tệp (dòng) | Kênh | Vai trò |
|---|---|---|
| `common/uno-bridge.js` (516) | `window.pywebview.api.*` | Cầu IPC tập trung: open/save/export_pdf/print (:367–396), P8 sheet view (:157–175), clipboard, autorecover; `dispatch` :485 chỉ forward chuỗi `.uno:` cho adapter app |
| `common/command-dispatch-mapper.js` (412) | dữ liệu | Bảng VN ↔ `.uno:` (chuỗi tham chiếu) |
| `common/ooxml-zip-patch.js` (220) | node thuần | Twin JS của patcher — dùng cho tests; khớp grep chỉ 1 comment; production chạy bản Python |
| `sheet/xlsx-native-postprocess.js` (1.066), `slides/pptx-native-postprocess.js` (377) | node test-only | 10 và 5 khớp grep — toàn comment; production chạy bản Python twin `ooxml_zip_patch.py` trong main.py |
| `common/ooxml_encryption.py` (35) | python thuần | Re-export `platform/security/office_encryption.py` |
| `sheet/sheet_open_payload.py` (431) | python thuần | Payload mở nhanh, không chạy LO |
| `writer/writer-adapter.js` (24.144) | pywebview | `serializeToFodt` :16645; save/:18551, saveAs/:18602, open/:18660, exportPdf/:18980, print/:19040 (soffice thật nằm ở Python) |
| `sheet/sheet-adapter.js` (7.950) | pywebview | `serializeToFods` :3549; save :6648; saveAs :6702; open :6779; exportPdf :6952; print :6992 |
| `slides/slides-adapter.js` (6.065) | pywebview | `serializeToFodp`; save/exportPdf/print cùng khuôn |

### 3.4 `platform/**`
| tệp:dòng | Mục đích | Kênh |
|---|---|---|
| `os_services/windows.py:31–48`, `portable.py:32–51` | `find_document_engine` — ưu tiên engine đóng gói `tools/libreoffice/program/soffice.exe`, sau Program Files x86/macOS/Linux paths/`which`; `document_profile_dir` :25–27; `native_io_path` `\\?\` :50 | filesystem |
| `process_lifecycle/process_tracker.py:135–173, 347–372` | Theo dõi/stop theo cây PID của owner (soffice/soffice.bin/uno-worker là con) — không hunt theo tên process | ctypes win32 |
| `print/print_pipeline.py:137–170` | `list_installed_printers` (PowerShell WMI); pipeline điều phối qua **callbacks** do main.py tiêm (`convert_pdf`, `convert_office_pdf`, `inspect_pdf`, `render_page`, `print_pdf`) | subprocess PowerShell |
| `print/office_com.py:136–197, 302–341` | Kênh COM MS Office thực; LibreOffice chỉ fallback (`convert_libreoffice` tiêm vào, nhãn engine `"LibreOffice"` :256, `_convert_office` :383–401) | subprocess → COM |
| `print/print-dialog.js` | Icon/label "LibreOffice" cho engine in | UI only |
| `bootstrap.js:63–68`, `autorecover/auto-recover.js`, `shell/app-shell.js:1233/2400/2440/2471/2568/2587`, `performance/performance-options.js` | Nối cầu `globalUnoBridge` → IPC | JS→IPC |
| `about/about-dialog.js:21`, `commands/*`, `shortcut-manager.js`, `shapes/shape-presets.js:4`, `clipboard/office-clipboard.js`, `single_instance.py:296`, `shell.css` | Nhãn/comment — không gọi | — |

### 3.5 `apps/**` — sạch tầng
19 tệp khớp đều là comment/label ("so sánh với LibreOffice Calc", FODS `#Trang.A1`…) hoặc import adapter (`sheet-app.js:8`, `slides-app.js:8`, `writer-app.js:8` → `adapters/libreoffice/**`). Duy nhất có đi thật ngoài adapter: `apps/writer/mail-merge.js:424,426 → open_mail_merge_data_dialog` (hộp thoại nguồn trộn thư — main.py:5357). `apps/sheet/xlsx_preview.py` chỉ đọc ZIP read-only.

### 3.6 `scripts/**` — oracle/audit/perf (không thuộc luồng production)
Đếm: `git grep -c -i -E "soffice|libreoffice" -- scripts` → 100+ tệp. Phân loại (tra `git grep -n -E "soffice|_run_soffice_convert" -- <tệp>` từng tệp):

**a) Gọi soffice CLI trực tiếp, profile cách ly riêng:**
- `audit-0610/corpus_pages_lo.py:17,47` — oracle đếm trang/ký tự trên LO headless;
- `audit_halfpoint_and_empty_paras.py:110,118` — `--convert-to docx`.

**b) Qua `main.py` (`import main` → `_run_soffice_convert` / VnOfficeApi / webview):**
- layout-audit: `_xls_compare_libreoffice.py:29`, `_roundtrip_save_sheet.py:51`, `_time_sheet_open_stages.py:60`, `_time_sheet_save_stages.py:24`, `_writer_html_probe.py:9`, `_html_docx_bisect.py:34,197–198`, `_import_drawing_loss.py:74,106,141`, `_saveback_stages.py:81,117`, `_batch_xls_roundtrip.py:22,74` (Excel COM oracle + fallback LO), `_create_new_writer.py:19,22,889`, `_slides_basic_ops.py`, `_sheet_geometry_audit.py` (Excel COM, không LO);
- perf-proto: `compare_sheet_open_p1.py:58`, `phase1_skip_initial_xf.py:70`, `phase2_stream_open.py:292–293`, `native_overlay_profile.py:170` (payload_dump.py tái dùng pipeline, không spawn);
- release: `release/build-seed-profiles.py:179` (`SOFFICE_PATH` + warmup profiles vào seed), `verify-concurrent-soffice-profiles.py:16,53`;
- test live: `test_g7_file_basics.py:440,812`, `test_live_save_in_place.py:126,144,368–440`, `test_single_instance_live.py:71`;
- misc: `export_fods.py:8`, `audit-0610/xlsx_structure_roundtrip.py:54` (CDP + đọc zip).

**c) Không chạy engine:** `gen_*_checklist.py`, `gen_slides_button_matrix.py`, `gen_font_descent_table.py` (GDI), `payload_dump.py`, `_empty_para_class.py`, `audit-0610/corpus_content_lo.py` (so sánh zip sau roundtrip), `_excel_oracle_print_pages.ps1` (Excel COM; khớp "soffice" là dương tính giả từ chuỗi `ownsOfficeProcess`).

## 4. `adapters/libreoffice/common/ooxml_zip_patch.py` — hậu xử lý OOXML (lớp "vá" bù đắp những gì LibreOffice đổi khi vòng qua ODF)

**Số liệu (lệnh thật):** `(Get-Content …).Count` → **31.182 dòng**; `git grep -c "^def "` → **757 hàm**; `git grep -c "^class "` → 5 lớp (`_TableOpenTagMatch:322`, `_SourceXfCopier:17302` — copy xf/font/fill từ XLSX gốc, `_WriterExportListParser:24486`, `_WriterCustomMultilevelHtml:30118`, `_FodsTableSpan:30419`).

**Số hàm/số dòng theo nhóm** (script AST phân loại theo tên hàm — bucket: keyword writer/sheet/slides; số dòng = tổng khoảng def→def kế):
| Nhóm | Hàm | Dòng (khoảng) |
|---|---|---|
| Sheet (XLSX↔FODS) | **333** | ≈ 13.586 |
| Writer (DOCX↔HTML) | **217** | ≈ 10.878 |
| Slides (PPTX↔FODP) | **126** | ≈ 4.786 |
| Chung (XML/ZIP, hai chiều) | **81** | ≈ 1.737 |
| Tổng | **757** | 31.182 |

Họ hàm đặc trưng: `git grep -c "^def _apply"` → **40**; `git grep -c "^def _restore\|^def restore"` → **43**; `git grep -c "^def postprocess\|^def _postprocess"` → **27**. Tổng **110** hàm (bảng dưới, gom theo app; số là dòng `def`).

Hai hướng xử lý chính: **overlay vào FODS/FODT/FODP trước khi mở** (kéo metadata OOXML gốc ra cho hiển thị đúng) và **postprocess ZIP sau khi lưu** (trả lại thứ LibreOffice bỏ/làm sai khi xuất OOXML).

### 4.1 SHEET — 46 hàm
| Hàm | Dòng | Mô tả |
|---|---|---|
| `_apply_sheet_text_boxes_to_xlsx` | 877 | Ghi lại textbox/shape từ FODS vào XLSX |
| `_apply_sheet_resolved_comments_to_xlsx` | 1155 | Trạng thái đã xử lý (resolved) từng chú thích |
| `_apply_sheet_comments_vml_to_xlsx` | 1203 | Phần VML của chú thích như Excel tạo |
| `_apply_table_metadata_from_fods` | 2967 | Tên bảng/refs/header-filter/style của Excel Table |
| `_apply_filter_database_names` | 3126 | Định danh sheet-scoped `_FilterDatabase` |
| `_restore_normal_font_and_layout` | 3637 | Font Normal, cột, sheetFormatPr, chiều cao hàng từ XLSX gốc |
| `_restore_normal_font_in_styles` | 3735 | Thay fonts[0] (Normal) bằng phần tử gốc nguyên vẹn |
| `_apply_new_workbook_defaults` | 3754 | S24: chuẩn hoá workbook mới về default Excel 2016 |
| `_restore_column_widths` | 3814 | Trả lại độ rộng cột theo digit-width font gốc (LO bỏ `<col>` bằng default) |
| `_restore_hidden_columns_and_rows_step` | 3931 | S9: khôi phục cột/hàng ẩn |
| `_restore_empty_string_cells_step` | 3968 | S13: ô chuỗi rỗng `<si><t/></si>` bị soffice bỏ |
| `_restore_literal_error_cells_step` | 4127 | S14: ô giá trị lỗi literal (#N/A…) — LO biểu diễn bằng công thức |
| `_restore_vnd_addin_cells_step` | 4330 | Ô hàm VND() (add-in `_xll.VND`) + cached text |
| `_restore_structured_formula_cells_step` | 4395 | Công thức Table[Cột] — LO xuất thành địa chỉ A1 mở rộng |
| `_restore_formula_results_and_missing_errors_step` | 4429 | Giữ kết quả cached + ô lỗi công thức LO bỏ |
| `_restore_source_sheet_names_and_states` | 4557 | Tên sheet chứa ký tự đặc biệt theo thứ tự workbook gốc |
| `_restore_sheet_zoom_step` | 4577 | zoomScale nếu LO để mặc định 100 |
| `_restore_autofilter_filter_columns_step` | 4632 | filterColumn trong autoFilter bị bỏ |
| `_restore_missing_defined_names_step` | 4701 | defined names bị bỏ khi export |
| `_restore_missing_hyperlinks_step` | 4771 | Hyperlinks + relationship bị bỏ |
| `_restore_hidden_columns_and_rows_from_source` | 4936 | S9 mở rộng tới XFD/16384 + hàng ẩn rỗng |
| `_restore_sheet_format_pr` | 5043 | sheetFormatPr (defaultColWidth/RowHeight, customHeight) |
| `_restore_row_heights` | 5077 | Chiều cao hàng (pt = height_cm × 72/2.54) |
| `_restore_source_auto_row_attrs` | 5123 | S30b: hàng auto-height giữ như gốc (bỏ customHeight) |
| `_apply_accounting_number_formats_from_fods` | 5463 | Codes kế toán chuẩn + sinh code Accounting mới |
| `_apply_scalar_concat_excel_compatibility` | 5699 | CONCAT scalar → dạng Excel cũ chấp nhận |
| `_apply_indirect_excel_compatibility` | 5736 | Giữ tham chiếu A1 dạng text cho INDIRECT sau FODS |
| `_apply_sheet_view_state_from_fods` | 5814 | Áp ngắt trang/toggle view VN vào OOXML view |
| `_restore_view_attributes_from_source_step` | 5865 | Giữ view nguồn khi người dùng không đổi |
| `_apply_workbook_view_state_from_fods` | 5924 | View cửa sổ workbook từ metadata VN |
| `_apply_refreshed_pivot_locations_from_fods` | 5989 | Căn vị trí PivotTable sau refresh + giữ selection VN |
| `_apply_sheet_chart_features_from_fods` | 6591 | Khôi phục đặc tính chart mà LO xuất khác Excel |
| `_apply_sheet_print_options_from_fods` | 6651 | Gridlines/headings/errors/page-order vào worksheet |
| `_apply_header_footer_to_worksheet` | 7014 | Header/footer worksheet XML |
| `_apply_sheet_page_setup_from_fods` | 7082 | Page setup (fit, margin, h/f) như Excel |
| `_apply_pivot_chart_links_from_fods` | 7280 | Gắn PivotChart vào PivotTable part của LO |
| `_apply_native_cell_formats_from_fods` | 7398 | Định dạng số "native" cho từng ô (từ metadata vno) |
| `_apply_sheet_document_properties_to_xlsx` | 7590 | docProps từ FODS |
| `_apply_sheet_slicers_to_xlsx` | 7907 | Slicer + relationship/content-type tương ứng |
| `_apply_sheet_theme_to_xlsx` | 8554 | Theme (clr/font scheme) vào workbook |
| `postprocess_sheet_xlsx` | 8577 | Điểm tập trung tất cả postprocess XLSX |
| `_restore_untouched_drawings_step` | 14827 | Sheet chưa đổi hình → copy drawing gốc giữ byte |
| `_restore_original_xf_for_vno_cells` | 17224 | Cell có `vno:xf` → copy xf gốc + font/fill/border/numFmt |
| `_restore_source_color_palette` | 17409 | S10: màu theo theme/indexed của tệp gốc (LO ghi theme mặc định của nó) |
| `_restore_lost_leading_newlines_step` | 18893 | Chuỗi xuống dòng đầu bị ODF chuẩn hoá |
| `postprocess_sheet_xlsx_file` | 19268 | API tệp cho luồng Save |

### 4.2 WRITER — 38 hàm
| Hàm | Dòng | Mô tả |
|---|---|---|
| `restore_docx_html_half_points_and_empty_paras` | 9222 | HTML export LO làm tròn cỡ nửa điểm (13.5pt→13) & bỏ đoạn rỗng |
| `_restore_writer_anchor_properties` | 19676 | Thuộc tính anchor (không toạ độ) khi ghép an toàn theo thứ tự |
| `_restore_writer_matched_formatting` | 20124 | pPr/rPr trực tiếp, ghép theo LCS văn bản đúng câu |
| `_restore_untouched_writer_equations` | 20707 | Đưa lại OMML thật khi HTML flatten công thức chưa được sửa |
| `_restore_writer_floating_tables` | 21060 | W27b: bảng nổi (w:tblpPr) — LO xuất thành mc:AlternateContent |
| `_restore_writer_sections_by_order` | 21123 | W40: ghép section theo thứ tự khi số sectPr khớp |
| `_restore_writer_table_properties` | 21318 | W36: tblCellMar/trHeight/tcW do LO sai lệch cao 3pt/hàng |
| `_restore_writer_page_breaks` | 21411 | W27a: ngắt trang thủ công theo thứ tự đoạn |
| `_restore_mid_document_sections` | 22073 | sectPr giữa tài liệu → LO chỉ để w:br page |
| `_apply_writer_imported_shape_mutation` | 22309 | move/resize/delete shape trên wps:wsp giữ DrawingML |
| `_apply_writer_shape_mutations_to_document` | 22517 | Cập nhật anchor gốc cho các pass di chuyển sau đó |
| `_restore_missing_writer_drawings` | 22657 | Copy anchor/inline-group LO làm rơi khi qua DOCX |
| `postprocess_writer_docx` | 22841 | Điểm tổng: ghép lại section/header-footer/định dạng trực tiếp từ DOCX gốc vào bản convert từ HTML |
| `postprocess_writer_toc_field` | 25390 | Mục lục giữ trường TOC thật khi roundtrip chỉ còn dòng chữ |
| `_restore_writer_html_page_breaks` | 25649 | W22d: ngắt trang HTML→DOCX qua bookmark `vno-untouched-N` |
| `_restore_created_writer_section_metadata` | 26168 | Metadata section bản tạo/sửa; section nguồn giữ nguyên |
| `_apply_writer_link_to_previous` | 26427 | Header/footer "Link to Previous" của Word |
| `_restore_created_writer_header_footer_refs` | 26471 | Gắn h/f import HTML vào sectPr khi LO bỏ refs |
| `postprocess_writer_section_metadata` | 26518 | Metadata section sau pass giữ source OOXML (restore structure) |
| `postprocess_created_writer_docx` | 26614 | W20: vá native cho tài liệu Writer tạo từ HTML local |
| `postprocess_writer_document_protection` | 27562 | w:documentProtection (không mã hoá gói) |
| `postprocess_writer_document_properties` | 27669 | 5 thuộc tính + contentStatus vào docProps/core.xml |
| `postprocess_writer_notes` | 27892 | footnotes/endnotes thật từ mã tạm [[VNOFN:id]] |
| `postprocess_writer_captions` | 28000 | Chú thích hình/bảng thành trường SEQ của Word |
| `postprocess_writer_schema_fixes` | 28048 | Sửa phần tử không hợp lệ schema khiến Word từ chối mở |
| `postprocess_writer_strip_markers` | 28061 | Gỡ bookmark tên vno-edited/untouched-N còn sót |
| `postprocess_writer_drop_caps` | 28087 | Chữ cái đầu đoạn thành khung `w:framePr w:dropCap` như Word |
| `postprocess_writer_merge_fields` | 28142 | «Tên» → trường MERGEFIELD |
| `postprocess_writer_if_ref_fields` | 28189 | Quy tắc trộn thư/siêu liên kết nội bộ thành trường Word |
| `postprocess_writer_page_decor` | 28362 | Viền trang w:pgBorders + màu nền trang — LO bỏ border/background của @page |
| `postprocess_writer_native_charts` | 28525 | Thay chart placeholder mới bằng chart DOCX thật (FODT phụ cung cấp object Chart) |
| `postprocess_writer_native_diagrams` | 28657 | Diagram placeholder → nhóm DrawingML |
| `postprocess_writer_native_wordart` | 28704 | WordArt placeholder → text effects DrawingML |
| `postprocess_writer_native_watermark` | 28776 | Di chuyển watermark vào header của Word |
| `postprocess_writer_review_markup` | 28864 | Bookmark review → revision/comment thật của Word |
| `postprocess_writer_picture_tools` | 29354 | Crop (`srcRect`) + độ sáng/tương phản (`lum`) |
| `postprocess_writer_text_effects` | 29512 | Hiệu ứng chữ WordML 2010: Viền chữ, Bóng đổ, Phát sáng |
| `postprocess_writer_run_effects` | 30256 | Ghi lại hiệu ứng run từ `<span data-vno-fx>` vào word/document.xml |

### 4.3 SLIDES — 26 hàm
| Hàm | Dòng | Mô tả |
|---|---|---|
| `_restore_slides_source_theme` | 11185 | Trả theme gốc khi người dùng không chọn theme VN |
| `_restore_source_masters` / `_…_unsafe` | 11276/11293 | Thay master/layout/theme của LO bằng bản gốc theo từng trang |
| `_restore_untouched_slides` / `_…_unsafe` | 11532/11545 | Trang chưa sửa → dùng slide gốc |
| `restore_notes_to_pptx` | 11991 | Sinh notesSlideN.xml còn thiếu từ dữ liệu FODP |
| `_apply_slides_hidden_shapes` | 12456 | Hình ẩn (Ngăn chọn) → `hidden="1"` trên p:cNvPr |
| `_apply_slides_media_loops` | 12492 | repeatCount của audio/video bị LO bỏ |
| `_apply_slides_native_animation_timing` | 12549 | Dựng lại p:timing theo cấu trúc PowerPoint |
| `_apply_slides_paragraph_levels` | 12718 | Giữ indent level từng đoạn |
| `_apply_slides_text_shadow` | 12848 | fo:text-shadow bỏ khi xuất PPTX |
| `_postprocess_slides_header_footer` | 13011 | Dựng lại chèn ngày/giờ/số trang đầu trang & cuối trang như placeholder thật |
| `_apply_slides_transition_effects` | 13157 | Chuyển trang LO → PPTX |
| `_apply_slides_source_transitions` | 13307 | Giữ transition gốc hoặc transition người dùng đặt |
| `_apply_slides_native_textboxes` | 13390 | Textbox native |
| `_apply_slides_native_shape_lines` | 13463 | Đường viền shape |
| `_apply_slides_native_pictures` | 13544 | Hình/viền/crop |
| `_apply_slides_native_connectors_from_fodp`/`_native_connectors` | 13667/13753 | Connector trong nhóm (LO xuất p:sp thường) |
| `_apply_slides_native_text_formatting` | 13833 | Định dạng văn bản inline |
| `_apply_native_wordart_slide_xml`/`_apply_slides_native_wordart` | 14020/14045 | WordArt |
| `_apply_slides_native_layout_types` | 14092 | Kiểu placeholder layout |
| `_restore_slides_embedded_fonts` | 14192 | Phần font nhúng LO bỏ khi ghi PPTX |
| `postprocess_slides_pptx` | 14339 | Điểm tập trung tất cả postprocess PPTX |
| `postprocess_slides_pptx_file` | 14585 | API tệp cho luồng Save |

### 4.4 CHUNG — 81 hàm còn lại
Xử lý XML/ZIP/ODF dùng chung cho 3 app: `patch_ooxml_zip:261` (đọc/ghi ZIP an toàn chuyển đổi), `_zip_entry_names:949`, `_read_zip_entry:8956`, `ensure_config_xmlns:2022`, `fods_has_structure_protection:196` & workbook protection (:196–261), `_parse_fods_text_boxes:758`, `_declares_vno_namespace:304`, `_insert_worksheet_child_in_schema_order:2181`, và ~70 helper `_xml_*`, `_column_*`, `_escape/_unescape`…

## 5. Đối chiếu 5 vai trò ADR — OOXMLKit thay được bao nhiêu

| Vai trò | Nơi LibreOffice hiện nắm | Kênh | Kết luận OOXMLKit |
|---|---|---|---|
| **(1) Đọc/ghi OOXML** | main.py (luồng MỞ `:5000–5100`, Lưu `:2588–2622`) + toàn bộ `ooxml_zip_patch.py` (757 hàm, 31.182 dòng) sau mỗi convert | worker UNO + CLI | ✅ **Thay được ngay & tốt hơn**: chuỗi hiện tại là `OOXML gốc → [convert LO] → FODS/FODP trung gian → [convert LO] → OOXML mới` + 757 hàm vá để trả lại đặc tính gốc. OOXMLKit chép byte gốc phần không sửa — bỏ được cả 2 bước convert + lớp vá trung gian *nếu* phủ khối lượng tương đương 757 hàm (mục 4) |
| **(2) Tính công thức** | cached result giữ qua `_restore_formula_results_and_missing_errors_step`; `parse/apply_calculation*` (:613–757, 1388–1476); `VND()` :2555; engine JS có sẵn `apps/sheet/formula-engine.js` | worker UNO + python | ⚠️ **Cần đấu nối**: `prefetch_sheet_open_metadata` + engine JS ↔ ooxml zip patch; giữ cached result khi lưu |
| **(3) Hiển thị/dàn trang — phần mở là LO giữ** | P8 `view_open/view_window` :4048–4110 + worker UNO :219–380 (tài liệu "held open"), payload mở nhanh `sheet_open_payload.py`, render `render_pdf_page` :3529 | worker UNO | ❌ **Chưa thay được (phần held-open)**: viewport/công thức/định dạng khối đang đọc trực tiếp từ LO; OOXMLKit cần lớp parse đầy đủ XLSX để tạo cùng cache — đây là phần lớn nhất |
| **(3b) Phần dễ** | font metrics GDI trong ooxml_zip_patch `_gdi_font_descent:18057`, `_excel_font_metrics_uncached:18140`, `_excel_row_height_from_cells:18178`, `excel_auto_row_height_px:18206` | Python+GDI | ✅ (thuần python — không LO) → OOXMLKit có thể nhúng/khép cùng dữ liệu |
| **(4) Xuất PDF / in** | export_pdf + print pipeline `:2713–2945`; UNO `print_pdf` `:189`; `--print-to-file` `:2896`; notes PDF `:2796`; `inspect_pdf` `:150` | worker UNO + CLI | ❌ **Chưa thay được** (đúng ADR mục 2 — PDF do engine dàn trang của LO); nhánh "Microsoft Print to PDF" qua CLI cũng đi qua LO |
| **(5) Định dạng cũ .doc/.xls/.ppt** | mở: `.doc → DOCX` `:5013`; `.xls/.ppt` qua filter LO khi import `:5871`; lưu: `.doc` chuỗi html→docx→doc `:2060–2110`, `xls` thông qua `_sheet_fods_for_export` `:2555`; phạm vi in thu gọn `make_print_scope_xlsx:1768` | worker UNO + CLI | ⚠️ **Cần OOXMLKit mở rộng** (thư viện đọc nhị phân .doc/.xls/.ppt) hoặc giữ LibreOffice **chỉ cho import** rồi lưu ra OOXML như ADR G5; luồng xuất .doc nên bỏ |

## 6. Kết luận nhanh

- **Thay được ngay lớp lớn nhất (vai trò 1):** toàn chuỗi `soffice --convert-to` hai chiều + 31.182 dòng patch + 530 dòng worker UNO + các route convert trong main.py — thay bằng OOXMLKit sẽ gỡ trọn kênh subprocess/pipe này (kênh 1 & 2 mục 1). Điều kiện: OOXMLKit phủ đủ những công việc mà 110 hàm `_apply_/_restore_/postprocess_*` đang làm (mục 4).
- **Cần OOXMLKit mở rộng:** engine công thức (đấu nối đã có), binary định dạng cũ (import).
- **Chưa thay được:** render/dàn trang (phần LibreOffice "held-open" + PDF/In) — đây là khối còn lại khi hết G3–G5.

## 7. Dương tính giả đáng lưu ý (đã lọc)
- Trong 166 tệp khớp tổng quát (mục 2), nhiều tệp chỉ khớp **nhãn UI** (`shell.css`, `writer.css`, `style-gallery.js`, `about-dialog.js`…) hoặc comment quy ước (`shape-presets.js:4`, `office-clipboard.js`).
- `_excel_oracle_print_pages.ps1` khớp chuỗi "soffice" là chuỗi con của `ownsOfficeProcess` — tệp là Excel COM.
- `scripts/xlsx_structure_roundtrip.py` (ngoài audit-0610) — brief có nhắc nhưng tệp **không tồn tại**; chỉ có `scripts/audit-0610/xlsx_structure_roundtrip.py`.
- `ooxml-zip-patch.js` và hai `*-native-postprocess.js` là bản Node chỉ cho tests; production chạy bản Python trong main.py.

