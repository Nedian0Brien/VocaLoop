const DICTIONARY_URL = '/dictionaries/en-ko-autocomplete.json';
const MIN_DICTIONARY_QUERY_LENGTH = 2;
const DEFAULT_DICTIONARY_SUGGESTION_LIMIT = 5;

let dictionaryPromise = null;

const normalizeQuery = (value) => String(value || '').trim().toLowerCase();

const normalizeEntry = (entry) => {
    const word = String(entry?.word || '').trim();
    return {
        word,
        meaning_ko: String(entry?.meaning_ko || entry?.meaningKo || '').trim(),
        pos: String(entry?.pos || '').trim(),
        normalizedWord: normalizeQuery(word),
    };
};

const loadDictionary = async () => {
    if (!dictionaryPromise) {
        dictionaryPromise = fetch(DICTIONARY_URL, { cache: 'force-cache' })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Dictionary load failed: ${response.status}`);
                }
                return response.json();
            })
            .then((payload) => {
                const entries = Array.isArray(payload) ? payload : payload?.entries;
                return Array.isArray(entries)
                    ? entries.map(normalizeEntry).filter((entry) => entry.word && entry.meaning_ko)
                    : [];
            })
            .catch((error) => {
                dictionaryPromise = null;
                throw error;
            });
    }

    return dictionaryPromise;
};

const findDictionaryAutocompleteSuggestions = (entries, query, limit = DEFAULT_DICTIONARY_SUGGESTION_LIMIT) => {
    const normalizedQuery = normalizeQuery(query);
    if (normalizedQuery.length < MIN_DICTIONARY_QUERY_LENGTH) return [];

    const seen = new Set();
    return entries
        .filter((entry) => {
            if (!entry.normalizedWord || seen.has(entry.normalizedWord)) return false;
            seen.add(entry.normalizedWord);
            return entry.normalizedWord.includes(normalizedQuery);
        })
        .sort((a, b) => {
            const aPrefix = a.normalizedWord.startsWith(normalizedQuery) ? 0 : 1;
            const bPrefix = b.normalizedWord.startsWith(normalizedQuery) ? 0 : 1;
            if (aPrefix !== bPrefix) return aPrefix - bPrefix;
            return a.normalizedWord.localeCompare(b.normalizedWord);
        })
        .slice(0, limit);
};

export const getDictionaryAutocompleteSuggestions = async (query, options = {}) => {
    const entries = await loadDictionary();
    return findDictionaryAutocompleteSuggestions(entries, query, options.limit);
};

export const resetDictionaryAutocompleteCache = () => {
    dictionaryPromise = null;
};
