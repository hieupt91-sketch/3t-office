import Foundation
import OOXMLPackage

/// Quy tắc đọc/ghi văn bản WordprocessingML dùng chung cho đoạn văn ở mọi "story"
/// (thân, header, footer, chú thích, footnote…).
enum WordText {
    /// Phần tử chứa nội dung chạy trong đoạn — đi vào bên trong khi đọc chữ.
    static let transparentContainers: Set<String> = ["hyperlink", "ins", "smartTag", "sdt", "sdtContent", "fldSimple",
                                                     "customXml", "moveTo", "dir", "bdo"]
    /// Bỏ qua khi đọc chữ (nội dung đã xóa / thuộc tính).
    static let skipped: Set<String> = ["del", "moveFrom", "pPr", "rPr", "sdtPr", "sdtEndPr"]
    /// Đánh dấu vị trí trong đoạn, giữ nguyên khi thay chữ.
    static let markers: Set<String> = ["pPr", "bookmarkStart", "bookmarkEnd", "commentRangeStart", "commentRangeEnd",
                                       "permStart", "permEnd", "moveFromRangeStart", "moveFromRangeEnd",
                                       "moveToRangeStart", "moveToRangeEnd"]
    /// Run chứa các phần tử này là "neo" (ảnh, tham chiếu chú thích…) → giữ nguyên khi thay chữ.
    static let anchorRunContent: Set<String> = ["drawing", "pict", "object", "footnoteReference", "endnoteReference",
                                                "commentReference", "annotationRef", "footnoteRef", "endnoteRef",
                                                "separator", "continuationSeparator", "ruby", "ptab"]

    static let rPrOrder = ["rStyle", "rFonts", "b", "bCs", "i", "iCs", "caps", "smallCaps", "strike", "dstrike", "outline",
                           "shadow", "emboss", "imprint", "noProof", "snapToGrid", "vanish", "webHidden", "color", "spacing",
                           "w", "kern", "position", "sz", "szCs", "highlight", "u", "effect", "bdr", "shd", "fitText",
                           "vertAlign", "rtl", "cs", "em", "lang", "eastAsianLayout", "specVanish", "oMath"]
    static let pPrOrder = ["pStyle", "keepNext", "keepLines", "pageBreakBefore", "framePr", "widowControl", "numPr",
                           "suppressLineNumbers", "pBdr", "shd", "tabs", "suppressAutoHyphens", "kinsoku", "wordWrap",
                           "overflowPunct", "topLinePunct", "autoSpaceDE", "autoSpaceDN", "bidi", "adjustRightInd",
                           "snapToGrid", "spacing", "ind", "contextualSpacing", "mirrorIndents", "suppressOverlap", "jc",
                           "textDirection", "textAlignment", "textboxTightWrap", "outlineLvl", "divId", "cnfStyle",
                           "rPr", "sectPr", "pPrChange"]

    static func isW(_ e: XElement) -> Bool { NS.w.matches(e.namespaceURI) }

    /// Chữ của một run (bỏ qua ảnh, instrText, delText…).
    static func runText(_ r: XElement) -> String {
        var s = ""
        for c in r.elements where isW(c) {
            switch c.localName {
            case "t": s += c.textContent
            case "tab": s += "\t"
            case "br", "cr": s += "\n"
            case "noBreakHyphen": s += "\u{2011}"
            default: break
            }
        }
        return s
    }

    /// Chữ hiển thị của một đoạn (như Word: gồm chữ chèn theo dõi và kết quả trường, không gồm chữ đã xóa).
    static func paragraphText(_ p: XElement) -> String {
        var s = ""
        func visit(_ e: XElement) {
            for c in e.elements {
                guard isW(c) else { continue }
                let n = c.localName
                if n == "r" {
                    s += runText(c)
                } else if transparentContainers.contains(n) {
                    visit(c)
                }
            }
        }
        visit(p)
        return s
    }

