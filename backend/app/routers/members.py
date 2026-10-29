from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..deps import get_current_user, require_admin
from ..models import (
    ROLE_ADMIN,
    ROLE_MEMBER,
    USER_INACTIVE,
    Match,
    TournamentParticipant,
    User,
)
from ..schemas import MemberCreate, MemberOut, MemberUpdate, PlayerStats
from ..security import hash_password
from ..serializers import match_out, member_out
from ..services.ranking import player_summary

router = APIRouter(prefix="/members", tags=["Anggota"])


def _get_or_404(db: Session, member_id: int) -> User:
    user = db.get(User, member_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Anggota tidak ditemukan.")
    return user


def _check_unique(db: Session, email: Optional[str], nim: Optional[str], exclude_id: Optional[int]):
    if email:
        stmt = select(User.id).where(User.email == email)
        if exclude_id:
            stmt = stmt.where(User.id != exclude_id)
        if db.scalar(stmt):
            raise HTTPException(status.HTTP_409_CONFLICT, "Email sudah digunakan anggota lain.")
    if nim:
        stmt = select(User.id).where(User.nim == nim)
        if exclude_id:
            stmt = stmt.where(User.id != exclude_id)
        if db.scalar(stmt):
            raise HTTPException(status.HTTP_409_CONFLICT, "NIM sudah digunakan anggota lain.")


@router.get("", response_model=list[MemberOut])
def list_members(
    q: Optional[str] = Query(default=None, max_length=100),
    status_filter: Optional[str] = Query(default=None, alias="status", pattern="^(active|inactive)$"),
    viewer: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stmt = select(User).where(User.role == ROLE_MEMBER)
    if status_filter:
        stmt = stmt.where(User.status == status_filter)
    elif viewer.role != ROLE_ADMIN:
        # Anggota biasa hanya melihat daftar anggota aktif.
        stmt = stmt.where(User.status != USER_INACTIVE)
    if q:
        like = f"%{q.strip()}%"
        if viewer.role == ROLE_ADMIN:
            stmt = stmt.where(or_(User.name.ilike(like), User.nim.ilike(like), User.email.ilike(like)))
        else:
            stmt = stmt.where(User.name.ilike(like))
    stmt = stmt.order_by(func.lower(User.name))
    return [member_out(u, viewer) for u in db.scalars(stmt)]


@router.post("", response_model=MemberOut, status_code=status.HTTP_201_CREATED)
def create_member(data: MemberCreate, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    email = data.email.lower()
    _check_unique(db, email, data.nim, None)
    user = User(
        name=data.name,
        email=email,
        nim=data.nim,
        password_hash=hash_password(data.password),
        role=ROLE_MEMBER,
        status=data.status,
        joined_at=data.joined_at or date.today(),
    )
    db.add(user)
    db.commit()
    return member_out(user, admin)


@router.get("/{member_id}", response_model=MemberOut)
def get_member(member_id: int, viewer: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return member_out(_get_or_404(db, member_id), viewer)


@router.patch("/{member_id}", response_model=MemberOut)
def update_member(
    member_id: int,
    data: MemberUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = _get_or_404(db, member_id)
    fields = data.model_fields_set
    if user.id == admin.id and data.status == USER_INACTIVE:
        raise HTTPException(status.HTTP_409_CONFLICT, "Anda tidak dapat menonaktifkan akun sendiri.")

    new_email = data.email.lower() if data.email else None
    _check_unique(db, new_email, data.nim if "nim" in fields else None, user.id)

    if data.name is not None:
        user.name = data.name
    if new_email:
        user.email = new_email
    if "nim" in fields:
        user.nim = data.nim
    if data.status is not None:
        user.status = data.status
    if data.joined_at is not None:
        user.joined_at = data.joined_at
    if data.password:
        user.password_hash = hash_password(data.password)
    db.commit()
    return member_out(user, admin)


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_member(member_id: int, admin: User = Depends(require_admin), db: Session = Depends(get_db)):
    user = _get_or_404(db, member_id)
    if user.id == admin.id or user.role == ROLE_ADMIN:
        raise HTTPException(status.HTTP_409_CONFLICT, "Akun Administrator tidak dapat dihapus.")
    has_matches = db.scalar(
        select(func.count()).select_from(Match).where(or_(Match.white_id == user.id, Match.black_id == user.id))
    )
    has_regs = db.scalar(
        select(func.count()).select_from(TournamentParticipant).where(TournamentParticipant.user_id == user.id)
    )
    if has_matches or has_regs:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Anggota memiliki riwayat pertandingan/turnamen sehingga tidak dapat dihapus. "
            "Ubah statusnya menjadi nonaktif.",
        )
    db.delete(user)
    db.commit()


@router.get("/{member_id}/stats", response_model=PlayerStats)
def member_stats(member_id: int, viewer: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user = _get_or_404(db, member_id)
    summary = player_summary(db, user)
    recent = db.scalars(
        select(Match)
        .where(or_(Match.white_id == user.id, Match.black_id == user.id))
        .options(joinedload(Match.white), joinedload(Match.black), joinedload(Match.tournament))
        .order_by(Match.match_date.desc(), Match.id.desc())
        .limit(20)
    ).all()
    return PlayerStats(
        member=member_out(user, viewer),
        recent_matches=[match_out(m) for m in recent],
        **summary,
    )
