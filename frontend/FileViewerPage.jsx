import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Save,
  Edit3,
  Eye,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Table as TableIcon
} from 'lucide-react';

const FileViewerPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { trackerId } = useParams();
  const { fileData, trackerInfo, returnTo } = location.state || {};

  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(20);
  const [editableData, setEditableData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  useEffect(() => {
    if (fileData) {
      setEditableData(JSON.parse(JSON.stringify(fileData)));
    }
  }, [fileData]);

  const handleBack = () => {
    const targetModule = returnTo === 'upload-trackers' ? 'upload-trackers' : 'project-dashboard';
    navigate('/dashboard', { state: { module: targetModule } });
  };

  const handleSave = () => {
    try {
      // Update the data in localStorage
      const savedFilesData = localStorage.getItem('uploaded_files_data');
      const filesData = savedFilesData ? JSON.parse(savedFilesData) : {};
      filesData[trackerId] = editableData;
      localStorage.setItem('uploaded_files_data', JSON.stringify(filesData));

      setSaveStatus('Saved successfully!');
      setIsEditing(false);

      setTimeout(() => {
        setSaveStatus('');
      }, 3000);
    } catch (error) {
      console.error('Error saving data:', error);
      setSaveStatus('Error saving data');
    }
  };

  const handleCellEdit = (sheetIndex, rowIndex, colIndex, value) => {
    if (!isEditing || !editableData) return;

    const newData = { ...editableData };

    if (newData.data && Array.isArray(newData.data)) {
      // Simple data format
      if (!newData.data[rowIndex]) {
        newData.data[rowIndex] = [];
      }
      newData.data[rowIndex][colIndex] = value;
    } else if (newData.sheets && newData.sheets[sheetIndex]) {
      // Sheet format
      const sheet = newData.sheets[sheetIndex];
      if (!sheet.data[rowIndex]) {
        sheet.data[rowIndex] = [];
      }
      sheet.data[rowIndex][colIndex] = value;
    }

    setEditableData(newData);
  };

  const exportToCSV = () => {
    let csvContent = '';
    let filename = `${trackerInfo?.fileName || 'export'}.csv`;

    if (editableData?.data && Array.isArray(editableData.data)) {
      // Handle simple data format
      if (editableData.headers) {
        csvContent += editableData.headers.join(',') + '\n';
      }
      editableData.data.forEach(row => {
        csvContent += row.join(',') + '\n';
      });
    } else if (editableData?.sheets && editableData.sheets.length > 0) {
      // Handle sheet format - use first sheet
      const sheet = editableData.sheets[0];
      if (sheet.headers) {
        csvContent += sheet.headers.join(',') + '\n';
      }
      sheet.data.forEach(row => {
        csvContent += row.join(',') + '\n';
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderTable = () => {
    if (!editableData) return null;

    let headers = [];
    let rows = [];

    if (editableData.data && Array.isArray(editableData.data)) {
      // Simple data format
      headers = editableData.headers || [];
      rows = editableData.data;
    } else if (editableData.sheets && editableData.sheets.length > 0) {
      // Sheet format - use first sheet
      const sheet = editableData.sheets[0];
      headers = sheet.headers || [];
      rows = sheet.data || [];
    }

    if (headers.length === 0 && rows.length > 0) {
      // Generate headers if none exist
      headers = Array(rows[0].length).fill('').map((_, i) => `Column ${i + 1}`);
    }

    // Pagination
    const totalPages = Math.ceil(rows.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const currentRows = rows.slice(startIndex, endIndex);

    return (
      <div className="flex flex-col h-full">
        {/* Table Controls */}
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center ${isEditing
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              <Edit3 className="h-4 w-4 mr-1.5" />
              {isEditing ? 'Editing Mode' : 'Edit Mode'}
            </button>

            {isEditing && (
              <button
                onClick={handleSave}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-1.5" />
                Save Changes
              </button>
            )}

            <button
              onClick={exportToCSV}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium flex items-center hover:bg-gray-200"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export CSV
            </button>
          </div>

          {saveStatus && (
            <span className={`text-sm ${saveStatus.includes('Error') ? 'text-red-600' : 'text-green-600'
              }`}>
              {saveStatus}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {headers.map((header, index) => (
                  <th
                    key={index}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 last:border-r-0"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentRows.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  {headers.map((header, colIndex) => (
                    <td
                      key={colIndex}
                      className={`px-4 py-2 text-sm text-gray-900 border-r border-gray-200 last:border-r-0 ${isEditing ? 'cursor-text' : ''
                        }`}
                      onClick={() => {
                        if (isEditing) {
                          const input = document.createElement('input');
                          input.type = 'text';
                          input.value = row[colIndex] || '';
                          input.className = 'w-full px-2 py-1 border border-blue-500 rounded focus:outline-none';

                          const td = input.parentElement;
                          if (td) {
                            td.innerHTML = '';
                            td.appendChild(input);
                            input.focus();

                            input.onblur = () => {
                              handleCellEdit(0, startIndex + rowIndex, colIndex, input.value);
                              td.innerHTML = input.value || '-';
                            };

                            input.onkeydown = (e) => {
                              if (e.key === 'Enter') {
                                input.blur();
                              }
                            };
                          }
                        }
                      }}
                    >
                      {row[colIndex] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-2">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(endIndex, rows.length)} of {rows.length} rows
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCards = () => {
    if (!editableData) return null;

    let headers = [];
    let rows = [];

    if (editableData.data && Array.isArray(editableData.data)) {
      headers = editableData.headers || [];
      rows = editableData.data;
    } else if (editableData.sheets && editableData.sheets.length > 0) {
      const sheet = editableData.sheets[0];
      headers = sheet.headers || [];
      rows = sheet.data || [];
    }

    if (headers.length === 0 && rows.length > 0) {
      headers = Array(rows[0].length).fill('').map((_, i) => `Column ${i + 1}`);
    }

    const totalPages = Math.ceil(rows.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const currentRows = rows.slice(startIndex, endIndex);

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={exportToCSV}
            className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium flex items-center hover:bg-gray-200"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export CSV
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentRows.map((row, rowIndex) => (
              <div key={rowIndex} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                {headers.map((header, colIndex) => (
                  <div key={colIndex} className="mb-2 last:mb-0">
                    <span className="text-xs font-medium text-gray-500 block">{header}</span>
                    <span className="text-sm text-gray-900 break-words">{row[colIndex] || '-'}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(endIndex, rows.length)} of {rows.length} rows
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!fileData || !trackerInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileSpreadsheet className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">No file data found</p>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBack}
              className="flex items-center text-sm text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </button>

            <div className="h-6 w-px bg-gray-300"></div>

            <div className="flex items-center">
              <FileSpreadsheet className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {String(trackerInfo.fileName).replace(/\.(xlsx|xls|csv|pdf|docx|txt|json)$/i, "")}
                </h1>
                <p className="text-xs text-gray-500">
                  Uploaded by {trackerInfo.employeeName} • {new Date(trackerInfo.uploadDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'table'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
              title="Table View"
            >
              <TableIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'cards'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
              title="Card View"
            >
              <Grid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm h-full p-6">
          {viewMode === 'table' ? renderTable() : renderCards()}
        </div>
      </div>
    </div>
  );
};

export default FileViewerPage;
