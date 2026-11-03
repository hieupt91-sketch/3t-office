import XCTest
@testable import OOXMLZip
import OOXMLTestSupport

final class ZipArchiveTests: XCTestCase {
    let readable = ["basic-deflate.zip", "stored.zip", "comment.zip", "unicode-names.zip",
                    "large-text.zip", "data-descriptor.zip", "zip64-local.zip", "cp437-name.zip"]

    func testReadAllFixturesWithCRCVerification() throws {
        for name in readable {
            let archive = try ZipArchive(contentsOf: Fixtures.url("zip/\(name)"))
            XCTAssertFalse(archive.entries.isEmpty, name)
            for e in archive.entries {
                let data = try archive.contents(of: e)
                XCTAssertEqual(data.count, e.uncompressedSize, "\(name):\(e.name)")
            }
        }
    }

    func testBasicContentsAndMetadata() throws {
        let a = try ZipArchive(contentsOf: Fixtures.url("zip/basic-deflate.zip"))
        XCTAssertEqual(a.entryNames, ["[Content_Types].xml", "xl/worksheets/sheet1.xml", "xl/media/random.bin", "empty.txt", "folder/"])
        XCTAssertTrue(a.entry("folder/")!.isDirectory)
        XCTAssertEqual(try a.contents(of: "empty.txt").count, 0)
        XCTAssertEqual(try a.contents(of: "xl/media/random.bin").count, 40_000)
        let xml = String(decoding: try a.contents(of: "xl/worksheets/sheet1.xml"), as: UTF8.self)
        XCTAssertTrue(xml.contains("<c r=\"A399\"><v>1197</v></c>"))
    }

    func testUnicodeAndCP437Names() throws {
        let u = try ZipArchive(contentsOf: Fixtures.url("zip/unicode-names.zip"))
        XCTAssertEqual(u.entryNames, ["Tài liệu/báo cáo tháng 10.xml", "日本語/ファイル.txt"])
        XCTAssertEqual(String(decoding: try u.contents(of: "Tài liệu/báo cáo tháng 10.xml"), as: UTF8.self), "<a>Xin chào Việt Nam</a>")
        let c = try ZipArchive(contentsOf: Fixtures.url("zip/cp437-name.zip"))
        XCTAssertEqual(c.entryNames, ["résumé.txt"])
    }

    func testArchiveComment() throws {
        let a = try ZipArchive(contentsOf: Fixtures.url("zip/comment.zip"))
        XCTAssertEqual(String(decoding: a.comment, as: UTF8.self), "Gói có chú thích — 3T")
        let b = try ZipArchive(data: a.serialize())
        XCTAssertEqual(b.comment, a.comment)
    }

    /// Lưu lại không sửa: mọi mục giữ nguyên byte nén, CRC, phương thức, thời gian.
    func testUnmodifiedRoundTripIsBytePreserving() throws {
        for name in readable {
            let a = try ZipArchive(contentsOf: Fixtures.url("zip/\(name)"))
            XCTAssertTrue(a.entries.allSatisfy(\.isPassthrough))
            let b = try ZipArchive(data: a.serialize())
            XCTAssertEqual(a.entryNames, b.entryNames, name)
            for (x, y) in zip(a.entries, b.entries) {
                XCTAssertEqual(a.rawCompressedData(of: x), b.rawCompressedData(of: y), "\(name):\(x.name)")
                XCTAssertEqual(x.crc32, y.crc32)
                XCTAssertEqual(x.method, y.method)
                XCTAssertEqual(x.lastModDate, y.lastModDate)
                XCTAssertEqual(x.lastModTime, y.lastModTime)
                XCTAssertEqual(x.externalAttributes, y.externalAttributes)
                XCTAssertEqual(y.flags & 0x0008, 0, "data descriptor phải được bỏ khi ghi lại")
                XCTAssertEqual(try a.contents(of: x), try b.contents(of: y))
            }
        }
    }

