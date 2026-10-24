import Foundation
import OOXMLZip
import OOXMLPackage

public struct SheetInfo: Equatable, Sendable {
    public enum Kind: Sendable { case worksheet, chartsheet, other }
    public let name: String
    public let sheetId: Int
    public let state: String // visible | hidden | veryHidden
    public let part: PartName?
    public let kind: Kind
}

public struct DefinedName: Equatable, Sendable {
    public let name: String
    public let localSheetIndex: Int?
    public let formula: String
    public let hidden: Bool
}

public enum CalcMode: String, Sendable {
    case automatic
    case automaticExceptTables = "autoNoTable"
    case manual
}

public enum SheetThemePreset: Sendable {
    case ocean
}

/// Sổ tính XLSX/XLSM/XLTX. Mở → sửa → `save()`: chỉ các phần bị sửa được ghi lại.
public final class Workbook {
    public let package: OPCPackage
    public let workbookPart: PartName
    let document: XDocument
    public private(set) var sharedStrings: SharedStrings?
    public let styles: StyleSheet?
    private final class WeakSheet { weak var sheet: Worksheet?; init(_ s: Worksheet) { sheet = s } }
    /// Cache yếu (tránh vòng tham chiếu): mọi sửa đổi nằm trong DOM của gói, nên tạo lại Worksheet luôn nhất quán.
    private var loaded: [PartName: WeakSheet] = [:]
    private var calcChainInvalid = false
    private var needsRecalculation = false
    /// Khi đã sửa giá trị/công thức, đặt calcPr fullCalcOnLoad="1" để Excel tính lại giá trị đệm khi mở.
    public var forceFullCalculationOnLoad = true

    public convenience init(contentsOf url: URL) throws {
        try self.init(package: OPCPackage(contentsOf: url))
    }

    public convenience init(data: Data) throws {
        try self.init(package: OPCPackage(data: data))
    }

    public init(package: OPCPackage) throws {
        self.package = package
        guard let main = try? package.mainDocumentPart(), package.hasPart(main) else { throw SpreadsheetError.notASpreadsheet }
        workbookPart = main
        document = try package.xml(main)
        guard document.root.is(NS.s, "workbook") else { throw SpreadsheetError.notASpreadsheet }
        if let p = try package.relatedPart(from: main, .sharedStrings), package.hasPart(p) {
            sharedStrings = try SharedStrings(package: package, part: p)
        }
        if let p = try package.relatedPart(from: main, .styles), package.hasPart(p) {
            styles = try StyleSheet(package: package, part: p)
        } else {
            styles = nil
        }
    }

    // MARK: Sheet

    private var sheetsElement: XElement? { document.root.firstChild(NS.s, "sheets") }

    public var sheets: [SheetInfo] {
        guard let rels = try? package.relationships(of: workbookPart) else { return [] }
        return (sheetsElement?.children(NS.s, "sheet") ?? []).map { s in
            let rid = s.attribute("id", in: NS.r)
            let rel = rid.flatMap { rels[$0] }
            let kind: SheetInfo.Kind
            if let rel, RelationshipType.worksheet.matches(rel.type) { kind = .worksheet }
            else if let rel, RelationshipType.chartsheet.matches(rel.type) { kind = .chartsheet }
            else { kind = .other }
            return SheetInfo(name: s.attribute("name") ?? "", sheetId: Int(s.attribute("sheetId") ?? "") ?? 0,
                             state: s.attribute("state") ?? "visible", part: rel.flatMap(rels.targetPart), kind: kind)
        }
    }

    public var sheetNames: [String] { sheets.map(\.name) }

    /// Đặt sheet ở trạng thái hiện, ẩn hoặc ẩn sâu.
    /// Workbook luôn cần có ít nhất một sheet ở trạng thái hiện.
    /// Dùng `sheets` để đọc lại trạng thái sau khi cập nhật.
    public func setSheetState(named name: String, state: SheetState) throws {
        let all = sheets
        let elements = sheetsElement?.children(NS.s, "sheet") ?? []
        guard let index = all.firstIndex(where: { $0.name.caseInsensitiveCompare(name) == .orderedSame }),
              elements.indices.contains(index) else {
            throw SpreadsheetError.sheetNotFound(name)
        }
        let element = elements[index]
        if state != .visible && all.enumerated().filter({ $0.offset != index }).allSatisfy({ $0.element.state != "visible" }) {
            throw SpreadsheetError.cannotDeleteLastVisibleSheet
        }
        let value = state == .visible ? nil : state.rawValue
        guard element.attribute("state") != value else { return }
        if let value { element.setAttribute("state", value) } else { element.removeAttribute("state") }
        package.markModified(workbookPart)
    }

