import XCTest
@testable import OOXMLSpreadsheet
import OOXMLTestSupport

final class P1WorksheetFeatureTests: XCTestCase {
    func testCalculationAndProtectionSettingsRoundTrip() throws {
        let original = try Fixtures.data("xlsx/rich-excel.xlsx")
        let workbook = try Workbook(data: original)
        try workbook.setCalculationOptions(calcMode: .manual, iterate: true, date1904: true)
        try workbook.setWorkbookProtection(lockStructure: true, password: "demo")
        try workbook.worksheet(named: "Dữ liệu").setSheetProtection(
            password: "demo",
            options: SheetProtectionOptions(sheet: true, objects: true, scenarios: true, formatCells: true)
        )

        let saved = try workbook.save()
        let workbookXML = try RoundTrip.partString(saved, "xl/workbook.xml")
        let sheetXML = try RoundTrip.partString(saved, "xl/worksheets/sheet1.xml")
        XCTAssertTrue(workbookXML.contains("calcMode=\"manual\""), workbookXML)
        XCTAssertTrue(workbookXML.contains("iterate=\"1\""), workbookXML)
        XCTAssertTrue(workbookXML.contains("date1904=\"1\""), workbookXML)
        XCTAssertTrue(workbookXML.contains("lockStructure=\"1\""), workbookXML)
        XCTAssertTrue(sheetXML.contains("<sheetProtection"), sheetXML)
        XCTAssertTrue(sheetXML.contains("formatCells=\"1\""), sheetXML)
        try RoundTrip.verify(
            original: original,
            saved: saved,
            allowedChanges: ["xl/workbook.xml", "xl/worksheets/sheet1.xml"],
            requireChanged: ["xl/workbook.xml", "xl/worksheets/sheet1.xml"],
            name: "xlsx-p1-calc-protection.xlsx"
        )
    }

    func testHyperlinkAndScalarConcatRewrite() throws {
        let original = try Fixtures.data("xlsx/rich-excel.xlsx")
        let workbook = try Workbook(data: original)
        let sheet = try workbook.worksheet(named: "Dữ liệu")
        try sheet.setHyperlink(at: "B2", target: "https://example.test/a?x=1&y=2")
        try sheet.setHyperlink(at: "C2", target: "'Tổng hợp'!A1", isExternal: false)

        let saved = try workbook.save()
        let reopened = try Workbook(data: saved)
        let links = try reopened.worksheet(named: "Dữ liệu").hyperlinks
        XCTAssertTrue(links.contains { $0.cell == "B2" && $0.target.contains("example.test/a?x=1&y=2") })
        XCTAssertTrue(links.contains { $0.cell == "C2" && $0.target == "'Tổng hợp'!A1" })
        XCTAssertEqual(FormulaRewriter.rewriteScalarConcat("CONCAT(A1, \"x,y\", UPPER(B1))"), "(A1)&(\"x,y\")&(UPPER(B1))")
        XCTAssertEqual(FormulaRewriter.rewriteScalarConcat("MYCONCAT(A1,B1)"), "MYCONCAT(A1,B1)")
        try RoundTrip.verify(
            original: original,
            saved: saved,
            allowedChanges: ["xl/worksheets/sheet1.xml", "xl/worksheets/_rels/sheet1.xml.rels"],
            requireChanged: ["xl/worksheets/sheet1.xml", "xl/worksheets/_rels/sheet1.xml.rels"],
            name: "xlsx-p1-hyperlinks.xlsx"
        )
    }

    func testViewAndPrintOptionsRoundTrip() throws {
        let original = try Fixtures.data("xlsx/rich-excel.xlsx")
        let workbook = try Workbook(data: original)
        let sheet = try workbook.worksheet(named: "Dữ liệu")
        try sheet.setViewOptions(WorksheetViewOptions(showGridLines: false, showRowColumnHeaders: true, zoomScale: 85))
        try sheet.setPrintOptions(WorksheetPrintOptions(gridLines: true, headings: true, horizontalCentered: true))
        let saved = try workbook.save()
        let xml = try RoundTrip.partString(saved, "xl/worksheets/sheet1.xml")
        XCTAssertTrue(xml.contains("showGridLines=\"0\""), xml)
        XCTAssertTrue(xml.contains("showRowColHeaders=\"1\""), xml)
        XCTAssertTrue(xml.contains("zoomScale=\"85\""), xml)
        XCTAssertTrue(xml.contains("<printOptions gridLines=\"1\""), xml)
        XCTAssertTrue(xml.contains("headings=\"1\""), xml)
        XCTAssertTrue(xml.contains("horizontalCentered=\"1\""), xml)
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["xl/worksheets/sheet1.xml"],
                             requireChanged: ["xl/worksheets/sheet1.xml"], name: "xlsx-p1-view-print.xlsx")
    }

    func testConditionalFormattingAndValidationRoundTrip() throws {
        let original = try Fixtures.data("xlsx/rich-excel.xlsx")
        let workbook = try Workbook(data: original)
        let sheet = try workbook.worksheet(named: "Dữ liệu")

        try sheet.addConditionalFormatting(
            range: CellRange("B2:B11")!,
            rule: CFRule(type: "cellIs", operator: "greaterThan", formula: ["100"], priority: 1)
        )
        try sheet.addDataValidation(
            range: CellRange("C2:C11")!,
            validation: DataValidationRule(type: "list", formula1: "\"Nam,Nữ\"", allowBlank: true)
        )

        let saved = try workbook.save()
        let xml = try RoundTrip.partString(saved, "xl/worksheets/sheet1.xml")
        XCTAssertTrue(xml.contains("<conditionalFormatting sqref=\"B2:B11\"><cfRule type=\"cellIs\""), xml)
        XCTAssertTrue(xml.contains("operator=\"greaterThan\""), xml)
        XCTAssertTrue(xml.contains("priority=\"1\""), xml)
        XCTAssertTrue(xml.contains("<formula>100</formula>"), xml)
        XCTAssertTrue(xml.contains("<dataValidation type=\"list\""), xml)
        XCTAssertTrue(xml.contains("sqref=\"C2:C11\""), xml)
        XCTAssertTrue(xml.contains("<formula1>\"Nam,Nữ\"</formula1>"), xml)
        try RoundTrip.verify(
            original: original,
            saved: saved,
            allowedChanges: ["xl/worksheets/sheet1.xml"],
            requireChanged: ["xl/worksheets/sheet1.xml"],
            name: "xlsx-p1-conditional-validation.xlsx"
        )
    }

    func testConditionalFormattingCanClearAndInvalidRuleIsRejected() throws {
        let workbook = try Workbook(data: Fixtures.data("xlsx/rich-excel.xlsx"))
        let sheet = try workbook.worksheet(named: "Dữ liệu")
        XCTAssertThrowsError(try sheet.addConditionalFormatting(
            range: CellRange("B2:B11")!,
            rule: CFRule(type: "unsupported", formula: [], priority: 0)
        ))
        try sheet.addConditionalFormatting(
            range: CellRange("B2:B11")!,
            rule: CFRule(type: "expression", formula: ["B2>100"], priority: 1)
        )
        try sheet.clearConditionalFormatting()
        let xml = try RoundTrip.partString(workbook.save(), "xl/worksheets/sheet1.xml")
        XCTAssertFalse(xml.contains("<conditionalFormatting"), xml)
    }
}
