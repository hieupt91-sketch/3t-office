import SwiftUI
import UIKit
import WebKit
import OOXMLBridge
import UniformTypeIdentifiers

struct ContentView: View {
    var body: some View { MobileOfficeWebView().ignoresSafeArea(.container, edges: [.bottom]) }
}

/// Native shell for the shared VN Office Writer/Sheet/Slides renderer.
/// The renderer is bundled from the monorepo at build time; OOXMLBridge remains
/// in-process and offline on iOS/iPadOS.
struct MobileOfficeWebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let controller = WKUserContentController()
        let diagnostics = """
        window.vnoMobileFiles = Object.freeze({
          request: (payload) => window.webkit.messageHandlers.mobileFiles.postMessage(payload)
        });
        window.addEventListener('error', function(e) {
          document.documentElement.dataset.vnoError = String(e.message || e.error || 'unknown');
        });
        window.addEventListener('unhandledrejection', function(e) {
          document.documentElement.dataset.vnoError = String(e.reason || 'unhandled rejection');
        });
        """
        controller.addUserScript(WKUserScript(source: diagnostics, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        let bridge = OOXMLWebViewBridge()
        bridge.install(into: controller, name: "ooxml")
        let files = MobileFilesBridge()
        files.install(into: controller, name: "mobileFiles")
        let config = WKWebViewConfiguration()
        config.userContentController = controller
        config.defaultWebpagePreferences.allowsContentJavaScript = true
        config.setURLSchemeHandler(LocalWebSchemeHandler(), forURLScheme: "vno")
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.load(URLRequest(url: URL(string: "vno://app/index.html")!))
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate {
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            webView.evaluateJavaScript("document.documentElement.dataset.vnoError || ''") { value, error in
                if let value, !(value as? String ?? "").isEmpty { print("[VNOfficeMobile] Web UI error: \(value)") }
                if let error { print("[VNOfficeMobile] Web UI diagnostic error: \(error)") }
            }
            webView.evaluateJavaScript("""
                (() => {
                  if (!document.getElementById('vno-mobile-css')) {
                    const link = document.createElement('link');
                    link.id = 'vno-mobile-css'; link.rel = 'stylesheet'; link.href = 'MobileWebApp.css';
                    document.head.appendChild(link);
                  }
                  const callNative = (name, payload) => new Promise((resolve, reject) => {
                    const handler = window.webkit?.messageHandlers?.[name];
                    if (!handler) return reject(new Error('Native bridge chưa sẵn sàng: ' + name));
                    const request = handler.postMessage(payload);
                    if (request && typeof request.then === 'function') {
                      request.then((value) => {
                        if (value && value.error) reject(new Error(value.error));
                        else resolve(value);
                      }).catch(reject);
                    } else resolve(undefined);
                  });
                  window.vnoMobileRuntime = Object.freeze({
                    offline: true,
                    engine: 'OOXMLKit',
                    files: Object.freeze({
                      open: () => window.vnoMobileFiles.request({ op: 'open' }),
                      save: (base64, filename) => window.vnoMobileFiles.request({ op: 'save', base64, filename })
                    }),
                    ooxml: Object.freeze({
                      call: (payload) => callNative('ooxml', payload)
                    })
                  });
                })();
                """)
            DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                webView.evaluateJavaScript("""
                    (() => {
                      if (!document.querySelector('.vno-shell')) {
                        const err = document.documentElement.dataset.vnoError || 'UI chưa mount; xem lỗi module trong console';
                        document.body.innerHTML = '<pre style="padding:20px;white-space:pre-wrap;font:14px monospace">VN Office Mobile\\n' + err.replace(/[<>&]/g, '') + '</pre>';
                      }
                    })();
                    """)
            }
        }
    }
}

/// Native Files bridge. It only moves bytes between the WebView and Files;
/// OOXML parsing remains inside OOXMLBridge/OOXMLKit.
@available(iOS 14.0, *)
final class MobileFilesBridge: NSObject, WKScriptMessageHandlerWithReply, UIDocumentPickerDelegate {
    private weak var webView: WKWebView?
    private var pendingReply: ((Any?, String?) -> Void)?
    private var pendingOperation: String?
    private var pendingFilename: String?

    func install(into controller: WKUserContentController, name: String) {
        controller.addScriptMessageHandler(self, contentWorld: .page, name: name)
    }

