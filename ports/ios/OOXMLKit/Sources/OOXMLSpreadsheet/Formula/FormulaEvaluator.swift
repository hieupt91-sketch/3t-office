import Foundation

/// Nguồn dữ liệu ô cho evaluator.
protocol FormulaContext {
    /// Tên sheet chuẩn hóa; nil nếu sheet không tồn tại. `name == nil` = sheet hiện tại.
    func resolveSheet(_ name: String?) -> String?
    func cellValue(sheet: String, ref: CellReference) -> CellValue
    /// Các giá trị KHÔNG rỗng trong vùng (theo thứ tự hàng rồi cột).
    func nonEmptyValues(sheet: String, range: CellRange) -> [CellValue]
    /// Số serial ngày giờ Excel của "bây giờ" (đã quy về múi giờ của engine) — cho TODAY/NOW.
    var nowSerial: Double { get }
    /// Đích của tên vùng (M7): (tên sheet như đã đăng ký, vùng). Sheet cục bộ của sheet hiện
    /// tại ưu tiên hơn phạm vi workbook. nil nếu tên không tồn tại.
    func definedNameTarget(_ name: String) -> (sheet: String, range: CellRange)?
    /// Biểu thức đích của tên hằng/công thức (M7 lát 17). nil nếu tên không tồn tại
    /// hoặc tên đó là tên vùng (đích là ô/vùng, xem `definedNameTarget`).
    func definedNameExpr(_ name: String) -> FormulaExpr?
}

enum FormulaErrors {
    static let div0 = "#DIV/0!", value = "#VALUE!", ref = "#REF!", name = "#NAME?", na = "#N/A", num = "#NUM!"
}

/// Giá trị trung gian: số liệu đơn hoặc tham chiếu vùng (chưa trải phẳng).
enum EvalValue {
    case scalar(CellValue)
    case ref(sheet: String, range: CellRange)
    case array([[CellValue]])
}

/// Bộ tính giá trị cho AST. Không có hiệu ứng phụ; mọi lỗi trở thành `.error("#...")`.
struct FormulaEvaluator {
    let context: FormulaContext
    /// Biến cục bộ của LET (khóa đã viết hoa); rỗng ngoài LET.
    var env: [String: EvalValue] = [:]
    /// Vị trí ô đang tính + gốc vùng mảng — chỉ đặt cho ô thuộc công thức mảng (CSE);
    /// bật giao ngầm (implicit intersection) trong scalar(). Công thức thường: nil -> giữ #VALUE!.
    var position: CellReference? = nil
    var arrayOrigin: CellReference? = nil
    /// Tên hằng/công thức đang được mở (M7 lát 17): chặn vòng tên A→B→A thành #REF!.
    var nameStack: Set<String> = []

    func evaluate(_ expr: FormulaExpr) -> CellValue {
        scalar(eval(expr))
    }

    // MARK: Cốt lõi

    func eval(_ e: FormulaExpr) -> EvalValue {
        switch e {
        case .number(let d): return .scalar(.number(d))
        case .string(let s): return .scalar(.string(s))
        case .bool(let b): return .scalar(.bool(b))
        case .error(let s): return .scalar(.error(s))
        case .empty: return .scalar(.empty)
        case .array(let rows): return .array(rows)
        case .name(let n):
            if let v = env[n.uppercased()] { return v }
            // M7: tên vùng — cục bộ sheet rồi workbook; sheet đích không còn → #REF!.
            if let (sh, r) = context.definedNameTarget(n) {
                guard let s = context.resolveSheet(sh) else { return .scalar(.error(FormulaErrors.ref)) }
                return .ref(sheet: s, range: r)
            }
            // M7 lát 17: tên hằng/công thức — tính biểu thức đích; vòng tên → #REF!.
            if let ex = context.definedNameExpr(n) {
                let key = n.uppercased()
                guard !nameStack.contains(key) else { return .scalar(.error(FormulaErrors.ref)) }
                var sub = self
                sub.nameStack.insert(key)
                return sub.eval(ex)
            }
            return .scalar(.error(FormulaErrors.name))
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
            let l = eval(a), r = eval(b)
            if let arr = elementwise(op, l, r) { return arr }
            return .scalar(binary(op, scalar(l), scalar(r)))
        case .call(let name, let args):
            return call(name, args)
        }
    }

