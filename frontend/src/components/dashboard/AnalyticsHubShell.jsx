/**
 * AnalyticsHubShell.jsx
 *
 * The main Analytics Hub container — lives inside the existing ProjectDashboard
 * sidebar structure as module ID 'analytics-hub'.
 *
 * Features:
 *  - Tab bar: Overview | Site Operations | Workforce | Issues & NCR | Compliance
 *  - Live-sync badge showing last updated time (from useRealtimeAnalytics hook)
 *  - Refresh button
 *  - All data from real backend (no mocks)
 *  - Isolated CSS via dashboard.css (not index.css)
 */
import React, { useState, useEffect } from 'react';
import '../../styles/dashboard.css';
import { useRealtimeAnalytics } from '../../hooks/useRealtimeAnalytics';
import OverviewTab       from './analytics/OverviewTab';
import SiteOperationsTab from './analytics/SiteOperationsTab';
import WorkforceTab      from './analytics/WorkforceTab';
import IssuesTab         from './analytics/IssuesTab';
import ComplianceTab     from './analytics/ComplianceTab';
import ProcurementTab    from './analytics/ProcurementTab';
import {
  LayoutDashboard,
  MapPin,
  Users,
  AlertCircle,
  Shield,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

// ── Tabs config ──────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',        label: 'Overview',        Icon: LayoutDashboard },
  { id: 'site-operations', label: 'Site Operations',  Icon: MapPin },
  { id: 'procurement',     label: 'Procurement',      Icon: ShoppingBag },
  { id: 'workforce',       label: 'Workforce',        Icon: Users },
  { id: 'issues',          label: 'Issues & NCR',     Icon: AlertCircle },
  { id: 'compliance',      label: 'Compliance',        Icon: Shield },
];

// ── Live Sync Badge ───────────────────────────────────────────────────────────
function LiveSyncBadge({ lastUpdated, isLoading, onRefresh }) {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    if (!lastUpdated) return;
    const update = () => {
      const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      if (diff < 10)  { setTimeAgo('just now'); return; }
      if (diff < 60)  { setTimeAgo(`${diff}s ago`); return; }
      if (diff < 3600){ setTimeAgo(`${Math.floor(diff / 60)}m ago`); return; }
      setTimeAgo(lastUpdated.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const t = setInterval(update, 10_000);
    return () => clearInterval(t);
  }, [lastUpdated]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto', flexShrink: 0 }}>
      {lastUpdated && (
        <span className="ah-live-badge">
          <span className="ah-live-dot" />
          Live{timeAgo ? ` · ${timeAgo}` : ''}
        </span>
      )}
      <button
        onClick={onRefresh}
        disabled={isLoading}
        title="Refresh all data"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 30, height: 30, border: '1px solid var(--ah-border)',
          borderRadius: 8, background: 'var(--ah-card)', cursor: isLoading ? 'not-allowed' : 'pointer',
          color: 'var(--ah-text-secondary)', transition: 'all 0.15s',
        }}
      >
        <RefreshCw size={13} style={{ animation: isLoading ? 'ah-pulse 0.8s ease-in-out infinite' : 'none' }} />
      </button>
    </div>
  );
}

// ── Main Shell ────────────────────────────────────────────────────────────────
export default function AnalyticsHubShell({ onProjectSelect }) {
  const [activeTab, setActiveTab] = useState('overview');
  const { themeSettings } = useTheme();
  const isDark = themeSettings?.displayMode === 'dark';

  const {
    projectsSummary, analyticsData, structures,
    employees, allIssues, budgetRevisions,
    summaryLoading, analyticsLoading, structuresLoading,
    employeesLoading, issuesLoading, budgetLoading,
    isLoading, isError, lastUpdated,
    refetchAll, refetchStructures, refetchEmployees, refetchIssues,
  } = useRealtimeAnalytics();

  return (
    <div className={`ah-shell${isDark ? ' dark' : ''}`}>
      {/* ── Tab Bar ── */}
      <div className="ah-tabbar">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            id={`analytics-tab-${id}`}
            className={`ah-tab-btn${activeTab === id ? ' active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={14} strokeWidth={2} />
            {label}
          </button>
        ))}
        <LiveSyncBadge lastUpdated={lastUpdated} isLoading={isLoading} onRefresh={refetchAll} />
      </div>

      {/* ── Content Area ── */}
      <div className="ah-content">
        {activeTab === 'overview' && (
          <OverviewTab
            projectsSummary={projectsSummary}
            analyticsData={analyticsData}
            structures={structures}
            allIssues={allIssues}
            budgetRevisions={budgetRevisions}
            summaryLoading={summaryLoading}
            analyticsLoading={analyticsLoading}
            isError={isError}
            refetchAll={refetchAll}
            onProjectSelect={onProjectSelect}
          />
        )}
        {activeTab === 'site-operations' && (
          <SiteOperationsTab
            structures={structures}
            projectsSummary={projectsSummary}
            structuresLoading={structuresLoading}
            isError={isError}
            refetchStructures={refetchStructures}
          />
        )}
        {activeTab === 'procurement' && (
          <ProcurementTab />
        )}
        {activeTab === 'workforce' && (
          <WorkforceTab
            employees={employees}
            analyticsData={analyticsData}
            employeesLoading={employeesLoading}
            analyticsLoading={analyticsLoading}
            isError={isError}
            refetchEmployees={refetchEmployees}
          />
        )}
        {activeTab === 'issues' && (
          <IssuesTab
            allIssues={allIssues}
            issuesLoading={issuesLoading}
            isError={isError}
            refetchIssues={refetchIssues}
          />
        )}
        {activeTab === 'compliance' && (
          <ComplianceTab
            allIssues={allIssues}
            structures={structures}
            analyticsData={analyticsData}
            issuesLoading={issuesLoading}
            isError={isError}
            refetchAll={refetchAll}
          />
        )}
      </div>
    </div>
  );
}
