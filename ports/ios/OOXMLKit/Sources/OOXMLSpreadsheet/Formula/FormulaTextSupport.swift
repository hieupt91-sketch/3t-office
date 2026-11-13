import Foundation

/// Khớp ký tự đại diện kiểu Excel (`?` = 1 ký tự, `*` = chuỗi bất kỳ, `~` thoát), không phân biệt hoa/thường.
struct WildcardPattern {
    private enum Tok { case lit(Unicode.Scalar), any, star }
    private let toks: [Tok]
    let hasWildcards: Bool

    init(_ pattern: String) {
        var out: [Tok] = []
        var wild = false
        let s = Array(pattern.lowercased().unicodeScalars)
        var i = 0
        while i < s.count {
            let c = s[i]
            if c == "~", i + 1 < s.count, ["?", "*", "~"].contains(s[i + 1]) {
                out.append(.lit(s[i + 1])); i += 2; continue
            }
            if c == "?" { out.append(.any); wild = true }
            else if c == "*" { out.append(.star); wild = true }
            else { out.append(.lit(c)) }
            i += 1
        }
        toks = out; hasWildcards = wild
    }

    /// Khớp toàn bộ `text`.
    func matches(_ text: String) -> Bool {
        let t = Array(text.lowercased().unicodeScalars)
        return match(0, t, 0, anchoredEnd: true) != nil
    }

    /// Chỉ số (0-based, đơn vị scalar) nhỏ nhất ≥ `from` mà mẫu khớp tại đó (không neo cuối).
    func firstIndex(in text: String, from: Int) -> Int? {
        let t = Array(text.lowercased().unicodeScalars)
        guard from >= 0, from <= t.count else { return nil }
        for i in from...t.count where match(0, t, i, anchoredEnd: false) != nil { return i }
        return nil
    }

    private func match(_ pi: Int, _ t: [Unicode.Scalar], _ ti: Int, anchoredEnd: Bool) -> Int? {
        if pi == toks.count { return (!anchoredEnd || ti == t.count) ? ti : nil }
        switch toks[pi] {
        case .lit(let c):
            return ti < t.count && t[ti] == c ? match(pi + 1, t, ti + 1, anchoredEnd: anchoredEnd) : nil
        case .any:
            return ti < t.count ? match(pi + 1, t, ti + 1, anchoredEnd: anchoredEnd) : nil
        case .star:
            var k = ti
            while k <= t.count {
                if let r = match(pi + 1, t, k, anchoredEnd: anchoredEnd) { return r }
                k += 1
            }
            return nil
        }
    }
}

/// Tiêu chí của SUMIF/COUNTIF/...: ví dụ `">5"`, `"<>x"`, `"a*"`, `5`, `TRUE`.
struct FormulaCriterion {
    enum Operand { case number(Double), bool(Bool), text(String) }
    let op: String          // = <> < > <= >=
    let operand: Operand
    private let wildcard: WildcardPattern?

    init(_ v: CellValue) {
        switch v {
        case .number(let d): op = "="; operand = .number(d); wildcard = nil
        case .bool(let b): op = "="; operand = .bool(b); wildcard = nil
        case .empty: op = "="; operand = .number(0); wildcard = nil
        case .error(let e): op = "="; operand = .text(e); wildcard = nil
        case .string(let s):
            var o = "=", rest = s
            for p in ["<=", ">=", "<>", "<", ">", "="] where s.hasPrefix(p) { o = p; rest = String(s.dropFirst(p.count)); break }
            op = o
            let trimmed = rest.trimmingCharacters(in: .whitespaces)
            if !trimmed.isEmpty, FormulaCriterion.isPlainNumber(trimmed), let d = Double(trimmed), d.isFinite {
                operand = .number(d); wildcard = nil
            } else if rest.uppercased() == "TRUE" { operand = .bool(true); wildcard = nil }
            else if rest.uppercased() == "FALSE" { operand = .bool(false); wildcard = nil }
            else { operand = .text(rest); wildcard = WildcardPattern(rest) }
        }
    }

    static func isPlainNumber(_ s: String) -> Bool {
        s.unicodeScalars.allSatisfy { "0123456789.+-eE".unicodeScalars.contains($0) }
    }

    private func test(_ c: Int) -> Bool {
        switch op {
        case "=": return c == 0
        case "<>": return c != 0
        case "<": return c < 0
        case ">": return c > 0
        case "<=": return c <= 0
        default: return c >= 0
        }
    }

