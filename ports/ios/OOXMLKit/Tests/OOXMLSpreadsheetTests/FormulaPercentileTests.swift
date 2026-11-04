import XCTest
@testable import OOXMLSpreadsheet

/// M7 lát 4: PERCENTILE.INC / QUARTILE.INC (+ bí danh cũ PERCENTILE / QUARTILE) —
/// nội suy tuyến tính, quy ước Excel (xem FormulaFunctionsSlice2.percentileValue).
final class FormulaPercentileTests: XCTestCase {
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

    func testPercentileInc() {
        XCTAssertEqual(calc("PERCENTILE.INC(A1:A4,0)", range), n(10), "k = 0 → min")
        XCTAssertEqual(calc("PERCENTILE.INC(A1:A4,0.25)", range), n(17.5))
        XCTAssertEqual(calc("PERCENTILE.INC(A1:A4,0.5)", range), n(25), "bằng MEDIAN")
        XCTAssertEqual(calc("PERCENTILE.INC(A1:A4,0.75)", range), n(32.5))
        XCTAssertEqual(calc("PERCENTILE.INC(A1:A4,1)", range), n(40), "k = 1 → max")
        XCTAssertEqual(calc("PERCENTILE.INC(A1:A6,0.5)", range), n(25), "chữ/logic trong vùng bị bỏ qua")
        XCTAssertEqual(calc("PERCENTILE.INC(A1:A2,0.3)", ["A1": n(0), "A2": n(10)]), n(3), "nội suy giữa 2 giá trị")
        XCTAssertEqual(calc("PERCENTILE(A1:A4,0.5)", range), n(25), "bí danh cũ PERCENTILE")
    }

    func testPercentileIncErrors() {
        XCTAssertEqual(calc("PERCENTILE.INC(A1:A4,-0.1)", range), err("#NUM!"))
        XCTAssertEqual(calc("PERCENTILE.INC(A1:A4,1.1)", range), err("#NUM!"))
        XCTAssertEqual(calc("PERCENTILE.INC(A5:A6,0.5)", range), err("#NUM!"), "không có số nào")
        XCTAssertEqual(calc("PERCENTILE.INC(A1:A4,\"x\")", range), err("#VALUE!"))
        XCTAssertEqual(calc("PERCENTILE.INC(A1:A4)", range), err("#VALUE!"))
        XCTAssertEqual(calc("PERCENTILE.INC(#N/A,0.5)"), err("#N/A"), "lỗi lan truyền")
    }

    func testQuartileInc() {
        XCTAssertEqual(calc("QUARTILE.INC(A1:A4,0)", range), n(10), "quart 0 → min")
        XCTAssertEqual(calc("QUARTILE.INC(A1:A4,1)", range), n(17.5))
        XCTAssertEqual(calc("QUARTILE.INC(A1:A4,2)", range), n(25), "bằng MEDIAN")
        XCTAssertEqual(calc("QUARTILE.INC(A1:A4,3)", range), n(32.5))
        XCTAssertEqual(calc("QUARTILE.INC(A1:A4,4)", range), n(40), "quart 4 → max")
        XCTAssertEqual(calc("QUARTILE.INC(A1:A4,2.9)", range), n(25), "quart cắt về nguyên")
        XCTAssertEqual(calc("QUARTILE(A1:A4,3)", range), n(32.5), "bí danh cũ QUARTILE")
    }

    func testQuartileIncErrors() {
        XCTAssertEqual(calc("QUARTILE.INC(A1:A4,-1)", range), err("#NUM!"))
        XCTAssertEqual(calc("QUARTILE.INC(A1:A4,5)", range), err("#NUM!"))
        XCTAssertEqual(calc("QUARTILE.INC(A5:A6,2)", range), err("#NUM!"), "không có số nào")
        XCTAssertEqual(calc("QUARTILE.INC(A1:A4,\"x\")", range), err("#VALUE!"))
        XCTAssertEqual(calc("QUARTILE.INC(A1:A4)", range), err("#VALUE!"))
    }
}
