import XCTest
@testable import OOXMLSpreadsheet
import OOXMLPackage
import OOXMLTestSupport

/// `SheetPatcher`: ghi giá trị ô bằng cách vá byte của sheet, không dựng DOM cả sheet.
/// Yêu cầu cốt lõi: với cùng một loạt sửa, XML của sheet phải GIỐNG đường DOM (`Worksheet.setValue`)
/// về cấu trúc, và mọi hàng không bị đụng giữ nguyên từng byte.
final class SheetPatcherTests: XCTestCase {
    static let fixtures = SheetRowReaderTests.fixtures

    /// So hai cây XML: tên, thuộc tính (đúng thứ tự), nút con (đúng thứ tự, kể cả text).
    private func assertSameTree(_ a: XElement, _ b: XElement, _ context: String, path: String = "") {
        let here = path + "/" + a.name
        XCTAssertEqual(a.name, b.name, "\(context) \(here): tên phần tử")
        XCTAssertEqual(a.attributes.map { "\($0.name)=\($0.value)" }, b.attributes.map { "\($0.name)=\($0.value)" },
                       "\(context) \(here): thuộc tính")
        guard a.children.count == b.children.count else {
            XCTFail("\(context) \(here): số nút con \(a.children.count) ≠ \(b.children.count)")
            return
        }
        for (x, y) in zip(a.children, b.children) {
            switch (x, y) {
            case (.element(let ex), .element(let ey)): assertSameTree(ex, ey, context, path: here)
            case (.text(let tx), .text(let ty)): XCTAssertEqual(tx, ty, "\(context) \(here): text")
            default:
                if x.element == nil, y.element == nil { continue }
                XCTFail("\(context) \(here): loại nút khác nhau")
            }
        }
    }

    private struct Plan {
        var edits: [(CellReference, CellValue)] = []
    }

    /// Loạt sửa phủ: ghi đè ô có sẵn, ô mới trong hàng có sẵn, hàng mới chen giữa, hàng mới ở cuối.
    private func plan(for cells: [Cell]) -> Plan {
        var plan = Plan()
        let plain = cells.filter { $0.formula == nil }
        let maxRow = cells.map(\.reference.row).max() ?? 0
        let maxCol = cells.map(\.reference.column).max() ?? 0
        let values: [CellValue] = [.number(42.5), .string("vá ô — tiếng Việt <&>"), .bool(true), .empty, .number(-7), .string("Mã")]
        for (i, c) in plain.prefix(6).enumerated() { plan.edits.append((c.reference, values[i % values.count])) }
        if let last = plain.last { plan.edits.append((last.reference, .string("ô cuối"))) }
        if let row = plain.first?.reference.row {
            plan.edits.append((CellReference(column: maxCol + 2, row: row), .number(1)))
            plan.edits.append((CellReference(column: maxCol + 1, row: row), .string("cột mới")))
        }
        let used = Set(cells.map(\.reference.row))
        if maxRow > 1, let gap = (1...maxRow).first(where: { !used.contains($0) }) {
            plan.edits.append((CellReference(column: 2, row: gap), .string("hàng chen giữa")))
        }
        plan.edits.append((CellReference(column: 1, row: maxRow + 2), .number(100)))
        plan.edits.append((CellReference(column: 3, row: maxRow + 2), .string("hàng mới")))
        plan.edits.append((CellReference(column: 2, row: maxRow + 5), .bool(false)))
        return plan
    }

