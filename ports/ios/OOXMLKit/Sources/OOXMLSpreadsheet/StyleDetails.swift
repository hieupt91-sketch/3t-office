import Foundation
import OOXMLPackage

/// Chi tiết hiển thị của một định dạng ô (một `xf` trong `cellXfs`): đủ để giao diện vẽ ô mà không cần đọc
/// `styles.xml`. Màu đã được giải ra RGB khi có thể (theme + tint, indexed, rgb); giá trị gốc vẫn giữ để đối chiếu.
public struct CellFormatDetail: Equatable, Sendable {
    public struct Color: Equatable, Sendable {
        /// "RRGGBB" đã giải (nil = tự động/không xác định: giao diện dùng màu mặc định).
        public var rgb: String?
        public var theme: Int?
        public var tint: Double?
        public var indexed: Int?
        public var auto: Bool
    }
    public struct Font: Equatable, Sendable {
        public var name: String?
        public var size: Double?
        public var bold: Bool
        public var italic: Bool
        public var underline: String? // "single" | "double" | …
        public var strike: Bool
        public var color: Color?
    }
    public struct Fill: Equatable, Sendable {
        public var pattern: String?   // "solid", "none", "gray125", "gradient", …
        public var foreground: Color?
        public var background: Color?
    }
    public struct Edge: Equatable, Sendable {
        public var style: String?     // "thin", "medium", "dashed", …
        public var color: Color?
    }
    public struct Border: Equatable, Sendable {
        public var left: Edge?, right: Edge?, top: Edge?, bottom: Edge?, diagonal: Edge?
    }
    public struct Alignment: Equatable, Sendable {
        public var horizontal: String?
        public var vertical: String?
        public var wrapText: Bool
        public var indent: Int
        public var rotation: Int?
        public var shrinkToFit: Bool
    }
    public var numberFormatId: Int
    public var numberFormatCode: String
    public var font: Font
    public var fill: Fill
    public var border: Border
    public var alignment: Alignment
}

extension Workbook {
    /// Chi tiết mọi định dạng ô theo chỉ số `s` của ô. Mảng rỗng nếu sổ không có `styles.xml`.
    public func cellFormatDetails() -> [CellFormatDetail] {
        guard let styles else { return [] }
        let palette = themePalette()
        let custom = customIndexedColors(styles)
        func color(_ e: XElement?) -> CellFormatDetail.Color? {
            guard let e else { return nil }
            let theme = e.attribute("theme").flatMap { Int($0) }
            let tint = e.attribute("tint").flatMap { Double($0) }
            let indexed = e.attribute("indexed").flatMap { Int($0) }
            let auto = e.attribute("auto") == "1" || e.attribute("auto") == "true"
            var rgb: String?
            if let v = e.attribute("rgb"), v.count >= 6 { rgb = String(v.suffix(6)).uppercased() }
            else if let t = theme, palette.indices.contains(t) { rgb = Self.applyTint(palette[t], tint ?? 0) }
            else if let i = indexed {
                if let c = custom, c.indices.contains(i) { rgb = c[i] }
                else if Self.defaultIndexed.indices.contains(i) { rgb = Self.defaultIndexed[i] }
                else if i == 64 { rgb = nil } // màu hệ thống tiền cảnh
            }
            return .init(rgb: rgb, theme: theme, tint: tint, indexed: indexed, auto: auto)
        }
        func edge(_ e: XElement?) -> CellFormatDetail.Edge? {
            guard let e, let style = e.attribute("style") else { return nil }
            return .init(style: style, color: color(e.firstChild(NS.s, "color")))
        }
        func flag(_ e: XElement?) -> Bool {
            guard let e else { return false }
            let v = e.attribute("val")
            return v == nil || v == "1" || v == "true"
        }
        return styles.cellXfs.map { xf in
            let numId = Int(xf.attribute("numFmtId") ?? "0") ?? 0
            let font = styles.element("fonts", "font", index: Int(xf.attribute("fontId") ?? "0") ?? 0)
            let fill = styles.element("fills", "fill", index: Int(xf.attribute("fillId") ?? "0") ?? 0)
            let border = styles.element("borders", "border", index: Int(xf.attribute("borderId") ?? "0") ?? 0)
            let al = xf.firstChild(NS.s, "alignment")
            let pattern = fill?.firstChild(NS.s, "patternFill")
            return CellFormatDetail(
                numberFormatId: numId, numberFormatCode: styles.numberFormatCode(id: numId),
                font: .init(name: font?.firstChild(NS.s, "name")?.attribute("val"),
                            size: font?.firstChild(NS.s, "sz")?.attribute("val").flatMap { Double($0) },
                            bold: flag(font?.firstChild(NS.s, "b")), italic: flag(font?.firstChild(NS.s, "i")),
                            underline: font?.firstChild(NS.s, "u").map { $0.attribute("val") ?? "single" },
                            strike: flag(font?.firstChild(NS.s, "strike")),
                            color: color(font?.firstChild(NS.s, "color"))),
                fill: .init(pattern: pattern?.attribute("patternType") ?? (fill?.firstChild(NS.s, "gradientFill") != nil ? "gradient" : nil),
                            foreground: color(pattern?.firstChild(NS.s, "fgColor")),
                            background: color(pattern?.firstChild(NS.s, "bgColor"))),
                border: .init(left: edge(border?.firstChild(NS.s, "left") ?? border?.firstChild(NS.s, "start")),
                              right: edge(border?.firstChild(NS.s, "right") ?? border?.firstChild(NS.s, "end")),
                              top: edge(border?.firstChild(NS.s, "top")), bottom: edge(border?.firstChild(NS.s, "bottom")),
                              diagonal: edge(border?.firstChild(NS.s, "diagonal"))),
                alignment: .init(horizontal: al?.attribute("horizontal"), vertical: al?.attribute("vertical"),
                                 wrapText: al?.attribute("wrapText") == "1" || al?.attribute("wrapText") == "true",
                                 indent: Int(al?.attribute("indent") ?? "0") ?? 0,
                                 rotation: al?.attribute("textRotation").flatMap { Int($0) },
                                 shrinkToFit: al?.attribute("shrinkToFit") == "1" || al?.attribute("shrinkToFit") == "true"))
        }
    }