    func matches(_ cell: CellValue) -> Bool {
        switch (operand, cell) {
        case (.number(let n), .number(let d)):
            return test(d < n ? -1 : (d > n ? 1 : 0))
        case (.number, .string(let s)):
            // "=1" khớp ô văn bản "1"? Excel đếm cả hai; chỉ xét với = và <>.
            if op == "=" || op == "<>", case .number(let n) = operand,
               FormulaCriterion.isPlainNumber(s), let d = Double(s.trimmingCharacters(in: .whitespaces)) {
                return test(d < n ? -1 : (d > n ? 1 : 0))
            }
            return op == "<>"
        case (.number, .empty):
            return op == "<>"
        case (.number, _):
            return op == "<>"
        case (.bool(let b), .bool(let x)):
            return test(x == b ? 0 : (!x ? -1 : 1))
        case (.bool, _):
            return op == "<>"
        case (.text(let t), .string(let s)):
            if op == "=" || op == "<>" {
                let eq = wildcard!.matches(s)
                return op == "=" ? eq : !eq
            }
            let o = s.compare(t, options: [.caseInsensitive])
            return test(o == .orderedAscending ? -1 : (o == .orderedDescending ? 1 : 0))
        case (.text(let t), .empty):
            if t.isEmpty { return op == "=" }
            if wildcard?.hasWildcards == true, op == "=" || op == "<>" { return op == "=" ? wildcard!.matches("") : !wildcard!.matches("") }
            return op == "<>"
        case (.text(let t), .error(let e)):
            let eq = t.uppercased() == e
            return op == "=" ? eq : (op == "<>" ? !eq : false)
        case (.text, _):
            return op == "<>"
        }
    }
}

/// Định dạng cơ bản cho TEXT(): số (0 # , . %), chuỗi trong "..." và \x, ngày giờ (yyyy yy mmmm mmm mm m dddd ddd dd d hh h ss s AM/PM).
enum FormulaTextFormat {
    static let monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    static let dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    static let monthNamesVi = (1...12).map { "tháng \($0)" }
    static let monthNamesShortVi = (1...12).map { "thg \($0)" }
    static let dayNamesVi = ["Chủ nhật", "thứ hai", "thứ ba", "thứ tư", "thứ năm", "thứ sáu", "thứ bảy"]
    static let dayNamesShortVi = ["CN", "Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7"]

    /// Ngôn ngữ định dạng suy từ thẻ locale `[$-...]` ở đầu section; mặc định tiếng Anh như hành vi cũ.
    enum FmtLocale { case en, vi }

    /// Tách thẻ `[$...]` ở đầu section: `[$-vi-VN]`, `[$-042A]` (LCID hex), `[$₫-vi-VN]` (kèm ký hiệu tiền tệ).
    /// Trả (locale, ký hiệu tiền tệ cần in tại vị trí thẻ, phần định dạng còn lại).
    static func splitLocaleTag(_ section: String) -> (FmtLocale, String, String) {
        guard section.hasPrefix("[$"), let close = section.firstIndex(of: "]") else { return (.en, "", section) }
        let inner = String(section[section.index(section.startIndex, offsetBy: 2)..<close])
        let rest = String(section[section.index(after: close)...])
        var symbol = "", spec = inner
        if inner.hasPrefix("-") { spec = String(inner.dropFirst()) }
        else if let dash = inner.firstIndex(of: "-") {
            symbol = String(inner[..<dash])
            spec = String(inner[inner.index(after: dash)...])
        }
        let l = spec.lowercased()
        let isVi = l == "vi" || l.hasPrefix("vi-") || l.hasSuffix("042a")
        return (isVi ? .vi : .en, symbol, rest)
    }

