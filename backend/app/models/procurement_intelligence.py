from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.sql import func
from app.core.database import Base


class IndustryProfile(Base):
    __tablename__ = "industry_profiles"

    id = Column(Integer, primary_key=True)
    industry_name = Column(String)
    procurement_model = Column(String)
    risk_model = Column(String)
    forecast_model = Column(String)
    enabled = Column(Boolean, default=True)


class CategoryIntelligence(Base):
    __tablename__ = "category_intelligence"

    id = Column(Integer, primary_key=True)
    raw_input = Column(String)
    cleaned_category = Column(String)
    normalized_category = Column(String)
    industry = Column(String)
    market_mapping = Column(String)
    confidence_score = Column(Float)
    ai_detected = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())


class MarketSourceRegistry(Base):
    __tablename__ = "market_source_registry"

    id = Column(Integer, primary_key=True)
    category = Column(String)
    industry = Column(String)
    market_source = Column(String)
    risk_engine = Column(String)
    forecast_engine = Column(String)
    refresh_interval = Column(Integer)


class MarketSnapshot(Base):
    __tablename__ = "market_snapshots"

    id = Column(Integer, primary_key=True)
    category = Column(String)
    market_index = Column(String)
    current_price = Column(Float)
    previous_price = Column(Float)
    percentage_change = Column(Float)
    volatility_index = Column(Float)
    inflation_rate = Column(Float)
    procurement_risk = Column(Float)
    supply_chain_risk = Column(Float)
    source = Column(String)
    captured_at = Column(DateTime, server_default=func.now())
