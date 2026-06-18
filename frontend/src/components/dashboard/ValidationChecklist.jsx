import React, { useState } from 'react';
import { Plus, CheckCircle2, Circle, Clock, Tag, PenLine, ChevronDown, ChevronRight } from 'lucide-react';
import API from '../../utils/api';
import { toast } from 'react-hot-toast';

const STAGE_COLORS = {
  DV:   { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20' },
  PV:   { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
  PPAP: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
};

const ValidationChecklist = ({ projectId, checklists, onRefresh }) => {
  const [expanded, setExpanded] = useState({});
  const [adding, setAdding] = useState(false);
  const [newStage, setNewStage] = useState('DV');
  const [newItems, setNewItems] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const handleToggleItem = async (checklist, itemIndex) => {
    const items = [...(checklist.checklist_items || [])];
    items[itemIndex] = { ...items[itemIndex], complete: !items[itemIndex].complete };
    try {
      await API.put(`/quality/validation-checklist/${checklist.id}`, { checklist_items: items });
      onRefresh();
    } catch {
      toast.error('Failed to update item');
    }
  };

  const handleCreate = async () => {
    if (!newItems.trim()) return;
    setSaving(true);
    try {
      const items = newItems.split('\n')
        .map(s => s.trim())
        .filter(Boolean)
        .map(name => ({ name, complete: false }));
      await API.post(`/quality/validation-checklist/${projectId}`, {
        stage_type: newStage,
        checklist_items: items,
      });
      toast.success(`${newStage} checklist created`);
      setAdding(false);
      setNewItems('');
      onRefresh();
    } catch {
      toast.error('Failed to create checklist');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOff = async (checklist) => {
    try {
      await API.put(`/quality/validation-checklist/${checklist.id}`, {
        signed_by: 'Quality Lead',
        sign_off_date: new Date().toISOString(),
      });
      toast.success('Checklist signed off');
      onRefresh();
    } catch {
      toast.error('Sign-off failed');
    }
  };

  return (
    <div className="p-3 flex flex-col gap-2 overflow-y-auto max-h-[340px] custom-scrollbar">
      {/* Add new checklist button */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--text-muted)]">
          Checklists ({checklists.length})
        </span>
        <button
          onClick={() => setAdding(!adding)}
          className="flex items-center gap-1 text-[9px] font-bold text-purple-400 hover:text-purple-300 cursor-pointer border-0 bg-transparent"
        >
          <Plus size={10} /> Add Checklist
        </button>
      </div>

      {/* New checklist form */}
      {adding && (
        <div className="bg-[var(--bg)]/60 border border-purple-500/20 rounded p-2.5 flex flex-col gap-2">
          <div className="flex gap-2">
            {['DV', 'PV', 'PPAP'].map(s => (
              <button
                key={s}
                onClick={() => setNewStage(s)}
                className={`px-2 py-1 text-[9px] font-bold rounded border cursor-pointer transition-all
                  ${newStage === s
                    ? `${STAGE_COLORS[s].bg} ${STAGE_COLORS[s].text} ${STAGE_COLORS[s].border}`
                    : 'bg-transparent text-[var(--text-muted)] border-[var(--border-subtle)]'
                  }`}
              >
                {s}
              </button>
            ))}
          </div>
          <textarea
            value={newItems}
            onChange={e => setNewItems(e.target.value)}
            placeholder="One item per line&#10;e.g. Dimensional check&#10;Functional test&#10;Material certification"
            rows={4}
            className="w-full bg-[var(--bg)] border border-[var(--border-subtle)] rounded p-1.5 text-[var(--text-primary)] text-[10px] outline-none focus:border-purple-400/40 resize-none"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setAdding(false)}
              className="px-2 py-1 text-[9px] font-bold text-[var(--text-muted)] cursor-pointer border border-[var(--border-subtle)] rounded bg-transparent"
            >Cancel</button>
            <button
              onClick={handleCreate}
              disabled={saving || !newItems.trim()}
              className="px-2 py-1 text-[9px] font-bold text-white bg-purple-500 hover:bg-purple-600 rounded cursor-pointer border-0 disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Checklists */}
      {checklists.length === 0 && !adding && (
        <div className="text-center text-[var(--text-muted)] text-xs italic py-6">
          No validation checklists yet. Click "Add Checklist" to start.
        </div>
      )}

      {checklists.map(cl => {
        const colors = STAGE_COLORS[cl.stage_type] || STAGE_COLORS.DV;
        const isOpen = expanded[cl.id];
        const items = cl.checklist_items || [];
        const done = items.filter(i => i.complete).length;
        const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;

        return (
          <div key={cl.id} className="border border-[var(--border-subtle)] rounded overflow-hidden">
            {/* Checklist header */}
            <div
              className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-[var(--elevated-card)]/40 ${colors.bg}`}
              onClick={() => toggleExpand(cl.id)}
            >
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border ${colors.text} ${colors.border} bg-transparent`}>
                  {cl.stage_type}
                </span>
                <span className="text-[11px] font-bold text-[var(--text-primary)]">
                  {items.length} items
                </span>
                <span className={`text-[9px] font-semibold ${pct === 100 ? 'text-emerald-400' : pct > 0 ? 'text-amber-400' : 'text-[var(--text-muted)]'}`}>
                  {pct}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                {pct === 100 && !cl.sign_off_date && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSignOff(cl); }}
                    className="text-[8px] font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer border border-emerald-400/30 px-1.5 py-0.5 rounded bg-transparent"
                  >
                    Sign Off
                  </button>
                )}
                {cl.sign_off_date && (
                  <span className="text-[8px] text-emerald-400 font-bold">✓ Signed</span>
                )}
                {isOpen ? <ChevronDown size={12} className="text-[var(--text-muted)]" /> : <ChevronRight size={12} className="text-[var(--text-muted)]" />}
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-0.5 bg-[var(--border-subtle)]">
              <div
                className={`h-full transition-all ${pct === 100 ? 'bg-emerald-400' : pct > 50 ? 'bg-amber-400' : 'bg-rose-400'}`}
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Items */}
            {isOpen && (
              <div className="flex flex-col divide-y divide-[var(--border-subtle)]">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-[var(--elevated-card)]/20 cursor-pointer transition-colors"
                    onClick={() => handleToggleItem(cl, idx)}
                  >
                    {item.complete
                      ? <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                      : <Circle size={13} className="text-[var(--border-strong)] shrink-0" />
                    }
                    <span className={`text-[11px] flex-1 ${item.complete ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                      {item.name}
                    </span>
                    {item.due_date && (
                      <span className="text-[9px] text-[var(--text-muted)] flex items-center gap-0.5">
                        <Clock size={8} /> {item.due_date}
                      </span>
                    )}
                    {item.owner && (
                      <span className="text-[9px] text-[var(--text-muted)] flex items-center gap-0.5">
                        <Tag size={8} /> {item.owner}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ValidationChecklist;
