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
from sqlalchemy.orm import Session, selectinload

from app.models.issue import Issue, IssueAction, IssueComment, IssueEscalation, IssueAuditLog
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


# ─── Status & health ─────────────────────────────────────────────────────────


def compute_health_status(issue: Issue) -> str:
    """
    Dynamic health calculation:
      IF today > due_date → "Overdue"
      IF due_date within 2 days → "At Risk"
      ELSE → "On Track"
    """
    # Note: Closed issues also get a health status based on their due_date? 
    # Usually health status is for open items, but the prompt says "for each issue".
    # However, if it's closed, it's technically "On Track" or "Closed".
    # I'll stick to the exact rules provided.
    
    if issue.due_date is None:
        return "On Track"
    
    today = date.today()
    delta = (issue.due_date - today).days
    
    if delta < 0:
        return "Overdue"
    if delta <= 2:
        return "At Risk"
    return "On Track"


def _days_overdue(issue: Issue) -> int:
    """Positive int if overdue, 0 otherwise."""
    if issue.due_date is None or issue.status == "Closed":
        return 0
    today = date.today()
    delta = (today - issue.due_date).days
    return max(delta, 0)


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
    issue.health_status = compute_health_status(issue)          # type: ignore[attr-defined]
    issue.days_overdue   = _days_overdue(issue)                   # type: ignore[attr-defined]
    issue.urgency_score  = compute_urgency_score(issue)           # type: ignore[attr-defined]
    issue.is_escalated   = any(                                   # type: ignore[attr-defined]
        e.is_active for e in (issue.escalations or [])
    )
    return issue


def rank_issues(issues: List[Issue]) -> List[Issue]:
    """
    Sort order:
      1. Overdue issues first
      2. Then nearest due_date
    """
    for iss in issues:
        enrich_issue(iss)
    
    # Sort criteria: 
    # 1. Overdue (health_status == "Overdue") -> boolean (inverse)
    # 2. due_date (ascending)
    return sorted(
        issues, 
        key=lambda i: (
            0 if i.health_status == "Overdue" else 1,    # Overdue (0) comes before others (1)
            i.due_date or date.max                        # nearest due_date first
        )
    )


# ─── CRUD helpers ────────────────────────────────────────────────────────────

def get_or_404(db: Session, issue_id: int) -> Issue:
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"Issue {issue_id} not found")
    return issue


def create_issue(db: Session, payload: IssueCreate, bypass_governance: bool = False) -> Issue:
    # ── Duplicate Prevention ──
    # Check: same title, owner, due_date, project_id
    duplicate = db.query(Issue).filter(
        Issue.title == payload.title,
        Issue.owner == payload.owner,
        Issue.due_date == payload.due_date,
        Issue.project_id == payload.project_id
    ).first()
    
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate issue detected"
        )

    # ── Governance Rule: High priority must have due_date ──
    # Bypassed for MOM batch route (endpoint pre-downgrades High→Medium when no date)
    if not bypass_governance and payload.priority == "High" and payload.due_date is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="High priority issues must always have a due_date"
        )

    issue = Issue(
        project_id=payload.project_id,
        upload_id=payload.upload_id,
        source=payload.source,
        title=payload.title,
        description=payload.description,
        owner=payload.owner,
        department=payload.department,
        created_by=payload.created_by or "System",
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


def update_issue(db: Session, issue_id: int, payload: IssueUpdate, changed_by: str = "System") -> Issue:
    issue = get_or_404(db, issue_id)

    # ── Validation: Cannot close issue without owner ──
    new_status = payload.status or issue.status
    new_owner = payload.owner or issue.owner
    if new_status == "Closed" and (not new_owner or not new_owner.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot close issue without owner"
        )
    
    # ── Validation: High priority must have due_date ──
    new_priority = payload.priority or issue.priority
    new_due_date = payload.due_date if payload.due_date is not None else issue.due_date
    if new_priority == "High" and new_due_date is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="High priority must always have due_date"
        )

    update_data = payload.model_dump(exclude_unset=True)
    
    # ── Audit Logging ──
    logs = []
    for field, new_val in update_data.items():
        old_val = getattr(issue, field)
        
        # Convert values to string for logging
        str_old = str(old_val) if old_val is not None else None
        str_new = str(new_val) if new_val is not None else None
        
        if str_old != str_new:
            logs.append(IssueAuditLog(
                issue_id=issue.id,
                field_changed=field,
                old_value=str_old,
                new_value=str_new,
                changed_by=changed_by
            ))
            setattr(issue, field, new_val)

    # Auto-set resolved_at when closing
    if payload.status == "Closed" and issue.resolved_at is None:
        issue.resolved_at = datetime.now(timezone.utc)
    elif payload.status and payload.status != "Closed":
        issue.resolved_at = None  # re-opened

    if logs:
        db.add_all(logs)

    db.commit()
    db.refresh(issue)
    logger.info("Issue updated: id=%d fields=%s", issue.id, list(update_data.keys()))
    return enrich_issue(issue)


