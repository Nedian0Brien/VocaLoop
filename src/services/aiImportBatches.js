/**
 * file_import 메시지의 payload 를 200개 단위 배치로 읽는다.
 * 서버는 entries 전체와 batch_size, 그리고 배치별 results 만 갖고 있고,
 * "지금 몇 번째 카드를 보여 줄지"는 여기서 results 길이로 정한다.
 */
export const DEFAULT_IMPORT_BATCH_SIZE = 200;

export const getImportBatches = (payload = {}) => {
  const entries = Array.isArray(payload.entries) ? payload.entries : [];
  const batchSize = Math.max(Number(payload.batch_size) || DEFAULT_IMPORT_BATCH_SIZE, 1);
  const results = Array.isArray(payload.results) ? payload.results : [];
  const total = Math.ceil(entries.length / batchSize);

  const batches = Array.from({ length: total }, (_, index) => ({
    index,
    entries: entries.slice(index * batchSize, (index + 1) * batchSize),
    result: results.find((result) => result?.batch_index === index) || null,
  }));
  const nextIndex = batches.findIndex((batch) => !batch.result);

  return {
    batchSize,
    total,
    batches,
    totalEntries: entries.length,
    current: nextIndex === -1 ? null : batches[nextIndex],
    completed: batches.filter((batch) => batch.result),
    remainingAfterCurrent: nextIndex === -1 ? 0 : entries.length - (nextIndex + 1) * batchSize,
  };
};

export const describeImportSummary = (summary) => {
  if (!summary) return '';
  const parts = [];
  if (summary.created > 0) parts.push(`${summary.created}개 저장`);
  if (summary.assigned > 0) parts.push(`${summary.assigned}개 폴더 추가`);
  if (summary.skipped > 0) parts.push(`${summary.skipped}개 중복 건너뜀`);
  if (summary.failed > 0) parts.push(`${summary.failed}개 실패`);
  return parts.length > 0 ? parts.join(' · ') : '저장할 새 단어가 없었습니다.';
};

/** runBulkWordAdd 결과를 서버에 기록할 요약으로 줄인다. */
export const summarizeBulkAddResult = (result = {}) => ({
  created: result.createdWords?.length ?? 0,
  assigned: result.assignedWords?.length ?? 0,
  skipped: result.skippedWords?.length ?? 0,
  failed: result.failedWords?.length ?? 0,
  failed_words: (result.failedWords ?? []).map((item) => String(item?.word ?? item)).filter(Boolean),
});
