import SwiftUI
import WebKit
import OOXMLBridge

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
                  window.vnoMobileRuntime = { offline: true, engine: 'OOXMLKit' };
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
