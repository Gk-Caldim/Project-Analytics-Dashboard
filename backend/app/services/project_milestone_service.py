from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Dict, Set, Tuple
from fastapi import HTTPException
from app.models.project_milestone import ProjectMilestone, ProjectDependency
from app.models.project import Project

def calculate_wbs_codes(tasks: List[ProjectMilestone]):
    """
    Computes WBS numbers dynamically based on row_order and indent_level.
    E.g. 1, 1.1, 1.1.1, 1.2, 2, 2.1
    """
    counters = []  # Stack of numbers for each indent level
    for task in tasks:
        level = task.indent_level
        
        # Adjust counter stack to match task's indent level
        while len(counters) <= level:
            counters.append(0)
        while len(counters) > level + 1:
            counters.pop()
            
        counters[level] += 1
        task.wbs_code = ".".join(map(str, counters[:level + 1]))

def get_hierarchy_maps(tasks: List[ProjectMilestone]) -> Tuple[Dict[int, List[int]], Dict[int, int]]:
    """
    Build maps representing the parent-child relationships:
    - parent_to_children: maps parent_id -> list of child_ids
    - child_to_parent: maps child_id -> parent_id
    """
    parent_to_children = {}
    child_to_parent = {}
    
    # Check if any task has parent_id set. If so, build map from parent_id values.
    # Otherwise fallback to stack tracing on indent_level.
    has_parent_id = any(t.parent_id is not None for t in tasks)
    
    if has_parent_id:
        for task in tasks:
            if task.parent_id is not None:
                parent_to_children.setdefault(task.parent_id, []).append(task.id)
                child_to_parent[task.id] = task.parent_id
    else:
        # We trace parents using a stack of (task_id, indent_level)
        stack = []
        for task in tasks:
            # Pop from stack until we find a potential parent (lower indent level)
            while stack and stack[-1][1] >= task.indent_level:
                stack.pop()
                
            if stack:
                parent_id = stack[-1][0]
                parent_to_children.setdefault(parent_id, []).append(task.id)
                child_to_parent[task.id] = parent_id
                
            stack.append((task.id, task.indent_level))
        
    return parent_to_children, child_to_parent

def get_status_from_progress_and_dates(complete_percent: float, start_date: datetime, end_date: datetime, current_status: str) -> str:
    if current_status in ("Cancelled", "On Hold"):
        return current_status
    if complete_percent >= 100.0:
        return "Completed"
    
    now = datetime.utcnow()
    now = datetime(now.year, now.month, now.day)
    start = datetime(start_date.year, start_date.month, start_date.day) if start_date else None
    end = datetime(end_date.year, end_date.month, end_date.day) if end_date else None
    
    if complete_percent > 0.0:
        if end and now > end:
            return "Delayed"
        return "In Progress"
        
    if start and now > start:
        return "Delayed"
    if start and now >= (start - timedelta(days=7)):
        return "Upcoming"
    return "Not Started"

def rollup_parent_nodes(
    tasks_dict: Dict[int, ProjectMilestone],
    parent_to_children: Dict[int, List[int]]
):
    """
    Rolls up dates, completion percentage, and status from child nodes to parents.
    Performs bottom-up WBS traversal.
    """
    # Find leaf nodes vs. parent nodes
    all_parent_ids = set(parent_to_children.keys())
    
    # We want to process parents from deepest level to root level.
    # To do this, we can order parents by their maximum depth in parent_to_children tree
    def get_parent_depth(pid, memo={}):
        if pid in memo:
            return memo[pid]
        children = parent_to_children.get(pid, [])
        sub_parents = [c for c in children if c in all_parent_ids]
        if not sub_parents:
            depth = 1
        else:
            depth = 1 + max(get_parent_depth(sp) for sp in sub_parents)
        memo[pid] = depth
        return depth

    parent_depths = {pid: get_parent_depth(pid) for pid in all_parent_ids}
    sorted_parents = sorted(all_parent_ids, key=lambda p: parent_depths[p], reverse=False) # Deepest parents first

    for parent_id in sorted_parents:
        parent = tasks_dict[parent_id]
        child_ids = parent_to_children[parent_id]
        children = [tasks_dict[cid] for cid in child_ids]
        
        # 1. Planned Start & End
        valid_starts = [c.start_date for c in children if c.start_date]
        valid_ends = [c.end_date for c in children if c.end_date]
        parent.start_date = min(valid_starts) if valid_starts else None
        parent.end_date = max(valid_ends) if valid_ends else None
        
        # 2. Actual Start & End
        valid_act_starts = [c.actual_start for c in children if c.actual_start]
        parent.actual_start = min(valid_act_starts) if valid_act_starts else None
        
        all_children_completed = len(children) > 0 and all(c.status == "Completed" for c in children)
        valid_act_ends = [c.actual_end for c in children if c.actual_end]
        if all_children_completed and valid_act_ends:
            parent.actual_end = max(valid_act_ends)
        else:
            parent.actual_end = None
            
        # 3. Complete Percent (Duration-weighted rollup)
        total_duration_days = 0.0
        weighted_completeness = 0.0
        
        for c in children:
            if c.start_date and c.end_date:
                dur = max((c.end_date - c.start_date).days, 1)  # min 1 day duration for rollup weighting
            else:
                dur = 1
            total_duration_days += dur
            weighted_completeness += dur * c.complete_percent
            
        if total_duration_days > 0:
            parent.complete_percent = round(weighted_completeness / total_duration_days, 2)
        else:
            parent.complete_percent = 0.0
            
        # 4. Status
        parent.status = get_status_from_progress_and_dates(
            parent.complete_percent, parent.start_date, parent.end_date, parent.status
        )

