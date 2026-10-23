import Foundation

public enum XMLError: Error, Equatable, CustomStringConvertible {
    case unexpectedEnd
    case malformed(String, offset: Int)
    case mismatchedTag(expected: String, found: String, offset: Int)
    case unknownEntity(String, offset: Int)
    case dtdNotAllowed
    case noRootElement
    case unsupportedEncoding

    public var description: String {
        switch self {
        case .unexpectedEnd: return "XML kết thúc đột ngột"
        case .malformed(let m, let o): return "XML sai cú pháp tại byte \(o): \(m)"
        case .mismatchedTag(let e, let f, let o): return "Thẻ đóng </\(f)> không khớp <\(e)> tại byte \(o)"
        case .unknownEntity(let n, let o): return "Thực thể không xác định &\(n); tại byte \(o)"
        case .dtdNotAllowed: return "OOXML không cho phép DTD (chặn tấn công XXE)"
        case .noRootElement: return "XML không có phần tử gốc"
        case .unsupportedEncoding: return "Mã hóa ký tự XML không hỗ trợ"
        }
    }
}

public struct XMLAttribute: Equatable, Sendable {
    public var name: String
    public var value: String
    public init(name: String, value: String) {
        self.name = name
        self.value = value
    }
}

public enum XMLNode {
    case element(XMLElement)
    case text(String)
    case cdata(String)
    case comment(String)
    case processingInstruction(String)

    public var element: XMLElement? {
        if case .element(let e) = self { return e }
        return nil
    }
}

/// Không gian tên OOXML: gồm URI Transitional và Strict (ISO 29500) tương đương.
public struct XMLNamespace: Hashable, Sendable {
    public let uris: [String]
    public let preferredPrefix: String

    public init(_ uris: String..., prefix: String) {
        self.uris = uris
        self.preferredPrefix = prefix
    }

    public var primaryURI: String { uris[0] }

    public func matches(_ uri: String?) -> Bool {
        guard let uri else { return false }
        return uris.contains(uri)
    }
}

public final class XMLElement {
    /// Tên định danh đầy đủ đúng như trong tệp (ví dụ "x:c" hoặc "c").
    public var name: String
    public var attributes: [XMLAttribute]
    public private(set) var children: [XMLNode]
    public private(set) weak var parent: XMLElement?

    public init(name: String, attributes: [XMLAttribute] = [], children: [XMLNode] = []) {
        self.name = name
        self.attributes = attributes
        self.children = []
        for c in children { appendNode(c) }
    }

    // MARK: Tên & namespace

    public var prefix: String? {
        guard let i = name.firstIndex(of: ":") else { return nil }
        return String(name[..<i])
    }

    public var localName: String {
        guard let i = name.firstIndex(of: ":") else { return name }
        return String(name[name.index(after: i)...])
    }

    /// Tìm URI của tiền tố (nil = namespace mặc định) theo các khai báo xmlns trong phạm vi.
    public func namespaceURI(forPrefix prefix: String?) -> String? {
        if prefix == "xml" { return "http://www.w3.org/XML/1998/namespace" }
        let attr = prefix.map { "xmlns:" + $0 } ?? "xmlns"
        var e: XMLElement? = self
        while let cur = e {
            for a in cur.attributes where a.name == attr {
                return a.value.isEmpty ? nil : a.value
            }
            e = cur.parent
        }
        return nil
    }

    public var namespaceURI: String? { namespaceURI(forPrefix: prefix) }

    /// Tiền tố đang gắn với namespace trong phạm vi phần tử này ("" = mặc định), nil nếu chưa khai báo.
    public func prefix(for ns: XMLNamespace) -> String? {
        var e: XMLElement? = self
        var shadowed = Set<String>()
        while let cur = e {
            for a in cur.attributes {
                if a.name == "xmlns" {
                    if !shadowed.contains("") && ns.matches(a.value) { return "" }
                    shadowed.insert("")
                } else if a.name.hasPrefix("xmlns:") {
                    let p = String(a.name.dropFirst(6))
                    if !shadowed.contains(p) && ns.matches(a.value) { return p }
                    shadowed.insert(p)
                }
            }
            e = cur.parent
        }
        return nil
    }

