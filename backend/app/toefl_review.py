from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Callable

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import ToeflQuizAsset, ToeflQuizAttempt, ToeflReviewItem, User
from .schemas import ToeflReviewItemRead


def review_item_to_read(item: ToeflReviewItem) -> ToeflReviewItemRead:
    return ToeflReviewItemRead(
        id=item.id,
        asset_id=item.asset_id,
        attempt_id=item.attempt_id,
        mode=item.mode,
        task_type=item.task_type,
        item_key=item.item_key,
        title=item.title,
        prompt=item.prompt,
        user_answer=item.user_answer,
        correct_answer=item.correct_answer,
        explanation=item.explanation,
        source_snapshot=item.source_snapshot,
        skill_tag=item.skill_tag,
        topic_tags=item.topic_tags,
        status=item.status,
        due_at=item.due_at,
        review_count=item.review_count,
        success_streak=item.success_streak,
        last_result=item.last_result,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _stringify(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        return ", ".join(_stringify(item) for item in value if _stringify(item))
    if isinstance(value, dict):
        return ", ".join(f"{key}: {_stringify(item)}" for key, item in value.items() if _stringify(item))
    return str(value).strip()


def _safe_list(value: Any) -> list[Any]:
    return value if isinstance(value, list) else []


def _safe_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _compact_dict(value: dict[str, Any]) -> dict[str, Any]:
    return {key: item for key, item in value.items() if item not in (None, "", [], {})}


def _topic_tags(asset: ToeflQuizAsset, item: dict[str, Any] | None = None) -> list[str]:
    tags: list[str] = []
    for source in (_safe_dict(item), asset.payload, asset.metadata_json):
        for key in ("topicTags", "topic_tags"):
            raw_tags = _safe_list(_safe_dict(source).get(key))
            for tag in raw_tags:
                text = tag.get("label") if isinstance(tag, dict) else tag
                normalized = _stringify(text)
                if normalized and normalized not in tags:
                    tags.append(normalized)
    picked_topics = _safe_list(asset.metadata_json.get("pickedTopics"))
    for topic in picked_topics:
        text = topic.get("label") if isinstance(topic, dict) else topic
        normalized = _stringify(text)
        if normalized and normalized not in tags:
            tags.append(normalized)
    return tags


def _payload_items(asset: ToeflQuizAsset) -> list[dict[str, Any]]:
    payload = _safe_dict(asset.payload)
    if isinstance(payload.get("questions"), list):
        return [item for item in payload["questions"] if isinstance(item, dict)]
    if isinstance(payload.get("items"), list):
        return [item for item in payload["items"] if isinstance(item, dict)]
    section = _safe_dict(payload.get("section"))
    if isinstance(section.get("sentenceItems"), list):
        return [item for item in section["sentenceItems"] if isinstance(item, dict)]
    return []


def _payload_item_index(asset: ToeflQuizAsset) -> dict[str, dict[str, Any]]:
    indexed: dict[str, dict[str, Any]] = {}
    for index, item in enumerate(_payload_items(asset)):
        keys = {str(index), str(index + 1)}
        for key in ("id", "questionId", "itemId", "questionIndex"):
            if item.get(key) is not None:
                keys.add(str(item[key]))
        for key in keys:
            indexed.setdefault(key, item)
    return indexed


def _selected_option_text(item: dict[str, Any], selected_index: Any) -> str:
    options = _safe_list(item.get("options"))
    if isinstance(selected_index, int) and 0 <= selected_index < len(options):
        return _stringify(options[selected_index])
    return _stringify(selected_index)


def _correct_option_text(item: dict[str, Any], result: dict[str, Any]) -> str:
    options = _safe_list(item.get("options"))
    answer_index = result.get("answerIndex", item.get("answerIndex"))
    if isinstance(answer_index, int) and 0 <= answer_index < len(options):
        return _stringify(options[answer_index])
    return _stringify(item.get("answer") or item.get("target") or result.get("correctAnswer"))


def _review_event(
    *,
    asset: ToeflQuizAsset,
    attempt: ToeflQuizAttempt,
    item_key: str,
    title: str,
    prompt: str,
    is_correct: bool,
    user_answer: str = "",
    correct_answer: str = "",
    explanation: str = "",
    source_snapshot: dict[str, Any] | None = None,
    skill_tag: str | None = None,
    topic_tags: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "asset_id": asset.id,
        "attempt_id": attempt.id,
        "mode": asset.mode,
        "task_type": asset.task_type,
        "item_key": item_key,
        "title": title or asset.title,
        "prompt": prompt or asset.title,
        "is_correct": is_correct,
        "user_answer": user_answer,
        "correct_answer": correct_answer,
        "explanation": explanation,
        "source_snapshot": source_snapshot or {},
        "skill_tag": skill_tag,
        "topic_tags": topic_tags or _topic_tags(asset),
    }


def _extract_choice_events(asset: ToeflQuizAsset, attempt: ToeflQuizAttempt) -> list[dict[str, Any]]:
    items_by_key = _payload_item_index(asset)
    result_items = _safe_list(attempt.results.get("items"))
    events: list[dict[str, Any]] = []
    for index, result in enumerate(result_items):
        if not isinstance(result, dict):
            continue
        result_key = result.get("questionId", result.get("itemId", result.get("id", result.get("questionIndex", index))))
        item = items_by_key.get(str(result_key)) or items_by_key.get(str(index)) or {}
        if not item:
            continue
        events.append(_review_event(
            asset=asset,
            attempt=attempt,
            item_key=f"{asset.mode}:{result_key}",
            title=_stringify(item.get("title")) or asset.title,
            prompt=_stringify(item.get("prompt") or item.get("title")),
            is_correct=bool(result.get("correct")),
            user_answer=_selected_option_text(item, result.get("selectedIndex")),
            correct_answer=_correct_option_text(item, result),
            explanation=_stringify(item.get("explanationKo") or item.get("explanation")),
            source_snapshot=_compact_dict({
                "stimulus": item.get("stimulus") or asset.payload.get("stimulus"),
                "stimulusLabel": item.get("stimulusLabel") or asset.payload.get("stimulusLabel"),
                "options": item.get("options"),
            }),
            skill_tag=_stringify(item.get("skillTag") or result.get("skillTag")) or None,
            topic_tags=_topic_tags(asset, item),
        ))
    return events


def _extract_complete_word_events(asset: ToeflQuizAsset, attempt: ToeflQuizAttempt) -> list[dict[str, Any]]:
    payload_questions = _safe_list(asset.payload.get("questions"))
    result_questions = _safe_list(attempt.results.get("questions"))
    answer_questions = _safe_list(attempt.answers.get("blanks"))
    events: list[dict[str, Any]] = []
    for index, result in enumerate(result_questions):
        if not isinstance(result, dict):
            continue
        question_index = result.get("questionIndex", index)
        question = payload_questions[question_index] if isinstance(question_index, int) and question_index < len(payload_questions) else {}
        if not isinstance(question, dict):
            continue
        correct_count = int(result.get("correctCount") or 0)
        total = int(result.get("total") or 0)
        blanks = _safe_list(question.get("blanks"))
        answer_groups = answer_questions[question_index] if isinstance(question_index, int) and question_index < len(answer_questions) else []
        user_answer = []
        correct_answer = []
        for blank_index, blank in enumerate(blanks):
            if not isinstance(blank, dict):
                continue
            correct_answer.append(_stringify(blank.get("answer")))
            raw_answer = answer_groups[blank_index] if isinstance(answer_groups, list) and blank_index < len(answer_groups) else []
            user_answer.append("".join(str(part or "") for part in raw_answer) if isinstance(raw_answer, list) else _stringify(raw_answer))
        events.append(_review_event(
            asset=asset,
            attempt=attempt,
            item_key=f"{asset.mode}:q{question_index}",
            title=asset.title,
            prompt=_stringify(question.get("paragraph") or question.get("prompt") or f"Question {question_index + 1}"),
            is_correct=total > 0 and correct_count >= total,
            user_answer=", ".join(filter(None, user_answer)),
            correct_answer=", ".join(filter(None, correct_answer)),
            explanation="빈칸별 철자와 문맥을 다시 확인하세요.",
            source_snapshot=_compact_dict({"paragraph": question.get("paragraph"), "blanks": blanks}),
            skill_tag="complete-words",
            topic_tags=_topic_tags(asset, question),
        ))
    return events


def _extract_build_sentence_events(asset: ToeflQuizAsset, attempt: ToeflQuizAttempt) -> list[dict[str, Any]]:
    result_questions = _safe_list(attempt.results.get("questions"))
    events: list[dict[str, Any]] = []
    for index, result in enumerate(result_questions):
        if not isinstance(result, dict):
            continue
        question_index = result.get("questionIndex", index)
        events.append(_review_event(
            asset=asset,
            attempt=attempt,
            item_key=f"{asset.mode}:q{question_index}",
            title=asset.title,
            prompt=_stringify(result.get("target") or f"Sentence {question_index + 1}"),
            is_correct=bool(result.get("correct")),
            user_answer=_stringify(result.get("attempt")),
            correct_answer=_stringify(result.get("target")),
            explanation="어순과 문장 논리 흐름을 다시 배열해보세요.",
            source_snapshot=_compact_dict({"target": result.get("target"), "attempt": result.get("attempt")}),
            skill_tag="build-sentence",
            topic_tags=_topic_tags(asset),
        ))
    return events


def _writing_prompt(task: dict[str, Any]) -> str:
    if task.get("taskType") == "email":
        return " ".join(filter(None, [_stringify(task.get("situation")), _stringify(task.get("requirements"))]))
    return " ".join(filter(None, [
        _stringify(task.get("course")),
        _stringify(task.get("professorQuestion")),
        _stringify(task.get("studentPosts")),
    ]))


def _extract_writing_events(asset: ToeflQuizAsset, attempt: ToeflQuizAttempt) -> list[dict[str, Any]]:
    feedback = _safe_dict(attempt.results.get("feedback"))
    score = feedback.get("score", attempt.score.get("practiceScore"))
    try:
        numeric_score = float(score)
    except (TypeError, ValueError):
        numeric_score = 0
    task = _safe_dict(asset.payload.get("task") or asset.payload)
    return [_review_event(
        asset=asset,
        attempt=attempt,
        item_key=f"{asset.mode}:response",
        title=asset.title,
        prompt=_writing_prompt(task) or asset.title,
        is_correct=numeric_score >= 3,
        user_answer=_stringify(attempt.answers.get("response")),
        correct_answer="Rewrite with clearer task fulfillment, organization, development, and language control.",
        explanation=_stringify(feedback.get("feedbackKo") or feedback.get("improvements") or feedback.get("nextSteps")),
        source_snapshot=_compact_dict({"task": task, "feedback": feedback}),
        skill_tag=asset.task_type or "writing",
        topic_tags=_topic_tags(asset, task),
    )]


def _extract_writing_mock_events(asset: ToeflQuizAsset, attempt: ToeflQuizAttempt) -> list[dict[str, Any]]:
    section = _safe_dict(asset.payload.get("section"))
    feedback = _safe_dict(attempt.results.get("feedback"))
    events = _extract_build_sentence_events(asset, attempt)
    for key, score_value, task_key, answer_key in (
        ("email", attempt.score.get("emailScore"), "emailTask", "emailResponse"),
        ("discussion", attempt.score.get("discussionScore"), "discussionTask", "discussionResponse"),
    ):
        try:
            numeric_score = float(score_value)
        except (TypeError, ValueError):
            numeric_score = 0
        task = _safe_dict(section.get(task_key))
        events.append(_review_event(
            asset=asset,
            attempt=attempt,
            item_key=f"{asset.mode}:{key}",
            title=f"{asset.title} {key.title()}",
            prompt=_writing_prompt(task) or task.get("title") or asset.title,
            is_correct=numeric_score >= 3,
            user_answer=_stringify(attempt.answers.get(answer_key)),
            correct_answer="Rewrite with stronger task fulfillment, organization, development, and language control.",
            explanation=_stringify(feedback.get("feedbackKo") or feedback.get("improvements") or feedback.get("nextSteps")),
            source_snapshot=_compact_dict({"task": task, "feedback": feedback}),
            skill_tag=key,
            topic_tags=_topic_tags(asset, task),
        ))
    return events


ReviewEventExtractor = Callable[[ToeflQuizAsset, ToeflQuizAttempt], list[dict[str, Any]]]


REVIEW_EVENT_EXTRACTORS: dict[str, ReviewEventExtractor] = {
    "toefl-daily-life": _extract_choice_events,
    "toefl-academic-passage": _extract_choice_events,
    "toefl-reading-mock": _extract_choice_events,
    "toefl-complete": _extract_complete_word_events,
    "toefl-build": _extract_build_sentence_events,
    "toefl-writing-email": _extract_writing_events,
    "toefl-writing-discussion": _extract_writing_events,
    "toefl-writing-mock": _extract_writing_mock_events,
}


def _extract_review_events(asset: ToeflQuizAsset, attempt: ToeflQuizAttempt) -> list[dict[str, Any]]:
    extractor = REVIEW_EVENT_EXTRACTORS.get(asset.mode)
    if extractor is None:
        return []
    return extractor(asset, attempt)


def apply_review_result(item: ToeflReviewItem, result: str, now: datetime) -> None:
    item.review_count += 1
    item.last_result = result
    if result == "correct":
        item.success_streak += 1
        if item.success_streak >= 3:
            item.status = "mastered"
            item.due_at = now + timedelta(days=30)
            return
        item.status = "reviewing"
        item.due_at = now + timedelta(days=3 if item.success_streak == 2 else 1)
        return

    item.success_streak = 0
    item.status = "reviewing"
    item.due_at = now + timedelta(days=1)


def sync_review_items_for_attempt(
    db: Session,
    current_user: User,
    asset: ToeflQuizAsset,
    attempt: ToeflQuizAttempt,
) -> None:
    now = datetime.utcnow()
    for event in _extract_review_events(asset, attempt):
        existing = db.scalar(
            select(ToeflReviewItem).where(
                ToeflReviewItem.user_id == current_user.id,
                ToeflReviewItem.asset_id == asset.id,
                ToeflReviewItem.item_key == event["item_key"],
            )
        )
        if event["is_correct"]:
            if existing is not None:
                apply_review_result(existing, "correct", now)
            continue

        if existing is None:
            db.add(ToeflReviewItem(
                user_id=current_user.id,
                asset_id=asset.id,
                attempt_id=attempt.id,
                mode=event["mode"],
                task_type=event["task_type"],
                item_key=event["item_key"],
                title=event["title"],
                prompt=event["prompt"],
                user_answer=event["user_answer"],
                correct_answer=event["correct_answer"],
                explanation=event["explanation"],
                source_snapshot=event["source_snapshot"],
                skill_tag=event["skill_tag"],
                topic_tags=event["topic_tags"],
                status="new",
                due_at=now,
                review_count=0,
                success_streak=0,
                last_result="wrong",
            ))
            continue

        existing.attempt_id = attempt.id
        existing.mode = event["mode"]
        existing.task_type = event["task_type"]
        existing.title = event["title"]
        existing.prompt = event["prompt"]
        existing.user_answer = event["user_answer"]
        existing.correct_answer = event["correct_answer"]
        existing.explanation = event["explanation"]
        existing.source_snapshot = event["source_snapshot"]
        existing.skill_tag = event["skill_tag"]
        existing.topic_tags = event["topic_tags"]
        existing.status = "reviewing"
        existing.due_at = now
        existing.success_streak = 0
        existing.last_result = "wrong"