    /// Các run có chữ theo thứ tự hiển thị.
    static func textRuns(_ p: XElement) -> [XElement] {
        var out: [XElement] = []
        func visit(_ e: XElement) {
            for c in e.elements where isW(c) {
                if c.localName == "r" {
                    out.append(c)
                } else if transparentContainers.contains(c.localName) {
                    visit(c)
                }
            }
        }
        visit(p)
        return out
    }

    static func isAnchorRun(_ r: XElement) -> Bool {
        r.elements.contains { c in
            (isW(c) && anchorRunContent.contains(c.localName)) || c.localName == "AlternateContent"
        }
    }

    /// Thay toàn bộ chữ của đoạn, giữ: thuộc tính đoạn, bookmark/phạm vi chú thích, và run "neo"
    /// (ảnh, tham chiếu footnote/comment). Định dạng chữ lấy theo run chữ đầu tiên.
    static func setParagraphText(_ p: XElement, _ text: String) {
        let firstTextRun = textRuns(p).first { !runText($0).isEmpty && !isAnchorRun($0) }
        let rPr = firstTextRun?.firstChild(NS.w, "rPr")?.deepCopy()
        var anchors: [XElement] = []
        func collectAnchors(_ e: XElement) {
            for c in e.elements where isW(c) {
                if c.localName == "r", isAnchorRun(c) {
                    anchors.append(c)
                } else if transparentContainers.contains(c.localName) {
                    collectAnchors(c)
                }
            }
        }
        var insertAt: Int?
        var i = 0
        while i < p.children.count {
            guard let e = p.children[i].element else {
                // Văn bản/khoảng trắng trực tiếp trong <w:p> không có nghĩa: bỏ.
                if case .text = p.children[i] { p.removeChild(at: i); continue }
                i += 1
                continue
            }
            if !isW(e) && e.localName != "AlternateContent" {
                i += 1 // phần mở rộng lạ: giữ
                continue
            }
            if markers.contains(e.localName) {
                i += 1
                continue
            }
            if e.localName == "r" && isAnchorRun(e) {
                i += 1
                continue
            }
            if transparentContainers.contains(e.localName) { collectAnchors(e) }
            if insertAt == nil { insertAt = i }
            p.removeChild(at: i)
        }
        // Run neo nằm trong container đã xóa: đưa ra cấp đoạn.
        for a in anchors {
            if a.parent == nil { p.append(a) }
        }
        let runs = makeRuns(text, rPr: rPr, context: p)
        var at = insertAt ?? (p.children.firstIndex { $0.element?.localName == "pPr" }.map { $0 + 1 } ?? 0)
        for r in runs {
            p.insert(r, at: at)
            at += 1
        }
    }

    static func qn(_ ctx: XElement, _ local: String) -> String {
        ctx.qualifiedName(local, in: NS.w).name
    }

    /// Tạo run chứa `text`, tách \t → <w:tab/>, \n → <w:br/>.
    static func makeRuns(_ text: String, rPr: XElement?, context: XElement) -> [XElement] {
        if text.isEmpty { return [] }
        let r = XElement(name: qn(context, "r"))
        context.append(r) // gắn tạm để tên con lấy đúng tiền tố
        if let rPr { r.append(rPr) }
        var buf = ""
        func flush() {
            guard !buf.isEmpty else { return }
            let t = XElement(name: qn(context, "t"))
            if buf.first == " " || buf.last == " " || buf.contains("  ") || buf.first?.isWhitespace == true || buf.last?.isWhitespace == true {
                t.setAttribute("xml:space", "preserve")
            }
            t.setText(buf)
            r.append(t)
            buf = ""
        }
        for ch in text {
            if ch == "\t" {
                flush()
                r.append(XElement(name: qn(context, "tab")))
            } else if ch == "\n" || ch == "\r\n" || ch == "\r" {
                flush()
                r.append(XElement(name: qn(context, "br")))
            } else {
                buf.append(ch)
            }
        }
        flush()
        r.removeFromParent()
        return [r]
    }

