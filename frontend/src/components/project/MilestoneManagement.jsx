import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, Trash2, ChevronRight, ChevronDown, AlignLeft, 
  ZoomIn, ZoomOut, AlertTriangle, Calendar, Users, 
  CheckCircle, RefreshCw, Save, FolderPlus, Layers,
  ChevronUp, User, LayoutGrid, CheckSquare, Square, Eye, Sparkles, X,
  Settings
} from 'lucide-react';
import API from '../../utils/api';
import { getEmployees } from '../../utils/employeeApi';
import { toast } from 'react-hot-toast';

const recalculateParentIds = (tasksList) => {
  const stack = [];
  return tasksList.map(task => {
    // Pop from stack until we find a potential parent (lower indent level)
    while (stack.length > 0 && stack[stack.length - 1].indent_level >= task.indent_level) {
      stack.pop();
    }
    
    let parent_id = null;
    if (stack.length > 0) {
      parent_id = stack[stack.length - 1].id;
    }
    
    stack.push({ id: task.id, indent_level: task.indent_level });
    
    return {
      ...task,
      parent_id
    };
  });
};
const sortTasksHierarchically = (allTasks) => {
  const parentToChildren = {};
  const roots = [];

  allTasks.forEach(task => {
    if (task.parent_id) {
      parentToChildren[task.parent_id] = parentToChildren[task.parent_id] || [];
      parentToChildren[task.parent_id].push(task);
    } else {
      roots.push(task);
    }
  });

  // Sort roots by row_order
  roots.sort((a, b) => (a.row_order || 0) - (b.row_order || 0));

  // Sort children by row_order
  Object.keys(parentToChildren).forEach(parentId => {
    parentToChildren[parentId].sort((a, b) => (a.row_order || 0) - (b.row_order || 0));
  });

  const result = [];
  const traverse = (node) => {
    result.push(node);
    const children = parentToChildren[node.id];
    if (children) {
      children.forEach(child => traverse(child));
    }
  };

  roots.forEach(root => traverse(root));

  // For any tasks that might have been left out (e.g. parent_id refers to non-existent task)
  allTasks.forEach(task => {
    if (!result.find(r => r.id === task.id)) {
      result.push(task);
    }
  });

  return result;
};

const runClientCPM = (allTasks, deps, projectStartDate) => {
  if (!allTasks || allTasks.length === 0) return allTasks;

  // 1. Build map of tasks
  const tasksMap = {};
  allTasks.forEach(t => {
    tasksMap[t.id] = { ...t };
  });

  // 2. Identify parents
  const parentToChildren = {};
  allTasks.forEach(t => {
    if (t.parent_id) {
      parentToChildren[t.parent_id] = parentToChildren[t.parent_id] || [];
      parentToChildren[t.parent_id].push(t.id);
    }
  });
  const allParentIds = new Set(Object.keys(parentToChildren).map(Number));

  // 3. Build Adjacency List for CPM (only for leaf tasks, since parents are rolled up)
  const successors = {};
  const predecessors = {};
  const inDegrees = {};
  
  allTasks.forEach(t => {
    successors[t.id] = [];
    predecessors[t.id] = [];
    inDegrees[t.id] = 0;
  });

  deps.forEach(dep => {
    const pId = dep.predecessor_task_id;
    const sId = dep.successor_task_id;
    if (successors[pId] && successors[sId]) {
      successors[pId].push({ successorId: sId, type: dep.type, lag: dep.lag_days });
      predecessors[sId].push({ predecessorId: pId, type: dep.type, lag: dep.lag_days });
      inDegrees[sId]++;
    }
  });

  // Topological Sort (Kahn's Algorithm)
  const queue = [];
  allTasks.forEach(t => {
    if (inDegrees[t.id] === 0) queue.push(t.id);
  });

  const topoOrder = [];
  while (queue.length > 0) {
    const u = queue.shift();
    topoOrder.push(u);
    successors[u].forEach(edge => {
      inDegrees[edge.successorId]--;
      if (inDegrees[edge.successorId] === 0) {
        queue.push(edge.successorId);
      }
    });
  }

  if (topoOrder.length !== allTasks.length) {
    console.warn("Cycle detected in client-side scheduling! Skipping auto-schedule.");
    return allTasks;
  }

  // Forward Pass
  const earlyStart = {};
  const earlyFinish = {};
  const projStart = new Date(projectStartDate || new Date());

  topoOrder.forEach(tid => {
    const task = tasksMap[tid];
    const isParent = allParentIds.has(tid) || task.item_type === 'Phase';
    
    let duration = 0;
    if (task.start_date && task.end_date) {
      duration = Math.max(0, Math.ceil((new Date(task.end_date) - new Date(task.start_date)) / 86400000));
    }

    const preds = predecessors[tid];
    let es = new Date(task.start_date || projStart);

    if (preds && preds.length > 0 && !isParent) {
      const candidates = preds.map(edge => {
        const predES = earlyStart[edge.predecessorId] || projStart;
        const predEF = earlyFinish[edge.predecessorId] || projStart;
        
        let cES = new Date(predEF);
        if (edge.type === 'FS') {
          cES = new Date(predEF.getTime() + edge.lag * 86400000);
        } else if (edge.type === 'SS') {
          cES = new Date(predES.getTime() + edge.lag * 86400000);
        } else if (edge.type === 'FF') {
          cES = new Date(predEF.getTime() + edge.lag * 86400000 - duration * 86400000);
        } else if (edge.type === 'SF') {
          cES = new Date(predES.getTime() + edge.lag * 86400000 - duration * 86400000);
        }
        return cES;
      });
      es = new Date(Math.max(...candidates.map(c => c.getTime())));
    }

    earlyStart[tid] = es;
    earlyFinish[tid] = new Date(es.getTime() + duration * 86400000);

    if (!isParent) {
      task.start_date = es.toISOString();
      task.end_date = earlyFinish[tid].toISOString();
    }
  });

  return Object.values(tasksMap);
};

const rollupParentTasks = (allTasks) => {
  // 1. Recalculate parent_id based on indent level sequence
  const tasksWithParents = recalculateParentIds(allTasks);

  // 2. Build parent-to-children mapping
  const parentToChildren = {};
  tasksWithParents.forEach(t => {
    if (t.parent_id) {
      parentToChildren[t.parent_id] = parentToChildren[t.parent_id] || [];
      parentToChildren[t.parent_id].push(t);
    }
  });

  // 3. Rollup bottom-up (deepest indent level first)
  const taskMap = {};
  tasksWithParents.forEach(t => {
    taskMap[t.id] = { ...t };
  });

  const parentIds = Object.keys(parentToChildren);
  parentIds.sort((a, b) => {
    const taskA = taskMap[a];
    const taskB = taskMap[b];
    return (taskB?.indent_level || 0) - (taskA?.indent_level || 0);
  });

  const getStatusFromProgressAndDates = (completePercent, startDate, endDate, statusVal) => {
    if (statusVal === 'Cancelled' || statusVal === 'On Hold') return statusVal;
    if (completePercent >= 100) return 'Completed';
    const now = new Date();
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (completePercent > 0) {
      if (end && now > end) return 'Delayed';
      return 'In Progress';
    }
    // completePercent == 0
    if (start && now > start) return 'Delayed';
    if (start && now >= new Date(start.getTime() - 7 * 86400000)) return 'Upcoming';
    return 'Not Started';
  };

  parentIds.forEach(pid => {
    const parent = taskMap[pid];
    if (!parent) return;
    
    const children = parentToChildren[pid].map(c => taskMap[c.id]).filter(Boolean);
    if (children.length > 0) {
      // Rollup Planned Start & End
      const validStarts = children.map(c => c.start_date).filter(Boolean).map(d => new Date(d));
      const validEnds = children.map(c => c.end_date).filter(Boolean).map(d => new Date(d));
      if (validStarts.length > 0) parent.start_date = new Date(Math.min(...validStarts)).toISOString();
      if (validEnds.length > 0) parent.end_date = new Date(Math.max(...validEnds)).toISOString();

      // Rollup Actual Start & End
      const validActStarts = children.map(c => c.actual_start).filter(Boolean).map(d => new Date(d));
      if (validActStarts.length > 0) parent.actual_start = new Date(Math.min(...validActStarts)).toISOString();
      else parent.actual_start = null;

      const allChildrenCompleted = children.every(c => c.status === 'Completed');
      const validActEnds = children.map(c => c.actual_end).filter(Boolean).map(d => new Date(d));
      if (allChildrenCompleted && validActEnds.length > 0) {
        parent.actual_end = new Date(Math.max(...validActEnds)).toISOString();
      } else {
        parent.actual_end = null;
      }

      // Rollup Complete Percent (Duration-weighted)
      let totalDuration = 0;
      let weightedCompleteness = 0;
      children.forEach(c => {
        let dur = 1;
        if (c.start_date && c.end_date) {
          dur = Math.max(1, Math.ceil((new Date(c.end_date) - new Date(c.start_date)) / 86400000));
        }
        totalDuration += dur;
        weightedCompleteness += dur * (c.complete_percent || 0);
      });
      parent.complete_percent = totalDuration > 0 ? Math.round(weightedCompleteness / totalDuration) : 0;

      // Rollup Status
      parent.status = getStatusFromProgressAndDates(parent.complete_percent, parent.start_date, parent.end_date, parent.status);
    }
  });

  // Also apply automatic status and resource-weighted progress to all leaf tasks!
  tasksWithParents.forEach(t => {
    const isLeaf = !parentToChildren[t.id] || parentToChildren[t.id].length === 0;
    if (isLeaf) {
      const task = taskMap[t.id];
      const isManual = task.custom_values?.manual_completion_override || false;
      if (!isManual && task.assigned_to && task.assigned_to.length > 0) {
        let totalWeight = 0;
        let weightedProg = 0;
        task.assigned_to.forEach(uid => {
          const w = task.custom_values?.resource_weights?.[uid] !== undefined ? parseFloat(task.custom_values.resource_weights[uid]) : 1;
          const p = task.custom_values?.resource_progress?.[uid] !== undefined ? parseFloat(task.custom_values.resource_progress[uid]) : 0;
          totalWeight += w;
          weightedProg += w * p;
        });
        task.complete_percent = totalWeight > 0 ? Math.round(weightedProg / totalWeight) : 0;
      }

      // Resolve status based on dates and complete_percent
      task.status = getStatusFromProgressAndDates(task.complete_percent, task.start_date, task.end_date, task.status);
    }
  });

  return tasksWithParents.map(t => taskMap[t.id]);
};