def run_critical_path_method(
    tasks: List[ProjectMilestone],
    dependencies: List[ProjectDependency],
    project_start_date: datetime,
    all_parent_ids: Set[int] = None
) -> List[ProjectMilestone]:
    """
    Computes Early Start (ES), Early Finish (EF), Late Start (LS), Late Finish (LF),
    Float, and determines if each task is on the Critical Path.
    """
    if not tasks:
        return []
        
    tasks_dict = {t.id: t for t in tasks}
    
    # 1. Build Dependency Graphs (Adjacency List)
    # Successor lists: predecessor_id -> list of (successor_id, dep_type, lag_days)
    successors_graph = {t.id: [] for t in tasks}
    predecessors_graph = {t.id: [] for t in tasks}
    in_degrees = {t.id: 0 for t in tasks}
    
    for dep in dependencies:
        if dep.predecessor_task_id in successors_graph and dep.successor_task_id in predecessors_graph:
            successors_graph[dep.predecessor_task_id].append((dep.successor_task_id, dep.type, dep.lag_days))
            predecessors_graph[dep.successor_task_id].append((dep.predecessor_task_id, dep.type, dep.lag_days))
            in_degrees[dep.successor_task_id] += 1
            
    # 2. Topological Sort (Kahn's Algorithm to check for cycles)
    queue = [tid for tid, degree in in_degrees.items() if degree == 0]
    topo_order = []
    
    while queue:
        u = queue.pop(0)
        topo_order.append(u)
        for v, _, _ in successors_graph[u]:
            in_degrees[v] -= 1
            if in_degrees[v] == 0:
                queue.append(v)
                
    if len(topo_order) != len(tasks):
        raise HTTPException(
            status_code=400,
            detail="Cyclic dependency detected! Please review and fix circular task links."
        )
        
    # 3. Forward Pass: Calculate Early Start (ES) and Early Finish (EF)
    early_start = {}
    early_finish = {}
    
    for tid in topo_order:
        task = tasks_dict[tid]
        
        # Calculate duration
        duration = 0
        if task.start_date and task.end_date:
            duration = max((task.end_date - task.start_date).days, 0)
            
        preds = predecessors_graph[tid]
        if not preds:
            # No predecessors: starts at project start date
            es = project_start_date
        else:
            es_candidates = []
            for pred_id, dep_type, lag in preds:
                pred_es = early_start.get(pred_id, project_start_date)
                pred_ef = early_finish.get(pred_id, project_start_date)
                
                # FS: Finish-to-Start (Successor start = Predecessor finish + lag)
                if dep_type == "FS":
                    es_candidates.append(pred_ef + timedelta(days=lag))
                # SS: Start-to-Start (Successor start = Predecessor start + lag)
                elif dep_type == "SS":
                    es_candidates.append(pred_es + timedelta(days=lag))
                # FF: Finish-to-Finish (Successor finish = Predecessor finish + lag) => start = finish - dur
                elif dep_type == "FF":
                    es_candidates.append(pred_ef + timedelta(days=lag) - timedelta(days=duration))
                # SF: Start-to-Finish (Successor finish = Predecessor start + lag) => start = finish - dur
                elif dep_type == "SF":
                    es_candidates.append(pred_es + timedelta(days=lag) - timedelta(days=duration))
                    
            es = max(es_candidates)
            
        early_start[tid] = es
        early_finish[tid] = es + timedelta(days=duration)
        
        # Write back early schedule as default if dates are computed
        # Note: We only overwrite planned schedule dates if dependency shifts them.
        is_parent = (all_parent_ids and task.id in all_parent_ids) or (task.item_type == "Phase")
        if not is_parent:
            task.start_date = es
            task.end_date = es + timedelta(days=duration)

    # 4. Backward Pass: Calculate Late Start (LS) and Late Finish (LF)
    late_start = {}
    late_finish = {}
    
    # Project end date is the maximum EF date computed in Forward Pass
    project_end_date = max(early_finish.values()) if early_finish else project_start_date
    
    for tid in reversed(topo_order):
        task = tasks_dict[tid]
        duration = 0
        if task.start_date and task.end_date:
            duration = max((task.end_date - task.start_date).days, 0)
            
        succs = successors_graph[tid]
        if not succs:
            # End of network: late finish is project end date
            lf = project_end_date
        else:
            lf_candidates = []
            for succ_id, dep_type, lag in succs:
                succ_ls = late_start.get(succ_id, project_end_date)
                succ_lf = late_finish.get(succ_id, project_end_date)
                
                # FS: successor_start = predecessor_finish + lag => predecessor_finish = successor_start - lag
                if dep_type == "FS":
                    lf_candidates.append(succ_ls - timedelta(days=lag))
                # SS: successor_start = predecessor_start + lag => predecessor_start = successor_start - lag => finish = start + dur
                elif dep_type == "SS":
                    lf_candidates.append(succ_ls - timedelta(days=lag) + timedelta(days=duration))
                # FF: successor_finish = predecessor_finish + lag => predecessor_finish = successor_finish - lag
                elif dep_type == "FF":
                    lf_candidates.append(succ_lf - timedelta(days=lag))
                # SF: successor_finish = predecessor_start + lag => predecessor_start = successor_finish - lag => finish = start + dur
                elif dep_type == "SF":
                    lf_candidates.append(succ_lf - timedelta(days=lag) + timedelta(days=duration))
                    
            lf = min(lf_candidates)
            
        late_finish[tid] = lf
        late_start[tid] = lf - timedelta(days=duration)
        
        # 5. Calculate Float & Critical Path
        total_float = (late_finish[tid] - early_finish[tid]).days
        task.total_float_days = float(total_float)
        task.is_critical = total_float <= 0

    return tasks

