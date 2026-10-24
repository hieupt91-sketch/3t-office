import Foundation
import OOXMLPackage

public final class Slide {
    public let presentation: Presentation
    public let part: PartName
    public let slideId: UInt32
    let relId: String
    let document: XDocument

    init(presentation: Presentation, part: PartName, slideId: UInt32, relId: String) throws {
        self.presentation = presentation
        self.part = part
        self.slideId = slideId
        self.relId = relId
        document = try presentation.package.xml(part)
    }

    var package: OPCPackage { presentation.package }
    func markModified() { package.markModified(part) }

    var spTree: XElement? { document.root.firstChild(NS.p, "cSld")?.firstChild(NS.p, "spTree") }

    /// Hình cấp cao nhất (nhóm chứa hình con trong `children`).
    public var shapes: [Shape] { Shape.list(in: spTree, owner: .slide(self)) }

    /// Mọi hình kể cả trong nhóm, theo thứ tự vẽ.
    public var allShapes: [Shape] {
        func flatten(_ s: [Shape]) -> [Shape] { s.flatMap { [$0] + flatten($0.children) } }
        return flatten(shapes)
    }

    public func shape(named name: String) -> Shape? { allShapes.first { $0.name == name } }

    public var titleShape: Shape? {
        allShapes.first { $0.placeholderType == "title" || $0.placeholderType == "ctrTitle" }
    }

    public var title: String? { titleShape?.text }

    /// Đặt tiêu đề qua placeholder hiện có để giữ định dạng của tiêu đề.
    public func setTitle(_ text: String) throws {
        guard let titleShape else { throw PresentationError.shapeHasNoText }
        try titleShape.setText(text)
    }

    public var layoutPart: PartName? { try? package.relatedPart(from: part, .slideLayout) }

    public var text: String {
        allShapes.compactMap { s -> String? in
            if let t = s.table { return t.map { $0.joined(separator: "\t") }.joined(separator: "\n") }
            return s.hasTextFrame ? s.text : nil
        }.joined(separator: "\n")
    }

    @discardableResult
    public func replaceText(_ find: String, with replacement: String, includeNotes: Bool = true) -> Int {
        var n = 0
        spTree?.forEachDescendant { e in
            if e.localName == "txBody" { n += DrawingText.replace(in: e, find, with: replacement) }
        }
        if n > 0 { markModified() }
        if includeNotes, let notes = try? notesShape() {
            let m = DrawingText.replace(in: notes.txBody, find, with: replacement)
            if m > 0 { package.markModified(notes.part) }
            n += m
        }
        return n
    }

    // MARK: Ghi chú

    public var notesPart: PartName? {
        guard let p = try? package.relatedPart(from: part, .notesSlide), package.hasPart(p) else { return nil }
        return p
    }

    private func notesShape() throws -> (part: PartName, txBody: XElement)? {
        guard let np = notesPart else { return nil }
        let doc = try package.xml(np)
        guard let tree = doc.root.firstChild(NS.p, "cSld")?.firstChild(NS.p, "spTree") else { return nil }
        var textShape: XElement?
        for sp in tree.children(NS.p, "sp") {
            let ph = sp.firstChild(NS.p, "nvSpPr")?.firstChild(NS.p, "nvPr")?.firstChild(NS.p, "ph")
            guard let tx = sp.firstChild(NS.p, "txBody") else { continue }
            if ph?.attribute("type") == "body" { return (np, tx) }
            if textShape == nil { textShape = tx }
        }
        return textShape.map { (np, $0) }
    }

    /// Ghi chú của người trình bày (nil nếu slide chưa có ghi chú).
    public var notesText: String? {
        guard let n = try? notesShape() else { return nil }
        return DrawingText.paragraphs(n.txBody).joined(separator: "\n")
    }

