# models/dataset_column.py
from sqlalchemy import Column, Integer, String, ForeignKey
from app.core.database import Base

class DatasetColumn(Base):
    __tablename__ = "dataset_columns"

    id = Column(Integer, primary_key=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"))
    column_name = Column(String)
    data_type = Column(String)  # string | number | date | boolean
