from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.issue import Issue
from app.core.security import get_current_user
from app.models.mom_sync_history import MomSyncHistory
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone
import uuid
from app.models.mom import MOMSession
from app.api.websockets import manager

router = APIRouter()

def normalize_status(status: Optional[str]) -> str:
    if not status:
        return "Open"
    s = status.strip().lower()
    if s in ("open", "pending", "new", "in progress", "started"):
        # For the Issue Engine, we primarily use 'Open' or 'In Progress'
        # However, for the dashboard 'Open' is the primary filter.
        if s == "in progress":
            return "In Progress"
        return "Open"
    if s in ("closed", "done", "resolved", "complete", "completed"):
        return "Closed"
    return "Open"

class MOMAction(BaseModel):
    title: str
    description: Optional[str] = None
    owner: Optional[str] = None
    department: Optional[str] = "General"
    priority: Optional[str] = "Medium"
    due_date: Optional[str] = None
    status: Optional[str] = "Pending"
    action_taken: Optional[str] = None

class SyncIssuesRequest(BaseModel):
    project_id: int
    meeting_id: Optional[str] = None
    meeting_name: Optional[str] = "Untitled Meeting"
    date: Optional[str] = None
    mom_output_url: Optional[str] = None
    actions: List[MOMAction]

@router.post("/issues")
async def sync_mom_issues(
    req: SyncIssuesRequest, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Debug logging
    print(f"\n[DEBUG] Incoming MOM Sync Request for Project ID: {req.project_id}")
    print(f"[DEBUG] Actions count: {len(req.actions)}")

    # Determine the status of the meeting
    is_scheduled_meeting = (
        req.meeting_id and 
        req.meeting_id not in ("unscheduled", "null", "undefined", "") and 
        not req.meeting_id.startswith("sync-")
    )
    
    is_existing_standalone = (
        req.meeting_id and 
        req.meeting_id.startswith("sync-")
    )
    
    if is_existing_standalone:
        meeting_id_for_session = req.meeting_id
        # Extract sync_id from the existing meeting_id (e.g. sync-uuid -> uuid)
        sync_id = req.meeting_id.replace("sync-", "") if req.meeting_id else ""
    elif is_scheduled_meeting:
        meeting_id_for_session = req.meeting_id
        sync_id = str(uuid.uuid4())
    else:
        # Brand new unscheduled standalone meeting
        sync_id = str(uuid.uuid4())
        meeting_id_for_session = f"sync-{sync_id}"
    
    try:
        from app.models.project import Project
        project = db.query(Project).filter(Project.id == req.project_id).first()
        project_name = project.name if project else "Unknown Project"

        # Step 1: Cleanup existing MOM issues and history for this project+meeting
        if is_scheduled_meeting or is_existing_standalone:
            # Delete old history
            db.query(MomSyncHistory).filter(
                MomSyncHistory.project_id == req.project_id,
                MomSyncHistory.meeting_id == meeting_id_for_session
            ).delete(synchronize_session=False)
            
            # Delete old issues
            db.query(Issue).filter(
                Issue.project_id == req.project_id,
                Issue.source == "MOM",
                Issue.meeting_id == meeting_id_for_session
            ).delete(synchronize_session=False)

        db.flush()

        # Step 2: Initial history record with 'processing' status
        history = MomSyncHistory(
            sync_id=sync_id,
            status="processing",
            project_id=req.project_id,
            project_name=project_name,
            meeting_id=meeting_id_for_session,
            meeting_name=req.meeting_name,
            date=req.date,
            row_count=len(req.actions),
            mom_output_url=req.mom_output_url,
            synced_at=datetime.now(timezone.utc)
        )
        db.add(history)
        db.flush()

        # Step 3: Insert fresh rows
        created = []
        for action in req.actions:
            # Parse date safely
            parsed_due_date = None
            if action.due_date:
                try:
                    # Try common formats
                    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
                        try:
                            parsed_due_date = datetime.strptime(action.due_date, fmt).date()
                            break
                        except ValueError:
                            continue
                except Exception:
                    parsed_due_date = None

            issue = Issue(
                project_id=req.project_id,
                title=action.title,
                description=action.description or "",
                owner=action.owner or "Unassigned",
                department=action.department or "General",
                priority=action.priority or "Medium",
                due_date=parsed_due_date,
                status=normalize_status(action.status or "Pending"),
                sync_id=sync_id,
                action_taken=action.action_taken or "",
                meeting_id=meeting_id_for_session,
                source="MOM",
                created_at=datetime.now(timezone.utc)
            )
            db.add(issue)
            created.append(issue)

        db.flush()

        # Part 3 — Auto Saved MOM on every sync (Upsert pattern)
        mom_data = []
        for action in req.actions:
            mom_data.append({
                "discussion_point": action.title,
                "description": action.description,
                "responsibility": action.owner or "Unassigned",
                "function": action.department or "General",
                "criticality": action.priority or "Medium",
                "target": action.due_date or "TBD",
                "status": normalize_status(action.status or "Pending"),
                "action_taken": action.action_taken
            })
        
        existing_session = db.query(MOMSession).filter(MOMSession.meeting_id == meeting_id_for_session).first()
        
        if existing_session:
            db.query(MOMSession).filter(MOMSession.meeting_id == meeting_id_for_session).update({
                MOMSession.sync_id: sync_id,
                MOMSession.meeting_name: req.meeting_name,
                MOMSession.project_id: req.project_id,
                MOMSession.project_name: project_name,
                MOMSession.mom_data: mom_data,
                MOMSession.updated_at: datetime.now(timezone.utc)
            })
        else:
            saved_mom = MOMSession(
                sync_id=sync_id,
                meeting_id=meeting_id_for_session,
                meeting_name=req.meeting_name,
                project_id=req.project_id,
                project_name=project_name,
                mom_data=mom_data,
                created_at=datetime.now(timezone.utc)
            )
            db.add(saved_mom)

        # Update history to success
        db.query(MomSyncHistory).filter(MomSyncHistory.sync_id == sync_id).update({
            MomSyncHistory.status: "success",
            MomSyncHistory.row_count: len(created)
        })
        
        db.commit()

        # Step 6: Broadcast WebSocket Events for Auto-Refresh
        try:
            # Tell the Dashboard to refresh its issues list
            await manager.broadcast({
                "type": "ISSUE_SYNCED",
                "project_id": req.project_id,
                "project_name": project_name,
                "sync_id": sync_id,
                "meeting_id": meeting_id_for_session
            })
            # Tell listeners that a MOM was saved
            await manager.broadcast({
                "type": "MOM_SAVED",
                "project_id": req.project_id,
                "project_name": project_name,
                "meeting_id": meeting_id_for_session
            })
        except Exception as e:
            print(f"[WARN] Failed to broadcast websocket events: {e}")

        return {
            "success": True,
            "sync_id": sync_id,
            "issues_created": len(created),
            "project_name": project_name
        }

    except Exception as e:
        db.rollback()
        import traceback
        error_detail = traceback.format_exc()
        print(f"\n[MOM SYNC ERROR] {str(e)}")
        print(error_detail)
        # Update history to failed if it was created
        try:
            fail_history = db.query(MomSyncHistory).filter(MomSyncHistory.sync_id == sync_id).first()
            if fail_history is not None:
                db.query(MomSyncHistory).filter(MomSyncHistory.sync_id == sync_id).update({MomSyncHistory.status: "failed"})
                db.commit()
        except:
            pass
            
        import logging
        logging.getLogger(__name__).error(f"[mom/issues] Sync failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/syncs/{sync_id}/items")
async def get_items_by_sync_id(sync_id: str, db: Session = Depends(get_db)):
    """Fetch all action items for a specific sync_id."""
    try:
        issues = db.query(Issue).filter(
            Issue.sync_id == sync_id,
            Issue.source == "MOM"
        ).order_by(Issue.id.asc()).all()

        if not issues:
            # Fallback for legacy records: check if sync_id is actually a meeting_id
            issues = db.query(Issue).filter(
                Issue.meeting_id == sync_id,
                Issue.source == "MOM"
            ).order_by(Issue.id.asc()).all()

        rows = []
        for i in issues:
            rows.append({
                "id":               i.id,
                "function":         i.department or "General",
                "criticality":      i.priority or "Medium",
                "discussion_point": i.title,
                "description":      i.description,
                "responsibility":   i.owner or "Unassigned",
                "target":           str(i.due_date) if i.due_date is not None else "TBD",
                "status":           i.status or "Pending",
                "action_taken":     i.action_taken or "",
                "project_id":       i.project_id,
            })

        return {"success": True, "total": len(rows), "rows": rows}

    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"[mom/syncs/items] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sessions/{sync_id}")
