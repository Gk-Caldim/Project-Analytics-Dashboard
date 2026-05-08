from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.issue import Issue
from app.models.mom_sync_history import MomSyncHistory
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone

router = APIRouter()

def normalize_status(status: str) -> str:
    if not status:
        return "Pending"
    s = status.strip().lower()
    if s in ("open", "pending", "in progress"):
        return "Pending"
    if s in ("closed", "done", "resolved", "complete", "completed"):
        return "Resolved"
    return "Pending"

class MOMAction(BaseModel):
    title: str
    description: Optional[str] = None
    owner: Optional[str] = None
    department: Optional[str] = "General"
    priority: Optional[str] = "Medium"
    due_date: Optional[str] = None
    status: Optional[str] = "Pending"

class SyncIssuesRequest(BaseModel):
    project_id: int
    meeting_id: Optional[str] = None
    meeting_name: Optional[str] = "Untitled Meeting"
    date: Optional[str] = None
    mom_output_url: Optional[str] = None
    actions: List[MOMAction]

@router.post("/issues")
async def sync_mom_issues(req: SyncIssuesRequest, db: Session = Depends(get_db)):
    try:
        # CLEANUP: Delete any orphaned ghost issues (created from manual syncs when meeting_id was missing)
        db.query(Issue).filter(
            Issue.project_id == req.project_id,
            Issue.source == "MOM",
            Issue.meeting_id == None
        ).delete(synchronize_session=False)

        # Step 1: Delete all existing MOM issues for this project+meeting
        # to prevent duplication on re-sync
        if req.meeting_id:
            db.query(Issue).filter(
                Issue.project_id == req.project_id,
                Issue.source == "MOM",
                Issue.meeting_id == req.meeting_id
            ).delete(synchronize_session=False)
        else:
            if req.actions:
                # fallback: delete by project + source + meeting_name
                db.query(Issue).filter(
                    Issue.project_id == req.project_id,
                    Issue.source == "MOM",
                    Issue.title.in_([a.title for a in req.actions])
                ).delete(synchronize_session=False)

        db.flush()

        # Step 2: Insert fresh rows
        created = []
        for action in req.actions:
            issue = Issue(
                project_id=req.project_id,
                meeting_id=req.meeting_id,
                title=action.title,
                description=action.description or action.title,
                owner=action.owner or "Unassigned",
                department=action.department or "General",
                priority=action.priority or "Medium",
                due_date=action.due_date if action.due_date else None,
                status=normalize_status(action.status),
                source="MOM",
                created_at=datetime.now(timezone.utc)
            )
            db.add(issue)
            created.append(issue)

        db.flush()

        # Step 3: Write sync history record (append only)
        history = MomSyncHistory(
            project_id=req.project_id,
            meeting_id=req.meeting_id,
            meeting_name=req.meeting_name,
            date=req.date,
            row_count=len(created),
            mom_output_url=req.mom_output_url,
            synced_at=datetime.now(timezone.utc)
        )
        db.add(history)

        db.commit()

        return {
            "success": True,
            "issues_created": len(created),
            "message": f"{len(created)} issues synced to project {req.project_id}"
        }

    except Exception as e:
        db.rollback()
        import logging
        logging.getLogger(__name__).error(f"[mom/issues] Sync failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


class ManualIssueRequest(BaseModel):
    project_id: int
    meeting_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    owner: Optional[str] = None
    department: Optional[str] = None
    priority: Optional[str] = "Medium"
    due_date: Optional[str] = None

@router.post("/issues/manual")
async def create_manual_issue(req: ManualIssueRequest, db: Session = Depends(get_db)):
    try:
        issue = Issue(
            project_id=req.project_id,
            meeting_id=req.meeting_id,
            title=req.title,
            description=req.description or req.title,
            owner=req.owner or "Unassigned",
            department=req.department or "General",
            priority=req.priority or "Medium",
            due_date=req.due_date if req.due_date else None,
            status="Pending",
            source="MOM",
            created_at=datetime.now(timezone.utc)
        )
        db.add(issue)
        db.commit()
        db.refresh(issue)
        return {"success": True, "issue_id": issue.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history/project/{project_id}")
async def get_mom_history(project_id: int, db: Session = Depends(get_db)):
    try:
        history = db.query(MomSyncHistory).filter(
            MomSyncHistory.project_id == project_id
        ).order_by(MomSyncHistory.synced_at.desc()).all()
        return [
            {
                "history_id": h.id,
                "session_id": h.meeting_id,
                "meeting_name": h.meeting_name,
                "date": str(h.date) if h.date else None,
                "synced_at": h.synced_at.isoformat() if h.synced_at else None,
                "row_count": h.row_count,
                "mom_output_url": h.mom_output_url,
            }
            for h in history
        ]
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(
            f"[mom/history] Error: {e}", exc_info=True
        )
        return []
