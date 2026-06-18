import React, { useState } from 'react';
import { Award, ChevronRight, CheckCircle2, XCircle, Clock, AlertTriangle, Send, ThumbsUp, ThumbsDown } from 'lucide-react';
import API from '../../utils/api';
import { toast } from 'react-hot-toast';

const STATUS_CONFIG = {
  not_started: { label: 'Not Started',  color: 'text-[var(--text-muted)]',  bg: 'bg-[var(--border-subtle)]/30', icon: Clock },
  submitted:   { label: 'Submitted',    color: 'text-amber-400',             bg: 'bg-amber-400/10',              icon: Send },
  approved:    { label: 'Approved',     color: 'text-emerald-400',           bg: 'bg-emerald-400/10',            icon: CheckCircle2 },
  rejected:    { label: 'Rejected',     color: 'text-rose-400',              bg: 'bg-rose-400/10',               icon: XCircle },
};

const PPAPTracker = ({ projectId, stages, onRefresh }) => {
  const [acting, setActing] = useState(null); // {level, action}
  const [notes, setNotes] = useState('');

  const handleSubmit = async (level) => {
    setActing({ level, action: 'submit' });
  };

  const confirmSubmit = async (level) => {
    try {
      await API.post(`/quality/ppap/${projectId}/level/${level}/submit`, { submitted_by: 'Project Team', notes });
      toast.success(`PPAP Level ${level} submitted`);
      setActing(null); setNotes('');
      onRefresh();
    } catch {
      toast.error('Submission failed');
    }
  };

  const confirmReview = async (level, status) => {
    try {
      await API.put(`/quality/ppap/${projectId}/level/${level}/review`, {
        status,
        approved_by: status === 'approved' ? 'Quality Manager' : undefined,
        rejection_reason: status === 'rejected' ? notes : undefined,
      });
      toast.success(`Level ${level} ${status}`);
      setActing(null); setNotes('');
      onRefresh();
    } catch {
      toast.error('Review update failed');
    }
  };

  const allApproved = stages.length === 4 && stages.every(s => s.status === 'approved');

  return (
    <div className="p-3 flex flex-col gap-3 overflow-y-auto max-h-[340px] custom-scrollbar">
      {/* Overall status */}
      <div className={`flex items-center justify-between px-3 py-2 rounded border ${allApproved ? 'border-emerald-400/20 bg-emerald-400/5' : 'border-[var(--border-subtle)] bg-[var(--bg)]/30'}`}>
        <span className="text-[10px] font-bold text-[var(--text-secondary)]">PPAP Overall Status</span>
        <span className={`text-[10px] font-black ${allApproved ? 'text-emerald-400' : 'text-amber-400'}`}>
          {allApproved ? '✓ FULLY APPROVED' : `${stages.filter(s => s.status === 'approved').length}/4 Approved`}
        </span>
      </div>

      {/* Level cards */}
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4].map(level => {
          const stage = stages.find(s => s.level === level) || { level, status: 'not_started' };
          const cfg = STATUS_CONFIG[stage.status] || STATUS_CONFIG.not_started;
          const StatusIcon = cfg.icon;
          const prevApproved = level === 1 || stages.find(s => s.level === level - 1)?.status === 'approved';
          const isActing = acting?.level === level;

          return (
            <div key={level} className={`border rounded overflow-hidden ${isActing ? 'border-purple-400/30' : 'border-[var(--border-subtle)]'}`}>
              {/* Level header */}
              <div className={`flex items-center gap-3 px-3 py-2.5 ${cfg.bg}`}>
                {/* Level badge */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border ${cfg.color} border-current`}>
                  {level}
                </div>
                <div className="flex-1">
                  <div className="text-[11px] font-bold text-[var(--text-primary)]">PPAP Level {level}</div>
                  {stage.submission_date && (
                    <div className="text-[9px] text-[var(--text-muted)]">
                      Submitted: {stage.submission_date?.split('T')[0]}
                      {stage.approval_date && ` · Approved: ${stage.approval_date.split('T')[0]}`}
                    </div>
                  )}
                  {stage.rejection_reason && (
                    <div className="text-[9px] text-rose-400 flex items-center gap-1 mt-0.5">
                      <AlertTriangle size={8} /> {stage.rejection_reason}
                    </div>
                  )}
                </div>
                <div className={`flex items-center gap-1 text-[9px] font-bold ${cfg.color}`}>
                  <StatusIcon size={11} /> {cfg.label}
                </div>
              </div>

              {/* Action row */}
              {!isActing && (
                <div className="px-3 py-1.5 flex gap-2 items-center bg-[var(--bg)]/20">
                  {stage.status === 'not_started' && prevApproved && (
                    <button
                      onClick={() => setActing({ level, action: 'submit' })}
                      className="text-[9px] font-bold text-purple-400 hover:text-purple-300 cursor-pointer border border-purple-400/30 px-2 py-0.5 rounded bg-transparent flex items-center gap-1"
                    >
                      <Send size={9} /> Submit Level {level}
                    </button>
                  )}
                  {stage.status === 'submitted' && (
                    <>
                      <button
                        onClick={() => setActing({ level, action: 'approve' })}
                        className="text-[9px] font-bold text-emerald-400 cursor-pointer border border-emerald-400/30 px-2 py-0.5 rounded bg-transparent flex items-center gap-1"
                      >
                        <ThumbsUp size={9} /> Approve
                      </button>
                      <button
                        onClick={() => setActing({ level, action: 'reject' })}
                        className="text-[9px] font-bold text-rose-400 cursor-pointer border border-rose-400/30 px-2 py-0.5 rounded bg-transparent flex items-center gap-1"
                      >
                        <ThumbsDown size={9} /> Reject
                      </button>
                    </>
                  )}
                  {stage.status === 'rejected' && (
                    <button
                      onClick={() => setActing({ level, action: 'resubmit' })}
                      className="text-[9px] font-bold text-amber-400 cursor-pointer border border-amber-400/30 px-2 py-0.5 rounded bg-transparent"
                    >
                      Resubmit
                    </button>
                  )}
                  {stage.status === 'not_started' && !prevApproved && (
                    <span className="text-[9px] text-[var(--text-muted)] italic">Requires Level {level - 1} approval first</span>
                  )}
                </div>
              )}

              {/* Inline action form */}
              {isActing && (
                <div className="px-3 py-2 bg-purple-400/5 flex flex-col gap-2">
                  {(acting.action === 'reject') && (
                    <input
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Rejection reason..."
                      className="w-full bg-[var(--bg)] border border-rose-400/30 rounded p-1.5 text-[10px] text-[var(--text-primary)] outline-none"
                    />
                  )}
                  {(acting.action === 'submit' || acting.action === 'resubmit') && (
                    <input
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Submission notes (optional)..."
                      className="w-full bg-[var(--bg)] border border-purple-400/30 rounded p-1.5 text-[10px] text-[var(--text-primary)] outline-none"
                    />
                  )}
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setActing(null); setNotes(''); }} className="text-[9px] text-[var(--text-muted)] cursor-pointer border border-[var(--border-subtle)] px-2 py-0.5 rounded bg-transparent">Cancel</button>
                    <button
                      onClick={() => {
                        if (acting.action === 'approve') confirmReview(level, 'approved');
                        else if (acting.action === 'reject') confirmReview(level, 'rejected');
                        else confirmSubmit(level);
                      }}
                      className={`text-[9px] font-bold text-white px-2 py-0.5 rounded cursor-pointer border-0
                        ${acting.action === 'reject' ? 'bg-rose-500' : acting.action === 'approve' ? 'bg-emerald-500' : 'bg-purple-500'}`}
                    >
                      {acting.action === 'submit' || acting.action === 'resubmit' ? 'Confirm Submit' : acting.action === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PPAPTracker;
