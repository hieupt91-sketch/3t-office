# KẾ HOẠCH P1 — ĐƯỜNG MỞ THỬ QUA OOXML-ENGINE (SAU CỜ)

> **Issue:** #18 ([PLAN][perf]) — phân công tại comment `6754281389` (06:28 10/11/2026, chủ đã giao iOS-coord quyết và điều phối).
> **Nhánh:** `muse/p1-e2e-open-1011` từ `vn-main` `e4aa5433` (sau khi #19 M7 và #20 M2b gộp).
> **Trạng thái:** lát S1 đang làm; các lát sau theo thứ tự dưới đây.

## 1. Mục tiêu (theo #18)

Thêm đường thử sau cờ (mặc định tắt): giao diện Sheet/Writer/Slides đọc từ
`ooxml-engine` qua bridge thay cho đường FODS/FODP, **chỉ để đo, chưa thay
đường cũ**. Ghi mốc thời gian 3 phần: **mở gói, đọc dữ liệu, dựng hình**.
Mở PR tham chiếu issue #18; CI xanh mới tính xong.

Ngưỡng đạt của #18 (P1): có bảng số đầu-cuối cho 36 tệp, tách rõ 3 phần
(mở gói, đọc dữ liệu, dựng hình).

## 2. Hiện trạng (đã kiểm chứng trên `vn-main` `e4aa5433`)

**Đường cũ (mặc định, không đổi):** `main.py`
`_open_document_dialog_impl` → LibreOffice headless (`_run_soffice_convert`)
→ FODS/FODP → JS payload parser (`adapters/libreoffice/sheet/sheet-adapter.js`,
`sheet-payload-parser.js`, …) → UI render. Sheet có thêm đường payload rút gọn
sau cờ `SHEET_OPEN_PAYLOAD` / tự động khi FODS > 20 MB
(`_should_use_sheet_open_payload`).

**Đường engine (đã có, chưa dùng cho mở):**
- `platform/ooxml/engine_client.py` — `EngineClient` (stdio JSON Lines):
  `open(path)` → handle + metadata; `read(handle, kind, …)` →
  `sheet.read` / `doc.read` / `slide.read`; `save` + `shadow_save`.
- `ooxml-engine` (Swift, `ports/ios/OOXMLKit/Sources/ooxml-engine/main.swift`)
  + `OOXMLBridge.handle` — giao thức tại `docs/ooxml/ENGINE-PROTOCOL.md`.
- Cờ hiện có `VNO_OOXML_ENGINE` (`shadow`/`1`/`0`) chỉ phục vụ luồng **lưu**
  (`main.py:240`); chưa có cờ cho luồng **mở**.
- Phương pháp đo đã có: `docs/ooxml/BENCH-OLD-VS-NEW-24-10.md` — mỗi tệp đo
  độc lập ≥ 3 lần, báo trung vị + min/max; engine đo qua IPC JSON, RAM đỉnh
  qua PeakWorkingSet (Windows) / VmHWM (Linux).

**Giới hạn đã biết (ghi rõ, không giấu):**
- Lệnh bridge `open` hiện mở eager (không có tham số `lazyModel`/
  `deferValidation` như API Swift `Workbook`); đọc `sheet.read` không giới
  hạn vùng sẽ trả toàn bộ ô có dữ liệu. Với tệp lớn, lát S2 cần đọc theo
  vùng nhìn thấy (viewport) hoặc phân trang — chưa làm trong S1.
- Pha **dựng hình** (`render_ms`) chỉ đo được ở UI thật qua CDP trên máy
  bàn (Windows); trên VM Linux chỉ đo được 2 pha engine và ghi `render_ms`
  là NOT RUN.

## 3. Thiết kế

### 3.1. Cờ riêng cho đường mở

`VNO_OOXML_ENGINE_OPEN=1` (nhận `1/true/yes/on`, mặc định tắt) — tách riêng
khỏi `VNO_OOXML_ENGINE` (luồng lưu) để bật/tắt độc lập và rollback riêng.
Hàm `engine_open_enabled()` trong `platform/ooxml/engine_client.py`.
Đường cũ không đổi khi cờ tắt; mọi lỗi engine ở đường mở đều fallback về
đường FODS/FODP và ghi log (không chặn người dùng).

### 3.2. Mô hình 3 pha (hợp đồng số liệu)

`EngineClient.measure_open(path)` trả về:

```json
{
  "ok": true, "path": "…", "kind": "xlsx",
  "package_ms": 12.3,
  "data_ms": 45.6,
  "engine_total_ms": 57.9,
  "render_ms": null,
  "peak_rss_kb": 12345,
  "counts": {"sheets": 2, "cells": 120},
  "handle": "h1"
}
```

- `package_ms`: một lệnh `open` (mở gói OPC + metadata).
- `data_ms`: toàn bộ lệnh đọc dữ liệu (xlsx: `sheet.read` từng sheet;
  docx: `doc.read`; pptx: `slide.read` từng slide).
- `render_ms`: `null` = NOT RUN cho tới khi có mốc CDP ở UI (lát S4).
- `peak_rss_kb`: VmHWM của tiến trình engine trên Linux (`None` khi không
  đọc được / không phải Linux).
- Handle luôn được `close` sau khi đo (kể cả khi đọc lỗi).

### 3.3. Các lát

| Lát | Nội dung | Xong khi |
|---|---|---|
| **S1** (lượt này) | `measure_open()` + `engine_open_enabled()` + CLI `scripts/measure_ooxml_open.py` (≥3 lần, trung vị/min/max) + test fake-stdio | Test Python mới PASS; đo thật trên fixture xlsx/docx/pptx bằng engine build từ `vn-main` mới, có số thật |
| S2 | Móc `main.py`: cờ bật → mở Sheet qua engine, dựng payload JS từ kết quả `sheet.read`; lỗi engine → fallback FODS | Mở được tệp xlsx thật qua cờ, nội dung khớp đường cũ trên fixture; cờ tắt = đường cũ |
| S3 | Tương tự S2 cho Writer (`doc.read`) và Slides (`slide.read`) | Như S2 cho docx/pptx |
| S4 | Mốc thời gian dựng hình ở JS + script CDP đo đầu-cuối trên Windows (theo BENCH-OLD-VS-NEW) | Có `render_ms` thật cho 36 tệp; bảng `docs/ooxml/BENCH-P1-<ngày>.md` |
| S5 | PR → CI xanh → iOS-coord kiểm độc lập → gộp | PR gộp vào `vn-main` |

**Ngoài phạm vi P1:** đổi mặc định đường mở; gỡ FODS/FODP; cutover M3–M6
(chờ #11 xanh — xem #18 và comment #11 `6754282737`); đọc lười theo
viewport (thuộc M2b giai đoạn B / P3).

## 4. Tệp chạm tới

- S1: `platform/ooxml/engine_client.py`, `scripts/measure_ooxml_open.py`
  (mới), `tests/test_ooxml_engine_open_measure.py` (mới),
  `docs/ooxml/P1-E2E-OPEN-PLAN.md` (tài liệu này).
- S2–S4 (sau): `main.py` (điểm móc mở), `apps/sheet/*`,
  `apps/writer/*`, `apps/slides/*` (payload + mốc render), script CDP.
- Không đổi: `ports/ios/OOXMLKit` (giao thức bridge giữ nguyên ở S1);
  nếu S2 cần tham số mở lười thì tách lát riêng, có plan bổ sung.

## 5. Rủi ro & rollback

- Engine lỗi / thiếu binary → fallback đường cũ, log rõ; cờ mặc định tắt
  nên người dùng không bị ảnh hưởng.
- `sheet.read` toàn bộ trên tệp rất lớn có thể nặng RAM — S1 chỉ đo trên
  fixture và ghi rõ; S2 giới hạn vùng đọc trước khi mở tệp lớn.
- Rollback: đặt `VNO_OOXML_ENGINE_OPEN=0` (hoặc gỡ biến); không có thay
  đổi mặc định nào để hoàn tác.

## 6. Kiểm chứng (AGENTS §8)

- S1: test fake-stdio mới PASS (số thật); đo thật bằng engine release
  build từ nhánh P1 trên 3 fixture (`rich-excel.xlsx`,
  `rich-word.docx`, `rich-deck.pptx`), mỗi tệp ≥ 3 lần, ghi trung vị.
- S2–S4: mở tệp thật qua cờ, đối chiếu nội dung với đường cũ; `npm test`
  và `swift test` liên quan trước PR; CI `ios-ooxmlkit.yml` xanh.
- Mục chưa đo ghi NOT RUN, không suy số máy này thành số máy khác.

## 7. Hướng dẫn sử dụng trong ứng dụng (AGENTS §10)

P1 là đường đo chỉ dành cho nhà phát triển, sau cờ môi trường mặc định
tắt, không có tính năng người dùng nhìn thấy — không thêm nội dung Trợ
giúp trong ứng dụng cho lát này. Khi đường mở qua engine thành mặc định
(ngoài P1), sẽ bổ sung hướng dẫn theo §10.
