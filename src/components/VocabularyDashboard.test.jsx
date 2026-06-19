// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import VocabularyDashboard from './VocabularyDashboard';

const baseProps = {
  words: [],
  folders: [{ id: 3, name: 'TOEFL' }],
  selectedFolderId: null,
  onSelectFolder: vi.fn(),
  showSidebar: false,
  isMobile: false,
  inputWord: '',
  setInputWord: vi.fn(),
  setIsWordSuggestOpen: vi.fn(),
  wordInputRef: { current: null },
  shouldShowWordSuggestions: false,
  isAnalyzing: false,
  bulkAddProgress: null,
  onAddWord: vi.fn((event) => event.preventDefault()),
  onBulkAddWords: vi.fn(),
  addToFolderId: null,
  setAddToFolderId: vi.fn(),
  sortMode: 'newest',
  setSortMode: vi.fn(),
  onCreateFolder: vi.fn(),
  onUpdateFolder: vi.fn(),
  onDeleteFolder: vi.fn(),
  onReorderFolders: vi.fn(),
  onDeleteWord: vi.fn(),
  onMoveWord: vi.fn(),
  onToggleWordFlag: vi.fn(),
  onRegenerateWord: vi.fn(),
};

describe('VocabularyDashboard screenshot import', () => {
  afterEach(() => {
    cleanup();
  });

  test('opens the screenshot import modal from the add-word panel', () => {
    render(<VocabularyDashboard {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: '이미지에서 추가' }));

    expect(screen.getByRole('dialog', { name: '이미지에서 추가' })).toBeTruthy();
    expect(screen.getByLabelText('단어장 이미지')).toBeTruthy();
  });
});
