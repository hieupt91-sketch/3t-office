import XCTest
@testable import OOXMLSpreadsheet
import OOXMLPackage
import OOXMLTestSupport

/// Phase 5 — xóa sheet, chèn/xóa hàng: mọi nơi Excel lưu vị trí hàng phải được cập nhật đồng bộ.
final class Phase5SheetOperationTests: XCTestCase {
    let rich = "xlsx/rich-excel.xlsx"

    func testDeleteSummarySheet() throws {
        let original = try Fixtures.data(rich)
        let wb = try Workbook(data: original)
        try wb.deleteSheet(named: "Tổng hợp")
        let saved = try wb.save()
        let re = try Workbook(data: saved)
        XCTAssertEqual(re.sheetNames, ["Dữ liệu", "Ẩn"])
        XCTAssertEqual(re.definedNames.first { $0.name == "TongDoanhThu" }?.formula, "#REF!$B$2")
        XCTAssertFalse(re.package.hasPart("/xl/worksheets/sheet2.xml"))
        let app = try RoundTrip.partString(saved, "docProps/app.xml")
        XCTAssertTrue(app.contains("<vt:lpstr>Dữ liệu</vt:lpstr><vt:lpstr>Ẩn</vt:lpstr>"))
        XCTAssertTrue(app.contains("<vt:i4>2</vt:i4>"))
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["xl/workbook.xml", "xl/_rels/workbook.xml.rels", "[Content_Types].xml",
                                              "xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml", "xl/calcChain.xml", "docProps/app.xml"],
                             name: "p5-delete-summary.xlsx")
        XCTAssertEqual(try re.worksheet(named: "Dữ liệu").hyperlinks.last?.target, "#REF!A1", "liên kết tới sheet bị xóa thành #REF! như Excel")
    }

    func testDeleteDataSheetRemovesOwnedPartsAndInvalidatesReferences() throws {
        let original = try Fixtures.data(rich)
        let wb = try Workbook(data: original)
        try wb.deleteSheet(named: "Dữ liệu")
        let saved = try wb.save()
        let re = try Workbook(data: saved)
        XCTAssertEqual(re.sheetNames, ["Tổng hợp", "Ẩn"])
        XCTAssertEqual(try re.worksheet(named: "Tổng hợp").cell("B2")?.formula, "SUM(#REF!E2:E6)")
        XCTAssertNil(re.definedNames.first { $0.name == "_xlnm.Print_Area" }, "tên cục bộ của sheet bị xóa bị bỏ")
        XCTAssertEqual(re.definedNames.first { $0.name == "DuLieu" }?.formula, "#REF!$A$1:$E$6")
        for gone in ["/xl/drawings/drawing1.xml", "/xl/media/image1.png", "/xl/comments1.xml", "/xl/drawings/vmlDrawing1.vml",
                     "/xl/tables/table1.xml", "/xl/printerSettings/printerSettings1.bin"] {
            XCTAssertFalse(re.package.hasPart(PartName(gone)), gone)
        }
        XCTAssertTrue(re.package.hasPart("/xl/styles.xml"))
        XCTAssertTrue(re.package.hasPart("/customXml/item1.xml"))
        XCTAssertEqual(PackageValidator.validate(saved), [])
        Fixtures.publishArtifact(saved, name: "p5-delete-data.xlsx")
    }

    func testCannotDeleteLastVisibleSheet() throws {
        let wb = try Workbook(data: try Fixtures.data(rich))
        try wb.deleteSheet(named: "Tổng hợp")
        XCTAssertThrowsError(try wb.deleteSheet(named: "Dữ liệu")) {
            XCTAssertEqual($0 as? SpreadsheetError, .cannotDeleteLastVisibleSheet)
        }
        XCTAssertThrowsError(try wb.deleteSheet(named: "Không có")) { XCTAssertEqual($0 as? SpreadsheetError, .sheetNotFound("Không có")) }
    }

    func testInsertRowsUpdatesEverything() throws {
        let original = try Fixtures.data(rich)
        let url = try Fixtures.scratchDirectory("p5-insert").appendingPathComponent("insert.xlsx")
        do {
            let wb = try Workbook(data: original)
            let ws = try wb.worksheet(named: "Dữ liệu")
            try ws.insertRows(at: 3, count: 2)
            try ws.setValue("Hàng mới chèn", at: "B3")
            try wb.save(to: url)
        }
        let re = try Workbook(contentsOf: url)
        let ws = try re.worksheet(named: "Dữ liệu")
        XCTAssertEqual(try ws.value("B2"), .string("Giấy A4 Double A"), "hàng trên điểm chèn giữ nguyên")
        XCTAssertEqual(try ws.value("B3"), .string("Hàng mới chèn"))
        XCTAssertEqual(try ws.value("B4"), .empty)
        XCTAssertEqual(try ws.value("B5"), .string("Bút bi Thiên Long"), "hàng 3 cũ xuống 5")
        XCTAssertEqual(try ws.cell("E2")?.formula, "C2*D2")
        XCTAssertEqual(try ws.cell("E5")?.formula, "C5*D5", "công thức chia sẻ đã mở rộng và dịch đúng")
        XCTAssertEqual(try ws.cell("E8")?.formula, "C8*D8")
        XCTAssertEqual(try ws.cell("E9")?.formula, "\"Tổng: \"&TEXT(SUM(E2:E8),\"#,##0\")", "vùng chứa điểm chèn được nới rộng")
        XCTAssertEqual(try ws.cell("C12")?.formula, "C2:C5*2")
        XCTAssertEqual(ws.mergedCells.map(\.description), ["A10:C10"])
        XCTAssertEqual(try re.worksheet(named: "Tổng hợp").cell("B2")?.formula, "SUM('Dữ liệu'!E2:E8)", "công thức sheet khác cập nhật")
        XCTAssertEqual(re.definedNames.map(\.formula), ["'Dữ liệu'!$A$1:$E$10", "'Dữ liệu'!$A$1:$E$8", "'Tổng hợp'!$B$2"])
        XCTAssertEqual(ws.hyperlinks.map(\.cell), ["A12", "B12"])
        let saved = try Data(contentsOf: url)
        let sheet = try RoundTrip.partString(saved, "xl/worksheets/sheet1.xml")
        for expect in ["<dimension ref=\"A1:E13\"/>", "sqref=\"E2:E8\"", "sqref=\"C2:C8\"", "<xm:sqref>C2:C8</xm:sqref>",
                       "<f t=\"array\" ref=\"C12:C13\">C2:C5*2</f>", "<pane ySplit=\"1\" topLeftCell=\"A2\"", "activeCell=\"B5\" sqref=\"B5\""] {
            XCTAssertTrue(sheet.contains(expect), "thiếu \(expect)")
        }
        XCTAssertTrue(try RoundTrip.partString(saved, "xl/tables/table1.xml").contains("ref=\"A1:E8\""))
        XCTAssertTrue(try RoundTrip.partString(saved, "xl/comments1.xml").contains("ref=\"C6\""))
        XCTAssertTrue(try RoundTrip.partString(saved, "xl/drawings/vmlDrawing1.vml").contains("<x:Row>5</x:Row>"))
        let drawing = try RoundTrip.partString(saved, "xl/drawings/drawing1.xml")
        XCTAssertTrue(drawing.contains("<xdr:row>1</xdr:row>") && drawing.contains("<xdr:row>7</xdr:row>"), "ảnh neo theo ô giãn theo hàng chèn")
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml", "xl/workbook.xml", "xl/sharedStrings.xml",
                                              "xl/tables/table1.xml", "xl/comments1.xml", "xl/drawings/vmlDrawing1.vml", "xl/drawings/drawing1.xml",
                                              "xl/calcChain.xml", "xl/_rels/workbook.xml.rels", "[Content_Types].xml"],
                             requireChanged: ["xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml", "xl/tables/table1.xml"],
                             name: "p5-insert-rows.xlsx")
    }

    func testDeleteRowsShrinksRangesAndInvalidatesDeletedCells() throws {
        let original = try Fixtures.data(rich)
        let wb = try Workbook(data: original)
        let ws = try wb.worksheet(named: "Dữ liệu")
        try ws.setFormula("B3&\"!\"", at: "F2")
        try ws.deleteRows(at: 3)
        let saved = try wb.save()
        let re = try Workbook(data: saved)
        let w = try re.worksheet(named: "Dữ liệu")
        XCTAssertEqual(try w.value("B3"), .string("Mực in HP 12A"), "hàng 4 cũ lên 3")
        XCTAssertEqual(try w.cell("F2")?.formula, "#REF!&\"!\"", "tham chiếu tới hàng bị xóa thành #REF!")
        XCTAssertEqual(try w.cell("E3")?.formula, "C3*D3")
        XCTAssertEqual(try re.worksheet(named: "Tổng hợp").cell("B2")?.formula, "SUM('Dữ liệu'!E2:E5)", "vùng co lại")
        XCTAssertEqual(w.mergedCells.map(\.description), ["A7:C7"])
        XCTAssertTrue(try RoundTrip.partString(saved, "xl/comments1.xml").contains("ref=\"C3\""))
        XCTAssertTrue(try RoundTrip.partString(saved, "xl/tables/table1.xml").contains("ref=\"A1:E5\""))
        XCTAssertEqual(PackageValidator.validate(saved), [])
        Fixtures.publishArtifact(saved, name: "p5-delete-rows.xlsx")
        // Xóa hàng có bình luận → bình luận bị xóa theo.
        try w.deleteRows(at: 3)
        let again = try Workbook(data: try re.save())
        _ = again
        XCTAssertFalse(try RoundTrip.partString(try re.save(), "xl/comments1.xml").contains("ref=\"C3\""))
    }

    func testRowAdjustmentRules() {
        XCTAssertEqual(FormulaRewriter.adjustRows("A1+A5+$A$5+A$9:B10", formulaSheet: "S", target: "S", at: 5, delta: 2), "A1+A7+$A$7+A$11:B12")
        XCTAssertEqual(FormulaRewriter.adjustRows("Other!A5+A5", formulaSheet: "S", target: "Other", at: 1, delta: 1), "Other!A6+A5")
        XCTAssertEqual(FormulaRewriter.adjustRows("SUM(A2:A10)", formulaSheet: "S", target: "S", at: 4, delta: -3), "SUM(A2:A7)")
        XCTAssertEqual(FormulaRewriter.adjustRows("SUM(A4:A6)", formulaSheet: "S", target: "S", at: 4, delta: -3), "SUM(#REF!)")
        XCTAssertEqual(FormulaRewriter.adjustRows("SUM(3:5)+B:B", formulaSheet: "S", target: "S", at: 1, delta: 1), "SUM(4:6)+B:B")
        XCTAssertEqual(FormulaRewriter.invalidateSheet("SUM('Dữ liệu'!E2:E6)+X!A1", named: "Dữ liệu"), "SUM(#REF!E2:E6)+X!A1")
    }

    func testRealWorkbooksInsertAndDeleteRows() throws {
        for f in Fixtures.list("real", extensions: ["xlsx"]) {
            let original = try Fixtures.data(f)
            let wb = try Workbook(data: original)
            let ws = try wb.worksheet(at: 0)
            let before = ws.cells.map(\.value)
            try ws.insertRows(at: 2, count: 3)
            try ws.deleteRows(at: 2, count: 3)
            let re = try Workbook(data: try wb.save())
            XCTAssertEqual(try re.worksheet(at: 0).cells.map(\.value), before, "\(f): chèn rồi xóa phải về như cũ")
            XCTAssertEqual(PackageValidator.validate(try wb.save()).filter { !PackageValidator.validate(original).contains($0) }, [], f)
        }
    }

    func testPageBreaksFollowRowsAndColumns() throws {
        let wb = try Workbook(data: try Fixtures.data(rich))
        let ws = try wb.worksheet(named: "Dữ liệu")
        let rb = try XDocument(string: #"<rowBreaks xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="2" manualBreakCount="2"><brk id="5" max="16383" man="1"/><brk id="9" max="16383" man="1"/></rowBreaks>"#).root
        rb.removeAttribute("xmlns")
        ws.document.root.insertChild(rb, schemaOrder: Worksheet.worksheetOrder)
        try ws.insertRows(at: 3, count: 2)   // ngắt trên hàng 6 → 8, trên hàng 10 → 12
        try ws.deleteRows(at: 12, count: 1)  // hàng 12 bị xóa → ngắt phía trên nó giữ (id 11 trỏ hàng 12 bị xóa → bỏ)
        let xml = try RoundTrip.partString(try wb.save(), "xl/worksheets/sheet1.xml")
        XCTAssertTrue(xml.contains("<rowBreaks count=\"1\" manualBreakCount=\"1\"><brk id=\"7\" max=\"16383\" man=\"1\"/></rowBreaks>"), xml)
        XCTAssertEqual(PackageValidator.validate(try wb.save()), [])
    }
}
