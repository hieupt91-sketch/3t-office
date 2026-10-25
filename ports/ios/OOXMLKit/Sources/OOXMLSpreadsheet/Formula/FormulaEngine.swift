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
    private var inputs: [String: [CellReference: FormulaCellInput]] = [:]
    private var computed: [CellAddress: CellValue] = [:]  // giá trị của ô công thức

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

    public func clear(sheet: String, at a1: String) {
        guard let s = canonicalName(sheet), let r = CellReference(a1) else { return }
        inputs[s]?[r] = nil
        computed[CellAddress(sheet: s, ref: r)] = nil
    }

    private func mutate(sheet: String, a1: String, _ body: (inout FormulaCellInput) -> Void) {
        guard let s = canonicalName(sheet), let r = CellReference(a1) else { return }
        var cell = inputs[s]?[r] ?? FormulaCellInput()
        body(&cell)
        inputs[s]?[r] = cell
        computed[CellAddress(sheet: s, ref: r)] = nil
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

        // Cạnh phụ thuộc: ô công thức nằm trong vùng được tham chiếu.
        for (addr, node) in nodes {
            guard let e = node.expr else { continue }
            var deps: Set<CellAddress> = []
            for (shName, range) in e.references {
                guard let sh = shName == nil ? addr.sheet : canonicalName(shName!) else { continue }
                let candidates = formulaCells[sh] ?? []
                for c in candidates where range.contains(c) { deps.insert(CellAddress(sheet: sh, ref: c)) }
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
        return FormulaEvaluator(context: Context(engine: self, current: addr.sheet)).evaluate(expr)
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
        func nonEmptyValues(sheet: String, range: CellRange) -> [CellValue] {
            let cells = engine.inputs[sheet] ?? [:]
            var out: [CellValue] = []
            for ref in cells.keys.filter({ range.contains($0) }).sorted() {
                let v = engine.currentValue(CellAddress(sheet: sheet, ref: ref))
                if case .empty = v { continue }
                out.append(v)
            }
            return out
        }
    }
}
