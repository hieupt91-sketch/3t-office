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
    case lparen, rparen, comma, colon
}

/// Cắt chuỗi công thức (không gồm "=" đầu) thành token.
public enum FormulaTokenizer {
    static let errorLiterals = ["#NULL!", "#DIV/0!", "#VALUE!", "#REF!", "#NAME?", "#NUM!", "#N/A"]

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
                guard let d = Double(String(s[start..<i])) else {
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
                throw FormulaSyntaxError(message: "hằng lỗi không hợp lệ", position: i)
            }

            if isIdentStart(c) {
                let start = i
                while i < s.count, isIdentPart(s[i]) { i += 1 }
                let word = String(s[start..<i])
                if i < s.count, s[i] == "!" { i += 1; out.append(.sheet(word)); continue }
                if i < s.count, s[i] == "(" { out.append(.function(word.uppercased())); continue }
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
            case "%": out.append(.percent)
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
}
