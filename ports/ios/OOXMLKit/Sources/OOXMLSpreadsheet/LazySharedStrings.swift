import Foundation
import OOXMLPackage

/// M2b giai đoạn A (issue #10, kế hoạch `docs/ios/M2B-PLAN-0611.md` §4.1):
/// bảng chuỗi chia sẻ lười — lúc mở chỉ quét 1 lượt byte thô của part
/// `xl/sharedStrings.xml` để dựng chỉ mục offset, không parse DOM `<sst>`,
/// không giữ toàn bộ chuỗi trong RAM.
///
/// - Mỗi mục là `(offset, length, rich)` ≈ 12 byte/mục (≈ 3,6 MB với
///   300.000 mục, thay cho ~160 MB của `SharedStrings` eager).
/// - Chuỗi chỉ được giải mã khi truy cập (`subscript` / `text(at:)`), qua
///   cache LRU trần 1.024 mục.
/// - `index(for:)` giữ ngữ nghĩa hiện tại (dùng lại nếu đã có, thêm mới ở
///   cuối). Tra cứu chuỗi chưa từng gặp quét tuyến tính toàn bộ `<sst>`
///   (xem kế hoạch §4.1 — chấp nhận khi số lần thêm ít; nếu đo bench thấy
///   sửa hàng loạt chậm hơn M2 quá 10% thì ghi thành rủi ro còn mở, không
///   lặng lẽ giữ lại bảng băm toàn bộ chuỗi).
/// - Chuỗi mới thêm vào **đuôi chờ** (`tail`); `serializedData()` ghi part
///   bằng byte thô gốc + các `<si>` mới, chỉ sửa 2 thuộc tính
///   `count`/`uniqueCount` trên thẻ mở `<sst>`.
///
/// Giả định (đúng với tệp Excel / LibreOffice / OOXMLKit ghi ra):
/// `<sst>` không có tiền tố namespace, `<si>` không có tiền tố, nội dung
/// `<t>` đã escape XML nên chuỗi byte `<si` không xuất hiện trong text.
public final class LazySharedStrings {

    public enum InitError: Error {
        case missingSST
        case unterminatedSI
    }

    /// Một mục `<si>` trong part gốc.
    public struct Entry {
        /// Byte bắt đầu của `<si` trong part gốc.
        public let offset: Int
        /// Độ dài byte từ `<si` tới hết `</si>` (hoặc `/>` với `<si/>`).
        public let length: Int
        /// Có chứa `<r>` (rich text) hay không — xác định lúc quét.
        public let rich: Bool
    }

    private let raw: [UInt8]
    private let sstStart: Int
    private let sstOpenEnd: Int
    private let sstCloseStart: Int
    private let namespaceURI: String
    private let entries: [Entry]
    private let baseCount: Int
    private let baseUnique: Int

    /// Số lần `index(for:)` đã gọi — `count` tăng 1 mỗi lần gọi, giống
    /// `SharedStrings.bumpCount()` (kể cả khi chuỗi đã có).
    private var bumpCalls = 0
    /// Chỉ số xa nhất mà lần quét tuyến tính của `index(for:)` đã đi qua.
    private var scanWatermark = 0
    /// Chuỗi đã biết → chỉ số đầu tiên của nó (đã quét qua hoặc đã thêm).
    private var seen: [String: Int] = [:]
    /// XML `<si>...</si>` của các chuỗi mới thêm (đuôi chờ).
    private var tailXML: [String] = []
    private var tailTexts: [String] = []

    /// Cache LRU các chuỗi đã giải mã qua `subscript` (trần 1.024 mục).
    private var cache: [Int: String] = [:]
    private var cacheOrder: [Int] = []
    private let cacheCap = 1_024

    /// Số mục đã giải mã (chỉ để test quan sát tính lười).
    var decodedCount = 0

    // MARK: - Khởi tạo (quét 1 lượt byte thô)

