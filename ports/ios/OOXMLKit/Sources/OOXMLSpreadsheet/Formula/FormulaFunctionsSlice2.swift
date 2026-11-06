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
        case "XLOOKUP": return try xlookup(a)
        case "XMATCH": return try xmatch(a)
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
        case "WEEKDAY": return try weekday(a)
        case "WEEKNUM": return try weeknum(a)
        case "NETWORKDAYS": return try networkdays(a)
        case "WORKDAY": return try workday(a)
        // Toán
        case "ROUNDUP", "ROUNDDOWN": return try roundDir(name == "ROUNDUP", a)
        case "INT": try need(a, 1...1); return .number((try nm(a[0])).rounded(.down))
        case "MOD": return try mod(a)
        case "POWER": return try power(a)
        case "EXP", "LN", "LOG10", "LOG": return try logExp(name, a)
        case "SQRT":
            try need(a, 1...1)
            let x = try nm(a[0])
            return x < 0 ? .error(FormulaErrors.num) : .number(x.squareRoot())
        // Thống kê thứ tự
        case "MEDIAN": return try median(a)
        case "LARGE", "SMALL": return try largeSmall(name == "LARGE", a)
        case "RANK": return try rank(a)
        case "RANK.EQ": return try rank(a)
        case "RANK.AVG": return try rankAvg(a)
        case "PROB": return try prob(a)
        case "STANDARDIZE": return try standardize(a)
        case "NORM.S.DIST": return try normSDist(a)
        case "NORM.DIST": return try normDist(a)
        case "NORM.S.INV": return try normSInv(a)
        case "NORM.INV": return try normInv(a)
        case "PERCENTILE", "PERCENTILE.INC": return try percentileInc(a)
        case "QUARTILE", "QUARTILE.INC": return try quartileInc(a)
        case "PERCENTILE.EXC": return try percentileExc(a)
        case "QUARTILE.EXC": return try quartileExc(a)
        case "STDEV", "STDEV.S": return try stdev(sample: true, a)
        case "STDEVP", "STDEV.P": return try stdev(sample: false, a)
        case "VAR", "VAR.S": return try variance(sample: true, a)
        case "VARP", "VAR.P": return try variance(sample: false, a)
        case "MODE", "MODE.SNGL": return try mode(a)
        case "AVEDEV": return try avedev(a)
        case "DEVSQ": return try devsq(a)
        case "GEOMEAN": return try geomean(a)
        case "HARMEAN": return try harmean(a)
        case "TRIMMEAN": return try trimmean(a)
        case "SKEW": return try skew(population: false, a)
        case "SKEW.P": return try skew(population: true, a)
        case "KURT": return try kurt(a)
        case "PERCENTRANK", "PERCENTRANK.INC": return try percentRank(exclusive: false, a)
        case "PERCENTRANK.EXC": return try percentRank(exclusive: true, a)
        case "SLOPE": return try slopeIntercept(slope: true, a)
        case "INTERCEPT": return try slopeIntercept(slope: false, a)
        case "RSQ": return try rsq(a)
        case "FORECAST", "FORECAST.LINEAR": return try forecast(a)
        case "CORREL", "PEARSON": return try correl(a)
        case "STEYX": return try steyx(a)
        case "COVARIANCE.S": return try covariance(sample: true, a)
        case "COVARIANCE.P": return try covariance(sample: false, a)
        case "FISHER": return try fisher(a)
        case "FISHERINV": return try fisherinv(a)
        // Điều kiện / thống kê
        case "SUMIF", "AVERAGEIF": return try sumifSingle(name == "AVERAGEIF", a)
        case "COUNTIF": return try countif(a)
        case "SUMPRODUCT": return try sumproduct(a)
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
        case .array(let rows):
            return Grid(sheet: nil, origin: nil, rows: rows)
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

    /// XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found], [match_mode], [search_mode]).
    /// match_mode: 0 khớp đúng (mặc định), -1 đúng hoặc nhỏ hơn gần nhất, 1 đúng hoặc lớn hơn gần nhất, 2 ký tự đại diện.
    /// search_mode: 1 từ đầu (mặc định), -1 từ cuối; 2/-2 (nhị phân) tính như 1/-1 — cùng kết quả trên dữ liệu đã sắp.
    /// return_array phải là vector cùng hướng và cùng độ dài với lookup_array (trả cả hàng/cột kiểu dynamic array: chưa hỗ trợ).
    private func xlookup(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 3...6)
        let key = try sc(a[0])
        let lg = try grid(a[1])
        let rg = try grid(a[2])
        guard lg.nRows == 1 || lg.nCols == 1 else { throw fail(FormulaErrors.value) }
        let horizontal = lg.nRows == 1 && lg.nCols > 1
        let rvec: [CellValue]
        if horizontal {
            guard rg.nRows == 1, rg.nCols == lg.nCols else { throw fail(FormulaErrors.value) }
            rvec = rg.flat
        } else {
            guard rg.nCols == 1, rg.nRows == lg.nRows else { throw fail(FormulaErrors.value) }
            rvec = rg.flat
        }
        var lvec = lg.flat, rvecW = rvec
        let matchMode = a.count >= 5 ? Int(try nm(a[4]).rounded(.towardZero)) : 0
        let searchMode = a.count >= 6 ? Int(try nm(a[5]).rounded(.towardZero)) : 1
        if searchMode < 0 { lvec.reverse(); rvecW.reverse() }
        // Khớp gần đúng của XLOOKUP không giả định thứ tự sắp xếp như MATCH cổ điển:
        // quét tuyến tính lấy giá trị nhỏ/lớn hơn gần nhất (khớp đúng thắng ngay, xuất hiện đầu tiên theo chiều tìm).
        let hit: Int?
        switch matchMode {
        case -1: hit = approxIndex(key, in: lvec, larger: false)
        case 1: hit = approxIndex(key, in: lvec, larger: true)
        default: hit = lookupIndex(key, in: lvec, mode: 0)
        }
        guard let hit = hit else {
            if a.count >= 4 {
                let v = try sc(a[3])
                return v == .empty ? .number(0) : v
            }
            throw fail(FormulaErrors.na)
        }
        let out = rvecW[hit]
        return out == .empty ? .number(0) : out
    }

    /// XMATCH(lookup_value, lookup_array, [match_mode], [search_mode]): vị trí 1-based.
    /// match_mode: 0 khớp đúng (mặc định), -1 đúng hoặc nhỏ hơn gần nhất, 1 đúng hoặc lớn hơn
    /// gần nhất, 2 ký tự đại diện. search_mode: 1 từ đầu (mặc định), -1 từ cuối, 2 nhị phân
    /// tăng dần, -2 nhị phân giảm dần. Không thấy → #N/A; match_mode/search_mode ngoài
    /// miền, lookup_array không phải vector, hoặc ký tự đại diện + tìm nhị phân → #VALUE!.
    private func xmatch(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...4)
        let key = try sc(a[0])
        let g = try grid(a[1])
        guard g.nRows == 1 || g.nCols == 1 else { throw fail(FormulaErrors.value) }
        let matchMode = a.count >= 3 ? Int(try nm(a[2]).rounded(.towardZero)) : 0
        let searchMode = a.count >= 4 ? Int(try nm(a[3]).rounded(.towardZero)) : 1
        guard [-1, 0, 1, 2].contains(matchMode), [-2, -1, 1, 2].contains(searchMode) else {
            throw fail(FormulaErrors.value)
        }
        if matchMode == 2 && (searchMode == 2 || searchMode == -2) { throw fail(FormulaErrors.value) }
        var vec = g.flat
        if searchMode == -1 { vec.reverse() }
        let hit: Int?
        switch searchMode {
        case 2: hit = binaryLookupIndex(key, in: vec, ascending: true, matchMode: matchMode)
        case -2: hit = binaryLookupIndex(key, in: vec, ascending: false, matchMode: matchMode)
        default:
            switch matchMode {
            case -1: hit = approxIndex(key, in: vec, larger: false)
            case 1: hit = approxIndex(key, in: vec, larger: true)
            default: hit = lookupIndex(key, in: vec, mode: 0)
            }
        }
        guard let hit = hit else { throw fail(FormulaErrors.na) }
        return .number(Double(hit + 1))
    }

    /// So sánh toàn phần theo thứ tự Excel (số < chuỗi < logic < lỗi < rỗng) để tìm
    /// nhị phân; cmpSame chỉ so được cùng kiểu nên nil thì rơi về hạng.
    private static func cmpTotal(_ a: CellValue, _ b: CellValue) -> Int {
        if let c = cmpSame(a, b) { return c }
        func rank(_ v: CellValue) -> Int {
            switch v { case .number: return 0; case .string: return 1; case .bool: return 2; case .error: return 3; case .empty: return 4 }
        }
        let ra = rank(a), rb = rank(b)
        return ra == rb ? 0 : (ra < rb ? -1 : 1)
    }

    /// Tìm nhị phân trên mảng đã sắp (tăng dần nếu ascending, giảm dần nếu không).
    /// matchMode 0: khớp đúng (vị trí đầu tiên); -1: lớn nhất ≤ khóa; 1: nhỏ nhất ≥ khóa.
    private func binaryLookupIndex(_ key: CellValue, in vec: [CellValue], ascending: Bool, matchMode: Int) -> Int? {
        var lo = 0, hi = vec.count - 1
        var best: Int? = nil
        while lo <= hi {
            let mid = (lo + hi) / 2
            let c = Self.cmpTotal(vec[mid], key)
            if c == 0 {
                var i = mid
                while i > 0 && Self.cmpTotal(vec[i - 1], key) == 0 { i -= 1 }
                return i
            }
            switch matchMode {
            case -1:
                if c <= 0 {
                    best = mid
                    if ascending { lo = mid + 1 } else { hi = mid - 1 }
                } else if ascending { hi = mid - 1 } else { lo = mid + 1 }
            case 1:
                if c >= 0 {
                    best = mid
                    if ascending { hi = mid - 1 } else { lo = mid + 1 }
                } else if ascending { lo = mid + 1 } else { hi = mid - 1 }
            default:
                if ascending ? c < 0 : c > 0 { lo = mid + 1 } else { hi = mid - 1 }
            }
        }
        return best
    }

    /// Chỉ số cho XLOOKUP match_mode ±1: khớp đúng (đầu tiên) thắng ngay; không thì phần tử
    /// lớn nhất ≤ key (larger == false) hoặc nhỏ nhất ≥ key (larger == true), đầu tiên đạt cực trị đó.
    private func approxIndex(_ key: CellValue, in vec: [CellValue], larger: Bool) -> Int? {
        var best: Int? = nil
        for (i, v) in vec.enumerated() {
            guard let c = FormulaEvaluator.cmpSame(v, key) else { continue }
            if c == 0 { return i }
            guard larger ? c > 0 : c < 0 else { continue }
            if let b = best, let bc = FormulaEvaluator.cmpSame(v, vec[b]), larger ? bc >= 0 : bc <= 0 { continue }
            best = i
        }
        return best
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
        case .array(let rows):
            let nr = rows.count, nc = rows.first?.count ?? 0
            var row = Int(r), col = c.map { Int($0) }
            if col == nil {
                if nr == 1 && nc > 1 { col = row; row = 1 } else if nc == 1 { col = 1 } else { throw fail(FormulaErrors.value) }
            }
            guard row >= 1, row <= nr, let cc = col, cc >= 1, cc <= nc else { throw fail(FormulaErrors.ref) }
            return .scalar(rows[row - 1][cc - 1])
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

    /// M7: WEEKDAY(serial, [return_type]): 1 = Chủ nhật 1..Thứ bảy 7 (mặc định),
    /// 2 = Thứ hai 1..Chủ nhật 7, 3 = Thứ hai 0..Chủ nhật 6; loại khác → #NUM!.
    /// Serial 0 → 7 (thứ Bảy theo cách đếm của Excel); serial âm → #NUM! (dateArg).
    private func weekday(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...2)
        let s = try dateArg(a[0])
        var type = 1
        if a.count == 2 { type = Int(try nm(a[1]).rounded(.towardZero)) }
        let w = ExcelDate.weekday(s) // 1 = Chủ nhật … 7 = Thứ bảy
        switch type {
        case 1: return .number(Double(w))
        case 2: return .number(Double(((w + 5) % 7) + 1))
        case 3: return .number(Double((w + 5) % 7))
        default: throw fail(FormulaErrors.num)
        }
    }

    /// M7: WEEKNUM(serial, [return_type]): tuần 1 là tuần chứa 1/1, trừ loại 21 (ISO 8601:
    /// tuần 1 là tuần chứa thứ Năm đầu tiên). Loại hợp lệ: 1 (tuần bắt đầu Chủ nhật),
    /// 2 (Thứ hai), 11–17 (tuần bắt đầu Thứ hai…Chủ nhật), 21 (ISO). Loại khác → #NUM!;
    /// serial 0 → #NUM! (Excel không có tuần của ngày 1900-01-00).
    private func weeknum(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...2)
        let s = try dateArg(a[0])
        var type = 1
        if a.count == 2 { type = Int(try nm(a[1]).rounded(.towardZero)) }
        guard s >= 1, let c = ExcelDate.civil(fromSerial: s),
              let jan1 = ExcelDate.serial(year: c.year, month: 1, day: 1) else {
            throw fail(FormulaErrors.num)
        }
        let doy = s - jan1 + 1
        /// Thứ trong tuần theo cách đếm Thứ hai 1 … Chủ nhật 7.
        func dowMon1(_ serial: Int) -> Int { ((ExcelDate.weekday(serial) + 5) % 7) + 1 }
        switch type {
        case 1:
            return .number(Double((doy + ExcelDate.weekday(jan1) - 2) / 7 + 1))
        case 2:
            return .number(Double((doy + dowMon1(jan1) - 2) / 7 + 1))
        case 11...17:
            let startDow = type - 10 // 11 = Thứ hai … 17 = Chủ nhật
            let offset = (dowMon1(jan1) - startDow + 7) % 7
            return .number(Double((doy + offset - 1) / 7 + 1))
        case 21:
            let thursday = s + (4 - dowMon1(s))
            guard let tc = ExcelDate.civil(fromSerial: thursday),
                  let jan1Thu = ExcelDate.serial(year: tc.year, month: 1, day: 1) else {
                throw fail(FormulaErrors.num)
            }
            return .number(Double((thursday - jan1Thu) / 7 + 1))
        default:
            throw fail(FormulaErrors.num)
        }
    }

    /// Ngày lễ cho NETWORKDAYS/WORKDAY: số/chuỗi ngày hợp lệ → serial; ô trống, chữ
    /// không phải ngày, TRUE/FALSE → bỏ qua; ô lỗi → lan truyền; số ngoài miền ngày → bỏ qua.
    private func holidaySet(_ e: FormulaExpr) throws -> Set<Int> {
        var out = Set<Int>()
        for v in try grid(e).flat {
            switch v {
            case .empty: continue
            case .number(let n):
                guard n >= 0, n < 2_958_466 else { continue }
                out.insert(Int(n.rounded(.down)))
            case .string(let s):
                if let p = ExcelDate.parse(s) { out.insert(Int(p.rounded(.down))) }
            case .bool: continue
            case .error(let er): throw Abort(value: .error(er))
            }
        }
        return out
    }

    /// Thứ hai–Thứ sáu và không nằm trong danh sách ngày lễ.
    private func isWorkday(_ s: Int, _ holidays: Set<Int>) -> Bool {
        let w = ExcelDate.weekday(s)
        if w == 1 || w == 7 { return false }
        return !holidays.contains(s)
    }

    /// M7: NETWORKDAYS(start, end, [holidays]): số ngày làm việc kể cả hai đầu;
    /// start > end → đếm âm (Excel trả số âm).
    private func networkdays(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...3)
        let s = try dateArg(a[0]), e = try dateArg(a[1])
        let holidays = a.count == 3 ? try holidaySet(a[2]) : Set<Int>()
        let lo = min(s, e), hi = max(s, e)
        var count = 0
        var d = lo
        while d <= hi {
            if isWorkday(d, holidays) { count += 1 }
            d += 1
        }
        return .number(Double(s <= e ? count : -count))
    }

    /// M7: WORKDAY(start, days, [holidays]): ngày làm việc thứ `days` sau/trước start
    /// (bản thân start không tính; days = 0 → giữ nguyên start, kể cả cuối tuần — theo Excel).
    private func workday(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...3)
        let s = try dateArg(a[0])
        let days = Int(try nm(a[1]).rounded(.towardZero))
        let holidays = a.count == 3 ? try holidaySet(a[2]) : Set<Int>()
        var d = s
        var remaining = abs(days)
        let step = days >= 0 ? 1 : -1
        while remaining > 0 {
            d += step
            guard d >= 0, d < 2_958_466 else { throw fail(FormulaErrors.num) }
            if isWorkday(d, holidays) { remaining -= 1 }
        }
        return .number(Double(d))
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

    /// M7: logarit/mũ — quy ước Excel: đối số ≤ 0 cho LN/LOG10/LOG,
    /// cơ số ≤ 0 hoặc = 1 cho LOG → #NUM!; tràn → #NUM!; lỗi đối số lan truyền.
    private func logExp(_ name: String, _ a: [FormulaExpr]) throws -> CellValue {
        switch name {
        case "EXP":
            try need(a, 1...1)
            let r = exp(try nm(a[0]))
            return r.isFinite ? .number(r) : .error(FormulaErrors.num)
        case "LN":
            try need(a, 1...1)
            let x = try nm(a[0])
            guard x > 0 else { throw fail(FormulaErrors.num) }
            return .number(log(x))
        case "LOG10":
            try need(a, 1...1)
            let x = try nm(a[0])
            guard x > 0 else { throw fail(FormulaErrors.num) }
            return .number(log10(x))
        case "LOG":
            try need(a, 1...2)
            let x = try nm(a[0])
            let base = a.count == 2 ? try nm(a[1]) : 10
            guard x > 0, base > 0, base != 1 else { throw fail(FormulaErrors.num) }
            let r = log(x) / log(base)
            return r.isFinite ? .number(r) : .error(FormulaErrors.num)
        default:
            throw fail(FormulaErrors.value)
        }
    }

    // MARK: Thống kê thứ tự

    /// Số trong các đối số theo quy ước của AGGREGATE: lỗi lan truyền; chữ/logic
    /// trong vùng bị bỏ qua; đối số trực tiếp (kể cả chuỗi số) được ép sang số,
    /// ép không được → #VALUE!.
    private func orderStatsNumbers(_ a: [FormulaExpr]) throws -> [Double] {
        var nums: [Double] = []
        for (v, direct) in flatten(a) {
            switch v {
            case .error(let e): throw fail(e)
            case .number(let d): nums.append(d)
            case .bool, .string:
                if direct {
                    guard let n = number(v) else { throw fail(FormulaErrors.value) }
                    nums.append(n)
                }
            case .empty: break
            }
        }
        return nums
    }

    /// M7: MEDIAN — trung vị; không có số nào → #DIV/0! (như Excel).
    private func median(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...255)
        let nums = try orderStatsNumbers(a).sorted()
        guard !nums.isEmpty else { throw fail(FormulaErrors.div0) }
        let m = nums.count / 2
        if nums.count % 2 == 1 { return .number(nums[m]) }
        return .number((nums[m - 1] + nums[m]) / 2)
    }

    /// M7: LARGE/SMALL — phần tử lớn/thứ k (k cắt về nguyên, k < 1 hoặc k > số lượng → #NUM!).
    private func largeSmall(_ large: Bool, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let nums = try orderStatsNumbers([a[0]]).sorted()
        let k = try nm(a[1]).rounded(.towardZero)
        guard k >= 1, k <= Double(nums.count) else { throw fail(FormulaErrors.num) }
        let i = Int(k) - 1
        return .number(large ? nums[nums.count - 1 - i] : nums[i])
    }

    /// M7: RANK — hạng của một số trong danh sách (bỏ qua chữ/logic trong vùng).
    /// order = 0 (mặc định): giảm dần (lớn nhất hạng 1); khác 0: tăng dần.
    /// Số không có trong danh sách, hoặc danh sách rỗng → #N/A; hạng bằng nhau chia sẻ cùng hạng.
    private func rank(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...3)
        let x = try nm(a[0])
        let nums = try orderStatsNumbers([a[1]])
        guard !nums.isEmpty, nums.contains(x) else { throw fail(FormulaErrors.na) }
        let ascending = a.count == 3 ? try nm(a[2]).rounded(.towardZero) != 0 : false
        let beaten = ascending ? nums.filter { $0 < x }.count : nums.filter { $0 > x }.count
        return .number(Double(beaten + 1))
    }

    /// M7: RANK.AVG — hạng trung bình khi bằng nhau: trung bình các vị trí
    /// (1-based) mà giá trị chiếm trong dãy đã sắp theo thứ tự; RANK.EQ là
    /// bí danh của RANK (hạng cao nhất trong nhóm bằng nhau). Không tìm
    /// thấy giá trị hoặc vùng rỗng → #N/A (như RANK).
    private func rankAvg(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...3)
        let x = try nm(a[0])
        let nums = try orderStatsNumbers([a[1]])
        guard !nums.isEmpty, nums.contains(x) else { throw fail(FormulaErrors.na) }
        let ascending = a.count == 3 ? try nm(a[2]).rounded(.towardZero) != 0 : false
        let sorted = ascending ? nums.sorted() : nums.sorted(by: >)
        var sum = 0.0, count = 0.0
        for (i, v) in sorted.enumerated() where v == x {
            sum += Double(i + 1); count += 1
        }
        return .number(sum / count)
    }

    /// M7: PROB — xác suất X nằm trong [lower, upper] theo bảng phân phối rời
    /// rạc (x_range, prob_range). Bỏ upper → xác suất X đúng bằng lower;
    /// bỏ lower → xác suất X ≤ upper; bỏ cả hai → 1. Xác suất ngoài [0, 1],
    /// tổng khác 1 (sai số 1e-9), hoặc lower > upper → #NUM!; hai vùng khác
    /// cỡ lưới hoặc không còn cặp số nào → #N/A (như CORREL).
    private func prob(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...4)
        let (xs, ps) = try pairedNumbers(a[0], a[1])
        guard !xs.isEmpty else { throw fail(FormulaErrors.na) }
        for p in ps { guard p >= 0, p <= 1 else { throw fail(FormulaErrors.num) } }
        guard abs(ps.reduce(0, +) - 1) <= 1e-9 else { throw fail(FormulaErrors.num) }
        let lower = a.count >= 3 ? try nm(a[2]) : nil
        let upper = a.count >= 4 ? try nm(a[3]) : nil
        if let lo = lower, let hi = upper, lo > hi { throw fail(FormulaErrors.num) }
        var total = 0.0
        for (x, p) in zip(xs, ps) {
            if let lo = lower, let hi = upper { if x >= lo, x <= hi { total += p } }
            else if let lo = lower { if x == lo { total += p } }
            else if let hi = upper { if x <= hi { total += p } }
            else { total += p }
        }
        return .number(total)
    }

    /// M7: STANDARDIZE — điểm z: (x − mean) / stddev; stddev = 0 → #DIV/0!.
    private func standardize(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 3...3)
        let x = try nm(a[0]), mean = try nm(a[1]), sd = try nm(a[2])
        guard sd != 0 else { throw fail(FormulaErrors.div0) }
        return .number((x - mean) / sd)
    }

    // MARK: Phân phối chuẩn (M7 lát 15)

    /// Mật độ chuẩn tắc φ(z) = exp(−z²/2) / √(2π).
    private func normalPDF(_ z: Double) -> Double { exp(-z * z / 2) / sqrt(2 * Double.pi) }

    /// Hàm phân phối tích lũy chuẩn tắc Φ(z) qua erf.
    private func normalCDF(_ z: Double) -> Double { 0.5 * (1 + erf(z / sqrt(2))) }

    /// Nghịch đảo Φ theo xấp xỉ Acklam (sai số tuyệt đối ~1.15e-9),
    /// rồi 2 bước Newton với Φ/φ để đạt ~1e-12. p ∈ (0, 1).
    private func normalInv(_ p: Double) -> Double {
        let a = [-3.969683028665376e+01, 2.209460984245205e+02,
                 -2.759285984469534e+02, 1.383577518672690e+02,
                 -3.066479806614716e+01, 2.506628277459239e+00]
        let b = [-5.447609879822406e+01, 1.615858368580409e+02,
                 -1.556989798598866e+02, 6.680131188771972e+01,
                 -1.328068155288572e+01]
        let c = [-7.784894002430293e-03, -3.223964580411365e-01,
                 -2.400758277161838e+00, -2.549732539343734e+00,
                 4.374664141464968e+00, 2.938163982698783e+00]
        let d = [7.784695709041462e-03, 3.224671290700398e-01,
                 2.445134137142996e+00, 3.754408661907416e+00]
        let plow = 0.02425, phigh = 1 - plow
        var x: Double
        if p < plow {
            let q = sqrt(-2 * log(p))
            x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5])
                / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
        } else if p <= phigh {
            let q = p - 0.5, r = q * q
            x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q
                / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
        } else {
            let q = sqrt(-2 * log(1 - p))
            x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5])
                / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
        }
        for _ in 0..<2 {
            let e = normalCDF(x) - p, u = e * sqrt(2 * Double.pi) * exp(x * x / 2)
            x -= u / (1 + x * u / 2)
        }
        return x
    }

    /// M7: NORM.S.DIST(z, cumulative) — Φ(z) hoặc φ(z).
    private func normSDist(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let z = try nm(a[0]), cumulative = try bl(a[1])
        return .number(cumulative ? normalCDF(z) : normalPDF(z))
    }

    /// M7: NORM.DIST(x, mean, sd, cumulative) — Φ((x−mean)/sd)
    /// hoặc φ((x−mean)/sd)/sd. sd ≤ 0 → #NUM!.
    private func normDist(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 4...4)
        let x = try nm(a[0]), mean = try nm(a[1]), sd = try nm(a[2]), cumulative = try bl(a[3])
        guard sd > 0 else { throw fail(FormulaErrors.num) }
        let z = (x - mean) / sd
        return .number(cumulative ? normalCDF(z) : normalPDF(z) / sd)
    }

    /// M7: NORM.S.INV(p) — nghịch đảo Φ. p ∉ (0, 1) → #NUM!.
    private func normSInv(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...1)
        let p = try nm(a[0])
        guard p > 0, p < 1 else { throw fail(FormulaErrors.num) }
        return .number(normalInv(p))
    }

    /// M7: NORM.INV(p, mean, sd) = mean + sd · NORM.S.INV(p).
    private func normInv(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 3...3)
        let p = try nm(a[0]), mean = try nm(a[1]), sd = try nm(a[2])
        guard sd > 0 else { throw fail(FormulaErrors.num) }
        guard p > 0, p < 1 else { throw fail(FormulaErrors.num) }
        return .number(mean + sd * normalInv(p))
    }

    /// Nội suy tuyến tính trên dãy đã sắp: rank = k * (n - 1), k ∈ [0, 1].
    private func percentileValue(_ nums: [Double], _ k: Double) -> Double {
        let rank = k * Double(nums.count - 1)
        let lo = Int(rank.rounded(.down))
        let frac = rank - Double(lo)
        guard lo + 1 < nums.count else { return nums[lo] }
        return nums[lo] * (1 - frac) + nums[lo + 1] * frac
    }

    /// M7: PERCENTILE.INC — phân vị nội suy tuyến tính (k ∈ [0, 1]).
    /// Dữ liệu rỗng hoặc k ngoài [0, 1] → #NUM!; PERCENTILE (không hậu tố) là bí danh cũ, cùng nghĩa.
    private func percentileInc(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let nums = try orderStatsNumbers([a[0]]).sorted()
        let k = try nm(a[1])
        guard !nums.isEmpty, k >= 0, k <= 1 else { throw fail(FormulaErrors.num) }
        return .number(percentileValue(nums, k))
    }

    /// M7: QUARTILE.INC — tứ phân vị qua PERCENTILE.INC với k = quart / 4.
    /// quart cắt về nguyên, ngoài 0...4 → #NUM!; QUARTILE (không hậu tố) là bí danh cũ, cùng nghĩa.
    private func quartileInc(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let nums = try orderStatsNumbers([a[0]]).sorted()
        let quart = try nm(a[1]).rounded(.towardZero)
        guard !nums.isEmpty, quart >= 0, quart <= 4 else { throw fail(FormulaErrors.num) }
        return .number(percentileValue(nums, quart / 4))
    }

    /// Nội suy loại trừ trên dãy đã sắp: rank = k * (n + 1), k ∈ (0, 1) — khác
    /// .INC ở chỗ rank tính trên n + 1 nên hai đầu 0% và 100% không tính được.
    /// rank < 1 hoặc rank > n → #NUM! (Excel).
    private func percentileExcValue(_ nums: [Double], _ k: Double) throws -> Double {
        let rank = k * Double(nums.count + 1)
        guard rank >= 1, rank <= Double(nums.count) else { throw fail(FormulaErrors.num) }
        let lo = Int(rank.rounded(.down))
        let frac = rank - Double(lo)
        guard lo < nums.count else { return nums[lo - 1] }
        if frac == 0 { return nums[lo - 1] }
        return nums[lo - 1] * (1 - frac) + nums[lo] * frac
    }

    /// M7: PERCENTILE.EXC — phân vị loại trừ (k ∈ (0, 1), hai đầu bị loại).
    /// Dữ liệu rỗng, k ngoài (0, 1), hoặc rank rơi ngoài dãy → #NUM!.
    private func percentileExc(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let nums = try orderStatsNumbers([a[0]]).sorted()
        let k = try nm(a[1])
        guard !nums.isEmpty, k > 0, k < 1 else { throw fail(FormulaErrors.num) }
        return .number(try percentileExcValue(nums, k))
    }

    /// M7: QUARTILE.EXC — tứ phân vị qua PERCENTILE.EXC với k = quart / 4.
    /// quart cắt về nguyên, ngoài 0...4 → #NUM!; quart 0 và 4 → #NUM! vì
    /// k = 0 và k = 1 bị loại khỏi phương pháp loại trừ (Excel).
    private func quartileExc(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let nums = try orderStatsNumbers([a[0]]).sorted()
        let quart = try nm(a[1]).rounded(.towardZero)
        guard !nums.isEmpty, quart >= 0, quart <= 4 else { throw fail(FormulaErrors.num) }
        return .number(try percentileExcValue(nums, quart / 4))
    }

    /// M7: STDEV.S / STDEV.P — độ lệch chuẩn mẫu (mẫu số n − 1) / tổng thể
    /// (mẫu số n). STDEV là bí danh cũ của STDEV.S, STDEVP của STDEV.P.
    /// Mẫu cần n ≥ 2, tổng thể cần n ≥ 1; ít hơn → #DIV/0! (Excel).
    /// Tính hai lượt (trung bình rồi tổng bình phương độ lệch) để tránh
    /// mất chính xác khi các giá trị lớn và gần nhau.
    private func stdev(sample: Bool, _ a: [FormulaExpr]) throws -> CellValue {
        let v = try varianceValue(sample: sample, a)
        return .number(v.squareRoot())
    }

    /// M7: VAR.S / VAR.P — phương sai mẫu / tổng thể. VAR là bí danh cũ
    /// của VAR.S, VARP của VAR.P. Cùng quy ước lỗi như STDEV.
    private func variance(sample: Bool, _ a: [FormulaExpr]) throws -> CellValue {
        return .number(try varianceValue(sample: sample, a))
    }

    private func varianceValue(sample: Bool, _ a: [FormulaExpr]) throws -> Double {
        try need(a, 1...255)
        let nums = try orderStatsNumbers(a)
        let n = nums.count
        guard n >= (sample ? 2 : 1) else { throw fail(FormulaErrors.div0) }
        let mean = nums.reduce(0, +) / Double(n)
        let ss = nums.reduce(0) { $0 + ($1 - mean) * ($1 - mean) }
        return ss / Double(sample ? n - 1 : n)
    }

    /// M7: MODE.SNGL — giá trị xuất hiện nhiều nhất; MODE là bí danh cũ.
    /// Không có giá trị nào lặp lại (kể cả không có số nào) → #N/A (Excel).
    /// Hòa nhau → giá trị gặp đầu tiên theo thứ tự đối số. MODE.MULT
    /// (trả về mảng) chưa làm — thuộc phần array/dynamic array sau.
    private func mode(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...255)
        let nums = try orderStatsNumbers(a)
        var counts: [Double: Int] = [:]
        var firstSeen: [Double: Int] = [:]
        for (i, v) in nums.enumerated() {
            counts[v, default: 0] += 1
            if firstSeen[v] == nil { firstSeen[v] = i }
        }
        guard let best = counts.max(by: { x, y in
            if x.value != y.value { return x.value < y.value }
            return (firstSeen[x.key] ?? 0) > (firstSeen[y.key] ?? 0)
        }), best.value > 1 else { throw fail(FormulaErrors.na) }
        return .number(best.key)
    }

    /// M7: AVEDEV — trung bình độ lệch tuyệt đối khỏi trung bình.
    /// Không có số nào → #DIV/0! (như MEDIAN).
    private func avedev(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...255)
        let nums = try orderStatsNumbers(a)
        guard !nums.isEmpty else { throw fail(FormulaErrors.div0) }
        let mean = nums.reduce(0, +) / Double(nums.count)
        let s = nums.reduce(0) { $0 + abs($1 - mean) }
        return .number(s / Double(nums.count))
    }

    /// M7: DEVSQ — tổng bình phương độ lệch khỏi trung bình.
    /// Không có số nào → #DIV/0! (như MEDIAN).
    private func devsq(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...255)
        let nums = try orderStatsNumbers(a)
        guard !nums.isEmpty else { throw fail(FormulaErrors.div0) }
        let mean = nums.reduce(0, +) / Double(nums.count)
        let ss = nums.reduce(0) { $0 + ($1 - mean) * ($1 - mean) }
        return .number(ss)
    }

    /// M7: GEOMEAN — trung bình nhân; bất kỳ giá trị nào ≤ 0 hoặc
    /// không có số nào → #NUM! (Excel).
    private func geomean(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...255)
        let nums = try orderStatsNumbers(a)
        guard !nums.isEmpty, nums.allSatisfy({ $0 > 0 }) else { throw fail(FormulaErrors.num) }
        let logSum = nums.reduce(0) { $0 + log($1) }
        return .number(exp(logSum / Double(nums.count)))
    }

    /// M7: HARMEAN — trung bình điều hòa; bất kỳ giá trị nào ≤ 0 hoặc
    /// không có số nào → #NUM! (Excel).
    private func harmean(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...255)
        let nums = try orderStatsNumbers(a)
        guard !nums.isEmpty, nums.allSatisfy({ $0 > 0 }) else { throw fail(FormulaErrors.num) }
        let invSum = nums.reduce(0) { $0 + 1 / $1 }
        return .number(Double(nums.count) / invSum)
    }

    /// M7: TRIMMEAN — trung bình sau khi cắt đối xứng hai đầu.
    /// percent ∉ [0, 1] → #NUM!; số lượng cắt = percent × n, làm tròn
    /// xuống bội số chẵn gần nhất, chia đều hai đầu (Excel). Không có
    /// số nào, hoặc cắt hết → #DIV/0!.
    private func trimmean(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let nums = try orderStatsNumbers([a[0]]).sorted()
        let percent = try nm(a[1])
        guard percent >= 0, percent <= 1 else { throw fail(FormulaErrors.num) }
        guard !nums.isEmpty else { throw fail(FormulaErrors.div0) }
        let excluded = Int((percent * Double(nums.count)).rounded(.down)) / 2 * 2
        let eachEnd = excluded / 2
        let kept = Array(nums[eachEnd..<(nums.count - eachEnd)])
        guard !kept.isEmpty else { throw fail(FormulaErrors.div0) }
        return .number(kept.reduce(0, +) / Double(kept.count))
    }

    /// M7: SKEW — độ lệch mẫu: n / ((n − 1)(n − 2)) × Σ((x − mean) / s)³,
    /// s là độ lệch chuẩn mẫu. Cần n ≥ 3; s = 0 → #DIV/0! (Excel).
    /// SKEW.P — độ lệch tổng thể: (1/n) × Σ((x − mean) / σ)³, σ là độ
    /// lệch chuẩn tổng thể; σ = 0 (kể cả n = 1) → #DIV/0!.
    private func skew(population: Bool, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...255)
        let nums = try orderStatsNumbers(a)
        let n = nums.count
        guard !nums.isEmpty else { throw fail(FormulaErrors.div0) }
        let mean = nums.reduce(0, +) / Double(n)
        if population {
            let m2 = nums.reduce(0) { $0 + ($1 - mean) * ($1 - mean) } / Double(n)
            guard m2 > 0 else { throw fail(FormulaErrors.div0) }
            let sigma = m2.squareRoot()
            let m3 = nums.reduce(0) { $0 + pow(($1 - mean) / sigma, 3) } / Double(n)
            return .number(m3)
        }
        guard n >= 3 else { throw fail(FormulaErrors.div0) }
        let s2 = nums.reduce(0) { $0 + ($1 - mean) * ($1 - mean) } / Double(n - 1)
        guard s2 > 0 else { throw fail(FormulaErrors.div0) }
        let s = s2.squareRoot()
        let sum = nums.reduce(0) { $0 + pow(($1 - mean) / s, 3) }
        return .number(Double(n) / Double((n - 1) * (n - 2)) * sum)
    }

    /// M7: KURT — độ nhọn thừa mẫu (excess kurtosis):
    /// n(n + 1) / ((n − 1)(n − 2)(n − 3)) × Σ((x − mean) / s)⁴
    /// − 3(n − 1)² / ((n − 2)(n − 3)), s là độ lệch chuẩn mẫu.
    /// Cần n ≥ 4; s = 0 → #DIV/0! (Excel).
    private func kurt(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...255)
        let nums = try orderStatsNumbers(a)
        let n = nums.count
        guard n >= 4 else { throw fail(FormulaErrors.div0) }
        let mean = nums.reduce(0, +) / Double(n)
        let s2 = nums.reduce(0) { $0 + ($1 - mean) * ($1 - mean) } / Double(n - 1)
        guard s2 > 0 else { throw fail(FormulaErrors.div0) }
        let s = s2.squareRoot()
        let m4 = nums.reduce(0) { $0 + pow(($1 - mean) / s, 4) }
        let nn = Double(n)
        let term1 = nn * (nn + 1) / Double((n - 1) * (n - 2) * (n - 3)) * m4
        let term2 = 3 * pow(nn - 1, 2) / Double((n - 2) * (n - 3))
        return .number(term1 - term2)
    }

    /// M7: PERCENTRANK.INC / PERCENTRANK.EXC — hạng phần trăm của x trong dãy.
    /// INC: hạng = vị trí (0-based, nội suy giữa hai giá trị kề) / (n − 1);
    /// EXC: hạng = (vị trí + 1) / (n + 1) nên kết quả không bao giờ chạm 0 hay 1.
    /// Giá trị trùng: khi x khớp đúng một giá trị, lấy hạng của lần xuất hiện
    /// đầu (số giá trị nhỏ hơn x) — golden Excel 2016: PERCENTRANK.INC(A1:A8,5)
    /// = 0.571 với A1:A8 = 2,4,4,4,5,5,7,9. Nhưng khi x nằm GIỮA hai giá trị,
    /// Excel nội suy theo vị trí neo ở lần xuất hiện CUỐI của giá trị dưới
    /// (không phải lần đầu): PERCENTRANK(A1:A8,6) = 0.785 (= 5.5/7, vị trí 5
    /// là lần cuối của 5, nội suy nửa đường tới 7) và
    /// PERCENTRANK.INC(A1:A8,4.5,4) = 0.5 (= 3.5/7, lần cuối của 4 là vị trí 3).
    /// Dùng lần đầu ở đây cho 0.642 và 0.2142 — sai theo golden, đã sửa 05/11.
    /// x ngoài [min, max], hoặc dãy rỗng, hoặc n = 1 → #N/A; significance < 1
    /// → #NUM!; significance mặc định 3 và kết quả bị CẮT (không làm tròn) về
    /// bấy nhiêu chữ số thập phân (Excel). PERCENTRANK (không hậu tố) là bí
    /// danh cũ, cùng nghĩa với .INC.
    private func percentRank(exclusive: Bool, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...3)
        let nums = try orderStatsNumbers([a[0]]).sorted()
        let x = try nm(a[1])
        let sig = a.count == 3 ? try nm(a[2]).rounded(.towardZero) : 3
        guard sig >= 1 else { throw fail(FormulaErrors.num) }
        let n = nums.count
        guard n > 1, let lo = nums.first, let hi = nums.last, x >= lo, x <= hi else {
            throw fail(FormulaErrors.na)
        }
        let rank: Double
        if nums.contains(x) {
            let less = Double(nums.filter { $0 < x }.count)
            rank = exclusive ? (less + 1) / Double(n + 1) : less / Double(n - 1)
        } else {
            let lower = nums.filter { $0 < x }.max()!
            let upper = nums.filter { $0 > x }.min()!
            // Nội suy Excel neo ở lần xuất hiện CUỐI của giá trị dưới và lần
            // ĐẦU của giá trị trên (xem chú thích hàm): với dãy có trùng,
            // vị trí = lastLowerIdx + frac * (firstUpperIdx - lastLowerIdx).
            // Dãy không trùng: khoảng bằng 1 nên trùng công thức cũ.
            let lastLowerIdx = Double(nums.filter { $0 <= lower }.count - 1)
            let firstUpperIdx = Double(nums.filter { $0 < upper }.count)
            let frac = (x - lower) / (upper - lower)
            let pos = lastLowerIdx + frac * (firstUpperIdx - lastLowerIdx)
            rank = exclusive ? (pos + 1) / Double(n + 1) : pos / Double(n - 1)
        }
        guard sig <= 15 else { return .number(rank) }
        let scale = pow(10.0, sig)
        return .number((rank * scale).rounded(.towardZero) / scale)
    }

    // MARK: Hồi quy tuyến tính

    /// Ghép cặp (y, x) theo vị trí cho SLOPE/INTERCEPT/RSQ/FORECAST.
    /// Hai phía khác số ô → #N/A (Excel); ô chữ/logic/rỗng trong vùng
    /// bị bỏ cùng với cặp của nó; đối số trực tiếp được ép sang số,
    /// ép không được → #VALUE!; lỗi lan truyền; không còn cặp nào → #N/A.
    private func pairedNumbers(_ yExpr: FormulaExpr, _ xExpr: FormulaExpr) throws -> ([Double], [Double]) {
        let yg = try grid(yExpr), xg = try grid(xExpr)
        let yv = yg.flat, xv = xg.flat
        guard yv.count == xv.count else { throw fail(FormulaErrors.na) }
        func isNum(_ v: CellValue) -> Bool { if case .number = v { return true }; return false }
        var ys: [Double] = [], xs: [Double] = []
        for (yv1, xv1) in zip(yv, xv) {
            if case .error(let e) = yv1 { throw fail(e) }
            if case .error(let e) = xv1 { throw fail(e) }
            if case .number(let y) = yv1, case .number(let x) = xv1 {
                ys.append(y); xs.append(x); continue
            }
            // Một phía từ vùng mà không phải số → bỏ cả cặp.
            if (yg.sheet != nil && !isNum(yv1)) || (xg.sheet != nil && !isNum(xv1)) { continue }
            guard let y = number(yv1), let x = number(xv1) else { throw fail(FormulaErrors.value) }
            ys.append(y); xs.append(x)
        }
        return (ys, xs)
    }

    /// Hồi quy hai lượt (trung bình rồi tổng chéo) như STDEV, để tránh
    /// mất chính xác khi các giá trị lớn và gần nhau.
    private func regressionValues(_ ys: [Double], _ xs: [Double]) -> (slope: Double, intercept: Double, sxx: Double, sxy: Double, syy: Double) {
        let n = Double(ys.count)
        let mx = xs.reduce(0, +) / n, my = ys.reduce(0, +) / n
        var sxx = 0.0, sxy = 0.0, syy = 0.0
        for (y, x) in zip(ys, xs) {
            let dx = x - mx, dy = y - my
            sxx += dx * dx; sxy += dx * dy; syy += dy * dy
        }
        let slope = sxx == 0 ? 0 : sxy / sxx
        return (slope, my - slope * mx, sxx, sxy, syy)
    }

    /// M7: SLOPE — hệ số góc của đường hồi quy tuyến tính; INTERCEPT —
    /// tung độ gốc của đường đó. Không còn cặp nào → #N/A; phương sai
    /// của x bằng 0 (mọi x bằng nhau, kể cả chỉ 1 cặp) → #DIV/0! (Excel).
    private func slopeIntercept(slope: Bool, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let (ys, xs) = try pairedNumbers(a[0], a[1])
        guard !ys.isEmpty else { throw fail(FormulaErrors.na) }
        let r = regressionValues(ys, xs)
        guard r.sxx != 0 else { throw fail(FormulaErrors.div0) }
        return .number(slope ? r.slope : r.intercept)
    }

    /// M7: RSQ — bình phương hệ số tương quan Pearson (sxy² / (sxx·syy)).
    /// Không còn cặp nào → #N/A; phương sai x hoặc y bằng 0 → #DIV/0! (Excel).
    private func rsq(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let (ys, xs) = try pairedNumbers(a[0], a[1])
        guard !ys.isEmpty else { throw fail(FormulaErrors.na) }
        let r = regressionValues(ys, xs)
        guard r.sxx != 0, r.syy != 0 else { throw fail(FormulaErrors.div0) }
        return .number(r.sxy * r.sxy / (r.sxx * r.syy))
    }

    /// M7: FORECAST.LINEAR — giá trị dự báo tại x trên đường hồi quy
    /// (intercept + slope·x). FORECAST (không hậu tố) là bí danh cũ, cùng
    /// nghĩa. Thứ tự đối số: (x, known_y, known_x) — x đứng trước, khác
    /// SLOPE/INTERCEPT/RSQ. Cùng quy ước lỗi như SLOPE.
    private func forecast(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 3...3)
        let x = try nm(a[0])
        let (ys, xs) = try pairedNumbers(a[1], a[2])
        guard !ys.isEmpty else { throw fail(FormulaErrors.na) }
        let r = regressionValues(ys, xs)
        guard r.sxx != 0 else { throw fail(FormulaErrors.div0) }
        return .number(r.intercept + r.slope * x)
    }

    /// M7: CORREL / PEARSON — hệ số tương quan Pearson (sxy / √(sxx·syy)).
    /// Hai hàm đồng nghĩa trong Excel. Không còn cặp nào → #N/A;
    /// phương sai x hoặc y bằng 0 → #DIV/0! (cùng quy ước lát 11).
    private func correl(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let (ys, xs) = try pairedNumbers(a[0], a[1])
        guard !ys.isEmpty else { throw fail(FormulaErrors.na) }
        let r = regressionValues(ys, xs)
        guard r.sxx != 0, r.syy != 0 else { throw fail(FormulaErrors.div0) }
        return .number(r.sxy / (r.sxx * r.syy).squareRoot())
    }

    /// M7: STEYX — sai số chuẩn của y dự báo trên đường hồi quy:
    /// √(Σ(y − ŷ)² / (n − 2)), với ŷ = intercept + slope·x.
    /// Σ(y − ŷ)² tính qua syy − slope·sxy (dạng hai lượt, kẹp sai số
    /// làm tròn âm nhỏ về 0). Dưới 3 cặp → #DIV/0! (mẫu số n−2 ≤ 0);
    /// x hằng số → #DIV/0!; không còn cặp nào → #N/A.
    private func steyx(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let (ys, xs) = try pairedNumbers(a[0], a[1])
        guard !ys.isEmpty else { throw fail(FormulaErrors.na) }
        let r = regressionValues(ys, xs)
        guard r.sxx != 0 else { throw fail(FormulaErrors.div0) }
        guard ys.count > 2 else { throw fail(FormulaErrors.div0) }
        let sse = max(0, r.syy - r.slope * r.sxy)
        return .number((sse / Double(ys.count - 2)).squareRoot())
    }

    /// M7: COVARIANCE.S / COVARIANCE.P — hiệp phương sai mẫu / tổng thể:
    /// Σ((x − mx)(y − my)) / (n − 1) hoặc / n, tính hai lượt qua trung bình.
    /// Không còn cặp nào → #N/A; mẫu (n − 1) với dưới 2 cặp → #DIV/0!
    /// (Excel); tổng thể với 1 cặp cho 0. Cùng quy ước cặp như CORREL.
    private func covariance(sample: Bool, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let (ys, xs) = try pairedNumbers(a[0], a[1])
        guard !ys.isEmpty else { throw fail(FormulaErrors.na) }
        if sample { guard ys.count > 1 else { throw fail(FormulaErrors.div0) } }
        let n = Double(ys.count)
        let mx = xs.reduce(0, +) / n, my = ys.reduce(0, +) / n
        var sxy = 0.0
        for (y, x) in zip(ys, xs) { sxy += (x - mx) * (y - my) }
        return .number(sxy / (sample ? n - 1 : n))
    }

    /// M7: FISHER — biến đổi Fisher: 0.5 · ln((1 + x) / (1 − x)).
    /// |x| ≥ 1 → #NUM! (Excel); đối số không phải số → #VALUE!.
    private func fisher(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...1)
        let x = try nm(a[0])
        guard x > -1, x < 1 else { throw fail(FormulaErrors.num) }
        return .number(0.5 * log((1 + x) / (1 - x)))
    }

    /// M7: FISHERINV — biến đổi Fisher ngược: tanh(y), tức
    /// (e^(2y) − 1) / (e^(2y) + 1). Dùng tanh để ổn định với |y| lớn
    /// (không tràn như dạng e^(2y) trực tiếp); mọi y thực đều hợp lệ.
    private func fisherinv(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...1)
        return .number(tanh(try nm(a[0])))
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

    /// SUMPRODUCT: nhân từng cặp phần tử của các mảng cùng kích thước rồi cộng.
    /// Ô chữ/logic/rỗng trong mảng tính là 0 (kể cả chuỗi số); lỗi lan truyền; lệch kích thước -> #VALUE!.
    private func sumproduct(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...255)
        let grids = try a.map { try grid($0) }
        let rows = grids[0].nRows, cols = grids[0].nCols
        for g in grids where g.nRows != rows || g.nCols != cols { throw fail(FormulaErrors.value) }
        var sum = 0.0
        for i in 0..<rows {
            for j in 0..<cols {
                var prod = 1.0
                for g in grids {
                    switch g.rows[i][j] {
                    case .number(let d): prod *= d
                    case .error(let e): throw fail(e)
                    default: prod = 0
                    }
                }
                sum += prod
            }
        }
        return .number(sum)
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
