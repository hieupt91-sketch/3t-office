import UIKit
import WebKit

final class MobileOfficeViewController: UIViewController, WKNavigationDelegate, WKScriptMessageHandler {
    private var webView: WKWebView!
    private let offlineAssets = OfflineAssetSchemeHandler()

    override func loadView() {
        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(offlineAssets, forURLScheme: "vno")
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.websiteDataStore = .nonPersistent()

        let controller = configuration.userContentController
        controller.add(self, name: "vnoMobile")
        controller.addUserScript(WKUserScript(
            source: Self.capabilityBootstrap,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        ))
        if let css = Self.bundledText("mobile-shell", extension: "css", subdirectory: "Web") {
            controller.addUserScript(WKUserScript(
                source: Self.cssInjection(css),
                injectionTime: .atDocumentEnd,
                forMainFrameOnly: true
            ))
        }

        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.allowsBackForwardNavigationGestures = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.accessibilityIdentifier = "vno-ios-webview"
        if #available(iOS 16.4, *) { webView.isInspectable = true }
        let container = UIView()
        container.backgroundColor = .systemBackground
        webView.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.leadingAnchor.constraint(equalTo: container.safeAreaLayoutGuide.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: container.safeAreaLayoutGuide.trailingAnchor),
            webView.topAnchor.constraint(equalTo: container.safeAreaLayoutGuide.topAnchor),
            webView.bottomAnchor.constraint(equalTo: container.safeAreaLayoutGuide.bottomAnchor)
        ])
        view = container
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        loadBundledOffice()
    }

    deinit {
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: "vnoMobile")
    }

    private func loadBundledOffice() {
        guard Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Web") != nil,
              let index = URL(string: "vno://app/index.html?mobile=ios&singleApp=0") else {
            showFatal("Thiếu giao diện offline trong application bundle.")
            return
        }
        webView.load(URLRequest(url: index))
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) { [weak webView] in
            webView?.evaluateJavaScript(
                "({root:!!document.getElementById('vno-app-root'),app:!!window.__vnoAppInstance,mobile:window.vnoPlatformCapabilities?.platform})"
            ) { result, error in
                if let error {
                    print("VNO_IOS_READY_FAIL \(error.localizedDescription)")
                } else {
                    print("VNO_IOS_READY \(String(describing: result))")
                }
            }
        }
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let scheme = navigationAction.request.url?.scheme?.lowercased() else {
            decisionHandler(.cancel)
            return
        }
        decisionHandler(["vno", "about"].contains(scheme) ? .allow : .cancel)
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == "vnoMobile" else { return }
        print("VNO_IOS_BRIDGE \(String(describing: message.body))")
    }

    private func showFatal(_ message: String) {
        let label = UILabel()
        label.numberOfLines = 0
        label.textAlignment = .center
        label.text = message
        label.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(label)
        NSLayoutConstraint.activate([
            label.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 24),
            label.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -24),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
    }

    private static let capabilityBootstrap = """
    (() => {
      const idiom = /iPad/.test(navigator.userAgent) ? 'ipad' : 'iphone';
      window.vnoPlatformCapabilities = Object.freeze({
        platform: 'ios', idiom, offline: true, embeddedAssets: true,
        officeEngine: false, documentPicker: false, ooxmlRoundTrip: false,
        cloudDocumentUpload: false
      });
      document.documentElement.dataset.vnoPlatform = 'ios';
      document.documentElement.dataset.vnoIdiom = idiom;
      const viewport = document.querySelector('meta[name="viewport"]');
      viewport?.setAttribute(
        'content',
        'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover'
      );
      const updateLayout = () => {
        const compact = Math.min(window.innerWidth, window.innerHeight) < 700;
        document.documentElement.dataset.vnoSize = compact ? 'compact' : 'regular';
        document.documentElement.dataset.vnoOrientation =
          window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
      };
      updateLayout();
      window.addEventListener('resize', updateLayout, { passive: true });
      window.addEventListener('error', event => {
        window.webkit.messageHandlers.vnoMobile.postMessage({
          type: 'javascript-error',
          message: event.message || 'unknown error',
          source: event.filename || '',
          line: event.lineno || 0
        });
      });
      window.addEventListener('unhandledrejection', event => {
        window.webkit.messageHandlers.vnoMobile.postMessage({
          type: 'promise-rejection',
          message: String(event.reason?.stack || event.reason || 'unknown rejection')
        });
      });
      window.webkit.messageHandlers.vnoMobile.postMessage({ type: 'bridge-ready', idiom });
    })();
    """

    private static func bundledText(
        _ name: String, extension ext: String, subdirectory: String
    ) -> String? {
        guard let url = Bundle.main.url(
            forResource: name, withExtension: ext, subdirectory: subdirectory
        ) else { return nil }
        return try? String(contentsOf: url, encoding: .utf8)
    }

    private static func cssInjection(_ css: String) -> String {
        guard let data = try? JSONSerialization.data(withJSONObject: [css]),
              let literal = String(data: data, encoding: .utf8)
        else { return "" }
        return """
        (() => {
          const style = document.createElement('style');
          style.id = 'vno-ios-mobile-shell';
          style.textContent = \(literal)[0];
          document.head.appendChild(style);
        })();
        """
    }
}

private final class OfflineAssetSchemeHandler: NSObject, WKURLSchemeHandler {
    private let root = Bundle.main.resourceURL!
        .appendingPathComponent("Web", isDirectory: true)
        .standardizedFileURL

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let requestURL = urlSchemeTask.request.url else {
            urlSchemeTask.didFailWithError(URLError(.badURL))
            return
        }
        let decodedPath = requestURL.path.removingPercentEncoding ?? ""
        let relativePath = decodedPath.trimmingCharacters(
            in: CharacterSet(charactersIn: "/")
        )
        let fileURL = root.appendingPathComponent(relativePath).standardizedFileURL
        guard fileURL.path.hasPrefix(root.path + "/"),
              let data = try? Data(contentsOf: fileURL) else {
            urlSchemeTask.didFailWithError(URLError(.fileDoesNotExist))
            return
        }
        let response = URLResponse(
            url: requestURL,
            mimeType: Self.mimeType(for: fileURL.pathExtension),
            expectedContentLength: data.count,
            textEncodingName: Self.isText(fileURL.pathExtension) ? "utf-8" : nil
        )
        urlSchemeTask.didReceive(response)
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}

    private static func isText(_ ext: String) -> Bool {
        ["html", "css", "js", "json", "svg", "txt"].contains(ext.lowercased())
    }

    private static func mimeType(for ext: String) -> String {
        switch ext.lowercased() {
        case "html": return "text/html"
        case "css": return "text/css"
        case "js": return "text/javascript"
        case "json": return "application/json"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "gif": return "image/gif"
        case "woff": return "font/woff"
        case "woff2": return "font/woff2"
        case "ttf": return "font/ttf"
        case "ico": return "image/x-icon"
        default: return "application/octet-stream"
        }
    }
}
