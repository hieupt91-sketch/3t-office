import XCTest
@testable import OOXMLSpreadsheet
import OOXMLPackage
import OOXMLTestSupport

/// Phase 5 — chèn/xóa cột.
final class Phase5ColumnTests: XCTestCase {
    let rich = "xlsx/rich-excel.xlsx"

    func testInsertColumnAtAShiftsEverything() throws {
        let original = try Fixtures.data(rich)
        let url = try Fixtures.scratchDirectory("p5-cols").appendingPathComponent("cols.xlsx")
        do {
            let wb = try Workbook(data: original)
            try wb.worksheet(named: "Dữ liệu").insertColumns(at: "A")
            try wb.save(to: url)
        }
        let re = try Workbook(contentsOf: url)
        let ws = try re.worksheet(named: "Dữ liệu")
        XCTAssertEqual(try ws.value("A2"), .empty)
        XCTAssertEqual(try ws.value("C2"), .string("Giấy A4 Double A"))
        XCTAssertEqual(try ws.cell("F4")?.formula, "D4*E4")
        XCTAssertEqual(try re.worksheet(named: "Tổng hợp").cell("B2")?.formula, "SUM('Dữ liệu'!F2:F6)")
        XCTAssertEqual(try re.worksheet(named: "Tổng hợp").cell("B4")?.formula, "COUNTA(DuLieu)-COUNTIF('Dữ liệu'!C:C,\"Giấy*\")+LOG10(100)", "vùng cột B:B → C:C")
        XCTAssertEqual(re.definedNames.map(\.formula), ["'Dữ liệu'!$B$1:$F$8", "'Dữ liệu'!$B$1:$F$6", "'Tổng hợp'!$B$2"])
        XCTAssertEqual(ws.mergedCells.map(\.description), ["B8:D8"])
        XCTAssertEqual(ws.columnWidth(3), 24.81640625, "độ rộng cột đi theo cột")
        XCTAssertEqual(ws.columnWidth(6), 14.6328125)
        XCTAssertEqual(ws.hyperlinks.map(\.cell), ["B10", "C10"])
        let saved = try Data(contentsOf: url)
        XCTAssertTrue(try RoundTrip.partString(saved, "xl/tables/table1.xml").contains("ref=\"B1:F6\""))
        XCTAssertTrue(try RoundTrip.partString(saved, "xl/comments1.xml").contains("ref=\"D4\""))
        XCTAssertTrue(try RoundTrip.partString(saved, "xl/drawings/vmlDrawing1.vml").contains("<x:Column>3</x:Column>"))
        let d = try RoundTrip.partString(saved, "xl/drawings/drawing1.xml")
        XCTAssertTrue(d.contains("<xdr:col>7</xdr:col>") && d.contains("<xdr:col>9</xdr:col>"))
        let sheet = try RoundTrip.partString(saved, "xl/worksheets/sheet1.xml")
        for expect in ["<dimension ref=\"B1:F11\"/>", "sqref=\"F2:F6\"", "sqref=\"D2:D6\"", "<xm:sqref>D2:D6</xm:sqref>",
                       "<f t=\"array\" ref=\"D10:D11\">D2:D3*2</f>", "spans=\"2:6\""] {
            XCTAssertTrue(sheet.contains(expect), "thiếu \(expect)")
        }
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml", "xl/workbook.xml", "xl/tables/table1.xml",
                                              "xl/comments1.xml", "xl/drawings/vmlDrawing1.vml", "xl/drawings/drawing1.xml",
                                              "xl/calcChain.xml", "xl/_rels/workbook.xml.rels", "[Content_Types].xml"],
                             requireChanged: ["xl/worksheets/sheet1.xml", "xl/tables/table1.xml"], name: "p5-insert-col.xlsx")
        // Xóa lại cột A → mọi ô về như bản gốc.
        try ws.deleteColumns(at: "A")
        let back = try Workbook(data: try re.save())
        let orig = try Workbook(data: original)
        XCTAssertEqual(try back.worksheet(named: "Dữ liệu").cells.map { "\($0.reference)=\($0.value)" },
                       try orig.worksheet(named: "Dữ liệu").cells.map { "\($0.reference)=\($0.value)" })
    }

    func testColumnThroughTableIsRejectedWithoutSideEffects() throws {
        let original = try Fixtures.data(rich)
        let wb = try Workbook(data: original)
        let ws = try wb.worksheet(named: "Dữ liệu")
        XCTAssertThrowsError(try ws.insertColumns(at: "C"))
        XCTAssertThrowsError(try ws.deleteColumns(at: "B"))
        let saved = try wb.save()
        try RoundTrip.assertNoOpSaveIsLossless(original, saved: saved, name: "p5-col-rejected.xlsx")
        // Ngoài bảng thì được.
        try ws.insertColumns(at: "G", count: 2)
        try ws.deleteColumns(at: "G", count: 2)
    }

    func testDeleteColumnInvalidatesReferences() throws {
        let wb = try Workbook(data: try Fixtures.data("xlsx/prefixed-x.xlsx"))
        let ws = try wb.worksheet(at: 0)
        try ws.setFormula("B1*2", at: "D1")
        try ws.setFormula("SUM(A1:C1)", at: "E1")
        try ws.deleteColumns(at: "B")
        let re = try Workbook(data: try wb.save()).worksheet(at: 0)
        XCTAssertEqual(try re.cell("C1")?.formula, "#REF!*2")
        XCTAssertEqual(try re.cell("D1")?.formula, "SUM(A1:B1)")
        XCTAssertEqual(try re.value("A1"), .string("Tiền tố x"))
    }

    func testColumnRules() {
        XCTAssertEqual(FormulaRewriter.adjustColumns("A1+C1+$C$1+B:D", formulaSheet: "S", target: "S", at: 2, delta: 1), "A1+D1+$D$1+C:E")
        XCTAssertEqual(FormulaRewriter.adjustColumns("SUM(A1:E1)", formulaSheet: "S", target: "S", at: 2, delta: -2), "SUM(A1:C1)")
        XCTAssertEqual(FormulaRewriter.adjustColumns("SUM(2:3)", formulaSheet: "S", target: "S", at: 1, delta: 5), "SUM(2:3)")
    }

    func testRealWorkbooksInsertAndDeleteColumns() throws {
        for f in Fixtures.list("real", extensions: ["xlsx"]) {
            let original = try Fixtures.data(f)
            let wb = try Workbook(data: original)
            let ws = try wb.worksheet(at: 0)
            let before = ws.cells.map(\.value)
            let at = (ws.usedRange?.end.column ?? 1) + 1 // ngoài mọi bảng
            try ws.insertColumns(at: 1, count: 1)
            try ws.deleteColumns(at: 1, count: 1)
            try ws.insertColumns(at: at, count: 2)
            let re = try Workbook(data: try wb.save())
            XCTAssertEqual(try re.worksheet(at: 0).cells.map(\.value), before, f)
            let base = Set(PackageValidator.validate(original))
            XCTAssertEqual(PackageValidator.validate(try wb.save()).filter { !base.contains($0) }, [], f)
        }
    }
}
