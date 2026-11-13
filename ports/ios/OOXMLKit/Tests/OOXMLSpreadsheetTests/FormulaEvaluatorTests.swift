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

    func testXmatch() {
        let d: [String: CellValue] = [
            "A1": .number(1), "A2": .number(2), "A3": .number(3),
            "B1": .number(10), "B2": .number(20), "B3": .number(30),
            "E1": .string("táo"), "E2": .string("cam"), "E3": .string("xoài"),
            "F1": .number(7), "F2": .number(7), "F3": .number(9),
            "H1": .number(3), "H2": .number(2), "H3": .number(1),
        ]
        XCTAssertEqual(calc("XMATCH(2,A1:A3)", d), .number(2), "khớp đúng")
        XCTAssertEqual(calc("XMATCH(4,A1:A3)", d), err("#N/A"), "không thấy")
        XCTAssertEqual(calc("XMATCH(2.5,A1:A3,-1)", d), .number(2), "match -1: nhỏ hơn gần nhất")
        XCTAssertEqual(calc("XMATCH(0.5,A1:A3,-1)", d), err("#N/A"), "match -1: không có gì nhỏ hơn")
        XCTAssertEqual(calc("XMATCH(2.5,A1:A3,1)", d), .number(3), "match 1: lớn hơn gần nhất")
        XCTAssertEqual(calc("XMATCH(4,A1:A3,1)", d), err("#N/A"), "match 1: không có gì lớn hơn")
        XCTAssertEqual(calc("XMATCH(\"c*\",E1:E3,2)", d), .number(2), "match 2: ký tự đại diện *")
        XCTAssertEqual(calc("XMATCH(\"t?o\",E1:E3,2)", d), .number(1), "match 2: ký tự đại diện ?")
        XCTAssertEqual(calc("XMATCH(\"TÁO\",E1:E3)", d), .number(1), "khớp chuỗi không phân biệt hoa thường")
        XCTAssertEqual(calc("XMATCH(7,F1:F3,0,-1)", d), .number(2), "search -1: lấy khớp cuối")
        XCTAssertEqual(calc("XMATCH(10,A1:B1)", d), .number(2), "mảng ngang")
        XCTAssertEqual(calc("XMATCH(2,A1:A3,0,2)", d), .number(2), "nhị phân tăng dần: khớp đúng")
        XCTAssertEqual(calc("XMATCH(2.5,A1:A3,-1,2)", d), .number(2), "nhị phân tăng dần: nhỏ hơn gần nhất")
        XCTAssertEqual(calc("XMATCH(2.5,A1:A3,1,2)", d), .number(3), "nhị phân tăng dần: lớn hơn gần nhất")
        XCTAssertEqual(calc("XMATCH(2,H1:H3,0,-2)", d), .number(2), "nhị phân giảm dần: khớp đúng")
        XCTAssertEqual(calc("XMATCH(2.5,H1:H3,-1,-2)", d), .number(2), "nhị phân giảm dần: nhỏ hơn gần nhất")
        XCTAssertEqual(calc("XMATCH(2.5,H1:H3,1,-2)", d), .number(1), "nhị phân giảm dần: lớn hơn gần nhất")
        XCTAssertEqual(calc("XMATCH(0.5,H1:H3,1,-2)", d), .number(3), "nhị phân giảm dần: lớn hơn gần nhất ở cuối")
        XCTAssertEqual(calc("XMATCH(2,A1:A3,3)", d), err("#VALUE!"), "match_mode ngoài miền")
        XCTAssertEqual(calc("XMATCH(2,A1:A3,0,3)", d), err("#VALUE!"), "search_mode ngoài miền")
        XCTAssertEqual(calc("XMATCH(2,A1:B2)", d), err("#VALUE!"), "lookup_array không phải vector")
        XCTAssertEqual(calc("XMATCH(\"c*\",E1:E3,2,2)", d), err("#VALUE!"), "ký tự đại diện + tìm nhị phân")
        XCTAssertEqual(calc("XMATCH(1/0,A1:A3)", d), err("#DIV/0!"), "lỗi trong khóa lan ra")
        XCTAssertEqual(calc("XMATCH(2,A1:A3,)", d), .number(2), "match_mode trống -> 0 = khớp đúng")
        XCTAssertEqual(calc("XMATCH(2,A1:A3,,)", d), err("#VALUE!"), "search_mode trống -> 0, ngoài miền (quy ước: đối số trống ép về 0 như XLOOKUP)")
    }

    func testWeekdayWeeknumNetworkdaysWorkday() {
        // Golden Excel 2016: batch13-common D1=45000 (2023-03-15 Thứ Tư), D2=45100;
        // batch4-misc: WEEKNUM các loại return_type.
        let d: [String: CellValue] = [
            "D1": .number(45000), "D2": .number(45100),
            "H1": .number(45293), "H2": .number(45294), // 2024-01-02, 2024-01-03
            "H3": .string("không phải ngày"), "H4": .empty,
        ]
        // WEEKDAY — golden: WEEKDAY(D1)=4, WEEKDAY(D1,2)=3
        XCTAssertEqual(calc("WEEKDAY(D1)", d), .number(4), "golden batch13: Thứ Tư, loại 1")
        XCTAssertEqual(calc("WEEKDAY(D1,2)", d), .number(3), "golden batch13: Thứ Tư, loại 2")
        XCTAssertEqual(calc("WEEKDAY(DATE(2024,1,1))"), .number(2), "2024-01-01 Thứ Hai, loại 1")
        XCTAssertEqual(calc("WEEKDAY(DATE(2024,1,1),2)"), .number(1), "loại 2: Thứ Hai = 1")
        XCTAssertEqual(calc("WEEKDAY(DATE(2024,1,1),3)"), .number(0), "loại 3: Thứ Hai = 0")
        XCTAssertEqual(calc("WEEKDAY(DATE(2024,1,7))"), .number(1), "Chủ nhật, loại 1")
        XCTAssertEqual(calc("WEEKDAY(DATE(2024,1,7),2)"), .number(7), "Chủ nhật, loại 2 = 7")
        XCTAssertEqual(calc("WEEKDAY(45000.9)", d), .number(4), "serial lẻ cắt phần thập phân")
        XCTAssertEqual(calc("WEEKDAY(0)"), .number(7), "serial 0 = Thứ Bảy theo cách đếm Excel")
        XCTAssertEqual(calc("WEEKDAY(60)"), .number(4), "serial 60 (29/02/1900 giả) = Thứ Tư")
        XCTAssertEqual(calc("WEEKDAY(\"2024-03-05\")"), .number(3), "chuỗi ngày hợp lệ")
        XCTAssertEqual(calc("WEEKDAY(DATE(2024,1,1),4)"), err("#NUM!"), "return_type ngoài miền")
        XCTAssertEqual(calc("WEEKDAY(\"không phải ngày\")"), err("#VALUE!"), "chuỗi không phải ngày")
        XCTAssertEqual(calc("WEEKDAY(-1)"), err("#NUM!"), "serial âm")
        // WEEKNUM — golden batch4
        XCTAssertEqual(calc("WEEKNUM(DATE(2024,1,1))"), .number(1), "golden: 2024-01-01 loại 1")
        XCTAssertEqual(calc("WEEKNUM(DATE(2024,1,1),2)"), .number(1), "golden: 2024-01-01 loại 2")
        XCTAssertEqual(calc("WEEKNUM(DATE(2024,12,31))"), .number(53), "golden: 2024-12-31 loại 1")
        XCTAssertEqual(calc("WEEKNUM(DATE(2024,12,31),2)"), .number(53), "golden: 2024-12-31 loại 2")
        XCTAssertEqual(calc("WEEKNUM(DATE(2023,1,1),2)"), .number(1), "golden: 2023-01-01 loại 2")
        XCTAssertEqual(calc("WEEKNUM(DATE(2024,3,5),11)"), .number(10), "golden: loại 11 (tuần bắt đầu Thứ Hai)")
        XCTAssertEqual(calc("WEEKNUM(DATE(2024,3,5),12)"), .number(11), "golden: loại 12 (Thứ Ba)")
        XCTAssertEqual(calc("WEEKNUM(DATE(2024,3,5),16)"), .number(10), "golden: loại 16 (Thứ Bảy)")
        XCTAssertEqual(calc("WEEKNUM(DATE(2024,3,5),17)"), .number(10), "golden: loại 17 (Chủ nhật)")
        XCTAssertEqual(calc("WEEKNUM(DATE(2024,3,5),21)"), .number(10), "golden: loại 21 (ISO)")
        XCTAssertEqual(calc("WEEKNUM(DATE(2024,3,5),3)"), err("#NUM!"), "golden: loại 3 ngoài miền")
        XCTAssertEqual(calc("WEEKNUM(DATE(2024,3,5),0)"), err("#NUM!"), "golden: loại 0 ngoài miền")
        XCTAssertEqual(calc("WEEKNUM(DATE(2023,1,1),21)"), .number(52), "ISO: 2023-01-01 thuộc tuần 52 của 2022")
        XCTAssertEqual(calc("WEEKNUM(DATE(2024,12,29),21)"), .number(52), "ISO: 2024-12-29 Chủ nhật = tuần 52")
        XCTAssertEqual(calc("WEEKNUM(DATE(2024,12,30),21)"), .number(1), "ISO: 2024-12-30 Thứ Hai = tuần 1 của 2025")
        XCTAssertEqual(calc("WEEKNUM(0)"), err("#NUM!"), "serial 0 không có tuần")
        XCTAssertEqual(calc("WEEKNUM(DATE(2024,3,5),22)"), err("#NUM!"), "loại 22 ngoài miền")
        // NETWORKDAYS — golden: NETWORKDAYS(D1,D2)=73
        XCTAssertEqual(calc("NETWORKDAYS(D1,D2)", d), .number(73), "golden batch13")
        XCTAssertEqual(calc("NETWORKDAYS(D2,D1)", d), .number(-73), "đảo đầu: đếm âm")
        XCTAssertEqual(calc("NETWORKDAYS(DATE(2024,1,1),DATE(2024,1,1))"), .number(1), "cùng ngày làm việc = 1")
        XCTAssertEqual(calc("NETWORKDAYS(DATE(2024,1,6),DATE(2024,1,6))"), .number(0), "cùng ngày Thứ Bảy = 0")
        XCTAssertEqual(calc("NETWORKDAYS(DATE(2024,1,1),DATE(2024,1,5),DATE(2024,1,1))"), .number(4), "lễ rơi vào ngày làm việc thì trừ")
        XCTAssertEqual(calc("NETWORKDAYS(DATE(2024,1,1),DATE(2024,1,5),H1:H2)", d), .number(3), "lễ theo vùng: trừ 2 ngày")
        XCTAssertEqual(calc("NETWORKDAYS(DATE(2024,1,1),DATE(2024,1,5),H3:H4)", d), .number(5), "lễ là chữ/rỗng: bỏ qua")
        // WORKDAY — golden: WORKDAY(D1,10)=45014
        XCTAssertEqual(calc("WORKDAY(D1,10)", d), .number(45014), "golden batch13")
        XCTAssertEqual(calc("WORKDAY(D1,0)", d), .number(45000), "days = 0: giữ nguyên start")
        XCTAssertEqual(calc("WORKDAY(D1,-1)", d), .number(44999), "lùi 1 ngày làm việc")
        XCTAssertEqual(calc("WORKDAY(DATE(2024,1,6),1)"), .number(45299), "Thứ Bảy +1 = Thứ Hai 2024-01-08")
        XCTAssertEqual(calc("WORKDAY(DATE(2024,1,6),0)"), .number(45297), "Thứ Bảy +0 = giữ nguyên Thứ Bảy")
        XCTAssertEqual(calc("WORKDAY(DATE(2024,1,1),1,DATE(2024,1,2))"), .number(45294), "bỏ qua lễ 2024-01-02")
        XCTAssertEqual(calc("WORKDAY(DATE(2024,1,1),2,H1:H2)", d), .number(45296), "lễ theo vùng: 01-01 +2 = 01-05")
        XCTAssertEqual(calc("WORKDAY(DATE(2024,1,1),10.9)"), .number(45306), "days lẻ cắt phần thập phân")
        XCTAssertEqual(calc("WORKDAY(\"không phải ngày\",1)"), err("#VALUE!"), "start không phải ngày")
        XCTAssertEqual(calc("WORKDAY(DATE(2024,1,1),\"x\")"), err("#VALUE!"), "days không phải số")
    }

    func testFinancialPmtFvPvNpvIrrRateNperIpmtPpmt() {
        // M7 lát 23: hàm tài chính. Giá trị đối chiếu tính độc lập bằng Python
        // (cùng công thức Excel); sai số cho phép 0,005 (tiền) / 1e-5 (lãi suất).
        func fin(_ formula: String, _ expected: Double, tol: Double = 0.005, cells: [String: CellValue] = [:], msg: String = "", _ file: StaticString = #filePath, _ line: UInt = #line) {
            let v = calc(formula, cells)
            guard case .number(let d) = v else {
                XCTFail("\(formula) trả \(v), mong số ≈ \(expected) \(msg)", file: file, line: line)
                return
            }
            XCTAssertEqual(d, expected, accuracy: tol, "\(formula) \(msg)", file: file, line: line)
        }
        let cash: [String: CellValue] = [
            "A1": .number(100), "A2": .number(200), "A3": .number(300), "A4": .string("chữ"),
            "B1": .number(-1000), "B2": .number(300), "B3": .number(400), "B4": .number(500),
            "C1": .number(-100), "C2": .number(110),
            "D1": .number(-100), "D2": .number(39), "D3": .number(59), "D4": .number(55), "D5": .number(20),
            "E1": .number(100), "E2": .number(200),
        ]
        // PMT — trả góp 10.000 trong 12 tháng, 8%/năm
        fin("PMT(0.08/12,12,10000)", -869.88)
        fin("PMT(0.1,10,100000)", -16274.54)
        fin("PMT(0,10,1000)", -100)
        fin("PMT(0.1,10,100000,0,1)", -14795.04, msg: "type = 1: trả đầu kỳ")
        fin("PMT(0.1,10,1000,0,)", -162.75, msg: "type trống -> 0")
        XCTAssertEqual(calc("PMT(0.1,0,1000)"), err("#NUM!"), "nper = 0")
        XCTAssertEqual(calc("PMT(-1,10,1000)"), err("#NUM!"), "rate = -1")
        XCTAssertEqual(calc("PMT(0.1,10,1000,0,2)"), err("#NUM!"), "type ngoài miền")
        XCTAssertEqual(calc("PMT(\"x\",10,1000)"), err("#VALUE!"), "rate không phải số")
        // FV
        fin("FV(0.05,10,-100,-1000)", 2886.68)
        fin("FV(0,10,-100)", 1000)
        fin("FV(0.05,10,-100)", 1257.79, "pv mặc định 0")
        XCTAssertEqual(calc("FV(-1,10,-100)"), err("#NUM!"), "rate = -1")
        // PV
        fin("PV(0.08,20,-1000)", 9818.15)
        fin("PV(0,10,-100)", 1000)
        fin("PV(0.1,10,-16274.54)", 100000, tol: 0.05, msg: "nghịch đảo PMT (PMT đã làm tròn 2 chữ số)")
        // NPV
        fin("NPV(0.1,100,200,300)", 481.59)
        fin("NPV(0.1,A1:A3)", 481.59, cells: cash, msg: "vùng")
        fin("NPV(0.1,A1:A4)", 481.59, cells: cash, msg: "chữ trong vùng bị bỏ qua")
        fin("NPV(0.1,-1000,300,400,500)", -19.12)
        XCTAssertEqual(calc("NPV(-1,100)"), err("#DIV/0!"), "rate = -1")
        XCTAssertEqual(calc("NPV(0.1,\"x\")"), err("#VALUE!"), "giá trị trực tiếp không phải số")
        // IRR
        fin("IRR(B1:B4)", 0.088963, tol: 0.00001, cells: cash)
        fin("IRR(B1:B4,0.5)", 0.088963, tol: 0.00001, cells: cash, msg: "guess khác vẫn cùng nghiệm")
        fin("IRR(C1:C2)", 0.1, tol: 0.000001, cells: cash, msg: "IRR(-100,110) = 10%")
        fin("IRR(D1:D5)", 0.280948, tol: 0.00001, cells: cash)
        XCTAssertEqual(calc("IRR(E1:E2)", cash), err("#NUM!"), "toàn dương: không có nghiệm")
        XCTAssertEqual(calc("IRR(B1)", cash), err("#NUM!"), "một giá trị")
        // RATE
        fin("RATE(12,-100,1000)", 0.029229, tol: 0.00001)
        fin("RATE(10,-16274.54,100000)", 0.1, tol: 0.00001, msg: "nghịch đảo PMT")
        fin("RATE(12,-100,1000,0,0,0.5)", 0.029229, tol: 0.00001, msg: "guess khác vẫn cùng nghiệm")
        XCTAssertEqual(calc("RATE(0,-100,1000)"), err("#NUM!"), "nper = 0")
        // NPER
        fin("NPER(0.1,-200,1000)", 7.27)
        fin("NPER(0,-100,1000)", 10)
        fin("NPER(0.05/12,-200,10000)", 56.18)
        XCTAssertEqual(calc("NPER(0.1,-100,1000)"), err("#NUM!"), "trả đúng bằng lãi: không bao giờ hết nợ")
        XCTAssertEqual(calc("NPER(0,0,1000)"), err("#NUM!"), "rate = 0, pmt = 0")
        // IPMT / PPMT — khoản vay 1.000, 10%/năm, 3 kỳ: PMT = -402,11
        fin("IPMT(0.1,1,3,1000)", -100)
        fin("IPMT(0.1,2,3,1000)", -69.79)
        fin("IPMT(0.1,3,3,1000)", -36.56)
        fin("IPMT(0,1,3,1000)", 0, msg: "rate = 0: không có lãi")
        XCTAssertEqual(calc("IPMT(0.1,0,3,1000)"), err("#NUM!"), "per = 0")
        XCTAssertEqual(calc("IPMT(0.1,4,3,1000)"), err("#NUM!"), "per > nper")
        fin("PPMT(0.1,1,3,1000)", -302.11)
        fin("PPMT(0.1,2,3,1000)", -332.33)
        fin("PPMT(0.1,3,3,1000)", -365.56)
        fin("PPMT(0.1,2,3,1000)+IPMT(0.1,2,3,1000)", -402.11, msg: "gốc + lãi = PMT")
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

    func testArrayFormulasInNormalContext() {
        // M7 lát 16 (INBOX-MAC #17): mảng trong công thức thường, giá trị từ golden Excel 2016.
        // golden-batch12-typical.json: B1:B4 / C1:C4.
        let d12: [String: CellValue] = [
            "B1": .number(1200000), "B2": .number(3500000), "B3": .number(1800000), "B4": .number(50000),
            "C1": .number(4), "C2": .number(1), "C3": .number(2), "C4": .number(100),
        ]
        XCTAssertEqual(calc("SUMPRODUCT((C1:C4>1)*B1:B4)", d12), .number(3050000),
                       "golden batch12: (C>1) -> 1200000 + 1800000 + 50000")
        XCTAssertEqual(calc("SUMPRODUCT((C1:C4>1)*1)", d12), .number(3),
                       "3 trong 4 ô C > 1")
        XCTAssertEqual(calc("SUM((C1:C4>1)*B1:B4)", d12), .number(3050000),
                       "SUM trên mảng so sánh cũng ra 3050000")
        // golden-batch16-array-functions.json: A1=1, B1=2, A2=3, B2=4.
        let d16: [String: CellValue] = [
            "A1": .number(1), "B1": .number(2), "A2": .number(3), "B2": .number(4),
        ]
        XCTAssertEqual(calc("SUM(IF(A1:B2>1,1,0))", d16), .number(3),
                       "golden batch16: 3 trong 4 ô > 1")
        XCTAssertEqual(calc("SUM(IF(A1:B2>1,A1:B2,0))", d16), .number(9),
                       "IF mảng với nhánh mảng: 2+3+4")
        XCTAssertEqual(calc("SUM(IF(A1:A2>1,10,0))", d16), .number(10),
                       "IF mảng dọc, nhánh scalar phát cho mọi ô")
        XCTAssertEqual(calc("COUNT(IF(A1:B2>1,1,0))", d16), .number(4),
                       "IF mảng trả 4 ô, COUNT đếm cả 0")
        XCTAssertEqual(calc("SUM((A1:A3>1)*B1:B3)", [
            "A1": .number(1), "A2": .number(2), "A3": .number(3),
            "B1": .number(10), "B2": .number(20), "B3": .number(30),
        ]), .number(50), "so sánh mảng * vùng: 0*10 + 1*20 + 1*30")
        XCTAssertEqual(calc("SUMPRODUCT(A1:A3,B1:B2)", [
            "A1": .number(1), "A2": .number(2), "A3": .number(3),
            "B1": .number(10), "B2": .number(20),
        ]), err("#VALUE!"), "lệch hình vẫn #VALUE!")
        XCTAssertEqual(calc("IF(A1>1,1,0)", d16), .number(0), "IF điều kiện đơn giữ đường cũ")
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

    func testWholeColumnAndRowRanges() {
        // M7 lát 33: vùng cả cột / cả hàng — parser đã có wholeColumnPair/wholeRowPair,
        // SUM/AVERAGE/MIN/MAX/COUNT đi qua nonEmptyValues (chỉ duyệt ô không rỗng).
        let col: [String: CellValue] = [
            "B1": .number(10), "B2": .number(20), "B3": .number(30),
            "B4": .string("chữ"), "B5": .empty,
        ]
        XCTAssertEqual(calc("SUM(B:B)", col), .number(60))
        XCTAssertEqual(calc("SUM($B:$B)", col), .number(60))
        XCTAssertEqual(calc("SUM(Sheet1!B:B)", col), .number(60), "vùng cả cột có tên sheet")
        XCTAssertEqual(calc("AVERAGE(B:B)", col), .number(20))
        XCTAssertEqual(calc("COUNT(B:B)", col), .number(3), "chuỗi/rỗng không đếm")
        XCTAssertEqual(calc("MIN(B:B)", col), .number(10))
        XCTAssertEqual(calc("MAX(B:B)", col), .number(30))
        XCTAssertEqual(calc("COUNTA(B:B)", col), .number(4), "chuỗi vẫn đếm, rỗng không")
        let row: [String: CellValue] = [
            "A1": .number(1), "B1": .number(10), "A2": .number(2), "B2": .number(20),
        ]
        XCTAssertEqual(calc("SUM(1:1)", row), .number(11))
        XCTAssertEqual(calc("SUM($1:$1)", row), .number(11), "'$' trước số hàng cũng là vùng cả hàng")
        XCTAssertEqual(calc("SUM(2:2)", row), .number(22))
        XCTAssertEqual(calc("AVERAGE(1:1)", row), .number(5.5))
        XCTAssertEqual(calc("COUNT(1:1)", row), .number(2))
        XCTAssertEqual(calc("SUM(Sheet1!1:1)", row), .number(11), "vùng cả hàng có tên sheet")
        XCTAssertEqual(calc("SUM(Sheet1!$1:$1)", row), .number(11), "vùng cả hàng có tên sheet + '$'")
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
        // M7 lát 30: Excel General viết "1E+20" (E hoa, mũ có dấu) — golden-batch14.
        XCTAssertEqual(FormulaEvaluator.text(.number(1e20)), "1E+20")
        XCTAssertEqual(FormulaEvaluator.text(.number(-3)), "-3")
        XCTAssertEqual(FormulaEvaluator.text(.empty), "")
        XCTAssertEqual(FormulaEvaluator.text(.error("#N/A")), "#N/A")
    }
}
