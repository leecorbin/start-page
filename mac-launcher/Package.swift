// swift-tools-version:5.9
// Convenience for developing in Xcode: `open Package.swift`, then ⌘R.
// For a proper, keepable .app bundle, use ./build.sh instead.
import PackageDescription

let package = Package(
    name: "StartLauncher",
    platforms: [.macOS(.v14)],
    targets: [
        .executableTarget(name: "StartLauncher", path: "Sources/StartLauncher")
    ]
)
