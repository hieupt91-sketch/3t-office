import Foundation
import OOXMLPackage

/// Đọc ô của một trang tính THEO CỬA SỔ HÀNG mà không dựng DOM cho cả sheet.
///
/// `Worksheet` dựng cây XML cho toàn bộ `sheetN.xml` — với sheet lớn, lần chạm ô đầu tiên tốn
/// hàng trăm MB và vài giây. Bộ đọc này quét byte thô một lượt để lập chỉ mục vị trí từng `<row>`,
/// rồi chỉ parse đúng các hàng được hỏi (bằng chính bộ parser và bộ giải mã ô của `Worksheet`,
/// nên kết quả giống hệt đường DOM).
///
/// - Chỉ ĐỌC. Là ảnh chụp byte của sheet tại lúc tạo: sửa sheet sau đó thì tạo bộ đọc mới.
/// - Bộ nhớ: byte thô của sheet + ~16 byte/hàng cho chỉ mục + DOM của cửa sổ đang đọc.
///
/// Giả định (đúng với tệp Excel / LibreOffice / OOXMLKit ghi ra): các `<row>` là con trực tiếp của
/// `<sheetData>` và dùng cùng tiền tố namespace với phần tử gốc; chuỗi `<row` không xuất hiện
/// trong CDATA/chú thích bên trong `sheetData`.
public final class SheetRowReader {
    public let workbook: Workbook
    public let part: PartName

    let data: Data
    let rootOpenTag: Data
    let prefix: [UInt8] // tiền tố namespace của phần tử gốc kèm ":" (rỗng nếu không có)
    private(set) var rowStarts: [Int] = []
    private(set) var rowNumbers: [Int] = []
    private(set) var sheetDataEnd = 0 // offset kết thúc vùng hàng (đầu thẻ đóng sheetData)
    private(set) var ascending = true
    /// Offset ngay sau thẻ mở của phần tử gốc, đầu thẻ `<sheetData`, và ngay sau thẻ mở `<sheetData …>`.
    private(set) var rootOpenEnd = 0
    private(set) var sheetDataOpenStart = 0
    private(set) var sheetDataOpenEnd = 0
    /// `<sheetData/>` tự đóng (không có hàng nào và không có thẻ đóng riêng).
    private(set) var sheetDataSelfClosing = false
    /// Có hàng không ghi thuộc tính `r` (số hàng ngầm định theo vị trí).
    private(set) var hasImplicitRowNumbers = false
    private var sharedMasters: [String: (ref: CellReference, formula: String)]?

