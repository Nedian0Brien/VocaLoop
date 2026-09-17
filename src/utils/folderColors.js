/**
 * 폴더 색 — 사용자 데이터라 디자인 시스템 brand/accent와 별개로 raw Tailwind 팔레트를 쓴다.
 * FolderSidebar / CompactFolderPicker 의 FOLDER_COLORS 와 같은 여섯 색이다. 새 화면은 여기서 가져간다.
 */
export const FOLDER_DOT_CLASSES = {
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  green: 'bg-green-500',
  orange: 'bg-orange-500',
  pink: 'bg-pink-500',
  teal: 'bg-teal-500',
};

export const getFolderDotClass = (color) => FOLDER_DOT_CLASSES[color] || FOLDER_DOT_CLASSES.blue;
