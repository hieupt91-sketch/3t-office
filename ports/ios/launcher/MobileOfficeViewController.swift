import UIKit
import WebKit

final class MobileOfficeViewController: UIViewController, WKNavigationDelegate, WKScriptMessageHandler,
                                        WKScriptMessageHandlerWithReply {
    private var webView: WKWebView!
    private let offlineAssets = OfflineAssetSchemeHandler()
    private lazy var documentService = NativeDocumentService(presenter: self)

    override func loadView() {
        let configuration = WKWebViewConfiguration()
        configuration.setURLSchemeHandler(offlineAssets, forURLScheme: "vno")
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.websiteDataStore = .nonPersistent()

        let controller = configuration.userContentController
        controller.add(self, name: "vnoMobile")
        controller.addScriptMessageHandler(self, contentWorld: .page, name: "vnoNativeFiles")
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
        if let adaptive = Self.bundledText("mobile-adaptive", extension: "js", subdirectory: "Web") {
            controller.addUserScript(WKUserScript(
                source: adaptive,
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
            webView.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            webView.topAnchor.constraint(equalTo: container.safeAreaLayoutGuide.topAnchor),
            webView.bottomAnchor.constraint(equalTo: container.bottomAnchor)
        ])
        view = container
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        NotificationCenter.default.addObserver(
            self, selector: #selector(keyboardFrameChanged(_:)),
            name: UIResponder.keyboardWillChangeFrameNotification, object: nil
        )
        NotificationCenter.default.addObserver(
            self, selector: #selector(keyboardFrameChanged(_:)),
            name: UIResponder.keyboardWillHideNotification, object: nil
        )
        loadBundledOffice()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        publishNativeLayout()
    }

    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        publishNativeLayout()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: "vnoMobile")
        webView?.configuration.userContentController.removeScriptMessageHandler(
            forName: "vnoNativeFiles", contentWorld: .page
        )
    }

    @objc private func keyboardFrameChanged(_ notification: Notification) {
        let frame = (notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect) ?? .zero
        let localFrame = view.convert(frame, from: nil)
        let overlap = max(0, view.bounds.maxY - localFrame.minY)
        webView.evaluateJavaScript("window.__vnoSetKeyboardInset?.(\(Int(overlap)))")
    }

    private func publishNativeLayout() {
        guard webView != nil else { return }
        let compact = traitCollection.horizontalSizeClass == .compact
        let pointer = traitCollection.userInterfaceIdiom == .pad
        let category = traitCollection.preferredContentSizeCategory.rawValue
        let script = "window.__vnoSetNativeLayout?.({compact:\(compact),pointer:\(pointer),textSize:\(Self.jsString(category))})"
        webView.evaluateJavaScript(script)
    }

    private func loadBundledOffice() {
        #if targetEnvironment(simulator)
        let requestedApp = ProcessInfo.processInfo.environment["VNO_IOS_TEST_APP"]
        let testApp = ["writer", "sheet", "slides"].contains(requestedApp ?? "")
            ? requestedApp! : "writer"
        print("VNO_IOS_TEST_APP \(testApp)")
        #else
        let testApp = "writer"
        #endif
        guard Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Web") != nil,
              let index = URL(string: "vno://app/index.html?mobile=ios&singleApp=0&app=\(testApp)") else {
            showFatal("Thiếu giao diện offline trong application bundle.")
            return
        }
        webView.load(URLRequest(url: index))
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        webView.evaluateJavaScript(
            "window.pywebview?.api?.engine_status?.().then(v => JSON.stringify(v)).catch(e => 'ERROR:'+e)"
        ) { result, error in
            print("VNO_IOS_FILE_BRIDGE \(String(describing: result)) \(String(describing: error))")
        }
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

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage,
        replyHandler: @escaping (Any?, String?) -> Void
    ) {
        guard message.name == "vnoNativeFiles",
              let payload = message.body as? [String: Any],
              let action = payload["action"] as? String else {
            replyHandler(nil, "Yêu cầu cầu nối tệp không hợp lệ.")
            return
        }
        let appKind = payload["appKind"] as? String ?? ""
        print("VNO_IOS_FILE_ACTION \(action) \(appKind)")
        switch action {
        case "engineStatus":
            replyHandler([
                "available": true, "engine": "ios-local-flat-document-adapter",
                "officeEngine": false
            ], nil)
        case "open":
            documentService.open(appKind: appKind, reply: replyHandler)
        case "saveAs":
            guard let content = payload["content"] as? String else {
                replyHandler(["status": "error", "message": "Thiếu nội dung cần lưu."], nil)
                return
            }
            documentService.save(
                content: content, appKind: appKind,
                suggestedName: payload["suggestedName"] as? String,
                reply: replyHandler
            )
        case "saveInPlace":
            guard let content = payload["content"] as? String,
                  let token = payload["targetPath"] as? String else {
                replyHandler(["status": "error", "message": "Thiếu nội dung hoặc quyền tệp."], nil)
                return
            }
            documentService.saveInPlace(
                content: content, appKind: appKind, token: token, reply: replyHandler
            )
        default:
            replyHandler(["status": "error", "message": "Thao tác tệp chưa được hỗ trợ trên iOS."], nil)
        }
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
        officeEngine: false, documentPicker: true, localFlatDocuments: true,
        supportedOfflineFormats: Object.freeze({writer:['html','htm'],sheet:['fods'],slides:['fodp']}),
        ooxmlRoundTrip: false,
        cloudDocumentUpload: false
      });
      const callNativeFiles = payload =>
        window.webkit.messageHandlers.vnoNativeFiles.postMessage(payload);
      window.pywebview = window.pywebview || {};
      window.pywebview.api = Object.freeze({
        engine_status: () => callNativeFiles({action:'engineStatus'}),
        open_document_dialog: appKind => callNativeFiles({action:'open', appKind}),
        save_document_dialog: (content, appKind, _format, suggestedName) =>
          callNativeFiles({action:'saveAs', appKind, content, suggestedName}),
        save_document_in_place: (content, appKind, targetPath) =>
          callNativeFiles({action:'saveInPlace', appKind, content, targetPath}),
        report_frontend_error: () => Promise.resolve({queued:false}),
        set_window_title: () => Promise.resolve(true)
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

      window.addEventListener('DOMContentLoaded', () => {
        const button = document.createElement('button');
        button.type = 'button';
        button.id = 'vno-ios-file-help-button';
        button.textContent = 'Tệp iOS';
        button.setAttribute('aria-label', 'Hướng dẫn mở và lưu tệp trên iPhone, iPad');
        button.addEventListener('click', () => {
          const existing = document.getElementById('vno-ios-file-help-dialog');
          if (existing) { existing.remove(); return; }
          const dialog = document.createElement('div');
          dialog.id = 'vno-ios-file-help-dialog';
          dialog.setAttribute('role', 'dialog');
          dialog.setAttribute('aria-modal', 'true');
          dialog.setAttribute('aria-label', 'Hướng dẫn tệp iOS');
          dialog.innerHTML = `<div class="vno-ios-help-card">
            <button class="vno-ios-help-close" aria-label="Đóng hướng dẫn">×</button>
            <h2>Mở và lưu tệp offline</h2>
            <p>Chọn <b>Tệp → Mở</b> để mở Files trên iPhone hoặc iPad.</p>
            <p>Doc hỗ trợ HTML; Sheet hỗ trợ FODS; Slide hỗ trợ FODP.</p>
            <p>Chọn <b>Tệp → Lưu bản sao</b> để đặt tên và chọn thư mục trong Files.</p>
            <p><b>DOCX, XLSX, PPTX chưa hỗ trợ offline.</b> Ứng dụng không ghi đè các tệp này.</p>
          </div>`;
          dialog.querySelector('button').addEventListener('click', () => dialog.remove());
          dialog.addEventListener('click', event => { if (event.target === dialog) dialog.remove(); });
          document.body.appendChild(dialog);
          dialog.querySelector('button').focus();
        });
        document.body.appendChild(button);
      }, {once:true});
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

    private static func jsString(_ value: String) -> String {
        guard let data = try? JSONSerialization.data(withJSONObject: [value]),
              let literal = String(data: data, encoding: .utf8)
        else { return "\"\"" }
        return String(literal.dropFirst().dropLast())
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
