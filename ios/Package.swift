// swift-tools-version:5.9
// WebView Bridge SDK for iOS

import PackageDescription

let package = Package(
    name: "WebViewBridge",
    platforms: [
        .iOS(.v14)
    ],
    products: [
        .library(
            name: "WebViewBridge",
            targets: ["WebViewBridge"]
        ),
    ],
    dependencies: [],
    targets: [
        .target(
            name: "WebViewBridge",
            dependencies: [],
            path: "Sources"
        ),
        .testTarget(
            name: "WebViewBridgeTests",
            dependencies: ["WebViewBridge"],
            path: "Tests"
        ),
    ]
)
