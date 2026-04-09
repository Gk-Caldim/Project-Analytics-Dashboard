"""
Issue Engine API
================
POST   /api/issues                              — Create issue (manual)
GET    /api/issues/project/{project_id}         — List issues for a project
PATCH  /api/issues/{issue_id}                   — Update issue
DELETE /api/issues/{issue_id}                   — Close (soft-delete) issue
GET    /api/issues/project/{project_id}/critical — Top N critical issues by urgency
GET    /api/issues/project/{project_id}/analytics — Summary metrics
POST   /api/issues/{issue_id}/actions           — Add action item to issue
POST   /api/issues/{issue_id}/comments          — Add comment to issue
GET    /api/issues/{issue_id}/escalations       — View escalation history
POST   /api/issues/project/{project_id}/run-escalation — Trigger escalation engine
POST   /api/mom/issues                          — Batch create from MOM actions
"""

from __future__ import annotations

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.issue import IssueAction, IssueComment, IssueEscalation
from app.schemas.issue import (
    IssueActionCreate, IssueActionOut,
    IssueCommentCreate, IssueCommentOut,
    IssueCreate, IssueOut, IssueUpdate,
    IssueEscalationOut,
    MOMIssueCreate, MOMIssueResponse,
    IssueAnalytics,
)
from app.services import issue_service

logger = logging.getLogger(__name__)

router  = APIRouter(prefix="/issues", tags=["Issues"])
mom_router = APIRouter(prefix="/mom",  tags=["MOM Issues"])


# ─── Helper: serialize Issue ORM → IssueOut ──────────────────────────────────

def _serialize(issue) -> IssueOut:
    return IssueOut(
        id=issue.id,
        project_id=issue.project_id,
        upload_id=issue.upload_id,
        source_type=issue.source_type,
        title=issue.title,
        description=issue.description,
        owner=issue.owner,
        department=issue.department,
        priority=issue.priority,
        severity_score=issue.severity_score,
        status=issue.status,
        derived_status=getattr(issue, "derived_status", issue_service.compute_derived_status(issue)),
        due_date=issue.due_date,
        meeting_id=issue.meeting_id,
        created_at=issue.created_at,
        updated_at=issue.updated_at,
        resolved_at=issue.resolved_at,
        days_overdue=getattr(issue, "days_overdue", 0),
        urgency_score=getattr(issue, "urgency_score", 0),
        is_escalated=getattr(issue, "is_escalated", bool(
            any(e.is_active for e in (issue.escalations or []))
        )),
        actions=[
            IssueActionOut(
                id=a.id, issue_id=a.issue_id, action_text=a.action_text,
                responsible_person=a.responsible_person, target_date=a.target_date,
                status=a.status, created_at=a.created_at,
            ) for a in (issue.actions or [])
        ],
        comments=[
            IssueCommentOut(
                id=c.id, issue_id=c.issue_id, comment_text=c.comment_text,
                created_by=c.created_by, created_at=c.created_at,
            ) for c in (issue.comments or [])
        ],
        escalations=[
            IssueEscalationOut(
                id=e.id, issue_id=e.issue_id, escalation_level=e.escalation_level,
                escalated_to=e.escalated_to, escalated_at=e.escalated_at,
                reason=e.reason, is_active=e.is_active,
            ) for e in (issue.escalations or [])
        ],
    )


