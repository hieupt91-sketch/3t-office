# Agent Handoff

TASK: P1 - giảm thời gian các khâu Python khi mở Sheet lớn, không đổi đầu ra/hành vi
AGENT/ROLE: Codex / Sheet performance
BRANCH: `perf/p1-sheet-python-codex` (từ `main` `4c16109e`)
WORKTREE: `E:\VNOffice-codex-p1`
OBJECTIVE: Giảm tổng `native_overlay + optimize_fods + build_compact_payload`; đầu ra từng khâu phải giống byte với đường cũ trên LAN01-LAN28.

## Kế hoạch đã chốt trước khi sửa

- Current capability: XLSX được LibreOffice xuất FODS; Python overlay metadata native, tối ưu FODS, rồi dựng payload v2.
- Files/modules dự kiến: `main.py`, `adapters/libreoffice/common/ooxml_zip_patch.py`, `adapters/libreoffice/sheet/sheet_open_payload.py`, probe trong `scripts/perf-proto/`, test Python liên quan và handoff này.
- Dependency: chỉ Python stdlib và helper sẵn có; không thêm dependency, không đổi UI/core/file-format semantics.
- Risk: sai whitespace/thứ tự thuộc tính XML, sai repeat split, payload nén khác byte, tăng peak RAM.
- Test plan: SHA-256 bốn checkpoint legacy/mới trên LAN01-LAN28; unit Python hẹp trong lúc sửa; cuối cùng đúng một lượt full Node, Python liên quan, desktop CDP, batch audit và benchmark 3 lần lấy trung vị.
- Rollback: giữ nguyên mọi hàm cũ dưới hậu tố `_legacy` với chú thích bắt buộc; `VNO_OPEN_LEGACY=1` chọn toàn bộ đường cũ.

## Bằng chứng cProfile trước sửa (bắt buộc)

Lệnh dùng probe có sẵn `scripts/perf-proto/native_overlay_profile.py`, mode `baseline`, FODS thô do LibreOffice xuất ngay trước khi đo. Thời gian dưới cProfile có overhead nên dùng để xếp hạng hot path, không dùng làm baseline benchmark.

| File | FODS thô | Tổng cProfile | Calls | Hàm | Calls | Self (s) | Cumulative (s) |
|---|---:|---:|---:|---|---:|---:|---:|
| lan14 | 257.170.257 B / 255.065.122 chars | 100,238 s | 143.349.988 | `_overlay_sheet_cell_metadata_from_xlsx` | 1 | 0,703 | 77,234 |
| lan14 | như trên | như trên | như trên | `_xlsx_cells_with_metadata` | 1 | 10,116 | 39,884 |
| lan14 | như trên | như trên | như trên | `apply_row` | 56.380 | 5,748 | 33,289 |
| lan14 | như trên | như trên | như trên | `_xml_attrs` | 1.519.870 | 7,317 | 15,819 |
| lan14 | như trên | như trên | như trên | regex `Pattern.sub` | 220/12 | 4,880 | 14,511 |
| lan06 | 146.189.377 B / 146.181.326 chars | 168,900 s | 303.128.192 | `_overlay_sheet_cell_metadata_from_xlsx` | 1 | 0,388 | 125,187 |
| lan06 | như trên | như trên | như trên | `_xlsx_cells_with_metadata` | 1 | 18,805 | 68,768 |
| lan06 | như trên | như trên | như trên | `apply_row` | 717 | 9,615 | 53,664 |
| lan06 | như trên | như trên | như trên | `_overlay_sheet_layout_from_xlsx` | 1 | 17,359 | 40,046 |
| lan06 | như trên | như trên | như trên | `_xml_attrs` | 3.526.977 | 12,568 | 26,851 |

Checkpoint overlay legacy: lan14 `596a873ced98b5da04c6c33b3723c186a1c1633fc08ab5866eee1f8e992c839d`; lan06 `12337ab132476e3e23993c58470af546d9bfe34ead6ba43bb91eac1046c3f1fd`.

Raw logs/profiles (không commit): `.codex-testlogs/perf-p1/lan{06,14}-profile.log`, `.prof`, `.raw.fods`.

FINDINGS: Chưa kết luận tối ưu; profile xác nhận chi phí chính nằm ở metadata index/apply và layout overlay, không chỉ ở các `re.sub` toàn chuỗi.
IMPLEMENTATION SUMMARY: Chưa làm.
FILES CHANGED: `docs/HANDOFF-PERF-P1.md`.
COMMANDS RUN: xem các mục bằng chứng và kết quả dưới đây.
BUILD RESULT: NOT RUN.
TEST RESULTS: NOT RUN.
KNOWN FAILURES: Chưa có.
RISKS: Peak RAM khi cùng giữ FODS 146-300 MB và nhiều bản sao chuỗi.
DEPENDENCIES/BLOCKERS: Corpus LAN đọc từ `E:\VNOffice-agy-sheet-perf\file test\lan` vì worktree P1 không chứa `file test/`.
CORE PATCH ID (if any): Không có; không sửa LibreOffice Core.
NEXT ACTION: Tối ưu hot path, thêm đường legacy và probe so sánh 4 checkpoint.
