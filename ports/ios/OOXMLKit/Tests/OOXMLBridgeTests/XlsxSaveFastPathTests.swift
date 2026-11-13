import XCTest
@testable import OOXMLBridge
import OOXMLKit
import OOXMLZip
import OOXMLTestSupport

/// `xlsx.save` với delta chỉ gồm ghi GIÁ TRỊ ô đi đường nhanh (vá byte sheet + lưu truyền phát + kiểm lại bằng đọc
/// theo cửa sổ hàng), mọi trường hợp khác đi đường DOM. Hai đường phải cho cùng kết quả cho người dùng.
final class XlsxSaveFastPathTests: XCTestCase {
    let bridge = OOXMLBridge()

    private func request(_ args: [String: Any]) throws -> [String: Any] {
        let req = try JSONSerialization.data(withJSONObject: ["id": 1, "op": "xlsx.save", "args": args])
        return try JSONSerialization.jsonObject(with: bridge.handle(req)) as! [String: Any]
    }

    /// Chạy `xlsx.save` và trả (result, tệp đích). Bắt buộc phản hồi ok.
    private func save(_ fixture: String, delta: [String: Any], label: String, file: StaticString = #filePath,
                      line: UInt = #line) throws -> (result: [String: Any], target: URL, source: URL) {
        let dir = try Fixtures.scratchDirectory("xlsx-fast-\(label)")
        let source = dir.appendingPathComponent("source.xlsx")
        let target = dir.appendingPathComponent("staging.xlsx")
        try Fixtures.data(fixture).write(to: source)
        let response = try request(["source_document_path": source.path, "target_path": target.path, "delta": delta])
        XCTAssertEqual(response["ok"] as? Bool, true, "\(fixture): \(response)", file: file, line: line)
        return (response["result"] as? [String: Any] ?? [:], target, source)
    }

    private func failure(_ fixture: String, delta: [String: Any], label: String) throws -> (error: [String: Any], target: URL, source: URL) {
        let dir = try Fixtures.scratchDirectory("xlsx-fast-\(label)")
        let source = dir.appendingPathComponent("source.xlsx")
        let target = dir.appendingPathComponent("staging.xlsx")
        try Fixtures.data(fixture).write(to: source)
        let response = try request(["source_document_path": source.path, "target_path": target.path, "delta": delta])
        XCTAssertEqual(response["ok"] as? Bool, false, "\(response)")
        return (response["error"] as? [String: Any] ?? [:], target, source)
    }

    private struct Edit { let sheet: String; let ref: String; let type: String; let value: Any
        var json: [String: Any] { ["sheet": sheet, "ref": ref, "type": type, "value": value] }
    }

    private func cellValue(_ e: Edit) -> CellValue {
        switch e.type {
        case "number": return .number((e.value as? Double) ?? Double(e.value as? Int ?? 0))
        case "string": return .string(e.value as! String)
        case "bool": return .bool(e.value as! Bool)
        case "error": return .error(e.value as! String)
        default: return .empty
        }
    }

    /// Bộ sửa phủ cho một sheet: ghi đè ô không công thức, ô mới cạnh hàng có sẵn, hàng mới ở cuối, đủ các kiểu.
    private func edits(for ws: Worksheet, sheet: String) -> [Edit] {
        let cells = ws.cells
        let plain = cells.filter { $0.formula == nil }
        let maxRow = cells.map(\.reference.row).max() ?? 1
        let maxCol = cells.map(\.reference.column).max() ?? 1
        var out: [Edit] = []
        if plain.count > 0 { out.append(Edit(sheet: sheet, ref: plain[0].reference.a1, type: "string", value: "đã vá — Việt Nam <&>")) }
        if plain.count > 1 { out.append(Edit(sheet: sheet, ref: plain[1].reference.a1, type: "number", value: 12.5)) }
        if plain.count > 2 { out.append(Edit(sheet: sheet, ref: plain[2].reference.a1, type: "bool", value: true)) }
        if plain.count > 3 { out.append(Edit(sheet: sheet, ref: plain[3].reference.a1, type: "empty", value: NSNull())) }
        out.append(Edit(sheet: sheet, ref: CellReference(column: maxCol + 1, row: 1).a1, type: "string", value: "cột mới"))
        out.append(Edit(sheet: sheet, ref: CellReference(column: 1, row: maxRow + 3).a1, type: "number", value: -7))
        out.append(Edit(sheet: sheet, ref: CellReference(column: 2, row: maxRow + 3).a1, type: "string", value: "hàng mới"))
        out.append(Edit(sheet: sheet, ref: CellReference(column: 1, row: maxRow + 5).a1, type: "error", value: "#N/A"))
        return out
    }

