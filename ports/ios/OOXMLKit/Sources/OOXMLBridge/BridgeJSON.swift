import Foundation
import OOXMLKit

/// Lỗi cầu nối (trả về JSON {ok:false, error:{code,message}}).
public struct BridgeError: Error {
    public let code: String
    public let message: String
    public init(_ code: String, _ message: String) {
        self.code = code
        self.message = message
    }
}

/// Tiện ích đọc tham số từ JSON `[String: Any]` (an toàn, báo lỗi rõ khi thiếu/sai kiểu).
struct Args {
    let raw: [String: Any]
    init(_ raw: Any?) { self.raw = raw as? [String: Any] ?? [:] }

    func string(_ key: String) throws -> String {
        guard let v = raw[key] as? String else { throw BridgeError("args", "thiếu/sai tham số chuỗi '\(key)'") }
        return v
    }
    func optString(_ key: String) -> String? { raw[key] as? String }
    func int(_ key: String) throws -> Int {
        if let i = raw[key] as? Int { return i }
        if let d = raw[key] as? Double { return Int(d) }
        if let s = raw[key] as? String, let i = Int(s) { return i }
        throw BridgeError("args", "thiếu/sai tham số số nguyên '\(key)'")
    }
    func optInt(_ key: String) -> Int? {
        if let i = raw[key] as? Int { return i }
        if let d = raw[key] as? Double { return Int(d) }
        return nil
    }
    func double(_ key: String) throws -> Double {
        if let d = raw[key] as? Double { return d }
        if let i = raw[key] as? Int { return Double(i) }
        throw BridgeError("args", "thiếu/sai tham số số '\\(key)'")
    }
    func optDouble(_ key: String) -> Double? {
        if let d = raw[key] as? Double { return d }
        if let i = raw[key] as? Int { return Double(i) }
        return nil
    }
    func dict(_ key: String) -> [String: Any] { raw[key] as? [String: Any] ?? [:] }
    func optBool(_ key: String) -> Bool? { raw[key] as? Bool }
}

enum BridgeValue {
    /// JSON {t,v} → CellValue.
    static func cellValue(from any: Any?) throws -> CellValue {
        guard let d = any as? [String: Any] else {
            // Cho phép truyền thẳng số/chuỗi/bool.
            if let n = any as? Double { return .number(n) }
            if let i = any as? Int { return .number(Double(i)) }
            if let s = any as? String { return .string(s) }
            if let b = any as? Bool { return .bool(b) }
            if any == nil { return .empty }
            throw BridgeError("value", "giá trị ô không hợp lệ")
        }
        let t = (d["t"] as? String) ?? "empty"
        switch t {
        case "n":
            if let n = d["v"] as? Double { return .number(n) }
            if let i = d["v"] as? Int { return .number(Double(i)) }
            if let s = d["v"] as? String, let n = Double(s) { return .number(n) }
            throw BridgeError("value", "giá trị số không hợp lệ")
        case "s": return .string((d["v"] as? String) ?? "")
        case "b": return .bool((d["v"] as? Bool) ?? false)
        case "e": return .error((d["v"] as? String) ?? "#VALUE!")
        case "empty": return .empty
        default: throw BridgeError("value", "kiểu giá trị '\(t)' không hỗ trợ")
        }
    }

    /// CellValue → JSON {t,v}.
    static func json(_ value: CellValue) -> [String: Any] {
        switch value {
        case .empty: return ["t": "empty"]
        case .number(let n): return ["t": "n", "v": n]
        case .string(let s): return ["t": "s", "v": s]
        case .bool(let b): return ["t": "b", "v": b]
        case .error(let e): return ["t": "e", "v": e]
        }
    }

    static func format(from d: [String: Any]) -> CellFormatChange {
        CellFormatChange(
            numberFormat: d["numberFormat"] as? String,
            bold: d["bold"] as? Bool,
            italic: d["italic"] as? Bool,
            underline: d["underline"] as? Bool,
            fontColor: d["fontColor"] as? String,
            fontSize: (d["fontSize"] as? Double) ?? (d["fontSize"] as? Int).map(Double.init),
            fillColor: d["fillColor"] as? String,
            horizontalAlignment: d["horizontalAlignment"] as? String,
            wrapText: d["wrapText"] as? Bool)
    }
}
