import XCTest
@testable import OOXMLSpreadsheet

final class FormulaAndReferenceTests: XCTestCase {
    func testCellReferences() {
        XCTAssertEqual(CellReference(String("A1")), CellReference(column: 1, row: 1))
        XCTAssertEqual(CellReference(String("$XFD$1048576")), CellReference(column: 16384, row: 1_048_576))
        XCTAssertEqual(CellReference(String("ab12"))?.a1, "AB12")
        for bad in ["", "A", "1", "A0", "XFE1", "A1048577", "AAAA1", "A1B", "A-1"] {
            XCTAssertNil(CellReference(bad), bad)
        }
        XCTAssertEqual(CellReference.columnName(703), "AAA")
        XCTAssertEqual(CellReference.columnNumber("XFD"), 16384)
        XCTAssertEqual(CellRange("C5:A1")?.description, "A1:C5")
        XCTAssertTrue(CellRange("A1:C5")!.contains("B3"))
        XCTAssertFalse(CellRange("A1:C5")!.intersects(CellRange("D1:E2")!))
    }

    func testShiftRelativeReferences() {
        XCTAssertEqual(FormulaRewriter.shift("C2*D2", rows: 3, columns: 0), "C5*D5")
        XCTAssertEqual(FormulaRewriter.shift("$C$2*D$2+$E3", rows: 2, columns: 1), "$C$2*E$2+$E5")
        XCTAssertEqual(FormulaRewriter.shift("SUM(A1:B2)+LOG10(A1)", rows: 1, columns: 1), "SUM(B2:C3)+LOG10(B2)")
        XCTAssertEqual(FormulaRewriter.shift("\"A1\"&A1", rows: 1, columns: 0), "\"A1\"&A2", "không đụng vào chuỗi")
        XCTAssertEqual(FormulaRewriter.shift("'Sheet 1'!A1+Sheet2!B1", rows: 1, columns: 0), "'Sheet 1'!A2+Sheet2!B2")
        XCTAssertEqual(FormulaRewriter.shift("SUM(B:B)+SUM(2:3)", rows: 1, columns: 1), "SUM(C:C)+SUM(3:4)")
        XCTAssertEqual(FormulaRewriter.shift("Bang[@Gia]*A1", rows: 1, columns: 0), "Bang[@Gia]*A2", "không đụng tham chiếu cấu trúc")
        XCTAssertEqual(FormulaRewriter.shift("A1", rows: -1, columns: 0), "#REF!")
        XCTAssertEqual(FormulaRewriter.shift("Q1Sales+TongDoanhThu", rows: 5, columns: 0), "Q1Sales+TongDoanhThu", "tên định nghĩa giữ nguyên")
        XCTAssertEqual(FormulaRewriter.shift("[1]Sheet1!A1", rows: 1, columns: 0), "[1]Sheet1!A2")
    }

    func testRenameSheetReferences() {
        XCTAssertEqual(FormulaRewriter.renameSheet("SUM('Dữ liệu'!E2:E6)", from: "Dữ liệu", to: "Kho hàng"), "SUM('Kho hàng'!E2:E6)")
        XCTAssertEqual(FormulaRewriter.renameSheet("Sheet1!A1+sheet1!B2+Sheet10!A1", from: "Sheet1", to: "Data"), "Data!A1+Data!B2+Sheet10!A1")
        XCTAssertEqual(FormulaRewriter.renameSheet("Data!A1", from: "Data", to: "Số liệu"), "'Số liệu'!A1")
        XCTAssertEqual(FormulaRewriter.renameSheet("Data!A1", from: "Data", to: "O'Brien"), "'O''Brien'!A1")
        XCTAssertEqual(FormulaRewriter.renameSheet("\"Data!A1\"&Data!A1", from: "Data", to: "X"), "\"Data!A1\"&X!A1")
        XCTAssertEqual(FormulaRewriter.renameSheet("SUM('Jan:Mar'!B2)", from: "Mar", to: "Quý 1"), "SUM('Jan:Quý 1'!B2)")
        XCTAssertEqual(FormulaRewriter.renameSheet("[1]Data!A1", from: "Data", to: "X"), "[1]Data!A1", "không đổi sổ ngoài")
        XCTAssertEqual(FormulaRewriter.renameSheet("Data!A1", from: "Data", to: "A1"), "'A1'!A1", "tên giống địa chỉ ô phải có nháy")
    }

    func testSharedStringEscaping() {
        XCTAssertEqual(SharedStrings.unescape("Ghi chú_x000D_ dòng 2"), "Ghi chú\r dòng 2")
        XCTAssertEqual(SharedStrings.escape("a\rb\u{1}c\td"), "a_x000D_b_x0001_c\td")
        XCTAssertEqual(SharedStrings.escape("_x0041_"), "_x005F_x0041_", "như Excel: gạch dưới đứng đầu chuỗi giống mã thoát được thoát thành _x005F_")
        XCTAssertEqual(SharedStrings.unescape(SharedStrings.escape("_x0041_ và \r")), "_x0041_ và \r")
    }

    func testDateFormatDetection() {
        XCTAssertTrue(StyleSheet.isDateFormat(id: 14, code: "mm-dd-yy"))
        XCTAssertTrue(StyleSheet.isDateFormat(id: 165, code: "dd/mm/yyyy"))
        XCTAssertTrue(StyleSheet.isDateFormat(id: 166, code: "[$-42A]h:mm AM/PM"))
        XCTAssertTrue(StyleSheet.isDateFormat(id: 167, code: "[h]:mm"))
        XCTAssertFalse(StyleSheet.isDateFormat(id: 164, code: "#,##0\" ₫\""))
        XCTAssertFalse(StyleSheet.isDateFormat(id: 168, code: "[Red]0.00"))
        XCTAssertFalse(StyleSheet.isDateFormat(id: 169, code: "\"Ngày\" 0"))
        XCTAssertFalse(StyleSheet.isDateFormat(id: 0, code: "General"))
    }

    func testNumberFormatting() {
        XCTAssertEqual(Worksheet.format(42), "42")
        XCTAssertEqual(Worksheet.format(-3), "-3")
        XCTAssertEqual(Worksheet.format(0.1), "0.1")
        XCTAssertEqual(Worksheet.format(1e-5), "1E-05")
        XCTAssertEqual(Double(Worksheet.format(1.0 / 3.0)), 1.0 / 3.0)
        XCTAssertEqual(Double(Worksheet.format(1e20)), 1e20)
    }
}
