from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from models.pull_request import PRStatus, ReviewStatus

class PullRequestBase(BaseModel):
    repository_id: int
    github_pr_id: int
    number: int
    title: str
    author: str
    base_branch: str
    head_branch: str

class PullRequestCreate(PullRequestBase):
    pass

class PullRequestResponse(PullRequestBase):
    id: int
    status: PRStatus
    review_status: ReviewStatus
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True