import XCTest
@testable import OOXMLSpreadsheet

/// M7 lát 14: RANK.EQ (bí danh RANK), RANK.AVG, PROB, STANDARDIZE.
final class FormulaRankAvgProbTests: XCTestCase {
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

    /// A1:A5 = 7, 3, 7, 1, 3: giảm dần 7,7 chiếm vị trí 1,2; 3,3 chiếm 3,4; 1 chiếm 5.
    var tied: [String: CellValue] {
        ["A1": n(7), "A2": n(3), "A3": n(7), "A4": n(1), "A5": n(3)]
    }

    /// B = 1..4, C = 0.1, 0.2, 0.3, 0.4 (tổng 1).
    var dist: [String: CellValue] {
        ["B1": n(1), "B2": n(2), "B3": n(3), "B4": n(4),
         "C1": n(0.1), "C2": n(0.2), "C3": n(0.3), "C4": n(0.4)]
    }

    /// D = 0.5, 0.25, 0.25, 0.25 (tổng 1.25, sai).
    var badSum: [String: CellValue] {
        ["B1": n(1), "B2": n(2), "B3": n(3), "B4": n(4),
         "D1": n(0.5), "D2": n(0.25), "D3": n(0.25), "D4": n(0.25)]
    }

    func testRankAvgDescending() {
        XCTAssertEqual(num("RANK.AVG(7,A1:A5)", tied), 1.5, accuracy: 1e-9, "(1+2)/2")
        XCTAssertEqual(num("RANK.AVG(3,A1:A5)", tied), 3.5, accuracy: 1e-9, "(3+4)/2")
        XCTAssertEqual(num("RANK.AVG(1,A1:A5)", tied), 5, accuracy: 1e-9, "không bằng ai")
    }

    func testRankAvgAscending() {
        XCTAssertEqual(num("RANK.AVG(1,A1:A5,1)", tied), 1, accuracy: 1e-9)
        XCTAssertEqual(num("RANK.AVG(3,A1:A5,1)", tied), 2.5, accuracy: 1e-9, "(2+3)/2")
        XCTAssertEqual(num("RANK.AVG(7,A1:A5,1)", tied), 4.5, accuracy: 1e-9, "(4+5)/2")
    }

    func testRankEqMatchesRank() {
        XCTAssertEqual(num("RANK.EQ(7,A1:A5)", tied), 1, accuracy: 1e-9, "hạng cao nhất nhóm")
        XCTAssertEqual(num("RANK.EQ(3,A1:A5)", tied), 3, accuracy: 1e-9)
        XCTAssertEqual(num("RANK(3,A1:A5)", tied), 3, accuracy: 1e-9, "đối chiếu RANK cũ")
    }

    func testRankAvgErrors() {
        XCTAssertEqual(calc("RANK.AVG(9,A1:A5)", tied), err("#N/A"), "không có giá trị")
        XCTAssertEqual(calc("RANK.AVG(1,G1:G3)", tied), err("#N/A"), "vùng rỗng")
    }

    func testProbRange() {
        XCTAssertEqual(num("PROB(B1:B4,C1:C4,2,3)", dist), 0.5, accuracy: 1e-9, "0.2+0.3")
        XCTAssertEqual(num("PROB(B1:B4,C1:C4,1,4)", dist), 1, accuracy: 1e-9, "toàn miền")
        XCTAssertEqual(num("PROB(B1:B4,C1:C4,2)", dist), 0.2, accuracy: 1e-9, "đúng bằng lower")
        XCTAssertEqual(num("PROB(B1:B4,C1:C4,5)", dist), 0, accuracy: 1e-9, "giá trị vắng mặt")
    }

    func testProbErrors() {
        XCTAssertEqual(calc("PROB(B1:B4,D1:D4,1,4)", badSum), err("#NUM!"), "tổng khác 1")
        XCTAssertEqual(calc("PROB(B1:B4,C1:C4,3,2)", dist), err("#NUM!"), "lower > upper")
        XCTAssertEqual(calc("PROB(B1:B4,C1:C3,1,4)", dist), err("#N/A"), "khác cỡ vùng")
        XCTAssertEqual(calc("PROB(B1:B4,C1:C4,2,3)", ["B1": n(1), "B2": n(2), "B3": n(3), "B4": n(4),
                                                      "C1": n(1.2), "C2": n(0.2), "C3": n(0.3), "C4": n(0.4)]),
                         err("#NUM!"), "xác suất > 1")
    }

    func testStandardize() {
        XCTAssertEqual(num("STANDARDIZE(10,6,2)"), 2, accuracy: 1e-12)
        XCTAssertEqual(num("STANDARDIZE(6,6,2)"), 0, accuracy: 1e-12)
        XCTAssertEqual(num("STANDARDIZE(4,6,2)"), -1, accuracy: 1e-12)
        XCTAssertEqual(calc("STANDARDIZE(10,6,0)"), err("#DIV/0!"), "độ lệch 0")
        XCTAssertEqual(calc("STANDARDIZE(\"t\",6,2)"), err("#VALUE!"), "không phải số")
    }
}
