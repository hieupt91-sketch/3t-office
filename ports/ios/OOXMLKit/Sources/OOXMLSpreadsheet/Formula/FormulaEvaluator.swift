import Foundation

/// Nguồn dữ liệu ô cho evaluator.
protocol FormulaContext {
    /// Tên sheet chuẩn hóa; nil nếu sheet không tồn tại. `name == nil` = sheet hiện tại.
    func resolveSheet(_ name: String?) -> String?
    func cellValue(sheet: String, ref: CellReference) -> CellValue
    /// Các giá trị KHÔNG rỗng trong vùng (theo thứ tự hàng rồi cột).
    func nonEmptyValues(sheet: String, range: CellRange) -> [CellValue]
}

enum FormulaErrors {
    static let div0 = "#DIV/0!", value = "#VALUE!", ref = "#REF!", name = "#NAME?", na = "#N/A", num = "#NUM!"
}

/// Giá trị trung gian: số liệu đơn hoặc tham chiếu vùng (chưa trải phẳng).
enum EvalValue {
    case scalar(CellValue)
    case ref(sheet: String, range: CellRange)
}

/// Bộ tính giá trị cho AST. Không có hiệu ứng phụ; mọi lỗi trở thành `.error("#...")`.
struct FormulaEvaluator {
    let context: FormulaContext

    func evaluate(_ expr: FormulaExpr) -> CellValue {
        scalar(eval(expr))
    }

    // MARK: Cốt lõi

    private func eval(_ e: FormulaExpr) -> EvalValue {
        switch e {
        case .number(let d): return .scalar(.number(d))
        case .string(let s): return .scalar(.string(s))
        case .bool(let b): return .scalar(.bool(b))
        case .error(let s): return .scalar(.error(s))
        case .name: return .scalar(.error(FormulaErrors.name))
        case .cell(let sh, let r):
            guard let s = context.resolveSheet(sh) else { return .scalar(.error(FormulaErrors.ref)) }
            return .ref(sheet: s, range: CellRange(r, r))
        case .range(let sh, let r):
            guard let s = context.resolveSheet(sh) else { return .scalar(.error(FormulaErrors.ref)) }
            return .ref(sheet: s, range: r)
        case .unary(let op, let x):
            let v = scalar(eval(x))
            if case .error = v { return .scalar(v) }
            if op == "+" { return .scalar(v) }
            guard let n = number(v) else { return .scalar(.error(FormulaErrors.value)) }
            return .scalar(.number(-n))
        case .percent(let x):
            let v = scalar(eval(x))
            if case .error = v { return .scalar(v) }
            guard let n = number(v) else { return .scalar(.error(FormulaErrors.value)) }
            return .scalar(.number(n / 100))
        case .binary(let op, let a, let b):
            return .scalar(binary(op, scalar(eval(a)), scalar(eval(b))))
        case .call(let name, let args):
            return call(name, args)
        }
    }

    /// Ép về giá trị đơn. Vùng 1 ô → giá trị ô; vùng nhiều ô → #VALUE! (chưa hỗ trợ giao ngầm/mảng).
    private func scalar(_ v: EvalValue) -> CellValue {
        switch v {
        case .scalar(let c): return c
        case .ref(let sh, let r):
            guard r.start == r.end else { return .error(FormulaErrors.value) }
            return context.cellValue(sheet: sh, ref: r.start)
        }
    }

    // MARK: Ép kiểu

    /// nil nếu không đổi được sang số (chuỗi không phải số). Lỗi phải được xử lý trước.
    private func number(_ v: CellValue) -> Double? {
        switch v {
        case .empty: return 0
        case .number(let d): return d
        case .bool(let b): return b ? 1 : 0
        case .string(let s):
            let t = s.trimmingCharacters(in: .whitespaces)
            guard !t.isEmpty, let d = Double(t), d.isFinite else { return nil }
            return d
        case .error: return nil
        }
    }

    private func bool(_ v: CellValue) -> Bool? {
        switch v {
        case .empty: return false
        case .bool(let b): return b
        case .number(let d): return d != 0
        case .string(let s):
            switch s.uppercased() { case "TRUE": return true; case "FALSE": return false; default: return nil }
        case .error: return nil
        }
    }

