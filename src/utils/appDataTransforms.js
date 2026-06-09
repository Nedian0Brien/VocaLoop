export const getCreatedAtValue = (value) => {
    if (!value) return 0;
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'string' || typeof value === 'number') {
        const timestamp = new Date(value).getTime();
        return Number.isNaN(timestamp) ? 0 : timestamp;
    }
    if (typeof value === 'object' && typeof value.seconds === 'number') {
        return value.seconds * 1000;
    }
    return 0;
};

export const normalizeSessionUser = (value) => {
    if (!value) return null;
    return {
        ...value,
        displayName: value.displayName ?? value.display_name ?? null,
        photoURL: value.photoURL ?? value.photo_url ?? null,
    };
};

export const normalizeFolder = (folder) => ({
    ...folder,
    createdAt: folder.createdAt ?? folder.created_at ?? null,
    updatedAt: folder.updatedAt ?? folder.updated_at ?? null,
});

const normalizeFolderIds = (word) => {
    const folderId = word.folderId ?? word.folder_id ?? null;
    const folderIds = Array.isArray(word.folderIds)
        ? word.folderIds
        : Array.isArray(word.folder_ids)
            ? word.folder_ids
            : [];
    const normalizedIds = folderIds
        .map((id) => Number(id))
        .filter((id) => !Number.isNaN(id));
    const numericFolderId = folderId === null || folderId === undefined ? null : Number(folderId);
    if (numericFolderId !== null && !Number.isNaN(numericFolderId) && !normalizedIds.includes(numericFolderId)) {
        normalizedIds.unshift(numericFolderId);
    }
    return [...new Set(normalizedIds)];
};

export const getWordFolderIds = (word) => {
    if (!word) return [];
    if (Array.isArray(word.folderIds)) return word.folderIds;
    return normalizeFolderIds(word);
};

export const wordBelongsToFolder = (word, folderId) => {
    const numericFolderId = Number(folderId);
    if (Number.isNaN(numericFolderId)) return false;
    return getWordFolderIds(word).includes(numericFolderId);
};

export const normalizeWord = (word) => {
    const folderId = word.folderId ?? word.folder_id ?? null;
    return {
        ...word,
        folderId,
        folderIds: normalizeFolderIds(word),
        learningRate: word.learningRate ?? word.learning_rate ?? 0,
        pronunciationAudioUrl: word.pronunciationAudioUrl ?? word.pronunciation_audio_url ?? null,
        createdAt: word.createdAt ?? word.created_at ?? null,
        updatedAt: word.updatedAt ?? word.updated_at ?? null,
    };
};

export const sortWordsByNewest = (items) =>
    [...items].sort((a, b) => getCreatedAtValue(b.createdAt) - getCreatedAtValue(a.createdAt));

export const sortFoldersForDisplay = (items) =>
    [...items].sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined && a.order !== b.order) {
            return a.order - b.order;
        }
        return getCreatedAtValue(a.createdAt) - getCreatedAtValue(b.createdAt);
    });

export const normalizeAiSettings = (settings = {}, providers, fallbackSettings) => {
    const provider = providers[settings.provider] ? settings.provider : fallbackSettings.provider;
    const providerConfig = providers[provider] || providers[fallbackSettings.provider];

    return {
        provider,
        model: providerConfig.models.includes(settings.model) ? settings.model : providerConfig.models[0],
        geminiApiKey: settings.geminiApiKey ?? fallbackSettings.geminiApiKey ?? '',
        openaiApiKey: settings.openaiApiKey ?? fallbackSettings.openaiApiKey ?? '',
        claudeApiKey: settings.claudeApiKey ?? fallbackSettings.claudeApiKey ?? '',
    };
};
