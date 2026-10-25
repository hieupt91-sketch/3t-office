import XCTest
@testable import OOXMLPresentation
import OOXMLPackage
import OOXMLTestSupport

final class PresentationRoundTripTests: XCTestCase {
    let rich = "pptx/rich-deck.pptx"

    func testReadRichDeck() throws {
        let deck = try Presentation(data: try Fixtures.data(rich))
        XCTAssertEqual(deck.slides.count, 3)
        XCTAssertEqual(deck.slides.map(\.slideId), [256, 257, 258])
        XCTAssertEqual(deck.slideSize?.width, 12_192_000)
        XCTAssertEqual(deck.sections, [SlideSection(name: "Mở đầu", slideIds: [256]), SlideSection(name: "Nội dung", slideIds: [257, 258])])
        let s1 = deck.slides[0]
        XCTAssertEqual(s1.title, "Kế hoạch kinh doanh 2027")
        XCTAssertEqual(s1.shapes.map(\.kind), [.shape, .shape, .picture])
        XCTAssertEqual(s1.shapes[1].text, "Công ty TNHH 3T — 3t.vn")
        XCTAssertEqual(s1.shapes[2].imagePart, "/ppt/media/image1.png")
        XCTAssertEqual(s1.shapes[2].altText, "Logo đơn vị")
        XCTAssertEqual(s1.notesText, "Chào mừng, giới thiệu thành phần tham dự.\nNhấn mạnh mục tiêu Công ty TNHH 3T.")
        XCTAssertEqual(s1.layoutPart, "/ppt/slideLayouts/slideLayout1.xml")
        let s2 = deck.slides[1]
        XCTAssertEqual(s2.shapes[1].paragraphs, ["Tăng doanh thu 20%", "Mở rộng thị trường miền Trung", "Đà Nẵng, Huế", "Công ty TNHH 3T phát triển bền vững"])
        XCTAssertEqual(s2.shape(named: "Bảng 5")?.table, [["Quý", "Doanh thu"], ["Q4/2026", "14,1 tỷ"]])
        XCTAssertEqual(s2.shape(named: "Biểu đồ 6")?.chartPart, "/ppt/charts/chart1.xml")
        XCTAssertEqual(s2.shape(named: "Nhóm 7")?.children.map(\.text), ["Bước 1", "Bước 2"])
        XCTAssertEqual(s2.shape(named: "Hộp B")?.frame?.x, 2_438_200, "tìm được hình trong nhóm")
        XCTAssertNil(s2.notesText)
        XCTAssertEqual(deck.slides[2].shapes.map(\.kind), [.shape, .connector])
    }

