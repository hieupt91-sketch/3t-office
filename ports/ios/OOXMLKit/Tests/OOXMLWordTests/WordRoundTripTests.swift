import XCTest
@testable import OOXMLWord
import OOXMLPackage
import OOXMLTestSupport

final class WordRoundTripTests: XCTestCase {
    let rich = "docx/rich-word.docx"

    func testReadRichDocument() throws {
        let doc = try WordDocument(data: try Fixtures.data(rich))
        let ps = doc.paragraphs
        XCTAssertEqual(ps[0].text, "BÁO CÁO TỔNG KẾT NĂM 2026")
        XCTAssertEqual(ps[0].styleId, "Heading1")
        XCTAssertEqual(ps[1].text, "Kính gửi: Ban Giám đốc Công ty TNHH 3T Việt Nam.")
        XCTAssertEqual(ps[2].text, "Xem chi tiết tại trang web 3T.", "chữ trong hyperlink")
        XCTAssertEqual(ps[3].text, "Trang 1 / 3", "kết quả trường, không gồm mã trường")
        XCTAssertEqual(ps[4].text, "Nội dung đã bổ sung theo góp ý.", "gồm chữ chèn, bỏ chữ đã xóa")
        XCTAssertEqual(ps[8].text, "Đoạn có hộp văn bản.", "không lẫn chữ trong hộp văn bản")
        // Bảng: 3 hàng, ô gộp
        let t = doc.tables[0]
        XCTAssertEqual(t.rows.map { $0.map(\.text) }, [["Chỉ tiêu", "Giá trị"], ["Doanh thu", "Quý 3", "12,5 tỷ"], ["", "Quý 4", "14,1 tỷ"]])
        XCTAssertEqual(t.cell(row: 0, column: 0)?.gridSpan, 2)
        XCTAssertEqual(t.cell(row: 1, column: 0)?.verticalMerge, "restart")
        XCTAssertEqual(t.cell(row: 2, column: 0)?.verticalMerge, "continue")
        XCTAssertTrue(ps.contains { $0.text == "Ngày ký: 23/10/2026" }, "đoạn trong content control")
        XCTAssertTrue(ps.contains { $0.text == "12,5 tỷ" }, "đoạn trong bảng")
        XCTAssertEqual(doc.headers.first?.text, "  CÔNG TY TNHH 3T — Văn bản nội bộ")
        XCTAssertEqual(doc.footers.first?.text, "Trang 1 — Công ty TNHH 3T")
        XCTAssertTrue(doc.footnotes!.text.contains("Theo báo cáo kiểm toán số 12/2026"))
        XCTAssertEqual(doc.comments?.text, "Cần nguồn số liệu cho Công ty TNHH 3T.")
        XCTAssertTrue(doc.styles.contains(WordStyle(id: "Heading1", name: "heading 1", type: "paragraph")))
        let runs = ps[1].runs
        XCTAssertTrue(runs[0].isBold)
        XCTAssertEqual(runs[4].text, "HH 3T")
        XCTAssertEqual(runs[4].color, "C00000")
        XCTAssertEqual(runs[1].fontSize, 13)
    }

