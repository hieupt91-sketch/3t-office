import Foundation

/// Địa chỉ ô đầy đủ (sheet + ô). `sheet` là tên chuẩn của sheet.
public struct CellAddress: Hashable, CustomStringConvertible, Sendable {
    public let sheet: String
    public let ref: CellReference
    public init(sheet: String, ref: CellReference) { self.sheet = sheet; self.ref = ref }
    public var description: String { "\(sheet)!\(ref.a1)" }
}

/// Nội dung đầu vào của một ô: hằng số hoặc công thức.
public struct FormulaCellInput: Equatable, Sendable {
    public var value: CellValue
    public var formula: String?
    public init(value: CellValue = .empty, formula: String? = nil) { self.value = value; self.formula = formula }
}

/// Engine tính công thức trong bộ nhớ: dựng đồ thị phụ thuộc, tính lại theo thứ tự topo,
/// phát hiện vòng lặp. Không đọc/ghi tệp; không mạng.
///
/// Quy ước lỗi: công thức sai cú pháp → `#NAME?`; ô nằm trong hoặc phụ thuộc vòng lặp → `#REF!`
/// (và liệt kê trong `circularCells` nếu chính nó thuộc vòng).
public final class FormulaEngine {
    private var sheetNames: [String] = []
    private var canonical: [String: String] = [:]         // lowercase → tên chuẩn
    private var inputs: [String: [CellReference: FormulaCellInput]] = [:] {
        didSet { columnIndexCache = [:] }
    }
    /// Chỉ mục (sheet → cột → hàng đã sắp xếp) của MỌI ô đầu vào, dựng lười và hủy khi đầu vào đổi. Đọc một vùng
    /// bằng tìm nhị phân thay vì quét mọi ô của sheet (trước đây mỗi lần đọc vùng tốn O(số ô) ⇒ O(F²) khi tính lại).
    private var columnIndexCache: [String: [Int: [Int]]] = [:]

    fileprivate func columnIndex(for sheet: String) -> [Int: [Int]] {
        if let cached = columnIndexCache[sheet] { return cached }
        var cols: [Int: [Int]] = [:]
        for ref in (inputs[sheet] ?? [:]).keys { cols[ref.column, default: []].append(ref.row) }
        for c in cols.keys { cols[c]!.sort() }
        columnIndexCache[sheet] = cols
        return cols
    }
    private var computed: [CellAddress: CellValue] = [:]  // giá trị của ô công thức
    private var arrayMembership: [CellAddress: CellRange] = [:] // ô -> vùng công thức mảng của nó
    /// Tên vùng M7: khóa (phạm vi cục bộ — tên chuẩn của sheet, hoặc nil = workbook, tên viết hoa).
    private var definedNames: [(scope: String?, name: String, sheet: String, range: CellRange)] = []
    /// Tên định nghĩa hằng/công thức M7 lát 17: đích là biểu thức (không phải vùng/ô).
    /// Cùng (phạm vi, tên) chỉ tồn tại một trong hai dạng: đăng ký dạng này ghi đè dạng kia.
    private var definedNameExprs: [(scope: String?, name: String, expr: FormulaExpr)] = []

    /// Đồng hồ cho TODAY()/NOW(); test có thể thay bằng giờ cố định.
    public var clock: () -> Date = { Date() }
    /// Múi giờ quy đổi "bây giờ" sang số serial ngày.
    public var timeZone: TimeZone = .current

    public private(set) var circularCells: [CellAddress] = []
    /// Thứ tự đã tính ở lần `recalculate()` gần nhất (chỉ ô công thức không bị vòng).
    public private(set) var evaluationOrder: [CellAddress] = []

    public init(sheets: [(name: String, cells: [CellReference: FormulaCellInput])] = []) {
        for s in sheets {
            addSheet(s.name)
            inputs[canonicalName(s.name)!] = s.cells
        }
    }

    public func addSheet(_ name: String) {
        guard canonical[name.lowercased()] == nil else { return }
        canonical[name.lowercased()] = name
        sheetNames.append(name)
        inputs[name] = [:]
    }

    public var sheets: [String] { sheetNames }