    /// nil nếu định dạng không hỗ trợ (hàm gọi trả #VALUE!).
    static func format(_ x: Double, _ fmt: String) -> String? {
        if fmt.lowercased() == "general" || fmt.isEmpty { return fmt.isEmpty ? "" : FormulaEvaluator.text(.number(x)) }
        let sections = splitSections(fmt)
        var section = sections[0]
        var value = x
        var autoMinus = false
        if x < 0 {
            if sections.count >= 2 { section = sections[1]; value = -x } else { autoMinus = true; value = -x }
        } else if x == 0, sections.count >= 3 {
            section = sections[2]
        }
        let (locale, symbol, cleaned) = splitLocaleTag(section)
        if isDateFormat(cleaned) {
            guard x >= 0 else { return nil }
            return symbol + (formatDate(x, cleaned, locale: locale) ?? "")
        }
        if let sci = scientificSplit(cleaned) {
            guard let body = formatScientific(value, mantissa: sci.mantissa, signAlways: sci.signAlways,
                                              expDigits: sci.expDigits, locale: locale) else { return nil }
            return autoMinus ? "-" + symbol + body : symbol + body
        }
        if let fr = fractionSplit(cleaned) {
            let body = formatFraction(value, fr)
            return autoMinus ? "-" + symbol + body : symbol + body
        }
        guard let body = formatNumber(value, cleaned, locale: locale) else { return nil }
        return autoMinus ? "-" + symbol + body : symbol + body
    }

    private static func splitSections(_ f: String) -> [String] {
        var out: [String] = [], cur = "", inQ = false
        for ch in f {
            if ch == "\"" { inQ.toggle(); cur.append(ch) }
            else if ch == ";" && !inQ { out.append(cur); cur = "" }
            else { cur.append(ch) }
        }
        out.append(cur)
        return out
    }

    private static func isDateFormat(_ f: String) -> Bool {
        var inQ = false, esc = false
        for ch in f {
            if esc { esc = false; continue }
            if ch == "\\" { esc = true; continue }
            if ch == "\"" { inQ.toggle(); continue }
            if inQ { continue }
            if "ymdhsYMDHS".contains(ch) { return true }
        }
        return false
    }

    // MARK: Ký hiệu khoa học

    /// Tách `0.00E+00` thành (mẫu phần định trị, luôn in dấu, số chữ số mũ). nil nếu không phải dạng khoa học.
    private static func scientificSplit(_ f: String) -> (mantissa: String, signAlways: Bool, expDigits: Int)? {
        let c = Array(f)
        var i = 0, inQ = false
        while i < c.count {
            if c[i] == "\\" { i += 2; continue }
            if c[i] == "\"" { inQ.toggle(); i += 1; continue }
            if !inQ, c[i] == "E" || c[i] == "e", i + 1 < c.count, c[i + 1] == "+" || c[i + 1] == "-" {
                let digits = c[(i + 2)...].prefix { "0#?".contains($0) }.count
                let mantissa = String(c[..<i])
                // Phần định trị phải có chỗ chứa chữ số; mẫu như "1E+0" vẫn là #VALUE!.
                if digits == 0 || !mantissa.contains(where: { "0#?".contains($0) }) { return nil }
                return (mantissa, c[i + 1] == "+", digits)
            }
            i += 1
        }
        return nil
    }

    private static func formatScientific(_ v: Double, mantissa: String, signAlways: Bool, expDigits: Int,
                                         locale: FmtLocale) -> String? {
        let intDigits = max(1, mantissa.prefix { $0 != "." }.filter { "0#?".contains($0) }.count)
        var exp = 0
        var m = v
        if v != 0 {
            exp = Int(floor(log10(v))) - (intDigits - 1)
            m = v / pow(10, Double(exp))
        }
        let fracDigits = mantissa.contains(".") ? mantissa.split(separator: ".", omittingEmptySubsequences: false).last!.filter { "0#?".contains($0) }.count : 0
        // Làm tròn có thể đẩy phần định trị lên 10^intDigits (9.99 → 10.0): chuẩn hóa lại.
        if FormulaEvaluator.round(m, digits: fracDigits) >= pow(10, Double(intDigits)) { exp += 1; m = v / pow(10, Double(exp)) }
        guard let body = formatNumber(m, mantissa, locale: locale) else { return nil }
        let mag = String(abs(exp))
        let padded = String(repeating: "0", count: max(0, expDigits - mag.count)) + mag
        let sign = exp < 0 ? "-" : (signAlways ? "+" : "")
        return body + "E" + sign + padded
    }

    // MARK: Phân số

    private struct FractionSpec { var hasWhole: Bool; var numWidth: Int; var fixedDen: Int?; var denWidth: Int; var prefix: String; var suffix: String }

