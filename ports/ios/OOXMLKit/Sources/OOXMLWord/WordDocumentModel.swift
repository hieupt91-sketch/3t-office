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
        guard let main = try? package.mainDocumentPart(), package.hasPart(main) else {
            throw WordError.notAWordDocument
        }
        // Part chính tồn tại nhưng XML hỏng/quá sâu: truyền thẳng lỗi có mã của
        // tầng gói (XMLError) thay vì gộp thành notAWordDocument — nhất quán với
        // Workbook, và đúng yêu cầu độ bền của gói L8 (lỗi phải có mã rõ).
        let doc = try package.xml(main)
        guard doc.root.is(NS.w, "document") else { throw WordError.notAWordDocument }
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

extension Paragraph {
    /// Chèn footnote ở cuối đoạn: thêm entry vào part footnotes (tạo part nếu
    /// chưa có) và một run tham chiếu `w:footnoteReference` ở cuối đoạn này.
    @discardableResult
    public func appendFootnote(_ text: String) throws -> Int {
        let id = try story.document.addNote(footnotes: true, text: text)
        appendNoteReference(id: id, footnotes: true)
        return id
    }

    /// Chèn endnote ở cuối đoạn; đối tác của `appendFootnote` cho part endnotes.
    @discardableResult
    public func appendEndnote(_ text: String) throws -> Int {
        let id = try story.document.addNote(footnotes: false, text: text)
        appendNoteReference(id: id, footnotes: false)
        return id
    }

