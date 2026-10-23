import Foundation
import OOXMLPackage

public enum PresentationError: Error, Equatable, CustomStringConvertible {
    case notAPresentation
    case slideIndexOutOfRange(Int)
    case noNotesMaster
    case shapeHasNoText

    public var description: String {
        switch self {
        case .notAPresentation: return "Tệp không phải bản trình chiếu PPTX"
        case .slideIndexOutOfRange(let i): return "Không có slide số \(i + 1)"
        case .noNotesMaster: return "Bản trình chiếu chưa có notes master — không tạo được ghi chú mới"
        case .shapeHasNoText: return "Hình này không chứa khung chữ"
        }
    }
}

public struct SlideSection: Equatable, Sendable {
    public let name: String
    public let slideIds: [UInt32]
}

/// Bản trình chiếu PPTX/PPTM/POTX.
public final class Presentation {
    public let package: OPCPackage
    public let mainPart: PartName
    let document: XMLDocument

    public convenience init(contentsOf url: URL) throws {
        try self.init(package: OPCPackage(contentsOf: url))
    }

    public convenience init(data: Data) throws {
        try self.init(package: OPCPackage(data: data))
    }

    public init(package: OPCPackage) throws {
        self.package = package
        guard let main = try? package.mainDocumentPart(), package.hasPart(main),
              let doc = try? package.xml(main), doc.root.is(NS.p, "presentation") else {
            throw PresentationError.notAPresentation
        }
        mainPart = main
        document = doc
    }

    var rels: Relationships { try! package.relationships(of: mainPart) }
    var sldIdLst: XMLElement? { document.root.firstChild(NS.p, "sldIdLst") }

    public var slides: [Slide] {
        let rels = self.rels
        return (sldIdLst?.children(NS.p, "sldId") ?? []).compactMap { e in
            guard let rid = e.attribute("id", in: NS.r), let part = rels.targetPart(id: rid), package.hasPart(part),
                  let id = UInt32(e.attribute("id") ?? "") else { return nil }
            return try? Slide(presentation: self, part: part, slideId: id, relId: rid)
        }
    }

    public func slide(at index: Int) throws -> Slide {
        let all = slides
        guard all.indices.contains(index) else { throw PresentationError.slideIndexOutOfRange(index) }
        return all[index]
    }

    /// Kích thước slide (EMU).
    public var slideSize: (width: Int, height: Int)? {
        guard let s = document.root.firstChild(NS.p, "sldSz"), let cx = Int(s.attribute("cx") ?? ""), let cy = Int(s.attribute("cy") ?? "") else { return nil }
        return (cx, cy)
    }

    private var sectionList: XMLElement? {
        document.root.firstChild(NS.p, "extLst")?.descendants(NS.p14, "sectionLst").first
    }

    public var sections: [SlideSection] {
        (sectionList?.children(NS.p14, "section") ?? []).map { s in
            SlideSection(name: s.attribute("name") ?? "",
                         slideIds: s.firstChild(NS.p14, "sldIdLst")?.children(NS.p14, "sldId").compactMap { UInt32($0.attribute("id") ?? "") } ?? [])
        }
    }

    @discardableResult
    public func replaceText(_ find: String, with replacement: String, includeNotes: Bool = true) -> Int {
        slides.reduce(0) { $0 + $1.replaceText(find, with: replacement, includeNotes: includeNotes) }
    }

    // MARK: Thao tác slide

    /// Nhân bản slide, chèn ngay sau bản gốc (cùng phân đoạn). Ảnh/layout/media dùng chung;
    /// biểu đồ, SmartArt, workbook nhúng được sao chép riêng. Ghi chú và bình luận không sao chép.
    @discardableResult
    public func duplicateSlide(at index: Int) throws -> Slide {
        let src = try slide(at: index)
        let newPart = package.uniquePartName(prefix: src.part.directory + "/slide", ext: "xml")
        let shareable: Set<String> = ["slideLayout", "image", "hyperlink", "media", "audio", "video", "tags", "slide", "themeOverride"]
        let skipped: Set<String> = ["notesSlide", "comments"]
        var copied: [PartName: PartName] = [:]
        try package.duplicatePart(src.part, as: newPart,
                                  shareable: { shareable.contains(Presentation.relKind($0.type)) },
                                  skip: { skipped.contains(Presentation.relKind($0.type)) || RelationshipType.modernComment.matches($0.type) },
                                  copied: &copied)
        let rid = rels.add(.slide, to: newPart, reuseExisting: false)
        let ids = (sldIdLst?.children(NS.p, "sldId") ?? []).compactMap { UInt32($0.attribute("id") ?? "") }
        let newId = max(255, ids.max() ?? 255) + 1
        let srcEl = sldIdLst!.children(NS.p, "sldId").first { $0.attribute("id") == String(src.slideId) }!
        let rName = srcEl.attributes.first { $0.name.hasSuffix(":id") }?.name ?? "r:id"
        let el = XMLElement(name: srcEl.name, attributes: [XMLAttribute(name: "id", value: String(newId)), XMLAttribute(name: rName, value: rid)])
        sldIdLst!.insert(el, after: srcEl)
        if let sec = sectionList {
            for s in sec.children(NS.p14, "section") {
                guard let list = s.firstChild(NS.p14, "sldIdLst"),
                      let pos = list.children(NS.p14, "sldId").first(where: { $0.attribute("id") == String(src.slideId) }) else { continue }
                list.insert(XMLElement(name: pos.name, attributes: [XMLAttribute(name: "id", value: String(newId))]), after: pos)
            }
        }
        package.markModified(mainPart)
        try updateAppSlideCount()
        return try Slide(presentation: self, part: newPart, slideId: newId, relId: rid)
    }

