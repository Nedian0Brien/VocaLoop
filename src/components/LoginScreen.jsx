import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from './Icons';

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
function LoginScreen({ onGoogleLogin, onEmailLogin, onEmailSignup, onPasswordReset, isLoading }) {
    const [mode, setMode] = useState('login'); // 'login', 'signup', or 'reset'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // 비밀번호 재설정 모드
        if (mode === 'reset') {
            if (!email) {
                setError('이메일을 입력해주세요.');
                return;
            }
            const success = await onPasswordReset(email);
            if (success) {
                setMode('login');
                setEmail('');
            }
            return;
        }

        // 입력 검증
        if (!email || !password) {
            setError('이메일과 비밀번호를 입력해주세요.');
            return;
        }

        if (mode === 'signup') {
            if (password.length < 6) {
                setError('비밀번호는 최소 6자 이상이어야 합니다.');
                return;
            }
            if (password !== confirmPassword) {
                setError('비밀번호가 일치하지 않습니다.');
                return;
            }
            await onEmailSignup(email, password);
        } else {
            await onEmailLogin(email, password);
        }
    };

    const toggleMode = () => {
        setMode(mode === 'login' ? 'signup' : 'login');
        setError('');
        setPassword('');
        setConfirmPassword('');
    };
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
            <div className="max-w-md w-full mx-4">
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                    {/* 로고 및 타이틀 */}
                    <div className="mb-8 text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <span className="text-3xl font-bold text-white">V</span>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">VocaLoop</h1>
                        <p className="text-gray-500">AI 기반 영어 단어 학습 도구</p>
                    </div>

                    {/* 탭 전환 (비밀번호 재설정 모드가 아닐 때만 표시) */}
                    {mode !== 'reset' && (
                        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
                            <button
                                onClick={() => setMode('login')}
                                className={`flex-1 py-2.5 rounded-lg font-semibold transition-all duration-200 ${
                                    mode === 'login'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                로그인
                            </button>
                            <button
                                onClick={() => setMode('signup')}
                                className={`flex-1 py-2.5 rounded-lg font-semibold transition-all duration-200 ${
                                    mode === 'signup'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                회원가입
                            </button>
                        </div>
                    )}

                    {/* 비밀번호 재설정 모드 헤더 */}
                    {mode === 'reset' && (
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-2">비밀번호 재설정</h2>
                            <p className="text-sm text-gray-600">
                                가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
                            </p>
                        </div>
                    )}

                    {/* 에러 메시지 */}
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    {/* 이메일/비밀번호 폼 */}
                    <form onSubmit={handleEmailSubmit} className="space-y-4 mb-6">
                        {/* 이메일 입력 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                                이메일
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="example@email.com"
                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        {/* 비밀번호 입력 (재설정 모드가 아닐 때만) */}
                        {mode !== 'reset' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                                    비밀번호
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 비밀번호 확인 (회원가입 시에만) */}
                        {mode === 'signup' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                                    비밀번호 확인
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 제출 버튼 */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>
                                        {mode === 'reset' ? '전송 중...' : mode === 'signup' ? '가입 중...' : '로그인 중...'}
                                    </span>
                                </div>
                            ) : (
                                <span>
                                    {mode === 'reset' ? '재설정 이메일 전송' : mode === 'signup' ? '회원가입' : '로그인'}
                                </span>
                            )}
                        </button>
                    </form>

                    {/* 비밀번호 재설정 링크 (로그인 모드일 때만) */}
                    {mode === 'login' && (
                        <div className="mb-6 text-center">
                            <button
                                onClick={() => {
                                    setMode('reset');
                                    setError('');
                                    setPassword('');
                                }}
                                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                            >
                                비밀번호를 잊으셨나요?
                            </button>
                        </div>
                    )}

                    {/* 로그인으로 돌아가기 (비밀번호 재설정 모드일 때만) */}
                    {mode === 'reset' && (
                        <div className="mb-6 text-center">
                            <button
                                onClick={() => {
                                    setMode('login');
                                    setError('');
                                }}
                                className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                            >
                                ← 로그인으로 돌아가기
                            </button>
                        </div>
                    )}

                    {/* 구분선 (비밀번호 재설정 모드가 아닐 때만) */}
                    {mode !== 'reset' && (
                        <>
                            <div className="relative mb-6">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-white text-gray-500">또는</span>
                                </div>
                            </div>

                            {/* Google 로그인 버튼 */}
                            <button
                                onClick={onGoogleLogin}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 border-gray-200 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <GoogleLogo />
                                <span>Google로 계속하기</span>
                            </button>
                        </>
                    )}

                    {/* 안내 문구 */}
                    <p className="mt-6 text-xs text-gray-400 text-center">
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