# ─── CREATE issue (manual) ───────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED, response_model=IssueOut)
def create_issue(
    payload: IssueCreate,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Create a new issue manually. High priority issues must include due_date."""
    issue = issue_service.create_issue(db, payload)
    return _serialize(issue)


# ─── LIST issues for project ─────────────────────────────────────────────────

@router.get("/project/{project_id}", response_model=List[IssueOut])
def list_issues(
    project_id: int,
    status_filter:     Optional[str] = Query(None, alias="status"),
    priority_filter:   Optional[str] = Query(None, alias="priority"),
    department_filter: Optional[str] = Query(None, alias="department"),
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """List all issues for a project with optional filters."""
    issues = issue_service.list_issues(
        db, project_id, status_filter, priority_filter, department_filter
    )
    return [_serialize(i) for i in issues]


# ─── GET critical issues ─────────────────────────────────────────────────────

@router.get("/project/{project_id}/critical", response_model=List[IssueOut])
def get_critical_issues(
    project_id: int,
    limit: int = Query(5, ge=1, le=50),
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """
    Returns the top N unresolved issues sorted by urgency score.
    Also triggers the escalation engine as a side-effect.
    """
    issues = issue_service.get_critical_issues(db, project_id, limit)
    return [_serialize(i) for i in issues]


# ─── GET analytics ───────────────────────────────────────────────────────────

@router.get("/project/{project_id}/analytics")
def get_analytics(
    project_id: int,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Summary metrics: open/overdue/at-risk/closed counts, by dept, by priority."""
    data = issue_service.compute_analytics(db, project_id)
    # Serialize top_overdue list
    data["top_overdue"] = [_serialize(i) for i in data["top_overdue"]]
    return data


# ─── UPDATE issue ────────────────────────────────────────────────────────────

@router.patch("/{issue_id}", response_model=IssueOut)
def update_issue(
    issue_id: int,
    payload: IssueUpdate,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Partial update. Every change is timestamped via updated_at."""
    issue = issue_service.update_issue(db, issue_id, payload)
    return _serialize(issue)


# ─── DELETE (close) issue ────────────────────────────────────────────────────

@router.delete("/{issue_id}", status_code=status.HTTP_200_OK)
def close_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Soft-delete: sets status to Closed and stamps resolved_at."""
    issue = issue_service.update_issue(
        db, issue_id, IssueUpdate(status="Closed")
    )
    return {"success": True, "issue_id": issue.id, "status": issue.status}


# ─── ADD action to issue ─────────────────────────────────────────────────────

@router.post("/{issue_id}/actions", status_code=status.HTTP_201_CREATED, response_model=IssueActionOut)
def add_action(
    issue_id: int,
    payload: IssueActionCreate,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Add a tracked action item to an issue."""
    issue_service.get_or_404(db, issue_id)  # 404 guard
    action = IssueAction(
        issue_id=issue_id,
        action_text=payload.action_text,
        responsible_person=payload.responsible_person,
        target_date=payload.target_date,
        status=payload.status,
    )
    db.add(action)
    db.commit()
    db.refresh(action)
    return IssueActionOut(
        id=action.id, issue_id=action.issue_id, action_text=action.action_text,
        responsible_person=action.responsible_person, target_date=action.target_date,
        status=action.status, created_at=action.created_at,
    )


# ─── ADD comment to issue ────────────────────────────────────────────────────

@router.post("/{issue_id}/comments", status_code=status.HTTP_201_CREATED, response_model=IssueCommentOut)
def add_comment(
    issue_id: int,
    payload: IssueCommentCreate,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Append a comment to the issue audit thread."""
    issue_service.get_or_404(db, issue_id)
    comment = IssueComment(
        issue_id=issue_id,
        comment_text=payload.comment_text,
        created_by=payload.created_by,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return IssueCommentOut(
        id=comment.id, issue_id=comment.issue_id, comment_text=comment.comment_text,
        created_by=comment.created_by, created_at=comment.created_at,
    )


# ─── GET escalation history ──────────────────────────────────────────────────

@router.get("/{issue_id}/escalations", response_model=List[IssueEscalationOut])
def get_escalations(
    issue_id: int,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """View full escalation history for an issue."""
    issue_service.get_or_404(db, issue_id)
    escs = (
        db.query(IssueEscalation)
        .filter(IssueEscalation.issue_id == issue_id)
        .order_by(IssueEscalation.escalated_at.asc())
        .all()
    )
    return [
        IssueEscalationOut(
            id=e.id, issue_id=e.issue_id, escalation_level=e.escalation_level,
            escalated_to=e.escalated_to, escalated_at=e.escalated_at,
            reason=e.reason, is_active=e.is_active,
        )
        for e in escs
    ]


# ─── TRIGGER escalation engine ───────────────────────────────────────────────

@router.post("/project/{project_id}/run-escalation")
def trigger_escalation(
    project_id: int,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Manually trigger the escalation engine for a project."""
    new_escalations = issue_service.run_escalation_engine(db, project_id)
    return {
        "success": True,
        "project_id": project_id,
        "new_escalations_created": new_escalations,
        "message": (
            f"{new_escalations} new escalation(s) created"
            if new_escalations else "No new escalations required"
        ),
    }


# ─── MOM — batch create issues ───────────────────────────────────────────────

@mom_router.post("/issues", status_code=status.HTTP_201_CREATED)
def create_issues_from_mom(
    payload: MOMIssueCreate,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """
    Convert MOM action items into structured Issue records.

    Field mapping (MOM → Issue):
      Function       → department
      Action Points  → description  (+ first 50 chars → title)
      Responsibility → owner
      Target Date    → due_date
      Criticality    → priority

    Auto-filter:
      - ONLY rows where priority == 'High' are created
      - Rows missing owner or due_date are SKIPPED and logged

    Project binding:
      - project_id (if provided) is used directly
      - project_name (if provided) is resolved via case-insensitive DB lookup
      - If neither resolves, the entire batch is rejected (400)
    """
    # ── 1. Resolve project_id ──────────────────────────────────
    project_id = payload.project_id
    if project_id is None and payload.project_name:
        project_id = issue_service.resolve_project_id(db, payload.project_name)

    if project_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Project '{payload.project_name}' was not found in the database. "
                "Create the project first, or supply a valid project_id."
            ),
        )

    # ── 2. Process each action row ────────────────────────────
    created = []
    skipped = []

    for i, action in enumerate(payload.actions):
        row_ref = f"Row {i + 1} ('{(action.title or '')[:40]}')"  # for logging

        # ── Filter: only High priority ──
        if action.priority != "High":
            skipped.append({"row": row_ref, "reason": f"priority='{action.priority}' — only High is auto-created"})
            continue

        # ── Validate owner ──
        if not action.owner or not action.owner.strip():
            skipped.append({"row": row_ref, "reason": "missing owner (Responsibility)"})
            logger.warning("MOM sync skipped %s — no owner", row_ref)
            continue

        # ── Validate due_date (required for High) ──
        if action.due_date is None:
            skipped.append({"row": row_ref, "reason": "missing due_date (Target Date) — required for High priority"})
            logger.warning("MOM sync skipped %s — no due_date", row_ref)
            continue

        # ── Build title: first 50 chars of description / title ──
        source_text = (action.description or action.title or "").strip()
        title_50    = source_text[:50] if source_text else action.title[:50]

        issue = issue_service.create_issue_from_mom_action(
            db=db,
            project_id=project_id,
            meeting_id=payload.meeting_id,
            action=action.__class__(
                title=title_50,
                description=action.description or action.title,
                owner=action.owner.strip(),
                department=action.department,
                priority=action.priority,
                status=action.status,
                due_date=action.due_date,
            ),
        )
        created.append(_serialize(issue))

    logger.info(
        "MOM issue sync ─ project_id=%d meeting=%s created=%d skipped=%d",
        project_id, payload.meeting_id, len(created), len(skipped),
    )

    return {
        "success": True,
        "project_id": project_id,
        "created": len(created),
        "skipped": len(skipped),
        "issues": created,
        "skip_log": skipped,   # transparent audit trail for VP-level reporting
    }


# ─── GET single issue ────────────────────────────────────────────────────────

@router.get("/{issue_id}", response_model=IssueOut)
def get_issue(
    issue_id: int,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Fetch a single issue with all related actions, comments and escalations."""
    issue = issue_service.get_or_404(db, issue_id)
    issue_service.enrich_issue(issue)
    return _serialize(issue)
