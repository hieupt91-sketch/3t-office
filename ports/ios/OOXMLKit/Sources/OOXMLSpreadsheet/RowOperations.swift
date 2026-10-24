import Foundation
import OOXMLPackage

extension Worksheet {
    /// Chèn `count` hàng trống trước hàng `row` (như Excel: Insert ▸ Entire row).
    public func insertRows(at row: Int, count: Int = 1) throws {
        guard row >= 1, count >= 1, row <= CellReference.maxRow else { throw SpreadsheetError.invalidRowOperation("vị trí/số lượng không hợp lệ") }
        if let last = cells.last?.reference.row, last + count > CellReference.maxRow {
            throw SpreadsheetError.invalidRowOperation("dữ liệu sẽ vượt hàng \(CellReference.maxRow)")
        }
        try workbook.shiftRows(in: self, at: row, delta: count)
    }

    /// Xóa `count` hàng bắt đầu từ `row`. Tham chiếu tới ô bị xóa thành #REF!, vùng bị xóa một phần co lại.
    public func deleteRows(at row: Int, count: Int = 1) throws {
        guard row >= 1, count >= 1 else { throw SpreadsheetError.invalidRowOperation("vị trí/số lượng không hợp lệ") }
        try workbook.shiftRows(in: self, at: row, delta: -count)
    }

    /// Đổi số hàng của mọi hàng/ô trong sheet; xóa hàng nằm trong vùng bị xóa.
    func moveRowElements(at row: Int, delta: Int) {
        for r in sheetData.children(NS.s, "row") {
            guard let n = Int(r.attribute("r") ?? "") else { continue }
            guard let nr = FormulaRewriter.mapRow(n, at: row, delta: delta) else {
                r.removeFromParent()
                continue
            }
            guard nr != n else { continue }
            r.setAttribute("r", String(nr))
            for c in r.children(NS.s, "c") {
                if let ref = c.attribute("r").flatMap(CellReference.init) {
                    c.setAttribute("r", CellReference(column: ref.column, row: nr).a1)
                }
            }
        }
    }

    /// Ngắt trang thủ công: brk@id = chỉ số (từ 0) của hàng/cột đứng ngay trước chỗ ngắt
    /// (ngắt nằm trên hàng id+1 tính từ 1). Ngắt nằm trong vùng bị xóa thì bỏ.
    func shiftBreaks(_ container: String, at index: Int, delta: Int) {
        guard let breaks = document.root.firstChild(NS.s, container) else { return }
        for b in breaks.children(NS.s, "brk") {
            guard let id = Int(b.attribute("id") ?? "") else { continue }
            if let n = FormulaRewriter.mapIndex(id + 1, at: index, delta: delta, max: Int.max) {
                if n != id + 1 { b.setAttribute("id", String(n - 1)) }
            } else {
                b.removeFromParent()
            }
        }
        let all = breaks.children(NS.s, "brk")
        if all.isEmpty {
            breaks.removeFromParent()
        } else {
            breaks.setAttribute("count", String(all.count))
            breaks.setAttribute("manualBreakCount", String(all.filter { $0.attribute("man") == "1" }.count))
        }
    }

    /// Cập nhật thuộc tính dạng vùng (sqref/ref) của chính sheet này. Mục bị xóa hết thì bỏ.
    func adjustOwnRanges(at row: Int, delta: Int) {
        adjustOwnRanges { FormulaRewriter.adjustRows($0, formulaSheet: self.name, target: self.name, at: row, delta: delta) }
    }

    func adjustOwnRanges(using transform: @escaping (String) -> String) {
        let adjust = { (text: String) -> String? in
            let items = text.split(separator: " ").map { String($0) }
            let out = items.compactMap { item -> String? in
                let n = transform(item)
                return n.contains("#REF!") ? nil : n
            }
            return out.isEmpty ? nil : out.joined(separator: " ")
        }
        var toRemove: [XElement] = []
        document.root.forEachDescendant { e in
            let ln = e.localName
            let attr: String?
            switch ln {
            case "mergeCell", "dimension", "autoFilter": attr = "ref"
            case "conditionalFormatting", "dataValidation", "selection", "protectedRange": attr = "sqref"
            case "hyperlink": attr = "ref"
            case "f": attr = e.attribute("ref") != nil ? "ref" : nil
            case "pane": attr = "topLeftCell"
            default: attr = nil
            }
            if let attr, let v = e.attribute(attr) {
                if let n = adjust(v) {
                    if n != v { e.setAttribute(attr, n) }
                } else if ln == "dimension" || ln == "selection" || ln == "pane" {
                    e.setAttribute(attr, "A1")
                } else if ln == "f" {
                    e.removeAttribute(attr)
                } else {
                    toRemove.append(e)
                }
            }
            if ln == "selection", let ac = e.attribute("activeCell"), let n = adjust(ac), n != ac { e.setAttribute("activeCell", n) }
            if ln == "sqref", e.elements.isEmpty { // xm:sqref của x14
                let v = e.textContent
                if let n = adjust(v) { if n != v { e.setText(n) } } else if let parent = e.parent { toRemove.append(parent) }
            }
        }
        for e in toRemove { e.removeFromParent() }
        if let mc = document.root.firstChild(NS.s, "mergeCells") {
            let n = mc.children(NS.s, "mergeCell").count
            if n == 0 { mc.removeFromParent() } else { mc.setAttribute("count", String(n)) }
        }
        if let dv = document.root.firstChild(NS.s, "dataValidations") {
            let n = dv.children(NS.s, "dataValidation").count
            if n == 0 { dv.removeFromParent() } else { dv.setAttribute("count", String(n)) }
        }
        workbook.package.markModified(part)
    }
}

