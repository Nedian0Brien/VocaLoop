# 📱 AI 기반 완전 학습 단어장 (Project: VocaLoop) 상세 기획서

## 1. 개요 (Overview)

제품명: VocaLoop

핵심 목표:
사용자가 단어를 단순히 암기하는 것을 넘어, AI를 통해 해당 단어가 실제 문장에서 쓰이는 **문맥(Context)**과 미세한 **뉘앙스(Nuance)**를 깊이 이해하고, 장기 기억으로 전환되는 '완전 학습(Mastery)' 상태에 도달하도록 돕는 지능형 학습 도구입니다.

차별화 포인트:

Context-Aware (문맥 중심): TOEFL/GRE 수준의 학술적 지문이나 비즈니스 이메일 등 실제 사용 사례 기반의 빈칸 추론 학습을 제공합니다.

Adaptive Loop (적응형 순환): 에빙하우스의 망각 곡선 이론을 응용하여, 틀린 문제는 단기 집중 반복하고 맞춘 문제는 변형 문제를 통해 '찍어서 맞춘 것'인지 검증하는 철저한 순환 구조를 가집니다.

Stress-Free (학습 부담 경감): 완벽한 스펠링을 강요하지 않는 '하이브리드 채점'과, 오답 누적 시 강제 휴식을 제공하는 '페널티 완화' 장치를 통해 학습자의 좌절감을 최소화합니다.

## 2. 상세 기능 명세 (Functional Specifications)

### 2.1. 단어장 모드 (Vocabulary Mode)

사용자가 영단어 텍스트만 입력하면, LLM(Large Language Model)이 즉시 분석하여 학습에 필요한 풍부한 데이터를 자동으로 생성 및 구조화합니다.

입력: 영단어 (단일 단어 또는 콤마로 구분된 리스트, 엑셀/CSV 붙여넣기 지원)

AI 자동 생성 데이터 상세:

기본 정보:

한국어 뜻: 가장 빈도 높은 핵심 뜻 1~2개와 문맥에 따른 보조 뜻.

원어민 발음(TTS): 미국식/영국식 발음 선택 지원 및 발음 기호 표기.

품사: 명사, 동사, 형용사 등 품사 정보와 파생어(품사 변화형) 정보.

심화 정보 (Context & Nuance):

예문: 해당 단어가 가장 자연스럽게 쓰이는 원어민 수준의 문장 생성 (한국어 해석 포함). 단순한 "I go to school" 수준이 아닌, 단어의 레벨에 맞는 적절한 복잡도의 문장 제공.

동의어/유의어 & 반의어: 단순 나열이 아닌, 미묘한 뉘앙스 차이 설명 (예: 'Big' vs 'Huge' vs 'Enormous'의 크기 차이 설명).

어원(Etymology) 설명: 단어의 기원을 통해 암기를 돕는 짧은 스토리텔링.

UI: 직관적인 플래시카드 인터페이스.

Interactivity: 클릭/터치 시 부드러운 애니메이션으로 카드가 뒤집힘.

Action: '이미 아는 단어' 체크 시 즉시 마스터 처리, '북마크' 기능 지원.

### 2.2. 영단어 시험 모드 (Quiz Mode)

학습 흐름이 끊기지 않도록 키보드 단축키를 전면 지원하며, 다양한 문제 유형을 통해 다각도로 실력을 검증합니다.

| 문제 유형 | 입력 방식 | 상세 로직 및 AI 역할 |
| 객관식  (뜻 맞추기) | 4지 선다  (키보드 1~4) | • 지능형 오답(Distractor) 생성: 무작위 단어가 아닌, 정답과 철자가 비슷하거나(visual), 뜻이 유사하거나(semantic), 같은 주제 카테고리에 속하는 단어들을 오답으로 배치하여 난이도 조절.  • UI: 정답 선택 시 즉각적인 O/X 피드백과 함께 다음 문제로 빠른 전환 (Speed Quiz 느낌). |
| 주관식  (스펠링/의미) | 텍스트 타이핑  (Enter 제출) | • 하이브리드 채점 시스템 (Hybrid Grading):   1. 1차 (Rule-based): 입력 텍스트와 정답의 Levenshtein 거리(편집 거리)를 계산하여 단순 오타(1~2글자 차이)는 정답으로 인정.   2. 2차 (AI Semantic): 1차 불일치 시, AI에게 "사용자 답안이 정답의 유의어이거나 문맥상 허용 가능한가?"를 질의. 의미가 통하면 정답 처리.  • 피드백: "정답은 A지만, 입력하신 B도 문맥상 훌륭한 표현입니다"와 같은 구체적 피드백 제공. |
| TOEFL 빈칸  (Context Inference) | 4지 선다  (키보드 1~4) | • 문단 생성: 단어 하나가 들어갈 단순 문장이 아닌, 앞뒤 문맥(Context Clues)을 통해 추론해야 하는 3~4문장 길이의 학술적/비즈니스 단락 생성.  • 선지 구성: 문법적으로는 빈칸에 들어갈 수 있으나(예: 모두 명사), 의미상 어색한 단어들을 오답으로 구성하여 논리적 사고력 테스트.  • 오답 해설: 사용자가 틀린 오답을 선택했을 때, "이 단어는 문맥상 ~한 이유로 적절하지 않습니다"라는 논리적 해설 출력. |