    /// Ghi chế độ tính toán OOXML. OOXMLKit không tự tính công thức; chế độ áp dụng khi mở bằng ứng dụng bảng tính.
    public func setCalculationOptions(calcMode: CalcMode, iterate: Bool, date1904: Bool) throws {
        let calcPr = document.root.firstChild(NS.s, "calcPr") ?? {
            let element = XElement(name: document.root.qualifiedName("calcPr", in: NS.s).name)
            document.root.insertChild(element, schemaOrder: Workbook.workbookOrder)
            return element
        }()
        calcPr.setAttribute("calcMode", calcMode.rawValue)
        calcPr.setAttribute("iterate", iterate ? "1" : "0")
        let workbookPr = document.root.firstChild(NS.s, "workbookPr") ?? {
            let element = XElement(name: document.root.qualifiedName("workbookPr", in: NS.s).name)
            document.root.insertChild(element, schemaOrder: Workbook.workbookOrder)
            return element
        }()
        workbookPr.setAttribute("date1904", date1904 ? "1" : "0")
        package.markModified(workbookPart)
    }

    /// Áp dụng bảng màu xanh dương cho chủ đề workbook; giữ nguyên hiệu ứng và phần mở rộng không liên quan.
    public func setTheme(preset: SheetThemePreset) throws {
        guard let themePart = try package.relatedPart(from: workbookPart, .theme), package.hasPart(themePart) else {
            throw SpreadsheetError.invalidSetting("workbook không có phần theme để cập nhật")
        }
        let theme = try package.xml(themePart)
        let themeElements = theme.root.firstChild(NS.a, "themeElements") ?? {
            let element = XElement(name: theme.root.qualifiedName("themeElements", in: NS.a).name)
            theme.root.insertChild(element, schemaOrder: ["themeElements", "objectDefaults", "extraClrSchemeList"])
            return element
        }()
        let colorScheme = themeElements.firstChild(NS.a, "clrScheme") ?? {
            let element = XElement(name: themeElements.qualifiedName("clrScheme", in: NS.a).name,
                                   attributes: [XAttribute(name: "name", value: "VN Office Ocean")])
            themeElements.insertChild(element, schemaOrder: ["clrScheme", "fontScheme", "fmtScheme"])
            return element
        }()
        let colors: [(String, String)] = [
            ("dk1", "000000"), ("lt1", "FFFFFF"), ("dk2", "1F1F1F"), ("lt2", "E7E6E6"),
            ("accent1", "0070C0"), ("accent2", "00B0F0"), ("accent3", "4472C4"),
            ("accent4", "70AD47"), ("accent5", "FFC000"), ("accent6", "ED7D31"),
            ("hlink", "0563C1"), ("folHlink", "954F72"),
        ]
        let colorOrder = ["dk1", "lt1", "dk2", "lt2", "accent1", "accent2", "accent3", "accent4", "accent5", "accent6", "hlink", "folHlink"]
        for (name, hex) in colors {
            for old in colorScheme.children(NS.a, name) { old.removeFromParent() }
            let color = XElement(name: colorScheme.qualifiedName(name, in: NS.a).name)
            color.append(XElement(name: color.qualifiedName("srgbClr", in: NS.a).name,
                                  attributes: [XAttribute(name: "val", value: hex)]))
            colorScheme.insertChild(color, schemaOrder: colorOrder)
        }
        for fontKind in ["majorFont", "minorFont"] {
            let fontScheme = themeElements.firstChild(NS.a, "fontScheme")
            if let font = fontScheme?.firstChild(NS.a, fontKind) {
                let latin = font.firstChild(NS.a, "latin") ?? {
                    let element = XElement(name: font.qualifiedName("latin", in: NS.a).name)
                    font.insertChild(element, schemaOrder: ["latin", "ea", "cs"])
                    return element
                }()
                latin.setAttribute("typeface", "Aptos")
            }
        }
        package.markModified(themePart)
    }

