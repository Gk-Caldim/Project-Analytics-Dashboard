import React, { useState, useMemo } from 'react';
import { AlertTriangle, ShieldAlert, Cpu, Layers, TrendingUp, TrendingDown, RefreshCw, BarChart3, CornerDownRight, Zap } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import API from '../../utils/api';
import { toast } from 'react-hot-toast';

// Determine color for % change — red only for significant increases
const getPctColor = (pct) => {
  if (pct >= 10) return 'text-rose-500';
  if (pct >= 5) return 'text-amber-500';
  if (pct > 0) return 'text-orange-400';
  return 'text-emerald-500';
};

// Commodity unit hints (shown in detail view)
const COMMODITY_UNITS = {
  steel: '/ MT',
  aluminium: '/ MT',
  copper: '/ MT',
  lithium: '/ MT',
  rubber: '/ MT',
  fuel: '/ bbl',
  semiconductor: '/ unit',
};

const SupplyChainRiskCenter = ({
  commodityPrices = {}, // GET /budget/commodities/
  projects = [],
  structures = [],
  onRefresh = () => {}
}) => {
  const [selectedCommodity, setSelectedCommodity] = useState(null);
  const [analyzingProject, setAnalyzingProject] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [viewMode, setViewMode] = useState('analytics'); // 'analytics' | 'detail'

  const categories = Object.keys(commodityPrices);
  const activeCommodity = selectedCommodity || categories[0] || null;

  const getHealthColor = (health) => {
    switch (health) {
      case 'Red': return 'bg-rose-500/10 text-rose-500 border-rose-500/20 dark:text-rose-400';
      case 'Yellow': return 'bg-amber-500/10 text-amber-500 border-amber-500/20 dark:text-amber-400';
      case 'Green': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 dark:text-emerald-400';
      default: return 'bg-[var(--border-subtle)] text-[var(--text-secondary)] border-[var(--border-subtle)]';
    }
  };

  const getSeverityBadge = (riskScore) => {
    if (riskScore >= 70) return 'bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-400 font-extrabold';
    if (riskScore >= 50) return 'bg-amber-500/10 border-amber-500/20 text-amber-500 dark:text-amber-400 font-bold';
    return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400';
  };

  const getImpactedProjects = (commodityKey) => {
    const list = [];
    structures.forEach(struct => {
      const proj = projects.find(p => String(p.project_id) === String(struct.project_id) || p.project_name === struct.project_name);
      if (!proj) return;
      let matchCount = 0;
      let matchedDetails = [];
      if (struct.uploads) {
        struct.uploads.forEach(u => {
          const name = String(u.file_name).toLowerCase();
          if (name.includes(commodityKey) || (commodityKey === 'semiconductor' && (name.includes('chip') || name.includes('ecu') || name.includes('wiring')))) {
            matchCount++;
            matchedDetails.push(`File: ${u.file_name.replace(/\.[^/.]+$/, '')}`);
          }
        });
      }
      if (matchCount > 0 || proj.project_name.toLowerCase().includes('mahindra') || proj.project_name.toLowerCase().includes('tata') || proj.project_name.toLowerCase().includes('ashok')) {
        if (['steel', 'copper', 'semiconductor', 'rubber'].includes(commodityKey)) {
          list.push({ project_id: proj.project_id, project_name: proj.project_name, current_health: proj.project_health || 'Green', relevance: matchCount > 0 ? 'Direct match' : 'Industrial profile default', details: matchedDetails.join(', ') || 'Chassis & wiring components mapping' });
        }
      } else if (proj.project_name.toLowerCase().includes('battery') || proj.project_name.toLowerCase().includes('ev')) {
        if (['lithium', 'copper', 'aluminium', 'semiconductor'].includes(commodityKey)) {
          list.push({ project_id: proj.project_id, project_name: proj.project_name, current_health: proj.project_health || 'Green', relevance: 'EV Battery profile mapping', details: 'Battery cells & thermal management' });
        }
      }
    });
    return list;
  };

  const impactedProjects = getImpactedProjects(activeCommodity || '');

  const runImpactAnalysis = async (project) => {
    setAnalyzingProject(project);
    setLoadingAnalysis(true);
    setAnalysisResult(null);
    try {
      const res = await API.get(`/budget/proposal/${encodeURIComponent(project.project_name)}`, {
        params: { industry: 'Automotive Manufacturing', procurement_categories: activeCommodity, currency: 'USD' }
      });
      setAnalysisResult(res.data);
    } catch (e) {
      toast.error('Failed to run volatility analysis');
      setAnalyzingProject(null);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  // ── Analytics Charts ─────────────────────────────────────────────────────

  const sparklineOption = useMemo(() => {
    if (!activeCommodity || !commodityPrices[activeCommodity]) return {};
    const data = commodityPrices[activeCommodity];
    const prev = data.previous_price || 0;
    const curr = data.current_price || 0;
    const vol = data.volatility_index || 0.05;
    const pts = [
      prev,
      prev + (curr - prev) * 0.2 + prev * vol * 0.3,
      prev + (curr - prev) * 0.45 - prev * vol * 0.2,
      prev + (curr - prev) * 0.72 + prev * vol * 0.15,
      curr,
    ].map(v => parseFloat(v.toFixed(2)));
    const isUp = curr >= prev;
    return {
      backgroundColor: 'transparent',
      tooltip: { show: false },
      grid: { left: 0, right: 0, top: 2, bottom: 2 },
      xAxis: { type: 'category', show: false, data: ['t-4', 't-3', 't-2', 't-1', 'now'] },
      yAxis: { type: 'value', show: false },
      series: [{
        type: 'line', data: pts, smooth: true, showSymbol: false,
        lineStyle: { color: isUp ? '#ef4444' : '#10b981', width: 1.5 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: isUp ? 'rgba(239,68,68,0.18)' : 'rgba(16,185,129,0.18)' },
              { offset: 1, color: 'transparent' }
            ]
          }
        }
      }]
    };
  }, [activeCommodity, commodityPrices]);

  // Risk comparison chart — improved spacing and legend
  const riskComparisonOption = useMemo(() => {
    if (categories.length === 0) return {};
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border-strong)',
        textStyle: { color: 'var(--text-primary)', fontSize: 11, fontFamily: 'Inter, sans-serif' }
      },
      legend: {
        data: ['Volatility', 'Procurement Risk', 'Supply Chain Risk'],
        bottom: 0,
        textStyle: { color: 'var(--text-secondary)', fontSize: 10, fontFamily: 'Inter, sans-serif' },
        itemWidth: 10,
        itemHeight: 10
      },
      grid: { left: 8, right: 8, top: 8, bottom: 40, containLabel: true },
      xAxis: {
        type: 'category',
        data: categories.map(c => c.charAt(0).toUpperCase() + c.slice(1)),
        axisLabel: {
          color: 'var(--text-secondary)',
          fontSize: 9,
          fontFamily: 'Inter, sans-serif',
          rotate: 15,
          interval: 0
        },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        max: 1,
        axisLabel: {
          color: 'var(--text-secondary)',
          fontSize: 9,
          formatter: v => (v * 100).toFixed(0) + '%',
          fontFamily: 'Inter, sans-serif'
        },
        splitLine: { lineStyle: { color: 'var(--border-subtle)', type: 'dashed' } },
        axisLine: { show: false }
      },
      series: [
        { name: 'Volatility', type: 'bar', barMaxWidth: 10, barGap: '15%', itemStyle: { color: '#f59e0b', borderRadius: [2, 2, 0, 0] }, data: categories.map(c => +(commodityPrices[c]?.volatility_index || 0).toFixed(3)) },
        { name: 'Procurement Risk', type: 'bar', barMaxWidth: 10, barGap: '15%', itemStyle: { color: '#ef4444', borderRadius: [2, 2, 0, 0] }, data: categories.map(c => +(commodityPrices[c]?.procurement_risk || 0).toFixed(3)) },
        { name: 'Supply Chain Risk', type: 'bar', barMaxWidth: 10, barGap: '15%', itemStyle: { color: '#6366f1', borderRadius: [2, 2, 0, 0] }, data: categories.map(c => +(commodityPrices[c]?.supply_chain_risk || 0).toFixed(3)) },
      ]
    };
  }, [categories, commodityPrices]);

  const priceChangeOption = useMemo(() => {
    if (categories.length === 0) return {};
    const sorted = [...categories].sort((a, b) => Math.abs(commodityPrices[b]?.percentage_change || 0) - Math.abs(commodityPrices[a]?.percentage_change || 0));
    const pcts = sorted.map(c => +(commodityPrices[c]?.percentage_change || 0).toFixed(2));
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border-strong)',
        textStyle: { color: 'var(--text-primary)', fontSize: 11, fontFamily: 'Inter, sans-serif' },
        formatter: p => `${p[0].name}: ${p[0].value >= 0 ? '+' : ''}${p[0].value}%`
      },
      grid: { left: 8, right: 24, top: 8, bottom: 4, containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: {
          color: 'var(--text-secondary)',
          fontSize: 9,
          formatter: v => `${v >= 0 ? '+' : ''}${v}%`,
          fontFamily: 'Inter, sans-serif'
        },
        splitLine: { lineStyle: { color: 'var(--border-subtle)', type: 'dashed' } },
        axisLine: { show: false }
      },
      yAxis: {
        type: 'category',
        data: sorted.map(c => c.charAt(0).toUpperCase() + c.slice(1)),
        axisLabel: { color: 'var(--text-secondary)', fontSize: 10, fontFamily: 'Inter, sans-serif' },
        axisLine: { show: false },
        axisTick: { show: false }
      },
      series: [{
        type: 'bar',
        barMaxWidth: 14,
        label: {
          show: true,
          position: 'right',
          fontSize: 9,
          color: 'var(--text-secondary)',
          fontFamily: 'Inter, sans-serif',
          formatter: (p) => `${p.value >= 0 ? '+' : ''}${p.value}%`
        },
        data: pcts.map(v => ({
          value: v,
          itemStyle: {
            color: v >= 0 ? '#ef4444' : '#10b981',
            borderRadius: v >= 0 ? [0, 3, 3, 0] : [3, 0, 0, 3]
          }
        }))
      }]
    };
  }, [categories, commodityPrices]);

  const renderAnalytics = () => {
    if (categories.length === 0) return <div className="text-center text-[var(--text-muted)] py-6 italic text-xs">No commodity data available</div>;

    const highRisk = categories.filter(c =>
      (commodityPrices[c]?.supply_chain_risk || 0) > 0.6 ||
      (commodityPrices[c]?.percentage_change || 0) > 10
    ).length;

    const avgVol = categories.length > 0
      ? (categories.reduce((a, c) => a + (commodityPrices[c]?.volatility_index || 0), 0) / categories.length * 100).toFixed(1)
      : 0;

    const topRiser = categories.reduce((a, c) =>
      (commodityPrices[c]?.percentage_change || 0) > (commodityPrices[a]?.percentage_change || 0) ? c : a,
      categories[0]
    );

    const topRiserPct = topRiser ? (commodityPrices[topRiser]?.percentage_change || 0) : 0;
    const topRiserColor = topRiserPct >= 10 ? 'text-rose-500' : topRiserPct >= 5 ? 'text-amber-500' : 'text-orange-400';

    return (
      <div className="p-3 flex flex-col gap-3">
        {/* KPI row */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Tracked Commodities', value: categories.length, color: 'text-[var(--text-primary)]', unit: '' },
            { label: `High Risk`, value: `${highRisk} / ${categories.length}`, color: 'text-rose-500', unit: '' },
            { label: 'Avg Volatility', value: `${avgVol}%`, color: 'text-amber-500', unit: '' },
            {
              label: 'Top Price Riser',
              value: topRiser ? topRiser.charAt(0).toUpperCase() + topRiser.slice(1) : '—',
              color: topRiserColor,
              unit: topRiserPct > 0 ? `+${topRiserPct.toFixed(1)}%` : ''
            },
          ].map(kpi => (
            <div key={kpi.label} className="bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg p-3 flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">{kpi.label}</span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-xl font-black leading-none ${kpi.color}`}>{kpi.value}</span>
                {kpi.unit && <span className="text-[9px] font-bold text-[var(--text-muted)]">{kpi.unit}</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-3">
          {/* Risk Comparison Chart */}
          <div className="col-span-5 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg p-2 flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-1">
              Risk Comparison (Volatility · Procurement · Supply Chain)
            </span>
            <ReactECharts option={riskComparisonOption} style={{ height: 165, width: '100%' }} opts={{ renderer: 'svg' }} />
          </div>

          {/* Price Change Ranking */}
          <div className="col-span-4 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg p-2 flex flex-col">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mb-1">Price Change Ranking</span>
            <ReactECharts option={priceChangeOption} style={{ height: 165, width: '100%' }} opts={{ renderer: 'svg' }} />
          </div>

          {/* Spot Prices Panel */}
          <div className="col-span-3 bg-[var(--bg)] border border-[var(--border-subtle)] rounded-lg p-2 flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">Spot Prices</span>
            <div className="flex flex-col gap-1 overflow-y-auto">
              {categories.map(cat => {
                const d = commodityPrices[cat];
                const pct = d?.percentage_change || 0;
                const isUp = pct >= 0;
                const unit = COMMODITY_UNITS[cat] || '';
                return (
                  <button
                    key={cat}
                    onClick={() => { setSelectedCommodity(cat); setViewMode('detail'); }}
                    className={`flex justify-between items-center px-2 py-1.5 rounded border text-[10px] transition-all cursor-pointer hover:bg-[var(--table-hover)] ${activeCommodity === cat ? 'border-blue-500/40 bg-[var(--table-hover)]' : 'border-[var(--border-subtle)] bg-transparent'}`}
                  >
                    <div className="flex flex-col items-start gap-0.5">
                      <span className="font-bold text-[var(--text-primary)] uppercase">{cat}</span>
                      {unit && <span className="text-[8px] text-[var(--text-muted)]">{unit}</span>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-semibold text-[var(--text-secondary)] tabular-nums">${(d?.current_price || 0).toFixed(1)}</span>
                      <span className={`font-bold text-[9px] tabular-nums ${getPctColor(pct)}`}>
                        {isUp ? '+' : ''}{pct.toFixed(1)}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDetail = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-subtle)] bg-[var(--surface)]">
      {/* Col 1: Commodity List with sparklines */}
      <div className="lg:col-span-4 p-3 overflow-y-auto max-h-[300px] flex flex-col gap-2">
        <h4 className="m-0 text-[var(--text-secondary)] uppercase tracking-wider text-[10px] font-bold flex items-center gap-1.5 mb-1 select-none">
          <BarChart3 size={12} className="text-[var(--text-muted)]" /> Spot Price Index
        </h4>
        <div className="flex flex-col gap-1.5">
          {categories.map(cat => {
            const data = commodityPrices[cat];
            const isSelected = activeCommodity === cat;
            const isUp = (data?.percentage_change || 0) >= 0;
            const prev = data?.previous_price || 0;
            const curr = data?.current_price || 0;
            const vol = data?.volatility_index || 0.05;
            const pts = [
              prev,
              prev + (curr - prev) * 0.25 + prev * vol * 0.3,
              prev + (curr - prev) * 0.5 - prev * vol * 0.2,
              prev + (curr - prev) * 0.75 + prev * vol * 0.1,
              curr
            ].map(v => parseFloat(v.toFixed(2)));
            const miniOption = {
              backgroundColor: 'transparent', tooltip: { show: false }, animation: false,
              grid: { left: 0, right: 0, top: 1, bottom: 1 },
              xAxis: { type: 'category', show: false, data: [0, 1, 2, 3, 4] },
              yAxis: { type: 'value', show: false, min: Math.min(...pts) * 0.98, max: Math.max(...pts) * 1.02 },
              series: [{ type: 'line', data: pts, smooth: true, showSymbol: false, lineStyle: { color: isUp ? '#ef4444' : '#10b981', width: 1.5 } }]
            };
            return (
              <div
                key={cat}
                onClick={() => { setSelectedCommodity(cat); setAnalyzingProject(null); setAnalysisResult(null); }}
                className={`p-2 rounded-lg border transition-all cursor-pointer flex justify-between items-center hover:bg-[var(--table-hover)] ${isSelected ? 'bg-[var(--table-hover)] border-blue-500/40 shadow-sm' : 'bg-[var(--surface)] border-[var(--border-subtle)]'}`}
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-bold text-[var(--text-primary)] text-[11px] uppercase truncate">{cat}</span>
                  <span className="text-[9px] text-[var(--text-muted)] truncate">
                    SCR: {((data?.supply_chain_risk || 0) * 100).toFixed(0)}%
                    {COMMODITY_UNITS[cat] ? ` · ${COMMODITY_UNITS[cat]}` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ReactECharts option={miniOption} style={{ height: 28, width: 60 }} opts={{ renderer: 'svg' }} />
                  <div className="text-right min-w-[52px]">
                    <div className="font-bold text-[var(--text-primary)] text-[10px] tabular-nums">${(data?.current_price || 0).toFixed(1)}</div>
                    <div className={`text-[9px] font-bold flex items-center gap-0.5 justify-end tabular-nums ${isUp ? 'text-rose-500' : 'text-emerald-500'}`}>
                      {isUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                      <span>{isUp ? '+' : ''}{(data?.percentage_change || 0).toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Col 2: Affected Projects */}
      <div className="lg:col-span-4 p-3 overflow-y-auto max-h-[300px] flex flex-col gap-2">
        <h4 className="m-0 text-[var(--text-secondary)] uppercase tracking-wider text-[10px] font-bold flex items-center gap-1.5 mb-1 select-none">
          <Cpu size={12} className="text-[var(--text-muted)]" /> Impacted Projects
        </h4>
        {impactedProjects.length === 0 ? (
          <div className="text-center text-[var(--text-muted)] text-xs italic py-6 select-none">No projects impacted by this commodity</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {impactedProjects.map(proj => {
              const isSelected = analyzingProject?.project_id === proj.project_id;
              return (
                <div
                  key={proj.project_id}
                  onClick={() => runImpactAnalysis(proj)}
                  className={`p-2 rounded-lg border transition-all cursor-pointer flex flex-col gap-1 hover:bg-[var(--table-hover)] ${isSelected ? 'bg-[var(--table-hover)] border-blue-500/40' : 'bg-[var(--surface)] border-[var(--border-subtle)]'}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-semibold text-[var(--text-primary)] text-[11px] truncate">{proj.project_name}</span>
                    <span className={`text-[8px] px-1.5 py-0.5 border rounded uppercase shrink-0 ${getHealthColor(proj.current_health)}`}>
                      {proj.current_health === 'Red' ? 'Critical' : proj.current_health === 'Yellow' ? 'At Risk' : proj.current_health}
                    </span>
                  </div>
                  <div className="text-[9px] text-[var(--text-secondary)] leading-normal truncate">{proj.details}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Col 3: Volatility / Analysis */}
      <div className="lg:col-span-4 p-3 flex flex-col gap-2">
        <h4 className="m-0 text-[var(--text-secondary)] uppercase tracking-wider text-[10px] font-bold select-none">Volatility Assessment</h4>
        {loadingAnalysis ? (
          <div className="flex-1 flex flex-col items-center justify-center text-[var(--text-secondary)] text-xs py-6">
            <RefreshCw className="animate-spin text-blue-500 mb-1" size={18} />
            <span>Calculating risk metrics...</span>
          </div>
        ) : !analyzingProject ? (
          <div className="flex flex-col gap-1 flex-1">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--text-muted)]">Risk Profile — {activeCommodity}</span>
            {activeCommodity && commodityPrices[activeCommodity] && (
              <ReactECharts option={sparklineOption} style={{ height: 80, width: '100%' }} opts={{ renderer: 'svg' }} />
            )}
            <ReactECharts option={priceChangeOption} style={{ height: 130, width: '100%' }} opts={{ renderer: 'svg' }} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col gap-3 text-[11px]">
            <div className="bg-[var(--surface)] border border-[var(--border-subtle)] p-2.5 rounded-lg flex flex-col gap-1.5 shadow-sm">
              <div className="font-bold text-[var(--text-primary)] text-xs">{analyzingProject.project_name}</div>
              {analysisResult ? (
                <div className="flex flex-col gap-1.5 text-[11px] mt-1">
                  <div className="flex justify-between border-b border-[var(--border-subtle)] pb-1.5">
                    <span className="text-[var(--text-secondary)]">Overall risk:</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase border font-bold ${getSeverityBadge(analysisResult.reconciliation?.raw_material_risk_buffer ? 80 : 40)}`}>
                      {analysisResult.reconciliation?.raw_material_risk_buffer ? 'High' : 'Medium'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--border-subtle)] pb-1.5">
                    <span className="text-[var(--text-secondary)]">Material Buffer (USD):</span>
                    <span className="font-bold text-rose-500 tabular-nums">+${Math.round(analysisResult.reconciliation?.raw_material_risk_buffer || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Suggested Budget:</span>
                    <span className="font-bold text-[var(--text-primary)] tabular-nums">${Math.round(analysisResult.suggested_budget_usd || 0).toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <span className="text-[var(--text-muted)] italic text-xs">Running analysis...</span>
              )}
            </div>
            {analysisResult && (
              <button
                onClick={async () => {
                  try {
                    await API.post('/budget/revisions', {
                      project_id: String(analyzingProject.project_id),
                      project_name: analyzingProject.project_name,
                      pm_name: 'System Analysis',
                      previous_budget: analysisResult.original_budget_usd,
                      revised_budget: analysisResult.suggested_budget_usd,
                      reasons: `AI Procurement Buffer proposal for category: ${activeCommodity}.`
                    });
                    toast.success('Volatility risk proposal submitted');
                    setAnalyzingProject(null); setAnalysisResult(null); onRefresh();
                  } catch (e) { toast.error('Failed to submit revision proposal'); }
                }}
                className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded cursor-pointer transition-all active:scale-95 text-center flex items-center justify-center gap-1.5 text-xs"
              >
                <RefreshCw size={11} /> Submit Revision Request
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full bg-[var(--surface)] border border-[var(--border-strong)] rounded-lg overflow-hidden flex flex-col shadow-sm">
      <div className="px-4 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--surface)] flex justify-between items-center shrink-0">
        <h3 className="m-0 text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-1.5">
          <Zap size={13} className="text-orange-500" /> Supply Chain Risk Center
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--text-secondary)] bg-[var(--bg)] px-2 py-0.5 rounded border border-[var(--border-subtle)] font-bold">
            {categories.length} Commodities
          </span>
          <div className="flex border border-[var(--border-subtle)] rounded overflow-hidden">
            <button
              onClick={() => setViewMode('analytics')}
              className={`px-2.5 py-1 flex items-center gap-1 text-[10px] font-bold uppercase cursor-pointer border-0 outline-none transition-colors ${viewMode === 'analytics' ? 'bg-blue-600 text-white' : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--table-hover)]'}`}
            >
              <BarChart3 size={10} /> Analytics
            </button>
            <button
              onClick={() => setViewMode('detail')}
              className={`px-2.5 py-1 flex items-center gap-1 text-[10px] font-bold uppercase cursor-pointer border-0 outline-none transition-colors ${viewMode === 'detail' ? 'bg-blue-600 text-white' : 'bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--table-hover)]'}`}
            >
              <Layers size={10} /> Detail
            </button>
          </div>
        </div>
      </div>
      {viewMode === 'analytics' ? renderAnalytics() : renderDetail()}
    </div>
  );
};

export default SupplyChainRiskCenter;
