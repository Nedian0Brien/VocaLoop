import SwiftUI

/// 웹 프론트엔드의 디자인 토큰(src/index.css의 @theme)과 값을 맞춘다.
extension Color {
    static let brand = Color(red: 0x25 / 255, green: 0x63 / 255, blue: 0xEB / 255) // #2563EB
    static let brandLight = Color(red: 0x60 / 255, green: 0xA5 / 255, blue: 0xFA / 255) // #60A5FA
    static let accentPurple = Color(red: 0x7C / 255, green: 0x3A / 255, blue: 0xED / 255) // #7C3AED
    static let indigoPair = Color(red: 0x4F / 255, green: 0x46 / 255, blue: 0xE5 / 255) // #4F46E5

    static let successGreen = Color(red: 0x05 / 255, green: 0x96 / 255, blue: 0x69 / 255) // #059669
    static let warningAmber = Color(red: 0xD9 / 255, green: 0x77 / 255, blue: 0x06 / 255) // #D97706
    static let dangerRed = Color(red: 0xDC / 255, green: 0x26 / 255, blue: 0x26 / 255) // #DC2626

    /// 런치 스크린과 이어지는 배경.
    static let launchBackground = Color.brand
}

extension ShapeStyle where Self == LinearGradient {
    /// 웹 히어로 카드와 같은 브랜드 그라디언트.
    static var brandGradient: LinearGradient {
        LinearGradient(
            colors: [.brand, .indigoPair, .accentPurple],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}

extension Word.LearningStatus {
    var tint: Color {
        switch self {
        case .new: return .brand
        case .learning: return .warningAmber
        case .mastered: return .successGreen
        }
    }

    var symbolName: String {
        switch self {
        case .new: return "sparkles"
        case .learning: return "arrow.trianglehead.2.clockwise"
        case .mastered: return "checkmark.seal.fill"
        }
    }
}

/// 앱 로고 자리에 쓰는 무한대 기호. 웹 favicon과 같은 모티프다.
struct VocaLoopMark: View {
    var size: CGFloat = 44
    var style: AnyShapeStyle = AnyShapeStyle(.white)

    var body: some View {
        Image(systemName: "infinity")
            .font(.system(size: size, weight: .bold))
            .foregroundStyle(style)
            .accessibilityHidden(true)
    }
}
