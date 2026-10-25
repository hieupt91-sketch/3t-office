import Foundation

public enum ZipError: Error, Equatable, CustomStringConvertible {
    case notAZipArchive
    case truncatedArchive
    case multiDiskUnsupported
    case corruptCentralDirectory
    case corruptLocalHeader(String)
    case duplicateEntry(String)
    case unsafeEntryName(String)
    case tooManyEntries(limit: Int)
    case entryTooLarge(String, limit: Int)
    case totalSizeExceeded(limit: Int)
    case encryptedEntry(String)
    case unsupportedCompression(method: UInt16, entry: String)
    case crcMismatch(String)
    case sizeMismatch(String)
    case entryNotFound(String)
    case corruptCompressedData(String, DeflateError)

    public var description: String {
        switch self {
        case .notAZipArchive: return "Tệp không phải gói ZIP (không tìm thấy End of Central Directory)"
        case .truncatedArchive: return "Gói ZIP bị cắt cụt"
        case .multiDiskUnsupported: return "Không hỗ trợ ZIP nhiều phần"
        case .corruptCentralDirectory: return "Central Directory hỏng"
        case .corruptLocalHeader(let n): return "Local header của \(n) hỏng"
        case .duplicateEntry(let n): return "Mục trùng tên trong ZIP: \(n)"
        case .unsafeEntryName(let n): return "Tên mục không an toàn: \(n)"
        case .tooManyEntries(let l): return "Quá nhiều mục trong ZIP (giới hạn \(l))"
        case .entryTooLarge(let n, let l): return "Mục \(n) vượt giới hạn \(l) byte khi giải nén"
        case .totalSizeExceeded(let l): return "Tổng dung lượng giải nén vượt giới hạn \(l) byte"
        case .encryptedEntry(let n): return "Mục \(n) được mã hóa — không hỗ trợ"
        case .unsupportedCompression(let m, let n): return "Mục \(n) dùng phương thức nén \(m) — không hỗ trợ"
        case .crcMismatch(let n): return "CRC-32 của \(n) không khớp"
        case .sizeMismatch(let n): return "Kích thước giải nén của \(n) không khớp"
        case .entryNotFound(let n): return "Không có mục \(n)"
        case .corruptCompressedData(let n, let e): return "Dữ liệu nén của \(n) hỏng: \(e)"
        }
    }
}

/// Giới hạn chống "ZIP bomb" và gói độc hại.
public struct ZipLimits: Sendable {
    public var maxEntries: Int
    public var maxEntrySize: Int
    public var maxTotalUncompressedSize: Int
    public var rejectUnsafeNames: Bool

    public init(maxEntries: Int = 50_000,
                maxEntrySize: Int = 1 << 30,
                maxTotalUncompressedSize: Int = 4 << 30,
                rejectUnsafeNames: Bool = true) {
        self.maxEntries = maxEntries
        self.maxEntrySize = maxEntrySize
        self.maxTotalUncompressedSize = maxTotalUncompressedSize
        self.rejectUnsafeNames = rejectUnsafeNames
    }
}

public enum ZipCompression: Sendable {
    case stored
    case deflate(Deflate.Level)

    public static let deflate = ZipCompression.deflate(.default)
}

public struct ZipEntry: Sendable {
    public static let methodStored: UInt16 = 0
    public static let methodDeflate: UInt16 = 8

    public internal(set) var name: String
    var rawName: [UInt8]
    public internal(set) var method: UInt16
    public internal(set) var crc32: UInt32
    public internal(set) var compressedSize: Int
    public internal(set) var uncompressedSize: Int
    public internal(set) var flags: UInt16
    public internal(set) var lastModTime: UInt16
    public internal(set) var lastModDate: UInt16
    public internal(set) var versionMadeBy: UInt16
    var versionNeeded: UInt16
    public internal(set) var internalAttributes: UInt16
    public internal(set) var externalAttributes: UInt32
    var localExtra: [UInt8]
    var centralExtra: [UInt8]
    public internal(set) var comment: [UInt8]

    enum Storage: Sendable {
        /// Dữ liệu nén nằm nguyên trong gói nguồn tại vị trí này (sao chép nguyên byte khi lưu).
        case source(offset: Int)
        /// Dữ liệu nén mới (đã thay nội dung).
        case buffer(Data)
    }
    var storage: Storage

    public var isDirectory: Bool { name.hasSuffix("/") }
    public var isEncrypted: Bool { flags & 0x0001 != 0 }
    /// true nếu mục được sao chép nguyên vẹn từ gói nguồn (không nén lại).
    public var isPassthrough: Bool {
        if case .source = storage { return true }
        return false
    }
}

