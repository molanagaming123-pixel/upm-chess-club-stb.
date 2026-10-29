"""Fungsi pembantu untuk mengubah objek database menjadi respons API."""
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import (
    REG_APPROVED,
    ROLE_ADMIN,
    Match,
    Tournament,
    TournamentParticipant,
    User,
)
from .schemas import MatchOut, MemberOut, TournamentOut


def member_out(user: User, viewer: User) -> MemberOut:
    """Privasi: email, NIM, dan role hanya terlihat oleh Administrator atau pemilik akun."""
    privileged = viewer.role == ROLE_ADMIN or viewer.id == user.id
    return MemberOut(
        id=user.id,
        name=user.name,
        status=user.status,
        joined_at=user.joined_at,
        email=user.email if privileged else None,
        nim=user.nim if privileged else None,
        role=user.role if privileged else None,
    )


def match_out(m: Match) -> MatchOut:
    return MatchOut(
        id=m.id,
        kind="turnamen" if m.tournament_id is not None else "persahabatan",
        tournament_id=m.tournament_id,
        tournament_name=m.tournament.name if m.tournament else None,
        round=m.round,
        white_id=m.white_id,
        white_name=m.white.name,
        black_id=m.black_id,
        black_name=m.black.name,
        result=m.result,
        match_date=m.match_date,
    )


def tournament_out(db: Session, t: Tournament, viewer: Optional[User]) -> TournamentOut:
    participant_count = db.scalar(
        select(func.count())
        .select_from(TournamentParticipant)
        .where(
            TournamentParticipant.tournament_id == t.id,
            TournamentParticipant.status == REG_APPROVED,
        )
    )
    match_count = db.scalar(
        select(func.count()).select_from(Match).where(Match.tournament_id == t.id)
    )
    my_reg = None
    if viewer is not None:
        my_reg = db.scalar(
            select(TournamentParticipant.status).where(
                TournamentParticipant.tournament_id == t.id,
                TournamentParticipant.user_id == viewer.id,
            )
        )
    return TournamentOut(
        id=t.id,
        name=t.name,
        start_date=t.start_date,
        end_date=t.end_date,
        location=t.location,
        description=t.description,
        status=t.status,
        participant_count=participant_count or 0,
        match_count=match_count or 0,
        my_registration=my_reg,
    )
