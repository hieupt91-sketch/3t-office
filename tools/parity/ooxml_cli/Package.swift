// swift-tools-version:5.9
import PackageDescription

// Package CLI doi chieu — TAI LAI BOI WSL cho WC2 (parity gate), khong su dung
// trong san pham. Phu thu vao ban copy OOXMLKit local tai thu muc "ooxml"
// (do tools/parity/build_ooxml_cli.sh rsync tu staging "sach" trong worktree).
let package = Package(
    name: "ParityCLI",
    dependencies: [
        .package(path: "ooxml"),
    ],
    targets: [
        .executableTarget(
            name: "ParityCLI",
            dependencies: [.product(name: "OOXMLKit", package: "ooxml")]
        ),
    ]
)
