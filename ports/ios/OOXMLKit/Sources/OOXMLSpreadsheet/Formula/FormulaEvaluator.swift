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
    /// Mảng quá lớn / tràn số khi sinh mảng động (M7 lát 18).
    static let calc = "#CALC!"
}

/// Giá trị trung gian: số liệu đơn hoặc tham chiếu vùng (chưa trải phẳng).
/// M7 lát 28: thêm giá trị hàm `.lambda` (đệ quy qua môi trường đã chụp nên enum là indirect).
indirect enum EvalValue {
    case scalar(CellValue)
    case ref(sheet: String, range: CellRange)
    case array([[CellValue]])
    /// Hàm LAMBDA: tham số (đã viết hoa), thân, môi trường đã chụp lúc tạo (bao hàm LET).
    case lambda(params: [String], body: FormulaExpr, env: [String: EvalValue])
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
    /// Độ sâu lồng gọi lambda đang chạy (M7 lát 28): chặn đệ quy vô hạn tràn ngăn xếp.
    var lambdaDepth: Int = 0
    /// Giới hạn của engine (không phải Excel): đệ quy lambda sâu hơn thì #VALUE!.
    private static let maxLambdaDepth = 512

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
        case .apply(let callee, let args):
            let v = eval(callee)
            guard case .lambda(let params, let body, let captured) = v else {
                return .scalar(.error(FormulaErrors.value))
            }
            return applyLambdaValue(params: params, body: body, captured: captured, argExprs: args)
        case .call(let name, let args):
            return call(name, args)
        }
    }

    /// Ép về giá trị đơn. Vùng 1 ô → giá trị ô. Vùng nhiều ô/hằng nhiều phần tử: giao ngầm theo vị trí
    /// ô đang tính nếu đang trong công thức mảng (position != nil), ngoài ra → #VALUE!.
    func scalar(_ v: EvalValue) -> CellValue {
        switch v {
        case .scalar(let c): return c
        // Hàm lambda trần trong ô → #VALUE! như Excel (chỉ có nghĩa khi được gọi).
        case .lambda: return .error(FormulaErrors.value)
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
        case .scalar, .lambda: return false
        case .array(let rows): return rows.count > 1 || (rows.first?.count ?? 0) > 1
        case .ref(_, let r): return r.start != r.end
        }
    }

    /// Trải một giá trị thành lưới; nil nếu vượt giới hạn.
    private func materialize(_ v: EvalValue) -> [[CellValue]]? {
        switch v {
        case .scalar(let c): return [[c]]
        // Hàm lambda dùng như mảng → lưới chứa lỗi, lỗi lan ra qua hàm gọi nó.
        case .lambda: return [[.error(FormulaErrors.value)]]
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

    // MARK: Hàm mảng động (M7 lát 18, INBOX-MAC #17)

    /// Hàm trả về mảng: TRANSPOSE, SEQUENCE, SORT, FILTER, UNIQUE, SORTBY.
    /// nil = không phải hàm mảng → đường scalar như cũ.
    private func callArray(_ name: String, _ args: [FormulaExpr]) -> EvalValue? {
        switch name {
        case "TRANSPOSE": return transpose(args)
        case "SEQUENCE": return sequence(args)
        case "SORT": return sortArray(args)
        case "FILTER": return filterArray(args)
        case "UNIQUE": return uniqueArray(args)
        case "SORTBY": return sortByArray(args)
        case "TAKE": return takeArray(args)
        case "DROP": return dropArray(args)
        case "CHOOSEROWS": return chooseRowsArray(args)
        case "CHOOSECOLS": return chooseColsArray(args)
        case "TOCOL": return tocolRow(args, asColumn: true)
        case "TOROW": return tocolRow(args, asColumn: false)
        case "HSTACK": return stackArrays(args, horizontal: true)
        case "VSTACK": return stackArrays(args, horizontal: false)
        case "RANDARRAY": return randArray(args)
        case "WRAPROWS": return wrapVector(args, byRow: true)
        case "WRAPCOLS": return wrapVector(args, byRow: false)
        case "TEXTSPLIT": return textSplit(args)
        default: return nil
        }
    }

    /// TRANSPOSE(mảng): đổi hàng ↔ cột. Ô lỗi đi qua nguyên vẹn; đối số sai số lượng
    /// hoặc vùng vượt giới hạn phần tử → #VALUE!.
    private func transpose(_ args: [FormulaExpr]) -> EvalValue {
        guard args.count == 1 else { return .scalar(.error(FormulaErrors.value)) }
        guard let grid = materialize(eval(args[0])), let cols = grid.first?.count, cols > 0 else {
            return .scalar(.error(FormulaErrors.value))
        }
        var out: [[CellValue]] = Array(repeating: [], count: cols)
        for j in 0..<cols {
            var line: [CellValue] = []
            line.reserveCapacity(grid.count)
            for i in 0..<grid.count { line.append(grid[i][j]) }
            out[j] = line
        }
        return .array(out)
    }

    /// SEQUENCE(hàng, [cột=1], [bắt đầu=1], [bước=1]): sinh lưới số. Hàng/cột cắt phần lẻ
    /// về số nguyên như Excel, phải ≥ 1 nếu không → #VALUE!; đối số không phải số → #VALUE!;
    /// lỗi trong đối số lan truyền nguyên vẹn; lưới vượt giới hạn phần tử hoặc tràn số → #CALC!.
    private func sequence(_ args: [FormulaExpr]) -> EvalValue {
        guard (1...4).contains(args.count) else { return .scalar(.error(FormulaErrors.value)) }
        var nums: [Double] = [1, 1, 1, 1]
        for i in 0..<args.count {
            let v = scalar(eval(args[i]))
            if case .error(let e) = v { return .scalar(.error(e)) }
            guard let n = number(v), n.isFinite else { return .scalar(.error(FormulaErrors.value)) }
            nums[i] = n
        }
        let r0 = nums[0].rounded(.towardZero), c0 = nums[1].rounded(.towardZero)
        guard r0 >= 1, c0 >= 1 else { return .scalar(.error(FormulaErrors.value)) }
        guard r0 <= Double(Self.maxElementwiseCells), c0 <= Double(Self.maxElementwiseCells),
              r0 * c0 <= Double(Self.maxElementwiseCells) else {
            return .scalar(.error(FormulaErrors.calc))
        }
        let rows = Int(r0), cols = Int(c0)
        var out: [[CellValue]] = []
        out.reserveCapacity(rows)
        for i in 0..<rows {
            var line: [CellValue] = []
            line.reserveCapacity(cols)
            for j in 0..<cols {
                let v = nums[2] + Double(i * cols + j) * nums[3]
                guard v.isFinite else { return .scalar(.error(FormulaErrors.calc)) }
                line.append(.number(v))
            }
            out.append(line)
        }
        return .array(out)
    }

    // MARK: Hàm mảng động — SORT / FILTER / UNIQUE (M7 lát 19, INBOX-MAC #17)

    /// Chuyển vị một lưới (dùng cho by_col của SORT/UNIQUE).
    private static func transposeGrid(_ grid: [[CellValue]]) -> [[CellValue]] {
        guard let cols = grid.first?.count, cols > 0 else { return grid }
        var out: [[CellValue]] = Array(repeating: [], count: cols)
        for j in 0..<cols {
            var line: [CellValue] = []
            line.reserveCapacity(grid.count)
            for i in 0..<grid.count { line.append(grid[i][j]) }
            out[j] = line
        }
        return out
    }

    /// Thứ tự sắp xếp của Excel: số < chuỗi < logic < lỗi < rỗng (rỗng luôn cuối,
    /// cả khi giảm dần — thứ tự giảm chỉ đảo chiều các hạng còn lại).
    private static func sortRank(_ v: CellValue) -> Int {
        switch v {
        case .number: return 0
        case .string: return 1
        case .bool: return 2
        case .error: return 3
        case .empty: return 4
        }
    }

    /// So sánh hai khóa sắp xếp: <0 nếu a trước b, 0 nếu bằng, >0 nếu a sau b.
    private static func compareSortKey(_ a: CellValue, _ b: CellValue, ascending: Bool) -> Int {
        if case .empty = a, case .empty = b { return 0 }
        if case .empty = a { return 1 }
        if case .empty = b { return -1 }
        let ra = sortRank(a), rb = sortRank(b)
        var c: Int
        if ra != rb { c = ra < rb ? -1 : 1 }
        else if case (.error(let x), .error(let y)) = (a, b) {
            c = x.compare(y, options: [.caseInsensitive]) == .orderedAscending ? -1
                : (x.compare(y, options: [.caseInsensitive]) == .orderedDescending ? 1 : 0)
        } else { c = compare(a, b) }
        return ascending ? c : -c
    }

    /// Đọc một đối số logic (TRUE/FALSE, số ≠ 0 → TRUE như IF); trả .error nếu
    /// đối số đã là lỗi hoặc không đổi được sang logic.
    private func boolArg(_ expr: FormulaExpr) -> CellValue {
        let v = scalar(eval(expr))
        if case .error = v { return v }
        guard let b = bool(v) else { return .error(FormulaErrors.value) }
        return .bool(b)
    }

    /// SORT(mảng, [chỉ_mục_sắp=1], [thứ_tự=1], [theo_cột=FALSE]): sắp xếp hàng theo
    /// cột khóa (hoặc cột theo hàng khóa khi theo_cột=TRUE), ổn định. Chỉ mục ngoài
    /// phạm vi, không phải số nguyên ≥ 1, thứ tự khác ±1 → #VALUE!; lỗi trong đối
    /// số lan truyền nguyên vẹn.
    private func sortArray(_ args: [FormulaExpr]) -> EvalValue {
        let bad = EvalValue.scalar(.error(FormulaErrors.value))
        guard (1...4).contains(args.count) else { return bad }
        guard let grid = materialize(eval(args[0])), !grid.isEmpty,
              let cols = grid.first?.count, cols > 0 else { return bad }
        var sortIndex = 1.0, sortOrder = 1.0, byCol = false
        if args.count >= 2 {
            let v = scalar(eval(args[1]))
            if case .error = v { return .scalar(v) }
            guard let n = number(v), n.isFinite else { return bad }
            sortIndex = n
        }
        if args.count >= 3 {
            let v = scalar(eval(args[2]))
            if case .error = v { return .scalar(v) }
            guard let n = number(v), n.isFinite else { return bad }
            sortOrder = n
        }
        if args.count >= 4 {
            let bv = boolArg(args[3])
            guard case .bool(let b) = bv else { return .scalar(bv) }
            byCol = b
        }
        guard sortOrder == 1 || sortOrder == -1 else { return bad }
        guard sortIndex == sortIndex.rounded(.towardZero), sortIndex >= 1 else { return bad }
        var g = byCol ? Self.transposeGrid(grid) : grid
        let keyIdx = Int(sortIndex) - 1
        guard keyIdx < (g.first?.count ?? 0) else { return bad }
        let ascending = sortOrder == 1
        let sorted = g.enumerated().sorted { a, b in
            let c = Self.compareSortKey(a.element[keyIdx], b.element[keyIdx], ascending: ascending)
            return c != 0 ? c < 0 : a.offset < b.offset
        }.map { $0.element }
        g = sorted
        if byCol { g = Self.transposeGrid(g) }
        return .array(g)
    }

    /// FILTER(mảng, bao_gồm, [nếu_rỗng]): giữ hàng (bao_gồm là cột logic) hoặc giữ
    /// cột (bao_gồm là hàng logic). Ô rỗng trong bao_gồm = FALSE; giá trị không
    /// phải logic → #VALUE!; lỗi trong bao_gồm lan truyền; hình bao_gồm khác →
    /// #VALUE!; không còn hàng/cột nào: trả nếu_rỗng nếu có, không thì #CALC!.
    private func filterArray(_ args: [FormulaExpr]) -> EvalValue {
        let bad = EvalValue.scalar(.error(FormulaErrors.value))
        guard (2...3).contains(args.count) else { return bad }
        guard let grid = materialize(eval(args[0])), !grid.isEmpty,
              let cols = grid.first?.count, cols > 0 else { return bad }
        guard let inc = materialize(eval(args[1])), !inc.isEmpty,
              let incCols = inc.first?.count, incCols > 0 else { return bad }
        let rows = grid.count
        let byColumn: Bool
        var flags: [Bool] = []
        if inc.count == rows, incCols == 1 {
            byColumn = false
            for i in 0..<rows {
                switch inc[i][0] {
                case .empty: flags.append(false)
                case .bool(let b): flags.append(b)
                case .error(let e): return .scalar(.error(e))
                default: return bad
                }
            }
        } else if inc.count == 1, incCols == cols {
            byColumn = true
            for j in 0..<cols {
                switch inc[0][j] {
                case .empty: flags.append(false)
                case .bool(let b): flags.append(b)
                case .error(let e): return .scalar(.error(e))
                default: return bad
                }
            }
        } else { return bad }
        var out: [[CellValue]] = []
        if byColumn {
            let kept = (0..<cols).filter { flags[$0] }
            for i in 0..<rows {
                out.append(kept.map { grid[i][$0] })
            }
            if kept.isEmpty { out = [] }
        } else {
            for i in 0..<rows where flags[i] { out.append(grid[i]) }
        }
        if out.isEmpty {
            if args.count == 3 {
                guard let repl = materialize(eval(args[2])) else { return bad }
                return .array(repl)
            }
            return .scalar(.error(FormulaErrors.calc))
        }
        return .array(out)
    }

    /// Khóa so trùng của UNIQUE: số theo giá trị (-0 = 0), chuỗi không phân biệt
    /// hoa/thường, logic, lỗi theo mã, rỗng riêng một hạng.
    private static func uniqueKey(_ v: CellValue) -> String {
        switch v {
        case .empty: return "E"
        case .number(let d): return "N\(d == 0 ? 0 : d)"
        case .string(let s): return "S\(s.lowercased())"
        case .bool(let b): return "B\(b)"
        case .error(let e): return "X\(e)"
        }
    }

    /// UNIQUE(mảng, [theo_cột=FALSE], [chỉ_một_lần=FALSE]): giữ hàng (hoặc cột)
    /// phân biệt đầu tiên; chỉ_một_lần=TRUE chỉ giữ hạng xuất hiện đúng một lần.
    private func uniqueArray(_ args: [FormulaExpr]) -> EvalValue {
        let bad = EvalValue.scalar(.error(FormulaErrors.value))
        guard (1...3).contains(args.count) else { return bad }
        guard let grid = materialize(eval(args[0])), !grid.isEmpty,
              let cols = grid.first?.count, cols > 0 else { return bad }
        var byCol = false, exactlyOnce = false
        if args.count >= 2 {
            let bv = boolArg(args[1])
            guard case .bool(let b) = bv else { return .scalar(bv) }
            byCol = b
        }
        if args.count >= 3 {
            let bv = boolArg(args[2])
            guard case .bool(let b) = bv else { return .scalar(bv) }
            exactlyOnce = b
        }
        var g = byCol ? Self.transposeGrid(grid) : grid
        var counts: [String: Int] = [:]
        var keys: [String] = []
        keys.reserveCapacity(g.count)
        for row in g {
            let k = row.map { Self.uniqueKey($0) }.joined(separator: "\u{1F}")
            keys.append(k)
            counts[k, default: 0] += 1
        }
        var kept: [[CellValue]] = []
        var seen: Set<String> = []
        for (i, row) in g.enumerated() {
            if exactlyOnce {
                if counts[keys[i]] == 1 { kept.append(row) }
            } else if seen.insert(keys[i]).inserted {
                kept.append(row)
            }
        }
        g = kept
        if byCol { g = Self.transposeGrid(g) }
        return .array(g)
    }

    /// SORTBY(mảng, theo_mảng1, [thứ_tự1=1], [theo_mảng2], [thứ_tự2], ...):
    /// sắp hàng của mảng theo một hoặc nhiều cột khóa. Đối số đi theo cặp vị
    /// trí (theo_mảng, thứ_tự): thứ_tự của cặp cuối có thể bỏ (mặc định 1).
    /// Mỗi theo_mảng phải là cột đơn có đúng số hàng bằng mảng; thứ_tự chỉ
    /// nhận ±1. So khóa bằng compareSortKey như SORT (số < chuỗi < logic <
    /// lỗi < rỗng luôn cuối, ổn định, khóa sau chỉ phá hòa khóa trước).
    /// Thứ_tự khác ±1, theo_mảng sai hình/không phải cột đơn, thiếu theo_mảng
    /// → #VALUE!; lỗi scalar trong theo_mảng/thứ_tự lan truyền nguyên vẹn;
    /// ô lỗi trong cột khóa được sắp như giá trị (sau số), như SORT.
    private func sortByArray(_ args: [FormulaExpr]) -> EvalValue {
        let bad = EvalValue.scalar(.error(FormulaErrors.value))
        guard args.count >= 2 else { return bad }
        guard let grid = materialize(eval(args[0])), !grid.isEmpty,
              let cols = grid.first?.count, cols > 0 else { return bad }
        let rows = grid.count
        var keys: [(col: [CellValue], ascending: Bool)] = []
        var i = 1
        while i < args.count {
            let keyEval = eval(args[i])
            if case .scalar(.error(let e)) = keyEval { return .scalar(.error(e)) }
            guard let keyGrid = materialize(keyEval), keyGrid.count == rows,
                  let keyCols = keyGrid.first?.count, keyCols == 1 else { return bad }
            var ascending = true
            if i + 1 < args.count {
                let v = scalar(eval(args[i + 1]))
                if case .error = v { return .scalar(v) }
                guard let n = number(v), n.isFinite, n == 1 || n == -1 else { return bad }
                ascending = n == 1
            }
            keys.append((keyGrid.map { $0[0] }, ascending))
            i += 2
        }
        let sorted = grid.enumerated().sorted { a, b in
            for (key, ascending) in keys {
                let c = Self.compareSortKey(key[a.offset], key[b.offset], ascending: ascending)
                if c != 0 { return c < 0 }
            }
            return a.offset < b.offset
        }.map { $0.element }
        return .array(sorted)
    }

    // MARK: Hàm mảng động — TAKE / DROP / CHOOSEROWS / CHOOSECOLS (M7 lát 24, INBOX-MAC #17)

    /// Đọc một đối số số nguyên từ giá trị scalar đã tính (cắt phần lẻ về 0
    /// như SEQUENCE): không phải số hoặc tràn → nil. Lỗi phải kiểm trước.
    private func intFromScalar(_ v: CellValue) -> Int? {
        guard let n = number(v), n.isFinite else { return nil }
        let t = n.rounded(.towardZero)
        guard t >= Double(Int.min), t <= Double(Int.max) else { return nil }
        return Int(t)
    }

    /// TAKE(mảng, [hàng], [cột]): lấy N hàng/cột đầu (dương) hoặc cuối (âm).
    /// Hàng/cột bỏ trống = lấy hết trục đó; phải cho ít nhất một trục nếu không
    /// → #VALUE!. Hàng/cột = 0 → #CALC! (mảng rỗng); |N| vượt kích thước → kẹp
    /// về toàn bộ trục đó (không lỗi); không phải số → #VALUE!; lỗi lan truyền.
    private func takeArray(_ args: [FormulaExpr]) -> EvalValue {
        let bad = EvalValue.scalar(.error(FormulaErrors.value))
        let empty = EvalValue.scalar(.error(FormulaErrors.calc))
        guard (1...3).contains(args.count) else { return bad }
        guard let grid = materialize(eval(args[0])), !grid.isEmpty,
              let cols = grid.first?.count, cols > 0 else { return bad }
        let rows = grid.count
        var r: Int? = nil, c: Int? = nil
        if args.count >= 2, args[1] != .empty {
            let rv = scalar(eval(args[1]))
            if case .error(let e) = rv { return .scalar(.error(e)) }
            guard let n = intFromScalar(rv) else { return bad }
            if n == 0 { return empty }
            r = n
        }
        if args.count == 3, args[2] != .empty {
            let cv = scalar(eval(args[2]))
            if case .error(let e) = cv { return .scalar(.error(e)) }
            guard let n = intFromScalar(cv) else { return bad }
            if n == 0 { return empty }
            c = n
        }
        guard r != nil || c != nil else { return bad }
        let rn = min(abs(r ?? rows), rows), cn = min(abs(c ?? cols), cols)
        let rowRange: Range<Int> = (r ?? rows) >= 0 ? 0..<rn : (rows - rn)..<rows
        let colRange: Range<Int> = (c ?? cols) >= 0 ? 0..<cn : (cols - cn)..<cols
        var out: [[CellValue]] = []
        out.reserveCapacity(rowRange.count)
        for i in rowRange { out.append(Array(grid[i][colRange])) }
        return .array(out)
    }

    /// DROP(mảng, [hàng], [cột]): bỏ N hàng/cột đầu (dương) hoặc cuối (âm).
    /// Bỏ trống một trục = giữ nguyên trục đó; không đối số nào = trả nguyên mảng.
    /// Đối số cho tường minh = 0, hoặc |N| ≥ kích thước trục (bỏ hết hoặc hơn)
    /// → #CALC! (mảng rỗng); không phải số → #VALUE!; lỗi lan truyền.
    private func dropArray(_ args: [FormulaExpr]) -> EvalValue {
        let bad = EvalValue.scalar(.error(FormulaErrors.value))
        let empty = EvalValue.scalar(.error(FormulaErrors.calc))
        guard (1...3).contains(args.count) else { return bad }
        guard let grid = materialize(eval(args[0])), !grid.isEmpty,
              let cols = grid.first?.count, cols > 0 else { return bad }
        let rows = grid.count
        var r = 0, c = 0
        if args.count >= 2, args[1] != .empty {
            let v = scalar(eval(args[1]))
            if case .error(let e) = v { return .scalar(.error(e)) }
            guard let n = intFromScalar(v) else { return bad }
            if n == 0 || abs(n) >= rows { return empty }
            r = n
        }
        if args.count == 3, args[2] != .empty {
            let v = scalar(eval(args[2]))
            if case .error(let e) = v { return .scalar(.error(e)) }
            guard let n = intFromScalar(v) else { return bad }
            if n == 0 || abs(n) >= cols { return empty }
            c = n
        }
        if args.count == 1 { return .array(grid) }
        let rowRange: Range<Int> = r >= 0 ? r..<rows : 0..<(rows + r)
        let colRange: Range<Int> = c >= 0 ? c..<cols : 0..<(cols + c)
        guard !rowRange.isEmpty, !colRange.isEmpty else { return empty }
        var out: [[CellValue]] = []
        out.reserveCapacity(rowRange.count)
        for i in rowRange { out.append(Array(grid[i][colRange])) }
        return .array(out)
    }

    /// CHOOSEROWS(mảng, hàng1, [hàng2], ...): lấy các hàng theo chỉ mục 1-based,
    /// âm đếm từ cuối; giữ đúng thứ tự đối số, cho trùng. Chỉ mục 0 hoặc
    /// |chỉ mục| > số hàng, không phải số → #VALUE!; lỗi lan truyền.
    private func chooseRowsArray(_ args: [FormulaExpr]) -> EvalValue {
        let bad = EvalValue.scalar(.error(FormulaErrors.value))
        guard args.count >= 2 else { return bad }
        guard let grid = materialize(eval(args[0])), !grid.isEmpty,
              let cols = grid.first?.count, cols > 0 else { return bad }
        let rows = grid.count
        var out: [[CellValue]] = []
        out.reserveCapacity(args.count - 1)
        for k in 1..<args.count {
            let v = scalar(eval(args[k]))
            if case .error(let e) = v { return .scalar(.error(e)) }
            guard let n = intFromScalar(v), n != 0, abs(n) <= rows else { return bad }
            out.append(grid[n > 0 ? n - 1 : rows + n])
        }
        return .array(out)
    }

    /// CHOOSECOLS(mảng, cột1, [cột2], ...): như CHOOSEROWS nhưng theo cột.
    private func chooseColsArray(_ args: [FormulaExpr]) -> EvalValue {
        let bad = EvalValue.scalar(.error(FormulaErrors.value))
        guard args.count >= 2 else { return bad }
        guard let grid = materialize(eval(args[0])), !grid.isEmpty,
              let cols = grid.first?.count, cols > 0 else { return bad }
        let rows = grid.count
        var picked: [Int] = []
        picked.reserveCapacity(args.count - 1)
        for k in 1..<args.count {
            let v = scalar(eval(args[k]))
            if case .error(let e) = v { return .scalar(.error(e)) }
            guard let n = intFromScalar(v), n != 0, abs(n) <= cols else { return bad }
            picked.append(n > 0 ? n - 1 : cols + n)
        }
        var out: [[CellValue]] = []
        out.reserveCapacity(rows)
        for i in 0..<rows { out.append(picked.map { grid[i][$0] }) }
        return .array(out)
    }

    // MARK: Hàm mảng động — TOCOL / TOROW / HSTACK / VSTACK (M7 lát 25, INBOX-MAC #17)

    /// TOCOL(mảng, [bỏ_qua], [quét_theo_cột]) / TOROW(...): trải mảng thành
    /// một cột / một hàng. bỏ_qua: 0 giữ tất cả (mặc định), 1 bỏ ô trống,
    /// 2 bỏ ô lỗi, 3 bỏ cả hai; ngoài 0...3 → #VALUE!. quét_theo_cột TRUE
    /// = duyệt theo cột, FALSE (mặc định) = duyệt theo hàng; không ép được
    /// sang logic → #VALUE!. Kết quả rỗng sau khi lọc → #CALC!; lỗi trong
    /// đối số lan truyền; ô lỗi trong mảng chỉ bị bỏ khi bỏ_qua yêu cầu.
    private func tocolRow(_ args: [FormulaExpr], asColumn: Bool) -> EvalValue {
        let bad = EvalValue.scalar(.error(FormulaErrors.value))
        guard (1...3).contains(args.count) else { return bad }
        guard let grid = materialize(eval(args[0])), !grid.isEmpty,
              let cols = grid.first?.count, cols > 0 else { return bad }
        var ignore = 0
        if args.count >= 2, args[1] != .empty {
            let v = scalar(eval(args[1]))
            if case .error(let e) = v { return .scalar(.error(e)) }
            guard let n = intFromScalar(v), (0...3).contains(n) else { return bad }
            ignore = n
        }
        var byCol = false
        if args.count == 3, args[2] != .empty {
            let v = scalar(eval(args[2]))
            if case .error(let e) = v { return .scalar(.error(e)) }
            guard let b = bool(v) else { return bad }
            byCol = b
        }
        let dropBlank = (ignore & 1) == 1, dropError = (ignore & 2) == 2
        var flat: [CellValue] = []
        flat.reserveCapacity(grid.count * cols)
        func keep(_ c: CellValue) -> Bool {
            if dropBlank, case .empty = c { return false }
            if dropError, case .error = c { return false }
            return true
        }
        if byCol {
            for j in 0..<cols {
                for i in 0..<grid.count where keep(grid[i][j]) { flat.append(grid[i][j]) }
            }
        } else {
            for i in 0..<grid.count {
                for j in 0..<cols where keep(grid[i][j]) { flat.append(grid[i][j]) }
            }
        }
        guard !flat.isEmpty else { return .scalar(.error(FormulaErrors.calc)) }
        return asColumn ? .array(flat.map { [$0] }) : .array([flat])
    }

    /// HSTACK(mảng1, [mảng2], ...) / VSTACK(...): xếp nhiều mảng theo chiều
    /// ngang / dọc. Mảng ngắn hơn (ít hàng với HSTACK, ít cột với VSTACK)
    /// được đệm #N/A. Ít nhất 1 đối số; đối số là lỗi scalar → lan truyền;
    /// vùng vượt giới hạn phần tử → #VALUE!; tổng số ô vượt giới hạn → #CALC!.
    private func stackArrays(_ args: [FormulaExpr], horizontal: Bool) -> EvalValue {
        let bad = EvalValue.scalar(.error(FormulaErrors.value))
        guard !args.isEmpty else { return bad }
        var grids: [[[CellValue]]] = []
        grids.reserveCapacity(args.count)
        for a in args {
            let v = eval(a)
            if case .scalar(let c) = v, case .error(let e) = c { return .scalar(.error(e)) }
            guard let g = materialize(v), !g.isEmpty, (g.first?.count ?? 0) > 0 else { return bad }
            grids.append(g)
        }
        let na = CellValue.error(FormulaErrors.na)
        if horizontal {
            let rows = grids.map { $0.count }.max() ?? 0
            let totalCols = grids.reduce(0) { $0 + ($1.first?.count ?? 0) }
            guard rows * totalCols <= Self.maxElementwiseCells else {
                return .scalar(.error(FormulaErrors.calc))
            }
            var out: [[CellValue]] = []
            out.reserveCapacity(rows)
            for i in 0..<rows {
                var line: [CellValue] = []
                line.reserveCapacity(totalCols)
                for g in grids {
                    let cols = g.first?.count ?? 0
                    if i < g.count { line.append(contentsOf: g[i]) }
                    else { line.append(contentsOf: [CellValue](repeating: na, count: cols)) }
                }
                out.append(line)
            }
            return .array(out)
        }
        let cols = grids.map { $0.first?.count ?? 0 }.max() ?? 0
        let totalRows = grids.reduce(0) { $0 + $1.count }
        guard totalRows * cols <= Self.maxElementwiseCells else {
            return .scalar(.error(FormulaErrors.calc))
        }
        var out: [[CellValue]] = []
        out.reserveCapacity(totalRows)
        for g in grids {
            let w = g.first?.count ?? 0
            for line in g {
                out.append(w == cols ? line : line + [CellValue](repeating: na, count: cols - w))
            }
        }
        return .array(out)
    }

    // MARK: Hàm mảng động — RANDARRAY / WRAPROWS / WRAPCOLS (M7 lát 26, INBOX-MAC #17)

    /// RANDARRAY([hàng=1], [cột=1], [nhỏ_nhất=0], [lớn_nhất=1], [nguyên=FALSE]):
    /// sinh lưới số ngẫu nhiên. Hàng/cột cắt phần lẻ về nguyên, phải ≥ 1 nếu
    /// không → #VALUE!; nhỏ_nhất/lớn_nhất phải là số hữu hạn, nhỏ_nhất >
    /// lớn_nhất → #VALUE!; nguyên=TRUE → số nguyên trong [nhỏ_nhất, lớn_nhất]
    /// (cận cắt phần lẻ về nguyên trước), FALSE → số thập phân trong
    /// [nhỏ_nhất, lớn_nhất); nhỏ_nhất == lớn_nhất → toàn bộ bằng giá trị đó
    /// ở cả hai chế độ; lưới vượt giới hạn phần tử → #CALC!; lỗi trong đối
    /// số lan truyền nguyên vẹn. (Hàm biến thiên: mỗi lần tính lại sinh số mới.)
    private func randArray(_ args: [FormulaExpr]) -> EvalValue {
        let bad = EvalValue.scalar(.error(FormulaErrors.value))
        guard args.count <= 5 else { return bad }
        var nums: [Double] = [1, 1, 0, 1]
        for i in 0..<min(args.count, 4) {
            guard args[i] != .empty else { continue }
            let v = scalar(eval(args[i]))
            if case .error(let e) = v { return .scalar(.error(e)) }
            guard let n = number(v), n.isFinite else { return bad }
            nums[i] = n
        }
        var integer = false
        if args.count == 5, args[4] != .empty {
            let v = scalar(eval(args[4]))
            if case .error(let e) = v { return .scalar(.error(e)) }
            guard let b = bool(v) else { return bad }
            integer = b
        }
        let r0 = nums[0].rounded(.towardZero), c0 = nums[1].rounded(.towardZero)
        guard r0 >= 1, c0 >= 1, r0 <= Double(Self.maxElementwiseCells),
              c0 <= Double(Self.maxElementwiseCells) else { return bad }
        let rows = Int(r0), cols = Int(c0)
        let lo = nums[2], hi = nums[3]
        guard lo <= hi else { return bad }
        guard rows * cols <= Self.maxElementwiseCells else {
            return .scalar(.error(FormulaErrors.calc))
        }
        if integer {
            let a = lo.rounded(.towardZero), b = hi.rounded(.towardZero)
            guard a <= b, a >= Double(Int.min), b <= Double(Int.max) else { return bad }
            let loI = Int(a), hiI = Int(b)
            var out: [[CellValue]] = []
            out.reserveCapacity(rows)
            for _ in 0..<rows {
                var line: [CellValue] = []
                line.reserveCapacity(cols)
                for _ in 0..<cols { line.append(.number(Double(Int.random(in: loI...hiI)))) }
                out.append(line)
            }
            return .array(out)
        }
        var out: [[CellValue]] = []
        out.reserveCapacity(rows)
        for _ in 0..<rows {
            var line: [CellValue] = []
            line.reserveCapacity(cols)
            for _ in 0..<cols {
                line.append(.number(lo == hi ? lo : Double.random(in: lo..<hi)))
            }
            out.append(line)
        }
        return .array(out)
    }

    /// WRAPROWS(vectơ, số_gói, [đệm]) / WRAPCOLS(...): gói một vectơ một chiều
    /// thành nhiều hàng / cột, mỗi hàng/cột dài số_gói ô; nhóm cuối thiếu được
    /// đệm bằng đệm (mặc định #N/A). Vectơ phải là đúng một hàng hoặc một cột,
    /// nếu không → #VALUE!; số_gói cắt phần lẻ về nguyên, phải ≥ 1 nếu không
    /// → #VALUE!; tổng số ô vượt giới hạn → #CALC!; đệm là lỗi → lỗi đó lan
    /// truyền làm kết quả; ô trống trong vectơ đi qua nguyên vẹn như các hàm
    /// mảng khác của engine.
    private func wrapVector(_ args: [FormulaExpr], byRow: Bool) -> EvalValue {
        let bad = EvalValue.scalar(.error(FormulaErrors.value))
        guard (2...3).contains(args.count) else { return bad }
        guard let grid = materialize(eval(args[0])), !grid.isEmpty,
              let cols = grid.first?.count, cols > 0 else { return bad }
        let rows = grid.count
        guard rows == 1 || cols == 1 else { return bad }
        let flat = grid.flatMap { $0 }
        let wv = scalar(eval(args[1]))
        if case .error(let e) = wv { return .scalar(.error(e)) }
        guard let w = intFromScalar(wv), w >= 1 else { return bad }
        var pad: CellValue = .error(FormulaErrors.na)
        if args.count == 3, args[2] != .empty {
            let pv = scalar(eval(args[2]))
            if case .error(let e) = pv { return .scalar(.error(e)) }
            pad = pv
        }
        let n = flat.count
        let groups = (n + w - 1) / w
        guard groups * w <= Self.maxElementwiseCells else {
            return .scalar(.error(FormulaErrors.calc))
        }
        if byRow {
            var out: [[CellValue]] = []
            out.reserveCapacity(groups)
            for g in 0..<groups {
                var line: [CellValue] = []
                line.reserveCapacity(w)
                for j in 0..<w {
                    let idx = g * w + j
                    line.append(idx < n ? flat[idx] : pad)
                }
                out.append(line)
            }
            return .array(out)
        }
        var out: [[CellValue]] = Array(repeating: [], count: w)
        for r in 0..<w {
            var line: [CellValue] = []
            line.reserveCapacity(groups)
            for g in 0..<groups {
                let idx = g * w + r
                line.append(idx < n ? flat[idx] : pad)
            }
            out[r] = line
        }
        return .array(out)
    }

    // MARK: Hàm mảng động — TEXTSPLIT (M7 lát 27, INBOX-MAC #17)

    /// Chuỗi từ một dãy scalar (dùng chung cho TEXTSPLIT).
    static func stringFromScalars(_ s: [Unicode.Scalar]) -> String {
        var v = String.UnicodeScalarView()
        v.append(contentsOf: s)
        return String(v)
    }

    /// So sánh hai dãy scalar; caseInsensitive = so không phân biệt hoa/thường
    /// theo từng scalar (tránh lỗi lệch chỉ số khi lowercased() đổi độ dài chuỗi).
    static func scalarsEqual(_ a: [Unicode.Scalar], _ b: [Unicode.Scalar], caseInsensitive: Bool) -> Bool {
        guard a.count == b.count else { return false }
        if !caseInsensitive { return a == b }
        for (x, y) in zip(a, b) {
            if x == y { continue }
            if Self.stringFromScalars([x]).lowercased() != Self.stringFromScalars([y]).lowercased() { return false }
        }
        return true
    }

    /// Vị trí bắt đầu (chỉ số scalar) của mọi lần xuất hiện KHÔNG chồng lấp của
    /// delimiter trong text; [] nếu delimiter rỗng hoặc dài hơn text. Dùng chung
    /// cho TEXTBEFORE/TEXTAFTER (slice-2).
    static func findOccurrences(in text: [Unicode.Scalar], delimiter: [Unicode.Scalar], caseInsensitive: Bool) -> [Int] {
        guard !delimiter.isEmpty, delimiter.count <= text.count else { return [] }
        var out: [Int] = []
        var i = 0
        while i + delimiter.count <= text.count {
            if scalarsEqual(Array(text[i..<(i + delimiter.count)]), delimiter, caseInsensitive: caseInsensitive) {
                out.append(i)
                i += delimiter.count
            } else { i += 1 }
        }
        return out
    }

    /// Tách một dãy scalar theo danh sách phân cách (không chồng lấp; tại mỗi vị
    /// trí thử các phân cách theo thứ tự danh sách, phân cách đầu khớp sẽ thắng).
    /// Không có phân cách → nguyên dãy. Đoạn rỗng được giữ (bỏ rỗng do tầng trên).
    private static func splitSegments(_ s: [Unicode.Scalar], by delims: [[Unicode.Scalar]], caseInsensitive: Bool) -> [[Unicode.Scalar]] {
        guard !delims.isEmpty else { return [s] }
        var out: [[Unicode.Scalar]] = []
        var start = 0, i = 0
        while i < s.count {
            var matched: Int? = nil
            for d in delims where i + d.count <= s.count {
                if scalarsEqual(Array(s[i..<(i + d.count)]), d, caseInsensitive: caseInsensitive) { matched = d.count; break }
            }
            if let len = matched {
                out.append(Array(s[start..<i]))
                i += len; start = i
            } else { i += 1 }
        }
        out.append(Array(s[start...]))
        return out
    }

    /// Đọc một đối số phân cách của TEXTSPLIT: nil = bỏ trống (đối số .empty,
    /// hoặc vùng phân cách toàn ô trống); lỗi → (nil, lỗi). Mỗi phần tử ép sang
    /// chuỗi (số → chuỗi như Excel); phần tử chuỗi rỗng → #VALUE! (phân cách
    /// rỗng không hợp lệ); ô lỗi trong vùng → lan truyền.
    private func splitDelimiters(_ expr: FormulaExpr) -> ([[Unicode.Scalar]]?, CellValue?) {
        if expr == .empty { return (nil, nil) }
        let v = eval(expr)
        if case .scalar(let c) = v, case .error(let e) = c { return (nil, .error(e)) }
        guard let grid = materialize(v), !grid.isEmpty else { return (nil, .error(FormulaErrors.value)) }
        var out: [[Unicode.Scalar]] = []
        for cell in grid.flatMap({ $0 }) {
            switch cell {
            case .empty: continue
            case .error(let e): return (nil, .error(e))
            default:
                let s = Array(FormulaEvaluator.text(cell).unicodeScalars)
                guard !s.isEmpty else { return (nil, .error(FormulaErrors.value)) }
                out.append(s)
            }
        }
        return (out.isEmpty ? nil : out, nil)
    }

    /// TEXTSPLIT(văn_bản, [phân_cách_cột], [phân_cách_hàng], [bỏ_rỗng=FALSE],
    /// [chế_độ_khớp=0], [đệm]): tách văn bản thành mảng. Tách hàng trước bằng
    /// phân_cách_hàng, rồi từng hàng tách cột bằng phân_cách_cột; phân cách là
    /// chuỗi đơn, hằng mảng hoặc vùng (mỗi phần tử một phân cách). Ít nhất một
    /// trục phải có phân cách, nếu không → #VALUE!; văn_bản rỗng → #VALUE!;
    /// bỏ_rỗng=TRUE bỏ đoạn rỗng (hàng thành toàn rỗng thì bỏ cả hàng), kết
    /// quả rỗng sau lọc → #VALUE!; hàng ngắn được đệm bằng đệm (mặc định #N/A);
    /// chế_độ_khớp chỉ 0/1 (1 = không phân biệt hoa/thường); tổng số ô vượt
    /// giới hạn → #CALC!; lỗi trong đối số lan truyền nguyên vẹn.
    private func textSplit(_ args: [FormulaExpr]) -> EvalValue {
        let bad = EvalValue.scalar(.error(FormulaErrors.value))
        guard (2...6).contains(args.count) else { return bad }
        let tv = scalar(eval(args[0]))
        if case .error(let e) = tv { return .scalar(.error(e)) }
        let textScalars = Array(FormulaEvaluator.text(tv).unicodeScalars)
        guard !textScalars.isEmpty else { return bad }
        let (colDelims, colErr) = splitDelimiters(args[1])
        if let e = colErr { return .scalar(e) }
        var rowDelims: [[Unicode.Scalar]]? = nil
        if args.count >= 3 {
            let (rd, rErr) = splitDelimiters(args[2])
            if let e = rErr { return .scalar(e) }
            rowDelims = rd
        }
        guard colDelims != nil || rowDelims != nil else { return bad }
        var ignoreEmpty = false
        if args.count >= 4, args[3] != .empty {
            let v = scalar(eval(args[3]))
            if case .error(let e) = v { return .scalar(.error(e)) }
            guard let b = bool(v) else { return bad }
            ignoreEmpty = b
        }
        var caseInsensitive = false
        if args.count >= 5, args[4] != .empty {
            let v = scalar(eval(args[4]))
            if case .error(let e) = v { return .scalar(.error(e)) }
            guard let n = number(v), n.isFinite else { return bad }
            let m = n.rounded(.towardZero)
            guard m == 0 || m == 1 else { return bad }
            caseInsensitive = m == 1
        }
        var pad: CellValue = .error(FormulaErrors.na)
        if args.count == 6, args[5] != .empty {
            let v = scalar(eval(args[5]))
            if case .error(let e) = v { return .scalar(.error(e)) }
            pad = v
        }
        let rowStrings: [[Unicode.Scalar]] = rowDelims.map {
            Self.splitSegments(textScalars, by: $0, caseInsensitive: caseInsensitive)
        } ?? [textScalars]
        var rows: [[[Unicode.Scalar]]] = []
        rows.reserveCapacity(rowStrings.count)
        for rs in rowStrings {
            rows.append(colDelims.map {
                Self.splitSegments(rs, by: $0, caseInsensitive: caseInsensitive)
            } ?? [rs])
        }
        if ignoreEmpty {
            rows = rows.map { $0.filter { !$0.isEmpty } }.filter { !$0.isEmpty }
        }
        guard !rows.isEmpty else { return bad }
        let maxCols = rows.map { $0.count }.max() ?? 0
        guard rows.count * maxCols <= Self.maxElementwiseCells else {
            return .scalar(.error(FormulaErrors.calc))
        }
        var out: [[CellValue]] = []
        out.reserveCapacity(rows.count)
        for r in rows {
            var line: [CellValue] = r.map { .string(Self.stringFromScalars($0)) }
            while line.count < maxCols { line.append(pad) }
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
        // M7 lát 28: biến LET chứa lambda thì gọi nó (biến che cả tên hàm trùng tên,
        // như Excel); biến không phải hàm mà bị gọi → #VALUE!.
        if let v = env[name.uppercased()] {
            if case .lambda(let params, let body, let captured) = v {
                return applyLambdaValue(params: params, body: body, captured: captured, argExprs: args)
            }
            return .scalar(.error(FormulaErrors.value))
        }
        if name == "LET" { return letCall(args) }
        if name == "IF", let v = ifArray(args) { return v }
        if let v = callArray(name, args) { return v }
        if let v = callReference(name, args) { return v }
        if name == "LAMBDA" { return lambdaCall(args) }
        // Tên định nghĩa chứa LAMBDA thì gọi được bằng tên (đệ quy qua tên, lát 28).
        if let ex = context.definedNameExpr(name) { return definedNameCall(name, ex, args) }
        return .scalar(callScalar(name, args))
    }

    // MARK: LAMBDA (M7 lát 28, INBOX-MAC #17)

    /// LAMBDA(tham_số…, thân): tham số phải là tên, không trùng nhau (không phân biệt
    /// hoa/thường); ít nhất một đối số (thân). Trả về giá trị hàm chụp môi trường hiện tại.
    private func lambdaCall(_ args: [FormulaExpr]) -> EvalValue {
        guard !args.isEmpty else { return .scalar(.error(FormulaErrors.value)) }
        var params: [String] = []
        var seen = Set<String>()
        for a in args.dropLast() {
            guard case .name(let n) = a else { return .scalar(.error(FormulaErrors.value)) }
            let key = n.uppercased()
            guard !seen.contains(key) else { return .scalar(.error(FormulaErrors.value)) }
            seen.insert(key)
            params.append(key)
        }
        return .lambda(params: params, body: args[args.count - 1], env: env)
    }

    /// Gọi lambda với các biểu thức đối số: đối số tính TRƯỚC ở nơi gọi (môi trường
    /// hiện tại — ví dụ biến LET của nơi gọi), rồi mới gắn vào môi trường đã chụp của
    /// lambda; lỗi scalar trong đối số lan ra; lệch số lượng → #VALUE!; thân tính trong
    /// môi trường đã chụp + tham số đã gắn (phạm vi từ vựng, như Excel). Đệ quy sâu quá
    /// giới hạn engine thì #VALUE!.
    private func applyLambdaValue(params: [String], body: FormulaExpr, captured: [String: EvalValue], argExprs: [FormulaExpr]) -> EvalValue {
        guard params.count == argExprs.count else { return .scalar(.error(FormulaErrors.value)) }
        guard lambdaDepth < Self.maxLambdaDepth else { return .scalar(.error(FormulaErrors.value)) }
        var values: [EvalValue] = []
        values.reserveCapacity(argExprs.count)
        for a in argExprs {
            let v = eval(a)
            if case .scalar(let cv) = v, case .error = cv { return v }
            values.append(v)
        }
        var sub = self
        sub.lambdaDepth += 1
        sub.env = captured
        for (p, v) in zip(params, values) { sub.env[p] = v }
        return sub.eval(body)
    }

    /// Gọi tên định nghĩa: chỉ tính biểu thức đích (không chạy thân) với môi trường
    /// rỗng rồi áp dụng nếu nó là lambda; tên không phải lambda mà bị gọi → #VALUE!.
    /// Vòng tên trong lúc tính biểu thức đích → #REF! (qua nameStack); đệ quy thật
    /// qua tên vẫn chạy vì mỗi lần gọi lại kiểm tra độ sâu lambda riêng.
    private func definedNameCall(_ name: String, _ ex: FormulaExpr, _ args: [FormulaExpr]) -> EvalValue {
        let key = name.uppercased()
        guard !nameStack.contains(key) else { return .scalar(.error(FormulaErrors.ref)) }
        var sub = self
        sub.env = [:]
        sub.nameStack.insert(key)
        let v = sub.eval(ex)
        guard case .lambda(let params, let body, let captured) = v else {
            return .scalar(.error(FormulaErrors.value))
        }
        return applyLambdaValue(params: params, body: body, captured: captured, argExprs: args)
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
            case .lambda: out.append((.error(FormulaErrors.value), true))
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
