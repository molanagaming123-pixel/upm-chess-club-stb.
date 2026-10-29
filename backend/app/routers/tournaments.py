from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..deps import get_current_user, require_admin
from ..models import (
    REG_APPROVED,
    REG_PENDING,
    REG_REJECTED,
    ROLE_ADMIN,
    TOURNAMENT_FINISHED,
    TOURNAMENT_UPCOMING,
    USER_ACTIVE,
    Match,
    Tournament,
    TournamentParticipant,
    User,
)
from ..schemas import (
    MatchOut,
    ParticipantAdd,
    ParticipantOut,
    ParticipantStatusUpdate,
    StandingRow,
    TournamentCreate,
    TournamentOut,
    TournamentUpdate,
)
from ..serializers import match_out, tournament_out
from ..services.ranking import compute_standings

router = APIRouter(prefix="/tournaments", tags=["Turnamen"])


def _get_or_404(db: Session, tournament_id: int) -> Tournament:
    t = db.get(Tournament, tournament_id)
    if t is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Turnamen tidak ditemukan.")
    return t


def _participant(db: Session, tournament_id: int, user_id: int) -> Optional[TournamentParticipant]:
    return db.scalar(
        select(TournamentParticipant).where(
            TournamentParticipant.tournament_id == tournament_id,
            TournamentParticipant.user_id == user_id,
        )
    )


def _has_matches(db: Session, tournament_id: int, user_id: int) -> bool:
    return bool(
        db.scalar(
            select(func.count())
            .select_from(Match)
            .where(
                Match.tournament_id == tournament_id,
                or_(Match.white_id == user_id, Match.black_id == user_id),
            )
        )
    )


