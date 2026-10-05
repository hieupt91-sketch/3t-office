# Spec — Rà soát và tăng tốc mở file (Doc / Sheet / Slide)

Ngày: 03/10/2026 · Người lập: Claude (điều phối) · Trạng thái: **đã đo (P0), chờ duyệt để chạy P1+**

## 0. Nguyên tắc bắt buộc (chủ sở hữu chốt 03/10)
1. Mỗi bước có phương án chi tiết, **chắc bước này mới sang bước sau**.
2. **Không làm mất kết quả đã đạt** (độ trung thực 28 file LAN, Word, 2.697 test node, 27 ca hồi quy).
3. Thay code: **giữ bản cũ có chú thích "superseded", chọn bằng cờ**; chỉ xoá khi bản mới đúng + nhanh hơn + test kỹ + chủ duyệt bằng chứng.
4. Mọi con số trong báo cáo phải từ lệnh thật; agent không tự khai PASS, Claude chạy lại.

## 1. Kết quả đo P0 (chạy từ mã nguồn, hồ sơ đã seed, máy đang có agent chạy song song — mỗi file MỘT lần đo, cần lặp lại để kết luận chắc)

### Sheet
| File | xlsx→FODS (LibreOffice) | Python overlay | Python optimize | Python build payload | JS dựng mô hình | Tổng đến lưới đầu |
|---|---|---|---|---|---|---|
| lan03 (10 MB, FODS 19,9 MB) | 3,4 s | 2,1 s | 0,8 s | 1,8 s | 1,5 s | ~14 s |
| lan16 (16 MB, FODS 40 MB) | 4,8 s | 3,6 s | 1,7 s | 3,4 s | (trong tổng) | ~22 s |
| lan26 (15 MB, FODS 24,8 MB) | 2,2 s | 3,3 s | 2,3 s | 3,6 s | (trong tổng) | ~18 s |
| lan06 (11 MB, **FODS 146 MB**) | 13,2 s | **59,9 s** | **33,1 s** | (đường parseFods) | 1,6 s | ~113 s |
| lan14 (9 MB, **FODS 257 MB**) | 12,3 s | **40,0 s** | **24,8 s** | **33,7 s** | **52,0 s** | ~169 s |
| lan09 | — không khởi động được trong lượt đo (xem mục 2.5) | | | | | |

### Doc
| File | Mở LibreOffice | Tổng |
|---|---|---|
| d04 (2 MB) | 1,4 s | 6,4 s |
| d24 (22,7 MB, hộp văn bản) | rơi về đường `convert-to` (`writer-docx-textboxes`) | 15,5 s |
| MYTIME (30 MB) | 6,4 s | **173 s** — phần lớn thời gian **chưa giải thích được** (log không có mốc) |

Slide (sample-3.pptx): không khởi động được trong lượt đo → chưa có số.

## 2. Phát hiện (xếp hạng theo ảnh hưởng)
1. **Lõi LibreOffice không phải nút thắt.** Đọc xlsx + xuất FODS chỉ 2–13 s kể cả file 257 MB. Thời gian lớn nằm ở **cầu nối do 3T viết**.
2. **Python Sheet (overlay → optimize → payload)** chiếm ~100 s ở lan14 và ~93 s ở lan06. Chi phí tăng mạnh theo kích thước FODS (lan06: overlay 334 triệu ký tự). Nghi vấn: xử lý chuỗi/regex nhiều lượt trên chuỗi khổng lồ.
3. **JS `buildSheetPayloadModel` 52 s** trong khi payload chỉ ~9 MB chữ (lan14) — chi phí **quá lớn so với dữ liệu**, nghi vấn độ phức tạp bậc hai.
4. **Doc MYTIME 173 s**: hơn 160 s ngoài LibreOffice, chưa có mốc đo → phải gắn thêm mốc rồi mới kết luận.
5. **Khởi động app thất bại ngẫu nhiên** (2/9 lượt đo Sheet/Slide hết thời gian chờ giao diện) — cần điều tra riêng; có thể do tải máy, có thể là lỗi thật.
6. Hằng số ~3 s mỗi lần mở: `pipe_resolve` (~142 lần thăm dò) chờ LibreOffice sẵn sàng.
7. Hạn chế đo: một lần/file; chạy từ mã nguồn (chưa phải bản cài thật); máy đang tải do agent khác. Đã dự kiến lặp lại ở P0b.

