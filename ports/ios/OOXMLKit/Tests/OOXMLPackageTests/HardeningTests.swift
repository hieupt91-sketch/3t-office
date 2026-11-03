import XCTest
@testable import OOXMLPackage
import OOXMLZip
import OOXMLTestSupport

/// Gói L8 — độ bền trước tệp hỏng/độc hại ở tầng gói + XML: thư viện chỉ được
/// trả lỗi có mã, không bao giờ crash. Các ca ZIP (bom, traversal, fuzz) đã có
/// ở OOXMLZipTests; ở đây là tầng trên: độ sâu XML, vòng quan hệ, đích quan hệ
/// vượt gốc, fuzz XML.
final class HardeningTests: XCTestCase {

    private func nestedXML(depth: Int) -> String {
        String(repeating: "<a>", count: depth) + "x" + String(repeating: "</a>", count: depth)
    }

    func testXMLDepthLimitEnforced() throws {
        // 200 tầng — sâu hơn mọi tệp OOXML thật — vẫn phân tích bình thường.
        let ok = try XDocument(string: nestedXML(depth: 200))
        XCTAssertEqual(ok.root.localName, "a")
        // 2.000 tầng: bị từ chối bằng lỗi có mã, không crash.
        XCTAssertThrowsError(try XDocument(string: nestedXML(depth: 2_000))) {
            XCTAssertEqual($0 as? XMLError, .tooDeep(limit: XParser.maxElementDepth))
        }
        // Đúng biên: 512 tầng được phép, 513 bị chặn.
        _ = try XDocument(string: nestedXML(depth: XParser.maxElementDepth))
        XCTAssertThrowsError(try XDocument(string: nestedXML(depth: XParser.maxElementDepth + 1)))
    }

    func testDeepNestedPartInRealPackageRejected() throws {
        // Lấy một DOCX thật, thay document.xml bằng bản lồng 2.000 tầng.
        let original = try Fixtures.data("docx/rich-word.docx")
        let archive = try ZipArchive(data: original)
        let deep = """
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>\
        \(String(repeating: "<w:p>", count: 2_000))\(String(repeating: "</w:p>", count: 2_000))\
        </w:body></w:document>
        """
        archive.setContents(Data(deep.utf8), for: "word/document.xml")
        let crafted = archive.serialize()
        let pkg = try OPCPackage(data: crafted)
        let partData = try pkg.data(of: "/word/document.xml")
        XCTAssertThrowsError(try XDocument(data: partData)) {
            XCTAssertEqual($0 as? XMLError, .tooDeep(limit: XParser.maxElementDepth))
        }
        // Part gốc của fixture phân tích bình thường (đối chứng).
        let goodPkg = try OPCPackage(data: original)
        _ = try XDocument(data: try goodPkg.data(of: "/word/document.xml"))
    }

    func testCyclicRelationshipsTerminate() throws {
        // Gói tối thiểu có vòng quan hệ a.xml <-> b.xml.
        let a = ZipArchive()
        a.setContents(Data("""
        <?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>\
        <Default Extension="xml" ContentType="application/xml"/>\
        <Override PartName="/a.xml" ContentType="application/xml"/>\
        <Override PartName="/b.xml" ContentType="application/xml"/></Types>
        """.utf8), for: "[Content_Types].xml")
        a.setContents(Data("""
        <?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\
        <Relationship Id="rId1" Type="http://example.invalid/part" Target="a.xml"/></Relationships>
        """.utf8), for: "_rels/.rels")
        a.setContents(Data("<a/>".utf8), for: "a.xml")
        a.setContents(Data("""
        <?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\
        <Relationship Id="rId1" Type="http://example.invalid/part" Target="b.xml"/></Relationships>
        """.utf8), for: "_rels/a.xml.rels")
        a.setContents(Data("<b/>".utf8), for: "b.xml")
        a.setContents(Data("""
        <?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">\
        <Relationship Id="rId1" Type="http://example.invalid/part" Target="a.xml"/></Relationships>
        """.utf8), for: "_rels/b.xml.rels")
        let pkg = try OPCPackage(data: a.serialize())
        // Hai hàm duyệt quan hệ phải kết thúc (seen-set) và cho kết quả đúng.
        let reachable = try pkg.reachableParts()
        XCTAssertTrue(reachable.contains("/a.xml"))
        XCTAssertTrue(reachable.contains("/b.xml"))
        XCTAssertEqual(try pkg.partsReachable(from: "/a.xml"), ["/b.xml"])
        XCTAssertEqual(try pkg.partsReachable(from: "/b.xml"), ["/a.xml"])
    }

    func testRelationshipTargetCannotEscapePackageRoot() {
        let source = PartName("/word/document.xml")
        // ".." bị kẹp ở gốc gói: kết quả luôn là một khóa nội bộ vô hại.
        XCTAssertEqual(source.resolve("../../etc/passwd"), "/etc/passwd")
        XCTAssertEqual(source.resolve("../../../../x.xml"), "/x.xml")
        XCTAssertEqual(source.resolve("media/../document.xml"), "/word/document.xml")
        XCTAssertEqual(PartName.root.resolve("../evil.xml"), "/evil.xml")
    }

    func testFuzzedXMLNeverCrashes() throws {
        // Đột biến ngẫu nhiên có hạt giống trên document.xml thật: mọi kết quả
        // đều hoặc phân tích được hoặc ném XMLError — tiến trình sống sót là đủ.
        let good = try OPCPackage(data: try Fixtures.data("docx/rich-word.docx")).data(of: "/word/document.xml")
        var state: UInt64 = 0x243F6A8885A308D3
        func nextRandom() -> UInt64 { state = state &* 6364136223846793005 &+ 1442695040888963407; return state >> 33 }
        for _ in 0..<300 {
            var bytes = [UInt8](good)
            for _ in 0..<(1 + Int(nextRandom() % 8)) {
                bytes[Int(nextRandom() % UInt64(bytes.count))] = UInt8(nextRandom() % 256)
            }
            _ = try? XDocument(data: Data(bytes))
        }
    }
}
