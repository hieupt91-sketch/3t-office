import XCTest
@testable import OOXMLSpreadsheet
import OOXMLPackage
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
        XCTAssertEqual(FormulaRewriter.rewriteScalarConcat("CONCAT(A1, \"x,y\", UPPER(B1))"), "((A1)&(\"x,y\")&(UPPER(B1)))")
        XCTAssertEqual(FormulaRewriter.rewriteScalarConcat("MYCONCAT(A1,B1)"), "MYCONCAT(A1,B1)")
        try RoundTrip.verify(
            original: original,
            saved: saved,
            allowedChanges: ["xl/worksheets/sheet1.xml", "xl/worksheets/_rels/sheet1.xml.rels"],
            requireChanged: ["xl/worksheets/sheet1.xml", "xl/worksheets/_rels/sheet1.xml.rels"],
            name: "xlsx-p1-hyperlinks.xlsx"
        )
    }

    func testReviewW3FormulaConcatCases() {
        XCTAssertEqual(FormulaRewriter.rewriteScalarConcat("_xlfn.CONCAT(A1, B1)"), "((A1)&(B1))")
        XCTAssertEqual(FormulaRewriter.rewriteScalarConcat("CONCAT('Doanh thu, 2024'!A1, B1)"), "(('Doanh thu, 2024'!A1)&(B1))")
        XCTAssertEqual(FormulaRewriter.rewriteScalarConcat("CONCAT(A1, B1) * 2"), "((A1)&(B1)) * 2")
        XCTAssertEqual(FormulaRewriter.rewriteScalarConcat("CONCAT({\"a\", \"b\"}, C1)"), "(({\"a\", \"b\"})&(C1))")
    }

    func testRewriteLegacyConcatOnSheet() throws {
        let original = try Fixtures.data("xlsx/rich-excel.xlsx")
        let wb = try Workbook(data: original)
        let ws = try wb.worksheet(at: 0)
        try ws.setFormula("CONCAT(A1, \"x\", B1)", at: "Z99")
        try ws.setFormula("SUM(A1:A5)", at: "Z98")
        XCTAssertEqual(try ws.rewriteLegacyConcat(), 1)
        XCTAssertEqual(try ws.cell("Z99")?.formula, "((A1)&(\"x\")&(B1))")
        XCTAssertEqual(try ws.cell("Z98")?.formula, "SUM(A1:A5)")
        let saved = try wb.save()
        let reopened = try Workbook(data: saved)
        XCTAssertEqual(try reopened.worksheet(at: 0).cell("Z99")?.formula, "((A1)&(\"x\")&(B1))")
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["xl/worksheets/sheet1.xml", "xl/workbook.xml", "xl/calcChain.xml",
                                              "[Content_Types].xml", "xl/_rels/workbook.xml.rels"],
                             requireChanged: ["xl/worksheets/sheet1.xml"],
                             name: "xlsx-legacy-concat.xlsx")
    }

    func testReviewW3SingleFormulaValidationAndPasswordHash() throws {
        let workbook = try Workbook(data: Fixtures.data("xlsx/rich-excel.xlsx"))
        let sheet = try workbook.worksheet(named: "Dữ liệu")
        XCTAssertNoThrow(try sheet.addDataValidation(range: CellRange("A1")!, validation: DataValidationRule(type: "whole", formula1: "100", operator: "greaterThan")))
        try workbook.setWorkbookProtection(lockStructure: true, password: "demo")
        try sheet.setSheetProtection(password: "demo")
        let saved = try workbook.save()
        let workbookXML = try RoundTrip.partString(saved, "xl/workbook.xml")
        let sheetXML = try RoundTrip.partString(saved, "xl/worksheets/sheet1.xml")
        XCTAssertTrue(workbookXML.contains("workbookPassword=\"CA8B\""), workbookXML)
        XCTAssertTrue(sheetXML.contains("password=\"CA8B\""), sheetXML)
    }

    func testReviewW3PreservesSheetPropertiesWhenClearingTabColor() throws {
        let workbook = try Workbook(data: Fixtures.data("xlsx/rich-excel.xlsx"))
        let sheet = try workbook.worksheet(named: "Dữ liệu")
        let properties = try XCTUnwrap(sheet.document.root.firstChild(NS.s, "sheetPr"))
        for child in properties.elements { child.removeFromParent() }
        properties.setAttribute("codeName", "Sheet1")
        try sheet.setTabColor(rgbHex: "")
        let saved = try workbook.save()
        let xml = try RoundTrip.partString(saved, "xl/worksheets/sheet1.xml")
        XCTAssertTrue(xml.contains("<sheetPr codeName=\"Sheet1\""), xml)
    }

    func testReviewW3ExternalHyperlinkDeclaresRelationshipNamespaceOnNewSheet() throws {
        let workbook = try Workbook(data: Fixtures.data("xlsx/rich-excel.xlsx"))
        let sheet = try workbook.addWorksheet(named: "Liên kết")
        try sheet.setHyperlink(at: "A1", target: "https://example.test")
        XCTAssertEqual(sheet.document.root.attribute("xmlns:r"), NS.r.primaryURI)
        let saved = try workbook.save()
        XCTAssertNoThrow(try Workbook(data: saved))
    }

    func testReviewW3ClearConditionalFormattingKeepsOtherSqrefAreas() throws {
        let workbook = try Workbook(data: Fixtures.data("xlsx/rich-excel.xlsx"))
        let sheet = try workbook.worksheet(named: "Dữ liệu")
        let formatting = XElement(name: "conditionalFormatting", attributes: [XAttribute(name: "sqref", value: "B2:B10 D2:D10")])
        formatting.append(XElement(name: "cfRule", attributes: [XAttribute(name: "type", value: "expression"), XAttribute(name: "priority", value: "9")]))
        sheet.document.root.append(formatting)
        try sheet.clearConditionalFormatting(range: CellRange("B2:B10")!)
        let saved = try workbook.save()
        let xml = try RoundTrip.partString(saved, "xl/worksheets/sheet1.xml")
        XCTAssertTrue(xml.contains("sqref=\"D2:D10\""), xml)
    }

    func testReviewW3EditingSharedFormulaSlaveExpandsWholeGroup() throws {
        let workbook = try Workbook(data: Fixtures.data("xlsx/rich-excel.xlsx"))
        let sheet = try workbook.worksheet(named: "Dữ liệu")
        try sheet.setValue(123, at: "E3")
        let saved = try workbook.save()
        let xml = try RoundTrip.partString(saved, "xl/worksheets/sheet1.xml")
        XCTAssertFalse(xml.contains("<f t=\"shared\" ref=\"E2:E6\""), xml)
        XCTAssertTrue(xml.contains("<c r=\"E3\" s=\"3\"><v>123</v></c>"), xml)
        XCTAssertTrue(xml.contains("<c r=\"E4\" s=\"3\"><f>C4*D4</f>"), xml)
    }

    func testReviewW3RemovingFreezePanesRestoresSelection() throws {
        let workbook = try Workbook(data: Fixtures.data("xlsx/rich-excel.xlsx"))
        let sheet = try workbook.worksheet(named: "Dữ liệu")
        try sheet.removeFreezePanes()
        let saved = try workbook.save()
        let xml = try RoundTrip.partString(saved, "xl/worksheets/sheet1.xml")
        XCTAssertTrue(xml.contains("<selection activeCell=\"A1\" sqref=\"A1\""), xml)
    }

    func testReviewW3OversizedPasswordDoesNotTrap() throws {
        let workbook = try Workbook(data: Fixtures.data("xlsx/rich-excel.xlsx"))
        try workbook.setWorkbookProtection(lockStructure: true, password: String(repeating: "x", count: 65_536))
        XCTAssertNoThrow(try workbook.save())
    }

    func testReviewW3ThemeElementsAreInsertedBeforeExtraColorSchemes() throws {
        let workbook = try Workbook(data: Fixtures.data("xlsx/rich-excel.xlsx"))
        let themePart = try XCTUnwrap(workbook.package.relatedPart(from: workbook.workbookPart, .theme))
        let theme = try workbook.package.xml(themePart)
        theme.root.firstChild(NS.a, "themeElements")?.removeFromParent()
        let extra = XElement(name: theme.root.qualifiedName("extraClrSchemeLst", in: NS.a).name)
        theme.root.append(extra)
        try workbook.setTheme(preset: .ocean)
        let saved = try workbook.save()
        let xml = try RoundTrip.partString(saved, "xl/theme/theme1.xml")
        XCTAssertLessThan(try XCTUnwrap(xml.range(of: "<a:themeElements" )).lowerBound,
                          try XCTUnwrap(xml.range(of: "<a:extraClrSchemeLst" )).lowerBound)
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

    func testDocumentPropertiesAndThemeRoundTrip() throws {
        let original = try Fixtures.data("xlsx/rich-excel.xlsx")
        let workbook = try Workbook(data: original)
        try PackageTools.setProperties(package: workbook.package, title: "Báo cáo", creator: "VN Office",
                                       description: "Tổng hợp tháng", contentStatus: "Bản nháp")
        try workbook.setTheme(preset: .ocean)
        let saved = try workbook.save()
        let core = try RoundTrip.partString(saved, "docProps/core.xml")
        let theme = try RoundTrip.partString(saved, "xl/theme/theme1.xml")
        XCTAssertTrue(core.contains("<dc:title>Báo cáo</dc:title>"), core)
        XCTAssertTrue(core.contains("<dc:creator>VN Office</dc:creator>"), core)
        XCTAssertTrue(core.contains("<cp:contentStatus>Bản nháp</cp:contentStatus>"), core)
        XCTAssertTrue(theme.contains("val=\"0070C0\""), theme)
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["docProps/core.xml", "xl/theme/theme1.xml"],
                             requireChanged: ["docProps/core.xml", "xl/theme/theme1.xml"],
                             name: "xlsx-p1-properties-theme.xlsx")
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
        let saved = try workbook.save()
        let xml = try RoundTrip.partString(saved, "xl/worksheets/sheet1.xml")
        XCTAssertFalse(xml.contains("<conditionalFormatting"), xml)
    }

    func testConditionalFormattingVisualRuleStructures() throws {
        let original = try Fixtures.data("xlsx/rich-excel.xlsx")
        let workbook = try Workbook(data: original)
        let sheet = try workbook.worksheet(named: "Dữ liệu")
        try sheet.addConditionalFormatting(
            range: CellRange("A1:A10")!,
            rule: CFRule(type: "colorScale", formula: [], priority: 1,
                         visualFormat: .colorScale(
                            thresholds: [CFThreshold(type: .minimum), CFThreshold(type: .maximum)],
                            colors: ["FFF8696B", "FF63BE7B"]
                         ))
        )
        try sheet.addConditionalFormatting(
            range: CellRange("B1:B10")!,
            rule: CFRule(type: "dataBar", formula: [], priority: 2,
                         visualFormat: .dataBar(minimum: CFThreshold(type: .minimum),
                                               maximum: CFThreshold(type: .maximum), color: "FF638EC6"))
        )
        try sheet.addConditionalFormatting(
            range: CellRange("C1:C10")!,
            rule: CFRule(type: "iconSet", formula: [], priority: 3,
                         visualFormat: .iconSet(name: "3TrafficLights1", thresholds: [
                            CFThreshold(type: .percent, value: "0"),
                            CFThreshold(type: .percent, value: "33"),
                            CFThreshold(type: .percent, value: "67"),
                         ]))
        )
        let saved = try workbook.save()
        let xml = try RoundTrip.partString(saved, "xl/worksheets/sheet1.xml")
        XCTAssertTrue(xml.contains("<colorScale>"), xml)
        XCTAssertTrue(xml.contains("<dataBar showValue=\"1\">"), xml)
        XCTAssertTrue(xml.contains("<iconSet iconSet=\"3TrafficLights1\""), xml)
        XCTAssertTrue(xml.contains("<color rgb=\"FFF8696B\"/>"), xml)
        XCTAssertTrue(xml.contains("<cfvo type=\"percent\" val=\"33\"/>"), xml)
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["xl/worksheets/sheet1.xml"],
                             requireChanged: ["xl/worksheets/sheet1.xml"], name: "xlsx-p1-cf-visuals.xlsx")
    }
}
