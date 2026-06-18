import React, { useState } from 'react';
import { CheckCircle2, XCircle, Plus, FileCheck, User, CalendarDays } from 'lucide-react';
import API from '../../utils/api';
import { toast } from 'react-hot-toast';

const DVResultsPanel = ({ projectId, results, onRefresh }) => {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ test_name: '', test_type: 'DV', pass_fail: true, findings: '', test_owner: '' });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!form.test_name.trim()) { toast.error('Test name required'); return; }
    setSaving(true);
    try {
      await API.post(`/quality/dv-results/${projectId}`, {
        ...form,
        pass_fail: form.pass_fail === true || form.pass_fail === 'true',
        test_date: new Date().toISOString(),
      });
      toast.success('Test result logged');
      setAdding(false);
      setForm({ test_name: '', test_type: 'DV', pass_fail: true, findings: '', test_owner: '' });
      onRefresh();
    } catch {
      toast.error('Failed to log result');
    } finally {
      setSaving(false);
    }
  };

  const passed = results.filter(r => r.pass_fail).length;
  const failed = results.filter(r => !r.pass_fail).length;
  const passRate = results.length > 0 ? Math.round((passed / results.length) * 100) : 0;

  return (
    <div className="p-3 flex flex-col gap-2 overflow-y-auto max-h-[340px] custom-scrollbar">
      {/* Summary row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <CheckCircle2 size={11} className="text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400">{passed} PASS</span>
          </div>
          <div className="flex items-center gap-1">
            <XCircle size={11} className="text-rose-400" />
            <span className="text-[10px] font-bold text-rose-400">{failed} FAIL</span>
          </div>
          <span className="text-[9px] text-[var(--text-muted)]">
            Pass Rate: <span className={`font-bold ${passRate >= 90 ? 'text-emerald-400' : passRate >= 70 ? 'text-amber-400' : 'text-rose-400'}`}>{passRate}%</span>
          </span>
        </div>
        <button
          onClick={() => setAdding(!adding)}
          className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer border border-indigo-400/30 px-2 py-0.5 rounded bg-transparent flex items-center gap-1"
        >
          <Plus size={9} /> Log Result
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-[var(--bg)]/60 border border-indigo-400/20 rounded p-2.5 flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              value={form.test_name}
              onChange={e => setForm(p => ({ ...p, test_name: e.target.value }))}
              placeholder="Test name..."
              className="col-span-2 bg-[var(--bg)] border border-[var(--border-subtle)] rounded p-1.5 text-[10px] text-[var(--text-primary)] outline-none focus:border-indigo-400/40"
            />
            <div className="flex gap-2 items-center">
              {['DV', 'PV'].map(t => (
                <button
                  key={t}
                  onClick={() => setForm(p => ({ ...p, test_type: t }))}
                  className={`px-2 py-0.5 text-[9px] font-bold rounded border cursor-pointer
                    ${form.test_type === t ? 'bg-indigo-500/20 text-indigo-400 border-indigo-400/30' : 'bg-transparent text-[var(--text-muted)] border-[var(--border-subtle)]'}`}
                >{t}</button>
              ))}
            </div>
            <div className="flex gap-2 items-center">
              {[{ v: true, label: 'PASS' }, { v: false, label: 'FAIL' }].map(opt => (
                <button
                  key={opt.label}
                  onClick={() => setForm(p => ({ ...p, pass_fail: opt.v }))}
                  className={`px-2 py-0.5 text-[9px] font-bold rounded border cursor-pointer
                    ${form.pass_fail === opt.v
                      ? opt.v ? 'bg-emerald-500/20 text-emerald-400 border-emerald-400/30' : 'bg-rose-500/20 text-rose-400 border-rose-400/30'
                      : 'bg-transparent text-[var(--text-muted)] border-[var(--border-subtle)]'
                    }`}
                >{opt.label}</button>
              ))}
            </div>
          </div>
          <input
            value={form.test_owner}
            onChange={e => setForm(p => ({ ...p, test_owner: e.target.value }))}
            placeholder="Test owner..."
            className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded p-1.5 text-[10px] text-[var(--text-primary)] outline-none focus:border-indigo-400/40"
          />
          <textarea
            value={form.findings}
            onChange={e => setForm(p => ({ ...p, findings: e.target.value }))}
            placeholder="Findings / notes..."
            rows={2}
            className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded p-1.5 text-[10px] text-[var(--text-primary)] outline-none resize-none"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAdding(false)} className="text-[9px] text-[var(--text-muted)] cursor-pointer border border-[var(--border-subtle)] px-2 py-0.5 rounded bg-transparent">Cancel</button>
            <button onClick={handleCreate} disabled={saving} className="text-[9px] font-bold text-white bg-indigo-500 hover:bg-indigo-600 px-2 py-0.5 rounded cursor-pointer border-0 disabled:opacity-50">
              {saving ? 'Saving…' : 'Log Result'}
            </button>
          </div>
        </div>
      )}

      {/* Results list */}
      {results.length === 0 && !adding && (
        <div className="text-center text-[var(--text-muted)] text-xs italic py-6">
          No test results logged yet.
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {results.map(r => (
          <div
            key={r.id}
            className={`flex items-start gap-2.5 p-2 rounded border transition-colors
              ${r.pass_fail ? 'border-emerald-400/15 bg-emerald-400/5' : 'border-rose-400/15 bg-rose-400/5'}`}
          >
            {r.pass_fail
              ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
              : <XCircle size={14} className="text-rose-400 shrink-0 mt-0.5" />
            }
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[var(--text-primary)] truncate">{r.test_name}</span>
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${r.pass_fail ? 'bg-emerald-400/10 text-emerald-400' : 'bg-rose-400/10 text-rose-400'}`}>
                  {r.test_type || 'DV'} · {r.pass_fail ? 'PASS' : 'FAIL'}
                </span>
              </div>
              {r.findings && (
                <p className="text-[9px] text-[var(--text-secondary)] mt-0.5 line-clamp-2">{r.findings}</p>
              )}
              <div className="flex items-center gap-3 mt-0.5">
                {r.test_owner && (
                  <span className="text-[9px] text-[var(--text-muted)] flex items-center gap-0.5">
                    <User size={8} /> {r.test_owner}
                  </span>
                )}
                {r.test_date && (
                  <span className="text-[9px] text-[var(--text-muted)] flex items-center gap-0.5">
                    <CalendarDays size={8} /> {r.test_date?.split('T')[0]}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DVResultsPanel;
