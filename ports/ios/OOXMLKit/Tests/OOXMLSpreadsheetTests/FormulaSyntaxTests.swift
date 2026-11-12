import XCTest
@testable import OOXMLSpreadsheet

final class FormulaSyntaxTests: XCTestCase {
    func tok(_ s: String) throws -> [FormulaToken] { try FormulaTokenizer.tokenize(s) }

    func testTokenizeLiteralsAndOperators() throws {
        XCTAssertEqual(try tok("1.5E2+.5"), [.number(150), .op("+"), .number(0.5)])
        XCTAssertEqual(try tok("\"a\"\"b\"&TRUE"), [.string("a\"b"), .op("&"), .bool(true)])
        XCTAssertEqual(try tok("a<=b<>c>=d"), [.name("a"), .op("<="), .name("b"), .op("<>"), .name("c"), .op(">="), .name("d")])
        XCTAssertEqual(try tok("10%"), [.number(10), .percent])
        XCTAssertEqual(try tok("#DIV/0!"), [.error("#DIV/0!")])
        XCTAssertEqual(try tok("#n/a"), [.error("#N/A")])
    }

    func testTokenizeReferences() throws {
        XCTAssertEqual(try tok("$A$1:B2"), [.cell("$A$1"), .colon, .cell("B2")])
        XCTAssertEqual(try tok("'Sheet 1'!A1"), [.sheet("Sheet 1"), .cell("A1")])
        XCTAssertEqual(try tok("'O''Brien'!A1"), [.sheet("O'Brien"), .cell("A1")])
        XCTAssertEqual(try tok("Data!A1"), [.sheet("Data"), .cell("A1")])
        XCTAssertEqual(try tok("sum(A1,2)"), [.function("SUM"), .lparen, .cell("A1"), .comma, .number(2), .rparen])
        XCTAssertEqual(try tok("Doanh_Thu"), [.name("Doanh_Thu")])
        XCTAssertEqual(try tok("LOG10(1)").first, .function("LOG10"))
    }

    func testTokenizeErrors() {
        XCTAssertThrowsError(try tok("\"abc"))
        XCTAssertThrowsError(try tok("'Sheet A1"))
        XCTAssertThrowsError(try tok("'Sheet'A1"))
        XCTAssertThrowsError(try tok("#FOO!"))
        XCTAssertThrowsError(try tok("1 @ 2"))
    }

    func testParsePrecedence() throws {
        XCTAssertEqual(try FormulaParser.parse("=1+2*3"),
                       .binary("+", .number(1), .binary("*", .number(2), .number(3))))
        XCTAssertEqual(try FormulaParser.parse("(1+2)*3"),
                       .binary("*", .binary("+", .number(1), .number(2)), .number(3)))
        // Excel: dấu âm ưu tiên hơn ^  → -2^2 = (-2)^2
        XCTAssertEqual(try FormulaParser.parse("-2^2"),
                       .binary("^", .unary("-", .number(2)), .number(2)))
        // ^ kết hợp trái
        XCTAssertEqual(try FormulaParser.parse("2^3^2"),
                       .binary("^", .binary("^", .number(2), .number(3)), .number(2)))
        XCTAssertEqual(try FormulaParser.parse("1&2=3"),
                       .binary("=", .binary("&", .number(1), .number(2)), .number(3)))
        XCTAssertEqual(try FormulaParser.parse("50%"), .percent(.number(50)))
        XCTAssertEqual(try FormulaParser.parse("--1"), .unary("-", .unary("-", .number(1))))
    }

    func testParseReferencesAndCalls() throws {
        XCTAssertEqual(try FormulaParser.parse("$B$2"), .cell(sheet: nil, ref: CellReference(column: 2, row: 2)))
        XCTAssertEqual(try FormulaParser.parse("A1:B2"), .range(sheet: nil, range: CellRange("A1:B2")!))
        XCTAssertEqual(try FormulaParser.parse("'Dữ liệu'!C3:A1"), .range(sheet: "Dữ liệu", range: CellRange("A1:C3")!))
        XCTAssertEqual(try FormulaParser.parse("NOW()"), .call("NOW", []))
        XCTAssertEqual(try FormulaParser.parse("IF(A1,1,\"x\")"),
                       .call("IF", [.cell(sheet: nil, ref: "A1"), .number(1), .string("x")]))
        let e = try FormulaParser.parse("SUM(A1:A3,Data!B1)+C1")
        XCTAssertEqual(e.references.count, 3)
        XCTAssertEqual(e.references[1].sheet, "Data")
    }

    func testParseSyntaxErrors() {
        for bad in ["", "=", "1+", "(1", "1)", "SUM(1,", "SUM(1 2)", "A1:", "Data!5", "*2", "1 2", "A1:2"] {
            XCTAssertThrowsError(try FormulaParser.parse(bad), bad)
        }
    }

