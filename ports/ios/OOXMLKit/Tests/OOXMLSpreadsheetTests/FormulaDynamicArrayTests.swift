import XCTest
@testable import OOXMLSpreadsheet

/// M7 lát 18: hàm mảng động TRANSPOSE + SEQUENCE (INBOX-MAC #17).
/// M7 lát 19: SORT + FILTER + UNIQUE (INBOX-MAC #17).
/// M7 lát 20: SORTBY (INBOX-MAC #17).
/// Giá trị kỳ vọng theo Excel: SEQUENCE cắt phần lẻ hàng/cột về nguyên,
/// TRANSPOSE đổi hàng ↔ cột, ô lỗi đi qua nguyên vẹn; SORT ổn định, rỗng
/// luôn cuối; FILTER cần bao_gồm logic đúng hình; UNIQUE so trùng không
/// phân biệt hoa/thường với chuỗi, theo giá trị với số; SORTBY sắp hàng
/// theo một hoặc nhiều cột khóa, thứ_tự chỉ nhận ±1.
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

    // MARK: SORT (lát 19)

    /// Lưới 4x3 cho SORT/UNIQUE: hàng 1 và 3 trùng nhau hoàn toàn.
    private func gridEngine() -> FormulaEngine {
        let e = FormulaEngine()
        e.addSheet("Data")
        let rows: [(Double, String, Bool)] = [(3, "b", true), (1, "a", false), (3, "b", true), (2, "c", true)]
        for (i, r) in rows.enumerated() {
            let row = i + 1
            e.setValue(.number(r.0), sheet: "Data", at: "A\(row)")
            e.setValue(.string(r.1), sheet: "Data", at: "B\(row)")
            e.setValue(.bool(r.2), sheet: "Data", at: "C\(row)")
        }
        return e
    }

    func testSortAscendingByFirstColumnStable() {
        let e = gridEngine()
        XCTAssertEqual(cse(e, "=SORT(A1:C4)", "E1:G4"),
                       [.number(1), .string("a"), .bool(false),
                        .number(2), .string("c"), .bool(true),
                        .number(3), .string("b"), .bool(true),
                        .number(3), .string("b"), .bool(true)],
                       "tăng dần theo cột 1; hai hàng 3 giữ nguyên thứ tự (ổn định)")
    }

    func testSortDescendingByFirstColumn() {
        let e = gridEngine()
        XCTAssertEqual(cse(e, "=SORT(A1:C4,1,-1)", "E1:G4"),
                       [.number(3), .string("b"), .bool(true),
                        .number(3), .string("b"), .bool(true),
                        .number(2), .string("c"), .bool(true),
                        .number(1), .string("a"), .bool(false)])
    }

    func testSortByTextColumn() {
        let e = gridEngine()
        XCTAssertEqual(cse(e, "=SORT(A1:C4,2)", "E1:G4"),
                       [.number(1), .string("a"), .bool(false),
                        .number(3), .string("b"), .bool(true),
                        .number(3), .string("b"), .bool(true),
                        .number(2), .string("c"), .bool(true)],
                       "sắp theo cột chuỗi: a < b < c")
    }

    func testSortByColumn() {
        let e = FormulaEngine()
        e.addSheet("Data")
        for (k, v) in ["A1": 3.0, "B1": 1.0, "C1": 2.0] {
            e.setValue(.number(v), sheet: "Data", at: k)
        }
        for (k, v) in ["A2": "c", "B2": "a", "C2": "b"] {
            e.setValue(.string(v), sheet: "Data", at: k)
        }
        XCTAssertEqual(cse(e, "=SORT(A1:C2,1,1,TRUE)", "E1:G2"),
                       [.number(1), .number(2), .number(3), .string("a"), .string("b"), .string("c")],
                       "theo_cột=TRUE: sắp cột theo hàng khóa 1 (đọc theo hàng: 1,2,3 / a,b,c)")
    }

    func testSortBlanksAlwaysLast() {
        let e = FormulaEngine()
        e.addSheet("Data")
        e.setValue(.number(2), sheet: "Data", at: "A1")
        e.setValue(.string("x"), sheet: "Data", at: "B1")
        e.setValue(.string("y"), sheet: "Data", at: "B2")
        e.setValue(.number(1), sheet: "Data", at: "A3")
        e.setValue(.string("z"), sheet: "Data", at: "B3")
        XCTAssertEqual(cse(e, "=SORT(A1:B3)", "D1:E3"),
                       [.number(1), .string("z"), .number(2), .string("x"), .empty, .string("y")],
                       "tăng dần: rỗng cuối")
        XCTAssertEqual(cse(e, "=SORT(A1:B3,1,-1)", "D1:E3"),
                       [.number(2), .string("x"), .number(1), .string("z"), .empty, .string("y")],
                       "giảm dần: rỗng vẫn cuối")
    }

    func testSortBadArgsAreValueError() {
        let e = gridEngine()
        XCTAssertEqual(calc(e, "=SORT(A1:C4,5)"), .error("#VALUE!"), "chỉ mục vượt số cột")
        XCTAssertEqual(calc(e, "=SORT(A1:C4,0)"), .error("#VALUE!"), "chỉ mục 0")
        XCTAssertEqual(calc(e, "=SORT(A1:C4,1,2)"), .error("#VALUE!"), "thứ tự khác ±1")
        XCTAssertEqual(calc(e, "=SORT(A1:C4,1.5)"), .error("#VALUE!"), "chỉ mục không nguyên")
        XCTAssertEqual(calc(e, "=SORT(A1:C4,\"x\")"), .error("#VALUE!"), "chỉ mục không phải số")
    }

    func testSortInsideSum() {
        XCTAssertEqual(calc(engine(), "=SUM(SORT(A1:B2))"), .number(10), "1+2+3+4")
    }

    // MARK: FILTER (lát 19)

    /// A1:B4 dữ liệu, D1:D4 cờ lọc.
    private func filterEngine() -> FormulaEngine {
        let e = FormulaEngine()
        e.addSheet("Data")
        for (i, v) in [(10.0, "a"), (20.0, "b"), (30.0, "c"), (40.0, "d")].enumerated() {
            e.setValue(.number(v.0), sheet: "Data", at: "A\(i + 1)")
            e.setValue(.string(v.1), sheet: "Data", at: "B\(i + 1)")
        }
        for (i, f) in [true, false, true, false].enumerated() {
            e.setValue(.bool(f), sheet: "Data", at: "D\(i + 1)")
        }
        return e
    }

    func testFilterRowsByBooleanColumn() {
        let e = filterEngine()
        XCTAssertEqual(cse(e, "=FILTER(A1:B4,D1:D4)", "F1:G2"),
                       [.number(10), .string("a"), .number(30), .string("c")])
    }

    func testFilterNoMatchIsCalcError() {
        let e = filterEngine()
        for i in 1...4 { e.setValue(.bool(false), sheet: "Data", at: "D\(i)") }
        XCTAssertEqual(calc(e, "=FILTER(A1:B4,D1:D4)"), .error("#CALC!"),
                       "không còn hàng nào và không có nếu_rỗng")
    }

    func testFilterNoMatchUsesIfEmpty() {
        let e = filterEngine()
        for i in 1...4 { e.setValue(.bool(false), sheet: "Data", at: "D\(i)") }
        XCTAssertEqual(calc(e, "=FILTER(A1:B4,D1:D4,\"none\")"), .string("none"))
    }

    func testFilterColumnsByBooleanRow() {
        let e = filterEngine()
        e.setValue(.bool(true), sheet: "Data", at: "E1")
        e.setValue(.bool(false), sheet: "Data", at: "F1")
        XCTAssertEqual(cse(e, "=FILTER(A1:B2,E1:F1)", "H1:H2"),
                       [.number(10), .number(20)],
                       "bao_gồm là hàng logic → giữ cột A (10, 20)")
    }

    func testFilterNonBooleanIncludeIsValueError() {
        let e = filterEngine()
        e.setValue(.number(1), sheet: "Data", at: "D1")
        XCTAssertEqual(calc(e, "=FILTER(A1:B4,D1:D4)"), .error("#VALUE!"))
    }

    func testFilterWrongShapeIncludeIsValueError() {
        let e = filterEngine()
        XCTAssertEqual(calc(e, "=FILTER(A1:B4,D1:D3)"), .error("#VALUE!"),
                       "bao_gồm 3 hàng, mảng 4 hàng")
        XCTAssertEqual(calc(e, "=FILTER(A1:B4,D1:E4)"), .error("#VALUE!"),
                       "bao_gồm 2D cùng hình nhưng không phải 1 hàng/1 cột")
    }

    func testFilterErrorIncludePropagates() {
        let e = filterEngine()
        e.setFormula("=1/0", sheet: "Data", at: "D1")
        XCTAssertEqual(calc(e, "=FILTER(A1:B4,D1:D4)"), .error("#DIV/0!"))
    }

    func testFilterKeepsErrorCells() {
        let e = filterEngine()
        e.setFormula("=1/0", sheet: "Data", at: "A1")
        XCTAssertEqual(cse(e, "=FILTER(A1:B2,D1:D2)", "F1:G1"),
                       [.error("#DIV/0!"), .string("a")],
                       "ô lỗi trong mảng lọc đi qua nguyên vẹn")
    }

    func testFilterInsideSum() {
        XCTAssertEqual(calc(filterEngine(), "=SUM(FILTER(A1:A4,D1:D4))"), .number(40), "10+30")
    }

    // MARK: UNIQUE (lát 19)

    func testUniqueRowsKeepsFirstOccurrence() {
        let e = gridEngine()
        XCTAssertEqual(cse(e, "=UNIQUE(A1:C4)", "E1:G3"),
                       [.number(3), .string("b"), .bool(true),
                        .number(1), .string("a"), .bool(false),
                        .number(2), .string("c"), .bool(true)],
                       "hàng 3 trùng hàng 1 nên bị bỏ")
    }

    func testUniqueExactlyOnce() {
        let e = gridEngine()
        XCTAssertEqual(cse(e, "=UNIQUE(A1:C4,FALSE,TRUE)", "E1:G2"),
                       [.number(1), .string("a"), .bool(false),
                        .number(2), .string("c"), .bool(true)],
                       "chỉ giữ hàng xuất hiện đúng một lần")
    }

    func testUniqueByColumn() {
        let e = FormulaEngine()
        e.addSheet("Data")
        for (k, v) in ["A1": 1.0, "B1": 2.0, "C1": 1.0] {
            e.setValue(.number(v), sheet: "Data", at: k)
        }
        for (k, v) in ["A2": "x", "B2": "y", "C2": "x"] {
            e.setValue(.string(v), sheet: "Data", at: k)
        }
        XCTAssertEqual(cse(e, "=UNIQUE(A1:C2,TRUE)", "E1:F2"),
                       [.number(1), .number(2), .string("x"), .string("y")],
                       "cột 3 trùng cột 1 nên bị bỏ (đọc theo hàng: 1,2 / x,y)")
    }

    func testUniqueTextCaseInsensitive() {
        let e = FormulaEngine()
        e.addSheet("Data")
        for (i, v) in ["An", "an", "Binh"].enumerated() {
            e.setValue(.string(v), sheet: "Data", at: "A\(i + 1)")
        }
        XCTAssertEqual(cse(e, "=UNIQUE(A1:A3)", "C1:C2"),
                       [.string("An"), .string("Binh")],
                       "\"an\" trùng \"An\"")
    }

    func testUniqueNumbersAndEmpty() {
        let e = FormulaEngine()
        e.addSheet("Data")
        e.setValue(.number(1), sheet: "Data", at: "A2")
        e.setValue(.number(0), sheet: "Data", at: "A4")
        XCTAssertEqual(cse(e, "=UNIQUE(A1:A4)", "C1:C3"),
                       [.empty, .number(1), .number(0)],
                       "rỗng trùng rỗng; 0 khác rỗng nên giữ lại")
        let e2 = FormulaEngine()
        e2.addSheet("Data")
        e2.setValue(.number(0), sheet: "Data", at: "A1")
        e2.setValue(.number(-0.0), sheet: "Data", at: "A2")
        e2.setValue(.number(1), sheet: "Data", at: "A3")
        XCTAssertEqual(cse(e2, "=UNIQUE(A1:A3)", "C1:C2"),
                       [.number(0), .number(1)], "-0 trùng 0")
    }

    func testUniqueBadArgsAreValueError() {
        let e = gridEngine()
        XCTAssertEqual(calc(e, "=UNIQUE(A1:C4,1,2,3)"), .error("#VALUE!"), "thừa đối số")
        XCTAssertEqual(calc(e, "=UNIQUE(A1:C4,\"x\")"), .error("#VALUE!"), "theo_cột không phải logic")
    }

    // MARK: SORTBY (lát 20)

    /// A1:C4 như gridEngine; D1:D4 khóa số, E1:E4 khóa chuỗi.
    private func sortByEngine() -> FormulaEngine {
        let e = gridEngine()
        for (i, v) in [20.0, 10.0, 30.0, 40.0].enumerated() {
            e.setValue(.number(v), sheet: "Data", at: "D\(i + 1)")
        }
        for (i, v) in ["b", "a", "d", "c"].enumerated() {
            e.setValue(.string(v), sheet: "Data", at: "E\(i + 1)")
        }
        return e
    }

    func testSortBySingleKeyAscending() {
        let e = sortByEngine()
        XCTAssertEqual(cse(e, "=SORTBY(A1:C4,D1:D4)", "G1:I4"),
                       [.number(1), .string("a"), .bool(false),
                        .number(3), .string("b"), .bool(true),
                        .number(3), .string("b"), .bool(true),
                        .number(2), .string("c"), .bool(true)],
                       "khóa D tăng: 10,20,30,40 → hàng 2,1,3,4")
    }

    func testSortBySingleKeyDescending() {
        let e = sortByEngine()
        XCTAssertEqual(cse(e, "=SORTBY(A1:C4,D1:D4,-1)", "G1:I4"),
                       [.number(2), .string("c"), .bool(true),
                        .number(3), .string("b"), .bool(true),
                        .number(3), .string("b"), .bool(true),
                        .number(1), .string("a"), .bool(false)],
                       "khóa D giảm: 40,30,20,10 → hàng 4,3,1,2")
    }

    func testSortByTwoKeys() {
        let e = sortByEngine()
        // Khóa 1: D theo cặp bằng nhau (20,20 / 10,10...) — dùng khóa mới:
        // ghi đè D thành 2,2,1,1 để khóa 1 có hòa, khóa 2 (E) phá hòa.
        for (i, v) in [2.0, 2.0, 1.0, 1.0].enumerated() {
            e.setValue(.number(v), sheet: "Data", at: "D\(i + 1)")
        }
        XCTAssertEqual(cse(e, "=SORTBY(A1:C4,D1:D4,1,E1:E4,1)", "G1:I4"),
                       [.number(2), .string("c"), .bool(true),
                        .number(3), .string("b"), .bool(true),
                        .number(1), .string("a"), .bool(false),
                        .number(3), .string("b"), .bool(true)],
                       "D tăng rồi E tăng: nhóm D=1 (c<d) → hàng 4,3; nhóm D=2 (a<b) → hàng 2,1")
    }

    func testSortByMixedOrders() {
        let e = sortByEngine()
        for (i, v) in [2.0, 2.0, 1.0, 1.0].enumerated() {
            e.setValue(.number(v), sheet: "Data", at: "D\(i + 1)")
        }
        XCTAssertEqual(cse(e, "=SORTBY(A1:C4,D1:D4,1,E1:E4,-1)", "G1:I4"),
                       [.number(3), .string("b"), .bool(true),
                        .number(2), .string("c"), .bool(true),
                        .number(3), .string("b"), .bool(true),
                        .number(1), .string("a"), .bool(false)],
                       "D tăng, E giảm: nhóm D=1 (d>c) → hàng 3,4; nhóm D=2 (b>a) → hàng 1,2")
    }

    func testSortBySecondKeyDefaultOrder() {
        let e = sortByEngine()
        for (i, v) in [2.0, 2.0, 1.0, 1.0].enumerated() {
            e.setValue(.number(v), sheet: "Data", at: "D\(i + 1)")
        }
        XCTAssertEqual(cse(e, "=SORTBY(A1:C4,D1:D4,1,E1:E4)", "G1:I4"),
                       [.number(2), .string("c"), .bool(true),
                        .number(3), .string("b"), .bool(true),
                        .number(1), .string("a"), .bool(false),
                        .number(3), .string("b"), .bool(true)],
                       "thứ_tự cặp cuối bỏ được, mặc định tăng")
    }

    func testSortByStableOnEqualKeys() {
        let e = sortByEngine()
        for i in 1...4 { e.setValue(.number(5), sheet: "Data", at: "D\(i)") }
        XCTAssertEqual(cse(e, "=SORTBY(A1:C4,D1:D4)", "G1:I4"),
                       [.number(3), .string("b"), .bool(true),
                        .number(1), .string("a"), .bool(false),
                        .number(3), .string("b"), .bool(true),
                        .number(2), .string("c"), .bool(true)],
                       "khóa bằng nhau hết → giữ nguyên thứ tự hàng")
    }

    func testSortByBlanksAlwaysLast() {
        let e = gridEngine()
        e.setValue(.number(2), sheet: "Data", at: "D2")
        e.setValue(.number(1), sheet: "Data", at: "D3")
        XCTAssertEqual(cse(e, "=SORTBY(A1:C4,D1:D4)", "G1:I4"),
                       [.number(3), .string("b"), .bool(true),
                        .number(1), .string("a"), .bool(false),
                        .number(3), .string("b"), .bool(true),
                        .number(2), .string("c"), .bool(true)],
                       "khóa tăng: 1,2 rồi rỗng (hàng 1,4 giữ thứ tự)")
        XCTAssertEqual(cse(e, "=SORTBY(A1:C4,D1:D4,-1)", "G1:I4"),
                       [.number(1), .string("a"), .bool(false),
                        .number(3), .string("b"), .bool(true),
                        .number(3), .string("b"), .bool(true),
                        .number(2), .string("c"), .bool(true)],
                       "khóa giảm: 2,1 rồi rỗng vẫn cuối")
    }

    func testSortByBadArgsAreValueError() {
        let e = sortByEngine()
        XCTAssertEqual(calc(e, "=SORTBY(A1:C4)"), .error("#VALUE!"), "thiếu theo_mảng")
        XCTAssertEqual(calc(e, "=SORTBY(A1:C4,D1:D3)"), .error("#VALUE!"), "khóa 3 hàng, mảng 4 hàng")
        XCTAssertEqual(calc(e, "=SORTBY(A1:C4,D1:E4)"), .error("#VALUE!"), "khóa 2 cột, không phải cột đơn")
        XCTAssertEqual(calc(e, "=SORTBY(A1:C4,D1:G1)"), .error("#VALUE!"), "khóa là hàng ngang 1x4")
        XCTAssertEqual(calc(e, "=SORTBY(A1:C4,D1:D4,2)"), .error("#VALUE!"), "thứ_tự khác ±1")
        XCTAssertEqual(calc(e, "=SORTBY(A1:C4,D1:D4,\"x\")"), .error("#VALUE!"), "thứ_tự không phải số")
        XCTAssertEqual(calc(e, "=SORTBY(A1:C4,D1:D4,1,E1:E4,0)"), .error("#VALUE!"), "thứ_tự cặp 2 bằng 0")
    }

    func testSortByErrorKeySortsAsValue() {
        let e = sortByEngine()
        e.setFormula("=1/0", sheet: "Data", at: "D1")
        XCTAssertEqual(cse(e, "=SORTBY(A1:C4,D1:D4)", "G1:I4"),
                       [.number(1), .string("a"), .bool(false),
                        .number(3), .string("b"), .bool(true),
                        .number(2), .string("c"), .bool(true),
                        .number(3), .string("b"), .bool(true)],
                       "ô lỗi trong cột khóa được sắp như giá trị (sau số), như SORT")
    }

    func testSortByErrorArgPropagates() {
        let e = sortByEngine()
        XCTAssertEqual(calc(e, "=SORTBY(A1:C4,1/0)"), .error("#DIV/0!"),
                       "theo_mảng là biểu thức lỗi → lan truyền")
    }

    func testSortByInsideSum() {
        let e = engine()
        e.setValue(.number(20), sheet: "Data", at: "D1")
        e.setValue(.number(10), sheet: "Data", at: "D2")
        XCTAssertEqual(calc(e, "=SUM(SORTBY(A1:B2,D1:D2))"), .number(10), "1+2+3+4")
    }

    // MARK: Kết hợp (lát 19)

    func testSortOfUnique() {
        let e = gridEngine()
        XCTAssertEqual(cse(e, "=SORT(UNIQUE(A1:C4))", "E1:G3"),
                       [.number(1), .string("a"), .bool(false),
                        .number(2), .string("c"), .bool(true),
                        .number(3), .string("b"), .bool(true)])
    }

    func testFilterOfSort() {
        let e = filterEngine()
        XCTAssertEqual(cse(e, "=FILTER(SORT(A1:B4,1,-1),D1:D4)", "F1:G2"),
                       [.number(40), .string("d"), .number(20), .string("b")],
                       "sắp giảm dần (40,30,20,10) rồi lọc theo cờ D1:D4: giữ vị trí 1 và 3")
    }

    // MARK: TAKE / DROP / CHOOSEROWS / CHOOSECOLS (M7 lát 24, INBOX-MAC #17)

    // TAKE: lấy đầu/cuối; bỏ trống trục = lấy hết trục đó; 0 → #CALC!;
    // vượt kích thước → kẹp về toàn bộ trục (không lỗi).

    func testTakeFirstRow() {
        XCTAssertEqual(cse(engine(), "=TAKE(A1:B2,1)", "D1:E1"),
                       [.number(1), .number(2)])
    }

    func testTakeLastRow() {
        XCTAssertEqual(cse(engine(), "=TAKE(A1:B2,-1)", "D1:E1"),
                       [.number(3), .number(4)])
    }

    func testTakeFirstColumnOnly() {
        XCTAssertEqual(cse(engine(), "=TAKE(A1:B2,,1)", "D1:D2"),
                       [.number(1), .number(3)], "hàng bỏ trống = lấy hết hàng")
    }

    func testTakeLastColumnOnly() {
        XCTAssertEqual(cse(engine(), "=TAKE(A1:B2,,-1)", "D1:D2"),
                       [.number(2), .number(4)])
    }

    func testTakeRowsAndCols() {
        XCTAssertEqual(cse(engine(), "=TAKE(A1:B2,-1,-1)", "D1"),
                       [.number(4)], "hàng cuối + cột cuối = ô 4")
    }

    func testTakeClampsOversize() {
        let e = engine()
        XCTAssertEqual(cse(e, "=TAKE(A1:B2,5)", "D1:E2"),
                       [.number(1), .number(2), .number(3), .number(4)],
                       "xin 5 hàng trên 2 hàng có → trả hết, không lỗi")
        XCTAssertEqual(cse(e, "=TAKE(A1:B2,-9,9)", "D1:E2"),
                       [.number(1), .number(2), .number(3), .number(4)],
                       "âm vượt và cột vượt đều kẹp về toàn bộ")
    }

    func testTakeTruncatesFraction() {
        XCTAssertEqual(cse(engine(), "=TAKE(A1:B2,1.9)", "D1:E1"),
                       [.number(1), .number(2)], "1.9 cắt về 1")
    }

    func testTakeZeroIsCalcError() {
        XCTAssertEqual(calc(engine(), "=TAKE(A1:B2,0)"), .error("#CALC!"))
        XCTAssertEqual(calc(engine(), "=TAKE(A1:B2,1,0)"), .error("#CALC!"))
    }

    func testTakeNoAxisIsValueError() {
        XCTAssertEqual(calc(engine(), "=TAKE(A1:B2)"), .error("#VALUE!"),
                       "phải cho ít nhất một trục")
        XCTAssertEqual(calc(engine(), "=TAKE(A1:B2,,)"), .error("#VALUE!"))
    }

    func testTakeWrongArgCount() {
        XCTAssertEqual(calc(engine(), "=TAKE(A1:B2,1,1,1)"), .error("#VALUE!"))
    }

    func testTakeNonNumericIsValueError() {
        XCTAssertEqual(calc(engine(), "=TAKE(A1:B2,\"x\")"), .error("#VALUE!"))
    }

    func testTakeErrorArgPropagates() {
        XCTAssertEqual(calc(engine(), "=TAKE(A1:B2,1/0)"), .error("#DIV/0!"))
    }

    func testTakeInsideSum() {
        XCTAssertEqual(calc(engine(), "=SUM(TAKE(A1:B2,1))"), .number(3), "1+2")
    }

    func testTakeArrayConstant() {
        XCTAssertEqual(cse(engine(), "=TAKE({1,2;3,4},-1)", "D1:E1"),
                       [.number(3), .number(4)])
    }

    // DROP: bỏ đầu/cuối; không đối số = nguyên mảng; 0 tường minh hoặc bỏ
    // hết/vượt kích thước → #CALC!.

    func testDropFirstRow() {
        XCTAssertEqual(cse(engine(), "=DROP(A1:B2,1)", "D1:E1"),
                       [.number(3), .number(4)])
    }

    func testDropLastRow() {
        XCTAssertEqual(cse(engine(), "=DROP(A1:B2,-1)", "D1:E1"),
                       [.number(1), .number(2)])
    }

    func testDropFirstColumnOnly() {
        XCTAssertEqual(cse(engine(), "=DROP(A1:B2,,1)", "D1:D2"),
                       [.number(2), .number(4)], "hàng bỏ trống = giữ hết hàng")
    }

    func testDropRowsAndCols() {
        XCTAssertEqual(cse(engine(), "=DROP(A1:B2,1,-1)", "D1"),
                       [.number(3)], "bỏ hàng đầu + cột cuối = ô 3")
    }

    func testDropNoArgsReturnsWholeArray() {
        XCTAssertEqual(cse(engine(), "=DROP(A1:B2)", "D1:E2"),
                       [.number(1), .number(2), .number(3), .number(4)])
    }

    func testDropZeroIsCalcError() {
        XCTAssertEqual(calc(engine(), "=DROP(A1:B2,0)"), .error("#CALC!"))
        XCTAssertEqual(calc(engine(), "=DROP(A1:B2,1,0)"), .error("#CALC!"))
    }

    func testDropAllOrMoreIsCalcError() {
        let e = engine()
        XCTAssertEqual(calc(e, "=DROP(A1:B2,2)"), .error("#CALC!"), "bỏ hết 2 hàng")
        XCTAssertEqual(calc(e, "=DROP(A1:B2,3)"), .error("#CALC!"), "bỏ hơn số hàng có")
        XCTAssertEqual(calc(e, "=DROP(A1:B2,0,2)"), .error("#CALC!"), "bỏ hết 2 cột")
    }

    func testDropNonNumericIsValueError() {
        XCTAssertEqual(calc(engine(), "=DROP(A1:B2,\"x\")"), .error("#VALUE!"))
    }

    func testDropWrongArgCount() {
        XCTAssertEqual(calc(engine(), "=DROP(A1:B2,1,1,1)"), .error("#VALUE!"))
    }

    func testDropErrorArgPropagates() {
        XCTAssertEqual(calc(engine(), "=DROP(A1:B2,1/0)"), .error("#DIV/0!"))
    }

    func testDropTruncatesFraction() {
        XCTAssertEqual(cse(engine(), "=DROP(A1:B2,1.9)", "D1:E1"),
                       [.number(3), .number(4)], "1.9 cắt về 1")
    }

    // CHOOSEROWS / CHOOSECOLS: chỉ mục 1-based, âm đếm từ cuối; 0 hoặc
    // vượt kích thước → #VALUE!; giữ thứ tự đối số, cho trùng.

    func testChooseRowsReorders() {
        XCTAssertEqual(cse(engine(), "=CHOOSEROWS(A1:B2,2,1)", "D1:E2"),
                       [.number(3), .number(4), .number(1), .number(2)])
    }

    func testChooseRowsNegativeAndDuplicate() {
        XCTAssertEqual(cse(engine(), "=CHOOSEROWS(A1:B2,-1,1,1)", "D1:E3"),
                       [.number(3), .number(4), .number(1), .number(2),
                        .number(1), .number(2)])
    }

    func testChooseRowsBadIndexIsValueError() {
        let e = engine()
        XCTAssertEqual(calc(e, "=CHOOSEROWS(A1:B2,0)"), .error("#VALUE!"))
        XCTAssertEqual(calc(e, "=CHOOSEROWS(A1:B2,3)"), .error("#VALUE!"))
        XCTAssertEqual(calc(e, "=CHOOSEROWS(A1:B2,-3)"), .error("#VALUE!"))
        XCTAssertEqual(calc(e, "=CHOOSEROWS(A1:B2,1.9,0)"), .error("#VALUE!"),
                       "1.9 cắt về 1 nhưng 0 vẫn lỗi")
    }

    func testChooseRowsNoIndexIsValueError() {
        XCTAssertEqual(calc(engine(), "=CHOOSEROWS(A1:B2)"), .error("#VALUE!"))
    }

    func testChooseRowsErrorArgPropagates() {
        XCTAssertEqual(calc(engine(), "=CHOOSEROWS(A1:B2,1/0)"), .error("#DIV/0!"))
    }

    func testChooseColsReorders() {
        XCTAssertEqual(cse(engine(), "=CHOOSECOLS(A1:B2,2,1)", "D1:E2"),
                       [.number(2), .number(1), .number(4), .number(3)])
    }

    func testChooseColsNegativeAndDuplicate() {
        XCTAssertEqual(cse(engine(), "=CHOOSECOLS(A1:B2,-1,1,1)", "D1:F2"),
                       [.number(2), .number(1), .number(1),
                        .number(4), .number(3), .number(3)])
    }

    func testChooseColsBadIndexIsValueError() {
        let e = engine()
        XCTAssertEqual(calc(e, "=CHOOSECOLS(A1:B2,0)"), .error("#VALUE!"))
        XCTAssertEqual(calc(e, "=CHOOSECOLS(A1:B2,3)"), .error("#VALUE!"))
    }

    func testChooseColsInsideSum() {
        XCTAssertEqual(calc(engine(), "=SUM(CHOOSECOLS(A1:B2,2))"), .number(6), "2+4")
    }

    // Kết hợp lát 24 với lát 19/20.

    func testTakeOfSort() {
        let e = gridEngine()
        XCTAssertEqual(cse(e, "=TAKE(SORT(A1:C4,1,1),2)", "E1:G2"),
                       [.number(1), .string("a"), .bool(false),
                        .number(2), .string("c"), .bool(true)])
    }

    func testChooseRowsOfFilter() {
        let e = filterEngine()
        XCTAssertEqual(cse(e, "=CHOOSEROWS(FILTER(A1:B4,D1:D4),2)", "F1:G1"),
                       [.number(30), .string("c")],
                       "lọc giữ (10,a),(30,c) rồi lấy hàng 2")
    }
}
