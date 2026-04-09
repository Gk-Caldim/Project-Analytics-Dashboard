// AnalyticsDashboard.jsx
import React, { useState, useMemo } from 'react';
import * as Icons from 'lucide-react';

const AnalyticsDashboard = ({ meetings }) => {
  const [timeRange, setTimeRange] = useState('all');

  // Calculate statistics
  const stats = useMemo(() => {
    const filteredMeetings = meetings.filter(meeting => {
      if (timeRange === 'all') return true;
      const meetingDate = new Date(meeting.created_at);
      const now = new Date();
      const daysAgo = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 365;
      const cutoffDate = new Date(now.setDate(now.getDate() - daysAgo));
      return meetingDate >= cutoffDate;
    });

    return {
      total: filteredMeetings.length,
      completed: filteredMeetings.filter(m => m.status === 'completed').length,
      inProgress: filteredMeetings.filter(m => m.status === 'in_progress').length,
      pending: filteredMeetings.filter(m => m.status === 'pending').length,
      critical: filteredMeetings.filter(m => m.criticality === 'critical').length,
      high: filteredMeetings.filter(m => m.criticality === 'high').length,
      medium: filteredMeetings.filter(m => m.criticality === 'medium').length,
      low: filteredMeetings.filter(m => m.criticality === 'low').length,
    };
  }, [meetings, timeRange]);

  // Calculate completion percentage
  const completionPercentage = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;

  // Get top 5 speakers
  const topSpeakers = useMemo(() => {
    const speakerCount = {};
    meetings.forEach(meeting => {
      const speaker = meeting.speaker || 'Unknown';
      speakerCount[speaker] = (speakerCount[speaker] || 0) + 1;
    });
    
    return Object.entries(speakerCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [meetings]);

  // Get top 5 projects
  const topProjects = useMemo(() => {
    const projectCount = {};
    meetings.forEach(meeting => {
      const project = meeting.project_name || 'Unnamed';
      projectCount[project] = (projectCount[project] || 0) + 1;
    });
    
    return Object.entries(projectCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [meetings]);

  // Get overdue tasks
  const overdueTasks = useMemo(() => {
    return meetings
      .filter(meeting => {
        if (!meeting.target || meeting.status === 'completed') return false;
        const targetDate = new Date(meeting.target);
        const today = new Date();
        return targetDate < today;
      })
      .slice(0, 5);
  }, [meetings]);

  // Get recent meetings
  const recentMeetings = useMemo(() => {
    return [...meetings]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);
  }, [meetings]);

  return (
    <div className="space-y-6">
      {/* Analytics Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-sm text-gray-600">
            Comprehensive analysis of {meetings.length} meeting minutes • Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
        
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded"
        >
          <option value="all">All Time</option>
          <option value="month">Last 30 Days</option>
          <option value="week">Last 7 Days</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700 font-medium">Total Meetings</p>
              <p className="text-3xl font-bold text-blue-900 mt-2">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-200 rounded-full">
              <Icons.FileText className="h-6 w-6 text-blue-700" />
            </div>
          </div>
          <div className="mt-4 text-xs text-blue-600">
            <div className="flex items-center gap-1">
              <Icons.TrendingUp className="h-3 w-3" />
              <span>All recorded meetings</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">Completion Rate</p>
              <p className="text-3xl font-bold text-green-900 mt-2">{completionPercentage}%</p>
            </div>
            <div className="p-3 bg-green-200 rounded-full">
              <Icons.CheckCircle className="h-6 w-6 text-green-700" />
            </div>
          </div>
          <div className="mt-4 text-xs text-green-600">
            <div className="flex items-center gap-1">
              <Icons.Target className="h-3 w-3" />
              <span>{stats.completed} of {stats.total} completed</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700 font-medium">Critical Issues</p>
              <p className="text-3xl font-bold text-red-900 mt-2">{stats.critical + stats.high}</p>
            </div>
            <div className="p-3 bg-red-200 rounded-full">
              <Icons.AlertTriangle className="h-6 w-6 text-red-700" />
            </div>
          </div>
          <div className="mt-4 text-xs text-red-600">
            <div className="flex items-center gap-1">
              <Icons.AlertCircle className="h-3 w-3" />
              <span>Requires immediate attention</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-700 font-medium">In Progress</p>
              <p className="text-3xl font-bold text-purple-900 mt-2">{stats.inProgress}</p>
            </div>
            <div className="p-3 bg-purple-200 rounded-full">
              <Icons.Clock className="h-6 w-6 text-purple-700" />
            </div>
          </div>
          <div className="mt-4 text-xs text-purple-600">
            <div className="flex items-center gap-1">
              <Icons.Loader className="h-3 w-3" />
              <span>Currently being worked on</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Status Distribution</h3>
            <div className="text-sm text-gray-600">
              {stats.total} total items
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Completed</span>
                <span className="text-sm font-bold text-green-600">{stats.completed} ({stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-green-500 h-3 rounded-full" 
                  style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">In Progress</span>
                <span className="text-sm font-bold text-blue-600">{stats.inProgress} ({stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-500 h-3 rounded-full" 
                  style={{ width: `${stats.total > 0 ? (stats.inProgress / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">Pending</span>
                <span className="text-sm font-bold text-yellow-600">{stats.pending} ({stats.total > 0 ? Math.round((stats.pending / stats.total) * 100) : 0}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-yellow-500 h-3 rounded-full" 
                  style={{ width: `${stats.total > 0 ? (stats.pending / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Criticality Analysis */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Criticality Analysis</h3>
            <div className="text-sm text-gray-600">
              Priority breakdown
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm font-medium text-gray-700">Critical</span>
                </div>
                <span className="text-sm font-bold text-red-600">{stats.critical}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-red-500 h-3 rounded-full" 
                  style={{ width: `${stats.total > 0 ? (stats.critical / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <span className="text-sm font-medium text-gray-700">High</span>
                </div>
                <span className="text-sm font-bold text-orange-600">{stats.high}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-orange-500 h-3 rounded-full" 
                  style={{ width: `${stats.total > 0 ? (stats.high / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm font-medium text-gray-700">Medium</span>
                </div>
                <span className="text-sm font-bold text-yellow-600">{stats.medium}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-yellow-500 h-3 rounded-full" 
                  style={{ width: `${stats.total > 0 ? (stats.medium / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium text-gray-700">Low</span>
                </div>
                <span className="text-sm font-bold text-green-600">{stats.low}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-green-500 h-3 rounded-full" 
                  style={{ width: `${stats.total > 0 ? (stats.low / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Analytics Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Speakers */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Top Contributors</h3>
          <div className="space-y-4">
            {topSpeakers.map((speaker, index) => (
              <div key={speaker.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-blue-600">
                      {speaker.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{speaker.name}</div>
                    <div className="text-xs text-gray-600">{speaker.count} contributions</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">{speaker.count}</div>
                  <div className="text-xs text-gray-500">meetings</div>
                </div>
              </div>
            ))}
            
            {topSpeakers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Icons.Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No speaker data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Top Projects */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Active Projects</h3>
          <div className="space-y-4">
            {topProjects.map((project, index) => (
              <div key={project.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-green-600">
                      {index + 1}
                    </span>
                  </div>
                  <div className="max-w-[200px]">
                    <div className="font-medium text-gray-900 truncate">{project.name}</div>
                    <div className="text-xs text-gray-600">{project.count} meetings</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">{project.count}</div>
                  <div className="text-xs text-gray-500">discussions</div>
                </div>
              </div>
            ))}
            
            {topProjects.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Icons.Folder className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No project data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overdue Tasks */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Overdue Action Items</h3>
            <p className="text-sm text-gray-600">Tasks past their due date</p>
          </div>
          <div className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
            {overdueTasks.length} overdue
          </div>
        </div>
        
        <div className="space-y-4">
          {overdueTasks.map(meeting => {
            const targetDate = new Date(meeting.target);
            const today = new Date();
            const daysOverdue = Math.floor((today - targetDate) / (1000 * 60 * 60 * 24));
            
            return (
              <div key={meeting.id} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold text-red-900">{meeting.project_name}</h4>
                      <span className="px-2 py-1 text-xs bg-red-200 text-red-800 rounded">
                        {daysOverdue} days overdue
                      </span>
                    </div>
                    <p className="text-sm text-red-700 mb-3">{meeting.discussion_point}</p>
                    
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Icons.User className="h-3 w-3" />
                        <span>Speaker: {meeting.speaker || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Icons.Users className="h-3 w-3" />
                        <span>Responsible: {meeting.responsibility}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Icons.Calendar className="h-3 w-3" />
                        <span>Due: {targetDate.toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Icons.AlertTriangle className="h-3 w-3" />
                        <span>Priority: {meeting.criticality}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {overdueTasks.length === 0 && (
            <div className="text-center py-12 bg-green-50 rounded-lg">
              <Icons.CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-400" />
              <h4 className="text-lg font-bold text-green-800 mb-2">All tasks on schedule!</h4>
              <p className="text-sm text-green-600">No overdue action items</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;