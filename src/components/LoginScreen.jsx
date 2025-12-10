import React from 'react';

// Google 로고 SVG 컴포넌트
const GoogleLogo = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
);

// 로그인 화면 컴포넌트
function LoginScreen({ onGoogleLogin, isLoading }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="max-w-md w-full mx-4">
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
                    {/* 로고 및 타이틀 */}
                    <div className="mb-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <span className="text-3xl font-bold text-white">V</span>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">VocaLoop</h1>
                        <p className="text-gray-500">AI 기반 영어 단어 학습 도구</p>
                    </div>

                    {/* 로그인 버튼 */}
                    <button
                        onClick={onGoogleLogin}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                                <span>로그인 중...</span>
                            </>
                        ) : (
                            <>
                                <GoogleLogo />
                                <span>Google로 계속하기</span>
                            </>
                        )}
                    </button>

                    {/* 안내 문구 */}
                    <p className="mt-6 text-xs text-gray-400">
                        로그인하면 개인 단어장이 클라우드에 안전하게 저장됩니다.
                    </p>
                </div>

                {/* 푸터 */}
                <p className="text-center text-xs text-gray-400 mt-6">
                    © 2025 VocaLoop. Powered by Gemini AI.
                </p>
            </div>
        </div>
    );
}

export default LoginScreen;
