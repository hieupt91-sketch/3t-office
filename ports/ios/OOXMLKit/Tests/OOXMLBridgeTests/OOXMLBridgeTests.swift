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

    func testXlsxSaveDeltaWritesReopensAndPreservesUntouchedParts() throws {
        let dir = try Fixtures.scratchDirectory("xlsx-save-delta")
        let source = dir.appendingPathComponent("source.xlsx")
        let target = dir.appendingPathComponent("staging.xlsx")
        let sourceData = try Fixtures.data("xlsx/rich-excel.xlsx")
        try sourceData.write(to: source)

        let result = try call("xlsx.save", [
            "source_document_path": source.path,
            "target_path": target.path,
            "delta": [
                "cells": [
                    ["sheet": "Dữ liệu", "ref": "A1", "type": "string", "value": "đã lưu"],
                    ["sheet": "Dữ liệu", "ref": "G2", "formula": "C2*2", "cached": 500],
                    ["sheet": "Dữ liệu", "ref": "H2", "type": "number", "value": 12.5, "styleIndex": 1],
                ],
                "cleared_cells": [["sheet": "Dữ liệu", "range": "A2"]],
                "structural_ops": [
                    ["op": "sheet.freezePanes", "args": ["sheet": "Dữ liệu", "rows": 1, "cols": 1]],
                    ["op": "sheet.setTabColor", "args": ["sheet": "Dữ liệu", "color": "FF0000"]],
                    ["op": "sheet.setPrintArea", "args": ["sheet": "Dữ liệu", "range": "A1:H2"]],
                ],
            ],
        ])

        XCTAssertEqual(result["ok"] as? Bool, true)
        XCTAssertEqual(result["unsupported"] as? [String], [])
        XCTAssertFalse((result["changedParts"] as? [String] ?? []).isEmpty)
        XCTAssertTrue(FileManager.default.fileExists(atPath: target.path))

        let savedData = try Data(contentsOf: target)
        let reopenedHandle = try call("open", ["base64": savedData.base64EncodedString()])["handle"] as! String
        let read = try call("sheet.read", ["handle": reopenedHandle, "sheet": "Dữ liệu", "range": "A1:H2"])
        let cells = read["cells"] as! [[String: Any]]
        let a1 = cells.first { $0["ref"] as? String == "A1" }!
        XCTAssertEqual((a1["value"] as! [String: Any])["v"] as? String, "đã lưu")
        let g2 = cells.first { $0["ref"] as? String == "G2" }!
        XCTAssertEqual(g2["formula"] as? String, "C2*2")
        let h2 = cells.first { $0["ref"] as? String == "H2" }!
        XCTAssertEqual((h2["value"] as! [String: Any])["v"] as? Double, 12.5)
        XCTAssertFalse(cells.contains { $0["ref"] as? String == "A2" })
    }

    func testXlsxSaveDeltaUnsupportedDoesNotWriteTarget() throws {
        let dir = try Fixtures.scratchDirectory("xlsx-save-unsupported")
        let source = dir.appendingPathComponent("source.xlsx")
        let target = dir.appendingPathComponent("staging.xlsx")
        try Fixtures.data("xlsx/rich-excel.xlsx").write(to: source)

        let result = try call("xlsx.save", [
            "source_document_path": source.path,
            "target_path": target.path,
            "delta": ["cells": [], "cleared_cells": [], "structural_ops": [["op": "sheet.add"]]],
        ])

        XCTAssertEqual(result["ok"] as? Bool, false)
        XCTAssertEqual(result["changedParts"] as? [String], [])
        XCTAssertFalse((result["unsupported"] as? [String] ?? []).isEmpty)
        XCTAssertFalse(FileManager.default.fileExists(atPath: target.path))
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

    func testDocxSaveDeltaWritesReopensAndPreservesUntouchedParts() throws {
        let dir = try Fixtures.scratchDirectory("docx-save-delta")
        let source = dir.appendingPathComponent("source.docx")
        let target = dir.appendingPathComponent("staging.docx")
        let sourceData = try Fixtures.data("docx/rich-word.docx")
        try sourceData.write(to: source)
        let originalHandle = try call("open", ["base64": sourceData.base64EncodedString()])["handle"] as! String
        let originalParagraphs = try call("doc.read", ["handle": originalHandle])["paragraphs"] as! [[String: Any]]
        let originalRuns = originalParagraphs[1]["runs"] as! [[String: Any]]

        let result = try call("docx.save", [
            "source_document_path": source.path,
            "target_path": target.path,
            "delta": [
                "paragraphs": [
                    ["op": "setText", "index": 0, "text": "Đã sửa qua delta"],
                    ["op": "alignment", "index": 1, "value": "center"],
                    ["op": "replaceText", "index": 1, "find": "Ban Giám đốc", "replace": "Ban điều hành"],
                ],
                "cells": [["table": 0, "row": 0, "column": 0, "text": "Ô đã sửa"]],
            ],
        ])

        XCTAssertEqual(result["ok"] as? Bool, true)
        XCTAssertEqual(result["unsupported"] as? [String], [])
        XCTAssertEqual(result["changedParts"] as? [String], ["word/document.xml"])
        let savedData = try Data(contentsOf: target)
        let reopenedHandle = try call("open", ["base64": savedData.base64EncodedString()])["handle"] as! String
        let read = try call("doc.read", ["handle": reopenedHandle])
        let paragraphs = read["paragraphs"] as! [[String: Any]]
        XCTAssertEqual(paragraphs[0]["text"] as? String, "Đã sửa qua delta")
        XCTAssertEqual(paragraphs[1]["alignment"] as? String, "center")
        XCTAssertTrue((paragraphs[1]["text"] as? String)?.contains("Ban điều hành") == true)
        let savedRuns = paragraphs[1]["runs"] as! [[String: Any]]
        XCTAssertEqual(savedRuns.count, originalRuns.count, "thay một phần chữ giữ nguyên ranh giới run")
        for (before, after) in zip(originalRuns, savedRuns) {
            XCTAssertEqual(after["bold"] as? Bool, before["bold"] as? Bool)
            XCTAssertEqual(after["italic"] as? Bool, before["italic"] as? Bool)
            XCTAssertEqual(after["color"] as? String, before["color"] as? String)
            XCTAssertEqual(after["fontSize"] as? Double, before["fontSize"] as? Double)
        }
        let tables = read["tables"] as! [[[String]]]
        XCTAssertEqual(tables[0][0][0], "Ô đã sửa")
    }

    func testDocxSaveDeltaUnsupportedDoesNotWriteTarget() throws {
        let dir = try Fixtures.scratchDirectory("docx-save-unsupported")
        let source = dir.appendingPathComponent("source.docx")
        let target = dir.appendingPathComponent("staging.docx")
        try Fixtures.data("docx/rich-word.docx").write(to: source)

        let result = try call("docx.save", [
            "source_document_path": source.path,
            "target_path": target.path,
            "delta": ["paragraphs": [["op": "insertImage", "index": 0]]],
        ])

        XCTAssertEqual(result["ok"] as? Bool, false)
        XCTAssertEqual(result["changedParts"] as? [String], [])
        XCTAssertFalse((result["unsupported"] as? [String] ?? []).isEmpty)
        XCTAssertFalse(FileManager.default.fileExists(atPath: target.path))
    }

    func testPptxSaveDeltaWritesReopensAndPreservesUntouchedParts() throws {
        let dir = try Fixtures.scratchDirectory("pptx-save-delta")
        let source = dir.appendingPathComponent("source.pptx")
        let target = dir.appendingPathComponent("staging.pptx")
        let sourceData = try Fixtures.data("pptx/rich-deck.pptx")
        try sourceData.write(to: source)

        let result = try call("pptx.save", [
            "source_document_path": source.path,
            "target_path": target.path,
            "delta": [
                "slides": [
                    ["op": "shape.replaceText", "slide": 0, "shape": "Tiêu đề 1", "find": "2027", "replace": "2028"],
                    ["op": "shape.rename", "slide": 0, "shape": "Tiêu đề 1", "name": "Tiêu đề chính"],
                    ["op": "slide.setNotes", "slide": 0, "text": "Ghi chú đã cập nhật"],
                    ["op": "slide.setTitle", "slide": 1, "text": "Mục tiêu 2028"],
                ],
            ],
        ])

        XCTAssertEqual(result["ok"] as? Bool, true)
        XCTAssertEqual(result["unsupported"] as? [String], [])
        let changedParts = result["changedParts"] as? [String] ?? []
        XCTAssertTrue(changedParts.contains("ppt/slides/slide1.xml"))
        XCTAssertTrue(changedParts.contains { $0.hasPrefix("ppt/notesSlides/") })
        XCTAssertFalse(changedParts.contains { $0.hasPrefix("ppt/media/") })
        XCTAssertTrue(changedParts.contains("ppt/slides/slide2.xml"))
        XCTAssertFalse(changedParts.contains("ppt/slides/slide3.xml"))
        XCTAssertFalse(changedParts.contains("ppt/theme/theme1.xml"))
        XCTAssertTrue(FileManager.default.fileExists(atPath: target.path))

        let savedData = try Data(contentsOf: target)
        let reopenedHandle = try call("open", ["base64": savedData.base64EncodedString()])["handle"] as! String
        let slide = try call("slide.read", ["handle": reopenedHandle, "index": 0])
        XCTAssertEqual(slide["title"] as? String, "Kế hoạch kinh doanh 2028")
        XCTAssertEqual(slide["notes"] as? String, "Ghi chú đã cập nhật")
        let shapes = slide["shapes"] as? [[String: Any]] ?? []
        XCTAssertTrue(shapes.contains { $0["name"] as? String == "Tiêu đề chính" })
        XCTAssertEqual(try call("slide.read", ["handle": reopenedHandle, "index": 1])["title"] as? String, "Mục tiêu 2028")
    }

    func testPptxSaveDeltaUnsupportedDoesNotWriteTarget() throws {
        let dir = try Fixtures.scratchDirectory("pptx-save-unsupported")
        let source = dir.appendingPathComponent("source.pptx")
        let target = dir.appendingPathComponent("staging.pptx")
        try Fixtures.data("pptx/rich-deck.pptx").write(to: source)

        let result = try call("pptx.save", [
            "source_document_path": source.path,
            "target_path": target.path,
            "delta": ["slides": [["op": "slide.setTransition", "slide": 0]]],
        ])

        XCTAssertEqual(result["ok"] as? Bool, false)
        XCTAssertEqual(result["changedParts"] as? [String], [])
        XCTAssertFalse((result["unsupported"] as? [String] ?? []).isEmpty)
        XCTAssertFalse(FileManager.default.fileExists(atPath: target.path))
    }

    func testPptxSaveDeltaAddsAndDeletesSlide() throws {
        let dir = try Fixtures.scratchDirectory("pptx-slide-structure-delta")
        let source = dir.appendingPathComponent("source.pptx")
        let target = dir.appendingPathComponent("staging.pptx")
        try Fixtures.data("pptx/rich-deck.pptx").write(to: source)

        let result = try call("pptx.save", [
            "source_document_path": source.path,
            "target_path": target.path,
            "delta": ["slides": [
                ["op": "slide.delete", "slide": 1],
                ["op": "slide.add", "layoutName": "Title and Content", "index": 1],
            ]],
        ])

        XCTAssertEqual(result["ok"] as? Bool, true)
        XCTAssertEqual(result["unsupported"] as? [String], [])
        XCTAssertTrue((result["changedParts"] as? [String] ?? []).contains("ppt/presentation.xml"))
        let savedData = try Data(contentsOf: target)
        let reopenedHandle = try call("open", ["base64": savedData.base64EncodedString()])["handle"] as! String
        XCTAssertEqual(try call("info", ["handle": reopenedHandle])["slides"] as? Int, 3)
        XCTAssertEqual(try call("slide.read", ["handle": reopenedHandle, "index": 1])["title"] as? String, "")
    }
}
