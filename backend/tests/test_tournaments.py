from datetime import date, timedelta


def test_create_and_update_tournament(client, admin_h):
    r = client.post(
        "/tournaments",
        json={"name": "  Kejuaraan   Kampus ", "start_date": "2026-12-01", "end_date": "2026-12-03", "location": "Aula"},
        headers=admin_h,
    )
    assert r.status_code == 201
    t = r.json()
    assert t["name"] == "Kejuaraan Kampus" and t["status"] == "upcoming" and t["participant_count"] == 0

    r = client.patch(f"/tournaments/{t['id']}", json={"name": "Kejuaraan Terbuka", "status": "ongoing", "location": "Lab 3"}, headers=admin_h)
    assert r.status_code == 200
    assert r.json()["name"] == "Kejuaraan Terbuka" and r.json()["status"] == "ongoing" and r.json()["location"] == "Lab 3"


def test_tournament_date_validation(client, admin_h, make_tournament):
    bad = client.post("/tournaments", json={"name": "Salah Tanggal", "start_date": "2026-12-05", "end_date": "2026-12-01"}, headers=admin_h)
    assert bad.status_code == 422
    t = make_tournament()
    start = date.fromisoformat(t["start_date"])
    r = client.patch(f"/tournaments/{t['id']}", json={"end_date": str(start - timedelta(days=1))}, headers=admin_h)
    assert r.status_code == 422
    assert client.patch(f"/tournaments/{t['id']}", json={"name": None}, headers=admin_h).status_code == 422
    assert client.post("/tournaments", json={"name": "Xx", "start_date": "2026-12-01", "end_date": "2026-12-01"}, headers=admin_h).status_code == 422
    assert client.post("/tournaments", json={"name": "Tgl Aneh", "start_date": "bukan-tanggal", "end_date": "2026-12-01"}, headers=admin_h).status_code == 422


def test_add_participant_rules(client, admin_h, make_member, make_tournament, enroll):
    a, _ = make_member(name="Peserta A")
    off, _ = make_member(name="Nonaktif", status="inactive")
    t = make_tournament()

    assert enroll(t["id"], a["id"])["status"] == "approved"
    dup = client.post(f"/tournaments/{t['id']}/participants", json={"user_id": a["id"]}, headers=admin_h)
    assert dup.status_code == 409  # tidak boleh ganda
    assert client.post(f"/tournaments/{t['id']}/participants", json={"user_id": off["id"]}, headers=admin_h).status_code == 422
    assert client.post(f"/tournaments/{t['id']}/participants", json={"user_id": 9999}, headers=admin_h).status_code == 404
    assert client.post("/tournaments/9999/participants", json={"user_id": a["id"]}, headers=admin_h).status_code == 404
    assert client.get(f"/tournaments/{t['id']}", headers=admin_h).json()["participant_count"] == 1


def test_finished_tournament_rejects_new_participants(client, admin_h, make_member, make_tournament):
    a, _ = make_member(name="Terlambat")
    t = make_tournament(status="finished")
    r = client.post(f"/tournaments/{t['id']}/participants", json={"user_id": a["id"]}, headers=admin_h)
    assert r.status_code == 409


def test_member_self_registration_flow(client, admin_h, make_member, make_tournament):
    a, ha = make_member(name="Pendaftar")
    upcoming = make_tournament(name="Akan Datang", status="upcoming")
    ongoing = make_tournament(name="Sedang Berjalan", status="ongoing")

    r = client.post(f"/tournaments/{upcoming['id']}/register", headers=ha)
    assert r.status_code == 201 and r.json()["status"] == "pending"
    assert client.post(f"/tournaments/{upcoming['id']}/register", headers=ha).status_code == 409
    assert client.post(f"/tournaments/{ongoing['id']}/register", headers=ha).status_code == 409

    # status pendaftaran terlihat oleh anggota; belum dihitung sebagai peserta resmi
    seen = client.get(f"/tournaments/{upcoming['id']}", headers=ha).json()
    assert seen["my_registration"] == "pending" and seen["participant_count"] == 0
    assert client.get(f"/tournaments/{upcoming['id']}/participants", headers=ha).json() == []

    # pengurus yang memutuskan
    ap = client.patch(f"/tournaments/{upcoming['id']}/participants/{a['id']}", json={"status": "approved"}, headers=admin_h)
    assert ap.status_code == 200 and ap.json()["status"] == "approved"
    seen = client.get(f"/tournaments/{upcoming['id']}", headers=ha).json()
    assert seen["my_registration"] == "approved" and seen["participant_count"] == 1