    init(workbook: Workbook, part: PartName) throws {
        self.workbook = workbook
        self.part = part
        data = try workbook.package.data(of: part)
        var open = Data()
        var pfx: [UInt8] = []
        var starts: [Int] = []
        var numbers: [Int] = []
        var end = 0
        var asc = true
        var rootOpenEndOffset = 0, sdOpenStart = 0, sdOpenEnd = 0
        var selfClosing = false
        var implicitRows = false
        var failure: String?
        data.withUnsafeBytes { (raw: UnsafeRawBufferPointer) in
            let b = raw.bindMemory(to: UInt8.self)
            let n = b.count
            // 1) Thẻ mở của phần tử gốc (bỏ qua khai báo XML, chú thích, DOCTYPE).
            var i = 0
            var rootStart = -1
            while i < n {
                guard let lt = SheetRowReader.indexOf(0x3C, in: b, from: i, to: n) else { break }
                if lt + 1 < n, b[lt + 1] == 0x3F || b[lt + 1] == 0x21 { // <? hoặc <!
                    guard let gt = SheetRowReader.indexOf(0x3E, in: b, from: lt, to: n) else { break }
                    i = gt + 1
                    continue
                }
                rootStart = lt
                break
            }
            guard rootStart >= 0, let rootEnd = SheetRowReader.tagEnd(in: b, from: rootStart, to: n) else {
                failure = "không tìm thấy phần tử gốc"
                return
            }
            open = Data(b[rootStart...rootEnd])
            rootOpenEndOffset = rootEnd + 1
            var nameEnd = rootStart + 1
            while nameEnd < rootEnd, !SheetRowReader.isDelimiter(b[nameEnd]) { nameEnd += 1 }
            let name = Array(b[(rootStart + 1)..<nameEnd])
            if let colon = name.firstIndex(of: 0x3A) { pfx = Array(name[...colon]) }

            // 2) Vùng sheetData.
            let sdOpen = [0x3C] + pfx + Array("sheetData".utf8)
            guard let sd = SheetRowReader.find(sdOpen, in: b, from: rootEnd + 1, to: n, boundaryAfter: true),
                  let sdTagEnd = SheetRowReader.tagEnd(in: b, from: sd, to: n) else {
                failure = "thiếu sheetData"
                return
            }
            sdOpenStart = sd
            sdOpenEnd = sdTagEnd + 1
            if b[sdTagEnd - 1] == 0x2F { // <sheetData/>
                end = sdTagEnd + 1
                selfClosing = true
                return
            }
            let sdClose = [0x3C, 0x2F] + pfx + Array("sheetData".utf8)
            end = SheetRowReader.find(sdClose, in: b, from: sdTagEnd + 1, to: n, boundaryAfter: true) ?? n

            // 3) Chỉ mục hàng.
            let rowOpen = [0x3C] + pfx + Array("row".utf8)
            var pos = sdTagEnd + 1
            var next = 1
            while let r = SheetRowReader.find(rowOpen, in: b, from: pos, to: end, boundaryAfter: true) {
                let te = SheetRowReader.tagEnd(in: b, from: r, to: end) ?? (end - 1)
                let explicit = SheetRowReader.rowNumber(in: b, from: r + rowOpen.count, to: te)
                if explicit == nil { implicitRows = true }
                let number = explicit ?? next
                if let last = numbers.last, number <= last { asc = false }
                starts.append(r)
                numbers.append(number)
                next = number + 1
                pos = te + 1
            }
        }
        if let failure { throw PackageError.invalidPart(part, failure) }
        rootOpenTag = open
        prefix = pfx
        rowStarts = starts
        rowNumbers = numbers
        sheetDataEnd = end
        ascending = asc
        rootOpenEnd = rootOpenEndOffset
        sheetDataOpenStart = sdOpenStart
        sheetDataOpenEnd = sdOpenEnd
        sheetDataSelfClosing = selfClosing
        hasImplicitRowNumbers = implicitRows
    }

    // MARK: Thông tin

    /// Số phần tử `<row>` có trong sheet.
    public var rowCount: Int { rowStarts.count }

    /// Số hàng lớn nhất có dữ liệu (0 nếu sheet trống).
    public var lastRowNumber: Int { ascending ? (rowNumbers.last ?? 0) : (rowNumbers.max() ?? 0) }

    // MARK: Đọc

    /// Mọi ô trong các hàng `rows` (đánh số từ 1), theo thứ tự trong tệp.
    public func cells(inRows rows: ClosedRange<Int>) throws -> [Cell] {
        try cells(inRows: rows, columns: nil)
    }

    /// Mọi ô thuộc vùng `range`.
    public func cells(in range: CellRange) throws -> [Cell] {
        let lo = min(range.start.row, range.end.row), hi = max(range.start.row, range.end.row)
        let c0 = min(range.start.column, range.end.column), c1 = max(range.start.column, range.end.column)
        return try cells(inRows: lo...hi, columns: c0...c1)
    }

    public func cell(_ ref: CellReference) throws -> Cell? {
        try cells(inRows: ref.row...ref.row, columns: ref.column...ref.column).first
    }

    private func cells(inRows rows: ClosedRange<Int>, columns: ClosedRange<Int>?) throws -> [Cell] {
        var out: [Cell] = []
        for run in indexRuns(for: rows) {
            try decode(run, columns: columns, into: &out)
        }
        return out
    }

    /// Các dải chỉ số hàng liên tiếp (trong chỉ mục) có số hàng thuộc `rows`.
    private func indexRuns(for rows: ClosedRange<Int>) -> [Range<Int>] {
        guard !rowStarts.isEmpty else { return [] }
        if ascending {
            let lo = lowerBound(rows.lowerBound)
            let hi = lowerBound(rows.upperBound + 1)
            return lo < hi ? [lo..<hi] : []
        }
        var runs: [Range<Int>] = []
        var start: Int?
        for (i, number) in rowNumbers.enumerated() {
            if rows.contains(number) {
                if start == nil { start = i }
            } else if let s = start {
                runs.append(s..<i)
                start = nil
            }
        }
        if let s = start { runs.append(s..<rowNumbers.count) }
        return runs
    }

