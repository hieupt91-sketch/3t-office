import Foundation
import OOXMLKit

/// Cầu nối giữa giao diện web (WKWebView) và OOXMLKit cho ứng dụng iOS/iPadOS (Phase 7).
///
/// Giao thức: mỗi yêu cầu là JSON `{id, op, args}`; trả về `{id, ok, result}` hoặc `{id, ok:false, error:{code,message}}`.
/// Tài liệu mở được giữ phía Swift bằng "handle" (chuỗi); web chỉ xin phần cần (một vùng ô, một đoạn) để tiết kiệm RAM.
///
/// Lớp này THUẦN LOGIC — không phụ thuộc WebKit/UIKit, nên test được đầy đủ không cần UI/thiết bị.
/// Phần nối thật (đăng ký `WKScriptMessageHandlerWithReply`, document picker, lưu tự động) nằm ở tầng app, gọi `handle(_:)`.
public final class OOXMLBridge {
    private enum Doc {
        case workbook(Workbook)
        case word(WordDocument)
        case presentation(Presentation)

        var kind: String {
            switch self {
            case .workbook: return "xlsx"
            case .word: return "docx"
            case .presentation: return "pptx"
            }
        }
    }

    private var docs: [String: Doc] = [:]
    private var counter = 0

    public init() {}

    // MARK: Điểm vào

    /// Xử lý một yêu cầu JSON, trả về phản hồi JSON. Không bao giờ ném — lỗi được gói vào `{ok:false}`.
    public func handle(_ requestData: Data) -> Data {
        var id: Any = NSNull()
        do {
            guard let req = try JSONSerialization.jsonObject(with: requestData) as? [String: Any] else {
                throw BridgeError("request", "yêu cầu không phải JSON object")
            }
            id = req["id"] ?? NSNull()
            guard let op = req["op"] as? String else { throw BridgeError("request", "thiếu 'op'") }
            let result = try perform(op: op, args: Args(req["args"]))
            return encode(["id": id, "ok": true, "result": result])
        } catch let e as BridgeError {
            return encode(["id": id, "ok": false, "error": ["code": e.code, "message": e.message]])
        } catch {
            return encode(["id": id, "ok": false, "error": ["code": "internal", "message": "\(error)"]])
        }
    }

    /// Biến thể tiện cho test/Swift: nhận-trả từ điển.
    public func perform(op: String, args raw: [String: Any]) -> [String: Any] {
        do {
            return ["ok": true, "result": try perform(op: op, args: Args(raw))]
        } catch let e as BridgeError {
            return ["ok": false, "error": ["code": e.code, "message": e.message]]
        } catch {
            return ["ok": false, "error": ["code": "internal", "message": "\(error)"]]
        }
    }

    private func encode(_ obj: [String: Any]) -> Data {
        (try? JSONSerialization.data(withJSONObject: obj)) ?? Data("{\"ok\":false,\"error\":{\"code\":\"encode\"}}".utf8)
    }

    // MARK: Điều phối