    /// Tập phần thay đổi giữa hai gói, so theo nội dung giải nén (cách tính của đường DOM).
    private func changedParts(_ a: Data, _ b: Data) throws -> Set<String> {
        let x = try ZipArchive(data: a), y = try ZipArchive(data: b)
        var out = Set<String>()
        for name in Set(x.entryNames).union(y.entryNames) {
            guard let ex = x.entry(name), let ey = y.entry(name) else { out.insert(name); continue }
            if try x.contents(of: ex) != y.contents(of: ey) { out.insert(name) }
        }
        return out
    }

    private static let fixtures = [
        "xlsx/implicit-refs.xlsx", "xlsx/office-quirks.xlsx", "xlsx/prefixed-x.xlsx", "xlsx/rich-excel.xlsx",
        "xlsx/strict.xlsx", "real/sample-sheet-charts.xlsx", "real/sample-sheet-formulas.xlsx",
        "real/sample-sheet-hidden-autofilter.xlsx", "real/sample-sheet-pivot.xlsx", "real/sample-sheet-validation.xlsx",
        "real/sample-sheet.xlsx", "real/ton-kho-3t.xlsx",
    ]

    // MARK: Đường nhanh cho cùng kết quả với đường DOM

    func testValueEditsGiveSameWorkbookAsDOMPathOnEveryFixture() throws {
        var patchCount = 0, domCount = 0
        for fixture in Self.fixtures {
            let sourceData = try Fixtures.data(fixture)
            let probe = try Workbook(data: sourceData)
            for (index, info) in probe.sheets.enumerated() where info.kind == .worksheet {
                let list = edits(for: try probe.worksheet(at: index), sheet: info.name)
                let label = "\(fixture.replacingOccurrences(of: "/", with: "_"))-\(index)"
                let (result, target, _) = try save(fixture, delta: ["cells": list.map(\.json)], label: label)
                XCTAssertEqual(result["ok"] as? Bool, true, label)
                XCTAssertEqual(result["unsupported"] as? [String], [], label)
                let path = result["path"] as? String
                XCTAssertTrue(path == "patch" || path == "dom", "\(label): path=\(String(describing: path))")
                if path == "patch" { patchCount += 1 } else { domCount += 1 }

                // Đường DOM làm trực tiếp trong thư viện với đúng loạt sửa đó.
                let dom = try Workbook(data: sourceData)
                let ws = try dom.worksheet(named: info.name)
                for e in list { try ws.setValue(cellValue(e), at: e.ref) }
                let domData = try dom.save()

                let saved = try Data(contentsOf: target)
                let a = try Workbook(data: saved), b = try Workbook(data: domData)
                XCTAssertEqual(a.sheets.map(\.name), b.sheets.map(\.name), label)
                for (i, s) in a.sheets.enumerated() where s.kind == .worksheet {
                    XCTAssertEqual(try a.worksheet(at: i).cells, try b.worksheet(at: i).cells, "\(label): sheet \(s.name)")
                }
                XCTAssertEqual(PackageValidator.validate(saved), PackageValidator.validate(sourceData),
                               "\(label): không được thêm lỗi gói so với nguồn")
                if path == "patch" {
                    XCTAssertEqual(Set(result["changedParts"] as? [String] ?? []), try changedParts(sourceData, saved), label)
                    XCTAssertEqual(Set(result["changedParts"] as? [String] ?? []), try changedParts(sourceData, domData),
                                   "\(label): đường vá và đường DOM phải đổi cùng các phần")
                }
            }
        }
        XCTAssertGreaterThanOrEqual(patchCount, 8, "đường nhanh phải áp được cho phần lớn sheet mẫu (patch=\(patchCount), dom=\(domCount))")
    }

