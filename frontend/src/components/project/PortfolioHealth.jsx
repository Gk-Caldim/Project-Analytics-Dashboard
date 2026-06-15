import React, { useMemo } from 'react';
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock, Shield } from 'lucide-react';

/**
 * Portfolio Health Matrix — shows health across multiple dimensions
 * Used in executive dashboard overview
 */
const PortfolioHealth = ({ projects = [] }) => {
    const healthData = useMemo(() => {
        if (!projects || projects.length === 0) {
            return {
                overall: { label: 'Overall Health', score: 0, status: 'neutral', count: 0, total: 0 },
                schedule: { label: 'Schedule Health', score: 0, status: 'neutral', count: 0, total: 0 },
                budget: { label: 'Budget Health', score: 0, status: 'neutral', count: 0, total: 0 },
                risk: { label: 'Risk Status', score: 0, status: 'neutral', count: 0, total: 0 },
            };
        }

        const total = projects.length;
        const getActiveCount = (field, goodValues) => {
            return projects.filter(p => goodValues.includes(String(p[field] || '').toLowerCase())).length;
        };

        const scheduleOnTrack = getActiveCount('status', ['on-track', 'on track', 'active', 'completed']);
        const budgetOnTrack = getActiveCount('budget_status', ['on-track', 'on track', 'under', 'within']);
        const lowRisk = getActiveCount('risk_level', ['low', 'none', '']);

        const calcScore = (good) => total > 0 ? Math.round((good / total) * 100) : 0;
        const getStatus = (score) => score >= 80 ? 'good' : score >= 50 ? 'warning' : 'critical';

        const schedScore = calcScore(scheduleOnTrack);
        const budgetScore = calcScore(budgetOnTrack);
        const riskScore = calcScore(lowRisk);
        const overallScore = Math.round((schedScore + budgetScore + riskScore) / 3);

        return {
            overall: { label: 'Overall Health', score: overallScore, status: getStatus(overallScore), count: total, total },
            schedule: { label: 'Schedule', score: schedScore, status: getStatus(schedScore), count: scheduleOnTrack, total },
            budget: { label: 'Budget', score: budgetScore, status: getStatus(budgetScore), count: budgetOnTrack, total },
            risk: { label: 'Risk', score: riskScore, status: getStatus(riskScore), count: lowRisk, total },
        };
    }, [projects]);

    const statusConfig = {
        good: { color: 'var(--green)', bg: 'var(--green-bg)', icon: CheckCircle2, label: 'Healthy' },
        warning: { color: 'var(--amber)', bg: 'var(--amber-bg)', icon: AlertTriangle, label: 'At Risk' },
        critical: { color: 'var(--red)', bg: 'var(--red-bg)', icon: Shield, label: 'Critical' },
        neutral: { color: 'var(--text-muted)', bg: 'var(--surface-raised)', icon: Clock, label: 'N/A' },
    };

    const dimensions = ['schedule', 'budget', 'risk'];

    return (
        <div className="enterprise-card">
            <div className="enterprise-card-header">
                <h3 className="enterprise-card-title flex items-center gap-2">
                    <Activity size={15} style={{ color: 'var(--text-muted)' }} />
                    Portfolio Health
                </h3>
                <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
                    {healthData.overall.total} projects
                </span>
            </div>
            <div className="enterprise-card-body">
                {/* Overall Score */}
                <div className="flex items-center gap-4 pb-4 mb-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <div 
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold"
                        style={{ 
                            background: statusConfig[healthData.overall.status].bg, 
                            color: statusConfig[healthData.overall.status].color 
                        }}
                    >
                        {healthData.overall.score}%
                    </div>
                    <div>
                        <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {statusConfig[healthData.overall.status].label}
                        </div>
                        <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                            Composite score across all dimensions
                        </div>
                    </div>
                </div>

                {/* Dimension Bars */}
                <div className="flex flex-col gap-3">
                    {dimensions.map(dim => {
                        const data = healthData[dim];
                        const config = statusConfig[data.status];
                        return (
                            <div key={dim}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                                        {data.label}
                                    </span>
                                    <span className="text-[12px] font-semibold tabular-nums" style={{ color: config.color }}>
                                        {data.count}/{data.total}
                                    </span>
                                </div>
                                <div className="progress-bar">
                                    <div 
                                        className="progress-bar-fill" 
                                        style={{ 
                                            width: `${data.score}%`, 
                                            background: config.color 
                                        }} 
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default PortfolioHealth;