    /// Chỉ số đầu tiên có số hàng >= `number` (chỉ dùng khi số hàng tăng dần).
    func lowerBound(_ number: Int) -> Int {
        var lo = 0, hi = rowNumbers.count
        while lo < hi {
            let mid = (lo + hi) / 2
            if rowNumbers[mid] < number { lo = mid + 1 } else { hi = mid }
        }
        return lo
    }

    func byteRange(of run: Range<Int>) -> Range<Int> {
        let end = run.upperBound < rowStarts.count ? rowStarts[run.upperBound] : sheetDataEnd
        return rowStarts[run.lowerBound]..<end
    }

    /// Dựng DOM nhỏ chỉ chứa các hàng của `run` (bọc trong thẻ gốc thật để giữ đúng namespace).
    /// Trả cả tài liệu: phần tử con chỉ giữ tham chiếu yếu tới cha, nên người gọi phải giữ tài liệu
    /// sống trong lúc đọc thì việc tra namespace qua tổ tiên mới đúng.
    func parse(_ run: Range<Int>) throws -> (document: XDocument, rows: [XElement]) {
        try parse(bytes: byteRange(of: run))
    }

    /// Như `parse(_:)` nhưng cho một khoảng byte bất kỳ nằm trong `sheetData` (rỗng = sheetData không có hàng).
    func parse(bytes: Range<Int>) throws -> (document: XDocument, rows: [XElement]) {
        let p = String(decoding: prefix, as: UTF8.self)
        var doc = Data(capacity: rootOpenTag.count + bytes.count + 64)
        doc.append(rootOpenTag)
        doc.append(Data("<\(p)sheetData>".utf8))
        doc.append(data.subdata(in: (data.startIndex + bytes.lowerBound)..<(data.startIndex + bytes.upperBound)))
        doc.append(Data("</\(p)sheetData>".utf8))
        let rootName = String(decoding: rootOpenTag.dropFirst().prefix { !SheetRowReader.isDelimiter($0) }, as: UTF8.self)
        doc.append(Data("</\(rootName)>".utf8))
        let parsed: XDocument
        do {
            parsed = try XDocument(data: doc)
        } catch {
            throw PackageError.invalidPart(part, "\(error)")
        }
        return (parsed, parsed.root.firstChild(NS.s, "sheetData")?.children(NS.s, "row") ?? [])
    }

    private func decode(_ run: Range<Int>, columns: ClosedRange<Int>?, into out: inout [Cell]) throws {
        let parsed = try parse(run)
        defer { withExtendedLifetime(parsed.document) {} }
        for (offset, row) in parsed.rows.enumerated() where run.lowerBound + offset < run.upperBound {
            let r = rowNumbers[run.lowerBound + offset]
            var nextCol = 1
            for c in row.children(NS.s, "c") {
                let ref: CellReference
                if let s = c.attribute("r"), let v = CellReference(s) {
                    ref = v
                } else {
                    ref = CellReference(column: nextCol, row: r)
                }
                nextCol = ref.column + 1
                if let columns, !columns.contains(ref.column) { continue }
                var needsMasters = false
                if let f = c.firstChild(NS.s, "f"), f.attribute("t") == "shared", f.textContent.isEmpty {
                    needsMasters = true
                }
                if needsMasters, sharedMasters == nil { try loadSharedMasters() }
                out.append(Worksheet.decodeCell(ref, c, workbook: workbook) { self.sharedMasters?[$0] })
            }
        }
    }

