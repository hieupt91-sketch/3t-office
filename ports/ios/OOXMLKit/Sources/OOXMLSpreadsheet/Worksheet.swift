import Foundation
import OOXMLPackage

public enum CellValue: Equatable, Sendable {
    case empty
    case number(Double)
    case string(String)
    case bool(Bool)
    case error(String)
}

public struct Cell: Equatable, Sendable {
    public let reference: CellReference
    public let value: CellValue
    /// Công thức (không có "="). Ô phụ thuộc của công thức chia sẻ được trả về dạng đã dịch.
    public let formula: String?
    public let formulaType: String?
    public let styleIndex: Int
    public let isRichText: Bool
}

/// Lề in theo đơn vị inch như trong OOXML.
public struct PageMargins: Equatable, Sendable {
    public let left: Double
    public let right: Double
    public let top: Double
    public let bottom: Double
    public let header: Double
    public let footer: Double

    public init(left: Double, right: Double, top: Double, bottom: Double, header: Double, footer: Double) {
        self.left = left
        self.right = right
        self.top = top
        self.bottom = bottom
        self.header = header
        self.footer = footer
    }
}

/// Hướng giấy cho thiết lập trang in.
public enum PageOrientation: String, Sendable {
    case portrait
    case landscape
}

/// Trạng thái hiển thị của một sheet.
public enum SheetState: String, Sendable {
    case visible
    case hidden
    case veryHidden
}

/// Quy tắc định dạng có điều kiện dạng OOXML. `formula` không bao gồm thẻ XML.
public struct CFRule: Equatable, Sendable {
    public let type: String
    public let `operator`: String?
    public let formula: [String]
    public let priority: Int
    public let differentialStyleID: Int?
    public let stopIfTrue: Bool

    public init(type: String, operator: String? = nil, formula: [String], priority: Int,
                differentialStyleID: Int? = nil, stopIfTrue: Bool = false) {
        self.type = type
        self.operator = `operator`
        self.formula = formula
        self.priority = priority
        self.differentialStyleID = differentialStyleID
        self.stopIfTrue = stopIfTrue
    }
}

/// Quy tắc nhập liệu theo chuẩn SpreadsheetML.
public struct DataValidationRule: Equatable, Sendable {
    public let type: String
    public let formula1: String?
    public let formula2: String?
    public let `operator`: String?
    public let allowBlank: Bool

    public init(type: String, formula1: String? = nil, formula2: String? = nil,
                operator: String? = nil, allowBlank: Bool = false) {
        self.type = type
        self.formula1 = formula1
        self.formula2 = formula2
        self.operator = `operator`
        self.allowBlank = allowBlank
    }
}

/// Các cờ SpreadsheetML ghi vào `<sheetProtection>`. Cờ `true` có nghĩa là thao tác đó được bảo vệ.
public struct SheetProtectionOptions: Equatable, Sendable {
    public let sheet: Bool
    public let objects: Bool
    public let scenarios: Bool
    public let formatCells: Bool
    public let formatColumns: Bool
    public let formatRows: Bool
    public let insertColumns: Bool
    public let insertRows: Bool
    public let deleteColumns: Bool
    public let deleteRows: Bool
    public let selectLockedCells: Bool
    public let selectUnlockedCells: Bool

    public init(sheet: Bool = true, objects: Bool = false, scenarios: Bool = false,
                formatCells: Bool = false, formatColumns: Bool = false, formatRows: Bool = false,
                insertColumns: Bool = false, insertRows: Bool = false, deleteColumns: Bool = false,
                deleteRows: Bool = false, selectLockedCells: Bool = false, selectUnlockedCells: Bool = false) {
        self.sheet = sheet
        self.objects = objects
        self.scenarios = scenarios
        self.formatCells = formatCells
        self.formatColumns = formatColumns
        self.formatRows = formatRows
        self.insertColumns = insertColumns
        self.insertRows = insertRows
        self.deleteColumns = deleteColumns
        self.deleteRows = deleteRows
        self.selectLockedCells = selectLockedCells
        self.selectUnlockedCells = selectUnlockedCells
    }
}

public struct WorksheetViewOptions: Equatable, Sendable {
    public let showGridLines: Bool
    public let showRowColumnHeaders: Bool
    public let zoomScale: Int?

    public init(showGridLines: Bool, showRowColumnHeaders: Bool, zoomScale: Int? = nil) {
        self.showGridLines = showGridLines
        self.showRowColumnHeaders = showRowColumnHeaders
        self.zoomScale = zoomScale
    }
}

public struct WorksheetPrintOptions: Equatable, Sendable {
    public let gridLines: Bool
    public let headings: Bool
    public let horizontalCentered: Bool
    public let verticalCentered: Bool

    public init(gridLines: Bool = false, headings: Bool = false,
                horizontalCentered: Bool = false, verticalCentered: Bool = false) {
        self.gridLines = gridLines
        self.headings = headings
        self.horizontalCentered = horizontalCentered
        self.verticalCentered = verticalCentered
    }
}

public enum SpreadsheetError: Error, Equatable, CustomStringConvertible {
    case notASpreadsheet
    case sheetNotFound(String)
    case notAWorksheet(String)
    case invalidReference(String)
    case invalidSheetName(String)
    case duplicateSheetName(String)
    case partOfArrayFormula(cell: String, range: String)
    case overlappingMerge(String)
    case stringTooLong(Int)
    case cannotDeleteLastVisibleSheet
    case invalidRowOperation(String)
    case invalidSetting(String)

    public var description: String {
        switch self {
        case .notASpreadsheet: return "Tệp không phải bảng tính XLSX"
        case .sheetNotFound(let n): return "Không có sheet \"\(n)\""
        case .notAWorksheet(let n): return "\"\(n)\" không phải trang tính (chart sheet/dialog sheet chỉ được giữ nguyên)"
        case .invalidReference(let r): return "Địa chỉ ô không hợp lệ: \(r)"
        case .invalidSheetName(let n): return "Tên sheet không hợp lệ: \"\(n)\" (1–31 ký tự, không chứa : \\ / ? * [ ])"
        case .duplicateSheetName(let n): return "Đã có sheet tên \"\(n)\""
        case .partOfArrayFormula(let c, let r): return "Ô \(c) thuộc công thức mảng \(r): chỉ sửa được ô đầu vùng"
        case .overlappingMerge(let r): return "Vùng gộp \(r) chồng lên vùng gộp khác"
        case .stringTooLong(let n): return "Chuỗi dài \(n) ký tự vượt giới hạn 32.767 của Excel"
        case .cannotDeleteLastVisibleSheet: return "Sổ tính phải còn ít nhất một sheet hiển thị"
        case .invalidRowOperation(let m): return "Không chèn/xóa hàng được: \(m)"
        case .invalidSetting(let m): return "Thiết lập bảng tính không hợp lệ: \(m)"
        }
    }
}

