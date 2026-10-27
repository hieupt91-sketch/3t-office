import Foundation
import OOXMLPackage

public enum PresentationError: Error, Equatable, CustomStringConvertible {
    case notAPresentation
    case slideIndexOutOfRange(Int)
    case noNotesMaster
    case shapeHasNoText
    case shapeHasNoName
    case unsupportedImage

    public var description: String {
        switch self {
        case .notAPresentation: return "Tệp không phải bản trình chiếu PPTX"
        case .slideIndexOutOfRange(let i): return "Không có slide số \(i + 1)"
        case .noNotesMaster: return "Bản trình chiếu chưa có notes master — không tạo được ghi chú mới"
        case .shapeHasNoText: return "Hình này không chứa khung chữ"
        case .shapeHasNoName: return "Hình này không có thuộc tính tên"
        case .unsupportedImage: return "Chỉ hỗ trợ ảnh PNG, JPEG, GIF"
        }
    }
}

public struct SlideSection: Equatable, Sendable {
    public let name: String
    public let slideIds: [UInt32]
}

/// Cài đặt trình chiếu (p:showSettings trong p:presentationPr). Giá trị mặc
/// định theo PowerPoint khi chưa có phần tử: loop tắt, animation/narration/
 /// timings bật.
public struct ShowSettings: Equatable, Sendable {
    public var loop: Bool
    public var showAnimation: Bool
    public var showNarration: Bool
    public var useTimings: Bool

    public init(loop: Bool = false, showAnimation: Bool = true, showNarration: Bool = true, useTimings: Bool = true) {
        self.loop = loop
        self.showAnimation = showAnimation
        self.showNarration = showNarration
        self.useTimings = useTimings
    }
}

extension Presentation {
    /// Đọc cài đặt trình chiếu; chưa có phần tử thì trả về mặc định.
    public var showSettings: ShowSettings {
        guard let ss = document.root.firstChild(NS.p, "presentationPr")?.firstChild(NS.p, "showSettings") else {
            return ShowSettings()
        }
        func b(_ name: String, _ def: Bool) -> Bool {
            guard let v = ss.attribute(name) else { return def }
            return v == "1" || v.lowercased() == "true"
        }
        return ShowSettings(loop: b("loop", false), showAnimation: b("showAnimation", true),
                            showNarration: b("showNarration", true), useTimings: b("useTimings", true))
    }

    /// Ghi cài đặt trình chiếu, tự tạo p:presentationPr (đứng trước extLst)
    /// và p:showSettings (đứng trước extLst của presentationPr) khi chưa có.
    /// Các thuộc tính khác của presentationPr/showSettings giữ nguyên.
    public func setShowSettings(_ s: ShowSettings) {
        let pr: XElement
        if let existing = document.root.firstChild(NS.p, "presentationPr") {
            pr = existing
        } else {
            pr = XElement(name: "p:presentationPr")
            if let ext = document.root.firstChild(NS.p, "extLst") { document.root.insert(pr, before: ext) }
            else { document.root.append(pr) }
        }
        let ss: XElement
        if let existing = pr.firstChild(NS.p, "showSettings") {
            ss = existing
        } else {
            ss = XElement(name: "p:showSettings")
            if let ext = pr.firstChild(NS.p, "extLst") { pr.insert(ss, before: ext) } else { pr.append(ss) }
        }
        ss.setAttribute("loop", s.loop ? "1" : "0")
        ss.setAttribute("showAnimation", s.showAnimation ? "1" : "0")
        ss.setAttribute("showNarration", s.showNarration ? "1" : "0")
        ss.setAttribute("useTimings", s.useTimings ? "1" : "0")
        package.markModified(mainPart)
    }
}

/// Thông tin trích từ theme của bản trình chiếu (a:theme): tên theme, bảng
/// màu (slot -> mã hex srgb, hoặc lastClr của sysClr) và font latin chính/phụ.
/// Dùng để đối chiếu/đồng bộ màu sắc, font khi không còn LibreOffice.
public struct ThemeInfo: Equatable, Sendable {
    public let name: String?
    public let colorSchemeName: String?
    public let colors: [String: String]
    public let majorFontLatin: String?
    public let minorFontLatin: String?
    public let part: String
}