    func testArrayConstantSyntax() throws {
        XCTAssertEqual(try FormulaParser.parse("{1,2;3,4}"),
                       .array([[.number(1), .number(2)], [.number(3), .number(4)]]), "hằng mảng 2x2")
        XCTAssertEqual(try FormulaParser.parse("{1;2;3}"),
                       .array([[.number(1)], [.number(2)], [.number(3)]]), "cột hằng")
        XCTAssertEqual(try FormulaParser.parse("{-1,\"a\",TRUE,#N/A}"),
                       .array([[.number(-1), .string("a"), .bool(true), .error("#N/A")]]), "hằng hỗn hợp")
        XCTAssertThrowsError(try FormulaParser.parse("{1,2;3}"), "mảng không chữ nhật phải lỗi")
        XCTAssertThrowsError(try FormulaParser.parse("{1,A1}"), "tham chiếu trong hằng mảng phải lỗi")
    }

    // MARK: Tiền tố lưu trữ của Excel (_xlfn., _xlfn._xlws., _xlpm.)

    /// Trong tệp XLSX, Excel ghi hàm ra đời sau bản 2007 kèm `_xlfn.` và hàm mảng động kèm `_xlfn._xlws.`.
    /// Engine phải coi đó là cùng một hàm; trước đây trả #NAME? cho mọi hàm như vậy.
    func testStoragePrefixesAreStrippedFromFunctionNames() throws {
        XCTAssertEqual(FormulaTokenizer.canonicalFunctionName("_xlfn.STDEV.S"), "STDEV.S")
        XCTAssertEqual(FormulaTokenizer.canonicalFunctionName("_xlfn._xlws.FILTER"), "FILTER")
        XCTAssertEqual(FormulaTokenizer.canonicalFunctionName("_XLFN.ifs"), "IFS")
        XCTAssertEqual(FormulaTokenizer.canonicalFunctionName("sum"), "SUM")

        let engine = FormulaEngine()
        engine.addSheet("S")
        for (i, v) in [10.0, 20.0, 30.0, 40.0].enumerated() { engine.setValue(.number(v), sheet: "S", at: "A\(i + 1)") }
        engine.setFormula("_xlfn.STDEV.S(A1:A4)", sheet: "S", at: "B1")
        engine.setFormula("STDEV.S(A1:A4)", sheet: "S", at: "B2")
        engine.setFormula("_xlfn.IFS(A1>100,\"a\",A1>5,\"b\")", sheet: "S", at: "B3")
        engine.setFormula("_xlfn.TEXTJOIN(\"-\",TRUE,A1:A2)", sheet: "S", at: "B4")
        engine.setFormula("SUM(_xlfn._xlws.FILTER(A1:A4,A1:A4>15))", sheet: "S", at: "B5")
        engine.setFormula("_xlfn.XLOOKUP(30,A1:A4,A1:A4)", sheet: "S", at: "B6")
        engine.setFormula("SUM(_xlfn.MAP(A1:A4,_xlfn.LAMBDA(_xlpm.x,_xlpm.x*2)))", sheet: "S", at: "B7")
        engine.setFormula("_xlfn.NOSUCHFUNCTION(1)", sheet: "S", at: "B8")
        _ = engine.recalculate()
        XCTAssertEqual(engine.value(sheet: "S", at: "B1"), engine.value(sheet: "S", at: "B2"))
        guard case .number = engine.value(sheet: "S", at: "B1") else { return XCTFail("STDEV.S có tiền tố phải ra số") }
        XCTAssertEqual(engine.value(sheet: "S", at: "B3"), .string("b"))
        XCTAssertEqual(engine.value(sheet: "S", at: "B4"), .string("10-20"))
        XCTAssertEqual(engine.value(sheet: "S", at: "B5"), .number(90))
        XCTAssertEqual(engine.value(sheet: "S", at: "B6"), .number(30))
        XCTAssertEqual(engine.value(sheet: "S", at: "B7"), .number(200))
        XCTAssertEqual(engine.value(sheet: "S", at: "B8"), .error("#NAME?"), "hàm không tồn tại vẫn phải là #NAME?")
    }

    func testTrueFalseFunctionForms() throws {
        let engine = FormulaEngine()
        engine.addSheet("S")
        engine.setFormula("TRUE()", sheet: "S", at: "A1")
        engine.setFormula("FALSE()", sheet: "S", at: "A2")
        engine.setFormula("IF(TRUE(),1,2)+IF(FALSE(),10,20)", sheet: "S", at: "A3")
        engine.setFormula("TRUE(1)", sheet: "S", at: "A4")
        _ = engine.recalculate()
        XCTAssertEqual(engine.value(sheet: "S", at: "A1"), .bool(true))
        XCTAssertEqual(engine.value(sheet: "S", at: "A2"), .bool(false))
        XCTAssertEqual(engine.value(sheet: "S", at: "A3"), .number(21))
        guard case .error = engine.value(sheet: "S", at: "A4") else { return XCTFail("TRUE(1) phải là lỗi") }
    }
}