    /// Bật/tắt bảo vệ cấu trúc workbook bằng mật khẩu kiểu legacy SpreadsheetML nếu có.
    /// Hash mật khẩu 16-bit của định dạng này chỉ ngăn sửa nhầm, không mã hóa dữ liệu.
    public func setWorkbookProtection(lockStructure: Bool, password: String? = nil) throws {
        guard lockStructure || password == nil else {
            throw SpreadsheetError.invalidSetting("không thể đặt mật khẩu khi tắt bảo vệ workbook")
        }
        guard lockStructure else {
            document.root.firstChild(NS.s, "workbookProtection")?.removeFromParent()
            package.markModified(workbookPart)
            return
        }
        let protection = document.root.firstChild(NS.s, "workbookProtection") ?? {
            let element = XElement(name: document.root.qualifiedName("workbookProtection", in: NS.s).name)
            document.root.insertChild(element, schemaOrder: Workbook.workbookOrder)
            return element
        }()
        protection.setAttribute("lockStructure", "1")
        if let password { protection.setAttribute("workbookPassword", Self.legacyPasswordHash(password)) }
        else { protection.removeAttribute("workbookPassword") }
        package.markModified(workbookPart)
    }

    private static func legacyPasswordHash(_ password: String) -> String {
        var hash: UInt16 = 0
        for byte in password.utf16 {
            let rotate = (hash & 0x4000) != 0
            hash = (hash << 1) & 0x7fff
            if rotate { hash |= 1 }
            hash ^= byte
        }
        hash = ((hash & 0x4000) != 0 ? ((hash << 1) & 0x7fff) | 1 : (hash << 1) & 0x7fff)
        hash ^= UInt16(password.utf16.count)
        hash ^= 0xCE4B
        return String(format: "%04X", hash)
    }

    /// Lưu vùng in cục bộ dưới tên định nghĩa OOXML chuẩn.
    /// `localSheetId` được tính theo thứ tự sheet hiện tại trong workbook.
    /// Phương thức này được gọi từ `Worksheet.setPrintArea(range:)`.
    func setPrintArea(range: CellRange, for worksheet: Worksheet) throws {
        guard let index = sheets.firstIndex(where: { $0.name.caseInsensitiveCompare(worksheet.name) == .orderedSame }) else {
            throw SpreadsheetError.sheetNotFound(worksheet.name)
        }
        let definedNamesElement = document.root.firstChild(NS.s, "definedNames") ?? {
            let element = XElement(name: document.root.qualifiedName("definedNames", in: NS.s).name)
            document.root.insertChild(element, schemaOrder: Workbook.workbookOrder)
            return element
        }()
        let existing = definedNamesElement.children(NS.s, "definedName").first {
            $0.attribute("name") == "_xlnm.Print_Area" && $0.attribute("localSheetId") == String(index)
        }
        let sheetName = worksheet.name.replacingOccurrences(of: "'", with: "''")
        func absolute(_ reference: CellReference) -> String {
            "$\(CellReference.columnName(reference.column))$\(reference.row)"
        }
        let first = absolute(range.start)
        let last = range.start == range.end ? "" : ":\(absolute(range.end))"
        let formula = "'\(sheetName)'!\(first)\(last)"
        if let existing {
            guard existing.textContent != formula else { return }
            existing.setText(formula)
        } else {
            let name = XElement(name: document.root.qualifiedName("definedName", in: NS.s).name, attributes: [
                XAttribute(name: "name", value: "_xlnm.Print_Area"), XAttribute(name: "localSheetId", value: String(index)),
            ])
            name.setText(formula)
            definedNamesElement.append(name)
        }
        package.markModified(workbookPart)
    }

    public func worksheet(named name: String) throws -> Worksheet {
        guard let info = sheets.first(where: { $0.name.caseInsensitiveCompare(name) == .orderedSame }) else {
            throw SpreadsheetError.sheetNotFound(name)
        }
        return try worksheet(info)
    }

    public func worksheet(at index: Int) throws -> Worksheet {
        let all = sheets
        guard all.indices.contains(index) else { throw SpreadsheetError.sheetNotFound("#\(index)") }
        return try worksheet(all[index])
    }

    private func worksheet(_ info: SheetInfo) throws -> Worksheet {
        guard info.kind == .worksheet, let part = info.part else { throw SpreadsheetError.notAWorksheet(info.name) }
        if let w = loaded[part]?.sheet { return w }
        let w = try Worksheet(workbook: self, name: info.name, part: part)
        loaded[part] = WeakSheet(w)
        return w
    }

    public var isDate1904: Bool {
        let v = document.root.firstChild(NS.s, "workbookPr")?.attribute("date1904")
        return v == "1" || v == "true"
    }

