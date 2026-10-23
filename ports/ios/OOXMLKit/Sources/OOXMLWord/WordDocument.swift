import Foundation
import OOXMLPackage

public enum WordError: Error, Equatable, CustomStringConvertible {
    case notAWordDocument
    case paragraphNotInDocument
    case unsupportedImageFormat

    public var description: String {
        switch self {
        case .notAWordDocument: return "Tệp không phải văn bản DOCX"
        case .paragraphNotInDocument: return "Đoạn văn không thuộc tài liệu này"
        case .unsupportedImageFormat: return "Chỉ hỗ trợ chèn ảnh PNG, JPEG, GIF"
        }
    }
}

/// Một "story" của Word: thân văn bản, header, footer, footnotes, endnotes hoặc comments.
public final class WordStory {
    public enum Kind: Equatable, Sendable { case body, header, footer, footnotes, endnotes, comments }

    public let document: WordDocument
    public let kind: Kind
    public let part: PartName
    let xml: XDocument

    init(document: WordDocument, kind: Kind, part: PartName) throws {
        self.document = document
        self.kind = kind
        self.part = part
        xml = try document.package.xml(part)
    }

    /// Phần tử chứa khối nội dung (w:body với thân văn bản, gốc với các story khác).
    var container: XElement {
        kind == .body ? (xml.root.firstChild(NS.w, "body") ?? xml.root) : xml.root
    }

    func markModified() { document.package.markModified(part) }

    /// Mọi đoạn văn theo thứ tự đọc, kể cả trong bảng và content control
    /// (không gồm đoạn trong hộp văn bản/hình vẽ).
    public var paragraphs: [Paragraph] {
        var out: [Paragraph] = []
        func visit(_ e: XElement) {
            for c in e.elements {
                if c.localName == "AlternateContent" {
                    if let choice = c.elements.first(where: { $0.localName == "Choice" }) { visit(choice) }
                    continue
                }
                guard WordText.isW(c) else { continue }
                switch c.localName {
                case "p": out.append(Paragraph(story: self, element: c))
                case "tbl", "tr", "tc", "sdt", "sdtContent", "customXml", "footnote", "endnote", "comment", "ins", "moveTo":
                    visit(c)
                default: break
                }
            }
        }
        visit(container)
        return out
    }

    /// Bảng cấp cao nhất của story.
    public var tables: [Table] {
        container.elements.filter { WordText.isW($0) && $0.localName == "tbl" }.map { Table(story: self, element: $0) }
    }

    public var text: String { paragraphs.map(\.text).joined(separator: "\n") }

    @discardableResult
    public func replaceText(_ find: String, with replacement: String) -> Int {
        var n = 0
        for p in paragraphs { n += WordText.replace(in: p.element, find, with: replacement) }
        // Đoạn trong hộp văn bản (cả Choice và Fallback để hai bản luôn khớp).
        container.forEachDescendant { e in
            if e.is(NS.w, "txbxContent") {
                for p in e.descendants(NS.w, "p") { n += WordText.replace(in: p, find, with: replacement) }
            }
        }
        if n > 0 { markModified() }
        return n
    }
}

public final class Paragraph {
    public let story: WordStory
    public let element: XElement

    init(story: WordStory, element: XElement) {
        self.story = story
        self.element = element
    }

    public var text: String { WordText.paragraphText(element) }

    public var styleId: String? {
        element.firstChild(NS.w, "pPr")?.firstChild(NS.w, "pStyle")?.attribute(WordText.qn(element, "val"))
    }

    /// Thay chữ, giữ định dạng đoạn, run đầu tiên, bookmark, ảnh và tham chiếu chú thích.
    public func setText(_ text: String) {
        WordText.setParagraphText(element, text)
        story.markModified()
    }

    public func setStyle(_ styleId: String?) {
        let pPr = WordText.ensurePPr(element)
        for e in pPr.children(NS.w, "pStyle") { e.removeFromParent() }
        if let styleId {
            pPr.insertChild(XElement(name: WordText.qn(pPr, "pStyle"), attributes: [XAttribute(name: WordText.qn(pPr, "val"), value: styleId)]),
                            schemaOrder: WordText.pPrOrder)
        }
        if pPr.elements.isEmpty && pPr.attributes.isEmpty { pPr.removeFromParent() }
        story.markModified()
    }

    /// Căn lề: left|center|right|both.
    public var alignment: String? {
        get { element.firstChild(NS.w, "pPr")?.firstChild(NS.w, "jc")?.attribute(WordText.qn(element, "val")) }
        set {
            let pPr = WordText.ensurePPr(element)
            for e in pPr.children(NS.w, "jc") { e.removeFromParent() }
            if let newValue {
                pPr.insertChild(XElement(name: WordText.qn(pPr, "jc"), attributes: [XAttribute(name: WordText.qn(pPr, "val"), value: newValue)]),
                                schemaOrder: WordText.pPrOrder)
            }
            story.markModified()
        }
    }

    public var runs: [Run] {
        WordText.textRuns(element).map { Run(paragraph: self, element: $0) }
    }

