import Foundation
import OOXMLZip
import OOXMLPackage
import OOXMLSpreadsheet

// Dùng: ooxml-bench gen <bytes-xấp-xỉ> <đường-dẫn.xlsx>
//       ooxml-bench run <chế-độ> <đường-dẫn.xlsx>
// Chế độ: zip-list | open-eager | open-lazy | workbook-eager | workbook-lazy | save-eager | save-lazy
// Mỗi lần chạy là một tiến trình riêng để VmHWM (bộ nhớ đỉnh, Linux) không bị lẫn giữa các chế độ.

func now() -> Double { Double(DispatchTime.now().uptimeNanoseconds) / 1e9 }

func peakRSSKB() -> Int {
    guard let s = try? String(contentsOfFile: "/proc/self/status", encoding: .utf8) else { return -1 }
    for line in s.split(separator: "\n") where line.hasPrefix("VmHWM:") {
        return Int(line.split(separator: " ").dropFirst().first ?? "") ?? -1
    }
    return -1
}

func generate(targetBytes: Int, to path: String) throws {
    var seed: UInt64 = 0x9E3779B97F4A7C15
    func rnd() -> UInt64 { seed = seed &* 6364136223846793005 &+ 1442695040888963407; return seed >> 33 }
    func word() -> String { String(rnd(), radix: 36) + String(rnd(), radix: 36) }
    var strings: [String] = []
    var rows = ""
    var written = 0
    var r = 1
    // Ước lượng: dữ liệu ngẫu nhiên nén ~ 55–60%; sinh tới khi XML thô đạt ~2,75× mục tiêu (tệp ra ≈ mục tiêu).
    while written < targetBytes * 275 / 100 {
        var row = "<row r=\"\(r)\">"
        for c in 0..<6 {
            let col = String(UnicodeScalar(UInt8(65 + c)))
            if c % 2 == 0 {
                strings.append(word() + " " + word())
                row += "<c r=\"\(col)\(r)\" t=\"s\"><v>\(strings.count - 1)</v></c>"
            } else {
                row += "<c r=\"\(col)\(r)\"><v>\(rnd() % 1_000_000)</v></c>"
            }
        }
        row += "</row>"
        rows += row
        written += row.utf8.count + 40
        r += 1
    }
    let sheet = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><worksheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><sheetData>\(rows)</sheetData></worksheet>"
    let sst = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><sst xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" count=\"\(strings.count)\" uniqueCount=\"\(strings.count)\">"
        + strings.map { "<si><t>\($0)</t></si>" }.joined() + "</sst>"
    let ns = "http://schemas.openxmlformats.org/package/2006/relationships"
    let z = ZipArchive()
    z.setContents(Data("""
    <?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/></Types>
    """.utf8), for: "[Content_Types].xml")
    z.setContents(Data("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"\(ns)\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>".utf8), for: "_rels/.rels")
    z.setContents(Data("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><sheets><sheet name=\"Sheet1\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>".utf8), for: "xl/workbook.xml")
    z.setContents(Data("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?><Relationships xmlns=\"\(ns)\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet1.xml\"/><Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings\" Target=\"sharedStrings.xml\"/></Relationships>".utf8), for: "xl/_rels/workbook.xml.rels")
    z.setContents(Data(sheet.utf8), for: "xl/worksheets/sheet1.xml")
    z.setContents(Data(sst.utf8), for: "xl/sharedStrings.xml")
    var out = z.serialize()
    // Cắt/bù về gần mục tiêu bằng cách lặp lại việc sinh đã đủ lớn; ghi nguyên.
    try out.write(to: URL(fileURLWithPath: path))
    out.removeAll()
}

func run(mode: String, path: String) throws {
    let url = URL(fileURLWithPath: path)
    let size = (try FileManager.default.attributesOfItem(atPath: path)[.size] as? Int) ?? 0
    var detail = ""
    let t0 = now()
    switch mode {
    case "zip-list":
        let z = try ZipArchive(contentsOf: url)
        detail = "entries=\(z.entries.count)"
    case "open-eager":
        let p = try OPCPackage(contentsOf: url)
        detail = "parts=\(p.partNames.count) xmlParsed=\(p.loadedXMLPartCount)"
    case "open-lazy":
        let p = try OPCPackage(contentsOf: url, deferValidation: true)
        detail = "parts=\(p.partNames.count) xmlParsed=\(p.loadedXMLPartCount)"
    case "workbook-eager", "workbook-lazy":
        let wb = mode.hasSuffix("lazy") ? try Workbook(contentsOf: url, deferValidation: true) : try Workbook(contentsOf: url)
        detail = "sheets=\(wb.sheetNames.count) xmlParsed=\(wb.package.loadedXMLPartCount)"
    case "save-eager", "save-lazy":
        let wb = mode.hasSuffix("lazy") ? try Workbook(contentsOf: url, deferValidation: true) : try Workbook(contentsOf: url)
        let tOpen = now()
        try wb.worksheet(at: 0).setValue("bench", at: "A1")
        let out = FileManager.default.temporaryDirectory.appendingPathComponent("bench-out-\(getpid()).xlsx")
        try wb.save(to: out)
        try? FileManager.default.removeItem(at: out)
        detail = String(format: "open=%.3fs edit+save=%.3fs", tOpen - t0, now() - tOpen)
    default:
        FileHandle.standardError.write(Data("chế độ không hợp lệ: \(mode)\n".utf8)); exit(2)
    }
    let dt = now() - t0
    print(String(format: "%@ size=%.2fMB total=%.3fs peakRSS=%.1fMB %@", mode, Double(size) / 1e6, dt, Double(peakRSSKB()) / 1024, detail))
}

let a = CommandLine.arguments
do {
    if a.count == 4, a[1] == "gen", let n = Int(a[2]) { try generate(targetBytes: n, to: a[3]) }
    else if a.count == 4, a[1] == "run" { try run(mode: a[2], path: a[3]) }
    else { print("dùng: ooxml-bench gen <bytes> <out.xlsx> | run <mode> <file.xlsx>"); exit(2) }
} catch { print("LỖI: \(error)"); exit(1) }
