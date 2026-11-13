import XCTest
@testable import OOXMLSpreadsheet
import OOXMLPackage
import OOXMLTestSupport

/// Gói M2b giai đoạn A (issue #10): `LazySharedStrings` — chỉ mục offset
/// quét 1 lượt byte thô, giải mã lười, thêm chuỗi vào đuôi, ghi ra bằng
/// byte gốc + `<si>` mới.
/// Giai đoạn A2: nối bảng lười vào `Workbook` theo đường opt-in
/// (`lazyModel: true`), giữ eager mặc định.
final class LazyModelTests: XCTestCase {
    let rich = "xlsx/rich-excel.xlsx"

    /// Dựng part sharedStrings tổng hợp: `count`/`uniqueCount` cho trước,
    /// các `<si>` cho trước (chuỗi XML thô).
    private func makeSST(count: Int, unique: Int, entries: [String]) -> Data {
        var xml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n"
        xml += "<sst xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\""
        xml += " count=\"\(count)\" uniqueCount=\"\(unique)\">"
        for e in entries { xml += e }
        xml += "</sst>"
        return Data(xml.utf8)
    }

    private func plain(_ t: String) -> String { "<si><t>\(t)</t></si>" }

    func testOffsetIndexFindsFirstMiddleLast() throws {
        var entries: [String] = []
        for i in 0..<1000 { entries.append(plain("Chuỗi \(i)")) }
        entries[0] = "<si><t>Đầu tiên</t></si>"
        entries[500] = "<si><r><rPr><b/></rPr><t>Đậm</t></r><r><t> thường</t></r></si>"
        entries[999] = "<si><t xml:space=\"preserve\">  khoảng trắng  </t></si>"
        entries[42] = "<si><t>A_x0009_B</t></si>"
        entries[7] = "<si/>"
        let data = makeSST(count: 5000, unique: 1000, entries: entries)
        let lazy = try LazySharedStrings(data: data)

        XCTAssertEqual(lazy.entryCount, 1000)
        XCTAssertEqual(lazy.count, 5000)
        XCTAssertEqual(lazy.uniqueCount, 1000)
        XCTAssertEqual(lazy[0], "Đầu tiên")
        XCTAssertEqual(lazy[500], "Đậm thường")
        XCTAssertTrue(lazy.isRichText(500))
        XCTAssertFalse(lazy.isRichText(0))
        XCTAssertEqual(lazy[999], "  khoảng trắng  ")
        XCTAssertEqual(lazy[42], "A\tB")
        XCTAssertEqual(lazy[7], "")
        XCTAssertEqual(lazy[123], "Chuỗi 123")
        XCTAssertNil(lazy[1000])
        XCTAssertNil(lazy[-1])
    }

    func testInitDoesNotDecodeUntilAccessed() throws {
        var entries: [String] = []
        for i in 0..<200 { entries.append(plain("Mục \(i)")) }
        let lazy = try LazySharedStrings(data: makeSST(count: 200, unique: 200, entries: entries))
        XCTAssertEqual(lazy.decodedCount, 0, "khởi tạo không được giải mã chuỗi nào")
        XCTAssertEqual(lazy[10], "Mục 10")
        XCTAssertEqual(lazy[150], "Mục 150")
        XCTAssertEqual(lazy.decodedCount, 2)
        XCTAssertEqual(lazy[10], "Mục 10", "lần 2 phải lấy từ cache")
        XCTAssertEqual(lazy.decodedCount, 2, "cache hit không giải mã lại")
    }

    func testIndexForReusesExistingWithoutFullScanTwice() throws {
        var entries: [String] = []
        for i in 0..<1000 { entries.append(plain("Giá trị \(i)")) }
        let lazy = try LazySharedStrings(data: makeSST(count: 1000, unique: 1000, entries: entries))
        XCTAssertEqual(lazy.index(for: "Giá trị 500"), 500)
        let decodedAfterFirst = lazy.decodedCount
        XCTAssertEqual(lazy.index(for: "Giá trị 500"), 500, "lần 2 phải tra O(1)")
        XCTAssertEqual(lazy.decodedCount, decodedAfterFirst, "không quét lại")
        XCTAssertEqual(lazy.count, 1002, "count tăng 1 mỗi lần gọi, kể cả dùng lại")
    }