    /// Đặt ghi chú; tạo trang ghi chú mới (theo notes master) nếu slide chưa có.
    public func setNotesText(_ text: String) throws {
        if let n = try notesShape() {
            DrawingText.setParagraphs(n.txBody, text.components(separatedBy: "\n"))
            package.markModified(n.part)
            return
        }
        let master: PartName
        if let existing = try package.relatedPart(from: presentation.mainPart, .notesMaster), package.hasPart(existing) {
            master = existing
        } else {
            master = try createNotesMaster()
        }
        let np = package.uniquePartName(prefix: "/ppt/notesSlides/notesSlide", ext: "xml")
        let doc = try XDocument(string: """
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <p:notes xmlns:a="\(NS.a.primaryURI)" xmlns:r="\(NS.r.primaryURI)" xmlns:p="\(NS.p.primaryURI)"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr><p:sp><p:nvSpPr><p:cNvPr id="2" name="Slide Image Placeholder 1"/><p:cNvSpPr><a:spLocks noGrp="1" noRot="1" noChangeAspect="1"/></p:cNvSpPr><p:nvPr><p:ph type="sldImg"/></p:nvPr></p:nvSpPr><p:spPr/></p:sp><p:sp><p:nvSpPr><p:cNvPr id="3" name="Notes Placeholder 2"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="vi-VN" dirty="0"/></a:p></p:txBody></p:sp></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:notes>
        """)
        package.setXML(doc, for: np, contentType: ContentType.notesSlide)
        let nrels = try package.relationships(of: np)
        nrels.add(.notesMaster, to: master)
        nrels.add(.slide, to: part)
        try package.relationships(of: part).add(.notesSlide, to: np)
        if let n = try notesShape() {
            DrawingText.setParagraphs(n.txBody, text.components(separatedBy: "\n"))
        }
    }

    private func createNotesMaster() throws -> PartName {
        var theme: PartName?
        for slide in presentation.slides {
            guard let layout = slide.layoutPart,
                  let slideMaster = try package.relatedPart(from: layout, .slideMaster),
                  let candidate = try package.relatedPart(from: slideMaster, .theme),
                  package.hasPart(candidate) else { continue }
            theme = candidate
            break
        }
        guard let theme else { throw PresentationError.noNotesMaster }

        let master = package.uniquePartName(prefix: "/ppt/notesMasters/notesMaster", ext: "xml")
        let document = try XDocument(string: """
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <p:notesMaster xmlns:a="\(NS.a.primaryURI)" xmlns:r="\(NS.r.primaryURI)" xmlns:p="\(NS.p.primaryURI)"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:notesStyle/></p:notesMaster>
        """)
        package.setXML(document, for: master, contentType: ContentType.notesMaster)
        try package.relationships(of: master).add(.theme, to: theme)

        let relationshipID = try package.relationships(of: presentation.mainPart).add(.notesMaster, to: master)
        let root = presentation.document.root
        let list: XElement = root.firstChild(NS.p, "notesMasterIdLst") ?? {
            let name = root.qualifiedName("notesMasterIdLst", in: NS.p).name
            let element = XElement(name: name)
            root.insertChild(element, schemaOrder: ["sldMasterIdLst", "notesMasterIdLst", "handoutMasterIdLst", "sldIdLst", "sldSz", "notesSz"])
            return element
        }()
        let itemName = list.qualifiedName("notesMasterId", in: NS.p).name
        let relationshipName = list.qualifiedName("id", in: NS.r).name
        list.append(XElement(name: itemName, attributes: [
            XAttribute(name: "id", value: "2147483648"),
            XAttribute(name: relationshipName, value: relationshipID),
        ]))
        package.markModified(presentation.mainPart)
        return master
    }
}

public final class Shape {
    enum Owner {
        case slide(Slide)
    }

    public enum Kind: Equatable, Sendable { case shape, picture, graphicFrame, group, connector, contentPart, other }

    let owner: Owner
    public let element: XElement
    public let children: [Shape]

    init(owner: Owner, element: XElement) {
        self.owner = owner
        self.element = element
        children = element.localName == "grpSp" ? Shape.list(in: element, owner: owner) : []
    }

