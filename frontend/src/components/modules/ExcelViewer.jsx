import React, { useState } from 'react';
import { FileSpreadsheet, X, Save, Download, Plus, Trash2, Edit, Eye } from 'lucide-react';
import * as XLSX from 'xlsx';

const ExcelViewer = ({ excelViewerData, uploadedFilesData, onClose, onDataChange }) => {
  const [excelEditMode, setExcelEditMode] = useState(false);
  const [excelEditData, setExcelEditData] = useState([]);
  const [currentSheet, setCurrentSheet] = useState(0);
  const [excelHeaders, setExcelHeaders] = useState([]);
  
  // Initialize data when component mounts or excelViewerData changes
  React.useEffect(() => {
    if (excelViewerData && excelViewerData.fileData) {
      const currentSheetData = excelViewerData.fileData.sheets[currentSheet];
      setExcelEditData(currentSheetData.data.map(row => [...(row || [])]));
      setExcelHeaders(currentSheetData.headers || []);
    }
  }, [excelViewerData, currentSheet]);

  if (!excelViewerData) return null;

  // Toggle Excel edit mode
  const toggleExcelEditMode = () => {
    setExcelEditMode(!excelEditMode);
  };

  // Handle Excel cell edit
  const handleExcelCellEdit = (rowIndex, colIndex, value) => {
    const newData = [...excelEditData];
    if (!newData[rowIndex]) {
      newData[rowIndex] = new Array(excelHeaders.length).fill('');
    }
    newData[rowIndex][colIndex] = value;
    setExcelEditData(newData);
  };

  // Save Excel changes
  const saveExcelChanges = () => {
    if (window.confirm('Are you sure you want to save changes to this file?')) {
      const updatedFileData = {
        ...excelViewerData.fileData,
        sheets: excelViewerData.fileData.sheets.map((sheet, index) => 
          index === currentSheet 
            ? { ...sheet, data: excelEditData }
            : sheet
        ),
        data: excelEditData,
        headers: excelHeaders
      };
      
      onDataChange(updatedFileData);
      setExcelEditMode(false);
      alert('Changes saved successfully!');
    }
  };

  // Switch sheet
  const switchSheet = (index) => {
    setCurrentSheet(index);
  };

  // Add new row
  const addNewRow = () => {
    const newRow = new Array(excelHeaders.length).fill('');
    const newData = [...excelEditData, newRow];
    setExcelEditData(newData);
  };

  // Delete row
  const deleteRow = (rowIndex) => {
    if (window.confirm('Are you sure you want to delete this row?')) {
      const newData = excelEditData.filter((_, index) => index !== rowIndex);
      setExcelEditData(newData);
    }
  };

  // Export file data
  const exportFileData = () => {
    if (!excelViewerData) return;
    
    const fileData = excelViewerData.fileData;
    if (!fileData) return;
    
    try {
      // Create worksheet from current sheet data
      const currentSheetData = fileData.sheets[currentSheet];
      const worksheetData = [
        currentSheetData.headers,
        ...currentSheetData.data
      ];
      
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, currentSheetData.name || "Sheet1");
      
      // Generate filename
      const originalName = excelViewerData.name.split('.').slice(0, -1).join('.');
      const extension = excelViewerData.name.split('.').pop();
      const exportName = `${originalName}_modified.${extension}`;
      
      XLSX.writeFile(wb, exportName);
      alert(`File exported as ${exportName}`);
    } catch (error) {
      console.error('Error exporting file:', error);
      alert('Error exporting file. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-300 bg-gray-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FileSpreadsheet className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 text-sm sm:text-base">{excelViewerData.name.replace(/\.(xlsx|xls|csv)$/i, '')}</h3>
              <p className="text-xs text-gray-600">
                {excelViewerData.type} • {excelViewerData.size} • {excelEditData.length} records
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 sm:p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-2">
            {/* Sheet Tabs */}
            {excelViewerData.fileData && excelViewerData.fileData.sheets.length > 1 && (
              <div className="flex space-x-1 overflow-x-auto">
                {excelViewerData.fileData.sheets.map((sheet, index) => (
                  <button
                    key={index}
                    onClick={() => switchSheet(index)}
                    className={`px-3 py-1.5 text-xs rounded whitespace-nowrap ${
                      currentSheet === index
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {sheet.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {excelEditMode ? (
              <>
                <button
                  onClick={saveExcelChanges}
                  className="flex items-center space-x-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                >
                  <Save className="h-3 w-3" />
                  <span>Save Changes</span>
                </button>
                <button
                  onClick={() => setExcelEditMode(false)}
                  className="flex items-center space-x-1 px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >
                  <X className="h-3 w-3" />
                  <span>Cancel</span>
                </button>
                <button
                  onClick={addNewRow}
                  className="flex items-center space-x-1 px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >
                  <Plus className="h-3 w-3" />
                  <span>Add Row</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={toggleExcelEditMode}
                  className="flex items-center space-x-1 px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >
                  <Edit className="h-3 w-3" />
                  <span>Edit Mode</span>
                </button>
                <button 
                  onClick={exportFileData}
                  className="flex items-center space-x-1 px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-50"
                >
                  <Download className="h-3 w-3" />
                  <span>Export</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Excel Table */}
        <div className="flex-1 overflow-auto p-4">
          {excelHeaders.length > 0 ? (
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      {excelHeaders.map((header, colIndex) => (
                        <th 
                          key={colIndex} 
                          className="px-4 py-3 text-left font-medium text-gray-700 border-r border-gray-300 last:border-r-0 min-w-[100px]"
                        >
                          <div className="flex items-center justify-between">
                            <span>{header}</span>
                          </div>
                        </th>
                      ))}
                      {excelEditMode && (
                        <th className="px-4 py-3 text-left font-medium text-gray-700 bg-gray-100 min-w-[80px]">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {excelEditData.map((row, rowIndex) => (
                      <tr 
                        key={rowIndex} 
                        className={`border-t border-gray-200 hover:bg-gray-50 ${
                          rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        {excelHeaders.map((_, colIndex) => (
                          <td 
                            key={colIndex} 
                            className="px-4 py-3 border-r border-gray-200 last:border-r-0"
                          >
                            {excelEditMode ? (
                              <input
                                type="text"
                                value={row[colIndex] || ''}
                                onChange={(e) => handleExcelCellEdit(rowIndex, colIndex, e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              />
                            ) : (
                              <span>{row[colIndex] || ''}</span>
                            )}
                          </td>
                        ))}
                        {excelEditMode && (
                          <td className="px-4 py-3 bg-gray-50">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => deleteRow(rowIndex)}
                                className="p-1 text-red-600 hover:text-red-800"
                                title="Delete Row"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
              <p className="text-gray-600">The uploaded file appears to be empty or could not be parsed.</p>
            </div>
          )}
          
          {/* Status Bar */}
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-gray-600">
            <div className="flex items-center space-x-4">
              <span>Sheet: {excelViewerData.fileData?.sheets?.[currentSheet]?.name || 'Sheet1'}</span>
              <span>Rows: {excelEditData.length}</span>
              <span>Columns: {excelHeaders.length}</span>
            </div>
            <div className="flex items-center space-x-2">
              {excelEditMode ? (
                <div className="flex items-center space-x-1 text-green-600">
                  <Edit className="h-3 w-3" />
                  <span>Editing Mode</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-gray-600">
                  <Eye className="h-3 w-3" />
                  <span>View Mode</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-300 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-xs text-gray-600">
            File: {excelViewerData.name} | Type: {excelViewerData.type} | 
            Uploaded: {excelViewerData.date} by {excelViewerData.uploadedBy}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded hover:bg-gray-100"
            >
              Close
            </button>
            {excelEditMode && (
              <button
                onClick={saveExcelChanges}
                className="px-3 py-1.5 text-xs bg-black text-white rounded hover:bg-gray-800"
              >
                Save File
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExcelViewer;