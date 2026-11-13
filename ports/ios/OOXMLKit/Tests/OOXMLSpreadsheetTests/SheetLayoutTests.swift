import XCTest
@testable import OOXMLSpreadsheet
import OOXMLPackage
import OOXMLTestSupport

/// `SheetRowReader.layout` và `Workbook.cellFormatDetails`: bố cục và định dạng hiển thị đọc không qua DOM phần dữ liệu,
/// phải khớp đường DOM (`Worksheet`, `StyleSheet.info`) trên mọi fixture.
final class SheetLayoutTests: XCTestCase {
    static let fixtures = SheetRowReaderTests.fixtures

    func testLayoutMatchesWorksheetOnEveryFixture() throws {
        for path in Self.fixtures {
            let data = try Fixtures.data(path)
            let eager = try Workbook(data: data)
            let lazy = try Workbook(data: data, deferValidation: true, lazyModel: true)
            for (index, info) in eager.sheets.enumerated() where info.kind == .worksheet {
                let ws = try eager.worksheet(at: index)
                let layout = try lazy.rowReader(forSheetAt: index).layout(rows: 1...CellReference.maxRow)
                XCTAssertEqual(layout.merges, ws.mergedCells, "\(path) \(info.name): ô gộp")
                XCTAssertEqual(layout.autoFilter, ws.autoFilterRange, "\(path) \(info.name): vùng lọc")
                XCTAssertEqual(layout.dimension?.description, ws.document.root.firstChild(NS.s, "dimension")?.attribute("ref"),
                               "\(path) \(info.name): dimension")
                for col in 1...40 {
                    let fromLayout = layout.columns.first { $0.min <= col && col <= $0.max }?.width
                    XCTAssertEqual(fromLayout, ws.columnWidth(col), "\(path) \(info.name): cột \(col)")
                }
                let maxRow = ws.cells.map(\.reference.row).max() ?? 0
                for row in 1...max(1, maxRow + 2) {
                    let h = layout.rows.first { $0.number == row }?.height
                    XCTAssertEqual(h, ws.rowHeight(row), "\(path) \(info.name): hàng \(row)")
                }
            }
        }
    }

    func testLayoutWindowOnlyReturnsRowsInsideWindowAndSkipsDataParsing() throws {
        let wb = try Workbook(data: try Fixtures.data("real/ton-kho-3t.xlsx"), deferValidation: true, lazyModel: true)
        let before = wb.package.loadedXMLPartCount
        let reader = try wb.rowReader(forSheetAt: 0)
        let all = try reader.layout(rows: 1...CellReference.maxRow)
        let window = try reader.layout(rows: 1...3)
        XCTAssertTrue(window.rows.allSatisfy { (1...3).contains($0.number) })
        XCTAssertEqual(window.rows, all.rows.filter { (1...3).contains($0.number) })
        XCTAssertEqual(try reader.layout().rows, [], "không hỏi cửa sổ thì không đọc hàng")
        XCTAssertEqual(wb.package.loadedXMLPartCount, before, "không được nạp DOM của sheet vào gói")
    }

    func testFreezePanesAndGridlinesAreReadFromSheetViews() throws {
        let wb = try Workbook(data: try Fixtures.data("xlsx/rich-excel.xlsx"))
        let ws = try wb.worksheet(at: 1)
        try ws.setFreezePanes(rows: 2, cols: 1)
        let saved = try Workbook(data: try wb.save(), deferValidation: true, lazyModel: true)
        let l = try saved.rowReader(forSheetAt: 1).layout()
        XCTAssertEqual(l.frozenRows, 2)
        XCTAssertEqual(l.frozenColumns, 1)
        XCTAssertTrue(l.showGridLines)
    }

    func testFormatDetailsAgreeWithStyleInfoOnEveryFixture() throws {
        for path in Self.fixtures {
            let wb = try Workbook(data: try Fixtures.data(path))
            guard let styles = wb.styles else { continue }
            let details = wb.cellFormatDetails()
            XCTAssertEqual(details.count, styles.cellFormatCount, path)
            for (i, d) in details.enumerated() {
                let info = styles.info(styleIndex: i)
                XCTAssertEqual(d.numberFormatId, info.numberFormatId, "\(path) xf \(i)")
                XCTAssertEqual(d.numberFormatCode, info.numberFormatCode, "\(path) xf \(i)")
                XCTAssertEqual(d.font.bold, info.bold, "\(path) xf \(i)")
                XCTAssertEqual(d.font.italic, info.italic, "\(path) xf \(i)")
                if let fill = info.fillColor {
                    XCTAssertEqual(d.fill.pattern, "solid", "\(path) xf \(i)")
                    if d.fill.foreground?.rgb != nil { XCTAssertEqual(d.fill.foreground?.rgb, String(fill.suffix(6)).uppercased(), "\(path) xf \(i)") }
                }
            }
        }
    }

    func testThemeAndIndexedColorsAreResolvedWithTint() {
        // Trắng tối đi 50% = xám giữa; đen sáng lên 50% = xám giữa; tint 0 giữ nguyên.
        XCTAssertEqual(Workbook.applyTint("FFFFFF", -0.5), "808080")
        XCTAssertEqual(Workbook.applyTint("000000", 0.5), "808080")
        XCTAssertEqual(Workbook.applyTint("4472C4", 0), "4472C4")
        // Excel hiển thị "Xanh, Accent 1, Sáng hơn 80%" (4472C4 + tint 0.8) là D9E1F2. Excel tính HLS bằng số nguyên nên
        // làm tròn khác bản thực của ta; chỉ khẳng định sai lệch ≤ 2 mỗi kênh (không phân biệt được bằng mắt), chưa kiểm
        // làm tròn bit-chính-xác với Excel thật.
        let tinted = Workbook.applyTint("4472C4", 0.7999816888943144)
        let got = UInt32(tinted, radix: 16)!, want = UInt32("D9E1F2", radix: 16)!
        for shift in [16, 8, 0] {
            let g = Int((got >> UInt32(shift)) & 0xFF), w = Int((want >> UInt32(shift)) & 0xFF)
            XCTAssertLessThanOrEqual(abs(g - w), 2, "kênh dịch \(shift): \(tinted) so với D9E1F2")
        }
        XCTAssertEqual(Workbook.defaultIndexed.count, 64)
        XCTAssertEqual(Workbook.defaultIndexed[2], "FF0000")
    }
}
