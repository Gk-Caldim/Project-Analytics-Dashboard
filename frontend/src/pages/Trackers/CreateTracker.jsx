import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { setSelectedUploadFileId, setActiveModule } from '../../store/slices/navSlice';
import { 
  FilePlus, Folder, User, Briefcase, Plus, Loader2, ArrowLeft, CheckCircle2,
  Trash2, Play, History, Calendar, FileSpreadsheet, Eye, Edit2, X, Info
} from 'lucide-react';
import API from '../../utils/api';
import { toast } from 'sonner';
import { getCurrentUser } from '../../utils/userUtils';
import { trackerSidebarManager } from '../../utils/trackerSidebarManager';
import FileContentViewer from './FileContentViewer';

const sidebarManager = trackerSidebarManager;

const CreateTracker = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Navigation tabs state
  const [activeTab, setActiveTab] = useState('overview'); // overview | drafts | activity
  
  // Modal creation states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTrackerName, setNewTrackerName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newDepartment, setNewDepartment] = useState('Design Release');
  const [newProjectManager, setNewProjectManager] = useState('');
  const [createdByUser, setCreatedByUser] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [modalErrors, setModalErrors] = useState({});
  const modalInputRef = useRef(null);

  // Editing spreadsheet states
  const [editingTracker, setEditingTracker] = useState(null);
  const [editingContent, setEditingContent] = useState(null);
  const [isFetchingContent, setIsFetchingContent] = useState(false);

  // 1. Fetch Projects List
  const { data: projectList = [], isLoading: isProjectsLoading } = useQuery({
    queryKey: ['projectsList'],
    queryFn: async () => {
      const response = await API.get('/projects/');
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // 2. Fetch Manual Trackers (Overview)
  const { data: manualTrackers = [], refetch: refetchManual, isLoading: isManualLoading } = useQuery({
    queryKey: ['manualTrackers'],
    queryFn: async () => {
      const response = await API.get('/trackers/manual');
      return response.data || [];
    }
  });

  // 3. Fetch Draft Manual Trackers
  const { data: draftTrackers = [], refetch: refetchDrafts, isLoading: isDraftsLoading } = useQuery({
    queryKey: ['draftTrackers'],
    queryFn: async () => {
      const response = await API.get('/trackers/manual/drafts');
      return response.data || [];
    }
  });

  // 4. Fetch Activity Logs
  const { data: activityLogs = [], refetch: refetchActivity, isLoading: isActivityLoading } = useQuery({
    queryKey: ['activityLogs'],
    queryFn: async () => {
      const response = await API.get('/audit-logs/?module=Create Tracker&limit=50');
      return response.data || [];
    }
  });

  // Load User Profile on mount
  useEffect(() => {
    const currentUserName = getCurrentUser();
    setCreatedByUser(currentUserName || 'System User');
  }, []);

  // Focus modal input on open
  useEffect(() => {
    if (showCreateModal && modalInputRef.current) {
      setTimeout(() => modalInputRef.current.focus(), 100);
    }
  }, [showCreateModal]);

  // Handle opening a manual tracker/draft for inline editing
  const handleOpenTracker = async (tracker) => {
    try {
      setEditingTracker(tracker);
      setEditingContent(null);
      setIsFetchingContent(true);
      
      const trackerId = tracker.id || tracker.upload_id;
      if (searchParams.get('edit') !== String(trackerId)) {
        setSearchParams({ edit: trackerId });
      }

      const response = await API.get(`/datasets/${trackerId}/excel-view`);
      if (response.data && response.data.fileData) {
        setEditingContent(response.data.fileData);
      } else {
        toast.error('Tracker data not found on server.');
        setEditingTracker(null);
        setSearchParams({});
      }
    } catch (error) {
      console.error('Error fetching tracker data:', error);
      toast.error('Failed to load tracker data');
      setEditingTracker(null);
      setSearchParams({});
    } finally {
      setIsFetchingContent(false);
    }
  };

  // Close the manual tracker editor and clean parameters
  const handleCloseTracker = () => {
    setEditingTracker(null);
    setEditingContent(null);
    setSearchParams({});
    refetchManual();
    refetchDrafts();
  };

  // URL parameters synchronization
  const editTrackerId = searchParams.get('edit') || searchParams.get('file');

  useEffect(() => {
    if (editTrackerId) {
      const trackerId = parseInt(editTrackerId, 10);
      
      // If we are not currently editing this tracker, find and open it
      if (!editingTracker || (editingTracker.id !== trackerId && editingTracker.upload_id !== trackerId)) {
        const allTrackers = [...manualTrackers, ...draftTrackers];
        const tracker = allTrackers.find(t => t.id === trackerId || t.upload_id === trackerId);
        
        if (tracker) {
          handleOpenTracker(tracker);
        } else if (!isManualLoading && !isDraftsLoading) {
          // Fallback: fetch tracker details directly from server
          const fetchAndOpen = async () => {
            try {
              const res = await API.get(`/uploads/${trackerId}`);
              if (res.data) {
                const t = res.data;
                handleOpenTracker({
                  id: t.id,
                  upload_id: t.id,
                  tracker_name: t.fileName || t.name,
                  name: t.fileName || t.name,
                  project_name: t.project,
                  project: t.project,
                  department: t.department,
                  uploaded_by: t.uploadedBy || t.uploaded_by,
                  status: t.status
                });
              }
            } catch (e) {
              console.error('Error fetching tracker details for URL sync:', e);
              // Minimum fallback
              handleOpenTracker({
                id: trackerId,
                upload_id: trackerId,
                tracker_name: 'Tracker ' + trackerId,
                name: 'Tracker ' + trackerId,
                status: 'Draft'
              });
            }
          };
          fetchAndOpen();
        }
      }
    } else {
      // URL cleared (e.g. Back button or sidebar click) — close manual tracker editor
      if (editingTracker) {
        setEditingTracker(null);
        setEditingContent(null);
      }
    }
  }, [editTrackerId, manualTrackers, draftTrackers, isManualLoading, isDraftsLoading]);

  // Handle saving spreadsheet changes
  const handleSaveTrackerData = async (updatedFileData, newStatus) => {
    if (!editingTracker) return;
    
    // Status resolution logic
    // If saving draft, keep 'Draft'
    // If publishing, upgrade to 'Completed'
    // If not specified, keep current status
    const targetStatus = newStatus || editingTracker.status;

    try {
      setIsFetchingContent(true);
      const headers = updatedFileData.headers || [];
      const rowsAsDicts = (updatedFileData.data || []).map(rowArray => {
        const rowObj = {};
        headers.forEach((h, index) => {
          rowObj[h] = rowArray[index] !== undefined ? rowArray[index] : '';
        });
        if (rowArray._record_id) {
          rowObj._record_id = rowArray._record_id;
        }
        return rowObj;
      });

      const payload = {
        schema: updatedFileData.columns_schema || [],
        rows: rowsAsDicts,
        status: targetStatus
      };

      await API.patch(`/tracker_ingestions/${editingTracker.id || editingTracker.upload_id}`, payload);
      
      // Update local edit state
      setEditingContent(prev => ({
        ...prev,
        headers: updatedFileData.headers,
        data: updatedFileData.data,
        schema: updatedFileData.columns_schema
      }));

      // If status has completed, register files to sidebars and go back
      if (targetStatus === 'Completed') {
        toast.success('Tracker published successfully!');
        
        // Register standard manual trackers in sidebar managers
        const projectName = editingTracker.project_name || editingTracker.project || 'System';
        const trackerName = editingTracker.tracker_name || editingTracker.fileName || editingTracker.name;
        const trackerId = editingTracker.id || editingTracker.upload_id;

        sidebarManager.addToProjectDashboard(
          projectName,
          trackerName,
          trackerId,
          editingTracker.uploaded_by || createdByUser,
          {
            department: editingTracker.department,
            uploadedBy: editingTracker.uploaded_by || createdByUser,
            fileType: 'MANUAL'
          }
        );

        // Dispatch update events for layout listeners
        window.dispatchEvent(new CustomEvent('uploadTrackerUpdate'));
        window.dispatchEvent(new CustomEvent('projectDashboardUpdate'));

        // Redirect user to spreadsheet view in Project Dashboard
        dispatch(setActiveModule('project-dashboard'));
        // Import setSelectedProjectFileId is already loaded at import
        const { setSelectedProjectFileId } = await import('../../store/slices/navSlice');
        dispatch(setSelectedProjectFileId(trackerId));
        navigate(`/dashboard/projects?projectId=${encodeURIComponent(projectName)}&submoduleId=${encodeURIComponent(trackerId)}`);

        setEditingTracker(null);
        setEditingContent(null);
      } else {
        toast.success('Draft saved successfully');
        // Refresh tabs content
        refetchManual();
        refetchDrafts();
        refetchActivity();
      }
    } catch (err) {
      console.error('Error saving manual tracker:', err);
      const errMsg = err.response?.data?.detail || 'Failed to save tracker changes';
      toast.error(errMsg);
    } finally {
      setIsFetchingContent(false);
    }
  };

  // Handle hard deleting manual trackers
  const handleDeleteTracker = async (id, name) => {
    if (!window.confirm(`Are you sure you want to hard delete the tracker "${name}"?`)) {
      return;
    }

    try {
      await API.delete(`/uploads/${id}`);
      toast.success('Tracker deleted successfully');
      
      // Clean up sidebars
      sidebarManager.deleteFileFromAllContexts(id);
      window.dispatchEvent(new CustomEvent('uploadTrackerUpdate'));
      window.dispatchEvent(new CustomEvent('projectDashboardUpdate'));

      // Refresh data
      refetchManual();
      refetchDrafts();
      refetchActivity();
    } catch (err) {
      console.error('Error deleting tracker:', err);
      toast.error('Failed to delete manual tracker');
    }
  };

  // Initialize new draft and launch spreadsheet
  const handleCreateDraft = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!newTrackerName.trim()) errors.trackerName = 'Tracker name is required';
    if (!newProjectName) errors.project = 'Project selection is required';

    const project = projectList.find(p => p.name === newProjectName);
    if (newProjectName && !project) {
      errors.project = 'Invalid project selected';
    }

    if (Object.keys(errors).length > 0) {
      setModalErrors(errors);
      return;
    }

    try {
      setIsCreating(true);
      const response = await API.post('/trackers/manual', {
        project_id: project.id,
        tracker_name: newTrackerName.trim(),
        status: 'Draft' // Always start as Draft
      });

      const newTracker = response.data;
      toast.success('Tracker draft initialized!');

      // Close modal & reset inputs
      setShowCreateModal(false);
      setNewTrackerName('');
      setNewProjectName('');
      setNewDepartment('Design Release');
      setNewProjectManager('');
      setModalErrors({});

      // Refresh drafts/activity list
      refetchDrafts();
      refetchActivity();

      // Launch spreadsheet view for this draft
      const mappedTrackerObj = {
        id: newTracker.id,
        project_name: newTracker.project,
        tracker_name: newTracker.name,
        department: newTracker.department,
        uploaded_by: newTracker.uploadedBy,
        status: newTracker.status
      };
      handleOpenTracker(mappedTrackerObj);
    } catch (err) {
      console.error('Error initializing manual tracker:', err);
      const errMsg = err.response?.data?.detail || 'Failed to initialize tracker draft';
      toast.error(errMsg);
    } finally {
      setIsCreating(false);
    }
  };

  // Render format timestamp helper
  const formatDateTime = (timestampStr) => {
    if (!timestampStr) return '-';
    try {
      const d = new Date(timestampStr);
      return d.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return timestampStr;
    }
  };

  // If in spreadsheet editor view, render FileContentViewer inline
  if (editingTracker) {
    return (
      <div className="master-table-container rounded-none">
        {isFetchingContent && !editingContent ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 bg-white dark:bg-slate-900">
            <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
            <p className="text-sm font-semibold text-text-muted">Loading tracker spreadsheet...</p>
          </div>
        ) : (
          <div className="master-table-container rounded-none dark:bg-slate-800 dark:border-slate-700">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 flex items-center justify-between bg-white dark:bg-slate-900">
              <button
                onClick={handleCloseTracker}
                className="flex items-center gap-2 text-slate-500 hover:text-slate-705 dark:text-slate-400 dark:hover:text-slate-200 transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Trackers Dashboard
              </button>
              
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                  Editing: {editingTracker.tracker_name || editingTracker.name}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  editingTracker.status === 'Draft' 
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700' 
                    : 'bg-emerald-100 dark:bg-emerald-955/30 text-emerald-600 border border-emerald-200/50 dark:border-emerald-900/50'
                }`}>
                  {editingTracker.status}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-hidden relative bg-white dark:bg-slate-900">
              {editingContent && (
                <FileContentViewer
                  fileData={editingContent}
                  trackerInfo={{
                    id: editingTracker.id || editingTracker.upload_id,
                    fileName: editingTracker.tracker_name || editingTracker.name,
                    project: editingTracker.project_name || editingTracker.project,
                    status: editingTracker.status
                  }}
                  onBack={handleCloseTracker}
                  onSaveData={handleSaveTrackerData}
                  viewOnly={false}
                  context="manual-builder"
                />
              )}
            </div>
          </div>
        )}
      </div>
    );
  }  return (
    <div className="master-table-container rounded-none">
      <>
        {/* MAIN CONTENT CONTAINER */}
        <div className="master-table-container rounded-none dark:bg-slate-800 dark:border-slate-700">
          
          {/* TOOLBAR SECTION */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              
              {/* LEFT SIDE (Tabs) */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex items-center gap-2 h-10 px-4 text-xs font-bold uppercase tracking-wider border rounded-md transition-all duration-200 shadow-sm cursor-pointer ${
                    activeTab === 'overview'
                      ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400 font-semibold'
                      : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  Overview
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === 'overview' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-350'
                  }`}>
                    {manualTrackers.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('drafts')}
                  className={`flex items-center gap-2 h-10 px-4 text-xs font-bold uppercase tracking-wider border rounded-md transition-all duration-200 shadow-sm cursor-pointer ${
                    activeTab === 'drafts'
                      ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400 font-semibold'
                      : 'bg-white dark:bg-slate-855 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  Drafts
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === 'drafts' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-405 dark:text-slate-355'
                  }`}>
                    {draftTrackers.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`flex items-center gap-2 h-10 px-4 text-xs font-bold uppercase tracking-wider border rounded-md transition-all duration-200 shadow-sm cursor-pointer ${
                    activeTab === 'activity'
                      ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400 font-semibold'
                      : 'bg-white dark:bg-slate-855 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  Activity Stream
                </button>
              </div>

              {/* RIGHT SIDE */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 h-10 px-4 text-xs sm:text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 whitespace-nowrap font-bold shadow-sm transition-all cursor-pointer active:scale-[0.98]"
                >
                  <Plus className="h-4 w-4" />
                  <span>Initialize Tracker</span>
                </button>
              </div>

            </div>
          </div>

          {/* TABLE SECTION - SCROLLABLE */}
          <div className="master-table-scroll">
            <div className="master-table-scroll-inner">
              
              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && (
                <>
                  {isManualLoading ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-3 h-full bg-white dark:bg-slate-900">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      <p className="text-xs font-semibold text-text-muted">Loading manual trackers...</p>
                    </div>
                  ) : manualTrackers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 text-center h-full bg-white dark:bg-slate-900">
                      <div className="p-3 bg-blue-500/10 text-blue-600 rounded-full mb-4">
                        <FileSpreadsheet className="h-6 w-6" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Manual Trackers</h3>
                      <p className="text-xs text-text-muted dark:text-slate-400 mt-1 max-w-sm">Active manual trackers will appear here. Initialize a blank tracker to get started.</p>
                    </div>
                  ) : (
                    <table className="master-table">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="py-3 px-4 font-semibold text-[13px] bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 w-16 text-center">S.No</th>
                          <th className="py-3 px-4 font-semibold text-[13px] bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-left">Tracker Name</th>
                          <th className="py-3 px-4 font-semibold text-[13px] bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-left">Project</th>
                          <th className="py-3 px-4 font-semibold text-[13px] bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-left">Department</th>
                          <th className="py-3 px-4 font-semibold text-[13px] bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-left">Created By</th>
                          <th className="py-3 px-4 font-semibold text-[13px] bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-left">Date Created</th>
                          <th className="py-3 px-4 font-semibold text-[13px] bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-right w-28">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/80 dark:divide-slate-700/50">
                        {manualTrackers.map((tracker, idx) => (
                          <tr key={tracker.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-3.5 px-4 text-center text-xs font-semibold text-text-muted">{idx + 1}</td>
                            <td className="py-3.5 px-4 text-sm font-bold text-slate-900 dark:text-slate-100">{tracker.tracker_name}</td>
                            <td className="py-3.5 px-4 text-sm font-semibold text-blue-600 dark:text-blue-400">{tracker.project_name}</td>
                            <td className="py-3.5 px-4 text-sm font-medium text-slate-600 dark:text-slate-350">{tracker.department}</td>
                            <td className="py-3.5 px-4 text-sm font-medium text-slate-600 dark:text-slate-350">{tracker.uploaded_by}</td>
                            <td className="py-3.5 px-4 text-sm font-medium text-slate-550 dark:text-slate-400">{tracker.uploaded_at}</td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleOpenTracker(tracker)}
                                  className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors cursor-pointer"
                                  title="Edit/View Tracker"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTracker(tracker.id, tracker.tracker_name)}
                                  className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors cursor-pointer"
                                  title="Delete Tracker"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}

              {/* TAB 2: DRAFTS */}
              {activeTab === 'drafts' && (
                <>
                  {isDraftsLoading ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-3 h-full bg-white dark:bg-slate-900">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      <p className="text-xs font-semibold text-text-muted">Loading pending drafts...</p>
                    </div>
                  ) : draftTrackers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-20 text-center h-full bg-white dark:bg-slate-900">
                      <div className="p-3 bg-slate-500/10 text-slate-500 rounded-full mb-4">
                        <FileSpreadsheet className="h-6 w-6" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Drafts</h3>
                      <p className="text-xs text-text-muted dark:text-slate-400 mt-1 max-w-sm">No pending drafts found. Drafts allow you to resume building trackers before publishing them.</p>
                    </div>
                  ) : (
                    <table className="master-table">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="py-3 px-4 font-semibold text-[13px] bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 w-16 text-center">S.No</th>
                          <th className="py-3 px-4 font-semibold text-[13px] bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-left">Draft Name</th>
                          <th className="py-3 px-4 font-semibold text-[13px] bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-left">Project</th>
                          <th className="py-3 px-4 font-semibold text-[13px] bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-left">Department</th>
                          <th className="py-3 px-4 font-semibold text-[13px] bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-left">Created By</th>
                          <th className="py-3 px-4 font-semibold text-[13px] bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-left">Date Created</th>
                          <th className="py-3 px-4 font-semibold text-[13px] bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-right w-28">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/80 dark:divide-slate-700/50">
                        {draftTrackers.map((draft, idx) => (
                          <tr key={draft.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-3.5 px-4 text-center text-xs font-semibold text-text-muted">{idx + 1}</td>
                            <td className="py-3.5 px-4 text-sm font-bold text-slate-900 dark:text-slate-100">
                              <div className="flex items-center gap-2">
                                <span>{draft.tracker_name}</span>
                                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-[9px] font-bold border border-slate-200 dark:border-slate-700">Draft</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-sm font-semibold text-blue-600 dark:text-blue-400">{draft.project_name}</td>
                            <td className="py-3.5 px-4 text-sm font-medium text-slate-600 dark:text-slate-350">{draft.department}</td>
                            <td className="py-3.5 px-4 text-sm font-medium text-slate-600 dark:text-slate-350">{draft.uploaded_by}</td>
                            <td className="py-3.5 px-4 text-sm font-medium text-slate-550 dark:text-slate-400">{draft.uploaded_at}</td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleOpenTracker(draft)}
                                  className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors cursor-pointer"
                                  title="Resume Editing Draft"
                                >
                                  <Play className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTracker(draft.id, draft.tracker_name)}
                                  className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors cursor-pointer"
                                  title="Discard Draft"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}

              {/* TAB 3: ACTIVITY STREAM */}
              {activeTab === 'activity' && (
                <div className="p-6 max-w-4xl mx-auto animate-fadeInUp">
                  {isActivityLoading ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-3 h-full bg-white dark:bg-slate-900">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      <p className="text-xs font-semibold text-text-muted">Loading activity feed...</p>
                    </div>
                  ) : activityLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-10 text-center h-full bg-white dark:bg-slate-900">
                      <div className="p-3 bg-slate-500/10 text-slate-500 rounded-full mb-4">
                        <History className="h-6 w-6" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Activity Logged</h3>
                      <p className="text-xs text-text-muted dark:text-slate-400 mt-1 max-w-sm">Actions performed in manual trackers will be logged and shown in this stream.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activityLogs.map((log) => {
                        let actionBadgeColor = 'bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-700';
                        if (log.action === 'CREATE DRAFT') {
                          actionBadgeColor = 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200/55 dark:border-blue-900/55';
                        } else if (log.action === 'PUBLISH TRACKER') {
                          actionBadgeColor = 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border border-purple-200/55 dark:border-purple-900/55';
                        } else if (log.action === 'DELETE TRACKER') {
                          actionBadgeColor = 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200/55 dark:border-red-900/55';
                        } else if (log.action === 'UPDATE TRACKER') {
                          actionBadgeColor = 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200/55 dark:border-amber-900/55';
                        }

                        return (
                          <div key={log.id} className="flex flex-col sm:flex-row items-start justify-between gap-3 p-4 bg-white dark:bg-slate-855 border border-slate-200 dark:border-slate-750 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-3">
                              <div className="mt-1 flex-shrink-0">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${actionBadgeColor}`}>
                                  {log.action}
                                </span>
                              </div>
                              <div>
                                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                  {log.details?.summary || `Performed operation: ${log.action}`}
                                </p>
                                <div className="flex items-center gap-4 text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3" /> {log.user_name || log.user_id} ({log.user_role || 'User'})
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> {formatDateTime(log.timestamp)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* FOOTER SECTION */}
          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-2 bg-white dark:bg-slate-800 flex-shrink-0 text-slate-500 dark:text-slate-400 text-xs">
            <div className="flex items-center gap-2">
              <span>
                {activeTab === 'overview' && `Showing ${manualTrackers.length} published trackers`}
                {activeTab === 'drafts' && `Showing ${draftTrackers.length} draft trackers`}
                {activeTab === 'activity' && `Showing latest activity logs`}
              </span>
            </div>
          </div>

        </div>

        {/* Initialize Tracker Modal */}
        {showCreateModal && (
          <div className="app-modal-overlay">
            <div className="app-modal-container max-w-lg w-full mx-4 animate-in fade-in duration-200">
              <div className="app-modal-header border-b border-slate-100 dark:border-slate-800 pb-4 bg-slate-50/50 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20">
                    <FilePlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="app-modal-title text-base font-bold text-slate-900 dark:text-slate-100">Initialize Blank Tracker</h3>
                    <p className="app-modal-description text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Define a draft tracker. Project metadata resolves automatically.</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setShowCreateModal(false); setModalErrors({}); }} 
                  className="app-modal-close-btn text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 animate-fade-in"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateDraft}>
                <div className="app-modal-body py-6 space-y-5">
                  {/* Tracker Name */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-450 uppercase tracking-widest mb-1.5">
                      Tracker Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      ref={modalInputRef}
                      type="text"
                      value={newTrackerName}
                      onChange={(e) => {
                        setNewTrackerName(e.target.value);
                        if (modalErrors.trackerName) setModalErrors({ ...modalErrors, trackerName: null });
                      }}
                      placeholder="e.g. Design Release Log Q3"
                      className={`w-full px-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-900 dark:text-slate-100 transition-all placeholder:text-slate-400 ${
                        modalErrors.trackerName ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-200 dark:border-slate-700'
                      }`}
                    />
                    {modalErrors.trackerName && (
                      <p className="mt-1.5 text-[10px] font-bold text-red-500 flex items-center gap-1"><Info size={12}/>{modalErrors.trackerName}</p>
                    )}
                  </div>

                  {/* Project Selection */}
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-455 uppercase tracking-widest mb-1.5">
                      Project Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Folder className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 opacity-80" />
                      <select
                        value={newProjectName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewProjectName(val);
                          if (modalErrors.project) setModalErrors({ ...modalErrors, project: null });
                          
                          const proj = projectList.find(p => p.name === val);
                          if (proj) {
                            setNewDepartment(proj.department || 'Design Release');
                            setNewProjectManager(proj.project_manager || 'System');
                          } else {
                            setNewDepartment('Design Release');
                            setNewProjectManager('');
                          }
                        }}
                        className={`w-full pl-9 pr-8 py-2 text-sm bg-slate-50 dark:bg-slate-800 border rounded-md focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-900 dark:text-slate-100 transition-all cursor-pointer appearance-none ${
                          modalErrors.project ? 'border-red-500 focus:ring-red-500/10' : 'border-slate-200 dark:border-slate-700'
                        }`}
                        disabled={isProjectsLoading}
                      >
                        <option value="">{isProjectsLoading ? 'Loading projects list...' : 'Select associated project...'}</option>
                        {projectList.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-405 dark:text-slate-505 text-[10px]">
                        ▼
                      </div>
                    </div>
                    {modalErrors.project && (
                      <p className="mt-1.5 text-[10px] font-bold text-red-550 flex items-center gap-1"><Info size={12}/>{modalErrors.project}</p>
                    )}
                  </div>

                  {/* Auto-resolved Meta data */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest mb-1.5">Department</label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-405 dark:text-slate-500 opacity-60" />
                        <input
                          type="text"
                          value={newDepartment}
                          readOnly
                          className="w-full pl-8 pr-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-lg text-xs text-text-muted select-none outline-none font-bold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest mb-1.5">Project Manager</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-455 dark:text-slate-500 opacity-60" />
                        <input
                          type="text"
                          value={newProjectManager || '-'}
                          readOnly
                          className="w-full pl-8 pr-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-lg text-xs text-text-muted select-none outline-none font-bold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-widest mb-1.5">Created By</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-455 dark:text-slate-500 opacity-60" />
                        <input
                          type="text"
                          value={createdByUser}
                          readOnly
                          className="w-full pl-8 pr-3 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-lg text-xs text-text-muted select-none outline-none font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="app-modal-footer bg-slate-50 dark:bg-slate-800/50">
                  <button
                    type="button"
                    onClick={() => { setShowCreateModal(false); setModalErrors({}); }}
                    className="px-6 py-2 text-sm font-semibold text-slate-600 dark:text-slate-100 hover:text-slate-900 dark:hover:text-slate-200 rounded-md transition-colors cursor-pointer"
                    disabled={isCreating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-8 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-md transition-all active:scale-[0.98] cursor-pointer"
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Initializing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Initialize & Open
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    </div>
  );
};

export default CreateTracker;