## 3. Mục tiêu đo được (chốt khi chủ duyệt)
- lan14 và lan06: **< 60 s** đến lưới dùng được (hiện 169 s / 113 s).
- File Sheet trung bình (lan03/16/26): **giảm ≥ 40%** so với bảng trên.
- Doc MYTIME: **< 30 s** (hiện 173 s).
- Không file nào lệch kết quả so với bản cũ (xem cổng).

## 4. Phase, người làm, cổng kiểm, hoàn tác
| Phase | Việc | Người làm | Cách Claude kiểm | Hoàn tác |
|---|---|---|---|---|
| **P0b — Đo chắc** | Lặp mỗi file 3 lần; gắn mốc cho Doc MYTIME (từ LibreOffice xong đến hiển thị); đo trên **bản cài thật + hồ sơ thật**; điều tra khởi động ngẫu nhiên thất bại | Claude | Bảng trung vị/độ lệch; không đổi code app (chỉ log gated bằng `VNO_PERF_DEBUG`) | Không đổi hành vi |
| **P1 — Python Sheet** | Profile `native_overlay`, `optimize_fods`, `build_compact_payload`; bỏ các lượt xử lý chuỗi thừa, xử lý theo luồng | Codex (Sheet) | **Payload đầu ra giống hệt (băm) bản cũ trên 28 file LAN** + test node + 27 hồi quy + đo lại | Cờ chọn đường cũ; bản cũ giữ nguyên chú thích |
| **P2 — JS dựng mô hình** | Tìm đoạn bậc hai trong `buildSheetPayloadModel`; sửa | agy (sau đó Claude kiểm) hoặc Codex | Mô hình sinh ra **deep-equal** bản cũ; benchmark lan14 JS < 10 s | Cờ chọn đường cũ |
| **P3 — Doc chậm** | Từ mốc của P0b: xử lý đúng khâu (HTML/DOM, hộp văn bản, trang) | Codex (Doc) | So sánh bố cục với bộ Word chuẩn: số trang/vị trí neo không đổi; MYTIME < 30 s | Cờ |
| **P4 — Khởi động LibreOffice** | Thay vòng thăm dò 3 s bằng chờ sẵn sàng thông minh/khởi động trước | Codex hoặc agy | Đo −2 s mỗi lần mở; không tăng lỗi mở | Cờ |
| **P5 — Khởi động ngẫu nhiên** | Tìm nguyên nhân 2/9 lượt hết thời gian | Claude (chẩn đoán) → giao sửa | Chạy 20 lượt liên tiếp, 0 lỗi | — |
| **P6 — Đường đọc xlsx trực tiếp (dài hạn)** | Đọc zip+XML theo luồng, bỏ FODS, chỉ cho file đơn giản trước; file phức tạp vẫn đi LibreOffice | Codex/Grok (khi có hạn mức) | Cấu trúc/giá trị trùng bản cũ trên 28 file; chỉ bật khi đạt | Cờ; **giữ đường cũ** |
| **P7 — Xác nhận cuối** | Đo bản cài thật máy sạch; báo cáo trước/sau | Claude | Bảng so sánh P0b → cuối; chủ duyệt | Gỡ bản vá |

Nhánh lazy-sheets của Codex (`perf/ch1-lazy-sheets-codex`, commit WIP `68bdd0d1`): **tạm giữ, không bật**, đánh giá lại sau P1/P2 (tiết kiệm được nhiều hơn khi nút thắt đã gỡ).

## 5. Quy trình tự làm — tự kiểm
- Mỗi phase = một nhánh + worktree riêng, brief có bằng chứng, tái hiện, tiêu chí đo được, cổng (theo quy tắc đã có).
- Cổng chung mọi phase: `node tests/run-tests.js` 0 FAIL; `run-desktop-regression.mjs` 27 PASS; đối soát 28 file LAN; số đo trước/sau cùng máy cùng lệnh.
- Claude chạy lại mọi cổng, đối chiếu báo cáo với tệp thô, **không gộp vào `main` nếu có số chưa tự chạy**.
- Giám sát: tiến trình theo dõi nền + kiểm tra thưa (20–30 phút), ghi tiến độ vào `docs/HANDOFF-PERF-OPEN.md`.

