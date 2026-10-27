import Foundation
import OOXMLPackage

public struct WordStyle: Equatable, Sendable {
    public let id: String
    public let name: String
    public let type: String // paragraph | character | table | numbering
}

/// Văn bản DOCX/DOCM/DOTX. Sửa trên DOM của từng phần; phần không sửa chép nguyên byte khi lưu.
public final class WordDocument {
    public let package: OPCPackage
    public let mainPart: PartName
    var revisionCounter = 0
    private final class WeakStory { weak var story: WordStory?; init(_ s: WordStory) { story = s } }
    /// Cache yếu tránh vòng tham chiếu (story giữ tài liệu); sửa đổi nằm trong DOM của gói nên tạo lại luôn nhất quán.
    private var storyCache: [PartName: WeakStory] = [:]

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
              let doc = try? package.xml(main), doc.root.is(NS.w, "document") else {
            throw WordError.notAWordDocument
        }
        mainPart = main
    }

    private func story(_ part: PartName, _ kind: WordStory.Kind) throws -> WordStory {
        if let s = storyCache[part]?.story { return s }
        let s = try WordStory(document: self, kind: kind, part: part)
        storyCache[part] = WeakStory(s)
        return s
    }

    public var body: WordStory { try! story(mainPart, .body) }

    private func related(_ type: RelationshipType, _ kind: WordStory.Kind) -> [WordStory] {
        ((try? package.relatedParts(from: mainPart, type)) ?? []).filter(package.hasPart).compactMap { try? story($0, kind) }
    }

    public var headers: [WordStory] { related(.header, .header) }
    public var footers: [WordStory] { related(.footer, .footer) }
    public var footnotes: WordStory? { related(.footnotes, .footnotes).first }
    public var endnotes: WordStory? { related(.endnotes, .endnotes).first }
    public var comments: WordStory? { related(.comments, .comments).first }

    /// Mọi story: thân, header, footer, footnote, endnote, comment.
    public var allStories: [WordStory] {
        [body] + headers + footers + [footnotes, endnotes, comments].compactMap { $0 }
    }

    public var paragraphs: [Paragraph] { body.paragraphs }
    public var tables: [Table] { body.tables }
    public var text: String { body.text }

    public var styles: [WordStyle] {
        guard let p = try? package.relatedPart(from: mainPart, .styles), let doc = try? package.xml(p) else { return [] }
        return doc.root.children(NS.w, "style").map { s in
            let q = { (l: String) in WordText.qn(s, l) }
            return WordStyle(id: s.attribute(q("styleId")) ?? "",
                             name: s.firstChild(NS.w, "name")?.attribute(q("val")) ?? "",
                             type: s.attribute(q("type")) ?? "paragraph")
        }
    }

    /// Thay chữ trong toàn tài liệu (mặc định: thân + header + footer + footnote + endnote + comment).
    @discardableResult
    public func replaceText(_ find: String, with replacement: String, bodyOnly: Bool = false) -> Int {
        (bodyOnly ? [body] : allStories).reduce(0) { $0 + $1.replaceText(find, with: replacement) }
    }

    // MARK: Đoạn văn

    private func newParagraph(_ text: String, style: String?, context: XElement) -> XElement {
        let p = XElement(name: WordText.qn(context, "p"))
        context.append(p) // gắn tạm để lấy đúng tiền tố
        if let style {
            let pPr = XElement(name: WordText.qn(context, "pPr"))
            pPr.append(XElement(name: WordText.qn(context, "pStyle"), attributes: [XAttribute(name: WordText.qn(context, "val"), value: style)]))
            p.append(pPr)
        }
        for r in WordText.makeRuns(text, rPr: nil, context: p) { p.append(r) }
        p.removeFromParent()
        return p
    }

    /// Thêm đoạn ở cuối thân văn bản (trước w:sectPr cuối).
    @discardableResult
    public func appendParagraph(_ text: String, style: String? = nil) -> Paragraph {
        let container = body.container
        let p = newParagraph(text, style: style, context: container)
        if let sect = container.elements.last, sect.is(NS.w, "sectPr") {
            container.insert(p, before: sect)
        } else {
            container.append(p)
        }
        body.markModified()
        return Paragraph(story: body, element: p)
    }

    /// Chèn đoạn ngay sau `after`. Không chỉ định style thì sao chép thuộc tính đoạn của `after`.
    @discardableResult
    public func insertParagraph(_ text: String, style: String? = nil, after: Paragraph) throws -> Paragraph {
        guard let parent = after.element.parent else { throw WordError.paragraphNotInDocument }
        let p = newParagraph(text, style: style, context: parent)
        if style == nil, let pPr = after.element.firstChild(NS.w, "pPr")?.deepCopy() {
            for e in pPr.children(NS.w, "sectPr") { e.removeFromParent() } // không nhân đôi ngắt section
            p.insert(pPr, at: 0)
        }
        parent.insert(p, after: after.element)
        after.story.markModified()
        return Paragraph(story: after.story, element: p)
    }

    /// Xóa đoạn. Ô bảng luôn giữ ít nhất một đoạn (Word yêu cầu); đoạn mang sectPr không bị xóa.
    public func removeParagraph(_ p: Paragraph) throws {
        guard let parent = p.element.parent else { throw WordError.paragraphNotInDocument }
        if p.element.firstChild(NS.w, "pPr")?.firstChild(NS.w, "sectPr") != nil {
            p.setText("")
            return
        }
        if parent.is(NS.w, "tc") && parent.children(NS.w, "p").count == 1 {
            p.setText("")
            return
        }
        p.element.removeFromParent()
        p.story.markModified()
    }

    // MARK: Ảnh

    /// Chèn ảnh inline (PNG/JPEG/GIF) trong đoạn mới sau `after` (hoặc cuối văn bản).
    /// Kích thước mặc định lấy theo pixel ảnh ở 96 DPI, giới hạn bề rộng `maxWidthEMU`.
    @discardableResult
    public func insertImage(_ data: Data, after: Paragraph? = nil, description: String = "",
                            widthEMU: Int? = nil, heightEMU: Int? = nil, maxWidthEMU: Int = 5_760_720) throws -> Paragraph {
        guard let info = ImageInfo(data) else { throw WordError.unsupportedImageFormat }
        let story = after?.story ?? body
        let mediaDir = story.part.directory + "/media/image"
        let part = package.uniquePartName(prefix: mediaDir, ext: info.ext)
        package.setData(data, for: part, contentType: info.contentType)
        let rid = try package.relationships(of: story.part).add(.image, to: part, reuseExisting: false)

        var cx = widthEMU ?? info.width * 9525
        var cy = heightEMU ?? info.height * 9525
        if widthEMU == nil && cx > maxWidthEMU && cx > 0 {
            cy = cy * maxWidthEMU / cx
            cx = maxWidthEMU
        }
        let root = story.xml.root
        var maxId = 0
        for s in allStories {
            s.xml.root.forEachDescendant { e in
                if e.localName == "docPr", let id = Int(e.attribute("id") ?? "") { maxId = max(maxId, id) }
            }
        }
        let docPrId = maxId + 1
        let w = root.prefix(for: NS.w).map { $0.isEmpty ? "" : "\($0):" } ?? "w:"
        let rPrefix = root.prefix(for: NS.r)
        let rAttr = rPrefix.map { "\($0):embed" } ?? "r:embed"
        let rDecl = rPrefix == nil ? " xmlns:r=\"\(NS.r.primaryURI)\"" : ""
        let wDecl = root.prefix(for: NS.w) == nil ? " xmlns:w=\"\(NS.w.primaryURI)\"" : ""
        let esc = { (s: String) in s.replacingOccurrences(of: "&", with: "&amp;").replacingOccurrences(of: "\"", with: "&quot;").replacingOccurrences(of: "<", with: "&lt;") }
        let fragment = """
        <\(w)r\(wDecl)><\(w)rPr><\(w)noProof/></\(w)rPr><\(w)drawing><wp:inline xmlns:wp="\(NS.wp.primaryURI)" distT="0" distB="0" distL="0" distR="0"><wp:extent cx="\(cx)" cy="\(cy)"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="\(docPrId)" name="Hình \(docPrId)" descr="\(esc(description))"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="\(NS.a.primaryURI)" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="\(NS.a.primaryURI)"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="\(NS.pic.primaryURI)"><pic:nvPicPr><pic:cNvPr id="0" name="\(part.fileName)"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip\(rDecl) \(rAttr)="\(rid)"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="\(cx)" cy="\(cy)"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></\(w)drawing></\(w)r>
        """
        // Bọc trong phần tử khai báo namespace đang dùng để phân tích đoạn XML.
        var wrapperAttrs = ""
        if let p = root.prefix(for: NS.w) { wrapperAttrs += p.isEmpty ? " xmlns=\"\(NS.w.primaryURI)\"" : " xmlns:\(p)=\"\(NS.w.primaryURI)\"" }
        if let p = rPrefix, !p.isEmpty { wrapperAttrs += " xmlns:\(p)=\"\(NS.r.primaryURI)\"" }
        let parsed = try XDocument(string: "<wrapper\(wrapperAttrs)>\(fragment)</wrapper>")
        let run = parsed.root.elements[0]
        run.removeFromParent()

        let paragraph: Paragraph
        if let after {
            paragraph = try insertParagraph("", style: nil, after: after)
            for e in paragraph.element.children(NS.w, "pPr") { e.removeFromParent() }
        } else {
            paragraph = appendParagraph("")
        }
        paragraph.alignment = "center"
        paragraph.element.append(run)
        story.markModified()
        return paragraph
    }

    // MARK: Lưu

    public func save() throws -> Data { try package.save() }
    public func save(to url: URL) throws { try package.save(to: url) }
}

