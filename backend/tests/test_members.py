from conftest import MEMBER_PW


def test_admin_add_edit_and_list_members(client, admin_h):
    r = client.post(
        "/members",
        json={"name": "  Citra   Lestari ", "email": "Citra@Example.com", "password": MEMBER_PW, "nim": "2201002"},
        headers=admin_h,
    )
    assert r.status_code == 201
    m = r.json()
    assert m["name"] == "Citra Lestari" and m["email"] == "citra@example.com" and m["role"] == "member"

    r = client.patch(f"/members/{m['id']}", json={"name": "Citra L.", "nim": None}, headers=admin_h)
    assert r.status_code == 200 and r.json()["name"] == "Citra L." and r.json()["nim"] is None

    lst = client.get("/members", headers=admin_h).json()
    assert [x["name"] for x in lst] == ["Citra L."]  # admin tidak ikut daftar anggota


def test_email_and_nim_must_be_unique(client, admin_h, make_member):
    a, _ = make_member(name="Pemain A", email="a@example.com", nim="1111")
    b, _ = make_member(name="Pemain B", email="b@example.com", nim="2222")
    dup_email = client.post("/members", json={"name": "Citra", "email": "A@example.com", "password": MEMBER_PW}, headers=admin_h)
    dup_nim = client.post("/members", json={"name": "Citra", "email": "c@example.com", "password": MEMBER_PW, "nim": "1111"}, headers=admin_h)
    assert dup_email.status_code == 409 and dup_nim.status_code == 409
    assert client.patch(f"/members/{b['id']}", json={"email": "a@example.com"}, headers=admin_h).status_code == 409
    assert client.patch(f"/members/{b['id']}", json={"nim": "1111"}, headers=admin_h).status_code == 409
    # mengisi ulang NIM miliknya sendiri tidak dianggap duplikat
    assert client.patch(f"/members/{b['id']}", json={"nim": "2222"}, headers=admin_h).status_code == 200


def test_member_email_validation(client, admin_h):
    r = client.post("/members", json={"name": "Xavier", "email": "bukanemail", "password": MEMBER_PW}, headers=admin_h)
    assert r.status_code == 422


def test_manage_member_status_and_filters(client, admin_h, make_member):
    a, _ = make_member(name="Aktif Satu")
    b, _ = make_member(name="Akan Nonaktif")
    r = client.patch(f"/members/{b['id']}", json={"status": "inactive"}, headers=admin_h)
    assert r.json()["status"] == "inactive"
    active = client.get("/members?status=active", headers=admin_h).json()
    inactive = client.get("/members?status=inactive", headers=admin_h).json()
    assert [x["id"] for x in active] == [a["id"]]
    assert [x["id"] for x in inactive] == [b["id"]]
    assert [x["name"] for x in client.get("/members?q=akan", headers=admin_h).json()] == ["Akan Nonaktif"]


def test_private_data_hidden_from_other_members(client, admin_h, make_member):
    a, ha = make_member(name="Rahasia", email="rahasia@example.com", nim="3333")
    b, hb = make_member(name="Pengintip")

    as_other = client.get(f"/members/{a['id']}", headers=hb).json()
    assert as_other["email"] is None and as_other["nim"] is None and as_other["role"] is None
    listing = client.get("/members", headers=hb).json()
    # entri milik penonton sendiri boleh menampilkan datanya; entri orang lain harus disembunyikan
    others = [x for x in listing if x["id"] != b["id"]]
    assert others and all(x["email"] is None and x["nim"] is None for x in others)
    # pemilik akun & admin boleh melihat
    assert client.get(f"/members/{a['id']}", headers=ha).json()["email"] == "rahasia@example.com"
    assert client.get(f"/members/{a['id']}", headers=admin_h).json()["nim"] == "3333"
    # anggota tidak bisa mencari lewat email/NIM
    assert client.get("/members?q=rahasia@example.com", headers=hb).json() == []
    # statistik juga tidak membocorkan data pribadi
    stats = client.get(f"/members/{a['id']}/stats", headers=hb).json()
    assert stats["member"]["email"] is None


def test_delete_member_without_history_ok_but_blocked_with_history(client, admin_h, make_member, record):
    a, _ = make_member(name="Punya Riwayat")
    b, _ = make_member(name="Lawan")
    c, _ = make_member(name="Tanpa Riwayat")
    assert record(a["id"], b["id"], "white_win").status_code == 201

    blocked = client.delete(f"/members/{a['id']}", headers=admin_h)
    assert blocked.status_code == 409 and "nonaktif" in blocked.json()["detail"].lower()
    assert client.delete(f"/members/{c['id']}", headers=admin_h).status_code == 204
    assert client.get(f"/members/{c['id']}", headers=admin_h).status_code == 404
    # riwayat tetap utuh
    assert len(client.get("/matches", headers=admin_h).json()) == 1


def test_admin_cannot_deactivate_or_delete_self(client, admin_h):
    me = client.get("/auth/me", headers=admin_h).json()
    assert client.patch(f"/members/{me['id']}", json={"status": "inactive"}, headers=admin_h).status_code == 409
    assert client.delete(f"/members/{me['id']}", headers=admin_h).status_code == 409


def test_member_not_found(client, admin_h):
    assert client.get("/members/9999", headers=admin_h).status_code == 404
    assert client.get("/members/9999/stats", headers=admin_h).status_code == 404
