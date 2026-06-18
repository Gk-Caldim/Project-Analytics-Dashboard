# EXECUTION GUIDE - REMAINING 7 MODULES

**Purpose:** Quick reference for building the remaining modules  
**For:** Developers, Project Managers, Team Leads  
**References:** Full details in DEVELOPER_HANDOVER.md, IMPLEMENTATION_CHECKLIST.md, EXECUTIVE_SUMMARY.md

---

## 🔴 PHASE 2 - 3 CRITICAL MODULES (Weeks 5-8)

### 1. CUSTOMER ISSUES DASHBOARD (Week 5) - Frontend Lead

**What to build:**
- Issue list table (ID, Customer, Description, Severity, Sentiment)
- Issue detail modal with 8D report viewer
- Sentiment badge (color-coded emotion indicator)
- Escalation timeline

**Location:** `frontend/src/components/dashboard/CustomerIssuesDashboard.jsx`  
**Components:** CustomerIssuesDashboard, IssueDetailModal, EightDReportPanel, SentimentBadge  
**APIs needed:** POST/GET `/api/customer/complaints`, GET `/api/customer/sentiment-trend`  
**Backend owner:** Backend Dev (create customer_feedback_api.py + service)  
**Effort:** 5 days | **Owner:** Frontend Lead + 1 Backend Dev

**Quick steps:**
1. Create API endpoints (POST complaints, GET complaints, GET sentiment trends)
2. Build CustomerIssuesDashboard container + table
3. Build IssueDetailModal (show 8D format + timeline)
4. Add SentimentBadge component (color: red=angry, yellow=frustrated, green=satisfied)
5. Add to sidebar under Dashboard
6. Connect to real API endpoints

---

### 2. RISK MANAGEMENT DASHBOARD (Week 6-7) - Frontend Lead + ML Engineer

**What to build:**
- Risk heatmap (5×5 probability vs impact matrix)
- Risk score card (overall project risk 0-100)
- Risk register table (list all risks with scores)
- Mitigation action tracker

**Location:** `frontend/src/components/dashboard/RiskManagementDashboard.jsx`  
**Components:** RiskManagementDashboard, RiskHeatmap, RiskRegister, MitigationTracker  
**APIs needed:** GET `/api/predictions/project/{id}/risk-score`, GET/POST `/api/risks/{project_id}`  
**Backend owner:** ML Engineer (risk_prediction_service.py) + Backend Dev (risk APIs)  
**Effort:** 5 days | **Owner:** Frontend Lead + ML Engineer

**Quick steps:**
1. Implement risk_prediction_service.py (weighted scoring: 0.3×delay + 0.25×budget + 0.25×quality + 0.2×supply)
2. Create RiskScore database model (if not done in Phase 1)
3. Build RiskHeatmap component (5×5 grid, color intensity by risk)
4. Build RiskRegister component (sortable table)
5. Build MitigationTracker (action items + status)
6. Add to sidebar as main "Risk Management" section
7. Schedule nightly risk computation via Celery

---

### 3. ADVANCED QUALITY KPIs (Week 7-8) - Frontend Dev + ML Engineer

**What to build:**
- KPI cards (FPY %, DPPM, Reject Rate, Rework Rate + trends)
- Pareto chart (defect categories - 80/20 rule)
- Quality heatmap (line-wise quality grid)
- Trend analysis (time-series quality metrics)

**Location:** Enhance `frontend/src/components/dashboard/QualityHealthCenter.jsx`  
**New Components:** DefectPareto, QualityHeatmap, KPICards, QualityTrend  
**APIs needed:** GET `/api/quality/kpis/{project_id}`, GET `/api/quality/heatmap`, GET `/api/quality/defect-analysis/patterns`  
**Backend owner:** Backend Dev (quality APIs) + ML Engineer (defect clustering)  
**Effort:** 4 days | **Owner:** Frontend Dev + ML Engineer

**Quick steps:**
1. Create QualityKPI database model (metric_type: FPY, DPPM, REJECT_RATE, REWORK_RATE)
2. Build KPI aggregation service (FPY = (total-defective)/total, DPPM = defects*1M/units)
3. Create Pareto chart component (sort defects by frequency, highlight top 80%)
4. Create QualityHeatmap component (line_id × metric grid, color by health)
5. Implement defect clustering ML (K-means on root causes)
6. Add all components to QualityHealthCenter
7. Populate quality data nightly

---

## 🟡 PHASE 3 - 2 HIGH-PRIORITY MODULES (Weeks 9-12) [Optional if time]

### 4. SUPPLY CHAIN RISK MODULE (Week 12) - Frontend Dev

**What to build:**
- Supplier performance dashboard (on-time %, quality score)
- Part availability status (green/yellow/red by part)
- Supplier risk score (0-100)

**Location:** `frontend/src/components/dashboard/SupplyChainDashboard.jsx`  
**Quick steps:**
1. Create supplier performance API endpoints
2. Build SupplierPerformance component
3. Build PartAvailability component
4. Add to sidebar as "Supply Chain"

---

### 5. RESOURCE MANAGEMENT DASHBOARD (Week 12) - Frontend Dev