## 6. Bổ sung 03/10 — Thử nghiệm "hỏi trực tiếp LibreOffice qua UNO, chỉ lấy vùng đang xem" (spike, chưa đưa vào app)
Mô hình: giữ tài liệu mở trong LibreOffice (worker UNO hiện có đã nối sẵn), UI chỉ hỏi vùng đang hiển thị; không xuất FODS toàn bộ.
Đo thật (`_spike_uno.py`, LibreOffice 26.2 đóng gói, hồ sơ có sẵn, một lần/file):

| Thao tác | lan03 | lan14 (FODS 257 MB) |
|---|---|---|
| Nạp tài liệu vào LibreOffice (không xuất) | 0,7 s | **3,6 s** |
| Lấy danh sách sheet | 4 ms | 4 ms |
| Vùng dùng của sheet đầu (33.642 dòng × 49 cột) | 12 ms | 12 ms |
| `getDataArray` 60×30 ô | 4 ms | 2 ms |
| `getFormulaArray` 60×30 ô | 8 ms | 4 ms |
| Độ rộng cột + chiều cao dòng cửa sổ | 40 ms | 38 ms |
| Định dạng từng ô (gọi từng ô, 1.800 ô) | 0,9 s | 0,9 s (cần gộp theo vùng để nhanh hơn) |
| Vùng dùng của mọi sheet | 12 ms | 4 ms |

Ước tính khung nhìn đầu tiên lan14: ~2,4 s khởi động + 3,6 s nạp + ~1 s truy vấn ≈ **6–8 s** (hiện 169 s).
Hạn chế phải xử lý trước khi áp dụng (xem phase P8 dưới):
1. Chi tiết hiển thị (gộp ô, định dạng có điều kiện, kiểu ô, hình, biểu đồ, xác thực, ẩn dòng…) phải lấy qua UNO theo vùng, không gọi từng ô.
2. Sửa/lưu hiện đi qua đường FODS + lớp vá OOXML; trong lúc chưa có mô hình đầy đủ, chỉ cho xem + cuộn, hoặc nạp đầy đủ nền rồi **chuyển êm** sang mô hình đầy đủ.
3. Công thức/tham chiếu xuyên sheet, tìm kiếm, lọc, sắp xếp toàn bảng cần dữ liệu đầy đủ.

### 6.1 Kết quả thực tế P1/P2/P3 (04/10, đã tự chạy lại)
| Phase | Kết quả đo | Đối soát | Trạng thái |
|---|---|---|---|
| P2 JS dựng mô hình | lan14 52 s → ~21 s (1 lần đo desktop) | Mô hình **deep-equal** bản cũ trên lan03/16/26/14 (kiểm trong app thật); node 2699 PASS; hồi quy 27/27; 4 bài CDP Sheet PASS | **Đã vào `main`** |
| P3 Doc regex bậc hai (`writer-adapter.js` ~2860) | MYTIME 173 s → 33,6 s (1 lần đo) | Fuzz 4000 tài liệu = regex cũ; node 2702 PASS; hồi quy Doc 9 PASS | **Đã vào `main`** |
| P1 Python Sheet | lan14 96,6 → 82 s; lan06 108 → 81 s (chỉ −15…−25%) | Byte-identical 4 file; đang so 28 file | Chưa vào `main` (chưa đạt mục tiêu 35 s) |
Kết luận: vi tối ưu P1 chạm giới hạn (≈1,5 triệu ô xử lý bằng regex Python). Phần còn lại phải đổi cấu trúc → P8.

