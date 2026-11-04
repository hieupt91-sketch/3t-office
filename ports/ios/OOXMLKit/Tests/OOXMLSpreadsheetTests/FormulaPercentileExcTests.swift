import XCTest
@testable import OOXMLSpreadsheet

/// M7 lát 5: PERCENTILE.EXC / QUARTILE.EXC — nội suy loại trừ, rank = k * (n + 1),
/// k ∈ (0, 1); hai đầu 0% và 100% không tính được (Excel).
final class FormulaPercentileExcTests: XCTestCase {
    func n(_ d: Double) -> CellValue { .number(d) }
    func err(_ e: String) -> CellValue { .error(e) }

    func calc(_ formula: String, _ cells: [String: CellValue] = [:]) -> CellValue {
        let e = FormulaEngine()
        e.addSheet("Sheet1")
        for (k, v) in cells { e.setValue(v, sheet: "Sheet1", at: k) }
        e.setFormula(formula, sheet: "Sheet1", at: "Z99")
        e.recalculate()
        return e.value(sheet: "Sheet1", at: "Z99")
    }

    /// Vùng A1:A4 = 10, 20, 30, 40 (kèm một ô chữ + một ô logic bị bỏ qua).
    var range: [String: CellValue] {
        ["A1": n(10), "A2": n(20), "A3": n(30), "A4": n(40),
         "A5": .string("khong-tinh"), "A6": .bool(true)]
    }

    func testPercentileExc() {
        XCTAssertEqual(calc("PERCENTILE.EXC(A1:A4,0.25)", range), n(12.5), "rank 1.25")
        XCTAssertEqual(calc("PERCENTILE.EXC(A1:A4,0.5)", range), n(25), "rank 2.5, bằng MEDIAN ở đây")
        XCTAssertEqual(calc("PERCENTILE.EXC(A1:A4,0.75)", range), n(37.5), "rank 3.75")
        XCTAssertEqual(calc("PERCENTILE.EXC(A1:A4,0.2)", range), n(10), "rank 1.0 → giá trị đầu")
        XCTAssertEqual(calc("PERCENTILE.EXC(A1:A4,0.8)", range), n(40), "rank 4.0 → giá trị cuối")
        XCTAssertEqual(calc("PERCENTILE.EXC(A1:A6,0.5)", range), n(25), "chữ/logic trong vùng bị bỏ qua")
        XCTAssertEqual(calc("PERCENTILE.EXC(A1:A2,0.5)", ["A1": n(0), "A2": n(10)]), n(5), "rank 1.5")
    }

    func testPercentileExcErrors() {
        XCTAssertEqual(calc("PERCENTILE.EXC(A1:A4,0)", range), err("#NUM!"), "k = 0 bị loại")
        XCTAssertEqual(calc("PERCENTILE.EXC(A1:A4,1)", range), err("#NUM!"), "k = 1 bị loại")
        XCTAssertEqual(calc("PERCENTILE.EXC(A1:A4,0.1)", range), err("#NUM!"), "rank 0.5 < 1")
        XCTAssertEqual(calc("PERCENTILE.EXC(A1:A4,0.9)", range), err("#NUM!"), "rank 4.5 > 4")
        XCTAssertEqual(calc("PERCENTILE.EXC(A1:A4,-0.1)", range), err("#NUM!"))
        XCTAssertEqual(calc("PERCENTILE.EXC(A1:A4,1.1)", range), err("#NUM!"))
        XCTAssertEqual(calc("PERCENTILE.EXC(A5:A6,0.5)", range), err("#NUM!"), "không có số nào")
        XCTAssertEqual(calc("PERCENTILE.EXC(A1:A4,\"x\")", range), err("#VALUE!"))
        XCTAssertEqual(calc("PERCENTILE.EXC(A1:A4)", range), err("#VALUE!"))
        XCTAssertEqual(calc("PERCENTILE.EXC(#N/A,0.5)"), err("#N/A"), "lỗi lan truyền")
    }

    func testQuartileExc() {
        XCTAssertEqual(calc("QUARTILE.EXC(A1:A4,1)", range), n(12.5))
        XCTAssertEqual(calc("QUARTILE.EXC(A1:A4,2)", range), n(25), "bằng MEDIAN ở đây")
        XCTAssertEqual(calc("QUARTILE.EXC(A1:A4,3)", range), n(37.5))
        XCTAssertEqual(calc("QUARTILE.EXC(A1:A4,2.9)", range), n(25), "quart cắt về nguyên")
    }

    func testQuartileExcErrors() {
        XCTAssertEqual(calc("QUARTILE.EXC(A1:A4,0)", range), err("#NUM!"), "quart 0 → k = 0 bị loại")
        XCTAssertEqual(calc("QUARTILE.EXC(A1:A4,4)", range), err("#NUM!"), "quart 4 → k = 1 bị loại")
        XCTAssertEqual(calc("QUARTILE.EXC(A1:A4,-1)", range), err("#NUM!"))
        XCTAssertEqual(calc("QUARTILE.EXC(A1:A4,5)", range), err("#NUM!"))
        XCTAssertEqual(calc("QUARTILE.EXC(A5:A6,2)", range), err("#NUM!"), "không có số nào")
        XCTAssertEqual(calc("QUARTILE.EXC(A1:A4,\"x\")", range), err("#VALUE!"))
        XCTAssertEqual(calc("QUARTILE.EXC(A1:A4)", range), err("#VALUE!"))
    }
}