    /// Tìm các ô chủ của công thức chia sẻ (`<f t="shared" ref=…>`): quét byte tìm thẻ `<f` có cả
    /// `t="shared"` lẫn `ref=`, rồi chỉ parse những hàng chứa chúng.
    private func loadSharedMasters() throws {
        var masterRows = Set<Int>()
        let starts = rowStarts
        let end = sheetDataEnd
        data.withUnsafeBytes { (raw: UnsafeRawBufferPointer) in
            let b = raw.bindMemory(to: UInt8.self)
            guard let first = starts.first else { return }
            for needle in [Array("t=\"shared\"".utf8), Array("t='shared'".utf8)] {
                var pos = first
                while let hit = SheetRowReader.find(needle, in: b, from: pos, to: end, boundaryAfter: false) {
                    pos = hit + needle.count
                    var tagStart = hit
                    while tagStart > first, b[tagStart] != 0x3C { tagStart -= 1 }
                    let tagStop = SheetRowReader.tagEnd(in: b, from: tagStart, to: end) ?? hit
                    let ref = Array(" ref=".utf8)
                    guard SheetRowReader.find(ref, in: b, from: tagStart, to: tagStop + 1, boundaryAfter: false) != nil else { continue }
                    // Hàng chứa offset này: chỉ số cuối cùng có start <= hit.
                    var lo = 0, hi = starts.count
                    while lo < hi {
                        let mid = (lo + hi) / 2
                        if starts[mid] <= hit { lo = mid + 1 } else { hi = mid }
                    }
                    if lo > 0 { masterRows.insert(lo - 1) }
                }
            }
        }
        var masters: [String: (ref: CellReference, formula: String)] = [:]
        for index in masterRows.sorted() {
            let parsed = try parse(index..<(index + 1))
            defer { withExtendedLifetime(parsed.document) {} }
            guard let row = parsed.rows.first else { continue }
            let r = rowNumbers[index]
            var nextCol = 1
            for c in row.children(NS.s, "c") {
                let ref: CellReference
                if let s = c.attribute("r"), let v = CellReference(s) { ref = v } else { ref = CellReference(column: nextCol, row: r) }
                nextCol = ref.column + 1
                if let f = c.firstChild(NS.s, "f"), f.attribute("t") == "shared",
                   let si = f.attribute("si"), f.attribute("ref") != nil {
                    masters[si] = (ref, f.textContent)
                }
            }
        }
        sharedMasters = masters
    }

    // MARK: Quét byte

    static func isDelimiter(_ c: UInt8) -> Bool {
        c == 0x20 || c == 0x3E || c == 0x2F || c == 0x09 || c == 0x0A || c == 0x0D
    }

    private static func indexOf(_ byte: UInt8, in b: UnsafeBufferPointer<UInt8>, from: Int, to: Int) -> Int? {
        var i = from
        while i < to {
            if b[i] == byte { return i }
            i += 1
        }
        return nil
    }

    /// Vị trí `>` kết thúc thẻ bắt đầu tại `from` (bỏ qua `>` nằm trong giá trị thuộc tính).
    private static func tagEnd(in b: UnsafeBufferPointer<UInt8>, from: Int, to: Int) -> Int? {
        var i = from
        var quote: UInt8 = 0
        while i < to {
            let c = b[i]
            if quote != 0 {
                if c == quote { quote = 0 }
            } else if c == 0x22 || c == 0x27 {
                quote = c
            } else if c == 0x3E {
                return i
            }
            i += 1
        }
        return nil
    }

    static func find(_ needle: [UInt8], in b: UnsafeBufferPointer<UInt8>, from: Int, to: Int,
                             boundaryAfter: Bool) -> Int? {
        let m = needle.count
        guard m > 0, to - from >= m else { return nil }
        let first = needle[0]
        var i = from
        let last = to - m
        while i <= last {
            if b[i] == first {
                var k = 1
                while k < m, b[i + k] == needle[k] { k += 1 }
                if k == m, !boundaryAfter || i + m >= to || isDelimiter(b[i + m]) { return i }
            }
            i += 1
        }
        return nil
    }

    /// Giá trị thuộc tính `r` trong thẻ mở `<row …>` (vùng `[from, to)`), nếu có.
    private static func rowNumber(in b: UnsafeBufferPointer<UInt8>, from: Int, to: Int) -> Int? {
        var i = from
        while i + 3 < to {
            if b[i + 1] == 0x72, b[i + 2] == 0x3D, b[i] == 0x20 || b[i] == 0x09 || b[i] == 0x0A || b[i] == 0x0D,
               b[i + 3] == 0x22 || b[i + 3] == 0x27 {
                var j = i + 4
                var value = 0
                var digits = 0
                while j < to, b[j] >= 0x30, b[j] <= 0x39 {
                    value = value * 10 + Int(b[j] - 0x30)
                    digits += 1
                    j += 1
                }
                return digits > 0 ? value : nil
            }
            i += 1
        }
        return nil
    }
}

extension Workbook {
    /// Bộ đọc theo cửa sổ hàng cho sheet thứ `index` — không dựng DOM cả sheet.
    public func rowReader(forSheetAt index: Int) throws -> SheetRowReader {
        let all = sheets
        guard all.indices.contains(index) else { throw SpreadsheetError.sheetNotFound("#\(index)") }
        return try rowReader(all[index])
    }

