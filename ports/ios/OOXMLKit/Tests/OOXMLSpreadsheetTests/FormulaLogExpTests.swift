import XCTest
@testable import OOXMLSpreadsheet

/// M7 lát 2: EXP / LN / LOG10 / LOG — quy ước Excel (xem FormulaFunctionsSlice2.logExp).
final class FormulaLogExpTests: XCTestCase {
    func n(_ d: Double) -> CellValue { .number(d) }
    func err(_ e: String) -> CellValue { .error(e) }

    func calc(_ formula: String, _ cells: [String: CellValue] = [:]) -> CellValue {
        let e = FormulaEngine()
        e.addSheet("Sheet1")
        for (k, v) in cells { e.setValue(v, sheet: "Sheet1", at: k) }
        e.setFormula(formula, sheet: "Sheet1", at: "Z99")
        e.recalculate()
        return e.value(sheet: "Sheet1", at: "Z99")
    }

    func approx(_ formula: String, _ expected: Double, _ cells: [String: CellValue] = [:]) {
        if case .number(let d) = calc(formula, cells) {
            XCTAssertEqual(d, expected, accuracy: 1e-9, "\(formula)")
        } else {
            XCTFail("\(formula) không trả số, được \(calc(formula, cells))")
        }
    }

    func testExp() {
        XCTAssertEqual(calc("EXP(0)"), n(1))
        approx("EXP(1)", 2.718281828459045)
        approx("EXP(2)", 7.38905609893065)
        approx("EXP(-1)", 0.36787944117144233)
        approx("EXP(A1)", 7.38905609893065, ["A1": n(2)])
    }

    func testExpErrors() {
        XCTAssertEqual(calc("EXP()"), err("#VALUE!"))
        XCTAssertEqual(calc("EXP(1,2)"), err("#VALUE!"))
        XCTAssertEqual(calc("EXP(\"abc\")"), err("#VALUE!"))
        XCTAssertEqual(calc("EXP(1000)"), err("#NUM!"))
        XCTAssertEqual(calc("EXP(#DIV/0!)"), err("#DIV/0!"), "lỗi lan truyền")
    }

    func testLn() {
        XCTAssertEqual(calc("LN(1)"), n(0))
        approx("LN(2.718281828459045)", 1)
        approx("LN(10)", 2.302585092994046)
        approx("LN(A1)", 1, ["A1": n(2.718281828459045)])
    }

    func testLnErrors() {
        XCTAssertEqual(calc("LN(0)"), err("#NUM!"))
        XCTAssertEqual(calc("LN(-5)"), err("#NUM!"))
        XCTAssertEqual(calc("LN()"), err("#VALUE!"))
        XCTAssertEqual(calc("LN(\"x\")"), err("#VALUE!"))
    }

    func testLog10() {
        XCTAssertEqual(calc("LOG10(1)"), n(0))
        XCTAssertEqual(calc("LOG10(100)"), n(2))
        XCTAssertEqual(calc("LOG10(1000)"), n(3))
        approx("LOG10(2)", 0.3010299956639812)
    }

    func testLog10Errors() {
        XCTAssertEqual(calc("LOG10(0)"), err("#NUM!"))
        XCTAssertEqual(calc("LOG10(-1)"), err("#NUM!"))
        XCTAssertEqual(calc("LOG10(1,2)"), err("#VALUE!"))
    }

    func testLog() {
        XCTAssertEqual(calc("LOG(100)"), n(2), "mặc định cơ số 10")
        XCTAssertEqual(calc("LOG(100,10)"), n(2))
        XCTAssertEqual(calc("LOG(8,2)"), n(3))
        XCTAssertEqual(calc("LOG(1,5)"), n(0))
        approx("LOG(9,3)", 2)
    }

    func testLogErrors() {
        XCTAssertEqual(calc("LOG(0,10)"), err("#NUM!"))
        XCTAssertEqual(calc("LOG(-8,2)"), err("#NUM!"))
        XCTAssertEqual(calc("LOG(100,1)"), err("#NUM!"), "cơ số 1")
        XCTAssertEqual(calc("LOG(100,0)"), err("#NUM!"))
        XCTAssertEqual(calc("LOG(100,-2)"), err("#NUM!"))
        XCTAssertEqual(calc("LOG()"), err("#VALUE!"))
        XCTAssertEqual(calc("LOG(1,2,3)"), err("#VALUE!"))
        XCTAssertEqual(calc("LOG(#N/A,2)"), err("#N/A"), "lỗi lan truyền")
    }
}