    /// Ép về giá trị đơn. Vùng 1 ô → giá trị ô. Vùng nhiều ô/hằng nhiều phần tử: giao ngầm theo vị trí
    /// ô đang tính nếu đang trong công thức mảng (position != nil), ngoài ra → #VALUE!.
    func scalar(_ v: EvalValue) -> CellValue {
        switch v {
        case .scalar(let c): return c
        case .ref(let sh, let r):
            if r.start == r.end { return context.cellValue(sheet: sh, ref: r.start) }
            guard let pos = position else { return .error(FormulaErrors.value) }
            let col = r.start.column == r.end.column ? r.start.column : pos.column
            let row = r.start.row == r.end.row ? r.start.row : pos.row
            let target = CellReference(column: col, row: row)
            guard r.contains(target) else { return .error(FormulaErrors.value) }
            return context.cellValue(sheet: sh, ref: target)
        case .array(let rows):
            if rows.count == 1, rows[0].count == 1 { return rows[0][0] }
            guard let pos = position, let origin = arrayOrigin else { return .error(FormulaErrors.value) }
            let i = pos.row - origin.row, j = pos.column - origin.column
            guard rows.indices.contains(i), rows[i].indices.contains(j) else { return .error(FormulaErrors.value) }
            return rows[i][j]
        }
    }

    // MARK: Mảng trong công thức thường (M7 lát 16, INBOX-MAC #17)

    /// Giới hạn ô cho phép tính theo từng phần tử (chống vùng cả cột gây phình lưới).
    private static let maxElementwiseCells = 1_000_000

    /// true nếu giá trị là mảng/vùng có hơn 1 ô.
    private func isMulti(_ v: EvalValue) -> Bool {
        switch v {
        case .scalar: return false
        case .array(let rows): return rows.count > 1 || (rows.first?.count ?? 0) > 1
        case .ref(_, let r): return r.start != r.end
        }
    }

    /// Trải một giá trị thành lưới; nil nếu vượt giới hạn.
    private func materialize(_ v: EvalValue) -> [[CellValue]]? {
        switch v {
        case .scalar(let c): return [[c]]
        case .array(let rows):
            guard rows.reduce(0, { $0 + $1.count }) <= Self.maxElementwiseCells else { return nil }
            return rows
        case .ref(let sh, let r):
            let nr = r.end.row - r.start.row + 1, nc = r.end.column - r.start.column + 1
            guard nr * nc <= Self.maxElementwiseCells else { return nil }
            var rows: [[CellValue]] = []
            rows.reserveCapacity(nr)
            for row in r.start.row...r.end.row {
                var line: [CellValue] = []
                line.reserveCapacity(nc)
                for col in r.start.column...r.end.column {
                    line.append(context.cellValue(sheet: sh, ref: CellReference(column: col, row: row)))
                }
                rows.append(line)
            }
            return rows
        }
    }

    /// Tính toán tử hai ngôi theo từng phần tử khi ít nhất một vế là mảng/vùng nhiều ô.
    /// nil = cả hai vế đều đơn → dùng đường scalar như cũ. Lệch hình (trừ vế 1x1) → #VALUE!.
    private func elementwise(_ op: String, _ l: EvalValue, _ r: EvalValue) -> EvalValue? {
        guard isMulti(l) || isMulti(r) else { return nil }
        guard let lg = materialize(l), let rg = materialize(r),
              let ln = lg.first?.count, let rn = rg.first?.count else {
            return .scalar(.error(FormulaErrors.value))
        }
        let rows: Int, cols: Int
        if lg.count == rg.count, ln == rn { rows = lg.count; cols = ln }
        else if lg.count == 1, ln == 1 { rows = rg.count; cols = rn }
        else if rg.count == 1, rn == 1 { rows = lg.count; cols = ln }
        else { return .scalar(.error(FormulaErrors.value)) }
        var out: [[CellValue]] = []
        out.reserveCapacity(rows)
        for i in 0..<rows {
            var line: [CellValue] = []
            line.reserveCapacity(cols)
            for j in 0..<cols {
                let a = (lg.count == 1 && ln == 1) ? lg[0][0] : lg[i][j]
                let b = (rg.count == 1 && rn == 1) ? rg[0][0] : rg[i][j]
                line.append(binary(op, a, b))
            }
            out.append(line)
        }
        return .array(out)
    }