    /// Xóa slide cùng ghi chú, bình luận và mọi phần chỉ slide đó dùng (ảnh, biểu đồ…).
    /// Cập nhật phân đoạn và trình chiếu tùy chỉnh.
    public func deleteSlide(at index: Int) throws {
        let s = try slide(at: index)
        var candidates = try package.partsReachable(from: s.part)
        candidates.insert(s.part)
        for e in sldIdLst?.children(NS.p, "sldId") ?? [] where e.attribute("id") == String(s.slideId) { e.removeFromParent() }
        for show in document.root.firstChild(NS.p, "custShowLst")?.children(NS.p, "custShow") ?? [] {
            for sld in show.firstChild(NS.p, "sldLst")?.children(NS.p, "sld") ?? [] where sld.attribute("id", in: NS.r) == s.relId {
                sld.removeFromParent()
            }
        }
        for sec in sectionList?.children(NS.p14, "section") ?? [] {
            for e in sec.firstChild(NS.p14, "sldIdLst")?.children(NS.p14, "sldId") ?? [] where e.attribute("id") == String(s.slideId) {
                e.removeFromParent()
            }
        }
        rels.remove(id: s.relId)
        package.removePart(s.part)
        try package.removeUnreachable(among: candidates)
        package.markModified(mainPart)
        try updateAppSlideCount()
    }

    /// Đổi vị trí slide. Slide chuyển sang phân đoạn của vị trí mới để phân đoạn luôn liền mạch.
    public func moveSlide(from: Int, to: Int) throws {
        guard let list = sldIdLst else { throw PresentationError.slideIndexOutOfRange(from) }
        var items = list.children(NS.p, "sldId")
        guard items.indices.contains(from) else { throw PresentationError.slideIndexOutOfRange(from) }
        guard items.indices.contains(to) else { throw PresentationError.slideIndexOutOfRange(to) }
        if from == to { return }
        let moving = items.remove(at: from)
        moving.removeFromParent()
        if to < items.count {
            list.insert(moving, before: items[to])
        } else {
            list.insert(moving, after: items.last!)
        }
        items.insert(moving, at: to)
        let order = items.compactMap { $0.attribute("id") }
        if let sec = sectionList, let movedId = moving.attribute("id") {
            let sections = sec.children(NS.p14, "section")
            let neighbor = to > 0 ? order[to - 1] : (order.count > 1 ? order[1] : nil)
            let target = sections.first { s in
                s.firstChild(NS.p14, "sldIdLst")?.children(NS.p14, "sldId").contains { $0.attribute("id") == neighbor } ?? false
            }
            for s in sections {
                guard let l = s.firstChild(NS.p14, "sldIdLst") else { continue }
                var ids = l.children(NS.p14, "sldId").compactMap { $0.attribute("id") }
                ids.removeAll { $0 == movedId }
                if s === target { ids.append(movedId) }
                ids.sort { (order.firstIndex(of: $0) ?? 0) < (order.firstIndex(of: $1) ?? 0) }
                let template = l.children(NS.p14, "sldId").first?.name ?? l.qualifiedName("sldId", in: NS.p14).name
                l.removeAllChildren()
                for id in ids { l.append(XMLElement(name: template, attributes: [XMLAttribute(name: "id", value: id)])) }
            }
        }
        package.markModified(mainPart)
    }

    private func updateAppSlideCount() throws {
        guard let app = try package.relatedPart(from: .root, .extendedProperties), package.hasPart(app) else { return }
        let doc = try package.xml(app)
        guard let el = doc.root.elements.first(where: { $0.localName == "Slides" }) else { return }
        let n = String(slides.count)
        if el.textContent != n {
            el.setText(n)
            package.markModified(app)
        }
    }

    static func relKind(_ type: String) -> String {
        String(type.split(separator: "/").last ?? "")
    }

    // MARK: Lưu

    public func save() throws -> Data { try package.save() }
    public func save(to url: URL) throws { try package.save(to: url) }
}
