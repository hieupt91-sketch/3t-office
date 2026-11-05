import XCTest
import OOXMLZip
@testable import OOXMLPackage
import OOXMLTestSupport

/// Gói L9 (issue #10): đường LƯU TRUYỀN PHÁT (`OPCPackage.saveStreaming`)
/// phải cho tệp ra khớp TỪNG BYTE với đường lưu thường ở cùng trạng thái
/// gói, giữ nguyên bảo đảm lossless và hợp đồng "tệp tạm → kiểm chứng →
/// thay nguyên tử" của `save(to:)`.
final class StreamingSaveTests: XCTestCase {
    private func allFixtures() -> [String] {
        Fixtures.list("docx", extensions: ["docx"]) + Fixtures.list("xlsx", extensions: ["xlsx"])
            + Fixtures.list("pptx", extensions: ["pptx"]) + Fixtures.list("real", extensions: ["docx", "xlsx", "pptx"])
    }

    func testFixturesFound() { XCTAssertFalse(allFixtures().isEmpty) }

    func testStreamingNoOpSaveMatchesClassicBytes() throws {
        let dir = try Fixtures.scratchDirectory("streaming-noop")
        for f in allFixtures() {
            let data = try Fixtures.data(f)
            let classic = try OPCPackage(data: data).save()
            let lazy = try OPCPackage(data: data, deferValidation: true)
            let url = dir.appendingPathComponent("out-" + (f as NSString).lastPathComponent)
            try lazy.saveStreaming(to: url)
            XCTAssertEqual(try Data(contentsOf: url), classic, f)
        }
    }

    func testStreamingEditedSaveMatchesClassicAndKeepsCompressedBytes() throws {
        let dir = try Fixtures.scratchDirectory("streaming-edit")
        for f in allFixtures() {
            let data = try Fixtures.data(f)
            let eager = try OPCPackage(data: data)
            let lazy = try OPCPackage(data: data, deferValidation: true)
            let main = try eager.mainDocumentPart()
            for pkg in [eager, lazy] {
                let doc = try pkg.xml(main)
                doc.root.setAttribute("streamProbe", "1")
                pkg.markModified(main)
            }
            let classic = try eager.save()
            let url = dir.appendingPathComponent("out-" + (f as NSString).lastPathComponent)
            try lazy.saveStreaming(to: url)
            let streamed = try Data(contentsOf: url)
            XCTAssertEqual(streamed, classic, f)
            let diff = try PackageDiff(original: data, saved: streamed)
            XCTAssertEqual(diff.changed, [main.zipName], f)
            XCTAssertEqual(Set(diff.unchanged), Set(diff.rawIdentical), "\(f): phần không sửa phải giữ nguyên byte nén")
        }
    }

    func testStreamingSaveToURLKnowsSourceIssues() throws {
        // Mở lười + kiểm chứng bật: lỗi sẵn có của nguồn không được tính là lỗi của lần lưu.
        let dir = try Fixtures.scratchDirectory("streaming-baseline")
        for f in allFixtures() {
            let data = try Fixtures.data(f)
            let lazy = try OPCPackage(data: data, deferValidation: true)
            let url = dir.appendingPathComponent("out-" + (f as NSString).lastPathComponent)
            try lazy.saveStreaming(to: url)
            XCTAssertEqual(try Data(contentsOf: url), try OPCPackage(data: data).save(), f)
        }
    }

    func testStreamingSaveReplacesExistingDestination() throws {
        let dir = try Fixtures.scratchDirectory("streaming-replace")
        let f = try XCTUnwrap(allFixtures().first)
        let data = try Fixtures.data(f)
        let url = dir.appendingPathComponent("dest.bin")
        try Data("nội dung cũ phải bị thay".utf8).write(to: url)
        let pkg = try OPCPackage(data: data, deferValidation: true)
        try pkg.saveStreaming(to: url)
        XCTAssertEqual(try Data(contentsOf: url), try OPCPackage(data: data).save(), f)
        // Lưu đè lần hai trên chính tệp vừa ghi (đích đã là một gói hợp lệ).
        let pkg2 = try OPCPackage(contentsOf: url, deferValidation: true)
        let main = try pkg2.mainDocumentPart()
        let doc = try pkg2.xml(main)
        doc.root.setAttribute("streamProbe", "2")
        pkg2.markModified(main)
        try pkg2.saveStreaming(to: url)
        let reopened = try OPCPackage(contentsOf: url)
        XCTAssertEqual(try reopened.xml(main).root.attribute("streamProbe"), "2", f)
    }

    func testValidateLightAgreesWithValidateOnFixtures() throws {
        for f in allFixtures() {
            let pkg = try OPCPackage(data: try Fixtures.data(f), deferValidation: true)
            XCTAssertEqual(Set(PackageValidator.validate(pkg)), Set(PackageValidator.validateLight(pkg)), f)
        }
    }

    func testStreamingWriterMatchesSerializeByteForByte() throws {
        // Dữ liệu xác định (LCG) gồm cả khối nén tốt và khối gần như ngẫu nhiên,
        // một mục lớn hơn lát ghi 512 KiB để chạm đường ghi theo lát.
        var seed: UInt64 = 0x2545F4914F6CDD1D
        func rnd() -> UInt8 { seed = seed &* 6364136223846793005 &+ 1442695040888963407; return UInt8(truncatingIfNeeded: seed >> 33) }
        let random = Data((0..<700_000).map { _ in rnd() })
        let repetitive = Data(String(repeating: "OOXMLKit streaming ", count: 20_000).utf8)
        let archive = ZipArchive()
        archive.comment = Array("ghi chú gói".utf8)
        archive.setContents(random, for: "media/random.bin")
        archive.setContents(repetitive, for: "xl/worksheets/sheet1.xml")
        archive.setContents(Data("lưu thẳng".utf8), for: "docProps/core.xml", compression: .stored)
        archive.setContents(Data(), for: "empty.txt")
        let classic = archive.serialize()

        let dir = try Fixtures.scratchDirectory("streaming-writer")
        let url = dir.appendingPathComponent("out.zip")
        XCTAssertTrue(FileManager.default.createFile(atPath: url.path, contents: nil))
        let handle = try FileHandle(forWritingTo: url)
        let writer = ZipStreamingWriter(handle: handle)
        for e in archive.entries {
            try writer.writeEntry(e, compressed: archive.rawCompressedData(of: e))
        }
        try writer.finish(comment: archive.comment)
        try handle.close()
        XCTAssertEqual(try Data(contentsOf: url), classic)
        // Và gói ghi truyền phát phải mở/đọc lại được nguyên vẹn.
        let back = try ZipArchive(contentsOf: url)
        XCTAssertEqual(try back.contents(of: "media/random.bin"), random)
        XCTAssertEqual(try back.contents(of: "xl/worksheets/sheet1.xml"), repetitive)
    }
}