    @discardableResult
    public func replaceText(_ find: String, with replacement: String) -> Int {
        let n = WordText.replace(in: element, find, with: replacement)
        if n > 0 { story.markModified() }
        return n
    }

    /// Áp đậm/nghiêng/gạch chân cho mọi run chữ của đoạn.
    public func setBold(_ on: Bool) { for r in runs where !r.text.isEmpty { r.setBold(on) } }
    public func setItalic(_ on: Bool) { for r in runs where !r.text.isEmpty { r.setItalic(on) } }

    /// Thêm một run chữ ở cuối đoạn, kế thừa định dạng run chữ cuối (nếu có).
    @discardableResult
    public func appendRun(_ text: String, bold: Bool? = nil, italic: Bool? = nil) -> Run {
        let base = WordText.textRuns(element).last { !WordText.isAnchorRun($0) }?.firstChild(NS.w, "rPr")?.deepCopy()
        let r = WordText.makeRuns(text, rPr: base, context: element).first ?? XElement(name: WordText.qn(element, "r"))
        element.append(r)
        let run = Run(paragraph: self, element: r)
        if let bold { run.setBold(bold) }
        if let italic { run.setItalic(italic) }
        story.markModified()
        return run
    }
}

public final class Run {
    public let paragraph: Paragraph
    public let element: XElement

    init(paragraph: Paragraph, element: XElement) {
        self.paragraph = paragraph
        self.element = element
    }

    public var text: String { WordText.runText(element) }
    public var isBold: Bool { WordText.toggle(element, "b") }
    public var isItalic: Bool { WordText.toggle(element, "i") }
    public var isUnderlined: Bool {
        guard let u = element.firstChild(NS.w, "rPr")?.firstChild(NS.w, "u") else { return false }
        return u.attribute(WordText.qn(u, "val")) != "none"
    }
    public var color: String? { element.firstChild(NS.w, "rPr")?.firstChild(NS.w, "color").flatMap { $0.attribute(WordText.qn($0, "val")) } }
    /// Cỡ chữ (pt).
    public var fontSize: Double? {
        element.firstChild(NS.w, "rPr")?.firstChild(NS.w, "sz").flatMap { $0.attribute(WordText.qn($0, "val")) }.flatMap(Double.init).map { $0 / 2 }
    }

    public func setBold(_ on: Bool) { WordText.setToggle(element, "b", on); paragraph.story.markModified() }
    public func setItalic(_ on: Bool) { WordText.setToggle(element, "i", on); paragraph.story.markModified() }
    public func setUnderline(_ on: Bool) { WordText.setValueProperty(element, "u", on ? "single" : nil); paragraph.story.markModified() }
    /// Màu chữ dạng hex RRGGBB, nil = tự động.
    public func setColor(_ hex: String?) { WordText.setValueProperty(element, "color", hex); paragraph.story.markModified() }
    public func setFontSize(_ pt: Double) {
        let half = String(Int((pt * 2).rounded()))
        WordText.setValueProperty(element, "sz", half)
        WordText.setValueProperty(element, "szCs", half)
        paragraph.story.markModified()
    }
}

public final class Table {
    public let story: WordStory
    public let element: XElement

    init(story: WordStory, element: XElement) {
        self.story = story
        self.element = element
    }

    public var rows: [[TableCell]] {
        element.children(NS.w, "tr").map { tr in tr.children(NS.w, "tc").map { TableCell(story: story, element: $0) } }
    }

    public func cell(row: Int, column: Int) -> TableCell? {
        let r = rows
        guard r.indices.contains(row), r[row].indices.contains(column) else { return nil }
        return r[row][column]
    }
}

public final class TableCell {
    public let story: WordStory
    public let element: XElement

    init(story: WordStory, element: XElement) {
        self.story = story
        self.element = element
    }

    public var paragraphs: [Paragraph] {
        element.children(NS.w, "p").map { Paragraph(story: story, element: $0) }
    }

    public var text: String { paragraphs.map(\.text).joined(separator: "\n") }

    public var gridSpan: Int {
        element.firstChild(NS.w, "tcPr")?.firstChild(NS.w, "gridSpan").flatMap { $0.attribute(WordText.qn($0, "val")) }.flatMap { Int($0) } ?? 1
    }

    /// "restart" | "continue" | nil
    public var verticalMerge: String? {
        guard let v = element.firstChild(NS.w, "tcPr")?.firstChild(NS.w, "vMerge") else { return nil }
        return v.attribute(WordText.qn(v, "val")) ?? "continue"
    }

    /// Đặt chữ cho ô: đoạn đầu nhận chữ (giữ định dạng), các đoạn sau bị bỏ. Ô luôn còn ít nhất một đoạn.
    public func setText(_ text: String) {
        let ps = element.children(NS.w, "p")
        if let first = ps.first {
            WordText.setParagraphText(first, text)
            for p in ps.dropFirst() { p.removeFromParent() }
        } else {
            let p = XElement(name: WordText.qn(element, "p"))
            element.append(p)
            WordText.setParagraphText(p, text)
        }
        story.markModified()
    }
}
