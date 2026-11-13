import XCTest
@testable import OOXMLSpreadsheet

/// Chỉ mục vùng của engine công thức: đọc/tính phụ thuộc theo vùng dùng tìm nhị phân, phải cho đúng kết quả như
/// quét toàn bộ và phải cập nhật khi đầu vào đổi (hủy chỉ mục).
final class FormulaEngineScaleTests: XCTestCase {
    func testRangeIndexMatchesBruteForceAndTracksEdits() {
        let e = FormulaEngine(sheets: [(name: "S", cells: [:]), (name: "T", cells: [:])])
        // Ô thưa, nhiều cột, có ô ngoài vùng, và vùng tham chiếu sang sheet khác.
        for r in stride(from: 1, through: 200, by: 3) { e.setValue(.number(Double(r)), sheet: "S", at: "A\(r)") }
        for r in stride(from: 2, through: 200, by: 5) { e.setValue(.number(Double(r) * 10), sheet: "S", at: "C\(r)") }
        e.setValue(.string("x"), sheet: "S", at: "B7")
        e.setFormula("SUM(A1:A200)", sheet: "S", at: "E1")
        e.setFormula("SUM(A10:C50)", sheet: "S", at: "E2")
        e.setFormula("COUNTA(A1:C200)", sheet: "S", at: "E3")
        e.setFormula("SUM(S!C1:C100)+S!E1", sheet: "T", at: "A1")
        e.setFormula("SUM(E1:E3)", sheet: "S", at: "E4") // phụ thuộc vào các ô công thức
        e.recalculate()

        func sumA(_ range: ClosedRange<Int>, col: Int = 1) -> Double {
            (range).filter { $0 % 3 == 1 && col == 1 || $0 % 5 == 2 && col == 3 }.reduce(0) { $0 + Double($1) * (col == 3 ? 10 : 1) }
        }
        let a200 = sumA(1...200)
        XCTAssertEqual(e.value(sheet: "S", at: "E1"), .number(a200))
        XCTAssertEqual(e.value(sheet: "S", at: "E2"), .number(sumA(10...50) + sumA(10...50, col: 3)))
        XCTAssertEqual(e.value(sheet: "T", at: "A1"), .number(sumA(1...100, col: 3) + a200))
        XCTAssertEqual(e.value(sheet: "S", at: "E3"), .number(67 + 40 + 1), "COUNTA: 67 ô cột A, 40 ô cột C, B7")
        XCTAssertEqual(e.value(sheet: "S", at: "E4"), .number(a200 + sumA(10...50) + sumA(10...50, col: 3) + 108))

        // Sửa đầu vào: chỉ mục phải được hủy, kết quả đổi theo.
        e.setValue(.number(1000), sheet: "S", at: "A4")
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "S", at: "E1"), .number(a200 + 1000 - 4))
        e.clear(sheet: "S", at: "A4")
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "S", at: "E1"), .number(a200 - 4))
        e.setValue(.number(5), sheet: "S", at: "A201")
        e.setFormula("SUM(A1:A201)", sheet: "S", at: "E1")
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "S", at: "E1"), .number(a200 - 4 + 5))
        XCTAssertEqual(e.value(sheet: "S", at: "E4"), .number(
            (a200 - 4 + 5) + sumA(10...50) + sumA(10...50, col: 3) + countA(e)))
    }

    private func countA(_ e: FormulaEngine) -> Double {
        if case .number(let n) = e.value(sheet: "S", at: "E3") { return n }
        return -1
    }

    /// Vòng tham chiếu vẫn được phát hiện sau khi đổi sang chỉ mục.
    func testCircularReferencesStillDetected() {
        let e = FormulaEngine(sheets: [(name: "S", cells: [:])])
        e.setFormula("SUM(B1:B3)", sheet: "S", at: "A1")
        e.setFormula("A1+1", sheet: "S", at: "B2")
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "S", at: "A1"), .error("#REF!"))
        XCTAssertEqual(e.value(sheet: "S", at: "B2"), .error("#REF!"))
    }
}
