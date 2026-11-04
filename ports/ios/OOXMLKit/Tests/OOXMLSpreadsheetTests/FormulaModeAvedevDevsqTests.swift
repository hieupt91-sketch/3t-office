import XCTest
@testable import OOXMLSpreadsheet

/// M7 lát 7: MODE.SNGL (+ bí danh cũ MODE), AVEDEV, DEVSQ.
/// MODE.MULT (trả về mảng) chưa làm — thuộc phần array/dynamic array sau.
final class FormulaModeAvedevDevsqTests: XCTestCase {
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

    func num(_ formula: String, _ cells: [String: CellValue] = [:]) -> Double {
        if case .number(let d) = calc(formula, cells) { return d }
        XCTFail("mong số, nhận \(calc(formula, cells)) cho \(formula)")
        return .nan
    }

    /// Vùng A1:A6 = 5, 7, 7, 9, 7, 3 (kèm một ô chữ + một ô logic bị bỏ qua).
    /// Tổng 38, trung bình 19/3; DEVSQ = 64/3, AVEDEV = 14/9.
    var range: [String: CellValue] {
        ["A1": n(5), "A2": n(7), "A3": n(7), "A4": n(9), "A5": n(7), "A6": n(3),
         "A7": .string("khong-tinh"), "A8": .bool(true)]
    }

    func testMode() {
        XCTAssertEqual(num("MODE.SNGL(A1:A6)", range), 7, accuracy: 1e-9)
        XCTAssertEqual(num("MODE(A1:A6)", range), 7, accuracy: 1e-9, "MODE = MODE.SNGL")
        XCTAssertEqual(num("MODE.SNGL(A1:A8)", range), 7, accuracy: 1e-9, "chữ/logic trong vùng bị bỏ qua")
        XCTAssertEqual(num("MODE.SNGL(5,7,7,9)", range), 7, accuracy: 1e-9, "đối số trực tiếp")
        XCTAssertEqual(num("MODE.SNGL(1,2,1,2)", range), 1, accuracy: 1e-9, "hòa nhau → gặp đầu tiên")
    }

    func testAvedevDevsq() {
        XCTAssertEqual(num("AVEDEV(A1:A6)", range), 14.0 / 9, accuracy: 1e-9)
        XCTAssertEqual(num("DEVSQ(A1:A6)", range), 64.0 / 3, accuracy: 1e-9)
        XCTAssertEqual(num("AVEDEV(A1:A8)", range), 14.0 / 9, accuracy: 1e-9, "chữ/logic trong vùng bị bỏ qua")
        XCTAssertEqual(num("DEVSQ(5,7,7,9,7,3)", range), 64.0 / 3, accuracy: 1e-9, "đối số trực tiếp")
        XCTAssertEqual(num("AVEDEV(A1)", range), 0, accuracy: 1e-9, "một giá trị")
        XCTAssertEqual(num("DEVSQ(A1)", range), 0, accuracy: 1e-9, "một giá trị")
    }

    func testModeAvedevDevsqErrors() {
        XCTAssertEqual(calc("MODE.SNGL(A1,A4,A6)", range), err("#N/A"), "không giá trị nào lặp lại")
        XCTAssertEqual(calc("MODE.SNGL(A7:A8)", range), err("#N/A"), "không có số nào")
        XCTAssertEqual(calc("AVEDEV(A7:A8)", range), err("#DIV/0!"), "không có số nào")
        XCTAssertEqual(calc("DEVSQ(A7:A8)", range), err("#DIV/0!"), "không có số nào")
        XCTAssertEqual(calc("MODE.SNGL()", range), err("#VALUE!"), "thiếu đối số")
        XCTAssertEqual(calc("AVEDEV(A1:A6,\"x\")", range), err("#VALUE!"), "chuỗi trực tiếp ép không được")
        XCTAssertEqual(calc("DEVSQ(#N/A)", range), err("#N/A"), "lỗi lan truyền")
    }
}
