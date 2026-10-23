import XCTest

/// Bảo đảm thư viện chạy NGOẠI TUYẾN hoàn toàn trên iOS/iPadOS:
/// không có mã gọi mạng, không phụ thuộc gói ngoài, chỉ import Foundation và module nội bộ.
final class OfflineGuaranteeTests: XCTestCase {
    private var packageRoot: URL {
        // Tests/OOXMLPackageTests/OfflineGuaranteeTests.swift → gốc gói
        URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
    }

    private func sourceFiles() throws -> [URL] {
        let src = packageRoot.appendingPathComponent("Sources")
        guard let e = FileManager.default.enumerator(at: src, includingPropertiesForKeys: nil) else { return [] }
        return e.compactMap { $0 as? URL }.filter { $0.pathExtension == "swift" }
    }

    func testNoNetworkAPIsInLibrarySources() throws {
        let files = try sourceFiles()
        XCTAssertGreaterThan(files.count, 15, "không tìm thấy mã nguồn tại \(packageRoot.path)")
        let forbidden = ["URLSession", "URLRequest", "NSURLConnection", "CFNetwork", "NWConnection", "NWPathMonitor",
                         "import Network", "CFStream", "Socket", "WKWebView", "Process(", "dlopen", "contentsOf: URL(string"]
        for f in files {
            let text = try String(contentsOf: f, encoding: .utf8)
            for word in forbidden where text.contains(word) {
                XCTFail("\(f.lastPathComponent) dùng API mạng/tiến trình ngoài: \(word)")
            }
        }
    }

    func testOnlyFoundationAndInternalModulesAreImported() throws {
        let allowed: Set<String> = ["Foundation", "OOXMLZip", "OOXMLPackage", "OOXMLSpreadsheet", "OOXMLWord", "OOXMLPresentation"]
        for f in try sourceFiles() {
            let text = try String(contentsOf: f, encoding: .utf8)
            for line in text.split(separator: "\n") {
                let t = line.trimmingCharacters(in: .whitespaces)
                guard t.hasPrefix("import ") || t.hasPrefix("@_exported import ") else { continue }
                let module = String(t.split(separator: " ").last ?? "")
                XCTAssertTrue(allowed.contains(module), "\(f.lastPathComponent): import \(module) không được phép")
            }
        }
    }

    func testPackageHasNoExternalDependencies() throws {
        let manifest = try String(contentsOf: packageRoot.appendingPathComponent("Package.swift"), encoding: .utf8)
        XCTAssertFalse(manifest.contains(".package("), "Package.swift không được khai báo gói phụ thuộc bên ngoài")
        XCTAssertTrue(manifest.contains(".iOS(.v15)"))
    }
}
