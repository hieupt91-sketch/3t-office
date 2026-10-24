import XCTest
@testable import OOXMLSpreadsheet
import OOXMLPackage
import OOXMLTestSupport

final class WorkbookRoundTripTests: XCTestCase {
    let rich = "xlsx/rich-excel.xlsx"

    // MARK: Đọc

    func testReadRichWorkbook() throws {
        let wb = try Workbook(data: try Fixtures.data(rich))
        XCTAssertEqual(wb.sheetNames, ["Dữ liệu", "Tổng hợp", "Ẩn"])
        XCTAssertEqual(wb.sheets[2].state, "hidden")
        XCTAssertEqual(wb.definedNames.map(\.name), ["_xlnm.Print_Area", "DuLieu", "TongDoanhThu"])
        XCTAssertEqual(wb.definedNames[0].localSheetIndex, 0)
        let ws = try wb.worksheet(named: "Dữ liệu")
        XCTAssertEqual(try ws.value("A1"), .string("Mã"))
        XCTAssertEqual(try ws.value("B2"), .string("Giấy A4 Double A"))
        XCTAssertEqual(try ws.value("C2"), .number(500))
        XCTAssertEqual(try ws.cell("E2")?.formula, "C2*D2")
        XCTAssertEqual(try ws.cell("E5")?.formula, "C5*D5", "ô phụ thuộc công thức chia sẻ trả về công thức đã dịch")
        XCTAssertEqual(try ws.cell("E5")?.formulaType, "shared")
        XCTAssertEqual(try ws.value("E4"), .number(13_200_000))
        XCTAssertEqual(try ws.value("B7"), .bool(true))
        XCTAssertEqual(try ws.value("C7"), .error("#DIV/0!"))
        XCTAssertEqual(try ws.value("D7"), .string("Chuỗi nội tuyến"))
        XCTAssertEqual(try ws.value("E7"), .string("Tổng: 59,340,000"))
        XCTAssertEqual(try ws.cell("A8")?.isRichText, true)
        XCTAssertEqual(try ws.value("A8"), .string("Chú ý: số liệu tạm tính"))
        XCTAssertEqual(try ws.value("A10"), .string("Ghi chú\r dòng 2"))
        // Ngày: A7 = 46318 với numFmt 14
        let a7 = try ws.cell("A7")!
        XCTAssertTrue(wb.styles!.info(styleIndex: a7.styleIndex).isDate)
        guard case .number(let serial) = a7.value else { return XCTFail() }
        let comps = Calendar(identifier: .gregorian).dateComponents(in: TimeZone(secondsFromGMT: 0)!, from: wb.date(fromSerial: serial))
        XCTAssertEqual([comps.year, comps.month, comps.day], [2026, 10, 23])
        XCTAssertEqual(wb.serial(from: wb.date(fromSerial: serial)), serial, accuracy: 1e-9)
        XCTAssertEqual(wb.styles!.info(styleIndex: 3).numberFormatCode, "#,##0\" ₫\"")
        XCTAssertTrue(wb.styles!.info(styleIndex: 1).bold)
        XCTAssertEqual(ws.mergedCells, [CellRange("A8:C8")!])
        XCTAssertEqual(ws.hyperlinks.map(\.target), ["https://3t.vn/ho-tro?ma=HS%202026", "'Tổng hợp'!A1"])
        XCTAssertEqual(ws.columnWidth(2), 24.81640625)
        XCTAssertEqual(ws.usedRange?.description, "A1:E11")
        let ws2 = try wb.worksheet(at: 1)
        XCTAssertEqual(try ws2.cell("B2")?.formula, "SUM('Dữ liệu'!E2:E6)")
    }

    // MARK: Mở → sửa → lưu → đóng → mở lại

