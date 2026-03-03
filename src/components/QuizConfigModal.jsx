import React, { useState, useEffect } from 'react';
import { X, Settings, Layers, Hash, Sparkles, ChevronRight, Play, Folder, Check } from './Icons';

export default function QuizConfigModal({ 
  isOpen, 
  onClose, 
  mode, 
  folders, 
  words, 
  onStart, 
  initialAiMode 
}) {
  const [selectedFolderIds, setSelectedFolderIds] = useState([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [aiMode, setAiMode] = useState(initialAiMode);

  // Filter words based on selected folders
  const filteredWords = selectedFolderIds.length > 0
    ? words.filter(w => selectedFolderIds.includes(w.folderId))
    : words;

  const maxQuestions = Math.max(1, filteredWords.length);

  useEffect(() => {
    if (isOpen) {
      setQuestionCount(Math.min(10, maxQuestions));
      // Reset selected folders when opening
      setSelectedFolderIds([]);
    }
  }, [isOpen, maxQuestions]);

  const toggleFolder = (folderId) => {
    setSelectedFolderIds(prev =>
      prev.includes(folderId)
        ? prev.filter(id => id !== folderId)
        : [...prev, folderId]
    );
  };

  if (!isOpen || !mode) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-500"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl border border-white/20 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 shadow-slate-950/20">
        
        {/* Header */}
        <div className={`p-10 sm:p-12 flex items-start justify-between relative overflow-hidden ${
          mode.color === 'blue' ? 'bg-gradient-to-br from-blue-600 to-indigo-700' : 'bg-gradient-to-br from-purple-600 to-indigo-700'
        }`}>
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2 text-white/60">
              <Settings className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Configure Mode</span>
            </div>
            <h3 className="text-4xl font-black text-white tracking-tight">{mode.title}</h3>
            <p className="text-white/80 text-sm font-bold max-w-md leading-relaxed opacity-90">
              {mode.description}
            </p>
          </div>

          <button 
            onClick={onClose}
            className="relative z-10 w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-90 border border-white/10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-10 sm:p-12 space-y-12 custom-scrollbar">
          
          {/* Section: Scope (Compact Folder Picker) */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shadow-sm">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 tracking-tight">출제 범위 설정</h4>
                  <p className="text-[10px] font-bold text-slate-400">학습할 폴더를 가로로 스크롤하며 선택하세요</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedFolderIds([])}
                  className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
                >
                  Clear All
                </button>
                <button 
                  onClick={() => setSelectedFolderIds(folders.map(f => f.id))}
                  className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                >
                  Select All
                </button>
              </div>
            </div>
            
            <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
              <CompactFolderPicker 
                folders={folders}
                words={words}
                selectedFolderId={null} // Not used for single selection here
                selectedFolderIds={selectedFolderIds} // We'll pass this for multi-select support
                onSelectFolder={toggleFolder}
                wordCountByFolder={folders.reduce((acc, f) => {
                  acc[f.id] = words.filter(w => w.folderId === f.id).length;
                  return acc;
                }, {})}
                totalWordCount={words.length}
                isMultiSelect={true}
              />
            </div>
            
            <div className="flex items-center gap-3 px-5 py-3 bg-blue-50/50 rounded-2xl border border-blue-100/50 w-fit">
              <span className={`w-2 h-2 rounded-full ${filteredWords.length > 0 ? 'bg-blue-500 animate-pulse' : 'bg-slate-300'}`} />
              <p className="text-xs font-bold text-slate-600">
                선택된 범위: <span className="text-blue-600 font-black text-sm">{filteredWords.length}</span>개의 단어
              </p>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Section: Question Count Slider */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shadow-sm">
                  <Hash className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 tracking-tight">문항 개수</h4>
                  <p className="text-[10px] font-bold text-slate-400">퀴즈당 출제될 문제 수를 정하세요</p>
                </div>
              </div>
              
              <div className="space-y-6 px-1 pt-4">
                <div className="flex items-center justify-between">
                  <div className="relative">
                    <span className="text-5xl font-black text-slate-900 tracking-tighter">{questionCount}</span>
                    <span className="absolute -top-4 -right-8 px-2 py-0.5 bg-blue-600 text-white text-[9px] font-black rounded-md uppercase tracking-widest">Items</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Max Questions</p>
                    <p className="text-sm font-black text-slate-600">{maxQuestions}</p>
                  </div>
                </div>
                
                <div className="relative py-2">
                  <input 
                    type="range"
                    min={1}
                    max={maxQuestions}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full h-3 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between mt-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                    <span>1 Unit</span>
                    <span>Adaptive Max</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Section: AI Toggle Switch */}
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shadow-sm shadow-amber-100/50">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 tracking-tight">AI 학습 모드</h4>
                  <p className="text-[10px] font-bold text-slate-400">지능형 채점 및 문맥 기반 생성</p>
                </div>
              </div>

              <div 
                className={`p-6 rounded-[2rem] border-2 transition-all cursor-pointer flex items-center justify-between group h-[116px] ${
                  aiMode 
                    ? 'bg-amber-50/50 border-amber-500 shadow-xl shadow-amber-500/10' 
                    : 'bg-white border-slate-100 hover:border-slate-200'
                }`}
                onClick={() => setAiMode(!aiMode)}
              >
                <div className="space-y-1.5 pr-4">
                  <p className={`text-base font-black tracking-tight ${aiMode ? 'text-amber-900' : 'text-slate-700'}`}>
                    AI Assistant {aiMode ? 'ON' : 'OFF'}
                  </p>
                  <p className="text-xs font-bold text-slate-400 leading-relaxed opacity-80">
                    단어의 미세한 뉘앙스를 파악하고 지능형 문제를 생성합니다.
                  </p>
                </div>
                <div className={`w-14 h-8 rounded-full relative transition-all duration-500 shrink-0 ${
                  aiMode ? 'bg-amber-500' : 'bg-slate-200 shadow-inner'
                }`}>
                  <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-500 shadow-lg flex items-center justify-center ${
                    aiMode ? 'left-7' : 'left-1'
                  }`}>
                    {aiMode && <Sparkles className="w-3 h-3 text-amber-500" />}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-10 sm:p-12 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center gap-5">
          <button 
            onClick={onClose}
            className="w-full sm:flex-1 py-5 px-8 rounded-[1.5rem] font-black text-slate-500 hover:bg-slate-50 transition-all active:scale-95 text-base tracking-tight"
          >
            뒤로 가기
          </button>
          <button 
            disabled={filteredWords.length === 0}
            onClick={() => onStart({ questionCount, selectedFolderIds, aiMode })}
            className={`w-full sm:flex-[2] py-5 px-10 rounded-[1.5rem] font-black text-white shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95 text-lg tracking-tight ${
              filteredWords.length === 0
                ? 'bg-slate-300 cursor-not-allowed shadow-none'
                : mode.color === 'blue' 
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20' 
                  : 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20'
            }`}
          >
            <span>퀴즈 시작하기</span>
            <Play className="w-6 h-6 fill-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
