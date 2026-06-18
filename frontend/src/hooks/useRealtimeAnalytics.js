/**
 * useRealtimeAnalytics.js
 *
 * Central real-time data hook for the Analytics Hub.
 * - Uses React Query for initial fetch + 30-second background refresh
 * - Listens to the existing app WebSocket (ISSUE_SYNCED, MOM_SAVED events)
 *   and invalidates relevant query keys on push events
 * - Follows the same auth pattern as ProjectDashboard.jsx
 *   (API client already attaches JWT from Redux via axios interceptor)
 */
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getDashboardSummary,
  getDashboardSummaryAnalytics,
  getProjectStructures,
  getEmployees,
  getAllIssues,
  getBudgetRevisions,
  getOverviewKpis,
  getSupplyChainAnalytics,
  getEnrichedIssues,
  getTrackersAnalytics,
  getWorkforceEnriched,
} from '../api/dashboard';

const REFETCH_INTERVAL = 30_000; // 30 s — same as app health check
const STALE_TIME      = 0;       // always treat as stale so data is fresh on tab switch
const SLOW_INTERVAL   = 60_000;  // 60 s for heavier queries

export function useRealtimeAnalytics() {
  const queryClient = useQueryClient();

  // ── 1. Portfolio Summary (feeds PortfolioHealthMatrix & Overview KPIs) ──
  const {
    data: projectsSummary = [],
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
    dataUpdatedAt: summaryUpdatedAt,
  } = useQuery({
    queryKey: ['ah_projectsSummary'],
    queryFn: getDashboardSummary,
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    retry: 2,
  });

  // ── 2. Summary Analytics (dept breakdown, resource utilization, status pie) ──
  const {
    data: analyticsData = null,
    isLoading: analyticsLoading,
    isError: analyticsError,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ['ah_summaryAnalytics'],
    queryFn: getDashboardSummaryAnalytics,
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    retry: 2,
  });

  // ── 3. Project Structures (used by overview budget map) ──
  const {
    data: structures = [],
    isLoading: structuresLoading,
    isError: structuresError,
    refetch: refetchStructures,
  } = useQuery({
    queryKey: ['ah_structures'],
    queryFn: getProjectStructures,
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    retry: 2,
  });

  // ── 4. Employees (workforce tab — legacy, kept for compatibility) ──
  const {
    data: employees = [],
    isLoading: employeesLoading,
    isError: employeesError,
    refetch: refetchEmployees,
  } = useQuery({
    queryKey: ['ah_employees'],
    queryFn: getEmployees,
    staleTime: STALE_TIME,
    refetchInterval: SLOW_INTERVAL,
    retry: 2,
  });

  // ── 5. Enriched Issues (real project names via DB join) ──
  const {
    data: allIssues = [],
    isLoading: issuesLoading,
    isError: issuesError,
    refetch: refetchIssues,
  } = useQuery({
    queryKey: ['ah_allIssues'],
    queryFn: getEnrichedIssues,
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    retry: 2,
  });

  // ── 6. Budget Revisions (overview spend card) ──
  const {
    data: budgetRevisions = [],
    isLoading: budgetLoading,
    isError: budgetError,
    refetch: refetchBudget,
  } = useQuery({
    queryKey: ['ah_budgetRevisions'],
    queryFn: getBudgetRevisions,
    staleTime: STALE_TIME,
    refetchInterval: SLOW_INTERVAL,
    retry: 2,
  });

  // ── 7. Overview KPIs (5 real metrics) ──
  const {
    data: overviewKpis = null,
    isLoading: overviewKpisLoading,
    isError: overviewKpisError,
    refetch: refetchOverviewKpis,
  } = useQuery({
    queryKey: ['ah_overviewKpis'],
    queryFn: getOverviewKpis,
    staleTime: STALE_TIME,
    refetchInterval: REFETCH_INTERVAL,
    retry: 2,
  });

  // ── 8. Supply Chain Analytics (from budget JSONB) ──
  const {
    data: supplyChainData = null,
    isLoading: supplyChainLoading,
    isError: supplyChainError,
    refetch: refetchSupplyChain,
  } = useQuery({
    queryKey: ['ah_supplyChain'],
    queryFn: getSupplyChainAnalytics,
    staleTime: STALE_TIME,
    refetchInterval: SLOW_INTERVAL,
    retry: 2,
  });

  // ── 9. Trackers Analytics (Upload metadata, excludes drafts) ──
  const {
    data: trackersAnalytics = null,
    isLoading: trackersLoading,
    isError: trackersError,
    refetch: refetchTrackers,
  } = useQuery({
    queryKey: ['ah_trackersAnalytics'],
    queryFn: getTrackersAnalytics,
    staleTime: STALE_TIME,
    refetchInterval: SLOW_INTERVAL,
    retry: 2,
  });

  // ── 10. Workforce Enriched (employees + allocations) ──
  const {
    data: workforceData = null,
    isLoading: workforceLoading,
    isError: workforceError,
    refetch: refetchWorkforce,
  } = useQuery({
    queryKey: ['ah_workforceEnriched'],
    queryFn: getWorkforceEnriched,
    staleTime: STALE_TIME,
    refetchInterval: SLOW_INTERVAL,
    retry: 2,
  });

  // ── WebSocket push invalidation ──
  useEffect(() => {
    const handleIssueSync = () => {
      queryClient.invalidateQueries({ queryKey: ['ah_allIssues'] });
      queryClient.invalidateQueries({ queryKey: ['ah_projectsSummary'] });
      queryClient.invalidateQueries({ queryKey: ['ah_summaryAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['ah_overviewKpis'] });
    };
    const handleMomSaved = () => {
      queryClient.invalidateQueries({ queryKey: ['ah_allIssues'] });
      queryClient.invalidateQueries({ queryKey: ['ah_overviewKpis'] });
    };

    window.addEventListener('ISSUE_SYNCED', handleIssueSync);
    window.addEventListener('MOM_SAVED', handleMomSaved);
    return () => {
      window.removeEventListener('ISSUE_SYNCED', handleIssueSync);
      window.removeEventListener('MOM_SAVED', handleMomSaved);
    };
  }, [queryClient]);

  // ── Master refresh helper ──
  const refetchAll = () => {
    refetchSummary();
    refetchAnalytics();
    refetchStructures();
    refetchIssues();
    refetchEmployees();
    refetchBudget();
    refetchOverviewKpis();
    refetchSupplyChain();
    refetchTrackers();
    refetchWorkforce();
  };

  const isLoading = summaryLoading || analyticsLoading || structuresLoading;
  const isError   = summaryError   || analyticsError   || structuresError;
  const lastUpdated = summaryUpdatedAt ? new Date(summaryUpdatedAt) : null;

  return {
    // Original data
    projectsSummary,
    analyticsData,
    structures,
    employees,
    allIssues,
    budgetRevisions,

    // New enriched data
    overviewKpis,
    supplyChainData,
    trackersAnalytics,
    workforceData,

    // Loading states
    summaryLoading,
    analyticsLoading,
    structuresLoading,
    employeesLoading,
    issuesLoading,
    budgetLoading,
    overviewKpisLoading,
    supplyChainLoading,
    trackersLoading,
    workforceLoading,

    // Convenience
    isLoading,
    isError,
    lastUpdated,

    // Refetch
    refetchAll,
    refetchSummary,
    refetchAnalytics,
    refetchStructures,
    refetchIssues,
    refetchEmployees,
    refetchBudget,
    refetchOverviewKpis,
    refetchSupplyChain,
    refetchTrackers,
    refetchWorkforce,
  };
}
