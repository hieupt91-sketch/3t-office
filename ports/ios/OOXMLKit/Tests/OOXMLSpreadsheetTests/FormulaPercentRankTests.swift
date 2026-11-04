import XCTest
@testable import OOXMLSpreadsheet

/// M7 lát 10: PERCENTRANK, PERCENTRANK.INC, PERCENTRANK.EXC.
final class FormulaPercentRankTests: XCTestCase {
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

    /// Vùng A1:A5 = 1, 2, 3, 4, 5.
    var range: [String: CellValue] {
        ["A1": n(1), "A2": n(2), "A3": n(3), "A4": n(4), "A5": n(5)]
    }

    /// Vùng C1:C4 = 1, 2, 3, 4 (để kiểm tra cắt chữ số, không làm tròn).
    var range4: [String: CellValue] {
        ["C1": n(1), "C2": n(2), "C3": n(3), "C4": n(4)]
    }

    /// Vùng D1:D4 = 1, 2, 2, 3 (giá trị trùng).
    var dupRange: [String: CellValue] {
        ["D1": n(1), "D2": n(2), "D3": n(2), "D4": n(3)]
    }

    func testPercentRankInc() {
        XCTAssertEqual(num("PERCENTRANK(A1:A5,3)", range), 0.5, accuracy: 1e-9)
        XCTAssertEqual(num("PERCENTRANK.INC(A1:A5,1)", range), 0, accuracy: 1e-9, "giá trị nhỏ nhất")
        XCTAssertEqual(num("PERCENTRANK.INC(A1:A5,5)", range), 1, accuracy: 1e-9, "giá trị lớn nhất")
        XCTAssertEqual(num("PERCENTRANK.INC(A1:A5,2.5)", range), 0.375, accuracy: 1e-9, "nội suy giữa 2 và 3")
        XCTAssertEqual(num("PERCENTRANK.INC(A1:A5,2,1)", range), 0.2, accuracy: 1e-9, "0.25 cắt về 1 chữ số = 0.2")
        XCTAssertEqual(num("PERCENTRANK.INC(A1:A5,2.5,2)", range), 0.37, accuracy: 1e-9, "0.375 cắt về 2 chữ số = 0.37")
        XCTAssertEqual(num("PERCENTRANK(C1:C4,3)", range4), 0.666, accuracy: 1e-9, "2/3 cắt về 3 chữ số = 0.666, không làm tròn lên 0.667")
    }

    func testPercentRankExc() {
        XCTAssertEqual(num("PERCENTRANK.EXC(A1:A5,3)", range), 0.5, accuracy: 1e-9)
        XCTAssertEqual(num("PERCENTRANK.EXC(A1:A5,1)", range), 0.166, accuracy: 1e-9, "1/6 cắt về 3 chữ số = 0.166")
        XCTAssertEqual(num("PERCENTRANK.EXC(A1:A5,5)", range), 0.833, accuracy: 1e-9, "5/6 cắt về 3 chữ số = 0.833")
        XCTAssertEqual(num("PERCENTRANK.EXC(A1:A5,2.5)", range), 0.416, accuracy: 1e-9, "nội suy loại trừ")
        XCTAssertEqual(num("PERCENTRANK.EXC(A1:A5,1,1)", range), 0.1, accuracy: 1e-9, "1/6 cắt về 1 chữ số = 0.1")
    }

    func testPercentRankDuplicates() {
        XCTAssertEqual(num("PERCENTRANK(D1:D4,2)", dupRange), 0.333, accuracy: 1e-9, "giá trị trùng lấy hạng lần đầu: 1/3")
        XCTAssertEqual(num("PERCENTRANK.EXC(D1:D4,2)", dupRange), 0.4, accuracy: 1e-9, "loại trừ: (1+1)/5")
    }

    func testPercentRankErrors() {
        XCTAssertEqual(calc("PERCENTRANK(A1:A5,0)", range), err("#N/A"), "x nhỏ hơn min")
        XCTAssertEqual(calc("PERCENTRANK(A1:A5,6)", range), err("#N/A"), "x lớn hơn max")
        XCTAssertEqual(calc("PERCENTRANK.EXC(A1:A5,0)", range), err("#N/A"), "x ngoài dãy (EXC)")
        XCTAssertEqual(calc("PERCENTRANK.EXC(A1:A5,6)", range), err("#N/A"), "x ngoài dãy (EXC)")
        XCTAssertEqual(calc("PERCENTRANK(B1:B3,2)", range), err("#N/A"), "dãy rỗng")
        XCTAssertEqual(calc("PERCENTRANK(A1:A5,3,0)", range), err("#NUM!"), "significance < 1")
        XCTAssertEqual(calc("PERCENTRANK(A1:A5,3,-2)", range), err("#NUM!"), "significance âm")
        XCTAssertEqual(calc("PERCENTRANK(A1:A5,\"x\")", range), err("#VALUE!"), "x không ép được sang số")
        XCTAssertEqual(calc("PERCENTRANK(C1:C2,2)", ["C1": err("#N/A"), "C2": n(5)]), err("#N/A"), "lỗi lan truyền")
        XCTAssertEqual(calc("PERCENTRANK(A1:A5)", range), err("#VALUE!"), "thiếu đối số")
    }
}