/// Đọc/ghi gói ZIP (PKWARE APPNOTE 6.3): stored + deflate, ZIP64, data descriptor, tên UTF-8/CP437.
/// Mục không bị sửa được sao chép nguyên dữ liệu nén khi lưu (không giải nén–nén lại).
public final class ZipArchive {
    public private(set) var entries: [ZipEntry] = []
    public var comment: [UInt8] = []
    public let limits: ZipLimits
    private let source: Data
    private var index: [String: Int] = [:]

    public init(limits: ZipLimits = ZipLimits()) {
        self.source = Data()
        self.limits = limits
    }

    public convenience init(contentsOf url: URL, limits: ZipLimits = ZipLimits()) throws {
        let data = try Data(contentsOf: url, options: .mappedIfSafe)
        try self.init(data: data, limits: limits)
    }

    public init(data: Data, limits: ZipLimits = ZipLimits()) throws {
        // Chuẩn hóa chỉ số bắt đầu = 0 để tính offset đơn giản.
        self.source = data.startIndex == 0 ? data : Data(data)
        self.limits = limits
        try parse()
    }

    // MARK: - Truy vấn

    public var entryNames: [String] { entries.map(\.name) }

    /// Byte gói nguồn như lúc mở (không đổi dù đã sửa mục). Rỗng với gói tạo mới. Không sao chép (Data là COW/mapped).
    public var sourceData: Data { source }

    public func entry(_ name: String) -> ZipEntry? {
        index[name].map { entries[$0] }
    }

    public func contains(_ name: String) -> Bool { index[name] != nil }

    public func contents(of name: String) throws -> Data {
        guard let e = entry(name) else { throw ZipError.entryNotFound(name) }
        return try contents(of: e)
    }

    public func contents(of entry: ZipEntry) throws -> Data {
        if entry.isEncrypted { throw ZipError.encryptedEntry(entry.name) }
        if entry.uncompressedSize > limits.maxEntrySize {
            throw ZipError.entryTooLarge(entry.name, limit: limits.maxEntrySize)
        }
        let raw = rawCompressedData(of: entry)
        let out: Data
        switch entry.method {
        case ZipEntry.methodStored:
            out = raw
        case ZipEntry.methodDeflate:
            do {
                out = try Inflate.decompress(raw, expectedSize: entry.uncompressedSize,
                                             limit: min(limits.maxEntrySize, max(entry.uncompressedSize, 0)))
            } catch DeflateError.outputLimitExceeded {
                throw ZipError.sizeMismatch(entry.name)
            } catch let e as DeflateError {
                throw ZipError.corruptCompressedData(entry.name, e)
            }
        default:
            throw ZipError.unsupportedCompression(method: entry.method, entry: entry.name)
        }
        guard out.count == entry.uncompressedSize else { throw ZipError.sizeMismatch(entry.name) }
        guard CRC32.checksum(out) == entry.crc32 else { throw ZipError.crcMismatch(entry.name) }
        return out
    }

    /// Dữ liệu nén nguyên trạng của mục.
    public func rawCompressedData(of entry: ZipEntry) -> Data {
        switch entry.storage {
        case .source(let offset):
            return source.subdata(in: offset..<(offset + entry.compressedSize))
        case .buffer(let d):
            return d
        }
    }

    // MARK: - Sửa

    /// Ghi (thêm hoặc thay) nội dung của một mục. Mục đã có giữ nguyên vị trí và thuộc tính.
    public func setContents(_ data: Data, for name: String,
                            compression: ZipCompression = .deflate,
                            modificationDate: Date? = nil) {
        let crc = CRC32.checksum(data)
        let compressed: Data
        let method: UInt16
        switch compression {
        case .stored:
            compressed = data
            method = ZipEntry.methodStored
        case .deflate(let level):
            let d = Deflate.compress(data, level: level)
            // Như zlib: nếu nén không có lợi thì lưu thẳng.
            if d.count >= data.count && !data.isEmpty {
                compressed = data
                method = ZipEntry.methodStored
            } else {
                compressed = d
                method = ZipEntry.methodDeflate
            }
        }
        let nameBytes = Array(name.utf8)
        let isASCII = nameBytes.allSatisfy { $0 < 0x80 }
        if let i = index[name] {
            var e = entries[i]
            e.method = method
            e.crc32 = crc
            e.compressedSize = compressed.count
            e.uncompressedSize = data.count
            e.flags = (e.flags & 0x0800) | (isASCII ? 0 : 0x0800)
            e.rawName = nameBytes
            e.storage = .buffer(compressed)
            if let modificationDate {
                (e.lastModTime, e.lastModDate) = ZipArchive.dosDateTime(modificationDate)
            }
            entries[i] = e
        } else {
            let (t, d) = modificationDate.map(ZipArchive.dosDateTime) ?? (0, 0x0021) // 1980-01-01 như Office
            let e = ZipEntry(name: name, rawName: nameBytes, method: method, crc32: crc,
                             compressedSize: compressed.count, uncompressedSize: data.count,
                             flags: isASCII ? 0 : 0x0800, lastModTime: t, lastModDate: d,
                             versionMadeBy: 20, versionNeeded: 20, internalAttributes: 0,
                             externalAttributes: 0, localExtra: [], centralExtra: [], comment: [],
                             storage: .buffer(compressed))
            index[name] = entries.count
            entries.append(e)
        }
    }

