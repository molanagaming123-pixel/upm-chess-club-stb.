from datetime import date, timedelta


def test_record_tournament_match_and_friendly_match(client, admin_h, make_member, make_tournament, enroll, record):
    a, _ = make_member(name="Andi")
    b, _ = make_member(name="Budi")
    t = make_tournament()
    enroll(t["id"], a["id"]); enroll(t["id"], b["id"])

    r = record(a["id"], b["id"], "white_win", tournament=t["id"], round_no=1)
    assert r.status_code == 201
    m = r.json()
    assert m["kind"] == "turnamen" and m["white_name"] == "Andi" and m["black_name"] == "Budi" and m["result"] == "white_win"

    f = record(b["id"], a["id"], "draw")  # persahabatan: tidak perlu turnamen/ronde
    assert f.status_code == 201 and f.json()["kind"] == "persahabatan" and f.json()["round"] is None

    assert len(client.get("/matches", headers=admin_h).json()) == 2
    assert len(client.get(f"/matches?tournament_id={t['id']}", headers=admin_h).json()) == 1
    assert len(client.get("/matches?kind=persahabatan", headers=admin_h).json()) == 1
    assert len(client.get(f"/matches?user_id={a['id']}", headers=admin_h).json()) == 2


def test_player_cannot_play_themselves(client, make_member, record):
    a, _ = make_member(name="Sendiri")
    r = record(a["id"], a["id"], "draw")
    assert r.status_code == 422 and "dirinya sendiri" in r.json()["detail"]


def test_inactive_or_unknown_players_rejected(client, make_member, record):
    a, _ = make_member(name="Aktif")
    off, _ = make_member(name="Nonaktif", status="inactive")
    assert record(a["id"], off["id"], "draw").status_code == 422
    assert record(a["id"], 99999, "draw").status_code == 404


def test_tournament_match_requires_approved_participants(client, admin_h, make_member, make_tournament, enroll, record):
    a, _ = make_member(name="Peserta")
    outsider, _ = make_member(name="Bukan Peserta")
    pending, hp = make_member(name="Masih Pending")
    t = make_tournament(status="upcoming")
    enroll(t["id"], a["id"])
    client.post(f"/tournaments/{t['id']}/register", headers=hp)  # pending, belum disetujui

    assert record(a["id"], outsider["id"], None, tournament=t["id"], round_no=1).status_code == 422
    assert record(a["id"], pending["id"], None, tournament=t["id"], round_no=1).status_code == 422


def test_tournament_match_needs_round_and_friendly_must_not_have_one(client, admin_h, make_member, make_tournament, enroll, record):
    a, _ = make_member(name="Pemain A")
    b, _ = make_member(name="Pemain B")
    t = make_tournament()
    enroll(t["id"], a["id"]); enroll(t["id"], b["id"])
    assert record(a["id"], b["id"], None, tournament=t["id"], round_no=None).status_code == 422
    friendly_with_round = client.post(
        "/matches",
        json={"white_id": a["id"], "black_id": b["id"], "match_date": str(date.today()), "round": 2},
        headers=admin_h,
    )
    assert friendly_with_round.status_code == 422
    assert client.post("/matches", json={"white_id": a["id"], "black_id": b["id"], "match_date": str(date.today()), "tournament_id": 9999, "round": 1}, headers=admin_h).status_code == 404


def test_same_round_conflict_is_rejected(client, make_member, make_tournament, enroll, record):
    a, _ = make_member(name="Pemain A")
    b, _ = make_member(name="Pemain B")
    c, _ = make_member(name="Pemain C")
    d, _ = make_member(name="Pemain D")
    t = make_tournament()
    for m in (a, b, c, d):
        enroll(t["id"], m["id"])
    assert record(a["id"], b["id"], None, tournament=t["id"], round_no=1).status_code == 201
    clash = record(a["id"], c["id"], None, tournament=t["id"], round_no=1)  # A main dua kali di ronde 1
    assert clash.status_code == 409 and "ronde 1" in clash.json()["detail"]
    assert record(c["id"], d["id"], None, tournament=t["id"], round_no=1).status_code == 201
    assert record(a["id"], c["id"], None, tournament=t["id"], round_no=2).status_code == 201  # ronde lain boleh


def test_duplicate_pairing_in_same_tournament_rejected(client, make_member, make_tournament, enroll, record):
    a, _ = make_member(name="Pemain A")
    b, _ = make_member(name="Pemain B")
    t = make_tournament()
    enroll(t["id"], a["id"]); enroll(t["id"], b["id"])
    assert record(a["id"], b["id"], None, tournament=t["id"], round_no=1).status_code == 201
    again = record(b["id"], a["id"], None, tournament=t["id"], round_no=2)  # urutan warna dibalik tetap pasangan sama
    assert again.status_code == 409


