import Foundation

/// 단어 폴더. `backend/app/schemas/folders.py`의 `FolderRead`와 대응한다.
struct Folder: Identifiable, Codable, Hashable, Sendable {
    let id: Int
    var name: String
    var color: String?
    var icon: String?
    var order: Int
    var createdAt: Date
    var updatedAt: Date
}

/// 목록 화면에서 "전체" / 특정 폴더 / "즐겨찾기"를 하나의 선택값으로 다룬다.
enum FolderSelection: Hashable, Sendable {
    case all
    case flagged
    case folder(Folder.ID)

    var folderID: Folder.ID? {
        if case let .folder(id) = self { return id }
        return nil
    }
}