    static func list(in tree: XElement?, owner: Owner) -> [Shape] {
        guard let tree else { return [] }
        var out: [Shape] = []
        for e in tree.elements {
            if e.localName == "AlternateContent" {
                // Lấy nhánh Choice (nội dung PowerPoint hiện đại); Fallback được giữ nguyên khi lưu.
                if let choice = e.elements.first(where: { $0.localName == "Choice" }) {
                    out += list(in: choice, owner: owner)
                }
                continue
            }
            guard NS.p.matches(e.namespaceURI) else { continue }
            switch e.localName {
            case "sp", "pic", "graphicFrame", "grpSp", "cxnSp", "contentPart":
                out.append(Shape(owner: owner, element: e))
            default:
                break
            }
        }
        return out
    }

    func markModified() {
        switch owner {
        case .slide(let s): s.markModified()
        }
    }

    public var kind: Kind {
        switch element.localName {
        case "sp": return .shape
        case "pic": return .picture
        case "graphicFrame": return .graphicFrame
        case "grpSp": return .group
        case "cxnSp": return .connector
        case "contentPart": return .contentPart
        default: return .other
        }
    }

    private var nonVisual: XElement? { element.elements.first { $0.localName.hasPrefix("nv") } }
    private var cNvPr: XElement? { nonVisual?.firstChild(NS.p, "cNvPr") }

    public var id: Int? { cNvPr?.attribute("id").flatMap { Int($0) } }
    public var name: String { cNvPr?.attribute("name") ?? "" }
    public var altText: String? { cNvPr?.attribute("descr") }

    /// Đổi tên hiển thị của hình mà không thay đổi ID hay thuộc tính khác.
    public func rename(to name: String) throws {
        guard let cNvPr else { throw PresentationError.shapeHasNoName }
        cNvPr.setAttribute("name", name)
        markModified()
    }

    /// title | ctrTitle | subTitle | body | dt | ftr | sldNum | pic… ("body" khi chỉ có idx).
    public var placeholderType: String? {
        guard let ph = nonVisual?.firstChild(NS.p, "nvPr")?.firstChild(NS.p, "ph") else { return nil }
        return ph.attribute("type") ?? "body"
    }

    /// Vị trí/kích thước (EMU).
    public var frame: (x: Int, y: Int, width: Int, height: Int)? {
        let xfrm = element.firstChild(NS.p, "spPr")?.firstChild(NS.a, "xfrm")
            ?? element.firstChild(NS.p, "grpSpPr")?.firstChild(NS.a, "xfrm")
            ?? element.firstChild(NS.p, "xfrm")
        guard let x = xfrm, let off = x.firstChild(NS.a, "off"), let ext = x.firstChild(NS.a, "ext"),
              let ox = Int(off.attribute("x") ?? ""), let oy = Int(off.attribute("y") ?? ""),
              let cx = Int(ext.attribute("cx") ?? ""), let cy = Int(ext.attribute("cy") ?? "") else { return nil }
        return (ox, oy, cx, cy)
    }

    var txBody: XElement? { element.firstChild(NS.p, "txBody") }
    public var hasTextFrame: Bool { txBody != nil }

    public var paragraphs: [String] { txBody.map(DrawingText.paragraphs) ?? [] }
    public var text: String { paragraphs.joined(separator: "\n") }

    /// Thay chữ của khung chữ; mỗi dòng ("\n") một đoạn, giữ định dạng đoạn/run hiện có.
    public func setText(_ text: String) throws {
        guard let tx = txBody else { throw PresentationError.shapeHasNoText }
        DrawingText.setParagraphs(tx, text.components(separatedBy: "\n"))
        markModified()
    }

    /// Thay văn bản khớp qua các run, giữ nguyên ranh giới và định dạng run hiện có.
    @discardableResult
    public func replaceText(_ find: String, with replacement: String) -> Int {
        guard let txBody else { return 0 }
        let count = DrawingText.replace(in: txBody, find, with: replacement)
        if count > 0 { markModified() }
        return count
    }

    private var tableElement: XElement? {
        element.firstChild(NS.a, "graphic")?.firstChild(NS.a, "graphicData")?.firstChild(NS.a, "tbl")
    }

    /// Nội dung bảng (nil nếu không phải bảng).
    public var table: [[String]]? {
        tableElement.map { tbl in
            tbl.children(NS.a, "tr").map { tr in
                tr.children(NS.a, "tc").map { tc in tc.firstChild(NS.a, "txBody").map { DrawingText.paragraphs($0).joined(separator: "\n") } ?? "" }
            }
        }
    }

    public func setTableCell(row: Int, column: Int, text: String) throws {
        guard let tbl = tableElement else { throw PresentationError.shapeHasNoText }
        let rows = tbl.children(NS.a, "tr")
        guard rows.indices.contains(row) else { throw PresentationError.shapeHasNoText }
        let cells = rows[row].children(NS.a, "tc")
        guard cells.indices.contains(column) else { throw PresentationError.shapeHasNoText }
        let tc = cells[column]
        let tx = tc.firstChild(NS.a, "txBody") ?? {
            let q = { (l: String) in tc.qualifiedName(l, in: NS.a).name }
            let t = XElement(name: q("txBody"))
            tc.insert(t, at: 0)
            t.append(XElement(name: q("bodyPr")))
            t.append(XElement(name: q("lstStyle")))
            return t
        }()
        DrawingText.setParagraphs(tx, text.components(separatedBy: "\n"))
        markModified()
    }

    /// Phần ảnh của hình ảnh (p:pic).
    public var imagePart: PartName? {
        guard case .slide(let s) = owner,
              let blip = element.firstChild(NS.p, "blipFill")?.firstChild(NS.a, "blip"),
              let rid = blip.attribute("embed", in: NS.r) else { return nil }
        return try? s.package.relationships(of: s.part).targetPart(id: rid)
    }

    /// Phần biểu đồ của khung đồ họa chứa biểu đồ.
    public var chartPart: PartName? {
        guard case .slide(let s) = owner,
              let chart = element.firstChild(NS.a, "graphic")?.firstChild(NS.a, "graphicData")?.firstChild(NS.c, "chart"),
              let rid = chart.attribute("id", in: NS.r) else { return nil }
        return try? s.package.relationships(of: s.part).targetPart(id: rid)
    }
}

extension Shape {
    /// Thay ảnh của hình ảnh (p:pic) — tạo phần media MỚI (không ghi đè ảnh có thể đang được slide khác dùng),
    /// trỏ quan hệ sang ảnh mới, giữ nguyên vị trí/kích thước/cắt xén; ảnh cũ bị xóa nếu không còn ai dùng.
    public func replaceImage(_ data: Data) throws {
        guard case .slide(let s) = owner,
              let blip = element.firstChild(NS.p, "blipFill")?.firstChild(NS.a, "blip"),
              let embedAttr = blip.attributes.first(where: { $0.name.hasSuffix(":embed") })?.name,
              let oldId = blip.attribute(embedAttr) else { throw PresentationError.shapeHasNoText }
        let ext: String
        let ct: String
        let b = [UInt8](data.prefix(8))
        if b.starts(with: [0x89, 0x50, 0x4E, 0x47]) { (ext, ct) = ("png", ContentType.png) }
        else if b.starts(with: [0xFF, 0xD8]) { (ext, ct) = ("jpeg", ContentType.jpeg) }
        else if b.starts(with: [0x47, 0x49, 0x46]) { (ext, ct) = ("gif", ContentType.gif) }
        else { throw PresentationError.unsupportedImage }
        let pkg = s.package
        let rels = try pkg.relationships(of: s.part)
        let old = rels.targetPart(id: oldId)
        let part = pkg.uniquePartName(prefix: "/ppt/media/image", ext: ext)
        pkg.setData(data, for: part, contentType: ct)
        let rid = rels.add(.image, to: part, reuseExisting: false)
        blip.setAttribute(embedAttr, rid)
        // Gỡ quan hệ cũ nếu không còn phần tử nào của slide dùng nó.
        let stillUsed = s.document.root.descendants(NS.a, "blip").contains { $0.attributes.contains { $0.value == oldId && $0.name.hasSuffix(":embed") } }
        if !stillUsed { rels.remove(id: oldId) }
        s.markModified()
        if let old { try pkg.removeUnreachable(among: [old]) }
    }
}
