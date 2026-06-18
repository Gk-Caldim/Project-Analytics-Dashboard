"""
ML Configuration
================
Centralized configuration for ML model paths, feature names, and alert thresholds.
All values are adjustable via environment variables or system settings.
"""

import os

# ── Model Paths ────────────────────────────────────────────────────────────
ML_MODELS_PATH = os.environ.get("ML_MODELS_PATH", "backend/ml/models")

ML_MODELS = {
    "risk": os.path.join(ML_MODELS_PATH, "risk_model_v1.pkl"),
    "delay": os.path.join(ML_MODELS_PATH, "delay_xgboost_v1.pkl"),
    "quality": os.path.join(ML_MODELS_PATH, "quality_arima_v1.pkl"),
    "anomaly": os.path.join(ML_MODELS_PATH, "anomaly_isolation_v1.pkl"),
    "sentiment": "distilbert-base-uncased-finetuned-sst-2-english",
}

# ── Feature Names ──────────────────────────────────────────────────────────

RISK_FEATURES = [
    "milestone_completion_rate",
    "budget_utilization_rate",
    "defect_rate_trend",
    "supplier_delay_rate",
    "critical_path_slack_days",
    "issue_open_count",
]

DELAY_FEATURES = [
    "task_duration_days",
    "progress_pct",
    "dependency_count",
    "resource_count",
    "historical_delay_rate",
    "is_critical",
]

QUALITY_FEATURES = [
    "fpy_rate",
    "dppm",
    "reject_count",
    "rework_count",
    "defect_trend_7d",
    "new_process_flag",
]

# ── Alert Thresholds ───────────────────────────────────────────────────────

THRESHOLDS = {
    # Risk score
    "risk_critical": 80.0,
    "risk_high":     60.0,
    "risk_medium":   40.0,

    # Budget anomaly
    "budget_anomaly_variance_pct":  15.0,   # % variance to flag
    "budget_anomaly_sigma":          2.0,   # standard deviations

    # Delay prediction
    "delay_high_probability":        0.60,  # 60% probability = alert
    "delay_critical_days":          14,     # >14 days predicted late = critical

    # Quality
    "fpy_at_risk":    98.0,   # below this → at_risk
    "fpy_failed":     95.0,   # below this → failed
    "dppm_at_risk":   500.0,  # above this → at_risk
    "dppm_failed":    1000.0, # above this → failed

    # Sentiment
    "sentiment_critical": -0.5,  # below this → critical urgency

    # Recommendations
    "recommendation_max":  10,  # max recommendations per project
}

# ── Batch Job Config ────────────────────────────────────────────────────────

CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
PREDICTION_CACHE_TTL = int(os.environ.get("PREDICTION_CACHE_TTL", "3600"))  # seconds

# ── Model Versioning ────────────────────────────────────────────────────────

CURRENT_MODEL_VERSIONS = {
    "risk":      "rule_based_v1",
    "delay":     "rule_based_v1",
    "quality":   "rule_based_v1",
    "anomaly":   "statistical_v1",
    "sentiment": "rule_based_v1",
}