    public init(data: Data) throws {
        let bytes = [UInt8](data)
        self.raw = bytes
        guard let start = LazySharedStrings.find([0x3C, 0x73, 0x73, 0x74], in: bytes, from: 0,
                                                 boundaryAfter: true),
              let openEnd = LazySharedStrings.findByte(0x3E, in: bytes, from: start) else {
            throw InitError.missingSST
        }
        sstStart = start
        sstOpenEnd = openEnd
        guard let closeStart = LazySharedStrings.findLast(
            [0x3C, 0x2F, 0x73, 0x73, 0x74, 0x3E], in: bytes) else {
            throw InitError.missingSST
        }
        sstCloseStart = closeStart

        let tag = String(bytes: bytes[start...openEnd], encoding: .utf8) ?? ""
        namespaceURI = LazySharedStrings.attribute(tag, name: "xmlns")
            ?? NS.s.primaryURI
        let parsedCount = LazySharedStrings.attribute(tag, name: "count").flatMap(Int.init)
        let parsedUnique = LazySharedStrings.attribute(tag, name: "uniqueCount").flatMap(Int.init)

        var found: [Entry] = []
        var pos = openEnd + 1
        while pos < closeStart {
            guard let si = LazySharedStrings.find(
                [0x3C, 0x73, 0x69], in: bytes, from: pos, boundaryAfter: true),
                si < closeStart else { break }
            if si + 3 < bytes.count, bytes[si + 3] == 0x2F { // <si/>
                guard si + 4 < bytes.count, bytes[si + 4] == 0x3E else {
                    throw InitError.unterminatedSI
                }
                found.append(Entry(offset: si, length: 5, rich: false))
                pos = si + 5
                continue
            }
            guard let gt = LazySharedStrings.findByte(0x3E, in: bytes, from: si),
                  let close = LazySharedStrings.find(
                    [0x3C, 0x2F, 0x73, 0x69, 0x3E], in: bytes, from: gt) else {
                throw InitError.unterminatedSI
            }
            let rich = LazySharedStrings.containsRichRun(in: bytes, from: gt + 1, to: close)
            found.append(Entry(offset: si, length: close + 5 - si, rich: rich))
            pos = close + 5
        }
        entries = found
        baseCount = parsedCount ?? found.count
        baseUnique = parsedUnique ?? found.count
    }

    // MARK: - Thuộc tính

    /// Số mục `<si>` trong part gốc.
    public var entryCount: Int { entries.count }

    /// Tổng số tham chiếu (thuộc tính `count` + số lần `index(for:)` đã gọi).
    public var count: Int { baseCount + bumpCalls }

    /// Số chuỗi duy nhất (thuộc tính `uniqueCount` + số chuỗi mới đã thêm).
    public var uniqueCount: Int { baseUnique + tailTexts.count }

    /// Có thay đổi chưa ghi ra không: chuỗi mới đã thêm (`tail`) hoặc
    /// `count` đã tăng do `index(for:)` được gọi. Đọc thuần không làm bẩn.
    /// `Workbook` dùng cờ này để quyết định có đẩy `serializedData()` vào
    /// gói khi lưu hay không (không bẩn → giữ nguyên byte nén gốc).
    var hasUnwrittenChanges: Bool { !tailXML.isEmpty || bumpCalls > 0 }

    // MARK: - Đọc lười

    /// Văn bản của mục thứ `index` (`nil` ngoài phạm vi). Chỉ giải mã khi
    /// truy cập; lần truy cập sau dùng cache LRU.
    public func text(at index: Int) -> String? {
        guard index >= 0 else { return nil }
        if index < entries.count {
            if let hit = cache[index] {
                touchCache(index)
                return hit
            }
            let e = entries[index]
            let slice = Data(raw[e.offset ..< e.offset + e.length])
            let wrapped = Data("<sst xmlns=\"\(namespaceURI)\">".utf8)
                + slice + Data("</sst>".utf8)
            guard let doc = try? XDocument(data: wrapped),
                  let si = doc.root.children(NS.s, "si").first else { return nil }
            let t = SharedStrings.text(of: si)
            decodedCount += 1
            storeCache(index: index, text: t)
            return t
        }
        let ti = index - entries.count
        guard ti < tailTexts.count else { return nil }
        return tailTexts[ti]
    }

    public subscript(index: Int) -> String? { text(at: index) }

    public func isRichText(_ index: Int) -> Bool {
        guard index >= 0 else { return false }
        if index < entries.count { return entries[index].rich }
        return false
    }

    // MARK: - Thêm / tra cứu

    /// Chỉ số của chuỗi thuần (dùng lại nếu đã có, ngược lại thêm mới ở
    /// cuối). Tăng `count` 1 mỗi lần gọi, giống `SharedStrings`.
    public func index(for text: String) -> Int {
        bumpCalls += 1
        if let i = seen[text] { return i }
        // Quét tuyến tính từ mốc đã quét: giải mã từng mục chưa biết,
        // ghi nhớ chuỗi của nó để lần sau tra O(1).
        while scanWatermark < entries.count {
            let i = scanWatermark
            scanWatermark += 1
            guard let t = self.text(at: i) else { continue }
            if seen[t] == nil { seen[t] = i }
            if t == text { return i }
        }
        let escaped = SharedStrings.escape(text)
        let preserve = text.first?.isWhitespace == true
            || text.last?.isWhitespace == true || text.contains("\n")
        let tOpen = preserve ? "<t xml:space=\"preserve\">" : "<t>"
        tailXML.append("<si>\(tOpen)\(LazySharedStrings.xmlEscape(escaped))</t></si>")
        tailTexts.append(text)
        let i = entries.count + tailTexts.count - 1
        seen[text] = i
        return i
    }

    // MARK: - Ghi ra

