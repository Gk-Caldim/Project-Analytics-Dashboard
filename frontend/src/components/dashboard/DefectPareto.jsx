import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { BarChart2 } from 'lucide-react';

/**
 * DefectPareto — Pareto chart (bar + cumulative line)
 * Props:
 *   patterns: [{category, count, pct, cumulative_pct, is_vital_few}]
 *   totalDefects: number
 */
const DefectPareto = ({ patterns = [], totalDefects = 0 }) => {
  const option = useMemo(() => {
    if (!patterns.length) return {};
    const labels = patterns.map(p => p.category);
    const counts = patterns.map(p => p.count);
    const cumulatives = patterns.map(p => p.cumulative_pct);
    const vitalFew = patterns.map(p => p.is_vital_few);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: 'var(--surface)',
        borderColor: 'var(--border-strong)',
        textStyle: { color: 'var(--text-primary)', fontSize: 11, fontFamily: 'Inter, sans-serif' },
        formatter: (params) => {
          const bar = params.find(p => p.seriesType === 'bar');
          const line = params.find(p => p.seriesType === 'line');
          return `<div style="font-weight:bold;margin-bottom:4px">${bar?.axisValue}</div>
            Count: <b>${bar?.value}</b><br/>
            Cumulative: <b>${line?.value?.toFixed(1)}%</b>`;
        }
      },
      legend: {
        data: ['Defect Count', 'Cumulative %'],
        bottom: 0,
        textStyle: { color: 'var(--text-secondary)', fontSize: 9, fontFamily: 'Inter, sans-serif' },
        itemWidth: 10,
        itemHeight: 10,
      },
      grid: { left: 8, right: 40, top: 8, bottom: 28, containLabel: true },
      xAxis: {
        type: 'category',
        data: labels.map(l => l.length > 12 ? l.slice(0, 12) + '…' : l),
        axisLabel: { color: 'var(--text-secondary)', fontSize: 9, fontFamily: 'Inter, sans-serif', rotate: labels.length > 5 ? 20 : 0 },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Count',
          nameTextStyle: { color: 'var(--text-muted)', fontSize: 8 },
          axisLabel: { color: 'var(--text-secondary)', fontSize: 9, fontFamily: 'Inter, sans-serif' },
          splitLine: { lineStyle: { color: 'var(--border-subtle)', type: 'dashed' } },
          axisLine: { show: false },
        },
        {
          type: 'value',
          name: '%',
          nameTextStyle: { color: 'var(--text-muted)', fontSize: 8 },
          max: 100,
          axisLabel: { color: 'var(--text-secondary)', fontSize: 9, formatter: '{value}%', fontFamily: 'Inter, sans-serif' },
          splitLine: { show: false },
          axisLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Defect Count',
          type: 'bar',
          barMaxWidth: 28,
          data: counts.map((c, i) => ({
            value: c,
            itemStyle: {
              color: vitalFew[i] ? '#f59e0b' : '#6366f1',
              borderRadius: [3, 3, 0, 0],
            },
          })),
        },
        {
          name: 'Cumulative %',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          data: cumulatives,
          lineStyle: { color: '#ef4444', width: 2 },
          itemStyle: { color: '#ef4444' },
          symbolSize: 6,
          // 80% threshold line via markLine
          markLine: {
            silent: true,
            lineStyle: { color: '#ef4444', type: 'dashed', opacity: 0.5 },
            data: [{ yAxis: 80 }],
            label: { formatter: '80%', color: '#ef4444', fontSize: 9 },
          },
        },
      ],
    };
  }, [patterns]);

  if (!patterns.length) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-[var(--text-muted)] text-xs italic gap-2">
        <BarChart2 size={20} className="opacity-40" />
        No defect data available
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-[9px] uppercase tracking-wider font-bold text-[var(--text-muted)] flex items-center gap-1">
          <BarChart2 size={9} /> Defect Pareto Analysis
        </span>
        <span className="text-[9px] text-[var(--text-muted)]">
          Total: <span className="font-bold text-amber-400">{totalDefects}</span>
        </span>
      </div>
      <ReactECharts
        option={option}
        style={{ height: 180, width: '100%' }}
        opts={{ renderer: 'svg' }}
      />
      {/* Vital few legend */}
      <div className="flex items-center gap-3 px-1 flex-wrap">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-amber-400" />
          <span className="text-[8px] text-[var(--text-muted)]">Vital few (80% of defects)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-indigo-400" />
          <span className="text-[8px] text-[var(--text-muted)]">Trivial many</span>
        </div>
      </div>
    </div>
  );
};

export default DefectPareto;