    /// Nhận `# ?/?`, `# ??/??`, `?/?`, `# ?/4`. nil nếu không có dấu `/` nằm giữa hai nhóm chỗ chứa chữ số.
    private static func fractionSplit(_ f: String) -> FractionSpec? {
        let c = Array(f)
        guard let slash = c.firstIndex(of: "/"), !f.contains("\""), !f.contains("\\") else { return nil }
        var a = slash - 1
        var numWidth = 0
        while a >= 0, "?#0".contains(c[a]) { numWidth += 1; a -= 1 }
        guard numWidth > 0 else { return nil }
        var b = slash + 1
        var denText = ""
        while b < c.count, "?#0123456789".contains(c[b]) { denText.append(c[b]); b += 1 }
        guard !denText.isEmpty else { return nil }
        let fixed = Int(denText)
        let denWidth = fixed == nil ? denText.count : denText.count
        // Phần trước nhóm tử số: có mẫu số nguyên "# " không?
        let head = String(c[..<(a + 1)])
        let hasWhole = head.contains("#") || head.contains("0")
        let prefix = head.filter { !"#0 ".contains($0) }
        return FractionSpec(hasWhole: hasWhole, numWidth: numWidth, fixedDen: fixed, denWidth: denWidth,
                            prefix: prefix, suffix: String(c[b...]))
    }

    private static func formatFraction(_ v: Double, _ spec: FractionSpec) -> String {
        var whole = spec.hasWhole ? floor(v) : 0
        let rest = spec.hasWhole ? v - whole : v
        var num = 0, den = 1
        if let d = spec.fixedDen, d > 0 {
            den = d
            num = Int((rest * Double(d)).rounded())
        } else {
            let maxDen = Int(pow(10, Double(spec.denWidth))) - 1
            var best = (n: 0, d: 1, err: Double.infinity)
            for d in 1...max(1, maxDen) {
                let n = Int((rest * Double(d)).rounded())
                let err = abs(rest - Double(n) / Double(d))
                if err < best.err - 1e-12 { best = (n, d, err) }
            }
            num = best.n; den = best.d
            // Rút gọn.
            var g = 1; for k in stride(from: min(num, den), through: 1, by: -1) where num % k == 0 && den % k == 0 { g = k; break }
            if num != 0 { num /= g; den /= g }
        }
        if spec.hasWhole, num >= den { whole += 1; num -= den }
        func pad(_ s: String, _ w: Int, left: Bool) -> String {
            let sp = String(repeating: " ", count: max(0, w - s.count))
            return left ? sp + s : s + sp
        }
        let wholeStr: String
        if spec.hasWhole { wholeStr = whole == 0 && num != 0 ? "" : String(Int(whole)) } else { wholeStr = "" }
        var out = spec.prefix + wholeStr
        if spec.hasWhole { out += " " }
        if num == 0 && spec.hasWhole {
            out += String(repeating: " ", count: spec.numWidth + 1 + spec.denWidth)
        } else {
            out += pad(String(num), spec.numWidth, left: true) + "/" + pad(String(den), spec.denWidth, left: false)
        }
        return out + spec.suffix
    }

    // MARK: Số

