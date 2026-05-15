import React, { useState } from 'react';
import { RefreshCw, Trash2, AlertTriangle, ShieldAlert } from 'lucide-react';

const Maintenance = () => {
    const [isClearing, setIsClearing] = useState(false);
    const [status, setStatus] = useState(null);

    const handleClearCache = () => {
        setIsClearing(true);
        setStatus({ type: 'info', message: 'Analyzing local storage...' });

        setTimeout(() => {
            try {
                // List of keys to clear
                const keysToClear = [
                    'project_dashboard_modules',
                    'upload_tracker_modules',
                    'project_dashboard_configs',
                    'upload_trackers'
                ];

                keysToClear.forEach(key => localStorage.removeItem(key));
                sessionStorage.removeItem('project_dashboard_configs');

                setStatus({ type: 'success', message: 'Cache cleared successfully. Reloading application state...' });
                
                // Force a reload after a short delay to re-fetch clean data from API
                setTimeout(() => {
                    window.location.reload();
                }, 1500);

            } catch (error) {
                console.error('Error clearing cache:', error);
                setStatus({ type: 'error', message: 'Failed to clear some cache items.' });
            } finally {
                setIsClearing(false);
            }
        }, 1000);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div>
                <h2 className="text-[20px] font-bold text-text-primary tracking-tight mb-2">System Maintenance</h2>
                <p className="text-[13px] text-text-secondary leading-relaxed max-w-2xl">
                    Perform system-level maintenance tasks to resolve state inconsistencies and optimize performance.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Clear Cache Card */}
                <div className="bg-app-surface border border-border p-8 flex flex-col md:flex-row items-start gap-6 transition-all hover:border-border-strong">
                    <div className="p-4 bg-status-warning/10 rounded-xl">
                        <RefreshCw className={`h-8 w-8 text-status-warning ${isClearing ? 'animate-spin' : ''}`} />
                    </div>
                    
                    <div className="flex-1 space-y-4">
                        <div>
                            <h3 className="text-[15px] font-semibold text-text-primary mb-1">Clear Application Cache</h3>
                            <p className="text-[13px] text-text-secondary leading-relaxed">
                                Wipes locally stored project structures, dashboard configurations, and upload metadata. 
                                Use this if you see 404 errors for deleted datasets or inconsistent sidebar items.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 p-3 bg-status-error/10 border border-status-error/20 rounded-lg">
                            <ShieldAlert className="h-4 w-4 text-status-error shrink-0" />
                            <p className="text-[11px] text-status-error font-medium">
                                This will force a page reload. You will not lose any server-side data.
                            </p>
                        </div>

                        {status && (
                            <div className={`p-3 text-[11px] font-bold uppercase tracking-wider rounded ${
                                status.type === 'success' ? 'bg-status-success/10 text-status-success' : 
                                status.type === 'error' ? 'bg-status-error/10 text-status-error' : 'bg-brand-accent/10 text-brand-accent'
                            }`}>
                                {status.message}
                            </div>
                        )}

                        <button
                            onClick={handleClearCache}
                            disabled={isClearing}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary hover:bg-black text-white text-[11px] font-bold uppercase tracking-[0.15em] rounded transition-all disabled:opacity-50"
                        >
                            {isClearing ? 'Clearing...' : 'Clear All Cache & Reload'}
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                {/* Database Health (Placeholder) */}
                <div className="bg-app-surface border border-border p-8 flex flex-col md:flex-row items-start gap-6 opacity-60">
                    <div className="p-4 bg-brand-accent/10 rounded-xl">
                        <AlertTriangle className="h-8 w-8 text-brand-accent" />
                    </div>
                    
                    <div className="flex-1 space-y-2">
                        <h3 className="text-[15px] font-semibold text-text-primary">Database Integrity Check</h3>
                        <p className="text-[13px] text-text-secondary leading-relaxed">
                            Verify consistency between file system trackers and database records. (Available in next update)
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Maintenance;
