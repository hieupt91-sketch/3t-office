import Foundation
import OOXMLPackage

extension Worksheet {
    /// Chèn `count` cột trống trước cột `column` (1 = A).
    public func insertColumns(at column: Int, count: Int = 1) throws {
        guard column >= 1, count >= 1, column <= CellReference.maxColumn else { throw SpreadsheetError.invalidRowOperation("vị trí/số lượng cột không hợp lệ") }
        if let maxCol = usedRange?.end.column, maxCol + count > CellReference.maxColumn {
            throw SpreadsheetError.invalidRowOperation("dữ liệu sẽ vượt cột XFD")
        }
        try workbook.shiftColumns(in: self, at: column, delta: count)
    }

    public func insertColumns(at letters: String, count: Int = 1) throws {
        guard let c = CellReference.columnNumber(letters) else { throw SpreadsheetError.invalidReference(letters) }
        try insertColumns(at: c, count: count)
    }

    /// Xóa `count` cột bắt đầu từ `column`. Tham chiếu tới ô bị xóa thành #REF!.
    public func deleteColumns(at column: Int, count: Int = 1) throws {
        guard column >= 1, count >= 1 else { throw SpreadsheetError.invalidRowOperation("vị trí/số lượng cột không hợp lệ") }
        try workbook.shiftColumns(in: self, at: column, delta: -count)
    }

    public func deleteColumns(at letters: String, count: Int = 1) throws {
        guard let c = CellReference.columnNumber(letters) else { throw SpreadsheetError.invalidReference(letters) }
        try deleteColumns(at: c, count: count)
    }

    func moveColumnElements(at column: Int, delta: Int) {
        for r in sheetData.children(NS.s, "row") {
            var minC = Int.max
            var maxC = 0
            for c in r.children(NS.s, "c") {
                guard let ref = c.attribute("r").flatMap(CellReference.init) else { continue }
                guard let nc = FormulaRewriter.mapIndex(ref.column, at: column, delta: delta, max: CellReference.maxColumn) else {
                    c.removeFromParent()
                    continue
                }
                if nc != ref.column { c.setAttribute("r", CellReference(column: nc, row: ref.row).a1) }
                minC = min(minC, nc)
                maxC = max(maxC, nc)
            }
            if r.attribute("spans") != nil {
                if maxC > 0 { r.setAttribute("spans", "\(minC):\(maxC)") } else { r.removeAttribute("spans") }
            }
        }
        if let cols = document.root.firstChild(NS.s, "cols") {
            for col in cols.children(NS.s, "col") {
                guard let a = Int(col.attribute("min") ?? ""), let b = Int(col.attribute("max") ?? "") else { continue }
                guard let (na, nb) = FormulaRewriter.mapSpan(a, b, at: column, delta: delta, max: CellReference.maxColumn) else {
                    col.removeFromParent()
                    continue
                }
                col.setAttribute("min", String(na))
                col.setAttribute("max", String(nb))
            }
            if cols.elements.isEmpty { cols.removeFromParent() }
        }
    }
}

