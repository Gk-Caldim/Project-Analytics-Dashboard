import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { Download, Clipboard, Check, Tag, Trash2, AlertCircle, Zap, ChevronDown, Loader2, User } from 'lucide-react';
import Select from 'react-select';
import API from '../../utils/api';
import { saveMOM, updateMomRow } from '../../store/slices/momSlice';

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

const MeetingTable = ({ meetings, employees = [], onUpdateMeeting, onDeleteMeeting, lockedProjectId }) => {
  const dispatch = useDispatch();
  const { meetingId, meetingName, projectId: reduxProjectId, projectName: reduxProjectName, status: reduxStatus } = useSelector(state => state.mom);

  // ── Project selector state ──────────────────────────────────────
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(reduxProjectId || '');

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

  // Sync local selectedProjectId with Redux
  useEffect(() => {
    if (reduxProjectId && reduxProjectId !== selectedProjectId) {
      setSelectedProjectId(String(reduxProjectId));
    }
  }, [reduxProjectId]);

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
      toast.error('Please select a valid project before syncing.');
      return;
    }

    // ── Step 2: Validate rows ──────────────────────────────────────
    const rowsToSync = meetings.filter(m => {
        return m.criticality === 'High' || m.criticality === 'Critical';
    });

    if (rowsToSync.length === 0) {
      toast.error('No High priority or pending rows found to sync.');
      return;
    }

    // Build action items, skip rows missing owner
    const actions = [];
    const localSkipped = [];

    rowsToSync.forEach((m, idx) => {
      const owner      = (m.responsibility || '').trim();
      const target     = (m.target || '').trim();
      const actionText = (m.discussion_point || '').trim();

      if (!owner) {
        localSkipped.push(`Row ${idx + 1}: missing Responsibility (owner)`);
        return;
      }

      // Parse target date — allow empty/null
      let parsedDate = null;
      if (target) {
        const iso = Date.parse(target);
        if (!isNaN(iso)) {
          parsedDate = new Date(iso).toISOString().split('T')[0];
        } else {
            // If target is present but garbage, we still might want to alert or just ignore
            // For now, if it's garbage we leave it null per "If no date -> keep null"
            parsedDate = null;
        }
      }

      const title50 = actionText.slice(0, 50) || `MOM Action ${idx + 1}`;

      actions.push({
        title:       title50,
        description: actionText || title50,
        owner,
        department:  m.function || undefined,
        priority:    m.criticality === 'High' || m.criticality === 'Critical' ? 'High' : 'Medium',
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
    const syncToast = toast.loading('Syncing issues to engine...');
    try {
      const resp = await API.post('/mom/issues', {
        project_id: Number(selectedProjectId),
        actions,
      });
      const data = resp.data;
      toast.success(`Successfully synced ${data.issues_created} issues!`, { id: syncToast });
    } catch (err) {
      const detail = err?.response?.data?.detail || err.message || 'Unknown error';
      toast.error(`Sync failed: ${detail}`, { id: syncToast });
    } finally {
      setSyncing(false);
    }
  };


  // Copy to clipboard
  const handleCopy = () => {
    const text = meetings.map(m =>
      `${m.s_no || m.sno || ''}\t${m.function || ''}\t${m.project_name || ''}\t${m.criticality || ''}\t${m.discussion_point || ''}\t${m.responsibility || ''}\t${m.target || ''}\t${m.status || ''}\t${m.action_taken || ''}`
    ).join('\n');
    navigator.clipboard.writeText(`S.No\tFunction\tProject\tCriticality\tAction Points\tResponsibility\tTarget\tStatus\tAction Taken\n${text}`).then(() => {
      setCopied(true);
      toast.success('Table copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handlePrint = () => window.print();


  return (
    <div className="max-w-[1400px] mx-auto px-4 pb-20 space-y-8 animate-fadeIn">

      {/* Removed old syncResult Toast - replaced by toast.success */}

      {/* ── Action Toolbar (Hidden in Print) ── */}
      <div className="flex flex-col gap-3 print:hidden">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
               {meetingName || 'Form MOM-202'}
            </h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
              {reduxProjectName ? `Project: ${reduxProjectName}` : 'Industrial Analytics Standard'}
            </p>
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
                <th className="border border-gray-300 px-3 py-4 text-[11px] font-black uppercase tracking-wider text-gray-600 w-16 print:hidden">Actions</th>
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
                       <input 
                         type="text" 
                         defaultValue={m.function || 'General'} 
                         className="bg-transparent text-center focus:bg-white focus:outline-indigo-500 w-full"
                         onBlur={(e) => onUpdateMeeting(m.id, { function: e.target.value })}
                       />
                    </td>
                    <td className="border border-gray-300 px-4 py-4 text-center text-xs font-bold text-gray-900">
                      {resolveProjectName(m.project_id) !== '—'
                        ? resolveProjectName(m.project_id)
                        : (reduxProjectName || resolveProjectName(selectedProjectId))}
                    </td>
                    <td className="border border-gray-300 px-3 py-4 text-center">
                      <select 
                        defaultValue={m.criticality || 'Normal'}
                        className={`px-2 py-1 rounded-[4px] text-[9px] font-black border text-center block bg-transparent cursor-pointer ${critStyle}`}
                        onChange={(e) => onUpdateMeeting(m.id, { criticality: e.target.value })}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </td>
                    <td className="border border-gray-300 px-6 py-4 text-xs font-medium text-gray-800 leading-relaxed min-w-[300px]">
                      <textarea
                        defaultValue={m.discussion_point || '—'}
                        className="w-full bg-transparent resize-none focus:bg-white focus:outline-indigo-500 min-h-[40px]"
                        onBlur={(e) => onUpdateMeeting(m.id, { discussion_point: e.target.value })}
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-4 text-xs font-bold text-indigo-600 min-w-[180px]">
                      <Select
                        options={employees.map(e => ({ value: e.name, label: e.name, employeeId: e.employee_id }))}
                        defaultValue={m.responsibility ? { value: m.responsibility, label: m.responsibility } : null}
                        onChange={(opt) => onUpdateMeeting(m.id, { responsibility: opt?.value })}
                        placeholder="Search Employee..."
                        className="text-left"
                        styles={{
                          control: (base) => ({
                            ...base,
                            minHeight: '30px',
                            background: 'transparent',
                            border: 'none',
                            boxShadow: 'none',
                            fontSize: '11px'
                          }),
                          placeholder: (base) => ({ ...base, color: '#a5b4fc' }),
                          singleValue: (base) => ({ ...base, color: '#4f46e5', fontWeight: '800' }),
                          indicatorSeparator: () => ({ display: 'none' }),
                          dropdownIndicator: () => ({ display: 'none' })
                        }}
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-4 text-center text-xs font-mono font-bold text-gray-500">
                      <input 
                         type="text" 
                         defaultValue={m.target || '—'} 
                         className="bg-transparent text-center focus:bg-white focus:outline-indigo-500 w-full"
                         onBlur={(e) => onUpdateMeeting(m.id, { target: e.target.value })}
                       />
                    </td>
                    <td className="border border-gray-300 px-4 py-4 text-center text-xs">
                       <select 
                         defaultValue={m.status || 'Pending'}
                         className={`bg-transparent cursor-pointer font-bold ${statusStyle}`}
                         onChange={(e) => onUpdateMeeting(m.id, { status: e.target.value })}
                       >
                         <option value="Pending">Pending</option>
                         <option value="Done">Done</option>
                         <option value="Closed">Closed</option>
                         <option value="Blocked">Blocked</option>
                       </select>
                    </td>
                    <td className="border border-gray-300 px-4 py-4 text-xs text-gray-500 italic">
                      <textarea
                        defaultValue={m.action_taken || 'No update.'}
                        className="w-full bg-transparent resize-none focus:bg-white focus:outline-indigo-500"
                        onBlur={(e) => onUpdateMeeting(m.id, { action_taken: e.target.value })}
                      />
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