import XCTest
import OOXMLTestSupport
@testable import OOXMLSpreadsheet

/// M7 lát 1: tên vùng (named range) trong tính công thức — phạm vi workbook + cục bộ sheet.
final class FormulaNamedRangeTests: XCTestCase {
    private func engine() -> FormulaEngine {
        let e = FormulaEngine()
        e.addSheet("Data")
        e.addSheet("TongHop")
        for (k, v) in ["A1": 1.0, "A2": 2.0, "A3": 3.0] { e.setValue(.number(v), sheet: "Data", at: k) }
        e.setValue(.number(10), sheet: "Data", at: "B1")
        e.setValue(.number(5), sheet: "TongHop", at: "C1")
        e.setValue(.number(5), sheet: "TongHop", at: "C2")
        return e
    }

    private func calc(_ e: FormulaEngine, _ formula: String, sheet: String = "TongHop", at: String = "Z99") -> CellValue {
        e.setFormula(formula, sheet: sheet, at: at)
        e.recalculate()
        return e.value(sheet: sheet, at: at)
    }

    private func range(_ a: String, _ b: String) -> CellRange {
        CellRange(CellReference(a)!, CellReference(b)!)
    }

    func testWorkbookScopeNameInSum() {
        let e = engine()
        e.defineName("Tong", sheet: "Data", range: range("A1", "A3"))
        XCTAssertEqual(calc(e, "=SUM(Tong)"), .number(6))
    }

    func testSingleCellNameAsScalar() {
        let e = engine()
        e.defineName("Gia", sheet: "Data", range: range("B1", "B1"))
        XCTAssertEqual(calc(e, "=Gia*2"), .number(20))
    }

    func testNameLookupCaseInsensitive() {
        let e = engine()
        e.defineName("Tong", sheet: "Data", range: range("A1", "A3"))
        XCTAssertEqual(calc(e, "=sum(tong)"), .number(6))
    }

    func testLocalNameShadowsGlobal() {
        let e = engine()
        e.defineName("Tong", sheet: "Data", range: range("A1", "A3"))
        e.defineName("Tong", localSheet: "TongHop", sheet: "TongHop", range: range("C1", "C2"))
        XCTAssertEqual(calc(e, "=SUM(Tong)"), .number(10), "tên cục bộ thắng tên workbook trên cùng sheet")
        XCTAssertEqual(calc(e, "=SUM(Tong)", sheet: "Data", at: "Z98"), .number(6), "sheet khác vẫn thấy tên workbook")
    }

    func testUnknownNameIsNameError() {
        let e = engine()
        XCTAssertEqual(calc(e, "=KhongCo+1"), .error("#NAME?"))
    }

    func testDanglingTargetSheetIsRefError() {
        let e = engine()
        e.defineName("Lac", sheet: "KhongCo", range: range("A1", "A1"))
        XCTAssertEqual(calc(e, "=Lac"), .error("#REF!"))
    }

    func testRecalcOrderThroughName() {
        let e = engine()
        e.setFormula("=2*3", sheet: "Data", at: "A1")
        e.defineName("Tong", sheet: "Data", range: range("A1", "A1"))
        XCTAssertEqual(calc(e, "=SUM(Tong)"), .number(6))
        let order = e.evaluationOrder
        let a1 = order.firstIndex(of: CellAddress(sheet: "Data", ref: CellReference("A1")))!
        let z99 = order.firstIndex(of: CellAddress(sheet: "TongHop", ref: CellReference("Z99")))! 
        XCTAssertLessThan(a1, z99, "ô nguồn phải tính trước ô dùng tên vùng")
    }

    func testCycleThroughNameIsCircular() {
        let e = engine()
        e.defineName("Vong", sheet: "TongHop", range: range("B1", "B1"))
        e.setFormula("=Vong", sheet: "TongHop", at: "A1")
        e.setFormula("=A1", sheet: "TongHop", at: "B1")
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "TongHop", at: "A1"), .error("#REF!"))
        XCTAssertEqual(e.value(sheet: "TongHop", at: "B1"), .error("#REF!"))
        XCTAssertTrue(e.circularCells.contains(CellAddress(sheet: "TongHop", ref: CellReference("A1"))))
        XCTAssertTrue(e.circularCells.contains(CellAddress(sheet: "TongHop", ref: CellReference("B1"))))
    }

    func testLetVariableBeatsDefinedName() {
        let e = engine()
        e.defineName("X", sheet: "Data", range: range("A1", "A1"))
        XCTAssertEqual(calc(e, "=LET(X, 5, X+1)"), .number(6), "biến LET cục bộ thắng tên vùng cùng tên")
    }

    func testRedefineOverwrites() {
        let e = engine()
        e.defineName("Tong", sheet: "Data", range: range("A1", "A3"))
        e.defineName("Tong", sheet: "Data", range: range("B1", "B1"))
        XCTAssertEqual(calc(e, "=SUM(Tong)"), .number(10))
    }

    func testBridgeLoadsWorkbookDefinedNames() throws {
        let wb = try Workbook(data: Fixtures.data("xlsx/rich-excel.xlsx"))
        let ws = try wb.worksheet(named: "Tổng hợp")
        try ws.setFormula("=TongDoanhThu", at: "Z1")
        let e = try FormulaEngine(workbook: wb)
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "Tổng hợp", at: "Z1"), .number(59840000),
                       "TongDoanhThu = 'Tổng hợp'!$B$2 = SUM('Dữ liệu'!E2:E6) = 42500000+540000+13200000+600000+3000000")
        XCTAssertEqual(e.value(sheet: "Tổng hợp", at: "B3"), .number(119680000),
                       "công thức sẵn có trong fixture dùng tên vùng phải tính đúng (= TongDoanhThu*2)")
        // Tách riêng các thành phần của B4: tên vùng đã phân giải đúng.
        // M7 lát 2 đã cài LOG10 nên B4 tính đúng: COUNTA(DuLieu)=30 −
        // COUNTIF('Dữ liệu'!B:B,"Giấy*")=1 + LOG10(100)=2 → 31.
        try ws.setFormula("=COUNTA(DuLieu)", at: "Z2")
        try ws.setFormula("=COUNTIF('Dữ liệu'!B:B,\"Giấy*\")", at: "Z3")
        let e2 = try FormulaEngine(workbook: wb)
        e2.recalculate()
        XCTAssertEqual(e2.value(sheet: "Tổng hợp", at: "Z2"), .number(30))
        XCTAssertEqual(e2.value(sheet: "Tổng hợp", at: "Z3"), .number(1))
        XCTAssertEqual(e.value(sheet: "Tổng hợp", at: "B4"), .number(31), "B4 = 30 − 1 + LOG10(100) = 31")
    }
}
