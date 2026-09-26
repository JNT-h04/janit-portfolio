"""ECHO tests. The real Gemini call is replaced by a fake, so these cost nothing
and don't need a key or the internet."""

import pytest
from fastapi.testclient import TestClient

from app.echo import transcribe
from app.echo.transcribe import ActionItem, Minutes, Turn
from app.main import app
from app.routers import echo

client = TestClient(app)


@pytest.fixture(autouse=True)
def fresh_rate_limit():
    """The limiter counts every upload, including this file's. Start each test clean."""
    echo.upload_limit.calls.clear()

FAKE = Minutes(
    title="Sprint planning",
    summary="The team agreed the release date and split the remaining work.",
    topics=["release date", "open bugs"],
    decisions=["Ship on Friday"],
    actions=[ActionItem(task="Fix the login bug", owner="Priya", due="Thursday")],
    transcript=[Turn(speaker="Speaker 1", start="00:00", text="Let's begin.")],
)


@pytest.fixture
def fake_gemini(monkeypatch):
    """Pretend the key is set and the model always answers."""
    async def fake_transcribe(data, mime, on_step=None, on_model=None):
        if on_step:
            on_step("uploading")
            on_step("listening")
        if on_model:
            on_model("fake-model")
        return FAKE

    monkeypatch.setattr(transcribe, "ready", lambda: True)
    monkeypatch.setattr(transcribe, "transcribe", fake_transcribe)
    return fake_transcribe


def upload(name="meeting.m4a", data=b"fake audio bytes", mime="audio/mp4"):
    return client.post("/api/echo/jobs", files={"file": (name, data, mime)})


def test_status_reports_whether_the_key_is_set(fake_gemini):
    assert client.get("/api/echo/status").json() == {"ready": True}


def test_upload_returns_a_job_id_immediately(fake_gemini):
    res = upload()
    assert res.status_code == 202  # accepted, not finished
    assert res.json()["id"]


def test_job_finishes_with_the_minutes(fake_gemini):
    job_id = upload().json()["id"]
    # TestClient runs the background task before handing back the response,
    # so by now the job has already done its work.
    job = client.get(f"/api/echo/jobs/{job_id}").json()
    assert job["stage"] == "done"
    assert job["percent"] == 100
    assert job["minutes"]["title"] == "Sprint planning"
    assert job["minutes"]["actions"][0]["owner"] == "Priya"
    # The measurements the page shows are real, not placeholders.
    assert job["model"] == "fake-model"
    assert job["audio_bytes"] > 0
    assert set(job["stage_seconds"]) == {"uploading", "listening"}


def test_failure_is_reported_on_the_job_not_as_a_crash(monkeypatch):
    async def boom(data, mime, on_step=None, on_model=None):
        raise transcribe.TranscribeError("429 RESOURCE_EXHAUSTED")

    monkeypatch.setattr(transcribe, "ready", lambda: True)
    monkeypatch.setattr(transcribe, "transcribe", boom)
    job_id = upload().json()["id"]
    job = client.get(f"/api/echo/jobs/{job_id}").json()
    assert job["stage"] == "error"
    assert "429" in job["error"]


def test_unknown_job_is_404(fake_gemini):
    assert client.get("/api/echo/jobs/nope").status_code == 404


def test_offline_without_a_key(monkeypatch):
    monkeypatch.setattr(transcribe, "ready", lambda: False)
    assert upload().status_code == 503
    assert client.get("/api/echo/status").json() == {"ready": False}


def test_rejects_a_file_that_is_not_audio(fake_gemini):
    assert upload(name="notes.txt", mime="text/plain").status_code == 415


def test_rejects_an_empty_recording(fake_gemini):
    assert upload(data=b"").status_code == 422


def test_extension_is_used_when_the_browser_sends_no_mime_type(fake_gemini):
    assert upload(name="call.mp3", mime="application/octet-stream").status_code == 202


def test_old_jobs_are_forgotten(fake_gemini):
    echo._jobs.clear()
    for _ in range(echo.MAX_JOBS + 5):
        echo.upload_limit.calls.clear()  # this test is about job storage, not the rate limit
        upload()
    assert len(echo._jobs) <= echo.MAX_JOBS


def test_rate_limit_stops_a_flood_of_uploads(fake_gemini):
    codes = [upload().status_code for _ in range(7)]
    assert codes.count(202) == 5  # the limit in the route decorator
    assert codes[-1] == 429
