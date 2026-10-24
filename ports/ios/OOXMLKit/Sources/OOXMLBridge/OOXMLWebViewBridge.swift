#if canImport(WebKit)
import Foundation
import WebKit

/// Nối `OOXMLBridge` vào WKWebView (chỉ biên dịch trên iOS/iPadOS/macOS — Phase 7).
///
/// Cách dùng (tầng app):
/// ```swift
/// let bridge = OOXMLWebViewBridge()
/// let cfg = WKWebViewConfiguration()
/// bridge.install(into: cfg.userContentController, name: "ooxml")
/// let web = WKWebView(frame: .zero, configuration: cfg)
/// ```
/// JS gọi: `const r = await window.webkit.messageHandlers.ooxml.postMessage({id, op, args})`.
///
/// Lưu ý ngoại tuyến: lớp này chỉ chuyển JSON giữa WebView và OOXMLKit trong tiến trình — không mạng.
@available(iOS 14.0, macOS 11.0, *)
public final class OOXMLWebViewBridge: NSObject, WKScriptMessageHandlerWithReply {
    public let bridge: OOXMLBridge

    public init(bridge: OOXMLBridge = OOXMLBridge()) {
        self.bridge = bridge
    }

    /// Đăng ký handler tên `name` (mặc định "ooxml") với `WKUserContentController`.
    public func install(into controller: WKUserContentController, name: String = "ooxml") {
        controller.addScriptMessageHandler(self, contentWorld: .page, name: name)
    }

    public func userContentController(_ controller: WKUserContentController,
                                      didReceive message: WKScriptMessage,
                                      replyHandler: @escaping (Any?, String?) -> Void) {
        // message.body là object JS đã bắc cầu → bọc lại thành JSON cho OOXMLBridge xử lý thuần dữ liệu.
        let body = message.body
        guard JSONSerialization.isValidJSONObject(body),
              let data = try? JSONSerialization.data(withJSONObject: body) else {
            replyHandler(nil, "yêu cầu không hợp lệ (không chuyển được thành JSON)")
            return
        }
        let responseData = bridge.handle(data)
        let response = (try? JSONSerialization.jsonObject(with: responseData)) ?? ["ok": false]
        replyHandler(response, nil)
    }
}
#endif
