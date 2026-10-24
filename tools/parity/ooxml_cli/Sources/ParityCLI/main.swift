import Foundation
import OOXMLKit

// CLI doi chieu W2 (parity gate) â€” cac thao tac hop khi OOXMLKit cho XLSX/DOCX/PPTX:
//   ParityCLI pass         <in> <out>                        # mo -> luu khong sua (chuon trinh do chi BYTE-IDENTICAL)
//   ParityCLI xlsx-edit    <in> <out>                        # mo -> sua MOT O moi dat ngoai used range -> luu
//   ParityCLI docx-replace  <in> <out> [marker]               # mo -> thay chu dau doan van dau tien -> luu
//   ParityCLI pptx-title   <in> <out> [slide-idx] [title]    # mo -> doi tieu de slide -> luu
// In mot dong JSON duy nhat: {"status":"PASS"/"FAIL", ...}.

func jsonEscape(_ s: String) -> String {
    var escaped = String()
    escaped.reserveCapacity(s.count + 2)
    for ch in s.unicodeScalars {
        switch ch {
        case "\"": escaped += "\\\""
        case "\\": escaped += "\\\\"
        case "\n": escaped += "\\n"
        case "\r": escaped += "\\r"
        case "\t": escaped += "\\t"
        default: escaped.append(Character(ch))
        }
    }
    return escaped
}

final class ResultJSON {
    private var parts: [String] = []
    init() { parts.append("\"status\":\"PASS\"") }
    func add(_ key: String, _ value: Int) { parts.append("\"\(key)\":\(value)") }
    func addStr(_ key: String, _ value: String) { parts.append("\"\(key)\":\"\(jsonEscape(value))\"") }
    func fail(_ message: String) -> Never {
        print("{\"status\":\"FAIL\",\"error\":\"\(jsonEscape(message))\"}")
        exit(1)
    }
    func emit() -> Never {
        print("{" + parts.joined(separator: ",") + "}")
        exit(0)
    }
}

let argv = CommandLine.arguments
guard argv.count >= 4 else { 
    print("{\"status\":\"FAIL\",\"error\":\"usage: ParityCLI <pass|xlsx-edit|docx-replace|pptx-title> <in> <out> [args...]\"}")
    exit(2)
}

let op = argv[1]

switch op {
case "pass":
    let r = ResultJSON()
    do {
        let pkg = try OPCPackage(contentsOf: URL(fileURLWithPath: argv[2]))
        r.add("parts", pkg.partNames.count)
        try pkg.save(to: URL(fileURLWithPath: argv[3]))
        let attrs = try? FileManager.default.attributesOfItem(atPath: argv[3])
        let size = (attrs?[.size] as? Int) ?? 0
        r.add("savedBytes", size)
    } catch {
        r.fail("\(op): \(error)")
    }
    r.emit()

case "xlsx-edit":
    let r = ResultJSON()
    do {
        let pkg = try OPCPackage(contentsOf: URL(fileURLWithPath: argv[2]))
        let wb = try Workbook(package: pkg)
        guard !wb.sheets.isEmpty else { r.fail("xlsx-edit: khong co sheet nao") }
        let info = wb.sheets[0]
        let sheet = try wb.worksheet(at: 0)
        // O sua: hang moi hoi lon ben duoi used range cot A (cuoi bang), tranh vung gop/cong thuc/mang.
        var target = "A1"
        if let used = sheet.usedRange { target = "A\(used.end.row + 2)" }
        try sheet.setValue(.string("AGY-PARITY-EDIT"), at: target)
        r.addStr("editedCell", target)
        r.addStr("sheet", info.name)
        r.add("usedRangeEndRow", sheet.usedRange?.end.row ?? 0)
        r.add("cells", sheet.cells.count)
        try wb.save(to: URL(fileURLWithPath: argv[3]))
    } catch {
        r.fail("\(op): \(error)")
    }
    r.emit()

case "docx-replace":
    let r = ResultJSON()
    let marker = argv.count > 4 ? argv[4] : "AGYPAR"
    do {
        let pkg = try OPCPackage(contentsOf: URL(fileURLWithPath: argv[2]))
        let doc = try WordDocument(package: pkg)
        let paras = doc.paragraphs
        r.add("paragraphs", paras.count)
        let chosen = paras.first { $0.text.count >= 20 } ?? paras.first { !$0.text.isEmpty }
        guard let para = chosen else {
            r.fail("docx-replace: khong co doan van co chu")
        }
        // Thay doan dau (toi da 6 phan tu dau, toan ASCII) trong CHINH doan van do.
        let find = String(para.text.prefix(min(6, para.text.count)))
        let replacement = find + marker
        var replaced = para.replaceText(find, with: replacement)
        if replaced == 0 && para.text.count >= 20 {
            replaced = para.replaceText(para.text, with: para.text + " " + marker)
        }
        guard replaced > 0 else {
            r.fail("docx-replace: khong thay duoc chu (find=\"\(find)\")")
        }
        r.add("replaced", replaced)
        try doc.save(to: URL(fileURLWithPath: argv[3]))
    } catch {
        r.fail("\(op): \(error)")
    }
    r.emit()

case "pptx-title":
    let r = ResultJSON()
    let slideIndex = argv.count > 4 ? (Int(argv[4]) ?? 0) : 0
    let title = argv.count > 5 ? argv[5] : "AGY PARITY SLIDE"
    do {
        let pkg = try OPCPackage(contentsOf: URL(fileURLWithPath: argv[2]))
        let pres = try Presentation(package: pkg)
        guard pres.slides.count > slideIndex else { r.fail("pptx-title: khong co slide #\(slideIndex)") }
        r.add("slides", pres.slides.count)
        let slide = try pres.slide(at: slideIndex)
        if let titleShape = slide.titleShape {
            try titleShape.setText(title)
            r.addStr("edited", "title")
        } else {
            // Khong co khung tieu de: thay 6 ky tu dau cua noi dung text dau tien trong slide.
            var replaced = 0
            for shape in slide.shapes where shape.hasTextFrame && shape.text.count >= 6 {
                let find = String(shape.text.prefix(6))
                replaced = slide.replaceText(find, with: "AGYPAR", includeNotes: false)
                if replaced > 0 { break }
            }
            guard replaced > 0 else { r.fail("pptx-title: khong co khung tieu de cung khong thay duoc chu") }
            r.add("replaced", replaced)
        }
        r.addStr("newTitle", title)
        try pres.save(to: URL(fileURLWithPath: argv[3]))
    } catch {
        r.fail("\(op): \(error)")
    }
    r.emit()

default:
    print("{\"status\":\"FAIL\",\"error\":\"op khong ho tro: \(jsonEscape(op))\"}")
    exit(2)
}