### 2.3. 적응형 학습 루프 (Adaptive Learning Loop)

각 단어는 고유한 '상태(State)'를 가지며, 이 상태에 따라 문제 출제 큐(Queue) 내에서의 위치와 출제 방식이 실시간으로 결정됩니다.

#### A. 핵심 학습 로직 (State Machine)

오답 (Wrong) → 집중 케어:

해당 문제를 현재 시점으로부터 +5~6번째 뒤에 재배치하여 단기 기억이 사라지기 전에 다시 노출.

$$페널티 완화 - Study Break$$

: 동일 단어를 3회 연속 틀릴 경우, 퀴즈 진행을 강제로 일시 정지. 배경색을 차분하게 변경하고, 문제 대신 단어의 상세 설명, 어원, 예문을 보여주는 '학습 카드'를 띄움. 사용자가 "이해했습니다" 버튼을 눌러야만 다시 퀴즈로 복귀 가능.

재도전 정답 (Retried & Correct) → 검증 단계:

이전에 틀렸던 문제를 맞혔다면, 단순 암기인지 이해인지 확인하기 위해 **유사 문제(변형 문제)**를 즉시 생성.

이 검증용 유사 문제를 큐의 +3~4번째 뒤에 배치.

즉시 정답 (First Try Correct) → 강화 단계:

처음부터 맞춘 단어도 확실한 장기 기억 전환을 위해 변형 문제를 큐의 맨 뒤에 배치하여 세션 마지막에 한 번 더 점검.

유사 문제 정답 (Verification Correct) → 학습 완료:

변형 문제까지 맞혀야 비로소 'Mastered' 상태가 되며 큐에서 제거됨.

#### B. 유동적 난이도 조절 (Dynamic Difficulty)

"이미 아는 단어" (I know this) 버튼 & 단축키:

퀴즈 화면 우측 상단에 항상 노출 (단축키 K).

사용자가 "이건 너무 쉬워서 더 검증할 필요가 없다"고 판단할 때 사용.

클릭 시, 검증 단계(유사 문제 풀이)를 전면 생략하고 즉시 'Mastered' 처리하여 학습 템포를 높임. 학습자에게 통제권을 부여하여 지루함 방지.

### 2.4. 학습 결과 및 통계 (Review & Stats)

학습 세션이 종료되면 단순 점수 나열이 아닌, 학습 행동을 분석한 인사이트를 제공합니다.

세션 리포트:

총 소요 시간, 최종 정답률.

"구제된 정답" (AI Saved): 하이브리드 채점을 통해 오답 처리될 뻔했으나 의미상 정답으로 인정받은 횟수를 강조하여 학습 효능감 고취.

AI 맞춤형 피드백:

"주로 '추상적 개념'을 나타내는 명사에서 오답률이 높습니다."

"유사 문제 정답률이 100%입니다. 응용력이 뛰어나시네요!"

연관 단어 추천 (Next Steps):

오늘 학습한 단어들과 주제적으로 연관된 심화 단어 5~10개를 AI가 추천.

$$내 단어장에 일괄 추가$$

 버튼을 통해 다음 학습 준비를 1초 만에 완료.

### 2.5. 지능형 검색 (Intelligent Search)

기본 검색: 단어 스펠링(Prefix search), 한글 뜻 포함 검색.

의미론적 검색 (Semantic Search):

사용자가 모호한 개념이나 상황을 문장으로 입력해도 AI가 의도를 파악하여 관련 단어를 찾아줌.

Query: "회의 시간에 상대방 의견에 정중하게 반대할 때 쓰는 표현"

Result: Beg to differ, Respectfully disagree, Reservation 등의 단어와 예문 출력.

