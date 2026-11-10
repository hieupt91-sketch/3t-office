import XCTest
@testable import OOXMLSpreadsheet

/// M7 lát 13: COVARIANCE.S, COVARIANCE.P, FISHER, FISHERINV.
final class FormulaCovarianceFisherTests: XCTestCase {
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

    /// x = 1..5 (A), y = 3, 5, 7, 9, 11 (B): Σ(x−mx)(y−my) = 20.
    var perfect: [String: CellValue] {
        ["A1": n(1), "A2": n(2), "A3": n(3), "A4": n(4), "A5": n(5),
         "B1": n(3), "B2": n(5), "B3": n(7), "B4": n(9), "B5": n(11)]
    }

    /// x = 1..5 (C), y = 2, 4, 5, 4, 5 (D): Σ(x−mx)(y−my) = 6.
    var partial: [String: CellValue] {
        ["C1": n(1), "C2": n(2), "C3": n(3), "C4": n(4), "C5": n(5),
         "D1": n(2), "D2": n(4), "D3": n(5), "D4": n(4), "D5": n(5)]
    }

    /// x = 1, 2, 3, 4 (F), y = 2, "t", 6, 8 (E): cặp có chữ bị bỏ,
    /// còn (2,1), (6,3), (8,4) → Σ(x−mx)(y−my) = 28/3.
    var withText: [String: CellValue] {
        ["F1": n(1), "F2": n(2), "F3": n(3), "F4": n(4),
         "E1": n(2), "E2": .string("t"), "E3": n(6), "E4": n(8)]
    }

    func testCovariancePerfect() {
        XCTAssertEqual(num("COVARIANCE.S(B1:B5,A1:A5)", perfect), 5, accuracy: 1e-9, "20/4")
        XCTAssertEqual(num("COVARIANCE.P(B1:B5,A1:A5)", perfect), 4, accuracy: 1e-9, "20/5")
    }

    func testCovariancePartial() {
        XCTAssertEqual(num("COVARIANCE.S(D1:D5,C1:C5)", partial), 1.5, accuracy: 1e-9, "6/4")
        XCTAssertEqual(num("COVARIANCE.P(D1:D5,C1:C5)", partial), 1.2, accuracy: 1e-9, "6/5")
    }

    func testCovarianceDropsTextPair() {
        XCTAssertEqual(num("COVARIANCE.S(E1:E4,F1:F4)", withText), 14.0 / 3.0, accuracy: 1e-9, "(28/3)/2")
        XCTAssertEqual(num("COVARIANCE.P(E1:E4,F1:F4)", withText), 28.0 / 9.0, accuracy: 1e-9, "(28/3)/3")
    }

    func testCovarianceErrors() {
        XCTAssertEqual(calc("COVARIANCE.S(B1:B4,A1:A5)", perfect), err("#N/A"), "khác số điểm")
        XCTAssertEqual(calc("COVARIANCE.P(G1:G3,H1:H3)", perfect), err("#N/A"), "hai vùng rỗng")
        XCTAssertEqual(calc("COVARIANCE.S(B1,A1)", perfect), err("#DIV/0!"), "mẫu chỉ 1 cặp")
        XCTAssertEqual(num("COVARIANCE.P(B1,A1)", perfect), 0, accuracy: 1e-9, "tổng thể 1 cặp = 0")
    }

    func testFisher() {
        XCTAssertEqual(num("FISHER(0)"), 0, accuracy: 1e-12)
        XCTAssertEqual(num("FISHER(0.5)"), 0.5493061443340549, accuracy: 1e-12, "0.5·ln 3")
        XCTAssertEqual(num("FISHER(-0.5)"), -0.5493061443340549, accuracy: 1e-12, "hàm lẻ")
    }

    func testFisherinv() {
        XCTAssertEqual(num("FISHERINV(0)"), 0, accuracy: 1e-12)
        XCTAssertEqual(num("FISHERINV(0.5493061443340549)"), 0.5, accuracy: 1e-9, "ngược của FISHER(0.5)")
        XCTAssertEqual(num("FISHERINV(FISHER(0.75))"), 0.75, accuracy: 1e-9, "vòng tròn")
        XCTAssertEqual(num("FISHERINV(10)"), 0.9999999958776927, accuracy: 1e-9, "bão hòa, không tràn")
    }

    func testFisherErrors() {
        XCTAssertEqual(calc("FISHER(1)"), err("#NUM!"), "biên trên")
        XCTAssertEqual(calc("FISHER(-1)"), err("#NUM!"), "biên dưới")
        XCTAssertEqual(calc("FISHER(2)"), err("#NUM!"), "ngoài miền")
        XCTAssertEqual(calc("FISHER(\"t\")"), err("#VALUE!"), "không phải số")
    }
}
