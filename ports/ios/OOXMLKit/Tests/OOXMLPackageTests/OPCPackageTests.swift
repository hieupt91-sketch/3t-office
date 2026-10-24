import XCTest
@testable import OOXMLPackage
import OOXMLZip
import OOXMLTestSupport

final class OPCPackageTests: XCTestCase {
    /// Lỗi có sẵn trong fixture nguồn (không do OOXMLKit gây ra) — xem báo cáo.
    let knownSourceIssues = [
        "real/sample-slides-smartart.pptx": ["/ppt/slideMasters/slideMaster1.xml: quan hệ rId3 trỏ tới phần không tồn tại /ppt/slideLayouts/slideLayout2.xml"],
    ]

    var realFixtures: [String] { Fixtures.list("real", extensions: ["xlsx", "docx", "pptx"]) }

    func testPartNameResolution() {
        let doc = PartName("/word/document.xml")
        XCTAssertEqual(doc.relationshipsPart, PartName("/word/_rels/document.xml.rels"))
        XCTAssertEqual(PartName.root.relationshipsPart, PartName("/_rels/.rels"))
        XCTAssertEqual(PartName("/word/_rels/document.xml.rels").relationshipsSource, doc)
        XCTAssertEqual(PartName("/_rels/.rels").relationshipsSource, .root)
        XCTAssertEqual(doc.resolve("media/image1.png"), PartName("/word/media/image1.png"))
        XCTAssertEqual(PartName("/xl/worksheets/sheet1.xml").resolve("../drawings/drawing1.xml"), PartName("/xl/drawings/drawing1.xml"))
        XCTAssertEqual(doc.resolve("/customXml/item1.xml"), PartName("/customXml/item1.xml"))
        XCTAssertEqual(doc.resolve("media/t%C3%AAn%20%E1%BA%A3nh.png"), PartName("/word/media/tên ảnh.png"))
        XCTAssertEqual(PartName.root.resolve("xl/workbook.xml"), PartName("/xl/workbook.xml"))
        XCTAssertEqual(PartName("/xl/worksheets/sheet1.xml").relativeTarget(to: PartName("/xl/drawings/drawing1.xml")), "../drawings/drawing1.xml")
        XCTAssertEqual(PartName("/ppt/slides/slide1.xml").relativeTarget(to: PartName("/ppt/slides/slide2.xml")), "slide2.xml")
        XCTAssertEqual(PartName("/word/document.xml").relativeTarget(to: PartName("/word/media/tên ảnh.png")), "media/t%C3%AAn%20%E1%BA%A3nh.png")
        XCTAssertEqual(PartName("/XL/Workbook.xml"), PartName("/xl/workbook.xml"), "so sánh không phân biệt hoa thường")
    }

    /// Mọi fixture thật mở được, hợp lệ, và lưu không sửa gì giữ nguyên byte mọi phần.
    func testRealFixturesOpenValidateAndNoOpSaveLossless() throws {
        XCTAssertEqual(realFixtures.count, 19)
        for f in realFixtures {
            let original = try Fixtures.data(f)
            let pkg = try OPCPackage(data: original)
            XCTAssertEqual(PackageValidator.validate(pkg), knownSourceIssues[f] ?? [], f)
            _ = try pkg.mainDocumentPart()
            // Đọc (parse) mọi phần XML nhưng không sửa: vẫn không được ghi lại.
            for p in pkg.partNames where p.fileExtension == "xml" || p.isRelationshipsPart {
                _ = try pkg.xml(p)
            }
            let saved = try pkg.save()
            try RoundTrip.assertNoOpSaveIsLossless(original, saved: saved, name: "noop-" + (f as NSString).lastPathComponent)
        }
    }

