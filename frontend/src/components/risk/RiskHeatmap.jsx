import React from 'react';

const HEATMAP_COLORS = (score) => {
  if (score >= 15) return 'bg-rose-500/30 text-rose-400 border-rose-500/40 hover:bg-rose-500/40';
  if (score >= 8) return 'bg-amber-500/25 text-amber-400 border-amber-500/35 hover:bg-amber-500/35';
  return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30';
};

const RiskHeatmap = ({ risks = [], selectedCell = null, onCellSelect = () => {} }) => {
  // Map risks into 5x5 grid coordinates (1-5 indices, 1-indexed)
  const gridData = React.useMemo(() => {
    const matrix = Array.from({ length: 5 }, () => Array(5).fill(0));
    risks.forEach(r => {
      const p = Math.max(1, Math.min(5, r.probability || 3));
      const i = Math.max(1, Math.min(5, r.impact || 3));
      matrix[p - 1][i - 1]++;
    });
    return matrix;
  }, [risks]);

  const yLabels = ['5 - Very High', '4 - High', '3 - Medium', '2 - Low', '1 - Very Low'];
  const xLabels = ['1 - Insignificant', '2 - Minor', '3 - Moderate', '4 - Major', '5 - Catastrophic'];

  return (
    <div className="w-full flex flex-col gap-2 p-1">
      <div className="flex justify-between items-center px-1">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Risk Heatmap (5x5 Matrix)</span>
        <span className="text-[10px] text-slate-500 italic">Click a cell to filter risks</span>
      </div>

      <div className="flex flex-row">
        {/* Y Axis Labels */}
        <div className="flex flex-col justify-between pr-2 py-4 h-[240px] text-[9px] font-bold text-slate-500 uppercase text-right w-20 shrink-0 leading-none">
          {yLabels.map(l => (
            <div key={l} className="flex items-center justify-end h-8">
              {l}
            </div>
          ))}
        </div>

        {/* Heatmap Grid */}
        <div className="flex-1 flex flex-col gap-1.5 h-[240px]">
          {Array.from({ length: 5 }).reverse().map((_, pIdx) => {
            const p = pIdx + 1;
            return (
              <div key={p} className="flex gap-1.5 h-8">
                {Array.from({ length: 5 }).map((_, iIdx) => {
                  const i = iIdx + 1;
                  const score = p * i;
                  const count = gridData[p - 1][i - 1];
                  const cellColor = HEATMAP_COLORS(score);
                  const isCellSelected = selectedCell && selectedCell.probability === p && selectedCell.impact === i;

                  return (
                    <button
                      key={i}
                      onClick={() => onCellSelect(isCellSelected ? null : { probability: p, impact: i })}
                      className={`flex-1 rounded border text-[11px] font-bold flex flex-col items-center justify-center transition-all cursor-pointer select-none leading-none ${cellColor} ${
                        isCellSelected
                          ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900 border-transparent shadow-lg scale-[1.03]'
                          : ''
                      }`}
                    >
                      <span>{count > 0 ? `${count}` : '—'}</span>
                      {count > 0 && <span className="text-[7px] uppercase font-bold opacity-60 mt-0.5">Risk{count > 1 ? 's' : ''}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* X Axis Labels */}
          <div className="flex gap-1.5 pt-1.5 text-[9px] font-bold text-slate-500 uppercase text-center leading-tight">
            {xLabels.map(l => (
              <div key={l} className="flex-1">
                {l}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskHeatmap;
