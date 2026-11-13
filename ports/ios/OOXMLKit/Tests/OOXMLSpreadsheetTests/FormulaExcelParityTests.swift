import XCTest
@testable import OOXMLSpreadsheet

/// Hành vi phát hiện được khi đối chiếu engine với bộ tính độc lập (scripts/formula-oracle, đợt 2):
/// so sánh số theo 15 chữ số có nghĩa, dấu trừ đơn trên mảng, TEXT "@", WEEKDAY 11–17,
/// họ hàm kiểm tra loại (IS…, N, T, TYPE, ERROR.TYPE) và XOR.
final class FormulaExcelParityTests: XCTestCase {
    private func eval(_ formula: String, data: [(String, CellValue)] = []) -> CellValue {
        let engine = FormulaEngine()
        engine.addSheet("S")
        for (ref, v) in data { engine.setValue(v, sheet: "S", at: ref) }
        engine.setFormula(formula, sheet: "S", at: "Z1")
        _ = engine.recalculate()
        return engine.value(sheet: "S", at: "Z1")
    }

    // MARK: So sánh số

    func testNumbersCompareAtFifteenSignificantDigits() {
        XCTAssertEqual(eval("0.1+0.2=0.3"), .bool(true))
        XCTAssertEqual(eval("0.1+0.2<>0.3"), .bool(false))
        XCTAssertEqual(eval("0.1+0.2>0.3"), .bool(false))
        XCTAssertEqual(eval("0.1+0.2>=0.3"), .bool(true))
        XCTAssertEqual(eval("1.0000000000000001=1"), .bool(true))
        // Khác nhau thật ở chữ số thứ 15 thì vẫn khác.
        XCTAssertEqual(eval("1.00000000000001=1"), .bool(false))
        XCTAssertEqual(eval("1.00000000000001>1"), .bool(true))
        XCTAssertEqual(eval("123456789012345=123456789012346"), .bool(false))
        XCTAssertEqual(eval("0=0.000000000000001"), .bool(false))
        XCTAssertEqual(eval("-0.1-0.2=-0.3"), .bool(true))
        XCTAssertEqual(eval("1E300=1E300*(1+1E-16)"), .bool(true))
        XCTAssertEqual(eval("1E300=1E300*1.00001"), .bool(false))
        XCTAssertTrue(FormulaEvaluator.numbersEqualToExcelPrecision(.infinity, .infinity))
        XCTAssertFalse(FormulaEvaluator.numbersEqualToExcelPrecision(.infinity, 1e308))
    }

    // MARK: Dấu trừ đơn trên mảng

    func testUnaryMinusOverArrays() {
        let data: [(String, CellValue)] = [("A1", .string("apple")), ("A2", .string("fig")), ("A3", .string("Apple")),
                                           ("B1", .number(1)), ("B2", .number(2)), ("B3", .number(3))]
        XCTAssertEqual(eval("SUMPRODUCT(--(A1:A3=\"apple\"))", data: data), .number(2))
        XCTAssertEqual(eval("SUMPRODUCT(--(A1:A3=\"apple\"),B1:B3)", data: data), .number(4))
        XCTAssertEqual(eval("SUMPRODUCT(-B1:B3)", data: data), .number(-6))
        XCTAssertEqual(eval("SUM(-B1:B3)", data: data), .number(-6), "Excel 365: mảng tính trực tiếp, không giao ngầm")
        XCTAssertEqual(eval("SUMPRODUCT(+B1:B3)", data: data), .number(6))
        XCTAssertEqual(eval("-B1", data: data), .number(-1), "một ô vẫn là giá trị đơn")
        XCTAssertEqual(eval("SUMPRODUCT(-A1:A3)", data: data), .error("#VALUE!"), "chữ không ép được sang số")
    }

    // MARK: TEXT, WEEKDAY

    func testTextAtFormatReturnsTextVerbatim() {
        XCTAssertEqual(eval("TEXT(5,\"@\")"), .string("5"))
        XCTAssertEqual(eval("TEXT(\"abc\",\"@\")"), .string("abc"))
        XCTAssertEqual(eval("TEXT(TRUE,\"@\")"), .string("TRUE"))
        XCTAssertEqual(eval("TEXT(1.5,\"@\")"), .string("1.5"))
        XCTAssertEqual(eval("TEXT(5,\"0.0\")"), .string("5.0"), "định dạng số thường không đổi")
    }

    func testWeekdayReturnTypes11To17() {
        // 2023-01-01 là Chủ nhật (serial 44927).
        let sunday = "DATE(2023,1,1)"
        let expected: [Int: Double] = [1: 1, 2: 7, 3: 6, 11: 7, 12: 6, 13: 5, 14: 4, 15: 3, 16: 2, 17: 1]
        for (type, value) in expected {
            XCTAssertEqual(eval("WEEKDAY(\(sunday),\(type))"), .number(value), "kiểu \(type)")
        }
        // Thứ hai 2/1/2023: kiểu 11 = 1, kiểu 17 = 2.
        XCTAssertEqual(eval("WEEKDAY(DATE(2023,1,2),11)"), .number(1))
        XCTAssertEqual(eval("WEEKDAY(DATE(2023,1,2),17)"), .number(2))
        XCTAssertEqual(eval("WEEKDAY(DATE(2023,1,1),0)"), .error("#NUM!"))
        XCTAssertEqual(eval("WEEKDAY(DATE(2023,1,1),10)"), .error("#NUM!"))
        XCTAssertEqual(eval("WEEKDAY(DATE(2023,1,1),18)"), .error("#NUM!"))
    }

    // MARK: Họ hàm kiểm tra loại

    func testIsFamilyDoesNotPropagateErrors() {
        let data: [(String, CellValue)] = [("A1", .number(5)), ("A2", .string("x")), ("A3", .bool(true)),
                                           ("A4", .error("#N/A")), ("A5", .error("#DIV/0!")), ("A6", .string(""))]
        let cases: [(String, Bool)] = [
            ("ISNUMBER(A1)", true), ("ISNUMBER(A2)", false), ("ISNUMBER(A3)", false), ("ISNUMBER(A4)", false),
            ("ISNUMBER(A9)", false), ("ISNUMBER(\"5\")", false),
            ("ISTEXT(A2)", true), ("ISTEXT(A1)", false), ("ISTEXT(A6)", true), ("ISTEXT(A9)", false),
            ("ISLOGICAL(A3)", true), ("ISLOGICAL(A1)", false), ("ISLOGICAL(TRUE)", true),
            ("ISERROR(A4)", true), ("ISERROR(A5)", true), ("ISERROR(A1)", false), ("ISERROR(1/0)", true),
            ("ISNA(A4)", true), ("ISNA(A5)", false), ("ISNA(NA())", true),
            ("ISERR(A4)", false), ("ISERR(A5)", true), ("ISERR(A1)", false),
            ("ISBLANK(A9)", true), ("ISBLANK(A1)", false), ("ISBLANK(A6)", false), ("ISBLANK(\"\")", false),
        ]
        for (formula, want) in cases {
            XCTAssertEqual(eval(formula, data: data), .bool(want), formula)
        }
    }

    func testIsEvenOdd() {
        XCTAssertEqual(eval("ISEVEN(4)"), .bool(true))
        XCTAssertEqual(eval("ISODD(4)"), .bool(false))
        XCTAssertEqual(eval("ISEVEN(3.9)"), .bool(false), "cắt phần thập phân trước")
        XCTAssertEqual(eval("ISODD(-3)"), .bool(true))
        XCTAssertEqual(eval("ISEVEN(-2)"), .bool(true))
        XCTAssertEqual(eval("ISEVEN(0)"), .bool(true))
        XCTAssertEqual(eval("ISEVEN(\"6\")"), .bool(true), "chuỗi số ép được")
        XCTAssertEqual(eval("ISEVEN(\"x\")"), .error("#VALUE!"))
        XCTAssertEqual(eval("ISEVEN(TRUE)"), .error("#VALUE!"))
        XCTAssertEqual(eval("ISEVEN(1/0)"), .error("#DIV/0!"), "ISEVEN/ISODD lan truyền lỗi")
    }

    func testNTTypeErrorType() {
        let data: [(String, CellValue)] = [("A1", .number(7)), ("A2", .string("x")), ("A3", .bool(true)),
                                           ("A4", .error("#N/A")), ("B1", .number(1)), ("B2", .number(2))]
        XCTAssertEqual(eval("N(A1)", data: data), .number(7))
        XCTAssertEqual(eval("N(A2)", data: data), .number(0))
        XCTAssertEqual(eval("N(A3)", data: data), .number(1))
        XCTAssertEqual(eval("N(A9)", data: data), .number(0))
        XCTAssertEqual(eval("N(A4)", data: data), .error("#N/A"))
        XCTAssertEqual(eval("T(A2)", data: data), .string("x"))
        XCTAssertEqual(eval("T(A1)", data: data), .string(""))
        XCTAssertEqual(eval("T(A3)", data: data), .string(""))
        XCTAssertEqual(eval("T(A4)", data: data), .error("#N/A"))
        XCTAssertEqual(eval("TYPE(A1)", data: data), .number(1))
        XCTAssertEqual(eval("TYPE(A2)", data: data), .number(2))
        XCTAssertEqual(eval("TYPE(A3)", data: data), .number(4))
        XCTAssertEqual(eval("TYPE(A4)", data: data), .number(16))
        XCTAssertEqual(eval("TYPE(B1:B2)", data: data), .number(64))
        XCTAssertEqual(eval("TYPE(A9)", data: data), .number(1), "ô trống tính là số")
        let codes: [(String, Double)] = [("#NULL!", 1), ("#DIV/0!", 2), ("#VALUE!", 3), ("#REF!", 4), ("#NAME?", 5),
                                         ("#NUM!", 6), ("#N/A", 7)]
        for (err, code) in codes {
            XCTAssertEqual(eval("ERROR.TYPE(A1)", data: [("A1", .error(err))]), .number(code), err)
        }
        XCTAssertEqual(eval("ERROR.TYPE(5)"), .error("#N/A"), "không phải lỗi → #N/A")
        XCTAssertEqual(eval("ERROR.TYPE(1/0)"), .number(2))
    }

    func testXor() {
        XCTAssertEqual(eval("XOR(TRUE,TRUE)"), .bool(false))
        XCTAssertEqual(eval("XOR(TRUE,FALSE)"), .bool(true))
        XCTAssertEqual(eval("XOR(TRUE,FALSE,TRUE)"), .bool(false))
        XCTAssertEqual(eval("XOR(TRUE,TRUE,TRUE)"), .bool(true))
        XCTAssertEqual(eval("XOR(1,0)"), .bool(true), "số khác 0 tính là TRUE")
        XCTAssertEqual(eval("XOR(A1:A3)", data: [("A1", .bool(true)), ("A2", .string("x")), ("A3", .bool(true))]), .bool(false),
                       "chữ trong vùng bị bỏ qua")
        XCTAssertEqual(eval("XOR(A1:A2)", data: [("A1", .string("x")), ("A2", .string("y"))]), .error("#VALUE!"),
                       "không có giá trị logic/số nào")
        XCTAssertEqual(eval("XOR(\"a\")"), .error("#VALUE!"))
        XCTAssertEqual(eval("XOR(TRUE,1/0)"), .error("#DIV/0!"))
        XCTAssertEqual(eval("_xlfn.XOR(TRUE,FALSE)"), .bool(true), "dạng có tiền tố trong tệp")
    }
}