    func testEditValuesSaveCloseReopenPreservesEverythingElse() throws {
        let original = try Fixtures.data(rich)
        let url = try Fixtures.scratchDirectory("xlsx-edit").appendingPathComponent("rich-edited.xlsx")
        do {
            let wb = try Workbook(contentsOf: Fixtures.url(rich))
            let ws = try wb.worksheet(named: "Dữ liệu")
            try ws.setValue(200, at: "C3")
            try ws.setValue("Bút bi Thiên Long (hộp 20)", at: "B3")
            try ws.setValue("  khoảng trắng  ", at: "F2")
            try ws.setValue(.bool(false), at: "F3")
            try ws.setValue(3.14159, at: "G12")      // ngoài dimension → mở rộng
            try ws.clear("D7")
            try wb.save(to: url)
        }
        // "Đóng" = giải phóng toàn bộ đối tượng; mở lại từ đĩa.
        let wb = try Workbook(contentsOf: url)
        let ws = try wb.worksheet(named: "Dữ liệu")
        XCTAssertEqual(try ws.value("C3"), .number(200))
        XCTAssertEqual(try ws.value("B3"), .string("Bút bi Thiên Long (hộp 20)"))
        XCTAssertEqual(try ws.value("F2"), .string("  khoảng trắng  "))
        XCTAssertEqual(try ws.value("F3"), .bool(false))
        XCTAssertEqual(try ws.value("G12"), .number(3.14159))
        XCTAssertEqual(try ws.value("D7"), .empty)
        XCTAssertNil(try ws.cell("D7"), "ô không style bị xóa hẳn")
        XCTAssertEqual(try ws.cell("C3")?.styleIndex, 0)
        XCTAssertEqual(try ws.cell("D3")?.styleIndex, 3, "style ô lân cận giữ nguyên")
        XCTAssertEqual(try ws.cell("E3")?.formula, "C3*D3", "công thức chia sẻ còn nguyên")
        XCTAssertEqual(ws.usedRange?.description, "A1:G12")
        XCTAssertEqual(try ws.value("A8"), .string("Chú ý: số liệu tạm tính"), "rich text còn")

        let saved = try Data(contentsOf: url)
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["xl/worksheets/sheet1.xml", "xl/sharedStrings.xml", "xl/workbook.xml"],
                             requireChanged: ["xl/worksheets/sheet1.xml", "xl/sharedStrings.xml"], name: "xlsx-values.xlsx")
        let sheet = try RoundTrip.partString(saved, "xl/worksheets/sheet1.xml")
        for keep in ["<x14:conditionalFormattings>", "<dataValidations count=\"1\">", "<legacyDrawing r:id=\"rId4\"/>",
                     "<tableParts count=\"1\">", "<sheetProtection algorithmName=\"SHA-512\"", "mc:Ignorable=\"x14ac xr\"",
                     "x14ac:dyDescent=\"0.35\"", "<pane ySplit=\"1\"", "<mergeCell ref=\"A8:C8\"/>",
                     "<f t=\"array\" ref=\"C10:C11\">C2:C3*2</f>", "<dimension ref=\"A1:G12\"/>",
                     "<row r=\"3\" spans=\"1:6\""] {
            XCTAssertTrue(sheet.contains(keep), "mất: \(keep)")
        }
        let wbXML = try RoundTrip.partString(saved, "xl/workbook.xml")
        XCTAssertTrue(wbXML.contains("<calcPr calcId=\"191029\" fullCalcOnLoad=\"1\"/>"))
        XCTAssertTrue(wbXML.contains("<x15ac:absPath"), "mc:AlternateContent giữ nguyên")
        let sst = try RoundTrip.partString(saved, "xl/sharedStrings.xml")
        XCTAssertTrue(sst.contains("<t xml:space=\"preserve\">  khoảng trắng  </t>"))
        XCTAssertTrue(sst.contains("<color rgb=\"FFC00000\"/>"), "định dạng rich text giữ nguyên")
    }

    func testFormulasAndCalcChain() throws {
        let original = try Fixtures.data(rich)
        let wb = try Workbook(data: original)
        let ws = try wb.worksheet(named: "Tổng hợp")
        try ws.setFormula("=AVERAGE('Dữ liệu'!C2:C6)", at: "B5", cachedValue: .number(190.6))
        try ws.setFormula("UPPER(A2)", at: "B6", cachedValue: .string("TỔNG"))
        let saved = try wb.save()
        let re = try Workbook(data: saved)
        let ws2 = try re.worksheet(named: "Tổng hợp")
        XCTAssertEqual(try ws2.cell("B5")?.formula, "AVERAGE('Dữ liệu'!C2:C6)")
        XCTAssertEqual(try ws2.value("B5"), .number(190.6))
        XCTAssertEqual(try ws2.value("B6"), .string("TỔNG"))
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["xl/worksheets/sheet2.xml", "xl/workbook.xml", "xl/calcChain.xml",
                                              "xl/_rels/workbook.xml.rels", "[Content_Types].xml"],
                             requireChanged: ["xl/worksheets/sheet2.xml"], name: "xlsx-formulas.xlsx")
        let pkg = try OPCPackage(data: saved)
        XCTAssertFalse(pkg.hasPart("/xl/calcChain.xml"), "calcChain bị xóa khi công thức đổi (Excel tự dựng lại)")
        XCTAssertNil(pkg.contentTypes.overrides["/xl/calcChain.xml"])
    }

    func testEditingSharedFormulaMasterExpandsGroup() throws {
        let wb = try Workbook(data: try Fixtures.data(rich))
        let ws = try wb.worksheet(named: "Dữ liệu")
        try ws.setValue(0, at: "E2")
        let saved = try wb.save()
        let ws2 = try Workbook(data: saved).worksheet(named: "Dữ liệu")
        XCTAssertNil(try ws2.cell("E2")?.formula)
        for r in 3...6 {
            let c = try ws2.cell("E\(r)")!
            XCTAssertEqual(c.formula, "C\(r)*D\(r)")
            XCTAssertNil(c.formulaType, "đã thành công thức thường")
        }
        XCTAssertEqual(try ws2.value("E4"), .number(13_200_000), "giá trị đệm giữ nguyên")
    }

    func testArrayFormulaProtection() throws {
        let wb = try Workbook(data: try Fixtures.data(rich))
        let ws = try wb.worksheet(named: "Dữ liệu")
        XCTAssertThrowsError(try ws.setValue(1, at: "C11")) {
            XCTAssertEqual($0 as? SpreadsheetError, .partOfArrayFormula(cell: "C11", range: "C10:C11"))
        }
        try ws.setFormula("C2*3", at: "C10")
        let ws2 = try Workbook(data: try wb.save()).worksheet(named: "Dữ liệu")
        XCTAssertEqual(try ws2.cell("C10")?.formula, "C2*3")
        XCTAssertEqual(try ws2.value("C11"), .empty)
        try ws2.setValue(5, at: "C11") // không còn là mảng
    }

    func testStylesMergeColumnsRows() throws {
        let original = try Fixtures.data(rich)
        let wb = try Workbook(data: original)
        let ws = try wb.worksheet(named: "Dữ liệu")
        let before = wb.styles!.cellFormatCount
        try ws.applyFormat(CellFormatChange(bold: true, fontColor: "FF0070C0"), at: "D3")
        try ws.applyFormat(CellFormatChange(bold: true, fontColor: "FF0070C0"), at: "D4") // cùng base + cùng thay đổi → dùng lại
        try ws.applyFormat(CellFormatChange(numberFormat: "dd/mm/yyyy"), at: "A12")
        try ws.applyFormat(CellFormatChange(fillColor: "FFFFFF00", horizontalAlignment: "center", wrapText: true), at: "B12")
        XCTAssertEqual(wb.styles!.cellFormatCount, before + 3)
        try ws.merge("A13:B14")
        XCTAssertThrowsError(try ws.merge("B8:D9")) { XCTAssertEqual($0 as? SpreadsheetError, .overlappingMerge("B8:D9")) }
        ws.setColumnWidth(4, 20)  // nằm trong <col min=3 max=5> → tách 3 | 4 | 5
        ws.setColumnWidth(10, 8.5)
        ws.setRowHeight(3, 25)
        let saved = try wb.save()
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["xl/worksheets/sheet1.xml", "xl/styles.xml"], name: "xlsx-styles.xlsx")
        let re = try Workbook(data: saved)
        let ws2 = try re.worksheet(named: "Dữ liệu")
        let d3 = try ws2.cell("D3")!
        let info = re.styles!.info(styleIndex: d3.styleIndex)
        XCTAssertTrue(info.bold)
        XCTAssertEqual(info.numberFormatCode, "#,##0\" ₫\"", "định dạng số gốc của ô được giữ")
        XCTAssertEqual(try ws2.cell("D4")?.styleIndex, d3.styleIndex)
        XCTAssertTrue(re.styles!.info(styleIndex: try ws2.cell("A12")!.styleIndex).isDate)
        XCTAssertEqual(re.styles!.info(styleIndex: try ws2.cell("B12")!.styleIndex).fillColor, "FFFFFF00")
        XCTAssertEqual(ws2.mergedCells.map(\.description), ["A8:C8", "A13:B14"])
        XCTAssertEqual(ws2.columnWidth(3), 14.6328125)
        XCTAssertEqual(ws2.columnWidth(4), 20)
        XCTAssertEqual(ws2.columnWidth(5), 14.6328125)
        XCTAssertEqual(ws2.columnWidth(10), 8.5)
        XCTAssertEqual(ws2.rowHeight(3), 25)
        let styles = try RoundTrip.partString(saved, "xl/styles.xml")
        XCTAssertTrue(styles.contains("<protection locked=\"0\"/>"), "xf sao chép giữ phần tử con")
        XCTAssertTrue(styles.contains("<x14:slicerStyles"), "extLst styles giữ nguyên")
        XCTAssertTrue(styles.contains("formatCode=\"dd/mm/yyyy\""))
    }

    func testRenameSheetUpdatesAllReferences() throws {
        let original = try Fixtures.data(rich)
        let wb = try Workbook(data: original)
        try wb.renameSheet("Dữ liệu", to: "Kho hàng")
        try wb.renameSheet("Tổng hợp", to: "TongHop")
        XCTAssertThrowsError(try wb.renameSheet("Ẩn", to: "kho HÀNG")) { XCTAssertEqual($0 as? SpreadsheetError, .duplicateSheetName("kho HÀNG")) }
        XCTAssertThrowsError(try wb.renameSheet("Ẩn", to: "a/b"))
        let saved = try wb.save()
        let re = try Workbook(data: saved)
        XCTAssertEqual(re.sheetNames, ["Kho hàng", "TongHop", "Ẩn"])
        let th = try re.worksheet(named: "TongHop")
        XCTAssertEqual(try th.cell("B2")?.formula, "SUM('Kho hàng'!E2:E6)")
        XCTAssertEqual(try th.cell("B4")?.formula, "COUNTA(DuLieu)-COUNTIF('Kho hàng'!B:B,\"Giấy*\")+LOG10(100)")
        XCTAssertEqual(re.definedNames.map(\.formula), ["'Kho hàng'!$A$1:$E$8", "'Kho hàng'!$A$1:$E$6", "TongHop!$B$2"])
        XCTAssertEqual(try re.worksheet(at: 0).hyperlinks.last?.target, "TongHop!A1")
        let app = try RoundTrip.partString(saved, "docProps/app.xml")
        XCTAssertTrue(app.contains("<vt:lpstr>Kho hàng</vt:lpstr><vt:lpstr>TongHop</vt:lpstr>"))
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["xl/workbook.xml", "xl/worksheets/sheet1.xml", "xl/worksheets/sheet2.xml", "docProps/app.xml"],
                             name: "xlsx-rename.xlsx")
    }

    func testAddWorksheetAndFillLargeRange() throws {
        let original = try Fixtures.data(rich)
        let wb = try Workbook(data: original)
        let ws = try wb.addWorksheet(named: "Nhập kho 10-2026")
        XCTAssertThrowsError(try wb.addWorksheet(named: "dữ LIỆU"))
        let rows = 3000
        for r in 1...rows {
            try ws.setValue(Double(r), at: "A\(r)")
            try ws.setValue("Mặt hàng \(r % 50)", at: "B\(r)")
            try ws.setFormula("A\(r)*2", at: "C\(r)", cachedValue: .number(Double(r * 2)))
        }
        let saved = try wb.save()
        let re = try Workbook(data: saved)
        XCTAssertEqual(re.sheetNames.last, "Nhập kho 10-2026")
        let ws2 = try re.worksheet(named: "Nhập kho 10-2026")
        XCTAssertEqual(ws2.cells.count, rows * 3)
        XCTAssertEqual(try ws2.value("B2999"), .string("Mặt hàng 49"))
        XCTAssertEqual(try ws2.cell("C3000")?.formula, "A3000*2")
        XCTAssertEqual(re.sharedStrings!.count, 12 + 50, "chuỗi trùng được dùng lại")
        let app = try RoundTrip.partString(saved, "docProps/app.xml")
        XCTAssertTrue(app.contains("<vt:lpstr>Ẩn</vt:lpstr><vt:lpstr>Nhập kho 10-2026</vt:lpstr>"))
        XCTAssertTrue(app.contains("<vt:i4>4</vt:i4>"))
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["xl/workbook.xml", "xl/_rels/workbook.xml.rels", "[Content_Types].xml",
                                              "xl/worksheets/sheet4.xml", "xl/sharedStrings.xml", "xl/calcChain.xml", "docProps/app.xml"],
                             requireChanged: ["xl/worksheets/sheet4.xml"], name: "xlsx-addsheet.xlsx")
    }

    func testPrefixedNamespaceWorkbook() throws {
        let original = try Fixtures.data("xlsx/prefixed-x.xlsx")
        let wb = try Workbook(data: original)
        let ws = try wb.worksheet(at: 0)
        XCTAssertEqual(try ws.value("A1"), .string("Tiền tố x"))
        XCTAssertEqual(try ws.value("B1"), .number(42))
        try ws.setValue("mới", at: "C2")
        let saved = try wb.save()
        let xml = try RoundTrip.partString(saved, "xl/worksheets/sheet1.xml")
        XCTAssertTrue(xml.contains("<x:row r=\"2\"><x:c r=\"C2\" t=\"s\"><x:v>0</x:v></x:c></x:row>"), xml)
        XCTAssertEqual(try Workbook(data: saved).worksheet(at: 0).value("C2"), .string("mới"))
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["xl/worksheets/sheet1.xml", "xl/workbook.xml", "xl/sharedStrings.xml",
                                              "xl/_rels/workbook.xml.rels", "[Content_Types].xml"], name: "xlsx-prefixed.xlsx")
        let wbXML = try RoundTrip.partString(saved, "xl/workbook.xml")
        XCTAssertTrue(wbXML.contains("<x:calcPr fullCalcOnLoad=\"1\"/>"))
    }

    func testImplicitReferences() throws {
        let original = try Fixtures.data("xlsx/implicit-refs.xlsx")
        let wb = try Workbook(data: original)
        let ws = try wb.worksheet(at: 0)
        XCTAssertEqual(try ws.value("A1"), .number(1))
        XCTAssertEqual(try ws.value("B1"), .number(2))
        XCTAssertEqual(try ws.value("C1"), .string("ba"))
        XCTAssertEqual(try ws.value("A2"), .number(4))
        XCTAssertEqual(try ws.value("C5"), .number(9))
        try ws.setValue(7, at: "B2")
        let re = try Workbook(data: try wb.save()).worksheet(at: 0)
        XCTAssertEqual(try re.value("A2"), .number(4))
        XCTAssertEqual(try re.value("B2"), .number(7))
        XCTAssertEqual(try re.value("C1"), .string("ba"))
        XCTAssertEqual(try re.value("C5"), .number(9))
    }

    func testStrictNamespaceWorkbook() throws {
        let wb = try Workbook(data: try Fixtures.data("xlsx/strict.xlsx"))
        let ws = try wb.worksheet(at: 0)
        XCTAssertEqual(try ws.value("A1"), .number(3.5))
        try ws.setValue(4.5, at: "A1")
        XCTAssertEqual(try Workbook(data: try wb.save()).worksheet(at: 0).value("A1"), .number(4.5))
    }

    // MARK: Tệp thật (LibreOffice) — chu trình trên mọi fixture

    func testEveryRealXLSXOpenEditSaveReopen() throws {
        let files = Fixtures.list("real", extensions: ["xlsx"])
        XCTAssertEqual(files.count, 7)
        for f in files {
            let original = try Fixtures.data(f)
            let wb = try Workbook(data: original)
            var snapshot: [String: [Cell]] = [:]
            for info in wb.sheets where info.kind == .worksheet {
                snapshot[info.name] = try wb.worksheet(named: info.name).cells
            }
            let first = try wb.worksheet(at: 0)
            // Ô chắc chắn trống: cột ngay sau vùng đã dùng.
            let target = CellReference(column: (first.usedRange?.end.column ?? 0) + 1, row: 1).a1
            try first.setValue("Đã sửa bởi OOXMLKit", at: target)
            let saved = try wb.save()
            let re = try Workbook(data: saved)
            XCTAssertEqual(try re.worksheet(at: 0).value(target), .string("Đã sửa bởi OOXMLKit"), f)
            for info in re.sheets where info.kind == .worksheet {
                var cells = try re.worksheet(named: info.name).cells
                if info.name == first.name { cells.removeAll { $0.reference.a1 == target } }
                XCTAssertEqual(cells, snapshot[info.name], "\(f) / \(info.name): ô khác bị thay đổi")
            }
            let sheetZip = first.part.zipName
            try RoundTrip.verify(original: original, saved: saved,
                                 allowedChanges: [sheetZip, "xl/sharedStrings.xml", "xl/workbook.xml",
                                                  "xl/_rels/workbook.xml.rels", "[Content_Types].xml"],
                                 requireChanged: [sheetZip], name: "real-edit-" + (f as NSString).lastPathComponent)
        }
    }

    func testRenameUpdatesChartAndPivotSources() throws {
        let charts = try Workbook(data: try Fixtures.data("real/sample-sheet-charts.xlsx"))
        let src = charts.sheetNames[0]
        try charts.renameSheet(src, to: "Doanh thu 2026")
        let chartXML = try RoundTrip.partString(try charts.save(), "xl/charts/chart1.xml")
        XCTAssertTrue(chartXML.contains("'Doanh thu 2026'!"), chartXML)
        XCTAssertFalse(chartXML.contains("<c:f>\(src)!"))

        let pivot = try Workbook(data: try Fixtures.data("real/sample-sheet-pivot.xlsx"))
        let defXML0 = try RoundTrip.partString(try Fixtures.data("real/sample-sheet-pivot.xlsx"), "xl/pivotCache/pivotCacheDefinition1.xml")
        let m = defXML0.range(of: #"sheet="[^"]+""#, options: .regularExpression)!
        let srcSheet = String(defXML0[m].dropFirst(7).dropLast())
        try pivot.renameSheet(srcSheet, to: "Nguồn")
        let defXML = try RoundTrip.partString(try pivot.save(), "xl/pivotCache/pivotCacheDefinition1.xml")
        XCTAssertTrue(defXML.contains("sheet=\"Nguồn\""), defXML)
    }

    func testNotASpreadsheet() throws {
        XCTAssertThrowsError(try Workbook(data: try Fixtures.data("real/sample-writer.docx"))) {
            XCTAssertEqual($0 as? SpreadsheetError, .notASpreadsheet)
        }
    }

    /// Hồi quy phát hiện 23/10: tệp Excel THẬT dùng <font><family val="34"/> (>14), <charset val="163"/>,
    /// color theme+tint — openpyxl từ chối đọc, OOXMLKit phải mở và round-trip nguyên vẹn (không áp ràng buộc kiểu đó).
    func testRealWorldOfficeStyleQuirks() throws {
        let original = try Fixtures.data("xlsx/office-quirks.xlsx")
        let wb = try Workbook(data: original)
        let ws = try wb.worksheet(at: 0)
        XCTAssertEqual(try ws.value("A1"), .string("Báo giá mẫu"))
        XCTAssertEqual(try ws.value("B1"), .number(255000))
        // Lưu không sửa: giữ nguyên byte, giá trị lạ trong styles không bị "chỉnh".
        try RoundTrip.assertNoOpSaveIsLossless(original, saved: try Workbook(data: original).save(), name: "office-quirks-noop.xlsx")
        // Sửa 1 ô rồi lưu: styles vẫn còn nguyên family=34, charset=163, tint.
        try ws.setValue(300000, at: "B1")
        let saved = try wb.save()
        XCTAssertEqual(try Workbook(data: saved).worksheet(at: 0).value("B1"), .number(300000))
        let styles = try RoundTrip.partString(saved, "xl/styles.xml")
        XCTAssertTrue(styles.contains("<family val=\"34\"/>"), "giá trị family lạ của Office phải giữ nguyên")
        XCTAssertTrue(styles.contains("<charset val=\"163\"/>"))
        XCTAssertTrue(styles.contains("tint=\"-0.249977111117893\""))
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["xl/worksheets/sheet1.xml", "xl/workbook.xml"],
                             requireChanged: ["xl/worksheets/sheet1.xml"], name: "office-quirks-edited.xlsx")
    }
}
