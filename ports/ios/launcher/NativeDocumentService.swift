import UIKit
import UniformTypeIdentifiers

final class NativeDocumentService: NSObject, UIDocumentPickerDelegate {
    typealias Reply = (Any?, String?) -> Void

    private enum Operation {
        case open(appKind: String, reply: Reply)
        case export(tempURL: URL, appKind: String, reply: Reply)
    }

    private weak var presenter: UIViewController?
    private var operation: Operation?
    private var openURLs: [String: URL] = [:]
    private let maximumBytes = 24 * 1024 * 1024

    init(presenter: UIViewController) {
        self.presenter = presenter
    }

    func open(appKind: String, reply: @escaping Reply) {
        guard operation == nil, let presenter else {
            reply(Self.error("Một hộp thoại tệp khác đang mở. Hãy hoàn tất thao tác đó trước."), nil)
            return
        }
        guard let type = Self.contentType(for: appKind) else {
            reply(Self.error("Ứng dụng tài liệu không hợp lệ."), nil)
            return
        }
        operation = .open(appKind: appKind, reply: reply)
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: [type], asCopy: false)
        picker.delegate = self
        picker.allowsMultipleSelection = false
        picker.shouldShowFileExtensions = true
        presenter.present(picker, animated: true)
    }

    func save(
        content: String,
        appKind: String,
        suggestedName: String?,
        reply: @escaping Reply
    ) {
        guard operation == nil, let presenter else {
            reply(Self.error("Một hộp thoại tệp khác đang mở. Hãy hoàn tất thao tác đó trước."), nil)
            return
        }
        guard let specification = Self.specification(for: appKind) else {
            reply(Self.error("Ứng dụng tài liệu không hợp lệ."), nil)
            return
        }
        guard let data = content.data(using: .utf8), data.count <= maximumBytes else {
            reply(Self.error("Tài liệu vượt giới hạn 24 MB của bản iOS thử nghiệm."), nil)
            return
        }
        guard Self.validate(data: data, appKind: appKind) else {
            reply(Self.error("Nội dung tài liệu không hợp lệ; 3T Office không tạo tệp để tránh mất dữ liệu."), nil)
            return
        }
        do {
            let directory = FileManager.default.temporaryDirectory
                .appendingPathComponent("VNOfficeExport-\(UUID().uuidString)", isDirectory: true)
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            let name = Self.safeFileName(suggestedName, fallback: specification.defaultName,
                                         extension: specification.extension)
            let tempURL = directory.appendingPathComponent(name, isDirectory: false)
            try data.write(to: tempURL, options: [.atomic])
            operation = .export(tempURL: tempURL, appKind: appKind, reply: reply)
            let picker = UIDocumentPickerViewController(forExporting: [tempURL], asCopy: true)
            picker.delegate = self
            picker.shouldShowFileExtensions = true
            presenter.present(picker, animated: true)
        } catch {
            reply(Self.error("Không thể chuẩn bị bản lưu: \(error.localizedDescription)"), nil)
        }
    }

    func saveInPlace(
        content: String,
        appKind: String,
        token: String,
        reply: @escaping Reply
    ) {
        guard let url = openURLs[token] else {
            reply(Self.error("Quyền truy cập tệp đã hết hạn. Hãy dùng Lưu bản sao."), nil)
            return
        }
        guard Self.matches(url: url, appKind: appKind),
              let data = content.data(using: .utf8), data.count <= maximumBytes,
              Self.validate(data: data, appKind: appKind) else {
            reply(Self.error("Không thể ghi: loại tệp hoặc nội dung không được hỗ trợ offline."), nil)
            return
        }
        let accessed = url.startAccessingSecurityScopedResource()
        defer { if accessed { url.stopAccessingSecurityScopedResource() } }
        var coordinationError: NSError?
        var writeError: Error?
        NSFileCoordinator().coordinate(writingItemAt: url, options: .forReplacing,
                                       error: &coordinationError) { coordinatedURL in
            do { try data.write(to: coordinatedURL, options: [.atomic]) }
            catch { writeError = error }
        }
        if let error = writeError ?? coordinationError {
            reply(Self.error("Không thể lưu vào tệp đã mở: \(error.localizedDescription)"), nil)
        } else {
            reply(["status": "ok", "path": token, "fileName": url.lastPathComponent], nil)
        }
    }

    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let operation else { return }
        self.operation = nil
        guard let url = urls.first else {
            finish(operation, value: ["status": "cancelled"])
            return
        }
        switch operation {
        case let .open(appKind, reply):
            openDocument(url: url, appKind: appKind, reply: reply)
        case let .export(tempURL, appKind, reply):
            defer { try? FileManager.default.removeItem(at: tempURL.deletingLastPathComponent()) }
            let token = makeToken(url: url, appKind: appKind)
            reply(["status": "ok", "path": token, "fileName": url.lastPathComponent], nil)
        }
    }

    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        guard let operation else { return }
        self.operation = nil
        if case let .export(tempURL, _, _) = operation {
            try? FileManager.default.removeItem(at: tempURL.deletingLastPathComponent())
        }
        finish(operation, value: ["status": "cancelled"])
    }

    private func openDocument(url: URL, appKind: String, reply: @escaping Reply) {
        guard Self.matches(url: url, appKind: appKind) else {
            reply(Self.error(Self.unsupportedMessage(appKind: appKind)), nil)
            return
        }
        let accessed = url.startAccessingSecurityScopedResource()
        defer { if accessed { url.stopAccessingSecurityScopedResource() } }
        var coordinationError: NSError?
        var readResult: Result<Data, Error>?
        NSFileCoordinator().coordinate(readingItemAt: url, options: [], error: &coordinationError) {
            coordinatedURL in
            readResult = Result { try Data(contentsOf: coordinatedURL, options: [.mappedIfSafe]) }
        }
        if let error = coordinationError {
            reply(Self.error("Không thể truy cập tệp: \(error.localizedDescription)"), nil)
            return
        }
        guard case let .success(data)? = readResult else {
            let detail: String
            if case let .failure(error)? = readResult { detail = ": \(error.localizedDescription)" }
            else { detail = "." }
            reply(Self.error("Không thể đọc tệp đã chọn\(detail)"), nil)
            return
        }
        guard data.count <= maximumBytes else {
            reply(Self.error("Tệp vượt giới hạn 24 MB của bản iOS thử nghiệm."), nil)
            return
        }
        guard Self.validate(data: data, appKind: appKind),
              let content = String(data: data, encoding: .utf8) else {
            reply(Self.error("Tệp không đúng cấu trúc hoặc không dùng mã hóa UTF-8."), nil)
            return
        }
        let token = makeToken(url: url, appKind: appKind)
        reply([
            "status": "ok", "content": content, "sourcePath": token,
            "fileName": url.lastPathComponent
        ], nil)
    }

    private func makeToken(url: URL, appKind: String) -> String {
        let token = "ios-document://\(UUID().uuidString)/\(url.lastPathComponent)"
        openURLs[token] = url
        return token
    }

    private func finish(_ operation: Operation, value: Any) {
        switch operation {
        case let .open(_, reply), let .export(_, _, reply): reply(value, nil)
        }
    }

    private static func specification(for appKind: String) -> (extension: String, defaultName: String)? {
        switch appKind {
        case "writer": return ("html", "TaiLieu.html")
        case "sheet": return ("fods", "BangTinh.fods")
        case "slides": return ("fodp", "TrinhChieu.fodp")
        default: return nil
        }
    }

    private static func contentType(for appKind: String) -> UTType? {
        guard let item = specification(for: appKind) else { return nil }
        return UTType(filenameExtension: item.extension) ?? UTType(importedAs: "vn.office.\(item.extension)")
    }

    private static func matches(url: URL, appKind: String) -> Bool {
        let ext = url.pathExtension.lowercased()
        if appKind == "writer" { return ["html", "htm"].contains(ext) }
        return specification(for: appKind)?.extension == ext
    }

    private static func validate(data: Data, appKind: String) -> Bool {
        guard let text = String(data: data, encoding: .utf8), !text.isEmpty else { return false }
        switch appKind {
        case "writer":
            let lowered = text.lowercased()
            return !lowered.contains("<script") && !lowered.contains("<iframe")
                && !lowered.contains("<object") && !lowered.contains("javascript:")
                && !lowered.range(of: #"\son[a-z]+\s*="#, options: .regularExpression).isSome
        case "sheet":
            return text.range(of: "<office:document", options: .caseInsensitive) != nil
                && text.range(of: "<office:spreadsheet", options: .caseInsensitive) != nil
        case "slides":
            return text.range(of: "<office:document", options: .caseInsensitive) != nil
                && text.range(of: "<draw:page", options: .caseInsensitive) != nil
        default: return false
        }
    }

    private static func safeFileName(_ suggested: String?, fallback: String,
                                     extension requiredExtension: String) -> String {
        var name = (suggested ?? fallback).split(separator: "/").last.map(String.init) ?? fallback
        name = name.replacingOccurrences(of: ":", with: "-")
        if name.isEmpty { name = fallback }
        if (name as NSString).pathExtension.lowercased() != requiredExtension {
            name = ((name as NSString).deletingPathExtension as NSString)
                .appendingPathExtension(requiredExtension) ?? fallback
        }
        return name
    }

    private static func unsupportedMessage(appKind: String) -> String {
        let allowed = appKind == "writer" ? "html/.htm" : (specification(for: appKind)?.extension ?? "")
        return "Bản iOS offline hiện chỉ mở tệp .\(allowed) cho ứng dụng này. DOCX/XLSX/PPTX chưa được hỗ trợ và sẽ không bị sửa đổi."
    }

    private static func error(_ message: String) -> [String: String] {
        ["status": "error", "message": message]
    }
}

private extension Optional {
    var isSome: Bool { self != nil }
}
