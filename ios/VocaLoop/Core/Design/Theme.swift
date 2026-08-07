import SwiftUI

/// 도메인 값에 디자인 토큰을 붙이는 매핑. 색 자체는 `DesignTokens.swift`에만 정의한다.
extension Word.LearningStatus {
    /// 텍스트·아이콘용 (다크에서 반전되는 쪽).
    var textTint: Color {
        switch self {
        case .new: return DS.BrandText.base
        case .learning: return DS.BrandText.warning
        case .mastered: return DS.BrandText.success
        }
    }

    /// 진행 바·점처럼 채워진 표시용 (두 테마에서 같은 값).
    var solidTint: Color {
        switch self {
        case .new: return DS.Solid.brand500
        case .learning: return DS.Solid.warning
        case .mastered: return DS.Solid.success
        }
    }

    var badgeTone: DSBadge.Tone {
        switch self {
        case .new: return .brand
        case .learning: return .warning
        case .mastered: return .success
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

/// 앱 로고. 웹 favicon과 같은 무한대 모티프.
struct VocaLoopMark: View {
    var size: CGFloat = 44
    var color: Color = .white

    var body: some View {
        Image(systemName: "infinity")
            .font(.system(size: size, weight: .black))
            .foregroundStyle(color)
            .accessibilityHidden(true)
    }
}
