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


const renderPdfGantt = (optimizedMilestones) => {
  if (!optimizedMilestones || optimizedMilestones.length === 0) return null;

  // Find timeline range
  let minTime = null;
  let maxTime = null;
  optimizedMilestones.forEach(t => {
    if (t.start_date) {
      const d = new Date(t.start_date).getTime();
      if (!minTime || d < minTime) minTime = d;
    }
    if (t.end_date) {
      const d = new Date(t.end_date).getTime();
      if (!maxTime || d > maxTime) maxTime = d;
    }
  });

  if (!minTime) minTime = Date.now();
  if (!maxTime) maxTime = Date.now() + 30 * 24 * 60 * 60 * 1000;

  // Pad by 7 days start, 14 days end
  const timelineStart = new Date(minTime - 7 * 24 * 60 * 60 * 1000);
  const timelineEnd = new Date(maxTime + 14 * 24 * 60 * 60 * 1000);
  const totalDays = Math.ceil((timelineEnd - timelineStart) / (24 * 60 * 60 * 1000)) || 1;

  // Compute month headers
  const months = [];
  const tempDate = new Date(timelineStart);
  while (tempDate <= timelineEnd) {
    const mLabel = tempDate.toLocaleDateString('en-US', { month: 'short' });
    const year = tempDate.getFullYear();
    months.push({
      month: tempDate.getMonth(),
      year: year,
      label: `${mLabel} ${year}`,
      firstDay: new Date(year, tempDate.getMonth(), 1)
    });
    tempDate.setMonth(tempDate.getMonth() + 1);
    tempDate.setDate(1);
  }

  const monthHeaders = months.map((m, idx) => {
    const nextMonthFirstDay = new Date(m.year, m.month + 1, 1);
    const start = Math.max(timelineStart.getTime(), m.firstDay.getTime());
    const end = Math.min(timelineEnd.getTime(), nextMonthFirstDay.getTime());
    const startPct = ((start - timelineStart.getTime()) / (24 * 60 * 60 * 1000)) / totalDays * 100;
    const endPct = ((end - timelineStart.getTime()) / (24 * 60 * 60 * 1000)) / totalDays * 100;
    return {
      label: m.label,
      left: `${startPct}%`,
      width: `${endPct - startPct}%`
    };
  });

  return (
    <View style={{ borderStyle: 'solid', borderWidth: 1, borderColor: '#cbd5e1', marginTop: 10 }}>
      {/* Month Headers */}
      <View style={{ flexDirection: 'row', height: 18, backgroundColor: '#f1f5f9', borderBottomWidth: 1, borderBottomColor: '#cbd5e1', position: 'relative' }}>
        <View style={{ width: '40%', borderRightWidth: 1, borderRightColor: '#cbd5e1', justifyContent: 'center', paddingLeft: 6 }}>
          <Text style={{ fontSize: 7, fontWeight: 'bold', color: '#475569' }}>WBS Activity Name</Text>
        </View>
        <View style={{ width: '60%', height: '100%', position: 'relative' }}>
          {monthHeaders.map((mh, idx) => (
            <View 
              key={idx} 
              style={{ 
                position: 'absolute', 
                left: mh.left, 
                width: mh.width, 
                height: '100%', 
                borderRightWidth: 1, 
                borderRightColor: '#cbd5e1', 
                justifyContent: 'center', 
                paddingLeft: 4 
              }}
            >
              <Text style={{ fontSize: 6.5, fontWeight: 'bold', color: '#475569' }}>{mh.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Task Rows */}
      {optimizedMilestones.map((task, idx) => {
        const isPhase = task.item_type === 'Phase';
        const isMilestone = task.item_type === 'Milestone';
        const indent = (task.indent_level || 0) * 8;

        const taskStart = task.start_date ? new Date(task.start_date).getTime() : timelineStart.getTime();
        const taskEnd = task.end_date ? new Date(task.end_date).getTime() : timelineEnd.getTime();
        
        const leftPct = `${Math.max(0, Math.min(98, ((taskStart - timelineStart.getTime()) / (24 * 60 * 60 * 1000)) / totalDays * 100))}%`;
        const widthPct = `${Math.max(2, Math.min(100, ((taskEnd - taskStart) / (24 * 60 * 60 * 1000)) / totalDays * 100))}%`;

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
              flexDirection: 'row', 
              borderBottomWidth: 1, 
              borderBottomColor: '#e2e8f0', 
              minHeight: 18, 
              alignItems: 'center', 
              backgroundColor: isPhase ? '#f8fafc' : '#ffffff' 
            }}
            wrap={false}
          >
            {/* Task Label */}
            <View 
              style={{ 
                width: '40%', 
                paddingLeft: 6 + indent, 
                borderRightWidth: 1, 
                borderRightColor: '#e2e8f0', 
                justifyContent: 'center',
                paddingVertical: 3
              }}
            >
              <Text style={{ fontSize: 6.5, fontWeight: isPhase ? 'bold' : 'normal', color: isMilestone ? '#6366f1' : '#334155' }}>
                {task.wbs_code} {task.activity_name}
              </Text>
            </View>

            {/* Gantt Bar */}
            <View style={{ width: '60%', height: '100%', position: 'relative', justifyContent: 'center' }}>
              {isMilestone ? (
                // Circle marker for milestone
                <View 
                  style={{ 
                    position: 'absolute', 
                    left: leftPct, 
                    width: 6, 
                    height: 6, 
                    borderRadius: 3, 
                    backgroundColor: barColor, 
                    borderWidth: 1, 
                    borderColor: '#ffffff' 
                  }} 
                />
              ) : isPhase ? (
                // Solid block for phase
                <View 
                  style={{ 
                    position: 'absolute', 
                    left: leftPct, 
                    width: widthPct, 
                    height: 5, 
                    borderRadius: 1, 
                    backgroundColor: barColor 
                  }} 
                />
              ) : (
                // Progress bar for standard task
                <View 
                  style={{ 
                    position: 'absolute', 
                    left: leftPct, 
                    width: widthPct, 
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
          </View>
        );
      })}
    </View>
  );
};


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
  watermarkOpacity
}) => {
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <Document>
      <Page size="A4" style={[styles.page, { backgroundColor: backgroundColor || '#ffffff' }]}>
        {/* Watermark */}
        {watermarkText ? (
          <Text style={[styles.watermark, { opacity: watermarkOpacity || 0.1 }]} fixed>
            {watermarkText}
          </Text>
        ) : null}

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.title, { color: '#0f172a' }]}>{headerTitle || activeProject?.name || 'Project Dashboard'}</Text>
              <Text style={[styles.subtitle, { textTransform: 'uppercase', letterSpacing: 1, color: '#64748b', fontWeight: 'bold' }]}>{subHeading || 'Executive Dashboard Analytics Report'}</Text>
            </View>
          </View>
          <View style={[styles.headerInfo, { backgroundColor: '#f8fafc', padding: 8, borderRadius: 4 }]}>
            <Text style={styles.infoItem}>Report Date: <Text style={{ fontWeight: 'bold', color: '#1e293b' }}>{dateStr}</Text></Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={styles.infoItem}>SOP Timeline: <Text style={{ fontWeight: 'bold', color: '#0D9488' }}>{sopData?.[0]?.daysToGo || '—'} days to go</Text></Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={styles.infoItem}>Health: </Text>
                <Text style={[styles.statusBadge, { backgroundColor: (sopData?.[0]?.health || 'Green').toLowerCase() === 'green' ? '#d1fae5' : '#fee2e2', color: (sopData?.[0]?.health || 'Green').toLowerCase() === 'green' ? '#065f46' : '#991b1b', borderColor: (sopData?.[0]?.health || 'Green').toLowerCase() === 'green' ? '#34d399' : '#f87171' }]}>
                  {(sopData?.[0]?.health || 'Green').toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        </View>


        {/* Content Sections based on sectionOrder */}
        {[...new Set(sectionOrder)].map((key) => {
          // 1. Milestones
          if (key === 'milestones' && visibleSections?.milestones && milestones?.length > 0) {
            const optimizedMilestones = milestones.filter(task => task.item_type === 'Phase' || task.item_type === 'Milestone');
            return (
              <View key={key} style={styles.section}>
                <Text style={[styles.sectionTitle, { borderBottomColor: '#6366f1', color: '#6366f1' }]}>Project Milestones & Timeline</Text>
                {renderPdfGantt(optimizedMilestones)}
              </View>
            );
          }

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
        })}

        {/* Footer */}
        <Text 
          style={styles.footer} 
          render={({ pageNumber, totalPages }) => (
            `Page ${pageNumber} of ${totalPages}  |  Generated on ${dateStr}  |  ${footerText || 'Project Dashboard Report'}`
          )} 
          fixed 
        />
      </Page>
    </Document>
  );
};

export default ReportDocument;
