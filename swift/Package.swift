// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "LumosHelper",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(
            name: "lumos-helper",
            targets: ["LumosHelper"]
        )
    ],
    dependencies: [
        // FluidAudio will be added in T-2.2.2
    ],
    targets: [
        .executableTarget(
            name: "LumosHelper",
            dependencies: []
        ),
        .testTarget(
            name: "LumosHelperTests",
            dependencies: ["LumosHelper"]
        )
    ]
)
