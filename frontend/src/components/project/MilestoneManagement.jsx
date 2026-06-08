import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, Trash2, ChevronRight, ChevronLeft, ChevronDown, AlignLeft,
  ZoomIn, ZoomOut, AlertTriangle, Calendar, Users, 
  CheckCircle, RefreshCw, Save, FolderPlus, Layers, Edit,
  ChevronUp, User, LayoutGrid, CheckSquare, Square, Eye, Sparkles, X,
  Settings, Columns, Table, BarChart3
} from 'lucide-react';
import API from '../../utils/api';
import { getEmployees } from '../../utils/employeeApi';
import { toast } from 'react-hot-toast';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

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

  // Floating Gantt Tooltip States
  const [hoveredTask, setHoveredTask] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Edit popup modal (replaces inline cell editing)
  const [editModalTaskId, setEditModalTaskId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  // Footer analytics shelf resize / collapse
  const [footerHeight, setFooterHeight] = useState(176);
  const [footerCollapsed, setFooterCollapsed] = useState(false);
  const isFooterResizing = useRef(false);

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
  const [showMetricsDashboard, setShowMetricsDashboard] = useState(false);

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
  const [tempShowBaselineOverlay, setTempShowBaselineOverlay] = useState(true);
  const [tempBaselineVersion, setTempBaselineVersion] = useState('Baseline_V1');

  // Row height matching dense MS Project layout
  const rowHeight = 56;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (showDataGrid && gridRef.current && gridRef.current.scrollTop !== scrollTop) {
        gridRef.current.scrollTop = scrollTop;
      }
      if (showGantt && ganttRef.current && ganttRef.current.scrollTop !== scrollTop) {
        ganttRef.current.scrollTop = scrollTop;
      }
    }, 40);
    return () => clearTimeout(timer);
  }, [showDataGrid, showGantt]);

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
    setTempShowBaselineOverlay(showBaselineOverlay);
    setTempBaselineVersion(baselineVersion);
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
    setShowBaselineOverlay(tempShowBaselineOverlay);
    setBaselineVersion(tempBaselineVersion);
    setShowSettingsModal(false);

    if (tempSetBaselineChecked) {
      await handleCreateBaseline(tempBaselineVersion);
    }
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Fetch all required project details in parallel
      const [mRes, cRes, rRes, empRes, teamResResult] = await Promise.all([
        API.get(`/projects/${project.project_id}/milestones`),
        API.get(`/projects/${project.project_id}/milestones/columns`),
        API.get(`/projects/${project.project_id}/releases`),
        getEmployees(),
        API.get(`/projects/${project.project_id}/team`).catch(teamError => {
          console.error("Failed to load project team:", teamError);
          return { data: [] };
        })
      ]);

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

      setCustomColumns(cRes.data || []);
      setReleases(rRes.data || []);
      setEmployees(empRes.data || []);
      setProjectTeam(teamResResult.data || []);

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

  const handleDeleteSpecificTask = (task) => {
    const hasChildren = tasks.some(t => t.parent_id === task.id);
    if (hasChildren) {
      alert("Cannot delete task because it has child tasks. Please delete or reassign child tasks first.");
      return;
    }

    if (task.item_type === 'Phase' && showSummaryDeleteMessage) {
      if (!window.confirm("Summary task has nested sub-tasks. Are you sure you want to delete this summary task?")) {
        return;
      }
    }

    setAndRollupTasks(prev => {
      const filtered = prev.filter(t => t.id !== task.id);
      return filtered.map((t, idx) => ({ ...t, row_order: idx }));
    });
    setDependencies(prev => prev.filter(d => d.predecessor_task_id !== task.id && d.successor_task_id !== task.id));
    if (selectedTaskId === task.id) {
      setSelectedTaskId(null);
    }
  };

  // Open the edit popup for a specific task (replaces inline cell editing)
  const handleEditSpecificTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const toInput = (d) => (d ? d.split('T')[0] : '');
    const predStr = task.dependencies_as_successor
      ? task.dependencies_as_successor.map(d => {
          const predTaskIdx = filteredTasks.findIndex(pt => pt.id === d.predecessor_task_id);
          const lagText = d.lag_days !== 0 ? `${d.lag_days > 0 ? '+' : ''}${d.lag_days}d` : '';
          return predTaskIdx !== -1 ? `${predTaskIdx + 1}${d.type}${lagText}` : '';
        }).filter(Boolean).join(', ')
      : '';
    setEditDraft({
      id: task.id,
      activity_name: task.activity_name || '',
      item_type: task.item_type || 'Task',
      department: task.department || '',
      status: task.status || 'Not Started',
      complete_percent: task.complete_percent || 0,
      start_date: toInput(task.start_date),
      end_date: toInput(task.end_date),
      actual_start: toInput(task.actual_start),
      actual_end: toInput(task.actual_end),
      pin_type: task.custom_values?.pin_type || '',
      custom_values: { ...(task.custom_values || {}) },
      _predStr: predStr,
      _isParent: task.item_type === 'Phase' || tasks.some(t => t.parent_id === task.id),
      _hasResources: task.assigned_to && task.assigned_to.length > 0,
      _manualOverride: !!task.custom_values?.manual_completion_override,
    });
    setSelectedTaskId(taskId);
    setEditModalTaskId(taskId);
  };

  const closeEditModal = () => {
    setEditModalTaskId(null);
    setEditDraft(null);
  };

  const updateDraft = (field, value) => {
    setEditDraft(prev => (prev ? { ...prev, [field]: value } : prev));
  };

  const updateDraftCustom = (colName, value) => {
    setEditDraft(prev => (prev ? { ...prev, custom_values: { ...(prev.custom_values || {}), [colName]: value } } : prev));
  };

  // Apply all popup edits in a single batched recalculation (hang-free)
  const saveEditModal = () => {
    if (!editDraft) return;
    const draft = editDraft;
    setAndRollupTasks(prev => prev.map(t => {
      if (t.id !== draft.id) return t;
      const updated = { ...t };
      updated.activity_name = draft.activity_name;
      updated.item_type = draft.item_type;
      updated.department = draft.department;
      updated.status = draft.status;
      updated.complete_percent = parseFloat(draft.complete_percent) || 0;
      ['start_date', 'end_date', 'actual_start', 'actual_end'].forEach(f => {
        updated[f] = draft[f] ? new Date(draft[f]).toISOString() : null;
      });
      updated.custom_values = {
        ...(t.custom_values || {}),
        ...(draft.custom_values || {}),
        pin_type: draft.pin_type || '',
      };
      return updated;
    }));

    // Re-parse predecessors string into dependency edges
    const parts = (draft._predStr || '').split(',').map(s => s.trim()).filter(Boolean);
    const parsedDeps = [];
    parts.forEach(part => {
      const match = part.match(/^(\d+)(FS|SS|FF|SF)?(?:([\+\-]\d+)d)?$/i);
      if (match) {
        const predRowIdx = parseInt(match[1]) - 1;
        const depType = (match[2] || 'FS').toUpperCase();
        const lagVal = match[3] ? parseInt(match[3]) : 0;
        const predTask = filteredTasks[predRowIdx];
        if (predTask && predTask.id !== draft.id) {
          parsedDeps.push({ predecessor_task_id: predTask.id, successor_task_id: draft.id, type: depType, lag_days: lagVal });
        }
      }
    });
    setDependencies(prev => {
      const filtered = prev.filter(d => d.successor_task_id !== draft.id);
      return [...filtered, ...parsedDeps];
    });

    closeEditModal();
  };

  // Footer analytics shelf vertical resize handlers
  const startFooterResize = (e) => {
    e.preventDefault();
    isFooterResizing.current = true;
    document.addEventListener('mousemove', handleFooterResize);
    document.addEventListener('mouseup', endFooterResize);
  };

  const handleFooterResize = (e) => {
    if (!isFooterResizing.current) return;
    const h = window.innerHeight - e.clientY;
    setFooterHeight(Math.max(44, Math.min(h, window.innerHeight - 200)));
    setFooterCollapsed(false);
  };

  const endFooterResize = () => {
    isFooterResizing.current = false;
    document.removeEventListener('mousemove', handleFooterResize);
    document.removeEventListener('mouseup', endFooterResize);
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

  const handleCreateBaseline = async (versionToUse = baselineVersion) => {
    try {
      setSaving(true);
      await API.post(`/projects/${project.project_id}/baselines/create`, {
        version_name: versionToUse
      });
      fetchInitialData();
      toast.success(`Baseline snapshot [${versionToUse}] generated.`);
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
      return { border: 'border-[#0ea5e9]', text: 'text-[#0ea5e9]', fill: '#0ea5e9', light: 'bg-[#0ea5e9]/10' };
    } else if (name.includes('design') || name.includes('engineering')) {
      return { border: 'border-[#3b82f6]', text: 'text-[#3b82f6]', fill: '#3b82f6', light: 'bg-[#3b82f6]/10' };
    } else if (name.includes('procurement')) {
      return { border: 'border-[#8b5cf6]', text: 'text-[#8b5cf6]', fill: '#8b5cf6', light: 'bg-[#8b5cf6]/10' };
    } else if (name.includes('construction') || name.includes('manufacturing')) {
      return { border: 'border-[#f97316]', text: 'text-[#f97316]', fill: '#f97316', light: 'bg-[#f97316]/10' };
    } else if (name.includes('closing') || name.includes('post') || name.includes('handover')) {
      return { border: 'border-[#10b981]', text: 'text-[#10b981]', fill: '#10b981', light: 'bg-[#10b981]/10' };
    }
    return { border: 'border-[#14b8a6]', text: 'text-[#14b8a6]', fill: '#14b8a6', light: 'bg-[#14b8a6]/10' };
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

      const isOverdue = showOverdueTaskShading && (t.status === 'Delayed' || varianceDays > 0);

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
        isOverdue,
        startDateStr: plannedStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        plannedStartStr: plannedStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        plannedEndStr: plannedEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        actualStartStr: t.actual_start ? new Date(t.actual_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not Started',
        actualEndStr: t.actual_end ? new Date(t.actual_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : (t.actual_start ? 'In Progress' : 'N/A'),
        duration: Math.ceil((plannedEnd - plannedStart) / 86400000) || 1
      };
    });
  }, [filteredTasks, timelineStart, pxPerDay, baselineVersion, projectTeam, tasks, showOverdueTaskShading]);

  // SVG Connector Lines
  const dependencyLines = useMemo(() => {
    const lines = [];
    const barsMap = {};
    ganttBars.forEach((b, idx) => {
      if (b) barsMap[b.id] = { bar: b, index: idx };
    });

    const isActualMode = showDataType === 'Actual';

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

      // Skip dependency line in actual mode if either bar doesn't have an actual start date
      if (isActualMode && (pred.actualLeft === null || succ.actualLeft === null)) {
        return;
      }

      // Vertical center offset of active bar is 24px (top 20px + 4px half-height)
      const yOffset = 24;
      const y1 = predIdx * rowHeight + yOffset;
      const y2 = succIdx * rowHeight + yOffset;

      // Adjust terminal points by 5px so arrowheads touch the borders instead of clipping
      let x1 = isActualMode ? pred.actualLeft + pred.actualWidth : pred.plannedLeft + pred.plannedWidth;
      let x2 = (isActualMode ? succ.actualLeft : succ.plannedLeft) - 5;

      if (d.type === 'SS') {
        x1 = isActualMode ? pred.actualLeft : pred.plannedLeft;
        x2 = (isActualMode ? succ.actualLeft : succ.plannedLeft) - 5;
      } else if (d.type === 'FF') {
        x1 = isActualMode ? pred.actualLeft + pred.actualWidth : pred.plannedLeft + pred.plannedWidth;
        x2 = (isActualMode ? succ.actualLeft + succ.actualWidth : succ.plannedLeft + succ.plannedWidth) + 5;
      } else if (d.type === 'SF') {
        x1 = isActualMode ? pred.actualLeft : pred.plannedLeft;
        x2 = (isActualMode ? succ.actualLeft + succ.actualWidth : succ.plannedLeft + succ.plannedWidth) + 5;
      }

      const isCriticalLink = pred.isCritical && succ.isCritical;
      const color = isCriticalLink ? '#ef4444' : '#94a3b8';

      let path = '';
      const midwayY = y1 + (y2 - y1) / 2;
      const dx = x2 - x1;

      if (d.type === 'FS') {
        if (dx >= 12) {
          path = `M ${x1} ${y1} H ${x1 + 8} V ${y2} H ${x2}`;
        } else {
          path = `M ${x1} ${y1} H ${x1 + 8} V ${midwayY} H ${x2 - 8} V ${y2} H ${x2}`;
        }
      } else if (d.type === 'SS') {
        const minX = Math.min(x1, x2) - 8;
        path = `M ${x1} ${y1} H ${minX} V ${y2} H ${x2}`;
      } else if (d.type === 'FF') {
        const maxX = Math.max(x1, x2) + 8;
        path = `M ${x1} ${y1} H ${maxX} V ${y2} H ${x2}`;
      } else if (d.type === 'SF') {
        path = `M ${x1} ${y1} H ${x1 - 8} V ${midwayY} H ${x2 + 8} V ${y2} H ${x2}`;
      } else {
        path = `M ${x1} ${y1} L ${x2} ${y2}`;
      }

      lines.push({
        id: `link-${depIdx}`,
        d: path,
        color,
        isCriticalLink
      });
    });

    return lines;
  }, [ganttBars, dependencies, visibleIndices, rowHeight, showDataType]);

  const getSCurveOption = () => {
    const validTasks = tasks.filter(t => t.start_date && t.end_date);
    if (validTasks.length === 0) {
      return {
        title: { text: 'No date data available', left: 'center', top: 'center', textStyle: { color: '#6b7280', fontSize: 11 } }
      };
    }

    const startDates = validTasks.map(t => new Date(t.start_date));
    const endDates = validTasks.map(t => new Date(t.end_date));
    const minDate = new Date(Math.min(...startDates));
    const maxDate = new Date(Math.max(...endDates));
    
    const intervals = 8;
    const xAxisData = [];
    const plannedData = [];
    const actualData = [];

    for (let i = 0; i <= intervals; i++) {
      const checkDate = new Date(minDate.getTime() + (maxDate - minDate) * (i / intervals));
      const dateStr = `${checkDate.getDate()}/${checkDate.getMonth() + 1}`;
      xAxisData.push(dateStr);

      let totalWeight = 0;
      let cumulativePlannedProgress = 0;
      let cumulativeActualProgress = 0;

      validTasks.forEach(t => {
        const duration = Math.ceil((new Date(t.end_date) - new Date(t.start_date)) / 86400000) || 1;
        const weight = duration;
        totalWeight += weight;

        const pStart = new Date(t.start_date);
        const pEnd = new Date(t.end_date);
        let plannedPct = 0;
        if (checkDate >= pEnd) {
          plannedPct = 100;
        } else if (checkDate >= pStart) {
          plannedPct = (checkDate - pStart) / (pEnd - pStart) * 100;
        }
        cumulativePlannedProgress += (plannedPct * weight);

        let actualPct = 0;
        if (t.status === 'Completed' && t.actual_end && new Date(t.actual_end) <= checkDate) {
          actualPct = 100;
        } else {
          const history = t.custom_values?.progress_history || [];
          const pastEntries = history.filter(h => h.date && new Date(h.date) <= checkDate);
          if (pastEntries.length > 0) {
            pastEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
            actualPct = pastEntries[0].complete_percent || 0;
          } else if (t.actual_start && new Date(t.actual_start) <= checkDate) {
            actualPct = 10;
          }
        }
        cumulativeActualProgress += (actualPct * weight);
      });

      plannedData.push(Math.round((cumulativePlannedProgress / (totalWeight || 1)) * 10) / 10);
      actualData.push(Math.round((cumulativeActualProgress / (totalWeight || 1)) * 10) / 10);
    }

    return {
      tooltip: { trigger: 'axis', backgroundColor: '#1e293b', borderColor: '#475569', textStyle: { color: '#f8fafc', fontSize: 10 } },
      legend: { data: ['Planned (S-Curve)', 'Actual Progress'], textStyle: { color: '#94a3b8', fontSize: 9 }, top: 0 },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true, top: '15%' },
      xAxis: { type: 'category', data: xAxisData, axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8', fontSize: 8 } },
      yAxis: { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%', color: '#94a3b8', fontSize: 8 }, splitLine: { lineStyle: { color: '#1e293b' } } },
      series: [
        { 
          name: 'Planned (S-Curve)', 
          type: 'line', 
          data: plannedData, 
          smooth: true, 
          lineStyle: { width: 2, color: '#3b82f6' }, 
          itemStyle: { color: '#3b82f6' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.15)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0)' }
            ])
          }
        },
        { name: 'Actual Progress', type: 'line', data: actualData, smooth: true, lineStyle: { width: 2, color: '#10b981' }, itemStyle: { color: '#10b981' } }
      ]
    };
  };

  const getResourceWorkloadOption = () => {
    const resourceCounts = {};
    const completedCounts = {};
    
    tasks.forEach(t => {
      if (t.assigned_to && t.assigned_to.length > 0) {
        t.assigned_to.forEach(uid => {
          const emp = projectTeam.find(e => String(e.employee_id) === String(uid));
          const name = emp ? emp.employee_name : uid;
          
          resourceCounts[name] = (resourceCounts[name] || 0) + 1;
          if (t.status === 'Completed') {
            completedCounts[name] = (completedCounts[name] || 0) + 1;
          } else {
            completedCounts[name] = completedCounts[name] || 0;
          }
        });
      }
    });

    const names = Object.keys(resourceCounts);
    if (names.length === 0) {
      return {
        title: { text: 'No resource assignments', left: 'center', top: 'center', textStyle: { color: '#6b7280', fontSize: 11 } }
      };
    }

    const totalTasks = names.map(n => resourceCounts[n]);
    const completedTasks = names.map(n => completedCounts[n]);

    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: '#1e293b', borderColor: '#475569', textStyle: { color: '#f8fafc', fontSize: 10 } },
      legend: { data: ['Total Assigned', 'Completed'], textStyle: { color: '#94a3b8', fontSize: 9 }, top: 0 },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true, top: '15%' },
      xAxis: { type: 'category', data: names, axisLine: { lineStyle: { color: '#334155' } }, axisLabel: { color: '#94a3b8', fontSize: 8, rotate: 20 } },
      yAxis: { type: 'value', minInterval: 1, axisLabel: { color: '#94a3b8', fontSize: 8 }, splitLine: { lineStyle: { color: '#1e293b' } } },
      series: [
        { name: 'Total Assigned', type: 'bar', data: totalTasks, itemStyle: { color: '#8b5cf6', borderRadius: [4, 4, 0, 0] }, barWidth: '40%' },
        { name: 'Completed', type: 'bar', data: completedTasks, itemStyle: { color: '#10b981', borderRadius: [4, 4, 0, 0] }, barWidth: '40%', barGap: '10%' }
      ]
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] w-full bg-[var(--bg)] font-sans">
        <div className="page-transition-loader">
          <div className="page-transition-spinner">
            <div className="spinner-ring"></div>
            <div className="spinner-ring-2"></div>
            <div className="spinner-ring-3"></div>
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading schedule...</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{ fontFamily: 'var(--font-inter), sans-serif' }}
      className="flex flex-col h-full bg-[var(--bg)] text-[var(--text-primary)] select-none antialiased text-xs transition-colors duration-200"
    >
      
      {/* PROFESSIONAL SCHEDULING CONTROL PANEL */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-[var(--surface)] border-b border-[var(--border-subtle)] shrink-0 sticky top-0 z-30">
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
            className="flex items-center gap-1 px-3 py-1.5 bg-[var(--surface)] hover:bg-[var(--table-hover)] text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg font-bold transition-all"
            title="Gantt Settings"
          >
            <Settings size={13} /> Settings
          </button>

          <button
            onClick={() => setShowMetricsDashboard(prev => !prev)}
            className={`flex items-center gap-1 px-3 py-1.5 border border-[var(--border-subtle)] rounded-lg font-bold transition-all ${
              showMetricsDashboard 
                ? 'bg-indigo-600/15 border-indigo-500 text-indigo-400 shadow' 
                : 'bg-[var(--surface)] hover:bg-[var(--table-hover)] text-[var(--text-primary)]'
            }`}
            title="Toggle Schedule Analytics"
          >
            <Sparkles size={13} /> Analytics
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

          {/* Layout Mode Control */}
          <div className="flex items-center bg-[var(--bg)] border border-[var(--border-subtle)] p-0.5 rounded-lg font-bold text-xs" title="Select layout view">
            {[
              { id: 'split', label: 'Split View', icon: <Columns size={13} />, grid: true, gantt: true },
              { id: 'table', label: 'Max Table', icon: <Table size={13} />, grid: true, gantt: false },
              { id: 'chart', label: 'Max Chart', icon: <BarChart3 size={13} />, grid: false, gantt: true }
            ].map(mode => {
              const active = (mode.grid === showDataGrid && mode.gantt === showGantt);
              return (
                <button
                  key={mode.id}
                  onClick={() => {
                    setShowDataGrid(mode.grid);
                    setShowGantt(mode.gantt);
                    setHoveredTask(null);
                  }}
                  className={`px-3 py-1 rounded transition-all flex items-center gap-1.5 ${
                    active 
                      ? 'bg-indigo-600 text-white shadow' 
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {mode.icon}
                  <span>{mode.label}</span>
                </button>
              );
            })}
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
      <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-2 bg-[var(--elevated-card)] border-b border-[var(--border-subtle)] text-[11px] text-[var(--text-secondary)] sticky top-[52px] z-[25]">
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

      {/* COLLAPSIBLE ECHARTS SUMMARY DASHBOARD */}
      {showMetricsDashboard && (
        <div className="bg-[var(--surface)] border-b border-[var(--border-subtle)] p-4 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles size={13} className="text-indigo-500" /> Project Schedule Analytics
            </h3>
            <button 
              onClick={() => setShowMetricsDashboard(false)}
              className="text-[10px] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] uppercase bg-[var(--bg)] border border-[var(--border-subtle)] px-2 py-0.5 rounded transition-all"
            >
              Hide Dashboard
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chart 1: S-Curve */}
            <div className="bg-[var(--bg)] p-3 border border-[var(--border-subtle)] rounded-xl h-60 flex flex-col">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Schedule S-Curve (Planned vs Actual Completion)</span>
              <div className="flex-1 min-h-0">
                <ReactECharts option={getSCurveOption()} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>

            {/* Chart 2: Resource Workload */}
            <div className="bg-[var(--bg)] p-3 border border-[var(--border-subtle)] rounded-xl h-60 flex flex-col">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Resource Workload (Total Assigned vs Completed Tasks)</span>
              <div className="flex-1 min-h-0">
                <ReactECharts option={getResourceWorkloadOption()} style={{ height: '100%', width: '100%' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DENSE GRID & GANTT SPLIT WRAPPER */}
      <div className="flex-1 min-h-0 flex relative bg-[var(--bg)] text-[var(--text-primary)]">
        
        {/* SPREADSHEET TABLE GRID */}
        {showDataGrid && (
          <div 
            style={{ width: showGantt ? tableWidth : '100%' }}
            className="h-full shrink-0 border-r border-slate-200 dark:border-slate-800 relative master-table-container dark:bg-slate-900 flex flex-col overflow-hidden"
          >
            <div className="master-table-scroll flex-grow min-h-0 flex flex-col">
              <div 
                ref={gridRef}
                className="master-table-scroll-inner custom-scrollbar flex-grow overflow-x-auto"
                style={{ overflowY: showGantt ? 'hidden' : 'auto' }}
                onScroll={handleScroll}
              >
                <table 
                  style={{ width: '100%', minWidth: `${2514 + customColumns.length * 128}px` }}
                  className="master-table table-fixed select-text"
                >
                  <thead className="sticky top-0 z-20">
                    {/* ── GROUP HEADER ROW ── */}
                    <tr className="h-7 text-[9px] font-extrabold uppercase tracking-widest bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {/* WBS / Identity group */}
                      <th colSpan={1} className="sticky left-0 top-0 z-30 bg-slate-100 dark:bg-slate-800 w-10" />
                      <th colSpan={4} className="sticky left-10 top-0 z-30 bg-slate-100 dark:bg-slate-800 px-3 text-left">
                        <span className="flex items-center gap-1.5">
                          WBS / Activity
                        </span>
                      </th>
                      {/* Planned Schedule group */}
                      <th colSpan={3} className="px-3 text-left">
                        <span className="flex items-center gap-1.5">
                          Planned Schedule
                        </span>
                      </th>
                      {/* Actual Schedule group */}
                      <th colSpan={3} className="px-3 text-left">
                        <span className="flex items-center gap-1.5">
                          Actual Schedule
                        </span>
                      </th>
                      {/* Control group */}
                      <th colSpan={4 + customColumns.length} className="px-3 text-left">
                        <span className="flex items-center gap-1.5">
                          Control & Assignment
                        </span>
                      </th>
                      <th colSpan={1} className="sticky right-0 top-0 z-30 bg-slate-100 dark:bg-slate-800 px-3 text-right w-24" />
                    </tr>
                    {/* ── COLUMN HEADER ROW ── */}
                    <tr className="h-9 text-[10px] tracking-widest uppercase font-extrabold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200/20 dark:border-slate-700/30">
                      <th className="sticky left-0 top-0 z-30 bg-slate-100 dark:bg-slate-800 w-10 px-2 text-center">#</th>
                      <th className="sticky left-10 top-0 z-30 bg-slate-100 dark:bg-slate-800 w-96 px-3 text-left">Activity Name</th>
                      <th className="w-12 px-2 text-center">Info</th>
                      <th className="w-16 px-2">Pin</th>
                      <th className="w-36 px-2">Dept.</th>
                      {/* Planned */}
                      <th className="w-32 px-2">Start Date</th>
                      <th className="w-32 px-2">End Date</th>
                      <th className="w-24 px-2 text-center">Duration</th>
                      {/* Actual */}
                      <th className="w-32 px-2">Act. Start</th>
                      <th className="w-32 px-2">Act. End</th>
                      <th className="w-28 px-2 text-center">Variance</th>
                      {/* Control */}
                      <th className="w-20 px-2 text-center">% Done</th>
                      <th className="w-28 px-2 text-center">Sub-Acts</th>
                      <th className="w-48 px-2">Assigned To</th>
                      <th className="w-28 px-2 font-extrabold text-slate-650 dark:text-slate-350">Status</th>
                      <th className="w-40 px-2">Predecessors</th>
                      {customColumns.map(col => (
                        <th key={col.id} className="w-32 px-2 relative group">
                          <span className="truncate pr-4 block">{col.column_label}</span>
                          <button
                            onClick={() => handleDeleteCustomColumn(col.id)}
                            className="absolute right-1 top-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={11} />
                          </button>
                        </th>
                      ))}
                      <th className="w-32 px-2">Follow-up</th>
                      <th className="sticky right-0 bg-slate-100 dark:bg-slate-800 z-30 px-4 py-3 text-right font-medium w-24">Actions</th>
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
                      const isMilestoneRow = task.item_type === 'Milestone' || task.item_type === 'Approval Gate';
                      const rowIsEven = (visibleIndices.start + visibleIndex) % 2 === 0;

                      // Item type badge config
                      const typeBadge = {
                        'Phase':        { bg: 'bg-orange-500/15 border-orange-400/40', text: 'text-orange-500 dark:text-orange-400', label: 'Phase' },
                        'Milestone':    { bg: 'bg-yellow-400/15 border-yellow-400/40', text: 'text-yellow-600 dark:text-yellow-400', label: '◆ MS' },
                        'Approval Gate':{ bg: 'bg-yellow-400/15 border-yellow-400/40', text: 'text-yellow-600 dark:text-yellow-400', label: '◆ Gate' },
                        'Task':         { bg: 'bg-indigo-500/10 border-indigo-400/30', text: 'text-indigo-600 dark:text-indigo-400', label: 'Task' },
                        'Sub Task':     { bg: 'bg-slate-200/80 border-slate-300/40 dark:bg-slate-700/30 dark:border-slate-600/30', text: 'text-slate-500 dark:text-slate-400', label: 'Sub' },
                      }[task.item_type] || { bg: 'bg-slate-200/60 border-slate-300/30', text: 'text-slate-400', label: task.item_type || 'Task' };

                      // Status badge config
                      const statusBadge = {
                        'Completed':   { pill: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30', dot: 'bg-emerald-500' },
                        'In Progress': { pill: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/30', dot: 'bg-blue-500' },
                        'Delayed':     { pill: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30', dot: 'bg-rose-500' },
                        'Upcoming':    { pill: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/30', dot: 'bg-indigo-400' },
                        'On Hold':     { pill: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30', dot: 'bg-amber-500' },
                        'Cancelled':   { pill: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-700/40 dark:text-slate-400 dark:border-slate-600/30', dot: 'bg-slate-400' },
                        'Not Started': { pill: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700/30 dark:text-slate-400 dark:border-slate-600/30', dot: 'bg-slate-300 dark:bg-slate-600' },
                      }[task.status] || { pill: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-300' };

                      // Format Duration display
                      let durationDays = '—';
                      if (task.start_date && task.end_date) {
                        const days = Math.ceil((new Date(task.end_date) - new Date(task.start_date)) / 86400000);
                        durationDays = days === 0 ? '0d' : `${days}d`;
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

                      const isOverdue = showOverdueTaskShading && (task.status === 'Delayed' || varianceText.includes('Delay'));

                      // Clean and simple row background matching Employee Master
                      const rowBg = isSelected
                        ? 'bg-blue-50/40 dark:bg-blue-900/10'
                        : isParent
                          ? 'bg-slate-50 dark:bg-slate-800/60'
                          : 'bg-white dark:bg-slate-900';

                      const stickyBg = isSelected 
                        ? 'bg-blue-50/95 dark:bg-blue-950/60' 
                        : isParent 
                          ? 'bg-slate-50 dark:bg-slate-800' 
                          : 'bg-white dark:bg-slate-900';

                      const hasOverAllocation = showOverAllocationMessage && task.assigned_to?.some(uid => 
                        resourceOverallocations.some(warn => String(warn.employeeId) === String(uid))
                      );

                      return (
                        <tr 
                          key={task.id}
                          data-task-id={task.id}
                          onClick={() => setSelectedTaskId(task.id)}
                          style={{ height: rowHeight }}
                          className={`group border-b border-slate-200/15 dark:border-slate-800/30 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors duration-100 cursor-pointer ${rowBg} ${isSelected ? 'ring-1 ring-inset ring-blue-400/30' : ''} ${isParent ? 'font-semibold' : ''}`}
                        >
                          {/* Index */}
                          <td className={`sticky left-0 z-10 group-hover:bg-slate-100/30 dark:group-hover:bg-slate-700/20 transition-colors ${stickyBg} px-2 text-center font-mono text-[10px] text-slate-500 dark:text-slate-400 font-bold select-none`}>{taskIdx + 1}</td>
                          
                          {/* Activity Name */}
                          <td 
                            className={`sticky left-10 z-10 group-hover:bg-slate-100/30 dark:group-hover:bg-slate-700/20 transition-colors ${stickyBg} px-3 relative select-none`}
                            style={{ paddingLeft: `${Math.max(12, indentPadding + 12)}px` }}
                          >
                            <div className="w-full h-full flex items-center relative truncate gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-wider border flex-shrink-0 ${typeBadge.bg} ${typeBadge.text}`}>
                                {typeBadge.label}
                              </span>
                              <span
                                onDoubleClick={(e) => { e.stopPropagation(); handleEditSpecificTask(task.id); }}
                                title="Double-click or use the Actions ✎ button to edit"
                                className={`w-full truncate px-1.5 py-0.5 ${isParent ? 'font-bold text-slate-800 dark:text-slate-100' : 'text-slate-600 dark:text-slate-300'}`}
                              >
                                {task.activity_name || <span className="text-slate-400 italic">Untitled</span>}
                              </span>
                            </div>
                          </td>

                          {/* Info Column */}
                          <td className="px-2 text-center select-none">
                            <div className="flex items-center justify-center gap-1">
                              {task.is_critical && <span className="size-2 rounded-full bg-rose-500" title="Critical Path Activity" />}
                              {task.item_type === 'Approval Gate' && <span className="size-2 rotate-45 bg-yellow-500 border border-yellow-600 block" title="Approval / Stage Gate" />}
                            </div>
                          </td>

                          {/* Pin Column */}
                          <td className="px-2 text-center select-none">
                            <span className="text-sm">
                              {task.custom_values?.pin_type === 'star' && <span title="Starred">⭐</span>}
                              {task.custom_values?.pin_type === 'flag' && <span title="Flagged">🚩</span>}
                              {task.custom_values?.pin_type === 'arrow' && <span title="Arrow">➡️</span>}
                              {!task.custom_values?.pin_type && <span className="text-slate-300 dark:text-slate-600">–</span>}
                            </span>
                          </td>

                          {/* Department */}
                          <td className="px-2">
                            <span className="block truncate px-1.5 py-0.5 text-xs text-slate-700 dark:text-slate-200 font-medium">
                              {task.department || <span className="text-slate-400 italic">—</span>}
                            </span>
                          </td>

                          {/* Sub Activity */}
                          <td className="px-2 text-center select-none">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setActiveParentTask(task); }}
                              className="px-2 py-1 text-[10px] font-bold bg-indigo-600/90 hover:bg-indigo-600 text-white rounded-md shadow-sm transition-all active:scale-95 flex items-center gap-1 mx-auto"
                            >
                              <span>Manage</span>
                              <span className="bg-white/20 rounded px-1">{tasks.filter(t => t.parent_id === task.id).length}</span>
                            </button>
                          </td>

                          {/* Start Date */}
                          <td className="px-2">
                            <span className={`text-xs px-1.5 font-mono ${isParent ? 'font-bold text-slate-800 dark:text-slate-100' : 'text-slate-700 dark:text-slate-200'}`}>{formatDate(task.start_date) || '—'}</span>
                          </td>

                          {/* End Date */}
                          <td className="px-2">
                            <span className={`text-xs px-1.5 font-mono ${isParent ? 'font-bold text-slate-800 dark:text-slate-100' : 'text-slate-700 dark:text-slate-200'}`}>{formatDate(task.end_date) || '—'}</span>
                          </td>

                          {/* Duration */}
                          <td className="px-2 text-center font-mono text-xs text-slate-700 dark:text-slate-200 font-semibold select-none">
                            {durationDays}
                          </td>

                          {/* Actual Start */}
                          <td className="px-2">
                            <span className={`text-xs px-1.5 font-mono ${isParent ? 'font-bold text-slate-800 dark:text-slate-100' : 'text-slate-700 dark:text-slate-200'}`}>{formatDate(task.actual_start) || '—'}</span>
                          </td>

                          {/* Actual End */}
                          <td className="px-2">
                            <span className={`text-xs px-1.5 font-mono ${isParent ? 'font-bold text-slate-800 dark:text-slate-100' : 'text-slate-700 dark:text-slate-200'}`}>{formatDate(task.actual_end) || '—'}</span>
                          </td>

                          {/* Variance */}
                          <td className="px-2 text-center font-mono text-[10px]">
                            <span className={varianceColor}>{varianceText}</span>
                          </td>

                          {/* Complete % */}
                          <td className="px-2 text-center font-mono text-xs">
                            <span className={isParent ? 'font-bold text-slate-800 dark:text-slate-100' : 'font-semibold text-slate-700 dark:text-slate-200'}>{task.complete_percent || 0}%</span>
                          </td>

                          {/* Assigned To */}
                          <td className="px-2 truncate">
                            <button
                              onClick={(e) => { e.stopPropagation(); setActiveAssignTask(task); }}
                              className={`w-full text-left truncate hover:text-indigo-500 font-medium py-1 flex items-center gap-1 text-xs ${hasOverAllocation ? 'text-rose-500 font-bold' : 'text-slate-700 dark:text-slate-200'}`}
                              title={hasOverAllocation ? "Warning: Overallocated resource assigned!" : "Assign resources"}
                            >
                              {hasOverAllocation && <span className="text-rose-500 font-bold text-xs" title="Overallocated resource">⚠️</span>}
                              <span>{task.assigned_to && task.assigned_to.length > 0 ? task.assigned_to.map(uid => { const emp = projectTeam.find(e => String(e.employee_id) === String(uid)); return emp ? emp.employee_name : uid; }).join(', ') : <span className="text-slate-400 dark:text-slate-500 italic text-[11px]">Unassigned</span>}</span>
                            </button>
                          </td>

                          {/* Status */}
                          <td className="px-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-extrabold uppercase tracking-wider ${statusBadge.pill}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot} flex-shrink-0`} />
                              {task.status || 'Not Started'}
                            </span>
                          </td>

                          {/* Predecessors */}
                          <td className="px-2 font-mono text-xs text-slate-500 dark:text-slate-400">
                            <span className="block truncate px-1.5 py-0.5 text-slate-600 dark:text-slate-300 font-semibold">
                              {task.dependencies_as_successor && task.dependencies_as_successor.length > 0
                                ? task.dependencies_as_successor.map(d => {
                                    const predTaskIdx = filteredTasks.findIndex(pt => pt.id === d.predecessor_task_id);
                                    const lagText = d.lag_days !== 0 ? `${d.lag_days > 0 ? '+' : ''}${d.lag_days}d` : '';
                                    return predTaskIdx !== -1 ? `${predTaskIdx + 1}${d.type}${lagText}` : '';
                                  }).filter(Boolean).join(', ')
                                : <span className="text-slate-400">—</span>}
                            </span>
                          </td>

                          {/* Custom fields */}
                          {customColumns.map(col => {
                            const val = task.custom_values?.[col.column_name] || '';
                            return (
                              <td key={col.id} className="px-2">
                                <span className="block truncate px-1.5 py-0.5 text-slate-700 dark:text-slate-200">
                                  {val || <span className="text-slate-400">—</span>}
                                </span>
                              </td>
                            );
                          })}

                          {/* Follow-up */}
                          <td className="px-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); openFollowupEditor(task); }}
                              className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 hover:text-white bg-slate-100 hover:bg-indigo-600 dark:bg-slate-800 dark:hover:bg-indigo-700 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 transition-colors"
                            >
                              <Calendar size={11} />
                              {task.followups && task.followups.length > 0 ? 'Logged' : 'Set'}
                            </button>
                          </td>

                          {/* Actions Cell - Sticky Right */}
                          <td 
                            onClick={(e) => e.stopPropagation()}
                            className={`sticky right-0 z-10 py-2 px-3 text-right whitespace-nowrap w-[100px] border-l border-slate-200/10 dark:border-slate-800/25 shadow-[-4px_0_6px_-1px_rgba(0,0,0,0.05)] ${stickyBg}`}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditSpecificTask(task.id); }}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteSpecificTask(task); }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    <tr style={{ height: (filteredTasks.length - visibleIndices.end) * rowHeight }} />
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* RESIZER DRAG THUMB + COLLAPSE CONTROLS */}
        {showDataGrid && showGantt && (
          <div className="relative h-full shrink-0 flex items-center z-20">
            <div
              onMouseDown={startResize}
              onDoubleClick={() => setTableWidth(650)}
              title="Drag to resize split view, double-click to reset"
              className="w-1.5 h-full cursor-col-resize bg-[var(--surface)] border-x border-[var(--border-subtle)] hover:bg-indigo-500/20 hover:border-indigo-500/30 active:bg-indigo-600 transition-all flex items-center justify-center group"
            >
              <div className="w-[2px] h-10 bg-slate-500/30 group-hover:bg-indigo-500 rounded-full transition-colors" />
            </div>
            {/* Collapse / expand toggle buttons */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col gap-1">
              <button
                onClick={() => setShowGantt(false)}
                title="Expand table (hide chart) for full column visibility"
                className="p-0.5 rounded bg-[var(--elevated-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-indigo-600 hover:border-indigo-400 shadow-sm transition-colors"
              >
                <ChevronRight size={12} />
              </button>
              <button
                onClick={() => setShowDataGrid(false)}
                title="Expand chart (hide table)"
                className="p-0.5 rounded bg-[var(--elevated-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-indigo-600 hover:border-indigo-400 shadow-sm transition-colors"
              >
                <ChevronLeft size={12} />
              </button>
            </div>
          </div>
        )}

        {/* RESTORE STRIP — chart hidden, click to bring it back */}
        {showDataGrid && !showGantt && (
          <button
            onClick={() => setShowGantt(true)}
            title="Show timeline chart"
            className="w-5 h-full shrink-0 bg-[var(--surface)] border-l border-[var(--border-subtle)] hover:bg-indigo-500/10 flex items-center justify-center text-[var(--text-muted)] hover:text-indigo-600 transition-colors z-20"
          >
            <ChevronLeft size={14} />
          </button>
        )}

        {/* RESTORE STRIP — table hidden, click to bring it back */}
        {!showDataGrid && showGantt && (
          <button
            onClick={() => setShowDataGrid(true)}
            title="Show data table"
            className="w-5 h-full shrink-0 bg-[var(--surface)] border-r border-[var(--border-subtle)] hover:bg-indigo-500/10 flex items-center justify-center text-[var(--text-muted)] hover:text-indigo-600 transition-colors z-20 order-first"
          >
            <ChevronRight size={14} />
          </button>
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
                className="absolute top-10 left-0 w-full h-full pointer-events-none z-10 mix-blend-multiply dark:mix-blend-screen opacity-70"
                style={{ width: timelineWidth, height: filteredTasks.length * rowHeight }}
              >
                <defs>
                  <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,1 L5,3 L0,5 Z" fill="#94a3b8" opacity="0.45" />
                  </marker>
                  <marker id="arrowhead-critical" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,1 L5,3 L0,5 Z" fill="#ef4444" opacity="0.65" />
                  </marker>
                </defs>

                {dependencyLines.map(line => (
                  <path 
                    key={line.id}
                    d={line.d}
                    fill="none"
                    stroke={line.color}
                    strokeWidth={line.isCriticalLink ? 1.2 : 0.8}
                    strokeOpacity={line.isCriticalLink ? 0.65 : 0.45}
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

                  // Derive which bar layers to show from the global showDataType setting
                  const showPlannedGantt  = showDataType === 'Planned'  || showDataType === 'Baseline';
                  const showActualGantt   = showDataType === 'Actual';
                  const showBaselineGantt = (showDataType === 'Baseline') && showBaselineOverlay;

                  // Vertical position offsets – shift actual bar to center when planned is hidden
                  const plannedBarTop = '20px';
                  const actualBarTop  = showPlannedGantt ? '32px' : '20px';
                  const plannedTop    = '19px';
                  const actualTop     = showPlannedGantt ? '31px' : '19px';

                  // Horizontal label / date anchors
                  const dateLeft  = bar.plannedLeft - 44;
                  const labelLeft = (showPlannedGantt
                    ? bar.plannedLeft + bar.plannedWidth
                    : (bar.isActualActive && bar.actualLeft !== null
                        ? bar.actualLeft + (bar.actualWidth || 0)
                        : bar.plannedLeft + bar.plannedWidth)
                  ) + 6;

                  const activeLeft = Math.min(
                    bar.plannedLeft,
                    bar.actualLeft !== null ? bar.actualLeft : bar.plannedLeft,
                    bar.baselineLeft !== null ? bar.baselineLeft : bar.plannedLeft
                  ) - (bar.pinType ? 24 : 12);

                  const activeRight = Math.max(
                    bar.plannedLeft + bar.plannedWidth,
                    bar.isActualActive && bar.actualLeft !== null && bar.actualWidth !== null ? bar.actualLeft + bar.actualWidth : 0,
                    showBaselineOverlay && bar.baselineLeft !== null && bar.baselineWidth !== null ? bar.baselineLeft + bar.baselineWidth : 0
                  ) + 250;

                  const activeWidth = Math.max(50, activeRight - activeLeft);

                  return (
                    <div 
                      key={bar.id}
                      style={{ height: rowHeight }}
                      className={`flex flex-col justify-center relative group w-full ${isSelected ? 'bg-indigo-500/5' : ''}`}
                    >
                      {/* Interactive Hover Detector Overlay (only covers active horizontal span) */}
                      <div
                        style={{
                          position: 'absolute',
                          left: activeLeft,
                          width: activeWidth,
                          top: 0,
                          bottom: 0,
                          zIndex: 30
                        }}
                        onMouseEnter={(e) => setHoveredTask(bar)}
                        onMouseMove={(e) => setTooltipPos({ x: e.clientX + 16, y: e.clientY + 16 })}
                        onMouseLeave={() => setHoveredTask(null)}
                        className="cursor-pointer"
                      />
                      {/* Pin Icons */}
                      {bar.pinType && (
                        <div 
                          className="absolute z-20 flex items-center justify-center pointer-events-none"
                          style={{ 
                            left: bar.plannedLeft - 24, 
                            width: '16px',
                            height: '16px',
                            top: '20px'
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
                          {showPlannedGantt && (
                            <div 
                              className="absolute size-3 shadow-md flex items-center justify-center z-10"
                              style={{ 
                                left: bar.plannedLeft - 5,
                                top: plannedTop,
                                width: '10px',
                                height: '10px',
                                transform: 'rotate(45deg)',
                                backgroundColor: color,
                                border: `1.5px solid ${isCritical ? '#f43f5e' : '#fff'}`,
                                boxShadow: bar.isOverdue ? '0 0 0 2px #ef4444, 0 0 8px rgba(239, 68, 68, 0.5)' : 'none'
                              }}
                              title={`Planned Milestone: ${bar.activityName}`}
                            />
                          )}
                          {/* Actual Milestone Diamond (if actual start exists) */}
                          {showActualGantt && bar.isActualActive && (
                            <div 
                              className="absolute size-3 shadow-md flex items-center justify-center z-10"
                              style={{ 
                                left: bar.actualLeft - 5,
                                top: actualTop,
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
                            style={{ left: dateLeft, width: '40px', top: '19px' }}
                            className="absolute text-[8px] font-mono text-[var(--text-muted)] text-right pr-1 select-none pointer-events-none z-10"
                          >
                            {showPlannedGantt ? bar.startDateStr : (bar.isActualActive ? bar.actualStartStr.split(',')[0] : '')}
                          </span>
                        </>
                      ) : isParent ? (
                        <>
                          {/* Planned Parent Summary Bar */}
                          {showPlannedGantt && (
                            <svg 
                              className="absolute h-3 overflow-visible pointer-events-none" 
                              style={{ left: bar.plannedLeft - 2, width: Math.max(8, bar.plannedWidth) + 4, top: plannedBarTop }}
                            >
                              <path d={`M 2 2 H ${bar.plannedWidth + 2} V 8 H 2 Z`} fill={color} />
                              <path d="M 2 2 L 6 8 L 6 2 Z" fill={color} />
                              <path d={`M ${bar.plannedWidth + 2} 2 L ${bar.plannedWidth - 2} 8 L ${bar.plannedWidth - 2} 2 Z`} fill={color} />
                            </svg>
                          )}

                          {/* Actual Parent Summary Bar */}
                          {showActualGantt && bar.isActualActive && (
                            <svg 
                              className="absolute h-2.5 overflow-visible pointer-events-none" 
                              style={{ left: bar.actualLeft - 2, width: Math.max(8, bar.actualWidth) + 4, top: actualBarTop }}
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
                          {showPlannedGantt && (
                            <div 
                              style={{ left: bar.plannedLeft, width: bar.plannedWidth, top: plannedBarTop, height: '8px' }}
                              className={`absolute rounded shadow-sm flex items-center overflow-hidden bg-slate-300 dark:bg-slate-700/50 ${
                                bar.isOverdue ? 'ring-2 ring-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : ''
                              }`}
                            >
                              <div 
                                style={{ 
                                  width: `${bar.completePercent}%`,
                                  backgroundColor: isCritical ? '#ef4444' : color
                                }} 
                                className="h-full rounded-l"
                              />
                            </div>
                          )}

                          {/* Actual Bar (drawn if actual start is set) */}
                          {showActualGantt && bar.isActualActive && (
                            <div 
                              style={{ 
                                left: bar.actualLeft, 
                                width: bar.actualWidth,
                                top: actualBarTop,
                                height: '8px'
                              }}
                              className={`absolute rounded shadow-sm flex items-center overflow-hidden ${
                                bar.status === 'Completed' 
                                  ? 'bg-emerald-500/20 border border-emerald-500' 
                                  : bar.status === 'Delayed'
                                  ? 'bg-rose-500/20 border border-rose-500'
                                  : 'bg-amber-500/20 border border-amber-500'
                              }`}
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
                          {showPlannedGantt && bar.varianceDays > 0 && (
                            <span 
                              style={{ left: bar.plannedLeft + bar.plannedWidth + 6, top: '19px' }}
                              className="absolute text-[8px] font-mono text-rose-500 font-bold bg-rose-500/10 px-1 py-0.2 rounded pointer-events-none"
                            >
                              +{bar.varianceDays}d Delay
                            </span>
                          )}
                          {showPlannedGantt && bar.varianceDays < 0 && (
                            <span 
                              style={{ left: bar.plannedLeft + bar.plannedWidth + 6, top: '19px' }}
                              className="absolute text-[8px] font-mono text-emerald-500 font-bold bg-emerald-500/10 px-1 py-0.2 rounded pointer-events-none"
                            >
                              {bar.varianceDays}d Advance
                            </span>
                          )}
                        </>
                      )}

                      {/* BASELINE SNAPSHOT UNDERLAY */}
                      {showBaselineGantt && bar.baselineLeft !== null && bar.baselineWidth !== null && (
                        <div 
                          style={{ left: bar.baselineLeft, width: bar.baselineWidth, top: '45px', height: '3px' }}
                          className="absolute bg-yellow-500/60 dark:bg-yellow-500/40 rounded-sm"
                          title="Baseline Snapshot"
                        />
                      )}

                      {/* Labels for Gantt Bars — placed ABOVE the bar to avoid collisions
                          with the bar fill, milestone diamonds and dependency links */}
                      <span
                        style={{
                          left: isMilestone ? bar.plannedLeft + 10 : bar.plannedLeft,
                          top: '2px',
                          maxWidth: '420px'
                        }}
                        className="absolute text-[10px] font-bold text-[var(--text-primary)] dark:text-slate-200 whitespace-nowrap overflow-hidden text-ellipsis opacity-90 group-hover:opacity-100 pointer-events-none leading-none"
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

      {/* FOOTER TABBED ANALYTICS SHELF (resizable + collapsible) */}
      <div
        style={{ height: footerCollapsed ? 34 : footerHeight }}
        className="border-t border-[var(--border-subtle)] bg-[var(--surface)] flex flex-col shrink-0 relative"
      >
        {/* Drag handle to resize the shelf vertically */}
        {!footerCollapsed && (
          <div
            onMouseDown={startFooterResize}
            onDoubleClick={() => setFooterHeight(176)}
            title="Drag to resize, double-click to reset"
            className="absolute -top-1 left-0 w-full h-2 cursor-row-resize z-20 group flex items-center justify-center"
          >
            <div className="w-12 h-[3px] rounded-full bg-slate-400/40 group-hover:bg-indigo-500 transition-colors" />
          </div>
        )}

        <div className="flex items-center border-b border-[var(--border-subtle)] bg-[var(--surface)] px-4 text-[11px] font-bold uppercase tracking-wider">
          <div className="flex flex-1 overflow-x-auto">
            {[
            { id: 'workload', label: 'Resource Loads', icon: Users },
            { id: 'releases', label: 'Versions & Milestones', icon: Layers },
            { id: 'followups', label: 'Reminders & Follow-ups', icon: Calendar },
            { id: 'progress_logs', label: 'Progress Logs', icon: Sparkles }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveSubTab(tab.id); if (footerCollapsed) setFooterCollapsed(false); }}
              className={`flex items-center gap-1.5 px-4 py-2 border-b-2 -mb-[1px] whitespace-nowrap transition-all ${activeSubTab === tab.id ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-[var(--bg)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
            >
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
          </div>
          {/* Minimize / restore toggle */}
          <button
            onClick={() => setFooterCollapsed(c => !c)}
            title={footerCollapsed ? 'Expand panel' : 'Minimize panel'}
            className="ml-2 p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg)] transition-colors"
          >
            {footerCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        <div className={`flex-1 p-3 overflow-y-auto text-xs bg-[var(--bg)] ${footerCollapsed ? 'hidden' : ''}`}>
          
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
        <div className="app-modal-overlay">
          <div className="app-modal-container max-w-sm w-full mx-4 shadow-xl">
            <div className="app-modal-header">
              <h3 className="app-modal-title">Add Custom Grid Column</h3>
              <button
                onClick={() => setShowAddColModal(false)}
                className="app-modal-close-btn"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="app-modal-body space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Column Key (English words only)</label>
                <input
                  type="text"
                  placeholder="e.g. priority_code"
                  value={newColName}
                  onChange={e => setNewColName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-900 dark:text-slate-100 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Display Title</label>
                <input
                  type="text"
                  placeholder="e.g. Priority Code"
                  value={newColLabel}
                  onChange={e => setNewColLabel(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-900 dark:text-slate-100 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Data Type</label>
                <select
                  value={newColType}
                  onChange={e => setNewColType(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-900 dark:text-slate-100 transition-all"
                >
                  <option value="text" className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">Text</option>
                  <option value="number" className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">Number</option>
                  <option value="date" className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">Date</option>
                  <option value="select" className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">Dropdown List</option>
                </select>
              </div>

              {newColType === 'select' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Dropdown Options (Comma separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Critical, High, Low"
                    value={newColOptions}
                    onChange={e => setNewColOptions(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-900 dark:text-slate-100 transition-all"
                  />
                </div>
              )}
            </div>

            <div className="app-modal-footer">
              <button
                onClick={() => setShowAddColModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustomColumn}
                className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-all active:scale-[0.98]"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOLLOW-UP DIALOG */}
      {editingFollowupTaskId !== null && (
        <div className="app-modal-overlay">
          <div className="app-modal-container max-w-sm w-full mx-4 shadow-xl">
            <div className="app-modal-header">
              <h3 className="app-modal-title">Schedule Follow-up Action</h3>
              <button
                onClick={() => setEditingFollowupTaskId(null)}
                className="app-modal-close-btn"
              >
                <X size={16} />
              </button>
            </div>

            <div className="app-modal-body space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Action Date</label>
                <input
                  type="date"
                  value={followupDate}
                  onChange={e => setFollowupDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-900 dark:text-slate-100 transition-all font-mono"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Owner</label>
                <input
                  type="text"
                  placeholder="Employee / Owner Name"
                  value={followupOwner}
                  onChange={e => setFollowupOwner(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-900 dark:text-slate-100 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Action Notes</label>
                <textarea
                  rows="3"
                  placeholder="Specify follow-up details..."
                  value={followupNotes}
                  onChange={e => setFollowupNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-900 dark:text-slate-100 transition-all resize-none"
                />
              </div>
            </div>

            <div className="app-modal-footer">
              <button
                onClick={() => setEditingFollowupTaskId(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFollowup}
                className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm transition-all active:scale-[0.98]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GANTT SETTINGS DIALOG */}
      {showSettingsModal && (
        <div className="app-modal-overlay">
          <div className="app-modal-container max-w-md w-full mx-4 shadow-xl">
            <div className="app-modal-header">
              <div>
                <h3 className="app-modal-title">Gantt Chart Settings</h3>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Configure layout, display, and data type for the Gantt view</p>
              </div>
              <button onClick={() => setShowSettingsModal(false)} className="app-modal-close-btn">
                <X size={16} />
              </button>
            </div>
            
            <div className="app-modal-body overflow-y-auto max-h-[65vh] pr-1 custom-scrollbar" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* ── SHOW FEATURE ── */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-1 w-3 rounded-full bg-indigo-500" />
                  <h4 className="font-extrabold text-[var(--text-primary)] uppercase text-[10px] tracking-wider">Show / Hide Panels</h4>
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 pl-1">
                  {[
                    { id: 'gantt',        label: 'Gantt Chart',              hint: 'Shows the timeline bar chart', val: tempShowGantt, set: setTempShowGantt },
                    { id: 'grid',         label: 'Data Grid',                hint: 'Shows the spreadsheet table', val: tempShowDataGrid, set: setTempShowDataGrid },
                    { id: 'today',        label: 'Today Line',               hint: 'Red vertical marker for today', val: tempShowTodayLine, set: setTempShowTodayLine },
                    { id: 'nonworking',   label: 'Non-Working Shading',      hint: 'Weekend background tint', val: tempShowNonWorkingDayShading, set: setTempShowNonWorkingDayShading },
                    { id: 'overdue',      label: 'Overdue Row Shading',      hint: 'Red tint on delayed tasks', val: tempShowOverdueTaskShading, set: setTempShowOverdueTaskShading },
                    { id: 'overalloc',    label: 'Over-Allocation Alerts',   hint: 'Resource conflict warnings', val: tempShowOverAllocationMessage, set: setTempShowOverAllocationMessage },
                    { id: 'summarydelete', label: 'Summary Delete Warning',  hint: 'Warn before deleting phases', val: tempShowSummaryDeleteMessage, set: setTempShowSummaryDeleteMessage },
                  ].map(f => (
                    <label key={f.id} className="flex items-start gap-2 cursor-pointer group select-none">
                      <input
                        type="checkbox"
                        checked={f.val}
                        onChange={e => f.set(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 size-3.5 flex-shrink-0"
                      />
                      <div className="flex flex-col leading-tight">
                        <span className="text-[11px] font-semibold text-[var(--text-primary)] group-hover:text-indigo-500 transition-colors">{f.label}</span>
                        <span className="text-[9px] text-[var(--text-muted)]">{f.hint}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* ── GANTT BAR LABELS ── */}
              <div className="flex flex-col gap-2 pt-3 border-t border-[var(--border-subtle)]/40">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-1 w-3 rounded-full bg-blue-500" />
                  <h4 className="font-extrabold text-[var(--text-primary)] uppercase text-[10px] tracking-wider">Gantt Bar Labels</h4>
                </div>
                <div className="flex items-center gap-6 pl-1 flex-wrap">
                  {[
                    { id: 'taskname', label: 'Task Name',  val: tempGanttShowTaskName, set: setTempGanttShowTaskName },
                    { id: 'percent',  label: '% Complete', val: tempGanttShowPercent,  set: setTempGanttShowPercent },
                    { id: 'assignee', label: 'Assignee',   val: tempGanttShowAssignee, set: setTempGanttShowAssignee },
                  ].map(f => (
                    <label key={f.id} className="flex items-center gap-2 cursor-pointer select-none group">
                      <input
                        type="checkbox"
                        checked={f.val}
                        onChange={e => f.set(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-blue-600 focus:ring-0 focus:ring-offset-0 size-3.5"
                      />
                      <span className="text-[11px] font-semibold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* ── SHOW DATA TYPE ── */}
              <div className="flex flex-col gap-2 pt-3 border-t border-[var(--border-subtle)]/40">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-1 w-3 rounded-full bg-emerald-500" />
                  <h4 className="font-extrabold text-[var(--text-primary)] uppercase text-[10px] tracking-wider">Display Data Type</h4>
                </div>
                <div className="flex items-center gap-1 pl-1">
                  {[
                    { type: 'Planned',  desc: 'Planned bars only', color: 'bg-indigo-600' },
                    { type: 'Actual',   desc: 'Actual progress bars', color: 'bg-emerald-600' },
                    { type: 'Baseline', desc: 'Planned + Baseline overlay', color: 'bg-amber-600' },
                  ].map(({ type, desc, color }) => (
                    <button
                      key={type}
                      onClick={() => setTempShowDataType(type)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2 px-3 rounded-lg border-2 transition-all text-center ${
                        tempShowDataType === type
                          ? `border-indigo-500 bg-indigo-500/10 text-[var(--text-primary)]`
                          : 'border-[var(--border-subtle)] bg-[var(--bg)] text-[var(--text-muted)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <span className={`w-6 h-2 rounded-full ${tempShowDataType === type ? color : 'bg-slate-400/40'} transition-colors`} />
                      <span className="text-[10px] font-bold">{type}</span>
                      <span className="text-[8px] leading-tight">{desc}</span>
                    </button>
                  ))}
                </div>

                {/* Baseline overlay toggle — only relevant when Baseline data type is selected */}
                {tempShowDataType === 'Baseline' && (
                  <label className="flex items-center gap-2.5 cursor-pointer select-none mt-2 pl-1 p-2.5 rounded-lg bg-amber-500/8 border border-amber-400/20">
                    <input
                      type="checkbox"
                      checked={tempShowBaselineOverlay}
                      onChange={e => setTempShowBaselineOverlay(e.target.checked)}
                      className="rounded border-amber-300 dark:border-amber-600 bg-white dark:bg-slate-800 text-amber-600 focus:ring-0 focus:ring-offset-0 size-3.5"
                    />
                    <div className="flex flex-col">
                      <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">Show Baseline Overlay</span>
                      <span className="text-[9px] text-[var(--text-muted)]">Display baseline snapshot bars below planned bars</span>
                    </div>
                  </label>
                )}
              </div>

              {/* ── ADVANCED ── */}
              <div className="flex flex-col gap-3 pt-3 border-t border-[var(--border-subtle)]/40">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-1 w-3 rounded-full bg-rose-500" />
                  <h4 className="font-extrabold text-[var(--text-primary)] uppercase text-[10px] tracking-wider">Advanced</h4>
                </div>
                <div className="flex flex-col gap-3 pl-1">
                  {/* Baseline Snapshot */}
                  <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--border-subtle)]/60 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-semibold text-[var(--text-primary)]">Create Baseline Snapshot</span>
                        <span className="text-[9px] text-[var(--text-muted)]">Saves current planned dates as a named baseline</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={tempSetBaselineChecked}
                          onChange={e => setTempSetBaselineChecked(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 dark:bg-slate-600 rounded-full peer peer-checked:bg-indigo-600 transition-colors relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4" />
                      </label>
                    </div>
                    {tempSetBaselineChecked && (
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-[var(--text-muted)] font-semibold uppercase flex-shrink-0">Version Name</span>
                        <input
                          type="text"
                          value={tempBaselineVersion}
                          onChange={e => setTempBaselineVersion(e.target.value)}
                          placeholder="e.g. Baseline_V1"
                          className="flex-1 px-2 py-1 border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-primary)] rounded text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

            <div className="app-modal-footer">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-200 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="px-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-all active:scale-[0.98]"
              >
                Apply Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-ACTIVITIES MODAL */}
      {activeParentTask && (
        <div className="app-modal-overlay z-[9999]">
          <div className="app-modal-container w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="app-modal-header">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
                  <Layers size={16} className="text-indigo-400" />
                </div>
                <div>
                  <h3 className="app-modal-title">Sub-Activities</h3>
                  <p className="text-[10px] text-[var(--text-muted)] font-medium mt-0.5 truncate max-w-[380px]">
                    Parent: <span className="text-indigo-400 font-semibold">{activeParentTask.activity_name}</span>
                  </p>
                </div>
              </div>
              <button onClick={() => setActiveParentTask(null)} className="app-modal-close-btn">
                <X size={16} />
              </button>
            </div>

            <div className="app-modal-body flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
              {/* Sub-activity count badge */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold uppercase tracking-wide">
                  {tasks.filter(t => t.parent_id === activeParentTask.id).length} sub-activities
                </span>
                <span className="text-[10px] text-[var(--text-muted)] font-medium">
                  WBS: {activeParentTask.wbs_code || '—'}
                </span>
              </div>

              <div className="flex-1 overflow-auto min-h-0 rounded-xl border border-[var(--border-subtle)]/60 custom-scrollbar">
                <table className="w-full text-left border-collapse table-fixed select-text text-[11px]">
                  <thead className="sticky top-0 z-10">
                    <tr style={{ background: 'var(--surface)' }} className="border-b-2 border-[var(--border-subtle)]/60">
                      <th className="w-12 px-2 py-3 text-center border-r border-[var(--border-subtle)]/30 text-[9px] font-extrabold uppercase tracking-widest text-[var(--text-muted)]">WBS</th>
                      <th className="w-52 px-3 py-3 border-r border-[var(--border-subtle)]/30 text-[9px] font-extrabold uppercase tracking-widest text-[var(--text-muted)]">Sub-Activity Name</th>
                      <th className="w-24 px-2 py-3 border-r border-[var(--border-subtle)]/30 text-[9px] font-extrabold uppercase tracking-widest text-[var(--text-muted)]">Type</th>
                      <th className="w-28 px-2 py-3 border-r border-[var(--border-subtle)]/30 text-[9px] font-extrabold uppercase tracking-widest text-[var(--text-muted)]">Start Date</th>
                      <th className="w-28 px-2 py-3 border-r border-[var(--border-subtle)]/30 text-[9px] font-extrabold uppercase tracking-widest text-[var(--text-muted)]">End Date</th>
                      <th className="w-28 px-2 py-3 border-r border-[var(--border-subtle)]/30 text-[9px] font-extrabold uppercase tracking-widest text-[var(--text-muted)]">Actual Start</th>
                      <th className="w-28 px-2 py-3 border-r border-[var(--border-subtle)]/30 text-[9px] font-extrabold uppercase tracking-widest text-[var(--text-muted)]">Actual End</th>
                      <th className="w-16 px-2 py-3 border-r border-[var(--border-subtle)]/30 text-[9px] font-extrabold uppercase tracking-widest text-[var(--text-muted)] text-center">% Done</th>
                      <th className="w-28 px-2 py-3 border-r border-[var(--border-subtle)]/30 text-[9px] font-extrabold uppercase tracking-widest text-[var(--text-muted)]">Status</th>
                      <th className="w-44 px-2 py-3 border-r border-[var(--border-subtle)]/30 text-[9px] font-extrabold uppercase tracking-widest text-[var(--text-muted)]">Assigned To</th>
                      <th className="w-14 px-2 py-3 text-[9px] font-extrabold uppercase tracking-widest text-[var(--text-muted)] text-center">Del</th>
                    </tr>
                  </thead>
                  <tbody>
                  {tasks
                    .filter(t => t.parent_id === activeParentTask.id)
                    .map((sub, sIdx) => {
                      const subWbs = `${activeParentTask.wbs_code || '1'}.${sIdx + 1}`;
                      const statusColors = {
                        'Completed': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                        'In Progress': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                        'Delayed': 'text-rose-400 bg-rose-500/10 border-rose-500/20',
                        'On Hold': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                        'Not Started': 'text-slate-400 bg-slate-500/10 border-slate-500/20',
                      };
                      return (
                        <tr key={sub.id} className="border-b border-[var(--border-subtle)]/20 hover:bg-indigo-500/[0.04] transition-colors group" style={{ height: '44px' }}>
                          <td className="px-2 text-center border-r border-[var(--border-subtle)]/20">
                            <span className="font-mono text-[9px] text-indigo-400 font-extrabold bg-indigo-500/10 px-1.5 py-0.5 rounded">{subWbs}</span>
                          </td>
                          
                          <td className="px-3 border-r border-[var(--border-subtle)]/20">
                            <input
                              type="text"
                              value={sub.activity_name || ''}
                              onChange={e => handleCellChange(sub.id, 'activity_name', e.target.value)}
                              className="w-full bg-transparent border-0 outline-none text-[var(--text-primary)] font-medium focus:text-indigo-300 transition-colors placeholder-[var(--text-muted)]"
                              placeholder="Activity name…"
                            />
                          </td>

                          <td className="px-2 border-r border-[var(--border-subtle)]/20">
                            <select
                              value={sub.task_type || 'sub_activity'}
                              onChange={e => handleCellChange(sub.id, 'task_type', e.target.value)}
                              className="w-full bg-transparent border-0 outline-none text-[var(--text-primary)] font-semibold text-[10px] cursor-pointer"
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

                          <td className="px-2 border-r border-[var(--border-subtle)]/20 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={sub.complete_percent || 0}
                                onChange={e => handleCellChange(sub.id, 'complete_percent', parseFloat(e.target.value) || 0)}
                                className="w-full bg-transparent border-0 outline-none text-center text-[var(--text-primary)] font-bold font-mono text-[10px]"
                              />
                              <div className="w-full h-1 rounded-full bg-[var(--border-subtle)]/30 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    (sub.complete_percent || 0) >= 100 ? 'bg-emerald-500' :
                                    (sub.complete_percent || 0) > 0 ? 'bg-indigo-500' : 'bg-slate-600'
                                  }`}
                                  style={{ width: `${Math.min(100, sub.complete_percent || 0)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="px-2 border-r border-[var(--border-subtle)]/20">
                            <select
                              value={sub.status || 'Not Started'}
                              onChange={e => handleCellChange(sub.id, 'status', e.target.value)}
                              className={`w-full bg-transparent border-0 outline-none font-bold text-[10px] cursor-pointer ${
                                statusColors[sub.status] || statusColors['Not Started']
                              }`}
                            >
                              {['Not Started', 'In Progress', 'Completed', 'On Hold', 'Delayed'].map(s => (
                                <option key={s} value={s} className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">{s}</option>
                              ))}
                            </select>
                          </td>

                          <td className="px-2 border-r border-[var(--border-subtle)]/20 truncate">
                            <button
                              onClick={() => setActiveAssignTask(sub)}
                              className="w-full text-left truncate font-medium text-[10px] transition-colors"
                            >
                              {sub.assigned_to && sub.assigned_to.length > 0 ? (
                                <span className="text-indigo-400 hover:text-indigo-300 font-semibold">
                                  {sub.assigned_to.map(uid => {
                                    const emp = projectTeam.find(e => String(e.employee_id) === String(uid));
                                    return emp ? emp.employee_name : uid;
                                  }).join(', ')}
                                </span>
                              ) : (
                                <span className="text-[var(--text-muted)] italic hover:text-indigo-400">Unassigned — click to assign</span>
                              )}
                            </button>
                          </td>

                          <td className="px-2 text-center">
                            <button
                              onClick={() => handleDeleteSubActivity(sub.id)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                              title="Delete Sub-Activity"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  {tasks.filter(t => t.parent_id === activeParentTask.id).length === 0 && (
                    <tr>
                      <td colSpan="11" className="py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <Layers size={28} className="text-[var(--text-muted)]/40" />
                          <p className="text-[var(--text-muted)] text-xs font-medium">No sub-activities configured</p>
                          <p className="text-[var(--text-muted)]/60 text-[10px]">Click &quot;Add Sub-Activity&quot; below to begin</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            </div>

            <div className="app-modal-footer">
              <button
                onClick={handleAddSubActivity}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-md shadow-indigo-500/20 transition-all active:scale-[0.98]"
              >
                <Plus size={14} /> Add Sub-Activity
              </button>
              <button
                onClick={() => setActiveParentTask(null)}
                className="px-5 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--table-hover)] transition-all"
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
        const assignedCount = (activeAssignTask.assigned_to || []).length;
        return (
          <div className="app-modal-overlay z-[99999]">
            <div className="app-modal-container w-full max-w-md flex flex-col">
              <div className="app-modal-header">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center flex-shrink-0">
                    <Users size={15} className="text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="app-modal-title">Assign Team Members</h3>
                    <p className="text-[10px] text-[var(--text-muted)] font-medium mt-0.5 truncate max-w-[260px]">
                      <span className="text-indigo-400 font-semibold">{activeAssignTask.activity_name}</span>
                    </p>
                  </div>
                </div>
                <button onClick={() => setActiveAssignTask(null)} className="app-modal-close-btn">
                  <X size={16} />
                </button>
              </div>

              <div className="app-modal-body flex flex-col gap-4">

                {/* Assignment Summary Badge */}
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-bold">
                    <Users size={10} />
                    {assignedCount} assigned
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    of {projectTeam.length} team members
                  </span>
                </div>

                {/* Manual Override Toggle */}
                <div className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                  <div className="flex flex-col">
                    <span className="font-bold text-xs text-[var(--text-primary)]">Manual Progress Override</span>
                    <span className="text-[10px] text-[var(--text-muted)] mt-0.5">Disable auto-calculation from resource weights</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer ml-3">
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
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-600 rounded-full peer peer-checked:bg-indigo-600 transition-colors relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-4"></div>
                  </label>
                </div>

                {/* Team Members List */}
                <div className="overflow-y-auto max-h-[42vh] flex flex-col gap-2 custom-scrollbar pr-0.5">
                {projectTeam.map(member => {
                  const isAssigned = (activeAssignTask.assigned_to || []).includes(String(member.employee_id));
                  const initials = (member.employee_name || '??').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                  const avatarColors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500', 'bg-violet-500'];
                  const avatarColor = avatarColors[member.employee_id % avatarColors.length] || 'bg-indigo-500';
                  return (
                    <div
                      key={member.employee_id}
                      className={`flex flex-col gap-2 p-3 rounded-xl border transition-all cursor-pointer ${
                        isAssigned
                          ? 'bg-indigo-500/8 border-indigo-500/30 shadow-sm shadow-indigo-500/10'
                          : 'border-[var(--border-subtle)]/30 hover:border-[var(--border-subtle)] hover:bg-[var(--table-hover)]/40'
                      }`}
                      onClick={() => {
                        const currentAssigned = activeAssignTask.assigned_to || [];
                        const nextAssigned = isAssigned
                          ? currentAssigned.filter(id => String(id) !== String(member.employee_id))
                          : [...currentAssigned, String(member.employee_id)];
                        handleCellChange(activeAssignTask.id, 'assigned_to', nextAssigned);
                        setActiveAssignTask(prev => ({ ...prev, assigned_to: nextAssigned }));
                      }}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center text-white font-extrabold text-[10px] flex-shrink-0 shadow-sm`}>
                          {initials}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[11px] text-[var(--text-primary)] truncate">{member.employee_name}</div>
                          <div className="flex items-center gap-1.5 text-[9px] text-[var(--text-muted)] mt-0.5">
                            <span className="font-semibold text-indigo-400">{member.role}</span>
                            <span className="text-[var(--border-subtle)]">•</span>
                            <span>{member.employee_department}</span>
                          </div>
                        </div>
                        {/* Checkbox indicator */}
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                          isAssigned ? 'bg-indigo-600 border-indigo-600' : 'border-[var(--border-subtle)] bg-transparent'
                        }`}>
                          {isAssigned && <CheckCircle size={11} className="text-white" />}
                        </div>
                      </div>

                      {/* Resource weight & progress — expanded when assigned */}
                      {isAssigned && !activeAssignTask.custom_values?.manual_completion_override && (
                        <div
                          className="flex items-center gap-3 pl-11 border-t border-indigo-500/15 pt-2 mt-0.5"
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase">Weight</span>
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
                                  custom_values: { ...(prev.custom_values || {}), resource_weights: newWeights }
                                }));
                              }}
                              className="w-16 px-2 py-1 border border-[var(--border-subtle)] bg-[var(--bg)] text-[var(--text-primary)] rounded-lg font-bold text-center focus:ring-2 focus:ring-indigo-500/50 outline-none font-mono text-[11px]"
                            />
                          </div>

                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase">Progress %</span>
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
                                  custom_values: { ...(prev.custom_values || {}), resource_progress: newProg }
                                }));
                              }}
                              className="w-16 px-2 py-1 border border-[var(--border-subtle)] bg-[var(--bg)] text-[var(--text-primary)] rounded-lg font-bold text-center focus:ring-2 focus:ring-indigo-500/50 outline-none font-mono text-[11px]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {projectTeam.length === 0 && (
                  <div className="py-10 text-center flex flex-col items-center gap-2">
                    <Users size={28} className="text-[var(--text-muted)]/40" />
                    <p className="text-[var(--text-muted)] text-xs font-medium">No project team members configured.</p>
                  </div>
                )}
                </div>
              </div>

              {/* Live task metrics footer summary */}
              <div className="app-modal-footer flex-col gap-3">
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-[var(--text-muted)] uppercase font-bold tracking-wider">Task Progress</span>
                      <span className="font-mono font-extrabold text-indigo-400 text-sm">{liveTask.complete_percent || 0}%</span>
                    </div>
                    <div className="w-px h-8 bg-[var(--border-subtle)]/40"></div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-[var(--text-muted)] uppercase font-bold tracking-wider">Status</span>
                      <span className={`font-bold text-[11px] ${
                        liveTask.status === 'Completed' ? 'text-emerald-400' :
                        liveTask.status === 'Delayed' ? 'text-rose-400' :
                        liveTask.status === 'In Progress' ? 'text-blue-400' :
                        'text-slate-400'
                      }`}>{liveTask.status || 'Not Started'}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveAssignTask(null)}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow shadow-indigo-500/20 text-sm transition-all active:scale-[0.98]"
                  >
                    Confirm
                  </button>
                </div>
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

      {/* TASK EDIT POPUP MODAL */}
      {editModalTaskId !== null && editDraft && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          onMouseDown={closeEditModal}
        >
          <div
            className="bg-[var(--surface)] text-[var(--text-primary)] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl border border-[var(--border-subtle)] custom-scrollbar"
            onMouseDown={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-subtle)] sticky top-0 bg-[var(--surface)] z-10">
              <div className="flex items-center gap-2">
                <Edit size={16} className="text-indigo-500" />
                <h3 className="font-bold text-sm">Edit Activity</h3>
              </div>
              <button onClick={closeEditModal} className="p-1.5 rounded hover:bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" title="Close">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 flex flex-col gap-4 text-xs">
              {/* Activity name */}
              <div className="flex flex-col gap-1">
                <label className="font-bold uppercase tracking-wider text-[10px] text-[var(--text-muted)]">Activity Name</label>
                <input
                  type="text"
                  value={editDraft.activity_name}
                  onChange={e => updateDraft('activity_name', e.target.value)}
                  className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Item type */}
                <div className="flex flex-col gap-1">
                  <label className="font-bold uppercase tracking-wider text-[10px] text-[var(--text-muted)]">Item Type</label>
                  <select
                    value={editDraft.item_type}
                    onChange={e => updateDraft('item_type', e.target.value)}
                    className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {['Phase', 'Task', 'Sub Task', 'Milestone', 'Approval Gate'].map(t => (
                      <option key={t} value={t} className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">{t}</option>
                    ))}
                  </select>
                </div>

                {/* Department dropdown (fixed) */}
                <div className="flex flex-col gap-1">
                  <label className="font-bold uppercase tracking-wider text-[10px] text-[var(--text-muted)]">Department</label>
                  <select
                    value={editDraft.department}
                    onChange={e => updateDraft('department', e.target.value)}
                    className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="" className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">— Select —</option>
                    {suggestedDepartments.map(d => (
                      <option key={d} value={d} className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">{d}</option>
                    ))}
                    {editDraft.department && !suggestedDepartments.includes(editDraft.department) && (
                      <option value={editDraft.department} className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">{editDraft.department}</option>
                    )}
                  </select>
                </div>

                {/* Status */}
                <div className="flex flex-col gap-1">
                  <label className="font-bold uppercase tracking-wider text-[10px] text-[var(--text-muted)]">Status</label>
                  <select
                    value={editDraft.status}
                    onChange={e => updateDraft('status', e.target.value)}
                    className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {['Not Started', 'Upcoming', 'In Progress', 'Completed', 'Delayed', 'On Hold', 'Cancelled'].map(s => (
                      <option key={s} value={s} className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">{s}</option>
                    ))}
                  </select>
                </div>

                {/* Pin */}
                <div className="flex flex-col gap-1">
                  <label className="font-bold uppercase tracking-wider text-[10px] text-[var(--text-muted)]">Pin / Marker</label>
                  <select
                    value={editDraft.pin_type}
                    onChange={e => updateDraft('pin_type', e.target.value)}
                    className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="" className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">None</option>
                    <option value="star" className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">⭐ Star</option>
                    <option value="flag" className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">🚩 Flag</option>
                    <option value="arrow" className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">➡️ Arrow</option>
                  </select>
                </div>
              </div>

              {/* Schedule dates */}
              {editDraft._isParent ? (
                <p className="text-[10px] italic text-[var(--text-muted)] bg-[var(--bg)] border border-[var(--border-subtle)] rounded px-2.5 py-1.5">
                  Dates for summary/phase rows are rolled up automatically from their sub-activities.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold uppercase tracking-wider text-[10px] text-[var(--text-muted)]">Planned Start</label>
                    <input type="date" value={editDraft.start_date} onChange={e => updateDraft('start_date', e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 font-mono" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold uppercase tracking-wider text-[10px] text-[var(--text-muted)]">Planned End</label>
                    <input type="date" value={editDraft.end_date} onChange={e => updateDraft('end_date', e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 font-mono" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold uppercase tracking-wider text-[10px] text-[var(--text-muted)]">Actual Start</label>
                    <input type="date" value={editDraft.actual_start} onChange={e => updateDraft('actual_start', e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 font-mono" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold uppercase tracking-wider text-[10px] text-[var(--text-muted)]">Actual End</label>
                    <input type="date" value={editDraft.actual_end} onChange={e => updateDraft('actual_end', e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 font-mono" />
                  </div>
                </div>
              )}

              {/* % complete + predecessors */}
              {!editDraft._isParent && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="font-bold uppercase tracking-wider text-[10px] text-[var(--text-muted)]">% Complete</label>
                    <input
                      type="number" min="0" max="100"
                      value={editDraft.complete_percent}
                      disabled={editDraft._hasResources && !editDraft._manualOverride}
                      onChange={e => updateDraft('complete_percent', e.target.value)}
                      className={`w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 font-mono ${editDraft._hasResources && !editDraft._manualOverride ? 'opacity-50 cursor-not-allowed' : ''}`}
                      title={editDraft._hasResources && !editDraft._manualOverride ? 'Calculated from resource weights/progress' : 'Manual completion %'}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-bold uppercase tracking-wider text-[10px] text-[var(--text-muted)]">Predecessors</label>
                    <input
                      type="text" placeholder="e.g. 1FS+3d, 2SS"
                      value={editDraft._predStr}
                      onChange={e => updateDraft('_predStr', e.target.value)}
                      className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Custom columns */}
              {customColumns.length > 0 && (
                <div className="grid grid-cols-2 gap-4 border-t border-[var(--border-subtle)] pt-3">
                  {customColumns.map(col => {
                    const val = editDraft.custom_values?.[col.column_name] || '';
                    return (
                      <div key={col.id} className="flex flex-col gap-1">
                        <label className="font-bold uppercase tracking-wider text-[10px] text-[var(--text-muted)]">{col.column_label}</label>
                        {col.data_type === 'select' ? (
                          <select value={val} onChange={e => updateDraftCustom(col.column_name, e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500">
                            <option value="" className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">—</option>
                            {col.options?.map(o => <option key={o} value={o} className="bg-[var(--dropdown-bg)] text-[var(--text-primary)]">{o}</option>)}
                          </select>
                        ) : (
                          <input type={col.data_type === 'number' ? 'number' : col.data_type === 'date' ? 'date' : 'text'} value={val} onChange={e => updateDraftCustom(col.column_name, e.target.value)} className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quick links to dedicated editors */}
              <div className="flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-3">
                <button
                  onClick={() => { const t = tasks.find(x => x.id === editDraft.id); if (t) setActiveAssignTask(t); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--bg)] border border-[var(--border-subtle)] hover:border-indigo-400 hover:text-indigo-600 font-semibold transition-colors"
                >
                  <Users size={12} /> Assign Resources
                </button>
                <button
                  onClick={() => { const t = tasks.find(x => x.id === editDraft.id); if (t) openFollowupEditor(t); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--bg)] border border-[var(--border-subtle)] hover:border-indigo-400 hover:text-indigo-600 font-semibold transition-colors"
                >
                  <Calendar size={12} /> Follow-ups
                </button>
                <button
                  onClick={() => { const t = tasks.find(x => x.id === editDraft.id); if (t) setActiveParentTask(t); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[var(--bg)] border border-[var(--border-subtle)] hover:border-indigo-400 hover:text-indigo-600 font-semibold transition-colors"
                >
                  <Layers size={12} /> Sub-Activities
                </button>
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[var(--border-subtle)] sticky bottom-0 bg-[var(--surface)]">
              <button onClick={closeEditModal} className="px-4 py-1.5 rounded font-semibold text-[var(--text-muted)] hover:bg-[var(--bg)] transition-colors">
                Cancel
              </button>
              <button onClick={saveEditModal} className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition-colors">
                <Save size={13} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GANTT INTERACTIVE HOVER TOOLTIP */}
      {hoveredTask && (
        <div 
          className="fixed z-[10000] pointer-events-none bg-slate-950/98 border border-slate-700/50 shadow-2xl rounded-xl p-4 text-[11px] text-slate-200 flex flex-col gap-2 backdrop-blur-lg max-w-sm transition-all duration-75 animate-fadeIn min-w-[240px] shadow-indigo-500/5"
          style={{ 
            left: Math.min(window.innerWidth - 260, tooltipPos.x), 
            top: Math.min(window.innerHeight - 240, tooltipPos.y) 
          }}
        >
          {/* Header row */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2">
            <span className="font-mono text-indigo-400 font-extrabold text-xs">WBS {hoveredTask.wbsCode}</span>
            <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-extrabold uppercase tracking-wide ${
              hoveredTask.status === 'Completed' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
              hoveredTask.status === 'Delayed' ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' :
              hoveredTask.status === 'In Progress' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
              'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              {hoveredTask.status}
            </span>
          </div>

          {/* Activity Name */}
          <div className="font-extrabold text-xs text-white leading-snug">{hoveredTask.activityName}</div>

          {/* Timeline details section */}
          <div className="flex flex-col gap-1.5 py-1.5 border-y border-slate-800/60 text-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-slate-500 font-bold uppercase">Planned Schedule</span>
              <span className="font-mono text-slate-200">{hoveredTask.plannedStartStr} – {hoveredTask.plannedEndStr}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-slate-500 font-bold uppercase">Planned Duration</span>
              <span className="font-semibold text-slate-200">{hoveredTask.duration} day{hoveredTask.duration > 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-slate-500 font-bold uppercase">Actual Schedule</span>
              <span className="font-mono text-slate-200">{hoveredTask.actualStartStr} – {hoveredTask.actualEndStr}</span>
            </div>
          </div>

          {/* Progress & Variance metrics */}
          <div className="grid grid-cols-2 gap-3 pt-1 text-slate-300">
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 font-bold uppercase">Variance</span>
              <span className={`font-mono font-extrabold text-[11px] mt-0.5 ${
                hoveredTask.varianceDays > 0 ? 'text-rose-400' : 
                hoveredTask.varianceDays < 0 ? 'text-emerald-400' : 'text-slate-400'
              }`}>
                {hoveredTask.varianceDays > 0 ? `+${hoveredTask.varianceDays}d Delay` :
                 hoveredTask.varianceDays < 0 ? `${hoveredTask.varianceDays}d Advance` : 'On Track'}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[9px] text-slate-500 font-bold uppercase">Progress</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="flex-1 h-2 rounded-full bg-slate-800 border border-slate-700/50 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      hoveredTask.status === 'Completed' ? 'bg-emerald-500' :
                      hoveredTask.status === 'Delayed' ? 'bg-rose-500' : 'bg-indigo-500'
                    }`} 
                    style={{ width: `${hoveredTask.completePercent}%` }} 
                  />
                </div>
                <span className="font-extrabold text-white font-mono">{hoveredTask.completePercent}%</span>
              </div>
            </div>

            {hoveredTask.assignedToNames && (
              <div className="flex flex-col col-span-2 border-t border-slate-800/40 pt-1.5">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Assigned Team</span>
                <span className="truncate text-slate-300 font-semibold mt-0.5">{hoveredTask.assignedToNames}</span>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default MilestoneManagement;
