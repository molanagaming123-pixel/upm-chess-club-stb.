from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..deps import get_current_user
from ..models import (
    ROLE_MEMBER,
    TOURNAMENT_ONGOING,
    TOURNAMENT_UPCOMING,
    USER_ACTIVE,
    Match,
    Tournament,
    User,
)
from ..schemas import DashboardOut, StandingRow
from ..serializers import match_out, tournament_out
from ..services.ranking import global_standings

router = APIRouter(tags=["Peringkat & Dashboard"])


@router.get("/standings", response_model=list[StandingRow])
def standings(_: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Peringkat global: dihitung dari seluruh pertandingan yang sudah punya hasil."""
    return global_standings(db)


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(viewer: User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_members = db.scalar(select(func.count()).select_from(User).where(User.role == ROLE_MEMBER))
    active_members = db.scalar(
        select(func.count()).select_from(User).where(User.role == ROLE_MEMBER, User.status == USER_ACTIVE)
    )
    active_tournaments = db.scalar(
        select(func.count()).select_from(Tournament).where(Tournament.status == TOURNAMENT_ONGOING)
    )
    total_matches = db.scalar(select(func.count()).select_from(Match))
    completed = db.scalar(select(func.count()).select_from(Match).where(Match.result.is_not(None)))

    upcoming = db.scalars(
        select(Tournament)
        .where(Tournament.status == TOURNAMENT_UPCOMING)
        .order_by(Tournament.start_date, Tournament.id)
        .limit(5)
    ).all()
    recent = (
        db.scalars(
            select(Match)
            .where(Match.result.is_not(None))
            .options(joinedload(Match.white), joinedload(Match.black), joinedload(Match.tournament))
            .order_by(Match.match_date.desc(), Match.id.desc())
            .limit(5)
        )
        .unique()
        .all()
    )
    top = [r for r in global_standings(db) if r["played"] > 0][:5]

    return DashboardOut(
        total_members=total_members or 0,
        active_members=active_members or 0,
        active_tournaments=active_tournaments or 0,
        total_matches=total_matches or 0,
        completed_matches=completed or 0,
        upcoming_tournaments=[tournament_out(db, t, viewer) for t in upcoming],
        recent_results=[match_out(m) for m in recent],
        top_players=top,
    )
