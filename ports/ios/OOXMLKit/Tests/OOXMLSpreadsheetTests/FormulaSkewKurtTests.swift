import XCTest
@testable import OOXMLSpreadsheet

/// M7 lát 9: SKEW, SKEW.P, KURT.
final class FormulaSkewKurtTests: XCTestCase {
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

    /// Vùng A1:A5 = 1, 2, 3, 4, 100 (lệch phải mạnh, kèm ô chữ + ô logic bị bỏ qua).
    var range: [String: CellValue] {
        ["A1": n(1), "A2": n(2), "A3": n(3), "A4": n(4), "A5": n(100),
         "A6": .string("khong-tinh"), "A7": .bool(true)]
    }

    /// Vùng B1:B5 = 2, 4, 6, 8, 10 (đối xứng → lệch 0, nhọn thừa −1.2).
    var symRange: [String: CellValue] {
        ["B1": n(2), "B2": n(4), "B3": n(6), "B4": n(8), "B5": n(10)]
    }

    func testSkew() {
        XCTAssertEqual(num("SKEW(A1:A5)", range), 2.23239591164, accuracy: 1e-9)
        XCTAssertEqual(num("SKEW(A1:A7)", range), 2.23239591164, accuracy: 1e-9, "chữ/logic trong vùng bị bỏ qua")
        XCTAssertEqual(num("SKEW(B1:B5)", symRange), 0, accuracy: 1e-9, "dãy đối xứng")
        XCTAssertEqual(num("SKEW(1,2,3,4,100)", range), 2.23239591164, accuracy: 1e-9, "đối số trực tiếp")
        XCTAssertEqual(num("SKEW(3,3,3,5)", range), 2, accuracy: 1e-9)
    }

    func testSkewP() {
        XCTAssertEqual(num("SKEW.P(A1:A5)", range), 1.49753670333, accuracy: 1e-9)
        XCTAssertEqual(num("SKEW.P(B1:B5)", symRange), 0, accuracy: 1e-9, "dãy đối xứng")
        XCTAssertEqual(num("SKEW.P(3,3,3,5)", range), 1.15470053838, accuracy: 1e-9)
        XCTAssertEqual(num("SKEW.P(1,2,3)", range), 0, accuracy: 1e-9, "mẫu tổng thể 3 giá trị đối xứng")
    }

    func testKurt() {
        XCTAssertEqual(num("KURT(A1:A5)", range), 4.9868659572, accuracy: 1e-9)
        XCTAssertEqual(num("KURT(B1:B5)", symRange), -1.2, accuracy: 1e-9, "dãy đối xứng")
        XCTAssertEqual(num("KURT(3,3,3,5)", range), 4, accuracy: 1e-9)
        XCTAssertEqual(num("KURT(1,2,3,4,5,6)", range), -1.2, accuracy: 1e-9)
    }

    func testSkewKurtErrors() {
        XCTAssertEqual(calc("SKEW(A1:A2)", range), err("#DIV/0!"), "mẫu cần n ≥ 3")
        XCTAssertEqual(calc("SKEW(A6:A7)", range), err("#DIV/0!"), "không có số nào")
        XCTAssertEqual(calc("SKEW(5,5,5)", range), err("#DIV/0!"), "độ lệch chuẩn mẫu = 0")
        XCTAssertEqual(calc("SKEW.P(5)", range), err("#DIV/0!"), "một giá trị → σ = 0")
        XCTAssertEqual(calc("SKEW.P(5,5)", range), err("#DIV/0!"), "σ = 0")
        XCTAssertEqual(calc("KURT(A1:A3)", range), err("#DIV/0!"), "mẫu cần n ≥ 4")
        XCTAssertEqual(calc("KURT(5,5,5,5)", range), err("#DIV/0!"), "độ lệch chuẩn mẫu = 0")
        XCTAssertEqual(calc("KURT(A6:A7)", range), err("#DIV/0!"), "không có số nào")
        XCTAssertEqual(calc("SKEW(A1:A5,\"x\")", range), err("#VALUE!"), "chuỗi trực tiếp ép không được")
        XCTAssertEqual(calc("KURT(C1:C2,0.2)", ["C1": err("#N/A"), "C2": n(5)]), err("#N/A"), "lỗi lan truyền")
        XCTAssertEqual(calc("SKEW()", range), err("#VALUE!"), "thiếu đối số")
    }
}
