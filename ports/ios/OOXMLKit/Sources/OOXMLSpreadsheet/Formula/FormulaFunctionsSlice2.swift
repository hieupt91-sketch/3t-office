import Foundation

/// Hàm slice-2: tra cứu, văn bản, ngày giờ, điều kiện/thống kê, logic mở rộng.
/// Quy ước sai số đối số / ép kiểu giống slice-1 (`#VALUE!`); lỗi trong đối số lan truyền nguyên vẹn.

/// Dùng nội bộ để thoát sớm với một giá trị lỗi.
private struct Abort: Error { let value: CellValue }

private func fail(_ e: String) -> Abort { Abort(value: .error(e)) }

/// Vùng đã đọc thành lưới giá trị (hàng trước, cột sau).
private struct Grid {
    var sheet: String?
    var origin: CellReference?
    var rows: [[CellValue]]
    var nRows: Int { rows.count }
    var nCols: Int { rows.first?.count ?? 0 }
    var flat: [CellValue] { rows.flatMap { $0 } }
}

private let maxGridCells = 4_000_000

extension FormulaEvaluator {

    // MARK: Điểm vào

    /// Hàm có thể trả về tham chiếu (INDEX, CHOOSE) — dùng được làm đối số vùng của SUM...
    func callReference(_ name: String, _ args: [FormulaExpr]) -> EvalValue? {
        guard name == "INDEX" || name == "CHOOSE" else { return nil }
        do {
            return name == "INDEX" ? try index(args) : try choose(args)
        } catch let a as Abort {
            return .scalar(a.value)
        } catch {
            return .scalar(.error(FormulaErrors.value))
        }
    }

    func callSlice2(_ name: String, _ args: [FormulaExpr]) -> CellValue? {
        do {
            return try dispatch(name, args)
        } catch let a as Abort {
            return a.value
        } catch {
            return .error(FormulaErrors.value)
        }
    }

    private func dispatch(_ name: String, _ a: [FormulaExpr]) throws -> CellValue? {
        switch name {
        // Tra cứu
        case "VLOOKUP": return try vhlookup(a, vertical: true)
        case "HLOOKUP": return try vhlookup(a, vertical: false)
        case "MATCH": return try match(a)
        // Văn bản
        case "LEFT", "RIGHT": return try leftRight(name == "LEFT", a)
        case "MID": return try mid(a)
        case "LEN": try need(a, 1...1); return .number(Double(us(try tx(a[0])).count))
        case "FIND", "SEARCH": return try findSearch(name == "SEARCH", a)
        case "UPPER": try need(a, 1...1); return .string(try tx(a[0]).uppercased())
        case "LOWER": try need(a, 1...1); return .string(try tx(a[0]).lowercased())
        case "TRIM":
            try need(a, 1...1)
            return .string(try tx(a[0]).split(separator: " ", omittingEmptySubsequences: true).joined(separator: " "))
        case "SUBSTITUTE": return try substitute(a)
        case "REPLACE": return try replace(a)
        case "TEXT": return try text(a)
        case "VALUE": return try value(a)
        case "CONCAT": return try concat(a)
        case "TEXTJOIN": return try textjoin(a)
        // Ngày giờ
        case "DATE": return try date(a)
        case "YEAR", "MONTH", "DAY": return try ymd(name, a)
        case "TODAY": try need(a, 0...0); return .number(context.nowSerial.rounded(.down))
        case "NOW": try need(a, 0...0); return .number(context.nowSerial)
        case "EDATE", "EOMONTH": return try monthShift(name == "EOMONTH", a)
        case "DATEDIF": return try datedif(a)
        // Toán
        case "ROUNDUP", "ROUNDDOWN": return try roundDir(name == "ROUNDUP", a)
        case "INT": try need(a, 1...1); return .number((try nm(a[0])).rounded(.down))
        case "MOD": return try mod(a)
        case "POWER": return try power(a)
        case "SQRT":
            try need(a, 1...1)
            let x = try nm(a[0])
            return x < 0 ? .error(FormulaErrors.num) : .number(x.squareRoot())
        // Điều kiện / thống kê
        case "SUMIF", "AVERAGEIF": return try sumifSingle(name == "AVERAGEIF", a)
        case "COUNTIF": return try countif(a)
        case "SUMIFS": return try sumifs(a)
        case "COUNTIFS": return try countifs(a)
        // Logic
        case "IFERROR", "IFNA": return try ifError(onlyNA: name == "IFNA", a)
        case "IFS": return try ifs(a)
        case "SWITCH": return try switchFn(a)
        default: return nil
        }
    }

