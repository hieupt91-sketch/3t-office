import XCTest
@testable import OOXMLSpreadsheet
import OOXMLPackage

/// Gói M2b giai đoạn A (issue #10): `LazySharedStrings` — chỉ mục offset
/// quét 1 lượt byte thô, giải mã lười, thêm chuỗi vào đuôi, ghi ra bằng
/// byte gốc + `<si>` mới.
final class LazyModelTests: XCTestCase {

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
}
