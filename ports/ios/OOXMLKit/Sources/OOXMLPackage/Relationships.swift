import Foundation

public struct Relationship: Equatable, Sendable {
    public enum TargetMode: Sendable { case `internal`, external }

    public let id: String
    public let type: String
    public let target: String
    public let targetMode: TargetMode

    public var isExternal: Bool { targetMode == .external }
}

/// Tập quan hệ của một phần nguồn. Sửa trực tiếp trên DOM của tệp .rels để
/// giữ nguyên thuộc tính/phần tử lạ và thứ tự gốc.
public final class Relationships {
    public let source: PartName
    public let document: XMLDocument
    public internal(set) var isModified = false

    init(source: PartName, document: XMLDocument) {
        self.source = source
        self.document = document
    }

    init(source: PartName) {
        self.source = source
        let root = XMLElement(name: "Relationships",
                              attributes: [XMLAttribute(name: "xmlns", value: NS.packageRelationships.primaryURI)])
        document = XMLDocument(root: root)
        isModified = true
    }

    private var elements: [XMLElement] {
        document.root.elements.filter { $0.localName == "Relationship" }
    }

    public var all: [Relationship] {
        elements.compactMap { e in
            guard let id = e.attribute("Id"), let type = e.attribute("Type") else { return nil }
            let mode: Relationship.TargetMode = e.attribute("TargetMode")?.lowercased() == "external" ? .external : .internal
            return Relationship(id: id, type: type, target: e.attribute("Target") ?? "", targetMode: mode)
        }
    }

    public subscript(id: String) -> Relationship? {
        all.first { $0.id == id }
    }

    public func first(_ type: RelationshipType) -> Relationship? {
        all.first { type.matches($0.type) }
    }

    public func filter(_ type: RelationshipType) -> [Relationship] {
        all.filter { type.matches($0.type) }
    }

    /// Phần đích của một quan hệ nội bộ.
    public func targetPart(_ rel: Relationship) -> PartName? {
        guard !rel.isExternal else { return nil }
        return source.isRoot ? PartName.root.resolve(rel.target) : source.resolve(rel.target)
    }

    public func targetPart(id: String) -> PartName? {
        self[id].flatMap(targetPart)
    }

    /// Mã quan hệ mới không trùng: rId<n> với n lớn hơn mọi số đã dùng.
    public func nextId() -> String {
        let used = Set(all.map(\.id))
        var n = all.compactMap { r -> Int? in
            guard r.id.hasPrefix("rId") else { return nil }
            return Int(r.id.dropFirst(3))
        }.max() ?? 0
        repeat { n += 1 } while used.contains("rId\(n)")
        return "rId\(n)"
    }

    /// Thêm quan hệ tới phần nội bộ, trả về Id. Nếu đã có cùng type + đích thì dùng lại.
    @discardableResult
    public func add(_ type: RelationshipType, to part: PartName, reuseExisting: Bool = true) -> String {
        let target = source.isRoot ? part.zipName : source.relativeTarget(to: part)
        if reuseExisting, let existing = all.first(where: { type.matches($0.type) && !$0.isExternal && targetPart($0) == part }) {
            return existing.id
        }
        return add(type: type.uri, target: target, external: false)
    }

    @discardableResult
    public func addExternal(_ type: RelationshipType, target: String) -> String {
        add(type: type.uri, target: target, external: true)
    }

    @discardableResult
    public func add(type: String, target: String, external: Bool, id: String? = nil) -> String {
        let rid = id ?? nextId()
        var attrs = [XMLAttribute(name: "Id", value: rid),
                     XMLAttribute(name: "Type", value: type),
                     XMLAttribute(name: "Target", value: target)]
        if external { attrs.append(XMLAttribute(name: "TargetMode", value: "External")) }
        let name = document.root.prefix.map { "\($0):Relationship" } ?? "Relationship"
        document.root.append(XMLElement(name: name, attributes: attrs))
        isModified = true
        return rid
    }

    public func remove(id: String) {
        for e in elements where e.attribute("Id") == id {
            e.removeFromParent()
            isModified = true
        }
    }

    public func setTarget(id: String, to part: PartName) {
        for e in elements where e.attribute("Id") == id {
            e.setAttribute("Target", source.isRoot ? part.zipName : source.relativeTarget(to: part))
            isModified = true
        }
    }
}

/// [Content_Types].xml
public final class ContentTypes {
    public let document: XMLDocument
    public internal(set) var isModified = false

    init(document: XMLDocument) {
        self.document = document
    }

    init() {
        let root = XMLElement(name: "Types", attributes: [XMLAttribute(name: "xmlns", value: NS.contentTypes.primaryURI)])
        document = XMLDocument(root: root)
        isModified = true
        setDefault(extension: "rels", contentType: ContentType.relationships)
        setDefault(extension: "xml", contentType: ContentType.xml)
    }

    public var defaults: [String: String] {
        var d: [String: String] = [:]
        for e in document.root.elements where e.localName == "Default" {
            if let ext = e.attribute("Extension"), let ct = e.attribute("ContentType") { d[ext.lowercased()] = ct }
        }
        return d
    }

    public var overrides: [PartName: String] {
        var d: [PartName: String] = [:]
        for e in document.root.elements where e.localName == "Override" {
            if let p = e.attribute("PartName"), let ct = e.attribute("ContentType") { d[PartName(p)] = ct }
        }
        return d
    }

    public func contentType(for part: PartName) -> String? {
        for e in document.root.elements where e.localName == "Override" {
            if let p = e.attribute("PartName"), PartName(p) == part { return e.attribute("ContentType") }
        }
        let ext = part.fileExtension
        for e in document.root.elements where e.localName == "Default" {
            if e.attribute("Extension")?.lowercased() == ext { return e.attribute("ContentType") }
        }
        return nil
    }

    public func setDefault(extension ext: String, contentType: String) {
        for e in document.root.elements where e.localName == "Default" && e.attribute("Extension")?.lowercased() == ext.lowercased() {
            if e.attribute("ContentType") != contentType {
                e.setAttribute("ContentType", contentType)
                isModified = true
            }
            return
        }
        let el = XMLElement(name: qualified("Default"), attributes: [
            XMLAttribute(name: "Extension", value: ext),
            XMLAttribute(name: "ContentType", value: contentType),
        ])
        // Default đứng trước Override theo thói quen của Office.
        if let firstOverride = document.root.elements.first(where: { $0.localName == "Override" }) {
            document.root.insert(el, before: firstOverride)
        } else {
            document.root.append(el)
        }
        isModified = true
    }

    public func setOverride(_ part: PartName, contentType: String) {
        for e in document.root.elements where e.localName == "Override" {
            if let p = e.attribute("PartName"), PartName(p) == part {
                if e.attribute("ContentType") != contentType {
                    e.setAttribute("ContentType", contentType)
                    isModified = true
                }
                return
            }
        }
        document.root.append(XMLElement(name: qualified("Override"), attributes: [
            XMLAttribute(name: "PartName", value: part.value),
            XMLAttribute(name: "ContentType", value: contentType),
        ]))
        isModified = true
    }

    public func removeOverride(_ part: PartName) {
        for e in document.root.elements where e.localName == "Override" {
            if let p = e.attribute("PartName"), PartName(p) == part {
                e.removeFromParent()
                isModified = true
            }
        }
    }

    private func qualified(_ local: String) -> String {
        document.root.prefix.map { "\($0):\(local)" } ?? local
    }
}
