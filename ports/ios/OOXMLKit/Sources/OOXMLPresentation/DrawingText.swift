import Foundation
import OOXMLPackage

/// Văn bản DrawingML (a:txBody) dùng cho hình, bảng và ghi chú.
/// Ngắt dòng mềm <a:br/> được biểu diễn bằng "\u{0B}" (giống PowerPoint), đoạn cách nhau "\n".
enum DrawingText {
    static let lineBreak: Character = "\u{0B}"

    static func paragraphText(_ p: XElement) -> String {
        var s = ""
        for c in p.elements where NS.a.matches(c.namespaceURI) {
            switch c.localName {
            case "r", "fld": s += c.firstChild(NS.a, "t")?.textContent ?? ""
            case "br": s.append(lineBreak)
            default: break
            }
        }
        return s
    }

    static func paragraphs(_ txBody: XElement) -> [String] {
        txBody.children(NS.a, "p").map(paragraphText)
    }

    /// Thay toàn bộ chữ: mỗi phần tử của `lines` thành một đoạn. Giữ bodyPr, lstStyle; định dạng đoạn/run
    /// lấy theo đoạn mẫu (đoạn đầu, hoặc đoạn cùng vị trí nếu có — giữ được cấp thụt lề của danh sách).
    static func setParagraphs(_ txBody: XElement, _ lines: [String]) {
        let old = txBody.children(NS.a, "p")
        let fallbackRPr = old.lazy.compactMap { $0.firstChild(NS.a, "r")?.firstChild(NS.a, "rPr") }.first
        let insertIndex = old.first?.indexInParent ?? txBody.children.count
        var templates: [(pPr: XElement?, rPr: XElement?, end: XElement?)] = old.map { p in
            (p.firstChild(NS.a, "pPr"), p.firstChild(NS.a, "r")?.firstChild(NS.a, "rPr") ?? fallbackRPr, p.firstChild(NS.a, "endParaRPr"))
        }
        if templates.isEmpty { templates = [(nil, nil, nil)] }
        for p in old { p.removeFromParent() }
        let q = { (l: String) in txBody.qualifiedName(l, in: NS.a).name }
        var at = min(insertIndex, txBody.children.count)
        for (i, line) in (lines.isEmpty ? [""] : lines).enumerated() {
            let tpl = templates[min(i, templates.count - 1)]
            let p = XElement(name: q("p"))
            if let pPr = tpl.pPr { p.append(pPr.deepCopy()) }
            var buf = ""
            func flush() {
                guard !buf.isEmpty else { return }
                let r = XElement(name: q("r"))
                if let rPr = tpl.rPr { r.append(rPr.deepCopy()) }
                let t = XElement(name: q("t"))
                t.setText(buf)
                r.append(t)
                p.append(r)
                buf = ""
            }
            for ch in line {
                if ch == lineBreak {
                    flush()
                    let br = XElement(name: q("br"))
                    if let rPr = tpl.rPr { br.append(rPr.deepCopy()) }
                    p.append(br)
                } else {
                    buf.append(ch)
                }
            }
            flush()
            if let end = tpl.end { p.append(end.deepCopy()) }
            txBody.insert(p, at: at)
            at += 1
        }
    }

    /// Thay chữ trong từng đoạn, kể cả khi bị chia qua nhiều run. Trả về số lần thay.
    static func replace(in txBody: XElement, _ find: String, with replacement: String) -> Int {
        let needle = Array(find)
        guard !needle.isEmpty else { return 0 }
        var total = 0
        for p in txBody.children(NS.a, "p") {
            var segs: [(t: XElement?, chars: [Character])] = []
            for c in p.elements where NS.a.matches(c.namespaceURI) {
                if c.localName == "r" || c.localName == "fld", let t = c.firstChild(NS.a, "t") {
                    segs.append((t, Array(t.textContent)))
                } else if c.localName == "br" {
                    segs.append((nil, ["\u{0}"]))
                }
            }
            var flat: [Character] = []
            var owner: [(Int, Int)] = []
            for (si, s) in segs.enumerated() {
                for (k, ch) in s.chars.enumerated() { flat.append(ch); owner.append((si, k)) }
            }
            var matches: [Int] = []
            var i = 0
            while i + needle.count <= flat.count {
                if Array(flat[i..<(i + needle.count)]) == needle { matches.append(i); i += needle.count } else { i += 1 }
            }
            guard !matches.isEmpty else { continue }
            var chars = segs.map(\.chars)
            for m in matches.reversed() {
                let (s0, o0) = owner[m]
                let (s1, o1) = owner[m + needle.count - 1]
                if s0 == s1 {
                    chars[s0].replaceSubrange(o0...o1, with: Array(replacement))
                } else {
                    chars[s0].replaceSubrange(o0..., with: Array(replacement))
                    for s in (s0 + 1)..<s1 { chars[s] = [] }
                    chars[s1].removeSubrange(...o1)
                }
            }
            for (si, s) in segs.enumerated() where chars[si] != s.chars {
                guard let t = s.t else { continue }
                if chars[si].isEmpty, let r = t.parent, r.localName == "r" {
                    r.removeFromParent()
                } else {
                    t.setText(String(chars[si]))
                }
            }
            total += matches.count
        }
        return total
    }
}