/// Một trang tính. Sửa trực tiếp trên DOM của sheetN.xml: chỉ phần tử ô/hàng được đụng tới thay đổi,
/// mọi phần khác (định dạng có điều kiện, xác thực, ảnh, bảng, extLst…) giữ nguyên.
public final class Worksheet {
    /// Giữ tham chiếu mạnh tới sổ: trang tính vẫn dùng được khi người gọi chỉ giữ trang tính.
    public let workbook: Workbook
    public internal(set) var name: String
    public let part: PartName
    let document: XDocument
    let sheetData: XElement
    private var rows: [Int: XElement] = [:]
    private var cellElements: [CellReference: XElement] = [:]
    private var hasImplicitReferences = false
    private var maxRowNumber = 0
    private var sharedMasters: [String: (ref: CellReference, formula: String)] = [:]
    private var arrayRanges: [(range: CellRange, master: CellReference)] = []

    static let worksheetOrder = ["sheetPr", "dimension", "sheetViews", "sheetFormatPr", "cols", "sheetData", "sheetCalcPr",
                                 "sheetProtection", "protectedRanges", "scenarios", "autoFilter", "sortState", "dataConsolidate",
                                 "customSheetViews", "mergeCells", "phoneticPr", "conditionalFormatting", "dataValidations",
                                 "hyperlinks", "printOptions", "pageMargins", "pageSetup", "headerFooter", "rowBreaks", "colBreaks",
                                 "customProperties", "cellWatches", "ignoredErrors", "smartTags", "drawing", "legacyDrawing",
                                 "legacyDrawingHF", "drawingHF", "picture", "oleObjects", "controls", "webPublishItems",
                                 "tableParts", "extLst"]
    static let cellChildOrder = ["f", "v", "is", "extLst"]

    init(workbook: Workbook, name: String, part: PartName) throws {
        self.workbook = workbook
        self.name = name
        self.part = part
        document = try workbook.package.xml(part)
        guard let sd = document.root.firstChild(NS.s, "sheetData") else {
            throw PackageError.invalidPart(part, "thiếu sheetData")
        }
        sheetData = sd
        buildIndex()
    }

    private func buildIndex() {
        rows.removeAll()
        maxRowNumber = 0
        cellElements.removeAll()
        sharedMasters.removeAll()
        arrayRanges.removeAll()
        var nextRow = 1
        for row in sheetData.children(NS.s, "row") {
            let r: Int
            if let s = row.attribute("r"), let v = Int(s) {
                r = v
            } else {
                r = nextRow
                hasImplicitReferences = true
            }
            nextRow = r + 1
            rows[r] = row
            maxRowNumber = max(maxRowNumber, r)
            var nextCol = 1
            for c in row.children(NS.s, "c") {
                let ref: CellReference
                if let s = c.attribute("r"), let v = CellReference(s) {
                    ref = v
                } else {
                    ref = CellReference(column: nextCol, row: r)
                    hasImplicitReferences = true
                }
                nextCol = ref.column + 1
                cellElements[ref] = c
                if let f = c.firstChild(NS.s, "f") {
                    let t = f.attribute("t")
                    if t == "shared", let si = f.attribute("si"), f.attribute("ref") != nil {
                        sharedMasters[si] = (ref, f.textContent)
                    } else if t == "array" || t == "dataTable", let rs = f.attribute("ref"), let range = CellRange(rs) {
                        arrayRanges.append((range, ref))
                    }
                }
            }
        }
    }

    // MARK: Đọc

    public func cell(_ ref: CellReference) -> Cell? {
        guard let c = cellElements[ref] else { return nil }
        return makeCell(ref, c)
    }

    public func cell(_ a1: String) throws -> Cell? {
        cell(try parse(a1))
    }

    public func value(_ a1: String) throws -> CellValue {
        try cell(a1)?.value ?? .empty
    }

    /// Mọi ô có trong tệp, theo thứ tự hàng rồi cột.
    public var cells: [Cell] {
        cellElements.keys.sorted().compactMap(cell)
    }

    /// Vùng thực sự có ô.
    public var usedRange: CellRange? {
        guard let first = cellElements.keys.first else { return nil }
        var r = CellRange(first, first)
        for k in cellElements.keys { r = r.union(CellRange(k, k)) }
        return r
    }

    public var mergedCells: [CellRange] {
        document.root.firstChild(NS.s, "mergeCells")?.children(NS.s, "mergeCell").compactMap { $0.attribute("ref").flatMap(CellRange.init) } ?? []
    }

    /// Liên kết: (ô, địa chỉ ngoài hoặc vị trí trong sổ).
    public var hyperlinks: [(cell: String, target: String)] {
        let rels = try? workbook.package.relationships(of: part)
        return document.root.firstChild(NS.s, "hyperlinks")?.children(NS.s, "hyperlink").compactMap { h in
            guard let ref = h.attribute("ref") else { return nil }
            if let rid = h.attribute("id", in: NS.r), let rel = rels?[rid] { return (ref, rel.target) }
            return h.attribute("location").map { (ref, $0) }
        } ?? []
    }

    /// Đặt hoặc thay liên kết ngoài hay liên kết tới vị trí trong workbook cho một ô.
    public func setHyperlink(at a1: String, target: String, location: String? = nil, isExternal: Bool = true) throws {
        let reference = try parse(a1)
        guard !target.isEmpty else { throw SpreadsheetError.invalidSetting("đích liên kết không được để trống") }
        let links = document.root.firstChild(NS.s, "hyperlinks") ?? {
            let element = XElement(name: q("hyperlinks"))
            document.root.insertChild(element, schemaOrder: Worksheet.worksheetOrder)
            return element
        }()
        let old = links.children(NS.s, "hyperlink").first { $0.attribute("ref") == reference.a1 }
        let oldID = old?.attribute("id", in: NS.r)
        old?.removeFromParent()
        let element = XElement(name: q("hyperlink"), attributes: [XAttribute(name: "ref", value: reference.a1)])
        if isExternal {
            let rels = try workbook.package.relationships(of: part)
            let rid = rels.addExternal(.hyperlink, target: target)
            element.setAttribute("r:id", rid)
        } else {
            element.setAttribute("location", location ?? target)
        }
        if let location, isExternal { element.setAttribute("location", location) }
        links.append(element)
        if let oldID, !links.children(NS.s, "hyperlink").contains(where: { $0.attribute("id", in: NS.r) == oldID }) {
            let rels = try workbook.package.relationships(of: part)
            rels.remove(id: oldID)
        }
        workbook.package.markModified(part)
    }

