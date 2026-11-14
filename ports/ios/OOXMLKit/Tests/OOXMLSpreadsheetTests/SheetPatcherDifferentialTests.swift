import XCTest
@testable import OOXMLSpreadsheet
import OOXMLPackage
import OOXMLTestSupport

/// Kiểm thử so sánh ngẫu nhiên (tất định theo hạt giống): cùng một chuỗi sửa/xóa ô áp bằng đường vá (`SheetPatcher`) và
/// bằng đường DOM (`Worksheet`) trên mọi fixture phải cho CÙNG ô kết quả (địa chỉ, giá trị, công thức, định dạng).
/// Đường vá ghi thẳng byte nên lỗi ở đây là hỏng dữ liệu người dùng; đường DOM là chuẩn đối chiếu.
/// Số vòng mặc định nhỏ để CI nhanh; đặt `OOXMLKIT_FUZZ_ITERATIONS` để chạy sâu hơn ở máy dev.
final class SheetPatcherDifferentialTests: XCTestCase {
    struct RNG { var s: UInt64
        mutating func next() -> UInt64 { s = s &* 6364136223846793005 &+ 1442695040888963407; return s >> 11 }
        mutating func int(_ n: Int) -> Int { n <= 1 ? 0 : Int(next() % UInt64(n)) }
    }
    enum Op { case value(CellReference, CellValue), formula(CellReference, String, CellValue), style(CellReference, Int), clear(CellRange) }

    func semantic(_ cells: [Cell]) -> [String] {
        cells.map { "\($0.reference.a1)|\($0.value)|\($0.formula ?? "-")|\($0.styleIndex)" }
    }

    func testRandomEditSequencesMatchDOMOnEveryFixture() throws {
        let iterations = Int(ProcessInfo.processInfo.environment["OOXMLKIT_FUZZ_ITERATIONS"] ?? "") ?? 25
        var compared = 0, declined = 0, domRefused = 0
        for path in SheetRowReaderTests.fixtures {
            let data = try Fixtures.data(path)
            let probe = try Workbook(data: data)
            for (index, info) in probe.sheets.enumerated() where info.kind == .worksheet {
                let cells = try probe.worksheet(at: index).cells
                let maxRow = max(3, cells.map(\.reference.row).max() ?? 3)
                let maxCol = max(3, cells.map(\.reference.column).max() ?? 3)
                let styleCount = max(1, probe.styles?.cellFormatCount ?? 1)
                // Hạt giống TẤT ĐỊNH (hashValue của Swift đổi theo mỗi lần chạy nên không dùng được): lỗi tìm thấy phải tái lập được.
                var rng = RNG(s: (path.utf8.reduce(UInt64(1469598103934665603)) { ($0 ^ UInt64($1)) &* 1099511628211 } &+ UInt64(index) &* 7919) | 1)
                for iteration in 0..<iterations {
                    func randomRef() -> CellReference {
                        if !cells.isEmpty, rng.int(10) < 7 { return cells[rng.int(cells.count)].reference }
                        return CellReference(column: 1 + rng.int(maxCol + 3), row: 1 + rng.int(maxRow + 5))
                    }
                    var ops: [Op] = []
                    for _ in 0..<(1 + rng.int(6)) {
                        switch rng.int(8) {
                        case 0, 1: ops.append(.value(randomRef(), .number(Double(rng.int(100000)) / 8)))
                        case 2: ops.append(.value(randomRef(), .string("chuỗi \(rng.int(1000)) <&> \"'")))
                        case 3: ops.append(.value(randomRef(), rng.int(2) == 0 ? .bool(true) : .error("#N/A")))
                        case 4: ops.append(.value(randomRef(), .empty))
                        case 5: ops.append(.formula(randomRef(), "A1+\(rng.int(50))", .number(Double(rng.int(50)))))
                        case 6: ops.append(.style(randomRef(), rng.int(styleCount)))
                        default:
                            let a = randomRef()
                            ops.append(.clear(CellRange(a, CellReference(column: a.column + rng.int(2), row: a.row + rng.int(3)))))
                        }
                    }
                    let label = "\(path) sheet \(index) lần \(iteration)"

                    // Đường vá.
                    let patchWB = try Workbook(data: data, deferValidation: true, lazyModel: true)
                    var patched: [String]?
                    do {
                        let patcher = try patchWB.patcher(forSheetAt: index)
                        for op in ops {
                            switch op {
                            case .value(let r, let v): try patcher.setValue(v, at: r)
                            case .formula(let r, let f, let c): try patcher.setFormula(f, cachedValue: c, at: r)
                            case .style(let r, let s): try patcher.setStyleIndex(s, at: r)
                            case .clear(let range): patcher.clear(range: range)
                            }
                        }
                        try patcher.commit()
                        patched = semantic(try Workbook(data: try patchWB.save()).worksheet(at: index).cells)
                    } catch SheetPatchError.unsupported { declined += 1; continue }

                    // Đường DOM: mọi lần ghi theo thứ tự, rồi xóa (như `xlsx.save`).
                    let domWB = try Workbook(data: data)
                    let ws = try domWB.worksheet(at: index)
                    do {
                        for op in ops {
                            switch op {
                            case .value(let r, let v): try ws.setValue(v, at: r.a1)
                            case .formula(let r, let f, let c): try ws.setFormula(f, at: r.a1, cachedValue: c)
                            case .style(let r, let s): try ws.setStyleIndex(s, at: r.a1)
                            case .clear: break
                            }
                        }
                        for case .clear(let range) in ops {
                            for existing in ws.cells where range.contains(existing.reference) { try ws.clear(existing.reference.a1) }
                        }
                    } catch {
                        // Đường DOM từ chối (ví dụ ô thuộc công thức mảng) mà đường vá lại nhận ⇒ đường vá phải từ chối.
                        domRefused += 1
                        XCTFail("\(label): DOM từ chối (\(error)) nhưng đường vá đã chấp nhận; chuỗi: \(ops)")
                        continue
                    }
                    let expected = semantic(try Workbook(data: try domWB.save()).worksheet(at: index).cells)
                    XCTAssertEqual(patched, expected, "\(label); chuỗi: \(ops)")
                    compared += 1
                }
            }
        }
        print("[differential] vòng/sheet=\(iterations): đã so \(compared), đường vá từ chối \(declined), DOM từ chối \(domRefused)")
        XCTAssertGreaterThan(compared, 100, "phải so sánh đủ nhiều chuỗi (so \(compared), vá từ chối \(declined), DOM từ chối \(domRefused))")
    }
}
