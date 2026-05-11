/**
 * Avg. Mastery 일일 스냅샷 — 트렌드 계산용.
 *
 * localStorage에 날짜별 (date, avgRate) 스냅샷을 저장하고,
 * 가장 최근 두 스냅샷의 차이를 트렌드(%p)로 반환한다.
 */

const STORAGE_KEY = 'vocaloop_mastery_history';
const MAX_SNAPSHOTS = 30;

const todayKey = () => new Date().toISOString().slice(0, 10);

const readHistory = () => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const writeHistory = (history) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
        // ignore quota errors
    }
};

/**
 * 오늘자 평균 학습률을 기록하고 정렬된 히스토리를 반환한다.
 * 같은 날 여러 번 호출되면 가장 최근 값으로 덮어쓴다.
 *
 * @param {number} avgRate 0~100 사이 정수
 * @returns {Array<{date: string, avgRate: number}>}
 */
export function recordMasterySnapshot(avgRate) {
    if (!Number.isFinite(avgRate)) return readHistory();

    const today = todayKey();
    const history = readHistory();
    const idx = history.findIndex((h) => h.date === today);
    const next = idx >= 0
        ? [...history.slice(0, idx), { date: today, avgRate }, ...history.slice(idx + 1)]
        : [...history, { date: today, avgRate }];

    next.sort((a, b) => a.date.localeCompare(b.date));
    const trimmed = next.slice(-MAX_SNAPSHOTS);
    writeHistory(trimmed);
    return trimmed;
}

/**
 * 가장 최근 스냅샷 vs 그 이전 스냅샷의 차이를 정수 %p로 반환.
 * 스냅샷이 1개 이하면 0.
 *
 * @param {Array<{date: string, avgRate: number}>} history
 * @returns {number}
 */
export function getMasteryTrend(history) {
    if (!Array.isArray(history) || history.length < 2) return 0;
    const last = history[history.length - 1];
    const prev = history[history.length - 2];
    return Math.round((last?.avgRate ?? 0) - (prev?.avgRate ?? 0));
}
