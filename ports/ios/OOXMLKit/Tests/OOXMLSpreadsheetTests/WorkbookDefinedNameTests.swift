import XCTest
@testable import OOXMLSpreadsheet
import OOXMLPackage
import OOXMLTestSupport

/// M7 lát 31: API tên định nghĩa (named range) trên Workbook — thêm/sửa/xóa + lưu/mở lại.
/// (Lát 1 + 17 đã xong phần engine: `FormulaEngine.defineName` + cầu nối nạp từ workbook.)
final class WorkbookDefinedNameTests: XCTestCase {
    let rich = "xlsx/rich-excel.xlsx"

    private func reopen(_ wb: Workbook) throws -> Workbook {
        try Workbook(data: wb.save())
    }

    func testDefineRangeNamePersistsAndEvaluates() throws {
        let original = try Fixtures.data(rich)
        let wb = try Workbook(data: original)
        let data = try wb.worksheet(named: "Dữ liệu")
        try data.setValue(10.0, at: "A1")
        try data.setValue(20.0, at: "A2")
        try wb.defineName("VungMoi", formula: "'Dữ liệu'!$A$1:$A$2")
        let saved = try wb.save()
        XCTAssertEqual(PackageValidator.validate(saved), [])
        let re = try Workbook(data: saved)
        let found = re.definedNames.first { $0.name == "VungMoi" }
        XCTAssertEqual(found?.formula, "'Dữ liệu'!$A$1:$A$2")
        XCTAssertNil(found?.localSheetIndex)
        XCTAssertEqual(found?.hidden, false)
        let ws = try re.worksheet(named: "Tổng hợp")
        try ws.setFormula("=SUM(VungMoi)", at: "Z1")
        let e = try FormulaEngine(workbook: re)
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "Tổng hợp", at: "Z1"), .number(30))
        try RoundTrip.verify(original: original, saved: saved,
                             allowedChanges: ["xl/workbook.xml", "xl/worksheets/sheet1.xml", "xl/calcChain.xml"],
                             name: "m7-lat31-define-range.xlsx")
    }

    func testWholeColumnDefinedNameRoundTrip() throws {
        // M7 lát 33: tên vùng trỏ tới cả cột / cả hàng — lưu/mở lại rồi SUM/AVERAGE/COUNT qua tên.
        let wb = try Workbook(data: try Fixtures.data(rich))
        let data = try wb.worksheet(named: "Dữ liệu")
        try data.setValue(10.0, at: "B1")
        try data.setValue(20.0, at: "B2")
        try data.setValue(30.0, at: "B3")
        try data.setValue(1.0, at: "A1")
        try wb.defineName("CotB", formula: "'Dữ liệu'!$B:$B")
        try wb.defineName("Hang1", formula: "'Dữ liệu'!$1:$1")
        let saved = try wb.save()
        XCTAssertEqual(PackageValidator.validate(saved), [])
        let re = try Workbook(data: saved)
        XCTAssertEqual(re.definedNames.first { $0.name == "CotB" }?.formula, "'Dữ liệu'!$B:$B")
        XCTAssertEqual(re.definedNames.first { $0.name == "Hang1" }?.formula, "'Dữ liệu'!$1:$1")
        let tong = try re.worksheet(named: "Tổng hợp")
        try tong.setFormula("=SUM(CotB)", at: "Z1")
        try tong.setFormula("=AVERAGE(CotB)", at: "Z2")
        try tong.setFormula("=COUNT(CotB)", at: "Z3")
        try tong.setFormula("=SUM(Hang1)", at: "Z4")
        let e = try FormulaEngine(workbook: re)
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "Tổng hợp", at: "Z1"), .number(60), "SUM qua tên vùng cả cột")
        XCTAssertEqual(e.value(sheet: "Tổng hợp", at: "Z2"), .number(20), "AVERAGE qua tên vùng cả cột")
        XCTAssertEqual(e.value(sheet: "Tổng hợp", at: "Z3"), .number(3), "COUNT qua tên vùng cả cột")
        XCTAssertEqual(e.value(sheet: "Tổng hợp", at: "Z4"), .number(11), "SUM qua tên vùng cả hàng (A1=1 + B1=10)")
    }

    func testDefineNameValidationRejectsBadNames() throws {
        let wb = try Workbook(data: try Fixtures.data(rich))
        for bad in ["", "A1", "a1", "XFD1048576", "R1C1", "RC", "C", "R", "Tong DoanhThu",
                    "_xlnm.Foo", String(repeating: "x", count: 256), "1Tong", "Tong!A1"] {
            XCTAssertThrowsError(try wb.defineName(bad, formula: "'Dữ liệu'!$A$1:$A$1"), "tên \(bad)") {
                guard case SpreadsheetError.invalidDefinedName = $0 else {
                    return XCTFail("tên \"\(bad)\" phải lỗi invalidDefinedName, nhận được \($0)")
                }
            }
        }
        XCTAssertThrowsError(try wb.defineName("HopLe", formula: "")) {
            guard case SpreadsheetError.invalidDefinedName = $0 else {
                return XCTFail("công thức trống phải lỗi invalidDefinedName, nhận được \($0)")
            }
        }
        XCTAssertThrowsError(try wb.defineName("HopLe", formula: "!!!")) {
            guard case SpreadsheetError.invalidDefinedName = $0 else {
                return XCTFail("công thức \"!!!\" phải lỗi invalidDefinedName, nhận được \($0)")
            }
        }
        XCTAssertThrowsError(try wb.defineName("HopLe", formula: "'Dữ liệu'!$A$1:$A$1", localSheet: "KhongCo")) {
            XCTAssertEqual($0 as? SpreadsheetError, .sheetNotFound("KhongCo"))
        }
    }

    func testRedefineOverwritesSameScope() throws {
        let wb = try Workbook(data: try Fixtures.data(rich))
        try wb.defineName("VungMoi", formula: "'Dữ liệu'!$A$1:$A$1")
        try wb.defineName("VUNGMOI", formula: "'Dữ liệu'!$A$2:$A$2")
        let names = try reopen(wb).definedNames.filter { $0.name.caseInsensitiveCompare("VungMoi") == .orderedSame }
        XCTAssertEqual(names.count, 1, "định nghĩa lại cùng tên + cùng phạm vi thì ghi đè, không nhân đôi")
        XCTAssertEqual(names.first?.formula, "'Dữ liệu'!$A$2:$A$2")
    }

    func testLocalNameShadowsGlobal() throws {
        let wb = try Workbook(data: try Fixtures.data(rich))
        let data = try wb.worksheet(named: "Dữ liệu")
        try data.setValue(10.0, at: "A1")
        try data.setValue(20.0, at: "A2")
        let tong = try wb.worksheet(named: "Tổng hợp")
        try tong.setValue(7.0, at: "A1")
        try wb.defineName("Ten", formula: "'Dữ liệu'!$A$1:$A$2")
        try wb.defineName("Ten", formula: "'Tổng hợp'!$A$1:$A$1", localSheet: "Tổng hợp")
        let re = try reopen(wb)
        let names = re.definedNames.filter { $0.name == "Ten" }
        XCTAssertEqual(names.count, 2)
        let tongIndex = re.sheetNames.firstIndex(of: "Tổng hợp")
        XCTAssertEqual(names.first { $0.localSheetIndex != nil }?.localSheetIndex, tongIndex)
        let wsTong = try re.worksheet(named: "Tổng hợp")
        try wsTong.setFormula("=SUM(Ten)", at: "Z1")
        let wsData = try re.worksheet(named: "Dữ liệu")
        try wsData.setFormula("=SUM(Ten)", at: "Z1")
        let e = try FormulaEngine(workbook: re)
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "Tổng hợp", at: "Z1"), .number(7), "tên cục bộ thắng tên toàn cục trên sheet đó")
        XCTAssertEqual(e.value(sheet: "Dữ liệu", at: "Z1"), .number(30), "sheet khác vẫn thấy tên toàn cục")
    }

    func testRemoveDefinedName() throws {
        let wb = try Workbook(data: try Fixtures.data(rich))
        try wb.defineName("Tam", formula: "'Dữ liệu'!$A$1:$A$1")
        try wb.removeDefinedName("Tam")
        XCTAssertNil(try reopen(wb).definedNames.first { $0.name == "Tam" })
        XCTAssertThrowsError(try wb.removeDefinedName("Tam")) {
            guard case SpreadsheetError.invalidDefinedName = $0 else {
                return XCTFail("gỡ tên đã gỡ phải lỗi invalidDefinedName, nhận được \($0)")
            }
        }
        // Tên toàn cục có sẵn trong fixture vẫn nguyên sau khi gỡ tên khác.
        XCTAssertNotNil(try reopen(wb).definedNames.first { $0.name == "TongDoanhThu" })
    }

    func testHiddenNameRoundTrips() throws {
        let wb = try Workbook(data: try Fixtures.data(rich))
        try wb.defineName("An", formula: "1.5", hidden: true)
        XCTAssertEqual(try reopen(wb).definedNames.first { $0.name == "An" }?.hidden, true)
        let re = try reopen(wb)
        try re.defineName("An", formula: "1.5", hidden: false)
        XCTAssertEqual(try reopen(re).definedNames.first { $0.name == "An" }?.hidden, false)
    }

    func testDefineConstantNameEvaluates() throws {
        let wb = try Workbook(data: try Fixtures.data(rich))
        try wb.defineName("TyLe", formula: "1.5")
        let re = try reopen(wb)
        XCTAssertEqual(re.definedNames.first { $0.name == "TyLe" }?.formula, "1.5")
        let ws = try re.worksheet(named: "Tổng hợp")
        try ws.setFormula("=TyLe*2", at: "Z1")
        let e = try FormulaEngine(workbook: re)
        e.recalculate()
        XCTAssertEqual(e.value(sheet: "Tổng hợp", at: "Z1"), .number(3))
    }

    func testDefineNameWithLeadingEquals() throws {
        let wb = try Workbook(data: try Fixtures.data(rich))
        try wb.defineName("Bang", formula: "='Dữ liệu'!$A$1:$A$1")
        XCTAssertEqual(try reopen(wb).definedNames.first { $0.name == "Bang" }?.formula, "'Dữ liệu'!$A$1:$A$1")
    }

    func testRenameSheetUpdatesDefinedName() throws {
        let wb = try Workbook(data: try Fixtures.data(rich))
        try wb.defineName("VungMoi", formula: "'Dữ liệu'!$A$1:$A$2")
        try wb.renameSheet("Dữ liệu", to: "DuLieuMoi")
        XCTAssertEqual(try reopen(wb).definedNames.first { $0.name == "VungMoi" }?.formula, "DuLieuMoi!$A$1:$A$2",
                       "tên sheet mới không cần dấu nháy nên công thức bỏ nháy như Excel")
    }
}
