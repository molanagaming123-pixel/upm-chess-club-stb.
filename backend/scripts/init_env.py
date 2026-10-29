"""Membuat file backend/.env dengan secret acak. Tidak menimpa .env yang sudah ada.

Jalankan:  python scripts/init_env.py
Password admin dibuat acak dan ditampilkan SEKALI di terminal ini. Simpan sendiri.
"""
import secrets
from pathlib import Path

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"


def main() -> None:
    if ENV_PATH.exists():
        print(f".env sudah ada di {ENV_PATH}. Tidak ada yang diubah.")
        return
    secret = secrets.token_urlsafe(48)
    admin_password = secrets.token_urlsafe(9) + "7a"  # pasti mengandung huruf & angka
    ENV_PATH.write_text(
        "\n".join(
            [
                f"SECRET_KEY={secret}",
                "ACCESS_TOKEN_EXPIRE_MINUTES=480",
                "CORS_ORIGINS=*",
                "ADMIN_NAME=Administrator UPM Chess Club",
                "ADMIN_EMAIL=admin@example.com",
                f"ADMIN_PASSWORD={admin_password}",
                "",
            ]
        ),
        encoding="utf-8",
    )
    ENV_PATH.chmod(0o600)
    print(f".env dibuat: {ENV_PATH}")
    print("Login Administrator awal:")
    print("  email    : admin@example.com   (ubah di .env sebelum backend pertama kali dijalankan)")
    print(f"  password : {admin_password}")
    print("Password ini hanya ditampilkan sekali di sini; juga tersimpan di file .env (jangan di-commit).")


if __name__ == "__main__":
    main()
