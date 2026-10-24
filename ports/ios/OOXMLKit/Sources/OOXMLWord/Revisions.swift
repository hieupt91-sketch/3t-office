import Foundation
import OOXMLPackage

/// Thông tin người sửa cho thay đổi được theo dõi (Review ▸ Track Changes).
public struct Revision: Sendable {
    public var author: String
    public var date: Date

    public init(author: String, date: Date = Date()) {
        self.author = author
        self.date = date
    }

    var dateString: String {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f.string(from: date)
    }
}

extension WordDocument {
    /// Tài liệu đang bật "Theo dõi thay đổi" (w:trackRevisions trong settings.xml).
    public var isTrackingRevisions: Bool {
        guard let p = try? package.relatedPart(from: mainPart, .settings), let doc = try? package.xml(p) else { return false }
        guard let e = doc.root.firstChild(NS.w, "trackRevisions") else { return false }
        let v = e.attribute(WordText.qn(e, "val"))
        return v == nil || !["0", "false", "off"].contains(v!)
    }

    /// Id duy nhất cho w:ins/w:del mới (lớn hơn mọi w:id hiện có trong mọi story).
    func nextRevisionId() -> Int {
        var maxId = 0
        for s in allStories {
            s.xml.root.forEachDescendant { e in
                if let v = e.attribute(WordText.qn(e, "id")).flatMap({ Int($0) }) { maxId = max(maxId, v) }
            }
        }
        revisionCounter = max(revisionCounter, maxId) + 1
        return revisionCounter
    }

    /// Chấp nhận mọi thay đổi được theo dõi trong mọi story: giữ chữ chèn, bỏ chữ xóa.
    @discardableResult
    public func acceptAllRevisions() -> Int {
        resolveRevisions(accept: true)
    }

    /// Từ chối mọi thay đổi: bỏ chữ chèn, khôi phục chữ xóa.
    @discardableResult
    public func rejectAllRevisions() -> Int {
        resolveRevisions(accept: false)
    }

    private func resolveRevisions(accept: Bool) -> Int {
        var count = 0
        for story in allStories {
            var ins: [XElement] = []
            var del: [XElement] = []
            var marks: [XElement] = []
            story.xml.root.forEachDescendant { e in
                guard WordText.isW(e) else { return }
                switch e.localName {
                case "ins", "moveTo":
                    if e.parent?.localName == "rPr" { marks.append(e) } else { ins.append(e) }
                case "del", "moveFrom":
                    if e.parent?.localName == "rPr" { marks.append(e) } else { del.append(e) }
                default: break
                }
            }
            guard !(ins.isEmpty && del.isEmpty && marks.isEmpty) else { continue }
            count += ins.count + del.count
            for e in accept ? ins : del { unwrap(e, restoreDeleted: !accept) }
            for e in accept ? del : ins { e.removeFromParent() }
            // Dấu đoạn được chèn/xóa (w:rPr/w:ins|del trong w:pPr): chấp nhận = bỏ dấu.
            for m in marks { m.removeFromParent() }
            story.markModified()
        }
        return count
    }

    private func unwrap(_ e: XElement, restoreDeleted: Bool) {
        guard let parent = e.parent, var i = e.indexInParent else { return }
        // Đổi delText → t khi phần tử còn gắn trong cây (cần ngữ cảnh namespace để nhận ra w:).
        if restoreDeleted { WordDocument.restoreDeletedText(e) }
        let kids = e.children
        e.removeFromParent()
        for k in kids {
            parent.insertNode(k, at: i)
            i += 1
        }
    }

    static func restoreDeletedText(_ e: XElement) {
        if WordText.isW(e) {
            if e.localName == "delText" { e.name = WordText.qn(e, "t") }
            if e.localName == "delInstrText" { e.name = WordText.qn(e, "instrText") }
        }
        for c in e.elements { restoreDeletedText(c) }
    }
}