const MilestoneManagement = ({ project, showNotification }) => {
  const [tasks, setTasks] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [customColumns, setCustomColumns] = useState([]);
  const [releases, setReleases] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projectTeam, setProjectTeam] = useState([]);
  const [activeParentTask, setActiveParentTask] = useState(null);
  const [activeAssignTask, setActiveAssignTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Gantt Scale & Zoom
  const [zoomLevel, setZoomLevel] = useState('Week'); // Day, Week, Month
  const [timelineStart, setTimelineStart] = useState(new Date());
  const [timelineEnd, setTimelineEnd] = useState(new Date());

  // Scroll Sync Refs & State
  const gridRef = useRef(null);
  const ganttRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [clientHeight, setClientHeight] = useState(800);

  // Split pane layout width
  const [tableWidth, setTableWidth] = useState(650);
  const isResizing = useRef(false);

  // Active view tabs
  const [activeSubTab, setActiveSubTab] = useState('gantt'); 
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);

  // Dynamic Column Creator Modal
  const [showAddColModal, setShowAddColModal] = useState(false);
  const [newColName, setNewColName] = useState('');
  const [newColLabel, setNewColLabel] = useState('');
  const [newColType, setNewColType] = useState('text');
  const [newColOptions, setNewColOptions] = useState('');

  // Follow-ups modal
  const [editingFollowupTaskId, setEditingFollowupTaskId] = useState(null);
  const [followupDate, setFollowupDate] = useState('');
  const [followupOwner, setFollowupOwner] = useState('');
  const [followupNotes, setFollowupNotes] = useState('');

  // Selected row
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Progress logs state
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logPercent, setLogPercent] = useState(0);
  const [logNotes, setLogNotes] = useState('');

  useEffect(() => {
    if (selectedTaskId !== null) {
      const task = tasks.find(t => t.id === selectedTaskId);
      if (task) {
        setLogPercent(task.complete_percent || 0);
        setLogNotes('');
        setLogDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [selectedTaskId, tasks]);

  // Baseline management
  const [baselineVersion, setBaselineVersion] = useState('Baseline_V1');
  const [showBaselineOverlay, setShowBaselineOverlay] = useState(true);

  // Settings Modal States
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showGantt, setShowGantt] = useState(true);
  const [showDataGrid, setShowDataGrid] = useState(true);
  const [showTodayLine, setShowTodayLine] = useState(true);
  const [showNonWorkingDayShading, setShowNonWorkingDayShading] = useState(true);
  const [showOverdueTaskShading, setShowOverdueTaskShading] = useState(true);
  const [showOverAllocationMessage, setShowOverAllocationMessage] = useState(true);
  const [showSummaryDeleteMessage, setShowSummaryDeleteMessage] = useState(true);
  const [ganttShowTaskName, setGanttShowTaskName] = useState(true);
  const [ganttShowPercent, setGanttShowPercent] = useState(true);
  const [ganttShowAssignee, setGanttShowAssignee] = useState(true);
  const [showDataType, setShowDataType] = useState('Planned');

  // Temporary Settings Modal States
  const [tempShowGantt, setTempShowGantt] = useState(true);
  const [tempShowDataGrid, setTempShowDataGrid] = useState(true);
  const [tempShowTodayLine, setTempShowTodayLine] = useState(true);
  const [tempShowNonWorkingDayShading, setTempShowNonWorkingDayShading] = useState(true);
  const [tempShowOverdueTaskShading, setTempShowOverdueTaskShading] = useState(true);
  const [tempShowOverAllocationMessage, setTempShowOverAllocationMessage] = useState(true);
  const [tempShowSummaryDeleteMessage, setTempShowSummaryDeleteMessage] = useState(true);
  const [tempGanttShowTaskName, setTempGanttShowTaskName] = useState(true);
  const [tempGanttShowPercent, setTempGanttShowPercent] = useState(true);
  const [tempGanttShowAssignee, setTempGanttShowAssignee] = useState(true);
  const [tempShowDataType, setTempShowDataType] = useState('Planned');
  const [tempSetBaselineChecked, setTempSetBaselineChecked] = useState(false);

  // Row height matching dense MS Project layout
  const rowHeight = 38;

  useEffect(() => {
    fetchInitialData();
  }, [project.project_id]);

  // Grid scrollwheel event delegation to sync scroll vertically when grid y-scroll is hidden
  useEffect(() => {
    const gridEl = gridRef.current;
    if (!gridEl) return;

    const handleWheel = (e) => {
      if (showGantt && e.deltaY !== 0 && ganttRef.current) {
        ganttRef.current.scrollTop += e.deltaY;
        e.preventDefault();
      }
    };

    gridEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      gridEl.removeEventListener('wheel', handleWheel);
    };
  }, [showGantt]);

  const openSettingsModal = () => {
    setTempShowGantt(showGantt);
    setTempShowDataGrid(showDataGrid);
    setTempShowTodayLine(showTodayLine);
    setTempShowNonWorkingDayShading(showNonWorkingDayShading);
    setTempShowOverdueTaskShading(showOverdueTaskShading);
    setTempShowOverAllocationMessage(showOverAllocationMessage);
    setTempShowSummaryDeleteMessage(showSummaryDeleteMessage);
    setTempGanttShowTaskName(ganttShowTaskName);
    setTempGanttShowPercent(ganttShowPercent);
    setTempGanttShowAssignee(ganttShowAssignee);
    setTempShowDataType(showDataType);
    setTempSetBaselineChecked(false);
    setShowSettingsModal(true);
  };

  const handleSaveSettings = async () => {
    setShowGantt(tempShowGantt);
    setShowDataGrid(tempShowDataGrid);
    setShowTodayLine(tempShowTodayLine);
    setShowNonWorkingDayShading(tempShowNonWorkingDayShading);
    setShowOverdueTaskShading(tempShowOverdueTaskShading);
    setShowOverAllocationMessage(tempShowOverAllocationMessage);
    setShowSummaryDeleteMessage(tempShowSummaryDeleteMessage);
    setGanttShowTaskName(tempGanttShowTaskName);
    setGanttShowPercent(tempGanttShowPercent);
    setGanttShowAssignee(tempGanttShowAssignee);
    setShowDataType(tempShowDataType);
    setShowSettingsModal(false);

    if (tempSetBaselineChecked) {
      await handleCreateBaseline();
    }
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const mRes = await API.get(`/projects/${project.project_id}/milestones`);
      const fetchedTasks = mRes.data || [];
      
      const deps = [];
      fetchedTasks.forEach(task => {
        if (task.dependencies_as_successor) {
          task.dependencies_as_successor.forEach(d => {
            deps.push({
              predecessor_task_id: d.predecessor_task_id,
              successor_task_id: d.successor_task_id,
              type: d.type,
              lag_days: d.lag_days
            });
          });
        }
      });
      setDependencies(deps);

      const tasksWithParents = recalculateParentIds(fetchedTasks);
      const scheduled = runClientCPM(tasksWithParents, deps, project.start_date);
      const rolled = rollupParentTasks(scheduled);
      setTasks(rolled);

      const cRes = await API.get(`/projects/${project.project_id}/milestones/columns`);
      setCustomColumns(cRes.data || []);

      const rRes = await API.get(`/projects/${project.project_id}/releases`);
      setReleases(rRes.data || []);

      const empRes = await getEmployees();
      setEmployees(empRes.data || []);

      try {
        const teamRes = await API.get(`/projects/${project.project_id}/team`);
        setProjectTeam(teamRes.data || []);
      } catch (teamError) {
        console.error("Failed to load project team:", teamError);
      }

      calculateTimelineRange(rolled);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load milestone data');
    } finally {
      setLoading(false);
    }
  };

  const calculateTimelineRange = (tasksList) => {
    if (!tasksList || tasksList.length === 0) {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      const end = new Date();
      end.setDate(end.getDate() + 90);
      setTimelineStart(start);
      setTimelineEnd(end);
      return;
    }

    let minDate = null;
    let maxDate = null;

    tasksList.forEach(t => {
      // Planned Start / End
      if (t.start_date) {
        const d = new Date(t.start_date);
        if (!minDate || d < minDate) minDate = d;
      }
      if (t.end_date) {
        const d = new Date(t.end_date);
        if (!maxDate || d > maxDate) maxDate = d;
      }

      // Actual Start / End
      if (t.actual_start) {
        const d = new Date(t.actual_start);
        if (!minDate || d < minDate) minDate = d;
      }
      if (t.actual_end) {
        const d = new Date(t.actual_end);
        if (!maxDate || d > maxDate) maxDate = d;
      }

      // Baseline Start / End
      if (t.baselines && t.baselines.length > 0) {
        t.baselines.forEach(b => {
          if (b.baseline_start) {
            const d = new Date(b.baseline_start);
            if (!minDate || d < minDate) minDate = d;
          }
          if (b.baseline_end) {
            const d = new Date(b.baseline_end);
            if (!maxDate || d > maxDate) maxDate = d;
          }
        });
      }
    });

    if (!minDate) minDate = new Date();
    if (!maxDate) {
      maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 90);
    }

    const startPadding = new Date(minDate);
    startPadding.setDate(startPadding.getDate() - 14);
    const endPadding = new Date(maxDate);
    endPadding.setDate(endPadding.getDate() + 45);

    setTimelineStart(startPadding);
    setTimelineEnd(endPadding);
  };

  const pxPerDay = useMemo(() => {
    if (zoomLevel === 'Day') return 24;
    if (zoomLevel === 'Week') return 8;
    return 2.5; 
  }, [zoomLevel]);

  const daysBetween = useMemo(() => {
    return Math.ceil((timelineEnd - timelineStart) / (1000 * 60 * 60 * 24)) || 1;
  }, [timelineStart, timelineEnd]);

  // Today line horizontal left offset position
  const todayLeft = useMemo(() => {
    const today = new Date();
    if (today < timelineStart || today > timelineEnd) return null;
    const daysOffset = (today - timelineStart) / (1000 * 60 * 60 * 24);
    return daysOffset * pxPerDay;
  }, [timelineStart, timelineEnd, pxPerDay]);

  const timelineWidth = useMemo(() => {
    return daysBetween * pxPerDay;
  }, [daysBetween, pxPerDay]);

  const timelineHeaders = useMemo(() => {
    const topHeaders = [];
    const bottomHeaders = [];

    if (zoomLevel === 'Day') {
      let currentMonthStartIdx = 0;
      let currentMonthLabel = '';
      let daysInGroup = 0;

      for (let i = 0; i < daysBetween; i++) {
        const date = new Date(timelineStart);
        date.setDate(date.getDate() + i);

        const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const dayLabel = String(date.getDate());

        bottomHeaders.push({
          key: `b-${i}`,
          left: i * pxPerDay,
          width: pxPerDay,
          label: dayLabel,
          title: date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }),
          className: "border-l border-[var(--border-subtle)]/40 justify-center text-[8px]"
        });

        if (i === 0) {
          currentMonthLabel = monthLabel;
          currentMonthStartIdx = 0;
          daysInGroup = 1;
        } else if (monthLabel === currentMonthLabel) {
          daysInGroup++;
        } else {
          topHeaders.push({
            key: `t-${currentMonthStartIdx}`,
            left: currentMonthStartIdx * pxPerDay,
            width: daysInGroup * pxPerDay,
            label: currentMonthLabel,
          });
          currentMonthLabel = monthLabel;
          currentMonthStartIdx = i;
          daysInGroup = 1;
        }
      }
      if (daysInGroup > 0) {
        topHeaders.push({
          key: `t-${currentMonthStartIdx}`,
          left: currentMonthStartIdx * pxPerDay,
          width: daysInGroup * pxPerDay,
          label: currentMonthLabel,
        });
      }

    } else if (zoomLevel === 'Week') {
      let currentMonthStartIdx = 0;
      let currentMonthLabel = '';
      let daysInGroup = 0;

      let lastWeekStartIdx = 0;
      for (let i = 0; i < daysBetween; i++) {
        const date = new Date(timelineStart);
        date.setDate(date.getDate() + i);

        const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const isWeekStart = date.getDay() === 1 || i === 0;

        if (isWeekStart && i > 0) {
          const weekStartDate = new Date(timelineStart);
          weekStartDate.setDate(weekStartDate.getDate() + lastWeekStartIdx);
          bottomHeaders.push({
            key: `b-${lastWeekStartIdx}`,
            left: lastWeekStartIdx * pxPerDay,
            width: (i - lastWeekStartIdx) * pxPerDay,
            label: `${weekStartDate.getDate()} ${weekStartDate.toLocaleDateString('en-US', { month: 'short' })}`,
            title: `Week Commencing: ${weekStartDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}`,
            className: "border-l border-[var(--border-subtle)]/40 px-1 justify-start font-semibold text-[8px]"
          });
          lastWeekStartIdx = i;
        }

        if (i === 0) {
          currentMonthLabel = monthLabel;
          currentMonthStartIdx = 0;
          daysInGroup = 1;
        } else if (monthLabel === currentMonthLabel) {
          daysInGroup++;
        } else {
          topHeaders.push({
            key: `t-${currentMonthStartIdx}`,
            left: currentMonthStartIdx * pxPerDay,
            width: daysInGroup * pxPerDay,
            label: currentMonthLabel,
          });
          currentMonthLabel = monthLabel;
          currentMonthStartIdx = i;
          daysInGroup = 1;
        }
      }

      if (lastWeekStartIdx < daysBetween) {
        const weekStartDate = new Date(timelineStart);
        weekStartDate.setDate(weekStartDate.getDate() + lastWeekStartIdx);
        bottomHeaders.push({
          key: `b-${lastWeekStartIdx}`,
          left: lastWeekStartIdx * pxPerDay,
          width: (daysBetween - lastWeekStartIdx) * pxPerDay,
          label: `${weekStartDate.getDate()} ${weekStartDate.toLocaleDateString('en-US', { month: 'short' })}`,
          title: `Week Commencing: ${weekStartDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}`,
          className: "border-l border-[var(--border-subtle)]/40 px-1 justify-start font-semibold text-[8px]"
        });
      }

      if (daysInGroup > 0) {
        topHeaders.push({
          key: `t-${currentMonthStartIdx}`,
          left: currentMonthStartIdx * pxPerDay,
          width: daysInGroup * pxPerDay,
          label: currentMonthLabel,
        });
      }

    } else if (zoomLevel === 'Month') {
      let currentYearStartIdx = 0;
      let currentYearLabel = '';
      let daysInYearGroup = 0;

      let lastMonthStartIdx = 0;
      let lastMonthLabel = '';

      for (let i = 0; i < daysBetween; i++) {
        const date = new Date(timelineStart);
        date.setDate(date.getDate() + i);

        const yearLabel = String(date.getFullYear());
        const monthName = date.toLocaleDateString('en-US', { month: 'long' });
        const isMonthStart = date.getDate() === 1 || i === 0;

        if (isMonthStart && i > 0) {
          const monthStartDate = new Date(timelineStart);
          monthStartDate.setDate(monthStartDate.getDate() + lastMonthStartIdx);
          bottomHeaders.push({
            key: `b-${lastMonthStartIdx}`,
            left: lastMonthStartIdx * pxPerDay,
            width: (i - lastMonthStartIdx) * pxPerDay,
            label: lastMonthLabel,
            title: monthStartDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            className: "border-l border-[var(--border-subtle)]/40 px-1 justify-center font-bold text-[9px]"
          });
          lastMonthStartIdx = i;
          lastMonthLabel = monthName;
        } else if (i === 0) {
          lastMonthLabel = monthName;
        }

        if (i === 0) {
          currentYearLabel = yearLabel;
          currentYearStartIdx = 0;
          daysInYearGroup = 1;
        } else if (yearLabel === currentYearLabel) {
          daysInYearGroup++;
        } else {
          topHeaders.push({
            key: `t-${currentYearStartIdx}`,
            left: currentYearStartIdx * pxPerDay,
            width: daysInYearGroup * pxPerDay,
            label: currentYearLabel,
          });
          currentYearLabel = yearLabel;
          currentYearStartIdx = i;
          daysInYearGroup = 1;
        }
      }

      if (lastMonthStartIdx < daysBetween) {
        const monthStartDate = new Date(timelineStart);
        monthStartDate.setDate(monthStartDate.getDate() + lastMonthStartIdx);
        bottomHeaders.push({
          key: `b-${lastMonthStartIdx}`,
          left: lastMonthStartIdx * pxPerDay,
          width: (daysBetween - lastMonthStartIdx) * pxPerDay,
          label: lastMonthLabel,
          title: monthStartDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          className: "border-l border-[var(--border-subtle)]/40 px-1 justify-center font-bold text-[9px]"
        });
      }

      if (daysInYearGroup > 0) {
        topHeaders.push({
          key: `t-${currentYearStartIdx}`,
          left: currentYearStartIdx * pxPerDay,
          width: daysInYearGroup * pxPerDay,
          label: currentYearLabel,
        });
      }
    }

    return { topHeaders, bottomHeaders };
  }, [zoomLevel, timelineStart, daysBetween, pxPerDay]);

  const handleScroll = (e) => {
    const top = e.target.scrollTop;
    setScrollTop(top);
    if (gridRef.current && gridRef.current.scrollTop !== top) {
      gridRef.current.scrollTop = top;
    }
    if (ganttRef.current && ganttRef.current.scrollTop !== top) {
      ganttRef.current.scrollTop = top;
    }
  };

  const startResize = (e) => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', endResize);
  };

  const handleResize = (e) => {
    if (!isResizing.current) return;
    setTableWidth(Math.max(250, Math.min(e.clientX - 40, window.innerWidth - 100)));
  };

  const endResize = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', endResize);
  };

  const filteredTasks = useMemo(() => {
    const sorted = sortTasksHierarchically(tasks);
    return sorted
      .map((t, idx) => ({ ...t, originalIndex: idx }))
      .filter(t => {
        if (departmentFilter !== 'All' && t.department !== departmentFilter) return false;
        if (showCriticalOnly && !t.is_critical) return false;
        return true;
      });
  }, [tasks, departmentFilter, showCriticalOnly]);

  // Virtualization boundaries
  const visibleIndices = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 5);
    const endIndex = Math.min(filteredTasks.length, Math.ceil((scrollTop + clientHeight) / rowHeight) + 5);
    return { start: startIndex, end: endIndex };
  }, [scrollTop, clientHeight, filteredTasks.length]);

  const setAndRollupTasks = (updater) => {
    setTasks(prev => {
      const nextTasks = typeof updater === 'function' ? updater(prev) : updater;
      const tasksWithParents = recalculateParentIds(nextTasks);
      const scheduledTasks = runClientCPM(tasksWithParents, dependencies, project.start_date);
      return rollupParentTasks(scheduledTasks);
    });
  };

  // Handle cell updates
  const handleCellChange = (taskId, field, value) => {
    setAndRollupTasks(prev => {
      return prev.map(t => {
        if (t.id === taskId) {
          const task = { ...t };

          if (field.startsWith('custom:')) {
            const colName = field.split(':')[1];
            task.custom_values = {
              ...(task.custom_values || {}),
              [colName]: value
            };
          } else {
            task[field] = value;
          }

          if (['start_date', 'end_date', 'actual_start', 'actual_end'].includes(field)) {
            task[field] = value ? new Date(value).toISOString() : null;
          }

          return task;
        }
        return t;
      });
    });
  };

  const handleIndent = () => {
    if (selectedTaskId === null) return;
    const idx = tasks.findIndex(t => t.id === selectedTaskId);
    if (idx <= 0) return;

    setAndRollupTasks(prev => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        indent_level: Math.min(updated[idx].indent_level + 1, updated[idx - 1].indent_level + 1)
      };
      return updated;
    });
  };

  const handleOutdent = () => {
    if (selectedTaskId === null) return;
    const idx = tasks.findIndex(t => t.id === selectedTaskId);
    if (idx < 0) return;

    setAndRollupTasks(prev => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx],
        indent_level: Math.max(0, updated[idx].indent_level - 1)
      };
      return updated;
    });
  };

  const handleAddRow = (type = 'Task') => {
    const newTempId = -Date.now();
    let taskType = 'activity';
    if (type === 'Phase') taskType = 'phase';
    else if (type === 'Milestone') taskType = 'milestone';

    const defaultNewTask = {
      id: newTempId,
      project_id: project.project_id,
      parent_id: null,
      activity_name: `New ${type}`,
      item_type: type,
      task_type: taskType,
      indent_level: selectedTaskId !== null ? tasks.find(t => t.id === selectedTaskId).indent_level : 0,
      row_order: tasks.length,
      department: 'Engineering',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 86400000).toISOString(),
      actual_start: null,
      actual_end: null,
      complete_percent: 0.0,
      status: 'Not Started',
      assigned_to: [],
      custom_values: {},
      is_critical: false,
      total_float_days: 0.0,
      baselines: [],
      followups: []
    };

    setAndRollupTasks(prev => {
      const updated = [...prev];
      if (selectedTaskId !== null) {
        const selIdx = updated.findIndex(t => t.id === selectedTaskId);
        updated.splice(selIdx + 1, 0, defaultNewTask);
      } else {
        updated.push(defaultNewTask);
      }
      return updated.map((t, idx) => ({ ...t, row_order: idx }));
    });
    setSelectedTaskId(newTempId);
  };

  const handleDeleteRow = () => {
    if (selectedTaskId === null) return;
    const taskToDelete = tasks.find(t => t.id === selectedTaskId);
    if (!taskToDelete) return;

    // Parent deletion protection: check if there are sub-activities
    const hasChildren = tasks.some(t => t.parent_id === selectedTaskId);
    if (hasChildren) {
      alert("Cannot delete task because it has child tasks. Please delete or reassign child tasks first.");
      return;
    }

    if (taskToDelete.item_type === 'Phase' && showSummaryDeleteMessage) {
      if (!window.confirm("Summary task has nested sub-tasks. Are you sure you want to delete this summary task?")) {
        return;
      }
    }

    setAndRollupTasks(prev => {
      const filtered = prev.filter(t => t.id !== selectedTaskId);
      return filtered.map((t, idx) => ({ ...t, row_order: idx }));
    });
    setDependencies(prev => prev.filter(d => d.predecessor_task_id !== selectedTaskId && d.successor_task_id !== selectedTaskId));
    setSelectedTaskId(null);
  };

  const handleMoveRow = (direction) => {
    if (selectedTaskId === null) return;
    const idx = tasks.findIndex(t => t.id === selectedTaskId);
    if (direction === 'up' && idx <= 0) return;
    if (direction === 'down' && idx >= tasks.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    setAndRollupTasks(prev => {
      const updated = [...prev];
      const temp = updated[idx];
      updated[idx] = updated[targetIdx];
      updated[targetIdx] = temp;
      return updated.map((t, index) => ({ ...t, row_order: index }));
    });
  };

  const handleAddSubActivity = () => {
    if (!activeParentTask) return;
    const newTempId = -Date.now();
    const newSub = {
      id: newTempId,
      project_id: project.project_id,
      parent_id: activeParentTask.id,
      activity_name: 'New Sub-Activity',
      item_type: 'Sub Task',
      task_type: 'sub_activity',
      row_order: tasks.length,
      indent_level: activeParentTask.indent_level + 1,
      department: activeParentTask.department || 'Engineering',
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 86400000).toISOString(),
      actual_start: null,
      actual_end: null,
      complete_percent: 0.0,
      status: 'Not Started',
      assigned_to: [],
      custom_values: {},
      is_critical: false,
      total_float_days: 0.0,
      baselines: [],
      followups: []
    };
    
    setAndRollupTasks(prev => [...prev, newSub]);
  };

  const handleDeleteSubActivity = (subId) => {
    setAndRollupTasks(prev => prev.filter(t => t.id !== subId));
  };

  const handleAddCustomColumn = async () => {
    if (!newColName.trim() || !newColLabel.trim()) {
      toast.error('Column name and label are required.');
      return;
    }
    const cleanColName = newColName.toLowerCase().replace(/\s+/g, '_');
    const optionsArray = newColOptions.split(',').map(s => s.trim()).filter(Boolean);

    try {
      const res = await API.post(`/projects/${project.project_id}/milestones/columns`, {
        column_name: cleanColName,
        column_label: newColLabel,
        data_type: newColType,
        options: optionsArray
      });
      setCustomColumns(prev => [...prev, res.data]);
      setShowAddColModal(false);
      setNewColName('');
      setNewColLabel('');
      setNewColOptions('');
      toast.success('Column added successfully');
    } catch (e) {
      console.error(e);
      toast.error('Failed to create custom column');
    }
  };

  const handleDeleteCustomColumn = async (colId) => {
    try {
      await API.delete(`/projects/${project.project_id}/milestones/columns/${colId}`);
      setCustomColumns(prev => prev.filter(c => c.id !== colId));
      toast.success('Column deleted successfully');
    } catch (e) {
      console.error(e);
      toast.error('Failed to delete column');
    }
  };

  const handleRecalculate = async () => {
    try {
      setSaving(true);
      const res = await API.post(`/projects/${project.project_id}/milestones/bulk-save`, {
        milestones: tasks,
        dependencies: dependencies
      });
      setTasks(res.data || []);
      toast.success('Project schedule recalculated successfully!');
      calculateTimelineRange(res.data);
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.detail || 'Recalculation error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBaseline = async () => {
    try {
      setSaving(true);
      await API.post(`/projects/${project.project_id}/baselines/create`, {
        version_name: baselineVersion
      });
      fetchInitialData();
      toast.success(`Baseline snapshot [${baselineVersion}] generated.`);
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate baseline snapshot');
    } finally {
      setSaving(false);
    }
  };

  const openFollowupEditor = (task) => {
    setEditingFollowupTaskId(task.id);
    const existing = task.followups?.[0];
    setFollowupDate(existing?.follow_up_date ? existing.follow_up_date.split('T')[0] : '');
    setFollowupOwner(existing?.owner || '');
    setFollowupNotes(existing?.notes || '');
  };

  const handleSaveFollowup = () => {
    setAndRollupTasks(prev => prev.map(t => {
      if (t.id === editingFollowupTaskId) {
        return {
          ...t,
          followups: [{
            id: Date.now(),
            task_id: t.id,
            follow_up_date: followupDate ? new Date(followupDate).toISOString() : null,
            owner: followupOwner,
            status: 'Open',
            notes: followupNotes
          }]
        };
      }
      return t;
    }));
    setEditingFollowupTaskId(null);
    toast.success('Follow-up scheduled.');
  };

  const handleAddProgressLog = (taskId, dateStr, percent, notesStr) => {
    setAndRollupTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const task = { ...t };
        const currentHistory = task.custom_values?.progress_history || [];
        const newEntry = {
          date: dateStr,
          complete_percent: percent,
          notes: notesStr
        };
        
        const newHistory = [...currentHistory, newEntry].sort((a, b) => new Date(a.date) - new Date(b.date));
        
        task.custom_values = {
          ...(task.custom_values || {}),
          progress_history: newHistory
        };

        const isManual = task.custom_values?.manual_completion_override || false;
        const hasResources = task.assigned_to && task.assigned_to.length > 0;
        if (isManual || !hasResources) {
          task.complete_percent = percent;
        }

        return task;
      }
      return t;
    }));
    toast.success("Progress log entry added.");
  };

  // Map tasks to their parent phase color code
  const getPhaseColors = (taskIndex) => {
    let currentColor = 'cyan';
    let phaseName = 'Contracts';
    for (let i = taskIndex; i >= 0; i--) {
      const t = tasks[i];
      if (t && t.item_type === 'Phase') {
        phaseName = t.activity_name;
        break;
      }
    }

    const name = phaseName.toLowerCase();
    if (name.includes('contracts') || name.includes('proposal')) {
      return { border: 'border-[#00bcd4]', text: 'text-[#00bcd4]', fill: '#00bcd4', light: 'bg-[#00bcd4]/10' };
    } else if (name.includes('design') || name.includes('engineering')) {
      return { border: 'border-[#4caf50]', text: 'text-[#4caf50]', fill: '#4caf50', light: 'bg-[#4caf50]/10' };
    } else if (name.includes('procurement')) {
      return { border: 'border-[#9e9e9e]', text: 'text-[var(--text-primary)]', fill: '#9e9e9e', light: 'bg-slate-700/20' };
    } else if (name.includes('construction') || name.includes('manufacturing')) {
      return { border: 'border-[#ff9800]', text: 'text-[#ff9800]', fill: '#ff9800', light: 'bg-[#ff9800]/10' };
    } else if (name.includes('closing') || name.includes('post')) {
      return { border: 'border-[#8bc34a]', text: 'text-[#8bc34a]', fill: '#8bc34a', light: 'bg-[#8bc34a]/10' };
    }
    return { border: 'border-[#03a9f4]', text: 'text-[#03a9f4]', fill: '#03a9f4', light: 'bg-[#03a9f4]/10' };
  };

  const resourceOverallocations = useMemo(() => {
    if (!showOverAllocationMessage) return [];
    const allocationByDay = {};
    const warnings = [];

    tasks.forEach(t => {
      if (t.assigned_to && t.assigned_to.length > 0 && t.start_date && t.end_date && t.status !== 'Completed') {
        const start = new Date(t.start_date);
        const end = new Date(t.end_date);
        t.assigned_to.forEach(empId => {
          const current = new Date(start);
          while (current <= end) {
            const dateStr = current.toISOString().split('T')[0];
            allocationByDay[empId] = allocationByDay[empId] || {};
            allocationByDay[empId][dateStr] = allocationByDay[empId][dateStr] || [];
            allocationByDay[empId][dateStr].push(t);
            current.setDate(current.getDate() + 1);
          }
        });
      }
    });

    Object.keys(allocationByDay).forEach(empId => {
      const empName = employees.find(e => String(e.id || e.employee_id) === String(empId))?.name || empId;
      const datesMap = allocationByDay[empId];
      const overallocatedDates = [];

      Object.keys(datesMap).forEach(dateStr => {
        if (datesMap[dateStr].length > 1) {
          overallocatedDates.push({ date: dateStr, tasks: datesMap[dateStr] });
        }
      });

      if (overallocatedDates.length > 0) {
        warnings.push({
          employeeId: empId,
          employeeName: empName,
          count: overallocatedDates.length,
          details: `Assigned to ${overallocatedDates[0].tasks.length} active tasks concurrently. Overlap dates: ${overallocatedDates.map(d => d.date).slice(0, 5).join(', ')}${overallocatedDates.length > 5 ? '...' : ''}`
        });
      }
    });

    return warnings;
  }, [tasks, employees]);

  const teamDepartments = useMemo(() => {
    const depts = new Set();
    projectTeam.forEach(member => {
      if (member.employee_department && member.employee_department !== '-') {
        depts.add(member.employee_department);
      }
    });
    return Array.from(depts);
  }, [projectTeam]);

  const suggestedDepartments = useMemo(() => {
    const masterDepartments = ['Engineering', 'Design', 'Procurement', 'Manufacturing', 'Quality', 'Installation', 'Commissioning'];
    const combined = new Set([...masterDepartments, ...teamDepartments]);
    return Array.from(combined);
  }, [teamDepartments]);

  // Gantt Bars Mapping
  const ganttBars = useMemo(() => {
    return filteredTasks.map((t, idx) => {
      if (!t.start_date || !t.end_date) return null;

      const plannedStart = new Date(t.start_date);
      const plannedEnd = new Date(t.end_date);
      
      const plannedLeft = ((plannedStart - timelineStart) / 86400000) * pxPerDay;
      const plannedWidth = Math.max(4, ((plannedEnd - plannedStart) / 86400000) * pxPerDay);

      let actualLeft = null;
      let actualWidth = null;
      let isActualActive = false;

      if (t.actual_start) {
        isActualActive = true;
        const actStart = new Date(t.actual_start);
        const actEnd = t.actual_end ? new Date(t.actual_end) : new Date(); // use current date if in progress
        actualLeft = ((actStart - timelineStart) / 86400000) * pxPerDay;
        actualWidth = Math.max(4, ((actEnd - actStart) / 86400000) * pxPerDay);
      }

      let baselineLeft = null;
      let baselineWidth = null;
      const activeBaseline = t.baselines?.find(b => b.baseline_version === baselineVersion);
      if (activeBaseline && activeBaseline.baseline_start && activeBaseline.baseline_end) {
        const bStart = new Date(activeBaseline.baseline_start);
        const bEnd = new Date(activeBaseline.baseline_end);
        baselineLeft = ((bStart - timelineStart) / 86400000) * pxPerDay;
        baselineWidth = Math.max(4, ((bEnd - bStart) / 86400000) * pxPerDay);
      }

      const colors = getPhaseColors(t.originalIndex);
      const isMilestone = t.item_type === 'Milestone' || t.item_type === 'Approval Gate';
      
      // Calculate delay / variance (days)
      let varianceDays = 0;
      const curDate = new Date();
      if (t.status === 'Completed' && t.actual_end) {
        varianceDays = Math.ceil((new Date(t.actual_end) - plannedEnd) / 86400000);
      } else if (t.status === 'Delayed' || (curDate > plannedEnd && t.complete_percent < 100)) {
        varianceDays = Math.ceil((curDate - plannedEnd) / 86400000);
      } else if (t.actual_start) {
        varianceDays = Math.ceil((new Date(t.actual_start) - plannedStart) / 86400000);
      }

      return {
        id: t.id,
        plannedLeft,
        plannedWidth,
        actualLeft,
        actualWidth,
        isActualActive,
        baselineLeft,
        baselineWidth,
        isMilestone,
        isParent: t.item_type === 'Phase' || tasks.some(child => child.parent_id === t.id),
        isCritical: t.is_critical,
        completePercent: t.complete_percent || 0,
        activityName: t.activity_name,
        wbsCode: t.wbs_code,
        colors,
        assignedToNames: t.assigned_to?.map(uid => {
          const emp = projectTeam.find(e => String(e.employee_id) === String(uid));
          return emp ? emp.employee_name : uid;
        }).filter(Boolean).join(', '),
        pinType: t.custom_values?.pin_type || '',
        status: t.status,
        varianceDays,
        startDateStr: plannedStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      };
    });
  }, [filteredTasks, timelineStart, pxPerDay, baselineVersion, projectTeam, tasks]);

  // SVG Connector Lines
  const dependencyLines = useMemo(() => {
    const lines = [];
    const barsMap = {};
    ganttBars.forEach((b, idx) => {
      if (b) barsMap[b.id] = { bar: b, index: idx };
    });

    dependencies.forEach((d, depIdx) => {
      const predObj = barsMap[d.predecessor_task_id];
      const succObj = barsMap[d.successor_task_id];

      if (!predObj || !succObj) return;

      const pred = predObj.bar;
      const succ = succObj.bar;
      const predIdx = predObj.index;
      const succIdx = succObj.index;

      const startVisible = visibleIndices.start;
      const endVisible = visibleIndices.end;
      if ((predIdx < startVisible && succIdx < startVisible) || (predIdx > endVisible && succIdx > endVisible)) {
        return;
      }

      const y1 = predIdx * rowHeight + rowHeight / 2;
      const y2 = succIdx * rowHeight + rowHeight / 2;

      let x1 = pred.plannedLeft + pred.plannedWidth;
      let x2 = succ.plannedLeft;

      if (d.type === 'SS') {
        x1 = pred.plannedLeft;
        x2 = succ.plannedLeft;
      } else if (d.type === 'FF') {
        x1 = pred.plannedLeft + pred.plannedWidth;
        x2 = succ.plannedLeft + succ.plannedWidth;
      } else if (d.type === 'SF') {
        x1 = pred.plannedLeft;
        x2 = succ.plannedLeft + succ.plannedWidth;
      }

      const isCriticalLink = pred.isCritical && succ.isCritical;
      const color = isCriticalLink ? '#ef4444' : 'var(--border-strong)';

      let path = '';
      if (d.type === 'FS') {
        if (x2 >= x1 + 12) {
          path = `M ${x1} ${y1} L ${x1 + 6} ${y1} L ${x1 + 6} ${y2} L ${x2} ${y2}`;
        } else {
          const midwayY = y1 + (y2 - y1) / 2;
          path = `M ${x1} ${y1} L ${x1 + 6} ${y1} L ${x1 + 6} ${midwayY} L ${x2 - 6} ${midwayY} L ${x2 - 6} ${y2} L ${x2} ${y2}`;
        }
      } else {
        path = `M ${x1} ${y1} L ${Math.min(x1, x2) - 8} ${y1} L ${Math.min(x1, x2) - 8} ${y2} L ${x2} ${y2}`;
      }

      lines.push({
        id: `link-${depIdx}`,
        d: path,
        color,
        isCriticalLink
      });
    });

    return lines;
  }, [ganttBars, dependencies, visibleIndices]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg)] text-[var(--text-primary)] select-none font-sans antialiased text-xs transition-colors duration-200">
      
      {/* PROFESSIONAL SCHEDULING CONTROL PANEL */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-[var(--surface)] border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* Row actions */}
          <div className="flex items-center gap-1.5 bg-[var(--bg)] border border-[var(--border-subtle)] p-1 rounded-lg">
            <button
              onClick={() => handleAddRow('Task')}
              className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold transition-all"
            >
              <Plus size={13} /> Task
            </button>
            <button
              onClick={() => handleAddRow('Phase')}
              className="flex items-center gap-1 px-2.5 py-1 bg-[var(--surface)] hover:bg-[var(--table-hover)] text-[var(--text-primary)] rounded font-bold border border-[var(--border-subtle)] transition-all"
            >
              <FolderPlus size={13} /> Phase
            </button>
          </div>

          <span className="h-4 w-[1px] bg-[var(--border-subtle)]" />

          {/* Indent controls */}
          <div className="flex items-center bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg">
            <button
              onClick={handleIndent}
              disabled={selectedTaskId === null}
              className="p-1.5 hover:bg-[var(--table-hover)] text-[var(--text-secondary)] disabled:opacity-30 transition-colors"
              title="Indent Row (Demote)"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={handleOutdent}
              disabled={selectedTaskId === null}
              className="p-1.5 hover:bg-[var(--table-hover)] text-[var(--text-secondary)] disabled:opacity-30 transition-colors"
              title="Outdent Row (Promote)"
            >
              <ChevronDown size={14} />
            </button>
          </div>

          <span className="h-4 w-[1px] bg-[var(--border-subtle)]" />

          {/* Up/Down positioning */}
          <div className="flex items-center bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg">
            <button
              onClick={() => handleMoveRow('up')}
              disabled={selectedTaskId === null}
              className="p-1.5 hover:bg-[var(--table-hover)] text-[var(--text-secondary)] disabled:opacity-30"
              title="Move Row Up"
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={() => handleMoveRow('down')}
              disabled={selectedTaskId === null}
              className="p-1.5 hover:bg-[var(--table-hover)] text-[var(--text-secondary)] disabled:opacity-30"
              title="Move Row Down"
            >
              <ChevronDown size={14} />
            </button>
          </div>

          <button
            onClick={handleDeleteRow}
            disabled={selectedTaskId === null}
            className="p-1.5 bg-[var(--bg)] hover:bg-rose-500/10 hover:text-rose-500 border border-[var(--border-subtle)] rounded-lg text-[var(--text-muted)] disabled:opacity-30 transition-colors"
            title="Delete Selected Row"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* View and calculation operators */}
        <div className="flex items-center gap-3">
          <button
            onClick={openSettingsModal}
            className="flex items-center gap-1 px-3 py-1.5 bg-[var(--surface)] hover:bg-[var(--table-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg font-bold transition-all flex items-center gap-1"
            title="Gantt Settings"
          >
            <Settings size={13} /> Settings
          </button>

          <div className="flex items-center bg-[var(--bg)] border border-[var(--border-subtle)] p-0.5 rounded-lg font-bold">
            {['Day', 'Week', 'Month'].map(lvl => (
              <button
                key={lvl}
                onClick={() => setZoomLevel(lvl)}
                className={`px-3 py-1 rounded transition-all ${zoomLevel === lvl ? 'bg-indigo-600 text-white shadow' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <span className="h-4 w-[1px] bg-[var(--border-subtle)]" />

          <button
            onClick={() => setShowAddColModal(true)}
            className="px-3 py-1.5 bg-[var(--surface)] hover:bg-[var(--table-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg font-bold transition-all"
          >
            Add Column
          </button>

          <button
            onClick={handleRecalculate}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md disabled:opacity-50 transition-all"
          >
            {saving ? <RefreshCw className="animate-spin" size={13} /> : <Save size={13} />} Save WBS
          </button>
        </div>
      </div>

      {/* FILTER & BASELINE DOCK */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-2 bg-[var(--elevated-card)] border-b border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span>Department:</span>
            <select
              value={departmentFilter}
              onChange={e => setDepartmentFilter(e.target.value)}
              className="px-2 py-0.5 bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="All">All Departments</option>
              {['Engineering', 'Design', 'Procurement', 'Manufacturing', 'Quality', 'Installation', 'Commissioning'].map(d => (
                <option key={d} value={d} className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">{d}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium select-none">
            <input
              type="checkbox"
              checked={showCriticalOnly}
              onChange={e => setShowCriticalOnly(e.target.checked)}
              className="rounded bg-[var(--bg)] border-[var(--border-subtle)] text-indigo-600 focus:ring-0"
            />
            Show Critical Path
          </label>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span>Baseline version:</span>
            <input
              type="text"
              value={baselineVersion}
              onChange={e => setBaselineVersion(e.target.value)}
              className="w-24 px-2 py-0.5 bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded text-center focus:outline-none"
            />
            <button
              onClick={handleCreateBaseline}
              className="px-2 py-0.5 bg-[var(--surface)] hover:bg-[var(--table-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded font-bold transition-all"
            >
              Snapshot
            </button>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium select-none">
            <input
              type="checkbox"
              checked={showBaselineOverlay}
              onChange={e => setShowBaselineOverlay(e.target.checked)}
              className="rounded bg-[var(--bg)] border-[var(--border-subtle)] text-indigo-600 focus:ring-0"
            />
            Show Baseline Overlay
          </label>
        </div>
      </div>

      {/* DENSE GRID & GANTT SPLIT WRAPPER */}
      <div className="flex-1 min-h-0 flex relative bg-[var(--bg)] text-[var(--text-primary)]">
        
        {/* SPREADSHEET TABLE GRID */}
        {showDataGrid && (
          <div 
            ref={gridRef}
            style={{ width: showGantt ? tableWidth : '100%' }}
            className={`h-full overflow-x-auto shrink-0 border-r border-[var(--border-subtle)] relative custom-scrollbar text-[12px] ${showGantt ? 'overflow-y-hidden' : 'overflow-y-auto'}`}
            onScroll={handleScroll}
          >
            <table 
              style={{ width: '100%', minWidth: `${1620 + customColumns.length * 128}px` }}
              className="text-left border-collapse table-fixed select-text"
            >
              <thead className="bg-[var(--surface)] text-[var(--text-secondary)] border-b border-[var(--border-subtle)] sticky top-0 z-20">
                <tr className="h-10 text-[10px] tracking-wider uppercase font-semibold text-[var(--text-muted)]">
                  <th className="w-10 px-2 text-center border-r border-[var(--border-subtle)]">All</th>
                  <th className="w-12 px-2 text-center border-r border-[var(--border-subtle)]">Info</th>
                  <th className="w-16 px-2 border-r border-[var(--border-subtle)]">Pin</th>
                  <th className="w-28 px-2 border-r border-[var(--border-subtle)]">Department</th>
                  <th className="w-64 px-3 border-r border-[var(--border-subtle)]">Activity Name</th>
                  <th className="w-24 px-2 border-r border-[var(--border-subtle)] text-center">Sub Activity</th>
                  <th className="w-28 px-2 border-r border-[var(--border-subtle)]">Start Date</th>
                  <th className="w-28 px-2 border-r border-[var(--border-subtle)]">End Date</th>
                  <th className="w-20 px-2 border-r border-[var(--border-subtle)] text-center">Duration</th>
                  <th className="w-28 px-2 border-r border-[var(--border-subtle)]">Actual Start</th>
                  <th className="w-28 px-2 border-r border-[var(--border-subtle)]">Actual End</th>
                  <th className="w-24 px-2 border-r border-[var(--border-subtle)] text-center">Variance</th>
                  <th className="w-14 px-2 border-r border-[var(--border-subtle)] text-center">% Comp</th>
                  <th className="w-36 px-2 border-r border-[var(--border-subtle)]">Assigned To</th>
                  <th className="w-24 px-2 border-r border-[var(--border-subtle)]">Status</th>
                  <th className="w-32 px-2 border-r border-[var(--border-subtle)]">Predecessors</th>
                  
                  {customColumns.map(col => (
                    <th key={col.id} className="w-32 px-2 border-r border-[var(--border-subtle)] relative group">
                      <span className="truncate pr-4 block">{col.column_label}</span>
                      <button
                        onClick={() => handleDeleteCustomColumn(col.id)}
                        className="absolute right-1 top-2.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </th>
                  ))}
                  
                  <th className="w-28 px-2">Follow-up</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ height: visibleIndices.start * rowHeight }} />

                {filteredTasks.slice(visibleIndices.start, visibleIndices.end).map((task, visibleIndex) => {
                  const isSelected = selectedTaskId === task.id;
                  const indentPadding = task.indent_level * 16;
                  const taskIdx = task.originalIndex;
                  const phase = getPhaseColors(taskIdx);
                  const isParent = task.item_type === 'Phase' || tasks.some(t => t.parent_id === task.id);

                  // Format Duration display
                  let durationDays = '0 days';
                  if (task.start_date && task.end_date) {
                    const days = Math.ceil((new Date(task.end_date) - new Date(task.start_date)) / 86400000);
                    durationDays = days === 0 ? '0 days' : `${days} day${days > 1 ? 's' : ''}`;
                  }

                  // Format date string to display
                  const formatDate = (dateStr) => {
                    if (!dateStr) return '';
                    const d = new Date(dateStr);
                    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
                  };

                  // Format schedule variance / delay display
                  let varianceText = 'On Track';
                  let varianceColor = 'text-slate-400';
                  const plannedEnd = task.end_date ? new Date(task.end_date) : null;
                  const actualEnd = task.actual_end ? new Date(task.actual_end) : null;
                  const curDate = new Date();
                  
                  if (task.status === 'Completed' && actualEnd && plannedEnd) {
                    const v = Math.ceil((actualEnd - plannedEnd) / 86400000);
                    if (v > 0) {
                      varianceText = `+${v}d Delay`;
                      varianceColor = 'text-rose-500 font-bold';
                    } else if (v < 0) {
                      varianceText = `${v}d Advance`;
                      varianceColor = 'text-emerald-500 font-bold';
                    }
                  } else if ((task.status === 'Delayed' || (curDate > plannedEnd && task.complete_percent < 100)) && plannedEnd) {
                    const v = Math.ceil((curDate - plannedEnd) / 86400000);
                    varianceText = `+${v}d Delay`;
                    varianceColor = 'text-rose-500 font-bold';
                  } else if (task.actual_start && task.start_date) {
                    const v = Math.ceil((new Date(task.actual_start) - new Date(task.start_date)) / 86400000);
                    if (v > 0) {
                      varianceText = `+${v}d Start Delay`;
                      varianceColor = 'text-rose-500 font-bold';
                    } else if (v < 0) {
                      varianceText = `${v}d Early Start`;
                      varianceColor = 'text-emerald-500 font-bold';
                    }
                  }

                  return (
                    <tr 
                      key={task.id}
                      onClick={() => setSelectedTaskId(task.id)}
                      style={{ height: rowHeight }}
                      className={`border-b border-[var(--border-subtle)]/30 hover:bg-[var(--table-hover)] transition-colors ${
                        isSelected ? 'bg-[var(--active-menu)]/15 border-[var(--border-subtle)]' : ''
                      } ${task.is_critical ? 'bg-rose-500/5' : ''} ${
                        isParent ? 'bg-slate-50/60 dark:bg-slate-900/40' : ''
                      }`}
                    >
                      {/* Index */}
                      <td className="px-2 text-center border-r border-[var(--border-subtle)] font-mono text-[10px] text-[var(--text-muted)] font-bold select-none">{taskIdx + 1}</td>
                      
                      {/* Info Column */}
                      <td className="px-2 text-center border-r border-[var(--border-subtle)] select-none">
                        <div className="flex items-center justify-center gap-1">
                          {task.is_critical && (
                            <span className="size-2 rounded-full bg-rose-500" title="Critical Path Activity" />
                          )}
                          {task.item_type === 'Approval Gate' && (
                            <span className="size-2 rotate-45 bg-yellow-500 border border-yellow-600 block" title="Approval / Stage Gate" />
                          )}
                        </div>
                      </td>

                      {/* Pin Column */}
                      <td className="px-2 border-r border-[var(--border-subtle)] text-center select-none">
                        <select
                          value={task.custom_values?.pin_type || ''}
                          onChange={e => handleCellChange(task.id, 'custom:pin_type', e.target.value)}
                          className="w-full bg-transparent border-0 outline-none text-xs text-[var(--text-primary)] font-medium"
                        >
                          <option value="" className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">--</option>
                          <option value="star" className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">⭐ Star</option>
                          <option value="flag" className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">🚩 Flag</option>
                          <option value="arrow" className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">➡️ Arrow</option>
                        </select>
                      </td>

                      {/* Department */}
                      <td className="px-2 border-r border-[var(--border-subtle)]">
                        <input
                          type="text"
                          list="departments-list"
                          value={task.department || ''}
                          onChange={e => handleCellChange(task.id, 'department', e.target.value)}
                          className="w-full bg-transparent border-0 outline-none text-xs text-[var(--text-primary)] font-medium"
                        />
                      </td>

                      {/* Activity Name */}
                      <td 
                        className="px-3 border-r border-[var(--border-subtle)] relative truncate flex items-center h-full select-none"
                        style={{ paddingLeft: `${Math.max(12, indentPadding + 12)}px` }}
                      >
                        {task.indent_level > 0 && (
                          <div 
                            className={`absolute left-0 top-0 bottom-0 border-l-2 ${phase.border} opacity-50`} 
                            style={{ left: `${(task.indent_level) * 16}px` }} 
                          />
                        )}

                        <input
                          type="text"
                          value={task.activity_name || ''}
                          onChange={e => handleCellChange(task.id, 'activity_name', e.target.value)}
                          className={`w-full bg-transparent border-0 outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 py-0.5 ${isParent ? 'font-bold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
                        />
                      </td>

                      {/* Sub Activity */}
                      <td className="px-2 border-r border-[var(--border-subtle)] text-center select-none">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveParentTask(task);
                          }}
                          className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/20 font-bold transition-all"
                        >
                          Manage ({tasks.filter(t => t.parent_id === task.id).length})
                        </button>
                      </td>

                      {/* Start Date */}
                      <td className="px-2 border-r border-[var(--border-subtle)] font-mono font-semibold text-[var(--text-muted)]">
                        {isParent ? (
                          <span className="font-bold text-[var(--text-primary)] text-xs">{formatDate(task.start_date)}</span>
                        ) : (
                          <input
                            type="date"
                            value={task.start_date ? task.start_date.split('T')[0] : ''}
                            onChange={e => handleCellChange(task.id, 'start_date', e.target.value)}
                            className="w-full bg-transparent border-0 outline-none text-[11px] text-[var(--text-primary)] font-mono"
                          />
                        )}
                      </td>

                      {/* End Date */}
                      <td className="px-2 border-r border-[var(--border-subtle)] font-mono font-semibold text-[var(--text-muted)]">
                        {isParent ? (
                          <span className="font-bold text-[var(--text-primary)] text-xs">{formatDate(task.end_date)}</span>
                        ) : (
                          <input
                            type="date"
                            value={task.end_date ? task.end_date.split('T')[0] : ''}
                            onChange={e => handleCellChange(task.id, 'end_date', e.target.value)}
                            className="w-full bg-transparent border-0 outline-none text-[11px] text-[var(--text-primary)] font-mono"
                          />
                        )}
                      </td>

                      {/* Duration (NEW) */}
                      <td className="px-2 border-r border-[var(--border-subtle)] text-center font-mono">
                        <span className={`text-[11px] ${isParent ? 'font-bold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                          {durationDays}
                        </span>
                      </td>

                      {/* Actual Start */}
                      <td className="px-2 border-r border-[var(--border-subtle)] font-mono font-semibold text-[var(--text-muted)]">
                        {isParent ? (
                          <span className="font-bold text-[var(--text-primary)] text-xs">{formatDate(task.actual_start)}</span>
                        ) : (
                          <input
                            type="date"
                            value={task.actual_start ? task.actual_start.split('T')[0] : ''}
                            onChange={e => handleCellChange(task.id, 'actual_start', e.target.value)}
                            className="w-full bg-transparent border-0 outline-none text-[11px] text-[var(--text-primary)] font-mono"
                          />
                        )}
                      </td>

                      {/* Actual End */}
                      <td className="px-2 border-r border-[var(--border-subtle)] font-mono font-semibold text-[var(--text-muted)]">
                        {isParent ? (
                          <span className="font-bold text-[var(--text-primary)] text-xs">{formatDate(task.actual_end)}</span>
                        ) : (
                          <input
                            type="date"
                            value={task.actual_end ? task.actual_end.split('T')[0] : ''}
                            onChange={e => handleCellChange(task.id, 'actual_end', e.target.value)}
                            className="w-full bg-transparent border-0 outline-none text-[11px] text-[var(--text-primary)] font-mono"
                          />
                        )}
                      </td>

                      {/* Variance (NEW) */}
                      <td className="px-2 border-r border-[var(--border-subtle)] text-center font-mono text-[10px]">
                        <span className={varianceColor}>
                          {varianceText}
                        </span>
                      </td>

                      {/* Complete % */}
                      <td className="px-2 border-r border-[var(--border-subtle)] text-center font-mono text-xs">
                        {isParent ? (
                          <span className="font-bold text-[var(--text-primary)]">{task.complete_percent || 0}%</span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={task.complete_percent || 0}
                            readOnly={!task.custom_values?.manual_completion_override && task.assigned_to && task.assigned_to.length > 0}
                            onChange={e => handleCellChange(task.id, 'complete_percent', parseFloat(e.target.value) || 0)}
                            className={`w-full bg-transparent border-0 outline-none text-center font-semibold ${
                              (!task.custom_values?.manual_completion_override && task.assigned_to && task.assigned_to.length > 0)
                                ? 'text-slate-400 cursor-not-allowed'
                                : 'text-[var(--text-primary)]'
                            }`}
                            title={(!task.custom_values?.manual_completion_override && task.assigned_to && task.assigned_to.length > 0) ? "Calculated from Resource weights/progress" : "Manual Completion %"}
                          />
                        )}
                      </td>

                      {/* Assigned To */}
                      <td className="px-2 border-r border-[var(--border-subtle)] truncate">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveAssignTask(task);
                          }}
                          className="w-full text-left truncate hover:text-indigo-500 font-medium py-1"
                        >
                          {task.assigned_to && task.assigned_to.length > 0 ? (
                            task.assigned_to.map(uid => {
                              const emp = projectTeam.find(e => String(e.employee_id) === String(uid));
                              return emp ? emp.employee_name : uid;
                            }).join(', ')
                          ) : (
                            <span className="text-[var(--text-muted)] italic text-[11px]">Unassigned</span>
                          )}
                        </button>
                      </td>

                      {/* Status */}
                      <td className="px-2 border-r border-[var(--border-subtle)]">
                        {isParent ? (
                          <span className="font-bold text-[var(--text-primary)] text-[10px] tracking-wide uppercase px-1">{task.status || 'Not Started'}</span>
                        ) : (
                          <select
                            value={task.status || 'Not Started'}
                            onChange={e => handleCellChange(task.id, 'status', e.target.value)}
                            className="w-full bg-transparent border-0 outline-none text-xs text-[var(--text-primary)] font-bold"
                          >
                            {['Not Started', 'Upcoming', 'In Progress', 'Completed', 'Delayed', 'On Hold', 'Cancelled'].map(s => (
                              <option key={s} value={s} className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">{s}</option>
                            ))}
                          </select>
                        )}
                      </td>

                      {/* Predecessors */}
                      <td className="px-2 border-r border-[var(--border-subtle)] font-mono text-xs text-[var(--text-muted)]">
                        <input
                          type="text"
                          placeholder="e.g. 1FS+3d"
                          disabled={isParent}
                          value={task.dependencies_as_successor ? task.dependencies_as_successor.map(d => {
                            const predTaskIdx = filteredTasks.findIndex(pt => pt.id === d.predecessor_task_id);
                            const lagText = d.lag_days !== 0 ? `${d.lag_days > 0 ? '+' : ''}${d.lag_days}d` : '';
                            return predTaskIdx !== -1 ? `${predTaskIdx + 1}${d.type}${lagText}` : '';
                          }).join(', ') : ''}
                          onChange={e => {
                            const inputStr = e.target.value;
                            const parts = inputStr.split(',').map(s => s.trim()).filter(Boolean);
                            const parsedDeps = [];
                            parts.forEach(part => {
                              const match = part.match(/^(\d+)(FS|SS|FF|SF)?(?:([\+\-]\d+)d)?$/i);
                              if (match) {
                                const predRowIdx = parseInt(match[1]) - 1;
                                const depType = (match[2] || 'FS').toUpperCase();
                                const lagVal = match[3] ? parseInt(match[3]) : 0;
                                
                                const predTask = filteredTasks[predRowIdx];
                                if (predTask && predTask.id !== task.id) {
                                    parsedDeps.push({
                                      predecessor_task_id: predTask.id,
                                      successor_task_id: task.id,
                                      type: depType,
                                      lag_days: lagVal
                                    });
                                }
                              }
                            });
                            setDependencies(prev => {
                              const filtered = prev.filter(d => d.successor_task_id !== task.id);
                              return [...filtered, ...parsedDeps];
                            });
                          }}
                          className="w-full bg-transparent border-0 outline-none text-[var(--text-primary)] font-semibold"
                        />
                      </td>

                      {/* Custom fields */}
                      {customColumns.map(col => {
                        const val = task.custom_values?.[col.column_name] || '';
                        return (
                          <td key={col.id} className="px-2 border-r border-[var(--border-subtle)]">
                            {col.data_type === 'select' ? (
                              <select
                                value={val}
                                onChange={e => handleCellChange(task.id, `custom:${col.column_name}`, e.target.value)}
                                className="w-full bg-transparent border-0 outline-none text-[var(--text-primary)]"
                              >
                                <option value="">--</option>
                                {col.options?.map(o => (
                                  <option key={o} value={o} className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">{o}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={col.data_type === 'number' ? 'number' : col.data_type === 'date' ? 'date' : 'text'}
                                value={val}
                                onChange={e => handleCellChange(task.id, `custom:${col.column_name}`, e.target.value)}
                                className="w-full bg-transparent border-0 outline-none text-[var(--text-primary)]"
                              />
                            )}
                          </td>
                        );
                      })}

                      {/* Follow-up */}
                      <td className="px-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openFollowupEditor(task);
                          }}
                          className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 hover:text-white bg-[var(--surface)] hover:bg-[var(--table-hover)] px-2 py-0.5 rounded border border-[var(--border-subtle)] transition-colors"
                        >
                          <Calendar size={11} />
                          {task.followups && task.followups.length > 0 ? 'Logged' : 'Set'}
                        </button>
                      </td>
                    </tr>
                  );
                })}

                <tr style={{ height: (filteredTasks.length - visibleIndices.end) * rowHeight }} />
              </tbody>
            </table>
          </div>
        )}

        {/* RESIZER DRAG THUMB */}
        {showDataGrid && showGantt && (
          <div 
            onMouseDown={startResize}
            className="w-[5px] h-full hover:bg-indigo-500/40 cursor-col-resize active:bg-indigo-600 shrink-0 bg-[var(--surface)] border-x border-[var(--border-subtle)] z-10"
          />
        )}

        {/* GANTT VIEW TIMELINE */}
        {showGantt && (
          <div 
            ref={ganttRef}
            className="h-full flex-1 overflow-x-auto overflow-y-auto relative custom-scrollbar"
            onScroll={handleScroll}
          >
            <div style={{ width: timelineWidth, height: filteredTasks.length * rowHeight + 40 }} className="relative bg-[var(--surface)]">
                    {/* TIMELINE MONTH / WEEK HEADERS */}
              <div className="h-10 bg-[var(--elevated-card)] border-b border-[var(--border-subtle)] sticky top-0 z-20 flex flex-col justify-end select-none">
                
                {/* Top Tier Header (Month & Year or Year) */}
                <div className="absolute top-0 left-0 w-full h-5 bg-[var(--bg)] border-b border-[var(--border-subtle)] flex text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider relative overflow-hidden">
                  {timelineHeaders.topHeaders.map(th => (
                    <div
                      key={th.key}
                      style={{ left: th.left, width: th.width }}
                      className="absolute top-0 h-full border-r border-[var(--border-subtle)]/30 px-2 flex items-center justify-start truncate font-extrabold"
                    >
                      {th.label}
                    </div>
                  ))}
                </div>
                
                {/* Bottom Tier Header (Days, Weeks commencing, or Months) */}
                <div className="flex h-5 relative text-[9px] font-bold text-[var(--text-secondary)]">
                  {timelineHeaders.bottomHeaders.map(bh => (
                    <div
                      key={bh.key}
                      style={{ left: bh.left, width: bh.width }}
                      title={bh.title}
                      className={`absolute bottom-0 h-full flex items-center leading-none ${bh.className || ''}`}
                    >
                      {bh.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* DASHED VERTICAL COLUMNS */}
              <div className="absolute top-10 left-0 w-full h-full pointer-events-none">
                {Array.from({ length: daysBetween }).map((_, i) => {
                  const tickDate = new Date(timelineStart);
                  tickDate.setDate(tickDate.getDate() + i);
                  const isWeekend = tickDate.getDay() === 0 || tickDate.getDay() === 6;
                  
                  let showLine = true;
                  let isMajorLine = false;

                  if (zoomLevel === 'Day') {
                    isMajorLine = tickDate.getDay() === 1; // Monday is major
                  } else if (zoomLevel === 'Week') {
                    showLine = tickDate.getDay() === 1; // Only show week starts
                    isMajorLine = tickDate.getDate() <= 7; // First week of month is major
                  } else if (zoomLevel === 'Month') {
                    showLine = tickDate.getDate() === 1; // Only show month starts
                    isMajorLine = tickDate.getMonth() === 0; // January is major
                  }

                  if (!showLine) return null;

                  return (
                    <div 
                      key={i} 
                      style={{ left: i * pxPerDay, width: pxPerDay }} 
                      className={`absolute top-0 h-full border-l ${
                        isMajorLine 
                          ? 'border-[var(--border-strong)]/40 border-dashed' 
                          : 'border-[var(--border-subtle)]/10'
                      } ${
                        zoomLevel === 'Day' && isWeekend && showNonWorkingDayShading 
                          ? 'bg-[var(--elevated-card)]/40 dark:bg-[var(--border-subtle)]/5' 
                          : ''
                      }`}
                    />
                  );
                })}
              </div>

              {/* DEPENDENCY ARROW RENDER LAYER */}
              <svg 
                className="absolute top-10 left-0 w-full h-full pointer-events-none z-10"
                style={{ width: timelineWidth, height: filteredTasks.length * rowHeight }}
              >
                <defs>
                  <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <polygon points="0 0, 6 3, 0 6" fill="var(--border-strong)" />
                  </marker>
                  <marker id="arrowhead-critical" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <polygon points="0 0, 6 3, 0 6" fill="#ef4444" />
                  </marker>
                </defs>

                {dependencyLines.map(line => (
                  <path 
                    key={line.id}
                    d={line.d}
                    fill="none"
                    stroke={line.color}
                    strokeWidth={line.isCriticalLink ? 1.8 : 1.2}
                    markerEnd={line.isCriticalLink ? "url(#arrowhead-critical)" : "url(#arrowhead)"}
                  />
                ))}
              </svg>

              {/* ALTERNATING ROW STRIPES BACKDROP */}
              <div className="absolute top-10 left-0 w-full h-full pointer-events-none z-0">
                {filteredTasks.map((t, i) => (
                  <div 
                    key={t.id}
                    style={{ top: i * rowHeight, height: rowHeight }}
                    className={`absolute left-0 w-full border-b border-[var(--border-subtle)]/10 ${i % 2 === 0 ? 'bg-transparent' : 'bg-slate-50/5 dark:bg-slate-900/5'}`}
                  />
                ))}
              </div>

              {/* ACTIVE GANTT ROW BARS */}
              <div className="absolute top-10 left-0 w-full h-full select-none z-10">
                <div style={{ height: visibleIndices.start * rowHeight }} />

                {ganttBars.slice(visibleIndices.start, visibleIndices.end).map((bar, sliceIdx) => {
                  if (!bar) return <div key={`empty-${sliceIdx}`} style={{ height: rowHeight }} />;
                  
                  const isSelected = selectedTaskId === bar.id;
                  const isParent = bar.isParent;
                  const isMilestone = bar.isMilestone;
                  const isCritical = bar.isCritical;
                  const color = bar.colors.fill;

                  return (
                    <div 
                      key={bar.id}
                      style={{ height: rowHeight }}
                      className={`flex flex-col justify-center relative group w-full ${isSelected ? 'bg-indigo-500/5' : ''}`}
                    >
                      {/* Pin Icons */}
                      {bar.pinType && (
                        <div 
                          className="absolute z-20 flex items-center justify-center pointer-events-none"
                          style={{ 
                            left: bar.plannedLeft - 24, 
                            width: '16px',
                            height: '16px',
                          }}
                        >
                          {bar.pinType === 'star' && <span className="text-[14px]" title="Starred Task">⭐</span>}
                          {bar.pinType === 'flag' && <span className="text-[14px]" title="Flagged Task">🚩</span>}
                          {bar.pinType === 'arrow' && <span className="text-[14px]" title="Arrow Indicator">➡️</span>}
                        </div>
                      )}
                      
                      {isMilestone ? (
                        <>
                          {/* Planned Milestone Diamond */}
                          <div 
                            className="absolute size-3 shadow-md flex items-center justify-center z-10"
                            style={{ 
                              left: bar.plannedLeft - 6,
                              width: '10px',
                              height: '10px',
                              transform: 'rotate(45deg)',
                              backgroundColor: color,
                              border: `1.5px solid ${isCritical ? '#f43f5e' : '#fff'}`
                            }}
                            title={`Planned Milestone: ${bar.activityName}`}
                          />
                          {/* Actual Milestone Diamond (if actual start exists) */}
                          {bar.isActualActive && (
                            <div 
                              className="absolute size-3 shadow-md flex items-center justify-center z-10"
                              style={{ 
                                left: bar.actualLeft - 6,
                                top: '22px',
                                width: '10px',
                                height: '10px',
                                transform: 'rotate(45deg)',
                                backgroundColor: bar.status === 'Completed' ? '#10b981' : '#f59e0b',
                                border: '1.5px solid #fff'
                              }}
                              title={`Actual Milestone: ${bar.activityName}`}
                            />
                          )}
                          <span 
                            style={{ left: bar.plannedLeft - 50, width: '40px' }}
                            className="absolute text-[8px] font-mono text-[var(--text-muted)] text-right pr-1 select-none pointer-events-none z-10"
                          >
                            {bar.startDateStr}
                          </span>
                        </>
                      ) : isParent ? (
                        <>
                          {/* Planned Parent Summary Bar */}
                          <svg 
                            className="absolute h-3 overflow-visible pointer-events-none" 
                            style={{ left: bar.plannedLeft - 2, width: Math.max(8, bar.plannedWidth) + 4, top: '8px' }}
                          >
                            <path d={`M 2 2 H ${bar.plannedWidth + 2} V 6 H 2 Z`} fill={color} />
                            <path d="M 2 2 L 6 6 L 6 2 Z" fill={color} />
                            <path d={`M ${bar.plannedWidth + 2} 2 L ${bar.plannedWidth - 2} 6 L ${bar.plannedWidth - 2} 2 Z`} fill={color} />
                          </svg>

                          {/* Actual Parent Summary Bar */}
                          {bar.isActualActive && (
                            <svg 
                              className="absolute h-2.5 overflow-visible pointer-events-none" 
                              style={{ left: bar.actualLeft - 2, width: Math.max(8, bar.actualWidth) + 4, top: '22px' }}
                            >
                              <path d={`M 2 1 H ${bar.actualWidth + 2} V 5 H 2 Z`} fill={bar.status === 'Completed' ? '#10b981' : bar.status === 'Delayed' ? '#f43f5e' : '#f59e0b'} className="opacity-60" />
                              <path d="M 2 1 L 5 4 L 5 1 Z" fill={bar.status === 'Completed' ? '#10b981' : bar.status === 'Delayed' ? '#f43f5e' : '#f59e0b'} className="opacity-60" />
                              <path d={`M ${bar.actualWidth + 2} 1 L ${bar.actualWidth - 1} 4 L ${bar.actualWidth - 1} 1 Z`} fill={bar.status === 'Completed' ? '#10b981' : bar.status === 'Delayed' ? '#f43f5e' : '#f59e0b'} className="opacity-60" />
                            </svg>
                          )}
                        </>
                      ) : (
                        <>
                          {/* Planned Bar */}
                          <div 
                            style={{ left: bar.plannedLeft, width: bar.plannedWidth, top: '8px' }}
                            className={`absolute h-2.5 rounded shadow-sm flex items-center overflow-hidden bg-slate-300 dark:bg-slate-700/50`}
                            title={`Planned: ${bar.activityName} (${Math.round(bar.plannedWidth / pxPerDay)} Days)`}
                          >
                            <div 
                              style={{ 
                                width: `${bar.completePercent}%`,
                                backgroundColor: isCritical ? '#ef4444' : color
                              }} 
                              className="h-full rounded-l"
                            />
                          </div>

                          {/* Actual Bar (drawn if actual start is set) */}
                          {bar.isActualActive && (
                            <div 
                              style={{ 
                                left: bar.actualLeft, 
                                width: bar.actualWidth,
                                top: '22px'
                              }}
                              className={`absolute h-2 rounded shadow-sm flex items-center overflow-hidden ${
                                bar.status === 'Completed' 
                                  ? 'bg-emerald-500/20 border border-emerald-500' 
                                  : bar.status === 'Delayed'
                                  ? 'bg-rose-500/20 border border-rose-500'
                                  : 'bg-amber-500/20 border border-amber-500'
                              }`}
                              title={`Actual: ${bar.activityName} (${bar.status})`}
                            >
                              <div 
                                style={{ 
                                  width: '100%',
                                  backgroundColor: bar.status === 'Completed' 
                                    ? '#10b981' 
                                    : bar.status === 'Delayed'
                                    ? '#f43f5e'
                                    : '#f59e0b'
                                }} 
                                className="h-full opacity-60"
                              />
                            </div>
                          )}

                          {/* Delay / Variance Indicator */}
                          {bar.varianceDays > 0 && (
                            <span 
                              style={{ left: bar.plannedLeft + bar.plannedWidth + 6, top: '7px' }}
                              className="absolute text-[8px] font-mono text-rose-500 font-bold bg-rose-500/10 px-1 py-0.2 rounded pointer-events-none"
                            >
                              +{bar.varianceDays}d Delay
                            </span>
                          )}
                          {bar.varianceDays < 0 && (
                            <span 
                              style={{ left: bar.plannedLeft + bar.plannedWidth + 6, top: '7px' }}
                              className="absolute text-[8px] font-mono text-emerald-500 font-bold bg-emerald-500/10 px-1 py-0.2 rounded pointer-events-none"
                            >
                              {bar.varianceDays}d Advance
                            </span>
                          )}
                        </>
                      )}

                      {/* BASELINE SNAPSHOT UNDERLAY */}
                      {showBaselineOverlay && bar.baselineLeft !== null && bar.baselineWidth !== null && (
                        <div 
                          style={{ left: bar.baselineLeft, width: bar.baselineWidth, top: '32px' }}
                          className="absolute h-0.5 bg-yellow-500/60 dark:bg-yellow-500/40 rounded-sm"
                          title="Baseline Snapshot"
                        />
                      )}

                      {/* Labels next to Gantt Bars */}
                      <span 
                        style={{ left: (bar.plannedLeft + bar.plannedWidth + (bar.varianceDays !== 0 ? 54 : 12)), top: '6px' }}
                        className="absolute text-[9px] font-bold text-[var(--text-secondary)] whitespace-nowrap opacity-75 group-hover:opacity-100 pointer-events-none"
                      >
                        {ganttShowTaskName && bar.activityName}
                        {ganttShowPercent && bar.completePercent > 0 && ` (${bar.completePercent}%)`} 
                        {ganttShowAssignee && bar.assignedToNames && ` [${bar.assignedToNames}]`}
                      </span>

                    </div>
                  );
                })}

                <div style={{ height: (filteredTasks.length - visibleIndices.end) * rowHeight }} />
              </div>

              {/* TODAY LINE */}
              {showTodayLine && todayLeft !== null && (
                <div 
                  style={{ left: todayLeft }} 
                  className="absolute top-10 bottom-0 w-[1.5px] bg-red-500 dark:bg-red-400 z-30 pointer-events-none"
                >
                  <div className="absolute top-0 -left-1 w-2.5 h-2.5 rounded-full bg-red-500 dark:bg-red-400" title={`Today: ${new Date().toLocaleDateString()}`} />
                </div>
              )}

            </div>
          </div>
        )}

      </div>

      {/* FOOTER TABBED ANALYTICS SHELF */}
      <div className="h-44 border-t border-[var(--border-subtle)] bg-[var(--surface)] flex flex-col shrink-0">
        <div className="flex border-b border-[var(--border-subtle)] bg-[var(--surface)] px-4 text-[11px] font-bold uppercase tracking-wider">
          {[
            { id: 'workload', label: 'Resource Loads', icon: Users },
            { id: 'releases', label: 'Versions & Milestones', icon: Layers },
            { id: 'followups', label: 'Reminders & Follow-ups', icon: Calendar },
            { id: 'progress_logs', label: 'Progress Logs', icon: Sparkles }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 border-b-2 -mb-[1px] transition-all ${activeSubTab === tab.id ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-[var(--bg)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 p-3 overflow-y-auto text-xs bg-[var(--bg)]">
          
          {/* RESOURCE LOAD PANEL */}
          {activeSubTab === 'workload' && (
            <div className="flex flex-col gap-1.5">
              <h4 className="font-bold text-[var(--text-muted)] uppercase text-[10px] tracking-wider">Workload Over-allocations</h4>
              {resourceOverallocations.length === 0 ? (
                <p className="text-emerald-500 flex items-center gap-1.5 font-bold"><CheckCircle size={13} /> Resource capacity loading is normal.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {resourceOverallocations.map(warn => (
                    <div key={warn.employeeId} className="flex items-center gap-2.5 p-2 bg-amber-500/10 border border-amber-900/40 rounded text-amber-600 dark:text-amber-300">
                      <AlertTriangle className="text-amber-500 shrink-0" size={14} />
                      <div>
                        <strong>{warn.employeeName}</strong>: {warn.details}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DELIVERABLES PANEL */}
          {activeSubTab === 'releases' && (
            <div className="flex flex-col gap-2">
              <h4 className="font-bold text-[var(--text-muted)] uppercase text-[10px] tracking-wider">Project Releases & Handover Checklist</h4>
              <div className="flex flex-wrap gap-2">
                {releases.map(rel => (
                  <div key={rel.id} className="p-2.5 bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg flex flex-col gap-0.5 min-w-[140px] shadow">
                    <span className="font-bold text-[var(--text-primary)]">{rel.name}</span>
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">Version: {rel.version || '1.0'}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">Target: {rel.release_date ? rel.release_date.split('T')[0] : 'N/A'}</span>
                  </div>
                ))}
                {releases.length === 0 && <p className="text-slate-500">No active releases configured.</p>}
              </div>
            </div>
          )}

          {/* FOLLOWUPS TAB */}
          {activeSubTab === 'followups' && (
            <div className="flex flex-col gap-1.5">
              <h4 className="font-bold text-[var(--text-muted)] uppercase text-[10px] tracking-wider">Follow-up Action Items</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] pb-1 uppercase font-bold">
                      <th className="py-1">WBS</th>
                      <th className="py-1">Task Name</th>
                      <th className="py-1">Follow-up Date</th>
                      <th className="py-1">Owner</th>
                      <th className="py-1">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.filter(t => t.followups && t.followups.length > 0).map(t => {
                      const f = t.followups[0];
                      return (
                        <tr key={t.id} className="border-b border-[var(--border-subtle)]/40 py-1 text-[var(--text-secondary)]">
                          <td className="py-1.5 font-bold text-indigo-600 dark:text-indigo-400">{t.wbs_code}</td>
                          <td className="py-1.5 font-semibold text-[var(--text-primary)]">{t.activity_name}</td>
                          <td className="py-1.5 font-mono">{f.follow_up_date ? f.follow_up_date.split('T')[0] : 'N/A'}</td>
                          <td className="py-1.5 font-medium">{f.owner}</td>
                          <td className="py-1.5 text-[var(--text-muted)] max-w-[320px] truncate">{f.notes}</td>
                        </tr>
                      );
                    })}
                    {tasks.filter(t => t.followups && t.followups.length > 0).length === 0 && (
                      <tr>
                        <td colSpan="5" className="py-3 text-center text-slate-500">No scheduled action items found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PROGRESS LOGS PANEL */}
          {activeSubTab === 'progress_logs' && (
            <div className="flex flex-col h-full gap-2 min-h-0">
              {selectedTaskId === null ? (
                <div className="flex items-center justify-center h-full text-[var(--text-muted)] italic">
                  Select a task in the spreadsheet grid to view and record progress logs.
                </div>
              ) : (() => {
                const activeLogTask = tasks.find(t => t.id === selectedTaskId);
                if (!activeLogTask) return null;
                const history = activeLogTask.custom_values?.progress_history || [];
                return (
                  <div className="flex gap-4 h-full min-h-0">
                    {/* Left Panel: Log list */}
                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="font-bold text-[var(--text-muted)] uppercase text-[10px] tracking-wider">
                          Progress History: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{activeLogTask.activity_name}</span>
                        </h4>
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-500 px-2 py-0.5 rounded font-mono font-bold">WBS: {activeLogTask.wbs_code}</span>
                      </div>
                      <div className="flex-1 overflow-y-auto border border-[var(--border-subtle)]/40 rounded custom-scrollbar">
                        <table className="w-full text-left text-[11px] border-collapse text-[var(--text-primary)]">
                          <thead className="bg-[var(--surface)] sticky top-0 border-b border-[var(--border-subtle)]/40 text-[var(--text-muted)]">
                            <tr>
                              <th className="px-2 py-1 font-bold">Date</th>
                              <th className="px-2 py-1 font-bold text-center">Progress %</th>
                              <th className="px-2 py-1 font-bold">Notes</th>
                              <th className="px-2 py-1 font-bold text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {history.map((entry, entryIdx) => (
                              <tr key={entryIdx} className="border-b border-[var(--border-subtle)]/20 hover:bg-[var(--table-hover)]/20">
                                <td className="px-2 py-1 font-mono text-[var(--text-secondary)]">{entry.date}</td>
                                <td className="px-2 py-1 text-center font-bold text-indigo-600 dark:text-indigo-400">{entry.complete_percent}%</td>
                                <td className="px-2 py-1 text-[var(--text-muted)] truncate max-w-[200px]" title={entry.notes}>{entry.notes || '—'}</td>
                                <td className="px-2 py-1 text-center">
                                  <button
                                    onClick={() => {
                                      setAndRollupTasks(prev => prev.map(t => {
                                        if (t.id === activeLogTask.id) {
                                          const nextHistory = (t.custom_values?.progress_history || []).filter((_, idx) => idx !== entryIdx);
                                          return {
                                            ...t,
                                            custom_values: {
                                              ...(t.custom_values || {}),
                                              progress_history: nextHistory
                                            }
                                          };
                                        }
                                        return t;
                                      }));
                                      toast.success("Log entry deleted.");
                                    }}
                                    className="text-slate-400 hover:text-rose-500 transition-colors"
                                    title="Delete Entry"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {history.length === 0 && (
                              <tr>
                                <td colSpan="4" className="py-4 text-center text-slate-500 italic">No progress logs recorded.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Right Panel: Record Form */}
                    <div className="w-80 bg-[var(--surface)] p-2.5 border border-[var(--border-subtle)]/40 rounded-lg flex flex-col gap-2 shrink-0 justify-between">
                      <h4 className="font-bold text-[var(--text-muted)] uppercase text-[9px] tracking-wider">Record Progress Log</h4>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] text-[var(--text-muted)] font-semibold">Log Date</span>
                          <input
                            type="date"
                            value={logDate}
                            onChange={e => setLogDate(e.target.value)}
                            className="px-2 py-1 border border-[var(--border-subtle)] bg-[var(--bg)] text-[var(--text-primary)] rounded font-mono text-[10px]"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] text-[var(--text-muted)] font-semibold">Progress %</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={logPercent}
                            onChange={e => setLogPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                            className="px-2 py-1 border border-[var(--border-subtle)] bg-[var(--bg)] text-[var(--text-primary)] rounded font-mono text-[10px] text-center"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-[var(--text-muted)] font-semibold">Comments / Notes</span>
                        <input
                          type="text"
                          placeholder="e.g. Completed foundations check..."
                          value={logNotes}
                          onChange={e => setLogNotes(e.target.value)}
                          className="px-2 py-1 border border-[var(--border-subtle)] bg-[var(--bg)] text-[var(--text-primary)] rounded text-[10px] outline-none"
                        />
                      </div>

                      <button
                        onClick={() => {
                          if (!logDate) {
                            toast.error("Log date is required.");
                            return;
                          }
                          handleAddProgressLog(activeLogTask.id, logDate, logPercent, logNotes);
                        }}
                        className="w-full flex items-center justify-center gap-1 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold shadow transition-colors text-[10px]"
                      >
                        <Sparkles size={11} /> Add Log Entry
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

        </div>
      </div>

      {/* DYNAMIC COLUMN BUILDER MODAL */}
      {showAddColModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-xl p-5 w-full max-w-xs flex flex-col gap-4 shadow-2xl text-xs text-[var(--text-primary)]">
            <h3 className="font-bold text-[var(--text-primary)] text-sm">Add Custom Grid Column</h3>
            
            <div className="flex flex-col gap-1">
              <label className="text-[var(--text-muted)] font-semibold">Column Key (English words only)</label>
              <input
                type="text"
                placeholder="e.g. priority_code"
                value={newColName}
                onChange={e => setNewColName(e.target.value)}
                className="w-full px-2.5 py-2 border border-[var(--border-subtle)] bg-[var(--bg)] rounded text-[var(--text-primary)] outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[var(--text-muted)] font-semibold">Display Title</label>
              <input
                type="text"
                placeholder="e.g. Priority Code"
                value={newColLabel}
                onChange={e => setNewColLabel(e.target.value)}
                className="w-full px-2.5 py-2 border border-[var(--border-subtle)] bg-[var(--bg)] rounded text-[var(--text-primary)] outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[var(--text-muted)] font-semibold">Data Type</label>
              <select
                value={newColType}
                onChange={e => setNewColType(e.target.value)}
                className="w-full px-2.5 py-2 border border-[var(--border-subtle)] bg-[var(--bg)] text-[var(--text-primary)] rounded outline-none"
              >
                <option value="text" className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">Text</option>
                <option value="number" className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">Number</option>
                <option value="date" className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">Date</option>
                <option value="select" className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">Dropdown List</option>
              </select>
            </div>

            {newColType === 'select' && (
              <div className="flex flex-col gap-1">
                <label className="text-[var(--text-muted)] font-semibold">Dropdown Options (Comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Critical, High, Low"
                  value={newColOptions}
                  onChange={e => setNewColOptions(e.target.value)}
                  className="w-full px-2.5 py-2 border border-[var(--border-subtle)] bg-[var(--bg)] rounded text-[var(--text-primary)] outline-none"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setShowAddColModal(false)}
                className="px-3 py-1.5 border border-[var(--border-subtle)] hover:bg-[var(--table-hover)] rounded font-bold text-[var(--text-muted)]"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomColumn}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold shadow"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOLLOW-UP DIALOG */}
      {editingFollowupTaskId !== null && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-xl p-5 w-full max-w-xs flex flex-col gap-4 shadow-2xl text-xs text-[var(--text-primary)]">
            <h3 className="font-bold text-[var(--text-primary)] text-sm">Schedule Follow-up Action</h3>

            <div className="flex flex-col gap-1">
              <label className="text-[var(--text-muted)] font-semibold">Action Date</label>
              <input
                type="date"
                value={followupDate}
                onChange={e => setFollowupDate(e.target.value)}
                className="w-full px-2.5 py-2 border border-[var(--border-subtle)] bg-[var(--bg)] rounded text-[var(--text-primary)] outline-none font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[var(--text-muted)] font-semibold">Owner</label>
              <input
                type="text"
                placeholder="Employee / Owner Name"
                value={followupOwner}
                onChange={e => setFollowupOwner(e.target.value)}
                className="w-full px-2.5 py-2 border border-[var(--border-subtle)] bg-[var(--bg)] rounded text-[var(--text-primary)] outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[var(--text-muted)] font-semibold">Action Notes</label>
              <textarea
                rows="3"
                placeholder="Specify follow-up details..."
                value={followupNotes}
                onChange={e => setFollowupNotes(e.target.value)}
                className="w-full px-2.5 py-2 border border-[var(--border-subtle)] bg-[var(--bg)] rounded text-[var(--text-primary)] outline-none resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setEditingFollowupTaskId(null)}
                className="px-3 py-1.5 border border-[var(--border-subtle)] hover:bg-[var(--table-hover)] rounded font-bold text-[var(--text-muted)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFollowup}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-bold shadow"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GANTT SETTINGS DIALOG */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#1e242b] border border-slate-700 rounded-xl p-5 w-full max-w-xs flex flex-col gap-4 shadow-2xl text-xs text-slate-200">
            <div className="flex justify-between items-center border-b border-slate-700 pb-2">
              <h3 className="font-bold text-white text-base">Show</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
            
            <div className="overflow-y-auto max-h-[60vh] pr-1 flex flex-col gap-4 custom-scrollbar">
              
              {/* SHOW FEATURE */}
              <div className="flex flex-col gap-2">
                <h4 className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Show Feature:</h4>
                <div className="flex flex-col gap-2 pl-1">
                  {[
                    { id: 'gantt', label: 'Gantt', val: tempShowGantt, set: setTempShowGantt },
                    { id: 'grid', label: 'Data Grid', val: tempShowDataGrid, set: setTempShowDataGrid },
                    { id: 'today', label: 'Today Line', val: tempShowTodayLine, set: setTempShowTodayLine },
                    { id: 'nonworking', label: 'Non-Working Day Shading', val: tempShowNonWorkingDayShading, set: setTempShowNonWorkingDayShading },
                    { id: 'overdue', label: 'Overdue Task Shading', val: tempShowOverdueTaskShading, set: setTempShowOverdueTaskShading },
                    { id: 'overallocation', label: 'Over-Allocation Message', val: tempShowOverAllocationMessage, set: setTempShowOverAllocationMessage },
                    { id: 'summarydelete', label: 'Summary Task Delete Message', val: tempShowSummaryDeleteMessage, set: setTempShowSummaryDeleteMessage },
                  ].map(f => (
                    <label key={f.id} className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white select-none">
                      <input
                        type="checkbox"
                        checked={f.val}
                        onChange={e => f.set(e.target.checked)}
                        className="rounded border-slate-600 bg-slate-800 text-[#a3e635] focus:ring-0 focus:ring-offset-0 size-3.5 accent-[#a3e635]"
                      />
                      <span className="text-xs font-semibold">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* SHOW ON GANTT BARS */}
              <div className="flex flex-col gap-2">
                <h4 className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Show on Gantt Bars:</h4>
                <div className="flex flex-col gap-2 pl-1">
                  {[
                    { id: 'taskname', label: 'Task Name', val: tempGanttShowTaskName, set: setTempGanttShowTaskName },
                    { id: 'percent', label: '% Complete', val: tempGanttShowPercent, set: setTempGanttShowPercent },
                    { id: 'assignee', label: 'Assignee', val: tempGanttShowAssignee, set: setTempGanttShowAssignee },
                  ].map(f => (
                    <label key={f.id} className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white select-none">
                      <input
                        type="checkbox"
                        checked={f.val}
                        onChange={e => f.set(e.target.checked)}
                        className="rounded border-slate-600 bg-slate-800 text-[#a3e635] focus:ring-0 focus:ring-offset-0 size-3.5 accent-[#a3e635]"
                      />
                      <span className="text-xs font-semibold">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* SHOW DATA */}
              <div className="flex flex-col gap-2">
                <h4 className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Show Data:</h4>
                <div className="flex flex-col gap-2 pl-1">
                  {['Planned', 'Actual', 'Baseline'].map(type => (
                    <label key={type} className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white select-none">
                      <input
                        type="radio"
                        name="showDataType"
                        checked={tempShowDataType === type}
                        onChange={() => setTempShowDataType(type)}
                        className="border-slate-600 bg-slate-800 text-[#a3e635] focus:ring-0 focus:ring-offset-0 size-3.5 accent-[#a3e635]"
                      />
                      <span className="text-xs font-semibold">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* ADVANCED */}
              <div className="flex flex-col gap-2">
                <h4 className="font-bold text-slate-400 uppercase text-[9px] tracking-wider">Advanced:</h4>
                <div className="flex flex-col gap-2 pl-1">
                  <label className="flex items-center gap-2.5 cursor-pointer text-slate-300 hover:text-white select-none">
                    <input
                      type="checkbox"
                      checked={tempSetBaselineChecked}
                      onChange={e => setTempSetBaselineChecked(e.target.checked)}
                      className="rounded border-slate-600 bg-slate-800 text-[#a3e635] focus:ring-0 focus:ring-offset-0 size-3.5 accent-[#a3e635]"
                    />
                    <span className="text-xs font-semibold">Set Baseline</span>
                  </label>
                </div>
              </div>

            </div>

            <div className="flex justify-end gap-2 border-t border-slate-700 pt-3">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-1.5 bg-[#3b4252] hover:bg-[#434c5e] text-white rounded font-bold transition-all text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-4 py-1.5 bg-[#a3e635] hover:bg-[#bef264] text-slate-900 rounded font-bold transition-all text-xs shadow-md font-sans"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-ACTIVITIES MODAL */}
      {activeParentTask && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-xl p-5 w-full max-w-5xl flex flex-col gap-4 shadow-2xl text-xs text-[var(--text-primary)] max-h-[85vh]">
            <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2.5">
              <h3 className="font-bold text-[var(--text-primary)] text-sm">
                Sub-Activities for: <span className="text-indigo-500 font-extrabold">{activeParentTask.activity_name}</span>
              </h3>
              <button 
                onClick={() => setActiveParentTask(null)} 
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="overflow-auto flex-1 min-h-[200px] border border-[var(--border-subtle)]/40 rounded-lg custom-scrollbar">
              <table className="w-full text-left border-collapse table-fixed select-text">
                <thead className="bg-[var(--surface)] text-[var(--text-secondary)] border-b border-[var(--border-subtle)] sticky top-0 z-10">
                  <tr className="h-8 text-[10px] uppercase font-bold text-[var(--text-muted)]">
                    <th className="w-12 px-2 text-center border-r border-[var(--border-subtle)]/30">WBS</th>
                    <th className="w-48 px-3 border-r border-[var(--border-subtle)]/30">Sub-Activity Name</th>
                    <th className="w-24 px-2 border-r border-[var(--border-subtle)]/30">Type</th>
                    <th className="w-28 px-2 border-r border-[var(--border-subtle)]/30">Start Date</th>
                    <th className="w-28 px-2 border-r border-[var(--border-subtle)]/30">End Date</th>
                    <th className="w-28 px-2 border-r border-[var(--border-subtle)]/30">Actual Start</th>
                    <th className="w-28 px-2 border-r border-[var(--border-subtle)]/30">Actual End</th>
                    <th className="w-16 px-2 border-r border-[var(--border-subtle)]/30 text-center">% Comp</th>
                    <th className="w-28 px-2 border-r border-[var(--border-subtle)]/30">Status</th>
                    <th className="w-40 px-2 border-r border-[var(--border-subtle)]/30">Assigned To</th>
                    <th className="w-16 px-2 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks
                    .filter(t => t.parent_id === activeParentTask.id)
                    .map((sub, sIdx) => {
                      const subWbs = `${activeParentTask.wbs_code || '1'}.${sIdx + 1}`;
                      return (
                        <tr key={sub.id} className="h-9 border-b border-[var(--border-subtle)]/20 hover:bg-[var(--table-hover)] transition-colors">
                          <td className="px-2 text-center border-r border-[var(--border-subtle)]/20 font-mono text-[10px] text-[var(--text-muted)] font-bold">{subWbs}</td>
                          
                          <td className="px-3 border-r border-[var(--border-subtle)]/20">
                            <input
                              type="text"
                              value={sub.activity_name || ''}
                              onChange={e => handleCellChange(sub.id, 'activity_name', e.target.value)}
                              className="w-full bg-transparent border-0 outline-none text-[var(--text-primary)]"
                            />
                          </td>

                          <td className="px-2 border-r border-[var(--border-subtle)]/20">
                            <select
                              value={sub.task_type || 'sub_activity'}
                              onChange={e => handleCellChange(sub.id, 'task_type', e.target.value)}
                              className="w-full bg-transparent border-0 outline-none text-[var(--text-primary)] font-semibold"
                            >
                              <option value="sub_activity" className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">Sub Activity</option>
                              <option value="activity" className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">Activity</option>
                              <option value="milestone" className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">Milestone</option>
                              <option value="phase" className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">Phase</option>
                            </select>
                          </td>

                          <td className="px-2 border-r border-[var(--border-subtle)]/20 font-mono">
                            <input
                              type="date"
                              value={sub.start_date ? sub.start_date.split('T')[0] : ''}
                              onChange={e => handleCellChange(sub.id, 'start_date', e.target.value)}
                              className="w-full bg-transparent border-0 outline-none text-[var(--text-primary)] font-mono text-[11px]"
                            />
                          </td>

                          <td className="px-2 border-r border-[var(--border-subtle)]/20 font-mono">
                            <input
                              type="date"
                              value={sub.end_date ? sub.end_date.split('T')[0] : ''}
                              onChange={e => handleCellChange(sub.id, 'end_date', e.target.value)}
                              className="w-full bg-transparent border-0 outline-none text-[var(--text-primary)] font-mono text-[11px]"
                            />
                          </td>

                          <td className="px-2 border-r border-[var(--border-subtle)]/20 font-mono">
                            <input
                              type="date"
                              value={sub.actual_start ? sub.actual_start.split('T')[0] : ''}
                              onChange={e => handleCellChange(sub.id, 'actual_start', e.target.value)}
                              className="w-full bg-transparent border-0 outline-none text-[var(--text-primary)] font-mono text-[11px]"
                            />
                          </td>

                          <td className="px-2 border-r border-[var(--border-subtle)]/20 font-mono">
                            <input
                              type="date"
                              value={sub.actual_end ? sub.actual_end.split('T')[0] : ''}
                              onChange={e => handleCellChange(sub.id, 'actual_end', e.target.value)}
                              className="w-full bg-transparent border-0 outline-none text-[var(--text-primary)] font-mono text-[11px]"
                            />
                          </td>

                          <td className="px-2 border-r border-[var(--border-subtle)]/20 text-center font-mono">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={sub.complete_percent || 0}
                              onChange={e => handleCellChange(sub.id, 'complete_percent', parseFloat(e.target.value) || 0)}
                              className="w-full bg-transparent border-0 outline-none text-center text-[var(--text-primary)] font-semibold"
                            />
                          </td>

                          <td className="px-2 border-r border-[var(--border-subtle)]/20">
                            <select
                              value={sub.status || 'Not Started'}
                              onChange={e => handleCellChange(sub.id, 'status', e.target.value)}
                              className="w-full bg-transparent border-0 outline-none text-[var(--text-primary)] font-semibold"
                            >
                              {['Not Started', 'In Progress', 'Completed', 'On Hold'].map(s => (
                                <option key={s} value={s} className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">{s}</option>
                              ))}
                            </select>
                          </td>

                          <td className="px-2 border-r border-[var(--border-subtle)]/20 truncate">
                            <button
                              onClick={() => setActiveAssignTask(sub)}
                              className="w-full text-left truncate hover:text-indigo-500 font-medium py-1 text-[11px]"
                            >
                              {sub.assigned_to && sub.assigned_to.length > 0 ? (
                                sub.assigned_to.map(uid => {
                                  const emp = projectTeam.find(e => String(e.employee_id) === String(uid));
                                  return emp ? emp.employee_name : uid;
                                }).join(', ')
                              ) : (
                                <span className="text-[var(--text-muted)] italic text-[11px]">Unassigned</span>
                              )}
                            </button>
                          </td>

                          <td className="px-2 text-center">
                            <button
                              onClick={() => handleDeleteSubActivity(sub.id)}
                              className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                              title="Delete Sub-Activity"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  {tasks.filter(t => t.parent_id === activeParentTask.id).length === 0 && (
                    <tr>
                      <td colSpan="11" className="py-6 text-center text-[var(--text-muted)] italic">
                        No sub-activities configured. Click "Add Sub-Activity" to begin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mt-3">
              <button
                onClick={handleAddSubActivity}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md transition-colors"
              >
                <Plus size={13} /> Add Sub-Activity
              </button>

              <button
                onClick={() => setActiveParentTask(null)}
                className="px-4 py-1.5 bg-[var(--surface)] hover:bg-[var(--table-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg font-bold transition-all"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGNED TO CHECKLIST MODAL */}
      {activeAssignTask && (() => {
        const liveTask = tasks.find(t => t.id === activeAssignTask.id) || activeAssignTask;
        return (
          <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
            <div className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded-xl p-5 w-full max-w-sm flex flex-col gap-4 shadow-2xl text-xs text-[var(--text-primary)]">
              <div className="flex justify-between items-center border-b border-[var(--border-subtle)] pb-2">
                <h3 className="font-bold text-[var(--text-primary)] text-sm truncate">
                  Assign Team: <span className="text-indigo-500 font-extrabold">{activeAssignTask.activity_name}</span>
                </h3>
                <button 
                  onClick={() => setActiveAssignTask(null)} 
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Manual Override Checkbox */}
              <div className="flex items-center justify-between p-2.5 bg-slate-500/5 border border-[var(--border-subtle)]/30 rounded-lg">
                <span className="font-semibold text-xs text-[var(--text-secondary)]">Manual Progress Override</span>
                <input
                  type="checkbox"
                  checked={activeAssignTask.custom_values?.manual_completion_override || false}
                  onChange={e => {
                    const val = e.target.checked;
                    handleCellChange(activeAssignTask.id, 'custom:manual_completion_override', val);
                    setActiveAssignTask(prev => ({
                      ...prev,
                      custom_values: {
                        ...(prev.custom_values || {}),
                        manual_completion_override: val
                      }
                    }));
                  }}
                  className="rounded border-[var(--border-subtle)] text-indigo-600 focus:ring-0 size-3.5"
                />
              </div>

              <div className="overflow-y-auto max-h-[40vh] pr-1 flex flex-col gap-2.5 custom-scrollbar">
                {projectTeam.map(member => {
                  const isAssigned = (activeAssignTask.assigned_to || []).includes(String(member.employee_id));
                  return (
                    <div 
                      key={member.employee_id} 
                      className="flex flex-col gap-2.5 p-2 rounded hover:bg-[var(--table-hover)]/30 border border-[var(--border-subtle)]/10"
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isAssigned}
                          onChange={e => {
                            const currentAssigned = activeAssignTask.assigned_to || [];
                            let nextAssigned;
                            if (e.target.checked) {
                              nextAssigned = [...currentAssigned, String(member.employee_id)];
                            } else {
                              nextAssigned = currentAssigned.filter(id => String(id) !== String(member.employee_id));
                            }
                            
                            handleCellChange(activeAssignTask.id, 'assigned_to', nextAssigned);
                            setActiveAssignTask(prev => ({ ...prev, assigned_to: nextAssigned }));
                          }}
                          className="rounded border-[var(--border-subtle)] text-indigo-600 focus:ring-0 size-3.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold truncate text-[var(--text-primary)]">{member.employee_name}</div>
                          <div className="text-[9px] text-[var(--text-muted)] flex items-center gap-1.5">
                            <span className="font-semibold text-indigo-400">{member.role}</span>
                            <span>•</span>
                            <span>{member.employee_department}</span>
                          </div>
                        </div>
                      </div>

                      {isAssigned && !activeAssignTask.custom_values?.manual_completion_override && (
                        <div className="flex items-center gap-4 pl-6 border-t border-[var(--border-subtle)]/15 pt-2">
                          <div className="flex items-center gap-1 flex-1">
                            <span className="text-[9px] text-[var(--text-muted)] font-semibold">Weight:</span>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={activeAssignTask.custom_values?.resource_weights?.[member.employee_id] !== undefined ? activeAssignTask.custom_values.resource_weights[member.employee_id] : 1}
                              onChange={e => {
                                const weightVal = parseFloat(e.target.value) || 0;
                                const currentWeights = activeAssignTask.custom_values?.resource_weights || {};
                                const newWeights = { ...currentWeights, [member.employee_id]: weightVal };
                                handleCellChange(activeAssignTask.id, 'custom:resource_weights', newWeights);
                                setActiveAssignTask(prev => ({
                                  ...prev,
                                  custom_values: {
                                    ...(prev.custom_values || {}),
                                    resource_weights: newWeights
                                  }
                                }));
                              }}
                              className="w-14 px-1 py-0.5 border border-[var(--border-subtle)] bg-[var(--bg)] text-[var(--text-primary)] rounded font-semibold text-center focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                            />
                          </div>

                          <div className="flex items-center gap-1 flex-1">
                            <span className="text-[9px] text-[var(--text-muted)] font-semibold">Prog %:</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={activeAssignTask.custom_values?.resource_progress?.[member.employee_id] !== undefined ? activeAssignTask.custom_values.resource_progress[member.employee_id] : 0}
                              onChange={e => {
                                const progVal = parseFloat(e.target.value) || 0;
                                const currentProg = activeAssignTask.custom_values?.resource_progress || {};
                                const newProg = { ...currentProg, [member.employee_id]: progVal };
                                handleCellChange(activeAssignTask.id, 'custom:resource_progress', newProg);
                                setActiveAssignTask(prev => ({
                                  ...prev,
                                  custom_values: {
                                    ...(prev.custom_values || {}),
                                    resource_progress: newProg
                                  }
                                }));
                              }}
                              className="w-14 px-1 py-0.5 border border-[var(--border-subtle)] bg-[var(--bg)] text-[var(--text-primary)] rounded font-semibold text-center focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {projectTeam.length === 0 && (
                  <p className="text-center text-[var(--text-muted)] italic py-4">No project team members configured.</p>
                )}
              </div>

              {/* Live Status and Percent Complete summary */}
              <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-2.5 text-[10px] font-bold">
                <div className="flex items-center gap-1">
                  <span className="text-[var(--text-muted)] uppercase">Progress:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-mono text-xs">{liveTask.complete_percent || 0}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[var(--text-muted)] uppercase">Status:</span>
                  <span className="text-indigo-600 dark:text-indigo-400 text-xs tracking-wide">{liveTask.status || 'Not Started'}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-3">
                <button
                  onClick={() => setActiveAssignTask(null)}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* DEPARTMENT SUGGESTIONS DATALIST */}
      <datalist id="departments-list">
        {suggestedDepartments.map(d => (
          <option key={d} value={d} />
        ))}
      </datalist>

    </div>
  );
};

export default MilestoneManagement;
