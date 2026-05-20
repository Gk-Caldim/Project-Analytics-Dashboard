import React, { useState } from 'react';
import { 
    RefreshCw, 
    Trash2, 
    AlertTriangle, 
    ShieldAlert, 
    Database, 
    CheckCircle2, 
    XCircle, 
    AlertCircle, 
    ChevronDown, 
    ChevronUp, 
    Clock,
    Activity,
    Gauge,
    Send
} from 'lucide-react';
import API from '../../../utils/api';

const staticChecks = [
    { id: 'duplicate_ids', name: 'No duplicate IDs', desc: 'Verifies that primary keys and logical business IDs (employee_id, project_id) are unique across all records.' },
    { id: 'missing_fields', name: 'No missing required fields', desc: 'Scans critical tables for null values in required properties (e.g., employee names, project managers, user emails).' },
    { id: 'foreign_keys', name: 'Foreign key relationships are valid', desc: 'Verifies referential integrity across all related tables, identifying records with parent IDs that do not exist.' },
    { id: 'orphan_records', name: 'No orphan records', desc: 'Identifies detail and audit rows (actions, comments, ingestions, columns) that are orphaned and have no parent association.' },
    { id: 'negative_values', name: 'No negative quantities/prices', desc: 'Ensures financial ledgers, budgets, and procurement indexes contain only non-negative quantities and prices.' },
    { id: 'valid_dates', name: 'Dates are valid', desc: 'Validates chronological order (start vs end date) and standard date formatting across all entities.' },
    { id: 'statuses', name: 'Status values are correct', desc: 'Checks state fields in issues, projects, budgets, and employee profiles against approved system workflows.' },
    { id: 'duplicate_emails_codes', name: 'No duplicate invoices/emails/serial numbers', desc: 'Enforces unique business constraints, scanning for duplicate email registrations and calendar subscription codes.' },
    { id: 'completed_transactions', name: 'Transactions completed fully', desc: 'Verifies transaction state completeness, ensuring approved budgets and cancelled meetings have complete metadata.' },
    { id: 'inventory_stock', name: 'Inventory stock is accurate', desc: 'Scans dynamic database rows containing key inventory/stock terms to ensure values are non-negative.' },
    { id: 'bom_material_links', name: 'BOM/material links are valid', desc: 'Validates category intelligence confidence mapping boundaries and system industry profile registries.' },
    { id: 'file_references', name: 'File references exist', desc: 'Cross-checks file references stored in database metadata against actual physical files stored on the server.' },
    { id: 'json_validity', name: 'JSON data is valid', desc: 'Verifies that dynamic custom configurations and schema mappings are correctly formatted JSON objects.' },
    { id: 'audit_logs', name: 'Audit logs are correct', desc: 'Inspects system activity ledgers and issue history logs for missing actors, timestamps, or empty changes.' },
    { id: 'deleted_records', name: 'Deleted records behave properly', desc: 'Checks soft-delete flags (deleted_meeting) and detects orphaned transcripts or minutes linked to deleted meetings.' },
    { id: 'index_corruption', name: 'Indexes are not corrupted', desc: 'Scans database schema catalogs to verify index status and detect invalid or failed concurrently built indexes.' },
    { id: 'user_role_mappings', name: 'User-role mappings are valid', desc: 'Validates role mapping, ensuring that user/employee roles match a profile defined in the Roles permissions table.' }
];

