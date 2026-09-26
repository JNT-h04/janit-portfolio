from fastapi.testclient import TestClient

from app.contact import send
from app.main import app
from app.routers import contact

client = TestClient(app)
GOOD = {"name": "Priya Raman", "email": "priya@acme.com", "message": "Open to an internship chat next week?"}


def setup_function():
    contact.contact_limit.calls.clear()


def test_sends_with_the_visitor_as_reply_to(monkeypatch):
    sent = []

    async def fake_send(name, email, message, company=""):
        sent.append((name, email, message, company))
        return "id-1"

    monkeypatch.setattr(send, "ready", lambda: True)
    monkeypatch.setattr(send, "send", fake_send)
    res = client.post("/api/contact", json={**GOOD, "company": "Acme"})
    assert res.status_code == 200
    assert res.json() == {"sent": True}
    assert sent == [("Priya Raman", "priya@acme.com", GOOD["message"], "Acme")]


def test_honeypot_is_dropped_silently(monkeypatch):
    called = []

    async def fake_send(*args, **kwargs):
        called.append(args)

    monkeypatch.setattr(send, "ready", lambda: True)
    monkeypatch.setattr(send, "send", fake_send)
    res = client.post("/api/contact", json={**GOOD, "website": "http://spam.example"})
    assert res.json() == {"sent": True}
    assert called == []


def test_without_a_key_it_says_so(monkeypatch):
    monkeypatch.setattr(send, "ready", lambda: False)
    assert client.get("/api/contact/status").json() == {"ready": False}
    assert client.post("/api/contact", json=GOOD).status_code == 503


def test_rejects_bad_input(monkeypatch):
    monkeypatch.setattr(send, "ready", lambda: True)
    assert client.post("/api/contact", json={**GOOD, "email": "nope"}).status_code == 422
    assert client.post("/api/contact", json={**GOOD, "message": "hi"}).status_code == 422


def test_mail_service_failure_is_a_502(monkeypatch):
    async def refuse(*args, **kwargs):
        raise send.SendError("mail service refused the message (403)")

    monkeypatch.setattr(send, "ready", lambda: True)
    monkeypatch.setattr(send, "send", refuse)
    res = client.post("/api/contact", json=GOOD)
    assert res.status_code == 502
    assert "403" in res.json()["detail"]


def test_rate_limited(monkeypatch):
    async def fake_send(*args, **kwargs):
        return "id"

    monkeypatch.setattr(send, "ready", lambda: True)
    monkeypatch.setattr(send, "send", fake_send)
    codes = [client.post("/api/contact", json=GOOD).status_code for _ in range(6)]
    assert codes == [200] * 5 + [429]
