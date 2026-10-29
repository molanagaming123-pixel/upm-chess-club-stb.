# UPM Chess Club — Aplikasi Manajemen Klub Catur (RPL Kelompok 7)

Aplikasi mobile untuk mengelola UPM Chess Club Universitas Satya Terra Bhinneka:
anggota, turnamen, peserta, pairing/pertandingan, hasil, peringkat otomatis, dan statistik pemain.
**Bukan game catur online.**

Dikembangkan oleh **Kelompok 7, Teknik Informatika, Universitas Satya Terra Bhinneka**.

**Stack:** Expo (React Native + TypeScript) · FastAPI · SQLite (SQLAlchemy) · JWT + bcrypt.
SQLite dipilih karena tanpa instalasi/biaya dan datanya persisten di satu file; cukup untuk skala klub.

## Tampilan (UI/UX) — revisi terbaru
- **Palet baru** selaras logo ST Bhinneka: biru tua, emas (kuning busur atas), hijau daun (emblema tengah), merah (busur bawah), plus mode terang & gelap.
- **Logo STB** (`frontend/assets/logo-stb.png`) dipasang di layar login, splash, Beranda, dan halaman "Tentang".
- **Beranda:** kartu statistik gradasi berikon, podium 3 besar, kartu turnamen bergaya papan skor.
- **Peringkat:** podium medali (🥇🥈🥉) + avatar inisial + panah naik/turun di detail anggota.
- **Turnamen & pertandingan:** kartu papan skor, lencana status, titik hijau berkedip untuk turnamen "Berlangsung".
- **Login:** latar motif papan catur halus + animasi fade-in logo.
- **Animasi ringan, skeleton loading, haptic feedback (getaran ringan saat tekan tombol), ikon seragam.**
- Dioptimalkan agar tetap ringan di HP murah (tanpa dependensi native berat; `expo-linear-gradient` dan `expo-haptics` dipasang sebagai paket Expo SDK 58, tanpa config plugin di `app.json` agar `expo export` tetap lancar).

## Struktur
```
backend/    FastAPI: auth, RBAC, anggota, turnamen, pertandingan, peringkat  (+ tests/)
frontend/   Expo app: Beranda, Anggota, Turnamen, Peringkat, Profil + Tentang
```

## Menjalankan backend
```bash
cd backend
python -m venv .venv && .venv\Scripts\activate     # Windows
pip install -r requirements.txt
python scripts/init_env.py        # membuat .env + secret acak + akun admin (password tampil SEKALI)
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Dokumentasi API otomatis: http://localhost:8000/docs

Data uji untuk demo (opsional, semua bertanda "[UJI]", bukan data klub asli):
`python -m scripts.seed_demo` (password akun uji: `DemoUji123`). Hapus dengan menghapus `upm_chess.db`.

## Menjalankan frontend
```bash
cd frontend
npm install
cp .env.example .env     # isi EXPO_PUBLIC_API_URL (lihat di bawah)
npx expo start
```
`localhost` di HP/emulator Android **bukan** laptop Anda:

| Perangkat | EXPO_PUBLIC_API_URL |
|---|---|
| Emulator Android | `http://10.0.2.2:8000` |
| HP fisik (Wi-Fi sama dengan laptop) | `http://<IP-LAN-laptop>:8000` |
| Server publik | `https://alamat-server` |

## Verifikasi (hasil nyata)
| Pengujian | Hasil |
|---|---|
| Tes backend otomatis (`cd backend && pytest`) | 58 lulus |
| `npx tsc --noEmit` frontend | bersih |
| Bundle Android (`npx expo export --platform android`) | berhasil (`dist/`) |
| Bundle Web (`npx expo export --platform web`) | berhasil (`dist/`) |

## Membangun APK (di komputer Anda)
Butuh akun Expo gratis. Isi URL backend di `frontend/eas.json` (`profiles.preview.env`), lalu:
```bash
cd frontend
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile preview     # hasil: link unduh APK
```
Backend harus bisa dijangkau dari HP saat demo (satu Wi-Fi, atau di-host publik).
`usesCleartextTraffic` aktif agar `http://` LAN berfungsi untuk demo; matikan jika memakai HTTPS.

## Aturan inti (sesuai kebutuhan ketua UPM)
- Pendaftaran biasa selalu jadi **Anggota**; Administrator hanya dari `.env`/dibuat admin. Hak akses dicek di backend.
- Peringkat: Menang 3, Seri 1, Kalah 0. Tie-break: menang terbanyak → main paling sedikit → nama A–Z.
- Anti-bentrok: satu pemain tidak boleh main dua kali di ronde yang sama; pasangan yang sama tidak boleh bertemu dua kali di satu turnamen; tanggal harus dalam rentang turnamen.
- Pairing **manual terstruktur** (dengan daftar "belum punya lawan" per ronde), bukan otomatis — format & aturan klub belum diketahui.
- Anggota/turnamen yang punya riwayat tidak bisa dihapus (anggota cukup dinonaktifkan).

## Status pengujian (hasil nyata, 26 Okt 2026)
- 58 tes backend lulus.
- `tsc --noEmit` bersih.
- Bundle Android & Web berhasil.
- Uji browser end-to-end lulus (login admin → buat turnamen → peserta → hasil → klasemen).

**Belum dilakukan:** APK belum di-build/diuji di perangkat atau emulator Android; uji sebagai peran Anggota lewat UI belum dijalankan (hak akses Anggota teruji di tes backend); belum ada uji dengan pengguna nyata.

## Keterbatasan
Tanpa Elo, tanpa pairing otomatis (Swiss/round-robin), tanpa notifikasi, tanpa reset kata sandi, SQLite (bukan multi-server).
## Revisi tampilan (UI) — status 29 Okt 2026
Diperiksa ulang setelah revisi: `tsc --noEmit` bersih, `expo export --platform android` berhasil, uji browser (login admin, Beranda, Anggota,
Turnamen, Peringkat, Profil) tanpa error JS, `pytest` 58 lulus, backend tidak berubah.
Perbaikan setelah pemeriksaan: medali podium dibungkus `Text` (sebelumnya berpotensi crash di Android), kontras teks podium, lebar kartu statistik,
tata letak kartu anggota, lencana "Ditolak" yang muncul keliru untuk admin.
Simbol logo ST Bhinneka (dari Anda, tanpa tulisan, dipotong bulat) terpasang di layar login, Beranda, Tentang, splash, dan ikon aplikasi. Sumber logo beresolusi rendah (425 px); ganti `frontend/assets/logo-stb.png` dengan versi lebih tajam bila ada.
**Belum:** belum diuji di HP/emulator Android.

## Hosting backend online (Render, paket gratis) — untuk demo
1. Unggah folder proyek ke repositori GitHub (jangan sertakan `.env` dan `*.db`; sudah ada di `.gitignore`).
2. Di Render: New > Blueprint (memakai `render.yaml`), atau New > Web Service manual: Root Directory `backend`,
   Build `pip install -r requirements.txt`, Start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, Health Check `/health`.
3. Environment: `SECRET_KEY` (acak, >= 32 karakter), `ADMIN_EMAIL`, `ADMIN_PASSWORD` (>= 8 karakter, buat sendiri), `SEED_DEMO=1` (opsional, data uji).
4. Salin URL layanan (`https://....onrender.com`) ke `frontend/eas.json` (`EXPO_PUBLIC_API_URL`), lalu build APK.

**Batasan paket gratis (sesuai dokumentasi Render, dicek 29 Okt 2026):** server tidur setelah 15 menit tanpa permintaan dan butuh sekitar 1 menit
untuk bangun; file SQLite **hilang** setiap server restart/tidur/redeploy. Karena itu `SEED_DEMO=1` mengisi ulang data uji, tetapi data yang
dimasukkan saat demo ikut hilang saat server tidur. Layak untuk demo, **bukan untuk data klub sungguhan**. Untuk pemakaian nyata perlu database
persisten (mis. Postgres) atau disk berbayar. Akun uji memakai password publik (`DemoUji123`): matikan `SEED_DEMO` setelah demo.
