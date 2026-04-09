from sqlalchemy import Column, String, Integer
from app.core.database import Base

class SystemSetting(Base):
    __tablename__ = "system_settings"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(String)
    type = Column(String)  # 'text', 'toggle', 'number', 'select', 'color'
