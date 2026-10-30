import logging
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from starlette.concurrency import run_in_threadpool

from . import models  # noqa: F401  (mendaftarkan tabel ke Base.metadata)
from .bootstrap import ensure_admin
from .config import settings
from .database import Base, SessionLocal, engine
from .routers import auth, matches, members, standings, tournaments

logger = logging.getLogger("upm_chess")


_ready = False
_init_lock = threading.Lock()


def init_app() -> None:
    """Buat tabel + admin awal. Aman dipanggil berulang (idempoten) dan dari beberapa instance sekaligus."""
    global _ready
    if _ready:
        return
    with _init_lock:
        if _ready:
            return
        settings.validate()
        Base.metadata.create_all(bind=engine)
        try:
            with SessionLocal() as db:
                logger.warning(ensure_admin(db))
        except IntegrityError:  # instance lain sudah membuat admin di saat yang sama
            logger.warning("Administrator sudah dibuat oleh proses lain.")
        _ready = True


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_app()
    if settings.seed_demo:
        # Hosting gratis memakai disk sementara: database kosong tiap server bangun, jadi data uji diisi ulang.
        try:
            from scripts import seed_demo

            seed_demo.main()
        except SystemExit:
            pass  # sudah ada anggota; tidak ada yang diubah
    yield


app = FastAPI(title="UPM Chess Club API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,  # autentikasi memakai header Bearer, bukan cookie
    allow_methods=["*"],
    allow_headers=["*"],
)

_MESSAGES = {
    "missing": "wajib diisi",
    "string_too_short": "terlalu pendek",
    "string_too_long": "terlalu panjang",
    "date_from_datetime_parsing": "format tanggal tidak valid (gunakan TTTT-BB-HH, mis. 2026-11-30)",
    "date_parsing": "format tanggal tidak valid (gunakan TTTT-BB-HH, mis. 2026-11-30)",
    "int_parsing": "harus berupa angka",
    "greater_than_equal": "nilai terlalu kecil",
    "less_than_equal": "nilai terlalu besar",
    "literal_error": "nilai tidak diperbolehkan",
}


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        field = ".".join(str(p) for p in err["loc"] if p not in ("body", "query", "path"))
        etype = err["type"]
        if etype == "value_error":
            msg = str(err.get("msg", "")).replace("Value error, ", "")
        elif "email" in str(err.get("msg", "")).lower():
            msg = "format email tidak valid"
        else:
            msg = _MESSAGES.get(etype, "tidak valid")
        errors.append({"field": field, "message": msg})
    summary = "; ".join(f"{e['field']}: {e['message']}" if e["field"] else e["message"] for e in errors)
    return JSONResponse(status_code=422, content={"detail": f"Data tidak valid — {summary}", "errors": errors})


@app.exception_handler(Exception)
async def unhandled_handler(_: Request, exc: Exception):
    logger.exception("Kesalahan tak terduga", exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": "Terjadi kesalahan pada server."})


@app.middleware("http")
async def ensure_ready(request: Request, call_next):
    # Di Vercel (serverless) event lifespan tidak dijamin berjalan, jadi inisialisasi dilakukan saat permintaan pertama.
    if not _ready and request.url.path != "/health":
        try:
            await run_in_threadpool(init_app)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Inisialisasi aplikasi gagal", exc_info=exc)
            return JSONResponse(
                status_code=503,
                content={"detail": "Server belum siap. Periksa konfigurasi database dan variabel lingkungan."},
            )
    return await call_next(request)


@app.get("/health", tags=["Sistem"])
def health():
    return {"status": "ok"}


@app.get("/health/db", tags=["Sistem"])
def health_db():
    """Cek koneksi database. Hanya menampilkan jenis galat, tidak pernah menampilkan alamat/kata sandi."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"database": "ok", "dialect": engine.dialect.name}
    except Exception as exc:  # noqa: BLE001
        logger.exception("Cek database gagal", exc_info=exc)
        return JSONResponse(status_code=503, content={"database": "gagal", "jenis_galat": type(exc).__name__})


for r in (auth.router, members.router, tournaments.router, matches.router, standings.router):
    app.include_router(r)