    func canonicalName(_ name: String) -> String? { canonical[name.lowercased()] }

    // MARK: Nhập liệu

    public func setValue(_ v: CellValue, sheet: String, at a1: String) {
        mutate(sheet: sheet, a1: a1) { $0 = FormulaCellInput(value: v, formula: nil) }
    }

    public func setFormula(_ f: String, sheet: String, at a1: String) {
        let text = f.hasPrefix("=") ? String(f.dropFirst()) : f
        mutate(sheet: sheet, a1: a1) { $0 = FormulaCellInput(value: .empty, formula: text) }
    }

    /// Đăng ký công thức mảng (CSE) cho cả vùng: mọi ô trong vùng mang cùng công thức,
    /// evaluator giao ngầm theo vị trí từng ô. Vùng quá lớn (> 100.000 ô) chỉ đăng ký ô chủ.
    public func setArrayFormula(_ f: String, sheet: String, range: CellRange) {
        guard let s = canonicalName(sheet) else { return }
        let text = f.hasPrefix("=") ? String(f.dropFirst()) : f
        let count = (range.end.row - range.start.row + 1) * (range.end.column - range.start.column + 1)
        guard count <= 100_000 else { setFormula(text, sheet: s, at: range.start.a1); return }
        for row in range.start.row...range.end.row {
            for col in range.start.column...range.end.column {
                let ref = CellReference(column: col, row: row)
                inputs[s]?[ref] = FormulaCellInput(value: .empty, formula: text)
                let addr = CellAddress(sheet: s, ref: ref)
                arrayMembership[addr] = range
                computed[addr] = nil
            }
        }
    }

    public func clear(sheet: String, at a1: String) {
        guard let s = canonicalName(sheet), let r = CellReference(a1) else { return }
        inputs[s]?[r] = nil
        computed[CellAddress(sheet: s, ref: r)] = nil
        arrayMembership[CellAddress(sheet: s, ref: r)] = nil
    }

    // MARK: Tên vùng (M7, lát 1: chỉ đích là vùng/ô)

    /// Đăng ký tên vùng. `localSheet == nil` = phạm vi workbook; ngược lại chỉ có hiệu lực
    /// trên sheet đó và ưu tiên hơn tên workbook cùng tên. Tên không phân biệt hoa/thường.
    /// Sheet cục bộ không tồn tại → bỏ qua; sheet đích lưu nguyên tên, lúc tính mới chuẩn hóa
    /// (sheet đích không còn → #REF! như Excel). Đăng ký lại cùng (phạm vi, tên) sẽ ghi đè.
    public func defineName(_ name: String, localSheet: String? = nil, sheet: String, range: CellRange) {
        let scope: String?
        if let ls = localSheet {
            guard let s = canonicalName(ls) else { return }
            scope = s
        } else {
            scope = nil
        }
        let key = name.uppercased()
        definedNames.removeAll { $0.scope == scope && $0.name == key }
        definedNameExprs.removeAll { $0.scope == scope && $0.name == key }
        definedNames.append((scope: scope, name: key, sheet: sheet, range: range))
    }

    /// Đăng ký tên định nghĩa hằng/công thức (M7 lát 17): đích là biểu thức tùy ý —
    /// hằng số (`0.1`, `"Giấy A4"`, `TRUE`), biểu thức dùng ô (`Data!A1+Data!A2`),
    /// hoặc dùng tên khác (`Tong2*2`). Ghi đè tên vùng cùng (phạm vi, tên).
    public func defineNameExpression(_ name: String, localSheet: String? = nil, expr: FormulaExpr) {
        let scope: String?
        if let ls = localSheet {
            guard let s = canonicalName(ls) else { return }
            scope = s
        } else {
            scope = nil
        }
        let key = name.uppercased()
        definedNames.removeAll { $0.scope == scope && $0.name == key }
        definedNameExprs.removeAll { $0.scope == scope && $0.name == key }
        definedNameExprs.append((scope: scope, name: key, expr: expr))
    }