    /// Bộ đọc theo cửa sổ hàng cho sheet tên `name`.
    public func rowReader(forSheetNamed name: String) throws -> SheetRowReader {
        guard let info = sheets.first(where: { $0.name.caseInsensitiveCompare(name) == .orderedSame }) else {
            throw SpreadsheetError.sheetNotFound(name)
        }
        return try rowReader(info)
    }

    private func rowReader(_ info: SheetInfo) throws -> SheetRowReader {
        guard info.kind == .worksheet, let part = info.part else { throw SpreadsheetError.notAWorksheet(info.name) }
        return try SheetRowReader(workbook: self, part: part)
    }
}

// MARK: Bố cục sheet (không dựng DOM phần dữ liệu)

/// Bố cục hiển thị của một sheet: cột, hàng, ô gộp, freeze panes, vùng lọc, vùng dùng. Lấy từ phần ĐẦU và phần ĐUÔI
/// của `sheetN.xml` (ngoài `<sheetData>`) và từ thuộc tính của các hàng trong cửa sổ được hỏi — không parse dữ liệu ô.
public struct SheetLayout: Equatable, Sendable {
    public struct Column: Equatable, Sendable {
        public var min: Int, max: Int
        public var width: Double?
        public var hidden: Bool
        public var customWidth: Bool
        public var style: Int?
    }
    public struct Row: Equatable, Sendable {
        public var number: Int
        public var height: Double?
        public var hidden: Bool
        public var customHeight: Bool
        public var style: Int?
        public var outlineLevel: Int
    }
    public var dimension: CellRange?
    public var defaultColumnWidth: Double?
    public var defaultRowHeight: Double?
    public var showGridLines: Bool
    public var columns: [Column]
    public var merges: [CellRange]
    public var frozenRows: Int
    public var frozenColumns: Int
    public var autoFilter: CellRange?
    /// Chỉ các hàng TRONG cửa sổ yêu cầu có thuộc tính khác mặc định (chiều cao, ẩn, định dạng hàng).
    public var rows: [Row]
    /// Tính năng của sheet mà màn hình đầu dựng từ `readRows` + `layout` + `workbook.styles` KHÔNG vẽ được, nên giao
    /// diện nên rơi về đường đầy đủ (LibreOffice/FODS) khi khác rỗng. Tên: `conditionalFormatting`, `dataValidations`,
    /// `drawing` (hình/biểu đồ), `legacyDrawing` (ghi chú/điều khiển cũ), `tableParts` (bảng Excel), `sparklines` (cả
    /// định dạng có điều kiện/validation kiểu x14 nằm trong `extLst`).
    public var unsupportedViewFeatures: [String]
}

