import Foundation

/// Biến đổi văn bản công thức Excel ở mức token (không tính toán):
/// dịch tham chiếu tương đối (mở rộng công thức chia sẻ) và đổi tên sheet trong tham chiếu.
/// Bỏ qua chuỗi "…", tên hàm, tham chiếu có cấu trúc […] và liên kết sổ ngoài [n].
public enum FormulaRewriter {
    /// Rewrites scalar `CONCAT(a,b,...)` calls as `((a)&(b)&...)` without touching strings or names.
    /// Range arguments are left intact because joining arrays requires Excel's array semantics.
    public static func rewriteScalarConcat(_ formula: String) -> String {
        let chars = Array(formula)
        var output = ""
        var index = 0
        while index < chars.count {
            if chars[index] == "\"" {
                let end = stringEnd(in: chars, from: index)
                output += String(chars[index..<end])
                index = end
                continue
            }
            if isIdentifierStart(chars[index]) {
                var end = index + 1
                while end < chars.count && isIdentifierPart(chars[end]) { end += 1 }
                var identifier = String(chars[index..<end])
                if identifier.caseInsensitiveCompare("_xlfn") == .orderedSame,
                   end + 1 < chars.count, chars[end] == "." {
                    var nameEnd = end + 1
                    while nameEnd < chars.count && isIdentifierPart(chars[nameEnd]) { nameEnd += 1 }
                    if String(chars[(end + 1)..<nameEnd]).caseInsensitiveCompare("CONCAT") == .orderedSame {
                        identifier = "CONCAT"
                        end = nameEnd
                    }
                }
                var open = end
                while open < chars.count && chars[open].isWhitespace { open += 1 }
                if identifier.caseInsensitiveCompare("CONCAT") == .orderedSame,
                   open < chars.count, chars[open] == "(",
                   let close = matchingParen(in: chars, open: open) {
                    let body = Array(chars[(open + 1)..<close])
                    let arguments = splitArguments(body)
                    if arguments.count >= 2 && !arguments.contains(where: containsRangeOperator) {
                        let joined = arguments.map { "(\(rewriteScalarConcat($0.trimmingCharacters(in: .whitespacesAndNewlines))))" }.joined(separator: "&")
                        output += "(\(joined))"
                        index = close + 1
                        continue
                    }
                }
                output += String(chars[index..<end])
                index = end
                continue
            }
            output.append(chars[index])
            index += 1
        }
        return output
    }

    private static func isIdentifierStart(_ c: Character) -> Bool { c.isASCII && (c.isLetter || c == "_") }
    private static func isIdentifierPart(_ c: Character) -> Bool { c.isASCII && (c.isLetter || c.isNumber || c == "_") }

    private static func stringEnd(in chars: [Character], from start: Int) -> Int {
        var i = start + 1
        while i < chars.count {
            if chars[i] == "\"" {
                if i + 1 < chars.count && chars[i + 1] == "\"" { i += 2; continue }
                return i + 1
            }
            i += 1
        }
        return chars.count
    }

    private static func matchingParen(in chars: [Character], open: Int) -> Int? {
        var depth = 0
        var i = open
        while i < chars.count {
            if chars[i] == "\"" { i = stringEnd(in: chars, from: i); continue }
            if chars[i] == "'" { i = quotedSheetEnd(in: chars, from: i); continue }
            if chars[i] == "(" { depth += 1 }
            if chars[i] == ")" {
                depth -= 1
                if depth == 0 { return i }
            }
            i += 1
        }
        return nil
    }

    private static func splitArguments(_ chars: [Character]) -> [String] {
        var parts: [String] = []
        var start = 0
        var depth = 0
        var arrayDepth = 0
        var i = 0
        while i < chars.count {
            if chars[i] == "\"" { i = stringEnd(in: chars, from: i); continue }
            if chars[i] == "'" { i = quotedSheetEnd(in: chars, from: i); continue }
            if chars[i] == "(" { depth += 1 }
            else if chars[i] == ")" { depth -= 1 }
            else if chars[i] == "{" { arrayDepth += 1 }
            else if chars[i] == "}" { arrayDepth -= 1 }
            else if chars[i] == "," && depth == 0 && arrayDepth == 0 {
                parts.append(String(chars[start..<i]))
                start = i + 1
            }
            i += 1
        }
        parts.append(String(chars[start..<chars.count]))
        return parts
    }