    /// Đích của tên vùng cho sheet hiện tại: cục bộ trước, workbook sau.
    func resolveDefinedName(_ name: String, currentSheet: String) -> (sheet: String, range: CellRange)? {
        let key = name.uppercased()
        if let local = definedNames.first(where: { $0.scope == currentSheet && $0.name == key }) {
            return (local.sheet, local.range)
        }
        if let global = definedNames.first(where: { $0.scope == nil && $0.name == key }) {
            return (global.sheet, global.range)
        }
        return nil
    }

    /// Biểu thức đích của tên hằng/công thức cho sheet hiện tại: cục bộ trước, workbook sau.
    func resolveDefinedNameExpr(_ name: String, currentSheet: String) -> FormulaExpr? {
        let key = name.uppercased()
        if let local = definedNameExprs.first(where: { $0.scope == currentSheet && $0.name == key }) {
            return local.expr
        }
        if let global = definedNameExprs.first(where: { $0.scope == nil && $0.name == key }) {
            return global.expr
        }
        return nil
    }

    private func mutate(sheet: String, a1: String, _ body: (inout FormulaCellInput) -> Void) {
        guard let s = canonicalName(sheet), let r = CellReference(a1) else { return }
        var cell = inputs[s]?[r] ?? FormulaCellInput()
        body(&cell)
        inputs[s]?[r] = cell
        computed[CellAddress(sheet: s, ref: r)] = nil
        arrayMembership[CellAddress(sheet: s, ref: r)] = nil
    }

    // MARK: Đọc kết quả

    /// Giá trị ô sau lần tính gần nhất (ô công thức → kết quả; ô hằng → hằng; thiếu → .empty).
    public func value(sheet: String, at a1: String) -> CellValue {
        guard let s = canonicalName(sheet), let r = CellReference(a1) else { return .error(FormulaErrors.ref) }
        return currentValue(CellAddress(sheet: s, ref: r))
    }

    private func currentValue(_ a: CellAddress) -> CellValue {
        guard let cell = inputs[a.sheet]?[a.ref] else { return .empty }
        if cell.formula != nil { return computed[a] ?? .empty }
        return cell.value
    }

    // MARK: Tính lại

    private struct Node {
        var expr: FormulaExpr?
        var syntaxError: Bool
        var deps: Set<CellAddress> = []   // các ô công thức mà nó phụ thuộc
    }

