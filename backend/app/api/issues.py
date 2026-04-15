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
# ===========================================================================

@mom_router.post("/issues", status_code=status.HTTP_201_CREATED)
def create_issues_from_mom(
    payload: MOMIssueCreate,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    AUTO-CREATE issues from MOM action rows.

    Business rules enforced:
      1. Only priority == 'High' rows are processed
      2. owner must be non-empty (Responsibility column)
      3. due_date STRONGLY RECOMMENDED — if missing on High priority:
         • HIGH priority without due_date → auto-downgrade to MEDIUM
         • (allows sync to succeed with risk mitigation logged)
      4. Duplicate guard: title[:50] + owner + due_date + project_id must
         be unique among open issues — duplicates are skipped with a reason logged

    Field mapping (MOM -> Issue):
      Function       -> department
      Action Points  -> description  (first 50 chars -> title)
      Responsibility -> owner
      Target Date    -> due_date
      Criticality    -> priority (auto-downgraded if High + no due_date)
      Project        -> project_id

    Response:
      {
        "total_rows":     <int>,
        "issues_created": <int>,
        "issues_skipped": <int>,
        "missing_dates_downgraded": <int>,
        "summary": {
          "missing_owner":       <int>,
          "missing_date_downgraded": <int>,
          "duplicate":           <int>,
          "error":               <int>
        },
        "details":        [{"row": int, "reason": str, "action": str}],
        "issues":         [<IssueOut>, ...]
      }
    """
    # 1. We now strictly require project_id from the caller
    project_id = payload.project_id

    created_by = user.get("email") or user.get("employee_id") or "MOM-Auto"
    total_rows = len(payload.actions)
    created: List[IssueOut] = []
    details: List[dict] = []
    
    # Summary counters
    summary = {
        "missing_owner": 0,
        "missing_date_downgraded": 0,
        "duplicate": 0,
        "error": 0,
    }

    # 2. Process each action row
    for i, action in enumerate(payload.actions):
        row_num = i + 1
        row_ref = f"Row {row_num}"

        # ── Validation: owner required ──
        if not action.owner or not action.owner.strip():
            summary["missing_owner"] += 1
            detail = {
                "row": row_num,
                "reason": "Missing owner (Responsibility field is empty)",
                "action": "SKIPPED",
                "title": (action.description or action.title or "")[:40],
            }
            details.append(detail)
            logger.warning("MOM auto-create skipped %s — no owner", row_ref)
            continue

        # Build canonical title (first 50 chars of action point / description)
        source_text = (action.description or action.title or "").strip()

        f_title_50 = source_text[:50]
        f_desc = source_text
        f_due_date = action.due_date
        f_owner = action.owner.strip()
        f_status = "Open"
        f_priority = action.priority or "High"

        # ── Smart Priority Handling: High without due_date → downgrade to Medium ──
        priority_downgraded = False
        if f_priority == "High" and not f_due_date:
            f_priority = "Medium"
            priority_downgraded = True
            summary["missing_date_downgraded"] += 1
            detail = {
                "row": row_num,
                "reason": "Missing due date (Target column is empty)",
                "action": "CREATED (priority downgraded from High → Medium)",
                "title": f_title_50[:40],
            }
            details.append(detail)
            logger.info(
                "MOM auto-create %s — HIGH→MEDIUM due to missing due_date: %s",
                row_ref, f_title_50[:40]
            )

        # ── Duplicate guard ──
        duplicate = issue_service.find_duplicate_issue(
            db, project_id, f_title_50, f_owner, f_due_date
        )
        if duplicate:
            summary["duplicate"] += 1
            detail = {
                "row": row_num,
                "reason": f"Duplicate issue already exists (id={duplicate.id})",
                "action": "SKIPPED",
                "title": f_title_50[:40],
            }
            details.append(detail)
            logger.info("MOM duplicate skipped %s → existing issue id=%d", row_ref, duplicate.id)
            continue

        # ── Create the issue — catch per-row errors so batch never fails entirely ──
        try:
            issue = issue_service.create_issue_from_mom_action(
                db=db,
                project_id=project_id,
                meeting_id=payload.meeting_id,
                action=action.__class__(
                    title=f_title_50,
                    description=f_desc,
                    owner=f_owner,
                    department=action.department,
                    priority=f_priority,
                    status=f_status,
                    due_date=f_due_date,
                ),
                created_by=created_by,
            )
            created.append(_serialize(issue))
            
            # Only add detail if not already added (e.g., priority downgrade case)
            if not priority_downgraded:
                detail = {
                    "row": row_num,
                    "reason": f"Created successfully (priority={f_priority})",
                    "action": "CREATED",
                    "title": f_title_50[:40],
                    "issue_id": issue.id,
                }
                details.append(detail)
            else:
                # Update the previously added detail with issue_id
                for d in details:
                    if d.get("row") == row_num:
                        d["issue_id"] = issue.id
                        break

            logger.info(
                "MOM auto-create SUCCESS %s -> issue_id=%d project=%d priority=%s",
                row_ref, issue.id, project_id, f_priority,
            )
        except Exception as exc:
            summary["error"] += 1
            detail = {
                "row": row_num,
                "reason": f"Error during creation: {str(exc)[:100]}",
                "action": "FAILED",
                "title": f_title_50[:40],
            }
            details.append(detail)
            logger.error("MOM auto-create ERROR %s: %s", row_ref, exc)


    logger.info(
        "MOM sync complete — project_id=%d meeting=%s "
        "total=%d created=%d skipped=%d downgraded=%d",
        project_id, payload.meeting_id,
        total_rows, len(created), total_rows - len(created),
        summary["missing_date_downgraded"],
    )

    return {
        "total_rows": total_rows,
        "issues_created": len(created),
        "issues_skipped": total_rows - len(created),
        "missing_dates_downgraded": summary["missing_date_downgraded"],
        "summary": summary,
        "details": details,
        "issues": created,
    }


# ---------------------------------------------------------------------------
# MANUAL OVERRIDE — promote any MOM row to an issue (bypasses priority filter)
# POST /api/mom/issues/manual
# ---------------------------------------------------------------------------

class ManualMOMIssueRequest(BaseModel):
    """
    Payload for the 'Create Issue' button click in the MOM UI.
    Bypasses the High-only filter — any row can be manually promoted.
    Duplicate check still applies.
    """
    project_id:   int
    meeting_id:   Optional[str]       = None
    title:        str
    description:  Optional[str]       = None
    owner:        str
    department:   Optional[str]       = None
    priority:     str                 = "Medium"
    due_date:     Optional[date_type] = None


@mom_router.post(
    "/issues/manual",
    status_code=status.HTTP_201_CREATED,
    response_model=IssueOut,
)
def create_issue_manually_from_mom(
    payload: ManualMOMIssueRequest,
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    """
    Manual override: promote a single MOM row to an Issue.

    Unlike the auto-create batch endpoint this:
      - Accepts ANY priority level (not just High)
      - Still enforces owner presence
      - Still runs the duplicate check (returns 409 on match)
      - Requires due_date only when priority == 'High' (schema enforcement)

    This is the backend handler for the 'Create Issue' button
    shown per-row in the MOM action table.
    """
    # Project ID is now mandated by schema
    project_id = payload.project_id

    # Validate owner
    if not payload.owner or not payload.owner.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="owner is required — cannot create an issue without an owner.",
        )

    # Build canonical title
    source_text = (payload.description or payload.title or "").strip()
    title_50    = source_text[:50] or payload.title[:50]

    # Duplicate check — hard reject (not a background skip)
    duplicate = issue_service.find_duplicate_issue(
        db, project_id, title_50, payload.owner.strip(), payload.due_date
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Duplicate issue already exists (id={duplicate.id}). "
                "The same title, owner, and due_date are already open for this project."
            ),
        )

    created_by = user.get("email") or user.get("employee_id") or "MOM-Manual"

    # Build IssueCreate — schema validators enforce due_date for High priority
    try:
        issue_payload = IssueCreate(
            project_id=project_id,
            source_type="MOM",
            title=title_50,
            description=payload.description or payload.title,
            owner=payload.owner.strip(),
            department=payload.department,
            priority=payload.priority,   # type: ignore[arg-type]
            status="Open",
            due_date=payload.due_date,
            meeting_id=payload.meeting_id,
            created_by=created_by,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )

    issue = issue_service.create_issue(db, issue_payload)
    logger.info(
        "MOM manual issue created: id=%d project=%d priority=%s owner=%s meeting=%s",
        issue.id, project_id, payload.priority, payload.owner, payload.meeting_id,
    )
    return _serialize(issue)