    private static func quotedSheetEnd(in chars: [Character], from start: Int) -> Int {
        var i = start + 1
        while i < chars.count {
            if chars[i] == "'" {
                if i + 1 < chars.count && chars[i + 1] == "'" { i += 2; continue }
                return i + 1
            }
            i += 1
        }
        return chars.count
    }

    private static func containsRangeOperator(_ argument: String) -> Bool {
        let chars = Array(argument)
        var i = 0
        while i < chars.count {
            if chars[i] == "\"" { i = stringEnd(in: chars, from: i); continue }
            if chars[i] == "'" { i = quotedSheetEnd(in: chars, from: i); continue }
            if chars[i] == ":" { return true }
            i += 1
        }
        return false
    }

    /// Dịch mọi tham chiếu tương đối đi (rows, columns). Tham chiếu ra ngoài lưới thành #REF!.
    public static func shift(_ formula: String, rows: Int, columns: Int) -> String {
        if rows == 0 && columns == 0 { return formula }
        return transform(formula, sheet: { $0 }) { ref in
            ref.shifted(rows: rows, columns: columns)
        }
    }

    /// Đổi tên sheet `old` → `new` trong mọi tham chiếu dạng Sheet!A1, 'Tên sheet'!A1, 'A:B'!A1.
    public static func renameSheet(_ formula: String, from old: String, to new: String) -> String {
        transform(formula, sheet: { name in
            // Tham chiếu 3D 'Sheet1:Sheet3'
            let parts = name.split(separator: ":", omittingEmptySubsequences: false).map(String.init)
            guard parts.contains(where: { $0.caseInsensitiveCompare(old) == .orderedSame }) else { return nil }
            return parts.map { $0.caseInsensitiveCompare(old) == .orderedSame ? new : $0 }.joined(separator: ":")
        }, ref: { $0.text })
    }

    /// Tên sheet ở dạng dùng được trong công thức (thêm nháy đơn khi cần).
    public static func quoteSheetName(_ name: String) -> String {
        let simple = name.unicodeScalars.allSatisfy { ($0.value < 128 && (CharacterSet.alphanumerics.contains($0) || $0 == "_" || $0 == ".")) }
            && !(name.first?.isNumber ?? true)
            && CellReference(name) == nil
        return simple ? name : "'" + name.replacingOccurrences(of: "'", with: "''") + "'"
    }

    struct RefToken {
        enum Kind {
            case cell(CellPart)
            case cellRange(CellPart, CellPart)
            case columns(ColumnPart, ColumnPart)
            case rows(RowPart, RowPart)
        }
        var text: String
        /// Tên sheet đứng ngay trước (Sheet!A1), nil = sheet chứa công thức.
        var sheet: String?
        var kind: Kind
        var shiftedImpl: (Int, Int) -> String
        func shifted(rows: Int, columns: Int) -> String { shiftedImpl(rows, columns) }
    }

    private static let deletedSheetMarker = "\u{1}"

    /// Xóa sheet `name`: mọi tham chiếu tới nó thành #REF! (như Excel).
    public static func invalidateSheet(_ formula: String, named name: String) -> String {
        let marked = renameSheet(formula, from: name, to: deletedSheetMarker)
        return marked.replacingOccurrences(of: quoteSheetName(deletedSheetMarker) + "!", with: "#REF!")
    }

