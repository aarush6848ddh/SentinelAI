from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class CallEdge(Base):
    __tablename__ = "call_edges"

    id = Column(Integer, primary_key=True)
    caller_id = Column(Integer, ForeignKey("symbols.id"))
    callee_id = Column(Integer, ForeignKey("symbols.id"))
    call_site_file = Column(String)
    call_site_line = Column(Integer)

    # Two relationships to Symbol(both need foreign_keys hint)
    caller = relationship("Symbol", foreign_keys=[caller_id], backref="outgoing_calls")
    callee = relationship("Symbol", foreign_keys=[callee_id], backref="incoming_calls")