    /// Thay chữ trong đoạn, kể cả khi từ cần tìm bị chia qua nhiều run; định dạng theo run chứa ký tự đầu.
    /// Không khớp xuyên qua tab/xuống dòng. Trả về số lần thay.
    static func replace(in p: XElement, _ find: String, with replacement: String) -> Int {
        let needle = Array(find)
        guard !needle.isEmpty else { return 0 }
        // Các đoạn chữ: (phần tử w:t hoặc nil = rào chắn, chữ).
        var segs: [(t: XElement?, chars: [Character])] = []
        for r in textRuns(p) {
            for c in r.elements where isW(c) {
                switch c.localName {
                case "t": segs.append((c, Array(c.textContent)))
                case "tab", "br", "cr": segs.append((nil, ["\u{0}"]))
                default: break
                }
            }
            segs.append((nil, []))
        }
        var flat: [Character] = []
        var owner: [(seg: Int, offset: Int)] = []
        for (si, s) in segs.enumerated() {
            for (k, ch) in s.chars.enumerated() {
                flat.append(ch)
                owner.append((si, k))
            }
        }
        var matches: [Int] = []
        var i = 0
        while i + needle.count <= flat.count {
            if flat[i] == needle[0] && Array(flat[i..<(i + needle.count)]) == needle {
                matches.append(i)
                i += needle.count
            } else {
                i += 1
            }
        }
        guard !matches.isEmpty else { return 0 }
        var segChars = segs.map(\.chars)
        for m in matches.reversed() {
            let start = owner[m]
            let end = owner[m + needle.count - 1]
            if start.seg == end.seg {
                segChars[start.seg].replaceSubrange(start.offset...end.offset, with: Array(replacement))
            } else {
                segChars[start.seg].replaceSubrange(start.offset..., with: Array(replacement))
                for s in (start.seg + 1)..<end.seg { segChars[s] = [] }
                segChars[end.seg].removeSubrange(...end.offset)
            }
        }
        for (si, s) in segs.enumerated() {
            guard let t = s.t, segChars[si] != s.chars else { continue }
            let text = String(segChars[si])
            if text.isEmpty {
                let run = t.parent
                t.removeFromParent()
                if let run, run.elements.allSatisfy({ $0.localName == "rPr" }) { run.removeFromParent() }
            } else {
                t.setText(text)
                if text.first?.isWhitespace == true || text.last?.isWhitespace == true || text.contains("  ") {
                    t.setAttribute("xml:space", "preserve")
                }
            }
        }
        return matches.count
    }

    /// Bật/tắt thuộc tính kiểu bật/tắt (b, i, strike…) trong rPr của run.
    static func setToggle(_ run: XElement, _ local: String, _ on: Bool) {
        let rPr = ensureRPr(run)
        for e in rPr.children(NS.w, local) { e.removeFromParent() }
        let e = XElement(name: qn(rPr, local))
        if !on { e.setAttribute(qn(rPr, "val"), "0") }
        rPr.insertChild(e, schemaOrder: rPrOrder)
    }

    static func setValueProperty(_ run: XElement, _ local: String, _ value: String?) {
        let rPr = ensureRPr(run)
        for e in rPr.children(NS.w, local) { e.removeFromParent() }
        guard let value else { return }
        let e = XElement(name: qn(rPr, local), attributes: [XAttribute(name: qn(rPr, "val"), value: value)])
        rPr.insertChild(e, schemaOrder: rPrOrder)
    }

    static func toggle(_ run: XElement, _ local: String) -> Bool {
        guard let e = run.firstChild(NS.w, "rPr")?.firstChild(NS.w, local) else { return false }
        let v = e.attribute(qn(e, "val")) ?? e.attribute("w:val")
        return v == nil || !["0", "false", "off", "none"].contains(v!)
    }

    static func ensureRPr(_ run: XElement) -> XElement {
        if let r = run.firstChild(NS.w, "rPr") { return r }
        let r = XElement(name: qn(run, "rPr"))
        run.insert(r, at: 0)
        return r
    }

    static func ensurePPr(_ p: XElement) -> XElement {
        if let r = p.firstChild(NS.w, "pPr") { return r }
        let r = XElement(name: qn(p, "pPr"))
        p.insert(r, at: 0)
        return r
    }
}
