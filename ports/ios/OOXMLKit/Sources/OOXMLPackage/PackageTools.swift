import Foundation
import OOXMLZip

/// Các tiện ích chỉnh sửa metadata package dùng chung cho DOCX, XLSX và PPTX.
public enum PackageTools {
    /// Đặt các trường metadata cốt lõi. Giá trị `nil` giữ nguyên trường tương ứng.
    public static func setProperties(package: OPCPackage, title: String? = nil, creator: String? = nil,
                                     description: String? = nil, contentStatus: String? = nil) throws {
        let part = try package.relatedPart(from: .root, .coreProperties) ?? PartName("/docProps/core.xml")
        let document: XDocument
        if package.hasPart(part) {
            document = try package.xml(part)
        } else {
            let root = XElement(name: "cp:coreProperties", attributes: [
                XAttribute(name: "xmlns:cp", value: NS.cp.primaryURI),
                XAttribute(name: "xmlns:dc", value: NS.dc.primaryURI),
                XAttribute(name: "xmlns:dcterms", value: NS.dcterms.primaryURI),
                XAttribute(name: "xmlns:xsi", value: NS.xsi.primaryURI),
            ])
            document = XDocument(root: root)
            let rels = try package.relationships(of: .root)
            _ = rels.add(.coreProperties, to: part)
            package.registerContentType(ContentType.coreProperties, for: part)
        }
        let schemaOrder = ["title", "subject", "creator", "keywords", "description", "lastModifiedBy", "revision",
                           "created", "modified", "category", "contentStatus", "identifier", "language", "version"]
        let values: [(String, XMLNamespace, String?)] = [
            ("title", NS.dc, title), ("creator", NS.dc, creator), ("description", NS.dc, description),
            ("contentStatus", NS.cp, contentStatus),
        ]
        for (name, namespace, value) in values {
            guard let value else { continue }
            for old in document.root.children(namespace, name) { old.removeFromParent() }
            let elementName = document.root.qualifiedName(name, in: namespace).name
            let element = XElement(name: elementName, children: [.text(value)])
            document.root.insertChild(element, schemaOrder: schemaOrder)
        }
        package.setXML(document, for: part, contentType: ContentType.coreProperties)
    }
}

/// Kiểm tra cấu trúc gói OOXML: dùng sau khi lưu (trước khi thay tệp người dùng) và trong test.
public enum PackageValidator {
    /// Trả về danh sách vấn đề (rỗng = hợp lệ).
    public static func validate(_ data: Data) -> [String] {
        let pkg: OPCPackage
        do {
            pkg = try OPCPackage(data: data)
        } catch {
            return ["Không mở được gói: \(error)"]
        }
        return validate(pkg)
    }

    public static func validate(_ pkg: OPCPackage) -> [String] {
        var issues: [String] = []
        let parts = pkg.partNames
        let partSet = Set(parts)
        for p in parts {
            if pkg.contentType(of: p) == nil && !p.isRelationshipsPart {
                issues.append("\(p): thiếu kiểu nội dung")
            }
            let isXML = p.isRelationshipsPart || p.fileExtension == "xml" || p.fileExtension == "vml"
                || (pkg.contentType(of: p)?.hasSuffix("+xml") ?? false)
            do {
                let d = try pkg.data(of: p)
                if isXML && p.fileExtension != "vml" {
                    _ = try XDocument(data: d)
                }
            } catch {
                issues.append("\(p): \(error)")
            }
        }
        // Mọi đích quan hệ nội bộ phải tồn tại.
        var sources: [PartName] = [.root]
        sources += parts.filter { !$0.isRelationshipsPart }
        for s in sources where partSet.contains(s.relationshipsPart) {
            guard let rels = try? pkg.relationships(of: s) else {
                issues.append("\(s.relationshipsPart): không đọc được")
                continue
            }
            var ids = Set<String>()
            for r in rels.all {
                if !ids.insert(r.id).inserted { issues.append("\(s.relationshipsPart): Id trùng \(r.id)") }
                if let t = rels.targetPart(r), !partSet.contains(t) {
                    issues.append("\(s): quan hệ \(r.id) trỏ tới phần không tồn tại \(t)")
                }
            }
        }
        // Override trỏ tới phần không tồn tại làm Office báo lỗi.
        for (p, _) in pkg.contentTypes.overrides where !partSet.contains(p) {
            issues.append("[Content_Types].xml: Override cho phần không tồn tại \(p)")
        }
        if (try? pkg.mainDocumentPart()) == nil {
            issues.append("Thiếu quan hệ officeDocument")
        }
        return issues
    }
}

/// So sánh hai gói theo từng phần (nội dung đã giải nén).
public struct PackageDiff: CustomStringConvertible {
    public var added: [String] = []
    public var removed: [String] = []
    public var changed: [String] = []
    public var unchanged: [String] = []
    /// Phần không đổi và còn giữ nguyên byte nén (không bị nén lại).
    public var rawIdentical: [String] = []

    public init(original: Data, saved: Data) throws {
        let a = try ZipArchive(data: original)
        let b = try ZipArchive(data: saved)
        let bNames = Set(b.entryNames)
        for e in a.entries {
            guard let f = b.entry(e.name) else {
                removed.append(e.name)
                continue
            }
            if try a.contents(of: e) == b.contents(of: f) {
                unchanged.append(e.name)
                if a.rawCompressedData(of: e) == b.rawCompressedData(of: f) { rawIdentical.append(e.name) }
            } else {
                changed.append(e.name)
            }
        }
        let aNames = Set(a.entryNames)
        added = b.entryNames.filter { !aNames.contains($0) }
        _ = bNames
    }

    public var description: String {
        "added=\(added) removed=\(removed) changed=\(changed) unchanged=\(unchanged.count) rawIdentical=\(rawIdentical.count)"
    }
}
