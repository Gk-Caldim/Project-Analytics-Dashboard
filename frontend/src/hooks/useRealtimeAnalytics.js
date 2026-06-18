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
} from '../api/dashboard';

const REFETCH_INTERVAL = 30_000; // 30 s — same as app health check
const STALE_TIME      = 0;       // always treat as stale so data is fresh on tab switch

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

  // ── 3. Project Structures (site operations tab) ──
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

  // ── 4. Employees (workforce tab) ──
  const {
    data: employees = [],
    isLoading: employeesLoading,
    isError: employeesError,
    refetch: refetchEmployees,
  } = useQuery({
    queryKey: ['ah_employees'],
    queryFn: getEmployees,
    staleTime: STALE_TIME,
    refetchInterval: 60_000, // employees change less often
    retry: 2,
  });

  // ── 5. All Issues (issues & NCR tab + compliance) ──
  const {
    data: allIssues = [],
    isLoading: issuesLoading,
    isError: issuesError,
    refetch: refetchIssues,
  } = useQuery({
    queryKey: ['ah_allIssues'],
    queryFn: () => getAllIssues(),
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
    refetchInterval: 60_000,
    retry: 2,
  });

  // ── WebSocket push invalidation ──
  // Listens to the same custom events dispatched by App.jsx's WebSocket handler
  useEffect(() => {
    const handleIssueSync = () => {
      queryClient.invalidateQueries({ queryKey: ['ah_allIssues'] });
      queryClient.invalidateQueries({ queryKey: ['ah_projectsSummary'] });
      queryClient.invalidateQueries({ queryKey: ['ah_summaryAnalytics'] });
    };
    const handleMomSaved = () => {
      queryClient.invalidateQueries({ queryKey: ['ah_allIssues'] });
    };

    window.addEventListener('ISSUE_SYNCED', handleIssueSync);
    window.addEventListener('MOM_SAVED', handleMomSaved);
    return () => {
      window.removeEventListener('ISSUE_SYNCED', handleIssueSync);
      window.removeEventListener('MOM_SAVED', handleMomSaved);
    };
  }, [queryClient]);

  // ── Master refresh helper (used by the refresh button in the UI) ──
  const refetchAll = () => {
    refetchSummary();
    refetchAnalytics();
    refetchStructures();
    refetchIssues();
    refetchEmployees();
    refetchBudget();
  };

  const isLoading = summaryLoading || analyticsLoading || structuresLoading;
  const isError   = summaryError   || analyticsError   || structuresError;
  const lastUpdated = summaryUpdatedAt ? new Date(summaryUpdatedAt) : null;

  return {
    // Data
    projectsSummary,
    analyticsData,
    structures,
    employees,
    allIssues,
    budgetRevisions,

    // Loading states (per-slice for granular skeletons)
    summaryLoading,
    analyticsLoading,
    structuresLoading,
    employeesLoading,
    issuesLoading,
    budgetLoading,

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
  };
}
