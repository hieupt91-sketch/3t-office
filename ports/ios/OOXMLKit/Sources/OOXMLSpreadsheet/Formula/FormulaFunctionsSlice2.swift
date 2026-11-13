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

    /// Hàm có thể trả về tham chiếu (INDEX, CHOOSE, INDIRECT, OFFSET) — dùng được làm đối số vùng của SUM...
    func callReference(_ name: String, _ args: [FormulaExpr]) -> EvalValue? {
        guard name == "INDEX" || name == "CHOOSE" || name == "INDIRECT" || name == "OFFSET" else { return nil }
        do {
            switch name {
            case "INDEX": return try index(args)
            case "CHOOSE": return try choose(args)
            case "OFFSET": return try offset(args)
            default: return try indirect(args)
            }
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
        // Thông tin / kiểm tra loại (không lan truyền lỗi trong đối số)
        case "ISBLANK", "ISNUMBER", "ISTEXT", "ISLOGICAL", "ISERROR", "ISERR", "ISNA", "ISEVEN", "ISODD",
             "ISNONTEXT", "N", "T", "TYPE", "ERROR.TYPE":
            return try info(name, a)
        case "XOR": return try xor(a)
        // Tra cứu
        case "VLOOKUP": return try vhlookup(a, vertical: true)
        case "HLOOKUP": return try vhlookup(a, vertical: false)
        case "MATCH": return try match(a)
        case "XLOOKUP": return try xlookup(a)
        case "XMATCH": return try xmatch(a)
        // Tham chiếu (hàng/cột)
        case "ROW", "COLUMN": return try rowColumn(name == "ROW", a)
        case "ROWS", "COLUMNS": return try rowsColumns(name == "ROWS", a)
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
        case "TEXTBEFORE": return try textBeforeAfter(before: true, a)
        case "TEXTAFTER": return try textBeforeAfter(before: false, a)
        case "CLEAN": try need(a, 1...1); return .string(cleanText(try tx(a[0])))
        case "PROPER": try need(a, 1...1); return .string(properText(try tx(a[0])))
        case "REPT": return try rept(a)
        case "T": return try tFn(a[0])
        case "CODE": return try codePoint(a, unicode: false)
        case "CHAR": return try charFromCode(a, unicode: false)
        case "UNICODE": return try codePoint(a, unicode: true)
        case "UNICHAR": return try charFromCode(a, unicode: true)
        case "NUMBERVALUE": return try numberValue(a)
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
        // Ngày giờ (M7 lát 48, INBOX-MAC #17)
        case "TIME": return try timeFn(a)
        case "HOUR", "MINUTE", "SECOND": return try hms(name, a)
        case "DATEVALUE": return try dateValue(a)
        case "TIMEVALUE": return try timeValue(a)
        case "DAYS": return try days(a)
        case "DAYS360": return try days360(a)
        case "YEARFRAC": return try yearfrac(a)
        case "ISOWEEKNUM": return try isoWeeknum(a)
        // Toán
        case "ROUNDUP", "ROUNDDOWN": return try roundDir(name == "ROUNDUP", a)
        case "MROUND": return try mround(a)
        case "CEILING": return try ceilingFloor(ceiling: true, math: false, a)
        case "FLOOR": return try ceilingFloor(ceiling: false, math: false, a)
        case "CEILING.MATH": return try ceilingFloor(ceiling: true, math: true, a)
        case "FLOOR.MATH": return try ceilingFloor(ceiling: false, math: true, a)
        case "EVEN": return try evenOdd(even: true, a)
        case "ODD": return try evenOdd(even: false, a)
        case "SIGN":
            try need(a, 1...1)
            let sx = try nm(a[0])
            return .number(sx > 0 ? 1 : sx < 0 ? -1 : 0)
        case "QUOTIENT": return try quotient(a)
        // Toán tổ hợp (M7 lát 49, INBOX-MAC #17)
        case "FACT": return try fact(a)
        case "FACTDOUBLE": return try factDouble(a)
        case "COMBIN": return try combin(a)
        case "COMBINA": return try combina(a)
        case "PERMUT": return try permut(a)
        case "PERMUTATIONA": return try permutationa(a)
        case "GCD": return try gcdFn(a)
        case "LCM": return try lcmFn(a)
        case "MULTINOMIAL": return try multinomial(a)
        // Tổng bình phương (M7 lát 50, INBOX-MAC #17)
        case "SUMSQ": return try sumsq(a)
        case "SUMX2MY2": return try sumX2(a, .x2my2)
        case "SUMX2PY2": return try sumX2(a, .x2py2)
        case "SUMXMY2": return try sumX2(a, .xmy2)
        case "INT": try need(a, 1...1); return .number((try nm(a[0])).rounded(.down))
        case "MOD": return try mod(a)
        case "POWER": return try power(a)
        case "EXP", "LN", "LOG10", "LOG": return try logExp(name, a)
        case "SQRT":
            try need(a, 1...1)
            let x = try nm(a[0])
            return x < 0 ? .error(FormulaErrors.num) : .number(x.squareRoot())
        // Lượng giác / góc / SQRTPI (M7 lát 52, INBOX-MAC #17)
        // Lượng giác nghịch đảo + đối ứng (M7 lát 64)
        case "ACOS", "ASIN", "ATAN", "COS", "SIN", "TAN",
             "ACOSH", "ASINH", "ATANH", "COSH", "SINH", "TANH",
             "ACOT", "ACOTH", "COT", "COTH", "CSC", "CSCH", "SEC", "SECH",
             "DEGREES", "RADIANS", "SQRTPI": return try trig(name, a)
        case "ATAN2": return try atan2Fn(a)
        case "PI": try need(a, 0...0); return .number(.pi)
        case "ROMAN": return try roman(a)
        case "ARABIC": return try arabic(a)
        // Kỹ thuật (M7 lát 53, INBOX-MAC #17)
        case "BIN2DEC": return try baseToDec(a, base: 2, bits: 10)
        case "OCT2DEC": return try baseToDec(a, base: 8, bits: 30)
        case "HEX2DEC": return try baseToDec(a, base: 16, bits: 40)
        case "DEC2BIN": return try decToBase(a, base: 2, bits: 10)
        case "DEC2OCT": return try decToBase(a, base: 8, bits: 30)
        case "DEC2HEX": return try decToBase(a, base: 16, bits: 40)
        case "BIN2HEX": return try baseToBase(a, fromBase: 2, fromBits: 10, toBase: 16, toBits: 40)
        case "BIN2OCT": return try baseToBase(a, fromBase: 2, fromBits: 10, toBase: 8, toBits: 30)
        case "HEX2BIN": return try baseToBase(a, fromBase: 16, fromBits: 40, toBase: 2, toBits: 10)
        case "HEX2OCT": return try baseToBase(a, fromBase: 16, fromBits: 40, toBase: 8, toBits: 30)
        case "OCT2BIN": return try baseToBase(a, fromBase: 8, fromBits: 30, toBase: 2, toBits: 10)
        case "OCT2HEX": return try baseToBase(a, fromBase: 8, fromBits: 30, toBase: 16, toBits: 40)
        case "BITAND": return try bitOp(.and, a)
        case "BITOR": return try bitOp(.or, a)
        case "BITXOR": return try bitOp(.xor, a)
        case "BITLSHIFT": return try bitShift(left: true, a)
        case "BITRSHIFT": return try bitShift(left: false, a)
        case "DELTA": return try delta(a)
        case "GESTEP": return try gestep(a)
        case "ERF": return try erfFn(complement: false, precise: false, a)
        case "ERF.PRECISE": return try erfFn(complement: false, precise: true, a)
        case "ERFC": return try erfFn(complement: true, precise: false, a)
        case "ERFC.PRECISE": return try erfFn(complement: true, precise: true, a)
        // Số phức (M7 lát 54, INBOX-MAC #17)
        case "COMPLEX": return try complexFn(a)
        case "IMREAL", "IMAGINARY", "IMABS", "IMARGUMENT": return try imReal(name, a)
        case "IMCONJUGATE": return try imConjugate(a)
        case "IMSUM": return try imSum(a)
        case "IMSUB": return try imSub(a)
        case "IMPRODUCT": return try imProduct(a)
        case "IMDIV": return try imDiv(a)
        case "IMEXP": return try imExp(a)
        case "IMLN": return try imLn(a)
        case "IMLOG10": return try imLogBase(10, a)
        case "IMLOG2": return try imLogBase(2, a)
        case "IMSQRT": return try imSqrt(a)
        case "IMPOWER": return try imPower(a)
        case "IMSIN", "IMCOS", "IMTAN", "IMSINH", "IMCOSH", "IMTANH",
             "IMSEC", "IMCSC", "IMCOT", "IMSECH", "IMCSCH": return try imTrig(name, a)
        // Đổi đơn vị (M7 lát 55, INBOX-MAC #17)
        case "CONVERT": return try convertFn(a)
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
        case "MAXIFS": return try ifsStat(.max, a)
        case "MINIFS": return try ifsStat(.min, a)
        case "AVERAGEIFS": return try ifsStat(.average, a)
        // Cơ sở dữ liệu (M7 lát 57, INBOX-MAC #17)
        case "DSUM": return try dbAggregate(.sum, a)
        case "DAVERAGE": return try dbAggregate(.average, a)
        case "DCOUNT": return try dbAggregate(.count, a)
        case "DCOUNTA": return try dbAggregate(.countA, a)
        case "DMAX": return try dbAggregate(.max, a)
        case "DMIN": return try dbAggregate(.min, a)
        case "DPRODUCT": return try dbAggregate(.product, a)
        case "DGET": return try dbGet(a)
        case "DVAR": return try dbAggregate(.varS, a)
        case "DVARP": return try dbAggregate(.varP, a)
        case "DSTDEV": return try dbAggregate(.stdevS, a)
        case "DSTDEVP": return try dbAggregate(.stdevP, a)
        // Tài chính
        case "PMT": return try pmt(a)
        case "FV": return try fv(a)
        case "PV": return try pv(a)
        case "NPV": return try npv(a)
        case "IRR": return try irr(a)
        case "RATE": return try rateFn(a)
        case "NPER": return try nperFn(a)
        case "IPMT": return try ipmt(a)
        case "PPMT": return try ppmt(a)
        // Tài chính — giá trị thời gian/lãi suất (M7 lát 56)
        case "CUMIPMT": return try cumulative(principal: false, a)
        case "CUMPRINC": return try cumulative(principal: true, a)
        case "EFFECT": return try effect(a)
        case "NOMINAL": return try nominal(a)
        case "FVSCHEDULE": return try fvSchedule(a)
        case "ISPMT": return try ispmt(a)
        case "MIRR": return try mirr(a)
        case "PDURATION": return try pduration(a)
        case "RRI": return try rri(a)
        case "XNPV": return try xnpv(a)
        case "XIRR": return try xirr(a)
        case "DOLLARDE": return try dollarDeFr(toFraction: false, a)
        case "DOLLARFR": return try dollarDeFr(toFraction: true, a)
        // Tài chính — khấu hao + chứng khoán (M7 lát 58)
        case "DDB": return try ddb(a)
        case "SYD": return try syd(a)
        case "VDB": return try vdb(a)
        case "DISC": return try disc(a)
        case "INTRATE": return try intrate(a)
        case "RECEIVED": return try received(a)
        case "PRICEDISC": return try priceDisc(a)
        case "YIELDDISC": return try yieldDisc(a)
        case "TBILLPRICE": return try tbillPrice(a)
        case "TBILLYIELD": return try tbillYield(a)
        case "TBILLEQ": return try tbillEq(a)
        case "ACCRINTM": return try accrintm(a)
        case "PRICEMAT": return try priceMat(a)
        case "YIELDMAT": return try yieldMat(a)
        // Tài chính — ngày coupon (M7 lát 59, golden batch 7)
        case "COUPPCD": return try coupPcd(a)
        case "COUPNCD": return try coupNcd(a)
        case "COUPNUM": return try coupNum(a)
        case "COUPDAYBS": return try coupDayBs(a)
        case "COUPDAYS": return try coupDays(a)
        case "COUPDAYSNC": return try coupDaysNc(a)
        // Tài chính — trái phiếu có coupon (M7 lát 60, golden batch 7)
        case "PRICE": return try bondPrice(a)
        case "YIELD": return try bondYield(a)
        case "DURATION": return try bondDuration(a)
        case "MDURATION": return try bondMDuration(a)
        case "ACCRINT": return try accrint(a)
        // Tài chính — khấu hao Pháp (M7 lát 61, golden batch 7)
        case "AMORLINC": return try amorLinc(a)
        case "AMORDEGRC": return try amorDegrc(a)
        // Tài chính — khấu hao đường thẳng + trái phiếu kỳ lẻ (M7 lát 62)
        case "SLN": return try sln(a)
        case "ODDFPRICE": return try oddfPrice(a)
        case "ODDFYIELD": return try oddfYield(a)
        case "ODDLPRICE": return try oddlPrice(a)
        case "ODDLYIELD": return try oddlYield(a)
        // Tài chính — khấu hao số dư cố định (M7 lát 63)
        case "DB": return try db(a)
        // Logic
        case "IFERROR", "IFNA": return try ifError(onlyNA: name == "IFNA", a)
        case "IFS": return try ifs(a)
        case "SWITCH": return try switchFn(a)
        // Thông tin chỉ M7 có (các hàm IS*/N/T/TYPE đã về info() sau khi #26 gộp)
        case "ISREF": return try isRef(a)
        case "ISFORMULA": return try isFormula(a)
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
        case .lambda: throw fail(FormulaErrors.value)
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
        case .lambda: throw fail(FormulaErrors.value)
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

    // MARK: OFFSET / ROW / COLUMN / ROWS / COLUMNS (M7 lát 45, INBOX-MAC #17)

    /// OFFSET(tham_chiếu, hàng, cột, [chiều_cao], [chiều_rộng]): dịch tham chiếu
    /// đi (hàng, cột) rồi đổi kích thước; chiều cao/rộng mặc định giữ nguyên kích
    /// thước tham chiếu. Trả `.ref` nên dùng được làm đối số vùng của SUM/AVERAGE/...
    /// - Tham chiếu phải là ô/vùng/tên vùng (kể cả cột/hàng nguyên); số, chuỗi,
    ///   hằng mảng, lambda trần → #VALUE!; lỗi trong đối số lan truyền nguyên vẹn.
    /// - Hàng/cột cắt về nguyên (hướng 0); chiều cao/rộng ≤ 0 → #VALUE!.
    /// - Vùng kết quả ra ngoài bảng (hàng < 1, cột < 1, vượt hàng/cột tối đa)
    ///   → #REF! (kể cả dịch cả cột A:A xuống 1).
    /// Chưa mô phỏng tính volatile của Excel (engine tính lại toàn bộ công thức
    /// mỗi lần recalculate nên không ảnh hưởng kết quả).
    private func offset(_ a: [FormulaExpr]) throws -> EvalValue {
        try need(a, 3...5)
        let (sh, r): (String, CellRange)
        switch eval(a[0]) {
        case .scalar(let v):
            if case .error = v { throw Abort(value: v) }
            throw fail(FormulaErrors.value)
        case .lambda: throw fail(FormulaErrors.value)
        case .array: throw fail(FormulaErrors.value)
        case .ref(let s, let rg): (sh, r) = (s, rg)
        }
        let dRows = try nm(a[1]).rounded(.towardZero)
        let dCols = try nm(a[2]).rounded(.towardZero)
        guard dRows.isFinite, dCols.isFinite,
              abs(dRows) <= Double(CellReference.maxRow),
              abs(dCols) <= Double(CellReference.maxColumn) else { throw fail(FormulaErrors.ref) }
        let refH = r.end.row - r.start.row + 1, refW = r.end.column - r.start.column + 1
        let dH = a.count > 3 ? try nm(a[3]).rounded(.towardZero) : Double(refH)
        let dW = a.count > 4 ? try nm(a[4]).rounded(.towardZero) : Double(refW)
        guard dH.isFinite, dW.isFinite else { throw fail(FormulaErrors.value) }
        guard dH >= 1, dW >= 1 else { throw fail(FormulaErrors.value) }
        guard dH <= Double(CellReference.maxRow),
              dW <= Double(CellReference.maxColumn) else { throw fail(FormulaErrors.ref) }
        let r0 = r.start.row + Int(dRows), c0 = r.start.column + Int(dCols)
        let r1 = r0 + Int(dH) - 1, c1 = c0 + Int(dW) - 1
        guard r0 >= 1, c0 >= 1,
              r1 <= CellReference.maxRow, c1 <= CellReference.maxColumn else { throw fail(FormulaErrors.ref) }
        return .ref(sheet: sh, range: CellRange(CellReference(column: c0, row: r0),
                                                CellReference(column: c1, row: r1)))
    }

    /// ROW([tham_chiếu]) / COLUMN([tham_chiếu]): hàng/cột của ô đầu vùng; không
    /// đối số → hàng/cột của ô chứa công thức. Vùng nhiều ô lấy ô góc trên-trái;
    /// hằng mảng lấy 1 (ngữ cảnh đơn như Excel); số/chuỗi/lambda → #VALUE!;
    /// lỗi trong đối số lan truyền nguyên vẹn.
    private func rowColumn(_ isRow: Bool, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 0...1)
        if a.isEmpty {
            // Vị trí ô chứa công thức: engine đặt luôn intersectAnchor (lát 36);
            // position chỉ có cho ô thuộc công thức mảng CSE.
            guard let pos = intersectAnchor ?? position else { throw fail(FormulaErrors.value) }
            return .number(Double(isRow ? pos.row : pos.column))
        }
        switch eval(a[0]) {
        case .scalar(let v):
            if case .error = v { throw Abort(value: v) }
            throw fail(FormulaErrors.value)
        case .lambda: throw fail(FormulaErrors.value)
        case .array: return .number(1)
        case .ref(_, let r): return .number(Double(isRow ? r.start.row : r.start.column))
        }
    }

    /// ROWS(vùng) / COLUMNS(vùng): số hàng/cột của vùng hoặc hằng mảng; số/chuỗi/
    /// lambda → #VALUE!; lỗi trong đối số lan truyền nguyên vẹn.
    private func rowsColumns(_ isRows: Bool, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...1)
        switch eval(a[0]) {
        case .scalar(let v):
            if case .error = v { throw Abort(value: v) }
            throw fail(FormulaErrors.value)
        case .lambda: throw fail(FormulaErrors.value)
        case .array(let rows):
            return .number(Double(isRows ? rows.count : (rows.first?.count ?? 0)))
        case .ref(_, let r):
            return .number(Double(isRows ? r.end.row - r.start.row + 1
                                         : r.end.column - r.start.column + 1))
        }
    }

    // MARK: INDIRECT (M7 lát 41, INBOX-MAC #17)

    /// INDIRECT(văn_bản_tham_chiếu, [kiểu_a1=TRUE]): dựng tham chiếu từ chuỗi.
    /// - Kiểu A1 (mặc định): chuỗi phải phân tích được thành đúng một ô/vùng/tên
    ///   (dùng chung FormulaParser: "A1", "Data!B2", "'Du lieu'!A1:B2", "A:A",
    ///   tên định nghĩa); biểu thức khác ("1+1", "SUM(A1)") → #REF!.
    /// - Kiểu R1C1 (a1=FALSE): chỉ nhận cú pháp R<hàng>C<cột>, "R"/"C" trần hoặc
    ///   "R[±n]"/"C[±n]" tương đối so với ô công thức (neo = intersectAnchor).
    /// Trả về `.ref` nên dùng được làm đối số vùng của SUM/AVERAGE/...; tên không
    /// tồn tại, sheet không tồn tại, tọa độ ngoài giới hạn → #REF! (Excel cũng
    /// trả #REF! cho tên lạ qua INDIRECT, khác #NAME? của tham chiếu trực tiếp).
    /// Lỗi trong đối số lan truyền nguyên vẹn; đối số a1 không ép được kiểu bool
    /// → #VALUE!. Chưa mô phỏng tính volatile của Excel (engine tính lại toàn
    /// bộ công thức mỗi lần recalculate nên không ảnh hưởng kết quả).
    private func indirect(_ a: [FormulaExpr]) throws -> EvalValue {
        try need(a, 1...2)
        let refText = try tx(a[0])
        let a1 = a.count > 1 ? try bl(a[1]) : true
        if a1 {
            let expr: FormulaExpr
            do { expr = try FormulaParser.parse(refText) } catch { throw fail(FormulaErrors.ref) }
            switch expr {
            case .cell(let sh, let r):
                guard let s = context.resolveSheet(sh) else { throw fail(FormulaErrors.ref) }
                return .ref(sheet: s, range: CellRange(r, r))
            case .range(let sh, let r):
                guard let s = context.resolveSheet(sh) else { throw fail(FormulaErrors.ref) }
                return .ref(sheet: s, range: r)
            case .name(let n):
                if let (sh, r) = context.definedNameTarget(n) {
                    guard let s = context.resolveSheet(sh) else { throw fail(FormulaErrors.ref) }
                    return .ref(sheet: s, range: r)
                }
                if context.definedNameExpr(n) != nil { return eval(expr) }
                throw fail(FormulaErrors.ref)
            default:
                throw fail(FormulaErrors.ref)
            }
        }
        let trimmed = refText.trimmingCharacters(in: .whitespaces)
        let (sheetName, body) = Self.splitSheetPrefix(trimmed)
        let parts = body.split(separator: ":", omittingEmptySubsequences: false).map(String.init)
        guard parts.count == 1 || parts.count == 2 else { throw fail(FormulaErrors.ref) }
        let anchor = intersectAnchor ?? position
        guard let first = Self.parseR1C1Endpoint(parts[0], anchor: anchor) else { throw fail(FormulaErrors.ref) }
        let last = parts.count == 2 ? Self.parseR1C1Endpoint(parts[1], anchor: anchor) : first
        guard let last else { throw fail(FormulaErrors.ref) }
        guard let s = context.resolveSheet(sheetName) else { throw fail(FormulaErrors.ref) }
        return .ref(sheet: s, range: CellRange(first, last))
    }

    /// Tách tiền tố sheet "Tên!" / "'Tên có khoảng trắng'!" khỏi chuỗi tham chiếu
    /// (dấu ! trong cặp nháy đơn không tính). Trả (tên sheet đã bỏ trích, phần còn lại).
    private static func splitSheetPrefix(_ s: String) -> (String?, String) {
        var inQuotes = false
        var idx = s.startIndex
        while idx < s.endIndex {
            let ch = s[idx]
            if ch == "'" {
                let nxt = s.index(after: idx)
                if inQuotes, nxt < s.endIndex, s[nxt] == "'" { idx = s.index(after: nxt); continue }
                inQuotes.toggle()
            } else if ch == "!", !inQuotes {
                var name = String(s[..<idx])
                if name.hasPrefix("'"), name.hasSuffix("'"), name.count >= 2 {
                    name = String(name.dropFirst().dropLast()).replacingOccurrences(of: "''", with: "'")
                }
                return (name, String(s[s.index(after: idx)...]))
            }
            idx = s.index(after: idx)
        }
        return (nil, s)
    }

    /// Một đầu mút R1C1: "R<hàng>C<cột>" tuyệt đối; "R"/"C" trần = cùng hàng/cột
    /// với ô công thức; "R[±n]"/"C[±n]" = lệch tương đối so với ô công thức
    /// (cần neo; không có neo → nil). Ngoài giới hạn hàng/cột → nil.
    private static func parseR1C1Endpoint(_ s: String, anchor: CellReference?) -> CellReference? {
        let u = s.uppercased()
        guard u.hasPrefix("R") else { return nil }
        var i = u.index(after: u.startIndex)
        var row: Int
        if i < u.endIndex, u[i] == "[" {
            guard let close = u[i...].firstIndex(of: "]"),
                  let d = Int(u[u.index(after: i)..<close]),
                  let a = anchor else { return nil }
            row = a.row + d
            i = u.index(after: close)
        } else {
            var digits = ""
            while i < u.endIndex, u[i].isNumber { digits.append(u[i]); i = u.index(after: i) }
            if digits.isEmpty {
                guard let a = anchor else { return nil }
                row = a.row
            } else if let d = Int(digits) {
                row = d
            } else { return nil }
        }
        guard i < u.endIndex, u[i] == "C" else { return nil }
        i = u.index(after: i)
        var col: Int
        if i < u.endIndex, u[i] == "[" {
            guard let close = u[i...].firstIndex(of: "]"),
                  let d = Int(u[u.index(after: i)..<close]),
                  let a = anchor else { return nil }
            col = a.column + d
            i = u.index(after: close)
        } else {
            var digits = ""
            while i < u.endIndex, u[i].isNumber { digits.append(u[i]); i = u.index(after: i) }
            if digits.isEmpty {
                guard let a = anchor else { return nil }
                col = a.column
            } else if let d = Int(digits) {
                col = d
            } else { return nil }
        }
        guard i == u.endIndex,
              (1...CellReference.maxRow).contains(row),
              (1...CellReference.maxColumn).contains(col) else { return nil }
        return CellReference(column: col, row: row)
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
        // Định dạng văn bản "@": trả nguyên văn bản của giá trị.
        if fmt == "@" { return .string(FormulaEvaluator.text(v)) }
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

    /// Giá trị khi TEXTBEFORE/TEXTAFTER không tìm thấy phân_cách: đối số thứ 6
    /// nếu có (ô trống → 0 như XLOOKUP), không thì #N/A.
    private func textNotFound(_ a: [FormulaExpr]) throws -> CellValue {
        if a.count == 6, a[5] != .empty {
            let v = try sc(a[5])
            return v == .empty ? .number(0) : v
        }
        throw fail(FormulaErrors.na)
    }

    /// M7 lát 27: TEXTBEFORE/TEXTAFTER(văn_bản, phân_cách, [lần=1],
    /// [chế_độ_khớp=0], [khớp_cuối=0], [nếu_không_tìm_thấy]): phần trước/sau
    /// lần xuất hiện thứ `lần` của phân_cách. lần dương đếm từ đầu, lần âm
    /// đếm từ cuối; lần = 0 → #VALUE!; chế_độ_khớp chỉ 0 (phân biệt hoa/thường)
    /// hoặc 1, khớp_cuối chỉ 0/1, ngoài ra → #VALUE!; phân_cách rỗng → #VALUE!;
    /// không tìm thấy: trả nếu_không_tìm_thấy nếu có, không thì #N/A;
    /// khớp_cuối = 1 coi đầu/cuối văn bản như một lần xuất hiện nữa (cuối văn
    /// bản khi lần dương, đầu văn bản khi lần âm); lỗi trong đối số lan truyền.
    private func textBeforeAfter(before: Bool, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...6)
        let text = us(try tx(a[0]))
        let delim = us(try tx(a[1]))
        guard !delim.isEmpty else { throw fail(FormulaErrors.value) }
        var instance = 1
        if a.count >= 3, a[2] != .empty {
            let n = try nm(a[2]).rounded(.towardZero)
            guard n.isFinite, n != 0 else { throw fail(FormulaErrors.value) }
            guard abs(n) <= 1_000_000 else { return try textNotFound(a) }
            instance = Int(n)
        }
        var caseInsensitive = false
        if a.count >= 4, a[3] != .empty {
            let m = try nm(a[3]).rounded(.towardZero)
            guard m == 0 || m == 1 else { throw fail(FormulaErrors.value) }
            caseInsensitive = m == 1
        }
        var matchEnd = false
        if a.count >= 5, a[4] != .empty {
            let m = try nm(a[4]).rounded(.towardZero)
            guard m == 0 || m == 1 else { throw fail(FormulaErrors.value) }
            matchEnd = m == 1
        }
        let occ = FormulaEvaluator.findOccurrences(in: text, delimiter: delim, caseInsensitive: caseInsensitive)
        let n = occ.count
        var start: Int? = nil, end: Int? = nil
        if instance > 0 {
            if instance <= n { start = occ[instance - 1]; end = start! + delim.count }
            else if matchEnd, instance == n + 1 { start = text.count; end = text.count }
        } else {
            let k = -instance
            if k <= n { start = occ[n - k]; end = start! + delim.count }
            else if matchEnd, k == n + 1 { start = 0; end = 0 }
        }
        guard let ms = start, let me = end else { return try textNotFound(a) }
        return .string(str(before ? text[..<ms] : text[me...]))
    }

    /// M7 lát 44: CLEAN/PROPER/REPT/T/CODE/CHAR/UNICODE/UNICHAR/NUMBERVALUE.
    /// CLEAN bỏ ký tự điều khiển 0–31 (giữ 127); PROPER viết hoa chữ cái đầu
    /// mỗi từ — ký tự không phải chữ là ranh giới từ, như Excel ("don't" →
    /// "Don'T"); REPT lặp chuỗi, số lần < 0 hoặc kết quả > 32.767 ký tự →
    /// #VALUE!; T chỉ giữ lại chuỗi, mọi kiểu khác → ""; CODE/CHAR theo bảng
    /// Windows-1252 (ký tự ngoài bảng lấy mã Unicode; đối chiếu COM thật là
    /// việc của Windows ở cổng M1 #11); UNICODE/UNICHAR theo mã điểm Unicode
    /// đầy đủ (loại dải surrogate); NUMBERVALUE đổi chuỗi thành số theo dấu
    /// thập phân/nhóm cho trước (mặc định "." / ","), chuỗi rỗng → 0.
    private func cleanText(_ s: String) -> String {
        String(String.UnicodeScalarView(s.unicodeScalars.filter { $0.value >= 32 }))
    }

    private func properText(_ s: String) -> String {
        var out = "", prevLetter = false
        for sc in s.unicodeScalars {
            let isLetter = CharacterSet.letters.contains(sc)
            if isLetter {
                out += prevLetter ? String(sc).lowercased() : String(sc).uppercased()
            } else {
                out.unicodeScalars.append(sc)
            }
            prevLetter = isLetter
        }
        return out
    }

    private func rept(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let s = try tx(a[0])
        if s.isEmpty { return .string("") }
        let n = try nm(a[1]).rounded(.towardZero)
        guard n.isFinite, n >= 0, n <= 32_767 else { throw fail(FormulaErrors.value) }
        guard us(s).count * Int(n) <= 32_767 else { throw fail(FormulaErrors.value) }
        return .string(String(repeating: s, count: Int(n)))
    }

    private func tFn(_ e: FormulaExpr) throws -> CellValue {
        if case .string(let s) = try sc(e) { return .string(s) }
        return .string("")
    }

    /// Dấu câu Windows-1252 ở 128–159 (không có trong Latin-1).
    private static let win1252Punct: [UInt32: UInt32] = [
        0x20AC: 128, 0x201A: 130, 0x0192: 131, 0x201E: 132, 0x2026: 133,
        0x2020: 134, 0x2021: 135, 0x02C6: 136, 0x2030: 137, 0x0160: 138,
        0x2039: 139, 0x0152: 140, 0x017D: 142, 0x2018: 145, 0x2019: 146,
        0x201C: 147, 0x201D: 148, 0x2022: 149, 0x2013: 150, 0x2014: 151,
        0x02DC: 152, 0x2122: 153, 0x0161: 154, 0x203A: 155, 0x0153: 156,
        0x017E: 158, 0x0178: 159,
    ]

    private func codePoint(_ a: [FormulaExpr], unicode: Bool) throws -> CellValue {
        try need(a, 1...1)
        guard let first = us(try tx(a[0])).first else { throw fail(FormulaErrors.value) }
        if unicode { return .number(Double(first.value)) }
        if first.value <= 255 { return .number(Double(first.value)) }
        if let b = Self.win1252Punct[first.value] { return .number(Double(b)) }
        return .number(Double(first.value))
    }

    private func charFromCode(_ a: [FormulaExpr], unicode: Bool) throws -> CellValue {
        try need(a, 1...1)
        let n = try nm(a[0]).rounded(.towardZero)
        guard n.isFinite else { throw fail(FormulaErrors.value) }
        if unicode {
            guard n >= 1, n <= 0x10FFFF else { throw fail(FormulaErrors.value) }
            let v = UInt32(n)
            guard !(0xD800...0xDFFF).contains(v), let sc = Unicode.Scalar(v) else {
                throw fail(FormulaErrors.value)
            }
            return .string(String(sc))
        }
        guard n >= 1, n <= 255 else { throw fail(FormulaErrors.value) }
        let v = UInt32(n)
        if let cp = Self.win1252Punct.first(where: { $0.value == v })?.key,
           let sc = Unicode.Scalar(cp) { return .string(String(sc)) }
        guard let sc = Unicode.Scalar(v) else { throw fail(FormulaErrors.value) }
        return .string(String(sc))
    }

    private func numberValue(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...3)
        let raw = try tx(a[0]).trimmingCharacters(in: .whitespaces)
        if raw.isEmpty { return .number(0) }
        var dec: Unicode.Scalar? = "."
        var grp: Unicode.Scalar? = ","
        if a.count >= 2, a[1] != .empty {
            let s = us(try tx(a[1]))
            guard s.count == 1 else { throw fail(FormulaErrors.value) }
            dec = s[0]
        }
        if a.count >= 3, a[2] != .empty {
            let s = us(try tx(a[2]))
            guard s.count == 1 else { throw fail(FormulaErrors.value) }
            grp = s[0]
        }
        if dec == grp { throw fail(FormulaErrors.value) }
        var body = raw, scale = 1.0
        if body.hasSuffix("%") { body.removeLast(); scale = 0.01 }
        if let g = grp { body = body.replacingOccurrences(of: String(g), with: "") }
        if let d = dec, d != "." { body = body.replacingOccurrences(of: String(d), with: ".") }
        guard FormulaCriterion.isPlainNumber(body), let v = Double(body), v.isFinite else {
            throw fail(FormulaErrors.value)
        }
        return .number(v * scale)
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
    /// Họ hàm kiểm tra loại giá trị. Khác các hàm khác, đối số lỗi KHÔNG làm cả hàm lỗi:
    /// `ISERROR(1/0)` là TRUE, `ERROR.TYPE(1/0)` là 2.
    private func info(_ name: String, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...1)
        let raw = eval(a[0])
        let v = scalar(raw)
        // Vùng/mảng nhiều ô mà scalar() không rút về được (giao ngầm thất bại) → #VALUE!
        // như Excel; ô đơn chứa lỗi thì IS* trả FALSE/kiểm lỗi, không lan truyền.
        // TYPE đã trả 64 ở dưới; N/T/ISEVEN/ISODD tự lan truyền lỗi scalar nên không cần chặn.
        if isMultiValue(raw), case .error(let e) = v, e == FormulaErrors.value, !scalarReduced(raw) {
            switch name {
            case "ISBLANK", "ISNUMBER", "ISTEXT", "ISLOGICAL", "ISERROR", "ISERR", "ISNA", "ISNONTEXT", "ERROR.TYPE":
                throw fail(FormulaErrors.value)
            default: break
            }
        }
        func isError(_ e: String?) -> Bool { if case .error(let x) = v { return e == nil || x == e } else { return false } }
        switch name {
        case "ISBLANK":
            if case .empty = v { return .bool(true) }
            return .bool(false)
        case "ISNUMBER": if case .number = v { return .bool(true) }; return .bool(false)
        case "ISTEXT": if case .string = v { return .bool(true) }; return .bool(false)
        case "ISLOGICAL": if case .bool = v { return .bool(true) }; return .bool(false)
        case "ISNONTEXT": if case .string = v { return .bool(false) }; return .bool(true)
        case "ISERROR": return .bool(isError(nil))
        case "ISNA": return .bool(isError(FormulaErrors.na))
        case "ISERR":
            if case .error(let e) = v { return .bool(e != FormulaErrors.na) }
            return .bool(false)
        case "ISEVEN", "ISODD":
            if case .error = v { return v }
            if case .bool = v { throw fail(FormulaErrors.value) }
            guard let n = number(v), n.isFinite else { throw fail(FormulaErrors.value) }
            let even = Int(n.rounded(.towardZero)) % 2 == 0
            return .bool(name == "ISEVEN" ? even : !even)
        case "N":
            switch v {
            case .number, .error: return v
            case .bool(let b): return .number(b ? 1 : 0)
            default: return .number(0)
            }
        case "T":
            switch v {
            case .string, .error: return v
            default: return .string("")
            }
        case "TYPE":
            if isMultiValue(raw) { return .number(64) }
            switch v {
            case .number, .empty: return .number(1)
            case .string: return .number(2)
            case .bool: return .number(4)
            case .error: return .number(16)
            }
        default: // ERROR.TYPE
            guard case .error(let e) = v else { return .error(FormulaErrors.na) }
            let codes = ["#NULL!": 1, "#DIV/0!": 2, "#VALUE!": 3, "#REF!": 4, "#NAME?": 5, "#NUM!": 6, "#N/A": 7,
                         "#SPILL!": 9, "#CALC!": 14]
            guard let c = codes[e] else { return .error(FormulaErrors.na) }
            return .number(Double(c))
        }
    }

    private func isMultiValue(_ v: EvalValue) -> Bool {
        switch v {
        case .scalar, .lambda: return false
        case .array(let rows): return rows.count > 1 || (rows.first?.count ?? 0) > 1
        case .ref(_, let r): return r.start != r.end
        }
    }

    /// scalar() có rút được vùng/mảng nhiều ô về một giá trị không? Giao ngầm thành công
    /// thì v là giá trị ô giao nhau — kể cả khi ô đó chứa lỗi #VALUE!; thất bại thì v = #VALUE!.
    /// Giữ đồng bộ với scalar() (FormulaEvaluator.swift).
    private func scalarReduced(_ raw: EvalValue) -> Bool {
        switch raw {
        case .ref(_, let r):
            guard r.start != r.end else { return true } // ô đơn: luôn rút được
            guard let pos = position else { return false } // không có vị trí: giao ngầm thất bại
            let col = r.start.column == r.end.column ? r.start.column : pos.column
            let row = r.start.row == r.end.row ? r.start.row : pos.row
            if r.contains(CellReference(column: col, row: row)) { return true }
            if let origin = arrayOrigin {
                let i = pos.row - origin.row, j = pos.column - origin.column
                let t = CellReference(column: r.start.column + j, row: r.start.row + i)
                if i >= 0, j >= 0, r.contains(t) { return true }
            }
            return false
        case .array(let rows):
            guard rows.count > 1 || (rows.first?.count ?? 0) > 1 else { return true }
            guard let pos = position, let origin = arrayOrigin else { return false }
            let i = pos.row - origin.row, j = pos.column - origin.column
            return rows.indices.contains(i) && rows[i].indices.contains(j)
        default:
            return true
        }
    }

    /// XOR: TRUE khi số đối số TRUE là lẻ. Trong vùng/mảng, chữ và ô trống bị bỏ qua; số khác 0 tính là TRUE;
    /// không có giá trị logic/số nào → #VALUE!. Chuỗi viết thẳng làm đối số → #VALUE!.
    private func xor(_ a: [FormulaExpr]) throws -> CellValue {
        guard !a.isEmpty else { throw fail(FormulaErrors.value) }
        var seen = false
        var trues = 0
        for e in a {
            if case .string = e { throw fail(FormulaErrors.value) }
            for v in try grid(e).flat {
                switch v {
                case .bool(let b): seen = true; if b { trues += 1 }
                case .number(let n): seen = true; if n != 0 { trues += 1 }
                case .error: throw Abort(value: v)
                case .string, .empty: continue
                }
            }
        }
        guard seen else { throw fail(FormulaErrors.value) }
        return .bool(trues % 2 == 1)
    }

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
        case 11...17:
            // 11 = tuần bắt đầu Thứ hai (Thứ hai = 1) … 17 = bắt đầu Chủ nhật (Chủ nhật = 1).
            let dowMon1 = ((w + 5) % 7) + 1
            return .number(Double((dowMon1 - (type - 10) + 7) % 7 + 1))
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

    /// Serial ngày/giờ (có phần thập phân) cho HOUR/MINUTE/SECOND: số, chuỗi ngày/giờ,
    /// TRUE/FALSE → 1/0; âm hoặc ≥ 2958466 → #NUM!; chuỗi không phải ngày/giờ → #VALUE!.
    private func serialArg(_ e: FormulaExpr) throws -> Double {
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
        return d
    }

    /// Tách giờ/phút/giây từ serial. Cộng epsilon 1e-4 s để bù sai số nhị phân của
    /// serial Double (tới ~2e-5 s ở serial tối đa; NOW() có độ phân giải ms nên không
    /// bị lật sai), rồi kẹp tổng số giây về [0, 86399].
    private func timeParts(_ serial: Double) -> (h: Int, m: Int, s: Int) {
        let frac = serial - serial.rounded(.down)
        var total = Int((frac * 86400 + 1e-4).rounded(.down))
        if total >= 86400 { total = 86399 }
        if total < 0 { total = 0 }
        return (total / 3600, (total % 3600) / 60, total % 60)
    }

    /// M7: TIME(hour, minute, second): mỗi đối số cắt về nguyên, phải 0...32767
    /// (ngoài miền → #NUM!); tổng số giây cuộn theo ngày (TIME(25,0,0) = 1:00).
    private func timeFn(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 3...3)
        var parts: [Int] = []
        for e in a {
            let t = Int(try nm(e).rounded(.towardZero))
            guard (0...32767).contains(t) else { throw fail(FormulaErrors.num) }
            parts.append(t)
        }
        let total = parts[0] * 3600 + parts[1] * 60 + parts[2]
        return .number(Double(total % 86400) / 86400)
    }

    /// M7: HOUR / MINUTE / SECOND(serial): thành phần giờ của serial (chuỗi ngày/giờ
    /// cũng được); serial âm → #NUM!.
    private func hms(_ name: String, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...1)
        let p = timeParts(try serialArg(a[0]))
        return .number(Double(name == "HOUR" ? p.h : (name == "MINUTE" ? p.m : p.s)))
    }

    /// M7: DATEVALUE(text): chuỗi ngày → serial nguyên (bỏ phần giờ nếu có);
    /// chỉ nhận chuỗi (số/bool → #VALUE!), chuỗi chỉ có giờ → #VALUE!.
    private func dateValue(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...1)
        let v = try sc(a[0])
        guard case .string(let s) = v, let p = ExcelDate.parse(s), p >= 1 else {
            throw fail(FormulaErrors.value)
        }
        return .number(Double(Int(p.rounded(.down))))
    }

    /// M7: TIMEVALUE(text): chuỗi giờ/ngày-giờ → phần thập phân trong ngày
    /// (bỏ phần ngày nếu có); chỉ nhận chuỗi, chuỗi không phải giờ/ngày → #VALUE!.
    private func timeValue(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...1)
        let v = try sc(a[0])
        guard case .string(let s) = v, let p = ExcelDate.parse(s) else {
            throw fail(FormulaErrors.value)
        }
        return .number(p - p.rounded(.down))
    }

    /// M7: DAYS(end, start): hiệu serial đã cắt phần giờ (âm được, khác DATEDIF).
    private func days(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        return .number(Double(try dateArg(a[0]) - dateArg(a[1])))
    }

    /// Số ngày theo quy ước 30/360. US (method FALSE): ngày 31 → 30; ngày cuối tháng 2
    /// của start → 30; end là 31 hoặc cuối tháng 2 mà start < 30 → mùng 1 tháng sau,
    /// còn start = 30 thì end 31 → 30. Châu Âu (method TRUE): chỉ 31 → 30 hai đầu.
    /// (Theo tài liệu Microsoft Learn; engine JS của repo lược bỏ quy tắc tháng 2 của US.)
    private static func days360Value(start: ExcelDate.Civil, end: ExcelDate.Civil, european: Bool) -> Int {
        func lastDayOfFeb(_ c: ExcelDate.Civil) -> Bool {
            c.month == 2 && (c.day == ExcelDate.daysInMonth(c.year, 2) || (c.year == 1900 && c.day == 29))
        }
        var (y1, m1, d1) = (start.year, start.month, start.day)
        var (y2, m2, d2) = (end.year, end.month, end.day)
        if european {
            if d1 == 31 { d1 = 30 }
            if d2 == 31 { d2 = 30 }
        } else {
            if lastDayOfFeb(start) { d1 = 30 } else if d1 == 31 { d1 = 30 }
            if lastDayOfFeb(end) {
                if d1 < 30 {
                    d2 = 1; m2 += 1
                    if m2 > 12 { m2 = 1; y2 += 1 }
                }
            } else if d2 == 31 {
                if d1 < 30 {
                    d2 = 1; m2 += 1
                    if m2 > 12 { m2 = 1; y2 += 1 }
                } else { d2 = 30 }
            }
        }
        return (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1)
    }

    /// M7: DAYS360(start, end, [method]): method TRUE/1 = châu Âu, FALSE/0 = Mỹ
    /// (mặc định); số khác 0/1 → #NUM!, chuỗi không phải TRUE/FALSE → #VALUE!.
    private func days360(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...3)
        let s = try dateArg(a[0]), e = try dateArg(a[1])
        var european = false
        if a.count == 3 {
            let v = try sc(a[2])
            if case .string = v {
                guard let b = bool(v) else { throw fail(FormulaErrors.value) }
                european = b
            } else if let n = number(v) {
                guard n == 0 || n == 1 else { throw fail(FormulaErrors.num) }
                european = n == 1
            } else {
                throw fail(FormulaErrors.value)
            }
        }
        guard let cs = ExcelDate.civil(fromSerial: s), let ce = ExcelDate.civil(fromSerial: e) else {
            throw fail(FormulaErrors.num)
        }
        return .number(Double(Self.days360Value(start: cs, end: ce, european: european)))
    }

    /// M7: YEARFRAC(start, end, [basis]): 0 = 30/360 Mỹ, 1 = actual/actual,
    /// 2 = actual/360, 3 = actual/365, 4 = 30/360 châu Âu. Basis ngoài 0...4 hoặc
    /// không nguyên → #NUM!. Đảo ngày → âm (quy ước của engine JS trong repo).
    private func yearfrac(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...3)
        let s = try dateArg(a[0]), e = try dateArg(a[1])
        var basis = 0
        if a.count == 3 {
            let b = try nm(a[2])
            basis = Int(b.rounded(.towardZero))
            guard (0...4).contains(basis), b == Double(basis) else { throw fail(FormulaErrors.num) }
        }
        switch basis {
        case 2: return .number(Double(e - s) / 360)
        case 3: return .number(Double(e - s) / 365)
        case 1:
            let dir = s <= e ? 1.0 : -1.0
            let lo = min(s, e), hi = max(s, e)
            var frac = 0.0, cursor = lo
            while cursor < hi {
                guard let cc = ExcelDate.civil(fromSerial: cursor) else {
                    throw fail(FormulaErrors.num)
                }
                // Jan 1 năm sau; ở năm 9999 thì serial vượt miền → lấy hi làm cuối đoạn.
                let nextJan1 = ExcelDate.serial(year: cc.year + 1, month: 1, day: 1) ?? hi
                let segEnd = min(nextJan1, hi)
                let yearLen = ExcelDate.isLeap(cc.year) ? 366.0 : 365.0
                frac += Double(segEnd - cursor) / yearLen
                cursor = segEnd
            }
            return .number(frac * dir)
        default:
            guard let cs = ExcelDate.civil(fromSerial: s), let ce = ExcelDate.civil(fromSerial: e) else {
                throw fail(FormulaErrors.num)
            }
            return .number(Double(Self.days360Value(start: cs, end: ce, european: basis == 4)) / 360)
        }
    }

    /// M7: ISOWEEKNUM(date): tuần ISO 8601 (tuần 1 chứa thứ Năm đầu tiên) — dùng
    /// chung nhánh loại 21 của WEEKNUM; serial 0 → #NUM!.
    private func isoWeeknum(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...1)
        return try weeknum([a[0], .number(21)])
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

    /// M7 lát 52: hàm lượng giác + chuyển đổi góc + SQRTPI.
    /// Quy ước Excel: ACOS/ASIN ngoài [-1,1] → #NUM!; ACOSH < 1 → #NUM!;
    /// ATANH |x| ≥ 1 → #NUM!; SQRTPI < 0 → #NUM!; tràn → #NUM!; lỗi đối số lan truyền.
    private func trig(_ name: String, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...1)
        let x = try nm(a[0])
        let r: Double
        switch name {
        case "ACOS":
            guard x >= -1, x <= 1 else { throw fail(FormulaErrors.num) }
            r = acos(x)
        case "ASIN":
            guard x >= -1, x <= 1 else { throw fail(FormulaErrors.num) }
            r = asin(x)
        case "ATAN": r = atan(x)
        case "COS": r = cos(x)
        case "SIN": r = sin(x)
        case "TAN": r = tan(x)
        case "ACOSH":
            guard x >= 1 else { throw fail(FormulaErrors.num) }
            r = acosh(x)
        case "ASINH": r = asinh(x)
        case "ATANH":
            guard x > -1, x < 1 else { throw fail(FormulaErrors.num) }
            r = atanh(x)
        case "COSH": r = cosh(x)
        case "SINH": r = sinh(x)
        case "TANH": r = tanh(x)
        case "DEGREES": r = x * 180 / .pi
        case "RADIANS": r = x * .pi / 180
        case "SQRTPI":
            guard x >= 0 else { throw fail(FormulaErrors.num) }
            r = (x * .pi).squareRoot()
        default: throw fail(FormulaErrors.value)
        }
        return r.isFinite ? .number(r) : .error(FormulaErrors.num)
    }

    /// M7 lát 52: ATAN2 — Excel nhận (x_num, y_num), trả atan2(y, x);
    /// cả hai bằng 0 → #DIV/0!.
    private func atan2Fn(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let x = try nm(a[0]), y = try nm(a[1])
        guard x != 0 || y != 0 else { throw fail(FormulaErrors.div0) }
        let r = atan2(y, x)
        return r.isFinite ? .number(r) : .error(FormulaErrors.num)
    }

    /// M7 lát 52: ROMAN — số 0...3999 (cắt phần lẻ về 0), form 0...4;
    /// ngoài khoảng → #VALUE!. Bảng cặp trừ theo từng form, theo ví dụ
    /// Microsoft Learn (499: CDXCIX / LDVLIV / XDIX / VDIV / ID).
    private func roman(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...2)
        let n = try nm(a[0])
        let form = a.count == 2 ? try nm(a[1]) : 0
        guard n.isFinite, n >= 0, n <= 3999,
              form.isFinite, form >= 0, form <= 4 else { throw fail(FormulaErrors.value) }
        let x = Int(n.rounded(.towardZero))
        let f = Int(form.rounded(.towardZero))
        let tables: [[(Int, String)]] = [
            [(1000, "M"), (900, "CM"), (500, "D"), (400, "CD"), (100, "C"), (90, "XC"),
             (50, "L"), (40, "XL"), (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")],
            [(1000, "M"), (950, "LM"), (500, "D"), (450, "LD"), (100, "C"), (95, "VC"),
             (50, "L"), (45, "VL"), (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")],
            [(1000, "M"), (990, "XM"), (500, "D"), (490, "XD"), (100, "C"), (99, "IC"),
             (50, "L"), (49, "IL"), (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")],
            [(1000, "M"), (995, "VM"), (500, "D"), (495, "VD"), (100, "C"), (99, "IC"),
             (50, "L"), (49, "IL"), (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")],
            [(1000, "M"), (999, "IM"), (500, "D"), (499, "ID"), (100, "C"), (99, "IC"),
             (50, "L"), (49, "IL"), (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I")],
        ]
        var rest = x, out = ""
        for (v, sym) in tables[f] {
            while rest >= v { out += sym; rest -= v }
        }
        return .string(out)
    }

    /// M7 lát 52: ARABIC — cộng dồn từ phải sang, ký tự nhỏ trước lớn thì trừ;
    /// ký tự lạ → #VALUE!; chuỗi rỗng → 0; không phân biệt hoa thường.
    private func arabic(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...1)
        let t = try tx(a[0]).uppercased()
        let values: [Character: Int] = ["I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000]
        var total = 0, prev = 0
        for ch in t.reversed() {
            guard let v = values[ch] else { throw fail(FormulaErrors.value) }
            if v < prev { total -= v } else { total += v; prev = v }
        }
        return .number(Double(total))
    }

    // MARK: Kỹ thuật (M7 lát 53, INBOX-MAC #17)

    /// M7 lát 53: đọc chuỗi số ở cơ số `base` (2/8/16), tối đa 10 ký tự,
    /// trả giá trị có dấu theo bù 2 với `bits` bit (chỉ chuỗi đủ 10 ký tự
    /// mới có dấu: giá trị ≥ 2^(bits-1) → trừ 2^bits); chuỗi rỗng → 0;
    /// ký tự lạ hoặc quá dài → #NUM! (như Excel).
    private func parseBase(_ s: String, base: Int, bits: Int) throws -> Int64 {
        guard s.count <= 10 else { throw fail(FormulaErrors.num) }
        if s.isEmpty { return 0 }
        var v: Int64 = 0
        for ch in s {
            guard let d = ch.hexDigitValue, d < base else { throw fail(FormulaErrors.num) }
            v = v * Int64(base) + Int64(d)
        }
        if s.count == 10, v >= (1 << (bits - 1)) { v -= 1 << bits }
        return v
    }

    /// M7 lát 53: ghi giá trị `v` ở cơ số `base` với `bits` bit bù 2;
    /// `places` (1...10) chêm 0 ở đầu, số âm bỏ qua places; kết quả dài
    /// hơn places → #NUM!.
    private func formatBase(_ v: Int64, base: Int, bits: Int, places: Int?) throws -> String {
        let mask: Int64 = (1 << bits) - 1
        var u = UInt64(bitPattern: v & mask)
        let table: [Character] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
                                  "A", "B", "C", "D", "E", "F"]
        var digits = ""
        repeat {
            digits.append(table[Int(u % UInt64(base))])
            u /= UInt64(base)
        } while u > 0
        var out = String(digits.reversed())
        if v >= 0, let p = places {
            guard p >= 1, p <= 10 else { throw fail(FormulaErrors.num) }
            guard out.count <= p else { throw fail(FormulaErrors.num) }
            while out.count < p { out = "0" + out }
        }
        return out
    }

    /// M7 lát 53: đối số `places` tùy chọn — cắt về nguyên; thiếu hoặc rỗng → nil.
    private func optPlaces(_ a: [FormulaExpr], _ i: Int) throws -> Int? {
        guard i < a.count else { return nil }
        let v = try sc(a[i])
        if v == .empty { return nil }
        guard let d = number(v), d.isFinite else { throw fail(FormulaErrors.value) }
        return Int(d.rounded(.towardZero))
    }

    /// M7 lát 53: BIN2DEC / OCT2DEC / HEX2DEC — chuỗi → số có dấu.
    private func baseToDec(_ a: [FormulaExpr], base: Int, bits: Int) throws -> CellValue {
        try need(a, 1...1)
        return .number(Double(try parseBase(try tx(a[0]), base: base, bits: bits)))
    }

    /// M7 lát 53: DEC2BIN / DEC2OCT / DEC2HEX — số cắt về nguyên, ngoài
    /// khoảng có dấu của `bits` bit → #NUM!.
    private func decToBase(_ a: [FormulaExpr], base: Int, bits: Int) throws -> CellValue {
        try need(a, 1...2)
        let d = try nm(a[0])
        let lo = -Double(1 << (bits - 1)), hi = Double((1 << (bits - 1)) - 1)
        guard d.isFinite, d >= lo, d <= hi else { throw fail(FormulaErrors.num) }
        let v = Int64(d.rounded(.towardZero))
        return .string(try formatBase(v, base: base, bits: bits, places: try optPlaces(a, 1)))
    }

    /// M7 lát 53: BIN2HEX / BIN2OCT / HEX2BIN / HEX2OCT / OCT2BIN / OCT2HEX —
    /// đổi cơ số qua giá trị trung gian; ngoài khoảng đích → #NUM!.
    private func baseToBase(_ a: [FormulaExpr], fromBase: Int, fromBits: Int,
                            toBase: Int, toBits: Int) throws -> CellValue {
        try need(a, 1...2)
        let v = try parseBase(try tx(a[0]), base: fromBase, bits: fromBits)
        let lo = -(1 << (toBits - 1)), hi = (1 << (toBits - 1)) - 1
        guard v >= lo, v <= hi else { throw fail(FormulaErrors.num) }
        return .string(try formatBase(v, base: toBase, bits: toBits, places: try optPlaces(a, 1)))
    }

    private enum BitOp { case and, or, xor }

    /// M7 lát 53: toán tử BIT — đối số phải là số nguyên 0...2^48-1,
    /// ngược lại → #NUM! (như Excel).
    private func bitInt(_ e: FormulaExpr) throws -> UInt64 {
        let d = try nm(e)
        guard d.isFinite, d == d.rounded(.towardZero), d >= 0,
              d < 281474976710656 else { throw fail(FormulaErrors.num) }
        return UInt64(d)
    }

    private func bitOp(_ op: BitOp, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let x = try bitInt(a[0]), y = try bitInt(a[1])
        let r: UInt64
        switch op {
        case .and: r = x & y
        case .or: r = x | y
        case .xor: r = x ^ y
        }
        return .number(Double(r))
    }

    /// M7 lát 53: BITLSHIFT / BITRSHIFT — dịch âm = dịch ngược chiều;
    /// kết quả ≥ 2^48 → #NUM!; độ dịch kẹp ±64 để phép << / >> an toàn.
    private func bitShift(left: Bool, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let v = try bitInt(a[0])
        let sd = try nm(a[1])
        guard sd.isFinite, sd == sd.rounded(.towardZero) else { throw fail(FormulaErrors.num) }
        let s = sd > 63 ? 64 : sd < -63 ? -64 : Int(sd)
        let limit: UInt64 = 281474976710656 // 2^48
        var r: UInt64
        if left {
            if s >= 0 {
                if s >= 48 { guard v == 0 else { throw fail(FormulaErrors.num) }; r = 0 }
                else { r = v << s; guard r < limit else { throw fail(FormulaErrors.num) } }
            } else {
                r = -s >= 64 ? 0 : v >> (-s)
            }
        } else {
            if s >= 0 {
                r = s >= 64 ? 0 : v >> s
            } else {
                if -s >= 48 { guard v == 0 else { throw fail(FormulaErrors.num) }; r = 0 }
                else { r = v << (-s); guard r < limit else { throw fail(FormulaErrors.num) } }
            }
        }
        return .number(Double(r))
    }

    /// M7 lát 53: DELTA — 1 nếu hai số bằng nhau, ngược lại 0; đối số
    /// thứ hai mặc định 0; không phải số → #VALUE!.
    private func delta(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...2)
        let x = try nm(a[0]), y = a.count == 2 ? try nm(a[1]) : 0
        return .number(x == y ? 1 : 0)
    }

    /// M7 lát 53: GESTEP — 1 nếu số thứ nhất ≥ số thứ hai, ngược lại 0;
    /// đối số thứ hai mặc định 0.
    private func gestep(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...2)
        let x = try nm(a[0]), y = a.count == 2 ? try nm(a[1]) : 0
        return .number(x >= y ? 1 : 0)
    }

    /// M7 lát 53: ERF / ERF.PRECISE / ERFC / ERFC.PRECISE.
    /// ERF(lower, [upper]) = erf(upper) − erf(lower); một đối số → erf(x).
    private func erfFn(complement: Bool, precise: Bool, _ a: [FormulaExpr]) throws -> CellValue {
        if precise || complement { try need(a, 1...1) } else { try need(a, 1...2) }
        let lo = try nm(a[0])
        let r: Double
        if complement {
            r = erfc(lo)
        } else if precise || a.count == 1 {
            r = erf(lo)
        } else {
            r = erf(try nm(a[1])) - erf(lo)
        }
        guard r.isFinite else { throw fail(FormulaErrors.num) }
        return .number(r)
    }

    // MARK: Số phức (M7 lát 54, INBOX-MAC #17)

    /// Số phức: (phần thực, phần ảo).
    private typealias Complex = (re: Double, im: Double)

    /// Phân tích chuỗi số phức Excel ("3+4i", "3-4i", "-i", "5j", "4").
    /// Hậu tố i/j (không phân biệt hoa thường); hệ số ảo bỏ trống nghĩa là 1.
    /// Chuỗi không hợp lệ → nil (gọi #NUM! như Excel: "abc", "1+").
    private func parseComplex(_ s: String) -> Complex? {
        var t = s.trimmingCharacters(in: .whitespaces)
        guard !t.isEmpty else { return nil }
        guard t.lowercased().hasSuffix("i") || t.lowercased().hasSuffix("j") else {
            guard let r = Double(t), r.isFinite else { return nil }
            return (r, 0)
        }
        t = String(t.dropLast())
        if t.isEmpty || t == "+" { return (0, 1) }
        if t == "-" { return (0, -1) }
        // Dấu + / - cuối cùng không nằm trong số mũ ("1e+3+4i").
        var sep: String.Index?
        var i = t.index(after: t.startIndex)
        while i < t.endIndex {
            let c = t[i]
            if c == "+" || c == "-" {
                let prev = t[t.index(before: i)]
                if prev != "e" && prev != "E" { sep = i }
            }
            i = t.index(after: i)
        }
        if let sep = sep {
            let rePart = String(t[..<sep]), imPart = String(t[sep...])
            guard let re = Double(rePart), re.isFinite else { return nil }
            if imPart == "+" { return (re, 1) }
            if imPart == "-" { return (re, -1) }
            guard let im = Double(imPart), im.isFinite else { return nil }
            return (re, im)
        }
        guard let im = Double(t), im.isFinite else { return nil }
        return (0, im)
    }

    /// Định dạng số phức theo Excel — mỗi phần theo General 15 chữ số có
    /// nghĩa; phần ảo ±1 viết gọn "i"/"-i"; phần bằng 0 được bỏ.
    private func formatComplex(_ z: Complex, suffix: String = "i") -> String {
        let re = z.re == 0 ? 0 : z.re
        let im = z.im == 0 ? 0 : z.im
        if im == 0 { return FormulaEvaluator.generalNumberString(re) }
        let mag = FormulaEvaluator.generalNumberString(abs(im))
        let imPart = mag == "1" ? suffix : mag + suffix
        if re == 0 { return im < 0 ? "-" + imPart : imPart }
        return FormulaEvaluator.generalNumberString(re) + (im < 0 ? "-" : "+") + imPart
    }

    /// Đọc một đối số thành số phức; chuỗi không hợp lệ → #NUM!.
    private func cx(_ e: FormulaExpr) throws -> Complex {
        guard let z = parseComplex(try tx(e)) else { throw fail(FormulaErrors.num) }
        return z
    }

    /// Chia số phức; mẫu số 0 hoặc tràn số → #NUM!.
    private func complexDiv(_ x: Complex, _ y: Complex) throws -> Complex {
        let d = y.re * y.re + y.im * y.im
        guard d != 0 else { throw fail(FormulaErrors.num) }
        let re = (x.re * y.re + x.im * y.im) / d
        let im = (x.im * y.re - x.re * y.im) / d
        guard re.isFinite, im.isFinite else { throw fail(FormulaErrors.num) }
        return (re, im)
    }

    /// M7 lát 54: COMPLEX(real, imag, [suffix]) — suffix "i"/"j", mặc định
    /// "i"; suffix khác → #VALUE!.
    private func complexFn(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...3)
        let re = try nm(a[0]), im = try nm(a[1])
        var suffix = "i"
        if a.count == 3 {
            let s = try tx(a[2]).lowercased()
            guard s == "i" || s == "j" else { throw fail(FormulaErrors.value) }
            suffix = s
        }
        guard re.isFinite, im.isFinite else { throw fail(FormulaErrors.num) }
        return .string(formatComplex((re, im), suffix: suffix))
    }

    /// M7 lát 54: IMREAL / IMAGINARY / IMABS / IMARGUMENT.
    /// IMARGUMENT(0) → #DIV/0! như Excel.
    private func imReal(_ name: String, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...1)
        let z = try cx(a[0])
        switch name {
        case "IMREAL": return .number(z.re)
        case "IMAGINARY": return .number(z.im)
        case "IMABS": return .number(hypot(z.re, z.im))
        default: // IMARGUMENT
            guard z.re != 0 || z.im != 0 else { throw fail(FormulaErrors.div0) }
            return .number(atan2(z.im, z.re))
        }
    }

    /// M7 lát 54: IMCONJUGATE — đổi dấu phần ảo.
    private func imConjugate(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...1)
        let z = try cx(a[0])
        return .string(formatComplex((z.re, -z.im)))
    }

    /// M7 lát 54: IMSUM — cộng 1...255 số phức; tràn số → #NUM!.
    private func imSum(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...255)
        var re = 0.0, im = 0.0
        for e in a {
            let z = try cx(e)
            re += z.re
            im += z.im
        }
        guard re.isFinite, im.isFinite else { throw fail(FormulaErrors.num) }
        return .string(formatComplex((re, im)))
    }

    /// M7 lát 54: IMSUB — trừ đúng 2 số phức.
    private func imSub(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let x = try cx(a[0]), y = try cx(a[1])
        let re = x.re - y.re, im = x.im - y.im
        guard re.isFinite, im.isFinite else { throw fail(FormulaErrors.num) }
        return .string(formatComplex((re, im)))
    }

    /// M7 lát 54: IMPRODUCT — nhân 1...255 số phức; tràn số → #NUM!.
    private func imProduct(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...255)
        var re = 1.0, im = 0.0
        for e in a {
            let z = try cx(e)
            let nr = re * z.re - im * z.im
            let ni = re * z.im + im * z.re
            re = nr
            im = ni
        }
        guard re.isFinite, im.isFinite else { throw fail(FormulaErrors.num) }
        return .string(formatComplex((re, im)))
    }

    /// M7 lát 54: IMDIV — chia đúng 2 số phức; mẫu số 0 → #NUM!.
    private func imDiv(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        return .string(formatComplex(try complexDiv(try cx(a[0]), try cx(a[1]))))
    }

    /// M7 lát 54: IMEXP — e^z = e^a·(cos b + i·sin b); tràn số → #NUM!.
    private func imExp(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...1)
        let z = try cx(a[0])
        let m = exp(z.re)
        let re = m * cos(z.im), im = m * sin(z.im)
        guard re.isFinite, im.isFinite else { throw fail(FormulaErrors.num) }
        return .string(formatComplex((re, im)))
    }

    /// M7 lát 54: IMLN — ln|z| + i·arg(z); z = 0 → #NUM!.
    private func imLn(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...1)
        let z = try cx(a[0])
        guard z.re != 0 || z.im != 0 else { throw fail(FormulaErrors.num) }
        let re = log(hypot(z.re, z.im)), im = atan2(z.im, z.re)
        guard re.isFinite, im.isFinite else { throw fail(FormulaErrors.num) }
        return .string(formatComplex((re, im)))
    }

    /// M7 lát 54: IMLOG10 / IMLOG2 — IMLN(z)/ln(cơ số); z = 0 → #NUM!.
    private func imLogBase(_ base: Double, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...1)
        let z = try cx(a[0])
        guard z.re != 0 || z.im != 0 else { throw fail(FormulaErrors.num) }
        let lb = log(base)
        let re = log(hypot(z.re, z.im)) / lb, im = atan2(z.im, z.re) / lb
        guard re.isFinite, im.isFinite else { throw fail(FormulaErrors.num) }
        return .string(formatComplex((re, im)))
    }

    /// M7 lát 54: IMSQRT — dạng cực: √r·(cos θ/2 + i·sin θ/2).
    private func imSqrt(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...1)
        let z = try cx(a[0])
        let r = hypot(z.re, z.im).squareRoot()
        let half = atan2(z.im, z.re) / 2
        let re = r * cos(half), im = r * sin(half)
        guard re.isFinite, im.isFinite else { throw fail(FormulaErrors.num) }
        return .string(formatComplex((re, im)))
    }

    /// M7 lát 54: IMPOWER — dạng cực De Moivre r^n·(cos nθ + i·sin nθ)
    /// (như Excel: (2+3i)^3 ra 9.00000000000001i chứ không phải 9i tròn);
    /// 0^n: n > 0 → 0, n ≤ 0 → #NUM!.
    private func imPower(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let z = try cx(a[0]), n = try nm(a[1])
        guard n.isFinite else { throw fail(FormulaErrors.num) }
        let r = hypot(z.re, z.im)
        if r == 0 {
            guard n > 0 else { throw fail(FormulaErrors.num) }
            return .string("0")
        }
        let m = pow(r, n), th = atan2(z.im, z.re) * n
        let re = m * cos(th), im = m * sin(th)
        guard re.isFinite, im.isFinite else { throw fail(FormulaErrors.num) }
        return .string(formatComplex((re, im)))
    }

    /// sin/cos/sinh/cosh trên số phức (công thức góc cộng).
    private func complexSin(_ z: Complex) -> Complex {
        (sin(z.re) * cosh(z.im), cos(z.re) * sinh(z.im))
    }
    private func complexCos(_ z: Complex) -> Complex {
        (cos(z.re) * cosh(z.im), -sin(z.re) * sinh(z.im))
    }
    private func complexSinh(_ z: Complex) -> Complex {
        (sinh(z.re) * cos(z.im), cosh(z.re) * sin(z.im))
    }
    private func complexCosh(_ z: Complex) -> Complex {
        (cosh(z.re) * cos(z.im), sinh(z.re) * sin(z.im))
    }

    /// M7 lát 54: IMSIN / IMCOS / IMTAN / IMSINH / IMCOSH / IMTANH và các
    /// hàm nghịch đảo IMSEC / IMCSC / IMCOT / IMSECH / IMCSCH (= 1/hàm gốc);
    /// mẫu số 0 hoặc tràn số → #NUM!.
    private func imTrig(_ name: String, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...1)
        let z = try cx(a[0])
        let r: Complex
        switch name {
        case "IMSIN": r = complexSin(z)
        case "IMCOS": r = complexCos(z)
        case "IMSINH": r = complexSinh(z)
        case "IMCOSH": r = complexCosh(z)
        case "IMTAN": r = try complexDiv(complexSin(z), complexCos(z))
        case "IMTANH": r = try complexDiv(complexSinh(z), complexCosh(z))
        case "IMSEC": r = try complexDiv((1, 0), complexCos(z))
        case "IMCSC": r = try complexDiv((1, 0), complexSin(z))
        case "IMCOT": r = try complexDiv(complexCos(z), complexSin(z))
        case "IMSECH": r = try complexDiv((1, 0), complexCosh(z))
        case "IMCSCH": r = try complexDiv((1, 0), complexSinh(z))
        default: throw fail(FormulaErrors.value)
        }
        guard r.re.isFinite, r.im.isFinite else { throw fail(FormulaErrors.num) }
        return .string(formatComplex(r))
    }
    /// vd MROUND(1.3, 0.2) = 1.4 chứ không phải 1.2). `mode` áp cho thương x/m.
    private func roundMultiple(_ x: Double, _ m: Double, _ mode: NSDecimalNumber.RoundingMode) -> Double? {
        guard var q = Decimal(string: String(format: "%.15g", x)),
              let dm = Decimal(string: String(format: "%.15g", m)), dm != 0 else { return nil }
        q /= dm
        var r = Decimal()
        NSDecimalRound(&r, &q, 0, mode)
        return NSDecimalNumber(decimal: r * dm).doubleValue
    }

    /// M7 lát 47: MROUND — làm tròn về bội số gần nhất, giữa chừng ra xa 0;
    /// multiple = 0 → 0; khác dấu → #NUM! (như Excel).
    private func mround(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let x = try nm(a[0]), m = try nm(a[1])
        if m == 0 { return .number(0) }
        guard (x >= 0) == (m >= 0) || x == 0 else { throw fail(FormulaErrors.num) }
        guard let r = roundMultiple(x, m, .plain), r.isFinite else { throw fail(FormulaErrors.num) }
        return .number(r)
    }

    /// M7 lát 47: CEILING/FLOOR (cũ) và CEILING.MATH/FLOOR.MATH.
    /// Bản cũ: significance = 0 → 0; khác dấu với number → #NUM!;
    /// CEILING ra xa 0, FLOOR về phía 0. Bản .MATH: significance lấy trị
    /// tuyệt đối, mặc định 1; số âm: mode = 0 → về phía 0, mode ≠ 0 → ra xa 0.
    private func ceilingFloor(ceiling: Bool, math: Bool, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, math ? 1...3 : 2...2)
        let x = try nm(a[0])
        if x == 0 { return .number(0) }
        let sig: Double
        var awayForNegative = false
        if math {
            sig = abs(a.count >= 2 ? try nm(a[1]) : 1)
            if a.count == 3 { awayForNegative = try nm(a[2]).rounded(.towardZero) != 0 }
        } else {
            sig = try nm(a[1])
            guard (x >= 0) == (sig >= 0) else { throw fail(FormulaErrors.num) }
        }
        if sig == 0 { return .number(0) }
        // Thương x/sig: bản cũ luôn dương (cùng dấu); bản .MATH cùng dấu với x.
        // NSDecimalRound: .up = về phía +∞, .down = về phía −∞.
        let mode: NSDecimalNumber.RoundingMode
        if math {
            if ceiling {
                mode = x > 0 || !awayForNegative ? .up : .down
            } else {
                mode = x > 0 || awayForNegative ? .down : .up
            }
        } else {
            mode = ceiling ? .up : .down
        }
        guard let r = roundMultiple(x, sig, mode), r.isFinite else { throw fail(FormulaErrors.num) }
        return .number(r)
    }

    /// M7 lát 47: EVEN/ODD — làm tròn ra xa 0 tới số chẵn/lẻ gần nhất;
    /// EVEN(0) = 0, ODD(0) = 1 (như Excel).
    private func evenOdd(even: Bool, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...1)
        let x = try nm(a[0])
        if x == 0 { return .number(even ? 0 : 1) }
        var n = abs(x).rounded(.up)
        if n.truncatingRemainder(dividingBy: 2) != (even ? 0 : 1) { n += 1 }
        guard n.isFinite else { throw fail(FormulaErrors.num) }
        return .number(x < 0 ? -n : n)
    }

    /// M7 lát 47: QUOTIENT — phần nguyên của phép chia, cắt về 0;
    /// chia cho 0 → #DIV/0!.
    private func quotient(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let n = try nm(a[0]), d = try nm(a[1])
        guard d != 0 else { throw fail(FormulaErrors.div0) }
        let r = (n / d).rounded(.towardZero)
        guard r.isFinite else { throw fail(FormulaErrors.num) }
        return .number(r)
    }

    // MARK: Toán tổ hợp (M7 lát 49)

    /// Số nguyên sau khi cắt về 0; nil khi không hữu hạn hoặc vượt 2^53
    /// (vượt là #NUM! ở các hàm tổ hợp, vì kết quả chắc chắn tràn Double).
    private func truncInt(_ x: Double) -> Int? {
        guard x.isFinite, abs(x) <= 9_007_199_254_740_992 else { return nil }
        return Int(x.rounded(.towardZero))
    }

    /// C(n, k) bằng tích rút gọn, k lấy min(k, n−k). Giả thiết 0 ≤ k ≤ n.
    /// k > 1030 thì chắc chắn tràn (C(2k,k) ≥ 4^k/(2k+1) > 1e308).
    private func combinValue(_ n: Int, _ k: Int) throws -> Double {
        let kk = min(k, n - k)
        guard kk <= 1030 else { throw fail(FormulaErrors.num) }
        var r = 1.0
        if kk > 0 {
            for i in 1...kk {
                r *= Double(n - kk + i) / Double(i)
                guard r.isFinite else { throw fail(FormulaErrors.num) }
            }
        }
        return r
    }

    /// M7 lát 49: FACT — n! với n cắt về nguyên; n < 0 hoặc n > 170 → #NUM!
    /// (171! ≈ 7.3e309 tràn Double).
    private func fact(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...1)
        guard let n = truncInt(try nm(a[0])), n >= 0, n <= 170 else { throw fail(FormulaErrors.num) }
        var r = 1.0
        if n >= 2 { for i in 2...n { r *= Double(i) } }
        return .number(r)
    }

    /// M7 lát 49: FACTDOUBLE — n!! (tích bước 2); n = −1 hoặc 0 → 1,
    /// n < −1 → #NUM!; tràn Double → #NUM!. Không đặt trần 170 cứng như
    /// FACT vì 171!! ≈ 1.1e155 vẫn hữu hạn — chờ COM đối chiếu ở cổng M1 (#11).
    private func factDouble(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...1)
        guard let n = truncInt(try nm(a[0])) else { throw fail(FormulaErrors.num) }
        if n == -1 || n == 0 { return .number(1) }
        guard n > 0 else { throw fail(FormulaErrors.num) }
        var r = 1.0
        var i = n
        while i >= 1 {
            r *= Double(i)
            guard r.isFinite else { throw fail(FormulaErrors.num) }
            i -= 2
        }
        return .number(r)
    }

    /// M7 lát 49: COMBIN — C(n,k); cắt về nguyên; n < 0, k < 0 hoặc k > n → #NUM!.
    private func combin(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        guard let n = truncInt(try nm(a[0])), let k = truncInt(try nm(a[1])),
              n >= 0, k >= 0, k <= n else { throw fail(FormulaErrors.num) }
        return .number(try combinValue(n, k))
    }

    /// M7 lát 49: COMBINA — tổ hợp có lặp C(n+m−1, m); (0,0) → 1;
    /// n < 0, m < 0, hoặc n = 0 với m > 0 → #NUM!.
    private func combina(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        guard let n = truncInt(try nm(a[0])), let m = truncInt(try nm(a[1])),
              n >= 0, m >= 0, !(n == 0 && m > 0) else { throw fail(FormulaErrors.num) }
        if n == 0 { return .number(1) }
        return .number(try combinValue(n + m - 1, m))
    }

    /// M7 lát 49: PERMUT — P(n,k) = n!/(n−k)!; n < 0, k < 0 hoặc k > n → #NUM!.
    /// Vòng lặp có kiểm tra tràn từng bước nên dừng sớm khi tràn (≤ ~1025 bước).
    private func permut(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        guard let n = truncInt(try nm(a[0])), let k = truncInt(try nm(a[1])),
              n >= 0, k >= 0, k <= n else { throw fail(FormulaErrors.num) }
        var r = 1.0
        if k > 0 {
            for i in 0..<k {
                r *= Double(n - i)
                guard r.isFinite else { throw fail(FormulaErrors.num) }
            }
        }
        return .number(r)
    }

    /// M7 lát 49: PERMUTATIONA — n^k; n < 0 hoặc k < 0 → #NUM!.
    private func permutationa(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        guard let n = truncInt(try nm(a[0])), let k = truncInt(try nm(a[1])),
              n >= 0, k >= 0 else { throw fail(FormulaErrors.num) }
        let r = pow(Double(n), Double(k))
        guard r.isFinite else { throw fail(FormulaErrors.num) }
        return .number(r)
    }

    /// Ước chung lớn nhất trên Int64 (Euclid); gcd(0, 0) = 0.
    private func gcdPair(_ a: Int64, _ b: Int64) -> Int64 {
        var x = a < 0 ? -a : a, y = b < 0 ? -b : b
        while y != 0 { let t = x % y; x = y; y = t }
        return x
    }

    /// Số nguyên đã cắt cho GCD/LCM/MULTINOMIAL: lỗi lan truyền; chữ/logic
    /// trong vùng bị bỏ qua; đối số trực tiếp được ép (như orderStatsNumbers);
    /// không có số nào → #VALUE!; vượt 2^53 → #NUM!.
    private func combinInts(_ a: [FormulaExpr]) throws -> [Int] {
        try need(a, 1...255)
        let nums = try orderStatsNumbers(a)
        guard !nums.isEmpty else { throw fail(FormulaErrors.value) }
        return try nums.map {
            guard let n = truncInt($0) else { throw fail(FormulaErrors.num) }
            return n
        }
    }

    /// M7 lát 49: GCD — ước chung lớn nhất; số âm lấy trị tuyệt đối;
    /// GCD(0, 0) = 0; thập phân cắt về nguyên.
    private func gcdFn(_ a: [FormulaExpr]) throws -> CellValue {
        let ns = try combinInts(a)
        var g: Int64 = 0
        for n in ns { g = gcdPair(g, Int64(n)) }
        return .number(Double(g))
    }

    /// M7 lát 49: LCM — bội chung nhỏ nhất; số âm → #NUM!; có 0 → 0;
    /// tràn Int64 → #NUM!.
    private func lcmFn(_ a: [FormulaExpr]) throws -> CellValue {
        let ns = try combinInts(a)
        guard !ns.contains(where: { $0 < 0 }) else { throw fail(FormulaErrors.num) }
        if ns.contains(0) { return .number(0) }
        var l: Int64 = 1
        for n in ns {
            let v = Int64(n), g = gcdPair(l, v), q = l / g
            let (r, overflow) = q.multipliedReportingOverflow(by: v)
            guard !overflow else { throw fail(FormulaErrors.num) }
            l = r
        }
        return .number(Double(l))
    }

    /// M7 lát 49: MULTINOMIAL — (Σn)! / Π(n!); số âm → #NUM!;
    /// tính qua tích các COMBIN để tránh sai số chia giai thừa
    /// (MULTINOMIAL(2,3,4) = 1260 đúng, không phải 1259.99…).
    private func multinomial(_ a: [FormulaExpr]) throws -> CellValue {
        let ns = try combinInts(a)
        guard !ns.contains(where: { $0 < 0 }) else { throw fail(FormulaErrors.num) }
        var remaining = ns.reduce(0, +)
        var r = 1.0
        for n in ns {
            r *= try combinValue(remaining, n)
            guard r.isFinite else { throw fail(FormulaErrors.num) }
            remaining -= n
        }
        return .number(r)
    }

    /// M7 lát 50: SUMSQ — tổng bình phương; 1–255 đối số; không có số
    /// nào → 0 (vùng rỗng/chỉ chữ → 0, như SUM); lỗi lan truyền; chữ/logic
    /// trực tiếp ép kiểu như SUM; tràn số → #NUM!.
    private func sumsq(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...255)
        var total = 0.0
        for x in try orderStatsNumbers(a) {
            total += x * x
            guard total.isFinite else { throw fail(FormulaErrors.num) }
        }
        return .number(total)
    }

    private enum SumX2Kind { case x2my2, x2py2, xmy2 }

    /// M7 lát 50: SUMX2MY2 / SUMX2PY2 / SUMXMY2 — tổng theo từng cặp
    /// (x²−y²) / (x²+y²) / (x−y)². Đúng 2 đối số; hai phía khác số lượng
    /// giá trị → #N/A (theo tài liệu Microsoft Learn và pairSum của engine
    /// JS trong repo); lỗi lan truyền; cặp có một phía không phải số trong
    /// vùng thì bỏ qua, còn đối số trực tiếp không phải số thì ép kiểu
    /// hoặc #VALUE! (quy ước của pairedNumbers).
    private func sumX2(_ a: [FormulaExpr], _ kind: SumX2Kind) throws -> CellValue {
        try need(a, 2...2)
        let xg = try grid(a[0]), yg = try grid(a[1])
        let xv = xg.flat, yv = yg.flat
        guard xv.count == yv.count else { throw fail(FormulaErrors.na) }
        func isNum(_ v: CellValue) -> Bool { if case .number = v { return true }; return false }
        var total = 0.0
        for (x, y) in zip(xv, yv) {
            if case .error(let e) = x { throw fail(e) }
            if case .error(let e) = y { throw fail(e) }
            if case .number(let xd) = x, case .number(let yd) = y {
                total += sumX2Term(xd, yd, kind)
                guard total.isFinite else { throw fail(FormulaErrors.num) }
                continue
            }
            // Một phía từ vùng mà không phải số → bỏ cả cặp.
            if (xg.sheet != nil && !isNum(x)) || (yg.sheet != nil && !isNum(y)) { continue }
            guard let xd = number(x), let yd = number(y) else { throw fail(FormulaErrors.value) }
            total += sumX2Term(xd, yd, kind)
            guard total.isFinite else { throw fail(FormulaErrors.num) }
        }
        return .number(total)
    }

    private func sumX2Term(_ x: Double, _ y: Double, _ kind: SumX2Kind) -> Double {
        switch kind {
        case .x2my2: return x * x - y * y
        case .x2py2: return x * x + y * y
        case .xmy2: return (x - y) * (x - y)
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

    /// M7 lát 42: MAXIFS / MINIFS / AVERAGEIFS — thống kê có điều kiện nhiều tiêu chí.
    /// Dùng chung mặt nạ với SUMIFS: vùng tiêu chí phải cùng kích thước với vùng giá trị,
    /// không thì #VALUE!; cặp tiêu chí lẻ (thiếu đối số) → #VALUE!.
    /// Ô lỗi trong vùng giá trị mà được khớp thì lan truyền (như SUMIFS); ô chữ/logic/rỗng
    /// trong vùng giá trị bị bỏ qua. Không có ô số nào khớp: MAXIFS/MINIFS → 0 (Excel),
    /// AVERAGEIFS → #DIV/0! (như AVERAGEIF).
    private enum IfsStat { case max, min, average }

    private func ifsStat(_ mode: IfsStat, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 3...Int.max)
        let value = try grid(a[0])
        let m = try mask(a, from: 1, shape: (value.nRows, value.nCols))
        var total = 0.0, n = 0
        var best: Double?
        for r in 0..<m.rows {
            for c in 0..<m.cols where m.mask[r][c] {
                switch value.rows[r][c] {
                case .error(let e): return .error(e)
                case .number(let d):
                    total += d; n += 1
                    switch mode {
                    case .max: best = best.map { Swift.max($0, d) } ?? d
                    case .min: best = best.map { Swift.min($0, d) } ?? d
                    case .average: break
                    }
                default: break
                }
            }
        }
        switch mode {
        case .max, .min: return .number(best ?? 0)
        case .average:
            guard n > 0 else { return .error(FormulaErrors.div0) }
            return .number(total / Double(n))
        }
    }

    // MARK: Cơ sở dữ liệu (M7 lát 57, INBOX-MAC #17)

    /// Ô trống theo nghĩa của engine JS: .empty hoặc chuỗi "".
    private func dbBlank(_ v: CellValue) -> Bool {
        if case .empty = v { return true }
        if case .string(let s) = v, s.isEmpty { return true }
        return false
    }

    /// Ép một giá trị về số theo Number() của JS: số giữ nguyên, bool → 1/0,
    /// chuỗi → Double sau khi trim (nil nếu không phải số), còn lại → nil.
    private func dbNumeric(_ v: CellValue) -> Double? {
        switch v {
        case .number(let d): return d
        case .bool(let b): return b ? 1 : 0
        case .string(let s): return Double(s.trimmingCharacters(in: .whitespaces))
        default: return nil
        }
    }

    /// _equals của engine JS: trống bằng trống; nếu một phía là số thì ép cả
    /// hai về số (chuỗi số được, bool = 1/0, chuỗi không phải số thì không bằng);
    /// còn lại so chuỗi không phân biệt hoa/thường.
    private func dbEquals(_ cell: CellValue, _ crit: CellValue) -> Bool {
        let cb = dbBlank(cell), rb = dbBlank(crit)
        if cb || rb { return cb && rb }
        if case .number = cell, let a = dbNumeric(cell), let b = dbNumeric(crit) { return a == b }
        if case .number = crit, let a = dbNumeric(cell), let b = dbNumeric(crit) { return a == b }
        return FormulaEvaluator.text(cell).lowercased() == FormulaEvaluator.text(crit).lowercased()
    }

    /// So sánh có thứ tự kiểu _compareValues của JS: hai số so số; còn lại so
    /// chuỗi (không phân biệt hoa/thường, sắp tự nhiên như localeCompare numeric:true).
    private func dbCompare(_ cell: CellValue, _ other: CellValue) -> Int {
        if case .number(let x) = cell, case .number(let y) = other {
            return x < y ? -1 : (x > y ? 1 : 0)
        }
        let c = FormulaEvaluator.text(cell).compare(FormulaEvaluator.text(other),
                                                   options: [.caseInsensitive, .numeric])
        return c == .orderedAscending ? -1 : (c == .orderedDescending ? 1 : 0)
    }

    /// Khớp phần đầu (không neo cuối) kiểu matchCell của JS: `*` = chuỗi bất kỳ,
    /// `?` = đúng 1 ký tự, còn lại là ký tự thường; không phân biệt hoa/thường.
    /// Khác WildcardPattern: không có thoát `~`, và chỉ neo đầu (tiêu chí "App"
    /// khớp ô "Apple" — quy ước riêng của hàm cơ sở dữ liệu trong Excel).
    private func dbPrefixMatch(pattern: String, text: String) -> Bool {
        let p = Array(pattern.lowercased().unicodeScalars)
        let t = Array(text.lowercased().unicodeScalars)
        func rec(_ pi: Int, _ ti: Int) -> Bool {
            if pi == p.count { return true }
            if p[pi] == "*" {
                var k = ti
                while k <= t.count {
                    if rec(pi + 1, k) { return true }
                    k += 1
                }
                return false
            }
            if p[pi] == "?" { return ti < t.count && rec(pi + 1, ti + 1) }
            return ti < t.count && t[ti] == p[pi] && rec(pi + 1, ti + 1)
        }
        return rec(0, 0)
    }

    /// Tiêu chí bắt đầu bằng toán tử so sánh, theo _matchesCriteria của JS:
    /// vế phải là số nếu trim xong vẫn là số, còn lại là chuỗi; "=" dùng
    /// _equals (không ký tự đại diện — "=A*" không khớp "Apple"); "<>"/"!="
    /// phủ định; "=" riêng lẻ khớp ô trống, "<>"/"!=" riêng lẻ khớp ô không trống.
    private func dbOperatorMatch(op: String, rest: String, cell: CellValue) -> Bool {
        if rest.isEmpty {
            switch op {
            case "=": return dbBlank(cell)
            case "<>", "!=": return !dbBlank(cell)
            default: break
            }
        }
        let trimmed = rest.trimmingCharacters(in: .whitespaces)
        let right: CellValue
        if !trimmed.isEmpty, let d = Double(trimmed), d.isFinite { right = .number(d) }
        else { right = .string(rest) }
        switch op {
        case "=": return dbEquals(cell, right)
        case "<>", "!=": return !dbEquals(cell, right)
        case "<": return dbCompare(cell, right) < 0
        case ">": return dbCompare(cell, right) > 0
        case "<=": return dbCompare(cell, right) <= 0
        default: return dbCompare(cell, right) >= 0
        }
    }

    /// Khớp một ô database với một ô tiêu chí, theo matchCell của engine JS.
    /// Tiêu chí số/bool so bằng _equals; tiêu chí chuỗi có toán tử đi qua
    /// _matchesCriteria; văn bản trần khớp phần đầu; tiêu chí lỗi coi như
    /// văn bản là mã lỗi; ô tiêu chí trống đã được bỏ qua ở vòng lặp ngoài.
    private func dbMatchCell(_ cell: CellValue, _ criterion: CellValue) -> Bool {
        switch criterion {
        case .number, .bool:
            return dbEquals(cell, criterion)
        case .error(let e):
            return dbPrefixMatch(pattern: e, text: FormulaEvaluator.text(cell))
        case .string(let s):
            for op in ["<=", ">=", "<>", "!=", "=", "<", ">"] where s.hasPrefix(op) {
                return dbOperatorMatch(op: op, rest: String(s.dropFirst(op.count)), cell: cell)
            }
            return dbPrefixMatch(pattern: s, text: FormulaEvaluator.text(cell))
        case .empty:
            return true
        }
    }

    /// Chọn các giá trị ở cột field của những hàng database khớp tiêu chí.
    /// Đúng 3 đối số, nếu không → #VALUE!; database/criteria rỗng → #VALUE!;
    /// field là số (cắt phần lẻ, 1-based, ngoài khoảng → #VALUE!) hoặc tên
    /// cột (không phân biệt hoa/thường, không có → #VALUE!); field trống →
    /// #VALUE!; lỗi ở field lan truyền. Nhiều dòng tiêu chí = OR, trong một
    /// dòng = AND; dòng tiêu chí toàn trống → khớp; tiêu chí trỏ cột không có
    /// trong database → dòng đó không khớp; criteria chỉ có tiêu đề → khớp tất cả.
    private func dbSelect(_ a: [FormulaExpr]) throws -> [CellValue] {
        try need(a, 3...3)
        let db = try grid(a[0])
        let crit = try grid(a[2])
        guard db.nRows >= 1, crit.nRows >= 1 else { throw fail(FormulaErrors.value) }
        let headers = db.rows[0].map { FormulaEvaluator.text($0).lowercased() }
        let field = try sc(a[1])
        let column: Int
        switch field {
        case .number(let d):
            guard d.isFinite, d >= 1, d <= Double(headers.count) else { throw fail(FormulaErrors.value) }
            column = Int(d) - 1
        case .error(let e):
            throw fail(e)
        default:
            let name = FormulaEvaluator.text(field).lowercased()
            guard !name.isEmpty, let idx = headers.firstIndex(of: name) else { throw fail(FormulaErrors.value) }
            column = idx
        }
        let critHeaders = crit.rows[0].map { FormulaEvaluator.text($0).lowercased() }
        var out: [CellValue] = []
        for r in 1..<db.nRows {
            let matched: Bool
            if crit.nRows == 1 {
                matched = true
            } else {
                matched = crit.rows[1...].contains { row in
                    for k in 0..<critHeaders.count {
                        guard k < row.count else { continue }
                        let c = row[k]
                        if dbBlank(c) { continue }
                        guard let dbCol = headers.firstIndex(of: critHeaders[k]) else { return false }
                        if !dbMatchCell(db.rows[r][dbCol], c) { return false }
                    }
                    return true
                }
            }
            if matched { out.append(db.rows[r][column]) }
        }
        return out
    }

    /// Như dbSelect, cộng thêm: lỗi trong cột field của hàng khớp lan truyền
    /// nguyên vẹn (dfn của JS — áp dụng cho mọi hàm D*, kể cả DCOUNT).
    private func dbValues(_ a: [FormulaExpr]) throws -> [CellValue] {
        let values = try dbSelect(a)
        for v in values { if case .error(let e) = v { throw fail(e) } }
        return values
    }

    /// M7 lát 57: DSUM / DAVERAGE / DCOUNT / DCOUNTA / DMAX / DMIN /
    /// DPRODUCT / DVAR / DVARP / DSTDEV / DSTDEVP. Chỉ tính trên số
    /// (DCOUNTA đếm mọi ô không trống); không có số nào: DSUM/DCOUNT → 0,
    /// DAVERAGE → #DIV/0!, DMAX/DMIN/DPRODUCT → 0, phương sai mẫu cần n ≥ 2,
    /// phương sai tổng thể cần n ≥ 1, ít hơn → #DIV/0!. Phương sai tính hai
    /// lượt (trung bình rồi tổng bình phương độ lệch) như VAR/STDEV.
    private enum DbAgg { case sum, average, count, countA, max, min, product, varS, varP, stdevS, stdevP }

    private func dbAggregate(_ mode: DbAgg, _ a: [FormulaExpr]) throws -> CellValue {
        let values = try dbValues(a)
        let nums: [Double] = values.compactMap { if case .number(let d) = $0 { return d } else { return nil } }
        switch mode {
        case .sum: return .number(nums.reduce(0, +))
        case .average:
            guard !nums.isEmpty else { throw fail(FormulaErrors.div0) }
            return .number(nums.reduce(0, +) / Double(nums.count))
        case .count: return .number(Double(nums.count))
        case .countA: return .number(Double(values.filter { !dbBlank($0) }.count))
        case .max: return .number(nums.max() ?? 0)
        case .min: return .number(nums.min() ?? 0)
        case .product: return .number(nums.isEmpty ? 0 : nums.reduce(1, *))
        case .varS, .varP, .stdevS, .stdevP:
            let sample = mode == .varS || mode == .stdevS
            guard nums.count >= (sample ? 2 : 1) else { throw fail(FormulaErrors.div0) }
            let mean = nums.reduce(0, +) / Double(nums.count)
            let ss = nums.reduce(0) { $0 + ($1 - mean) * ($1 - mean) }
            let v = ss / Double(sample ? nums.count - 1 : nums.count)
            return .number(mode == .varS || mode == .varP ? v : v.squareRoot())
        }
    }

    /// M7 lát 57: DGET — giá trị duy nhất ở cột field của hàng khớp.
    /// 0 hàng → #VALUE!, >1 hàng → #NUM!, đúng 1 hàng: ô trống → 0, còn lại
    /// giữ nguyên giá trị (số/chuỗi/bool).
    private func dbGet(_ a: [FormulaExpr]) throws -> CellValue {
        let values = try dbValues(a)
        guard !values.isEmpty else { throw fail(FormulaErrors.value) }
        guard values.count == 1 else { throw fail(FormulaErrors.num) }
        return dbBlank(values[0]) ? .number(0) : values[0]
    }

    // MARK: Logic

    /// ISREF: TRUE khi đối số là tham chiếu (ô/vùng/tên vùng/INDIRECT); còn lại FALSE.
    /// Lỗi không phải tham chiếu → FALSE (không lan truyền).
    private func isRef(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...1)
        if case .ref = eval(a[0]) { return .bool(true) }
        return .bool(false)
    }

    /// ISFORMULA: TRUE khi ô đơn được tham chiếu chứa công thức; vùng nhiều ô hoặc
    /// đối số không phải tham chiếu → #VALUE!; lỗi đối số lan truyền nguyên vẹn.
    private func isFormula(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...1)
        switch eval(a[0]) {
        case .ref(let sh, let r):
            guard r.start == r.end else { throw fail(FormulaErrors.value) }
            return .bool(context.formulaExpr(sheet: sh, ref: r.start) != nil)
        case .scalar(let v):
            if case .error = v { throw Abort(value: v) }
            throw fail(FormulaErrors.value)
        default:
            throw fail(FormulaErrors.value)
        }
    }

    // MARK: Tài chính (M7 lát 23: PMT/FV/PV/NPV/IRR/RATE/NPER/IPMT/PPMT)

    /// Đối số số tùy chọn: thiếu hoặc rỗng → mặc định.
    private func optNum(_ a: [FormulaExpr], _ i: Int, _ def: Double) throws -> Double {
        guard i < a.count else { return def }
        let v = try sc(a[i])
        if v == .empty { return def }
        guard let d = number(v) else { throw fail(FormulaErrors.value) }
        return d
    }

    /// type: 0 cuối kỳ (mặc định), 1 đầu kỳ; khác → #NUM!.
    private func payType(_ a: [FormulaExpr], _ i: Int) throws -> Double {
        let t = try optNum(a, i, 0)
        guard t == 0 || t == 1 else { throw fail(FormulaErrors.num) }
        return t
    }

    /// Lãi kép (1 + rate)^nper; rate ≤ -1 hoặc tràn → #NUM!.
    private func growth(_ rate: Double, _ nper: Double) throws -> Double {
        guard rate > -1 else { throw fail(FormulaErrors.num) }
        let g = pow(1 + rate, nper)
        guard g.isFinite, g > 0 else { throw fail(FormulaErrors.num) }
        return g
    }

    /// PMT dạng số thuần (dùng chung cho IPMT/PPMT).
    private func pmtValue(rate: Double, nper: Double, pv: Double, fv: Double, type: Double) throws -> Double {
        if rate == 0 { return -(pv + fv) / nper }
        let g = try growth(rate, nper)
        return -(pv * g + fv) * rate / (g - 1) / (1 + rate * type)
    }

    /// PMT(rate, nper, pv, [fv], [type]): khoản trả định kỳ (âm = tiền ra).
    /// nper = 0, rate ≤ -1 hoặc type ngoài {0, 1} → #NUM!.
    private func pmt(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 3...5)
        let rate = try nm(a[0]), nper = try nm(a[1]), pv = try nm(a[2])
        let fv = try optNum(a, 3, 0), type = try payType(a, 4)
        guard nper != 0 else { throw fail(FormulaErrors.num) }
        let res = try pmtValue(rate: rate, nper: nper, pv: pv, fv: fv, type: type)
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// FV(rate, nper, pmt, [pv], [type]): giá trị tương lai.
    private func fv(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 3...5)
        let rate = try nm(a[0]), nper = try nm(a[1]), pmt = try nm(a[2])
        let pv = try optNum(a, 3, 0), type = try payType(a, 4)
        let res: Double
        if rate == 0 {
            res = -(pv + pmt * nper)
        } else {
            let g = try growth(rate, nper)
            res = -(pv * g + pmt * (1 + rate * type) * (g - 1) / rate)
        }
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// PV(rate, nper, pmt, [fv], [type]): giá trị hiện tại.
    private func pv(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 3...5)
        let rate = try nm(a[0]), nper = try nm(a[1]), pmt = try nm(a[2])
        let fv = try optNum(a, 3, 0), type = try payType(a, 4)
        let res: Double
        if rate == 0 {
            res = -(fv + pmt * nper)
        } else {
            let g = try growth(rate, nper)
            res = -(fv + pmt * (1 + rate * type) * (g - 1) / rate) / g
        }
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// NPV(rate, value1, [value2...]): chiết khấu từng giá trị về hiện tại, giá trị
    /// đầu tiên chiết khấu 1 kỳ. Chữ/logic trong vùng bị bỏ qua (như SUM); đối số
    /// trực tiếp không phải số → #VALUE!; rate = -1 → #DIV/0!.
    private func npv(_ a: [FormulaExpr]) throws -> CellValue {
        guard a.count >= 2 else { throw fail(FormulaErrors.value) }
        let rate = try nm(a[0])
        guard rate != -1 else { throw fail(FormulaErrors.div0) }
        let vals = try orderStatsNumbers(Array(a.dropFirst()))
        var sum = 0.0
        for (i, v) in vals.enumerated() { sum += v / pow(1 + rate, Double(i + 1)) }
        guard sum.isFinite else { throw fail(FormulaErrors.num) }
        return .number(sum)
    }

    /// IRR(values, [guess]): lãi suất nội bộ — nghiệm NPV(r) = 0. Cần ít nhất một
    /// giá trị âm và một dương; Newton từ guess, dự phòng chia đôi khi Newton không
    /// hội tụ; không tìm được nghiệm → #NUM!.
    private func irr(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 1...2)
        let vals = try orderStatsNumbers([a[0]])
        let guess = try optNum(a, 1, 0.1)
        guard vals.count >= 2, vals.contains(where: { $0 > 0 }), vals.contains(where: { $0 < 0 }) else {
            throw fail(FormulaErrors.num)
        }
        guard guess > -1 else { throw fail(FormulaErrors.num) }
        func npvAt(_ r: Double) -> Double {
            vals.enumerated().reduce(0) { $0 + $1.element / pow(1 + r, Double($1.offset)) }
        }
        func dNpvAt(_ r: Double) -> Double {
            vals.enumerated().reduce(0) { $0 - Double($1.offset) * $1.element / pow(1 + r, Double($1.offset + 1)) }
        }
        var r = guess
        for _ in 0..<100 {
            let f = npvAt(r), d = dNpvAt(r)
            guard f.isFinite, d.isFinite, d != 0 else { break }
            let next = r - f / d
            guard next.isFinite, next > -1 else { break }
            if abs(next - r) < 1e-10 { return .number(next) }
            r = next
        }
        var lo = -0.999999, hi = 10.0
        var flo = npvAt(lo)
        if !flo.isFinite { throw fail(FormulaErrors.num) }
        if flo == 0 { return .number(lo) }
        var prevR = lo, prevF = flo, step = lo
        var bracket: (Double, Double)? = nil
        while step < hi {
            let nextR = min(step + 0.5, hi)
            let f = npvAt(nextR)
            if f.isFinite {
                if f == 0 { return .number(nextR) }
                if prevF * f < 0 { bracket = (prevR, nextR); break }
                prevR = nextR; prevF = f
            }
            step = nextR
        }
        guard let (a0, b0) = bracket else { throw fail(FormulaErrors.num) }
        var x0 = a0, x1 = b0, f0 = npvAt(x0)
        for _ in 0..<200 {
            let mid = (x0 + x1) / 2
            let fm = npvAt(mid)
            guard fm.isFinite else { throw fail(FormulaErrors.num) }
            if abs(fm) < 1e-12 || (x1 - x0) < 1e-12 { return .number(mid) }
            if f0 * fm <= 0 { x1 = mid } else { x0 = mid; f0 = fm }
        }
        return .number((x0 + x1) / 2)
    }

    /// RATE(nper, pmt, pv, [fv], [type], [guess]): lãi suất mỗi kỳ — nghiệm của
    /// phương trình giá trị tương lai bằng 0. Newton với đạo hàm số, dự phòng chia
    /// đôi khi Newton không hội tụ; không tìm được nghiệm → #NUM!.
    private func rateFn(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 3...6)
        let nper = try nm(a[0]), pmt = try nm(a[1]), pv = try nm(a[2])
        let fv = try optNum(a, 3, 0), type = try payType(a, 4)
        let guess = try optNum(a, 5, 0.1)
        guard nper != 0, guess > -1 else { throw fail(FormulaErrors.num) }
        func f(_ r: Double) -> Double {
            if r == 0 { return pv + pmt * nper + fv }
            let g = pow(1 + r, nper)
            return pv * g + pmt * (1 + r * type) * (g - 1) / r + fv
        }
        var r = guess
        for _ in 0..<100 {
            let fr = f(r)
            guard fr.isFinite else { break }
            let h = 1e-7 * max(1, abs(r))
            let d = (f(r + h) - f(r - h)) / (2 * h)
            guard d.isFinite, d != 0 else { break }
            let next = r - fr / d
            guard next.isFinite, next > -1 else { break }
            if abs(next - r) < 1e-12 { return .number(next) }
            r = next
        }
        var lo = -0.999999, hi = 10.0
        var flo = f(lo)
        if !flo.isFinite { throw fail(FormulaErrors.num) }
        if flo == 0 { return .number(lo) }
        var prevR = lo, prevF = flo, step = lo
        var bracket: (Double, Double)? = nil
        while step < hi {
            let nextR = min(step + 0.5, hi)
            let fv2 = f(nextR)
            if fv2.isFinite {
                if fv2 == 0 { return .number(nextR) }
                if prevF * fv2 < 0 { bracket = (prevR, nextR); break }
                prevR = nextR; prevF = fv2
            }
            step = nextR
        }
        guard let (a0, b0) = bracket else { throw fail(FormulaErrors.num) }
        var x0 = a0, x1 = b0, f0 = f(x0)
        for _ in 0..<200 {
            let mid = (x0 + x1) / 2
            let fm = f(mid)
            guard fm.isFinite else { throw fail(FormulaErrors.num) }
            if abs(fm) < 1e-9 || (x1 - x0) < 1e-12 { return .number(mid) }
            if f0 * fm <= 0 { x1 = mid } else { x0 = mid; f0 = fm }
        }
        return .number((x0 + x1) / 2)
    }

    /// NPER(rate, pmt, pv, [fv], [type]): số kỳ. rate = 0 → -(pv+fv)/pmt; pmt = 0
    /// hoặc tỉ số log không hợp lệ → #NUM!.
    private func nperFn(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 3...5)
        let rate = try nm(a[0]), pmt = try nm(a[1]), pv = try nm(a[2])
        let fv = try optNum(a, 3, 0), type = try payType(a, 4)
        guard rate > -1 else { throw fail(FormulaErrors.num) }
        let res: Double
        if rate == 0 {
            guard pmt != 0 else { throw fail(FormulaErrors.num) }
            res = -(pv + fv) / pmt
        } else {
            let num = pmt * (1 + rate * type) - fv * rate
            let den = pmt * (1 + rate * type) + pv * rate
            guard den != 0, num / den > 0 else { throw fail(FormulaErrors.num) }
            res = log(num / den) / log(1 + rate)
        }
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// Số dư nợ sau `per - 1` kỳ (dùng chung cho IPMT/PPMT).
    private func loanBalance(rate: Double, per: Int, nper: Double, pv: Double, fv: Double, type: Double) throws -> Double {
        let p = try pmtValue(rate: rate, nper: nper, pv: pv, fv: fv, type: type)
        let g = pow(1 + rate, Double(per - 1))
        return pv * g + p * (1 + rate * type) * (g - 1) / rate
    }

    /// IPMT(rate, per, nper, pv, [fv], [type]): phần lãi của kỳ `per`.
    /// M7 lát 56: type = 1 thì kỳ 1 lãi 0, các kỳ sau chia (1 + rate)
    /// (Excel 2016; trước đây thiếu hệ số này nên type = 1 sai).
    private func ipmt(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 4...6)
        let rate = try nm(a[0])
        let per = Int(try nm(a[1]).rounded(.towardZero))
        let nper = try nm(a[2]), pv = try nm(a[3])
        let fv = try optNum(a, 4, 0), type = try payType(a, 5)
        guard nper != 0, per >= 1, Double(per) <= nper, rate > -1 else { throw fail(FormulaErrors.num) }
        guard rate != 0 else { return .number(0) }
        if type == 1, per == 1 { return .number(0) }
        let bal = try loanBalance(rate: rate, per: per, nper: nper, pv: pv, fv: fv, type: type)
        let res = -bal * rate / (1 + rate * type)
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// PPMT(rate, per, nper, pv, [fv], [type]): phần gốc của kỳ `per` = PMT - IPMT.
    /// M7 lát 56: chia (1 + rate*type) như IPMT (type = 0 không đổi).
    private func ppmt(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 4...6)
        let rate = try nm(a[0])
        let per = Int(try nm(a[1]).rounded(.towardZero))
        let nper = try nm(a[2]), pv = try nm(a[3])
        let fv = try optNum(a, 4, 0), type = try payType(a, 5)
        guard nper != 0, per >= 1, Double(per) <= nper, rate > -1 else { throw fail(FormulaErrors.num) }
        let p = try pmtValue(rate: rate, nper: nper, pv: pv, fv: fv, type: type)
        guard rate != 0 else { return .number(p) }
        if type == 1, per == 1 { return .number(p) }
        let bal = try loanBalance(rate: rate, per: per, nper: nper, pv: pv, fv: fv, type: type)
        let res = p + bal * rate / (1 + rate * type)
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    // MARK: Tài chính — giá trị thời gian/lãi suất (M7 lát 56, port từ
    // apps/sheet/formula-functions-financial.js, đối chiếu golden batch 5)

    /// FV dạng số thuần theo đúng thứ tự phép tính của engine JS (dùng cho CUMIPMT).
    private func fvOf(rate: Double, nper: Double, pmt: Double, pv: Double, type: Double) -> Double {
        if rate == 0 { return -(pv + pmt * nper) }
        let g = pow(1 + rate, nper)
        return -(pv * g + pmt * (1 + rate * type) * (g - 1) / rate)
    }

    /// PMT dạng số thuần theo đúng thứ tự phép tính của engine JS (dùng cho CUMPRINC).
    private func pmtOf(rate: Double, nper: Double, pv: Double, fv: Double, type: Double) -> Double {
        if rate == 0 { return -(pv + fv) / nper }
        let g = pow(1 + rate, nper)
        return -(pv * g + fv) * rate / ((1 + rate * type) * (g - 1))
    }

    /// IPMT dạng số thuần theo Excel: kỳ 1 với type = 1 lãi 0; các kỳ khác
    /// FV(rate, per-1, pmt, pv, type) * rate / (1 + rate*type).
    /// (Engine JS của repo sai chỗ này với type = 1 — xem báo cáo lát 56.)
    private func ipmtOf(rate: Double, per: Int, nper: Double, pv: Double, fv: Double, type: Double) -> Double {
        if type == 1, per == 1 { return 0 }
        let p = pmtOf(rate: rate, nper: nper, pv: pv, fv: fv, type: type)
        return fvOf(rate: rate, nper: Double(per - 1), pmt: p, pv: pv, type: type) * rate / (1 + rate * type)
    }

    /// CUMIPMT/CUMPRINC(rate, nper, pv, start, end, type): tổng lãi / tổng gốc
    /// các kỳ start...end. rate ≤ 0, nper ≤ 0, pv ≤ 0, start < 1, end < start,
    /// end > nper hoặc type ngoài {0, 1} → #NUM! (như Excel 2016).
    private func cumulative(principal: Bool, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 6...6)
        let rate = try nm(a[0])
        let n = Int((try nm(a[1])).rounded(.towardZero))
        let pv = try nm(a[2])
        let start = Int((try nm(a[3])).rounded(.towardZero))
        let end = Int((try nm(a[4])).rounded(.towardZero))
        let type = Int((try nm(a[5])).rounded(.towardZero))
        guard rate > 0, n > 0, pv > 0, start >= 1, end >= start, end <= n, type == 0 || type == 1 else {
            throw fail(FormulaErrors.num)
        }
        var total = 0.0
        for per in start...end {
            let interest = ipmtOf(rate: rate, per: per, nper: Double(n), pv: pv, fv: 0, type: Double(type))
            guard interest.isFinite else { throw fail(FormulaErrors.num) }
            if principal {
                let payment = pmtOf(rate: rate, nper: Double(n), pv: pv, fv: 0, type: Double(type))
                guard payment.isFinite else { throw fail(FormulaErrors.num) }
                total += payment - interest
            } else {
                total += interest
            }
        }
        guard total.isFinite else { throw fail(FormulaErrors.num) }
        return .number(total)
    }

    /// EFFECT(rate, nper): lãi suất hiệu dụng năm. rate ≤ 0 hoặc nper < 1 → #NUM!.
    private func effect(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let rate = try nm(a[0])
        let n = (try nm(a[1])).rounded(.towardZero)
        guard rate > 0, n >= 1 else { throw fail(FormulaErrors.num) }
        let res = pow(1 + rate / n, n) - 1
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// NOMINAL(effect, nper): lãi suất danh nghĩa năm. effect ≤ 0 hoặc nper < 1 → #NUM!.
    private func nominal(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let eff = try nm(a[0])
        let n = (try nm(a[1])).rounded(.towardZero)
        guard eff > 0, n >= 1 else { throw fail(FormulaErrors.num) }
        let res = n * (pow(1 + eff, 1 / n) - 1)
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// FVSCHEDULE(principal, schedule): gốc nhân lần lượt (1 + lãi suất từng kỳ).
    /// Ô trống trong vùng lãi suất được bỏ qua; chữ không phải số → #VALUE!.
    private func fvSchedule(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        var result = try nm(a[0])
        for v in try grid(a[1]).flat {
            switch v {
            case .empty: continue
            case .error(let e): throw fail(e)
            case .number(let d): result *= 1 + d
            case .string:
                guard let d = number(v) else { throw fail(FormulaErrors.value) }
                result *= 1 + d
            case .bool: throw fail(FormulaErrors.value)
            }
            guard result.isFinite else { throw fail(FormulaErrors.num) }
        }
        return .number(result)
    }

    /// ISPMT(rate, per, nper, pv): lãi của kỳ `per` khi gốc trả đều.
    /// nper = 0 → #DIV/0! (Excel 2016 trả số cả khi per = 0, theo golden).
    private func ispmt(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 4...4)
        let rate = try nm(a[0]), per = try nm(a[1]), nper = try nm(a[2]), pv = try nm(a[3])
        guard nper != 0 else { throw fail(FormulaErrors.div0) }
        let res = pv * rate * (per / nper - 1)
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// MIRR(values, finance_rate, reinvest_rate): lãi suất nội bộ điều chỉnh.
    /// Cần ≥ 2 giá trị, ít nhất một dương và một âm, không thì #DIV/0!.
    /// Chữ/logic/ô trống trong vùng bị bỏ qua (như các hàm thống kê); lỗi lan truyền.
    private func mirr(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 3...3)
        let vals = try orderStatsNumbers([a[0]])
        let fr = try nm(a[1]), rr = try nm(a[2])
        let n = vals.count
        guard n >= 2, vals.contains(where: { $0 > 0 }), vals.contains(where: { $0 < 0 }) else {
            throw fail(FormulaErrors.div0)
        }
        func npvAt(_ rate: Double, _ list: [Double]) -> Double {
            list.enumerated().reduce(0) { $0 + $1.element / pow(1 + rate, Double($1.offset + 1)) }
        }
        let pos = vals.map { $0 > 0 ? $0 : 0 }
        let neg = vals.map { $0 < 0 ? $0 : 0 }
        let fvPos = -npvAt(rr, pos) * pow(1 + rr, Double(n))
        let pvNeg = npvAt(fr, neg) * (1 + fr)
        guard pvNeg != 0, fvPos / pvNeg > 0 else { throw fail(FormulaErrors.num) }
        let res = pow(fvPos / pvNeg, 1 / Double(n - 1)) - 1
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// PDURATION(rate, pv, fv): số kỳ để đạt giá trị tương lai. rate/pv/fv ≤ 0 → #NUM!.
    private func pduration(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 3...3)
        let rate = try nm(a[0]), pv = try nm(a[1]), fv = try nm(a[2])
        guard rate > 0, pv > 0, fv > 0 else { throw fail(FormulaErrors.num) }
        let res = (log(fv) - log(pv)) / log(1 + rate)
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// RRI(nper, pv, fv): lãi suất tương đương. nper ≤ 0 hoặc pv = 0 → #NUM!;
    /// lũy thừa không xác định (cơ số âm với mũ lẻ) → #NUM!.
    private func rri(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 3...3)
        let nper = try nm(a[0]), pv = try nm(a[1]), fv = try nm(a[2])
        guard nper > 0, pv != 0 else { throw fail(FormulaErrors.num) }
        let res = pow(fv / pv, 1 / nper) - 1
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// Số cho XNPV/XIRR: chữ số parse được thì lấy, chữ khác/logic/trống → #VALUE!.
    private func xnpvNumber(_ v: CellValue) throws -> Double {
        switch v {
        case .number(let d): return d
        case .string:
            guard let d = number(v) else { throw fail(FormulaErrors.value) }
            return d
        case .error(let e): throw fail(e)
        case .bool, .empty: throw fail(FormulaErrors.value)
        }
    }

    /// Ngày cho XNPV/XIRR: số serial lấy phần nguyên; chuỗi ngày parse theo ExcelDate.
    private func xnpvDate(_ v: CellValue) throws -> Int {
        switch v {
        case .number(let d): return Int(d.rounded(.down))
        case .string(let s):
            guard let p = ExcelDate.parse(s) else { throw fail(FormulaErrors.value) }
            return Int(p.rounded(.down))
        case .error(let e): throw fail(e)
        case .bool, .empty: throw fail(FormulaErrors.value)
        }
    }

    /// Cặp (tiền, ngày) cho XNPV/XIRR: hai vùng phải cùng số ô; ngày sau không
    /// được trước ngày đầu (ngày đầu = ngày của dòng tiền đầu tiên).
    private func xnpvPairs(values: [CellValue], dates: [CellValue]) throws -> ([Double], [Int]) {
        guard values.count == dates.count else { throw fail(FormulaErrors.num) }
        var cash: [Double] = [], when: [Int] = []
        for (v, d) in zip(values, dates) {
            cash.append(try xnpvNumber(v))
            when.append(try xnpvDate(d))
        }
        return (cash, when)
    }

    /// XNPV(rate, values, dates): NPV với ngày thực tế, chiết khấu (ngày - ngày đầu)/365.
    /// rate ≤ 0, số ô lệch nhau, hoặc ngày trước ngày đầu → #NUM!.
    private func xnpv(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 3...3)
        let vg = try grid(a[1]), dg = try grid(a[2])
        guard vg.flat.count == dg.flat.count else { throw fail(FormulaErrors.num) }
        let rate = try nm(a[0])
        guard rate > 0 else { throw fail(FormulaErrors.num) }
        let (cash, when) = try xnpvPairs(values: vg.flat, dates: dg.flat)
        guard let d0 = when.first else { return .number(0) }
        guard !when.contains(where: { $0 < d0 }) else { throw fail(FormulaErrors.num) }
        var sum = 0.0
        for (v, d) in zip(cash, when) { sum += v / pow(1 + rate, Double(d - d0) / 365) }
        guard sum.isFinite else { throw fail(FormulaErrors.num) }
        return .number(sum)
    }

    /// XIRR(values, dates, [guess]): lãi suất nội bộ theo ngày thực tế — Newton
    /// từ guess (mặc định 0.1), dự phòng chia đôi khi Newton không hội tụ;
    /// không có cả dòng tiền âm lẫn dương, hoặc ngày trước ngày đầu → #NUM!.
    private func xirr(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...3)
        let vg = try grid(a[0]), dg = try grid(a[1])
        guard vg.flat.count == dg.flat.count else { throw fail(FormulaErrors.num) }
        let guess = a.count >= 3 ? try nm(a[2]) : 0.1
        let (cash, when) = try xnpvPairs(values: vg.flat, dates: dg.flat)
        guard cash.contains(where: { $0 > 0 }), cash.contains(where: { $0 < 0 }) else {
            throw fail(FormulaErrors.num)
        }
        guard let d0 = when.first, !when.contains(where: { $0 < d0 }) else {
            throw fail(FormulaErrors.num)
        }
        func f(_ r: Double) -> Double {
            zip(cash, when).reduce(0) { $0 + $1.0 / pow(1 + r, Double($1.1 - d0) / 365) }
        }
        func df(_ r: Double) -> Double {
            zip(cash, when).reduce(0) { $0 - (Double($1.1 - d0) / 365) * $1.0 / pow(1 + r, Double($1.1 - d0) / 365 + 1) }
        }
        var r = guess
        for _ in 0..<200 {
            let fv = f(r), d = df(r)
            guard fv.isFinite, d.isFinite, d != 0 else { break }
            let next = r - fv / d
            if next <= -1 { r = (r - 1) / 2; continue }
            if abs(next - r) < 1e-12 { return .number(next) }
            r = next
        }
        var lo = -0.999999, hi = 10.0
        var flo = f(lo)
        let fhi = f(hi)
        guard flo.isFinite, fhi.isFinite else { throw fail(FormulaErrors.num) }
        if flo == 0 { return .number(lo) }
        if fhi == 0 { return .number(hi) }
        guard flo * fhi <= 0 else { throw fail(FormulaErrors.num) }
        for _ in 0..<300 {
            let mid = (lo + hi) / 2
            let fm = f(mid)
            guard fm.isFinite else { throw fail(FormulaErrors.num) }
            if fm * flo < 0 { hi = mid } else { lo = mid; flo = fm }
        }
        return .number((lo + hi) / 2)
    }

    /// DOLLARDE/DOLLARFR(price, fraction): đổi giữa giá thập phân và giá phân số
    /// (mẫu số `fraction`). fraction < 0 → #NUM!, fraction = 0 → #DIV/0!.
    private func dollarDeFr(toFraction: Bool, _ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 2...2)
        let price = try nm(a[0])
        let fraction = (try nm(a[1])).rounded(.towardZero)
        guard fraction >= 0 else { throw fail(FormulaErrors.num) }
        guard fraction != 0 else { throw fail(FormulaErrors.div0) }
        let integer = price.rounded(.towardZero)
        let frac = abs(price - integer)
        let digits = ceil(log10(fraction))
        let sign: Double = price == 0 ? 1 : (price > 0 ? 1 : -1)
        let res: Double
        if toFraction {
            res = integer + sign * (frac * fraction) / pow(10, digits)
        } else {
            res = integer + sign * (frac * pow(10, digits)) / fraction
        }
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    // MARK: Tài chính — khấu hao + chứng khoán (M7 lát 58, port từ
    // apps/sheet/formula-functions-financial.js, đối chiếu golden batch 5)

    /// Độ dài năm (ngày) cho basis = 1 theo JS yearLengthActual: cùng năm
    /// thì 366 nếu nhuận; khoảng ≤ 1 năm thì 366 nếu chứa 29/02; dài hơn
    /// thì trung bình độ dài các năm từ năm bắt đầu đến năm kết thúc.
    private static func yearLengthActual(start: Int, end: Int) -> Double {
        guard let cs = ExcelDate.civil(fromSerial: start), let ce = ExcelDate.civil(fromSerial: end) else { return 365 }
        if cs.year == ce.year { return ExcelDate.isLeap(cs.year) ? 366 : 365 }
        let withinOneYear = ce.year == cs.year + 1 && (ce.month < cs.month || (ce.month == cs.month && ce.day <= cs.day))
        if withinOneYear {
            if ExcelDate.isLeap(cs.year) && (cs.month < 2 || (cs.month == 2 && cs.day <= 29)) { return 366 }
            if ExcelDate.isLeap(ce.year) && (ce.month > 2 || (ce.month == 2 && ce.day == 29)) { return 366 }
            return 365
        }
        var total = 0, count = 0
        for y in cs.year...ce.year { total += ExcelDate.isLeap(y) ? 366 : 365; count += 1 }
        return Double(total) / Double(count)
    }

    /// Cơ sở đếm ngày cho nhóm chứng khoán (port từ JS dayBasis): trả
    /// (số ngày, độ dài năm). Dùng chung days360Value với DAYS360/YEARFRAC
    /// cho basis 0/4 (theo Microsoft Learn; JS lược quy tắc tháng 2 — xem
    /// báo cáo lát 48; các ca golden ở đây không chạm điểm khác nhau).
    private func dayBasis(start: Int, end: Int, basis: Int) throws -> (days: Double, year: Double) {
        switch basis {
        case 0, 4:
            guard let cs = ExcelDate.civil(fromSerial: start), let ce = ExcelDate.civil(fromSerial: end) else {
                throw fail(FormulaErrors.num)
            }
            return (Double(Self.days360Value(start: cs, end: ce, european: basis == 4)), 360)
        case 1:
            return (Double(end - start), Self.yearLengthActual(start: start, end: end))
        case 2:
            return (Double(end - start), 360)
        default: // 3
            return (Double(end - start), 365)
        }
    }

    /// Basis đếm ngày 0...4 (mặc định 0 khi bỏ trống); ngoài khoảng hoặc
    /// không nguyên → #NUM! (quy ước như YEARFRAC của Swift; JS cắt phần lẻ).
    private func basisValue(_ a: [FormulaExpr], _ idx: Int) throws -> Int {
        guard a.count > idx, a[idx] != .empty else { return 0 }
        let b = try nm(a[idx])
        let basis = Int(b.rounded(.towardZero))
        guard (0...4).contains(basis), b == Double(basis) else { throw fail(FormulaErrors.num) }
        return basis
    }

    /// Hai ngày (settle, maturity) đã cắt phần lẻ, theo thứ tự đối số.
    private func twoDates(_ a: [FormulaExpr]) throws -> (s: Int, m: Int) {
        (try dateArg(a[0]), try dateArg(a[1]))
    }

    /// Khấu hao số dư giảm dần cho một kỳ nguyên (dạng đóng, port từ JS
    /// ddbClosed): rate = factor/life; giá trị đầu kỳ và cuối kỳ theo lũy
    /// thừa; khấu hao kỳ không vượt quá (giá trị đầu kỳ − salvage), không âm.
    private static func ddbClosed(cost: Double, salvage: Double, life: Double, period: Int, factor: Double) -> Double {
        var rate = factor / life
        let oldValue: Double
        if rate >= 1 {
            rate = 1
            oldValue = period == 1 ? cost : 0
        } else {
            oldValue = cost * pow(1 - rate, Double(period - 1))
        }
        let newValue = cost * pow(1 - rate, Double(period))
        let d = newValue < salvage ? oldValue - salvage : oldValue - newValue
        return d < 0 ? 0 : d
    }

    /// DDB(cost, salvage, life, period, [factor]): khấu hao số dư giảm dần
    /// một kỳ; period làm tròn lên. period ≤ 0, > life, factor ≤ 0,
    /// cost/salvage < 0 hoặc life ≤ 0 → #NUM!.
    private func ddb(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 4...5)
        let cost = try nm(a[0]), salvage = try nm(a[1]), life = try nm(a[2]), periodRaw = try nm(a[3])
        let factor = (a.count == 5 && a[4] != .empty) ? try nm(a[4]) : 2
        guard cost >= 0, salvage >= 0, life > 0, periodRaw > 0, periodRaw <= life, factor > 0 else {
            throw fail(FormulaErrors.num)
        }
        return .number(Self.ddbClosed(cost: cost, salvage: salvage, life: life, period: Int(periodRaw.rounded(.up)), factor: factor))
    }

    /// SYD(cost, salvage, life, per): khấu hao tổng số năm.
    /// life ≤ 0, per ≤ 0, per > life, cost/salvage < 0 → #NUM!.
    private func syd(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 4...4)
        let cost = try nm(a[0]), salvage = try nm(a[1]), life = try nm(a[2]), per = try nm(a[3])
        guard life > 0, per > 0, per <= life, salvage >= 0, cost >= 0 else { throw fail(FormulaErrors.num) }
        let res = (cost - salvage) * (life - per + 1) * 2 / (life * (life + 1))
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// Lõi VDB (port từ JS vdbCore): cộng khấu hao từng kỳ nguyên từ 1 đến
    /// ceil(period); chuyển sang đường thẳng ngay khi khấu hao đường thẳng
    /// (phần còn lại / số kỳ còn lại theo life1) lớn hơn khấu hao giảm dần,
    /// rồi giữ nguyên mức đường thẳng đó; kỳ cuối nhân hệ số phần lẻ.
    private static func vdbCore(cost: Double, salvage: Double, life: Double, life1: Double, period: Double, factor: Double) -> Double {
        let intEnd = Int(period.rounded(.up))
        guard intEnd >= 1 else { return 0 } // kỳ 0 (start = 0 hoặc start = end) → không khấu hao
        var result = 0.0, straightLine = 0.0, remaining = cost - salvage, switched = false
        for i in 1...intEnd {
            let term: Double
            if !switched {
                let declining = ddbClosed(cost: cost, salvage: salvage, life: life, period: i, factor: factor)
                straightLine = remaining / (life1 - Double(i - 1))
                if straightLine > declining {
                    term = straightLine
                    switched = true
                } else {
                    term = declining
                    remaining -= declining
                }
            } else {
                term = straightLine
            }
            result += i == intEnd ? term * (period + 1 - Double(intEnd)) : term
        }
        return result
    }

    /// VDB(cost, salvage, life, start, end, [factor], [no_switch]): khấu hao
    /// số dư giảm dần có chuyển sang đường thẳng, trên khoảng kỳ start...end.
    /// start < 0, end < start, end > life, factor ≤ 0, cost/salvage < 0,
    /// life ≤ 0 → #NUM!. no_switch TRUE chỉ dùng khấu hao giảm dần thuần.
    private func vdb(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 5...7)
        let cost = try nm(a[0]), salvage = try nm(a[1]), life = try nm(a[2])
        let start = try nm(a[3]), end = try nm(a[4])
        let factor = (a.count >= 6 && a[5] != .empty) ? try nm(a[5]) : 2
        let noSwitch = (a.count == 7 && a[6] != .empty) ? try bl(a[6]) : false
        guard cost >= 0, salvage >= 0, life > 0, start >= 0, end >= start, end <= life, factor > 0 else {
            throw fail(FormulaErrors.num)
        }
        return .number(Self.vdbValue(cost: cost, salvage: salvage, life: life, start: start, end: end, factor: factor, noSwitch: noSwitch))
    }

    /// Phần VDB (port từ JS vdb): no_switch thì cộng trực tiếp từng kỳ
    /// (hệ số phần lẻ ở hai đầu); ngược lại trừ phần trước start rồi tính
    /// lại trên phần còn lại — có hiệu chỉnh khi start lẻ nằm sau nửa life.
    private static func vdbValue(cost: Double, salvage: Double, life: Double, start: Double, end: Double, factor: Double, noSwitch: Bool) -> Double {
        let intStart = Int(start.rounded(.down)), intEnd = Int(end.rounded(.up))
        if noSwitch {
            var total = 0.0
            if intStart + 1 <= intEnd {
                for i in (intStart + 1)...intEnd {
                    var term = ddbClosed(cost: cost, salvage: salvage, life: life, period: i, factor: factor)
                    if i == intStart + 1 {
                        term *= min(end, Double(intStart + 1)) - start
                    } else if i == intEnd {
                        term *= end + 1 - Double(intEnd)
                    }
                    total += term
                }
            }
            return total
        }
        var life1 = life
        var s = start, e = end
        if abs(s - s.rounded(.down)) > 1e-12, factor > 1, s >= life / 2 {
            let part = s - life / 2
            s = life / 2
            e -= part
            life1 += 1
        }
        let costAfter = cost - vdbCore(cost: cost, salvage: salvage, life: life, life1: life1, period: s, factor: factor)
        return vdbCore(cost: costAfter, salvage: salvage, life: life, life1: life - s, period: e - s, factor: factor)
    }

    /// DISC(settle, maturity, pr, redemption, [basis]): tỷ lệ chiết khấu.
    /// settle ≥ maturity, pr ≤ 0 hoặc redemption ≤ 0 → #NUM!.
    private func disc(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 4...5)
        let d = try twoDates(a)
        let pr = try nm(a[2]), red = try nm(a[3])
        let basis = try basisValue(a, 4)
        guard d.s < d.m, pr > 0, red > 0 else { throw fail(FormulaErrors.num) }
        let c = try dayBasis(start: d.s, end: d.m, basis: basis)
        let res = (red - pr) / red * c.year / c.days
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// INTRATE(settle, maturity, investment, redemption, [basis]): lãi suất
    /// của chứng khoán đầu tư toàn bộ. settle ≥ maturity, investment ≤ 0
    /// hoặc redemption ≤ 0 → #NUM!.
    private func intrate(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 4...5)
        let d = try twoDates(a)
        let inv = try nm(a[2]), red = try nm(a[3])
        let basis = try basisValue(a, 4)
        guard d.s < d.m, inv > 0, red > 0 else { throw fail(FormulaErrors.num) }
        let c = try dayBasis(start: d.s, end: d.m, basis: basis)
        let res = (red - inv) / inv * c.year / c.days
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// RECEIVED(settle, maturity, investment, discount, [basis]): số tiền
    /// nhận được khi đáo hạn. settle ≥ maturity, investment ≤ 0 hoặc
    /// discount ≤ 0 → #NUM!.
    private func received(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 4...5)
        let d = try twoDates(a)
        let inv = try nm(a[2]), discRate = try nm(a[3])
        let basis = try basisValue(a, 4)
        guard d.s < d.m, inv > 0, discRate > 0 else { throw fail(FormulaErrors.num) }
        let c = try dayBasis(start: d.s, end: d.m, basis: basis)
        let res = inv / (1 - discRate * c.days / c.year)
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// PRICEDISC(settle, maturity, discount, redemption, [basis]): giá của
    /// chứng khoán chiết khấu. settle ≥ maturity, discount ≤ 0 hoặc
    /// redemption ≤ 0 → #NUM!.
    private func priceDisc(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 4...5)
        let d = try twoDates(a)
        let discRate = try nm(a[2]), red = try nm(a[3])
        let basis = try basisValue(a, 4)
        guard d.s < d.m, discRate > 0, red > 0 else { throw fail(FormulaErrors.num) }
        let c = try dayBasis(start: d.s, end: d.m, basis: basis)
        let res = red - discRate * red * c.days / c.year
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// YIELDDISC(settle, maturity, pr, redemption, [basis]): lợi suất của
    /// chứng khoán chiết khấu. settle ≥ maturity, pr ≤ 0 hoặc
    /// redemption ≤ 0 → #NUM!.
    private func yieldDisc(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 4...5)
        let d = try twoDates(a)
        let pr = try nm(a[2]), red = try nm(a[3])
        let basis = try basisValue(a, 4)
        guard d.s < d.m, pr > 0, red > 0 else { throw fail(FormulaErrors.num) }
        let c = try dayBasis(start: d.s, end: d.m, basis: basis)
        let res = (red - pr) / pr * c.year / c.days
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// TBILLPRICE(settle, maturity, discount): giá tín phiếu kho bạc
    /// (mệnh giá 100). settle ≥ maturity, discount ≤ 0 hoặc quá 365 ngày
    /// giữa hai ngày → #NUM!.
    private func tbillPrice(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 3...3)
        let d = try twoDates(a)
        let discRate = try nm(a[2])
        let dsm = d.m - d.s
        guard d.s < d.m, discRate > 0, dsm <= 365 else { throw fail(FormulaErrors.num) }
        return .number(100 * (1 - discRate * Double(dsm) / 360))
    }

    /// TBILLYIELD(settle, maturity, pr): lợi suất tín phiếu kho bạc.
    /// settle ≥ maturity, pr ≤ 0 hoặc quá 365 ngày → #NUM!.
    private func tbillYield(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 3...3)
        let d = try twoDates(a)
        let pr = try nm(a[2])
        let dsm = d.m - d.s
        guard d.s < d.m, pr > 0, dsm <= 365 else { throw fail(FormulaErrors.num) }
        let res = (100 - pr) / pr * 360 / Double(dsm)
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// TBILLEQ(settle, maturity, discount): lợi suất tương đương trái phiếu
    /// của tín phiếu kho bạc. settle ≥ maturity, discount ≤ 0 hoặc quá 365
    /// ngày → #NUM!; quá 182 ngày dùng công thức bậc hai, nghiệm âm → #NUM!.
    private func tbillEq(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 3...3)
        let d = try twoDates(a)
        let discRate = try nm(a[2])
        let dsm = d.m - d.s
        guard d.s < d.m, discRate > 0, dsm <= 365 else { throw fail(FormulaErrors.num) }
        if dsm <= 182 {
            let res = 365 * discRate / (360 - discRate * Double(dsm))
            guard res.isFinite else { throw fail(FormulaErrors.num) }
            return .number(res)
        }
        let price = (100 - discRate * 100 * Double(dsm) / 360) / 100
        let x = Double(dsm) / 365
        let radicand = x * x - (2 * x - 1) * (1 - 1 / price)
        guard radicand >= 0 else { throw fail(FormulaErrors.num) }
        let res = (-x + radicand.squareRoot()) / (x - 0.5)
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// ACCRINTM(issue, maturity, rate, [par], [basis]): lãi tích lũy của
    /// chứng khoán trả lãi khi đáo hạn. Cần ≥ 4 đối số (golden batch 5: 3 đối
    /// số → #VALUE!); par mặc định 1000. issue ≥ maturity, rate ≤ 0 hoặc
    /// par ≤ 0 → #NUM!.
    private func accrintm(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 4...5)
        let d = try twoDates(a)
        let rate = try nm(a[2])
        let par = a[3] != .empty ? try nm(a[3]) : 1000
        let basis = try basisValue(a, 4)
        guard d.s < d.m, rate > 0, par > 0 else { throw fail(FormulaErrors.num) }
        let c = try dayBasis(start: d.s, end: d.m, basis: basis)
        let res = par * rate * c.days / c.year
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// PRICEMAT/YIELDMAT: Excel dùng MỘT độ dài năm cho mọi khoảng khi
    /// basis = 1: lấy theo khoảng (issue, settle); các basis khác như dayBasis.
    private func maturityDayBasis(a: Int, b: Int, issue: Int, settle: Int, basis: Int) throws -> (days: Double, year: Double) {
        if basis == 1 {
            return (Double(b - a), Self.yearLengthActual(start: issue, end: settle))
        }
        return try dayBasis(start: a, end: b, basis: basis)
    }

    /// PRICEMAT(settle, maturity, issue, rate, yld, [basis]): giá chứng
    /// khoán trả lãi khi đáo hạn (mệnh giá 100). settle ≥ maturity,
    /// issue > settle, rate < 0 hoặc yld < 0 → #NUM!.
    private func priceMat(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 5...6)
        let s = try dateArg(a[0]), m = try dateArg(a[1]), i = try dateArg(a[2])
        let rate = try nm(a[3]), yld = try nm(a[4])
        let basis = try basisValue(a, 5)
        guard s < m, i <= s, rate >= 0, yld >= 0 else { throw fail(FormulaErrors.num) }
        let im = try maturityDayBasis(a: i, b: m, issue: i, settle: s, basis: basis)
        let iss = try maturityDayBasis(a: i, b: s, issue: i, settle: s, basis: basis)
        let sm = try maturityDayBasis(a: s, b: m, issue: i, settle: s, basis: basis)
        let res = (100 + im.days / im.year * rate * 100) / (1 + sm.days / sm.year * yld) - iss.days / iss.year * rate * 100
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// YIELDMAT(settle, maturity, issue, rate, pr, [basis]): lợi suất chứng
    /// khoán trả lãi khi đáo hạn. settle ≥ maturity, issue > settle,
    /// rate < 0 hoặc pr ≤ 0 → #NUM!.
    private func yieldMat(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 5...6)
        let s = try dateArg(a[0]), m = try dateArg(a[1]), i = try dateArg(a[2])
        let rate = try nm(a[3]), pr = try nm(a[4])
        let basis = try basisValue(a, 5)
        guard s < m, i <= s, rate >= 0, pr > 0 else { throw fail(FormulaErrors.num) }
        let im = try maturityDayBasis(a: i, b: m, issue: i, settle: s, basis: basis)
        let iss = try maturityDayBasis(a: i, b: s, issue: i, settle: s, basis: basis)
        let sm = try maturityDayBasis(a: s, b: m, issue: i, settle: s, basis: basis)
        let base = pr / 100 + iss.days / iss.year * rate
        let res = ((1 + im.days / im.year * rate) - base) / base * sm.year / sm.days
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    // MARK: Ngày coupon (COUP*)

    /// Đối số chung nhóm COUP*: (settlement, maturity, frequency, basis).
    /// frequency phải nguyên trong {1, 2, 4}; basis theo basisValue (0...4,
    /// mặc định 0, không nguyên → #NUM! — quy ước như YEARFRAC của Swift,
    /// Excel thì cắt phần lẻ). settlement ≥ maturity → #NUM!.
    private func couponArgs(_ a: [FormulaExpr]) throws -> (s: Int, m: Int, freq: Int, basis: Int) {
        try need(a, 3...4)
        let s = try dateArg(a[0]), m = try dateArg(a[1])
        let fRaw = try nm(a[2])
        let freq = Int(fRaw.rounded(.towardZero))
        guard [1, 2, 4].contains(freq), fRaw == Double(freq) else { throw fail(FormulaErrors.num) }
        let basis = try basisValue(a, 3)
        guard s >= 1, m >= 1, s < m else { throw fail(FormulaErrors.num) }
        return (s, m, freq, basis)
    }

    /// Ngày coupon lùi `k` kỳ khỏi maturity (k = 0 → chính maturity).
    /// Nếu maturity là ngày cuối tháng thì mọi ngày coupon đều là cuối tháng;
    /// ngược lại giữ nguyên ngày của maturity, kẹp vào độ dài tháng đích.
    /// Quy tắc cuối-tháng này khớp golden batch 7: maturity 2012-02-29 →
    /// PCD 2010-08-31 (không phải 2010-08-28 như EDATE lặp từng bước).
    private static func couponDate(maturity: ExcelDate.Civil, monthsPerCoupon: Int, periodsBack k: Int) -> Int? {
        let total = maturity.year * 12 + (maturity.month - 1) - k * monthsPerCoupon
        let y = total >= 0 ? total / 12 : -((11 - total) / 12)
        let m = total - y * 12 + 1
        guard y >= 1900 else { return nil }
        let eom = maturity.day == ExcelDate.daysInMonth(maturity.year, maturity.month)
        let d = eom ? ExcelDate.daysInMonth(y, m) : min(maturity.day, ExcelDate.daysInMonth(y, m))
        return ExcelDate.serial(year: y, month: m, day: d)
    }

    /// (pcd, ncd, số kỳ coupon trong (settlement, maturity]).
    /// pcd = ngày coupon lớn nhất ≤ settlement; ncd = ngày coupon nhỏ nhất
    /// > settlement (settlement đúng ngày coupon → pcd = settlement,
    /// ncd = kỳ tiếp theo). count = số ngày coupon trong (s, m].
    private static func couponBounds(settlement s: Int, maturity: ExcelDate.Civil, monthsPerCoupon mp: Int) -> (pcd: Int, ncd: Int, count: Int)? {
        guard let sc = ExcelDate.civil(fromSerial: s) else { return nil }
        func date(_ k: Int) -> Int? { couponDate(maturity: maturity, monthsPerCoupon: mp, periodsBack: k) }
        // Ước lượng từ chênh tháng rồi hiệu chỉnh cục bộ (sai số ≤ 1-2 kỳ).
        var k = max(0, ((maturity.year - sc.year) * 12 + (maturity.month - sc.month)) / mp)
        while let ck = date(k), ck > s { k += 1 }
        while k > 0, let prev = date(k - 1), prev <= s { k -= 1 }
        guard k >= 1, let pcd = date(k), let ncd = date(k - 1) else { return nil }
        return (pcd, ncd, k)
    }

    private func couponBoundsChecked(_ a: [FormulaExpr]) throws -> (pcd: Int, ncd: Int, count: Int, freq: Int, basis: Int) {
        let c = try couponArgs(a)
        guard let mc = ExcelDate.civil(fromSerial: c.m),
              let b = Self.couponBounds(settlement: c.s, maturity: mc, monthsPerCoupon: 12 / c.freq) else {
            throw fail(FormulaErrors.num)
        }
        return (b.pcd, b.ncd, b.count, c.freq, c.basis)
    }

    /// COUPPCD(settlement, maturity, frequency, [basis]): ngày coupon trước
    /// settlement (bằng settlement nếu settlement đúng ngày coupon).
    private func coupPcd(_ a: [FormulaExpr]) throws -> CellValue {
        .number(Double(try couponBoundsChecked(a).pcd))
    }

    /// COUPNCD(settlement, maturity, frequency, [basis]): ngày coupon sau
    /// settlement (kỳ tiếp theo nếu settlement đúng ngày coupon).
    private func coupNcd(_ a: [FormulaExpr]) throws -> CellValue {
        .number(Double(try couponBoundsChecked(a).ncd))
    }

    /// COUPNUM(settlement, maturity, frequency, [basis]): số kỳ coupon phải
    /// trả trong (settlement, maturity].
    private func coupNum(_ a: [FormulaExpr]) throws -> CellValue {
        .number(Double(try couponBoundsChecked(a).count))
    }

    /// COUPDAYBS(settlement, maturity, frequency, [basis]): số ngày từ đầu
    /// kỳ coupon tới settlement. basis 1/2/3 = ngày thực; basis 0/4 = 30/360
    /// (Mỹ/châu Âu) từ pcd tới settlement.
    private func coupDayBs(_ a: [FormulaExpr]) throws -> CellValue {
        let c = try couponArgs(a)
        guard let mc = ExcelDate.civil(fromSerial: c.m),
              let b = Self.couponBounds(settlement: c.s, maturity: mc, monthsPerCoupon: 12 / c.freq) else {
            throw fail(FormulaErrors.num)
        }
        switch c.basis {
        case 0, 4:
            guard let ps = ExcelDate.civil(fromSerial: b.pcd), let ss = ExcelDate.civil(fromSerial: c.s) else {
                throw fail(FormulaErrors.num)
            }
            return .number(Double(Self.days360Value(start: ps, end: ss, european: c.basis == 4)))
        default:
            return .number(Double(c.s - b.pcd))
        }
    }

    /// COUPDAYS(settlement, maturity, frequency, [basis]): số ngày trong kỳ
    /// coupon chứa settlement. basis 1 = ngày thực (ncd − pcd);
    /// basis 3 = 365/frequency; basis 0/2/4 = 360/frequency.
    private func coupDays(_ a: [FormulaExpr]) throws -> CellValue {
        let b = try couponBoundsChecked(a)
        switch b.basis {
        case 1: return .number(Double(b.ncd - b.pcd))
        case 3: return .number(365 / Double(b.freq))
        default: return .number(360 / Double(b.freq))
        }
    }

    /// COUPDAYSNC(settlement, maturity, frequency, [basis]): số ngày từ
    /// settlement tới ngày coupon tiếp theo. basis 1/2/3 = ngày thực;
    /// basis 0/4 = COUPDAYS − COUPDAYBS (không phải days360 trực tiếp —
    /// golden batch 7: COUPDAYSNC(2011-02-10, 2012-02-29, 2, 0) = 20 =
    /// 180 − 160, trong khi days360(2011-02-10, 2011-02-28) = 18).
    private func coupDaysNc(_ a: [FormulaExpr]) throws -> CellValue {
        let c = try couponArgs(a)
        guard let mc = ExcelDate.civil(fromSerial: c.m),
              let b = Self.couponBounds(settlement: c.s, maturity: mc, monthsPerCoupon: 12 / c.freq) else {
            throw fail(FormulaErrors.num)
        }
        switch c.basis {
        case 0, 4:
            guard let ps = ExcelDate.civil(fromSerial: b.pcd), let ss = ExcelDate.civil(fromSerial: c.s) else {
                throw fail(FormulaErrors.num)
            }
            let dayBs = Double(Self.days360Value(start: ps, end: ss, european: c.basis == 4))
            return .number(360 / Double(c.freq) - dayBs)
        default:
            return .number(Double(b.ncd - c.s))
        }
    }

    // MARK: Trái phiếu có coupon (M7 lát 60, golden batch 7)

    /// (a, e, n) chung cho PRICE/YIELD/DURATION/MDURATION: a = COUPDAYBS,
    /// e = COUPDAYS, n = COUPNUM theo basis. DSC nội bộ = e − a (không phải
    /// COUPDAYSNC độc lập — golden batch 7 basis 2/3: PRICE dùng DSC = 88 =
    /// 180 − 92 và 90.5 = 182.5 − 92, trong khi COUPDAYSNC độc lập cho 90).
    private static func bondCouponValues(settlement s: Int, maturity m: Int, freq: Int, basis: Int) -> (a: Double, e: Double, n: Int)? {
        guard let mc = ExcelDate.civil(fromSerial: m),
              let b = Self.couponBounds(settlement: s, maturity: mc, monthsPerCoupon: 12 / freq) else {
            return nil
        }
        let a: Double
        let e: Double
        switch basis {
        case 0, 4:
            guard let ps = ExcelDate.civil(fromSerial: b.pcd), let ss = ExcelDate.civil(fromSerial: s) else { return nil }
            a = Double(Self.days360Value(start: ps, end: ss, european: basis == 4))
            e = 360 / Double(freq)
        case 1:
            a = Double(s - b.pcd)
            e = Double(b.ncd - b.pcd)
        case 2:
            a = Double(s - b.pcd)
            e = 360 / Double(freq)
        default: // 3
            a = Double(s - b.pcd)
            e = 365 / Double(freq)
        }
        return (a, e, b.count)
    }

    /// PRICE core (mệnh giá 100): chiết khấu từng coupon theo
    /// (DSC/E + k − 1) kỳ, trừ lãi tích lũy cpn × A/E.
    /// N = 1: (redemption + cpn) / (1 + y × DSC/E) − cpn × A/E.
    private static func bondPriceCore(a: Double, e: Double, n: Int, rate: Double, yld: Double, redemp: Double, freq: Int) -> Double {
        let f = Double(freq)
        let cpn = 100 * rate / f
        let y = yld / f
        let t0 = (e - a) / e
        if n == 1 {
            return (redemp + cpn) / (1 + y * t0) - cpn * (a / e)
        }
        var total = 0.0
        for k in 1...n {
            total += cpn / pow(1 + y, t0 + Double(k) - 1)
        }
        total += redemp / pow(1 + y, t0 + Double(n) - 1)
        return total - cpn * (a / e)
    }

    /// Đạo hàm của PRICE theo yld (cho Newton của YIELD).
    private static func bondPriceDeriv(a: Double, e: Double, n: Int, rate: Double, yld: Double, redemp: Double, freq: Int) -> Double {
        let f = Double(freq)
        let cpn = 100 * rate / f
        let y = yld / f
        let t0 = (e - a) / e
        if n == 1 {
            return -(redemp + cpn) * (t0 / f) / pow(1 + y * t0, 2)
        }
        var d = 0.0
        for k in 1...n {
            d += -cpn * (t0 + Double(k) - 1) / f / pow(1 + y, t0 + Double(k))
        }
        d += -redemp * (t0 + Double(n) - 1) / f / pow(1 + y, t0 + Double(n))
        return d
    }

    /// Đối số chung PRICE/YIELD: (settlement, maturity, rate, yld/pr,
    /// redemption, frequency, [basis]).
    private func bondPriceArgs(_ a: [FormulaExpr]) throws -> (s: Int, m: Int, rate: Double, y2: Double, red: Double, freq: Int, basis: Int) {
        try need(a, 6...7)
        let s = try dateArg(a[0]), m = try dateArg(a[1])
        let rate = try nm(a[2]), y2 = try nm(a[3]), red = try nm(a[4])
        let fRaw = try nm(a[5])
        let freq = Int(fRaw.rounded(.towardZero))
        guard [1, 2, 4].contains(freq), fRaw == Double(freq) else { throw fail(FormulaErrors.num) }
        let basis = try basisValue(a, 6)
        return (s, m, rate, y2, red, freq, basis)
    }

    /// PRICE(settlement, maturity, rate, yld, redemption, frequency, [basis]).
    /// settlement ≥ maturity, rate < 0, yld < 0, redemption ≤ 0 → #NUM!.
    private func bondPrice(_ a: [FormulaExpr]) throws -> CellValue {
        let b = try bondPriceArgs(a)
        guard b.s < b.m, b.rate >= 0, b.y2 >= 0, b.red > 0,
              let v = Self.bondCouponValues(settlement: b.s, maturity: b.m, freq: b.freq, basis: b.basis) else {
            throw fail(FormulaErrors.num)
        }
        let res = Self.bondPriceCore(a: v.a, e: v.e, n: v.n, rate: b.rate, yld: b.y2, redemp: b.red, freq: b.freq)
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// YIELD(settlement, maturity, rate, pr, redemption, frequency, [basis]):
    /// giải PRICE(yld) = pr bằng Newton (đạo hàm giải tích) + chia đôi dự
    /// phòng trên (−frequency, +∞), mẫu XIRR lát 56.
    /// settlement ≥ maturity, rate < 0, pr ≤ 0, redemption ≤ 0 → #NUM!.
    private func bondYield(_ a: [FormulaExpr]) throws -> CellValue {
        let b = try bondPriceArgs(a)
        let pr = b.y2
        guard b.s < b.m, b.rate >= 0, pr > 0, b.red > 0,
              let v = Self.bondCouponValues(settlement: b.s, maturity: b.m, freq: b.freq, basis: b.basis) else {
            throw fail(FormulaErrors.num)
        }
        let f = Double(b.freq)
        func fn(_ yld: Double) -> Double {
            Self.bondPriceCore(a: v.a, e: v.e, n: v.n, rate: b.rate, yld: yld, redemp: b.red, freq: b.freq) - pr
        }
        var yld = 0.1
        for _ in 0..<100 {
            let fv = fn(yld)
            guard fv.isFinite else { throw fail(FormulaErrors.num) }
            if abs(fv) < 1e-12 { return .number(yld) }
            let d = Self.bondPriceDeriv(a: v.a, e: v.e, n: v.n, rate: b.rate, yld: yld, redemp: b.red, freq: b.freq)
            guard d.isFinite, d != 0 else { break }
            let next = yld - fv / d
            guard next.isFinite, next > -f + 1e-9 else { break }
            if abs(next - yld) < 1e-13 { return .number(next) }
            yld = next
        }
        var lo = -f + 1e-9, hi = 1.0
        let flo = fn(lo)
        guard flo.isFinite, flo > 0 else { throw fail(FormulaErrors.num) }
        if flo == 0 { return .number(lo) }
        while fn(hi) > 0, hi < 1e6 { hi *= 2 }
        guard fn(hi) <= 0 else { throw fail(FormulaErrors.num) }
        for _ in 0..<200 {
            let mid = (lo + hi) / 2
            let fm = fn(mid)
            guard fm.isFinite else { throw fail(FormulaErrors.num) }
            if abs(fm) < 1e-12 || hi - lo < 1e-13 { return .number(mid) }
            if fm > 0 { lo = mid } else { hi = mid }
        }
        return .number((lo + hi) / 2)
    }

    /// Macaulay duration: thời gian tới mỗi dòng tiền = (t0 + k − 1)/freq
    /// với t0 = min(DSC/E, 1) — kỳ coupon đầu dài tối đa 1 kỳ (basis 3 năm
    /// nhuận cho DSC/E = 366/365 > 1; golden batch 7). Mẫu số là giá bẩn
    /// (tổng PV không trừ lãi tích lũy); hệ số (1+y)^t0 chung nên triệt tiêu.
    private static func bondDurationCore(a: Double, e: Double, n: Int, coupon: Double, yld: Double, freq: Int) -> Double {
        let f = Double(freq)
        let cpn = 100 * coupon / f
        let y = yld / f
        let t0 = min((e - a) / e, 1)
        var num = 0.0, den = 0.0
        for k in 1...n {
            let t = (t0 + Double(k) - 1) / f
            let pv = cpn / pow(1 + y, t0 + Double(k) - 1)
            num += t * pv
            den += pv
        }
        let tN = (t0 + Double(n) - 1) / f
        let pvN = 100 / pow(1 + y, t0 + Double(n) - 1)
        num += tN * pvN
        den += pvN
        return num / den
    }

    /// Đối số chung DURATION/MDURATION: (settlement, maturity, coupon, yld,
    /// frequency, [basis]).
    private func bondDurationArgs(_ a: [FormulaExpr]) throws -> (s: Int, m: Int, coupon: Double, yld: Double, freq: Int, basis: Int) {
        try need(a, 5...6)
        let s = try dateArg(a[0]), m = try dateArg(a[1])
        let coupon = try nm(a[2]), yld = try nm(a[3])
        let fRaw = try nm(a[4])
        let freq = Int(fRaw.rounded(.towardZero))
        guard [1, 2, 4].contains(freq), fRaw == Double(freq) else { throw fail(FormulaErrors.num) }
        let basis = try basisValue(a, 5)
        return (s, m, coupon, yld, freq, basis)
    }

    /// DURATION(settlement, maturity, coupon, yld, frequency, [basis]).
    /// settlement ≥ maturity, coupon < 0, yld < 0 → #NUM!.
    private func bondDuration(_ a: [FormulaExpr]) throws -> CellValue {
        let b = try bondDurationArgs(a)
        guard b.s < b.m, b.coupon >= 0, b.yld >= 0,
              let v = Self.bondCouponValues(settlement: b.s, maturity: b.m, freq: b.freq, basis: b.basis) else {
            throw fail(FormulaErrors.num)
        }
        let res = Self.bondDurationCore(a: v.a, e: v.e, n: v.n, coupon: b.coupon, yld: b.yld, freq: b.freq)
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// MDURATION = DURATION / (1 + yld/frequency).
    private func bondMDuration(_ a: [FormulaExpr]) throws -> CellValue {
        let b = try bondDurationArgs(a)
        guard b.s < b.m, b.coupon >= 0, b.yld >= 0,
              let v = Self.bondCouponValues(settlement: b.s, maturity: b.m, freq: b.freq, basis: b.basis) else {
            throw fail(FormulaErrors.num)
        }
        let res = Self.bondDurationCore(a: v.a, e: v.e, n: v.n, coupon: b.coupon, yld: b.yld, freq: b.freq) / (1 + b.yld / Double(b.freq))
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// 30/360 riêng cho ACCRINT: kẹp ngày về 30, không cuộn sang tháng sau
    /// như DAYS360-US (golden: ngày (2008-03-01, 2008-08-31) = 179 chứ không
    /// phải 180). Basis 0 giữ quy tắc cuối-tháng-2 → 30; basis 4 (EU) không.
    private static func days360Bond(start: ExcelDate.Civil, end: ExcelDate.Civil, european: Bool) -> Int {
        func lastDayOfFeb(_ c: ExcelDate.Civil) -> Bool {
            c.month == 2 && (c.day == ExcelDate.daysInMonth(c.year, 2) || (c.year == 1900 && c.day == 29))
        }
        var (y1, m1, d1) = (start.year, start.month, start.day)
        var (y2, m2, d2) = (end.year, end.month, end.day)
        if !european, lastDayOfFeb(start) { d1 = 30 } else if d1 == 31 { d1 = 30 }
        if !european, lastDayOfFeb(end) { d2 = 30 } else if d2 == 31 { d2 = 30 }
        return (y2 - y1) * 360 + (m2 - m1) * 30 + (d2 - d1)
    }

    /// calc_method của ACCRINT: TRUE (mặc định) = tính từ issue,
    /// FALSE = tính từ first_interest. Golden batch 7 cho thấy FALSE cho
    /// cùng kết quả với TRUE khi settlement > first_interest (58.15217 cho
    /// cả hai) nên tham số chỉ được đọc để kiểm lỗi, không ảnh hưởng kết quả.
    private func accrintCalcMethod(_ a: [FormulaExpr]) throws {
        guard a.count > 7, a[7] != .empty else { return }
        let v = try sc(a[7])
        if case .string = v {
            guard bool(v) != nil else { throw fail(FormulaErrors.value) }
        } else if let n = number(v) {
            guard n == 0 || n == 1 else { throw fail(FormulaErrors.num) }
        } else {
            throw fail(FormulaErrors.value)
        }
    }

    /// ACCRINT(issue, first_interest, settlement, rate, par, frequency,
    /// [basis], [calc_method]): lãi tích lũy = par × rate/frequency × Σ A_i/NL_i
    /// trên lưới kỳ coupon neo ở first_interest (EDATE + quy tắc cuối tháng
    /// như COUP*). Kỳ đầy đủ trong [issue, settlement] đóng góp đúng 1;
    /// kỳ lẻ (đầu/cuối) đóng góp A/NL_đầu — NL của kỳ đầu tiên, không phải
    /// của từng kỳ (golden: settlement sau first_interest, basis 1:
    /// 183/184 + 31/184 = 214/184, không phải 183/184 + 31/181).
    /// NL: basis 1 = ngày thực trong kỳ; basis 3 = 365/frequency;
    /// còn lại 360/frequency. A: basis 1/2/3 = ngày thực; basis 0/4 = 30/360
    /// kiểu bond (days360Bond). rate ≤ 0, par ≤ 0, settlement ≤ issue,
    /// first_interest ≤ issue → #NUM!.
    private func accrint(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 6...8)
        let issue = try dateArg(a[0]), first = try dateArg(a[1]), settl = try dateArg(a[2])
        let rate = try nm(a[3]), par = try nm(a[4])
        let fRaw = try nm(a[5])
        let freq = Int(fRaw.rounded(.towardZero))
        guard [1, 2, 4].contains(freq), fRaw == Double(freq) else { throw fail(FormulaErrors.num) }
        let basis = try basisValue(a, 6)
        try accrintCalcMethod(a)
        guard rate > 0, par > 0, settl > issue, first > issue,
              let fc = ExcelDate.civil(fromSerial: first) else {
            throw fail(FormulaErrors.num)
        }
        let mp = 12 / freq
        func cdate(_ j: Int) -> Int? { Self.couponDate(maturity: fc, monthsPerCoupon: mp, periodsBack: -j) }
        // Kỳ đầu tiên chứa issue (j ≤ 0, đi lùi từ first_interest).
        var j = 0
        while let d0 = cdate(j), d0 > issue { j -= 1 }
        guard cdate(j) != nil else { throw fail(FormulaErrors.num) }
        var periods: [(Int, Int)] = []
        var jj = j
        while let d0 = cdate(jj), let d1 = cdate(jj + 1) {
            if d0 >= settl { break }
            periods.append((d0, d1))
            jj += 1
            guard jj < 10000 else { throw fail(FormulaErrors.num) }
        }
        guard !periods.isEmpty else { throw fail(FormulaErrors.num) }
        func dayCount(_ x: Int, _ y: Int) -> Double {
            if basis == 1 || basis == 2 || basis == 3 { return Double(y - x) }
            guard let cx = ExcelDate.civil(fromSerial: x), let cy = ExcelDate.civil(fromSerial: y) else { return 0 }
            return Double(Self.days360Bond(start: cx, end: cy, european: basis == 4))
        }
        func periodLen(_ d0: Int, _ d1: Int) -> Double {
            if basis == 1 { return Double(d1 - d0) }
            if basis == 3 { return 365 / Double(freq) }
            return 360 / Double(freq)
        }
        let firstLen = periodLen(periods[0].0, periods[0].1)
        var total = 0.0
        for (d0, d1) in periods {
            let lo = max(issue, d0), hi = min(settl, d1)
            guard hi > lo else { continue }
            if lo == d0 && hi == d1 {
                total += 1
            } else {
                total += dayCount(lo, hi) / firstLen
            }
        }
        let res = par * rate / Double(freq) * total
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    // MARK: Khấu hao Pháp (M7 lát 61, golden batch 7)

    /// Đối số chung AMORLINC/AMORDEGRC: (cost, purchase, first, salvage,
    /// period, rate, [basis]). Theo engine JS: cost ≥ 0, 0 ≤ salvage ≤ cost,
    /// period ≥ 0 (cắt phần lẻ), rate > 0, first ≥ purchase; basis mặc định 0,
    /// nguyên trong 0...4, basis 2 → #NUM! (Excel không cho basis 2 ở đây).
    /// Basis không nguyên → #NUM! (quy ước như YEARFRAC của Swift; JS cắt lẻ).
    private func amorArgs(_ a: [FormulaExpr]) throws -> (cost: Double, purchase: Int, first: Int, salvage: Double, period: Int, rate: Double, basis: Int) {
        try need(a, 6...7)
        let cost = try nm(a[0])
        let purchase = try dateArg(a[1]), first = try dateArg(a[2])
        let salvage = try nm(a[3])
        let periodRaw = try nm(a[4])
        let rate = try nm(a[5])
        let basis = try basisValue(a, 6)
        guard cost >= 0, salvage >= 0, salvage <= cost, periodRaw >= 0, rate > 0,
              basis != 2, first >= purchase else {
            throw fail(FormulaErrors.num)
        }
        return (cost, purchase, first, salvage, Int(periodRaw.rounded(.towardZero)), rate, basis)
    }

    /// YEARFRAC nội bộ cho AMOR*: purchase ≤ first nên frac ≥ 0.
    private func amorYearFrac(purchase: Int, first: Int, basis: Int) throws -> Double {
        guard case .number(let f) = try yearfrac([.number(Double(purchase)), .number(Double(first)), .number(Double(basis))]) else {
            throw fail(FormulaErrors.num)
        }
        return f
    }

    /// AMORLINC(cost, purchase, first, salvage, period, rate, [basis]):
    /// khấu hao tuyến tính kiểu Pháp. Kỳ 0 = YEARFRAC(purchase, first, basis)
    /// × rate × cost; các kỳ đầy đủ = cost × rate; kỳ cuối lấy phần còn lại
    /// (cost − salvage − firstDep − oneRate × full); sau đó 0. Port engine JS
    /// (formula-functions-securities.js), đối chiếu golden Excel 2016 batch 7.
    private func amorLinc(_ a: [FormulaExpr]) throws -> CellValue {
        let g = try amorArgs(a)
        guard g.cost > 0 else { return .number(0) } // cost = 0 → mọi kỳ đều 0 (tránh 0/0)
        let oneRate = g.cost * g.rate
        let frac = try amorYearFrac(purchase: g.purchase, first: g.first, basis: g.basis)
        let firstDep = frac * g.rate * g.cost
        let full = Int(((g.cost - g.salvage - firstDep) / oneRate).rounded(.towardZero))
        if g.period == 0 { return .number(firstDep) }
        if g.period <= full { return .number(oneRate) }
        if g.period == full + 1 {
            return .number(g.cost - g.salvage - oneRate * Double(full) - firstDep)
        }
        return .number(0)
    }

    /// AMORDEGRC(cost, purchase, first, salvage, period, rate, [basis]):
    /// khấu hao giảm dần kiểu Pháp, làm tròn từng kỳ theo Math.round (nửa lên;
    /// mọi giá trị ≥ 0 nên .rounded() của Swift trùng JS). Hệ số theo
    /// 1/rate: < 3 → 1, < 4 → 1.5, ≤ 6 → 2, còn lại 2.5. Kỳ 0 =
    /// round(frac × rate × cost); mỗi kỳ sau round(rate × cost còn lại); khi
    /// vượt salvage: kỳ áp chót lấy round(cost × 0.5), các kỳ sau 0.
    /// Port engine JS, đối chiếu golden Excel 2016 batch 7.
    private func amorDegrc(_ a: [FormulaExpr]) throws -> CellValue {
        let g = try amorArgs(a)
        let life = 1 / g.rate
        let coeff: Double = life < 3 ? 1 : life < 4 ? 1.5 : life <= 6 ? 2 : 2.5
        let rate = g.rate * coeff
        let frac = try amorYearFrac(purchase: g.purchase, first: g.first, basis: g.basis)
        var nRate = (frac * rate * g.cost).rounded()
        if g.period == 0 { return .number(nRate) }
        var cost = g.cost - nRate
        var rest = cost - g.salvage
        for n in 0..<g.period {
            nRate = (rate * cost).rounded()
            if nRate == 0 { return .number(0) } // không khấu hao thêm được nữa; các kỳ sau cũng 0
            rest -= nRate
            if rest < 0 {
                return .number(g.period - n <= 1 ? (cost * 0.5).rounded() : 0)
            }
            cost -= nRate
        }
        return .number(nRate)
    }

    // MARK: Trái phiếu kỳ lẻ + khấu hao đường thẳng (M7 lát 62)
    // ODDFPRICE/ODDFYIELD/ODDLPRICE/ODDLYIELD + SLN: hoàn tất nhóm tài chính
    // Excel 2016. ODDF* theo công thức tài liệu Microsoft (vd ODDFPRICE
    // basis 1 = 113.59771747407883; kỳ dài: chia kỳ lẻ thành các kỳ giả
    // quasi-coupon). ODDL* port engine JS (formula-functions-securities.js),
    // đối chiếu golden Excel 2016 batch 9 (16 ca). SLN đối chiếu LibreOffice
    // 24.2.7.2. Lưu ý: LibreOffice 24.2 KHÔNG tính được ODDFPRICE/ODDFYIELD
    // (trả #VALUE! với mọi đối số hợp lệ) nên ODDF* đối chiếu bằng ví dụ
    // Microsoft + gói `formulas` 1.3.4 (29/31 ca wide; 2 ca ODDL basis 1
    // lệch do `formulas` dùng phân số năm khác Excel — golden batch 9 thắng).
    // Quy ước lỗi: yld ≤ 0 hoặc redemption ≤ 0 → #NUM! ở nhóm ODD* (theo
    // `formulas`/ODF; tài liệu Microsoft chỉ ghi yld < 0 — chờ xác nhận
    // bằng Excel thật ở #11).

    /// Số ngày theo basis: 0/4 = 30/360 (Mỹ/châu Âu), còn lại = ngày thực.
    private static func oddDayCount(start: Int, end: Int, basis: Int) -> Double {
        switch basis {
        case 0, 4:
            guard let s = ExcelDate.civil(fromSerial: start),
                  let e = ExcelDate.civil(fromSerial: end) else { return .nan }
            return Double(Self.days360Value(start: s, end: e, european: basis == 4))
        default:
            return Double(end - start)
        }
    }

    /// (pcd, ncd, số ngày coupon trong (settlement, anchor]) trên lưới neo ở
    /// `anchor` (ngày coupon), bước `monthsPerCoupon` tháng, quy tắc cuối
    /// tháng theo anchor — bản tổng quát của couponBounds (neo ở maturity).
    private static func oddGridBounds(settlement s: Int, anchor: ExcelDate.Civil, monthsPerCoupon mp: Int) -> (pcd: Int, ncd: Int, count: Int)? {
        guard let sc = ExcelDate.civil(fromSerial: s) else { return nil }
        func date(_ k: Int) -> Int? { couponDate(maturity: anchor, monthsPerCoupon: mp, periodsBack: k) }
        var k = max(0, ((anchor.year - sc.year) * 12 + (anchor.month - sc.month)) / mp)
        while let ck = date(k), ck > s { k += 1 }
        while k > 0, let prev = date(k - 1), prev <= s { k -= 1 }
        guard k >= 1, let pcd = date(k), let ncd = date(k - 1) else { return nil }
        return (pcd, ncd, k)
    }

    /// E = số ngày trong kỳ coupon chuẩn: basis 1 = ncd − pcd trên lưới neo
    /// ở first coupon; basis 0/2/4 = 360/frequency; basis 3 = 365/frequency.
    private static func oddPeriodE(settlement s: Int, firstCoupon fc: Int, freq: Int, basis: Int) -> Double {
        switch basis {
        case 1:
            guard let fcc = ExcelDate.civil(fromSerial: fc),
                  let b = Self.oddGridBounds(settlement: s, anchor: fcc, monthsPerCoupon: 12 / freq) else { return .nan }
            return Double(b.ncd - b.pcd)
        case 3:
            return 365 / Double(freq)
        default:
            return 360 / Double(freq)
        }
    }

    /// Đối số chung ODDF*: (settlement, maturity, issue, first_coupon, rate,
    /// yld/pr, redemption, frequency, [basis]).
    private func oddfArgs(_ a: [FormulaExpr]) throws -> (s: Int, m: Int, issue: Int, fc: Int, rate: Double, y2: Double, red: Double, freq: Int, basis: Int) {
        try need(a, 8...9)
        let s = try dateArg(a[0]), m = try dateArg(a[1]), issue = try dateArg(a[2]), fc = try dateArg(a[3])
        let rate = try nm(a[4]), y2 = try nm(a[5]), red = try nm(a[6])
        let fRaw = try nm(a[7])
        let freq = Int(fRaw.rounded(.towardZero))
        guard [1, 2, 4].contains(freq), fRaw == Double(freq) else { throw fail(FormulaErrors.num) }
        let basis = try basisValue(a, 8)
        return (s, m, issue, fc, rate, y2, red, freq, basis)
    }

    /// Giá ODDF kỳ đầu NGẮN (DFC < E): coupon đầu thu hẹp theo DFC/E, các
    /// coupon sau đầy đủ; chiết khấu theo (DSC/E + k − 1) kỳ, trừ lãi tích
    /// lũy cpn × A/E. A/DSC/DFC đo từ issue (đầu kỳ lẻ); E neo ở first coupon.
    private static func oddfShortValue(s: Int, m: Int, issue: Int, fc: Int, rate: Double, yld: Double, redemp: Double, freq: Int, basis: Int) -> Double {
        let f = Double(freq)
        let cpn = 100 * rate / f
        let y = yld / f
        let e = Self.oddPeriodE(settlement: s, firstCoupon: fc, freq: freq, basis: basis)
        let a = Self.oddDayCount(start: issue, end: s, basis: basis)
        let dsc = Self.oddDayCount(start: s, end: fc, basis: basis)
        let dfc = Self.oddDayCount(start: issue, end: fc, basis: basis)
        guard let mc = ExcelDate.civil(fromSerial: m),
              let n = Self.couponBounds(settlement: s, maturity: mc, monthsPerCoupon: 12 / freq)?.count else { return .nan }
        let t0 = dsc / e
        var total = redemp / pow(1 + y, Double(n - 1) + t0)
        total += cpn * (dfc / e) / pow(1 + y, t0)
        if n >= 2 {
            for k in 2...n {
                total += cpn / pow(1 + y, Double(k - 1) + t0)
            }
        }
        total -= cpn * (a / e)
        return total
    }

    /// Giá ODDF kỳ đầu DÀI (DFC ≥ E): kỳ lẻ chia thành NC kỳ giả
    /// (quasi-coupon) bước theo lưới coupon. Coupon đầu = cpn × Σ(DCi/NLi);
    /// lãi tích lũy = cpn × Σ(Ai/NLi); chiết khấu dịch thêm Nq kỳ giả
    /// nguyên giữa settlement và first coupon. N = số coupon trong
    /// (first_coupon, maturity] (không tính coupon đầu).
    private static func oddfLongValue(s: Int, m: Int, issue: Int, fc: Int, rate: Double, yld: Double, redemp: Double, freq: Int, basis: Int) -> Double {
        let mp = 12 / freq
        guard let fcc = ExcelDate.civil(fromSerial: fc),
              let mc = ExcelDate.civil(fromSerial: m) else { return .nan }
        let f = Double(freq)
        let cpn = 100 * rate / f
        let y = yld / f
        let e = Self.oddPeriodE(settlement: s, firstCoupon: fc, freq: freq, basis: basis)
        // Biên kỳ giả tăng dần: issue, các ngày lưới trong (issue, fc), fc.
        var bounds = [issue]
        var k = 1
        while let d = Self.couponDate(maturity: fcc, monthsPerCoupon: mp, periodsBack: k), d > issue {
            bounds.append(d)
            k += 1
            guard k <= 10000 else { return .nan }
        }
        bounds = [issue] + bounds.dropFirst().reversed() + [fc]
        let nc = bounds.count - 1
        // NLi của kỳ giả đầu (basis 1): độ dài đầy đủ của kỳ lưới kết thúc ở b[1].
        let nl1: Double = {
            if basis != 1 { return e }
            guard let q = Self.couponDate(maturity: fcc, monthsPerCoupon: mp, periodsBack: nc) else { return .nan }
            return Self.oddDayCount(start: q, end: bounds[1], basis: basis)
        }()
        var dcSum = 0.0, aiSum = 0.0
        for i in 1...nc {
            let nl: Double = basis == 1 ? (i == 1 ? nl1 : Self.oddDayCount(start: bounds[i - 1], end: bounds[i], basis: basis)) : e
            let actualLen: Double = i == 1
                ? max(0, Self.oddDayCount(start: issue, end: bounds[1], basis: basis))
                : Self.oddDayCount(start: bounds[i - 1], end: bounds[i], basis: basis)
            let dc: Double = i == 1 ? actualLen : nl
            dcSum += dc / nl
            let ai: Double
            if s <= bounds[i - 1] {
                ai = 0
            } else if s >= bounds[i] {
                ai = actualLen
            } else {
                ai = Self.oddDayCount(start: bounds[i - 1], end: s, basis: basis)
            }
            aiSum += ai / nl
        }
        // Nq: số kỳ giả nguyên giữa settlement và first coupon; DSC: ngày
        // settlement → ngày coupon lưới kế tiếp (quasi), theo đúng basis
        // (basis 2/3: ngày thực; còn lại: E − ngày(pcd, settlement)).
        guard let gb = Self.oddGridBounds(settlement: s, anchor: fcc, monthsPerCoupon: mp) else { return .nan }
        let nq = gb.count - 1
        let dsc: Double
        switch basis {
        case 2, 3:
            dsc = Self.oddDayCount(start: s, end: gb.ncd, basis: basis)
        default:
            dsc = e - Self.oddDayCount(start: gb.pcd, end: s, basis: basis)
        }
        guard let n = Self.couponBounds(settlement: fc, maturity: mc, monthsPerCoupon: mp)?.count else { return .nan }
        let t0 = Double(nq) + dsc / e
        var total = redemp / pow(1 + y, Double(n) + t0)
        total += cpn * dcSum / pow(1 + y, t0)
        if n >= 1 {
            for kk in 1...n {
                total += cpn / pow(1 + y, Double(kk) + t0)
            }
        }
        total -= cpn * aiSum
        return total
    }

    /// Giá ODDF chung: kỳ ngắn dùng công thức ngắn, còn lại dùng kỳ dài.
    private static func oddfPriceValue(s: Int, m: Int, issue: Int, fc: Int, rate: Double, yld: Double, redemp: Double, freq: Int, basis: Int) -> Double {
        let dfc = Self.oddDayCount(start: issue, end: fc, basis: basis)
        let e = Self.oddPeriodE(settlement: s, firstCoupon: fc, freq: freq, basis: basis)
        if dfc < e {
            return Self.oddfShortValue(s: s, m: m, issue: issue, fc: fc, rate: rate, yld: yld, redemp: redemp, freq: freq, basis: basis)
        }
        return Self.oddfLongValue(s: s, m: m, issue: issue, fc: fc, rate: rate, yld: yld, redemp: redemp, freq: freq, basis: basis)
    }

    /// ODDFPRICE(settlement, maturity, issue, first_coupon, rate, yld,
    /// redemption, frequency, [basis]). Điều kiện ngày (nghiêm ngặt):
    /// maturity > first_coupon > settlement > issue; rate < 0, yld ≤ 0
    /// hoặc redemption ≤ 0 → #NUM!.
    private func oddfPrice(_ a: [FormulaExpr]) throws -> CellValue {
        let b = try oddfArgs(a)
        guard b.m > b.fc, b.fc > b.s, b.s > b.issue, b.rate >= 0, b.y2 > 0, b.red > 0 else {
            throw fail(FormulaErrors.num)
        }
        let res = Self.oddfPriceValue(s: b.s, m: b.m, issue: b.issue, fc: b.fc, rate: b.rate, yld: b.y2, redemp: b.red, freq: b.freq, basis: b.basis)
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// ODDFYIELD(settlement, maturity, issue, first_coupon, rate, pr,
    /// redemption, frequency, [basis]): giải ODDFPRICE(yld) = pr bằng Newton
    /// (đạo hàm số) + chia đôi dự phòng trên (−frequency, +∞), mẫu YIELD.
    private func oddfYield(_ a: [FormulaExpr]) throws -> CellValue {
        let b = try oddfArgs(a)
        let pr = b.y2
        guard b.m > b.fc, b.fc > b.s, b.s > b.issue, b.rate >= 0, pr > 0, b.red > 0 else {
            throw fail(FormulaErrors.num)
        }
        let f = Double(b.freq)
        func fn(_ yld: Double) -> Double {
            Self.oddfPriceValue(s: b.s, m: b.m, issue: b.issue, fc: b.fc, rate: b.rate, yld: yld, redemp: b.red, freq: b.freq, basis: b.basis) - pr
        }
        var yld = b.rate > 0 ? b.rate : 0.05
        for _ in 0..<100 {
            let fv = fn(yld)
            guard fv.isFinite else { throw fail(FormulaErrors.num) }
            if abs(fv) < 1e-12 { return .number(yld) }
            let d = (fn(yld + 1e-7) - fv) / 1e-7
            guard d.isFinite, d != 0 else { break }
            let next = yld - fv / d
            guard next.isFinite, next > -f + 1e-9 else { break }
            if abs(next - yld) < 1e-13 { return .number(next) }
            yld = next
        }
        var lo = -f + 1e-9, hi = 1.0
        let flo = fn(lo)
        guard flo.isFinite, flo > 0 else { throw fail(FormulaErrors.num) }
        if flo == 0 { return .number(lo) }
        while fn(hi) > 0, hi < 1e6 { hi *= 2 }
        guard fn(hi) <= 0 else { throw fail(FormulaErrors.num) }
        for _ in 0..<200 {
            let mid = (lo + hi) / 2
            let fm = fn(mid)
            guard fm.isFinite else { throw fail(FormulaErrors.num) }
            if abs(fm) < 1e-12 || hi - lo < 1e-13 { return .number(mid) }
            if fm > 0 { lo = mid } else { hi = mid }
        }
        return .number((lo + hi) / 2)
    }

    /// Đối số chung ODDL*: (settlement, maturity, last_interest, rate,
    /// yld/pr, redemption, frequency, [basis]).
    private func oddlArgs(_ a: [FormulaExpr]) throws -> (s: Int, m: Int, l: Int, rate: Double, y2: Double, red: Double, freq: Int, basis: Int) {
        try need(a, 7...8)
        let s = try dateArg(a[0]), m = try dateArg(a[1]), l = try dateArg(a[2])
        let rate = try nm(a[3]), y2 = try nm(a[4]), red = try nm(a[5])
        let fRaw = try nm(a[6])
        let freq = Int(fRaw.rounded(.towardZero))
        guard [1, 2, 4].contains(freq), fRaw == Double(freq) else { throw fail(FormulaErrors.num) }
        let basis = try basisValue(a, 7)
        return (s, m, l, rate, y2, red, freq, basis)
    }

    /// Các số hạng kỳ cuối lẻ (port engine JS oddLastTerms): E = độ dài kỳ
    /// coupon chuẩn; DSM = ngày settlement → maturity; DLM = ngày last →
    /// maturity; A = ngày last → settlement (đều theo basis).
    private static func oddlTerms(s: Int, m: Int, l: Int, freq: Int, basis: Int) -> (e: Double, dsm: Double, dlm: Double, a: Double) {
        let e: Double
        switch basis {
        case 0, 4:
            e = 360 / Double(freq)
        default:
            guard let mc = ExcelDate.civil(fromSerial: m) else { return (.nan, .nan, .nan, .nan) }
            let prev = Self.couponDate(maturity: mc, monthsPerCoupon: 12 / freq, periodsBack: 1)
            guard let p = prev else { return (.nan, .nan, .nan, .nan) }
            e = Double(m - p)
        }
        return (e,
                Self.oddDayCount(start: s, end: m, basis: basis),
                Self.oddDayCount(start: l, end: m, basis: basis),
                Self.oddDayCount(start: l, end: s, basis: basis))
    }

    /// ODDLPRICE(settlement, maturity, last_interest, rate, yld, redemption,
    /// frequency, [basis]): (redemption + DLM/E × c) / (1 + DSM/E × yld/freq)
    /// − A/E × c, c = 100 × rate/frequency. Điều kiện: maturity > settlement
    /// > last_interest; rate < 0, yld ≤ 0 hoặc redemption ≤ 0 → #NUM!.
    private func oddlPrice(_ a: [FormulaExpr]) throws -> CellValue {
        let b = try oddlArgs(a)
        guard b.m > b.s, b.s > b.l, b.rate >= 0, b.y2 > 0, b.red > 0 else {
            throw fail(FormulaErrors.num)
        }
        let t = Self.oddlTerms(s: b.s, m: b.m, l: b.l, freq: b.freq, basis: b.basis)
        let c = 100 * b.rate / Double(b.freq)
        let res = (b.red + t.dlm / t.e * c) / (1 + t.dsm / t.e * b.y2 / Double(b.freq)) - t.a / t.e * c
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// ODDLYIELD(settlement, maturity, last_interest, rate, pr, redemption,
    /// frequency, [basis]): dạng đóng từ ODDLPRICE — ((redemption + DLM/E ×
    /// c) − dirty) / dirty × (E/DSM) × frequency, dirty = pr + A/E × c.
    /// pr ≤ 0 → #NUM!; dirty = 0 hoặc DSM = 0 → #DIV/0!.
    private func oddlYield(_ a: [FormulaExpr]) throws -> CellValue {
        let b = try oddlArgs(a)
        guard b.m > b.s, b.s > b.l, b.rate >= 0, b.y2 > 0, b.red > 0 else {
            throw fail(FormulaErrors.num)
        }
        let t = Self.oddlTerms(s: b.s, m: b.m, l: b.l, freq: b.freq, basis: b.basis)
        let c = 100 * b.rate / Double(b.freq)
        let dirty = b.y2 + t.a / t.e * c
        guard dirty != 0, t.dsm != 0 else { throw fail(FormulaErrors.div0) }
        let res = ((b.red + t.dlm / t.e * c) - dirty) / dirty * (t.e / t.dsm) * Double(b.freq)
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// SLN(cost, salvage, life) = (cost − salvage) / life; life = 0 →
    /// #DIV/0! (đối chiếu LibreOffice 24.2.7.2; life âm/cost âm vẫn tính
    /// số học, không cấm riêng).
    private func sln(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 3...3)
        let cost = try nm(a[0]), salvage = try nm(a[1]), life = try nm(a[2])
        guard life != 0 else { throw fail(FormulaErrors.div0) }
        let res = (cost - salvage) / life
        guard res.isFinite else { throw fail(FormulaErrors.num) }
        return .number(res)
    }

    /// DB(cost, salvage, life, period, [month]): khấu hao số dư cố định.
    /// rate = 1 − (salvage/cost)^(1/life), làm tròn 3 chữ số thập phân.
    /// Kỳ 1 nhân month/12; kỳ cuối (life+1, khi month < 12) nhân (12−month)/12.
    /// period/month cắt phần lẻ (tài liệu Microsoft; LibreOffice 24.2.7.2
    /// đồng ý — KHÁC engine JS của repo, vốn trả #NUM! khi period/month
    /// không nguyên). cost ≤ 0, salvage < 0, salvage > cost, life ≤ 0,
    /// period < 1, period > life + (month < 12 ? 1 : 0), month < 1 hoặc
    /// > 12 → #NUM! (theo engine JS + tài liệu Microsoft; LibreOffice trả
    /// #VALUE! cho mọi lỗi đối số và trả 0 khi period > life với month = 12
    /// — chờ Excel thật #11). life lẻ dùng nguyên cho rate (LO: 6.5 → 2980).
    private func db(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 4...5)
        let cost = try nm(a[0]), salvage = try nm(a[1]), life = try nm(a[2]), periodRaw = try nm(a[3])
        let monthRaw = (a.count == 5 && a[4] != .empty) ? try nm(a[4]) : 12
        let period = Int(periodRaw.rounded(.towardZero)), month = Int(monthRaw.rounded(.towardZero))
        let finalPeriod = life + (month < 12 ? 1 : 0)
        guard cost > 0, salvage >= 0, salvage <= cost, life > 0,
              period >= 1, Double(period) <= finalPeriod,
              month >= 1, month <= 12 else { throw fail(FormulaErrors.num) }
        var rate = 1 - pow(salvage / cost, 1 / life)
        rate = (rate * 1000).rounded() / 1000
        var remaining = cost, dep = 0.0
        for i in 1...period {
            if i == 1 {
                dep = cost * rate * Double(month) / 12
            } else if Double(i) == life + 1 {
                dep = remaining * rate * Double(12 - month) / 12
            } else {
                dep = remaining * rate
            }
            remaining -= dep
        }
        guard dep.isFinite else { throw fail(FormulaErrors.num) }
        return .number(dep)
    }

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

    // MARK: CONVERT (M7 lát 55, INBOX-MAC #17) — đổi đơn vị đo/lượng.
    // Bảng đơn vị + tiền tố port trung thực từ engine JS của repo
    // (apps/sheet/formula-functions-engineering.js, EXCEL-E1c), đối chiếu
    // golden Excel 2016 batch 6 (49 ca). Đơn vị lạ hoặc khác nhóm → #N/A.

    /// Một đơn vị CONVERT: nhóm + hệ số về đơn vị cơ sở của nhóm.
    private struct ConvertUnit {
        let group: String
        let factor: Double
        let prefix: Bool  // cho phép tiền tố SI (vd km = k + m)
        let binary: Bool  // cho phép tiền tố nhị phân (chỉ information)
    }

    private static let convertUnits: [String: ConvertUnit] = {
        var u: [String: ConvertUnit] = [:]
        func add(_ group: String, _ name: String, _ factor: Double, _ prefix: Bool = false, _ binary: Bool = false) {
            u[name] = ConvertUnit(group: group, factor: factor, prefix: prefix, binary: binary)
        }
        // Khối lượng (g)
        add("mass", "g", 1, true); add("mass", "sg", 14593.90293720636); add("mass", "lbm", 453.59237)
        add("mass", "u", 1.66053100460465e-24, true); add("mass", "ozm", 28.349523125)
        add("mass", "grain", 0.06479891); add("mass", "cwt", 45359.237); add("mass", "shweight", 45359.237)
        add("mass", "uk_cwt", 50802.34544); add("mass", "lcwt", 50802.34544); add("mass", "hweight", 50802.34544)
        add("mass", "stone", 6350.29318); add("mass", "ton", 907184.74); add("mass", "uk_ton", 1016046.9088)
        add("mass", "LTON", 1016046.9088); add("mass", "brton", 1016046.9088)
        // Khoảng cách (m)
        add("distance", "m", 1, true); add("distance", "mi", 1609.344); add("distance", "Nmi", 1852)
        add("distance", "in", 0.0254); add("distance", "ft", 0.3048); add("distance", "yd", 0.9144)
        add("distance", "ang", 1e-10, true); add("distance", "ell", 1.143)
        add("distance", "ly", 9.4607304725808e15); add("distance", "parsec", 3.08567758128155e16)
        add("distance", "pc", 3.08567758128155e16); add("distance", "Pica", 0.0254 / 6)
        add("distance", "pica", 0.0254 / 6); add("distance", "survey_mi", 1609.3472186944373)
        // Thời gian (s)
        add("time", "yr", 31557600); add("time", "day", 86400); add("time", "d", 86400)
        add("time", "hr", 3600); add("time", "mn", 60); add("time", "min", 60)
        add("time", "sec", 1, true); add("time", "s", 1, true)
        // Áp suất (Pa)
        add("pressure", "Pa", 1, true); add("pressure", "p", 1, true)
        add("pressure", "atm", 101325, true); add("pressure", "at", 101325, true)
        add("pressure", "mmHg", 133.322, true); add("pressure", "Torr", 133.322368421053, true)
        // Thêm ngoài bảng JS (Excel có, JS thiếu): 1 psi = 1 lbf/in², tính từ
        // hai hằng đã có trong bảng (lbf, in²) — kiểm chứng bằng số học.
        add("pressure", "psi", 6894.757293168361)
        // Lực (N)
        add("force", "N", 1, true); add("force", "dyn", 1e-5, true); add("force", "dy", 1e-5, true)
        add("force", "lbf", 4.4482216152605); add("force", "pond", 0.00980665, true)
        // Năng lượng (J)
        add("energy", "J", 1, true); add("energy", "e", 1e-7, true); add("energy", "c", 4.184, true)
        add("energy", "cal", 4.1868, true); add("energy", "eV", 1.602176487e-19, true)
        add("energy", "ev", 1.602176487e-19, true); add("energy", "HPh", 2684519.5368856)
        add("energy", "hh", 2684519.5368856); add("energy", "Wh", 3600, true); add("energy", "wh", 3600, true)
        add("energy", "flb", 1.3558179483314); add("energy", "BTU", 1055.05585262); add("energy", "btu", 1055.05585262)
        // Công suất (W)
        add("power", "HP", 745.69987158227); add("power", "h", 745.69987158227); add("power", "PS", 735.49875)
        add("power", "W", 1, true); add("power", "w", 1, true)
        // Từ trường (T)
        add("magnetism", "T", 1, true); add("magnetism", "ga", 1e-4, true)
        // Thể tích (l)
        add("volume", "l", 1, true); add("volume", "L", 1, true); add("volume", "lt", 1, true)
        add("volume", "tsp", 0.00492892159375); add("volume", "tspm", 0.005); add("volume", "tbs", 0.01478676478125)
        add("volume", "oz", 0.0295735295625); add("volume", "cup", 0.2365882365); add("volume", "pt", 0.473176473)
        add("volume", "us_pt", 0.473176473); add("volume", "uk_pt", 0.56826125)
        add("volume", "qt", 0.946352946); add("volume", "uk_qt", 1.1365225); add("volume", "gal", 3.785411784)
        add("volume", "uk_gal", 4.54609); add("volume", "m3", 1000, true)
        add("volume", "mi3", 4168181825.440579584e3); add("volume", "Nmi3", 6352182208e3)
        add("volume", "in3", 0.016387064); add("volume", "ft3", 28.316846592); add("volume", "yd3", 764.554857984)
        add("volume", "ang3", 1e-27, true); add("volume", "ly3", 8.46786664623715e50)
        // Diện tích (m2)
        add("area", "m2", 1, true); add("area", "ar", 100, true); add("area", "ha", 10000)
        add("area", "in2", 0.00064516); add("area", "ft2", 0.09290304); add("area", "yd2", 0.83612736)
        add("area", "mi2", 2589988.110336); add("area", "Nmi2", 3429904)
        add("area", "uk_acre", 4046.8564224); add("area", "us_acre", 4046.87260987425)
        // Thông tin (bit)
        add("information", "bit", 1, true, true); add("information", "byte", 8, true, true)
        // Tốc độ (m/s)
        add("speed", "m/s", 1, true); add("speed", "m/sec", 1, true)
        add("speed", "m/h", 1 / 3600, true); add("speed", "m/hr", 1 / 3600, true)
        add("speed", "mph", 0.44704); add("speed", "kn", 1852 / 3600); add("speed", "admkn", 1852 / 3600)
        return u
    }()

    /// Tiền tố SI (chữ "e" = 10 như engine JS; "da" = deka).
    private static let siPrefix: [String: Double] = [
        "Y": 1e24, "Z": 1e21, "E": 1e18, "P": 1e15, "T": 1e12, "G": 1e9, "M": 1e6,
        "k": 1e3, "h": 1e2, "e": 1e1, "da": 1e1, "d": 1e-1, "c": 1e-2, "m": 1e-3,
        "u": 1e-6, "n": 1e-9, "p": 1e-12, "f": 1e-15, "a": 1e-18, "z": 1e-21, "y": 1e-24
    ]

    /// Tiền tố nhị phân (chỉ dùng cho bit/byte).
    private static let binPrefix: [String: Double] = [
        "Yi": pow(2.0, 80), "Zi": pow(2.0, 70), "Ei": pow(2.0, 60), "Pi": pow(2.0, 50),
        "Ti": pow(2.0, 40), "Gi": pow(2.0, 30), "Mi": pow(2.0, 20), "ki": pow(2.0, 10)
    ]

    /// Tên nhiệt độ chuẩn (kể cả bí danh).
    private static let tempNames: [String: String] = [
        "C": "C", "cel": "C", "F": "F", "fah": "F", "K": "K", "kel": "K", "Rank": "Rank", "Reau": "Reau"
    ]

    /// Đơn vị đã phân giải: nhóm + hệ số + hệ số tiền tố (+ tên nhiệt độ).
    private struct ResolvedUnit {
        let group: String
        let factor: Double
        let multiplier: Double
        let temp: String?
    }

    /// Phân giải tên đơn vị: khớp đúng tên trước, rồi tách tiền tố (2 ký tự
    /// trước, 1 ký tự sau) khỏi đơn vị gốc cho phép tiền tố; cuối cùng thử
    /// nhiệt độ có tiền tố (vd "mK"). Không khớp → nil.
    private func resolveUnit(_ name: String) -> ResolvedUnit? {
        if let u = Self.convertUnits[name] {
            return ResolvedUnit(group: u.group, factor: u.factor, multiplier: 1, temp: nil)
        }
        if let t = Self.tempNames[name] {
            return ResolvedUnit(group: "temperature", factor: 1, multiplier: 1, temp: t)
        }
        for len in [2, 1] {
            guard name.count > len else { continue }
            let prefix = String(name.prefix(len)), rest = String(name.dropFirst(len))
            guard let unit = Self.convertUnits[rest], unit.prefix else { continue }
            if len == 2, let b = Self.binPrefix[prefix], unit.binary {
                return ResolvedUnit(group: unit.group, factor: unit.factor, multiplier: b, temp: nil)
            }
            if let s = Self.siPrefix[prefix] {
                return ResolvedUnit(group: unit.group, factor: unit.factor, multiplier: s, temp: nil)
            }
        }
        if name.count > 1, let t = Self.tempNames[String(name.dropFirst())],
           let s = Self.siPrefix[String(name.prefix(1))] {
            return ResolvedUnit(group: "temperature", factor: 1, multiplier: s, temp: t)
        }
        return nil
    }

    private func toKelvin(_ value: Double, _ unit: String) -> Double {
        switch unit {
        case "C": return value + 273.15
        case "F": return (value - 32) * 5 / 9 + 273.15
        case "K": return value
        case "Rank": return value * 5 / 9
        case "Reau": return value * 5 / 4 + 273.15
        default: return .nan
        }
    }

    private func fromKelvin(_ kelvin: Double, _ unit: String) -> Double {
        switch unit {
        case "C": return kelvin - 273.15
        case "F": return (kelvin - 273.15) * 9 / 5 + 32
        case "K": return kelvin
        case "Rank": return kelvin * 9 / 5
        case "Reau": return (kelvin - 273.15) * 4 / 5
        default: return .nan
        }
    }

    /// Số mũ của đơn vị diện tích/thể tích (m2 → 2, m3 → 3) để lũy thừa hệ số
    /// tiền tố (vd "km2" = (1000 m)², "cm3" = (0.01 m)³). Theo engine JS.
    private func convertPower(_ name: String) -> Int {
        let letters = name.prefix(while: { $0.isASCII && $0.isLetter })
        let stripped = String(name.dropFirst(min(letters.count, 2)))
        if stripped.hasSuffix("3") || name.hasSuffix("3") { return 3 }
        if name.hasSuffix("2") { return 2 }
        return 1
    }

    /// CONVERT(number, from_unit, to_unit): đổi đơn vị. Đúng 3 đối số, nếu
    /// không → #VALUE!; đơn vị lạ hoặc khác nhóm → #N/A; nhiệt độ đổi qua K.
    private func convertFn(_ a: [FormulaExpr]) throws -> CellValue {
        try need(a, 3...3)
        let value = try nm(a[0])
        let fromName = try tx(a[1]), toName = try tx(a[2])
        guard let from = resolveUnit(fromName), let to = resolveUnit(toName),
              from.group == to.group else {
            throw fail(FormulaErrors.na)
        }
        if from.group == "temperature" {
            let k = from.multiplier == 1
                ? toKelvin(value, from.temp!) : toKelvin(value * from.multiplier, from.temp!)
            var out = fromKelvin(k, to.temp!)
            if to.multiplier != 1 { out /= to.multiplier }
            guard out.isFinite else { throw fail(FormulaErrors.num) }
            return .number(out)
        }
        let result: Double
        if from.group == "volume" || from.group == "area" {
            let power = convertPower(fromName), toPower = convertPower(toName)
            result = value * from.factor * pow(from.multiplier, Double(power))
                / (to.factor * pow(to.multiplier, Double(toPower)))
        } else {
            result = value * from.factor * from.multiplier / (to.factor * to.multiplier)
        }
        guard result.isFinite else { throw fail(FormulaErrors.num) }
        return .number(result)
    }
}
