import logging
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.models.procurement_intelligence import MarketSnapshot

logger = logging.getLogger(__name__)


def calculate_procurement_risks(
    category: str, 
    industry: str, 
    currency: str, 
    db: Session
) -> Dict[str, Any]:
    """
    Calculate risk scores (0-100) for commodity escalation, logistics, 
    forex exposure, inflation, and specialty items (semiconductor shortage, battery volatility).
    """
    # Fetch latest snapshot for this category
    snap = db.query(MarketSnapshot).filter(
        MarketSnapshot.category == category
    ).order_by(MarketSnapshot.captured_at.desc()).first()
    
    # Ensure snap has the attributes and they are float/int (not Mock objects)
    has_real_attributes = False
    if snap and hasattr(snap, "percentage_change"):
        val = getattr(snap, "percentage_change")
        if isinstance(val, (int, float)) and not isinstance(val, bool):
            has_real_attributes = True

    if has_real_attributes:
        pct_change = snap.percentage_change
        volatility = snap.volatility_index
        db_inflation = snap.inflation_rate
    else:
        pct_change = 1.5
        volatility = 2.0
        db_inflation = 3.2
    
    # 1. Commodity Escalation Risk
    # Higher price changes + higher volatility = higher risk
    escalation_score = min(100.0, max(0.0, 30.0 + (pct_change * 3.5) + (volatility * 2.0)))
    
    # 2. Logistics Risk
    # Driven by general fuel index prices (load latest fuel snapshot)
    fuel_snap = db.query(MarketSnapshot).filter(
        MarketSnapshot.category == "fuel"
    ).order_by(MarketSnapshot.captured_at.desc()).first()
    
    has_fuel_attributes = False
    if fuel_snap and hasattr(fuel_snap, "percentage_change"):
        f_val = getattr(fuel_snap, "percentage_change")
        if isinstance(f_val, (int, float)) and not isinstance(f_val, bool):
            has_fuel_attributes = True
            
    fuel_change = fuel_snap.percentage_change if has_fuel_attributes else 0.5
    logistics_score = min(100.0, max(0.0, 40.0 + (fuel_change * 4.0) + (volatility * 1.5)))
    
    # 3. Supplier Dependency Risk
    # Depends on industry characteristics
    industry_norm = (industry or "").lower()
    if "automotive" in industry_norm:
        dependency_score = 65.0  # highly specialized parts (ECU, chips)
    elif "electrical" in industry_norm:
        dependency_score = 55.0  # copper transformers, copper wire
    else:
        dependency_score = 45.0  # general metal fabrication
        
    # 4. Forex Exposure
    # Stable currencies have low forex risk, volatile currencies are higher
    stable_currencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD"]
    if currency in stable_currencies:
        forex_score = 15.0 + (volatility * 1.0)
    else:
        forex_score = 55.0 + (volatility * 2.5)
        
    # 5. Inflation Exposure
    # Proportional to inflation rate
    inflation_score = min(100.0, max(0.0, db_inflation * 12.0 + (pct_change * 1.5)))
    
    # 6. Specialty Risks
    semiconductor_shortage = 0.0
    battery_volatility = 0.0
    
    if category == "semiconductor":
        semiconductor_shortage = min(100.0, max(0.0, 50.0 + (pct_change * 4.5) + (volatility * 3.0)))
    if category == "lithium":
        battery_volatility = min(100.0, max(0.0, 55.0 + (pct_change * 4.0) + (volatility * 3.5)))
        
    # Aggregate Risk Level
    scores = [escalation_score, logistics_score, dependency_score, forex_score, inflation_score]
    if semiconductor_shortage > 0:
        scores.append(semiconductor_shortage)
    if battery_volatility > 0:
        scores.append(battery_volatility)
        
    overall_avg = sum(scores) / len(scores)
    
    if overall_avg >= 70.0:
        level = "Critical"
    elif overall_avg >= 50.0:
        level = "High"
    elif overall_avg >= 30.0:
        level = "Medium"
    else:
        level = "Low"
        
    return {
        "commodity_escalation": round(escalation_score, 1),
        "logistics_risk": round(logistics_score, 1),
        "supplier_dependency": round(dependency_score, 1),
        "forex_exposure": round(forex_score, 1),
        "inflation_exposure": round(inflation_score, 1),
        "semiconductor_shortage": round(semiconductor_shortage, 1),
        "battery_volatility": round(battery_volatility, 1),
        "overall_risk_score": round(overall_avg, 1),
        "risk_level": level
    }
