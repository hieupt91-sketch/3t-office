import XCTest
@testable import OOXMLSpreadsheet

final class FormulaEvaluatorTests: XCTestCase {
    /// Tính một công thức tại Sheet1!Z99 với dữ liệu mẫu.
    func calc(_ formula: String, _ cells: [String: CellValue] = [:], other: [String: CellValue] = [:]) -> CellValue {
        let e = FormulaEngine()
        e.addSheet("Sheet1"); e.addSheet("Dữ liệu")
        for (k, v) in cells { e.setValue(v, sheet: "Sheet1", at: k) }
        for (k, v) in other { e.setValue(v, sheet: "Dữ liệu", at: k) }
        e.setFormula(formula, sheet: "Sheet1", at: "Z99")
        e.recalculate()
        return e.value(sheet: "Sheet1", at: "Z99")
    }
    let data: [String: CellValue] = [
        "A1": .number(1), "A2": .number(2), "A3": .number(3), "A4": .string("chữ"),
        "A5": .bool(true), "A6": .empty, "B1": .number(10), "B2": .string("5"),
    ]
    let err = { (s: String) in CellValue.error(s) }

    func testArithmetic() {
        XCTAssertEqual(calc("1+2*3"), .number(7))
        XCTAssertEqual(calc("(1+2)*3-4/2"), .number(7))
        XCTAssertEqual(calc("2^10"), .number(1024))
        XCTAssertEqual(calc("-2^2"), .number(4))
        XCTAssertEqual(calc("50%"), .number(0.5))
        XCTAssertEqual(calc("200*10%"), .number(20))
        XCTAssertEqual(calc("A1+A2", data), .number(3))
        XCTAssertEqual(calc("B2*2", data), .number(10), "chuỗi số được ép")
        XCTAssertEqual(calc("A5+1", data), .number(2), "TRUE = 1")
        XCTAssertEqual(calc("A6+1", data), .number(1), "ô rỗng = 0")
    }

    func testSumproduct() {
        let d: [String: CellValue] = [
            "A1": .number(1), "A2": .number(2), "A3": .number(3),
            "B1": .number(10), "B2": .number(20), "B3": .number(30),
            "C1": .number(5), "C2": .string("chữ"), "C3": .empty,
        ]
        XCTAssertEqual(calc("SUMPRODUCT(A1:A3,B1:B3)", d), .number(140), "1*10+2*20+3*30")
        XCTAssertEqual(calc("SUMPRODUCT(A1:A3)", d), .number(6), "một mảng = tổng tích đơn")
        XCTAssertEqual(calc("SUMPRODUCT(A1:A3,C1:C3)", d), .number(5), "chữ/rỗng trong mảng tính 0")
        XCTAssertEqual(calc("SUMPRODUCT(A1:A3,B1:B2)", d), err("#VALUE!"), "lệch kích thước")
        XCTAssertEqual(calc("SUMPRODUCT(2,3)"), .number(6), "toàn scalar")
        XCTAssertEqual(calc("SUMPRODUCT(A1:B1)", d), .number(11), "một mảng ngang: cộng từng ô 1 + 10")
    }

