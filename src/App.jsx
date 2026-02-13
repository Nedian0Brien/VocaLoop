import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from "firebase/app";
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    onAuthStateChanged,
    signOut
} from "firebase/auth";
import {
    getFirestore,
    collection,
    addDoc,
    query,
    onSnapshot,
    serverTimestamp,
    writeBatch,
    doc,
    deleteDoc,
    updateDoc
} from "firebase/firestore";

// Components
import Header from './components/Header';
import SetupScreen from './components/SetupScreen';
import LoginScreen from './components/LoginScreen';
import WordCard from './components/WordCard';
import EmptyState from './components/EmptyState';
import QuizView from './components/QuizView';
import FolderSidebar from './components/FolderSidebar';
import AccountSettings from './components/AccountSettings';
import { Loader2, Plus, Search, Brain, Check, RotateCw, Sparkles, Folder } from './components/Icons';

// Hooks & Services
import useWindowSize from './hooks/useWindowSize';
import { generateWordData } from './services/geminiService';
import {
    getLearningStatus,
    LEARNING_STATUS,
    LEARNING_STATUS_CONFIG,
    groupWordsByStatus,
    sortByLearningRate,
} from './utils/learningRate';
import LearningRateDonut from './components/LearningRateDonut';

// --- System Constants ---
const loadConfig = (envKey, localKey) => {
    // 1. Try Vite Env
    if (import.meta.env[envKey]) return import.meta.env[envKey];
    // 2. Try window global (legacy)
    if (typeof window !== 'undefined' && window[localKey]) return window[localKey];
    // 3. Try LocalStorage
    return localStorage.getItem(localKey);
};

