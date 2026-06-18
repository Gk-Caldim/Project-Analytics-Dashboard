import React, { useState, useEffect } from 'react';
import { X, ShieldAlert } from 'lucide-react';

const MitigationTracker = ({ isOpen, onClose, risk, onSave = () => {} }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [probability, setProbability] = useState(3);
  const [impact, setImpact] = useState(3);
  const [mitigation, setMitigation] = useState('');
  const [status, setStatus] = useState('open');
  const [owner, setOwner] = useState('Unassigned');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (risk) {
      setTitle(risk.title || '');
      setDescription(risk.description || '');
      setProbability(risk.probability || 3);
      setImpact(risk.impact || 3);
      setMitigation(risk.mitigation_action || '');
      setStatus(risk.status || 'open');
      setOwner(risk.owner || 'Unassigned');
    }
  }, [risk]);

  if (!isOpen || !risk) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(risk.id, {
        title,
        description,
        probability,
        impact,
        mitigation_action: mitigation,
        status,
        owner
      });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-modal-overlay">
      <form onSubmit={handleSubmit} className="app-modal-container w-full max-w-md p-5 flex flex-col gap-4 text-xs">
        <div className="app-modal-header pb-3 flex justify-between items-center bg-transparent border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold">
            <ShieldAlert className="w-4 h-4 text-blue-400" />
            <h3 className="app-modal-title uppercase tracking-wider">Mitigation Controls</h3>
          </div>
          <button type="button" onClick={onClose} className="app-modal-close-btn bg-transparent border-0 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Risk Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded p-2 text-[var(--text-primary)] outline-none text-xs"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded p-2 text-[var(--text-primary)] outline-none text-xs resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Probability (1-5)</label>
            <select
              value={probability}
              onChange={(e) => setProbability(Number(e.target.value))}
              className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded p-2 text-[var(--text-primary)] outline-none text-xs"
            >
              {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Impact (1-5)</label>
            <select
              value={impact}
              onChange={(e) => setImpact(Number(e.target.value))}
              className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded p-2 text-[var(--text-primary)] outline-none text-xs"
            >
              {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Mitigation Action Plan (PCA)</label>
          <textarea
            value={mitigation}
            onChange={(e) => setMitigation(e.target.value)}
            placeholder="Interim containment plan and permanent corrective actions..."
            rows={3}
            className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded p-2 text-[var(--text-primary)] outline-none text-xs resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Owner</label>
            <input
              type="text"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded p-2 text-[var(--text-primary)] outline-none text-xs"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Mitigation Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded p-2 text-[var(--text-primary)] outline-none text-xs cursor-pointer"
            >
              <option value="open">Open</option>
              <option value="mitigated">Mitigated</option>
              <option value="closed">Closed / Resolved</option>
            </select>
          </div>
        </div>

        <div className="app-modal-footer bg-transparent border-t-0 p-0 flex justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="bg-[var(--bg)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold px-4 py-2 rounded cursor-pointer text-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded cursor-pointer text-xs"
          >
            {saving ? 'Saving...' : 'Apply Mitigation'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MitigationTracker;
