import React from 'react';
import { AlertTriangle, Trash2, X } from './Icons';

export default function FolderDeleteDialog({
  folder,
  wordCount = 0,
  isDeleting = false,
  onCancel,
  onConfirm,
}) {
  if (!folder) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-surface-950/40 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="folder-delete-title"
    >
      <div className="w-full max-w-md rounded-xl border border-surface-200 bg-white shadow-[var(--shadow-elevated)]">
        <div className="flex items-start gap-3 border-b border-surface-200 px-5 py-4">
          <div className="rounded-md bg-danger-50 p-2 text-danger-600">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="folder-delete-title" className="text-base font-black tracking-tight text-surface-950">
              폴더 삭제
            </h2>
            <p className="mt-1 text-sm font-semibold text-surface-600">
              {folder.name} · {wordCount}개 단어
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-md p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 disabled:opacity-50"
            aria-label="취소"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm leading-6 text-surface-700">
            단어를 유지하면 이 폴더 연결만 제거됩니다. 단어도 삭제를 선택하면 이 폴더에 들어 있던 단어가 단어장에서 삭제됩니다.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-surface-200 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-md border border-surface-300 px-4 py-2 text-sm font-black text-surface-700 transition-colors hover:bg-surface-50 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ deleteWords: false })}
            disabled={isDeleting}
            className="rounded-md border border-brand-200 bg-brand-50 px-4 py-2 text-sm font-black text-brand-700 transition-colors hover:bg-brand-100 disabled:opacity-50"
          >
            폴더만 삭제
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ deleteWords: true })}
            disabled={isDeleting}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-danger-600 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-danger-700 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            단어도 삭제
          </button>
        </div>
      </div>
    </div>
  );
}
