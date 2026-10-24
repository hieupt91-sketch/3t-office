import Foundation
import OOXMLPackage

/// Bảng chuỗi chia sẻ (xl/sharedStrings.xml). Chỉ THÊM mục mới ở cuối — không sửa/xóa mục cũ,
/// nên chỉ số mà các ô khác (và rich text) đang dùng luôn còn đúng.
public final class SharedStrings {
    let package: OPCPackage
    let part: PartName
    let document: XDocument
    private(set) var texts: [String] = []
    private(set) var richFlags: [Bool] = []
    private var plainIndex: [String: Int] = [:]

    init(package: OPCPackage, part: PartName) throws {
        self.package = package
        self.part = part
        document = try package.xml(part)
        for si in document.root.children(NS.s, "si") {
            let rich = si.firstChild(NS.s, "r") != nil
            let text = SharedStrings.text(of: si)
            if !rich, plainIndex[text] == nil { plainIndex[text] = texts.count }
            texts.append(text)
            richFlags.append(rich)
        }
    }

    /// Tạo phần sharedStrings mới cho workbook chưa có.
    static func create(in package: OPCPackage, workbookPart: PartName) throws -> SharedStrings {
        let part = PartName(workbookPart.directory + "/sharedStrings.xml")
        let root = XElement(name: "sst", attributes: [
            XAttribute(name: "xmlns", value: NS.s.primaryURI),
            XAttribute(name: "count", value: "0"), XAttribute(name: "uniqueCount", value: "0"),
        ])
        package.setXML(XDocument(root: root), for: part, contentType: ContentType.sharedStrings)
        try package.relationships(of: workbookPart).add(.sharedStrings, to: part)
        return try SharedStrings(package: package, part: part)
    }

    public var count: Int { texts.count }

    public subscript(index: Int) -> String? {
        texts.indices.contains(index) ? texts[index] : nil
    }

    public func isRichText(_ index: Int) -> Bool {
        richFlags.indices.contains(index) && richFlags[index]
    }

    /// Chỉ số của chuỗi thuần (dùng lại nếu đã có, ngược lại thêm mới).
    func index(for text: String) -> Int {
        bumpCount()
        if let i = plainIndex[text] { return i }
        let si = XElement(name: document.root.qualifiedName("si", in: NS.s).name)
        let t = XElement(name: document.root.qualifiedName("t", in: NS.s).name)
        if text.first?.isWhitespace == true || text.last?.isWhitespace == true || text.contains("\n") {
            t.setAttribute("xml:space", "preserve")
        }
        t.setText(SharedStrings.escape(text))
        si.append(t)
        document.root.append(si)
        let i = texts.count
        texts.append(text)
        richFlags.append(false)
        plainIndex[text] = i
        document.root.setAttribute("uniqueCount", String(texts.count))
        package.markModified(part)
        return i
    }

    private func bumpCount() {
        let c = Int(document.root.attribute("count") ?? "") ?? texts.count
        document.root.setAttribute("count", String(max(c + 1, texts.count + 1)))
        if document.root.attribute("uniqueCount") == nil {
            document.root.setAttribute("uniqueCount", String(texts.count))
        }
        package.markModified(part)
    }

    /// Văn bản của <si>/<is>: nối <t> trực tiếp và trong <r>; bỏ phiên âm <rPh>.
    static func text(of si: XElement) -> String {
        var s = ""
        for e in si.elements {
            if e.is(NS.s, "t") {
                s += e.textContent
            } else if e.is(NS.s, "r") {
                for t in e.children(NS.s, "t") { s += t.textContent }
            }
        }
        return unescape(s)
    }

    /// Giải mã _xHHHH_ (cách Excel lưu ký tự điều khiển).
    static func unescape(_ s: String) -> String {
        guard s.contains("_x") else { return s }
        var out = ""
        let chars = Array(s)
        var i = 0
        while i < chars.count {
            if chars[i] == "_", i + 6 < chars.count, chars[i + 1] == "x", chars[i + 6] == "_",
               let v = UInt32(String(chars[(i + 2)...(i + 5)]), radix: 16), let u = Unicode.Scalar(v) {
                out.unicodeScalars.append(u)
                i += 7
            } else {
                out.append(chars[i])
                i += 1
            }
        }
        return out
    }

    static func escape(_ s: String) -> String {
        var out = ""
        let scalars = Array(s.unicodeScalars)
        var i = 0
        while i < scalars.count {
            let u = scalars[i]
            if u.value < 0x20 && u != "\t" && u != "\n" {
                out += String(format: "_x%04X_", u.value)
            } else if u == "_", i + 6 < scalars.count, scalars[i + 1] == "x", scalars[i + 6] == "_",
                      UInt32(String(String.UnicodeScalarView(scalars[(i + 2)...(i + 5)])), radix: 16) != nil {
                out += "_x005F_"
            } else {
                out.unicodeScalars.append(u)
            }
            i += 1
        }
        return out
    }
}
