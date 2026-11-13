import Foundation
import OOXMLPackage

/// M2b giai đoạn B, lát B1 (issue #10, kế hoạch `docs/ios/M2B-PLAN-0611.md` §4.2):
/// chỉ mục offset từng `<row>` của một sheet part — lúc mở chỉ quét 1 lượt
/// byte thô, không parse DOM toàn bộ sheet, không giữ `rows` /
/// `cellElements` trong RAM.
///
/// - Mỗi hàng là `(offset, length)` ≈ 16 byte/hàng (≈ 1,6 MB với 100.000
///   hàng, thay cho ~330 MB của DOM `Worksheet` eager).
/// - `offset` là byte bắt đầu của `<row`, `length` tính tới hết `</row>`
///   (hoặc `/>` với hàng rỗng `<row .../>`).
/// - Số hàng `r` lấy từ thuộc tính `r="N"` của thẻ mở; hàng thiếu `r` được
///   đánh số ẩn nối tiếp như `Worksheet.buildIndex()` (hàng sau hàng
///   `r = k` mà không có `r` thì là `k + 1`).
/// - Ghi thêm biên `<sheetData>` (`sheetDataContentStart/End`) để lát sau
///   (cửa sổ hàng + serializer theo lát, §4.2–§4.3) ráp lại part từ byte gốc.
/// - Lát B1 chỉ dựng chỉ mục + trích lát XML thô của một hàng
///   (`rowXML(forRow:)`); chưa nối vào `Worksheet` (không đổi hành vi eager).
///
/// Giả định (đúng với tệp Excel / LibreOffice / OOXMLKit ghi ra):
/// `<row>` không có tiền tố namespace, nội dung ô đã escape XML nên chuỗi
/// byte `<row` không xuất hiện trong text của ô.
public final class RowOffsetIndex {

    public enum InitError: Error {
        case missingSheetData
        case unterminatedRow
    }

    /// Một hàng `<row>` trong part gốc.
    public struct Entry {
        /// Byte bắt đầu của `<row` trong part gốc.
        public let offset: Int
        /// Độ dài byte từ `<row` tới hết `</row>` (hoặc `/>` với hàng rỗng).
        public let length: Int
    }

    private let raw: [UInt8]
    private let entries: [Int: Entry]

    /// Byte đầu tiên sau thẻ mở `<sheetData...>` (đầu nội dung sheetData).
    public let sheetDataContentStart: Int
    /// Byte bắt đầu của `</sheetData>` (cuối nội dung sheetData).
    public let sheetDataContentEnd: Int

    /// Số hàng của sheet (theo thuộc tính `r` / đánh số ẩn).
    public var rowNumbers: [Int] { entries.keys.sorted() }
    /// Số hàng đã lập chỉ mục.
    public var rowCount: Int { entries.count }
    /// Số hàng lớn nhất (`0` khi sheet rỗng).
    public var maxRowNumber: Int { entries.keys.max() ?? 0 }

    // MARK: - Khởi tạo (quét 1 lượt byte thô)

    public init(data: Data) throws {
        let bytes = [UInt8](data)
        self.raw = bytes
        guard let sd = RowOffsetIndex.find([0x3C, 0x73, 0x68, 0x65, 0x65, 0x74, 0x44, 0x61, 0x74, 0x61],
                                           in: bytes, from: 0, boundaryAfter: true),
              let openEnd = RowOffsetIndex.findByte(0x3E, in: bytes, from: sd) else {
            throw InitError.missingSheetData
        }
        // `<sheetData/>` tự đóng: sheet rỗng, không có hàng nào.
        if openEnd > sd, bytes[openEnd - 1] == 0x2F {
            sheetDataContentStart = openEnd + 1
            sheetDataContentEnd = openEnd + 1
            entries = [:]
            return
        }
        guard let closeStart = RowOffsetIndex.findLast(
            [0x3C, 0x2F, 0x73, 0x68, 0x65, 0x65, 0x74, 0x44, 0x61, 0x74, 0x61, 0x3E],
            in: bytes) else {
            throw InitError.missingSheetData
        }
        sheetDataContentStart = openEnd + 1
        sheetDataContentEnd = closeStart

        var found: [Int: Entry] = [:]
        var nextRow = 1
        var pos = openEnd + 1
        while pos < closeStart {
            guard let row = RowOffsetIndex.find(
                [0x3C, 0x72, 0x6F, 0x77], in: bytes, from: pos, boundaryAfter: true),
                row < closeStart else { break }
            guard let gt = RowOffsetIndex.findByte(0x3E, in: bytes, from: row) else {
                throw InitError.unterminatedRow
            }
            let number: Int
            if let r = RowOffsetIndex.rowNumber(in: bytes, from: row, to: gt) {
                number = r
            } else {
                number = nextRow
            }
            nextRow = number + 1
            if gt > row, bytes[gt - 1] == 0x2F { // <row .../>
                found[number] = Entry(offset: row, length: gt + 1 - row)
                pos = gt + 1
                continue
            }
            guard let close = RowOffsetIndex.find(
                [0x3C, 0x2F, 0x72, 0x6F, 0x77, 0x3E], in: bytes, from: gt) else {
                throw InitError.unterminatedRow
            }
            found[number] = Entry(offset: row, length: close + 6 - row)
            pos = close + 6
        }
        entries = found
    }

    // MARK: - Tra cứu

    /// Mục chỉ mục của hàng `number` (`nil` khi hàng không có trong part).
    public func entry(forRow number: Int) -> Entry? { entries[number] }

    /// Có hàng `number` trong part không.
    public func contains(row number: Int) -> Bool { entries[number] != nil }

    /// XML thô của hàng `number` (`<row ...>...</row>` hoặc `<row .../>`),
    /// `nil` khi hàng không có trong part. Lát sau dùng để materialize
    /// một hàng thành DOM bằng bọc tối thiểu (xem kế hoạch §4.2); khi parse
    /// lát đó phải giữ `XDocument` sống cùng DOM vì `parent` của
    /// `XElement` là `weak` (thả `XDocument` thì `namespaceURI` mất).
    public func rowXML(forRow number: Int) -> Data? {
        guard let e = entries[number] else { return nil }
        return Data(raw[e.offset ..< e.offset + e.length])
    }

    // MARK: - Hỗ trợ nội bộ

    /// Số hàng `r="N"` trong thẻ mở `<row ...>` (từ `from` tới `to`, `to`
    /// là vị trí `>`); `nil` khi thẻ không có thuộc tính `r`. Chỉ nhận
    /// `r` đứng sau khoảng trắng (không nhầm `spans`, `customFormat`…).
    private static func rowNumber(in bytes: [UInt8], from: Int, to: Int) -> Int? {
        var i = from
        while i + 3 <= to {
            if bytes[i] == 0x72, bytes[i + 1] == 0x3D, bytes[i + 2] == 0x22 {
                let before = i - 1
                if before >= from, [0x20, 0x09, 0x0A, 0x0D].contains(bytes[before]) {
                    var j = i + 3
                    var value = 0
                    var digits = 0
                    while j <= to, bytes[j] >= 0x30, bytes[j] <= 0x39 {
                        value = value * 10 + Int(bytes[j] - 0x30)
                        digits += 1
                        j += 1
                    }
                    if digits > 0, j <= to, bytes[j] == 0x22 { return value }
                    return nil
                }
            }
            i += 1
        }
        return nil
    }

    /// Tìm needle từ `from`; `boundaryAfter` yêu cầu byte sau needle là
    /// `>`, khoảng trắng, `/` (để `<row` không khớp `<rowBreaks`…).
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
}
