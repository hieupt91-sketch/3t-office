import AppKit
import Foundation

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var pendingFiles: [String] = []
    private var launched = false
    private var child: Process?

    func applicationDidFinishLaunching(_ notification: Notification) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
            self?.launchOffice()
        }
    }

    func application(_ sender: NSApplication, openFiles filenames: [String]) {
        if launched {
            sender.reply(toOpenOrPrint: .failure)
            showError("Ứng dụng đã khởi động. Hãy mở tệp từ cửa sổ hiện tại.")
            return
        }
        pendingFiles.append(contentsOf: filenames)
        sender.reply(toOpenOrPrint: .success)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { false }

    private func launchOffice() {
        guard !launched else { return }
        launched = true
        let environment = ProcessInfo.processInfo.environment
        let appKind = (Bundle.main.object(forInfoDictionaryKey: "VNOfficeAppKind") as? String) ?? "writer"
        let fileArguments = pendingFiles.isEmpty
            ? Array(ProcessInfo.processInfo.arguments.dropFirst()).filter { !$0.hasPrefix("-psn_") }
            : pendingFiles

        let applicationSupport = environment["VNO_APPLICATION_SUPPORT_ROOT"]
            .map { URL(fileURLWithPath: $0, isDirectory: true) }
            ?? FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)
                .first!.appendingPathComponent("VNOffice", isDirectory: true)
        let distributionRoot = Bundle.main.bundleURL.deletingLastPathComponent()
        let versionRoot: URL
        do {
            versionRoot = try resolveVersionRoot(
                environment: environment,
                applicationSupport: applicationSupport,
                distributionRoot: distributionRoot
            )
        } catch {
            showError("Không thể khởi tạo mã ứng dụng: \(error.localizedDescription)")
            return
        }
        let mainScript = versionRoot.appendingPathComponent("app/main.py")

        let runtimePython = environment["VNO_RUNTIME_PYTHON"].map(URL.init(fileURLWithPath:))
            ?? distributionRoot.appendingPathComponent("Runtime/bin/python3")
        let arguments = [mainScript.path, "--app=\(appKind)"] + fileArguments

        if environment["VNO_LAUNCHER_PRINT_COMMAND"] == "1" {
            print(([runtimePython.path] + arguments).map(shellDisplay).joined(separator: " "))
            NSApp.terminate(nil)
            return
        }

        guard FileManager.default.isExecutableFile(atPath: runtimePython.path) else {
            showError("Thiếu Python runtime ngoại tuyến tại:\n\(runtimePython.path)")
            return
        }
        guard FileManager.default.fileExists(atPath: mainScript.path) else {
            showError("Thiếu mã ứng dụng đã cài tại:\n\(mainScript.path)")
            return
        }

        let process = Process()
        process.executableURL = runtimePython
        process.arguments = arguments
        process.currentDirectoryURL = versionRoot
        var childEnvironment = environment
        if childEnvironment["VNOFFICE_SOFFICE_PATH"] == nil {
            childEnvironment["VNOFFICE_SOFFICE_PATH"] = distributionRoot
                .appendingPathComponent("LibreOffice.app/Contents/MacOS/soffice").path
        }
        process.environment = childEnvironment
        process.terminationHandler = { _ in DispatchQueue.main.async { NSApp.terminate(nil) } }
        do {
            try process.run()
            child = process
        } catch {
            showError("Không thể khởi động VN Office: \(error.localizedDescription)")
        }
    }

    private func showError(_ message: String) {
        let alert = NSAlert()
        alert.alertStyle = .critical
        alert.messageText = "Không thể mở VN Office"
        alert.informativeText = message
        alert.addButton(withTitle: "Đóng")
        alert.runModal()
        NSApp.terminate(nil)
    }
}

private func resolveVersionRoot(
    environment: [String: String], applicationSupport: URL, distributionRoot: URL
) throws -> URL {
    if let override = environment["VNO_APP_VERSION_ROOT"] {
        return URL(fileURLWithPath: override, isDirectory: true)
    }
    let current = applicationSupport.appendingPathComponent("current", isDirectory: true)
    let main = current.appendingPathComponent("app/main.py")
    if FileManager.default.fileExists(atPath: main.path) { return current }

    let versionsRoot = distributionRoot.appendingPathComponent("Versions", isDirectory: true)
    let seedCurrent = versionsRoot.appendingPathComponent("current", isDirectory: true)
    let seedMain = seedCurrent.appendingPathComponent("app/main.py")
    guard FileManager.default.fileExists(atPath: seedMain.path) else { return current }

    let resolvedSeed = seedCurrent.resolvingSymlinksInPath()
    let versionName = resolvedSeed.lastPathComponent
    guard versionName.hasPrefix("app-"),
          resolvedSeed.path.hasPrefix(versionsRoot.resolvingSymlinksInPath().path + "/") else {
        throw NSError(domain: "VNOfficeLauncher", code: 1,
                      userInfo: [NSLocalizedDescriptionKey: "Seed version không hợp lệ"])
    }
    let manager = FileManager.default
    try manager.createDirectory(at: applicationSupport, withIntermediateDirectories: true)
    let target = applicationSupport.appendingPathComponent(versionName, isDirectory: true)
    if !manager.fileExists(atPath: target.path) {
        let staging = applicationSupport.appendingPathComponent(".seed-\(UUID().uuidString)")
        do {
            try manager.copyItem(at: resolvedSeed, to: staging)
            do { try manager.moveItem(at: staging, to: target) }
            catch {
                try? manager.removeItem(at: staging)
                if !manager.fileExists(atPath: target.path) { throw error }
            }
        } catch {
            try? manager.removeItem(at: staging)
            throw error
        }
    }
    guard manager.fileExists(atPath: target.appendingPathComponent("app/main.py").path) else {
        throw NSError(domain: "VNOfficeLauncher", code: 2,
                      userInfo: [NSLocalizedDescriptionKey: "Phiên bản đã cài không đầy đủ: \(versionName)"])
    }
    let temporary = applicationSupport.appendingPathComponent(".current-\(UUID().uuidString)")
    try manager.createSymbolicLink(atPath: temporary.path, withDestinationPath: versionName)
    if manager.fileExists(atPath: current.path)
        || (try? manager.destinationOfSymbolicLink(atPath: current.path)) != nil {
        try? manager.removeItem(at: current)
    }
    do { try manager.moveItem(at: temporary, to: current) }
    catch {
        try? manager.removeItem(at: temporary)
        if !manager.fileExists(atPath: current.appendingPathComponent("app/main.py").path) { throw error }
    }
    return current
}

@main
enum LauncherMain {
    static func main() {
        if ProcessInfo.processInfo.environment["VNO_LAUNCHER_PRINT_COMMAND"] == "1" {
            let environment = ProcessInfo.processInfo.environment
            let appKind = (Bundle.main.object(forInfoDictionaryKey: "VNOfficeAppKind") as? String) ?? "writer"
            let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
                .appendingPathComponent("VNOffice/current", isDirectory: true)
            let versionRoot = environment["VNO_APP_VERSION_ROOT"].map(URL.init(fileURLWithPath:)) ?? support
            let distributionRoot = Bundle.main.bundleURL.deletingLastPathComponent()
            let runtime = environment["VNO_RUNTIME_PYTHON"].map(URL.init(fileURLWithPath:))
                ?? distributionRoot.appendingPathComponent("Runtime/bin/python3")
            let files = Array(ProcessInfo.processInfo.arguments.dropFirst()).filter { !$0.hasPrefix("-psn_") }
            let command = [runtime.path, versionRoot.appendingPathComponent("app/main.py").path, "--app=\(appKind)"] + files
            print(command.map(shellDisplay).joined(separator: " "))
            return
        }
        let application = NSApplication.shared
        let delegate = AppDelegate()
        application.delegate = delegate
        application.run()
        withExtendedLifetime(delegate) {}
    }
}

private func shellDisplay(_ value: String) -> String {
    "'" + value.replacingOccurrences(of: "'", with: "'\\''") + "'"
}
