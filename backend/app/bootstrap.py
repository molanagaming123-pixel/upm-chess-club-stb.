"""Pembuatan akun Administrator awal. Admin TIDAK dapat dibuat lewat registrasi publik."""
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import settings
from .models import ROLE_ADMIN, USER_ACTIVE, User
from .security import hash_password


def ensure_admin(db: Session) -> str:
    """Buat admin dari ADMIN_EMAIL/ADMIN_PASSWORD (.env) jika belum ada admin sama sekali."""
    if db.scalar(select(User.id).where(User.role == ROLE_ADMIN).limit(1)):
        return "Administrator sudah ada; tidak ada perubahan."
    if not settings.admin_email or not settings.admin_password:
        return "ADMIN_EMAIL/ADMIN_PASSWORD belum diatur; admin belum dibuat."
    if len(settings.admin_password) < 8:
        return "ADMIN_PASSWORD minimal 8 karakter; admin belum dibuat."
    if db.scalar(select(User.id).where(User.email == settings.admin_email)):
        return "Email ADMIN_EMAIL sudah dipakai akun non-admin; admin belum dibuat."
    db.add(
        User(
            name=settings.admin_name,
            email=settings.admin_email,
            password_hash=hash_password(settings.admin_password),
            role=ROLE_ADMIN,
            status=USER_ACTIVE,
            joined_at=date.today(),
        )
    )
    db.commit()
    return f"Administrator dibuat: {settings.admin_email}"