@router.get("", response_model=list[TournamentOut])
def list_tournaments(
    status_filter: Optional[str] = Query(default=None, alias="status", pattern="^(upcoming|ongoing|finished)$"),
    viewer: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(Tournament)
    if status_filter:
        stmt = stmt.where(Tournament.status == status_filter)
    stmt = stmt.order_by(Tournament.start_date.desc(), Tournament.id.desc())
    return [tournament_out(db, t, viewer) for t in db.scalars(stmt)]


@router.post("", response_model=TournamentOut, status_code=status.HTTP_201_CREATED)
def create_tournament(data: TournamentCreate, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    t = Tournament(**data.model_dump())
    db.add(t)
    db.commit()
    return tournament_out(db, t, admin)


@router.get("/{tournament_id}", response_model=TournamentOut)
def get_tournament(tournament_id: int, viewer: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return tournament_out(db, _get_or_404(db, tournament_id), viewer)


@router.patch("/{tournament_id}", response_model=TournamentOut)
def update_tournament(
    tournament_id: int,
    data: TournamentUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    t = _get_or_404(db, tournament_id)
    changes = data.model_dump(exclude_unset=True)
    for key in ("name", "start_date", "end_date", "status"):
        if key in changes and changes[key] is None:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Field {key} tidak boleh kosong.")
    new_start = changes.get("start_date", t.start_date)
    new_end = changes.get("end_date", t.end_date)
    if new_end < new_start:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Tanggal selesai tidak boleh sebelum tanggal mulai.")
    if ("start_date" in changes or "end_date" in changes):
        outside = db.scalar(
            select(func.count())
            .select_from(Match)
            .where(
                Match.tournament_id == t.id,
                or_(Match.match_date < new_start, Match.match_date > new_end),
            )
        )
        if outside:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Ada pertandingan di luar rentang tanggal baru. Ubah tanggal pertandingan itu terlebih dahulu.",
            )
    for key, value in changes.items():
        setattr(t, key, value)
    db.commit()
    return tournament_out(db, t, admin)


@router.delete("/{tournament_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tournament(tournament_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    t = _get_or_404(db, tournament_id)
    if db.scalar(select(func.count()).select_from(Match).where(Match.tournament_id == t.id)):
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Turnamen sudah memiliki pertandingan sehingga tidak dapat dihapus.",
        )
    db.delete(t)
    db.commit()


# ---------- Peserta ----------
@router.get("/{tournament_id}/participants", response_model=list[ParticipantOut])
def list_participants(tournament_id: int, viewer: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_or_404(db, tournament_id)
    stmt = (
        select(TournamentParticipant)
        .where(TournamentParticipant.tournament_id == tournament_id)
        .options(joinedload(TournamentParticipant.user))
    )
    if viewer.role != ROLE_ADMIN:
        stmt = stmt.where(TournamentParticipant.status == REG_APPROVED)
    rows = db.scalars(stmt).all()
    rows.sort(key=lambda p: (p.status != REG_PENDING, p.user.name.casefold()))
    return [ParticipantOut(user_id=p.user_id, name=p.user.name, status=p.status) for p in rows]


@router.post("/{tournament_id}/participants", response_model=ParticipantOut, status_code=status.HTTP_201_CREATED)
def add_participant(
    tournament_id: int,
    data: ParticipantAdd,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    t = _get_or_404(db, tournament_id)
    if t.status == TOURNAMENT_FINISHED:
        raise HTTPException(status.HTTP_409_CONFLICT, "Turnamen sudah selesai.")
    user = db.get(User, data.user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Anggota tidak ditemukan.")
    if user.status != USER_ACTIVE:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Hanya anggota aktif yang dapat menjadi peserta.")
    existing = _participant(db, tournament_id, user.id)
    if existing is not None:
        if existing.status == REG_APPROVED:
            raise HTTPException(status.HTTP_409_CONFLICT, "Anggota sudah terdaftar sebagai peserta.")
        existing.status = REG_APPROVED  # pengajuan pending/ditolak disetujui oleh admin
        db.commit()
        return ParticipantOut(user_id=user.id, name=user.name, status=existing.status)
    p = TournamentParticipant(tournament_id=tournament_id, user_id=user.id, status=REG_APPROVED)
    db.add(p)
    db.commit()
    return ParticipantOut(user_id=user.id, name=user.name, status=p.status)


@router.post("/{tournament_id}/register", response_model=ParticipantOut, status_code=status.HTTP_201_CREATED)
def register_self(tournament_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Anggota mengajukan pendaftaran. Status 'pending' sampai disetujui pengurus."""
    t = _get_or_404(db, tournament_id)
    if t.status != TOURNAMENT_UPCOMING:
        raise HTTPException(status.HTTP_409_CONFLICT, "Pendaftaran hanya dibuka untuk turnamen yang akan datang.")
    existing = _participant(db, tournament_id, user.id)
    if existing is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT, f"Anda sudah mengajukan pendaftaran (status: {existing.status})."
        )
    p = TournamentParticipant(tournament_id=tournament_id, user_id=user.id, status=REG_PENDING)
    db.add(p)
    db.commit()
    return ParticipantOut(user_id=user.id, name=user.name, status=p.status)


@router.patch("/{tournament_id}/participants/{user_id}", response_model=ParticipantOut)
def set_participant_status(
    tournament_id: int,
    user_id: int,
    data: ParticipantStatusUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    t = _get_or_404(db, tournament_id)
    p = _participant(db, tournament_id, user_id)
    if p is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pendaftaran tidak ditemukan.")
    if data.status == REG_REJECTED and _has_matches(db, tournament_id, user_id):
        raise HTTPException(status.HTTP_409_CONFLICT, "Peserta sudah memiliki pertandingan; hapus pertandingannya dulu.")
    if data.status == REG_APPROVED:
        if t.status == TOURNAMENT_FINISHED:
            raise HTTPException(status.HTTP_409_CONFLICT, "Turnamen sudah selesai.")
        if p.user.status != USER_ACTIVE:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Anggota tidak aktif.")
    p.status = data.status
    db.commit()
    return ParticipantOut(user_id=p.user_id, name=p.user.name, status=p.status)


@router.delete("/{tournament_id}/participants/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_participant(
    tournament_id: int, user_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)
):
    _get_or_404(db, tournament_id)
    p = _participant(db, tournament_id, user_id)
    if p is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Peserta tidak ditemukan.")
    if _has_matches(db, tournament_id, user_id):
        raise HTTPException(status.HTTP_409_CONFLICT, "Peserta sudah memiliki pertandingan; hapus pertandingannya dulu.")
    db.delete(p)
    db.commit()


# ---------- Ronde, pertandingan, klasemen ----------
@router.get("/{tournament_id}/rounds")
def list_rounds(tournament_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_or_404(db, tournament_id)
    matches = db.scalars(
        select(Match)
        .where(Match.tournament_id == tournament_id)
        .options(joinedload(Match.white), joinedload(Match.black), joinedload(Match.tournament))
        .order_by(Match.round, Match.id)
    ).all()
    rounds: dict[int, list[MatchOut]] = {}
    for m in matches:
        rounds.setdefault(m.round or 0, []).append(match_out(m))
    return [{"round": r, "matches": ms} for r, ms in sorted(rounds.items())]


@router.get("/{tournament_id}/rounds/{round_no}/unpaired", response_model=list[ParticipantOut])
def unpaired_players(
    tournament_id: int, round_no: int, _: User = Depends(require_admin), db: Session = Depends(get_db)
):
    """Peserta disetujui yang belum punya lawan di ronde ini (membantu pairing manual)."""
    _get_or_404(db, tournament_id)
    busy: set[int] = set()
    for m in db.scalars(select(Match).where(Match.tournament_id == tournament_id, Match.round == round_no)):
        busy.update((m.white_id, m.black_id))
    rows = db.scalars(
        select(TournamentParticipant)
        .where(TournamentParticipant.tournament_id == tournament_id, TournamentParticipant.status == REG_APPROVED)
        .options(joinedload(TournamentParticipant.user))
    ).all()
    free = [p for p in rows if p.user_id not in busy]
    free.sort(key=lambda p: p.user.name.casefold())
    return [ParticipantOut(user_id=p.user_id, name=p.user.name, status=p.status) for p in free]


@router.get("/{tournament_id}/standings", response_model=list[StandingRow])
def tournament_standings(tournament_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _get_or_404(db, tournament_id)
    parts = db.scalars(
        select(TournamentParticipant)
        .where(TournamentParticipant.tournament_id == tournament_id, TournamentParticipant.status == REG_APPROVED)
        .options(joinedload(TournamentParticipant.user))
    ).all()
    players = {p.user_id: p.user.name for p in parts}
    matches = db.scalars(select(Match).where(Match.tournament_id == tournament_id)).all()
    return compute_standings(players, matches)
