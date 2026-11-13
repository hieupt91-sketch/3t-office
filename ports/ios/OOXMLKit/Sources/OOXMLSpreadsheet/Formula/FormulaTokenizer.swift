import Foundation

/// Lỗi cú pháp công thức (tokenizer/parser).
public struct FormulaSyntaxError: Error, Equatable, CustomStringConvertible {
    public let message: String
    public let position: Int
    public var description: String { "Lỗi cú pháp công thức tại \(position): \(message)" }
}

public enum FormulaToken: Equatable {
    case number(Double)
    case string(String)
    case bool(Bool)
    case error(String)        // #DIV/0! ...
    case cell(String)         // A1, $A$1 (nguyên văn)
    case sheet(String)        // tiền tố sheet đã bỏ nháy và "!"
    case name(String)         // tên định nghĩa (chưa hỗ trợ giải)
    case function(String)     // tên hàm (viết hoa), đứng trước "("
    case op(String)           // + - * / ^ & = <> < > <= >=
    case percent
    case at // toán tử giao ngầm "@" (M7 lát 36)
    case spill // toán tử tràn "#" (M7 lát 37): A1# = toàn bộ vùng tràn neo tại A1
    case lparen, rparen, comma, colon, lbrace, rbrace, semicolon
}

/// Cắt chuỗi công thức (không gồm "=" đầu) thành token.
public enum FormulaTokenizer {
    static let errorLiterals = ["#NULL!", "#DIV/0!", "#VALUE!", "#REF!", "#NAME?", "#NUM!", "#N/A"]

    /// Tên hàm chuẩn (viết hoa, bỏ tiền tố lưu trữ). Trong tệp, Excel ghi hàm ra đời sau bản 2007 kèm tiền
    /// tố `_xlfn.` (vd. `_xlfn.STDEV.S`, `_xlfn.IFS`), hàm mảng động kèm `_xlfn._xlws.` (vd. `_xlfn._xlws.FILTER`).
    /// Tiền tố chỉ là quy ước lưu trữ, không thuộc tên hàm.
    static func canonicalFunctionName(_ raw: String) -> String {
        var name = raw.uppercased()
        for prefix in ["_XLFN.", "_XLWS."] {
            while name.hasPrefix(prefix) { name = String(name.dropFirst(prefix.count)) }
        }
        return name
    }

