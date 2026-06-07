import { createFolder, deleteFolder, reorderFolders, updateFolder } from '../services/folderApi';
import { normalizeFolder, sortFoldersForDisplay } from '../utils/appDataTransforms';

export function useFolderCommands({
  clearAddToFolderIfFolder,
  setFolders,
  setSelectedFolderId,
  setWords,
  showNotification,
  user,
}) {
  const upsertFolderInState = (folder) => {
    const normalizedFolder = normalizeFolder(folder);
    setFolders((prev) => sortFoldersForDisplay([...prev.filter((it) => it.id !== normalizedFolder.id), normalizedFolder]));
    return normalizedFolder;
  };

  const removeFolderFromState = (folderId) => {
    setFolders((prev) => prev.filter((it) => it.id !== folderId));
    setWords((prev) => prev.map((it) => (it.folderId === folderId ? { ...it, folderId: null } : it)));
    setSelectedFolderId((current) => (current === folderId ? null : current));
    clearAddToFolderIfFolder?.(folderId);
  };

  const handleCreateFolder = async (name, color, icon) => {
    if (!user) return;
    try {
      const createdFolder = await createFolder({ name, color, icon: icon || null });
      const normalizedFolder = upsertFolderInState(createdFolder);
      showNotification(`'${name}' 폴더가 생성되었습니다.`);
      return normalizedFolder;
    } catch (error) {
      showNotification('폴더 생성 실패: ' + error.message, 'error');
      return null;
    }
  };

  const handleUpdateFolder = async (folderId, newName, newColor, newIcon) => {
    if (!user) return;
    try {
      const updateData = {};
      if (newName) updateData.name = newName;
      if (newColor) updateData.color = newColor;
      if (newIcon !== undefined) updateData.icon = newIcon;
      if (Object.keys(updateData).length === 0) return;

      const updatedFolder = await updateFolder(folderId, updateData);
      upsertFolderInState(updatedFolder);
      showNotification('폴더 정보가 업데이트되었습니다.');
    } catch (error) {
      showNotification('업데이트 실패: ' + error.message, 'error');
    }
  };

  const handleReorderFolders = async (newFolders) => {
    if (!user) return;
    try {
      const reorderedFolders = await reorderFolders(newFolders.map((folder) => folder.id));
      setFolders(sortFoldersForDisplay(reorderedFolders.map(normalizeFolder)));
    } catch (error) {
      console.error('Reorder failed:', error);
      showNotification('순서 변경 실패', 'error');
    }
  };

  const handleRenameFolder = async (folderId, newName) => {
    await handleUpdateFolder(folderId, newName);
  };

  const handleDeleteFolder = async (folderId) => {
    if (!user) return;
    try {
      await deleteFolder(folderId);
      removeFolderFromState(folderId);
      showNotification('폴더가 삭제되었습니다.');
    } catch (error) {
      showNotification('폴더 삭제 실패: ' + error.message, 'error');
    }
  };

  return {
    handleCreateFolder,
    handleDeleteFolder,
    handleRenameFolder,
    handleReorderFolders,
    handleUpdateFolder,
    upsertFolderInState,
  };
}
