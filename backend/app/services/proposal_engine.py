import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def generate_procurement_proposal(
    base_budget: float,
    risks: Dict[str, Any],
    volatility_index: float,
    currency_rate: float,
    category: str
) -> Dict[str, Any]:
    """
    Generate suggested budget revision details following the procurement-aware risk formula.
    
    Formula:
    Suggested Budget = Base Budget 
                       + Commodity Escalation 
                       + Supply Chain Risk 
                       + Logistics Risk 
                       + Forex Exposure 
                       + Procurement Delay Risk 
                       + Forecasted Inflation 
                       + Category Volatility Buffer
    """
    # 1. Component calculations (coefficients map risks to budget percentages)
    escalation = base_budget * (risks["commodity_escalation"] / 100.0) * 0.04
    supply_chain = base_budget * (risks["supplier_dependency"] / 100.0) * 0.03
    logistics = base_budget * (risks["logistics_risk"] / 100.0) * 0.025
    forex = base_budget * (risks["forex_exposure"] / 100.0) * 0.02
    delay_risk = base_budget * (risks["overall_risk_score"] / 100.0) * 0.015
    inflation = base_budget * (risks["inflation_exposure"] / 100.0) * 0.03
    volatility_buffer = base_budget * (volatility_index / 100.0) * 0.035
    
    # Specialty buffers
    specialty_buffer = 0.0
    if category == "semiconductor":
        specialty_buffer = base_budget * (risks["semiconductor_shortage"] / 100.0) * 0.05
    elif category == "lithium":
        specialty_buffer = base_budget * (risks["battery_volatility"] / 100.0) * 0.06
        
    # Calculate sum
    suggested_additional = (
        escalation + 
        supply_chain + 
        logistics + 
        forex + 
        delay_risk + 
        inflation + 
        volatility_buffer + 
        specialty_buffer
    )
    
    suggested_budget = base_budget + suggested_additional
    
    # 2. Build structured calculation steps list (in both USD and local currency)
    steps = [
        {
            "step": "Base Budget",
            "formula": "Original allocated category balance",
            "usd_val": round(base_budget, 2),
            "local_val": round(base_budget * currency_rate, 2),
            "applied": True
        },
        {
            "step": "Commodity Escalation",
            "formula": f"Base * Escalation Risk ({risks['commodity_escalation']}%) * 4.0%",
            "usd_val": round(escalation, 2),
            "local_val": round(escalation * currency_rate, 2),
            "applied": escalation > 0
        },
        {
            "step": "Supply Chain Risk",
            "formula": f"Base * Dependency Risk ({risks['supplier_dependency']}%) * 3.0%",
            "usd_val": round(supply_chain, 2),
            "local_val": round(supply_chain * currency_rate, 2),
            "applied": supply_chain > 0
        },
        {
            "step": "Logistics Risk",
            "formula": f"Base * Logistics Risk ({risks['logistics_risk']}%) * 2.5%",
            "usd_val": round(logistics, 2),
            "local_val": round(logistics * currency_rate, 2),
            "applied": logistics > 0
        },
        {
            "step": "Forex Exposure",
            "formula": f"Base * Forex Risk ({risks['forex_exposure']}%) * 2.0%",
            "usd_val": round(forex, 2),
            "local_val": round(forex * currency_rate, 2),
            "applied": forex > 0
        },
        {
            "step": "Procurement Delay Risk",
            "formula": f"Base * Overall Risk ({risks['overall_risk_score']}%) * 1.5%",
            "usd_val": round(delay_risk, 2),
            "local_val": round(delay_risk * currency_rate, 2),
            "applied": delay_risk > 0
        },
        {
            "step": "Forecasted Inflation",
            "formula": f"Base * Inflation Risk ({risks['inflation_exposure']}%) * 3.0%",
            "usd_val": round(inflation, 2),
            "local_val": round(inflation * currency_rate, 2),
            "applied": inflation > 0
        },
        {
            "step": "Category Volatility Buffer",
            "formula": f"Base * Volatility Index ({volatility_index:.1f}%) * 3.5%",
            "usd_val": round(volatility_buffer, 2),
            "local_val": round(volatility_buffer * currency_rate, 2),
            "applied": volatility_buffer > 0
        }
    ]
    
    if specialty_buffer > 0:
        if category == "semiconductor":
            steps.append({
                "step": "Semiconductor Shortage Premium",
                "formula": f"Base * Shortage Risk ({risks['semiconductor_shortage']}%) * 5.0%",
                "usd_val": round(specialty_buffer, 2),
                "local_val": round(specialty_buffer * currency_rate, 2),
                "applied": True
            })
        elif category == "lithium":
            steps.append({
                "step": "Battery Material Buffer",
                "formula": f"Base * Volatility Risk ({risks['battery_volatility']}%) * 6.0%",
                "usd_val": round(specialty_buffer, 2),
                "local_val": round(specialty_buffer * currency_rate, 2),
                "applied": True
            })
            
    # Suggestions summary step
    steps.append({
        "step": "Suggested Budget",
        "formula": "Sum of all risk adjustments",
        "usd_val": round(suggested_budget, 2),
        "local_val": round(suggested_budget * currency_rate, 2),
        "applied": True
    })
    
    return {
        "suggested_budget": round(suggested_budget, 2),
        "suggested_additional": round(suggested_additional, 2),
        "calculations": steps
    }