    /// Xóa siêu liên kết của ô và quan hệ ngoài tương ứng nếu quan hệ đó không còn được dùng.
    public func removeHyperlink(at a1: String) throws {
        let reference = try parse(a1)
        guard let links = document.root.firstChild(NS.s, "hyperlinks"),
              let element = links.children(NS.s, "hyperlink").first(where: { $0.attribute("ref") == reference.a1 }) else { return }
        let rid = element.attribute("id", in: NS.r)
        element.removeFromParent()
        if links.children(NS.s, "hyperlink").isEmpty { links.removeFromParent() }
        if let rid {
            let rels = try workbook.package.relationships(of: part)
            if !(document.root.firstChild(NS.s, "hyperlinks")?.children(NS.s, "hyperlink").contains { $0.attribute("id", in: NS.r) == rid } ?? false) {
                rels.remove(id: rid)
            }
        }
        workbook.package.markModified(part)
    }

    public func columnWidth(_ column: Int) -> Double? {
        for col in document.root.firstChild(NS.s, "cols")?.children(NS.s, "col") ?? [] {
            if let a = Int(col.attribute("min") ?? ""), let b = Int(col.attribute("max") ?? ""), (a...b).contains(column) {
                return Double(col.attribute("width") ?? "")
            }
        }
        return nil
    }

    public func rowHeight(_ row: Int) -> Double? {
        rows[row].flatMap { Double($0.attribute("ht") ?? "") }
    }

    /// Cố định số hàng và cột đầu của trang tính.
    /// Ô ngay sau vùng cố định trở thành ô đang chọn.
    /// Gọi `removeFreezePanes()` để bỏ cố định.
    public func setFreezePanes(rows frozenRows: Int, cols frozenColumns: Int) throws {
        guard frozenRows >= 0, frozenRows < CellReference.maxRow,
              frozenColumns >= 0, frozenColumns < CellReference.maxColumn,
              frozenRows > 0 || frozenColumns > 0 else {
            throw SpreadsheetError.invalidSetting("freeze panes cần ít nhất một hàng hoặc cột hợp lệ")
        }
        let view = sheetViewElement()
        for element in view.children(NS.s, "pane") { element.removeFromParent() }
        for element in view.children(NS.s, "selection") { element.removeFromParent() }

        let activePane: String
        if frozenRows > 0 && frozenColumns > 0 { activePane = "bottomRight" }
        else if frozenRows > 0 { activePane = "bottomLeft" }
        else { activePane = "topRight" }
        let topLeft = CellReference(column: frozenColumns + 1, row: frozenRows + 1).a1
        var attributes: [XAttribute] = []
        if frozenColumns > 0 { attributes.append(XAttribute(name: "xSplit", value: String(frozenColumns))) }
        if frozenRows > 0 { attributes.append(XAttribute(name: "ySplit", value: String(frozenRows))) }
        attributes += [XAttribute(name: "topLeftCell", value: topLeft),
                      XAttribute(name: "activePane", value: activePane),
                      XAttribute(name: "state", value: "frozen")]
        let pane = XElement(name: q("pane"), attributes: attributes)
        view.insertChild(pane, schemaOrder: ["pane", "selection", "pivotSelection"])
        let selection = XElement(name: q("selection"), attributes: [
            XAttribute(name: "pane", value: activePane), XAttribute(name: "activeCell", value: topLeft),
            XAttribute(name: "sqref", value: topLeft),
        ])
        view.insertChild(selection, schemaOrder: ["pane", "selection", "pivotSelection"])
        workbook.package.markModified(part)
    }

    /// Bỏ cố định hàng và cột trên trang tính hiện tại.
    /// Các ngăn và vùng chọn được tạo cùng trạng thái cố định sẽ bị xóa.
    /// Những ô và dữ liệu trong bảng không bị thay đổi.
    public func removeFreezePanes() throws {
        guard let view = document.root.firstChild(NS.s, "sheetViews")?.firstChild(NS.s, "sheetView"),
              !view.children(NS.s, "pane").isEmpty else { return }
        for element in view.children(NS.s, "pane") { element.removeFromParent() }
        for element in view.children(NS.s, "selection") { element.removeFromParent() }
        workbook.package.markModified(part)
    }

    /// Đặt tùy chọn hiển thị lưới, tiêu đề hàng/cột và mức thu phóng của sheet.
    public func setViewOptions(_ options: WorksheetViewOptions) throws {
        if let zoom = options.zoomScale, !(10...400).contains(zoom) {
            throw SpreadsheetError.invalidSetting("mức thu phóng phải từ 10 đến 400 phần trăm")
        }
        let view = sheetViewElement()
        view.setAttribute("showGridLines", options.showGridLines ? "1" : "0")
        view.setAttribute("showRowColHeaders", options.showRowColumnHeaders ? "1" : "0")
        if let zoom = options.zoomScale { view.setAttribute("zoomScale", String(zoom)) }
        workbook.package.markModified(part)
    }

    /// Đặt tùy chọn in đường lưới, tiêu đề hàng/cột và căn giữa trang.
    public func setPrintOptions(_ options: WorksheetPrintOptions) throws {
        let element = document.root.firstChild(NS.s, "printOptions") ?? {
            let node = XElement(name: q("printOptions"))
            document.root.insertChild(node, schemaOrder: Worksheet.worksheetOrder)
            return node
        }()
        element.setAttribute("gridLines", options.gridLines ? "1" : "0")
        element.setAttribute("gridLinesSet", "1")
        element.setAttribute("headings", options.headings ? "1" : "0")
        element.setAttribute("headingsSet", "1")
        element.setAttribute("horizontalCentered", options.horizontalCentered ? "1" : "0")
        element.setAttribute("verticalCentered", options.verticalCentered ? "1" : "0")
        workbook.package.markModified(part)
    }

