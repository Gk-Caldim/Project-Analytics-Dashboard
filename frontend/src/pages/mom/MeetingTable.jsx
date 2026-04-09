import React, { useState } from 'react';
import { Download, Clipboard, Check, Tag, Trash2, Edit2, AlertCircle } from 'lucide-react';

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

const MeetingTable = ({ meetings, onUpdateMeeting, onDeleteMeeting }) => {
  const [copied, setCopied] = useState(false);

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

      {/* ── Action Toolbar (Hidden in Print) ── */}
      <div className="flex justify-between items-center print:hidden">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Form MOM-202</h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Industrial Analytics Standard</p>
        </div>
        <div className="flex gap-3">
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
                      {m.project_name || '—'}
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