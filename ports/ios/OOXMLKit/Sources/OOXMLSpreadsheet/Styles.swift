import Foundation
import OOXMLPackage

/// Thay đổi định dạng áp lên một ô; trường nil = giữ nguyên như style hiện tại.
public struct CellFormatChange: Hashable, Sendable {
    public var numberFormat: String?
    public var bold: Bool?
    public var italic: Bool?
    public var underline: Bool?
    public var fontColor: String?   // ARGB, ví dụ "FFC00000"
    public var fontSize: Double?
    public var fillColor: String?   // ARGB nền đặc
    public var horizontalAlignment: String? // left|center|right|...
    public var wrapText: Bool?

    public init(numberFormat: String? = nil, bold: Bool? = nil, italic: Bool? = nil, underline: Bool? = nil,
                fontColor: String? = nil, fontSize: Double? = nil, fillColor: String? = nil,
                horizontalAlignment: String? = nil, wrapText: Bool? = nil) {
        self.numberFormat = numberFormat
        self.bold = bold
        self.italic = italic
        self.underline = underline
        self.fontColor = fontColor
        self.fontSize = fontSize
        self.fillColor = fillColor
        self.horizontalAlignment = horizontalAlignment
        self.wrapText = wrapText
    }
}

public struct CellFormatInfo: Equatable, Sendable {
    public var numberFormatId: Int
    public var numberFormatCode: String
    public var isDate: Bool
    public var bold: Bool
    public var italic: Bool
    public var fillColor: String?
}

/// xl/styles.xml. Style mới được tạo bằng cách SAO CHÉP xf/font/fill gốc rồi chỉnh,
/// nên mọi thuộc tính khác (viền, bảo vệ, extLst…) được giữ. Không bao giờ sửa xf đang dùng.
public final class StyleSheet {
    let package: OPCPackage
    let part: PartName
    let document: XDocument
    private struct CacheKey: Hashable { let base: Int; let change: CellFormatChange }
    private var cache: [CacheKey: Int] = [:]

    static let styleSheetOrder = ["numFmts", "fonts", "fills", "borders", "cellStyleXfs", "cellXfs", "cellStyles",
                                  "dxfs", "tableStyles", "colors", "extLst"]
    static let fontOrder = ["b", "i", "strike", "condense", "extend", "outline", "shadow", "u", "vertAlign",
                            "sz", "color", "name", "family", "charset", "scheme"]
    static let xfOrder = ["alignment", "protection", "extLst"]

    init(package: OPCPackage, part: PartName) throws {
        self.package = package
        self.part = part
        document = try package.xml(part)
    }

    private var root: XElement { document.root }

    private func container(_ local: String, create: Bool) -> XElement? {
        if let e = root.firstChild(NS.s, local) { return e }
        guard create else { return nil }
        let e = XElement(name: root.qualifiedName(local, in: NS.s).name, attributes: [XAttribute(name: "count", value: "0")])
        root.insertChild(e, schemaOrder: StyleSheet.styleSheetOrder)
        return e
    }

    var cellXfs: [XElement] { container("cellXfs", create: false)?.children(NS.s, "xf") ?? [] }

    public var cellFormatCount: Int { cellXfs.count }

    public func numberFormatCode(id: Int) -> String {
        if let nf = container("numFmts", create: false)?.children(NS.s, "numFmt").first(where: { Int($0.attribute("numFmtId") ?? "") == id }) {
            return nf.attribute("formatCode") ?? "General"
        }
        return StyleSheet.builtinFormats[id] ?? "General"
    }

    public func info(styleIndex: Int) -> CellFormatInfo {
        let xfs = cellXfs
        guard xfs.indices.contains(styleIndex) else {
            return CellFormatInfo(numberFormatId: 0, numberFormatCode: "General", isDate: false, bold: false, italic: false, fillColor: nil)
        }
        let xf = xfs[styleIndex]
        let id = Int(xf.attribute("numFmtId") ?? "0") ?? 0
        let code = numberFormatCode(id: id)
        let font = element("fonts", "font", index: Int(xf.attribute("fontId") ?? "0") ?? 0)
        let fill = element("fills", "fill", index: Int(xf.attribute("fillId") ?? "0") ?? 0)
        let fillColor = fill?.firstChild(NS.s, "patternFill").flatMap { pf -> String? in
            pf.attribute("patternType") == "solid" ? pf.firstChild(NS.s, "fgColor")?.attribute("rgb") : nil
        }
        return CellFormatInfo(numberFormatId: id, numberFormatCode: code,
                              isDate: StyleSheet.isDateFormat(id: id, code: code),
                              bold: font.map(StyleSheet.flag("b")) ?? false,
                              italic: font.map(StyleSheet.flag("i")) ?? false,
                              fillColor: fillColor)
    }

