# PROJECT ANALYTICS DASHBOARD - DEVELOPER HANDOVER & IMPLEMENTATION PLAN
**Document Version:** 1.0  
**Date:** June 18, 2026  
**Project:** Project Analytics Dashboard (Automotive)  
**Status:** Gap Analysis Complete - Ready for Phase 1 Implementation

---

## TABLE OF CONTENTS
1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Gap Analysis](#gap-analysis)
4. [Implementation Roadmap](#implementation-roadmap)
5. [Phase 1: Foundation (Weeks 1-4)](#phase-1-foundation)
6. [Phase 2: Predictive Analytics (Weeks 5-8)](#phase-2-predictive-analytics)
7. [Phase 3: Advanced Features (Weeks 9-12)](#phase-3-advanced-features)
8. [Phase 4: Polish & Optimization (Weeks 13-16)](#phase-4-polish--optimization)
9. [Database Schema Changes](#database-schema-changes)
10. [API Endpoints Specification](#api-endpoints-specification)
11. [File Structure & Dependencies](#file-structure--dependencies)
12. [Success Metrics](#success-metrics)

---

## EXECUTIVE SUMMARY

**Last Updated:** June 18, 2026 (POST CODE ANALYSIS)  
**Current Status:** 50% Complete - Database Models Ready, ML Services Missing

### Current State (Actual Code Analysis)
- **Frontend:** 13+ dashboard components (React 18) - Some UIs MISSING
- **Backend:** 54+ data models + 36 fully functional APIs
- **Database:** PostgreSQL with all Phase 1 models deployed ✅
- **AI Capabilities:** Models defined BUT services not computing scores ❌

### ✅ WHAT'S WORKING
1. ✅ 36 API endpoints fully operational
2. ✅ 54+ database models properly structured
3. ✅ Phase 1 foundation complete (all tables exist)
4. ✅ Modern stack: React 18 + FastAPI + PostgreSQL
5. ✅ Security: CORS, rate limiting, auth middleware
6. ✅ WebSocket support (file exists, not integrated)
7. ✅ Validation Dashboard - UI built ✅
8. ✅ AI Insights Panel - UI built ✅

### 🔴 CRITICAL BLOCKERS (ML NOT FUNCTIONAL)

**Severity: CRITICAL - Blocks Phase 2**

| Issue | Status | Impact | Fix Time |
|-------|--------|--------|----------|
| **ML Services Not Implemented** | Tables exist, code doesn't | Cannot compute risk/delay/quality scores | 2-3 weeks |
| **Customer Issues Dashboard** | Model exists, NO UI | Cannot track customer issues | 1 week |
| **Risk Management Dashboard** | Model exists, NO UI | Cannot view project risks | 1 week |
| **Advanced Quality KPIs** | Partial UI only | Missing Pareto + heatmap + predictions | 1 week |
| **WebSocket Not Connected** | File exists, not integrated | No real-time features | 3-4 days |
| **No ML Service Layer** | Logic scattered in APIs | Architecture/performance issues | 1 week |
| **No Caching Strategy** | Direct DB queries | Dashboard slow (3-4 seconds) | 3-4 days |

### Architecture Gaps
| Gap | Current | Needed | Impact |
|-----|---------|--------|--------|
| ML Services | 0 working | 6 services | Risk, delay, quality, cost, defect, sentiment |
| Prediction Pipeline | No Celery | Batch jobs | Nightly score computation |
| Dashboard UIs | 5/7 complete | 7/7 complete | Customer Issues, Risk, Quality KPIs |
| Real-Time | WebSocket file | Full integration | Live alerts + updates |
| Caching | None | Redis layer | 10x faster dashboard load |
| Data Validation | None | Service layer | Catch bad data early |

### Effort & Timeline
- **Phase 1 (Foundation):** 4 weeks - Database + Validation + Quality APIs
- **Phase 2 (ML):** 4 weeks - Risk, delay, quality, anomaly, pattern ML services
- **Phase 3 (Advanced):** 4 weeks - Sentiment, recommendations, AI panel, streaming
- **Phase 4 (Polish):** 4 weeks - Optimization, monitoring, documentation
- **Total:** 16 weeks to production-ready

### Key Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|-----------|
| ML model data insufficiency | High | Start with rule-based, migrate to ML as data accumulates |
| Performance degradation | High | Add materialized views + caching layer (Phase 4) |
| AI feature complexity | Medium | Use pre-trained models (HuggingFace) not custom training |
| Real-time streaming overhead | Medium | Selective broadcasting (only critical alerts) |

---

## CURRENT STATE ANALYSIS

### Frontend Architecture
**Location:** `frontend/src/components/`

#### Implemented Dashboard Components
```
dashboard/
├─ OperationsCommandCenter.jsx ✓
├─ BudgetGovernanceWorkspace.jsx ✓
├─ ProjectTimelinePanel.jsx ✓
├─ QualityHealthCenter.jsx ✓ (partial)
├─ CriticalIssuesCharts.jsx ✓
├─ PortfolioHealthMatrix.jsx ✓
├─ ResourceManagementCenter.jsx ✓
├─ SupplyChainRiskCenter.jsx ✓
├─ OperationalActivityStream.jsx ✓
├─ ResourceLoads.jsx ✓
└─ TodayPrioritiesStrip.jsx ✓
```

#### Key Supporting Components
- `ModulesPanel.jsx` - Module navigation
- `PremiumProjectCard.jsx` - Project card display
- `ExcelTableViewer.jsx` - Data import/export
- `IssueDetailModal.jsx` - Issue tracking
- `LeadModal.jsx` - Lead management

### Backend Architecture
**Location:** `backend/app/`

#### Data Models (45+)
```
models/
├─ core.py (Project, ProjectMilestone, ProjectDependency, ProjectBaseline)
├─ budget.py (BudgetSummary, BudgetRevision, BudgetCommodity, etc.)
├─ issues.py (Issue, IssueAction, IssueComment, IssueEscalation)
├─ employee.py (Employee, Department, EmployeeProjectMap)
├─ upload.py (Upload, UploadTracker, TrackerIngestion, Dataset)
├─ meetings.py (Meeting, MOMSession, Transcript)
├─ users.py (User, Role, Permission, AccessRequest)
└─ notifications.py (Notification, AuditLog, ChatHistory)
```

#### API Routes (120+ endpoints)
```
api/
├─ budget_api.py (Budget CRUD, revisions, commodities, market analysis)
├─ projects_api.py (Projects, milestones, dependencies, baselines)
├─ issues_api.py (Issues, escalations, 8D framework, MOM sync)
├─ dashboard_api.py (Summary, analytics, health metrics)
├─ upload_api.py (Tracker ingestion, file handling)
├─ employee_api.py (Team management)
├─ users_api.py (Access control)
└─ meetings_api.py (Transcript processing)
```

#### Key Services
- `MOMSyncService` - Transcript/meeting data processing
- `IssueEscalationService` - Rule-based escalation logic
- Authentication & Authorization middleware
- File upload & data ingestion pipeline

### Technology Stack
```
Frontend:
- React 18, Redux, Material-UI
- Chart libraries: ECharts, Recharts
- API client: Axios with interceptors
- Build: Vite/Webpack

Backend:
- Python 3.9+
- Flask/FastAPI (mixed)
- SQLAlchemy ORM
- PostgreSQL 12+
- Redis (sessions, caching)

DevOps:
- Docker, Docker-Compose
- GitHub Actions (CI/CD)
- Vercel (Frontend deployment)
```

---

## GAP ANALYSIS

**Current Status:** 50% Complete - 5/7 modules implemented, 7 critical items remaining

### 1. DASHBOARD MODULES STATUS

#### ✅ COMPLETED MODULES
- **Validation Dashboard** - DONE (Inside Project Dashboard)
- **AI Insights Panel** - DONE (Inside Project Dashboard)
- **Project Health Dashboard** - Implemented
- **Budget Management Dashboard** - Implemented
- **Quality Issues Module** - Implemented (basic)

#### ❌ REMAINING MISSING MODULES (7 Total)

##### 🔴 CRITICAL - Phase 2 (Weeks 5-8) - MUST BUILD NEXT

**Module 1: Customer Issues Dashboard**
**Status:** NOT IMPLEMENTED (0%)
**Requirement:** Issue tracking with 8D reports, sentiment analysis, escalation tracking

**Missing Components:**
- `CustomerIssuesDashboard.jsx` (main container)
- `IssueDetailModal.jsx` (detail view with 8D)
- `EightDReportPanel.jsx` (8D tracking)
- `SentimentBadge.jsx` (sentiment indicator)
- `IssueEscalationTimeline.jsx` (escalation history)

**Missing Backend:**
- `customer_feedback_api.py` (new router)
- Data models: `CustomerComplaint`, `SentimentAnalysis`
- Database tables: `customer_complaint`, `sentiment_analysis`

---

**Module 2: Risk Management Dashboard**
**Status:** NOT IMPLEMENTED (0%)
**Requirement:** Risk scoring, probability-impact heatmap, mitigation action tracking

**Missing Components:**
- `RiskManagementDashboard.jsx` (main container)
- `RiskHeatmap.jsx` (5x5 probability-impact matrix)
- `RiskRegister.jsx` (risk list table)
- `MitigationTracker.jsx` (action tracking)
- `RiskScoreCard.jsx` (overall score)

**Missing Backend:**
- `risk_prediction_service.py` (ML service)
- `predictions_api.py` (predictions endpoint)
- Data models: `RiskScore`
- Database tables: `risk_score`, `risk_register`

---

**Module 3: Advanced Quality KPIs**
**Status:** PARTIALLY IMPLEMENTED (30%)
**Requirement:** Pareto chart, line-wise heatmap, defect predictions, KPI cards

**Missing Components:**
- `DefectPareto.jsx` (Pareto 80/20 chart)
- `QualityHeatmap.jsx` (line-wise grid heatmap)
- `KPICards.jsx` (FPY, DPPM, Reject Rate, Rework Rate)
- Enhance `QualityHealthCenter.jsx` with new visualizations

**Missing Backend:**
- Enhanced quality aggregation APIs
- Data models: `QualityKPI`, `LineQualityMetric`, `Defect`, `FailurePattern`
- Database tables for quality metrics and defect tracking

---

##### 🟡 HIGH - Phase 3 (Weeks 9-12)

**Module 4: Supply Chain Risk Module** (0% implemented)
- Supplier performance tracking
- Part availability monitoring

**Module 5: Resource Management Dashboard** (0% implemented)
- Team capacity visualization
- Project allocation tracking
- Bottleneck alerts

---

##### 🟢 MEDIUM - Phase 4 (Weeks 13-16)

**Module 6: Reports Section** (0% implemented)
- Executive dashboards
- Analytics exports

**Module 7: Data Quality Management** (0% implemented)
- Validation rules
- Data profiling

---

### 2. MISSING DATA MODELS (15+ NEW MODELS)

#### Validation & Quality Tracking (4 models)
```python
# backend/app/models/validation.py
class ValidationChecklist(Base):
    """DV/PV/PPAP validation gate tracking"""
    __tablename__ = 'validation_checklist'
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('project.id'))
    stage_type = Column(String)  # 'DV' | 'PV' | 'PPAP'
    checklist_items = Column(JSON)  # [{"name": "...", "complete": true, "dueDate": "..."}]
    completion_status = Column(Float)  # 0-100%
    sign_off_date = Column(DateTime)
    signed_by_id = Column(Integer, ForeignKey('user.id'))
    created_at = Column(DateTime, default=datetime.utcnow)

class PPAPStage(Base):
    """PPAP milestone tracking (Levels 1-4)"""
    __tablename__ = 'ppap_stage'
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('project.id'))
    level = Column(Integer)  # 1-4
    submission_date = Column(DateTime)
    approval_date = Column(DateTime)
    status = Column(String)  # 'submitted' | 'approved' | 'rejected'
    rejection_reason = Column(String)

class DVResult(Base):
    """Design Verification test results"""
    __tablename__ = 'dv_result'
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('project.id'))
    test_name = Column(String)
    pass_fail = Column(Boolean)
    test_date = Column(DateTime)
    findings = Column(String)  # Detailed findings
    test_owner_id = Column(Integer, ForeignKey('employee.id'))

class QualityKPI(Base):
    """Quality metrics: FPY, DPPM, defect rate, etc."""
    __tablename__ = 'quality_kpi'
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('project.id'))
    line_id = Column(Integer, ForeignKey('line.id'), nullable=True)  # per-line or project-wide
    metric_type = Column(String)  # 'FPY' | 'DPPM' | 'REJECT_RATE' | 'REWORK_RATE'
    value = Column(Float)
    target_value = Column(Float)
    period_date = Column(DateTime)
    status = Column(String)  # 'on_track' | 'at_risk' | 'failed'
```

#### Defect & Failure Analysis (2 models)
```python
# backend/app/models/defect.py
class Defect(Base):
    """Defect log with root cause"""
    __tablename__ = 'defect'
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('project.id'))
    defect_type = Column(String)  # 'dimensional' | 'functional' | 'cosmetic'
    category = Column(String)  # Free text or enum
    severity = Column(Integer)  # 1-5
    root_cause = Column(String)  # Detailed analysis
    corrective_action = Column(String)
    closure_date = Column(DateTime)
    line_id = Column(Integer, ForeignKey('line.id'), nullable=True)
    frequency = Column(Integer, default=1)

class FailurePattern(Base):
    """ML-detected failure clusters"""
    __tablename__ = 'failure_pattern'
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('project.id'))
    pattern_id = Column(String, unique=True)  # e.g., "FP001"
    defect_types = Column(JSON)  # ['dimensional', 'functional']
    frequency = Column(Integer)
    affected_lines = Column(JSON)
    prediction_confidence = Column(Float)  # 0-1
    root_cause_cluster = Column(String)  # ML-identified cluster
    created_at = Column(DateTime, default=datetime.utcnow)
```

#### Customer Sentiment & Complaints (2 models)
```python
# backend/app/models/customer_feedback.py
class CustomerComplaint(Base):
    """Customer escalation + complaint tracking"""
    __tablename__ = 'customer_complaint'
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('project.id'))
    customer_name = Column(String)
    complaint_text = Column(String)
    sentiment_score = Column(Float)  # -1.0 to 1.0 (computed via ML)
    urgency_level = Column(String)  # 'critical' | 'high' | 'medium' | 'low'
    eight_d_status = Column(String)  # '8D closure status'
    resolution_date = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)

class SentimentAnalysis(Base):
    """NLP sentiment scores (batch computed)"""
    __tablename__ = 'sentiment_analysis'
    id = Column(Integer, primary_key=True)
    complaint_id = Column(Integer, ForeignKey('customer_complaint.id'))
    positive_keywords = Column(JSON)  # ['satisfied', 'excellent']
    negative_keywords = Column(JSON)  # ['problem', 'delay']
    emotion_label = Column(String)  # 'angry' | 'frustrated' | 'neutral' | 'satisfied'
    ml_confidence_score = Column(Float)  # 0-1
    model_version = Column(String)  # for tracking model evolution
```

#### Cost Anomaly & Budget Analytics (2 models)
```python
# backend/app/models/cost_analysis.py
class CostAnomaly(Base):
    """Flagged anomalous spend patterns"""
    __tablename__ = 'cost_anomaly'
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('project.id'))
    budget_line = Column(String)  # Budget line item
    actual_spend = Column(Float)
    expected_spend = Column(Float)  # Based on trend
    variance_pct = Column(Float)
    anomaly_type = Column(String)  # 'spike' | 'drift' | 'seasonal_mismatch'
    flagged_date = Column(DateTime)
    root_cause_analysis = Column(String, nullable=True)
    flagged_by = Column(String)  # 'statistical' | 'rule_based' | 'ml_detected'

class ShouldCostBenchmark(Base):
    """Competitive cost targets"""
    __tablename__ = 'should_cost_benchmark'
    id = Column(Integer, primary_key=True)
    category = Column(String)  # 'PCB' | 'Assembly' | 'Tooling'
    target_cost = Column(Float)
    source_market = Column(String)  # Market source
    market_price_index = Column(String)  # Index reference
    cost_driver_1 = Column(String)  # Volume, material cost, etc.
    cost_driver_2 = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
```

#### ML Predictions & Risk Scoring (3 models)
```python
# backend/app/models/predictions.py
class RiskScore(Base):
    """AI-driven project risk (0-100)"""
    __tablename__ = 'risk_score'
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('project.id'))
    milestones_delay_probability = Column(Float)  # 0-1
    budget_overrun_probability = Column(Float)  # 0-1
    quality_risk_score = Column(Float)  # 0-100
    supply_chain_risk = Column(Float)  # 0-100
    overall_health_score = Column(Float)  # 0-100
    computed_at = Column(DateTime)
    model_version = Column(String)
    contributing_factors = Column(JSON)  # Top 5 risk drivers

class DelayPrediction(Base):
    """Schedule risk ML model output"""
    __tablename__ = 'delay_prediction'
    id = Column(Integer, primary_key=True)
    milestone_id = Column(Integer, ForeignKey('project_milestone.id'))
    predicted_days_late = Column(Integer)
    confidence_interval = Column(JSON)  # {"lower": X, "upper": Y}
    contributing_factors = Column(JSON)  # ['resource_constraint', 'supplier_delay']
    prediction_date = Column(DateTime)
    model_used = Column(String)  # 'xgboost_v1' | 'arima_v2'

class DefectPrediction(Base):
    """Quality risk forecasting"""
    __tablename__ = 'defect_prediction'
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('project.id'))
    predicted_defect_rate = Column(Float)  # %
    predicted_dppm = Column(Float)
    line_risk_levels = Column(JSON)  # {"line1": 0.3, "line2": 0.7}
    contributing_risks = Column(JSON)  # ['new_process', 'supplier_change']
    prediction_date = Column(DateTime)
```

#### Line-wise Quality Heatmap (1 model)
```python
# backend/app/models/line_quality.py
class LineQualityMetric(Base):
    """Per-assembly-line quality tracking"""
    __tablename__ = 'line_quality_metric'
    id = Column(Integer, primary_key=True)
    line_id = Column(Integer, ForeignKey('line.id'))
    project_id = Column(Integer, ForeignKey('project.id'))
    metric_date = Column(DateTime)
    fpy_rate = Column(Float)  # First Pass Yield
    dppm = Column(Float)  # Defects Per Million
    reject_count = Column(Integer)
    rework_count = Column(Integer)
    health_status = Column(String)  # 'green' | 'yellow' | 'red'
    quality_engineer_id = Column(Integer, ForeignKey('employee.id'))
```

---

### 3. MISSING API ENDPOINTS (50+ NEW ENDPOINTS)

#### **AI/Predictive Analytics API**
```python
# backend/app/api/predictions_api.py (NEW)

@router.get("/api/predictions/project/{project_id}/risk-score")
def get_project_risk_score(project_id: int):
    """
    Returns: {
        "project_health": 75,  # 0-100 overall health
        "milestone_delay_probability": 0.35,
        "budget_overrun_probability": 0.22,
        "quality_risk_score": 45,
        "supply_chain_risk": 60,
        "contributing_factors": [
            {"factor": "supplier_delay", "impact": 0.4},
            {"factor": "resource_shortage", "impact": 0.3}
        ],
        "model_version": "v1.2.3",
        "last_updated": "2026-06-18T14:30:00Z"
    }
    """

@router.get("/api/predictions/project/{project_id}/milestone/{milestone_id}/delay")
def predict_milestone_delay(project_id: int, milestone_id: int):
    """
    Returns: {
        "milestone_id": 123,
        "predicted_days_late": 5,
        "confidence_interval": {"lower": 2, "upper": 9},
        "confidence_pct": 78,
        "contributing_factors": ["critical_path_constraint", "resource_allocation"],
        "recommended_actions": [
            {"action": "Fast-track critical path", "priority": "high"},
            {"action": "Reallocate resources", "priority": "medium"}
        ]
    }
    """

@router.get("/api/predictions/project/{project_id}/quality-forecast")
def forecast_quality_metrics(project_id: int):
    """
    Returns: {
        "predicted_defect_rate": 2.5,  # %
        "predicted_dppm": 450,
        "predicted_fpy": 97.5,
        "line_risks": {
            "line_1": 0.35,  # Risk score 0-1
            "line_2": 0.62,
            "line_3": 0.28
        },
        "contributing_risks": ["new_supplier", "design_complexity"],
        "confidence": 0.82
    }
    """

@router.post("/api/predictions/run-batch")
def trigger_batch_predictions():
    """Async task to compute all predictions for all projects"""
    # Returns: {"job_id": "xyz", "status": "queued"}
```

#### **Anomaly Detection API**
```python
# backend/app/api/anomalies_api.py (NEW)

@router.get("/api/anomalies/budget/{project_id}")
def get_budget_anomalies(project_id: int):
    """
    Returns: [
        {
            "budget_line": "PCB Components",
            "actual_spend": 50000,
            "expected_spend": 42000,
            "variance_pct": 19.0,
            "anomaly_type": "spike",
            "flagged_date": "2026-06-18T10:00:00Z",
            "severity": "high",
            "suggested_action": "Review supplier pricing"
        }
    ]
    """

@router.get("/api/anomalies/quality/{project_id}")
def get_quality_anomalies(project_id: int):
    """Returns defect spikes, pattern clusters"""

@router.get("/api/anomalies/timeline/{project_id}")
def get_schedule_anomalies(project_id: int):
    """Returns schedule variance, critical path issues"""
```

#### **Validation/Quality API**
```python
# backend/app/api/quality_api.py (NEW)

@router.post("/api/quality/validation-checklist/{project_id}")
def create_validation_checklist(project_id: int, request: ValidationChecklistRequest):
    """Create/update DV/PV/PPAP checklist"""
    # Returns: ValidationChecklistResponse

@router.get("/api/quality/ppap/{project_id}")
def get_ppap_progress(project_id: int):
    """
    Returns: {
        "level_1": {"status": "approved", "submission_date": "...", "approval_date": "..."},
        "level_2": {"status": "submitted", "submission_date": "..."},
        "level_3": {"status": "pending"},
        "level_4": {"status": "not_started"}
    }
    """

@router.get("/api/quality/kpis/{project_id}")
def get_quality_kpis(project_id: int):
    """
    Returns: {
        "overall_health": "green",
        "metrics": [
            {"type": "FPY", "value": 98.5, "target": 99.0, "status": "at_risk"},
            {"type": "DPPM", "value": 450, "target": 500, "status": "on_track"},
            {"type": "REJECT_RATE", "value": 1.2, "target": 1.0, "status": "failed"}
        ]
    }
    """

@router.get("/api/quality/heatmap/{project_id}")
def get_quality_heatmap(project_id: int):
    """
    Returns grid data for line-wise quality metrics:
    {
        "lines": ["Line_1", "Line_2", "Line_3"],
        "metrics": ["FPY", "DPPM", "REJECT_RATE"],
        "grid": [
            [98.5, 450, 1.2],  # Line 1
            [97.2, 580, 2.1],  # Line 2
            [99.1, 320, 0.8]   # Line 3
        ]
    }
    """

@router.get("/api/quality/defect-analysis/patterns")
def get_defect_patterns(project_id: int):
    """
    Returns Pareto chart data:
    {
        "patterns": [
            {"category": "Dimensional", "count": 45, "pct": 60},
            {"category": "Functional", "count": 20, "pct": 27},
            {"category": "Cosmetic", "count": 10, "pct": 13}
        ]
    }
    """

@router.post("/api/quality/defect/{project_id}")
def log_defect(project_id: int, request: DefectLogRequest):
    """Log new defect"""
```

#### **Sentiment & Customer Feedback API**
```python
# backend/app/api/customer_feedback_api.py (NEW)

@router.post("/api/customer/complaints/{project_id}")
def log_customer_complaint(project_id: int, request: ComplaintRequest):
    """
    Log complaint with auto-sentiment analysis
    Returns: ComplaintResponse (includes computed sentiment_score, urgency_level)
    """

@router.get("/api/customer/sentiment-trend/{project_id}")
def get_sentiment_trend(project_id: int, days: int = 30):
    """
    Returns sentiment trend over time:
    {
        "data": [
            {"date": "2026-06-01", "sentiment_score": 0.45, "count": 5},
            {"date": "2026-06-02", "sentiment_score": 0.32, "count": 8}
        ]
    }
    """

@router.get("/api/customer/8d-status/{project_id}")
def get_8d_status(project_id: int):
    """
    Returns 8D effectiveness:
    {
        "closure_rate": 85.5,
        "avg_resolution_days": 15,
        "escalation_rate": 8.2
    }
    """
```

#### **Cost Intelligence API**
```python
# backend/app/api/cost_analysis_api.py (EXTEND from budget_api.py)

@router.get("/api/budget/{project_id}/should-cost-analysis")
def get_should_cost_analysis(project_id: int):
    """
    Returns should-cost vs actual for competitive positioning:
    {
        "recommendations": [
            {
                "category": "PCB Assembly",
                "target_cost": 35000,
                "actual_cost": 42000,
                "savings_opportunity": 7000,
                "action": "Negotiate supplier or change design"
            }
        ]
    }
    """

@router.get("/api/budget/{project_id}/forecast-vs-actual")
def get_budget_forecast(project_id: int):
    """
    Returns cumulative spend trend and EAC (Estimate At Completion):
    {
        "eac": 250000,  # Estimate at completion
        "current_spend": 180000,
        "budget": 240000,
        "overrun_probability": 0.65,
        "forecast_data": [
            {"month": "May", "planned": 50000, "actual": 55000},
            {"month": "June", "planned": 60000, "actual": 62500}
        ]
    }
    """
```

#### **AI Assistant/Recommendation API**
```python
# backend/app/api/recommendations_api.py (NEW)

@router.get("/api/ai-assistant/recommendations/{project_id}")
def get_recommendations(project_id: int):
    """
    Returns actionable recommendations:
    [
        {
            "id": "rec_123",
            "type": "risk_alert",
            "title": "Schedule delay risk detected",
            "description": "Critical path shows 35% delay probability",
            "action": "Fast-track tooling approval",
            "urgency": "high",
            "impact": "medium",
            "suggested_by": "ai_risk_engine",
            "data": {"milestone_id": 45, "confidence": 0.78}
        },
        {
            "id": "rec_124",
            "type": "cost_optimization",
            "title": "Supplier cost reduction opportunity",
            "description": "Component X is 15% above market price",
            "action": "Renegotiate or change supplier",
            "urgency": "medium",
            "impact": "high"
        }
    ]
    """

@router.get("/api/ai-assistant/anomalies-detected")
def get_detected_anomalies(limit: int = 20):
    """Real-time flagged issues across all projects"""

@router.post("/api/ai-assistant/chat")
def chat_with_assistant(request: ChatRequest):
    """
    Conversational AI for dashboard insights
    Returns: {"response": "...", "data": {...}, "confidence": 0.85}
    """
```

---

### 4. MISSING AI/ML FEATURES (6 MAJOR SERVICES)

#### Risk Prediction Engine
```python
# backend/app/services/risk_prediction_service.py
def compute_project_health_score(project_id: int) -> RiskScoreOutput:
    """
    Combines multiple risk factors:
    1. Milestone delay probability
       - Historical task duration variance
       - Current progress vs baseline
       - Critical path slack
    2. Budget overrun probability
       - Spending rate vs baseline
       - Variance trend
       - Procurement risk
    3. Quality risk score
       - Defect rate trend
       - SPC (Statistical Process Control) signals
       - Design/process changes
    4. Supply chain risk
       - Supplier on-time delivery %
       - Parts availability
       - Geopolitical factors
    
    Output: RiskScore object with contributing_factors
    """
```

#### Schedule Delay Prediction
```python
# backend/app/services/schedule_prediction_service.py
def predict_milestone_delay(milestone_id: int) -> DelayPrediction:
    """
    ML Features:
    - Task type, estimated duration
    - Actual progress, % complete
    - Dependency chain (critical path)
    - Resource availability vs required
    - Historical delay patterns
    
    Model: XGBoost or LightGBM trained on project history
    Output: Days late, confidence interval, contributing factors
    """
```

#### Quality Prediction
```python
# backend/app/services/quality_prediction_service.py
def predict_quality_metrics(project_id: int) -> QualityForecast:
    """
    Time-series forecasting of quality KPIs:
    - Historical DPPM/FPY by line
    - Current inline defect trend
    - Process change flags (tooling, supplier, personnel)
    - Design complexity factors
    
    Model: ARIMA/Prophet or ML regression
    Output: Predicted DPPM, FPY, line-wise risks
    """
```

#### Cost Anomaly Detection
```python
# backend/app/services/cost_anomaly_service.py
def detect_budget_anomalies(project_id: int) -> List[CostAnomaly]:
    """
    Statistical techniques:
    - Isolation Forest for outlier detection
    - Exponential smoothing baseline + variance thresholding
    - Seasonal decomposition
    
    Output: Flagged spend items with anomaly type and variance %
    """
```

#### Sentiment Analysis
```python
# backend/app/services/sentiment_service.py
def analyze_customer_sentiment(complaint_text: str) -> SentimentOutput:
    """
    Pre-trained model: HuggingFace DistilBERT
    Auto-triggered on complaint creation
    
    Output: sentiment_score (-1 to 1), emotion, key_phrases, urgency_level
    """
```

#### Failure Pattern Discovery
```python
# backend/app/services/failure_pattern_service.py
def discover_defect_patterns(project_id: int) -> List[FailurePattern]:
    """
    Clustering algorithms:
    - K-means on defect types + root causes
    - Time series analysis for seasonal patterns
    - Correlation with process/design changes
    
    Output: Pareto chart data + failure clusters
    """
```

---

### 5. ARCHITECTURE GAPS

#### ML Model Serving Infrastructure (MISSING)
```
Required Components:
├─ Model Registry (MLflow or similar)
├─ Batch Prediction Scheduler (Celery + Redis/RabbitMQ)
├─ Real-time Inference API (FastAPI endpoint)
├─ Model Versioning & A/B Testing
├─ Feature Store (for caching computed features)
└─ Model Monitoring (performance tracking, data drift)

Files to Create:
- backend/app/services/ml_pipeline.py
- backend/app/core/ml_config.py
- backend/tasks/celery_tasks.py
- docker-compose.yml (add Redis/RabbitMQ)
```

#### Real-Time Data Streaming (MISSING)
```
Current: Static API calls (good for snapshots)
Required: WebSocket streaming for live updates

Missing Components:
├─ Real-time anomaly alerts via WebSocket
├─ Live quality metrics updates
├─ Budget variance notifications
├─ Risk score recalculation triggers

Files to Create:
- backend/app/core/streaming.py (WebSocket handlers)
- backend/app/services/event_publisher.py
- frontend/src/hooks/useRealtimeUpdates.js
```

#### Data Warehouse / OLAP Layer (MISSING)
```
Current: Row-based OLTP (transactional)
Missing: Column-based OLAP (analytical)

Options:
1. Add TimescaleDB extension (time-series optimization)
2. DuckDB materialized views
3. Separate read replica with analytical indexes

Missing:
- Aggregate tables (daily rollups by project/line)
- Materialized views for dashboard queries
- Time-series optimizations
```

---

## IMPLEMENTATION ROADMAP

**Last Updated:** June 18, 2026 - UPDATED TO REFLECT COMPLETED MODULES

### Current Status: 50% Complete (Ready for Phase 2)
- ✅ Validation Dashboard - DONE
- ✅ AI Insights Panel - DONE
- ❌ Customer Issues Dashboard - CRITICAL (Week 5)
- ❌ Risk Management Dashboard - CRITICAL (Week 6-7)
- ❌ Advanced Quality KPIs - CRITICAL (Week 7-8)
- ❌ ML Infrastructure - CRITICAL (Week 3-4)

### Phase Overview
```
Phase 1: Foundation (Weeks 1-4) - DATABASE & INFRASTRUCTURE
├─ Database Models (6 files, 900 LOC) ✅ READY
├─ API Routers (Validation, Quality APIs) ✅ READY
├─ ML Infrastructure (Celery, Redis) ✅ READY
└─ Unit & Integration Tests ✅ READY

Phase 2: Critical Dashboards + Predictive Analytics (Weeks 5-8) - START NOW
├─ Customer Issues Dashboard (NEW - HIGH PRIORITY - Week 5)
├─ Risk Management Dashboard (NEW - HIGH PRIORITY - Week 6-7)
├─ Advanced Quality KPIs (NEW - HIGH PRIORITY - Week 7-8)
├─ 6 ML Services (1800 LOC)
├─ Risk Scoring, Delay Prediction, Quality Forecasting
├─ Cost Anomaly Detection, Failure Patterns
└─ Recommendation Engine v1 (Rule-based)

Phase 3: Advanced Features (Weeks 9-12)
├─ Sentiment Analysis Integration (HuggingFace)
├─ Enhanced AI Insights Panel (Real-time)
├─ WebSocket Streaming
├─ Supply Chain Risk Module (Optional)
└─ Resource Management Dashboard (Optional)

Phase 4: Polish & Optimization (Weeks 13-16)
├─ Data Validation Service
├─ Performance Optimization
├─ ML Model Monitoring
├─ Reports Section & Data Quality Management
└─ Production Deployment
```

**KEY CHANGE:** Phase 2 now focused on 3 critical missing dashboards PLUS ML models

---

## PHASE 1: FOUNDATION (WEEKS 1-4) ✅ COMPLETE & READY FOR PHASE 2

**Goal:** Database models + ML infrastructure ready for Phase 2 ML services  
**Status:** ✅ READY - Proceed to Phase 2

### Week 1: Database Models & Schema

#### Tasks
1. Create 6 new database model files (900 LOC total)
   - `backend/app/models/validation.py` (280 LOC) - 4 models
   - `backend/app/models/defect.py` (150 LOC) - 2 models
   - `backend/app/models/customer_feedback.py` (120 LOC) - 2 models
   - `backend/app/models/cost_analysis.py` (140 LOC) - 2 models
   - `backend/app/models/predictions.py` (160 LOC) - 3 models
   - `backend/app/models/line_quality.py` (90 LOC) - 1 model

2. Create Alembic migration
   - `backend/alembic/versions/add_validation_models.py`
   - Run migration: `alembic upgrade head`

3. Update `backend/app/models/__init__.py` to export new models

#### Deliverables
- ✓ 6 new SQLAlchemy models
- ✓ Database migration script
- ✓ Relationships defined (ForeignKeys)
- ✓ All indexed columns optimized

#### Effort: 2 days | Owner: Backend Lead

---

### Week 1-2: Validation Dashboard Backend

#### Tasks
1. Create Pydantic schemas
   - `backend/app/schemas/validation.py`

2. Create API router
   - `backend/app/api/validation_api.py`
   - Endpoints:
     - POST `/api/quality/validation-checklist/{project_id}` (create)
     - GET `/api/quality/validation-checklist/{project_id}` (read)
     - PUT `/api/quality/validation-checklist/{checklist_id}` (update)
     - GET `/api/quality/ppap/{project_id}` (PPAP progress)
     - POST `/api/quality/ppap/{project_id}/level/{level}` (submit PPAP level)

3. Service layer
   - `backend/app/services/validation_service.py`

#### Deliverables
- ✓ CRUD API for validation checklist
- ✓ PPAP milestone tracking
- ✓ DV/PV/PPAP stage management
- ✓ Unit tests for all endpoints

#### Effort: 3 days | Owner: Backend Developer

---

### Week 2: Quality Dashboard Backend

#### Tasks
1. Create quality-specific schemas & API
   - `backend/app/schemas/quality.py`
   - `backend/app/api/quality_api.py` (extend if dashboard_api already exists)

2. Implement endpoints
   - GET `/api/quality/kpis/{project_id}` (KPI dashboard)
   - GET `/api/quality/heatmap/{project_id}` (line-wise grid)
   - POST `/api/quality/defect/{project_id}` (log defect)
   - GET `/api/quality/defect-analysis/patterns` (Pareto data)

3. Service layer
   - `backend/app/services/quality_service.py`
   - Aggregation logic: FPY = (total_parts - defective) / total_parts
   - DPPM = (defects / units_produced) * 1,000,000

#### Deliverables
- ✓ Quality KPI aggregation logic
- ✓ Heatmap data generation
- ✓ Defect logging & categorization
- ✓ Integration with QualityKPI model

#### Effort: 3 days | Owner: Backend Developer

---

### Week 3: Customer Feedback API

#### Tasks
1. Create schemas & API
   - `backend/app/schemas/customer_feedback.py`
   - `backend/app/api/customer_feedback_api.py`

2. Implement endpoints
   - POST `/api/customer/complaints/{project_id}` (log with placeholder sentiment)
   - GET `/api/customer/sentiment-trend/{project_id}` (return trend data)
   - GET `/api/customer/8d-status/{project_id}` (8D tracking)

3. Note: Sentiment computation deferred to Phase 3

#### Deliverables
- ✓ Complaint logging API
- ✓ Trend aggregation (basic)
- ✓ 8D status tracking

#### Effort: 2 days | Owner: Backend Developer

---

### Week 3-4: ML Infrastructure Setup

#### Tasks
1. Create ML configuration & pipeline
   - `backend/app/core/ml_config.py`
   - Define: model paths, feature names, threshold values
   - Example: `ML_MODELS = {"risk": "/models/risk_xgboost_v1.pkl", ...}`

2. Create ML service skeleton
   - `backend/app/services/ml_pipeline.py`
   - Base classes for prediction services
   - Feature engineering utilities

3. Setup Celery for async predictions
   - `backend/tasks/celery_tasks.py`
   - Task: `compute_daily_predictions` (runs nightly)
   - Enqueue: `run_prediction_batch.delay()`

4. Update Docker & environment
   - `docker-compose.yml`: Add Redis service for Celery broker
   - `.env`: Add ML model paths, prediction configs
   - `backend/requirements.txt`: Add scikit-learn, xgboost, celery, redis

#### Deliverables
- ✓ ML service registry
- ✓ Celery task structure
- ✓ Redis integration for message broker
- ✓ Configuration system for model versioning

#### Effort: 3 days | Owner: Backend Lead + ML Engineer

---

### Week 4: Integration & Testing

#### Tasks
1. Integration tests
   - Test all 3 new API routes (validation, quality, customer feedback)
   - Test database schema integrity
   - Test Celery task execution

2. Data seeding
   - Create test data for validation checklist, defects, complaints
   - Populate sample QualityKPI records for heatmap testing

3. Documentation
   - API spec for new endpoints (Swagger auto-generated)
   - Database schema diagram
   - Setup guide for ML infrastructure

#### Deliverables
- ✓ 100+ test cases
- ✓ Sample data in test database
- ✓ API documentation

#### Effort: 2 days | Owner: QA + Backend Lead

---

### Phase 1 Success Criteria
- [ ] 6 new database models deployed
- [ ] 12+ new API endpoints working
- [ ] Validation dashboard backend complete
- [ ] Quality dashboard backend complete
- [ ] Customer feedback API complete
- [ ] ML infrastructure (Celery + Redis) operational
- [ ] All tests passing (>90% coverage)

---

## PHASE 2A: FIX ML IMPLEMENTATION (WEEKS 1-3) 🔴 CRITICAL - START IMMEDIATELY

**Goal:** Unblock Phase 2 by implementing actual ML services  
**Status:** Database models exist ✅, but services DON'T compute scores ❌

### Week 1: Implement ML Prediction Services

**Create 3 New Services (Start with Rule-Based Logic):**

1. **`backend/app/services/risk_prediction_service.py`**
```python
def compute_project_health_score(project_id: int) -> RiskScore:
    """
    Weighted formula (rule-based, NO ML yet):
    risk_score = 0.3×delay_prob + 0.25×budget_prob + 0.25×quality_risk + 0.2×supply_risk
    
    Data sources:
    - delay_prob: ProjectMilestone variance
    - budget_prob: BudgetRevision spending variance
    - quality_risk: QualityKPI trend analysis
    - supply_risk: Supplier on-time percent (if available)
    """
    # Query project data
    # Calculate probabilities
    # Save to risk_score table
```

2. **`backend/app/services/delay_prediction_service.py`**
```python
def predict_milestone_delay(milestone_id: int) -> DelayPrediction:
    """
    Rule-based delay prediction:
    - Get task duration history (similar tasks)
    - Calculate variance from baseline
    - Factor in dependencies
    - Predict days_late
    """
```

3. **`backend/app/services/quality_prediction_service.py`**
```python
def predict_quality_metrics(project_id: int) -> DefectPrediction:
    """
    Time-series trend analysis (rule-based):
    - Get historical defect rates by line
    - Calculate trend (up/down/stable)
    - Extrapolate 30-day forecast
    - Predict DPPM + FPY
    """
```

**Deliverable:** 3 services returning actual predictions (not defaults)

---

### Week 2: Wire Celery Batch Jobs

**Create `backend/tasks/celery_tasks.py`:**
```python
@celery.task
def compute_daily_predictions():
    """Run nightly (2 AM) to compute all predictions"""
    for project in db.query(Project).all():
        compute_project_health_score(project.id)
        for milestone in project.milestones:
            predict_milestone_delay(milestone.id)
        predict_quality_metrics(project.id)
```

**Setup:**
- Celery broker: Redis
- Schedule: Daily 2 AM
- Timeout: 30 minutes
- Error handling: Retry 3x

**Deliverable:** Nightly batch jobs populating prediction tables

---

### Week 3: Build Missing Dashboard UIs

**Create 3 Missing Components:**

1. **`frontend/src/components/dashboard/CustomerIssuesDashboard.jsx`**
   - Issue summary cards (Open, Critical, Overdue)
   - Issue list table with filters (ID, Customer, Description, Severity, Sentiment)
   - Sentiment distribution widget
   - Add to sidebar under Dashboard

2. **`frontend/src/components/dashboard/RiskManagementDashboard.jsx`**
   - Risk heatmap (5×5 probability vs impact matrix)
   - Risk score card (0-100 overall)
   - Risk register table (sortable)
   - Mitigation action tracker
   - Add to sidebar as main section

3. **Enhance `frontend/src/components/dashboard/QualityHealthCenter.jsx`**
   - Add KPI cards (FPY, DPPM, Reject Rate, Rework Rate)
   - Add Pareto chart (defect categories - 80/20 rule)
   - Add quality heatmap (line-wise grid)
   - Add trend visualization

**Deliverable:** 3 dashboards live, pulling real API data

---

### Week 4+: ML Enhancement & Real-Time

**Phase 2B (Weeks 4-5):**
- Sentiment Analysis Service (HuggingFace DistilBERT)
- Defect Clustering (K-means)
- Recommendation Engine (rule-based v1)
- WebSocket integration

**Phase 2C (Weeks 6-8):**
- Redis caching layer
- API documentation (Swagger)
- Unit tests for all services
- Performance optimization (indexes)

---

## PHASE 2: CRITICAL DASHBOARDS + PREDICTIVE ANALYTICS (WEEKS 5-8) - AFTER FIXING BLOCKERS

**ONLY AFTER Phase 2A Complete**

**Goal:** 50% → 80% implementation  
**NEW PRIORITIES (High ROI):**
1. **Week 4:** Sentiment Analysis (HuggingFace integration)
2. **Week 5:** WebSocket Real-Time Integration
3. **Week 6:** Recommendation Engine + Defect Clustering
4. **Week 7-8:** Architecture improvements (caching, tests, docs)

### Week 5: Risk Scoring Service

#### Task
Implement `backend/app/services/risk_prediction_service.py`

```python
def compute_project_health_score(project_id: int) -> RiskScoreOutput:
    """
    Weighted formula (adjustable):
    
    risk_score = 0.3 * delay_risk + 0.25 * budget_risk + 0.25 * quality_risk + 0.2 * supply_risk
    
    Each component: 0-100 scale
    """
```

#### Data Requirements
- ProjectMilestone: baseline schedule vs actual progress
- BudgetRevision: spending variance trend
- QualityKPI: defect rate trend
- SupplierPerformance (if exists) or external data

#### Model Selection
- Rule-based initially (Weeks 5-6)
- Transition to supervised ML (Week 7+) as data accumulates

#### Deliverables
- ✓ Risk scoring algorithm
- ✓ GET `/api/predictions/project/{project_id}/risk-score` endpoint
- ✓ RiskScore model populated nightly

#### Effort: 3 days | Owner: ML Engineer

---

### Week 6: Schedule Delay Prediction

#### Task
Implement `backend/app/services/schedule_prediction_service.py`

#### ML Model
- Algorithm: XGBoost Regressor
- Input features:
  - task_duration (actual vs estimated)
  - task_progress (% complete)
  - dependency_count
  - resource_utilization
  - historical_delay_rate (for task type)
- Output: days_late (integer)

#### Training Data
- Source: ProjectMilestone + Upload tracker data
- Historical: 3+ months of project data
- Initial: 20+ completed milestones

#### Deliverables
- ✓ XGBoost model (serialized to `.pkl`)
- ✓ GET `/api/predictions/milestone/{milestone_id}/delay` endpoint
- ✓ DelayPrediction model populated

#### Effort: 4 days | Owner: ML Engineer

---

### Week 6-7: Quality Prediction

#### Task
Implement `backend/app/services/quality_prediction_service.py`

#### ML Model
- Algorithm: Time-series (ARIMA or Prophet)
- Input: Historical QualityKPI + Defect records
- Output: Predicted DPPM, predicted FPY, line-wise risks

#### Approach
1. Aggregate defects by line/day
2. Fit ARIMA model per line
3. Forecast 30-day rolling window
4. Flag lines with predicted high defect rates

#### Deliverables
- ✓ Quality forecasting model
- ✓ GET `/api/predictions/project/{project_id}/quality-forecast` endpoint
- ✓ DefectPrediction model updated

#### Effort: 4 days | Owner: ML Engineer

---

### Week 7: Cost Anomaly Detection

#### Task
Implement `backend/app/services/cost_anomaly_service.py`

#### Algorithms
1. Isolation Forest: Detect outliers in spend by category
2. Exponential smoothing: Establish baseline, flag deviations >2σ
3. Seasonal decomposition: For projects >6 months data

#### Implementation
```python
def detect_budget_anomalies(project_id: int):
    # 1. Get all budget revisions for project
    # 2. Aggregate spend by line, by week
    # 3. Apply isolation_forest + exponential_smoothing
    # 4. Return flagged_items with anomaly_type & variance_pct
```

#### Deliverables
- ✓ GET `/api/anomalies/budget/{project_id}` endpoint
- ✓ CostAnomaly model populated
- ✓ Alert thresholds configurable

#### Effort: 3 days | Owner: Data Scientist

---

### Week 8: Failure Pattern Discovery & Recommendation Engine

#### Task 1: Failure Pattern Discovery
Implement `backend/app/services/failure_pattern_service.py`

- K-means clustering on defect root causes
- Generate Pareto chart (80/20 rule)
- Output: Top 3-5 failure patterns

#### Task 2: Recommendation Engine (Partial)
Implement `backend/app/services/recommendation_service.py`

- Rule-based recommendations triggered by:
  - Budget variance > 15% → "Review cost drivers"
  - Quality trend down → "Initiate root cause analysis"
  - Delay risk > 60% → "Fast-track critical path"

#### Deliverables
- ✓ GET `/api/quality/defect-analysis/patterns` endpoint
- ✓ GET `/api/ai-assistant/recommendations/{project_id}` endpoint (rule-based)
- ✓ FailurePattern model populated

#### Effort: 4 days | Owner: ML Engineer + Backend Developer

---

### Phase 2 Success Criteria
- [ ] Risk scoring algorithm deployed & tested
- [ ] Delay prediction model (XGBoost) with >75% accuracy
- [ ] Quality forecasting model operational
- [ ] Cost anomaly detection working (precision >80%)
- [ ] Failure pattern discovery (Pareto charts) working
- [ ] Recommendation engine (rule-based v1) deployed
- [ ] All prediction endpoints return valid data
- [ ] Batch prediction jobs (Celery) running nightly

---

## PHASE 3: ADVANCED FEATURES (WEEKS 9-12)

**Goal:** 80% → 95% implementation. AI Assistant + sentiment + real-time.

### Week 9: Sentiment Analysis Integration

#### Task
Implement `backend/app/services/sentiment_service.py`

#### Model
- Pre-trained: HuggingFace DistilBERT (distilbert-base-uncased-finetuned-sst-2-english)
- Auto-triggered: On CustomerComplaint creation
- Output: sentiment_score, emotion_label, key_phrases, urgency

#### Implementation
```python
def analyze_customer_sentiment(complaint_text: str) -> SentimentOutput:
    # Load model
    classifier = pipeline("sentiment-analysis", model="...")
    
    # Analyze
    result = classifier(complaint_text)
    
    # Post-process: sentiment_score = -1 to 1
    # emotion_label = map to {'angry', 'frustrated', 'neutral', 'satisfied'}
    # urgency = derive from sentiment + keywords
```

#### Integration
- Hook: Post-save listener on CustomerComplaint
- Async: Run in Celery task (don't block API)

#### Deliverables
- ✓ Sentiment analysis integrated into complaint creation
- ✓ SentimentAnalysis model populated
- ✓ Sentiment badge in UI (Week 10)

#### Effort: 2 days | Owner: ML Engineer

---

### Week 10: AI Assistant Panel & Recommendations (Complete)

#### Frontend Task
Implement `frontend/src/components/AIAssistantPanel.jsx`

Features:
- Floating panel (bottom-right corner)
- Real-time alerts (new recommendations)
- Clickable actions (dismiss, drill-down)
- Sentiment-driven icons (🔴 for angry, 🟡 for concern, 🟢 for satisfied)

#### Backend Task
Enhance `recommendation_service.py` with ML-triggered recommendations

#### Integration
- Subscribe to WebSocket for real-time updates (Week 11)
- Initial: Poll GET `/api/ai-assistant/recommendations/{project_id}` every 60s

#### Deliverables
- ✓ AIAssistantPanel.jsx component
- ✓ GET `/api/ai-assistant/recommendations` endpoint enhanced
- ✓ Real-time alert capability (polling initially)

#### Effort: 4 days | Owner: Frontend Lead + Backend Developer

---

### Week 11: Real-Time WebSocket Streaming

#### Backend Task
Implement `backend/app/core/streaming.py`

Features:
- WebSocket server (FastAPI + python-socketio or similar)
- Broadcast channels per project
- Auto-subscribe on dashboard load

#### Events to Stream
1. Risk score updated
2. Anomaly detected (cost, quality, schedule)
3. New recommendation generated
4. Sentiment flagged (critical)

#### Implementation
```python
# Broadcast on prediction completion
ws.broadcast(f"project:{project_id}:risk-score", risk_data)

# Frontend subscribed to: "project:123:risk-score"
socket.on("project:123:risk-score", (data) => {
    updateRiskCard(data)
})
```

#### Frontend Integration
Implement `frontend/src/hooks/useRealtimeUpdates.js`

```javascript
const useRealtimeUpdates = (projectId) => {
    const socket = useContext(WebSocketContext)
    useEffect(() => {
        socket.on(`project:${projectId}:anomaly`, handleAnomaly)
        socket.on(`project:${projectId}:recommendation`, handleRecommendation)
        return () => socket.off(...)
    }, [projectId])
}
```

#### Deliverables
- ✓ WebSocket server endpoint
- ✓ Real-time event broadcast
- ✓ React hook for subscribing to updates
- ✓ Updated AIAssistantPanel.jsx to use WebSocket

#### Effort: 3 days | Owner: Backend Lead + Frontend Lead

---

### Week 12: Dashboard UI Enhancements

#### Frontend Tasks

1. **Validation Dashboard**
   - `frontend/src/components/dashboard/ValidationDashboard.jsx` (container)
   - `frontend/src/components/ValidationChecklist.jsx` (checklist UI)
   - `frontend/src/components/PPAPTracker.jsx` (milestone view)
   - `frontend/src/components/DVResultsPanel.jsx` (test results)

2. **Quality Dashboard Enhancements**
   - `frontend/src/components/DefectPareto.jsx` (Pareto chart)
   - `frontend/src/components/QualityHeatmap.jsx` (line-wise heatmap)
   - Enhance `QualityHealthCenter.jsx` with new components

3. **Budget Dashboard Enhancements**
   - Add should-cost comparison panel
   - Add anomaly highlight

#### Deliverables
- ✓ Validation Dashboard fully functional
- ✓ Quality Dashboard with Pareto + heatmap
- ✓ All new components integrated with APIs
- ✓ Mobile-responsive design

#### Effort: 5 days | Owner: Frontend Team

---

### Phase 3 Success Criteria
- [ ] Sentiment analysis integrated & working
- [ ] AI Assistant Panel deployed
- [ ] Recommendations engine (ML + rule-based) active
- [ ] WebSocket real-time streaming operational
- [ ] Validation Dashboard fully functional
- [ ] Quality Dashboard enhanced with Pareto + heatmap
- [ ] All new UI components tested & integrated

---

## PHASE 4: POLISH & OPTIMIZATION (WEEKS 13-16)

**Goal:** 95% → 100% implementation. Production-ready.

### Week 13-14: Data Validation & Error Handling

#### Backend Task
Implement `backend/app/services/data_validation_service.py`

Features:
- Schema validation for tracker uploads
- Data consistency checks:
  - Budget totals balance check
  - Milestone dates logical (start < end)
  - Quality metrics in range (0-100% or 0-1M for DPPM)
  - Defect frequency non-negative
- Data quality scoring
- Error reporting API

#### Enhancement
- POST `/api/datasets/upload` returns validation report
- Flagged data issues displayed to user pre-save

#### Deliverables
- ✓ Data validation service
- ✓ Validation report API
- ✓ UI alerts for bad data

#### Effort: 3 days | Owner: Backend Developer

---

### Week 14-15: Performance Optimization

#### Database Optimization
1. Add materialized views:
   - `project_health_summary` (denormalized risk scores + metrics)
   - `quality_kpi_snapshot` (aggregated daily KPIs)
   - `budget_summary_current` (latest budget revisions)

2. Add strategic indexes:
   - `CREATE INDEX idx_milestone_project_status ON project_milestone(project_id, status);`
   - `CREATE INDEX idx_quality_kpi_date ON quality_kpi(line_id, metric_date DESC);`
   - `CREATE INDEX idx_risk_score_project_date ON risk_score(project_id, computed_at DESC);`

3. Query optimization:
   - Profile slow queries (>1s) using pgAdmin
   - Add query hints where needed
   - Optimize N+1 queries in APIs

#### Caching Strategy
- Redis caching for predictions (TTL: 1 hour)
- Dashboard summaries cached (TTL: 30 min)
- Cache invalidation on data updates

#### Frontend Optimization
- Code splitting: Load dashboard modules on-demand
- Lazy loading: Charts visible before rendering
- Memoization: Prevent unnecessary re-renders

#### Deliverables
- ✓ Dashboard load time < 2s (from 3-4s)
- ✓ Prediction API < 500ms
- ✓ Materialized views operational
- ✓ Caching layer in place

#### Effort: 4 days | Owner: DevOps + Backend Lead

---

### Week 15-16: ML Monitoring & Production Deployment

#### ML Monitoring
Implement `backend/app/services/model_monitoring.py`

Features:
- Model performance tracking:
  - Delay prediction: MAE, RMSE by project
  - Quality prediction: R², coverage
  - Anomaly detection: Precision, recall
- Data drift detection (retraining triggers)
- A/B testing framework for model updates
- Admin dashboard for ML metrics

#### Production Deployment
1. Docker optimization:
   - Multi-stage build for smaller image
   - Separate API & worker containers
   - Health checks configured

2. Environment setup:
   - Staging environment with full data
   - Production secrets in vault
   - Monitoring (Prometheus, Grafana)

3. Rollout strategy:
   - Canary deployment (10% → 50% → 100%)
   - Feature flags for new ML features
   - Rollback plan

#### Documentation
1. API documentation:
   - Swagger/OpenAPI specs
   - Curl examples for all endpoints
   - Error codes & handling

2. Database schema:
   - ER diagram
   - Column descriptions
   - Relationships

3. ML model cards:
   - Assumptions & limitations
   - Features used
   - Performance metrics
   - Retraining schedule

4. Deployment guide:
   - Docker & docker-compose setup
   - Environment variables
   - Database initialization
   - ML model loading
   - Troubleshooting

#### Deliverables
- ✓ ML monitoring system operational
- ✓ Production deployment complete
- ✓ Comprehensive documentation
- ✓ Monitoring & alerting active

#### Effort: 4 days | Owner: DevOps + ML Engineer

---

### Phase 4 Success Criteria
- [ ] Data validation service deployed
- [ ] Performance metrics: <2s dashboard load, <500ms API
- [ ] Materialized views & indexes in production
- [ ] ML model monitoring active
- [ ] Production deployment complete & stable
- [ ] Full documentation (API, DB, ML, deployment)
- [ ] Team training completed

---

## DATABASE SCHEMA CHANGES

### New Tables Summary

```sql
-- Validation & Quality (4 tables)
CREATE TABLE validation_checklist (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES project(id),
    stage_type VARCHAR(20),  -- 'DV' | 'PV' | 'PPAP'
    checklist_items JSONB,
    completion_status FLOAT,
    sign_off_date TIMESTAMP,
    signed_by_id INTEGER REFERENCES user(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ppap_stage (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES project(id),
    level INTEGER,  -- 1-4
    submission_date TIMESTAMP,
    approval_date TIMESTAMP,
    status VARCHAR(20),
    rejection_reason TEXT
);

CREATE TABLE dv_result (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES project(id),
    test_name VARCHAR(255),
    pass_fail BOOLEAN,
    test_date TIMESTAMP,
    findings TEXT,
    test_owner_id INTEGER REFERENCES employee(id)
);

CREATE TABLE quality_kpi (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES project(id),
    line_id INTEGER REFERENCES line(id),
    metric_type VARCHAR(50),
    value FLOAT,
    target_value FLOAT,
    period_date TIMESTAMP,
    status VARCHAR(20)
);

-- Defect & Failure (2 tables)
CREATE TABLE defect (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES project(id),
    defect_type VARCHAR(50),
    category VARCHAR(100),
    severity INTEGER,
    root_cause TEXT,
    corrective_action TEXT,
    closure_date TIMESTAMP,
    line_id INTEGER REFERENCES line(id),
    frequency INTEGER DEFAULT 1
);

CREATE TABLE failure_pattern (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES project(id),
    pattern_id VARCHAR(50) UNIQUE,
    defect_types JSONB,
    frequency INTEGER,
    affected_lines JSONB,
    prediction_confidence FLOAT,
    root_cause_cluster VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Customer & Sentiment (2 tables)
CREATE TABLE customer_complaint (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES project(id),
    customer_name VARCHAR(255),
    complaint_text TEXT,
    sentiment_score FLOAT,
    urgency_level VARCHAR(20),
    eight_d_status VARCHAR(20),
    resolution_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sentiment_analysis (
    id SERIAL PRIMARY KEY,
    complaint_id INTEGER REFERENCES customer_complaint(id),
    positive_keywords JSONB,
    negative_keywords JSONB,
    emotion_label VARCHAR(50),
    ml_confidence_score FLOAT,
    model_version VARCHAR(20)
);

-- Cost Analysis (2 tables)
CREATE TABLE cost_anomaly (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES project(id),
    budget_line VARCHAR(255),
    actual_spend FLOAT,
    expected_spend FLOAT,
    variance_pct FLOAT,
    anomaly_type VARCHAR(50),
    flagged_date TIMESTAMP,
    root_cause_analysis TEXT,
    flagged_by VARCHAR(50)
);

CREATE TABLE should_cost_benchmark (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100),
    target_cost FLOAT,
    source_market VARCHAR(100),
    market_price_index VARCHAR(100),
    cost_driver_1 VARCHAR(255),
    cost_driver_2 VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Predictions & Risk (3 tables)
CREATE TABLE risk_score (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES project(id),
    milestones_delay_probability FLOAT,
    budget_overrun_probability FLOAT,
    quality_risk_score FLOAT,
    supply_chain_risk FLOAT,
    overall_health_score FLOAT,
    computed_at TIMESTAMP,
    model_version VARCHAR(20),
    contributing_factors JSONB
);

CREATE TABLE delay_prediction (
    id SERIAL PRIMARY KEY,
    milestone_id INTEGER REFERENCES project_milestone(id),
    predicted_days_late INTEGER,
    confidence_interval JSONB,
    contributing_factors JSONB,
    prediction_date TIMESTAMP,
    model_used VARCHAR(50)
);

CREATE TABLE defect_prediction (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES project(id),
    predicted_defect_rate FLOAT,
    predicted_dppm FLOAT,
    line_risk_levels JSONB,
    contributing_risks JSONB,
    prediction_date TIMESTAMP
);

-- Line Quality (1 table)
CREATE TABLE line_quality_metric (
    id SERIAL PRIMARY KEY,
    line_id INTEGER REFERENCES line(id),
    project_id INTEGER REFERENCES project(id),
    metric_date TIMESTAMP,
    fpy_rate FLOAT,
    dppm FLOAT,
    reject_count INTEGER,
    rework_count INTEGER,
    health_status VARCHAR(20),
    quality_engineer_id INTEGER REFERENCES employee(id)
);
```

### Indexes to Add
```sql
-- Validation
CREATE INDEX idx_validation_project ON validation_checklist(project_id);
CREATE INDEX idx_ppap_project_level ON ppap_stage(project_id, level);

-- Quality
CREATE INDEX idx_quality_kpi_project_date ON quality_kpi(project_id, period_date DESC);
CREATE INDEX idx_quality_kpi_line ON quality_kpi(line_id);
CREATE INDEX idx_defect_project ON defect(project_id);
CREATE INDEX idx_defect_line ON defect(line_id);
CREATE INDEX idx_failure_pattern_project ON failure_pattern(project_id);

-- Customer
CREATE INDEX idx_complaint_project ON customer_complaint(project_id);
CREATE INDEX idx_complaint_date ON customer_complaint(created_at DESC);
CREATE INDEX idx_sentiment_complaint ON sentiment_analysis(complaint_id);

-- Predictions
CREATE INDEX idx_risk_score_project_date ON risk_score(project_id, computed_at DESC);
CREATE INDEX idx_delay_milestone ON delay_prediction(milestone_id);
CREATE INDEX idx_defect_pred_project ON defect_prediction(project_id);

-- Line Quality
CREATE INDEX idx_line_quality_project_date ON line_quality_metric(project_id, metric_date DESC);
CREATE INDEX idx_line_quality_line ON line_quality_metric(line_id);
```

---

## API ENDPOINTS SPECIFICATION

### Validation API
```
POST   /api/quality/validation-checklist/{project_id}
GET    /api/quality/validation-checklist/{project_id}
PUT    /api/quality/validation-checklist/{checklist_id}
DELETE /api/quality/validation-checklist/{checklist_id}
GET    /api/quality/ppap/{project_id}
POST   /api/quality/ppap/{project_id}/level/{level}/submit
```

### Quality API
```
GET    /api/quality/kpis/{project_id}
GET    /api/quality/heatmap/{project_id}
POST   /api/quality/defect/{project_id}
GET    /api/quality/defect-analysis/patterns
GET    /api/quality/defect-analysis/pareto
```

### Customer Feedback API
```
POST   /api/customer/complaints/{project_id}
GET    /api/customer/complaints/{project_id}
GET    /api/customer/sentiment-trend/{project_id}
GET    /api/customer/8d-status/{project_id}
```

### Predictions API
```
GET    /api/predictions/project/{project_id}/risk-score
GET    /api/predictions/milestone/{milestone_id}/delay
GET    /api/predictions/project/{project_id}/quality-forecast
POST   /api/predictions/run-batch
```

### Anomalies API
```
GET    /api/anomalies/budget/{project_id}
GET    /api/anomalies/quality/{project_id}
GET    /api/anomalies/timeline/{project_id}
```

### Cost Intelligence API
```
GET    /api/budget/{project_id}/should-cost-analysis
GET    /api/budget/{project_id}/anomalies
GET    /api/budget/{project_id}/forecast-vs-actual
```

### AI Assistant API
```
GET    /api/ai-assistant/recommendations/{project_id}
GET    /api/ai-assistant/anomalies-detected
POST   /api/ai-assistant/chat
```

---

## FILE STRUCTURE & DEPENDENCIES

### Backend Files to Create

```
backend/app/
├─ models/
│  ├─ validation.py (4 models: ValidationChecklist, PPAPStage, DVResult, QualityKPI)
│  ├─ defect.py (2 models: Defect, FailurePattern)
│  ├─ customer_feedback.py (2 models: CustomerComplaint, SentimentAnalysis)
│  ├─ cost_analysis.py (2 models: CostAnomaly, ShouldCostBenchmark)
│  ├─ predictions.py (3 models: RiskScore, DelayPrediction, DefectPrediction)
│  └─ line_quality.py (1 model: LineQualityMetric)
│
├─ schemas/
│  ├─ validation.py
│  ├─ quality.py
│  ├─ customer_feedback.py
│  ├─ cost_analysis.py
│  └─ predictions.py
│
├─ api/
│  ├─ validation_api.py (new router)
│  ├─ quality_api.py (new router)
│  ├─ customer_feedback_api.py (new router)
│  ├─ cost_analysis_api.py (new router)
│  ├─ predictions_api.py (new router)
│  ├─ anomalies_api.py (new router)
│  └─ recommendations_api.py (new router)
│
├─ services/
│  ├─ ml_pipeline.py (ML infrastructure)
│  ├─ risk_prediction_service.py (Phase 2)
│  ├─ schedule_prediction_service.py (Phase 2)
│  ├─ quality_prediction_service.py (Phase 2)
│  ├─ cost_anomaly_service.py (Phase 2)
│  ├─ failure_pattern_service.py (Phase 2)
│  ├─ sentiment_service.py (Phase 3)
│  ├─ recommendation_service.py (Phase 2/3)
│  ├─ validation_service.py (Phase 1)
│  ├─ quality_service.py (Phase 1)
│  ├─ data_validation_service.py (Phase 4)
│  ├─ model_monitoring.py (Phase 4)
│  └─ event_publisher.py (Phase 3)
│
├─ core/
│  ├─ ml_config.py (Phase 1)
│  └─ streaming.py (Phase 3)
│
└─ tasks/
   └─ celery_tasks.py (Phase 1)

alembic/
└─ versions/
   ├─ add_validation_models.py
   ├─ add_defect_models.py
   ├─ add_customer_models.py
   ├─ add_cost_models.py
   ├─ add_prediction_models.py
   └─ add_line_quality_model.py

tests/
├─ test_validation_api.py
├─ test_quality_api.py
├─ test_customer_feedback_api.py
├─ test_predictions_api.py
└─ test_ml_services.py

ml/
└─ models/
   ├─ risk_xgboost_v1.pkl
   ├─ delay_xgboost_v1.pkl
   ├─ quality_arima_v1.pkl
   └─ sentiment_distilbert_v1
```

### Frontend Files to Create

```
frontend/src/
├─ components/
│  ├─ dashboard/
│  │  ├─ ValidationDashboard.jsx
│  │  ├─ (enhance QualityHealthCenter.jsx)
│  │  └─ (enhance BudgetGovernanceWorkspace.jsx)
│  │
│  ├─ ValidationChecklist.jsx
│  ├─ PPAPTracker.jsx
│  ├─ DVResultsPanel.jsx
│  ├─ DefectPareto.jsx
│  ├─ QualityHeatmap.jsx
│  ├─ SentimentBadge.jsx
│  ├─ AIAssistantPanel.jsx
│  ├─ RecommendationCard.jsx
│  └─ AnomalyAlert.jsx
│
├─ hooks/
│  ├─ useRealtimeUpdates.js
│  └─ usePredicti ons.js
│
├─ api/
│  ├─ validation.js
│  ├─ quality.js
│  ├─ customer.js
│  ├─ predictions.js
│  ├─ anomalies.js
│  └─ recommendations.js
│
└─ context/
   └─ WebSocketContext.js
```

### Configuration Files

```
backend/
├─ docker-compose.yml (add Redis, RabbitMQ for Celery)
├─ requirements.txt (add ML libraries)
├─ .env (add ML_CONFIG, CELERY_BROKER_URL)
└─ alembic.ini

frontend/
└─ .env (add VITE_WS_URL for WebSocket)
```

---

## SUCCESS METRICS

### Implementation Metrics
| Metric | Target | Current |
|--------|--------|---------|
| Dashboard modules complete | 7/7 (100%) | 5.5/7 (79%) |
| API endpoints | 170+ | 120+ |
| Database models | 60+ | 45 |
| Code coverage | >85% | ~70% |

### Performance Metrics
| Metric | Target | Baseline |
|--------|--------|----------|
| Dashboard load time | <2s | 3-4s |
| Prediction API latency | <500ms | N/A |
| Database query time | <100ms | ~150ms |
| WebSocket message latency | <1s | N/A |

### AI/ML Metrics
| Metric | Target | Baseline |
|--------|--------|----------|
| Risk score prediction accuracy | >75% MAE | N/A |
| Delay prediction accuracy | >70% R² | N/A |
| Quality forecast RMSE | <2% DPPM | N/A |
| Anomaly detection precision | >80% | N/A |
| Sentiment analysis F1 | >0.85 | N/A |

### Business Metrics
| Metric | Target |
|--------|--------|
| Time to identify risks | <1 hour |
| Cost anomalies caught | 90%+ |
| Quality issues predicted | 85%+ |
| User satisfaction | >4.5/5 |

---

## IMMEDIATE NEXT STEPS (PRIORITY ORDER)

### Week 1 Checklist
- [ ] Review this document with team (30 min)
- [ ] Create 6 database model files (2 days)
- [ ] Run Alembic migrations (1 day)
- [ ] Create validation API router (1 day)
- [ ] Setup Celery + Redis (1 day)
- [ ] Write 50+ unit tests (1 day)

### Dependencies Before Starting
- [x] Database schema reviewed
- [x] API design approved
- [x] ML feature list finalized
- [x] Celery + Redis infrastructure planned
- [ ] Backend developer capacity: 2+ FTE
- [ ] ML engineer capacity: 1+ FTE
- [ ] Frontend developer capacity: 1+ FTE

### Risks & Mitigations
1. **ML Model Data Insufficiency**
   - Risk: Insufficient historical data for accurate predictions
   - Mitigation: Start rule-based, migrate to ML as data accumulates

2. **Performance Degradation**
   - Risk: Database slow with new tables + frequent predictions
   - Mitigation: Materialized views + caching layer from Week 2

3. **Real-Time Complexity**
   - Risk: WebSocket streaming adds complexity & overhead
   - Mitigation: Start with polling, add WebSocket in Phase 3

---

## SIGN-OFF

**Document Owner:** [Your Name]  
**Technical Lead:** [Backend Lead Name]  
**Date:** June 18, 2026  
**Version:** 1.0 - Ready for Phase 1 Implementation

---

## APPENDIX: FREQUENTLY ASKED QUESTIONS

### Q: Why separate Validation and Quality dashboards?
A: Validation (DV/PV/PPAP) is gate-based (pass/fail gates), while Quality (DPPM/FPY) is continuous measurement. Different data models & UX.

### Q: Can we skip Phase 1 and start with ML?
A: No. Phase 1 foundation (data models + APIs) is required for ML services to consume data and populate predictions.

### Q: What if we don't have 3 months historical data for ML training?
A: Start with rule-based scoring in Phase 2, collect data for 3 months, retrain models in Phase 4. Use pre-trained models (HuggingFace) where available (sentiment).

### Q: How do we handle real-time predictions with batch Celery tasks?
A: Two approaches:
- Batch: Daily nightly predictions (Celery), consumed by dashboards
- Real-time: Trigger prediction on-demand for specific milestone/project (FastAPI endpoint)

### Q: What's the rollback plan if ML models break?
A: Keep rule-based fallback engine. Feature flags to disable ML predictions without redeploying.

