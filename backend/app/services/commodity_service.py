import logging
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.models.procurement_intelligence import MarketSnapshot

logger = logging.getLogger(__name__)

# Alert threshold criteria
ALERT_THRESHOLDS = {
    "steel": 10.0,      # steel spikes > 10%
    "copper": 8.0,      # copper spikes > 8%
    "lithium": 12.0,    # lithium spikes > 12%
    "aluminium": 10.0,  # aluminium spikes > 10%
    "fuel": 10.0,       # fuel spikes > 10%
    "rubber": 10.0,     # rubber spikes > 10%
}


def get_latest_commodity_prices(db: Session) -> Dict[str, Dict[str, Any]]:
    """
    Get the latest snapshots for all main categories.
    """
    categories = ["steel", "aluminium", "copper", "semiconductor", "lithium", "fuel", "rubber"]
    result = {}
    
    for cat in categories:
        snap = db.query(MarketSnapshot).filter(
            MarketSnapshot.category == cat
        ).order_by(MarketSnapshot.captured_at.desc()).first()
        
        is_valid = False
        if snap and hasattr(snap, "percentage_change"):
            val = getattr(snap, "percentage_change")
            if isinstance(val, (int, float)) and not isinstance(val, bool):
                is_valid = True
                
        if is_valid:
            result[cat] = {
                "category": snap.category,
                "market_index": snap.market_index,
                "current_price": snap.current_price,
                "previous_price": snap.previous_price,
                "percentage_change": snap.percentage_change,
                "volatility_index": snap.volatility_index,
                "procurement_risk": snap.procurement_risk,
                "supply_chain_risk": snap.supply_chain_risk,
                "source": snap.source,
                "captured_at": snap.captured_at.isoformat() if snap.captured_at else None
            }
        else:
            # Fallback mock metrics if db is empty
            result[cat] = {
                "category": cat,
                "market_index": f"{cat}_index",
                "current_price": 100.0,
                "previous_price": 98.0,
                "percentage_change": 2.04,
                "volatility_index": 1.5,
                "procurement_risk": 0.4,
                "supply_chain_risk": 0.35,
                "source": "Mock Index",
                "captured_at": None
            }
            
    return result


def check_market_alerts(db: Session) -> List[Dict[str, Any]]:
    """
    Scan snapshots and check if thresholds are exceeded to trigger alerts.
    """
    prices = get_latest_commodity_prices(db)
    alerts = []
    
    for cat, data in prices.items():
        pct = data["percentage_change"]
        threshold = ALERT_THRESHOLDS.get(cat)
        
        # Check percentage spike
        if threshold and pct >= threshold:
            alerts.append({
                "type": "price_spike",
                "category": cat,
                "severity": "Critical" if pct >= (threshold * 1.5) else "High",
                "message": f"🚨 {cat.capitalize()} Index spiked by {pct:.1f}% (Threshold: {threshold}%)",
                "metric": f"{pct:.1f}% change"
            })
            
        # Check semiconductor shortage risk
        if cat == "semiconductor" and data["supply_chain_risk"] > 0.65:
            alerts.append({
                "type": "supply_shortage",
                "category": "semiconductor",
                "severity": "High",
                "message": "⚠️ Semiconductor supply chain risk has exceeded safety margins (Risk Score: {:.2f})".format(data["supply_chain_risk"]),
                "metric": f"Risk: {data['supply_chain_risk']:.2f}"
            })
            
        # Check battery volatility
        if cat == "lithium" and data["volatility_index"] > 8.0:
            alerts.append({
                "type": "material_volatility",
                "category": "lithium",
                "severity": "Critical" if data["volatility_index"] > 12.0 else "High",
                "message": f"⚡ Lithium material index shows extreme volatility (Index: {data['volatility_index']:.1f})",
                "metric": f"Volatility: {data['volatility_index']:.1f}"
            })
            
    return alerts
