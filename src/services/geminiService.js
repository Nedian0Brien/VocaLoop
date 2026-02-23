import { callAiModel, parseJsonOutput } from './aiModelService';

export const generateWordData = async (word, aiConfig) => {
    const prompt = `
    Analyze the English word '${word}'.
    Return a JSON object with the following structure (do not include markdown formatting, just raw JSON):
    {
        "word": "${word}",
        "meaning_ko": "Core Korean meaning (string)",
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
        console.error("Gemini Error:", error);
        throw error;
    }
};
