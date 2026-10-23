import Foundation

/// Tên phần (part) trong gói OPC, dạng tuyệt đối "/word/document.xml".
/// So sánh không phân biệt hoa/thường ASCII theo ECMA-376 phần 2 §9.1.1.
public struct PartName: Hashable, Comparable, CustomStringConvertible, ExpressibleByStringLiteral, Sendable {
    public let value: String

    /// Gốc gói (nguồn của /_rels/.rels).
    public static let root = PartName(rawRoot: ())
    public static let contentTypes = PartName("/[Content_Types].xml")

    private init(rawRoot: Void) { value = "/" }

    public init(_ s: String) {
        var v = s
        if !v.hasPrefix("/") { v = "/" + v }
        value = v
    }

    public init(stringLiteral value: String) { self.init(value) }

    public init(zipName: String) { self.init("/" + zipName) }

    public var isRoot: Bool { value == "/" }
    public var zipName: String { String(value.dropFirst()) }
    public var description: String { value }

    /// Thư mục chứa, ví dụ "/word" (gốc là "").
    public var directory: String {
        guard let i = value.lastIndex(of: "/") else { return "" }
        return String(value[..<i])
    }

    public var fileName: String {
        guard let i = value.lastIndex(of: "/") else { return value }
        return String(value[value.index(after: i)...])
    }

    public var fileExtension: String {
        let f = fileName
        guard let i = f.lastIndex(of: ".") else { return "" }
        return String(f[f.index(after: i)...]).lowercased()
    }

    public var isRelationshipsPart: Bool {
        value.lowercased().hasSuffix(".rels") && directory.lowercased().hasSuffix("/_rels")
            || value.lowercased() == "/_rels/.rels"
    }

    /// Phần quan hệ của phần này: /word/_rels/document.xml.rels ; gốc → /_rels/.rels.
    public var relationshipsPart: PartName {
        if isRoot { return PartName("/_rels/.rels") }
        return PartName("\(directory)/_rels/\(fileName).rels")
    }

    /// Phần nguồn tương ứng với một phần .rels (ngược của `relationshipsPart`).
    public var relationshipsSource: PartName? {
        guard isRelationshipsPart else { return nil }
        if value.lowercased() == "/_rels/.rels" { return .root }
        let dir = directory // .../_rels
        let parentDir = String(dir.dropLast("/_rels".count))
        let src = String(fileName.dropLast(".rels".count))
        return PartName("\(parentDir)/\(src)")
    }

    /// Giải đích quan hệ nội bộ (tương đối hoặc tuyệt đối) thành tên phần.
    public func resolve(_ target: String) -> PartName {
        var t = target.removingPercentEncoding ?? target
        if let hash = t.firstIndex(of: "#") { t = String(t[..<hash]) }
        var segments: [Substring]
        if t.hasPrefix("/") {
            segments = []
        } else {
            segments = directory.split(separator: "/")
        }
        for seg in t.split(separator: "/", omittingEmptySubsequences: true) {
            if seg == "." { continue }
            if seg == ".." {
                if !segments.isEmpty { segments.removeLast() }
                continue
            }
            segments.append(seg)
        }
        return PartName("/" + segments.joined(separator: "/"))
    }

    /// Đường dẫn tương đối từ thư mục của phần này tới `other` (dùng làm Target quan hệ).
    public func relativeTarget(to other: PartName) -> String {
        let from = directory.split(separator: "/")
        let to = other.value.split(separator: "/")
        var i = 0
        while i < from.count && i < to.count - 1 && from[i].lowercased() == to[i].lowercased() { i += 1 }
        let ups = Array(repeating: "..", count: from.count - i)
        let rest = to[i...].map(String.init)
        let path = (ups + rest).joined(separator: "/")
        return path.addingPercentEncoding(withAllowedCharacters: PartName.targetAllowed) ?? path
    }

    private static let targetAllowed: CharacterSet = {
        var s = CharacterSet.urlPathAllowed
        s.remove(charactersIn: "#?")
        return s
    }()

    public static func == (a: PartName, b: PartName) -> Bool {
        a.value.lowercased() == b.value.lowercased()
    }

    public func hash(into h: inout Hasher) {
        h.combine(value.lowercased())
    }

    public static func < (a: PartName, b: PartName) -> Bool {
        a.value.lowercased() < b.value.lowercased()
    }
}
