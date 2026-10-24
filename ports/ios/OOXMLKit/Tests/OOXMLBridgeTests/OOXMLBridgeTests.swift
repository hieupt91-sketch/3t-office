import XCTest
@testable import OOXMLBridge
import OOXMLTestSupport

/// Test cầu nối ở mức GIAO THỨC JSON (như WebView gọi): mỗi op đi qua handle(_:) JSON thật.
final class OOXMLBridgeTests: XCTestCase {
    let bridge = OOXMLBridge()

    /// Gửi 1 yêu cầu JSON, trả về result (bắt buộc ok), hoặc fail.
    @discardableResult
    func call(_ op: String, _ args: [String: Any] = [:], file: StaticString = #filePath, line: UInt = #line) throws -> [String: Any] {
        let req = try JSONSerialization.data(withJSONObject: ["id": 1, "op": op, "args": args])
        let resp = try JSONSerialization.jsonObject(with: bridge.handle(req)) as! [String: Any]
        if resp["ok"] as? Bool != true {
            let err = resp["error"] as? [String: Any]
            XCTFail("op \(op) lỗi: \(err ?? [:])", file: file, line: line)
            throw BridgeError("test", "\(err ?? [:])")
        }
        XCTAssertEqual(resp["id"] as? Int, 1, file: file, line: line)
        return resp["result"] as? [String: Any] ?? [:]
    }

    func callExpectingError(_ op: String, _ args: [String: Any]) throws -> [String: Any] {
        let req = try JSONSerialization.data(withJSONObject: ["id": 9, "op": op, "args": args])
        let resp = try JSONSerialization.jsonObject(with: bridge.handle(req)) as! [String: Any]
        XCTAssertEqual(resp["ok"] as? Bool, false)
        return resp["error"] as? [String: Any] ?? [:]
    }

    func openFixture(_ path: String) throws -> String {
        let b64 = try Fixtures.data(path).base64EncodedString()
        let r = try call("open", ["base64": b64])
        return r["handle"] as! String
    }

    // MARK: XLSX

    func testWorkbookOpenReadEditExport() throws {
        let h = try openFixture("xlsx/rich-excel.xlsx")
        let info = try call("info", ["handle": h])
        XCTAssertEqual(info["kind"] as? String, "xlsx")
        XCTAssertEqual((info["sheets"] as? [[String: Any]])?.count, 3)

        // Đọc vùng.
        let read = try call("sheet.read", ["handle": h, "sheet": "Dữ liệu", "range": "A1:E2"])
        let cells = read["cells"] as! [[String: Any]]
        let a1 = cells.first { $0["ref"] as? String == "A1" }!
        XCTAssertEqual((a1["value"] as! [String: Any])["v"] as? String, "Mã")
        let e2 = cells.first { $0["ref"] as? String == "E2" }!
        XCTAssertEqual(e2["formula"] as? String, "C2*D2")

        // Sửa giá trị + công thức + định dạng.
        try call("sheet.setValue", ["handle": h, "sheet": "Dữ liệu", "ref": "C3", "value": ["t": "n", "v": 250]])
        try call("sheet.setValue", ["handle": h, "sheet": "Dữ liệu", "ref": "F2", "value": ["t": "s", "v": "ghi chú"]])
        try call("sheet.setFormula", ["handle": h, "sheet": "Dữ liệu", "ref": "G2", "formula": "C2*2", "cached": ["t": "n", "v": 1000]])
        try call("sheet.format", ["handle": h, "sheet": "Dữ liệu", "ref": "F2", "change": ["bold": true, "fillColor": "FFFFFF00"]])

        // Xuất bytes → mở lại bằng bridge mới → kiểm.
        let b64 = try call("exportBytes", ["handle": h])["base64"] as! String
        let h2 = try call("open", ["base64": b64])["handle"] as! String
        let re = try call("sheet.read", ["handle": h2, "sheet": "Dữ liệu", "range": "C3:G3"])
        let c3 = (re["cells"] as! [[String: Any]]).first { $0["ref"] as? String == "C3" }!
        XCTAssertEqual((c3["value"] as! [String: Any])["v"] as? Double, 250)
        let reF = try call("sheet.read", ["handle": h2, "sheet": "Dữ liệu", "range": "F2:G2"])
        let g2 = (reF["cells"] as! [[String: Any]]).first { $0["ref"] as? String == "G2" }!
        XCTAssertEqual(g2["formula"] as? String, "C2*2")
    }

    func testSheetStructuralOps() throws {
        let h = try openFixture("xlsx/rich-excel.xlsx")
        try call("sheet.insertRows", ["handle": h, "sheet": "Dữ liệu", "at": 3, "count": 2])
        try call("sheet.add", ["handle": h, "name": "Mới"])
        try call("sheet.rename", ["handle": h, "old": "Tổng hợp", "new": "TH"])
        try call("sheet.delete", ["handle": h, "name": "Ẩn"])
        let info = try call("info", ["handle": h])
        let names = (info["sheets"] as! [[String: Any]]).map { $0["name"] as! String }
        XCTAssertEqual(names, ["Dữ liệu", "TH", "Mới"])
        // hàng 3 cũ (Bút bi) đã xuống hàng 5 sau khi chèn 2 hàng
        let read = try call("sheet.read", ["handle": h, "sheet": "Dữ liệu", "range": "B5:B5"])
        XCTAssertEqual(((read["cells"] as! [[String: Any]]).first?["value"] as? [String: Any])?["v"] as? String, "Bút bi Thiên Long")
    }

