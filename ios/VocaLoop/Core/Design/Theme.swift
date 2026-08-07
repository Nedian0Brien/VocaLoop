import SwiftUI

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
