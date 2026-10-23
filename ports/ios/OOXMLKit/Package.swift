// swift-tools-version:5.9
import PackageDescription

// OOXMLKit — thư viện đọc/sửa/ghi DOCX/XLSX/PPTX ngoại tuyến, Swift thuần, không phụ thuộc ngoài.
// Thứ tự lớp: OOXMLZip (ZIP + DEFLATE) → OOXMLPackage (XML + OPC) → Spreadsheet / Word / Presentation.
let package = Package(
    name: "OOXMLKit",
    platforms: [.iOS(.v15), .macOS(.v12)],
    products: [
        .library(name: "OOXMLKit", targets: ["OOXMLKit"]),
        .library(name: "OOXMLZip", targets: ["OOXMLZip"]),
        .library(name: "OOXMLPackage", targets: ["OOXMLPackage"]),
        .library(name: "OOXMLSpreadsheet", targets: ["OOXMLSpreadsheet"]),
        .library(name: "OOXMLWord", targets: ["OOXMLWord"]),
        .library(name: "OOXMLPresentation", targets: ["OOXMLPresentation"]),
        .library(name: "OOXMLBridge", targets: ["OOXMLBridge"]),
    ],
    targets: [
        .target(name: "OOXMLZip"),
        .target(name: "OOXMLPackage", dependencies: ["OOXMLZip"]),
        .target(name: "OOXMLSpreadsheet", dependencies: ["OOXMLPackage"]),
        .target(name: "OOXMLWord", dependencies: ["OOXMLPackage"]),
        .target(name: "OOXMLPresentation", dependencies: ["OOXMLPackage"]),
        .target(name: "OOXMLKit", dependencies: ["OOXMLZip", "OOXMLPackage", "OOXMLSpreadsheet", "OOXMLWord", "OOXMLPresentation"]),
        // Cầu nối (Phase 7): nhận lệnh JSON từ WebView → gọi OOXMLKit → trả JSON. Thuần logic, test được không cần UI.
        .target(name: "OOXMLBridge", dependencies: ["OOXMLKit"]),

        .target(
            name: "OOXMLTestSupport",
            dependencies: ["OOXMLPackage"],
            path: "Tests/OOXMLTestSupport",
            resources: [.copy("Fixtures")]
        ),
        .testTarget(name: "OOXMLZipTests", dependencies: ["OOXMLZip", "OOXMLTestSupport"]),
        .testTarget(name: "OOXMLPackageTests", dependencies: ["OOXMLPackage", "OOXMLTestSupport"]),
        .testTarget(name: "OOXMLSpreadsheetTests", dependencies: ["OOXMLSpreadsheet", "OOXMLTestSupport"]),
        .testTarget(name: "OOXMLWordTests", dependencies: ["OOXMLWord", "OOXMLTestSupport"]),
        .testTarget(name: "OOXMLPresentationTests", dependencies: ["OOXMLPresentation", "OOXMLTestSupport"]),
        .testTarget(name: "OOXMLBridgeTests", dependencies: ["OOXMLBridge", "OOXMLTestSupport"]),
    ]
)
