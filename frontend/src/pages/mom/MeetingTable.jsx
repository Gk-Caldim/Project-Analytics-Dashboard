import React, { useState, useEffect } from 'react';
import { Download, Clipboard, Check, Tag, Trash2, AlertCircle, Zap, ChevronDown } from 'lucide-react';
import API from '../../utils/api';

const CRITICALITY_STYLES = {
  'High': 'bg-red-50 text-red-700 border-red-200 uppercase',
  'Medium': 'bg-amber-50 text-amber-700 border-amber-200 uppercase',
  'Low': 'bg-emerald-50 text-emerald-700 border-emerald-200 uppercase',
  'Critical': 'bg-red-600 text-white border-red-700 uppercase animate-pulse',
};

const STATUS_STYLES = {
  'Pending': 'text-amber-600 font-bold',
  'Done': 'text-emerald-600 font-bold',
  'Closed': 'text-gray-400 font-medium line-through',
};

const MeetingTable = ({ meetings, onUpdateMeeting, onDeleteMeeting, lockedProjectId }) => {
  // ── Project selector state ──────────────────────────────────────
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    // Pre-seed from first meeting row if it already has a project_id
    return lockedProjectId || (meetings?.[0]?.project_id ? String(meetings[0].project_id) : '');
  });

  useEffect(() => {
    API.get('/projects')
      .then(resp => {
        const data = resp.data.success
          ? resp.data.projects
          : Array.isArray(resp.data) ? resp.data : [];
        setProjects(data);
      })
      .catch(err => console.error('Failed to fetch projects', err));
  }, []);

  // If first meeting row already carries a project_id (e.g. from ScheduleMeetingPage
  // navigate context), use it as the default once projects have loaded.
  useEffect(() => {
    if (!selectedProjectId) {
      const pid = lockedProjectId || meetings?.[0]?.project_id;
      if (pid) setSelectedProjectId(String(pid));
    }
  }, [meetings, lockedProjectId, selectedProjectId]);

  // Helper: resolve project name from id for display
  const resolveProjectName = (pid) => {
    if (!pid) return '—';
    const p = projects.find(pr => String(pr.id ?? pr.project_id) === String(pid));
    return p ? (p.name ?? p.project_name) : `#${pid}`;
  };

  // ── Sync High-priority MOM rows → Issue Engine ─────────────────
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSyncIssues = async () => {
    // ── Step 1: Validate project selection FIRST ───────────────────
    if (!selectedProjectId) {
      setSyncResult({ error: 'Please select a valid project before syncing.' });
      setTimeout(() => setSyncResult(null), 5000);
      return;
    }

    // ── Step 2: Validate rows ──────────────────────────────────────
    const highRows = meetings.filter(m => m.criticality === 'High' || m.criticality === 'Critical');

    if (highRows.length === 0) {
      setSyncResult({ error: 'No High or Critical-criticality rows to sync.' });
      setTimeout(() => setSyncResult(null), 4000);
      return;
    }

    // Build action items, skip rows missing owner or target date
    const actions = [];
    const localSkipped = [];

    highRows.forEach((m, idx) => {
      const owner      = (m.responsibility || '').trim();
      const target     = (m.target || '').trim();
      const actionText = (m.discussion_point || '').trim();

      if (!owner) {
        localSkipped.push(`Row ${idx + 1}: missing Responsibility (owner)`);
        return;
      }
      if (!target) {
        localSkipped.push(`Row ${idx + 1}: missing Target Date`);
        return;
      }

      // Parse target date — ISO first, then any parseable string
      const iso = Date.parse(target);
      if (isNaN(iso)) {
        localSkipped.push(`Row ${idx + 1}: unrecognisable date format '${target}'`);
        return;
      }
      const parsedDate = new Date(iso).toISOString().split('T')[0];

      const title50 = actionText.slice(0, 50) || `MOM Action ${idx + 1}`;

      actions.push({
        title:       title50,
        description: actionText || title50,
        owner,
        department:  m.function || undefined,
        priority:    'High',
        due_date:    parsedDate,
        status:      m.status === 'Done' || m.status === 'Closed' ? 'Closed' : 'Open',
      });
    });

    if (actions.length === 0) {
      setSyncResult({
        error:   `All ${highRows.length} High row(s) were skipped — check Responsibility and Target Date fields.`,
        skipLog: localSkipped,
      });
      setTimeout(() => setSyncResult(null), 7000);
      return;
    }

    // ── Step 3: POST to backend ────────────────────────────────────
    setSyncing(true);
    try {
      const resp = await API.post('/mom/issues', {
        project_id: Number(selectedProjectId),
        actions,
      });
      const data = resp.data;
      // Backend returns: { total_rows, issues_created, issues_skipped, reasons, issues }
      setSyncResult({
        created:  data.issues_created ?? 0,
        skipped:  (data.issues_skipped ?? 0) + localSkipped.length,
        skipLog:  [...(data.reasons || []), ...localSkipped],
      });
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message || 'Unknown error';
      setSyncResult({ error: `Sync failed: ${detail}` });
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncResult(null), 7000);
    }
  };


  // Copy to clipboard
  const handleCopy = () => {
    const text = meetings.map(m =>
      `${m.s_no || m.sno || ''}\t${m.function || ''}\t${m.project_name || ''}\t${m.criticality || ''}\t${m.discussion_point || ''}\t${m.responsibility || ''}\t${m.target || ''}\t${m.status || ''}\t${m.action_taken || ''}`
    ).join('\n');
    navigator.clipboard.writeText(`S.No\tFunction\tProject\tCriticality\tAction Points\tResponsibility\tTarget\tStatus\tAction Taken\n${text}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handlePrint = () => window.print();

  if (!meetings || meetings.length === 0) {
    return (
      <div className="max-w-6xl mx-auto py-20 px-4">
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center p-16 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <Tag className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No meeting notes captured</h3>
          <p className="text-gray-500 max-w-sm mb-8">Generated minutes will appear here in the formal grid format once you've recorded or uploaded a transcript.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 pb-20 space-y-8 animate-fadeIn">

      {/* ── Sync Result Toast ── */}
      {syncResult && (
        <div className={`fixed top-6 right-6 z-50 max-w-sm rounded-2xl shadow-2xl border px-5 py-4 text-sm font-semibold animate-slideUp ${
          syncResult.error
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {syncResult.error ? (
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{syncResult.error}</span>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>{syncResult.created} issue{syncResult.created !== 1 ? 's' : ''} synced to Issue Engine</span>
              </div>
              {syncResult.skipped > 0 && (
                <div className="text-xs text-emerald-600 opacity-70">{syncResult.skipped} row(s) skipped (non-High or missing fields)</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Action Toolbar (Hidden in Print) ── */}
      <div className="flex flex-col gap-3 print:hidden">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Form MOM-202</h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Industrial Analytics Standard</p>
          </div>
          <div className="flex gap-3 items-center">
            {/* ── Project Dropdown (Hidden if locked) ── */}
            {!lockedProjectId && (
              <div className="relative">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Project <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedProjectId}
                    onChange={e => setSelectedProjectId(e.target.value)}
                    className={`appearance-none pl-3 pr-8 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-2 transition-all cursor-pointer min-w-[180px] ${
                      selectedProjectId
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-900 focus:ring-indigo-200'
                        : 'border-red-300 bg-red-50 text-red-500 focus:ring-red-200'
                    }`}
                  >
                    <option value="">— Select Project —</option>
                    {projects.map(p => (
                      <option key={p.id ?? p.project_id} value={p.id ?? p.project_id}>
                        {p.name ?? p.project_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            <div className="flex gap-3 items-end pb-0.5">
              <button
                onClick={handleSyncIssues}
                disabled={syncing || !selectedProjectId}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
              >
                <Zap className="w-4 h-4" />
                {syncing ? 'Syncing…' : 'Sync Issues'}
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Clipboard className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy CSV'}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95"
              >
                <Download className="w-4 h-4" />
                Download PDF / Print
              </button>
            </div>
          </div>
        </div>
        {!selectedProjectId && (
          <p className="text-xs text-red-500 font-semibold flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            Select a project above before syncing issues to the Issue Engine.
          </p>
        )}
      </div>

      {/* ── FORM TEMPLATE START ── */}
      <div className="bg-white border border-gray-300 shadow-xl rounded-sm overflow-hidden print:border-0 print:shadow-none">

        {/* Formal Header matching the user's photo */}
        <div className="p-8 border-b border-gray-300 relative">
          <div className="flex flex-col items-center gap-4">
            {/* Boxed Title */}
            <div className="border border-gray-900 px-12 py-3">
              <h1 className="text-sm font-bold uppercase tracking-widest text-gray-900">Minutes of meeting</h1>
            </div>

          </div>

          {/* Metadata Grid (Small, top right) */}
          <div className="absolute top-8 right-8 text-[10px] font-mono text-gray-400 text-right space-y-1">
            <div>FORM NO: MOM/STD/2026</div>
            <div>REV: 04-APR-2026</div>
          </div>
        </div>

        {/* ── THE GRID ── */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-b border-gray-300">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="border border-gray-300 px-3 py-4 text-[11px] font-black uppercase tracking-wider text-gray-600 w-12">S.No</th>
                <th className="border border-gray-300 px-4 py-4 text-[11px] font-black uppercase tracking-wider text-gray-600 w-32">Function</th>
                <th className="border border-gray-300 px-4 py-4 text-[11px] font-black uppercase tracking-wider text-gray-600 w-48">Project Name</th>
                <th className="border border-gray-300 px-3 py-4 text-[11px] font-black uppercase tracking-wider text-gray-600 w-28">Criticality</th>
                <th className="border border-gray-300 px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-600 text-left">Action Points discussed</th>
                <th className="border border-gray-300 px-4 py-4 text-[11px] font-black uppercase tracking-wider text-gray-600 w-40">Responsibility</th>
                <th className="border border-gray-300 px-4 py-4 text-[11px] font-black uppercase tracking-wider text-gray-600 w-28">Target</th>
                <th className="border border-gray-300 px-4 py-4 text-[11px] font-black uppercase tracking-wider text-gray-600 w-28">Status</th>
                <th className="border border-gray-300 px-4 py-4 text-[11px] font-black uppercase tracking-wider text-gray-600 w-48">Action taken</th>
                <th className="border border-gray-300 px-3 py-4 text-[11px] font-black uppercase tracking-wider text-gray-600 w-16 print:hidden"></th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((m, idx) => {
                const critStyle = CRITICALITY_STYLES[m.criticality] || 'border-gray-200 text-gray-400';
                const statusStyle = STATUS_STYLES[m.status] || 'text-gray-900';

                return (
                  <tr key={m.id || idx} className="hover:bg-gray-50/30 transition-colors group">
                    <td className="border border-gray-300 px-3 py-4 text-center text-xs font-bold text-gray-500">
                      {m.s_no || m.sno || idx + 1}
                    </td>
                    <td className="border border-gray-300 px-4 py-4 text-center text-xs font-semibold text-gray-700">
                      {m.function || 'General'}
                    </td>
                    <td className="border border-gray-300 px-4 py-4 text-center text-xs font-bold text-gray-900">
                      {resolveProjectName(m.project_id) !== '—'
                        ? resolveProjectName(m.project_id)
                        : resolveProjectName(selectedProjectId)}
                    </td>
                    <td className="border border-gray-300 px-3 py-4 text-center">
                      <span className={`px-2 py-1 rounded-[4px] text-[9px] font-black border text-center block ${critStyle}`}>
                        {m.criticality || 'Normal'}
                      </span>
                    </td>
                    <td className="border border-gray-300 px-6 py-4 text-xs font-medium text-gray-800 leading-relaxed min-w-[300px]">
                      {m.discussion_point || '—'}
                    </td>
                    <td className="border border-gray-300 px-4 py-4 text-center text-xs font-bold text-indigo-600">
                      {m.responsibility || '—'}
                    </td>
                    <td className="border border-gray-300 px-4 py-4 text-center text-xs font-mono font-bold text-gray-500">
                      {m.target || '—'}
                    </td>
                    <td className="border border-gray-300 px-4 py-4 text-center text-xs">
                      <span className={statusStyle}>{m.status || 'Pending'}</span>
                    </td>
                    <td className="border border-gray-300 px-4 py-4 text-xs text-gray-500 italic">
                      {m.action_taken && m.action_taken !== 'None' ? m.action_taken : 'No update.'}
                    </td>
                    <td className="border border-gray-300 px-3 py-4 text-center print:hidden">
                      <button
                        onClick={() => onDeleteMeeting(m.id || idx)}
                        className="p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* Empty Rows to complete the "Form" look if fewer than 10 rows */}
              {meetings.length < 5 && Array.from({ length: 5 - meetings.length }).map((_, i) => (
                <tr key={`empty-${i}`} className="h-12">
                  {Array.from({ length: 10 }).map((__, j) => (
                    <td key={`cell-${j}`} className={`border border-gray-200 ${j === 9 ? 'print:hidden' : ''}`}></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Footer Signoff area ── */}
        <div className="p-12 mt-8 grid grid-cols-3 gap-20">
          <div className="border-t border-gray-900 pt-3 text-center">
            <div className="text-[10px] font-black uppercase text-gray-400">Prepared By</div>
            <div className="text-xs font-bold mt-2">AI MOM ENGINE (Industrial-v2)</div>
          </div>
          <div className="border-t border-gray-900 pt-3 text-center">
            <div className="text-[10px] font-black uppercase text-gray-400">Reviewed By</div>
          </div>
          <div className="border-t border-gray-900 pt-3 text-center">
            <div className="text-[10px] font-black uppercase text-gray-400">Approved By</div>
          </div>
        </div>
      </div>

      {/* ── Disclaimer (Footer) ── */}
      <p className="text-[10px] text-gray-400 font-medium leading-relaxed max-w-3xl">
        CONFIDENTIAL: This Minutes of Meeting (MOM) document is intended only for the use of the individual or entity to which it is addressed and contains information that is privileged and confidential. The redistribution of this document without proper authorization is strictly prohibited.
      </p>
    </div>
  );
};

export default MeetingTable;