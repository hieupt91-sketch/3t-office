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

    // MARK: M7 lát 17 — tên hằng/công thức (đích là biểu thức, không phải vùng/ô).

    private func exprCell(_ sheet: String, _ a1: String) -> FormulaExpr {
        .cell(sheet: sheet, ref: CellReference(a1)!)
    }

    func testConstantNumberName() {
        let e = engine()
        e.defineNameExpression("TyLe", expr: .number(0.1))
        XCTAssertEqual(calc(e, "=TyLe*1000"), .number(100))
        XCTAssertEqual(calc(e, "=SUM(TyLe,5)"), .number(5.1))
    }

    func testConstantStringName() {
        let e = engine()
        e.defineNameExpression("TenHang", expr: .string("Giấy A4"))
        XCTAssertEqual(calc(e, "=TenHang&\"!\""), .string("Giấy A4!"))
    }

    func testConstantBoolName() {
        let e = engine()
        e.defineNameExpression("Co", expr: .bool(true))
        XCTAssertEqual(calc(e, "=IF(Co,1,0)"), .number(1))
    }

    func testExpressionNameWithCells() {
        let e = engine()
        e.defineNameExpression("Tong2", expr: .binary("+", exprCell("Data", "A1"), exprCell("Data", "A2")))
        XCTAssertEqual(calc(e, "=Tong2*2"), .number(6), "Tong2 = 1+2, nhân 2 = 6")
        XCTAssertEqual(calc(e, "=SUM(Tong2)"), .number(3))
    }

    func testExpressionNameRecalcOrder() {
        let e = engine()
        e.setFormula("=2*3", sheet: "Data", at: "A1")
        e.defineNameExpression("Tong2", expr: .binary("+", exprCell("Data", "A1"), exprCell("Data", "A2")))
        XCTAssertEqual(calc(e, "=Tong2"), .number(8), "Tong2 = 6+2")
        let order = e.evaluationOrder
        let a1 = order.firstIndex(of: CellAddress(sheet: "Data", ref: CellReference("A1")))!
        let z99 = order.firstIndex(of: CellAddress(sheet: "TongHop", ref: CellReference("Z99")))!
        XCTAssertLessThan(a1, z99, "ô nguồn trong biểu thức tên phải tính trước ô dùng tên")
    }

    func testExpressionNameChain() {
        let e = engine()
        e.defineNameExpression("Goc", expr: .number(10))
        e.defineNameExpression("Gap", expr: .binary("*", .name("Goc"), .number(2)))
        XCTAssertEqual(calc(e, "=Gap"), .number(20))
    }

    func testExpressionNameCycleIsRefError() {
        let e = engine()
        e.defineNameExpression("A", expr: .name("B"))
        e.defineNameExpression("B", expr: .name("A"))
        XCTAssertEqual(calc(e, "=A"), .error("#REF!"), "vòng tên A→B→A phải dừng, không đệ quy vô hạn")
        let e2 = engine()
        e2.defineNameExpression("Tu", expr: .binary("+", .name("Tu"), .number(1)))
        XCTAssertEqual(calc(e2, "=Tu"), .error("#REF!"), "tên tự tham chiếu chính nó → #REF!")
    }

    func testExpressionNameLocalShadowsGlobal() {
        let e = engine()
        e.defineNameExpression("Gap", expr: .number(100))
        e.defineNameExpression("Gap", localSheet: "TongHop", expr: exprCell("TongHop", "C1"))
        XCTAssertEqual(calc(e, "=Gap"), .number(5), "tên cục bộ thắng tên workbook trên cùng sheet")
        XCTAssertEqual(calc(e, "=Gap", sheet: "Data", at: "Z98"), .number(100), "sheet khác vẫn thấy tên workbook")
    }

    func testRedefineRangeOverwritesExpressionAndBack() {
        let e = engine()
        e.defineNameExpression("Tong", expr: .number(10))
        XCTAssertEqual(calc(e, "=Tong"), .number(10))
        e.defineName("Tong", sheet: "Data", range: range("A1", "A3"))
        XCTAssertEqual(calc(e, "=SUM(Tong)"), .number(6), "đăng ký lại dạng vùng ghi đè dạng hằng")
        e.defineNameExpression("Tong", expr: .number(10))
        XCTAssertEqual(calc(e, "=Tong"), .number(10), "đăng ký lại dạng hằng ghi đè dạng vùng")
    }

    func testLetVariableBeatsExpressionName() {
        let e = engine()
        e.defineNameExpression("X", expr: .number(100))
        XCTAssertEqual(calc(e, "=LET(X, 5, X+1)"), .number(6), "biến LET cục bộ thắng tên hằng cùng tên")
    }

    func testBridgeLoadsExpressionNames() throws {
        // Đọc qua bản base64 (.xlsx.b64): kênh đẩy snapshot qua GitHub API chỉ nhận
        // tệp UTF-8; bản .xlsx nhị phân đi kèm để mở bằng Excel thật (cùng bytes).
        let b64Data = try Fixtures.data("xlsx/named-expr.xlsx.b64")
        let b64 = try XCTUnwrap(String(data: b64Data, encoding: .utf8))
        let xlsx = try XCTUnwrap(Data(base64Encoded: b64, options: .ignoreUnknownCharacters))
        let wb = try Workbook(data: xlsx)
        let ws = try wb.worksheet(named: "TongHop")
        try ws.setFormula("=TyLe", at: "Z2")
        try ws.setFormula("=TyLe*1000", at: "Z3")
        try ws.setFormula("=TenHang", at: "Z4")
        try ws.setFormula("=Tong2", at: "Z5")
        try ws.setFormula("=Gap", at: "Z6")
        try ws.setFormula("=CucBo", at: "Z7")
        let e = try FormulaEngine(workbook: wb)
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "TongHop", at: "Z1"), .number(60), "công thức sẵn trong fixture dùng tên Tong2: (10+20)*2")
        XCTAssertEqual(e.value(sheet: "TongHop", at: "Z2"), .number(0.1), "TyLe = 0.1 (hằng số)")
        XCTAssertEqual(e.value(sheet: "TongHop", at: "Z3"), .number(100))
        XCTAssertEqual(e.value(sheet: "TongHop", at: "Z4"), .string("Giấy A4"), "TenHang = \"Giấy A4\" (hằng chuỗi)")
        XCTAssertEqual(e.value(sheet: "TongHop", at: "Z5"), .number(30), "Tong2 = 10+20")
        XCTAssertEqual(e.value(sheet: "TongHop", at: "Z6"), .number(60), "Gap = Tong2*2 (tên dùng tên khác)")
        XCTAssertEqual(e.value(sheet: "TongHop", at: "Z7"), .number(15), "CucBo cục bộ TongHop = 5*3")
        // Tên cục bộ không thấy được từ sheet khác.
        let wsData = try wb.worksheet(named: "Data")
        try wsData.setFormula("=CucBo", at: "Z8")
        let e2 = try FormulaEngine(workbook: wb)
        e2.recalculate()
        XCTAssertEqual(e2.value(sheet: "Data", at: "Z8"), .error("#NAME?"))
    }
}