def list_issues(
    db: Session,
    project_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    owner_filter: Optional[str] = None,
    priority_filter: Optional[str] = None,
    department_filter: Optional[str] = None,
) -> List[Issue]:
    """
    List issues with filters and sorting.
    Filter support: project_id, status, owner, priority.
    Sort order: Overdue first, then nearest due_date.
    """
    q = db.query(Issue).options(
        selectinload(Issue.actions),
        selectinload(Issue.comments),
        selectinload(Issue.escalations),
        selectinload(Issue.audit_logs)
    )
    
    if project_id is not None:
        q = q.filter(Issue.project_id == project_id)
    if status_filter:
        q = q.filter(Issue.status == status_filter)
    if owner_filter:
        q = q.filter(Issue.owner == owner_filter)
    if priority_filter:
        q = q.filter(Issue.priority == priority_filter)
    if department_filter:
        q = q.filter(Issue.department == department_filter)
    
    # Sort by ID ascending before ranking to ensure stable insertion order for MOM items
    issues = q.order_by(Issue.id.asc()).all()
    
    # Dynamic health status calculation and sorting
    return rank_issues(issues)


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
        .options(
            selectinload(Issue.actions),
            selectinload(Issue.comments),
            selectinload(Issue.escalations),
            selectinload(Issue.audit_logs)
        )
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


# ─── Duplicate detection ─────────────────────────────────────────────────────

def find_duplicate_issue(
    db: Session,
    project_id: int,
    title: str,
    owner: str,
    due_date,
) -> Optional[Issue]:
    """
    Returns an existing open issue if it matches on all four identity keys:
      project_id + title (first 50 chars) + owner + due_date
    Returns None when no duplicate is found.
    """
    title_key = (title or "").strip()[:50]
    return (
        db.query(Issue)
        .filter(
            Issue.project_id == project_id,
            Issue.title == title_key,
            Issue.owner == (owner or "").strip(),
            Issue.due_date == due_date,
            Issue.status != "Closed",
        )
        .first()
    )


# ─── MOM Integration ─────────────────────────────────────────────────────────

def create_issue_from_mom_action(
    db: Session,
    project_id: int,
    meeting_id: Optional[str],
    action: MOMActionItem,
    created_by: str = "MOM-Auto",
) -> Issue:
    """Map a single MOM action item → Issue record. Governance bypass is active
    because the endpoint pre-normalises priority before calling this function."""
    payload = IssueCreate(
        project_id=project_id,
        source="MOM",
        title=action.title or (action.description or "")[:50] or "MOM Action",
        description=action.description,
        owner=action.owner or "Unassigned",
        department=action.department,
        priority=action.priority or "Medium",
        status="Open",
        due_date=action.due_date,
        meeting_id=meeting_id,
        created_by=created_by,
    )
    return create_issue(db, payload, bypass_governance=True)


# ─── Analytics ───────────────────────────────────────────────────────────────

def compute_analytics(db: Session, project_id: int) -> dict:
    all_issues = (
        db.query(Issue)
        .options(
            selectinload(Issue.escalations)
        )
        .filter(Issue.project_id == project_id)
        .all()
    )
    for iss in all_issues:
        enrich_issue(iss)

    total_open        = sum(1 for i in all_issues if i.status != "Closed")
    total_overdue     = sum(1 for i in all_issues if i.health_status == "Overdue")  # type: ignore
    total_at_risk     = sum(1 for i in all_issues if i.health_status == "At Risk")  # type: ignore
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
        [i for i in all_issues if i.health_status == "Overdue"],  # type: ignore
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