    func testRealWorkbookThroughBridge() throws {
        for f in Fixtures.list("real", extensions: ["xlsx"]) {
            let h = try openFixture(f)
            let info = try call("info", ["handle": h])
            XCTAssertEqual(info["kind"] as? String, "xlsx")
            try call("sheet.setValue", ["handle": h, "sheetIndex": 0, "ref": "AZ900", "value": ["t": "s", "v": "bridge"]])
            let b64 = try call("exportBytes", ["handle": h])["base64"] as! String
            let h2 = try call("open", ["base64": b64])["handle"] as! String
            let re = try call("sheet.read", ["handle": h2, "sheetIndex": 0, "range": "AZ900:AZ900"])
            XCTAssertEqual(((re["cells"] as! [[String: Any]]).first?["value"] as? [String: Any])?["v"] as? String, "bridge", f)
        }
    }

    // MARK: DOCX

    func testWordThroughBridge() throws {
        let h = try openFixture("docx/rich-word.docx")
        let info = try call("info", ["handle": h])
        XCTAssertEqual(info["kind"] as? String, "docx")
        let read = try call("doc.read", ["handle": h, "from": 0, "count": 2])
        let ps = read["paragraphs"] as! [[String: Any]]
        XCTAssertEqual(ps[0]["text"] as? String, "BÁO CÁO TỔNG KẾT NĂM 2026")
        XCTAssertEqual(ps[0]["style"] as? String, "Heading1")
        try call("doc.setText", ["handle": h, "index": 0, "text": "BÁO CÁO (BẢN CẦU NỐI)"])
        let n = try call("doc.replace", ["handle": h, "find": "Công ty TNHH 3T", "replace": "3T Group"])["count"] as! Int
        XCTAssertGreaterThan(n, 0)
        try call("doc.appendParagraph", ["handle": h, "text": "Dòng mới qua cầu nối"])
        let b64 = try call("exportBytes", ["handle": h])["base64"] as! String
        let h2 = try call("open", ["base64": b64])["handle"] as! String
        let re = try call("doc.read", ["handle": h2])["paragraphs"] as! [[String: Any]]
        XCTAssertEqual(re[0]["text"] as? String, "BÁO CÁO (BẢN CẦU NỐI)")
        XCTAssertEqual(re.last?["text"] as? String, "Dòng mới qua cầu nối")
    }

    // MARK: PPTX

    func testPresentationThroughBridge() throws {
        let h = try openFixture("pptx/rich-deck.pptx")
        XCTAssertEqual(try call("info", ["handle": h])["slides"] as? Int, 3)
        let s0 = try call("slide.read", ["handle": h, "index": 0])
        XCTAssertEqual(s0["title"] as? String, "Kế hoạch kinh doanh 2027")
        XCTAssertTrue((s0["notes"] as? String)?.contains("Chào mừng") ?? false)
        try call("slide.setText", ["handle": h, "index": 0, "shape": "Tiêu đề 1", "text": "Kế hoạch 2028"])
        try call("slide.setNotes", ["handle": h, "index": 2, "text": "Ghi chú cuối"])
        try call("slide.delete", ["handle": h, "index": 1])
        let b64 = try call("exportBytes", ["handle": h])["base64"] as! String
        let h2 = try call("open", ["base64": b64])["handle"] as! String
        XCTAssertEqual(try call("info", ["handle": h2])["slides"] as? Int, 2)
        XCTAssertEqual(try call("slide.read", ["handle": h2, "index": 0])["title"] as? String, "Kế hoạch 2028")
        XCTAssertEqual(try call("slide.read", ["handle": h2, "index": 1])["notes"] as? String, "Ghi chú cuối")
    }

    // MARK: Lỗi

    func testErrorsAreStructured() throws {
        XCTAssertEqual(try callExpectingError("open", ["base64": "@@@"])["code"] as? String, "open")
        XCTAssertEqual(try callExpectingError("info", ["handle": "khong-co"])["code"] as? String, "handle")
        XCTAssertEqual(try callExpectingError("khongCoOp", [:])["code"] as? String, "op")
        let h = try openFixture("docx/rich-word.docx")
        XCTAssertEqual(try callExpectingError("sheet.read", ["handle": h])["code"] as? String, "kind", "docx không phải bảng tính")
    }

    func testSaveToFileRoundTrip() throws {
        let h = try openFixture("xlsx/rich-excel.xlsx")
        let dir = try Fixtures.scratchDirectory("bridge-save")
        let url = dir.appendingPathComponent("out.xlsx")
        try call("sheet.setValue", ["handle": h, "sheetIndex": 0, "ref": "Z99", "value": ["t": "n", "v": 7]])
        try call("save", ["handle": h, "path": url.path])
        try call("close", ["handle": h])
        let h2 = try call("open", ["path": url.path])["handle"] as! String
        let re = try call("sheet.read", ["handle": h2, "sheetIndex": 0, "range": "Z99:Z99"])
        XCTAssertEqual(((re["cells"] as! [[String: Any]]).first?["value"] as? [String: Any])?["v"] as? Double, 7)
    }
}
