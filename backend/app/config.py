"""Konfigurasi aplikasi. Semua nilai rahasia dibaca dari environment variable (.env)."""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

MIN_SECRET_LENGTH = 32


class Settings:
    def __init__(self) -> None:
        self.secret_key: str = os.getenv("SECRET_KEY", "")
        self.database_url: str = os.getenv(
            "DATABASE_URL", f"sqlite:///{BASE_DIR / 'upm_chess.db'}"
        )
        self.access_token_expire_minutes: int = int(
            os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480")
        )
        self.bcrypt_rounds: int = max(4, min(15, int(os.getenv("BCRYPT_ROUNDS", "12"))))
        origins = os.getenv("CORS_ORIGINS", "*")
        self.cors_origins: list[str] = [o.strip() for o in origins.split(",") if o.strip()]
        # Akun Administrator awal (dibuat sekali jika belum ada admin).
        self.admin_email: str = os.getenv("ADMIN_EMAIL", "").strip().lower()
        self.admin_password: str = os.getenv("ADMIN_PASSWORD", "")
        self.admin_name: str = os.getenv("ADMIN_NAME", "Administrator UPM Chess Club")
        # Khusus demo di hosting gratis (disk sementara): isi data uji otomatis saat database masih kosong.
        self.seed_demo: bool = os.getenv("SEED_DEMO", "").strip().lower() in ("1", "true", "yes")

    def validate(self) -> None:
        if len(self.secret_key) < MIN_SECRET_LENGTH:
            raise RuntimeError(
                "SECRET_KEY belum diatur atau terlalu pendek (minimal 32 karakter). "
                "Jalankan `python scripts/init_env.py` untuk membuat file .env."
            )


settings = Settings()