/// Đọc kích thước ảnh từ header (PNG IHDR, JPEG SOFn, GIF).
struct ImageInfo {
    let width: Int
    let height: Int
    let ext: String
    let contentType: String

    init?(_ data: Data) {
        let b = [UInt8](data.prefix(1 << 20))
        func be16(_ i: Int) -> Int { Int(b[i]) << 8 | Int(b[i + 1]) }
        func be32(_ i: Int) -> Int { be16(i) << 16 | be16(i + 2) }
        if b.count >= 24, b[0...7] == [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] {
            width = be32(16); height = be32(20); ext = "png"; contentType = ContentType.png
            return
        }
        if b.count >= 10, b[0...2] == [0x47, 0x49, 0x46] {
            width = Int(b[6]) | Int(b[7]) << 8; height = Int(b[8]) | Int(b[9]) << 8; ext = "gif"; contentType = ContentType.gif
            return
        }
        if b.count >= 4, b[0] == 0xFF, b[1] == 0xD8 {
            var i = 2
            while i + 9 < b.count {
                guard b[i] == 0xFF else { return nil }
                let marker = b[i + 1]
                if marker == 0xD8 || marker == 0x01 || (0xD0...0xD7).contains(marker) { i += 2; continue }
                let len = be16(i + 2)
                if (0xC0...0xCF).contains(marker) && marker != 0xC4 && marker != 0xC8 && marker != 0xCC {
                    height = be16(i + 5); width = be16(i + 7); ext = "jpeg"; contentType = ContentType.jpeg
                    return
                }
                i += 2 + len
            }
        }
        return nil
    }
}

