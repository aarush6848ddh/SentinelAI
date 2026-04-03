from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
from models.pull_request import PullRequest
from models.repository import Repository
from schemas.pull_request import PullRequestCreate, PullRequestResponse
from typing import List

router = APIRouter(prefix="/pull-requests", tags=["pull-requests"])

@router.post("/", response_model=PullRequestResponse)
def create_pull_request(pr: PullRequestCreate, db: Session = Depends(get_db)):
    existing_repo = db.query(Repository).filter(Repository.id == pr.repository_id).first()
    if not existing_repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    new_pr = PullRequest(
        repository_id=pr.repository_id,
        github_pr_id=pr.github_pr_id,
        number=pr.number,
        title=pr.title,
        author=pr.author,
        base_branch=pr.base_branch,
        head_branch=pr.head_branch
    )
    db.add(new_pr)
    db.commit()
    db.refresh(new_pr)
    return new_pr

@router.get("/", response_model=List[PullRequestResponse])
def get_pull_requests(db: Session = Depends(get_db)):
    prs = db.query(PullRequest).all()
    return prs