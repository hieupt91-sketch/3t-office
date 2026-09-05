# Agent Handoff
TASK: Đo thật video/audio FODP → soffice PPTX → FODP; sửa adapter nếu lỗi nằm ở XML serialize, không bịa lại giả thuyết cũ
AGENT/ROLE: Grok (Integration / adapter + test)
BRANCH: `fix/fodp-media-pptx-roundtrip`
WORKTREE: `E:\VNOffice-grok-slides-media-pptx`
OBJECTIVE: Task `fix/fodp-save-shapes` (đã merge main) ghi video/audio vào FODP thuần VN Office nhưng **không** chứng minh round-trip qua soffice PPTX — giả thuyết cũ là “file media lớn, filter Impress PPTX tách/gãy embed”. Task này đo lại bằng file media nhỏ hợp lệ, xác định nguyên nhân thật, sửa nếu sửa được trong adapter. **Không merge vào main.**

---

## Plan gate

Thay đổi serialize/parse media trên Slides adapter + test round-trip. Không đụng Core, Writer, Sheet, canvas logic, `main.py`, build system, không gửi nội dung tài liệu ra cloud.

- **Objective:** Đo PPTX thật (unzip `ppt/media/` và slide rels) và FODP sau hop (`draw:plugin` / bytes). Nếu XML adapter sai — sửa. Nếu đúng là giới hạn LibreOffice — ghi bằng chứng, không ép hoàn thành.
- **Current capability trước task:** `serializeToFodp()` ghi `<draw:plugin xlink:href="" draw:mime-type="…"><office:binary-data>…</office:binary-data></draw:plugin>`. `parseFodp()` đọc lại trong bộ nhớ. Chưa có live soffice cho media.
- **Files/modules:** `adapters/libreoffice/slides/slides-adapter.js`; unit `tests/unit/slides-file-io.test.js`; live `tests/live/fodp-save-media-pptx-real-conversion.mjs`; helpers `tests/helpers/tiny-media.mjs`, `listZipEntries` trong `tests/helpers/zip-package.mjs`; probe `tests/scripts/probe-fodp-media-pptx.mjs`.
- **Dependency:** `soffice.exe` = LibreOffice 26.2 tại `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe` (chỉ live/probe).
- **Risk:** Đổi thứ tự parse plugin vs image (poster). Đã giữ nhánh table-trước-image cũ. Live shapes/table/transition/title-body phải không hồi quy.
- **Test plan:** probe nhiều encoding trước khi sửa; unit in-memory + canned soffice XML; live hop media; 4 live hop cũ.
- **Rollback:** revert branch; serializer cũ để `xlink:href=""`.

---

## FINDINGS (đo soffice thật, không lặp giả thuyết cũ)

Canvas (`apps/slides/slides-canvas.js`, **chỉ đọc**): `insertMedia` gán `shape.type = "video"|"audio"` và `shape.src` = data URL. Adapter serialize/parse phải giữ bytes đó qua vòng Lưu PPTX.

File đo: MP4 ISO-BMFF 411 byte (`ftyp`/`moov`/`mdat`), MP3 MPEG-1 Layer III 417 byte (header `fffb9004`). Không dùng chuỗi giả `AAAA`.

LibreOffice: **26.2** (`bootstrap.ini` ProductKey). Probe: `tests/scripts/probe-fodp-media-pptx.mjs` (temp giữ `VNO_KEEP_FIXTURE_TMP=1`).

### 1. Encoding cũ (empty href + `office:binary-data` trong plugin) — **mất media**

| Bước | Kết quả đo |
|---|---|
| FODP nguồn | 2× `<draw:plugin xlink:href="">` + `office:binary-data` (mp4 411b / mp3 417b) |
| FODP → PPTX | `draft.pptx` **8185 byte**, **14 zip entry**, **`ppt/media/` = không có** |
| `slide1.xml` | Có `a:videoFile r:link="rId1"` + `p14:media` + `ppaction://media` |
| `slide1.xml.rels` | Chỉ `Target="../slideLayouts/slideLayout1.xml"` — **rId1 không trỏ file** |
| PPTX → FODP | **Không còn** `<draw:plugin>`. Hai frame thành `<draw:image><text:p/></draw:image>` rỗng |
| `parseFodp()` | Hai shape `type: "image"`, src rỗng. Bytes **0 / 411** và **0 / 417** |

Nguyên nhân **không phải** “file lớn” (file ~400 byte) và **không phải** “filter PPTX không bao giờ embed media”.

Nguyên nhân đo được:

1. ODF: `draw:plugin` chỉ chứa `draw:param`, **không** chứa `office:binary-data`. LibreOffice bỏ qua binary-data trong plugin.
2. `xlink:href=""` → không có URL media → không tạo `SdrMediaObj` có file.
3. Đối chứng FODP cũ → ODP: zip **không** có `Media/` hay `.mp4/.mp3`; `content.xml` giữ plugin với href rỗng, **binary-data bị LO xóa**.

