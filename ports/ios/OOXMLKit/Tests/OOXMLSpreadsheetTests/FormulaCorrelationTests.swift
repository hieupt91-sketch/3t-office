import XCTest
@testable import OOXMLSpreadsheet

/// M7 lát 12: CORREL, PEARSON, STEYX.
final class FormulaCorrelationTests: XCTestCase {
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

    /// x = 1..5 (A), y = 3, 5, 7, 9, 11 (B): đường y = 2x + 1.
    var perfect: [String: CellValue] {
        ["A1": n(1), "A2": n(2), "A3": n(3), "A4": n(4), "A5": n(5),
         "B1": n(3), "B2": n(5), "B3": n(7), "B4": n(9), "B5": n(11)]
    }

    /// x = 1..5 (C), y = 2, 4, 5, 4, 5 (D): slope 0.6, intercept 2.2,
    /// CORREL = 6/√60, STEYX = √(2.4/3).
    var partial: [String: CellValue] {
        ["C1": n(1), "C2": n(2), "C3": n(3), "C4": n(4), "C5": n(5),
         "D1": n(2), "D2": n(4), "D3": n(5), "D4": n(4), "D5": n(5)]
    }

    /// x = 1, 2, 3, 4 (F), y = 2, "t", 6, 8 (E): cặp có chữ bị bỏ,
    /// còn (2,1), (6,3), (8,4) → đường y = 2x.
    var withText: [String: CellValue] {
        ["F1": n(1), "F2": n(2), "F3": n(3), "F4": n(4),
         "E1": n(2), "E2": .string("t"), "E3": n(6), "E4": n(8)]
    }

    func testCorrelPearsonPerfect() {
        XCTAssertEqual(num("CORREL(B1:B5,A1:A5)", perfect), 1, accuracy: 1e-9)
        XCTAssertEqual(num("PEARSON(B1:B5,A1:A5)", perfect), 1, accuracy: 1e-9, "PEARSON đồng nghĩa CORREL")
    }

    func testCorrelNegative() {
        let cells: [String: CellValue] = [
            "A1": n(1), "A2": n(2), "A3": n(3), "A4": n(4), "A5": n(5),
            "B1": n(11), "B2": n(9), "B3": n(7), "B4": n(5), "B5": n(3)]
        XCTAssertEqual(num("CORREL(B1:B5,A1:A5)", cells), -1, accuracy: 1e-9)
        XCTAssertEqual(num("PEARSON(B1:B5,A1:A5)", cells), -1, accuracy: 1e-9)
    }

    func testCorrelPartial() {
        XCTAssertEqual(num("CORREL(D1:D5,C1:C5)", partial), 0.7745966692414834, accuracy: 1e-9, "6/√60")
        XCTAssertEqual(num("PEARSON(D1:D5,C1:C5)", partial), 0.7745966692414834, accuracy: 1e-9)
    }

    func testSteyx() {
        XCTAssertEqual(num("STEYX(B1:B5,A1:A5)", perfect), 0, accuracy: 1e-9, "khớp hoàn hảo")
        XCTAssertEqual(num("STEYX(D1:D5,C1:C5)", partial), 0.8944271909999159, accuracy: 1e-9, "√(2.4/3)")
    }

    func testPairDroppedForTextInRange() {
        XCTAssertEqual(num("CORREL(E1:E4,F1:F4)", withText), 1, accuracy: 1e-9, "cặp có chữ bị bỏ cùng nhau")
        XCTAssertEqual(num("STEYX(E1:E4,F1:F4)", withText), 0, accuracy: 1e-9)
    }

    func testCorrelSteyxErrors() {
        XCTAssertEqual(calc("CORREL(B1:B4,A1:A5)", perfect), err("#N/A"), "khác số điểm")
        XCTAssertEqual(calc("CORREL(G1:G3,H1:H3)", perfect), err("#N/A"), "hai vùng rỗng")
        XCTAssertEqual(calc("PEARSON(B1:B3,I1:I3)", perfect.merging(["I1": n(5), "I2": n(5), "I3": n(5)]) { _, new in new }),
                       err("#DIV/0!"), "x hằng số")
        XCTAssertEqual(calc("CORREL(J1:J3,A1:A3)", ["J1": n(4), "J2": n(4), "J3": n(4),
                                                   "A1": n(1), "A2": n(2), "A3": n(3)]),
                       err("#DIV/0!"), "y hằng số")
        XCTAssertEqual(calc("STEYX(B1:B2,A1:A2)", perfect), err("#DIV/0!"), "chỉ 2 cặp (n−2 = 0)")
        XCTAssertEqual(num("CORREL(B1:B2,A1:A2)", perfect), 1, accuracy: 1e-9, "CORREL vẫn tính được với 2 cặp")
        XCTAssertEqual(calc("STEYX(B1:B3,I1:I3)", perfect.merging(["I1": n(5), "I2": n(5), "I3": n(5)]) { _, new in new }),
                       err("#DIV/0!"), "x hằng số (STEYX)")
        XCTAssertEqual(calc("CORREL(K1:K2,A1:A2)", ["K1": err("#N/A"), "K2": n(5),
                                                   "A1": n(1), "A2": n(2)]),
                       err("#N/A"), "lỗi lan truyền")
        XCTAssertEqual(calc("CORREL(A1:A5)", perfect), err("#VALUE!"), "thiếu đối số")
        XCTAssertEqual(calc("CORREL(\"x\",3)", perfect), err("#VALUE!"), "đối số trực tiếp không ép được sang số")
    }
}
