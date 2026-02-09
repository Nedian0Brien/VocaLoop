import React from 'react';
import { Brain } from './Icons';

export default function ToeflBuildSentencePlaceholder({ onExit }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 text-center">
      <Brain className="w-12 h-12 text-purple-400 mx-auto mb-4" />
      <h3 className="text-2xl font-bold text-gray-900 mb-2">Build-a-Sentence</h3>
      <p className="text-sm text-gray-500 mb-6">
        문장 구성하기 퀴즈는 현재 준비 중입니다. 곧 더 강력한 문장 재구성 학습을 제공할게요!
      </p>
      <button
        onClick={onExit}
        className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
      >
        모드 선택으로
      </button>
    </div>
  );
}
