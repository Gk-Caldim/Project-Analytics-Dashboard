import React, { useState, useEffect } from 'react';
import { X, User, Info } from 'lucide-react';
import SentimentBadge from './SentimentBadge';
import EightDReportPanel from './EightDReportPanel';
import { updateComplaint } from '../../api/customer';
import { toast } from 'react-hot-toast';

const IssueDetailModal = ({ isOpen, onClose, complaint, onSaveSuccess = () => {} }) => {
  const [urgency, setUrgency] = useState('medium');
  const [status, setStatus] = useState('open');
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // 'info' | '8d'

  useEffect(() => {
    if (complaint) {
      setUrgency(complaint.urgency_level || 'medium');
      setStatus(complaint.eight_d_status || 'open');
      setActiveTab('info');
    }
  }, [complaint]);

  if (!isOpen || !complaint) return null;

  const handleUpdateStatus = async () => {
    setUpdating(true);
    try {
      await updateComplaint(complaint.id, {
        urgency_level: urgency,
        eight_d_status: status,
        resolution_date: status === 'closed' ? new Date().toISOString() : null
      });
      toast.success('Complaint status updated successfully');
      onSaveSuccess();
    } catch (e) {
      toast.error('Failed to update complaint status');
    } finally {
      setUpdating(false);
    }
  };

  const formattedDate = new Date(complaint.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="app-modal-overlay">
      <div className="app-modal-container w-full max-w-4xl">
        {/* Header */}
        <div className="app-modal-header">
          <div className="flex items-center gap-3">
            <span className="text-lg">📢</span>
            <div>
              <h2 className="app-modal-title uppercase tracking-wider">Customer Complaint Details</h2>
              <p className="app-modal-description mt-0.5">Complaint ID: #{complaint.id} · Logged: {formattedDate}</p>
            </div>
          </div>
          <button onClick={onClose} className="app-modal-close-btn bg-transparent border-0 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[var(--border-subtle)] bg-[var(--bg)]/10 shrink-0">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider border-0 cursor-pointer transition-all ${
              activeTab === 'info'
                ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] bg-transparent'
            }`}
          >
            Complaint Info
          </button>
          <button
            onClick={() => setActiveTab('8d')}
            className={`px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider border-0 cursor-pointer transition-all ${
              activeTab === '8d'
                ? 'text-blue-400 border-b-2 border-blue-500 bg-blue-500/5'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] bg-transparent'
            }`}
          >
            8D Report Workflow
          </button>
        </div>

        {/* Modal Body */}
        <div className="app-modal-body text-xs">
          {activeTab === 'info' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Info Column */}
              <div className="md:col-span-2 flex flex-col gap-4">
                <div className="bg-[var(--bg)] border border-[var(--border-subtle)] p-4 rounded-lg flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold">
                      <User className="w-4 h-4 text-blue-400" />
                      <span>{complaint.customer_name || 'Anonymous Customer'}</span>
                    </div>
                    <SentimentBadge score={complaint.sentiment_score} emotion={complaint.sentiment?.emotion_label || 'neutral'} />
                  </div>
                  <div className="h-[1px] bg-[var(--border-subtle)] my-1" />
                  <div className="text-[var(--text-muted)] text-[10px] font-semibold uppercase tracking-wider">Complaint Text</div>
                  <p className="m-0 text-[var(--text-primary)] text-[13px] leading-relaxed whitespace-pre-wrap">{complaint.complaint_text}</p>
                </div>

                {/* Timeline */}
                <div className="bg-[var(--bg)] border border-[var(--border-subtle)] p-4 rounded-lg flex flex-col gap-3">
                  <div className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-400" /> Escalation Timeline
                  </div>
                  <div className="flex flex-col gap-4 mt-2 pl-3 border-l border-[var(--border-subtle)]">
                    <div className="relative">
                      <div className="absolute -left-[17px] top-0.5 w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <div className="font-semibold text-[var(--text-primary)] text-xs">{"Logged & Analyzed"}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{formattedDate} · Initiated sentiment check</div>
                    </div>
                    <div className="relative">
                      <div className={`absolute -left-[17px] top-0.5 w-2.5 h-2.5 rounded-full ${complaint.eight_d_status !== 'open' ? 'bg-blue-500' : 'bg-[var(--border-subtle)]'}`} />
                      <div className="font-semibold text-[var(--text-primary)] text-xs">Investigation (8D D1-D4)</div>
                      <div className="text-[10px] text-[var(--text-muted)]">Formed team, defined interim containment action</div>
                    </div>
                    <div className="relative">
                      <div className={`absolute -left-[17px] top-0.5 w-2.5 h-2.5 rounded-full ${complaint.eight_d_status === 'closed' ? 'bg-emerald-500' : 'bg-[var(--border-subtle)]'}`} />
                      <div className="font-semibold text-[var(--text-primary)] text-xs">{"Resolution & Closure (8D D5-D8)"}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">Corrective actions deployed, verified pass</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Update Column */}
              <div className="bg-[var(--bg)] border border-[var(--border-subtle)] p-4 rounded-lg flex flex-col gap-4 h-fit">
                <h3 className="m-0 text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">Escalation Controls</h3>
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Urgency Level</label>
                  <select
                    value={urgency}
                    onChange={(e) => setUrgency(e.target.value)}
                    className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded p-2 text-[var(--text-primary)] outline-none text-xs"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical 🚨</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase">8D Problem Solving Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="bg-[var(--surface)] border border-[var(--border-subtle)] rounded p-2 text-[var(--text-primary)] outline-none text-xs"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="closed">Closed / Resolved</option>
                  </select>
                </div>

                <button
                  onClick={handleUpdateStatus}
                  disabled={updating}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded cursor-pointer transition-all border-0 text-xs active:scale-95 flex items-center justify-center gap-1.5"
                >
                  {updating ? 'Updating...' : 'Update Controls'}
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full h-full">
              <EightDReportPanel
                initialData={complaint.eight_d_report || {}}
                onSave={async (reportData) => {
                  setUpdating(true);
                  try {
                    await updateComplaint(complaint.id, {
                      eight_d_report: reportData
                    });
                    toast.success('8D Report updated successfully');
                    onSaveSuccess();
                  } catch (e) {
                    toast.error('Failed to update 8D report');
                  } finally {
                    setUpdating(false);
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IssueDetailModal;
