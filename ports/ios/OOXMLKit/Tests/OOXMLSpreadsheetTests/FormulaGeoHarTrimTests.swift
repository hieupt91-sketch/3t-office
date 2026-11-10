import XCTest
@testable import OOXMLSpreadsheet

/// M7 lát 8: GEOMEAN, HARMEAN, TRIMMEAN.
final class FormulaGeoHarTrimTests: XCTestCase {
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

    /// Vùng A1:A5 = 2, 4, 8, 16, 32 (kèm một ô chữ + một ô logic bị bỏ qua).
    /// GEOMEAN = 8; HARMEAN = 160/31.
    var range: [String: CellValue] {
        ["A1": n(2), "A2": n(4), "A3": n(8), "A4": n(16), "A5": n(32),
         "A6": .string("khong-tinh"), "A7": .bool(true)]
    }

    /// Vùng B1:B5 = 1, 2, 3, 4, 100 cho TRIMMEAN.
    var trimRange: [String: CellValue] {
        ["B1": n(1), "B2": n(2), "B3": n(3), "B4": n(4), "B5": n(100)]
    }

    func testGeoHarMean() {
        XCTAssertEqual(num("GEOMEAN(A1:A5)", range), 8, accuracy: 1e-9)
        XCTAssertEqual(num("GEOMEAN(A1:A7)", range), 8, accuracy: 1e-9, "chữ/logic trong vùng bị bỏ qua")
        XCTAssertEqual(num("GEOMEAN(4,9)", range), 6, accuracy: 1e-9, "đối số trực tiếp")
        XCTAssertEqual(num("GEOMEAN(1,2,4)", range), 2, accuracy: 1e-9)
        XCTAssertEqual(num("HARMEAN(A1:A5)", range), 160.0 / 31, accuracy: 1e-9)
        XCTAssertEqual(num("HARMEAN(A1:A7)", range), 160.0 / 31, accuracy: 1e-9, "chữ/logic trong vùng bị bỏ qua")
        XCTAssertEqual(num("HARMEAN(4,9)", range), 72.0 / 13, accuracy: 1e-9, "đối số trực tiếp")
        XCTAssertEqual(num("GEOMEAN(A1)", range), 2, accuracy: 1e-9, "một giá trị")
        XCTAssertEqual(num("HARMEAN(A1)", range), 2, accuracy: 1e-9, "một giá trị")
    }

    func testTrimMean() {
        XCTAssertEqual(num("TRIMMEAN(B1:B5,0.4)", trimRange), 3, accuracy: 1e-9, "cắt 1 đầu mỗi bên")
        XCTAssertEqual(num("TRIMMEAN(B1:B5,0.2)", trimRange), 22, accuracy: 1e-9, "1 < 2 nên không cắt")
        XCTAssertEqual(num("TRIMMEAN(B1:B5,0)", trimRange), 22, accuracy: 1e-9, "không cắt")
        XCTAssertEqual(num("TRIMMEAN(B1:B5,1)", trimRange), 3, accuracy: 1e-9, "cắt 2 đầu mỗi bên, giữ lại giữa")
        XCTAssertEqual(num("TRIMMEAN(B1:B5,0.5)", trimRange), 3, accuracy: 1e-9, "2.5 làm tròn xuống 2")
    }

    func testGeoHarTrimErrors() {
        XCTAssertEqual(calc("GEOMEAN(0,5)", range), err("#NUM!"), "giá trị 0")
        XCTAssertEqual(calc("GEOMEAN(-1,5)", range), err("#NUM!"), "giá trị âm")
        XCTAssertEqual(calc("GEOMEAN(A6:A7)", range), err("#NUM!"), "không có số nào")
        XCTAssertEqual(calc("HARMEAN(0,5)", range), err("#NUM!"), "giá trị 0")
        XCTAssertEqual(calc("HARMEAN(-2,5)", range), err("#NUM!"), "giá trị âm")
        XCTAssertEqual(calc("HARMEAN(A6:A7)", range), err("#NUM!"), "không có số nào")
        XCTAssertEqual(calc("GEOMEAN(A1:A5,\"x\")", range), err("#VALUE!"), "chuỗi trực tiếp ép không được")
        XCTAssertEqual(calc("TRIMMEAN(B1:B5,1.5)", trimRange), err("#NUM!"), "percent > 1")
        XCTAssertEqual(calc("TRIMMEAN(B1:B5,-0.1)", trimRange), err("#NUM!"), "percent < 0")
        XCTAssertEqual(calc("TRIMMEAN(A6:A7,0.2)", range), err("#DIV/0!"), "không có số nào")
        XCTAssertEqual(calc("TRIMMEAN()", trimRange), err("#VALUE!"), "thiếu đối số")
        XCTAssertEqual(calc("TRIMMEAN(B1:B5)", trimRange), err("#VALUE!"), "thiếu percent")
        XCTAssertEqual(calc("TRIMMEAN(C1:C2,0.2)", ["C1": err("#N/A"), "C2": n(5)]), err("#N/A"), "lỗi lan truyền")
    }
}
