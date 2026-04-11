from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
from models.issue import Issue
from models.repository import Repository
from models.pull_request import PullRequest
from schemas.issue import IssueCreate, IssueResponse
from typing import List

router = APIRouter(prefix="/issues", tags=["issues"])

@router.post("/", response_model=IssueResponse)
def create_issue(issue: IssueCreate, db: Session = Depends(get_db)):
    existing_repo = db.query(Repository).filter(Repository.id == issue.repository_id).first()
    if not existing_repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    if issue.pull_request_id:
        existing_pr = db.query(PullRequest).filter(PullRequest.id == issue.pull_request_id).first()
        if not existing_pr:
            raise HTTPException(status_code=404, detail="Pull request not found")
        
    new_issue = Issue(
        repository_id=issue.repository_id,
        pull_request_id=issue.pull_request_id,
        title=issue.title,
        description=issue.description,
        severity=issue.severity,
        category=issue.category,
        file_path=issue.file_path,
        line_number=issue.line_number
    )
    db.add(new_issue)
    db.commit()
    db.refresh(new_issue)
    return new_issue

@router.get("/", response_model=List[IssueResponse])
def get_issues(repository_id: int = None, severity: str = None, category: str = None, db: Session = Depends(get_db)):
    query = db.query(Issue)
    
    if repository_id:
        query = query.filter(Issue.repository_id == repository_id)
    
    if severity:
        query = query.filter(Issue.severity == severity)
    
    if category:
        query = query.filter(Issue.category == category)
    
    issues = query.all()
    return issues

@router.get("/{issue_id}", response_model=IssueResponse)
def get_issue(issue_id: int, db: Session = Depends(get_db)):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue