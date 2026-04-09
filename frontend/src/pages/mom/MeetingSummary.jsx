// MeetingSummary.js
import React from 'react';
import * as Icons from 'lucide-react';

const MeetingSummary = ({ meetings, stats, onClose }) => {
  // Get recent meetings
  const recentMeetings = [...meetings]
    .sort((a, b) => {
      const dateA = new Date(a.date || 0);
      const dateB = new Date(b.date || 0);
      return dateB - dateA;
    })
    .slice(0, 5);

  // Calculate department-wise meetings
  const departmentStats = meetings.reduce((acc, meeting) => {
    const dept = meeting.department || 'general';
    if (!acc[dept]) {
      acc[dept] = { total: 0, completed: 0, attendance: 0 };
    }
    acc[dept].total += 1;
    if (meeting.status === 'completed') acc[dept].completed += 1;
    
    const present = parseInt(meeting.present_count) || 0;
    const total = parseInt(meeting.total_attendees) || 0;
    if (total > 0) {
      acc[dept].attendance += Math.round((present / total) * 100);
    }
    
    return acc;
  }, {});

  // Calculate metrics safely
  const meetingsPerMonth = meetings.length > 0 ? Math.round(meetings.length / 12) : 0;
  const avgDuration = meetings.length > 0 
    ? Math.round(meetings.reduce((sum, m) => sum + (parseInt(m.duration) || 60), 0) / meetings.length) 
    : 0;
  const actionItems = meetings.reduce((sum, m) => sum + (parseInt(m.action_items) || 0), 0);
  
  const completionRate = stats.totalMeetings > 0 
    ? Math.round((stats.completed / stats.totalMeetings) * 100) 
    : 0;
    
  const criticalResolved = stats.critical > 0 
    ? Math.round((meetings.filter(m => 
        m.criticality === 'critical' && m.status === 'completed').length / stats.critical) * 100) 
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Meeting Summary Report</h2>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600"
            >
              <Icons.X className="h-5 w-5" />
            </button>
          </div>

          {/* Executive Summary */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Executive Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-blue-50 p-3 rounded border border-blue-100">
                <div className="text-xs text-blue-600 mb-1">Total Meetings</div>
                <div className="text-xl font-bold text-gray-900">{stats.totalMeetings}</div>
              </div>
              <div className="bg-green-50 p-3 rounded border border-green-100">
                <div className="text-xs text-green-600 mb-1">Completion Rate</div>
                <div className="text-xl font-bold text-gray-900">
                  {completionRate}%
                </div>
              </div>
              <div className="bg-purple-50 p-3 rounded border border-purple-100">
                <div className="text-xs text-purple-600 mb-1">Avg Attendance</div>
                <div className="text-xl font-bold text-gray-900">{stats.attendanceRate}%</div>
              </div>
              <div className="bg-red-50 p-3 rounded border border-red-100">
                <div className="text-xs text-red-600 mb-1">Critical Items</div>
                <div className="text-xl font-bold text-gray-900">{stats.critical}</div>
              </div>
            </div>
          </div>

          {/* Recent Meetings */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Meetings</h3>
            <div className="bg-gray-50 rounded border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-2">Title</th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMeetings.map((meeting) => (
                    <tr key={meeting.id} className="border-t border-gray-200 hover:bg-white">
                      <td className="p-2">{meeting.title || `Meeting ${meeting.sno}`}</td>
                      <td className="p-2">
                        {meeting.date ? new Date(meeting.date).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-2">
                        <span className={`px-2 py-1 rounded-full text-[10px] ${
                          meeting.status === 'completed' ? 'bg-green-100 text-green-800' :
                          meeting.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {meeting.status || 'pending'}
                        </span>
                      </td>
                      <td className="p-2">
                        {meeting.total_attendees ? (
                          <div className="text-xs">
                            <span className="text-green-600">{meeting.present_count || 0}</span>
                            <span className="text-gray-400 mx-1">/</span>
                            <span>{meeting.total_attendees}</span>
                          </div>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Department-wise Analysis */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Department Analysis</h3>
            <div className="bg-gray-50 rounded border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left p-2">Department</th>
                    <th className="text-left p-2">Total Meetings</th>
                    <th className="text-left p-2">Completed</th>
                    <th className="text-left p-2">Avg Attendance</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(departmentStats).map(([dept, data]) => {
                    const deptCompletionRate = data.total > 0 
                      ? Math.round((data.completed / data.total) * 100) 
                      : 0;
                    const deptAttendance = data.total > 0 
                      ? Math.round(data.attendance / data.total) 
                      : 0;
                    
                    return (
                      <tr key={dept} className="border-t border-gray-200 hover:bg-white">
                        <td className="p-2 capitalize">{dept}</td>
                        <td className="p-2">{data.total}</td>
                        <td className="p-2">
                          {data.completed} ({deptCompletionRate}%)
                        </td>
                        <td className="p-2">
                          {deptAttendance}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 p-3 rounded border">
              <h4 className="text-xs font-medium text-gray-900 mb-2">Productivity Metrics</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li className="flex justify-between">
                  <span>Meetings per Month:</span>
                  <span className="font-medium">{meetingsPerMonth}</span>
                </li>
                <li className="flex justify-between">
                  <span>Avg Meeting Duration:</span>
                  <span className="font-medium">{avgDuration} mins</span>
                </li>
                <li className="flex justify-between">
                  <span>Action Items Created:</span>
                  <span className="font-medium">{actionItems}</span>
                </li>
              </ul>
            </div>
            <div className="bg-gray-50 p-3 rounded border">
              <h4 className="text-xs font-medium text-gray-900 mb-2">Performance Indicators</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li className="flex justify-between">
                  <span>On-time Completion:</span>
                  <span className={`font-medium ${
                    completionRate >= 80 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {completionRate}%
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>Critical Resolution:</span>
                  <span className="font-medium">{criticalResolved}%</span>
                </li>
                <li className="flex justify-between">
                  <span>Attendance Compliance:</span>
                  <span className={`font-medium ${
                    stats.attendanceRate >= 80 ? 'text-green-600' : 
                    stats.attendanceRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {stats.attendanceRate}%
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Print Report
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingSummary;