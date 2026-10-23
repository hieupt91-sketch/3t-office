import Foundation
import OOXMLZip

public enum PackageError: Error, Equatable, CustomStringConvertible {
    case missingContentTypes
    case partNotFound(PartName)
    case missingRelationship(source: PartName, type: String)
    case invalidPart(PartName, String)
    case validationFailed([String])

    public var description: String {
        switch self {
        case .missingContentTypes: return "Gói thiếu [Content_Types].xml — không phải tài liệu OOXML"
        case .partNotFound(let p): return "Không tìm thấy phần \(p)"
        case .missingRelationship(let s, let t): return "Phần \(s) thiếu quan hệ \(t)"
        case .invalidPart(let p, let m): return "Phần \(p) không hợp lệ: \(m)"
        case .validationFailed(let issues): return "Gói sau khi lưu không hợp lệ: " + issues.joined(separator: "; ")
        }
    }
}

/// Gói OPC (ECMA-376 phần 2). Nguyên tắc giữ dữ liệu:
/// - Phần không bị sửa được chép nguyên byte nén từ tệp gốc.
/// - Phần XML được sửa bằng DOM giữ nguyên phần tử/thuộc tính lạ, chỉ ghi lại phần đó.
/// - Thứ tự mục ZIP giữ như gốc; phần mới thêm vào cuối.
public final class OPCPackage {
    public let archive: ZipArchive
    public let contentTypes: ContentTypes
    private var zipNameByKey: [String: String] = [:]
    private var xmlCache: [PartName: XMLDocument] = [:]
    private var modifiedXML: Set<PartName> = []
    private var relsCache: [PartName: Relationships] = [:]
    private var pendingData: [PartName: Data] = [:]
    private var removed: Set<PartName> = []
    public var compression: ZipCompression = .deflate

    public convenience init(contentsOf url: URL, limits: ZipLimits = ZipLimits()) throws {
        try self.init(archive: ZipArchive(contentsOf: url, limits: limits))
    }

    public convenience init(data: Data, limits: ZipLimits = ZipLimits()) throws {
        try self.init(archive: ZipArchive(data: data, limits: limits))
    }

    public init(archive: ZipArchive) throws {
        self.archive = archive
        for name in archive.entryNames { zipNameByKey[name.lowercased()] = name }
        guard let ctName = zipNameByKey["[content_types].xml"] else { throw PackageError.missingContentTypes }
        do {
            contentTypes = ContentTypes(document: try XMLDocument(data: archive.contents(of: ctName)))
        } catch {
            throw PackageError.invalidPart(.contentTypes, "\(error)")
        }
    }

    /// Gói rỗng (để tạo tài liệu mới).
    public init() {
        archive = ZipArchive()
        contentTypes = ContentTypes()
    }

    // MARK: Phần

    public var partNames: [PartName] {
        var names = archive.entryNames.filter { !$0.hasSuffix("/") }.map(PartName.init(zipName:))
        names.removeAll { removed.contains($0) || $0 == .contentTypes }
        for p in pendingData.keys where !names.contains(p) { names.append(p) }
        return names
    }

    public func hasPart(_ part: PartName) -> Bool {
        if removed.contains(part) { return false }
        if pendingData[part] != nil || xmlCache[part] != nil && modifiedXML.contains(part) { return true }
        return zipNameByKey[part.zipName.lowercased()] != nil
    }

    public func contentType(of part: PartName) -> String? {
        contentTypes.contentType(for: part)
    }

    /// Byte của phần (bản mới nhất, kể cả thay đổi chưa lưu).
    public func data(of part: PartName) throws -> Data {
        guard !removed.contains(part) else { throw PackageError.partNotFound(part) }
        if modifiedXML.contains(part), let doc = xmlCache[part] { return doc.serialized() }
        if let d = pendingData[part] { return d }
        if part.isRelationshipsPart, let src = part.relationshipsSource, let r = relsCache[src], r.isModified {
            return r.document.serialized()
        }
        guard let name = zipNameByKey[part.zipName.lowercased()] else { throw PackageError.partNotFound(part) }
        return try archive.contents(of: name)
    }

    /// DOM của phần XML (được cache; mọi sửa đổi cần gọi `markModified`).
    public func xml(_ part: PartName) throws -> XMLDocument {
        if let d = xmlCache[part] { return d }
        let raw = try data(of: part)
        let doc: XMLDocument
        do {
            doc = try XMLDocument(data: raw)
        } catch {
            throw PackageError.invalidPart(part, "\(error)")
        }
        xmlCache[part] = doc
        return doc
    }

    public func markModified(_ part: PartName) {
        modifiedXML.insert(part)
        pendingData[part] = nil
        removed.remove(part)
    }