기술: 입력 쿼리를 Vector Embedding으로 변환하여 단어 데이터베이스와 Cosine Similarity 비교.

## 3. 기술적 구현 아키텍처 (Technical Architecture)

### 3.1. 하이브리드 채점 프로세스 (Hybrid Grading Flow Detail)

비용 효율성과 정확도를 최적화하기 위해, 무조건적인 AI 호출을 지양하고 단계별 필터링을 거칩니다.

graph TD
    A[사용자 답안 제출] --> B{텍스트 완전 일치? (String Match)}
    B -- Yes --> C[정답 처리 (Fast & Free)]
    B -- No --> D{Levenshtein 거리 < 임계값? (Fuzzy Match)}
    D -- Yes --> E[정답 처리 (단순 오타 인정)]
    D -- No --> F[AI 모델 호출 (LLM API)]
    F --> G{AI: 의미/문맥상 허용 가능한가?}
    G -- Yes --> H[정답 처리 (의미론적 정답 - 'Saved')]
    G -- No --> I[오답 처리 및 AI 피드백 생성]



### 3.2. 데이터 스키마 예시 (Word Item Schema)

학습 상태 관리와 AI 검증 로직을 지원하기 위한 확장된 JSON 구조입니다.

{
  "word_id": "uuid_v4",
  "text": "procrastinate",
  "meaning_ko": "미루다, 질질 끌다",
  "definitions": [
    {"pos": "verb", "def": "To delay or postpone action; put off doing something."}
  ],
  "examples": [
    {"en": "He procrastinated until the last minute.", "ko": "그는 마지막 순간까지 미뤘다."}
  ],
  "status": "LEARNING", // NEW, LEARNING, WAITING_VERIFICATION, MASTERED
  "learning_stats": {
    "wrong_count": 2, // 현재 세션 누적 오답 수 (3회 도달 시 Study Break)
    "consecutive_wrong": 2, // 연속 오답 수
    "last_reviewed_at": "2023-10-27T10:00:00Z"
  },
  "queue_position": 5, // 학습 루프 내 동적 인덱스
  "verification_data": {
    "is_verification_pending": true, // 유사 문제 출제 대기 여부
    "generated_question_cache": { // API 호출 최소화를 위한 캐싱
       "type": "context_cloze",
       "question_text": "...",
       "options": ["...", "...", "...", "..."],
       "answer_index": 2
    }
  }
}



## 4. 디자인 및 브랜딩 가이드 (Design & Branding)

Brand Name: VocaLoop

Logo Concept:

Symbol: 무한대 기호(∞)가 알파벳 'Abc' 또는 펜 획과 자연스럽게 연결되는 형상. 학습의 끊임없는 순환과 완성을 상징.

Style: 깔끔하고 현대적인 Line Art 스타일.

Color Palette:

Primary (Trust Blue): #0056b3 ~ #2E86C1. 깊이감 있는 파란색으로 신뢰, 지속성, 차분한 집중력을 유도.

Accent (Success Gold): #F1C40F. 마스터(Mastery) 달성 시 사용되는 밝은 금색. 성취감 부여.

Alert (Soft Red): #E74C3C. 오답 시 사용되나, 채도가 너무 높지 않게 조절하여 눈의 피로 방지.

Background: Clean White (#FFFFFF) & Light Gray (#F8F9F9). 텍스트 가독성을 최우선으로 함.

Typography:

Headings: 가독성이 높고 모던한 Sans-serif (예: Inter, Roboto, Noto Sans KR).

Target Word: 명확한 인식을 위해 세리프(Serif) 폰트(예: Merriweather)를 사용하여 본문과 차별화 가능.

## 5. UI/UX 요구사항 (Design Guidelines)

Keyboard First: 마우스 의존도를 0으로 만듭니다. 모든 퀴즈 진행, 힌트 보기, 발음 듣기, 넘어가기 등의 동작이 키보드(1~4, Enter, Space, Arrow Keys)만으로 가능해야 몰입감을 유지할 수 있습니다.

Visual Feedback & Animation:

하이브리드 채점으로 '구제'된 경우, 일반적인 초록색(성공) 대신 금색이나 파란색 뱃지를 띄워 "AI가 당신의 센스를 인정했습니다"라는 긍정적 강화를 제공합니다.

Study Break 발동 시, 화면 전체가 붉은색(경고)이 아닌 Primary Blue의 옅은 톤으로 서서히 전환(Fade-in)되어, 벌칙이 아닌 리프레시 타임임을 시각적으로 전달합니다.