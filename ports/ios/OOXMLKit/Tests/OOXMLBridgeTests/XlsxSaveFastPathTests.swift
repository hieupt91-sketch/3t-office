import XCTest
@testable import OOXMLBridge
import OOXMLKit
import OOXMLZip
import OOXMLTestSupport

/// `xlsx.save` với delta chỉ gồm ghi Ô (giá trị, công thức, chỉ số định dạng) đi đường nhanh (vá byte sheet + lưu
/// truyền phát + kiểm lại bằng đọc theo cửa sổ hàng); xóa ô, thao tác cấu trúc và mọi sheet/ô đường vá không xử lý
/// được thì đi đường DOM. Hai đường phải cho cùng kết quả cho người dùng.
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

    // MARK: Công thức và định dạng đi đường vá

    func testFormulaAndStyleDeltasUsePatchPathAndMatchDOM() throws {
        var patchCount = 0
        for fixture in Self.fixtures {
            let sourceData = try Fixtures.data(fixture)
            let probe = try Workbook(data: sourceData)
            let styleIndex = (probe.styles?.cellFormatCount ?? 0) > 1 ? 1 : 0
            for (index, info) in probe.sheets.enumerated() where info.kind == .worksheet {
                let cells = try probe.worksheet(at: index).cells
                let maxRow = cells.map(\.reference.row).max() ?? 1
                let plain = cells.filter { $0.formula == nil }
                guard plain.count >= 2 else { continue }
                let label = "\(fixture.replacingOccurrences(of: "/", with: "_"))-\(index)"
                let newCell = CellReference(column: 3, row: maxRow + 2).a1
                let delta: [String: Any] = ["cells": [
                    ["sheet": info.name, "ref": plain[0].reference.a1, "formula": "=1+1", "cached": 2],
                    ["sheet": info.name, "ref": plain[1].reference.a1, "formula": "\"a\"&\"b\"", "cached": "ab", "cachedType": "string"],
                    ["sheet": info.name, "ref": newCell, "formula": "SUM(A1:A2)", "cached": 3, "styleIndex": styleIndex],
                    ["sheet": info.name, "ref": CellReference(column: 1, row: maxRow + 4).a1, "type": "string", "value": "có định dạng", "styleIndex": styleIndex],
                ]]
                let (result, target, _) = try save(fixture, delta: delta, label: "fs-\(label)")
                XCTAssertEqual(result["ok"] as? Bool, true, label)
                guard result["path"] as? String == "patch" else { continue }
                patchCount += 1

                let dom = try Workbook(data: sourceData)
                let ws = try dom.worksheet(named: info.name)
                try ws.setFormula("=1+1", at: plain[0].reference.a1, cachedValue: .number(2))
                try ws.setFormula("\"a\"&\"b\"", at: plain[1].reference.a1, cachedValue: .string("ab"))
                try ws.setFormula("SUM(A1:A2)", at: newCell, cachedValue: .number(3))
                try ws.setStyleIndex(styleIndex, at: newCell)
                let styled = CellReference(column: 1, row: maxRow + 4).a1
                try ws.setValue(.string("có định dạng"), at: styled)
                try ws.setStyleIndex(styleIndex, at: styled)
                let saved = try Data(contentsOf: target)
                let a = try Workbook(data: saved), b = try Workbook(data: try dom.save())
                for (i, s) in a.sheets.enumerated() where s.kind == .worksheet {
                    XCTAssertEqual(try a.worksheet(at: i).cells, try b.worksheet(at: i).cells, "\(label): sheet \(s.name)")
                }
                XCTAssertEqual(a.package.partNames.map(\.description).sorted(), b.package.partNames.map(\.description).sorted(),
                               "\(label): danh sách phần")
                XCTAssertEqual(PackageValidator.validate(saved), PackageValidator.validate(sourceData), label)
            }
        }
        XCTAssertGreaterThanOrEqual(patchCount, 8, "công thức và định dạng phải đi đường vá cho phần lớn sheet mẫu")
    }

    func testStyleThatDoesNotExistIsReportedAndNothingIsWritten() throws {
        let fixture = "xlsx/rich-excel.xlsx"
        let name = try Workbook(data: try Fixtures.data(fixture)).sheetNames[1]
        let dir = try Fixtures.scratchDirectory("xlsx-fast-nostyle")
        let source = dir.appendingPathComponent("source.xlsx"), target = dir.appendingPathComponent("staging.xlsx")
        try Fixtures.data(fixture).write(to: source)
        let count = try XCTUnwrap(try Workbook(data: try Fixtures.data(fixture)).styles?.cellFormatCount)
        // Chỉ số = số định dạng (vượt 1) và rất lớn: cả hai đều không tồn tại. Đường nhanh VÀ đường DOM (ép bằng thao
        // tác cấu trúc) đều phải từ chối, không ghi tệp đích.
        for (label, extra) in [("nhanh", [String: Any]()),
                               ("dom", ["structural_ops": [["op": "sheet.freezePanes", "args": ["sheet": name, "rows": 1, "cols": 0]]]])] {
            for bad in [count, 9999] {
                var delta: [String: Any] = ["cells": [["sheet": name, "ref": "Z1", "type": "number", "value": 1, "styleIndex": bad]]]
                for (k, v) in extra { delta[k] = v }
                if FileManager.default.fileExists(atPath: target.path) { try FileManager.default.removeItem(at: target) }
                let response = try request(["source_document_path": source.path, "target_path": target.path, "delta": delta])
                let result = response["result"] as? [String: Any] ?? [:]
                XCTAssertEqual(result["ok"] as? Bool, false, "\(label) styleIndex=\(bad)")
                XCTAssertFalse((result["unsupported"] as? [String] ?? []).isEmpty, "\(label) styleIndex=\(bad)")
                XCTAssertFalse(FileManager.default.fileExists(atPath: target.path), "\(label) styleIndex=\(bad)")
            }
        }
        // Chỉ số cuối cùng hợp lệ (count - 1) thì ghi được.
        let ok = try request(["source_document_path": source.path, "target_path": target.path,
                              "delta": ["cells": [["sheet": name, "ref": "Z1", "type": "number", "value": 1, "styleIndex": count - 1]]]])
        XCTAssertEqual((ok["result"] as? [String: Any])?["ok"] as? Bool, true)
    }

    // MARK: Rơi về đường DOM

    func testStructuralDeltasFallBackToDOMWithCorrectResult() throws {
        let fixture = "xlsx/rich-excel.xlsx"
        let name = try Workbook(data: try Fixtures.data(fixture)).sheetNames[1]
        let value = Edit(sheet: name, ref: "Z70", type: "string", value: "giá trị")
        let (structural, structuralTarget, _) = try save(fixture, delta: [
            "cells": [value.json],
            "structural_ops": [["op": "sheet.freezePanes", "args": ["sheet": name, "rows": 1, "cols": 0]]],
        ], label: "dom-structural")
        XCTAssertEqual(structural["path"] as? String, "dom")
        XCTAssertEqual(try Workbook(data: try Data(contentsOf: structuralTarget)).worksheet(at: 1).value("Z70"), .string("giá trị"))
    }

    /// Xóa ô (kèm ghi ô) đi đường vá và cho cùng kết quả với đường DOM trên mọi sheet mẫu. Đường DOM được ép bằng
    /// một thao tác cấu trúc vô hại (đặt freeze panes) rồi so từng ô; xóa áp SAU mọi lần ghi ở cả hai đường.
    func testClearedCellsUsePatchPathAndMatchDOMOnEveryFixture() throws {
        var patchCount = 0
        for fixture in Self.fixtures {
            let sourceData = try Fixtures.data(fixture)
            let probe = try Workbook(data: sourceData)
            for (index, info) in probe.sheets.enumerated() where info.kind == .worksheet {
                let ws = try probe.worksheet(at: index)
                let cells = ws.cells
                guard cells.count >= 2 else { continue }
                let list = edits(for: ws, sheet: info.name)
                let lastRow = cells.map(\.reference.row).max() ?? 1
                // Vùng xóa: một ô có sẵn, và một vùng chữ nhật phủ cả ô vừa ghi (xóa thắng ghi).
                let ranges = [cells[0].reference.a1, "A1:C\(max(2, lastRow / 2))", "A\(lastRow + 3):B\(lastRow + 3)"]
                let cleared = ranges.map { ["sheet": info.name, "range": $0] }
                let label = "clear-\(fixture.replacingOccurrences(of: "/", with: "_"))-\(index)"
                let delta: [String: Any] = ["cells": list.map(\.json), "cleared_cells": cleared]
                let (result, target, _) = try save(fixture, delta: delta, label: label)
                let path = result["path"] as? String
                XCTAssertTrue(path == "patch" || path == "dom", label)
                if path == "patch" { patchCount += 1 }

                let (domResult, domTarget, _) = try save(fixture, delta: delta.merging([
                    "structural_ops": [["op": "sheet.freezePanes", "args": ["sheet": info.name, "rows": 0, "cols": 1]]]
                ]) { $1 }, label: label + "-dom")
                XCTAssertEqual(domResult["path"] as? String, "dom", label)
                let a = try Workbook(data: try Data(contentsOf: target))
                let b = try Workbook(data: try Data(contentsOf: domTarget))
                for (i, sh) in a.sheets.enumerated() where sh.kind == .worksheet {
                    XCTAssertEqual(try a.worksheet(at: i).cells, try b.worksheet(at: i).cells, "\(label): sheet \(sh.name)")
                }
                let saved = try Data(contentsOf: target)
                XCTAssertEqual(PackageValidator.validate(saved), PackageValidator.validate(sourceData), label)
            }
        }
        XCTAssertGreaterThanOrEqual(patchCount, 8, "xóa ô phải đi đường vá ở phần lớn sheet mẫu (patch=\(patchCount))")
    }

    /// Chỉ có `cleared_cells` (không ghi ô nào) cũng đi đường vá; vùng chạm quá nhiều hàng thì rơi về DOM.
    func testClearOnlyDeltaAndOversizedRangeFallback() throws {
        let fixture = "xlsx/rich-excel.xlsx"
        let probe = try Workbook(data: try Fixtures.data(fixture))
        let name = probe.sheetNames[1]
        let victim = try XCTUnwrap(try probe.worksheet(at: 1).cells.first { $0.formula == nil }).reference.a1
        let (result, target, _) = try save(fixture, delta: ["cleared_cells": [["sheet": name, "range": victim]]], label: "clear-only")
        XCTAssertEqual(result["path"] as? String, "patch")
        XCTAssertEqual(try Workbook(data: try Data(contentsOf: target)).worksheet(named: name).value(victim), .empty)
        XCTAssertEqual(result["changedParts"] as? [String] != nil, true)

    }

    /// Một sheet vá được, một sheet đường vá từ chối (sheet "Dữ liệu" có công thức mảng) → cả delta rơi về DOM
    /// và KHÔNG để lại nửa chừng: cả hai sheet đều có giá trị mới.
    func testPartiallyEligibleDeltaFallsBackWholeAndLeavesNothingHalfApplied() throws {
        let fixture = "xlsx/rich-excel.xlsx"
        let names = try Workbook(data: try Fixtures.data(fixture)).sheetNames
        let list = [Edit(sheet: names[1], ref: "Z90", type: "string", value: "sheet vá được"),
                    Edit(sheet: names[0], ref: "Z91", type: "string", value: "sheet có công thức mảng")]
        let (result, target, _) = try save(fixture, delta: ["cells": list.map(\.json)], label: "partial")
        XCTAssertEqual(result["path"] as? String, "dom")
        let wb = try Workbook(data: try Data(contentsOf: target))
        XCTAssertEqual(try wb.worksheet(named: names[1]).value("Z90"), .string("sheet vá được"))
        XCTAssertEqual(try wb.worksheet(named: names[0]).value("Z91"), .string("sheet có công thức mảng"))
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