    public func isModified(_ part: PartName) -> Bool {
        modifiedXML.contains(part) || pendingData[part] != nil
    }

    /// Tạo/ghi đè phần XML.
    public func setXML(_ doc: XMLDocument, for part: PartName, contentType: String? = nil) {
        xmlCache[part] = doc
        markModified(part)
        if let ct = contentType { registerContentType(ct, for: part) }
    }

    /// Tạo/ghi đè phần nhị phân (ảnh, media…).
    public func setData(_ data: Data, for part: PartName, contentType: String? = nil) {
        pendingData[part] = data
        xmlCache[part] = nil
        modifiedXML.remove(part)
        removed.remove(part)
        if let ct = contentType { registerContentType(ct, for: part) }
    }

    /// Đăng ký kiểu nội dung: dùng Default theo đuôi nếu khớp, ngược lại Override.
    public func registerContentType(_ ct: String, for part: PartName) {
        if contentTypes.contentType(for: part) == ct { return }
        let ext = part.fileExtension
        if !ext.isEmpty, contentTypes.defaults[ext] == nil, ct.hasPrefix("image/") || ct.hasPrefix("audio/") || ct.hasPrefix("video/") {
            contentTypes.setDefault(extension: ext, contentType: ct)
        } else {
            contentTypes.setOverride(part, contentType: ct)
        }
    }

    /// Xóa phần cùng tệp .rels của nó và Override kiểu nội dung.
    public func removePart(_ part: PartName) {
        removed.insert(part)
        xmlCache[part] = nil
        modifiedXML.remove(part)
        pendingData[part] = nil
        contentTypes.removeOverride(part)
        let rels = part.relationshipsPart
        if hasPart(rels) || relsCache[part] != nil {
            removed.insert(rels)
            relsCache[part] = nil
        }
    }

    /// Tên phần chưa dùng theo mẫu, ví dụ ("/xl/worksheets/sheet", "xml") → /xl/worksheets/sheet3.xml.
    public func uniquePartName(prefix: String, ext: String, start: Int = 1) -> PartName {
        var n = start
        while hasPart(PartName("\(prefix)\(n).\(ext)")) { n += 1 }
        return PartName("\(prefix)\(n).\(ext)")
    }

    // MARK: Quan hệ

    /// Quan hệ của phần nguồn (dùng `PartName.root` cho quan hệ cấp gói). Tạo rỗng nếu chưa có.
    public func relationships(of source: PartName) throws -> Relationships {
        if let r = relsCache[source] { return r }
        let relsPart = source.relationshipsPart
        let r: Relationships
        if hasPart(relsPart) {
            let raw = try data(of: relsPart)
            do {
                r = Relationships(source: source, document: try XMLDocument(data: raw))
            } catch {
                throw PackageError.invalidPart(relsPart, "\(error)")
            }
        } else {
            r = Relationships(source: source)
            r.isModified = false // chỉ ghi khi thật sự thêm quan hệ
        }
        relsCache[source] = r
        return r
    }

    /// Phần đích đầu tiên có kiểu `type` từ `source`.
    public func relatedPart(from source: PartName, _ type: RelationshipType) throws -> PartName? {
        let rels = try relationships(of: source)
        return rels.first(type).flatMap(rels.targetPart)
    }

    public func relatedParts(from source: PartName, _ type: RelationshipType) throws -> [PartName] {
        let rels = try relationships(of: source)
        return rels.filter(type).compactMap(rels.targetPart)
    }

    /// Phần tài liệu chính (quan hệ officeDocument cấp gói).
    public func mainDocumentPart() throws -> PartName {
        guard let p = try relatedPart(from: .root, .officeDocument) else {
            throw PackageError.missingRelationship(source: .root, type: RelationshipType.officeDocument.uri)
        }
        return p
    }