    /// Thêm một mục sao chép nguyên dữ liệu nén từ gói khác (không giải nén).
    public func copyEntry(_ entry: ZipEntry, from other: ZipArchive, as newName: String? = nil) {
        var e = entry
        e.storage = .buffer(other.rawCompressedData(of: entry))
        if let newName {
            e.name = newName
            e.rawName = Array(newName.utf8)
        }
        if let i = index[e.name] {
            entries[i] = e
        } else {
            index[e.name] = entries.count
            entries.append(e)
        }
    }

    @discardableResult
    public func removeEntry(_ name: String) -> Bool {
        guard let i = index[name] else { return false }
        entries.remove(at: i)
        rebuildIndex()
        return true
    }

    /// Đổi thứ tự mục (ví dụ đưa [Content_Types].xml lên đầu).
    public func moveEntry(_ name: String, to position: Int) {
        guard let i = index[name] else { return }
        let e = entries.remove(at: i)
        entries.insert(e, at: max(0, min(position, entries.count)))
        rebuildIndex()
    }

    private func rebuildIndex() {
        index.removeAll(keepingCapacity: true)
        for (i, e) in entries.enumerated() { index[e.name] = i }
    }

    // MARK: - Ghi

    public func serialize() -> Data {
        var out = ByteWriter()
        var central = ByteWriter()
        for e in entries {
            let raw = rawCompressedData(of: e)
            let offset = out.count
            let needs64 = e.compressedSize >= 0xFFFF_FFFF || e.uncompressedSize >= 0xFFFF_FFFF
            let flags = e.flags & ~UInt16(0x0008) // đã biết kích thước: bỏ data descriptor
            let versionNeeded = max(e.versionNeeded, needs64 ? 45 : (e.method == ZipEntry.methodDeflate ? 20 : 10))

            var localExtra = e.localExtra
            if needs64 {
                var z = ByteWriter()
                z.u16(0x0001); z.u16(16)
                z.u64(UInt64(e.uncompressedSize)); z.u64(UInt64(e.compressedSize))
                localExtra = z.bytes + localExtra
            }
            out.u32(0x0403_4B50)
            out.u16(versionNeeded)
            out.u16(flags)
            out.u16(e.method)
            out.u16(e.lastModTime)
            out.u16(e.lastModDate)
            out.u32(e.crc32)
            out.u32(needs64 ? 0xFFFF_FFFF : UInt32(e.compressedSize))
            out.u32(needs64 ? 0xFFFF_FFFF : UInt32(e.uncompressedSize))
            out.u16(UInt16(e.rawName.count))
            out.u16(UInt16(localExtra.count))
            out.append(e.rawName)
            out.append(localExtra)
            out.append(raw)

            let cdU = e.uncompressedSize >= 0xFFFF_FFFF
            let cdC = e.compressedSize >= 0xFFFF_FFFF
            let cdO = offset >= 0xFFFF_FFFF
            var centralExtra = e.centralExtra
            if cdU || cdC || cdO {
                var z = ByteWriter()
                var fields: [UInt64] = []
                if cdU { fields.append(UInt64(e.uncompressedSize)) }
                if cdC { fields.append(UInt64(e.compressedSize)) }
                if cdO { fields.append(UInt64(offset)) }
                z.u16(0x0001); z.u16(UInt16(fields.count * 8))
                for f in fields { z.u64(f) }
                centralExtra = z.bytes + centralExtra
            }
            central.u32(0x0201_4B50)
            central.u16(e.versionMadeBy)
            central.u16(max(versionNeeded, (cdU || cdC || cdO) ? 45 : 0))
            central.u16(flags)
            central.u16(e.method)
            central.u16(e.lastModTime)
            central.u16(e.lastModDate)
            central.u32(e.crc32)
            central.u32(cdC ? 0xFFFF_FFFF : UInt32(e.compressedSize))
            central.u32(cdU ? 0xFFFF_FFFF : UInt32(e.uncompressedSize))
            central.u16(UInt16(e.rawName.count))
            central.u16(UInt16(centralExtra.count))
            central.u16(UInt16(e.comment.count))
            central.u16(0)
            central.u16(e.internalAttributes)
            central.u32(e.externalAttributes)
            central.u32(cdO ? 0xFFFF_FFFF : UInt32(offset))
            central.append(e.rawName)
            central.append(centralExtra)
            central.append(e.comment)
        }
        let cdOffset = out.count
        let cdSize = central.count
        out.append(central.bytes)
        let count = entries.count
        let needs64 = count >= 0xFFFF || cdOffset >= 0xFFFF_FFFF || cdSize >= 0xFFFF_FFFF
        if needs64 {
            let zip64EOCDOffset = out.count
            out.u32(0x0606_4B50)
            out.u64(44)
            out.u16(45); out.u16(45)
            out.u32(0); out.u32(0)
            out.u64(UInt64(count)); out.u64(UInt64(count))
            out.u64(UInt64(cdSize)); out.u64(UInt64(cdOffset))
            out.u32(0x0706_4B50)
            out.u32(0)
            out.u64(UInt64(zip64EOCDOffset))
            out.u32(1)
        }
        out.u32(0x0605_4B50)
        out.u16(0); out.u16(0)
        out.u16(needs64 ? 0xFFFF : UInt16(count))
        out.u16(needs64 ? 0xFFFF : UInt16(count))
        out.u32(needs64 ? 0xFFFF_FFFF : UInt32(cdSize))
        out.u32(needs64 ? 0xFFFF_FFFF : UInt32(cdOffset))
        let c = comment.prefix(0xFFFF)
        out.u16(UInt16(c.count))
        out.append(Array(c))
        return Data(out.bytes)
    }

