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

    /// Đường nhanh của tra cứu (`fastText`) chỉ được nhận mục mà kết quả TRÙNG với giải mã đầy đủ.
    func testFastTextAgreesWithFullDecode() throws {
        let entries = [
            plain("thuần ASCII plain"), plain("Tiếng Việt có dấu"), plain("a &amp; b"), plain("A_x0009_B"),
            "<si><t xml:space=\"preserve\">giữ</t></si>", "<si><t xml:space=\"preserve\">  hai đầu  </t></si>",
            plain(" đầu trắng"), plain("dòng\nmới"), plain("tab\tgiữa"), "<si/>", "<si><t/></si>", "<si><t></t></si>",
            "<si><r><rPr><b/></rPr><t>Đậm</t></r><r><t> thường</t></r></si>", plain("a_xb"), plain("gạch_dưới"),
            "<si><t>phiên âm</t><rPh sb=\"0\" eb=\"1\"><t>x</t></rPh></si>", plain("cuối"),
        ]
        let lazy = try LazySharedStrings(data: makeSST(count: entries.count, unique: entries.count, entries: entries))
        var fastCount = 0
        for i in 0..<entries.count {
            guard let fast = lazy.fastText(i) else { continue }
            fastCount += 1
            XCTAssertEqual(fast, lazy[i], "mục \(i): \(entries[i])")
        }
        XCTAssertGreaterThanOrEqual(fastCount, 5, "các mục thuần phải đi được đường nhanh")
        for path in ["xlsx/rich-excel.xlsx", "real/sample-sheet.xlsx", "real/ton-kho-3t.xlsx", "real/sample-sheet-formulas.xlsx"] {
            let pkg = try OPCPackage(data: try Fixtures.data(path))
            guard let part = pkg.partNames.first(where: { $0.description.hasSuffix("sharedStrings.xml") }) else { continue }
            let table = try LazySharedStrings(data: try pkg.data(of: part))
            for i in 0..<table.entryCount {
                if let fast = table.fastText(i) { XCTAssertEqual(fast, table[i], "\(path) mục \(i)") }
            }
        }
    }

    /// Tra cứu qua chỉ mục băm: trả mục ĐẦU TIÊN bằng văn bản (kể cả mục rich/có escape), chuỗi mới thì thêm.
    func testIndexForUsesFirstMatchAndAppendsUnknown() throws {
        var entries: [String] = []
        for i in 0..<500 { entries.append(plain("Mục \(i)")) }
        entries[7] = plain("a &amp; b")
        entries[9] = "<si><r><t>ghép</t></r><r><t> đôi</t></r></si>"
        entries[300] = plain("Mục 3")           // lặp: phải trả 3, không phải 300
        entries[400] = plain("a &amp; b")       // lặp của mục có escape: phải trả 7
        let lazy = try LazySharedStrings(data: makeSST(count: 500, unique: 500, entries: entries))
        XCTAssertEqual(lazy.index(for: "Mục 3"), 3)
        XCTAssertEqual(lazy.index(for: "a & b"), 7)
        XCTAssertEqual(lazy.index(for: "ghép đôi"), 9)
        XCTAssertEqual(lazy.index(for: "Mục 499"), 499)
        XCTAssertEqual(lazy.index(for: "chưa có"), 500)
        XCTAssertEqual(lazy.index(for: "chưa có"), 500)
        XCTAssertEqual(lazy.index(for: "chưa có 2"), 501)
        // Dạng tổ hợp Unicode khác nhau nhưng bằng nhau theo String ==.
        XCTAssertEqual(lazy.index(for: "Mu\u{0323}c 10".precomposedStringWithCanonicalMapping), lazy.index(for: "Mục 10"))
        XCTAssertEqual(lazy.uniqueCount, 502)
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
}