// 이메일을 Firestore 경로로 사용 가능한 안전한 문자열로 변환
const getStorageKeyFromEmail = (email) => {
    if (!email) return null;
    // Firestore 경로에서 사용할 수 없는 특수문자를 언더스코어로 변환
    return email.toLowerCase().replace(/[.@#$[\]]/g, '_');
};

const apiKey = loadConfig('VITE_GEMINI_API_KEY', '__api_key') || "";
const appId = "vocaloop-default";
const firebaseConfigRaw = loadConfig('VITE_FIREBASE_CONFIG', '__firebase_config');
let firebaseConfig = null;
try {
    firebaseConfig = firebaseConfigRaw ? JSON.parse(firebaseConfigRaw) : null;
} catch (e) {
    console.error("Bad Firebase Config", e);
}

// --- Sample Data for Auto Seeding ---
const SAMPLE_WORDS = [
    {
        word: "Serendipity",
        meaning_ko: "뜻밖의 행운",
        pronunciation: "/ˌser.ənˈdɪp.ə.ti/",
        pos: "Noun",
        definitions: ["The occurrence and development of events by chance in a happy or beneficial way."],
        examples: [{ en: "Finding this restaurant was a pure serendipity.", ko: "이 식당을 발견한 것은 정말 뜻밖의 행운이었다." }],
        nuance: "단순한 행운(luck)이 아니라, 우연히 발견한 기쁨이나 가치 있는 것을 강조할 때 사용함.",
        synonyms: ["chance", "fluke"]
    },
    {
        word: "Ephemeral",
        meaning_ko: "단명하는, 덧없는",
        pronunciation: "/ɪˈfem.ər.əl/",
        pos: "Adjective",
        definitions: ["Lasting for a very short time."],
        examples: [{ en: "Fashions are ephemeral, changing with every season.", ko: "패션은 덧없어서 계절마다 바뀐다." }],
        nuance: "수명이 매우 짧거나 금방 사라지는 현상을 묘사할 때 씀. 다소 문학적이거나 감성적인 뉘앙스.",
        synonyms: ["transitory", "fleeting"]
    },
    {
        word: "Eloquent",
        meaning_ko: "웅변을 잘 하는, 유창한",
        pronunciation: "/ˈel.ə.kwənt/",
        pos: "Adjective",
        definitions: ["Fluent or persuasive in speaking or writing."],
        examples: [{ en: "She made an eloquent appeal for action.", ko: "그녀는 행동을 촉구하는 유창한 호소를 했다." }],
        nuance: "단순히 말을 잘하는(fluent) 것을 넘어, 감동을 주거나 설득력이 뛰어남을 의미.",
        synonyms: ["persuasive", "expressive"]
    },
    {
        word: "Resilience",
        meaning_ko: "회복력, 탄력",
        pronunciation: "/rɪˈzɪl.jəns/",
        pos: "Noun",
        definitions: ["The capacity to recover quickly from difficulties; toughness."],
        examples: [{ en: "He showed great resilience after the failure.", ko: "그는 실패 후 엄청난 회복력을 보여주었다." }],
        nuance: "어려움이나 충격을 딛고 다시 일어서는 힘을 강조하는 긍정적인 단어.",
        synonyms: ["toughness", "flexibility"]
    },
    {
        word: "Ubiquitous",
        meaning_ko: "어디에나 있는",
        pronunciation: "/juːˈbɪk.wɪ.təs/",
        pos: "Adjective",
        definitions: ["Present, appearing, or found everywhere."],
        examples: [{ en: "Smartphones have become ubiquitous in daily life.", ko: "스마트폰은 일상생활 어디서나 볼 수 있게 되었다." }],
        nuance: "매우 흔해서 언제 어디서든 볼 수 있다는 뜻. 주로 기술이나 트렌드에 대해 씀.",
        synonyms: ["omnipresent", "pervasive"]
    }
];

// --- Main App Component ---
function App() {
    const [user, setUser] = useState(null);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [view, setView] = useState('dashboard');
    const [words, setWords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loginLoading, setLoginLoading] = useState(false);
    const [inputWord, setInputWord] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzingWord, setAnalyzingWord] = useState(null); // Track word being analyzed for loading card
    const [notification, setNotification] = useState(null);
    const [aiMode, setAiMode] = useState(false); // AI 모드 토글
    const [folders, setFolders] = useState([]);
    const [selectedFolderId, setSelectedFolderId] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const seededRef = useRef(false);
    const [sortMode, setSortMode] = useState('newest'); // 'newest', 'learning-rate-asc', 'learning-rate-desc', 'status-group'
    const [groupByStatus, setGroupByStatus] = useState(false);

    const windowSize = useWindowSize();
    const isMobile = windowSize.width < 640;

    // 1. Check for Missing Config -> Show Setup Screen
    if (!firebaseConfig || !apiKey) {
        return <SetupScreen />;
    }

    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const firestore = getFirestore(app);
            setAuth(authInstance);
            setDb(firestore);

            const unsubscribe = onAuthStateChanged(authInstance, (currentUser) => {
                setUser(currentUser);
                if (currentUser && currentUser.email) {
                    // 이메일 기반 스토리지 키 사용 - 같은 이메일이면 Google/이메일 로그인 모두 같은 데이터 사용
                    const userStorageKey = getStorageKeyFromEmail(currentUser.email);

                    const q = query(
                        collection(firestore, 'artifacts', appId, 'users', userStorageKey, 'words')
                    );

                    // Folders 실시간 리스너
                    const foldersQuery = query(
                        collection(firestore, 'artifacts', appId, 'users', userStorageKey, 'folders')
                    );
                    onSnapshot(foldersQuery, (fSnap) => {
                        const foldersData = fSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                        foldersData.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
                        setFolders(foldersData);
                    });

                    onSnapshot(q, async (snapshot) => {
                        if (snapshot.empty && !seededRef.current) {
                            seededRef.current = true;
                            console.log("Seeding sample data for", currentUser.email);
                            try {
                                const batch = writeBatch(firestore);
                                SAMPLE_WORDS.forEach(wordData => {
                                    const newDocRef = doc(collection(firestore, 'artifacts', appId, 'users', userStorageKey, 'words'));
                                    batch.set(newDocRef, {
                                        ...wordData,
                                        createdAt: serverTimestamp(),
                                        status: 'NEW',
                                        learningRate: 0,
                                        stats: { wrong_count: 0, consecutive_wrong: 0, review_count: 0 }
                                    });
                                });
                                await batch.commit();
                                console.log("Seeding complete");
                                showNotification("Sample words added for testing!");
                            } catch (err) {
                                console.error("Seeding failed:", err);
                                showNotification("Data seeding failed: " + err.message, "error");
                            }
                        }

                        const wordsData = snapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                        wordsData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                        setWords(wordsData);
                        setLoading(false);
                    }, (error) => {
                        console.error("Firestore Error:", error);
                        showNotification("Data loading error: " + error.message, "error");
                        setLoading(false);
                    });
                } else {
                    setLoading(false);
                }
            });

            return () => unsubscribe();
        } catch (err) {
            console.error("Firebase Init Error:", err);
            showNotification("System Init Error: " + err.message, "error");
            setLoading(false);
        }
    }, []);

    const showNotification = (msg, type = 'success') => {
        setNotification({ msg, type });
        setTimeout(() => setNotification(null), 3000);
    };

    // Google 로그인 핸들러
    const handleGoogleLogin = async () => {
        if (!auth) return;
        setLoginLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);

            // 새로 가입한 사용자인지 확인
            const isNewUser = result._tokenResponse?.isNewUser;
            if (isNewUser) {
                showNotification("🎉 Google 계정으로 가입이 완료되었습니다! 환영합니다.");
            } else {
                showNotification("환영합니다!");
            }
        } catch (error) {
            console.error("Google Login Error:", error);
            let errorMessage = "Google 로그인 실패";

            switch (error.code) {
                case 'auth/popup-closed-by-user':
                    errorMessage = "로그인 팝업이 닫혔습니다.";
                    break;
                case 'auth/cancelled-popup-request':
                    errorMessage = "로그인이 취소되었습니다.";
                    break;
                case 'auth/popup-blocked':
                    errorMessage = "팝업이 차단되었습니다. 팝업 차단을 해제해주세요.";
                    break;
                default:
                    errorMessage = error.message;
            }

            showNotification(errorMessage, "error");
        } finally {
            setLoginLoading(false);
        }
    };

    // 이메일/비밀번호 로그인 핸들러
    const handleEmailLogin = async (email, password) => {
        if (!auth) return;
        setLoginLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            showNotification("로그인 성공! 환영합니다.");
        } catch (error) {
            console.error("Email Login Error:", error);
            let errorMessage = "로그인 실패";

            // Firebase 에러 코드에 따른 사용자 친화적 메시지
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = "등록되지 않은 이메일입니다. 회원가입을 먼저 진행해주세요.";
                    break;
                case 'auth/wrong-password':
                    errorMessage = "비밀번호가 올바르지 않습니다.";
                    break;
                case 'auth/invalid-email':
                    errorMessage = "유효하지 않은 이메일 형식입니다.";
                    break;
                case 'auth/user-disabled':
                    errorMessage = "비활성화된 계정입니다.";
                    break;
                case 'auth/too-many-requests':
                    errorMessage = "너무 많은 로그인 시도. 잠시 후 다시 시도해주세요.";
                    break;
                case 'auth/invalid-credential':
                    errorMessage = "이메일 또는 비밀번호가 올바르지 않습니다.";
                    break;
                default:
                    errorMessage = error.message;
            }

            showNotification(errorMessage, "error");
        } finally {
            setLoginLoading(false);
        }
    };

    // 이메일/비밀번호 회원가입 핸들러
    const handleEmailSignup = async (email, password) => {
        if (!auth) return;
        setLoginLoading(true);
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            showNotification("🎉 회원가입이 완료되었습니다! 환영합니다.");
        } catch (error) {
            console.error("Email Signup Error:", error);
            let errorMessage = "회원가입 실패";

            // Firebase 에러 코드에 따른 사용자 친화적 메시지
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = "이미 가입된 이메일입니다. 로그인을 시도해주세요.";
                    break;
                case 'auth/invalid-email':
                    errorMessage = "유효하지 않은 이메일 형식입니다.";
                    break;
                case 'auth/operation-not-allowed':
                    errorMessage = "이메일/비밀번호 인증이 비활성화되어 있습니다.";
                    break;
                case 'auth/weak-password':
                    errorMessage = "비밀번호가 너무 약합니다. 더 강력한 비밀번호를 사용해주세요.";
                    break;
                default:
                    errorMessage = error.message;
            }

            showNotification(errorMessage, "error");
        } finally {
            setLoginLoading(false);
        }
    };

    // 비밀번호 재설정 핸들러
    const handlePasswordReset = async (email) => {
        if (!auth) return;
        try {
            await sendPasswordResetEmail(auth, email);
            showNotification("비밀번호 재설정 이메일이 전송되었습니다. 이메일을 확인해주세요.");
            return true;
        } catch (error) {
            console.error("Password Reset Error:", error);
            let errorMessage = "비밀번호 재설정 실패";

            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = "등록되지 않은 이메일입니다.";
                    break;
                case 'auth/invalid-email':
                    errorMessage = "유효하지 않은 이메일 형식입니다.";
                    break;
                case 'auth/too-many-requests':
                    errorMessage = "너무 많은 요청. 잠시 후 다시 시도해주세요.";
                    break;
                default:
                    errorMessage = error.message;
            }

            showNotification(errorMessage, "error");
            return false;
        }
    };

    // 로그아웃 핸들러
    const handleLogout = async () => {
        if (!auth) return;
        try {
            await signOut(auth);
            showNotification("로그아웃되었습니다.");
        } catch (error) {
            console.error("Logout Error:", error);
            showNotification("로그아웃 실패: " + error.message, "error");
        }
    };

    const [addToFolderId, setAddToFolderId] = useState(null);

    // selectedFolderId가 변경되면 addToFolderId도 동기화
    useEffect(() => {
        setAddToFolderId(selectedFolderId);
    }, [selectedFolderId]);

    const handleAddWord = async (e) => {
        e.preventDefault();
        if (!inputWord.trim() || !user || !db || !user.email) return;

        const wordToAnalyze = inputWord.trim();
        setIsAnalyzing(true);
        setAnalyzingWord(wordToAnalyze);
        try {
            const userStorageKey = getStorageKeyFromEmail(user.email);
            const analysisResult = await generateWordData(wordToAnalyze, apiKey);
            await addDoc(collection(db, 'artifacts', appId, 'users', userStorageKey, 'words'), {
                ...analysisResult,
                createdAt: serverTimestamp(),
                status: 'NEW',
                learningRate: 0,
                stats: { wrong_count: 0, consecutive_wrong: 0, review_count: 0 },
                folderId: addToFolderId || null
            });
            setInputWord("");
            const folderName = addToFolderId ? folders.find(f => f.id === addToFolderId)?.name : null;
            showNotification(`'${analysisResult.word}' ${folderName ? `→ ${folderName}` : ''} 추가 완료!`);
        } catch (error) {
            console.error("Add Word Error:", error);
            showNotification(error.message.includes("403") ? "API Key Invalid or Expired" : "Analysis failed: " + error.message, "error");
        } finally {
            setIsAnalyzing(false);
            setAnalyzingWord(null);
        }
    };

    const handleDeleteWord = async (wordId) => {
        if (!window.confirm("Delete this word?") || !db || !user || !user.email) return;
        try {
            const userStorageKey = getStorageKeyFromEmail(user.email);
            await deleteDoc(doc(db, 'artifacts', appId, 'users', userStorageKey, 'words', wordId));
            showNotification("Word deleted.");
        } catch (e) {
            console.error("Delete failed", e);
            showNotification("Failed to delete word: " + e.message, "error");
        }
    };

    // --- Folder CRUD ---
    const handleCreateFolder = async (name, color) => {
        if (!db || !user?.email) return;
        const userStorageKey = getStorageKeyFromEmail(user.email);
        try {
            await addDoc(collection(db, 'artifacts', appId, 'users', userStorageKey, 'folders'), {
                name,
                color,
                createdAt: serverTimestamp()
            });
            showNotification(`'${name}' 폴더가 생성되었습니다.`);
        } catch (e) {
            showNotification('폴더 생성 실패: ' + e.message, 'error');
        }
    };

    const handleRenameFolder = async (folderId, newName) => {
        if (!db || !user?.email) return;
        const userStorageKey = getStorageKeyFromEmail(user.email);
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'users', userStorageKey, 'folders', folderId), { name: newName });
            showNotification('폴더 이름이 변경되었습니다.');
        } catch (e) {
            showNotification('이름 변경 실패: ' + e.message, 'error');
        }
    };

    const handleDeleteFolder = async (folderId) => {
        if (!db || !user?.email) return;
        const userStorageKey = getStorageKeyFromEmail(user.email);
        try {
            // 해당 폴더의 단어들을 미분류로 이동
            const wordsInFolder = words.filter(w => w.folderId === folderId);
            const batch = writeBatch(db);
            wordsInFolder.forEach(w => {
                batch.update(doc(db, 'artifacts', appId, 'users', userStorageKey, 'words', w.id), { folderId: null });
            });
            batch.delete(doc(db, 'artifacts', appId, 'users', userStorageKey, 'folders', folderId));
            await batch.commit();
            showNotification('폴더가 삭제되었습니다.');
        } catch (e) {
            showNotification('폴더 삭제 실패: ' + e.message, 'error');
        }
    };

    const handleMoveWord = async (wordId, targetFolderId) => {
        if (!db || !user?.email) return;
        const userStorageKey = getStorageKeyFromEmail(user.email);
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'users', userStorageKey, 'words', wordId), {
                folderId: targetFolderId || null
            });
        } catch (e) {
            showNotification('단어 이동 실패: ' + e.message, 'error');
        }
    };

    const handleRegenerateWord = async (wordId) => {
        if (!db || !user?.email) return;
        const userStorageKey = getStorageKeyFromEmail(user.email);

        // Find the existing word to get the word string
        const existingWord = words.find(w => w.id === wordId);
        if (!existingWord) {
            showNotification('단어를 찾을 수 없습니다.', 'error');
            return;
        }

        try {
            // Generate new word data using Gemini API
            const newWordData = await generateWordData(existingWord.word, apiKey);

            // Update Firestore with new AI-generated data while preserving user data
            await updateDoc(doc(db, 'artifacts', appId, 'users', userStorageKey, 'words', wordId), {
                // Update AI-generated fields
                meaning_ko: newWordData.meaning_ko,
                pronunciation: newWordData.pronunciation,
                pos: newWordData.pos,
                definitions: newWordData.definitions,
                definitions_ko: newWordData.definitions_ko,
                examples: newWordData.examples,
                synonyms: newWordData.synonyms,
                nuance: newWordData.nuance
                // Preserve: id, learningRate, status, stats, folderId, createdAt (not included in update)
            });
        } catch (error) {
            console.error('Regenerate Word Error:', error);
            showNotification(
                error.message.includes("403")
                    ? "API Key Invalid or Expired"
                    : "재생성 실패: " + error.message,
                "error"
            );
        }
    };

    // --- Learning Rate Update ---
    const handleUpdateLearningRate = async (wordId, newRate, statsUpdate = {}) => {
        if (!db || !user?.email) return;
        const userStorageKey = getStorageKeyFromEmail(user.email);
        try {
            const updateData = { learningRate: Math.max(0, Math.min(100, Math.round(newRate))) };
            if (statsUpdate.wrong_count !== undefined) {
                updateData['stats.wrong_count'] = statsUpdate.wrong_count;
            }
            if (statsUpdate.review_count !== undefined) {
                updateData['stats.review_count'] = statsUpdate.review_count;
            }
            await updateDoc(doc(db, 'artifacts', appId, 'users', userStorageKey, 'words', wordId), updateData);
        } catch (e) {
            console.error('Learning rate update failed:', e);
        }
    };

    // --- Computed values ---
    const wordCountByFolder = {};
    words.forEach(w => {
        const fId = w.folderId || '__uncategorized';
        wordCountByFolder[fId] = (wordCountByFolder[fId] || 0) + 1;
    });

    const filteredWordsBase = selectedFolderId
        ? words.filter(w => w.folderId === selectedFolderId)
        : words;

    // 정렬 적용
    const filteredWords = (() => {
        let sorted;
        switch (sortMode) {
            case 'learning-rate-asc':
                sorted = sortByLearningRate(filteredWordsBase, 'asc');
                break;
            case 'learning-rate-desc':
                sorted = sortByLearningRate(filteredWordsBase, 'desc');
                break;
            case 'status-group':
                // 어려워요 → 학습 중 → 외웠어요 순서
                sorted = sortByLearningRate(filteredWordsBase, 'asc');
                break;
            default: // 'newest'
                sorted = [...filteredWordsBase].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        }

        // Add loading card at the beginning if analyzing
        if (analyzingWord) {
            const loadingCard = {
                id: '__loading__',
                word: analyzingWord,
                isLoading: true,
                folderId: addToFolderId || null,
                pos: '...',
                pronunciation: '생성 중...',
                learningRate: 0,
                definitions: [],
                examples: []
            };
            // Only show loading card if it matches current folder filter
            if (!selectedFolderId || loadingCard.folderId === selectedFolderId) {
                return [loadingCard, ...sorted];
            }
        }

        return sorted;
    })();

    // 상태별 그룹핑 데이터
    const wordStatusGroups = groupByStatus || sortMode === 'status-group'
        ? groupWordsByStatus(filteredWords)
        : null;

    const renderWordCards = (wordList) => {
        if (isMobile) {
            return (
                <div className="flex flex-col gap-4">
                    {wordList.map((word, index) => (
                        <div key={word.id} className="animate-slide-in" style={{ animationDelay: `${index * 0.05}s` }}>
                            <WordCard item={word} handleDeleteWord={handleDeleteWord} folders={folders} onMoveWord={handleMoveWord} onRegenerateWord={handleRegenerateWord} />
                        </div>
                    ))}
                </div>
            );
        }
        const leftColumn = wordList.filter((_, i) => i % 2 === 0);
        const rightColumn = wordList.filter((_, i) => i % 2 !== 0);

        return (
            <div className="grid grid-cols-2 gap-4 items-start">
                <div className="flex flex-col gap-4">
                    {leftColumn.map((word, index) => (
                        <div key={word.id} className="animate-slide-in" style={{ animationDelay: `${index * 0.05}s` }}>
                            <WordCard item={word} handleDeleteWord={handleDeleteWord} folders={folders} onMoveWord={handleMoveWord} onRegenerateWord={handleRegenerateWord} />
                        </div>
                    ))}
                </div>
                <div className="flex flex-col gap-4">
                    {rightColumn.map((word, index) => (
                        <div key={word.id} className="animate-slide-in" style={{ animationDelay: `${index * 0.05}s` }}>
                            <WordCard item={word} handleDeleteWord={handleDeleteWord} folders={folders} onMoveWord={handleMoveWord} onRegenerateWord={handleRegenerateWord} />
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderMasonryLayout = () => {
        if (filteredWords.length === 0) {
            if (selectedFolderId && words.length > 0) {
                return (
                    <div className="text-center py-12 px-4">
                        <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Folder className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">이 폴더는 비어있습니다</h3>
                        <p className="text-gray-500">단어 카드의 폴더 버튼으로 단어를 이동할 수 있습니다.</p>
                    </div>
                );
            }
            return <EmptyState />;
        }

        // 상태별 그룹 뷰
        if (wordStatusGroups) {
            const statusOrder = [LEARNING_STATUS.DIFFICULT, LEARNING_STATUS.LEARNING, LEARNING_STATUS.MEMORIZED];
            return (
                <div className="space-y-8">
                    {statusOrder.map(status => {
                        const groupWords = wordStatusGroups[status];
                        if (groupWords.length === 0) return null;
                        const config = LEARNING_STATUS_CONFIG[status];
                        return (
                            <div key={status}>
                                <div className={`flex items-center gap-2 mb-3 px-1`}>
                                    <span className={`w-2.5 h-2.5 rounded-full ${config.dotColor}`} />
                                    <h3 className={`text-sm font-bold uppercase tracking-wider ${config.textColor}`}>
                                        {config.label}
                                    </h3>
                                    <span className="text-xs text-gray-400 font-medium">
                                        {groupWords.length}개
                                    </span>
                                </div>
                                {renderWordCards(groupWords)}
                            </div>
                        );
                    })}
                </div>
            );
        }

        return renderWordCards(filteredWords);
    };

    // 알림 컴포넌트 (모든 상태에서 표시)
    const NotificationToast = () => notification ? (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 text-white font-medium flex items-center gap-2 animate-bounce ${notification.type === 'error' ? 'bg-red-500' : 'bg-green-600'}`}>
            {notification.type === 'error' ? <RotateCw className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            {notification.msg}
        </div>
    ) : null;

    if (loading) {
        return (
            <>
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">Initializing VocaLoop...</p>
                    </div>
                </div>
                <NotificationToast />
            </>
        );
    }

    // 로그인되지 않은 상태: 로그인 화면 표시
    if (!user) {
        return (
            <>
                <LoginScreen
                    onGoogleLogin={handleGoogleLogin}
                    onEmailLogin={handleEmailLogin}
                    onEmailSignup={handleEmailSignup}
                    onPasswordReset={handlePasswordReset}
                    isLoading={loginLoading}
                />
                <NotificationToast />
            </>
        );
    }

    return (
        <div className="min-h-screen pb-20">
            <Header view={view} setView={setView} user={user} onOpenSettings={() => setShowSettings(true)} />
            <NotificationToast />

            {showSettings && (
                <AccountSettings
                    user={user}
                    db={db}
                    words={words}
                    folders={folders}
                    onClose={() => setShowSettings(false)}
                    onLogout={handleLogout}
                    showNotification={showNotification}
                    appId={appId}
                    getStorageKeyFromEmail={getStorageKeyFromEmail}
                    onCreateFolder={handleCreateFolder}
                    onRenameFolder={handleRenameFolder}
                    onDeleteFolder={handleDeleteFolder}
                />
            )}

            <main className="max-w-3xl mx-auto px-4 pt-8">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 opacity-20"></div>
                    <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-blue-600" />
                        Add New Word
                    </h2>
                    <form onSubmit={handleAddWord} className="relative">
                        <div className="flex gap-3">
                            <div className="relative flex-1 group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors">
                                    <Search className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={inputWord}
                                    onChange={(e) => setInputWord(e.target.value)}
                                    placeholder="Enter an English word (e.g., Epiphany)"
                                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    disabled={isAnalyzing}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isAnalyzing || !inputWord.trim()}
                                className={`
                                    relative overflow-hidden px-6 py-3 rounded-xl font-semibold text-white shadow-md transition-all duration-300
                                    ${isAnalyzing ? 'cursor-wait pl-10' : 'hover:shadow-lg hover:-translate-y-0.5'}
                                    bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-[length:200%_auto]
                                    disabled:opacity-70 disabled:cursor-not-allowed
                                    group
                                `}
                                style={{
                                    backgroundPosition: isAnalyzing ? 'right center' : 'left center',
                                }}
                            >
                                <div className="flex items-center gap-2 relative z-10">
                                    {isAnalyzing ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>Crafting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Generate</span>
                                            <Sparkles className="w-4 h-4 opacity-80 group-hover:scale-110 transition-transform" />
                                        </>
                                    )}
                                </div>
                                {/* Shimmer Overlay */}
                                {!isAnalyzing && <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite] skew-x-12"></div>}
                            </button>
                        </div>
                        <div className="flex items-center justify-between mt-2 ml-1">
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                <span className="text-blue-600 font-medium">AI Powered:</span> Definitions, examples, and nuances will be generated automatically.
                            </p>
                            {folders.length > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <Folder className="w-3.5 h-3.5 text-gray-400" />
                                    <select
                                        value={addToFolderId || ''}
                                        onChange={(e) => setAddToFolderId(e.target.value || null)}
                                        className="text-xs border-gray-300 rounded-md py-0.5 px-1.5 text-gray-600 focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                    >
                                        <option value="">미분류</option>
                                        {folders.map(f => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </form>
                </div>

                {view === 'dashboard' && (
                    <div className="space-y-6">
                        <FolderSidebar
                            folders={folders}
                            selectedFolderId={selectedFolderId}
                            onSelectFolder={setSelectedFolderId}
                            onCreateFolder={handleCreateFolder}
                            onRenameFolder={handleRenameFolder}
                            onDeleteFolder={handleDeleteFolder}
                            wordCountByFolder={wordCountByFolder}
                            totalWordCount={words.length}
                        />
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <h2 className="text-xl font-bold text-gray-900">
                                {selectedFolderId
                                    ? `${folders.find(f => f.id === selectedFolderId)?.name || '폴더'} (${filteredWords.length})`
                                    : `My Vocabulary (${words.length})`
                                }
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        const next = sortMode === 'status-group' ? 'newest' : 'status-group';
                                        setSortMode(next);
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                                        sortMode === 'status-group'
                                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                                    title="학습 상태별 그룹 보기"
                                >
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
                                    </svg>
                                    그룹
                                </button>
                                <select
                                    value={sortMode}
                                    onChange={(e) => setSortMode(e.target.value)}
                                    className="text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50 text-gray-600"
                                >
                                    <option value="newest">최신순</option>
                                    <option value="learning-rate-asc">학습률 낮은 순</option>
                                    <option value="learning-rate-desc">학습률 높은 순</option>
                                    <option value="status-group">상태별 그룹</option>
                                </select>
                            </div>
                        </div>
                        {/* 학습 상태 요약 바 */}
                        {filteredWords.length > 0 && (
                            <div className="flex items-center gap-3 mt-3 px-1">
                                {[LEARNING_STATUS.MEMORIZED, LEARNING_STATUS.LEARNING, LEARNING_STATUS.DIFFICULT].map(status => {
                                    const config = LEARNING_STATUS_CONFIG[status];
                                    const count = filteredWords.filter(w => getLearningStatus(w.learningRate) === status).length;
                                    return (
                                        <div key={status} className="flex items-center gap-1.5">
                                            <span className={`w-2 h-2 rounded-full ${config.dotColor}`} />
                                            <span className="text-xs text-gray-500">{config.label}</span>
                                            <span className={`text-xs font-bold ${config.textColor}`}>{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {renderMasonryLayout()}
                    </div>
                )}
                {view === 'study' && (
                    <QuizView
                        words={words}
                        setView={setView}
                        db={db}
                        user={user}
                        aiMode={aiMode}
                        setAiMode={setAiMode}
                        apiKey={apiKey}
                        folders={folders}
                        selectedFolderId={selectedFolderId}
                        onSelectFolder={setSelectedFolderId}
                        onUpdateLearningRate={handleUpdateLearningRate}
                    />
                )}
            </main>
        </div>
    );
}

export default App;