    private static func formatNumber(_ v: Double, _ f: String, locale: FmtLocale = .en) -> String? {
        let groupSep: Character = locale == .vi ? "." : ","
        let decSep: Character = locale == .vi ? "," : "."
        // Tách phần tử: literal (đã xử lý) và các ký tự mẫu.
        enum P { case lit(String), digit(Character), point, comma, percent }
        var parts: [P] = []
        var chars = Array(f), i = 0
        while i < chars.count {
            let c = chars[i]
            switch c {
            case "\"":
                i += 1; var lit = ""
                while i < chars.count, chars[i] != "\"" { lit.append(chars[i]); i += 1 }
                parts.append(.lit(lit))
            case "\\":
                i += 1
                if i < chars.count { parts.append(.lit(String(chars[i]))) }
            case "_":
                i += 1; parts.append(.lit(" "))
            case "*": i += 1
            case "0", "#", "?": parts.append(.digit(c))
            case ".": parts.append(.point)
            case ",": parts.append(.comma)
            case "%": parts.append(.percent)
            case "E", "e": return nil   // ký hiệu khoa học: chưa hỗ trợ
            default: parts.append(.lit(String(c)))
            }
            i += 1
        }
        chars = []
        guard let first = parts.firstIndex(where: { if case .digit = $0 { return true }; return false }),
              let last = parts.lastIndex(where: { if case .digit = $0 { return true }; return false }) else {
            // Không có chỗ chứa chữ số: chỉ in literal.
            return parts.map { if case .lit(let s) = $0 { return s }; if case .percent = $0 { return "%" }; return "" }.joined()
        }
        var prefix = "", suffix = ""
        var percents = 0
        for (k, p) in parts.enumerated() {
            switch p {
            case .lit(let s): if k < first { prefix += s } else if k > last { suffix += s }
            case .percent:
                percents += 1
                if k < first { prefix += "%" } else if k > last { suffix += "%" }
            case .comma: if k < first { prefix.append(groupSep) } else if k > last { /* dấu phẩy chia nghìn ở cuối: bỏ qua */ }
            case .point: if k < first { prefix.append(decSep) } else if k > last { suffix.append(decSep) }
            default: break
            }
        }
        var intPat: [Character] = [], fracPat: [Character] = []
        var seenPoint = false, thousands = false
        for p in parts[first...last] {
            switch p {
            case .digit(let c): if seenPoint { fracPat.append(c) } else { intPat.append(c) }
            case .point: seenPoint = true
            case .comma: if !seenPoint { thousands = true }
            case .lit(let s): if seenPoint { return nil } else if !s.isEmpty { return nil }
            case .percent: break
            }
        }
        var scaled = v
        var trailingCommas = 0
        for p in parts[(last + 1)...] { if case .comma = p { trailingCommas += 1 } }
        for _ in 0..<trailingCommas { scaled /= 1000 }
        for _ in 0..<percents { scaled *= 100 }
        let r = FormulaEvaluator.round(scaled, digits: fracPat.count)
        var str = String(format: "%.\(fracPat.count)f", abs(r))
        var intStr = str, fracStr = ""
        if let dot = str.firstIndex(of: ".") { intStr = String(str[..<dot]); fracStr = String(str[str.index(after: dot)...]) }
        let minInt = intPat.filter { $0 == "0" }.count
        if intStr == "0" && minInt == 0 { intStr = "" }
        while intStr.count < minInt { intStr = "0" + intStr }
        if thousands, intStr.count > 3 {
            var g = "", n = 0
            for ch in intStr.reversed() {
                if n > 0 && n % 3 == 0 { g.append(groupSep) }
                g.append(ch); n += 1
            }
            intStr = String(g.reversed())
        }
        let minFrac = (fracPat.lastIndex(of: "0") ?? -1) + 1
        while fracStr.count > minFrac, fracStr.hasSuffix("0") { fracStr.removeLast() }
        str = intStr + (seenPoint ? String(decSep) : "") + fracStr
        // Âm làm tròn về 0 vẫn mang dấu - nếu giá trị gốc âm: Excel in "-0"; ở đây người gọi chỉ truyền |x| cho phần âm.
        return prefix + str + suffix
    }

    // MARK: Ngày giờ

    private enum DT {
        case y4, y2, mmmm, mmm, mm, m, dddd, ddd, dd, d, hh, h, nn, n, ss, s, ampm, lit(String), elapsedH(Int), elapsedM(Int), elapsedS(Int)
    }

    private static func tokenizeDate(_ f: String) -> [DT] {
        let c = Array(f)
        var out: [DT] = []
        var i = 0
        func run(_ ch: Character) -> Int { var n = 0; while i + n < c.count, c[i + n].lowercased() == ch.lowercased() { n += 1 }; return n }
        while i < c.count {
            let ch = c[i]
            switch ch.lowercased() {
            case "y": let n = run("y"); out.append(n >= 3 ? .y4 : .y2); i += n
            case "m": let n = run("m"); out.append(n == 1 ? .m : n == 2 ? .mm : n == 3 ? .mmm : .mmmm); i += n
            case "d": let n = run("d"); out.append(n == 1 ? .d : n == 2 ? .dd : n == 3 ? .ddd : .dddd); i += n
            case "h": let n = run("h"); out.append(n == 1 ? .h : .hh); i += n
            case "s": let n = run("s"); out.append(n == 1 ? .s : .ss); i += n
            case "\"":
                i += 1; var lit = ""
                while i < c.count, c[i] != "\"" { lit.append(c[i]); i += 1 }
                i += 1; out.append(.lit(lit))
            case "\\":
                if i + 1 < c.count { out.append(.lit(String(c[i + 1]))) }
                i += 2
            case "[":
                var j = i + 1
                while j < c.count, c[j] != "]" { j += 1 }
                let inner = j < c.count ? String(c[(i + 1)..<j]).lowercased() : ""
                if let k = inner.first, "hms".contains(k), inner.allSatisfy({ $0 == k }) {
                    out.append(k == "h" ? .elapsedH(inner.count) : k == "m" ? .elapsedM(inner.count) : .elapsedS(inner.count))
                    i = j + 1
                } else { out.append(.lit("[")); i += 1 }
            case "a":
                let rest = String(c[i...]).uppercased()
                if rest.hasPrefix("AM/PM") { out.append(.ampm); i += 5 }
                else if rest.hasPrefix("A/P") { out.append(.ampm); i += 3 }
                else { out.append(.lit(String(ch))); i += 1 }
            default: out.append(.lit(String(ch))); i += 1
            }
        }
        // m/mm ngay sau h hoặc ngay trước s là phút.
        for k in out.indices {
            if case .m = out[k], isMinute(out, k) { out[k] = .n }
            else if case .mm = out[k], isMinute(out, k) { out[k] = .nn }
        }
        return out
    }

