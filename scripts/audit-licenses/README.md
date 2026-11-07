# Cổng giấy phép dependency (G1)

Phiếu: `docs/sync/DIRECTIVE-MUSE-LOP-RIENG-0511.md`, mục G1 (INBOX-MAC #18).

## Mục đích

`package.json` không có dependency npm, nên rủi ro giấy phép nằm ở các thành
phần **đóng gói kèm** sản phẩm: LibreOffice, Python, phông chữ, dữ liệu. Cổng
này kiểm tra mọi thành phần đó có giấy phép nằm trong allowlist, hoặc có ngoại
lệ đã khai báo đầy đủ (lý do + người duyệt). Không có giấy phép hoặc giấy phép
lạ mà không có ngoại lệ thì cổng **FAIL**.

## Tệp

- `components.json` — manifest các thành phần đóng gói: tên, phiên bản, giấy
  phép (SPDX id hoặc biểu thức `A OR B`), loại, nguồn, cách đưa vào gói (`via`).
  Nguồn gốc duy nhất của cổng; mọi thay đổi thành phần đóng gói phải cập nhật
  ở đây trước.
- `check-licenses.mjs` — cổng kiểm tra. Chạy trực tiếp:
  `node scripts/audit-licenses/check-licenses.mjs` (thoát 0 = PASS, 1 = FAIL).
  Cấm bọc lệnh bằng `|| echo warning` hay bất cứ cách nào làm cổng vô nghĩa.
- `README.md` — tệp này.

## Allowlist (theo phiếu G1)

MIT, BSD-2-Clause, BSD-3-Clause, ISC, Apache-2.0, MPL-2.0, PSF-2.0,
Unicode-3.0, Zlib, OFL-1.1, CC0-1.0.

Allowlist nằm trong `check-licenses.mjs` (hằng `LICENSE_ALLOWLIST`). Muốn thêm
giấy phép vào allowlist phải có quyết định của chủ dự án/Lead, không tự thêm.

## Ngoại lệ

Thành phần có giấy phép ngoài allowlist (ví dụ: WebView2 Runtime — phần mềm
độc quyền của Microsoft; cffi — MIT-0; thư viện con LGPL đi kèm LibreOffice)
phải có trong manifest trường `exception` với đủ hai dòng:

- `reason`: vì sao phải dùng, đã đọc giấy phép gốc ở đâu, giới hạn nào.
- `approved_by`: người duyệt.

Ngoại lệ được cổng in ra đầy đủ trong báo cáo — liệt kê, không che. Ngoại lệ
thiếu `reason` hoặc `approved_by` thì cổng FAIL.

## Kiểm tra chéo

- Mọi gói trong `requirements.txt` phải có trong manifest (thiếu thì FAIL).
- Mọi gói Python trong manifest phải ghi rõ `via` (cài đặt bằng cách nào).
- `package.json` không được có dependency npm chưa khai báo trong manifest.
- Tên thành phần không được trùng.

## Phạm vi

Chỉ thành phần **đóng gói/phân phối cùng sản phẩm** (gói pilot Windows theo
`scripts/build-pilot.ps1` + runtime macOS theo
`ports/macos/requirements-runtime-macos.lock`). Công cụ chỉ dùng lúc build
(ví dụ fontTools khi dựng phông VN) không phân phối cùng sản phẩm nên không
nằm trong manifest.

Lưu ý: `build-pilot.ps1` loại các extension `dict-*` của LibreOffice (một số
theo GPL) khỏi gói. `VNO_KEEP_LO_DICTS=1` (giữ nguyên các từ điển đó) bị CẤM
trong bản phát hành (INBOX-MAC #22): `build-pilot.ps1` FAIL ngay khi biến này
bằng `1`, và cổng này cũng FAIL khi chạy với biến đó — không còn đường nào
đóng gói các từ điển GPL vào bản phát hành.

## Test

`tests/unit/license-gate.test.js` — chạy qua `npm test` (suite 278). Ngoài
kiểm tra manifest thật, test còn có fixture âm bản: một gói GPL giả, một thành
phần thiếu giấy phép, một ngoại lệ thiếu người duyệt, một gói trong
`requirements.txt` chưa khai báo, và `VNO_KEEP_LO_DICTS=1` — tất cả đều phải
bị cổng chặn (FAIL).