    /// Sao chép một phần (và đệ quy các phần mà nó tham chiếu, trừ những phần được phép dùng chung)
    /// sang tên mới. Trả về tên phần mới. `shareable` quyết định quan hệ nào giữ nguyên đích.
    public func duplicatePart(_ part: PartName, as newPart: PartName,
                              shareable: (Relationship) -> Bool,
                              skip: (Relationship) -> Bool = { _ in false },
                              copied: inout [PartName: PartName]) throws {
        copied[part] = newPart
        if let doc = xmlCache[part], modifiedXML.contains(part) {
            setXML(try XMLDocument(data: doc.serialized()), for: newPart)
        } else {
            setData(try data(of: part), for: newPart)
        }
        if let ct = contentType(of: part) { registerContentType(ct, for: newPart) }
        let srcRels = try relationships(of: part)
        guard !srcRels.all.isEmpty else { return }
        let dstRels = try relationships(of: newPart)
        for rel in srcRels.all {
            if skip(rel) { continue }
            if rel.isExternal || shareable(rel) {
                if let t = srcRels.targetPart(rel), !rel.isExternal {
                    dstRels.add(type: rel.type, target: newPart.relativeTarget(to: t), external: false, id: rel.id)
                } else {
                    dstRels.add(type: rel.type, target: rel.target, external: rel.isExternal, id: rel.id)
                }
                continue
            }
            guard let target = srcRels.targetPart(rel) else { continue }
            let newTarget: PartName
            if let done = copied[target] {
                newTarget = done
            } else {
                let base = target.fileName
                let stem = base.range(of: #"\d*\.[^.]+$"#, options: .regularExpression).map { String(base[..<$0.lowerBound]) } ?? base
                newTarget = uniquePartName(prefix: "\(target.directory)/\(stem)", ext: target.fileExtension)
                try duplicatePart(target, as: newTarget, shareable: shareable, skip: skip, copied: &copied)
            }
            dstRels.add(type: rel.type, target: newPart.relativeTarget(to: newTarget), external: false, id: rel.id)
        }
    }

    /// Mọi phần đạt được từ gốc qua quan hệ nội bộ.
    public func reachableParts() throws -> Set<PartName> {
        var seen: Set<PartName> = []
        var queue: [PartName] = [.root]
        while let p = queue.popLast() {
            let rels = try relationships(of: p)
            for r in rels.all {
                guard let t = rels.targetPart(r), !seen.contains(t), hasPart(t) else { continue }
                seen.insert(t)
                queue.append(t)
            }
        }
        return seen
    }

    /// Xóa các phần trong `candidates` không còn đạt được từ gốc (dùng sau khi xóa slide/sheet).
    @discardableResult
    public func removeUnreachable(among candidates: Set<PartName>) throws -> [PartName] {
        let reachable = try reachableParts()
        var out: [PartName] = []
        for p in candidates.sorted() where !reachable.contains(p) && hasPart(p) {
            removePart(p)
            out.append(p)
        }
        return out
    }

    /// Mọi phần đạt được từ `start` (không gồm `start`).
    public func partsReachable(from start: PartName) throws -> Set<PartName> {
        var seen: Set<PartName> = []
        var queue = [start]
        while let p = queue.popLast() {
            let rels = try relationships(of: p)
            for r in rels.all {
                guard let t = rels.targetPart(r), t != start, !seen.contains(t), hasPart(t) else { continue }
                seen.insert(t)
                queue.append(t)
            }
        }
        return seen
    }

    // MARK: Lưu

    /// Áp các thay đổi vào ZIP và trả về byte của gói mới.
    public func save() throws -> Data {
        for (source, rels) in relsCache where rels.isModified {
            let part = source.relationshipsPart
            if removed.contains(part) { continue }
            writeEntry(part, rels.document.serialized())
            rels.isModified = false
        }
        for part in modifiedXML.sorted() {
            guard let doc = xmlCache[part] else { continue }
            writeEntry(part, doc.serialized())
        }
        for (part, data) in pendingData.sorted(by: { $0.key < $1.key }) {
            writeEntry(part, data)
        }
        for part in removed {
            if let name = zipNameByKey[part.zipName.lowercased()] {
                archive.removeEntry(name)
                zipNameByKey[part.zipName.lowercased()] = nil
            }
        }
        if contentTypes.isModified {
            let name = zipNameByKey["[content_types].xml"] ?? "[Content_Types].xml"
            archive.setContents(contentTypes.document.serialized(), for: name, compression: compression)
            zipNameByKey[name.lowercased()] = name
            contentTypes.isModified = false
            if archive.entryNames.first != name { archive.moveEntry(name, to: 0) }
        }
        modifiedXML.removeAll()
        pendingData.removeAll()
        removed.removeAll()
        return archive.serialize()
    }

    private func writeEntry(_ part: PartName, _ data: Data) {
        let name = zipNameByKey[part.zipName.lowercased()] ?? part.zipName
        archive.setContents(data, for: name, compression: compression)
        zipNameByKey[name.lowercased()] = name
    }

    /// Lưu an toàn: ghi tệp tạm, mở lại và kiểm tra hợp lệ, rồi mới thay tệp đích (nguyên tử).
    /// Nếu kiểm tra thất bại, tệp gốc không bị đụng tới.
    public func save(to url: URL, verify: Bool = true) throws {
        let data = try save()
        if verify {
            let issues = PackageValidator.validate(data)
            guard issues.isEmpty else { throw PackageError.validationFailed(issues) }
        }
        try data.write(to: url, options: .atomic)
    }
}