    /// Byte của part: byte thô gốc (giữ nguyên mọi thứ chưa đụng) + các
    /// `<si>` mới chèn trước `</sst>`, thẻ mở `<sst>` sửa `count` /
    /// `uniqueCount`. Khi chưa thêm chuỗi nào, trả đúng byte gốc.
    public func serializedData() -> Data {
        if tailXML.isEmpty, bumpCalls == 0,
           count == baseCount, uniqueCount == baseUnique {
            return Data(raw)
        }
        var tag = String(bytes: raw[sstStart...sstOpenEnd], encoding: .utf8) ?? ""
        tag = LazySharedStrings.patchAttribute(tag, name: "uniqueCount",
                                               value: String(uniqueCount))
        tag = LazySharedStrings.patchAttribute(tag, name: "count",
                                               value: String(count))
        var out = Data()
        out.append(contentsOf: raw[0..<sstStart])
        out.append(contentsOf: tag.utf8)
        out.append(contentsOf: raw[(sstOpenEnd + 1)..<sstCloseStart])
        for xml in tailXML { out.append(contentsOf: xml.utf8) }
        out.append(contentsOf: raw[sstCloseStart...])
        return out
    }

    // MARK: - Hỗ trợ nội bộ

    private func storeCache(index: Int, text: String) {
        cache[index] = text
        cacheOrder.append(index)
        while cacheOrder.count > cacheCap {
            let old = cacheOrder.removeFirst()
            cache.removeValue(forKey: old)
        }
    }

    private func touchCache(_ index: Int) {
        if let i = cacheOrder.firstIndex(of: index) {
            cacheOrder.remove(at: i)
            cacheOrder.append(index)
        }
    }

    /// Tìm needle từ `from`; `boundaryAfter` yêu cầu byte sau needle là
    /// `>`, khoảng trắng, `/` (để `<si` không khớp `<sin>`...).
    private static func find(_ needle: [UInt8], in bytes: [UInt8], from: Int,
                             boundaryAfter: Bool = false) -> Int? {
        guard !needle.isEmpty, from <= bytes.count - needle.count else { return nil }
        var i = from
        while i <= bytes.count - needle.count {
            if bytes[i] == needle[0], bytes[i..<i + needle.count].elementsEqual(needle) {
                if boundaryAfter {
                    let after = i + needle.count
                    if after >= bytes.count { return i }
                    switch bytes[after] {
                    case 0x3E, 0x20, 0x09, 0x0A, 0x0D, 0x2F: return i
                    default: break
                    }
                } else {
                    return i
                }
            }
            i += 1
        }
        return nil
    }

    private static func findLast(_ needle: [UInt8], in bytes: [UInt8]) -> Int? {
        guard !needle.isEmpty, bytes.count >= needle.count else { return nil }
        var i = bytes.count - needle.count
        while i >= 0 {
            if bytes[i..<i + needle.count].elementsEqual(needle) { return i }
            i -= 1
        }
        return nil
    }

    private static func findByte(_ b: UInt8, in bytes: [UInt8], from: Int) -> Int? {
        var i = from
        while i < bytes.count {
            if bytes[i] == b { return i }
            i += 1
        }
        return nil
    }

    /// Có `<r` (+ biên) trong khoảng — `<rPh` / `<rPr` bị loại vì byte sau
    /// `<r` là `P`, không phải biên.
    private static func containsRichRun(in bytes: [UInt8], from: Int, to: Int) -> Bool {
        var i = from
        while i + 1 < to {
            if bytes[i] == 0x3C, bytes[i + 1] == 0x72 {
                let after = i + 2
                if after >= to { return true }
                switch bytes[after] {
                case 0x3E, 0x20, 0x09, 0x0A, 0x0D, 0x2F: return true
                default: break
                }
            }
            i += 1
        }
        return false
    }

    /// Giá trị thuộc tính `name="..."` trong thẻ (chuỗi đã lấy ra); `nil`
    /// nếu không có. Tìm `name` trước rồi `uniqueCount` để tránh nhầm
    /// `count` nằm trong `uniqueCount`.
    private static func attribute(_ tag: String, name: String) -> String? {
        let key = name + "=\""
        guard let r = tag.range(of: key) else { return nil }
        let rest = tag[r.upperBound...]
        guard let end = rest.firstIndex(of: "\"") else { return nil }
        return String(rest[..<end])
    }

    /// Thay giá trị thuộc tính, hoặc chèn mới ngay trước `>` cuối thẻ.
    private static func patchAttribute(_ tag: String, name: String, value: String) -> String {
        let key = name + "=\""
        if let r = tag.range(of: key) {
            let rest = tag[r.upperBound...]
            if let end = rest.firstIndex(of: "\"") {
                return String(tag[..<r.upperBound]) + value + String(tag[end...])
            }
        }
        guard let gt = tag.lastIndex(of: ">") else { return tag }
        return String(tag[..<gt]) + " \(name)=\"\(value)\"" + String(tag[gt...])
    }

    /// Escape XML cho nội dung `<t>` (sau `SharedStrings.escape`).
    private static func xmlEscape(_ s: String) -> String {
        var out = ""
        out.reserveCapacity(s.count)
        for c in s {
            switch c {
            case "&": out += "&amp;"
            case "<": out += "&lt;"
            case ">": out += "&gt;"
            default: out.append(c)
            }
        }
        return out
    }
}
