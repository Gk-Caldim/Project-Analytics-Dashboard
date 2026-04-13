import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { ChevronRight, Home, Layout, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { fetchMOM, saveMOM, setMeetingContext, addMomRows, updateMomRow, deleteMomRow } from '../../store/slices/momSlice';
import SpeechToText from './SpeechToText';
import MeetingTable from './MeetingTable';

const MOMModule = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'notes' ? 'table' : 'speech');
  const { meetingId, meetingName, projectId: reduxProjectId, projectName: reduxProjectName, momData, status, lastSaved } = useSelector((state) => state.mom);

  const urlId = searchParams.get('id') || searchParams.get('meetingId');
  const lockedProjectId = searchParams.get('projectId');

  // Hydrate meetingId and fetch if present
  useEffect(() => {
    if (urlId && urlId !== meetingId) {
      dispatch(setMeetingContext({ meetingId: urlId }));
      dispatch(fetchMOM(urlId));
    }
  }, [urlId, dispatch, meetingId]);

  const handleProcessSpeech = (newMeetings) => {
    dispatch(addMomRows(newMeetings));
    setActiveTab('table');
  };

  const handleUpdateMeeting = (id, data) => {
    dispatch(updateMomRow({ id, data }));
  };

  const handleDeleteMeeting = (id) => {
    dispatch(deleteMomRow(id));
  };

  // Auto-save MOM rows when they change (debounced)
  useEffect(() => {
    if (!meetingId || momData.length === 0) return;
    
    const timer = setTimeout(() => {
      dispatch(saveMOM({
        meetingId,
        meetingName,
        projectId: reduxProjectId,
        projectName: reduxProjectName,
        momData
      }));
    }, 5000); // 5s debounce for MOM table edits

    return () => clearTimeout(timer);
  }, [momData, meetingId, meetingName, reduxProjectId, reduxProjectName, dispatch]);

  return (
    <div className="mom-page min-h-full bg-gray-50 flex flex-col relative text-slate-800">
      
      {/* ── BREADCRUMBS & TOP BAR ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">
          <Link to="/dashboard" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5">
            <Home className="w-3.5 h-3.5" />
            Dashboard
          </Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/dashboard/meetings" className="hover:text-indigo-600 transition-colors flex items-center gap-1.5">
            <Layout className="w-3.5 h-3.5" />
            Meetings
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-900 flex items-center gap-1.5">
            {meetingName || (meetingId ? `Meeting #${meetingId}` : 'New Meeting')}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 text-[10px] font-bold tracking-tighter uppercase transition-all">
            {status === 'saving' && (
              <div className="flex items-center gap-1.5 text-amber-600">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Saving...
              </div>
            )}
            {status === 'saved' && (
              <div className="flex items-center gap-1.5 text-emerald-600">
                <CheckCircle className="w-3.5 h-3.5" />
                Saved {lastSaved && `at ${new Date(lastSaved).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              </div>
            )}
            {status === 'error' && (
              <div className="flex items-center gap-1.5 text-red-600">
                <AlertCircle className="w-3.5 h-3.5" />
                Sync Error
              </div>
            )}
            {status === 'loading' && (
              <div className="flex items-center gap-1.5 text-gray-400">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                Fetching...
              </div>
            )}
            {status === 'idle' && (
              <div className="flex items-center gap-1.5 text-gray-400">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                Ready
              </div>
            )}
          </div>
          
          <button
            onClick={() => navigate('/dashboard/meetings')}
            className="text-[10px] font-bold text-gray-400 hover:text-indigo-600 uppercase tracking-widest transition-colors flex items-center gap-1"
          >
            ← Exit
          </button>
        </div>
      </div>

      <div className="p-4 flex-1 overflow-auto">
        {/* Pill-style Tab Switcher */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex bg-gray-100 rounded-full p-1">
          <button
            onClick={() => setActiveTab('speech')}
            className={`px-6 py-1.5 rounded-full text-xs font-medium transition-colors ${activeTab === 'speech'
              ? 'bg-white text-black border border-gray-200 shadow-sm'
              : 'bg-transparent text-gray-500 hover:text-gray-900 border border-transparent'
              }`}
          >
            Record live
          </button>
          <button
            onClick={() => setActiveTab('table')}
            className={`px-6 py-1.5 rounded-full text-xs font-medium transition-colors ${activeTab === 'table'
              ? 'bg-white text-black border border-gray-200 shadow-sm'
              : 'bg-transparent text-gray-500 hover:text-gray-900 border border-transparent'
              }`}
          >
            Meeting notes
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'speech' && (
        <SpeechToText
          onProcessSpeech={handleProcessSpeech}
          meetings={momData}
          switchToTable={() => setActiveTab('table')}
          lockedProjectId={lockedProjectId}
        />
      )}

      {activeTab === 'table' && (
        <MeetingTable
          meetings={momData}
          onUpdateMeeting={handleUpdateMeeting}
          onDeleteMeeting={handleDeleteMeeting}
          lockedProjectId={lockedProjectId}
        />
      )}
    </div>
    </div>
  );
};

export default MOMModule;