    /// XML của mọi phần trong fixture thật: phân tích → ghi lại → phân tích phải cho cây giống hệt.
    func testXMLReserializationIsStableOnRealParts() throws {
        for f in realFixtures {
            let pkg = try OPCPackage(data: try Fixtures.data(f))
            for p in pkg.partNames where p.fileExtension == "xml" || p.isRelationshipsPart {
                let doc = try pkg.xml(p)
                let once = doc.serialized()
                let twice = try XDocument(data: once).serialized()
                XCTAssertEqual(once, twice, "\(f):\(p)")
                XCTAssertEqual(canonical(try XDocument(data: try pkg.data(of: p)).root), canonical(try XDocument(data: once).root), "\(f):\(p)")
            }
        }
    }

    func testAddPartRelationshipAndContentTypeThenReopen() throws {
        let original = try Fixtures.data("real/sample-writer.docx")
        let dir = try Fixtures.scratchDirectory("opc-add")
        let url = dir.appendingPathComponent("added.docx")
        do {
            let pkg = try OPCPackage(data: original)
            let main = try pkg.mainDocumentPart()
            let img = PartName("/word/media/ảnh mới.png")
            pkg.setData(Data([0x89, 0x50, 0x4E, 0x47]), for: img, contentType: ContentType.png)
            let rels = try pkg.relationships(of: main)
            let before = Set(rels.all.map(\.id))
            let rid = rels.add(.image, to: img)
            XCTAssertFalse(before.contains(rid), "Id mới không được trùng")
            XCTAssertEqual(rels.add(.image, to: img), rid, "thêm lại cùng đích dùng lại Id")
            let custom = PartName("/customXml/item9.xml")
            pkg.setXML(try XDocument(string: "<data>3T</data>"), for: custom, contentType: ContentType.xml)
            try pkg.relationships(of: .root).add(RelationshipType("http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXml"), to: custom)
            try pkg.save(to: url)
        }
        let reopened = try OPCPackage(contentsOf: url)
        let main = try reopened.mainDocumentPart()
        let imgs = try reopened.relatedParts(from: main, .image)
        XCTAssertTrue(imgs.contains(PartName("/word/media/ảnh mới.png")))
        XCTAssertEqual(reopened.contentType(of: PartName("/word/media/ảnh mới.png")), "image/png")
        XCTAssertEqual(try reopened.xml("/customXml/item9.xml").root.textContent, "3T")
        try RoundTrip.verify(original: original, saved: try Data(contentsOf: url),
                             allowedChanges: ["[Content_Types].xml", "_rels/.rels", "word/_rels/document.xml.rels",
                                              "word/media/%E1%BA%A3nh%20m%E1%BB%9Bi.png", "customXml/item9.xml"],
                             requireChanged: ["word/_rels/document.xml.rels"], name: "opc-added.docx")
    }

    /// ECMA-376 phần 2 phụ lục A: tên mục ZIP phải là dạng ASCII mã hóa phần trăm của tên phần.
    func testNonASCIIPartNamesArePercentEncodedInZip() throws {
        XCTAssertEqual(PartName("/word/media/ảnh mới.png").zipName, "word/media/%E1%BA%A3nh%20m%E1%BB%9Bi.png")
        XCTAssertEqual(PartName("/word/media/%E1%BA%A3nh%20m%E1%BB%9Bi.png"), PartName("/word/media/ảnh mới.png"))
        XCTAssertEqual(PartName.contentTypes.zipName, "[Content_Types].xml")
        let pkg = try OPCPackage(data: try Fixtures.data("real/sample-writer.docx"))
        pkg.setData(Data([1, 2, 3]), for: "/word/media/ảnh mới.png", contentType: ContentType.png)
        let saved = try pkg.save()
        XCTAssertTrue(try ZipArchive(data: saved).contains("word/media/%E1%BA%A3nh%20m%E1%BB%9Bi.png"))
        // Gói cũ ghi tên UTF-8 thô (không đúng chuẩn) vẫn mở và sửa được.
        let legacy = try ZipArchive(data: try Fixtures.data("real/sample-writer.docx"))
        legacy.setContents(Data([9]), for: "word/media/ảnh.png", compression: .stored)
        let lp = try OPCPackage(data: legacy.serialize())
        XCTAssertEqual(try lp.data(of: "/word/media/ảnh.png"), Data([9]))
        lp.setData(Data([8]), for: "/word/media/ảnh.png")
        let re = try ZipArchive(data: try lp.save())
        XCTAssertEqual(try re.contents(of: "word/media/ảnh.png"), Data([8]), "giữ tên mục gốc khi ghi đè")
    }

