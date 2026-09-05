# Agent Handoff
TASK: Inline LibreOffice HTML sidecar images as data URIs in `main.py` `open_document_dialog()` before TemporaryDirectory deletes them (Writer File → Mở).
AGENT/ROLE: Grok (Integration / Python desktop shell)
BRANCH: `fix/mainpy-inline-image-sidecar`
WORKTREE: `E:\VNOffice-grok-mainpy-image-sidecar`
OBJECTIVE: Khi người dùng mở DOCX có ảnh trên bản Desktop thật, HTML trả về JS phải chứa `data:` URI (không còn `src` trỏ file PNG sidecar đã bị xóa). Chỉ sửa `main.py` (root). Không đụng `adapters/**`, `apps/**`, `platform/**`. Không merge `main`.

---

## Plan gate

- **Objective:** port `inlineHtmlImages()` từ `tests/helpers/soffice-convert.mjs` sang Python, gọi **sau** khi đọc `.html` và **trước** khi thoát `with tempfile.TemporaryDirectory`.
- **Current capability trước task:** round 2 đã chứng minh adapter/UI hiển thị ảnh đúng khi HTML đã có data URI. `main.py` chỉ đọc chuỗi HTML rồi xóa temp dir → sidecar mất trên đường đi production.
- **Files/modules:** `main.py` (`_inline_html_images` + 1 lần gọi Writer), `tests/test_mainpy_image_inline.py`, handoff này.
- **Dependency:** stdlib `base64` / `html` / `re`; integration test cần `soffice` + fixture `sample-writer-image.docx`. Không thư viện trả phí.
- **Risk:** regex `<img>` không đụng Sheet FODS / Slides FODP; file `http(s)` hoặc sidecar thiếu giữ nguyên tag.
- **Test plan:** unit (bytes PNG khớp), mock `open_document_dialog` (temp dir đã xóa, data URI còn), integration soffice thật. `node tests/run-tests.js` không được regress.
- **Rollback:** revert branch; không đụng Core / frontend.

---

## FINDINGS

Worktree xác nhận **trước khi sửa**:

| Mục | Giá trị |
|---|---|
| Thư mục | `E:\VNOffice-grok-mainpy-image-sidecar` |
| Branch | `fix/mainpy-inline-image-sidecar` |
| HEAD = `main` | `6c3f062` Merge branch `fix/real-office-file-import-fidelity-round2` |
| Working tree | sạch, tách từ `main`, không merge |

JS tham chiếu (`tests/helpers/soffice-convert.mjs` `inlineHtmlImages`):

1. Regex `<img>`, lấy `src`.
2. Bỏ qua nếu `src` đã là `data:`.
3. Decode `&amp;` / HTML entity, ghép với `dirname(htmlPath)`.
4. Đọc bytes file, `base64`, MIME theo đuôi (png/jpeg/gif, mặc định png).
5. Không thấy file → giữ nguyên tag.

`open_document_dialog()` trước đây:

```
with TemporaryDirectory as tmp:
    soffice convert DOCX → HTML (+ sidecar PNG trong tmp)
    content = read(.html)
# tmp bị xóa ở đây → sidecar không còn
return content  # <img src="sample-writer-image_html_….png">
```

`--app` / `parse_launch_args` / `save_document_dialog` / Sheet / Slides **không đổi**.

---

## IMPLEMENTATION SUMMARY

1. Thêm `main._inline_html_images(html_text, html_path)` — port logic JS, dùng `base64.b64encode` stdlib, `html.unescape` trước khi ghép đường dẫn.
2. Trong `open_document_dialog()`, **bên trong** `with tempfile.TemporaryDirectory`, ngay sau `content = f.read()`, chỉ khi `app_kind == "writer"`:

   `content = _inline_html_images(content, out_path)`

3. Sheet/Slides không gọi hàm này (FODS/FODP). Sidecar thiếu / `http` / `https` / `data:` sẵn: giữ nguyên, không crash.

Không sửa LibreOffice Core. Không sửa frontend.

---

## FILES CHANGED

- `main.py` — `_inline_html_images` + 1 lần gọi Writer trong `open_document_dialog`
- `tests/test_mainpy_image_inline.py` — unit bytes-match, mock thứ tự tempdir, integration DOCX thật
- `docs/HANDOFF-MAINPY-IMAGE-SIDECAR-INLINE.md` — handoff này

Không đụng: `adapters/**`, `apps/**`, `platform/**`, `save_document_dialog`, launch `--app`.

---

## COMMANDS RUN

```
python -m py_compile main.py tests/test_mainpy_image_inline.py tests/test_desktop_launch.py
python -m unittest tests.test_mainpy_image_inline tests.test_desktop_launch -v
node tests/run-tests.js
```

