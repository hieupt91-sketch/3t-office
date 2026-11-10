import XCTest
@testable import OOXMLSpreadsheet

/// M7 lát 6: STDEV.S / STDEV.P / VAR.S / VAR.P (+ bí danh cũ STDEV, STDEVP,
/// VAR, VARP). Mẫu chia cho n − 1, tổng thể chia cho n (Excel).
final class FormulaStdevVarTests: XCTestCase {
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

    func num(_ formula: String, _ cells: [String: CellValue] = [:]) -> Double {
        if case .number(let d) = calc(formula, cells) { return d }
        XCTFail("mong số, nhận \(calc(formula, cells)) cho \(formula)")
        return .nan
    }

    /// Vùng A1:A4 = 10, 20, 30, 40 (kèm một ô chữ + một ô logic bị bỏ qua).
    /// Trung bình 25, tổng bình phương độ lệch 500.
    var range: [String: CellValue] {
        ["A1": n(10), "A2": n(20), "A3": n(30), "A4": n(40),
         "A5": .string("khong-tinh"), "A6": .bool(true)]
    }

    func testVariance() {
        XCTAssertEqual(num("VAR.S(A1:A4)", range), 500.0 / 3, accuracy: 1e-9)
        XCTAssertEqual(num("VAR.P(A1:A4)", range), 125, accuracy: 1e-9)
        XCTAssertEqual(num("VAR(A1:A4)", range), 500.0 / 3, accuracy: 1e-9, "VAR = VAR.S")
        XCTAssertEqual(num("VARP(A1:A4)", range), 125, accuracy: 1e-9, "VARP = VAR.P")
        XCTAssertEqual(num("VAR.S(A1:A6)", range), 500.0 / 3, accuracy: 1e-9, "chữ/logic trong vùng bị bỏ qua")
        XCTAssertEqual(num("VAR.S(10,20,30)", range), 100, accuracy: 1e-9, "đối số trực tiếp")
        XCTAssertEqual(num("VAR.P(7)", range), 0, accuracy: 1e-9, "một giá trị, tổng thể = 0")
        XCTAssertEqual(num("VAR.S(A1:A4,A1:A4)", range), 1000.0 / 7, accuracy: 1e-9, "ghép đôi vùng: n = 8, tổng bình phương độ lệch = 1000, chia 7")
    }

    func testStdev() {
        XCTAssertEqual(num("STDEV.S(A1:A4)", range), (500.0 / 3).squareRoot(), accuracy: 1e-9)
        XCTAssertEqual(num("STDEV.P(A1:A4)", range), 125.squareRoot(), accuracy: 1e-9)
        XCTAssertEqual(num("STDEV(A1:A4)", range), (500.0 / 3).squareRoot(), accuracy: 1e-9, "STDEV = STDEV.S")
        XCTAssertEqual(num("STDEVP(A1:A4)", range), 125.squareRoot(), accuracy: 1e-9, "STDEVP = STDEV.P")
        XCTAssertEqual(num("STDEV.S(10,20,30)", range), 10, accuracy: 1e-9)
        XCTAssertEqual(num("STDEV.P(7)", range), 0, accuracy: 1e-9)
        XCTAssertEqual(num("STDEV.S(A1:A6)", range), (500.0 / 3).squareRoot(), accuracy: 1e-9, "chữ/logic trong vùng bị bỏ qua")
    }

    func testStdevVarErrors() {
        XCTAssertEqual(calc("STDEV.S(A1)", range), err("#DIV/0!"), "mẫu cần n ≥ 2")
        XCTAssertEqual(calc("VAR.S(A1)", range), err("#DIV/0!"), "mẫu cần n ≥ 2")
        XCTAssertEqual(calc("STDEV.P(A5:A6)", range), err("#DIV/0!"), "không có số nào")
        XCTAssertEqual(calc("VAR.P(A5:A6)", range), err("#DIV/0!"), "không có số nào")
        XCTAssertEqual(calc("STDEV.S()", range), err("#VALUE!"), "thiếu đối số")
        XCTAssertEqual(calc("VAR.S(A1:A4,\"x\")", range), err("#VALUE!"), "chuỗi trực tiếp ép không được")
        XCTAssertEqual(calc("STDEV.S(#N/A)", range), err("#N/A"), "lỗi lan truyền")
    }
}