**What to build:**
- Team capacity visualization (allocated vs available)
- Project resource allocation (who's working on what)
- Bottleneck alerts (over-allocated resources)

**Location:** `frontend/src/components/dashboard/ResourceManagementDashboard.jsx`  
**Quick steps:**
1. Create resource allocation API endpoints
2. Build ResourceCapacity component (capacity gauge)
3. Build ProjectAllocation component (swimlane view)
4. Add to sidebar as "Resources"

---

## 🟢 PHASE 4 - 2 OPTIONAL MODULES (Weeks 13-16)

### 6. REPORTS SECTION (Week 15) - Backend Dev

**What to build:**
- Executive dashboard (KPI summary)
- Quality analysis report (defect trends, Pareto)
- Budget performance report (variance analysis)
- Risk register export (PDF/Excel)

**Quick steps:**
1. Create report generation API endpoints
2. Add table of contents with links
3. Export functionality (PDF via ReportLab or similar)

---

### 7. DATA QUALITY MANAGEMENT (Week 13-14) - Backend Dev

**What to build:**
- Data validation service (schema + consistency checks)
- Validation rules engine
- Data quality scoring
- Validation report API

**Quick steps:**
1. Create data_validation_service.py
2. Define validation rules for each entity
3. Create validation report endpoint
4. Add to Configuration section

---

## 📊 DEPENDENCY GRAPH

```
Phase 1 (Complete)
├─ Database Models ✅
├─ Validation APIs ✅
└─ ML Infrastructure ✅

Phase 2 (Current - Weeks 5-8)
├─ Customer Issues Dashboard (Week 5)
│  └─ Requires: customer_feedback_api.py
├─ Risk Management Dashboard (Week 6-7)
│  └─ Requires: risk_prediction_service.py
└─ Advanced Quality KPIs (Week 7-8)
   └─ Requires: QualityKPI model + defect clustering

Phase 3 (Weeks 9-12)
├─ Sentiment Analysis (Week 9)
│  └─ Requires: CustomerComplaint data from Phase 2
├─ WebSocket Streaming (Week 11)
│  └─ Requires: All Phase 2 APIs ready
├─ Supply Chain Module (Week 12)
└─ Resource Management (Week 12)

Phase 4 (Weeks 13-16)
├─ Data Quality Management
├─ Performance Optimization
├─ Reports Section
└─ Production Deployment
```

---

## ⚡ QUICK EXECUTION CHECKLIST

### Week 5 (Customer Issues)
- [ ] Create customer_feedback_api.py (POST /complaints, GET /sentiment-trend)
- [ ] Build CustomerIssuesDashboard.jsx
- [ ] Build IssueDetailModal.jsx with 8D viewer
- [ ] Build SentimentBadge component
- [ ] Add to sidebar
- [ ] Test with sample data

### Week 6-7 (Risk Management)
- [ ] Implement risk_prediction_service.py (weighted formula)
- [ ] Create RiskScore database model
- [ ] Build RiskHeatmap component (5×5 matrix)
- [ ] Build RiskRegister component (table)
- [ ] Build MitigationTracker component
- [ ] Add to sidebar as main section
- [ ] Test with sample risk data

### Week 7-8 (Quality KPIs)
- [ ] Create QualityKPI database model
- [ ] Build KPI aggregation service
- [ ] Build DefectPareto component
- [ ] Build QualityHeatmap component
- [ ] Implement defect clustering (K-means)
- [ ] Enhance QualityHealthCenter UI
- [ ] Test with production quality data

---

## 👥 TEAM ASSIGNMENTS

| Module | Lead | Support | Timeline |
|--------|------|---------|----------|
| Customer Issues | Frontend Dev | Backend Dev | Week 5 |
| Risk Management | Frontend Dev | ML Engineer | Week 6-7 |
| Quality KPIs | Frontend Dev | ML Engineer | Week 7-8 |
| Supply Chain | Frontend Dev | - | Week 12 |
| Resource Mgmt | Frontend Dev | - | Week 12 |
| Reports | Backend Dev | - | Week 15 |
| Data Quality | Backend Dev | - | Week 13 |

---

## 🎯 SUCCESS CRITERIA

**Phase 2 Complete (Week 8):**
- [ ] Customer Issues Dashboard live with sentiment badges
- [ ] Risk Management Dashboard showing risk heatmap + scores
- [ ] Quality Dashboard enhanced with Pareto + heatmap
- [ ] 3 dashboards added to sidebar navigation
- [ ] All APIs returning valid data
- [ ] Nightly batch jobs populating prediction models
- [ ] Ready for Phase 3 sentiment + WebSocket work

**Phase 3 Complete (Week 12):**
- [ ] Real-time WebSocket streaming operational
- [ ] Sentiment scores visible in Customer Issues
- [ ] Optional: Supply Chain + Resource Management modules
- [ ] Ready for Phase 4 optimization

**Phase 4 Complete (Week 16):**
- [ ] All 7 modules fully operational
- [ ] Performance <2s dashboard load
- [ ] Production deployment approved
- [ ] Full documentation complete
- [ ] Team trained + go-live ready

---

## 🔗 RELATED DOCUMENTS

- **Full Details:** DEVELOPER_HANDOVER.md (technical specs, models, schemas)
- **Weekly Tasks:** IMPLEMENTATION_CHECKLIST.md (task-by-task breakdown)
- **Overview:** EXECUTIVE_SUMMARY.md (business context, KPIs, timeline)
- **Current Status:** EXECUTIVE_SUMMARY.md - Last Updated June 18, 2026

---

**Start Date:** [To Be Confirmed]  
**Phase 2 Kickoff:** Week 5 (Weeks 1-4 = Phase 1 prep)  
**Target Go-Live:** Week 16
