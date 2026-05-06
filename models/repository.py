from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum

class RepoStatus(str, enum.Enum):
    pending = "pending"
    crawling = "crawling"
    ready = "ready"
    error = "error"

class Repository(Base):
    __tablename__ = "repositories"

    id = Column(Integer, primary_key=True, index=True)
    github_repo_id = Column(Integer, unique=True, nullable=False)
    full_name = Column(String, unique=True, nullable=False)
    url = Column(String, nullable=False)
    default_branch = Column(String, default="main")
    status = Column(Enum(RepoStatus), default=RepoStatus.pending, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # relationships
    crawl_jobs = relationship("CrawlJob", back_populates="repository")
    pull_requests = relationship("PullRequest", back_populates="repository")
    issues = relationship("Issue", back_populates="repository")
    symbols = relationship("Symbol", back_populates="repository")
    
