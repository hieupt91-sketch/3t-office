import XCTest
@testable import OOXMLWord
import OOXMLPackage
import OOXMLTestSupport

/// Phase 5 — sửa DOCX dưới dạng theo dõi thay đổi; chấp nhận/từ chối tất cả.
final class Phase5RevisionTests: XCTestCase {
    let rich = "docx/rich-word.docx"
    let who = Revision(author: "Phạm Hiếu", date: Date(timeIntervalSince1970: 1_792_765_200)) // 2026-10-23T14:20:00Z

    func testTrackedSetTextSaveReopen() throws {
        let original = try Fixtures.data(rich)
        let doc = try WordDocument(data: original)
        XCTAssertTrue(doc.isTrackingRevisions, "fixture bật w:trackRevisions")
        doc.paragraphs[0].setText("BÁO CÁO SƠ KẾT", revision: who)
        doc.appendParagraph("Đoạn bổ sung có theo dõi", revision: who)
        let saved = try doc.save()
        let re = try WordDocument(data: saved)
        XCTAssertEqual(re.paragraphs[0].text, "BÁO CÁO SƠ KẾT", "chữ hiển thị = chữ mới (chữ xóa bị ẩn)")
        XCTAssertEqual(re.paragraphs.last?.text, "Đoạn bổ sung có theo dõi")
        let xml = try RoundTrip.partString(saved, "word/document.xml")
        XCTAssertTrue(xml.contains("w:author=\"Phạm Hiếu\" w:date=\"2026-10-23T14:20:00Z\""))
        XCTAssertTrue(xml.contains("<w:delText>BÁO CÁO TỔNG KẾT NĂM 2026</w:delText>"), "chữ cũ còn dưới dạng đã xóa")
        XCTAssertTrue(xml.contains("<w:del w:id=\"3\"") && xml.contains("<w:ins w:id=\"4\""), "id mới lớn hơn mọi w:id cũ (0,1,2)")
        XCTAssertTrue(xml.contains("<w:rPr><w:ins w:id="), "dấu đoạn mới được đánh dấu chèn")
        try RoundTrip.verify(original: original, saved: saved, allowedChanges: ["word/document.xml"],
                             requireChanged: ["word/document.xml"], name: "p5-docx-tracked.docx")
    }

    func testAcceptAndRejectAll() throws {
        let doc = try WordDocument(data: try Fixtures.data(rich))
        doc.paragraphs[0].setText("TIÊU ĐỀ MỚI", revision: who)
        let accepted = try WordDocument(data: try doc.save())
        XCTAssertGreaterThan(accepted.acceptAllRevisions(), 0)
        let a = try WordDocument(data: try accepted.save())
        XCTAssertEqual(a.paragraphs[0].text, "TIÊU ĐỀ MỚI")
        XCTAssertEqual(a.paragraphs[4].text, "Nội dung đã bổ sung theo góp ý.", "thay đổi có sẵn của tác giả khác cũng được chấp nhận")
        let ax = try RoundTrip.partString(try a.save(), "word/document.xml")
        XCTAssertFalse(ax.contains("<w:ins ") || ax.contains("<w:del ") || ax.contains("delText"))

        let rejected = try WordDocument(data: try doc.save())
        rejected.rejectAllRevisions()
        let r = try WordDocument(data: try rejected.save())
        XCTAssertEqual(r.paragraphs[0].text, "BÁO CÁO TỔNG KẾT NĂM 2026", "từ chối → khôi phục chữ gốc")
        XCTAssertEqual(r.paragraphs[4].text, "Nội dung đã xóa theo góp ý.", "từ chối thay đổi có sẵn: bỏ chèn, khôi phục chữ xóa")
        XCTAssertTrue(r.paragraphs[0].runs[0].isBold, "định dạng chữ khôi phục giữ nguyên")
        XCTAssertEqual(PackageValidator.validate(try r.save()), [])
        Fixtures.publishArtifact(try a.save(), name: "p5-docx-accepted.docx")
        Fixtures.publishArtifact(try r.save(), name: "p5-docx-rejected.docx")
    }

    func testRejectRemovesTrackedInsertedParagraphText() throws {
        let doc = try WordDocument(data: try Fixtures.data("real/sample-writer.docx"))
        let n = doc.paragraphs.count
        doc.appendParagraph("Sẽ bị từ chối", revision: who)
        doc.rejectAllRevisions()
        let re = try WordDocument(data: try doc.save())
        XCTAssertEqual(re.paragraphs.count, n + 1, "đoạn rỗng còn lại (dấu đoạn đã bỏ đánh dấu)")
        XCTAssertEqual(re.paragraphs.last?.text, "")
    }
}
