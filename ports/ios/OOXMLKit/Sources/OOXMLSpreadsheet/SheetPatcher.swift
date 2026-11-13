import Foundation
import OOXMLPackage

public enum SheetPatchError: Error, Equatable, CustomStringConvertible {
    /// Trường hợp đường vá không xử lý: người gọi dùng `Worksheet` (đường DOM) thay thế. Chưa có gì bị sửa.
    case unsupported(String)
    case alreadyCommitted

    public var description: String {
        switch self {
        case .unsupported(let why): return "Đường vá sheet không hỗ trợ trường hợp này (\(why)); dùng Worksheet"
        case .alreadyCommitted: return "SheetPatcher đã ghi xong; tạo bộ vá mới để sửa tiếp"
        }
    }
}

/// Ghi giá trị vào ô của một trang tính LỚN mà không dựng DOM cho cả sheet.
///
/// `Worksheet.setValue` cần cây XML của toàn bộ `sheetN.xml` (sheet ~100.000 hàng: hàng trăm MB). Bộ vá
/// này chỉ parse những hàng bị sửa, ghi ô bằng CHÍNH các hàm của `Worksheet` (`insertNewCell`, `write`,
/// `updateDimension`), rồi ghép kết quả vào byte gốc; mọi hàng khác giữ nguyên từng byte.
///
/// Phạm vi: đặt giá trị (số/chuỗi/bool/lỗi/rỗng), đặt công thức (kèm giá trị đệm) và đặt chỉ số định dạng cho ô.
/// Những trường hợp cần hiểu biết toàn sheet thì từ chối bằng `SheetPatchError.unsupported` trước khi sửa bất cứ
/// gì, để người gọi rơi về đường DOM: ô đích đang thuộc công thức chia sẻ (cần bung cả nhóm), sheet có công thức
/// mảng/bảng dữ liệu, số hàng/ô ngầm định, hàng không tăng dần, `<sheetData/>` tự đóng, hoặc sheet đang được giữ
/// ở dạng DOM. Ô đích đang có công thức THƯỜNG thì ghi đè được (như `Worksheet`), kèm hủy `calcChain`.
public final class SheetPatcher {
    public let workbook: Workbook
    public let part: PartName

    private let reader: SheetRowReader
    private enum Content {
        case value(CellValue)
        case formula(String, cached: CellValue)
    }
    /// Lần ghi đã xếp cho một ô. Gộp tuần tự như gọi `Worksheet` lần lượt: nội dung lần sau thắng, chỉ số định dạng
    /// lần sau thắng, và ghi nội dung không đụng định dạng đã đặt.
    private struct CellEdit {
        var content: Content?
        var style: Int?
    }
    private var edits: [CellReference: CellEdit] = [:]
    private var committed = false

    init(workbook: Workbook, part: PartName) throws {
        self.workbook = workbook
        self.part = part
        if workbook.isWorksheetLoaded(part) || workbook.package.isXMLLoaded(part) {
            throw SheetPatchError.unsupported("sheet đang được giữ ở dạng DOM")
        }
        reader = try SheetRowReader(workbook: workbook, part: part)
        if reader.sheetDataSelfClosing { throw SheetPatchError.unsupported("sheetData tự đóng") }
        if !reader.ascending { throw SheetPatchError.unsupported("hàng không tăng dần") }
        if reader.hasImplicitRowNumbers { throw SheetPatchError.unsupported("số hàng ngầm định") }
        if try containsArrayFormula() { throw SheetPatchError.unsupported("sheet có công thức mảng hoặc bảng dữ liệu") }
    }

    /// Xếp hàng một lần ghi giá trị (ghi đè lần xếp trước cho cùng ô). Chưa sửa gì cho tới `commit()`.
    public func setValue(_ value: CellValue, at ref: CellReference) throws {
        guard !committed else { throw SheetPatchError.alreadyCommitted }
        if case .string(let s) = value, s.count > 32_767 { throw SpreadsheetError.stringTooLong(s.count) }
        edits[ref, default: CellEdit()].content = .value(value)
    }

