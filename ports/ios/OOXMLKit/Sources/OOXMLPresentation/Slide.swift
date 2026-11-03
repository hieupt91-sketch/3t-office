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

    // MARK: Transition và hoạt ảnh

    /// Transition của slide: (loại, tốc độ, thời lượng ms). Loại là tên phần tử con (fade, wipe, push…).
    /// Đọc transition trực tiếp, nếu không có thì lấy trong AlternateContent (theo thứ tự tài liệu: Choice trước).
    public var transition: (type: String, speed: String?, durationMs: Int?)? {
        guard let t = transitionElement() else { return nil }
        let type = t.elements.first?.localName ?? ""
        guard !type.isEmpty else { return nil }
        return (type, t.attribute("spd"), t.attribute("dur").flatMap { Int($0) })
    }

    private func transitionElement() -> XElement? {
        if let direct = document.root.firstChild(NS.p, "transition") { return direct }
        var found: XElement?
        document.root.forEachDescendant { e in
            if found == nil, e.localName == "transition" { found = e }
        }
        return found
    }

    /// Đặt transition cho slide (thay transition cũ, kể cả dạng AlternateContent p14).
    /// `type` là tên hiệu ứng (fade, wipe, push, split, cover, uncover…); `speed` là slow/med/fast;
    /// `durationMs` ghi thuộc tính dur. Hướng dùng mặc định của PowerPoint (chưa có tham số dir).
    public func setTransition(type: String, speed: String? = nil, durationMs: Int? = nil) throws {
        guard !type.isEmpty else { throw PresentationError.invalidTransition("loại transition không được để trống") }
        _ = removeTransitionElements()
        let q = { (l: String) in self.document.root.qualifiedName(l, in: NS.p).name }
        let t = XElement(name: q("transition"))
        if let speed { t.setAttribute("spd", speed) }
        if let durationMs { t.setAttribute("dur", String(durationMs)) }
        t.append(XElement(name: q(type)))
        if let clrMap = document.root.firstChild(NS.p, "clrMapOvr") {
            document.root.insert(t, after: clrMap)
        } else if let cSld = document.root.firstChild(NS.p, "cSld") {
            document.root.insert(t, after: cSld)
        } else {
            document.root.append(t)
        }
        markModified()
    }

    /// Xóa transition của slide (cả dạng AlternateContent p14). Trả về true nếu đã có transition.
    @discardableResult
    public func removeTransition() -> Bool {
        let removed = removeTransitionElements()
        if removed { markModified() }
        return removed
    }

    /// Gỡ các phần tử transition (trực tiếp + trong AlternateContent) và dọn AlternateContent rỗng theo sau.
    private func removeTransitionElements() -> Bool {
        var doomed: [XElement] = []
        for t in document.root.children(NS.p, "transition") { doomed.append(t) }
        var alternates: [XElement] = []
        document.root.forEachDescendant { e in
            if e.localName == "AlternateContent" { alternates.append(e) }
            if e.localName == "transition" { doomed.append(e) }
        }
        for e in doomed { e.removeFromParent() }
        for alt in alternates {
            for b in alt.elements.filter({ $0.localName == "Choice" || $0.localName == "Fallback" }) where b.elements.isEmpty {
                b.removeFromParent()
            }
            if alt.elements.isEmpty { alt.removeFromParent() }
        }
        return !doomed.isEmpty
    }

    /// Các hiệu ứng hoạt ảnh của slide: (presetID, presetClass, id shape đích) theo thứ tự trong cây timing.
    public var animations: [(presetID: Int, presetClass: String, shapeId: Int)] {
        guard let timing = document.root.firstChild(NS.p, "timing") else { return [] }
        var out: [(Int, String, Int)] = []
        timing.forEachDescendant { e in
            guard e.localName == "cTn", let preset = e.attribute("presetID"), let pid = Int(preset) else { return }
            let cls = e.attribute("presetClass") ?? ""
            var spid: Int?
            e.forEachDescendant { d in
                if spid == nil, d.localName == "spTgt", let v = d.attribute("spid"), let n = Int(v) { spid = n }
            }
            if let spid { out.append((pid, cls, spid)) }
        }
        return out
    }

    /// Một bước hoạt ảnh trong mainSeq, đọc đầy đủ từ cây timing: preset, shape đích,
    /// thời lượng (dur của nút anim/animEffect con, nếu không có thì dur của chính nút effect) và
    /// độ trễ bắt đầu (delay của nút effect; nil khi "indefinite" hoặc không có).
    public struct AnimationStep: Equatable, Sendable {
        public let presetID: Int
        public let presetClass: String
        public let shapeId: Int
        public let durationMs: Int?
        public let delayMs: Int?
    }

    /// Các bước hoạt ảnh của slide theo thứ tự trong cây timing (đầy đủ hơn `animations`).
    public var animationSteps: [AnimationStep] {
        guard let timing = document.root.firstChild(NS.p, "timing") else { return [] }
        var out: [AnimationStep] = []
        timing.forEachDescendant { e in
            guard e.localName == "cTn", let preset = e.attribute("presetID"), let pid = Int(preset) else { return }
            let cls = e.attribute("presetClass") ?? ""
            var spid: Int?
            e.forEachDescendant { d in
                if spid == nil, d.localName == "spTgt", let v = d.attribute("spid"), let n = Int(v) { spid = n }
            }
            guard let spid else { return }
            var delay: Int?
            if let st = e.firstChild(NS.p, "stCondLst"), let cond = st.firstChild(NS.p, "cond"),
               let v = cond.attribute("delay"), let n = Int(v) { delay = n }
            var dur: Int?
            e.forEachDescendant { d in
                if dur == nil, ["anim", "animEffect"].contains(d.localName),
                   let bhvr = d.firstChild(NS.p, "cBhvr"), let ctn = bhvr.firstChild(NS.p, "cTn"),
                   let v = ctn.attribute("dur"), let n = Int(v) { dur = n }
            }
            if dur == nil, let v = e.attribute("dur"), let n = Int(v) { dur = n }
            out.append(AnimationStep(presetID: pid, presetClass: cls, shapeId: spid, durationMs: dur, delayMs: delay))
        }
        return out
    }

    /// Đổi thời lượng / độ trễ của mọi hiệu ứng đang nhắm tới hình `shapeId`.
    /// Trả về số hiệu ứng đã đổi (0 = không có hiệu ứng nào cho hình đó).
    /// durationMs ghi vào dur của nút anim/animEffect con nếu có, ngược lại ghi vào dur của nút effect;
    /// delayMs ghi vào delay của cond trực tiếp của nút effect (tạo stCondLst nếu chưa có).
    @discardableResult
    public func setAnimationTiming(shapeId: Int, durationMs: Int? = nil, delayMs: Int? = nil) -> Int {
        guard let timing = document.root.firstChild(NS.p, "timing") else { return 0 }
        var changed = 0
        timing.forEachDescendant { e in
            guard e.localName == "cTn", e.attribute("presetID") != nil else { return }
            var spid: Int?
            e.forEachDescendant { d in
                if spid == nil, d.localName == "spTgt", let v = d.attribute("spid"), let n = Int(v) { spid = n }
            }
            guard spid == shapeId else { return }
            var did = false
            if let durationMs {
                var target: XElement?
                e.forEachDescendant { d in
                    if target == nil, ["anim", "animEffect"].contains(d.localName),
                       let bhvr = d.firstChild(NS.p, "cBhvr"), let ctn = bhvr.firstChild(NS.p, "cTn") { target = ctn }
                }
                (target ?? e).setAttribute("dur", String(durationMs))
                did = true
            }
            if let delayMs {
                let q = { (l: String) in self.document.root.qualifiedName(l, in: NS.p).name }
                let st: XElement
                if let existing = e.firstChild(NS.p, "stCondLst") {
                    st = existing
                } else {
                    st = XElement(name: q("stCondLst"))
                    e.insert(st, at: 0)
                }
                if let cond = st.firstChild(NS.p, "cond") {
                    cond.setAttribute("delay", String(delayMs))
                } else {
                    st.append(XElement(name: q("cond"), attributes: [XAttribute(name: "delay", value: String(delayMs))]))
                }
                did = true
            }
            if did { changed += 1 }
        }
        if changed > 0 { markModified() }
        return changed
    }

    /// Xóa toàn bộ hoạt ảnh của slide (gỡ phần tử p:timing).
    public func removeAnimations() {
        guard let timing = document.root.firstChild(NS.p, "timing") else { return }
        timing.removeFromParent()
        markModified()
    }

    /// Thêm hiệu ứng vào mờ (fade) cho hình có id `shapeId`: một click mới trong mainSeq, theo đúng
    /// mẫu cây timing của PowerPoint (set visibility + anim opacity). Tạo khung timing/mainSeq nếu chưa có.
    public func addFadeEntrance(shapeId: Int, delayMs: Int = 0, durationMs: Int = 600) throws {
        let b = try beginClickEffect(shapeId: shapeId, presetID: 10, presetClass: "entr",
                                     presetSubtype: 0, effectDur: nil, delayMs: delayMs)
        b.effectKids.append(b.visibilitySet(shapeId: shapeId))
        let anim = XElement(name: b.q("anim"), attributes: [XAttribute(name: "calcmode", value: "lin"),
                                                          XAttribute(name: "valueType", value: "str"),
                                                          XAttribute(name: "from", value: "0"),
                                                          XAttribute(name: "to", value: "1")])
        let animBhvr = XElement(name: b.q("cBhvr"), attributes: [XAttribute(name: "additive", value: "repl")])
        animBhvr.append(b.cTn(id: b.newId(), attrs: [("dur", String(durationMs)), ("fill", "hold")]))
        animBhvr.append(b.tgtEl(spid: shapeId))
        animBhvr.append(b.attrNameList("style.opacity"))
        anim.append(animBhvr)
        b.effectKids.append(anim)
        markModified()
    }

    /// Thêm hiệu ứng xuất hiện thuộc họ `animEffect` (preset entrance dùng bộ lọc chuyển cảnh):
    /// blinds (presetID 3, filter "blinds"), box (4, "box"), circle (11, "circle"),
    /// checkerboard (12, "checkerboard"), diamond (17, "diamond"), dissolve in (9, "dissolve"),
    /// wedge (39, "wedge")… Cấu trúc cây như PowerPoint ghi: set visibility + một nút
    /// `p:animEffect transition="in"` mang thời lượng. `presetID`/`filter` do người gọi cấp
    /// (theo bảng preset ECMA-376) vì một filter có thể ứng với nhiều preset/hướng.
    public func addEntranceEffect(shapeId: Int, presetID: Int, presetSubtype: Int = 0,
                                  filter: String, delayMs: Int = 0, durationMs: Int = 600) throws {
        guard presetID > 0 else { throw PresentationError.invalidTiming("presetID phải > 0 (nhận \(presetID))") }
        guard !filter.isEmpty else { throw PresentationError.invalidTiming("filter của animEffect không được rỗng") }
        let b = try beginClickEffect(shapeId: shapeId, presetID: presetID, presetClass: "entr",
                                     presetSubtype: presetSubtype, effectDur: nil, delayMs: delayMs)
        b.effectKids.append(b.visibilitySet(shapeId: shapeId))
        let effect = XElement(name: b.q("animEffect"), attributes: [XAttribute(name: "transition", value: "in"),
                                                                    XAttribute(name: "filter", value: filter)])
        let bhvr = XElement(name: b.q("cBhvr"))
        bhvr.append(b.cTn(id: b.newId(), attrs: [("dur", String(durationMs)), ("fill", "hold")]))
        bhvr.append(b.tgtEl(spid: shapeId))
        effect.append(bhvr)
        b.effectKids.append(effect)
        markModified()
    }

    /// Thêm hiệu ứng xuất hiện tức thì (appear, presetID 1): chỉ set visibility ở một click mới.
    public func addAppearEntrance(shapeId: Int, delayMs: Int = 0) throws {
        let b = try beginClickEffect(shapeId: shapeId, presetID: 1, presetClass: "entr",
                                     presetSubtype: 0, effectDur: "1", delayMs: delayMs)
        b.effectKids.append(b.visibilitySet(shapeId: shapeId))
        markModified()
    }

    /// Bộ khung dùng chung cho các hiệu ứng entrance theo click: cấp phát id cTn, tạo
    /// khung timing/mainSeq nếu chưa có, gắn một click mới (par > cTn hold > par >
    /// cTn preset "clickEffect") và trả về nút effect cùng danh sách con của nó để
    /// người gọi thêm các nút hiệu ứng cụ thể (set/anim/animEffect…).
    private struct ClickEffectBuilder {
        let q: (String) -> String
        let ids: IdAllocator
        let effectCTn: XElement
        let effectKids: XElement
        func newId() -> Int { ids.take() }
        func cTn(id: Int, attrs: [(String, String)]) -> XElement {
            var a = [XAttribute(name: "id", value: String(id))]
            a += attrs.map { XAttribute(name: $0.0, value: $0.1) }
            return XElement(name: q("cTn"), attributes: a)
        }
        func cond(delay: String) -> XElement {
            let st = XElement(name: q("stCondLst"))
            st.append(XElement(name: q("cond"), attributes: [XAttribute(name: "delay", value: delay)]))
            return st
        }
        func tgtEl(spid: Int) -> XElement {
            let t = XElement(name: q("tgtEl"))
            t.append(XElement(name: q("spTgt"), attributes: [XAttribute(name: "spid", value: String(spid))]))
            return t
        }
        func attrNameList(_ name: String) -> XElement {
            let l = XElement(name: q("attrNameLst"))
            let a = XElement(name: q("attrName"))
            a.setText(name)
            l.append(a)
            return l
        }
        /// Nút <p:set> bật style.visibility = visible — mở đầu mọi hiệu ứng entrance.
        func visibilitySet(shapeId: Int) -> XElement {
            let set = XElement(name: q("set"))
            let bhvr = XElement(name: q("cBhvr"))
            let c = cTn(id: newId(), attrs: [("dur", "1"), ("fill", "hold")])
            c.append(cond(delay: "0"))
            bhvr.append(c)
            bhvr.append(tgtEl(spid: shapeId))
            bhvr.append(attrNameList("style.visibility"))
            set.append(bhvr)
            let to = XElement(name: q("to"))
            to.append(XElement(name: q("strVal"), attributes: [XAttribute(name: "val", value: "visible")]))
            set.append(to)
            return set
        }
    }

    private final class IdAllocator {
        var next: Int
        init(start: Int) { next = start }
        func take() -> Int { defer { next += 1 }; return next }
    }

    private func beginClickEffect(shapeId: Int, presetID: Int, presetClass: String,
                                  presetSubtype: Int, effectDur: String?, delayMs: Int) throws -> ClickEffectBuilder {
        guard allShapes.contains(where: { $0.id == shapeId }) else { throw PresentationError.shapeNotFound("không có hình id \(shapeId)") }
        let q = { (l: String) in self.document.root.qualifiedName(l, in: NS.p).name }
        var maxId = 0
        document.root.firstChild(NS.p, "timing")?.forEachDescendant { e in
            if e.localName == "cTn", let v = e.attribute("id"), let n = Int(v) { maxId = max(maxId, n) }
        }
        let ids = IdAllocator(start: maxId + 1)
        func cTn(id: Int, attrs: [(String, String)]) -> XElement {
            var a = [XAttribute(name: "id", value: String(id))]
            a += attrs.map { XAttribute(name: $0.0, value: $0.1) }
            return XElement(name: q("cTn"), attributes: a)
        }
        // Khung timing (tạo mới nếu chưa có).
        let timing: XElement
        if let existing = document.root.firstChild(NS.p, "timing") {
            timing = existing
        } else {
            timing = XElement(name: q("timing"))
            let tnLst = XElement(name: q("tnLst"))
            let par = XElement(name: q("par"))
            par.append(cTn(id: ids.take(), attrs: [("dur", "indefinite"), ("restart", "never"), ("nodeType", "tmRoot")]))
            tnLst.append(par)
            timing.append(tnLst)
            if let tr = document.root.firstChild(NS.p, "transition") {
                document.root.insert(timing, after: tr)
            } else if let clrMap = document.root.firstChild(NS.p, "clrMapOvr") {
                document.root.insert(timing, after: clrMap)
            } else if let cSld = document.root.firstChild(NS.p, "cSld") {
                document.root.insert(timing, after: cSld)
            } else {
                document.root.append(timing)
            }
        }
        // mainSeq (tìm hiện có hoặc tạo mới dưới tmRoot).
        let mainSeqChildren: XElement
        var mainSeq: XElement?
        timing.forEachDescendant { e in
            if mainSeq == nil, e.localName == "cTn", e.attribute("nodeType") == "mainSeq" { mainSeq = e }
        }
        if let mainSeq {
            if let list = mainSeq.firstChild(NS.p, "childTnLst") {
                mainSeqChildren = list
            } else {
                let list = XElement(name: q("childTnLst"))
                mainSeq.append(list)
                mainSeqChildren = list
            }
        } else {
            guard let rootCTn = timing.firstChild(NS.p, "tnLst")?.firstChild(NS.p, "par")?.firstChild(NS.p, "cTn") else {
                throw PresentationError.invalidTiming("cây timing thiếu nút gốc tmRoot")
            }
            let rootList: XElement
            if let list = rootCTn.firstChild(NS.p, "childTnLst") {
                rootList = list
            } else {
                let list = XElement(name: q("childTnLst"))
                rootCTn.append(list)
                rootList = list
            }
            let seq = XElement(name: q("seq"))
            let main = cTn(id: ids.take(), attrs: [("dur", "indefinite"), ("nodeType", "mainSeq")])
            let list = XElement(name: q("childTnLst"))
            main.append(list)
            seq.append(main)
            rootList.append(seq)
            mainSeqChildren = list
        }
        // Click mới: par > cTn(fill=hold, stCond indefinite) > par > cTn(preset, clickEffect).
        let builder = ClickEffectBuilder(q: q, ids: ids, effectCTn: XElement(name: q("cTn")), effectKids: XElement(name: q("childTnLst")))
        let clickPar = XElement(name: q("par"))
        let clickCTn = cTn(id: ids.take(), attrs: [("fill", "hold")])
        let clickCond = XElement(name: q("stCondLst"))
        clickCond.append(XElement(name: q("cond"), attributes: [XAttribute(name: "delay", value: "indefinite")]))
        clickCTn.append(clickCond)
        let effectPar = XElement(name: q("par"))
        var attrs: [(String, String)] = [("presetID", String(presetID)), ("presetClass", presetClass)]
        if presetSubtype != 0 { attrs.append(("presetSubtype", String(presetSubtype))) }
        if let effectDur { attrs.append(("dur", effectDur)) }
        attrs += [("fill", "hold"), ("nodeType", "clickEffect")]
        let effectCTn = cTn(id: ids.take(), attrs: attrs)
        let effectCond = XElement(name: q("stCondLst"))
        effectCond.append(XElement(name: q("cond"), attributes: [XAttribute(name: "delay", value: String(delayMs))]))
        effectCTn.append(effectCond)
        effectCTn.append(builder.effectKids)
        effectPar.append(effectCTn)
        let clickKids = XElement(name: q("childTnLst"))
        clickKids.append(effectPar)
        clickCTn.append(clickKids)
        clickPar.append(clickCTn)
        mainSeqChildren.append(clickPar)
        return ClickEffectBuilder(q: q, ids: ids, effectCTn: effectCTn, effectKids: builder.effectKids)
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
