import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Shield, Plus, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getProjectRisks, logRisk, updateProjectRisk, deleteProjectRisk } from '../../api/risks';
import API from '../../utils/api';
import RiskHeatmap from '../risk/RiskHeatmap';
import RiskRegister from '../risk/RiskRegister';
import MitigationTracker from '../risk/MitigationTracker';

const RiskManagementDashboard = ({ projectId }) => {
  const [risks, setRisks] = useState([]);
  const [riskScoreData, setRiskScoreData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);

  // Edit states
  const [activeRisk, setActiveRisk] = useState(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Add new risk states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newProb, setNewProb] = useState(3);
  const [newImp, setNewImp] = useState(3);
  const [newMitigation, setNewMitigation] = useState('');
  const [newOwner, setNewOwner] = useState('Unassigned');
  const [adding, setAdding] = useState(false);

  const fetchData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [risksRes, scoreRes] = await Promise.all([
        getProjectRisks(projectId),
        API.get(`/predictions/project/${projectId}/risk-score`)
      ]);
      setRisks(risksRes);
      setRiskScoreData(scoreRes.data);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load risk management data');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [projectId, fetchData]);

  const handleCreateRisk = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      await logRisk(projectId, {
        title: newTitle.trim(),
        description: newDesc.trim() || null,
        probability: newProb,
        impact: newImp,
        mitigation_action: newMitigation.trim() || null,
        status: 'open',
        owner: newOwner
      });
      toast.success('Risk item successfully logged');
      setShowAddModal(false);
      setNewTitle('');
      setNewDesc('');
      setNewProb(3);
      setNewImp(3);
      setNewMitigation('');
      setNewOwner('Unassigned');
      fetchData();
    } catch (err) {
      toast.error('Failed to log risk item');
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateRisk = async (riskId, updatedFields) => {
    try {
      await updateProjectRisk(riskId, updatedFields);
      toast.success('Risk item updated successfully');
      setIsEditOpen(false);
      setActiveRisk(null);
      fetchData();
    } catch (err) {
      toast.error('Failed to update risk item');
    }
  };

  const handleDeleteRisk = async (riskId) => {
    if (!window.confirm('Are you sure you want to delete this risk item?')) return;
    try {
      await deleteProjectRisk(riskId);
      toast.success('Risk item deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete risk item');
    }
  };

  const filteredRisks = useMemo(() => {
    if (!selectedCell) return risks;
    return risks.filter(r => r.probability === selectedCell.probability && r.impact === selectedCell.impact);
  }, [risks, selectedCell]);

  const overallScoreColor = (score) => {
    if (score >= 75) return 'text-emerald-400';
    if (score >= 45) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="w-full flex flex-col gap-4 text-xs">
      {/* Risk Summary Scorecard */}
      <div className="vppd-kpi-strip">
        <div className="vppd-kpi-card md:col-span-2 flex flex-row justify-between items-center">
          <div className="flex flex-col gap-1">
            <span className="vppd-kpi-label">Project Risk Health Index</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-2xl font-black ${overallScoreColor(riskScoreData?.overall_health_score)}`}>
                {riskScoreData?.overall_health_score !== undefined ? Math.round(riskScoreData.overall_health_score) : 50}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase">/ 100 Health Score</span>
            </div>
            <span className="text-[10px] text-[var(--text-muted)] mt-1">
              Composite score: higher represents better overall program execution health.
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded border ${
              riskScoreData?.risk_level === 'low' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
              riskScoreData?.risk_level === 'medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
              'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              {riskScoreData?.risk_level || 'Medium'} Risk Level
            </span>
            <span className="text-[9px] text-[var(--text-muted)] font-mono mt-1">Model: {riskScoreData?.model_version || 'rule_based_v1'}</span>
          </div>
        </div>

        {[
          { label: 'Milestone Delay Risk', value: `${Math.round((riskScoreData?.milestones_delay_probability || 0) * 100)}%`, emoji: '📅' },
          { label: 'Budget Overrun Risk', value: `${Math.round((riskScoreData?.budget_overrun_probability || 0) * 100)}%`, emoji: '💰' }
        ].map((c, i) => (
          <div key={i} className="vppd-kpi-card flex flex-row justify-between items-center">
            <div className="flex flex-col gap-1">
              <span className="vppd-kpi-label">{c.label}</span>
              <span className="vppd-kpi-value text-[var(--text-primary)] mt-1">{c.value}</span>
            </div>
            <span className="text-2xl select-none">{c.emoji}</span>
          </div>
        ))}
      </div>

      {/* Split: Heatmap | Register */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Heatmap Column */}
        <div className="vppd-section p-4 flex flex-col justify-between h-fit">
          <RiskHeatmap
            risks={risks}
            selectedCell={selectedCell}
            onCellSelect={setSelectedCell}
          />
          
          <div className="flex justify-between items-center mt-6 pt-3 border-t border-[var(--border-subtle)]">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-2 rounded cursor-pointer transition-all border-0 flex items-center gap-1 active:scale-95"
            >
              <Plus size={14} /> Log Risk Item
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="bg-[var(--elevated-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold px-3 py-2 rounded cursor-pointer transition-all flex items-center gap-1 hover:bg-[var(--bg)]"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Register Column */}
        <div className="lg:col-span-2 flex flex-col gap-3 min-h-0">
          {selectedCell && (
            <div className="bg-blue-600/10 border border-blue-500/20 text-blue-400 p-2.5 rounded-lg flex justify-between items-center">
              <span className="font-semibold">
                Filtering by Matrix Coordinate: Probability {selectedCell.probability} × Impact {selectedCell.impact}
              </span>
              <button
                onClick={() => setSelectedCell(null)}
                className="text-blue-400 hover:text-blue-200 bg-transparent border-0 cursor-pointer p-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <RiskRegister
            risks={filteredRisks}
            onEdit={(risk) => {
              setActiveRisk(risk);
              setIsEditOpen(true);
            }}
            onDelete={handleDeleteRisk}
          />
        </div>
      </div>

      {/* Log Risk Modal overlay */}
      {showAddModal && (
        <div className="app-modal-overlay">
          <form onSubmit={handleCreateRisk} className="app-modal-container w-full max-w-md p-5 flex flex-col gap-4">
            <div className="app-modal-header pb-3 flex justify-between items-center bg-transparent border-b border-[var(--border-subtle)]">
              <h3 className="app-modal-title uppercase tracking-wider">Log Project Risk Item</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="app-modal-close-btn bg-transparent border-0 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Risk Title</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Brief description of the risk..."
                className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded p-2 text-[var(--text-primary)] outline-none text-xs"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Description</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Root cause, process dependencies, or timeline impacts..."
                rows={2}
                className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded p-2 text-[var(--text-primary)] outline-none text-xs resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Probability (1-5)</label>
                <select
                  value={newProb}
                  onChange={(e) => setNewProb(Number(e.target.value))}
                  className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded p-2 text-[var(--text-primary)] outline-none text-xs cursor-pointer"
                >
                  {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Impact (1-5)</label>
                <select
                  value={newImp}
                  onChange={(e) => setNewImp(Number(e.target.value))}
                  className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded p-2 text-[var(--text-primary)] outline-none text-xs cursor-pointer"
                >
                  {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Mitigation Action Plan (PCA)</label>
              <textarea
                value={newMitigation}
                onChange={(e) => setNewMitigation(e.target.value)}
                placeholder="Interim containment plan and permanent corrective actions..."
                rows={3}
                className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded p-2 text-[var(--text-primary)] outline-none text-xs resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Owner</label>
              <input
                type="text"
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
                className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded p-2 text-[var(--text-primary)] outline-none text-xs"
              />
            </div>

            <div className="app-modal-footer bg-transparent border-t-0 p-0 flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold px-4 py-2 rounded cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={adding || !newTitle.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded cursor-pointer text-xs disabled:opacity-50"
              >
                {adding ? 'Saving...' : 'Log Risk'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mitigation Action Form overlay */}
      <MitigationTracker
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setActiveRisk(null);
        }}
        risk={activeRisk}
        onSave={handleUpdateRisk}
      />
    </div>
  );
};

export default RiskManagementDashboard;