    private func perform(op: String, args: Args) throws -> Any {
        switch op {
        case "open": return try open(args)
        case "info": return try info(args)
        case "close": docs[try args.string("handle")] = nil; return [:]
        case "exportBytes": return ["base64": try exportBytes(args).base64EncodedString()]
        case "save": return try save(args)
        case "xlsx.save": return try xlsxSaveDelta(args)

        case "sheet.read": return try sheetRead(args)
        case "sheet.setValue": return try sheetSetValue(args)
        case "sheet.setFormula": return try sheetSetFormula(args)
        case "sheet.clear": try worksheet(args).clear(try args.string("ref")); return [:]
        case "sheet.format": try worksheet(args).applyFormat(BridgeValue.format(from: args.dict("change")), at: try args.string("ref")); return [:]
        case "sheet.merge": try worksheet(args).merge(try args.string("range")); return [:]
        case "sheet.unmerge": try worksheet(args).unmerge(try args.string("range")); return [:]
        case "sheet.insertRows": try worksheet(args).insertRows(at: try args.int("at"), count: args.optInt("count") ?? 1); return [:]
        case "sheet.deleteRows": try worksheet(args).deleteRows(at: try args.int("at"), count: args.optInt("count") ?? 1); return [:]
        case "sheet.insertColumns": try worksheet(args).insertColumns(at: try args.int("at"), count: args.optInt("count") ?? 1); return [:]
        case "sheet.deleteColumns": try worksheet(args).deleteColumns(at: try args.int("at"), count: args.optInt("count") ?? 1); return [:]
        case "sheet.add": try workbook(args).addWorksheet(named: try args.string("name")); return [:]
        case "sheet.rename": try workbook(args).renameSheet(try args.string("old"), to: try args.string("new")); return [:]
        case "sheet.delete": try workbook(args).deleteSheet(named: try args.string("name")); return [:]

        case "doc.read": return try docRead(args)
        case "doc.setText": try paragraph(args).setText(try args.string("text")); return [:]
        case "doc.insertParagraph": return try docInsertParagraph(args)
        case "doc.appendParagraph": _ = try word(args).appendParagraph(try args.string("text"), style: args.optString("style")); return [:]
        case "doc.replace": return ["count": try word(args).replaceText(try args.string("find"), with: try args.string("replace"))]

        case "slide.read": return try slideRead(args)
        case "slide.setText": try slideShape(args).setText(try args.string("text")); return [:]
        case "slide.setNotes": try slide(args).setNotesText(try args.string("text")); return [:]
        case "slide.replace": return ["count": try presentation(args).replaceText(try args.string("find"), with: try args.string("replace"))]
        case "slide.delete": try presentation(args).deleteSlide(at: try args.int("index")); return [:]
        case "slide.move": try presentation(args).moveSlide(from: try args.int("from"), to: try args.int("to")); return [:]

        default: throw BridgeError("op", "thao tác '\(op)' không hỗ trợ")
        }
    }

    // MARK: Mở / lưu

    private func open(_ args: Args) throws -> [String: Any] {
        let data: Data
        if let b64 = args.optString("base64") {
            guard let d = Data(base64Encoded: b64) else { throw BridgeError("open", "base64 không hợp lệ") }
            data = d
        } else if let path = args.optString("path") {
            data = try Data(contentsOf: URL(fileURLWithPath: path))
        } else {
            throw BridgeError("open", "cần 'base64' hoặc 'path'")
        }
        counter += 1
        let handle = "h\(counter)"
        // Nhận diện loại theo phần tài liệu chính.
        if let wb = try? Workbook(data: data) {
            docs[handle] = .workbook(wb)
        } else if let doc = try? WordDocument(data: data) {
            docs[handle] = .word(doc)
        } else if let deck = try? Presentation(data: data) {
            docs[handle] = .presentation(deck)
        } else {
            throw BridgeError("open", "không nhận diện được tệp (không phải DOCX/XLSX/PPTX hợp lệ)")
        }
        return try info(handle: handle)
    }

    private func exportBytes(_ args: Args) throws -> Data {
        switch try doc(args) {
        case .workbook(let wb): return try wb.save()
        case .word(let d): return try d.save()
        case .presentation(let p): return try p.save()
        }
    }

    private func save(_ args: Args) throws -> [String: Any] {
        let url = URL(fileURLWithPath: try args.string("path"))
        switch try doc(args) {
        case .workbook(let wb): try wb.save(to: url)
        case .word(let d): try d.save(to: url)
        case .presentation(let p): try p.save(to: url)
        }
        return [:]
    }