async def get_mom_session_by_sync_id(sync_id: str, db: Session = Depends(get_db)):
    """Fetch the MOMSession record for a specific sync_id."""
    try:
        session = db.query(MOMSession).filter(MOMSession.sync_id == sync_id).first()
        if not session:
            # Fallback for legacy: sync_id might be a meeting_id
            session = db.query(MOMSession).filter(MOMSession.meeting_id == sync_id).first()
            
        if not session:
            return None
        return session
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"[mom/sessions/get] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{meeting_id}")
async def get_mom_data(meeting_id: str, db: Session = Depends(get_db)):
    """
    Unified endpoint to fetch MOM data by meeting_id.
    Supports meeting_id, sync-{sync_id}, and 'unscheduled' lookups.
    Returns MOMSession.mom_data if available, empty data otherwise.
    """
    try:
        # Handle special cases
        if not meeting_id or meeting_id in ("null", "undefined", ""):
            return {"success": False, "mom_data": [], "detail": "Invalid meeting_id"}
        
        # If it's an unscheduled meeting with no data, return empty
        if meeting_id == "unscheduled":
            return {"success": True, "mom_data": [], "detail": "Unscheduled meeting has no saved data yet"}
        
        # Try to find MOMSession by meeting_id first
        session = db.query(MOMSession).filter(MOMSession.meeting_id == meeting_id).first()
        
        # If not found and meeting_id is a sync-id format, try extracting sync_id
        if session is None and meeting_id.startswith("sync-"):
            sync_id = meeting_id.replace("sync-", "")
            session = db.query(MOMSession).filter(MOMSession.sync_id == sync_id).first()
        
        if session is not None and session.mom_data is not None:
            return {"success": True, "mom_data": session.mom_data}
        
        return {"success": True, "mom_data": []}

    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"[mom/get] Error fetching MOM data for {meeting_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/issues/{meeting_id}")