    /// Xếp hàng ghi công thức (có hay không có "=" ở đầu đều được) kèm giá trị đệm, như `Worksheet.setFormula`.
    public func setFormula(_ formula: String, cachedValue: CellValue = .empty, at ref: CellReference) throws {
        guard !committed else { throw SheetPatchError.alreadyCommitted }
        if case .string(let s) = cachedValue, s.count > 32_767 { throw SpreadsheetError.stringTooLong(s.count) }
        let text = formula.hasPrefix("=") ? String(formula.dropFirst()) : formula
        edits[ref, default: CellEdit()].content = .formula(text, cached: cachedValue)
    }

    public func setFormula(_ formula: String, cachedValue: CellValue = .empty, at a1: String) throws {
        guard let ref = CellReference(a1) else { throw SpreadsheetError.invalidReference(a1) }
        try setFormula(formula, cachedValue: cachedValue, at: ref)
    }

    /// Xếp hàng đặt chỉ số định dạng (0 = bỏ thuộc tính), như `Worksheet.setStyleIndex`. Không kiểm chỉ số có
    /// tồn tại trong styles hay không (đường DOM cũng không kiểm ở mức này).
    public func setStyleIndex(_ index: Int, at ref: CellReference) throws {
        guard !committed else { throw SheetPatchError.alreadyCommitted }
        edits[ref, default: CellEdit()].style = index
    }

    public func setStyleIndex(_ index: Int, at a1: String) throws {
        guard let ref = CellReference(a1) else { throw SpreadsheetError.invalidReference(a1) }
        try setStyleIndex(index, at: ref)
    }

    public func setValue(_ value: CellValue, at a1: String) throws {
        guard let ref = CellReference(a1) else { throw SpreadsheetError.invalidReference(a1) }
        try setValue(value, at: ref)
    }