    private func appendNoteReference(id: Int, footnotes isFoot: Bool) {
        let r = XElement(name: WordText.qn(element, "r"))
        let rPr = XElement(name: WordText.qn(element, "rPr"))
        let style = XElement(name: WordText.qn(element, "rStyle"))
        style.setAttribute(WordText.qn(element, "val"), isFoot ? "FootnoteReference" : "EndnoteReference")
        rPr.append(style)
        r.append(rPr)
        let ref = XElement(name: WordText.qn(element, isFoot ? "footnoteReference" : "endnoteReference"))
        ref.setAttribute(WordText.qn(element, "id"), String(id))
        r.append(ref)
        element.append(r)
        story.markModified()
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
        // Hình dạng định nghĩa mà bộ sinh dưới đây tạo cho (format, level):
        // cấp đích dùng đúng format được yêu cầu; các cấp cha dùng tiến trình
        // chuẩn decimal -> lowerLetter -> lowerRoman để placeholder %1...%n
        // có định nghĩa. Bullet thì mọi cấp đều là bullet.
        func levelFormat(_ i: Int) -> NumberingFormat {
            if format == .bullet { return .bullet }
            if i == level { return format }
            switch i % 3 {
            case 0: return .decimal
            case 1: return .lowerLetter
            default: return .lowerRoman
            }
        }
        func levelText(_ i: Int) -> String {
            if format == .bullet { return "•" }
            if level == 0 { return format.levelText }
            return (0...i).map { "%\($0 + 1)" }.joined(separator: ".") + "."
        }
        // Dùng lại CHỈ khi đã có định nghĩa đúng hình dạng của (format, level):
        // đúng số cấp 0...level và từng cấp khớp format + lvlText mà bộ sinh
        // sẽ tạo. Một abstractNum nhiều cấp hơn — dù chứa format này ở một
        // cấp trong — là định nghĩa của một danh sách khác, không dùng chung
        // numId (hai danh sách độc lập không vô tình dùng cùng numId).
        for num in nums {
            guard let numId = intAttr(num, "numId") ?? intAttr(num.firstChild(NS.w, "numId"), "val"),
                  let abstractId = num.firstChild(NS.w, "abstractNumId")?.attribute(WordText.qn(root, "val")).flatMap(Int.init),
                  let ab = abstracts.first(where: { intAttr($0, "abstractNumId") == abstractId }) else { continue }
            let lvls = ab.children(NS.w, "lvl")
            guard lvls.count == level + 1 else { continue }
            var matches = true
            for i in 0...level {
                guard let lvl = lvls.first(where: { intAttr($0, "ilvl") == i }),
                      lvl.firstChild(NS.w, "numFmt")?.attribute(WordText.qn(root, "val")) == levelFormat(i).rawValue,
                      lvl.firstChild(NS.w, "lvlText")?.attribute(WordText.qn(root, "val")) == levelText(i)
                else { matches = false; break }
            }
            if matches { return numId }
        }
        // Tạo mới: abstractNum gồm đủ các cấp 0...level (đa cấp thật khi
        // level > 0) rồi num trỏ tới nó.
        let newAbstractId = (abstracts.compactMap { intAttr($0, "abstractNumId") }.max() ?? -1) + 1
        let newNumId = (nums.compactMap { n in
            n.attribute(WordText.qn(root, "numId")).flatMap(Int.init)
                ?? n.firstChild(NS.w, "numId")?.attribute(WordText.qn(root, "val")).flatMap(Int.init)
        }.max() ?? 0) + 1
        let ab = XElement(name: WordText.qn(root, "abstractNum"),
                          attributes: [XAttribute(name: WordText.qn(root, "abstractNumId"), value: String(newAbstractId))])
        ab.append(XElement(name: WordText.qn(root, "multiLevelType"),
                           attributes: [XAttribute(name: WordText.qn(root, "val"), value: level == 0 ? "singleLevel" : "multilevel")]))
        for i in 0...level {
            let f = levelFormat(i)
            let lvl = XElement(name: WordText.qn(root, "lvl"),
                               attributes: [XAttribute(name: WordText.qn(root, "ilvl"), value: String(i))])
            if f != .bullet {
                lvl.append(XElement(name: WordText.qn(root, "start"),
                                    attributes: [XAttribute(name: WordText.qn(root, "val"), value: "1")]))
            }
            lvl.append(XElement(name: WordText.qn(root, "numFmt"),
                                attributes: [XAttribute(name: WordText.qn(root, "val"), value: f.rawValue)]))
            lvl.append(XElement(name: WordText.qn(root, "lvlText"),
                                attributes: [XAttribute(name: WordText.qn(root, "val"), value: levelText(i))]))
            lvl.append(XElement(name: WordText.qn(root, "lvlJc"),
                                attributes: [XAttribute(name: WordText.qn(root, "val"), value: "left")]))
            let pPr = XElement(name: WordText.qn(root, "pPr"))
            pPr.append(XElement(name: WordText.qn(root, "ind"),
                                attributes: [XAttribute(name: WordText.qn(root, "left"), value: "720"),
                                             XAttribute(name: WordText.qn(root, "hanging"), value: "360")]))
            lvl.append(pPr)
            ab.append(lvl)
        }
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

/// Hướng giấy của section (thuộc tính `orient` của `w:pgSz`; vắng = portrait).
public enum SectionOrientation: String, Equatable, Sendable {
    case portrait, landscape
}

/// Kiểu ngắt section (`w:type` trong sectPr; vắng = nextPage).
public enum SectionBreakType: String, Equatable, Sendable {
    case nextPage, continuous, evenPage, oddPage, nextColumn
}

/// Kích thước giấy của section, đơn vị twips (1/1440 inch) như lưu trong `w:pgSz`.
/// `width`/`height` là kích thước vật lý của trang; `orientation` là cờ hướng đi kèm.
public struct SectionPageSize: Equatable, Sendable {
    public var width: Int
    public var height: Int
    public var orientation: SectionOrientation
    public init(width: Int, height: Int, orientation: SectionOrientation = .portrait) {
        self.width = width; self.height = height; self.orientation = orientation
    }
}

/// Lề trang của section, đơn vị twips như lưu trong `w:pgMar`.
public struct SectionMargins: Equatable, Sendable {
    public var top: Int
    public var right: Int
    public var bottom: Int
    public var left: Int
    public var header: Int
    public var footer: Int
    public var gutter: Int
    public init(top: Int, right: Int, bottom: Int, left: Int, header: Int, footer: Int, gutter: Int) {
        self.top = top; self.right = right; self.bottom = bottom; self.left = left
        self.header = header; self.footer = footer; self.gutter = gutter
    }
}

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

    func reference(kind: SectionHeaderFooterKind, type: SectionHeaderFooterType) -> XElement? {
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
    /// (kế thừa section trước). Tắt = sao chép header/footer hiệu lực gần nhất
    /// của đúng kind + type (tìm ngược qua các section đang kế thừa) thành part
    /// mới (ảnh và tài nguyên khác dùng chung) rồi tham chiếu tới nó; nếu không
    /// có reference hiệu lực nào trước đó thì tạo part rỗng.
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
            // Tìm ngược reference hiệu lực gần nhất của đúng kind + type. Section
            // ngay trước có thể cũng đang kế thừa, nên không được chỉ nhìn nó:
            // phải đi tiếp về các section trước nữa cho tới section đầu tiên.
            var effectiveRef: XElement?
            if index > 0 {
                for section in document.sections[..<index].reversed() {
                    if let ref = section.reference(kind: kind, type: type) {
                        effectiveRef = ref
                        break
                    }
                }
            }
            if let effectiveRef,
               let rid = effectiveRef.attribute("\(element.prefix(for: NS.r) ?? "r"):id"),
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

    // MARK: Thuộc tính trang của section (pgSz / pgMar / type / cols / titlePg)

    /// Thứ tự con chuẩn của CT_SectPr (ECMA-376) — khi tạo phần tử con mới phải
    /// chèn đúng vị trí này, phần tử lạ (không có trong danh sách) giữ nguyên chỗ.
    private static let childOrder = ["headerReference", "footerReference", "footnotePr", "endnotePr",
                                     "type", "pgSz", "pgMar", "paperSrc", "pgBorders", "lnNumType",
                                     "pgNumType", "cols", "formProt", "vAlign", "noEndnote", "titlePg",
                                     "textDirection", "bidi", "rtlGutter", "docGrid", "printerSettings", "sectPrChange"]

    private func upsertChild(_ name: String) -> XElement {
        if let e = element.firstChild(NS.w, name) { return e }
        let e = XElement(name: WordText.qn(element, name))
        let my = Section.childOrder.firstIndex(of: name) ?? Section.childOrder.count
        for child in element.elements {
            if let ci = Section.childOrder.firstIndex(of: child.localName), ci > my {
                element.insert(e, before: child)
                return e
            }
        }
        element.append(e)
        return e
    }

    private func intAttr(_ e: XElement?, _ name: String) -> Int? {
        guard let v = e?.attribute(WordText.qn(element, name)) else { return nil }
        return Int(v)
    }

    /// Kích thước giấy; nil nếu sectPr chưa có `w:pgSz`.
    public var pageSize: SectionPageSize? {
        guard let pgSz = element.firstChild(NS.w, "pgSz"),
              let w = intAttr(pgSz, "w"), let h = intAttr(pgSz, "h") else { return nil }
        let orient = pgSz.attribute(WordText.qn(element, "orient")) == "landscape"
            ? SectionOrientation.landscape : .portrait
        return SectionPageSize(width: w, height: h, orientation: orient)
    }

    public func setPageSize(_ size: SectionPageSize) throws {
        guard size.width > 0, size.height > 0 else {
            throw WordError.invalidSection("kích thước giấy phải > 0 twips (nhận \(size.width)x\(size.height))")
        }
        let pgSz = upsertChild("pgSz")
        pgSz.setAttribute(WordText.qn(element, "w"), String(size.width))
        pgSz.setAttribute(WordText.qn(element, "h"), String(size.height))
        if size.orientation == .landscape {
            pgSz.setAttribute(WordText.qn(element, "orient"), "landscape")
        } else {
            pgSz.removeAttribute(WordText.qn(element, "orient"))
        }
        document.body.markModified()
    }

    /// Lề trang; nil nếu sectPr chưa có `w:pgMar` (thuộc tính vắng trong pgMar đọc là 0).
    public var margins: SectionMargins? {
        guard let pgMar = element.firstChild(NS.w, "pgMar") else { return nil }
        return SectionMargins(top: intAttr(pgMar, "top") ?? 0, right: intAttr(pgMar, "right") ?? 0,
                              bottom: intAttr(pgMar, "bottom") ?? 0, left: intAttr(pgMar, "left") ?? 0,
                              header: intAttr(pgMar, "header") ?? 0, footer: intAttr(pgMar, "footer") ?? 0,
                              gutter: intAttr(pgMar, "gutter") ?? 0)
    }

    public func setMargins(_ m: SectionMargins) throws {
        guard [m.top, m.right, m.bottom, m.left, m.header, m.footer, m.gutter].allSatisfy({ $0 >= 0 }) else {
            throw WordError.invalidSection("lề trang không được âm")
        }
        let pgMar = upsertChild("pgMar")
        for (name, value) in [("top", m.top), ("right", m.right), ("bottom", m.bottom), ("left", m.left),
                              ("header", m.header), ("footer", m.footer), ("gutter", m.gutter)] {
            pgMar.setAttribute(WordText.qn(element, name), String(value))
        }
        document.body.markModified()
    }

    /// Kiểu ngắt section; `.nextPage` khi không có phần tử `w:type`.
    public var breakType: SectionBreakType {
        guard let v = element.firstChild(NS.w, "type")?.attribute(WordText.qn(element, "val")) else { return .nextPage }
        return SectionBreakType(rawValue: v) ?? .nextPage
    }

    public func setBreakType(_ type: SectionBreakType) {
        if type == .nextPage {
            element.firstChild(NS.w, "type")?.removeFromParent()
        } else {
            upsertChild("type").setAttribute(WordText.qn(element, "val"), type.rawValue)
        }
        document.body.markModified()
    }

    /// Section có trang đầu riêng (header/footer "first") hay không (`w:titlePg`).
    public var titlePage: Bool { element.firstChild(NS.w, "titlePg") != nil }

    public func setTitlePage(_ on: Bool) {
        if on {
            if element.firstChild(NS.w, "titlePg") == nil { _ = upsertChild("titlePg") }
        } else {
            element.firstChild(NS.w, "titlePg")?.removeFromParent()
        }
        document.body.markModified()
    }

    /// Số cột báo của section (`w:cols/@num`; 1 khi không khai).
    public var columnCount: Int {
        guard let cols = element.firstChild(NS.w, "cols") else { return 1 }
        return intAttr(cols, "num") ?? 1
    }

    public func setColumnCount(_ count: Int) throws {
        guard (1...45).contains(count) else {
            throw WordError.invalidSection("số cột phải trong 1...45 (nhận \(count))")
        }
        if count == 1, element.firstChild(NS.w, "cols") == nil { return }
        let cols = upsertChild("cols")
        if count == 1 {
            cols.removeAttribute(WordText.qn(element, "num"))
            // cols rỗng hoàn toàn (không còn thuộc tính nào khác) thì bỏ cả phần tử.
            if cols.attributes.isEmpty, cols.children.isEmpty { cols.removeFromParent() }
        } else {
            cols.setAttribute(WordText.qn(element, "num"), String(count))
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
    // MARK: Chèn footnote / endnote

    /// Story chú thích theo loại; tạo part mới (kèm hai entry separator chuẩn
    /// id 0/1 như Word/LibreOffice ghi, quan hệ và content type) nếu chưa có.
    func ensureNotesStory(footnotes isFoot: Bool) throws -> WordStory {
        if let s = isFoot ? footnotes : endnotes { return s }
        let stem = isFoot ? "footnotes" : "endnotes"
        let entryName = isFoot ? "footnote" : "endnote"
        let part = PartName("/word/\(stem).xml")
        let root = XElement(name: "w:\(stem)",
                            attributes: [XAttribute(name: "xmlns:w", value: NS.w.primaryURI)])
        func separatorEntry(_ id: Int, _ type: String, _ child: String) -> XElement {
            let f = XElement(name: "w:\(entryName)", attributes: [
                XAttribute(name: "w:type", value: type), XAttribute(name: "w:id", value: String(id))])
            let p = XElement(name: "w:p")
            let r = XElement(name: "w:r")
            r.append(XElement(name: "w:\(child)"))
            p.append(r)
            f.append(p)
            return f
        }
        root.append(separatorEntry(0, "separator", "separator"))
        root.append(separatorEntry(1, "continuationSeparator", "continuationSeparator"))
        package.setXML(XDocument(root: root), for: part,
                       contentType: isFoot
                           ? "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml"
                           : "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml")
        _ = try package.relationships(of: mainPart).add(isFoot ? .footnotes : .endnotes, to: part)
        return try story(part, isFoot ? .footnotes : .endnotes)
    }

    /// Thêm entry chú thích mới vào part tương ứng, trả id mới (max id hiện có + 1).
    func addNote(footnotes isFoot: Bool, text: String) throws -> Int {
        let story = try ensureNotesStory(footnotes: isFoot)
        let entryName = isFoot ? "footnote" : "endnote"
        let root = story.container
        var maxId = 1
        for e in root.children(NS.w, entryName) {
            if let v = e.attribute(WordText.qn(e, "id")), let n = Int(v) { maxId = max(maxId, n) }
        }
        let id = maxId + 1
        let entry = XElement(name: WordText.qn(root, entryName),
                             attributes: [XAttribute(name: WordText.qn(root, "id"), value: String(id))])
        let p = XElement(name: WordText.qn(root, "p"))
        for r in WordText.makeRuns(text, rPr: nil, context: root) { p.append(r) }
        entry.append(p)
        root.append(entry)
        story.markModified()
        return id
    }

    // MARK: Watermark (hình mờ trong header)

    /// Part header mặc định hiệu lực của section `sectionIndex`: reference của
    /// chính nó, hoặc của section trước gần nhất có reference (kế thừa).
    func effectiveHeaderPart(sectionIndex: Int) -> PartName? {
        guard sections.indices.contains(sectionIndex) else { return nil }
        for s in sections[...sectionIndex].reversed() {
            if let ref = s.reference(kind: .header, type: .default),
               let rid = ref.attribute("\(ref.prefix(for: NS.r) ?? "r"):id"),
               let part = try? package.relationships(of: mainPart).targetPart(id: rid) {
                return part
            }
        }
        return nil
    }

    private static let vmlURI = "urn:schemas-microsoft-com:vml"

    /// Shape watermark trong một đoạn (id do thư viện đặt hoặc id Word đặt), nếu có.
    private func watermarkShape(in paragraph: XElement) -> XElement? {
        var found: XElement?
        paragraph.forEachDescendant { e in
            guard found == nil, e.localName == "shape", e.namespaceURI == WordDocument.vmlURI else { return }
            let id = e.attribute("id") ?? ""
            if id == "VNOfficeWatermark" || id.hasPrefix("PowerPlusWaterMarkObject") { found = e }
        }
        return found
    }

    /// Chữ watermark hiện tại (đọc từ header đầu tiên có watermark); nil nếu không có.
    public var watermarkText: String? {
        for story in headers {
            for p in story.paragraphs {
                if let shape = watermarkShape(in: p.element) {
                    var text: String?
                    shape.forEachDescendant { e in
                        if e.localName == "textpath", let s = e.attribute("string") { text = s }
                    }
                    if let text { return text }
                }
            }
        }
        return nil
    }

    /// Đặt watermark chữ cho toàn tài liệu: chèn shape VML textpath (mẫu Word)
    /// vào từng part header mặc định hiệu lực phân biệt của các section; section
    /// chưa có header hiệu lực nào thì tạo header riêng cho section đầu (mọi
    /// section đang liên kết sẽ kế thừa). Watermark cũ trong cùng part bị thay.
    public func setWatermark(_ text: String) throws {
        guard !text.trimmingCharacters(in: .whitespaces).isEmpty else {
            throw WordError.invalidSection("chữ watermark không được rỗng")
        }
        var parts: [PartName] = []
        for i in sections.indices {
            if let part = effectiveHeaderPart(sectionIndex: i), !parts.contains(part) { parts.append(part) }
        }
        if parts.isEmpty {
            try sections[0].setLinkedToPrevious(false, kind: .header, type: .default)
            if let part = effectiveHeaderPart(sectionIndex: 0) { parts = [part] }
        }
        for part in parts {
            guard let story = headers.first(where: { $0.part == part }) else { continue }
            removeWatermarkShapes(in: story)
            appendWatermarkParagraph(in: story, text: text)
            story.markModified()
        }
    }

    /// Gỡ watermark khỏi mọi part header của tài liệu.
    public func removeWatermark() {
        for story in headers where removeWatermarkShapes(in: story) {
            story.markModified()
        }
    }

    @discardableResult
    private func removeWatermarkShapes(in story: WordStory) -> Bool {
        var removed = false
        for p in story.paragraphs where watermarkShape(in: p.element) != nil {
            p.element.removeFromParent()
            removed = true
        }
        return removed
    }

    private func appendWatermarkParagraph(in story: WordStory, text: String) {
        let root = story.container
        if root.namespaceURI(forPrefix: "v") == nil {
            root.setAttribute("xmlns:v", WordDocument.vmlURI)
        }
        if root.namespaceURI(forPrefix: "o") == nil {
            root.setAttribute("xmlns:o", "urn:schemas-microsoft-com:office:office")
        }
        func el(_ name: String, _ attrs: [(String, String)] = []) -> XElement {
            XElement(name: name, attributes: attrs.map { XAttribute(name: $0.0, value: $0.1) })
        }
        let shapetype = el("v:shapetype", [("id", "_x0000_t136"), ("coordsize", "21600,21600"),
                                           ("o:spt", "136"), ("adj", "10800"),
                                           ("path", "m@7,l@8,m@5,21600l@6,21600e")])
        let formulas = el("v:formulas")
        for eqn in ["sum #0 0 10800", "prod #0 2 1", "sum 21600 0 @1", "sum 0 0 @2",
                    "prod @2 2 1", "prod @3 21600 pixelWidth", "sum @5 0 @4",
                    "prod @3 21600 pixelHeight", "sum @7 0 @6", "prod @2 21600 pixelHeight",
                    "prod @9 2 1", "sum @10 21600 0", "prod @8 21600 pixelWidth", "sum @12 21600 0"] {
            formulas.append(el("v:f", [("eqn", eqn)]))
        }
        shapetype.append(formulas)
        shapetype.append(el("v:path", [("textpathok", "t"), ("o:connecttype", "custom"),
                                       ("o:connectlocs", "@8,@0;@10,@0;@8,@11;@10,@0"),
                                       ("o:connectangles", "270,180,90,0")]))
        shapetype.append(el("v:textpath", [("on", "t"), ("fitshape", "t")]))
        let handles = el("v:handles")
        handles.append(el("v:h", [("position", "#0,bottomRight"), ("xrang", "6629,14971")]))
        shapetype.append(handles)
        shapetype.append(el("o:lock", [("v:ext", "edit"), ("text", "t"), ("shapetype", "t")]))
        let shape = el("v:shape", [("id", "VNOfficeWatermark"), ("type", "#_x0000_t136"),
                                   ("style", "position:absolute;margin-left:0;margin-top:0;width:468pt;height:120pt;rotation:315;z-index:-251657216;mso-position-horizontal:center;mso-position-horizontal-relative:margin;mso-position-vertical:center;mso-position-vertical-relative:margin"),
                                   ("o:allowincell", "f"), ("fillcolor", "#bfbfbf"), ("stroked", "f")])
        shape.append(el("v:fill", [("opacity", "0.5")]))
        shape.append(el("v:textpath", [("style", "font-family:\"Calibri\";font-size:1pt"), ("string", text)]))
        let pict = el("w:pict")
        pict.append(shapetype)
        pict.append(shape)
        let r = el("w:r")
        r.append(pict)
        let p = el("w:p")
        p.append(r)
        root.append(p)
    }

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