    /// Chèn (`delta` > 0) hoặc xóa (`delta` < 0) hàng tại `row` của sheet `target`, cập nhật mọi tham chiếu
    /// (tương đối lẫn tuyệt đối) tới sheet đó. Vùng bị xóa hết → #REF!; vùng bị xóa một phần → co lại.
    public static func adjustRows(_ formula: String, formulaSheet: String, target: String, at row: Int, delta: Int) -> String {
        guard delta != 0 else { return formula }
        return transform(formula, sheet: { _ in nil }) { tok in
            let s = tok.sheet ?? formulaSheet
            guard s.caseInsensitiveCompare(target) == .orderedSame else { return tok.text }
            switch tok.kind {
            case .cell(let c):
                guard let r = mapRow(c.ref.row, at: row, delta: delta) else { return "#REF!" }
                return c.with(row: r)
            case .cellRange(let a, let b):
                guard let (r1, r2) = mapRange(a.ref.row, b.ref.row, at: row, delta: delta) else { return "#REF!" }
                return a.with(row: r1) + ":" + b.with(row: r2)
            case .rows(let a, let b):
                guard let (r1, r2) = mapRange(a.row, b.row, at: row, delta: delta) else { return "#REF!" }
                return a.with(r1) + ":" + b.with(r2)
            case .columns:
                return tok.text
            }
        }
    }

    /// Chèn/xóa cột tại `column` của sheet `target` (cùng quy tắc như hàng).
    public static func adjustColumns(_ formula: String, formulaSheet: String, target: String, at column: Int, delta: Int) -> String {
        guard delta != 0 else { return formula }
        return transform(formula, sheet: { _ in nil }) { tok in
            let s = tok.sheet ?? formulaSheet
            guard s.caseInsensitiveCompare(target) == .orderedSame else { return tok.text }
            switch tok.kind {
            case .cell(let c):
                guard let n = mapIndex(c.ref.column, at: column, delta: delta, max: CellReference.maxColumn) else { return "#REF!" }
                return c.with(column: n)
            case .cellRange(let a, let b):
                guard let (c1, c2) = mapSpan(a.ref.column, b.ref.column, at: column, delta: delta, max: CellReference.maxColumn) else { return "#REF!" }
                return a.with(column: c1) + ":" + b.with(column: c2)
            case .columns(let a, let b):
                guard let (c1, c2) = mapSpan(a.column, b.column, at: column, delta: delta, max: CellReference.maxColumn) else { return "#REF!" }
                return a.with(c1) + ":" + b.with(c2)
            case .rows:
                return tok.text
            }
        }
    }

    static func mapIndex(_ v: Int, at: Int, delta: Int, max: Int) -> Int? {
        if delta > 0 { return v >= at ? min(v + delta, max) : v }
        let n = -delta
        if v >= at && v < at + n { return nil }
        return v >= at + n ? v - n : v
    }

    static func mapSpan(_ v1: Int, _ v2: Int, at: Int, delta: Int, max: Int) -> (Int, Int)? {
        if delta > 0 { return (v1 >= at ? v1 + delta : v1, v2 >= at ? Swift.min(v2 + delta, max) : v2) }
        let n = -delta
        let end = at + n
        if v1 >= at && v2 < end { return nil }
        let a = v1 >= end ? v1 - n : (v1 >= at ? at : v1)
        let b = v2 >= end ? v2 - n : (v2 >= at ? at - 1 : v2)
        return a <= b ? (a, b) : nil
    }

    /// Dòng mới của một ô đơn; nil nếu ô bị xóa.
    static func mapRow(_ r: Int, at row: Int, delta: Int) -> Int? {
        if delta > 0 { return r >= row ? min(r + delta, CellReference.maxRow) : r }
        let n = -delta
        if r >= row && r < row + n { return nil }
        return r >= row + n ? r - n : r
    }

    static func mapRange(_ r1: Int, _ r2: Int, at row: Int, delta: Int) -> (Int, Int)? {
        if delta > 0 {
            return (r1 >= row ? r1 + delta : r1, r2 >= row ? min(r2 + delta, CellReference.maxRow) : r2)
        }
        let n = -delta
        let end = row + n // không gồm
        if r1 >= row && r2 < end { return nil }
        let a = r1 >= end ? r1 - n : (r1 >= row ? row : r1)
        let b = r2 >= end ? r2 - n : (r2 >= row ? row - 1 : r2)
        return a <= b ? (a, b) : nil
    }

