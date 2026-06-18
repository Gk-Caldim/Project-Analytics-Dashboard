"""
Quality Service
===============
KPI aggregation (FPY, DPPM), heatmap data, defect categorization.
"""

import logging
from typing import List, Dict, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone

from app.models.defect import Defect, FailurePattern
from app.models.line_quality import LineQualityMetric
from app.models.validation import QualityKPI

logger = logging.getLogger(__name__)


def _utcnow():
    return datetime.now(timezone.utc)


# ── Quality KPI Aggregation ────────────────────────────────────────────────

def get_quality_kpis(db: Session, project_id: int) -> Dict[str, Any]:
    """Aggregate quality KPIs from stored records. Returns overall health + metrics list."""
    kpis = db.query(QualityKPI).filter(
        QualityKPI.project_id == project_id
    ).order_by(QualityKPI.period_date.desc()).all()

    if not kpis:
        # Return empty scaffold
        return {
            "project_id": project_id,
            "overall_health": "green",
            "metrics": []
        }

    # Latest value per metric type
    latest: Dict[str, QualityKPI] = {}
    for kpi in kpis:
        if kpi.metric_type not in latest:
            latest[kpi.metric_type] = kpi

    metrics = []
    health_flags = []
    for mt, kpi in latest.items():
        status = kpi.status or "on_track"
        metrics.append({
            "type": mt,
            "value": kpi.value,
            "target": kpi.target_value,
            "status": status,
            "line_id": kpi.line_id,
        })
        health_flags.append(status)

    if "failed" in health_flags:
        overall = "red"
    elif "at_risk" in health_flags:
        overall = "yellow"
    else:
        overall = "green"

    return {
        "project_id": project_id,
        "overall_health": overall,
        "metrics": metrics
    }


# ── Heatmap Data ───────────────────────────────────────────────────────────

HEATMAP_METRICS = ["FPY", "DPPM", "REJECT_RATE"]
HEALTH_THRESHOLDS = {
    "FPY":         {"green": 98.0, "yellow": 95.0},   # higher is better
    "DPPM":        {"green": 500,  "yellow": 1000},    # lower is better (inverted)
    "REJECT_RATE": {"green": 1.0,  "yellow": 2.5},     # lower is better (inverted)
}


def _line_health(metric_type: str, value: float) -> str:
    t = HEALTH_THRESHOLDS.get(metric_type)
    if not t:
        return "green"
    if metric_type == "FPY":
        if value >= t["green"]:
            return "green"
        if value >= t["yellow"]:
            return "yellow"
        return "red"
    else:  # lower-is-better metrics
        if value <= t["green"]:
            return "green"
        if value <= t["yellow"]:
            return "yellow"
        return "red"


def get_quality_heatmap(db: Session, project_id: int) -> Dict[str, Any]:
    """Build the line × metric heatmap grid."""
    records = db.query(LineQualityMetric).filter(
        LineQualityMetric.project_id == project_id
    ).order_by(LineQualityMetric.metric_date.desc()).all()

    # Latest record per line
    latest_per_line: Dict[str, LineQualityMetric] = {}
    for r in records:
        if r.line_id not in latest_per_line:
            latest_per_line[r.line_id] = r

    lines = sorted(latest_per_line.keys())
    grid = []
    health_grid = []

    for line in lines:
        r = latest_per_line[line]
        row_values = []
        row_health = []
        for metric in HEATMAP_METRICS:
            val = None
            if metric == "FPY":
                val = r.fpy_rate
            elif metric == "DPPM":
                val = r.dppm
            elif metric == "REJECT_RATE":
                val = (r.reject_count / r.total_units * 100) if r.total_units else None
            row_values.append(val)
            row_health.append(_line_health(metric, val) if val is not None else "green")
        grid.append(row_values)
        health_grid.append(row_health)

    return {
        "project_id": project_id,
        "lines": lines,
        "metrics": HEATMAP_METRICS,
        "grid": grid,
        "health_grid": health_grid,
    }


# ── Defect Logging ─────────────────────────────────────────────────────────

def log_defect(db: Session, project_id: int, **kwargs) -> Defect:
    defect = Defect(project_id=project_id, **kwargs)
    db.add(defect)
    db.commit()
    db.refresh(defect)
    return defect


def get_defects(db: Session, project_id: int, limit: int = 50) -> List[Defect]:
    return db.query(Defect).filter(
        Defect.project_id == project_id
    ).order_by(Defect.created_at.desc()).limit(limit).all()


# ── Pareto / Pattern Analysis ──────────────────────────────────────────────

def get_pareto_patterns(db: Session, project_id: int) -> Dict[str, Any]:
    """Generate Pareto chart data from defect records."""
    rows = db.query(
        Defect.defect_type,
        func.sum(Defect.frequency).label("total_count")
    ).filter(
        Defect.project_id == project_id
    ).group_by(Defect.defect_type).order_by(
        func.sum(Defect.frequency).desc()
    ).all()

    total = sum(r.total_count for r in rows) or 1
    patterns = []
    cumulative = 0.0
    for row in rows:
        pct = round((row.total_count / total) * 100, 1)
        cumulative += pct
        patterns.append({
            "category": row.defect_type,
            "count": row.total_count,
            "pct": pct,
            "cumulative_pct": round(cumulative, 1),
        })

    return {
        "project_id": project_id,
        "patterns": patterns,
        "top_defect_type": patterns[0]["category"] if patterns else None,
    }


# ── Log Line Quality Metric ────────────────────────────────────────────────

def log_line_quality(db: Session, project_id: int, **kwargs) -> LineQualityMetric:
    metric = LineQualityMetric(project_id=project_id, **kwargs)
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric
