import XCTest
@testable import OOXMLSpreadsheet

final class FormulaFunctionsSlice2Tests: XCTestCase {
    func n(_ d: Double) -> CellValue { .number(d) }
    func s(_ x: String) -> CellValue { .string(x) }
    func err(_ e: String) -> CellValue { .error(e) }

    /// Tính một công thức tại Sheet1!Z99; `fixedNow` cố định đồng hồ (UTC).
    func calc(_ formula: String, _ cells: [String: CellValue] = [:], now: Date? = nil) -> CellValue {
        let e = FormulaEngine()
        e.addSheet("Sheet1")
        e.timeZone = TimeZone(secondsFromGMT: 0)!
        if let now = now { e.clock = { now } }
        for (k, v) in cells { e.setValue(v, sheet: "Sheet1", at: k) }
        e.setFormula(formula, sheet: "Sheet1", at: "Z99")
        e.recalculate()
        return e.value(sheet: "Sheet1", at: "Z99")
    }

    /// So sánh kết quả số với sai số cho phép (cho YEARFRAC và các giá trị thập phân lặp).
    func numNear(_ formula: String, _ expected: Double, accuracy: Double = 1e-12, _ message: String = "") {
        let v = calc(formula)
        if case .number(let d) = v {
            XCTAssertEqual(d, expected, accuracy: accuracy, message)
        } else {
            XCTFail("\(formula) phải là số, nhận \(v)")
        }
    }

    /// Như numNear nhưng có bảng ô riêng.
    func numNear(_ formula: String, _ expected: Double, accuracy: Double = 1e-12, cells: [String: CellValue], _ message: String = "") {
        let v = calc(formula, cells)
        if case .number(let d) = v {
            XCTAssertEqual(d, expected, accuracy: accuracy, message)
        } else {
            XCTFail("\(formula) phải là số, nhận \(v)")
        }
    }

    /// Bảng dữ liệu dùng chung cho tra cứu/điều kiện.
    var data: [String: CellValue] {
        [
            "A1": n(10), "A2": n(20), "A3": n(30), "A4": n(40),
            "B1": s("x"), "B2": s("y"), "B3": s("z"), "B4": s("w"),
            "C1": n(1.5), "C2": n(2.5), "C3": n(3.5), "C4": n(4.5),
            "D1": s("Apple"), "D2": s("Banana"), "D3": s("Cherry"),
            "F1": n(1), "G1": n(2), "H1": n(3), "F2": s("p"), "G2": s("q"), "H2": s("r"),
            "J1": n(30), "J2": n(20), "J3": n(10),
            "M1": n(5), "M2": n(10), "M3": n(15), "M4": s("apple"), "M5": s("Apricot"), "M6": n(20),
            "N1": n(1), "N2": n(2), "N3": n(3), "N4": n(4), "N5": n(5), "N6": n(6),
            "P1": n(1), "P2": err("#N/A"), "P3": n(3),
            "Q1": n(1), "R1": s(">12"),
        ]
    }

    // MARK: Tra cứu

    func testVlookupHlookup() {
        XCTAssertEqual(calc("VLOOKUP(20,A1:C4,2,FALSE)", data), s("y"))
        XCTAssertEqual(calc("VLOOKUP(25,A1:C4,3)", data), n(2.5), "xấp xỉ: lớn nhất ≤ khóa")
        XCTAssertEqual(calc("VLOOKUP(50,A1:C4,2)", data), s("w"))
        XCTAssertEqual(calc("VLOOKUP(40,A1:C4,3,TRUE)", data), n(4.5))
        XCTAssertEqual(calc("VLOOKUP(\"ban*\",D1:D3,1,FALSE)", data), s("Banana"), "ký tự đại diện")
        XCTAssertEqual(calc("VLOOKUP(\"CHERRY\",D1:D3,1,FALSE)", data), s("Cherry"), "không phân biệt hoa thường")
        XCTAssertEqual(calc("HLOOKUP(2,F1:H2,2,FALSE)", data), s("q"))
        XCTAssertEqual(calc("HLOOKUP(2.5,F1:H2,2)", data), s("q"))
        XCTAssertEqual(calc("VLOOKUP(20,A1:C4,2,FALSE)&\"!\"", data), s("y!"))
        XCTAssertEqual(calc("VLOOKUP(10,A1:E4,5,FALSE)", data), n(0), "ô kết quả rỗng → 0")
    }

    func testVlookupHlookupErrors() {
        XCTAssertEqual(calc("VLOOKUP(25,A1:C4,3,FALSE)", data), err("#N/A"))
        XCTAssertEqual(calc("VLOOKUP(5,A1:C4,2)", data), err("#N/A"), "nhỏ hơn mọi giá trị")
        XCTAssertEqual(calc("VLOOKUP(\"q\",A1:C4,2,FALSE)", data), err("#N/A"), "khác kiểu")
        XCTAssertEqual(calc("VLOOKUP(20,A1:C4,4,FALSE)", data), err("#REF!"))
        XCTAssertEqual(calc("VLOOKUP(20,A1:C4,0,FALSE)", data), err("#VALUE!"))
        XCTAssertEqual(calc("VLOOKUP(20,A1:C4)", data), err("#VALUE!"))
        XCTAssertEqual(calc("VLOOKUP(#DIV/0!,A1:C4,2)", data), err("#DIV/0!"))
        XCTAssertEqual(calc("VLOOKUP(20,A1:C4,2,\"abc\")", data), err("#VALUE!"))
        XCTAssertEqual(calc("HLOOKUP(2,F1:H2,3,FALSE)", data), err("#REF!"))
        XCTAssertEqual(calc("HLOOKUP(9,F1:H2,2,FALSE)", data), err("#N/A"))
        XCTAssertEqual(calc("VLOOKUP(20,Hoang!A1:C4,2)", data), err("#REF!"), "sheet không tồn tại")
        XCTAssertEqual(calc("1+VLOOKUP(25,A1:C4,3,FALSE)", data), err("#N/A"), "lỗi lan qua toán tử")
    }

    func testMatch() {
        XCTAssertEqual(calc("MATCH(30,A1:A4,0)", data), n(3))
        XCTAssertEqual(calc("MATCH(35,A1:A4,1)", data), n(3))
        XCTAssertEqual(calc("MATCH(35,A1:A4)", data), n(3))
        XCTAssertEqual(calc("MATCH(40,A1:A4,1)", data), n(4))
        XCTAssertEqual(calc("MATCH(25,J1:J3,-1)", data), n(1), "giảm dần: nhỏ nhất ≥ khóa")
        XCTAssertEqual(calc("MATCH(2,F1:H1,0)", data), n(2), "vector ngang")
        XCTAssertEqual(calc("MATCH(\"b*\",D1:D3,0)", data), n(2))
        XCTAssertEqual(calc("MATCH(\"cherry\",D1:D3,0)", data), n(3))
        XCTAssertEqual(calc("MATCH(5,A1:A4,1)", data), err("#N/A"))
        XCTAssertEqual(calc("MATCH(35,A1:A4,0)", data), err("#N/A"))
        XCTAssertEqual(calc("MATCH(10,A1:C4,0)", data), err("#N/A"), "vùng 2 chiều")
        XCTAssertEqual(calc("MATCH(\"x\",A1:A4,0)", data), err("#N/A"), "khác kiểu")
        XCTAssertEqual(calc("MATCH(10)", data), err("#VALUE!"))
        XCTAssertEqual(calc("MATCH(#REF!,A1:A4,0)", data), err("#REF!"))
    }

    func testIndexAndChoose() {
        XCTAssertEqual(calc("INDEX(A1:C4,2,3)", data), n(2.5))
        XCTAssertEqual(calc("INDEX(A1:A4,3)", data), n(30))
        XCTAssertEqual(calc("INDEX(F1:H1,2)", data), n(2))
        XCTAssertEqual(calc("SUM(INDEX(A1:C4,0,1))", data), n(100), "cả cột")
        XCTAssertEqual(calc("SUM(INDEX(A1:C4,2,0))", data), n(22.5), "cả hàng (chữ bị bỏ qua)")
        XCTAssertEqual(calc("INDEX(A1:C4,MATCH(30,A1:A4,0),2)", data), s("z"))
        XCTAssertEqual(calc("INDEX(A1:C4,5,1)", data), err("#REF!"))
        XCTAssertEqual(calc("INDEX(A1:C4,1,4)", data), err("#REF!"))
        XCTAssertEqual(calc("INDEX(A1:C4,-1,1)", data), err("#VALUE!"))
        XCTAssertEqual(calc("INDEX(A1:C4,0,1)", data), err("#VALUE!"), "vùng nhiều ô ở ngữ cảnh đơn")
        XCTAssertEqual(calc("INDEX(A1:C4,2)", data), err("#VALUE!"), "mảng 2 chiều, 1 chỉ số → cả hàng")
        XCTAssertEqual(calc("INDEX(A1:A4)", data), err("#VALUE!"))
        XCTAssertEqual(calc("INDEX(#N/A,1,1)", data), err("#N/A"))
        XCTAssertEqual(calc("CHOOSE(2,\"a\",\"b\",\"c\")"), s("b"))
        XCTAssertEqual(calc("CHOOSE(2.9,\"a\",\"b\",\"c\")"), s("b"), "cắt phần thập phân")
        XCTAssertEqual(calc("CHOOSE(2,A1,A2)", data), n(20))
        XCTAssertEqual(calc("SUM(CHOOSE(1,A1:A4,B1:B2))", data), n(100), "trả tham chiếu")
        XCTAssertEqual(calc("CHOOSE(4,\"a\",\"b\",\"c\")"), err("#VALUE!"))
        XCTAssertEqual(calc("CHOOSE(0,\"a\")"), err("#VALUE!"))
        XCTAssertEqual(calc("CHOOSE(\"x\",1,2)"), err("#VALUE!"))
        XCTAssertEqual(calc("CHOOSE(#N/A,1,2)"), err("#N/A"))
        XCTAssertEqual(calc("CHOOSE(2,1,#DIV/0!)"), err("#DIV/0!"))
        XCTAssertEqual(calc("CHOOSE(1)"), err("#VALUE!"))
    }

    // MARK: Văn bản

    func testTextBasics() {
        XCTAssertEqual(calc("LEFT(\"Việt Nam\",4)"), s("Việt"))
        XCTAssertEqual(calc("LEFT(\"abc\")"), s("a"))
        XCTAssertEqual(calc("LEFT(\"abc\",10)"), s("abc"))
        XCTAssertEqual(calc("LEFT(\"abc\",0)"), s(""))
        XCTAssertEqual(calc("RIGHT(\"Việt Nam\",3)"), s("Nam"))
        XCTAssertEqual(calc("RIGHT(12345,2)"), s("45"))
        XCTAssertEqual(calc("MID(\"hello\",2,3)"), s("ell"))
        XCTAssertEqual(calc("MID(\"hello\",4,99)"), s("lo"))
        XCTAssertEqual(calc("MID(\"hello\",10,2)"), s(""))
        XCTAssertEqual(calc("LEN(\"Việt Nam\")"), n(8))
        XCTAssertEqual(calc("LEN(\"\")"), n(0))
        XCTAssertEqual(calc("LEN(12.5)"), n(4))
        XCTAssertEqual(calc("UPPER(\"aBc đ\")"), s("ABC Đ"))
        XCTAssertEqual(calc("LOWER(\"ABC Đ\")"), s("abc đ"))
        XCTAssertEqual(calc("TRIM(\"  a   b  \")"), s("a b"))
        XCTAssertEqual(calc("UPPER(A1)", data), s("10"))
    }

    func testTextVietnameseLocale() {
        // 45658 = 01/01/2025 (thứ tư).
        XCTAssertEqual(calc("TEXT(45658,\"[$-vi-VN]dd/mm/yyyy\")"), s("01/01/2025"), "ngày kiểu Việt")
        XCTAssertEqual(calc("TEXT(45658,\"[$-vi-VN]dddd\")"), s("thứ tư"), "tên thứ tiếng Việt")
        XCTAssertEqual(calc("TEXT(45658,\"[$-vi-VN]dd mmmm yyyy\")"), s("01 tháng 1 2025"), "tháng tiếng Việt")
        XCTAssertEqual(calc("TEXT(45658,\"[$-042A]dd/mm/yyyy\")"), s("01/01/2025"), "thẻ LCID 042A = vi")
        XCTAssertEqual(calc("TEXT(1234567.891,\"[$-vi-VN]#,##0.00\")"), s("1.234.567,89"), "nghìn chấm, thập phân phẩy")
        XCTAssertEqual(calc("TEXT(0.5,\"[$-vi-VN]0.0%\")"), s("50,0%"), "phần trăm kiểu Việt")
        XCTAssertEqual(calc("TEXT(1234.5,\"[$₫-vi-VN]#,##0\")"), s("₫1.235"), "ký hiệu tiền tệ trong thẻ locale")
        XCTAssertEqual(calc("TEXT(45658,\"mmmm\")"), s("January"), "không thẻ locale: giữ mặc định tiếng Anh")
        XCTAssertEqual(calc("TEXT(1234567.891,\"#,##0.00\")"), s("1,234,567.89"), "không thẻ locale: giữ ngăn cách Mỹ")
    }

    func testTextErrors() {
        XCTAssertEqual(calc("LEFT(\"abc\",-1)"), err("#VALUE!"))
        XCTAssertEqual(calc("RIGHT(\"abc\",-1)"), err("#VALUE!"))
        XCTAssertEqual(calc("MID(\"abc\",0,1)"), err("#VALUE!"))
        XCTAssertEqual(calc("MID(\"abc\",1,-1)"), err("#VALUE!"))
        XCTAssertEqual(calc("MID(\"abc\",1)"), err("#VALUE!"))
        XCTAssertEqual(calc("LEFT(\"abc\",\"x\")"), err("#VALUE!"))
        XCTAssertEqual(calc("LEN(#N/A)"), err("#N/A"))
        XCTAssertEqual(calc("LEFT(1/0,2)"), err("#DIV/0!"))
        XCTAssertEqual(calc("UPPER(#REF!)"), err("#REF!"))
        XCTAssertEqual(calc("TRIM(A1:A2)", data), err("#VALUE!"))
        XCTAssertEqual(calc("LEN()"), err("#VALUE!"))
    }

    func testFindSearchSubstituteReplace() {
        XCTAssertEqual(calc("FIND(\"b\",\"abcb\")"), n(2))
        XCTAssertEqual(calc("FIND(\"b\",\"abcb\",3)"), n(4))
        XCTAssertEqual(calc("FIND(\"\",\"abc\")"), n(1))
        XCTAssertEqual(calc("SEARCH(\"B\",\"abc\")"), n(2))
        XCTAssertEqual(calc("SEARCH(\"a*c\",\"xxabbc\")"), n(3))
        XCTAssertEqual(calc("SEARCH(\"?b\",\"xab\")"), n(2))
        XCTAssertEqual(calc("SEARCH(\"~*\",\"a*b\")"), n(2))
        XCTAssertEqual(calc("FIND(\"*\",\"a*b\")"), n(2), "FIND không dùng ký tự đại diện")
        XCTAssertEqual(calc("FIND(\"B\",\"abc\")"), err("#VALUE!"), "phân biệt hoa thường")
        XCTAssertEqual(calc("FIND(\"z\",\"abc\")"), err("#VALUE!"))
        XCTAssertEqual(calc("FIND(\"a\",\"abc\",0)"), err("#VALUE!"))
        XCTAssertEqual(calc("FIND(\"a\",\"abc\",9)"), err("#VALUE!"))
        XCTAssertEqual(calc("SEARCH(\"z\",\"abc\")"), err("#VALUE!"))
        XCTAssertEqual(calc("FIND(\"a\",#N/A)"), err("#N/A"))
        XCTAssertEqual(calc("SUBSTITUTE(\"a-b-c\",\"-\",\"+\")"), s("a+b+c"))
        XCTAssertEqual(calc("SUBSTITUTE(\"a-b-c\",\"-\",\"+\",2)"), s("a-b+c"))
        XCTAssertEqual(calc("SUBSTITUTE(\"a-b-c\",\"-\",\"+\",3)"), s("a-b-c"))
        XCTAssertEqual(calc("SUBSTITUTE(\"abc\",\"\",\"x\")"), s("abc"))
        XCTAssertEqual(calc("SUBSTITUTE(\"Abc\",\"a\",\"x\")"), s("Abc"), "phân biệt hoa thường")
        XCTAssertEqual(calc("SUBSTITUTE(\"a-b\",\"-\",\"+\",0)"), err("#VALUE!"))
        XCTAssertEqual(calc("SUBSTITUTE(#N/A,\"-\",\"+\")"), err("#N/A"))
        XCTAssertEqual(calc("REPLACE(\"abcdef\",2,3,\"XY\")"), s("aXYef"))
        XCTAssertEqual(calc("REPLACE(\"abc\",9,2,\"Z\")"), s("abcZ"))
        XCTAssertEqual(calc("REPLACE(\"abc\",1,0,\">\")"), s(">abc"))
        XCTAssertEqual(calc("REPLACE(\"abc\",0,1,\"Z\")"), err("#VALUE!"))
        XCTAssertEqual(calc("REPLACE(\"abc\",1,-1,\"Z\")"), err("#VALUE!"))
        XCTAssertEqual(calc("REPLACE(\"abc\",1,1)"), err("#VALUE!"))
    }

    func testTextFormatting() {
        XCTAssertEqual(calc("TEXT(1234.5,\"#,##0.00\")"), s("1,234.50"))
        XCTAssertEqual(calc("TEXT(1234567,\"#,##0\")"), s("1,234,567"))
        XCTAssertEqual(calc("TEXT(3.14159,\"0.00\")"), s("3.14"))
        XCTAssertEqual(calc("TEXT(2.675,\"0.00\")"), s("2.68"))
        XCTAssertEqual(calc("TEXT(5,\"000\")"), s("005"))
        XCTAssertEqual(calc("TEXT(0.256,\"0.0%\")"), s("25.6%"))
        XCTAssertEqual(calc("TEXT(0.5,\"0%\")"), s("50%"))
        XCTAssertEqual(calc("TEXT(0.5,\"#.00\")"), s(".50"))
        XCTAssertEqual(calc("TEXT(7,\"0.0#\")"), s("7.0"))
        XCTAssertEqual(calc("TEXT(2.5,\"0.0#\")"), s("2.5"))
        XCTAssertEqual(calc("TEXT(2.567,\"0.0#\")"), s("2.57"))
        XCTAssertEqual(calc("TEXT(-5,\"0\")"), s("-5"))
        XCTAssertEqual(calc("TEXT(1500,\"0 \"\"VND\"\"\")"), s("1500 VND"))
        XCTAssertEqual(calc("TEXT(-1234.5,\"#,##0.00;(#,##0.00)\")"), s("(1,234.50)"))
        XCTAssertEqual(calc("TEXT(0,\"0;-0;\"\"zero\"\"\")"), s("zero"))
        XCTAssertEqual(calc("TEXT(12,\"General\")"), s("12"))
        XCTAssertEqual(calc("TEXT(\"abc\",\"0\")"), s("abc"), "chuỗi không phải số giữ nguyên")
        XCTAssertEqual(calc("TEXT(\"12\",\"0.0\")"), s("12.0"), "chuỗi số được ép")
        XCTAssertEqual(calc("TEXT(45306,\"dd/mm/yyyy\")"), s("15/01/2024"))
        XCTAssertEqual(calc("TEXT(45306,\"yyyy-mm-dd\")"), s("2024-01-15"))
        XCTAssertEqual(calc("TEXT(45306,\"mmm d, yyyy\")"), s("Jan 15, 2024"))
        XCTAssertEqual(calc("TEXT(45306,\"mmmm\")"), s("January"))
        XCTAssertEqual(calc("TEXT(45306,\"dddd\")"), s("Monday"))
        XCTAssertEqual(calc("TEXT(45306,\"ddd\")"), s("Mon"))
        XCTAssertEqual(calc("TEXT(45306.75,\"hh:mm\")"), s("18:00"))
        XCTAssertEqual(calc("TEXT(45306.75,\"h:mm AM/PM\")"), s("6:00 PM"))
        XCTAssertEqual(calc("TEXT(45306.5,\"dd/mm/yyyy hh:mm:ss\")"), s("15/01/2024 12:00:00"))
        XCTAssertEqual(calc("TEXT(60,\"dd/mm/yyyy\")"), s("29/02/1900"), "bug năm nhuận 1900")
        XCTAssertEqual(calc("TEXT(1,\"1E+0\")"), err("#VALUE!"), "ký hiệu khoa học chưa hỗ trợ")
        XCTAssertEqual(calc("TEXT(-1,\"dd/mm/yyyy\")"), err("#VALUE!"))
        XCTAssertEqual(calc("TEXT(#N/A,\"0\")"), err("#N/A"))
        XCTAssertEqual(calc("TEXT(1)"), err("#VALUE!"))
    }

    func testValueConcatTextjoin() {
        XCTAssertEqual(calc("VALUE(\"1,234.5\")"), n(1234.5))
        XCTAssertEqual(calc("VALUE(\"12%\")"), n(0.12))
        XCTAssertEqual(calc("VALUE(\" 42 \")"), n(42))
        XCTAssertEqual(calc("VALUE(\"-3.5\")"), n(-3.5))
        XCTAssertEqual(calc("VALUE(\"2024-01-15\")"), n(45306))
        XCTAssertEqual(calc("VALUE(\"12:00\")"), n(0.5))
        XCTAssertEqual(calc("VALUE(7)"), n(7))
        XCTAssertEqual(calc("VALUE(\"abc\")"), err("#VALUE!"))
        XCTAssertEqual(calc("VALUE(\"\")"), err("#VALUE!"))
        XCTAssertEqual(calc("VALUE(\"1,23\")"), err("#VALUE!"))
        XCTAssertEqual(calc("VALUE(\"0x10\")"), err("#VALUE!"))
        XCTAssertEqual(calc("VALUE(\"inf\")"), err("#VALUE!"))
        XCTAssertEqual(calc("VALUE(TRUE)"), err("#VALUE!"))
        XCTAssertEqual(calc("VALUE(#N/A)"), err("#N/A"))
        XCTAssertEqual(calc("CONCAT(\"a\",A1:A2,TRUE)", data), s("a1020TRUE"))
        XCTAssertEqual(calc("CONCAT(B1:B4)", data), s("xyzw"))
        XCTAssertEqual(calc("CONCAT(\"a\",Q1:Q3)", data), s("a1"), "ô rỗng = chuỗi rỗng")
        XCTAssertEqual(calc("CONCAT()"), err("#VALUE!"))
        XCTAssertEqual(calc("CONCAT(\"a\",P1:P3)", data), err("#N/A"))
        XCTAssertEqual(calc("TEXTJOIN(\",\",TRUE,Q1:Q3,\"z\")", data), s("1,z"))
        XCTAssertEqual(calc("TEXTJOIN(\"-\",FALSE,Q1:Q3)", data), s("1--"))
        XCTAssertEqual(calc("TEXTJOIN(\"-\",TRUE,B1:B3)", data), s("x-y-z"))
        XCTAssertEqual(calc("TEXTJOIN(\"-\",TRUE,\"a\",\"\",\"b\")"), s("a-b"))
        XCTAssertEqual(calc("TEXTJOIN(\",\",TRUE,P1:P3)", data), err("#N/A"))
        XCTAssertEqual(calc("TEXTJOIN(\",\",\"x\",1)"), err("#VALUE!"))
        XCTAssertEqual(calc("TEXTJOIN(\",\",TRUE)"), err("#VALUE!"))
    }

    // MARK: M7 lát 44 — CLEAN/PROPER/REPT/T/CODE/CHAR/UNICODE/UNICHAR/NUMBERVALUE

    func testTextCleanProperReptT() {
        XCTAssertEqual(calc("CLEAN(\"a\u{0001}b\u{0007}c\")"), s("abc"))
        XCTAssertEqual(calc("CLEAN(\"a\u{007F}b\")"), s("a\u{007F}b"), "127 không phải ký tự điều khiển 0–31")
        XCTAssertEqual(calc("CLEAN(123)"), s("123"))
        XCTAssertEqual(calc("CLEAN(\"\")"), s(""))
        XCTAssertEqual(calc("CLEAN(\"a\",\"b\")"), err("#VALUE!"))
        XCTAssertEqual(calc("PROPER(\"hello world\")"), s("Hello World"))
        XCTAssertEqual(calc("PROPER(\"don't stop\")"), s("Don'T Stop"), "Excel: dấu ' là ranh giới từ")
        XCTAssertEqual(calc("PROPER(\"HELLO-WORLD\")"), s("Hello-World"))
        XCTAssertEqual(calc("PROPER(\"abc123def\")"), s("Abc123Def"))
        XCTAssertEqual(calc("PROPER(123)"), s("123"))
        XCTAssertEqual(calc("REPT(\"ab\",3)"), s("ababab"))
        XCTAssertEqual(calc("REPT(\"x\",0)"), s(""))
        XCTAssertEqual(calc("REPT(\"\",5)"), s(""))
        XCTAssertEqual(calc("REPT(\"ab\",2.9)"), s("abab"), "cắt về nguyên")
        XCTAssertEqual(calc("REPT(\"a\",-1)"), err("#VALUE!"))
        XCTAssertEqual(calc("REPT(\"ab\",20000)"), err("#VALUE!"), "kết quả 40.000 > 32.767 ký tự")
        XCTAssertEqual(calc("REPT(\"a\",32767)"), s(String(repeating: "a", count: 32767)))
        XCTAssertEqual(calc("REPT(\"a\",32768)"), err("#VALUE!"))
        XCTAssertEqual(calc("T(\"abc\")"), s("abc"))
        XCTAssertEqual(calc("T(123)"), s(""))
        XCTAssertEqual(calc("T(TRUE)"), s(""))
        XCTAssertEqual(calc("T(\"\")"), s(""))
        XCTAssertEqual(calc("T(1/0)"), err("#DIV/0!"), "lỗi lan truyền")
    }

    func testCodeCharUnicodeUnichar() {
        XCTAssertEqual(calc("CODE(\"A\")"), n(65))
        XCTAssertEqual(calc("CODE(\"abc\")"), n(97), "chỉ ký tự đầu")
        XCTAssertEqual(calc("CODE(\"\")"), err("#VALUE!"))
        XCTAssertEqual(calc("CODE(\"€\")"), n(128), "Windows-1252")
        XCTAssertEqual(calc("CODE(\"ñ\")"), n(241))
        XCTAssertEqual(calc("CODE(65)"), n(54), "ép thành \"65\" rồi lấy '6'")
        XCTAssertEqual(calc("CHAR(65)"), s("A"))
        XCTAssertEqual(calc("CHAR(97)"), s("a"))
        XCTAssertEqual(calc("CHAR(10)"), s("\n"))
        XCTAssertEqual(calc("CHAR(128)"), s("€"))
        XCTAssertEqual(calc("CHAR(65.9)"), s("A"), "cắt về nguyên")
        XCTAssertEqual(calc("CHAR(0)"), err("#VALUE!"))
        XCTAssertEqual(calc("CHAR(256)"), err("#VALUE!"))
        XCTAssertEqual(calc("UNICODE(\"A\")"), n(65))
        XCTAssertEqual(calc("UNICODE(\"€\")"), n(8364))
        XCTAssertEqual(calc("UNICODE(\"😀\")"), n(128512))
        XCTAssertEqual(calc("UNICODE(\"\")"), err("#VALUE!"))
        XCTAssertEqual(calc("UNICHAR(65)"), s("A"))
        XCTAssertEqual(calc("UNICHAR(8364)"), s("€"))
        XCTAssertEqual(calc("UNICHAR(128512)"), s("😀"))
        XCTAssertEqual(calc("UNICHAR(65.9)"), s("A"))
        XCTAssertEqual(calc("UNICHAR(0)"), err("#VALUE!"))
        XCTAssertEqual(calc("UNICHAR(55296)"), err("#VALUE!"), "surrogate cao D800")
        XCTAssertEqual(calc("UNICHAR(1114112)"), err("#VALUE!"), "vượt 10FFFF")
    }

