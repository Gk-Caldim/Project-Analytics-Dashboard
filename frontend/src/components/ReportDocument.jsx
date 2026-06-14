import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// Standard styles for the professional report
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#334155',
    backgroundColor: '#ffffff',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#1e3a5f',
    paddingBottom: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e3a5f',
  },
  subtitle: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 2,
  },
  headerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  infoItem: {
    fontSize: 9,
    color: '#64748b',
  },
  infoLabel: {
    fontWeight: 'bold',
    color: '#1e3a5f',
  },
  statusBadge: {
    backgroundColor: '#fff7ed',
    color: '#c2410c',
    padding: '2 8',
    borderRadius: 10,
    fontSize: 8,
    borderWidth: 0.5,
    borderColor: '#fed7aa',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e293b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 0,
    padding: '10 0 6 0',
    borderBottomWidth: 2,
    borderBottomColor: '#1e293b',
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableCellHeader: {
    padding: 6,
    fontSize: 8,
    fontWeight: 'bold',
    color: '#64748b',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  tableCell: {
    padding: 6,
    fontSize: 8,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  statusPill: {
    padding: '2 6',
    borderRadius: 8,
    fontSize: 7,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryItem: {
    width: '50%',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryLabel: {
    width: '70%',
    padding: 8,
    backgroundColor: '#f8fafc',
    fontSize: 9,
    color: '#64748b',
  },
  summaryValue: {
    width: '30%',
    padding: 8,
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1e3a5f',
  },
  chartGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  chartContainer: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
    minHeight: 150,
  },
  chartTitle: {
    backgroundColor: '#1e3a5f',
    color: '#ffffff',
    padding: '4 8',
    fontSize: 9,
    fontWeight: 'bold',
  },
  chartImage: {
    width: '100%',
    height: 120,
    objectFit: 'contain',
    padding: 5,
  },
  budgetGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 5,
  },
  budgetCard: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  budgetLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  budgetValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  criticalIssuesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10 12',
    backgroundColor: '#ffffff',
    borderBottomWidth: 2,
    borderBottomColor: '#0D9488',
    marginBottom: 0,
  },
  criticalIssuesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0D9488',
    textTransform: 'uppercase',
  },
  criticalIssuesStats: {
    flexDirection: 'row',
    gap: 15,
  },
  statText: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  momFormMeta: {
    fontSize: 7,
    color: '#94A3B8',
    marginTop: 2,
  },

  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#94a3b8',
  },
  watermark: {
    position: 'absolute',
    top: '35%',
    left: '5%',
    right: '5%',
    fontSize: 56,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    color: '#94a3b8',
    textAlign: 'center',
    transform: 'rotate(-35deg)',
    zIndex: -999,
  },
  ganttPage: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#334155',
    backgroundColor: '#ffffff',
  },
  ganttHeader: {
    marginBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: '#1e3a5f',
    paddingBottom: 6,
  },
  ganttTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e3a5f',
  },
  ganttSubtitle: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 2,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    paddingTop: 8,
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendLabel: {
    fontSize: 7,
    color: '#475569',
  },
  legendColorBox: {
    width: 10,
    height: 6,
    borderRadius: 1,
  }
});

// Helper for status pill colors
const getStatusStyles = (status) => {
  const colors = {
    'Open': { backgroundColor: '#fee2e2', color: '#991b1b' },
    'Closed': { backgroundColor: '#d1fae5', color: '#065f46' },
    'In Progress': { backgroundColor: '#dbeafe', color: '#1e40af' },
    'On Track': { backgroundColor: '#d1fae5', color: '#065f46' },
    'At Risk': { backgroundColor: '#fed7aa', color: '#9a3412' },
    'Likely Delay': { backgroundColor: '#fff7ed', color: '#c2410c' },
    'Completed': { backgroundColor: '#d1fae5', color: '#065f46' },
    'Delayed': { backgroundColor: '#fee2e2', color: '#991b1b' },
    'Upcoming': { backgroundColor: '#e0e7ff', color: '#3730a3' },
    'On Hold': { backgroundColor: '#fef3c7', color: '#92400e' },
    'Not Started': { backgroundColor: '#f3f4f6', color: '#374151' },
    'Cancelled': { backgroundColor: '#e5e7eb', color: '#6b7280' },
  };
  return colors[status] || { backgroundColor: '#f3f4f6', color: '#1f2937' };
};

const normalizeStatus = (status) => {
  if (!status) return 'Pending';
  const s = status.toLowerCase();
  if (['open', 'pending', 'in progress'].includes(s)) return 'Pending';
  if (['closed', 'done', 'resolved', 'complete'].includes(s)) return 'Resolved';
  return status;
};