    private static func isMinute(_ t: [DT], _ k: Int) -> Bool {
        var j = k - 1
        while j >= 0 {
            if case .lit = t[j] { j -= 1; continue }
            if case .h = t[j] { return true }
            if case .hh = t[j] { return true }
            if case .elapsedH = t[j] { return true }
            break
        }
        j = k + 1
        while j < t.count {
            if case .lit = t[j] { j += 1; continue }
            if case .s = t[j] { return true }
            if case .ss = t[j] { return true }
            break
        }
        return false
    }

    private static func formatDate(_ x: Double, _ f: String, locale: FmtLocale = .en) -> String? {
        var day = Int(x.rounded(.down))
        var secs = Int(((x - Double(day)) * 86400).rounded())
        if secs >= 86400 { secs -= 86400; day += 1 }
        guard let c = ExcelDate.civil(fromSerial: day) else { return nil }
        let toks = tokenizeDate(f)
        let hasAmPm = toks.contains { if case .ampm = $0 { return true }; return false }
        let hour = secs / 3600, minute = (secs % 3600) / 60, second = secs % 60
        let totalSecs = Int((x * 86400).rounded())
        func p2(_ n: Int) -> String { n < 10 ? "0\(n)" : "\(n)" }
        var out = ""
        for t in toks {
            switch t {
            case .y4: out += String(format: "%04d", c.year)
            case .y2: out += p2(c.year % 100)
            case .mmmm: out += locale == .vi ? monthNamesVi[c.month - 1] : monthNames[c.month - 1]
            case .mmm: out += locale == .vi ? monthNamesShortVi[c.month - 1] : String(monthNames[c.month - 1].prefix(3))
            case .mm: out += p2(c.month)
            case .m: out += String(c.month)
            case .dddd: out += locale == .vi ? dayNamesVi[ExcelDate.weekday(day) - 1] : dayNames[ExcelDate.weekday(day) - 1]
            case .ddd: out += locale == .vi ? dayNamesShortVi[ExcelDate.weekday(day) - 1] : String(dayNames[ExcelDate.weekday(day) - 1].prefix(3))
            case .dd: out += p2(c.day)
            case .d: out += String(c.day)
            case .hh: out += p2(hasAmPm ? ((hour + 11) % 12 + 1) : hour)
            case .h: out += String(hasAmPm ? ((hour + 11) % 12 + 1) : hour)
            case .nn: out += p2(minute)
            case .n: out += String(minute)
            case .ss: out += p2(second)
            case .s: out += String(second)
            case .elapsedH(let w): out += String(repeating: "0", count: max(0, w - String(totalSecs / 3600).count)) + String(totalSecs / 3600)
            case .elapsedM(let w): out += String(repeating: "0", count: max(0, w - String(totalSecs / 60).count)) + String(totalSecs / 60)
            case .elapsedS(let w): out += String(repeating: "0", count: max(0, w - String(totalSecs).count)) + String(totalSecs)
            case .ampm: out += locale == .vi ? (hour < 12 ? "SA" : "CH") : (hour < 12 ? "AM" : "PM")
            case .lit(let s): out += s
            }
        }
        return out
    }
}