    /// Đặt địa chỉ vùng lọc tự động cho trang tính.
    /// Các tiêu chí lọc hiện có trong vùng được giữ nguyên.
    /// Lưu workbook để ghi thay đổi vào tệp XLSX.
    public func setAutoFilter(range: CellRange) throws {
        let filter = document.root.firstChild(NS.s, "autoFilter") ?? {
            let element = XElement(name: q("autoFilter"))
            document.root.insertChild(element, schemaOrder: Worksheet.worksheetOrder)
            return element
        }()
        filter.setAttribute("ref", range.description)
        workbook.package.markModified(part)
    }

    /// Bỏ vùng lọc tự động của trang tính hiện tại.
    /// Dữ liệu và định dạng các ô trong vùng không bị thay đổi.
    /// Lưu workbook để ghi thay đổi vào tệp XLSX.
    public func removeAutoFilter() throws {
        guard let filter = document.root.firstChild(NS.s, "autoFilter") else { return }
        filter.removeFromParent()
        workbook.package.markModified(part)
    }

    /// Thêm một quy tắc định dạng có điều kiện cho vùng ô.
    /// Công thức được ghi trực tiếp vào `<formula>`; định dạng khác của sheet được giữ nguyên.
    public func addConditionalFormatting(range: CellRange, rule: CFRule) throws {
        let types: Set<String> = ["cellIs", "expression", "colorScale", "dataBar", "iconSet", "containsText",
                                  "notContainsText", "beginsWith", "endsWith", "containsBlanks", "notContainsBlanks",
                                  "containsErrors", "notContainsErrors", "timePeriod", "aboveAverage", "duplicateValues",
                                  "uniqueValues", "top10"]
        let operators: Set<String> = ["between", "notBetween", "equal", "notEqual", "greaterThan", "lessThan",
                                      "greaterThanOrEqual", "lessThanOrEqual"]
        guard types.contains(rule.type), rule.priority > 0,
              rule.differentialStyleID.map({ $0 >= 0 }) ?? true,
              rule.operator.map({ operators.contains($0) }) ?? true,
              (!(["cellIs", "expression"].contains(rule.type)) || !rule.formula.isEmpty) else {
            throw SpreadsheetError.invalidSetting("quy tắc định dạng có điều kiện không hợp lệ")
        }
        let formatting = XElement(name: q("conditionalFormatting"), attributes: [XAttribute(name: "sqref", value: range.description)])
        var attributes = [XAttribute(name: "type", value: rule.type), XAttribute(name: "priority", value: String(rule.priority))]
        if let op = rule.operator { attributes.append(XAttribute(name: "operator", value: op)) }
        if let style = rule.differentialStyleID { attributes.append(XAttribute(name: "dxfId", value: String(style))) }
        if rule.stopIfTrue { attributes.append(XAttribute(name: "stopIfTrue", value: "1")) }
        let ruleElement = XElement(name: q("cfRule"), attributes: attributes)
        for formula in rule.formula { ruleElement.append(XElement(name: q("formula"), children: [.text(formula)])) }
        formatting.append(ruleElement)
        document.root.insertChild(formatting, schemaOrder: Worksheet.worksheetOrder)
        workbook.package.markModified(part)
    }

    /// Xóa các quy tắc định dạng cho vùng đã chọn; truyền `nil` để xóa toàn bộ.
    public func clearConditionalFormatting(range: CellRange? = nil) throws {
        guard document.root.firstChild(NS.s, "conditionalFormatting") != nil else { return }
        let matches = document.root.children(NS.s, "conditionalFormatting").filter { element in
            guard let range else { return true }
            return element.attribute("sqref")?.split(whereSeparator: { $0.isWhitespace }).contains { String($0) == range.description } == true
        }
        guard !matches.isEmpty else { return }
        for element in matches { element.removeFromParent() }
        workbook.package.markModified(part)
    }

