import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Trash2, FileText, Brain, ArrowRightLeft, Quote, Folder } from './Icons';

const FOLDER_COLOR_MAP = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', dot: 'bg-blue-500' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', dot: 'bg-purple-500' },
    green: { bg: 'bg-green-100', text: 'text-green-600', dot: 'bg-green-500' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', dot: 'bg-orange-500' },
    pink: { bg: 'bg-pink-100', text: 'text-pink-600', dot: 'bg-pink-500' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-600', dot: 'bg-teal-500' },
};

const WordCard = ({ item, handleDeleteWord, folders = [], onMoveWord }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    const contentRef = useRef(null);
    const cardRef = useRef(null);

    // Height Calculation for Smooth Animation
    // Front height is fixed at 16rem (256px)
    // Back height is dynamic based on content
    const [backHeight, setBackHeight] = useState('auto');

    // 3D Tilt Animation State
    const [tiltStyle, setTiltStyle] = useState({});

    // Spotlight Effect State (좌표만 저장)
    const [cursorPos, setCursorPos] = useState({ x: 0, y: 0, opacity: 0 });

    // Folder move dropdown
    const [showFolderMenu, setShowFolderMenu] = useState(false);
    const currentFolder = folders.find(f => f.id === item.folderId);
    const folderColor = currentFolder ? (FOLDER_COLOR_MAP[currentFolder.color] || FOLDER_COLOR_MAP.blue) : null;

    // 마우스 위치 기반 3D Tilt + Spotlight 효과
    const handleMouseMove = (e) => {
        // 모바일(터치) 환경에서는 호버 효과 방지
        if (window.matchMedia && !window.matchMedia('(hover: hover)').matches) return;

        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        // 최대 기울기: 앞면 7도, 뒷면 4도 (긴 콘텐츠 안정성)
        const maxDegree = isFlipped ? 4 : 7;
        const rotateX = ((y - centerY) / centerY) * -maxDegree;
        const rotateY = ((x - centerX) / centerX) * maxDegree;

        setTiltStyle({
            transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02) translateY(-10px)`,
            transition: 'transform 0.1s ease-out'
        });

        // Spotlight Effect: 좌표 업데이트 (투명도 0.7)
        setCursorPos({ x, y, opacity: 0.7 });
    };

    const handleMouseLeave = () => {
        setTiltStyle({
            transform: 'rotateX(0deg) rotateY(0deg)',
            transition: 'transform 0.3s ease-out'
        });
        setCursorPos(prev => ({ ...prev, opacity: 0 }));
    };

    useEffect(() => {
        if (contentRef.current) {
            // Reduced bottom padding calculation to remove whitespace
            setBackHeight(contentRef.current.scrollHeight + 24 + 'px');
        }
    }, [item, isFlipped]);

    // 페이지 로드 시 TTS 음성 미리 로드
    useEffect(() => {
        // Chrome에서 음성 목록을 미리 로드하기 위해 빈 호출
        window.speechSynthesis.getVoices();

        // voiceschanged 이벤트 리스너 (음성 목록이 비동기로 로드됨)
        const handleVoicesChanged = () => {
            window.speechSynthesis.getVoices();
        };
        window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);

        return () => {
            window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        };
    }, []);

    const currentHeight = isFlipped ? backHeight : '12rem';

    // TTS Function with better voice selection (Samantha 우선)
    const playTTS = (text) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';

        // 음성 우선순위: Samantha (macOS/iOS) > Google US > Daniel
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice =
            voices.find(v => v.name === 'Samantha') ||
            voices.find(v => v.name.includes('Google US')) ||
            voices.find(v => v.name.includes('Google') && v.lang === 'en-US') ||
            voices.find(v => v.name === 'Daniel');

        if (preferredVoice) utterance.voice = preferredVoice;

        window.speechSynthesis.speak(utterance);
    };

    // Conditional positioning
    const frontClass = isFlipped ? 'absolute inset-0' : 'relative';
    const backClass = isFlipped ? 'relative' : 'absolute inset-0';

    return (
        <div
            ref={cardRef}
            className="overflow-visible cursor-pointer w-full"
            style={{
                height: currentHeight,
                transition: 'height 0.7s cubic-bezier(0.25, 1, 0.5, 1)'
            }}
            onClick={() => setIsFlipped(!isFlipped)}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <div className={`card-flip w-full h-full relative ${isFlipped ? 'flipped' : ''}`} style={tiltStyle}>
                <div className="card-inner rounded-xl">
                    {/* Front */}
                    <div className={`card-front overflow-hidden bg-white p-6 flex flex-col items-center justify-center text-center z-20 h-full rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow ${frontClass}`}>
                        {/* Spotlight Overlay: Front (Soft Blue) */}
                        <div
                            className="absolute inset-0 rounded-xl pointer-events-none z-10"
                            style={{
                                background: `radial-gradient(600px circle at ${cursorPos.x}px ${cursorPos.y}px, rgba(59, 130, 246, 0.15), transparent 80%)`,
                                opacity: cursorPos.opacity,
                                transition: 'opacity 0.2s ease-out'
                            }}
                        />
                        {/* Border Glow: Front (Blue Tint) */}
                        <div
                            className="absolute inset-0 rounded-xl pointer-events-none z-20"
                            style={{
                                background: `radial-gradient(400px circle at ${cursorPos.x}px ${cursorPos.y}px, rgba(59, 130, 246, 0.6), transparent 100%)`,
                                opacity: cursorPos.opacity,
                                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                WebkitMaskComposite: 'xor',
                                maskComposite: 'exclude',
                                padding: '1.5px',
                                transition: 'opacity 0.2s ease-out',
                                inset: '0px'
                            }}
                        />
                        {/* Folder badge - top left */}
                        {currentFolder && (
                            <span className={`absolute top-3 left-3 z-30 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${folderColor.bg} ${folderColor.text}`}>
                                <Folder className="w-3 h-3" />
                                {currentFolder.name}
                            </span>
                        )}
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">{item.pos}</span>
                        <h3 className="text-3xl font-bold text-gray-900 font-serif mb-2">{item.word}</h3>
                        <p className="text-gray-500 font-serif italic">{item.pronunciation}</p>
                        <button
                            className="mt-1 p-2 text-gray-400 hover:text-blue-600 transition-colors z-30"
                            onClick={(e) => { e.stopPropagation(); playTTS(item.word); }}
                        >
                            <Volume2 className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Back */}
                    <div
                        className={`card-back overflow-hidden bg-blue-50 p-6 flex flex-col h-full rounded-xl shadow-sm border border-blue-200 ${backClass}`}
                        ref={contentRef}
                    >
                        {/* Spotlight Overlay: Back (Bright White) */}
                        <div
                            className="absolute inset-0 rounded-xl pointer-events-none z-10"
                            style={{
                                background: `radial-gradient(600px circle at ${cursorPos.x}px ${cursorPos.y}px, rgba(255, 255, 255, 0.45), transparent 80%)`,
                                opacity: cursorPos.opacity,
                                transition: 'opacity 0.2s ease-out'
                            }}
                        />
                        {/* Border Glow: Back (White/Blue mix) */}
                        <div
                            className="absolute inset-0 rounded-xl pointer-events-none z-20"
                            style={{
                                background: `radial-gradient(400px circle at ${cursorPos.x}px ${cursorPos.y}px, rgba(255, 255, 255, 0.9), transparent 100%)`,
                                opacity: cursorPos.opacity,
                                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                WebkitMaskComposite: 'xor',
                                maskComposite: 'exclude',
                                padding: '1.5px',
                                transition: 'opacity 0.2s ease-out',
                                inset: '0.5px'
                            }}
                        />
                        {/* Header Row: Word + TTS & Delete */}
                        <div className="flex justify-between items-start mb-4 pb-3 border-b border-blue-200">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-xl font-bold text-gray-900 font-serif">{item.word}</h3>
                                    <button
                                        className="text-gray-400 hover:text-blue-600 p-0.5"
                                        onClick={(e) => { e.stopPropagation(); playTTS(item.word); }}
                                    >
                                        <Volume2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <h4 className="text-lg font-bold text-blue-700 leading-tight">{item.meaning_ko}</h4>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                                {/* Folder move button */}
                                <div className="relative">
                                    <button
                                        className={`p-1 rounded transition-colors ${showFolderMenu ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-blue-500'}`}
                                        onClick={(e) => { e.stopPropagation(); setShowFolderMenu(!showFolderMenu); }}
                                        title="폴더 이동"
                                    >
                                        <Folder className="w-4 h-4" />
                                    </button>
                                    {showFolderMenu && (
                                        <div
                                            className="absolute right-0 top-full mt-1 z-30 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[150px]"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <button
                                                onClick={() => { onMoveWord(item.id, null); setShowFolderMenu(false); }}
                                                className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${!item.folderId ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}
                                            >
                                                미분류
                                            </button>
                                            {folders.map(f => {
                                                const c = FOLDER_COLOR_MAP[f.color] || FOLDER_COLOR_MAP.blue;
                                                return (
                                                    <button
                                                        key={f.id}
                                                        onClick={() => { onMoveWord(item.id, f.id); setShowFolderMenu(false); }}
                                                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${item.folderId === f.id ? 'text-blue-600 font-semibold' : 'text-gray-700'}`}
                                                    >
                                                        <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                                                        <span className="truncate">{f.name}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                <button
                                    className="text-gray-400 hover:text-red-500 p-1"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteWord(item.id); }}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Definition */}
                            <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Definition</p>
                                </div>
                                <p className="text-sm text-gray-800 leading-relaxed">{item.definitions?.[0]}</p>
                            </div>

                            {/* Nuance */}
                            {item.nuance && (
                                <div className="pt-3 border-t border-blue-200">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Brain className="w-3.5 h-3.5 text-purple-500" />
                                        <p className="text-xs font-bold text-purple-600 uppercase tracking-wide">Nuance</p>
                                    </div>
                                    <p className="text-xs text-gray-700 leading-relaxed">
                                        {item.nuance}
                                    </p>
                                </div>
                            )}

                            {/* Synonyms */}
                            {item.synonyms && item.synonyms.length > 0 && (
                                <div className="pt-3 border-t border-blue-200">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <ArrowRightLeft className="w-3.5 h-3.5 text-orange-500" />
                                        <p className="text-xs font-bold text-orange-600 uppercase tracking-wide">Synonyms</p>
                                    </div>
                                    <p className="text-sm text-gray-800 leading-relaxed italic">
                                        {item.synonyms.join(', ')}
                                    </p>
                                </div>
                            )}

                            {/* Examples */}
                            {item.examples?.length > 0 && (
                                <div className="pt-3 border-t border-blue-200">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <Quote className="w-3.5 h-3.5 text-blue-400" />
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Examples</p>
                                    </div>
                                    <div className="space-y-2">
                                        {item.examples.map((ex, idx) => (
                                            <div key={idx}>
                                                <p className="text-sm text-blue-900 font-medium mb-0.5 leading-snug">"{ex.en}"</p>
                                                <p className="text-xs text-gray-500">{ex.ko}</p>
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