### 6.1b Kết quả đêm 03–04/10 (đã vào `main`, mỗi mục Claude tự chạy lại cổng)
| Hạng mục | Kết quả |
|---|---|
| P2 JS dựng mô hình | lan14 52 → ~21 s; mô hình deep-equal bản cũ trên 4 file |
| P3 Doc (regex bậc hai ở ngắt section) | MYTIME 173 → 33 s; fuzz 4000 tài liệu = bản cũ |
| P1 Python Sheet | −15…−25%; byte-identical 28/28; chưa đạt 35 s (≈1,5 triệu ô xử lý bằng regex) |
| P8 xem nhanh (cờ `VNO_OPEN_VIEWFIRST`, tắt mặc định) | lan14 màn hình đầu ~9 s, lan06 ~14,5 s, lan03/16/26 ~4,5–5 s; 37/37 + 18/18 CDP |
| Sửa chuyển sheet (cửa sổ dựng cũ của sheet trước) | lan14 Sheet2: DOM 680k → 1,9k; RAM đỉnh 4,79 → 2,06 GB |
| Sửa khởi động (hàng đợi máy chủ tĩnh 5 → 128) | A/B 60 lượt: kẹt 13/60 (22%) → 0/60 |
| Sửa lưu file rất lớn (chia đoạn qua cầu nối) | lan14: trang sập khi lưu → lưu 31 s, 0 sai lệch |
| Không gộp | P3b (không nhanh hơn: 32,4 vs 33,6 s); P4 (khởi động LibreOffice sớm: chưa đo ảnh hưởng khung hình đầu) |

### 6.1c Lộ trình tiếp theo (phân công 04/10)
1. **Đối soát 28 file phải đo đường lưu THẬT** (`roundtrip-file.mjs` hiện gọi API trực tiếp, bỏ qua `globalUnoBridge`; lan14 báo "không lưu được" là do bộ đo) — Codex (J1).
2. **P1b**: song song hóa overlay/optimize/payload theo sheet/khối dòng, giữ byte-identical — Codex (J2).
3. **Slide chưa đo**; quét ngoại lệ DOM/RAM trên 26 file LAN còn lại; xác nhận 0 lượt kẹt khởi động cho cả 3 ứng dụng — agy (đo đạc, không sửa mã).
4. **Rà soát Hướng dẫn tiếng Việt** (AGENTS.md mục 10) — opencode (chỉ tài liệu).
5. **Kế hoạch tách `platform/os_services`** (tiền đề macOS) — Codex (chỉ lập kế hoạch).
6. **Chờ chủ sở hữu quyết định**: bật xem nhanh mặc định; P4 chỉ gộp nếu đo thấy lợi mà không chậm khung hình đầu; phát hành 0.9.9 (đang gác).

### 6.1d Kết quả 04/10 chiều (đã vào `main`, Claude tự chạy lại cổng: node 2755 PASS, Python in OK, hồi quy desktop 27 PASS)
| Hạng mục | Kết quả đo (app desktop thật, CDP) | Cờ hoàn tác |
|---|---|---|
| Xem trước khi in Doc | d04 25,9 → 10,3 s; d01 15,7 → 4,6 s; d12 13,9 → 2,4 s; PDF **cùng số byte** với đường cũ. Nguyên nhân: CLI nguội + giết worker giữa các bước, `inspect_pdf` mở lại PDF | `VNO_PRINT_LEGACY=1` |
| Xem trước khi in Sheet/Slide (Codex) | lan26 21,4 → 7,5 s (Claude đo lại); lan03 30,4 → 18,6 s; sample-3.pptx 20,4 → 14,2 s; PDF cùng byte/trang trên 4 tệp | `VNO_PRINT_LEGACY=1` |
| Không hiệu quả | Làm nóng dựng ảnh PDF bằng PDF nhỏ sau khi mở: không đổi (chi phí theo nội dung trang) — đã bỏ | — |
| P6 đọc xlsx trực tiếp (spike, không đổi app) | Chỉ **2/28** tệp LAN đủ "đơn giản" (7%); 0 khác biệt trên ô cùng tồn tại, 254/707 ô rỗng có định dạng khác đường cũ. **Kết luận: không nên bật** (`docs/SPIKE-P6-DIRECT-XLSX.md`) | không có mã chạy |
| lan14 theo pha (đường đủ, 94 s) | LO→FODS 18; overlay 22; optimize 14; payload Python 17,7; JS parse+model 21 | — |
| Nạp sheet theo yêu cầu (CH-1 pha 2) | **Dở dang**, nhánh `perf/ch1-lazy-sheets-codex` (WIP `ddb2981f`), chưa bật; thiếu save-merge phía Python và an toàn cho công thức xuyên sheet/tìm thay/named range. Không merge cho tới khi qua cổng | không truyền `included_sheets` |

