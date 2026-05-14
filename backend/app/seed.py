from sqlalchemy import select
from sqlalchemy.orm import Session

from .ai_contract import get_default_model, get_default_provider
from .models import User, UserSettings, Word


DEFAULT_USER_SETTINGS = {"ai_provider": get_default_provider(), "ai_model": get_default_model()}


def _sample_word(
    *,
    word: str,
    meaning_ko: str,
    pronunciation: str,
    pos: str,
    definitions: list[str],
    example_en: str,
    example_ko: str,
    nuance: str,
    synonyms: list[str],
) -> dict[str, object]:
    return {
        "word": word,
        "meaning_ko": meaning_ko,
        "pronunciation": pronunciation,
        "pos": pos,
        "definitions": definitions,
        "definitions_ko": [],
        "examples": [{"en": example_en, "ko": example_ko}],
        "nuance": nuance,
        "synonyms": synonyms,
        "learning_rate": 0,
        "status": "new",
        "stats": {"wrong_count": 0, "review_count": 0},
    }


SAMPLE_WORDS = (
    _sample_word(
        word="Serendipity",
        meaning_ko="뜻밖의 행운",
        pronunciation="/ˌser.ənˈdɪp.ə.ti/",
        pos="Noun",
        definitions=["The occurrence and development of events by chance in a happy or beneficial way."],
        example_en="Finding this restaurant was pure serendipity.",
        example_ko="이 식당을 발견한 것은 정말 뜻밖의 행운이었다.",
        nuance="단순한 행운(luck)이 아니라, 우연히 발견한 기쁨이나 가치 있는 것을 강조할 때 사용함.",
        synonyms=["chance", "fluke"],
    ),
    _sample_word(
        word="Ephemeral",
        meaning_ko="단명하는, 덧없는",
        pronunciation="/ɪˈfem.ər.əl/",
        pos="Adjective",
        definitions=["Lasting for a very short time."],
        example_en="Fashions are ephemeral, changing with every season.",
        example_ko="패션은 덧없어서 계절마다 바뀐다.",
        nuance="수명이 매우 짧거나 금방 사라지는 현상을 묘사할 때 씀. 다소 문학적이거나 감성적인 뉘앙스.",
        synonyms=["transitory", "fleeting"],
    ),
    _sample_word(
        word="Eloquent",
        meaning_ko="웅변을 잘 하는, 유창한",
        pronunciation="/ˈel.ə.kwənt/",
        pos="Adjective",
        definitions=["Fluent or persuasive in speaking or writing."],
        example_en="She made an eloquent appeal for action.",
        example_ko="그녀는 행동을 촉구하는 유창한 호소를 했다.",
        nuance="단순히 말을 잘하는(fluent) 것을 넘어, 감동을 주거나 설득력이 뛰어남을 의미.",
        synonyms=["persuasive", "expressive"],
    ),
    _sample_word(
        word="Resilience",
        meaning_ko="회복력, 탄력",
        pronunciation="/rɪˈzɪl.jəns/",
        pos="Noun",
        definitions=["The capacity to recover quickly from difficulties; toughness."],
        example_en="He showed great resilience after the failure.",
        example_ko="그는 실패 후 엄청난 회복력을 보여주었다.",
        nuance="어려움이나 충격을 딛고 다시 일어서는 힘을 강조하는 긍정적인 단어.",
        synonyms=["toughness", "flexibility"],
    ),
    _sample_word(
        word="Ubiquitous",
        meaning_ko="어디에나 있는",
        pronunciation="/juːˈbɪk.wɪ.təs/",
        pos="Adjective",
        definitions=["Present, appearing, or found everywhere."],
        example_en="Smartphones have become ubiquitous in daily life.",
        example_ko="스마트폰은 일상생활 어디서나 볼 수 있게 되었다.",
        nuance="매우 흔해서 언제 어디서든 볼 수 있다는 뜻. 주로 기술이나 트렌드에 대해 씀.",
        synonyms=["omnipresent", "pervasive"],
    ),
)


def seed_database(session: Session, user: User | None = None) -> None:
    """Seed default rows for a brand-new user."""
    if user is None:
        return

    existing_settings = session.scalar(select(UserSettings).where(UserSettings.user_id == user.id))
    if existing_settings is None:
        session.add(UserSettings(user_id=user.id, **DEFAULT_USER_SETTINGS))

    existing_words = set(
        session.scalars(select(Word.word).where(Word.user_id == user.id)).all()
    )
    missing_words = [word_data for word_data in SAMPLE_WORDS if word_data["word"] not in existing_words]
    if missing_words:
        session.add_all([Word(user_id=user.id, **word_data) for word_data in missing_words])