    func testIndexForAppendsNewAndDuplicate() throws {
        let lazy = try LazySharedStrings(data: makeSST(count: 3, unique: 3, entries: [
            plain("Một"), plain("Hai"), plain("Ba"),
        ]))
        XCTAssertEqual(lazy.index(for: "Bốn"), 3)
        XCTAssertEqual(lazy.index(for: "Bốn"), 3, "trùng thì dùng lại chỉ số đã thêm")
        XCTAssertEqual(lazy.index(for: "Năm & <sáu>"), 4, "ký tự XML phải escape khi ghi")
        XCTAssertEqual(lazy[3], "Bốn")
        XCTAssertEqual(lazy[4], "Năm & <sáu>")
        XCTAssertEqual(lazy.uniqueCount, 5)
        XCTAssertEqual(lazy.count, 6, "3 gốc + 3 lần gọi index(for:)")
    }

    func testSerializedDataByteIdenticalWhenUnchanged() throws {
        var entries: [String] = []
        for i in 0..<50 { entries.append(plain("Giữ nguyên \(i)")) }
        let original = makeSST(count: 120, unique: 50, entries: entries)
        let lazy = try LazySharedStrings(data: original)
        _ = lazy[0]
        _ = lazy[49]
        XCTAssertEqual(lazy.serializedData(), original,
                       "chưa thêm chuỗi thì byte ra phải giống hệt byte vào")
    }

    func testSerializedDataPatchesCountsAndAppendsTail() throws {
        let lazy = try LazySharedStrings(data: makeSST(count: 10, unique: 2, entries: [
            plain("Một"), plain("Hai"),
        ]))
        XCTAssertEqual(lazy.index(for: "Ba"), 2)
        XCTAssertEqual(lazy.index(for: "Một"), 0, "dùng lại chuỗi gốc, không thêm đuôi")
        let out = lazy.serializedData()
        let doc = try XDocument(data: out)
        XCTAssertEqual(doc.root.attribute("count"), "12")
        XCTAssertEqual(doc.root.attribute("uniqueCount"), "3")
        let sis = doc.root.children(NS.s, "si")
        XCTAssertEqual(sis.count, 3)
        XCTAssertEqual(SharedStrings.text(of: sis[0]), "Một")
        XCTAssertEqual(SharedStrings.text(of: sis[1]), "Hai")
        XCTAssertEqual(SharedStrings.text(of: sis[2]), "Ba")
        // Mở lại bằng LazySharedStrings: đọc được cả chuỗi gốc lẫn chuỗi thêm.
        let reopened = try LazySharedStrings(data: out)
        XCTAssertEqual(reopened.entryCount, 3)
        XCTAssertEqual(reopened[2], "Ba")
        XCTAssertEqual(reopened.index(for: "Ba"), 2)
    }

    func testEmptySST() throws {
        let lazy = try LazySharedStrings(data: makeSST(count: 0, unique: 0, entries: []))
        XCTAssertEqual(lazy.entryCount, 0)
        XCTAssertEqual(lazy.count, 0)
        XCTAssertNil(lazy[0])
        XCTAssertEqual(lazy.index(for: "Đầu"), 0)
        XCTAssertEqual(lazy[0], "Đầu")
        let reopened = try LazySharedStrings(data: lazy.serializedData())
        XCTAssertEqual(reopened[0], "Đầu")
        XCTAssertEqual(reopened.uniqueCount, 1)
    }

