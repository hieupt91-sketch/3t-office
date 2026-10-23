import Foundation

/// Địa chỉ ô A1 (cột, hàng tính từ 1).
public struct CellReference: Hashable, Comparable, CustomStringConvertible, ExpressibleByStringLiteral, Sendable {
    public static let maxColumn = 16384 // XFD
    public static let maxRow = 1_048_576

    public let column: Int
    public let row: Int

    public init(column: Int, row: Int) {
        self.column = column
        self.row = row
    }

    /// "B12", "$B$12" (bỏ qua $). nil nếu không hợp lệ.
    public init?(_ a1: String) {
        var letters = 0
        var col = 0
        var row = 0
        var digits = 0
        var sawDigit = false
        for ch in a1.unicodeScalars {
            if ch == "$" { continue }
            if !sawDigit, let v = CellReference.letterValue(ch) {
                col = col * 26 + v
                letters += 1
                if letters > 3 { return nil }
            } else if ch.value >= 48 && ch.value <= 57 {
                sawDigit = true
                row = row * 10 + Int(ch.value - 48)
                digits += 1
                if digits > 7 { return nil }
            } else {
                return nil
            }
        }
        guard letters > 0, digits > 0, col <= CellReference.maxColumn, row >= 1, row <= CellReference.maxRow else { return nil }
        self.column = col
        self.row = row
    }

    public init(stringLiteral value: String) {
        guard let r = CellReference(value) else { fatalError("Địa chỉ ô không hợp lệ: \(value)") }
        self = r
    }

    static func letterValue(_ ch: Unicode.Scalar) -> Int? {
        switch ch.value {
        case 65...90: return Int(ch.value - 64)
        case 97...122: return Int(ch.value - 96)
        default: return nil
        }
    }

    public static func columnName(_ column: Int) -> String {
        var n = column
        var s = ""
        while n > 0 {
            let r = (n - 1) % 26
            s = String(UnicodeScalar(UInt8(65 + r))) + s
            n = (n - 1) / 26
        }
        return s
    }

    /// Số cột từ tên cột ("AB" → 28).
    public static func columnNumber(_ name: String) -> Int? {
        var col = 0
        for ch in name.unicodeScalars where ch != "$" {
            guard let v = letterValue(ch) else { return nil }
            col = col * 26 + v
        }
        return (1...maxColumn).contains(col) ? col : nil
    }

    public var a1: String { CellReference.columnName(column) + String(row) }
    public var description: String { a1 }

    public static func < (a: CellReference, b: CellReference) -> Bool {
        a.row != b.row ? a.row < b.row : a.column < b.column
    }
}

/// Vùng ô "A1:C5" (hoặc một ô).
public struct CellRange: Hashable, CustomStringConvertible, Sendable {
    public let start: CellReference
    public let end: CellReference

    public init(_ a: CellReference, _ b: CellReference) {
        start = CellReference(column: min(a.column, b.column), row: min(a.row, b.row))
        end = CellReference(column: max(a.column, b.column), row: max(a.row, b.row))
    }

    public init?(_ s: String) {
        let parts = s.split(separator: ":", maxSplits: 1).map(String.init)
        guard let a = parts.first.flatMap(CellReference.init) else { return nil }
        if parts.count == 2 {
            guard let b = CellReference(parts[1]) else { return nil }
            self.init(a, b)
        } else {
            self.init(a, a)
        }
    }

    public func contains(_ r: CellReference) -> Bool {
        r.column >= start.column && r.column <= end.column && r.row >= start.row && r.row <= end.row
    }

    public func intersects(_ o: CellRange) -> Bool {
        !(o.start.column > end.column || o.end.column < start.column || o.start.row > end.row || o.end.row < start.row)
    }

    public func union(_ o: CellRange) -> CellRange {
        CellRange(CellReference(column: min(start.column, o.start.column), row: min(start.row, o.start.row)),
                  CellReference(column: max(end.column, o.end.column), row: max(end.row, o.end.row)))
    }

    public var description: String { start == end ? start.a1 : "\(start.a1):\(end.a1)" }
}