    static func text(_ v: CellValue) -> String {
        switch v {
        case .empty: return ""
        case .string(let s): return s
        case .bool(let b): return b ? "TRUE" : "FALSE"
        case .error(let e): return e
        case .number(let d):
            if d == d.rounded(), abs(d) < 1e15 { return String(Int64(d)) }
            return String(format: "%.15g", d)
        }
    }

    // MARK: Toán tử

    private func binary(_ op: String, _ l: CellValue, _ r: CellValue) -> CellValue {
        if case .error = l { return l }
        if case .error = r { return r }
        switch op {
        case "&":
            return .string(FormulaEvaluator.text(l) + FormulaEvaluator.text(r))
        case "=", "<>", "<", ">", "<=", ">=":
            let c = FormulaEvaluator.compare(l, r)
            switch op {
            case "=": return .bool(c == 0)
            case "<>": return .bool(c != 0)
            case "<": return .bool(c < 0)
            case ">": return .bool(c > 0)
            case "<=": return .bool(c <= 0)
            default: return .bool(c >= 0)
            }
        default:
            guard let a = number(l), let b = number(r) else { return .error(FormulaErrors.value) }
            let res: Double
            switch op {
            case "+": res = a + b
            case "-": res = a - b
            case "*": res = a * b
            case "/":
                if b == 0 { return .error(FormulaErrors.div0) }
                res = a / b
            default: // ^
                if a == 0 && b == 0 { return .error(FormulaErrors.num) }
                res = pow(a, b)
            }
            return res.isFinite ? .number(res) : .error(FormulaErrors.num)
        }
    }

    /// Thứ tự của Excel: số < chuỗi < logic; chuỗi so không phân biệt hoa/thường; ô rỗng theo kiểu của vế kia.
    static func compare(_ l: CellValue, _ r: CellValue) -> Int {
        func rank(_ v: CellValue) -> Int {
            switch v { case .number: return 0; case .string: return 1; case .bool: return 2; default: return 0 }
        }
        var a = l, b = r
        if case .empty = a { a = emptyLike(b) }
        if case .empty = b { b = emptyLike(a) }
        let ra = rank(a), rb = rank(b)
        if ra != rb { return ra < rb ? -1 : 1 }
        switch (a, b) {
        case (.number(let x), .number(let y)): return x < y ? -1 : (x > y ? 1 : 0)
        case (.string(let x), .string(let y)):
            let o = x.compare(y, options: [.caseInsensitive])
            return o == .orderedAscending ? -1 : (o == .orderedDescending ? 1 : 0)
        case (.bool(let x), .bool(let y)): return x == y ? 0 : (!x ? -1 : 1)
        default: return 0
        }
    }

    private static func emptyLike(_ other: CellValue) -> CellValue {
        switch other {
        case .string: return .string("")
        case .bool: return .bool(false)
        default: return .number(0)
        }
    }

    // MARK: Hàm

    private func call(_ name: String, _ args: [FormulaExpr]) -> EvalValue {
        .scalar(callScalar(name, args))
    }

    private func callScalar(_ name: String, _ args: [FormulaExpr]) -> CellValue {
        let bad = CellValue.error(FormulaErrors.value)
        switch name {
        case "SUM", "AVERAGE", "MIN", "MAX": return aggregate(name, args)
        case "COUNT": return count(args, nonEmptyOnly: false)
        case "COUNTA": return count(args, nonEmptyOnly: true)
        case "IF":
            guard (2...3).contains(args.count) else { return bad }
            let c = scalar(eval(args[0]))
            if case .error = c { return c }
            guard let b = bool(c) else { return bad }
            if b { return scalar(eval(args[1])) }
            return args.count == 3 ? scalar(eval(args[2])) : .bool(false)
        case "AND", "OR": return logical(name == "AND", args)
        case "NOT":
            guard args.count == 1 else { return bad }
            let v = scalar(eval(args[0]))
            if case .error = v { return v }
            guard let b = bool(v) else { return bad }
            return .bool(!b)
        case "ABS":
            guard args.count == 1 else { return bad }
            let v = scalar(eval(args[0]))
            if case .error = v { return v }
            guard let n = number(v) else { return bad }
            return .number(abs(n))
        case "ROUND":
            guard args.count == 2 else { return bad }
            let v = scalar(eval(args[0])), d = scalar(eval(args[1]))
            if case .error = v { return v }
            if case .error = d { return d }
            guard let n = number(v), let digits = number(d) else { return bad }
            return .number(FormulaEvaluator.round(n, digits: Int(digits.rounded(.towardZero))))
        case "CONCATENATE":
            guard !args.isEmpty else { return bad }
            var s = ""
            for a in args {
                let ev = eval(a)
                if case .ref(_, let r) = ev, r.start != r.end { return bad }
                let v = scalar(ev)
                if case .error = v { return v }
                s += FormulaEvaluator.text(v)
            }
            return .string(s)
        case "NA":
            return args.isEmpty ? .error(FormulaErrors.na) : bad
        default:
            return .error(FormulaErrors.name)
        }
    }

