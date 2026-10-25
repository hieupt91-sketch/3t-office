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
}
