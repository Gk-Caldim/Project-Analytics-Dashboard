import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * Enterprise KPI Card — compact, data-dense metric display
 * Used in dashboard executive overview row
 */
const KPICard = ({ 
    label, 
    value, 
    trend, // { value: '+12%', direction: 'up' | 'down' | 'neutral' }
    icon: Icon,
    subtitle,
    onClick,
    className = '',
}) => {
    const trendColors = {
        up: 'var(--green)',
        down: 'var(--red)',
        neutral: 'var(--text-muted)',
    };

    const TrendIcon = {
        up: TrendingUp,
        down: TrendingDown,
        neutral: Minus,
    };

    const TrendIconComponent = trend ? TrendIcon[trend.direction] || Minus : null;

    return (
        <div 
            className={`kpi-card group ${onClick ? 'cursor-pointer hover:border-[var(--border-default)]' : ''} ${className}`}
            onClick={onClick}
            style={{ transition: 'border-color 150ms ease' }}
        >
            <div className="flex items-start justify-between mb-1">
                <span className="kpi-card-label">{label}</span>
                {Icon && (
                    <div 
                        className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0" 
                        style={{ background: 'var(--surface-raised)', color: 'var(--text-muted)' }}
                    >
                        <Icon size={14} />
                    </div>
                )}
            </div>

            <div className="kpi-card-value">{value}</div>

            {(trend || subtitle) && (
                <div className="flex items-center gap-2 mt-1.5">
                    {trend && (
                        <span 
                            className="kpi-card-trend"
                            style={{ color: trendColors[trend.direction] }}
                        >
                            {TrendIconComponent && <TrendIconComponent size={12} />}
                            <span>{trend.value}</span>
                        </span>
                    )}
                    {subtitle && (
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            {subtitle}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

/**
 * KPI Row — horizontal layout for multiple KPI cards
 */
export const KPIRow = ({ children, className = '' }) => (
    <div className={`grid gap-4 ${className}`} style={{ gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))` }}>
        {children}
    </div>
);

export default KPICard;
