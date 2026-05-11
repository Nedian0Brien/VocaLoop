import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Trash2, FileText, Brain, ArrowRightLeft, Quote, Folder, MoreVertical, RotateCw, Loader2 } from './Icons';
import LearningRateDonut, { LearningStatusBadge } from './LearningRateDonut';

/**
 * 폴더 색상 팔레트.
 * 사용자 데이터(folder.color)와 1:1 매칭되어야 하므로 raw Tailwind 유지.
 * (디자인 시스템의 brand/accent 팔레트와는 별개의 사용자 선택지)
 */
const FOLDER_COLOR_MAP = {
    blue:   { bg: 'bg-blue-100',   text: 'text-blue-600',   dot: 'bg-blue-500' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', dot: 'bg-purple-500' },
    green:  { bg: 'bg-green-100',  text: 'text-green-600',  dot: 'bg-green-500' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', dot: 'bg-orange-500' },
    pink:   { bg: 'bg-pink-100',   text: 'text-pink-600',   dot: 'bg-pink-500' },
    teal:   { bg: 'bg-teal-100',   text: 'text-teal-600',   dot: 'bg-teal-500' },
};

const WordCard = ({ item, handleDeleteWord, folders = [], onMoveWord, onRegenerateWord }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const contentRef = useRef(null);
    const cardRef = useRef(null);

    const [backHeight, setBackHeight] = useState('auto');
    const [tiltStyle, setTiltStyle] = useState({});
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0, opacity: 0 });

    const [showFolderMenu, setShowFolderMenu] = useState(false);
    const currentFolder = folders.find(f => f.id === item.folderId);
    const folderColor = currentFolder ? (FOLDER_COLOR_MAP[currentFolder.color] || FOLDER_COLOR_MAP.blue) : null;

    const [showWordMenu, setShowWordMenu] = useState(false);
    const [isRegenerating, setIsRegenerating] = useState(false);

    const handleMouseMove = (e) => {
        if (window.matchMedia && !window.matchMedia('(hover: hover)').matches) return;
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const maxDegree = isFlipped ? 4 : 7;
        const rotateX = ((y - centerY) / centerY) * -maxDegree;
        const rotateY = ((x - centerX) / centerX) * maxDegree;

        setTiltStyle({
            transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02) translateY(-10px)`,
            transition: 'transform 0.1s ease-out',
        });
        setCursorPos({ x, y, opacity: 0.7 });
    };

    const handleMouseLeave = () => {
        setTiltStyle({
            transform: 'rotateX(0deg) rotateY(0deg)',
            transition: 'transform 0.3s ease-out',
        });
        setCursorPos(prev => ({ ...prev, opacity: 0 }));
    };

    useEffect(() => {
        if (contentRef.current) {
            setBackHeight(contentRef.current.scrollHeight + 24 + 'px');
        }
    }, [item, isFlipped]);

    useEffect(() => {
        window.speechSynthesis.getVoices();
        const handleVoicesChanged = () => window.speechSynthesis.getVoices();
        window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
        return () => window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
    }, []);

    const currentHeight = isFlipped ? backHeight : '12rem';

    const playTTS = (text) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice =
            voices.find(v => v.name === 'Samantha') ||
            voices.find(v => v.name.includes('Google US')) ||
            voices.find(v => v.name.includes('Google') && v.lang === 'en-US') ||
            voices.find(v => v.name === 'Daniel');
        if (preferredVoice) utterance.voice = preferredVoice;
        window.speechSynthesis.speak(utterance);
    };

    const handleRegenerate = async (e) => {
        e.stopPropagation();
        if (!onRegenerateWord || isRegenerating) return;
        setIsRegenerating(true);
        setShowWordMenu(false);
        try {
            await onRegenerateWord(item.id);
        } catch (error) {
            console.error('Regeneration error:', error);
        } finally {
            setIsRegenerating(false);
        }
    };

    const frontClass = isFlipped ? 'absolute inset-0' : 'relative';
    const backClass = isFlipped ? 'relative' : 'absolute inset-0';

    return (
        <div
            ref={cardRef}
            className="overflow-visible cursor-pointer w-full"
            style={{ height: currentHeight, transition: 'height 0.7s var(--ease-spring)' }}
            onClick={() => { if (isRegenerating) return; setIsFlipped(!isFlipped); }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <div className={`card-flip w-full h-full relative ${isFlipped ? 'flipped' : ''}`} style={tiltStyle}>
                <div className="card-inner word-card-radius-shell">
                    {/* Front */}
                    <div className={`card-front overflow-hidden bg-white p-6 flex flex-col items-center justify-center text-center z-20 h-full rounded-xl shadow-[var(--shadow-soft)] border border-surface-200 hover:shadow-[var(--shadow-card)] transition-shadow ${frontClass}`}>
                        {/* Spotlight (brand-500 RGBA) */}
                        <div
                            className="word-card-radius-layer absolute inset-0 pointer-events-none z-10"
                            style={{
                                background: `radial-gradient(600px circle at ${cursorPos.x}px ${cursorPos.y}px, rgba(59, 130, 246, 0.15), transparent 80%)`,
                                opacity: cursorPos.opacity,
                                transition: 'opacity 0.2s ease-out',
                            }}
                        />
                        {/* Border Glow */}
                        <div
                            className="word-card-radius-layer absolute inset-0 pointer-events-none z-20"
                            style={{
                                background: `radial-gradient(400px circle at ${cursorPos.x}px ${cursorPos.y}px, rgba(59, 130, 246, 0.6), transparent 100%)`,
                                opacity: cursorPos.opacity,
                                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                WebkitMaskComposite: 'xor',
                                maskComposite: 'exclude',
                                padding: '1.5px',
                                transition: 'opacity 0.2s ease-out',
                                inset: '0px',
                            }}
                        />
                        {currentFolder && (
                            <span className={`absolute top-3 left-3 z-30 text-2xs font-black px-2 py-0.5 rounded-pill flex items-center gap-1 ${folderColor.bg} ${folderColor.text}`}>
                                <Folder className="w-3 h-3" aria-hidden="true" />
                                {currentFolder.name}
                            </span>
                        )}
                        <span className="text-xs font-black text-brand-600 uppercase tracking-wider mb-2">{item.pos}</span>
                        <h3 className="text-3xl font-bold text-surface-900 font-serif mb-2">{item.word}</h3>
                        <button
                            className="text-surface-500 font-serif italic hover:text-brand-600 transition-colors cursor-pointer mb-3 z-30"
                            onClick={(e) => { e.stopPropagation(); playTTS(item.word); }}
                        >
                            {item.pronunciation}
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30">
                            <LearningRateDonut rate={item.learningRate || 0} size={30} strokeWidth={3} />
                        </div>
                    </div>

                    {/* Back */}
                    <div
                        className={`card-back overflow-hidden bg-brand-50 p-6 flex flex-col h-full rounded-xl shadow-[var(--shadow-soft)] border border-brand-200 ${backClass}`}
                        ref={contentRef}
                    >
                        <div
                            className="word-card-radius-layer absolute inset-0 pointer-events-none z-10"
                            style={{
                                background: `radial-gradient(600px circle at ${cursorPos.x}px ${cursorPos.y}px, rgba(255, 255, 255, 0.45), transparent 80%)`,
                                opacity: cursorPos.opacity,
                                transition: 'opacity 0.2s ease-out',
                            }}
                        />
                        <div
                            className="word-card-radius-layer absolute inset-0 pointer-events-none z-20"
                            style={{
                                background: `radial-gradient(400px circle at ${cursorPos.x}px ${cursorPos.y}px, rgba(255, 255, 255, 0.9), transparent 100%)`,
                                opacity: cursorPos.opacity,
                                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                WebkitMaskComposite: 'xor',
                                maskComposite: 'exclude',
                                padding: '1.5px',
                                transition: 'opacity 0.2s ease-out',
                                inset: '0.5px',
                            }}
                        />
                        {isRegenerating && (
                            <div className="word-card-radius-layer absolute inset-0 bg-white/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center pointer-events-none">
                                <Loader2 className="w-12 h-12 text-brand-600 animate-spin mb-3" aria-hidden="true" />
                                <p className="text-lg font-bold text-brand-700">재생성 중...</p>
                                <p className="text-sm text-surface-600 mt-1">잠시만 기다려주세요</p>
                            </div>
                        )}
                        {/* Header Row */}
                        <div className="flex justify-between items-start mb-4 pb-3 border-b border-brand-200">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-xl font-bold text-surface-900 font-serif">{item.word}</h3>
                                    <button
                                        className="text-surface-400 hover:text-brand-600 p-0.5"
                                        onClick={(e) => { e.stopPropagation(); playTTS(item.word); }}
                                        aria-label="발음 듣기"
                                    >
                                        <Volume2 className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                    <LearningStatusBadge rate={item.learningRate || 0} />
                                </div>
                                <h4 className="text-lg font-bold text-brand-700 leading-tight">{item.meaning_ko}</h4>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                                {/* Folder move */}
                                <div className="relative">
                                    <button
                                        className={`p-1 rounded transition-colors ${showFolderMenu ? 'text-brand-600 bg-brand-50' : 'text-surface-400 hover:text-brand-500'}`}
                                        onClick={(e) => { e.stopPropagation(); setShowFolderMenu(!showFolderMenu); }}
                                        title="폴더 이동"
                                        aria-label="폴더 이동"
                                    >
                                        <Folder className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                    {showFolderMenu && (
                                        <div
                                            className="absolute right-0 top-full mt-1 z-30 bg-white border border-surface-200 rounded-xl shadow-[var(--shadow-elevated)] py-1 min-w-[150px]"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                onClick={() => { onMoveWord(item.id, null); setShowFolderMenu(false); }}
                                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-50 transition-colors ${!item.folderId ? 'text-brand-600 font-bold' : 'text-surface-700'}`}
                                            >
                                                미분류
                                            </button>
                                            {folders.map(f => {
                                                const c = FOLDER_COLOR_MAP[f.color] || FOLDER_COLOR_MAP.blue;
                                                return (
                                                    <button
                                                        key={f.id}
                                                        onClick={() => { onMoveWord(item.id, f.id); setShowFolderMenu(false); }}
                                                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-50 transition-colors ${item.folderId === f.id ? 'text-brand-600 font-bold' : 'text-surface-700'}`}
                                                    >
                                                        <div className={`w-2 h-2 rounded-pill ${c.dot}`} aria-hidden="true" />
                                                        <span className="truncate">{f.name}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                {/* Word actions */}
                                <div className="relative">
                                    <button
                                        className={`p-1 rounded transition-colors ${showWordMenu ? 'text-brand-600 bg-brand-50' : 'text-surface-400 hover:text-surface-600'}`}
                                        onClick={(e) => { e.stopPropagation(); setShowWordMenu(!showWordMenu); }}
                                        title="단어 메뉴"
                                        aria-label="단어 메뉴"
                                    >
                                        <MoreVertical className="w-4 h-4" aria-hidden="true" />
                                    </button>
                                    {showWordMenu && (
                                        <div
                                            className="absolute right-0 top-full mt-1 z-30 bg-white border border-surface-200 rounded-xl shadow-[var(--shadow-elevated)] py-1 min-w-[160px]"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                onClick={handleRegenerate}
                                                disabled={isRegenerating}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-50 transition-colors text-surface-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isRegenerating ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                                                ) : (
                                                    <RotateCw className="w-3.5 h-3.5" aria-hidden="true" />
                                                )}
                                                <span>{isRegenerating ? '재생성 중...' : '단어 재생성'}</span>
                                            </button>
                                            <div className="border-t border-surface-200 my-1" />
                                            <button
                                                onClick={() => { handleDeleteWord(item.id); setShowWordMenu(false); }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-danger-50 transition-colors text-danger-600"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                                <span>단어 삭제</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Definition */}
                            <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <FileText className="w-3.5 h-3.5 text-brand-400" aria-hidden="true" />
                                    <p className="text-xs font-bold text-surface-500 uppercase tracking-wide">Definition</p>
                                </div>
                                <p className="text-sm text-surface-800 leading-relaxed mb-0.5">{item.definitions?.[0]}</p>
                                {item.definitions_ko?.[0] && (
                                    <p className="text-xs text-surface-500">{item.definitions_ko[0]}</p>
                                )}
                            </div>

                            {/* Nuance */}
                            {item.nuance && (
                                <div className="pt-3 border-t border-brand-200">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Brain className="w-3.5 h-3.5 text-accent-500" aria-hidden="true" />
                                        <p className="text-xs font-bold text-accent-600 uppercase tracking-wide">Nuance</p>
                                    </div>
                                    <p className="text-xs text-surface-700 leading-relaxed">
                                        {item.nuance}
                                    </p>
                                </div>
                            )}

                            {/* Synonyms */}
                            {item.synonyms && item.synonyms.length > 0 && (
                                <div className="pt-3 border-t border-brand-200">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <ArrowRightLeft className="w-3.5 h-3.5 text-warning-500" aria-hidden="true" />
                                        <p className="text-xs font-bold text-warning-600 uppercase tracking-wide">Synonyms</p>
                                    </div>
                                    <p className="text-sm text-surface-800 leading-relaxed italic">
                                        {item.synonyms.join(', ')}
                                    </p>
                                </div>
                            )}

                            {/* Examples */}
                            {item.examples?.length > 0 && (
                                <div className="pt-3 border-t border-brand-200">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Quote className="w-3.5 h-3.5 text-brand-400" aria-hidden="true" />
                                        <p className="text-xs font-bold text-surface-500 uppercase tracking-wide">Examples</p>
                                    </div>
                                    <div className="space-y-2">
                                        {item.examples.map((ex, idx) => (
                                            <div key={idx}>
                                                <p className="text-sm text-brand-900 font-medium mb-0.5 leading-snug">"{ex.en}"</p>
                                                <p className="text-xs text-surface-500">{ex.ko}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WordCard;
