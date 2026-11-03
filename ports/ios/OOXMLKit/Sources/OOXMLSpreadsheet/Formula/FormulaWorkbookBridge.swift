import Foundation

/// Cầu nối thuần-thêm: nạp dữ liệu từ `Workbook` vào `FormulaEngine` (chỉ đọc, không sửa tệp).
extension FormulaEngine {
    /// Nạp mọi worksheet (bỏ chartsheet). Công thức chia sẻ đã được `Worksheet.cells` dịch sẵn.
    public convenience init(workbook: Workbook) throws {
        self.init()
        for name in workbook.sheetNames {
            guard let ws = try? workbook.worksheet(named: name) else { continue }
            addSheet(name)
            for c in ws.cells {
                if let f = c.formula {
                    setFormula(f, sheet: name, at: c.reference.a1)
                } else {
                    setValue(c.value, sheet: name, at: c.reference.a1)
                }
            }
            // Công thức mảng: đăng ký theo vùng để evaluator giao ngầm từng ô (ghi đè cách đăng ký ô chủ ở trên).
            for af in ws.arrayFormulas {
                setArrayFormula(af.formula, sheet: name, range: af.range)
            }
        }
        // M7 lát 1: nạp tên vùng của workbook (chỉ đích là ô/vùng; tên hệ thống _xlnm.* bỏ qua).
        for dn in workbook.definedNames where !dn.name.hasPrefix("_xlnm") {
            guard let expr = try? FormulaParser.parse(dn.formula) else { continue }
            let local = dn.localSheetIndex.flatMap {
                workbook.sheetNames.indices.contains($0) ? workbook.sheetNames[$0] : nil
            }
            switch expr {
            case .range(let sh, let r):
                if let s = sh { defineName(dn.name, localSheet: local, sheet: s, range: r) }
            case .cell(let sh, let r):
                if let s = sh { defineName(dn.name, localSheet: local, sheet: s, range: CellRange(r, r)) }
            default: continue
            }
        }
    }
}