    /// Áp mọi lần ghi đã xếp vào byte của sheet. Ném `unsupported` thì gói chưa bị đổi.
    public func commit() throws {
        guard !committed else { throw SheetPatchError.alreadyCommitted }
        guard !edits.isEmpty else { committed = true; return }

        // Giai đoạn 1: dựng DOM nhỏ cho từng hàng bị đụng và kiểm mọi điều kiện, CHƯA sửa gì.
        var patches: [RowPatch] = []
        var appended: [Int] = [] // hàng mới lớn hơn mọi hàng hiện có
        let byRow = Dictionary(grouping: edits.keys, by: \.row)
        for r in byRow.keys.sorted() {
            let index = reader.lowerBound(r)
            if index < reader.rowCount, reader.rowNumbers[index] == r {
                patches.append(try existingRowPatch(index: index))
            } else if index < reader.rowCount {
                let at = reader.rowStarts[index]
                patches.append(try newRowPatch(rows: [r], bytes: at..<at, after: nil))
            } else {
                appended.append(r)
            }
        }
        if !appended.isEmpty {
            if reader.rowCount == 0 {
                let at = reader.sheetDataOpenEnd
                patches.append(try newRowPatch(rows: appended, bytes: at..<at, after: nil))
            } else {
                // Hàng mới nối ngay sau phần tử hàng cuối (như Worksheet.rowElement): đi qua DOM nhỏ của hàng cuối.
                let last = reader.rowCount - 1
                if let i = patches.firstIndex(where: { $0.index == last }) {
                    try addRows(appended, to: &patches[i])
                } else {
                    var patch = try existingRowPatch(index: last)
                    try addRows(appended, to: &patch)
                    patches.append(patch)
                }
            }
        }
        // Công thức hiện có trong ô đích: chia sẻ/mảng/bảng dữ liệu cần hiểu cả nhóm ⇒ từ chối; công thức thường
        // thì bị ghi đè (nếu có ghi nội dung) và phải hủy calcChain như đường DOM.
        var dropsOrAddsFormula = false
        for patch in patches {
            for (_, row) in patch.rows {
                for c in row.children(NS.s, "c") {
                    guard let ref = c.attribute("r").flatMap(CellReference.init) else {
                        throw SheetPatchError.unsupported("ô không ghi địa chỉ")
                    }
                    guard let edit = edits[ref], let f = c.firstChild(NS.s, "f") else { continue }
                    if let type = f.attribute("t"), type != "normal" {
                        throw SheetPatchError.unsupported("ô \(ref.a1) thuộc công thức \(type)")
                    }
                    if edit.content != nil { dropsOrAddsFormula = true }
                }
            }
        }
        for edit in edits.values {
            if case .formula = edit.content { dropsOrAddsFormula = true }
        }
        let head = try patchedHead()

        // Giai đoạn 2: ghi giá trị bằng các hàm dùng chung với Worksheet.
        for patch in patches {
            let root = patch.document.root
            let q: (String) -> String = { root.qualifiedName($0, in: NS.s).name }
            for (r, row) in patch.rows {
                for ref in (byRow[r] ?? []).sorted() {
                    guard let edit = edits[ref] else { continue }
                    let existing = row.children(NS.s, "c").first { $0.attribute("r").flatMap(CellReference.init) == ref }
                    let c = existing ?? Worksheet.insertNewCell(ref, into: row, name: q("c"))
                    switch edit.content {
                    case .value(let value)?:
                        try Worksheet.write(value, formula: nil, into: c, workbook: workbook, q: q)
                    case .formula(let text, let cached)?:
                        try Worksheet.write(cached, formula: text, into: c, workbook: workbook, q: q)
                    case nil: break
                    }
                    if let style = edit.style {
                        if style == 0 { c.removeAttribute("s") } else { Worksheet.setAttributeAfterR(c, "s", String(style)) }
                    }
                }
            }
        }

        // Giai đoạn 3: ghép byte gốc + các đoạn đã sửa.
        var out = Data(capacity: reader.data.count + 4096)
        out.append(slice(0..<reader.rootOpenEnd))
        out.append(head)
        var cursor = reader.sheetDataOpenStart
        for patch in patches.sorted(by: { ($0.bytes.lowerBound, $0.bytes.isEmpty ? 0 : 1) < ($1.bytes.lowerBound, $1.bytes.isEmpty ? 0 : 1) }) {
            out.append(slice(cursor..<patch.bytes.lowerBound))
            out.append(XElement.serializedFragment(patch.sheetData.children))
            cursor = patch.bytes.upperBound
        }
        out.append(slice(cursor..<reader.data.count))

        workbook.package.setData(out, for: part)
        if dropsOrAddsFormula { workbook.invalidateCalcChain() }
        if edits.values.contains(where: { $0.content != nil }) { workbook.requestRecalculation() }
        committed = true
    }

    // MARK: Nội bộ

    private struct RowPatch {
        let index: Int? // chỉ số hàng hiện có trong chỉ mục (nil = chỉ gồm hàng mới)
        let bytes: Range<Int> // khoảng byte gốc bị thay (rỗng = chèn)
        let document: XDocument
        let sheetData: XElement
        var rows: [(number: Int, element: XElement)]
    }

    private func miniDocument(bytes: Range<Int>) throws -> (document: XDocument, sheetData: XElement) {
        let parsed = try reader.parse(bytes: bytes)
        guard let sd = parsed.document.root.firstChild(NS.s, "sheetData") else {
            throw SheetPatchError.unsupported("không dựng được sheetData")
        }
        return (parsed.document, sd)
    }

    private func existingRowPatch(index: Int) throws -> RowPatch {
        let bytes = reader.byteRange(of: index..<(index + 1))
        let mini = try miniDocument(bytes: bytes)
        let elements = mini.sheetData.elements
        guard elements.count == 1, let row = elements.first, row.is(NS.s, "row"), row.attribute("r") != nil else {
            throw SheetPatchError.unsupported("hàng \(reader.rowNumbers[index]) có cấu trúc lạ")
        }
        return RowPatch(index: index, bytes: bytes, document: mini.document, sheetData: mini.sheetData,
                        rows: [(reader.rowNumbers[index], row)])
    }

