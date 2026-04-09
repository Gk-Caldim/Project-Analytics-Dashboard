import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Upload, Search, Plus, Trash2, Eye, FileSpreadsheet,
  CheckCircle, AlertCircle, X, ChevronDown, Filter,
  Calendar, DollarSign, Briefcase, User, File,
  Download, ChevronUp, RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import API from '../../utils/api';
import SearchableDropdown from '../../components/SearchableDropdown';
import PermissionGuard from '../../components/PermissionGuard';

const BudgetUpload = () => {
  // State for data
  const [budgets, setBudgets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('All Projects');
  const navigate = useNavigate();
  const user = useSelector(state => state.auth.user);

  // State for UI
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeletePrompt, setShowDeletePrompt] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [sortConfig, setSortConfig] = useState({ key: 'updated_at', direction: 'descending' });

  // State for Upload Form
  const [uploadForm, setUploadForm] = useState({
    project: '',
    uploaded_by: '',
    department: '',
    file: null,
    preview: []
  });
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState({});
  const [progress, setProgress] = useState(0);

  // Fetch data on mount
  useEffect(() => {
    fetchBudgets();
    fetchProjects();
    fetchEmployees();
    fetchDepartments();
  }, []);

  // Auto-populate uploaded_by from logged-in user
  useEffect(() => {
    if (user) {
      let userName = user.full_name || user.name;

      // Fallback: search in employees list if name is missing
      if (!userName && employees.length > 0 && user.employee_id) {
        const emp = employees.find(e => e.employee_id === user.employee_id);
        if (emp) userName = emp.name;
      }

      if (!userName) userName = 'User';

      const employeeId = user.employee_id || '';
      const uploadedByValue = employeeId ? `${userName} (${employeeId})` : userName;

      setUploadForm(prev => ({
        ...prev,
        uploaded_by: uploadedByValue
      }));
    }
  }, [user, employees]);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      const resp = await API.get('/budget/');
      setBudgets(resp.data || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      showNotification('Failed to load budget summaries', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const resp = await API.get('/projects/');
      setProjects(resp.data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const resp = await API.get('/employees/');
      setEmployees(resp.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const resp = await API.get('/departments/');
      setDepartments(resp.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Handle File Change for Upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      setUploadForm(prev => ({
        ...prev,
        file: file,
        preview: data
      }));

      if (uploadErrors.file) {
        setUploadErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.file;
          return newErrors;
        });
      }
    };
    reader.readAsBinaryString(file);
  };

  // Handle Upload Submit
  const handleUploadSubmit = async () => {
    const errors = {};
    if (!uploadForm.project) errors.project = 'Project is required';
    if (!uploadForm.department) errors.department = 'Department is required';
    if (!uploadForm.department) errors.department = 'Department is required';
    if (!uploadForm.file || uploadForm.preview.length === 0) errors.file = 'A valid file is required';

    if (Object.keys(errors).length > 0) {
      setUploadErrors(errors);
      return;
    }

    try {
      setUploading(true);
      setProgress(20);
      const payload = {
        project_name: uploadForm.project,
        uploaded_by: uploadForm.uploaded_by,
        department: uploadForm.department,
        budget_data: uploadForm.preview
      };

      setProgress(50);
      await API.post(`/budget/${encodeURIComponent(uploadForm.project)}`, payload);

      setProgress(100);
      showNotification('Budget summary saved successfully');
      setShowUploadModal(false);
      setUploadForm(prev => ({
        ...prev,
        project: '',
        department: '',
        file: null,
        preview: []
      }));
      fetchBudgets();

      // Notify other components
      window.dispatchEvent(new CustomEvent('projectDashboardUpdate'));
    } catch (error) {
      console.error('Error saving budget:', error);
      showNotification(error.response?.data?.detail || 'Failed to save budget', 'error');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  // Handle Delete
  const handleDeleteBudget = async (projectName) => {
    try {
      await API.delete(`/budget/${encodeURIComponent(projectName)}`);
      showNotification('Budget summary deleted successfully');
      fetchBudgets();
      window.dispatchEvent(new CustomEvent('projectDashboardUpdate'));
    } catch (error) {
      console.error('Error deleting budget:', error);
      showNotification('Failed to delete budget', 'error');
    } finally {
      setShowDeletePrompt(null);
    }
  };

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      [
        "Category",
        "Department",
        "Estimation",
        "Approved (x)",
        "Utilized (y)",
        "Balance (z=x-y)",
        "Outlook Spend (S)",
        "Likely Cummulative Spend (Z+S)"
      ],
      ["CAPEX", "", "", "", "", "", "", ""],
      ["Total CAPEX", "", "", "", "", "", "", ""],
      ["Revenue", "", "", "", "", "", "", ""],
      ["Total Revenue", "", "", "", "", "", "", ""]
    ];

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(templateData);

    // Set column widths for better readability
    const colWidths = [
      { wch: 20 }, // Category
      { wch: 20 }, // Department
      { wch: 15 }, // Estimation
      { wch: 15 }, // Approved (x)
      { wch: 15 }, // Utilized (y)
      { wch: 15 }, // Balance (z=x-y)
      { wch: 18 }, // Outlook Spend (S)
      { wch: 25 }, // Likely Cummulative Spend (Z+S)
    ];
    ws['!cols'] = colWidths;

    // Create workbook and download
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Budget Template");
    XLSX.writeFile(wb, "Budget_Template.xlsx");

    showNotification('Template downloaded successfully');
  };


  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ChevronUp className="h-4 w-4 opacity-30" />;
    }
    return sortConfig.direction === 'ascending'
      ? <ChevronUp className="h-4 w-4" />
      : <ChevronDown className="h-4 w-4" />;
  };

  // Filter and Sort budgets
  const filteredAndSortedBudgets = budgets
    .filter(b => {
      const matchSearch = b.project_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchProject = projectFilter === 'All Projects' || b.project_name === projectFilter;
      return matchSearch && matchProject;
    })
    .sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      if (aVal < bVal) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });

  return (
    <div className="space-y-4 px-0 pb-10">
      {/* UPLOAD & DOWNLOAD AREA - Splitted into two parts as requested */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
          {/* LEFT: UPLOAD SECTION */}
          <PermissionGuard permission="upload_budget">
            <div
              className="border-2 border-dashed border-slate-200 rounded-2xl p-10 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer transition-all group flex flex-col items-center justify-center"
              onClick={() => setShowUploadModal(true)}
            >
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-4 bg-slate-50 rounded-full group-hover:bg-blue-100 transition-colors">
                  <Upload className="h-10 w-10 text-slate-400 group-hover:text-blue-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-800">Upload Budget</p>
                  <p className="text-sm text-slate-500 mt-1">Drag & drop or click to browse files</p>
                </div>
              </div>
            </div>
          </PermissionGuard>

          {/* RIGHT: DOWNLOAD SECTION */}
          <div
            className="border-2 border-dashed border-slate-200 rounded-2xl p-10 hover:border-green-400 hover:bg-green-50/30 cursor-pointer transition-all group flex flex-col items-center justify-center"
            onClick={handleDownloadTemplate}
          >
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 bg-slate-50 rounded-full group-hover:bg-green-100 transition-colors">
                <Download className="h-10 w-10 text-slate-400 group-hover:text-green-600" />
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-800">Download Template</p>
                <p className="text-sm text-slate-500 mt-1">Get an empty Excel file to fill data</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PermissionGuard permission="view_budget">
        {/* TOOLBAR SECTION - Matching Screenshot */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <select
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                    className="appearance-none flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer hover:bg-slate-100"
                  >
                    <option value="All Projects">All Projects</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-slate-400" />
                </div>
                <button className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors shadow-sm">
                  <Download className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* TABLE SECTION - Matching Screenshot */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="w-12 px-6 py-4">
                    <div className="h-4 w-4 border-2 border-slate-300 rounded cursor-pointer"></div>
                  </th>
                  <th
                    className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer group"
                    onClick={() => handleSort('project_name')}
                  >
                    <div className="flex items-center gap-1">
                      PROJECT NAME {getSortIcon('project_name')}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    UPLOADED BY
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    DEPARTMENT
                  </th>
                  <th
                    className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort('updated_at')}
                  >
                    <div className="flex items-center gap-1">
                      LAST UPDATED {getSortIcon('updated_at')}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    BUDGET SUMMARY
                  </th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
                        <span className="text-sm font-medium text-slate-500">Loading budgets...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredAndSortedBudgets.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500 text-sm">
                      No budget records found.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedBudgets.map((budget) => (
                    <tr key={budget.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="h-4 w-4 border-2 border-slate-200 rounded group-hover:border-blue-400 transition-colors cursor-pointer"></div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 text-[14px]">{budget.project_name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 text-[14px]">{budget.uploaded_by || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 text-[14px]">{budget.department || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span className="font-medium text-slate-600 text-[14px]">
                            {budget.updated_at ? new Date(budget.updated_at).toLocaleString() : 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div
                          onClick={() => navigate(`/dashboard/budget-summary/${encodeURIComponent(budget.project_name)}`)}
                          className="flex items-center gap-2 text-blue-600 font-medium text-[14px] cursor-pointer hover:underline"
                        >
                          <File className="h-4 w-4" />
                          <span>Budget Summary</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => navigate(`/dashboard/budget-summary/${encodeURIComponent(budget.project_name)}`)}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <PermissionGuard permission="delete_budget">
                            <button
                              onClick={() => setShowDeletePrompt(budget.project_name)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </PermissionGuard>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </PermissionGuard>

      {/* UPLOAD MODAL - Enhanced matching screenshot modal style */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Upload Details</h2>
                <p className="text-sm text-slate-500 mt-1">Enter project details and upload your budget file</p>
              </div>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadForm({ project: '', currency: '$', file: null, preview: [] });
                  setUploadErrors({});
                }}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="h-6 w-6 text-slate-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Project Name *</label>
                  <SearchableDropdown
                    options={projects.map(p => p.name)}
                    value={uploadForm.project}
                    onChange={(val) => {
                      setUploadForm({ ...uploadForm, project: val });
                      if (uploadErrors.project) setUploadErrors({ ...uploadErrors, project: '' });
                    }}
                    placeholder="Select project"
                    className="!rounded-xl"
                  />
                  {uploadErrors.project && (
                    <p className="mt-2 text-xs text-red-500 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3" /> {uploadErrors.project}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Uploaded By</label>
                  <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    {uploadForm.uploaded_by}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Department *</label>
                  <SearchableDropdown
                    options={departments.map(d => d.name || d.department_id)}
                    value={uploadForm.department}
                    onChange={(val) => {
                      setUploadForm({ ...uploadForm, department: val });
                      if (uploadErrors.department) setUploadErrors({ ...uploadErrors, department: '' });
                    }}
                    placeholder="Select department"
                    className="!rounded-xl"
                  />
                  {uploadErrors.department && (
                    <p className="mt-2 text-xs text-red-500 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3" /> {uploadErrors.department}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">File *</label>
                <div className={`relative border-2 border-dashed rounded-2xl p-8 transition-all text-center ${uploadForm.file ? 'border-green-200 bg-green-50/30' :
                  uploadErrors.file ? 'border-red-200 bg-red-50/30' :
                    'border-slate-200 hover:border-blue-400 hover:bg-blue-50/30'
                  }`}>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center">
                    <div className={`p-4 rounded-full mb-3 ${uploadForm.file ? 'bg-green-100 text-green-600' :
                      uploadErrors.file ? 'bg-red-100 text-red-600' :
                        'bg-slate-100 text-slate-400'
                      }`}>
                      <Upload className="h-8 w-8" />
                    </div>
                    <p className="text-sm font-bold text-slate-800">
                      {uploadForm.file ? uploadForm.file.name : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">Supports: CSV, Excel, JSON, TXT (Max 50MB)</p>
                  </div>
                </div>
                {uploadErrors.file && (
                  <p className="mt-2 text-xs text-red-500 flex items-center gap-1 font-medium">
                    <AlertCircle className="h-3 w-3" /> {uploadErrors.file}
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadForm(prev => ({ ...prev, project: '', department: '', file: null, preview: [] }));
                  setUploadErrors({});
                }}
                className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadSubmit}
                disabled={uploading}
                className="px-8 py-2.5 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 disabled:opacity-60 transition-all shadow-lg flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <span>Upload File</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Prompt */}
      {showDeletePrompt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="p-4 bg-red-100 text-red-600 rounded-full w-fit mx-auto mb-6">
              <Trash2 className="h-8 w-8" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Delete Budget Summary?</h3>
            <p className="text-slate-500 mb-8 leading-relaxed">
              Are you sure you want to delete the budget summary for <span className="font-bold text-slate-900">"{showDeletePrompt}"</span>? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeletePrompt(null)}
                className="flex-1 px-6 py-3 text-sm font-bold text-slate-600 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteBudget(showDeletePrompt)}
                className="flex-1 px-6 py-3 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-200"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      {notification.show && (
        <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-right-10 duration-500">
          <div className={`flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl border ${notification.type === 'success'
            ? 'bg-green-50 border-green-100 text-green-800'
            : 'bg-red-50 border-red-100 text-red-800'
            }`}>
            <div className={`p-2 rounded-full ${notification.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
              {notification.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
            </div>
            <span className="text-sm font-bold">{notification.message}</span>
            <button
              onClick={() => setNotification({ ...notification, show: false })}
              className="ml-4 p-1 hover:bg-black/5 rounded-full"
            >
              <X className="h-4 w-4 opacity-50" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetUpload;
