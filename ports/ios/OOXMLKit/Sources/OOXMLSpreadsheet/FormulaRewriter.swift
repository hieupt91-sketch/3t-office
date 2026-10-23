import Foundation

/// Biến đổi văn bản công thức Excel ở mức token (không tính toán):
/// dịch tham chiếu tương đối (mở rộng công thức chia sẻ) và đổi tên sheet trong tham chiếu.
/// Bỏ qua chuỗi "…", tên hàm, tham chiếu có cấu trúc […] và liên kết sổ ngoài [n].
public enum FormulaRewriter {
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
        var text: String
        var shiftedImpl: (Int, Int) -> String
        func shifted(rows: Int, columns: Int) -> String { shiftedImpl(rows, columns) }
    }

    private static func isWordChar(_ c: Character) -> Bool {
        c.isLetter || c.isNumber || c == "_" || c == "." || c == "$" || c == "\\"
    }

    /// `sheet`: nhận tên sheet (đã bỏ nháy), trả tên mới hoặc nil để giữ nguyên.
    static func transform(_ formula: String, sheet: (String) -> String?, ref: (RefToken) -> String) -> String {
        let chars = Array(formula)
        var out = ""
        var i = 0
        func emitSheet(_ name: String, original: String) {
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
                        if let a = ColumnPart(word), let b = ColumnPart(word2) {
                            out += ref(RefToken(text: word + ":" + word2) { _, dc in
                                guard let x = a.shifted(dc), let y = b.shifted(dc) else { return "#REF!" }
                                return x + ":" + y
                            })
                            i = k
                            continue
                        }
                        if let a = RowPart(word), let b = RowPart(word2) {
                            out += ref(RefToken(text: word + ":" + word2) { dr, _ in
                                guard let x = a.shifted(dr), let y = b.shifted(dr) else { return "#REF!" }
                                return x + ":" + y
                            })
                            i = k
                            continue
                        }
                    }
                }
                if let cell = CellPart(word) {
                    out += ref(RefToken(text: word) { dr, dc in cell.shifted(dr, dc) ?? "#REF!" })
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
        func shifted(_ dr: Int, _ dc: Int) -> String? {
            let c = colAbs ? ref.column : ref.column + dc
            let r = rowAbs ? ref.row : ref.row + dr
            guard c >= 1 && c <= CellReference.maxColumn && r >= 1 && r <= CellReference.maxRow else { return nil }
            return (colAbs ? "$" : "") + CellReference.columnName(c) + (rowAbs ? "$" : "") + String(r)
        }
    }
}
