from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import ROLE_MEMBER, USER_ACTIVE, User
from ..schemas import LoginIn, MemberOut, RegisterIn, TokenOut
from ..security import (
    burn_password_check,
    create_access_token,
    hash_password,
    verify_password,
)
from ..serializers import member_out

router = APIRouter(prefix="/auth", tags=["Autentikasi"])

INVALID_LOGIN = "Email atau kata sandi salah."


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    email = data.email.lower()
    if db.scalar(select(User.id).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email sudah terdaftar.")
    if data.nim and db.scalar(select(User.id).where(User.nim == data.nim)):
        raise HTTPException(status.HTTP_409_CONFLICT, "NIM sudah terdaftar.")
    user = User(
        name=data.name,
        email=email,
        nim=data.nim,
        password_hash=hash_password(data.password),
        role=ROLE_MEMBER,  # registrasi publik SELALU Anggota
        status=USER_ACTIVE,
        joined_at=date.today(),
    )
    db.add(user)
    db.commit()
    return TokenOut(access_token=create_access_token(user.id), user=member_out(user, user))


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    user = db.scalar(select(User).where(User.email == email))
    if user is None:
        burn_password_check(data.password)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, INVALID_LOGIN)
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, INVALID_LOGIN)
    if user.status != USER_ACTIVE:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Akun Anda tidak aktif. Hubungi pengurus.")
    return TokenOut(access_token=create_access_token(user.id), user=member_out(user, user))


@router.get("/me", response_model=MemberOut)
def me(user: User = Depends(get_current_user)):
    return member_out(user, user)


@router.post("/logout")
def logout(_: User = Depends(get_current_user)):
    # Token JWT bersifat stateless: logout dilakukan dengan menghapus token di aplikasi.
    return {"detail": "Logout berhasil. Hapus token di sisi aplikasi."}
