from datetime import date, datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..deps import get_current_user, require_admin
from ..models import (
    REG_APPROVED,
    TOURNAMENT_FINISHED,
    USER_ACTIVE,
    Match,
    Tournament,
    TournamentParticipant,
    User,
)
from ..schemas import MatchCreate, MatchOut, MatchUpdate
from ..serializers import match_out

router = APIRouter(prefix="/matches", tags=["Pertandingan"])

_WIB = timezone(timedelta(hours=7))


def today_wib() -> date:
    return datetime.now(_WIB).date()


def _err(code: int, message: str) -> HTTPException:
    return HTTPException(code, message)


def _load(db: Session, match_id: int) -> Match:
    m = db.scalar(
        select(Match)
        .where(Match.id == match_id)
        .options(joinedload(Match.white), joinedload(Match.black), joinedload(Match.tournament))
    )
    if m is None:
        raise _err(status.HTTP_404_NOT_FOUND, "Pertandingan tidak ditemukan.")
    return m


def _validate(
    db: Session,
    *,
    tournament_id: Optional[int],
    round_no: Optional[int],
    white_id: int,
    black_id: int,
    match_date: date,
    result: Optional[str],
    check_players: bool,
    check_tournament_open: bool,
    exclude_match_id: Optional[int] = None,
) -> None:
    if white_id == black_id:
        raise _err(422, "Pemain tidak dapat melawan dirinya sendiri.")

    if result is not None and match_date > today_wib():
        raise _err(422, "Hasil tidak dapat dicatat untuk tanggal yang belum terjadi.")

    if check_players:
        for pid in (white_id, black_id):
            u = db.get(User, pid)
            if u is None:
                raise _err(404, "Pemain tidak ditemukan.")
            if u.status != USER_ACTIVE:
                raise _err(422, f"Pemain {u.name} tidak aktif.")

    if tournament_id is None:
        if round_no is not None:
            raise _err(422, "Pertandingan persahabatan tidak memiliki ronde.")
        return

    t = db.get(Tournament, tournament_id)
    if t is None:
        raise _err(404, "Turnamen tidak ditemukan.")
    if check_tournament_open and t.status == TOURNAMENT_FINISHED:
        raise _err(409, "Turnamen sudah selesai; buka kembali statusnya untuk menambah pertandingan.")
    if round_no is None:
        raise _err(422, "Pertandingan turnamen wajib memiliki nomor ronde.")
    if not (t.start_date <= match_date <= t.end_date):
        raise _err(
            422,
            f"Tanggal pertandingan harus dalam rentang turnamen ({t.start_date} s/d {t.end_date}).",
        )

    if check_players:
        approved = set(
            db.scalars(
                select(TournamentParticipant.user_id).where(
                    TournamentParticipant.tournament_id == tournament_id,
                    TournamentParticipant.status == REG_APPROVED,
                    TournamentParticipant.user_id.in_([white_id, black_id]),
                )
            )
        )
        for pid in (white_id, black_id):
            if pid not in approved:
                name = db.get(User, pid).name
                raise _err(422, f"{name} bukan peserta turnamen ini (belum disetujui).")

    others = select(Match).where(Match.tournament_id == tournament_id)
    if exclude_match_id is not None:
        others = others.where(Match.id != exclude_match_id)
    for other in db.scalars(others):
        # Bentrok jadwal: satu pemain tidak boleh bermain dua kali dalam ronde yang sama.
        if other.round == round_no and {white_id, black_id} & {other.white_id, other.black_id}:
            raise _err(409, f"Bentrok jadwal: salah satu pemain sudah bertanding di ronde {round_no}.")
        # Salah pairing: pasangan yang sama tidak boleh bertemu dua kali di turnamen yang sama.
        if {white_id, black_id} == {other.white_id, other.black_id}:
            raise _err(409, "Kedua pemain sudah pernah dipasangkan di turnamen ini.")


@router.get("", response_model=list[MatchOut])
def list_matches(
    tournament_id: Optional[int] = None,
    user_id: Optional[int] = None,
    kind: Optional[str] = Query(default=None, pattern="^(turnamen|persahabatan)$"),
    only_completed: bool = False,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(Match).options(joinedload(Match.white), joinedload(Match.black), joinedload(Match.tournament))
    if tournament_id is not None:
        stmt = stmt.where(Match.tournament_id == tournament_id)
    if user_id is not None:
        stmt = stmt.where(or_(Match.white_id == user_id, Match.black_id == user_id))
    if kind == "turnamen":
        stmt = stmt.where(Match.tournament_id.is_not(None))
    elif kind == "persahabatan":
        stmt = stmt.where(Match.tournament_id.is_(None))
    if only_completed:
        stmt = stmt.where(Match.result.is_not(None))
    stmt = stmt.order_by(Match.match_date.desc(), Match.id.desc()).limit(limit).offset(offset)
    return [match_out(m) for m in db.scalars(stmt).unique()]


@router.post("", response_model=MatchOut, status_code=status.HTTP_201_CREATED)
def create_match(data: MatchCreate, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    _validate(
        db,
        tournament_id=data.tournament_id,
        round_no=data.round,
        white_id=data.white_id,
        black_id=data.black_id,
        match_date=data.match_date,
        result=data.result,
        check_players=True,
        check_tournament_open=True,
    )
    m = Match(
        tournament_id=data.tournament_id,
        round=data.round,
        white_id=data.white_id,
        black_id=data.black_id,
        match_date=data.match_date,
        result=data.result,
    )
    db.add(m)
    db.commit()
    return match_out(_load(db, m.id))


@router.get("/{match_id}", response_model=MatchOut)
def get_match(match_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return match_out(_load(db, match_id))


@router.patch("/{match_id}", response_model=MatchOut)
def update_match(
    match_id: int, data: MatchUpdate, _: User = Depends(require_admin), db: Session = Depends(get_db)
):
    m = _load(db, match_id)
    fields = data.model_fields_set
    if data.clear_result and data.result is not None:
        raise _err(422, "Tidak dapat mengisi dan mengosongkan hasil sekaligus.")

    new_white = data.white_id if "white_id" in fields and data.white_id is not None else m.white_id
    new_black = data.black_id if "black_id" in fields and data.black_id is not None else m.black_id
    new_round = data.round if "round" in fields and data.round is not None else m.round
    new_date = data.match_date if "match_date" in fields and data.match_date is not None else m.match_date
    if data.clear_result:
        new_result = None
    elif data.result is not None:
        new_result = data.result
    else:
        new_result = m.result

    players_changed = (new_white, new_black) != (m.white_id, m.black_id)
    structural = players_changed or new_round != m.round or new_date != m.match_date
    # Koreksi hasil saja tetap diizinkan walau turnamen sudah selesai / pemain kini nonaktif.
    _validate(
        db,
        tournament_id=m.tournament_id,
        round_no=new_round,
        white_id=new_white,
        black_id=new_black,
        match_date=new_date,
        result=new_result,
        check_players=players_changed,
        check_tournament_open=structural,
        exclude_match_id=m.id,
    )
    m.white_id, m.black_id, m.round, m.match_date, m.result = (
        new_white,
        new_black,
        new_round,
        new_date,
        new_result,
    )
    db.commit()
    db.expire_all()
    return match_out(_load(db, m.id))


@router.delete("/{match_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_match(match_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)):
    m = _load(db, match_id)
    db.delete(m)
    db.commit()
