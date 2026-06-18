import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, X, ChevronUp, ChevronDown, Bell, RefreshCw, AlertTriangle, DollarSign, Shield, Star, TrendingDown, MessageSquare } from 'lucide-react';
import API from '../utils/api';

const TYPE_CONFIG = {
  risk_alert:     { icon: AlertTriangle, color: 'text-rose-400',   bg: 'bg-rose-400/10',    border: 'border-rose-400/20' },
  budget_alert:   { icon: DollarSign,   color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-400/20' },
  cost_optimization: { icon: TrendingDown, color: 'text-blue-400', bg: 'bg-blue-400/10',    border: 'border-blue-400/20' },
  quality_alert:  { icon: Shield,        color: 'text-purple-400', bg: 'bg-purple-400/10',  border: 'border-purple-400/20' },
  customer_alert: { icon: MessageSquare, color: 'text-rose-400',   bg: 'bg-rose-400/10',    border: 'border-rose-400/20' },
  process_alert:  { icon: Star,          color: 'text-indigo-400', bg: 'bg-indigo-400/10',  border: 'border-indigo-400/20' },
  health_alert:   { icon: AlertTriangle, color: 'text-rose-400',   bg: 'bg-rose-400/10',    border: 'border-rose-400/20' },
};

const URGENCY_BADGE = {
  critical: 'bg-rose-500/20 text-rose-400 border-rose-400/30',
  high:     'bg-amber-500/20 text-amber-400 border-amber-400/30',
  medium:   'bg-blue-500/20 text-blue-400 border-blue-400/30',
  low:      'bg-[var(--border-subtle)] text-[var(--text-muted)] border-[var(--border-subtle)]',
};

const POLL_INTERVAL = 60_000; // 60 seconds

/**
 * AIAssistantPanel — Floating bottom-right recommendation panel
 * Props: projectId (number | null)
 */
const AIAssistantPanel = ({ projectId }) => {
  const [open, setOpen] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState(null);
  const timerRef = useRef(null);

  const fetchRecs = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await API.get(`/ai-assistant/recommendations/${projectId}`);
      setRecommendations(res.data || []);
      setLastFetch(new Date());
    } catch {
      // Silent — don't disrupt UX
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Poll every 60s
  useEffect(() => {
    fetchRecs();
    timerRef.current = setInterval(fetchRecs, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [fetchRecs]);

  const visible = recommendations.filter(r => !dismissed.has(r.id));
  const criticalCount = visible.filter(r => r.urgency === 'critical').length;

  return (
    <div
      style={{ position: 'fixed', bottom: '20px', right: '20px', zIndex: 9999 }}
      className="flex flex-col items-end gap-2"
    >
      {/* Panel */}
      {open && (
        <div className="w-80 max-h-[480px] bg-[var(--surface)] border border-[var(--border-strong)] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="px-3 py-2 bg-gradient-to-r from-[var(--elevated-card)] to-[var(--surface)] border-b border-[var(--border-subtle)] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={13} className="text-amber-400" />
              <span className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-wider">AI Assistant</span>
              {visible.length > 0 && (
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border
                  ${criticalCount > 0 ? 'bg-rose-500/20 text-rose-400 border-rose-400/30' : 'bg-amber-400/20 text-amber-400 border-amber-400/30'}`}>
                  {visible.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={fetchRecs}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer border-0 bg-transparent"
              >
                <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer border-0 bg-transparent"
              >
                <ChevronDown size={13} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-[var(--text-muted)]">
                <Sparkles size={20} className="opacity-30" />
                <span className="text-xs">No active recommendations</span>
                {lastFetch && (
                  <span className="text-[9px] opacity-60">
                    Updated {lastFetch.toLocaleTimeString()}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-[var(--border-subtle)]">
                {visible.map(rec => {
                  const cfg = TYPE_CONFIG[rec.type] || TYPE_CONFIG.risk_alert;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={rec.id}
                      className={`p-3 flex flex-col gap-1.5 ${cfg.bg} transition-all hover:brightness-110`}
                    >
                      {/* Title row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <Icon size={12} className={`${cfg.color} shrink-0`} />
                          <span className={`text-[11px] font-bold leading-tight ${cfg.color}`}>{rec.title}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className={`text-[7px] font-black uppercase px-1 py-0.5 rounded border ${URGENCY_BADGE[rec.urgency] || URGENCY_BADGE.low}`}>
                            {rec.urgency}
                          </span>
                          <button
                            onClick={() => setDismissed(p => new Set([...p, rec.id]))}
                            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer border-0 bg-transparent"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-[9px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                        {rec.description}
                      </p>

                      {/* Action */}
                      {rec.action && (
                        <div className={`text-[9px] font-semibold px-2 py-1 rounded border ${cfg.border} ${cfg.bg} ${cfg.color}`}>
                          → {rec.action}
                        </div>
                      )}

                      {/* Source badge */}
                      <span className="text-[7px] text-[var(--text-muted)] italic">
                        Source: {rec.suggested_by?.replace(/_/g, ' ') || 'AI engine'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {lastFetch && (
            <div className="px-3 py-1.5 border-t border-[var(--border-subtle)] bg-[var(--bg)]/30">
              <span className="text-[8px] text-[var(--text-muted)]">
                Auto-refreshes every 60s · Last update: {lastFetch.toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      )}

      {/* FAB button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`relative flex items-center gap-2 px-3 py-2 rounded-full shadow-lg cursor-pointer border-0 transition-all duration-200 active:scale-95
          ${open
            ? 'bg-[var(--elevated-card)] border border-[var(--border-strong)] text-[var(--text-primary)]'
            : criticalCount > 0
              ? 'bg-rose-500 text-white'
              : visible.length > 0
                ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
                : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
          }`}
        title="AI Assistant Recommendations"
      >
        {loading
          ? <RefreshCw size={14} className="animate-spin" />
          : <Sparkles size={14} />
        }
        <span className="text-[10px] font-bold">AI Assist</span>
        {!open && visible.length > 0 && (
          <span className={`absolute -top-1 -right-1 text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center
            ${criticalCount > 0 ? 'bg-rose-500 text-white' : 'bg-amber-400 text-white'}`}>
            {visible.length}
          </span>
        )}
        {open ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
      </button>
    </div>
  );
};

export default AIAssistantPanel;
