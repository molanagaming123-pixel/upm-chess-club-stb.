from types import SimpleNamespace

from app.services.ranking import compute_standings


def M(white, black, result):
    return SimpleNamespace(white_id=white, black_id=black, result=result)


# ---------- Unit: aturan poin & tie-break ----------
def test_points_win_draw_loss():
    rows = compute_standings({1: "Andi", 2: "Budi", 3: "Citra"}, [M(1, 2, "white_win"), M(2, 3, "draw"), M(3, 1, "black_win")])
    by = {r["name"]: r for r in rows}
    # Andi: menang (putih vs Budi) + menang (hitam vs Citra) = 6
    assert (by["Andi"]["points"], by["Andi"]["wins"], by["Andi"]["losses"], by["Andi"]["played"]) == (6, 2, 0, 2)
    # Budi: kalah + seri = 1
    assert (by["Budi"]["points"], by["Budi"]["draws"], by["Budi"]["losses"]) == (1, 1, 1)
    # Citra: seri + kalah = 1
    assert (by["Citra"]["points"], by["Citra"]["draws"], by["Citra"]["losses"]) == (1, 1, 1)
    assert by["Andi"]["rank"] == 1


def test_black_win_gives_points_to_black():
    rows = compute_standings({1: "W", 2: "B"}, [M(1, 2, "black_win")])
    by = {r["name"]: r for r in rows}
    assert (by["B"]["points"], by["B"]["wins"]) == (3, 1)
    assert (by["W"]["points"], by["W"]["losses"]) == (0, 1)


def test_unplayed_matches_are_ignored():
    rows = compute_standings({1: "A", 2: "B"}, [M(1, 2, None)])
    assert all(r["played"] == 0 and r["points"] == 0 for r in rows)


def test_tiebreak_more_wins_beats_more_draws_on_equal_points():
    # A: 1 menang = 3 poin. B: 3 seri = 3 poin. Poin sama → A (menang lebih banyak) di atas B.
    players = {1: "A", 2: "B", 3: "X", 4: "Y", 5: "Z", 6: "C"}
    matches = [M(1, 6, "white_win"), M(2, 3, "draw"), M(2, 4, "draw"), M(2, 5, "draw")]
    rows = compute_standings(players, matches)
    order = [r["name"] for r in rows]
    assert order.index("A") < order.index("B")
    a = next(r for r in rows if r["name"] == "A")
    b = next(r for r in rows if r["name"] == "B")
    assert a["points"] == b["points"] == 3 and a["wins"] > b["wins"]


def test_tiebreak_fewer_matches_then_name():
    players = {1: "Andi", 2: "Budi", 3: "Zaki", 4: "Xena", 5: "Yoga"}
    matches = [
        M(1, 4, "white_win"),  # Andi: 3 poin, 1 menang, main 1
        M(3, 2, "white_win"),  # Zaki: 3 poin, 1 menang, main 1
        M(2, 5, "white_win"),  # Budi: kalah dari Zaki + menang lawan Yoga → 3 poin, 1 menang, main 2
    ]
    rows = compute_standings(players, matches)
    assert [r["name"] for r in rows] == ["Andi", "Zaki", "Budi", "Xena", "Yoga"]
    assert [r["rank"] for r in rows] == [1, 2, 3, 4, 5]
    budi = next(r for r in rows if r["name"] == "Budi")
    assert budi["played"] == 2  # main lebih banyak → di bawah Andi & Zaki


def test_name_tiebreak_is_case_insensitive():
    rows = compute_standings({1: "budi", 2: "Andi"}, [])
    assert [r["name"] for r in rows] == ["Andi", "budi"]


# ---------- Integrasi lewat API ----------
def _rank_map(client, headers):
    return {r["name"]: r for r in client.get("/standings", headers=headers).json()}


def test_global_standings_via_api(client, admin_h, make_member, record):
    a, _ = make_member(name="Andi")
    b, _ = make_member(name="Budi")
    c, _ = make_member(name="Citra")
    record(a["id"], b["id"], "white_win")
    record(b["id"], c["id"], "draw")
    rows = client.get("/standings", headers=admin_h).json()
    # Budi & Citra sama-sama 1 poin dan 0 menang; Citra main 1x < Budi 2x → Citra di atas (tie-break #2)
    assert [r["name"] for r in rows] == ["Andi", "Citra", "Budi"]
    assert [r["points"] for r in rows] == [3, 1, 1]
    assert [r["played"] for r in rows] == [1, 1, 2]


