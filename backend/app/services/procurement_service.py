import logging
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.services.ai_category_engine import detect_category, clean_input
from app.services.commodity_service import get_latest_commodity_prices
from app.services.commodity_service import check_market_alerts
from app.services.risk_engine import calculate_procurement_risks
from app.services.forecasting_service import get_forecast_chart_data
from app.services.proposal_engine import generate_procurement_proposal
from app.api.budget import clean_float

logger = logging.getLogger(__name__)


def analyze_procurement_budget(
    project_name: str,
    industry: str,
    raw_categories_input: str,
    currency: str,
    db: Session
) -> Dict[str, Any]:
    """
    Orchestrate the entire procurement and market intelligence revision analysis workflow.
    """
    # 1. Fetch latest budget summary for this project
    from app.models.budget import BudgetSummary
    budget = db.query(BudgetSummary).filter(
        BudgetSummary.project_name == project_name
    ).order_by(BudgetSummary.budget_date.desc().nulls_last(), BudgetSummary.updated_at.desc()).first()
    
    if not budget:
        return {
            "project_name": project_name,
            "overall_budget": 0.0,
            "budget_data": [],
            "affected_rows": [],
            "message": f"No baseline budget found for project '{project_name}'."
        }
        
    # 2. Get active exchange rates
    from app.api.currency import get_exchange_rates
    import asyncio
    try:
        # Run async in synchronous context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        rates = loop.run_until_complete(get_exchange_rates())
        loop.close()
    except Exception:
        rates = {"USD": 1.0, "INR": 95.43, "EUR": 0.92, "GBP": 0.80}
        
    target_currency = (currency or "USD").upper()
    rate = float(rates.get(target_currency, 1.0))
    
    # 3. Clean and detect categories from natural language input
    detected_items = []
    category_inputs = [c.strip() for c in raw_categories_input.split(",") if c.strip()]
    if not category_inputs:
        # Fallback to general terms if empty
        category_inputs = ["steel materials", "wiring harness"]
        
    for raw in category_inputs:
        cleaned, norm_cat, score = detect_category(raw, industry)
        detected_items.append({
            "raw_input": raw,
            "cleaned": cleaned,
            "normalized": norm_cat,
            "confidence": score
        })
        
        # Log this detection in db
        from app.models.procurement_intelligence import CategoryIntelligence
        cat_log = CategoryIntelligence(
            raw_input=raw,
            cleaned_category=cleaned,
            normalized_category=norm_cat,
            industry=industry,
            market_mapping=f"Index: {norm_cat}_index",
            confidence_score=score,
            ai_detected=True
        )
        db.add(cat_log)
    db.commit()
    
    # 4. Pull live indicators & run alert scans
    market_prices = get_latest_commodity_prices(db)
    market_alerts = check_market_alerts(db)
    
    # 5. Evaluate risks and run forecasts for each detected category
    category_results = {}
    total_suggested_usd = 0.0
    total_base_usd = 0.0
    affected_rows = []
    
    # Loop over budget rows to find matches
    budget_rows = budget.budget_data or []
    
    for row_idx, row in enumerate(budget_rows):
        # Extract row descriptions or titles
        row_desc = ""
        for key in ["Category", "Sub Category", "Description", "Items", "Item Name", "Name"]:
            if key in row and row[key]:
                row_desc = str(row[key])
                break
                
        if not row_desc:
            continue
            
        row_cleaned = clean_input(row_desc)
        matched_norm_cat = None
        matched_confidence = 0.0
        
        # Match against our detected categories
        for det in detected_items:
            norm_cat = det["normalized"]
            # If the row description contains the normalized term or cleaned input
            if norm_cat in row_cleaned or row_cleaned in norm_cat or det["cleaned"] in row_cleaned:
                matched_norm_cat = norm_cat
                matched_confidence = det["confidence"]
                break
                
        # If no explicit matching, default match to closest commodity based on keywords
        if not matched_norm_cat:
            for cat_key in ["steel", "copper", "aluminium", "lithium", "fuel", "rubber", "semiconductor"]:
                if cat_key in row_cleaned or (cat_key == "semiconductor" and ("chip" in row_cleaned or "ecu" in row_cleaned)):
                    matched_norm_cat = cat_key
                    matched_confidence = 0.75
                    break
                    
        if matched_norm_cat:
            # Map this row as affected!
            # Parse utilization & balance
            # BudgetMaster.jsx labels: 'Total budget', 'Total utilization', 'Balance'
            row_budget = clean_float(row.get("Total budget", row.get("Budget", 0.0)))
            row_utilization = clean_float(row.get("Total utilization", row.get("Utilized", 0.0)))
            row_balance = clean_float(row.get("Balance", row_budget - row_utilization))
            
            # Calculate risks and proposal for this specific category
            if matched_norm_cat not in category_results:
                risks = calculate_procurement_risks(matched_norm_cat, industry, target_currency, db)
                volatility = market_prices.get(matched_norm_cat, {}).get("volatility_index", 2.0)
                forecasts = get_forecast_chart_data(matched_norm_cat, market_prices.get(matched_norm_cat, {}).get("current_price", 100.0), db)
                
                category_results[matched_norm_cat] = {
                    "risks": risks,
                    "volatility": volatility,
                    "forecasts": forecasts
                }
            
            cat_data = category_results[matched_norm_cat]
            proposal = generate_procurement_proposal(
                base_budget=row_budget,
                risks=cat_data["risks"],
                volatility_index=cat_data["volatility"],
                currency_rate=rate,
                category=matched_norm_cat
            )
            
            total_base_usd += row_budget
            total_suggested_usd += proposal["suggested_budget"]
            
            affected_rows.append({
                "row_index": row_idx,
                "description": row_desc,
                "category": matched_norm_cat,
                "original_budget_usd": row_budget,
                "original_budget_local": round(row_budget * rate, 2),
                "suggested_budget_usd": proposal["suggested_budget"],
                "suggested_budget_local": proposal["suggested_budget"] * rate,
                "overrun_usd": proposal["suggested_additional"],
                "overrun_local": proposal["suggested_additional"] * rate,
                "confidence_score": matched_confidence,
                "calculations": proposal["calculations"]
            })
            
    # If no rows matched, we map overall budget as general steel/materials to return a proposal
    if not affected_rows:
        general_cat = "steel"
        general_budget = budget.overall_budget
        
        risks = calculate_procurement_risks(general_cat, industry, target_currency, db)
        volatility = market_prices.get(general_cat, {}).get("volatility_index", 2.0)
        forecasts = get_forecast_chart_data(general_cat, market_prices.get(general_cat, {}).get("current_price", 100.0), db)
        
        proposal = generate_procurement_proposal(
            base_budget=general_budget,
            risks=risks,
            volatility_index=volatility,
            currency_rate=rate,
            category=general_cat
        )
        
        category_results[general_cat] = {
            "risks": risks,
            "volatility": volatility,
            "forecasts": forecasts
        }
        
        affected_rows.append({
            "row_index": 0,
            "description": "Overall General Project Materials",
            "category": general_cat,
            "original_budget_usd": general_budget,
            "original_budget_local": round(general_budget * rate, 2),
            "suggested_budget_usd": proposal["suggested_budget"],
            "suggested_budget_local": proposal["suggested_budget"] * rate,
            "overrun_usd": proposal["suggested_additional"],
            "overrun_local": proposal["suggested_additional"] * rate,
            "confidence_score": 0.50,
            "calculations": proposal["calculations"]
        })
        total_base_usd = general_budget
        total_suggested_usd = proposal["suggested_budget"]
        
    # Compile final project suggestions
    overall_overrun_usd = total_suggested_usd - total_base_usd
    overall_overrun_local = overall_overrun_usd * rate
    
    # Generate overall calculations breakdown table (sum of all affected steps)
    overall_calculations = []
    # Take first item's structures as template for steps
    template_calcs = affected_rows[0]["calculations"]
    for idx, step_item in enumerate(template_calcs):
        step_name = step_item["step"]
        step_formula = step_item["formula"]
        
        # Aggregate values across all affected rows
        step_usd = sum(r["calculations"][idx]["usd_val"] for r in affected_rows if idx < len(r["calculations"]))
        step_local = sum(r["calculations"][idx]["local_val"] for r in affected_rows if idx < len(r["calculations"]))
        
        overall_calculations.append({
            "step": step_name,
            "formula": step_formula,
            "usd_val": round(step_usd, 2),
            "local_val": round(step_local, 2),
            "applied": step_item["applied"]
        })
        
    return {
        "project_name": project_name,
        "industry": industry,
        "currency": target_currency,
        "exchange_rate": rate,
        "detected_categories": detected_items,
        "market_indicators": market_prices,
        "alerts": market_alerts,
        "category_results": category_results,
        "affected_rows": affected_rows,
        "original_budget_usd": round(budget.overall_budget, 2),
        "original_budget_local": round(budget.overall_budget * rate, 2),
        "suggested_budget_usd": round(budget.overall_budget + overall_overrun_usd, 2),
        "suggested_budget_local": round((budget.overall_budget + overall_overrun_usd) * rate, 2),
        "overrun_usd": round(overall_overrun_usd, 2),
        "overrun_local": round(overall_overrun_local, 2),
        "overall_calculations": overall_calculations
    }