extension Paragraph {
    /// Thay chữ của đoạn dưới dạng thay đổi được theo dõi: chữ cũ vào w:del, chữ mới vào w:ins
    /// (tác giả + thời điểm), Word hiển thị gạch xóa/gạch chân và cho Chấp nhận/Từ chối.
    public func setText(_ text: String, revision: Revision) {
        let doc = story.document
        let q = { (l: String) in WordText.qn(self.element, l) }
        let firstRPr = WordText.textRuns(element).first { !WordText.runText($0).isEmpty && !WordText.isAnchorRun($0) }?
            .firstChild(NS.w, "rPr")?.deepCopy()
        let delAttrs = { [XAttribute(name: q("id"), value: String(doc.nextRevisionId())),
                          XAttribute(name: q("author"), value: revision.author),
                          XAttribute(name: q("date"), value: revision.dateString)] }
        // Bọc mọi run chữ trực tiếp của đoạn (không gồm run neo, thay đổi đã có) vào w:del.
        var i = 0
        var firstIndex: Int?
        var lastDel: XElement?
        while i < element.children.count {
            guard let e = element.children[i].element, WordText.isW(e), e.localName == "r",
                  !WordText.isAnchorRun(e), !WordText.runText(e).isEmpty else {
                lastDel = nil
                i += 1
                continue
            }
            if firstIndex == nil { firstIndex = i }
            for t in e.elements where WordText.isW(t) && t.localName == "t" { t.name = q("delText") }
            for t in e.elements where WordText.isW(t) && t.localName == "instrText" { t.name = q("delInstrText") }
            if let d = lastDel {
                e.removeFromParent()
                d.append(e)
            } else {
                let d = XElement(name: q("del"), attributes: delAttrs())
                element.insert(d, at: i)
                e.removeFromParent()
                d.append(e)
                lastDel = d
                i += 1
            }
        }
        if !text.isEmpty {
            let ins = XElement(name: q("ins"), attributes: delAttrs())
            // Chữ mới đứng ngay sau phần bị xóa (như Word), hoặc sau w:pPr nếu đoạn chưa có chữ.
            let at = lastDelIndex().map { $0 + 1 } ?? firstIndex ?? insertionIndexAfterPPr()
            element.insert(ins, at: at)
            for r in WordText.makeRuns(text, rPr: firstRPr, context: element) { ins.append(r) }
        }
        story.markModified()
    }

    private func lastDelIndex() -> Int? {
        element.children.lastIndex { $0.element.map { WordText.isW($0) && $0.localName == "del" } ?? false }
    }

    private func insertionIndexAfterPPr() -> Int {
        element.children.firstIndex { $0.element?.localName == "pPr" }.map { $0 + 1 } ?? 0
    }
}

extension WordDocument {
    /// Thêm đoạn cuối văn bản dưới dạng chèn được theo dõi.
    @discardableResult
    public func appendParagraph(_ text: String, style: String? = nil, revision: Revision) -> Paragraph {
        let p = appendParagraph("", style: style)
        let q = { (l: String) in WordText.qn(p.element, l) }
        let attrs = { [XAttribute(name: q("id"), value: String(self.nextRevisionId())),
                       XAttribute(name: q("author"), value: revision.author),
                       XAttribute(name: q("date"), value: revision.dateString)] }
        // Dấu đoạn mới cũng là "chèn" (w:pPr/w:rPr/w:ins) để Từ chối xóa được cả đoạn.
        let pPr = WordText.ensurePPr(p.element)
        let rPr = XElement(name: q("rPr"))
        pPr.insertChild(rPr, schemaOrder: WordText.pPrOrder)
        rPr.append(XElement(name: q("ins"), attributes: attrs()))
        let ins = XElement(name: q("ins"), attributes: attrs())
        p.element.append(ins)
        for r in WordText.makeRuns(text, rPr: nil, context: p.element) { ins.append(r) }
        p.story.markModified()
        return p
    }
}
