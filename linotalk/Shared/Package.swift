// swift-tools-version: 5.9
// LinoShared: 앱과 키보드가 함께 쓰는 공용 코드 묶음입니다.
// 지금은 한글 조합 엔진만 들어 있고, Phase 1에서 번역 클라이언트 등이 추가됩니다.
import PackageDescription

let package = Package(
    name: "LinoShared",
    platforms: [.iOS(.v17), .macOS(.v13)],
    products: [
        .library(name: "HangulEngine", targets: ["HangulEngine"]),
    ],
    targets: [
        // 다른 것에 의존하지 않는 순수 Swift 모듈 (UI, 네트워크 없음)
        .target(name: "HangulEngine"),
        .testTarget(name: "HangulEngineTests", dependencies: ["HangulEngine"]),
    ]
)