    /// Ghi nguyên tử: ghi tệp tạm rồi thay thế, tránh làm hỏng tệp gốc nếu bị ngắt giữa chừng.
    public func write(to url: URL) throws {
        try serialize().write(to: url, options: .atomic)
    }

    // MARK: - Phân tích

    private func parse() throws {
        let data = source
        let n = data.count
        guard n >= 22 else { throw ZipError.notAZipArchive }
        try data.withUnsafeBytes { (raw: UnsafeRawBufferPointer) in
            let r = ByteReader(raw)
            // Tìm EOCD từ cuối (comment tối đa 65535 byte).
            var eocd = -1
            var p = n - 22
            let stop = max(0, n - 22 - 0xFFFF)
            while p >= stop {
                if r.u32(p) == 0x0605_4B50 {
                    let commentLen = Int(r.u16(p + 20))
                    if p + 22 + commentLen <= n { eocd = p; break }
                }
                p -= 1
            }
            guard eocd >= 0 else { throw ZipError.notAZipArchive }
            let diskNo = r.u16(eocd + 4)
            let cdDisk = r.u16(eocd + 6)
            var total = Int(r.u16(eocd + 10))
            var cdSize = Int(r.u32(eocd + 12))
            var cdOffset = Int(r.u32(eocd + 16))
            let commentLen = Int(r.u16(eocd + 20))
            comment = Array(UnsafeRawBufferPointer(rebasing: raw[(eocd + 22)..<(eocd + 22 + commentLen)]))

            if total == 0xFFFF || cdSize == 0xFFFF_FFFF || cdOffset == 0xFFFF_FFFF,
               eocd >= 20, r.u32(eocd - 20) == 0x0706_4B50 {
                let z64 = Int(r.u64(eocd - 20 + 8))
                guard z64 >= 0, z64 + 56 <= n, r.u32(z64) == 0x0606_4B50 else { throw ZipError.corruptCentralDirectory }
                total = Int(r.u64(z64 + 32))
                cdSize = Int(r.u64(z64 + 40))
                cdOffset = Int(r.u64(z64 + 48))
            } else if diskNo != 0 || cdDisk != 0 {
                throw ZipError.multiDiskUnsupported
            }
            guard total <= limits.maxEntries else { throw ZipError.tooManyEntries(limit: limits.maxEntries) }
            guard cdOffset >= 0, cdSize >= 0, cdOffset + cdSize <= n else { throw ZipError.truncatedArchive }

            var q = cdOffset
            var totalUncompressed = 0
            entries.reserveCapacity(total)
            for _ in 0..<total {
                guard q + 46 <= n, r.u32(q) == 0x0201_4B50 else { throw ZipError.corruptCentralDirectory }
                let versionMadeBy = r.u16(q + 4)
                let versionNeeded = r.u16(q + 6)
                let flags = r.u16(q + 8)
                let method = r.u16(q + 10)
                let time = r.u16(q + 12)
                let date = r.u16(q + 14)
                let crc = r.u32(q + 16)
                var csize = Int(r.u32(q + 20))
                var usize = Int(r.u32(q + 24))
                let nameLen = Int(r.u16(q + 28))
                let extraLen = Int(r.u16(q + 30))
                let commentLen = Int(r.u16(q + 32))
                let internalAttr = r.u16(q + 36)
                let externalAttr = r.u32(q + 38)
                var lho = Int(r.u32(q + 42))
                let nameStart = q + 46
                guard nameStart + nameLen + extraLen + commentLen <= n else { throw ZipError.corruptCentralDirectory }
                let rawName = Array(UnsafeRawBufferPointer(rebasing: raw[nameStart..<(nameStart + nameLen)]))
                let extra = Array(UnsafeRawBufferPointer(rebasing: raw[(nameStart + nameLen)..<(nameStart + nameLen + extraLen)]))
                let entryComment = Array(UnsafeRawBufferPointer(rebasing: raw[(nameStart + nameLen + extraLen)..<(nameStart + nameLen + extraLen + commentLen)]))
                // ZIP64 extra: các trường xuất hiện theo thứ tự chỉ khi giá trị gốc là 0xFFFFFFFF.
                var (z64, otherExtra) = ZipArchive.splitExtra(extra)
                if let z = z64 {
                    var k = 0
                    func next() -> Int? {
                        guard k + 8 <= z.count else { return nil }
                        var v: UInt64 = 0
                        for b in 0..<8 { v |= UInt64(z[k + b]) << UInt64(8 * b) }
                        k += 8
                        return Int(v)
                    }
                    if usize == 0xFFFF_FFFF { usize = next() ?? usize }
                    if csize == 0xFFFF_FFFF { csize = next() ?? csize }
                    if lho == 0xFFFF_FFFF { lho = next() ?? lho }
                }
                z64 = nil
                let name = ZipArchive.decodeName(rawName, utf8Flag: flags & 0x0800 != 0)
                if limits.rejectUnsafeNames && !ZipArchive.isSafeName(name) {
                    throw ZipError.unsafeEntryName(name)
                }
                guard index[name] == nil else { throw ZipError.duplicateEntry(name) }
                guard usize >= 0, csize >= 0 else { throw ZipError.corruptCentralDirectory }
                totalUncompressed += usize
                if totalUncompressed > limits.maxTotalUncompressedSize {
                    throw ZipError.totalSizeExceeded(limit: limits.maxTotalUncompressedSize)
                }
                // Local header
                guard lho >= 0, lho + 30 <= n, r.u32(lho) == 0x0403_4B50 else { throw ZipError.corruptLocalHeader(name) }
                let lNameLen = Int(r.u16(lho + 26))
                let lExtraLen = Int(r.u16(lho + 28))
                let dataStart = lho + 30 + lNameLen + lExtraLen
                guard dataStart + csize <= n else { throw ZipError.truncatedArchive }
                let localExtraRaw = Array(UnsafeRawBufferPointer(rebasing: raw[(lho + 30 + lNameLen)..<dataStart]))
                let localExtra = ZipArchive.splitExtra(localExtraRaw).1

                let e = ZipEntry(name: name, rawName: rawName, method: method, crc32: crc,
                                 compressedSize: csize, uncompressedSize: usize, flags: flags,
                                 lastModTime: time, lastModDate: date, versionMadeBy: versionMadeBy,
                                 versionNeeded: versionNeeded, internalAttributes: internalAttr,
                                 externalAttributes: externalAttr, localExtra: localExtra,
                                 centralExtra: otherExtra, comment: entryComment,
                                 storage: .source(offset: dataStart))
                index[name] = entries.count
                entries.append(e)
                q = nameStart + nameLen + extraLen + commentLen
            }
        }
    }

