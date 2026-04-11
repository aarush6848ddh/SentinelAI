import os
import requests
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/github", tags=["github"])

@router.get("/repos")
def get_github_repos():
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        raise HTTPException(status_code=500, detail="GITHUB_TOKEN not set")
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(
        "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner",
        headers=headers
    )
    res.raise_for_status()
    repos = res.json()
    return [
        {
            "id": r["id"],
            "full_name": r["full_name"],
            "url": r["html_url"],
            "default_branch": r["default_branch"],
            "description": r.get("description"),
            "private": r["private"],
            "updated_at": r["updated_at"],
        }
        for r in repos
    ]
