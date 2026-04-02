from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from models.crawl_job import CrawlStatus

class CrawlJobBase(BaseModel):
    repository_id: int

class CrawlJobCreate(CrawlJobBase):
    pass

class CrawlJobResponse(CrawlJobBase):
    id: int
    status: CrawlStatus
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    error_message: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True