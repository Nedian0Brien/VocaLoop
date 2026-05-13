import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_SOURCE_DIR = '/tmp/krdict-reader/dict.entries.in';
const DEFAULT_OUTPUT_PATH = 'public/dictionaries/en-ko-autocomplete.json';

const sourceDir = process.argv[2] || DEFAULT_SOURCE_DIR;
const outputPath = process.argv[3] || DEFAULT_OUTPUT_PATH;

const hasKorean = (value) => /[\uac00-\ud7af]/.test(value);

const decodeHtml = (value) =>
    value
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));

const cleanKoreanLabel = (value) =>
    decodeHtml(value)
        .replace(/<[^>]*>/g, ' ')
        .replace(/\[[^\]]*]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

const parseEntry = (word, html) => {
    const firstLine = html.split(/\r?\n/, 1)[0] || '';
    const meaningMatches = [...firstLine.matchAll(/<i>([^<]+)<\/i>:\s*([\s\S]*?)(?=\s*<i>|<br>|$)/g)];
    const meanings = [];
    const partsOfSpeech = [];

    meaningMatches.forEach((match) => {
        const pos = cleanKoreanLabel(match[1]).toLowerCase();
        if (pos && !partsOfSpeech.includes(pos)) partsOfSpeech.push(pos);

        match[2]
            .split(',')
            .map(cleanKoreanLabel)
            .filter((label) => label && hasKorean(label))
            .forEach((label) => {
                if (!meanings.includes(label)) meanings.push(label);
            });
    });

    if (meanings.length === 0) return null;

    return {
        word,
        meaning_ko: meanings.slice(0, 8).join(', '),
        pos: partsOfSpeech.slice(0, 3).join(', '),
    };
};

const files = fs.readdirSync(sourceDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

const entries = files
    .map((name) => {
        const filePath = path.join(sourceDir, name);
        return parseEntry(name, fs.readFileSync(filePath, 'utf8'));
    })
    .filter(Boolean);

const payload = {
    source: {
        name: 'krdict-reader English-Korean dictionary',
        url: 'https://github.com/marcinchs/krdict-reader',
        license: 'Mixed open dictionary sources; see en-ko-autocomplete.notice.txt',
    },
    entries,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(payload)}\n`);

console.log(`Wrote ${entries.length} entries to ${outputPath}`);
