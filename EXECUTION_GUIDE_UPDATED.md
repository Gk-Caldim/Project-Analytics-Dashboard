# EXECUTION GUIDE - REMAINING MODULES (UPDATED FROM CODE ANALYSIS)

**Purpose:** Quick reference for building the remaining modules  
**For:** Developers, Project Managers, Team Leads  
**Status:** Based on actual code review - ML services are the first blocker

---

## 🚨 CRITICAL FIX FIRST (Weeks 1-3 of Phase 2)

**ML Services are NOT implemented - this blocks everything**

### What Needs to Happen

**Week 1 (ML Services - Must Do First):**
- [ ] **risk_prediction_service.py** - Compute project health scores
  - Weighted formula: 0.3×delay + 0.25×budget + 0.25×quality + 0.2×supply
  - Query ProjectMilestone, BudgetRevision, QualityKPI
  - Save to risk_score table
  - Rule-based logic (no ML yet)
  
- [ ] **delay_prediction_service.py** - Predict milestone delays
  - Analyze task duration variance
  - Calculate baseline + variance
  - Return predicted_days_late + confidence
  - Rule-based: extract from historical data
  
- [ ] **quality_prediction_service.py** - Forecast quality metrics
  - Time-series analysis of defect trends
  - Extrapolate 30-day forecast
  - Predict DPPM + FPY
  - Rule-based: trend analysis

**Week 2 (Batch Jobs):**
- [ ] Create `backend/tasks/celery_tasks.py`
  - Daily scheduled task (2 AM)
  - Compute all project predictions
  - Update risk_score, delay_prediction, defect_prediction tables
- [ ] Setup Redis broker
- [ ] Configure scheduling

**Week 3 (Missing UIs):**
- [ ] **CustomerIssuesDashboard.jsx** - Issue tracking
- [ ] **RiskManagementDashboard.jsx** - Risk visualization  
- [ ] **Enhanced QualityHealthCenter.jsx** - Pareto + heatmap

---

## PHASE 2A: ML SERVICES + BATCH JOBS (Weeks 1-3)

### Week 1: Implement 3 ML Prediction Services

**Owner:** ML Engineer + 1 Backend Dev  
**Duration:** 5 days

**risk_prediction_service.py**
```python
def compute_project_health_score(project_id: int) -> RiskScore:
    """
    Weighted formula (rule-based):
    risk = 0.3×delay_prob + 0.25×budget_prob + 0.25×quality_risk + 0.2×supply_risk
    
    - Get project data (milestones, budget, quality, suppliers)
    - Calculate each component (0-1 or 0-100 scale)
    - Apply weights
    - Save to risk_score table
    """
```

**delay_prediction_service.py**
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

**quality_prediction_service.py**
```python
def predict_quality_metrics(project_id: int) -> DefectPrediction:
    """
    Time-series trend analysis:
    - Get historical defect rates by line
    - Calculate trend (up/down/stable)
    - Extrapolate 30-day forecast
    - Predict DPPM + FPY
    """
```

**Deliverable:** APIs returning actual predictions (not defaults)

---

### Week 2: Wire Celery Batch Jobs

**Owner:** Backend Developer  
**Duration:** 3-5 days

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

**Owner:** Frontend Developer  
**Duration:** 5-7 days

**1. CustomerIssuesDashboard.jsx**
- Issue summary cards (Open, Critical, Overdue)
- Issue list table with filters
- Sentiment distribution widget
- Add to sidebar under Dashboard

**2. RiskManagementDashboard.jsx**
- Risk heatmap (5×5 probability vs impact)
- Risk score card (0-100)
- Risk register table
- Mitigation action tracker
- Add to sidebar as main section

**3. Enhance QualityHealthCenter.jsx**
- Add KPI cards (FPY, DPPM, Reject Rate, Rework Rate)
- Add Pareto chart (defect categories)
- Add quality heatmap (line-wise grid)
- Add trend visualization

**Deliverable:** 3 dashboards live, pulling real API data

---

## PHASE 2B: ML ENHANCEMENT + REAL-TIME (Weeks 4-8)

**ONLY AFTER Phase 2A Complete**

### Week 4: Sentiment Analysis + WebSocket

**Owner:** ML Engineer + Full Stack Dev

**Sentiment Analysis Service (3 days)**
- Use HuggingFace DistilBERT
- Auto-score on complaint creation
- Save to sentiment_analysis table

**WebSocket Integration (2 days)**
- Create useWebSocket hook
- Subscribe to risk/anomaly events
- Real-time dashboard updates

**Deliverable:** Real-time sentiment badges + live alerts

---

### Week 5-6: Recommendation Engine + Defect Clustering

**Owner:** ML Engineer + Backend Dev

**Recommendation Engine (3 days)**
- Rule-based: if risk > 70, suggest actions
- Data-driven: budget, quality, schedule rules
- Return prioritized recommendations

**Defect Clustering (3 days)**
- K-means clustering on root causes
- Generate Pareto chart data
- Save patterns to failure_pattern table

**Deliverable:** AI recommendations live + Pareto charts

---

### Week 7-8: Architecture Improvements

**Owner:** Full Backend + DevOps

**Redis Caching (2 days)**
- Cache risk scores (1h TTL)
- Cache quality KPIs (30min TTL)
- Reduce dashboard load time from 3-4s to <2s

**API Documentation (2 days)**
- Swagger/OpenAPI specs
- Schema validation
- Auto-generated docs

**Unit Tests (3 days)**
- Test all ML services
- Test predictions
- Target: >80% coverage

**Performance Optimization (2 days)**
- Add database indexes
- Materialized views
- Query optimization

**Deliverable:** Optimized, documented, tested system

---

## REMAINING OPTIONAL MODULES

### Supply Chain Risk Module (Week 12+)
- Supplier performance tracking
- Part availability status
- Supply risk heatmap

### Resource Management Dashboard (Week 12+)
- Team capacity visualization
- Project allocation
- Bottleneck alerts

### Reports Section (Week 15+)
- Executive dashboard
- Quality analysis export
- Budget performance trends
- Risk register export

---

## SUCCESS CHECKLIST

### Phase 2A (End of Week 3)
- [ ] ML services computing real predictions ✓
- [ ] Celery batch jobs running nightly ✓
- [ ] CustomerIssuesDashboard deployed ✓
- [ ] RiskManagementDashboard deployed ✓
- [ ] QualityHealthCenter enhanced ✓
- [ ] All APIs returning valid data ✓
- [ ] Dashboards in sidebar navigation ✓

### Phase 2B (End of Week 8)
- [ ] WebSocket real-time streaming ✓
- [ ] Sentiment Analysis working ✓
- [ ] Recommendations generated ✓
- [ ] Defect clustering done ✓
- [ ] Redis caching operational ✓
- [ ] API documentation complete ✓
- [ ] >80% test coverage ✓
- [ ] Dashboard load time <2s ✓

---

**Timeline:** 8 weeks total (2A: weeks 1-3, 2B: weeks 4-8)  
**Team:** 4-5 FTE (1 ML, 2 Backend, 2 Frontend)  
**Status:** Ready to start Phase 2A this week
