import Foundation
import OOXMLPackage

public enum WordError: Error, Equatable, CustomStringConvertible {
    case notAWordDocument
    case paragraphNotInDocument
    case unsupportedImageFormat
    case invalidSpacing(String)
    case invalidNumbering(String)
    case invalidField(String)
    case invalidSection(String)
    case invalidTextEffect(String)

    public var description: String {
        switch self {
        case .notAWordDocument: return "Tệp không phải văn bản DOCX"
        case .paragraphNotInDocument: return "Đoạn văn không thuộc tài liệu này"
        case .unsupportedImageFormat: return "Chỉ hỗ trợ chèn ảnh PNG, JPEG, GIF"
        case .invalidSpacing(let message): return message
        case .invalidNumbering(let message): return message
        case .invalidField(let message): return message
        case .invalidSection(let message): return message
        case .invalidTextEffect(let message): return message
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

    /// Giãn đoạn đọc từ `w:spacing`: before/after tính bằng 1/20 point,
    /// line tính bằng 1/240 dòng (240 = giãn đơn), lineRule: auto|exact|atLeast.
    /// Trả nil khi đoạn không có phần tử spacing.
    public var spacing: (before: Int?, after: Int?, line: Int?, lineRule: String?)? {
        guard let spacing = element.firstChild(NS.w, "pPr")?.firstChild(NS.w, "spacing") else { return nil }
        func intAttr(_ name: String) -> Int? {
            guard let v = spacing.attribute(WordText.qn(element, name)) else { return nil }
            return Int(v)
        }
        return (before: intAttr("before"), after: intAttr("after"),
                line: intAttr("line"), lineRule: spacing.attribute(WordText.qn(element, "lineRule")))
    }

    /// Đặt giãn đoạn (ghi vào `w:spacing`, giữ đúng thứ tự schema của pPr).
    /// Truyền nil cho tất cả để xóa spacing. before/after phải >= 0, line phải > 0,
    /// lineRule (nếu có) phải là auto, exact hoặc atLeast.
    public func setSpacing(before: Int? = nil, after: Int? = nil, line: Int? = nil, lineRule: String? = nil) throws {
        if let before, before < 0 { throw WordError.invalidSpacing("giãn trước đoạn phải >= 0") }
        if let after, after < 0 { throw WordError.invalidSpacing("giãn sau đoạn phải >= 0") }
        if let line, line <= 0 { throw WordError.invalidSpacing("giãn dòng phải > 0") }
        if let lineRule, !["auto", "exact", "atLeast"].contains(lineRule) {
            throw WordError.invalidSpacing("lineRule phải là auto, exact hoặc atLeast")
        }
        let pPr = WordText.ensurePPr(element)
        for e in pPr.children(NS.w, "spacing") { e.removeFromParent() }
        if before != nil || after != nil || line != nil || lineRule != nil {
            var attributes: [XAttribute] = []
            if let before { attributes.append(XAttribute(name: WordText.qn(pPr, "before"), value: String(before))) }
            if let after { attributes.append(XAttribute(name: WordText.qn(pPr, "after"), value: String(after))) }
            if let line { attributes.append(XAttribute(name: WordText.qn(pPr, "line"), value: String(line))) }
            if let lineRule { attributes.append(XAttribute(name: WordText.qn(pPr, "lineRule"), value: lineRule)) }
            pPr.insertChild(XElement(name: WordText.qn(pPr, "spacing"), attributes: attributes),
                            schemaOrder: WordText.pPrOrder)
        }
        if pPr.elements.isEmpty && pPr.attributes.isEmpty { pPr.removeFromParent() }
        story.markModified()
    }

    /// Định dạng danh sách của đoạn, đọc từ `w:numPr` trong pPr (nil = không đánh số).
    public var numbering: (numId: Int, level: Int)? {
        guard let numPr = element.firstChild(NS.w, "pPr")?.firstChild(NS.w, "numPr"),
              let numIdText = numPr.firstChild(NS.w, "numId")?.attribute(WordText.qn(numPr, "val")),
              let numId = Int(numIdText) else { return nil }
        let level = numPr.firstChild(NS.w, "ilvl")?.attribute(WordText.qn(numPr, "val")).flatMap(Int.init) ?? 0
        return (numId: numId, level: level)
    }

    /// Gắn đoạn vào một danh sách đánh số (tìm định nghĩa num có sẵn cùng format/cấp,
    /// nếu không có thì tạo abstractNum + num mới trong `word/numbering.xml`).
    /// level phải trong 0...8; format không hợp lệ hoặc level ngoài khoảng bị từ chối.
    /// Khi tạo mới với level > 0, abstractNum là danh sách đa cấp thật
    /// (`multiLevelType=multilevel`) gồm đủ `w:lvl` cho 0...level: cấp đích dùng
    /// đúng format được yêu cầu, các cấp cha dùng decimal/lowerLetter/lowerRoman
    /// và `lvlText` tích lũy `%1.`, `%1.%2.`, ... (bullet: mọi cấp là bullet).
    public func setNumbering(_ format: NumberingFormat, level: Int = 0) throws {
        guard (0...8).contains(level) else { throw WordError.invalidNumbering("cấp danh sách phải trong 0...8") }
        let numId = try story.document.numberingId(for: format, level: level)
        let pPr = WordText.ensurePPr(element)
        for e in pPr.children(NS.w, "numPr") { e.removeFromParent() }
        let numPr = XElement(name: WordText.qn(pPr, "numPr"))
        numPr.append(XElement(name: WordText.qn(pPr, "ilvl"),
                              attributes: [XAttribute(name: WordText.qn(pPr, "val"), value: String(level))]))
        numPr.append(XElement(name: WordText.qn(pPr, "numId"),
                              attributes: [XAttribute(name: WordText.qn(pPr, "val"), value: String(numId))]))
        pPr.insertChild(numPr, schemaOrder: WordText.pPrOrder)
        story.markModified()
    }

    /// Bỏ đánh số của đoạn (giữ lại chữ và các định dạng khác).
    public func removeNumbering() {
        guard let pPr = element.firstChild(NS.w, "pPr") else { return }
        for e in pPr.children(NS.w, "numPr") { e.removeFromParent() }
        if pPr.elements.isEmpty && pPr.attributes.isEmpty { pPr.removeFromParent() }
        story.markModified()
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

    /// Field nội bộ được phép chèn qua API công khai: không field nào trong
    /// danh sách này lấy nội dung/nguồn ngoài. Mọi field ngoài allowlist bị từ
    /// chối theo mặc định, kể cả khi đứng sau một prefix hợp lệ.
    private static let allowedFieldNames: Set<String> = [
        "PAGE", "NUMPAGES", "SECTION", "SECTIONPAGES", "DATE", "TIME",
        "AUTHOR", "TITLE", "SUBJECT", "FILENAME",
    ]

    /// Field có thể truy cập nội dung/nguồn ngoài hoặc kích hoạt liên kết động;
    /// luôn bị chặn ở mọi vị trí không nằm trong ngoặc kép.
    private static let blockedFieldNames: Set<String> = [
        "DDE", "DDEAUTO", "INCLUDETEXT", "INCLUDEPICTURE", "LINK", "DATABASE",
    ]

    /// Parse cú pháp field ở mức token (không dò substring): token đầu tiên
    /// phải là tên field toàn chữ cái thuộc allowlist; các token sau có thể là
    /// switch (`\x`, có thể kèm đối số) hoặc đối số, nhưng không token nào
    /// ngoài ngoặc kép được là field bị cấm. Lỗi được trả trước khi cây XML
    /// bị sửa; thông điệp chỉ chứa tên field bị từ chối, không chứa đối số.
    private static func validateFieldInstruction(_ code: String) throws {
        struct Token { let text: String; let quoted: Bool }
        var tokens: [Token] = []
        var current = ""
        var tokenQuoted = false
        var inQuotes = false
        var hasToken = false
        func flush() {
            if hasToken {
                tokens.append(Token(text: current, quoted: tokenQuoted))
                current = ""; tokenQuoted = false; hasToken = false
            }
        }
        for ch in code {
            if ch == "\"" {
                if !hasToken { tokenQuoted = true; hasToken = true }
                inQuotes.toggle()
                current.append(ch)
                continue
            }
            if !inQuotes && ch.isWhitespace { flush(); continue }
            hasToken = true
            current.append(ch)
        }
        flush()
        guard let first = tokens.first, !first.quoted,
              first.text.allSatisfy({ $0.isLetter }) else {
            throw WordError.invalidField("lệnh field không hợp lệ")
        }
        let keyword = first.text.uppercased()
        if blockedFieldNames.contains(keyword) {
            throw WordError.invalidField("field bị cấm: \(keyword)")
        }
        guard allowedFieldNames.contains(keyword) else {
            throw WordError.invalidField("field không được hỗ trợ: \(keyword)")
        }
        for token in tokens.dropFirst() where !token.quoted {
            var candidates = [token.text]
            if token.text.hasPrefix("\\") {
                candidates.append(String(token.text.dropFirst()))
                candidates.append(String(token.text.dropFirst(2)))
            }
            if let bad = candidates.first(where: { blockedFieldNames.contains($0.uppercased()) }) {
                throw WordError.invalidField("field bị cấm: \(bad.uppercased())")
            }
        }
    }

    /// Chèn một field phức hợp ở cuối đoạn: begin → instrText → separate →
    /// kết quả (nếu có) → end. Chỉ field nội bộ trong allowlist mới được chèn
    /// (ví dụ `PAGE`, `NUMPAGES`, `DATE` kèm switch/đối số an toàn); field có
    /// thể lấy nội dung ngoài như `DDE`, `INCLUDETEXT`, `LINK` bị từ chối.
    /// Lệnh field được lưu dạng ` PAGE `; chữ kết quả đọc được như chữ thường
    /// của đoạn (instrText bị bỏ qua khi đọc), Word sẽ tự cập nhật lại khi mở.
    /// Lệnh rỗng hoặc không nhận diện bị từ chối trước khi tài liệu bị sửa.
    @discardableResult
    public func appendField(instruction: String, result: String? = nil) throws -> [Run] {
        let code = instruction.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !code.isEmpty else { throw WordError.invalidField("lệnh field không được rỗng") }
        try Self.validateFieldInstruction(code)
        func fieldRun(_ type: String) -> XElement {
            let r = XElement(name: WordText.qn(element, "r"))
            r.append(XElement(name: WordText.qn(element, "fldChar"),
                              attributes: [XAttribute(name: WordText.qn(element, "fldCharType"), value: type)]))
            return r
        }
        var runs: [XElement] = [fieldRun("begin")]
        let instr = XElement(name: WordText.qn(element, "r"))
        let instrText = XElement(name: WordText.qn(element, "instrText"))
        instrText.setAttribute("xml:space", "preserve")
        instrText.setText(" \(code) ")
        instr.append(instrText)
        runs.append(instr)
        runs.append(fieldRun("separate"))
        if let result {
            runs.append(contentsOf: WordText.makeRuns(result, rPr: nil, context: element))
        }
        runs.append(fieldRun("end"))
        for r in runs { element.append(r) }
        story.markModified()
        return runs.map { Run(paragraph: self, element: $0) }
    }

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

/// Hiệu ứng phát sáng w14 (glow): màu + độ mờ + bán kính.
public struct GlowEffect: Equatable, Sendable {
    public var colorHex: String
    public var alphaPercent: Double
    public var radiusPt: Double
    public init(colorHex: String, alphaPercent: Double, radiusPt: Double) {
        self.colorHex = colorHex; self.alphaPercent = alphaPercent; self.radiusPt = radiusPt
    }
}

/// Hiệu ứng phản chiếu w14 (reflection). Góc hướng 90 = phản chiếu thẳng xuống dưới.
/// `.standard` khớp các giá trị Word ghi cho preset phản chiếu phổ thông.
public struct ReflectionEffect: Equatable, Sendable {
    public var blurPt: Double
    public var startAlphaPercent: Double
    public var startPositionPercent: Double
    public var endAlphaPercent: Double
    public var endPositionPercent: Double
    public var distancePt: Double
    public var directionDegrees: Double
    public init(blurPt: Double, startAlphaPercent: Double, startPositionPercent: Double,
                endAlphaPercent: Double, endPositionPercent: Double, distancePt: Double, directionDegrees: Double) {
        self.blurPt = blurPt; self.startAlphaPercent = startAlphaPercent
        self.startPositionPercent = startPositionPercent; self.endAlphaPercent = endAlphaPercent
        self.endPositionPercent = endPositionPercent; self.distancePt = distancePt
        self.directionDegrees = directionDegrees
    }
    public static let standard = ReflectionEffect(blurPt: 0.5, startAlphaPercent: 59, startPositionPercent: 0,
                                                  endAlphaPercent: 0.3, endPositionPercent: 41,
                                                  distancePt: 1.5, directionDegrees: 90)
}

/// Một điểm dừng gradient cho textFill w14.
public struct GradientStop: Equatable, Sendable {
    public var positionPercent: Double
    public var colorHex: String
    public var alphaPercent: Double
    public init(positionPercent: Double, colorHex: String, alphaPercent: Double) {
        self.positionPercent = positionPercent; self.colorHex = colorHex; self.alphaPercent = alphaPercent
    }
}

/// Kiểu tô chữ w14 (textFill): màu đặc hoặc gradient tuyến tính.
public enum TextFill: Equatable, Sendable {
    case solid(colorHex: String, alphaPercent: Double)
    case gradient(stops: [GradientStop], angleDegrees: Double)
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
    /// Hiệu ứng chữ (toggle trong rPr, theo đúng mẫu bold/italic): chữ hoa,
    /// chữ hoa nhỏ, gạch ngang đơn/đôi, viền, bóng, nổi, chìm, ẩn.
    public var isCaps: Bool { WordText.toggle(element, "caps") }
    public var isSmallCaps: Bool { WordText.toggle(element, "smallCaps") }
    public var isStrike: Bool { WordText.toggle(element, "strike") }
    public var isDoubleStrike: Bool { WordText.toggle(element, "dstrike") }
    public var isOutline: Bool { WordText.toggle(element, "outline") }
    public var isShadow: Bool { WordText.toggle(element, "shadow") }
    public var isEmboss: Bool { WordText.toggle(element, "emboss") }
    public var isImprint: Bool { WordText.toggle(element, "imprint") }
    public var isVanish: Bool { WordText.toggle(element, "vanish") }
    public func setCaps(_ on: Bool) { WordText.setToggle(element, "caps", on); paragraph.story.markModified() }
    public func setSmallCaps(_ on: Bool) { WordText.setToggle(element, "smallCaps", on); paragraph.story.markModified() }
    public func setStrike(_ on: Bool) { WordText.setToggle(element, "strike", on); paragraph.story.markModified() }
    public func setDoubleStrike(_ on: Bool) { WordText.setToggle(element, "dstrike", on); paragraph.story.markModified() }
    public func setOutline(_ on: Bool) { WordText.setToggle(element, "outline", on); paragraph.story.markModified() }
    public func setShadow(_ on: Bool) { WordText.setToggle(element, "shadow", on); paragraph.story.markModified() }
    public func setEmboss(_ on: Bool) { WordText.setToggle(element, "emboss", on); paragraph.story.markModified() }
    public func setImprint(_ on: Bool) { WordText.setToggle(element, "imprint", on); paragraph.story.markModified() }
    public func setVanish(_ on: Bool) { WordText.setToggle(element, "vanish", on); paragraph.story.markModified() }
    public func setUnderline(_ on: Bool) { WordText.setValueProperty(element, "u", on ? "single" : nil); paragraph.story.markModified() }
    /// Màu chữ dạng hex RRGGBB, nil = tự động.
    public func setColor(_ hex: String?) { WordText.setValueProperty(element, "color", hex); paragraph.story.markModified() }
    public func setFontSize(_ pt: Double) {
        let half = String(Int((pt * 2).rounded()))
        WordText.setValueProperty(element, "sz", half)
        WordText.setValueProperty(element, "szCs", half)
        paragraph.story.markModified()
    }

    // MARK: Hiệu ứng chữ w14 (glow / reflection / softEdge / textFill)
    //
    // Các phần tử w14 nằm ở CUỐI rPr (sau mọi con cổ điển, trước rPrChange nếu có).
    // Namespace w14 = http://schemas.microsoft.com/office/word/2010/wordml; khi ghi
    // lần đầu vào một part chưa khai báo, khai báo được thêm vào gốc của part đó.

    private static let w14URI = "http://schemas.microsoft.com/office/word/2010/wordml"

    private func w14Child(_ local: String) -> XElement? {
        element.firstChild(NS.w, "rPr")?.elements.first { $0.localName == local && $0.namespaceURI == Run.w14URI }
    }

    private func ensureW14Namespace() {
        let root = paragraph.story.xml.root
        if root.namespaceURI(forPrefix: "w14") == nil {
            root.setAttribute("xmlns:w14", Run.w14URI)
        }
        if let ig = root.attribute("mc:Ignorable"), !ig.split(separator: " ").contains("w14") {
            root.setAttribute("mc:Ignorable", ig + " w14")
        }
    }

    /// Ghi (hoặc xóa khi `build` trả nil) một phần tử w14 trong rPr.
    private func setW14(_ local: String, _ build: (() -> XElement)?) {
        guard let rPr = element.firstChild(NS.w, "rPr") ?? (build != nil ? WordText.ensureRPr(element) : nil) else {
            if build == nil { return }
            return
        }
        w14Child(local)?.removeFromParent()
        guard let build else { paragraph.story.markModified(); return }
        ensureW14Namespace()
        let e = build()
        if let change = rPr.firstChild(NS.w, "rPrChange") {
            rPr.insert(e, before: change)
        } else {
            rPr.append(e)
        }
        paragraph.story.markModified()
    }

    private static func w14El(_ local: String, _ attrs: [(String, String)] = []) -> XElement {
        XElement(name: "w14:\(local)", attributes: attrs.map { XAttribute(name: "w14:\($0.0)", value: $0.1) })
    }

    private static func srgb(_ hex: String, _ alphaPercent: Double) -> XElement {
        let c = w14El("srgbClr", [("val", hex)])
        if alphaPercent < 100 {
            c.append(w14El("alpha", [("val", String(Int((alphaPercent * 1000).rounded())))]))
        }
        return c
    }

    private static func checkColor(_ hex: String) throws -> String {
        let h = hex.uppercased()
        guard h.count == 6, h.allSatisfy({ $0.isHexDigit }) else {
            throw WordError.invalidTextEffect("màu hex phải có 6 ký tự hex (nhận \(hex))")
        }
        return h
    }

    private static func checkPercent(_ v: Double, _ name: String) throws {
        guard (0...100).contains(v) else { throw WordError.invalidTextEffect("\(name) phải trong 0...100 (nhận \(v))") }
    }

    private static func emu(_ pt: Double) -> String { String(Int((pt * 12700).rounded())) }
    private static func pt(emu v: String?) -> Double { v.flatMap(Double.init).map { $0 / 12700 } ?? 0 }
    private static func pct(_ v: Double) -> String { String(Int((v * 1000).rounded())) }
    private static func pctBack(_ v: String?) -> Double { v.flatMap(Double.init).map { $0 / 1000 } ?? 0 }

    public var glow: GlowEffect? {
        guard let g = w14Child("glow"), let clr = g.elements.first(where: { $0.localName == "srgbClr" }),
              let hex = clr.attribute("w14:val") else { return nil }
        let alpha = clr.elements.first { $0.localName == "alpha" }?.attribute("w14:val")
        return GlowEffect(colorHex: hex, alphaPercent: alpha.map { Run.pctBack($0) } ?? 100,
                          radiusPt: Run.pt(emu: g.attribute("w14:rad")))
    }

    public func setGlow(_ effect: GlowEffect?) throws {
        guard let effect else { setW14("glow", nil); return }
        let hex = try Run.checkColor(effect.colorHex)
        try Run.checkPercent(effect.alphaPercent, "alpha")
        guard effect.radiusPt >= 0 else { throw WordError.invalidTextEffect("bán kính glow không được âm") }
        setW14("glow") {
            let g = Run.w14El("glow", [("rad", Run.emu(effect.radiusPt))])
            g.append(Run.srgb(hex, effect.alphaPercent))
            return g
        }
    }

    public var reflection: ReflectionEffect? {
        guard let r = w14Child("reflection") else { return nil }
        func a(_ k: String) -> String? { r.attribute("w14:\(k)") }
        return ReflectionEffect(blurPt: Run.pt(emu: a("blurRad")),
                                startAlphaPercent: Run.pctBack(a("stA")), startPositionPercent: Run.pctBack(a("stPos")),
                                endAlphaPercent: Run.pctBack(a("endA")), endPositionPercent: Run.pctBack(a("endPos")),
                                distancePt: Run.pt(emu: a("dist")),
                                directionDegrees: (a("dir").flatMap(Double.init) ?? 0) / 60000)
    }

    public func setReflection(_ effect: ReflectionEffect?) throws {
        guard let effect else { setW14("reflection", nil); return }
        for (v, n) in [(effect.startAlphaPercent, "alpha đầu"), (effect.startPositionPercent, "vị trí đầu"),
                       (effect.endAlphaPercent, "alpha cuối"), (effect.endPositionPercent, "vị trí cuối")] {
            try Run.checkPercent(v, n)
        }
        guard effect.blurPt >= 0, effect.distancePt >= 0 else {
            throw WordError.invalidTextEffect("blur/khoảng cách reflection không được âm")
        }
        setW14("reflection") {
            Run.w14El("reflection", [("blurRad", Run.emu(effect.blurPt)),
                                     ("stA", Run.pct(effect.startAlphaPercent)), ("stPos", Run.pct(effect.startPositionPercent)),
                                     ("endA", Run.pct(effect.endAlphaPercent)), ("endPos", Run.pct(effect.endPositionPercent)),
                                     ("dist", Run.emu(effect.distancePt)),
                                     ("dir", String(Int((effect.directionDegrees * 60000).rounded()))),
                                     ("fadeDir", String(Int((effect.directionDegrees * 60000).rounded()))),
                                     ("sx", "100000"), ("sy", "-100000"), ("rotWithShape", "1"), ("alg", "ctr")])
        }
    }

    public var softEdgeRadiusPt: Double? {
        w14Child("softEdge").map { Run.pt(emu: $0.attribute("w14:rad")) }
    }

    public func setSoftEdge(radiusPt: Double?) throws {
        guard let radiusPt else { setW14("softEdge", nil); return }
        guard radiusPt >= 0 else { throw WordError.invalidTextEffect("bán kính soft edge không được âm") }
        setW14("softEdge") { Run.w14El("softEdge", [("rad", Run.emu(radiusPt))]) }
    }

    public var textFill: TextFill? {
        guard let tf = w14Child("textFill") else { return nil }
        if let solid = tf.elements.first(where: { $0.localName == "solidFill" }),
           let clr = solid.elements.first(where: { $0.localName == "srgbClr" }),
           let hex = clr.attribute("w14:val") {
            let alpha = clr.elements.first { $0.localName == "alpha" }?.attribute("w14:val")
            return .solid(colorHex: hex, alphaPercent: alpha.map { Run.pctBack($0) } ?? 100)
        }
        if let grad = tf.elements.first(where: { $0.localName == "gradFill" }),
           let list = grad.elements.first(where: { $0.localName == "gsLst" }) {
            var stops: [GradientStop] = []
            for gs in list.elements where gs.localName == "gs" {
                guard let clr = gs.elements.first(where: { $0.localName == "srgbClr" }),
                      let hex = clr.attribute("w14:val") else { continue }
                let alpha = clr.elements.first { $0.localName == "alpha" }?.attribute("w14:val")
                stops.append(GradientStop(positionPercent: Run.pctBack(gs.attribute("w14:pos")),
                                          colorHex: hex, alphaPercent: alpha.map { Run.pctBack($0) } ?? 100))
            }
            let ang = grad.elements.first { $0.localName == "lin" }?.attribute("w14:ang").flatMap(Double.init) ?? 0
            return .gradient(stops: stops, angleDegrees: ang / 60000)
        }
        return nil
    }

    public func setTextFill(_ fill: TextFill?) throws {
        guard let fill else { setW14("textFill", nil); return }
        switch fill {
        case .solid(let hex0, let alpha):
            let hex = try Run.checkColor(hex0)
            try Run.checkPercent(alpha, "alpha")
            setW14("textFill") {
                let tf = Run.w14El("textFill")
                let solid = Run.w14El("solidFill")
                solid.append(Run.srgb(hex, alpha))
                tf.append(solid)
                return tf
            }
        case .gradient(let stops, let angle):
            guard stops.count >= 2 else { throw WordError.invalidTextEffect("gradient cần ít nhất 2 điểm dừng") }
            for s in stops {
                _ = try Run.checkColor(s.colorHex)
                try Run.checkPercent(s.alphaPercent, "alpha điểm dừng")
                try Run.checkPercent(s.positionPercent, "vị trí điểm dừng")
            }
            setW14("textFill") {
                let tf = Run.w14El("textFill")
                let grad = Run.w14El("gradFill")
                let list = Run.w14El("gsLst")
                for s in stops {
                    let gs = Run.w14El("gs", [("pos", Run.pct(s.positionPercent))])
                    gs.append(Run.srgb(s.colorHex.uppercased(), s.alphaPercent))
                    list.append(gs)
                }
                grad.append(list)
                grad.append(Run.w14El("lin", [("ang", String(Int((angle * 60000).rounded()))), ("scaled", "1")]))
                tf.append(grad)
                return tf
            }
        }
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
