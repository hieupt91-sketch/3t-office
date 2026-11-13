import XCTest
@testable import OOXMLSpreadsheet

/// M7 lát 30: số General 15 chữ số của Excel — cắt literal về 15 chữ số có nghĩa
/// (không làm tròn lên) + chuyển số sang chuỗi theo General.
/// Nguồn chuẩn: Excel 2016 (golden-batch13/14, `docs/sync/OOXMLKIT-GOLDEN-ORACLE-0511.md` mục 3).
final class FormulaGeneralNumberTests: XCTestCase {
    /// Tính một công thức tại Sheet1!Z99.
    func calc(_ formula: String) -> CellValue {
        let e = FormulaEngine()
        e.addSheet("Sheet1")
        e.setFormula(formula, sheet: "Sheet1", at: "Z99")
        e.recalculate()
        return e.value(sheet: "Sheet1", at: "Z99")
    }
    let n = { (d: Double) in CellValue.number(d) }
    let s = { (t: String) in CellValue.string(t) }

    // MARK: Literal cắt về 15 chữ số có nghĩa (không làm tròn lên).

    func testLiteralTruncatesTo15SignificantDigits() {
        XCTAssertEqual(calc("=123456789012345678"), n(123456789012345000))
        XCTAssertEqual(calc("=9999999999999999"), n(9999999999999990))
        XCTAssertEqual(calc("=0.9999999999999999"), n(0.999999999999999))
        XCTAssertEqual(calc("=0.1234567890123456789"), n(0.123456789012345))
        XCTAssertEqual(calc("=123.4567890123456789"), n(123.456789012345))
    }

    func testLiteralShortValuesUnchanged() {
        XCTAssertEqual(calc("=123"), n(123))
        XCTAssertEqual(calc("=1.5"), n(1.5))
        XCTAssertEqual(calc("=0.00001234"), n(0.00001234))
        XCTAssertEqual(calc("=1E15"), n(1e15))
        XCTAssertEqual(calc("=1.5E-300"), n(1.5e-300))
    }

    // MARK: Số sang chuỗi theo General (toán tử &, LEN).

    func testConcatLargeIntegersPlain() {
        XCTAssertEqual(calc("=\"x\"&1E15"), s("x1000000000000000"))
        XCTAssertEqual(calc("=\"x\"&123456789012345678"), s("x123456789012345000"))
        XCTAssertEqual(calc("=\"x\"&12345678901234567890"), s("x12345678901234500000"))
        XCTAssertEqual(calc("=\"x\"&9999999999999999"), s("x9999999999999990"))
    }

    func testConcatScientific() {
        XCTAssertEqual(calc("=\"x\"&1E20"), s("x1E+20"))
        XCTAssertEqual(calc("=\"x\"&1E21"), s("x1E+21"))
        XCTAssertEqual(calc("=\"x\"&100000000000000000000"), s("x1E+20"))
        XCTAssertEqual(calc("=\"x\"&(2^70)"), s("x1.18059162071741E+21"))
        XCTAssertEqual(calc("=\"x\"&(2^-20)"), s("x9.5367431640625E-07"))
        XCTAssertEqual(calc("=\"x\"&1.5E-300"), s("x1.5E-300"))
        XCTAssertEqual(calc("=\"x\"&(1E300*10)"), s("x1E+301"))
    }

    func testConcatSmallDecimalsPlain() {
        XCTAssertEqual(calc("=\"x\"&1E-7"), s("x0.0000001"))
        XCTAssertEqual(calc("=\"x\"&1E-9"), s("x0.000000001"))
        XCTAssertEqual(calc("=\"x\"&1E-10"), s("x0.0000000001"))
        XCTAssertEqual(calc("=\"x\"&1E-11"), s("x0.00000000001"))
        XCTAssertEqual(calc("=\"x\"&0.00001234"), s("x0.00001234"))
        XCTAssertEqual(calc("=\"x\"&0.1234567890123456789"), s("x0.123456789012345"))
        XCTAssertEqual(calc("=\"x\"&0.9999999999999999"), s("x0.999999999999999"))
    }

    func testConcatOrdinaryNumbers() {
        XCTAssertEqual(calc("=\"x\"&123"), s("x123"))
        XCTAssertEqual(calc("=\"x\"&1.5"), s("x1.5"))
        XCTAssertEqual(calc("=\"x\"&0.3"), s("x0.3"))
        XCTAssertEqual(calc("=\"x\"&(0.1+0.2)"), s("x0.3"))
        XCTAssertEqual(calc("=\"x\"&-5"), s("x-5"))
        XCTAssertEqual(calc("=\"x\"&1000000"), s("x1000000"))
        XCTAssertEqual(calc("=\"x\"&(1/3)"), s("x0.333333333333333"))
        XCTAssertEqual(calc("=\"x\"&0"), s("x0"))
    }

    func testLenUsesGeneralFormat() {
        XCTAssertEqual(calc("=LEN(1E15)"), n(16))
        XCTAssertEqual(calc("=LEN(1E20)"), n(5))
        XCTAssertEqual(calc("=LEN(123)"), n(3))
    }

    func testDirectTextHelper() {
        XCTAssertEqual(FormulaEvaluator.text(.number(1e15)), "1000000000000000")
        XCTAssertEqual(FormulaEvaluator.text(.number(1e20)), "1E+20")
        XCTAssertEqual(FormulaEvaluator.text(.number(0.0000001)), "0.0000001")
        XCTAssertEqual(FormulaEvaluator.text(.number(-3)), "-3")
        XCTAssertEqual(FormulaEvaluator.text(.number(0)), "0")
    }
}
