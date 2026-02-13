export const generateWordData = async (word, apiKey) => {
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
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { responseMimeType: "application/json" }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error("No response from AI.");
        }
        const text = data.candidates[0].content.parts[0].text;
        return JSON.parse(text);
    } catch (error) {
        console.error("Gemini Error:", error);
        throw error;
    }
};
