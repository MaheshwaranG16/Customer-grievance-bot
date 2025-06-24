from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from config import Base

class Customer(Base):
    __tablename__ = 'customers'

    id = Column(Integer, primary_key=True)
    beneficiary_no = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    customer_type = Column(String)
    account_number = Column(String)
    meter_id = Column(String)

    complaints = relationship("Complaint", back_populates="customer")


class Complaint(Base):
    __tablename__ = 'complaints'

    id = Column(Integer, primary_key=True)
    complaint_id = Column(String, unique=True, nullable=False)
    customer_id = Column(Integer, ForeignKey('customers.id'), nullable=False)
    issue_type = Column(String, nullable=False)
    complaint_type = Column(String, default="text")  # "text" or "call"
    status = Column(String, default="Open")
    estimated_restoration_time = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime)
    resolution_note = Column(Text)
    is_callback_done = Column(Boolean, default=False)

    customer = relationship("Customer", back_populates="complaints")