    func testLargeSSTScanTime() throws {
        // Cỡ fixture 100k dòng: 300.000 mục sharedStrings.
        var xml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n"
        xml += "<sst xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\""
        xml += " count=\"300000\" uniqueCount=\"300000\">"
        xml.reserveCapacity(9_000_000)
        for i in 0..<300_000 { xml += "<si><t>Chuỗi \(i)</t></si>" }
        xml += "</sst>"
        let data = Data(xml.utf8)
        print("M2b-A1 fixture: \(data.count) byte, 300.000 mục")

        let t0 = Date()
        let lazy = try LazySharedStrings(data: data)
        let scanSeconds = Date().timeIntervalSince(t0)
        print("M2b-A1 quét chỉ mục 300.000 mục: \(String(format: "%.3f", scanSeconds)) s")
        XCTAssertEqual(lazy.entryCount, 300_000)
        XCTAssertEqual(lazy.decodedCount, 0)
        XCTAssertLessThan(scanSeconds, 5.0, "quét 1 lượt byte thô phải nhanh")
        XCTAssertEqual(lazy[0], "Chuỗi 0")
        XCTAssertEqual(lazy[150_000], "Chuỗi 150000")
        XCTAssertEqual(lazy[299_999], "Chuỗi 299999")

        let t1 = Date()
        let idx = lazy.index(for: "Chuỗi hoàn toàn mới")
        let missSeconds = Date().timeIntervalSince(t1)
        print("M2b-A1 index(for:) trượt (quét tuyến tính 300.000 mục): "
            + "\(String(format: "%.3f", missSeconds)) s")
        XCTAssertEqual(idx, 300_000)
    }

    // MARK: - A2: nối vào Workbook (opt-in `lazyModel: true`)

    func testLazyWorkbookReadsSharedStringsWithoutEagerTable() throws {
        let original = try Fixtures.data(rich)
        let wb = try Workbook(data: original, deferValidation: true, lazyModel: true)
        XCTAssertTrue(wb.isLazyModel)
        XCTAssertNil(wb.sharedStrings, "đường lười không được dựng bảng eager")
        XCTAssertNotNil(wb.lazySharedStrings)
        XCTAssertEqual(wb.lazySharedStrings?.decodedCount, 0, "mở lười không giải mã chuỗi nào")
        let ws = try wb.worksheet(named: "Dữ liệu")
        XCTAssertEqual(try ws.value("A1"), .string("Mã"))
        XCTAssertEqual(wb.lazySharedStrings?.decodedCount, 1)
        XCTAssertEqual(try ws.value("A1"), .string("Mã"), "đọc lại lấy từ cache")
        XCTAssertEqual(wb.lazySharedStrings?.decodedCount, 1, "cache hit không giải mã lại")
        XCTAssertEqual(try ws.value("B2"), .string("Giấy A4 Double A"))
        XCTAssertEqual(wb.lazySharedStrings?.decodedCount, 2)
        XCTAssertEqual(try ws.cell("A8")?.isRichText, true)
        XCTAssertEqual(try ws.value("A8"), .string("Chú ý: số liệu tạm tính"))
        XCTAssertEqual(try ws.value("D7"), .string("Chuỗi nội tuyến"), "inlineStr không qua bảng chia sẻ")
        XCTAssertEqual(wb.lazySharedStrings?.decodedCount, 3, "chỉ 3 chuỗi được chạm tới mới giải mã")
    }

