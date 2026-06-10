import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, Mail, AlertTriangle, Calendar, Award, CheckCircle, Clock, TrendingUp, ClipboardList, AlertCircle, CheckCircle2, Users, RefreshCw, FileText, X, Table, BarChart3, Building2, ListTodo, Activity, Filter } from 'lucide-react';
import { useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import CriticalIssuesWidget from '../components/issues/CriticalIssuesWidget';
import TopRisksPanel from '../components/issues/TopRisksPanel';
import Skeleton from '../components/ui/skeleton';
import API from '../utils/api';
import { listIssues } from '../api/issues';
import './VPProjectDashboard.css';

const VPProjectDashboard = ({
  activeProject,
  dashboardData,
  onConfigure,
  onSendMail,
  metricsContent,
  visibleSections,
  milestones = [],
  isDashboardLoading = false,
  isDashboardError = false,
  onRetry = () => {}
}) => {
  const navigate = useNavigate();
  const [milestoneView, setMilestoneView] = useState('table'); // 'table' | 'chart'
  const [recentMeetings, setRecentMeetings] = useState([]);
  const [momIssues, setMomIssues] = useState([]);
  const [syncHistory, setSyncHistory] = useState([]);

  // --- Gantt Chart filters & state ---
  const [ganttDeptFilter, setGanttDeptFilter] = useState('All');
  const [ganttTypeFilter, setGanttTypeFilter] = useState('All');
  const [ganttStatusFilter, setGanttStatusFilter] = useState('All');
  const [zoomLevel, setZoomLevel] = useState('Week'); // 'Day' | 'Week' | 'Month'

  // --- Optimized Milestones for Table View (Dashboard optimized) ---
  const optimizedMilestones = useMemo(() => {
    return (milestones || []).filter(t => t.item_type === 'Phase' || t.item_type === 'Milestone');
  }, [milestones]);

  // --- Gantt Options & Timeline calculations ---
  const departmentOptions = useMemo(() => {
    const depts = new Set(['Engineering', 'Design', 'Procurement', 'Manufacturing', 'Quality', 'Installation', 'Commissioning']);
    (milestones || []).forEach(m => {
      if (m.department && m.department.trim()) depts.add(m.department.trim());
    });
    return Array.from(depts);
  }, [milestones]);

  const sortedMilestones = useMemo(() => {
    return [...(milestones || [])].sort((a, b) => (a.row_order || 0) - (b.row_order || 0));
  }, [milestones]);

  const ganttFilteredTasks = useMemo(() => {
    return sortedMilestones.filter(t => {
      if (ganttDeptFilter !== 'All' && t.department !== ganttDeptFilter) return false;
      if (ganttTypeFilter !== 'All' && t.item_type !== ganttTypeFilter) return false;
      if (ganttStatusFilter !== 'All' && t.status !== ganttStatusFilter) return false;
      return true;
    });
  }, [sortedMilestones, ganttDeptFilter, ganttTypeFilter, ganttStatusFilter]);

  const { timelineStart, timelineEnd, daysBetween } = useMemo(() => {
    if (!milestones || milestones.length === 0) {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      const end = new Date();
      end.setDate(end.getDate() + 90);
      return { timelineStart: start, timelineEnd: end, daysBetween: 97 };
    }

    let minDate = null;
    let maxDate = null;

    milestones.forEach(t => {
      if (t.start_date) {
        const d = new Date(t.start_date);
        if (!minDate || d < minDate) minDate = d;
      }
      if (t.end_date) {
        const d = new Date(t.end_date);
        if (!maxDate || d > maxDate) maxDate = d;
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

    const days = Math.ceil((endPadding - startPadding) / (1000 * 60 * 60 * 24)) || 1;
    return { timelineStart: startPadding, timelineEnd: endPadding, daysBetween: days };
  }, [milestones]);

  const pxPerDay = useMemo(() => {
    if (zoomLevel === 'Day') return 24;
    if (zoomLevel === 'Week') return 8;
    return 2.5; 
  }, [zoomLevel]);

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

  const getPhaseColors = useCallback((taskIndex) => {
    let phaseName = 'Contracts';
    const list = milestones || [];
    for (let i = taskIndex; i >= 0; i--) {
      const t = list[i];
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
  }, [milestones]);

  const ganttBars = useMemo(() => {
    return ganttFilteredTasks.map((t, idx) => {
      if (!t.start_date || !t.end_date) return null;

      const plannedStart = new Date(t.start_date);
      const plannedEnd = new Date(t.end_date);
      
      const plannedLeft = ((plannedStart - timelineStart) / 86400000) * pxPerDay;
      const plannedWidth = Math.max(4, ((plannedEnd - plannedStart) / 86400000) * pxPerDay);

      const isMilestone = t.item_type === 'Milestone' || t.item_type === 'Approval Gate';
      const isParent = t.item_type === 'Phase' || (milestones || []).some(child => child.parent_id === t.id);
      
      const originalIndex = (milestones || []).findIndex(m => m.id === t.id);
      const colors = getPhaseColors(originalIndex >= 0 ? originalIndex : idx);

      return {
        id: t.id,
        plannedLeft,
        plannedWidth,
        isMilestone,
        isParent,
        completePercent: t.complete_percent || 0,
        activityName: t.activity_name,
        wbsCode: t.wbs_code,
        colors,
        status: t.status,
        startDateStr: plannedStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      };
    });
  }, [ganttFilteredTasks, timelineStart, pxPerDay, milestones, getPhaseColors]);

  const rowHeight = 50;

  // --- Pinned Issues State ---
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [pinnedIssueIds, setPinnedIssueIds] = useState(() => {
    try {
      const stored = localStorage.getItem(`caldim_pinned_issues_${activeProject?.dbProjectId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });
  const [tempPinnedIds, setTempPinnedIds] = useState([]);

  // Sync pinned issues if project changes
  useEffect(() => {
    if (activeProject?.dbProjectId) {
      try {
        const stored = localStorage.getItem(`caldim_pinned_issues_${activeProject.dbProjectId}`);
        setPinnedIssueIds(stored ? JSON.parse(stored) : []);
      } catch (e) {
        setPinnedIssueIds([]);
      }
    }
  }, [activeProject?.dbProjectId]);

  const filteredMomIssues = useMemo(() => {
    if (syncHistory.length === 0) {
      return momIssues;
    }
    const latestSync = syncHistory[0];
    return momIssues.filter(i => 
      (i.sync_id && i.sync_id === latestSync.sync_id) || 
      (i.meeting_id && (i.meeting_id === latestSync.session_id || i.meeting_id === latestSync.meeting_id))
    );
  }, [momIssues, syncHistory]);

  const displayIssues = useMemo(() => {
    if (pinnedIssueIds.length > 0) {
      const pinned = filteredMomIssues.filter(i => pinnedIssueIds.includes(i.id));
      if (pinned.length > 0) return pinned;
    }
    return filteredMomIssues.slice(0, 5);
  }, [filteredMomIssues, pinnedIssueIds]);

  const [loadingMom, setLoadingMom] = useState(false);

  const fetchingRef = useRef(false);
  const projectIdRef = useRef(null);

  const fetchMomIssues = useCallback(() => {
    if (!activeProject?.dbProjectId) return;

    // Guard: skip if already fetching
    if (fetchingRef.current) {
      console.log('[VPPD] Fetch already in progress, skipping duplicate call');
      return;
    }

    fetchingRef.current = true;
    setLoadingMom(true);
    console.log('[VPPD] Fetching issues for project:',
      activeProject.dbProjectId, activeProject.name);

    const issuesPromise = listIssues({ project_id: activeProject.dbProjectId });
    const historyPromise = API.get(
      `/mom/history/project/${activeProject.dbProjectId}`
    ).catch(() => ({ data: [] }));

    Promise.all([issuesPromise, historyPromise])
      .then(([issues, historyRes]) => {
        const momSpecific = Array.isArray(issues)
          ? issues
            .filter(i => (i.source || '').toUpperCase() === 'MOM')
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          : [];
        setMomIssues(momSpecific);

        if (Array.isArray(historyRes?.data)) {
          setSyncHistory(historyRes.data);
        }
      })
      .catch(err => {
        console.error('[VPPD] Fetch error:', err.message);
        setMomIssues([]);
      })
      .finally(() => {
        setLoadingMom(false);
        fetchingRef.current = false;
      });
  }, [activeProject?.dbProjectId]);  // depend on ID only, not full object

  useEffect(() => {
    // Only fetch when project ID actually changes
    const newId = activeProject?.dbProjectId;
    if (!newId || newId === projectIdRef.current) return;
    projectIdRef.current = newId;

    fetchMomIssues();

    API.get('/meetings')
      .then(res => {
        if (res.data?.success) {
          const projectMeetings = (res.data.meetings || [])
            .filter(m => String(m.project_id) === String(newId))
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);
          setRecentMeetings(projectMeetings);
        }
      })
      .catch(() => { });

    const refreshTimeoutRef = { current: null };
    const handleRemoteUpdate = () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = setTimeout(() => {
        fetchingRef.current = false;  // reset guard before refresh
        fetchMomIssues();
      }, 800);
    };

    window.addEventListener('MOM_SAVED', handleRemoteUpdate);
    window.addEventListener('ISSUE_SYNCED', handleRemoteUpdate);

    return () => {
      window.removeEventListener('MOM_SAVED', handleRemoteUpdate);
      window.removeEventListener('ISSUE_SYNCED', handleRemoteUpdate);
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, [activeProject?.dbProjectId, fetchMomIssues]);



  const getMilestoneChartOption = useCallback(() => {
    const displayTasks = [...(milestones || [])]
      .filter(t => t.item_type !== 'Phase')
      .slice(0, 15)
      .reverse();

    const categories = displayTasks.map(t => t.activity_name);
    const startDates = displayTasks.map(t => t.start_date ? new Date(t.start_date).getTime() : new Date().getTime());
    const endDates = displayTasks.map(t => t.end_date ? new Date(t.end_date).getTime() : new Date().getTime());
    const durations = endDates.map((end, idx) => Math.max(0, end - startDates[idx]));

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#1e293b',
        borderColor: '#475569',
        textStyle: { color: '#f8fafc', fontSize: 11 },
        formatter: (params) => {
          const tar = params[1] || params[0];
          const taskName = tar.name;
          const task = displayTasks.find(t => t.activity_name === taskName);
          if (!task) return '';
          const start = task.start_date ? new Date(task.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
          const end = task.end_date ? new Date(task.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
          return `<div style="padding: 4px 6px;">
            <strong style="color: #6366f1; font-size: 12px; display: block; margin-bottom: 4px;">${taskName}</strong>
            Start: <span style="font-weight: 600; color: #fff;">${start}</span><br/>
            End: <span style="font-weight: 600; color: #fff;">${end}</span><br/>
            Progress: <span style="font-weight: 600; color: #fff;">${Math.round(task.complete_percent || 0)}%</span><br/>
            Status: <span style="font-weight: 600; color: #fff;">${task.status || 'Not Started'}</span>
          </div>`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '5%',
        top: '5%',
        containLabel: true
      },
      xAxis: {
        type: 'time',
        axisLabel: {
          color: 'var(--text-secondary)',
          fontSize: 10,
          formatter: (value) => {
            return new Date(value).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
          }
        },
        splitLine: {
          lineStyle: {
            color: 'var(--border-subtle)',
            type: 'dashed'
          }
        },
        axisLine: {
          lineStyle: { color: 'var(--border-subtle)' }
        }
      },
      yAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          color: 'var(--text-primary)',
          fontSize: 10,
          width: 180,
          overflow: 'truncate'
        },
        axisLine: {
          lineStyle: { color: 'var(--border-subtle)' }
        }
      },
      series: [
        {
          name: 'Placeholder',
          type: 'bar',
          stack: 'Timeline',
          itemStyle: {
            borderColor: 'transparent',
            color: 'transparent'
          },
          emphasis: {
            itemStyle: {
              borderColor: 'transparent',
              color: 'transparent'
            }
          },
          data: startDates
        },
        {
          name: 'Duration',
          type: 'bar',
          stack: 'Timeline',
          itemStyle: {
            color: (params) => {
              const taskName = params.name;
              const task = displayTasks.find(t => t.activity_name === taskName);
              if (!task) return '#3b82f6';
              const colors = {
                'Completed': '#10b981',
                'In Progress': '#3b82f6',
                'Delayed': '#ef4444',
                'Upcoming': '#6366f1',
                'On Hold': '#f59e0b'
              };
              return colors[task.status] || '#64748b';
            },
            borderRadius: 4
          },
          data: durations
        }
      ]
    };
  }, [milestones]);

  return (
    <div className="vppd-root" style={{ padding: 0 }}>
      <div className="vppd-main-grid" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

        {/* ── PROJECT MILESTONES & TIMELINE ── */}
        {visibleSections.milestones && (
          <div className="vppd-section full" style={{
            backgroundColor: 'var(--surface)',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid var(--border-strong)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="var(--accent)" />
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em', textTransform: 'uppercase' }}>
                  PROJECT MILESTONES & TIMELINE
                </span>
              </div>
              {!isDashboardLoading && !isDashboardError && milestones.length > 0 && (
                <div style={{ display: 'flex', background: 'var(--bg)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <button
                    onClick={() => setMilestoneView('table')}
                    style={{
                      padding: '6px 12px',
                      fontSize: '11px',
                      fontWeight: '800',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: milestoneView === 'table' ? 'var(--surface)' : 'transparent',
                      color: milestoneView === 'table' ? 'var(--accent)' : 'var(--text-muted)',
                      boxShadow: milestoneView === 'table' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Table size={12} />
                    Table View
                  </button>
                  <button
                    onClick={() => setMilestoneView('chart')}
                    style={{
                      padding: '6px 12px',
                      fontSize: '11px',
                      fontWeight: '800',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: milestoneView === 'chart' ? 'var(--surface)' : 'transparent',
                      color: milestoneView === 'chart' ? 'var(--accent)' : 'var(--text-muted)',
                      boxShadow: milestoneView === 'chart' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    <BarChart3 size={12} />
                    Timeline Chart
                  </button>
                </div>
              )}
            </header>

            {/* Loading State */}
            {isDashboardLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Skeleton className="h-10 w-full" />
                {Array.from({ length: 4 }).map((_, idx) => (
                  <Skeleton key={`milestones-skeleton-${idx}`} className="h-8 w-full" />
                ))}
              </div>
            )}

            {/* Error State */}
            {!isDashboardLoading && isDashboardError && (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}>
                <AlertTriangle size={32} color="#ef4444" />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#991b1b' }}>Failed to load project milestones</span>
                <button
                  onClick={onRetry}
                  style={{
                    padding: '6px 16px',
                    fontSize: '12px',
                    fontWeight: '700',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Retry Loading
                </button>
              </div>
            )}

            {/* Empty State */}
            {!isDashboardLoading && !isDashboardError && milestones.length === 0 && (
              <div style={{
                padding: '40px 20px',
                background: 'var(--surface)',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px dashed var(--border-subtle)',
                textAlign: 'center'
              }}>
                <div style={{ marginBottom: '16px', color: 'var(--text-muted)', opacity: 0.4 }}>
                  <Calendar size={48} strokeWidth={1} />
                </div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                  No milestones configured yet
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', maxWidth: '360px', lineHeight: 1.5 }}>
                  Go to Project Master -> Detailed View -> Milestone Management tab to create and manage WBS schedules for this project.
                </div>
                <button
                  onClick={() => navigate(`/dashboard/masters/project-master/${activeProject?.dbProjectId || activeProject?.id}`)}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
                  }}
                >
                  Go to Milestone Management
                </button>
              </div>
            )}

            {/* Normal State */}
            {!isDashboardLoading && !isDashboardError && milestones.length > 0 && (
              milestoneView === 'table' ? (
                <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--elevated-card)', borderBottom: '1px solid var(--border-subtle)' }}>
                          <th style={{ padding: '10px 14px', fontWeight: '700', color: 'var(--text-secondary)', width: '90px' }}>WBS</th>
                          <th style={{ padding: '10px 14px', fontWeight: '700', color: 'var(--text-secondary)' }}>Activity / Milestone</th>
                          <th style={{ padding: '10px 14px', fontWeight: '700', color: 'var(--text-secondary)', width: '110px' }}>Start Date</th>
                          <th style={{ padding: '10px 14px', fontWeight: '700', color: 'var(--text-secondary)', width: '110px' }}>End Date</th>
                          <th style={{ padding: '10px 14px', fontWeight: '700', color: 'var(--text-secondary)', width: '90px', textAlign: 'center' }}>Progress</th>
                          <th style={{ padding: '10px 14px', fontWeight: '700', color: 'var(--text-secondary)', width: '120px', textAlign: 'center' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {optimizedMilestones.map((task) => {
                          const isPhase = task.item_type === 'Phase';
                          const isMilestone = task.item_type === 'Milestone';
                          const indent = (task.indent_level || 0) * 16;
                          
                          const formattedStart = task.start_date ? new Date(task.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                          const formattedEnd = task.end_date ? new Date(task.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                          
                          const statusColors = {
                            'Completed': { bg: 'var(--green-50)', text: 'var(--green-900)', border: 'var(--green-200)' },
                            'In Progress': { bg: 'var(--blue-50)', text: 'var(--blue-900)', border: 'var(--blue-200)' },
                            'Delayed': { bg: 'var(--red-50)', text: 'var(--red-900)', border: 'var(--red-200)' },
                            'Upcoming': { bg: 'var(--indigo-50)', text: 'var(--indigo-900)', border: 'var(--indigo-200)' },
                            'On Hold': { bg: 'var(--amber-50)', text: 'var(--amber-900)', border: 'var(--amber-200)' },
                            'Not Started': { bg: 'var(--elevated-card)', text: 'var(--text-secondary)', border: 'var(--border-subtle)' },
                            'Cancelled': { bg: 'var(--border-subtle)', text: 'var(--text-muted)', border: 'var(--border-subtle)' },
                          };
                          const statusVal = task.status || 'Not Started';
                          const colorSet = statusColors[statusVal] || statusColors['Not Started'];

                          return (
                            <tr key={task.id} style={{
                              borderBottom: '1px solid var(--border-subtle)',
                              backgroundColor: isPhase ? 'var(--elevated-card)' : 'transparent',
                              fontWeight: isPhase ? '700' : '500'
                            }}>
                              <td style={{ padding: '10px 14px', color: isPhase ? 'var(--text-primary)' : 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                {task.wbs_code}
                              </td>
                              <td style={{ padding: '10px 14px', paddingLeft: `${14 + indent}px` }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  {isMilestone && <span style={{ display: 'inline-block', width: '6px', height: '6px', transform: 'rotate(45deg)', backgroundColor: 'var(--accent)', flexShrink: 0 }} />}
                                  <span style={{ color: isMilestone ? 'var(--accent)' : 'var(--text-primary)' }}>
                                    {task.activity_name}
                                  </span>
                                </div>
                              </td>
                              <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{formattedStart}</td>
                              <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{formattedEnd}</td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                  <div style={{ width: '40px', backgroundColor: 'var(--border-subtle)', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: `${task.complete_percent || 0}%`, backgroundColor: isPhase ? 'var(--accent)' : 'var(--blue)', height: '100%' }} />
                                  </div>
                                  <span style={{ fontSize: '11px', minWidth: '24px', textAlign: 'right' }}>{Math.round(task.complete_percent || 0)}%</span>
                                </div>
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                <span style={{
                                  backgroundColor: colorSet.bg,
                                  color: colorSet.text,
                                  border: `1px solid ${colorSet.border}`,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  textTransform: 'uppercase',
                                  display: 'inline-block',
                                  minWidth: '90px'
                                }}>
                                  {statusVal}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: 'var(--surface)',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  {/* ── GANTT FILTER BAR ── */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '12px 16px',
                    backgroundColor: 'var(--elevated-card)',
                    borderBottom: '1px solid var(--border-subtle)'
                  }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: 'var(--accent)' }}>
                        <Filter size={14} />
                        GANTT FILTER
                      </div>
                      
                      {/* Dept Filter */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                        <Building2 size={13} color="var(--text-muted)" />
                        <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>Dept:</span>
                        <select
                          value={ganttDeptFilter}
                          onChange={e => setGanttDeptFilter(e.target.value)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: 'var(--bg)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            outline: 'none'
                          }}
                        >
                          <option value="All">All Departments</option>
                          {departmentOptions.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      {/* Type Filter */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                        <ListTodo size={13} color="var(--text-muted)" />
                        <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>Type:</span>
                        <select
                          value={ganttTypeFilter}
                          onChange={e => setGanttTypeFilter(e.target.value)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: 'var(--bg)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            outline: 'none'
                          }}
                        >
                          <option value="All">All Types</option>
                          {['Phase', 'Task', 'Sub Task', 'Milestone', 'Approval Gate'].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      {/* Status Filter */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                        <Activity size={13} color="var(--text-muted)" />
                        <span style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>Status:</span>
                        <select
                          value={ganttStatusFilter}
                          onChange={e => setGanttStatusFilter(e.target.value)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: 'var(--bg)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-primary)',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            outline: 'none'
                          }}
                        >
                          <option value="All">All Statuses</option>
                          {['Not Started', 'Upcoming', 'In Progress', 'Completed', 'Delayed', 'On Hold', 'Cancelled'].map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      {/* Zoom Controls */}
                      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg)', padding: '2px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                        {[
                          { lvl: 'Day', label: 'D' },
                          { lvl: 'Week', label: 'W' },
                          { lvl: 'Month', label: 'M' }
                        ].map(z => (
                          <button
                            key={z.lvl}
                            onClick={() => setZoomLevel(z.lvl)}
                            style={{
                              padding: '2px 8px',
                              fontSize: '10px',
                              fontWeight: '700',
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              backgroundColor: zoomLevel === z.lvl ? 'var(--accent)' : 'transparent',
                              color: zoomLevel === z.lvl ? 'white' : 'var(--text-muted)',
                              transition: 'all 0.15s'
                            }}
                          >
                            {z.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
                      Showing <strong style={{ color: 'var(--text-primary)' }}>{ganttFilteredTasks.length}</strong> of {milestones.length} tasks
                    </div>
                  </div>

                  {/* ── GANTT TIMELINE TIMELINE CANVAS ── */}
                  <div style={{
                    flex: 1,
                    overflow: 'auto',
                    position: 'relative',
                    maxHeight: '450px',
                    minHeight: '320px',
                    backgroundColor: 'var(--bg)'
                  }}>
                    {ganttFilteredTasks.length === 0 ? (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '320px',
                        color: 'var(--text-muted)',
                        fontSize: '13px'
                      }}>
                        No tasks match the active Gantt filters.
                      </div>
                    ) : (
                      <div style={{
                        width: timelineWidth,
                        height: ganttFilteredTasks.length * rowHeight + 52,
                        position: 'relative',
                        backgroundColor: 'var(--surface)'
                      }}>
                        {/* Headers */}
                        <div style={{
                          height: '52px',
                          backgroundColor: 'var(--elevated-card)',
                          borderBottom: '2px solid var(--border-subtle)',
                          position: 'sticky',
                          top: 0,
                          zIndex: 20,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'end'
                        }}>
                          {/* Top month tier */}
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '26px',
                            borderBottom: '1px solid var(--border-subtle)',
                            display: 'flex',
                            fontSize: '11px',
                            fontWeight: '800',
                            color: 'var(--text-primary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            overflow: 'hidden'
                          }}>
                            {timelineHeaders.topHeaders.map(th => (
                              <div
                                key={th.key}
                                style={{
                                  position: 'absolute',
                                  left: th.left,
                                  width: th.width,
                                  top: 0,
                                  height: '100%',
                                  borderRight: '1px solid var(--border-subtle)',
                                  paddingLeft: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                <span style={{ color: 'var(--accent)', marginRight: '4px' }}>▶</span>
                                {th.label}
                              </div>
                            ))}
                          </div>
                          
                          {/* Bottom week tier */}
                          <div style={{
                            height: '26px',
                            position: 'relative',
                            display: 'flex',
                            fontSize: '9px',
                            fontWeight: '700',
                            color: 'var(--text-secondary)',
                            backgroundColor: 'var(--surface)'
                          }}>
                            {timelineHeaders.bottomHeaders.map(bh => (
                              <div
                                key={bh.key}
                                style={{
                                  position: 'absolute',
                                  left: bh.left,
                                  width: bh.width,
                                  bottom: 0,
                                  height: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  paddingLeft: '4px',
                                  borderLeft: '1px solid var(--border-subtle)'
                                }}
                                title={bh.title}
                              >
                                {bh.label}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Grid lines */}
                        <div style={{
                          position: 'absolute',
                          top: '52px',
                          left: 0,
                          width: '100%',
                          height: `${ganttFilteredTasks.length * rowHeight}px`,
                          pointerEvents: 'none'
                        }}>
                          {Array.from({ length: daysBetween }).map((_, i) => {
                            const tickDate = new Date(timelineStart);
                            tickDate.setDate(tickDate.getDate() + i);
                            const isWeekend = tickDate.getDay() === 0 || tickDate.getDay() === 6;
                            
                            let showLine = true;
                            let isMajorLine = false;
                            let isMonthStart = false;

                            if (zoomLevel === 'Day') {
                              isMajorLine = tickDate.getDay() === 1;
                              isMonthStart = tickDate.getDate() === 1;
                            } else if (zoomLevel === 'Week') {
                              showLine = tickDate.getDay() === 1;
                              isMajorLine = tickDate.getDate() <= 7;
                              isMonthStart = tickDate.getDate() <= 7;
                            } else if (zoomLevel === 'Month') {
                              showLine = tickDate.getDate() === 1;
                              isMajorLine = tickDate.getMonth() === 0;
                              isMonthStart = true;
                            }

                            if (!showLine) return null;

                            return (
                              <div 
                                key={i} 
                                style={{
                                  position: 'absolute',
                                  left: i * pxPerDay,
                                  width: pxPerDay,
                                  top: 0,
                                  height: '100%',
                                  borderLeft: isMonthStart ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                                  opacity: isMonthStart ? 0.3 : 0.15,
                                  backgroundColor: zoomLevel === 'Day' && isWeekend ? 'rgba(100, 116, 139, 0.05)' : 'transparent'
                                }}
                              />
                            );
                          })}
                        </div>

                        {/* Row stripes background */}
                        <div style={{
                          position: 'absolute',
                          top: '52px',
                          left: 0,
                          width: '100%',
                          height: `${ganttFilteredTasks.length * rowHeight}px`,
                          pointerEvents: 'none'
                        }}>
                          {ganttFilteredTasks.map((t, i) => (
                            <div 
                              key={t.id}
                              style={{
                                position: 'absolute',
                                top: i * rowHeight,
                                height: rowHeight,
                                left: 0,
                                width: '100%',
                                borderBottom: '1px solid var(--border-subtle)',
                                opacity: 0.25,
                                backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(100, 116, 139, 0.02)'
                              }}
                            />
                          ))}
                        </div>

                        {/* Today Line */}
                        {todayLeft !== null && (
                          <div style={{
                            position: 'absolute',
                            left: todayLeft,
                            top: '52px',
                            bottom: 0,
                            width: '2px',
                            backgroundColor: 'red',
                            zIndex: 15,
                            pointerEvents: 'none',
                            boxShadow: '0 0 6px rgba(239, 68, 68, 0.4)'
                          }}>
                            <div style={{
                              position: 'absolute',
                              top: '-4px',
                              left: '-5px',
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              backgroundColor: 'red'
                            }} title={`Today: ${new Date().toLocaleDateString()}`} />
                            <span style={{
                              position: 'absolute',
                              top: '-16px',
                              left: '-16px',
                              fontSize: '8px',
                              fontWeight: '800',
                              color: 'red',
                              backgroundColor: 'var(--bg)',
                              padding: '1px 3px',
                              borderRadius: '4px',
                              border: '1px solid red',
                              whiteSpace: 'nowrap'
                            }}>TODAY</span>
                          </div>
                        )}

                        {/* Gantt Row Items */}
                        <div style={{
                          position: 'absolute',
                          top: '52px',
                          left: 0,
                          width: '100%',
                          height: `${ganttFilteredTasks.length * rowHeight}px`
                        }}>
                          {ganttBars.map((bar, idx) => {
                            if (!bar) return null;
                            const color = bar.colors.fill;
                            
                            const isMilestone = bar.isMilestone;
                            const isParent = bar.isParent;

                            return (
                              <div
                                key={bar.id}
                                style={{
                                  position: 'absolute',
                                  left: 0,
                                  width: '100%',
                                  top: idx * rowHeight,
                                  height: rowHeight,
                                  display: 'flex',
                                  alignItems: 'center',
                                  borderBottom: '1px solid var(--border-subtle)',
                                  backgroundColor: isParent ? 'rgba(100, 116, 139, 0.02)' : 'transparent'
                                }}
                              >
                                {isMilestone ? (
                                  <>
                                    {/* Diamond */}
                                    <div 
                                      className="shadow-md"
                                      style={{ 
                                        position: 'absolute',
                                        left: bar.plannedLeft - 5,
                                        top: '22px',
                                        width: '10px',
                                        height: '10px',
                                        transform: 'rotate(45deg)',
                                        backgroundColor: color,
                                        border: '1.5px solid #fff',
                                        zIndex: 10
                                      }}
                                      title={`Milestone: ${bar.activityName}`}
                                    />
                                  </>
                                ) : isParent ? (
                                  <>
                                    {/* Phase parent summary bar */}
                                    <svg 
                                      className="absolute overflow-visible pointer-events-none" 
                                      style={{
                                        position: 'absolute',
                                        left: bar.plannedLeft - 2,
                                        width: Math.max(8, bar.plannedWidth) + 4,
                                        top: '22px',
                                        height: '12px',
                                        zIndex: 10
                                      }}
                                    >
                                      <path d={`M 2 2 H ${bar.plannedWidth + 2} V 8 H 2 Z`} fill={color} />
                                      <path d="M 2 2 L 6 8 L 6 2 Z" fill={color} />
                                      <path d={`M ${bar.plannedWidth + 2} 2 L ${bar.plannedWidth - 2} 8 L ${bar.plannedWidth - 2} 2 Z`} fill={color} />
                                    </svg>
                                  </>
                                ) : (
                                  <>
                                    {/* Standard task bar */}
                                    <div 
                                      style={{
                                        position: 'absolute',
                                        left: bar.plannedLeft,
                                        width: bar.plannedWidth,
                                        top: '22px',
                                        height: '8px',
                                        borderRadius: '4px',
                                        backgroundColor: 'rgba(100, 116, 139, 0.15)',
                                        border: '1px solid var(--border-subtle)',
                                        overflow: 'hidden',
                                        zIndex: 10
                                      }}
                                    >
                                      <div 
                                        style={{ 
                                          width: `${bar.completePercent}%`,
                                          backgroundColor: color,
                                          height: '100%'
                                        }} 
                                      />
                                    </div>
                                  </>
                                )}

                                {/* Inline Text Label (above the bar) */}
                                <span
                                  style={{
                                    position: 'absolute',
                                    left: isMilestone ? bar.plannedLeft + 12 : bar.plannedLeft,
                                    top: '4px',
                                    maxWidth: '420px',
                                    fontSize: '10px',
                                    fontWeight: '700',
                                    color: 'var(--text-primary)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    pointerEvents: 'none',
                                    lineHeight: 'none'
                                  }}
                                >
                                  {bar.activityName} {bar.completePercent > 0 && ` (${Math.round(bar.completePercent)}%)`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* ── PROJECT METRICS SUMMARY ── */}
        {visibleSections.metricsSummary && metricsContent && (
          <div className="vppd-section full">
            <div className="vppd-section-header">
              <TrendingUp size={18} color="var(--accent)" />
              Project Metrics Summary
            </div>
            <div style={{ padding: '0px' }}>
              {metricsContent}
            </div>
          </div>
        )}

        {/* ── MOM ISSUES ── */}
        {visibleSections.criticalIssues && (
          <div className="vppd-section full">
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '18px 24px', 
              borderBottom: '1px solid var(--border-subtle)',
              background: 'linear-gradient(to right, var(--elevated-card), var(--surface))'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                  CRITICAL ISSUES
                </span>
                
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Total Pill */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: 'var(--elevated-card)', 
                  border: '1px solid var(--border-subtle)', 
                  borderRadius: '6px', 
                  padding: '4px 10px',
                  fontSize: '11px', 
                  fontWeight: 700, 
                  color: 'var(--text-secondary)'
                }}>
                  <ClipboardList size={12} color="var(--text-muted)" />
                  TOTAL: <span style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{filteredMomIssues.length}</span>
                </div>
                
                {/* Pending Pill */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: 'var(--amber-50)', 
                  border: '1px solid var(--amber-200)', 
                  borderRadius: '6px', 
                  padding: '4px 10px',
                  fontSize: '11px', 
                  fontWeight: 700, 
                  color: 'var(--amber-900)'
                }}>
                  <AlertCircle size={12} color="var(--amber)" />
                  PENDING: <span style={{ color: 'var(--amber-900)', fontVariantNumeric: 'tabular-nums' }}>{filteredMomIssues.filter(i => i.status !== 'Closed' && i.status !== 'Resolved').length}</span>
                </div>

                {/* Resolved Pill */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: 'var(--green-50)', 
                  border: '1px solid var(--green-200)', 
                  borderRadius: '6px', 
                  padding: '4px 10px',
                  fontSize: '11px', 
                  fontWeight: 700, 
                  color: 'var(--green-900)'
                }}>
                  <CheckCircle2 size={12} color="var(--green)" />
                  RESOLVED: <span style={{ color: 'var(--green-900)', fontVariantNumeric: 'tabular-nums' }}>{filteredMomIssues.filter(i => i.status === 'Closed' || i.status === 'Resolved').length}</span>
                </div>

                {/* Vertical Divider */}
                <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)', margin: '0 4px' }} />

                {/* Premium Refresh Button */}
                <button
                  onClick={() => {
                    fetchingRef.current = false;
                    fetchMomIssues();
                  }}
                  disabled={loadingMom}
                  style={{ 
                    fontSize: '11px', 
                    fontWeight: 700,
                    color: 'var(--accent)', 
                    background: 'var(--elevated-card)', 
                    border: '1px solid var(--border-subtle)', 
                    borderRadius: '6px',
                    padding: '5px 12px',
                    cursor: loadingMom ? 'default' : 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s',
                  }}
                >
                  <RefreshCw size={12} style={{ animation: loadingMom ? 'spin 1s linear infinite' : 'none' }} />
                  REFRESH
                </button>
              </div>
            </div>
            <div className="vppd-meeting-list" style={{ padding: '0px' }}>
              {momIssues.length === 0 ? (
                <div className="vppd-empty" style={{ padding: '60px 20px', background: 'var(--surface)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-subtle)' }}>
                  <div style={{ marginBottom: '20px', color: 'var(--text-muted)', opacity: 0.5 }}>
                    <FileText size={48} strokeWidth={1} />
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>No meeting issues synced yet.</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '24px', maxWidth: '320px', textAlign: 'center', lineHeight: 1.5 }}>
                    Capture meeting minutes and sync your action items to track them here in the unified dashboard.
                  </div>
                  <button
                    onClick={() => navigate('/dashboard/mom/capture')}
                    style={{
                      padding: '10px 24px', background: 'var(--accent)', color: 'white', border: 'none',
                      borderRadius: '8px', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)', transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    Capture New Meeting
                  </button>
                </div>
              ) : (
                <div className="vppd-mom-table-container animate-fadeIn">
                  {/* Form Style Header */}
                  <div className="vppd-mom-form-header" style={{ padding: '16px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={16} color="var(--accent)" />
                      <h2 className="vppd-mom-form-title" style={{ margin: 0, fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Minutes of Meeting (MOM Action Items)
                      </h2>
                    </div>
                    <div className="vppd-mom-form-meta" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                      FORM NO: MOM/DB/2026 <span className="mx-2" style={{ color: 'var(--border-subtle)' }}>|</span> REV: 0.1
                    </div>
                  </div>

                  <div className="vppd-table-wrapper" style={{ border: '1px solid var(--border-subtle)', borderRadius: '4px', overflow: 'hidden' }}>
                    <table className="vppd-mom-table">
                      <thead>
                        <tr>
                          <th style={{ width: '50px' }}>S.No</th>
                          <th style={{ width: '100px' }}>Function</th>
                          <th style={{ width: '150px' }}>Project</th>
                          <th style={{ width: '100px' }}>Criticality</th>
                          <th>Action Points Discussed</th>
                          <th style={{ width: '150px' }}>Responsibility</th>
                          <th style={{ width: '100px' }}>Target</th>
                          <th style={{ width: '120px' }}>Status</th>
                          <th style={{ width: '180px' }}>Action Taken</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingMom ? (
                          Array.from({ length: 5 }).map((_, rIdx) => (
                            <tr key={`skeleton-${rIdx}`}>
                              <td style={{ textAlign: 'center' }}><Skeleton className="h-4 w-4 mx-auto" /></td>
                              <td><Skeleton className="h-4 w-16 mx-auto" /></td>
                              <td><Skeleton className="h-4 w-24 mx-auto" /></td>
                              <td><Skeleton className="h-5 w-16 rounded mx-auto" /></td>
                              <td>
                                <Skeleton className="h-4 w-32 mb-1" />
                                <Skeleton className="h-3 w-48" />
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Skeleton className="h-6 w-6 rounded-full" />
                                  <Skeleton className="h-4 w-16" />
                                </div>
                              </td>
                              <td><Skeleton className="h-4 w-12 mx-auto" /></td>
                              <td><Skeleton className="h-5 w-16 rounded mx-auto" /></td>
                              <td><Skeleton className="h-4 w-28" /></td>
                            </tr>
                          ))
                        ) : (
                          displayIssues.map((issue, idx) => {
                            const priority = issue.priority || 'Medium';
                            const critStyles = {
                              'High': { bg: 'var(--red-50)', color: 'var(--red-900)', border: 'var(--red-200)' },
                              'Medium': { bg: 'var(--amber-50)', color: 'var(--amber-900)', border: 'var(--amber-200)' },
                              'Low': { bg: 'var(--green-50)', color: 'var(--green-900)', border: 'var(--green-200)' },
                              'Critical': { bg: 'var(--red)', color: '#FFFFFF', border: 'var(--red-700)' },
                            }[priority] || { bg: 'var(--elevated-card)', color: 'var(--text-secondary)', border: 'var(--border-subtle)' };

                            const normalizeStatus = (status) => {
                              if (!status) return 'Pending';
                              const s = status.toLowerCase();
                              if (['open', 'pending', 'in progress'].includes(s)) return 'Pending';
                              if (['closed', 'done', 'resolved', 'complete'].includes(s)) return 'Resolved';
                              return status;
                            };

                            const isClosed = ['closed', 'done', 'resolved', 'complete'].includes(
                              (issue.status || '').toLowerCase()
                            );
                            const displayStatus = normalizeStatus(issue.status);

                            const statusBg = isClosed ? 'var(--green-50)' : (displayStatus === 'Pending' ? 'var(--amber-50)' : 'var(--elevated-card)');
                            const statusColor = isClosed ? 'var(--green-900)' : (displayStatus === 'Pending' ? 'var(--amber-900)' : 'var(--text-secondary)');

                            return (
                              <tr key={issue.id}>
                                <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>{idx + 1}</td>
                                <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{issue.department || 'General'}</td>
                                <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{activeProject.name}</td>
                                <td>
                                  <div style={{
                                    background: critStyles.bg, color: critStyles.color, border: `1px solid ${critStyles.border}`,
                                    fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px',
                                    textAlign: 'center', textTransform: 'uppercase'
                                  }}>
                                    {priority}
                                  </div>
                                </td>
                                <td style={{ lineHeight: 1.5, color: 'var(--text-primary)' }}>
                                  <div style={{ fontWeight: 600, marginBottom: '2px' }}>{issue.title}</div>
                                  {issue.description && issue.description !== issue.title && (
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{issue.description}</div>
                                  )}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                      width: '24px', height: '24px', borderRadius: '50%', background: 'var(--elevated-card)',
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: 'var(--text-secondary)', flexShrink: 0
                                    }}>
                                      {issue.owner?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>{issue.owner}</span>
                                  </div>
                                </td>
                                <td style={{ textAlign: 'center', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                                  {issue.due_date ? new Date(issue.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                                </td>
                                <td>
                                  <div style={{
                                    background: statusBg, color: statusColor,
                                    fontSize: '10px', fontWeight: 800, padding: '4px 8px', borderRadius: '4px',
                                    textAlign: 'center', textTransform: 'uppercase'
                                  }}>
                                    {displayStatus}
                                  </div>
                                </td>
                                <td style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                  {(() => {
                                    if (!issue.comments || issue.comments.length === 0) return '—';
                                    const sorted = [...issue.comments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                                    return sorted[0].comment_text;
                                  })()}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  {filteredMomIssues.length > displayIssues.length && (
                    <div style={{ padding: '12px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'center' }}>
                      <button
                        onClick={() => {
                          setTempPinnedIds(pinnedIssueIds.length > 0 ? [...pinnedIssueIds] : displayIssues.map(i => i.id));
                          setIsIssueModalOpen(true);
                        }}
                        style={{
                          background: 'none', border: '1px solid var(--border-subtle)', borderRadius: '6px',
                          padding: '6px 16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)',
                          cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = 'var(--elevated-card)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                      >
                        + {filteredMomIssues.length - displayIssues.length} more issues
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── SECTION 2: Sync History ── */}
            <div style={{ padding: '20px 20px 12px', borderTop: '1px solid var(--border-subtle)', marginTop: '24px' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>Sync History</span>
            </div>
            {syncHistory.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <div style={{ marginBottom: '16px', color: 'var(--text-muted)', opacity: 0.3 }}>
                  <RefreshCw size={32} strokeWidth={1.5} />
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>No sync history yet.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 400, padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>#</th>
                    <th style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 400, padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>Meeting Name</th>
                    <th style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 400, padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>Date</th>
                    <th style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 400, padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>Synced At</th>
                    <th style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 400, padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>Issues</th>
                    <th style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', fontWeight: 400, padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {syncHistory.map((h, idx) => {
                    const parsedDate = h.date ? new Date(h.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                    let parsedSyncedAt = '—';
                    if (h.synced_at) {
                      const sd = new Date(h.synced_at);
                      const sDateStr = sd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                      const sTimeStr = sd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();
                      parsedSyncedAt = `${sDateStr} · ${sTimeStr}`;
                    }
                    return (
                      <tr key={h.history_id || idx} style={{ borderBottom: '1px solid var(--border-subtle)', background: idx === 0 ? 'var(--blue-50)' : 'transparent' }}>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 500 }}>{idx + 1}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <span style={{ fontSize: '13px', fontWeight: idx === 0 ? 600 : 400, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {h.meeting_name || 'Untitled Meeting'}
                            </span>
                            {idx === 0 && (
                              <span style={{ fontSize: '10px', fontWeight: 700, background: 'var(--green-50)', color: 'var(--green-900)', border: '1px solid var(--green-200)', borderRadius: '99px', padding: '1px 6px', whiteSpace: 'nowrap' }}>
                                latest
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{parsedDate}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-tertiary)', fontSize: '12px' }}>{parsedSyncedAt}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 500 }}>{h.row_count} issues</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            onClick={() => h.session_id && navigate(`/dashboard/mom/view/${h.session_id}`)}
                            style={{ fontSize: '12px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

          </div>
        )}




      </div>

      {/* ── PINNED ISSUES MODAL ── */}
      {isIssueModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '24px',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: '12px', width: '100%', maxWidth: '600px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            display: 'flex', flexDirection: 'column', maxHeight: '85vh',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Select Critical Issues</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Pin exactly 5 issues to your project dashboard. ({tempPinnedIds.length}/5 selected)
                </p>
              </div>
              <button 
                onClick={() => setIsIssueModalOpen(false)}
                style={{ background: 'var(--elevated-card)', border: '1px solid var(--border-subtle)', borderRadius: '6px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-muted)'; }}
                onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div style={{ padding: '12px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredMomIssues.map(issue => {
                const isSelected = tempPinnedIds.includes(issue.id);
                const isMaxReached = tempPinnedIds.length >= 5 && !isSelected;
                return (
                  <div 
                    key={issue.id}
                    onClick={() => {
                      if (isSelected) {
                        setTempPinnedIds(prev => prev.filter(id => id !== issue.id));
                      } else if (!isMaxReached) {
                        setTempPinnedIds(prev => [...prev, issue.id]);
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '12px',
                      padding: '12px 16px', borderRadius: '8px',
                      background: isSelected ? 'var(--blue-50)' : 'var(--elevated-card)',
                      border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border-subtle)'}`,
                      cursor: isMaxReached ? 'not-allowed' : 'pointer',
                      opacity: isMaxReached ? 0.6 : 1,
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ 
                      width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0, marginTop: '2px',
                      border: `2px solid ${isSelected ? 'var(--accent)' : 'var(--text-muted)'}`,
                      background: isSelected ? 'var(--accent)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: isMaxReached ? 0.5 : 1
                    }}>
                      {isSelected && <CheckCircle2 size={12} color="#fff" strokeWidth={3} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {issue.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={10} color={issue.priority === 'High' || issue.priority === 'Critical' ? 'var(--red)' : 'var(--amber)'} />
                          {issue.priority || 'Medium'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Users size={10} />
                          {issue.owner || 'Unassigned'}
                        </span>
                        <span>{issue.status || 'Pending'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', background: 'var(--surface)' }}>
              <button 
                onClick={() => setIsIssueModalOpen(false)}
                style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: '6px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setPinnedIssueIds(tempPinnedIds);
                  if (activeProject?.dbProjectId) {
                    localStorage.setItem(`caldim_pinned_issues_${activeProject.dbProjectId}`, JSON.stringify(tempPinnedIds));
                  }
                  setIsIssueModalOpen(false);
                }}
                disabled={tempPinnedIds.length === 0}
                style={{ 
                  padding: '8px 20px', fontSize: '13px', fontWeight: 600, color: '#fff', 
                  background: tempPinnedIds.length > 0 ? 'var(--accent)' : 'var(--border-subtle)', 
                  border: 'none', borderRadius: '6px', 
                  cursor: tempPinnedIds.length > 0 ? 'pointer' : 'not-allowed',
                  boxShadow: tempPinnedIds.length > 0 ? '0 4px 12px rgba(79, 70, 229, 0.2)' : 'none'
                }}
              >
                Save View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default VPProjectDashboard;