    func testNumberValue() {
        XCTAssertEqual(calc("NUMBERVALUE(\"1234.5\")"), n(1234.5))
        XCTAssertEqual(calc("NUMBERVALUE(\"1,234.5\")"), n(1234.5))
        XCTAssertEqual(calc("NUMBERVALUE(\"1.234,5\",\",\",\".\")"), n(1234.5))
        XCTAssertEqual(calc("NUMBERVALUE(\"12%\")"), n(0.12))
        XCTAssertEqual(calc("NUMBERVALUE(\"\")"), n(0))
        XCTAssertEqual(calc("NUMBERVALUE(\" 42 \")"), n(42))
        XCTAssertEqual(calc("NUMBERVALUE(\"-1,234.5\")"), n(-1234.5))
        XCTAssertEqual(calc("NUMBERVALUE(123)"), n(123))
        XCTAssertEqual(calc("NUMBERVALUE(\"abc\")"), err("#VALUE!"))
        XCTAssertEqual(calc("NUMBERVALUE(\"1,234.5\",\",\",\",\")"), err("#VALUE!"), "hai dấu trùng nhau")
        XCTAssertEqual(calc("NUMBERVALUE(\"1,234.5\",\"..\",\",\")"), err("#VALUE!"), "dấu phải 1 ký tự")
        XCTAssertEqual(calc("NUMBERVALUE(\"1.234.5\")"), err("#VALUE!"))
    }

    // MARK: Ngày giờ

    func testDateSerialsAnd1900Bug() {
        XCTAssertEqual(calc("DATE(1900,1,1)"), n(1))
        XCTAssertEqual(calc("DATE(1900,2,28)"), n(59))
        XCTAssertEqual(calc("DATE(1900,2,29)"), n(60), "29/02/1900 không có thật nhưng Excel chấp nhận")
        XCTAssertEqual(calc("DATE(1900,3,1)"), n(61))
        XCTAssertEqual(calc("DATE(1970,1,1)"), n(25569))
        XCTAssertEqual(calc("DATE(2000,1,1)"), n(36526))
        XCTAssertEqual(calc("DATE(2024,1,15)"), n(45306))
        XCTAssertEqual(calc("DATE(2024,14,1)"), n(45689), "tháng tràn sang năm sau")
        XCTAssertEqual(calc("DATE(2024,1,0)"), n(45291))
        XCTAssertEqual(calc("DATE(2024,3,0)"), n(45351), "29/02/2024")
        XCTAssertEqual(calc("DATE(2024,0,1)"), n(45261), "tháng 0 = tháng 12 năm trước")
        XCTAssertEqual(calc("DATE(99,1,1)"), n(36161), "năm 0–1899 cộng 1900")
        XCTAssertEqual(calc("DATE(1900,1,0)"), n(0))
        XCTAssertEqual(calc("DATE(1900,3,0)"), n(60))
        XCTAssertEqual(calc("DATE(2024,1,1)+30"), n(45322))
        XCTAssertEqual(calc("DATE(10000,1,1)"), err("#NUM!"))
        XCTAssertEqual(calc("DATE(-1,1,1)"), err("#NUM!"))
        XCTAssertEqual(calc("DATE(\"x\",1,1)"), err("#VALUE!"))
        XCTAssertEqual(calc("DATE(2024,1)"), err("#VALUE!"))
        XCTAssertEqual(calc("DATE(2024,#N/A,1)"), err("#N/A"))
    }

    func testYearMonthDay() {
        XCTAssertEqual(calc("YEAR(45306)"), n(2024))
        XCTAssertEqual(calc("MONTH(45306)"), n(1))
        XCTAssertEqual(calc("DAY(45306)"), n(15))
        XCTAssertEqual(calc("YEAR(45306.99)"), n(2024), "bỏ phần giờ")
        XCTAssertEqual(calc("YEAR(60)"), n(1900))
        XCTAssertEqual(calc("MONTH(60)"), n(2))
        XCTAssertEqual(calc("DAY(60)"), n(29))
        XCTAssertEqual(calc("DAY(59)"), n(28))
        XCTAssertEqual(calc("DAY(61)"), n(1))
        XCTAssertEqual(calc("MONTH(61)"), n(3))
        XCTAssertEqual(calc("YEAR(0)"), n(1900))
        XCTAssertEqual(calc("DAY(0)"), n(0))
        XCTAssertEqual(calc("YEAR(1)"), n(1900))
        XCTAssertEqual(calc("YEAR(\"2024-01-15\")"), n(2024))
        XCTAssertEqual(calc("MONTH(\"2024/03/09\")"), n(3))
        XCTAssertEqual(calc("DAY(A1)", ["A1": .number(45306)]), n(15))
        XCTAssertEqual(calc("YEAR(-1)"), err("#NUM!"))
        XCTAssertEqual(calc("YEAR(3000000)"), err("#NUM!"))
        XCTAssertEqual(calc("YEAR(\"abc\")"), err("#VALUE!"))
        XCTAssertEqual(calc("MONTH(#N/A)"), err("#N/A"))
        XCTAssertEqual(calc("DAY()"), err("#VALUE!"))
    }

    func testTodayNow() {
        let t = Date(timeIntervalSince1970: 1_700_000_000) // 2023-11-14 22:13:20 UTC
        XCTAssertEqual(calc("TODAY()", now: t), n(45244))
        if case .number(let d) = calc("NOW()", now: t) {
            XCTAssertEqual(d, 45244 + 80000.0 / 86400.0, accuracy: 1e-9)
        } else { XCTFail("NOW phải là số") }
        XCTAssertEqual(calc("TEXT(TODAY(),\"yyyy-mm-dd\")", now: t), s("2023-11-14"))
        XCTAssertEqual(calc("YEAR(NOW())", now: t), n(2023))
        XCTAssertEqual(calc("TODAY(1)"), err("#VALUE!"))
        XCTAssertEqual(calc("NOW(1)"), err("#VALUE!"))
        // Múi giờ +7 đẩy sang 15/11.
        let e = FormulaEngine(); e.addSheet("S")
        e.timeZone = TimeZone(secondsFromGMT: 7 * 3600)!; e.clock = { t }
        e.setFormula("TODAY()", sheet: "S", at: "A1"); e.recalculate()
        XCTAssertEqual(e.value(sheet: "S", at: "A1"), n(45245))
    }

    func testEdateEomonthDatedif() {
        XCTAssertEqual(calc("EDATE(DATE(2024,1,31),1)"), n(45351), "kẹp về cuối tháng: 29/02/2024")
        XCTAssertEqual(calc("EDATE(45306,-1)"), n(45275))
        XCTAssertEqual(calc("EDATE(45351,12)"), n(45716), "29/02/2024 + 12 tháng = 28/02/2025")
        XCTAssertEqual(calc("EDATE(45306,0)"), n(45306))
        XCTAssertEqual(calc("EDATE(\"2024-01-15\",1)"), n(45337))
        XCTAssertEqual(calc("EOMONTH(45306,0)"), n(45322))
        XCTAssertEqual(calc("EOMONTH(45306,1)"), n(45351))
        XCTAssertEqual(calc("EOMONTH(45306,-1)"), n(45291))
        XCTAssertEqual(calc("EOMONTH(45306,-13)"), n(44926), "tháng 12/2022 → 31/12/2022")
    }

    func testEdateErrors() {
        XCTAssertEqual(calc("EDATE(-1,1)"), err("#NUM!"))
        XCTAssertEqual(calc("EDATE(DATE(1900,3,1),-5)"), err("#NUM!"), "trước 1900")
        XCTAssertEqual(calc("EDATE(\"abc\",1)"), err("#VALUE!"))
        XCTAssertEqual(calc("EDATE(45306,\"x\")"), err("#VALUE!"))
        XCTAssertEqual(calc("EDATE(45306)"), err("#VALUE!"))
        XCTAssertEqual(calc("EOMONTH(#N/A,1)"), err("#N/A"))
        XCTAssertEqual(calc("EOMONTH(0,1)"), err("#NUM!"), "serial 0 không phải ngày hợp lệ")
    }

    func testDatedif() {
        let s0 = "DATE(2020,1,15)", e0 = "DATE(2024,3,10)"
        XCTAssertEqual(calc("DATEDIF(\(s0),\(e0),\"Y\")"), n(4))
        XCTAssertEqual(calc("DATEDIF(\(s0),\(e0),\"M\")"), n(49))
        XCTAssertEqual(calc("DATEDIF(\(s0),\(e0),\"D\")"), n(1516))
        XCTAssertEqual(calc("DATEDIF(\(s0),\(e0),\"YM\")"), n(1))
        XCTAssertEqual(calc("DATEDIF(\(s0),\(e0),\"MD\")"), n(24))
        XCTAssertEqual(calc("DATEDIF(\(s0),\(e0),\"YD\")"), n(55))
        XCTAssertEqual(calc("DATEDIF(\(s0),\(e0),\"y\")"), n(4), "đơn vị không phân biệt hoa thường")
        XCTAssertEqual(calc("DATEDIF(DATE(2024,1,15),DATE(2024,1,15),\"D\")"), n(0))
        XCTAssertEqual(calc("DATEDIF(DATE(2023,12,31),DATE(2024,1,1),\"M\")"), n(0))
        XCTAssertEqual(calc("DATEDIF(DATE(2000,2,29),DATE(2001,2,28),\"Y\")"), n(0))
        XCTAssertEqual(calc("DATEDIF(DATE(2000,2,29),DATE(2004,2,29),\"Y\")"), n(4))
        XCTAssertEqual(calc("DATEDIF(\(e0),\(s0),\"D\")"), err("#NUM!"), "bắt đầu sau kết thúc")
        XCTAssertEqual(calc("DATEDIF(\(s0),\(e0),\"X\")"), err("#NUM!"))
        XCTAssertEqual(calc("DATEDIF(\(s0),\(e0))"), err("#VALUE!"))
        XCTAssertEqual(calc("DATEDIF(\"abc\",\(e0),\"D\")"), err("#VALUE!"))
        XCTAssertEqual(calc("DATEDIF(#N/A,\(e0),\"D\")"), err("#N/A"))
    }

    // MARK: Ngày giờ còn lại (M7 lát 48)

    func testTimeHourMinuteSecond() {
        XCTAssertEqual(calc("TIME(12,0,0)"), n(0.5))
        XCTAssertEqual(calc("TIME(0,0,0)"), n(0))
        XCTAssertEqual(calc("TIME(23,59,59)"), n(86399.0 / 86400.0))
        XCTAssertEqual(calc("TIME(25,0,0)"), n(3600.0 / 86400.0), "25 giờ cuộn sang 1:00")
        XCTAssertEqual(calc("TIME(0,90,0)"), n(5400.0 / 86400.0), "90 phút = 1:30")
        XCTAssertEqual(calc("TIME(1.9,0,0)"), n(3600.0 / 86400.0), "cắt về nguyên")
        XCTAssertEqual(calc("TIME(32767,32767,32767)"), n(36787.0 / 86400.0), "cuộn: 10:13:07")
        XCTAssertEqual(calc("TIME(-1,0,0)"), err("#NUM!"))
        XCTAssertEqual(calc("TIME(32768,0,0)"), err("#NUM!"))
        XCTAssertEqual(calc("TIME(12,0)"), err("#VALUE!"))
        XCTAssertEqual(calc("TIME(\"x\",0,0)"), err("#VALUE!"))
        XCTAssertEqual(calc("TIME(#N/A,0,0)"), err("#N/A"))
        XCTAssertEqual(calc("HOUR(TIME(18,30,15))"), n(18))
        XCTAssertEqual(calc("MINUTE(TIME(18,30,15))"), n(30))
        XCTAssertEqual(calc("SECOND(TIME(18,30,15))"), n(15))
        XCTAssertEqual(calc("HOUR(45306.5)"), n(12))
        XCTAssertEqual(calc("MINUTE(45306.5)"), n(0))
        XCTAssertEqual(calc("SECOND(45306.5)"), n(0))
        XCTAssertEqual(calc("HOUR(DATE(2024,1,15)+TIME(23,59,59))"), n(23))
        XCTAssertEqual(calc("MINUTE(DATE(2024,1,15)+TIME(23,59,59))"), n(59))
        XCTAssertEqual(calc("SECOND(DATE(2024,1,15)+TIME(23,59,59))"), n(59), "bù sai số nhị phân của serial")
        XCTAssertEqual(calc("SECOND(0.999988425925926)"), n(59), "literal 23:59:59")
        XCTAssertEqual(calc("HOUR(\"13:30\")"), n(13))
        XCTAssertEqual(calc("MINUTE(\"13:30\")"), n(30))
        XCTAssertEqual(calc("SECOND(\"13:30:45\")"), n(45))
        XCTAssertEqual(calc("HOUR(\"25:00\")"), n(1), "25:00 cuộn về 1:00")
        XCTAssertEqual(calc("HOUR(0)"), n(0))
        XCTAssertEqual(calc("HOUR(TRUE)"), n(0), "TRUE → serial 1 → 0:00")
        XCTAssertEqual(calc("HOUR(0.75)"), n(18))
        XCTAssertEqual(calc("MINUTE(0.75)"), n(0))
        XCTAssertEqual(calc("HOUR(-1)"), err("#NUM!"))
        XCTAssertEqual(calc("HOUR(\"abc\")"), err("#VALUE!"))
        XCTAssertEqual(calc("HOUR(#REF!)"), err("#REF!"))
        XCTAssertEqual(calc("HOUR()"), err("#VALUE!"))
    }

    func testDateValueTimeValue() {
        // Golden Excel 2016 (tests/functions/golden-batch4-misc.json).
        XCTAssertEqual(calc("DATEVALUE(\"1/2/2024\")"), n(45323), "d/m/yyyy")
        XCTAssertEqual(calc("DATEVALUE(\"2024-03-05\")"), n(45356))
        XCTAssertEqual(calc("DATEVALUE(\"5 March 2024\")"), n(45356))
        XCTAssertEqual(calc("DATEVALUE(\"March 5, 2024\")"), n(45356))
        XCTAssertEqual(calc("DATEVALUE(\"31/12/2023\")"), n(45291), "ngày 31 chỉ đọc được d/m")
        XCTAssertEqual(calc("DATEVALUE(\"12/31/2023\")"), n(45291), "dự phòng m/d khi tháng > 12")
        XCTAssertEqual(calc("DATEVALUE(\"2024-03-05 08:15\")"), n(45356), "bỏ phần giờ")
        XCTAssertEqual(calc("DATEVALUE(\"31/02/2024\")"), err("#VALUE!"))
        XCTAssertEqual(calc("DATEVALUE(\"abc\")"), err("#VALUE!"))
        XCTAssertEqual(calc("DATEVALUE(\"13:30\")"), err("#VALUE!"), "chỉ có giờ")
        XCTAssertEqual(calc("DATEVALUE(45356)"), err("#VALUE!"), "chỉ nhận chuỗi")
        XCTAssertEqual(calc("DATEVALUE()"), err("#VALUE!"))
        XCTAssertEqual(calc("TIMEVALUE(\"6:30 PM\")"), n(66600.0 / 86400.0))
        XCTAssertEqual(calc("TIMEVALUE(\"18:30:15\")"), n(66615.0 / 86400.0))
        XCTAssertEqual(calc("TIMEVALUE(\"12:00 AM\")"), n(0))
        XCTAssertEqual(calc("TIMEVALUE(\"2024-03-05 08:15\")"), n(0.34375), "bỏ phần ngày")
        XCTAssertEqual(calc("TIMEVALUE(\"25:00\")"), n(3600.0 / 86400.0), "25:00 cuộn về 1:00")
        XCTAssertEqual(calc("TIMEVALUE(\"48:30\")"), n(1800.0 / 86400.0), "48:30 cuộn về 0:30")
        XCTAssertEqual(calc("TIMEVALUE(\"10000:00\")"), err("#VALUE!"))
        XCTAssertEqual(calc("TIMEVALUE(\"23:59:60\")"), n(0), "giây 60 cuộn sang 0:00")
        XCTAssertEqual(calc("TIMEVALUE(\"abc\")"), err("#VALUE!"))
        XCTAssertEqual(calc("TIMEVALUE(0.5)"), err("#VALUE!"), "chỉ nhận chuỗi")
        XCTAssertEqual(calc("TIMEVALUE(\"12:30\")"), n(45000.0 / 86400.0))
        // Phân tích ngày mở rộng cũng sửa YEAR/VALUE cho cùng chuỗi.
        XCTAssertEqual(calc("VALUE(\"1/2/2024\")"), n(45323))
        XCTAssertEqual(calc("YEAR(\"1/2/2024\")"), n(2024))
        XCTAssertEqual(calc("YEAR(\"5 March 2024\")"), n(2024))
    }

    func testDays() {
        XCTAssertEqual(calc("DAYS(\"2024-03-10\",\"2024-01-15\")"), n(55))
        XCTAssertEqual(calc("DAYS(DATE(2024,1,15),DATE(2024,1,15))"), n(0))
        XCTAssertEqual(calc("DAYS(DATE(2024,1,15),DATE(2024,3,10))"), n(-55), "âm được")
        XCTAssertEqual(calc("DAYS(45307.9,45306.1)"), n(1), "cắt phần giờ từng đầu")
        XCTAssertEqual(calc("DAYS(\"abc\",\"2024-01-15\")"), err("#VALUE!"))
        XCTAssertEqual(calc("DAYS(45306)"), err("#VALUE!"))
        XCTAssertEqual(calc("DAYS(#N/A,45306)"), err("#N/A"))
    }

    func testDays360() {
        // Golden Excel 2016 (tests/functions/golden-batch4-misc.json).
        XCTAssertEqual(calc("DAYS360(DATE(2024,1,31),DATE(2024,3,1))"), n(31))
        XCTAssertEqual(calc("DAYS360(DATE(2024,1,31),DATE(2024,3,1),TRUE)"), n(31))
        XCTAssertEqual(calc("DAYS360(DATE(2024,2,29),DATE(2024,3,31))"), n(30))
        XCTAssertEqual(calc("DAYS360(DATE(2024,2,29),DATE(2024,3,31),TRUE)"), n(31))
        XCTAssertEqual(calc("DAYS360(DATE(2023,2,28),DATE(2023,12,31))"), n(300))
        XCTAssertEqual(calc("DAYS360(DATE(2024,5,31),DATE(2024,1,15))"), n(-135))
        XCTAssertEqual(calc("DAYS360(DATE(2024,1,1),DATE(2025,1,1))"), n(360))
        // Quy tắc tháng 2 của phương pháp Mỹ (Microsoft Learn 30/360 US).
        XCTAssertEqual(calc("DAYS360(DATE(2024,1,15),DATE(2024,2,29))"), n(46), "cuối tháng 2 & start < 30 → mùng 1 tháng sau")
        XCTAssertEqual(calc("DAYS360(DATE(2024,1,15),DATE(2024,2,29),TRUE)"), n(44), "châu Âu: không có quy tắc tháng 2")
        XCTAssertEqual(calc("DAYS360(DATE(2024,1,30),DATE(2024,2,29))"), n(29), "start = 30 → cuối tháng 2 giữ nguyên")
        XCTAssertEqual(calc("DAYS360(DATE(2024,1,31),DATE(2024,12,31))"), n(330))
        XCTAssertEqual(calc("DAYS360(DATE(2024,1,31),DATE(2024,12,31),TRUE)"), n(330))
        XCTAssertEqual(calc("DAYS360(DATE(2024,1,15),DATE(2024,2,29),2)"), err("#NUM!"))
        XCTAssertEqual(calc("DAYS360(DATE(2024,1,15),DATE(2024,2,29),\"x\")"), err("#VALUE!"))
        XCTAssertEqual(calc("DAYS360(\"abc\",DATE(2024,1,15))"), err("#VALUE!"))
        XCTAssertEqual(calc("DAYS360(DATE(2024,1,15))"), err("#VALUE!"))
    }

    func testYearfrac() {
        numNear("YEARFRAC(DATE(2024,1,15),DATE(2024,3,10),0)", 55.0 / 360.0)
        numNear("YEARFRAC(DATE(2024,1,15),DATE(2024,3,10),1)", 55.0 / 366.0, accuracy: 1e-12, "actual/actual, 2024 nhuận")
        numNear("YEARFRAC(DATE(2024,1,15),DATE(2024,3,10),2)", 55.0 / 360.0)
        numNear("YEARFRAC(DATE(2024,1,15),DATE(2024,3,10),3)", 55.0 / 365.0)
        numNear("YEARFRAC(DATE(2024,1,15),DATE(2024,3,10),4)", 55.0 / 360.0)
        numNear("YEARFRAC(DATE(2024,1,15),DATE(2024,3,10))", 55.0 / 360.0, accuracy: 1e-12, "mặc định basis 0")
        numNear("YEARFRAC(DATE(2024,1,1),DATE(2025,1,1))", 1.0)
        numNear("YEARFRAC(DATE(2023,6,1),DATE(2025,6,1),1)", 2.0, accuracy: 1e-12, "qua 2 năm, có năm nhuận")
        numNear("YEARFRAC(DATE(2024,2,28),DATE(2024,3,1),1)", 2.0 / 366.0)
        numNear("YEARFRAC(DATE(2023,2,28),DATE(2023,3,1),1)", 1.0 / 365.0)
        numNear("YEARFRAC(DATE(2024,3,10),DATE(2024,1,15),1)", -55.0 / 366.0, accuracy: 1e-12, "đảo ngày → âm")
        numNear("YEARFRAC(DATE(9999,12,30),DATE(9999,12,31),1)", 1.0 / 365.0, accuracy: 1e-12, "sát serial tối đa")
        XCTAssertEqual(calc("YEARFRAC(DATE(2024,1,15),DATE(2024,3,10),5)"), err("#NUM!"))
        XCTAssertEqual(calc("YEARFRAC(DATE(2024,1,15),DATE(2024,3,10),1.5)"), err("#NUM!"))
        XCTAssertEqual(calc("YEARFRAC(DATE(2024,1,15),DATE(2024,3,10),\"x\")"), err("#VALUE!"))
        XCTAssertEqual(calc("YEARFRAC(DATE(2024,1,15))"), err("#VALUE!"))
    }

    func testIsoWeeknum() {
        // Golden Excel 2016 (tests/functions/golden-batch4-misc.json).
        XCTAssertEqual(calc("ISOWEEKNUM(DATE(2024,12,30))"), n(1))
        XCTAssertEqual(calc("ISOWEEKNUM(DATE(2024,1,1))"), n(1))
        XCTAssertEqual(calc("ISOWEEKNUM(DATE(2021,1,3))"), n(53))
        XCTAssertEqual(calc("ISOWEEKNUM(DATE(2020,12,31))"), n(53))
        XCTAssertEqual(calc("ISOWEEKNUM(DATE(2019,12,29))"), n(52))
        XCTAssertEqual(calc("ISOWEEKNUM(DATE(2019,12,30))"), n(1), "thứ Hai 30/12/2019 thuộc tuần 1 của 2020")
        XCTAssertEqual(calc("ISOWEEKNUM(DATE(2024,1,15))"), n(3))
        XCTAssertEqual(calc("ISOWEEKNUM(0)"), err("#NUM!"))
        XCTAssertEqual(calc("ISOWEEKNUM(\"abc\")"), err("#VALUE!"))
    }

    // MARK: Toán

    func testMath() {
        XCTAssertEqual(calc("ROUNDUP(3.141,2)"), n(3.15))
        XCTAssertEqual(calc("ROUNDUP(3.14,2)"), n(3.14))
        XCTAssertEqual(calc("ROUNDUP(-3.141,2)"), n(-3.15))
        XCTAssertEqual(calc("ROUNDUP(1234,-2)"), n(1300))
        XCTAssertEqual(calc("ROUNDUP(0.3*3,1)"), n(0.9), "0.8999999999999999 → 0.9")
        XCTAssertEqual(calc("ROUNDUP(2.1,0)"), n(3))
        XCTAssertEqual(calc("ROUNDDOWN(3.999,2)"), n(3.99))
        XCTAssertEqual(calc("ROUNDDOWN(-3.999,2)"), n(-3.99))
        XCTAssertEqual(calc("ROUNDDOWN(1299,-2)"), n(1200))
        XCTAssertEqual(calc("ROUNDDOWN(0,3)"), n(0))
        XCTAssertEqual(calc("ROUNDDOWN(2.9,0)"), n(2))
        XCTAssertEqual(calc("INT(2.9)"), n(2))
        XCTAssertEqual(calc("INT(-1.5)"), n(-2))
        XCTAssertEqual(calc("INT(\"7.8\")"), n(7))
        XCTAssertEqual(calc("MOD(10,3)"), n(1))
        XCTAssertEqual(calc("MOD(-3,2)"), n(1))
        XCTAssertEqual(calc("MOD(3,-2)"), n(-1))
        XCTAssertEqual(calc("MOD(5.5,2)"), n(1.5))
        XCTAssertEqual(calc("POWER(2,10)"), n(1024))
        XCTAssertEqual(calc("POWER(9,0.5)"), n(3))
        XCTAssertEqual(calc("POWER(2,-1)"), n(0.5))
        XCTAssertEqual(calc("SQRT(16)"), n(4))
        XCTAssertEqual(calc("SQRT(0)"), n(0))
    }

    func testMathErrors() {
        XCTAssertEqual(calc("MOD(5,0)"), err("#DIV/0!"))
        XCTAssertEqual(calc("POWER(0,0)"), err("#NUM!"))
        XCTAssertEqual(calc("POWER(0,-1)"), err("#DIV/0!"))
        XCTAssertEqual(calc("POWER(-8,0.5)"), err("#NUM!"))
        XCTAssertEqual(calc("POWER(10,1000)"), err("#NUM!"))
        XCTAssertEqual(calc("SQRT(-1)"), err("#NUM!"))
        XCTAssertEqual(calc("SQRT(\"x\")"), err("#VALUE!"))
        XCTAssertEqual(calc("INT(\"x\")"), err("#VALUE!"))
        XCTAssertEqual(calc("ROUNDUP(\"x\",1)"), err("#VALUE!"))
        XCTAssertEqual(calc("ROUNDDOWN(1)"), err("#VALUE!"))
        XCTAssertEqual(calc("ROUNDUP(#N/A,1)"), err("#N/A"))
        XCTAssertEqual(calc("MOD(#REF!,1)"), err("#REF!"))
        XCTAssertEqual(calc("SQRT(1/0)"), err("#DIV/0!"))
        XCTAssertEqual(calc("INT(A1:A2)", data), err("#VALUE!"))
    }

    // MARK: Điều kiện / thống kê

    func testCountifSumifAverageif() {
        XCTAssertEqual(calc("COUNTIF(M1:M6,\">9\")", data), n(3))
        XCTAssertEqual(calc("COUNTIF(M1:M6,\"a*\")", data), n(2))
        XCTAssertEqual(calc("COUNTIF(M1:M6,10)", data), n(1))
        XCTAssertEqual(calc("COUNTIF(M1:M6,\"<>10\")", data), n(5))
        XCTAssertEqual(calc("COUNTIF(M1:M6,\"=APPLE\")", data), n(1))
        XCTAssertEqual(calc("COUNTIF(M1:M6,\"<=10\")", data), n(2))
        XCTAssertEqual(calc("COUNTIF(M1:M6,R1)", data), n(2), "tiêu chí từ ô: >12")
        XCTAssertEqual(calc("COUNTIF(Q1:Q3,\"\")", data), n(2), "đếm ô trống")
        XCTAssertEqual(calc("COUNTIF(Q1:Q3,\"<>\")", data), n(1), "đếm ô không trống")
        XCTAssertEqual(calc("COUNTIF(M1:M6,\"zzz\")", data), n(0))
        XCTAssertEqual(calc("COUNTIF(P1:P3,\"#N/A\")", data), n(1), "khớp giá trị lỗi")
        XCTAssertEqual(calc("COUNTIF(M1:M6,\"~*\")", data), n(0))
        XCTAssertEqual(calc("COUNTIF(M1:M6,TRUE)", data), n(0))
        XCTAssertEqual(calc("SUMIF(M1:M6,\">9\")", data), n(45))
        XCTAssertEqual(calc("SUMIF(M1:M6,\">9\",N1:N6)", data), n(11))
        XCTAssertEqual(calc("SUMIF(M1:M3,\">5\",N2:N6)", data), n(7), "vùng tổng căn theo góc trên trái")
        XCTAssertEqual(calc("SUMIF(M1:M6,\"apple\",N1:N6)", data), n(4))
        XCTAssertEqual(calc("SUMIF(M1:M6,\"zzz\")", data), n(0))
        XCTAssertEqual(calc("AVERAGEIF(M1:M6,\">9\")", data), n(15))
        XCTAssertEqual(calc("AVERAGEIF(M1:M6,\">9\",N1:N6)", data), n(11.0 / 3.0))
        XCTAssertEqual(calc("COUNTIF(A1:A4,\">=\"&20)", data), n(3))
    }

