import Foundation

/// Cây cú pháp trừu tượng của công thức.
public indirect enum FormulaExpr: Equatable {
    case number(Double)
    case string(String)
    case bool(Bool)
    case error(String)
    case cell(sheet: String?, ref: CellReference)
    case range(sheet: String?, range: CellRange)
    case name(String)
    case unary(String, FormulaExpr)          // "-" hoặc "+"
    case percent(FormulaExpr)
    case binary(String, FormulaExpr, FormulaExpr)
    case call(String, [FormulaExpr])

    /// Mọi tham chiếu ô/vùng xuất hiện trong biểu thức (sheet nil = sheet chứa công thức).
    public var references: [(sheet: String?, range: CellRange)] {
        switch self {
        case .cell(let s, let r): return [(s, CellRange(r, r))]
        case .range(let s, let r): return [(s, r)]
        case .unary(_, let e), .percent(let e): return e.references
        case .binary(_, let a, let b): return a.references + b.references
        case .call(_, let args): return args.flatMap { $0.references }
        default: return []
        }
    }
}

/// Parser đệ quy xuống. Độ ưu tiên (thấp → cao), theo Excel:
/// so sánh < & < + - < * / < ^ (kết hợp trái) < dấu âm/dương đơn ngôi < % hậu tố.
public enum FormulaParser {
    public static func parse(_ formula: String) throws -> FormulaExpr {
        let text = formula.hasPrefix("=") ? String(formula.dropFirst()) : formula
        var p = Parser(tokens: try FormulaTokenizer.tokenize(text))
        guard !p.tokens.isEmpty else { throw FormulaSyntaxError(message: "công thức rỗng", position: 0) }
        let e = try p.parseComparison()
        if p.pos < p.tokens.count {
            throw FormulaSyntaxError(message: "token thừa \(p.tokens[p.pos])", position: p.pos)
        }
        return e
    }

    private struct Parser {
        let tokens: [FormulaToken]
        var pos = 0

        init(tokens: [FormulaToken]) { self.tokens = tokens }

        var peek: FormulaToken? { pos < tokens.count ? tokens[pos] : nil }

        mutating func matchOp(_ ops: [String]) -> String? {
            if case .op(let o)? = peek, ops.contains(o) { pos += 1; return o }
            return nil
        }

        mutating func parseComparison() throws -> FormulaExpr {
            var l = try parseConcat()
            while let o = matchOp(["=", "<>", "<=", ">=", "<", ">"]) { l = .binary(o, l, try parseConcat()) }
            return l
        }
        mutating func parseConcat() throws -> FormulaExpr {
            var l = try parseAdditive()
            while let o = matchOp(["&"]) { l = .binary(o, l, try parseAdditive()) }
            return l
        }
        mutating func parseAdditive() throws -> FormulaExpr {
            var l = try parseMultiplicative()
            while let o = matchOp(["+", "-"]) { l = .binary(o, l, try parseMultiplicative()) }
            return l
        }
        mutating func parseMultiplicative() throws -> FormulaExpr {
            var l = try parsePower()
            while let o = matchOp(["*", "/"]) { l = .binary(o, l, try parsePower()) }
            return l
        }
        mutating func parsePower() throws -> FormulaExpr {
            var l = try parseUnary()
            while let o = matchOp(["^"]) { l = .binary(o, l, try parseUnary()) }
            return l
        }
        mutating func parseUnary() throws -> FormulaExpr {
            if let o = matchOp(["-", "+"]) { return .unary(o, try parseUnary()) }
            return try parsePostfix()
        }
        mutating func parsePostfix() throws -> FormulaExpr {
            var e = try parsePrimary()
            while case .percent? = peek { pos += 1; e = .percent(e) }
            return e
        }

        mutating func parsePrimary() throws -> FormulaExpr {
            guard let t = peek else { throw FormulaSyntaxError(message: "thiếu toán hạng", position: pos) }
            switch t {
            case .number(let d): pos += 1; return .number(d)
            case .string(let s): pos += 1; return .string(s)
            case .bool(let b): pos += 1; return .bool(b)
            case .error(let e): pos += 1; return .error(e)
            case .name(let n): pos += 1; return .name(n)
            case .lparen:
                pos += 1
                let e = try parseComparison()
                guard case .rparen? = peek else { throw FormulaSyntaxError(message: "thiếu ')'", position: pos) }
                pos += 1
                return e
            case .function(let name):
                pos += 1
                pos += 1 // "(" do tokenizer đảm bảo
                var args: [FormulaExpr] = []
                if case .rparen? = peek { pos += 1; return .call(name, args) }
                while true {
                    args.append(try parseComparison())
                    if case .comma? = peek { pos += 1; continue }
                    if case .rparen? = peek { pos += 1; break }
                    throw FormulaSyntaxError(message: "thiếu ')' hoặc ','", position: pos)
                }
                return .call(name, args)
            case .sheet(let sh):
                pos += 1
                guard case .cell(let text)? = peek, let a = CellReference(text) else {
                    throw FormulaSyntaxError(message: "thiếu ô sau tên sheet", position: pos)
                }
                pos += 1
                return try finishRef(sheet: sh, first: a)
            case .cell(let text):
                pos += 1
                guard let a = CellReference(text) else { throw FormulaSyntaxError(message: "ô không hợp lệ", position: pos) }
                return try finishRef(sheet: nil, first: a)
            default:
                throw FormulaSyntaxError(message: "token không mong đợi \(t)", position: pos)
            }
        }

        mutating func finishRef(sheet: String?, first: CellReference) throws -> FormulaExpr {
            guard case .colon? = peek else { return .cell(sheet: sheet, ref: first) }
            pos += 1
            guard case .cell(let text)? = peek, let b = CellReference(text) else {
                throw FormulaSyntaxError(message: "thiếu ô cuối của vùng", position: pos)
            }
            pos += 1
            return .range(sheet: sheet, range: CellRange(first, b))
        }
    }
}
