import { callAiModel, parseJsonOutput } from './aiModelService';

export const generateWordData = async (word, aiConfig) => {
    const prompt = `
    Analyze the English word '${word}'.
    Return a JSON object with the following structure (do not include markdown formatting, just raw JSON):
    {
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
    }

    IMPORTANT: The "meaning_ko" field is the card title and quiz answer. Keep it concise like a dictionary headword/gloss, not a definition.
    - Use 1-3 Korean terms whenever possible.
    - Do not write a full sentence, definition, or explanatory phrase in "meaning_ko".
    - Put longer explanations in "definitions_ko" or "nuance" instead.
    - Example: for "preliminaries", use "예비 절차", not "본격적인 일이나 절차가 시작되기 전에 필요한 준비 단계".
    IMPORTANT: The "definitions_ko" array must have the same length as "definitions" array, with each element being the Korean translation of the corresponding English definition.
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
