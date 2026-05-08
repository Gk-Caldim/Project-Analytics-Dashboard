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
POST   /api/mom/issues                          — Batch auto-create from MOM (High-only + dedup)
POST   /api/mom/issues/manual                   — Manual override: create one issue from any MOM row
"""

from __future__ import annotations

import logging
from datetime import date as date_type
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.issue import IssueAction, IssueComment, IssueEscalation
from app.schemas.issue import (
    IssueActionCreate, IssueActionOut,
    IssueCommentCreate, IssueCommentOut,
    IssueCreate, IssueOut, IssueUpdate,
    IssueEscalationOut,
    IssueAuditLogOut,
    MOMIssueCreate, MOMIssueResponse,
    IssueAnalytics,
)
from app.services import issue_service
import uuid
from app.models.mom_sync_history import MomSyncHistory
from sqlalchemy import delete

logger = logging.getLogger(__name__)

router     = APIRouter(prefix="/issues", tags=["Issues"])
mom_router = APIRouter(prefix="/mom",   tags=["MOM Issues"])


# ---------------------------------------------------------------------------
# Helper: serialize Issue ORM -> IssueOut
# ---------------------------------------------------------------------------

def _serialize(issue) -> IssueOut:
    return IssueOut(
        id=issue.id,
        project_id=issue.project_id,
        upload_id=issue.upload_id,
        source=issue.source,
        title=issue.title,
        description=issue.description,
        owner=issue.owner,
        department=issue.department,
        created_by=getattr(issue, "created_by", "System"),
        priority=issue.priority,
        severity_score=issue.severity_score,
        status=issue.status,
        health_status=getattr(issue, "health_status", issue_service.compute_health_status(issue)),
        due_date=issue.due_date,
        meeting_id=issue.meeting_id,
        milestone_name=issue.milestone_name,
        created_at=issue.created_at,
        updated_at=issue.updated_at,
        resolved_at=issue.resolved_at,
        days_overdue=getattr(issue, "days_overdue", 0),
        urgency_score=getattr(issue, "urgency_score", 0),
        is_escalated=getattr(
            issue, "is_escalated",
            bool(any(e.is_active for e in (issue.escalations or [])))
        ),
        actions=[
            IssueActionOut(
                id=a.id, issue_id=a.issue_id, action_text=a.action_text,
                responsible_person=a.responsible_person, target_date=a.target_date,
                status=a.status, created_at=a.created_at,
            )
            for a in (issue.actions or [])
        ],
        comments=[
            IssueCommentOut(
                id=c.id, issue_id=c.issue_id, comment_text=c.comment_text,
                created_by=c.created_by, created_at=c.created_at,
            )
            for c in (issue.comments or [])
        ],
        escalations=[
            IssueEscalationOut(
                id=e.id, issue_id=e.issue_id, escalation_level=e.escalation_level,
                escalated_to=e.escalated_to, escalated_at=e.escalated_at,
                reason=e.reason, is_active=e.is_active,
            )
            for e in (issue.escalations or [])
        ],
        audit_logs=[
            IssueAuditLogOut(
                id=l.id, issue_id=l.issue_id, field_changed=l.field_changed,
                old_value=l.old_value, new_value=l.new_value,
                changed_by=l.changed_by, timestamp=l.timestamp,
            ) for l in (issue.audit_logs or [])
        ],
    )



# ─── CREATE issue (manual) ───────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED, response_model=IssueOut)
def create_issue(
    payload: IssueCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Create a new issue manually. High priority issues must include due_date."""
    payload.created_by = user.get("email") or user.get("employee_id") or "System"
    issue = issue_service.create_issue(db, payload)
    return _serialize(issue)


# ---------------------------------------------------------------------------
# LIST issues for a project
# ---------------------------------------------------------------------------

@router.get("", response_model=List[IssueOut])
def list_issues(
    project_id:        Optional[int] = Query(None),
    status_filter:     Optional[str] = Query(None, alias="status"),
    owner_filter:      Optional[str] = Query(None, alias="owner"),
    priority_filter:   Optional[str] = Query(None, alias="priority"),
    department_filter: Optional[str] = Query(None, alias="department"),
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """List issues with optional filters: project_id, status, owner, priority."""
    issues = issue_service.list_issues(
        db, project_id, status_filter, owner_filter, priority_filter, department_filter
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


# ---------------------------------------------------------------------------
# GET analytics
# ---------------------------------------------------------------------------

@router.get("/project/{project_id}/analytics")
def get_analytics(
    project_id: int,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Summary metrics: open/overdue/at-risk/closed counts, by dept, by priority."""
    data = issue_service.compute_analytics(db, project_id)
    data["top_overdue"] = [_serialize(i) for i in data["top_overdue"]]
    return data


# ---------------------------------------------------------------------------
# UPDATE issue
# ---------------------------------------------------------------------------

@router.patch("/{issue_id}", response_model=IssueOut)
def update_issue(
    issue_id: int,
    payload: IssueUpdate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """Partial update. Every change is timestamped and audit-logged."""
    # Assuming user dict has 'email' or 'username'. I'll check user_information if possible, 
    # but generic 'user["email"]' is common. Using 'user.get("email", "Unknown")'.
    changed_by = user.get("email", "System User")
    issue = issue_service.update_issue(db, issue_id, payload, changed_by=changed_by)
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


# ---------------------------------------------------------------------------
# ADD action to issue
# ---------------------------------------------------------------------------

@router.post(
    "/{issue_id}/actions",
    status_code=status.HTTP_201_CREATED,
    response_model=IssueActionOut,
)
def add_action(
    issue_id: int,
    payload: IssueActionCreate,
    db: Session = Depends(get_db),
    _user: dict = Depends(get_current_user),
):
    """Add a tracked action item to an issue."""
    issue_service.get_or_404(db, issue_id)
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


# ---------------------------------------------------------------------------
# ADD comment to issue
# ---------------------------------------------------------------------------

@router.post(
    "/{issue_id}/comments",
    status_code=status.HTTP_201_CREATED,
    response_model=IssueCommentOut,
)
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


# ---------------------------------------------------------------------------
# GET escalation history
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# TRIGGER escalation engine
# ---------------------------------------------------------------------------

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
            if new_escalations
            else "No new escalations required"
        ),
    }


# ---------------------------------------------------------------------------
# GET single issue
# ---------------------------------------------------------------------------

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


# ===========================================================================
# MOM -> ISSUE INTELLIGENCE LAYER
# (Creation endpoints moved to app/routers/mom.py)
# ===========================================================================


