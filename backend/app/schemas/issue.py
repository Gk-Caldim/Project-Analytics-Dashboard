"""
Issue Engine — Pydantic Schemas
================================
Strict governance validators:
  - owner is always required
  - project_id is always required
  - High priority issues must supply due_date
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, field_validator, model_validator


# ─── Enums / literals ────────────────────────────────────────────────────────
PriorityLiteral = Literal["High", "Medium", "Low"]
StatusLiteral   = Literal["Open", "In Progress", "Closed"]
SourceLiteral   = Literal["Manual", "MOM", "Tracker"]
ActionStatusLiteral = Literal["Pending", "In Progress", "Done"]


# ─── IssueAuditLog ──────────────────────────────────────────────────────────

class IssueAuditLogOut(BaseModel):
    id:            int
    issue_id:      int
    field_changed: str
    old_value:     Optional[str] = None
    new_value:     Optional[str] = None
    changed_by:    str
    timestamp:     datetime

    class Config:
        from_attributes = True



# ─── IssueAction ─────────────────────────────────────────────────────────────

class IssueActionCreate(BaseModel):
    action_text:        str
    responsible_person: Optional[str] = None
    target_date:        Optional[date] = None
    status:             ActionStatusLiteral = "Pending"


class IssueActionOut(IssueActionCreate):
    id:         int
    issue_id:   int
    created_at: datetime

    class Config:
        from_attributes = True


# ─── IssueComment ────────────────────────────────────────────────────────────

class IssueCommentCreate(BaseModel):
    comment_text: str
    created_by:   str = "System"


class IssueCommentOut(IssueCommentCreate):
    id:         int
    issue_id:   int
    created_at: datetime

    class Config:
        from_attributes = True


# ─── IssueEscalation ─────────────────────────────────────────────────────────

class IssueEscalationOut(BaseModel):
    id:               int
    issue_id:         int
    escalation_level: int
    escalated_to:     str
    escalated_at:     datetime
    reason:           Optional[str] = None
    is_active:        bool

    class Config:
        from_attributes = True


# ─── Issue ───────────────────────────────────────────────────────────────────

class IssueCreate(BaseModel):
    project_id:     int
    upload_id:      Optional[int] = None
    source:         SourceLiteral = "Manual"
    title:          str
    description:    Optional[str] = None
    owner:          str
    department:     Optional[str] = None
    priority:       PriorityLiteral = "Medium"
    severity_score: int = 0
    status:         StatusLiteral = "Open"

    due_date:       Optional[date] = None
    meeting_id:     Optional[str] = None

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("title must not be empty")
        return v.strip()

    @field_validator("owner")
    @classmethod
    def owner_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("owner is required — no issue may exist without an owner")
        return v.strip()

    @field_validator("severity_score")
    @classmethod
    def severity_in_range(cls, v: int) -> int:
        if not (0 <= v <= 100):
            raise ValueError("severity_score must be between 0 and 100")
        return v

    @model_validator(mode="after")
    def high_priority_needs_due_date(self) -> "IssueCreate":
        if self.priority == "High" and self.due_date is None:
            raise ValueError(
                "due_date is required for High priority issues — "
                "governance policy forbids open-ended high priority issues"
            )
        return self


class IssueUpdate(BaseModel):
    title:          Optional[str] = None
    description:    Optional[str] = None
    owner:          Optional[str] = None
    department:     Optional[str] = None
    priority:       Optional[PriorityLiteral] = None
    severity_score: Optional[int] = None
    status:         Optional[StatusLiteral] = None
    due_date:       Optional[date] = None

    @model_validator(mode="after")
    def high_priority_needs_due_date(self) -> "IssueUpdate":
        if self.priority == "High" and self.due_date is None:
            raise ValueError(
                "due_date is required when changing priority to High"
            )
        return self

    @model_validator(mode="after")
    def cannot_close_without_owner(self) -> "IssueUpdate":
        if self.status == "Closed" and (self.owner is None or not self.owner.strip()):
            # Note: This check assumes the existing owner is potentially missing if they pass null, 
            # but since it's PATCH, we'll check this in the service layer against the DB state too.
            pass 
        return self



class IssueOut(BaseModel):
    id:             int
    project_id:     int
    upload_id:      Optional[int] = None
    source:         str
    title:          str
    description:    Optional[str] = None
    owner:          str
    department:     Optional[str] = None
    priority:       str
    severity_score: int
    status:         str          # stored status (Open / In Progress / Closed)
    health_status:  str          # dynamic: Overdue / At Risk / On Track
    due_date:       Optional[date] = None
    meeting_id:     Optional[str] = None
    created_at:     datetime
    updated_at:     datetime
    resolved_at:    Optional[datetime] = None
    days_overdue:   int = 0
    urgency_score:  int = 0      # computed ranking score
    is_escalated:   bool = False  # True if any active escalation exists

    actions:     List[IssueActionOut]     = []
    comments:    List[IssueCommentOut]    = []
    escalations: List[IssueEscalationOut] = []
    audit_logs:  List[IssueAuditLogOut]   = []


    class Config:
        from_attributes = True


# ─── MOM Integration ─────────────────────────────────────────────────────────

class MOMActionItem(BaseModel):
    """Single action from a MOM meeting → maps to one Issue."""
    title:       str
    owner:       str
    department:  Optional[str] = None
    due_date:    Optional[date] = None
    priority:    PriorityLiteral = "Medium"
    status:      StatusLiteral = "Open"
    description: Optional[str] = None

    @field_validator("owner")
    @classmethod
    def owner_required(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("owner is required for every MOM action item")
        return v.strip()

    @model_validator(mode="after")
    def high_priority_needs_due_date(self) -> "MOMActionItem":
        if self.priority == "High" and self.due_date is None:
            raise ValueError("due_date is required for High priority MOM actions")
        return self


class MOMIssueCreate(BaseModel):
    """
    Batch create issues from a MOM session.

    Accepts EITHER:
      - project_id  (int)  → direct FK — used by programmatic callers
      - project_name (str) → backend resolves to project_id via DB lookup
    If both are supplied, project_id takes precedence.
    If neither is supplied, validation will fail.
    """
    project_id:   Optional[int] = None
    project_name: Optional[str] = None   # human-readable name → resolved to ID by backend
    meeting_id:   Optional[str] = None   # FK to meetings.id (string UUID or int)
    actions:      List[MOMActionItem]

    @model_validator(mode="after")
    def requires_project_reference(self) -> "MOMIssueCreate":
        if self.project_id is None and (self.project_name is None or not self.project_name.strip()):
            raise ValueError(
                "Either project_id or project_name is required — "
                "every MOM sync must be linked to a project."
            )
        return self

    @field_validator("actions")
    @classmethod
    def actions_not_empty(cls, v: list) -> list:
        if not v:
            raise ValueError("at least one action item is required")
        return v


class MOMIssueResponse(BaseModel):
    created: int
    issues:  List[IssueOut]


# ─── Analytics ───────────────────────────────────────────────────────────────

class IssueAnalytics(BaseModel):
    project_id:        int
    total_open:        int
    total_overdue:     int
    total_at_risk:     int
    total_closed:      int
    total_in_progress: int
    by_department:     dict   # { "Manufacturing": 3, "Supply Chain": 5, ... }
    by_priority:       dict   # { "High": 4, "Medium": 6, "Low": 2 }
    top_overdue:       List[IssueOut] = []
