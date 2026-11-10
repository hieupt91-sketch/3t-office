import XCTest
@testable import OOXMLSpreadsheet

/// M7 lát 15: NORM.S.DIST, NORM.DIST, NORM.S.INV, NORM.INV (phân phối chuẩn).
final class FormulaNormDistTests: XCTestCase {
    func n(_ d: Double) -> CellValue { .number(d) }
    func err(_ e: String) -> CellValue { .error(e) }

    func calc(_ formula: String) -> CellValue {
        let e = FormulaEngine()
        e.addSheet("Sheet1")
        e.setFormula(formula, sheet: "Sheet1", at: "Z99")
        e.recalculate()
        return e.value(sheet: "Sheet1", at: "Z99")
    }

    func num(_ formula: String) -> Double {
        if case .number(let d) = calc(formula) { return d }
        XCTFail("mong số, nhận \(calc(formula)) cho \(formula)")
        return .nan
    }

    func testNormSDistCumulative() {
        XCTAssertEqual(num("NORM.S.DIST(0,TRUE)"), 0.5, accuracy: 1e-12)
        XCTAssertEqual(num("NORM.S.DIST(1.96,TRUE)"), 0.9750021048517795, accuracy: 1e-9)
        XCTAssertEqual(num("NORM.S.DIST(-1,TRUE)"), 0.15865525393145707, accuracy: 1e-9)
        XCTAssertEqual(num("NORM.S.DIST(0,1)"), 0.5, accuracy: 1e-12, "cumulative dạng số 1")
    }

    func testNormSDistDensity() {
        XCTAssertEqual(num("NORM.S.DIST(0,FALSE)"), 0.3989422804014327, accuracy: 1e-9)
        XCTAssertEqual(num("NORM.S.DIST(1,FALSE)"), 0.24197072451914337, accuracy: 1e-9)
        XCTAssertEqual(num("NORM.S.DIST(-1,FALSE)"), 0.24197072451914337, accuracy: 1e-9, "đối xứng")
    }

    func testNormDist() {
        XCTAssertEqual(num("NORM.DIST(10,10,2,TRUE)"), 0.5, accuracy: 1e-12)
        XCTAssertEqual(num("NORM.DIST(12,10,2,TRUE)"), 0.8413447460685429, accuracy: 1e-9)
        XCTAssertEqual(num("NORM.DIST(10,10,2,FALSE)"), 0.19947114020071635, accuracy: 1e-9)
        XCTAssertEqual(calc("NORM.DIST(10,10,0,TRUE)"), err("#NUM!"), "sd = 0")
        XCTAssertEqual(calc("NORM.DIST(10,10,-2,TRUE)"), err("#NUM!"), "sd < 0")
    }

    func testNormSInv() {
        XCTAssertEqual(num("NORM.S.INV(0.5)"), 0, accuracy: 1e-9)
        XCTAssertEqual(num("NORM.S.INV(0.975)"), 1.959963984540054, accuracy: 1e-9)
        XCTAssertEqual(num("NORM.S.INV(0.025)"), -1.959963984540054, accuracy: 1e-9)
        XCTAssertEqual(num("NORM.S.INV(0.8413447460685429)"), 1, accuracy: 1e-9, "nghịch đảo của Φ(1)")
        XCTAssertEqual(calc("NORM.S.INV(0)"), err("#NUM!"), "p = 0")
        XCTAssertEqual(calc("NORM.S.INV(1)"), err("#NUM!"), "p = 1")
        XCTAssertEqual(calc("NORM.S.INV(1.5)"), err("#NUM!"), "p > 1")
    }

    func testNormInv() {
        XCTAssertEqual(num("NORM.INV(0.5,10,2)"), 10, accuracy: 1e-9)
        XCTAssertEqual(num("NORM.INV(0.975,10,2)"), 13.919927969080108, accuracy: 1e-9)
        XCTAssertEqual(num("NORM.INV(0.025,10,2)"), 6.080072030919892, accuracy: 1e-9)
        XCTAssertEqual(calc("NORM.INV(0.5,10,0)"), err("#NUM!"), "sd = 0")
        XCTAssertEqual(calc("NORM.INV(0,10,2)"), err("#NUM!"), "p = 0")
    }
}