    func testPatchedSheetMatchesDOMPathOnEveryFixture() throws {
        var supported = 0
        for path in Self.fixtures {
            let data = try Fixtures.data(path)
            let probe = try Workbook(data: data)
            for (index, info) in probe.sheets.enumerated() where info.kind == .worksheet {
                let context = "\(path) sheet \(info.name)"
                // Mỗi ô một giá trị (lần sau cùng thắng), áp theo thứ tự ô tăng dần ở CẢ hai đường để chỉ số
                // trong bảng chuỗi dùng chung trùng nhau.
                var unique: [CellReference: CellValue] = [:]
                for (ref, value) in plan(for: try probe.worksheet(at: index).cells).edits { unique[ref] = value }
                let edits = unique.keys.sorted().map { ($0, unique[$0]!) }

                // Đường vá (mở lười, không dựng DOM sheet).
                let patched = try Workbook(data: data, deferValidation: true, lazyModel: true)
                let patcher: SheetPatcher
                do {
                    patcher = try patched.patcher(forSheetAt: index)
                    for (ref, value) in edits { try patcher.setValue(value, at: ref) }
                    try patcher.commit()
                } catch let e as SheetPatchError {
                    guard case .unsupported = e else { throw e }
                    continue
                }
                supported += 1

                // Đường DOM với đúng loạt sửa đó.
                let dom = try Workbook(data: data)
                let ws = try dom.worksheet(at: index)
                for (ref, value) in edits { try ws.setValue(value, at: ref.a1) }

                let part = try XCTUnwrap(info.part)
                let a = try XDocument(data: try patched.package.data(of: part))
                let b = try XDocument(data: try dom.package.data(of: part))
                assertSameTree(a.root, b.root, context)

                // Lưu → mở lại: mọi ô của mọi sheet phải bằng nhau giữa hai đường.
                let reA = try Workbook(data: try patched.save())
                let reB = try Workbook(data: try dom.save())
                for (i, s) in reA.sheets.enumerated() where s.kind == .worksheet {
                    XCTAssertEqual(try reA.worksheet(at: i).cells, try reB.worksheet(at: i).cells, "\(context) → mở lại sheet \(s.name)")
                }
            }
        }
        XCTAssertGreaterThanOrEqual(supported, 8, "đường vá phải áp được cho phần lớn sheet mẫu, không được rơi hết về DOM")
    }

