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
        XCTAssertEqual(calc("XLOOKUP(1,A1:A2,B1:B2)", data), err("#NAME?"))
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
}