    func testLazyWorkbookEditStringSaveReopen() throws {
        let original = try Fixtures.data(rich)
        let url = try Fixtures.scratchDirectory("xlsx-lazy-edit").appendingPathComponent("rich-lazy-edited.xlsx")
        do {
            let wb = try Workbook(data: original, deferValidation: true, lazyModel: true)
            let ws = try wb.worksheet(named: "Dữ liệu")
            try ws.setValue("Bút bi Thiên Long (hộp 20)", at: "B3")
            try ws.setValue("Giấy A4 Double A", at: "B4") // dùng lại chuỗi đã có
            try ws.setValue("  khoảng trắng  ", at: "F2")
            try wb.save(to: url)
        }
        // "Đóng" = giải phóng toàn bộ đối tượng; mở lại từ đĩa bằng đường eager.
        let wb = try Workbook(contentsOf: url)
        let ws = try wb.worksheet(named: "Dữ liệu")
        XCTAssertEqual(try ws.value("B3"), .string("Bút bi Thiên Long (hộp 20)"))
        XCTAssertEqual(try ws.value("B4"), .string("Giấy A4 Double A"))
        XCTAssertEqual(try ws.value("F2"), .string("  khoảng trắng  "))
        XCTAssertEqual(try ws.value("A8"), .string("Chú ý: số liệu tạm tính"), "rich text còn")
        XCTAssertEqual(try ws.value("A1"), .string("Mã"), "chuỗi gốc còn nguyên")

        let saved = try Data(contentsOf: url)
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["xl/worksheets/sheet1.xml", "xl/sharedStrings.xml", "xl/workbook.xml"],
                             requireChanged: ["xl/worksheets/sheet1.xml", "xl/sharedStrings.xml"],
                             name: "xlsx-lazy-values.xlsx")
        let sst = try RoundTrip.partString(saved, "xl/sharedStrings.xml")
        XCTAssertTrue(sst.contains("<t xml:space=\"preserve\">  khoảng trắng  </t>"))
        XCTAssertTrue(sst.contains("<color rgb=\"FFC00000\"/>"), "định dạng rich text giữ nguyên")
    }

    func testLazyWorkbookNoOpSaveIsLossless() throws {
        let original = try Fixtures.data(rich)
        let wb = try Workbook(data: original, deferValidation: true, lazyModel: true)
        // Chạm vài ô (chỉ đọc) rồi lưu không sửa: không phần nào được đổi.
        let ws = try wb.worksheet(named: "Dữ liệu")
        XCTAssertEqual(try ws.value("A1"), .string("Mã"))
        XCTAssertFalse(wb.lazySharedStrings?.hasUnwrittenChanges ?? true, "chỉ đọc không được làm bẩn bảng lười")
        let saved = try wb.save()
        try RoundTrip.assertNoOpSaveIsLossless(original, saved: saved, name: "m2b-a2-lazy-noop.xlsx")
    }

    func testLazyWorkbookWithoutSSTCreatesOnDemand() throws {
        // Fixture không có phần sharedStrings và không ô nào dùng t="s":
        // mở lười, ghi chuỗi mới phải tự tạo part sst.
        let original = try Fixtures.data("xlsx/implicit-refs.xlsx")
        let wb = try Workbook(data: original, deferValidation: true, lazyModel: true)
        XCTAssertTrue(wb.isLazyModel)
        XCTAssertNil(wb.sharedStrings)
        XCTAssertNil(wb.lazySharedStrings, "chưa có part sst thì chưa dựng bảng")
        let ws = try wb.worksheet(at: 0)
        XCTAssertEqual(try ws.value("A1"), .number(1))
        try ws.setValue("Chuỗi mới hoàn toàn", at: "D1")
        XCTAssertNotNil(wb.lazySharedStrings, "ghi chuỗi mới tạo bảng lười")
        let saved = try wb.save()
        let re = try Workbook(data: saved)
        let ws2 = try re.worksheet(at: 0)
        XCTAssertEqual(try ws2.value("D1"), .string("Chuỗi mới hoàn toàn"))
        XCTAssertEqual(try ws2.value("A1"), .number(1), "ô số gốc còn nguyên")
        XCTAssertEqual(try ws2.value("C1"), .string("ba"), "inlineStr còn nguyên")
        let sst = try RoundTrip.partString(saved, "xl/sharedStrings.xml")
        XCTAssertTrue(sst.contains("Chuỗi mới hoàn toàn"))
    }

    // MARK: - B1: chỉ mục offset hàng (`RowOffsetIndex`, kế hoạch §4.2)

    private func makeSheet(rowsXML: String) -> Data {
        var xml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
        xml += "<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\">"
        xml += "<dimension ref=\"A1:F10\"/><sheetViews><sheetView workbookViewId=\"0\"/></sheetViews>"
        xml += "<sheetData>\(rowsXML)</sheetData><mergeCells count=\"1\"><mergeCell ref=\"A1:B1\"/></mergeCells>"
        xml += "</worksheet>"
        return Data(xml.utf8)
    }

    /// Parse một lát `<row>` bằng bọc tối thiểu (mẫu lát sau sẽ dùng để
    /// materialize cửa sổ hàng): bọc lát trong `<worksheet><sheetData>`.
    /// Giữ `XDocument` đã parse trong `parsedDocs`: `parent` của `XElement`
    /// là `weak` nên chỉ giữ `XElement` mà thả `XDocument` thì cây cha bị
    /// giải phóng, `parent = nil` và `namespaceURI` mất (đã gặp khi test).
    private var parsedDocs: [XDocument] = []
    private func parseRowSlice(_ slice: Data) throws -> XElement {
        let wrapped = Data("<worksheet xmlns=\"\(NS.s.primaryURI)\"><sheetData>".utf8)
            + slice + Data("</sheetData></worksheet>".utf8)
        let doc = try XDocument(data: wrapped)
        let row = try XCTUnwrap(doc.root.firstChild(NS.s, "sheetData")?.firstChild(NS.s, "row"))
        parsedDocs.append(doc)
        return row
    }

    func testRowOffsetIndexFindsRowsGapsAndImplicit() throws {
        let data = makeSheet(rowsXML:
            "<row r=\"1\" ht=\"15\"><c r=\"A1\"><v>1</v></c></row>"
            + "<row r=\"3\"><c r=\"B3\" t=\"s\"><v>0</v></c></row>"
            + "<row r=\"4\"/>"
            + "<row><c r=\"A5\"><v>5</v></c></row>"
            + "<row r=\"10\" customFormat=\"1\"><c r=\"A10\"><v>10</v></c></row>")
        let idx = try RowOffsetIndex(data: data)
        XCTAssertEqual(idx.rowCount, 5)
        XCTAssertEqual(idx.rowNumbers, [1, 3, 4, 5, 10], "hàng thiếu r được đánh số ẩn nối tiếp (sau r=4 là 5)")
        XCTAssertEqual(idx.maxRowNumber, 10)
        XCTAssertNil(idx.entry(forRow: 2), "hàng trống không có trong part")
        XCTAssertFalse(idx.contains(row: 2))
        XCTAssertTrue(idx.contains(row: 3))

        // Lát hàng 1: đúng từ `<row` tới hết `</row>`, parse lại được.
        let slice1 = try XCTUnwrap(idx.rowXML(forRow: 1))
        XCTAssertTrue(slice1.starts(with: Data("<row r=\"1\"".utf8)))
        XCTAssertEqual(slice1.suffix(6), Data("</row>".utf8))
        let row1 = try parseRowSlice(slice1)
        XCTAssertEqual(row1.attribute("r"), "1")
        XCTAssertEqual(row1.attribute("ht"), "15")
        XCTAssertEqual(row1.firstChild(NS.s, "c")?.firstChild(NS.s, "v")?.textContent, "1")

        // Hàng rỗng tự đóng: lát đúng `<row r="4"/>`.
        XCTAssertEqual(idx.rowXML(forRow: 4), Data("<row r=\"4\"/>".utf8))
        // Hàng ẩn: lát XML không có r, nhưng chỉ mục biết nó là hàng 5.
        let row5 = try parseRowSlice(try XCTUnwrap(idx.rowXML(forRow: 5)))
        XCTAssertNil(row5.attribute("r"))
        XCTAssertEqual(row5.firstChild(NS.s, "c")?.firstChild(NS.s, "v")?.textContent, "5")
        // Hàng 10 giữ thuộc tính lạ.
        let row10 = try parseRowSlice(try XCTUnwrap(idx.rowXML(forRow: 10)))
        XCTAssertEqual(row10.attribute("customFormat"), "1")

        // Biên sheetData: nội dung bắt đầu đúng ở hàng 1, kết thúc ở hàng 10.
        let bytes = [UInt8](data)
        XCTAssertEqual(Data(bytes[idx.sheetDataContentStart..<idx.sheetDataContentStart + 10]),
                       Data("<row r=\"1\"".utf8))
        XCTAssertEqual(Data(bytes[idx.sheetDataContentEnd - 6..<idx.sheetDataContentEnd]),
                       Data("</row>".utf8))
    }

    func testRowOffsetIndexEmptySheet() throws {
        let empty1 = Data("<?xml version=\"1.0\"?><worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><sheetData/></worksheet>".utf8)
        let idx1 = try RowOffsetIndex(data: empty1)
        XCTAssertEqual(idx1.rowCount, 0)
        XCTAssertEqual(idx1.maxRowNumber, 0)
        XCTAssertNil(idx1.rowXML(forRow: 1))

        let empty2 = Data("<?xml version=\"1.0\"?><worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><sheetData></sheetData></worksheet>".utf8)
        XCTAssertEqual(try RowOffsetIndex(data: empty2).rowCount, 0)
    }

    func testRowOffsetIndexMissingSheetDataThrows() throws {
        let noSD = Data("<?xml version=\"1.0\"?><worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><dimension ref=\"A1\"/></worksheet>".utf8)
        XCTAssertThrowsError(try RowOffsetIndex(data: noSD)) { error in
            XCTAssertEqual(error as? RowOffsetIndex.InitError, .missingSheetData)
        }
        let unterminated = Data("<?xml version=\"1.0\"?><worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><sheetData><row r=\"1\"><c r=\"A1\"><v>1</v></c></sheetData></worksheet>".utf8)
        XCTAssertThrowsError(try RowOffsetIndex(data: unterminated)) { error in
            XCTAssertEqual(error as? RowOffsetIndex.InitError, .unterminatedRow)
        }
    }

    func testRowOffsetIndexLargeScanTime() throws {
        // Cỡ fixture 100k dòng: 100.000 hàng × 6 ô (như l8-bench/big.xlsx).
        var xml = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>"
        xml += "<worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><sheetData>"
        xml.reserveCapacity(22_000_000)
        for r in 1...100_000 {
            xml += "<row r=\"\(r)\"><c r=\"A\(r)\" t=\"s\"><v>\(r - 1)</v></c>"
            xml += "<c r=\"B\(r)\"><v>\(r)</v></c><c r=\"C\(r)\" t=\"s\"><v>\(r)</v></c>"
            xml += "<c r=\"D\(r)\"><v>\(r)</v></c><c r=\"E\(r)\" t=\"s\"><v>\(r)</v></c>"
            xml += "<c r=\"F\(r)\"><v>\(r)</v></c></row>"
        }
        xml += "</sheetData></worksheet>"
        let data = Data(xml.utf8)
        print("M2b-B1 fixture: \(data.count) byte, 100.000 hàng")

        let t0 = Date()
        let idx = try RowOffsetIndex(data: data)
        let scanSeconds = Date().timeIntervalSince(t0)
        print("M2b-B1 quét chỉ mục 100.000 hàng: \(String(format: "%.3f", scanSeconds)) s")
        XCTAssertEqual(idx.rowCount, 100_000)
        XCTAssertEqual(idx.maxRowNumber, 100_000)
        XCTAssertLessThan(scanSeconds, 5.0, "quét 1 lượt byte thô phải nhanh")
        // Spot-check đầu/giữa/cuối bằng lát XML thô.
        XCTAssertTrue(try XCTUnwrap(idx.rowXML(forRow: 1)).starts(with: Data("<row r=\"1\">".utf8)))
        XCTAssertTrue(try XCTUnwrap(idx.rowXML(forRow: 50_000)).starts(with: Data("<row r=\"50000\">".utf8)))
        let last = try parseRowSlice(try XCTUnwrap(idx.rowXML(forRow: 100_000)))
        XCTAssertEqual(last.attribute("r"), "100000")
        XCTAssertEqual(last.children(NS.s, "c").count, 6)
        XCTAssertNil(idx.rowXML(forRow: 100_001))
    }
}
