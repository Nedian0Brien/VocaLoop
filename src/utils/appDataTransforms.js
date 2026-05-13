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

export const normalizeWord = (word) => ({
    ...word,
    folderId: word.folderId ?? word.folder_id ?? null,
    learningRate: word.learningRate ?? word.learning_rate ?? 0,
    createdAt: word.createdAt ?? word.created_at ?? null,
    updatedAt: word.updatedAt ?? word.updated_at ?? null,
});

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
    const providerConfig = providers[provider] || providers.gemini;

    return {
        provider,
        model: providerConfig.models.includes(settings.model) ? settings.model : providerConfig.models[0],
        geminiApiKey: settings.geminiApiKey ?? fallbackSettings.geminiApiKey ?? '',
        openaiApiKey: settings.openaiApiKey ?? fallbackSettings.openaiApiKey ?? '',
        claudeApiKey: settings.claudeApiKey ?? fallbackSettings.claudeApiKey ?? '',
    };
};