    /// Lưu một batch delta XLSX vào staging; từ chối toàn batch nếu có thao tác chưa hỗ trợ.
    private func xlsxSaveDelta(_ args: Args) throws -> [String: Any] {
        guard let sourcePath = args.optString("source_document_path") ?? args.optString("sourcePath"),
              let targetPath = args.optString("target_path") ?? args.optString("targetPath") else {
            throw BridgeError("args", "cần source_document_path và target_path")
        }
        let sourceURL = URL(fileURLWithPath: sourcePath).standardizedFileURL
        let targetURL = URL(fileURLWithPath: targetPath).standardizedFileURL
        guard sourceURL != targetURL else {
            throw BridgeError("path", "đường dẫn staging phải khác đường dẫn nguồn")
        }
        guard let delta = args.raw["delta"] as? [String: Any] else {
            throw BridgeError("delta", "delta phải là JSON object")
        }

        var unsupported: [String] = []
        let allowedDeltaKeys: Set<String> = ["cells", "cleared_cells", "structural_ops"]
        for key in delta.keys where !allowedDeltaKeys.contains(key) {
            unsupported.append("delta.\(key)")
        }
        let cells = delta["cells"] as? [[String: Any]] ?? []
        let clearedCells = delta["cleared_cells"] as? [[String: Any]] ?? []
        let structuralOps = delta["structural_ops"] as? [[String: Any]] ?? []
        if delta["cells"] != nil && !(delta["cells"] is [[String: Any]]) {
            unsupported.append("cells must be an array")
        }
        if delta["cleared_cells"] != nil && !(delta["cleared_cells"] is [[String: Any]]) {
            unsupported.append("cleared_cells must be an array")
        }
        if delta["structural_ops"] != nil && !(delta["structural_ops"] is [[String: Any]]) {
            unsupported.append("structural_ops must be an array")
        }
        for (index, operation) in structuralOps.enumerated() {
            let name = operation["op"] as? String ?? "unknown"
            let operationArgs = operation["args"] as? [String: Any] ?? [:]
            let allowed: Set<String>
            switch name {
            case "sheet.freezePanes": allowed = ["sheet", "rows", "cols"]
            case "sheet.setTabColor": allowed = ["sheet", "color"]
            case "sheet.setPrintArea": allowed = ["sheet", "range"]
            default:
                unsupported.append("structural_ops[\(index)]: \(name)")
                continue
            }
            for key in operation.keys where key != "op" && key != "args" {
                unsupported.append("structural_ops[\(index)].\(key)")
            }
            for key in operationArgs.keys where !allowed.contains(key) {
                unsupported.append("structural_ops[\(index)].args.\(key)")
            }
            if !(operationArgs["sheet"] is String) {
                unsupported.append("structural_ops[\(index)].args.sheet")
            }
            switch name {
            case "sheet.freezePanes":
                if !(operationArgs["rows"] is Int) || !(operationArgs["cols"] is Int) {
                    unsupported.append("structural_ops[\(index)].args.rows/cols")
                }
            case "sheet.setTabColor":
                if !(operationArgs["color"] is String) { unsupported.append("structural_ops[\(index)].args.color") }
            case "sheet.setPrintArea":
                if !(operationArgs["range"] is String) { unsupported.append("structural_ops[\(index)].args.range") }
            default: break
            }
        }

        for (index, cell) in cells.enumerated() {
            let keys: Set<String> = ["sheet", "ref", "value", "type", "formula", "cached", "cachedType", "styleIndex"]
            for key in cell.keys where !keys.contains(key) {
                unsupported.append("cells[\(index)].\(key)")
            }
            if cell["formula"] == nil {
                guard cell["value"] != nil, let type = cell["type"] as? String,
                      ["number", "string", "bool", "boolean", "error", "empty"].contains(type) else {
                    unsupported.append("cells[\(index)]: value/type")
                    continue
                }
            } else if !(cell["formula"] is String) {
                unsupported.append("cells[\(index)].formula")
            }
            if let style = cell["styleIndex"], !(style is Int) || (style as? Int ?? -1) < 0 {
                unsupported.append("cells[\(index)].styleIndex")
            }
        }
        for (index, cell) in clearedCells.enumerated() {
            let keys: Set<String> = ["sheet", "range"]
            for key in cell.keys where !keys.contains(key) {
                unsupported.append("cleared_cells[\(index)].\(key)")
            }
            if !(cell["sheet"] is String) || !(cell["range"] is String) {
                unsupported.append("cleared_cells[\(index)]: sheet/range")
            }
        }
        guard unsupported.isEmpty else {
            return ["ok": false, "changedParts": [String](), "unsupported": unsupported.sorted()]
        }

        let sourceData = try Data(contentsOf: sourceURL)
        let workbook = try Workbook(data: sourceData)
        for (index, cell) in cells.enumerated() {
            guard let style = cell["styleIndex"] as? Int else { continue }
            if style > 0 && workbook.styles?.info(styleIndex: style) == nil {
                unsupported.append("cells[\(index)].styleIndex: không tồn tại style \(style)")
            }
        }
        guard unsupported.isEmpty else {
            return ["ok": false, "changedParts": [String](), "unsupported": unsupported.sorted()]
        }
        for (index, cell) in cells.enumerated() {
            guard let sheetName = cell["sheet"] as? String, let reference = cell["ref"] as? String,
                  CellReference(reference) != nil else {
                throw BridgeError("delta", "cells[\(index)] cần sheet và ref hợp lệ")
            }
            let worksheet = try workbook.worksheet(named: sheetName)
            if let formula = cell["formula"] as? String {
                let cachedValue = cell["cached"]
                let cachedType = cell["cachedType"] as? String ?? (cachedValue is String ? "string" : "number")
                let cached = try deltaCellValue(cachedValue, type: cachedValue == nil ? "empty" : cachedType)
                try worksheet.setFormula(formula, at: reference, cachedValue: cached)
            } else {
                try worksheet.setValue(deltaCellValue(cell["value"], type: cell["type"] as? String ?? "empty"), at: reference)
            }
            if let style = cell["styleIndex"] as? Int { try worksheet.setStyleIndex(style, at: reference) }
        }
        for (index, cell) in clearedCells.enumerated() {
            guard let sheetName = cell["sheet"] as? String, let rangeText = cell["range"] as? String,
                  let range = CellRange(rangeText) else {
                throw BridgeError("delta", "cleared_cells[\(index)] cần sheet và range hợp lệ")
            }
            let worksheet = try workbook.worksheet(named: sheetName)
            for existing in worksheet.cells where range.contains(existing.reference) {
                try worksheet.clear(existing.reference.a1)
            }
        }
        for (index, operation) in structuralOps.enumerated() {
            let name = operation["op"] as! String
            let operationArgs = operation["args"] as! [String: Any]
            let worksheet = try workbook.worksheet(named: operationArgs["sheet"] as! String)
            switch name {
            case "sheet.freezePanes":
                try worksheet.setFreezePanes(rows: operationArgs["rows"] as! Int, cols: operationArgs["cols"] as! Int)
            case "sheet.setTabColor":
                try worksheet.setTabColor(rgbHex: operationArgs["color"] as! String)
            case "sheet.setPrintArea":
                let rangeText = operationArgs["range"] as! String
                guard let range = CellRange(rangeText) else {
                    throw BridgeError("delta", "vùng in không hợp lệ: \(rangeText)")
                }
                try worksheet.setPrintArea(range: range)
            default: break
            }
        }

        try workbook.save(to: targetURL)
        do {
            let savedData = try Data(contentsOf: targetURL)
            let reopened = try Workbook(data: savedData)
            guard reopened.sheets.map(\.name) == workbook.sheets.map(\.name) else {
                throw BridgeError("reopen", "danh sách sheet sau khi mở lại không khớp")
            }
            for cell in cells {
                let sheet = try reopened.worksheet(named: cell["sheet"] as! String)
                let reference = cell["ref"] as! String
                if let formula = cell["formula"] as? String {
                    guard try sheet.cell(reference)?.formula == (formula.hasPrefix("=") ? String(formula.dropFirst()) : formula) else {
                        throw BridgeError("reopen", "công thức \(reference) không khớp sau khi mở lại")
                    }
                } else {
                    let expected = try deltaCellValue(cell["value"], type: cell["type"] as? String ?? "empty")
                    guard try sheet.value(reference) == expected else {
                        throw BridgeError("reopen", "giá trị \(reference) không khớp sau khi mở lại")
                    }
                }
                if let style = cell["styleIndex"] as? Int {
                    guard try sheet.cell(reference)?.styleIndex == style else {
                        throw BridgeError("reopen", "định dạng \(reference) không khớp sau khi mở lại")
                    }
                }
            }
            let changedParts = try Self.changedZipParts(before: sourceData, after: savedData)
            return ["ok": true, "changedParts": changedParts, "unsupported": [String]()]
        } catch {
            try? FileManager.default.removeItem(at: targetURL)
            throw error
        }
    }