extension SheetRowReader {
    /// Bố cục sheet. `rows` = cửa sổ hàng cần thuộc tính từng hàng (nil = không đọc hàng nào).
    public func layout(rows window: ClosedRange<Int>? = nil) throws -> SheetLayout {
        // Phần đầu (trước sheetData) + phần đuôi (sau thẻ đóng sheetData), bọc trong thẻ gốc thật.
        let headRange = rootOpenEnd..<sheetDataOpenStart
        var tailStart = data.count
        if sheetDataSelfClosing {
            tailStart = sheetDataOpenEnd
        } else if let close = data.withUnsafeBytes({ (raw: UnsafeRawBufferPointer) -> Int? in
            let b = raw.bindMemory(to: UInt8.self)
            return SheetRowReader.indexOf(0x3E, in: b, from: sheetDataEnd, to: b.count)
        }) {
            tailStart = close + 1
        }
        func bytes(_ r: Range<Int>) -> Data { data.subdata(in: (data.startIndex + r.lowerBound)..<(data.startIndex + max(r.lowerBound, r.upperBound))) }
        var doc = Data(capacity: rootOpenTag.count + headRange.count + (data.count - tailStart) + 32)
        doc.append(rootOpenTag)
        doc.append(bytes(headRange))
        doc.append(bytes(tailStart..<data.count))
        let rootName = String(decoding: rootOpenTag.dropFirst().prefix { !SheetRowReader.isDelimiter($0) }, as: UTF8.self)
        if !doc.suffix(rootName.utf8.count + 3).elementsEqual(Data("</\(rootName)>".utf8)) {
            // Đuôi gốc đã chứa thẻ đóng gốc (tệp thường); chỉ thêm nếu thiếu.
            doc.append(Data("</\(rootName)>".utf8))
        }
        let parsed: XDocument
        do { parsed = try XDocument(data: doc) } catch { throw PackageError.invalidPart(part, "\(error)") }
        let root = parsed.root

        var layout = SheetLayout(dimension: root.firstChild(NS.s, "dimension")?.attribute("ref").flatMap(CellRange.init),
                                 defaultColumnWidth: nil, defaultRowHeight: nil, showGridLines: true,
                                 columns: [], merges: [], frozenRows: 0, frozenColumns: 0, autoFilter: nil, rows: [],
                                 unsupportedViewFeatures: [])
        for name in ["conditionalFormatting", "dataValidations", "drawing", "legacyDrawing", "tableParts"]
        where root.firstChild(NS.s, name) != nil {
            layout.unsupportedViewFeatures.append(name)
        }
        if let ext = root.firstChild(NS.s, "extLst") {
            // extLst chứa cả thứ vô hại (x14ac…); chỉ báo khi có định dạng có điều kiện / validation / sparkline kiểu x14.
            let text = ext.elements.map { $0.localName }.joined(separator: ",") + "|"
                + ext.elements.flatMap { $0.elements.map { $0.localName } }.joined(separator: ",")
            for (needle, flag) in [("conditionalFormatting", "conditionalFormatting"), ("dataValidation", "dataValidations"),
                                   ("sparkline", "sparklines")] where text.contains(needle) && !layout.unsupportedViewFeatures.contains(flag) {
                layout.unsupportedViewFeatures.append(flag)
            }
        }
        if let fmt = root.firstChild(NS.s, "sheetFormatPr") {
            layout.defaultColumnWidth = fmt.attribute("defaultColWidth").flatMap { Double($0) }
            layout.defaultRowHeight = fmt.attribute("defaultRowHeight").flatMap { Double($0) }
        }
        if let view = root.firstChild(NS.s, "sheetViews")?.firstChild(NS.s, "sheetView") {
            if let g = view.attribute("showGridLines") { layout.showGridLines = !(g == "0" || g == "false") }
            if let pane = view.firstChild(NS.s, "pane"), pane.attribute("state") == "frozen" || pane.attribute("state") == "frozenSplit" {
                layout.frozenColumns = Int(Double(pane.attribute("xSplit") ?? "0") ?? 0)
                layout.frozenRows = Int(Double(pane.attribute("ySplit") ?? "0") ?? 0)
            }
        }
        for col in root.firstChild(NS.s, "cols")?.children(NS.s, "col") ?? [] {
            guard let lo = Int(col.attribute("min") ?? ""), let hi = Int(col.attribute("max") ?? "") else { continue }
            layout.columns.append(.init(min: lo, max: hi, width: col.attribute("width").flatMap { Double($0) },
                                        hidden: col.attribute("hidden") == "1" || col.attribute("hidden") == "true",
                                        customWidth: col.attribute("customWidth") == "1" || col.attribute("customWidth") == "true",
                                        style: col.attribute("style").flatMap { Int($0) }))
        }
        layout.merges = root.firstChild(NS.s, "mergeCells")?.children(NS.s, "mergeCell").compactMap { $0.attribute("ref").flatMap(CellRange.init) } ?? []
        layout.autoFilter = root.firstChild(NS.s, "autoFilter")?.attribute("ref").flatMap(CellRange.init)

        if let window {
            for run in indexRuns(for: window) {
                let rowDoc = try parse(run)
                defer { withExtendedLifetime(rowDoc.document) {} }
                for (offset, row) in rowDoc.rows.enumerated() where run.lowerBound + offset < run.upperBound {
                    let number = rowNumbers[run.lowerBound + offset]
                    let ht = row.attribute("ht").flatMap { Double($0) }
                    let hidden = row.attribute("hidden") == "1" || row.attribute("hidden") == "true"
                    let custom = row.attribute("customHeight") == "1" || row.attribute("customHeight") == "true"
                    let style = row.attribute("s").flatMap { Int($0) }
                    let outline = Int(row.attribute("outlineLevel") ?? "0") ?? 0
                    if ht != nil || hidden || custom || style != nil || outline > 0 {
                        layout.rows.append(.init(number: number, height: ht, hidden: hidden, customHeight: custom,
                                                 style: style, outlineLevel: outline))
                    }
                }
            }
        }
        return layout
    }
}
