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
    marginBottom: 20,
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
    width: 'auto',
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
  sectionOrder
}) => {
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.title, { color: '#0f172a' }]}>{activeProject?.name || 'Project Dashboard'}</Text>
              <Text style={[styles.subtitle, { textTransform: 'uppercase', letterSpacing: 1, color: '#64748b', fontWeight: 'bold' }]}>Executive Dashboard Analytics Report</Text>
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
        {sectionOrder.map((key) => {
          // 1. Milestones
          if (key === 'milestones' && visibleSections?.milestones && milestones?.length > 0) {
            return (
              <View key={key} style={styles.section} wrap={false}>
                <Text style={[styles.sectionTitle, { borderBottomColor: '#1e3a5f', color: '#1e3a5f' }]}>Milestone Progress Tracker</Text>

                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableCellHeader, { width: '20%' }]}>Module</Text>
                    <Text style={[styles.tableCellHeader, { width: '30%' }]}>Milestone</Text>
                    <Text style={[styles.tableCellHeader, { width: '15%' }]}>Planned</Text>
                    <Text style={[styles.tableCellHeader, { width: '15%' }]}>Actual</Text>
                    <Text style={[styles.tableCellHeader, { width: '20%' }]}>Status</Text>
                  </View>
                  {milestones.map((m, idx) => {
                    const isDelayed = String(m.status).toLowerCase().includes('delay');
                    return (
                      <View key={idx} style={styles.tableRow}>
                        <Text style={[styles.tableCell, { width: '20%', fontWeight: 'bold' }]}>{m.module || 'General'}</Text>
                        <Text style={[styles.tableCell, { width: '30%' }]}>{m.milestone}</Text>
                        <Text style={[styles.tableCell, { width: '15%' }]}>{m.planned_date || '-'}</Text>
                        <Text style={[styles.tableCell, { width: '15%' }]}>{m.actual_date || '-'}</Text>
                        <View style={[styles.tableCell, { width: '20%' }]}>
                          <Text style={[styles.statusPill, { 
                            backgroundColor: isDelayed ? '#fee2e2' : '#d1fae5', 
                            color: isDelayed ? '#991b1b' : '#065f46' 
                          }]}>{m.status}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
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
              <View key={key} style={styles.section} wrap={false}>
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
                          {issue.description && issue.description !== issue.title && (
                            <Text style={{ fontSize: 7, color: '#64748b' }}>{issue.description}</Text>
                          )}
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
            return (
              <View key={key} style={styles.section}>
                <Text style={[styles.sectionTitle, { marginBottom: 10, borderBottomColor: '#1e3a5f', color: '#1e3a5f' }]}>Project Metrics Summary</Text>
                <View style={styles.chartGrid}>
                  {visiblePhaseList.map(phase => (
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
                </View>
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
            `Page ${pageNumber} of ${totalPages}  |  Generated on ${dateStr}  |  Project Dashboard Report`
          )} 
          fixed 
        />
      </Page>
    </Document>
  );
};

export default ReportDocument;
