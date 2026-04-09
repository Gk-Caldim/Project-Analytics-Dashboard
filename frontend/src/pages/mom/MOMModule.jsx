import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import SpeechToText from './SpeechToText';
import MeetingTable from './MeetingTable';

const MOMModule = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'notes' ? 'table' : 'speech'); // 'speech' or 'table'
  const [meetings, setMeetings] = useState([]);

  // Load meetings from localStorage
  useEffect(() => {
    try {
      const savedMeetings = JSON.parse(localStorage.getItem('mom_meetings_v2')) || [];
      setMeetings(savedMeetings);
    } catch (error) {
      console.error('Error loading meetings:', error);
    }
  }, []);

  // Save meetings to localStorage
  useEffect(() => {
    localStorage.setItem('mom_meetings_v2', JSON.stringify(meetings));
  }, [meetings]);

  const handleProcessSpeech = (newMeetings) => {
    setMeetings((prev) => {
      const startingSno = prev.length + 1;
      const formatted = newMeetings.map((m, i) => ({
        ...m,
        id: Date.now() + i,
        sno: startingSno + i,
      }));
      return [...prev, ...formatted];
    });
    setActiveTab('table');
  };

  const handleUpdateMeeting = (id, data) => {
    setMeetings((prev) =>
      prev.map((meeting) => (meeting.id === id ? { ...meeting, ...data } : meeting))
    );
  };

  const handleDeleteMeeting = (id) => {
    setMeetings((prev) => prev.filter((meeting) => meeting.id !== id));
  };

  return (
    <div className="mom-page min-h-full bg-gray-50 p-4 text-slate-800 relative">
      <button
        onClick={() => navigate('/dashboard/meetings')}
        className="absolute top-4 left-4 text-xs font-semibold text-gray-500 hover:text-indigo-600 transition-colors flex items-center gap-1 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm"
      >
        ← Manage Meetings
      </button>
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
          meetings={meetings}
          switchToTable={() => setActiveTab('table')}
        />
      )}

      {activeTab === 'table' && (
        <MeetingTable
          meetings={meetings}
          onUpdateMeeting={handleUpdateMeeting}
          onDeleteMeeting={handleDeleteMeeting}
        />
      )}
    </div>
  );
};

export default MOMModule;