    func testEditSaveCloseReopenPreservesEverythingElse() throws {
        let original = try Fixtures.data(rich)
        let url = try Fixtures.scratchDirectory("docx-edit").appendingPathComponent("rich-edited.docx")
        do {
            let doc = try WordDocument(contentsOf: Fixtures.url(rich))
            let ps = doc.paragraphs
            ps[0].setText("BÁO CÁO TỔNG KẾT NĂM 2026 (SỬA ĐỔI)")
            ps[5].setText("Doanh thu tăng 18% so với năm trước.")       // giữ commentRange + commentReference
            ps[6].setText("Số liệu đã được kiểm toán độc lập")          // giữ footnoteReference
            try doc.insertParagraph("Đoạn mới chèn sau tiêu đề", style: "Heading2", after: ps[0])
            doc.appendParagraph("Kết luận: hoàn thành kế hoạch.")
            doc.tables[0].cell(row: 1, column: 2)?.setText("13,0 tỷ")
            try doc.save(to: url)
        }
        let doc = try WordDocument(contentsOf: url)
        let ps = doc.paragraphs
        XCTAssertEqual(ps[0].text, "BÁO CÁO TỔNG KẾT NĂM 2026 (SỬA ĐỔI)")
        XCTAssertTrue(ps[0].runs[0].isBold, "định dạng run đầu được giữ")
        XCTAssertEqual(ps[1].text, "Đoạn mới chèn sau tiêu đề")
        XCTAssertEqual(ps[1].styleId, "Heading2")
        XCTAssertEqual(ps[6].text, "Doanh thu tăng 18% so với năm trước.")
        XCTAssertEqual(ps[7].text, "Số liệu đã được kiểm toán độc lập")
        XCTAssertEqual(doc.tables[0].cell(row: 1, column: 2)?.text, "13,0 tỷ")
        XCTAssertEqual(ps.last?.text, "Kết luận: hoàn thành kế hoạch.")
        XCTAssertEqual(doc.body.container.elements.last?.localName, "sectPr", "sectPr vẫn là phần tử cuối")

        let saved = try Data(contentsOf: url)
        try RoundTrip.verify(original: original, saved: saved, allowedChanges: ["word/document.xml"],
                             requireChanged: ["word/document.xml"], name: "docx-edit.docx")
        let xml = try RoundTrip.partString(saved, "word/document.xml")
        for keep in ["<w:commentRangeStart w:id=\"0\"/>", "<w:commentReference w:id=\"0\"/>", "<w:footnoteReference w:id=\"1\"/>",
                     "<w:bookmarkStart w:id=\"0\" w:name=\"NguoiNhan\"/>", "<w:ins w:id=\"1\"", "<w:delText xml:space=\"preserve\">đã xóa </w:delText>",
                     "<w:instrText xml:space=\"preserve\"> PAGE </w:instrText>", "<mc:Fallback>", "<wps:txbx>", "r:embed=\"rId21\"",
                     "<w:gridSpan w:val=\"2\"/>", "<w:vMerge w:val=\"restart\"/>", "<w:alias w:val=\"Ngày ký\"/>",
                     "mc:Ignorable=\"w14 w15 wp14\"", "w14:paraId=\"10000002\"", "<w:numId w:val=\"1\"/>",
                     "<w:headerReference w:type=\"default\" r:id=\"rId8\"/>"] {
            XCTAssertTrue(xml.contains(keep), "mất: \(keep)")
        }
    }