async def get_issues_by_meeting(meeting_id: str, db: Session = Depends(get_db)):
    """Fetch all synced MOM issues for a given meeting_id.
    Used by MOMViewPage as a 3rd data source when MOMSession.mom_data is empty
    but sync_mom_issues has already written rows to the Issue table."""
    try:
        issues = db.query(Issue).filter(
            Issue.meeting_id == meeting_id,
            Issue.source == "MOM"
        ).order_by(Issue.id.asc()).all()

        rows = []
        for i in issues:
            rows.append({
                "id":               i.id,
                "function":         i.department or "General",
                "criticality":      i.priority or "Medium",
                "discussion_point": i.title,
                "description":      i.description,
                "responsibility":   i.owner or "Unassigned",
                "target":           str(i.due_date) if i.due_date is not None else "TBD",
                "status":           i.status or "Pending",
                "project_id":       i.project_id,
            })

        return {"success": True, "total": len(rows), "rows": rows}

    except Exception as e:
        import logging
        logging.getLogger(__name__).error(
            f"[mom/issues/get] Error: {e}", exc_info=True
        )
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
                "sync_id": h.sync_id,
                "status": h.status,
                "session_id": h.meeting_id,
                "meeting_name": h.meeting_name,
                "date": str(h.date) if h.date is not None else None,
                "synced_at": h.synced_at.isoformat() if h.synced_at is not None else None,
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