    /// Tên định danh để tạo phần tử con mới trong namespace `ns` tại vị trí này.
    /// Nếu namespace chưa khai báo, trả về tiền tố ưa dùng và `needsDeclaration = true`.
    public func qualifiedName(_ local: String, in ns: XMLNamespace) -> (name: String, needsDeclaration: Bool) {
        if let p = prefix(for: ns) {
            return (p.isEmpty ? local : "\(p):\(local)", false)
        }
        return ("\(ns.preferredPrefix):\(local)", true)
    }

    public func `is`(_ ns: XMLNamespace, _ local: String) -> Bool {
        localName == local && ns.matches(namespaceURI)
    }

    // MARK: Thuộc tính

    public subscript(attribute name: String) -> String? {
        get { attributes.first { $0.name == name }?.value }
        set {
            if let v = newValue { setAttribute(name, v) } else { removeAttribute(name) }
        }
    }

    public func attribute(_ name: String) -> String? {
        attributes.first { $0.name == name }?.value
    }

    /// Thuộc tính theo namespace (ví dụ r:id bất kể tiền tố thực tế).
    public func attribute(_ local: String, in ns: XMLNamespace) -> String? {
        for a in attributes {
            guard let i = a.name.firstIndex(of: ":") else { continue }
            let p = String(a.name[..<i])
            if p == "xmlns" { continue }
            if a.name[a.name.index(after: i)...] == local && ns.matches(namespaceURI(forPrefix: p)) {
                return a.value
            }
        }
        return nil
    }

    public func setAttribute(_ name: String, _ value: String) {
        if let i = attributes.firstIndex(where: { $0.name == name }) {
            attributes[i].value = value
        } else {
            attributes.append(XMLAttribute(name: name, value: value))
        }
    }

    public func removeAttribute(_ name: String) {
        attributes.removeAll { $0.name == name }
    }

    // MARK: Con

    public var elements: [XMLElement] {
        children.compactMap(\.element)
    }

    public func firstChild(_ ns: XMLNamespace, _ local: String) -> XMLElement? {
        for c in children {
            if case .element(let e) = c, e.is(ns, local) { return e }
        }
        return nil
    }

    public func children(_ ns: XMLNamespace, _ local: String) -> [XMLElement] {
        children.compactMap { c in
            if case .element(let e) = c, e.is(ns, local) { return e }
            return nil
        }
    }

    /// Duyệt mọi phần tử con cháu theo thứ tự tài liệu.
    public func forEachDescendant(_ body: (XMLElement) -> Void) {
        for c in children {
            if case .element(let e) = c {
                body(e)
                e.forEachDescendant(body)
            }
        }
    }

    public func descendants(_ ns: XMLNamespace, _ local: String) -> [XMLElement] {
        var out: [XMLElement] = []
        forEachDescendant { if $0.is(ns, local) { out.append($0) } }
        return out
    }

    /// Duyệt có điều khiển: closure trả về false để không đi vào con của phần tử đó.
    public func walk(_ visit: (XMLElement) -> Bool) {
        for c in children {
            if case .element(let e) = c, visit(e) {
                e.walk(visit)
            }
        }
    }

    public var indexInParent: Int? {
        parent?.children.firstIndex { $0.element === self }
    }

    private func adopt(_ node: XMLNode) {
        if case .element(let e) = node {
            e.removeFromParent()
            e.parent = self
        }
    }

    public func appendNode(_ node: XMLNode) {
        adopt(node)
        children.append(node)
    }

    public func append(_ element: XMLElement) {
        appendNode(.element(element))
    }

    public func insertNode(_ node: XMLNode, at index: Int) {
        adopt(node)
        children.insert(node, at: max(0, min(index, children.count)))
    }

    public func insert(_ element: XMLElement, at index: Int) {
        insertNode(.element(element), at: index)
    }

    public func insert(_ element: XMLElement, before sibling: XMLElement) {
        guard let i = children.firstIndex(where: { $0.element === sibling }) else {
            append(element)
            return
        }
        insert(element, at: i)
    }

    public func insert(_ element: XMLElement, after sibling: XMLElement) {
        guard let i = children.firstIndex(where: { $0.element === sibling }) else {
            append(element)
            return
        }
        insert(element, at: i + 1)
    }

    public func removeFromParent() {
        guard let p = parent else { return }
        p.children.removeAll { $0.element === self }
        parent = nil
    }

    public func removeChild(at index: Int) {
        if case .element(let e) = children[index] { e.parent = nil }
        children.remove(at: index)
    }

    public func removeChildren(where predicate: (XMLNode) -> Bool) {
        var kept: [XMLNode] = []
        for c in children {
            if predicate(c) {
                if case .element(let e) = c { e.parent = nil }
            } else {
                kept.append(c)
            }
        }
        children = kept
    }

    public func removeAllChildren() {
        removeChildren { _ in true }
    }

    public func replaceNode(at index: Int, with node: XMLNode) {
        if case .element(let e) = children[index] { e.parent = nil }
        adopt(node)
        children[index] = node
    }

    /// Chèn phần tử con theo thứ tự lược đồ (xs:sequence) cho trước bằng tên cục bộ.
    /// Phần tử lạ (không có trong danh sách) không ảnh hưởng tới vị trí.
    public func insertChild(_ child: XMLElement, schemaOrder: [String]) {
        guard let rank = schemaOrder.firstIndex(of: child.localName) else {
            append(child)
            return
        }
        for (i, c) in children.enumerated() {
            if case .element(let e) = c, let r = schemaOrder.firstIndex(of: e.localName), r > rank {
                insert(child, at: i)
                return
            }
        }
        append(child)
    }

    /// Nội dung văn bản của mọi nút con cháu.
    public var textContent: String {
        var s = ""
        for c in children {
            switch c {
            case .text(let t), .cdata(let t): s += t
            case .element(let e): s += e.textContent
            default: break
            }
        }
        return s
    }

    /// Thay toàn bộ con bằng một nút văn bản.
    public func setText(_ text: String) {
        removeAllChildren()
        if !text.isEmpty { appendNode(.text(text)) }
    }

    public func deepCopy() -> XMLElement {
        let e = XMLElement(name: name, attributes: attributes)
        for c in children {
            switch c {
            case .element(let x): e.append(x.deepCopy())
            default: e.appendNode(c)
            }
        }
        return e
    }
}

public final class XMLDocument {
    /// Nội dung bên trong `<?xml ... ?>` (nil nếu tệp không có khai báo).
    public var declaration: String?
    public var prolog: [XMLNode] = []
    public var root: XMLElement
    public var epilog: [XMLNode] = []

    public init(root: XMLElement, declaration: String? = #"version="1.0" encoding="UTF-8" standalone="yes""#) {
        self.root = root
        self.declaration = declaration
    }

    public convenience init(data: Data) throws {
        var bytes = [UInt8](data)
        var declOverride: String?
        if bytes.count >= 2, (bytes[0] == 0xFF && bytes[1] == 0xFE) || (bytes[0] == 0xFE && bytes[1] == 0xFF) {
            guard let s = String(data: data, encoding: .utf16) else { throw XMLError.unsupportedEncoding }
            bytes = Array(s.utf8)
            declOverride = "UTF-8"
        }
        var parser = XMLParser(bytes: bytes)
        let doc = try parser.parseDocument()
        self.init(root: doc.root, declaration: doc.declaration)
        prolog = doc.prolog
        epilog = doc.epilog
        if let enc = declOverride, let d = declaration {
            declaration = d.replacingOccurrences(of: #"encoding="UTF-16""#, with: #"encoding="\#(enc)""#, options: .caseInsensitive)
                .replacingOccurrences(of: "encoding='UTF-16'", with: "encoding='\(enc)'", options: .caseInsensitive)
        }
    }

    public convenience init(string: String) throws {
        try self.init(data: Data(string.utf8))
    }

    public func serialized() -> Data {
        var w = XMLWriter()
        if let d = declaration {
            w.raw("<?xml ")
            w.raw(d)
            w.raw("?>")
            if prolog.isEmpty { w.raw("\r\n") }
        }
        for n in prolog { w.node(n) }
        w.element(root)
        for n in epilog { w.node(n) }
        return Data(w.out)
    }

    public var string: String { String(decoding: serialized(), as: UTF8.self) }
}

// MARK: - Bộ phân tích

struct XMLParser {
    let bytes: [UInt8]
    var p = 0

    init(bytes: [UInt8]) {
        self.bytes = bytes
        if bytes.count >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF { p = 3 }
    }

    struct Result {
        var declaration: String?
        var prolog: [XMLNode]
        var root: XMLElement
        var epilog: [XMLNode]
    }

    @inline(__always) func peek(_ s: StaticString, at i: Int) -> Bool {
        let n = s.utf8CodeUnitCount
        guard i + n <= bytes.count else { return false }
        let ptr = s.utf8Start
        for k in 0..<n where bytes[i + k] != ptr[k] { return false }
        return true
    }

    func find(_ s: StaticString, from i: Int) -> Int? {
        let n = s.utf8CodeUnitCount
        let first = s.utf8Start[0]
        var j = i
        while j + n <= bytes.count {
            if bytes[j] == first && peek(s, at: j) { return j }
            j += 1
        }
        return nil
    }

    func string(_ a: Int, _ b: Int) -> String {
        bytes.withUnsafeBufferPointer { String(decoding: UnsafeBufferPointer(rebasing: $0[a..<b]), as: UTF8.self) }
    }

    @inline(__always) static func isSpace(_ b: UInt8) -> Bool { b == 0x20 || b == 0x09 || b == 0x0A || b == 0x0D }

    mutating func parseDocument() throws -> Result {
        var declaration: String?
        var prolog: [XMLNode] = []
        var epilog: [XMLNode] = []
        var root: XMLElement?
        var stack: [XMLElement] = []

        func addNode(_ n: XMLNode) {
            if let top = stack.last {
                top.appendNode(n)
            } else if root == nil {
                prolog.append(n)
            } else {
                epilog.append(n)
            }
        }

        while p < bytes.count {
            if bytes[p] == UInt8(ascii: "<") {
                if peek("<?", at: p) {
                    guard let end = find("?>", from: p + 2) else { throw XMLError.unexpectedEnd }
                    let content = string(p + 2, end)
                    if root == nil && stack.isEmpty && prolog.isEmpty && declaration == nil
                        && (content.hasPrefix("xml ") || content == "xml") {
                        declaration = String(content.dropFirst(3)).trimmingCharacters(in: .whitespaces)
                    } else {
                        addNode(.processingInstruction(content))
                    }
                    p = end + 2
                } else if peek("<!--", at: p) {
                    guard let end = find("-->", from: p + 4) else { throw XMLError.unexpectedEnd }
                    addNode(.comment(string(p + 4, end)))
                    p = end + 3
                } else if peek("<![CDATA[", at: p) {
                    guard !stack.isEmpty else { throw XMLError.malformed("CDATA ngoài phần tử gốc", offset: p) }
                    guard let end = find("]]>", from: p + 9) else { throw XMLError.unexpectedEnd }
                    addNode(.cdata(normalizeNewlines(string(p + 9, end))))
                    p = end + 3
                } else if peek("<!DOCTYPE", at: p) || peek("<!ENTITY", at: p) {
                    throw XMLError.dtdNotAllowed
                } else if peek("</", at: p) {
                    let start = p
                    p += 2
                    let name = try readName()
                    skipSpace()
                    guard p < bytes.count, bytes[p] == UInt8(ascii: ">") else { throw XMLError.malformed("thiếu '>'", offset: p) }
                    p += 1
                    guard let top = stack.popLast() else { throw XMLError.malformed("thẻ đóng thừa", offset: start) }
                    guard top.name == name else { throw XMLError.mismatchedTag(expected: top.name, found: name, offset: start) }
                } else {
                    let start = p
                    p += 1
                    let name = try readName()
                    var attrs: [XMLAttribute] = []
                    var selfClosing = false
                    while true {
                        skipSpace()
                        guard p < bytes.count else { throw XMLError.unexpectedEnd }
                        let b = bytes[p]
                        if b == UInt8(ascii: ">") {
                            p += 1
                            break
                        }
                        if b == UInt8(ascii: "/") {
                            guard p + 1 < bytes.count, bytes[p + 1] == UInt8(ascii: ">") else {
                                throw XMLError.malformed("thiếu '>' sau '/'", offset: p)
                            }
                            p += 2
                            selfClosing = true
                            break
                        }
                        let an = try readName()
                        skipSpace()
                        guard p < bytes.count, bytes[p] == UInt8(ascii: "=") else { throw XMLError.malformed("thiếu '=' sau thuộc tính \(an)", offset: p) }
                        p += 1
                        skipSpace()
                        guard p < bytes.count, bytes[p] == UInt8(ascii: "\"") || bytes[p] == UInt8(ascii: "'") else {
                            throw XMLError.malformed("giá trị thuộc tính thiếu dấu nháy", offset: p)
                        }
                        let q = bytes[p]
                        p += 1
                        let vs = p
                        while p < bytes.count && bytes[p] != q {
                            if bytes[p] == UInt8(ascii: "<") { throw XMLError.malformed("'<' trong giá trị thuộc tính", offset: p) }
                            p += 1
                        }
                        guard p < bytes.count else { throw XMLError.unexpectedEnd }
                        let value = try decode(vs, p, attribute: true)
                        p += 1
                        if attrs.contains(where: { $0.name == an }) {
                            throw XMLError.malformed("thuộc tính trùng \(an)", offset: vs)
                        }
                        attrs.append(XMLAttribute(name: an, value: value))
                    }
                    let el = XMLElement(name: name, attributes: attrs)
                    if stack.isEmpty {
                        guard root == nil else { throw XMLError.malformed("nhiều phần tử gốc", offset: start) }
                        root = el
                    } else {
                        stack.last!.append(el)
                    }
                    if !selfClosing { stack.append(el) }
                }
            } else {
                let start = p
                while p < bytes.count && bytes[p] != UInt8(ascii: "<") { p += 1 }
                if stack.isEmpty {
                    // Chỉ cho phép khoảng trắng ngoài phần tử gốc.
                    for i in start..<p where !XMLParser.isSpace(bytes[i]) {
                        throw XMLError.malformed("văn bản ngoài phần tử gốc", offset: i)
                    }
                }
                addNode(.text(try decode(start, p, attribute: false)))
            }
        }
        guard stack.isEmpty else { throw XMLError.unexpectedEnd }
        guard let r = root else { throw XMLError.noRootElement }
        return Result(declaration: declaration, prolog: prolog, root: r, epilog: epilog)
    }