extension Presentation {
    /// Theme của slide đầu tiên (qua layout -> slideMaster -> theme), dự phòng
    /// là theme gắn trực tiếp vào presentation. Không có theme thì nil.
    public var theme: ThemeInfo? {
        var part: PartName?
        for slide in slides {
            if let layout = slide.layoutPart,
               let master = try? package.relatedPart(from: layout, .slideMaster),
               let candidate = try? package.relatedPart(from: master, .theme),
               package.hasPart(candidate) { part = candidate; break }
        }
        if part == nil { part = try? package.relatedPart(from: mainPart, .theme) }
        guard let part, let doc = try? package.xml(part) else { return nil }
        let root = doc.root
        var colors: [String: String] = [:]
        let scheme = root.firstChild(NS.a, "themeElements")?.firstChild(NS.a, "clrScheme")
        for slot in scheme?.elements ?? [] where slot.namespaceURI == NS.a.primaryURI {
            if let srgb = slot.firstChild(NS.a, "srgbClr")?.attribute("val") { colors[slot.localName] = srgb }
            else if let sys = slot.firstChild(NS.a, "sysClr"), let last = sys.attribute("lastClr") { colors[slot.localName] = last }
        }
        let fonts = root.firstChild(NS.a, "themeElements")?.firstChild(NS.a, "fontScheme")
        return ThemeInfo(name: root.attribute("name"),
                         colorSchemeName: scheme?.attribute("name"),
                         colors: colors,
                         majorFontLatin: fonts?.firstChild(NS.a, "majorFont")?.firstChild(NS.a, "latin")?.attribute("typeface"),
                         minorFontLatin: fonts?.firstChild(NS.a, "minorFont")?.firstChild(NS.a, "latin")?.attribute("typeface"),
                         part: part.value)
    }
}

/// Bản trình chiếu PPTX/PPTM/POTX.
public final class Presentation {
    public let package: OPCPackage
    public let mainPart: PartName
    let document: XDocument

    public convenience init(contentsOf url: URL) throws {
        try self.init(package: OPCPackage(contentsOf: url))
    }

    /// Mở LƯỜI: bỏ kiểm tra toàn gói lúc mở (chỉ parse phần được truy cập). Kết quả giống `init(contentsOf:)`.
    public convenience init(contentsOf url: URL, deferValidation: Bool) throws {
        try self.init(package: OPCPackage(contentsOf: url, deferValidation: deferValidation))
    }

    public convenience init(data: Data) throws {
        try self.init(package: OPCPackage(data: data))
    }

