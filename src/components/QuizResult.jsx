import React from 'react';
import { Trophy, RotateCw, ArrowLeft, TrendingUp } from './Icons';

export default function QuizResult({ stats, onRestart, onBackToDashboard }) {
  const { correct, wrong, total } = stats;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  // 성적에 따른 메시지와 색상
  const getResultInfo = () => {
    if (percentage >= 90) {
      return {
        grade: 'A+',
        message: '완벽합니다! 🎉',
        description: '이 단어들은 완전히 마스터했어요!',
        color: 'green',
        emoji: '🏆'
      };
    } else if (percentage >= 80) {
      return {
        grade: 'A',
        message: '훌륭해요! 👏',
        description: '조금만 더 연습하면 완벽해질 거예요.',
        color: 'blue',
        emoji: '🎯'
      };
    } else if (percentage >= 70) {
      return {
        grade: 'B',
        message: '잘했어요! 💪',
        description: '틀린 문제들을 다시 복습해보세요.',
        color: 'yellow',
        emoji: '📚'
      };
    } else if (percentage >= 60) {
      return {
        grade: 'C',
        message: '괜찮아요! 🔥',
        description: '조금 더 연습이 필요해요.',
        color: 'orange',
        emoji: '✍️'
      };
    } else {
      return {
        grade: 'D',
        message: '다시 도전! 💡',
        description: '포기하지 마세요. 반복이 중요해요!',
        color: 'red',
        emoji: '🎓'
      };
    }
  };

  const result = getResultInfo();

  return (
    <div className="max-w-2xl mx-auto">
      {/* 결과 카드 */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        {/* 헤더 */}
        <div className={`bg-gradient-to-r ${
          result.color === 'green' ? 'from-green-500 to-emerald-500' :
          result.color === 'blue' ? 'from-blue-500 to-cyan-500' :
          result.color === 'yellow' ? 'from-yellow-500 to-amber-500' :
          result.color === 'orange' ? 'from-orange-500 to-red-400' :
          'from-red-500 to-pink-500'
        } text-white text-center py-12`}>
          <div className="text-6xl mb-4">{result.emoji}</div>
          <h2 className="text-4xl font-bold mb-2">{result.message}</h2>
          <p className="text-lg opacity-90">{result.description}</p>
        </div>

        {/* 통계 */}
        <div className="p-8">
          {/* 점수 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-baseline gap-2 mb-2">
              <span className="text-7xl font-bold text-gray-900">{percentage}</span>
              <span className="text-3xl text-gray-500">%</span>
            </div>
            <div className={`text-2xl font-bold ${
              result.color === 'green' ? 'text-green-600' :
              result.color === 'blue' ? 'text-blue-600' :
              result.color === 'yellow' ? 'text-yellow-600' :
              result.color === 'orange' ? 'text-orange-600' :
              'text-red-600'
            }`}>
              {result.grade}
            </div>
          </div>

          {/* 상세 통계 */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-gray-900">{total}</div>
              <div className="text-sm text-gray-500 mt-1">전체 문제</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-green-600">{correct}</div>
              <div className="text-sm text-gray-500 mt-1">정답</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-red-600">{wrong}</div>
              <div className="text-sm text-gray-500 mt-1">오답</div>
            </div>
          </div>

          {/* 진행 바 */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>정답률</span>
              <span className="font-bold">{correct}/{total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  result.color === 'green' ? 'bg-green-500' :
                  result.color === 'blue' ? 'bg-blue-500' :
                  result.color === 'yellow' ? 'bg-yellow-500' :
                  result.color === 'orange' ? 'bg-orange-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-4">
            <button
              onClick={onRestart}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-colors"
            >
              <RotateCw className="w-5 h-5" />
              다시 도전
            </button>
            <button
              onClick={onBackToDashboard}
              className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* 팁 */}
      {percentage < 80 && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-bold text-blue-900 mb-2">💡 학습 팁</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• 틀린 단어는 Dashboard에서 다시 복습해보세요</li>
                <li>• 발음 듣기와 예문을 함께 공부하면 더 효과적이에요</li>
                <li>• 하루에 조금씩이라도 꾸준히 학습하는 것이 중요해요</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
