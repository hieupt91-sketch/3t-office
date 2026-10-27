import XCTest
@testable import OOXMLBridge
import OOXMLKit
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

    func testSetNotesReadsBackInTheSameSession() throws {
        let h = try openFixture("real/slides-saved-roundtrip.pptx")
        try call("slide.setNotes", ["handle": h, "index": 0, "text": "Ghi chú đọc lại cùng phiên"])
        XCTAssertEqual(try call("slide.read", ["handle": h, "index": 0])["notes"] as? String, "Ghi chú đọc lại cùng phiên")
        let exported = try call("exportBytes", ["handle": h])["base64"] as! String
        let reopened = try call("open", ["base64": exported])
        XCTAssertEqual(try call("slide.read", ["handle": reopened["handle"] as! String, "index": 0])["notes"] as? String,
                       "Ghi chú đọc lại cùng phiên")
    }

    // MARK: Lỗi

    func testErrorsAreStructured() throws {
        XCTAssertEqual(try callExpectingError("open", ["base64": "@@@"])["code"] as? String, "open")
        XCTAssertEqual(try callExpectingError("info", ["handle": "khong-co"])["code"] as? String, "handle")
        XCTAssertEqual(try callExpectingError("khongCoOp", [:])["code"] as? String, "op")
        let h = try openFixture("docx/rich-word.docx")
        XCTAssertEqual(try callExpectingError("sheet.read", ["handle": h])["code"] as? String, "kind", "docx không phải bảng tính")
    }

    func testMalformedJSONUsesRequestErrorCode() throws {
        let response = try JSONSerialization.jsonObject(with: bridge.handle(Data("{\"id\":1,".utf8))) as! [String: Any]
        let error = try XCTUnwrap(response["error"] as? [String: Any])
        XCTAssertEqual(response["ok"] as? Bool, false)
        XCTAssertEqual(error["code"] as? String, "request")
        XCTAssertEqual(error["message"] as? String, "JSON không hợp lệ")
    }

    func testNotesMasterCreationFailureUsesUnsupportedCode() throws {
        let package = try OPCPackage(data: Fixtures.data("pptx/rich-deck.pptx"))
        let presentation = try Presentation(package: package)
        let presentationRelationships = try package.relationships(of: presentation.mainPart)
        for relationship in presentationRelationships.filter(.notesMaster) {
            if let part = presentationRelationships.targetPart(relationship) { package.removePart(part) }
            presentationRelationships.remove(id: relationship.id)
        }
        try package.xml(presentation.mainPart).root.firstChild(NS.p, "notesMasterIdLst")?.removeFromParent()

        for slide in presentation.slides {
            guard let layout = slide.layoutPart,
                  let master = try package.relatedPart(from: layout, .slideMaster) else { continue }
            let masterRelationships = try package.relationships(of: master)
            for relationship in masterRelationships.filter(.theme) {
                masterRelationships.remove(id: relationship.id)
            }
        }

        let handle = try call("open", ["base64": try package.save().base64EncodedString()])["handle"] as! String
        let error = try callExpectingError("slide.setNotes", ["handle": handle, "index": 2, "text": "Ghi chú"])
        XCTAssertEqual(error["code"] as? String, "unsupported")
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
        let reopenedDeck = try Presentation(data: savedData)
        for slide in reopenedDeck.slides {
            XCTAssertLessThanOrEqual(try reopenedDeck.package.relationships(of: slide.part).filter(.notesSlide).count, 1)
        }
        let shapes = slide["shapes"] as? [[String: Any]] ?? []
        XCTAssertTrue(shapes.contains { $0["name"] as? String == "Tiêu đề chính" })
        XCTAssertEqual(try call("slide.read", ["handle": reopenedHandle, "index": 1])["title"] as? String, "Mục tiêu 2028")
    }

    func testPptxSaveDeltaRejectsDuplicateNotesRelationships() throws {
        let dir = try Fixtures.scratchDirectory("pptx-save-duplicate-notes")
        let source = dir.appendingPathComponent("source.pptx")
        let target = dir.appendingPathComponent("staging.pptx")
        let package = try OPCPackage(data: Fixtures.data("pptx/rich-deck.pptx"))
        let presentation = try Presentation(package: package)
        let slide = try XCTUnwrap(presentation.slides.first)
        let notesPart = try XCTUnwrap(slide.notesPart)
        try package.relationships(of: slide.part).add(.notesSlide, to: notesPart, reuseExisting: false)
        try package.save().write(to: source)

        let error = try callExpectingError("pptx.save", [
            "source_document_path": source.path,
            "target_path": target.path,
            "delta": ["slides": []],
        ])

        XCTAssertEqual(error["code"] as? String, "reopen")
        XCTAssertFalse(FileManager.default.fileExists(atPath: target.path))
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

    // MARK: Bridge ops mới — hyperlink và core properties

    func testSheetHyperlinkBridgeRoundTrip() throws {
        let h = try openFixture("xlsx/rich-excel.xlsx")
        try call("sheet.setHyperlink", ["handle": h, "sheet": "Dữ liệu", "ref": "A1", "target": "https://example.invalid/tai-lieu"])
        var links = try call("sheet.hyperlinks", ["handle": h, "sheet": "Dữ liệu"])["hyperlinks"] as! [[String: Any]]
        XCTAssertTrue(links.contains { $0["cell"] as? String == "A1" && $0["target"] as? String == "https://example.invalid/tai-lieu" })

        // Xuất → mở lại bằng bridge mới → liên kết vẫn còn.
        let b64 = try call("exportBytes", ["handle": h])["base64"] as! String
        let h2 = try call("open", ["base64": b64])["handle"] as! String
        links = try call("sheet.hyperlinks", ["handle": h2, "sheet": "Dữ liệu"])["hyperlinks"] as! [[String: Any]]
        XCTAssertTrue(links.contains { $0["cell"] as? String == "A1" })

        // Xóa → xuất → mở lại → liên kết không còn.
        try call("sheet.removeHyperlink", ["handle": h2, "sheet": "Dữ liệu", "ref": "A1"])
        let b64b = try call("exportBytes", ["handle": h2])["base64"] as! String
        let h3 = try call("open", ["base64": b64b])["handle"] as! String
        links = try call("sheet.hyperlinks", ["handle": h3, "sheet": "Dữ liệu"])["hyperlinks"] as! [[String: Any]]
        XCTAssertFalse(links.contains { $0["cell"] as? String == "A1" })
    }

    func testSetPropertiesBridgeRoundTrip() throws {
        let h = try openFixture("docx/rich-word.docx")
        try call("setProperties", ["handle": h, "title": "Tieu de test", "creator": "Tester"])
        let b64 = try call("exportBytes", ["handle": h])["base64"] as! String
        let savedData = Data(base64Encoded: b64)!
        let pkg = try OPCPackage(data: savedData)
        let part = try pkg.relatedPart(from: .root, .coreProperties)
        XCTAssertNotNil(part)
        let core = try pkg.xml(part!)
        XCTAssertEqual(core.root.firstChild(NS.dc, "title")?.textContent, "Tieu de test")
        XCTAssertEqual(core.root.firstChild(NS.dc, "creator")?.textContent, "Tester")
    }

    func testSheetAutoFilterBridgeRoundTrip() throws {
        let h = try openFixture("xlsx/rich-excel.xlsx")
        try call("sheet.setAutoFilter", ["handle": h, "sheet": "Dữ liệu", "range": "A1:E2"])
        var b64 = try call("exportBytes", ["handle": h])["base64"] as! String
        var sheetXML = try RoundTrip.partString(Data(base64Encoded: b64)!, "xl/worksheets/sheet1.xml")
        XCTAssertTrue(sheetXML.contains("<autoFilter ref=\"A1:E2\"/>"), sheetXML)

        // Xóa → xuất → mở lại → không còn autoFilter.
        let h2 = try call("open", ["base64": b64])["handle"] as! String
        try call("sheet.removeAutoFilter", ["handle": h2, "sheet": "Dữ liệu"])
        b64 = try call("exportBytes", ["handle": h2])["base64"] as! String
        sheetXML = try RoundTrip.partString(Data(base64Encoded: b64)!, "xl/worksheets/sheet1.xml")
        XCTAssertFalse(sheetXML.contains("<autoFilter "), sheetXML)
    }

    func testSlideDuplicateBridgeRoundTrip() throws {
        let h = try openFixture("pptx/rich-deck.pptx")
        XCTAssertEqual(try call("info", ["handle": h])["slides"] as? Int, 3)
        let dup = try call("slide.duplicate", ["handle": h, "index": 0])
        XCTAssertEqual(dup["slides"] as? Int, 4)
        let b64 = try call("exportBytes", ["handle": h])["base64"] as! String
        let h2 = try call("open", ["base64": b64])["handle"] as! String
        XCTAssertEqual(try call("info", ["handle": h2])["slides"] as? Int, 4)
    }

    func testSheetDimensionsAndPageSetupBridgeRoundTrip() throws {
        let h = try openFixture("xlsx/rich-excel.xlsx")
        try call("sheet.setColumnWidth", ["handle": h, "sheet": "Dữ liệu", "col": 2, "width": 20.5])
        try call("sheet.setColumnHidden", ["handle": h, "sheet": "Dữ liệu", "col": 3, "hidden": true])
        try call("sheet.setRowHeight", ["handle": h, "sheet": "Dữ liệu", "row": 2, "height": 30])
        try call("sheet.setRowHidden", ["handle": h, "sheet": "Dữ liệu", "row": 3, "hidden": true])
        try call("sheet.setPageSetup", ["handle": h, "sheet": "Dữ liệu",
                                        "margins": ["left": 0.5, "right": 0.5, "top": 0.5, "bottom": 0.5, "header": 0.2, "footer": 0.2],
                                        "orientation": "landscape", "paperSize": 9])
        let b64 = try call("exportBytes", ["handle": h])["base64"] as! String
        let sheetXML = try RoundTrip.partString(Data(base64Encoded: b64)!, "xl/worksheets/sheet1.xml")
        XCTAssertTrue(sheetXML.contains("width=\"20.5\""), sheetXML)
        XCTAssertTrue(sheetXML.contains("hidden=\"1\""), sheetXML)
        XCTAssertTrue(sheetXML.contains("ht=\"30\""), sheetXML)
        XCTAssertTrue(sheetXML.contains("<pageMargins left=\"0.5\""), sheetXML)
        XCTAssertTrue(sheetXML.contains("orientation=\"landscape\""), sheetXML)
        XCTAssertTrue(sheetXML.contains("paperSize=\"9\""), sheetXML)
    }

    func testSheetStateAndWorkbookOptionsBridge() throws {
        let h = try openFixture("xlsx/rich-excel.xlsx")
        let sheets = try call("info", ["handle": h])["sheets"] as! [[String: Any]]
        let other = sheets.first { ($0["name"] as? String) != "Dữ liệu" }!
        let otherName = other["name"] as! String
        try call("sheet.setState", ["handle": h, "sheet": otherName, "state": "hidden"])
        let after = try call("info", ["handle": h])["sheets"] as! [[String: Any]]
        XCTAssertEqual(after.first { ($0["name"] as? String) == otherName }!["state"] as? String, "hidden")
        try call("workbook.setCalculationOptions", ["handle": h, "calcMode": "manual", "iterate": false, "date1904": false])
        try call("workbook.setTheme", ["handle": h, "preset": "ocean"])
        let b64 = try call("exportBytes", ["handle": h])["base64"] as! String
        let wbXML = try RoundTrip.partString(Data(base64Encoded: b64)!, "xl/workbook.xml")
        XCTAssertTrue(wbXML.contains("calcMode=\"manual\""), wbXML)
        let h2 = try call("open", ["base64": b64])["handle"] as! String
        let reopened = try call("info", ["handle": h2])["sheets"] as! [[String: Any]]
        XCTAssertEqual(reopened.first { ($0["name"] as? String) == otherName }!["state"] as? String, "hidden")
    }

    func testDocSetSpacingBridgeRoundTrip() throws {
        let h = try openFixture("docx/rich-word.docx")
        try call("doc.setSpacing", ["handle": h, "index": 0, "before": 120, "after": 60, "line": 360, "lineRule": "auto"])
        let read = try call("doc.read", ["handle": h, "from": 0, "count": 1])["paragraphs"] as! [[String: Any]]
        let spacing = read.first!["spacing"] as! [String: Any]
        XCTAssertEqual(spacing["before"] as? Int, 120)
        XCTAssertEqual(spacing["line"] as? Int, 360)
        let b64 = try call("exportBytes", ["handle": h])["base64"] as! String
        let h2 = try call("open", ["base64": b64])["handle"] as! String
        let re = try call("doc.read", ["handle": h2, "from": 0, "count": 1])["paragraphs"] as! [[String: Any]]
        XCTAssertEqual((re.first!["spacing"] as! [String: Any])["after"] as? Int, 60)
    }

    func testDocSetRunEffectBridgeRoundTrip() throws {
        let h = try openFixture("docx/rich-word.docx")
        try call("doc.setRunEffect", ["handle": h, "index": 1, "run": 0, "effect": "caps", "on": true])
        try call("doc.setRunEffect", ["handle": h, "index": 1, "run": 0, "effect": "shadow", "on": true])
        let read = try call("doc.read", ["handle": h, "from": 1, "count": 1])["paragraphs"] as! [[String: Any]]
        let runs = read.first!["runs"] as! [[String: Any]]
        XCTAssertEqual(runs.first!["caps"] as? Bool, true)
        XCTAssertEqual(runs.first!["shadow"] as? Bool, true)
        let b64 = try call("exportBytes", ["handle": h])["base64"] as! String
        let h2 = try call("open", ["base64": b64])["handle"] as! String
        let re = try call("doc.read", ["handle": h2, "from": 1, "count": 1])["paragraphs"] as! [[String: Any]]
        let reRuns = re.first!["runs"] as! [[String: Any]]
        XCTAssertEqual(reRuns.first!["caps"] as? Bool, true)
        XCTAssertEqual(reRuns.first!["shadow"] as? Bool, true)
    }

    func testDocSetNumberingBridgeRoundTrip() throws {
        let h = try openFixture("docx/rich-word.docx")
        try call("doc.setNumbering", ["handle": h, "index": 0, "format": "bullet"])
        var read = try call("doc.read", ["handle": h, "from": 0, "count": 1])["paragraphs"] as! [[String: Any]]
        var numbering = read.first!["numbering"] as! [String: Any]
        XCTAssertEqual(numbering["format"] as? String, "bullet")
        let b64 = try call("exportBytes", ["handle": h])["base64"] as! String
        let h2 = try call("open", ["base64": b64])["handle"] as! String
        read = try call("doc.read", ["handle": h2, "from": 0, "count": 1])["paragraphs"] as! [[String: Any]]
        numbering = read.first!["numbering"] as! [String: Any]
        XCTAssertEqual(numbering["format"] as? String, "bullet")
        try call("doc.removeNumbering", ["handle": h2, "index": 0])
        read = try call("doc.read", ["handle": h2, "from": 0, "count": 1])["paragraphs"] as! [[String: Any]]
        XCTAssertNil(read.first!["numbering"])
    }

    func testDocInsertFieldBridgeRoundTrip() throws {
        let h = try openFixture("docx/rich-word.docx")
        try call("doc.insertField", ["handle": h, "index": 0, "instruction": "PAGE", "result": "3"])
        var read = try call("doc.read", ["handle": h, "from": 0, "count": 1])["paragraphs"] as! [[String: Any]]
        XCTAssertTrue((read.first!["text"] as! String).hasSuffix("3"))
        let b64 = try call("exportBytes", ["handle": h])["base64"] as! String
        let h2 = try call("open", ["base64": b64])["handle"] as! String
        read = try call("doc.read", ["handle": h2, "from": 0, "count": 1])["paragraphs"] as! [[String: Any]]
        XCTAssertTrue((read.first!["text"] as! String).hasSuffix("3"))
    }

    func testDocSectionsBridge() throws {
        let h = try openFixture("docx/rich-word.docx")
        let sections = try call("doc.sections", ["handle": h])["sections"] as! [[String: Any]]
        XCTAssertEqual(sections.count, 1)
        let headerLinked = sections.first!["headerLinked"] as! [String: Bool]
        XCTAssertEqual(headerLinked["default"], false)
        // Section đầu tiên không liên kết được + index ngoài phạm vi đều báo lỗi.
        _ = try callExpectingError("doc.setSectionLinked", ["handle": h, "index": 0, "kind": "header", "linked": true])
        _ = try callExpectingError("doc.setSectionLinked", ["handle": h, "index": 5, "kind": "header", "linked": true])
    }

    func testSlideShowSettingsBridgeRoundTrip() throws {
        let h = try openFixture("pptx/rich-deck.pptx")
        var settings = try call("slide.showSettings", ["handle": h])
        XCTAssertEqual(settings["loop"] as? Bool, false)
        try call("slide.setShowSettings", ["handle": h, "loop": true, "useTimings": false])
        settings = try call("slide.showSettings", ["handle": h])
        XCTAssertEqual(settings["loop"] as? Bool, true)
        XCTAssertEqual(settings["useTimings"] as? Bool, false)
        XCTAssertEqual(settings["showAnimation"] as? Bool, true)
        let b64 = try call("exportBytes", ["handle": h])["base64"] as! String
        let h2 = try call("open", ["base64": b64])["handle"] as! String
        settings = try call("slide.showSettings", ["handle": h2])
        XCTAssertEqual(settings["loop"] as? Bool, true)
        XCTAssertEqual(settings["useTimings"] as? Bool, false)
    }

    func testSlideThemeBridge() throws {
        let h = try openFixture("pptx/rich-deck.pptx")
        let theme = try call("slide.theme", ["handle": h])
        XCTAssertEqual(theme["found"] as? Bool, true)
        XCTAssertEqual(theme["name"] as? String, "Office")
        let colors = theme["colors"] as! [String: String]
        XCTAssertEqual(colors["accent1"], "18A303")
        XCTAssertEqual(theme["majorFontLatin"] as? String, "Arial")
    }

    func testSheetRewriteLegacyConcatBridge() throws {
        let h = try openFixture("xlsx/rich-excel.xlsx")
        try call("sheet.setFormula", ["handle": h, "ref": "Z99", "formula": "CONCAT(A1, B1)"])
        let result = try call("sheet.rewriteLegacyConcat", ["handle": h])
        XCTAssertEqual(result["changed"] as? Int, 1)
        let read = try call("sheet.read", ["handle": h, "range": "Z99:Z99"])
        let cells = read["cells"] as! [[String: Any]]
        XCTAssertEqual(cells.first?["formula"] as? String, "((A1)&(B1))")
    }

    func testDocStyleAndRevisionsBridge() throws {
        let h = try openFixture("docx/rich-word.docx")
        let count = try call("doc.acceptAllRevisions", ["handle": h])["count"] as! Int
        XCTAssertGreaterThanOrEqual(count, 0)
        try call("doc.setStyle", ["handle": h, "index": 0, "style": "Title"])
        let read = try call("doc.read", ["handle": h, "from": 0, "count": 1])
        let paras = read["paragraphs"] as! [[String: Any]]
        XCTAssertEqual(paras.first!["style"] as? String, "Title")
        let b64 = try call("exportBytes", ["handle": h])["base64"] as! String
        let h2 = try call("open", ["base64": b64])["handle"] as! String
        let re = try call("doc.read", ["handle": h2, "from": 0, "count": 1])["paragraphs"] as! [[String: Any]]
        XCTAssertEqual(re.first!["style"] as? String, "Title")
    }

    func testSlideTitleAndRenameShapeBridge() throws {
        let h = try openFixture("pptx/rich-deck.pptx")
        try call("slide.setTitle", ["handle": h, "index": 0, "text": "Tieu de moi"])
        let read = try call("slide.read", ["handle": h, "index": 0])
        XCTAssertEqual(read["title"] as? String, "Tieu de moi")
        let shapes = read["shapes"] as! [[String: Any]]
        let firstName = shapes.first!["name"] as! String
        try call("slide.renameShape", ["handle": h, "index": 0, "shape": firstName, "new": "Khung moi"])
        let re = try call("slide.read", ["handle": h, "index": 0])["shapes"] as! [[String: Any]]
        XCTAssertTrue(re.contains { ($0["name"] as? String) == "Khung moi" })
        let b64 = try call("exportBytes", ["handle": h])["base64"] as! String
        let h2 = try call("open", ["base64": b64])["handle"] as! String
        XCTAssertEqual(try call("slide.read", ["handle": h2, "index": 0])["title"] as? String, "Tieu de moi")
    }

    func testSheetViewPrintProtectionValidationBridge() throws {
        let h = try openFixture("xlsx/rich-excel.xlsx")
        try call("sheet.setViewOptions", ["handle": h, "sheet": "Dữ liệu",
                                          "options": ["showGridLines": false, "showRowColumnHeaders": true, "zoomScale": 150]])
        try call("sheet.setPrintOptions", ["handle": h, "sheet": "Dữ liệu",
                                           "options": ["gridLines": true, "headings": true]])
        try call("sheet.setSheetProtection", ["handle": h, "sheet": "Dữ liệu", "options": [:]])
        try call("workbook.setWorkbookProtection", ["handle": h, "lockStructure": true])
        try call("sheet.addDataValidation", ["handle": h, "sheet": "Dữ liệu", "range": "A1:A2",
                                             "rule": ["type": "whole", "operator": "between", "formula1": "1", "formula2": "10"]])
        let b64 = try call("exportBytes", ["handle": h])["base64"] as! String
        let saved = Data(base64Encoded: b64)!
        let sheetXML = try RoundTrip.partString(saved, "xl/worksheets/sheet1.xml")
        XCTAssertTrue(sheetXML.contains("showGridLines=\"0\""), sheetXML)
        XCTAssertTrue(sheetXML.contains("zoomScale=\"150\""), sheetXML)
        XCTAssertTrue(sheetXML.contains("<printOptions"), sheetXML)
        XCTAssertTrue(sheetXML.contains("gridLines=\"1\""), sheetXML)
        XCTAssertTrue(sheetXML.contains("<sheetProtection"), sheetXML)
        XCTAssertTrue(sheetXML.contains("type=\"whole\""), sheetXML)
        XCTAssertTrue(sheetXML.contains("sqref=\"A1:A2\""), sheetXML)
        let wbXML = try RoundTrip.partString(saved, "xl/workbook.xml")
        XCTAssertTrue(wbXML.contains("<workbookProtection"), wbXML)
    }

    func testSheetConditionalFormattingBridgeRoundTrip() throws {
        let h = try openFixture("xlsx/rich-excel.xlsx")
        try call("sheet.addConditionalFormatting", ["handle": h, "sheet": "Dữ liệu", "range": "A1:A2",
                                                    "rule": ["type": "cellIs", "operator": "greaterThan", "formula": ["100"], "priority": 1]])
        try call("sheet.addConditionalFormatting", ["handle": h, "sheet": "Dữ liệu", "range": "B1:B2",
                                                    "rule": ["type": "colorScale", "formula": [], "priority": 2,
                                                             "visual": ["kind": "colorScale",
                                                                          "thresholds": [["type": "min"], ["type": "max"]],
                                                                          "colors": ["FF0000", "00FF00"]]]])
        var b64 = try call("exportBytes", ["handle": h])["base64"] as! String
        var sheetXML = try RoundTrip.partString(Data(base64Encoded: b64)!, "xl/worksheets/sheet1.xml")
        XCTAssertTrue(sheetXML.contains("sqref=\"A1:A2\""), sheetXML)
        XCTAssertTrue(sheetXML.contains("<cfRule type=\"cellIs\" priority=\"1\" operator=\"greaterThan\""), sheetXML)
        XCTAssertTrue(sheetXML.contains("<formula>100</formula>"), sheetXML)
        XCTAssertTrue(sheetXML.contains("<colorScale>"), sheetXML)

        // Xóa theo vùng → chỉ còn colorScale; xóa hết → không còn conditionalFormatting.
        let h2 = try call("open", ["base64": b64])["handle"] as! String
        try call("sheet.clearConditionalFormatting", ["handle": h2, "sheet": "Dữ liệu", "range": "A1:A2"])
        b64 = try call("exportBytes", ["handle": h2])["base64"] as! String
        sheetXML = try RoundTrip.partString(Data(base64Encoded: b64)!, "xl/worksheets/sheet1.xml")
        XCTAssertFalse(sheetXML.contains("sqref=\"A1:A2\""), sheetXML)
        XCTAssertTrue(sheetXML.contains("sqref=\"B1:B2\""), sheetXML)
        let h3 = try call("open", ["base64": b64])["handle"] as! String
        try call("sheet.clearConditionalFormatting", ["handle": h3, "sheet": "Dữ liệu"])
        b64 = try call("exportBytes", ["handle": h3])["base64"] as! String
        sheetXML = try RoundTrip.partString(Data(base64Encoded: b64)!, "xl/worksheets/sheet1.xml")
        XCTAssertFalse(sheetXML.contains("<conditionalFormatting"), sheetXML)
    }

    func testSlideSetTableCellBridgeRoundTrip() throws {
        // rich-deck slide 2 (index 1) có bảng 2x2, ô (1,1) ban đầu là "14,1 tỷ".
        let h = try openFixture("pptx/rich-deck.pptx")
        try call("slide.setTableCell", ["handle": h, "index": 1, "row": 1, "column": 1, "text": "15,0 tỷ"])
        let read = try call("slide.read", ["handle": h, "index": 1])["shapes"] as! [[String: Any]]
        let table = read.first { $0["table"] != nil }!["table"] as! [[String]]
        XCTAssertTrue(table.flatMap { $0 }.contains("15,0 tỷ"))
        let b64 = try call("exportBytes", ["handle": h])["base64"] as! String
        let h2 = try call("open", ["base64": b64])["handle"] as! String
        let re = try call("slide.read", ["handle": h2, "index": 1])["shapes"] as! [[String: Any]]
        let reTable = re.first { $0["table"] != nil }!["table"] as! [[String]]
        XCTAssertTrue(reTable.flatMap { $0 }.contains("15,0 tỷ"))
        XCTAssertFalse(reTable.flatMap { $0 }.contains("14,1 tỷ"))
    }

    func testDocInsertImageBridgeRoundTrip() throws {
        // PNG 1x1 trong suốt.
        let pngB64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        let h = try openFixture("docx/rich-word.docx")
        let before = try call("doc.read", ["handle": h])["total"] as! Int
        let result = try call("doc.insertImage", ["handle": h, "base64": pngB64, "description": "Anh test"])
        XCTAssertEqual(result["paragraphs"] as? Int, before + 1)
        let b64 = try call("exportBytes", ["handle": h])["base64"] as! String
        let docXML = try RoundTrip.partString(Data(base64Encoded: b64)!, "word/document.xml")
        XCTAssertTrue(docXML.contains("<w:drawing>"), docXML)
        let h2 = try call("open", ["base64": b64])["handle"] as! String
        XCTAssertEqual(try call("doc.read", ["handle": h2])["total"] as? Int, before + 1)
    }
}
