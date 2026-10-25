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
        }
    }
}
