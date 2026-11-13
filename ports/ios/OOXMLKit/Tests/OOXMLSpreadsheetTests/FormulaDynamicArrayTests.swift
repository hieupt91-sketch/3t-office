import XCTest
@testable import OOXMLSpreadsheet

/// M7 lát 18: hàm mảng động TRANSPOSE + SEQUENCE (INBOX-MAC #17).
/// M7 lát 19: SORT + FILTER + UNIQUE (INBOX-MAC #17).
/// M7 lát 20: SORTBY (INBOX-MAC #17).
/// M7 lát 24: TAKE / DROP / CHOOSEROWS / CHOOSECOLS (INBOX-MAC #17).
/// M7 lát 25: TOCOL / TOROW / HSTACK / VSTACK (INBOX-MAC #17).
/// M7 lát 26: RANDARRAY / WRAPROWS / WRAPCOLS (INBOX-MAC #17).
/// M7 lát 27: TEXTSPLIT / TEXTBEFORE / TEXTAFTER (INBOX-MAC #17).
/// M7 lát 28: LAMBDA — giá trị hàm, gọi trực tiếp, qua LET, qua tên định nghĩa (đệ quy).
/// M7 lát 29: MAP / BYROW / BYCOL / SCAN / REDUCE / MAKEARRAY (INBOX-MAC #17).
/// M7 lát 34: MMULT / MUNIT (INBOX-MAC #17).
/// M7 lát 35: EXPAND (INBOX-MAC #17).
/// M7 lát 36: toán tử giao ngầm "@" (INBOX-MAC #17).
/// M7 lát 37: toán tử tràn "#" (INBOX-MAC #17).
/// M7 lát 38: GROUPBY (INBOX-MAC #17).
/// M7 lát 39: PIVOTBY (INBOX-MAC #17).
/// M7 lát 40: ARRAYTOTEXT / VALUETOTEXT (INBOX-MAC #17).
/// M7 lát 41: INDIRECT (INBOX-MAC #17).
/// M7 lát 42: MAXIFS / MINIFS / AVERAGEIFS (INBOX-MAC #17).
/// M7 lát 43: FREQUENCY (INBOX-MAC #17).
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

    // MARK: TOCOL / TOROW (M7 lát 25, INBOX-MAC #17)

    // TOCOL: trải thành một cột; mặc định duyệt theo hàng; bỏ_qua 0 giữ tất
    // cả, 1 bỏ trống, 2 bỏ lỗi, 3 bỏ cả hai; quét_theo_cột TRUE duyệt theo cột.

    func testTocolDefaultRowScan() {
        XCTAssertEqual(cse(engine(), "=TOCOL(A1:B2)", "D1:D4"),
                       [.number(1), .number(2), .number(3), .number(4)],
                       "duyệt theo hàng: 1,2 rồi 3,4")
    }

    func testTocolScanByColumn() {
        XCTAssertEqual(cse(engine(), "=TOCOL(A1:B2,,TRUE)", "D1:D4"),
                       [.number(1), .number(3), .number(2), .number(4)],
                       "duyệt theo cột: 1,3 rồi 2,4")
    }

    func testTocolIgnoreBlanks() {
        let e = FormulaEngine()
        e.addSheet("Data")
        e.setValue(.number(1), sheet: "Data", at: "A1")
        e.setValue(.number(3), sheet: "Data", at: "A2")
        e.setValue(.number(4), sheet: "Data", at: "B2")
        XCTAssertEqual(cse(e, "=TOCOL(A1:B2,1)", "D1:D3"),
                       [.number(1), .number(3), .number(4)], "B1 trống bị bỏ")
        XCTAssertEqual(cse(e, "=TOCOL(A1:B2,1.9)", "D1:D3"),
                       [.number(1), .number(3), .number(4)], "1.9 cắt về 1")
    }

    func testTocolIgnoreErrors() {
        let e = engine()
        e.setFormula("=1/0", sheet: "Data", at: "A1")
        XCTAssertEqual(cse(e, "=TOCOL(A1:B2,2)", "D1:D3"),
                       [.number(2), .number(3), .number(4)], "ô lỗi A1 bị bỏ")
    }

    func testTocolIgnoreBlanksAndErrors() {
        let e = FormulaEngine()
        e.addSheet("Data")
        e.setFormula("=1/0", sheet: "Data", at: "A1")
        e.setValue(.number(3), sheet: "Data", at: "A2")
        e.setValue(.number(4), sheet: "Data", at: "B2")
        XCTAssertEqual(cse(e, "=TOCOL(A1:B2,3)", "D1:D2"),
                       [.number(3), .number(4)], "B1 trống + A1 lỗi đều bị bỏ")
    }

    func testTocolKeepsErrorByDefault() {
        let e = engine()
        e.setFormula("=1/0", sheet: "Data", at: "A1")
        XCTAssertEqual(calc(e, "=SUM(TOCOL(A1:B2))"), .error("#DIV/0!"),
                       "mặc định giữ ô lỗi, SUM lan lỗi")
    }

    func testTocolAllFilteredIsCalcError() {
        let e = FormulaEngine()
        e.addSheet("Data")
        XCTAssertEqual(calc(e, "=TOCOL(C1:C2,1)"), .error("#CALC!"),
                       "toàn ô trống, lọc hết → mảng rỗng")
        e.setFormula("=1/0", sheet: "Data", at: "C1")
        XCTAssertEqual(calc(e, "=TOCOL(C1,2)"), .error("#CALC!"),
                       "ô lỗi duy nhất bị lọc hết → mảng rỗng")
    }

    func testTocolBadIgnoreIsValueError() {
        let e = engine()
        XCTAssertEqual(calc(e, "=TOCOL(A1:B2,4)"), .error("#VALUE!"))
        XCTAssertEqual(calc(e, "=TOCOL(A1:B2,-1)"), .error("#VALUE!"))
        XCTAssertEqual(calc(e, "=TOCOL(A1:B2,\"x\")"), .error("#VALUE!"))
        XCTAssertEqual(calc(e, "=TOCOL(A1:B2,,\"x\")"), .error("#VALUE!"),
                       "quét_theo_cột không phải logic")
    }

    func testTocolWrongArgCount() {
        XCTAssertEqual(calc(engine(), "=TOCOL()"), .error("#VALUE!"))
        XCTAssertEqual(calc(engine(), "=TOCOL(A1:B2,1,TRUE,1)"), .error("#VALUE!"))
    }

    func testTocolErrorArgPropagates() {
        XCTAssertEqual(calc(engine(), "=TOCOL(A1:B2,1/0)"), .error("#DIV/0!"))
        XCTAssertEqual(calc(engine(), "=TOCOL(A1:B2,0,1/0)"), .error("#DIV/0!"))
    }

    func testTocolInSum() {
        XCTAssertEqual(calc(engine(), "=SUM(TOCOL(A1:B2))"), .number(10), "1+2+3+4")
        XCTAssertEqual(calc(engine(), "=SUM(TOCOL(A1:B2,,TRUE))"), .number(10))
    }

    func testTocolArrayConstant() {
        XCTAssertEqual(cse(engine(), "=TOCOL({1,2;3,4},,TRUE)", "D1:D4"),
                       [.number(1), .number(3), .number(2), .number(4)])
    }

    // TOROW: như TOCOL nhưng ra một hàng.

    func testTorowDefaultRowScan() {
        XCTAssertEqual(cse(engine(), "=TOROW(A1:B2)", "D1:G1"),
                       [.number(1), .number(2), .number(3), .number(4)])
    }

    func testTorowScanByColumn() {
        XCTAssertEqual(cse(engine(), "=TOROW(A1:B2,,TRUE)", "D1:G1"),
                       [.number(1), .number(3), .number(2), .number(4)])
    }

    func testTorowIgnoreBlanks() {
        let e = FormulaEngine()
        e.addSheet("Data")
        e.setValue(.number(1), sheet: "Data", at: "A1")
        e.setValue(.number(3), sheet: "Data", at: "A2")
        e.setValue(.number(4), sheet: "Data", at: "B2")
        XCTAssertEqual(cse(e, "=TOROW(A1:B2,1)", "D1:F1"),
                       [.number(1), .number(3), .number(4)])
    }

    func testTorowAllFilteredIsCalcError() {
        XCTAssertEqual(calc(engine(), "=TOROW(C1:C2,1)"), .error("#CALC!"))
    }

    func testTorowBadIgnoreIsValueError() {
        XCTAssertEqual(calc(engine(), "=TOROW(A1:B2,5)"), .error("#VALUE!"))
        XCTAssertEqual(calc(engine(), "=TOROW()"), .error("#VALUE!"))
    }

    // MARK: HSTACK / VSTACK (M7 lát 25, INBOX-MAC #17)

    // Xếp nhiều mảng; mảng ngắn/hẹp hơn được đệm #N/A; đối số đơn coi là 1x1.

    func testHstackTwoRanges() {
        XCTAssertEqual(cse(engine(), "=HSTACK(A1:A2,B1:B2)", "D1:E2"),
                       [.number(1), .number(2), .number(3), .number(4)])
    }

    func testHstackPadsShorterWithNA() {
        let e = engine()
        e.setValue(.number(5), sheet: "Data", at: "C1")
        XCTAssertEqual(cse(e, "=HSTACK(A1:B2,C1)", "D1:F2"),
                       [.number(1), .number(2), .number(5),
                        .number(3), .number(4), .error("#N/A")],
                       "C1 chỉ 1 hàng nên hàng 2 đệm #N/A")
    }

    func testHstackScalarArg() {
        XCTAssertEqual(cse(engine(), "=HSTACK(A1:B2,9)", "D1:F2"),
                       [.number(1), .number(2), .number(9),
                        .number(3), .number(4), .error("#N/A")])
    }

    func testHstackSingleArg() {
        XCTAssertEqual(cse(engine(), "=HSTACK(A1:B2)", "D1:E2"),
                       [.number(1), .number(2), .number(3), .number(4)])
    }

    func testHstackNoArgsIsValueError() {
        XCTAssertEqual(calc(engine(), "=HSTACK()"), .error("#VALUE!"))
    }

    func testHstackErrorArgPropagates() {
        XCTAssertEqual(calc(engine(), "=HSTACK(A1:B2,1/0)"), .error("#DIV/0!"))
    }

    func testHstackKeepsErrorCell() {
        let e = engine()
        e.setFormula("=1/0", sheet: "Data", at: "A1")
        XCTAssertEqual(calc(e, "=SUM(HSTACK(A1:B2))"), .error("#DIV/0!"))
    }

    func testVstackTwoRanges() {
        XCTAssertEqual(cse(engine(), "=VSTACK(A1:B1,A2:B2)", "D1:E2"),
                       [.number(1), .number(2), .number(3), .number(4)])
    }

    func testVstackPadsNarrowerWithNA() {
        let e = engine()
        e.setValue(.number(5), sheet: "Data", at: "C1")
        XCTAssertEqual(cse(e, "=VSTACK(A1:B2,C1)", "D1:E3"),
                       [.number(1), .number(2),
                        .number(3), .number(4),
                        .number(5), .error("#N/A")],
                       "C1 chỉ 1 cột nên cột 2 đệm #N/A")
    }

    func testVstackScalarArg() {
        XCTAssertEqual(cse(engine(), "=VSTACK(A1:B2,9)", "D1:E3"),
                       [.number(1), .number(2),
                        .number(3), .number(4),
                        .number(9), .error("#N/A")])
    }

    func testVstackSingleArg() {
        XCTAssertEqual(cse(engine(), "=VSTACK(A1:B2)", "D1:E2"),
                       [.number(1), .number(2), .number(3), .number(4)])
    }

    func testVstackNoArgsIsValueError() {
        XCTAssertEqual(calc(engine(), "=VSTACK()"), .error("#VALUE!"))
    }

    func testVstackErrorArgPropagates() {
        XCTAssertEqual(calc(engine(), "=VSTACK(A1:B2,1/0)"), .error("#DIV/0!"))
    }

    // Kết hợp lát 25 với các lát trước.

    func testTocolOfHstack() {
        XCTAssertEqual(cse(engine(), "=TOCOL(HSTACK(A1:A2,B1:B2))", "D1:D4"),
                       [.number(1), .number(2), .number(3), .number(4)],
                       "HSTACK ra [[1,2],[3,4]] rồi TOCOL duyệt theo hàng")
    }

    func testVstackOfTorow() {
        XCTAssertEqual(cse(engine(), "=VSTACK(TOROW(A1:B2),TOROW(A1:B2))", "D1:G2"),
                       [.number(1), .number(2), .number(3), .number(4),
                        .number(1), .number(2), .number(3), .number(4)])
    }

    // MARK: RANDARRAY (M7 lát 26, INBOX-MAC #17)

    /// RANDARRAY sinh số ngẫu nhiên nên chỉ kiểm hình, khoảng giá trị và
    /// tính nguyên — không kiểm giá trị cụ thể (trừ khi nhỏ_nhất == lớn_nhất).
    private func numbersInRange(_ values: [CellValue], _ lo: Double, _ hi: Double, hiInclusive: Bool = false) -> Bool {
        values.allSatisfy {
            guard case .number(let d) = $0 else { return false }
            return hiInclusive ? (d >= lo && d <= hi) : (d >= lo && d < hi)
        }
    }

    private func allIntegers(_ values: [CellValue]) -> Bool {
        values.allSatisfy {
            guard case .number(let d) = $0 else { return false }
            return d == d.rounded()
        }
    }

    func testRandArrayDefaultSingleCell() {
        let v = calc(engine(), "=RANDARRAY()")
        XCTAssertTrue(numbersInRange([v], 0, 1), "mặc định 1 ô trong [0,1): \(v)")
    }

    func testRandArrayShapeAndBounds() {
        let v = cse(engine(), "=RANDARRAY(2,3)", "D1:F2")
        XCTAssertEqual(v.count, 6)
        XCTAssertTrue(numbersInRange(v, 0, 1), "2x3, mọi ô trong [0,1)")
    }

    func testRandArrayMinMax() {
        let v = cse(engine(), "=RANDARRAY(2,2,5,10)", "D1:E2")
        XCTAssertTrue(numbersInRange(v, 5, 10), "mọi ô trong [5,10)")
    }

    func testRandArrayMinEqualsMaxDecimal() {
        XCTAssertEqual(cse(engine(), "=RANDARRAY(2,2,5,5)", "D1:E2"),
                       [.number(5), .number(5), .number(5), .number(5)],
                       "nhỏ_nhất == lớn_nhất → toàn bộ bằng 5")
    }

    func testRandArrayInteger() {
        let v = cse(engine(), "=RANDARRAY(3,3,1,10,TRUE)", "D1:F3")
        XCTAssertTrue(allIntegers(v), "nguyên=TRUE → toàn số nguyên")
        XCTAssertTrue(numbersInRange(v, 1, 10, hiInclusive: true), "mọi ô trong [1,10]")
    }

    func testRandArrayIntegerMinEqualsMax() {
        XCTAssertEqual(calc(engine(), "=SUM(RANDARRAY(2,2,7,7,TRUE))"), .number(28),
                       "nguyên, nhỏ_nhất == lớn_nhất = 7 → tổng 4x7")
    }

    func testRandArrayIntegerNegativeRange() {
        let v = cse(engine(), "=RANDARRAY(2,2,-5,-1,TRUE)", "D1:E2")
        XCTAssertTrue(allIntegers(v))
        XCTAssertTrue(numbersInRange(v, -5, -1, hiInclusive: true), "mọi ô trong [-5,-1]")
    }

    func testRandArrayTruncatesFractionalRows() {
        XCTAssertEqual(calc(engine(), "=SUM(RANDARRAY(2.9,1,5,5))"), .number(10),
                       "2.9 hàng cắt về 2, mỗi ô = 5")
    }

    func testRandArrayZeroOrNegativeIsValueError() {
        let e = engine()
        XCTAssertEqual(calc(e, "=RANDARRAY(0)"), .error("#VALUE!"))
        XCTAssertEqual(calc(e, "=RANDARRAY(2,0)"), .error("#VALUE!"))
        XCTAssertEqual(calc(e, "=RANDARRAY(-3)"), .error("#VALUE!"))
    }

    func testRandArrayMinGreaterThanMaxIsValueError() {
        XCTAssertEqual(calc(engine(), "=RANDARRAY(1,1,10,5)"), .error("#VALUE!"))
    }

    func testRandArrayNonNumericIsValueError() {
        let e = engine()
        XCTAssertEqual(calc(e, "=RANDARRAY(\"x\")"), .error("#VALUE!"))
        XCTAssertEqual(calc(e, "=RANDARRAY(1,1,\"x\",2)"), .error("#VALUE!"))
        XCTAssertEqual(calc(e, "=RANDARRAY(1,1,0,1,\"x\")"), .error("#VALUE!"))
    }

    func testRandArrayErrorArgPropagates() {
        let e = engine()
        XCTAssertEqual(calc(e, "=RANDARRAY(1/0)"), .error("#DIV/0!"))
        XCTAssertEqual(calc(e, "=RANDARRAY(1,1,1/0,2)"), .error("#DIV/0!"))
        XCTAssertEqual(calc(e, "=RANDARRAY(1,1,0,1,1/0)"), .error("#DIV/0!"))
    }

    func testRandArrayWrongArgCount() {
        XCTAssertEqual(calc(engine(), "=RANDARRAY(1,1,0,1,TRUE,2)"), .error("#VALUE!"))
    }

    func testRandArrayInSum() {
        XCTAssertEqual(calc(engine(), "=SUM(RANDARRAY(2,2,5,5))"), .number(20))
    }

    // MARK: WRAPROWS (M7 lát 26, INBOX-MAC #17)

    func testWrapRowsBasic() {
        XCTAssertEqual(cse(engine(), "=WRAPROWS({1,2,3,4,5},2)", "D1:E3"),
                       [.number(1), .number(2), .number(3), .number(4), .number(5), .error("#N/A")],
                       "nhóm cuối thiếu 1 ô đệm #N/A")
    }

    func testWrapRowsColumnVector() {
        XCTAssertEqual(cse(engine(), "=WRAPROWS({1;2;3;4;5},2)", "D1:E3"),
                       [.number(1), .number(2), .number(3), .number(4), .number(5), .error("#N/A")],
                       "vectơ cột gói giống vectơ hàng")
    }

    func testWrapRowsPadWith() {
        XCTAssertEqual(cse(engine(), "=WRAPROWS({1,2,3},2,\"x\")", "D1:E2"),
                       [.number(1), .number(2), .number(3), .string("x")])
    }

    func testWrapRowsExactFit() {
        XCTAssertEqual(cse(engine(), "=WRAPROWS({1,2,3,4},2)", "D1:E2"),
                       [.number(1), .number(2), .number(3), .number(4)])
    }

    func testWrapRowsWrapOne() {
        XCTAssertEqual(cse(engine(), "=WRAPROWS({1,2,3},1)", "D1:D3"),
                       [.number(1), .number(2), .number(3)],
                       "số_gói = 1 → thành cột")
    }

    func testWrapRowsWrapMoreThanLength() {
        XCTAssertEqual(cse(engine(), "=WRAPROWS({1,2},5)", "D1:H1"),
                       [.number(1), .number(2), .error("#N/A"), .error("#N/A"), .error("#N/A")])
    }

    func testWrapRowsTwoDimensionalIsValueError() {
        XCTAssertEqual(calc(engine(), "=WRAPROWS(A1:B2,2)"), .error("#VALUE!"))
    }

    func testWrapRowsBadWrapIsValueError() {
        let e = engine()
        XCTAssertEqual(calc(e, "=WRAPROWS({1,2},0)"), .error("#VALUE!"))
        XCTAssertEqual(calc(e, "=WRAPROWS({1,2},-1)"), .error("#VALUE!"))
        XCTAssertEqual(calc(e, "=WRAPROWS({1,2},\"x\")"), .error("#VALUE!"))
    }

    func testWrapRowsErrorArgPropagates() {
        let e = engine()
        XCTAssertEqual(cse(e, "=WRAPROWS(1/0,2)", "D1:E1"),
                       [.error("#DIV/0!"), .error("#N/A")],
                       "ô lỗi trong vectơ đi vào mảng kết quả (ô đơn đọc mảng nhiều ô → #VALUE! theo quy ước scalar())")
        XCTAssertEqual(calc(e, "=WRAPROWS({1,2},1/0)"), .error("#DIV/0!"),
                       "lỗi ở đối số số_gói lan truyền dạng scalar")
    }

    func testWrapRowsPadErrorPropagates() {
        XCTAssertEqual(calc(engine(), "=WRAPROWS({1,2,3},2,1/0)"), .error("#DIV/0!"))
    }

    func testWrapRowsWrongArgCount() {
        let e = engine()
        XCTAssertEqual(calc(e, "=WRAPROWS({1,2})"), .error("#VALUE!"))
        XCTAssertEqual(calc(e, "=WRAPROWS({1,2},2,0,1)"), .error("#VALUE!"))
    }

    func testWrapRowsInSum() {
        XCTAssertEqual(calc(engine(), "=SUM(WRAPROWS({1,2,3,4},2))"), .number(10))
    }

    // MARK: WRAPCOLS (M7 lát 26, INBOX-MAC #17)

    func testWrapColsBasic() {
        XCTAssertEqual(cse(engine(), "=WRAPCOLS({1,2,3,4,5},2)", "D1:F2"),
                       [.number(1), .number(3), .number(5),
                        .number(2), .number(4), .error("#N/A")],
                       "gói theo cột: cột 1 = 1,2; cột 2 = 3,4; cột 3 = 5,#N/A")
    }

    func testWrapColsPadWith() {
        XCTAssertEqual(cse(engine(), "=WRAPCOLS({1,2,3},2,\"x\")", "D1:E2"),
                       [.number(1), .number(3), .number(2), .string("x")])
    }

    func testWrapColsExactFit() {
        XCTAssertEqual(cse(engine(), "=WRAPCOLS({1,2,3,4},2)", "D1:E2"),
                       [.number(1), .number(3), .number(2), .number(4)])
    }

    func testWrapColsTwoDimensionalIsValueError() {
        XCTAssertEqual(calc(engine(), "=WRAPCOLS(A1:B2,2)"), .error("#VALUE!"))
    }

    func testWrapColsBadWrapIsValueError() {
        let e = engine()
        XCTAssertEqual(calc(e, "=WRAPCOLS({1,2},0)"), .error("#VALUE!"))
        XCTAssertEqual(calc(e, "=WRAPCOLS({1,2},-1)"), .error("#VALUE!"))
    }

    func testWrapColsInSum() {
        XCTAssertEqual(calc(engine(), "=SUM(WRAPCOLS({1,2,3,4},2))"), .number(10))
    }


    func testWrapColsOfWrapRows() {
        XCTAssertEqual(calc(engine(), "=WRAPCOLS(WRAPROWS({1,2,3,4},2),2)"), .error("#VALUE!"),
                       "WRAPROWS trả mảng 2 chiều nên WRAPCOLS từ chối đúng")
        XCTAssertEqual(cse(engine(), "=WRAPCOLS(TOCOL({1,2;3,4}),2)", "D1:E2"),
                       [.number(1), .number(3), .number(2), .number(4)],
                       "TOCOL thành vectơ cột rồi WRAPCOLS gói lại")
    }

    // MARK: TEXTBEFORE / TEXTAFTER (M7 lát 27, INBOX-MAC #17)

    func testTextBeforeBasic() {
        let e = engine()
        XCTAssertEqual(calc(e, "=TEXTBEFORE(\"a,b,c\",\",\")"), .string("a"))
        XCTAssertEqual(calc(e, "=TEXTBEFORE(\"a,b,c\",\",\",2)"), .string("a,b"))
        XCTAssertEqual(calc(e, "=TEXTBEFORE(\"a,b,c\",\",\",-1)"), .string("a,b"))
        XCTAssertEqual(calc(e, "=TEXTBEFORE(\"a,b,c\",\",\",-2)"), .string("a"))
    }

    func testTextAfterBasic() {
        let e = engine()
        XCTAssertEqual(calc(e, "=TEXTAFTER(\"a,b,c\",\",\")"), .string("b,c"))
        XCTAssertEqual(calc(e, "=TEXTAFTER(\"a,b,c\",\",\",2)"), .string("c"))
        XCTAssertEqual(calc(e, "=TEXTAFTER(\"a,b,c\",\",\",-1)"), .string("c"))
        XCTAssertEqual(calc(e, "=TEXTAFTER(\"a,b,c\",\",\",-2)"), .string("b,c"))
    }

    func testTextBeforeAfterMultiCharDelimiter() {
        let e = engine()
        XCTAssertEqual(calc(e, "=TEXTBEFORE(\"hello world\",\"o w\")"), .string("hell"))
        XCTAssertEqual(calc(e, "=TEXTAFTER(\"hello world\",\"o w\")"), .string("orld"))
    }

    func testTextBeforeAfterNotFound() {
        let e = engine()
        XCTAssertEqual(calc(e, "=TEXTBEFORE(\"abc\",\",\")"), .error("#N/A"))
        XCTAssertEqual(calc(e, "=TEXTAFTER(\"abc\",\",\")"), .error("#N/A"))
        XCTAssertEqual(calc(e, "=TEXTBEFORE(\"abc\",\",\",1,0,0,\"none\")"), .string("none"))
        XCTAssertEqual(calc(e, "=TEXTAFTER(\"abc\",\",\",1,0,0,42)"), .number(42),
                       "nếu_không_tìm_thấy nhận cả số")
        XCTAssertEqual(calc(e, "=TEXTBEFORE(\"a,b\",\",\",5)"), .error("#N/A"),
                       "lần vượt số lần xuất hiện → #N/A")
    }

    func testTextBeforeAfterMatchEnd() {
        let e = engine()
        XCTAssertEqual(calc(e, "=TEXTBEFORE(\"a,b\",\",\",2,0,1)"), .string("a,b"),
                       "khớp_cuối=1: cuối văn bản tính như lần thứ 2")
        XCTAssertEqual(calc(e, "=TEXTAFTER(\"a,b\",\",\",2,0,1)"), .string(""),
                       "sau cuối văn bản là chuỗi rỗng")
        XCTAssertEqual(calc(e, "=TEXTBEFORE(\"a,b\",\",\",2)"), .error("#N/A"),
                       "không khớp_cuối → #N/A")
        XCTAssertEqual(calc(e, "=TEXTAFTER(\"a,b\",\",\",-2,0,1)"), .string("a,b"),
                       "lần âm + khớp_cuối=1: đầu văn bản tính như một lần xuất hiện")
        XCTAssertEqual(calc(e, "=TEXTBEFORE(\"a,b\",\",\",-2,0,1)"), .string(""),
                       "trước đầu văn bản là chuỗi rỗng")
        XCTAssertEqual(calc(e, "=TEXTBEFORE(\"a,b\",\",\",3,0,1)"), .error("#N/A"),
                       "khớp_cuối chỉ thêm đúng một lần xuất hiện")
    }

    func testTextBeforeAfterCaseMode() {
        let e = engine()
        XCTAssertEqual(calc(e, "=TEXTBEFORE(\"aXbXc\",\"x\")"), .error("#N/A"),
                       "mặc định phân biệt hoa/thường")
        XCTAssertEqual(calc(e, "=TEXTBEFORE(\"aXbXc\",\"x\",1,1)"), .string("a"))
        XCTAssertEqual(calc(e, "=TEXTAFTER(\"aXbXc\",\"x\",1,1)"), .string("bXc"))
        XCTAssertEqual(calc(e, "=TEXTAFTER(\"aXbXc\",\"x\",2,1)"), .string("c"))
    }

    func testTextBeforeAfterBadArgs() {
        let e = engine()
        XCTAssertEqual(calc(e, "=TEXTBEFORE(\"a,b\",\",\",0)"), .error("#VALUE!"), "lần = 0")
        XCTAssertEqual(calc(e, "=TEXTAFTER(\"a,b\",\",\",0)"), .error("#VALUE!"))
        XCTAssertEqual(calc(e, "=TEXTBEFORE(\"a,b\",\",\",1,2)"), .error("#VALUE!"), "chế_độ_khớp khác 0/1")
        XCTAssertEqual(calc(e, "=TEXTBEFORE(\"a,b\",\",\",1,0,2)"), .error("#VALUE!"), "khớp_cuối khác 0/1")
        XCTAssertEqual(calc(e, "=TEXTBEFORE(\"abc\",\"\")"), .error("#VALUE!"), "phân_cách rỗng")
        XCTAssertEqual(calc(e, "=TEXTBEFORE(\"a\")"), .error("#VALUE!"), "thiếu đối số")
        XCTAssertEqual(calc(e, "=TEXTBEFORE(\"\",\",\")"), .error("#N/A"), "văn_bản rỗng → không tìm thấy")
    }

    func testTextBeforeAfterNumberText() {
        let e = engine()
        XCTAssertEqual(calc(e, "=TEXTBEFORE(12345,\"3\")"), .string("12"), "số ép sang chuỗi")
        XCTAssertEqual(calc(e, "=TEXTAFTER(12345,\"3\")"), .string("45"))
    }

    func testTextBeforeAfterErrorArgPropagates() {
        let e = engine()
        XCTAssertEqual(calc(e, "=TEXTBEFORE(1/0,\",\")"), .error("#DIV/0!"))
        XCTAssertEqual(calc(e, "=TEXTBEFORE(\"a,b\",1/0)"), .error("#DIV/0!"))
        XCTAssertEqual(calc(e, "=TEXTAFTER(\"a,b\",\",\",1/0)"), .error("#DIV/0!"))
    }

    func testTextBeforeAfterTruncatesInstance() {
        XCTAssertEqual(calc(engine(), "=TEXTBEFORE(\"a,b,c\",\",\",1.9)"), .string("a"),
                       "lần 1.9 cắt về 1")
    }

    // MARK: INDIRECT (M7 lát 41, INBOX-MAC #17)

    func testIndirectSingleCell() {
        let e = engine()
        XCTAssertEqual(calc(e, "=INDIRECT(\"A1\")"), .number(1))
        XCTAssertEqual(calc(e, "=INDIRECT(\"B2\")"), .number(4))
        XCTAssertEqual(calc(e, "=INDIRECT(\"Data!B1\")"), .number(2))
        XCTAssertEqual(calc(e, "=INDIRECT(\"$A$1\")"), .number(1), "dấu $ bỏ qua")
        XCTAssertEqual(calc(e, "=INDIRECT(\"a1\")"), .number(1), "không phân biệt hoa/thường")
    }

    func testIndirectQuotedSheet() {
        let e = engine()
        e.addSheet("Du lieu")
        e.setValue(.number(7), sheet: "Du lieu", at: "A1")
        XCTAssertEqual(calc(e, "=INDIRECT(\"'Du lieu'!A1\")"), .number(7))
    }

    func testIndirectRangeAsFunctionArg() {
        let e = engine()
        XCTAssertEqual(calc(e, "=SUM(INDIRECT(\"A1:B2\"))"), .number(10))
        XCTAssertEqual(calc(e, "=AVERAGE(INDIRECT(\"A1:A2\"))"), .number(2))
        XCTAssertEqual(calc(e, "=INDIRECT(\"A1:B2\")"), .error("#VALUE!"),
                       "vùng nhiều ô ở vị trí scalar → #VALUE!")
    }

    func testIndirectRangeViaCSE() {
        XCTAssertEqual(cse(engine(), "=INDIRECT(\"A1:B2\")", "D1:E2"),
                       [.number(1), .number(2), .number(3), .number(4)])
    }

    func testPlainRangeCSEMapsByOffset() {
        // Hồi quy cho sửa scalar() lát 41: vùng thường trong CSE cũng ánh xạ
        // theo độ lệch gốc vùng mảng (trước đây trả #VALUE! ở cả 4 ô).
        XCTAssertEqual(cse(engine(), "=A1:B2", "D1:E2"),
                       [.number(1), .number(2), .number(3), .number(4)])
    }

    func testIndirectR1C1Absolute() {
        let e = engine()
        XCTAssertEqual(calc(e, "=INDIRECT(\"R1C1\",FALSE)"), .number(1))
        XCTAssertEqual(calc(e, "=INDIRECT(\"R2C2\",FALSE)"), .number(4))
        XCTAssertEqual(calc(e, "=SUM(INDIRECT(\"R1C1:R2C2\",FALSE))"), .number(10))
        XCTAssertEqual(calc(e, "=INDIRECT(\"r2c1\",FALSE)"), .number(3), "R/C không phân biệt hoa/thường")
    }

    func testIndirectR1C1Relative() {
        let e = engine()
        e.setValue(.number(42), sheet: "Data", at: "D4")
        XCTAssertEqual(calc(e, "=INDIRECT(\"R[-1]C[-1]\",FALSE)", at: "E5"), .number(42),
                       "tương đối so với ô công thức E5 → D4")
        XCTAssertEqual(calc(e, "=INDIRECT(\"R1C[-4]\",FALSE)", at: "E5"), .number(1),
                       "hàng tuyệt đối + cột tương đối → A1")
    }

    func testIndirectDefinedName() {
        let e = engine()
        e.defineName("Tong", sheet: "Data", range: CellRange(CellReference(column: 1, row: 1), CellReference(column: 1, row: 2)))
        e.defineName("Gia", sheet: "Data", range: CellRange(CellReference(column: 2, row: 1), CellReference(column: 2, row: 1)))
        XCTAssertEqual(calc(e, "=SUM(INDIRECT(\"Tong\"))"), .number(4))
        XCTAssertEqual(calc(e, "=INDIRECT(\"Gia\")"), .number(2), "tên trỏ một ô → giá trị ô")
        XCTAssertEqual(calc(e, "=INDIRECT(\"tong\")"), .error("#VALUE!"),
                       "tên vùng nhiều ô ở vị trí scalar → #VALUE!")
    }

    func testIndirectInvalid() {
        let e = engine()
        XCTAssertEqual(calc(e, "=INDIRECT(\"Xyz\")"), .error("#REF!"), "tên không tồn tại")
        XCTAssertEqual(calc(e, "=INDIRECT(\"1+1\")"), .error("#REF!"), "không phải tham chiếu")
        XCTAssertEqual(calc(e, "=INDIRECT(\"SUM(A1)\")"), .error("#REF!"), "không tính biểu thức")
        XCTAssertEqual(calc(e, "=INDIRECT(123)"), .error("#REF!"), "số → chuỗi không phải tham chiếu")
        XCTAssertEqual(calc(e, "=INDIRECT(\"\")"), .error("#REF!"), "chuỗi rỗng")
        XCTAssertEqual(calc(e, "=INDIRECT(\"NoSheet!A1\")"), .error("#REF!"), "sheet không tồn tại")
        XCTAssertEqual(calc(e, "=INDIRECT(\"A1\",FALSE)"), .error("#REF!"), "\"A1\" không phải R1C1")
        XCTAssertEqual(calc(e, "=INDIRECT(\"R0C1\",FALSE)"), .error("#REF!"), "hàng 0")
        XCTAssertEqual(calc(e, "=INDIRECT(\"R1C99999\",FALSE)"), .error("#REF!"), "cột vượt XFD")
        XCTAssertEqual(calc(e, "=INDIRECT(\"B:B\")"), .error("#VALUE!"), "cả cột ở vị trí scalar")
        XCTAssertEqual(calc(e, "=INDIRECT(\"2:2\")"), .error("#VALUE!"), "cả hàng ở vị trí scalar")
    }

    func testIndirectErrorPropagationAndBadArgs() {
        let e = engine()
        XCTAssertEqual(calc(e, "=INDIRECT(1/0)"), .error("#DIV/0!"))
        XCTAssertEqual(calc(e, "=INDIRECT(\"A1\",\"x\")"), .error("#VALUE!"), "a1 không ép được bool")
        XCTAssertEqual(calc(e, "=INDIRECT()"), .error("#VALUE!"), "thiếu đối số")
        XCTAssertEqual(calc(e, "=INDIRECT(\"A1\",TRUE,1)"), .error("#VALUE!"), "thừa đối số")
        XCTAssertEqual(calc(e, "=INDIRECT(\"A1\",0)"), .error("#REF!"), "a1=0 → kiểu R1C1, \"A1\" sai")
    }

    // MARK: TEXTSPLIT (M7 lát 27, INBOX-MAC #17)

    func testTextSplitBasicColumns() {
        XCTAssertEqual(cse(engine(), "=TEXTSPLIT(\"a,b,c\",\",\")", "D1:F1"),
                       [.string("a"), .string("b"), .string("c")])
    }

    func testTextSplitRowsOnly() {
        XCTAssertEqual(cse(engine(), "=TEXTSPLIT(\"a;b;c\",,\";\")", "D1:D3"),
                       [.string("a"), .string("b"), .string("c")],
                       "chỉ phân_cách_hàng → một cột")
    }

    func testTextSplitGrid() {
        XCTAssertEqual(cse(engine(), "=TEXTSPLIT(\"a,b;c,d\",\",\",\";\")", "D1:E2"),
                       [.string("a"), .string("b"), .string("c"), .string("d")])
    }

    func testTextSplitKeepsEmptyByDefault() {
        XCTAssertEqual(cse(engine(), "=TEXTSPLIT(\"a,,b\",\",\")", "D1:F1"),
                       [.string("a"), .string(""), .string("b")])
        XCTAssertEqual(cse(engine(), "=TEXTSPLIT(\",a,\",\",\")", "D1:F1"),
                       [.string(""), .string("a"), .string("")],
                       "phân cách ở đầu/cuối tạo đoạn rỗng")
    }

    func testTextSplitIgnoreEmpty() {
        XCTAssertEqual(cse(engine(), "=TEXTSPLIT(\"a,,b\",\",\",,TRUE)", "D1:E1"),
                       [.string("a"), .string("b")])
        XCTAssertEqual(cse(engine(), "=TEXTSPLIT(\"a,,b;c\",\",\",\";\",TRUE)", "D1:E2"),
                       [.string("a"), .string("b"), .string("c"), .error("#N/A")],
                       "hàng 2 ngắn hơn → đệm #N/A mặc định")
    }

    func testTextSplitMultipleDelimiters() {
        XCTAssertEqual(cse(engine(), "=TEXTSPLIT(\"a,b;c\",{\",\",\";\"})", "D1:F1"),
                       [.string("a"), .string("b"), .string("c")],
                       "phân_cách là hằng mảng nhiều phân cách")
    }

    func testTextSplitMatchMode() {
        let e = engine()
        XCTAssertEqual(cse(e, "=TEXTSPLIT(\"aXbYc\",\"x\",,FALSE,1)", "D1:E1"),
                       [.string("a"), .string("bYc")],
                       "chế_độ_khớp=1: x khớp X")
        XCTAssertEqual(calc(e, "=TEXTSPLIT(\"aXbYc\",\"x\")"), .string("aXbYc"),
                       "phân biệt hoa/thường: không tách, mảng 1x1")
    }

    func testTextSplitPadWith() {
        XCTAssertEqual(cse(engine(), "=TEXTSPLIT(\"a,b;c,d,e\",\",\",\";\")", "D1:F2"),
                       [.string("a"), .string("b"), .error("#N/A"),
                        .string("c"), .string("d"), .string("e")],
                       "mặc định đệm #N/A")
        XCTAssertEqual(cse(engine(), "=TEXTSPLIT(\"a,b;c,d,e\",\",\",\";\",FALSE,0,\"-\")", "D1:F2"),
                       [.string("a"), .string("b"), .string("-"),
                        .string("c"), .string("d"), .string("e")])
    }

    func testTextSplitSingleCell() {
        let e = engine()
        XCTAssertEqual(calc(e, "=TEXTSPLIT(\"abc\",\",\")"), .string("abc"), "mảng 1x1")
        XCTAssertEqual(calc(e, "=TEXTSPLIT(\"a,b\",\",\")"), .error("#VALUE!"),
                       "mảng nhiều ô trong ô đơn → #VALUE! như SEQUENCE")
    }

    func testTextSplitBadArgs() {
        let e = engine()
        XCTAssertEqual(calc(e, "=TEXTSPLIT(\"\",\",\")"), .error("#VALUE!"), "văn_bản rỗng")
        XCTAssertEqual(calc(e, "=TEXTSPLIT(\"abc\")"), .error("#VALUE!"), "không có phân cách nào")
        XCTAssertEqual(calc(e, "=TEXTSPLIT(\"abc\",,)"), .error("#VALUE!"), "cả hai phân cách đều bỏ trống")
        XCTAssertEqual(calc(e, "=TEXTSPLIT(\"a,b\",\"\")"), .error("#VALUE!"), "phân_cách rỗng")
        XCTAssertEqual(calc(e, "=TEXTSPLIT(\"a,b\",\",\",,FALSE,2)"), .error("#VALUE!"), "chế_độ_khớp khác 0/1")
        XCTAssertEqual(calc(e, "=TEXTSPLIT(\"a,b\",\",\",,\"x\")"), .error("#VALUE!"), "bỏ_rỗng không phải logic")
    }

    func testTextSplitNumberArgs() {
        XCTAssertEqual(cse(engine(), "=TEXTSPLIT(123,\"2\")", "D1:E1"),
                       [.string("1"), .string("3")], "văn_bản là số")
        XCTAssertEqual(cse(engine(), "=TEXTSPLIT(\"a1b2c\",1)", "D1:E1"),
                       [.string("a"), .string("b2c")], "phân_cách là số")
    }

    func testTextSplitErrorArgPropagates() {
        let e = engine()
        XCTAssertEqual(calc(e, "=TEXTSPLIT(1/0,\",\")"), .error("#DIV/0!"))
        XCTAssertEqual(calc(e, "=TEXTSPLIT(\"a,b\",1/0)"), .error("#DIV/0!"))
        XCTAssertEqual(calc(e, "=TEXTSPLIT(\"a,b;c,d,e\",\",\",\";\",FALSE,0,1/0)"), .error("#DIV/0!"),
                       "lỗi ở đệm lan truyền")
    }

    func testTextSplitIgnoreEmptyAllEmptyIsValueError() {
        XCTAssertEqual(calc(engine(), "=TEXTSPLIT(\",,,\",\",\",,TRUE)"), .error("#VALUE!"),
                       "bỏ rỗng hết → không còn kết quả")
    }

    func testTextSplitInSum() {
        XCTAssertEqual(calc(engine(), "=SUM(TEXTSPLIT(\"1,2,3\",\",\"))"), .number(6))
    }

    // MARK: LAMBDA (lát 28)

    /// Hành vi kỳ vọng theo Excel 365: LAMBDA tạo giá trị hàm, gọi trực tiếp bằng
    /// `(…)` sau biểu thức; hàm trần trong ô → #VALUE!; tham số không phân biệt hoa/thường.
    func testLambdaDirectCall() {
        let e = engine()
        XCTAssertEqual(calc(e, "=LAMBDA(x, x+1)(5)"), .number(6))
        XCTAssertEqual(calc(e, "=LAMBDA(x, y, x+y)(3,4)"), .number(7))
        XCTAssertEqual(calc(e, "=LAMBDA(5)()"), .number(5), "không tham số: thân là hằng")
        XCTAssertEqual(calc(e, "=LAMBDA(X, X+1)(5)"), .number(6), "tên tham số không phân biệt hoa/thường")
        XCTAssertEqual(calc(e, "=LAMBDA(x, x*2)(A1)"), .number(2), "đối số từ ô")
        XCTAssertEqual(calc(e, "=LAMBDA(x, x+1)(A1+B1)"), .number(4), "đối số là biểu thức")
        XCTAssertEqual(calc(e, "=SUM(LAMBDA(x, x+1)(5))"), .number(6), "kết quả scalar dùng trong SUM")
        XCTAssertEqual(calc(e, "=LAMBDA(x, LAMBDA(y, x+y))(10)(5)"), .number(15),
                       "lambda lồng: lambda trong trả về lambda ngoài")
        XCTAssertEqual(calc(e, "=LET(x, 100, LAMBDA(x, x+1)(5))"), .number(6),
                       "tham số che biến LET cùng tên")
    }

    func testLambdaBareIsValueError() {
        let e = engine()
        XCTAssertEqual(calc(e, "=LAMBDA(x, x+1)"), .error("#VALUE!"), "hàm trần trong ô")
        XCTAssertEqual(calc(e, "=LAMBDA(1)"), .error("#VALUE!"), "không tham số, thân là hằng, vẫn là hàm trần")
        XCTAssertEqual(calc(e, "=SUM(LAMBDA(x, x+1))"), .error("#VALUE!"), "hàm trần làm đối số")
    }

    func testLambdaViaLet() {
        let e = engine()
        XCTAssertEqual(calc(e, "=LET(f, LAMBDA(x, x*2), f(21))"), .number(42))
        XCTAssertEqual(calc(e, "=LET(f, LAMBDA(x, x+1), f(1)+f(2))"), .number(5), "gọi nhiều lần")
        XCTAssertEqual(calc(e, "=LET(a, 10, LAMBDA(x, x+a)(5))"), .number(15),
                       "lambda chụp biến LET đã gán trước nó")
        XCTAssertEqual(calc(e, "=LET(a, 1, LET(f, LAMBDA(x, x+a), LET(a, 2, f(5))))"), .number(6),
                       "phạm vi từ vựng: thân thấy a lúc định nghĩa, không phải lúc gọi")
        XCTAssertEqual(calc(e, "=LET(f, LAMBDA(x, x+1), LET(g, LAMBDA(y, f(y)*2), g(5)))"), .number(12),
                       "lambda gọi lambda khác qua LET")
        XCTAssertEqual(calc(e, "=LET(f, LAMBDA(x, x+1), LET(y, 7, f(y)))"), .number(8),
                       "đối số tính ở nơi gọi: y gán sau khi f định nghĩa vẫn thấy khi gọi")
    }

    func testLambdaArgErrors() {
        let e = engine()
        XCTAssertEqual(calc(e, "=LAMBDA(x, x+1)(1,2)"), .error("#VALUE!"), "thừa đối số")
        XCTAssertEqual(calc(e, "=LAMBDA(x, x+1)()"), .error("#VALUE!"), "thiếu đối số")
        XCTAssertEqual(calc(e, "=LAMBDA(x, y, x+y)(1)"), .error("#VALUE!"), "thiếu một trong hai đối số")
        XCTAssertEqual(calc(e, "=LAMBDA()"), .error("#VALUE!"), "không có cả thân")
        XCTAssertEqual(calc(e, "=LAMBDA(1, 2)"), .error("#VALUE!"), "tham số không phải tên")
        XCTAssertEqual(calc(e, "=LAMBDA(A1, A1+1)(5)"), .error("#VALUE!"), "tham số trông như ô")
        XCTAssertEqual(calc(e, "=LAMBDA(x, x, x+1)(1)"), .error("#VALUE!"), "tham số trùng tên")
        XCTAssertEqual(calc(e, "=LAMBDA(X, x, 1)(1,2)"), .error("#VALUE!"), "trùng tên không phân biệt hoa/thường")
        XCTAssertEqual(calc(e, "=LAMBDA(x, 1/0)(5)"), .error("#DIV/0!"), "lỗi trong thân lan ra")
        XCTAssertEqual(calc(e, "=LAMBDA(x, x+1)(1/0)"), .error("#DIV/0!"), "lỗi trong đối số lan ra")
        XCTAssertEqual(calc(e, "=LAMBDA(x, x+1)(1,)"), .error("#VALUE!"), "đối số bỏ trống vẫn tính là đối số")
    }

    func testLambdaCallNonFunction() {
        let e = engine()
        XCTAssertEqual(calc(e, "=(5)(3)"), .error("#VALUE!"), "gọi một số")
        XCTAssertEqual(calc(e, "=SUM(1)(2)"), .error("#VALUE!"), "gọi kết quả hàm scalar")
        XCTAssertEqual(calc(e, "=LET(x, 5, x(1))"), .error("#VALUE!"), "gọi biến không phải hàm")
        XCTAssertEqual(calc(e, "=LET(x, A1:B2, x(1))"), .error("#VALUE!"), "gọi biến vùng")
    }

    func testLambdaReturnsArray() {
        let e = engine()
        XCTAssertEqual(cse(e, "=LAMBDA(x, SEQUENCE(x))(3)", "D1:D3"),
                       [.number(1), .number(2), .number(3)], "lambda trả mảng, trải qua CSE")
        XCTAssertEqual(calc(e, "=SUM(LAMBDA(a, a)(A1:A3))"), .number(4),
                       "lambda trả nguyên vùng, SUM trải phẳng: A1+A2=1+3")
        XCTAssertEqual(calc(e, "=SUM(LAMBDA(x, x+1)(A1:A2))"), .number(6),
                       "đối số vùng: (1+1)+(3+1)=6")
    }

    func testLambdaRecursiveDefinedName() throws {
        let e = engine()
        e.defineNameExpression("FACT", expr: try FormulaParser.parse("LAMBDA(n, IF(n<=1, 1, n*FACT(n-1)))"))
        XCTAssertEqual(calc(e, "=FACT(5)"), .number(120), "đệ quy qua tên định nghĩa")
        XCTAssertEqual(calc(e, "=FACT(0)"), .number(1), "điều kiện dừng")
        e.defineNameExpression("DOWN", expr: try FormulaParser.parse("LAMBDA(n, IF(n<=0, 0, n+DOWN(n-1)))"))
        XCTAssertEqual(calc(e, "=DOWN(100)"), .number(5050), "đệ quy sâu 100 vẫn chạy")
        e.defineNameExpression("LOOP", expr: try FormulaParser.parse("LAMBDA(x, LOOP(x+1))"))
        XCTAssertEqual(calc(e, "=LOOP(1)"), .error("#VALUE!"),
                       "đệ quy vô hạn dừng ở giới hạn của engine (512), không tràn ngăn xếp")
    }

    func testLambdaDefinedNameNotFunction() throws {
        let e = engine()
        e.defineNameExpression("K", expr: try FormulaParser.parse("5+1"))
        XCTAssertEqual(calc(e, "=K(2)"), .error("#VALUE!"), "tên hằng mà bị gọi như hàm")
        XCTAssertEqual(calc(e, "=K"), .number(6), "dùng như tên thường vẫn đúng")
    }

    // MARK: MAP / BYROW / BYCOL / SCAN / REDUCE / MAKEARRAY (lát 29)

    /// Hành vi kỳ vọng theo Excel 365: MAP áp lambda cho từng phần tử (đa mảng
    /// cùng kích thước); BYROW/BYCOL gom từng hàng/cột thành một giá trị;
    /// SCAN/REDUCE cộng dồn theo hàng; MAKEARRAY sinh lưới từ chỉ số 1-based.
    func testMapSingleArrayBasic() {
        let e = engine()
        XCTAssertEqual(cse(e, "=MAP(A1:B2, LAMBDA(x, x*2))", "D1:E2"),
                       [.number(2), .number(4), .number(6), .number(8)])
        XCTAssertEqual(cse(e, "=MAP({1,2;3,4}, LAMBDA(x, x+10))", "D1:E2"),
                       [.number(11), .number(12), .number(13), .number(14)],
                       "hằng mảng 2x2")
        XCTAssertEqual(calc(e, "=SUM(MAP(A1:B2, LAMBDA(x, x+1)))"), .number(14),
                       "(1+1)+(2+1)+(3+1)+(4+1)")
    }

    func testMapSingleCellIsValueError() {
        XCTAssertEqual(calc(engine(), "=MAP(A1:B2, LAMBDA(x, x))"), .error("#VALUE!"),
                       "mảng nhiều ô ở ô thường không có vị trí CSE")
    }

    func testMapMultiArray() {
        let e = engine()
        XCTAssertEqual(cse(e, "=MAP({1,2},{10,20}, LAMBDA(a,b,a+b))", "D1:E1"),
                       [.number(11), .number(22)])
        XCTAssertEqual(cse(e, "=MAP(A1:B2, {10,20;30,40}, LAMBDA(a,b,a+b))", "D1:E2"),
                       [.number(11), .number(22), .number(33), .number(44)],
                       "1+10, 2+20, 3+30, 4+40")
        XCTAssertEqual(cse(e, "=MAP(A1:B2, A1:B2, A1:B2, LAMBDA(a,b,c,a+b+c))", "D1:E2"),
                       [.number(3), .number(6), .number(9), .number(12)],
                       "ba mảng 2x2: a+b+c theo từng ô")
    }

    func testMapShapeMismatchIsValueError() {
        let e = engine()
        XCTAssertEqual(calc(e, "=MAP(A1:B2, A1:A2, LAMBDA(a,b,a+b))"), .error("#VALUE!"),
                       "2x2 với 2x1 lệch kích thước")
        XCTAssertEqual(calc(e, "=MAP({1,2;3,4},{1,2,3}, LAMBDA(a,b,a+b))"), .error("#VALUE!"),
                       "2x2 với 1x3 lệch kích thước")
        XCTAssertEqual(calc(e, "=MAP(A1:B2, A1, LAMBDA(a,b,a+b))"), .error("#VALUE!"),
                       "mảng 2x2 với ô đơn: ô đơn không được phát như trong phép toán theo phần tử")
    }

    func testMapWrongArgCount() {
        let e = engine()
        XCTAssertEqual(calc(e, "=MAP(A1)"), .error("#VALUE!"), "thiếu lambda")
        XCTAssertEqual(calc(e, "=MAP()"), .error("#VALUE!"), "không có đối số")
    }

    func testMapNotLambdaIsValueError() {
        let e = engine()
        XCTAssertEqual(calc(e, "=MAP(A1:B2, 5)"), .error("#VALUE!"), "đối số lambda là số")
        XCTAssertEqual(calc(e, "=MAP(A1:B2, A1)"), .error("#VALUE!"), "đối số lambda là giá trị ô")
        XCTAssertEqual(calc(e, "=MAP(A1:B2, \"x\")"), .error("#VALUE!"), "đối số lambda là chuỗi")
        XCTAssertEqual(calc(e, "=MAP(A1:B2, 1/0)"), .error("#DIV/0!"), "đối số lambda là lỗi → lan nguyên vẹn")
    }

    func testMapLambdaParamMismatchIsValueError() {
        let e = engine()
        XCTAssertEqual(calc(e, "=MAP(A1:B2, LAMBDA(x,y,x+y))"), .error("#VALUE!"),
                       "lambda 2 tham số cho 1 mảng")
        XCTAssertEqual(calc(e, "=MAP(A1:B2, A1:B2, LAMBDA(x, x))"), .error("#VALUE!"),
                       "lambda 1 tham số cho 2 mảng")
        XCTAssertEqual(calc(e, "=MAP(A1:B2, LAMBDA(x, x))"), .error("#VALUE!"),
                       "sai số tham số không được bù")
    }

    func testMapErrorElementPropagates() {
        let e = engine()
        e.setFormula("=1/0", sheet: "Data", at: "A1")
        XCTAssertEqual(calc(e, "=MAP(A1:B2, LAMBDA(x, x+1))"), .error("#DIV/0!"),
                       "phần tử mảng là lỗi thì lỗi lan ra nguyên vẹn")
    }

    func testMapLambdaReturnsErrorKeptInCell() {
        let e = engine()
        XCTAssertEqual(cse(e, "=MAP({1,-1}, LAMBDA(x, IF(x>0, x, NA())))", "D1:E1"),
                       [.number(1), .error("#N/A")],
                       "lỗi do thân lambda trả về ở lại đúng ô đó trong lưới")
    }

    func testMapViaLetAndNestedCall() {
        let e = engine()
        XCTAssertEqual(cse(e, "=LET(f, LAMBDA(x, x*3), MAP(A1:B2, f))", "D1:E2"),
                       [.number(3), .number(6), .number(9), .number(12)],
                       "lambda qua LET")
        XCTAssertEqual(cse(e, "=MAP(A1:B2, LAMBDA(x, ABS(x-3)))", "D1:E2"),
                       [.number(2), .number(1), .number(0), .number(1)],
                       "lambda gọi hàm khác bên trong")
        XCTAssertEqual(cse(e, "=MAP(A1:B2, LAMBDA(x, SUM(x, 10)))", "D1:E2"),
                       [.number(11), .number(12), .number(13), .number(14)],
                       "lambda gọi SUM với đối số phần tử")
    }

    func testMapLambdaViaDefinedName() throws {
        let e = engine()
        e.defineNameExpression("DOUBLE", expr: try FormulaParser.parse("LAMBDA(x, x*2)"))
        XCTAssertEqual(cse(e, "=MAP(A1:B2, DOUBLE)", "D1:E2"),
                       [.number(2), .number(4), .number(6), .number(8)],
                       "lambda qua tên định nghĩa làm đối số MAP")
    }

    // MARK: BYROW

    func testByRowBasic() {
        let e = engine()
        XCTAssertEqual(cse(e, "=BYROW(A1:B2, LAMBDA(r, SUM(r)))", "D1:D2"),
                       [.number(3), .number(7)], "hàng 1: 1+2; hàng 2: 3+4")
        XCTAssertEqual(cse(e, "=BYROW(A1:B2, LAMBDA(r, MAX(r)))", "D1:D2"),
                       [.number(2), .number(4)], "giá trị lớn nhất mỗi hàng")
        XCTAssertEqual(calc(e, "=BYROW({1,2,3}, LAMBDA(r, SUM(r)))"), .number(6),
                       "một hàng duy nhất → kết quả 1x1")
    }

    func testByRowWrongArgs() {
        let e = engine()
        XCTAssertEqual(calc(e, "=BYROW(A1:B2)"), .error("#VALUE!"), "thiếu lambda")
        XCTAssertEqual(calc(e, "=BYROW(A1:B2, LAMBDA(x,y,x))"), .error("#VALUE!"),
                       "lambda 2 tham số, BYROW chỉ cho 1")
        XCTAssertEqual(calc(e, "=BYROW(A1:B2, 5)"), .error("#VALUE!"), "không phải lambda")
        XCTAssertEqual(calc(e, "=BYROW(A1:B2, LAMBDA(r, SUM(r)), 1)"), .error("#VALUE!"),
                       "thừa đối số")
    }

    func testByRowLambdaReturnsArrayIsValueError() {
        XCTAssertEqual(calc(engine(), "=BYROW(A1:B2, LAMBDA(r, r))"), .error("#VALUE!"),
                       "lambda trả nguyên hàng (mảng 1x2) thì mỗi hàng phải là một giá trị đơn")
    }

    func testByRowViaLet() {
        let e = engine()
        XCTAssertEqual(cse(e, "=LET(f, LAMBDA(r, MAX(r)), BYROW(A1:B2, f))", "D1:D2"),
                       [.number(2), .number(4)], "lambda qua LET")
    }

    func testByRowErrorCellInRow() {
        let e = engine()
        e.setFormula("=1/0", sheet: "Data", at: "B1")
        XCTAssertEqual(cse(e, "=BYROW(A1:B2, LAMBDA(r, SUM(r)))", "D1:D2"),
                       [.error("#DIV/0!"), .number(7)],
                       "ô lỗi trong hàng lan vào kết quả của đúng hàng đó")
    }

    // MARK: BYCOL

    func testByColBasic() {
        let e = engine()
        XCTAssertEqual(cse(e, "=BYCOL(A1:B2, LAMBDA(c, SUM(c)))", "D1:E1"),
                       [.number(4), .number(6)], "cột 1: 1+3; cột 2: 2+4")
        XCTAssertEqual(cse(e, "=BYCOL(A1:B2, LAMBDA(c, MIN(c)))", "D1:E1"),
                       [.number(1), .number(2)], "giá trị nhỏ nhất mỗi cột")
        XCTAssertEqual(calc(e, "=BYCOL({1;2;3}, LAMBDA(c, SUM(c)))"), .number(6),
                       "một cột duy nhất → kết quả 1x1")
    }

    func testByColWrongArgs() {
        let e = engine()
        XCTAssertEqual(calc(e, "=BYCOL(A1:B2)"), .error("#VALUE!"), "thiếu lambda")
        XCTAssertEqual(calc(e, "=BYCOL(A1:B2, LAMBDA(x,y,x))"), .error("#VALUE!"),
                       "lambda 2 tham số, BYCOL chỉ cho 1")
        XCTAssertEqual(calc(e, "=BYCOL(A1:B2, \"x\")"), .error("#VALUE!"), "không phải lambda")
    }

    func testByColLambdaReturnsArrayIsValueError() {
        XCTAssertEqual(calc(engine(), "=BYCOL(A1:B2, LAMBDA(c, c))"), .error("#VALUE!"),
                       "lambda trả nguyên cột (mảng 2x1) thì mỗi cột phải là một giá trị đơn")
    }

    // MARK: SCAN

    func testScanBasic() {
        let e = engine()
        XCTAssertEqual(cse(e, "=SCAN(0, {1,2,3,4}, LAMBDA(a,v,a+v))", "D1:G1"),
                       [.number(1), .number(3), .number(6), .number(10)],
                       "cộng dồn 1, 1+2, +3, +4")
        XCTAssertEqual(cse(e, "=SCAN(0, A1:B2, LAMBDA(a,v,a+v))", "D1:E2"),
                       [.number(1), .number(3), .number(6), .number(10)],
                       "duyệt theo hàng trên mảng 2x2")
        XCTAssertEqual(cse(e, "=SCAN(10, {1,2}, LAMBDA(a,v,a+v))", "D1:E1"),
                       [.number(11), .number(13)], "giá trị đầu 10")
    }

    func testScanConcat() {
        let e = engine()
        XCTAssertEqual(cse(e, "=SCAN(\"\", {\"a\",\"b\"}, LAMBDA(a,v,a&v))", "D1:E1"),
                       [.string("a"), .string("ab")], "acc là chuỗi, nối dồn")
    }

    func testScanWrongArgs() {
        let e = engine()
        XCTAssertEqual(calc(e, "=SCAN(0, A1:B2)"), .error("#VALUE!"), "thiếu lambda")
        XCTAssertEqual(calc(e, "=SCAN(0, A1:B2, LAMBDA(x, x))"), .error("#VALUE!"),
                       "lambda 1 tham số, SCAN cần 2")
        XCTAssertEqual(calc(e, "=SCAN(0, A1:B2, 5)"), .error("#VALUE!"), "không phải lambda")
        XCTAssertEqual(calc(e, "=SCAN(0, A1:B2, LAMBDA(a,v,a+v), 1)"), .error("#VALUE!"),
                       "thừa đối số")
        XCTAssertEqual(calc(e, "=SCAN(1/0, A1:B2, LAMBDA(a,v,a+v))"), .error("#DIV/0!"),
                       "giá trị đầu là lỗi → lan nguyên vẹn")
    }

    func testScanErrorPropagates() {
        let e = engine()
        e.setFormula("=1/0", sheet: "Data", at: "A1")
        XCTAssertEqual(calc(e, "=SCAN(0, A1:B2, LAMBDA(a,v,a+v))"), .error("#DIV/0!"),
                       "phần tử mảng là lỗi thì lỗi lan ra")
        XCTAssertEqual(calc(engine(), "=SCAN(0, A1:B2, LAMBDA(a,v,1/0))"), .error("#DIV/0!"),
                       "thân lambda lỗi ở bước đầu thì lan ra")
    }

    // MARK: REDUCE

    func testReduceBasic() {
        let e = engine()
        XCTAssertEqual(calc(e, "=REDUCE(0, A1:B2, LAMBDA(a,v,a+v))"), .number(10), "1+2+3+4")
        XCTAssertEqual(calc(e, "=REDUCE(1, {1,2,3,4}, LAMBDA(a,v,a*v))"), .number(24),
                       "tích dồn 1*1*2*3*4")
        XCTAssertEqual(calc(e, "=REDUCE(10, {1,2}, LAMBDA(a,v,a-v))"), .number(7),
                       "10-1-2")
    }

    func testReduceWrongArgs() {
        let e = engine()
        XCTAssertEqual(calc(e, "=REDUCE(0, A1:B2)"), .error("#VALUE!"), "thiếu lambda")
        XCTAssertEqual(calc(e, "=REDUCE(0, A1:B2, LAMBDA(x, x))"), .error("#VALUE!"),
                       "lambda 1 tham số, REDUCE cần 2")
        XCTAssertEqual(calc(e, "=REDUCE(0, A1:B2, \"x\")"), .error("#VALUE!"), "không phải lambda")
        XCTAssertEqual(calc(e, "=REDUCE(1/0, A1:B2, LAMBDA(a,v,a+v))"), .error("#DIV/0!"),
                       "giá trị đầu là lỗi → lan nguyên vẹn")
    }

    func testReduceReturnsArray() {
        let e = engine()
        XCTAssertEqual(cse(e, "=REDUCE({10,20}, {1}, LAMBDA(a,v,a))", "D1:E1"),
                       [.number(10), .number(20)],
                       "acc cuối là mảng thì trả nguyên mảng để tràn")
    }

    func testReduceErrorElementPropagates() {
        let e = engine()
        e.setFormula("=1/0", sheet: "Data", at: "A1")
        XCTAssertEqual(calc(e, "=REDUCE(0, A1:B2, LAMBDA(a,v,a+v))"), .error("#DIV/0!"),
                       "phần tử mảng là lỗi thì lỗi lan ra")
    }

    // MARK: MAKEARRAY

    func testMakeArrayBasic() {
        let e = engine()
        XCTAssertEqual(cse(e, "=MAKEARRAY(2,3,LAMBDA(r,c,r*10+c))", "D1:F2"),
                       [.number(11), .number(12), .number(13),
                        .number(21), .number(22), .number(23)],
                       "chỉ số 1-based: hàng 1 → 11,12,13; hàng 2 → 21,22,23")
        XCTAssertEqual(calc(e, "=MAKEARRAY(1,1,LAMBDA(r,c,42))"), .number(42),
                       "mảng 1x1 → giá trị đơn")
        XCTAssertEqual(calc(e, "=SUM(MAKEARRAY(2,2,LAMBDA(r,c,1)))"), .number(4),
                       "mảng toàn 1, tổng 4")
        XCTAssertEqual(cse(e, "=MAKEARRAY(3,1,LAMBDA(r,c,r*r))", "D1:D3"),
                       [.number(1), .number(4), .number(9)], "một cột: bình phương chỉ số hàng")
    }

    func testMakeArrayBadDimsIsValueError() {
        let e = engine()
        XCTAssertEqual(calc(e, "=MAKEARRAY(0,2,LAMBDA(r,c,1))"), .error("#VALUE!"), "0 hàng")
        XCTAssertEqual(calc(e, "=MAKEARRAY(2,0,LAMBDA(r,c,1))"), .error("#VALUE!"), "0 cột")
        XCTAssertEqual(calc(e, "=MAKEARRAY(-1,2,LAMBDA(r,c,1))"), .error("#VALUE!"), "âm")
        XCTAssertEqual(calc(e, "=MAKEARRAY(2,-3,LAMBDA(r,c,1))"), .error("#VALUE!"), "cột âm")
        XCTAssertEqual(calc(e, "=MAKEARRAY(2.5,2,LAMBDA(r,c,1))"), .error("#VALUE!"),
                       "không nguyên: lát 29 chốt nghiêm ngặt, không cắt phần lẻ")
        XCTAssertEqual(calc(e, "=MAKEARRAY(2,2.9,LAMBDA(r,c,1))"), .error("#VALUE!"), "cột không nguyên")
        XCTAssertEqual(calc(e, "=MAKEARRAY(\"x\",2,LAMBDA(r,c,1))"), .error("#VALUE!"), "không phải số")
    }

    func testMakeArrayWrongArgs() {
        let e = engine()
        XCTAssertEqual(calc(e, "=MAKEARRAY(2,2)"), .error("#VALUE!"), "thiếu lambda")
        XCTAssertEqual(calc(e, "=MAKEARRAY()"), .error("#VALUE!"), "không có đối số")
        XCTAssertEqual(calc(e, "=MAKEARRAY(2,2,5)"), .error("#VALUE!"), "không phải lambda")
        XCTAssertEqual(calc(e, "=MAKEARRAY(2,2,LAMBDA(x,x))"), .error("#VALUE!"),
                       "lambda 1 tham số, MAKEARRAY cần 2")
        XCTAssertEqual(calc(e, "=MAKEARRAY(2,2,LAMBDA(r,c,r),1)"), .error("#VALUE!"), "thừa đối số")
    }

    func testMakeArrayErrorArgPropagates() {
        XCTAssertEqual(calc(engine(), "=MAKEARRAY(1/0,2,LAMBDA(r,c,1))"), .error("#DIV/0!"),
                       "hàng là lỗi → lan nguyên vẹn")
        XCTAssertEqual(calc(engine(), "=MAKEARRAY(2,1/0,LAMBDA(r,c,1))"), .error("#DIV/0!"),
                       "cột là lỗi → lan nguyên vẹn")
        XCTAssertEqual(calc(engine(), "=MAKEARRAY(2,2,1/0)"), .error("#DIV/0!"),
                       "lambda là lỗi → lan nguyên vẹn")
    }

    func testMakeArrayOversizeIsCalcError() {
        XCTAssertEqual(calc(engine(), "=MAKEARRAY(2000,2000,LAMBDA(r,c,1))"), .error("#CALC!"),
                       "4.000.000 ô vượt giới hạn 1.000.000 phần tử")
    }

    // MARK: MMULT / MUNIT (lát 34)

    func testMmultSquareViaCSE() {
        let e = engine()
        e.setValue(.number(5), sheet: "Data", at: "C1")
        e.setValue(.number(6), sheet: "Data", at: "D1")
        e.setValue(.number(7), sheet: "Data", at: "C2")
        e.setValue(.number(8), sheet: "Data", at: "D2")
        XCTAssertEqual(cse(e, "=MMULT(A1:B2,C1:D2)", "F1:G2"),
                       [.number(19), .number(22), .number(43), .number(50)],
                       "1*5+2*7=19, 1*6+2*8=22, 3*5+4*7=43, 3*6+4*8=50")
    }

    func testMmultRectangularViaCSE() {
        XCTAssertEqual(cse(engine(), "=MMULT({1,2,3;4,5,6},{7,8;9,10;11,12})", "D1:E2"),
                       [.number(58), .number(64), .number(139), .number(154)],
                       "2x3 · 3x2 = 2x2")
    }

    func testMmultVectorAndScalar() {
        XCTAssertEqual(calc(engine(), "=MMULT({1,2,3},{4;5;6})"), .number(32),
                       "1*4+2*5+3*6=32, tích vô hướng ra 1x1")
        XCTAssertEqual(calc(engine(), "=MMULT(2,3)"), .number(6), "vô hướng coi như 1x1")
    }

    func testMmultInSum() {
        let e = engine()
        e.setValue(.number(5), sheet: "Data", at: "C1")
        e.setValue(.number(6), sheet: "Data", at: "D1")
        e.setValue(.number(7), sheet: "Data", at: "C2")
        e.setValue(.number(8), sheet: "Data", at: "D2")
        XCTAssertEqual(calc(e, "=SUM(MMULT(A1:B2,C1:D2))"), .number(134), "19+22+43+50")
    }

    func testMmultDimensionMismatchAndArgCount() {
        XCTAssertEqual(calc(engine(), "=MMULT(A1:B2,A1:C1)"), .error("#VALUE!"),
                       "2 cột ≠ 1 hàng")
        XCTAssertEqual(calc(engine(), "=MMULT(A1:B2)"), .error("#VALUE!"), "thiếu đối số")
        XCTAssertEqual(calc(engine(), "=MMULT(A1:B2,C1:D2,A1)"), .error("#VALUE!"), "thừa đối số")
        XCTAssertEqual(calc(engine(), "=MMULT({1e308,1e308},{1e308;1e308})"), .error("#NUM!"),
                       "tràn số → #NUM!")
    }

    func testMmultTextAndEmptyAreValueError() {
        let e = engine()
        e.setValue(.string("x"), sheet: "Data", at: "C1")
        e.setValue(.number(6), sheet: "Data", at: "D1")
        e.setValue(.number(7), sheet: "Data", at: "C2")
        e.setValue(.number(8), sheet: "Data", at: "D2")
        XCTAssertEqual(calc(e, "=MMULT(A1:B2,C1:D2)"), .error("#VALUE!"), "ô chữ → #VALUE!")
        XCTAssertEqual(calc(engine(), "=MMULT(A1:B2,A1:C2)"), .error("#VALUE!"),
                       "C1:C2 rỗng → #VALUE! (2x2 · 2x3, khớp chiều nhưng có ô rỗng)")
        let e3 = engine()
        e3.setValue(.string("3"), sheet: "Data", at: "C1")
        e3.setValue(.number(6), sheet: "Data", at: "D1")
        e3.setValue(.number(7), sheet: "Data", at: "C2")
        e3.setValue(.number(8), sheet: "Data", at: "D2")
        XCTAssertEqual(calc(e3, "=MMULT(A1:B2,C1:D2)"), .error("#VALUE!"),
                       "chuỗi số vẫn là chuỗi → #VALUE!")
    }

    func testMmultBoolCoercedAndErrorPropagates() {
        let e = engine()
        e.setValue(.bool(true), sheet: "Data", at: "C1")
        e.setValue(.number(2), sheet: "Data", at: "D1")
        e.setValue(.number(3), sheet: "Data", at: "C2")
        e.setValue(.number(4), sheet: "Data", at: "C3")
        XCTAssertEqual(calc(e, "=MMULT(C1:D1,C2:C3)"), .number(11),
                       "TRUE→1: 1*3+2*4=11")
        let e2 = engine()
        e2.setFormula("=1/0", sheet: "Data", at: "C1")
        e2.setValue(.number(6), sheet: "Data", at: "D1")
        e2.setValue(.number(7), sheet: "Data", at: "C2")
        e2.setValue(.number(8), sheet: "Data", at: "D2")
        XCTAssertEqual(calc(e2, "=MMULT(A1:B2,C1:D2)"), .error("#DIV/0!"),
                       "ô lỗi trong mảng → lan nguyên vẹn")
    }

    func testMunitBasic() {
        XCTAssertEqual(cse(engine(), "=MUNIT(2)", "D1:E2"),
                       [.number(1), .number(0), .number(0), .number(1)])
        XCTAssertEqual(cse(engine(), "=MUNIT(3)", "D1:F3"),
                       [.number(1), .number(0), .number(0),
                        .number(0), .number(1), .number(0),
                        .number(0), .number(0), .number(1)])
        XCTAssertEqual(calc(engine(), "=MUNIT(1)"), .number(1), "cấp 1 ra 1x1")
    }

    func testMunitTruncatesAndRejects() {
        XCTAssertEqual(cse(engine(), "=MUNIT(2.7)", "D1:E2"),
                       [.number(1), .number(0), .number(0), .number(1)],
                       "2.7 cắt về 2 như SEQUENCE")
        XCTAssertEqual(calc(engine(), "=MUNIT(0)"), .error("#VALUE!"))
        XCTAssertEqual(calc(engine(), "=MUNIT(-2)"), .error("#VALUE!"))
        XCTAssertEqual(calc(engine(), "=MUNIT(\"x\")"), .error("#VALUE!"))
        XCTAssertEqual(calc(engine(), "=MUNIT()"), .error("#VALUE!"))
        XCTAssertEqual(calc(engine(), "=MUNIT(2,2)"), .error("#VALUE!"))
        XCTAssertEqual(calc(engine(), "=MUNIT(1/0)"), .error("#DIV/0!"), "lỗi lan nguyên vẹn")
    }

    func testMunitOversizeIsCalcError() {
        XCTAssertEqual(calc(engine(), "=MUNIT(2000)"), .error("#CALC!"),
                       "2000² = 4.000.000 ô vượt giới hạn 1.000.000 phần tử")
    }

    func testMmultIdentityProperty() {
        XCTAssertEqual(cse(engine(), "=MMULT(MUNIT(2),A1:B2)", "D1:E2"),
                       [.number(1), .number(2), .number(3), .number(4)],
                       "đơn vị nhân vào giữ nguyên ma trận")
        XCTAssertEqual(calc(engine(), "=SUM(MMULT(A1:B2,MUNIT(2)))"), .number(10),
                       "nhân phải cũng giữ nguyên: 1+2+3+4")
    }

    // MARK: EXPAND (lát 35)

    func testExpandBasicViaCSE() {
        XCTAssertEqual(cse(engine(), "=EXPAND(A1:B2,3,3)", "D1:F3"),
                       [.number(1), .number(2), .error("#N/A"),
                        .number(3), .number(4), .error("#N/A"),
                        .error("#N/A"), .error("#N/A"), .error("#N/A")],
                       "2x2 mở thành 3x3, ô mới đệm #N/A mặc định")
    }

    func testExpandWithPadValue() {
        XCTAssertEqual(cse(engine(), "=EXPAND(A1:B2,3,3,0)", "D1:F3"),
                       [.number(1), .number(2), .number(0),
                        .number(3), .number(4), .number(0),
                        .number(0), .number(0), .number(0)],
                       "đệm 0 thay cho #N/A")
        XCTAssertEqual(cse(engine(), "=EXPAND(A1:B2,2,3,\"x\")", "D1:F2"),
                       [.number(1), .number(2), .string("x"),
                        .number(3), .number(4), .string("x")],
                       "đệm chuỗi cũng được")
    }

    func testExpandRowsOnlyKeepsColumns() {
        XCTAssertEqual(cse(engine(), "=EXPAND(A1:B2,4)", "D1:E4"),
                       [.number(1), .number(2),
                        .number(3), .number(4),
                        .error("#N/A"), .error("#N/A"),
                        .error("#N/A"), .error("#N/A")],
                       "chỉ cho hàng: giữ nguyên 2 cột")
        XCTAssertEqual(cse(engine(), "=EXPAND(A1:B2,2,2)", "D1:E2"),
                       [.number(1), .number(2), .number(3), .number(4)],
                       "cùng kích thước giữ nguyên mảng")
    }

    func testExpandTruncatesAndRejects() {
        XCTAssertEqual(cse(engine(), "=EXPAND(A1:B2,2.7,2.9)", "D1:E2"),
                       [.number(1), .number(2), .number(3), .number(4)],
                       "2.7/2.9 cắt về 2 như SEQUENCE")
        XCTAssertEqual(calc(engine(), "=EXPAND(A1:B2,1,2)"), .error("#VALUE!"),
                       "hàng nhỏ hơn gốc")
        XCTAssertEqual(calc(engine(), "=EXPAND(A1:B2,2,1)"), .error("#VALUE!"),
                       "cột nhỏ hơn gốc")
        XCTAssertEqual(calc(engine(), "=EXPAND(A1:B2,0,2)"), .error("#VALUE!"),
                       "hàng 0")
        XCTAssertEqual(calc(engine(), "=EXPAND(A1:B2,\"x\",2)"), .error("#VALUE!"),
                       "hàng không phải số")
        XCTAssertEqual(calc(engine(), "=EXPAND(A1:B2)"), .error("#VALUE!"),
                       "thiếu đối số")
        XCTAssertEqual(calc(engine(), "=EXPAND(A1:B2,3,3,0,0)"), .error("#VALUE!"),
                       "thừa đối số")
    }

    func testExpandErrorPropagatesAndSourcePassesThrough() {
        XCTAssertEqual(calc(engine(), "=EXPAND(A1:B2,1/0,2)"), .error("#DIV/0!"),
                       "lỗi trong đối số hàng lan nguyên vẹn")
        XCTAssertEqual(calc(engine(), "=EXPAND(A1:B2,3,3,1/0)"), .error("#DIV/0!"),
                       "lỗi trong đối số đệm lan nguyên vẹn")
        let e = engine()
        e.setFormula("=1/0", sheet: "Data", at: "C1")
        e.setValue(.number(6), sheet: "Data", at: "D1")
        XCTAssertEqual(cse(e, "=EXPAND(C1:D1,2,2)", "F1:G2"),
                       [.error("#DIV/0!"), .number(6),
                        .error("#N/A"), .error("#N/A")],
                       "ô lỗi trong mảng nguồn đi qua nguyên vẹn")
    }

    func testExpandOversizeIsCalcError() {
        XCTAssertEqual(calc(engine(), "=EXPAND(A1,2000,2000)"), .error("#CALC!"),
                       "2000x2000 = 4.000.000 ô vượt giới hạn 1.000.000 phần tử")
    }

    func testExpandCombined() {
        XCTAssertEqual(calc(engine(), "=SUM(EXPAND(A1:B2,3,3,0))"), .number(10),
                       "1+2+3+4, đệm 0 không đổi tổng")
        XCTAssertEqual(cse(engine(), "=EXPAND(SEQUENCE(2,2),3,3,9)", "D1:F3"),
                       [.number(1), .number(2), .number(9),
                        .number(3), .number(4), .number(9),
                        .number(9), .number(9), .number(9)],
                       "SEQUENCE {1,2;3,4} mở thành 3x3 đệm 9")
    }

    // MARK: Toán tử giao ngầm "@" (M7 lát 36, INBOX-MAC #17)
    /// Quy tắc Excel: vùng 1 cột lấy ô cùng hàng, vùng 1 hàng lấy ô cùng cột,
    /// vùng nhiều hàng × nhiều cột lấy chính ô công thức (phải nằm trong vùng),
    /// mảng tràn lấy phần tử góc trên-trái; ngoài vùng → #VALUE!;
    /// giao nhau tại chính ô công thức → tham chiếu vòng → #REF!.

    func testAtSingleColumnRangePicksRow() {
        let e = engine()
        XCTAssertEqual(calc(e, "=@A1:A2", at: "B2"), .number(3), "cột A, hàng 2 → A2 = 3")
        XCTAssertEqual(calc(e, "=@A1:A2", at: "B1"), .number(1), "cột A, hàng 1 → A1 = 1")
        XCTAssertEqual(calc(e, "=@A1:A2", at: "B5"), .error("#VALUE!"), "hàng 5 ngoài vùng")
    }

    func testAtSingleRowRangePicksColumn() {
        let e = engine()
        XCTAssertEqual(calc(e, "=@A1:B1", at: "B2"), .number(2), "hàng 1, cột B → B1 = 2")
        XCTAssertEqual(calc(e, "=@A1:B1", at: "A2"), .number(1), "hàng 1, cột A → A1 = 1")
        XCTAssertEqual(calc(e, "=@A1:B1", at: "C1"), .error("#VALUE!"), "cột C ngoài vùng")
    }

    func testAtRectangularRangeSelfIntersectIsCircular() {
        XCTAssertEqual(calc(engine(), "=@A1:B2", at: "B2"), .error("#REF!"),
                       "giao nhau tại chính ô công thức B2 → tham chiếu vòng")
        XCTAssertEqual(calc(engine(), "=@A1:B2", at: "A1"), .error("#REF!"),
                       "A1 cũng tự tham chiếu")
        XCTAssertEqual(calc(engine(), "=@A1:B2", at: "A3"), .error("#VALUE!"), "hàng 3 ngoài vùng")
        XCTAssertEqual(calc(engine(), "=@A1:B2", at: "C2"), .error("#VALUE!"), "cột C ngoài vùng")
    }

    func testAtSingleCellScalarAndDouble() {
        XCTAssertEqual(calc(engine(), "=@A1"), .number(1), "vùng 1 ô → chính nó")
        XCTAssertEqual(calc(engine(), "=@5"), .number(5), "scalar giữ nguyên")
        XCTAssertEqual(calc(engine(), "=@@A1"), .number(1), "@ kép vô hại")
        XCTAssertEqual(calc(engine(), "=@"), .error("#NAME?"), "@ trơ trọi → lỗi cú pháp")
    }

    func testAtSpilledFunctionReturnsTopLeft() {
        XCTAssertEqual(calc(engine(), "=@SEQUENCE(3)"), .number(1), "mảng tràn: mỏ neo là ô công thức → phần tử đầu")
        XCTAssertEqual(calc(engine(), "=@SORT({3;1;2})"), .number(1), "SORT {1;2;3} → góc trên-trái = 1")
        XCTAssertEqual(calc(engine(), "=@{10,20;30,40}"), .number(10), "hằng mảng 2x2 → 10")
    }

    func testAtWholeColumnAndRow() {
        let e = engine()
        e.setValue(.number(9), sheet: "Data", at: "A3")
        XCTAssertEqual(calc(e, "=@A:A", at: "B3"), .number(9), "cả cột A, hàng 3 → A3 = 9")
        XCTAssertEqual(calc(e, "=@1:1", at: "B2"), .number(2), "cả hàng 1, cột B → B1 = 2")
    }

    func testAtCrossSheet() {
        let e = engine()
        e.addSheet("Other")
        e.setFormula("=@Data!A1:B2", sheet: "Other", at: "B2")
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "Other", at: "B2"), .number(4),
                       "giao ngầm dùng hàng/cột ô công thức dù vùng ở sheet khác")
    }

    func testAtPropagatesErrorCell() {
        let e = engine()
        e.setFormula("=1/0", sheet: "Data", at: "A1")
        XCTAssertEqual(calc(e, "=@A1:A2", at: "B1"), .error("#DIV/0!"), "ô giao nhau bị lỗi lan nguyên vẹn")
    }

    func testAtInsideFunctionAndBinary() {
        let e = engine()
        XCTAssertEqual(calc(e, "=SUM(@A1:A2)", at: "B2"), .number(3), "@ trong đối số hàm → SUM(3)")
        XCTAssertEqual(calc(e, "=@A1:A2+10", at: "B1"), .number(11), "1 + 10")
        XCTAssertEqual(calc(e, "=@A1:A2+1", at: "Z99"), .error("#VALUE!"), "không giao nhau → lỗi lan qua phép +")
    }

    func testAtRecalculatesOnDependencyChange() {
        let e = engine()
        e.setFormula("=6*7", sheet: "Data", at: "B2")
        XCTAssertEqual(calc(e, "=@B1:B3", at: "A2"), .number(42),
                       "B2 là ô công thức xếp sau A2: chỉ tính đúng khi cạnh phụ thuộc @ được theo dõi")
        e.setFormula("=6*8", sheet: "Data", at: "B2")
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "Data", at: "A2"), .number(48), "đổi B2 → @B1:B3 tại A2 tính lại")
    }

    func testAtInsideCSE() {
        let e = engine()
        XCTAssertEqual(cse(e, "=@A1:A2", "D1:D2"), [.number(1), .number(3)],
                       "CSE: mỗi ô lấy hàng của chính nó trong cột A")
        XCTAssertEqual(cse(e, "=@SEQUENCE(2,2)", "D1:E2"),
                       [.number(1), .number(2), .number(3), .number(4)],
                       "CSE: @ trên mảng lấy theo vị trí từng ô")
    }

    // MARK: Toán tử tràn "#" (M7 lát 37)

    func testSpillSumSequence() {
        let e = engine()
        e.setFormula("=SEQUENCE(3)", sheet: "Data", at: "A1")
        XCTAssertEqual(calc(e, "=SUM(A1#)"), .number(6), "SEQUENCE(3) = 1+2+3")
        XCTAssertEqual(calc(e, "=COUNT(A1#)"), .number(3))
        XCTAssertEqual(calc(e, "=SUM(A1#*2)"), .number(12), "tràn * 2 theo từng phần tử")
    }

    func testSpillMatrixAndRow() {
        let e = engine()
        e.setFormula("=SEQUENCE(2,2)", sheet: "Data", at: "A1")
        XCTAssertEqual(calc(e, "=SUM(A1#)"), .number(10), "1+2+3+4")
        e.setFormula("=TRANSPOSE({1,2,3})", sheet: "Data", at: "A1")
        XCTAssertEqual(calc(e, "=SUM(A1#)"), .number(6), "hàng tràn 1x3")
    }

    func testSpillSingleCellResult() {
        let e = engine()
        e.setFormula("=SEQUENCE(1)", sheet: "Data", at: "A1")
        XCTAssertEqual(calc(e, "=A1#"), .number(1), "tràn 1 ô → chính giá trị đó")
        XCTAssertEqual(calc(e, "=SUM(A1#)"), .number(1))
    }

    func testSpillBareFormulaIsValueError() {
        let e = engine()
        e.setFormula("=SEQUENCE(3)", sheet: "Data", at: "A1")
        // Engine chưa tràn giá trị sang ô kề (như SEQUENCE trần): A1# đứng một
        // mình cũng vậy — mảng nhiều ô không ép được về một ô.
        XCTAssertEqual(calc(e, "=A1#"), .error("#VALUE!"))
    }

    func testSpillAnchorNotFormula() {
        let e = engine()
        XCTAssertEqual(calc(e, "=SUM(A1#)"), .error("#VALUE!"), "A1 là hằng 1, không tràn")
        XCTAssertEqual(calc(e, "=SUM(C9#)"), .error("#VALUE!"), "ô trống không tràn")
        e.setFormula("=6*7", sheet: "Data", at: "A1")
        XCTAssertEqual(calc(e, "=SUM(A1#)"), .error("#VALUE!"), "công thức scalar không tràn")
        e.setFormula("=1/0", sheet: "Data", at: "A1")
        XCTAssertEqual(calc(e, "=SUM(A1#)"), .error("#VALUE!"), "công thức lỗi không tràn")
    }

    func testSpillAnchorRangeFormula() {
        let e = engine()
        e.setValue(.number(6), sheet: "Data", at: "B3")
        e.setFormula("=B1:B3", sheet: "Data", at: "A1")
        XCTAssertEqual(calc(e, "=SUM(A1#)"), .number(12), "B1:B3 = 2+4+6")
    }

    func testSpillInvalidAnchors() {
        XCTAssertEqual(calc(engine(), "=SUM(A1:B2#)"), .error("#VALUE!"), "neo phải là một ô")
        XCTAssertEqual(calc(engine(), "=SUM(SEQUENCE(3)#)"), .error("#VALUE!"), "hàm trần không phải tham chiếu")
        XCTAssertEqual(calc(engine(), "=SUM({1,2}#)"), .error("#VALUE!"), "hằng mảng không phải tham chiếu")
        XCTAssertEqual(calc(engine(), "=SUM(NoSheet!A1#)"), .error("#REF!"), "sheet không còn → #REF!")
        XCTAssertEqual(calc(engine(), "=SUM(BadName#)"), .error("#NAME?"), "tên lạ → #NAME?")
    }

    func testSpillCrossSheetAndCase() {
        let e = engine()
        e.addSheet("Other")
        e.setFormula("=SEQUENCE(3)", sheet: "Data", at: "A1")
        e.setFormula("=SUM(Data!A1#)", sheet: "Other", at: "B2")
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "Other", at: "B2"), .number(6))
        XCTAssertEqual(calc(e, "=SUM(a1#)"), .number(6), "chữ thường vẫn nhận")
        XCTAssertEqual(calc(e, "=SUM($A$1#)"), .number(6), "$ tuyệt đối vẫn nhận")
    }

    func testSpillChain() {
        let e = engine()
        e.setFormula("=SEQUENCE(3)", sheet: "Data", at: "A1")
        e.setFormula("=A1#", sheet: "Data", at: "B1")
        XCTAssertEqual(calc(e, "=SUM(B1#)"), .number(6), "chuỗi tràn B1# → A1# → SEQUENCE")
    }

    func testSpillCircularIsRef() {
        let e = engine()
        e.setFormula("=A1#", sheet: "Data", at: "A1")
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "Data", at: "A1"), .error("#REF!"), "tự tham chiếu tràn → vòng")
        e.setFormula("=SUM(B1#)", sheet: "Data", at: "A1")
        e.setFormula("=SUM(A1#)", sheet: "Data", at: "B1")
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "Data", at: "A1"), .error("#REF!"), "vòng chéo qua tràn")
        XCTAssertEqual(e.value(sheet: "Data", at: "B1"), .error("#REF!"))
    }

    func testSpillCSEAnchorIsValueError() {
        let e = engine()
        XCTAssertEqual(cse(e, "=TRANSPOSE(A1:B2)", "D1:E2"),
                       [.number(1), .number(3), .number(2), .number(4)])
        XCTAssertEqual(calc(e, "=SUM(D1#)"), .error("#VALUE!"), "CSE không tràn")
    }

    func testSpillWithAtAndNamedRange() {
        let e = engine()
        e.setFormula("=SEQUENCE(3)", sheet: "Data", at: "A1")
        XCTAssertEqual(calc(e, "=@A1#"), .number(1), "@ trên tràn → góc trên-trái")
        e.defineName("SpillSrc", sheet: "Data", range: CellRange("A1:A1")!)
        XCTAssertEqual(calc(e, "=SUM(SpillSrc#)"), .number(6), "tên vùng 1 ô neo tràn")
    }

    func testSpillRecalculatesOnDependencyChange() {
        let e = engine()
        e.setFormula("=SEQUENCE(B1)", sheet: "Data", at: "A1")
        XCTAssertEqual(calc(e, "=SUM(A1#)"), .number(3), "SEQUENCE(2) = 1+2")
        e.setValue(.number(3), sheet: "Data", at: "B1")
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "Data", at: "Z99"), .number(6), "đổi B1 → SEQUENCE(3) → SUM 6")
    }

    // MARK: Kết hợp (lát 29)

    func testLambdaHelpersCombined() {
        let e = engine()
        XCTAssertEqual(calc(e, "=SUM(MAP(BYROW(A1:B2,LAMBDA(r,SUM(r))),LAMBDA(x,x*2)))"),
                       .number(20), "BYROW {3;7} → MAP {6;14} → SUM 20")
        XCTAssertEqual(calc(e, "=SUM(MAP(SCAN(0,{1,2,3},LAMBDA(a,v,a+v)),LAMBDA(x,x+1)))"),
                       .number(13), "SCAN {1,3,6} → MAP {2,4,7} → SUM 13")
        XCTAssertEqual(calc(e, "=REDUCE(0, BYCOL(A1:B2,LAMBDA(c,SUM(c))), LAMBDA(a,v,a+v))"),
                       .number(10), "BYCOL {4,6} → REDUCE cộng dồn 10")
        XCTAssertEqual(cse(e, "=MAP(MAKEARRAY(2,2,LAMBDA(r,c,r+c)), LAMBDA(x, x*10))", "D1:E2"),
                       [.number(20), .number(30), .number(30), .number(40)],
                       "MAKEARRAY {2,3;3,4} → MAP x10")
    }

    // MARK: GROUPBY (M7 lát 38, INBOX-MAC #17)

    /// Dữ liệu nhóm: A = mặt hàng, B = khu vực, C = doanh số.
    /// Cable = 30+20+25 = 75; Hub = 40+10 = 50; Stand = 50; tổng chung 175.
    private func groupEngine() -> FormulaEngine {
        let e = FormulaEngine()
        e.addSheet("Data")
        e.setValue(.string("Item"), sheet: "Data", at: "A1")
        e.setValue(.string("Region"), sheet: "Data", at: "B1")
        e.setValue(.string("Amount"), sheet: "Data", at: "C1")
        let keys = ["Cable", "Hub", "Cable", "Stand", "Hub", "Cable"]
        let regions = ["North", "North", "South", "North", "South", "South"]
        let amounts = [30.0, 40.0, 20.0, 50.0, 10.0, 25.0]
        for i in 0..<6 {
            e.setValue(.string(keys[i]), sheet: "Data", at: "A\(i + 2)")
            e.setValue(.string(regions[i]), sheet: "Data", at: "B\(i + 2)")
            e.setValue(.number(amounts[i]), sheet: "Data", at: "C\(i + 2)")
        }
        return e
    }

    func testGroupBySumDefault() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=GROUPBY(A2:A7,C2:C7,SUM,0,0)", "D1:E3"),
                       [.string("Cable"), .number(75), .string("Hub"), .number(50),
                        .string("Stand"), .number(50)],
                       "SUM theo mặt hàng, mặc định sắp tăng dần theo khóa")
    }

    func testGroupBySumGrandTotalDefault() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=GROUPBY(A2:A7,C2:C7,SUM,0)", "D1:E4"),
                       [.string("Cable"), .number(75), .string("Hub"), .number(50),
                        .string("Stand"), .number(50), .string("Total"), .number(175)],
                       "total_depth bỏ trống = 1: tổng chung cuối")
        XCTAssertEqual(cse(e, "=GROUPBY(A2:A7,C2:C7,SUM)", "D1:E4"),
                       [.string("Cable"), .number(75), .string("Hub"), .number(50),
                        .string("Stand"), .number(50), .string("Total"), .number(175)],
                       "mọi đối số tùy chọn bỏ trống vẫn có tổng chung")
    }

    func testGroupByGrandTotalTop() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=GROUPBY(A2:A7,C2:C7,SUM,0,-1)", "D1:E4"),
                       [.string("Total"), .number(175), .string("Cable"), .number(75),
                        .string("Hub"), .number(50), .string("Stand"), .number(50)],
                       "total_depth -1: tổng chung đầu")
    }

    func testGroupByHeadersShow() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=GROUPBY(A1:A7,C1:C7,SUM,3,0)", "D1:E4"),
                       [.string("Item"), .string("Amount"),
                        .string("Cable"), .number(75), .string("Hub"), .number(50),
                        .string("Stand"), .number(50)],
                       "field_headers 3: hiện tiêu đề nguồn")
    }

    func testGroupByHeadersHidden() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=GROUPBY(A1:A7,C1:C7,SUM,1,0)", "D1:E3"),
                       [.string("Cable"), .number(75), .string("Hub"), .number(50),
                        .string("Stand"), .number(50)],
                       "field_headers 1: có tiêu đề nhưng không hiện, hàng 1 không thành nhóm")
    }

    func testGroupByHeadersGenerated() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=GROUPBY(A2:A7,C2:C7,SUM,2,0)", "D1:E4"),
                       [.string("Row Field 1"), .string("Value 1"),
                        .string("Cable"), .number(75), .string("Hub"), .number(50),
                        .string("Stand"), .number(50)],
                       "field_headers 2: sinh tiêu đề chung")
    }

    func testGroupByHeadersAuto() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=GROUPBY(A1:A7,C1:C7,SUM,,0)", "D1:E3"),
                       [.string("Cable"), .number(75), .string("Hub"), .number(50),
                        .string("Stand"), .number(50)],
                       "tự đoán: C1 chữ + C2 số → có tiêu đề nhưng 1 cột khóa nên không hiện")
        XCTAssertEqual(cse(e, "=GROUPBY(A1:B7,C1:C7,SUM,,0)", "D1:F6"),
                       [.string("Item"), .string("Region"), .string("Amount"),
                        .string("Cable"), .string("North"), .number(30),
                        .string("Cable"), .string("South"), .number(45),
                        .string("Hub"), .string("North"), .number(40),
                        .string("Hub"), .string("South"), .number(10),
                        .string("Stand"), .string("North"), .number(50)],
                       "tự đoán + 2 cột khóa → hiện tiêu đề nguồn")
    }

    func testGroupByMultiKey() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=GROUPBY(A2:B7,C2:C7,SUM,0,0)", "D1:F5"),
                       [.string("Cable"), .string("North"), .number(30),
                        .string("Cable"), .string("South"), .number(45),
                        .string("Hub"), .string("North"), .number(40),
                        .string("Hub"), .string("South"), .number(10),
                        .string("Stand"), .string("North"), .number(50)],
                       "nhóm 2 cột khóa, sắp theo khóa 1 rồi khóa 2")
    }

    func testGroupBySubtotals() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=GROUPBY(A2:B7,C2:C7,SUM,0,2)", "D1:F9"),
                       [.string("Cable"), .string("North"), .number(30),
                        .string("Cable"), .string("South"), .number(45),
                        .string("Cable"), .empty, .number(75),
                        .string("Hub"), .string("North"), .number(40),
                        .string("Hub"), .string("South"), .number(10),
                        .string("Hub"), .empty, .number(50),
                        .string("Stand"), .string("North"), .number(50),
                        .string("Stand"), .empty, .number(50),
                        .string("Total"), .empty, .number(175)],
                       "total_depth 2: tổng phụ sau mỗi nhóm tiền tố, cột khóa sâu để trống")
    }

    func testGroupBySubtotalsTop() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=GROUPBY(A2:B7,C2:C7,SUM,0,-2)", "D1:F9"),
                       [.string("Total"), .empty, .number(175),
                        .string("Cable"), .empty, .number(75),
                        .string("Cable"), .string("North"), .number(30),
                        .string("Cable"), .string("South"), .number(45),
                        .string("Hub"), .empty, .number(50),
                        .string("Hub"), .string("North"), .number(40),
                        .string("Hub"), .string("South"), .number(10),
                        .string("Stand"), .empty, .number(50),
                        .string("Stand"), .string("North"), .number(50)],
                       "total_depth -2: tổng chung đầu, tổng phụ trước mỗi khối")
    }

    func testGroupByAverageCount() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=GROUPBY(A2:A7,C2:C7,AVERAGE,0,0)", "D1:E3"),
                       [.string("Cable"), .number(25), .string("Hub"), .number(25),
                        .string("Stand"), .number(50)],
                       "AVERAGE: Cable (30+20+25)/3 = 25")
        XCTAssertEqual(cse(e, "=GROUPBY(A2:A7,C2:C7,COUNT,0,0)", "D1:E3"),
                       [.string("Cable"), .number(3), .string("Hub"), .number(2),
                        .string("Stand"), .number(1)],
                       "COUNT đếm số")
    }

    func testGroupByCountaTextValues() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=GROUPBY(B2:B7,A2:A7,COUNTA,0,0)", "D1:E2"),
                       [.string("North"), .number(3), .string("South"), .number(3)],
                       "COUNTA đếm cả chữ")
    }

    func testGroupByMedianMax() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=GROUPBY(A2:A7,C2:C7,MEDIAN,0,0)", "D1:E3"),
                       [.string("Cable"), .number(25), .string("Hub"), .number(25),
                        .string("Stand"), .number(50)],
                       "MEDIAN: Cable {20,25,30} → 25; Hub {10,40} → 25")
        XCTAssertEqual(cse(e, "=GROUPBY(A2:A7,C2:C7,MAX,0,0)", "D1:E3"),
                       [.string("Cable"), .number(30), .string("Hub"), .number(40),
                        .string("Stand"), .number(50)])
    }

    func testGroupByStdevPerCellError() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=GROUPBY(A2:A7,C2:C7,STDEV,0,0)", "D1:E3"),
                       [.string("Cable"), .number(5),
                        .string("Hub"), .number(450.0.squareRoot()),
                        .string("Stand"), .error("#DIV/0!")],
                       "STDEV mẫu: Cable 5; Hub √450; Stand 1 giá trị → #DIV/0! chỉ ở ô đó")
    }

    func testGroupByPercentOf() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=GROUPBY(A2:A7,C2:C7,PERCENTOF,0,0)", "D1:E3"),
                       [.string("Cable"), .number(75.0 / 175.0),
                        .string("Hub"), .number(50.0 / 175.0),
                        .string("Stand"), .number(50.0 / 175.0)],
                       "PERCENTOF: tỉ lệ trên tổng chung 175")
    }

    func testGroupBySortByValueDesc() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=GROUPBY(A2:A7,C2:C7,SUM,0,0,-2)", "D1:E3"),
                       [.string("Cable"), .number(75), .string("Hub"), .number(50),
                        .string("Stand"), .number(50)],
                       "sort_order -2: giảm dần theo cột giá trị; hòa 50 giữ thứ tự xuất hiện")
    }

    func testGroupBySortVector() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=GROUPBY(A2:B7,C2:C7,SUM,0,0,{-1,2})", "D1:F5"),
                       [.string("Stand"), .string("North"), .number(50),
                        .string("Hub"), .string("North"), .number(40),
                        .string("Hub"), .string("South"), .number(10),
                        .string("Cable"), .string("North"), .number(30),
                        .string("Cable"), .string("South"), .number(45)],
                       "sort vector {-1,2}: khóa 1 giảm dần, khóa 2 tăng dần")
    }

    func testGroupByFilter() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=GROUPBY(A2:A7,C2:C7,SUM,0,0,,B2:B7=\"North\")", "D1:E3"),
                       [.string("Cable"), .number(30), .string("Hub"), .number(40),
                        .string("Stand"), .number(50)],
                       "filter chỉ giữ hàng North")
    }

    func testGroupByLambda() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=GROUPBY(A2:A7,C2:C7,LAMBDA(x,SUM(x)*2),0,0)", "D1:E3"),
                       [.string("Cable"), .number(150), .string("Hub"), .number(100),
                        .string("Stand"), .number(100)],
                       "lambda nhận cột giá trị của nhóm")
    }

    func testGroupByLambdaDefinedName() throws {
        let e = groupEngine()
        e.defineNameExpression("DOUBLE_SUM", expr: try FormulaParser.parse("LAMBDA(x, SUM(x)*2)"))
        XCTAssertEqual(cse(e, "=GROUPBY(A2:A7,C2:C7,DOUBLE_SUM,0,0)", "D1:E3"),
                       [.string("Cable"), .number(150), .string("Hub"), .number(100),
                        .string("Stand"), .number(100)],
                       "tên định nghĩa chứa lambda dùng làm hàm tổng hợp")
    }

    func testGroupByCaseSensitiveKeys() {
        let e = FormulaEngine()
        e.addSheet("Data")
        for (i, k) in ["Apple", "apple", "Apple"].enumerated() {
            e.setValue(.string(k), sheet: "Data", at: "A\(i + 2)")
            e.setValue(.number(Double(i + 1)), sheet: "Data", at: "B\(i + 2)")
        }
        XCTAssertEqual(cse(e, "=GROUPBY(A2:A4,B2:B4,SUM,0,0)", "D1:E2"),
                       [.string("Apple"), .number(4), .string("apple"), .number(2)],
                       "GROUPBY phân biệt hoa/thường: Apple ≠ apple (khác UNIQUE)")
    }

    func testGroupByValueErrorPerCell() {
        let e = groupEngine()
        e.setFormula("=1/0", sheet: "Data", at: "C4")
        XCTAssertEqual(cse(e, "=GROUPBY(A2:A7,C2:C7,SUM,0,0)", "D1:E3"),
                       [.string("Cable"), .error("#DIV/0!"), .string("Hub"), .number(50),
                        .string("Stand"), .number(50)],
                       "lỗi trong giá trị chỉ nằm ở ô tổng hợp của nhóm đó")
        XCTAssertEqual(cse(e, "=GROUPBY(A2:A7,C2:C7,COUNT,0,0)", "D1:E3"),
                       [.string("Cable"), .number(2), .string("Hub"), .number(2),
                        .string("Stand"), .number(1)],
                       "COUNT bỏ qua ô lỗi")
        XCTAssertEqual(cse(e, "=GROUPBY(A2:A7,C2:C7,COUNTA,0,0)", "D1:E3"),
                       [.string("Cable"), .number(3), .string("Hub"), .number(2),
                        .string("Stand"), .number(1)],
                       "COUNTA đếm cả ô lỗi")
    }

    func testGroupByErrors() {
        let e = groupEngine()
        XCTAssertEqual(calc(e, "=GROUPBY(A2:A7,C2:C7)"), .error("#VALUE!"), "thiếu function")
        XCTAssertEqual(calc(e, "=GROUPBY(A2:A7,C2:C7,SUM,0,0,0,0,0,0)"), .error("#VALUE!"),
                       "thừa đối số")
        XCTAssertEqual(calc(e, "=GROUPBY(A2:A6,C2:C7,SUM)"), .error("#VALUE!"),
                       "lệch số hàng row_fields/values")
        XCTAssertEqual(calc(e, "=GROUPBY(A2:A7,C2:C7,FOO)"), .error("#NAME?"),
                       "tên hàm lạ → #NAME? như Excel")
        XCTAssertEqual(calc(e, "=GROUPBY(A2:A7,C2:C7,SUM,9)"), .error("#VALUE!"),
                       "field_headers ngoài 0-3")
        XCTAssertEqual(calc(e, "=GROUPBY(A2:A7,C2:C7,SUM,0,3)"), .error("#VALUE!"),
                       "total_depth |n| > 2")
        XCTAssertEqual(calc(e, "=GROUPBY(A2:A7,C2:C7,SUM,0,2)"), .error("#VALUE!"),
                       "total_depth 2 với 1 cột khóa → #VALUE!")
        XCTAssertEqual(calc(e, "=GROUPBY(A2:A7,C2:C7,SUM,0,0,5)"), .error("#VALUE!"),
                       "sort_order vượt số cột kết quả")
        XCTAssertEqual(calc(e, "=GROUPBY(A2:A7,C2:C7,SUM,0,0,0,B2:B6=\"North\")"),
                       .error("#VALUE!"), "filter sai dài")
        XCTAssertEqual(calc(e, "=GROUPBY(A2:A7,C2:C7,SUM,0,0,0,0,1)"), .error("#VALUE!"),
                       "field_relationship 1 (Table) chưa hỗ trợ")
        XCTAssertEqual(calc(e, "=GROUPBY(A2:A7,C2:C7,LAMBDA(x,y,x),0,0)"), .error("#VALUE!"),
                       "lambda tổng hợp phải nhận đúng 1 tham số")
        XCTAssertEqual(calc(e, "=GROUPBY(A2:A7,C2:C7,SUM,0,0,,B2:B7=\"West\")"),
                       .error("#CALC!"), "không hàng nào khớp → #CALC!")
    }

    // MARK: PIVOTBY (M7 lát 39, INBOX-MAC #17)

    /// Fixture PIVOTBY: A = mặt hàng, B = vùng, C = số tiền, D = năm.
    private func pivotEngine() -> FormulaEngine {
        let e = FormulaEngine()
        e.addSheet("Data")
        for (col, name) in ["A": "Item", "B": "Region", "C": "Amount", "D": "Year"] {
            e.setValue(.string(name), sheet: "Data", at: "\(col)1")
        }
        let keys = ["Cable", "Hub", "Cable", "Stand", "Hub", "Cable"]
        let regions = ["North", "North", "South", "North", "South", "South"]
        let amounts = [30.0, 40.0, 20.0, 50.0, 10.0, 25.0]
        let years = [2024.0, 2024.0, 2025.0, 2024.0, 2025.0, 2025.0]
        for i in 0..<6 {
            e.setValue(.string(keys[i]), sheet: "Data", at: "A\(i + 2)")
            e.setValue(.string(regions[i]), sheet: "Data", at: "B\(i + 2)")
            e.setValue(.number(amounts[i]), sheet: "Data", at: "C\(i + 2)")
            e.setValue(.number(years[i]), sheet: "Data", at: "D\(i + 2)")
        }
        return e
    }

    /// Fixture PIVOTBY 2 cột khóa cột: A = mặt hàng, B = vùng, C = năm, D = số tiền.
    private func pivotEngine2() -> FormulaEngine {
        let e = FormulaEngine()
        e.addSheet("Data")
        for (col, name) in ["A": "Item", "B": "Region", "C": "Year", "D": "Amount"] {
            e.setValue(.string(name), sheet: "Data", at: "\(col)1")
        }
        let keys = ["Cable", "Hub", "Cable", "Stand", "Hub", "Cable"]
        let regions = ["North", "North", "South", "North", "South", "South"]
        let years = [2024.0, 2024.0, 2025.0, 2024.0, 2025.0, 2025.0]
        let amounts = [30.0, 40.0, 20.0, 50.0, 10.0, 25.0]
        for i in 0..<6 {
            e.setValue(.string(keys[i]), sheet: "Data", at: "A\(i + 2)")
            e.setValue(.string(regions[i]), sheet: "Data", at: "B\(i + 2)")
            e.setValue(.number(years[i]), sheet: "Data", at: "C\(i + 2)")
            e.setValue(.number(amounts[i]), sheet: "Data", at: "D\(i + 2)")
        }
        return e
    }

    func testPivotBySumDefault() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7,SUM)", "D1:G4"),
                       [.string("Cable"), .number(30), .number(45), .number(75),
                        .string("Hub"), .number(40), .number(10), .number(50),
                        .string("Stand"), .number(50), .number(0), .number(50),
                        .string("Total"), .number(120), .number(55), .number(175)],
                       "mặc định: function SUM, tổng chung cả 2 trục; ô giao rỗng = 0")
        XCTAssertEqual(cse(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7)", "D1:G4"),
                       [.string("Cable"), .number(30), .number(45), .number(75),
                        .string("Hub"), .number(40), .number(10), .number(50),
                        .string("Stand"), .number(50), .number(0), .number(50),
                        .string("Total"), .number(120), .number(55), .number(175)],
                       "function bỏ trống = SUM")
    }

    func testPivotByNoTotals() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7,SUM,0,0,,0)", "D1:F3"),
                       [.string("Cable"), .number(30), .number(45),
                        .string("Hub"), .number(40), .number(10),
                        .string("Stand"), .number(50), .number(0)],
                       "row_total_depth 0 + col_total_depth 0: không hàng/cột tổng")
    }

    func testPivotByRowTotalTop() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7,SUM,0,-1)", "D1:G4"),
                       [.string("Total"), .number(120), .number(55), .number(175),
                        .string("Cable"), .number(30), .number(45), .number(75),
                        .string("Hub"), .number(40), .number(10), .number(50),
                        .string("Stand"), .number(50), .number(0), .number(50)],
                       "row_total_depth -1: hàng tổng chung lên đầu")
    }

    func testPivotByHeadersShow() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=PIVOTBY(A1:A7,B1:B7,C1:C7,SUM,3,0,,0)", "D1:F5"),
                       [.string("Item"), .string("North"), .string("South"),
                        .string("Item"), .string("Amount"), .string("Amount"),
                        .string("Cable"), .number(30), .number(45),
                        .string("Hub"), .number(40), .number(10),
                        .string("Stand"), .number(50), .number(0)],
                       "field_headers 3: hàng mức khóa cột + hàng tên giá trị")
    }

    func testPivotByHeadersGenerated() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7,SUM,2,0,,0)", "D1:F5"),
                       [.string("Row Field 1"), .string("North"), .string("South"),
                        .string("Row Field 1"), .string("Value 1"), .string("Value 1"),
                        .string("Cable"), .number(30), .number(45),
                        .string("Hub"), .number(40), .number(10),
                        .string("Stand"), .number(50), .number(0)],
                       "field_headers 2: sinh \"Row Field 1\"/\"Value 1\"")
    }

    func testPivotByHeadersAuto() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=PIVOTBY(A1:A7,B1:B7,C1:C7,SUM,,0,,0)", "D1:F3"),
                       [.string("Cable"), .number(30), .number(45),
                        .string("Hub"), .number(40), .number(10),
                        .string("Stand"), .number(50), .number(0)],
                       "tự đoán: 1 cột khóa mỗi trục → có tiêu đề nhưng không hiện")
        let e2 = pivotEngine()
        XCTAssertEqual(cse(e2, "=PIVOTBY(A1:B7,D1:D7,C1:C7,SUM)", "F1:J8"),
                       [.string("Item"), .string("Region"), .number(2024), .number(2025), .empty,
                        .string("Item"), .string("Region"), .string("Amount"), .string("Amount"), .string("Total"),
                        .string("Cable"), .string("North"), .number(30), .number(0), .number(30),
                        .string("Cable"), .string("South"), .number(0), .number(45), .number(45),
                        .string("Hub"), .string("North"), .number(40), .number(0), .number(40),
                        .string("Hub"), .string("South"), .number(0), .number(10), .number(10),
                        .string("Stand"), .string("North"), .number(50), .number(0), .number(50),
                        .string("Total"), .empty, .number(120), .number(55), .number(175)],
                       "tự đoán: 2 cột khóa hàng → hiện tiêu đề, cột tổng ghi \"Total\"")
    }

    func testPivotByMultiKeyRows() {
        let e = pivotEngine()
        XCTAssertEqual(cse(e, "=PIVOTBY(A2:B7,D2:D7,C2:C7,SUM,0)", "F1:J6"),
                       [.string("Cable"), .string("North"), .number(30), .number(0), .number(30),
                        .string("Cable"), .string("South"), .number(0), .number(45), .number(45),
                        .string("Hub"), .string("North"), .number(40), .number(0), .number(40),
                        .string("Hub"), .string("South"), .number(0), .number(10), .number(10),
                        .string("Stand"), .string("North"), .number(50), .number(0), .number(50),
                        .string("Total"), .empty, .number(120), .number(55), .number(175)],
                       "2 cột khóa hàng (Item, Region) × cột khóa năm")
    }

    func testPivotBySubtotalsRow() {
        let e = pivotEngine()
        XCTAssertEqual(cse(e, "=PIVOTBY(A2:B7,D2:D7,C2:C7,SUM,0,2)", "F1:J9"),
                       [.string("Cable"), .string("North"), .number(30), .number(0), .number(30),
                        .string("Cable"), .string("South"), .number(0), .number(45), .number(45),
                        .string("Cable"), .empty, .number(30), .number(45), .number(75),
                        .string("Hub"), .string("North"), .number(40), .number(0), .number(40),
                        .string("Hub"), .string("South"), .number(0), .number(10), .number(10),
                        .string("Hub"), .empty, .number(40), .number(10), .number(50),
                        .string("Stand"), .string("North"), .number(50), .number(0), .number(50),
                        .string("Stand"), .empty, .number(50), .number(0), .number(50),
                        .string("Total"), .empty, .number(120), .number(55), .number(175)],
                       "row_total_depth 2: tổng phụ sau mỗi khối tiền tố (cột khóa sâu để trống)")
    }

    func testPivotBySubtotalsCol() {
        let e = pivotEngine2()
        XCTAssertEqual(cse(e, "=PIVOTBY(A2:A7,B2:C7,D2:D7,SUM,0,0,,2)", "F1:K3"),
                       [.string("Cable"), .number(30), .number(30), .number(45), .number(45), .number(75),
                        .string("Hub"), .number(40), .number(40), .number(10), .number(10), .number(50),
                        .string("Stand"), .number(50), .number(50), .number(0), .number(0), .number(50)],
                       "col_total_depth 2: chỉ nhóm cột quan sát được ((North,2024), (South,2025)) mới thành cột; cột tổng phụ sau mỗi khối tiền tố vùng + cột tổng chung")
    }

    func testPivotByAverageCount() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7,AVERAGE,0,0,,0)", "D1:F3"),
                       [.string("Cable"), .number(30), .number(22.5),
                        .string("Hub"), .number(40), .number(10),
                        .string("Stand"), .number(50), .error("#DIV/0!")],
                       "AVERAGE: giao rỗng → #DIV/0! chỉ ở ô đó")
        XCTAssertEqual(cse(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7,COUNT,0,0,,0)", "D1:F3"),
                       [.string("Cable"), .number(1), .number(2),
                        .string("Hub"), .number(1), .number(1),
                        .string("Stand"), .number(1), .number(0)],
                       "COUNT: giao rỗng = 0")
    }

    func testPivotByPercentOfGrand() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7,PERCENTOF,0,0)", "D1:G3"),
                       [.string("Cable"), .number(30.0 / 175.0), .number(45.0 / 175.0), .number(75.0 / 175.0),
                        .string("Hub"), .number(40.0 / 175.0), .number(10.0 / 175.0), .number(50.0 / 175.0),
                        .string("Stand"), .number(50.0 / 175.0), .number(0), .number(50.0 / 175.0)],
                       "PERCENTOF mặc định (relative_to 0): tỉ lệ trên tổng chung 175; row_depth 0 nên không có hàng Total")
    }

    func testPivotByPercentOfRow() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7,PERCENTOF,0,0,,,,,1)", "D1:G3"),
                       [.string("Cable"), .number(30.0 / 75.0), .number(45.0 / 75.0), .number(1),
                        .string("Hub"), .number(40.0 / 50.0), .number(10.0 / 50.0), .number(1),
                        .string("Stand"), .number(1), .number(0), .number(1)],
                       "PERCENTOF relative_to 1: tỉ lệ trên tổng hàng; row_depth 0 nên không có hàng Total")
    }

    func testPivotByPercentOfCol() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7,PERCENTOF,0,0,,,,,2)", "D1:G3"),
                       [.string("Cable"), .number(30.0 / 120.0), .number(45.0 / 55.0), .number(75.0 / 175.0),
                        .string("Hub"), .number(40.0 / 120.0), .number(10.0 / 55.0), .number(50.0 / 175.0),
                        .string("Stand"), .number(50.0 / 120.0), .number(0), .number(50.0 / 175.0)],
                       "PERCENTOF relative_to 2: tỉ lệ trên tổng cột; row_depth 0 nên không có hàng Total")
    }

    func testPivotBySortOrders() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7,SUM,0,,,,-1)", "D1:G4"),
                       [.string("Cable"), .number(45), .number(30), .number(75),
                        .string("Hub"), .number(10), .number(40), .number(50),
                        .string("Stand"), .number(0), .number(50), .number(50),
                        .string("Total"), .number(55), .number(120), .number(175)],
                       "col_sort_order -1: cột South trước North")
        XCTAssertEqual(cse(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7,SUM,0,,-1)", "D1:G4"),
                       [.string("Stand"), .number(50), .number(0), .number(50),
                        .string("Hub"), .number(40), .number(10), .number(50),
                        .string("Cable"), .number(30), .number(45), .number(75),
                        .string("Total"), .number(120), .number(55), .number(175)],
                       "row_sort_order -1: hàng Stand, Hub, Cable")
    }

    func testPivotByFilter() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7,SUM,0,0,,,,B2:B7=\"North\")", "D1:F3"),
                       [.string("Cable"), .number(30), .number(30),
                        .string("Hub"), .number(40), .number(40),
                        .string("Stand"), .number(50), .number(50)],
                       "filter chỉ giữ hàng North: nhóm cột South biến mất; row_depth 0 nên không có hàng Total")
    }

    func testPivotByLambda() {
        let e = groupEngine()
        XCTAssertEqual(cse(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7,LAMBDA(x,SUM(x)*2),0,0,,0)", "D1:F3"),
                       [.string("Cable"), .number(60), .number(90),
                        .string("Hub"), .number(80), .number(20),
                        .string("Stand"), .number(100), .number(0)],
                       "lambda nhận cột giá trị của từng ô giao")
    }

    func testPivotByLambdaDefinedName() throws {
        let e = groupEngine()
        e.defineNameExpression("DOUBLE_SUM", expr: try FormulaParser.parse("LAMBDA(x, SUM(x)*2)"))
        XCTAssertEqual(cse(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7,DOUBLE_SUM,0,0,,0)", "D1:F3"),
                       [.string("Cable"), .number(60), .number(90),
                        .string("Hub"), .number(80), .number(20),
                        .string("Stand"), .number(100), .number(0)],
                       "tên định nghĩa chứa lambda dùng làm hàm tổng hợp")
    }

    func testPivotByCaseSensitiveKeys() {
        let e = FormulaEngine()
        e.addSheet("Data")
        for (i, k) in ["Apple", "apple", "Apple"].enumerated() {
            e.setValue(.string(k), sheet: "Data", at: "A\(i + 2)")
            e.setValue(.string("North"), sheet: "Data", at: "B\(i + 2)")
            e.setValue(.number(Double(i + 1)), sheet: "Data", at: "C\(i + 2)")
        }
        XCTAssertEqual(cse(e, "=PIVOTBY(A2:A4,B2:B4,C2:C4,SUM,0,0)", "D1:F2"),
                       [.string("Apple"), .number(4), .number(4),
                        .string("apple"), .number(2), .number(2)],
                       "PIVOTBY phân biệt hoa/thường: Apple ≠ apple (như GROUPBY); row_depth 0 nên không có hàng Total")
    }

    func testPivotByValueErrorPerCell() {
        let e = groupEngine()
        e.setFormula("=1/0", sheet: "Data", at: "C4")
        XCTAssertEqual(cse(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7,SUM,0,0,,0)", "D1:F3"),
                       [.string("Cable"), .number(30), .error("#DIV/0!"),
                        .string("Hub"), .number(40), .number(10),
                        .string("Stand"), .number(50), .number(0)],
                       "lỗi trong giá trị chỉ nằm ở ô giao của nhóm đó")
        XCTAssertEqual(cse(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7,SUM)", "D1:G4"),
                       [.string("Cable"), .number(30), .error("#DIV/0!"), .error("#DIV/0!"),
                        .string("Hub"), .number(40), .number(10), .number(50),
                        .string("Stand"), .number(50), .number(0), .number(50),
                        .string("Total"), .number(120), .error("#DIV/0!"), .error("#DIV/0!")],
                       "lỗi lan sang cột tổng của hàng đó và hàng tổng của cột đó, không phá cả bảng")
    }

    func testPivotByErrors() {
        let e = groupEngine()
        XCTAssertEqual(calc(e, "=PIVOTBY(A2:A7,B2:B7)"), .error("#VALUE!"), "thiếu values")
        XCTAssertEqual(calc(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7,SUM,0,0,0,0,0,0,0,0)"), .error("#VALUE!"),
                       "thừa đối số (12)")
        XCTAssertEqual(calc(e, "=PIVOTBY(A2:A6,B2:B7,C2:C7,SUM)"), .error("#VALUE!"),
                       "lệch số hàng row_fields/values")
        XCTAssertEqual(calc(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7,FOO)"), .error("#NAME?"),
                       "tên hàm lạ → #NAME? như Excel")
        XCTAssertEqual(calc(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7,SUM,9)"), .error("#VALUE!"),
                       "field_headers ngoài 0-3")
        XCTAssertEqual(calc(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7,SUM,0,3)"), .error("#VALUE!"),
                       "row_total_depth |n| > 2")
        XCTAssertEqual(calc(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7,SUM,0,2)"), .error("#VALUE!"),
                       "row_total_depth 2 với 1 cột khóa hàng → #VALUE!")
        XCTAssertEqual(calc(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7,SUM,0,0,,2)"), .error("#VALUE!"),
                       "col_total_depth 2 với 1 cột khóa cột → #VALUE!")
        XCTAssertEqual(calc(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7,SUM,0,0,5)"), .error("#VALUE!"),
                       "row_sort_order vượt số cột khóa hàng")
        XCTAssertEqual(calc(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7,SUM,0,0,,,,B2:B6=\"North\")"),
                       .error("#VALUE!"), "filter sai dài")
        XCTAssertEqual(calc(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7,PERCENTOF,0,0,,,,,3)"),
                       .error("#VALUE!"), "relative_to ngoài 0-2")
        XCTAssertEqual(calc(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7,LAMBDA(x,y,x),0,0)"), .error("#VALUE!"),
                       "lambda tổng hợp phải nhận đúng 1 tham số")
        XCTAssertEqual(calc(e, "=PIVOTBY(,B2:B7,C2:C7,SUM)"), .error("#VALUE!"),
                       "row_fields rỗng chưa hỗ trợ")
        XCTAssertEqual(calc(e, "=PIVOTBY(A2:A7,B2:B7,C2:C7,SUM,0,0,,,,B2:B7=\"West\")"),
                       .error("#CALC!"), "không hàng nào khớp → #CALC!")
    }

    // MARK: ARRAYTOTEXT / VALUETOTEXT (M7 lát 40)

    func testValueToTextNumber() {
        XCTAssertEqual(calc(engine(), "=VALUETOTEXT(42)"), .string("42"))
        XCTAssertEqual(calc(engine(), "=VALUETOTEXT(1.5)"), .string("1.5"))
        XCTAssertEqual(calc(engine(), "=VALUETOTEXT(0)"), .string("0"))
        XCTAssertEqual(calc(engine(), "=VALUETOTEXT(-7)"), .string("-7"))
    }

    func testValueToTextGeneral15Digits() {
        XCTAssertEqual(calc(engine(), "=VALUETOTEXT(123456789012345)"), .string("123456789012345"),
                       "15 chữ số giữ dạng thường")
        XCTAssertEqual(calc(engine(), "=VALUETOTEXT(1234567890123456)"), .string("1234567890123450"),
                       "16 chữ số: tokenizer cắt về 15 chữ số đầu rồi đệm 0, KHÔNG làm tròn lên (lát 30)")
        XCTAssertEqual(calc(engine(), "=VALUETOTEXT(100000000000000000000)"), .string("1E+20"),
                       "vượt 20 ký tự dạng thường → khoa học")
    }

    func testValueToTextString() {
        XCTAssertEqual(calc(engine(), "=VALUETOTEXT(\"abc\")"), .string("abc"), "concise giữ nguyên chuỗi")
        XCTAssertEqual(calc(engine(), "=VALUETOTEXT(\"abc\",1)"), .string("\"abc\""), "strict đặt trong ngoặc kép")
        XCTAssertEqual(calc(engine(), "=VALUETOTEXT(\"a\"\"b\",1)"), .string("\"a\"\"b\""),
                       "strict nhân đôi dấu ngoặc kép bên trong")
        XCTAssertEqual(calc(engine(), "=VALUETOTEXT(\"abc\",0)"), .string("abc"))
    }

    func testValueToTextBoolAndError() {
        XCTAssertEqual(calc(engine(), "=VALUETOTEXT(TRUE)"), .string("TRUE"))
        XCTAssertEqual(calc(engine(), "=VALUETOTEXT(FALSE,1)"), .string("FALSE"))
        XCTAssertEqual(calc(engine(), "=VALUETOTEXT(1/0)"), .error("#DIV/0!"), "lỗi lan truyền nguyên vẹn")
        XCTAssertEqual(calc(engine(), "=VALUETOTEXT(1,1/0)"), .error("#DIV/0!"), "lỗi ở định_dạng lan truyền")
    }

    func testValueToTextEmptyAndRange() {
        XCTAssertEqual(calc(engine(), "=VALUETOTEXT(Z1)"), .string(""), "ô trống → chuỗi rỗng")
        XCTAssertEqual(calc(engine(), "=VALUETOTEXT(Z1,1)"), .string("\"\""), "ô trống ở strict → \"\"")
        XCTAssertEqual(calc(engine(), "=VALUETOTEXT(A1)"), .string("1"), "vùng 1 ô")
        XCTAssertEqual(calc(engine(), "=VALUETOTEXT(A1:B2)"), .error("#VALUE!"),
                       "vùng nhiều ô ngoài CSE → #VALUE!")
    }

    func testValueToTextBadFormat() {
        XCTAssertEqual(calc(engine(), "=VALUETOTEXT(1,2)"), .error("#VALUE!"), "định_dạng chỉ nhận 0/1")
        XCTAssertEqual(calc(engine(), "=VALUETOTEXT(1,-1)"), .error("#VALUE!"))
        XCTAssertEqual(calc(engine(), "=VALUETOTEXT(1,\"x\")"), .error("#VALUE!"), "định_dạng không phải số")
        XCTAssertEqual(calc(engine(), "=VALUETOTEXT(1,TRUE)"), .string("1"),
                       "TRUE ép về 1 → strict; số không thêm ngoặc kép ở strict")
    }

    func testArrayToTextNumbers() {
        XCTAssertEqual(calc(engine(), "=ARRAYTOTEXT(A1:B2)"), .string("{1,2;3,4}"),
                       "phẩy ngăn cột, chấm phẩy ngăn hàng")
        XCTAssertEqual(calc(engine(), "=ARRAYTOTEXT(A1:B2,1)"), .string("{1,2;3,4}"), "số không đổi ở strict")
        XCTAssertEqual(calc(engine(), "=ARRAYTOTEXT({1,2,3})"), .string("{1,2,3}"), "1 hàng")
        XCTAssertEqual(calc(engine(), "=ARRAYTOTEXT({1;2;3})"), .string("{1;2;3}"), "1 cột")
    }

    func testArrayToTextStrings() {
        let e = engine()
        e.setValue(.string("a"), sheet: "Data", at: "C1")
        e.setValue(.string("b"), sheet: "Data", at: "C2")
        XCTAssertEqual(calc(e, "=ARRAYTOTEXT(A1:C2)"), .string("{1,2,a;3,4,b}"))
        XCTAssertEqual(calc(e, "=ARRAYTOTEXT(A1:C2,1)"), .string("{1,2,\"a\";3,4,\"b\"}"))
        XCTAssertEqual(calc(engine(), "=ARRAYTOTEXT({\"a\",\"b\";\"c\",1})"), .string("{a,b;c,1}"))
        XCTAssertEqual(calc(engine(), "=ARRAYTOTEXT({\"a\",\"b\";\"c\",1},1)"), .string("{\"a\",\"b\";\"c\",1}"))
    }

    func testArrayToTextSingle() {
        XCTAssertEqual(calc(engine(), "=ARRAYTOTEXT(5)"), .string("5"), "1 ô không ngoặc nhọn")
        XCTAssertEqual(calc(engine(), "=ARRAYTOTEXT(\"x\",1)"), .string("\"x\""))
        XCTAssertEqual(calc(engine(), "=ARRAYTOTEXT({9})"), .string("9"))
        XCTAssertEqual(calc(engine(), "=ARRAYTOTEXT(A1)"), .string("1"))
    }

    func testArrayToTextEmptyCells() {
        XCTAssertEqual(calc(engine(), "=ARRAYTOTEXT(A1:C1)"), .string("{1,2,}"),
                       "ô trống concise → rỗng giữa hai dấu phẩy")
        XCTAssertEqual(calc(engine(), "=ARRAYTOTEXT(A1:C1,1)"), .string("{1,2,\"\"}"),
                       "ô trống strict → \"\"")
    }

    func testArrayToTextBoolAndError() {
        XCTAssertEqual(calc(engine(), "=ARRAYTOTEXT({TRUE,FALSE})"), .string("{TRUE,FALSE}"))
        let e = engine()
        e.setFormula("=1/0", sheet: "Data", at: "C1")
        XCTAssertEqual(calc(e, "=ARRAYTOTEXT(A1:C1)"), .string("{1,2,#DIV/0!}"),
                       "ô lỗi trong mảng giữ nguyên mã")
        XCTAssertEqual(calc(engine(), "=ARRAYTOTEXT(1/0)"), .error("#DIV/0!"), "lỗi scalar lan truyền")
        XCTAssertEqual(calc(engine(), "=ARRAYTOTEXT(LAMBDA(x,x+1))"), .error("#VALUE!"), "lambda trần")
    }

    func testArrayToTextBadFormat() {
        XCTAssertEqual(calc(engine(), "=ARRAYTOTEXT(A1:B2,2)"), .error("#VALUE!"))
        XCTAssertEqual(calc(engine(), "=ARRAYTOTEXT(A1:B2,\"x\")"), .error("#VALUE!"))
    }

    // MARK: FREQUENCY (M7 lát 43)

    func testFrequencyBasic() {
        XCTAssertEqual(cse(engine(), "=FREQUENCY({1,2,3,4,5,6,7,8,9,10},{3,6,9})", "D1:D4"),
                       [.number(3), .number(3), .number(3), .number(1)],
                       "≤3: 1,2,3; (3,6]: 4,5,6; (6,9]: 7,8,9; >9: 10")
    }

    func testFrequencyRange() {
        XCTAssertEqual(cse(engine(), "=FREQUENCY(A1:B2,{2,3})", "D1:D3"),
                       [.number(2), .number(1), .number(1)],
                       "≤2: 1,2; (2,3]: 3; >3: 4")
    }

    func testFrequencyIgnoresTextBlankBool() {
        let e = engine()
        e.setValue(.string("x"), sheet: "Data", at: "A3")
        e.setValue(.bool(true), sheet: "Data", at: "B3")
        e.setValue(.number(5), sheet: "Data", at: "A4")
        e.setValue(.number(6), sheet: "Data", at: "B4")
        // A1:B4 = 1,2,3,4,"x",TRUE,5,6 — chữ/logic bị bỏ qua; cột C trống cũng vậy.
        XCTAssertEqual(cse(e, "=FREQUENCY(A1:B4,{4,5})", "D1:D3"),
                       [.number(4), .number(1), .number(1)],
                       "≤4: 1,2,3,4; (4,5]: 5; >5: 6")
        XCTAssertEqual(cse(e, "=FREQUENCY(A1:C4,{4,5})", "D1:D3"),
                       [.number(4), .number(1), .number(1)], "ô trống trong vùng bị bỏ qua")
    }

    func testFrequencyEmptyBins() {
        // Không có khoảng nào → mảng 1 phần tử = số giá trị số trong dữ liệu.
        XCTAssertEqual(calc(engine(), "=FREQUENCY(A1:B2,D10)"), .number(4))
    }

    func testFrequencyEmptyData() {
        // Không có giá trị số nào → toàn 0.
        XCTAssertEqual(cse(engine(), "=FREQUENCY(D10,{1,2})", "D1:D3"),
                       [.number(0), .number(0), .number(0)])
    }

    func testFrequencyBinBoundaryInclusive() {
        // Giá trị đúng bằng giới hạn khoảng thuộc về khoảng đó.
        XCTAssertEqual(cse(engine(), "=FREQUENCY({5,10,15},{5,10,15})", "D1:D4"),
                       [.number(1), .number(1), .number(1), .number(0)])
    }

    func testFrequencyErrorPropagates() {
        let e = engine()
        e.setFormula("=1/0", sheet: "Data", at: "A3")
        XCTAssertEqual(calc(e, "=FREQUENCY(A1:A3,{2})"), .error("#DIV/0!"), "lỗi trong dữ liệu lan truyền")
        let e2 = engine()
        e2.setFormula("=1/0", sheet: "Data", at: "C1")
        XCTAssertEqual(calc(e2, "=FREQUENCY(A1:B2,C1)"), .error("#DIV/0!"), "lỗi trong khoảng lan truyền")
    }

    func testFrequencyWrongArgCount() {
        XCTAssertEqual(calc(engine(), "=FREQUENCY(A1:B2)"), .error("#VALUE!"), "thiếu đối số")
        XCTAssertEqual(calc(engine(), "=FREQUENCY(A1:B2,{1},2)"), .error("#VALUE!"), "thừa đối số")
    }

    func testFrequencyThroughScalarConsumer() {
        XCTAssertEqual(calc(engine(), "=SUM(FREQUENCY({1,2,3,4,5},{2,4}))"), .number(5),
                       "2+2+1 qua SUM")
        XCTAssertEqual(calc(engine(), "=FREQUENCY({1,2,3},{2})"), .error("#VALUE!"),
                       "mảng nhiều phần tử ở ô đơn, như SEQUENCE(2,2)")
    }
}