def test_match_date_must_be_inside_tournament_range(client, admin_h, make_member, make_tournament, enroll):
    a, _ = make_member(name="Pemain A")
    b, _ = make_member(name="Pemain B")
    today = date.today()
    t = make_tournament(start=today - timedelta(days=3), end=today + timedelta(days=3))
    enroll(t["id"], a["id"]); enroll(t["id"], b["id"])
    for bad in (today - timedelta(days=10), today + timedelta(days=10)):
        r = client.post(
            "/matches",
            json={"white_id": a["id"], "black_id": b["id"], "match_date": str(bad), "tournament_id": t["id"], "round": 1},
            headers=admin_h,
        )
        assert r.status_code == 422, bad


def test_result_cannot_be_recorded_for_future_date_but_schedule_can(client, admin_h, make_member, make_tournament, enroll):
    a, _ = make_member(name="Pemain A")
    b, _ = make_member(name="Pemain B")
    t = make_tournament()
    enroll(t["id"], a["id"]); enroll(t["id"], b["id"])
    future = str(date.today() + timedelta(days=5))
    body = {"white_id": a["id"], "black_id": b["id"], "match_date": future, "tournament_id": t["id"], "round": 1}
    assert client.post("/matches", json={**body, "result": "white_win"}, headers=admin_h).status_code == 422
    sched = client.post("/matches", json=body, headers=admin_h)  # dijadwalkan tanpa hasil
    assert sched.status_code == 201 and sched.json()["result"] is None


def test_finished_tournament_blocks_new_matches_but_allows_result_correction(client, admin_h, make_member, make_tournament, enroll, record):
    a, _ = make_member(name="Pemain A")
    b, _ = make_member(name="Pemain B")
    c, _ = make_member(name="Pemain C")
    t = make_tournament()
    for m in (a, b, c):
        enroll(t["id"], m["id"])
    m1 = record(a["id"], b["id"], "white_win", tournament=t["id"], round_no=1).json()
    client.patch(f"/tournaments/{t['id']}", json={"status": "finished"}, headers=admin_h)

    assert record(a["id"], c["id"], None, tournament=t["id"], round_no=2).status_code == 409
    fix = client.patch(f"/matches/{m1['id']}", json={"result": "draw"}, headers=admin_h)
    assert fix.status_code == 200 and fix.json()["result"] == "draw"


def test_invalid_result_value_and_missing_fields(client, admin_h, make_member):
    a, _ = make_member(name="Pemain A")
    b, _ = make_member(name="Pemain B")
    bad = client.post("/matches", json={"white_id": a["id"], "black_id": b["id"], "match_date": "2026-01-01", "result": "menang"}, headers=admin_h)
    assert bad.status_code == 422
    assert client.post("/matches", json={"white_id": a["id"]}, headers=admin_h).status_code == 422


def test_update_result_and_clear_result(client, admin_h, make_member, record):
    a, _ = make_member(name="Pemain A")
    b, _ = make_member(name="Pemain B")
    m = record(a["id"], b["id"], None).json()  # belum ada hasil
    r = client.patch(f"/matches/{m['id']}", json={"result": "black_win"}, headers=admin_h)
    assert r.status_code == 200 and r.json()["result"] == "black_win"
    r = client.patch(f"/matches/{m['id']}", json={"clear_result": True}, headers=admin_h)
    assert r.status_code == 200 and r.json()["result"] is None
    both = client.patch(f"/matches/{m['id']}", json={"result": "draw", "clear_result": True}, headers=admin_h)
    assert both.status_code == 422
    assert client.patch("/matches/9999", json={"result": "draw"}, headers=admin_h).status_code == 404


def test_update_match_revalidates_conflicts(client, admin_h, make_member, make_tournament, enroll, record):
    a, _ = make_member(name="Pemain A")
    b, _ = make_member(name="Pemain B")
    c, _ = make_member(name="Pemain C")
    d, _ = make_member(name="Pemain D")
    t = make_tournament()
    for m in (a, b, c, d):
        enroll(t["id"], m["id"])
    record(a["id"], b["id"], None, tournament=t["id"], round_no=1)
    m2 = record(c["id"], d["id"], None, tournament=t["id"], round_no=2).json()
    # pindahkan pertandingan C-D ke ronde 1 → aman, A dan B tidak terlibat
    assert client.patch(f"/matches/{m2['id']}", json={"round": 1}, headers=admin_h).status_code == 200
    # ganti lawan jadi A → A sudah main di ronde 1
    assert client.patch(f"/matches/{m2['id']}", json={"white_id": a["id"]}, headers=admin_h).status_code == 409
    assert client.patch(f"/matches/{m2['id']}", json={"white_id": d["id"]}, headers=admin_h).status_code == 422  # melawan diri sendiri


def test_delete_match(client, admin_h, make_member, record):
    a, _ = make_member(name="Pemain A")
    b, _ = make_member(name="Pemain B")
    m = record(a["id"], b["id"], "draw").json()
    assert client.delete(f"/matches/{m['id']}", headers=admin_h).status_code == 204
    assert client.get(f"/matches/{m['id']}", headers=admin_h).status_code == 404
    assert client.delete(f"/matches/{m['id']}", headers=admin_h).status_code == 404