    func userContentController(_ controller: WKUserContentController,
                               didReceive message: WKScriptMessage,
                               replyHandler: @escaping (Any?, String?) -> Void) {
        guard let body = message.body as? [String: Any], let op = body["op"] as? String else {
            replyHandler(nil, "mobileFiles: yêu cầu không hợp lệ"); return
        }
        guard let webView = message.webView else {
            replyHandler(nil, "mobileFiles: không có WebView"); return
        }
        self.webView = webView
        switch op {
        case "open":
            presentPicker(forOpening: true, filename: nil, reply: replyHandler)
        case "save":
            guard let base64 = body["base64"] as? String,
                  let data = Data(base64Encoded: base64) else {
                replyHandler(nil, "mobileFiles: base64 không hợp lệ"); return
            }
            presentPicker(forOpening: false,
                          filename: body["filename"] as? String,
                          data: data,
                          reply: replyHandler)
        default:
            replyHandler(nil, "mobileFiles: op không hỗ trợ"); return
        }
    }

    private func presentPicker(forOpening: Bool, filename: String?, data: Data? = nil,
                               reply: @escaping (Any?, String?) -> Void) {
        guard pendingReply == nil else { reply(nil, "mobileFiles: đang có thao tác Files khác"); return }
        pendingReply = reply
        pendingOperation = forOpening ? "open" : "save"
        pendingFilename = filename
        let picker: UIDocumentPickerViewController
        if forOpening {
            picker = UIDocumentPickerViewController(forOpeningContentTypes: [
                UTType(filenameExtension: "docx")!, UTType(filenameExtension: "xlsx")!,
                UTType(filenameExtension: "pptx")!,
                UTType.pdf, .data
            ], asCopy: true)
        } else {
            let ext = URL(fileURLWithPath: filename ?? "TaiLieu.docx").pathExtension
            let type = UTType(filenameExtension: ext) ?? .data
            let temp = FileManager.default.temporaryDirectory.appendingPathComponent(filename ?? "TaiLieu.docx")
            try? data?.write(to: temp, options: .atomic)
            picker = UIDocumentPickerViewController(forExporting: [temp], asCopy: true)
            picker.allowsMultipleSelection = false
            _ = type // the extension determines the Files document type.
        }
        picker.delegate = self
        topViewController()?.present(picker, animated: true)
    }

    func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        defer { clearPending() }
        guard let url = urls.first, let reply = pendingReply else { return }
        if pendingOperation == "open" {
            guard let data = try? Data(contentsOf: url) else { reply(nil, "mobileFiles: không đọc được tệp"); return }
            reply(["ok": true, "filename": url.lastPathComponent, "base64": data.base64EncodedString()], nil)
        } else {
            reply(["ok": true, "path": url.path, "filename": url.lastPathComponent], nil)
        }
    }

    func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        pendingReply?(["ok": false, "cancelled": true], nil)
        clearPending()
    }

    private func clearPending() {
        pendingReply = nil; pendingOperation = nil; pendingFilename = nil
    }

    private func topViewController() -> UIViewController? {
        guard let scene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first,
              let root = scene.windows.first(where: { $0.isKeyWindow })?.rootViewController else { return nil }
        var current = root
        while let presented = current.presentedViewController { current = presented }
        return current
    }
}

/// Serves only the read-only WebApp bundle. A custom scheme avoids iOS file:// module
/// restrictions while keeping every resource local and offline.
final class LocalWebSchemeHandler: NSObject, WKURLSchemeHandler {
    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url else { return }
        let relative = url.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard !relative.contains(".."), let root = Bundle.main.url(forResource: "WebApp", withExtension: nil) else {
            urlSchemeTask.didFailWithError(NSError(domain: "VNOfficeMobile", code: 1)); return
        }
        let file = root.appendingPathComponent(relative)
        guard let data = try? Data(contentsOf: file) else {
            urlSchemeTask.didFailWithError(NSError(domain: "VNOfficeMobile", code: 2)); return
        }
        let mime: String
        switch file.pathExtension.lowercased() {
        case "html": mime = "text/html"
        case "js": mime = "text/javascript"
        case "css": mime = "text/css"
        case "json": mime = "application/json"
        case "svg": mime = "image/svg+xml"
        case "ttf": mime = "font/ttf"
        case "woff", "woff2": mime = "font/woff2"
        default: mime = "application/octet-stream"
        }
        urlSchemeTask.didReceive(URLResponse(url: url, mimeType: mime, expectedContentLength: data.count, textEncodingName: "utf-8"))
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}
}

#Preview { ContentView() }
