from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from models.repository import RepoStatus

class RepositoryBase(BaseModel):
    github_repo_id: int
    full_name: str
    url: str
    default_branch: str = "main"

class RepositoryCreate(RepositoryBase):
    pass

class RepositoryResponse(RepositoryBase):
    id: int
    status: RepoStatus
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True