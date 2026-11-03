import XCTest
@testable import OOXMLSpreadsheet
import OOXMLPackage
import OOXMLTestSupport

/// Gói L9 (issue #10): `Workbook.saveStreaming(to:)` — sửa → lưu truyền
/// phát → mở lại phải giữ nguyên giá trị đã sửa và giữ nguyên byte nén của
/// mọi phần không đụng tới; tệp ra khớp từng byte với `save()`.
final class StreamingSaveWorkbookTests: XCTestCase {
    let rich = "xlsx/rich-excel.xlsx"

    func testWorkbookStreamingSaveRoundTrip() throws {
        let original = try Fixtures.data(rich)
        let url = try Fixtures.scratchDirectory("xlsx-streaming").appendingPathComponent("rich-streamed.xlsx")
        let wb = try Workbook(data: original, deferValidation: true)
        let ws = try wb.worksheet(named: "Dữ liệu")
        try ws.setValue(777, at: "C3")
        try ws.setValue("Chuỗi mới qua streaming", at: "B3")
        try wb.saveStreaming(to: url)

        let saved = try Data(contentsOf: url)
        let back = try Workbook(data: saved)
        let ws2 = try back.worksheet(named: "Dữ liệu")
        XCTAssertEqual(try ws2.value("C3"), .number(777))
        XCTAssertEqual(try ws2.value("B3"), .string("Chuỗi mới qua streaming"))
        XCTAssertEqual(try ws2.value("B2"), .string("Giấy A4 Double A"))

        let diff = try PackageDiff(original: original, saved: saved)
        XCTAssertTrue(diff.added.isEmpty && diff.removed.isEmpty, "\(diff)")
        XCTAssertEqual(Set(diff.unchanged), Set(diff.rawIdentical),
                       "phần không sửa phải giữ nguyên byte nén: changed=\(diff.changed)")
        XCTAssertFalse(diff.changed.isEmpty, "phải có phần thay đổi (sheet/sharedStrings)")
        for name in diff.changed {
            XCTAssertTrue(name.contains("worksheets/") || name.hasSuffix("sharedStrings.xml")
                          || name.hasSuffix("workbook.xml") || name.hasSuffix("calcChain.xml"),
                          "phần thay đổi ngoài dự kiến: \(name)")
        }
    }

    func testWorkbookStreamingBytesEqualClassicSave() throws {
        let original = try Fixtures.data(rich)
        func editedWorkbook() throws -> Workbook {
            let wb = try Workbook(data: original, deferValidation: true)
            let ws = try wb.worksheet(named: "Dữ liệu")
            try ws.setValue(4242, at: "C4")
            try ws.setValue("Đối chiếu byte", at: "F2")
            return wb
        }
        let classic = try editedWorkbook().save()
        let url = try Fixtures.scratchDirectory("xlsx-streaming-eq").appendingPathComponent("rich.xlsx")
        try editedWorkbook().saveStreaming(to: url)
        XCTAssertEqual(try Data(contentsOf: url), classic)
    }
}