    public convenience init(data: Data, deferValidation: Bool) throws {
        try self.init(package: OPCPackage(data: data, deferValidation: deferValidation))
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
    var sldIdLst: XElement? { document.root.firstChild(NS.p, "sldIdLst") }

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

    private var sectionList: XElement? {
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
        let el = XElement(name: srcEl.name, attributes: [XAttribute(name: "id", value: String(newId)), XAttribute(name: rName, value: rid)])
        sldIdLst!.insert(el, after: srcEl)
        if let sec = sectionList {
            for s in sec.children(NS.p14, "section") {
                guard let list = s.firstChild(NS.p14, "sldIdLst"),
                      let pos = list.children(NS.p14, "sldId").first(where: { $0.attribute("id") == String(src.slideId) }) else { continue }
                list.insert(XElement(name: pos.name, attributes: [XAttribute(name: "id", value: String(newId))]), after: pos)
            }
        }
        package.markModified(mainPart)
        try updateAppSlideCount()
        return try Slide(presentation: self, part: newPart, slideId: newId, relId: rid)
    }

    /// Bố cục (layout) có sẵn: (tên, phần) theo thứ tự của slide master.
    public var layouts: [(name: String, part: PartName)] {
        var out: [(String, PartName)] = []
        for master in (try? package.relatedParts(from: mainPart, .slideMaster)) ?? [] {
            guard let mdoc = try? package.xml(master), let mrels = try? package.relationships(of: master) else { continue }
            for l in mdoc.root.firstChild(NS.p, "sldLayoutIdLst")?.children(NS.p, "sldLayoutId") ?? [] {
                guard let rid = l.attribute("id", in: NS.r), let part = mrels.targetPart(id: rid), package.hasPart(part),
                      let ldoc = try? package.xml(part) else { continue }
                out.append((ldoc.root.firstChild(NS.p, "cSld")?.attribute("name") ?? part.fileName, part))
            }
        }
        return out
    }

    /// Thêm slide mới theo layout (như Home ▸ New Slide): sao chép các placeholder của layout với khung chữ trống.
    /// `index` = vị trí chèn (mặc định cuối). Slide mới vào phân đoạn của slide đứng trước.
    @discardableResult
    public func addSlide(layout: PartName, at index: Int? = nil) throws -> Slide {
        let ldoc = try package.xml(layout)
        let newPart = package.uniquePartName(prefix: "/ppt/slides/slide", ext: "xml")
        let doc = try XDocument(string: """
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <p:sld xmlns:a="\(NS.a.primaryURI)" xmlns:r="\(NS.r.primaryURI)" xmlns:p="\(NS.p.primaryURI)"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>
        """)
        let tree = doc.root.firstChild(NS.p, "cSld")!.firstChild(NS.p, "spTree")!
        var nextId = 2
        for sp in ldoc.root.firstChild(NS.p, "cSld")?.firstChild(NS.p, "spTree")?.children(NS.p, "sp") ?? [] {
            guard let ph = sp.firstChild(NS.p, "nvSpPr")?.firstChild(NS.p, "nvPr")?.firstChild(NS.p, "ph") else { continue }
            let type = ph.attribute("type")
            if ["dt", "ftr", "sldNum"].contains(type ?? "") { continue } // PowerPoint không chép header/footer
            let name = sp.firstChild(NS.p, "nvSpPr")?.firstChild(NS.p, "cNvPr")?.attribute("name") ?? "Placeholder \(nextId)"
            var phAttrs = ""
            if let type { phAttrs += " type=\"\(type)\"" }
            if let idx = ph.attribute("idx") { phAttrs += " idx=\"\(idx)\"" }
            let esc = name.replacingOccurrences(of: "&", with: "&amp;").replacingOccurrences(of: "\"", with: "&quot;").replacingOccurrences(of: "<", with: "&lt;")
            let frag = try XDocument(string: """
            <p:sp xmlns:a="\(NS.a.primaryURI)" xmlns:p="\(NS.p.primaryURI)"><p:nvSpPr><p:cNvPr id="\(nextId)" name="\(esc)"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph\(phAttrs)/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="vi-VN" dirty="0"/></a:p></p:txBody></p:sp>
            """).root
            frag.removeAttribute("xmlns:a")
            frag.removeAttribute("xmlns:p")
            tree.append(frag)
            nextId += 1
        }
        package.setXML(doc, for: newPart, contentType: ContentType.slide)
        try package.relationships(of: newPart).add(.slideLayout, to: layout)
        let rid = rels.add(.slide, to: newPart, reuseExisting: false)

        let list: XElement = sldIdLst ?? {
            let e = XElement(name: document.root.qualifiedName("sldIdLst", in: NS.p).name)
            document.root.insertChild(e, schemaOrder: ["sldMasterIdLst", "notesMasterIdLst", "handoutMasterIdLst", "sldIdLst", "sldSz", "notesSz"])
            return e
        }()
        let items = list.children(NS.p, "sldId")
        let newId = max(255, items.compactMap { UInt32($0.attribute("id") ?? "") }.max() ?? 255) + 1
        let rName = list.qualifiedName("id", in: NS.r).name
        let el = XElement(name: list.qualifiedName("sldId", in: NS.p).name,
                            attributes: [XAttribute(name: "id", value: String(newId)), XAttribute(name: rName, value: rid)])
        let pos = min(max(index ?? items.count, 0), items.count)
        if pos < items.count { list.insert(el, before: items[pos]) } else { list.append(el) }
        if let sec = sectionList {
            let prevId = pos > 0 ? items[pos - 1].attribute("id") : nil
            let sections = sec.children(NS.p14, "section")
            let target = sections.first { s in
                s.firstChild(NS.p14, "sldIdLst")?.children(NS.p14, "sldId").contains { $0.attribute("id") == prevId } ?? false
            } ?? (pos == 0 ? sections.first : sections.last)
            if let l = target?.firstChild(NS.p14, "sldIdLst") {
                let e = XElement(name: l.qualifiedName("sldId", in: NS.p14).name, attributes: [XAttribute(name: "id", value: String(newId))])
                if let prev = l.children(NS.p14, "sldId").first(where: { $0.attribute("id") == prevId }) { l.insert(e, after: prev) } else { l.insert(e, at: 0) }
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
                for id in ids { l.append(XElement(name: template, attributes: [XAttribute(name: "id", value: id)])) }
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
