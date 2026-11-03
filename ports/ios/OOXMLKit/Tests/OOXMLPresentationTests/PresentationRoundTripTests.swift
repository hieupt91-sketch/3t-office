import XCTest
@testable import OOXMLPresentation
import OOXMLPackage
import OOXMLTestSupport
import OOXMLZip

final class PresentationRoundTripTests: XCTestCase {
    let rich = "pptx/rich-deck.pptx"

    /// Lần theo relationship presProps từ presentation.xml.rels để tìm part
    /// (không đoán đường dẫn), khẳng định có đúng một relationship như vậy.
    private func presPropsPart(in data: Data) throws -> String {
        let rels = try RoundTrip.partString(data, "ppt/_rels/presentation.xml.rels")
        let chunks = rels.components(separatedBy: "relationships/presProps")
        XCTAssertEqual(chunks.count - 1, 1, "phải có đúng 1 relationship presProps: \(rels)")
        let tail = try XCTUnwrap(chunks.count == 2 ? chunks[1] : nil)
        let start = try XCTUnwrap(tail.range(of: "Target=\"")).upperBound
        let end = try XCTUnwrap(tail[start...].firstIndex(of: "\""))
        let target = String(tail[start..<end])
        return target.hasPrefix("/") ? String(target.dropFirst()) : "ppt/\(target)"
    }

    /// Xóa phần tử tự đóng chứa `needle` (dùng để dựng gói tổng hợp trong test).
    private static func removingSelfClosingElement(_ xml: String, containing needle: String) -> String {
        guard let hit = xml.range(of: needle),
              let start = xml[..<hit.lowerBound].range(of: "<", options: .backwards)?.lowerBound,
              let end = xml.range(of: "/>", range: hit.upperBound..<xml.endIndex)?.upperBound
        else { return xml }
        return String(xml[..<start]) + String(xml[end...])
    }

    private static func removingShowPr(_ xml: String) -> String {
        guard let s = xml.range(of: "<p:showPr"), let e = xml.range(of: "</p:showPr>") else { return xml }
        return String(xml[..<s.lowerBound]) + String(xml[e.upperBound...])
    }

    /// Dựng biến thể tổng hợp của rich-deck bằng phẫu thuật ZIP (bỏ/sửa part
    /// presProps) để kiểm các ca biên mà fixture thật không có.
    private func syntheticDeck(mutatePresProps: (String) -> String?) throws -> Data {
        let src = try ZipArchive(data: try Fixtures.data(rich))
        let out = ZipArchive()
        for name in src.entryNames {
            var data = try src.contents(of: name)
            if name == "ppt/presProps.xml" {
                guard let mutated = mutatePresProps(String(decoding: data, as: UTF8.self)) else { continue }
                data = Data(mutated.utf8)
            }
            if name == "ppt/_rels/presentation.xml.rels" {
                data = Data(Self.removingSelfClosingElement(String(decoding: data, as: UTF8.self),
                                                            containing: "relationships/presProps").utf8)
            }
            if name == "[Content_Types].xml" {
                data = Data(Self.removingSelfClosingElement(String(decoding: data, as: UTF8.self),
                                                            containing: "/ppt/presProps.xml").utf8)
            }
            out.setContents(data, for: name)
        }
        return out.serialize()
    }

