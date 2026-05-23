import React, { useMemo, useState } from 'react';
import { Mail, Lock, Eye, EyeOff, CheckCircle, XCircle, InfinityIcon } from './Icons';
import { Button, Card, Input, Badge } from '../design-system';

const passwordRules = [
    { key: 'minLength',     label: '최소 8자 이상' },
    { key: 'hasLowercase',  label: '소문자 포함 (a-z)' },
    { key: 'hasNumber',     label: '숫자 포함 (0-9)' },
    { key: 'hasSpecialChar',label: '특수문자 포함 (!@#$%^&*)' },
];

const PasswordRule = ({ ok, label }) => (
    <li className="flex items-center gap-2 text-xs">
        {ok ? (
            <CheckCircle className="w-4 h-4 text-success-600 shrink-0" aria-hidden="true" />
        ) : (
            <XCircle className="w-4 h-4 text-surface-300 shrink-0" aria-hidden="true" />
        )}
        <span className={ok ? 'text-success-700 font-semibold' : 'text-surface-500'}>
            {label}
        </span>
    </li>
);

function LoginScreen({ onEmailLogin, onEmailSignup, isLoading }) {
    const [mode, setMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');

    const passwordStrength = useMemo(() => {
        if (!password) return null;
        return {
            minLength:     password.length >= 8,
            hasLowercase:  /[a-z]/.test(password),
            hasNumber:     /\d/.test(password),
            hasSpecialChar:/[!@#$%^&*(),.?":{}|<>]/.test(password),
        };
    }, [password]);

    const isPasswordStrong = useMemo(() => {
        if (!passwordStrength) return false;
        return Object.values(passwordStrength).every(Boolean);
    }, [passwordStrength]);

    const resetFormErrors = () => {
        setError('');
        setPassword('');
        setConfirmPassword('');
    };

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('이메일과 비밀번호를 입력해주세요.');
            return;
        }

        if (mode === 'signup') {
            if (!isPasswordStrong) {
                setError('비밀번호가 보안 요구사항을 충족하지 않습니다.');
                return;
            }
            if (password !== confirmPassword) {
                setError('비밀번호가 일치하지 않습니다.');
                return;
            }
            await onEmailSignup(email, password);
            return;
        }

        await onEmailLogin(email, password);
    };

    const togglePassword = () => setShowPassword(v => !v);
    const toggleConfirm  = () => setShowConfirmPassword(v => !v);

    const PwToggle = ({ visible, onClick, label }) => (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            className="text-surface-400 hover:text-surface-700 transition-colors p-1"
        >
            {visible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
    );

    return (
        <div className="min-h-screen relative overflow-hidden bg-surface-50 flex items-center justify-center p-4">
            {/* 배경 — brand glow blobs (소프트, 비침수준) */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-pill bg-brand-200/40 blur-[100px]" />
                <div className="absolute -bottom-32 -right-32 w-[28rem] h-[28rem] rounded-pill bg-accent-200/40 blur-[100px]" />
            </div>

            <div className="relative w-full max-w-md">
                <Card variant="elevated" radius="card" padding="lg" className="!p-10">
                    {/* Brand mark */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-pair-600 shadow-[var(--shadow-glow-brand)] mb-5">
                            <InfinityIcon className="w-10 h-10 text-white" strokeWidth={2.5} />
                        </div>
                        <h1 className="text-3xl font-black tracking-tight text-surface-900">VocaLoop</h1>
                        <p className="text-sm font-bold text-surface-500 mt-1.5">AI 기반 영어 단어 학습</p>
                    </div>

                    {/* 모드 토글 — 세그먼트 */}
                    <div className="flex gap-1 mb-7 bg-surface-100 p-1 rounded-pill" role="tablist" aria-label="인증 모드">
                        {[
                            { id: 'login',  label: '로그인' },
                            { id: 'signup', label: '회원가입' },
                        ].map((m) => (
                            <button
                                key={m.id}
                                role="tab"
                                aria-selected={mode === m.id}
                                onClick={() => { setMode(m.id); resetFormErrors(); }}
                                className={[
                                    'flex-1 h-10 rounded-pill text-sm font-bold tracking-tight transition-all duration-200',
                                    mode === m.id
                                        ? 'bg-white text-brand-700 shadow-[var(--shadow-soft)]'
                                        : 'text-surface-500 hover:text-surface-900',
                                ].join(' ')}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>

                    {error && (
                        <div className="mb-5 p-3 bg-danger-50 border border-danger-500/20 rounded-md text-sm font-semibold text-danger-700" role="alert">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleEmailSubmit} className="space-y-4">
                        <Input
                            label="이메일"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="example@email.com"
                            leftIcon={Mail}
                            disabled={isLoading}
                            autoComplete="email"
                        />

                        <Input
                            label="비밀번호"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            leftIcon={Lock}
                            disabled={isLoading}
                            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                            rightSlot={
                                <PwToggle
                                    visible={showPassword}
                                    onClick={togglePassword}
                                    label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                                />
                            }
                        />

                        {mode === 'signup' && password && (
                            <div className="p-4 bg-surface-50 rounded-md border border-surface-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <Badge tone={isPasswordStrong ? 'success' : 'neutral'} size="xs">
                                        {isPasswordStrong ? 'Strong' : 'Requirements'}
                                    </Badge>
                                </div>
                                <ul className="space-y-1.5">
                                    {passwordRules.map((r) => (
                                        <PasswordRule
                                            key={r.key}
                                            ok={Boolean(passwordStrength?.[r.key])}
                                            label={r.label}
                                        />
                                    ))}
                                </ul>
                            </div>
                        )}

                        {mode === 'signup' && (
                            <Input
                                label="비밀번호 확인"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                leftIcon={Lock}
                                disabled={isLoading}
                                autoComplete="new-password"
                                error={confirmPassword && password !== confirmPassword ? '비밀번호가 일치하지 않습니다.' : undefined}
                                rightSlot={
                                    <PwToggle
                                        visible={showConfirmPassword}
                                        onClick={toggleConfirm}
                                        label={showConfirmPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                                    />
                                }
                            />
                        )}

                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            fullWidth
                            loading={isLoading}
                            disabled={isLoading}
                            className="mt-2"
                        >
                            {isLoading
                                ? (mode === 'signup' ? '가입 중...' : '로그인 중...')
                                : (mode === 'signup' ? '회원가입' : '로그인')}
                        </Button>
                    </form>

                    <p className="mt-6 text-xs text-surface-400 text-center font-semibold">
                        로그인하면 개인 단어장이 클라우드에 안전하게 저장됩니다.
                    </p>
                </Card>

                <p className="text-center text-xs text-surface-400 mt-6 font-semibold">
                    © 2025 VocaLoop · Powered by Codex CLI
                </p>
            </div>
        </div>
    );
}

export default LoginScreen;