    func testReplaceAcrossRunsAndStories() throws {
        let original = try Fixtures.data(rich)
        let doc = try WordDocument(data: original)
        // "Công ty TNHH 3T" bị chia thành 3 run: " Công ty " + "TN"(nghiêng) + "HH 3T"(đậm đỏ)
        let n = doc.replaceText("Công ty TNHH 3T", with: "Tập đoàn 3T Group")
        XCTAssertEqual(n, 6, "thân(1 + 2) + footer + footnote + comment")
        let saved = try doc.save()
        let re = try WordDocument(data: saved)
        XCTAssertEqual(re.paragraphs[1].text, "Kính gửi: Ban Giám đốc Tập đoàn 3T Group Việt Nam.")
        XCTAssertEqual(re.paragraphs.last?.text, "Tập đoàn 3T Group Việt Nam — Tập đoàn 3T Group")
        XCTAssertEqual(re.footers.first?.text, "Trang 1 — Tập đoàn 3T Group")
        XCTAssertTrue(re.footnotes!.text.contains("của Tập đoàn 3T Group."))
        XCTAssertEqual(re.comments?.text, "Cần nguồn số liệu cho Tập đoàn 3T Group.")
        XCTAssertEqual(re.headers.first?.text, "  CÔNG TY TNHH 3T — Văn bản nội bộ", "khác hoa/thường → không thay")
        // Định dạng: phần thay mới nằm trong run có ký tự đầu (" Công ty " → không đậm).
        let runs = re.paragraphs[1].runs.map(\.text)
        XCTAssertTrue(runs.contains(" Tập đoàn 3T Group"), "\(runs)")
        XCTAssertFalse(runs.contains("TN"))
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["word/document.xml", "word/footer1.xml", "word/footnotes.xml", "word/comments.xml"],
                             requireChanged: ["word/document.xml", "word/footer1.xml", "word/footnotes.xml", "word/comments.xml"],
                             name: "docx-replace.docx")
    }

    func testReplaceDoesNotCrossTabsAndHandlesDecomposedVietnamese() throws {
        let doc = try WordDocument(data: try Fixtures.data(rich))
        let p = doc.appendParagraph("A\tB")
        XCTAssertEqual(p.replaceText("A\tB", with: "x"), 0)
        // "Việt" dạng tổ hợp (NFD) vẫn khớp với chuỗi tìm dạng dựng sẵn (NFC).
        let nfd = "Vie\u{0323}\u{0302}t Nam"
        let q = doc.appendParagraph(nfd)
        XCTAssertEqual(q.replaceText("Việt", with: "VN"), 1)
        XCTAssertEqual(q.text, "VN Nam")
    }

    func testFormattingRuns() throws {
        let original = try Fixtures.data(rich)
        let doc = try WordDocument(data: original)
        let p = doc.paragraphs[2]
        p.runs[0].setItalic(true)
        p.runs[0].setColor("1F6FD0")
        p.runs[0].setFontSize(14)
        p.runs[0].setUnderline(true)
        let added = p.appendRun(" (cập nhật)", bold: true)
        XCTAssertTrue(added.isBold)
        doc.paragraphs[0].setBold(false)
        let saved = try doc.save()
        let re = try WordDocument(data: saved).paragraphs
        XCTAssertTrue(re[2].runs[0].isItalic)
        XCTAssertEqual(re[2].runs[0].color, "1F6FD0")
        XCTAssertEqual(re[2].runs[0].fontSize, 14)
        XCTAssertTrue(re[2].runs[0].isUnderlined)
        XCTAssertEqual(re[2].text, "Xem chi tiết tại trang web 3T. (cập nhật)")
        XCTAssertFalse(re[0].runs[0].isBold)
        let xml = try RoundTrip.partString(saved, "word/document.xml")
        // Thứ tự con trong rPr theo lược đồ: rFonts, i, color, sz, szCs, u
        XCTAssertTrue(xml.contains("<w:rPr><w:rFonts w:ascii=\"Times New Roman\" w:hAnsi=\"Times New Roman\"/><w:i/><w:color w:val=\"1F6FD0\"/><w:sz w:val=\"28\"/><w:szCs w:val=\"28\"/><w:u w:val=\"single\"/></w:rPr>"), xml)
        XCTAssertTrue(xml.contains("<w:b w:val=\"0\"/>"))
        try RoundTrip.verify(original: original, saved: saved, allowedChanges: ["word/document.xml"], name: "docx-format.docx")
    }

    func testInsertImageAddsMediaRelationshipAndContentType() throws {
        let original = try Fixtures.data(rich)
        let png = try Fixtures.data("real/sample-writer-image.docx") // ảnh PNG thật từ fixture khác
        let img = try OPCPackage(data: png).data(of: "/word/media/image1.png")
        let doc = try WordDocument(data: original)
        let p = try doc.insertImage(img, after: doc.paragraphs[0], description: "Biểu đồ \"doanh thu\" & lợi nhuận")
        XCTAssertEqual(p.text, "")
        let saved = try doc.save()
        let re = try WordDocument(data: saved)
        let pkg = re.package
        let images = try pkg.relatedParts(from: re.mainPart, .image)
        XCTAssertEqual(images.count, 2)
        let newImage = images.first { $0 != "/word/media/image1.png" }!
        XCTAssertEqual(newImage, "/word/media/image3.png", "không đè ảnh image2.png của header")
        XCTAssertEqual(try pkg.data(of: newImage), img)
        let xml = try RoundTrip.partString(saved, "word/document.xml")
        XCTAssertTrue(xml.contains("<wp:docPr id=\"4\" name=\"Hình 4\" descr=\"Biểu đồ &quot;doanh thu&quot; &amp; lợi nhuận\"/>"), "docPr id duy nhất (đã có 1,2,3)")
        XCTAssertEqual(re.paragraphs[1].element.descendants(NS.a, "blip").count, 1)
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["word/document.xml", "word/_rels/document.xml.rels", newImage.zipName],
                             requireChanged: ["word/_rels/document.xml.rels", newImage.zipName], name: "docx-image.docx")
    }

    func testRemoveParagraphRules() throws {
        let doc = try WordDocument(data: try Fixtures.data(rich))
        let before = doc.paragraphs.count
        try doc.removeParagraph(doc.paragraphs[2])
        XCTAssertEqual(doc.paragraphs.count, before - 1)
        let cell = doc.tables[0].cell(row: 0, column: 1)!
        try doc.removeParagraph(cell.paragraphs[0])
        XCTAssertEqual(cell.paragraphs.count, 1, "ô bảng giữ ít nhất 1 đoạn")
        XCTAssertEqual(cell.text, "")
        XCTAssertEqual(PackageValidator.validate(try doc.save()), [])
    }

    // MARK: Tệp thật (LibreOffice)

    func testEveryRealDOCXOpenEditSaveReopen() throws {
        let files = Fixtures.list("real", extensions: ["docx"])
        XCTAssertEqual(files.count, 7)
        for f in files {
            let original = try Fixtures.data(f)
            let doc = try WordDocument(data: original)
            let texts = doc.allStories.map(\.text)
            let added = doc.appendParagraph("Dòng thêm bởi OOXMLKit")
            XCTAssertEqual(added.text, "Dòng thêm bởi OOXMLKit")
            let saved = try doc.save()
            let re = try WordDocument(data: saved)
            XCTAssertEqual(re.paragraphs.last?.text, "Dòng thêm bởi OOXMLKit", f)
            var after = re.allStories.map(\.text)
            after[0] = after[0].replacingOccurrences(of: "\nDòng thêm bởi OOXMLKit", with: "")
            XCTAssertEqual(after, texts, "\(f): nội dung khác bị đổi")
            try RoundTrip.verify(original: original, saved: saved, allowedChanges: ["word/document.xml"],
                                 requireChanged: ["word/document.xml"], name: "real-edit-" + (f as NSString).lastPathComponent)
        }
    }

    func testRealTrackChangesAndCommentsReadable() throws {
        let tc = try WordDocument(data: try Fixtures.data("real/sample-writer-trackchanges.docx"))
        XCTAssertFalse(tc.text.isEmpty)
        let cm = try WordDocument(data: try Fixtures.data("real/sample-writer-comments.docx"))
        XCTAssertNotNil(cm.comments)
        XCTAssertFalse(cm.comments!.text.isEmpty)
        let hf = try WordDocument(data: try Fixtures.data("real/sample-writer-headerfooter.docx"))
        XCTAssertFalse(hf.headers.isEmpty)
        XCTAssertFalse(hf.footers.isEmpty)
        let fn = try WordDocument(data: try Fixtures.data("real/sample-writer-footnotes.docx"))
        XCTAssertNotNil(fn.footnotes)
        XCTAssertNotNil(fn.endnotes)
    }

    func testNotAWordDocument() throws {
        XCTAssertThrowsError(try WordDocument(data: try Fixtures.data("xlsx/rich-excel.xlsx"))) {
            XCTAssertEqual($0 as? WordError, .notAWordDocument)
        }
        XCTAssertThrowsError(try WordDocument(data: Data()))
    }

    func testRunTextEffectsRoundTrip() throws {
        let doc = try WordDocument(data: try Fixtures.data(rich))
        let run = doc.paragraphs[1].runs[0]
        XCTAssertFalse(run.isCaps)
        run.setCaps(true)
        run.setSmallCaps(true)
        run.setStrike(true)
        run.setDoubleStrike(true)
        run.setOutline(true)
        run.setShadow(true)
        run.setEmboss(true)
        run.setImprint(true)
        run.setVanish(true)
        let saved = try doc.save()
        let docXML = try RoundTrip.partString(saved, "word/document.xml")
        for tag in ["w:caps", "w:smallCaps", "w:strike", "w:dstrike", "w:outline", "w:shadow", "w:emboss", "w:imprint", "w:vanish"] {
            XCTAssertTrue(docXML.contains("<\(tag)"), docXML)
        }
        let reopened = try WordDocument(data: saved)
        let re = reopened.paragraphs[1].runs[0]
        XCTAssertTrue(re.isCaps && re.isSmallCaps && re.isStrike && re.isDoubleStrike)
        XCTAssertTrue(re.isOutline && re.isShadow && re.isEmboss && re.isImprint && re.isVanish)
        re.setCaps(false)
        re.setStrike(false)
        let cleared = try WordDocument(data: try reopened.save())
        XCTAssertFalse(cleared.paragraphs[1].runs[0].isCaps)
        XCTAssertFalse(cleared.paragraphs[1].runs[0].isStrike)
        XCTAssertTrue(cleared.paragraphs[1].runs[0].isShadow, "chỉ tắt caps/strike, shadow vẫn còn")
    }

    func testImageInfo() {
        XCTAssertNil(ImageInfo(Data([1, 2, 3])))
        let jpeg = Data([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x04, 0x00, 0x00, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x01, 0x2C, 0x02, 0x58, 0x03])
        let info = ImageInfo(jpeg)
        XCTAssertEqual(info?.width, 600)
        XCTAssertEqual(info?.height, 300)
        XCTAssertEqual(info?.ext, "jpeg")
    }

    func testParagraphSpacingRoundTrip() throws {
        let original = try Fixtures.data(rich)
        let doc = try WordDocument(data: original)
        try doc.paragraphs[0].setSpacing(before: 120, after: 60, line: 360, lineRule: "auto")
        let saved = try doc.save()
        let docXML = try RoundTrip.partString(saved, "word/document.xml")
        XCTAssertTrue(docXML.contains("<w:spacing"), docXML)
        XCTAssertTrue(docXML.contains("w:before=\"120\""), docXML)
        XCTAssertTrue(docXML.contains("w:line=\"360\""), docXML)
        let reopened = try WordDocument(data: saved)
        let spacing = reopened.paragraphs[0].spacing
        XCTAssertEqual(spacing?.before, 120)
        XCTAssertEqual(spacing?.after, 60)
        XCTAssertEqual(spacing?.line, 360)
        XCTAssertEqual(spacing?.lineRule, "auto")
        // Xóa spacing → mở lại không còn.
        try reopened.paragraphs[0].setSpacing()
        let cleared = try WordDocument(data: try reopened.save())
        XCTAssertNil(cleared.paragraphs[0].spacing)
        // Giá trị không hợp lệ bị từ chối, không ghi gì.
        XCTAssertThrowsError(try doc.paragraphs[0].setSpacing(before: -1))
        XCTAssertThrowsError(try doc.paragraphs[0].setSpacing(lineRule: "sai"))
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["word/document.xml"], requireChanged: ["word/document.xml"],
                             name: "docx-paragraph-spacing.docx")
    }
}
