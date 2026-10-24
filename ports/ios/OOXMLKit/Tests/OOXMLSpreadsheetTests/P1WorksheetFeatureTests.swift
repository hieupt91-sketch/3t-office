import XCTest
@testable import OOXMLSpreadsheet
import OOXMLTestSupport

final class P1WorksheetFeatureTests: XCTestCase {
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