const Maintenance = () => {
    const [isClearing, setIsClearing] = useState(false);
    const [cacheStatus, setCacheStatus] = useState(null);
    
    // Integrity check states
    const [isChecking, setIsChecking] = useState(false);
    const [integrityResults, setIntegrityResults] = useState(null);
    const [expandedCheck, setExpandedCheck] = useState(null);
    const [checkError, setCheckError] = useState(null);
    const [showWarningAlert, setShowWarningAlert] = useState(true);

    // Latency states
    const [isTestingLatency, setIsTestingLatency] = useState(false);
    const [latencyResults, setLatencyResults] = useState(null);
    const [latencyError, setLatencyError] = useState(null);
    const [feedbackEmail, setFeedbackEmail] = useState('');
    const [feedbackComments, setFeedbackComments] = useState('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

    const handleClearCache = () => {
        setIsClearing(true);
        setCacheStatus({ type: 'info', message: 'Analyzing local storage...' });

        setTimeout(() => {
            try {
                const keysToClear = [
                    'project_dashboard_modules',
                    'upload_tracker_modules',
                    'project_dashboard_configs',
                    'upload_trackers'
                ];

                keysToClear.forEach(key => localStorage.removeItem(key));
                sessionStorage.removeItem('project_dashboard_configs');

                setCacheStatus({ type: 'success', message: 'Cache cleared successfully. Reloading application state...' });
                
                setTimeout(() => {
                    window.location.reload();
                }, 1500);

            } catch (error) {
                console.error('Error clearing cache:', error);
                setCacheStatus({ type: 'error', message: 'Failed to clear some cache items.' });
            } finally {
                setIsClearing(false);
            }
        }, 1000);
    };

    const handleRunIntegrityCheck = async () => {
        setIsChecking(true);
        setCheckError(null);
        try {
            const response = await API.get('/settings/db-integrity');
            if (response.data && response.data.status === 'success') {
                setIntegrityResults(response.data);
            } else {
                setCheckError('Invalid diagnostic response structure.');
            }
        } catch (error) {
            console.error('Error executing database integrity check:', error);
            setCheckError(error.response?.data?.detail || 'Failed to complete database diagnostics. Please ensure database connection is healthy.');
        } finally {
            setIsChecking(false);
        }
    };

    const handleTestLatency = async () => {
        setIsTestingLatency(true);
        setLatencyError(null);
        setLatencyResults(null);
        setFeedbackSubmitted(false);
        try {
            const response = await API.get('/settings/db-latency', {
                timeout: 85000
            });
            if (response.data && response.data.status === 'success') {
                setLatencyResults(response.data);
            } else {
                setLatencyError('Invalid diagnostic response structure.');
            }
        } catch (error) {
            console.error('Error checking database latency:', error);
            setLatencyError(error.response?.data?.detail || 'Failed to complete database latency tests.');
        } finally {
            setIsTestingLatency(false);
        }
    };

    const handleSubmitFeedback = async () => {
        setIsSubmittingFeedback(true);
        try {
            const response = await API.post('/settings/db-latency/feedback', {
                measured_latency_ms: latencyResults?.metrics?.total_latency_ms || 60000.0,
                comments: feedbackComments,
                user_email: feedbackEmail || null
            });
            if (response.data && response.data.status === 'success') {
                setFeedbackSubmitted(true);
                setFeedbackComments('');
            }
        } catch (error) {
            console.error('Error submitting latency feedback:', error);
            alert('Failed to submit support ticket. Please try again.');
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    const toggleCheckExpansion = (id) => {
        if (expandedCheck === id) {
            setExpandedCheck(null);
        } else {
            setExpandedCheck(id);
        }
    };

    const renderDetailSection = (check) => {
        if (!check.details || check.details.length === 0) {
            return (
                <div className="text-[12px] text-text-secondary italic">
                    No anomalies or schema violations detected for this constraint.
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <p className="text-[12px] font-semibold text-status-error uppercase tracking-wider">
                    Detailed Violation Log:
                </p>
                <div className="overflow-x-auto border border-border bg-app-surface/50 rounded p-4 font-mono text-[11px] text-text-secondary leading-relaxed custom-scrollbar">
                    {check.details.map((detail, idx) => (
                        <div key={idx} className="border-b border-border/40 last:border-0 pb-3 mb-3 last:pb-0 last:mb-0">
                            {detail.table && (
                                <div className="mb-1">
                                    <span className="text-brand-accent font-bold">Table:</span> {detail.table}
                                </div>
                            )}
                            {detail.field && (
                                <div className="mb-1">
                                    <span className="text-brand-accent font-bold">Field:</span> {detail.field}
                                </div>
                            )}
                            {detail.fk_field && (
                                <div className="mb-1">
                                    <span className="text-brand-accent font-bold">Relation:</span> {detail.fk_field} ➔ {detail.parent_table}
                                </div>
                            )}
                            {detail.issue && (
                                <div className="mb-1">
                                    <span className="text-status-warning font-bold">Anomaly:</span> {detail.issue}
                                </div>
                            )}
                            {detail.fields && (
                                <div className="mb-1">
                                    <span className="text-brand-accent font-bold">Missing Fields:</span> {JSON.stringify(detail.fields)}
                                </div>
                            )}
                            {detail.affected_ids && (
                                <div className="mb-1">
                                    <span className="text-status-error font-bold">Affected Record IDs:</span> {detail.affected_ids.join(', ')}
                                </div>
                            )}
                            {detail.orphans_count && (
                                <div className="mb-1">
                                    <span className="text-status-error font-bold">Orphans Count:</span> {detail.orphans_count}
                                </div>
                            )}
                            {detail.violations && detail.violations.length > 0 && (
                                <div className="mt-2 pl-4 border-l-2 border-border">
                                    <span className="font-bold text-text-primary">Violations Sample:</span>
                                    <pre className="mt-1 whitespace-pre overflow-x-auto text-[10px]">
                                        {JSON.stringify(detail.violations, null, 2)}
                                    </pre>
                                </div>
                            )}
                            {detail.sample && detail.sample.length > 0 && (
                                <div className="mt-2 pl-4 border-l-2 border-border">
                                    <span className="font-bold text-text-primary">Sample Records:</span>
                                    <pre className="mt-1 whitespace-pre overflow-x-auto text-[10px]">
                                        {JSON.stringify(detail.sample, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const getChecksList = () => {
        return staticChecks.map(sc => {
            const apiCheck = integrityResults?.checks?.find(ac => ac.id === sc.id);
            return {
                ...sc,
                status: apiCheck ? apiCheck.status : 'PENDING',
                duration_ms: apiCheck ? apiCheck.duration_ms : null,
                details: apiCheck ? apiCheck.details : null
            };
        });
    };

    const checksList = getChecksList();

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div>
                <h2 className="text-[20px] font-bold text-text-primary tracking-tight mb-2">System Maintenance & Health</h2>
                <p className="text-[13px] text-text-secondary leading-relaxed max-w-2xl">
                    Diagnose structural anomalies, verify database integrity, measure latency thresholds, and run system level performance tools.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Clear Cache Card */}
                <div className="bg-app-surface border border-border p-8 transition-all hover:border-border-strong rounded-lg">
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <RefreshCw className={`h-4.5 w-4.5 text-status-warning ${isClearing ? 'animate-spin' : ''}`} />
                                <h3 className="text-[15px] font-semibold text-text-primary">Clear Application Cache</h3>
                            </div>
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

                        {cacheStatus && (
                            <div className={`p-3 text-[11px] font-bold uppercase tracking-wider rounded ${
                                cacheStatus.type === 'success' ? 'bg-status-success/10 text-status-success' : 
                                cacheStatus.type === 'error' ? 'bg-status-error/10 text-status-error' : 'bg-brand-accent/10 text-brand-accent'
                            }`}>
                                {cacheStatus.message}
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

                {/* Database Health Card */}
                <div className="bg-app-surface border border-border p-8 space-y-6 transition-all hover:border-border-strong rounded-lg">
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Database className="h-4.5 w-4.5 text-brand-accent" />
                                <h3 className="text-[15px] font-semibold text-text-primary">Database Integrity Diagnostic</h3>
                            </div>
                            <p className="text-[13px] text-text-secondary leading-relaxed">
                                Scans system tables, indexes, and directory assets to detect relational orphans, invalid values, date inconsistencies, missing attributes, or index corruption.
                            </p>
                        </div>

                        {showWarningAlert && !integrityResults && !isChecking && (
                            <div className="flex items-start justify-between gap-3 p-4 bg-status-warning/10 border border-status-warning/20 rounded-lg">
                                <div className="flex gap-3">
                                    <AlertTriangle className="h-5 w-5 text-status-warning shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="text-[12px] font-bold text-status-warning uppercase tracking-wider">Diagnostic Advisory</p>
                                        <p className="text-[12px] text-text-secondary leading-relaxed">
                                            Running integrity diagnostics triggers database-wide table and catalog index scans. 
                                            This process may take 2 to 5 seconds depending on database volume. 
                                            We advise running this diagnostic during low-traffic/off-peak windows.
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setShowWarningAlert(false)} 
                                    className="text-text-muted hover:text-text-primary text-[11px] font-bold uppercase tracking-wider px-2"
                                >
                                    Dismiss
                                </button>
                            </div>
                        )}

                        {checkError && (
                            <div className="p-3 text-[11px] bg-status-error/10 text-status-error font-medium border border-status-error/20 rounded">
                                Error executing checks: {checkError}
                            </div>
                        )}

                        <button
                            onClick={handleRunIntegrityCheck}
                            disabled={isChecking}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary hover:bg-black text-white text-[11px] font-bold uppercase tracking-[0.15em] rounded transition-all disabled:opacity-50"
                        >
                            {isChecking ? 'Executing Diagnostics...' : 'Run Integrity Diagnostics'}
                            <Activity className={`h-3.5 w-3.5 ${isChecking ? 'animate-pulse' : ''}`} />
                        </button>
                    </div>

                    {/* Progress / Loading State */}
                    {isChecking && (
                        <div className="border-t border-border pt-6 space-y-4 animate-pulse">
                            <div className="flex items-center gap-3">
                                <RefreshCw className="h-5 w-5 text-brand-accent animate-spin" />
                                <span className="text-[13px] font-semibold text-text-primary">Running full integrity scan...</span>
                            </div>
                            <div className="w-full bg-border/40 h-1.5 rounded overflow-hidden">
                                <div className="bg-brand-accent h-full w-2/3 rounded animate-infinite-scroll"></div>
                            </div>
                            <p className="text-[11px] text-text-muted">Scanning indexes, verifying constraints, cross-referencing files, parsing JSON data, and mapping role policies...</p>
                        </div>
                    )}

                    {/* Diagnostic Results */}
                    {integrityResults && !isChecking && (
                        <div className="border-t border-border pt-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Overall Health Status Bar */}
                            <div className={`p-4 border rounded-lg flex items-center justify-between ${
                                integrityResults.summary.failed > 0 
                                    ? 'bg-status-error/10 border-status-error/20 text-status-error' 
                                    : integrityResults.summary.warnings > 0 
                                    ? 'bg-status-warning/10 border-status-warning/20 text-status-warning'
                                    : 'bg-status-success/10 border-status-success/20 text-status-success'
                            }`}>
                                <div className="flex items-center gap-3">
                                    {integrityResults.summary.failed > 0 ? (
                                        <XCircle className="h-6 w-6" />
                                    ) : integrityResults.summary.warnings > 0 ? (
                                        <AlertCircle className="h-6 w-6" />
                                    ) : (
                                        <CheckCircle2 className="h-6 w-6" />
                                    )}
                                    <div>
                                        <h4 className="text-[14px] font-bold uppercase tracking-wider">
                                            {integrityResults.summary.failed > 0 
                                                ? 'Database Anomalies Detected' 
                                                : integrityResults.summary.warnings > 0 
                                                ? 'Database Integrity Warnings'
                                                : 'Database Integrity Fully Secure'}
                                        </h4>
                                        <p className="text-[12px] opacity-90 mt-0.5">
                                            {integrityResults.summary.failed > 0 
                                                ? `${integrityResults.summary.failed} checks failed. Critical structural repair or data cleanup recommended.` 
                                                : integrityResults.summary.warnings > 0 
                                                ? `${integrityResults.summary.warnings} warning indicators flagged. Review detailed log.`
                                                : 'All integrity rules and consistency bounds verified. Zero violations found.'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 bg-white/20 dark:bg-black/20 rounded">
                                    Health Index: {Math.round(((17 - integrityResults.summary.failed) / 17) * 100)}%
                                </div>
                            </div>

                            {/* Summary Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="border border-border p-4 bg-app-surface/30 rounded-lg">
                                    <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Passed Constraints</div>
                                    <div className="text-[20px] font-bold text-status-success mt-1">{integrityResults.summary.passed} / 17</div>
                                </div>
                                <div className="border border-border p-4 bg-app-surface/30 rounded-lg">
                                    <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Warnings</div>
                                    <div className={`text-[20px] font-bold mt-1 ${integrityResults.summary.warnings > 0 ? 'text-status-warning' : 'text-text-primary'}`}>
                                        {integrityResults.summary.warnings}
                                    </div>
                                </div>
                                <div className="border border-border p-4 bg-app-surface/30 rounded-lg">
                                    <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Failures</div>
                                    <div className={`text-[20px] font-bold mt-1 ${integrityResults.summary.failed > 0 ? 'text-status-error' : 'text-text-primary'}`}>
                                        {integrityResults.summary.failed}
                                    </div>
                                </div>
                                <div className="border border-border p-4 bg-app-surface/30 rounded-lg">
                                    <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Scan Duration</div>
                                    <div className="text-[20px] font-bold text-text-primary mt-1 flex items-center gap-1.5">
                                        <Clock className="h-4 w-4 text-text-muted" />
                                        {integrityResults.summary.duration_ms}ms
                                    </div>
                                </div>
                            </div>

                            {/* Checks Accordion */}
                            <div className="space-y-3">
                                <h4 className="text-[13px] font-bold text-text-primary uppercase tracking-widest border-b border-border pb-2">
                                    Detailed Constraint Checks
                                </h4>
                                
                                <div className="divide-y divide-border border border-border rounded-lg overflow-hidden bg-app-surface/10">
                                    {checksList.map((check) => {
                                        const isExpanded = expandedCheck === check.id;
                                        return (
                                            <div key={check.id} className="transition-all hover:bg-app-surface/30">
                                                {/* Accordion Header */}
                                                <button
                                                    onClick={() => toggleCheckExpansion(check.id)}
                                                    className="w-full flex items-center justify-between p-4 text-left cursor-pointer"
                                                >
                                                    <div className="flex items-center gap-3 pr-4">
                                                        {check.status === 'PASS' && (
                                                            <CheckCircle2 className="h-5 w-5 text-status-success shrink-0" />
                                                        )}
                                                        {check.status === 'WARNING' && (
                                                            <AlertCircle className="h-5 w-5 text-status-warning shrink-0" />
                                                        )}
                                                        {check.status === 'FAIL' && (
                                                            <XCircle className="h-5 w-5 text-status-error shrink-0" />
                                                        )}
                                                        {check.status === 'PENDING' && (
                                                            <div className="h-5 w-5 rounded-full border-2 border-border shrink-0" />
                                                        )}
                                                        
                                                        <div>
                                                            <div className="text-[13px] font-semibold text-text-primary flex items-center gap-2">
                                                                {check.name}
                                                                {check.duration_ms !== null && (
                                                                    <span className="text-[10px] text-text-muted font-normal">
                                                                        ({check.duration_ms}ms)
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-[12px] text-text-secondary leading-relaxed mt-0.5">
                                                                {check.desc}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3 shrink-0">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-wide ${
                                                            check.status === 'PASS' ? 'bg-status-success/15 text-status-success border border-status-success/20' :
                                                            check.status === 'WARNING' ? 'bg-status-warning/15 text-status-warning border border-status-warning/20' :
                                                            check.status === 'FAIL' ? 'bg-status-error/15 text-status-error border border-status-error/20' :
                                                            'bg-border text-text-muted'
                                                        }`}>
                                                            {check.status}
                                                        </span>
                                                        {isExpanded ? (
                                                            <ChevronUp className="h-4 w-4 text-text-muted" />
                                                        ) : (
                                                            <ChevronDown className="h-4 w-4 text-text-muted" />
                                                        )}
                                                    </div>
                                                </button>

                                                {/* Accordion Content */}
                                                {isExpanded && (
                                                    <div className="p-4 bg-app-surface border-t border-border animate-in fade-in duration-200">
                                                        {renderDetailSection(check)}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Database Latency Diagnostics Card */}
                <div className="bg-app-surface border border-border p-8 space-y-6 transition-all hover:border-border-strong rounded-lg">
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Gauge className="h-4.5 w-4.5 text-brand-accent" />
                                <h3 className="text-[15px] font-semibold text-text-primary">Database Latency Diagnostics</h3>
                            </div>
                            <p className="text-[13px] text-text-secondary leading-relaxed">
                                Measure connection overhead and data transfer rates (write/read cycles) between the application layer and the database node to detect bottlenecks.
                            </p>
                        </div>

                        {latencyError && (
                            <div className="p-3 text-[11px] bg-status-error/10 text-status-error font-medium border border-status-error/20 rounded">
                                Error checking latency: {latencyError}
                            </div>
                        )}

                        <button
                            onClick={handleTestLatency}
                            disabled={isTestingLatency}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-primary hover:bg-black text-white text-[11px] font-bold uppercase tracking-[0.15em] rounded transition-all disabled:opacity-50"
                        >
                            {isTestingLatency ? 'Measuring Connection Speed...' : 'Test Database Latency'}
                            <Activity className={`h-3.5 w-3.5 ${isTestingLatency ? 'animate-pulse' : ''}`} />
                        </button>
                    </div>

                    {/* Progress / Loading State */}
                    {isTestingLatency && (
                        <div className="border-t border-border pt-6 space-y-4 animate-pulse">
                            <div className="flex items-center gap-3">
                                <RefreshCw className="h-5 w-5 text-brand-accent animate-spin" />
                                <span className="text-[13px] font-semibold text-text-primary">
                                    Pinging database nodes and evaluating payload transfer speeds...
                                </span>
                            </div>
                            <div className="w-full bg-border/40 h-1.5 rounded overflow-hidden">
                                <div className="bg-brand-accent h-full w-1/3 rounded animate-infinite-scroll"></div>
                            </div>
                            <p className="text-[11px] text-text-muted">
                                Measuring connection handshake ping, preparing 50KB write payload buffer, and streaming response blocks...
                            </p>
                        </div>
                    )}

                    {/* Latency Results */}
                    {latencyResults && !isTestingLatency && (
                        <div className="border-t border-border pt-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Alert Box */}
                            {latencyResults.threshold_exceeded ? (
                                <div className="p-4 border bg-status-error/10 border-status-error/20 text-status-error rounded-lg flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-[13px] font-bold uppercase tracking-wider">Critical Database Latency Alert</h4>
                                        <p className="text-[12px] opacity-90 mt-1 leading-relaxed">
                                            The measured database transaction roundtrip is **{Math.round(latencyResults.metrics.total_latency_ms / 10) / 100}s**, which exceeds our 60-second operational threshold. Please fill out the form below to immediately notify our Support Engineering team.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 border bg-status-success/10 border-status-success/20 text-status-success rounded-lg flex items-start gap-3">
                                    <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-[13px] font-bold uppercase tracking-wider">Database Connection Optimal</h4>
                                        <p className="text-[12px] opacity-90 mt-1 leading-relaxed">
                                            Network transaction transfer speeds are running at normal performance limits. Latency is well within the 60-second operational threshold.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="border border-border p-4 bg-app-surface/30 rounded-lg">
                                    <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Ping Latency</div>
                                    <div className="text-[20px] font-bold text-text-primary mt-1 font-mono">
                                        {latencyResults.metrics.ping_latency_ms.toFixed(1)}ms
                                    </div>
                                </div>
                                <div className="border border-border p-4 bg-app-surface/30 rounded-lg">
                                    <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Write (50KB)</div>
                                    <div className="text-[20px] font-bold text-text-primary mt-1 font-mono">
                                        {latencyResults.metrics.write_latency_ms.toFixed(1)}ms
                                    </div>
                                </div>
                                <div className="border border-border p-4 bg-app-surface/30 rounded-lg">
                                    <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Read (50KB)</div>
                                    <div className="text-[20px] font-bold text-text-primary mt-1 font-mono">
                                        {latencyResults.metrics.read_latency_ms.toFixed(1)}ms
                                    </div>
                                </div>
                                <div className="border border-border p-4 bg-app-surface/30 rounded-lg">
                                    <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Total Roundtrip</div>
                                    <div className={`text-[20px] font-bold mt-1 font-mono ${latencyResults.threshold_exceeded ? 'text-status-error animate-pulse' : 'text-status-success'}`}>
                                        {latencyResults.metrics.total_latency_ms >= 1000 
                                            ? `${(latencyResults.metrics.total_latency_ms / 1000).toFixed(2)}s` 
                                            : `${latencyResults.metrics.total_latency_ms.toFixed(0)}ms`}
                                    </div>
                                </div>
                            </div>

                            {/* Support Feedback Form when threshold exceeded */}
                            {latencyResults.threshold_exceeded && (
                                <div className="border border-border p-6 bg-app-surface/50 rounded-lg space-y-4">
                                    <h4 className="text-[13px] font-bold text-text-primary uppercase tracking-wider border-b border-border pb-2">
                                        Submit Performance Ticket to Support Team
                                    </h4>
                                    
                                    {feedbackSubmitted ? (
                                        <div className="p-4 bg-status-success/15 border border-status-success/20 text-status-success rounded text-[12px] font-semibold flex items-center gap-2">
                                            <CheckCircle2 className="h-4 w-4" />
                                            Diagnostic report submitted successfully! Our engineering team has been notified.
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Your Work Email</label>
                                                <input 
                                                    type="email"
                                                    value={feedbackEmail}
                                                    onChange={(e) => setFeedbackEmail(e.target.value)}
                                                    placeholder="admin@company.com"
                                                    className="w-full bg-app-surface border border-border rounded p-2.5 text-[12px] text-text-primary outline-none focus:border-brand-accent transition-colors"
                                                />
                                            </div>
                                            
                                            <div className="space-y-1">
                                                <label className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">Performance Comments / Feedback</label>
                                                <textarea 
                                                    rows={4}
                                                    value={feedbackComments}
                                                    onChange={(e) => setFeedbackComments(e.target.value)}
                                                    placeholder="Describe the environment or what actions you were performing when the database lag was experienced..."
                                                    className="w-full bg-app-surface border border-border rounded p-2.5 text-[12px] text-text-primary outline-none focus:border-brand-accent transition-colors resize-none"
                                                />
                                            </div>
                                            
                                            <button
                                                onClick={handleSubmitFeedback}
                                                disabled={isSubmittingFeedback || !feedbackComments.trim()}
                                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-status-error hover:bg-red-700 text-white text-[11px] font-bold uppercase tracking-[0.12em] rounded transition-all disabled:opacity-50 cursor-pointer"
                                            >
                                                {isSubmittingFeedback ? 'Submitting Ticket...' : 'Dispatch Ticket to Support'}
                                                <Send className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Maintenance;