    func testEditSaveCloseReopenPreservesEverythingElse() throws {
        let original = try Fixtures.data(rich)
        let url = try Fixtures.scratchDirectory("pptx-edit").appendingPathComponent("deck-edited.pptx")
        do {
            let deck = try Presentation(contentsOf: Fixtures.url(rich))
            let s1 = deck.slides[0]
            try s1.titleShape!.setText("Kế hoạch kinh doanh 2027 — bản trình HĐQT")
            try s1.setNotesText("Ghi chú mới dòng 1\nDòng 2")
            let s2 = deck.slides[1]
            try s2.shapes[1].setText("Tăng doanh thu 25%\nMở rộng ra miền Nam\nTP.HCM")
            try s2.shape(named: "Bảng 5")!.setTableCell(row: 1, column: 1, text: "15,0 tỷ")
            try deck.save(to: url)
        }
        let deck = try Presentation(contentsOf: url)
        let s1 = deck.slides[0]
        XCTAssertEqual(s1.title, "Kế hoạch kinh doanh 2027 — bản trình HĐQT")
        XCTAssertEqual(s1.notesText, "Ghi chú mới dòng 1\nDòng 2")
        XCTAssertEqual(deck.slides[1].shapes[1].paragraphs, ["Tăng doanh thu 25%", "Mở rộng ra miền Nam", "TP.HCM"])
        XCTAssertEqual(deck.slides[1].shape(named: "Bảng 5")?.table?[1], ["Q4/2026", "15,0 tỷ"])
        let saved = try Data(contentsOf: url)
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["ppt/slides/slide1.xml", "ppt/slides/slide2.xml", "ppt/notesSlides/notesSlide1.xml"],
                             requireChanged: ["ppt/slides/slide1.xml", "ppt/slides/slide2.xml", "ppt/notesSlides/notesSlide1.xml"],
                             name: "pptx-edit.pptx")
        let x1 = try RoundTrip.partString(saved, "ppt/slides/slide1.xml")
        XCTAssertTrue(x1.contains("<p14:prism/>"), "hiệu ứng chuyển p14 giữ nguyên")
        XCTAssertTrue(x1.contains("<mc:Fallback><p:transition spd=\"slow\"><p:fade/></p:transition></mc:Fallback>"))
        XCTAssertTrue(x1.contains("<a:hlinkClick r:id=\"rId3\"/>"), "liên kết của phụ đề giữ nguyên")
        XCTAssertTrue(x1.contains("<a:rPr lang=\"vi-VN\" dirty=\"0\"/><a:t>Kế hoạch kinh doanh 2027 — bản trình HĐQT</a:t>"))
        let x2 = try RoundTrip.partString(saved, "ppt/slides/slide2.xml")
        XCTAssertTrue(x2.contains("<a:pPr lvl=\"1\"/><a:r><a:rPr lang=\"vi-VN\" dirty=\"0\"/><a:t>Mở rộng ra miền Nam</a:t>"), "cấp thụt lề theo đoạn mẫu cùng vị trí")
        XCTAssertTrue(x2.contains("r:id=\"rId2\"/></a:graphicData>"), "biểu đồ giữ nguyên")
    }

    func testReplaceAcrossRunsSlidesAndNotes() throws {
        let original = try Fixtures.data(rich)
        let deck = try Presentation(data: original)
        XCTAssertEqual(deck.replaceText("kinh doanh 2027", with: "phát triển 2027"), 1, "khớp qua 2 run (đậm + thường)")
        XCTAssertEqual(deck.replaceText("Công ty TNHH 3T", with: "3T Group"), 3, "phụ đề + nội dung slide 2 + ghi chú")
        XCTAssertEqual(deck.replaceText("Bước", with: "Giai đoạn"), 2, "hình trong nhóm")
        let saved = try deck.save()
        let re = try Presentation(data: saved)
        XCTAssertEqual(re.slides[0].title, "Kế hoạch phát triển 2027")
        XCTAssertEqual(re.slides[0].shapes[1].text, "3T Group — 3t.vn")
        XCTAssertEqual(re.slides[1].shapes[1].paragraphs.last, "3T Group phát triển bền vững")
        XCTAssertEqual(re.slides[0].notesText, "Chào mừng, giới thiệu thành phần tham dự.\nNhấn mạnh mục tiêu 3T Group.")
        XCTAssertEqual(re.slides[1].shape(named: "Nhóm 7")?.children.map(\.text), ["Giai đoạn 1", "Giai đoạn 2"])
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["ppt/slides/slide1.xml", "ppt/slides/slide2.xml", "ppt/notesSlides/notesSlide1.xml"],
                             name: "pptx-replace.pptx")
    }

    func testDuplicateSlideCopiesChartAndUpdatesSections() throws {
        let original = try Fixtures.data(rich)
        let deck = try Presentation(data: original)
        let dup = try deck.duplicateSlide(at: 1)
        XCTAssertEqual(dup.slideId, 259)
        XCTAssertEqual(dup.part, "/ppt/slides/slide4.xml")
        try dup.titleShape!.setText("Mục tiêu năm 2028")
        let saved = try deck.save()
        let re = try Presentation(data: saved)
        XCTAssertEqual(re.slides.map(\.slideId), [256, 257, 259, 258])
        XCTAssertEqual(re.slides.map { $0.title ?? "" }, ["Kế hoạch kinh doanh 2027", "Mục tiêu năm 2027", "Mục tiêu năm 2028", "Cảm ơn quý vị!"])
        XCTAssertEqual(re.sections[1].slideIds, [257, 259, 258])
        let newChart = re.slides[2].shape(named: "Biểu đồ 6")!.chartPart!
        XCTAssertEqual(newChart, "/ppt/charts/chart2.xml", "biểu đồ được sao chép riêng")
        let pkg = re.package
        let emb = try pkg.relatedParts(from: newChart, .package)
        XCTAssertEqual(emb, ["/ppt/embeddings/Microsoft_Excel_Worksheet1.xlsx"])
        XCTAssertEqual(try pkg.data(of: emb[0]), try pkg.data(of: "/ppt/embeddings/Microsoft_Excel_Worksheet.xlsx"))
        XCTAssertEqual(try pkg.relatedPart(from: re.slides[2].part, .slideLayout), "/ppt/slideLayouts/slideLayout2.xml", "layout dùng chung")
        XCTAssertNil(re.slides[2].notesPart)
        XCTAssertTrue(try pkg.relatedParts(from: re.slides[2].part, .comments).isEmpty, "bình luận không nhân bản")
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["ppt/presentation.xml", "ppt/_rels/presentation.xml.rels", "[Content_Types].xml",
                                              "ppt/slides/slide4.xml", "ppt/slides/_rels/slide4.xml.rels", "ppt/charts/chart2.xml",
                                              "ppt/charts/_rels/chart2.xml.rels", "ppt/embeddings/Microsoft_Excel_Worksheet1.xlsx", "docProps/app.xml"],
                             requireChanged: ["ppt/slides/slide4.xml", "ppt/charts/chart2.xml"], name: "pptx-duplicate.pptx")
        XCTAssertTrue(try RoundTrip.partString(saved, "docProps/app.xml").contains("<Slides>4</Slides>"))
    }

    func testDeleteSlideRemovesOwnedPartsOnly() throws {
        let original = try Fixtures.data(rich)
        let deck = try Presentation(data: original)
        try deck.deleteSlide(at: 0)
        let saved = try deck.save()
        let re = try Presentation(data: saved)
        XCTAssertEqual(re.slides.map(\.slideId), [257, 258])
        XCTAssertEqual(re.sections.map(\.slideIds), [[], [257, 258]])
        let pkg = re.package
        for gone in ["/ppt/slides/slide1.xml", "/ppt/notesSlides/notesSlide1.xml", "/ppt/media/image1.png"] {
            XCTAssertFalse(pkg.hasPart(PartName(gone)), gone)
        }
        for kept in ["/ppt/slideLayouts/slideLayout1.xml", "/ppt/notesMasters/notesMaster1.xml", "/ppt/theme/theme2.xml", "/ppt/charts/chart1.xml"] {
            XCTAssertTrue(pkg.hasPart(PartName(kept)), kept)
        }
        let pres = try RoundTrip.partString(saved, "ppt/presentation.xml")
        XCTAssertTrue(pres.contains("<p:sldLst><p:sld r:id=\"rId4\"/></p:sldLst>"), "custShow bỏ slide đã xóa")
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["ppt/presentation.xml", "ppt/_rels/presentation.xml.rels", "[Content_Types].xml",
                                              "ppt/slides/slide1.xml", "ppt/slides/_rels/slide1.xml.rels", "ppt/notesSlides/*",
                                              "ppt/media/image1.png", "docProps/app.xml"], name: "pptx-delete.pptx")
    }

    func testMoveSlideKeepsSectionsContiguous() throws {
        let deck = try Presentation(data: try Fixtures.data(rich))
        try deck.moveSlide(from: 2, to: 0)
        let re = try Presentation(data: try deck.save())
        XCTAssertEqual(re.slides.map(\.slideId), [258, 256, 257])
        XCTAssertEqual(re.sections.map(\.slideIds), [[258, 256], [257]])
        XCTAssertThrowsError(try deck.moveSlide(from: 5, to: 0))
    }

    func testCreateNotesForSlideWithoutNotes() throws {
        let original = try Fixtures.data(rich)
        let deck = try Presentation(data: original)
        try deck.slides[2].setNotesText("Kết thúc, mời đặt câu hỏi.")
        let saved = try deck.save()
        let re = try Presentation(data: saved)
        XCTAssertEqual(re.slides[2].notesText, "Kết thúc, mời đặt câu hỏi.")
        XCTAssertEqual(re.slides[2].notesPart, "/ppt/notesSlides/notesSlide2.xml")
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["[Content_Types].xml", "ppt/slides/_rels/slide3.xml.rels", "ppt/notesSlides/notesSlide2.xml",
                                              "ppt/notesSlides/_rels/notesSlide2.xml.rels"], name: "pptx-newnotes.pptx")
    }

    func testCreateNotesMasterWhenDeckDoesNotHaveOne() throws {
        let package = try OPCPackage(data: Fixtures.data(rich))
        let presentation = try Presentation(package: package)
        let master = try XCTUnwrap(package.relatedPart(from: presentation.mainPart, .notesMaster))
        let presentationRels = try package.relationships(of: presentation.mainPart)
        for relationship in presentationRels.filter(.notesMaster) { presentationRels.remove(id: relationship.id) }
        try package.xml(presentation.mainPart).root.firstChild(NS.p, "notesMasterIdLst")?.removeFromParent()
        package.removePart(master)

        let withoutMaster = try package.save()
        let deck = try Presentation(data: withoutMaster)
        try deck.slides[1].setNotesText("Ghi chú tạo master mới")
        let saved = try deck.save()
        let reopened = try Presentation(data: saved)
        XCTAssertEqual(reopened.slides[1].notesText, "Ghi chú tạo master mới")
        let notesMaster = try XCTUnwrap(reopened.package.relatedPart(from: reopened.mainPart, .notesMaster))
        XCTAssertTrue(reopened.package.hasPart(notesMaster))
        XCTAssertEqual(reopened.package.contentType(of: notesMaster), "application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml")
        XCTAssertEqual(PackageValidator.validate(saved), [])
        let masterRel = try reopened.package.relationships(of: notesMaster)
        XCTAssertEqual(masterRel.filter(.theme).count, 1)
        let presentationXML = try reopened.package.xml(reopened.mainPart).root
        XCTAssertLessThan(
            try XCTUnwrap(presentationXML.elements.firstIndex { $0.is(NS.p, "notesMasterIdLst") }),
            try XCTUnwrap(presentationXML.elements.firstIndex { $0.is(NS.p, "sldIdLst") })
        )
        try RoundTrip.verify(
            original: withoutMaster,
            saved: saved,
            allowedChanges: ["[Content_Types].xml", "ppt/presentation.xml", "ppt/_rels/presentation.xml.rels",
                             "ppt/notesMasters/notesMaster1.xml", "ppt/notesMasters/_rels/notesMaster1.xml.rels",
                             "ppt/slides/_rels/slide2.xml.rels", "ppt/notesSlides/notesSlide2.xml",
                             "ppt/notesSlides/_rels/notesSlide2.xml.rels"],
            requireChanged: ["ppt/presentation.xml", "ppt/_rels/presentation.xml.rels", "ppt/notesMasters/notesMaster1.xml",
                             "ppt/notesMasters/_rels/notesMaster1.xml.rels", "ppt/notesSlides/notesSlide2.xml"],
            name: "pptx-add-notes-master.pptx"
        )
    }

    // MARK: Tệp thật (LibreOffice + SmartArt đóng gói tay)

    func testEveryRealPPTXOpenEditSaveReopen() throws {
        let files = Fixtures.list("real", extensions: ["pptx"])
        XCTAssertEqual(files.count, 5)
        for f in files {
            let original = try Fixtures.data(f)
            let deck = try Presentation(data: original)
            let before = deck.slides.map(\.text)
            guard let target = deck.slides.first?.allShapes.first(where: \.hasTextFrame) else { XCTFail(f); continue }
            let oldText = target.text
            try target.setText("Sửa bởi OOXMLKit")
            let saved = try deck.save()
            let re = try Presentation(data: saved)
            var after = re.slides.map(\.text)
            XCTAssertTrue(after[0].contains("Sửa bởi OOXMLKit"), f)
            after[0] = after[0].replacingOccurrences(of: "Sửa bởi OOXMLKit", with: oldText)
            XCTAssertEqual(after, before, "\(f): nội dung khác bị đổi")
            try RoundTrip.verify(original: original, saved: saved, allowedChanges: [deck.slides[0].part.zipName],
                                 requireChanged: [deck.slides[0].part.zipName], name: "real-edit-" + (f as NSString).lastPathComponent)
        }
    }

    func testRealDeckDuplicateAndDelete() throws {
        for f in ["real/sample-slides-notes.pptx", "real/sample-slides-comments.pptx", "real/sample-slides-smartart.pptx"] {
            let original = try Fixtures.data(f)
            let deck = try Presentation(data: original)
            let n = deck.slides.count
            try deck.duplicateSlide(at: 0)
            try deck.deleteSlide(at: n) // xóa slide cuối
            let saved = try deck.save()
            let re = try Presentation(data: saved)
            XCTAssertEqual(re.slides.count, n, f)
            try RoundTrip.verify(original: original, saved: saved, allowedChanges: ["*"], name: "real-dupdel-" + (f as NSString).lastPathComponent)
        }
    }

    func testSmartArtDuplicateCopiesDiagramParts() throws {
        let deck = try Presentation(data: try Fixtures.data("real/sample-slides-smartart.pptx"))
        let dup = try deck.duplicateSlide(at: 0)
        let pkg = deck.package
        let data = try pkg.relatedParts(from: dup.part, .diagramData)
        XCTAssertEqual(data.count, 1)
        XCTAssertNotEqual(data.first, "/ppt/diagrams/data1.xml", "dữ liệu SmartArt được sao chép riêng")
        XCTAssertEqual(try pkg.data(of: data[0]), try pkg.data(of: "/ppt/diagrams/data1.xml"))
    }

    func testNotAPresentation() throws {
        XCTAssertThrowsError(try Presentation(data: try Fixtures.data("docx/rich-word.docx"))) {
            XCTAssertEqual($0 as? PresentationError, .notAPresentation)
        }
    }
}
