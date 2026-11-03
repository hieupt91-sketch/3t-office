import XCTest
@testable import OOXMLWord
import OOXMLPackage
import OOXMLZip
import OOXMLTestSupport

/// Gói L8 — tầng model Word: tệp DOCX độc hại bị từ chối bằng lỗi có mã.
final class WordHardeningTests: XCTestCase {
    func testDeepNestedDocumentRejectedWithCodedError() throws {
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
        // Tầng gói bọc lỗi phân tích thành PackageError.invalidPart (part + lý
        // do có mã của XMLError.tooDeep) — lỗi có mã ở mọi tầng, không crash.
        XCTAssertThrowsError(try WordDocument(data: crafted)) { error in
            guard case PackageError.invalidPart(let part, let message) = (error as? PackageError) ?? .missingContentTypes else {
                XCTFail("kỳ vọng PackageError.invalidPart, nhận: \(error)"); return
            }
            XCTAssertEqual(part, "/word/document.xml")
            XCTAssertTrue(message.contains("512"), message)
        }
    }
}
