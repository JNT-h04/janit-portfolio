from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_lists_commands():
    names = [c["name"] for c in client.get("/api/terminal").json()]
    assert "ping" in names


def test_runs_a_command():
    res = client.post("/api/terminal", json={"command": "ping", "args": []})
    assert res.status_code == 200
    assert "pong" in res.json()["output"]


def test_unknown_command_is_404():
    res = client.post("/api/terminal", json={"command": "rm", "args": ["-rf", "/"]})
    assert res.status_code == 404
    assert "command not found" in res.json()["detail"]

def test_greet_command():
    res = client.post("/api/terminal", json={"command": "greet", "args": ["Janit"]})
    assert res.status_code == 200
    assert "Janit" in res.json()["output"]

def test_greet_command_no_args():
    res = client.post("/api/terminal", json={"command": "greet", "args":[]})
    assert "usage" in res.json()["output"]
    

def test_models_command_reports_both_models():
    res = client.post("/api/terminal", json={"command": "models", "args": []})
    assert res.status_code == 200
    out = res.json()["output"]
    assert "fracture" in out
    assert "cortex" in out