    func testUntouchedPartsKeepCompressedBytesAndSourceIsNotModified() throws {
        let fixture = "xlsx/rich-excel.xlsx"
        let sourceData = try Fixtures.data(fixture)
        let probe = try Workbook(data: sourceData)
        let name = probe.sheetNames[1] // "Tổng hợp": vá được (sheet "Dữ liệu" có công thức mảng nên đi đường DOM)
        let list = [Edit(sheet: name, ref: "Z50", type: "string", value: "chỉ ô này")]
        let (result, target, source) = try save(fixture, delta: ["cells": list.map(\.json)], label: "untouched")
        XCTAssertEqual(result["path"] as? String, "patch")
        XCTAssertEqual(try Data(contentsOf: source), sourceData, "tệp nguồn không được bị sửa")
        let before = try ZipArchive(data: sourceData), after = try ZipArchive(data: try Data(contentsOf: target))
        let changed = Set(result["changedParts"] as? [String] ?? [])
        XCTAssertFalse(changed.isEmpty)
        var checked = 0
        for entry in before.entries where !changed.contains(entry.name) {
            let other = try XCTUnwrap(after.entry(entry.name), entry.name)
            XCTAssertEqual(after.rawCompressedData(of: other), before.rawCompressedData(of: entry),
                           "\(entry.name): phần không đổi phải giữ nguyên byte nén")
            checked += 1
        }
        XCTAssertGreaterThan(checked, 2)
    }

    /// Cùng một ô xuất hiện nhiều lần: lần cuối thắng, ở CẢ hai đường (sheet 1 đi đường vá, sheet 0 đi đường DOM).
    func testRepeatedEditsToSameCellKeepTheLastValue() throws {
        let fixture = "xlsx/rich-excel.xlsx"
        let names = try Workbook(data: try Fixtures.data(fixture)).sheetNames
        for (index, expectedPath) in [(1, "patch"), (0, "dom")] {
            let list = [Edit(sheet: names[index], ref: "Z60", type: "string", value: "lần một"),
                        Edit(sheet: names[index], ref: "Z60", type: "number", value: 7),
                        Edit(sheet: names[index], ref: "z60", type: "string", value: "lần cuối")]
            let (result, target, _) = try save(fixture, delta: ["cells": list.map(\.json)], label: "dup\(index)")
            XCTAssertEqual(result["path"] as? String, expectedPath, "sheet \(index)")
            XCTAssertEqual(try Workbook(data: try Data(contentsOf: target)).worksheet(at: index).value("Z60"),
                           .string("lần cuối"), "sheet \(index)")
        }
    }

    // MARK: Rơi về đường DOM

    func testIneligibleDeltasFallBackToDOMWithCorrectResult() throws {
        let fixture = "xlsx/rich-excel.xlsx"
        let probe = try Workbook(data: try Fixtures.data(fixture))
        let name = probe.sheetNames[1] // sheet vá được: đường DOM ở đây là do loại delta, không phải do sheet
        let value = Edit(sheet: name, ref: "Z70", type: "string", value: "giá trị")

        func assertDOM(_ delta: [String: Any], _ label: String, check: (Workbook) throws -> Void) throws {
            let (result, target, _) = try save(fixture, delta: delta, label: "dom-\(label)")
            XCTAssertEqual(result["path"] as? String, "dom", label)
            let wb = try Workbook(data: try Data(contentsOf: target))
            XCTAssertEqual(try wb.worksheet(at: 1).value("Z70"), .string("giá trị"), label)
            try check(wb)
        }
        try assertDOM(["cells": [value.json, ["sheet": name, "ref": "Z71", "formula": "1+1", "cached": 2]]], "formula") {
            XCTAssertEqual(try $0.worksheet(at: 1).cell("Z71")?.formula, "1+1")
        }
        try assertDOM(["cells": [value.json, ["sheet": name, "ref": "Z72", "type": "number", "value": 3, "styleIndex": 1]]], "style") {
            XCTAssertEqual(try $0.worksheet(at: 1).cell("Z72")?.styleIndex, 1)
        }
        let victim = try XCTUnwrap(try probe.worksheet(at: 1).cells.first { $0.formula == nil }, "sheet phải có ô để xóa").reference.a1
        try assertDOM(["cells": [value.json], "cleared_cells": [["sheet": name, "range": victim]]], "clear") {
            XCTAssertNil(try $0.worksheet(at: 1).cell(victim))
        }
        try assertDOM(["cells": [value.json],
                       "structural_ops": [["op": "sheet.freezePanes", "args": ["sheet": name, "rows": 1, "cols": 0]]]], "structural") { _ in }
    }