    func testShowSettingsRoundTrip() throws {
        let original = try Fixtures.data(rich)
        let deck = try Presentation(data: original)
        // rich-deck có sẵn presProps (showPr chỉ đặt showNarration=1), còn lại mặc định.
        XCTAssertEqual(deck.showSettings, ShowSettings())
        try deck.setShowSettings(ShowSettings(loop: true, showAnimation: true, showNarration: false, useTimings: false))
        // Setter gọi lần 2: cập nhật tại chỗ, không tạo thêm part/relationship.
        try deck.setShowSettings(ShowSettings(loop: true, showAnimation: false, showNarration: false, useTimings: false))
        let saved = try deck.save()
        // presentation.xml không chứa cấu trúc sai vị trí.
        let pres = try RoundTrip.partString(saved, "ppt/presentation.xml")
        XCTAssertFalse(pres.contains("showSettings"), pres)
        XCTAssertFalse(pres.contains("presentationPr"), pres)
        // Part đích tìm qua relationship: root presentationPr, con showPr, đúng thuộc tính.
        let part = try presPropsPart(in: saved)
        XCTAssertEqual(part, "ppt/presProps.xml")
        let props = try RoundTrip.partString(saved, part)
        XCTAssertTrue(props.contains("<p:presentationPr"), props)
        XCTAssertTrue(props.contains("<p:showPr"), props)
        XCTAssertTrue(props.contains("loop=\"1\""), props)
        XCTAssertTrue(props.contains("showAnimation=\"0\""), props)
        XCTAssertTrue(props.contains("showNarration=\"0\""), props)
        XCTAssertTrue(props.contains("useTimings=\"0\""), props)
        XCTAssertFalse(props.contains("showSettings"), props)
        // Nội dung chưa biết trong showPr của fixture (present/sldAll/penClr) được giữ nguyên.
        XCTAssertTrue(props.contains("penClr"), props)
        XCTAssertTrue(props.contains("sldAll"), props)
        // Content type chuẩn của part presProps.
        let ct = try RoundTrip.partString(saved, "[Content_Types].xml")
        XCTAssertTrue(ct.contains("presentationml.presProps+xml"), ct)
        // Getter đọc lại là kiểm bổ sung.
        let reopened = try Presentation(data: saved)
        XCTAssertEqual(reopened.showSettings, ShowSettings(loop: true, showAnimation: false, showNarration: false, useTimings: false))
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["ppt/presProps.xml"],
                             requireChanged: ["ppt/presProps.xml"],
                             name: "pptx-show-settings.pptx")
    }

    func testShowSettingsCreatesPresPropsWhenMissing() throws {
        let synthetic = try syntheticDeck { _ in nil }  // bỏ hẳn part presProps + rel + override
        let deck = try Presentation(data: synthetic)
        XCTAssertEqual(deck.showSettings, ShowSettings())
        try deck.setShowSettings(ShowSettings(loop: true, showAnimation: true, showNarration: true, useTimings: true))
        let saved = try deck.save()
        let part = try presPropsPart(in: saved)
        let props = try RoundTrip.partString(saved, part)
        XCTAssertTrue(props.contains("<p:presentationPr"), props)
        XCTAssertTrue(props.contains("<p:showPr"), props)
        XCTAssertTrue(props.contains("loop=\"1\""), props)
        XCTAssertTrue(props.contains("useTimings=\"1\""), props)
        XCTAssertFalse(props.contains("showSettings"), props)
        let ct = try RoundTrip.partString(saved, "[Content_Types].xml")
        XCTAssertTrue(ct.contains("PartName=\"/ppt/presProps.xml\""), ct)
        XCTAssertTrue(ct.contains("presentationml.presProps+xml"), ct)
        let pres = try RoundTrip.partString(saved, "ppt/presentation.xml")
        XCTAssertFalse(pres.contains("showSettings"), pres)
        try RoundTrip.verify(original: synthetic, saved: saved,
                             allowedChanges: ["ppt/presProps.xml", "ppt/_rels/presentation.xml.rels", "[Content_Types].xml"],
                             requireChanged: ["ppt/presProps.xml", "ppt/_rels/presentation.xml.rels"],
                             name: "pptx-show-settings-create.pptx")
    }

    func testShowSettingsCreatesShowPrWhenPresPropsHasNone() throws {
        let synthetic = try syntheticDeckWithPresPropsNoShowPr()
        let deck = try Presentation(data: synthetic)
        XCTAssertEqual(deck.showSettings, ShowSettings())
        try deck.setShowSettings(ShowSettings(loop: false, showAnimation: true, showNarration: false, useTimings: true))
        let saved = try deck.save()
        let part = try presPropsPart(in: saved)
        let props = try RoundTrip.partString(saved, part)
        XCTAssertTrue(props.contains("<p:showPr"), props)
        XCTAssertTrue(props.contains("showNarration=\"0\""), props)
        XCTAssertTrue(props.contains("useTimings=\"1\""), props)
        try RoundTrip.verify(original: synthetic, saved: saved,
                             allowedChanges: ["ppt/presProps.xml"],
                             requireChanged: ["ppt/presProps.xml"],
                             name: "pptx-show-settings-noshowpr.pptx")
    }

    /// Biến thể: presProps còn part + relationship + override, chỉ thiếu showPr.
    private func syntheticDeckWithPresPropsNoShowPr() throws -> Data {
        let src = try ZipArchive(data: try Fixtures.data(rich))
        let out = ZipArchive()
        for name in src.entryNames {
            var data = try src.contents(of: name)
            if name == "ppt/presProps.xml" {
                data = Data(Self.removingShowPr(String(decoding: data, as: UTF8.self)).utf8)
            }
            out.setContents(data, for: name)
        }
        return out.serialize()
    }

    func testThemeExtraction() throws {
        let deck = try Presentation(data: try Fixtures.data(rich))
        let theme = try XCTUnwrap(deck.theme)
        XCTAssertEqual(theme.name, "Office")
        XCTAssertEqual(theme.colorSchemeName, "LibreOffice")
        XCTAssertEqual(theme.colors["dk1"], "000000")
        XCTAssertEqual(theme.colors["lt1"], "FFFFFF")
        XCTAssertEqual(theme.colors["accent1"], "18A303")
        XCTAssertEqual(theme.colors["accent2"], "0369A3")
        XCTAssertEqual(theme.colors["hlink"], "0000EE")
        XCTAssertEqual(theme.colors["folHlink"], "551A8B")
        XCTAssertEqual(theme.majorFontLatin, "Arial")
        XCTAssertEqual(theme.minorFontLatin, "Arial")
        XCTAssertTrue(theme.part.hasPrefix("/ppt/theme/theme"))
    }

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

    func testSlideTransitionReadSetRemove() throws {
        let original = try Fixtures.data(rich)
        let deck = try Presentation(data: original)
        // Slide 1 có transition p14 trong AlternateContent (Choice prism, Fallback fade).
        let before = deck.slides[0].transition
        XCTAssertEqual(before?.type, "prism")
        XCTAssertEqual(before?.speed, "slow")
        XCTAssertNil(deck.slides[1].transition, "slide 2 không có transition")
        try deck.slides[0].setTransition(type: "fade", speed: "fast", durationMs: 1000)
        let after = deck.slides[0].transition
        XCTAssertEqual(after?.type, "fade")
        XCTAssertEqual(after?.speed, "fast")
        XCTAssertEqual(after?.durationMs, 1000)
        XCTAssertTrue(deck.slides[0].removeTransition())
        XCTAssertNil(deck.slides[0].transition)
        XCTAssertFalse(deck.slides[0].removeTransition())
        let saved = try deck.save()
        let slideXML = try RoundTrip.partString(saved, "ppt/slides/slide1.xml")
        XCTAssertFalse(slideXML.contains("transition"), slideXML)
        XCTAssertFalse(slideXML.contains("prism"), slideXML)
        let reopened = try Presentation(data: saved)
        XCTAssertNil(reopened.slides[0].transition)
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["ppt/slides/slide1.xml"],
                             requireChanged: ["ppt/slides/slide1.xml"], name: "pptx-transition.pptx")
    }

    func testSlideFadeEntranceAndRemoveAnimations() throws {
        let original = try Fixtures.data(rich)
        let deck = try Presentation(data: original)
        XCTAssertTrue(deck.slides[0].animations.isEmpty, "slide 1 chỉ có tmRoot rỗng")
        try deck.slides[0].addFadeEntrance(shapeId: 3, delayMs: 100, durationMs: 600)
        let anims = deck.slides[0].animations
        XCTAssertEqual(anims.count, 1)
        XCTAssertEqual(anims[0].presetID, 10)
        XCTAssertEqual(anims[0].presetClass, "entr")
        XCTAssertEqual(anims[0].shapeId, 3)
        XCTAssertThrowsError(try deck.slides[0].addFadeEntrance(shapeId: 999))
        let saved = try deck.save()
        let slideXML = try RoundTrip.partString(saved, "ppt/slides/slide1.xml")
        XCTAssertTrue(slideXML.contains("presetID=\"10\""), slideXML)
        XCTAssertTrue(slideXML.contains("spid=\"3\""), slideXML)
        XCTAssertTrue(slideXML.contains("style.opacity"), slideXML)
        XCTAssertTrue(slideXML.contains("style.visibility"), slideXML)
        XCTAssertTrue(slideXML.contains("nodeType=\"mainSeq\""), slideXML)
        let reopened = try Presentation(data: saved)
        XCTAssertEqual(reopened.slides[0].animations.count, 1)
        XCTAssertEqual(reopened.slides[0].animations[0].shapeId, 3)
        // Xóa hoạt ảnh trên tài liệu thật có hiệu ứng sẵn.
        let original2 = try Fixtures.data("real/slides-saved-roundtrip.pptx")
        let deck2 = try Presentation(data: original2)
        XCTAssertFalse(deck2.slides[0].animations.isEmpty)
        deck2.slides[0].removeAnimations()
        XCTAssertTrue(deck2.slides[0].animations.isEmpty)
        let saved2 = try deck2.save()
        XCTAssertFalse(try RoundTrip.partString(saved2, "ppt/slides/slide1.xml").contains("p:timing"))
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["ppt/slides/slide1.xml"],
                             requireChanged: ["ppt/slides/slide1.xml"], name: "pptx-fade-entrance.pptx")
        try RoundTrip.verify(original: original2, saved: saved2,
                             allowedChanges: ["ppt/slides/slide1.xml"],
                             requireChanged: ["ppt/slides/slide1.xml"], name: "pptx-anim-remove.pptx")
    }

    func testSlideEntranceEffectAndAppear() throws {
        let original = try Fixtures.data(rich)
        let deck = try Presentation(data: original)
        let slide = deck.slides[0]
        try slide.addEntranceEffect(shapeId: 4, presetID: 3, filter: "blinds", delayMs: 100, durationMs: 800)
        try slide.addAppearEntrance(shapeId: 3)
        let steps = slide.animationSteps
        XCTAssertEqual(steps.count, 2)
        XCTAssertTrue(steps.contains { $0.presetID == 3 && $0.presetClass == "entr" && $0.shapeId == 4
            && $0.durationMs == 800 && $0.delayMs == 100 }, "steps: \(steps)")
        XCTAssertTrue(steps.contains { $0.presetID == 1 && $0.presetClass == "entr" && $0.shapeId == 3 }, "steps: \(steps)")
        XCTAssertThrowsError(try slide.addEntranceEffect(shapeId: 999, presetID: 3, filter: "blinds"))
        XCTAssertThrowsError(try slide.addEntranceEffect(shapeId: 4, presetID: 0, filter: "blinds"))
        XCTAssertThrowsError(try slide.addEntranceEffect(shapeId: 4, presetID: 3, filter: ""))
        let saved = try deck.save()
        XCTAssertEqual(PackageValidator.validate(saved), [])
        let slideXML = try RoundTrip.partString(saved, "ppt/slides/slide1.xml")
        XCTAssertTrue(slideXML.contains("<p:animEffect"), slideXML)
        XCTAssertTrue(slideXML.contains("filter=\"blinds\""), slideXML)
        XCTAssertTrue(slideXML.contains("presetID=\"1\""), slideXML)
        let reopened = try Presentation(data: saved)
        XCTAssertEqual(reopened.slides[0].animationSteps.count, 2)
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["ppt/slides/slide1.xml"],
                             requireChanged: ["ppt/slides/slide1.xml"], name: "pptx-entrance-effects.pptx")
    }

    func testSlideAnimationStepsAndSetTiming() throws {
        let original = try Fixtures.data(rich)
        let deck = try Presentation(data: original)
        XCTAssertTrue(deck.slides[0].animationSteps.isEmpty, "slide 1 chỉ có tmRoot rỗng")
        try deck.slides[0].addFadeEntrance(shapeId: 3, delayMs: 100, durationMs: 600)
        let steps = deck.slides[0].animationSteps
        XCTAssertEqual(steps.count, 1)
        XCTAssertEqual(steps[0].presetID, 10)
        XCTAssertEqual(steps[0].presetClass, "entr")
        XCTAssertEqual(steps[0].shapeId, 3)
        XCTAssertEqual(steps[0].durationMs, 600)
        XCTAssertEqual(steps[0].delayMs, 100)
        XCTAssertEqual(deck.slides[0].setAnimationTiming(shapeId: 999, durationMs: 1000), 0, "không có hiệu ứng cho hình lạ")
        XCTAssertEqual(deck.slides[0].setAnimationTiming(shapeId: 3, durationMs: 1200, delayMs: 250), 1)
        let changed = deck.slides[0].animationSteps
        XCTAssertEqual(changed[0].durationMs, 1200)
        XCTAssertEqual(changed[0].delayMs, 250)
        let saved = try deck.save()
        let slideXML = try RoundTrip.partString(saved, "ppt/slides/slide1.xml")
        XCTAssertTrue(slideXML.contains("dur=\"1200\""), slideXML)
        XCTAssertTrue(slideXML.contains("delay=\"250\""), slideXML)
        let reopened = try Presentation(data: saved)
        XCTAssertEqual(reopened.slides[0].animationSteps[0].durationMs, 1200)
        XCTAssertEqual(reopened.slides[0].animationSteps[0].delayMs, 250)
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["ppt/slides/slide1.xml"],
                             requireChanged: ["ppt/slides/slide1.xml"], name: "pptx-timing-steps.pptx")
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
