"""
Issue Engine — Service Layer
============================
Provides:
  - compute_derived_status(issue)   → 'Overdue' | 'At Risk' | 'On Track' | 'Closed'
  - compute_urgency_score(issue)    → int ranking weight
  - enrich_issue(issue)             → attaches derived fields to ORM object
  - rank_issues(issues)             → sorted list (most urgent first)
  - create_issue_from_mom(...)      → maps MOM action → Issue ORM
  - run_escalation_engine(db, pid)  → inserts IssueEscalation records
  - get_or_404(db, issue_id)        → fetch with 404 guard
"""

from __future__ import annotations

import logging
from datetime import date, datetime, timezone
from typing import List, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.issue import Issue, IssueAction, IssueComment, IssueEscalation
from app.models.project import Project
from app.schemas.issue import IssueCreate, IssueUpdate, MOMActionItem

logger = logging.getLogger(__name__)


# ─── Project name resolver ────────────────────────────────────────────────────

def resolve_project_id(db: Session, project_name: str) -> Optional[int]:
    """
    Case-insensitive lookup of a project by name.
    Returns the integer PK (id) or None if no match is found.
    Never raises — callers decide whether to skip or error.
    """
    if not project_name or not project_name.strip():
        return None
    project = (
        db.query(Project)
        .filter(func.lower(Project.name) == project_name.strip().lower())
        .first()
    )
    if project:
        logger.info("resolve_project_id: '%s' → id=%d", project_name.strip(), project.id)
        return project.id
    logger.warning("resolve_project_id: no project matched name='%s'", project_name.strip())
    return None

# ─── Priority weights for urgency scoring ────────────────────────────────────
_PRIORITY_WEIGHT = {"High": 100, "Medium": 50, "Low": 10}

# ─── Escalation ladder ───────────────────────────────────────────────────────
# (min_days_overdue, level, escalated_to)
_ESCALATION_RULES: List[Tuple[int, int, str]] = [
    (5, 3, "VP / Admin Review Queue"),
    (3, 2, "Department Head"),
    (1, 1, "Project Manager"),
]


# ─── Status & scoring ────────────────────────────────────────────────────────

def _days_overdue(issue: Issue) -> int:
    """Positive int if overdue, 0 otherwise."""
    if issue.due_date is None or issue.status == "Closed":
        return 0
    today = date.today()
    delta = (today - issue.due_date).days
    return max(delta, 0)


def compute_derived_status(issue: Issue) -> str:
    """
    Runtime (non-stored) status label:
      Closed   → Closed
      today > due_date (and not Closed) → Overdue
      due_date within 2 days → At Risk
      else → On Track
    """
    if issue.status == "Closed":
        return "Closed"
    if issue.due_date is None:
        return "On Track"
    today = date.today()
    delta = (issue.due_date - today).days
    if delta < 0:
        return "Overdue"
    if delta <= 2:
        return "At Risk"
    return "On Track"


def compute_urgency_score(issue: Issue) -> int:
    """
    Ranking score used to sort critical issues.
    Higher = more urgent.
    Formula: priority_weight + (days_overdue * 10) + severity_score
    """
    if issue.status == "Closed":
        return 0
    pw     = _PRIORITY_WEIGHT.get(issue.priority, 10)
    over   = _days_overdue(issue)
    sev    = issue.severity_score or 0
    return pw + (over * 10) + sev


def enrich_issue(issue: Issue) -> Issue:
    """Attach derived attributes directly onto the ORM object for serialisation."""
    issue.derived_status = compute_derived_status(issue)          # type: ignore[attr-defined]
    issue.days_overdue   = _days_overdue(issue)                   # type: ignore[attr-defined]
    issue.urgency_score  = compute_urgency_score(issue)           # type: ignore[attr-defined]
    issue.is_escalated   = any(                                   # type: ignore[attr-defined]
        e.is_active for e in (issue.escalations or [])
    )
    return issue


def rank_issues(issues: List[Issue]) -> List[Issue]:
    """
    Sort order:
      1. Overdue High priority (highest urgency_score first)
      2. At Risk High priority
      3. Medium priority
      4. Low priority
      5. Closed last
    """
    for iss in issues:
        enrich_issue(iss)
    return sorted(issues, key=lambda i: -i.urgency_score)  # type: ignore[attr-defined]


# ─── CRUD helpers ────────────────────────────────────────────────────────────

def get_or_404(db: Session, issue_id: int) -> Issue:
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Issue {issue_id} not found")
    return issue


def create_issue(db: Session, payload: IssueCreate) -> Issue:
    issue = Issue(
        project_id=payload.project_id,
        upload_id=payload.upload_id,
        source_type=payload.source_type,
        title=payload.title,
        description=payload.description,
        owner=payload.owner,
        department=payload.department,
        priority=payload.priority,
        severity_score=payload.severity_score,
        status=payload.status,
        due_date=payload.due_date,
        meeting_id=payload.meeting_id,
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)
    logger.info("Issue created: id=%d project=%d priority=%s owner=%s",
                issue.id, issue.project_id, issue.priority, issue.owner)
    return enrich_issue(issue)