    private func deltaCellValue(_ value: Any?, type: String) throws -> CellValue {
        switch type {
        case "number":
            if let number = value as? Double { return .number(number) }
            if let number = value as? Int { return .number(Double(number)) }
            if let text = value as? String, let number = Double(text) { return .number(number) }
            throw BridgeError("delta", "giá trị số không hợp lệ")
        case "string":
            guard let text = value as? String else { throw BridgeError("delta", "giá trị chuỗi không hợp lệ") }
            return .string(text)
        case "bool", "boolean":
            guard let flag = value as? Bool else { throw BridgeError("delta", "giá trị boolean không hợp lệ") }
            return .bool(flag)
        case "error":
            guard let text = value as? String else { throw BridgeError("delta", "giá trị lỗi không hợp lệ") }
            return .error(text)
        case "empty": return .empty
        default: throw BridgeError("delta", "kiểu ô '\(type)' không hỗ trợ")
        }
    }

    private static func changedZipParts(before: Data, after: Data) throws -> [String] {
        let oldArchive = try ZipArchive(data: before)
        let newArchive = try ZipArchive(data: after)
        var changed: [String] = []
        for name in Set(oldArchive.entryNames).union(newArchive.entryNames).sorted() {
            guard let oldEntry = oldArchive.entry(name), let newEntry = newArchive.entry(name) else {
                changed.append(name)
                continue
            }
            if try oldArchive.contents(of: oldEntry) != newArchive.contents(of: newEntry) {
                changed.append(name)
            }
        }
        return changed
    }