    /// IF với điều kiện là mảng/vùng nhiều ô: trả về mảng kết quả theo từng phần tử.
    /// nil = điều kiện đơn → dùng đường scalar như cũ. Nhánh 1x1 được phát cho mọi ô;
    /// nhánh mảng phải cùng hình với điều kiện, nếu không → #VALUE!.
    private func ifArray(_ args: [FormulaExpr]) -> EvalValue? {
        guard (2...3).contains(args.count) else { return nil }
        let cond = eval(args[0])
        guard isMulti(cond), let cg = materialize(cond), let cols = cg.first?.count else { return nil }
        guard let tg = materialize(eval(args[1])),
              let eg = args.count == 3 ? materialize(eval(args[2])) : [[CellValue.bool(false)]],
              let tn = tg.first?.count, let en = eg.first?.count else {
            return .scalar(.error(FormulaErrors.value))
        }
        let rows = cg.count
        guard (tg.count == rows && tn == cols) || (tg.count == 1 && tn == 1),
              (eg.count == rows && en == cols) || (eg.count == 1 && en == 1) else {
            return .scalar(.error(FormulaErrors.value))
        }
        func pick(_ g: [[CellValue]], _ n: Int, _ i: Int, _ j: Int) -> CellValue {
            (g.count == 1 && n == 1) ? g[0][0] : g[i][j]
        }
        var out: [[CellValue]] = []
        out.reserveCapacity(rows)
        for i in 0..<rows {
            var line: [CellValue] = []
            line.reserveCapacity(cols)
            for j in 0..<cols {
                let c = cg[i][j]
                if case .error(let e) = c { line.append(.error(e)); continue }
                guard let b = bool(c) else { line.append(.error(FormulaErrors.value)); continue }
                line.append(b ? pick(tg, tn, i, j) : pick(eg, en, i, j))
            }
            out.append(line)
        }
        return .array(out)
    }

    // MARK: Ép kiểu

    /// nil nếu không đổi được sang số (chuỗi không phải số). Lỗi phải được xử lý trước.
    func number(_ v: CellValue) -> Double? {
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

    func bool(_ v: CellValue) -> Bool? {
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

    func call(_ name: String, _ args: [FormulaExpr]) -> EvalValue {
        if name == "LET" { return letCall(args) }
        if name == "IF", let v = ifArray(args) { return v }
        if let v = callReference(name, args) { return v }
        return .scalar(callScalar(name, args))
    }

    /// LET(name1, value1, ..., calculation): gán lần lượt (giá trị sau dùng được biến trước,
    /// lỗi trong giá trị lan ra ngay), rồi tính biểu thức cuối trong môi trường đã gán.
    private func letCall(_ args: [FormulaExpr]) -> EvalValue {
        guard args.count >= 3, args.count % 2 == 1 else { return .scalar(.error(FormulaErrors.value)) }
        var sub = self
        var i = 0
        while i < args.count - 1 {
            guard case .name(let n) = args[i] else { return .scalar(.error(FormulaErrors.value)) }
            let v = sub.eval(args[i + 1])
            if case .scalar(let cv) = v, case .error = cv { return v }
            sub.env[n.uppercased()] = v
            i += 2
        }
        return sub.eval(args[args.count - 1])
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
            return callSlice2(name, args) ?? .error(FormulaErrors.name)
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
    func flatten(_ args: [FormulaExpr]) -> [(CellValue, Bool)] {
        var out: [(CellValue, Bool)] = []
        for a in args {
            switch eval(a) {
            case .scalar(let v): out.append((v, true))
            case .array(let rows): for v in rows.flatMap({ $0 }) { out.append((v, true)) }
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
