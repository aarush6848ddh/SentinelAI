from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from models.issue import IssueStatus, IssueCategory, IssueSeverity

class IssueBase(BaseModel):
    repository_id: int
    pull_request_id: Optional[int]
    title: str
    description: str
    severity: IssueSeverity
    category: IssueCategory
    file_path: Optional[str]
    line_number: Optional[int]

class IssueCreate(IssueBase):
    pass

class IssueResponse(IssueBase):
    id: int
    status: IssueStatus
    created_at: datetime

    class Config:
        from_attributes = True