    private static func isWordChar(_ c: Character) -> Bool {
        c.isLetter || c.isNumber || c == "_" || c == "." || c == "$" || c == "\\"
    }

    /// `sheet`: nhận tên sheet (đã bỏ nháy), trả tên mới hoặc nil để giữ nguyên.
    static func transform(_ formula: String, sheet: (String) -> String?, ref: (RefToken) -> String) -> String {
        let chars = Array(formula)
        var out = ""
        var i = 0
        var lastSheet: String?
        func qualifier(at index: Int) -> String? { index > 0 && chars[index - 1] == "!" ? lastSheet : nil }
        func emitSheet(_ name: String, original: String) {
            lastSheet = name
            if let n = sheet(name), n != name {
                out += quoteSheetName(n)
            } else {
                out += original
            }
        }
        while i < chars.count {
            let c = chars[i]
            if c == "\"" {
                var j = i + 1
                while j < chars.count {
                    if chars[j] == "\"" {
                        if j + 1 < chars.count && chars[j + 1] == "\"" { j += 2; continue }
                        break
                    }
                    j += 1
                }
                out += String(chars[i...min(j, chars.count - 1)])
                i = j + 1
            } else if c == "'" {
                var j = i + 1
                var name = ""
                while j < chars.count {
                    if chars[j] == "'" {
                        if j + 1 < chars.count && chars[j + 1] == "'" { name.append("'"); j += 2; continue }
                        break
                    }
                    name.append(chars[j])
                    j += 1
                }
                let original = String(chars[i...min(j, chars.count - 1)])
                if j + 1 < chars.count && chars[j + 1] == "!" && !name.hasPrefix("[") {
                    emitSheet(name, original: original)
                } else {
                    out += original
                }
                i = j + 1
            } else if c == "[" {
                var depth = 0
                var j = i
                while j < chars.count {
                    if chars[j] == "[" { depth += 1 }
                    if chars[j] == "]" { depth -= 1; if depth == 0 { break } }
                    j += 1
                }
                out += String(chars[i...min(j, chars.count - 1)])
                i = j + 1
                // [1]Sheet1!A1 — tên sheet của sổ ngoài: chép nguyên.
                if i < chars.count && isWordChar(chars[i]) {
                    var k = i
                    while k < chars.count && isWordChar(chars[k]) { k += 1 }
                    if k < chars.count && chars[k] == "!" {
                        out += String(chars[i..<k])
                        i = k
                    }
                }
            } else if isWordChar(c) {
                var j = i
                while j < chars.count && isWordChar(chars[j]) { j += 1 }
                let word = String(chars[i..<j])
                let next: Character? = j < chars.count ? chars[j] : nil
                let prev: Character? = i > 0 ? chars[i - 1] : nil
                if next == "!" {
                    emitSheet(word, original: word)
                    i = j
                    continue
                }
                if next == "(" || prev == "." {
                    out += word
                    i = j
                    continue
                }
                // Vùng cột A:B hoặc hàng 1:3
                if next == ":", j + 1 < chars.count {
                    var k = j + 1
                    while k < chars.count && isWordChar(chars[k]) { k += 1 }
                    let word2 = String(chars[(j + 1)..<k])
                    let after: Character? = k < chars.count ? chars[k] : nil
                    if after != "(", after != "!" {
                        if let a = CellPart(word), let b = CellPart(word2) {
                            out += ref(RefToken(text: word + ":" + word2, sheet: qualifier(at: i), kind: .cellRange(a, b)) { dr, dc in
                                guard let x = a.shifted(dr, dc), let y = b.shifted(dr, dc) else { return "#REF!" }
                                return x + ":" + y
                            })
                            i = k
                            continue
                        }
                        if let a = ColumnPart(word), let b = ColumnPart(word2) {
                            out += ref(RefToken(text: word + ":" + word2, sheet: qualifier(at: i), kind: .columns(a, b)) { _, dc in
                                guard let x = a.shifted(dc), let y = b.shifted(dc) else { return "#REF!" }
                                return x + ":" + y
                            })
                            i = k
                            continue
                        }
                        if let a = RowPart(word), let b = RowPart(word2) {
                            out += ref(RefToken(text: word + ":" + word2, sheet: qualifier(at: i), kind: .rows(a, b)) { dr, _ in
                                guard let x = a.shifted(dr), let y = b.shifted(dr) else { return "#REF!" }
                                return x + ":" + y
                            })
                            i = k
                            continue
                        }
                    }
                }
                if let cell = CellPart(word) {
                    out += ref(RefToken(text: word, sheet: qualifier(at: i), kind: .cell(cell)) { dr, dc in cell.shifted(dr, dc) ?? "#REF!" })
                } else {
                    out += word
                }
                i = j
            } else {
                out.append(c)
                i += 1
            }
        }
        return out
    }