### 2. Data URL trong `xlink:href` — **bytes sống sót FODP→PPTX→FODP**

| Bước | Kết quả đo |
|---|---|
| FODP nguồn | `xlink:href="data:video/mp4;base64,…"` / `data:audio/mpeg;base64,…` |
| FODP → PPTX | `draft.pptx` **8389 byte**, **vẫn không có `ppt/media/`** |
| `slide1.xml.rels` | `Target="data:video/mp4;base64,<đúng 411 byte>"` và `Target="data:audio/mpeg;base64,<đúng 417 byte>"` (mỗi loại 2 rel: `a:videoFile`/`p14:media`) |
| PPTX → FODP | 2× `<draw:plugin>` còn; mime thành `video/unknown` / `audio/unknown`; **không** còn `office:binary-data` |
| `parseFodp()` | `type: video` + `audio`; **bytes khớp từng byte** (411 = 411, 417 = 417) |

Cùng kết quả khi **vừa** data href **vừa** `office:binary-data` (probe `both`): rels giữ data URL, hop ngược khớp bytes. `office:binary-data` trong plugin vẫn bị LO bỏ sau hop — bytes đi qua **href**.

### 3. Sidecar `Media/sample.mp4` cạnh FODP — **link file://, không embed**

PPTX rels: `Target="file:///C:/Users/…/Media/sample.mp4"` (và mp3). **Không** có `ppt/media/`. FODP sau hop: href tương đối ra temp dir. Bytes **không** nằm trong FODP. Xóa temp là mất file.

### 4. ODP zip native (`Media/sample.mp4` + `Media/sample.mp3`) — **PPTX filter embed được**

Chứng minh filter Impress PPTX **có** embed media khi nguồn là **gói ODP**:

| Entry PPTX | Size | Khớp bytes gốc |
|---|---|---|
| `ppt/media/media1.mp4` | 411 | **có** (eqMp4=true) |
| `ppt/media/media3.mp3` | 417 | **có** (eqMp3=true) |
| `ppt/media/image2.png` | 899 | poster, không phải media |
| `[Content_Types].xml` | Override `video/mp4`, `audio/mpeg` | |
| `slide1.xml.rels` | `Target="../media/media1.mp4"` **r:embed** (không phải r:link data/file) | |

ODP → FODP (không qua PPTX): plugin href **bị xóa thành `""`**, không `office:binary-data`. LibreOffice **không** biểu diễn media gói được trong FODP.

ODP → PPTX → FODP: plugin href `""` + sibling `<draw:image><office:binary-data>` = **PNG poster**, không phải mp4/mp3. Bytes media **mất** khi quay về FODP dù PPTX đã embed.

### Kết luận nguyên nhân

| Giả thuyết cũ (`fix/fodp-save-shapes`) | Đo lần này |
|---|---|
| File media lớn làm gãy embed | **Sai** với file 411/417 byte. Encoding cũ vẫn mất. |
| Filter Impress PPTX “thường tách/gãy embed” nên không round-trip được | **Một phần sai.** Filter **embed được** từ ODP gói (`ppt/media/` đúng bytes). Từ **FODP** thì không tạo `ppt/media/` vì FODP không có package stream. |
| Nguyên nhân thật | Adapter ghi `href=""` + `office:binary-data` trong plugin (LO bỏ qua). Thiếu URL media. |

Lỗi **có thể sửa trong adapter** cho vòng VN Office FODP → soffice PPTX → FODP: ghi data URL vào `xlink:href`.

Giới hạn **thật của LibreOffice** (không sửa được chỉ từ adapter + FODP string):

- FODP → PPTX **không** tạo `ppt/media/` (media thành `r:link` data URL hoặc `file://`).
- PPTX đã embed (`ppt/media/`) → FODP **không** nhét lại bytes vào plugin (chỉ poster PNG + href rỗng).
- Muốn PPTX PowerPoint-native (`ppt/media/` + `r:embed`) cần serialize **ODP zip** và đổi pipeline `main.py` (`draft.fodp`). **Ngoài phạm vi task này.**

---

## IMPLEMENTATION SUMMARY

### Serialize
`video`/`audio`: `xlink:href` = `shape.src` (data URL), giữ `office:binary-data` cho FODP thuần VN Office, thêm `draw:param` Loop/Mute như FODP soffice.

### Parse
- Ưu tiên `xlink:href` dạng `data:` (bytes sau hop nằm đây; poster PNG sibling không được thắng).
- `office:binary-data` vẫn dùng khi href rỗng (file FODP cũ).
- `draw:plugin` thắng `draw:image` poster (cùng pattern table).
- Kiểu video/audio: mime plugin **hoặc** mime trong data URL (`video/unknown` sau hop vẫn ra video vì href `data:video/mp4`).

### Không sửa
`apps/slides/slides-canvas.js` (chỉ đọc). Writer / Sheet. `main.py`. LibreOffice Core. Không SendKeys, không thư viện trả phí.

