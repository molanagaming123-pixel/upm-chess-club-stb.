"""Titik masuk untuk Vercel (dan hosting serverless lain).

Memuat aplikasi sebagai paket `app`, sehingga impor relatif di app/main.py berfungsi.
"""
from app.main import app  # noqa: F401