/// Định dạng một cấp danh sách trong `word/numbering.xml`.
public enum NumberingFormat: String, Sendable {
    case decimal, bullet, lowerLetter, upperLetter, lowerRoman, upperRoman
    /// Ký hiệu cấp (lvlText) tương ứng; bullet dùng ký tự đầu dòng thay cho số.
    var levelText: String {
        switch self {
        case .decimal, .lowerRoman, .upperRoman: return "%1."
        case .lowerLetter, .upperLetter: return "%1)"
        case .bullet: return "•"
        }
    }
}

extension WordDocument {
    /// Phần numbering của tài liệu (tìm qua quan hệ `numbering`, nếu chưa có thì
    /// tạo `word/numbering.xml` mới kèm quan hệ và kiểu nội dung chuẩn).
    func numberingPart() throws -> (part: PartName, doc: XDocument) {
        if let part = try package.relatedPart(from: mainPart, .numbering), package.hasPart(part) {
            return (part, try package.xml(part))
        }
        let part = PartName("/word/numbering.xml")
        let root = XElement(name: "w:numbering",
                            attributes: [XAttribute(name: "xmlns:w", value: NS.w.primaryURI)])
        let doc = XDocument(root: root)
        package.setXML(doc, for: part,
                       contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml")
        _ = try package.relationships(of: mainPart).add(.numbering, to: part)
        return (part, doc)
    }

    /// numId dùng cho format/cấp cho trước: dùng lại num đã có cùng format ở cấp đó,
    /// nếu không có thì tạo abstractNum + num mới (id = max hiện có + 1).
    func numberingId(for format: NumberingFormat, level: Int) throws -> Int {
        let (part, doc) = try numberingPart()
        let root = doc.root
        func intAttr(_ e: XElement?, _ name: String) -> Int? {
            e?.attribute(WordText.qn(root, name)).flatMap(Int.init)
        }
        let abstracts = root.children(NS.w, "abstractNum")
        let nums = root.children(NS.w, "num")
        for num in nums {
            guard let numId = intAttr(num, "numId") ?? intAttr(num.firstChild(NS.w, "numId"), "val"),
                  let abstractId = num.firstChild(NS.w, "abstractNumId")?.attribute(WordText.qn(root, "val")).flatMap(Int.init),
                  let ab = abstracts.first(where: { intAttr($0, "abstractNumId") == abstractId }),
                  let lvl = ab.children(NS.w, "lvl").first(where: { intAttr($0, "ilvl") == level }),
                  lvl.firstChild(NS.w, "numFmt")?.attribute(WordText.qn(root, "val")) == format.rawValue else { continue }
            return numId
        }
        // Tạo mới: abstractNum (singleLevel, 1 cấp) rồi num trỏ tới nó.
        let newAbstractId = (abstracts.compactMap { intAttr($0, "abstractNumId") }.max() ?? -1) + 1
        let newNumId = (nums.compactMap { n in
            n.attribute(WordText.qn(root, "numId")).flatMap(Int.init)
                ?? n.firstChild(NS.w, "numId")?.attribute(WordText.qn(root, "val")).flatMap(Int.init)
        }.max() ?? 0) + 1
        let ab = XElement(name: WordText.qn(root, "abstractNum"),
                          attributes: [XAttribute(name: WordText.qn(root, "abstractNumId"), value: String(newAbstractId))])
        ab.append(XElement(name: WordText.qn(root, "multiLevelType"),
                           attributes: [XAttribute(name: WordText.qn(root, "val"), value: "singleLevel")]))
        let lvl = XElement(name: WordText.qn(root, "lvl"),
                           attributes: [XAttribute(name: WordText.qn(root, "ilvl"), value: String(level))])
        if format != .bullet {
            lvl.append(XElement(name: WordText.qn(root, "start"),
                                attributes: [XAttribute(name: WordText.qn(root, "val"), value: "1")]))
        }
        lvl.append(XElement(name: WordText.qn(root, "numFmt"),
                            attributes: [XAttribute(name: WordText.qn(root, "val"), value: format.rawValue)]))
        lvl.append(XElement(name: WordText.qn(root, "lvlText"),
                            attributes: [XAttribute(name: WordText.qn(root, "val"), value: format.levelText)]))
        lvl.append(XElement(name: WordText.qn(root, "lvlJc"),
                            attributes: [XAttribute(name: WordText.qn(root, "val"), value: "left")]))
        let pPr = XElement(name: WordText.qn(root, "pPr"))
        pPr.append(XElement(name: WordText.qn(root, "ind"),
                            attributes: [XAttribute(name: WordText.qn(root, "left"), value: "720"),
                                         XAttribute(name: WordText.qn(root, "hanging"), value: "360")]))
        lvl.append(pPr)
        ab.append(lvl)
        if let firstNum = nums.first { root.insert(ab, before: firstNum) } else { root.append(ab) }
        let num = XElement(name: WordText.qn(root, "num"),
                           attributes: [XAttribute(name: WordText.qn(root, "numId"), value: String(newNumId))])
        num.append(XElement(name: WordText.qn(root, "abstractNumId"),
                            attributes: [XAttribute(name: WordText.qn(root, "val"), value: String(newAbstractId))]))
        root.append(num)
        package.markModified(part)
        return newNumId
    }

    /// Format của một numId ở cấp cho trước (nil nếu không tra được).
    public func numberingFormat(numId: Int, level: Int) -> String? {
        guard let part = try? package.relatedPart(from: mainPart, .numbering),
              let doc = try? package.xml(part) else { return nil }
        let root = doc.root
        guard let num = root.children(NS.w, "num").first(where: {
            $0.attribute(WordText.qn(root, "numId")) == String(numId)
                || $0.firstChild(NS.w, "numId")?.attribute(WordText.qn(root, "val")) == String(numId)
        }),
        let abstractId = num.firstChild(NS.w, "abstractNumId")?.attribute(WordText.qn(root, "val")),
        let ab = root.children(NS.w, "abstractNum").first(where: { $0.attribute(WordText.qn(root, "abstractNumId")) == abstractId }),
        let lvl = ab.children(NS.w, "lvl").first(where: { $0.attribute(WordText.qn(root, "ilvl")) == String(level) }) else { return nil }
        return lvl.firstChild(NS.w, "numFmt")?.attribute(WordText.qn(root, "val"))
    }
}

/// Loại header/footer của một section (default = trang thường; first chỉ có
/// hiệu lực khi section bật titlePg, even khi tài liệu bật evenAndOddHeaders).
public enum SectionHeaderFooterType: String, Sendable { case `default`, first, even }

public enum SectionHeaderFooterKind: String, Sendable { case header, footer }

/// Một section của tài liệu DOCX: sectPr trong pPr của đoạn ngắt section, hoặc
/// sectPr cuối thân văn bản. Header/footer "liên kết tới section trước" trong
/// Word chính là việc sectPr KHÔNG có headerReference/footerReference loại đó
/// (section sẽ dùng header/footer của section trước); section đầu tiên không
/// có khái niệm liên kết.
public final class Section {
    public let document: WordDocument
    public let index: Int
    let element: XElement

