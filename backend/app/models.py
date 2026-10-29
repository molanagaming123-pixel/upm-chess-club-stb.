from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

ROLE_ADMIN = "admin"
ROLE_MEMBER = "member"

USER_ACTIVE = "active"
USER_INACTIVE = "inactive"

TOURNAMENT_UPCOMING = "upcoming"
TOURNAMENT_ONGOING = "ongoing"
TOURNAMENT_FINISHED = "finished"

REG_PENDING = "pending"
REG_APPROVED = "approved"
REG_REJECTED = "rejected"

RESULT_WHITE = "white_win"
RESULT_BLACK = "black_win"
RESULT_DRAW = "draw"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    nim: Mapped[Optional[str]] = mapped_column(String(30), unique=True, nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(10), default=ROLE_MEMBER)
    status: Mapped[str] = mapped_column(String(10), default=USER_ACTIVE)
    joined_at: Mapped[date] = mapped_column(Date, default=date.today)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    __table_args__ = (
        CheckConstraint("role IN ('admin','member')", name="ck_user_role"),
        CheckConstraint("status IN ('active','inactive')", name="ck_user_status"),
    )


class Tournament(Base):
    __tablename__ = "tournaments"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date] = mapped_column(Date)
    location: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(10), default=TOURNAMENT_UPCOMING)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    participants: Mapped[list["TournamentParticipant"]] = relationship(
        back_populates="tournament", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('upcoming','ongoing','finished')", name="ck_tournament_status"
        ),
        CheckConstraint("end_date >= start_date", name="ck_tournament_dates"),
    )


class TournamentParticipant(Base):
    __tablename__ = "tournament_participants"

    id: Mapped[int] = mapped_column(primary_key=True)
    tournament_id: Mapped[int] = mapped_column(
        ForeignKey("tournaments.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    status: Mapped[str] = mapped_column(String(10), default=REG_PENDING)
    registered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    tournament: Mapped["Tournament"] = relationship(back_populates="participants")
    user: Mapped["User"] = relationship()

    __table_args__ = (
        UniqueConstraint("tournament_id", "user_id", name="uq_participant"),
        CheckConstraint(
            "status IN ('pending','approved','rejected')", name="ck_participant_status"
        ),
    )


class Match(Base):
    __tablename__ = "matches"

    id: Mapped[int] = mapped_column(primary_key=True)
    tournament_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("tournaments.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    round: Mapped[Optional[int]] = mapped_column(nullable=True)
    white_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    black_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True)
    result: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    match_date: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    tournament: Mapped[Optional["Tournament"]] = relationship()
    white: Mapped["User"] = relationship(foreign_keys=[white_id])
    black: Mapped["User"] = relationship(foreign_keys=[black_id])

    __table_args__ = (
        CheckConstraint("white_id != black_id", name="ck_match_distinct_players"),
        CheckConstraint(
            "result IS NULL OR result IN ('white_win','black_win','draw')",
            name="ck_match_result",
        ),
    )