    public static func tokenize(_ text: String) throws -> [FormulaToken] {
        let s = Array(text)
        var i = 0
        var out: [FormulaToken] = []

        func isIdentStart(_ c: Character) -> Bool { c == "$" || c == "_" || c.isLetter }
        func isIdentPart(_ c: Character) -> Bool { c == "$" || c == "_" || c == "." || c.isLetter || c.isNumber }

        while i < s.count {
            let c = s[i]
            if c == " " || c == "\t" || c == "\n" || c == "\r" { i += 1; continue }

            if c.isASCII && c.isNumber || (c == "." && i + 1 < s.count && s[i + 1].isASCII && s[i + 1].isNumber) {
                let start = i
                while i < s.count, s[i].isASCII, s[i].isNumber { i += 1 }
                if i < s.count, s[i] == "." {
                    i += 1
                    while i < s.count, s[i].isASCII, s[i].isNumber { i += 1 }
                }
                if i < s.count, s[i] == "E" || s[i] == "e" {
                    var j = i + 1
                    if j < s.count, s[j] == "+" || s[j] == "-" { j += 1 }
                    if j < s.count, s[j].isASCII, s[j].isNumber {
                        while j < s.count, s[j].isASCII, s[j].isNumber { j += 1 }
                        i = j
                    }
                }
                guard let d = Double(truncateLiteralTo15SignificantDigits(String(s[start..<i]))) else {
                    throw FormulaSyntaxError(message: "số không hợp lệ", position: start)
                }
                out.append(.number(d))
                continue
            }

            if c == "\"" {
                let start = i
                i += 1
                var str = ""
                var closed = false
                while i < s.count {
                    if s[i] == "\"" {
                        if i + 1 < s.count, s[i + 1] == "\"" { str.append("\""); i += 2; continue }
                        closed = true; i += 1; break
                    }
                    str.append(s[i]); i += 1
                }
                guard closed else { throw FormulaSyntaxError(message: "chuỗi chưa đóng", position: start) }
                out.append(.string(str))
                continue
            }

            if c == "'" {
                let start = i
                i += 1
                var name = ""
                var closed = false
                while i < s.count {
                    if s[i] == "'" {
                        if i + 1 < s.count, s[i + 1] == "'" { name.append("'"); i += 2; continue }
                        closed = true; i += 1; break
                    }
                    name.append(s[i]); i += 1
                }
                guard closed else { throw FormulaSyntaxError(message: "tên sheet chưa đóng nháy", position: start) }
                guard i < s.count, s[i] == "!" else { throw FormulaSyntaxError(message: "thiếu '!' sau tên sheet", position: i) }
                i += 1
                out.append(.sheet(name))
                continue
            }

            if c == "#" {
                let rest = String(s[i...]).uppercased()
                if let e = errorLiterals.first(where: { rest.hasPrefix($0) }) {
                    out.append(.error(e)); i += e.count; continue
                }
                // Toán tử tràn "#" (M7 lát 37): hậu tố sau một tham chiếu hoặc
                // biểu thức trả tham chiếu/mảng (A1#, $A$1#, Data!A1#, Tên#, (A1)#,
                // SEQUENCE(3)#, {1,2}# — các dạng sau vẫn parse, evaluator trả
                // #VALUE! khi neo không phải ô duy nhất chứa công thức mảng động).
                // "#FOO!" vẫn lỗi như cũ; hằng lỗi sau ô (A1#VALUE!) vẫn giữ
                // hành vi cũ (lỗi cú pháp ở parser).
                switch out.last {
                case .cell, .rparen, .rbrace, .name:
                    out.append(.spill); i += 1; continue
                default:
                    break
                }
                throw FormulaSyntaxError(message: "hằng lỗi không hợp lệ", position: i)
            }

            if isIdentStart(c) {
                let start = i
                while i < s.count, isIdentPart(s[i]) { i += 1 }
                var word = String(s[start..<i])
                if i < s.count, s[i] == "!" { i += 1; out.append(.sheet(word)); continue }
                if i < s.count, s[i] == "(" { out.append(.function(FormulaTokenizer.canonicalFunctionName(word))); continue }
                // Tham số LAMBDA/LET trong tệp mang tiền tố _xlpm. (vd. _xlpm.x): bỏ tiền tố để khớp tên khai báo.
                if word.lowercased().hasPrefix("_xlpm.") { word = String(word.dropFirst(6)) }
                let upper = word.uppercased()
                if upper == "TRUE" { out.append(.bool(true)) }
                else if upper == "FALSE" { out.append(.bool(false)) }
                else if CellReference(word) != nil { out.append(.cell(word)) }
                else { out.append(.name(word)) }
                continue
            }

            switch c {
            case "(": out.append(.lparen)
            case ")": out.append(.rparen)
            case ",": out.append(.comma)
            case ":": out.append(.colon)
            case "{": out.append(.lbrace)
            case "}": out.append(.rbrace)
            case ";": out.append(.semicolon)
            case "%": out.append(.percent)
            case "@": out.append(.at)
            case "+", "-", "*", "/", "^", "&", "=":
                out.append(.op(String(c)))
            case "<":
                if i + 1 < s.count, s[i + 1] == "=" { out.append(.op("<=")); i += 1 }
                else if i + 1 < s.count, s[i + 1] == ">" { out.append(.op("<>")); i += 1 }
                else { out.append(.op("<")) }
            case ">":
                if i + 1 < s.count, s[i + 1] == "=" { out.append(.op(">=")); i += 1 }
                else { out.append(.op(">")) }
            default:
                throw FormulaSyntaxError(message: "ký tự không hợp lệ '\(c)'", position: i)
            }
            i += 1
        }
        return out
    }

    /// Cắt literal số về tối đa 15 chữ số có nghĩa, KHÔNG làm tròn lên (M7 lát 30,
    /// golden-batch13/14): Excel giữ 15 chữ số đầu rồi đệm 0 —
    /// `123456789012345678` → 123456789012345000, `0.9999999999999999` → 0.999999999999999.
    /// Áp dụng cho literal trong công thức; giá trị ô đọc từ tệp không qua đây.
    static func truncateLiteralTo15SignificantDigits(_ text: String) -> String {
        var mantissa = text
        var exp = 0
        if let ePos = text.firstIndex(where: { $0 == "e" || $0 == "E" }) {
            mantissa = String(text[..<ePos])
            exp = Int(text[text.index(after: ePos)...]) ?? 0
        }
        let parts = mantissa.split(separator: ".", omittingEmptySubsequences: false)
        let intPart = parts.first.map(String.init) ?? ""
        let fracPart = parts.count > 1 ? String(parts[1]) : ""
        let digits = intPart + fracPart
        guard let firstNZ = digits.firstIndex(where: { $0 != "0" }) else { return "0" }
        let offset = digits.distance(from: digits.startIndex, to: firstNZ)
        let kept = String(digits[firstNZ...].prefix(15))
        let newExp = exp - fracPart.count + (digits.count - offset - kept.count)
        return "\(kept)e\(newExp)"
    }
}