    private func info(_ args: Args) throws -> [String: Any] { try info(handle: try args.string("handle")) }

    private func info(handle: String) throws -> [String: Any] {
        guard let d = docs[handle] else { throw BridgeError("handle", "handle '\(handle)' không tồn tại") }
        var out: [String: Any] = ["handle": handle, "kind": d.kind]
        switch d {
        case .workbook(let wb):
            out["sheets"] = wb.sheets.map { ["name": $0.name, "state": $0.state, "kind": "\($0.kind)"] }
        case .word(let doc):
            out["paragraphs"] = doc.paragraphs.count
            out["tables"] = doc.tables.count
        case .presentation(let deck):
            out["slides"] = deck.slides.count
        }
        return out
    }

    // MARK: Lấy đối tượng từ handle

    private func doc(_ args: Args) throws -> Doc {
        guard let d = docs[try args.string("handle")] else { throw BridgeError("handle", "handle không tồn tại") }
        return d
    }

    private func workbook(_ args: Args) throws -> Workbook {
        guard case .workbook(let wb) = try doc(args) else { throw BridgeError("kind", "tài liệu không phải bảng tính") }
        return wb
    }
    private func worksheet(_ args: Args) throws -> Worksheet {
        let wb = try workbook(args)
        if let name = args.optString("sheet") { return try wb.worksheet(named: name) }
        return try wb.worksheet(at: args.optInt("sheetIndex") ?? 0)
    }
    private func word(_ args: Args) throws -> WordDocument {
        guard case .word(let d) = try doc(args) else { throw BridgeError("kind", "tài liệu không phải văn bản") }
        return d
    }
    private func paragraph(_ args: Args) throws -> Paragraph {
        let ps = try word(args).paragraphs
        let i = try args.int("index")
        guard ps.indices.contains(i) else { throw BridgeError("index", "đoạn \(i) ngoài phạm vi") }
        return ps[i]
    }
    private func presentation(_ args: Args) throws -> Presentation {
        guard case .presentation(let p) = try doc(args) else { throw BridgeError("kind", "tài liệu không phải trình chiếu") }
        return p
    }
    private func slide(_ args: Args) throws -> Slide { try presentation(args).slide(at: try args.int("index")) }
    private func slideShape(_ args: Args) throws -> Shape {
        let s = try slide(args)
        if let name = args.optString("shape"), let sh = s.shape(named: name) { return sh }
        if let t = s.titleShape { return t }
        guard let first = s.allShapes.first(where: \.hasTextFrame) else { throw BridgeError("shape", "slide không có khung chữ") }
        return first
    }