    /// DOM nhỏ rỗng chèn tại `bytes` (rỗng), chứa các hàng mới theo thứ tự tăng dần.
    private func newRowPatch(rows numbers: [Int], bytes: Range<Int>, after: XElement?) throws -> RowPatch {
        let mini = try miniDocument(bytes: bytes)
        var patch = RowPatch(index: nil, bytes: bytes, document: mini.document, sheetData: mini.sheetData, rows: [])
        try addRows(numbers, to: &patch)
        return patch
    }

    /// Thêm các hàng mới vào DOM nhỏ, ngay sau hàng cuối đang có trong đó (hoặc ở đầu nếu chưa có hàng nào).
    private func addRows(_ numbers: [Int], to patch: inout RowPatch) throws {
        let name = patch.document.root.qualifiedName("row", in: NS.s).name
        var previous = patch.rows.last?.element
        for r in numbers.sorted() {
            let row = XElement(name: name, attributes: [XAttribute(name: "r", value: String(r))])
            if let previous {
                patch.sheetData.insert(row, after: previous)
            } else {
                patch.sheetData.insert(row, at: 0)
            }
            patch.rows.append((r, row))
            previous = row
        }
    }

    /// Phần đầu sheet (giữa thẻ mở gốc và `<sheetData`) sau khi nới `<dimension>`; giữ nguyên byte nếu không đổi.
    private func patchedHead() throws -> Data {
        let original = slice(reader.rootOpenEnd..<reader.sheetDataOpenStart)
        var doc = Data(capacity: reader.rootOpenTag.count + original.count + 32)
        doc.append(reader.rootOpenTag)
        doc.append(original)
        let rootName = String(decoding: reader.rootOpenTag.dropFirst().prefix { !SheetRowReader.isDelimiter($0) }, as: UTF8.self)
        doc.append(Data("</\(rootName)>".utf8))
        let parsed: XDocument
        do {
            parsed = try XDocument(data: doc)
        } catch {
            throw SheetPatchError.unsupported("phần đầu sheet không parse riêng được")
        }
        let before = parsed.root.firstChild(NS.s, "dimension")?.attribute("ref")
        for ref in edits.keys.sorted() { Worksheet.updateDimension(root: parsed.root, ref) }
        let after = parsed.root.firstChild(NS.s, "dimension")?.attribute("ref")
        if before != nil, before == after { return original }
        return XElement.serializedFragment(parsed.root.children)
    }

    private func containsArrayFormula() throws -> Bool {
        let from = reader.sheetDataOpenEnd, to = reader.sheetDataEnd
        guard from < to else { return false }
        return reader.data.withUnsafeBytes { (raw: UnsafeRawBufferPointer) -> Bool in
            let b = raw.bindMemory(to: UInt8.self)
            for needle in ["t=\"array\"", "t='array'", "t=\"dataTable\"", "t='dataTable'"] {
                if SheetRowReader.find(Array(needle.utf8), in: b, from: from, to: to, boundaryAfter: false) != nil { return true }
            }
            return false
        }
    }

    private func slice(_ range: Range<Int>) -> Data {
        let base = reader.data.startIndex
        return reader.data.subdata(in: (base + range.lowerBound)..<(base + range.upperBound))
    }
}

extension Workbook {
    /// Bộ vá giá trị ô cho sheet thứ `index` — không dựng DOM cả sheet. Ném `SheetPatchError.unsupported`
    /// khi sheet thuộc trường hợp phải đi đường DOM.
    public func patcher(forSheetAt index: Int) throws -> SheetPatcher {
        let all = sheets
        guard all.indices.contains(index) else { throw SpreadsheetError.sheetNotFound("#\(index)") }
        return try patcher(all[index])
    }

    /// Bộ vá giá trị ô cho sheet tên `name`.
    public func patcher(forSheetNamed name: String) throws -> SheetPatcher {
        guard let info = sheets.first(where: { $0.name.caseInsensitiveCompare(name) == .orderedSame }) else {
            throw SpreadsheetError.sheetNotFound(name)
        }
        return try patcher(info)
    }

    private func patcher(_ info: SheetInfo) throws -> SheetPatcher {
        guard info.kind == .worksheet, let part = info.part else { throw SpreadsheetError.notAWorksheet(info.name) }
        return try SheetPatcher(workbook: self, part: part)
    }
}
