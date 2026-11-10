import XCTest
@testable import OOXMLSpreadsheet

/// M7 lát 3: MEDIAN / LARGE / SMALL / RANK — quy ước Excel
/// (xem FormulaFunctionsSlice2.orderStatsNumbers/median/largeSmall/rank).
final class FormulaOrderStatsTests: XCTestCase {
    func n(_ d: Double) -> CellValue { .number(d) }
    func err(_ e: String) -> CellValue { .error(e) }

    func calc(_ formula: String, _ cells: [String: CellValue] = [:]) -> CellValue {
        let e = FormulaEngine()
        e.addSheet("Sheet1")
        for (k, v) in cells { e.setValue(v, sheet: "Sheet1", at: k) }
        e.setFormula(formula, sheet: "Sheet1", at: "Z99")
        e.recalculate()
        return e.value(sheet: "Sheet1", at: "Z99")
    }

    /// Vùng A1:A4 = 10, 20, 30, 40 (kèm một ô chữ + một ô logic bị bỏ qua).
    var range: [String: CellValue] {
        ["A1": n(10), "A2": n(20), "A3": n(30), "A4": n(40),
         "A5": .string("khong-tinh"), "A6": .bool(true)]
    }

    func testMedian() {
        XCTAssertEqual(calc("MEDIAN(1,2,3)"), n(2))
        XCTAssertEqual(calc("MEDIAN(1,2,3,4)"), n(2.5))
        XCTAssertEqual(calc("MEDIAN(A1:A4)", range), n(25))
        XCTAssertEqual(calc("MEDIAN(A1:A6)", range), n(25), "chữ/logic trong vùng bị bỏ qua")
        XCTAssertEqual(calc("MEDIAN(5,\"7\",9)"), n(7), "chuỗi số trực tiếp được ép")
    }

    func testMedianErrors() {
        XCTAssertEqual(calc("MEDIAN()"), err("#VALUE!"))
        XCTAssertEqual(calc("MEDIAN(\"abc\")"), err("#VALUE!"))
        XCTAssertEqual(calc("MEDIAN(A5:A6)", range), err("#DIV/0!"), "không có số nào")
        XCTAssertEqual(calc("MEDIAN(#N/A)"), err("#N/A"), "lỗi lan truyền")
    }

    func testLarge() {
        XCTAssertEqual(calc("LARGE(A1:A4,1)", range), n(40))
        XCTAssertEqual(calc("LARGE(A1:A4,2)", range), n(30))
        XCTAssertEqual(calc("LARGE(A1:A4,4)", range), n(10))
        XCTAssertEqual(calc("LARGE(A1:A4,1.9)", range), n(40), "k cắt về nguyên")
        XCTAssertEqual(calc("LARGE(10,1)"), n(10), "một giá trị đơn, k = 1")
    }

    func testLargeErrors() {
        XCTAssertEqual(calc("LARGE(A1:A4,0)", range), err("#NUM!"))
        XCTAssertEqual(calc("LARGE(A1:A4,5)", range), err("#NUM!"))
        XCTAssertEqual(calc("LARGE(A1:A4)", range), err("#VALUE!"))
        XCTAssertEqual(calc("LARGE(A1:A4,\"x\")", range), err("#VALUE!"))
    }

    func testSmall() {
        XCTAssertEqual(calc("SMALL(A1:A4,1)", range), n(10))
        XCTAssertEqual(calc("SMALL(A1:A4,3)", range), n(30))
        XCTAssertEqual(calc("SMALL(A1:A6,4)", range), n(40), "chữ/logic trong vùng bị bỏ qua")
    }

    func testSmallErrors() {
        XCTAssertEqual(calc("SMALL(A1:A4,0)", range), err("#NUM!"))
        XCTAssertEqual(calc("SMALL(A1:A4,9)", range), err("#NUM!"))
        XCTAssertEqual(calc("SMALL(A1:A4,1,2)", range), err("#VALUE!"))
    }

    func testRank() {
        XCTAssertEqual(calc("RANK(30,A1:A4)", range), n(2), "mặc định giảm dần")
        XCTAssertEqual(calc("RANK(40,A1:A4)", range), n(1))
        XCTAssertEqual(calc("RANK(10,A1:A4)", range), n(4))
        XCTAssertEqual(calc("RANK(30,A1:A4,1)", range), n(3), "tăng dần")
        XCTAssertEqual(calc("RANK(10,A1:A4,1)", range), n(1))
        XCTAssertEqual(calc("RANK(20,A1:A4,0)", range), n(3))
    }

    func testRankTiesAndErrors() {
        let ties: [String: CellValue] = ["A1": n(10), "A2": n(20), "A3": n(20), "A4": n(30)]
        XCTAssertEqual(calc("RANK(20,A1:A4)", ties), n(2), "bằng nhau chia sẻ hạng")
        XCTAssertEqual(calc("RANK(30,A1:A4)", ties), n(1))
        XCTAssertEqual(calc("RANK(25,A1:A4)", range), err("#N/A"), "số không có trong danh sách")
        XCTAssertEqual(calc("RANK(10,A5:A6)", range), err("#N/A"), "danh sách rỗng sau khi bỏ chữ/logic")
        XCTAssertEqual(calc("RANK(10)", range), err("#VALUE!"))
        XCTAssertEqual(calc("RANK(10,A1:A4,\"x\")", range), err("#VALUE!"))
    }
}