    func testIfFamilyErrors() {
        XCTAssertEqual(calc("AVERAGEIF(M1:M6,\">100\")", data), err("#DIV/0!"))
        XCTAssertEqual(calc("SUMIF(M1:M3,\">0\",P1:P3)", data), err("#N/A"), "lỗi ở vùng tổng được khớp")
        XCTAssertEqual(calc("SUMIF(M1:M1,\">100\",P2:P3)", data), n(0), "ô lỗi không được khớp thì bỏ qua")
        XCTAssertEqual(calc("COUNTIF(M1:M6)", data), err("#VALUE!"))
        XCTAssertEqual(calc("SUMIF(M1:M6)", data), err("#VALUE!"))
        XCTAssertEqual(calc("COUNTIF(Hoang!A1:A2,1)", data), err("#REF!"))
        XCTAssertEqual(calc("COUNTIF(P1:P3,#N/A)", data), n(1), "tiêu chí là giá trị lỗi")
        XCTAssertEqual(calc("SUMIF(#DIV/0!,\">0\")", data), err("#DIV/0!"))
    }

    func testSumifsCountifs() {
        XCTAssertEqual(calc("SUMIFS(N1:N6,M1:M6,\">5\",M1:M6,\"<20\")", data), n(5))
        XCTAssertEqual(calc("COUNTIFS(M1:M6,\">5\",N1:N6,\"<=3\")", data), n(2))
        XCTAssertEqual(calc("COUNTIFS(M1:M6,\">5\")", data), n(3))
        XCTAssertEqual(calc("SUMIFS(N1:N6,M1:M6,\"a*\")", data), n(9))
        XCTAssertEqual(calc("SUMIFS(N1:N6,M1:M6,\"zzz\")", data), n(0))
        XCTAssertEqual(calc("COUNTIFS(M1:M6,\"zzz\",N1:N6,\">0\")", data), n(0))
        XCTAssertEqual(calc("COUNTIFS(M1:M6,\">5\",N1:N5,\">0\")", data), err("#VALUE!"), "khác kích thước")
        XCTAssertEqual(calc("SUMIFS(N1:N6,M1:M5,\">5\")", data), err("#VALUE!"))
        XCTAssertEqual(calc("SUMIFS(N1:N6,M1:M6)", data), err("#VALUE!"))
        XCTAssertEqual(calc("COUNTIFS(M1:M6)", data), err("#VALUE!"))
        XCTAssertEqual(calc("SUMIFS(P1:P3,M1:M3,\">0\")", data), err("#N/A"))
        XCTAssertEqual(calc("COUNTIFS(#REF!,\">0\")", data), err("#REF!"))
    }

    // M7 lát 42: MAXIFS / MINIFS / AVERAGEIFS.
    func testMaxifsMinifsAverageifs() {
        XCTAssertEqual(calc("MAXIFS(N1:N6,M1:M6,\">5\")", data), n(6))
        XCTAssertEqual(calc("MINIFS(N1:N6,M1:M6,\">5\")", data), n(2))
        XCTAssertEqual(calc("AVERAGEIFS(N1:N6,M1:M6,\">5\")", data), n(11.0 / 3.0))
        XCTAssertEqual(calc("MAXIFS(N1:N6,M1:M6,\"a*\")", data), n(5))
        XCTAssertEqual(calc("MINIFS(N1:N6,M1:M6,\"a*\")", data), n(4))
        XCTAssertEqual(calc("AVERAGEIFS(N1:N6,M1:M6,\"a*\")", data), n(4.5))
        XCTAssertEqual(calc("MAXIFS(N1:N6,M1:M6,\">5\",N1:N6,\"<=3\")", data), n(3))
        XCTAssertEqual(calc("MINIFS(N1:N6,M1:M6,\">5\",N1:N6,\"<=3\")", data), n(2))
        XCTAssertEqual(calc("AVERAGEIFS(N1:N6,M1:M6,\">5\",N1:N6,\"<=3\")", data), n(2.5))
        XCTAssertEqual(calc("MAXIFS(N1:N6,M1:M6,\"zzz\")", data), n(0), "không khớp → 0")
        XCTAssertEqual(calc("MINIFS(N1:N6,M1:M6,\"zzz\")", data), n(0), "không khớp → 0")
        XCTAssertEqual(calc("AVERAGEIFS(N1:N6,M1:M6,\"zzz\")", data), err("#DIV/0!"), "không khớp → #DIV/0!")
        XCTAssertEqual(calc("MAXIFS(M1:M6,N1:N6,\">0\")", data), n(20), "chữ trong vùng giá trị bị bỏ qua")
        XCTAssertEqual(calc("MINIFS(M1:M6,N1:N6,\">0\")", data), n(5))
        XCTAssertEqual(calc("AVERAGEIFS(M1:M6,N1:N6,\">0\")", data), n(12.5))
        XCTAssertEqual(calc("MAXIFS(N1:N6,M1:M6,R1)", data), n(6), "tiêu chí từ ô: >12")
        XCTAssertEqual(calc("MINIFS(N1:N6,M1:M6,R1)", data), n(3))
        XCTAssertEqual(calc("AVERAGEIFS(N1:N6,M1:M6,R1)", data), n(4.5))
        XCTAssertEqual(calc("MAXIFS(N1:N6,M1:M6,10)", data), n(2))
        XCTAssertEqual(calc("MINIFS(N1:N6,M1:M6,10)", data), n(2))
        XCTAssertEqual(calc("AVERAGEIFS(N1:N6,M1:M6,10)", data), n(2))
        XCTAssertEqual(calc("MAXIFS(P1:P3,M1:M3,\">0\")", data), err("#N/A"), "lỗi ở vùng giá trị được khớp")
        XCTAssertEqual(calc("MINIFS(P1:P3,M1:M3,\">0\")", data), err("#N/A"))
        XCTAssertEqual(calc("AVERAGEIFS(P1:P3,M1:M3,\">0\")", data), err("#N/A"))
        XCTAssertEqual(calc("MAXIFS(P1:P3,M1:M3,\">100\")", data), n(0), "ô lỗi không được khớp thì bỏ qua")
        XCTAssertEqual(calc("AVERAGEIFS(P1:P3,M1:M3,\">100\")", data), err("#DIV/0!"))
        XCTAssertEqual(calc("MAXIFS(N1:N6,M1:M5,\">5\")", data), err("#VALUE!"), "khác kích thước")
        XCTAssertEqual(calc("MINIFS(N1:N6,M1:M6)", data), err("#VALUE!"))
        XCTAssertEqual(calc("AVERAGEIFS(N1:N6)", data), err("#VALUE!"))
        XCTAssertEqual(calc("MAXIFS(N1:N6,M1:M6,\">5\",N1:N5,\">0\")", data), err("#VALUE!"))
        XCTAssertEqual(calc("MAXIFS(#REF!,M1:M6,\">0\")", data), err("#REF!"))
    }

    // MARK: Logic

    func testLogic() {
        XCTAssertEqual(calc("IFERROR(1/0,\"x\")"), s("x"))
        XCTAssertEqual(calc("IFERROR(5,\"x\")"), n(5))
        XCTAssertEqual(calc("IFERROR(VLOOKUP(1,A1:C4,2,FALSE),\"không có\")", data), s("không có"))
        XCTAssertEqual(calc("IFERROR(#N/A,#REF!)"), err("#REF!"), "nhánh thay thế cũng có thể là lỗi")
        XCTAssertEqual(calc("IFERROR(1,1/0)"), n(1), "tính lười")
        XCTAssertEqual(calc("IFNA(NA(),\"m\")"), s("m"))
        XCTAssertEqual(calc("IFNA(1/0,\"m\")"), err("#DIV/0!"), "chỉ bắt #N/A")
        XCTAssertEqual(calc("IFNA(3,\"m\")"), n(3))
        XCTAssertEqual(calc("IFERROR(1)"), err("#VALUE!"))
        XCTAssertEqual(calc("IFS(FALSE,1,TRUE,2)"), n(2))
        XCTAssertEqual(calc("IFS(1>2,\"a\",2>1,\"b\")"), s("b"))
        XCTAssertEqual(calc("IFS(TRUE,1,1/0,2)"), n(1), "tính lười")
        XCTAssertEqual(calc("IFS(FALSE,1)"), err("#N/A"))
        XCTAssertEqual(calc("IFS(TRUE)"), err("#VALUE!"))
        XCTAssertEqual(calc("IFS(\"x\",1)"), err("#VALUE!"))
        XCTAssertEqual(calc("IFS(#DIV/0!,1)"), err("#DIV/0!"))
        XCTAssertEqual(calc("SWITCH(2,1,\"a\",2,\"b\")"), s("b"))
        XCTAssertEqual(calc("SWITCH(9,1,\"a\",\"dflt\")"), s("dflt"))
        XCTAssertEqual(calc("SWITCH(\"B\",\"a\",1,\"b\",2)"), n(2), "không phân biệt hoa thường")
        XCTAssertEqual(calc("SWITCH(1,\"1\",\"text\",1,\"num\")"), s("num"), "khác kiểu không khớp")
        XCTAssertEqual(calc("SWITCH(9,1,\"a\")"), err("#N/A"))
        XCTAssertEqual(calc("SWITCH(1,1)"), err("#VALUE!"))
        XCTAssertEqual(calc("SWITCH(#REF!,1,2)"), err("#REF!"))
        XCTAssertEqual(calc("SWITCH(2,1,\"a\",2,1/0)"), err("#DIV/0!"))
    }

    func testUnknownStillNameError() {
        XCTAssertEqual(calc("FOO(1)"), err("#NAME?"))
        // LAMBDA đã triển khai ở M7 lát 28: LAMBDA(1) là hàm không tham số, thân là hằng 1;
        // hàm trần trong ô → #VALUE! theo Excel, không còn #NAME?.
        XCTAssertEqual(calc("LAMBDA(1)", data), err("#VALUE!"))
    }

    // MARK: Engine: phụ thuộc, lan lỗi, chéo sheet