    private static func flag(_ local: String) -> (XElement) -> Bool {
        { font in
            guard let e = font.firstChild(NS.s, local) else { return false }
            let v = e.attribute("val")
            return v == nil || v == "1" || v == "true"
        }
    }

    private func element(_ containerName: String, _ local: String, index: Int) -> XElement? {
        let list = container(containerName, create: false)?.children(NS.s, local) ?? []
        return list.indices.contains(index) ? list[index] : nil
    }

    /// Chỉ số style (cellXfs) = style `base` + `change`. Dùng lại style đã tạo nếu trùng.
    public func cellFormat(applying change: CellFormatChange, to base: Int) -> Int {
        let key = CacheKey(base: base, change: change)
        if let c = cache[key] { return c }
        let xfs = container("cellXfs", create: true)!
        let existing = xfs.children(NS.s, "xf")
        let xf: XElement
        if existing.indices.contains(base) {
            xf = existing[base].deepCopy()
        } else {
            xf = XElement(name: xfs.qualifiedName("xf", in: NS.s).name, attributes: [
                XAttribute(name: "numFmtId", value: "0"), XAttribute(name: "fontId", value: "0"),
                XAttribute(name: "fillId", value: "0"), XAttribute(name: "borderId", value: "0"),
                XAttribute(name: "xfId", value: "0"),
            ])
        }
        // Gắn vào cây trước khi sửa để tên phần tử con mới lấy đúng tiền tố namespace.
        xfs.append(xf)
        if let code = change.numberFormat {
            xf.setAttribute("numFmtId", String(numberFormatId(for: code)))
            xf.setAttribute("applyNumberFormat", "1")
        }
        if change.bold != nil || change.italic != nil || change.underline != nil || change.fontColor != nil || change.fontSize != nil {
            xf.setAttribute("fontId", String(derivedFont(from: Int(xf.attribute("fontId") ?? "0") ?? 0, change)))
            xf.setAttribute("applyFont", "1")
        }
        if let fill = change.fillColor {
            xf.setAttribute("fillId", String(solidFill(fill)))
            xf.setAttribute("applyFill", "1")
        }
        if change.horizontalAlignment != nil || change.wrapText != nil {
            let al = xf.firstChild(NS.s, "alignment") ?? {
                let a = XElement(name: xf.qualifiedName("alignment", in: NS.s).name)
                xf.insertChild(a, schemaOrder: StyleSheet.xfOrder)
                return a
            }()
            if let h = change.horizontalAlignment { al.setAttribute("horizontal", h) }
            if let w = change.wrapText { al.setAttribute("wrapText", w ? "1" : "0") }
            xf.setAttribute("applyAlignment", "1")
        }
        let index = xfs.children(NS.s, "xf").count - 1
        xfs.setAttribute("count", String(index + 1))
        package.markModified(part)
        cache[key] = index
        return index
    }

    func numberFormatId(for code: String) -> Int {
        if let builtin = StyleSheet.builtinFormats.first(where: { $0.value == code })?.key { return builtin }
        let nfs = container("numFmts", create: true)!
        let list = nfs.children(NS.s, "numFmt")
        if let e = list.first(where: { $0.attribute("formatCode") == code }), let id = Int(e.attribute("numFmtId") ?? "") {
            return id
        }
        let id = max(163, list.compactMap { Int($0.attribute("numFmtId") ?? "") }.max() ?? 163) + 1
        nfs.append(XElement(name: nfs.qualifiedName("numFmt", in: NS.s).name, attributes: [
            XAttribute(name: "numFmtId", value: String(id)), XAttribute(name: "formatCode", value: code),
        ]))
        nfs.setAttribute("count", String(list.count + 1))
        return id
    }

