import XCTest
@testable import OOXMLSpreadsheet
import OOXMLPackage
import OOXMLTestSupport

/// M7 lát 32: tên biểu thức qua API Workbook — định nghĩa bằng công thức chuỗi
/// (dùng ô, dùng tên khác, gọi hàm), lưu/mở lại rồi tính qua `FormulaEngine(workbook:)`;
/// tham chiếu tới workbook ngoài bị từ chối như tài liệu của `defineName` đã hứa.
/// (Lát 17 xong phần engine; lát 31 xong API tên vùng/hằng — lát này nối hai đầu lại.)
final class WorkbookDefinedNameExprTests: XCTestCase {
    let rich = "xlsx/rich-excel.xlsx"

    private func reopen(_ wb: Workbook) throws -> Workbook {
        try Workbook(data: wb.save())
    }

    private func setData(_ wb: Workbook, _ a1: Double, _ a2: Double) throws {
        let data = try wb.worksheet(named: "Dữ liệu")
        try data.setValue(a1, at: "A1")
        try data.setValue(a2, at: "A2")
    }

    private func eval(_ wb: Workbook, _ formula: String, sheet: String = "Tổng hợp", at: String = "Z1") throws -> CellValue {
        let ws = try wb.worksheet(named: sheet)
        try ws.setFormula(formula, at: at)
        let e = try FormulaEngine(workbook: wb)
        e.recalculate()
        return e.value(sheet: sheet, at: at)
    }

    func testExpressionNameWithCellsEvaluatesAfterRoundTrip() throws {
        let original = try Fixtures.data(rich)
        let wb = try Workbook(data: original)
        try setData(wb, 10, 20)
        try wb.defineName("Tong2", formula: "'Dữ liệu'!$A$1+'Dữ liệu'!$A$2")
        let saved = try wb.save()
        XCTAssertEqual(PackageValidator.validate(saved), [])
        let re = try Workbook(data: saved)
        XCTAssertEqual(re.definedNames.first { $0.name == "Tong2" }?.formula,
                       "'Dữ liệu'!$A$1+'Dữ liệu'!$A$2")
        XCTAssertEqual(try eval(re, "=Tong2"), .number(30))
        XCTAssertEqual(try eval(re, "=Tong2*2"), .number(60))
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["xl/workbook.xml", "xl/worksheets/sheet1.xml", "xl/calcChain.xml"],
                             name: "m7-lat32-expr-name.xlsx")
    }

    func testExpressionNameChainedThroughAnotherName() throws {
        let wb = try Workbook(data: try Fixtures.data(rich))
        try setData(wb, 10, 20)
        try wb.defineName("Tong2", formula: "'Dữ liệu'!$A$1+'Dữ liệu'!$A$2")
        try wb.defineName("Gap", formula: "Tong2*2")
        let re = try reopen(wb)
        XCTAssertEqual(try eval(re, "=Gap"), .number(60), "Gap = Tong2*2 = 30*2")
        XCTAssertEqual(try eval(re, "=SUM(Tong2)"), .number(30), "tên hằng dùng được trong SUM")
    }

    func testExpressionNameWithFunctionCall() throws {
        let wb = try Workbook(data: try Fixtures.data(rich))
        try setData(wb, 10, 20)
        try wb.defineName("TongHam", formula: "SUM('Dữ liệu'!$A$1:$A$2)")
        let re = try reopen(wb)
        XCTAssertEqual(try eval(re, "=TongHam"), .number(30))
        XCTAssertEqual(try eval(re, "=TongHam+5"), .number(35))
    }

    func testLocalExpressionNameViaAPI() throws {
        let wb = try Workbook(data: try Fixtures.data(rich))
        try wb.defineName("CucBo", formula: "5*3", localSheet: "Tổng hợp")
        let re = try reopen(wb)
        let found = re.definedNames.first { $0.name == "CucBo" }
        XCTAssertEqual(found?.localSheetIndex, re.sheetNames.firstIndex(of: "Tổng hợp"))
        XCTAssertEqual(try eval(re, "=CucBo"), .number(15))
        XCTAssertEqual(try eval(re, "=CucBo", sheet: "Dữ liệu", at: "Z8"), .error("#NAME?"),
                       "tên cục bộ không thấy được từ sheet khác")
    }

    func testRedefineExpressionToRangeAndBackViaAPI() throws {
        let wb = try Workbook(data: try Fixtures.data(rich))
        try setData(wb, 10, 20)
        try wb.defineName("Doi", formula: "10")
        XCTAssertEqual(try eval(try reopen(wb), "=Doi"), .number(10))
        try wb.defineName("Doi", formula: "'Dữ liệu'!$A$1:$A$2")
        XCTAssertEqual(try eval(try reopen(wb), "=SUM(Doi)"), .number(30),
                       "định nghĩa lại dạng vùng ghi đè dạng hằng")
        try wb.defineName("Doi", formula: "10")
        XCTAssertEqual(try eval(try reopen(wb), "=Doi"), .number(10),
                       "định nghĩa lại dạng hằng ghi đè dạng vùng")
    }

    func testExternalReferenceRejected() throws {
        let wb = try Workbook(data: try Fixtures.data(rich))
        for bad in ["'[Book2.xlsx]Sheet1'!$A$1",
                    "SUM('[Book2.xlsx]Sheet1'!$A$1:$A$2)",
                    "'[Book2.xlsx]Sheet1'!$A$1+1"] {
            XCTAssertThrowsError(try wb.defineName("Ngoai", formula: bad), "công thức \(bad)") {
                guard case SpreadsheetError.invalidDefinedName = $0 else {
                    return XCTFail("tham chiếu workbook ngoài phải lỗi invalidDefinedName, nhận được \($0)")
                }
            }
        }
        // Tên hợp lệ vẫn định nghĩa được sau khi các công thức ngoài bị từ chối.
        try wb.defineName("Trong", formula: "'Dữ liệu'!$A$1:$A$1")
        XCTAssertNotNil(try reopen(wb).definedNames.first { $0.name == "Trong" })
    }

    func testHiddenExpressionNameEvaluates() throws {
        let wb = try Workbook(data: try Fixtures.data(rich))
        try wb.defineName("An", formula: "1.5", hidden: true)
        let re = try reopen(wb)
        XCTAssertEqual(re.definedNames.first { $0.name == "An" }?.hidden, true)
        XCTAssertEqual(try eval(re, "=An*2"), .number(3))
    }

    func testConstantStringExpressionViaAPI() throws {
        let wb = try Workbook(data: try Fixtures.data(rich))
        try wb.defineName("Chao", formula: "\"Xin chào\"")
        let re = try reopen(wb)
        XCTAssertEqual(try eval(re, "=Chao"), .string("Xin chào"))
        XCTAssertEqual(try eval(re, "=Chao&\"!\""), .string("Xin chào!"))
    }
}
