import XCTest
@testable import OOXMLSpreadsheet
import OOXMLPackage
import OOXMLTestSupport

/// `SheetRowReader`: đọc ô theo cửa sổ hàng từ byte thô, không dựng DOM cả sheet.
/// Yêu cầu cốt lõi: kết quả phải GIỐNG HỆT đường DOM (`Worksheet`) trên mọi fixture.
final class SheetRowReaderTests: XCTestCase {
    static let fixtures = [
        "xlsx/implicit-refs.xlsx", "xlsx/office-quirks.xlsx", "xlsx/prefixed-x.xlsx", "xlsx/rich-excel.xlsx",
        "xlsx/strict.xlsx", "real/sample-sheet-charts.xlsx", "real/sample-sheet-formulas.xlsx",
        "real/sample-sheet-hidden-autofilter.xlsx", "real/sample-sheet-pivot.xlsx",
        "real/sample-sheet-validation.xlsx", "real/sample-sheet.xlsx", "real/ton-kho-3t.xlsx",
    ]

    private func worksheetSheets(_ wb: Workbook) -> [(index: Int, name: String)] {
        wb.sheets.enumerated().filter { $0.element.kind == .worksheet }.map { ($0.offset, $0.element.name) }
    }

    func testAllCellsMatchWorksheetOnEveryFixture() throws {
        for path in Self.fixtures {
            let data = try Fixtures.data(path)
            let eager = try Workbook(data: data)
            let lazy = try Workbook(data: data, deferValidation: true, lazyModel: true)
            for (index, name) in worksheetSheets(eager) {
                let expected = try eager.worksheet(at: index).cells
                let reader = try lazy.rowReader(forSheetAt: index)
                let actual = try reader.cells(inRows: 1...CellReference.maxRow).sorted { $0.reference < $1.reference }
                XCTAssertEqual(actual, expected, "\(path) sheet \(name)")
                XCTAssertEqual(reader.lastRowNumber, expected.map(\.reference.row).max() ?? reader.lastRowNumber,
                               "\(path) sheet \(name): hàng cuối")
            }
        }
    }

    func testReaderDoesNotParseSheetDOM() throws {
        let wb = try Workbook(data: try Fixtures.data("xlsx/rich-excel.xlsx"), deferValidation: true, lazyModel: true)
        let before = wb.package.loadedXMLPartCount
        let reader = try wb.rowReader(forSheetAt: 0)
        _ = try reader.cells(inRows: 1...5)
        XCTAssertEqual(wb.package.loadedXMLPartCount, before, "bộ đọc không được nạp DOM của sheet vào gói")
    }

    func testWindowAndRangeMatchWorksheet() throws {
        for path in Self.fixtures {
            let data = try Fixtures.data(path)
            let eager = try Workbook(data: data)
            for (index, name) in worksheetSheets(eager) {
                let all = try eager.worksheet(at: index).cells
                guard let maxRow = all.map(\.reference.row).max() else { continue }
                let reader = try eager.rowReader(forSheetAt: index)
                let mid = max(1, maxRow / 2)
                for window in [1...1, mid...mid, mid...maxRow, maxRow...(maxRow + 10), (maxRow + 1)...(maxRow + 5)] {
                    let expected = all.filter { window.contains($0.reference.row) }
                    let actual = try reader.cells(inRows: window).sorted { $0.reference < $1.reference }
                    XCTAssertEqual(actual, expected, "\(path) sheet \(name) hàng \(window)")
                }
                let range = CellRange(CellReference(column: 2, row: 1), CellReference(column: 3, row: maxRow))
                let expected = all.filter { range.contains($0.reference) }
                XCTAssertEqual(try reader.cells(in: range).sorted { $0.reference < $1.reference }, expected,
                               "\(path) sheet \(name) vùng \(range)")
                if let some = all.last {
                    XCTAssertEqual(try reader.cell(some.reference), some, "\(path) sheet \(name) ô \(some.reference)")
                }
            }
        }
    }

