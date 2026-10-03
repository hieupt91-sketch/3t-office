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

**P8 — Mở theo khung nhìn (viewport-first) qua UNO** (ưu tiên cao hơn P6): giai đoạn A = chế độ xem nhanh (chỉ đọc) trong ~8 s trong khi đường FODS đầy đủ chạy nền; giai đoạn B = chuyển sang mô hình đầy đủ khi sẵn sàng (giữ vị trí cuộn/ô chọn); giai đoạn C = mở rộng truy vấn theo vùng để dần thay đường FODS. Luôn sau cờ; **giữ nguyên đường FODS**; cổng: ô hiển thị ở chế độ nhanh **giống** bản đầy đủ (so giá trị+định dạng cửa sổ trên 28 file), chuyển chế độ không mất vị trí/không nháy.
