import XCTest
@testable import OOXMLSpreadsheet

/// M7 lát 11: SLOPE, INTERCEPT, RSQ, FORECAST / FORECAST.LINEAR.
final class FormulaRegressionTests: XCTestCase {
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

    /// x = 1..5 (C), y = 2, 4, 5, 4, 5 (D): slope 0.6, intercept 2.2, RSQ 0.6.
    var partial: [String: CellValue] {
        ["C1": n(1), "C2": n(2), "C3": n(3), "C4": n(4), "C5": n(5),
         "D1": n(2), "D2": n(4), "D3": n(5), "D4": n(4), "D5": n(5)]
    }

    /// x = 1, 2, 3, 4 (F), y = 2, "t", 6, 8 (E): cặp có chữ bị bỏ,
    /// còn (2,1), (6,3), (8,4) → slope 2, intercept 0.
    var withText: [String: CellValue] {
        ["F1": n(1), "F2": n(2), "F3": n(3), "F4": n(4),
         "E1": n(2), "E2": .string("t"), "E3": n(6), "E4": n(8)]
    }

    func testSlopeInterceptPerfect() {
        XCTAssertEqual(num("SLOPE(B1:B5,A1:A5)", perfect), 2, accuracy: 1e-9)
        XCTAssertEqual(num("INTERCEPT(B1:B5,A1:A5)", perfect), 1, accuracy: 1e-9)
        XCTAssertEqual(num("RSQ(B1:B5,A1:A5)", perfect), 1, accuracy: 1e-9, "tương quan hoàn hảo")
    }

    func testSlopeInterceptPartial() {
        XCTAssertEqual(num("SLOPE(D1:D5,C1:C5)", partial), 0.6, accuracy: 1e-9)
        XCTAssertEqual(num("INTERCEPT(D1:D5,C1:C5)", partial), 2.2, accuracy: 1e-9)
        XCTAssertEqual(num("RSQ(D1:D5,C1:C5)", partial), 0.6, accuracy: 1e-9, "36/60")
        XCTAssertEqual(num("FORECAST.LINEAR(6,D1:D5,C1:C5)", partial), 5.8, accuracy: 1e-9)
    }

    func testForecastAliasAndOrder() {
        XCTAssertEqual(num("FORECAST.LINEAR(6,B1:B5,A1:A5)", perfect), 13, accuracy: 1e-9)
        XCTAssertEqual(num("FORECAST(0,B1:B5,A1:A5)", perfect), 1, accuracy: 1e-9, "bí danh cũ FORECAST")
    }

    func testNegativeCorrelation() {
        let cells: [String: CellValue] = [
            "A1": n(1), "A2": n(2), "A3": n(3), "A4": n(4), "A5": n(5),
            "B1": n(11), "B2": n(9), "B3": n(7), "B4": n(5), "B5": n(3)]
        XCTAssertEqual(num("SLOPE(B1:B5,A1:A5)", cells), -2, accuracy: 1e-9)
        XCTAssertEqual(num("INTERCEPT(B1:B5,A1:A5)", cells), 13, accuracy: 1e-9)
        XCTAssertEqual(num("RSQ(B1:B5,A1:A5)", cells), 1, accuracy: 1e-9, "RSQ luôn không âm")
    }

    func testPairDroppedForTextInRange() {
        XCTAssertEqual(num("SLOPE(E1:E4,F1:F4)", withText), 2, accuracy: 1e-9, "cặp có chữ bị bỏ cùng nhau")
        XCTAssertEqual(num("INTERCEPT(E1:E4,F1:F4)", withText), 0, accuracy: 1e-9)
    }

    func testRegressionErrors() {
        XCTAssertEqual(calc("SLOPE(B1:B4,A1:A5)", perfect), err("#N/A"), "khác số điểm")
        XCTAssertEqual(calc("SLOPE(G1:G3,H1:H3)", perfect), err("#N/A"), "hai vùng rỗng")
        XCTAssertEqual(calc("SLOPE(B1:B3,I1:I3)", perfect.merging(["I1": n(5), "I2": n(5), "I3": n(5)]) { _, new in new }),
                       err("#DIV/0!"), "x hằng số")
        XCTAssertEqual(calc("INTERCEPT(B1:B3,I1:I3)", perfect.merging(["I1": n(5), "I2": n(5), "I3": n(5)]) { _, new in new }),
                       err("#DIV/0!"), "x hằng số (INTERCEPT)")
        XCTAssertEqual(calc("RSQ(J1:J3,A1:A3)", ["J1": n(4), "J2": n(4), "J3": n(4),
                                                "A1": n(1), "A2": n(2), "A3": n(3)]),
                       err("#DIV/0!"), "y hằng số")
        XCTAssertEqual(calc("RSQ(B1,A1)", perfect), err("#DIV/0!"), "một cặp duy nhất")
        XCTAssertEqual(calc("FORECAST.LINEAR(6,B1:B3,I1:I3)", perfect.merging(["I1": n(5), "I2": n(5), "I3": n(5)]) { _, new in new }),
                       err("#DIV/0!"), "x hằng số (FORECAST)")
        XCTAssertEqual(calc("SLOPE(K1:K2,A1:A2)", ["K1": err("#N/A"), "K2": n(5),
                                                  "A1": n(1), "A2": n(2)]),
                       err("#N/A"), "lỗi lan truyền")
        XCTAssertEqual(calc("SLOPE(A1:A5)", perfect), err("#VALUE!"), "thiếu đối số")
        XCTAssertEqual(calc("FORECAST.LINEAR(6,B1:B5)", perfect), err("#VALUE!"), "FORECAST thiếu đối số")
        XCTAssertEqual(calc("SLOPE(\"x\",3)", perfect), err("#VALUE!"), "đối số trực tiếp không ép được sang số")
    }
}