    func testRemovePartAndGarbageCollect() throws {
        let original = try Fixtures.data("real/sample-sheet-charts.xlsx")
        let pkg = try OPCPackage(data: original)
        let sheet = PartName("/xl/worksheets/sheet1.xml")
        let reachableFromSheet = try pkg.partsReachable(from: sheet)
        XCTAssertTrue(reachableFromSheet.contains(PartName("/xl/charts/chart1.xml")))
        // Gỡ quan hệ drawing khỏi sheet → drawing, chart, style/colors của chart không còn đạt được.
        let rels = try pkg.relationships(of: sheet)
        for r in rels.filter(.drawing) { rels.remove(id: r.id) }
        let doc = try pkg.xml(sheet)
        for d in doc.root.children(NS.s, "drawing") { d.removeFromParent() }
        pkg.markModified(sheet)
        let gone = try pkg.removeUnreachable(among: reachableFromSheet)
        XCTAssertTrue(gone.contains(PartName("/xl/charts/chart1.xml")))
        XCTAssertTrue(gone.contains(PartName("/xl/drawings/drawing1.xml")))
        let saved = try pkg.save()
        XCTAssertEqual(PackageValidator.validate(saved), [])
        let re = try OPCPackage(data: saved)
        XCTAssertFalse(re.hasPart(PartName("/xl/charts/chart1.xml")))
        XCTAssertNil(re.contentTypes.overrides[PartName("/xl/charts/chart1.xml")])
    }

    func testValidatorFindsBrokenRelationship() throws {
        let pkg = try OPCPackage(data: try Fixtures.data("real/sample-writer-image.docx"))
        pkg.removePart(PartName("/word/media/image1.png"))
        let issues = PackageValidator.validate(try OPCPackage(data: try pkg.save()))
        XCTAssertTrue(issues.contains { $0.contains("image1.png") }, "\(issues)")
        // save(to:verify:) phải từ chối ghi đè khi gói hỏng.
        let pkg2 = try OPCPackage(data: try Fixtures.data("real/sample-writer-image.docx"))
        pkg2.removePart(PartName("/word/media/image1.png"))
        let url = try Fixtures.scratchDirectory("opc-verify").appendingPathComponent("x.docx")
        try Data("gốc".utf8).write(to: url)
        XCTAssertThrowsError(try pkg2.save(to: url))
        XCTAssertEqual(try Data(contentsOf: url), Data("gốc".utf8), "tệp đích giữ nguyên khi kiểm tra thất bại")
    }

    func testNotAnOOXMLPackage() throws {
        XCTAssertThrowsError(try OPCPackage(data: try Fixtures.data("zip/basic-deflate.zip").prefix(0))) { _ in }
        let a = try Fixtures.data("zip/unicode-names.zip")
        XCTAssertThrowsError(try OPCPackage(data: a)) { XCTAssertEqual($0 as? PackageError, .missingContentTypes) }
    }

    private func canonical(_ e: XElement) -> String {
        var s = "<\(e.name)"
        for a in e.attributes { s += " \(a.name)=\(a.value)" }
        s += ">"
        for c in e.children {
            switch c {
            case .element(let x): s += canonical(x)
            case .text(let t), .cdata(let t): s += "T(\(t))"
            case .comment(let t): s += "C(\(t))"
            case .processingInstruction(let t): s += "P(\(t))"
            }
        }
        return s + "</>"
    }
}