Không SendKeys. Không merge `main`.

---

## BUILD RESULT: NOT RUN

Không đổi build system. `python -m py_compile` các file Python liên quan: **PASS**.

---

## TEST RESULTS

| Suite | Lệnh | Kết quả |
|---|---|---|
| Python inline + desktop launch | `python -m unittest tests.test_mainpy_image_inline tests.test_desktop_launch -v` | **12/12 PASS, 4.957s** |
| Master unit/smoke JS | `node tests/run-tests.js` | **711/711 PASS, 0 FAIL, 18.68s** (< 60s) |

Chi tiết Python:

| Test | Ý nghĩa | Kết quả |
|---|---|---|
| `test_sidecar_png_becomes_data_uri_matching_original_bytes` | HTML giả + PNG thật cạnh nhau; data URI decode **khớp từng byte** file gốc | PASS |
| `test_existing_data_uri_is_left_alone` | `src` đã là data URI | PASS |
| `test_missing_and_http_src_keep_original_tag` | sidecar thiếu + `https://` giữ nguyên | PASS |
| `test_html_entity_in_src_is_decoded_before_join` | `logo &amp; mark.png` tìm đúng file | PASS |
| `test_jpeg_and_gif_mime_from_extension` | MIME jpeg/gif | PASS |
| `test_writer_inlines_sidecar_before_tempdir_is_deleted` | mock soffice; sau khi `open_document_dialog` **temp dir đã xóa** nhưng HTML vẫn data URI, bytes khớp | PASS |
| `test_sheet_open_does_not_inline_html_images` | Sheet FODS không bị đụng | PASS |
| `test_real_docx_html_has_data_uri_not_sidecar_path` | `VnOfficeApi("writer", sample-writer-image.docx).open_document_dialog("writer")` — soffice **thật**; HTML có `data:image/png;base64,`, **không** còn `src="….png"` tương đối; payload bắt đầu `\x89PNG` | PASS |
| 4 test `tests.test_desktop_launch` | `--app`, file path, profile, initial_file Sheet | PASS (không regress) |

Test tích hợp thật **không** mở hộp thoại native: tái sử dụng `initial_file` (cùng đường đi convert + đọc HTML + inline + xóa temp) với fixture `tests/fixtures/real-office-samples/sample-writer-image.docx`.

---

## MANUAL TEST ON A REAL MACHINE

Môi trường agent **không** chạy được UI Desktop tương tác: hộp thoại Mở file native của Windows cần người dùng; SendKeys bị cấm. Thay thế bằng test tự động ở trên (cùng hàm `open_document_dialog()`, cùng soffice, cùng fixture ảnh).

Khi kiểm tra tay trên máy thật:

1. Terminal 1: `node scripts/serve.js`
2. Terminal 2: `python main.py --app=writer`
3. File → Mở (hộp thoại Windows thật) → chọn một `.docx` có ảnh nhúng (có thể dùng `tests/fixtures/real-office-samples/sample-writer-image.docx`).
4. Kỳ vọng: ảnh hiện đúng trong thân văn bản, không ô trống / icon vỡ.
5. (Tùy chọn) DevTools / inspect `<img>`: `src` bắt đầu `data:image/png;base64,`, không phải `something_html_….png`.

Không cần `--app` nếu mở suite rồi chọn Writer; với bản Desktop three-app, `--app=writer` là đường đi production.

---

## KNOWN FAILURES / LIMITATIONS

1. **Hộp thoại Mở file native** vẫn chỉ Desktop App. Playwright live round 2 vẫn stub sau soffice — không đổi trong task này.
2. Ảnh `http(s)` bên ngoài không được tải về (giữ nguyên URL). Đúng spec.
3. Sheet/Slides không inline (không dùng HTML StarWriter khi mở).
4. MIME mặc định `image/png` cho đuôi lạ (bmp/webp/…) — cùng JS helper.
5. **Chưa test UI pywebview bằng tay** trong session agent (không SendKeys, không điều khiển dialog native). Bằng chứng thay thế: unittest gọi đúng `open_document_dialog()` + soffice thật.

---

## RISKS

Thấp. Một lần gọi Writer, stdlib only. Regex không đụng FODS/FODP. 711 JS PASS. 12 Python PASS.

---

## DEPENDENCIES/BLOCKERS

Không. `soffice.exe` sẵn trên máy test. Không thư viện trả phí. Không SendKeys. Không Core patch.

---

## CORE PATCH ID (if any): N/A

---

## NEXT ACTION

**KHÔNG merge vào main.** Review trên `fix/mainpy-inline-image-sidecar` / worktree `E:\VNOffice-grok-mainpy-image-sidecar`.

Người phụ trách: merge khi đã (tùy chọn) xác nhận tay File → Mở trên bản Desktop.
