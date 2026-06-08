from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean, JSON
from sqlalchemy.orm import relationship, backref, validates
from sqlalchemy.sql import func
from app.core.database import Base

class MilestoneAssignment(Base):
    __tablename__ = "milestone_assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("project_milestones.id", ondelete="CASCADE"), nullable=False)
    employee_id = Column(String, ForeignKey("employees.employee_id", ondelete="CASCADE"), nullable=False)

    task = relationship("ProjectMilestone", back_populates="assignments")

class ProjectMilestoneColumn(Base):
    __tablename__ = "project_milestone_columns"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String, ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False)
    column_name = Column(String, nullable=False)
    column_label = Column(String, nullable=False)
    data_type = Column(String, nullable=False, default="text")  # text, number, date, select, multiselect, checkbox
    options = Column(JSON, nullable=True, default=[])

class ProjectMilestone(Base):
    __tablename__ = "project_milestones"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    project_id = Column(String, ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(Integer, ForeignKey("project_milestones.id"), nullable=True)
    wbs_code = Column(String, nullable=True)
    item_type = Column(String, default="Task")  # Phase, Milestone, Task, Sub Task, Deliverable, Approval Gate
    task_type = Column(String, nullable=True)     # phase, activity, sub_activity, milestone
    activity_name = Column(String, nullable=False)
    row_order = Column(Integer, default=0)
    indent_level = Column(Integer, default=0)

    department = Column(String, nullable=True)  # Engineering, Design, Procurement, etc.
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    actual_start = Column(DateTime, nullable=True)
    actual_end = Column(DateTime, nullable=True)
    complete_percent = Column(Float, default=0.0)
    status = Column(String, default="Not Started")
    
    # Map database column temporarily to _assigned_to_json to avoid Python property conflict
    _assigned_to_json = Column("assigned_to", JSON, nullable=True, default=[])
    
    is_critical = Column(Boolean, default=False)
    total_float_days = Column(Float, default=0.0)
    custom_values = Column(JSON, default={})

    # Relationships
    assignments = relationship(
        "MilestoneAssignment",
        back_populates="task",
        cascade="all, delete-orphan"
    )
    parent = relationship(
        "ProjectMilestone",
        remote_side=[id],
        backref=backref("children")
    )

    @validates("task_type")
    def validate_task_type(self, key, value):
        valid_types = {"phase", "activity", "sub_activity", "milestone"}
        if value is not None and value not in valid_types:
            raise ValueError(f"task_type must be one of: {valid_types}")
        return value

    @property
    def assigned_to(self):
        return [a.employee_id for a in self.assignments]

    dependencies_as_successor = relationship(
        "ProjectDependency",
        foreign_keys="[ProjectDependency.successor_task_id]",
        cascade="all, delete-orphan",
        back_populates="successor"
    )
    dependencies_as_predecessor = relationship(
        "ProjectDependency",
        foreign_keys="[ProjectDependency.predecessor_task_id]",
        cascade="all, delete-orphan",
        back_populates="predecessor"
    )
    baselines = relationship(
        "ProjectBaseline",
        back_populates="task",
        cascade="all, delete-orphan"
    )
    followups = relationship(
        "ProjectTaskFollowup",
        back_populates="task",
        cascade="all, delete-orphan"
    )

class ProjectDependency(Base):
    __tablename__ = "project_dependencies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String, ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False)
    predecessor_task_id = Column(Integer, ForeignKey("project_milestones.id", ondelete="CASCADE"), nullable=False)
    successor_task_id = Column(Integer, ForeignKey("project_milestones.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False, default="FS")  # FS, SS, FF, SF
    lag_days = Column(Integer, default=0)

    predecessor = relationship("ProjectMilestone", foreign_keys=[predecessor_task_id], back_populates="dependencies_as_predecessor")
    successor = relationship("ProjectMilestone", foreign_keys=[successor_task_id], back_populates="dependencies_as_successor")

class ProjectBaseline(Base):
    __tablename__ = "project_baselines"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("project_milestones.id", ondelete="CASCADE"), nullable=False)
    baseline_version = Column(String, nullable=False, default="Baseline_V1")
    baseline_start = Column(DateTime, nullable=True)
    baseline_end = Column(DateTime, nullable=True)

    task = relationship("ProjectMilestone", back_populates="baselines")

class ProjectTaskFollowup(Base):
    __tablename__ = "project_task_followups"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("project_milestones.id", ondelete="CASCADE"), nullable=False)
    follow_up_date = Column(DateTime, nullable=True)
    owner = Column(String, nullable=True)  # Employee Name or ID
    status = Column(String, default="Open")  # Open, Closed
    notes = Column(String, nullable=True)

    task = relationship("ProjectMilestone", back_populates="followups")

class ProjectRelease(Base):
    __tablename__ = "project_releases"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(String, ForeignKey("projects.project_id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    version = Column(String, nullable=True)
    status = Column(String, default="Planning")  # Planning, Released, Delayed
    release_date = Column(DateTime, nullable=True)
