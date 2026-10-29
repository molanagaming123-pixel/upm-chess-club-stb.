"""Perhitungan peringkat. SEMUA angka dihitung ulang dari tabel `matches` setiap kali
diminta, tidak ada kolom poin yang disimpan. Dengan begitu mengubah/menghapus hasil
otomatis konsisten tanpa langkah sinkronisasi tambahan.

Aturan (MVP):
  Menang = 3, Seri = 1, Kalah = 0.
  Tie-break: (1) menang terbanyak, (2) pertandingan paling sedikit, (3) nama A-Z.
Hanya pertandingan yang sudah punya hasil yang dihitung.
"""
from typing import Iterable

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from ..models import (
    RESULT_BLACK,
    RESULT_DRAW,
    RESULT_WHITE,
    ROLE_MEMBER,
    USER_ACTIVE,
    Match,
    User,
)

POINTS_WIN = 3
POINTS_DRAW = 1
POINTS_LOSS = 0


def compute_standings(players: dict[int, str], matches: Iterable[Match]) -> list[dict]:
    """players: {user_id: nama}. matches: iterable Match (yang tanpa hasil diabaikan)."""
    table = {
        uid: {
            "user_id": uid,
            "name": name,
            "played": 0,
            "wins": 0,
            "draws": 0,
            "losses": 0,
            "points": 0,
        }
        for uid, name in players.items()
    }
    for m in matches:
        if m.result is None:
            continue
        w = table.get(m.white_id)
        b = table.get(m.black_id)
        if w is None or b is None:
            continue
        w["played"] += 1
        b["played"] += 1
        if m.result == RESULT_WHITE:
            w["wins"] += 1
            b["losses"] += 1
            w["points"] += POINTS_WIN
            b["points"] += POINTS_LOSS
        elif m.result == RESULT_BLACK:
            b["wins"] += 1
            w["losses"] += 1
            b["points"] += POINTS_WIN
            w["points"] += POINTS_LOSS
        elif m.result == RESULT_DRAW:
            w["draws"] += 1
            b["draws"] += 1
            w["points"] += POINTS_DRAW
            b["points"] += POINTS_DRAW

    rows = sorted(
        table.values(),
        key=lambda r: (-r["points"], -r["wins"], r["played"], r["name"].casefold(), r["user_id"]),
    )
    for i, row in enumerate(rows, start=1):
        row["rank"] = i
    return rows


def completed_matches(db: Session) -> list[Match]:
    return list(db.scalars(select(Match).where(Match.result.is_not(None))))


def ranked_players(db: Session, matches: list[Match]) -> dict[int, str]:
    """Pemain yang masuk peringkat global: Anggota aktif + siapa pun yang pernah bermain."""
    played_ids = {m.white_id for m in matches} | {m.black_id for m in matches}
    stmt = select(User).where(
        or_(
            and_(User.role == ROLE_MEMBER, User.status == USER_ACTIVE),
            User.id.in_(played_ids),
        )
    )
    return {u.id: u.name for u in db.scalars(stmt)}


def global_standings(db: Session) -> list[dict]:
    matches = completed_matches(db)
    return compute_standings(ranked_players(db, matches), matches)


def player_summary(db: Session, user: User) -> dict:
    """Statistik + riwayat peringkat untuk satu pemain, dari hasil yang valid."""
    matches = completed_matches(db)
    players = ranked_players(db, matches)
    rows = compute_standings(players, matches)
    mine = next((r for r in rows if r["user_id"] == user.id), None)

    history: list[dict] = []
    if mine is not None and mine["played"] > 0:
        my_dates = sorted(
            {m.match_date for m in matches if user.id in (m.white_id, m.black_id)}
        )
        for d in my_dates:
            upto = [m for m in matches if m.match_date <= d]
            snap = compute_standings(players, upto)
            row = next(r for r in snap if r["user_id"] == user.id)
            history.append(
                {
                    "date": d,
                    "rank": row["rank"],
                    "points": row["points"],
                    "played": row["played"],
                }
            )

    return {
        "played": mine["played"] if mine else 0,
        "wins": mine["wins"] if mine else 0,
        "draws": mine["draws"] if mine else 0,
        "losses": mine["losses"] if mine else 0,
        "points": mine["points"] if mine else 0,
        "rank": mine["rank"] if mine and mine["played"] > 0 else None,
        "total_ranked": len(players),
        "rank_history": history,
    }