    /// Tách trường ZIP64 (0x0001) khỏi các trường extra khác.
    static func splitExtra(_ extra: [UInt8]) -> ([UInt8]?, [UInt8]) {
        var z64: [UInt8]?
        var rest: [UInt8] = []
        var i = 0
        while i + 4 <= extra.count {
            let id = UInt16(extra[i]) | UInt16(extra[i + 1]) << 8
            let len = Int(UInt16(extra[i + 2]) | UInt16(extra[i + 3]) << 8)
            guard i + 4 + len <= extra.count else { break }
            if id == 0x0001 {
                z64 = Array(extra[(i + 4)..<(i + 4 + len)])
            } else {
                rest.append(contentsOf: extra[i..<(i + 4 + len)])
            }
            i += 4 + len
        }
        return (z64, rest)
    }

    public static func isSafeName(_ name: String) -> Bool {
        if name.isEmpty || name.hasPrefix("/") || name.contains("\\") || name.contains("\0") { return false }
        if name.count >= 2, name.dropFirst().first == ":" { return false }
        for seg in name.split(separator: "/", omittingEmptySubsequences: false) where seg == ".." {
            return false
        }
        return true
    }

    static func decodeName(_ raw: [UInt8], utf8Flag: Bool) -> String {
        if raw.allSatisfy({ $0 < 0x80 }) { return String(decoding: raw, as: UTF8.self) }
        if let s = String(validatingUTF8CString: raw) { return s }
        if utf8Flag { return String(decoding: raw, as: UTF8.self) }
        return String(raw.map { $0 < 0x80 ? Character(Unicode.Scalar($0)) : cp437High[Int($0) - 0x80] })
    }

