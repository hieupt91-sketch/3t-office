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
    /// Gọi một giá trị hàm: `LAMBDA(...)(...)`, `f(...)` khi f là biến chứa lambda
    /// (M7 lát 28). Khác `.call` ở chỗ callee là biểu thức, không phải tên hàm.
    case apply(FormulaExpr, [FormulaExpr])
    case empty // tham số bị bỏ trống trong lời gọi hàm, ví dụ SUM(1,,2)
    case array([[CellValue]]) // hằng mảng {1,2;3,4}

    /// Mọi tham chiếu ô/vùng xuất hiện trong biểu thức (sheet nil = sheet chứa công thức).
    public var references: [(sheet: String?, range: CellRange)] {
        switch self {
        case .cell(let s, let r): return [(s, CellRange(r, r))]
        case .range(let s, let r): return [(s, r)]
        case .unary(_, let e), .percent(let e): return e.references
        case .binary(_, let a, let b): return a.references + b.references
        case .empty, .array: return []
        case .call(_, let args): return args.flatMap { $0.references }
        case .apply(let c, let args): return c.references + args.flatMap { $0.references }
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

        /// Nhãn cột trần kiểu "A" / "$A" / "XFD" -> số cột; nil nếu không phải nhãn cột.
        func columnLabel(_ word: String) -> Int? {
            let w = word.replacingOccurrences(of: "$", with: "")
            guard !w.isEmpty, w.allSatisfy({ $0.isLetter }) else { return nil }
            return CellReference.columnNumber(w.uppercased())
        }

        /// Tại vị trí hiện tại (đang trỏ vào .name) có mẫu "<cột>:<cột>" hay không; nếu có trả hai số cột.
        func wholeColumnPair() -> (Int, Int)? {
            guard pos + 2 < tokens.count,
                  case .name(let a) = tokens[pos], let c1 = columnLabel(a),
                  case .colon = tokens[pos + 1],
                  case .name(let b) = tokens[pos + 2], let c2 = columnLabel(b) else { return nil }
            return (c1, c2)
        }

        /// Tại vị trí hiện tại (đang trỏ vào .number) có mẫu "<hàng>:<hàng>" hay không; nếu có trả hai số hàng.
        func wholeRowPair() -> (Int, Int)? {
            guard pos + 2 < tokens.count,
                  case .number(let a) = tokens[pos], a == a.rounded(), (1...Double(CellReference.maxRow)).contains(a),
                  case .colon = tokens[pos + 1],
                  case .number(let b) = tokens[pos + 2], b == b.rounded(), (1...Double(CellReference.maxRow)).contains(b) else { return nil }
            return (Int(a), Int(b))
        }

        static func columnRange(_ c1: Int, _ c2: Int) -> CellRange {
            CellRange(CellReference(column: c1, row: 1), CellReference(column: c2, row: CellReference.maxRow))
        }

        static func rowRange(_ r1: Int, _ r2: Int) -> CellRange {
            CellRange(CellReference(column: 1, row: r1), CellReference(column: CellReference.maxColumn, row: r2))
        }

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
            while true {
                if case .percent? = peek { pos += 1; e = .percent(e); continue }
                // Gọi giá trị hàm: `LAMBDA(...)(...)`, `(expr)(...)` (M7 lát 28).
                if case .lparen? = peek {
                    pos += 1
                    e = .apply(e, try parseArgList())
                    continue
                }
                break
            }
            return e
        }

        /// Danh sách đối số sau "(" đã tiêu thụ; dùng chung cho `.function` và gọi hậu tố.
        mutating func parseArgList() throws -> [FormulaExpr] {
            var args: [FormulaExpr] = []
            if case .rparen? = peek { pos += 1; return args }
            while true {
                if case .comma? = peek { args.append(.empty); pos += 1; continue }
                if case .rparen? = peek { args.append(.empty); pos += 1; break }
                args.append(try parseComparison())
                if case .comma? = peek { pos += 1; continue }
                if case .rparen? = peek { pos += 1; break }
                throw FormulaSyntaxError(message: "thiếu ')' hoặc ','", position: pos)
            }
            return args
        }

        mutating func parsePrimary() throws -> FormulaExpr {
            guard let t = peek else { throw FormulaSyntaxError(message: "thiếu toán hạng", position: pos) }
            switch t {
            case .number:
                if let (r1, r2) = wholeRowPair() { pos += 3; return .range(sheet: nil, range: Parser.rowRange(r1, r2)) }
                if case .number(let d)? = peek { pos += 1; return .number(d) }
                throw FormulaSyntaxError(message: "token số không hợp lệ", position: pos)
            case .string(let s): pos += 1; return .string(s)
            case .bool(let b): pos += 1; return .bool(b)
            case .error(let e): pos += 1; return .error(e)
            case .name(let n):
                if let (c1, c2) = wholeColumnPair() { pos += 3; return .range(sheet: nil, range: Parser.columnRange(c1, c2)) }
                pos += 1; return .name(n)
            case .lbrace:
                pos += 1
                var rows: [[CellValue]] = []
                var row: [CellValue] = []
                while true {
                    row.append(try parseConstant())
                    if case .comma? = peek { pos += 1; continue }
                    if case .semicolon? = peek { pos += 1; rows.append(row); row = []; continue }
                    if case .rbrace? = peek {
                        pos += 1; rows.append(row)
                        guard rows.allSatisfy({ $0.count == rows[0].count }) else {
                            throw FormulaSyntaxError(message: "hằng mảng không chữ nhật", position: pos)
                        }
                        return .array(rows)
                    }
                    throw FormulaSyntaxError(message: "thiếu '}' trong hằng mảng", position: pos)
                }
            case .lparen:
                pos += 1
                let e = try parseComparison()
                guard case .rparen? = peek else { throw FormulaSyntaxError(message: "thiếu ')'", position: pos) }
                pos += 1
                return e
            case .function(let name):
                pos += 1
                pos += 1 // "(" do tokenizer đảm bảo
                return .call(name, try parseArgList())
            case .sheet(let sh):
                pos += 1
                if let (c1, c2) = wholeColumnPair() { pos += 3; return .range(sheet: sh, range: Parser.columnRange(c1, c2)) }
                if let (r1, r2) = wholeRowPair() { pos += 3; return .range(sheet: sh, range: Parser.rowRange(r1, r2)) }
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

        /// Một phần tử của hằng mảng: chỉ hằng số (số có dấu, chuỗi, logic, lỗi).
        mutating func parseConstant() throws -> CellValue {
            if case .op(let o)? = peek, o == "-" || o == "+" {
                pos += 1
                guard case .number(let d)? = peek else {
                    throw FormulaSyntaxError(message: "sau dấu trong hằng mảng phải là số", position: pos)
                }
                pos += 1
                return .number(o == "-" ? -d : d)
            }
            guard let tk = peek else { throw FormulaSyntaxError(message: "hằng mảng cụt", position: pos) }
            switch tk {
            case .number(let d): pos += 1; return .number(d)
            case .string(let s): pos += 1; return .string(s)
            case .bool(let b): pos += 1; return .bool(b)
            case .error(let e): pos += 1; return .error(e)
            default: throw FormulaSyntaxError(message: "hằng mảng chỉ chứa hằng số", position: pos)
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