    private func derivedFont(from fontId: Int, _ c: CellFormatChange) -> Int {
        let fonts = container("fonts", create: true)!
        let list = fonts.children(NS.s, "font")
        let font = list.indices.contains(fontId) ? list[fontId].deepCopy()
            : XElement(name: fonts.qualifiedName("font", in: NS.s).name)
        fonts.append(font)
        func toggle(_ local: String, _ on: Bool?) {
            guard let on else { return }
            for e in font.children(NS.s, local) { e.removeFromParent() }
            if on { font.insertChild(XElement(name: font.qualifiedName(local, in: NS.s).name), schemaOrder: StyleSheet.fontOrder) }
        }
        toggle("b", c.bold)
        toggle("i", c.italic)
        toggle("u", c.underline)
        if let color = c.fontColor {
            for e in font.children(NS.s, "color") { e.removeFromParent() }
            font.insertChild(XElement(name: font.qualifiedName("color", in: NS.s).name,
                                        attributes: [XAttribute(name: "rgb", value: color)]), schemaOrder: StyleSheet.fontOrder)
        }
        if let size = c.fontSize {
            for e in font.children(NS.s, "sz") { e.removeFromParent() }
            font.insertChild(XElement(name: font.qualifiedName("sz", in: NS.s).name,
                                        attributes: [XAttribute(name: "val", value: Worksheet.format(size))]), schemaOrder: StyleSheet.fontOrder)
        }
        fonts.setAttribute("count", String(list.count + 1))
        return list.count
    }

    private func solidFill(_ argb: String) -> Int {
        let fills = container("fills", create: true)!
        let list = fills.children(NS.s, "fill")
        let q = { (l: String) in fills.qualifiedName(l, in: NS.s).name }
        let pf = XElement(name: q("patternFill"), attributes: [XAttribute(name: "patternType", value: "solid")])
        pf.append(XElement(name: q("fgColor"), attributes: [XAttribute(name: "rgb", value: argb)]))
        pf.append(XElement(name: q("bgColor"), attributes: [XAttribute(name: "indexed", value: "64")]))
        let fill = XElement(name: q("fill"))
        fill.append(pf)
        fills.append(fill)
        fills.setAttribute("count", String(list.count + 1))
        return list.count
    }

    /// Định dạng số dựng sẵn (ECMA-376 §18.8.30).
    public static let builtinFormats: [Int: String] = [
        0: "General", 1: "0", 2: "0.00", 3: "#,##0", 4: "#,##0.00", 9: "0%", 10: "0.00%", 11: "0.00E+00",
        12: "# ?/?", 13: "# ??/??", 14: "mm-dd-yy", 15: "d-mmm-yy", 16: "d-mmm", 17: "mmm-yy",
        18: "h:mm AM/PM", 19: "h:mm:ss AM/PM", 20: "h:mm", 21: "h:mm:ss", 22: "m/d/yy h:mm",
        37: "#,##0 ;(#,##0)", 38: "#,##0 ;[Red](#,##0)", 39: "#,##0.00;(#,##0.00)", 40: "#,##0.00;[Red](#,##0.00)",
        45: "mm:ss", 46: "[h]:mm:ss", 47: "mmss.0", 48: "##0.0E+0", 49: "@",
    ]

    public static func isDateFormat(id: Int, code: String) -> Bool {
        if (14...22).contains(id) || (45...47).contains(id) || (27...36).contains(id) || (50...58).contains(id) { return true }
        if id < 164 && builtinFormats[id] != nil { return false }
        // Bỏ phần trong "..." và [...] (màu, điều kiện, [h] vẫn là thời gian) rồi tìm ký hiệu ngày/giờ.
        var s = ""
        var inQuote = false
        var inBracket = false
        var prevBackslash = false
        for ch in code.lowercased() {
            if prevBackslash { prevBackslash = false; continue }
            if ch == "\\" { prevBackslash = true; continue }
            if ch == "\"" { inQuote.toggle(); continue }
            if inQuote { continue }
            if ch == "[" { inBracket = true; continue }
            if ch == "]" { inBracket = false; continue }
            if inBracket {
                if ch == "h" || ch == "m" || ch == "s" { s.append(ch) }
                continue
            }
            s.append(ch)
        }
        let section = s.split(separator: ";").first.map(String.init) ?? s
        return section.contains { "dmyhs".contains($0) } && !section.contains("general")
    }
}