**Chạy song song bước đọc metadata xlsx với LibreOffice (05/10):** phần quét metadata chỉ phụ thuộc xlsx nên chạy luôn trong lúc LibreOffice chuyển FODS (`prefetch_sheet_open_metadata`, tắt bằng `VNO_OPEN_PREFETCH=0`). Máy yên: lan06 mở đầy đủ 69,4 → 63,4 s (hai lượt mỗi chế độ: 69,3/69,5 → 63,2/63,7); lan14 hiện 94,2 s. Kết quả overlay giống hệt 28/28 file (lan23 có tiền tố namespace nên bỏ qua prefetch). Cùng đợt: worker `ProcessPoolExecutor` của P1b tự thoát khi app cha chết (trước đó 32 worker mồ côi, ~770 MB, tồn tại hàng giờ sau các lần chạy thử bị ngắt).

**Đào sâu 05/10 tối (đã vào `main`, mỗi mục so với bản cũ trên 28 file, FODS cuối + payload giống hệt 28/28):**
| Phát hiện | Cách sửa | Kết quả |
|---|---|---|
| `_FODS_TABLE_RE.sub` với `[\s\S]*?` đi từng ký tự trên bảng 306 triệu ký tự (lan14 có 1 bảng chiếm 94% dữ liệu) | quét bằng `str.find` (`_sub_fods_tables`; `VNO_FODS_TABLE_REGEX=1` giữ regex cũ) | optimize lan14 14 → 7,8 s; tổng optimize 28 file 48,5 → 28,2 s |
| Tính layout/chiều cao dòng từ xlsx (10,8 s lan01, 13,2 s lan06) chỉ phụ thuộc xlsx nhưng chạy sau LibreOffice | `_compute_xlsx_sheet_layouts` chạy trong worker lúc LibreOffice chuyển đổi (prefetch) | overlay lan06 35 → 13 s, lan01 34 → 11 s |
| Gỡ `vno:xf` bằng regex `\s+vno:xf…` + IGNORECASE (4,6 s lan14) | `strip_vno_xf_attributes` (mẫu có tiền tố cố định, phần còn lại quay về regex cũ); `VNO_STRIP_XF_REGEX=1` | 33,1 → 7,0 s trên 56 chuỗi |
| Nhóm (hàng, cột) thành bảng theo hàng + lọc tập hàng cho từng worker bằng quét toàn bộ | gom trong prefetch (`_xlsx_metadata_row_maps`) và `bisect` | giảm ≈2–3 s phần nối tiếp |
| JS nhường luồng bằng `setTimeout(0)` ~1100 lần (mỗi 128 hàng × 2 lượt), mỗi lần bị kẹp ≥ 4 ms | `MessageChannel` (cứ 50 ms một lần timer thật); `__VNO_OPEN_LEGACY` giữ cách cũ | `buildSheetPayloadModel` lan14 21,1 → 13,7 s |
| Thử bỏ lượt XF đầu (`SHEET_OPEN_SKIP_INITIAL_XF`) | không đổi mặc định | 5/28 file khác kết quả, không nhanh hơn → giữ tắt |

Mở đầy đủ (app thật, xem nhanh tắt, máy yên): **lan14 94,2 → 71,7 s; lan06 69,4 → 42,9 s; lan01 ≈69 → 34,9 s**. Chuỗi Python (overlay+optimize+payload) trên 28 file: 182,4 → 119,5 s chưa kể phần prefetch được ẩn dưới LibreOffice. Cơ cấu lan14 hiện tại (71,7 s): khởi động worker 3,6 + LibreOffice 14 + overlay 15 + optimize 7,8 + payload 13,6 + JS 14,6 + còn lại ≈3.

Phân tích thêm (không đưa vào app): thử thay bộ đọc thuộc tính ô bằng regex — giống hệt trên 8,45 triệu ô nhưng chỉ nhanh hơn ~10% phần đọc, bỏ. Các bước còn lại của lan14 (overlay 18 s, optimize 14 s, payload 18 s, LibreOffice 18 s, JS 21 s) đều là các lượt quét tuyến tính trên chuỗi 255–335 MB; muốn xuống dưới 60 s phải gộp các lượt theo từng bảng (overlay → optimize → payload trong một worker) — việc lớn, cần cổng so băm 28 file như P1/P1b.