    /// Tính lại toàn bộ theo thứ tự topo (thuật toán Kahn).
    @discardableResult
    public func recalculate() -> [CellAddress: CellValue] {
        computed.removeAll()
        circularCells = []
        evaluationOrder = []

        var nodes: [CellAddress: Node] = [:]
        var formulaCells: [String: [CellReference]] = [:]
        for sheet in sheetNames {
            for (ref, cell) in inputs[sheet] ?? [:] {
                guard let f = cell.formula else { continue }
                let addr = CellAddress(sheet: sheet, ref: ref)
                if let e = try? FormulaParser.parse(f) {
                    nodes[addr] = Node(expr: e, syntaxError: false)
                } else {
                    nodes[addr] = Node(expr: nil, syntaxError: true)
                }
                formulaCells[sheet, default: []].append(ref)
            }
        }

        // Cạnh phụ thuộc: ô công thức nằm trong vùng được tham chiếu (kể cả qua tên vùng M7).
        // Chỉ mục ô công thức theo (sheet, cột) → danh sách hàng đã sắp xếp: tìm ô công thức trong một vùng bằng
        // tìm nhị phân thay vì quét mọi ô công thức của sheet cho từng công thức (trước đây O(F²) trên sheet lớn).
        var columnIndex: [String: [Int: [Int]]] = [:]
        for (sheet, refs) in formulaCells {
            var cols: [Int: [Int]] = [:]
            for r in refs { cols[r.column, default: []].append(r.row) }
            for c in cols.keys { cols[c]!.sort() }
            columnIndex[sheet] = cols
        }
        for (addr, node) in nodes {
            guard let e = node.expr else { continue }
            var deps: Set<CellAddress> = []
            for (shName, range) in expandedReferences(e, currentSheet: addr.sheet, bound: []) {
                guard let sh = shName == nil ? addr.sheet : canonicalName(shName!) else { continue }
                guard let cols = columnIndex[sh] else { continue }
                for (column, rows) in cols where column >= range.start.column && column <= range.end.column {
                    // Hàng đầu tiên >= range.start.row.
                    var lo = 0, hi = rows.count
                    while lo < hi { let mid = (lo + hi) / 2; if rows[mid] < range.start.row { lo = mid + 1 } else { hi = mid } }
                    var k = lo
                    while k < rows.count, rows[k] <= range.end.row {
                        deps.insert(CellAddress(sheet: sh, ref: CellReference(column: column, row: rows[k])))
                        k += 1
                    }
                }
            }
            nodes[addr]!.deps = deps
        }

        var indegree: [CellAddress: Int] = [:]
        var dependents: [CellAddress: [CellAddress]] = [:]
        for (addr, node) in nodes {
            indegree[addr] = node.deps.count
            for d in node.deps { dependents[d, default: []].append(addr) }
        }
        // Thứ tự khởi đầu tất định.
        func less(_ a: CellAddress, _ b: CellAddress) -> Bool {
            let ia = sheetNames.firstIndex(of: a.sheet) ?? 0, ib = sheetNames.firstIndex(of: b.sheet) ?? 0
            return ia != ib ? ia < ib : a.ref < b.ref
        }
        var queue = nodes.keys.filter { indegree[$0] == 0 }.sorted(by: less)
        var head = 0
        while head < queue.count {
            let a = queue[head]; head += 1
            evaluationOrder.append(a)
            computed[a] = evaluate(a, node: nodes[a]!)
            var next: [CellAddress] = []
            for d in dependents[a] ?? [] {
                indegree[d]! -= 1
                if indegree[d]! == 0 { next.append(d) }
            }
            queue.append(contentsOf: next.sorted(by: less))
        }

        // Còn lại = nằm trong vòng hoặc phụ thuộc vào vòng.
        let remaining = nodes.keys.filter { computed[$0] == nil }.sorted(by: less)
        let remainingSet = Set(remaining)
        for a in remaining {
            computed[a] = .error(FormulaErrors.ref)
            if reaches(a, from: a, nodes: nodes, within: remainingSet) { circularCells.append(a) }
        }
        return computed
    }

    /// Mọi tham chiếu ô/vùng trong biểu thức, mở rộng tên vùng M7 thành đích của chúng.
    /// Tên bị LET ràng buộc trong phạm vi đó không mở rộng (đó là biến cục bộ, không phải tên vùng).
    /// Tên hằng/công thức (lát 17) mở rộng đệ quy theo biểu thức đích; `expanding` chặn vòng tên.
    private func expandedReferences(_ e: FormulaExpr, currentSheet: String, bound: Set<String>, expanding: Set<String> = []) -> [(sheet: String?, range: CellRange)] {
        switch e {
        case .cell(let s, let r): return [(s, CellRange(r, r))]
        case .range(let s, let r): return [(s, r)]
        case .unary(_, let x), .percent(let x):
            return expandedReferences(x, currentSheet: currentSheet, bound: bound, expanding: expanding)
        case .binary(_, let a, let b):
            return expandedReferences(a, currentSheet: currentSheet, bound: bound, expanding: expanding)
                + expandedReferences(b, currentSheet: currentSheet, bound: bound, expanding: expanding)
        case .name(let n):
            guard !bound.contains(n.uppercased()) else { return [] }
            if let (sh, r) = resolveDefinedName(n, currentSheet: currentSheet) { return [(sh, r)] }
            guard let ex = resolveDefinedNameExpr(n, currentSheet: currentSheet) else { return [] }
            let key = n.uppercased()
            guard !expanding.contains(key) else { return [] }
            return expandedReferences(ex, currentSheet: currentSheet, bound: bound, expanding: expanding.union([key]))
        case .apply(let c, let args):
            return expandedReferences(c, currentSheet: currentSheet, bound: bound, expanding: expanding)
                + args.flatMap { expandedReferences($0, currentSheet: currentSheet, bound: bound, expanding: expanding) }
        case .call(let name, let args):
            if name == "LAMBDA" {
                // Tham số là biến cục bộ của thân, không mở rộng thành tên vùng.
                var b = bound
                for a in args.dropLast() {
                    if case .name(let n) = a { b.insert(n.uppercased()) }
                }
                guard let last = args.last else { return [] }
                return expandedReferences(last, currentSheet: currentSheet, bound: b, expanding: expanding)
            }
            if name == "LET" {
                var out: [(sheet: String?, range: CellRange)] = []
                var b = bound
                var i = 0
                while i < args.count - 1 {
                    if case .name(let n) = args[i] {
                        out += expandedReferences(args[i + 1], currentSheet: currentSheet, bound: b, expanding: expanding)
                        b.insert(n.uppercased())
                    } else {
                        out += expandedReferences(args[i], currentSheet: currentSheet, bound: b, expanding: expanding)
                    }
                    i += 2
                }
                if let last = args.last { out += expandedReferences(last, currentSheet: currentSheet, bound: b, expanding: expanding) }
                return out
            }
            // M7 lát 28: tên định nghĩa chứa LAMBDA gọi như hàm — thân của nó cũng
            // có thể dùng ô (mở rộng đệ quy, chặn vòng bằng `expanding`).
            var out = args.flatMap { expandedReferences($0, currentSheet: currentSheet, bound: bound, expanding: expanding) }
            if let ex = resolveDefinedNameExpr(name, currentSheet: currentSheet) {
                let key = name.uppercased()
                if !expanding.contains(key) {
                    out += expandedReferences(ex, currentSheet: currentSheet, bound: bound, expanding: expanding.union([key]))
                }
            }
            return out
        default: return []
        }
    }

