import re
from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

ResultType = Literal["white_win", "black_win", "draw"]
UserStatus = Literal["active", "inactive"]
TournamentStatus = Literal["upcoming", "ongoing", "finished"]

_NIM_RE = re.compile(r"^[A-Za-z0-9]{3,30}$")


def _clean_nim(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    value = value.strip()
    if value == "":
        return None
    if not _NIM_RE.match(value):
        raise ValueError("NIM hanya boleh huruf/angka (3-30 karakter)")
    return value


def _check_password(value: str) -> str:
    if len(value) < 8:
        raise ValueError("Kata sandi minimal 8 karakter")
    if len(value.encode("utf-8")) > 72:
        raise ValueError("Kata sandi maksimal 72 byte")
    if not (re.search(r"[A-Za-z]", value) and re.search(r"\d", value)):
        raise ValueError("Kata sandi harus mengandung huruf dan angka")
    return value


def _clean_name(value: str) -> str:
    value = " ".join(value.split())
    if len(value) < 2:
        raise ValueError("Nama minimal 2 karakter")
    return value


# ---------- Auth ----------
class RegisterIn(BaseModel):
    """Registrasi publik. Sengaja tidak ada field `role`: selalu menjadi Anggota."""

    name: str = Field(max_length=120)
    email: EmailStr
    password: str
    nim: Optional[str] = None

    _v_name = field_validator("name")(_clean_name)
    _v_pw = field_validator("password")(_check_password)
    _v_nim = field_validator("nim")(_clean_nim)


class LoginIn(BaseModel):
    email: str = Field(max_length=255)
    password: str = Field(max_length=200)


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "MemberOut"


# ---------- Anggota ----------
class MemberOut(BaseModel):
    """email/nim/role bernilai null untuk pengguna non-Administrator (privasi)."""

    id: int
    name: str
    status: str
    joined_at: date
    email: Optional[str] = None
    nim: Optional[str] = None
    role: Optional[str] = None


class MemberCreate(BaseModel):
    name: str = Field(max_length=120)
    email: EmailStr
    password: str
    nim: Optional[str] = None
    status: UserStatus = "active"
    joined_at: Optional[date] = None

    _v_name = field_validator("name")(_clean_name)
    _v_pw = field_validator("password")(_check_password)
    _v_nim = field_validator("nim")(_clean_nim)


class MemberUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=120)
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    nim: Optional[str] = None
    status: Optional[UserStatus] = None
    joined_at: Optional[date] = None

    @field_validator("name")
    @classmethod
    def _name(cls, v):
        return None if v is None else _clean_name(v)

    @field_validator("password")
    @classmethod
    def _pw(cls, v):
        return None if v is None else _check_password(v)

    @field_validator("nim")
    @classmethod
    def _nim(cls, v):
        return _clean_nim(v)


# ---------- Turnamen ----------
class TournamentCreate(BaseModel):
    name: str = Field(max_length=150)
    start_date: date
    end_date: date
    location: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=5000)
    status: TournamentStatus = "upcoming"

    @field_validator("name")
    @classmethod
    def _name(cls, v):
        v = " ".join(v.split())
        if len(v) < 3:
            raise ValueError("Nama turnamen minimal 3 karakter")
        return v

    @model_validator(mode="after")
    def _dates(self):
        if self.end_date < self.start_date:
            raise ValueError("Tanggal selesai tidak boleh sebelum tanggal mulai")
        return self


class TournamentUpdate(BaseModel):
    name: Optional[str] = Field(default=None, max_length=150)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    location: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=5000)
    status: Optional[TournamentStatus] = None

    @field_validator("name")
    @classmethod
    def _name(cls, v):
        if v is None:
            return v
        v = " ".join(v.split())
        if len(v) < 3:
            raise ValueError("Nama turnamen minimal 3 karakter")
        return v


class TournamentOut(BaseModel):
    id: int
    name: str
    start_date: date
    end_date: date
    location: Optional[str]
    description: Optional[str]
    status: str
    participant_count: int
    match_count: int
    my_registration: Optional[str] = None


class ParticipantAdd(BaseModel):
    user_id: int


class ParticipantStatusUpdate(BaseModel):
    status: Literal["approved", "rejected"]


class ParticipantOut(BaseModel):
    user_id: int
    name: str
    status: str


# ---------- Pertandingan ----------
class MatchCreate(BaseModel):
    tournament_id: Optional[int] = None
    round: Optional[int] = Field(default=None, ge=1, le=100)
    white_id: int
    black_id: int
    match_date: date
    result: Optional[ResultType] = None


class MatchUpdate(BaseModel):
    round: Optional[int] = Field(default=None, ge=1, le=100)
    white_id: Optional[int] = None
    black_id: Optional[int] = None
    match_date: Optional[date] = None
    # Gunakan `clear_result=true` untuk mengosongkan hasil (mis. salah input).
    result: Optional[ResultType] = None
    clear_result: bool = False


class MatchOut(BaseModel):
    id: int
    kind: str
    tournament_id: Optional[int]
    tournament_name: Optional[str]
    round: Optional[int]
    white_id: int
    white_name: str
    black_id: int
    black_name: str
    result: Optional[str]
    match_date: date


class StandingRow(BaseModel):
    rank: int
    user_id: int
    name: str
    played: int
    wins: int
    draws: int
    losses: int
    points: int


class RankPoint(BaseModel):
    date: date
    rank: int
    points: int
    played: int


class PlayerStats(BaseModel):
    member: MemberOut
    played: int
    wins: int
    draws: int
    losses: int
    points: int
    rank: Optional[int]
    total_ranked: int
    recent_matches: list[MatchOut]
    rank_history: list[RankPoint]


class DashboardOut(BaseModel):
    total_members: int
    active_members: int
    active_tournaments: int
    total_matches: int
    completed_matches: int
    upcoming_tournaments: list[TournamentOut]
    recent_results: list[MatchOut]
    top_players: list[StandingRow]


TokenOut.model_rebuild()
