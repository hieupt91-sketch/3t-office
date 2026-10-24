import Foundation
import XCTest
import OOXMLPackage

/// Kiểm chứng chung cho chu trình mở → sửa → lưu → đóng → mở lại.
public enum RoundTrip {
    /// Ghi `saved` ra tệp thật, đọc lại từ đĩa, kiểm tra gói hợp lệ và so với bản gốc:
    /// - Chỉ những phần trong `allowedChanges` (hoặc khớp tiền tố kết thúc bằng "*") được phép đổi/thêm/xóa.
    /// - Mọi phần còn lại phải trùng nội dung VÀ trùng byte nén (chép nguyên trạng).
    /// Trả về dữ liệu đọc lại từ đĩa.
    @discardableResult
    public static func verify(original: Data, saved: Data, allowedChanges: Set<String>,
                              requireChanged: Set<String> = [], name: String,
                              file: StaticString = #filePath, line: UInt = #line) throws -> Data {
        let dir = try Fixtures.scratchDirectory("roundtrip-\(name)")
        let url = dir.appendingPathComponent(name)
        try saved.write(to: url, options: .atomic)
        let reread = try Data(contentsOf: url)
        XCTAssertEqual(reread, saved, file: file, line: line)

        // Chỉ lỗi MỚI so với bản gốc mới tính là hỏng (lỗi sẵn có trong tệp nguồn phải được giữ nguyên, không "sửa" âm thầm).
        let baseline = Set(PackageValidator.validate(original))
        let issues = PackageValidator.validate(reread).filter { !baseline.contains($0) }
        XCTAssertEqual(issues, [], "gói lưu ra phát sinh lỗi mới: \(name)", file: file, line: line)

        let diff = try PackageDiff(original: original, saved: reread)
        func allowed(_ n: String) -> Bool {
            allowedChanges.contains(n) || allowedChanges.contains { $0.hasSuffix("*") && n.hasPrefix(String($0.dropLast())) }
        }
        for n in diff.changed + diff.added + diff.removed where !allowed(n) {
            XCTFail("\(name): phần \(n) bị thay đổi ngoài dự kiến (\(diff))", file: file, line: line)
        }
        for n in diff.unchanged where !diff.rawIdentical.contains(n) {
            XCTFail("\(name): phần \(n) không đổi nội dung nhưng bị nén lại", file: file, line: line)
        }
        for n in requireChanged where !(diff.changed + diff.added).contains(n) {
            XCTFail("\(name): phần \(n) lẽ ra phải đổi", file: file, line: line)
        }
        Fixtures.publishArtifact(reread, name: name)
        return reread
    }

    /// Lưu không sửa gì phải cho gói mà mọi phần trùng byte nén với bản gốc.
    public static func assertNoOpSaveIsLossless(_ original: Data, saved: Data, name: String,
                                                file: StaticString = #filePath, line: UInt = #line) throws {
        try verify(original: original, saved: saved, allowedChanges: [], name: name, file: file, line: line)
    }

    /// Chuỗi XML của một phần trong gói.
    public static func partString(_ data: Data, _ part: String) throws -> String {
        let pkg = try OPCPackage(data: data)
        return String(decoding: try pkg.data(of: PartName(part)), as: UTF8.self)
    }
}