    // MARK: Trường hợp dựng tay

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
        return try Workbook(data: try package.save(), deferValidation: true, lazyModel: true)
    }

    private let ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"

    private func sheet(_ body: String, head: String = "") -> String {
        "<?xml version=\"1.0\"?><worksheet xmlns=\"\(ns)\">\(head)<sheetData>\(body)</sheetData><pageMargins left=\"0.7\" right=\"0.7\" top=\"0.75\" bottom=\"0.75\" header=\"0.3\" footer=\"0.3\"/></worksheet>"
    }

    private func assertUnsupported(_ body: () throws -> Void, _ message: String, line: UInt = #line) {
        XCTAssertThrowsError(try body(), message, line: line) { error in
            guard case SheetPatchError.unsupported = error else { return XCTFail("\(message): lỗi \(error)", line: line) }
        }
    }

    func testUntouchedRowsStayByteIdenticalAndDimensionIsCreated() throws {
        let untouched1 = "<row r=\"1\"  spans=\"1:2\"><c r=\"A1\"   s=\"0\"><v>1</v></c><c r=\"B1\"><v>2</v></c></row>"
        let untouched3 = "<row r=\"3\"><c r=\"A3\" t=\"inlineStr\"><is><t xml:space=\"preserve\"> giữ nguyên </t></is></c></row>"
        let wb = try workbook(sheetXML: sheet(untouched1 + "\n  <row r=\"2\"><c r=\"A2\"><v>5</v></c></row>\n  " + untouched3))
        let patcher = try wb.patcher(forSheetAt: 0)
        try patcher.setValue(.number(9), at: "A2")
        try patcher.setValue(.string("xa"), at: "D7")
        try patcher.commit()
        let part = PartName("/xl/worksheets/sheet1.xml")
        let text = String(decoding: try wb.package.data(of: part), as: UTF8.self)
        XCTAssertTrue(text.contains(untouched1), "hàng 1 không bị đụng phải giữ nguyên byte")
        XCTAssertTrue(text.contains(untouched3), "hàng 3 không bị đụng phải giữ nguyên byte")
        XCTAssertTrue(text.contains("<dimension ref=\"A2:D7\"/>"), "phải tạo dimension như đường DOM: \(text.prefix(200))")
        XCTAssertFalse(wb.package.isXMLLoaded(part), "đường vá không được dựng DOM của sheet trong gói")
        let reopened = try Workbook(data: try wb.save())
        let ws = try reopened.worksheet(at: 0)
        XCTAssertEqual(try ws.value("A2"), .number(9))
        XCTAssertEqual(try ws.value("D7"), .string("xa"))
        XCTAssertEqual(try ws.value("A3"), .string(" giữ nguyên "))
    }

    func testExistingDimensionInsideRangeKeepsHeadBytes() throws {
        let head = "<sheetPr><tabColor rgb=\"FF00FF00\"/></sheetPr><dimension ref=\"A1:C9\"/><sheetViews><sheetView  workbookViewId=\"0\"/></sheetViews>"
        let wb = try workbook(sheetXML: sheet("<row r=\"1\"><c r=\"A1\"><v>1</v></c></row>", head: head))
        let patcher = try wb.patcher(forSheetAt: 0)
        try patcher.setValue(.number(2), at: "B2")
        try patcher.commit()
        let text = String(decoding: try wb.package.data(of: PartName("/xl/worksheets/sheet1.xml")), as: UTF8.self)
        XCTAssertTrue(text.contains(head), "ô nằm trong dimension cũ thì phần đầu sheet giữ nguyên byte")
    }

    func testUnsupportedCasesLeavePackageUntouched() throws {
        let part = PartName("/xl/worksheets/sheet1.xml")
        // Ô đang có công thức.
        var wb = try workbook(sheetXML: sheet("<row r=\"1\"><c r=\"A1\"><f>1+1</f><v>2</v></c><c r=\"B1\"><v>3</v></c></row>"))
        var before = try wb.package.data(of: part)
        var patcher = try wb.patcher(forSheetAt: 0)
        try patcher.setValue(.number(5), at: "B1")
        try patcher.setValue(.number(5), at: "A1")
        assertUnsupported({ try patcher.commit() }, "ô có công thức")
        XCTAssertEqual(try wb.package.data(of: part), before, "từ chối thì byte sheet không đổi")
        // Công thức mảng ở bất kỳ đâu trong sheet.
        wb = try workbook(sheetXML: sheet("<row r=\"1\"><c r=\"A1\"><f t=\"array\" ref=\"A1:A2\">B1:B2*2</f><v>2</v></c></row>"))
        assertUnsupported({ _ = try wb.patcher(forSheetAt: 0) }, "công thức mảng")
        // Số hàng ngầm định.
        wb = try workbook(sheetXML: sheet("<row><c r=\"A1\"><v>1</v></c></row>"))
        assertUnsupported({ _ = try wb.patcher(forSheetAt: 0) }, "hàng ngầm định")
        // Ô không ghi địa chỉ trong hàng bị sửa.
        wb = try workbook(sheetXML: sheet("<row r=\"1\"><c><v>1</v></c></row><row r=\"2\"><c r=\"A2\"><v>1</v></c></row>"))
        before = try wb.package.data(of: part)
        patcher = try wb.patcher(forSheetAt: 0)
        try patcher.setValue(.number(5), at: "C1")
        assertUnsupported({ try patcher.commit() }, "ô ngầm định")
        XCTAssertEqual(try wb.package.data(of: part), before)
        // sheetData tự đóng.
        wb = try workbook(sheetXML: "<?xml version=\"1.0\"?><worksheet xmlns=\"\(ns)\"><sheetData/></worksheet>")
        assertUnsupported({ _ = try wb.patcher(forSheetAt: 0) }, "sheetData tự đóng")
        // Sheet đang mở bằng đường DOM.
        wb = try workbook(sheetXML: sheet("<row r=\"1\"><c r=\"A1\"><v>1</v></c></row>"))
        let ws = try wb.worksheet(at: 0)
        assertUnsupported({ _ = try wb.patcher(forSheetAt: 0) }, "sheet đang ở dạng DOM")
        _ = ws
    }

    func testEmptySheetDataAppendsRowsAndGuardsReuse() throws {
        let wb = try workbook(sheetXML: sheet(""))
        let patcher = try wb.patcher(forSheetAt: 0)
        try patcher.setValue(.string("b"), at: "B3")
        try patcher.setValue(.string("a"), at: "A1")
        try patcher.setValue(.string("ghi đè"), at: "A1")
        XCTAssertThrowsError(try patcher.setValue(.string(String(repeating: "x", count: 32_768)), at: "A2"))
        try patcher.commit()
        XCTAssertThrowsError(try patcher.commit()) { XCTAssertEqual($0 as? SheetPatchError, .alreadyCommitted) }
        XCTAssertThrowsError(try patcher.setValue(.number(1), at: "A9"))
        let reopened = try Workbook(data: try wb.save())
        XCTAssertEqual(try reopened.worksheet(at: 0).cells.map { "\($0.reference.a1)=\($0.value)" },
                       ["A1=string(\"ghi đè\")", "B3=string(\"b\")"])
        // Vá lần hai trên cùng sổ (bộ vá mới đọc byte đã vá).
        let again = try wb.patcher(forSheetAt: 0)
        try again.setValue(.number(7), at: "A2")
        try again.commit()
        XCTAssertEqual(try Workbook(data: try wb.save()).worksheet(at: 0).cells.map(\.reference.a1), ["A1", "A2", "B3"])
    }
}