    /// `target` có đến được chính nó qua cạnh phụ thuộc (trong tập còn lại) không?
    private func reaches(_ target: CellAddress, from start: CellAddress, nodes: [CellAddress: Node], within set: Set<CellAddress>) -> Bool {
        var stack = Array(nodes[start]!.deps.filter { set.contains($0) })
        var seen = Set<CellAddress>()
        while let n = stack.popLast() {
            if n == target { return true }
            if !seen.insert(n).inserted { continue }
            stack.append(contentsOf: nodes[n]!.deps.filter { set.contains($0) })
        }
        return false
    }

    private func evaluate(_ addr: CellAddress, node: Node) -> CellValue {
        guard let expr = node.expr else { return .error(FormulaErrors.name) }
        var ev = FormulaEvaluator(context: Context(engine: self, current: addr.sheet))
        if let arr = arrayMembership[addr] { ev.position = addr.ref; ev.arrayOrigin = arr.start }
        return ev.evaluate(expr)
    }

    // MARK: Ngữ cảnh cho evaluator

    private struct Context: FormulaContext {
        let engine: FormulaEngine
        let current: String

        var nowSerial: Double {
            ExcelDate.serial(from: engine.clock(), timeZone: engine.timeZone)
        }
        func resolveSheet(_ name: String?) -> String? {
            name == nil ? current : engine.canonicalName(name!)
        }
        func cellValue(sheet: String, ref: CellReference) -> CellValue {
            engine.currentValue(CellAddress(sheet: sheet, ref: ref))
        }
        func definedNameTarget(_ name: String) -> (sheet: String, range: CellRange)? {
            engine.resolveDefinedName(name, currentSheet: current)
        }
        func definedNameExpr(_ name: String) -> FormulaExpr? {
            engine.resolveDefinedNameExpr(name, currentSheet: current)
        }
        func nonEmptyValues(sheet: String, range: CellRange) -> [CellValue] {
            var refs: [CellReference] = []
            for (column, rows) in engine.columnIndex(for: sheet) where column >= range.start.column && column <= range.end.column {
                var lo = 0, hi = rows.count
                while lo < hi { let mid = (lo + hi) / 2; if rows[mid] < range.start.row { lo = mid + 1 } else { hi = mid } }
                var k = lo
                while k < rows.count, rows[k] <= range.end.row {
                    refs.append(CellReference(column: column, row: rows[k]))
                    k += 1
                }
            }
            var out: [CellValue] = []
            for ref in refs.sorted() {
                let v = engine.currentValue(CellAddress(sheet: sheet, ref: ref))
                if case .empty = v { continue }
                out.append(v)
            }
            return out
        }
    }
}