    public var definedNames: [DefinedName] {
        (document.root.firstChild(NS.s, "definedNames")?.children(NS.s, "definedName") ?? []).map {
            DefinedName(name: $0.attribute("name") ?? "", localSheetIndex: $0.attribute("localSheetId").flatMap { Int($0) },
                        formula: $0.textContent, hidden: $0.attribute("hidden") == "1")
        }
    }

    static let workbookOrder = ["fileVersion", "fileSharing", "workbookPr", "workbookProtection", "bookViews", "sheets",
                                "functionGroups", "externalReferences", "definedNames", "calcPr", "oleSize",
                                "customWorkbookViews", "pivotCaches", "smartTagPr", "smartTagTypes", "webPublishing",
                                "fileRecoveryPr", "webPublishObjects", "extLst"]

    public static func validateSheetName(_ name: String) throws {
        let bad = CharacterSet(charactersIn: ":\\/?*[]")
        guard !name.isEmpty, name.count <= 31, name.rangeOfCharacter(from: bad) == nil,
              !name.hasPrefix("'"), !name.hasSuffix("'"), name.caseInsensitiveCompare("History") != .orderedSame else {
            throw SpreadsheetError.invalidSheetName(name)
        }
    }

    /// Thêm trang tính trống ở cuối.
    @discardableResult
    public func addWorksheet(named name: String) throws -> Worksheet {
        try Workbook.validateSheetName(name)
        if sheetNames.contains(where: { $0.caseInsensitiveCompare(name) == .orderedSame }) {
            throw SpreadsheetError.duplicateSheetName(name)
        }
        let part = package.uniquePartName(prefix: workbookPart.directory + "/worksheets/sheet", ext: "xml")
        let rootNS = NS.s.primaryURI
        let doc = try XDocument(string: """
        <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
        <worksheet xmlns="\(rootNS)" xmlns:r="\(NS.r.primaryURI)"><dimension ref="A1"/><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/><sheetData/><pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>
        """)
        package.setXML(doc, for: part, contentType: ContentType.worksheet)
        let rid = try package.relationships(of: workbookPart).add(.worksheet, to: part, reuseExisting: false)
        let sheets = sheetsElement ?? {
            let e = XElement(name: document.root.qualifiedName("sheets", in: NS.s).name)
            document.root.insertChild(e, schemaOrder: Workbook.workbookOrder)
            return e
        }()
        let nextId = (self.sheets.map(\.sheetId).max() ?? 0) + 1
        let (rName, needsDecl) = sheets.qualifiedName("id", in: NS.r)
        if needsDecl { document.root.setAttribute("xmlns:r", NS.r.primaryURI) }
        sheets.append(XElement(name: sheets.qualifiedName("sheet", in: NS.s).name, attributes: [
            XAttribute(name: "name", value: name), XAttribute(name: "sheetId", value: String(nextId)),
            XAttribute(name: rName, value: rid),
        ]))
        package.markModified(workbookPart)
        try updateAppTitles(append: name)
        let w = try Worksheet(workbook: self, name: name, part: part)
        loaded[part] = WeakSheet(w)
        return w
    }

    /// Đổi tên sheet và cập nhật mọi tham chiếu tới nó: công thức ô, tên định nghĩa, xác thực dữ liệu,
    /// định dạng có điều kiện, liên kết nội bộ, chuỗi dữ liệu biểu đồ, nguồn pivot cache, docProps/app.xml.
    public func renameSheet(_ old: String, to new: String) throws {
        try Workbook.validateSheetName(new)
        guard let el = sheetsElement?.children(NS.s, "sheet").first(where: { $0.attribute("name")?.caseInsensitiveCompare(old) == .orderedSame }) else {
            throw SpreadsheetError.sheetNotFound(old)
        }
        let oldName = el.attribute("name")!
        if oldName == new { return }
        if sheetNames.contains(where: { $0.caseInsensitiveCompare(new) == .orderedSame && $0.caseInsensitiveCompare(oldName) != .orderedSame }) {
            throw SpreadsheetError.duplicateSheetName(new)
        }
        el.setAttribute("name", new)
        let rewrite = { (f: String) in FormulaRewriter.renameSheet(f, from: oldName, to: new) }
        for dn in document.root.firstChild(NS.s, "definedNames")?.children(NS.s, "definedName") ?? [] {
            let t = dn.textContent
            let n = rewrite(t)
            if n != t { dn.setText(n) }
        }
        package.markModified(workbookPart)
        for info in sheets where info.kind == .worksheet {
            let ws = try worksheet(info)
            if ws.part == el.attribute("id", in: NS.r).flatMap({ try? package.relationships(of: workbookPart).targetPart(id: $0) }) ?? nil {
                ws.name = new
            }
            _ = ws.rewriteFormulas(rewrite)
        }
        for part in package.partNames {
            let ct = package.contentType(of: part) ?? ""
            if ct == ContentType.chart {
                let doc = try package.xml(part)
                var changed = false
                doc.root.forEachDescendant { e in
                    if e.is(NS.c, "f") {
                        let t = e.textContent
                        let n = rewrite(t)
                        if n != t { e.setText(n); changed = true }
                    }
                }
                if changed { package.markModified(part) }
            } else if ct.hasSuffix("pivotCacheDefinition+xml") {
                let doc = try package.xml(part)
                var changed = false
                doc.root.forEachDescendant { e in
                    if e.is(NS.s, "worksheetSource"), e.attribute("sheet") == oldName {
                        e.setAttribute("sheet", new)
                        changed = true
                    }
                }
                if changed { package.markModified(part) }
            }
        }
        try updateAppTitles(rename: oldName, to: new)
    }

