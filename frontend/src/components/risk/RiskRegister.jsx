import React from 'react';
import { Shield, Trash2, Edit2, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const SCORE_LEVELS = (score) => {
  if (score >= 15) return { bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400', label: 'High' };
  if (score >= 8) return { bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400', label: 'Medium' };
  return { bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', label: 'Low' };
};

const STATUS_LEVELS = (status) => {
  if (status === 'closed') return { bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', label: 'Closed' };
  if (status === 'mitigated') return { bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400', label: 'Mitigated' };
  return { bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400', label: 'Open' };
};

const RiskRegister = ({ risks = [], onEdit = () => {}, onDelete = () => {} }) => {
  return (
    <div className="w-full bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg overflow-hidden flex flex-col text-xs shadow-sm">
      <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--elevated-card)]/50 flex justify-between items-center">
        <h4 className="m-0 text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
          <Shield size={14} className="text-blue-400" />
          Risk Register Log
        </h4>
        <span className="text-[10px] text-[var(--text-muted)]">Showing {risks.length} Risk Item{risks.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="vppd-refined-table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
        <table className="vppd-refined-table text-xs">
          <thead>
            <tr>
              <th className="p-3">Risk Title & Description</th>
              <th className="p-3 text-center">P × I</th>
              <th className="p-3 text-center">Score</th>
              <th className="p-3">Owner</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {risks.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-[var(--text-muted)] py-10 italic">
                  No risks logged in this quadrant.
                </td>
              </tr>
            ) : (
              risks.map(r => {
                const scoreInfo = SCORE_LEVELS(r.score);
                const statusInfo = STATUS_LEVELS(r.status);

                return (
                  <tr key={r.id} className="border-b border-[var(--border-subtle)] hover:bg-[var(--table-hover)] transition-colors">
                    <td className="p-3">
                      <div className="font-semibold text-[var(--text-primary)]">{r.title}</div>
                      {r.description && <div className="text-[11px] text-[var(--text-muted)] mt-0.5">{r.description}</div>}
                      {r.mitigation_action && (
                        <div className="mt-1.5 p-2 bg-[var(--bg)] border border-[var(--border-subtle)] rounded text-[11px] text-[var(--text-secondary)] leading-normal">
                          <span className="font-bold text-blue-400">Mitigation PCA: </span>{r.mitigation_action}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-[var(--text-secondary)]">
                      {r.probability} × {r.impact}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded border uppercase font-bold text-[9px] ${scoreInfo.bg}`}>
                        {r.score} · {scoreInfo.label}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-[var(--text-secondary)]">{r.owner || 'Unassigned'}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded border uppercase font-bold text-[9px] ${statusInfo.bg}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => onEdit(r)}
                          className="p-1.5 bg-[var(--elevated-card)] border border-[var(--border-subtle)] rounded hover:border-blue-500/40 text-blue-400 hover:bg-[var(--bg)] cursor-pointer transition-all"
                          title="Edit mitigation / status"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => onDelete(r.id)}
                          className="p-1.5 bg-[var(--elevated-card)] border border-[var(--border-subtle)] rounded hover:border-rose-500/40 text-rose-400 hover:bg-[var(--bg)] cursor-pointer transition-all"
                          title="Delete risk"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RiskRegister;
