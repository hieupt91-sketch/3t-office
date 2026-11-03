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
            var formatChanges: [XElement] = []
            story.xml.root.forEachDescendant { e in
                guard WordText.isW(e) else { return }
                switch e.localName {
                case "ins", "moveTo":
                    if e.parent?.localName == "rPr" { marks.append(e) } else { ins.append(e) }
                case "del", "moveFrom":
                    if e.parent?.localName == "rPr" { marks.append(e) } else { del.append(e) }
                case "rPrChange", "pPrChange":
                    formatChanges.append(e)
                default: break
                }
            }
            guard !(ins.isEmpty && del.isEmpty && marks.isEmpty && formatChanges.isEmpty) else { continue }
            count += ins.count + del.count + formatChanges.count
            for e in accept ? ins : del { unwrap(e, restoreDeleted: !accept) }
            for e in accept ? del : ins { e.removeFromParent() }
            // Dấu đoạn được chèn/xóa (w:rPr/w:ins|del trong w:pPr): chấp nhận = bỏ dấu.
            for m in marks { m.removeFromParent() }
            // Thay đổi định dạng (rPrChange/pPrChange): chấp nhận = bỏ phần tử chụp
            // (định dạng mới giữ nguyên); từ chối = khôi phục bản chụp cũ vào rPr/pPr.
            for change in formatChanges {
                guard let props = change.parent else { change.removeFromParent(); continue }
                if accept { change.removeFromParent(); continue }
                let snapshotName = change.localName == "rPrChange" ? "rPr" : "pPr"
                guard let snapshot = change.firstChild(NS.w, snapshotName) else {
                    change.removeFromParent(); continue
                }
                let restored = snapshot.elements.map { $0.deepCopy() }
                for node in props.children { node.element?.removeFromParent() }
                change.removeFromParent()
                for el in restored { props.append(el) }
            }
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

extension Run {
    /// Ghi dấu thay đổi định dạng run: chụp rPr HIỆN TẠI vào `w:rPrChange`
    /// (id/author/date) — gọi TRƯỚC khi áp thay đổi định dạng thật (setBold,
    /// setColor, setGlow…). Đã có rPrChange thì giữ bản chụp đầu tiên (như Word
    /// gộp các thay đổi liên tiếp cùng phiên). Chấp nhận = giữ định dạng mới;
    /// từ chối = khôi phục bản chụp (xem acceptAllRevisions/rejectAllRevisions).
    public func markFormattingChange(revision: Revision) {
        let rPr = WordText.ensureRPr(element)
        guard rPr.firstChild(NS.w, "rPrChange") == nil else { return }
        let q = { (l: String) in WordText.qn(self.element, l) }
        let snapshot = XElement(name: q("rPr"))
        for child in rPr.elements { snapshot.append(child.deepCopy()) }
        let change = XElement(name: q("rPrChange"), attributes: [
            XAttribute(name: q("id"), value: String(paragraph.story.document.nextRevisionId())),
            XAttribute(name: q("author"), value: revision.author),
            XAttribute(name: q("date"), value: revision.dateString)])
        change.append(snapshot)
        rPr.append(change)
        paragraph.story.markModified()
    }
}

extension Paragraph {
    /// Ghi dấu thay đổi định dạng đoạn: chụp pPr HIỆN TẠI vào `w:pPrChange` —
    /// gọi TRƯỚC khi đổi giãn đoạn/căn lề/kiểu đoạn. Quy tắc bản chụp đầu tiên
    /// và chấp nhận/từ chối như `Run.markFormattingChange`.
    public func markFormattingChange(revision: Revision) {
        let pPr = WordText.ensurePPr(element)
        guard pPr.firstChild(NS.w, "pPrChange") == nil else { return }
        let q = { (l: String) in WordText.qn(self.element, l) }
        let snapshot = XElement(name: q("pPr"))
        for child in pPr.elements { snapshot.append(child.deepCopy()) }
        let change = XElement(name: q("pPrChange"), attributes: [
            XAttribute(name: q("id"), value: String(story.document.nextRevisionId())),
            XAttribute(name: q("author"), value: revision.author),
            XAttribute(name: q("date"), value: revision.dateString)])
        change.append(snapshot)
        pPr.append(change)
        story.markModified()
    }
}
