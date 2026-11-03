import XCTest
@testable import OOXMLSpreadsheet
import OOXMLPackage
import OOXMLTestSupport

final class P0WorksheetAPITests: XCTestCase {
    func testAutoFilterCriteriaRoundTrip() throws {
        let original = try Fixtures.data("xlsx/rich-excel.xlsx")
        let wb = try Workbook(data: original)
        let ws = try wb.worksheet(named: "Dữ liệu")
        // Chưa có vùng lọc: đặt tiêu chí phải lỗi.
        XCTAssertThrowsError(try ws.setAutoFilterCriterion(column: 0, .values(["A"])))
        try ws.setAutoFilter(range: CellRange("A1:E11")!)
        try ws.setAutoFilterCriterion(column: 0, .values(["Hà Nội", "Huế"]))
        try ws.setAutoFilterCriterion(column: 2, .custom([FilterCondition(op: "greaterThanOrEqual", value: "100"),
                                                          FilterCondition(op: "lessThan", value: "500")], and: true))
        try ws.setAutoFilterCriterion(column: 4, .top10(top: true, percent: false, value: 5))
        // Lỗi: cột ngoài vùng, toán tử sai, danh sách rỗng, top10 <= 0.
        XCTAssertThrowsError(try ws.setAutoFilterCriterion(column: 5, .values(["A"])))
        XCTAssertThrowsError(try ws.setAutoFilterCriterion(column: 1, .custom([FilterCondition(op: "contains", value: "x")], and: false)))
        XCTAssertThrowsError(try ws.setAutoFilterCriterion(column: 1, .values([])))
        XCTAssertThrowsError(try ws.setAutoFilterCriterion(column: 1, .top10(top: true, percent: true, value: 0)))
        let saved = try wb.save()
        let xml = try RoundTrip.partString(saved, "xl/worksheets/sheet1.xml")
        XCTAssertTrue(xml.contains("<filterColumn colId=\"0\"><filters><filter val=\"Hà Nội\"/><filter val=\"Huế\"/></filters></filterColumn>"), xml)
        XCTAssertTrue(xml.contains("customFilters and=\"1\""), xml)
        XCTAssertTrue(xml.contains("<top10 top=\"1\" percent=\"0\" val=\"5\" filterVal=\"5\"/>") || xml.contains("<top10"), xml)
        let reopened = try Workbook(data: saved)
        let rws = try reopened.worksheet(named: "Dữ liệu")
        XCTAssertEqual(rws.autoFilterRange?.description, "A1:E11")
        let cols = Dictionary(uniqueKeysWithValues: rws.autoFilterColumns.map { ($0.column, $0.criterion) })
        XCTAssertEqual(cols[0], .values(["Hà Nội", "Huế"]))
        XCTAssertEqual(cols[2], .custom([FilterCondition(op: "greaterThanOrEqual", value: "100"),
                                         FilterCondition(op: "lessThan", value: "500")], and: true))
        XCTAssertEqual(cols[4], .top10(top: true, percent: false, value: 5))
        // Gỡ tiêu chí một cột: cột khác giữ nguyên.
        try rws.setAutoFilterCriterion(column: 0, nil)
        let saved2 = try reopened.save()
        let cols2 = try Workbook(data: saved2).worksheet(named: "Dữ liệu").autoFilterColumns
        XCTAssertEqual(Set(cols2.map { $0.column }), Set([2, 4]))
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["xl/worksheets/sheet1.xml"], requireChanged: ["xl/worksheets/sheet1.xml"],
                             name: "xlsx-autofilter-criteria.xlsx")
    }

    func testP0WorksheetSettingsRoundTripAndPreserveOtherPackageParts() throws {
        let original = try Fixtures.data("xlsx/rich-excel.xlsx")
        let wb = try Workbook(data: original)
        let ws = try wb.worksheet(named: "Dữ liệu")

        try ws.setFreezePanes(rows: 2, cols: 1)
        try ws.setAutoFilter(range: CellRange("A1:E11")!)
        try ws.setTabColor(rgbHex: "FF00FF00")
        try ws.setColumnWidth(col: 2, width: 20.5, hidden: true)
        try ws.setColumnHidden(col: 3, hidden: true)
        try ws.setRowHeight(row: 2, height: 30, hidden: true)
        try ws.setRowHidden(row: 3, hidden: true)
        try ws.setPageSetup(
            margins: PageMargins(left: 0.25, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2),
            orientation: .landscape,
            paperSize: 9
        )
        try ws.setPrintArea(range: CellRange("A1:E11")!)
        try wb.setSheetState(named: "Ẩn", state: .veryHidden)

        let saved = try wb.save()
        let reopened = try Workbook(data: saved)
        let reopenedSheet = try reopened.worksheet(named: "Dữ liệu")
        let sheetXML = try RoundTrip.partString(saved, "xl/worksheets/sheet1.xml")
        let wbXML = try RoundTrip.partString(saved, "xl/workbook.xml")

        XCTAssertTrue(sheetXML.contains("<pane xSplit=\"1\" ySplit=\"2\" topLeftCell=\"B3\" activePane=\"bottomRight\" state=\"frozen\"/>"), sheetXML)
        XCTAssertTrue(sheetXML.contains("<autoFilter ref=\"A1:E11\"/>"), sheetXML)
        XCTAssertTrue(sheetXML.contains("<tabColor rgb=\"FF00FF00\"/>"), sheetXML)
        XCTAssertTrue(sheetXML.contains("width=\"20.5\""), sheetXML)
        XCTAssertTrue(sheetXML.contains("<col min=\"2\" max=\"2\" width=\"20.5\" customWidth=\"1\" hidden=\"1\""), sheetXML)
        XCTAssertTrue(sheetXML.contains("<row r=\"2\""), sheetXML)
        XCTAssertTrue(sheetXML.contains("ht=\"30\""), sheetXML)
        XCTAssertTrue(sheetXML.contains("hidden=\"1\""), sheetXML)
        XCTAssertTrue(sheetXML.contains("<pageMargins left=\"0.25\" right=\"0.25\" top=\"0.5\" bottom=\"0.5\" header=\"0.2\" footer=\"0.2\"/>"), sheetXML)
        XCTAssertTrue(sheetXML.contains("<pageSetup paperSize=\"9\" orientation=\"landscape\""), sheetXML)
        XCTAssertEqual(reopened.sheets.first(where: { $0.name == "Ẩn" })?.state, "veryHidden")
        XCTAssertTrue(wbXML.contains("name=\"_xlnm.Print_Area\" localSheetId=\"0\">'Dữ liệu'!$A$1:$E$11</definedName>"), wbXML)
        XCTAssertEqual(try reopenedSheet.value("A1"), .string("Mã"))

        try RoundTrip.verify(
            original: original,
            saved: saved,
            allowedChanges: ["xl/worksheets/sheet1.xml", "xl/workbook.xml"],
            requireChanged: ["xl/worksheets/sheet1.xml", "xl/workbook.xml"],
            name: "xlsx-p0-settings.xlsx"
        )
    }

    func testP0WorksheetSettingsCanBeRemovedOrReset() throws {
        let original = try Fixtures.data("xlsx/rich-excel.xlsx")
        let wb = try Workbook(data: original)
        let ws = try wb.worksheet(named: "Dữ liệu")

        try ws.setFreezePanes(rows: 1, cols: 0)
        try ws.removeFreezePanes()
        try ws.setAutoFilter(range: CellRange("A1:E11")!)
        try ws.removeAutoFilter()
        try ws.setTabColor(rgbHex: "FF00FF00")
        try ws.setTabColor(rgbHex: "")
        try ws.setColumnWidth(col: 2, width: 18, hidden: true)
        try ws.setColumnWidth(col: 2, width: 18, hidden: false)
        try ws.setRowHeight(row: 2, height: 24, hidden: true)
        try ws.setRowHidden(row: 2, hidden: false)

        let saved = try wb.save()
        let sheetXML = try RoundTrip.partString(saved, "xl/worksheets/sheet1.xml")
        XCTAssertFalse(sheetXML.contains("<pane "), sheetXML)
        XCTAssertFalse(sheetXML.contains("<autoFilter "), sheetXML)
        XCTAssertFalse(sheetXML.contains("<tabColor "), sheetXML)
        XCTAssertFalse(sheetXML.contains("hidden=\"1\""), sheetXML)
        try RoundTrip.verify(
            original: original,
            saved: saved,
            allowedChanges: ["xl/worksheets/sheet1.xml"],
            requireChanged: ["xl/worksheets/sheet1.xml"],
            name: "xlsx-p0-removals.xlsx"
        )
    }

    func testP0WorksheetSettingsRejectInvalidValuesAndKeepVisibleSheet() throws {
        let wb = try Workbook(data: Fixtures.data("xlsx/rich-excel.xlsx"))
        let ws = try wb.worksheet(named: "Dữ liệu")
        XCTAssertThrowsError(try ws.setFreezePanes(rows: -1, cols: 0))
        XCTAssertThrowsError(try ws.setColumnWidth(col: 0, width: 10))
        XCTAssertThrowsError(try ws.setColumnWidth(col: 2, width: .infinity))
        XCTAssertThrowsError(try ws.setRowHeight(row: 2, height: -1))
        XCTAssertThrowsError(try ws.setTabColor(rgbHex: "GG0000"))
        XCTAssertThrowsError(try ws.setPageSetup(
            margins: PageMargins(left: .nan, right: 0.25, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2),
            orientation: .portrait,
            paperSize: 9
        ))

        try wb.setSheetState(named: "Dữ liệu", state: .hidden)
        XCTAssertThrowsError(try wb.setSheetState(named: "Tổng hợp", state: .veryHidden))
        XCTAssertEqual(wb.sheets.first(where: { $0.name == "Tổng hợp" })?.state, "visible")
    }
}