    /// Đặt hoặc xóa bảo vệ sheet; các cờ `true` trong options là thao tác bị khóa.
    /// Mật khẩu được ghi dưới dạng hash legacy 16-bit của SpreadsheetML, không mã hóa nội dung tệp.
    public func setSheetProtection(password: String? = nil, options: SheetProtectionOptions = SheetProtectionOptions()) throws {
        guard options.sheet else {
            document.root.firstChild(NS.s, "sheetProtection")?.removeFromParent()
            workbook.package.markModified(part)
            return
        }
        let protection = document.root.firstChild(NS.s, "sheetProtection") ?? {
            let element = XElement(name: q("sheetProtection"))
            document.root.insertChild(element, schemaOrder: Worksheet.worksheetOrder)
            return element
        }()
        let flags: [(String, Bool)] = [
            ("sheet", options.sheet), ("objects", options.objects), ("scenarios", options.scenarios),
            ("formatCells", options.formatCells), ("formatColumns", options.formatColumns),
            ("formatRows", options.formatRows), ("insertColumns", options.insertColumns),
            ("insertRows", options.insertRows), ("deleteColumns", options.deleteColumns),
            ("deleteRows", options.deleteRows), ("selectLockedCells", options.selectLockedCells),
            ("selectUnlockedCells", options.selectUnlockedCells),
        ]
        for (name, enabled) in flags { protection.setAttribute(name, enabled ? "1" : "0") }
        if let password { protection.setAttribute("password", Self.legacyPasswordHash(password)) }
        else { protection.removeAttribute("password") }
        workbook.package.markModified(part)
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

    /// Thêm một quy tắc kiểm tra dữ liệu cho vùng ô.
    public func addDataValidation(range: CellRange, validation: DataValidationRule) throws {
        let types: Set<String> = ["none", "whole", "decimal", "list", "date", "time", "textLength", "custom"]
        let operators: Set<String> = ["between", "notBetween", "equal", "notEqual", "greaterThan", "lessThan",
                                      "greaterThanOrEqual", "lessThanOrEqual"]
        guard types.contains(validation.type), validation.operator.map({ operators.contains($0) }) ?? true,
              validation.type != "list" || validation.formula1 != nil,
              validation.operator == nil || (validation.formula1 != nil && validation.formula2 != nil) else {
            throw SpreadsheetError.invalidSetting("quy tắc kiểm tra dữ liệu không hợp lệ")
        }
        let validations = document.root.firstChild(NS.s, "dataValidations") ?? {
            let element = XElement(name: q("dataValidations"))
            document.root.insertChild(element, schemaOrder: Worksheet.worksheetOrder)
            return element
        }()
        var attributes = [XAttribute(name: "type", value: validation.type),
                          XAttribute(name: "sqref", value: range.description)]
        if validation.allowBlank { attributes.append(XAttribute(name: "allowBlank", value: "1")) }
        if let op = validation.operator { attributes.append(XAttribute(name: "operator", value: op)) }
        let item = XElement(name: q("dataValidation"), attributes: attributes)
        if let formula = validation.formula1 { item.append(XElement(name: q("formula1"), children: [.text(formula)])) }
        if let formula = validation.formula2 { item.append(XElement(name: q("formula2"), children: [.text(formula)])) }
        validations.append(item)
        validations.setAttribute("count", String(validations.children(NS.s, "dataValidation").count))
        workbook.package.markModified(part)
    }

    /// Đặt màu thẻ bằng mã RGB 6 ký tự hoặc ARGB 8 ký tự.
    /// Mã RGB được tự thêm alpha `FF`; truyền chuỗi rỗng để xóa màu.
    /// Ví dụ: `setTabColor(rgbHex: "35A7FF")`.
    public func setTabColor(rgbHex: String) throws {
        let color = rgbHex.uppercased()
        if !color.isEmpty, !((color.count == 6 || color.count == 8) && color.allSatisfy({ $0.isHexDigit })) {
            throw SpreadsheetError.invalidSetting("màu tab cần 6 ký tự RGB hoặc 8 ký tự ARGB")
        }
        let properties = document.root.firstChild(NS.s, "sheetPr") ?? {
            let element = XElement(name: q("sheetPr"))
            document.root.insertChild(element, schemaOrder: Worksheet.worksheetOrder)
            return element
        }()
        if color.isEmpty {
            properties.firstChild(NS.s, "tabColor")?.removeFromParent()
        } else {
            let argb = color.count == 6 ? "FF" + color : color
            let tabColor = properties.firstChild(NS.s, "tabColor") ?? {
                let element = XElement(name: q("tabColor"))
                properties.insertChild(element, schemaOrder: ["tabColor", "outlinePr", "pageSetUpPr"])
                return element
            }()
            tabColor.setAttribute("rgb", argb)
        }
        if properties.elements.isEmpty { properties.removeFromParent() }
        workbook.package.markModified(part)
    }

    /// Đặt độ rộng cột theo đơn vị ký tự và tùy chọn ẩn cột.
    /// Giữ các thuộc tính định dạng khác trong dải cột ban đầu.
    /// Ví dụ: `setColumnWidth(col: 3, width: 18, hidden: false)`.
    public func setColumnWidth(col: Int, width: Double, hidden: Bool = false) throws {
        guard (1...CellReference.maxColumn).contains(col), width.isFinite, (0...255).contains(width) else {
            throw SpreadsheetError.invalidSetting("cột hoặc độ rộng nằm ngoài giới hạn")
        }
        setColumnWidth(col, width)
        try setColumnHidden(col: col, hidden: hidden)
    }

    /// Ẩn hoặc hiện một cột cụ thể.
    /// Các cột bên cạnh trong cùng dải không bị thay đổi.
    /// Ví dụ: `setColumnHidden(col: 3, hidden: true)`.
    public func setColumnHidden(col: Int, hidden: Bool) throws {
        guard (1...CellReference.maxColumn).contains(col) else {
            throw SpreadsheetError.invalidSetting("số cột nằm ngoài giới hạn")
        }
        let existing = document.root.firstChild(NS.s, "cols")?.children(NS.s, "col").first(where: {
            guard let first = Int($0.attribute("min") ?? ""), let last = Int($0.attribute("max") ?? ""), first <= last else { return false }
            return (first...last).contains(col)
        })
        guard hidden || existing != nil else { return }
        if let existing, (existing.attribute("hidden") == "1") == hidden { return }
        let cols = document.root.firstChild(NS.s, "cols") ?? {
            let element = XElement(name: q("cols"))
            document.root.insertChild(element, schemaOrder: Worksheet.worksheetOrder)
            return element
        }()
        let column = columnElement(col, in: cols)
        if hidden { column.setAttribute("hidden", "1") } else { column.removeAttribute("hidden") }
        workbook.package.markModified(part)
    }

    /// Đặt chiều cao hàng theo point và tùy chọn ẩn hàng.
    /// Hàng được đánh dấu chiều cao tùy chỉnh để trình đọc áp dụng giá trị.
    /// Ví dụ: `setRowHeight(row: 4, height: 24, hidden: false)`.
    public func setRowHeight(row: Int, height: Double, hidden: Bool = false) throws {
        guard (1...CellReference.maxRow).contains(row), height.isFinite, (0...409.5).contains(height) else {
            throw SpreadsheetError.invalidSetting("hàng hoặc chiều cao nằm ngoài giới hạn")
        }
        materializeIfNeeded()
        let element = rowElement(row)
        element.setAttribute("ht", Worksheet.format(height))
        element.setAttribute("customHeight", "1")
        if hidden { element.setAttribute("hidden", "1") } else { element.removeAttribute("hidden") }
        workbook.package.markModified(part)
    }

    /// Ẩn hoặc hiện một hàng cụ thể.
    /// Dữ liệu, công thức và định dạng của hàng được giữ nguyên.
    /// Ví dụ: `setRowHidden(row: 4, hidden: true)`.
    public func setRowHidden(row: Int, hidden: Bool) throws {
        guard (1...CellReference.maxRow).contains(row) else {
            throw SpreadsheetError.invalidSetting("số hàng nằm ngoài giới hạn")
        }
        guard hidden || rows[row] != nil else { return }
        materializeIfNeeded()
        let element = rowElement(row)
        if hidden {
            guard element.attribute("hidden") != "1" else { return }
            element.setAttribute("hidden", "1")
        } else {
            guard element.attribute("hidden") != nil else { return }
            element.removeAttribute("hidden")
        }
        workbook.package.markModified(part)
    }

    /// Thiết lập sáu lề, hướng giấy và mã khổ giấy cho trang in.
    /// Lề tính bằng inch; chiều cao hàng in không bị thay đổi.
    /// Lưu workbook để ghi cấu hình trang vào tệp XLSX.
    public func setPageSetup(margins: PageMargins, orientation: PageOrientation, paperSize: Int) throws {
        let values = [margins.left, margins.right, margins.top, margins.bottom, margins.header, margins.footer]
        guard values.allSatisfy({ $0.isFinite && $0 >= 0 }), (0...118).contains(paperSize) else {
            throw SpreadsheetError.invalidSetting("lề hoặc khổ giấy nằm ngoài giới hạn")
        }
        let marginsElement = document.root.firstChild(NS.s, "pageMargins") ?? {
            let element = XElement(name: q("pageMargins"))
            document.root.insertChild(element, schemaOrder: Worksheet.worksheetOrder)
            return element
        }()
        for (name, value) in zip(["left", "right", "top", "bottom", "header", "footer"], values) {
            marginsElement.setAttribute(name, Worksheet.format(value))
        }
        let setup = document.root.firstChild(NS.s, "pageSetup") ?? {
            let element = XElement(name: q("pageSetup"))
            document.root.insertChild(element, schemaOrder: Worksheet.worksheetOrder)
            return element
        }()
        setup.setAttribute("orientation", orientation.rawValue)
        setup.setAttribute("paperSize", String(paperSize))
        workbook.package.markModified(part)
    }

    /// Đặt vùng ô sẽ được in trên trang tính hiện tại.
    /// Vùng được lưu thành tên in cục bộ theo thứ tự sheet trong workbook.
    /// Ví dụ: `setPrintArea(range: CellRange("A1:F24")!)`.
    public func setPrintArea(range: CellRange) throws {
        try workbook.setPrintArea(range: range, for: self)
    }

    private func makeCell(_ ref: CellReference, _ c: XElement) -> Cell {
        let t = c.attribute("t")
        let vText = c.firstChild(NS.s, "v")?.textContent
        var rich = false
        let value: CellValue
        switch t {
        case "s":
            if let i = vText.flatMap({ Int($0.trimmingCharacters(in: .whitespaces)) }), let s = workbook.sharedStrings?[i] {
                value = .string(s)
                rich = workbook.sharedStrings?.isRichText(i) ?? false
            } else {
                value = .empty
            }
        case "inlineStr":
            if let isEl = c.firstChild(NS.s, "is") {
                value = .string(SharedStrings.text(of: isEl))
                rich = isEl.firstChild(NS.s, "r") != nil
            } else {
                value = vText.map { .string($0) } ?? .empty
            }
        case "str", "d": value = vText.map { .string(SharedStrings.unescape($0)) } ?? .string("")
        case "b": value = .bool(vText?.trimmingCharacters(in: .whitespaces) == "1" || vText == "true")
        case "e": value = vText.map { .error($0) } ?? .empty
        default:
            if let v = vText, let d = Double(v.trimmingCharacters(in: .whitespaces)) { value = .number(d) } else { value = .empty }
        }
        var formula: String?
        var ftype: String?
        if let f = c.firstChild(NS.s, "f") {
            ftype = f.attribute("t")
            let text = f.textContent
            if !text.isEmpty {
                formula = text
            } else if ftype == "shared", let si = f.attribute("si"), let m = sharedMasters[si] {
                formula = FormulaRewriter.shift(m.formula, rows: ref.row - m.ref.row, columns: ref.column - m.ref.column)
            }
        }
        return Cell(reference: ref, value: value, formula: formula, formulaType: ftype,
                    styleIndex: Int(c.attribute("s") ?? "0") ?? 0, isRichText: rich)
    }

    // MARK: Sửa

    /// Ghi giá trị (xóa công thức nếu có, giữ style của ô).
    public func setValue(_ value: CellValue, at a1: String) throws {
        let ref = try parse(a1)
        try prepareForEdit(ref)
        let hadFormula = cellElements[ref]?.firstChild(NS.s, "f") != nil
        let c = cellElement(ref)
        try write(value, formula: nil, into: c)
        if hadFormula { workbook.invalidateCalcChain() }
        touched(ref)
    }

    public func setValue(_ number: Double, at a1: String) throws { try setValue(.number(number), at: a1) }
    public func setValue(_ text: String, at a1: String) throws { try setValue(.string(text), at: a1) }

    /// Ghi công thức (không có "=" ở đầu cũng được). Không tính toán: giá trị đệm `cachedValue`
    /// (nếu có) được ghi kèm; Excel/ứng dụng sẽ tính lại khi mở (fullCalcOnLoad).
    public func setFormula(_ formula: String, at a1: String, cachedValue: CellValue = .empty) throws {
        let ref = try parse(a1)
        try prepareForEdit(ref)
        let text = formula.hasPrefix("=") ? String(formula.dropFirst()) : formula
        let c = cellElement(ref)
        try write(cachedValue, formula: text, into: c)
        workbook.invalidateCalcChain()
        touched(ref)
    }

    /// Xóa nội dung, giữ định dạng ô.
    public func clear(_ a1: String) throws {
        let ref = try parse(a1)
        guard let c = cellElements[ref] else { return }
        try prepareForEdit(ref)
        let hadFormula = c.firstChild(NS.s, "f") != nil
        try write(.empty, formula: nil, into: c)
        let style = c.attribute("s")
        if (style == nil || style == "0") && c.elements.isEmpty && c.attributes.allSatisfy({ $0.name == "r" || $0.name == "s" }) {
            c.removeFromParent()
            cellElements[ref] = nil
        }
        if hadFormula { workbook.invalidateCalcChain() }
        workbook.package.markModified(part)
        workbook.requestRecalculation()
    }

    public func setStyleIndex(_ index: Int, at a1: String) throws {
        let ref = try parse(a1)
        materializeIfNeeded()
        let c = cellElement(ref)
        if index == 0 { c.removeAttribute("s") } else { setAttributeAfterR(c, "s", String(index)) }
        workbook.package.markModified(part)
        updateDimension(ref)
    }

    /// Áp định dạng (đậm, nghiêng, màu, định dạng số…) cho ô — tạo style mới dựa trên style hiện có.
    public func applyFormat(_ change: CellFormatChange, at a1: String) throws {
        let ref = try parse(a1)
        guard let styles = workbook.styles else { return }
        let base = cell(ref)?.styleIndex ?? 0
        try setStyleIndex(styles.cellFormat(applying: change, to: base), at: ref.a1)
    }

    public func merge(_ rangeText: String) throws {
        guard let range = CellRange(rangeText) else { throw SpreadsheetError.invalidReference(rangeText) }
        if mergedCells.contains(where: { $0.intersects(range) }) { throw SpreadsheetError.overlappingMerge(rangeText) }
        let mc = document.root.firstChild(NS.s, "mergeCells") ?? {
            let e = XElement(name: q("mergeCells"))
            document.root.insertChild(e, schemaOrder: Worksheet.worksheetOrder)
            return e
        }()
        mc.append(XElement(name: q("mergeCell"), attributes: [XAttribute(name: "ref", value: range.description)]))
        mc.setAttribute("count", String(mc.children(NS.s, "mergeCell").count))
        workbook.package.markModified(part)
    }

    public func unmerge(_ rangeText: String) {
        guard let range = CellRange(rangeText), let mc = document.root.firstChild(NS.s, "mergeCells") else { return }
        for e in mc.children(NS.s, "mergeCell") where e.attribute("ref").flatMap(CellRange.init) == range {
            e.removeFromParent()
        }
        let n = mc.children(NS.s, "mergeCell").count
        if n == 0 { mc.removeFromParent() } else { mc.setAttribute("count", String(n)) }
        workbook.package.markModified(part)
    }

    /// Đặt độ rộng cột (đơn vị ký tự như Excel). Tách vùng <col min max> có sẵn để giữ thuộc tính các cột khác.
    public func setColumnWidth(_ column: Int, _ width: Double) {
        let cols = document.root.firstChild(NS.s, "cols") ?? {
            let e = XElement(name: q("cols"))
            document.root.insertChild(e, schemaOrder: Worksheet.worksheetOrder)
            return e
        }()
        var target: XElement?
        for col in cols.children(NS.s, "col") {
            guard let a = Int(col.attribute("min") ?? ""), let b = Int(col.attribute("max") ?? ""), (a...b).contains(column) else { continue }
            if a < column {
                let left = col.deepCopy()
                left.setAttribute("max", String(column - 1))
                cols.insert(left, before: col)
            }
            if b > column {
                let right = col.deepCopy()
                right.setAttribute("min", String(column + 1))
                cols.insert(right, after: col)
            }
            col.setAttribute("min", String(column))
            col.setAttribute("max", String(column))
            target = col
            break
        }
        let col = target ?? {
            let e = XElement(name: q("col"), attributes: [XAttribute(name: "min", value: String(column)),
                                                            XAttribute(name: "max", value: String(column))])
            if let after = cols.children(NS.s, "col").first(where: { (Int($0.attribute("min") ?? "") ?? 0) > column }) {
                cols.insert(e, before: after)
            } else {
                cols.append(e)
            }
            return e
        }()
        col.setAttribute("width", Worksheet.format(width))
        col.setAttribute("customWidth", "1")
        workbook.package.markModified(part)
    }

    public func setRowHeight(_ row: Int, _ height: Double) {
        materializeIfNeeded()
        let r = rowElement(row)
        r.setAttribute("ht", Worksheet.format(height))
        r.setAttribute("customHeight", "1")
        workbook.package.markModified(part)
    }

    // MARK: Nội bộ

    private func q(_ local: String) -> String {
        document.root.qualifiedName(local, in: NS.s).name
    }

    private func sheetViewElement() -> XElement {
        let views = document.root.firstChild(NS.s, "sheetViews") ?? {
            let element = XElement(name: q("sheetViews"))
            document.root.insertChild(element, schemaOrder: Worksheet.worksheetOrder)
            return element
        }()
        return views.firstChild(NS.s, "sheetView") ?? {
            let element = XElement(name: q("sheetView"), attributes: [XAttribute(name: "workbookViewId", value: "0")])
            views.insertChild(element, schemaOrder: ["sheetView"])
            return element
        }()
    }

    private func columnElement(_ column: Int, in cols: XElement) -> XElement {
        for element in cols.children(NS.s, "col") {
            guard let first = Int(element.attribute("min") ?? ""),
                  let last = Int(element.attribute("max") ?? ""), first <= last, (first...last).contains(column) else { continue }
            if first < column {
                let left = element.deepCopy()
                left.setAttribute("max", String(column - 1))
                cols.insert(left, before: element)
            }
            if last > column {
                let right = element.deepCopy()
                right.setAttribute("min", String(column + 1))
                cols.insert(right, after: element)
            }
            element.setAttribute("min", String(column))
            element.setAttribute("max", String(column))
            return element
        }
        let element = XElement(name: q("col"), attributes: [
            XAttribute(name: "min", value: String(column)), XAttribute(name: "max", value: String(column)),
        ])
        if let next = cols.children(NS.s, "col").first(where: { (Int($0.attribute("min") ?? "") ?? 0) > column }) {
            cols.insert(element, before: next)
        } else {
            cols.append(element)
        }
        return element
    }

    func parse(_ a1: String) throws -> CellReference {
        guard let r = CellReference(a1) else { throw SpreadsheetError.invalidReference(a1) }
        return r
    }

    /// Ghi thuộc tính r tường minh cho mọi hàng/ô trước khi chèn (nếu tệp dùng vị trí ngầm định).
    private func materializeIfNeeded() {
        guard hasImplicitReferences else { return }
        for (r, row) in rows { setAttributeFirst(row, "r", String(r)) }
        for (ref, c) in cellElements { setAttributeFirst(c, "r", ref.a1) }
        hasImplicitReferences = false
        workbook.package.markModified(part)
    }

    private func setAttributeFirst(_ e: XElement, _ name: String, _ value: String) {
        if e.attribute(name) != nil { e.setAttribute(name, value); return }
        e.attributes.insert(XAttribute(name: name, value: value), at: 0)
    }

    private func setAttributeAfterR(_ e: XElement, _ name: String, _ value: String) {
        if e.attribute(name) != nil { e.setAttribute(name, value); return }
        let i = (e.attributes.firstIndex { $0.name == "r" }).map { $0 + 1 } ?? 0
        e.attributes.insert(XAttribute(name: name, value: value), at: i)
    }

    private func prepareForEdit(_ ref: CellReference) throws {
        materializeIfNeeded()
        if let i = arrayRanges.firstIndex(where: { $0.range.contains(ref) }) {
            let (range, master) = arrayRanges[i]
            guard master == ref else {
                throw SpreadsheetError.partOfArrayFormula(cell: ref.a1, range: range.description)
            }
            // Sửa ô đầu của công thức mảng = xóa cả mảng (như Excel): các ô khác mất giá trị đệm.
            for (r, c) in cellElements where range.contains(r) && r != master {
                for v in c.children(NS.s, "v") { v.removeFromParent() }
                c.removeAttribute("t")
            }
            arrayRanges.remove(at: i)
            workbook.invalidateCalcChain()
        }
        if let f = cellElements[ref]?.firstChild(NS.s, "f"), f.attribute("t") == "shared",
           f.attribute("ref") != nil, let si = f.attribute("si") {
            expandSharedFormula(si)
        }
    }

    /// Đổi cả nhóm công thức chia sẻ thành công thức thường (đã dịch tham chiếu) để có thể sửa ô chủ.
    private func expandSharedFormula(_ si: String) {
        guard let master = sharedMasters[si] else { return }
        for (ref, c) in cellElements {
            guard let f = c.firstChild(NS.s, "f"), f.attribute("t") == "shared", f.attribute("si") == si else { continue }
            let text = FormulaRewriter.shift(master.formula, rows: ref.row - master.ref.row, columns: ref.column - master.ref.column)
            f.removeAttribute("t")
            f.removeAttribute("si")
            f.removeAttribute("ref")
            f.setText(text)
        }
        sharedMasters[si] = nil
        workbook.invalidateCalcChain()
        workbook.package.markModified(part)
    }

    private func rowElement(_ r: Int) -> XElement {
        if let row = rows[r] { return row }
        let row = XElement(name: q("row"), attributes: [XAttribute(name: "r", value: String(r))])
        if r > maxRowNumber {
            // Nhanh: thêm vào cuối, nhưng vẫn trước phần tử không phải <row> (nếu có).
            if let lastRow = rows[maxRowNumber] {
                if sheetData.children.last?.element === lastRow { sheetData.append(row) } else { sheetData.insert(row, after: lastRow) }
            } else {
                sheetData.insert(row, at: 0)
            }
        } else if let next = rows.keys.filter({ $0 > r }).min(), let after = rows[next] {
            sheetData.insert(row, before: after)
        } else {
            sheetData.append(row)
        }
        rows[r] = row
        maxRowNumber = max(maxRowNumber, r)
        return row
    }

    private func cellElement(_ ref: CellReference) -> XElement {
        if let c = cellElements[ref] { return c }
        let row = rowElement(ref.row)
        let c = XElement(name: q("c"), attributes: [XAttribute(name: "r", value: ref.a1)])
        var inserted = false
        for (i, node) in row.children.enumerated() {
            guard let e = node.element else { continue }
            if e.is(NS.s, "c"), let r = e.attribute("r").flatMap(CellReference.init), r.column > ref.column {
                row.insert(c, at: i)
                inserted = true
                break
            }
            if !e.is(NS.s, "c") {
                row.insert(c, at: i)
                inserted = true
                break
            }
        }
        if !inserted { row.append(c) }
        cellElements[ref] = c
        if let spans = row.attribute("spans") {
            let p = spans.split(separator: ":").compactMap { Int($0) }
            if p.count == 2 { row.setAttribute("spans", "\(min(p[0], ref.column)):\(max(p[1], ref.column))") }
        }
        return c
    }

    private func write(_ value: CellValue, formula: String?, into c: XElement) throws {
        c.removeChildren { node in
            guard let e = node.element else { return false }
            return e.is(NS.s, "f") || e.is(NS.s, "v") || e.is(NS.s, "is")
        }
        c.removeAttribute("t")
        c.removeAttribute("cm")
        c.removeAttribute("vm")
        var newChildren: [XElement] = []
        if let formula {
            let f = XElement(name: q("f"))
            f.setText(formula)
            newChildren.append(f)
        }
        func v(_ s: String) -> XElement {
            let e = XElement(name: q("v"))
            e.setText(s)
            return e
        }
        switch value {
        case .empty:
            break
        case .number(let d):
            if d.isFinite {
                newChildren.append(v(Worksheet.format(d)))
            } else {
                setAttributeAfterR(c, "t", "e")
                newChildren.append(v("#NUM!"))
            }
        case .string(let s):
            guard s.count <= 32_767 else { throw SpreadsheetError.stringTooLong(s.count) }
            if formula != nil {
                setAttributeAfterR(c, "t", "str")
                newChildren.append(v(SharedStrings.escape(s)))
            } else {
                let sst = try workbook.sharedStringsCreatingIfNeeded()
                setAttributeAfterR(c, "t", "s")
                newChildren.append(v(String(sst.index(for: s))))
            }
        case .bool(let b):
            setAttributeAfterR(c, "t", "b")
            newChildren.append(v(b ? "1" : "0"))
        case .error(let e):
            setAttributeAfterR(c, "t", "e")
            newChildren.append(v(e))
        }
        // t phải đứng sau s theo thói quen Excel (r, s, t).
        if let s = c.attribute("s"), let ti = c.attributes.firstIndex(where: { $0.name == "t" }),
           let si = c.attributes.firstIndex(where: { $0.name == "s" }), ti < si {
            c.removeAttribute("s")
            c.attributes.insert(XAttribute(name: "s", value: s), at: ti)
        }
        for e in newChildren { c.insertChild(e, schemaOrder: Worksheet.cellChildOrder) }
    }

    private func touched(_ ref: CellReference) {
        updateDimension(ref)
        workbook.package.markModified(part)
        workbook.requestRecalculation()
    }

    private func updateDimension(_ ref: CellReference) {
        let dim = document.root.firstChild(NS.s, "dimension") ?? {
            let e = XElement(name: q("dimension"), attributes: [XAttribute(name: "ref", value: ref.a1)])
            document.root.insertChild(e, schemaOrder: Worksheet.worksheetOrder)
            return e
        }()
        let current = dim.attribute("ref").flatMap(CellRange.init) ?? CellRange(ref, ref)
        dim.setAttribute("ref", current.union(CellRange(ref, ref)).description)
    }

    /// Dạng số như Excel ghi: số nguyên không có ".0", số thực dạng ngắn nhất khôi phục được.
    static func format(_ d: Double) -> String {
        if d == d.rounded(), abs(d) < 1e15 {
            return String(Int64(d))
        }
        return "\(d)".replacingOccurrences(of: "e", with: "E")
    }

    /// Đổi mọi nhóm công thức chia sẻ của sheet thành công thức thường.
    func expandAllSharedFormulas() {
        for si in Array(sharedMasters.keys) { expandSharedFormula(si) }
    }

    func reindex() { buildIndex() }

    /// Áp hàm đổi văn bản công thức cho mọi công thức/điều kiện/liên kết trong sheet (đổi tên sheet).
    func rewriteFormulas(_ transform: (String) -> String) -> Bool {
        var changed = false
        let formulaElements: Set<String> = ["f", "formula", "formula1", "formula2"]
        document.root.forEachDescendant { e in
            if formulaElements.contains(e.localName), e.elements.isEmpty {
                let old = e.textContent
                let new = transform(old)
                if new != old { e.setText(new); changed = true }
            }
            if e.is(NS.s, "hyperlink"), let loc = e.attribute("location") {
                let new = transform(loc)
                if new != loc { e.setAttribute("location", new); changed = true }
            }
        }
        if changed {
            buildIndex()
            workbook.package.markModified(part)
        }
        return changed
    }
}