    func testXlookup() {
        let d: [String: CellValue] = [
            "A1": .number(1), "A2": .number(2), "A3": .number(3),
            "B1": .number(10), "B2": .number(20), "B3": .number(30),
            "E1": .string("táo"), "E2": .string("cam"), "E3": .string("xoài"),
            "F1": .number(7), "F2": .number(7), "F3": .number(9),
            "G1": .number(100), "G2": .number(200), "G3": .number(300),
        ]
        XCTAssertEqual(calc("XLOOKUP(2,A1:A3,B1:B3)", d), .number(20), "khớp đúng")
        XCTAssertEqual(calc("XLOOKUP(4,A1:A3,B1:B3)", d), err("#N/A"), "không thấy, không có if_not_found")
        XCTAssertEqual(calc("XLOOKUP(4,A1:A3,B1:B3,\"không có\")", d), .string("không có"), "if_not_found")
        XCTAssertEqual(calc("XLOOKUP(2.5,A1:A3,B1:B3,,-1)", d), .number(20), "match -1: nhỏ hơn gần nhất (tham số trống ở giữa)")
        XCTAssertEqual(calc("XLOOKUP(2.5,A1:A3,B1:B3,,1)", d), .number(30), "match 1: lớn hơn gần nhất")
        XCTAssertEqual(calc("XLOOKUP(7,F1:F3,G1:G3,,0,-1)", d), .number(200), "search -1: lấy khớp cuối")
        XCTAssertEqual(calc("XLOOKUP(\"c*\",E1:E3,B1:B3,,2)", d), .number(20), "match 2: ký tự đại diện")
        XCTAssertEqual(calc("XLOOKUP(10,A1:B1,A2:B2)", d), .number(20), "mảng ngang")
        XCTAssertEqual(calc("XLOOKUP(1,A1:A3,B1:B3)", d), .number(10), "đầu mảng")
    }

    func testEmptyArguments() {
        XCTAssertEqual(calc("SUM(1,,2)"), .number(3), "tham số trống ở giữa bị bỏ qua như Excel")
        XCTAssertEqual(calc("SUM(,1,2)"), .number(3), "tham số trống ở đầu")
        XCTAssertEqual(calc("IF(FALSE,,7)"), .number(7), "nhánh không chọn không bị ảnh hưởng")
        let d: [String: CellValue] = ["A1": .number(1), "B1": .number(10)]
        XCTAssertEqual(calc("XLOOKUP(9,A1:A1,B1:B1,,0)", d), .number(0), "if_not_found trống -> 0 khi không khớp")
    }

    func testLet() {
        XCTAssertEqual(calc("LET(x,5,x*2)"), .number(10), "gán một biến")
        XCTAssertEqual(calc("LET(x,5,y,x+3,y*2)"), .number(16), "biến sau dùng biến trước")
        XCTAssertEqual(calc("LET(X,5,x+1)"), .number(6), "tên không phân biệt hoa thường")
        XCTAssertEqual(calc("LET(x,2,LET(x,3,x))"), .number(3), "LET lồng: biến trong che biến ngoài")
        XCTAssertEqual(calc("LET(a,A1,a+B1)", data), .number(11), "giá trị từ ô")
        XCTAssertEqual(calc("LET(x,1/0,x)"), err("#DIV/0!"), "lỗi trong giá trị lan ra")
        XCTAssertEqual(calc("LET(x,5)"), err("#VALUE!"), "thiếu biểu thức cuối")
        XCTAssertEqual(calc("LET(1,2,3)"), err("#VALUE!"), "tên biến không phải định danh")
        XCTAssertEqual(calc("LET(x,5,y)"), err("#NAME?"), "dùng biến chưa gán")
    }

    func testWholeColumnAndRowRefs() {
        XCTAssertEqual(calc("SUM(A:A)", data), .number(6), "cả cột A: 1+2+3, chữ/bool trong vùng bị bỏ qua")
        XCTAssertEqual(calc("SUM(1:1)", data), .number(11), "cả hàng 1: A1 + B1")
        XCTAssertEqual(calc("SUM(A:B)", data), .number(16), "hai cột A:B")
        XCTAssertEqual(calc("AVERAGE(A:A)", data), .number(2), "trung bình cả cột")
        XCTAssertEqual(calc("COUNT(A:A)", data), .number(3), "đếm số trong cả cột")
        XCTAssertEqual(calc("SUM('Dữ liệu'!B:B)", [:], other: ["B1": .number(5), "B2": .number(7)]), .number(12), "cả cột ở sheet khác")
        XCTAssertEqual(calc("SUM($A:$A)", data), .number(6), "cột tuyệt đối")
    }