    struct ColumnPart {
        let absolute: Bool
        let column: Int
        init?(_ s: String) {
            absolute = s.hasPrefix("$")
            let body = absolute ? String(s.dropFirst()) : s
            guard !body.isEmpty, body.count <= 3, body.unicodeScalars.allSatisfy({ CellReference.letterValue($0) != nil }),
                  let c = CellReference.columnNumber(body) else { return nil }
            column = c
        }
        func with(_ c: Int) -> String { (absolute ? "$" : "") + CellReference.columnName(c) }
        func shifted(_ d: Int) -> String? {
            let c = absolute ? column : column + d
            guard c >= 1 && c <= CellReference.maxColumn else { return nil }
            return (absolute ? "$" : "") + CellReference.columnName(c)
        }
    }

    struct RowPart {
        let absolute: Bool
        let row: Int
        init?(_ s: String) {
            absolute = s.hasPrefix("$")
            let body = absolute ? String(s.dropFirst()) : s
            guard !body.isEmpty, body.count <= 7, body.allSatisfy({ $0.isASCII && $0.isNumber }), let r = Int(body), r >= 1 else { return nil }
            row = r
        }
        func with(_ r: Int) -> String { (absolute ? "$" : "") + String(r) }
        func shifted(_ d: Int) -> String? {
            let r = absolute ? row : row + d
            guard r >= 1 && r <= CellReference.maxRow else { return nil }
            return (absolute ? "$" : "") + String(r)
        }
    }

    struct CellPart {
        let colAbs: Bool
        let rowAbs: Bool
        let ref: CellReference
        init?(_ s: String) {
            let chars = Array(s)
            var i = 0
            colAbs = i < chars.count && chars[i] == "$"
            if colAbs { i += 1 }
            let ls = i
            while i < chars.count && chars[i].isASCII && chars[i].isLetter { i += 1 }
            guard i > ls, i - ls <= 3 else { return nil }
            rowAbs = i < chars.count && chars[i] == "$"
            let letters = String(chars[ls..<i])
            if rowAbs { i += 1 }
            let ds = i
            while i < chars.count && chars[i].isASCII && chars[i].isNumber { i += 1 }
            guard i == chars.count, i > ds, let r = CellReference(letters + String(chars[ds..<i])) else { return nil }
            ref = r
        }
        func with(column c: Int) -> String {
            (colAbs ? "$" : "") + CellReference.columnName(c) + (rowAbs ? "$" : "") + String(ref.row)
        }
        func with(row r: Int) -> String {
            (colAbs ? "$" : "") + CellReference.columnName(ref.column) + (rowAbs ? "$" : "") + String(r)
        }
        func shifted(_ dr: Int, _ dc: Int) -> String? {
            let c = colAbs ? ref.column : ref.column + dc
            let r = rowAbs ? ref.row : ref.row + dr
            guard c >= 1 && c <= CellReference.maxColumn && r >= 1 && r <= CellReference.maxRow else { return nil }
            return (colAbs ? "$" : "") + CellReference.columnName(c) + (rowAbs ? "$" : "") + String(r)
        }
    }
}
