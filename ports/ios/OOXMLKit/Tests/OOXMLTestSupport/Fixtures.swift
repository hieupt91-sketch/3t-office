import Foundation

/// Truy cập fixture dùng chung cho mọi bộ test và nơi lưu tệp kết quả để kiểm chéo bên ngoài.
public enum Fixtures {
    public static var root: URL {
        Bundle.module.resourceURL!.appendingPathComponent("Fixtures", isDirectory: true)
    }

    public static func url(_ relativePath: String) -> URL {
        root.appendingPathComponent(relativePath)
    }

    public static func data(_ relativePath: String) throws -> Data {
        try Data(contentsOf: url(relativePath))
    }

    /// Danh sách fixture trong một thư mục con, lọc theo đuôi tệp.
    public static func list(_ directory: String, extensions: Set<String>) -> [String] {
        let dir = root.appendingPathComponent(directory, isDirectory: true)
        let names = (try? FileManager.default.contentsOfDirectory(atPath: dir.path)) ?? []
        return names.filter { extensions.contains(($0 as NSString).pathExtension.lowercased()) }
            .sorted()
            .map { directory + "/" + $0 }
    }

    /// Thư mục tạm riêng cho một test (xóa khi gọi lại cùng tên).
    public static func scratchDirectory(_ name: String) throws -> URL {
        let dir = FileManager.default.temporaryDirectory
            .appendingPathComponent("OOXMLKitTests", isDirectory: true)
            .appendingPathComponent(name, isDirectory: true)
        try? FileManager.default.removeItem(at: dir)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    /// Nếu đặt biến môi trường OOXMLKIT_ARTIFACTS, tệp kết quả được chép vào đó để
    /// scripts/verify_artifacts.py kiểm chéo bằng bộ đọc độc lập (zipfile, openpyxl, python-docx, python-pptx).
    public static func publishArtifact(_ data: Data, name: String) {
        guard let dir = ProcessInfo.processInfo.environment["OOXMLKIT_ARTIFACTS"], !dir.isEmpty else { return }
        let url = URL(fileURLWithPath: dir, isDirectory: true)
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        try? data.write(to: url.appendingPathComponent(name))
    }
}
