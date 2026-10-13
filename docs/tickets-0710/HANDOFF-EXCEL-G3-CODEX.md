# Agent Handoff
TASK: EXCEL-G3 — biểu đồ đủ loại và thành phần
AGENT/ROLE: Codex (khung) + Claude (kiểm chứng, sửa phân tán, gộp)
BRANCH: fix/excel-g3-codex
OBJECTIVE: Thêm loại biểu đồ (thanh ngang, cột chồng, cột chồng 100%, phân tán, kết hợp, radar, bong bóng), nhãn dữ liệu, chuyển hàng/cột, đường xu hướng; lưu XLSX gốc; mở lại đúng.
FINDINGS: Excel 2016 (COM chỉ-đọc, tests/live/sheet-excel-g3-readonly.ps1 + bản thử lại của Claude) đọc đúng ChartType: 57 thanh ngang, 52 cột chồng, 53 cột chồng 100%, -4169 phân tán chỉ điểm, -4111 kết hợp (chuỗi 1 là cột, còn lại là đường), -4151 radar, 15 bong bóng; HasDataLabels, Trendlines, PlotBy đúng. Lỗi tìm thấy khi kiểm: phân tán lưu ra bản của LibreOffice (kiểu đường, không điểm) → Excel đọc là 75; đã sửa bằng _normalize_scatter_chart_markers (ooxml_zip_patch.py) + test.
TEST RESULTS: PASS — npm 3175/3175; Python test_sheet_chart_types_xlsx 5 OK; desktop sheet-excel-g3 PASS (UI tạo bubble, bật nhãn/đổi hàng cột/đường xu hướng, lưu, OOXML đủ loại, mở lại giữ loại và thành phần); Excel 2016 đọc 7/7 biểu đồ đúng loại; 11/11 loại vẽ SVG trong app; LAN batch 12/12 tệp 0 chênh lệch; lan28 98,18%, lan01/lan04 100%.
KNOWN FAILURES: Chưa có biểu đồ 3-D, chứng khoán, bề mặt, histogram/waterfall/treemap/sunburst/box/pareto (ưu tiên 3). Chưa so ảnh hiển thị trong app với Excel. Chưa kiểm biểu đồ phân tán nhiều chuỗi (hiện dùng chuỗi đầu làm X).
NEXT ACTION: Gộp main; G4 công thức nâng cao.