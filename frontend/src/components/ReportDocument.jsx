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
    backgroundColor: '#1e3a5f',
    color: '#ffffff',
    padding: '6 10',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 0,
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
              <Text style={styles.title}>{activeProject?.name || 'Project Dashboard'}</Text>
              <Text style={styles.subtitle}>Industrial Analytics Platform — Dashboard Report</Text>
            </View>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.infoItem}>Report Date: <Text style={{ fontWeight: 'bold' }}>{dateStr}</Text></Text>
            <Text style={styles.infoItem}>SOP Date: <Text style={styles.infoLabel}>{sopData?.[0]?.daysToGo || '—'} days to go</Text></Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={styles.infoItem}>Status: </Text>
              <Text style={styles.statusBadge}>{sopData?.[0]?.status || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Content Sections based on sectionOrder */}
        {sectionOrder.map((key) => {
          // 1. Milestones
          if (key === 'milestones' && visibleSections?.milestones && milestones?.length > 0) {
            return (
              <View key={key} style={styles.section} wrap={false}>
                <Text style={styles.sectionTitle}>Milestone Progress Tracker</Text>
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

          // 2. MOM Issues
          if (key === 'criticalIssues' && visibleSections?.criticalIssues && criticalIssues?.length > 0) {
            return (
              <View key={key} style={styles.section} wrap={false}>
                <Text style={styles.sectionTitle}>MOM Issues Summary</Text>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={[styles.tableCellHeader, { width: '8%' }]}>S.No</Text>
                    <Text style={[styles.tableCellHeader, { width: '40%' }]}>Issue</Text>
                    <Text style={[styles.tableCellHeader, { width: '20%' }]}>Owner</Text>
                    <Text style={[styles.tableCellHeader, { width: '17%' }]}>Priority</Text>
                    <Text style={[styles.tableCellHeader, { width: '15%' }]}>Status</Text>
                  </View>
                  {criticalIssues.map((issue, idx) => {
                    const isClosed = issue.status === 'Closed' || issue.status === 'Done' || issue.status === 'Resolved';
                    const isHigh = issue.priority === 'High' || issue.priority === 'Critical';
                    return (
                      <View key={idx} style={styles.tableRow}>
                        <Text style={[styles.tableCell, { width: '8%', fontWeight: 'bold' }]}>{idx + 1}</Text>
                        <Text style={[styles.tableCell, { width: '40%', color: '#1e3a5f' }]}>{issue.title || issue.issue}</Text>
                        <Text style={[styles.tableCell, { width: '20%' }]}>{issue.owner || issue.responsibility}</Text>
                        <View style={[styles.tableCell, { width: '17%' }]}>
                          <Text style={[styles.statusPill, { 
                            backgroundColor: isHigh ? '#fee2e2' : '#fef3c7', 
                            color: isHigh ? '#991b1b' : '#92400e' 
                          }]}>{issue.priority}</Text>
                        </View>
                        <View style={[styles.tableCell, { width: '15%' }]}>
                          <Text style={[styles.statusPill, { 
                            backgroundColor: isClosed ? '#d1fae5' : '#fff7ed', 
                            color: isClosed ? '#065f46' : '#9a3412' 
                          }]}>{issue.status}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          }

          // 3. Budget Summary
          if (key === 'budget' && visibleSections?.budget) {
            return (
              <View key={key} style={styles.section} wrap={false}>
                <View style={[styles.sectionTitle, { flexDirection: 'row', justifyContent: 'space-between' }]}>
                  <Text>Budget Summary</Text>
                  <Text style={{ fontSize: 9, fontWeight: 'normal' }}>Status: {budgetStatus}</Text>
                </View>
                {budgetTableData && budgetTableData.length > 1 ? (
                  <View style={styles.table}>
                    <View style={styles.tableHeader}>
                      {budgetTableData[0].map((h, i) => (
                        <Text key={i} style={[styles.tableCellHeader, { flex: 1 }]}>{h}</Text>
                      ))}
                    </View>
                    {budgetTableData.slice(1).map((row, idx) => {
                      const isTotal = row[0] && row[0].toString().startsWith('Total');
                      const isCategory = row[0] && (row[0] === 'CAPEX' || row[0] === 'Revenue');
                      return (
                        <View key={idx} style={[styles.tableRow, isTotal && { backgroundColor: '#f0f7ff' }]}>
                          {row.map((cell, colIdx) => (
                            <Text key={colIdx} style={[
                              styles.tableCell, 
                              { flex: 1 }, 
                              (isTotal || isCategory) && { fontWeight: 'bold' },
                              isTotal && { color: '#1e3a5f' }
                            ]}>
                              {budgetCurrency && colIdx > 1 && cell !== '' && !isNaN(Number(cell)) ? `${budgetCurrency}${Number(cell).toLocaleString()}` : cell}
                            </Text>
                          ))}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={{ padding: 10, textAlign: 'center', color: '#64748b', borderWidth: 1, borderColor: '#e2e8f0', fontSize: 9 }}>No budget data available</Text>
                )}
              </View>
            );
          }

          // 4. Charts (Metrics Summary)
          if (key === 'charts' && visibleSections?.metricsSummary && visiblePhaseList?.length > 0) {
            return (
              <View key={key} style={styles.section}>
                <Text style={[styles.sectionTitle, { marginBottom: 10 }]}>Project Metrics Summary</Text>
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
