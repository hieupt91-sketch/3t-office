import Foundation

/// Hệ serial ngày Excel 1900 (kèm "bug" 1900 là năm nhuận: serial 60 = 29/02/1900 không có thật).
/// Thuần số học, không dùng Calendar → tất định, không phụ thuộc múi giờ/locale.
enum ExcelDate {
    struct Civil: Equatable { var year: Int; var month: Int; var day: Int }

    /// Số ngày từ 1970-01-01 (lịch Gregorian thuần) — thuật toán Howard Hinnant.
    static func daysFromCivil(_ y0: Int, _ m: Int, _ d: Int) -> Int {
        let y = m <= 2 ? y0 - 1 : y0
        let era = (y >= 0 ? y : y - 399) / 400
        let yoe = y - era * 400
        let doy = (153 * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1
        let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy
        return era * 146097 + doe - 719468
    }

    static func civilFromDays(_ z0: Int) -> Civil {
        let z = z0 + 719468
        let era = (z >= 0 ? z : z - 146096) / 146097
        let doe = z - era * 146097
        let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365
        let y = yoe + era * 400
        let doy = doe - (365 * yoe + yoe / 4 - yoe / 100)
        let mp = (5 * doy + 2) / 153
        let d = doy - (153 * mp + 2) / 5 + 1
        let m = mp + (mp < 10 ? 3 : -9)
        return Civil(year: m <= 2 ? y + 1 : y, month: m, day: d)
    }

    static func isLeap(_ y: Int) -> Bool { (y % 4 == 0 && y % 100 != 0) || y % 400 == 0 }

    static func daysInMonth(_ y: Int, _ m: Int) -> Int {
        switch m {
        case 1, 3, 5, 7, 8, 10, 12: return 31
        case 4, 6, 9, 11: return 30
        default: return isLeap(y) ? 29 : 28
        }
    }

    /// Serial (số nguyên) → ngày. nil nếu < 0 hoặc quá 9999-12-31 (2958465).
    /// serial 0 = "1900-01-00", serial 60 = "1900-02-29" (bug Excel).
    static func civil(fromSerial s: Int) -> Civil? {
        if s < 0 || s > 2_958_465 { return nil }
        if s == 0 { return Civil(year: 1900, month: 1, day: 0) }
        if s == 60 { return Civil(year: 1900, month: 2, day: 29) }
        return civilFromDays(s < 60 ? s - 25569 + 1 : s - 25569)
    }

    /// Ngày thật → serial. Ngày 29/02/1900 → 60 (bug Excel); tháng/ngày tràn được chuẩn hóa như DATE().
    static func serial(year: Int, month: Int, day: Int) -> Int? {
        var y = year, m = month
        let carry = (m - 1) >= 0 ? (m - 1) / 12 : -((12 - m) / 12)
        y += carry
        m -= carry * 12
        if y == 1900 && m == 2 && day == 29 { return 60 }
        if y == 1900 && m == 3 && day == 0 { return 60 }
        let base = daysFromCivil(y, m, 1) + day - 1 + 25569
        let s = base < 61 ? base - 1 : base
        return (s < 0 || s > 2_958_465) ? nil : s
    }

    /// "Bây giờ" → serial có phần thập phân, theo múi giờ cho trước.
    static func serial(from date: Date, timeZone: TimeZone) -> Double {
        let local = date.timeIntervalSince1970 + Double(timeZone.secondsFromGMT(for: date))
        return local / 86400 + 25569
    }

    /// Thứ trong tuần, 1 = Chủ nhật … 7 = Thứ bảy (serial 1 là Chủ nhật theo Excel).
    static func weekday(_ s: Int) -> Int { ((s - 1) % 7 + 7) % 7 + 1 }

    // MARK: Phân tích chuỗi

    /// "yyyy-m-d" hoặc "yyyy/m/d", tùy chọn " hh:mm[:ss]" / "Thh:mm[:ss]" → serial (có phần thập phân).
    static func parse(_ text: String) -> Double? {
        let t = text.trimmingCharacters(in: .whitespaces)
        var datePart = t, timePart: String? = nil
        if let i = t.firstIndex(where: { $0 == " " || $0 == "T" }) {
            datePart = String(t[..<i]); timePart = String(t[t.index(after: i)...])
        }
        var dateSerial: Double? = nil
        let dp = datePart.split(whereSeparator: { $0 == "-" || $0 == "/" }).map(String.init)
        if dp.count == 3, dp[0].count == 4, let y = Int(dp[0]), let m = Int(dp[1]), let d = Int(dp[2]),
           (1...12).contains(m), d >= 1, d <= daysInMonth(y, m), y >= 1900,
           let s = serial(year: y, month: m, day: d) {
            dateSerial = Double(s)
        }
        if dateSerial == nil && timePart == nil, let tf = parseTime(datePart) { return tf }
        guard var result = dateSerial else { return nil }
        if let tp = timePart {
            guard let tf = parseTime(tp) else { return nil }
            result += tf
        }
        return result
    }

    /// "hh:mm" hoặc "hh:mm:ss" → phần ngày [0,1).
    static func parseTime(_ text: String) -> Double? {
        let p = text.split(separator: ":", omittingEmptySubsequences: false).map(String.init)
        guard p.count == 2 || p.count == 3, let h = Int(p[0]), let m = Int(p[1]) else { return nil }
        let sec = p.count == 3 ? Int(p[2]) : 0
        guard let s = sec, (0...23).contains(h), (0...59).contains(m), (0...59).contains(s) else { return nil }
        return Double(h * 3600 + m * 60 + s) / 86400
    }

    // MARK: Cộng tháng

    static func addMonths(serial s: Int, months: Int) -> Int? {
        guard let c = civil(fromSerial: s), c.day >= 1 else { return nil }
        let total = c.year * 12 + (c.month - 1) + months
        let y = total >= 0 ? total / 12 : -((11 - total) / 12)
        let m = total - y * 12 + 1
        guard y >= 1900 else { return nil }
        return serial(year: y, month: m, day: min(c.day, daysInMonth(y, m)))
    }

    static func endOfMonth(serial s: Int, months: Int) -> Int? {
        guard let c = civil(fromSerial: s), c.day >= 1 else { return nil }
        let total = c.year * 12 + (c.month - 1) + months
        let y = total >= 0 ? total / 12 : -((11 - total) / 12)
        let m = total - y * 12 + 1
        guard y >= 1900 else { return nil }
        return serial(year: y, month: m, day: daysInMonth(y, m))
    }

    // MARK: DATEDIF

    /// nil nếu đơn vị không hợp lệ. Giả định start <= end (người gọi kiểm).
    static func datedif(start: Int, end: Int, unit: String) -> Int? {
        guard let a = civil(fromSerial: start), let b = civil(fromSerial: end) else { return nil }
        func months() -> Int {
            var m = (b.year - a.year) * 12 + (b.month - a.month)
            if b.day < a.day { m -= 1 }
            return m
        }
        switch unit.uppercased() {
        case "D": return end - start
        case "M": return months()
        case "Y": return months() / 12
        case "YM": return months() % 12
        case "MD":
            if b.day >= a.day { return b.day - a.day }
            // Số ngày của tháng liền trước tháng kết thúc.
            let pm = b.month == 1 ? 12 : b.month - 1, py = b.month == 1 ? b.year - 1 : b.year
            return b.day + daysInMonth(py, pm) - a.day
        case "YD":
            var y = b.year
            func at(_ yy: Int) -> Int? { serial(year: yy, month: a.month, day: min(a.day, daysInMonth(yy, a.month))) }
            guard var s = at(y) else { return nil }
            if s > end { y -= 1; guard let s2 = at(y) else { return nil }; s = s2 }
            return end - s
        default: return nil
        }
    }
}
