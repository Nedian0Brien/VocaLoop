/**
 * TOEFL 학습 모드용 주제 분야(Topic) 관리.
 *
 * - 사전 정의된 기본 분야 set 제공
 * - 사용자별 추가/수정/삭제 가능 (localStorage)
 * - multi-select 사용을 가정 (UI는 칩 토글)
 *
 * 데이터 구조:
 *   { id: string, label: string, description?: string, builtIn?: boolean }
 */

const STORAGE_KEY = 'vocaloop_toefl_topic_sets_v1';

/**
 * 기본 분야 set — TOEFL 학술 텍스트 기준의 대표 주제군.
 * builtIn:true 항목은 비활성화는 가능하지만 삭제는 불가 (UI에서 막음).
 */
export const DEFAULT_TOPICS = Object.freeze([
  { id: 'natural-science',  label: '자연과학',          description: 'Physics, Chemistry, Earth Science', builtIn: true },
  { id: 'life-science',     label: '생명과학',          description: 'Biology, Genetics, Ecology',        builtIn: true },
  { id: 'social-science',   label: '사회과학',          description: 'Sociology, Psychology, Economics',  builtIn: true },
  { id: 'history',          label: '역사',              description: 'World, U.S., Cultural History',     builtIn: true },
  { id: 'art-literature',   label: '예술·문학',         description: 'Visual arts, Music, Literature',    builtIn: true },
  { id: 'philosophy',       label: '철학·윤리',         description: 'Ethics, Logic, Epistemology',       builtIn: true },
  { id: 'technology',       label: '기술·공학',         description: 'Engineering, Computing, Innovation', builtIn: true },
  { id: 'environment',      label: '환경·지구',         description: 'Climate, Sustainability, Geology',  builtIn: true },
  { id: 'business',         label: '경영·경제',         description: 'Finance, Markets, Management',      builtIn: true },
  { id: 'medicine',         label: '의학·보건',         description: 'Anatomy, Public Health, Diseases',  builtIn: true },
  { id: 'linguistics',      label: '언어학',            description: 'Phonology, Syntax, Sociolinguistics', builtIn: true },
  { id: 'astronomy',        label: '천문·우주',         description: 'Cosmology, Planetary Science',      builtIn: true },
]);

const isBrowser = () => typeof window !== 'undefined' && Boolean(window?.localStorage);

const safeParse = (raw) => {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter((it) => it && typeof it.id === 'string' && typeof it.label === 'string')
      .map((it) => ({
        id: it.id,
        label: it.label,
        description: typeof it.description === 'string' ? it.description : '',
        builtIn: Boolean(it.builtIn),
      }));
  } catch {
    return null;
  }
};

const writeAll = (topics) => {
  if (!isBrowser()) return topics;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(topics));
  } catch {
    /* ignore quota / privacy errors */
  }
  return topics;
};

/**
 * 저장된 토픽 list 반환. 없으면 기본 set 으로 초기화.
 */
export const loadTopics = () => {
  if (!isBrowser()) return [...DEFAULT_TOPICS];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [...DEFAULT_TOPICS];

  const parsed = safeParse(raw);
  if (!parsed || parsed.length === 0) return [...DEFAULT_TOPICS];

  // 빌트인이 누락된 경우 자동 보강 (기존 사용자 정의 항목은 유지).
  const existingIds = new Set(parsed.map((it) => it.id));
  const missingBuiltIns = DEFAULT_TOPICS.filter((t) => !existingIds.has(t.id));
  if (missingBuiltIns.length > 0) return [...DEFAULT_TOPICS, ...parsed.filter((it) => !DEFAULT_TOPICS.some((d) => d.id === it.id))];
  return parsed;
};

const slugify = (label) =>
  String(label || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-가-힣]/g, '');

/**
 * 새 토픽 생성. 라벨 중복은 거부.
 */
export const addTopic = (topics, { label, description = '' }) => {
  const trimmedLabel = String(label || '').trim();
  if (!trimmedLabel) throw new Error('분야 이름을 입력해주세요.');
  const isDuplicate = topics.some((t) => t.label.toLowerCase() === trimmedLabel.toLowerCase());
  if (isDuplicate) throw new Error('이미 존재하는 분야입니다.');

  const baseId = slugify(trimmedLabel) || `topic-${Date.now()}`;
  let id = baseId;
  let suffix = 1;
  const usedIds = new Set(topics.map((t) => t.id));
  while (usedIds.has(id)) id = `${baseId}-${suffix++}`;

  const next = [...topics, { id, label: trimmedLabel, description: String(description || '').trim(), builtIn: false }];
  return writeAll(next);
};

/**
 * 토픽 수정. 빌트인 토픽도 라벨/설명 수정은 허용 (id는 불변).
 */
export const updateTopic = (topics, id, patch) => {
  const idx = topics.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error('해당 분야를 찾을 수 없습니다.');

  const trimmedLabel = patch?.label !== undefined ? String(patch.label).trim() : topics[idx].label;
  if (!trimmedLabel) throw new Error('분야 이름을 입력해주세요.');

  const isDuplicate = topics.some((t, i) => i !== idx && t.label.toLowerCase() === trimmedLabel.toLowerCase());
  if (isDuplicate) throw new Error('이미 존재하는 분야 이름입니다.');

  const next = topics.map((t, i) =>
    i === idx
      ? {
          ...t,
          label: trimmedLabel,
          description:
            patch?.description !== undefined ? String(patch.description || '').trim() : t.description,
        }
      : t
  );
  return writeAll(next);
};

/**
 * 사용자 정의 토픽 삭제. 빌트인은 거부.
 */
export const removeTopic = (topics, id) => {
  const target = topics.find((t) => t.id === id);
  if (!target) return topics;
  if (target.builtIn) throw new Error('기본 분야는 삭제할 수 없습니다. 비활성화는 멀티 선택에서 빼는 것으로 가능합니다.');
  return writeAll(topics.filter((t) => t.id !== id));
};

/**
 * 토픽 set 을 기본값으로 리셋. 사용자 정의 항목은 모두 삭제됨.
 */
export const resetTopics = () => writeAll([...DEFAULT_TOPICS]);

/**
 * 선택한 토픽 set 에서 무작위로 1~2개를 픽해 프롬프트에 넣을 문자열 list 로 반환.
 *
 * @param {Array} topics 전체 사용 가능 토픽
 * @param {string[]} selectedIds 사용자가 선택한 토픽 id 배열
 * @param {number} pickCount 뽑을 개수 (기본 1)
 * @returns {{label: string, description: string}[]} 픽된 토픽 list
 */
export const pickRandomTopics = (topics, selectedIds, pickCount = 1) => {
  const pool = topics.filter((t) => selectedIds.includes(t.id));
  if (pool.length === 0) return [];
  const count = Math.max(1, Math.min(pickCount, pool.length));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(({ label, description }) => ({ label, description }));
};

/**
 * 단어 list 에서 랜덤 샘플링. seed 없이 즉석 셔플.
 */
export const sampleWords = (words, sampleSize) => {
  if (!Array.isArray(words) || words.length === 0) return [];
  const size = Math.max(1, Math.min(sampleSize, words.length));
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, size);
};