    /// Mở → sửa một mục → lưu ra tệp → đóng → mở lại: mục sửa đúng, mục khác giữ nguyên byte.
    func testOpenEditSaveCloseReopen() throws {
        let dir = try Fixtures.scratchDirectory("zip-edit")
        let out = dir.appendingPathComponent("edited.zip")
        let originalRaw: [String: Data]
        do {
            let a = try ZipArchive(contentsOf: Fixtures.url("zip/basic-deflate.zip"))
            originalRaw = Dictionary(uniqueKeysWithValues: a.entries.map { ($0.name, a.rawCompressedData(of: $0)) })
            a.setContents(Data("<sửa>đã sửa</sửa>".utf8), for: "xl/worksheets/sheet1.xml")
            a.setContents(Data(repeating: 7, count: 5000), for: "xl/media/new.bin")
            XCTAssertTrue(a.removeEntry("empty.txt"))
            try a.write(to: out)
        }
        let b = try ZipArchive(contentsOf: out)
        XCTAssertEqual(b.entryNames, ["[Content_Types].xml", "xl/worksheets/sheet1.xml", "xl/media/random.bin", "folder/", "xl/media/new.bin"])
        XCTAssertEqual(String(decoding: try b.contents(of: "xl/worksheets/sheet1.xml"), as: UTF8.self), "<sửa>đã sửa</sửa>")
        XCTAssertEqual(try b.contents(of: "xl/media/new.bin"), Data(repeating: 7, count: 5000))
        for name in ["[Content_Types].xml", "xl/media/random.bin", "folder/"] {
            XCTAssertEqual(b.rawCompressedData(of: b.entry(name)!), originalRaw[name], name)
        }
        Fixtures.publishArtifact(try Data(contentsOf: out), name: "zip-edited.zip")
    }

    func testDataDescriptorArchiveIsRewrittenWithoutDescriptor() throws {
        let a = try ZipArchive(contentsOf: Fixtures.url("zip/data-descriptor.zip"))
        XCTAssertTrue(a.entries.allSatisfy { $0.flags & 0x0008 != 0 })
        let data = a.serialize()
        let b = try ZipArchive(data: data)
        XCTAssertTrue(b.entries.allSatisfy { $0.flags & 0x0008 == 0 })
        for e in b.entries { _ = try b.contents(of: e) }
        Fixtures.publishArtifact(data, name: "zip-from-data-descriptor.zip")
    }

    func testZip64EndOfCentralDirectoryWithManyEntries() throws {
        let a = ZipArchive()
        let count = 70_000 // > 0xFFFF => bắt buộc ZIP64 EOCD
        for i in 0..<count {
            a.setContents(Data("\(i)".utf8), for: "d/\(i).txt", compression: .stored)
        }
        let data = a.serialize()
        let b = try ZipArchive(data: data, limits: ZipLimits(maxEntries: 100_000))
        XCTAssertEqual(b.entries.count, count)
        XCTAssertEqual(String(decoding: try b.contents(of: "d/69999.txt"), as: UTF8.self), "69999")
        Fixtures.publishArtifact(data, name: "zip64-70000-entries.zip")
    }

    func testZip64LocalExtraFixture() throws {
        let a = try ZipArchive(contentsOf: Fixtures.url("zip/zip64-local.zip"))
        XCTAssertEqual(try a.contents(of: "xl/media/random.bin").count, 40_000)
        let b = try ZipArchive(data: a.serialize())
        XCTAssertEqual(try b.contents(of: "xl/media/random.bin"), try a.contents(of: "xl/media/random.bin"))
    }

    func testMalformedArchivesAreRejected() throws {
        XCTAssertThrowsError(try ZipArchive(contentsOf: Fixtures.url("zip/not-a-zip.bin"))) {
            XCTAssertEqual($0 as? ZipError, .notAZipArchive)
        }
        XCTAssertThrowsError(try ZipArchive(contentsOf: Fixtures.url("zip/truncated.zip")))
        XCTAssertThrowsError(try ZipArchive(data: Data())) { XCTAssertEqual($0 as? ZipError, .notAZipArchive) }
        XCTAssertThrowsError(try ZipArchive(contentsOf: Fixtures.url("zip/path-traversal.zip"))) {
            XCTAssertEqual($0 as? ZipError, .unsafeEntryName("../../evil.txt"))
        }
        XCTAssertThrowsError(try ZipArchive(contentsOf: Fixtures.url("zip/duplicate-names.zip"))) {
            XCTAssertEqual($0 as? ZipError, .duplicateEntry("a.txt"))
        }
        let crc = try ZipArchive(contentsOf: Fixtures.url("zip/bad-crc.zip"))
        XCTAssertThrowsError(try crc.contents(of: "a.txt")) { XCTAssertEqual($0 as? ZipError, .crcMismatch("a.txt")) }
        let enc = try ZipArchive(contentsOf: Fixtures.url("zip/encrypted-flag.zip"))
        XCTAssertThrowsError(try enc.contents(of: "a.txt")) { XCTAssertEqual($0 as? ZipError, .encryptedEntry("a.txt")) }
    }

