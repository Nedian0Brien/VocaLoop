from __future__ import annotations

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Table, Text, UniqueConstraint, func
from sqlalchemy.ext.mutable import MutableDict, MutableList
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .ai_contract import get_default_model, get_default_provider
from .db import Base


word_folder_association = Table(
    "word_folders",
    Base.metadata,
    Column("word_id", ForeignKey("words.id", ondelete="CASCADE"), primary_key=True),
    Column("folder_id", ForeignKey("folders.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    display_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    session_version: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.current_timestamp())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )

    settings: Mapped[UserSettings | None] = relationship(back_populates="user", cascade="all, delete-orphan", uselist=False)
    folders: Mapped[list[Folder]] = relationship(back_populates="user", cascade="all, delete-orphan")
    words: Mapped[list[Word]] = relationship(back_populates="user", cascade="all, delete-orphan")
    toefl_assets: Mapped[list[ToeflQuizAsset]] = relationship(back_populates="user", cascade="all, delete-orphan")
    toefl_attempts: Mapped[list[ToeflQuizAttempt]] = relationship(back_populates="user", cascade="all, delete-orphan")
    toefl_review_items: Mapped[list[ToeflReviewItem]] = relationship(back_populates="user", cascade="all, delete-orphan")


class UserSettings(Base):
    __tablename__ = "user_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    toefl_target: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ai_provider: Mapped[str] = mapped_column(String(50), nullable=False, default=get_default_provider)
    ai_model: Mapped[str] = mapped_column(String(100), nullable=False, default=get_default_model)
    gemini_api_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    openai_api_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    claude_api_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.current_timestamp())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )

    user: Mapped[User] = relationship(back_populates="settings")


class Folder(Base):
    __tablename__ = "folders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    color: Mapped[str | None] = mapped_column(String(32), nullable=True)
    icon: Mapped[str | None] = mapped_column(String(64), nullable=True)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.current_timestamp())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )

    user: Mapped[User] = relationship(back_populates="folders")
    words: Mapped[list[Word]] = relationship(
        "Word",
        secondary=word_folder_association,
        back_populates="folders",
    )


class Word(Base):
    __tablename__ = "words"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    folder_id: Mapped[int | None] = mapped_column(ForeignKey("folders.id", ondelete="SET NULL"), nullable=True, index=True)
    word: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    meaning_ko: Mapped[str | None] = mapped_column(Text, nullable=True)
    pronunciation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pos: Mapped[str | None] = mapped_column(String(100), nullable=True)
    definitions: Mapped[list[str]] = mapped_column(MutableList.as_mutable(JSON), nullable=False, default=list)
    definitions_ko: Mapped[list[str]] = mapped_column(MutableList.as_mutable(JSON), nullable=False, default=list)
    examples: Mapped[list[dict[str, str]]] = mapped_column(MutableList.as_mutable(JSON), nullable=False, default=list)
    synonyms: Mapped[list[str]] = mapped_column(MutableList.as_mutable(JSON), nullable=False, default=list)
    nuance: Mapped[str | None] = mapped_column(Text, nullable=True)
    accepted_answers: Mapped[list[dict[str, str]]] = mapped_column(MutableList.as_mutable(JSON), nullable=False, default=list)
    learning_rate: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="new")
    stats: Mapped[dict[str, int]] = mapped_column(MutableDict.as_mutable(JSON), nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.current_timestamp())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )

    user: Mapped[User] = relationship(back_populates="words")
    folder: Mapped[Folder | None] = relationship("Folder", foreign_keys=[folder_id])
    folders: Mapped[list[Folder]] = relationship(
        "Folder",
        secondary=word_folder_association,
        back_populates="words",
    )

    @property
    def folder_ids(self) -> list[int]:
        ids = {folder.id for folder in self.folders}
        if self.folder_id is not None:
            ids.add(self.folder_id)
        return sorted(ids)


class ToeflQuizAsset(Base):
    __tablename__ = "toefl_quiz_assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    mode: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    task_type: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    payload: Mapped[dict] = mapped_column(MutableDict.as_mutable(JSON), nullable=False, default=dict)
    metadata_json: Mapped[dict] = mapped_column("metadata", MutableDict.as_mutable(JSON), nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.current_timestamp())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )

    user: Mapped[User] = relationship(back_populates="toefl_assets")
    attempts: Mapped[list[ToeflQuizAttempt]] = relationship(back_populates="asset", cascade="all, delete-orphan")
    review_items: Mapped[list[ToeflReviewItem]] = relationship(back_populates="asset", cascade="all, delete-orphan")


class ToeflQuizAttempt(Base):
    __tablename__ = "toefl_quiz_attempts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("toefl_quiz_assets.id", ondelete="CASCADE"), nullable=False, index=True)
    answers: Mapped[dict] = mapped_column(MutableDict.as_mutable(JSON), nullable=False, default=dict)
    results: Mapped[dict] = mapped_column(MutableDict.as_mutable(JSON), nullable=False, default=dict)
    correct_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    score: Mapped[dict] = mapped_column(MutableDict.as_mutable(JSON), nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.current_timestamp())

    user: Mapped[User] = relationship(back_populates="toefl_attempts")
    asset: Mapped[ToeflQuizAsset] = relationship(back_populates="attempts")
    review_items: Mapped[list[ToeflReviewItem]] = relationship(back_populates="attempt", cascade="all, delete-orphan")


class ToeflReviewItem(Base):
    __tablename__ = "toefl_review_items"
    __table_args__ = (
        UniqueConstraint("user_id", "asset_id", "item_key", name="uq_toefl_review_item_key"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("toefl_quiz_assets.id", ondelete="CASCADE"), nullable=False, index=True)
    attempt_id: Mapped[int] = mapped_column(ForeignKey("toefl_quiz_attempts.id", ondelete="CASCADE"), nullable=False, index=True)
    mode: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    task_type: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    item_key: Mapped[str] = mapped_column(String(160), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False, default="")
    user_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    correct_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_snapshot: Mapped[dict] = mapped_column(MutableDict.as_mutable(JSON), nullable=False, default=dict)
    skill_tag: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    topic_tags: Mapped[list[str]] = mapped_column(MutableList.as_mutable(JSON), nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="new", index=True)
    due_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.current_timestamp(), index=True)
    review_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    success_streak: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    last_result: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.current_timestamp())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.current_timestamp(),
        onupdate=func.current_timestamp(),
    )

    user: Mapped[User] = relationship(back_populates="toefl_review_items")
    asset: Mapped[ToeflQuizAsset] = relationship(back_populates="review_items")
    attempt: Mapped[ToeflQuizAttempt] = relationship(back_populates="review_items")
