import XCTest
@testable import OOXMLPresentation
import OOXMLPackage
import OOXMLTestSupport

/// Phase 5 — thêm slide mới từ layout (Home ▸ New Slide).
final class Phase5SlideTests: XCTestCase {
    func testAddSlideFromLayoutSaveReopen() throws {
        let original = try Fixtures.data("pptx/rich-deck.pptx")
        let deck = try Presentation(data: original)
        XCTAssertEqual(deck.layouts.map(\.name), ["Title Slide", "Title and Content"])
        let slide = try deck.addSlide(layout: deck.layouts[1].part, at: 1)
        XCTAssertEqual(slide.shapes.map(\.placeholderType), ["title", "body"])
        try slide.titleShape!.setText("Bối cảnh thị trường")
        try slide.shapes[1].setText("Cạnh tranh tăng\nChi phí đầu vào ổn định")
        let saved = try deck.save()
        let re = try Presentation(data: saved)
        XCTAssertEqual(re.slides.map(\.slideId), [256, 259, 257, 258])
        XCTAssertEqual(re.slides[1].title, "Bối cảnh thị trường")
        XCTAssertEqual(re.slides[1].shapes[1].paragraphs, ["Cạnh tranh tăng", "Chi phí đầu vào ổn định"])
        XCTAssertEqual(re.slides[1].layoutPart, "/ppt/slideLayouts/slideLayout2.xml")
        XCTAssertEqual(re.sections.map(\.slideIds), [[256, 259], [257, 258]], "vào phân đoạn của slide đứng trước")
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["ppt/presentation.xml", "ppt/_rels/presentation.xml.rels", "[Content_Types].xml",
                                              "ppt/slides/slide4.xml", "ppt/slides/_rels/slide4.xml.rels", "docProps/app.xml"],
                             requireChanged: ["ppt/slides/slide4.xml"], name: "p5-add-slide.pptx")
    }

    func testAddSlideToRealDecks() throws {
        for f in Fixtures.list("real", extensions: ["pptx"]) {
            let deck = try Presentation(data: try Fixtures.data(f))
            let n = deck.slides.count
            guard let layout = deck.layouts.first else { XCTFail(f); continue }
            let s = try deck.addSlide(layout: layout.part)
            if let t = s.allShapes.first(where: \.hasTextFrame) { try t.setText("Slide mới") }
            let saved = try deck.save()
            XCTAssertEqual(try Presentation(data: saved).slides.count, n + 1, f)
            let base = Set(PackageValidator.validate(try Fixtures.data(f)))
            XCTAssertEqual(PackageValidator.validate(saved).filter { !base.contains($0) }, [], f)
            Fixtures.publishArtifact(saved, name: "p5-addslide-" + (f as NSString).lastPathComponent)
        }
    }
}

final class Phase5ImageTests: XCTestCase {
    func testReplaceImageOwnedBySingleSlide() throws {
        let original = try Fixtures.data("pptx/rich-deck.pptx")
        let deck = try Presentation(data: original)
        let newPNG = try OPCPackage(data: try Fixtures.data("real/sample-writer-image.docx")).data(of: "/word/media/image1.png")
        let pic = deck.slides[0].shape(named: "Logo 3T")!
        let frame = pic.frame!
        try pic.replaceImage(newPNG)
        let saved = try deck.save()
        let re = try Presentation(data: saved)
        let p2 = re.slides[0].shape(named: "Logo 3T")!
        XCTAssertEqual(p2.imagePart, "/ppt/media/image2.png")
        XCTAssertEqual(try re.package.data(of: p2.imagePart!), newPNG)
        XCTAssertEqual(p2.frame!.width, frame.width, "giữ kích thước")
        XCTAssertFalse(re.package.hasPart("/ppt/media/image1.png"), "ảnh cũ không còn ai dùng → xóa")
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["ppt/slides/slide1.xml", "ppt/slides/_rels/slide1.xml.rels", "ppt/media/image1.png", "ppt/media/image2.png"],
                             requireChanged: ["ppt/media/image2.png"], name: "p5-replace-image.pptx")
    }

    func testReplaceImageSharedWithDuplicateKeepsOriginal() throws {
        let deck = try Presentation(data: try Fixtures.data("pptx/rich-deck.pptx"))
        let dup = try deck.duplicateSlide(at: 0) // slide nhân bản dùng chung image1.png
        try dup.shape(named: "Logo 3T")!.replaceImage(Data([0x89, 0x50, 0x4E, 0x47, 0, 0, 0, 0]))
        let re = try Presentation(data: try deck.save())
        XCTAssertEqual(re.slides[0].shape(named: "Logo 3T")?.imagePart, "/ppt/media/image1.png", "slide gốc giữ ảnh cũ")
        XCTAssertTrue(re.package.hasPart("/ppt/media/image1.png"))
        XCTAssertNotEqual(re.slides[1].shape(named: "Logo 3T")?.imagePart, "/ppt/media/image1.png")
        XCTAssertThrowsError(try re.slides[0].shape(named: "Logo 3T")!.replaceImage(Data("không phải ảnh".utf8)))
    }
}
