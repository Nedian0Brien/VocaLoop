import SwiftUI

/// 폴더 색·아이콘 선택지. 웹 `FolderSidebar.jsx`의 `FOLDER_COLORS` / `FOLDER_ICONS`와
/// **이름이 1:1로 맞아야** 같은 폴더가 웹과 앱에서 다른 색으로 보이지 않는다.
///
/// 이 팔레트는 디자인 시스템 토큰이 아니라 사용자가 고르는 raw Tailwind 색이다
/// (웹 주석에도 그렇게 적혀 있다).
enum FolderColor: String, CaseIterable, Identifiable, Sendable {
    case blue, purple, green, orange, pink, teal

    var id: String { rawValue }

    /// 점·선택 표시에 쓰는 진한 색 (Tailwind *-500).
    var dot: Color {
        switch self {
        case .blue: return Color(hex: 0x3B82F6)
        case .purple: return Color(hex: 0xA855F7)
        case .green: return Color(hex: 0x22C55E)
        case .orange: return Color(hex: 0xF97316)
        case .pink: return Color(hex: 0xEC4899)
        case .teal: return Color(hex: 0x14B8A6)
        }
    }

    /// 칩 배경 (*-100). 다크에서는 원색을 낮은 알파로 깐다.
    var background: Color {
        switch self {
        case .blue: return .adaptive(light: 0xDBEAFE, dark: 0x3B82F6, darkAlpha: 0.16)
        case .purple: return .adaptive(light: 0xF3E8FF, dark: 0xA855F7, darkAlpha: 0.16)
        case .green: return .adaptive(light: 0xDCFCE7, dark: 0x22C55E, darkAlpha: 0.16)
        case .orange: return .adaptive(light: 0xFFEDD5, dark: 0xF97316, darkAlpha: 0.16)
        case .pink: return .adaptive(light: 0xFCE7F3, dark: 0xEC4899, darkAlpha: 0.16)
        case .teal: return .adaptive(light: 0xCCFBF1, dark: 0x14B8A6, darkAlpha: 0.16)
        }
    }

    /// 칩 글자 (*-600).
    var foreground: Color {
        switch self {
        case .blue: return .adaptive(light: 0x2563EB, dark: 0x93C5FD)
        case .purple: return .adaptive(light: 0x9333EA, dark: 0xD8B4FE)
        case .green: return .adaptive(light: 0x16A34A, dark: 0x86EFAC)
        case .orange: return .adaptive(light: 0xEA580C, dark: 0xFDBA74)
        case .pink: return .adaptive(light: 0xDB2777, dark: 0xF9A8D4)
        case .teal: return .adaptive(light: 0x0D9488, dark: 0x5EEAD4)
        }
    }

    /// 서버 값이 비었거나 모르는 색이면 웹과 같이 첫 번째 색으로 떨어진다.
    static func resolve(_ raw: String?) -> FolderColor {
        guard let raw, let color = FolderColor(rawValue: raw) else { return .blue }
        return color
    }
}

/// 웹 `FOLDER_ICONS`의 id를 SF Symbol로 매핑한다.
/// id는 서버에 그대로 저장되므로 바꾸면 웹에서 아이콘이 사라진다.
enum FolderIcon: String, CaseIterable, Identifiable, Sendable {
    case book, brain, trophy, target, sparkles, file, trend, shield

    var id: String { rawValue }

    var symbol: String {
        switch self {
        case .book: return "book"
        case .brain: return "brain"
        case .trophy: return "trophy"
        case .target: return "target"
        case .sparkles: return "sparkles"
        case .file: return "doc.text"
        case .trend: return "chart.line.uptrend.xyaxis"
        case .shield: return "shield"
        }
    }

    /// 웹은 아이콘 자리에 이모지도 허용한다. 아이콘 id가 아니면 이모지로 본다.
    static func resolve(_ raw: String?) -> FolderIcon? {
        guard let raw, !raw.isEmpty else { return nil }
        return FolderIcon(rawValue: raw)
    }

    static func isEmoji(_ raw: String?) -> Bool {
        guard let raw, !raw.isEmpty, FolderIcon(rawValue: raw) == nil else { return false }
        return raw.unicodeScalars.contains { $0.properties.isEmoji && $0.value > 0x238C }
    }
}

extension Folder {
    var resolvedColor: FolderColor { FolderColor.resolve(color) }
    var resolvedIcon: FolderIcon? { FolderIcon.resolve(icon) }
    var emojiIcon: String? { FolderIcon.isEmoji(icon) ? icon : nil }
}
