import React, { useState, useMemo } from 'react';
import { Users, AlertCircle, CheckCircle, Clock, RefreshCw, BarChart3, CornerDownRight, Save } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import API from '../../utils/api';
import { toast } from 'react-hot-toast';

const ResourceManagementCenter = ({
  projectTeam = [],     // API: /projects/{id}/team
  employees = [],       // Full list of employees
  projectId = null,
  onRefresh = () => {}
}) => {
  const [selectedMember, setSelectedMember] = useState(null);
  const [newAllocation, setNewAllocation] = useState(100);
  const [actionLoading, setActionLoading] = useState(false);

  const handleUpdateAllocation = async () => {
    if (!selectedMember || !projectId) return;
    setActionLoading(true);
    try {
      await API.put(`/projects/${projectId}/team/${selectedMember.employee_id}`, { allocation_percentage: parseFloat(newAllocation) });
      toast.success('Resource allocation updated');
      setSelectedMember(null);
      onRefresh();
    } catch (e) {
      toast.error('Failed to adjust resource allocation');
    } finally {
      setActionLoading(false);
    }
  };

  const getLoadBadge = (pct) => {
    if (pct > 100) return 'bg-[var(--red)]/10 border-[var(--red)]/20 text-[var(--red)] font-extrabold';
    if (pct < 50) return 'bg-[var(--blue)]/10 border-[var(--blue)]/20 text-[var(--blue)]';
    return 'bg-[var(--green)]/10 border-[var(--green)]/20 text-[var(--green)]';
  };

  // ── Analytics ──────────────────────────────────────────────────────────
  const allocationBarOption = useMemo(() => {
    if (projectTeam.length === 0) return {};
    const sorted = [...projectTeam].sort((a, b) => (b.allocation_percentage || 100) - (a.allocation_percentage || 100));
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: 'var(--surface)', borderColor: 'var(--border-strong)', textStyle: { color: 'var(--text-primary)', fontSize: 11, fontFamily: 'Inter, sans-serif' }, formatter: p => `${p[0].name}<br/>Load: <b>${p[0].value}%</b>` },
      grid: { left: 8, right: 16, top: 4, bottom: 4, containLabel: true },
      xAxis: { type: 'value', max: 150, axisLabel: { color: 'var(--text-secondary)', fontSize: 9, formatter: v => `${v}%`, fontFamily: 'Inter, sans-serif' }, splitLine: { lineStyle: { color: 'var(--border-subtle)', type: 'dashed' } }, axisLine: { show: false } },
      yAxis: { type: 'category', data: sorted.map(m => m.name?.split(' ')[0] || `Member`), axisLabel: { color: 'var(--text-secondary)', fontSize: 9, fontFamily: 'Inter, sans-serif', width: 60, overflow: 'truncate' }, axisLine: { show: false }, axisTick: { show: false } },
      series: [{
        type: 'bar', barMaxWidth: 14,
        markLine: { data: [{ xAxis: 100, lineStyle: { color: '#f59e0b', type: 'dashed', width: 1.5 }, label: { formatter: '100%', fontSize: 9, color: '#f59e0b', fontFamily: 'Inter, sans-serif' } }], symbol: 'none' },
        data: sorted.map(m => {
          const pct = m.allocation_percentage || 100;
          return { value: pct, itemStyle: { color: pct > 100 ? '#ef4444' : pct < 50 ? '#6366f1' : '#10b981', borderRadius: [0, 3, 3, 0] } };
        })
      }]
    };
  }, [projectTeam]);

  const overloadedCount = projectTeam.filter(m => (m.allocation_percentage || 100) > 100).length;
  const underutilizedCount = projectTeam.filter(m => (m.allocation_percentage || 100) < 50).length;
  const avgLoad = projectTeam.length > 0 ? Math.round(projectTeam.reduce((a, m) => a + (m.allocation_percentage || 100), 0) / projectTeam.length) : 0;

  return (
    <div className="w-full bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg overflow-hidden flex flex-col shadow-sm">
      <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--elevated-card)]/50 flex justify-between items-center">
        <h3 className="m-0 text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
          <Users size={13} className="text-[var(--blue)]" /> Resource Management Center
        </h3>
        <span className="text-[9px] font-semibold text-[var(--text-muted)] bg-[var(--bg)] px-2 py-0.5 rounded border border-[var(--border-subtle)]">Operational Allocation</span>
      </div>

      {/* KPI Strip */}
      {projectTeam.length > 0 && (
        <div className="grid grid-cols-3 gap-0 border-b border-[var(--border-subtle)] divide-x divide-[var(--border-subtle)]">
          {[
            { label: 'Team Members', value: projectTeam.length, color: 'text-[var(--text-primary)]' },
            { label: 'Overloaded', value: overloadedCount, color: overloadedCount > 0 ? 'text-rose-500' : 'text-[var(--text-secondary)]' },
            { label: 'Avg Load', value: `${avgLoad}%`, color: avgLoad > 100 ? 'text-rose-500' : avgLoad < 60 ? 'text-blue-500' : 'text-emerald-500' },
          ].map(kpi => (
            <div key={kpi.label} className="px-3 py-2 flex flex-col gap-0.5">
              <span className="text-[8px] uppercase tracking-wider font-bold text-[var(--text-muted)]">{kpi.label}</span>
              <span className={`text-base font-black leading-none ${kpi.color}`}>{kpi.value}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-subtle)] bg-[var(--surface)]/20">

        {/* Left: Allocation Heatmap Chart */}
        <div className="p-3 flex flex-col gap-2">
          <h4 className="m-0 text-[var(--text-secondary)] uppercase tracking-wider text-[9px] font-bold flex items-center gap-1.5">
            <BarChart3 size={11} className="text-[var(--text-muted)]" /> Allocation Load Heatmap
          </h4>
          {projectTeam.length === 0 ? (
            <div className="text-center text-[var(--text-muted)] text-xs italic py-6">No team members allocated to this project</div>
          ) : (
            <ReactECharts option={allocationBarOption} style={{ height: Math.max(120, Math.min(projectTeam.length * 26, 220)), width: '100%' }} opts={{ renderer: 'svg' }} />
          )}
        </div>

        {/* Right: Member List + Allocation Editor */}
        <div className="flex flex-col">
          <div className="p-3 overflow-y-auto max-h-[220px] flex flex-col gap-1.5 custom-scrollbar border-b border-[var(--border-subtle)]">
            <h4 className="m-0 text-[var(--text-secondary)] uppercase tracking-wider text-[9px] font-bold mb-0.5">Team Roster</h4>
            {projectTeam.length === 0 ? (
              <div className="text-center text-[var(--text-muted)] text-xs italic py-4">No team members assigned</div>
            ) : (
              projectTeam.map(member => {
                const isSelected = selectedMember?.employee_id === member.employee_id;
                const emp = employees.find(e => e.employee_id === member.employee_id);
                const allocation = member.allocation_percentage || 100;
                return (
                  <div key={member.employee_id} onClick={() => { setSelectedMember(member); setNewAllocation(allocation); }}
                    className={`p-2 rounded border transition-all cursor-pointer flex justify-between items-center hover:bg-[var(--elevated-card)]/40 ${isSelected ? 'bg-[var(--elevated-card)] border-[var(--blue)]/40 shadow-sm' : 'bg-[var(--bg)]/40 border-[var(--border-subtle)]'}`}>
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-[var(--text-primary)] text-[11px]">{member.name || emp?.name}</span>
                      <span className="text-[9px] text-[var(--text-muted)]">{member.role || 'Engineer'} · {emp?.department || 'Operations'}</span>
                    </div>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${getLoadBadge(allocation)}`}>
                      {allocation}%
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Allocation editor */}
          <div className="p-3 bg-[var(--bg)]/10 flex flex-col gap-2">
            {!selectedMember ? (
              <div className="text-center text-[var(--text-muted)] text-xs italic py-2 select-none flex items-center justify-center gap-1.5">
                <CornerDownRight size={13} /> Select member to adjust load
              </div>
            ) : (
              <div className="flex flex-col gap-2 text-xs">
                <div className="bg-[var(--bg)]/60 border border-[var(--border-subtle)] p-2 rounded flex justify-between items-center">
                  <div>
                    <div className="font-bold text-[var(--text-primary)]">{selectedMember.name}</div>
                    <div className="text-[var(--text-muted)] text-[10px]">Current: {selectedMember.allocation_percentage || 100}%</div>
                  </div>
                  <input type="number" value={newAllocation} onChange={(e) => setNewAllocation(e.target.value)} min="0" max="200"
                    className="w-20 bg-[var(--bg)] border border-[var(--border-subtle)] rounded p-1.5 text-[var(--text-primary)] outline-none text-xs focus:border-[var(--blue)]/40 font-bold text-center" />
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setSelectedMember(null)} disabled={actionLoading}
                    className="px-2.5 py-1 text-[var(--text-secondary)] bg-[var(--surface)] border border-[var(--border-subtle)] hover:bg-[var(--elevated-card)] font-bold rounded cursor-pointer transition-all active:scale-95 text-[10px]">Cancel</button>
                  <button onClick={handleUpdateAllocation} disabled={actionLoading}
                    className="px-2.5 py-1 text-white bg-[var(--blue)] hover:opacity-90 font-bold rounded cursor-pointer transition-all active:scale-95 flex items-center gap-1 text-[10px]">
                    <Save size={11} /> Save
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResourceManagementCenter;