    /// Làm tròn nửa ra xa số 0 như Excel, dựa trên biểu diễn thập phân 15 chữ số có nghĩa.
    static func round(_ x: Double, digits: Int) -> Double {
        if let dec = Decimal(string: String(format: "%.15g", x)), abs(digits) < 300 {
            var src = dec, out = Decimal()
            NSDecimalRound(&out, &src, digits, .plain)
            return NSDecimalNumber(decimal: out).doubleValue
        }
        let f = pow(10.0, Double(digits))
        return (x * f).rounded(.toNearestOrAwayFromZero) / f
    }


    /// Trải phẳng đối số: (giá trị, có phải đối số trực tiếp (không từ vùng/ô) không).
    /// Một tham chiếu ô đơn cũng coi như vùng (Excel bỏ qua chữ/logic trong ô tham chiếu).
    private func flatten(_ args: [FormulaExpr]) -> [(CellValue, Bool)] {
        var out: [(CellValue, Bool)] = []
        for a in args {
            switch eval(a) {
            case .scalar(let v): out.append((v, true))
            case .ref(let sh, let r):
                // Ô đơn rỗng bị bỏ qua cũng như trong vùng.
                for v in context.nonEmptyValues(sheet: sh, range: r) { out.append((v, false)) }
            }
        }
        return out
    }

    private func aggregate(_ fn: String, _ args: [FormulaExpr]) -> CellValue {
        guard !args.isEmpty else { return .error(FormulaErrors.value) }
        var nums: [Double] = []
        for (v, direct) in flatten(args) {
            switch v {
            case .error: return v
            case .number(let d): nums.append(d)
            case .bool, .string:
                if direct {
                    guard let n = number(v) else { return .error(FormulaErrors.value) }
                    nums.append(n)
                }
            case .empty: break
            }
        }
        switch fn {
        case "SUM": return .number(nums.reduce(0, +))
        case "AVERAGE":
            guard !nums.isEmpty else { return .error(FormulaErrors.div0) }
            return .number(nums.reduce(0, +) / Double(nums.count))
        case "MIN": return .number(nums.min() ?? 0)
        default: return .number(nums.max() ?? 0)
        }
    }

    private func count(_ args: [FormulaExpr], nonEmptyOnly: Bool) -> CellValue {
        guard !args.isEmpty else { return .error(FormulaErrors.value) }
        var n = 0
        for (v, direct) in flatten(args) {
            if nonEmptyOnly {
                if case .empty = v { continue }
                n += 1
            } else {
                switch v {
                case .number: n += 1
                case .bool, .string: if direct, number(v) != nil { n += 1 }
                default: break
                }
            }
        }
        return .number(Double(n))
    }

    private func logical(_ isAnd: Bool, _ args: [FormulaExpr]) -> CellValue {
        guard !args.isEmpty else { return .error(FormulaErrors.value) }
        var seen = false
        var result = isAnd
        for (v, direct) in flatten(args) {
            switch v {
            case .error: return v
            case .empty: continue
            case .string:
                if !direct { continue }
                guard let b = bool(v) else { return .error(FormulaErrors.value) }
                seen = true; result = isAnd ? (result && b) : (result || b)
            default:
                guard let b = bool(v) else { continue }
                seen = true; result = isAnd ? (result && b) : (result || b)
            }
        }
        return seen ? .bool(result) : .error(FormulaErrors.value)
    }
}