    /// Sheet 1 vá được, sheet 2 có ô đích đang là công thức → cả delta phải rơi về DOM và KHÔNG để lại nửa chừng.
    func testPartiallyEligibleDeltaFallsBackWholeAndLeavesNothingHalfApplied() throws {
        let fixture = "real/sample-sheet-formulas.xlsx"
        let sourceData = try Fixtures.data(fixture)
        let probe = try Workbook(data: sourceData)
        let sheets = probe.sheets.enumerated().filter { $0.element.kind == .worksheet }
        let withFormula = try XCTUnwrap(sheets.first { (try? probe.worksheet(at: $0.offset).cells.contains { $0.formula != nil }) == true })
        let formulaCell = try XCTUnwrap(try probe.worksheet(at: withFormula.offset).cells.first { $0.formula != nil })
        var list = [Edit(sheet: withFormula.element.name, ref: formulaCell.reference.a1, type: "number", value: 99)]
        if let other = sheets.first(where: { $0.offset != withFormula.offset }) {
            list.insert(Edit(sheet: other.element.name, ref: "Z90", type: "string", value: "sheet khác"), at: 0)
        }
        let (result, target, _) = try save(fixture, delta: ["cells": list.map(\.json)], label: "partial")
        XCTAssertEqual(result["path"] as? String, "dom")
        let wb = try Workbook(data: try Data(contentsOf: target))
        XCTAssertEqual(try wb.worksheet(named: withFormula.element.name).value(formulaCell.reference.a1), .number(99))
        XCTAssertNil(try wb.worksheet(named: withFormula.element.name).cell(formulaCell.reference)?.formula,
                     "ghi giá trị lên ô công thức xóa công thức (như đường DOM)")
        if list.count > 1 {
            XCTAssertEqual(try wb.worksheet(named: list[0].sheet).value("Z90"), .string("sheet khác"))
        }
    }

    // MARK: Lỗi

    func testBadInputFailsWithoutLeavingATarget() throws {
        let fixture = "xlsx/rich-excel.xlsx"
        let name = try Workbook(data: try Fixtures.data(fixture)).sheetNames[0]
        let cases: [(String, [String: Any])] = [
            ("sheet-la", ["cells": [["sheet": "Không có sheet này", "ref": "A1", "type": "number", "value": 1]]]),
            ("ref-sai", ["cells": [["sheet": name, "ref": "???", "type": "number", "value": 1]]]),
            ("so-sai", ["cells": [["sheet": name, "ref": "A1", "type": "number", "value": "không phải số"]]]),
            ("qua-dai", ["cells": [["sheet": name, "ref": "A1", "type": "string", "value": String(repeating: "x", count: 32_768)]]]),
        ]
        for (label, delta) in cases {
            let (error, target, source) = try failure(fixture, delta: delta, label: "bad-\(label)")
            XCTAssertFalse(error.isEmpty, label)
            XCTAssertFalse(FileManager.default.fileExists(atPath: target.path), "\(label): không được để lại tệp đích")
            XCTAssertEqual(try Data(contentsOf: source), try Fixtures.data(fixture), "\(label): nguồn nguyên vẹn")
        }
    }
}