@router.get("/history/all")
async def get_all_mom_history(
    project_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Return all sync history records, optionally filtered by project_id.
    Used by the unified Saved MOMs page to build grouped project cards."""
    try:
        from app.models.project import Project
        from sqlalchemy.orm import aliased

        query = db.query(MomSyncHistory)
        if project_id is not None:
            query = query.filter(MomSyncHistory.project_id == project_id)
        records = query.order_by(MomSyncHistory.synced_at.desc()).all()

        # Collect unique project_ids so we can enrich with project names
        pid_set = {r.project_id for r in records if r.project_id is not None}
        projects = {
            p.id: p.name
            for p in db.query(Project).filter(Project.id.in_(pid_set)).all()
        } if pid_set else {}

        results = []
        for h in records:
            results.append({
                "history_id": h.id,
                "sync_id": h.sync_id,
                "status": h.status,
                "meeting_id": h.meeting_id,
                "meeting_name": h.meeting_name or "Untitled Meeting",
                "project_id": h.project_id,
                "project_name": projects.get(h.project_id, "Unknown Project"),
                "date": str(h.date) if h.date is not None else None,
                "synced_at": h.synced_at.isoformat() if h.synced_at is not None else None,
                "row_count": h.row_count or 0,
                "mom_output_url": h.mom_output_url,
            })

        return {"success": True, "total": len(results), "records": results}

    except Exception as e:
        import logging
        logging.getLogger(__name__).error(
            f"[mom/history/all] Error: {e}", exc_info=True
        )
        raise HTTPException(status_code=500, detail=str(e))

class ActionItemPatchRequest(BaseModel):
    field: str
    value: Optional[str] = None
    sync_id: Optional[str] = None

@router.patch("/action-items/{item_id}")
async def patch_action_item(item_id: int, req: ActionItemPatchRequest, db: Session = Depends(get_db)):
    """Inline editing for a specific action item (Issue)."""
    try:
        issue = db.query(Issue).filter(Issue.id == item_id).first()
        if not issue:
            raise HTTPException(status_code=404, detail="Action item not found")

        # Map frontend field names to model field names
        field_map = {
            "discussion_point": "title",
            "responsibility":   "owner",
            "function":         "department",
            "criticality":      "priority",
            "target":           "due_date",
            "status":           "status",
            "action_taken":     "action_taken"
        }

        model_field = field_map.get(req.field)
        if not model_field:
            raise HTTPException(status_code=400, detail=f"Field {req.field} is not editable")

        val = req.value
        if model_field == "due_date":
            if val and val != "TBD":
                try:
                    val = datetime.strptime(val, '%Y-%m-%d').date()
                except:
                    val = None
            else:
                val = None
        elif model_field == "status":
            val = normalize_status(val)

        setattr(issue, model_field, val)
        db.query(Issue).filter(Issue.id == item_id).update({
            Issue.updated_at: datetime.now(timezone.utc)
        })
        
        db.commit()
        db.refresh(issue)

        return {
            "success": True,
            "item": {
                "id": issue.id,
                "discussion_point": issue.title,
                "responsibility": issue.owner,
                "function": issue.department,
                "criticality": issue.priority,
                "target": str(issue.due_date) if issue.due_date is not None else "TBD",
                "status": issue.status,
                "action_taken": issue.action_taken
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/action-items/{item_id}")
async def delete_action_item(item_id: int, db: Session = Depends(get_db)):
    """Hard delete a single action item (Issue) and decrement the parent sync's row_count."""
    try:
        issue = db.query(Issue).filter(Issue.id == item_id).first()
        if not issue:
            raise HTTPException(status_code=404, detail="Action item not found")

        sync_id = issue.sync_id  # capture before deletion

        db.delete(issue)
        db.flush()

        # Decrement row_count on parent sync history record so the card count stays accurate
        if sync_id is not None:
            db.query(MomSyncHistory).filter(MomSyncHistory.sync_id == sync_id).update({
                MomSyncHistory.row_count: MomSyncHistory.row_count - 1
            })

        db.commit()
        return {"success": True, "deleted_item_id": item_id}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/syncs/{sync_id}")
async def delete_sync(
    sync_id: str, 
    history_id: Optional[int] = None, 
    meeting_id: Optional[str] = None, 
    db: Session = Depends(get_db)
):
    """Atomic hard deletion of a sync event and all of its references across all tables."""
    try:
        # Resolve target syncs and meetings thoroughly to guarantee complete hard delete
        sync_ids = set()
        meeting_ids = set()
        history_ids = set()

        if sync_id and sync_id not in ("null", "undefined", ""):
            sync_ids.add(sync_id)
        if meeting_id and meeting_id not in ("null", "undefined", "unscheduled", ""):
            meeting_ids.add(meeting_id)
        if history_id is not None:
            history_ids.add(history_id)

        # 1. Query MomSyncHistory to find matching sync_id or meeting_id
        history_queries = []
        if sync_ids:
            history_queries.append(MomSyncHistory.sync_id.in_(sync_ids))
        if meeting_ids:
            history_queries.append(MomSyncHistory.meeting_id.in_(meeting_ids))
        if history_ids:
            history_queries.append(MomSyncHistory.id.in_(history_ids))

        if history_queries:
            from sqlalchemy import or_
            histories = db.query(MomSyncHistory).filter(or_(*history_queries)).all()
            for h in histories:
                if h.sync_id is not None:
                    sync_ids.add(h.sync_id)
                if h.meeting_id is not None:
                    meeting_ids.add(h.meeting_id)
                history_ids.add(h.id)

        # 2. Hard delete issues
        issue_queries = []
        if sync_ids:
            issue_queries.append(Issue.sync_id.in_(sync_ids))
        if meeting_ids:
            issue_queries.append((Issue.meeting_id.in_(meeting_ids)) & (Issue.source == "MOM"))
        
        if issue_queries:
            from sqlalchemy import or_
            db.query(Issue).filter(or_(*issue_queries)).delete(synchronize_session=False)

        # 3. Hard delete MOM Sessions
        mom_session_queries = []
        if sync_ids:
            mom_session_queries.append(MOMSession.sync_id.in_(sync_ids))
            # Also support meeting_id formatted as sync-{sync_id}
            sync_formatted_meetings = [f"sync-{sid}" for sid in sync_ids]
            mom_session_queries.append(MOMSession.meeting_id.in_(sync_formatted_meetings))
        if meeting_ids:
            mom_session_queries.append(MOMSession.meeting_id.in_(meeting_ids))
        
        if mom_session_queries:
            from sqlalchemy import or_
            db.query(MOMSession).filter(or_(*mom_session_queries)).delete(synchronize_session=False)

        # 4. Hard delete from MomSyncHistory
        history_delete_queries = []
        if history_ids:
            history_delete_queries.append(MomSyncHistory.id.in_(history_ids))
        if sync_ids:
            history_delete_queries.append(MomSyncHistory.sync_id.in_(sync_ids))
        if meeting_ids:
            history_delete_queries.append(MomSyncHistory.meeting_id.in_(meeting_ids))

        if history_delete_queries:
            from sqlalchemy import or_
            db.query(MomSyncHistory).filter(or_(*history_delete_queries)).delete(synchronize_session=False)

        # 5. Reset meeting mom_generated and action_item_count flags in Meetings
        if meeting_ids:
            from app.models.meeting import Meeting
            # Reset meeting flags
            db.query(Meeting).filter(Meeting.id.in_(meeting_ids)).update({
                "mom_generated": False,
                "action_item_count": 0
            }, synchronize_session=False)

        db.commit()
        return {"success": True, "message": "Sync completely and permanently deleted"}
    except Exception as e:
        db.rollback()
        import traceback
        print(f"[HARD DELETE MOM ERROR] {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