    /// Mục nén bằng phương thức chưa hỗ trợ: không đọc được nội dung nhưng vẫn được giữ nguyên khi lưu.
    func testUnsupportedMethodIsPreservedVerbatim() throws {
        let a = try ZipArchive(contentsOf: Fixtures.url("zip/unsupported-method.zip"))
        XCTAssertThrowsError(try a.contents(of: "a.txt")) {
            XCTAssertEqual($0 as? ZipError, .unsupportedCompression(method: 12, entry: "a.txt"))
        }
        a.setContents(Data("mới".utf8), for: "b.txt")
        let b = try ZipArchive(data: a.serialize())
        XCTAssertEqual(b.entry("a.txt")!.method, 12)
        XCTAssertEqual(b.rawCompressedData(of: b.entry("a.txt")!), a.rawCompressedData(of: a.entry("a.txt")!))
        XCTAssertEqual(String(decoding: try b.contents(of: "b.txt"), as: UTF8.self), "mới")
    }

    func testZipBombLimits() throws {
        let a = ZipArchive()
        a.setContents(Data(count: 2_000_000), for: "zeros.bin")
        let data = a.serialize()
        XCTAssertLessThan(data.count, 10_000)
        let small = try ZipArchive(data: data, limits: ZipLimits(maxEntrySize: 1_000_000))
        XCTAssertThrowsError(try small.contents(of: "zeros.bin")) {
            XCTAssertEqual($0 as? ZipError, .entryTooLarge("zeros.bin", limit: 1_000_000))
        }
        XCTAssertThrowsError(try ZipArchive(data: data, limits: ZipLimits(maxTotalUncompressedSize: 1_000_000)))
        XCTAssertThrowsError(try ZipArchive(data: data, limits: ZipLimits(maxEntries: 0)))
    }

    func testSafeNameRules() {
        XCTAssertTrue(ZipArchive.isSafeName("word/document.xml"))
        XCTAssertTrue(ZipArchive.isSafeName("[Content_Types].xml"))
        for bad in ["/etc/passwd", "a/../../b", "..", "C:/x", "a\\b", ""] {
            XCTAssertFalse(ZipArchive.isSafeName(bad), bad)
        }
    }

    func testFuzzedArchivesNeverCrash() throws {
        let good = try Fixtures.data("zip/basic-deflate.zip")
        var rng = SeededRandom(seed: 99)
        for _ in 0..<300 {
            var bad = [UInt8](good)
            for _ in 0..<Int.random(in: 1...8, using: &rng) {
                let i = Int.random(in: 0..<bad.count, using: &rng)
                bad[i] = UInt8.random(in: 0...255, using: &rng)
            }
            if let a = try? ZipArchive(data: Data(bad)) {
                for e in a.entries { _ = try? a.contents(of: e) }
            }
        }
    }

    func testZipDefaultLimitsAreMobileProfile() {
        let d = ZipLimits()
        XCTAssertEqual(d.maxEntries, 20_000)
        XCTAssertEqual(d.maxEntrySize, 256 * 1024 * 1024)
        XCTAssertEqual(d.maxTotalUncompressedSize, 512 * 1024 * 1024)
    }