def recalculate_project_schedule(db: Session, project_id: str):
    """
    Main orchestrator for WBS numbering, Rollups, and Critical Path Calculations.
    """
    # Fetch Project start date as root baseline date
    project = db.query(Project).filter(Project.project_id == project_id).first()
    project_start = project.start_date if (project and project.start_date) else datetime.utcnow()

    # Fetch milestones sorted by row_order
    tasks = db.query(ProjectMilestone).filter(ProjectMilestone.project_id == project_id).order_by(ProjectMilestone.row_order.asc()).all()
    if not tasks:
        return []

    # Fetch dependencies
    dependencies = db.query(ProjectDependency).filter(ProjectDependency.project_id == project_id).all()
    
    # 1. Update WBS numbering
    calculate_wbs_codes(tasks)
    
    # Build hierarchy maps first to identify all parent IDs
    parent_to_children, _ = get_hierarchy_maps(tasks)
    all_parent_ids = set(parent_to_children.keys())
    
    # 2. Compute dependencies using CPM (Forward/Backward passes)
    run_critical_path_method(tasks, dependencies, project_start, all_parent_ids)
    
    # 3. Perform parent rollup bottom-up
    tasks_dict = {t.id: t for t in tasks}
    
    # Apply leaf task rules: resource-weighted complete_percent and automatic status
    for task in tasks:
        is_parent = task.id in all_parent_ids or task.item_type == "Phase"
        if not is_parent:
            custom_vals = task.custom_values or {}
            is_manual = custom_vals.get("manual_completion_override", False)
            assigned_to_list = task.assigned_to
            if not is_manual and assigned_to_list:
                total_weight = 0.0
                weighted_prog = 0.0
                resource_weights = custom_vals.get("resource_weights", {})
                resource_progress = custom_vals.get("resource_progress", {})
                for uid in assigned_to_list:
                    w = float(resource_weights.get(str(uid), 1.0))
                    p = float(resource_progress.get(str(uid), 0.0))
                    total_weight += w
                    weighted_prog += w * p
                task.complete_percent = round(weighted_prog / total_weight, 2) if total_weight > 0 else 0.0
            
            task.status = get_status_from_progress_and_dates(
                task.complete_percent, task.start_date, task.end_date, task.status
            )

    rollup_parent_nodes(tasks_dict, parent_to_children)
    
    # Commit changes
    db.commit()
    return tasks