    // MARK: Tiện ích đối số

    private func need(_ a: [FormulaExpr], _ r: ClosedRange<Int>) throws {
        guard r.contains(a.count) else { throw fail(FormulaErrors.value) }
    }

    /// Giá trị đơn; lỗi → ném để lan truyền.
    private func sc(_ e: FormulaExpr) throws -> CellValue {
        let v = scalar(eval(e))
        if case .error = v { throw Abort(value: v) }
        return v
    }

    private func nm(_ e: FormulaExpr) throws -> Double {
        guard let d = number(try sc(e)) else { throw fail(FormulaErrors.value) }
        return d
    }

    private func tx(_ e: FormulaExpr) throws -> String { FormulaEvaluator.text(try sc(e)) }

    private func bl(_ e: FormulaExpr) throws -> Bool {
        guard let b = bool(try sc(e)) else { throw fail(FormulaErrors.value) }
        return b
    }

    private func us(_ s: String) -> [Unicode.Scalar] { Array(s.unicodeScalars) }

    private func str<S: Sequence>(_ a: S) -> String where S.Element == Unicode.Scalar {
        var v = String.UnicodeScalarView()
        v.append(contentsOf: a)
        return String(v)
    }

    private func grid(_ e: FormulaExpr) throws -> Grid {
        switch eval(e) {
        case .scalar(let v):
            if case .error = v { throw Abort(value: v) }
            return Grid(sheet: nil, origin: nil, rows: [[v]])
        case .ref(let sh, let r):
            let nr = r.end.row - r.start.row + 1, nc = r.end.column - r.start.column + 1
            guard nr * nc <= maxGridCells else { throw fail(FormulaErrors.value) }
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
            return Grid(sheet: sh, origin: r.start, rows: rows)
        }
    }

    // MARK: So khớp tra cứu

    private static func cmpSame(_ a: CellValue, _ b: CellValue) -> Int? {
        switch (a, b) {
        case (.number(let x), .number(let y)): return x < y ? -1 : (x > y ? 1 : 0)
        case (.string, .string), (.bool, .bool): return FormulaEvaluator.compare(a, b)
        default: return nil
        }
    }

    /// 0: khớp đúng (có ký tự đại diện cho văn bản); 1: lớn nhất ≤ khóa (tăng dần); -1: nhỏ nhất ≥ khóa (giảm dần).
    private func lookupIndex(_ key: CellValue, in vec: [CellValue], mode: Int) -> Int? {
        switch mode {
        case 0:
            if case .string(let s) = key {
                let w = WildcardPattern(s)
                for (i, v) in vec.enumerated() {
                    guard case .string(let t) = v else { continue }
                    if w.hasWildcards ? w.matches(t) : FormulaEvaluator.cmpSame(v, key) == 0 { return i }
                }
                return nil
            }
            for (i, v) in vec.enumerated() where FormulaEvaluator.cmpSame(v, key) == 0 { return i }
            return nil
        case 1:
            var best: Int? = nil
            for (i, v) in vec.enumerated() {
                guard let c = FormulaEvaluator.cmpSame(v, key) else { continue }
                if c <= 0 { best = i } else { break }
            }
            return best
        default:
            var best: Int? = nil
            for (i, v) in vec.enumerated() {
                guard let c = FormulaEvaluator.cmpSame(v, key) else { continue }
                if c >= 0 { best = i } else { break }
            }
            return best
        }
    }

    private func vhlookup(_ a: [FormulaExpr], vertical: Bool) throws -> CellValue {
        try need(a, 3...4)
        let key = try sc(a[0])
        let g = try grid(a[1])
        let idx = try nm(a[2]).rounded(.towardZero)
        let approx = a.count == 4 ? try bl(a[3]) : true
        guard idx >= 1 else { throw fail(FormulaErrors.value) }
        let span = Int(idx)
        guard span <= (vertical ? g.nCols : g.nRows) else { throw fail(FormulaErrors.ref) }
        let vec = vertical ? g.rows.map { $0[0] } : g.rows[0]
        guard let hit = lookupIndex(key, in: vec, mode: approx ? 1 : 0) else { throw fail(FormulaErrors.na) }
        let out = vertical ? g.rows[hit][span - 1] : g.rows[span - 1][hit]
        if case .empty = out { return .number(0) }
        return out
    }