    mutating func skipSpace() {
        while p < bytes.count && XMLParser.isSpace(bytes[p]) { p += 1 }
    }

    mutating func readName() throws -> String {
        let s = p
        while p < bytes.count {
            let b = bytes[p]
            if XMLParser.isSpace(b) || b == UInt8(ascii: ">") || b == UInt8(ascii: "/") || b == UInt8(ascii: "=") {
                break
            }
            p += 1
        }
        guard p > s else { throw XMLError.malformed("thiếu tên", offset: s) }
        return string(s, p)
    }

    func normalizeNewlines(_ s: String) -> String {
        guard s.contains("\r") else { return s }
        return s.replacingOccurrences(of: "\r\n", with: "\n").replacingOccurrences(of: "\r", with: "\n")
    }

    /// Giải mã thực thể và chuẩn hóa xuống dòng (thuộc tính: khoảng trắng → dấu cách).
    func decode(_ a: Int, _ b: Int, attribute: Bool) throws -> String {
        var hasSpecial = false
        for i in a..<b {
            let c = bytes[i]
            if c == UInt8(ascii: "&") || c == 0x0D || (attribute && (c == 0x09 || c == 0x0A)) {
                hasSpecial = true
                break
            }
        }
        if !hasSpecial { return string(a, b) }
        var out = [UInt8]()
        out.reserveCapacity(b - a)
        var i = a
        while i < b {
            let c = bytes[i]
            if c == UInt8(ascii: "&") {
                guard let semi = (i + 1..<min(b, i + 12)).first(where: { bytes[$0] == UInt8(ascii: ";") }) else {
                    throw XMLError.malformed("'&' không thuộc thực thể", offset: i)
                }
                let name = string(i + 1, semi)
                switch name {
                case "lt": out.append(UInt8(ascii: "<"))
                case "gt": out.append(UInt8(ascii: ">"))
                case "amp": out.append(UInt8(ascii: "&"))
                case "quot": out.append(UInt8(ascii: "\""))
                case "apos": out.append(UInt8(ascii: "'"))
                default:
                    var scalar: UInt32?
                    if name.hasPrefix("#x") || name.hasPrefix("#X") {
                        scalar = UInt32(name.dropFirst(2), radix: 16)
                    } else if name.hasPrefix("#") {
                        scalar = UInt32(name.dropFirst(1), radix: 10)
                    }
                    guard let v = scalar, let u = Unicode.Scalar(v) else {
                        throw XMLError.unknownEntity(name, offset: i)
                    }
                    out.append(contentsOf: Array(String(Character(u)).utf8))
                }
                i = semi + 1
            } else if c == 0x0D {
                if attribute {
                    out.append(0x20)
                } else {
                    out.append(0x0A)
                }
                i += (i + 1 < b && bytes[i + 1] == 0x0A) ? 2 : 1
            } else if attribute && (c == 0x09 || c == 0x0A) {
                out.append(0x20)
                i += 1
            } else {
                out.append(c)
                i += 1
            }
        }
        return String(decoding: out, as: UTF8.self)
    }
}

// MARK: - Bộ ghi

struct XMLWriter {
    var out: [UInt8] = []

    init() { out.reserveCapacity(4096) }

    mutating func raw(_ s: String) { out.append(contentsOf: s.utf8) }

    mutating func node(_ n: XMLNode) {
        switch n {
        case .element(let e): element(e)
        case .text(let t): escaped(t, attribute: false)
        case .cdata(let t):
            raw("<![CDATA[")
            raw(t.replacingOccurrences(of: "]]>", with: "]]]]><![CDATA[>"))
            raw("]]>")
        case .comment(let c):
            raw("<!--")
            raw(c)
            raw("-->")
        case .processingInstruction(let pi):
            raw("<?")
            raw(pi)
            raw("?>")
        }
    }

    mutating func element(_ e: XMLElement) {
        out.append(UInt8(ascii: "<"))
        raw(e.name)
        for a in e.attributes {
            out.append(0x20)
            raw(a.name)
            out.append(contentsOf: [UInt8(ascii: "="), UInt8(ascii: "\"")])
            escaped(a.value, attribute: true)
            out.append(UInt8(ascii: "\""))
        }
        if e.children.isEmpty {
            out.append(contentsOf: [UInt8(ascii: "/"), UInt8(ascii: ">")])
            return
        }
        out.append(UInt8(ascii: ">"))
        for c in e.children { node(c) }
        out.append(contentsOf: [UInt8(ascii: "<"), UInt8(ascii: "/")])
        raw(e.name)
        out.append(UInt8(ascii: ">"))
    }

    /// Thoát ký tự đặc biệt; bỏ ký tự điều khiển không hợp lệ trong XML 1.0.
    mutating func escaped(_ s: String, attribute: Bool) {
        for b in s.utf8 {
            switch b {
            case UInt8(ascii: "&"): raw("&amp;")
            case UInt8(ascii: "<"): raw("&lt;")
            case UInt8(ascii: ">"): if attribute { out.append(b) } else { raw("&gt;") }
            case UInt8(ascii: "\""): if attribute { raw("&quot;") } else { out.append(b) }
            case 0x0D: raw("&#13;")
            case 0x0A: if attribute { raw("&#10;") } else { out.append(b) }
            case 0x09: if attribute { raw("&#9;") } else { out.append(b) }
            case 0x00..<0x20: break
            default: out.append(b)
            }
        }
    }
}