    func testEngineDependenciesThroughNewFunctions() {
        let e = FormulaEngine()
        e.addSheet("Sheet1"); e.addSheet("Giá")
        e.timeZone = TimeZone(secondsFromGMT: 0)!
        // Bảng giá ở sheet khác; một ô trong bảng là công thức.
        e.setValue(s("A"), sheet: "Giá", at: "A1"); e.setValue(n(100), sheet: "Giá", at: "B1")
        e.setValue(s("B"), sheet: "Giá", at: "A2"); e.setFormula("B1*2", sheet: "Giá", at: "B2")
        e.setValue(s("B"), sheet: "Sheet1", at: "A1")
        e.setFormula("VLOOKUP(A1,Giá!A1:B2,2,FALSE)", sheet: "Sheet1", at: "B1")
        e.setFormula("INDEX(Giá!B1:B2,MATCH(A1,Giá!A1:A2,0))+1", sheet: "Sheet1", at: "B2")
        e.setFormula("SUMIF(Giá!A1:A2,\"B\",Giá!B1:B2)", sheet: "Sheet1", at: "B3")
        e.setFormula("IFERROR(VLOOKUP(\"Z\",Giá!A1:B2,2,FALSE),-1)", sheet: "Sheet1", at: "B4")
        e.setFormula("VLOOKUP(\"Z\",Giá!A1:B2,2,FALSE)", sheet: "Sheet1", at: "B5")
        e.setFormula("B5+1", sheet: "Sheet1", at: "B6")
        e.setFormula("TEXTJOIN(\"|\",TRUE,B1:B3)", sheet: "Sheet1", at: "B7")
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "Sheet1", at: "B1"), n(200))
        XCTAssertEqual(e.value(sheet: "Sheet1", at: "B2"), n(201))
        XCTAssertEqual(e.value(sheet: "Sheet1", at: "B3"), n(200))
        XCTAssertEqual(e.value(sheet: "Sheet1", at: "B4"), n(-1))
        XCTAssertEqual(e.value(sheet: "Sheet1", at: "B5"), err("#N/A"))
        XCTAssertEqual(e.value(sheet: "Sheet1", at: "B6"), err("#N/A"), "lỗi lan sang ô phụ thuộc")
        XCTAssertEqual(e.value(sheet: "Sheet1", at: "B7"), s("200|201|200"))
        // Đổi giá trị gốc → tính lại đúng chuỗi phụ thuộc.
        e.setValue(n(50), sheet: "Giá", at: "B1")
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "Sheet1", at: "B1"), n(100))
        XCTAssertEqual(e.value(sheet: "Sheet1", at: "B7"), s("100|101|100"))
    }

    func testEngineCircularThroughIndex() {
        let e = FormulaEngine()
        e.addSheet("S")
        e.setFormula("SUM(INDEX(A1:A3,0,1))", sheet: "S", at: "A3")
        e.setValue(n(1), sheet: "S", at: "A1")
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "S", at: "A3"), err("#REF!"))
        XCTAssertEqual(e.circularCells.count, 1)
    }

    func testEngineDateCells() {
        let e = FormulaEngine()
        e.addSheet("S")
        e.setValue(n(45306), sheet: "S", at: "A1")
        e.setFormula("EDATE(A1,1)", sheet: "S", at: "B1")
        e.setFormula("TEXT(B1,\"dd/mm/yyyy\")", sheet: "S", at: "C1")
        e.setFormula("DATEDIF(A1,B1,\"D\")", sheet: "S", at: "D1")
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "S", at: "B1"), n(45337))
        XCTAssertEqual(e.value(sheet: "S", at: "C1"), s("15/02/2024"))
        XCTAssertEqual(e.value(sheet: "S", at: "D1"), n(31))
    }

    // MARK: OFFSET / ROW / COLUMN / ROWS / COLUMNS (M7 lát 45)

    func testOffsetBasic() {
        XCTAssertEqual(calc("SUM(OFFSET(A1,1,0,2,1))", data), n(50), "A2:A3 = 20+30")
        XCTAssertEqual(calc("SUM(OFFSET(A1:A2,1,0))", data), n(50), "mặc định giữ kích thước gốc")
        XCTAssertEqual(calc("OFFSET(A1,2,2)", data), n(3.5), "một ô C3")
        XCTAssertEqual(calc("OFFSET(A1,2,1)", data), s("z"), "một ô B3")
        XCTAssertEqual(calc("OFFSET(C2,-1,-1)", data), s("x"), "B1")
        XCTAssertEqual(calc("OFFSET(A1,1.9,0)", data), n(20), "hàng cắt về nguyên")
        XCTAssertEqual(calc("SUM(OFFSET(A:A,0,0,2,1))", data), n(30), "cột nguyên, lấy 2 hàng đầu")
        XCTAssertEqual(calc("SUM(OFFSET(B2,0,0,1,2))", data), n(2.5), "B2 là chữ (bỏ qua) + C2")
        XCTAssertEqual(calc("AVERAGE(OFFSET(A1,0,0,4,1))", data), n(25), "dùng được trong AVERAGE")
        XCTAssertEqual(calc("COUNT(OFFSET(A1,0,0,2,2))", data), n(2), "A1:B2 có 2 số")
    }

    func testOffsetErrors() {
        XCTAssertEqual(calc("OFFSET(A1,-1,0)", data), err("#REF!"), "lên khỏi hàng 1")
        XCTAssertEqual(calc("OFFSET(A1,0,-1)", data), err("#REF!"), "sang trái khỏi cột A")
        XCTAssertEqual(calc("OFFSET(A1048576,1,0)", data), err("#REF!"), "vượt hàng cuối")
        XCTAssertEqual(calc("OFFSET(A1,0,0,0,1)", data), err("#VALUE!"), "chiều cao 0")
        XCTAssertEqual(calc("OFFSET(A1,0,0,-1,1)", data), err("#VALUE!"), "chiều cao âm")
        XCTAssertEqual(calc("OFFSET(A1,0,0,1,0)", data), err("#VALUE!"), "chiều rộng 0")
        XCTAssertEqual(calc("OFFSET(5,0,0)", data), err("#VALUE!"), "tham chiếu phải là vùng")
        XCTAssertEqual(calc("OFFSET(\"A1\",0,0)", data), err("#VALUE!"), "chuỗi không phải tham chiếu")
        XCTAssertEqual(calc("OFFSET(A1)", data), err("#VALUE!"), "thiếu đối số")
        XCTAssertEqual(calc("OFFSET(A1,0,0,1,1,1)", data), err("#VALUE!"), "thừa đối số")
        XCTAssertEqual(calc("OFFSET(#N/A,0,0)", data), err("#N/A"), "lỗi lan truyền")
        XCTAssertEqual(calc("OFFSET(A:A,1,0)", data), err("#REF!"), "dịch cả cột xuống 1 tràn khỏi bảng")
        XCTAssertEqual(calc("OFFSET(A1,0,0,1048577,1)", data), err("#REF!"), "chiều cao vượt bảng")
    }

    func testOffsetNamedRange() {
        let e = FormulaEngine()
        e.addSheet("Sheet1")
        e.setValue(n(10), sheet: "Sheet1", at: "A1"); e.setValue(n(20), sheet: "Sheet1", at: "A2")
        e.setValue(n(30), sheet: "Sheet1", at: "B1"); e.setValue(n(40), sheet: "Sheet1", at: "B2")
        e.defineName("Vung", sheet: "Sheet1",
                     range: CellRange(CellReference(column: 1, row: 1), CellReference(column: 2, row: 2)))
        e.setFormula("SUM(OFFSET(Vung,1,0,1,2))", sheet: "Sheet1", at: "D1")
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "Sheet1", at: "D1"), n(60), "A2:B2 = 20+40")
    }

    func testRowColumn() {
        XCTAssertEqual(calc("ROW()", data), n(99), "ô công thức Z99")
        XCTAssertEqual(calc("COLUMN()", data), n(26), "ô công thức Z99")
        XCTAssertEqual(calc("ROW(A1)", data), n(1))
        XCTAssertEqual(calc("COLUMN(A1)", data), n(1))
        XCTAssertEqual(calc("ROW(B3)", data), n(3))
        XCTAssertEqual(calc("COLUMN(C5)", data), n(3))
        XCTAssertEqual(calc("ROW(A1:B3)", data), n(1), "hàng đầu của vùng")
        XCTAssertEqual(calc("COLUMN(A1:B3)", data), n(1), "cột đầu của vùng")
        XCTAssertEqual(calc("ROW(A4:B4)", data), n(4))
        XCTAssertEqual(calc("COLUMN(B1:B4)", data), n(2))
        XCTAssertEqual(calc("ROW(SEQUENCE(3))", data), n(1), "hằng mảng: hàng đầu")
        XCTAssertEqual(calc("ROW(5)", data), err("#VALUE!"), "số không phải tham chiếu")
        XCTAssertEqual(calc("COLUMN(\"A1\")", data), err("#VALUE!"), "chuỗi không phải tham chiếu")
        XCTAssertEqual(calc("ROW(A1,B1)", data), err("#VALUE!"), "thừa đối số")
        XCTAssertEqual(calc("ROW(#DIV/0!)", data), err("#DIV/0!"), "lỗi lan truyền")
    }

    func testRowsColumns() {
        XCTAssertEqual(calc("ROWS(A1:A4)", data), n(4))
        XCTAssertEqual(calc("COLUMNS(A1:C4)", data), n(3))
        XCTAssertEqual(calc("ROWS(A1)", data), n(1))
        XCTAssertEqual(calc("COLUMNS(A1)", data), n(1))
        XCTAssertEqual(calc("ROWS(A:A)", data), n(1048576), "cột nguyên")
        XCTAssertEqual(calc("COLUMNS(1:1)", data), n(16384), "hàng nguyên")
        XCTAssertEqual(calc("ROWS(SEQUENCE(3,2))", data), n(3))
        XCTAssertEqual(calc("COLUMNS(SEQUENCE(3,2))", data), n(2))
        XCTAssertEqual(calc("ROWS(5)", data), err("#VALUE!"), "số không phải vùng")
        XCTAssertEqual(calc("COLUMNS(\"A1\")", data), err("#VALUE!"))
        XCTAssertEqual(calc("ROWS()", data), err("#VALUE!"), "thiếu đối số")
        XCTAssertEqual(calc("ROWS(A1,A2)", data), err("#VALUE!"), "thừa đối số")
        XCTAssertEqual(calc("ROWS(#N/A)", data), err("#N/A"), "lỗi lan truyền")
    }

    // MARK: Hàm thông tin (M7 lát 46)

    func testInformationFunctions() {
        let cells: [String: CellValue] = [
            "A1": n(10), "B1": s("x"), "C1": .bool(true), "D1": err("#DIV/0!"), "E1": err("#N/A"),
            "F1": s("5"), "G1": n(0),
        ]
        // ISBLANK: chỉ ô thật sự trống; H1 không đặt giá trị
        XCTAssertEqual(calc("ISBLANK(H1)", cells), .bool(true))
        XCTAssertEqual(calc("ISBLANK(A1)", cells), .bool(false))
        XCTAssertEqual(calc("ISBLANK(\"\")", cells), .bool(false), "chuỗi rỗng không phải trống")
        XCTAssertEqual(calc("ISBLANK(0)", cells), .bool(false))
        XCTAssertEqual(calc("ISBLANK(D1)", cells), .bool(false), "IS* không lan truyền lỗi đối số (Excel; oracle đợt 2 #26)")
        XCTAssertEqual(calc("ISBLANK(A1:B1)", cells), err("#VALUE!"), "vùng nhiều ô")
        XCTAssertEqual(calc("ISNUMBER(A1:B1)", cells), err("#VALUE!"), "vùng nhiều ô")
        XCTAssertEqual(calc("ISERROR(A1:B1)", cells), err("#VALUE!"), "vùng nhiều ô")
        XCTAssertEqual(calc("ISNONTEXT(A1:B1)", cells), err("#VALUE!"), "vùng nhiều ô")
        XCTAssertEqual(calc("ERROR.TYPE(A1:B1)", cells), err("#VALUE!"), "vùng nhiều ô")
        XCTAssertEqual(calc("ISBLANK()", cells), err("#VALUE!"), "thiếu đối số")
        XCTAssertEqual(calc("ISBLANK(A1,B1)", cells), err("#VALUE!"), "thừa đối số")
        // ISERR / ISERROR / ISNA
        XCTAssertEqual(calc("ISERR(D1)", cells), .bool(true))
        XCTAssertEqual(calc("ISERR(E1)", cells), .bool(false), "ISERR trừ #N/A")
        XCTAssertEqual(calc("ISERR(A1)", cells), .bool(false))
        XCTAssertEqual(calc("ISERROR(D1)", cells), .bool(true))
        XCTAssertEqual(calc("ISERROR(E1)", cells), .bool(true))
        XCTAssertEqual(calc("ISERROR(A1)", cells), .bool(false))
        XCTAssertEqual(calc("ISERROR(H1)", cells), .bool(false))
        XCTAssertEqual(calc("ISERROR(1/0)", cells), .bool(true))
        XCTAssertEqual(calc("ISNA(E1)", cells), .bool(true))
        XCTAssertEqual(calc("ISNA(D1)", cells), .bool(false))
        XCTAssertEqual(calc("ISNA(A1)", cells), .bool(false))
        XCTAssertEqual(calc("ISNA(NA())", cells), .bool(true))
        // ISNUMBER / ISTEXT / ISLOGICAL / ISNONTEXT
        XCTAssertEqual(calc("ISNUMBER(A1)", cells), .bool(true))
        XCTAssertEqual(calc("ISNUMBER(B1)", cells), .bool(false))
        XCTAssertEqual(calc("ISNUMBER(\"5\")", cells), .bool(false), "chuỗi số không phải số")
        XCTAssertEqual(calc("ISNUMBER(D1)", cells), .bool(false), "lỗi → FALSE")
        XCTAssertEqual(calc("ISNUMBER(H1)", cells), .bool(false))
        XCTAssertEqual(calc("ISTEXT(B1)", cells), .bool(true))
        XCTAssertEqual(calc("ISTEXT(F1)", cells), .bool(true), "chuỗi \"5\" vẫn là văn bản")
        XCTAssertEqual(calc("ISTEXT(A1)", cells), .bool(false))
        XCTAssertEqual(calc("ISTEXT(D1)", cells), .bool(false))
        XCTAssertEqual(calc("ISLOGICAL(C1)", cells), .bool(true))
        XCTAssertEqual(calc("ISLOGICAL(1)", cells), .bool(false))
        XCTAssertEqual(calc("ISLOGICAL(D1)", cells), .bool(false))
        XCTAssertEqual(calc("ISNONTEXT(A1)", cells), .bool(true))
        XCTAssertEqual(calc("ISNONTEXT(B1)", cells), .bool(false))
        XCTAssertEqual(calc("ISNONTEXT(\"\")", cells), .bool(false))
        XCTAssertEqual(calc("ISNONTEXT(H1)", cells), .bool(true), "ô trống không phải văn bản")
        XCTAssertEqual(calc("ISNONTEXT(D1)", cells), .bool(true), "lỗi không phải văn bản")
        // ISREF
        XCTAssertEqual(calc("ISREF(A1)", cells), .bool(true))
        XCTAssertEqual(calc("ISREF(A1:B1)", cells), .bool(true))
        XCTAssertEqual(calc("ISREF(1)", cells), .bool(false))
        XCTAssertEqual(calc("ISREF(\"A1\")", cells), .bool(false))
        XCTAssertEqual(calc("ISREF(NA())", cells), .bool(false), "lỗi không phải tham chiếu")
        XCTAssertEqual(calc("ISREF(INDIRECT(\"A1\"))", cells), .bool(true))
        // TYPE: số 1, chuỗi 2, logic 4, lỗi 16, mảng/vùng nhiều ô 64
        XCTAssertEqual(calc("TYPE(A1)", cells), n(1))
        XCTAssertEqual(calc("TYPE(B1)", cells), n(2))
        XCTAssertEqual(calc("TYPE(C1)", cells), n(4))
        XCTAssertEqual(calc("TYPE(D1)", cells), n(16))
        XCTAssertEqual(calc("TYPE(H1)", cells), n(1), "ô trống → 1")
        XCTAssertEqual(calc("TYPE(A1:B1)", cells), n(64))
        XCTAssertEqual(calc("TYPE(\"x\")", cells), n(2))
        XCTAssertEqual(calc("TYPE(1/0)", cells), n(16), "lỗi → 16, không lan truyền")
        XCTAssertEqual(calc("TYPE({1,2})", cells), n(64))
        XCTAssertEqual(calc("TYPE({5})", cells), n(1))
        XCTAssertEqual(calc("TYPE()", cells), err("#VALUE!"))
        // N
        XCTAssertEqual(calc("N(A1)", cells), n(10))
        XCTAssertEqual(calc("N(B1)", cells), n(0), "chuỗi → 0 kể cả chuỗi số")
        XCTAssertEqual(calc("N(F1)", cells), n(0))
        XCTAssertEqual(calc("N(C1)", cells), n(1))
        XCTAssertEqual(calc("N(FALSE)", cells), n(0))
        XCTAssertEqual(calc("N(\"5\")", cells), n(0))
        XCTAssertEqual(calc("N(H1)", cells), n(0))
        XCTAssertEqual(calc("N(D1)", cells), err("#DIV/0!"), "lỗi lan truyền")
        XCTAssertEqual(calc("N(A1:B1)", cells), err("#VALUE!"), "vùng nhiều ô")
        XCTAssertEqual(calc("N()", cells), err("#VALUE!"))
    }

    func testInformationFunctionsImplicitIntersectionInCSE() {
        // Trong công thức mảng (CSE), position được đặt nên scalar() giao ngầm vùng theo
        // vị trí từng ô — kể cả khi ô giao nhau chứa #VALUE! thì IS* vẫn xét ô đó.
        // (Ngoài CSE, position = nil nên scalar() không giao ngầm: ISBLANK(A1:B1) → #VALUE!,
        // đã khóa ở testInformationFunctions.)
        let e = FormulaEngine()
        e.addSheet("Sheet1")
        e.timeZone = TimeZone(secondsFromGMT: 0)!
        e.setValue(n(10), sheet: "Sheet1", at: "A1")
        e.setFormula("1+\"a\"", sheet: "Sheet1", at: "B1") // B1 chứa #VALUE!
        e.setArrayFormula("ISBLANK(A1:B1)", sheet: "Sheet1", range: CellRange("D1:E1")!)
        e.recalculate()
        // D1 giao ngầm A1:B1 theo độ lệch: D1←A1=10 → FALSE; E1←B1=#VALUE! → FALSE (không ném)
        XCTAssertEqual(e.value(sheet: "Sheet1", at: "D1"), .bool(false), "CSE D1←A1=10")
        XCTAssertEqual(e.value(sheet: "Sheet1", at: "E1"), .bool(false), "CSE E1←B1 chứa #VALUE! → FALSE, không ném")
    }

    func testIsFormula() {
        let e = FormulaEngine()
        e.addSheet("Sheet1")
        e.timeZone = TimeZone(secondsFromGMT: 0)!
        e.setFormula("1+1", sheet: "Sheet1", at: "A1")
        e.setValue(n(5), sheet: "Sheet1", at: "A2")
        e.setFormula("\"\"", sheet: "Sheet1", at: "A3")
        func at(_ f: String) -> CellValue {
            e.setFormula(f, sheet: "Sheet1", at: "Z99")
            e.recalculate()
            return e.value(sheet: "Sheet1", at: "Z99")
        }
        XCTAssertEqual(at("ISFORMULA(A1)"), .bool(true))
        XCTAssertEqual(at("ISFORMULA(A2)"), .bool(false), "ô hằng")
        XCTAssertEqual(at("ISFORMULA(A3)"), .bool(true), "công thức trả chuỗi rỗng vẫn là công thức")
        XCTAssertEqual(at("ISFORMULA(A4)"), .bool(false), "ô trống")
        XCTAssertEqual(at("ISBLANK(A3)"), .bool(false), "công thức trả \"\" không phải trống")
        XCTAssertEqual(at("ISFORMULA(A1:A2)"), err("#VALUE!"), "vùng nhiều ô")
        XCTAssertEqual(at("ISFORMULA(1)"), err("#VALUE!"), "không phải tham chiếu")
        XCTAssertEqual(at("ISFORMULA(NA())"), err("#N/A"), "lỗi lan truyền")
        XCTAssertEqual(at("ISFORMULA()"), err("#VALUE!"))
    }

    // MARK: Toán làm tròn / số nguyên (M7 lát 47)

    func testMround() {
        XCTAssertEqual(calc("MROUND(1.3,0.2)"), n(1.4), "1.3/0.2 = 6.5 → 7 × 0.2 (không sai số nhị phân)")
        XCTAssertEqual(calc("MROUND(5,2)"), n(6), "giữa chừng ra xa 0")
        XCTAssertEqual(calc("MROUND(5.5,2)"), n(6))
        XCTAssertEqual(calc("MROUND(7,2)"), n(8))
        XCTAssertEqual(calc("MROUND(10,3)"), n(9))
        XCTAssertEqual(calc("MROUND(10.5,3)"), n(12))
        XCTAssertEqual(calc("MROUND(1.25,0.5)"), n(1.5))
        XCTAssertEqual(calc("MROUND(2.5,0.5)"), n(2.5), "đúng bội số giữ nguyên")
        XCTAssertEqual(calc("MROUND(0,3)"), n(0))
        XCTAssertEqual(calc("MROUND(10,0)"), n(0), "multiple = 0 → 0")
        XCTAssertEqual(calc("MROUND(-5,2)"), err("#NUM!"), "khác dấu")
        XCTAssertEqual(calc("MROUND(5,-2)"), err("#NUM!"), "khác dấu")
        XCTAssertEqual(calc("MROUND(\"x\",1)"), err("#VALUE!"))
        XCTAssertEqual(calc("MROUND(#N/A,1)"), err("#N/A"), "lỗi lan truyền")
        XCTAssertEqual(calc("MROUND(1)"), err("#VALUE!"), "thiếu đối số")
    }

    func testCeilingFloorLegacy() {
        XCTAssertEqual(calc("CEILING(2.5,1)"), n(3))
        XCTAssertEqual(calc("CEILING(2.4,1)"), n(3))
        XCTAssertEqual(calc("CEILING(7.6,2.5)"), n(10))
        XCTAssertEqual(calc("CEILING(7.5,2.5)"), n(7.5), "đúng bội số giữ nguyên")
        XCTAssertEqual(calc("CEILING(-2.5,-1)"), n(-3), "âm: ra xa 0")
        XCTAssertEqual(calc("CEILING(-2.4,-1)"), n(-3))
        XCTAssertEqual(calc("CEILING(2.5,-1)"), err("#NUM!"), "khác dấu")
        XCTAssertEqual(calc("CEILING(-2.5,1)"), err("#NUM!"), "khác dấu")
        XCTAssertEqual(calc("CEILING(2.5,0)"), n(0))
        XCTAssertEqual(calc("CEILING(0,1)"), n(0))
        XCTAssertEqual(calc("FLOOR(2.5,1)"), n(2))
        XCTAssertEqual(calc("FLOOR(2.9,1)"), n(2))
        XCTAssertEqual(calc("FLOOR(7.6,2.5)"), n(7.5))
        XCTAssertEqual(calc("FLOOR(-2.5,-1)"), n(-2), "âm: về phía 0")
        XCTAssertEqual(calc("FLOOR(-2.9,-1)"), n(-2))
        XCTAssertEqual(calc("FLOOR(2.5,-1)"), err("#NUM!"), "khác dấu")
        XCTAssertEqual(calc("FLOOR(-2.5,1)"), err("#NUM!"), "khác dấu")
        XCTAssertEqual(calc("FLOOR(2.5,0)"), n(0))
        XCTAssertEqual(calc("CEILING(\"x\",1)"), err("#VALUE!"))
        XCTAssertEqual(calc("FLOOR(#DIV/0!,1)"), err("#DIV/0!"), "lỗi lan truyền")
        XCTAssertEqual(calc("CEILING(1)"), err("#VALUE!"), "thiếu đối số")
    }

    func testCeilingFloorMath() {
        XCTAssertEqual(calc("CEILING.MATH(2.5)"), n(3), "mặc định significance = 1")
        XCTAssertEqual(calc("CEILING.MATH(2.5,1)"), n(3))
        XCTAssertEqual(calc("CEILING.MATH(7.6,2.5)"), n(10))
        XCTAssertEqual(calc("CEILING.MATH(-2.5,1)"), n(-2), "âm, mode mặc định → về phía 0")
        XCTAssertEqual(calc("CEILING.MATH(-2.5,1,1)"), n(-3), "âm, mode ≠ 0 → ra xa 0")
        XCTAssertEqual(calc("CEILING.MATH(2.5,-1)"), n(3), "significance lấy trị tuyệt đối")
        XCTAssertEqual(calc("CEILING.MATH(2.5,0)"), n(0))
        XCTAssertEqual(calc("CEILING.MATH(0,1)"), n(0))
        XCTAssertEqual(calc("FLOOR.MATH(2.5)"), n(2))
        XCTAssertEqual(calc("FLOOR.MATH(2.5,1)"), n(2))
        XCTAssertEqual(calc("FLOOR.MATH(7.6,2.5)"), n(7.5))
        XCTAssertEqual(calc("FLOOR.MATH(-2.5,1)"), n(-2), "âm, mode mặc định → về phía 0")
        XCTAssertEqual(calc("FLOOR.MATH(-2.5,1,1)"), n(-3), "âm, mode ≠ 0 → ra xa 0")
        XCTAssertEqual(calc("FLOOR.MATH(2.5,-1)"), n(2), "significance lấy trị tuyệt đối")
        XCTAssertEqual(calc("FLOOR.MATH(2.5,0)"), n(0))
        XCTAssertEqual(calc("CEILING.MATH(\"x\")"), err("#VALUE!"))
        XCTAssertEqual(calc("FLOOR.MATH(#N/A)"), err("#N/A"), "lỗi lan truyền")
        XCTAssertEqual(calc("CEILING.MATH()"), err("#VALUE!"))
        XCTAssertEqual(calc("CEILING.MATH(1,1,1,1)"), err("#VALUE!"), "thừa đối số")
    }

    func testEvenOddSignQuotient() {
        XCTAssertEqual(calc("EVEN(1.5)"), n(2))
        XCTAssertEqual(calc("EVEN(3)"), n(4))
        XCTAssertEqual(calc("EVEN(2)"), n(2), "đã chẵn giữ nguyên")
        XCTAssertEqual(calc("EVEN(0)"), n(0))
        XCTAssertEqual(calc("EVEN(0.5)"), n(2))
        XCTAssertEqual(calc("EVEN(-1.5)"), n(-2))
        XCTAssertEqual(calc("EVEN(-3)"), n(-4))
        XCTAssertEqual(calc("ODD(1.5)"), n(3))
        XCTAssertEqual(calc("ODD(3)"), n(3), "đã lẻ giữ nguyên")
        XCTAssertEqual(calc("ODD(2)"), n(3))
        XCTAssertEqual(calc("ODD(0)"), n(1))
        XCTAssertEqual(calc("ODD(0.5)"), n(1))
        XCTAssertEqual(calc("ODD(-1.5)"), n(-3))
        XCTAssertEqual(calc("ODD(-2)"), n(-3))
        XCTAssertEqual(calc("SIGN(5)"), n(1))
        XCTAssertEqual(calc("SIGN(-5)"), n(-1))
        XCTAssertEqual(calc("SIGN(0)"), n(0))
        XCTAssertEqual(calc("SIGN(-0.001)"), n(-1))
        XCTAssertEqual(calc("QUOTIENT(5,2)"), n(2))
        XCTAssertEqual(calc("QUOTIENT(-5,2)"), n(-2), "cắt về 0")
        XCTAssertEqual(calc("QUOTIENT(5,-2)"), n(-2))
        XCTAssertEqual(calc("QUOTIENT(10,3)"), n(3))
        XCTAssertEqual(calc("QUOTIENT(0,5)"), n(0))
        XCTAssertEqual(calc("QUOTIENT(5,0)"), err("#DIV/0!"))
        XCTAssertEqual(calc("EVEN(\"x\")"), err("#VALUE!"))
        XCTAssertEqual(calc("ODD(#N/A)"), err("#N/A"), "lỗi lan truyền")
        XCTAssertEqual(calc("SIGN()"), err("#VALUE!"))
        XCTAssertEqual(calc("QUOTIENT(5)"), err("#VALUE!"), "thiếu đối số")
    }

    // MARK: Toán tổ hợp (M7 lát 49)

    func testCombinFunctions() {
        // FACT (golden-batch13: FACT(5) = 120)
        XCTAssertEqual(calc("FACT(0)"), n(1))
        XCTAssertEqual(calc("FACT(1)"), n(1))
        XCTAssertEqual(calc("FACT(5)"), n(120))
        XCTAssertEqual(calc("FACT(5.9)"), n(120), "cắt về nguyên")
        numNear("FACT(170)", 7.257415615307999e306, accuracy: 1e292)
        XCTAssertEqual(calc("FACT(171)"), err("#NUM!"), "171! tràn Double")
        XCTAssertEqual(calc("FACT(-1)"), err("#NUM!"))
        XCTAssertEqual(calc("FACT(\"abc\")"), err("#VALUE!"))
        XCTAssertEqual(calc("FACT()"), err("#VALUE!"))
        // FACTDOUBLE (golden-batch1: 7 → 105, 8 → 384)
        XCTAssertEqual(calc("FACTDOUBLE(0)"), n(1))
        XCTAssertEqual(calc("FACTDOUBLE(1)"), n(1))
        XCTAssertEqual(calc("FACTDOUBLE(2)"), n(2))
        XCTAssertEqual(calc("FACTDOUBLE(5)"), n(15))
        XCTAssertEqual(calc("FACTDOUBLE(6)"), n(48))
        XCTAssertEqual(calc("FACTDOUBLE(7)"), n(105))
        XCTAssertEqual(calc("FACTDOUBLE(8)"), n(384))
        XCTAssertEqual(calc("FACTDOUBLE(-1)"), n(1))
        XCTAssertEqual(calc("FACTDOUBLE(-2)"), err("#NUM!"))
        numNear("FACTDOUBLE(170)", 1.0898143681335203e154, accuracy: 1e140)
        // COMBIN (golden-batch13: COMBIN(5,2) = 10)
        XCTAssertEqual(calc("COMBIN(5,2)"), n(10))
        XCTAssertEqual(calc("COMBIN(10,3)"), n(120))
        XCTAssertEqual(calc("COMBIN(5,0)"), n(1))
        XCTAssertEqual(calc("COMBIN(5,5)"), n(1))
        XCTAssertEqual(calc("COMBIN(5.9,2.9)"), n(10), "cắt về nguyên")
        XCTAssertEqual(calc("COMBIN(1030,2)"), n(529935))
        numNear("COMBIN(100,50)", 1.008913445455642e29, accuracy: 1e15)
        XCTAssertEqual(calc("COMBIN(5,6)"), err("#NUM!"))
        XCTAssertEqual(calc("COMBIN(-1,2)"), err("#NUM!"))
        XCTAssertEqual(calc("COMBIN(5,-1)"), err("#NUM!"))
        XCTAssertEqual(calc("COMBIN(1030,515)"), err("#NUM!"), "kết quả tràn Double")
        // COMBINA (golden-batch1: COMBINA(4,3) = 20)
        XCTAssertEqual(calc("COMBINA(10,3)"), n(220))
        XCTAssertEqual(calc("COMBINA(4,3)"), n(20))
        XCTAssertEqual(calc("COMBINA(5,10)"), n(1001), "số chọn được lớn hơn số loại")
        XCTAssertEqual(calc("COMBINA(0,0)"), n(1))
        XCTAssertEqual(calc("COMBINA(0,5)"), err("#NUM!"))
        XCTAssertEqual(calc("COMBINA(-1,2)"), err("#NUM!"))
        XCTAssertEqual(calc("COMBINA(2,-1)"), err("#NUM!"))
        // PERMUT / PERMUTATIONA
        XCTAssertEqual(calc("PERMUT(5,2)"), n(20))
        XCTAssertEqual(calc("PERMUT(10,3)"), n(720))
        XCTAssertEqual(calc("PERMUT(100,3)"), n(970200))
        XCTAssertEqual(calc("PERMUT(5,0)"), n(1))
        XCTAssertEqual(calc("PERMUT(5,5)"), n(120))
        XCTAssertEqual(calc("PERMUT(5,6)"), err("#NUM!"))
        XCTAssertEqual(calc("PERMUT(-1,2)"), err("#NUM!"))
        XCTAssertEqual(calc("PERMUTATIONA(10,3)"), n(1000))
        XCTAssertEqual(calc("PERMUTATIONA(5,2)"), n(25))
        XCTAssertEqual(calc("PERMUTATIONA(10,10)"), n(1e10))
        XCTAssertEqual(calc("PERMUTATIONA(0,0)"), n(1))
        XCTAssertEqual(calc("PERMUTATIONA(-1,2)"), err("#NUM!"))
        XCTAssertEqual(calc("PERMUTATIONA(2,-1)"), err("#NUM!"))
        // GCD / LCM (golden-batch1: GCD(12,18) = 6, LCM(4,6) = 12)
        XCTAssertEqual(calc("GCD(12,18)"), n(6))
        XCTAssertEqual(calc("GCD(12,18,24)"), n(6))
        XCTAssertEqual(calc("GCD(0,5)"), n(5))
        XCTAssertEqual(calc("GCD(0,0)"), n(0))
        XCTAssertEqual(calc("GCD(-12,18)"), n(6), "số âm lấy trị tuyệt đối")
        XCTAssertEqual(calc("GCD(5.9,2.9)"), n(1), "cắt về nguyên")
        XCTAssertEqual(calc("GCD(A1:A3)", data), n(10), "vùng A1:A3 = 10,20,30")
        XCTAssertEqual(calc("GCD(M1:M3)", data), n(5), "vùng 5,10,15")
        XCTAssertEqual(calc("GCD(P1:P3)", data), err("#N/A"), "lỗi trong vùng lan truyền")
        XCTAssertEqual(calc("GCD(\"abc\")"), err("#VALUE!"))
        XCTAssertEqual(calc("LCM(4,6)"), n(12))
        XCTAssertEqual(calc("LCM(4,6,10)"), n(60))
        XCTAssertEqual(calc("LCM(0,5)"), n(0))
        XCTAssertEqual(calc("LCM(-4,6)"), err("#NUM!"))
        XCTAssertEqual(calc("LCM(5.9,2.9)"), n(10))
        XCTAssertEqual(calc("LCM(A1:A2)", data), n(20), "vùng 10,20")
        // MULTINOMIAL (golden-batch1: (2,3,4) = 1260)
        XCTAssertEqual(calc("MULTINOMIAL(2,3)"), n(10))
        XCTAssertEqual(calc("MULTINOMIAL(1,1,1)"), n(6))
        XCTAssertEqual(calc("MULTINOMIAL(2,3,4)"), n(1260))
        XCTAssertEqual(calc("MULTINOMIAL(0,0)"), n(1))
        XCTAssertEqual(calc("MULTINOMIAL(2.9,3.9)"), n(10), "cắt về nguyên")
        XCTAssertEqual(calc("MULTINOMIAL(-1,2)"), err("#NUM!"))
        XCTAssertEqual(calc("MULTINOMIAL()"), err("#VALUE!"), "không có đối số")
    }

    func testSumSqFunctions() {
        // SUMSQ (golden-batch1: A1:A5 = 1..5 → 55; SUMSQ(1,2,3) = 14)
        let ab: [String: CellValue] = [
            "A1": n(1), "A2": n(2), "A3": n(3), "A4": n(4), "A5": n(5),
            "B1": n(10), "B2": n(20), "B3": n(30), "B4": n(40), "B5": n(50),
        ]
        XCTAssertEqual(calc("SUMSQ(A1:A5)", ab), n(55))
        XCTAssertEqual(calc("SUMSQ(1,2,3)"), n(14))
        XCTAssertEqual(calc("SUMSQ(3,4)"), n(25))
        XCTAssertEqual(calc("SUMSQ(3,4,5)"), n(50))
        XCTAssertEqual(calc("SUMSQ(\"3\")"), n(9), "chuỗi số trực tiếp được ép")
        XCTAssertEqual(calc("SUMSQ(TRUE)"), n(1), "logic trực tiếp được ép")
        XCTAssertEqual(calc("SUMSQ(M1:M6)", data), n(750), "chữ trong vùng bị bỏ qua: 5²+10²+15²+20²")
        XCTAssertEqual(calc("SUMSQ(Z1:Z3)"), n(0), "vùng rỗng → 0")
        XCTAssertEqual(calc("SUMSQ(P1:P3)", data), err("#N/A"), "lỗi trong vùng lan truyền")
        XCTAssertEqual(calc("SUMSQ(\"abc\")"), err("#VALUE!"))
        XCTAssertEqual(calc("SUMSQ()"), err("#VALUE!"), "không có đối số")
        XCTAssertEqual(calc("SUMSQ(1e200,1e200)"), err("#NUM!"), "tràn số")
        XCTAssertEqual(calc("SUMSQ({1,2,3})"), n(14), "hằng mảng")
        // SUMX2MY2 / SUMX2PY2 / SUMXMY2 (golden-batch1: −5445 / 5555 / 4455)
        XCTAssertEqual(calc("SUMX2MY2(A1:A5,B1:B5)", ab), n(-5445))
        XCTAssertEqual(calc("SUMX2PY2(A1:A5,B1:B5)", ab), n(5555))
        XCTAssertEqual(calc("SUMXMY2(A1:A5,B1:B5)", ab), n(4455))
        XCTAssertEqual(calc("SUMX2MY2({1,2,3},{4,5,6})"), n(-63))
        XCTAssertEqual(calc("SUMX2PY2({1,2,3},{4,5,6})"), n(91))
        XCTAssertEqual(calc("SUMXMY2({1,2,3},{4,5,6})"), n(27))
        XCTAssertEqual(calc("SUMX2MY2(3,2)"), n(5), "đối số vô hướng")
        XCTAssertEqual(calc("SUMX2MY2(A1:A3,B1:B2)", ab), err("#N/A"), "khác số lượng giá trị")
        XCTAssertEqual(calc("SUMX2MY2(1)"), err("#VALUE!"), "thiếu đối số")
        XCTAssertEqual(calc("SUMX2MY2(1,2,3)"), err("#VALUE!"), "thừa đối số")
        XCTAssertEqual(calc("SUMX2MY2(\"a\",1)"), err("#VALUE!"), "chữ trực tiếp không ép được")
        XCTAssertEqual(calc("SUMX2MY2(P1:P3,N1:N3)", data), err("#N/A"), "lỗi trong vùng lan truyền")
        // Cặp có chữ trong vùng thì bỏ qua (B2 = "x" → chỉ còn 2 cặp)
        let mixed: [String: CellValue] = [
            "A1": n(1), "A2": n(2), "A3": n(3),
            "B1": n(10), "B2": s("x"), "B3": n(30),
        ]
        XCTAssertEqual(calc("SUMX2MY2(A1:A3,B1:B3)", mixed), n(-990))
        XCTAssertEqual(calc("SUMXMY2(A1:A3,B1:B3)", mixed), n(810))
    }

    func testTrigFunctions() {
        // Lượng giác ngược / xuôi (golden Excel 2016)
        numNear("ACOS(0.5)", 1.0471975511965976)
        XCTAssertEqual(calc("ACOS(1)"), n(0))
        numNear("ACOS(-1)", Double.pi)
        XCTAssertEqual(calc("ACOS(2)"), err("#NUM!"))
        numNear("ASIN(0.5)", 0.5235987755982988)
        numNear("ASIN(1)", Double.pi / 2)
        XCTAssertEqual(calc("ASIN(-2)"), err("#NUM!"))
        numNear("ATAN(1)", Double.pi / 4)
        XCTAssertEqual(calc("ATAN(0)"), n(0))
        numNear("ATAN2(1,1)", Double.pi / 4)
        numNear("ATAN2(-1,0)", Double.pi)
        numNear("ATAN2(0,1)", Double.pi / 2)
        XCTAssertEqual(calc("ATAN2(0,0)"), err("#DIV/0!"))
        XCTAssertEqual(calc("COS(0)"), n(1))
        numNear("COS(PI())", -1)
        numNear("SIN(PI()/2)", 1)
        numNear("TAN(PI()/4)", 1)
        XCTAssertEqual(calc("ACOSH(1)"), n(0))
        numNear("ACOSH(2)", 1.3169578969248168)
        XCTAssertEqual(calc("ACOSH(0)"), err("#NUM!"))
        XCTAssertEqual(calc("ASINH(0)"), n(0))
        numNear("ASINH(1)", 0.881373587019543)
        numNear("ATANH(0.5)", 0.5493061443340549)
        XCTAssertEqual(calc("ATANH(1)"), err("#NUM!"))
        XCTAssertEqual(calc("ATANH(-1)"), err("#NUM!"))
        XCTAssertEqual(calc("COSH(0)"), n(1))
        XCTAssertEqual(calc("SINH(0)"), n(0))
        numNear("TANH(1)", 0.7615941559557649)
        // Chuyển đổi góc + PI + SQRTPI
        XCTAssertEqual(calc("DEGREES(PI())"), n(180))
        numNear("DEGREES(1)", 57.29577951308232)
        numNear("RADIANS(180)", Double.pi)
        numNear("PI()", Double.pi)
        numNear("SQRTPI(1)", 1.772453850905516)
        numNear("SQRTPI(2)", 2.5066282746310002)
        XCTAssertEqual(calc("SQRTPI(0)"), n(0))
        XCTAssertEqual(calc("SQRTPI(-1)"), err("#NUM!"))
        // Sai số lượng đối số + lỗi lan truyền
        XCTAssertEqual(calc("ACOS()"), err("#VALUE!"))
        XCTAssertEqual(calc("COS(1,2)"), err("#VALUE!"))
        XCTAssertEqual(calc("PI(1)"), err("#VALUE!"))
        XCTAssertEqual(calc("ATAN2(1)"), err("#VALUE!"))
        XCTAssertEqual(calc("ACOS(\"a\")"), err("#VALUE!"))
        XCTAssertEqual(calc("ACOS(P2)", data), err("#N/A"), "lỗi lan truyền")
    }

    func testRomanArabic() {
        // ROMAN — ví dụ Microsoft Learn (499 qua 5 form)
        XCTAssertEqual(calc("ROMAN(499,0)"), s("CDXCIX"))
        XCTAssertEqual(calc("ROMAN(499,1)"), s("LDVLIV"))
        XCTAssertEqual(calc("ROMAN(499,2)"), s("XDIX"))
        XCTAssertEqual(calc("ROMAN(499,3)"), s("VDIV"))
        XCTAssertEqual(calc("ROMAN(499,4)"), s("ID"))
        XCTAssertEqual(calc("ROMAN(2026)"), s("MMXXVI"))
        XCTAssertEqual(calc("ROMAN(999,2)"), s("XMIX"))
        XCTAssertEqual(calc("ROMAN(999,3)"), s("VMIV"))
        XCTAssertEqual(calc("ROMAN(999,4)"), s("IM"))
        XCTAssertEqual(calc("ROMAN(0)"), s(""))
        XCTAssertEqual(calc("ROMAN(499.9)"), s("CDXCIX"), "cắt phần lẻ về 0")
        XCTAssertEqual(calc("ROMAN(4000)"), err("#VALUE!"))
        XCTAssertEqual(calc("ROMAN(-1)"), err("#VALUE!"))
        XCTAssertEqual(calc("ROMAN(499,5)"), err("#VALUE!"))
        XCTAssertEqual(calc("ROMAN(499,-1)"), err("#VALUE!"))
        XCTAssertEqual(calc("ROMAN(\"abc\")"), err("#VALUE!"))
        // ARABIC
        XCTAssertEqual(calc("ARABIC(\"MMXXVI\")"), n(2026))
        XCTAssertEqual(calc("ARABIC(\"CDXCIX\")"), n(499))
        XCTAssertEqual(calc("ARABIC(\"MCMXCIX\")"), n(1999))
        XCTAssertEqual(calc("ARABIC(\"IV\")"), n(4))
        XCTAssertEqual(calc("ARABIC(\"XL\")"), n(40))
        XCTAssertEqual(calc("ARABIC(\"VL\")"), n(45), "cặp trừ không chuẩn vẫn cộng/trừ theo vị trí")
        XCTAssertEqual(calc("ARABIC(\"mmxxvi\")"), n(2026), "không phân biệt hoa thường")
        XCTAssertEqual(calc("ARABIC(\"\")"), n(0))
        XCTAssertEqual(calc("ARABIC(\"ABC\")"), err("#VALUE!"))
        XCTAssertEqual(calc("ARABIC(\"M1X\")"), err("#VALUE!"))
    }

    func testEngineeringBaseBitErf() {
        // M7 lát 53: chuyển cơ số — golden Excel 2016 batch 6
        XCTAssertEqual(calc("BIN2DEC(\"1010\")"), n(10))
        XCTAssertEqual(calc("BIN2DEC(\"1111111111\")"), n(-1))
        XCTAssertEqual(calc("BIN2DEC(\"1000000000\")"), n(-512))
        XCTAssertEqual(calc("BIN2DEC(\"102\")"), err("#NUM!"))
        XCTAssertEqual(calc("BIN2DEC(\"\")"), n(0))
        XCTAssertEqual(calc("BIN2DEC(\"11111111111\")"), err("#NUM!"), "quá 10 ký tự")
        XCTAssertEqual(calc("BIN2DEC(1010)"), n(10), "số 1010 ép thành chuỗi")
        XCTAssertEqual(calc("BIN2HEX(\"1111\")"), s("F"))
        XCTAssertEqual(calc("BIN2HEX(\"1111111111\")"), s("FFFFFFFFFF"))
        XCTAssertEqual(calc("BIN2HEX(\"101\",4)"), s("0005"))
        XCTAssertEqual(calc("BIN2HEX(\"101\",10)"), s("0000000005"))
        XCTAssertEqual(calc("BIN2OCT(\"1101\")"), s("15"))
        XCTAssertEqual(calc("BIN2OCT(\"1111111111\")"), s("7777777777"))
        XCTAssertEqual(calc("OCT2DEC(\"17\")"), n(15))
        XCTAssertEqual(calc("OCT2DEC(\"7777777777\")"), n(-1))
        XCTAssertEqual(calc("OCT2BIN(\"17\")"), s("1111"))
        XCTAssertEqual(calc("OCT2BIN(\"17\",8)"), s("00001111"))
        XCTAssertEqual(calc("OCT2HEX(\"377\")"), s("FF"))
        XCTAssertEqual(calc("OCT2BIN(\"7777777000\")"), s("1000000000"))
        XCTAssertEqual(calc("OCT2DEC(\"8\")"), err("#NUM!"))
        XCTAssertEqual(calc("OCT2DEC(\"77777777777\")"), err("#NUM!"), "quá 10 ký tự")
        XCTAssertEqual(calc("HEX2DEC(\"FF\")"), n(255))
        XCTAssertEqual(calc("HEX2DEC(\"FFFFFFFFFF\")"), n(-1))
        XCTAssertEqual(calc("HEX2DEC(\"ff\")"), n(255), "không phân biệt hoa thường")
        XCTAssertEqual(calc("HEX2BIN(\"1F\")"), s("11111"))
        XCTAssertEqual(calc("HEX2BIN(\"FFFFFFFFFF\")"), s("1111111111"))
        XCTAssertEqual(calc("HEX2OCT(\"FF\")"), s("377"))
        XCTAssertEqual(calc("HEX2OCT(\"1F\",5)"), s("00037"))
        XCTAssertEqual(calc("HEX2DEC(\"G\")"), err("#NUM!"))
        XCTAssertEqual(calc("HEX2BIN(\"3FF\")"), err("#NUM!"), "1023 vượt khoảng BIN")
        XCTAssertEqual(calc("HEX2BIN(\"200\")"), err("#NUM!"), "512 vượt khoảng BIN")
        XCTAssertEqual(calc("DEC2BIN(9)"), s("1001"))
        XCTAssertEqual(calc("DEC2BIN(9,8)"), s("00001001"))
        XCTAssertEqual(calc("DEC2BIN(-5)"), s("1111111011"))
        XCTAssertEqual(calc("DEC2BIN(511)"), s("111111111"))
        XCTAssertEqual(calc("DEC2BIN(512)"), err("#NUM!"))
        XCTAssertEqual(calc("DEC2BIN(-512)"), s("1000000000"))
        XCTAssertEqual(calc("DEC2BIN(-513)"), err("#NUM!"))
        XCTAssertEqual(calc("DEC2BIN(0)"), s("0"))
        XCTAssertEqual(calc("DEC2BIN(9,3)"), err("#NUM!"), "places quá nhỏ")
        XCTAssertEqual(calc("DEC2BIN(9.9)"), s("1001"), "cắt phần lẻ về 0")
        XCTAssertEqual(calc("DEC2BIN(9,0)"), err("#NUM!"), "places = 0")
        XCTAssertEqual(calc("DEC2BIN(\"9\")"), s("1001"), "chuỗi số ép kiểu")
        XCTAssertEqual(calc("DEC2OCT(58)"), s("72"))
        XCTAssertEqual(calc("DEC2OCT(58,5)"), s("00072"))
        XCTAssertEqual(calc("DEC2OCT(-100)"), s("7777777634"))
        XCTAssertEqual(calc("DEC2HEX(255)"), s("FF"))
        XCTAssertEqual(calc("DEC2HEX(255,4)"), s("00FF"))
        XCTAssertEqual(calc("DEC2HEX(-1)"), s("FFFFFFFFFF"))
        XCTAssertEqual(calc("DEC2HEX(-1,4)"), s("FFFFFFFFFF"), "số âm bỏ qua places")
        XCTAssertEqual(calc("DEC2HEX(549755813887)"), s("7FFFFFFFFF"))
        XCTAssertEqual(calc("DEC2HEX(549755813888)"), err("#NUM!"))
        XCTAssertEqual(calc("DEC2HEX(-549755813888)"), s("8000000000"))
        // BIT — golden batch 6
        XCTAssertEqual(calc("BITAND(13,25)"), n(9))
        XCTAssertEqual(calc("BITOR(13,25)"), n(29))
        XCTAssertEqual(calc("BITXOR(13,25)"), n(20))
        XCTAssertEqual(calc("BITLSHIFT(4,2)"), n(16))
        XCTAssertEqual(calc("BITRSHIFT(16,2)"), n(4))
        XCTAssertEqual(calc("BITLSHIFT(4,-1)"), n(2), "dịch âm = dịch ngược")
        XCTAssertEqual(calc("BITRSHIFT(16,-1)"), n(32))
        XCTAssertEqual(calc("BITAND(-1,5)"), err("#NUM!"))
        XCTAssertEqual(calc("BITAND(1.5,5)"), err("#NUM!"), "không nguyên")
        XCTAssertEqual(calc("BITLSHIFT(1,60)"), err("#NUM!"), "kết quả ≥ 2^48")
        XCTAssertEqual(calc("BITLSHIFT(1,48)"), err("#NUM!"))
        XCTAssertEqual(calc("BITOR(281474976710655,1)"), n(281474976710655))
        XCTAssertEqual(calc("BITAND(281474976710656,1)"), err("#NUM!"), "đối số ≥ 2^48")
        XCTAssertEqual(calc("BITLSHIFT(0,100)"), n(0))
        XCTAssertEqual(calc("BITRSHIFT(16,100)"), n(0))
        // DELTA / GESTEP — golden batch 6
        XCTAssertEqual(calc("DELTA(5,4)"), n(0))
        XCTAssertEqual(calc("DELTA(5,5)"), n(1))
        XCTAssertEqual(calc("DELTA(0.5)"), n(0))
        XCTAssertEqual(calc("DELTA(0)"), n(1), "mặc định so với 0")
        XCTAssertEqual(calc("DELTA(\"a\")"), err("#VALUE!"))
        XCTAssertEqual(calc("GESTEP(5,4)"), n(1))
        XCTAssertEqual(calc("GESTEP(3,4)"), n(0))
        XCTAssertEqual(calc("GESTEP(-1)"), n(0))
        XCTAssertEqual(calc("GESTEP(0)"), n(1))
        // ERF / ERFC — golden batch 6
        numNear("ERF(1)", 0.8427007929497149)
        numNear("ERF(0.5,1.5)", 0.44560526866226424)
        numNear("ERF(-1)", -0.8427007929497149)
        XCTAssertEqual(calc("ERF(0)"), n(0))
        numNear("ERF.PRECISE(0.745)", 0.7079289200957377)
        numNear("ERFC(1)", 0.15729920705028513)
        numNear("ERFC(-1)", 1.8427007929497148)
        numNear("ERFC.PRECISE(-1)", 1.8427007929497148)
        XCTAssertEqual(calc("ERFC(0)"), n(1))
        numNear("ERF(2.5)", 0.999593047982555)
        numNear("ERFC(3)", 2.209049699858544e-05)
        numNear("ERF(1.5,0.5)", -0.44560526866226424, "upper < lower → âm")
        XCTAssertEqual(calc("ERFC.PRECISE(0)"), n(1))
        XCTAssertEqual(calc("ERF(\"x\")"), err("#VALUE!"))
        XCTAssertEqual(calc("ERF.PRECISE(1,2)"), err("#VALUE!"), "PRECISE chỉ 1 đối số")
        // Sai số lượng đối số + lỗi lan truyền
        XCTAssertEqual(calc("BIN2DEC()"), err("#VALUE!"))
        XCTAssertEqual(calc("DEC2BIN(9,4,1)"), err("#VALUE!"))
        XCTAssertEqual(calc("BITAND(13)"), err("#VALUE!"))
        XCTAssertEqual(calc("DELTA(P2)", data), err("#N/A"), "lỗi lan truyền")
    }

    func testEngineeringComplex() {
        // M7 lát 54: COMPLEX + IM* — golden Excel 2016 batch 6 (49 ca)
        XCTAssertEqual(calc("COMPLEX(3,4)"), s("3+4i"))
        XCTAssertEqual(calc("COMPLEX(3,-4)"), s("3-4i"))
        XCTAssertEqual(calc("COMPLEX(0,1)"), s("i"))
        XCTAssertEqual(calc("COMPLEX(0,-1)"), s("-i"))
        XCTAssertEqual(calc("COMPLEX(5,0)"), s("5"))
        XCTAssertEqual(calc("COMPLEX(0,0)"), s("0"))
        XCTAssertEqual(calc("COMPLEX(1.5,2.25,\"j\")"), s("1.5+2.25j"))
        XCTAssertEqual(calc("COMPLEX(1,1,\"k\")"), err("#VALUE!"), "suffix khác i/j")
        XCTAssertEqual(calc("COMPLEX(0,5)"), s("5i"))
        XCTAssertEqual(calc("COMPLEX(-2,-1)"), s("-2-i"))
        XCTAssertEqual(calc("COMPLEX(1,1,\"J\")"), s("1+j"), "suffix hoa vẫn nhận, ra chữ thường; hệ số ảo 1 viết gọn")
        XCTAssertEqual(calc("COMPLEX(1)"), err("#VALUE!"), "thiếu đối số")
        // IMREAL / IMAGINARY / IMABS / IMARGUMENT — golden batch 6
        XCTAssertEqual(calc("IMREAL(\"3+4i\")"), n(3))
        XCTAssertEqual(calc("IMAGINARY(\"3+4i\")"), n(4))
        XCTAssertEqual(calc("IMAGINARY(\"4\")"), n(0))
        XCTAssertEqual(calc("IMREAL(\"-i\")"), n(0))
        XCTAssertEqual(calc("IMAGINARY(\"-i\")"), n(-1))
        XCTAssertEqual(calc("IMREAL(\"5j\")"), n(0), "hậu tố j")
        XCTAssertEqual(calc("IMABS(\"3+4i\")"), n(5))
        XCTAssertEqual(calc("IMABS(\"1\")"), n(1))
        numNear("IMARGUMENT(\"3+4i\")", 0.9272952180016122)
        numNear("IMARGUMENT(\"-1\")", 3.141592653589793)
        XCTAssertEqual(calc("IMARGUMENT(\"0\")"), err("#DIV/0!"))
        XCTAssertEqual(calc("IMREAL(\"abc\")"), err("#NUM!"))
        XCTAssertEqual(calc("IMABS(\"1+\")"), err("#NUM!"))
        XCTAssertEqual(calc("IMREAL(\"\")"), err("#NUM!"), "chuỗi rỗng")
        XCTAssertEqual(calc("IMREAL(\"i\")"), n(0))
        XCTAssertEqual(calc("IMAGINARY(\"i\")"), n(1))
        XCTAssertEqual(calc("IMREAL(\"3+4j\")"), n(3))
        XCTAssertEqual(calc("IMAGINARY(\"3+4j\")"), n(4))
        // IMCONJUGATE — golden batch 6
        XCTAssertEqual(calc("IMCONJUGATE(\"3+4i\")"), s("3-4i"))
        XCTAssertEqual(calc("IMCONJUGATE(\"5\")"), s("5"))
        // IMSUM / IMSUB / IMPRODUCT / IMDIV — golden batch 6
        XCTAssertEqual(calc("IMSUM(\"3+4i\",\"5-3i\")"), s("8+i"))
        XCTAssertEqual(calc("IMSUM(\"3+4i\",\"5-3i\",\"1\")"), s("9+i"))
        XCTAssertEqual(calc("IMSUB(\"13+4i\",\"5+3i\")"), s("8+i"))
        XCTAssertEqual(calc("IMPRODUCT(\"3+4i\",\"5-3i\")"), s("27+11i"))
        XCTAssertEqual(calc("IMPRODUCT(\"1+2i\",\"3+4i\",\"5+6i\")"), s("-85+20i"))
        XCTAssertEqual(calc("IMDIV(\"-238+240i\",\"10+24i\")"), s("5+12i"))
        XCTAssertEqual(calc("IMDIV(\"1\",\"0\")"), err("#NUM!"), "chia cho 0")
        XCTAssertEqual(calc("IMDIV(\"5\",\"2\")"), s("2.5"))
        XCTAssertEqual(calc("IMSUM(\"i\")"), s("i"))
        XCTAssertEqual(calc("IMSUM(\"3+4j\",\"1\")"), s("4+4i"), "hậu tố j chuẩn hoá thành i")
        XCTAssertEqual(calc("IMSUM()"), err("#VALUE!"))
        XCTAssertEqual(calc("IMDIV(\"1\")"), err("#VALUE!"))
        XCTAssertEqual(calc("IMSUM(P2)", data), err("#N/A"), "lỗi lan truyền")
        // IMEXP / IMLN / IMLOG10 / IMLOG2 / IMSQRT / IMPOWER — golden batch 6
        XCTAssertEqual(calc("IMEXP(\"1+i\")"), s("1.46869393991589+2.28735528717884i"))
        XCTAssertEqual(calc("IMEXP(\"0\")"), s("1"))
        XCTAssertEqual(calc("IMLN(\"3+4i\")"), s("1.6094379124341+0.927295218001612i"))
        XCTAssertEqual(calc("IMLN(\"0\")"), err("#NUM!"))
        XCTAssertEqual(calc("IMLOG10(\"3+4i\")"), s("0.698970004336019+0.402719196273373i"))
        XCTAssertEqual(calc("IMLOG2(\"3+4i\")"), s("2.32192809488736+1.33780421245098i"))
        XCTAssertEqual(calc("IMSQRT(\"1+i\")"), s("1.09868411346781+0.455089860562227i"))
        XCTAssertEqual(calc("IMSQRT(\"4\")"), s("2"))
        XCTAssertEqual(calc("IMSQRT(\"0\")"), s("0"))
        XCTAssertEqual(calc("IMPOWER(\"2+3i\",3)"), s("-46+9.00000000000001i"), "dạng cực De Moivre như Excel")
        XCTAssertEqual(calc("IMPOWER(\"2+3i\",0.5)"), s("1.67414922803554+0.895977476129838i"))
        XCTAssertEqual(calc("IMPOWER(\"2\",2)"), s("4"))
        XCTAssertEqual(calc("IMPOWER(\"0\",2)"), s("0"))
        XCTAssertEqual(calc("IMPOWER(\"1+i\",-1)"), s("0.5-0.5i"))
        XCTAssertEqual(calc("IMPOWER(\"2+3i\",0)"), s("1"))
        XCTAssertEqual(calc("IMPOWER(\"0\",0)"), err("#NUM!"), "0^0")
        XCTAssertEqual(calc("IMPOWER(\"0\",-1)"), err("#NUM!"))
        // IMSIN / IMCOS / IMTAN / IMSINH / IMCOSH / IMSEC / IMCOT / IMSECH — golden batch 6
        XCTAssertEqual(calc("IMSIN(\"1+i\")"), s("1.29845758141598+0.634963914784736i"))
        XCTAssertEqual(calc("IMCOS(\"1+i\")"), s("0.833730025131149-0.988897705762865i"))
        XCTAssertEqual(calc("IMTAN(\"1+i\")"), s("0.271752585319512+1.08392332733869i"))
        XCTAssertEqual(calc("IMSINH(\"1+i\")"), s("0.634963914784736+1.29845758141598i"))
        XCTAssertEqual(calc("IMCOSH(\"1+i\")"), s("0.833730025131149+0.988897705762865i"))
        XCTAssertEqual(calc("IMSEC(\"1+i\")"), s("0.498337030555187+0.591083841721045i"))
        XCTAssertEqual(calc("IMCOT(\"1+i\")"), s("0.217621561854403-0.868014142895925i"))
        XCTAssertEqual(calc("IMSECH(\"1+i\")"), s("0.498337030555187-0.591083841721045i"))
        XCTAssertEqual(calc("IMSIN(\"0\")"), s("0"))
        XCTAssertEqual(calc("IMCOS(\"0\")"), s("1"))
        // IMCSC / IMCSCH / IMTANH — không có trong golden batch 6; kỳ vọng
        // đối chiếu độc lập bằng Python cmath (cùng thư viện C như Glibc)
        XCTAssertEqual(calc("IMCSC(\"1+i\")"), s("0.621518017170428-0.303931001628426i"))
        XCTAssertEqual(calc("IMCSCH(\"1+i\")"), s("0.303931001628426-0.621518017170428i"))
        XCTAssertEqual(calc("IMTANH(\"1+i\")"), s("1.08392332733869+0.271752585319512i"))
    }

    // MARK: CONVERT (M7 lát 55) — 49 ca golden batch 6 + tiền tố/lỗi

    func testConvert() {
        // Khối lượng
        numNear("CONVERT(1,\"lbm\",\"kg\")", 0.45359237, accuracy: 1e-9)
        numNear("CONVERT(1,\"kg\",\"lbm\")", 2.2046226218487757, accuracy: 1e-9)
        numNear("CONVERT(1,\"stone\",\"lbm\")", 13.999999999999998, accuracy: 1e-9)
        numNear("CONVERT(5,\"kg\",\"g\")", 5000, accuracy: 1e-9)
        numNear("CONVERT(1,\"g\",\"mg\")", 1000, accuracy: 1e-9)
        // Nhiệt độ (đổi qua K)
        numNear("CONVERT(68,\"F\",\"C\")", 20, accuracy: 1e-9)
        numNear("CONVERT(100,\"C\",\"F\")", 212, accuracy: 1e-9)
        numNear("CONVERT(0,\"C\",\"K\")", 273.15, accuracy: 1e-9)
        numNear("CONVERT(1,\"C\",\"F\")", 33.8, accuracy: 1e-9)
        numNear("CONVERT(37,\"C\",\"K\")", 310.15, accuracy: 1e-9)
        numNear("CONVERT(98.6,\"F\",\"K\")", 310.15, accuracy: 1e-9)
        numNear("CONVERT(100,\"Rank\",\"K\")", 55.55555555555556, accuracy: 1e-9)
        numNear("CONVERT(1,\"K\",\"F\")", -457.87, accuracy: 1e-9)
        numNear("CONVERT(0,\"C\",\"F\")", 32, accuracy: 1e-9)
        // Khoảng cách
        numNear("CONVERT(1,\"mi\",\"km\")", 1.609344, accuracy: 1e-9)
        numNear("CONVERT(5,\"ft\",\"m\")", 1.524, accuracy: 1e-9)
        numNear("CONVERT(1,\"km\",\"m\")", 1000, accuracy: 1e-9)
        numNear("CONVERT(1,\"mm\",\"cm\")", 0.1, accuracy: 1e-9)
        numNear("CONVERT(1,\"nm\",\"m\")", 1e-9, accuracy: 1e-15)
        numNear("CONVERT(1,\"yd\",\"in\")", 36, accuracy: 1e-9)
        numNear("CONVERT(1,\"Nmi\",\"m\")", 1852, accuracy: 1e-9)
        // Thời gian
        numNear("CONVERT(1,\"hr\",\"mn\")", 60, accuracy: 1e-9)
        numNear("CONVERT(1,\"day\",\"sec\")", 86400, accuracy: 1e-9)
        numNear("CONVERT(1,\"yr\",\"day\")", 365.25, accuracy: 1e-9)
        // Áp suất
        numNear("CONVERT(1,\"atm\",\"Pa\")", 101325, accuracy: 1e-9)
        numNear("CONVERT(1,\"atm\",\"mmHg\")", 760.0021001785152, accuracy: 1e-9)
        numNear("CONVERT(1,\"mmHg\",\"Pa\")", 133.322, accuracy: 1e-9)
        numNear("CONVERT(1,\"Torr\",\"Pa\")", 133.32236842105263, accuracy: 1e-9)
        numNear("CONVERT(1,\"atm\",\"Torr\")", 760, accuracy: 1e-9)
        // Lực / năng lượng / công suất
        numNear("CONVERT(1,\"N\",\"lbf\")", 0.22480894309971047, accuracy: 1e-9)
        numNear("CONVERT(1,\"J\",\"cal\")", 0.23884589662749595, accuracy: 1e-9)
        numNear("CONVERT(1,\"cal\",\"J\")", 4.1868, accuracy: 1e-9)
        numNear("CONVERT(1,\"eV\",\"J\")", 1.602176487e-19, accuracy: 1e-25)
        numNear("CONVERT(1,\"HP\",\"W\")", 745.6998715822702, accuracy: 1e-9)
        numNear("CONVERT(1,\"GW\",\"W\")", 1000000000, accuracy: 1e-9)
        // Thể tích
        numNear("CONVERT(1,\"gal\",\"l\")", 3.785411784, accuracy: 1e-9)
        numNear("CONVERT(1,\"l\",\"gal\")", 0.26417205235814845, accuracy: 1e-9)
        numNear("CONVERT(1,\"m3\",\"l\")", 1000, accuracy: 1e-9)
        numNear("CONVERT(1,\"ft3\",\"l\")", 28.316846592, accuracy: 1e-9)
        numNear("CONVERT(1,\"in3\",\"cm3\")", 16.387064, accuracy: 1e-9)
        // Diện tích
        numNear("CONVERT(1,\"in2\",\"cm2\")", 6.4516, accuracy: 1e-9)
        numNear("CONVERT(1,\"mi2\",\"km2\")", 2.589988110336, accuracy: 1e-9)
        numNear("CONVERT(1,\"ha\",\"m2\")", 10000, accuracy: 1e-9)
        // Thông tin
        numNear("CONVERT(1,\"kbyte\",\"byte\")", 1000, accuracy: 1e-9)
        numNear("CONVERT(1,\"kibyte\",\"byte\")", 1024, accuracy: 1e-9)
        numNear("CONVERT(1,\"Mbit\",\"kbit\")", 1000, accuracy: 1e-9)
        // Tốc độ / từ trường
        numNear("CONVERT(1,\"mph\",\"m/s\")", 0.44704, accuracy: 1e-9)
        numNear("CONVERT(1,\"kn\",\"m/s\")", 0.5144444444444445, accuracy: 1e-9)
        numNear("CONVERT(1,\"T\",\"ga\")", 10000, accuracy: 1e-9)
        // Tiền tố SI/nhị phân + đơn vị mũ (ngoài 49 ca golden)
        numNear("CONVERT(1,\"cm\",\"m\")", 0.01, accuracy: 1e-9)
        numNear("CONVERT(1,\"mm\",\"m\")", 0.001, accuracy: 1e-9)
        numNear("CONVERT(1,\"mg\",\"g\")", 0.001, accuracy: 1e-9)
        numNear("CONVERT(1,\"kW\",\"W\")", 1000, accuracy: 1e-9)
        numNear("CONVERT(1,\"MW\",\"W\")", 1000000, accuracy: 1e-9)
        numNear("CONVERT(1,\"ms\",\"sec\")", 0.001, accuracy: 1e-9)
        numNear("CONVERT(1,\"Mbyte\",\"byte\")", 1000000, accuracy: 1e-9)
        numNear("CONVERT(1,\"Mibyte\",\"byte\")", 1048576, accuracy: 1e-9)
        numNear("CONVERT(1,\"cm2\",\"m2\")", 0.0001, accuracy: 1e-9)
        numNear("CONVERT(1,\"km2\",\"m2\")", 1000000, accuracy: 1e-9)
        numNear("CONVERT(1,\"cm3\",\"l\")", 0.001, accuracy: 1e-9)
        numNear("CONVERT(1,\"km3\",\"l\")", 1000000000000, accuracy: 1e-9)
        numNear("CONVERT(1,\"daL\",\"l\")", 10, accuracy: 1e-9)
        numNear("CONVERT(5,\"m\",\"m\")", 5, accuracy: 1e-9)
        // psi: thêm ngoài bảng JS (Excel có); 1 psi = 1 lbf/in², tính từ hằng lbf/in²
        numNear("CONVERT(1,\"psi\",\"Pa\")", 6894.757293168361, accuracy: 1e-6)
        // Lỗi: khác nhóm, đơn vị lạ, sai số đối số, giá trị không phải số
        XCTAssertEqual(calc("CONVERT(1,\"m\",\"kg\")"), err("#N/A"), "khác nhóm")
        XCTAssertEqual(calc("CONVERT(1,\"xyz\",\"m\")"), err("#N/A"), "đơn vị lạ")
        XCTAssertEqual(calc("CONVERT(1,\"C\",\"m\")"), err("#N/A"), "nhiệt độ sang khoảng cách")
        XCTAssertEqual(calc("CONVERT(1,\"psi\",\"m\")"), err("#N/A"), "áp suất sang khoảng cách")
        XCTAssertEqual(calc("CONVERT(1,\"m\")"), err("#VALUE!"), "thiếu đối số")
        XCTAssertEqual(calc("CONVERT(\"abc\",\"m\",\"km\")"), err("#VALUE!"), "giá trị không phải số")
        XCTAssertEqual(calc("CONVERT(1,\"m\",\"km\",\"x\")"), err("#VALUE!"), "thừa đối số")
    }

    // MARK: Tài chính — giá trị thời gian/lãi suất (M7 lát 56)

    /// Ô dùng chung cho MIRR/XNPV/XIRR/FVSCHEDULE (khớp `cells` của golden batch 5).
    var fin: [String: CellValue] {
        [
            "A1": n(-1000), "A2": n(300), "A3": n(400), "A4": n(500), "A5": n(600),
            "B1": n(45292), "B2": n(45383), "B3": n(45474), "B4": n(45566), "B5": n(45658),
            "C1": n(0.05), "C2": n(0.04), "C3": n(0.06), "C4": n(0.03),
            "D1": s("a"),
        ]
    }

    /// Như `fin` nhưng ngày thứ hai trước ngày đầu (để kiểm lỗi #NUM! của XNPV).
    var finBadDate: [String: CellValue] {
        [
            "A1": n(-1000), "A2": n(300), "A3": n(400), "A4": n(500), "A5": n(600),
            "B1": n(45658), "B2": n(45292), "B3": n(45383), "B4": n(45474), "B5": n(45566),
        ]
    }

    func testFinancialTimeValueLat56() {
        // CUMIPMT / CUMPRINC — 10 ca golden batch 5
        numNear("CUMIPMT(0.09/12,360,125000,1,12,0)", -11215.342881128316, accuracy: 1e-9)
        numNear("CUMIPMT(0.09/12,360,125000,13,24,0)", -11135.232130750841, accuracy: 1e-9)
        numNear("CUMIPMT(0.09/12,360,125000,1,1,1)", 0, accuracy: 1e-9)
        numNear("CUMIPMT(0.09/12,360,125000,1,12,1)", -10201.332884494606, accuracy: 1e-9)
        numNear("CUMPRINC(0.09/12,360,125000,1,12,0)", -853.9963730434232, accuracy: 1e-9)
        numNear("CUMPRINC(0.09/12,360,125000,13,24,1)", -927.1534723780624, accuracy: 1e-9)
        XCTAssertEqual(calc("CUMIPMT(0,360,125000,1,12,0)"), err("#NUM!"), "lãi 0")
        XCTAssertEqual(calc("CUMIPMT(0.1,12,1000,0,3,0)"), err("#NUM!"), "kỳ bắt đầu 0")
        XCTAssertEqual(calc("CUMPRINC(0.1,12,1000,1,13,0)"), err("#NUM!"), "kỳ kết thúc vượt nper")
        XCTAssertEqual(calc("CUMIPMT(0.1,12,-1000,1,3,0)"), err("#NUM!"), "gốc âm")
        XCTAssertEqual(calc("CUMIPMT(0.1,12,1000,1,3,2)"), err("#NUM!"), "type ngoài {0,1}")
        XCTAssertEqual(calc("CUMIPMT(0.1,12,1000,1,3)"), err("#VALUE!"), "thiếu đối số")
        // EFFECT / NOMINAL — 6 ca golden batch 5
        numNear("EFFECT(0.0525,4)", 0.05354266737075841, accuracy: 1e-9)
        numNear("EFFECT(0.1,12)", 0.10471306744129683, accuracy: 1e-9)
        numNear("NOMINAL(0.053543,4)", 0.052500319868356016, accuracy: 1e-9)
        numNear("NOMINAL(0.1,12)", 0.09568968514684517, accuracy: 1e-9)
        XCTAssertEqual(calc("EFFECT(0,4)"), err("#NUM!"), "lãi 0")
        XCTAssertEqual(calc("NOMINAL(0.1,0)"), err("#NUM!"), "nper 0")
        XCTAssertEqual(calc("EFFECT(-0.1,4)"), err("#NUM!"), "lãi âm")
        XCTAssertEqual(calc("EFFECT(0.1)"), err("#VALUE!"), "thiếu đối số")
        // FVSCHEDULE / ISPMT — 5 ca golden batch 5
        numNear("FVSCHEDULE(1,C1:C4)", 1.1922456000000001, accuracy: 1e-12, cells: fin, "1.05*1.04*1.06*1.03")
        numNear("ISPMT(0.1,1,3,8000000)", -533333.3333333334, accuracy: 1e-9)
        numNear("ISPMT(0.1,0,3,8000000)", -800000, accuracy: 1e-9)
        numNear("ISPMT(0.1,3,3,8000)", 0, accuracy: 1e-9)
        XCTAssertEqual(calc("ISPMT(0.1,1,0,8000)"), err("#DIV/0!"), "nper 0")
        XCTAssertEqual(calc("FVSCHEDULE(1,D1:D1)", fin), err("#VALUE!"), "lãi suất là chữ")
        // MIRR — 3 ca golden batch 5
        numNear("MIRR(A1:A5,0.1,0.12)", 0.20139202041968263, accuracy: 1e-9, cells: fin)
        numNear("MIRR(A1:A5,0.08,0.08)", 0.18689235215502342, accuracy: 1e-9, cells: fin)
        XCTAssertEqual(calc("MIRR(A2:A5,0.1,0.12)", fin), err("#DIV/0!"), "toàn dương")
        XCTAssertEqual(calc("MIRR(A1,0.1,0.12)", fin), err("#DIV/0!"), "một giá trị")
        // PDURATION / RRI — 6 ca golden batch 5
        numNear("PDURATION(0.025,2000,2200)", 3.859866162622655, accuracy: 1e-9)
        numNear("PDURATION(0.1,1000,500)", -7.272540897341714, accuracy: 1e-9)
        numNear("RRI(96,10000,11000)", 0.0009933073762913303, accuracy: 1e-12)
        XCTAssertEqual(calc("PDURATION(0,2000,2200)"), err("#NUM!"), "lãi 0")
        XCTAssertEqual(calc("RRI(0,10000,11000)"), err("#NUM!"), "nper 0")
        XCTAssertEqual(calc("RRI(5,0,100)"), err("#NUM!"), "pv 0")
        XCTAssertEqual(calc("RRI(5,100,-100)"), err("#NUM!"), "cơ số âm, mũ lẻ")
        // XNPV / XIRR — 7 ca golden batch 5 (sai số nới cho Newton)
        numNear("XNPV(0.09,A1:A5,B1:B5)", 695.8055650355681, accuracy: 1e-9, cells: fin)
        numNear("XNPV(0.1,A1:A5,B1:B5)", 685.178151493953, accuracy: 1e-9, cells: fin)
        numNear("XIRR(A1:A5,B1:B5)", 1.4315411210060125, accuracy: 1e-7, cells: fin)
        numNear("XIRR(A1:A5,B1:B5,0.5)", 1.4315411299467087, accuracy: 1e-7, cells: fin)
        XCTAssertEqual(calc("XNPV(0,A1:A5,B1:B5)", fin), err("#NUM!"), "lãi 0")
        XCTAssertEqual(calc("XNPV(-1,A1:A5,B1:B5)", fin), err("#NUM!"), "lãi âm")
        XCTAssertEqual(calc("XNPV(0.1,A1:A4,B1:B5)", fin), err("#NUM!"), "số ô lệch nhau")
        XCTAssertEqual(calc("XIRR(A2:A5,B2:B5)", fin), err("#NUM!"), "toàn dương")
        XCTAssertEqual(calc("XNPV(0.1,A1:A5,B1:B5)", finBadDate), err("#NUM!"), "ngày trước ngày đầu")
        // DOLLARDE / DOLLARFR — 9 ca golden batch 5
        numNear("DOLLARDE(1.02,16)", 1.125, accuracy: 1e-12)
        numNear("DOLLARDE(1.1,32)", 1.3125000000000002, accuracy: 1e-12)
        numNear("DOLLARDE(-1.02,16)", -1.125, accuracy: 1e-12)
        numNear("DOLLARFR(1.125,16)", 1.02, accuracy: 1e-12)
        numNear("DOLLARFR(1.125,32)", 1.04, accuracy: 1e-12)
        numNear("DOLLARFR(-1.125,16)", -1.02, accuracy: 1e-12)
        XCTAssertEqual(calc("DOLLARDE(1.02,0)"), err("#DIV/0!"), "mẫu số 0")
        XCTAssertEqual(calc("DOLLARDE(1.02,-1)"), err("#NUM!"), "mẫu số âm")
        XCTAssertEqual(calc("DOLLARFR(1.125,0)"), err("#DIV/0!"), "mẫu số 0")
        // IPMT/PPMT type = 1 — hồi quy (giá trị tính độc lập bằng Python từ
        // công thức FV, khớp golden CUMIPMT/CUMPRINC type = 1 của batch 5)
        numNear("IPMT(0.1,1,3,1000,0,1)", 0, accuracy: 1e-12)
        numNear("IPMT(0.1,2,3,1000,0,1)", -63.44410876132931, accuracy: 1e-9)
        numNear("IPMT(0.1,3,3,1000,0,1)", -33.23262839879157, accuracy: 1e-9)
        numNear("PPMT(0.1,1,3,1000,0,1)", -365.5589123867066, accuracy: 1e-9)
        numNear("PPMT(0.1,2,3,1000,0,1)", -302.1148036253773, accuracy: 1e-9)
        numNear("IPMT(0.1,2,3,1000,0,1)+PPMT(0.1,2,3,1000,0,1)", -365.5589123867066, accuracy: 1e-9)
    }
    func testDepreciationSecuritiesLat58() {
        // DDB / SYD / VDB — 23 ca golden batch 5
        numNear("DDB(2400,300,10,1)", 480)
        numNear("DDB(2400,300,10,2)", 384)
        numNear("DDB(2400,300,10,10)", 22.12254720000027, accuracy: 1e-9)
        numNear("DDB(2400,300,120,1,2)", 40)
        numNear("DDB(2400,300,10,2,1.5)", 306)
        numNear("DDB(2400,300,10,0.5)", 480, accuracy: 1e-12, "kỳ lẻ làm tròn lên")
        numNear("DDB(1000,100,5,3)", 144)
        XCTAssertEqual(calc("DDB(2400,300,10,11)"), err("#NUM!"), "kỳ vượt life")
        XCTAssertEqual(calc("DDB(2400,300,10,1,0)"), err("#NUM!"), "factor 0")
        XCTAssertEqual(calc("DDB(-2400,300,10,1)"), err("#NUM!"), "cost âm")
        XCTAssertEqual(calc("DDB(2400,300,10)"), err("#VALUE!"), "thiếu đối số")
        numNear("SYD(30000,7500,10,1)", 4090.909090909091, accuracy: 1e-9)
        numNear("SYD(30000,7500,10,10)", 409.09090909090907, accuracy: 1e-9)
        XCTAssertEqual(calc("SYD(30000,7500,10,11)"), err("#NUM!"), "kỳ vượt life")
        XCTAssertEqual(calc("SYD(30000,7500,10,0)"), err("#NUM!"), "kỳ 0")
        XCTAssertEqual(calc("SYD(30000,7500,0,1)"), err("#NUM!"), "life 0")
        numNear("VDB(2400,300,10,0,1)", 480)
        numNear("VDB(2400,300,10,0,10)", 2100)
        numNear("VDB(2400,300,10,2,5)", 749.568, accuracy: 1e-9)
        numNear("VDB(2400,300,120,0,0.875,1.5)", 26.25, accuracy: 1e-9)
        // TRUE/FALSE chỉ lệch nhau 4e-13 ở chữ số cuối → dung sai 1e-9 như lát 56
        numNear("VDB(2400,300,10,6,10,2,TRUE)", 329.1456000000005, accuracy: 1e-9)
        numNear("VDB(2400,300,10,6,10,2,FALSE)", 329.1456000000001, accuracy: 1e-9)
        numNear("VDB(2400,300,10,0,0.5)", 240)
        numNear("VDB(2400,300,10,3.5,6.2)", 497.22163200000006, accuracy: 1e-9)
        numNear("VDB(2400,300,10,0,1,3)", 720)
        numNear("VDB(2400,300,3,0,3)", 2100)
        numNear("VDB(2400,300,10,2,2)", 0, accuracy: 1e-12, "start = end → 0")
        XCTAssertEqual(calc("VDB(2400,300,10,5,11)"), err("#NUM!"), "end vượt life")
        XCTAssertEqual(calc("VDB(2400,300,10,5,2)"), err("#NUM!"), "end < start")
        XCTAssertEqual(calc("VDB(2400,300,10,0,1,0)"), err("#NUM!"), "factor 0")
        // DISC / INTRATE / RECEIVED — 13 ca golden batch 5
        numNear("DISC(DATE(2018,1,25),DATE(2018,6,15),97.975,100)", 0.05207142857142884, accuracy: 1e-12)
        numNear("DISC(DATE(2018,1,25),DATE(2018,6,15),97.975,100,1)", 0.05242021276595771, accuracy: 1e-12)
        numNear("DISC(DATE(2018,1,25),DATE(2018,6,15),97.975,100,2)", 0.05170212765957473, accuracy: 1e-12)
        numNear("DISC(DATE(2018,1,25),DATE(2018,6,15),97.975,100,3)", 0.05242021276595771, accuracy: 1e-12)
        numNear("DISC(DATE(2018,1,25),DATE(2018,6,15),97.975,100,4)", 0.05207142857142884, accuracy: 1e-12)
        XCTAssertEqual(calc("DISC(DATE(2018,6,15),DATE(2018,1,25),97.975,100)"), err("#NUM!"), "đảo ngày")
        XCTAssertEqual(calc("DISC(DATE(2018,1,25),DATE(2018,6,15),97.975,100,5)"), err("#NUM!"), "basis 5")
        XCTAssertEqual(calc("DISC(DATE(2018,1,25),DATE(2018,6,15),0,100)"), err("#NUM!"), "pr 0")
        numNear("INTRATE(DATE(2008,2,15),DATE(2008,5,15),1000000,1014420)", 0.05768, accuracy: 1e-12)
        numNear("INTRATE(DATE(2008,2,15),DATE(2008,5,15),1000000,1014420,2)", 0.05768, accuracy: 1e-12)
        numNear("INTRATE(DATE(2008,2,15),DATE(2008,5,15),1000000,1014420,1)", 0.05864133333333333, accuracy: 1e-12)
        numNear("RECEIVED(DATE(2008,2,15),DATE(2008,5,15),1000000,0.0575)", 1014584.6544071021, accuracy: 1e-9)
        numNear("RECEIVED(DATE(2008,2,15),DATE(2008,5,15),1000000,0.0575,2)", 1014584.6544071021, accuracy: 1e-9)
        numNear("RECEIVED(DATE(2008,2,15),DATE(2008,5,15),1000000,0.0575,1)", 1014342.1326127625, accuracy: 1e-9)
        // PRICEDISC / YIELDDISC — 5 ca golden batch 5
        numNear("PRICEDISC(DATE(2008,2,16),DATE(2008,3,1),0.0525,100)", 99.78125, accuracy: 1e-12)
        numNear("PRICEDISC(DATE(2008,2,16),DATE(2008,3,1),0.0525,100,2)", 99.79583333333333, accuracy: 1e-12)
        numNear("PRICEDISC(DATE(2008,2,16),DATE(2008,3,1),0.0525,100,1)", 99.79918032786885, accuracy: 1e-12)
        numNear("YIELDDISC(DATE(2008,2,16),DATE(2008,3,1),99.795,100)", 0.04930106718773444, accuracy: 1e-12)
        numNear("YIELDDISC(DATE(2008,2,16),DATE(2008,3,1),99.795,100,3)", 0.05355621882000915, accuracy: 1e-12)
        // TBILLPRICE / TBILLYIELD / TBILLEQ — 5 ca golden batch 5
        numNear("TBILLPRICE(DATE(2008,3,31),DATE(2008,6,1),0.09)", 98.45, accuracy: 1e-12)
        XCTAssertEqual(calc("TBILLPRICE(DATE(2008,3,31),DATE(2009,6,1),0.09)"), err("#NUM!"), "quá 365 ngày")
        numNear("TBILLYIELD(DATE(2008,3,31),DATE(2008,6,1),98.45)", 0.09141696292534264, accuracy: 1e-12)
        numNear("TBILLEQ(DATE(2008,3,31),DATE(2008,6,1),0.0914)", 0.09415149356594302, accuracy: 1e-12, "≤ 182 ngày")
        numNear("TBILLEQ(DATE(2008,1,1),DATE(2008,12,1),0.0914)", 0.09905080847249331, accuracy: 1e-9, "> 182 ngày, công thức bậc hai")
        XCTAssertEqual(calc("TBILLYIELD(DATE(2008,3,31),DATE(2008,6,1),0)"), err("#NUM!"), "pr 0")
        // ACCRINTM / PRICEMAT / YIELDMAT — 12 ca golden batch 5
        numNear("ACCRINTM(DATE(2008,4,1),DATE(2008,6,15),0.1,1000)", 20.555555555555554, accuracy: 1e-12)
        numNear("ACCRINTM(DATE(2008,4,1),DATE(2008,6,15),0.1,1000,3)", 20.54794520547945, accuracy: 1e-12)
        numNear("ACCRINTM(DATE(2008,4,1),DATE(2008,6,15),0.1,1000,1)", 20.491803278688526, accuracy: 1e-12)
        XCTAssertEqual(calc("ACCRINTM(DATE(2008,4,1),DATE(2008,6,15),0.1)"), err("#VALUE!"), "3 đối số")
        XCTAssertEqual(calc("ACCRINTM(DATE(2008,6,15),DATE(2008,4,1),0.1,1000)"), err("#NUM!"), "đảo ngày")
        numNear("PRICEMAT(DATE(2008,2,15),DATE(2008,4,13),DATE(2007,11,11),0.061,0.061)", 99.98449887555694, accuracy: 1e-9)
        numNear("PRICEMAT(DATE(2008,2,15),DATE(2008,4,13),DATE(2007,11,11),0.061,0.061,3)", 99.98459776456947, accuracy: 1e-9)
        numNear("PRICEMAT(DATE(2008,2,15),DATE(2008,4,13),DATE(2007,11,11),0.061,0.061,1)", 99.98459776456947, accuracy: 1e-9)
        numNear("PRICEMAT(DATE(2007,3,1),DATE(2007,9,30),DATE(2006,12,1),0.05,0.06,1)", 99.39447253855799, accuracy: 1e-9)
        numNear("PRICEMAT(DATE(2008,3,1),DATE(2009,3,1),DATE(2007,12,1),0.05,0.06,1)", 98.98884916257782, accuracy: 1e-9, "basis 1, năm nhuận 366")
        numNear("YIELDMAT(DATE(2007,3,1),DATE(2007,9,30),DATE(2006,12,1),0.05,98.5,1)", 0.0759069906009784, accuracy: 1e-9)
        numNear("YIELDMAT(DATE(2008,3,15),DATE(2008,11,3),DATE(2007,11,8),0.0625,100.0123)", 0.06095433369153867, accuracy: 1e-9)
        numNear("YIELDMAT(DATE(2008,3,15),DATE(2008,11,3),DATE(2007,11,8),0.0625,100.0123,1)", 0.060966685646493594, accuracy: 1e-9)
        XCTAssertEqual(calc("PRICEMAT(DATE(2008,4,13),DATE(2008,2,15),DATE(2007,11,11),0.061,0.061)"), err("#NUM!"), "settle ≥ maturity")
        XCTAssertEqual(calc("YIELDMAT(DATE(2008,3,15),DATE(2008,11,3),DATE(2008,4,1),0.0625,100.0123)"), err("#NUM!"), "issue > settle")
        XCTAssertEqual(calc("DISC(DATE(2018,1,25),DATE(2018,6,15),97.975,100,1.5)"), err("#NUM!"), "basis không nguyên")
    }

    /// Bang database dung chung cho nhom D* (khop fixture golden batch 8).
    var dbCells: [String: CellValue] {
        [
            "A1": s("Tree"),
            "B1": s("Height"),
            "C1": s("Age"),
            "D1": s("Yield"),
            "E1": s("Profit"),
            "G1": s("Tree"),
            "H1": s("Height"),
            "J1": s("Tree"),
            "K1": s("Height"),
            "M1": s("Tree"),
            "P1": s("Tree"),
            "A2": s("Apple"),
            "B2": n(18),
            "C2": n(20),
            "D2": n(14),
            "E2": n(105),
            "G2": s("Apple"),
            "H2": s(">10"),
            "J2": s("Apple"),
            "K2": s(">15"),
            "M2": s("A*"),
            "P2": s("="),
            "A3": s("Pear"),
            "B3": n(12),
            "C3": n(12),
            "D3": n(10),
            "E3": n(96),
            "G3": s("Pear"),
            "J3": s("Pear"),
            "K3": s("<10"),
            "A4": s("Cherry"),
            "B4": n(13),
            "C4": n(14),
            "D4": n(9),
            "E4": n(105),
            "G4": s("Tree"),
            "A5": s("Apple"),
            "B5": n(14),
            "C5": n(15),
            "D5": n(10),
            "E5": n(75),
            "G5": s("Pear"),
            "A6": s("Pear"),
            "B6": n(9),
            "C6": n(8),
            "D6": n(8),
            "E6": n(77),
            "G6": s("Cherry"),
            "A7": s("Apple"),
            "B7": n(8),
            "C7": n(9),
            "D7": n(6),
            "E7": n(45),
            "A8": s("Pear"),
            "B8": n(9),
            "C8": n(8),
            "D8": n(7),
            "E8": n(50),
            "G8": s("Height"),
            "H8": s("Age"),
            "G9": s(">12"),
            "H9": s("<20"),
        ]
    }

    func testDatabaseFunctionsLat57() {
        // 108 ca golden Excel 2016 batch 8 (DSUM/DAVERAGE/DCOUNT/DCOUNTA/DMAX/
        // DMIN/DPRODUCT/DGET/DVAR/DVARP/DSTDEV/DSTDEVP).
        numNear("DSUM(A1:E8,\"Yield\",G1:G2)", 30, accuracy: 1e-9, cells: dbCells)
        numNear("DSUM(A1:E8,\"Profit\",G1:H2)", 180, accuracy: 1e-9, cells: dbCells)
        numNear("DSUM(A1:E8,\"Height\",G4:G6)", 43, accuracy: 1e-9, cells: dbCells)
        numNear("DSUM(A1:E8,\"Age\",G8:H9)", 29, accuracy: 1e-9, cells: dbCells)
        numNear("DSUM(A1:E8,3,J1:K3)", 36, accuracy: 1e-9, cells: dbCells)
        numNear("DSUM(A1:E8,\"Yield\",M1:M2)", 30, accuracy: 1e-9, cells: dbCells)
        numNear("DSUM(A1:E8,\"Profit\",P1:P2)", 0, accuracy: 1e-9, cells: dbCells)
        numNear("DSUM(A1:E8,\"Yield\",G1:G3)", 55, accuracy: 1e-9, cells: dbCells)
        numNear("DAVERAGE(A1:E8,\"Yield\",G1:G2)", 10, accuracy: 1e-9, cells: dbCells)
        numNear("DAVERAGE(A1:E8,\"Profit\",G1:H2)", 90, accuracy: 1e-9, cells: dbCells)
        numNear("DAVERAGE(A1:E8,\"Height\",G4:G6)", 10.75, accuracy: 1e-9, cells: dbCells)
        numNear("DAVERAGE(A1:E8,\"Age\",G8:H9)", 14.5, accuracy: 1e-9, cells: dbCells)
        numNear("DAVERAGE(A1:E8,3,J1:K3)", 12, accuracy: 1e-9, cells: dbCells)
        numNear("DAVERAGE(A1:E8,\"Yield\",M1:M2)", 10, accuracy: 1e-9, cells: dbCells)
        XCTAssertEqual(calc("DAVERAGE(A1:E8,\"Profit\",P1:P2)", dbCells), err("#DIV/0!"))
        numNear("DAVERAGE(A1:E8,\"Yield\",G1:G3)", 9.166666666666666, accuracy: 1e-9, cells: dbCells)
        numNear("DCOUNT(A1:E8,\"Yield\",G1:G2)", 3, accuracy: 1e-9, cells: dbCells)
        numNear("DCOUNT(A1:E8,\"Profit\",G1:H2)", 2, accuracy: 1e-9, cells: dbCells)
        numNear("DCOUNT(A1:E8,\"Height\",G4:G6)", 4, accuracy: 1e-9, cells: dbCells)
        numNear("DCOUNT(A1:E8,\"Age\",G8:H9)", 2, accuracy: 1e-9, cells: dbCells)
        numNear("DCOUNT(A1:E8,3,J1:K3)", 3, accuracy: 1e-9, cells: dbCells)
        numNear("DCOUNT(A1:E8,\"Yield\",M1:M2)", 3, accuracy: 1e-9, cells: dbCells)
        numNear("DCOUNT(A1:E8,\"Profit\",P1:P2)", 0, accuracy: 1e-9, cells: dbCells)
        numNear("DCOUNT(A1:E8,\"Yield\",G1:G3)", 6, accuracy: 1e-9, cells: dbCells)
        numNear("DCOUNTA(A1:E8,\"Yield\",G1:G2)", 3, accuracy: 1e-9, cells: dbCells)
        numNear("DCOUNTA(A1:E8,\"Profit\",G1:H2)", 2, accuracy: 1e-9, cells: dbCells)
        numNear("DCOUNTA(A1:E8,\"Height\",G4:G6)", 4, accuracy: 1e-9, cells: dbCells)
        numNear("DCOUNTA(A1:E8,\"Age\",G8:H9)", 2, accuracy: 1e-9, cells: dbCells)
        numNear("DCOUNTA(A1:E8,3,J1:K3)", 3, accuracy: 1e-9, cells: dbCells)
        numNear("DCOUNTA(A1:E8,\"Yield\",M1:M2)", 3, accuracy: 1e-9, cells: dbCells)
        numNear("DCOUNTA(A1:E8,\"Profit\",P1:P2)", 0, accuracy: 1e-9, cells: dbCells)
        numNear("DCOUNTA(A1:E8,\"Yield\",G1:G3)", 6, accuracy: 1e-9, cells: dbCells)
        numNear("DMAX(A1:E8,\"Yield\",G1:G2)", 14, accuracy: 1e-9, cells: dbCells)
        numNear("DMAX(A1:E8,\"Profit\",G1:H2)", 105, accuracy: 1e-9, cells: dbCells)
        numNear("DMAX(A1:E8,\"Height\",G4:G6)", 13, accuracy: 1e-9, cells: dbCells)
        numNear("DMAX(A1:E8,\"Age\",G8:H9)", 15, accuracy: 1e-9, cells: dbCells)
        numNear("DMAX(A1:E8,3,J1:K3)", 20, accuracy: 1e-9, cells: dbCells)
        numNear("DMAX(A1:E8,\"Yield\",M1:M2)", 14, accuracy: 1e-9, cells: dbCells)
        numNear("DMAX(A1:E8,\"Profit\",P1:P2)", 0, accuracy: 1e-9, cells: dbCells)
        numNear("DMAX(A1:E8,\"Yield\",G1:G3)", 14, accuracy: 1e-9, cells: dbCells)
        numNear("DMIN(A1:E8,\"Yield\",G1:G2)", 6, accuracy: 1e-9, cells: dbCells)
        numNear("DMIN(A1:E8,\"Profit\",G1:H2)", 75, accuracy: 1e-9, cells: dbCells)
        numNear("DMIN(A1:E8,\"Height\",G4:G6)", 9, accuracy: 1e-9, cells: dbCells)
        numNear("DMIN(A1:E8,\"Age\",G8:H9)", 14, accuracy: 1e-9, cells: dbCells)
        numNear("DMIN(A1:E8,3,J1:K3)", 8, accuracy: 1e-9, cells: dbCells)
        numNear("DMIN(A1:E8,\"Yield\",M1:M2)", 6, accuracy: 1e-9, cells: dbCells)
        numNear("DMIN(A1:E8,\"Profit\",P1:P2)", 0, accuracy: 1e-9, cells: dbCells)
        numNear("DMIN(A1:E8,\"Yield\",G1:G3)", 6, accuracy: 1e-9, cells: dbCells)
        numNear("DPRODUCT(A1:E8,\"Yield\",G1:G2)", 840, accuracy: 1e-9, cells: dbCells)
        numNear("DPRODUCT(A1:E8,\"Profit\",G1:H2)", 7875, accuracy: 1e-9, cells: dbCells)
        numNear("DPRODUCT(A1:E8,\"Height\",G4:G6)", 12636, accuracy: 1e-9, cells: dbCells)
        numNear("DPRODUCT(A1:E8,\"Age\",G8:H9)", 210, accuracy: 1e-9, cells: dbCells)
        numNear("DPRODUCT(A1:E8,3,J1:K3)", 1280, accuracy: 1e-9, cells: dbCells)
        numNear("DPRODUCT(A1:E8,\"Yield\",M1:M2)", 840, accuracy: 1e-9, cells: dbCells)
        numNear("DPRODUCT(A1:E8,\"Profit\",P1:P2)", 0, accuracy: 1e-9, cells: dbCells)
        numNear("DPRODUCT(A1:E8,\"Yield\",G1:G3)", 470400, accuracy: 1e-9, cells: dbCells)
        XCTAssertEqual(calc("DGET(A1:E8,\"Yield\",G1:G2)", dbCells), err("#NUM!"))
        XCTAssertEqual(calc("DGET(A1:E8,\"Profit\",G1:H2)", dbCells), err("#NUM!"))
        XCTAssertEqual(calc("DGET(A1:E8,\"Height\",G4:G6)", dbCells), err("#NUM!"))
        XCTAssertEqual(calc("DGET(A1:E8,\"Age\",G8:H9)", dbCells), err("#NUM!"))
        XCTAssertEqual(calc("DGET(A1:E8,3,J1:K3)", dbCells), err("#NUM!"))
        XCTAssertEqual(calc("DGET(A1:E8,\"Yield\",M1:M2)", dbCells), err("#NUM!"))
        XCTAssertEqual(calc("DGET(A1:E8,\"Profit\",P1:P2)", dbCells), err("#VALUE!"))
        XCTAssertEqual(calc("DGET(A1:E8,\"Yield\",G1:G3)", dbCells), err("#NUM!"))
        numNear("DVAR(A1:E8,\"Yield\",G1:G2)", 16, accuracy: 1e-9, cells: dbCells)
        numNear("DVAR(A1:E8,\"Profit\",G1:H2)", 450, accuracy: 1e-9, cells: dbCells)
        numNear("DVAR(A1:E8,\"Height\",G4:G6)", 4.25, accuracy: 1e-9, cells: dbCells)
        numNear("DVAR(A1:E8,\"Age\",G8:H9)", 0.5, accuracy: 1e-9, cells: dbCells)
        numNear("DVAR(A1:E8,3,J1:K3)", 48, accuracy: 1e-9, cells: dbCells)
        numNear("DVAR(A1:E8,\"Yield\",M1:M2)", 16, accuracy: 1e-9, cells: dbCells)
        XCTAssertEqual(calc("DVAR(A1:E8,\"Profit\",P1:P2)", dbCells), err("#DIV/0!"))
        numNear("DVAR(A1:E8,\"Yield\",G1:G3)", 8.166666666666663, accuracy: 1e-9, cells: dbCells)
        numNear("DVARP(A1:E8,\"Yield\",G1:G2)", 10.666666666666666, accuracy: 1e-9, cells: dbCells)
        numNear("DVARP(A1:E8,\"Profit\",G1:H2)", 225, accuracy: 1e-9, cells: dbCells)
        numNear("DVARP(A1:E8,\"Height\",G4:G6)", 3.1875, accuracy: 1e-9, cells: dbCells)
        numNear("DVARP(A1:E8,\"Age\",G8:H9)", 0.25, accuracy: 1e-9, cells: dbCells)
        numNear("DVARP(A1:E8,3,J1:K3)", 32, accuracy: 1e-9, cells: dbCells)
        numNear("DVARP(A1:E8,\"Yield\",M1:M2)", 10.666666666666666, accuracy: 1e-9, cells: dbCells)
        XCTAssertEqual(calc("DVARP(A1:E8,\"Profit\",P1:P2)", dbCells), err("#DIV/0!"))
        numNear("DVARP(A1:E8,\"Yield\",G1:G3)", 6.805555555555555, accuracy: 1e-9, cells: dbCells)
        numNear("DSTDEV(A1:E8,\"Yield\",G1:G2)", 4, accuracy: 1e-9, cells: dbCells)
        numNear("DSTDEV(A1:E8,\"Profit\",G1:H2)", 21.213203435596427, accuracy: 1e-9, cells: dbCells)
        numNear("DSTDEV(A1:E8,\"Height\",G4:G6)", 2.0615528128088303, accuracy: 1e-9, cells: dbCells)
        numNear("DSTDEV(A1:E8,\"Age\",G8:H9)", 0.7071067811865476, accuracy: 1e-9, cells: dbCells)
        numNear("DSTDEV(A1:E8,3,J1:K3)", 6.928203230275509, accuracy: 1e-9, cells: dbCells)
        numNear("DSTDEV(A1:E8,\"Yield\",M1:M2)", 4, accuracy: 1e-9, cells: dbCells)
        XCTAssertEqual(calc("DSTDEV(A1:E8,\"Profit\",P1:P2)", dbCells), err("#DIV/0!"))
        numNear("DSTDEV(A1:E8,\"Yield\",G1:G3)", 2.8577380332470406, accuracy: 1e-9, cells: dbCells)
        numNear("DSTDEVP(A1:E8,\"Yield\",G1:G2)", 3.265986323710904, accuracy: 1e-9, cells: dbCells)
        numNear("DSTDEVP(A1:E8,\"Profit\",G1:H2)", 15, accuracy: 1e-9, cells: dbCells)
        numNear("DSTDEVP(A1:E8,\"Height\",G4:G6)", 1.7853571071357126, accuracy: 1e-9, cells: dbCells)
        numNear("DSTDEVP(A1:E8,\"Age\",G8:H9)", 0.5, accuracy: 1e-9, cells: dbCells)
        numNear("DSTDEVP(A1:E8,3,J1:K3)", 5.656854249492381, accuracy: 1e-9, cells: dbCells)
        numNear("DSTDEVP(A1:E8,\"Yield\",M1:M2)", 3.265986323710904, accuracy: 1e-9, cells: dbCells)
        XCTAssertEqual(calc("DSTDEVP(A1:E8,\"Profit\",P1:P2)", dbCells), err("#DIV/0!"))
        numNear("DSTDEVP(A1:E8,\"Yield\",G1:G3)", 2.6087459737497545, accuracy: 1e-9, cells: dbCells)
        numNear("DSUM(A1:E8,2,G1:G2)", 40, accuracy: 1e-9, cells: dbCells)
        XCTAssertEqual(calc("DSUM(A1:E8,0,G1:G2)", dbCells), err("#VALUE!"))
        XCTAssertEqual(calc("DSUM(A1:E8,9,G1:G2)", dbCells), err("#VALUE!"))
        XCTAssertEqual(calc("DSUM(A1:E8,\"Nope\",G1:G2)", dbCells), err("#VALUE!"))
        numNear("DCOUNT(A1:E8,2,G1:G2)", 3, accuracy: 1e-9, cells: dbCells)
        XCTAssertEqual(calc("DCOUNT(A1:E8,0,G1:G2)", dbCells), err("#VALUE!"))
        XCTAssertEqual(calc("DCOUNT(A1:E8,9,G1:G2)", dbCells), err("#VALUE!"))
        XCTAssertEqual(calc("DCOUNT(A1:E8,\"Nope\",G1:G2)", dbCells), err("#VALUE!"))
        XCTAssertEqual(calc("DGET(A1:E8,2,G1:G2)", dbCells), err("#NUM!"))
        XCTAssertEqual(calc("DGET(A1:E8,0,G1:G2)", dbCells), err("#VALUE!"))
        XCTAssertEqual(calc("DGET(A1:E8,9,G1:G2)", dbCells), err("#VALUE!"))
        XCTAssertEqual(calc("DGET(A1:E8,\"Nope\",G1:G2)", dbCells), err("#VALUE!"))
        // Ngoai golden.
        XCTAssertEqual(calc("DGET(A1:E8,\"Yield\",J1:K2)", dbCells), n(14), "DGET dung 1 hang")
        XCTAssertEqual(calc("DGET(A1:E8,\"Tree\",J1:K2)", dbCells), s("Apple"), "DGET tra chuoi")
        numNear("DSUM(A1:E8,\"yield\",G1:G2)", 30, accuracy: 1e-9, cells: dbCells, "field khong phan biet hoa/thuong")
        numNear("DSUM(A1:E8,\"Yield\",G1:G1)", 64, accuracy: 1e-9, cells: dbCells, "criteria chi co tieu de = khop tat ca")
        numNear("DCOUNTA(A1:E8,\"Tree\",G1:G2)", 3, accuracy: 1e-9, cells: dbCells, "DCOUNTA dem ca o chu")
        numNear("DSUM(A1:E8,\"Yield\",T1:T2)", 0, accuracy: 1e-9, cells: dbCells.merging(["T1": s("Nope"), "T2": s("x")]) { _, new in new }, "tieu chi cot la = khong khop")
        numNear("DSUM(A1:E8,\"Yield\",T1:T2)", 30, accuracy: 1e-9, cells: dbCells.merging(["T1": s("Tree"), "T2": s("App")]) { _, new in new }, "tieu chi van ban khop phan dau")
        numNear("DSUM(A1:E8,\"Yield\",T1:T2)", 0, accuracy: 1e-9, cells: dbCells.merging(["T1": s("Tree"), "T2": s("=A*")]) { _, new in new }, "\"=A*\" khong dung ky tu dai dien")
        numNear("DSUM(A1:E8,\"Yield\",T1:T2)", 34, accuracy: 1e-9, cells: dbCells.merging(["T1": s("Tree"), "T2": s("<>Apple")]) { _, new in new }, "tieu chi <>")
        numNear("DSUM(A1:E8,\"Yield\",T1:T2)", 14, accuracy: 1e-9, cells: dbCells.merging(["T1": s("Height"), "T2": n(18)]) { _, new in new }, "tieu chi so")
        numNear("DSUM(A1:E8,Z1,G1:G2)", 30, accuracy: 1e-9, cells: dbCells.merging(["Z1": s("Yield")]) { _, new in new }, "field la tham chieu o")
        XCTAssertEqual(calc("DSUM(A1:E8,\"Yield\")", dbCells), err("#VALUE!"), "thieu doi so")
        XCTAssertEqual(calc("DSUM(A1:E8,\"Yield\",G1:G2,1)", dbCells), err("#VALUE!"), "thua doi so")
        XCTAssertEqual(calc("DSUM(A1:B2,\"V\",D1:D2)", ["A1": s("K"), "B1": s("V"), "A2": s("x"), "B2": err("#N/A"), "D1": s("K"), "D2": s("x")]), err("#N/A"), "loi o cot field lan truyen")
        XCTAssertEqual(calc("DGET(A1:B2,\"V\",D1:D2)", ["A1": s("K"), "B1": s("V"), "A2": s("x"), "D1": s("K"), "D2": s("x")]), n(0), "DGET 1 hang, field trong -> 0")
    }

    func testCouponFunctionsLat59() {
        // 36 ca golden Excel 2016 batch 7 — nhom ngay coupon COUP*
        // COUPPCD — 4 ca golden
        numNear("COUPPCD(DATE(2011,1,25),DATE(2011,11,15),2,1)", 40497, accuracy: 1e-12)
        numNear("COUPPCD(DATE(2007,1,25),DATE(2008,11,15),1,0)", 39036, accuracy: 1e-12)
        numNear("COUPPCD(DATE(2011,2,10),DATE(2012,2,29),2,1)", 40421, accuracy: 1e-12)
        numNear("COUPPCD(DATE(2011,11,15),DATE(2013,11,15),2,1)", 40862, accuracy: 1e-12)
        // COUPNCD — 4 ca golden
        numNear("COUPNCD(DATE(2011,1,25),DATE(2011,11,15),2,1)", 40678, accuracy: 1e-12)
        numNear("COUPNCD(DATE(2007,1,25),DATE(2008,11,15),4,0)", 39128, accuracy: 1e-12)
        numNear("COUPNCD(DATE(2011,2,10),DATE(2012,2,29),2,1)", 40602, accuracy: 1e-12)
        // COUPNUM — 7 ca golden
        numNear("COUPNUM(DATE(2011,1,25),DATE(2011,11,15),2,1)", 2, accuracy: 1e-12)
        numNear("COUPNUM(DATE(2007,1,25),DATE(2008,11,15),2,1)", 4, accuracy: 1e-12)
        numNear("COUPNUM(DATE(2007,1,25),DATE(2008,11,15),1)", 2, accuracy: 1e-12)
        XCTAssertEqual(calc("COUPNUM(DATE(2011,1,25),DATE(2011,11,15),3,1)"), err("#NUM!"))
        XCTAssertEqual(calc("COUPNUM(DATE(2011,11,15),DATE(2011,1,25),2,1)"), err("#NUM!"))
        XCTAssertEqual(calc("COUPNUM(DATE(2011,1,25),DATE(2011,11,15),2,5)"), err("#NUM!"))
        XCTAssertEqual(calc("COUPNUM(DATE(2011,1,25),DATE(2011,1,25),2,1)"), err("#NUM!"))
        // COUPDAYBS — 7 ca golden
        numNear("COUPDAYBS(DATE(2011,1,25),DATE(2011,11,15),2,1)", 71, accuracy: 1e-12)
        numNear("COUPDAYBS(DATE(2011,1,25),DATE(2011,11,15),2,0)", 70, accuracy: 1e-12)
        numNear("COUPDAYBS(DATE(2011,1,25),DATE(2011,11,15),2,2)", 71, accuracy: 1e-12)
        numNear("COUPDAYBS(DATE(2011,1,25),DATE(2011,11,15),2,3)", 71, accuracy: 1e-12)
        numNear("COUPDAYBS(DATE(2011,1,25),DATE(2011,11,15),2,4)", 70, accuracy: 1e-12)
        numNear("COUPDAYBS(DATE(2011,2,10),DATE(2012,2,29),2,1)", 163, accuracy: 1e-12)
        numNear("COUPDAYBS(DATE(2012,5,15),DATE(2013,5,15),2,1)", 0, accuracy: 1e-12)
        // COUPDAYS — 8 ca golden
        numNear("COUPDAYS(DATE(2011,1,25),DATE(2011,11,15),2,1)", 181, accuracy: 1e-12)
        numNear("COUPDAYS(DATE(2011,1,25),DATE(2011,11,15),2,0)", 180, accuracy: 1e-12)
        numNear("COUPDAYS(DATE(2011,1,25),DATE(2011,11,15),2,2)", 180, accuracy: 1e-12)
        numNear("COUPDAYS(DATE(2011,1,25),DATE(2011,11,15),2,3)", 182.5, accuracy: 1e-12)
        numNear("COUPDAYS(DATE(2011,1,25),DATE(2011,11,15),2,4)", 180, accuracy: 1e-12)
        numNear("COUPDAYS(DATE(2011,2,10),DATE(2012,2,29),2,1)", 181, accuracy: 1e-12)
        numNear("COUPDAYS(DATE(2012,2,1),DATE(2012,8,1),2,1)", 182, accuracy: 1e-12)
        numNear("COUPDAYS(DATE(2012,2,1),DATE(2012,8,1),4,1)", 90, accuracy: 1e-12)
        // COUPDAYSNC — 6 ca golden
        numNear("COUPDAYSNC(DATE(2011,1,25),DATE(2011,11,15),2,1)", 110, accuracy: 1e-12)
        numNear("COUPDAYSNC(DATE(2011,1,25),DATE(2011,11,15),2,0)", 110, accuracy: 1e-12)
        numNear("COUPDAYSNC(DATE(2011,1,25),DATE(2011,11,15),2,2)", 110, accuracy: 1e-12)
        numNear("COUPDAYSNC(DATE(2011,1,25),DATE(2011,11,15),2,3)", 110, accuracy: 1e-12)
        numNear("COUPDAYSNC(DATE(2011,1,25),DATE(2011,11,15),2,4)", 110, accuracy: 1e-12)
        numNear("COUPDAYSNC(DATE(2011,2,10),DATE(2012,2,29),2,0)", 20, accuracy: 1e-12)
        // Ngoai golden.
        // Settlement dung ngay coupon -> pcd = settlement, ncd = ky tiep theo, so ky khong tinh ky hien tai.
        numNear("COUPPCD(DATE(2011,5,15),DATE(2011,11,15),2,1)", 40678, accuracy: 1e-12)
        numNear("COUPNUM(DATE(2011,5,15),DATE(2011,11,15),2,1)", 1, accuracy: 1e-12)
        numNear("COUPNUM(DATE(2011,11,15),DATE(2013,11,15),2,1)", 4, accuracy: 1e-12)
        // basis mac dinh = 0 khi bo trong.
        numNear("COUPDAYBS(DATE(2011,1,25),DATE(2011,11,15),2)", 70, accuracy: 1e-12)
        numNear("COUPDAYS(DATE(2011,1,25),DATE(2011,11,15),2)", 180, accuracy: 1e-12)
        // Loi doi so.
        XCTAssertEqual(calc("COUPPCD(DATE(2011,1,25),DATE(2011,11,15),2)"), n(40497), "basis mac dinh 0 nhung PCD khong doi")
        XCTAssertEqual(calc("COUPNUM(DATE(2011,1,25),DATE(2011,11,15))"), err("#VALUE!"), "thieu frequency")
        XCTAssertEqual(calc("COUPNUM(DATE(2011,1,25),DATE(2011,11,15),2,1,0)"), err("#VALUE!"), "thua doi so")
        XCTAssertEqual(calc("COUPNUM(DATE(2011,1,25),DATE(2011,11,15),2.5,1)"), err("#NUM!"), "frequency khong nguyen")
        XCTAssertEqual(calc("COUPNUM(DATE(2011,1,25),DATE(2011,11,15),2,1.5)"), err("#NUM!"), "basis khong nguyen")
        XCTAssertEqual(calc("COUPNUM(DATE(2011,1,25),DATE(2011,11,15),0,1)"), err("#NUM!"), "frequency 0")
        XCTAssertEqual(calc("COUPPCD(DATE(2011,11,15),DATE(2011,11,15),2,1)"), err("#NUM!"), "settlement = maturity")
    }

    func testBondPriceYieldDurationLat60() {
        // 14 ca PRICE golden Excel 2016 batch 7
        numNear("PRICE(DATE(2008,2,15),DATE(2017,11,15),0.0575,0.065,100,2,0)", 94.63436162132213, accuracy: 1e-9)
        numNear("PRICE(DATE(2008,2,15),DATE(2017,11,15),0.0575,0.065,100,2,1)", 94.6354492078772, accuracy: 1e-9)
        numNear("PRICE(DATE(2008,2,15),DATE(2017,11,15),0.0575,0.065,100,2,2)", 94.63656403002507, accuracy: 1e-9)
        numNear("PRICE(DATE(2008,2,15),DATE(2017,11,15),0.0575,0.065,100,2,3)", 94.63517479678454, accuracy: 1e-9)
        numNear("PRICE(DATE(2008,2,15),DATE(2017,11,15),0.0575,0.065,100,2,4)", 94.63436162132213, accuracy: 1e-9)
        numNear("PRICE(DATE(2008,2,15),DATE(2008,11,15),0.0575,0.065,100,2,0)", 99.4480220310011, accuracy: 1e-9)
        numNear("PRICE(DATE(2008,2,15),DATE(2008,5,15),0.05,0.06,100,4,1)", 99.7536945812808, accuracy: 1e-9)
        numNear("PRICE(DATE(2008,2,15),DATE(2009,2,15),0.05,0.04,100,1,1)", 100.96153846153845, accuracy: 1e-9)
        numNear("PRICE(DATE(2011,1,25),DATE(2011,11,15),0.08,0.07,105,2,1)", 105.4832519327389, accuracy: 1e-9)
        numNear("PRICE(DATE(2008,2,15),DATE(2020,2,15),0,0.05,100,2,0)", 55.28753541855118, accuracy: 1e-9)
        numNear("PRICE(DATE(2008,2,15),DATE(2017,11,15),0.0575,0,100,2,0)", 156.0625, accuracy: 1e-9)
        XCTAssertEqual(calc("PRICE(DATE(2008,2,15),DATE(2017,11,15),0.0575,0.065,100,3,0)"), err("#NUM!"), "frequency 3")
        XCTAssertEqual(calc("PRICE(DATE(2018,2,15),DATE(2017,11,15),0.0575,0.065,100,2,0)"), err("#NUM!"), "settlement > maturity")
        XCTAssertEqual(calc("PRICE(DATE(2008,2,15),DATE(2017,11,15),-0.01,0.065,100,2,0)"), err("#NUM!"), "rate am")
        // 6 ca YIELD golden. Dung sai 1e-9 (không phải 1e-12) vì YIELD của
        // Excel là nghiệm lặp: với ca basis 3, giá tại yield golden lệch
        // 3.9e-9 so với pr (nghiệm Decimal chính xác cao của cùng công thức
        // PRICE cho 0.06769567003611294, lệch golden 4.5e-12) — đó là dung
        // sai dừng của bộ giải Excel, không phải sai công thức: PRICE basis 3
        // khớp golden tuyệt đối, 4/5 ca YIELD còn lại khớp tới ~2e-14.
        numNear("YIELD(DATE(2008,2,15),DATE(2016,11,15),0.0575,95.04287,100,2,0)", 0.06500000688073143, accuracy: 1e-9)
        numNear("YIELD(DATE(2008,2,15),DATE(2016,11,15),0.0575,95.04287,100,2,1)", 0.06500182060552322, accuracy: 1e-9)
        numNear("YIELD(DATE(2008,2,15),DATE(2008,11,15),0.0575,99,100,2,0)", 0.07125361695454112, accuracy: 1e-9)
        numNear("YIELD(DATE(2008,2,15),DATE(2008,5,15),0.05,100.5,100,4,1)", 0.029850746268656966, accuracy: 1e-9)
        numNear("YIELD(DATE(2008,2,15),DATE(2020,2,15),0.08,110,100,2,3)", 0.06769567003159953, accuracy: 1e-9)
        XCTAssertEqual(calc("YIELD(DATE(2008,2,15),DATE(2016,11,15),0.0575,0,100,2,0)"), err("#NUM!"), "pr = 0")
        // 6 ca DURATION golden
        numNear("DURATION(DATE(2008,1,1),DATE(2016,1,1),0.08,0.09,2,1)", 5.993774955545186, accuracy: 1e-12)
        numNear("DURATION(DATE(2008,1,1),DATE(2016,1,1),0.08,0.09,2,0)", 5.993774955545186, accuracy: 1e-12)
        numNear("DURATION(DATE(2008,1,1),DATE(2016,1,1),0.08,0.09,1,3)", 6.149067886773246, accuracy: 1e-12)
        numNear("DURATION(DATE(2008,1,1),DATE(2016,1,1),0,0.09,2,1)", 8, accuracy: 1e-12)
        numNear("DURATION(DATE(2008,3,17),DATE(2013,8,2),0.05,0.04,4,4)", 4.736681203845893, accuracy: 1e-12)
        numNear("DURATION(DATE(2008,1,1),DATE(2008,12,31),0.08,0.09,2,1)", 0.977933094821614, accuracy: 1e-12)
        XCTAssertEqual(calc("DURATION(DATE(2008,1,1),DATE(2016,1,1),0.08,0.09,3,1)"), err("#NUM!"), "frequency 3")
        // 3 ca MDURATION golden
        numNear("MDURATION(DATE(2008,1,1),DATE(2016,1,1),0.08,0.09,2,1)", 5.735669813918839, accuracy: 1e-12)
        numNear("MDURATION(DATE(2008,1,1),DATE(2016,1,1),0.08,0.09,2,0)", 5.735669813918839, accuracy: 1e-12)
        numNear("MDURATION(DATE(2008,3,17),DATE(2013,8,2),0.05,0.04,4,4)", 4.689783370144449, accuracy: 1e-12)
        // Ngoai golden.
        // YIELD nguoc lai PRICE: gia 94.63436162132213 (basis 0) -> yld 0.065.
        numNear("YIELD(DATE(2008,2,15),DATE(2017,11,15),0.0575,94.63436162132213,100,2,0)", 0.065, accuracy: 1e-9)
        // MDURATION = DURATION / (1 + yld/frequency): kiem cheo truc tiep.
        numNear("MDURATION(DATE(2008,1,1),DATE(2016,1,1),0.08,0.09,2,1)*(1+0.09/2)", 5.993774955545186, accuracy: 1e-12)
        // basis mac dinh = 0 khi bo trong.
        numNear("PRICE(DATE(2008,2,15),DATE(2017,11,15),0.0575,0.065,100,2)", 94.63436162132213, accuracy: 1e-9)
        XCTAssertEqual(calc("PRICE(DATE(2008,2,15),DATE(2017,11,15),0.0575,0.065,100)"), err("#VALUE!"), "thieu frequency")
        XCTAssertEqual(calc("YIELD(DATE(2008,2,15),DATE(2016,11,15),0.0575,95.04287,100,2,5)"), err("#NUM!"), "basis 5")
    }

    func testAccrintLat60() {
        // 11 ca ACCRINT golden Excel 2016 batch 7
        numNear("ACCRINT(DATE(2008,3,1),DATE(2008,8,31),DATE(2008,5,1),0.1,1000,2,0)", 16.666666666666664, accuracy: 1e-9)
        numNear("ACCRINT(DATE(2008,3,1),DATE(2008,8,31),DATE(2008,5,1),0.1,1000,2,1)", 16.57608695652174, accuracy: 1e-9)
        numNear("ACCRINT(DATE(2008,3,1),DATE(2008,8,31),DATE(2008,5,1),0.1,1000,2,2)", 16.944444444444446, accuracy: 1e-9)
        numNear("ACCRINT(DATE(2008,3,1),DATE(2008,8,31),DATE(2008,5,1),0.1,1000,2,3)", 16.71232876712329, accuracy: 1e-9)
        numNear("ACCRINT(DATE(2008,3,1),DATE(2008,8,31),DATE(2008,5,1),0.1,1000,2,4)", 16.666666666666664, accuracy: 1e-9)
        numNear("ACCRINT(DATE(2008,3,1),DATE(2008,8,31),DATE(2008,10,1),0.1,1000,2,1)", 58.152173913043484, accuracy: 1e-9)
        numNear("ACCRINT(DATE(2008,3,1),DATE(2008,8,31),DATE(2008,10,1),0.1,1000,2,1,FALSE)", 58.152173913043484, accuracy: 1e-9)
        numNear("ACCRINT(DATE(2008,3,1),DATE(2008,8,31),DATE(2008,10,1),0.1,1000,2,0,FALSE)", 58.333333333333336, accuracy: 1e-9)
        numNear("ACCRINT(DATE(2007,3,1),DATE(2008,8,31),DATE(2009,5,1),0.06,1000,4,1)", 129.94565217391303, accuracy: 1e-9)
        XCTAssertEqual(calc("ACCRINT(DATE(2008,5,1),DATE(2008,8,31),DATE(2008,3,1),0.1,1000,2,0)"), err("#NUM!"), "settlement < issue")
        XCTAssertEqual(calc("ACCRINT(DATE(2008,3,1),DATE(2008,8,31),DATE(2008,5,1),0,1000,2,0)"), err("#NUM!"), "rate = 0")
        // Ngoai golden: loi doi so.
        XCTAssertEqual(calc("ACCRINT(DATE(2008,3,1),DATE(2008,8,31),DATE(2008,5,1),0.1,0,2,0)"), err("#NUM!"), "par = 0")
        XCTAssertEqual(calc("ACCRINT(DATE(2008,8,31),DATE(2008,8,31),DATE(2008,10,1),0.1,1000,2,0)"), err("#NUM!"), "first_interest = issue")
        XCTAssertEqual(calc("ACCRINT(DATE(2008,3,1),DATE(2008,8,31),DATE(2008,5,1),0.1,1000,3,0)"), err("#NUM!"), "frequency 3")
        numNear("ACCRINT(DATE(2008,3,1),DATE(2008,8,31),DATE(2008,5,1),0.1,1000,2,1,TRUE)", 16.57608695652174, accuracy: 1e-9, "calc_method TRUE tuong duong mac dinh")
        numNear("ACCRINT(DATE(2008,3,1),DATE(2008,8,31),DATE(2008,5,1),0.1,1000,2)", 16.666666666666664, accuracy: 1e-9, "basis mac dinh 0")
    }

    func testAmorLat61() {
        // 9 ca AMORLINC golden Excel 2016 batch 7
        numNear("AMORLINC(2400,DATE(2008,8,19),DATE(2008,12,31),300,1,0.15,1)", 360, accuracy: 1e-9)
        numNear("AMORLINC(2400,DATE(2008,8,19),DATE(2008,12,31),300,0,0.15,1)", 131.8032786885246, accuracy: 1e-9)
        numNear("AMORLINC(2400,DATE(2008,8,19),DATE(2008,12,31),300,2,0.15,1)", 360, accuracy: 1e-9)
        numNear("AMORLINC(2400,DATE(2008,8,19),DATE(2008,12,31),300,10,0.15,1)", 0, accuracy: 1e-9)
        numNear("AMORLINC(2400,DATE(2008,8,19),DATE(2008,12,31),300,6,0.15,1)", 168.19672131147536, accuracy: 1e-9)
        numNear("AMORLINC(2400,DATE(2008,8,19),DATE(2008,12,31),300,7,0.15,1)", 0, accuracy: 1e-9)
        numNear("AMORLINC(2400,DATE(2008,8,19),DATE(2008,12,31),300,1,0.15,0)", 360, accuracy: 1e-9)
        numNear("AMORLINC(2400,DATE(2008,8,19),DATE(2008,12,31),300,1,0.15,3)", 360, accuracy: 1e-9)
        XCTAssertEqual(calc("AMORLINC(2400,DATE(2008,8,19),DATE(2008,12,31),300,1,0.15,2)"), err("#NUM!"), "basis 2")
        // 11 ca AMORDEGRC golden Excel 2016 batch 7
        numNear("AMORDEGRC(2400,DATE(2008,8,19),DATE(2008,12,31),300,1,0.15,1)", 776, accuracy: 1e-9)
        numNear("AMORDEGRC(2400,DATE(2008,8,19),DATE(2008,12,31),300,0,0.15,1)", 330, accuracy: 1e-9)
        numNear("AMORDEGRC(2400,DATE(2008,8,19),DATE(2008,12,31),300,2,0.15,1)", 485, accuracy: 1e-9)
        numNear("AMORDEGRC(2400,DATE(2008,8,19),DATE(2008,12,31),300,3,0.15,1)", 303, accuracy: 1e-9)
        numNear("AMORDEGRC(2400,DATE(2008,8,19),DATE(2008,12,31),300,4,0.15,1)", 190, accuracy: 1e-9)
        numNear("AMORDEGRC(2400,DATE(2008,8,19),DATE(2008,12,31),300,5,0.15,1)", 158, accuracy: 1e-9)
        numNear("AMORDEGRC(2400,DATE(2008,8,19),DATE(2008,12,31),300,6,0.15,1)", 0, accuracy: 1e-9)
        numNear("AMORDEGRC(2400,DATE(2008,8,19),DATE(2008,12,31),300,1,0.3,1)", 902, accuracy: 1e-9)
        numNear("AMORDEGRC(2400,DATE(2008,8,19),DATE(2008,12,31),300,1,0.1,0)", 545, accuracy: 1e-9)
        numNear("AMORDEGRC(2400,DATE(2008,8,19),DATE(2008,12,31),300,3,0.1,4)", 307, accuracy: 1e-9)
        numNear("AMORDEGRC(2400,DATE(2008,8,19),DATE(2008,12,31),300,1,0.22,1)", 886, accuracy: 1e-9)
        // Ngoai golden: basis mac dinh 0, ky 0 basis 0, cost = 0, period cat le.
        numNear("AMORLINC(2400,DATE(2008,8,19),DATE(2008,12,31),300,1,0.15)", 360, accuracy: 1e-9, "basis mac dinh 0")
        numNear("AMORLINC(2400,DATE(2008,8,19),DATE(2008,12,31),300,0,0.15,0)", 132, accuracy: 1e-9, "ky 0 basis 0: 132/360*0.15*2400")
        numNear("AMORDEGRC(2400,DATE(2008,8,19),DATE(2008,12,31),300,0,0.15,0)", 330, accuracy: 1e-9, "ky 0 basis 0")
        numNear("AMORDEGRC(2400,DATE(2008,8,19),DATE(2008,12,31),300,0,0.3,1)", 395, accuracy: 1e-9, "ky 0 rate 0.3")
        numNear("AMORLINC(0,DATE(2008,8,19),DATE(2008,12,31),0,1,0.15,1)", 0, accuracy: 1e-9, "cost 0")
        numNear("AMORDEGRC(0,DATE(2008,8,19),DATE(2008,12,31),0,1,0.15,1)", 0, accuracy: 1e-9, "cost 0")
        numNear("AMORLINC(2400,DATE(2008,8,19),DATE(2008,12,31),300,1.5,0.15,1)", 360, accuracy: 1e-9, "period 1.5 cat le ve 1")
        // Loi doi so.
        XCTAssertEqual(calc("AMORLINC(-2400,DATE(2008,8,19),DATE(2008,12,31),300,1,0.15,1)"), err("#NUM!"), "cost am")
        XCTAssertEqual(calc("AMORLINC(2400,DATE(2008,8,19),DATE(2008,12,31),2500,1,0.15,1)"), err("#NUM!"), "salvage > cost")
        XCTAssertEqual(calc("AMORLINC(2400,DATE(2008,8,19),DATE(2008,12,31),-1,1,0.15,1)"), err("#NUM!"), "salvage am")
        XCTAssertEqual(calc("AMORLINC(2400,DATE(2008,8,19),DATE(2008,12,31),300,-1,0.15,1)"), err("#NUM!"), "period am")
        XCTAssertEqual(calc("AMORLINC(2400,DATE(2008,8,19),DATE(2008,12,31),300,1,0,1)"), err("#NUM!"), "rate = 0")
        XCTAssertEqual(calc("AMORLINC(2400,DATE(2008,12,31),DATE(2008,8,19),300,1,0.15,1)"), err("#NUM!"), "first < purchase")
        XCTAssertEqual(calc("AMORLINC(2400,DATE(2008,8,19),DATE(2008,12,31),300,1,0.15,5)"), err("#NUM!"), "basis 5")
        XCTAssertEqual(calc("AMORLINC(2400,DATE(2008,8,19),DATE(2008,12,31),300,1,0.15,1.5)"), err("#NUM!"), "basis khong nguyen")
        XCTAssertEqual(calc("AMORDEGRC(2400,DATE(2008,8,19),DATE(2008,12,31),300,1,0.15,2)"), err("#NUM!"), "AMORDEGRC basis 2")
        XCTAssertEqual(calc("AMORDEGRC(2400,DATE(2008,8,19),DATE(2008,12,31),300,1,-0.1,1)"), err("#NUM!"), "AMORDEGRC rate am")
        XCTAssertEqual(calc("AMORLINC(2400,DATE(2008,8,19),DATE(2008,12,31),300,1)"), err("#VALUE!"), "thieu rate")
        XCTAssertEqual(calc("AMORLINC(2400,DATE(2008,8,19),DATE(2008,12,31),300,1,0.15,1,1)"), err("#VALUE!"), "thua doi so")
    }

    // MARK: M7 lát 62 — SLN + ODDFPRICE/ODDFYIELD/ODDLPRICE/ODDLYIELD
    // ODDF*: ví dụ tài liệu Microsoft (ODDFPRICE basis 1 = 113.59771747407883)
    // + đối chiếu gói `formulas` 1.3.4 (29/31 ca wide). ODDL*: golden Excel
    // 2016 batch 9 (16 ca). SLN: LibreOffice 24.2.7.2. LibreOffice 24.2
    // KHÔNG tính được ODDF* (#VALUE! với mọi đối số) nên không dùng làm
    // oracle cho ODDF. Quy ước yld ≤ 0 / redemption ≤ 0 → #NUM! theo
    // `formulas`/ODF (tài liệu Microsoft chỉ ghi yld < 0 — chờ Excel thật #11).
    func testOddFirstLastAndSLNLat62() {
        // ODDFPRICE kỳ đầu ngắn — ví dụ Microsoft, đủ basis/frequency
        numNear("ODDFPRICE(DATE(2008,11,11),DATE(2021,3,1),DATE(2008,10,15),DATE(2009,3,1),0.0785,0.0625,100,2,1)", 113.59771747407883, accuracy: 1e-9, "vd MS basis 1")
        numNear("ODDFPRICE(DATE(2008,11,11),DATE(2021,3,1),DATE(2008,10,15),DATE(2009,3,1),0.0785,0.0625,100,2,0)", 113.59920582823823, accuracy: 1e-9, "basis 0")
        numNear("ODDFPRICE(DATE(2008,11,11),DATE(2021,3,1),DATE(2008,10,15),DATE(2009,3,1),0.0785,0.0625,100,2,4)", 113.59920582823823, accuracy: 1e-9, "basis 4")
        numNear("ODDFPRICE(DATE(2008,11,11),DATE(2021,3,1),DATE(2008,10,15),DATE(2009,3,1),0.0785,0.0625,100,2,2)", 113.59879960832528, accuracy: 1e-9, "basis 2")
        numNear("ODDFPRICE(DATE(2008,11,11),DATE(2021,3,1),DATE(2008,10,15),DATE(2009,3,1),0.0785,0.0625,100,2,3)", 113.59611259520489, accuracy: 1e-9, "basis 3")
        numNear("ODDFPRICE(DATE(2008,11,11),DATE(2021,3,1),DATE(2008,10,15),DATE(2009,3,1),0.0785,0.0625,100,1,1)", 113.49458554550696, accuracy: 1e-9, "freq 1")
        numNear("ODDFPRICE(DATE(2008,11,11),DATE(2021,3,1),DATE(2008,10,15),DATE(2009,3,1),0.0785,0.0625,100,4,1)", 113.65002161109066, accuracy: 1e-9, "freq 4")
        numNear("ODDFPRICE(DATE(2010,5,20),DATE(2015,11,15),DATE(2010,3,1),DATE(2010,11,15),0.05,0.04,100,2,1)", 104.8621838052361, accuracy: 1e-9, "ngan khac")
        numNear("ODDFPRICE(DATE(2010,5,20),DATE(2015,11,15),DATE(2010,3,1),DATE(2010,11,15),0.05,0.04,100,2,0)", 104.862096403318, accuracy: 1e-9, "ngan khac basis 0")
        numNear("ODDFPRICE(DATE(2008,10,16),DATE(2021,3,1),DATE(2008,10,15),DATE(2009,3,1),0.0785,0.0625,100,2,1)", 113.65792645725746, accuracy: 1e-9, "settlement = issue + 1 ngay")
        numNear("ODDFPRICE(DATE(2008,11,11),DATE(2021,3,1),DATE(2008,10,15),DATE(2009,3,1),0,0.0625,100,2,1)", 46.896796581656126, accuracy: 1e-9, "rate 0")
        // ODDFPRICE kỳ đầu dài — ranh giới DFC = E + nhiều vị trí settlement
        numNear("ODDFPRICE(DATE(2008,11,11),DATE(2021,3,1),DATE(2008,9,1),DATE(2009,3,1),0.0785,0.0625,100,2,1)", 113.58003983610452, accuracy: 1e-9, "ranh gioi DFC = E")
        numNear("ODDFPRICE(DATE(2008,6,15),DATE(2013,3,1),DATE(2008,1,15),DATE(2009,3,1),0.06,0.07,100,2,1)", 95.89556635559433, accuracy: 1e-9, "dai basis 1")
        numNear("ODDFPRICE(DATE(2008,6,15),DATE(2013,3,1),DATE(2008,1,15),DATE(2009,3,1),0.06,0.07,100,2,0)", 95.89581433521498, accuracy: 1e-9, "dai basis 0")
        numNear("ODDFPRICE(DATE(2008,6,15),DATE(2013,3,1),DATE(2008,1,15),DATE(2009,3,1),0.06,0.07,100,2,2)", 95.82487756244879, accuracy: 1e-9, "dai basis 2")
        numNear("ODDFPRICE(DATE(2008,6,15),DATE(2013,3,1),DATE(2008,1,15),DATE(2009,3,1),0.06,0.07,100,2,3)", 95.86966944845605, accuracy: 1e-9, "dai basis 3")
        numNear("ODDFPRICE(DATE(2008,6,15),DATE(2013,3,1),DATE(2008,1,15),DATE(2009,3,1),0.06,0.07,100,2,4)", 95.89581433521498, accuracy: 1e-9, "dai basis 4")
        numNear("ODDFPRICE(DATE(2008,2,10),DATE(2013,3,1),DATE(2008,1,15),DATE(2009,3,1),0.06,0.07,100,2,1)", 95.6589994090279, accuracy: 1e-9, "dai settlement som")
        numNear("ODDFPRICE(DATE(2008,10,20),DATE(2013,3,1),DATE(2008,1,15),DATE(2009,3,1),0.06,0.07,100,2,1)", 96.19095546276661, accuracy: 1e-9, "dai settlement muon")
        numNear("ODDFPRICE(DATE(2008,6,15),DATE(2013,3,1),DATE(2008,1,15),DATE(2009,3,1),0.06,0.07,100,1,1)", 96.02493943768819, accuracy: 1e-9, "dai freq 1")
        numNear("ODDFPRICE(DATE(2008,6,15),DATE(2013,3,1),DATE(2008,1,15),DATE(2009,3,1),0.06,0.07,100,4,1)", 95.82972007025843, accuracy: 1e-9, "dai freq 4")
        numNear("ODDFPRICE(DATE(2009,6,15),DATE(2015,3,1),DATE(2008,1,15),DATE(2010,3,1),0.06,0.07,100,2,1)", 94.92189838511285, accuracy: 1e-9, "dai NC = 4")
        // ODDFYIELD — vòng khứ hồi + ví dụ Microsoft
        numNear("ODDFYIELD(DATE(2008,11,11),DATE(2021,3,1),DATE(2008,10,15),DATE(2009,3,1),0.0785,113.59771747407883,100,2,1)", 0.0625, accuracy: 1e-9, "yield vd MS")
        numNear("ODDFYIELD(DATE(2008,11,11),DATE(2021,3,1),DATE(2008,10,15),DATE(2009,3,1),0.0785,113.597717,100,2,1)", 0.0625, accuracy: 1e-6, "yield gia lam tron 6 chu so")
        numNear("ODDFYIELD(DATE(2008,6,15),DATE(2013,3,1),DATE(2008,1,15),DATE(2009,3,1),0.06,95.89556635559433,100,2,1)", 0.07, accuracy: 1e-6, "yield ky dai")
        // ODDF lỗi
        XCTAssertEqual(calc("ODDFPRICE(DATE(2008,1,15),DATE(2013,3,1),DATE(2008,1,15),DATE(2009,3,1),0.06,0.07,100,2,1)"), err("#NUM!"), "settlement = issue")
        XCTAssertEqual(calc("ODDFPRICE(DATE(2009,3,1),DATE(2013,3,1),DATE(2008,1,15),DATE(2009,3,1),0.06,0.07,100,2,1)"), err("#NUM!"), "first_coupon = settlement")
        XCTAssertEqual(calc("ODDFPRICE(DATE(2008,11,11),DATE(2009,3,1),DATE(2008,10,15),DATE(2009,3,1),0.0785,0.0625,100,2,1)"), err("#NUM!"), "maturity = first_coupon")
        XCTAssertEqual(calc("ODDFPRICE(DATE(2008,11,11),DATE(2021,3,1),DATE(2008,10,15),DATE(2009,3,1),-0.01,0.0625,100,2,1)"), err("#NUM!"), "rate am")
        XCTAssertEqual(calc("ODDFPRICE(DATE(2008,11,11),DATE(2021,3,1),DATE(2008,10,15),DATE(2009,3,1),0.0785,-0.01,100,2,1)"), err("#NUM!"), "yld am")
        XCTAssertEqual(calc("ODDFPRICE(DATE(2008,11,11),DATE(2021,3,1),DATE(2008,10,15),DATE(2009,3,1),0.0785,0,100,2,1)"), err("#NUM!"), "yld = 0")
        XCTAssertEqual(calc("ODDFPRICE(DATE(2008,11,11),DATE(2021,3,1),DATE(2008,10,15),DATE(2009,3,1),0.0785,0.0625,0,2,1)"), err("#NUM!"), "redemption = 0")
        XCTAssertEqual(calc("ODDFPRICE(DATE(2008,11,11),DATE(2021,3,1),DATE(2008,10,15),DATE(2009,3,1),0.0785,0.0625,100,3,1)"), err("#NUM!"), "frequency 3")
        XCTAssertEqual(calc("ODDFPRICE(DATE(2008,11,11),DATE(2021,3,1),DATE(2008,10,15),DATE(2009,3,1),0.0785,0.0625,100,2,5)"), err("#NUM!"), "basis 5")
        XCTAssertEqual(calc("ODDFPRICE(DATE(2008,11,11),DATE(2021,3,1),DATE(2008,10,15),DATE(2009,3,1),0.0785,0.0625,100,2)"), calc("ODDFPRICE(DATE(2008,11,11),DATE(2021,3,1),DATE(2008,10,15),DATE(2009,3,1),0.0785,0.0625,100,2,0)"), "basis mac dinh 0")
        XCTAssertEqual(calc("ODDFPRICE(DATE(2008,11,11),DATE(2021,3,1),DATE(2008,10,15),DATE(2009,3,1),0.0785,0.0625,100)"), err("#VALUE!"), "thieu frequency")
        XCTAssertEqual(calc("ODDFPRICE(DATE(2008,11,11),DATE(2021,3,1),DATE(2008,10,15),DATE(2009,3,1),0.0785,0.0625,100,2,1,1)"), err("#VALUE!"), "thua doi so")
        XCTAssertEqual(calc("ODDFYIELD(DATE(2008,11,11),DATE(2021,3,1),DATE(2008,10,15),DATE(2009,3,1),0.0785,0,100,2,1)"), err("#NUM!"), "yield pr = 0")
        // ODDLPRICE — golden Excel 2016 batch 9 (10 ca số)
        numNear("ODDLPRICE(DATE(2008,2,7),DATE(2008,6,15),DATE(2007,10,15),0.0375,0.0405,100,2,0)", 99.87828601472134, accuracy: 1e-9, "golden b9 basis 0")
        numNear("ODDLPRICE(DATE(2008,2,7),DATE(2008,6,15),DATE(2007,10,15),0.0375,0.0405,100,2,2)", 99.87916768152911, accuracy: 1e-9, "golden b9 basis 2")
        numNear("ODDLPRICE(DATE(2008,2,7),DATE(2008,6,15),DATE(2007,10,15),0.0375,0.0405,100,2,3)", 99.87916768152911, accuracy: 1e-9, "golden b9 basis 3")
        numNear("ODDLPRICE(DATE(2008,2,7),DATE(2008,6,15),DATE(2007,10,15),0.0375,0.0405,100,2,4)", 99.87828601472134, accuracy: 1e-9, "golden b9 basis 4")
        numNear("ODDLPRICE(DATE(2008,2,7),DATE(2008,6,15),DATE(2007,10,15),0.0375,0.0405,100,2,1)", 99.87916768152911, accuracy: 1e-9, "golden b9 basis 1")
        numNear("ODDLPRICE(DATE(2008,2,7),DATE(2008,6,15),DATE(2007,10,15),0.0375,0.0405,100,1,1)", 99.87916768152911, accuracy: 1e-9, "golden b9 freq 1")
        numNear("ODDLPRICE(DATE(2008,2,7),DATE(2008,6,15),DATE(2007,12,15),0.05,0.06,100,2,0)", 99.63678561067593, accuracy: 1e-9, "golden b9 last khac")
        numNear("ODDLPRICE(DATE(2008,2,7),DATE(2008,6,15),DATE(2007,10,15),0,0.0405,100,2,0)", 98.58044164037855, accuracy: 1e-9, "golden b9 rate 0")
        numNear("ODDLPRICE(DATE(2008,2,7),DATE(2008,6,15),DATE(2007,10,15),0.0375,0.0405,105,2,0)", 104.80730809674027, accuracy: 1e-9, "golden b9 redemption 105")
        // ODDLYIELD — golden Excel 2016 batch 9 (5 ca số + 1 lỗi)
        numNear("ODDLYIELD(DATE(2008,4,20),DATE(2008,6,15),DATE(2007,12,24),0.0375,99.875,100,2,0)", 0.04519223562916916, accuracy: 1e-9, "golden b9 yield basis 0")
        numNear("ODDLYIELD(DATE(2008,4,20),DATE(2008,6,15),DATE(2007,12,24),0.0375,99.875,100,2,1)", 0.04517988549187201, accuracy: 1e-9, "golden b9 yield basis 1")
        numNear("ODDLYIELD(DATE(2008,4,20),DATE(2008,6,15),DATE(2007,12,24),0.0375,99.875,100,2,2)", 0.04517988549187201, accuracy: 1e-9, "golden b9 yield basis 2")
        numNear("ODDLYIELD(DATE(2008,4,20),DATE(2008,6,15),DATE(2007,12,24),0.0375,99.875,100,2,3)", 0.04517988549187201, accuracy: 1e-9, "golden b9 yield basis 3")
        numNear("ODDLYIELD(DATE(2008,4,20),DATE(2008,6,15),DATE(2007,12,24),0.0375,99.875,100,4,4)", 0.04519223562916916, accuracy: 1e-9, "golden b9 yield freq 4")
        // ODDL lỗi
        XCTAssertEqual(calc("ODDLPRICE(DATE(2008,2,7),DATE(2008,6,15),DATE(2008,3,15),0.05,0.06,100,2,0)"), err("#NUM!"), "golden b9 last > settlement")
        XCTAssertEqual(calc("ODDLYIELD(DATE(2008,4,20),DATE(2008,6,15),DATE(2007,12,24),0.0375,0,100,2,0)"), err("#NUM!"), "golden b9 pr = 0")
        XCTAssertEqual(calc("ODDLPRICE(DATE(2008,2,7),DATE(2008,6,15),DATE(2007,10,15),0.0375,0,100,2,0)"), err("#NUM!"), "oddl yld = 0")
        XCTAssertEqual(calc("ODDLPRICE(DATE(2008,2,7),DATE(2008,6,15),DATE(2007,10,15),0.0375,0.0405,0,2,0)"), err("#NUM!"), "oddl redemption = 0")
        XCTAssertEqual(calc("ODDLPRICE(DATE(2008,2,7),DATE(2008,6,15),DATE(2007,10,15),0.0375,0.0405,100,3,0)"), err("#NUM!"), "oddl frequency 3")
        XCTAssertEqual(calc("ODDLPRICE(DATE(2008,2,7),DATE(2008,6,15),DATE(2007,10,15),0.0375,0.0405,100,2)"), calc("ODDLPRICE(DATE(2008,2,7),DATE(2008,6,15),DATE(2007,10,15),0.0375,0.0405,100,2,0)"), "oddl basis mac dinh 0")
        // SLN — LibreOffice 24.2.7.2
        numNear("SLN(30000,7500,10)", 2250, accuracy: 1e-9, "vd MS")
        numNear("SLN(10000,0,5)", 2000, accuracy: 1e-9)
        numNear("SLN(10000,0,-5)", -2000, accuracy: 1e-9, "life am van tinh")
        numNear("SLN(-10000,0,5)", -2000, accuracy: 1e-9, "cost am van tinh")
        numNear("SLN(10000,20000,5)", -2000, accuracy: 1e-9, "salvage > cost van tinh")
        XCTAssertEqual(calc("SLN(10000,0,0)"), err("#DIV/0!"), "life = 0")
        XCTAssertEqual(calc("SLN(10000,0)"), err("#VALUE!"), "thieu life")
        XCTAssertEqual(calc("SLN(10000,0,5,1)"), err("#VALUE!"), "thua doi so")
    }

    // MARK: M7 lát 63 — DB (khấu hao số dư cố định)
    // Số: ví dụ tài liệu Microsoft (1.000.000/100.000/6 năm, month 7) +
    // đối chiếu LibreOffice 24.2.7.2 (39 ca probe, số khớp; LO trả #VALUE!
    // cho mọi lỗi đối số và trả 0 khi period > life với month = 12 — Swift
    // theo tài liệu Microsoft/engine JS: #NUM! cho các lỗi đó, chờ Excel
    // thật #11). period/month cắt phần lẻ (LO đồng ý; engine JS trả #NUM!).
    func testDBLat63() {
        // Ví dụ Microsoft — 7 kỳ, month 7
        numNear("DB(1000000,100000,6,1,7)", 186083.333333333, accuracy: 1e-6, "vd MS ky 1")
        numNear("DB(1000000,100000,6,2,7)", 259639.416666667, accuracy: 1e-6, "vd MS ky 2")
        numNear("DB(1000000,100000,6,3,7)", 176814.44275, accuracy: 1e-6, "vd MS ky 3")
        numNear("DB(1000000,100000,6,4,7)", 120410.63551275, accuracy: 1e-6, "vd MS ky 4")
        numNear("DB(1000000,100000,6,5,7)", 81999.6427841828, accuracy: 1e-6, "vd MS ky 5")
        numNear("DB(1000000,100000,6,6,7)", 55841.7567360285, accuracy: 1e-6, "vd MS ky 6")
        numNear("DB(1000000,100000,6,7,7)", 15845.0984738481, accuracy: 1e-6, "vd MS ky 7 cuoi")
        // month mặc định 12
        numNear("DB(1000000,100000,6,1)", 319000, accuracy: 1e-9, "month mac dinh ky 1")
        numNear("DB(1000000,100000,6,2)", 217239, accuracy: 1e-9, "month mac dinh ky 2")
        numNear("DB(1000000,100000,6,6)", 46722.5182806209, accuracy: 1e-6, "month mac dinh ky 6")
        // Đơn giản + month 6 (kỳ cuối life+1)
        numNear("DB(2400,300,10,1)", 451.2, accuracy: 1e-9, "2400/300 ky 1")
        numNear("DB(2400,300,10,2)", 366.3744, accuracy: 1e-9, "2400/300 ky 2")
        numNear("DB(2400,300,10,10)", 69.2425979675841, accuracy: 1e-9, "2400/300 ky 10")
        numNear("DB(10000,1000,5,1,12)", 3690, accuracy: 1e-9, "10000/1000 ky 1")
        numNear("DB(10000,1000,5,5,12)", 584.98375128849, accuracy: 1e-9, "10000/1000 ky 5")
        numNear("DB(10000,1000,5,1,6)", 1845, accuracy: 1e-9, "month 6 ky 1")
        numNear("DB(10000,1000,5,5,6)", 756.028921039245, accuracy: 1e-9, "month 6 ky 5")
        numNear("DB(10000,1000,5,6,6)", 238.527124587882, accuracy: 1e-9, "month 6 ky 6 cuoi")
        numNear("DB(10000,0,5,1)", 10000, accuracy: 1e-9, "salvage 0")
        numNear("DB(5000,500,3,3)", 576.99328, accuracy: 1e-9, "5000/500 ky 3")
        numNear("DB(100000,10000,10,1)", 20600, accuracy: 1e-9, "100000 ky 1")
        numNear("DB(100000,10000,10,10)", 2583.75745197641, accuracy: 1e-9, "100000 ky 10")
        // period/month/life cắt phần lẻ (tài liệu Microsoft + LibreOffice)
        numNear("DB(2400,300,10,1.9)", 451.2, accuracy: 1e-9, "period 1.9 -> 1")
        numNear("DB(10000,1000,5,2.5)", 2328.39, accuracy: 1e-9, "period 2.5 -> 2")
        numNear("DB(10000,1000,5,1,7.5)", 2152.5, accuracy: 1e-9, "month 7.5 -> 7")
        numNear("DB(10000,1000,6.5,1)", 2980, accuracy: 1e-9, "life 6.5 dung nguyen cho rate")
        XCTAssertEqual(calc("DB(1000000,100000,6,1)"), calc("DB(1000000,100000,6,1,12)"), "month mac dinh = 12")
        // Lỗi — #NUM! theo tài liệu Microsoft/engine JS
        XCTAssertEqual(calc("DB(0,0,5,1)"), err("#NUM!"), "cost = 0")
        XCTAssertEqual(calc("DB(10000,1000,0,1)"), err("#NUM!"), "life = 0")
        XCTAssertEqual(calc("DB(10000,1000,5,0)"), err("#NUM!"), "period = 0")
        XCTAssertEqual(calc("DB(10000,1000,5,6)"), err("#NUM!"), "period > life, month 12")
        XCTAssertEqual(calc("DB(1000000,100000,6,7)"), err("#NUM!"), "period 7 > life 6, month 12")
        XCTAssertEqual(calc("DB(10000,1000,5,7,6)"), err("#NUM!"), "period > life+1")
        XCTAssertEqual(calc("DB(-10000,1000,5,1)"), err("#NUM!"), "cost am")
        XCTAssertEqual(calc("DB(10000,-1000,5,1)"), err("#NUM!"), "salvage am")
        XCTAssertEqual(calc("DB(10000,20000,5,1)"), err("#NUM!"), "salvage > cost")
        XCTAssertEqual(calc("DB(10000,1000,5,1,0)"), err("#NUM!"), "month = 0")
        XCTAssertEqual(calc("DB(10000,1000,5,1,13)"), err("#NUM!"), "month = 13")
        XCTAssertEqual(calc("DB(10000,1000,-5,1)"), err("#NUM!"), "life am")
        XCTAssertEqual(calc("DB(10000,1000,5,-1)"), err("#NUM!"), "period am")
        XCTAssertEqual(calc("DB(10000,1000,5)"), err("#VALUE!"), "thieu period")
        XCTAssertEqual(calc("DB(10000,1000,5,1,12,1)"), err("#VALUE!"), "thua doi so")
    }
}
