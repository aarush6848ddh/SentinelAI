from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Symbol(Base):
    __tablename__ = "symbols"

    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id"), nullable=False)
    file_path = Column(String, nullable=False)
    name = Column(String, nullable=False)
    qualified = Column(String, nullable=False)
    kind = Column(String, nullable=False)
    start_line = Column(Integer)
    end_line = Column(Integer)
    signature = Column(Text)

    # relationships
    repository = relationship("Repository", back_populates="symbols")
    issues = relationship("Issue", back_populates="symbol")
    