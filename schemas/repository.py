from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from models.repository import RepoStatus

class RepositoryBase(BaseModel):
    github_repo_id: int
    full_name: str
    url: str
    default_branch: str = "main"

# Inherit from RepositoryBase for create and response models
# This allows us to reuse the common fields and add additional fields for responses if needed
class RepositoryCreate(RepositoryBase):
    pass

class RepositoryResponse(RepositoryBase):
    id: int
    status: RepoStatus
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True