def test_admin_can_reject_registration(client, admin_h, make_member, make_tournament):
    a, ha = make_member(name="Ditolak")
    t = make_tournament(status="upcoming")
    client.post(f"/tournaments/{t['id']}/register", headers=ha)
    r = client.patch(f"/tournaments/{t['id']}/participants/{a['id']}", json={"status": "rejected"}, headers=admin_h)
    assert r.json()["status"] == "rejected"
    assert client.get(f"/tournaments/{t['id']}", headers=ha).json()["my_registration"] == "rejected"
    assert client.get(f"/tournaments/{t['id']}", headers=ha).json()["participant_count"] == 0


def test_remove_participant_blocked_when_matches_exist(client, admin_h, make_member, make_tournament, enroll, record):
    a, _ = make_member(name="P1")
    b, _ = make_member(name="P2")
    c, _ = make_member(name="P3")
    t = make_tournament()
    for m in (a, b, c):
        enroll(t["id"], m["id"])
    assert record(a["id"], b["id"], "draw", tournament=t["id"], round_no=1).status_code == 201

    assert client.delete(f"/tournaments/{t['id']}/participants/{a['id']}", headers=admin_h).status_code == 409
    assert client.patch(f"/tournaments/{t['id']}/participants/{a['id']}", json={"status": "rejected"}, headers=admin_h).status_code == 409
    assert client.delete(f"/tournaments/{t['id']}/participants/{c['id']}", headers=admin_h).status_code == 204


def test_delete_tournament_blocked_when_it_has_matches(client, admin_h, make_member, make_tournament, enroll, record):
    a, _ = make_member(name="P1")
    b, _ = make_member(name="P2")
    t = make_tournament()
    empty = make_tournament(name="Kosong")
    enroll(t["id"], a["id"]); enroll(t["id"], b["id"])
    record(a["id"], b["id"], None, tournament=t["id"], round_no=1)
    assert client.delete(f"/tournaments/{t['id']}", headers=admin_h).status_code == 409
    assert client.delete(f"/tournaments/{empty['id']}", headers=admin_h).status_code == 204


def test_changing_dates_cannot_orphan_existing_matches(client, admin_h, make_member, make_tournament, enroll, record):
    a, _ = make_member(name="P1")
    b, _ = make_member(name="P2")
    t = make_tournament()
    enroll(t["id"], a["id"]); enroll(t["id"], b["id"])
    record(a["id"], b["id"], "white_win", tournament=t["id"], round_no=1, days_ago=2)
    r = client.patch(f"/tournaments/{t['id']}", json={"start_date": str(date.today()), "end_date": str(date.today())}, headers=admin_h)
    assert r.status_code == 409


def test_rounds_and_unpaired_helper(client, admin_h, make_member, make_tournament, enroll, record):
    ps = [make_member(name=f"Peserta {i}")[0] for i in range(4)]
    t = make_tournament()
    for p in ps:
        enroll(t["id"], p["id"])
    record(ps[0]["id"], ps[1]["id"], "white_win", tournament=t["id"], round_no=1)

    free = client.get(f"/tournaments/{t['id']}/rounds/1/unpaired", headers=admin_h).json()
    assert sorted(x["user_id"] for x in free) == sorted([ps[2]["id"], ps[3]["id"]])
    assert len(client.get(f"/tournaments/{t['id']}/rounds/2/unpaired", headers=admin_h).json()) == 4

    rounds = client.get(f"/tournaments/{t['id']}/rounds", headers=admin_h).json()
    assert len(rounds) == 1 and rounds[0]["round"] == 1 and len(rounds[0]["matches"]) == 1


def test_tournament_standings_only_count_that_tournament(client, admin_h, make_member, make_tournament, enroll, record):
    a, _ = make_member(name="Andi")
    b, _ = make_member(name="Budi")
    t1 = make_tournament(name="Turnamen Satu")
    t2 = make_tournament(name="Turnamen Dua")
    for t in (t1, t2):
        enroll(t["id"], a["id"]); enroll(t["id"], b["id"])
    record(a["id"], b["id"], "white_win", tournament=t1["id"], round_no=1)
    record(a["id"], b["id"], "draw", tournament=t2["id"], round_no=1)
    record(b["id"], a["id"], "white_win")  # persahabatan, tidak masuk klasemen turnamen

    s1 = {r["name"]: r for r in client.get(f"/tournaments/{t1['id']}/standings", headers=admin_h).json()}
    s2 = {r["name"]: r for r in client.get(f"/tournaments/{t2['id']}/standings", headers=admin_h).json()}
    assert (s1["Andi"]["points"], s1["Budi"]["points"]) == (3, 0)
    assert (s2["Andi"]["points"], s2["Budi"]["points"]) == (1, 1)
