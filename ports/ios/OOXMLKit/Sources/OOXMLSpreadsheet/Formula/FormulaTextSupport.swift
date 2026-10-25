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
        if isDateFormat(section) {
            guard x >= 0 else { return nil }
            return formatDate(x, section)
        }
        guard let body = formatNumber(value, section) else { return nil }
        return autoMinus ? "-" + body : body
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

    // MARK: Số

    private static func formatNumber(_ v: Double, _ f: String) -> String? {
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
            case .comma: if k < first { prefix += "," } else if k > last { /* dấu phẩy chia nghìn ở cuối: bỏ qua */ }
            case .point: if k < first { prefix += "." } else if k > last { suffix += "." }
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
                if n > 0 && n % 3 == 0 { g.append(",") }
                g.append(ch); n += 1
            }
            intStr = String(g.reversed())
        }
        let minFrac = (fracPat.lastIndex(of: "0") ?? -1) + 1
        while fracStr.count > minFrac, fracStr.hasSuffix("0") { fracStr.removeLast() }
        str = intStr + (seenPoint ? "." : "") + fracStr
        // Âm làm tròn về 0 vẫn mang dấu - nếu giá trị gốc âm: Excel in "-0"; ở đây người gọi chỉ truyền |x| cho phần âm.
        return prefix + str + suffix
    }

    // MARK: Ngày giờ

    private enum DT {
        case y4, y2, mmmm, mmm, mm, m, dddd, ddd, dd, d, hh, h, nn, n, ss, s, ampm, lit(String)
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

    private static func formatDate(_ x: Double, _ f: String) -> String? {
        var day = Int(x.rounded(.down))
        var secs = Int(((x - Double(day)) * 86400).rounded())
        if secs >= 86400 { secs -= 86400; day += 1 }
        guard let c = ExcelDate.civil(fromSerial: day) else { return nil }
        let toks = tokenizeDate(f)
        let hasAmPm = toks.contains { if case .ampm = $0 { return true }; return false }
        let hour = secs / 3600, minute = (secs % 3600) / 60, second = secs % 60
        func p2(_ n: Int) -> String { n < 10 ? "0\(n)" : "\(n)" }
        var out = ""
        for t in toks {
            switch t {
            case .y4: out += String(format: "%04d", c.year)
            case .y2: out += p2(c.year % 100)
            case .mmmm: out += monthNames[c.month - 1]
            case .mmm: out += String(monthNames[c.month - 1].prefix(3))
            case .mm: out += p2(c.month)
            case .m: out += String(c.month)
            case .dddd: out += dayNames[ExcelDate.weekday(day) - 1]
            case .ddd: out += String(dayNames[ExcelDate.weekday(day) - 1].prefix(3))
            case .dd: out += p2(c.day)
            case .d: out += String(c.day)
            case .hh: out += p2(hasAmPm ? ((hour + 11) % 12 + 1) : hour)
            case .h: out += String(hasAmPm ? ((hour + 11) % 12 + 1) : hour)
            case .nn: out += p2(minute)
            case .n: out += String(minute)
            case .ss: out += p2(second)
            case .s: out += String(second)
            case .ampm: out += hour < 12 ? "AM" : "PM"
            case .lit(let s): out += s
            }
        }
        return out
    }
}
