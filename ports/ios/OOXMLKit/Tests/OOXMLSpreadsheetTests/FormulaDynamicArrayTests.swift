import XCTest
@testable import OOXMLSpreadsheet

/// M7 lát 18: hàm mảng động TRANSPOSE + SEQUENCE (INBOX-MAC #17).
/// Giá trị kỳ vọng theo Excel: SEQUENCE cắt phần lẻ hàng/cột về nguyên,
/// TRANSPOSE đổi hàng ↔ cột, ô lỗi đi qua nguyên vẹn.
final class FormulaDynamicArrayTests: XCTestCase {
    private func engine() -> FormulaEngine {
        let e = FormulaEngine()
        e.addSheet("Data")
        for (k, v) in ["A1": 1.0, "B1": 2.0, "A2": 3.0, "B2": 4.0] {
            e.setValue(.number(v), sheet: "Data", at: k)
        }
        return e
    }

    private func calc(_ e: FormulaEngine, _ formula: String, at: String = "Z99") -> CellValue {
        e.setFormula(formula, sheet: "Data", at: at)
        e.recalculate()
        return e.value(sheet: "Data", at: at)
    }

    /// Đặt công thức mảng (CSE) lên vùng rồi đọc toàn bộ giá trị theo thứ tự hàng.
    private func cse(_ e: FormulaEngine, _ formula: String, _ range: String) -> [CellValue] {
        let r = CellRange(range)!
        e.setArrayFormula(formula, sheet: "Data", range: r)
        e.recalculate()
        var out: [CellValue] = []
        for row in r.start.row...r.end.row {
            for col in r.start.column...r.end.column {
                out.append(e.value(sheet: "Data", at: CellReference(column: col, row: row).a1))
            }
        }
        return out
    }

    // MARK: TRANSPOSE

    func testTransposeRangeViaCSE() {
        let e = engine()
        XCTAssertEqual(cse(e, "=TRANSPOSE(A1:B2)", "D1:E2"),
                       [.number(1), .number(3), .number(2), .number(4)],
                       "2x2 chuyển vị: hàng 1 = 1,3; hàng 2 = 2,4")
    }

    func testTransposeRectangularRange() {
        let e = engine()
        e.setValue(.number(5), sheet: "Data", at: "C1")
        e.setValue(.number(6), sheet: "Data", at: "C2")
        XCTAssertEqual(cse(e, "=TRANSPOSE(A1:C2)", "D1:E3"),
                       [.number(1), .number(3), .number(2), .number(4), .number(5), .number(6)],
                       "2 hàng x 3 cột thành 3 hàng x 2 cột")
    }

    func testTransposeArrayConstant() {
        let e = engine()
        XCTAssertEqual(cse(e, "=TRANSPOSE({1,2;3,4})", "D1:E2"),
                       [.number(1), .number(3), .number(2), .number(4)])
    }

    func testTransposeSingleCell() {
        XCTAssertEqual(calc(engine(), "=TRANSPOSE(A1)"), .number(1), "ô đơn chuyển vị ra chính nó")
    }

    func testTransposeInSum() {
        XCTAssertEqual(calc(engine(), "=SUM(TRANSPOSE(A1:B2))"), .number(10), "1+2+3+4")
    }

    func testTransposeWrongArgCount() {
        let e = engine()
        XCTAssertEqual(calc(e, "=TRANSPOSE(A1:B2,A1)"), .error("#VALUE!"))
        XCTAssertEqual(calc(e, "=TRANSPOSE()"), .error("#VALUE!"))
    }

    func testTransposePropagatesErrorCell() {
        let e = engine()
        e.setFormula("=1/0", sheet: "Data", at: "A1")
        XCTAssertEqual(calc(e, "=SUM(TRANSPOSE(A1:B2))"), .error("#DIV/0!"),
                       "ô lỗi trong vùng chuyển vị lan ra nguyên vẹn")
    }

    // MARK: SEQUENCE

    func testSequenceDefaults() {
        XCTAssertEqual(calc(engine(), "=SUM(SEQUENCE(3))"), .number(6), "1+2+3")
    }

    func testSequenceShapeAndStepViaCSE() {
        let e = engine()
        XCTAssertEqual(cse(e, "=SEQUENCE(2,3,10,5)", "D1:F2"),
                       [.number(10), .number(15), .number(20),
                        .number(25), .number(30), .number(35)],
                       "bắt đầu 10, bước 5, điền theo hàng")
    }

    func testSequenceFractionalStep() {
        let e = engine()
        XCTAssertEqual(cse(e, "=SEQUENCE(2,2,0,0.5)", "D1:E2"),
                       [.number(0), .number(0.5), .number(1), .number(1.5)])
    }

    func testSequenceTruncatesFractionalRows() {
        XCTAssertEqual(calc(engine(), "=SUM(SEQUENCE(2.9,1))"), .number(3),
                       "2.9 hàng cắt về 2: 1+2")
    }

    func testSequenceZeroOrNegativeIsValueError() {
        let e = engine()
        XCTAssertEqual(calc(e, "=SEQUENCE(0)"), .error("#VALUE!"))
        XCTAssertEqual(calc(e, "=SEQUENCE(2,-1)"), .error("#VALUE!"))
        XCTAssertEqual(calc(e, "=SEQUENCE(-3)"), .error("#VALUE!"))
    }

    func testSequenceTextArgIsValueError() {
        let e = engine()
        XCTAssertEqual(calc(e, "=SEQUENCE(\"x\")"), .error("#VALUE!"))
        XCTAssertEqual(calc(e, "=SEQUENCE(2,2,1,\"a\")"), .error("#VALUE!"))
    }

    func testSequenceTooManyArgsIsValueError() {
        XCTAssertEqual(calc(engine(), "=SEQUENCE(1,1,1,1,1)"), .error("#VALUE!"))
    }

    func testSequenceOversizeIsCalcError() {
        let e = engine()
        XCTAssertEqual(calc(e, "=SEQUENCE(2000,2000)"), .error("#CALC!"),
                       "4.000.000 ô vượt giới hạn 1.000.000 phần tử")
        XCTAssertEqual(calc(e, "=SEQUENCE(1000000,2)"), .error("#CALC!"))
    }

    func testSequenceOverflowStepIsCalcError() {
        XCTAssertEqual(calc(engine(), "=SEQUENCE(3,1,1e308,1e308)"), .error("#CALC!"),
                       "bước làm tràn Double")
    }

    func testSequenceErrorArgPropagates() {
        let e = engine()
        e.setFormula("=1/0", sheet: "Data", at: "A1")
        XCTAssertEqual(calc(e, "=SEQUENCE(A1)"), .error("#DIV/0!"))
    }

    func testSequenceInSingleCellIsValueError() {
        XCTAssertEqual(calc(engine(), "=SEQUENCE(2,2)"), .error("#VALUE!"),
                       "mảng nhiều ô ở ô thường không có vị trí CSE")
    }

    // MARK: Kết hợp

    func testTransposeOfSequence() {
        let e = engine()
        XCTAssertEqual(cse(e, "=TRANSPOSE(SEQUENCE(2,3))", "D1:E3"),
                       [.number(1), .number(4), .number(2), .number(5), .number(3), .number(6)],
                       "SEQUENCE 2x3 chuyển vị thành 3x2")
    }

    func testSequenceInsideSumWithTranspose() {
        XCTAssertEqual(calc(engine(), "=SUM(TRANSPOSE(SEQUENCE(3,2)))"), .number(21),
                       "1..6 = 21, không phụ thuộc thứ tự chuyển vị")
    }
}
