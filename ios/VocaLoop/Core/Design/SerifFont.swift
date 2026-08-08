import SwiftUI

/// 웹이 단어 표시에 쓰는 Merriweather를 앱에도 번들해 같은 서체를 쓴다.
///
/// 웹(`src/index.css`)이 실제로 불러오는 조합만 넣었다: 400 / 700 / 400 italic.
/// 그래서 웹에서 `font-black`(900)을 준 자리도 브라우저가 700으로 그리고,
/// 앱도 `.black`을 Bold로 매핑해 결과가 같다.
///
/// 라이선스: SIL OFL 1.1 (`Resources/Fonts/OFL.txt`)
/// 한글은 이 폰트에 없으므로 시스템 서체가 담당한다 (단어·발음은 모두 로마자).
extension Font {
    /// 웹의 `font-serif` 대응.
    static func merriweather(size: CGFloat, weight: Font.Weight = .regular) -> Font {
        .custom(SerifFont.name(for: weight), fixedSize: size)
    }

    /// 웹의 `font-serif italic` 대응.
    static func merriweatherItalic(size: CGFloat) -> Font {
        .custom(SerifFont.italicName, fixedSize: size)
    }
}

enum SerifFont {
    static let regularName = "Merriweather-Regular"
    static let boldName = "Merriweather-Bold"
    static let italicName = "Merriweather-Italic"

    /// 400 미만은 Regular, 500 이상은 Bold. 웹이 가진 두 굵기와 같은 매핑이다.
    static func name(for weight: Font.Weight) -> String {
        switch weight {
        case .medium, .semibold, .bold, .heavy, .black:
            return boldName
        default:
            return regularName
        }
    }

    #if DEBUG
    /// 번들 등록이 빠지면 SwiftUI가 조용히 시스템 서체로 떨어져 알아채기 어렵다.
    /// 디버그 빌드에서만 한 번 확인한다.
    static func assertRegistered() {
        let registered = UIFont.fontNames(forFamilyName: "Merriweather")
        assert(
            !registered.isEmpty,
            "Merriweather가 등록되지 않았다. project.yml의 UIAppFonts를 확인할 것."
        )
    }
    #endif
}