    private static let cp437High: [Character] = Array(
        "ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜ¢£¥₧ƒáíóúñÑªº¿⌐¬½¼¡«»░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌█▄▌▐▀αßΓπΣσµτΦΘΩδ∞φε∩≡±≥≤⌠⌡÷≈°∙·√ⁿ²■\u{00A0}")

    static func dosDateTime(_ date: Date) -> (UInt16, UInt16) {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(secondsFromGMT: 0)!
        let c = cal.dateComponents([.year, .month, .day, .hour, .minute, .second], from: date)
        let year = max(1980, min(2107, c.year ?? 1980))
        let hour: Int = c.hour ?? 0
        let minute: Int = c.minute ?? 0
        let second: Int = c.second ?? 0
        let month: Int = c.month ?? 1
        let day: Int = c.day ?? 1
        let t = UInt16((hour << 11) | (minute << 5) | (second / 2))
        let d = UInt16(((year - 1980) << 9) | (month << 5) | day)
        return (t, d)
    }
}

private extension String {
    init?(validatingUTF8CString bytes: [UInt8]) {
        var it = bytes.makeIterator()
        var utf8 = UTF8()
        var scalars = String.UnicodeScalarView()
        loop: while true {
            switch utf8.decode(&it) {
            case .scalarValue(let s): scalars.append(s)
            case .emptyInput: break loop
            case .error: return nil
            }
        }
        self = String(scalars)
    }
}

struct ByteReader {
    let raw: UnsafeRawBufferPointer
    init(_ raw: UnsafeRawBufferPointer) { self.raw = raw }
    @inline(__always) func u16(_ p: Int) -> UInt16 { UInt16(raw[p]) | UInt16(raw[p + 1]) << 8 }
    @inline(__always) func u32(_ p: Int) -> UInt32 {
        UInt32(raw[p]) | UInt32(raw[p + 1]) << 8 | UInt32(raw[p + 2]) << 16 | UInt32(raw[p + 3]) << 24
    }
    @inline(__always) func u64(_ p: Int) -> UInt64 { UInt64(u32(p)) | UInt64(u32(p + 4)) << 32 }
}

struct ByteWriter {
    var bytes: [UInt8] = []
    var count: Int { bytes.count }
    mutating func u16(_ v: UInt16) { bytes.append(UInt8(v & 0xFF)); bytes.append(UInt8(v >> 8)) }
    mutating func u32(_ v: UInt32) { for i in 0..<4 { bytes.append(UInt8((v >> (8 * UInt32(i))) & 0xFF)) } }
    mutating func u64(_ v: UInt64) { for i in 0..<8 { bytes.append(UInt8((v >> (8 * UInt64(i))) & 0xFF)) } }
    mutating func append(_ b: [UInt8]) { bytes.append(contentsOf: b) }
    mutating func append(_ d: Data) { bytes.append(contentsOf: d) }
}
