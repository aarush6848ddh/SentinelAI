from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import ARRAY
from database import Base

class ImportEdge(Base):
    __tablename__ = "import_edges"

    id = Column(Integer, primary_key=True)
    repository_id = Column(Integer, ForeignKey("repositories.id"))
    source_file_path = Column(String, nullable=False)
    imported_module = Column(String, nullable=False)
    imported_names = Column(ARRAY(String))
    is_external = Column(Boolean, default=False)
    resolved_file_path = Column(String, nullable=True)