    /// Dựng XLSX tối thiểu từ XML của sheet (không có sharedStrings).
    private func workbook(sheetXML: String) throws -> Workbook {
        let rels = "http://schemas.openxmlformats.org/package/2006/relationships"
        let od = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
        let package = OPCPackage()
        package.setData(Data("<?xml version=\"1.0\"?><workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"\(od)\"><sheets><sheet name=\"S\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>".utf8),
                        for: PartName("/xl/workbook.xml"),
                        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml")
        package.setData(Data(sheetXML.utf8), for: PartName("/xl/worksheets/sheet1.xml"),
                        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml")
        package.setData(Data("<?xml version=\"1.0\"?><Relationships xmlns=\"\(rels)\"><Relationship Id=\"rId1\" Type=\"\(od)/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>".utf8),
                        for: PartName("/_rels/.rels"))
        package.setData(Data("<?xml version=\"1.0\"?><Relationships xmlns=\"\(rels)\"><Relationship Id=\"rId1\" Type=\"\(od)/worksheet\" Target=\"worksheets/sheet1.xml\"/></Relationships>".utf8),
                        for: PartName("/xl/_rels/workbook.xml.rels"))
        return try Workbook(data: try package.save())
    }

    func testSharedFormulaDependentOutsideMasterWindow() throws {
        let ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
        var rows = "<row r=\"1\"><c r=\"A1\"><v>1</v></c><c r=\"B1\"><f t=\"shared\" ref=\"B1:B200\" si=\"0\">A1*2</f><v>2</v></c></row>"
        for r in 2...200 {
            rows += "<row r=\"\(r)\"><c r=\"A\(r)\"><v>\(r)</v></c><c r=\"B\(r)\"><f t=\"shared\" si=\"0\"/><v>\(r * 2)</v></c></row>"
        }
        let wb = try workbook(sheetXML: "<?xml version=\"1.0\"?><worksheet xmlns=\"\(ns)\"><sheetData>\(rows)</sheetData></worksheet>")
        let reader = try wb.rowReader(forSheetAt: 0)
        XCTAssertEqual(reader.rowCount, 200)
        XCTAssertEqual(reader.lastRowNumber, 200)
        let cell = try XCTUnwrap(try reader.cell("B150"))
        XCTAssertEqual(cell.formula, "A150*2")
        XCTAssertEqual(cell.value, .number(300))
        XCTAssertEqual(try reader.cells(inRows: 150...151).map(\.reference.a1), ["A150", "B150", "A151", "B151"])
        XCTAssertEqual(try reader.cells(inRows: 1...200).sorted { $0.reference < $1.reference },
                       try wb.worksheet(at: 0).cells)
    }

    func testEmptyAndSelfClosingSheetData() throws {
        let ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
        for body in ["<sheetData/>", "<sheetData></sheetData>"] {
            let wb = try workbook(sheetXML: "<?xml version=\"1.0\"?><worksheet xmlns=\"\(ns)\">\(body)<rowBreaks count=\"0\"/></worksheet>")
            let reader = try wb.rowReader(forSheetAt: 0)
            XCTAssertEqual(reader.rowCount, 0)
            XCTAssertEqual(reader.lastRowNumber, 0)
            XCTAssertEqual(try reader.cells(inRows: 1...100), [])
        }
    }

    func testNonAscendingRowsAndQuotedGreaterThan() throws {
        let ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
        let xml = "<?xml version=\"1.0\"?><worksheet xmlns=\"\(ns)\"><sheetData>"
            + "<row r=\"5\" spans=\"1:2\"><c r=\"A5\" t=\"str\"><v>năm &gt; bốn</v></c></row>"
            + "<row r=\"2\"><c r=\"A2\"><v>2</v></c></row>"
            + "<row r=\"9\"><c r=\"A9\" t=\"inlineStr\"><is><t>a &lt;row b</t></is></c></row>"
            + "</sheetData><rowBreaks count=\"1\"><brk id=\"3\"/></rowBreaks></worksheet>"
        let wb = try workbook(sheetXML: xml)
        let reader = try wb.rowReader(forSheetAt: 0)
        XCTAssertEqual(reader.rowCount, 3)
        XCTAssertEqual(reader.lastRowNumber, 9)
        XCTAssertEqual(try reader.cell("A2")?.value, .number(2))
        XCTAssertEqual(try reader.cell("A5")?.value, .string("năm > bốn"))
        XCTAssertEqual(try reader.cell("A9")?.value, .string("a <row b"))
        XCTAssertNil(try reader.cell("A3"))
        XCTAssertEqual(try reader.cells(inRows: 1...9).sorted { $0.reference < $1.reference },
                       try wb.worksheet(at: 0).cells)
    }

    func testSnapshotReflectsUnsavedEditsAtCreation() throws {
        let wb = try Workbook(data: try Fixtures.data("xlsx/rich-excel.xlsx"))
        let ws = try wb.worksheet(at: 0)
        try ws.setValue("mới", at: "Z99")
        let reader = try wb.rowReader(forSheetAt: 0)
        XCTAssertEqual(try reader.cell("Z99")?.value, .string("mới"))
    }
}