    /// 12 màu theme theo THỨ TỰ CHỈ SỐ của Excel: lt1, dk1, lt2, dk2, accent1–6, hlink, folHlink. Rỗng nếu không có theme.
    func themePalette() -> [String] {
        guard let themePart = try? package.relatedPart(from: workbookPart, .theme), package.hasPart(themePart),
              let doc = try? package.xml(themePart),
              let scheme = doc.root.firstChild(NS.a, "themeElements")?.firstChild(NS.a, "clrScheme") else { return [] }
        func hex(_ name: String) -> String? {
            guard let c = scheme.firstChild(NS.a, name)?.elements.first else { return nil }
            return (c.attribute("val").flatMap { $0.count == 6 ? $0 : nil } ?? c.attribute("lastClr"))?.uppercased()
        }
        let order = ["lt1", "dk1", "lt2", "dk2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"]
        let values = order.map { hex($0) }
        return values.contains(where: { $0 == nil }) ? [] : values.map { $0! }
    }

    private func customIndexedColors(_ styles: StyleSheet) -> [String]? {
        guard let list = styles.container("colors", create: false)?.firstChild(NS.s, "indexedColors") else { return nil }
        let rgb = list.children(NS.s, "rgbColor").compactMap { $0.attribute("rgb").map { String($0.suffix(6)).uppercased() } }
        return rgb.isEmpty ? nil : rgb
    }

    /// Áp `tint` của Excel (−1…1) lên màu RGB: đổi sang HLS, chỉnh độ sáng, đổi lại.
    static func applyTint(_ hex: String, _ tint: Double) -> String {
        guard tint != 0, hex.count == 6, let v = UInt32(hex, radix: 16) else { return hex }
        let r = Double((v >> 16) & 0xFF) / 255, g = Double((v >> 8) & 0xFF) / 255, b = Double(v & 0xFF) / 255
        let mx = max(r, g, b), mn = min(r, g, b)
        var h = 0.0, s = 0.0
        var l = (mx + mn) / 2
        if mx != mn {
            let d = mx - mn
            s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn)
            if mx == r { h = (g - b) / d + (g < b ? 6 : 0) } else if mx == g { h = (b - r) / d + 2 } else { h = (r - g) / d + 4 }
            h /= 6
        }
        l = tint < 0 ? l * (1 + tint) : l * (1 - tint) + tint
        func hue(_ p: Double, _ q: Double, _ t0: Double) -> Double {
            var t = t0
            if t < 0 { t += 1 }; if t > 1 { t -= 1 }
            if t < 1.0 / 6 { return p + (q - p) * 6 * t }
            if t < 0.5 { return q }
            if t < 2.0 / 3 { return p + (q - p) * (2.0 / 3 - t) * 6 }
            return p
        }
        var (nr, ng, nb) = (l, l, l)
        if s != 0 {
            let q = l < 0.5 ? l * (1 + s) : l + s - l * s
            let p = 2 * l - q
            nr = hue(p, q, h + 1.0 / 3); ng = hue(p, q, h); nb = hue(p, q, h - 1.0 / 3)
        }
        func byte(_ x: Double) -> UInt32 { UInt32(max(0, min(255, (x * 255).rounded()))) }
        return String(format: "%02X%02X%02X", byte(nr), byte(ng), byte(nb))
    }

    /// Bảng màu indexed mặc định của SpreadsheetML (ECMA-376 18.8.27).
    static let defaultIndexed: [String] = [
        "000000", "FFFFFF", "FF0000", "00FF00", "0000FF", "FFFF00", "FF00FF", "00FFFF",
        "000000", "FFFFFF", "FF0000", "00FF00", "0000FF", "FFFF00", "FF00FF", "00FFFF",
        "800000", "008000", "000080", "808000", "800080", "008080", "C0C0C0", "808080",
        "9999FF", "993366", "FFFFCC", "CCFFFF", "660066", "FF8080", "0066CC", "CCCCFF",
        "000080", "FF00FF", "FFFF00", "00FFFF", "800080", "800000", "008080", "0000FF",
        "00CCFF", "CCFFFF", "CCFFCC", "FFFF99", "99CCFF", "FF99CC", "CC99FF", "FFCC99",
        "3366FF", "33CCCC", "99CC00", "FFCC00", "FF9900", "FF6600", "666699", "969696",
        "003366", "339966", "003300", "333300", "993300", "993366", "333399", "333333",
    ]
}