extension Workbook {
    func shiftRows(in ws: Worksheet, at row: Int, delta: Int) throws {
        let sheetsList = sheets.filter { $0.kind == .worksheet }
        let all = try sheetsList.map { try worksheet(named: $0.name) }
        // Công thức chia sẻ phụ thuộc vị trí tương đối → mở rộng thành công thức thường trước khi dịch hàng.
        for w in all { w.expandAllSharedFormulas() }
        // Bảng (table) và sqref của chính sheet phải tính TRƯỚC khi đổi số hàng.
        ws.adjustOwnRanges(at: row, delta: delta)
        ws.shiftBreaks("rowBreaks", at: row, delta: delta)
        ws.moveRowElements(at: row, delta: delta)
        let rewrite = { (sheetName: String) in
            { (f: String) in FormulaRewriter.adjustRows(f, formulaSheet: sheetName, target: ws.name, at: row, delta: delta) }
        }
        for w in all { _ = w.rewriteFormulas(rewrite(w.name)) }
        ws.reindex()
        // Tên định nghĩa và biểu đồ luôn tham chiếu có tên sheet.
        if let dns = document.root.firstChild(NS.s, "definedNames") {
            var changed = false
            for dn in dns.children(NS.s, "definedName") {
                let t = dn.textContent
                let n = rewrite("")(t)
                if n != t { dn.setText(n); changed = true }
            }
            if changed { package.markModified(workbookPart) }
        }
        try rewriteCharts(rewrite(""))
        try shiftTables(of: ws, at: row, delta: delta)
        try shiftDrawingsAndComments(of: ws, at: row, delta: delta)
        invalidateCalcChain()
        requestRecalculation()
    }

    private func shiftTables(of ws: Worksheet, at row: Int, delta: Int) throws {
        for t in try package.relatedParts(from: ws.part, .table) where package.hasPart(t) {
            let doc = try package.xml(t)
            var changed = false
            for e in [doc.root] + doc.root.children(NS.s, "autoFilter") {
                guard let ref = e.attribute("ref") else { continue }
                let n = FormulaRewriter.adjustRows(ref, formulaSheet: ws.name, target: ws.name, at: row, delta: delta)
                if n != ref && !n.contains("#REF!") { e.setAttribute("ref", n); changed = true }
            }
            if changed { package.markModified(t) }
        }
    }

    /// Ảnh/biểu đồ neo theo ô (xdr:from/to, chỉ số hàng từ 0) và bình luận (comments@ref, VML x:Row).
    private func shiftDrawingsAndComments(of ws: Worksheet, at row: Int, delta: Int) throws {
        let xdr = XMLNamespace("http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing", prefix: "xdr")
        for d in try package.relatedParts(from: ws.part, .drawing) where package.hasPart(d) {
            let doc = try package.xml(d)
            var changed = false
            doc.root.forEachDescendant { e in
                guard e.is(xdr, "row"), let parent = e.parent, parent.localName == "from" || parent.localName == "to",
                      let r0 = Int(e.textContent) else { return }
                let r1 = r0 + 1
                let n = delta > 0 ? (r1 >= row ? r1 + delta : r1) : (r1 >= row - delta ? r1 + delta : (r1 >= row ? row : r1))
                if n != r1 { e.setText(String(n - 1)); changed = true }
            }
            if changed { package.markModified(d) }
        }
        for c in try package.relatedParts(from: ws.part, .comments) where package.hasPart(c) {
            let doc = try package.xml(c)
            var changed = false
            for cm in doc.root.firstChild(NS.s, "commentList")?.children(NS.s, "comment") ?? [] {
                guard let ref = cm.attribute("ref"), let cell = CellReference(ref) else { continue }
                if let nr = FormulaRewriter.mapRow(cell.row, at: row, delta: delta) {
                    if nr != cell.row { cm.setAttribute("ref", CellReference(column: cell.column, row: nr).a1); changed = true }
                } else {
                    cm.removeFromParent()
                    changed = true
                }
            }
            if changed { package.markModified(c) }
        }
        for v in try package.relatedParts(from: ws.part, .vmlDrawing) where package.hasPart(v) {
            // VML của Excel thường là XML hợp lệ; nếu không phân tích được thì giữ nguyên (không mất dữ liệu).
            guard let doc = try? package.xml(v) else { continue }
            var changed = false
            doc.root.forEachDescendant { e in
                guard e.localName == "Row", e.parent?.localName == "ClientData", let r0 = Int(e.textContent.trimmingCharacters(in: .whitespaces)) else { return }
                if let nr = FormulaRewriter.mapRow(r0 + 1, at: row, delta: delta), nr != r0 + 1 {
                    e.setText(String(nr - 1))
                    changed = true
                }
            }
            if changed { package.markModified(v) }
        }
    }
}
