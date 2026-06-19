import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BarChart3, Calendar, AlertTriangle, Wallet,
  Settings, Mail, CheckCircle2, RefreshCw, FileText, X, ExternalLink,
  Table as TableIcon, Filter, Building2, ListTodo, Activity, Sparkles,
  TrendingUp, TrendingDown, AlertCircle, Zap, ClipboardList, Users,
  Shield, MessageSquare, ShieldAlert
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import ReactECharts from 'echarts-for-react';
import Skeleton from '../components/ui/skeleton';
import API from '../utils/api';
import { listIssues } from '../api/issues';
import './VPProjectDashboard.css';
import ResourceManagementCenter from '../components/dashboard/ResourceManagementCenter';
import QualityHealthCenter from '../components/dashboard/QualityHealthCenter';
import RiskManagementDashboard from '../components/dashboard/RiskManagementDashboard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';


/* ─────────────────────────────── helpers ──────────────────────────── */

const humanizeLabel = (key = '') =>
  key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();

const fmtDate = (d, opts = { day: '2-digit', month: 'short', year: 'numeric' }) =>
  d ? new Date(d).toLocaleDateString('en-GB', opts) : '—';

const fmtMoney = (n) => {
  if (n === null || n === undefined || n === '') return '—';
  const num = parseFloat(String(n).replace(/[^0-9.-]/g, ''));
  if (isNaN(num)) return '—';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
};

/* ─────────────────────────────── StatusBadge ──────────────────────── */

const STATUS_COLORS = {
  Completed: { bg: 'var(--green-50)', text: 'var(--green-900)', border: '#86efac', dot: '#10b981' },
  'In Progress': { bg: 'var(--blue-50)', text: 'var(--blue-900)', border: '#93c5fd', dot: '#3b82f6' },
  Delayed: { bg: 'var(--red-50)', text: 'var(--red-900)', border: '#fca5a5', dot: '#ef4444' },
  Upcoming: { bg: '#ede9fe', text: '#4c1d95', border: '#c4b5fd', dot: '#8b5cf6' },
  'On Hold': { bg: '#fef3c7', text: '#92400e', border: '#fcd34d', dot: '#f59e0b' },
  'Not Started': { bg: 'var(--elevated-card)', text: 'var(--text-secondary)', border: 'var(--border-subtle)', dot: '#94a3b8' },
  Cancelled: { bg: 'var(--elevated-card)', text: 'var(--text-muted)', border: 'var(--border-subtle)', dot: '#cbd5e1' },
  Pending: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d', dot: '#f59e0b' },
  Resolved: { bg: 'var(--green-50)', text: 'var(--green-900)', border: '#86efac', dot: '#10b981' },
  Open: { bg: 'var(--red-50)', text: 'var(--red-900)', border: '#fca5a5', dot: '#ef4444' },
};

const StatusBadge = ({ status, size = 'sm' }) => {
  const s = STATUS_COLORS[status] || STATUS_COLORS['Not Started'];
  const sz = size === 'sm' ? { fontSize: '10px', padding: '2px 8px' } : { fontSize: '11px', padding: '3px 10px' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      backgroundColor: s.bg, color: s.text, border: `1px solid ${s.border}`,
      borderRadius: '999px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
      ...sz
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: s.dot, flexShrink: 0 }} />
      {status || 'Not Started'}
    </span>
  );
};

/* ─────────────────────────────── PriorityBadge ────────────────────── */

const PRIORITY_COLORS = {
  Critical: { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
  High: { bg: '#fef2f2', text: '#991b1b', border: '#fca5a5' },
  Medium: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  Low: { bg: 'var(--green-50)', text: 'var(--green-900)', border: '#86efac' },
};

const PriorityBadge = ({ priority }) => {
  const c = PRIORITY_COLORS[priority] || PRIORITY_COLORS.Medium;
  return (
    <span className="vppd-priority-badge" style={{
      backgroundColor: c.bg, color: c.text, borderColor: c.border
    }}>
      {priority}
    </span>
  );
};

/* ─────────────────────────────── Mini Progress ─────────────────────── */

const MiniProgress = ({ pct, color = '#3b82f6' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
    <div className="vppd-progress-bar" style={{ flex: 1 }}>
      <div className="vppd-progress-fill" style={{ width: `${pct || 0}%`, backgroundColor: color }} />
    </div>
    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', width: 32, textAlign: 'right' }}>{Math.round(pct || 0)}%</span>
  </div>
);

/* ─────────────────────────────── Main Component ────────────────────── */

const TABS = [
  { id: 'metrics', label: 'Project Overview', Icon: BarChart3 },
  { id: 'milestones', label: 'Milestones & Timeline', Icon: Calendar },
  { id: 'issues', label: 'Critical Issues', Icon: AlertTriangle },
  { id: 'budget', label: 'Budget Summary', Icon: Wallet },
  { id: 'risk-management', label: 'Risk Management', Icon: ShieldAlert },
];

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
  onRetry = () => { },
  ganttDeptFilter = 'All',
  setGanttDeptFilter,
  ganttTypeFilter = 'All',
  setGanttTypeFilter,
  ganttStatusFilter = 'All',
  setGanttStatusFilter,
  /* Budget props (passed from ProjectDashboard) */
  budgetTableData = [],
  budgetSummaryData = null,
  isBudgetLoading = false,
  renderBudgetTableContent = null,
  budgetCurrencySymbol = '$',
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('metrics');

  /* ── Milestone view (table | chart) ── */
  const [milestoneView, setMilestoneView] = useState('table');

  /* ── Gantt settings ── */
  const [zoomLevel, setZoomLevel] = useState('Week');
  const [ganttShowTaskName, setGanttShowTaskName] = useState(true);
  const [ganttShowPercent, setGanttShowPercent] = useState(true);
  const [ganttShowTodayLine, setGanttShowTodayLine] = useState(true);
  const [isGanttSettingsModalOpen, setIsGanttSettingsModalOpen] = useState(false);

  /* ── Issues state ── */
  const [momIssues, setMomIssues] = useState([]);
  const [syncHistory, setSyncHistory] = useState([]);
  const [loadingMom, setLoadingMom] = useState(false);
  const fetchingRef = useRef(false);
  const projectIdRef = useRef(null);

  /* ── Pinned issues ── */
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [pinnedIssueIds, setPinnedIssueIds] = useState(() => {
    try {
      const s = localStorage.getItem(`caldim_pinned_issues_${activeProject?.dbProjectId}`);
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });
  const [tempPinnedIds, setTempPinnedIds] = useState([]);

  /* ── Team ── */
  const [projectTeam, setProjectTeam] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  /* ── Gantt hover tooltip ── */
  const [hoveredBar, setHoveredBar] = useState(null);
  const ganttContainerRef = useRef(null);

  /* ─────────── Sync pinned issues when project changes ─────────── */
  useEffect(() => {
    if (activeProject?.dbProjectId) {
      try {
        const s = localStorage.getItem(`caldim_pinned_issues_${activeProject.dbProjectId}`);
        setPinnedIssueIds(s ? JSON.parse(s) : []);
      } catch { setPinnedIssueIds([]); }
    }
  }, [activeProject?.dbProjectId]);

  /* ─────────── Filtered MOM issues ─────────── */
  const filteredMomIssues = useMemo(() => {
    if (syncHistory.length === 0) return momIssues;
    const latest = syncHistory[0];
    return momIssues.filter(i =>
      (i.sync_id && i.sync_id === latest.sync_id) ||
      (i.meeting_id && (i.meeting_id === latest.session_id || i.meeting_id === latest.meeting_id))
    );
  }, [momIssues, syncHistory]);

  const displayIssues = useMemo(() => {
    if (pinnedIssueIds.length > 0) {
      const pinned = filteredMomIssues.filter(i => pinnedIssueIds.includes(i.id));
      if (pinned.length > 0) return pinned;
    }
    return filteredMomIssues.slice(0, 5);
  }, [filteredMomIssues, pinnedIssueIds]);

  /* ─────────── Fetch issues ─────────── */
  const fetchMomIssues = useCallback(() => {
    if (!activeProject?.dbProjectId) return;
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoadingMom(true);

    Promise.all([
      listIssues({ project_id: activeProject.dbProjectId }),
      API.get(`/mom/history/project/${activeProject.dbProjectId}`).catch(() => ({ data: [] }))
    ])
      .then(([issues, historyRes]) => {
        setMomIssues(
          Array.isArray(issues)
            ? issues.filter(i => (i.source || '').toUpperCase() === 'MOM')
              .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            : []
        );
        if (Array.isArray(historyRes?.data)) setSyncHistory(historyRes.data);
      })
      .catch(() => setMomIssues([]))
      .finally(() => { setLoadingMom(false); fetchingRef.current = false; });
  }, [activeProject?.dbProjectId]);

  /* ─────────── Fetch team ─────────── */
  const fetchTeamAndEmployees = useCallback(async () => {
    if (!activeProject?.dbProjectId) return;
    try {
      setLoadingTeam(true);
      const [teamRes, empRes] = await Promise.all([
        API.get(`/projects/${activeProject.dbProjectId}/team`),
        API.get('/employees')
      ]);
      setProjectTeam(teamRes.data || []);
      setEmployees(empRes.data || []);
    } catch (e) {
      console.error('[VPPD] team fetch failed:', e);
    } finally { setLoadingTeam(false); }
  }, [activeProject?.dbProjectId]);

  /* ─────────── On project change ─────────── */
  useEffect(() => {
    const newId = activeProject?.dbProjectId;
    if (!newId || newId === projectIdRef.current) return;
    projectIdRef.current = newId;
    fetchMomIssues();
    fetchTeamAndEmployees();

    const rto = { current: null };
    const onUpdate = () => {
      if (rto.current) clearTimeout(rto.current);
      rto.current = setTimeout(() => { fetchingRef.current = false; fetchMomIssues(); }, 800);
    };
    window.addEventListener('MOM_SAVED', onUpdate);
    window.addEventListener('ISSUE_SYNCED', onUpdate);
    return () => {
      window.removeEventListener('MOM_SAVED', onUpdate);
      window.removeEventListener('ISSUE_SYNCED', onUpdate);
      if (rto.current) clearTimeout(rto.current);
    };
  }, [activeProject?.dbProjectId, fetchMomIssues]);

  /* ─────────── Gantt calculations ─────────── */
  const departmentOptions = useMemo(() => {
    const depts = new Set(['Engineering', 'Design', 'Procurement', 'Manufacturing', 'Quality', 'Installation', 'Commissioning']);
    (milestones || []).forEach(m => { if (m.department?.trim()) depts.add(m.department.trim()); });
    return Array.from(depts);
  }, [milestones]);

  const sortedMilestones = useMemo(() =>
    [...(milestones || [])].sort((a, b) => (a.row_order || 0) - (b.row_order || 0)),
    [milestones]);

  const ganttFilteredTasks = useMemo(() =>
    sortedMilestones.filter(t => {
      if (ganttDeptFilter !== 'All' && t.department !== ganttDeptFilter) return false;
      if (ganttTypeFilter !== 'All' && t.item_type !== ganttTypeFilter) return false;
      if (ganttStatusFilter !== 'All' && t.status !== ganttStatusFilter) return false;
      return true;
    }),
    [sortedMilestones, ganttDeptFilter, ganttTypeFilter, ganttStatusFilter]);

  const { timelineStart, timelineEnd, daysBetween } = useMemo(() => {
    if (!milestones?.length) {
      const s = new Date(); s.setDate(s.getDate() - 7);
      const e = new Date(); e.setDate(e.getDate() + 90);
      return { timelineStart: s, timelineEnd: e, daysBetween: 97 };
    }
    let minD = null, maxD = null;
    milestones.forEach(t => {
      if (t.start_date) { const d = new Date(t.start_date); if (!minD || d < minD) minD = d; }
      if (t.end_date) { const d = new Date(t.end_date); if (!maxD || d > maxD) maxD = d; }
    });
    if (!minD) minD = new Date();
    if (!maxD) { maxD = new Date(); maxD.setDate(maxD.getDate() + 90); }
    const sp = new Date(minD); sp.setDate(sp.getDate() - 14);
    const ep = new Date(maxD); ep.setDate(ep.getDate() + 45);
    return { timelineStart: sp, timelineEnd: ep, daysBetween: Math.ceil((ep - sp) / 86400000) || 1 };
  }, [milestones]);

  const pxPerDay = useMemo(() => zoomLevel === 'Day' ? 24 : zoomLevel === 'Week' ? 8 : 2.5, [zoomLevel]);
  const timelineWidth = useMemo(() => daysBetween * pxPerDay, [daysBetween, pxPerDay]);

  const todayLeft = useMemo(() => {
    const today = new Date();
    if (today < timelineStart || today > timelineEnd) return null;
    return ((today - timelineStart) / 86400000) * pxPerDay;
  }, [timelineStart, timelineEnd, pxPerDay]);

  const getPhaseColors = useCallback((taskIndex) => {
    let phaseName = 'Contracts';
    const list = milestones || [];
    for (let i = taskIndex; i >= 0; i--) {
      const t = list[i];
      if (t?.item_type === 'Phase') { phaseName = t.activity_name; break; }
    }
    const name = phaseName.toLowerCase();
    if (name.includes('contracts') || name.includes('proposal')) return { fill: '#0ea5e9' };
    if (name.includes('design') || name.includes('engineering')) return { fill: '#3b82f6' };
    if (name.includes('procurement')) return { fill: '#8b5cf6' };
    if (name.includes('construction') || name.includes('manufacturing')) return { fill: '#f97316' };
    if (name.includes('closing') || name.includes('handover')) return { fill: '#10b981' };
    return { fill: '#14b8a6' };
  }, [milestones]);

  const ganttBars = useMemo(() => ganttFilteredTasks.map((t, idx) => {
    if (!t.start_date || !t.end_date) return null;
    const ps = new Date(t.start_date), pe = new Date(t.end_date);
    const origIdx = (milestones || []).findIndex(m => m.id === t.id);
    return {
      id: t.id,
      plannedLeft: ((ps - timelineStart) / 86400000) * pxPerDay,
      plannedWidth: Math.max(4, ((pe - ps) / 86400000) * pxPerDay),
      isMilestone: t.item_type === 'Milestone' || t.item_type === 'Approval Gate',
      isParent: t.item_type === 'Phase' || (milestones || []).some(c => c.parent_id === t.id),
      completePercent: t.complete_percent || 0,
      activityName: t.activity_name,
      wbsCode: t.wbs_code,
      itemType: t.item_type,
      department: t.department,
      colors: getPhaseColors(origIdx >= 0 ? origIdx : idx),
      status: t.status,
      durationDays: Math.ceil((pe - ps) / 86400000) || 1,
      plannedStartStr: fmtDate(ps),
      plannedEndStr: fmtDate(pe),
    };
  }), [ganttFilteredTasks, timelineStart, pxPerDay, milestones, getPhaseColors]);

  const ROW_HEIGHT = 50;

  /* ─────────── Timeline headers ─────────── */
  const timelineHeaders = useMemo(() => {
    const top = [], bottom = [];
    if (zoomLevel === 'Week') {
      const weekStarts = [];
      for (let i = 0; i < daysBetween; i++) {
        const d = new Date(timelineStart); d.setDate(d.getDate() + i);
        if (d.getDay() === 1 || i === 0) weekStarts.push(i);
      }
      weekStarts.push(daysBetween);
      let cgStart = weekStarts[0], cgLabel = '';
      for (let j = 0; j < weekStarts.length - 1; j++) {
        const ws = weekStarts[j], we = weekStarts[j + 1];
        const wsd = new Date(timelineStart); wsd.setDate(wsd.getDate() + ws);
        const lbl = wsd.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        if (j === 0) { cgLabel = lbl; cgStart = ws; }
        else if (lbl !== cgLabel) {
          top.push({ key: `t-${cgStart}`, left: cgStart * pxPerDay, width: (ws - cgStart) * pxPerDay, label: cgLabel });
          cgLabel = lbl; cgStart = ws;
        }
        bottom.push({
          key: `b-${ws}`, left: ws * pxPerDay, width: (we - ws) * pxPerDay,
          label: `${wsd.getDate()} ${wsd.toLocaleDateString('en-US', { month: 'short' })}`,
        });
      }
      if (weekStarts.length > 1) {
        top.push({ key: `t-${cgStart}`, left: cgStart * pxPerDay, width: (weekStarts[weekStarts.length - 1] - cgStart) * pxPerDay, label: cgLabel });
      }
    } else if (zoomLevel === 'Month') {
      let cyStart = 0, cyLabel = '', daysInY = 0, lmStart = 0, lmLabel = '';
      for (let i = 0; i < daysBetween; i++) {
        const d = new Date(timelineStart); d.setDate(d.getDate() + i);
        const yl = String(d.getFullYear()), ml = d.toLocaleDateString('en-US', { month: 'short' });
        const isMStart = d.getDate() === 1 || i === 0;
        if (isMStart && i > 0) {
          bottom.push({ key: `b-${lmStart}`, left: lmStart * pxPerDay, width: (i - lmStart) * pxPerDay, label: lmLabel });
          lmStart = i; lmLabel = ml;
        } else if (i === 0) { lmLabel = ml; }
        if (i === 0) { cyLabel = yl; cyStart = 0; daysInY = 1; }
        else if (yl === cyLabel) daysInY++;
        else {
          top.push({ key: `t-${cyStart}`, left: cyStart * pxPerDay, width: daysInY * pxPerDay, label: cyLabel });
          cyLabel = yl; cyStart = i; daysInY = 1;
        }
      }
      if (lmStart < daysBetween) bottom.push({ key: `b-${lmStart}`, left: lmStart * pxPerDay, width: (daysBetween - lmStart) * pxPerDay, label: lmLabel });
      if (daysInY > 0) top.push({ key: `t-${cyStart}`, left: cyStart * pxPerDay, width: daysInY * pxPerDay, label: cyLabel });
    } else {
      // Day
      let cmStart = 0, cmLabel = '';
      for (let i = 0; i < daysBetween; i++) {
        const d = new Date(timelineStart); d.setDate(d.getDate() + i);
        const ml = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        bottom.push({ key: `b-${i}`, left: i * pxPerDay, width: pxPerDay, label: String(d.getDate()) });
        if (i === 0) { cmLabel = ml; cmStart = 0; }
        else if (ml !== cmLabel) {
          top.push({ key: `t-${cmStart}`, left: cmStart * pxPerDay, width: (i - cmStart) * pxPerDay, label: cmLabel });
          cmLabel = ml; cmStart = i;
        }
      }
      top.push({ key: `t-${cmStart}`, left: cmStart * pxPerDay, width: (daysBetween - cmStart) * pxPerDay, label: cmLabel });
    }
    return { topHeaders: top, bottomHeaders: bottom };
  }, [zoomLevel, timelineStart, daysBetween, pxPerDay]);

  /* ─────────── Milestone KPI summary ─────────── */
  const milestoneStats = useMemo(() => {
    const list = milestones || [];
    return {
      total: list.length,
      completed: list.filter(m => m.status === 'Completed' || m.status === 'Complete').length,
      delayed: list.filter(m => m.status === 'Delayed').length,
      inProgress: list.filter(m => m.status === 'In Progress').length,
      upcoming: list.filter(m => m.status === 'Upcoming' || m.status === 'Not Started').length,
    };
  }, [milestones]);

  /* ─────────── Issues analytics ─────────── */
  const issuesByPriority = useMemo(() => {
    const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    filteredMomIssues.forEach(i => { const p = i.priority || 'Medium'; counts[p] = (counts[p] || 0) + 1; });
    return counts;
  }, [filteredMomIssues]);

  const issuesByStatus = useMemo(() => {
    const counts = {};
    filteredMomIssues.forEach(i => {
      const s = i.status || 'Open';
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [filteredMomIssues]);

  /* ─────────── Budget data ─────────── */
  const budgetApproved = budgetSummaryData?.budgetApproved || 0;
  const budgetUtilized = budgetSummaryData?.budgetUtilized || 0;
  const budgetBalance = budgetSummaryData?.budgetBalance || 0;
  const budgetOutlook = budgetSummaryData?.budgetOutlook || 0;
  const utilizationPct = budgetApproved > 0 ? Math.min(100, Math.round((budgetUtilized / budgetApproved) * 100)) : 0;

  /* ─────────── ECharts options ─────────── */
  const issuesPriorityOption = useMemo(() => ({
    backgroundColor: 'transparent',
    animationDuration: 1000,
    animationDurationUpdate: 800,
    animationEasingUpdate: 'cubicOut',
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
      backgroundColor: 'var(--surface)',
      borderColor: 'var(--border-strong)',
      textStyle: { color: 'var(--text-primary)', fontSize: 12 }
    },
    legend: { show: false },
    series: [{
      type: 'pie', radius: ['48%', '72%'], center: ['50%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 4,
        borderColor: 'var(--surface)',
        borderWidth: 2
      },
      label: { show: true, position: 'inside', formatter: p => p.percent > 10 ? `${p.percent.toFixed(0)}%` : '', fontSize: 10, fontWeight: 700, color: '#fff' },
      labelLine: { show: false },
      emphasis: {
        focus: 'self',
        scale: true,
        scaleSize: 6
      },
      data: [
        { value: issuesByPriority.Critical, name: 'Critical', itemStyle: { color: '#ef4444' } },
        { value: issuesByPriority.High, name: 'High', itemStyle: { color: '#f97316' } },
        { value: issuesByPriority.Medium, name: 'Medium', itemStyle: { color: '#f59e0b' } },
        { value: issuesByPriority.Low, name: 'Low', itemStyle: { color: '#10b981' } },
      ].filter(d => d.value > 0)
    }]
  }), [issuesByPriority]);

  const issuesStatusOption = useMemo(() => ({
    backgroundColor: 'transparent',
    animationDuration: 1000,
    animationDurationUpdate: 800,
    animationEasingUpdate: 'cubicOut',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'var(--surface)',
      borderColor: 'var(--border-strong)',
      textStyle: { color: 'var(--text-primary)', fontSize: 12 }
    },
    grid: { left: 8, right: 12, top: 8, bottom: 8, containLabel: true },
    xAxis: { type: 'value', axisLabel: { color: 'var(--text-secondary)', fontSize: 10 }, splitLine: { lineStyle: { color: 'var(--border-subtle)', type: 'dashed' } }, axisLine: { show: false } },
    yAxis: { type: 'category', data: Object.keys(issuesByStatus), axisLabel: { color: 'var(--text-secondary)', fontSize: 10 }, axisLine: { show: false }, axisTick: { show: false } },
    series: [{
      type: 'bar', barMaxWidth: 16,
      itemStyle: { color: (p) => ['#ef4444', '#f97316', '#f59e0b', '#3b82f6', '#10b981'][p.dataIndex % 5], borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', fontSize: 10, color: 'var(--text-secondary)' },
      data: Object.values(issuesByStatus)
    }]
  }), [issuesByStatus]);

  const budgetUtilizationOption = useMemo(() => ({
    backgroundColor: 'transparent',
    animationDuration: 1000,
    animationDurationUpdate: 800,
    animationEasingUpdate: 'cubicOut',
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}',
      backgroundColor: 'var(--surface)',
      borderColor: 'var(--border-strong)',
      textStyle: { color: 'var(--text-primary)', fontSize: 12 }
    },
    legend: { show: false },
    series: [{
      type: 'pie', radius: ['52%', '76%'], center: ['50%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 4,
        borderColor: 'var(--surface)',
        borderWidth: 2
      },
      label: { show: false },
      emphasis: {
        focus: 'self',
        scale: true,
        scaleSize: 6
      },
      data: [
        { value: budgetUtilized, name: 'Utilized', itemStyle: { color: utilizationPct > 90 ? '#ef4444' : utilizationPct > 70 ? '#f59e0b' : '#3b82f6' } },
        { value: Math.max(0, budgetApproved - budgetUtilized), name: 'Balance', itemStyle: { color: '#e2e8f0' } },
      ].filter(d => d.value > 0)
    }]
  }), [budgetUtilized, budgetApproved, utilizationPct, themeSettings?.displayMode]);

  const budgetBarOption = useMemo(() => ({
    backgroundColor: 'transparent',
    animationDuration: 1000,
    animationDurationUpdate: 800,
    animationEasingUpdate: 'cubicOut',
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: 'var(--surface)', borderColor: 'var(--border-strong)',
      textStyle: { color: 'var(--text-primary)', fontSize: 12 }
    },
    grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
    xAxis: { type: 'category', data: ['Approved', 'Utilized', 'Balance'], axisLabel: { color: 'var(--text-secondary)', fontSize: 10 }, axisLine: { show: false }, axisTick: { show: false } },
    yAxis: { type: 'value', axisLabel: { color: 'var(--text-secondary)', fontSize: 9, formatter: v => fmtMoney(v) }, splitLine: { lineStyle: { color: 'var(--border-subtle)', type: 'dashed' } }, axisLine: { show: false } },
    series: [{
      type: 'bar', barMaxWidth: 40,
      emphasis: { focus: 'series' },
      itemStyle: { borderRadius: [4, 4, 0, 0] },
      data: [
        { value: budgetApproved, itemStyle: { color: '#3b82f6' } },
        { value: budgetUtilized, itemStyle: { color: utilizationPct > 90 ? '#ef4444' : '#10b981' } },
        { value: budgetBalance, itemStyle: { color: '#f59e0b' } },
      ],
      label: { show: true, position: 'top', fontSize: 10, formatter: p => fmtMoney(p.value), color: 'var(--text-secondary)' }
    }]
  }), [budgetApproved, budgetUtilized, budgetBalance, utilizationPct]);

  /* ─────────── Health chip ─────────── */
  const health = dashboardData?.project_health || 'Unknown';
  const healthStyle = health === 'Red'
    ? { backgroundColor: '#fef2f2', color: '#991b1b', borderColor: '#fca5a5' }
    : health === 'Yellow'
      ? { backgroundColor: '#fef3c7', color: '#92400e', borderColor: '#fcd34d' }
      : health === 'Green'
        ? { backgroundColor: 'var(--green-50)', color: 'var(--green-900)', borderColor: '#86efac' }
        : { backgroundColor: 'var(--elevated-card)', color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' };

  const healthLabel = health === 'Red' ? 'Critical' : health === 'Yellow' ? 'At Risk' : health === 'Green' ? 'On Track' : 'Unknown';
  const projectInitials = (activeProject?.name || 'P').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  /* ─────────── Normalise issue status ─────────── */
  const normalizeIssueStatus = (s) => {
    if (!s) return 'Pending';
    const l = s.toLowerCase();
    if (['open', 'pending', 'in progress'].includes(l)) return 'Open';
    if (['closed', 'done', 'resolved', 'complete'].includes(l)) return 'Resolved';
    return s;
  };

  /* ─────────── Optimized milestones for table ─────────── */
  const tableMilestones = useMemo(() =>
    (milestones || []).filter(t => t.item_type === 'Phase' || t.item_type === 'Milestone'),
    [milestones]);

  /* ══════════════════════════════════════════════════════════════════
     TAB: OVERVIEW
  ══════════════════════════════════════════════════════════════════ */
  const renderOverviewTab = () => (
    <div className="vppd-overview-grid">

      {/* ── Project Metrics Summary (KPIs only) ── */}
      <div className="vppd-section">
        <div className="vppd-section-header">
          <h3 className="vppd-section-title">
            <BarChart3 size={14} style={{ color: '#4f46e5' }} />
            Project Overview
          </h3>
        </div>
        <div className="vppd-section-body">
          <div className="vppd-kpi-strip">
            <div className="vppd-kpi-card">
              <span className="vppd-kpi-label">Total Milestones</span>
              <span className="vppd-kpi-value" style={{ color: 'var(--text-primary)' }}>{milestoneStats.total}</span>
            </div>
            <div className="vppd-kpi-card">
              <span className="vppd-kpi-label">Completed</span>
              <span className="vppd-kpi-value" style={{ color: '#10b981' }}>{milestoneStats.completed}</span>
              <span className="vppd-kpi-sub">{milestoneStats.total ? Math.round((milestoneStats.completed / milestoneStats.total) * 100) : 0}% done</span>
            </div>
            <div className="vppd-kpi-card">
              <span className="vppd-kpi-label">Delayed</span>
              <span className="vppd-kpi-value" style={{ color: '#ef4444' }}>{milestoneStats.delayed}</span>
              <span className="vppd-kpi-sub">requires attention</span>
            </div>
            <div className="vppd-kpi-card">
              <span className="vppd-kpi-label">In Progress</span>
              <span className="vppd-kpi-value" style={{ color: '#3b82f6' }}>{milestoneStats.inProgress}</span>
            </div>
            <div className="vppd-kpi-card">
              <span className="vppd-kpi-label">Upcoming</span>
              <span className="vppd-kpi-value" style={{ color: '#64748b' }}>{milestoneStats.upcoming}</span>
            </div>
            <div className="vppd-kpi-card">
              <span className="vppd-kpi-label">Open Issues</span>
              <span className="vppd-kpi-value" style={{ color: filteredMomIssues.length > 0 ? '#f97316' : '#10b981' }}>{filteredMomIssues.length}</span>
              <span className="vppd-kpi-sub">from meetings</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Critical Issues (compact) ── */}
      <div className="vppd-section">
        <div className="vppd-section-header">
          <h3 className="vppd-section-title">
            <AlertTriangle size={14} style={{ color: '#ef4444' }} />
            Critical Issues
            {filteredMomIssues.length > 0 && (
              <span style={{ marginLeft: 4, width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            )}
          </h3>
          <span className="vppd-tab-count">{filteredMomIssues.length}</span>
        </div>
        <div className="vppd-section-body" style={{ padding: 0 }}>
          {filteredMomIssues.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              <CheckCircle2 size={28} style={{ margin: '0 auto 8px', color: '#10b981' }} />
              <div style={{ fontWeight: 600 }}>No open issues</div>
            </div>
          ) : (
            <div className="vppd-refined-table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <Table className="vppd-refined-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Issue</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMomIssues.slice(0, 4).map(issue => {
                    const ns = normalizeIssueStatus(issue.status);
                    return (
                      <TableRow key={issue.id}>
                        <TableCell style={{ fontWeight: 600, maxWidth: 200 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.title}</div>
                        </TableCell>
                        <TableCell><PriorityBadge priority={issue.priority || 'Medium'} /></TableCell>
                        <TableCell style={{ color: 'var(--text-secondary)' }}>{issue.owner || '—'}</TableCell>
                        <TableCell style={{ color: 'var(--text-muted)', fontSize: 11 }}>{issue.due_date ? fmtDate(issue.due_date, { day: '2-digit', month: 'short' }) : '—'}</TableCell>
                        <TableCell><StatusBadge status={ns} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {filteredMomIssues.length > 4 && (
                <div style={{ padding: '8px 16px', textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)' }}>
                  <button onClick={() => setActiveTab('issues')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 700, cursor: 'pointer', fontSize: 11 }}>
                    + {filteredMomIssues.length - 4} more — View all issues →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Milestones (compact table) ── */}
      <div className="vppd-section">
        <div className="vppd-section-header">
          <h3 className="vppd-section-title">
            <Calendar size={14} style={{ color: '#0ea5e9' }} />
            Project Milestones &amp; Timeline
          </h3>
          <button onClick={() => setActiveTab('milestones')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            View full →
          </button>
        </div>
        <div className="vppd-section-body" style={{ padding: 0 }}>
          {isDashboardLoading ? (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : tableMilestones.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              <Calendar size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
              <div>No milestones configured yet</div>
            </div>
          ) : (
            <div className="vppd-refined-table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <Table className="vppd-refined-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>WBS</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableMilestones.slice(0, 6).map(task => {
                    const isPhase = task.item_type === 'Phase';
                    return (
                      <TableRow key={task.id} className={isPhase ? 'vppd-phase-row' : ''}>
                        <TableCell style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{task.wbs_code}</TableCell>
                        <TableCell style={{ paddingLeft: `${16 + (task.indent_level || 0) * 14}px`, fontWeight: isPhase ? 700 : 500 }}>
                          {task.item_type === 'Milestone' && <span style={{ display: 'inline-block', width: 6, height: 6, transform: 'rotate(45deg)', backgroundColor: 'var(--accent)', marginRight: 6 }} />}
                          {task.activity_name}
                        </TableCell>
                        <TableCell style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{fmtDate(task.start_date, { day: '2-digit', month: 'short' })}</TableCell>
                        <TableCell style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{fmtDate(task.end_date, { day: '2-digit', month: 'short' })}</TableCell>
                        <TableCell style={{ minWidth: 90 }}>
                          <MiniProgress pct={task.complete_percent} color={isPhase ? 'var(--accent)' : '#3b82f6'} />
                        </TableCell>
                        <TableCell><StatusBadge status={task.status || 'Not Started'} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* ── Budget Summary (cards) ── */}
      {visibleSections.budget && (
        <div className="vppd-section">
          <div className="vppd-section-header">
            <h3 className="vppd-section-title">
              <Wallet size={14} style={{ color: '#f59e0b' }} />
              Budget Summary
            </h3>
            <button onClick={() => setActiveTab('budget')} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              Full view →
            </button>
          </div>
          <div className="vppd-section-body">
            {isBudgetLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
              </div>
            ) : (
              <div className="vppd-budget-summary-strip">
                {[
                  { label: 'Approved Budget', value: budgetApproved, color: '#3b82f6', bg: 'var(--blue-50)', icon: '🏦' },
                  { label: 'Utilized', value: budgetUtilized, color: '#10b981', bg: 'var(--green-50)', icon: '📊' },
                  { label: 'Balance', value: budgetBalance, color: '#f59e0b', bg: '#fef3c7', icon: '💰' },
                  { label: 'Utilization', value: `${utilizationPct}%`, color: utilizationPct > 90 ? '#ef4444' : '#64748b', bg: 'var(--elevated-card)', icon: '📈', raw: true },
                ].map(c => (
                  <div key={c.label} className="vppd-budget-card" style={{ background: c.bg }}>
                    <span className="vppd-budget-card-label" style={{ color: c.color }}>{c.icon} {c.label}</span>
                    <span className="vppd-budget-card-value" style={{ color: c.color }}>
                      {c.raw ? c.value : `${budgetCurrencySymbol}${fmtMoney(c.value)}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  /* ══════════════════════════════════════════════════════════════════
     TAB: PROJECT METRICS
  ══════════════════════════════════════════════════════════════════ */
  const renderMetricsTab = () => (
    <div>
      {metricsContent ? (
        metricsContent
      ) : (
        <div className="vppd-empty">
          <BarChart3 size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <div style={{ fontWeight: 700, marginBottom: 4 }}>No overview configured</div>
          <div style={{ fontSize: 12 }}>Configure chart axes in the dashboard settings to view analytics here.</div>
        </div>
      )}
    </div>
  );

  /* ══════════════════════════════════════════════════════════════════
     TAB: MILESTONES & TIMELINE
  ══════════════════════════════════════════════════════════════════ */
  const renderMilestonesTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Milestone table */}
      <div className="vppd-section">
        <div className="vppd-section-header">
          <h3 className="vppd-section-title"><Calendar size={14} style={{ color: '#0ea5e9' }} /> Milestones</h3>
          <div className="vppd-ctrl-group">
            <button className={`vppd-ctrl-btn ${milestoneView === 'table' ? 'active' : ''}`} onClick={() => setMilestoneView('table')}>
              <TableIcon size={11} /> Table
            </button>
            <button className={`vppd-ctrl-btn ${milestoneView === 'chart' ? 'active' : ''}`} onClick={() => setMilestoneView('chart')}>
              <BarChart3 size={11} /> Gantt
            </button>
          </div>
        </div>
        <div className="vppd-section-body" style={{ padding: 0 }}>
          {isDashboardLoading ? (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : isDashboardError ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#ef4444' }}>
              <AlertTriangle size={32} style={{ margin: '0 auto 8px' }} />
              <div style={{ fontWeight: 600, marginBottom: 12 }}>Failed to load milestones</div>
              <button onClick={onRetry} style={{ padding: '6px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>Retry</button>
            </div>
          ) : tableMilestones.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Calendar size={40} style={{ margin: '0 auto 12px', opacity: 0.25 }} />
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>No milestones configured</div>
              <div style={{ fontSize: 13, maxWidth: 360, margin: '0 auto 16px' }}>Go to Project Master → Detailed View → Milestone Management to add milestones.</div>
              <button onClick={() => navigate(`/dashboard/masters/project-master/${activeProject?.dbProjectId || activeProject?.id}`)}
                style={{ padding: '8px 20px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>
                Go to Milestone Management
              </button>
            </div>
          ) : (
            <div className="vppd-refined-table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <Table className="vppd-refined-table">
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ width: 80 }}>WBS</TableHead>
                    <TableHead>Activity / Milestone</TableHead>
                    <TableHead style={{ width: 110 }}>Start Date</TableHead>
                    <TableHead style={{ width: 110 }}>End Date</TableHead>
                    <TableHead style={{ width: 110 }}>Department</TableHead>
                    <TableHead style={{ width: 100 }}>Progress</TableHead>
                    <TableHead style={{ width: 130, textAlign: 'center' }}>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableMilestones.map(task => {
                    const isPhase = task.item_type === 'Phase';
                    const isMilestone = task.item_type === 'Milestone';
                    const indent = (task.indent_level || 0) * 14;
                    return (
                      <TableRow key={task.id} className={isPhase ? 'vppd-phase-row' : ''}>
                        <TableCell style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{task.wbs_code}</TableCell>
                        <TableCell style={{ paddingLeft: `${16 + indent}px` }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isMilestone && <span style={{ width: 7, height: 7, transform: 'rotate(45deg)', backgroundColor: 'var(--accent)', display: 'inline-block', flexShrink: 0 }} />}
                            <span style={{ color: isMilestone ? 'var(--accent)' : 'var(--text-primary)', fontWeight: isPhase ? 700 : 500 }}>{task.activity_name}</span>
                          </div>
                        </TableCell>
                        <TableCell style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtDate(task.start_date)}</TableCell>
                        <TableCell style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtDate(task.end_date)}</TableCell>
                        <TableCell style={{ fontSize: 12, color: 'var(--text-muted)' }}>{task.department || '—'}</TableCell>
                        <TableCell><MiniProgress pct={task.complete_percent} color={isPhase ? 'var(--accent)' : '#3b82f6'} /></TableCell>
                        <TableCell style={{ textAlign: 'center' }}><StatusBadge status={task.status || 'Not Started'} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>

      {/* Gantt Chart */}
      {!isDashboardLoading && !isDashboardError && milestones.length > 0 && (
        <div className="vppd-section">
          <div className="vppd-section-header">
            <h3 className="vppd-section-title"><BarChart3 size={14} style={{ color: '#8b5cf6' }} /> Gantt Timeline</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Dept:</span>
                <select value={ganttDeptFilter} onChange={e => setGanttDeptFilter(e.target.value)}
                  style={{ padding: '3px 8px', background: 'var(--bg)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 5, fontSize: 11, fontWeight: 600, outline: 'none' }}>
                  <option value="All">All</option>
                  {departmentOptions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Type:</span>
                <select value={ganttTypeFilter} onChange={e => setGanttTypeFilter(e.target.value)}
                  style={{ padding: '3px 8px', background: 'var(--bg)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 5, fontSize: 11, fontWeight: 600, outline: 'none' }}>
                  <option value="All">All</option>
                  {['Phase', 'Task', 'Sub Task', 'Milestone', 'Approval Gate'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Status:</span>
                <select value={ganttStatusFilter} onChange={e => setGanttStatusFilter(e.target.value)}
                  style={{ padding: '3px 8px', background: 'var(--bg)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', borderRadius: 5, fontSize: 11, fontWeight: 600, outline: 'none' }}>
                  <option value="All">All</option>
                  {['Not Started', 'Upcoming', 'In Progress', 'Completed', 'Delayed', 'On Hold', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {/* Zoom */}
              <div className="vppd-ctrl-group">
                {[{ lvl: 'Day', l: 'D' }, { lvl: 'Week', l: 'W' }, { lvl: 'Month', l: 'M' }].map(z => (
                  <button key={z.lvl} className={`vppd-ctrl-btn ${zoomLevel === z.lvl ? 'active' : ''}`}
                    onClick={() => setZoomLevel(z.lvl)} style={{ padding: '4px 10px', fontSize: 10 }}>
                    {z.l}
                  </button>
                ))}
              </div>
              <button onClick={() => setIsGanttSettingsModalOpen(true)} className="vppd-ctrl-btn" style={{ padding: '4px 8px' }} title="Gantt settings">
                <Settings size={12} />
              </button>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                {ganttFilteredTasks.length}/{milestones.length}
              </span>
            </div>
          </div>

          {/* Gantt Canvas */}
          <div ref={ganttContainerRef} className="vppd-gantt-container" style={{ maxHeight: 520 }}>
            {ganttFilteredTasks.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, color: 'var(--text-muted)', fontSize: 13 }}>No tasks match filters.</div>
            ) : (
              <div style={{ width: timelineWidth, height: ganttFilteredTasks.length * ROW_HEIGHT + 52, position: 'relative', background: 'var(--surface)' }}>
                {/* Headers */}
                <div style={{ height: 52, background: 'var(--elevated-card)', borderBottom: '2px solid var(--border-subtle)', position: 'sticky', top: 0, zIndex: 20, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 26, borderBottom: '1px solid var(--border-subtle)', display: 'flex', fontSize: 11, fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', overflow: 'hidden' }}>
                    {timelineHeaders.topHeaders.map(th => (
                      <div key={th.key} style={{ position: 'absolute', left: th.left, width: th.width, top: 0, height: '100%', borderRight: '1px solid var(--border-subtle)', paddingLeft: 12, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                        <span style={{ color: 'var(--accent)', marginRight: 4 }}>▶</span>{th.label}
                      </div>
                    ))}
                  </div>
                  <div style={{ height: 26, position: 'relative', display: 'flex', fontSize: 9, fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--surface)' }}>
                    {timelineHeaders.bottomHeaders.map(bh => (
                      <div key={bh.key} style={{ position: 'absolute', left: bh.left, width: bh.width, bottom: 0, height: '100%', display: 'flex', alignItems: 'center', paddingLeft: 4, borderLeft: '1px solid var(--border-subtle)' }}>
                        {bh.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grid lines */}
                <div style={{ position: 'absolute', top: 52, left: 0, width: '100%', height: ganttFilteredTasks.length * ROW_HEIGHT, pointerEvents: 'none' }}>
                  {timelineHeaders.bottomHeaders.map((bh, i) => (
                    <div key={i} style={{ position: 'absolute', left: bh.left, width: bh.width, top: 0, height: '100%', borderLeft: '1px solid var(--border-subtle)', opacity: 0.15 }} />
                  ))}
                </div>

                {/* Row stripes */}
                {ganttFilteredTasks.map((t, i) => (
                  <div key={t.id} style={{ position: 'absolute', top: 52 + i * ROW_HEIGHT, left: 0, height: ROW_HEIGHT, width: '100%', borderBottom: '1px solid var(--border-subtle)', opacity: 0.18, background: i % 2 === 0 ? 'transparent' : 'rgba(100,116,139,0.04)' }} />
                ))}

                {/* Today line */}
                {ganttShowTodayLine && todayLeft !== null && (
                  <div style={{ position: 'absolute', left: todayLeft, top: 52, bottom: 0, width: 2, background: '#ef4444', zIndex: 15, pointerEvents: 'none', boxShadow: '0 0 6px rgba(239,68,68,0.4)' }}>
                    <div style={{ position: 'absolute', top: -4, left: -5, width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} title="Today" />
                    <span style={{ position: 'absolute', top: -16, left: -16, fontSize: 8, fontWeight: 800, color: '#ef4444', background: 'var(--bg)', padding: '1px 3px', borderRadius: 4, border: '1px solid #ef4444', whiteSpace: 'nowrap' }}>TODAY</span>
                  </div>
                )}

                {/* Gantt bars */}
                <div style={{ position: 'absolute', top: 52, left: 0, width: '100%', height: ganttFilteredTasks.length * ROW_HEIGHT }}>
                  {ganttBars.map((bar, idx) => {
                    if (!bar) return null;
                    const color = bar.colors.fill;
                    return (
                      <div key={bar.id} style={{ position: 'absolute', left: 0, width: '100%', top: idx * ROW_HEIGHT, height: ROW_HEIGHT, display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                        onMouseEnter={e => setHoveredBar({ bar, x: e.clientX + 14, y: e.clientY + 14 })}
                        onMouseMove={e => setHoveredBar(p => p ? { ...p, x: e.clientX + 14, y: e.clientY + 14 } : null)}
                        onMouseLeave={() => setHoveredBar(null)}>
                        {bar.isMilestone ? (
                          <div style={{ position: 'absolute', left: bar.plannedLeft - 5, top: 22, width: 10, height: 10, transform: 'rotate(45deg)', background: color, border: '1.5px solid #fff', zIndex: 10 }} />
                        ) : bar.isParent ? (
                          <svg style={{ position: 'absolute', left: bar.plannedLeft - 2, width: Math.max(8, bar.plannedWidth) + 4, top: 22, height: 12, zIndex: 10, overflow: 'visible' }}>
                            <path d={`M 2 2 H ${bar.plannedWidth + 2} V 8 H 2 Z`} fill={color} />
                            <path d="M 2 2 L 6 8 L 6 2 Z" fill={color} />
                            <path d={`M ${bar.plannedWidth + 2} 2 L ${bar.plannedWidth - 2} 8 L ${bar.plannedWidth - 2} 2 Z`} fill={color} />
                          </svg>
                        ) : (
                          <div style={{ position: 'absolute', left: bar.plannedLeft, width: bar.plannedWidth, top: 22, height: 8, borderRadius: 4, background: 'rgba(100,116,139,0.15)', border: '1px solid var(--border-subtle)', overflow: 'hidden', zIndex: 10 }}>
                            <div style={{ width: `${bar.completePercent}%`, background: color, height: '100%' }} />
                          </div>
                        )}
                        {ganttShowTaskName && (
                          <span style={{ position: 'absolute', left: bar.isMilestone ? bar.plannedLeft + 14 : bar.plannedLeft, top: 4, maxWidth: 420, fontSize: 10, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none' }}>
                            {bar.activityName}{ganttShowPercent && bar.completePercent > 0 ? ` (${Math.round(bar.completePercent)}%)` : ''}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hover Tooltip */}
      {hoveredBar && (() => {
        const { bar } = hoveredBar;
        const sc = STATUS_COLORS[bar.status] || STATUS_COLORS['Not Started'];
        return (
          <div className="vppd-tooltip" style={{ left: hoveredBar.x, top: hoveredBar.y }}>
            <div style={{ fontWeight: 800, fontSize: 12, color: bar.colors.fill, marginBottom: 8 }}>{bar.activityName}</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              {bar.wbsCode && <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#94a3b8', background: '#0f172a', padding: '1px 6px', borderRadius: 4, border: '1px solid #334155' }}>{bar.wbsCode}</span>}
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', background: '#0f172a', padding: '1px 6px', borderRadius: 4, border: '1px solid #334155' }}>{bar.itemType}</span>
            </div>
            <StatusBadge status={bar.status || 'Not Started'} />
            <div style={{ height: 1, background: '#334155', margin: '8px 0' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
              {[['Start', bar.plannedStartStr], ['End', bar.plannedEndStr], ['Duration', `${bar.durationDays}d`], ['Dept', bar.department]].map(([l, v]) => v && (
                <div key={l}>
                  <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{l}</div>
                  <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 11 }}>{v}</div>
                </div>
              ))}
            </div>
            {!bar.isMilestone && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 9, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Progress</span>
                  <span style={{ fontWeight: 800, color: bar.colors.fill }}>{Math.round(bar.completePercent)}%</span>
                </div>
                <div style={{ height: 5, background: '#334155', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${bar.completePercent}%`, height: '100%', background: bar.colors.fill, borderRadius: 3 }} />
                </div>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );

  /* ══════════════════════════════════════════════════════════════════
     TAB: CRITICAL ISSUES
  ══════════════════════════════════════════════════════════════════ */
  const renderIssuesTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Issue Analytics */}
      <div className="vppd-issues-analytics-grid">
        {/* Priority Donut */}
        <div className="vppd-section">
          <div className="vppd-section-header">
            <h3 className="vppd-section-title"><BarChart3 size={14} style={{ color: '#4f46e5' }} /> Issues by Priority</h3>
          </div>
          <div className="vppd-section-body" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <ReactECharts option={issuesPriorityOption} style={{ height: 160, width: 160, flexShrink: 0 }} opts={{ renderer: 'svg' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { c: '#ef4444', l: 'Critical', v: issuesByPriority.Critical },
                { c: '#f97316', l: 'High', v: issuesByPriority.High },
                { c: '#f59e0b', l: 'Medium', v: issuesByPriority.Medium },
                { c: '#10b981', l: 'Low', v: issuesByPriority.Low },
              ].map(i => (
                <div key={i.l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: i.c, flexShrink: 0 }} />
                    {i.l}
                  </span>
                  <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)', minWidth: 20, textAlign: 'right' }}>{i.v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="vppd-section">
          <div className="vppd-section-header">
            <h3 className="vppd-section-title"><Activity size={14} style={{ color: '#0891b2' }} /> Issues by Status</h3>
          </div>
          <div className="vppd-section-body">
            {Object.keys(issuesByStatus).length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '24px 0' }}>No issue data</div>
            ) : (
              <ReactECharts option={issuesStatusOption} style={{ height: 180, width: '100%' }} opts={{ renderer: 'svg' }} />
            )}
          </div>
        </div>
      </div>

      {/* Full Issues Table */}
      <div className="vppd-section">
        <div className="vppd-section-header" style={{ background: 'linear-gradient(to right, var(--elevated-card), var(--surface))' }}>
          <h3 className="vppd-section-title">
            <ClipboardList size={14} style={{ color: '#ef4444' }} />
            All Critical Issues
            {filteredMomIssues.length > 0 && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--elevated-card)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
              <ClipboardList size={11} /> Total: {filteredMomIssues.length}
            </span>
                  <button onClick={() => { fetchingRef.current = false; fetchMomIssues(); }} disabled={loadingMom}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--accent)', background: 'var(--elevated-card)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '5px 12px', cursor: loadingMom ? 'default' : 'pointer' }}>
              <RefreshCw size={12} style={{ animation: loadingMom ? 'spin 1s linear infinite' : 'none' }} /> Refresh
            </button>
          </div>
        </div>
        <div style={{ padding: 0 }}>
          {momIssues.length === 0 ? (
            <div style={{ padding: '56px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <FileText size={44} style={{ opacity: 0.25, color: 'var(--text-muted)' }} strokeWidth={1} />
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>No meeting issues synced yet</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 320, lineHeight: 1.5, textAlign: 'center' }}>Capture meeting minutes and sync action items to track them here.</div>
              <button onClick={() => navigate('/dashboard/mom/capture')}
                style={{ padding: '10px 24px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Capture New Meeting
              </button>
            </div>
          ) : (
            <>
              {/* MOM Form Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={16} style={{ color: 'var(--accent)' }} />
                  <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
                    Minutes of Meeting — Action Items
                  </h2>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>FORM NO: MOM/DB/2026 | REV: 0.1</span>
              </div>
              <div className="vppd-refined-table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table className="vppd-refined-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Issue Details</th>
                      <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', width: 140 }}>Owner</th>
                      <th style={{ textAlign: 'center', padding: '12px 20px', fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', width: 100 }}>Due Date</th>
                      <th style={{ textAlign: 'center', padding: '12px 20px', fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', width: 100 }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', width: 200 }}>Latest Update</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayIssues.map(issue => {
                      const ns = normalizeIssueStatus(issue.status);
                      const isClosed = ns === 'Resolved';
                      return (
                        <tr key={issue.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '12px 20px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 13 }}>{issue.title || 'Untitled Issue'}</span>
                                <PriorityBadge priority={issue.priority || 'Medium'} />
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ID: {issue.id ? issue.id.substring(0, 8) : '—'}</div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--elevated-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'var(--text-secondary)', flexShrink: 0 }}>
                                {issue.owner?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                                <span style={{ fontSize: 12 }}>{issue.owner || 'Unassigned'}</span>
                              </div>
                            </td>
                            <td style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>
                              {issue.due_date ? fmtDate(issue.due_date, { day: '2-digit', month: 'short' }) : '—'}
                            </td>
                            <td>
                              <div style={{ background: isClosed ? 'var(--green-50)' : '#fef3c7', color: isClosed ? 'var(--green-900)' : '#92400e', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 4, textAlign: 'center', textTransform: 'uppercase' }}>
                                {isClosed ? 'Resolved' : ns}
                              </div>
                            </td>
                            <td style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              {(() => {
                                if (!issue.comments?.length) return '—';
                                const sorted = [...issue.comments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                                return sorted[0].comment_text;
                              })()}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
              {filteredMomIssues.length > displayIssues.length && (
                <div style={{ padding: '10px 20px', textAlign: 'center', borderTop: '1px solid var(--border-subtle)' }}>
                  <button onClick={() => { setTempPinnedIds(pinnedIssueIds.length > 0 ? [...pinnedIssueIds] : displayIssues.map(i => i.id)); setIsIssueModalOpen(true); }}
                    style={{ background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '6px 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                    + {filteredMomIssues.length - displayIssues.length} more issues
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sync History */}
        {syncHistory.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '16px 20px' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12 }}>Sync History</div>
            <Table className="vppd-sync-history-table">
              <TableHeader>
                <TableRow>
                  <TableHead style={{ width: 40 }}>#</TableHead>
                  <TableHead>Meeting</TableHead>
                  <TableHead style={{ width: 110 }}>Date</TableHead>
                  <TableHead style={{ width: 130 }}>Synced At</TableHead>
                  <TableHead style={{ width: 80 }}>Issues</TableHead>
                  <TableHead style={{ width: 80 }}>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncHistory.map((h, idx) => {
                  const pd = h.date ? fmtDate(h.date) : '—';
                  let sa = '—';
                  if (h.synced_at) {
                    const sd = new Date(h.synced_at);
                    sa = `${fmtDate(sd, { day: '2-digit', month: 'short' })} · ${sd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()}`;
                  }
                  return (
                    <TableRow key={h.history_id || idx} style={{ background: idx === 0 ? 'var(--blue-50)' : 'transparent' }}>
                      <TableCell style={{ color: 'var(--text-muted)' }}>{idx + 1}</TableCell>
                      <TableCell>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: idx === 0 ? 600 : 400 }}>{h.meeting_name || 'Untitled Meeting'}</span>
                          {idx === 0 && <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--green-50)', color: 'var(--green-900)', border: '1px solid #86efac', borderRadius: 99, padding: '1px 6px' }}>latest</span>}
                        </div>
                      </TableCell>
                      <TableCell style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{pd}</TableCell>
                      <TableCell style={{ color: 'var(--text-muted)', fontSize: 11 }}>{sa}</TableCell>
                      <TableCell style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>{h.sync_id ? `${h.row_count} issues` : <span style={{ color: 'var(--text-muted)' }}>—</span>}</TableCell>
                      <TableCell>
                        <button onClick={() => h.sync_id ? navigate(`/dashboard/saved-moms?highlight=${h.sync_id}`) : toast.error('History not found')}
                          style={{ fontSize: 11, color: 'var(--accent)', background: 'var(--elevated-card)', border: '1px solid var(--border-subtle)', borderRadius: 5, cursor: 'pointer', padding: '3px 10px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <ExternalLink size={10} /> View
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════════════════
     TAB: BUDGET SUMMARY
  ══════════════════════════════════════════════════════════════════ */
  const renderBudgetTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI Cards */}
      <div className="vppd-kpi-strip">
        {[
          { label: 'Approved Budget', value: `${budgetCurrencySymbol}${fmtMoney(budgetApproved)}`, color: '#3b82f6', icon: '🏦' },
          { label: 'Utilized', value: `${budgetCurrencySymbol}${fmtMoney(budgetUtilized)}`, color: utilizationPct > 90 ? '#ef4444' : '#10b981', icon: '📊' },
          { label: 'Balance', value: `${budgetCurrencySymbol}${fmtMoney(budgetBalance)}`, color: '#f59e0b', icon: '💰' },
          { label: 'Utilization %', value: `${utilizationPct}%`, color: utilizationPct > 90 ? '#ef4444' : utilizationPct > 70 ? '#f59e0b' : '#10b981', icon: '📈' },
          { label: 'Outlook', value: `${budgetOutlook}%`, color: '#8b5cf6', icon: '🔮' },
        ].map(c => (
          <div key={c.label} className="vppd-kpi-card">
            <span className="vppd-kpi-label">{c.icon} {c.label}</span>
            <span className="vppd-kpi-value" style={{ color: c.color }}>{c.value}</span>
          </div>
        ))}
      </div>

      {/* Split: Table | Charts */}
      <div className="vppd-budget-split">
        {/* Left: Budget Table */}
        <div className="vppd-section">
          <div className="vppd-section-header">
            <h3 className="vppd-section-title"><FileText size={14} style={{ color: '#3b82f6' }} /> Budget Detail Table</h3>
          </div>
          <div style={{ padding: 0 }}>
            {isBudgetLoading ? (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-8 w-full" />)}
              </div>
            ) : renderBudgetTableContent ? (
              renderBudgetTableContent()
            ) : (
              <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No budget data available
              </div>
            )}
          </div>
        </div>

        {/* Right: Charts */}
        <div className="vppd-budget-chart-grid">
          {/* Utilization Donut */}
          <div className="vppd-section">
            <div className="vppd-section-header">
              <h3 className="vppd-section-title"><Activity size={14} style={{ color: '#3b82f6' }} /> Budget Utilization</h3>
              <span style={{ fontSize: 11, fontWeight: 800, color: utilizationPct > 90 ? '#ef4444' : '#10b981' }}>{utilizationPct}%</span>
            </div>
            <div className="vppd-section-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <ReactECharts option={budgetUtilizationOption} style={{ height: 140, width: 140 }} opts={{ renderer: 'svg' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)' }}>{utilizationPct}%</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Used</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                {[
                  { color: '#3b82f6', label: 'Approved', value: `${budgetCurrencySymbol}${fmtMoney(budgetApproved)}` },
                  { color: utilizationPct > 90 ? '#ef4444' : '#10b981', label: 'Utilized', value: `${budgetCurrencySymbol}${fmtMoney(budgetUtilized)}` },
                  { color: '#e2e8f0', label: 'Balance', value: `${budgetCurrencySymbol}${fmtMoney(budgetBalance)}` },
                ].map(i => (
                  <div key={i.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: i.color, flexShrink: 0 }} />{i.label}
                    </span>
                    <span style={{ fontWeight: 800, fontSize: 12, color: 'var(--text-primary)' }}>{i.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Budget Bar */}
          <div className="vppd-section">
            <div className="vppd-section-header">
              <h3 className="vppd-section-title"><BarChart3 size={14} style={{ color: '#8b5cf6' }} /> Approved vs Utilized vs Balance</h3>
            </div>
            <div className="vppd-section-body">
              <ReactECharts option={budgetBarOption} style={{ height: 180, width: '100%' }} opts={{ renderer: 'svg' }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════ */

  const issueCount = filteredMomIssues.length;

  return (
    <div className="vppd-root">

      {/* ── SAP Object Page Header ── */}
      <div className="vppd-project-heading" style={{ paddingBottom: 14, borderBottom: '1px solid var(--border-subtle)' }}>
        {/* Project avatar */}
        <div className="vppd-project-heading-badge">{projectInitials}</div>
        <div style={{ flex: 1 }}>
          {/* SAP Object Page eyebrow (breadcrumb equivalent) */}
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.09em',
            marginBottom: 3,
          }}>
            PROJECT DASHBOARD
          </div>
          <h1 className="vppd-project-title">{activeProject?.name}</h1>
          {activeProject?.project_manager && (
            <p className="vppd-project-subtitle">Project Manager: {activeProject.project_manager}</p>
          )}
        </div>
        {/* SAP Object Status chip */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span className="vppd-project-health-chip" style={healthStyle}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: healthStyle.color, display: 'inline-block', flexShrink: 0 }} />
            {healthLabel}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>
            Health Status
          </span>
        </div>
      </div>


      {/* ── Tab Navigation ── */}
      <nav className="vppd-tab-nav" role="tablist">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const showCount = tab.id === 'issues' && issueCount > 0;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              className={`vppd-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.Icon size={14} className="vppd-tab-icon" />
              {tab.label}
              {showCount && <span className="vppd-tab-count">{issueCount}</span>}
            </button>
          );
        })}
      </nav>

      {/* ── Tab Content ── */}
      <div className="vppd-tab-panel" role="tabpanel">
        {activeTab === 'metrics' && renderMetricsTab()}
        {activeTab === 'milestones' && renderMilestonesTab()}
        {activeTab === 'issues' && renderIssuesTab()}
        {activeTab === 'budget' && renderBudgetTab()}
        {activeTab === 'risk-management' && (
          <RiskManagementDashboard
            projectId={activeProject?.dbProjectId || activeProject?.id}
          />
        )}

        {/* Resource & Quality — appended at bottom of metrics/overview */}
        {(activeTab === 'metrics') && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 20 }}>
            {visibleSections.resource && (
              <ResourceManagementCenter
                projectTeam={projectTeam}
                employees={employees}
                projectId={activeProject?.dbProjectId || activeProject?.id}
                onRefresh={fetchTeamAndEmployees}
              />
            )}
            {visibleSections.quality && (
              <QualityHealthCenter
                projectMilestones={milestones}
                projectId={activeProject?.dbProjectId || activeProject?.id}
                projectName={activeProject?.name}
                onRefresh={onRetry}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Pinned Issues Modal ── */}
      {isIssueModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24, animation: 'vppdFadeIn 0.2s ease-out' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, width: '100%', maxWidth: 600, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', maxHeight: '85vh', animation: 'vppdSlideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Select Critical Issues</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Pin up to 5 issues. ({tempPinnedIds.length}/5 selected)</p>
              </div>
              <button onClick={() => setIsIssueModalOpen(false)} style={{ background: 'var(--elevated-card)', border: '1px solid var(--border-subtle)', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ padding: '12px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredMomIssues.map(issue => {
                const isSel = tempPinnedIds.includes(issue.id);
                const isMax = tempPinnedIds.length >= 5 && !isSel;
                return (
                  <div key={issue.id} onClick={() => { if (isSel) setTempPinnedIds(p => p.filter(id => id !== issue.id)); else if (!isMax) setTempPinnedIds(p => [...p, issue.id]); }}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px', borderRadius: 8, background: isSel ? 'var(--blue-50)' : 'var(--elevated-card)', border: `1px solid ${isSel ? 'var(--accent)' : 'var(--border-subtle)'}`, cursor: isMax ? 'not-allowed' : 'pointer', opacity: isMax ? 0.6 : 1 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isSel ? 'var(--accent)' : 'var(--text-muted)'}`, background: isSel ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      {isSel && <CheckCircle2 size={12} color="#fff" strokeWidth={3} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{issue.title}</div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                        <span>{issue.priority || 'Medium'}</span>
                        <span>{issue.owner || 'Unassigned'}</span>
                        <span>{issue.status || 'Open'}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, padding: '16px 24px', borderTop: '1px solid var(--border-subtle)' }}>
              <button onClick={() => setIsIssueModalOpen(false)} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', background: 'transparent', border: '1px solid var(--border-subtle)', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { setPinnedIssueIds(tempPinnedIds); if (activeProject?.dbProjectId) localStorage.setItem(`caldim_pinned_issues_${activeProject.dbProjectId}`, JSON.stringify(tempPinnedIds)); setIsIssueModalOpen(false); }}
                disabled={tempPinnedIds.length === 0}
                style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, color: '#fff', background: tempPinnedIds.length > 0 ? 'var(--accent)' : 'var(--border-subtle)', border: 'none', borderRadius: 6, cursor: tempPinnedIds.length > 0 ? 'pointer' : 'not-allowed' }}>
                Save View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Gantt Settings Modal ── */}
      {isGanttSettingsModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24, animation: 'vppdFadeIn 0.2s ease-out' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, width: '100%', maxWidth: 400, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', animation: 'vppdSlideUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Gantt Chart Settings</h3>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>Configure display settings</p>
              </div>
              <button onClick={() => setIsGanttSettingsModalOpen(false)} style={{ background: 'var(--elevated-card)', border: '1px solid var(--border-subtle)', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { state: ganttShowTaskName, set: setGanttShowTaskName, label: 'Show Task Name', sub: 'Display name above timeline bar' },
                { state: ganttShowPercent, set: setGanttShowPercent, label: 'Show Progress %', sub: 'Show completion percentage next to name' },
                { state: ganttShowTodayLine, set: setGanttShowTodayLine, label: 'Show Today Line', sub: 'Render a vertical red marker for today' },
              ].map(item => (
                <label key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" checked={item.state} onChange={e => item.set(e.target.checked)} style={{ width: 16, height: 16 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.sub}</div>
                  </div>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid var(--border-subtle)' }}>
              <button onClick={() => setIsGanttSettingsModalOpen(false)} style={{ padding: '8px 20px', fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VPProjectDashboard;