extension Workbook {
    func shiftColumns(in ws: Worksheet, at column: Int, delta: Int) throws {
        // Chặn trước khi sửa: chèn/xóa cột cắt ngang bảng (table) hoặc bộ lọc có điều kiện cần thêm/bớt cột của bảng — chưa hỗ trợ.
        let n = abs(delta)
        func cutsThrough(_ range: CellRange) -> Bool {
            if delta > 0 { return range.start.column < column && column <= range.end.column }
            let delEnd = column + n - 1
            let overlaps = !(delEnd < range.start.column || column > range.end.column)
            let covers = column <= range.start.column && delEnd >= range.end.column
            return overlaps && !covers
        }
        for t in try package.relatedParts(from: ws.part, .table) where package.hasPart(t) {
            if let r = try package.xml(t).root.attribute("ref").flatMap(CellRange.init), cutsThrough(r) {
                throw SpreadsheetError.invalidRowOperation("cột \(CellReference.columnName(column)) cắt ngang bảng \(r) — chèn/xóa cột trong bảng chưa hỗ trợ")
            }
        }
        if let af = ws.document.root.firstChild(NS.s, "autoFilter"), af.firstChild(NS.s, "filterColumn") != nil,
           let r = af.attribute("ref").flatMap(CellRange.init), cutsThrough(r) {
            throw SpreadsheetError.invalidRowOperation("cột cắt ngang vùng lọc đang có điều kiện lọc — hãy bỏ lọc trước")
        }
        let all = try sheets.filter { $0.kind == .worksheet }.map { try worksheet(named: $0.name) }
        for w in all { w.expandAllSharedFormulas() }
        ws.adjustOwnRanges { FormulaRewriter.adjustColumns($0, formulaSheet: ws.name, target: ws.name, at: column, delta: delta) }
        ws.moveColumnElements(at: column, delta: delta)
        let rewrite = { (sheetName: String) in
            { (f: String) in FormulaRewriter.adjustColumns(f, formulaSheet: sheetName, target: ws.name, at: column, delta: delta) }
        }
        for w in all { _ = w.rewriteFormulas(rewrite(w.name)) }
        ws.reindex()
        if let dns = document.root.firstChild(NS.s, "definedNames") {
            var changed = false
            for dn in dns.children(NS.s, "definedName") {
                let t = dn.textContent
                let nt = rewrite("")(t)
                if nt != t { dn.setText(nt); changed = true }
            }
            if changed { package.markModified(workbookPart) }
        }
        try rewriteCharts(rewrite(""))
        for t in try package.relatedParts(from: ws.part, .table) where package.hasPart(t) {
            let doc = try package.xml(t)
            var changed = false
            for e in [doc.root] + doc.root.children(NS.s, "autoFilter") {
                guard let ref = e.attribute("ref") else { continue }
                let nr = FormulaRewriter.adjustColumns(ref, formulaSheet: ws.name, target: ws.name, at: column, delta: delta)
                if nr != ref && !nr.contains("#REF!") { e.setAttribute("ref", nr); changed = true }
            }
            if changed { package.markModified(t) }
        }
        let xdr = XMLNamespace("http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing", prefix: "xdr")
        for d in try package.relatedParts(from: ws.part, .drawing) where package.hasPart(d) {
            let doc = try package.xml(d)
            var changed = false
            doc.root.forEachDescendant { e in
                guard e.is(xdr, "col"), let p = e.parent, p.localName == "from" || p.localName == "to", let c0 = Int(e.textContent) else { return }
                let c1 = c0 + 1
                let nc = delta > 0 ? (c1 >= column ? c1 + delta : c1) : (c1 >= column + n ? c1 - n : (c1 >= column ? column : c1))
                if nc != c1 { e.setText(String(nc - 1)); changed = true }
            }
            if changed { package.markModified(d) }
        }
        for c in try package.relatedParts(from: ws.part, .comments) where package.hasPart(c) {
            let doc = try package.xml(c)
            var changed = false
            for cm in doc.root.firstChild(NS.s, "commentList")?.children(NS.s, "comment") ?? [] {
                guard let ref = cm.attribute("ref"), let cell = CellReference(ref) else { continue }
                if let nc = FormulaRewriter.mapIndex(cell.column, at: column, delta: delta, max: CellReference.maxColumn) {
                    if nc != cell.column { cm.setAttribute("ref", CellReference(column: nc, row: cell.row).a1); changed = true }
                } else {
                    cm.removeFromParent()
                    changed = true
                }
            }
            if changed { package.markModified(c) }
        }
        for v in try package.relatedParts(from: ws.part, .vmlDrawing) where package.hasPart(v) {
            guard let doc = try? package.xml(v) else { continue }
            var changed = false
            doc.root.forEachDescendant { e in
                guard e.localName == "Column", e.parent?.localName == "ClientData",
                      let c0 = Int(e.textContent.trimmingCharacters(in: .whitespaces)) else { return }
                if let nc = FormulaRewriter.mapIndex(c0 + 1, at: column, delta: delta, max: CellReference.maxColumn), nc != c0 + 1 {
                    e.setText(String(nc - 1))
                    changed = true
                }
            }
            if changed { package.markModified(v) }
        }
        invalidateCalcChain()
        requestRecalculation()
    }
}
