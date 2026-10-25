import XCTest
import OOXMLTestSupport
@testable import OOXMLSpreadsheet

final class FormulaRecalcTests: XCTestCase {
    func testTopologicalOrderAndChain() {
        let e = FormulaEngine()
        e.addSheet("S")
        e.setFormula("=B1*2", sheet: "S", at: "C1")   // phụ thuộc B1
        e.setFormula("A1+1", sheet: "S", at: "B1")    // phụ thuộc A1
        e.setValue(.number(5), sheet: "S", at: "A1")
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "S", at: "B1"), .number(6))
        XCTAssertEqual(e.value(sheet: "S", at: "C1"), .number(12))
        XCTAssertEqual(e.evaluationOrder.map(\.ref.a1), ["B1", "C1"])
        XCTAssertTrue(e.circularCells.isEmpty)
    }

    func testRecalcAfterEdit() {
        let e = FormulaEngine()
        e.addSheet("S")
        e.setValue(.number(1), sheet: "S", at: "A1")
        e.setValue(.number(2), sheet: "S", at: "A2")
        e.setFormula("SUM(A1:A2)", sheet: "S", at: "A3")
        e.setFormula("A3*10", sheet: "S", at: "A4")
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "S", at: "A4"), .number(30))
        e.setValue(.number(10), sheet: "S", at: "A1")
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "S", at: "A4"), .number(120))
        e.clear(sheet: "S", at: "A2")
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "S", at: "A3"), .number(10))
        e.clear(sheet: "S", at: "A4")
        XCTAssertEqual(e.value(sheet: "S", at: "A4"), .empty)
    }

    func testRangeDependencyOnFormulaCells() {
        let e = FormulaEngine()
        e.addSheet("S")
        e.setValue(.number(1), sheet: "S", at: "A1")
        e.setFormula("A1+1", sheet: "S", at: "A2")
        e.setFormula("A2+1", sheet: "S", at: "A3")
        e.setFormula("SUM(A1:A3)", sheet: "S", at: "B1")   // đặt trước nhưng phải tính sau A2, A3
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "S", at: "B1"), .number(6))
        XCTAssertEqual(e.evaluationOrder.last?.ref.a1, "B1")
    }

    func testCrossSheet() {
        let e = FormulaEngine()
        e.addSheet("Tổng hợp"); e.addSheet("Dữ liệu")
        e.setFormula("SUM('Dữ liệu'!A1:A2)*2", sheet: "Tổng hợp", at: "A1")
        e.setFormula("'Dữ liệu'!A1+1", sheet: "Dữ liệu", at: "A2")
        e.setValue(.number(4), sheet: "Dữ liệu", at: "A1")
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "Dữ liệu", at: "A2"), .number(5))
        XCTAssertEqual(e.value(sheet: "tổng hợp", at: "A1"), .number(18), "tên sheet không phân biệt hoa thường")
        XCTAssertEqual(e.sheets, ["Tổng hợp", "Dữ liệu"])
    }

    func testSelfReferenceIsCircular() {
        let e = FormulaEngine()
        e.addSheet("S")
        e.setFormula("A1+1", sheet: "S", at: "A1")
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "S", at: "A1"), .error("#REF!"))
        XCTAssertEqual(e.circularCells.map(\.ref.a1), ["A1"])
    }

    func testCycleAndDownstream() {
        let e = FormulaEngine()
        e.addSheet("S"); e.addSheet("T")
        e.setFormula("B1+1", sheet: "S", at: "A1")
        e.setFormula("C1+1", sheet: "S", at: "B1")
        e.setFormula("T!A1", sheet: "S", at: "C1")          // vòng xuyên sheet: S!A1→S!B1→S!C1→T!A1→S!A1
        e.setFormula("S!A1+1", sheet: "T", at: "A1")
        e.setFormula("A1*2", sheet: "S", at: "D1")          // chỉ phụ thuộc vòng, không thuộc vòng
        e.setFormula("1+1", sheet: "S", at: "E1")           // độc lập
        e.recalculate()
        for a in ["A1", "B1", "C1", "D1"] { XCTAssertEqual(e.value(sheet: "S", at: a), .error("#REF!"), a) }
        XCTAssertEqual(e.value(sheet: "T", at: "A1"), .error("#REF!"))
        XCTAssertEqual(e.value(sheet: "S", at: "E1"), .number(2))
        XCTAssertEqual(Set(e.circularCells.map(\.description)), ["S!A1", "S!B1", "S!C1", "T!A1"])
    }

    func testBreakingCycleRecovers() {
        let e = FormulaEngine()
        e.addSheet("S")
        e.setFormula("B1", sheet: "S", at: "A1")
        e.setFormula("A1", sheet: "S", at: "B1")
        e.recalculate()
        XCTAssertEqual(e.circularCells.count, 2)
        e.setValue(.number(3), sheet: "S", at: "B1")
        e.recalculate()
        XCTAssertTrue(e.circularCells.isEmpty)
        XCTAssertEqual(e.value(sheet: "S", at: "A1"), .number(3))
    }

    func testErrorPropagationAcrossChain() {
        let e = FormulaEngine()
        e.addSheet("S")
        e.setFormula("1/0", sheet: "S", at: "A1")
        e.setFormula("A1+1", sheet: "S", at: "A2")
        e.setFormula("SUM(A1:A2)", sheet: "S", at: "A3")
        e.setFormula("IF(A3>0,1,2)", sheet: "S", at: "A4")
        e.setFormula("Khong!A1", sheet: "S", at: "A5")
        e.setFormula("1 +", sheet: "S", at: "A6")
        e.recalculate()
        for a in ["A1", "A2", "A3", "A4"] { XCTAssertEqual(e.value(sheet: "S", at: a), .error("#DIV/0!"), a) }
        XCTAssertEqual(e.value(sheet: "S", at: "A5"), .error("#REF!"))
        XCTAssertEqual(e.value(sheet: "S", at: "A6"), .error("#NAME?"))
    }

    func testInvalidAddressesAndSheets() {
        let e = FormulaEngine()
        e.addSheet("S"); e.addSheet("s") // trùng tên (không phân biệt hoa thường) bị bỏ qua
        XCTAssertEqual(e.sheets, ["S"])
        e.setValue(.number(1), sheet: "Nope", at: "A1")
        e.setValue(.number(1), sheet: "S", at: "!!")
        e.setFormula("1", sheet: "Nope", at: "A1")
        e.clear(sheet: "Nope", at: "A1")
        e.clear(sheet: "S", at: "??")
        XCTAssertEqual(e.value(sheet: "Nope", at: "A1"), .error("#REF!"))
        XCTAssertEqual(e.value(sheet: "S", at: "!!"), .error("#REF!"))
        XCTAssertEqual(e.value(sheet: "S", at: "A1"), .empty)
    }

    func testInitWithSheetsLiteral() {
        let e = FormulaEngine(sheets: [("S", ["A1": FormulaCellInput(value: .number(2)),
                                              "A2": FormulaCellInput(formula: "A1*A1")])])
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "S", at: "A2"), .number(4))
    }

    func testLoadFromWorkbook() throws {
        let wb = try Workbook(data: Fixtures.data("xlsx/rich-excel.xlsx"))
        let name = try XCTUnwrap(wb.sheetNames.first)
        let ws = try wb.worksheet(named: name)
        try ws.setValue(7, at: "AA1")
        try ws.setValue(8, at: "AA2")
        try ws.setFormula("SUM(AA1:AA2)*2", at: "AA3")
        let e = try FormulaEngine(workbook: wb)
        e.recalculate()
        XCTAssertEqual(e.value(sheet: name, at: "AA3"), .number(30))
        // Mọi công thức trong tệp mẫu đều phải tính được mà không lỗi cú pháp (#NAME? do tên/hàm chưa hỗ trợ được tách riêng).
        XCTAssertTrue(e.circularCells.isEmpty)
    }
}