def update_issue(db: Session, issue_id: int, payload: IssueUpdate) -> Issue:
    issue = get_or_404(db, issue_id)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(issue, field, value)

    # Auto-set resolved_at when closing
    if payload.status == "Closed" and issue.resolved_at is None:
        issue.resolved_at = datetime.now(timezone.utc)
    elif payload.status and payload.status != "Closed":
        issue.resolved_at = None  # re-opened

    db.commit()
    db.refresh(issue)
    logger.info("Issue updated: id=%d fields=%s", issue.id, list(update_data.keys()))
    return enrich_issue(issue)


def list_issues(
    db: Session,
    project_id: int,
    status_filter: Optional[str] = None,
    priority_filter: Optional[str] = None,
    department_filter: Optional[str] = None,
) -> List[Issue]:
    q = db.query(Issue).filter(Issue.project_id == project_id)
    if status_filter:
        q = q.filter(Issue.status == status_filter)
    if priority_filter:
        q = q.filter(Issue.priority == priority_filter)
    if department_filter:
        q = q.filter(Issue.department == department_filter)
    issues = q.all()
    for iss in issues:
        enrich_issue(iss)
    return issues


def get_critical_issues(
    db: Session,
    project_id: int,
    limit: int = 5,
) -> List[Issue]:
    """
    Returns the top `limit` unresolved issues sorted by urgency.
    Also triggers escalation as a side-effect.
    """
    run_escalation_engine(db, project_id)  # side-effect: keep escalations current

    issues = (
        db.query(Issue)
        .filter(
            Issue.project_id == project_id, 
            Issue.status == "Open", 
            Issue.priority == "High"
        )
        .order_by(Issue.due_date.asc())
        .limit(limit)
        .all()
    )
    for iss in issues:
        enrich_issue(iss)
    return issues


# ─── MOM Integration ─────────────────────────────────────────────────────────

def create_issue_from_mom_action(
    db: Session,
    project_id: int,
    meeting_id: Optional[str],
    action: MOMActionItem,
) -> Issue:
    """Map a single MOM action item → Issue record."""
    payload = IssueCreate(
        project_id=project_id,
        source_type="MOM",
        title=action.title,
        description=action.description,
        owner=action.owner,
        department=action.department,
        priority=action.priority,
        status=action.status,
        due_date=action.due_date,
        meeting_id=meeting_id,
    )
    return create_issue(db, payload)


# ─── Analytics ───────────────────────────────────────────────────────────────

def compute_analytics(db: Session, project_id: int) -> dict:
    all_issues = db.query(Issue).filter(Issue.project_id == project_id).all()
    for iss in all_issues:
        enrich_issue(iss)

    total_open        = sum(1 for i in all_issues if i.status != "Closed")
    total_overdue     = sum(1 for i in all_issues if i.derived_status == "Overdue")  # type: ignore
    total_at_risk     = sum(1 for i in all_issues if i.derived_status == "At Risk")  # type: ignore
    total_closed      = sum(1 for i in all_issues if i.status == "Closed")
    total_in_progress = sum(1 for i in all_issues if i.status == "In Progress")

    by_department: dict = {}
    by_priority: dict = {}
    for iss in all_issues:
        if iss.status == "Closed":
            continue
        dept = iss.department or "Unassigned"
        by_department[dept] = by_department.get(dept, 0) + 1
        by_priority[iss.priority] = by_priority.get(iss.priority, 0) + 1

    # Top 5 overdue
    overdue_issues = sorted(
        [i for i in all_issues if i.derived_status == "Overdue"],  # type: ignore
        key=lambda i: -i.urgency_score,  # type: ignore
    )[:5]

    return {
        "project_id":        project_id,
        "total_open":        total_open,
        "total_overdue":     total_overdue,
        "total_at_risk":     total_at_risk,
        "total_closed":      total_closed,
        "total_in_progress": total_in_progress,
        "by_department":     by_department,
        "by_priority":       by_priority,
        "top_overdue":       overdue_issues,
    }


# ─── Escalation Engine ───────────────────────────────────────────────────────

def run_escalation_engine(db: Session, project_id: int) -> int:
    """
    Scans all open High-priority issues for the project.
    Creates IssueEscalation records according to the ladder.
    Idempotent — skips levels already recorded.

    Returns: count of new escalation records inserted.
    """
    new_count = 0
    high_open = (
        db.query(Issue)
        .filter(
            Issue.project_id == project_id,
            Issue.priority == "High",
            Issue.status != "Closed",
        )
        .all()
    )

    for issue in high_open:
        days_over = _days_overdue(issue)
        if days_over == 0:
            continue  # Not overdue yet

        for min_days, level, escalated_to in _ESCALATION_RULES:
            if days_over < min_days:
                continue

            # Idempotency check — skip if this level already active
            existing = (
                db.query(IssueEscalation)
                .filter(
                    IssueEscalation.issue_id == issue.id,
                    IssueEscalation.escalation_level == level,
                    IssueEscalation.is_active == True,
                )
                .first()
            )
            if existing:
                continue

            esc = IssueEscalation(
                issue_id=issue.id,
                escalation_level=level,
                escalated_to=escalated_to,
                reason=(
                    f"High priority issue overdue by {days_over} day(s). "
                    f"Auto-escalated to {escalated_to}."
                ),
            )
            db.add(esc)
            new_count += 1
            logger.warning(
                "ESCALATION: issue_id=%d level=%d days_over=%d to=%s",
                issue.id, level, days_over, escalated_to,
            )

    if new_count:
        db.commit()

    return new_count