    init(document: WordDocument, index: Int, element: XElement) {
        self.document = document
        self.index = index
        self.element = element
    }

    private func reference(kind: SectionHeaderFooterKind, type: SectionHeaderFooterType) -> XElement? {
        let name = kind == .header ? "headerReference" : "footerReference"
        return element.children(NS.w, name).first { ref in
            (ref.attribute(WordText.qn(element, "type")) ?? "default") == type.rawValue
        }
    }

    public func isLinkedToPrevious(kind: SectionHeaderFooterKind, type: SectionHeaderFooterType = .default) -> Bool {
        guard index > 0 else { return false }
        return reference(kind: kind, type: type) == nil
    }

    /// Bật/tắt liên kết tới section trước. Bật = xóa tham chiếu riêng của section
    /// (kế thừa section trước). Tắt = sao chép header/footer của section trước
    /// thành part mới (ảnh và tài nguyên khác dùng chung) rồi tham chiếu tới nó;
    /// nếu section trước cũng không có header/footer loại đó thì tạo part rỗng.
    public func setLinkedToPrevious(_ linked: Bool, kind: SectionHeaderFooterKind, type: SectionHeaderFooterType = .default) throws {
        if linked {
            guard index > 0 else { throw WordError.invalidSection("section đầu tiên không liên kết tới section trước") }
            for e in element.children(NS.w, kind == .header ? "headerReference" : "footerReference")
                where (e.attribute(WordText.qn(element, "type")) ?? "default") == type.rawValue {
                e.removeFromParent()
            }
        } else {
            if reference(kind: kind, type: type) != nil { return }
            let stem = kind == .header ? "header" : "footer"
            let newPart = document.package.uniquePartName(prefix: "/word/\(stem)", ext: "xml")
            let prevRef = document.sections[index > 0 ? index - 1 : 0].reference(kind: kind, type: type)
            if index > 0, let prevRef,
               let rid = prevRef.attribute("\(element.prefix(for: NS.r) ?? "r"):id"),
               let prevPart = try? document.package.relationships(of: document.mainPart).targetPart(id: rid) {
                var copied: [PartName: PartName] = [:]
                try document.package.duplicatePart(prevPart, as: newPart, shareable: { _ in true }, copied: &copied)
            } else {
                let root = XElement(name: "w:\(kind == .header ? "hdr" : "ftr")",
                                    attributes: [XAttribute(name: "xmlns:w", value: NS.w.primaryURI)])
                packageSetXML(newPart, root: root, kind: kind)
            }
            let relId = try document.package.relationships(of: document.mainPart)
                .add(kind == .header ? .header : .footer, to: newPart)
            let ref = XElement(name: WordText.qn(element, kind == .header ? "headerReference" : "footerReference"),
                               attributes: [XAttribute(name: WordText.qn(element, "type"), value: type.rawValue),
                                            XAttribute(name: "\(element.prefix(for: NS.r) ?? "r"):id", value: relId)])
            if kind == .header {
                element.insert(ref, at: 0)
            } else {
                let headers = element.children(NS.w, "headerReference")
                if let last = headers.last { element.insert(ref, after: last) } else { element.insert(ref, at: 0) }
            }
        }
        document.body.markModified()
    }

    private func packageSetXML(_ part: PartName, root: XElement, kind: SectionHeaderFooterKind) {
        document.package.setXML(XDocument(root: root), for: part,
                                contentType: kind == .header
                                    ? "application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"
                                    : "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml")
    }
}

extension WordDocument {
    /// Các section theo thứ tự: đoạn mang sectPr trong pPr trước, sectPr cuối
    /// thân văn bản cuối cùng.
    public var sections: [Section] {
        var out: [Section] = []
        for p in body.paragraphs {
            if let sectPr = p.element.firstChild(NS.w, "pPr")?.firstChild(NS.w, "sectPr") {
                out.append(Section(document: self, index: out.count, element: sectPr))
            }
        }
        if let final = body.container.elements.last, final.is(NS.w, "sectPr") {
            out.append(Section(document: self, index: out.count, element: final))
        }
        return out
    }
}