    // MARK: Sheet

    private func sheetRead(_ args: Args) throws -> [String: Any] {
        let ws = try worksheet(args)
        let styles = ws.workbook.styles
        func cellJSON(_ c: Cell) -> [String: Any] {
            var o: [String: Any] = ["ref": c.reference.a1, "value": BridgeValue.json(c.value), "style": c.styleIndex]
            if let f = c.formula { o["formula"] = f }
            if let info = styles?.info(styleIndex: c.styleIndex) {
                o["numberFormat"] = info.numberFormatCode
                if info.isDate { o["isDate"] = true }
            }
            return o
        }
        let cells: [Cell]
        if let r = args.optString("range"), let range = CellRange(r) {
            cells = ws.cells.filter { range.contains($0.reference) }
        } else {
            cells = ws.cells
        }
        return ["cells": cells.map(cellJSON), "used": ws.usedRange?.description ?? ""]
    }

    private func sheetSetValue(_ args: Args) throws -> [String: Any] {
        try worksheet(args).setValue(try BridgeValue.cellValue(from: args.raw["value"]), at: try args.string("ref"))
        return [:]
    }
    private func sheetSetFormula(_ args: Args) throws -> [String: Any] {
        let cached = args.raw["cached"] != nil ? try BridgeValue.cellValue(from: args.raw["cached"]) : CellValue.empty
        try worksheet(args).setFormula(try args.string("formula"), at: try args.string("ref"), cachedValue: cached)
        return [:]
    }

    // MARK: Doc

    private func docRead(_ args: Args) throws -> [String: Any] {
        let ps = try word(args).paragraphs
        let from = args.optInt("from") ?? 0
        let count = args.optInt("count") ?? ps.count
        let slice = ps.enumerated().filter { $0.offset >= from && $0.offset < from + count }
        return ["total": ps.count, "paragraphs": slice.map { (i, p) -> [String: Any] in
            var o: [String: Any] = ["index": i, "text": p.text]
            if let s = p.styleId { o["style"] = s }
            return o
        }]
    }

    private func docInsertParagraph(_ args: Args) throws -> [String: Any] {
        let doc = try word(args)
        let text = try args.string("text")
        let style = args.optString("style")
        if let after = args.optInt("afterIndex") {
            let ps = doc.paragraphs
            guard ps.indices.contains(after) else { throw BridgeError("index", "đoạn \(after) ngoài phạm vi") }
            _ = try doc.insertParagraph(text, style: style, after: ps[after])
        } else {
            _ = doc.appendParagraph(text, style: style)
        }
        return [:]
    }

    // MARK: Slide

    private func slideRead(_ args: Args) throws -> [String: Any] {
        let s = try slide(args)
        let shapes = s.allShapes.filter { $0.hasTextFrame || $0.table != nil }.map { sh -> [String: Any] in
            var o: [String: Any] = ["name": sh.name, "kind": "\(sh.kind)"]
            if let ph = sh.placeholderType { o["placeholder"] = ph }
            if let t = sh.table { o["table"] = t } else { o["text"] = sh.text }
            return o
        }
        var out: [String: Any] = ["index": try args.int("index"), "shapes": shapes]
        if let title = s.title { out["title"] = title }
        if let notes = s.notesText { out["notes"] = notes }
        return out
    }
}
