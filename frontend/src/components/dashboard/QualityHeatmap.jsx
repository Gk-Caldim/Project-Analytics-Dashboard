import React, { useMemo } from 'react';
import { Grid3x3 } from 'lucide-react';

/**
 * QualityHeatmap — line × metric heatmap
 * Props:
 *   lines: string[]
 *   metrics: string[]
 *   grid: number[][] (lines × metrics)
 *   healthGrid: string[][] ('green'|'yellow'|'red')
 */

const HEALTH_STYLES = {
  green:  { bg: 'bg-emerald-400/20',  text: 'text-emerald-400',  border: 'border-emerald-400/30' },
  yellow: { bg: 'bg-amber-400/20',    text: 'text-amber-400',    border: 'border-amber-400/30' },
  red:    { bg: 'bg-rose-400/20',     text: 'text-rose-400',     border: 'border-rose-400/30' },
};

const METRIC_FORMATS = {
  FPY:         v => `${v?.toFixed(1) ?? '—'}%`,
  DPPM:        v => v != null ? Math.round(v).toLocaleString() : '—',
  REJECT_RATE: v => `${v?.toFixed(2) ?? '—'}%`,
};

const QualityHeatmap = ({ lines = [], metrics = [], grid = [], healthGrid = [] }) => {
  if (!lines.length || !metrics.length) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-[var(--text-muted)] text-xs italic gap-2">
        <Grid3x3 size={20} className="opacity-40" />
        No line quality data available
      </div>
    );
  }

  const METRIC_LABELS = {
    FPY:         'First Pass Yield',
    DPPM:        'Defects/Million',
    REJECT_RATE: 'Reject Rate',
  };

  return (
    <div className="w-full flex flex-col gap-1">
      <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--text-muted)] flex items-center gap-1 px-1">
        <Grid3x3 size={9} /> Line-wise Quality Heatmap
      </span>

      <div className="overflow-x-auto">
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr>
              <th className="text-left p-1.5 text-[var(--text-muted)] font-bold text-[9px] uppercase border-b border-[var(--border-subtle)] w-20">Line</th>
              {metrics.map(m => (
                <th key={m} className="p-1.5 text-[var(--text-muted)] font-bold text-[9px] uppercase border-b border-[var(--border-subtle)] text-center">
                  <div>{m}</div>
                  <div className="text-[7px] font-normal normal-case opacity-70">{METRIC_LABELS[m]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, li) => (
              <tr key={line} className="hover:bg-[var(--elevated-card)]/20 transition-colors">
                <td className="p-1.5 font-bold text-[var(--text-secondary)] text-[10px]">{line}</td>
                {metrics.map((metric, mi) => {
                  const value = grid[li]?.[mi];
                  const health = healthGrid[li]?.[mi] || 'green';
                  const styles = HEALTH_STYLES[health] || HEALTH_STYLES.green;
                  const fmt = METRIC_FORMATS[metric] || (v => v?.toFixed(2) ?? '—');

                  return (
                    <td key={metric} className="p-1">
                      <div className={`flex flex-col items-center justify-center rounded border px-2 py-1.5 ${styles.bg} ${styles.border}`}>
                        <span className={`font-black text-[12px] leading-none ${styles.text}`}>
                          {fmt(value)}
                        </span>
                        <span className={`text-[7px] mt-0.5 font-bold uppercase ${styles.text} opacity-70`}>
                          {health}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-1 mt-1 flex-wrap">
        {Object.entries(HEALTH_STYLES).map(([health, s]) => (
          <div key={health} className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[8px] font-bold ${s.bg} ${s.text} ${s.border}`}>
            {health.toUpperCase()}
          </div>
        ))}
      </div>
    </div>
  );
};

export default QualityHeatmap;