    private func match(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...3)
        let key = try sc(a[0])
        let g = try grid(a[1])
        let t = a.count == 3 ? try nm(a[2]) : 1
        guard g.nRows == 1 || g.nCols == 1 else { throw fail(FormulaErrors.na) }
        let mode = t > 0 ? 1 : (t < 0 ? -1 : 0)
        guard let i = lookupIndex(key, in: g.flat, mode: mode) else { throw fail(FormulaErrors.na) }
        return .number(Double(i + 1))
    }

    // MARK: INDEX / CHOOSE (trả tham chiếu)

    private func index(_ a: [FormulaExpr]) throws -> EvalValue {
        try need(a, 2...3)
        let r = try nm(a[1]).rounded(.towardZero)
        let c = a.count == 3 ? try nm(a[2]).rounded(.towardZero) : nil
        if r < 0 || (c ?? 0) < 0 { throw fail(FormulaErrors.value) }
        switch eval(a[0]) {
        case .scalar(let v):
            if case .error = v { throw Abort(value: v) }
            guard r <= 1, (c ?? 1) <= 1 else { throw fail(FormulaErrors.ref) }
            return .scalar(v)
        case .ref(let sh, let range):
            let nr = range.end.row - range.start.row + 1, nc = range.end.column - range.start.column + 1
            var row = Int(r), col = c.map { Int($0) }
            if col == nil {
                // Một chỉ số: vector → vị trí; mảng 2 chiều → cả hàng.
                if nr == 1 && nc > 1 { col = row; row = 1 } else if nc == 1 { col = 1 } else { col = 0 }
            }
            let cc = col!
            guard row <= nr, cc <= nc else { throw fail(FormulaErrors.ref) }
            let r0 = row == 0 ? range.start.row : range.start.row + row - 1
            let r1 = row == 0 ? range.end.row : r0
            let c0 = cc == 0 ? range.start.column : range.start.column + cc - 1
            let c1 = cc == 0 ? range.end.column : c0
            return .ref(sheet: sh, range: CellRange(CellReference(column: c0, row: r0), CellReference(column: c1, row: r1)))
        }
    }

    private func choose(_ a: [FormulaExpr]) throws -> EvalValue {
        try need(a, 2...Int.max)
        let i = try nm(a[0]).rounded(.towardZero)
        guard i >= 1, Int(i) < a.count else { throw fail(FormulaErrors.value) }
        return eval(a[Int(i)])
    }

    // MARK: Văn bản

    private func leftRight(_ isLeft: Bool, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...2)
        let s = us(try tx(a[0]))
        let n = a.count == 2 ? try nm(a[1]).rounded(.towardZero) : 1
        guard n >= 0 else { throw fail(FormulaErrors.value) }
        let k = min(Int(min(n, 1e9)), s.count)
        return .string(str(isLeft ? s.prefix(k) : s.suffix(k)))
    }

    private func mid(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 3...3)
        let s = us(try tx(a[0]))
        let start = try nm(a[1]).rounded(.towardZero), n = try nm(a[2]).rounded(.towardZero)
        guard start >= 1, n >= 0 else { throw fail(FormulaErrors.value) }
        guard start <= Double(s.count) else { return .string("") }
        let from = Int(start) - 1
        let to = min(s.count, from + Int(min(n, 1e9)))
        return .string(str(s[from..<to]))
    }

    private func findSearch(_ isSearch: Bool, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...3)
        let find = try tx(a[0]), within = try tx(a[1])
        let start = a.count == 3 ? try nm(a[2]).rounded(.towardZero) : 1
        let w = us(within)
        guard start >= 1, start <= Double(w.count) + (w.isEmpty && start == 1 ? 1 : 0) else { throw fail(FormulaErrors.value) }
        let from = Int(start) - 1
        if isSearch {
            guard let i = WildcardPattern(find).firstIndex(in: within, from: from) else { throw fail(FormulaErrors.value) }
            return .number(Double(i + 1))
        }
        let f = us(find)
        if f.isEmpty { return .number(Double(from + 1)) }
        if f.count <= w.count {
            for i in from...(w.count - f.count) where Array(w[i..<(i + f.count)]) == f { return .number(Double(i + 1)) }
        }
        throw fail(FormulaErrors.value)
    }

    private func substitute(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 3...4)
        let text = us(try tx(a[0])), old = us(try tx(a[1])), new = try tx(a[2])
        var instance = 0
        if a.count == 4 {
            let n = try nm(a[3]).rounded(.towardZero)
            guard n >= 1 else { throw fail(FormulaErrors.value) }
            instance = Int(n)
        }
        if old.isEmpty { return .string(str(text)) }
        var out = "", i = 0, seen = 0
        while i < text.count {
            if i + old.count <= text.count, Array(text[i..<(i + old.count)]) == old {
                seen += 1
                if instance == 0 || seen == instance {
                    out += new; i += old.count
                    if instance != 0 { out += str(text[i...]); return .string(out) }
                    continue
                }
                out += str(text[i..<(i + old.count)]); i += old.count
                continue
            }
            out += str([text[i]]); i += 1
        }
        return .string(out)
    }

    private func replace(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 4...4)
        let s = us(try tx(a[0]))
        let start = try nm(a[1]).rounded(.towardZero), n = try nm(a[2]).rounded(.towardZero)
        let new = try tx(a[3])
        guard start >= 1, n >= 0 else { throw fail(FormulaErrors.value) }
        let from = min(s.count, Int(min(start, 1e9)) - 1)
        let to = min(s.count, from + Int(min(n, 1e9)))
        return .string(str(s[..<from]) + new + str(s[to...]))
    }

    private func text(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let v = try sc(a[0])
        let fmt = try tx(a[1])
        var x: Double
        switch v {
        case .number(let d): x = d
        case .empty: x = 0
        case .bool: return .string(FormulaEvaluator.text(v))
        case .string(let s):
            guard let d = FormulaEvaluator.parseValue(s) else { return v }
            x = d
        case .error: return v
        }
        guard let out = FormulaTextFormat.format(x, fmt) else { throw fail(FormulaErrors.value) }
        return .string(out)
    }

    private func value(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...1)
        switch try sc(a[0]) {
        case .number(let d): return .number(d)
        case .empty: return .number(0)
        case .bool: throw fail(FormulaErrors.value)
        case .string(let s):
            guard let d = FormulaEvaluator.parseValue(s) else { throw fail(FormulaErrors.value) }
            return .number(d)
        case .error(let e): return .error(e)
        }
    }

    /// Phân tích chuỗi thành số theo kiểu VALUE(): số, "12%", "1,234.5", ngày ISO, giờ hh:mm[:ss].
    static func parseValue(_ raw: String) -> Double? {
        let t = raw.trimmingCharacters(in: .whitespaces)
        guard !t.isEmpty else { return nil }
        var body = t, scale = 1.0
        if body.hasSuffix("%") { body.removeLast(); scale = 0.01 }
        if body.contains(",") {
            let parts = body.split(separator: ",", omittingEmptySubsequences: false)
            let head = parts[0].trimmingCharacters(in: CharacterSet(charactersIn: "+-"))
            let lastInt = parts.last!.split(separator: ".", omittingEmptySubsequences: false).first.map(String.init) ?? ""
            let midOK = parts.dropFirst().dropLast().allSatisfy { $0.count == 3 }
            guard !head.isEmpty, head.count <= 3, midOK, lastInt.count == 3 else { return nil }
            body = body.replacingOccurrences(of: ",", with: "")
        }
        if FormulaCriterion.isPlainNumber(body), let d = Double(body), d.isFinite { return d * scale }
        if scale == 1.0, let d = ExcelDate.parse(t) { return d }
        return nil
    }

    private func flattenText(_ a: [FormulaExpr]) throws -> [CellValue] {
        var out: [CellValue] = []
        for e in a {
            for v in try grid(e).flat {
                if case .error = v { throw Abort(value: v) }
                out.append(v)
            }
        }
        return out
    }

    private func concat(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...Int.max)
        return .string(try flattenText(a).map(FormulaEvaluator.text).joined())
    }

    private func textjoin(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 3...Int.max)
        let delim = try tx(a[0])
        let ignore = try bl(a[1])
        var parts: [String] = []
        for v in try flattenText(Array(a[2...])) {
            let s = FormulaEvaluator.text(v)
            if ignore && s.isEmpty { continue }
            parts.append(s)
        }
        return .string(parts.joined(separator: delim))
    }

    // MARK: Ngày giờ

    private func dateArg(_ e: FormulaExpr) throws -> Int {
        let v = try sc(e)
        var d: Double
        if case .string(let s) = v {
            guard let p = ExcelDate.parse(s) else { throw fail(FormulaErrors.value) }
            d = p
        } else {
            guard let n = number(v) else { throw fail(FormulaErrors.value) }
            d = n
        }
        guard d >= 0, d < 2_958_466 else { throw fail(FormulaErrors.num) }
        return Int(d.rounded(.down))
    }

    private func date(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 3...3)
        var y = Int(try nm(a[0]).rounded(.towardZero))
        let m = Int(try nm(a[1]).rounded(.towardZero))
        let d = Int(try nm(a[2]).rounded(.towardZero))
        guard y >= 0, y < 10000 else { throw fail(FormulaErrors.num) }
        if y < 1900 { y += 1900 }
        guard let s = ExcelDate.serial(year: y, month: m, day: d) else { throw fail(FormulaErrors.num) }
        return .number(Double(s))
    }

    private func ymd(_ name: String, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...1)
        guard let c = ExcelDate.civil(fromSerial: try dateArg(a[0])) else { throw fail(FormulaErrors.num) }
        return .number(Double(name == "YEAR" ? c.year : (name == "MONTH" ? c.month : c.day)))
    }

    private func monthShift(_ eom: Bool, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let s = try dateArg(a[0])
        let months = Int(try nm(a[1]).rounded(.towardZero))
        guard let r = eom ? ExcelDate.endOfMonth(serial: s, months: months) : ExcelDate.addMonths(serial: s, months: months) else {
            throw fail(FormulaErrors.num)
        }
        return .number(Double(r))
    }

    private func datedif(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 3...3)
        let s = try dateArg(a[0]), e = try dateArg(a[1])
        let unit = try tx(a[2])
        guard s <= e else { throw fail(FormulaErrors.num) }
        guard let r = ExcelDate.datedif(start: s, end: e, unit: unit) else { throw fail(FormulaErrors.num) }
        return .number(Double(r))
    }

    // MARK: Toán

    private func roundDir(_ up: Bool, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let x = try nm(a[0])
        let digits = Int(try nm(a[1]).rounded(.towardZero))
        if x == 0 { return .number(0) }
        let ax = abs(x)
        var result: Double
        if abs(digits) <= 100, var dec = Decimal(string: String(format: "%.15g", ax)) {
            let shift = Decimal(sign: .plus, exponent: digits, significand: 1)
            var scaled = dec * shift
            var out = Decimal()
            NSDecimalRound(&out, &scaled, 0, up ? .up : .down)
            dec = out / shift
            result = Double("\(dec)") ?? NSDecimalNumber(decimal: dec).doubleValue
        } else {
            let f = pow(10.0, Double(digits))
            result = (up ? (ax * f).rounded(.up) : (ax * f).rounded(.down)) / f
        }
        guard result.isFinite else { throw fail(FormulaErrors.num) }
        return .number(x < 0 ? -result : result)
    }

    private func mod(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let n = try nm(a[0]), d = try nm(a[1])
        guard d != 0 else { throw fail(FormulaErrors.div0) }
        let r = n - d * (n / d).rounded(.down)
        return r.isFinite ? .number(r) : .error(FormulaErrors.num)
    }

    private func power(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let x = try nm(a[0]), y = try nm(a[1])
        if x == 0 && y == 0 { throw fail(FormulaErrors.num) }
        if x == 0 && y < 0 { throw fail(FormulaErrors.div0) }
        let r = pow(x, y)
        return r.isFinite ? .number(r) : .error(FormulaErrors.num)
    }

    // MARK: Điều kiện / thống kê

    private func criterion(_ e: FormulaExpr) throws -> FormulaCriterion {
        FormulaCriterion(scalar(eval(e)))
    }

    /// Ô cùng vị trí tương đối trong vùng `sum` (tính từ góc trên trái), kích thước như `shape`.
    private func aligned(_ sum: Grid, rows: Int, cols: Int) -> [[CellValue]] {
        guard let o = sum.origin, let sh = sum.sheet else {
            return (0..<rows).map { r in (0..<cols).map { c in (r < sum.nRows && c < sum.nCols) ? sum.rows[r][c] : .empty } }
        }
        return (0..<rows).map { r in
            (0..<cols).map { c in
                let col = o.column + c, row = o.row + r
                guard col <= CellReference.maxColumn, row <= CellReference.maxRow else { return .empty }
                return context.cellValue(sheet: sh, ref: CellReference(column: col, row: row))
            }
        }
    }

    private func sumifSingle(_ average: Bool, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...3)
        let g = try grid(a[0])
        let crit = try criterion(a[1])
        let target = a.count == 3 ? aligned(try grid(a[2]), rows: g.nRows, cols: g.nCols) : g.rows
        var total = 0.0, n = 0
        for r in 0..<g.nRows {
            for c in 0..<g.nCols where crit.matches(g.rows[r][c]) {
                switch target[r][c] {
                case .error(let e): return .error(e)
                case .number(let d): total += d; n += 1
                default: break
                }
            }
        }
        if average {
            guard n > 0 else { return .error(FormulaErrors.div0) }
            return .number(total / Double(n))
        }
        return .number(total)
    }

    private func countif(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let g = try grid(a[0])
        let crit = try criterion(a[1])
        return .number(Double(g.flat.filter { crit.matches($0) }.count))
    }

    /// Các cặp (vùng, tiêu chí) bắt đầu từ `a[from]`; trả về mặt nạ ô thỏa mọi tiêu chí.
    private func mask(_ a: [FormulaExpr], from: Int, shape: (Int, Int)?) throws -> (mask: [[Bool]], rows: Int, cols: Int) {
        guard (a.count - from) >= 2, (a.count - from) % 2 == 0 else { throw fail(FormulaErrors.value) }
        var m: [[Bool]] = []
        var rows = shape?.0 ?? 0, cols = shape?.1 ?? 0
        var i = from
        var first = shape == nil
        if let sh = shape { m = Array(repeating: Array(repeating: true, count: sh.1), count: sh.0) }
        while i < a.count {
            let g = try grid(a[i])
            let crit = try criterion(a[i + 1])
            if first { rows = g.nRows; cols = g.nCols; m = Array(repeating: Array(repeating: true, count: cols), count: rows); first = false }
            guard g.nRows == rows, g.nCols == cols else { throw fail(FormulaErrors.value) }
            for r in 0..<rows { for c in 0..<cols where !crit.matches(g.rows[r][c]) { m[r][c] = false } }
            i += 2
        }
        return (m, rows, cols)
    }

    private func countifs(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...Int.max)
        let m = try mask(a, from: 0, shape: nil)
        return .number(Double(m.mask.flatMap { $0 }.filter { $0 }.count))
    }

    private func sumifs(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 3...Int.max)
        let sum = try grid(a[0])
        let m = try mask(a, from: 1, shape: (sum.nRows, sum.nCols))
        var total = 0.0
        for r in 0..<m.rows {
            for c in 0..<m.cols where m.mask[r][c] {
                switch sum.rows[r][c] {
                case .error(let e): return .error(e)
                case .number(let d): total += d
                default: break
                }
            }
        }
        return .number(total)
    }

    // MARK: Logic

    private func ifError(onlyNA: Bool, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let v = scalar(eval(a[0]))
        if case .error(let e) = v, !onlyNA || e == FormulaErrors.na { return scalar(eval(a[1])) }
        return v
    }

    private func ifs(_ a: [FormulaExpr]) throws -> CellValue {
        guard a.count >= 2, a.count % 2 == 0 else { throw fail(FormulaErrors.value) }
        var i = 0
        while i < a.count {
            if try bl(a[i]) { return scalar(eval(a[i + 1])) }
            i += 2
        }
        return .error(FormulaErrors.na)
    }

    private func switchFn(_ a: [FormulaExpr]) throws -> CellValue {
        guard a.count >= 3 else { throw fail(FormulaErrors.value) }
        let key = try sc(a[0])
        var i = 1
        while i + 1 < a.count {
            let cand = scalar(eval(a[i]))
            if case .error = cand { return cand }
            if FormulaEvaluator.compare(key, cand) == 0, FormulaEvaluator.sameKind(key, cand) { return scalar(eval(a[i + 1])) }
            i += 2
        }
        if i < a.count { return scalar(eval(a[i])) }
        return .error(FormulaErrors.na)
    }

    static func sameKind(_ a: CellValue, _ b: CellValue) -> Bool {
        func k(_ v: CellValue) -> Int {
            switch v { case .number, .empty: return 0; case .string: return 1; case .bool: return 2; case .error: return 3 }
        }
        return k(a) == k(b)
    }
}