**P7 (đo bản đóng gói 0.9.9-rc, 05/10, hồ sơ mới):** lan03 mở lần đầu trong bản đóng gói 25,7 s so với 14,7 s ở các lần sau (và 14,7–15,2 s khi chạy từ mã nguồn). Một phần (≈2,8 s) do gói không có bytecode biên dịch sẵn; đã thêm bước `compileall --invalidation-mode checked-hash` vào `scripts/build-pilot.ps1` (bỏ bằng `VNO_SKIP_PYC=1`) → lần đầu còn 22,9 s. Phần còn lại (≈8 s) là chi phí đọc nguội/quét tệp lần đầu của hệ điều hành trên bộ cài mới, chưa có cách giảm. Doc d04 trong gói: 6,1 s (mã nguồn 5,8 s).

Lưu ý đo lường: số của agy cho xem trước Sheet/Slide (nhánh `perf/print-measure-agy`) **sai** (1 trang, 14 s trong khi đo lại được 12 trang, 6–7,5 s) nên không dùng.

### 6.2 Kế hoạch chi tiết P8 (giai đoạn A — chế độ xem nhanh, chỉ đọc)
- **Mục tiêu:** lan14 hiện lưới đầu ≤ 10 s; giao diện/chức năng sau khi đầy đủ **không đổi** so với bản hiện dùng.
- **Worker (`adapters/libreoffice/common/soffice_uno_worker.py`):** thêm thao tác `view_open` (nạp tài liệu ẩn, **giữ mở**, trả danh sách sheet + vùng dùng + cỡ mặc định), `view_window` (sheet, r0,c0,r1,c1 → giá trị/công thức từ `getDataArray`/`getFormulaArray`, độ rộng cột/chiều cao dòng, định dạng ô theo **khối** — không gọi từng ô; đã đo 0,9 s/1.800 ô nếu gọi từng ô), `view_close`. Giao thức JSON-lines hiện có; thao tác `convert` giữ nguyên.
- **Main (`main.py`):** cờ `VNO_OPEN_VIEWFIRST=1` (mặc định tắt cho tới khi đạt cổng): khi mở xlsx lớn, chạy song song (a) đường FODS đầy đủ như hiện nay, (b) `view_open` + cửa sổ đầu tiên.
- **Giao diện Sheet:** lưới ở "chế độ xem nhanh" nhận cửa sổ dữ liệu, cuộn gọi thêm cửa sổ, ô chỉ đọc + thanh trạng thái "Đang nạp đầy đủ…"; khi đường đầy đủ sẵn sàng thì **chuyển êm** (giữ ô chọn, vị trí cuộn, không nháy). Soạn/lưu bị khoá tới lúc đó (thông báo rõ).
- **Cổng:** ô hiển thị ở chế độ nhanh == bản đầy đủ (giá trị + định dạng cửa sổ, 28 file); chuyển chế độ không mất vị trí; đường FODS giữ nguyên làm dự phòng; hồi quy 27/27, node, CDP Sheet.
- **Rủi ro:** định dạng đầy đủ qua UNO (gộp ô, điều kiện, ẩn dòng, hình); tranh chấp hai tiến trình LibreOffice (dùng chung worker → tuần tự hoá bằng hàng đợi); RAM. Rollback: tắt cờ.

**P8 — Mở theo khung nhìn (viewport-first) qua UNO** (ưu tiên cao hơn P6): giai đoạn A = chế độ xem nhanh (chỉ đọc) trong ~8 s trong khi đường FODS đầy đủ chạy nền; giai đoạn B = chuyển sang mô hình đầy đủ khi sẵn sàng (giữ vị trí cuộn/ô chọn); giai đoạn C = mở rộng truy vấn theo vùng để dần thay đường FODS. Luôn sau cờ; **giữ nguyên đường FODS**; cổng: ô hiển thị ở chế độ nhanh **giống** bản đầy đủ (so giá trị+định dạng cửa sổ trên 28 file), chuyển chế độ không mất vị trí/không nháy.