    /// Xóa sheet: gỡ khỏi sổ, xóa phần sheet và mọi phần chỉ sheet đó dùng (ảnh, bình luận, bảng…),
    /// tham chiếu tới sheet trong công thức/tên/biểu đồ thành #REF! (như Excel), sửa localSheetId và tab đang chọn.
    public func deleteSheet(named name: String) throws {
        let all = sheets
        guard let index = all.firstIndex(where: { $0.name.caseInsensitiveCompare(name) == .orderedSame }) else {
            throw SpreadsheetError.sheetNotFound(name)
        }
        let info = all[index]
        let visibleOthers = all.enumerated().filter { $0.offset != index && $0.element.state == "visible" }
        guard !visibleOthers.isEmpty else { throw SpreadsheetError.cannotDeleteLastVisibleSheet }
        let el = sheetsElement!.children(NS.s, "sheet")[index]
        let rid = el.attribute("id", in: NS.r)
        el.removeFromParent()
        // Tên định nghĩa: bỏ tên cục bộ của sheet bị xóa, dịch chỉ số các sheet sau.
        if let dns = document.root.firstChild(NS.s, "definedNames") {
            for dn in dns.children(NS.s, "definedName") {
                if let l = dn.attribute("localSheetId").flatMap({ Int($0) }) {
                    if l == index { dn.removeFromParent(); continue }
                    if l > index { dn.setAttribute("localSheetId", String(l - 1)) }
                }
                let t = dn.textContent
                let n = FormulaRewriter.invalidateSheet(t, named: info.name)
                if n != t { dn.setText(n) }
            }
            if dns.elements.isEmpty { dns.removeFromParent() }
        }
        for view in document.root.firstChild(NS.s, "bookViews")?.children(NS.s, "workbookView") ?? [] {
            for attr in ["activeTab", "firstSheet"] {
                if let v = view.attribute(attr).flatMap({ Int($0) }), v >= index, v > 0 {
                    view.setAttribute(attr, String(v - 1))
                }
            }
        }
        package.markModified(workbookPart)
        if let part = info.part {
            var candidates = try package.partsReachable(from: part)
            candidates.insert(part)
            if let rid { try package.relationships(of: workbookPart).remove(id: rid) }
            package.removePart(part)
            loaded[part] = nil
            try package.removeUnreachable(among: candidates)
        }
        let rewrite = { (f: String) in FormulaRewriter.invalidateSheet(f, named: info.name) }
        for other in sheets where other.kind == .worksheet {
            _ = try worksheet(other).rewriteFormulas(rewrite)
        }
        try rewriteCharts(rewrite)
        try updateAppTitles(remove: info.name)
        invalidateCalcChain()
        requestRecalculation()
    }

    func rewriteCharts(_ rewrite: (String) -> String) throws {
        for part in package.partNames where package.contentType(of: part) == ContentType.chart {
            let doc = try package.xml(part)
            var changed = false
            doc.root.forEachDescendant { e in
                if e.is(NS.c, "f") {
                    let t = e.textContent
                    let n = rewrite(t)
                    if n != t { e.setText(n); changed = true }
                }
            }
            if changed { package.markModified(part) }
        }
    }

