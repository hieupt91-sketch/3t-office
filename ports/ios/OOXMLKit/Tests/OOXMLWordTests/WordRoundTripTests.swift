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

    func testParagraphNumberingRoundTrip() throws {
        let original = try Fixtures.data(rich)
        let doc = try WordDocument(data: original)
        let p0 = doc.paragraphs[0]
        XCTAssertNil(p0.numbering)
        // Dùng lại num decimal sẵn có của fixture (abstract 0, num 1).
        try p0.setNumbering(.decimal)
        XCTAssertEqual(p0.numbering?.numId, 1)
        XCTAssertEqual(p0.numbering?.level, 0)
        XCTAssertEqual(doc.numberingFormat(numId: 1, level: 0), "decimal")
        // Bullet chưa có -> tạo abstractNum + num mới.
        try p0.setNumbering(.bullet)
        let bullet = try XCTUnwrap(p0.numbering)
        XCTAssertNotEqual(bullet.numId, 1)
        XCTAssertEqual(doc.numberingFormat(numId: bullet.numId, level: 0), "bullet")
        let saved = try doc.save()
        let numberingXML = try RoundTrip.partString(saved, "word/numbering.xml")
        XCTAssertTrue(numberingXML.contains("w:val=\"bullet\""), numberingXML)
        let docXML = try RoundTrip.partString(saved, "word/document.xml")
        XCTAssertTrue(docXML.contains("<w:numPr>"), docXML)
        let reopened = try WordDocument(data: saved)
        XCTAssertEqual(reopened.paragraphs[0].numbering?.numId, bullet.numId)
        reopened.paragraphs[0].removeNumbering()
        let cleared = try WordDocument(data: try reopened.save())
        XCTAssertNil(cleared.paragraphs[0].numbering)
        XCTAssertThrowsError(try doc.paragraphs[0].setNumbering(.decimal, level: 9))
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["word/document.xml", "word/numbering.xml"],
                             requireChanged: ["word/document.xml", "word/numbering.xml"],
                             name: "docx-paragraph-numbering.docx")
    }

    func testInsertFieldRoundTrip() throws {
        let original = try Fixtures.data(rich)
        let doc = try WordDocument(data: original)
        let p0 = doc.paragraphs[0]
        let before = p0.text
        _ = try p0.appendField(instruction: "PAGE", result: "1")
        XCTAssertTrue(p0.text.hasSuffix("1"), p0.text)
        XCTAssertTrue(p0.text.hasPrefix(before))
        _ = try p0.appendField(instruction: "NUMPAGES")
        XCTAssertThrowsError(try p0.appendField(instruction: "   "))
        let saved = try doc.save()
        let docXML = try RoundTrip.partString(saved, "word/document.xml")
        XCTAssertTrue(docXML.contains("fldCharType=\"begin\""), docXML)
        XCTAssertTrue(docXML.contains("fldCharType=\"separate\""), docXML)
        XCTAssertTrue(docXML.contains("fldCharType=\"end\""), docXML)
        XCTAssertTrue(docXML.contains("> PAGE <"), docXML)
        XCTAssertTrue(docXML.contains("> NUMPAGES <"), docXML)
        let reopened = try WordDocument(data: saved)
        XCTAssertTrue(reopened.paragraphs[0].text.hasSuffix("1"))
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["word/document.xml"],
                             requireChanged: ["word/document.xml"],
                             name: "docx-insert-field.docx")
    }

    func testSectionPropertiesRoundTrip() throws {
        let original = try Fixtures.data(rich)
        let doc = try WordDocument(data: original)
        let sec = doc.sections[0]
        // Đọc giá trị sẵn có của fixture (A4, lề như tệp gốc).
        XCTAssertEqual(sec.pageSize, SectionPageSize(width: 11906, height: 16838, orientation: .portrait))
        XCTAssertEqual(sec.margins, SectionMargins(top: 1134, right: 851, bottom: 1134, left: 1701, header: 709, footer: 709, gutter: 0))
        XCTAssertEqual(sec.breakType, .nextPage)
        XCTAssertFalse(sec.titlePage)
        XCTAssertEqual(sec.columnCount, 1)
        // Ghi giá trị mới.
        try sec.setPageSize(SectionPageSize(width: 11906, height: 8391, orientation: .landscape))
        try sec.setMargins(SectionMargins(top: 1440, right: 1440, bottom: 1440, left: 1440, header: 720, footer: 720, gutter: 0))
        sec.setBreakType(.continuous)
        sec.setTitlePage(true)
        try sec.setColumnCount(2)
        XCTAssertThrowsError(try sec.setPageSize(SectionPageSize(width: 0, height: 100, orientation: .portrait)))
        XCTAssertThrowsError(try sec.setMargins(SectionMargins(top: -1, right: 0, bottom: 0, left: 0, header: 0, footer: 0, gutter: 0)))
        XCTAssertThrowsError(try sec.setColumnCount(0))
        let saved = try doc.save()
        XCTAssertEqual(PackageValidator.validate(saved), [])
        let docXML = try RoundTrip.partString(saved, "word/document.xml")
        let sect = try XCTUnwrap(docXML.range(of: "<w:sectPr"))
        let sectEnd = try XCTUnwrap(docXML.range(of: "</w:sectPr>"))
        let sectXML = String(docXML[sect.lowerBound..<sectEnd.upperBound])
        XCTAssertTrue(sectXML.contains("w:orient=\"landscape\""), sectXML)
        XCTAssertTrue(sectXML.contains("w:val=\"continuous\""), sectXML)
        XCTAssertTrue(sectXML.contains("<w:titlePg"), sectXML)
        XCTAssertTrue(sectXML.contains("w:num=\"2\""), sectXML)
        // Thứ tự con theo schema CT_SectPr: type < pgSz < pgMar < cols < titlePg.
        var order: [String.Index] = []
        for marker in ["<w:type", "<w:pgSz", "<w:pgMar", "<w:cols", "<w:titlePg"] {
            order.append(try XCTUnwrap(sectXML.range(of: marker)).lowerBound)
        }
        XCTAssertEqual(order, order.sorted(), sectXML)
        let reopened = try WordDocument(data: saved)
        let sec2 = reopened.sections[0]
        XCTAssertEqual(sec2.pageSize, SectionPageSize(width: 11906, height: 8391, orientation: .landscape))
        XCTAssertEqual(sec2.margins?.top, 1440)
        XCTAssertEqual(sec2.breakType, .continuous)
        XCTAssertTrue(sec2.titlePage)
        XCTAssertEqual(sec2.columnCount, 2)
        // Đặt lại mặc định: nextPage bỏ phần tử type, titlePage tắt bỏ phần tử.
        sec2.setBreakType(.nextPage)
        sec2.setTitlePage(false)
        let saved2 = try sec2.document.save()
        let docXML2 = try RoundTrip.partString(saved2, "word/document.xml")
        XCTAssertFalse(docXML2.contains("w:val=\"continuous\""), docXML2)
        XCTAssertFalse(docXML2.contains("<w:titlePg"), docXML2)
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["word/document.xml"],
                             requireChanged: ["word/document.xml"],
                             name: "docx-section-properties.docx")
    }

    func testInsertFootnoteRoundTrip() throws {
        // Part đã có sẵn (chỉ separator 0/1): id bắt đầu từ 2.
        let original = try Fixtures.data(rich)
        let doc = try WordDocument(data: original)
        let id = try doc.paragraphs[0].appendFootnote("Chú thích đầu tiên")
        XCTAssertEqual(id, 2)
        let id2 = try doc.paragraphs[0].appendFootnote("Chú thích thứ hai")
        XCTAssertEqual(id2, 3)
        XCTAssertEqual(doc.footnotes?.paragraphs.map(\.text).contains("Chú thích đầu tiên"), true)
        var saved = try doc.save()
        XCTAssertEqual(PackageValidator.validate(saved), [])
        let docXML = try RoundTrip.partString(saved, "word/document.xml")
        XCTAssertTrue(docXML.contains("footnoteReference w:id=\"2\""), docXML)
        let fnXML = try RoundTrip.partString(saved, "word/footnotes.xml")
        XCTAssertTrue(fnXML.contains("Chú thích đầu tiên"), fnXML)
        let reopened = try WordDocument(data: saved)
        XCTAssertEqual(reopened.footnotes?.paragraphs.map(\.text).contains("Chú thích thứ hai"), true)
        // Endnote tương tự (part endnotes của fixture cũng chỉ có separator).
        let eid = try reopened.paragraphs[0].appendEndnote("Ghi chú cuối")
        XCTAssertEqual(eid, 2)
        saved = try reopened.save()
        let enXML = try RoundTrip.partString(saved, "word/endnotes.xml")
        XCTAssertTrue(enXML.contains("Ghi chú cuối"), enXML)
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["word/document.xml", "word/footnotes.xml", "word/endnotes.xml"],
                             requireChanged: ["word/document.xml", "word/footnotes.xml"],
                             name: "docx-insert-footnote.docx")
        // Chưa có part: tạo mới kèm separator + quan hệ + content type.
        let plain = try Fixtures.data("real/sample-writer.docx")
        let doc2 = try WordDocument(data: plain)
        XCTAssertNil(doc2.footnotes)
        let nid = try doc2.paragraphs[0].appendFootnote("Tạo part mới")
        XCTAssertEqual(nid, 2)
        let saved2 = try doc2.save()
        XCTAssertEqual(PackageValidator.validate(saved2), [])
        let pkg = try OPCPackage(data: saved2)
        XCTAssertTrue(pkg.partNames.map(\.value).contains("/word/footnotes.xml"))
        let fn2 = try RoundTrip.partString(saved2, "word/footnotes.xml")
        XCTAssertTrue(fn2.contains("w:type=\"separator\""), fn2)
        XCTAssertTrue(fn2.contains("Tạo part mới"), fn2)
        let reopened2 = try WordDocument(data: saved2)
        XCTAssertEqual(reopened2.footnotes?.paragraphs.map(\.text).contains("Tạo part mới"), true)
        try RoundTrip.verify(original: plain, saved: saved2,
                             allowedChanges: ["word/document.xml", "word/footnotes.xml",
                                              "word/_rels/document.xml.rels", "[Content_Types].xml"],
                             requireChanged: ["word/document.xml", "word/footnotes.xml"],
                             name: "docx-create-footnotes-part.docx")
        // Part có sẵn chú thích thật (id tới 3): id mới = 4, số đoạn tăng đúng 1.
        let withNotes = try Fixtures.data("real/sample-writer-footnotes.docx")
        let doc3 = try WordDocument(data: withNotes)
        let before = doc3.footnotes?.paragraphs.count
        let nid3 = try doc3.paragraphs[0].appendFootnote("Chú thích thêm")
        XCTAssertEqual(nid3, 4)
        XCTAssertEqual(doc3.footnotes?.paragraphs.count, (before ?? 0) + 1)
    }

    func testWatermarkRoundTrip() throws {
        // Tài liệu đã có header: chèn vào chính header đó.
        let original = try Fixtures.data(rich)
        let doc = try WordDocument(data: original)
        XCTAssertNil(doc.watermarkText)
        try doc.setWatermark("BẢN NHÁP")
        XCTAssertEqual(doc.watermarkText, "BẢN NHÁP")
        var saved = try doc.save()
        XCTAssertEqual(PackageValidator.validate(saved), [])
        let pkg = try OPCPackage(data: saved)
        let headerPart = try XCTUnwrap(pkg.partNames.first { $0.value.contains("header") })
        let headerXML = try RoundTrip.partString(saved, String(headerPart.value.dropFirst()))
        XCTAssertTrue(headerXML.contains("<v:shape"), headerXML)
        XCTAssertTrue(headerXML.contains("string=\"BẢN NHÁP\""), headerXML)
        // Đặt lại = thay thế, không nhân đôi.
        try doc.setWatermark("MẬT")
        XCTAssertEqual(doc.watermarkText, "MẬT")
        saved = try doc.save()
        let headerXML2 = try RoundTrip.partString(saved, String(headerPart.value.dropFirst()))
        XCTAssertEqual(headerXML2.components(separatedBy: "VNOfficeWatermark").count - 1, 1, headerXML2)
        XCTAssertFalse(headerXML2.contains("BẢN NHÁP"), headerXML2)
        // Gỡ bỏ.
        doc.removeWatermark()
        XCTAssertNil(doc.watermarkText)
        saved = try doc.save()
        let headerXML3 = try RoundTrip.partString(saved, String(headerPart.value.dropFirst()))
        XCTAssertFalse(headerXML3.contains("VNOfficeWatermark"), headerXML3)
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["word/header*"],
                             requireChanged: [],
                             name: "docx-watermark.docx")
        // Tài liệu chưa có header nào: tự tạo header cho section đầu.
        let plain = try Fixtures.data("real/sample-writer.docx")
        let doc2 = try WordDocument(data: plain)
        XCTAssertTrue(doc2.headers.isEmpty)
        try doc2.setWatermark("DRAFT")
        XCTAssertEqual(doc2.watermarkText, "DRAFT")
        let saved2 = try doc2.save()
        XCTAssertEqual(PackageValidator.validate(saved2), [])
        let reopened2 = try WordDocument(data: saved2)
        XCTAssertEqual(reopened2.watermarkText, "DRAFT")
        try RoundTrip.verify(original: plain, saved: saved2,
                             allowedChanges: ["word/document.xml", "word/header*",
                                              "word/_rels/document.xml.rels", "[Content_Types].xml"],
                             requireChanged: ["word/document.xml"],
                             name: "docx-watermark-new-header.docx")
    }

    func testSectionLinkToPreviousRoundTrip() throws {
        let original = try Fixtures.data(rich)
        let doc = try WordDocument(data: original)
        XCTAssertEqual(doc.sections.count, 1)
        XCTAssertFalse(doc.sections[0].isLinkedToPrevious(kind: .header))
        XCTAssertThrowsError(try doc.sections[0].setLinkedToPrevious(true, kind: .header))
        // Tạo section thứ 2: chép sectPr cuối thân vào pPr của đoạn đầu.
        let bodySectPr = try XCTUnwrap(doc.body.container.elements.last)
        let pPr = WordText.ensurePPr(doc.paragraphs[0].element)
        pPr.append(bodySectPr.deepCopy())
        doc.body.markModified()
        XCTAssertEqual(doc.sections.count, 2)
        let last = doc.sections[1]
        XCTAssertFalse(last.isLinkedToPrevious(kind: .header))
        // Liên kết header tới section trước: tham chiếu riêng bị xóa.
        try last.setLinkedToPrevious(true, kind: .header)
        XCTAssertTrue(last.isLinkedToPrevious(kind: .header))
        var saved = try doc.save()
        var docXML = try RoundTrip.partString(saved, "word/document.xml")
        XCTAssertEqual(docXML.components(separatedBy: "<w:headerReference").count - 1, 1, docXML)
        // Hủy liên kết: sao chép header của section trước thành part mới.
        try last.setLinkedToPrevious(false, kind: .header)
        XCTAssertFalse(last.isLinkedToPrevious(kind: .header))
        saved = try doc.save()
        let pkg = try OPCPackage(data: saved)
        XCTAssertTrue(pkg.partNames.map(\.value).contains("/word/header2.xml"))
        let reopened = try WordDocument(data: saved)
        XCTAssertEqual(reopened.sections.count, 2)
        XCTAssertFalse(reopened.sections[1].isLinkedToPrevious(kind: .header))
        // Liên kết footer: tham chiếu riêng bị xóa, mở lại vẫn liên kết.
        try reopened.sections[1].setLinkedToPrevious(true, kind: .footer)
        XCTAssertTrue(reopened.sections[1].isLinkedToPrevious(kind: .footer))
        docXML = try RoundTrip.partString(try reopened.save(), "word/document.xml")
        XCTAssertEqual(docXML.components(separatedBy: "<w:footerReference").count - 1, 1, docXML)
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["word/document.xml", "word/_rels/document.xml.rels",
                                              "[Content_Types].xml",
                                              "word/header*", "word/_rels/header*"],
                             requireChanged: ["word/document.xml"],
                             name: "docx-section-link.docx")
    }

    /// Part đích của reference của section thứ `index` trong gói đã lưu, lần theo
    /// sectPr -> r:id -> relationship bằng DOM thô (không qua model Section).
    private func referencedPart(in package: OPCPackage, section index: Int,
                                elementName: String, type: String = "default") throws -> PartName? {
        let doc = try package.xml(try package.mainDocumentPart())
        guard let body = doc.root.firstChild(NS.w, "body") else { return nil }
        var sectPrs: [XElement] = []
        for p in body.children(NS.w, "p") {
            if let s = p.firstChild(NS.w, "pPr")?.firstChild(NS.w, "sectPr") { sectPrs.append(s) }
        }
        if let last = body.elements.last, last.is(NS.w, "sectPr") { sectPrs.append(last) }
        guard sectPrs.indices.contains(index) else { return nil }
        guard let ref = sectPrs[index].children(NS.w, elementName).first(where: {
            ($0.attribute("w:type") ?? "default") == type
        }), let rid = ref.attribute("r:id") else { return nil }
        return try package.relationships(of: try package.mainDocumentPart()).targetPart(id: rid)
    }

    /// Dựng chuỗi 3 section bằng cách chép sectPr cuối thân vào pPr đoạn 0 và 1.
    private func makeThreeSections(_ doc: WordDocument) throws {
        let bodySectPr = try XCTUnwrap(doc.body.container.elements.last)
        for i in [0, 1] {
            WordText.ensurePPr(doc.paragraphs[i].element).append(bodySectPr.deepCopy())
        }
        doc.body.markModified()
        XCTAssertEqual(doc.sections.count, 3)
    }

    func testSectionUnlinkUsesNearestEffectiveReference() throws {
        let original = try Fixtures.data(rich)
        let headerSource = try RoundTrip.partString(original, "word/header1.xml")
        let headerRelsSource = try RoundTrip.partString(original, "word/_rels/header1.xml.rels")
        let doc = try WordDocument(data: original)
        try makeThreeSections(doc)
        try doc.sections[1].setLinkedToPrevious(true, kind: .header)
        try doc.sections[2].setLinkedToPrevious(true, kind: .header)
        XCTAssertTrue(doc.sections[2].isLinkedToPrevious(kind: .header))
        // Ngắt ở section 2: phải sao chép header hiệu lực của section 0, không tạo part rỗng.
        try doc.sections[2].setLinkedToPrevious(false, kind: .header)
        XCTAssertFalse(doc.sections[2].isLinkedToPrevious(kind: .header))
        let saved = try doc.save()
        let pkg = try OPCPackage(data: saved)
        let newPart = try XCTUnwrap(try referencedPart(in: pkg, section: 2, elementName: "headerReference"))
        XCTAssertNotEqual(newPart, PartName("/word/header1.xml"))
        XCTAssertEqual(try RoundTrip.partString(saved, newPart.value), headerSource)
        // Part nguồn không đổi; quan hệ phụ thuộc của header (ảnh) được mang theo.
        XCTAssertEqual(try RoundTrip.partString(saved, "word/header1.xml"), headerSource)
        let newRels = "/word/_rels/\(newPart.value.split(separator: "/").last!).rels"
        XCTAssertEqual(try RoundTrip.partString(saved, newRels), headerRelsSource)
        // Section 1 vẫn liên kết; tổng số headerReference = 2 (section 0 và 2).
        XCTAssertNil(try referencedPart(in: pkg, section: 1, elementName: "headerReference"))
        let docXML = try RoundTrip.partString(saved, "word/document.xml")
        XCTAssertEqual(docXML.components(separatedBy: "<w:headerReference").count - 1, 2, docXML)
        let reopened = try WordDocument(data: saved)
        XCTAssertTrue(reopened.sections[1].isLinkedToPrevious(kind: .header))
        XCTAssertFalse(reopened.sections[2].isLinkedToPrevious(kind: .header))
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["word/document.xml", "word/_rels/document.xml.rels",
                                              "[Content_Types].xml", "word/header*", "word/_rels/header*"],
                             requireChanged: ["word/document.xml"],
                             name: "docx-section-unlink-chain.docx")
    }

    func testSectionUnlinkFooterUsesNearestEffectiveReference() throws {
        let original = try Fixtures.data(rich)
        let footerSource = try RoundTrip.partString(original, "word/footer1.xml")
        let doc = try WordDocument(data: original)
        try makeThreeSections(doc)
        try doc.sections[1].setLinkedToPrevious(true, kind: .footer)
        try doc.sections[2].setLinkedToPrevious(true, kind: .footer)
        try doc.sections[2].setLinkedToPrevious(false, kind: .footer)
        let saved = try doc.save()
        let pkg = try OPCPackage(data: saved)
        let newPart = try XCTUnwrap(try referencedPart(in: pkg, section: 2, elementName: "footerReference"))
        XCTAssertNotEqual(newPart, PartName("/word/footer1.xml"))
        XCTAssertEqual(try RoundTrip.partString(saved, newPart.value), footerSource)
        XCTAssertEqual(try RoundTrip.partString(saved, "word/footer1.xml"), footerSource)
        XCTAssertNil(try referencedPart(in: pkg, section: 1, elementName: "footerReference"))
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["word/document.xml", "word/_rels/document.xml.rels",
                                              "[Content_Types].xml", "word/footer*"],
                             requireChanged: ["word/document.xml"],
                             name: "docx-section-unlink-footer.docx")
    }

    func testSectionUnlinkFirstAndEvenUseNearestTypedReference() throws {
        let original = try Fixtures.data(rich)
        let headerSource = try RoundTrip.partString(original, "word/header1.xml")
        let footerSource = try RoundTrip.partString(original, "word/footer1.xml")
        let doc = try WordDocument(data: original)
        try makeThreeSections(doc)
        // Section 0 có thêm reference first (header) và even (footer) trỏ cùng part gốc.
        let sect0 = doc.sections[0].element
        let firstRef = XElement(name: "w:headerReference", attributes: [
            XAttribute(name: "w:type", value: "first"), XAttribute(name: "r:id", value: "rId8")])
        sect0.insert(firstRef, at: 0)
        let evenRef = XElement(name: "w:footerReference", attributes: [
            XAttribute(name: "w:type", value: "even"), XAttribute(name: "r:id", value: "rId9")])
        if let lastHeader = sect0.children(NS.w, "headerReference").last {
            sect0.insert(evenRef, after: lastHeader)
        } else {
            sect0.insert(evenRef, at: 0)
        }
        doc.body.markModified()
        // Section 1 và 2 không có reference hai loại này nên đang kế thừa từ section 0.
        XCTAssertTrue(doc.sections[2].isLinkedToPrevious(kind: .header, type: .first))
        XCTAssertTrue(doc.sections[2].isLinkedToPrevious(kind: .footer, type: .even))
        try doc.sections[2].setLinkedToPrevious(false, kind: .header, type: .first)
        try doc.sections[2].setLinkedToPrevious(false, kind: .footer, type: .even)
        let saved = try doc.save()
        let pkg = try OPCPackage(data: saved)
        let newHeader = try XCTUnwrap(try referencedPart(in: pkg, section: 2, elementName: "headerReference", type: "first"))
        XCTAssertEqual(try RoundTrip.partString(saved, newHeader.value), headerSource)
        let newFooter = try XCTUnwrap(try referencedPart(in: pkg, section: 2, elementName: "footerReference", type: "even"))
        XCTAssertEqual(try RoundTrip.partString(saved, newFooter.value), footerSource)
        // Reference default của section 2 vẫn trỏ part gốc, không bị đụng.
        let defHeader = try XCTUnwrap(try referencedPart(in: pkg, section: 2, elementName: "headerReference"))
        XCTAssertEqual(defHeader, PartName("/word/header1.xml"))
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["word/document.xml", "word/_rels/document.xml.rels",
                                              "[Content_Types].xml", "word/header*", "word/_rels/header*", "word/footer*"],
                             requireChanged: ["word/document.xml"],
                             name: "docx-section-unlink-typed.docx")
    }

    func testNumberingMultiLevelStructure() throws {
        let original = try Fixtures.data(rich)
        let doc = try WordDocument(data: original)
        try doc.paragraphs[0].setNumbering(.decimal, level: 2)
        let numId2 = try XCTUnwrap(doc.paragraphs[0].numbering?.numId)
        XCTAssertEqual(doc.paragraphs[0].numbering?.level, 2)
        try doc.paragraphs[1].setNumbering(.decimal, level: 2)
        XCTAssertEqual(doc.paragraphs[1].numbering?.numId, numId2, "cùng format + cấp dùng lại một danh sách")
        try doc.paragraphs[2].setNumbering(.lowerLetter, level: 1)
        let numId1 = try XCTUnwrap(doc.paragraphs[2].numbering?.numId)
        XCTAssertNotEqual(numId1, numId2)
        XCTAssertThrowsError(try doc.paragraphs[3].setNumbering(.decimal, level: -1))
        let saved = try doc.save()
        // Kiểm cấu trúc XML bằng DOM thô của part, không qua model API.
        let pkg = try OPCPackage(data: saved)
        let ndoc = try pkg.xml(PartName("/word/numbering.xml"))
        func abstract(forNum numId: Int) -> XElement? {
            guard let num = ndoc.root.children(NS.w, "num").first(where: { $0.attribute("w:numId") == String(numId) }),
                  let absId = num.firstChild(NS.w, "abstractNumId")?.attribute("w:val") else { return nil }
            return ndoc.root.children(NS.w, "abstractNum").first { $0.attribute("w:abstractNumId") == absId }
        }
        func lvlInfo(_ ab: XElement) -> [(ilvl: String, fmt: String?, text: String?, order: [String])] {
            ab.children(NS.w, "lvl").map { lvl in
                (lvl.attribute("w:ilvl") ?? "?",
                 lvl.firstChild(NS.w, "numFmt")?.attribute("w:val"),
                 lvl.firstChild(NS.w, "lvlText")?.attribute("w:val"),
                 lvl.elements.map(\.name))
            }
        }
        let ab2 = try XCTUnwrap(abstract(forNum: numId2))
        XCTAssertEqual(ab2.firstChild(NS.w, "multiLevelType")?.attribute("w:val"), "multilevel")
        let lv2 = lvlInfo(ab2)
        XCTAssertEqual(lv2.map(\.ilvl), ["0", "1", "2"])
        XCTAssertEqual(lv2.map(\.fmt), ["decimal", "lowerLetter", "decimal"])
        XCTAssertEqual(lv2.map(\.text), ["%1.", "%1.%2.", "%1.%2.%3."])
        for l in lv2 {
            XCTAssertEqual(l.order, ["w:start", "w:numFmt", "w:lvlText", "w:lvlJc", "w:pPr"], "thứ tự con của w:lvl")
        }
        let ab1 = try XCTUnwrap(abstract(forNum: numId1))
        XCTAssertEqual(ab1.firstChild(NS.w, "multiLevelType")?.attribute("w:val"), "multilevel")
        let lv1 = lvlInfo(ab1)
        XCTAssertEqual(lv1.map(\.ilvl), ["0", "1"])
        XCTAssertEqual(lv1.map(\.fmt), ["decimal", "lowerLetter"])
        XCTAssertEqual(lv1.map(\.text), ["%1.", "%1.%2."])
        // Định nghĩa sẵn của fixture (abstract 0) còn nguyên.
        XCTAssertNotNil(ndoc.root.children(NS.w, "abstractNum").first { $0.attribute("w:abstractNumId") == "0" })
        let docXML = try RoundTrip.partString(saved, "word/document.xml")
        XCTAssertTrue(docXML.contains("<w:ilvl w:val=\"2\"/>"), docXML)
        let reopened = try WordDocument(data: saved)
        XCTAssertEqual(reopened.numberingFormat(numId: numId2, level: 2), "decimal")
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["word/document.xml", "word/numbering.xml"],
                             requireChanged: ["word/document.xml", "word/numbering.xml"],
                             name: "docx-numbering-multilevel.docx")
    }

    func testNumberingMultiLevelBulletAndDeepest() throws {
        let original = try Fixtures.data(rich)
        let doc = try WordDocument(data: original)
        try doc.paragraphs[0].setNumbering(.bullet, level: 2)
        let bulletNum = try XCTUnwrap(doc.paragraphs[0].numbering?.numId)
        try doc.paragraphs[1].setNumbering(.decimal, level: 8)
        let deepNum = try XCTUnwrap(doc.paragraphs[1].numbering?.numId)
        let saved = try doc.save()
        let pkg = try OPCPackage(data: saved)
        let ndoc = try pkg.xml(PartName("/word/numbering.xml"))
        func abstract(forNum numId: Int) -> XElement? {
            guard let num = ndoc.root.children(NS.w, "num").first(where: { $0.attribute("w:numId") == String(numId) }),
                  let absId = num.firstChild(NS.w, "abstractNumId")?.attribute("w:val") else { return nil }
            return ndoc.root.children(NS.w, "abstractNum").first { $0.attribute("w:abstractNumId") == absId }
        }
        let abB = try XCTUnwrap(abstract(forNum: bulletNum))
        let lvB = abB.children(NS.w, "lvl")
        XCTAssertEqual(lvB.count, 3)
        XCTAssertTrue(lvB.allSatisfy { $0.firstChild(NS.w, "numFmt")?.attribute("w:val") == "bullet" })
        XCTAssertTrue(lvB.allSatisfy { $0.firstChild(NS.w, "lvlText")?.attribute("w:val") == "•" })
        XCTAssertTrue(lvB.allSatisfy { $0.firstChild(NS.w, "start") == nil })
        let abD = try XCTUnwrap(abstract(forNum: deepNum))
        let lvD = abD.children(NS.w, "lvl")
        XCTAssertEqual(lvD.count, 9)
        XCTAssertEqual(lvD.map { $0.attribute("w:ilvl") }, (0...8).map { String($0) })
        XCTAssertEqual(lvD.last?.firstChild(NS.w, "lvlText")?.attribute("w:val"), "%1.%2.%3.%4.%5.%6.%7.%8.%9.")
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["word/document.xml", "word/numbering.xml"],
                             requireChanged: ["word/document.xml", "word/numbering.xml"],
                             name: "docx-numbering-deep.docx")
    }

    func testAppendFieldSafety() throws {
        let original = try Fixtures.data(rich)
        // Field nội bộ trong allowlist (kèm switch/đối số hợp lệ) vẫn chèn được.
        let doc = try WordDocument(data: original)
        let p0 = doc.paragraphs[0]
        for f in ["PAGE", "NUMPAGES", "SECTION", "SECTIONPAGES", "DATE", "TIME",
                  "AUTHOR", "TITLE", "SUBJECT", "FILENAME",
                  "page", "Date \\@ \"dd/MM/yyyy\"", "TIME \\@ \"HH:mm\"", "DATE \\* MERGEFORMAT"] {
            XCTAssertNoThrow(try p0.appendField(instruction: f), f)
        }
        let docXML = try RoundTrip.partString(try doc.save(), "word/document.xml")
        XCTAssertTrue(docXML.contains("> DATE "), docXML)
        // Mọi field nguy hiểm/không nhận diện bị chặn và tài liệu không đổi một byte.
        let doc2 = try WordDocument(data: original)
        let q0 = doc2.paragraphs[0]
        for f in ["DDE", "dde", "DDEAUTO Excel.Sheet", "INCLUDETEXT \"C:\\bi-mat.docx\"",
                  "includetext x", "INCLUDEPICTURE \"http://evil.example/x.png\"",
                  "LINK Excel.Sheet.12 \"C:\\x.xls\"", "DATABASE \"DSN=x\"",
                  "HYPERLINK \"http://evil.example\"", "TRUONGKHONGCO", "PAGE INCLUDETEXT",
                  "123PAGE", "PAGE1", "  INCLUDETEXT\t\"x\""] {
            XCTAssertThrowsError(try q0.appendField(instruction: f), f) { error in
                XCTAssertTrue(error is WordError, "\(f): \(error)")
            }
        }
        let savedXML = try RoundTrip.partString(try doc2.save(), "word/document.xml")
        XCTAssertEqual(savedXML, try RoundTrip.partString(original, "word/document.xml"),
                       "field bị chặn không được để lại thay đổi nào trong document.xml")
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
