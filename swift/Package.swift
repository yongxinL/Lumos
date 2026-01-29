// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "LumosHelper",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(
            name: "lumos-helper",
            targets: ["LumosHelper"]
        )
    ],
    dependencies: [
        .package(url: "https://github.com/FluidInference/FluidAudio.git", from: "0.7.9")
    ],
    targets: [
        .executableTarget(
            name: "LumosHelper",
            dependencies: [
                .product(name: "FluidAudio", package: "FluidAudio")
            ],
            swiftSettings: [
                .unsafeFlags(["-Xfrontend", "-disable-availability-checking"]),
                .unsafeFlags(["-Xfrontend", "-warn-concurrency"])
            ]
        ),
        .testTarget(
            name: "LumosHelperTests",
            dependencies: ["LumosHelper"]
        )
    ]
)
