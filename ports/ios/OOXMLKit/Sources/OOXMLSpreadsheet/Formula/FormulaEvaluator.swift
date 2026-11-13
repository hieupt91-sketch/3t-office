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
    /// Biểu thức công thức đặt tại ô (M7 lát 37, toán tử tràn `#`): nil nếu ô không
    /// chứa công thức thường (ô hằng, ô trống, ô thuộc công thức mảng CSE).
    func formulaExpr(sheet: String, ref: CellReference) -> FormulaExpr?
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
    /// Vị trí ô chứa công thức thường — chỉ dùng cho toán tử "@" (M7 lát 36);
    /// engine đặt luôn (khác `position` chỉ đặt cho công thức mảng CSE).
    var intersectAnchor: CellReference? = nil
    /// Tên hằng/công thức đang được mở (M7 lát 17): chặn vòng tên A→B→A thành #REF!.
    var nameStack: Set<String> = []
    /// Độ sâu lồng gọi lambda đang chạy (M7 lát 28): chặn đệ quy vô hạn tràn ngăn xếp.
    var lambdaDepth: Int = 0
    /// Độ sâu lồng toán tử tràn "#" đang chạy (M7 lát 37): chuỗi tràn A1#→B1#→…
    /// luôn hữu hạn nhờ sắp topo ở tầng engine, đây chỉ là đai an toàn.
    var spillDepth: Int = 0
    /// Giới hạn của engine (không phải Excel): đệ quy lambda sâu hơn thì #VALUE!.
    private static let maxLambdaDepth = 512
    /// Giới hạn chuỗi tràn lồng nhau (M7 lát 37): sâu hơn thì #VALUE!.
    private static let maxSpillDepth = 128

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
            let inner = eval(x)
            // `--(vùng="a")`, `-vùng`: dấu trừ đơn áp lên từng phần tử của mảng/vùng (như Excel).
            if isMulti(inner), let rows = materialize(inner) {
                return .array(rows.map { $0.map { unaryValue(op, $0) } })
            }
            return .scalar(unaryValue(op, scalar(inner)))
        case .percent(let x):
            let v = scalar(eval(x))
            if case .error = v { return .scalar(v) }
            guard let n = number(v) else { return .scalar(.error(FormulaErrors.value)) }
            return .scalar(.number(n / 100))
        case .intersect(let x):
            return .scalar(intersectValue(eval(x)))
        case .spill(let x):
            return spillValue(x)
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

    private func unaryValue(_ op: String, _ v: CellValue) -> CellValue {
        if case .error = v { return v }
        if op == "+" { return v }
        guard let n = number(v) else { return .error(FormulaErrors.value) }
        return .number(-n)
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
            if r.contains(target) { return context.cellValue(sheet: sh, ref: target) }
            // M7 lát 41: công thức mảng (CSE) trỏ vùng không chứa ô công thức —
            // ánh xạ theo độ lệch so với gốc vùng mảng (như nhánh .array):
            // =A1:B2 đặt tại D1:E2 thì D1←A1, E1←B1, D2←A2, E2←B2.
            // Ngoài vùng sau ánh xạ → #VALUE! như trước.
            if let origin = arrayOrigin {
                let i = pos.row - origin.row, j = pos.column - origin.column
                let t = CellReference(column: r.start.column + j, row: r.start.row + i)
                if i >= 0, j >= 0, r.contains(t) { return context.cellValue(sheet: sh, ref: t) }
            }
            return .error(FormulaErrors.value)
        case .array(let rows):
            if rows.count == 1, rows[0].count == 1 { return rows[0][0] }
            guard let pos = position, let origin = arrayOrigin else { return .error(FormulaErrors.value) }
            let i = pos.row - origin.row, j = pos.column - origin.column
            guard rows.indices.contains(i), rows[i].indices.contains(j) else { return .error(FormulaErrors.value) }
            return rows[i][j]
        }
    }

    /// Ép một giá trị mảng/vùng về một ô theo vị trí ô công thức (toán tử "@",
    /// M7 lát 36, INBOX-MAC #17). Quy tắc Excel:
    /// - scalar giữ nguyên; lambda trần → #VALUE!.
    /// - vùng 1 ô → giá trị ô đó; vùng 1 cột → ô cùng hàng với ô công thức;
    ///   vùng 1 hàng → ô cùng cột; vùng nhiều hàng × nhiều cột → chính ô công
    ///   thức nếu nằm trong vùng; ngoài vùng → #VALUE!.
    /// - mảng hằng/kết quả hàm: 1 ô → giá trị đó; nhiều ô → phần tử góc trên-trái
    ///   (mỏ neo của mảng tràn chính là ô công thức), trừ công thức mảng CSE thì
    ///   lấy theo vị trí từng ô như scalar().
    /// - không có vị trí ô công thức (dùng evaluator trực tiếp): vùng/mảng
    ///   nhiều ô → #VALUE!, như scalar().
    func intersectValue(_ v: EvalValue) -> CellValue {
        switch v {
        case .scalar(let c): return c
        case .lambda: return .error(FormulaErrors.value)
        case .ref(let sh, let r):
            if r.start == r.end { return context.cellValue(sheet: sh, ref: r.start) }
            guard let anchor = intersectAnchor else { return .error(FormulaErrors.value) }
            let target: CellReference
            if r.start.column == r.end.column {
                target = CellReference(column: r.start.column, row: anchor.row)
            } else if r.start.row == r.end.row {
                target = CellReference(column: anchor.column, row: r.start.row)
            } else {
                target = anchor
            }
            guard r.contains(target) else { return .error(FormulaErrors.value) }
            return context.cellValue(sheet: sh, ref: target)
        case .array(let rows):
            if rows.count == 1, rows[0].count == 1 { return rows[0][0] }
            if let pos = position, let origin = arrayOrigin {
                let i = pos.row - origin.row, j = pos.column - origin.column
                guard rows.indices.contains(i), rows[i].indices.contains(j) else { return .error(FormulaErrors.value) }
                return rows[i][j]
            }
            guard intersectAnchor != nil else { return .error(FormulaErrors.value) }
            return rows[0][0]
        }
    }

    /// Toán tử tràn "#" (M7 lát 37, INBOX-MAC #17): `A1#` = toàn bộ vùng tràn của
    /// công thức mảng động neo tại A1. Quy tắc Excel:
    /// - neo phải là một ô duy nhất; vùng nhiều ô, hằng, hàm trần → #VALUE!.
    /// - ô neo không chứa công thức thường (hằng, trống, CSE) → #VALUE!.
    /// - công thức neo trả mảng → lưới đó (lỗi trong lưới đi qua nguyên vẹn);
    ///   trả vùng nhiều ô (ví dụ `=B1:B3`) → lưới vùng đó; trả đơn/lỗi → #VALUE!.
    /// - chuỗi tràn (A1# mà A1 lại chứa B1#...) tính đệ quy qua công thức neo;
    ///   vòng (kể cả tự tham chiếu) đã bị chặn ở tầng engine (sắp topo → #REF!).
    private func spillValue(_ x: FormulaExpr) -> EvalValue {
        let inner = eval(x)
        // Lỗi của chính tham chiếu neo (sheet không còn → #REF!, tên lạ → #NAME?)
        // lan nguyên vẹn như mọi tham chiếu khác.
        if case .scalar(let c) = inner, case .error = c { return inner }
        guard case .ref(let sh, let r) = inner, r.start == r.end,
              let expr = context.formulaExpr(sheet: sh, ref: r.start),
              spillDepth < Self.maxSpillDepth else {
            return .scalar(.error(FormulaErrors.value))
        }
        // Tính lại công thức neo trong phạm vi riêng: "@" bên trong lấy neo làm
        // vị trí ô công thức; biến LET/LAMBDA ngoài không lọt vào.
        var sub = FormulaEvaluator(context: context)
        sub.intersectAnchor = r.start
        sub.spillDepth = spillDepth + 1
        switch sub.eval(expr) {
        case .array(let rows):
            return .array(rows)
        case .ref(let sh2, let r2) where r2.start != r2.end:
            guard let grid = sub.materialize(.ref(sheet: sh2, range: r2)) else {
                return .scalar(.error(FormulaErrors.value))
            }
            return .array(grid)
        default:
            return .scalar(.error(FormulaErrors.value))
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
        case "MAP": return mapArray(args)
        case "BYROW": return byRowArray(args)
        case "BYCOL": return byColArray(args)
        case "SCAN": return scanArray(args)
        case "REDUCE": return reduceArray(args)
        case "MAKEARRAY": return makeArray(args)
        case "MMULT": return mmult(args)
        case "MUNIT": return munit(args)
        case "FREQUENCY": return frequency(args)
        case "EXPAND": return expandArray(args)
        case "GROUPBY": return groupBy(args)
        case "PIVOTBY": return pivotBy(args)
        case "ARRAYTOTEXT": return arrayToText(args)
        case "VALUETOTEXT": return valueToText(args)
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

    // MARK: Hàm ma trận — MMULT / MUNIT (M7 lát 34, INBOX-MAC #17)

    /// MMULT(mảng1, mảng2): tích ma trận m×n · n×p = m×p. Số cột mảng1 phải
    /// bằng số hàng mảng2, nếu không → #VALUE!; ô rỗng hoặc chuỗi (kể cả
    /// chuỗi số) → #VALUE!; logic TRUE→1, FALSE→0; ô lỗi lan truyền nguyên
    /// vẹn; kết quả vượt giới hạn phần tử → #CALC!, tràn số → #NUM!.
    private func mmult(_ args: [FormulaExpr]) -> EvalValue {
        guard args.count == 2 else { return .scalar(.error(FormulaErrors.value)) }
        guard let a = materialize(eval(args[0])), let b = materialize(eval(args[1])),
              !a.isEmpty, !b.isEmpty,
              let aCols = a.first?.count, aCols > 0,
              let bCols = b.first?.count, bCols > 0,
              a.allSatisfy({ $0.count == aCols }), b.allSatisfy({ $0.count == bCols }) else {
            return .scalar(.error(FormulaErrors.value))
        }
        let m = a.count, n = aCols, p = bCols
        guard n == b.count else { return .scalar(.error(FormulaErrors.value)) }
        guard m * p <= Self.maxElementwiseCells else { return .scalar(.error(FormulaErrors.calc)) }
        // Ô lỗi lan truyền nguyên vẹn (quét theo thứ tự hàng rồi cột).
        for grid in [a, b] {
            for line in grid {
                for c in line {
                    if case .error(let e) = c { return .scalar(.error(e)) }
                }
            }
        }
        func numbers(_ grid: [[CellValue]]) -> [[Double]]? {
            var out: [[Double]] = []
            out.reserveCapacity(grid.count)
            for line in grid {
                var row: [Double] = []
                row.reserveCapacity(line.count)
                for c in line {
                    switch c {
                    case .number(let d): row.append(d)
                    case .bool(let b): row.append(b ? 1 : 0)
                    default: return nil
                    }
                }
                out.append(row)
            }
            return out
        }
        guard let an = numbers(a), let bn = numbers(b) else {
            return .scalar(.error(FormulaErrors.value))
        }
        var out: [[CellValue]] = []
        out.reserveCapacity(m)
        for i in 0..<m {
            var line: [CellValue] = []
            line.reserveCapacity(p)
            for j in 0..<p {
                var sum = 0.0
                for k in 0..<n { sum += an[i][k] * bn[k][j] }
                guard sum.isFinite else { return .scalar(.error(FormulaErrors.num)) }
                line.append(.number(sum))
            }
            out.append(line)
        }
        return .array(out)
    }

    /// MUNIT(cấp): ma trận đơn vị cấp n. Cấp cắt phần lẻ về nguyên như
    /// SEQUENCE, phải ≥ 1 nếu không → #VALUE!; đối số không phải số
    /// → #VALUE!; lỗi trong đối số lan truyền nguyên vẹn; cấp quá lớn
    /// (n² vượt giới hạn phần tử) → #CALC!.
    private func munit(_ args: [FormulaExpr]) -> EvalValue {
        guard args.count == 1 else { return .scalar(.error(FormulaErrors.value)) }
        let v = scalar(eval(args[0]))
        if case .error(let e) = v { return .scalar(.error(e)) }
        guard let d = number(v), d.isFinite else { return .scalar(.error(FormulaErrors.value)) }
        let n0 = d.rounded(.towardZero)
        guard n0 >= 1 else { return .scalar(.error(FormulaErrors.value)) }
        guard n0 <= Double(Self.maxElementwiseCells),
              n0 * n0 <= Double(Self.maxElementwiseCells) else {
            return .scalar(.error(FormulaErrors.calc))
        }
        let n = Int(n0)
        var out: [[CellValue]] = []
        out.reserveCapacity(n)
        for i in 0..<n {
            var line: [CellValue] = Array(repeating: .number(0), count: n)
            line[i] = .number(1)
            out.append(line)
        }
        return .array(out)
    }

    /// FREQUENCY(dữ_liệu, khoảng): phân phối tần suất — mảng dọc có số
    /// phần tử = số khoảng + 1 (phần tử cuối đếm các giá trị vượt khoảng
    /// cao nhất). Khoảng i đếm các giá trị ≤ khoảng[i], trừ các giá trị
    /// đã đếm ở khoảng trước (Microsoft Learn, WorksheetFunction.Frequency:
    /// "counts ... up to and including the bin value, but excludes the
    /// values already counted in the previous bins"); khoảng phải tăng
    /// dần, nếu không kết quả sai lệch như Excel. Ô rỗng/chữ/logic trong
    /// cả hai đối số bị bỏ qua (logic trong hằng mảng cũng bị bỏ qua như
    /// họ SUMIFS — không phân biệt được nguồn sau khi trải lưới);
    /// không có giá trị số nào trong dữ liệu → toàn 0; không có khoảng
    /// nào → mảng 1 phần tử bằng số giá trị số trong dữ liệu. Ô lỗi lan
    /// truyền nguyên vẹn; sai số lượng đối số hoặc vùng vượt giới hạn →
    /// #VALUE!; kết quả vượt giới hạn phần tử → #CALC!. Đối chiếu COM
    /// thật là việc của Windows ở cổng M1 (#11).
    private func frequency(_ args: [FormulaExpr]) -> EvalValue {
        guard args.count == 2 else { return .scalar(.error(FormulaErrors.value)) }
        guard let data = materialize(eval(args[0])),
              let binsGrid = materialize(eval(args[1])) else {
            return .scalar(.error(FormulaErrors.value))
        }
        var values: [Double] = []
        for line in data {
            for c in line {
                switch c {
                case .number(let d): values.append(d)
                case .error(let e): return .scalar(.error(e))
                default: break
                }
            }
        }
        var bins: [Double] = []
        for line in binsGrid {
            for c in line {
                switch c {
                case .number(let d): bins.append(d)
                case .error(let e): return .scalar(.error(e))
                default: break
                }
            }
        }
        guard bins.count + 1 <= Self.maxElementwiseCells else {
            return .scalar(.error(FormulaErrors.calc))
        }
        values.sort()
        var counts: [Double] = []
        counts.reserveCapacity(bins.count + 1)
        var prev = 0
        for b in bins {
            // Số giá trị ≤ b (tìm kiếm nhị phân trên mảng đã sắp).
            var lo = 0, hi = values.count
            while lo < hi {
                let mid = (lo + hi) / 2
                if values[mid] <= b { lo = mid + 1 } else { hi = mid }
            }
            counts.append(Double(lo - prev))
            prev = lo
        }
        counts.append(Double(values.count - prev))
        return .array(counts.map { [.number($0)] })
    }

    /// EXPAND(mảng, hàng, [cột], [đệm]): mở rộng mảng tới hàng×cột, ô mới
    /// đệm bằng đệm (mặc định #N/A); cột bỏ trống giữ nguyên số cột gốc.
    /// Hàng/cột phải ≥ kích thước hiện tại, nếu không → #VALUE!; cắt phần
    /// lẻ về nguyên như SEQUENCE; đối số không phải số → #VALUE!; lỗi
    /// trong đối số lan truyền nguyên vẹn; ô nguồn (kể cả ô lỗi, ô rỗng)
    /// đi qua nguyên vẹn; kết quả vượt giới hạn phần tử → #CALC!.
    private func expandArray(_ args: [FormulaExpr]) -> EvalValue {
        guard (2...4).contains(args.count) else { return .scalar(.error(FormulaErrors.value)) }
        guard let grid = materialize(eval(args[0])), !grid.isEmpty,
              let srcCols = grid.first?.count, srcCols > 0,
              grid.allSatisfy({ $0.count == srcCols }) else {
            return .scalar(.error(FormulaErrors.value))
        }
        let srcRows = grid.count
        let rv = scalar(eval(args[1]))
        if case .error(let e) = rv { return .scalar(.error(e)) }
        guard let rows = intFromScalar(rv), rows >= 1 else {
            return .scalar(.error(FormulaErrors.value))
        }
        var cols = srcCols
        if args.count >= 3, args[2] != .empty {
            let cv = scalar(eval(args[2]))
            if case .error(let e) = cv { return .scalar(.error(e)) }
            guard let c = intFromScalar(cv), c >= 1 else {
                return .scalar(.error(FormulaErrors.value))
            }
            cols = c
        }
        var pad: CellValue = .error(FormulaErrors.na)
        if args.count == 4, args[3] != .empty {
            let pv = scalar(eval(args[3]))
            if case .error(let e) = pv { return .scalar(.error(e)) }
            pad = pv
        }
        guard rows >= srcRows, cols >= srcCols else {
            return .scalar(.error(FormulaErrors.value))
        }
        guard Double(rows) * Double(cols) <= Double(Self.maxElementwiseCells) else {
            return .scalar(.error(FormulaErrors.calc))
        }
        var out: [[CellValue]] = []
        out.reserveCapacity(rows)
        for i in 0..<rows {
            var line: [CellValue] = []
            line.reserveCapacity(cols)
            for j in 0..<cols {
                line.append(i < srcRows && j < srcCols ? grid[i][j] : pad)
            }
            out.append(line)
        }
        return .array(out)
    }

    // MARK: Hàm mảng động — GROUPBY (M7 lát 38, INBOX-MAC #17)

    /// Hàm tổng hợp của GROUPBY: tên hàm có sẵn (eta-reduced lambda như SUM)
    /// hoặc lambda 1 tham số nhận cột giá trị của nhóm.
    private enum GroupAggregate {
        case builtin(String)
        case lambda(params: [String], body: FormulaExpr, captured: [String: EvalValue])
    }

    /// Tên hàm tổng hợp có sẵn của GROUPBY (Microsoft Support, "GROUPBY
    /// function"): tên viết hoa → tên chuẩn. STDEV/VAR chấp nhận cả dạng rút
    /// gọn (STDEV = STDEV.S, VAR = VAR.S).
    private static let groupAggregates: [String: String] = [
        "SUM": "SUM", "AVERAGE": "AVERAGE", "COUNT": "COUNT", "COUNTA": "COUNTA",
        "MAX": "MAX", "MIN": "MIN", "PRODUCT": "PRODUCT", "MEDIAN": "MEDIAN",
        "PERCENTOF": "PERCENTOF",
        "STDEV": "STDEV", "STDEV.S": "STDEV", "STDEVP": "STDEVP", "STDEV.P": "STDEVP",
        "VAR": "VAR", "VAR.S": "VAR", "VARP": "VARP", "VAR.P": "VARP",
    ]

    /// Khóa nhóm của GROUPBY: như uniqueKey nhưng chuỗi PHÂN BIỆT hoa/thường
    /// (Excel: "Cable" và "cable" là hai nhóm khác nhau — khác UNIQUE).
    private static func groupKey(_ v: CellValue) -> String {
        switch v {
        case .empty: return "E"
        case .number(let d): return "N\(d == 0 ? 0 : d)"
        case .string(let s): return "S\(s)"
        case .bool(let b): return "B\(b)"
        case .error(let e): return "X\(e)"
        }
    }

    private static func sampleStdev(_ xs: [Double]) -> Double {
        let mean = xs.reduce(0, +) / Double(xs.count)
        let ss = xs.reduce(0) { $0 + ($1 - mean) * ($1 - mean) }
        return (ss / Double(xs.count - 1)).squareRoot()
    }

    private static func populationStdev(_ xs: [Double]) -> Double {
        let mean = xs.reduce(0, +) / Double(xs.count)
        let ss = xs.reduce(0) { $0 + ($1 - mean) * ($1 - mean) }
        return (ss / Double(xs.count)).squareRoot()
    }

    /// Tổng hợp một cột giá trị của GROUPBY (ngữ nghĩa như aggregate() với
    /// đối số từ vùng: chữ/logic/rỗng bị bỏ qua, trừ COUNT/COUNTA; lỗi trong
    /// giá trị trả về như ô lỗi để tầng trên giữ nguyên trong lưới). PERCENTOF
    /// không xử lý ở đây (cần tổng chung, xem groupBy).
    private static func groupAggregate(_ fn: String, _ vals: [CellValue]) -> CellValue {
        var nums: [Double] = []
        var nonEmpty = 0
        var firstError: CellValue? = nil
        for v in vals {
            switch v {
            case .error:
                if firstError == nil { firstError = v }
                nonEmpty += 1
            case .number(let d): nums.append(d); nonEmpty += 1
            case .bool, .string: nonEmpty += 1
            case .empty: break
            }
        }
        switch fn {
        case "SUM":
            if let e = firstError { return e }
            return .number(nums.reduce(0, +))
        case "AVERAGE":
            if let e = firstError { return e }
            guard !nums.isEmpty else { return .error(FormulaErrors.div0) }
            return .number(nums.reduce(0, +) / Double(nums.count))
        case "COUNT": return .number(Double(nums.count))
        case "COUNTA": return .number(Double(nonEmpty))
        case "MAX":
            if let e = firstError { return e }
            return .number(nums.max() ?? 0)
        case "MIN":
            if let e = firstError { return e }
            return .number(nums.min() ?? 0)
        case "PRODUCT":
            if let e = firstError { return e }
            return .number(nums.reduce(1, *))
        case "MEDIAN":
            if let e = firstError { return e }
            guard !nums.isEmpty else { return .error(FormulaErrors.num) }
            let s = nums.sorted()
            let m = s.count / 2
            return .number(s.count % 2 == 1 ? s[m] : (s[m - 1] + s[m]) / 2)
        case "STDEV", "STDEV.S":
            if let e = firstError { return e }
            guard nums.count >= 2 else { return .error(FormulaErrors.div0) }
            return .number(Self.sampleStdev(nums))
        case "STDEVP", "STDEV.P":
            if let e = firstError { return e }
            guard !nums.isEmpty else { return .error(FormulaErrors.div0) }
            return .number(Self.populationStdev(nums))
        case "VAR", "VAR.S":
            if let e = firstError { return e }
            guard nums.count >= 2 else { return .error(FormulaErrors.div0) }
            let s = Self.sampleStdev(nums); return .number(s * s)
        case "VARP", "VAR.P":
            if let e = firstError { return e }
            guard !nums.isEmpty else { return .error(FormulaErrors.div0) }
            let s = Self.populationStdev(nums); return .number(s * s)
        default: return .error(FormulaErrors.value)
        }
    }

    /// Tổng hợp một cột giá trị của một nhóm/tổng trên một tập hàng (dùng cho
    /// GROUPBY). PERCENTOF tính như SUM ở bước này, chia cho tổng chung sau.
    private func groupAggregateColumn(_ agg: GroupAggregate, _ valGrid: [[CellValue]],
                                      _ col: Int, _ rows: [Int]) -> CellValue {
        switch agg {
        case .builtin(let fn):
            let vals = rows.map { valGrid[$0][col] }
            return Self.groupAggregate(fn == "PERCENTOF" ? "SUM" : fn, vals)
        case .lambda(let p, let b, let c):
            let column = rows.map { [valGrid[$0][col]] }
            let r = applyLambdaValues(params: p, body: b, captured: c, values: [.array(column)])
            guard let cell = singleCellValue(r) else { return .error(FormulaErrors.value) }
            return cell
        }
    }

    /// Phân tích đối số function của GROUPBY/PIVOTBY (M7 lát 39, INBOX-MAC #17):
    /// tên trần, biến LET/tên định nghĩa chứa lambda, hoặc biểu thức LAMBDA.
    /// Trả (nil, lỗi) khi lỗi cần lan truyền nguyên vẹn (tên lạ → #NAME? như
    /// Excel, qua eval); (nil, nil) = đối số không dùng được → #VALUE!.
    private func parseGroupAggregate(_ expr: FormulaExpr) -> (agg: GroupAggregate?, error: CellValue?) {
        if case .name(let n) = expr {
            let key = n.uppercased()
            if let v = env[key] {
                guard case .lambda(let p, let b, let c) = v else { return (nil, nil) }
                return (.lambda(params: p, body: b, captured: c), nil)
            } else if let canon = Self.groupAggregates[key] {
                return (.builtin(canon), nil)
            } else {
                let v = eval(expr)
                if case .scalar(let c) = v, case .error = c { return (nil, c) }
                guard case .lambda(let p, let b, let c) = v else { return (nil, nil) }
                return (.lambda(params: p, body: b, captured: c), nil)
            }
        } else {
            let (lam, lamErr) = lambdaFromArg(expr)
            if let e = lamErr { return (nil, e) }
            guard let lam, lam.params.count == 1 else { return (nil, nil) }
            return (.lambda(params: lam.params, body: lam.body, captured: lam.captured), nil)
        }
    }

    /// GROUPBY(row_fields, values, function, [field_headers], [total_depth],
    /// [sort_order], [filter_array], [field_relationship]) — tóm tắt dữ liệu theo
    /// nhóm (ngữ nghĩa theo Microsoft Support "GROUPBY function" + Ablebits/
    /// Exceljet; đối chiếu COM thật là việc của Windows ở cổng M1 #11):
    /// - function: tên hàm tổng hợp trần (SUM, AVERAGE, COUNT, COUNTA, MAX, MIN,
    ///   PRODUCT, MEDIAN, PERCENTOF, STDEV/STDEV.S, STDEVP/STDEV.P, VAR/VAR.S,
    ///   VARP/VAR.P) hoặc LAMBDA 1 tham số nhận cột giá trị của nhóm. Tên lạ
    ///   → #NAME? như Excel; vector nhiều hàm (HSTACK(SUM, AVERAGE)) → #VALUE!
    ///   (lát sau — cần lambda sống được trong mảng).
    /// - field_headers: bỏ trống = tự đoán (giá trị đầu là chữ và giá trị thứ
    ///   hai là số → có tiêu đề; tiêu đề chỉ hiện khi có ≥ 2 cột khóa); 0 =
    ///   không tiêu đề; 1 = có, không hiện; 2 = không có, sinh "Row Field i"/
    ///   "Value j"; 3 = có, hiện.
    /// - total_depth: bỏ trống = 1 (tổng chung cuối); 0 = không tổng; 1 = tổng
    ///   chung cuối ("Total"); -1 = tổng chung đầu; 2/-2 = thêm tổng phụ sau/
    ///   trước mỗi nhóm tiền tố (cần ≥ 2 cột khóa, không thì #VALUE!; cột khóa
    ///   sâu hơn để trống). Độ sâu |n| > 2 → #VALUE! (lát sau).
    /// - sort_order: bỏ trống = tăng dần theo các cột khóa; số = cột kết quả
    ///   (khóa rồi giá trị), âm = giảm dần; mảng 1 chiều = sắp nhiều cột khóa.
    /// - filter_array: mảng logic 1 chiều dài bằng số hàng của row_fields
    ///   (kể cả hàng tiêu đề nếu có — cờ của hàng tiêu đề bị bỏ qua); rỗng =
    ///   FALSE; lỗi lan ra; sai hình/dài → #VALUE!; lọc hết hàng → #CALC!.
    /// - field_relationship: chỉ nhận 0/bỏ trống (Hierarchy); 1 (Table) →
    ///   #VALUE! (lát sau).
    /// Nhóm theo đúng giá trị khóa (chuỗi phân biệt hoa/thường); khóa lỗi giữ
    /// nguyên ô lỗi trong kết quả; lỗi trong cột giá trị chỉ nằm ở ô tổng hợp
    /// của nhóm đó (như MAP giữ lỗi theo ô), không phá cả công thức; lệch số
    /// hàng giữa row_fields và values → #VALUE!.
    private func groupBy(_ args: [FormulaExpr]) -> EvalValue {
        let bad = EvalValue.scalar(.error(FormulaErrors.value))
        guard (3...8).contains(args.count) else { return bad }
        guard let keyGrid = materialize(eval(args[0])), !keyGrid.isEmpty,
              let keyCols = keyGrid.first?.count, keyCols > 0,
              keyGrid.allSatisfy({ $0.count == keyCols }) else { return bad }
        guard let valGrid = materialize(eval(args[1])), !valGrid.isEmpty,
              let valCols = valGrid.first?.count, valCols > 0,
              valGrid.allSatisfy({ $0.count == valCols }) else { return bad }
        guard keyGrid.count == valGrid.count else { return bad }

        // Đối số function: tên trần, biến LET/tên định nghĩa chứa lambda, hoặc LAMBDA.
        let (aggOpt, aggErr) = parseGroupAggregate(args[2])
        if let e = aggErr { return .scalar(e) }
        guard let agg = aggOpt else { return bad }

        // field_headers.
        var hasHeaders = false, showHeaders = false
        if args.count >= 4, args[3] != .empty {
            let v = scalar(eval(args[3]))
            if case .error(let e) = v { return .scalar(.error(e)) }
            guard let n = number(v), n.isFinite, n == n.rounded(.towardZero),
                  (0...3).contains(Int(n)) else { return bad }
            switch Int(n) {
            case 1: hasHeaders = true
            case 2: showHeaders = true
            case 3: hasHeaders = true; showHeaders = true
            default: break
            }
        } else if valGrid.count >= 2, case .string = valGrid[0][0], case .number = valGrid[1][0] {
            hasHeaders = true
            showHeaders = keyCols >= 2
        }

        // total_depth.
        var totalDepth = 1
        if args.count >= 5, args[4] != .empty {
            let v = scalar(eval(args[4]))
            if case .error(let e) = v { return .scalar(.error(e)) }
            guard let n = number(v), n.isFinite, n == n.rounded(.towardZero),
                  [-2, -1, 0, 1, 2].contains(Int(n)) else { return bad }
            totalDepth = Int(n)
        }
        if abs(totalDepth) == 2, keyCols < 2 { return bad }

        // sort_order.
        var sortKeys: [(col: Int, ascending: Bool)] = []
        if args.count >= 6, args[5] != .empty {
            guard let sg = materialize(eval(args[5])), !sg.isEmpty else { return bad }
            let flat: [CellValue]
            if sg.count == 1 { flat = sg[0] }
            else if sg[0].count == 1 { flat = sg.map { $0[0] } }
            else { return bad }
            guard !flat.isEmpty else { return bad }
            let totalCols = keyCols + valCols
            for c in flat {
                if case .error(let e) = c { return .scalar(.error(e)) }
                guard let n = number(c), n.isFinite, n == n.rounded(.towardZero),
                      n != 0, abs(n) <= Double(totalCols) else { return bad }
                let col = Int(abs(n))
                if flat.count > 1, col > keyCols { return bad }
                sortKeys.append((col: col - 1, ascending: n > 0))
            }
        } else {
            sortKeys = (0..<keyCols).map { ($0, true) }
        }

        // field_relationship (chỉ Hierarchy).
        if args.count == 8, args[7] != .empty {
            let v = scalar(eval(args[7]))
            if case .error(let e) = v { return .scalar(.error(e)) }
            guard let n = number(v), n == 0 else { return bad }
        }

        // Dữ liệu (bỏ hàng tiêu đề nếu có) + filter.
        let dataStart = hasHeaders ? 1 : 0
        guard keyGrid.count > dataStart else { return .scalar(.error(FormulaErrors.calc)) }
        let dataRows = keyGrid.count - dataStart
        var rowFlags = [Bool](repeating: true, count: dataRows)
        if args.count >= 7, args[6] != .empty {
            guard let fg = materialize(eval(args[6])), !fg.isEmpty else { return bad }
            let flags: [CellValue]
            if fg.count == 1 { flags = fg[0] }
            else if fg[0].count == 1 { flags = fg.map { $0[0] } }
            else { return bad }
            guard flags.count == keyGrid.count else { return bad }
            for i in 0..<dataRows {
                switch flags[dataStart + i] {
                case .bool(let b): rowFlags[i] = b
                case .empty: rowFlags[i] = false
                case .error(let e): return .scalar(.error(e))
                default: return bad
                }
            }
        }

        // Nhóm theo khóa (giữ thứ tự xuất hiện đầu tiên).
        var groupKeys: [[CellValue]] = []
        var groupRows: [[Int]] = []
        var groupIndex: [String: Int] = [:]
        for i in 0..<dataRows where rowFlags[i] {
            let r = dataStart + i
            let sig = keyGrid[r].map { Self.groupKey($0) }.joined(separator: "\u{1F}")
            if let gi = groupIndex[sig] {
                groupRows[gi].append(r)
            } else {
                groupIndex[sig] = groupKeys.count
                groupKeys.append(keyGrid[r])
                groupRows.append([r])
            }
        }
        guard !groupKeys.isEmpty else { return .scalar(.error(FormulaErrors.calc)) }
        let allRows = groupRows.flatMap { $0 }

        // Tổng hợp từng nhóm.
        var groupOut: [[CellValue]] = []
        groupOut.reserveCapacity(groupKeys.count)
        for g in groupKeys.indices {
            var line = groupKeys[g]
            for j in 0..<valCols {
                line.append(groupAggregateColumn(agg, valGrid, j, groupRows[g]))
            }
            groupOut.append(line)
        }

        // PERCENTOF: chia mỗi tổng nhóm cho tổng chung của cột đó (lỗi/tổng 0
        // → ô lỗi trong cột, không phá cả công thức).
        if case .builtin("PERCENTOF") = agg {
            for j in 0..<valCols {
                let grand = groupAggregateColumn(agg, valGrid, j, allRows)
                if case .error(let e) = grand {
                    for g in groupOut.indices { groupOut[g][keyCols + j] = .error(e) }
                    continue
                }
                guard case .number(let total) = grand, total != 0 else {
                    for g in groupOut.indices {
                        groupOut[g][keyCols + j] = .error(FormulaErrors.div0)
                    }
                    continue
                }
                for g in groupOut.indices {
                    if case .number(let s) = groupOut[g][keyCols + j] {
                        groupOut[g][keyCols + j] = .number(s / total)
                    }
                }
            }
        }

        // Sắp xếp các nhóm (ổn định); tổng/tổng phụ không tham gia sắp.
        let order = groupOut.indices.sorted { a, b in
            for (col, asc) in sortKeys {
                let c = Self.compareSortKey(groupOut[a][col], groupOut[b][col], ascending: asc)
                if c != 0 { return c < 0 }
            }
            return a < b
        }
        let sortedOut = order.map { groupOut[$0] }
        let sortedRows = order.map { groupRows[$0] }

        // Hàng tổng chung (chỉ tính khi cần).
        var grandRow: [CellValue] = []
        if totalDepth != 0 {
            grandRow = [.string("Total")] + [CellValue](repeating: .empty, count: keyCols - 1)
            for j in 0..<valCols {
                if case .builtin("PERCENTOF") = agg {
                    grandRow.append(.number(1))
                } else {
                    grandRow.append(groupAggregateColumn(agg, valGrid, j, allRows))
                }
            }
        }

        // Lắp kết quả: tiêu đề, tổng đầu/cuối, nhóm + tổng phụ.
        var out: [[CellValue]] = []
        if showHeaders {
            if hasHeaders {
                out.append(keyGrid[0] + valGrid[0])
            } else {
                out.append((1...keyCols).map { CellValue.string("Row Field \($0)") }
                    + (1...valCols).map { CellValue.string("Value \($0)") })
            }
        }
        if totalDepth < 0 { out.append(grandRow) }
        if abs(totalDepth) == 2 {
            // Tổng phụ sau (2) / trước (-2) mỗi khối cùng tiền tố khóa.
            var i = 0
            while i < sortedOut.count {
                var k = i + 1
                while k < sortedOut.count,
                      sortedOut[k].prefix(keyCols - 1).map({ Self.groupKey($0) })
                        == sortedOut[i].prefix(keyCols - 1).map({ Self.groupKey($0) }) {
                    k += 1
                }
                var subRow: [CellValue] = Array(sortedOut[i].prefix(keyCols - 1))
                subRow.append(.empty)
                let blockRows = sortedRows[i..<k].flatMap { $0 }
                for j in 0..<valCols {
                    if case .builtin("PERCENTOF") = agg {
                        var sum = 0.0
                        var err: CellValue? = nil
                        for row in sortedOut[i..<k] {
                            switch row[keyCols + j] {
                            case .number(let d): sum += d
                            case .error(let e): if err == nil { err = .error(e) }
                            default: break
                            }
                        }
                        subRow.append(err ?? .number(sum))
                    } else {
                        subRow.append(groupAggregateColumn(agg, valGrid, j, blockRows))
                    }
                }
                if totalDepth == -2 { out.append(subRow) }
                out.append(contentsOf: sortedOut[i..<k])
                if totalDepth == 2 { out.append(subRow) }
                i = k
            }
        } else {
            out.append(contentsOf: sortedOut)
        }
        if totalDepth > 0 { out.append(grandRow) }
        guard out.count * (keyCols + valCols) <= Self.maxElementwiseCells else {
            return .scalar(.error(FormulaErrors.calc))
        }
        return .array(out)
    }

    /// PIVOTBY(row_fields, col_fields, values, [function], [field_headers],
    /// [row_total_depth], [row_sort_order], [col_total_depth], [col_sort_order],
    /// [filter_array], [relative_to]) — bảng tổng hợp 2 chiều (ngữ nghĩa theo
    /// Microsoft Support "PIVOTBY function"; đối chiếu COM thật là việc của
    /// Windows ở cổng M1 #11). Dùng chung máy tổng hợp với GROUPBY (lát 38):
    /// cùng tập hàm (SUM…VARP, PERCENTOF, LAMBDA 1 tham số), cùng field_headers
    /// 0/1/2/3 + tự đoán, cùng filter_array, cùng quy tắc lỗi theo ô.
    /// - function bỏ trống = SUM. Tên lạ → #NAME? như Excel.
    /// - row_total_depth / col_total_depth: 0 = không tổng; ±1 = tổng chung
    ///   (cuối/đầu); ±2 = thêm tổng phụ sau/trước mỗi khối tiền tố (cần ≥ 2 cột
    ///   khóa trên trục đó, không thì #VALUE!); |n| > 2 → #VALUE!. Mặc định 1/1.
    /// - row_sort_order / col_sort_order: bỏ trống = tăng dần theo các cột khóa
    ///   của trục; số = cột khóa (âm = giảm dần); mảng 1 chiều = sắp nhiều cột
    ///   khóa; số ngoài phạm vi cột khóa → #VALUE!.
    /// - filter_array: như GROUPBY (dài bằng số hàng của row_fields, kể cả hàng
    ///   tiêu đề nếu có; lọc hết hàng → #CALC!).
    /// - relative_to: chỉ có nghĩa với PERCENTOF: 0/bỏ trống = theo tổng chung,
    ///   1 = theo tổng hàng, 2 = theo tổng cột; khác → #VALUE!; hàm khác bỏ qua.
    /// Bố cục kết quả (tự định nghĩa, ghi rõ để đối chiếu COM sau):
    /// - Cột: [cột khóa hàng] + [mỗi nhóm cột × mỗi cột giá trị] + [tổng phụ cột
    ///   (nếu |col_total_depth| = 2)] + [cột tổng chung (nếu col_total_depth ≠ 0)].
    /// - Hàng: [hàng tiêu đề (nếu hiện)] + [mỗi nhóm hàng] + [hàng tổng phụ
    ///   (nếu |row_total_depth| = 2)] + [hàng tổng chung (nếu row_total_depth ≠ 0)].
    /// - Hàng tiêu đề (khi hiện): colCols hàng mức khóa cột (ô góc chỉ ghi tên
    ///   trường hàng ở hàng mức đầu, các mức sau để trống; mỗi nhóm cột ghi giá
    ///   trị khóa mức đó ở ô giá trị đầu, các ô giá trị còn lại để trống) + 1 hàng
    ///   tên giá trị (ô góc = tên trường hàng, mỗi nhóm cột lặp tên cột giá trị,
    ///   cột tổng/tổng phụ = "Total").
    /// - Hàng tổng chung: "Total" ở cột khóa hàng đầu, trống ở các cột khóa còn
    ///   lại. Cột tổng chung: tổng theo hàng. Góc tổng chung = tổng toàn bộ.
    /// - Lát này chưa hỗ trợ row_fields/col_fields rỗng (cần ít nhất 1 cột khóa
    ///   mỗi trục) — trả #VALUE!.
    private func pivotBy(_ args: [FormulaExpr]) -> EvalValue {
        let bad = EvalValue.scalar(.error(FormulaErrors.value))
        guard (3...11).contains(args.count) else { return bad }
        guard args[0] != .empty, args[1] != .empty else { return bad }
        guard let rowGrid = materialize(eval(args[0])), !rowGrid.isEmpty,
              let rowCols = rowGrid.first?.count, rowCols > 0,
              rowGrid.allSatisfy({ $0.count == rowCols }) else { return bad }
        guard let colGrid = materialize(eval(args[1])), !colGrid.isEmpty,
              let colCols = colGrid.first?.count, colCols > 0,
              colGrid.allSatisfy({ $0.count == colCols }) else { return bad }
        guard let valGrid = materialize(eval(args[2])), !valGrid.isEmpty,
              let valCols = valGrid.first?.count, valCols > 0,
              valGrid.allSatisfy({ $0.count == valCols }) else { return bad }
        guard rowGrid.count == colGrid.count, rowGrid.count == valGrid.count else { return bad }

        // function: bỏ trống = SUM.
        let agg: GroupAggregate
        if args.count >= 4, args[3] != .empty {
            let (aggOpt, aggErr) = parseGroupAggregate(args[3])
            if let e = aggErr { return .scalar(e) }
            guard let aggOpt else { return bad }
            agg = aggOpt
        } else {
            agg = .builtin("SUM")
        }

        // field_headers (như GROUPBY, tự đoán trên valGrid; chỉ hiện khi ≥ 2 cột khóa).
        var hasHeaders = false, showHeaders = false
        if args.count >= 5, args[4] != .empty {
            let v = scalar(eval(args[4]))
            if case .error(let e) = v { return .scalar(.error(e)) }
            guard let n = number(v), n.isFinite, n == n.rounded(.towardZero),
                  (0...3).contains(Int(n)) else { return bad }
            switch Int(n) {
            case 1: hasHeaders = true
            case 2: showHeaders = true
            case 3: hasHeaders = true; showHeaders = true
            default: break
            }
        } else if valGrid.count >= 2, case .string = valGrid[0][0], case .number = valGrid[1][0] {
            hasHeaders = true
            showHeaders = rowCols >= 2 || colCols >= 2
        }

        // row_total_depth / col_total_depth (mặc định 1).
        var rowDepth = 1
        if args.count >= 6, args[5] != .empty {
            let v = scalar(eval(args[5]))
            if case .error(let e) = v { return .scalar(.error(e)) }
            guard let n = number(v), n.isFinite, n == n.rounded(.towardZero),
                  [-2, -1, 0, 1, 2].contains(Int(n)) else { return bad }
            rowDepth = Int(n)
        }
        if abs(rowDepth) == 2, rowCols < 2 { return bad }
        var colDepth = 1
        if args.count >= 8, args[7] != .empty {
            let v = scalar(eval(args[7]))
            if case .error(let e) = v { return .scalar(.error(e)) }
            guard let n = number(v), n.isFinite, n == n.rounded(.towardZero),
                  [-2, -1, 0, 1, 2].contains(Int(n)) else { return bad }
            colDepth = Int(n)
        }
        if abs(colDepth) == 2, colCols < 2 { return bad }

        // sort_order cho một trục: số = cột khóa (âm = giảm dần), mảng 1 chiều
        // = sắp nhiều cột khóa; bỏ trống = tăng dần theo mọi cột khóa.
        func parseSort(_ idx: Int, _ keyCols: Int) -> (keys: [(col: Int, ascending: Bool)]?, error: CellValue?) {
            if args.count <= idx || args[idx] == .empty {
                return ((0..<keyCols).map { ($0, true) }, nil)
            }
            guard let sg = materialize(eval(args[idx])), !sg.isEmpty else { return (nil, nil) }
            let flat: [CellValue]
            if sg.count == 1 { flat = sg[0] }
            else if sg[0].count == 1 { flat = sg.map { $0[0] } }
            else { return (nil, nil) }
            guard !flat.isEmpty else { return (nil, nil) }
            var keys: [(col: Int, ascending: Bool)] = []
            for c in flat {
                if case .error(let e) = c { return (nil, .error(e)) }
                guard let n = number(c), n.isFinite, n == n.rounded(.towardZero),
                      n != 0, abs(n) <= Double(keyCols) else { return (nil, nil) }
                keys.append((col: Int(abs(n)) - 1, ascending: n > 0))
            }
            return (keys, nil)
        }
        let (rowSort, rowSortErr) = parseSort(6, rowCols)
        if let e = rowSortErr { return .scalar(e) }
        guard let rowSort else { return bad }
        let (colSort, colSortErr) = parseSort(8, colCols)
        if let e = colSortErr { return .scalar(e) }
        guard let colSort else { return bad }

        // Dữ liệu (bỏ hàng tiêu đề nếu có) + filter (như GROUPBY).
        let dataStart = hasHeaders ? 1 : 0
        guard rowGrid.count > dataStart else { return .scalar(.error(FormulaErrors.calc)) }
        let dataRows = rowGrid.count - dataStart
        var rowFlags = [Bool](repeating: true, count: dataRows)
        if args.count >= 10, args[9] != .empty {
            guard let fg = materialize(eval(args[9])), !fg.isEmpty else { return bad }
            let flags: [CellValue]
            if fg.count == 1 { flags = fg[0] }
            else if fg[0].count == 1 { flags = fg.map { $0[0] } }
            else { return bad }
            guard flags.count == rowGrid.count else { return bad }
            for i in 0..<dataRows {
                switch flags[dataStart + i] {
                case .bool(let b): rowFlags[i] = b
                case .empty: rowFlags[i] = false
                case .error(let e): return .scalar(.error(e))
                default: return bad
                }
            }
        }

        // relative_to (chỉ có nghĩa với PERCENTOF).
        var relativeTo = 0
        if args.count >= 11, args[10] != .empty {
            let v = scalar(eval(args[10]))
            if case .error(let e) = v { return .scalar(.error(e)) }
            guard let n = number(v), n.isFinite, n == n.rounded(.towardZero),
                  (0...2).contains(Int(n)) else { return bad }
            relativeTo = Int(n)
        }

        // Nhóm theo khóa trên một trục (giữ thứ tự xuất hiện đầu tiên).
        func groupAxis(_ grid: [[CellValue]]) -> (keys: [[CellValue]], rows: [[Int]]) {
            var keys: [[CellValue]] = []
            var rows: [[Int]] = []
            var index: [String: Int] = [:]
            for i in 0..<dataRows where rowFlags[i] {
                let r = dataStart + i
                let sig = grid[r].map { Self.groupKey($0) }.joined(separator: "\u{1F}")
                if let gi = index[sig] {
                    rows[gi].append(r)
                } else {
                    index[sig] = keys.count
                    keys.append(grid[r])
                    rows.append([r])
                }
            }
            return (keys, rows)
        }
        let (rowKeysRaw, rowRowsRaw) = groupAxis(rowGrid)
        let (colKeysRaw, colRowsRaw) = groupAxis(colGrid)
        guard !rowKeysRaw.isEmpty, !colKeysRaw.isEmpty else { return .scalar(.error(FormulaErrors.calc)) }

        // Sắp xếp các nhóm (ổn định).
        func sortedGroups(_ keys: [[CellValue]], _ rows: [[Int]],
                          _ sortKeys: [(col: Int, ascending: Bool)]) -> (keys: [[CellValue]], rows: [[Int]]) {
            let order = keys.indices.sorted { a, b in
                for (col, asc) in sortKeys {
                    let c = Self.compareSortKey(keys[a][col], keys[b][col], ascending: asc)
                    if c != 0 { return c < 0 }
                }
                return a < b
            }
            return (order.map { keys[$0] }, order.map { rows[$0] })
        }
        let (rowKeys, rowRows) = sortedGroups(rowKeysRaw, rowRowsRaw, rowSort)
        let (colKeys, colRows) = sortedGroups(colKeysRaw, colRowsRaw, colSort)
        let allRows = rowRows.flatMap { $0 }

        // Đoạn hàng/cột: (nhãn, hàng nguồn, tổng phụ?, tổng chung?).
        typealias Segment = (label: [CellValue], rows: [Int], isSubtotal: Bool, isGrand: Bool)
        func buildSegments(_ keys: [[CellValue]], _ rows: [[Int]], _ keyCols: Int, _ depth: Int) -> [Segment] {
            var segs: [Segment] = []
            if abs(depth) == 2 {
                var i = 0
                while i < keys.count {
                    var k = i + 1
                    while k < keys.count,
                          keys[k].prefix(keyCols - 1).map({ Self.groupKey($0) })
                            == keys[i].prefix(keyCols - 1).map({ Self.groupKey($0) }) {
                        k += 1
                    }
                    let blockRows = rows[i..<k].flatMap { $0 }
                    let sub: Segment = (label: Array(keys[i].prefix(keyCols - 1)) + [.empty],
                                        rows: blockRows, isSubtotal: true, isGrand: false)
                    if depth == -2 { segs.append(sub) }
                    for g in i..<k { segs.append((label: keys[g], rows: rows[g], isSubtotal: false, isGrand: false)) }
                    if depth == 2 { segs.append(sub) }
                    i = k
                }
            } else {
                for g in keys.indices {
                    segs.append((label: keys[g], rows: rows[g], isSubtotal: false, isGrand: false))
                }
            }
            if depth != 0 {
                let grand: Segment = (label: [.string("Total")] + [CellValue](repeating: .empty, count: keyCols - 1),
                                      rows: rows.flatMap { $0 }, isSubtotal: false, isGrand: true)
                if depth < 0 { segs.insert(grand, at: 0) } else { segs.append(grand) }
            }
            return segs
        }
        let rowSegs = buildSegments(rowKeys, rowRows, rowCols, rowDepth)
        let colSegs = buildSegments(colKeys, colRows, colCols, colDepth)

        // Tổng hợp một ô: giao của hàng nguồn của đoạn hàng và đoạn cột.
        // PERCENTOF tính như SUM rồi chia cho mẫu số theo relative_to.
        func pivotCell(_ rSeg: Segment, _ cSeg: Segment, _ j: Int) -> CellValue {
            let cSet = Set(cSeg.rows)
            let rows = rSeg.rows.filter { cSet.contains($0) }
            let v = groupAggregateColumn(agg, valGrid, j, rows)
            guard case .builtin("PERCENTOF") = agg else { return v }
            if case .error(let e) = v { return .error(e) }
            let denomRows: [Int]
            switch relativeTo {
            case 1: denomRows = rSeg.rows
            case 2: denomRows = cSeg.rows
            default: denomRows = allRows
            }
            let d = groupAggregateColumn(.builtin("SUM"), valGrid, j, denomRows)
            if case .error(let e) = d { return .error(e) }
            guard case .number(let total) = d, total != 0 else { return .error(FormulaErrors.div0) }
            guard case .number(let s) = v else { return .error(FormulaErrors.div0) }
            return .number(s / total)
        }

        let rowHeaderNames: [CellValue] = hasHeaders ? rowGrid[0]
            : (1...rowCols).map { CellValue.string("Row Field \($0)") }
        let valHeaderNames: [CellValue] = hasHeaders ? valGrid[0]
            : (1...valCols).map { CellValue.string("Value \($0)") }

        // Lắp kết quả.
        var out: [[CellValue]] = []
        if showHeaders {
            for h in 0..<colCols {
                var line: [CellValue] = h == 0 ? rowHeaderNames
                    : [CellValue](repeating: .empty, count: rowCols)
                for cSeg in colSegs {
                    line.append(cSeg.isGrand ? .empty : cSeg.label[h])
                    line.append(contentsOf: [CellValue](repeating: .empty, count: valCols - 1))
                }
                out.append(line)
            }
            var line: [CellValue] = rowHeaderNames
            for cSeg in colSegs {
                if cSeg.isGrand || cSeg.isSubtotal {
                    line.append(contentsOf: [CellValue](repeating: .string("Total"), count: valCols))
                } else {
                    line.append(contentsOf: valHeaderNames)
                }
            }
            out.append(line)
        }
        for rSeg in rowSegs {
            var line: [CellValue] = rSeg.label
            for cSeg in colSegs {
                for j in 0..<valCols {
                    line.append(pivotCell(rSeg, cSeg, j))
                }
            }
            out.append(line)
        }
        guard out.count * (rowCols + colSegs.count * valCols) <= Self.maxElementwiseCells else {
            return .scalar(.error(FormulaErrors.calc))
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

    // MARK: ARRAYTOTEXT / VALUETOTEXT (M7 lát 40, INBOX-MAC #17)

    /// Một ô thành văn bản theo Excel: concise (0) giữ nguyên chuỗi, strict (1)
    /// đặt chuỗi trong dấu ngoặc kép (nhân đôi " bên trong); số theo General
    /// 15 chữ số (lát 30), TRUE/FALSE nguyên dạng, lỗi giữ nguyên mã, ô trống
    /// → "" ở strict và rỗng ở concise.
    private static func textOfCell(_ v: CellValue, strict: Bool) -> String {
        switch v {
        case .empty: return strict ? "\"\"" : ""
        case .string(let s):
            return strict ? "\"" + s.replacingOccurrences(of: "\"", with: "\"\"") + "\"" : s
        case .number(let d): return generalNumberString(d)
        case .bool(let b): return b ? "TRUE" : "FALSE"
        case .error(let e): return e
        }
    }

    /// Đọc đối số định_dạng (thứ 2, tùy chọn): bỏ trống → 0; phải là số hữu
    /// hạn, cắt phần lẻ về nguyên, chỉ nhận 0/1, còn lại → #VALUE!. Lỗi
    /// trong đối số lan truyền nguyên vẹn.
    private func arrayTextFormat(_ args: [FormulaExpr]) -> (format: Int?, error: CellValue?) {
        guard args.count >= 2, args[1] != .empty else { return (0, nil) }
        let v = scalar(eval(args[1]))
        if case .error(let e) = v { return (nil, .error(e)) }
        guard let n = number(v), n.isFinite else { return (nil, .error(FormulaErrors.value)) }
        let m = n.rounded(.towardZero)
        guard m == 0 || m == 1 else { return (nil, .error(FormulaErrors.value)) }
        return (Int(m), nil)
    }

    /// ARRAYTOTEXT(mảng, [định_dạng]): mảng thành "{1,2;3,4}" (dấu phẩy ngăn
    /// cột, chấm phẩy ngăn hàng); mảng 1 ô trả đúng văn bản của ô đó, không
    /// ngoặc nhọn. Lỗi scalar lan truyền; lambda trần → #VALUE!; vượt giới
    /// hạn phần tử → #VALUE!.
    private func arrayToText(_ args: [FormulaExpr]) -> EvalValue {
        guard (1...2).contains(args.count) else { return .scalar(.error(FormulaErrors.value)) }
        let raw = eval(args[0])
        if case .scalar(let c) = raw, case .error(let e) = c { return .scalar(.error(e)) }
        if case .lambda = raw { return .scalar(.error(FormulaErrors.value)) }
        guard let grid = materialize(raw), !grid.isEmpty,
              let cols = grid.first?.count, cols > 0 else {
            return .scalar(.error(FormulaErrors.value))
        }
        let (format, ferr) = arrayTextFormat(args)
        if let e = ferr { return .scalar(e) }
        let strict = format == 1
        if grid.count == 1, cols == 1 {
            return .scalar(.string(Self.textOfCell(grid[0][0], strict: strict)))
        }
        let rows = grid.map { line in
            line.map { Self.textOfCell($0, strict: strict) }.joined(separator: ",")
        }
        return .scalar(.string("{" + rows.joined(separator: ";") + "}"))
    }

    /// VALUETOTEXT(giá_trị, [định_dạng]): một giá trị thành văn bản. Dùng
    /// scalar() như các hàm scalar khác: vùng nhiều ô ngoài công thức mảng
    /// → #VALUE!, trong CSE giao ngầm theo vị trí.
    private func valueToText(_ args: [FormulaExpr]) -> EvalValue {
        guard (1...2).contains(args.count) else { return .scalar(.error(FormulaErrors.value)) }
        let v = scalar(eval(args[0]))
        if case .error(let e) = v { return .scalar(.error(e)) }
        let (format, ferr) = arrayTextFormat(args)
        if let e = ferr { return .scalar(e) }
        return .scalar(.string(Self.textOfCell(v, strict: format == 1)))
    }

    // MARK: Hàm trợ giúp LAMBDA — MAP / BYROW / BYCOL / SCAN / REDUCE / MAKEARRAY (M7 lát 29, INBOX-MAC #17)

    /// Lấy lambda từ một biểu thức đối số (tính bằng eval() để giữ nguyên
    /// EvalValue.lambda — không đi qua scalar() vì nó biến lambda trần thành
    /// #VALUE!). Trả (lambda, lỗi): lỗi != nil khi đối số tự nó là lỗi scalar
    /// (lan truyền nguyên vẹn như các hàm khác); lambda == nil và lỗi == nil
    /// khi đối số không phải lambda → #VALUE!.
    private func lambdaFromArg(_ expr: FormulaExpr) -> (lambda: (params: [String], body: FormulaExpr, captured: [String: EvalValue])?, error: CellValue?) {
        let v = eval(expr)
        if case .scalar(let c) = v, case .error = c { return (nil, c) }
        guard case .lambda(let params, let body, let captured) = v else { return (nil, nil) }
        return ((params, body, captured), nil)
    }

    /// Ép kết quả trả về của lambda về một ô: scalar giữ nguyên (kể cả ô lỗi —
    /// tầng trên giữ nó trong lưới như Excel); mảng/vùng đúng 1 ô lấy ô đó;
    /// mảng nhiều ô hoặc giá trị hàm → nil (lỗi cấu trúc, tầng trên trả
    /// #VALUE!). Không dùng giao ngầm theo vị trí như scalar().
    private func singleCellValue(_ v: EvalValue) -> CellValue? {
        switch v {
        case .scalar(let c): return c
        case .lambda: return nil
        case .array(let rows):
            guard rows.count == 1, rows[0].count == 1 else { return nil }
            return rows[0][0]
        case .ref(let sh, let r):
            guard r.start == r.end else { return nil }
            return context.cellValue(sheet: sh, ref: r.start)
        }
    }

    /// MAP(mảng1, [mảng2, ...], lambda): áp lambda cho từng phần tử; lambda
    /// nhận đúng số đối số bằng số mảng; các mảng phải cùng kích thước, lệch
    /// → #VALUE!. Phần tử mảng là lỗi scalar → lan ra nguyên vẹn (qua
    /// applyLambdaValues, như lát 28); lambda trả lỗi cho một phần tử thì lỗi
    /// đó ở lại đúng ô đó trong lưới như Excel.
    private func mapArray(_ args: [FormulaExpr]) -> EvalValue {
        let bad = EvalValue.scalar(.error(FormulaErrors.value))
        guard args.count >= 2 else { return bad }
        let (lam, lamErr) = lambdaFromArg(args[args.count - 1])
        if let e = lamErr { return .scalar(e) }
        guard let lam, lam.params.count == args.count - 1 else { return bad }
        var grids: [[[CellValue]]] = []
        grids.reserveCapacity(args.count - 1)
        for a in args.dropLast() {
            guard let g = materialize(eval(a)), !g.isEmpty, (g.first?.count ?? 0) > 0 else { return bad }
            grids.append(g)
        }
        let rows = grids[0].count, cols = grids[0][0].count
        guard grids.allSatisfy({ $0.count == rows && ($0.first?.count ?? 0) == cols }) else { return bad }
        guard rows * cols <= Self.maxElementwiseCells else {
            return .scalar(.error(FormulaErrors.calc))
        }
        var out: [[CellValue]] = []
        out.reserveCapacity(rows)
        for i in 0..<rows {
            var line: [CellValue] = []
            line.reserveCapacity(cols)
            for j in 0..<cols {
                let vals = grids.map { EvalValue.scalar($0[i][j]) }
                // Phần tử mảng là lỗi scalar → lan ra nguyên vẹn (không gọi
                // thân lambda); lỗi do thân trả về thì ở lại đúng ô đó.
                for v in vals {
                    if case .scalar(let cv) = v, case .error = cv { return .scalar(cv) }
                }
                let r = applyLambdaValues(params: lam.params, body: lam.body, captured: lam.captured, values: vals)
                guard let c = singleCellValue(r) else { return bad }
                line.append(c)
            }
            out.append(line)
        }
        return .array(out)
    }

    /// BYROW(mảng, lambda): lambda nhận 1 đối số là một hàng (mảng 1×n);
    /// trả về cột n×1 (một kết quả mỗi hàng). Lambda phải nhận đúng 1 tham số
    /// và trả một giá trị đơn mỗi hàng, nếu không → #VALUE!.
    private func byRowArray(_ args: [FormulaExpr]) -> EvalValue {
        let bad = EvalValue.scalar(.error(FormulaErrors.value))
        guard args.count == 2 else { return bad }
        let (lam, lamErr) = lambdaFromArg(args[1])
        if let e = lamErr { return .scalar(e) }
        guard let lam, lam.params.count == 1 else { return bad }
        guard let grid = materialize(eval(args[0])), !grid.isEmpty,
              let cols = grid.first?.count, cols > 0 else { return bad }
        guard grid.count <= Self.maxElementwiseCells else {
            return .scalar(.error(FormulaErrors.calc))
        }
        var out: [[CellValue]] = []
        out.reserveCapacity(grid.count)
        for row in grid {
            let r = applyLambdaValues(params: lam.params, body: lam.body, captured: lam.captured,
                                      values: [.array([row])])
            guard let c = singleCellValue(r) else { return bad }
            out.append([c])
        }
        return .array(out)
    }

    /// BYCOL(mảng, lambda): lambda nhận 1 đối số là một cột (mảng n×1);
    /// trả về hàng 1×m (một kết quả mỗi cột).
    private func byColArray(_ args: [FormulaExpr]) -> EvalValue {
        let bad = EvalValue.scalar(.error(FormulaErrors.value))
        guard args.count == 2 else { return bad }
        let (lam, lamErr) = lambdaFromArg(args[1])
        if let e = lamErr { return .scalar(e) }
        guard let lam, lam.params.count == 1 else { return bad }
        guard let grid = materialize(eval(args[0])), !grid.isEmpty,
              let cols = grid.first?.count, cols > 0 else { return bad }
        guard cols <= Self.maxElementwiseCells else {
            return .scalar(.error(FormulaErrors.calc))
        }
        var out: [CellValue] = []
        out.reserveCapacity(cols)
        for j in 0..<cols {
            let col = grid.map { [$0[j]] }
            let r = applyLambdaValues(params: lam.params, body: lam.body, captured: lam.captured,
                                      values: [.array(col)])
            guard let c = singleCellValue(r) else { return bad }
            out.append(c)
        }
        return .array([out])
    }

    /// SCAN(giá_trị_đầu, mảng, lambda): lambda(acc, giá_trị) → acc mới; trả
    /// về mảng cùng kích thước chứa các giá trị tích lũy từng bước (duyệt theo
    /// hàng). Acc giữa chừng là lỗi scalar → lan ra nguyên vẹn (theo đúng
    /// cách applyLambdaValues lan lỗi đối số scalar); acc là mảng nhiều ô
    /// → #VALUE!.
    private func scanArray(_ args: [FormulaExpr]) -> EvalValue {
        let bad = EvalValue.scalar(.error(FormulaErrors.value))
        guard args.count == 3 else { return bad }
        let initV = eval(args[0])
        if case .scalar(let c) = initV, case .error = c { return .scalar(c) }
        let (lam, lamErr) = lambdaFromArg(args[2])
        if let e = lamErr { return .scalar(e) }
        guard let lam, lam.params.count == 2 else { return bad }
        guard let grid = materialize(eval(args[1])), !grid.isEmpty,
              let cols = grid.first?.count, cols > 0 else { return bad }
        guard grid.count * cols <= Self.maxElementwiseCells else {
            return .scalar(.error(FormulaErrors.calc))
        }
        var acc = initV
        var out: [[CellValue]] = []
        out.reserveCapacity(grid.count)
        for row in grid {
            var line: [CellValue] = []
            line.reserveCapacity(cols)
            for cell in row {
                let r = applyLambdaValues(params: lam.params, body: lam.body, captured: lam.captured,
                                          values: [acc, .scalar(cell)])
                guard let c = singleCellValue(r) else { return bad }
                if case .error = c { return .scalar(c) }
                line.append(c)
                acc = .scalar(c)
            }
            out.append(line)
        }
        return .array(out)
    }

    /// REDUCE(giá_trị_đầu, mảng, lambda): lambda(acc, giá_trị) → acc; trả về
    /// một giá trị duy nhất — scalar, hoặc mảng nếu acc cuối là mảng (trả
    /// nguyên EvalValue cuối để tràn như mảng động). Acc giữa chừng là lỗi
    /// scalar → lan ra nguyên vẹn.
    private func reduceArray(_ args: [FormulaExpr]) -> EvalValue {
        let bad = EvalValue.scalar(.error(FormulaErrors.value))
        guard args.count == 3 else { return bad }
        let initV = eval(args[0])
        if case .scalar(let c) = initV, case .error = c { return .scalar(c) }
        let (lam, lamErr) = lambdaFromArg(args[2])
        if let e = lamErr { return .scalar(e) }
        guard let lam, lam.params.count == 2 else { return bad }
        guard let grid = materialize(eval(args[1])), !grid.isEmpty,
              let cols = grid.first?.count, cols > 0 else { return bad }
        var acc = initV
        for row in grid {
            for cell in row {
                let r = applyLambdaValues(params: lam.params, body: lam.body, captured: lam.captured,
                                          values: [acc, .scalar(cell)])
                if case .scalar(let c) = r, case .error = c { return .scalar(c) }
                acc = r
            }
        }
        return acc
    }

    /// MAKEARRAY(hàng, cột, lambda): lambda(hàng, cột) → giá trị, chỉ số
    /// 1-based; hàng/cột phải là số nguyên dương (không nguyên, âm, 0, không
    /// phải số → #VALUE!); lambda phải nhận đúng 2 tham số; lưới vượt giới
    /// hạn phần tử → #CALC! (theo đúng ngưỡng của SEQUENCE).
    private func makeArray(_ args: [FormulaExpr]) -> EvalValue {
        let bad = EvalValue.scalar(.error(FormulaErrors.value))
        guard args.count == 3 else { return bad }
        let rv = scalar(eval(args[0]))
        if case .error(let e) = rv { return .scalar(.error(e)) }
        let cv = scalar(eval(args[1]))
        if case .error(let e) = cv { return .scalar(.error(e)) }
        guard let rn = number(rv), rn.isFinite, rn == rn.rounded(.towardZero), rn >= 1,
              rn <= Double(Self.maxElementwiseCells) else { return bad }
        guard let cn = number(cv), cn.isFinite, cn == cn.rounded(.towardZero), cn >= 1,
              cn <= Double(Self.maxElementwiseCells) else { return bad }
        guard rn * cn <= Double(Self.maxElementwiseCells) else {
            return .scalar(.error(FormulaErrors.calc))
        }
        let (lam, lamErr) = lambdaFromArg(args[2])
        if let e = lamErr { return .scalar(e) }
        guard let lam, lam.params.count == 2 else { return bad }
        let rows = Int(rn), cols = Int(cn)
        var out: [[CellValue]] = []
        out.reserveCapacity(rows)
        for i in 0..<rows {
            var line: [CellValue] = []
            line.reserveCapacity(cols)
            for j in 0..<cols {
                let r = applyLambdaValues(params: lam.params, body: lam.body, captured: lam.captured,
                                          values: [.scalar(.number(Double(i + 1))),
                                                   .scalar(.number(Double(j + 1)))])
                guard let c = singleCellValue(r) else { return bad }
                line.append(c)
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
            return FormulaEvaluator.generalNumberString(d)
        }
    }

    /// Định dạng số theo General của Excel, 15 chữ số có nghĩa (M7 lát 30,
    /// golden-batch13/14): dạng thường nếu viết thường ≤ 20 ký tự, còn lại
    /// dạng khoa học với "E" hoa, mũ có dấu và ít nhất 2 chữ số
    /// ("1E+20", "9.5367431640625E-07", "1.18059162071741E+21").
    static func generalNumberString(_ d: Double) -> String {
        if d == 0 { return "0" }
        if !d.isFinite { return String(d) }
        let sign = d < 0 ? "-" : ""
        // "%.14e" cho 15 chữ số có nghĩa đã làm tròn: "-1.234567890123457e+17".
        let sci = String(format: "%.14e", abs(d))
        guard let ePos = sci.firstIndex(of: "e") else { return String(d) }
        let exp = Int(sci[sci.index(after: ePos)...]) ?? 0
        var digits = String(sci[..<ePos]).replacingOccurrences(of: ".", with: "")
        while digits.count > 1, digits.hasSuffix("0") { digits.removeLast() }
        let s = digits.count
        let plainLen: Int
        if exp >= 0 {
            plainLen = s <= exp + 1 ? exp + 1 : s + 1
        } else {
            plainLen = s - exp + 1
        }
        if plainLen <= 20 {
            if exp >= 0 {
                if s <= exp + 1 {
                    return sign + digits + String(repeating: "0", count: exp + 1 - s)
                }
                let idx = digits.index(digits.startIndex, offsetBy: exp + 1)
                return sign + digits[..<idx] + "." + digits[idx...]
            }
            return sign + "0." + String(repeating: "0", count: -exp - 1) + digits
        }
        let mantissa = s == 1 ? digits : String(digits.prefix(1)) + "." + String(digits.dropFirst())
        let expText = (exp >= 0 ? "+" : "-") + String(format: "%02d", abs(exp))
        return sign + mantissa + "E" + expText
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
        case (.number(let x), .number(let y)):
            if numbersEqualToExcelPrecision(x, y) { return 0 }
            return x < y ? -1 : 1
        case (.string(let x), .string(let y)):
            let o = x.compare(y, options: [.caseInsensitive])
            return o == .orderedAscending ? -1 : (o == .orderedDescending ? 1 : 0)
        case (.bool(let x), .bool(let y)): return x == y ? 0 : (!x ? -1 : 1)
        default: return 0
        }
    }

    /// Excel coi hai số bằng nhau khi chúng trùng nhau ở 15 chữ số có nghĩa: `0.1+0.2=0.3` là TRUE
    /// dù hai vế khác nhau ở bit cuối.
    static func numbersEqualToExcelPrecision(_ x: Double, _ y: Double) -> Bool {
        if x == y { return true }
        guard x.isFinite, y.isFinite else { return false }
        // Đường nhanh: hai số làm tròn 15 chữ số về cùng giá trị thì chênh nhau tương đối < ~1e-14.
        if abs(x - y) >= 1.1e-14 * max(abs(x), abs(y)) { return false }
        return String(format: "%.14e", x) == String(format: "%.14e", y)
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
        var values: [EvalValue] = []
        values.reserveCapacity(argExprs.count)
        for a in argExprs {
            let v = eval(a)
            if case .scalar(let cv) = v, case .error = cv { return v }
            values.append(v)
        }
        return applyLambdaValues(params: params, body: body, captured: captured, values: values)
    }

    /// Gọi lambda với các giá trị đối số đã tính sẵn (dùng cho MAP/BYROW/BYCOL/
    /// SCAN/REDUCE/MAKEARRAY, lát 29): đối số là giá trị phần tử/mảng đã
    /// materialize; lỗi scalar trong đối số lan ra; lệch số lượng → #VALUE!;
    /// đệ quy sâu quá giới hạn engine thì #VALUE!.
    private func applyLambdaValues(params: [String], body: FormulaExpr, captured: [String: EvalValue], values: [EvalValue]) -> EvalValue {
        guard params.count == values.count else { return .scalar(.error(FormulaErrors.value)) }
        guard lambdaDepth < Self.maxLambdaDepth else { return .scalar(.error(FormulaErrors.value)) }
        for v in values {
            if case .scalar(let cv) = v, case .error = cv { return v }
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
        case "TRUE":
            return args.isEmpty ? .bool(true) : bad
        case "FALSE":
            return args.isEmpty ? .bool(false) : bad
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
