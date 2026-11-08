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
}