---

## FILES CHANGED

- `adapters/libreoffice/slides/slides-adapter.js` — data href + parse plugin trước image
- `tests/unit/slides-file-io.test.js` — href data URL; canned soffice `video/unknown` + poster
- `tests/live/fodp-save-media-pptx-real-conversion.mjs` — hop soffice thật + unzip PPTX
- `tests/helpers/tiny-media.mjs` — MP3/MP4/WAV nhỏ hợp lệ
- `tests/helpers/zip-package.mjs` — `listZipEntries`
- `tests/scripts/probe-fodp-media-pptx.mjs` — đo A/B/C/D/E trước khi sửa
- `docs/HANDOFF-FODP-MEDIA-PPTX-ROUNDTRIP.md`

## COMMANDS RUN

```
node tests/scripts/probe-fodp-media-pptx.mjs
node --check adapters/libreoffice/slides/slides-adapter.js
node tests/run-tests.js
node tests/live/fodp-save-media-pptx-real-conversion.mjs
node tests/live/fodp-save-shapes-real-conversion.mjs
node tests/live/fodp-save-table-arrow-real-conversion.mjs
node tests/live/fodp-save-transition-animation-real-conversion.mjs
node tests/live/fodp-save-title-body-animation-real-conversion.mjs
```

## BUILD RESULT: OK (không đổi build system)

## TEST RESULTS

| Suite | Lệnh | Kết quả |
|---|---|---|
| Master unit/smoke | `node tests/run-tests.js` | **743/743 PASS, 50.62s** (< 60s) |
| Live media hop | `node tests/live/fodp-save-media-pptx-real-conversion.mjs` | **PASS, 19.54s** — mp4 411b + mp3 417b khớp sau PPTX hop; PPTX 8391b; rels data-url video=true audio=true; `ppt/media/` không có |
| Live shapes (hồi quy) | `fodp-save-shapes-real-conversion.mjs` | **PASS** — rect/ellipse/textbox/connector/image |
| Live table/arrow (hồi quy) | `fodp-save-table-arrow-real-conversion.mjs` | **PASS** — table 2×2 + arrow |
| Live transition (hồi quy) | `fodp-save-transition-animation-real-conversion.mjs` | **PASS** — fade/slide/zoom + flyIn/fadeIn/zoomIn/bounceIn; flip vẫn mất (giới hạn cũ) |
| Live title/body anim (hồi quy) | `fodp-save-title-body-animation-real-conversion.mjs` | **PASS** — title/body/body2 animation |

## KNOWN FAILURES / LIMITATIONS

1. **PPTX từ FODP không có `ppt/media/`.** Bytes nằm trong `ppt/slides/_rels/slide1.xml.rels` dạng `data:` + `r:link`. PowerPoint/Impress khác có thể không phát như media nhúng native. Đây là giới hạn FODP (không có package stream), đã đo: cùng file trong ODP zip thì PPTX **có** `ppt/media/`.
2. **`draw:name` / `draw:id` media bị LO đổi** sau hop (parse ra id timestamp). Type + bytes + hình học còn. Live test khớp theo `type`, không theo `vid1`/`aud1`.
3. **`draw:mime-type` sau hop = `video/unknown` / `audio/unknown`.** Parse lấy mime từ data URL.
4. **Media lớn (vài MB) thành data URL** vẫn phình FODP và rels PPTX — thiết kế data URL sẵn có trên canvas, không phải hồi quy mới. Không đo file lớn trong task này.
5. **Hộp thoại Lưu native** vẫn chỉ Desktop (`main.py` ghi `draft.fodp` rồi soffice). Live test gọi serializer + soffice trực tiếp, cùng pipeline, không SendKeys. `main.py` không đổi — data href nằm trong chuỗi FODP nên Save-as-PPTX production sẽ đi encoding mới.
6. **Serialize ODP zip** (để PPTX PowerPoint-native) cần API mới + `main.py`. Ngoài scope.

## RISKS

Thấp. Parse plugin trước image chỉ đổi frame có `<draw:plugin>`. Ảnh thường, bảng, shape không đổi. Bốn live hop cũ PASS.

## DEPENDENCIES/BLOCKERS

Không. `soffice.exe` LibreOffice 26.2 sẵn. Không Office GUI, không SendKeys, không thư viện trả phí.

## CORE PATCH ID (if any): N/A

## NEXT ACTION

**KHÔNG merge vào main.** Review trên `fix/fodp-media-pptx-roundtrip`.

Follow-up tùy chọn (task riêng, đụng `main.py` / ODP zip): `serializeToOdp()` ghi `Media/*.mp4` vào gói → soffice ODP→PPTX tạo `ppt/media/` `r:embed`. Vòng **mở lại** PPTX đó qua FODP vẫn mất bytes (đã đo ODP→PPTX→FODP) trừ khi pipeline mở đọc PPTX/ODP zip trực tiếp thay vì FODP.