    func testZipDefaultLimitsRejectOversizedEntry() throws {
        let a = ZipArchive()
        a.setContents(Data(count: 270_000_000), for: "zeros.bin")  // 270MB số 0 nén còn rất nhỏ
        let data = a.serialize()
        XCTAssertLessThan(data.count, 2_000_000)
        // Mặc định: tổng 270MB < 512MB nên mở được, nhưng đọc entry bị chặn theo hạn mức mỗi entry.
        let z = try ZipArchive(data: data)
        XCTAssertThrowsError(try z.contents(of: "zeros.bin")) {
            XCTAssertEqual($0 as? ZipError, .entryTooLarge("zeros.bin", limit: 256 * 1024 * 1024))
        }
        // Caller truyền hạn mức tường minh cao hơn thì đọc được bình thường.
        let big = try ZipArchive(data: data, limits: ZipLimits(maxEntrySize: 300_000_000,
                                                               maxTotalUncompressedSize: 600_000_000))
        XCTAssertEqual(try big.contents(of: "zeros.bin").count, 270_000_000)
    }

    func testZipDefaultLimitsRejectTotalSize() throws {
        // 2 × 270.000.000 = 540.000.000 byte > hạn mức tổng 512 MiB (536.870.912 byte).
        // (Chú ý đơn vị: 260 MB thập phân × 2 = 520.000.000 < 512 MiB nên sẽ KHÔNG chạm hạn mức.)
        let a = ZipArchive()
        a.setContents(Data(count: 270_000_000), for: "a.bin")
        a.setContents(Data(count: 270_000_000), for: "b.bin")
        let data = a.serialize()
        XCTAssertThrowsError(try ZipArchive(data: data)) {
            XCTAssertEqual($0 as? ZipError, .totalSizeExceeded(limit: 512 * 1024 * 1024))
        }
    }

    /// ZIP64 extra khai uncompressed size = 2^63 (vượt Int): initializer phải trả
    /// lỗi ZipError ổn định, không crash vì tràn số khi ép kiểu.
    func testZip64DeclaredSizeBeyondIntThrows() throws {
        let a = ZipArchive()
        a.setContents(Data("hello".utf8), for: "a.txt")
        var bytes = [UInt8](a.serialize())
        // Tìm central directory record đầu tiên (PK\x01\x02).
        var cd = -1
        for i in 0..<(bytes.count - 3) where bytes[i] == 0x50 && bytes[i + 1] == 0x4B && bytes[i + 2] == 0x01 && bytes[i + 3] == 0x02 {
            cd = i; break
        }
        let cdOffset = try XCTUnwrap(cd >= 0 ? cd : nil)
        func u16(_ o: Int) -> Int { Int(bytes[o]) | Int(bytes[o + 1]) << 8 }
        func setU16(_ o: Int, _ v: Int) { bytes[o] = UInt8(v & 0xFF); bytes[o + 1] = UInt8((v >> 8) & 0xFF) }
        func setU32(_ o: Int, _ v: UInt32) { for k in 0..<4 { bytes[o + k] = UInt8((v >> UInt32(8 * k)) & 0xFF) } }
        let nameLen = u16(cdOffset + 28)
        let extraLen = u16(cdOffset + 30)
        // uncompressed size = 0xFFFFFFFF + ZIP64 extra (tag 0x0001) chứa 2^63.
        setU32(cdOffset + 24, 0xFFFF_FFFF)
        var extra: [UInt8] = [0x01, 0x00, 0x08, 0x00]
        extra.append(contentsOf: [0, 0, 0, 0, 0, 0, 0, 0x80])  // 2^63 dạng little-endian
        bytes.insert(contentsOf: extra, at: cdOffset + 46 + nameLen + extraLen)
        setU16(cdOffset + 30, extraLen + extra.count)
        // EOCD: cộng thêm kích thước central directory.
        var eocd = -1
        for i in stride(from: bytes.count - 4, through: 0, by: -1)
            where bytes[i] == 0x50 && bytes[i + 1] == 0x4B && bytes[i + 2] == 0x05 && bytes[i + 3] == 0x06 {
            eocd = i; break
        }
        let eocdOffset = try XCTUnwrap(eocd >= 0 ? eocd : nil)
        let cdSize = Int(bytes[eocdOffset + 12]) | Int(bytes[eocdOffset + 13]) << 8
            | Int(bytes[eocdOffset + 14]) << 16 | Int(bytes[eocdOffset + 15]) << 24
        setU32(eocdOffset + 12, UInt32(cdSize + extra.count))
        XCTAssertThrowsError(try ZipArchive(data: Data(bytes))) { error in
            XCTAssertTrue(error is ZipError, "\(error)")
        }
    }
}
