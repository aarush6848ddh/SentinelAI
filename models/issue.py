from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from database import Base  
import enum

class IssueSeverity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class IssueCategory(str, enum.Enum):
    bug = "bug"
    security = "security"
    quality = "quality"

class IssueStatus(str, enum.Enum):
    open = "open"
    dismissed = "dismissed"
    resolved = "resolved"

class Issue(Base):
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id"), nullable=False)
    pull_request_id = Column(Integer, ForeignKey("pull_requests.id"))
    title = Column(String)
    description = Column(String)
    severity = Column(Enum(IssueSeverity), nullable=False)
    category = Column(Enum(IssueCategory), nullable=False)
    file_path = Column(String)
    line_number = Column(Integer)
    status = Column(Enum(IssueStatus), default=IssueStatus.open)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    embedding = Column(Vector(384), nullable=True)

    # relationships
    repository = relationship("Repository", back_populates="issues")
    pull_request = relationship("PullRequest", back_populates="issues")