    func testArrayConstants() {
        XCTAssertEqual(calc("SUM({1,2,3})"), .number(6), "tổng hằng mảng ngang")
        XCTAssertEqual(calc("SUM({1;2;3})"), .number(6), "tổng hằng mảng dọc")
        XCTAssertEqual(calc("SUMPRODUCT({1,2,3},{4,5,6})"), .number(32), "SUMPRODUCT trên hằng: 4+10+18")
        XCTAssertEqual(calc("SUMPRODUCT({1,2},{3,4})"), .number(11), "1*3+2*4")
        XCTAssertEqual(calc("{1,2;3,4}"), err("#VALUE!"), "hằng 2D ở ngữ cảnh đơn vô vị trí")
        XCTAssertEqual(calc("{5}"), .number(5), "hằng 1x1 tự mở")
    }

    func testArrayFormulaCSE() {
        let e = FormulaEngine()
        e.addSheet("Sheet1")
        for (k, v) in data { e.setValue(v, sheet: "Sheet1", at: k) }
        e.setValue(.number(20), sheet: "Sheet1", at: "B2")
        e.setValue(.number(30), sheet: "Sheet1", at: "B3")
        e.setArrayFormula("A1:A3*B1:B3", sheet: "Sheet1", range: CellRange("C1:C3")!)
        e.setFormula("C2+1", sheet: "Sheet1", at: "D1")
        e.setArrayFormula("SUM(A1:A3)*B1:B2", sheet: "Sheet1", range: CellRange("E1:E2")!)
        e.setArrayFormula("{1;2;3}*10", sheet: "Sheet1", range: CellRange("F1:F3")!)
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "Sheet1", at: "C1"), .number(10), "CSE từng ô: A1*B1")
        XCTAssertEqual(e.value(sheet: "Sheet1", at: "C2"), .number(40), "CSE từng ô: A2*B2")
        XCTAssertEqual(e.value(sheet: "Sheet1", at: "C3"), .number(90), "CSE từng ô: A3*B3")
        XCTAssertEqual(e.value(sheet: "Sheet1", at: "D1"), .number(41), "ô thường đọc được ô mảng")
        XCTAssertEqual(e.value(sheet: "Sheet1", at: "E1"), .number(60), "hàm tổng hợp trong CSE không bị giao: SUM=6 * B1")
        XCTAssertEqual(e.value(sheet: "Sheet1", at: "E2"), .number(120), "SUM=6 * B2")
        XCTAssertEqual(e.value(sheet: "Sheet1", at: "F1"), .number(10), "hằng dọc trong CSE: phần tử 1")
        XCTAssertEqual(e.value(sheet: "Sheet1", at: "F3"), .number(30), "hằng dọc trong CSE: phần tử 3")
    }

    func testArithmeticErrors() {
        XCTAssertEqual(calc("1/0"), err("#DIV/0!"))
        XCTAssertEqual(calc("A1/A6", data), err("#DIV/0!"))
        XCTAssertEqual(calc("A4+1", data), err("#VALUE!"))
        XCTAssertEqual(calc("\"x\"*2"), err("#VALUE!"))
        XCTAssertEqual(calc("0^0"), err("#NUM!"))
        XCTAssertEqual(calc("(-8)^0.5"), err("#NUM!"))
        XCTAssertEqual(calc("A1:A3+1", data), err("#VALUE!"), "vùng nhiều ô ở ngữ cảnh đơn")
        XCTAssertEqual(calc("#N/A+1"), err("#N/A"))
        XCTAssertEqual(calc("1+#REF!"), err("#REF!"))
        XCTAssertEqual(calc("-#DIV/0!"), err("#DIV/0!"))
        XCTAssertEqual(calc("#N/A%"), err("#N/A"))
        XCTAssertEqual(calc("-\"abc\""), err("#VALUE!"))
        XCTAssertEqual(calc("\"abc\"%"), err("#VALUE!"))
    }

    func testComparisonAndConcat() {
        XCTAssertEqual(calc("1<2"), .bool(true))
        XCTAssertEqual(calc("2<=2"), .bool(true))
        XCTAssertEqual(calc("3>4"), .bool(false))
        XCTAssertEqual(calc("3>=4"), .bool(false))
        XCTAssertEqual(calc("3<>4"), .bool(true))
        XCTAssertEqual(calc("3=3"), .bool(true))
        XCTAssertEqual(calc("\"ABC\"=\"abc\""), .bool(true), "không phân biệt hoa thường")
        XCTAssertEqual(calc("\"a\"<\"b\""), .bool(true))
        XCTAssertEqual(calc("\"a\">5"), .bool(true), "chuỗi > số")
        XCTAssertEqual(calc("TRUE>\"z\""), .bool(true), "logic > chuỗi")
        XCTAssertEqual(calc("A6=0", data), .bool(true))
        XCTAssertEqual(calc("A6=\"\"", data), .bool(true))
        XCTAssertEqual(calc("A6=FALSE", data), .bool(true))
        XCTAssertEqual(calc("\"a\"&\"b\"&1&TRUE"), .string("abTRUE".replacingOccurrences(of: "ab", with: "ab1")))
        XCTAssertEqual(calc("1.5&\"\""), .string("1.5"))
        XCTAssertEqual(calc("1/3&\"\""), .string("0.333333333333333"))
        XCTAssertEqual(calc("#N/A&\"x\""), err("#N/A"))
        XCTAssertEqual(calc("#N/A=1"), err("#N/A"))
    }

    func testSum() {
        XCTAssertEqual(calc("SUM(A1:A3)", data), .number(6))
        XCTAssertEqual(calc("SUM(A1:A6)", data), .number(6), "bỏ chữ/logic/rỗng trong vùng")
        XCTAssertEqual(calc("SUM(A1,A2,10)", data), .number(13))
        XCTAssertEqual(calc("SUM(A4)", data), .number(0), "ô tham chiếu chữ bị bỏ qua")
        XCTAssertEqual(calc("SUM(TRUE,\"3\")"), .number(4), "đối số trực tiếp được ép")
        XCTAssertEqual(calc("SUM(\"abc\")"), err("#VALUE!"))
        XCTAssertEqual(calc("SUM()"), err("#VALUE!"))
        XCTAssertEqual(calc("SUM(A1:A2,#N/A)"), err("#N/A"))
        XCTAssertEqual(calc("SUM(A1:B1)", ["A1": .error("#DIV/0!"), "B1": .number(1)]), err("#DIV/0!"))
        XCTAssertEqual(calc("SUM('Dữ liệu'!A1:A2)", other: ["A1": .number(4), "A2": .number(5)]), .number(9))
        XCTAssertEqual(calc("SUM(Khong!A1)"), err("#REF!"))
        XCTAssertEqual(calc("sum(1,2)"), .number(3), "tên hàm không phân biệt hoa thường")
    }

    func testAverageMinMax() {
        XCTAssertEqual(calc("AVERAGE(A1:A3)", data), .number(2))
        XCTAssertEqual(calc("AVERAGE(A1:A6)", data), .number(2))
        XCTAssertEqual(calc("AVERAGE(A4:A6)", data), err("#DIV/0!"))
        XCTAssertEqual(calc("AVERAGE(1,\"x\")"), err("#VALUE!"))
        XCTAssertEqual(calc("AVERAGE()"), err("#VALUE!"))
        XCTAssertEqual(calc("MIN(A1:A3,0.5)", data), .number(0.5))
        XCTAssertEqual(calc("MAX(A1:A3,B1)", data), .number(10))
        XCTAssertEqual(calc("MIN(A4:A6)", data), .number(0), "không có số → 0")
        XCTAssertEqual(calc("MAX(A4)", data), .number(0))
        XCTAssertEqual(calc("MAX(-5,-2)"), .number(-2))
        XCTAssertEqual(calc("MIN(#REF!,1)"), err("#REF!"))
        XCTAssertEqual(calc("MAX(\"x\")"), err("#VALUE!"))
        XCTAssertEqual(calc("MIN()"), err("#VALUE!"))
        XCTAssertEqual(calc("MAX()"), err("#VALUE!"))
    }

    func testCountAndCountA() {
        XCTAssertEqual(calc("COUNT(A1:A6)", data), .number(3))
        XCTAssertEqual(calc("COUNT(A1:B2)", data), .number(3), "chuỗi số trong ô không đếm")
        XCTAssertEqual(calc("COUNT(1,\"3\",\"x\",TRUE)"), .number(3), "đối số trực tiếp: số, chuỗi số, logic")
        XCTAssertEqual(calc("COUNT(A1:A2,#N/A)", data), .number(2), "lỗi không đếm, không lan")
        XCTAssertEqual(calc("COUNT()"), err("#VALUE!"))
        XCTAssertEqual(calc("COUNTA(A1:A6)", data), .number(5))
        XCTAssertEqual(calc("COUNTA(A1:A2,1,\"\")", data), .number(4))
        XCTAssertEqual(calc("COUNTA(A1)", ["A1": .error("#N/A")]), .number(1), "lỗi vẫn đếm")
        XCTAssertEqual(calc("COUNTA()"), err("#VALUE!"))
    }

    func testIf() {
        XCTAssertEqual(calc("IF(A1>0,\"dương\",\"âm\")", data), .string("dương"))
        XCTAssertEqual(calc("IF(A1>5,1,2)", data), .number(2))
        XCTAssertEqual(calc("IF(FALSE,1)"), .bool(false))
        XCTAssertEqual(calc("IF(1,A2,A3)", data), .number(2), "trả về giá trị ô")
        XCTAssertEqual(calc("IF(\"TRUE\",1,2)"), .number(1))
        XCTAssertEqual(calc("IF(\"abc\",1,2)"), err("#VALUE!"))
        XCTAssertEqual(calc("IF(#N/A,1,2)"), err("#N/A"))
        XCTAssertEqual(calc("IF(TRUE,1,1/0)"), .number(1), "nhánh không chọn không tính")
        XCTAssertEqual(calc("IF(FALSE,1/0,7)"), .number(7))
        XCTAssertEqual(calc("IF(TRUE,1/0,7)"), err("#DIV/0!"))
        XCTAssertEqual(calc("IF(TRUE)"), err("#VALUE!"))
        XCTAssertEqual(calc("IF(1,2,3,4)"), err("#VALUE!"))
        XCTAssertEqual(calc("IF(A6,1,2)", data), .number(2), "ô rỗng = FALSE")
    }

    func testLogical() {
        XCTAssertEqual(calc("AND(TRUE,1,A1>0)", data), .bool(true))
        XCTAssertEqual(calc("AND(TRUE,0)"), .bool(false))
        XCTAssertEqual(calc("AND(A1:A3)", data), .bool(true))
        XCTAssertEqual(calc("AND(A1:A6)", data), .bool(true), "bỏ chữ/rỗng trong vùng")
        XCTAssertEqual(calc("AND(A4:A4)", data), err("#VALUE!"), "không có giá trị logic")
        XCTAssertEqual(calc("AND(\"x\")"), err("#VALUE!"))
        XCTAssertEqual(calc("AND(\"TRUE\")"), .bool(true))
        XCTAssertEqual(calc("AND(TRUE,#N/A)"), err("#N/A"))
        XCTAssertEqual(calc("AND()"), err("#VALUE!"))
        XCTAssertEqual(calc("OR(FALSE,0)"), .bool(false))
        XCTAssertEqual(calc("OR(FALSE,A2)", data), .bool(true))
        XCTAssertEqual(calc("OR(A6:A6)", data), err("#VALUE!"))
        XCTAssertEqual(calc("OR(#REF!)"), err("#REF!"))
        XCTAssertEqual(calc("OR()"), err("#VALUE!"))
        XCTAssertEqual(calc("NOT(TRUE)"), .bool(false))
        XCTAssertEqual(calc("NOT(0)"), .bool(true))
        XCTAssertEqual(calc("NOT(\"x\")"), err("#VALUE!"))
        XCTAssertEqual(calc("NOT(#N/A)"), err("#N/A"))
        XCTAssertEqual(calc("NOT(1,2)"), err("#VALUE!"))
    }

    func testRoundAbs() {
        XCTAssertEqual(calc("ROUND(2.5,0)"), .number(3))
        XCTAssertEqual(calc("ROUND(-2.5,0)"), .number(-3))
        XCTAssertEqual(calc("ROUND(2.675,2)"), .number(2.68), "như Excel (không dính lỗi nhị phân)")
        XCTAssertEqual(calc("ROUND(1234.567,-2)"), .number(1200))
        XCTAssertEqual(calc("ROUND(3.14159,3)"), .number(3.142))
        XCTAssertEqual(calc("ROUND(3.9,0.9)"), .number(4), "chữ số bị cắt về 0")
        XCTAssertEqual(calc("ROUND(\"x\",1)"), err("#VALUE!"))
        XCTAssertEqual(calc("ROUND(1,\"x\")"), err("#VALUE!"))
        XCTAssertEqual(calc("ROUND(#N/A,1)"), err("#N/A"))
        XCTAssertEqual(calc("ROUND(1,#REF!)"), err("#REF!"))
        XCTAssertEqual(calc("ROUND(1)"), err("#VALUE!"))
        XCTAssertEqual(calc("ABS(-3.5)"), .number(3.5))
        XCTAssertEqual(calc("ABS(A1-5)", data), .number(4))
        XCTAssertEqual(calc("ABS(\"x\")"), err("#VALUE!"))
        XCTAssertEqual(calc("ABS(#DIV/0!)"), err("#DIV/0!"))
        XCTAssertEqual(calc("ABS()"), err("#VALUE!"))
    }

    func testConcatenate() {
        XCTAssertEqual(calc("CONCATENATE(\"a\",1,TRUE,A4)", data), .string("a1TRUEchữ"))
        XCTAssertEqual(calc("CONCATENATE(A1)", data), .string("1"))
        XCTAssertEqual(calc("CONCATENATE(A1:A2)", data), err("#VALUE!"))
        XCTAssertEqual(calc("CONCATENATE(\"a\",#N/A)"), err("#N/A"))
        XCTAssertEqual(calc("CONCATENATE()"), err("#VALUE!"))
        XCTAssertEqual(calc("A4&\" \"&A1", data), .string("chữ 1"))
    }

    func testNamesAndUnknowns() {
        XCTAssertEqual(calc("FOO(1)"), err("#NAME?"))
        XCTAssertEqual(calc("TongDoanhThu+1"), err("#NAME?"))
        XCTAssertEqual(calc("NA()"), err("#N/A"))
        XCTAssertEqual(calc("NA(1)"), err("#VALUE!"))
        XCTAssertEqual(calc("1+"), err("#NAME?"), "cú pháp sai")
    }

    func testRoundHelperFallbackAndFormat() {
        XCTAssertEqual(FormulaEvaluator.round(1e20, digits: 0), 1e20)
        XCTAssertEqual(FormulaEvaluator.text(.number(1e20)), "1e+20")
        XCTAssertEqual(FormulaEvaluator.text(.number(-3)), "-3")
        XCTAssertEqual(FormulaEvaluator.text(.empty), "")
        XCTAssertEqual(FormulaEvaluator.text(.error("#N/A")), "#N/A")
    }
}