def test_standings_update_after_edit_and_delete(client, admin_h, make_member, record):
    a, _ = make_member(name="Andi")
    b, _ = make_member(name="Budi")
    m = record(a["id"], b["id"], "white_win").json()
    s = _rank_map(client, admin_h)
    assert (s["Andi"]["points"], s["Budi"]["points"]) == (3, 0)

    client.patch(f"/matches/{m['id']}", json={"result": "black_win"}, headers=admin_h)
    s = _rank_map(client, admin_h)
    assert (s["Andi"]["points"], s["Budi"]["points"], s["Budi"]["rank"]) == (0, 3, 1)

    client.patch(f"/matches/{m['id']}", json={"result": "draw"}, headers=admin_h)
    s = _rank_map(client, admin_h)
    assert (s["Andi"]["points"], s["Budi"]["points"]) == (1, 1)

    client.patch(f"/matches/{m['id']}", json={"clear_result": True}, headers=admin_h)
    s = _rank_map(client, admin_h)
    assert (s["Andi"]["played"], s["Andi"]["points"]) == (0, 0)

    client.patch(f"/matches/{m['id']}", json={"result": "white_win"}, headers=admin_h)
    client.delete(f"/matches/{m['id']}", headers=admin_h)
    s = _rank_map(client, admin_h)
    assert all(v["played"] == 0 and v["points"] == 0 for v in s.values())


def test_inactive_member_keeps_history_in_ranking(client, admin_h, make_member, record):
    a, _ = make_member(name="Andi")
    b, _ = make_member(name="Budi")
    record(a["id"], b["id"], "white_win")
    client.patch(f"/members/{a['id']}", json={"status": "inactive"}, headers=admin_h)
    s = _rank_map(client, admin_h)
    assert s["Andi"]["points"] == 3  # riwayat tidak hilang karena status nonaktif


def test_player_stats_and_rank_history(client, admin_h, make_member, record):
    a, ha = make_member(name="Andi")
    b, _ = make_member(name="Budi")
    c, _ = make_member(name="Citra")
    record(a["id"], b["id"], "white_win", days_ago=10)
    record(c["id"], a["id"], "draw", days_ago=5)
    record(b["id"], a["id"], "white_win", days_ago=1)  # Andi kalah

    st = client.get(f"/members/{a['id']}/stats", headers=ha).json()
    assert (st["played"], st["wins"], st["draws"], st["losses"], st["points"]) == (3, 1, 1, 1, 4)
    assert st["rank"] is not None and st["total_ranked"] == 3
    assert len(st["recent_matches"]) == 3
    assert st["recent_matches"][0]["match_date"] >= st["recent_matches"][-1]["match_date"]  # terbaru dulu
    hist = st["rank_history"]
    assert [h["points"] for h in hist] == [3, 4, 4]
    assert [h["played"] for h in hist] == [1, 2, 3]
    assert hist[0]["rank"] == 1  # setelah pertandingan pertama Andi memimpin


def test_member_without_matches_has_no_rank_and_zero_stats(client, admin_h, make_member):
    a, _ = make_member(name="Pemula")
    st = client.get(f"/members/{a['id']}/stats", headers=admin_h).json()
    assert (st["played"], st["points"], st["rank"], st["rank_history"]) == (0, 0, None, [])


def test_dashboard_empty_state_and_real_values(client, admin_h, make_member, make_tournament, enroll, record):
    empty = client.get("/dashboard", headers=admin_h).json()
    assert empty["total_members"] == 0 and empty["total_matches"] == 0
    assert empty["upcoming_tournaments"] == [] and empty["recent_results"] == [] and empty["top_players"] == []

    a, _ = make_member(name="Andi")
    b, _ = make_member(name="Budi")
    make_member(name="Nonaktif Uji", status="inactive")
    t = make_tournament(name="Berjalan", status="ongoing")
    make_tournament(name="Mendatang", status="upcoming")
    enroll(t["id"], a["id"]); enroll(t["id"], b["id"])
    record(a["id"], b["id"], "white_win", tournament=t["id"], round_no=1)
    record(a["id"], b["id"], None, days_ago=0)  # terjadwal tanpa hasil

    d = client.get("/dashboard", headers=admin_h).json()
    assert d["total_members"] == 3 and d["active_members"] == 2
    assert d["active_tournaments"] == 1
    assert d["total_matches"] == 2 and d["completed_matches"] == 1
    assert [x["name"] for x in d["upcoming_tournaments"]] == ["Mendatang"]
    assert len(d["recent_results"]) == 1
    assert d["top_players"][0]["name"] == "Andi"