    /// Cập nhật TitlesOfParts trong docProps/app.xml (nếu có) để Office/Finder hiển thị đúng danh sách sheet.
    private func updateAppTitles(rename old: String? = nil, to new: String? = nil, append: String? = nil, remove: String? = nil) throws {
        guard let app = try package.relatedPart(from: .root, .extendedProperties), package.hasPart(app) else { return }
        let doc = try package.xml(app)
        let vt = XMLNamespace("http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes", prefix: "vt")
        guard let vector = doc.root.elements.first(where: { $0.localName == "TitlesOfParts" })?.firstChild(vt, "vector") else { return }
        let items = vector.children(vt, "lpstr")
        var changed = false
        if let old, let new {
            for e in items where e.textContent == old {
                e.setText(new)
                changed = true
            }
        }
        if let append {
            let existing = Set(sheetNames)
            let e = XElement(name: vector.qualifiedName("lpstr", in: vt).name)
            e.setText(append)
            if let last = items.last(where: { existing.contains($0.textContent) && $0.textContent != append }) {
                vector.insert(e, after: last)
            } else {
                vector.insert(e, at: 0)
            }
            vector.setAttribute("size", String(items.count + 1))
            // Cặp đầu tiên của HeadingPairs là số trang tính (tên nhóm có thể đã bản địa hóa).
            if let pairs = doc.root.elements.first(where: { $0.localName == "HeadingPairs" })?.firstChild(vt, "vector") {
                let variants = pairs.children(vt, "variant")
                if variants.count >= 2, let n = variants[1].firstChild(vt, "i4"), let c = Int(n.textContent) {
                    n.setText(String(c + 1))
                }
            }
            changed = true
        }
        if let remove, let item = items.first(where: { $0.textContent == remove }) {
            item.removeFromParent()
            vector.setAttribute("size", String(items.count - 1))
            if let pairs = doc.root.elements.first(where: { $0.localName == "HeadingPairs" })?.firstChild(vt, "vector") {
                let variants = pairs.children(vt, "variant")
                if variants.count >= 2, let n = variants[1].firstChild(vt, "i4"), let c = Int(n.textContent), c > 0 {
                    n.setText(String(c - 1))
                }
            }
            changed = true
        }
        if changed { package.markModified(app) }
    }

    // MARK: Trạng thái tính toán

    func sharedStringsCreatingIfNeeded() throws -> SharedStrings {
        if let s = sharedStrings { return s }
        let s = try SharedStrings.create(in: package, workbookPart: workbookPart)
        sharedStrings = s
        return s
    }

    func invalidateCalcChain() { calcChainInvalid = true }
    func requestRecalculation() { needsRecalculation = true }

    private func applyCalculationState() throws {
        if calcChainInvalid {
            // calcChain chỉ là bộ đệm thứ tự tính: xóa an toàn, Excel tự dựng lại.
            let rels = try package.relationships(of: workbookPart)
            for r in rels.filter(.calcChain) {
                if let p = rels.targetPart(r) { package.removePart(p) }
                rels.remove(id: r.id)
            }
            calcChainInvalid = false
        }
        if needsRecalculation && forceFullCalculationOnLoad {
            let calcPr = document.root.firstChild(NS.s, "calcPr") ?? {
                let e = XElement(name: document.root.qualifiedName("calcPr", in: NS.s).name)
                document.root.insertChild(e, schemaOrder: Workbook.workbookOrder)
                return e
            }()
            if calcPr.attribute("fullCalcOnLoad") != "1" {
                calcPr.setAttribute("fullCalcOnLoad", "1")
                package.markModified(workbookPart)
            }
            needsRecalculation = false
        }
    }

    // MARK: Lưu

    public func save() throws -> Data {
        try applyCalculationState()
        return try package.save()
    }

    /// Lưu an toàn (ghi tạm → kiểm tra → thay nguyên tử).
    public func save(to url: URL) throws {
        try applyCalculationState()
        try package.save(to: url)
    }

    // MARK: Ngày tháng

    /// Số sê-ri ngày của Excel → Date (UTC). Tính cả lỗi năm nhuận 1900 của Excel.
    public func date(fromSerial serial: Double) -> Date {
        let base: TimeInterval = isDate1904 ? -2_082_844_800 : -2_209_161_600 // 1904-01-01 / 1899-12-30
        var s = serial
        if !isDate1904 && s < 60 { s += 1 }
        return Date(timeIntervalSince1970: base + s * 86_400)
    }

    public func serial(from date: Date) -> Double {
        let base: TimeInterval = isDate1904 ? -2_082_844_800 : -2_209_161_600
        var s = (date.timeIntervalSince1970 - base) / 86_400
        if !isDate1904 && s < 61 { s -= 1 }
        return s
    }
}
