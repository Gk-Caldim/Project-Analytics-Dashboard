"""
ML Pipeline Base
================
Base classes, feature engineering utilities, and prediction result formatting.
Provides the skeleton that Phase 2 ML models will build upon.
"""

import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def _utcnow():
    return datetime.now(timezone.utc)


# ── Base Prediction Service ────────────────────────────────────────────────

class BasePredictionService(ABC):
    """Abstract base class for all ML prediction services."""

    model_name: str = "base"
    model_version: str = "rule_based_v1"
    _model = None

    def load_model(self, model_path: str):
        """Load a serialized model from disk (Phase 2+)."""
        try:
            import pickle
            with open(model_path, "rb") as f:
                self._model = pickle.load(f)
            logger.info(f"[ML] Loaded model {self.model_name} from {model_path}")
        except FileNotFoundError:
            logger.warning(f"[ML] Model file not found: {model_path}. Using rule-based fallback.")
            self._model = None
        except Exception as e:
            logger.error(f"[ML] Failed to load model {self.model_name}: {e}")
            self._model = None

    @abstractmethod
    def predict(self, *args, **kwargs) -> Dict[str, Any]:
        """Run prediction and return result dict."""
        ...

    def format_result(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """Attach metadata to prediction result."""
        return {
            **raw,
            "model_version": self.model_version,
            "predicted_at": _utcnow().isoformat(),
        }


# ── Feature Engineering Utilities ─────────────────────────────────────────

def compute_milestone_delay_rate(milestones: List[Dict]) -> float:
    """Historical delay rate = delayed milestones / total completed milestones."""
    completed = [m for m in milestones if m.get("status") in ("Completed", "Delayed")]
    if not completed:
        return 0.0
    delayed = [m for m in completed if m.get("status") == "Delayed"]
    return round(len(delayed) / len(completed), 3)


def compute_budget_utilization_rate(budget: float, utilized: float) -> float:
    """Utilization rate = utilized / budget."""
    if not budget or budget <= 0:
        return 0.0
    return round(min(utilized / budget, 1.5), 3)  # cap at 150%


def compute_milestone_completion_rate(milestones: List[Dict]) -> float:
    """Completion rate = completed / total."""
    if not milestones:
        return 0.0
    completed = sum(1 for m in milestones if m.get("status") == "Completed")
    return round(completed / len(milestones), 3)


def compute_schedule_variance(milestone: Dict) -> float:
    """Variance = (actual_end - planned_end).days, positive = delayed."""
    try:
        from datetime import datetime
        planned = milestone.get("end_date")
        actual = milestone.get("actual_end") or milestone.get("end_date")
        if not planned or not actual:
            return 0.0
        if isinstance(planned, str):
            planned = datetime.fromisoformat(planned.replace("Z", "+00:00"))
        if isinstance(actual, str):
            actual = datetime.fromisoformat(actual.replace("Z", "+00:00"))
        return (actual - planned).days
    except Exception:
        return 0.0


def compute_critical_path_slack(milestones: List[Dict]) -> float:
    """Average slack days on critical path milestones."""
    critical = [m for m in milestones if m.get("is_critical")]
    if not critical:
        return 30.0  # no critical path = low risk
    slacks = [m.get("total_float_days", 0.0) for m in critical]
    return round(sum(slacks) / len(slacks), 1)


def normalize_score(value: float, min_val: float = 0.0, max_val: float = 100.0) -> float:
    """Clip a value to [0, 100] range."""
    return max(min_val, min(max_val, value))


# ── Prediction Result Formatting ───────────────────────────────────────────

def format_risk_result(
    health_score: float,
    delay_prob: float,
    budget_prob: float,
    quality_risk: float,
    supply_risk: float,
    factors: List[Dict],
    version: str = "rule_based_v1"
) -> Dict[str, Any]:
    level = "low"
    if health_score < 40:
        level = "critical"
    elif health_score < 55:
        level = "high"
    elif health_score < 70:
        level = "medium"

    return {
        "project_health": round(health_score, 1),
        "milestone_delay_probability": round(delay_prob, 3),
        "budget_overrun_probability": round(budget_prob, 3),
        "quality_risk_score": round(quality_risk, 1),
        "supply_chain_risk": round(supply_risk, 1),
        "risk_level": level,
        "contributing_factors": factors[:5],  # top 5
        "model_version": version,
        "last_updated": _utcnow().isoformat(),
    }


def format_delay_result(
    milestone_id: int,
    days_late: int,
    confidence_pct: float,
    factors: List[str],
    actions: List[Dict],
    lower: int = None,
    upper: int = None,
) -> Dict[str, Any]:
    return {
        "milestone_id": milestone_id,
        "predicted_days_late": days_late,
        "confidence_interval": {
            "lower": lower if lower is not None else max(0, days_late - 3),
            "upper": upper if upper is not None else days_late + 5,
        },
        "confidence_pct": round(confidence_pct, 1),
        "contributing_factors": factors,
        "recommended_actions": actions,
    }