const getLastAction = (issue) => {
  if (!issue.comments || issue.comments.length === 0) return '—';
  const sorted = [...issue.comments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return sorted[0].comment_text;
};

const chunkArray = (arr, size) => {
  const chunks = [];
  if (!arr) return chunks;
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
};


const GANTT_ROWS_PER_PAGE = 13;

const ReportDocument = ({ 
  activeProject, 
  milestones, 
  criticalIssues, 
  sopData, 
  summaryData, 
  visibleSections,
  visiblePhaseList,
  budgetTableData,
  budgetCurrency,
  budgetStatus,
  chartImages,
  sectionOrder,
  headerTitle,
  subHeading,
  footerText,
  backgroundColor,
  watermarkText,
  watermarkOpacity,
  ganttDeptFilter = 'All',
  ganttTypeFilter = 'All',
  ganttStatusFilter = 'All',
  showProjectName = true,
  showGenerationDate = true,
  showActiveFilters = true
}) => {
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // 1. Sort and Filter Milestones
  const filteredMilestones = React.useMemo(() => {
    if (!milestones) return [];
    const sorted = [...milestones].sort((a, b) => (a.row_order || 0) - (b.row_order || 0));
    return sorted.filter(t => {
      if (ganttDeptFilter && ganttDeptFilter !== 'All' && t.department !== ganttDeptFilter) return false;
      if (ganttTypeFilter && ganttTypeFilter !== 'All' && t.item_type !== ganttTypeFilter) return false;
      if (ganttStatusFilter && ganttStatusFilter !== 'All' && t.status !== ganttStatusFilter) return false;
      return true;
    });
  }, [milestones, ganttDeptFilter, ganttTypeFilter, ganttStatusFilter]);

  // 2. Timeline calculations
  const { timelineStart, timelineEnd, daysBetween, months, weeks, showTodayLine, todayLeftPct } = React.useMemo(() => {
    if (filteredMilestones.length === 0) {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      const end = new Date();
      end.setDate(end.getDate() + 90);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;
      return { 
        timelineStart: start, 
        timelineEnd: end, 
        daysBetween: days, 
        months: [], 
        weeks: [], 
        showTodayLine: false, 
        todayLeftPct: '0%' 
      };
    }

    let minDate = null;
    let maxDate = null;

    filteredMilestones.forEach(t => {
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

    // Month Headers
    const tempMonths = [];
    const tempDate = new Date(startPadding.getFullYear(), startPadding.getMonth(), 1);
    const endLimit = new Date(endPadding.getFullYear(), endPadding.getMonth() + 1, 1);

    while (tempDate < endLimit) {
      const mYear = tempDate.getFullYear();
      const mMonth = tempDate.getMonth();
      const start = Math.max(startPadding.getTime(), new Date(mYear, mMonth, 1).getTime());
      const end = Math.min(endPadding.getTime(), new Date(mYear, mMonth + 1, 1).getTime());

      if (start < end) {
        const leftPct = ((start - startPadding.getTime()) / (1000 * 60 * 60 * 24)) / days * 100;
        const widthPct = ((end - start) / (1000 * 60 * 60 * 24)) / days * 100;
        const label = tempDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        tempMonths.push({
          label,
          left: `${leftPct}%`,
          width: `${widthPct}%`,
          startPct: leftPct
        });
      }
      tempDate.setMonth(tempDate.getMonth() + 1);
    }

    // Week Headers
    const tempWeeks = [];
    const weekTemp = new Date(startPadding);
    const dayOffset = weekTemp.getDay();
    const daysToMonday = dayOffset === 0 ? -6 : 1 - dayOffset;
    weekTemp.setDate(weekTemp.getDate() + daysToMonday);

    while (weekTemp < endPadding) {
      const wStart = Math.max(startPadding.getTime(), weekTemp.getTime());
      const nextWeek = new Date(weekTemp);
      nextWeek.setDate(nextWeek.getDate() + 7);
      const wEnd = Math.min(endPadding.getTime(), nextWeek.getTime());

      if (wStart < wEnd) {
        const leftPct = ((wStart - startPadding.getTime()) / (1000 * 60 * 60 * 24)) / days * 100;
        const widthPct = ((wEnd - wStart) / (1000 * 60 * 60 * 24)) / days * 100;
        const labelDate = new Date(wStart);
        const label = String(labelDate.getDate());
        tempWeeks.push({
          label,
          left: `${leftPct}%`,
          width: `${widthPct}%`
        });
      }
      weekTemp.setDate(weekTemp.getDate() + 7);
    }

    // Today Line
    const today = new Date();
    const todayTime = today.getTime();
    let showToday = false;
    let todayLeft = '0%';
    if (todayTime >= startPadding.getTime() && todayTime <= endPadding.getTime()) {
      showToday = true;
      todayLeft = `${((todayTime - startPadding.getTime()) / (1000 * 60 * 60 * 24)) / days * 100}%`;
    }

    return {
      timelineStart: startPadding,
      timelineEnd: endPadding,
      daysBetween: days,
      months: tempMonths,
      weeks: tempWeeks,
      showTodayLine: showToday,
      todayLeftPct: todayLeft
    };
  }, [filteredMilestones]);

  // 3. Active Filters String
  const activeFiltersStr = React.useMemo(() => {
    const activeFiltersArr = [];
    if (ganttDeptFilter && ganttDeptFilter !== 'All') activeFiltersArr.push(`Dept: ${ganttDeptFilter}`);
    if (ganttTypeFilter && ganttTypeFilter !== 'All') activeFiltersArr.push(`Type: ${ganttTypeFilter}`);
    if (ganttStatusFilter && ganttStatusFilter !== 'All') activeFiltersArr.push(`Status: ${ganttStatusFilter}`);
    return activeFiltersArr.length > 0 ? activeFiltersArr.join(' | ') : 'None';
  }, [ganttDeptFilter, ganttTypeFilter, ganttStatusFilter]);

  // 4. Section Splitting
  const milestonesIdx = sectionOrder.indexOf('milestones');
  const hasMilestonesSection = milestonesIdx !== -1 && visibleSections?.milestones;

  let beforeSections = [];
  let afterSections = [];

  if (hasMilestonesSection) {
    beforeSections = sectionOrder.slice(0, milestonesIdx);
    afterSections = sectionOrder.slice(milestonesIdx + 1);
  } else {
    beforeSections = [...sectionOrder];
  }

  // 5. Chunking Gantt Rows
  const totalGanttPages = Math.max(1, Math.ceil(filteredMilestones.length / GANTT_ROWS_PER_PAGE));
  const ganttChunks = [];
  for (let i = 0; i < filteredMilestones.length; i += GANTT_ROWS_PER_PAGE) {
    ganttChunks.push(filteredMilestones.slice(i, i + GANTT_ROWS_PER_PAGE));
  }
  if (ganttChunks.length === 0) {
    ganttChunks.push([]);
  }

  // 6. Section Renderer
  const renderSectionByKey = (key) => {
    // 2. Critical Issues
    if (key === 'criticalIssues' && visibleSections?.criticalIssues && criticalIssues?.length > 0) {
      const pending = criticalIssues.filter(i => {
        const s = (i.status || '').toLowerCase();
        return s !== 'closed' && s !== 'resolved' && s !== 'done' && s !== 'complete';
      }).length;
      const resolved = criticalIssues.length - pending;

      return (
        <View key={key} style={styles.section}>
          <View style={styles.criticalIssuesHeader}>
            <View>
              <Text style={styles.criticalIssuesTitle}>Critical Issues</Text>
              <Text style={styles.momFormMeta}>FORM NO: MOM/DB/2026 | REV: 0.2</Text>
            </View>
            <View style={styles.criticalIssuesStats}>
              <Text style={[styles.statText, { color: '#64748b' }]}>TOTAL: {criticalIssues.length}</Text>
              <Text style={[styles.statText, { color: '#b45309' }]}>PENDING: {pending}</Text>
              <Text style={[styles.statText, { color: '#059669' }]}>RESOLVED: {resolved}</Text>
            </View>
          </View>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellHeader, { width: '4%' }]}>#</Text>
              <Text style={[styles.tableCellHeader, { width: '10%' }]}>Function</Text>
              <Text style={[styles.tableCellHeader, { width: '12%' }]}>Project</Text>
              <Text style={[styles.tableCellHeader, { width: '10%' }]}>Criticality</Text>
              <Text style={[styles.tableCellHeader, { width: '25%' }]}>Action Points Discussed</Text>
              <Text style={[styles.tableCellHeader, { width: '12%' }]}>Responsibility</Text>
              <Text style={[styles.tableCellHeader, { width: '8%' }]}>Target</Text>
              <Text style={[styles.tableCellHeader, { width: '9%' }]}>Status</Text>
              <Text style={[styles.tableCellHeader, { width: '10%' }]}>Action Taken</Text>
            </View>
            {criticalIssues.map((issue, idx) => {
              const priority = issue.priority || 'Medium';
              const critStyles = {
                'High': { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' },
                'Medium': { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' },
                'Low': { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' },
                'Critical': { bg: '#DC2626', color: '#FFFFFF', border: '#B91C1C' },
              }[priority] || { bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0' };

              const isClosed = ['closed', 'done', 'resolved', 'complete'].includes(
                (issue.status || '').toLowerCase()
              );
              const displayStatus = normalizeStatus(issue.status);
              const statusBg = isClosed ? '#D1FAE5' : (displayStatus === 'Pending' ? '#FAEEDA' : '#F1F5F9');
              const statusColor = isClosed ? '#065F46' : (displayStatus === 'Pending' ? '#854F0B' : '#475569');

              return (
                <View key={idx} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: '4%', textAlign: 'center' }]}>{idx + 1}</Text>
                  <Text style={[styles.tableCell, { width: '10%' }]}>{issue.department || 'General'}</Text>
                  <Text style={[styles.tableCell, { width: '12%', fontWeight: 'bold' }]}>{activeProject?.name || 'Project'}</Text>
                  <View style={[styles.tableCell, { width: '10%' }]}>
                    <Text style={[styles.statusPill, { 
                      backgroundColor: critStyles.bg, 
                      color: critStyles.color,
                      borderWidth: 0.5,
                      borderColor: critStyles.border
                    }]}>{priority}</Text>
                  </View>
                  <View style={[styles.tableCell, { width: '25%' }]}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 2 }}>{issue.title}</Text>
                    {issue.description && issue.description !== issue.title ? (
                      <Text style={{ fontSize: 7, color: '#64748b' }}>{issue.description}</Text>
                    ) : null}
                  </View>
                  <Text style={[styles.tableCell, { width: '12%' }]}>{issue.owner || issue.responsibility}</Text>
                  <Text style={[styles.tableCell, { width: '8%', textAlign: 'center' }]}>
                    {issue.due_date ? new Date(issue.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                  </Text>
                  <View style={[styles.tableCell, { width: '9%' }]}>
                    <Text style={[styles.statusPill, { 
                      backgroundColor: statusBg, 
                      color: statusColor
                    }]}>{displayStatus}</Text>
                  </View>
                  <Text style={[styles.tableCell, { width: '10%', fontStyle: 'italic', fontSize: 7 }]}>
                    {getLastAction(issue)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      );
    }

    // 3. Budget Summary
    if (key === 'budget' && visibleSections?.budget) {
      const approved = summaryData?.budgetApproved || 0;
      const utilized = summaryData?.budgetUtilized || 0;
      const balance = summaryData?.budgetBalance || 0;
      const outlook = summaryData?.budgetOutlook || '0';
      const curr = budgetCurrency || '$';

      return (
        <View key={key} style={styles.section} wrap={false}>
          <Text style={[styles.sectionTitle, { borderBottomColor: '#4f46e5', color: '#4f46e5' }]}>Budget Summary</Text>
          <View style={[styles.budgetGrid, { marginTop: 10 }]}>
            <View style={[styles.budgetCard, { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }]}>
              <Text style={[styles.budgetLabel, { color: '#64748b' }]}>Approved</Text>
              <Text style={[styles.budgetValue, { color: '#1e293b' }]}>{curr}{Number(approved).toLocaleString()}</Text>
            </View>
            <View style={[styles.budgetCard, { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' }]}>
              <Text style={[styles.budgetLabel, { color: '#166534' }]}>Utilized</Text>
              <Text style={[styles.budgetValue, { color: '#10b981' }]}>{curr}{Number(utilized).toLocaleString()}</Text>
            </View>
            <View style={[styles.budgetCard, { backgroundColor: '#eff6ff', borderColor: '#dbeafe' }]}>
              <Text style={[styles.budgetLabel, { color: '#1e40af' }]}>Balance</Text>
              <Text style={[styles.budgetValue, { color: '#4f46e5' }]}>{curr}{Number(balance).toLocaleString()}</Text>
            </View>
            <View style={[styles.budgetCard, { backgroundColor: '#f5f3ff', borderColor: '#ede9fe' }]}>
              <Text style={[styles.budgetLabel, { color: '#6d28d9' }]}>Utilization</Text>
              <Text style={[styles.budgetValue, { color: '#8b5cf6' }]}>{outlook}%</Text>
            </View>
          </View>
        </View>
      );
    }

    // 4. Charts (Metrics Summary)
    if (key === 'charts' && visibleSections?.metricsSummary && visiblePhaseList?.length > 0) {
      const chartRows = chunkArray(visiblePhaseList, 2);
      return (
        <View key={key} style={styles.section}>
          <Text style={[styles.sectionTitle, { marginBottom: 10, borderBottomColor: '#1e3a5f', color: '#1e3a5f' }]}>Project Metrics Summary</Text>
          {chartRows.map((row, rowIdx) => (
            <View key={rowIdx} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              {row.map(phase => (
                <View key={phase.id} style={styles.chartContainer} wrap={false}>
                  <Text style={styles.chartTitle}>{phase.label}</Text>
                  {chartImages?.[phase.id] ? (
                    <Image src={chartImages[phase.id]} style={styles.chartImage} />
                  ) : (
                    <View style={{ height: 120, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' }}>
                      <Text style={{ fontSize: 8, color: '#94a3b8' }}>No chart data</Text>
                    </View>
                  )}
                </View>
              ))}
              {row.length === 1 && <View style={{ width: '48%' }} />}
            </View>
          ))}
        </View>
      );
    }

    // 5. Resource Summary
    if (key === 'resource' && visibleSections?.resource) {
      return (
        <View key={key} style={styles.section} wrap={false}>
          <Text style={[styles.sectionTitle, { borderBottomColor: '#0ea5e9', color: '#0ea5e9' }]}>Resource Summary</Text>
          <View style={[styles.budgetGrid, { marginTop: 10 }]}>
            <View style={[styles.budgetCard, { backgroundColor: '#f0f9ff', borderColor: '#e0f2fe' }]}>
              <Text style={[styles.budgetLabel, { color: '#0369a1' }]}>Deployed</Text>
              <Text style={[styles.budgetValue, { color: '#0ea5e9' }]}>{summaryData?.resourceDeployed || '0'}</Text>
            </View>
            <View style={[styles.budgetCard, { backgroundColor: '#f0fdfa', borderColor: '#ccfbf1' }]}>
              <Text style={[styles.budgetLabel, { color: '#0f766e' }]}>Utilized</Text>
              <Text style={[styles.budgetValue, { color: '#14b8a6' }]}>{summaryData?.resourceUtilized || '0'}</Text>
            </View>
            <View style={[styles.budgetCard, { backgroundColor: '#fff1f2', borderColor: '#ffe4e6' }]}>
              <Text style={[styles.budgetLabel, { color: '#9f1239' }]}>Shortage</Text>
              <Text style={[styles.budgetValue, { color: '#f43f5e' }]}>{summaryData?.resourceShortage || '0'}</Text>
            </View>
            <View style={[styles.budgetCard, { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }]}>
              <Text style={[styles.budgetLabel, { color: '#64748b' }]}>Under-Utilized</Text>
              <Text style={[styles.budgetValue, { color: '#1e293b' }]}>{summaryData?.resourceUnderUtilized || '0'}</Text>
            </View>
          </View>
        </View>
      );
    }

    // 6. Quality Summary
    if (key === 'quality' && visibleSections?.quality) {
      return (
        <View key={key} style={styles.section} wrap={false}>
          <Text style={[styles.sectionTitle, { borderBottomColor: '#f59e0b', color: '#f59e0b' }]}>Quality Summary</Text>
          <View style={[styles.budgetGrid, { marginTop: 10 }]}>
            <View style={[styles.budgetCard, { backgroundColor: '#fffbeb', borderColor: '#fef3c7' }]}>
              <Text style={[styles.budgetLabel, { color: '#b45309' }]}>Total Issues</Text>
              <Text style={[styles.budgetValue, { color: '#f59e0b' }]}>{summaryData?.qualityTotal || '0'}</Text>
            </View>
            <View style={[styles.budgetCard, { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' }]}>
              <Text style={[styles.budgetLabel, { color: '#166534' }]}>Completed</Text>
              <Text style={[styles.budgetValue, { color: '#10b981' }]}>{summaryData?.qualityCompleted || '0'}</Text>
            </View>
            <View style={[styles.budgetCard, { backgroundColor: '#fff7ed', borderColor: '#ffedd5' }]}>
              <Text style={[styles.budgetLabel, { color: '#c2410c' }]}>Open</Text>
              <Text style={[styles.budgetValue, { color: '#f97316' }]}>{summaryData?.qualityOpen || '0'}</Text>
            </View>
            <View style={[styles.budgetCard, { backgroundColor: '#fef2f2', borderColor: '#fee2e2' }]}>
              <Text style={[styles.budgetLabel, { color: '#991b1b' }]}>Critical</Text>
              <Text style={[styles.budgetValue, { color: '#ef4444' }]}>{summaryData?.qualityCritical || '0'}</Text>
            </View>
          </View>
        </View>
      );
    }

    return null;
  };

  // 7. Render a Landscape Gantt Page
  const renderPdfGanttPage = (chunk, pageIndex, totalPages) => {
    return (
      <Page key={`gantt-page-${pageIndex}`} size="A4" orientation="landscape" style={[styles.ganttPage, { backgroundColor: backgroundColor || '#ffffff' }]}>
        {/* Watermark */}
        {watermarkText ? (
          <Text style={[styles.watermark, { opacity: watermarkOpacity || 0.1 }]} fixed>
            {watermarkText}
          </Text>
        ) : null}

        {/* Landscape Header */}
        <View style={styles.ganttHeader}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View>
              {showProjectName ? (
                <Text style={styles.ganttTitle}>
                  {headerTitle || activeProject?.name || 'Project Dashboard'} — Milestones & Timeline
                </Text>
              ) : (
                <Text style={styles.ganttTitle}>
                  {headerTitle || 'Project Dashboard'} — Milestones & Timeline
                </Text>
              )}
              <Text style={styles.ganttSubtitle}>
                Page {pageIndex} of {totalPages}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              {showGenerationDate && (
                <Text style={{ fontSize: 8, color: '#64748b' }}>Export Date: {dateStr}</Text>
              )}
              {showActiveFilters && activeFiltersStr !== 'None' && (
                <Text style={{ fontSize: 7.5, color: '#64748b', marginTop: 2 }}>Filters: {activeFiltersStr}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Timeline Table */}
        <View style={{ borderStyle: 'solid', borderWidth: 1, borderColor: '#cbd5e1', position: 'relative' }}>
          {/* Table Headers */}
          <View style={{ height: 26, backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#cbd5e1', position: 'relative' }}>
            {/* Top Month Header Row */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 14, flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: '#cbd5e1' }}>
              {months.map((m, idx) => (
                <View 
                  key={`m-${idx}`} 
                  style={{ 
                    position: 'absolute', 
                    left: m.left, 
                    width: m.width, 
                    height: '100%', 
                    borderRightWidth: idx < months.length - 1 ? 0.5 : 0, 
                    borderRightColor: '#cbd5e1', 
                    justifyContent: 'center', 
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: '#475569' }}>{m.label}</Text>
                </View>
              ))}
            </View>
            {/* Bottom Week/Day Row */}
            <View style={{ position: 'absolute', top: 14, left: 0, right: 0, height: 12, flexDirection: 'row' }}>
              {weeks.map((w, idx) => (
                <View 
                  key={`w-${idx}`} 
                  style={{ 
                    position: 'absolute', 
                    left: w.left, 
                    width: w.width, 
                    height: '100%', 
                    borderRightWidth: idx < weeks.length - 1 ? 0.5 : 0, 
                    borderRightColor: '#e2e8f0', 
                    justifyContent: 'center', 
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ fontSize: 5.5, color: '#64748b' }}>{w.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Rows Container */}
          <View style={{ position: 'relative' }}>
            {/* Task Rows */}
            {chunk.length === 0 ? (
              <View style={{ height: 50, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 8, color: '#94a3b8' }}>No milestones found matching the selected filters.</Text>
              </View>
            ) : (
              chunk.map((task, idx) => {
                const isPhase = task.item_type === 'Phase';
                const isMilestone = task.item_type === 'Milestone';

                const taskStart = task.start_date ? new Date(task.start_date).getTime() : timelineStart.getTime();
                const taskEnd = task.end_date ? new Date(task.end_date).getTime() : timelineEnd.getTime();
                
                const leftPct = `${Math.max(0, Math.min(98, ((taskStart - timelineStart.getTime()) / (24 * 60 * 60 * 1000)) / daysBetween * 100))}%`;
                const widthPct = `${Math.max(2, Math.min(100, ((taskEnd - taskStart) / (24 * 60 * 60 * 1000)) / daysBetween * 100))}%`;

                // Resolve status styles & colors
                const statusVal = task.status || 'Not Started';
                const barColor = {
                  'Completed': '#10b981',
                  'In Progress': '#3b82f6',
                  'Delayed': '#ef4444',
                  'Upcoming': '#6366f1',
                  'On Hold': '#f59e0b',
                  'Not Started': '#64748b',
                  'Cancelled': '#94a3b8'
                }[statusVal] || '#64748b';

                return (
                  <View 
                    key={idx} 
                    style={{ 
                      position: 'relative',
                      width: '100%',
                      height: 28, 
                      borderBottomWidth: idx < chunk.length - 1 ? 0.5 : 0, 
                      borderBottomColor: '#cbd5e1', 
                      backgroundColor: isPhase ? '#f8fafc' : '#ffffff' 
                    }}
                    wrap={false}
                  >
                    {/* Inline Text Label (above the bar) */}
                    <Text 
                      style={{ 
                        position: 'absolute',
                        left: leftPct,
                        top: 3,
                        fontSize: 6.5,
                        fontWeight: isPhase ? 'bold' : 'normal',
                        color: isMilestone ? '#6366f1' : '#1e293b',
                        marginLeft: isMilestone ? 8 : 2,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {task.activity_name}
                      {task.complete_percent > 0 ? ` (${Math.round(task.complete_percent)}%)` : ''}
                    </Text>

                    {/* Gantt Bar / Shape (below the text) */}
                    {isMilestone ? (
                      <View 
                        style={{ 
                          position: 'absolute', 
                          left: leftPct, 
                          marginLeft: -3,
                          top: 15,
                          width: 5, 
                          height: 5, 
                          backgroundColor: barColor, 
                          borderWidth: 0.5, 
                          borderColor: '#ffffff',
                          transform: 'rotate(45deg)'
                        }} 
                      />
                    ) : isPhase ? (
                      <View 
                        style={{ 
                          position: 'absolute', 
                          left: leftPct, 
                          width: widthPct, 
                          top: 16,
                          height: 5, 
                          borderRadius: 1, 
                          backgroundColor: barColor 
                        }} 
                      />
                    ) : (
                      <View 
                        style={{ 
                          position: 'absolute', 
                          left: leftPct, 
                          width: widthPct, 
                          top: 16,
                          height: 4, 
                          borderRadius: 2, 
                          backgroundColor: '#e2e8f0', 
                          overflow: 'hidden' 
                        }}
                      >
                        <View style={{ width: `${task.complete_percent || 0}%`, height: '100%', backgroundColor: barColor }} />
                      </View>
                    )}
                  </View>
                );
              })
            )}

            {/* Grid Overlay inside the table content area (rendered over the rows but under the bars) */}
            <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, pointerEvents: 'none' }}>
              {months.map((m, idx) => {
                const leftVal = parseFloat(m.left);
                if (leftVal <= 0.1) return null;
                return (
                  <View 
                    key={`grid-lines-${idx}`} 
                    style={{ 
                      position: 'absolute', 
                      left: `${leftVal}%`, 
                      top: 0, 
                      bottom: 0, 
                      width: 0.5, 
                      backgroundColor: '#cbd5e1' 
                    }} 
                  />
                );
              })}
              {showTodayLine && (
                <View 
                  style={{ 
                    position: 'absolute', 
                    left: todayLeftPct, 
                    top: 0, 
                    bottom: 0, 
                    width: 1, 
                    backgroundColor: '#ef4444', 
                    zIndex: 100 
                  }} 
                />
              )}
            </View>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendColorBox, { backgroundColor: '#10b981' }]} />
            <Text style={styles.legendLabel}>Completed</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColorBox, { backgroundColor: '#3b82f6' }]} />
            <Text style={styles.legendLabel}>In Progress</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColorBox, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendLabel}>Delayed</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColorBox, { backgroundColor: '#6366f1' }]} />
            <Text style={styles.legendLabel}>Upcoming</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColorBox, { backgroundColor: '#f59e0b' }]} />
            <Text style={styles.legendLabel}>On Hold</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendColorBox, { backgroundColor: '#64748b' }]} />
            <Text style={styles.legendLabel}>Not Started</Text>
          </View>
          <View style={[styles.legendItem, { marginLeft: 15 }]}>
            <View style={{ width: 5, height: 5, backgroundColor: '#6366f1', borderWidth: 0.5, borderColor: '#ffffff', transform: 'rotate(45deg)' }} />
            <Text style={styles.legendLabel}>Milestone Diamond</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={{ width: 12, height: 5, borderRadius: 1, backgroundColor: '#334155' }} />
            <Text style={styles.legendLabel}>Phase Summary Bar</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={{ width: 12, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', overflow: 'hidden', flexDirection: 'row' }}>
              <View style={{ width: 6, height: '100%', backgroundColor: '#334155' }} />
            </View>
            <Text style={styles.legendLabel}>Task Progress Bar</Text>
          </View>
          {showTodayLine && (
            <View style={styles.legendItem}>
              <View style={{ width: 12, height: 1, backgroundColor: '#ef4444' }} />
              <Text style={styles.legendLabel}>Today Line</Text>
            </View>
          )}
        </View>

        {/* Landscape Footer */}
        <Text 
          style={[styles.footer, { left: 30, right: 30, bottom: 20 }]} 
          render={({ pageNumber, totalPages }) => (
            `Page ${pageNumber} of ${totalPages}  |  Generated on ${dateStr}  |  ${footerText || 'Project Dashboard Report'}`
          )} 
          fixed 
        />
      </Page>
    );
  };

  return (
    <Document>
      {/* 1. Portrait page(s) for beforeSections */}
      <Page size="A4" style={[styles.page, { backgroundColor: backgroundColor || '#ffffff' }]}>
        {watermarkText ? (
          <Text style={[styles.watermark, { opacity: watermarkOpacity || 0.1 }]} fixed>
            {watermarkText}
          </Text>
        ) : null}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              {showProjectName ? (
                <Text style={[styles.title, { color: '#0f172a' }]}>{headerTitle || activeProject?.name || 'Project Dashboard'}</Text>
              ) : (
                <Text style={[styles.title, { color: '#0f172a' }]}>{headerTitle || 'Project Dashboard'}</Text>
              )}
              <Text style={[styles.subtitle, { textTransform: 'uppercase', letterSpacing: 1, color: '#64748b', fontWeight: 'bold' }]}>{subHeading || 'Executive Dashboard Analytics Report'}</Text>
            </View>
          </View>
          <View style={[styles.headerInfo, { backgroundColor: '#f8fafc', padding: 8, borderRadius: 4, flexWrap: 'wrap', gap: 6 }]}>
            {showGenerationDate && (
              <Text style={styles.infoItem}>Report Date: <Text style={{ fontWeight: 'bold', color: '#1e293b' }}>{dateStr}</Text></Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={styles.infoItem}>SOP Timeline: <Text style={{ fontWeight: 'bold', color: '#0D9488' }}>{sopData?.[0]?.daysToGo || '—'} days to go</Text></Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.infoItem}>Health: </Text>
                <Text style={[styles.statusBadge, { backgroundColor: (sopData?.[0]?.health || 'Green').toLowerCase() === 'green' ? '#d1fae5' : '#fee2e2', color: (sopData?.[0]?.health || 'Green').toLowerCase() === 'green' ? '#065f46' : '#991b1b', borderColor: (sopData?.[0]?.health || 'Green').toLowerCase() === 'green' ? '#34d399' : '#f87171' }]}>
                  {(sopData?.[0]?.health || 'Green').toUpperCase()}
                </Text>
              </View>
            </View>
            {showActiveFilters && activeFiltersStr !== 'None' && (
              <Text style={styles.infoItem}>Active Filters: <Text style={{ fontWeight: 'bold', color: '#1e293b' }}>{activeFiltersStr}</Text></Text>
            )}
          </View>
        </View>

        {/* Render beforeSections */}
        {beforeSections.map(key => renderSectionByKey(key))}

        {/* Footer */}
        <Text 
          style={styles.footer} 
          render={({ pageNumber, totalPages }) => (
            `Page ${pageNumber} of ${totalPages}  |  Generated on ${dateStr}  |  ${footerText || 'Project Dashboard Report'}`
          )} 
          fixed 
        />
      </Page>

      {/* 2. Landscape page(s) for milestones Gantt */}
      {hasMilestonesSection && ganttChunks.map((chunk, index) => 
        renderPdfGanttPage(chunk, index + 1, totalGanttPages)
      )}

      {/* 3. Portrait page(s) for afterSections */}
      {hasMilestonesSection && afterSections.length > 0 && (
        <Page size="A4" style={[styles.page, { backgroundColor: backgroundColor || '#ffffff' }]}>
          {watermarkText ? (
            <Text style={[styles.watermark, { opacity: watermarkOpacity || 0.1 }]} fixed>
              {watermarkText}
            </Text>
          ) : null}

          {/* Render afterSections */}
          {afterSections.map(key => renderSectionByKey(key))}

          {/* Footer */}
          <Text 
            style={styles.footer} 
            render={({ pageNumber, totalPages }) => (
              `Page ${pageNumber} of ${totalPages}  |  Generated on ${dateStr}  |  ${footerText || 'Project Dashboard Report'}`
            )} 
            fixed 
          />
        </Page>
      )}
    </Document>
  );
};

export default ReportDocument;
