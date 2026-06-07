import { callAiModel, parseJsonOutput } from './aiModelService';

const buildWordSchema = (word) => `{
        "word": "${word}",
        "meaning_ko": "Short Korean dictionary gloss (1-3 Korean terms, comma-separated if needed)",
        "pronunciation": "IPA pronunciation (string)",
        "pos": "Part of speech (e.g., Noun, Verb)",
        "definitions": ["English definition 1", "English definition 2"],
        "definitions_ko": ["Korean translation of definition 1", "Korean translation of definition 2"],
        "examples": [
            {"en": "English example sentence using the word", "ko": "Korean translation"}
        ],
        "synonyms": ["synonym1", "synonym2"],
        "nuance": "Brief explanation of nuance or usage context in Korean"
    }`;

const WORD_ANALYSIS_RULES = `
    IMPORTANT: The "meaning_ko" field is the card title and quiz answer. Keep it concise like a dictionary headword/gloss, not a definition.
    - Use 1-3 Korean terms whenever possible.
    - Do not write a full sentence, definition, or explanatory phrase in "meaning_ko".
    - Put longer explanations in "definitions_ko" or "nuance" instead.
    - Example: for "preliminaries", use "예비 절차", not "본격적인 일이나 절차가 시작되기 전에 필요한 준비 단계".
    IMPORTANT: The "definitions_ko" array must have the same length as "definitions" array, with each element being the Korean translation of the corresponding English definition.
`;

const normalizeWordKey = (word) => String(word || '').trim().toLowerCase();

const getBulkWordsFromResponse = (parsed, requestedWords) => {
    const items = Array.isArray(parsed) ? parsed : parsed?.words;
    if (!Array.isArray(items)) {
        throw new Error('AI bulk word generation returned invalid JSON.');
    }

    return requestedWords.map((word, index) => {
        const matchingItem = items.find((item) => normalizeWordKey(item?.word) === normalizeWordKey(word));
        const item = matchingItem || items[index];
        if (!item || typeof item !== 'object') {
            throw new Error(`AI bulk word generation missed "${word}".`);
        }
        return {
            ...item,
            word: item.word || word,
        };
    });
};

export const generateWordData = async (word, aiConfig) => {
    const prompt = `
    Analyze the English word '${word}'.
    Return a JSON object with the following structure (do not include markdown formatting, just raw JSON):
    ${buildWordSchema(word)}

    ${WORD_ANALYSIS_RULES}
    `;

    try {
        const text = await callAiModel({
            ...aiConfig,
            prompt,
            jsonOutput: true
        });

        return parseJsonOutput(text);
    } catch (error) {
        console.error("AI word generation error:", error);
        throw error;
    }
};

export const generateBulkWordData = async (words, aiConfig) => {
    const requestedWords = [...new Set(words.map((word) => String(word || '').trim()).filter(Boolean))];
    if (requestedWords.length === 0) return [];

    const prompt = `
    Analyze these English words: ${JSON.stringify(requestedWords)}.
    Return a raw JSON object with a "words" array in the same order as the input words.
    Each item in "words" must follow this structure:
    ${buildWordSchema('word from the input list')}

    ${WORD_ANALYSIS_RULES}
    Do not skip words. Do not include markdown formatting.
    `;

    try {
        const text = await callAiModel({
            ...aiConfig,
            prompt,
            jsonOutput: true
        });

        return getBulkWordsFromResponse(parseJsonOutput(text), requestedWords);
    } catch (error) {
        console.error("AI bulk word generation error:", error);
        throw error;
    }
};
