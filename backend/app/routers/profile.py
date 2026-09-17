import json
from fastapi import APIRouter
from app.core.config import settings
router=APIRouter(tags=["profile"])
@router.get("/profile")
def get_profile():
    path=settings.data_dir / "profile.json"
    with open(path, encoding="utf-8") as file:
        return json.load(file)