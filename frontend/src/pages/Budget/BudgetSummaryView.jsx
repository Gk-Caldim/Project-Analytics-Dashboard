import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import API from '../../utils/api';
import ExcelTableViewer from '../../components/ExcelTableViewer';

const BudgetSummaryView = () => {
  const { projectName } = useParams();
  const [budget, setBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBudget = async () => {
    try {
      setLoading(true);
      setError(null);
      const resp = await API.get(`/budget/${projectName}`);
      setBudget(resp.data);
    } catch (err) {
      setError('Failed to load budget summary. Please try again.');
      console.error('Error fetching budget summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectName) {
      fetchBudget();
    }
  }, [projectName]);

  const handleSave = async (updatedData) => {
    try {
      await API.post(`/budget/${projectName}`, { ...budget, budget_data: updatedData });
      // Update local state after successful save
      setBudget(prev => ({ ...prev, budget_data: updatedData }));
    } catch (error) {
      console.error('Error saving budget data:', error);
      setError('Failed to save budget data.');
    }
  };

  const { columns, rows } = useMemo(() => {
    if (!budget || !budget.budget_data || !Array.isArray(budget.budget_data) || budget.budget_data.length === 0) {
      return { columns: [], rows: [] };
    }

    const rawData = budget.budget_data;
    const firstItem = rawData[0];

    // Case 1: Array of arrays (2D array) - This is the standard format from Excel uploads
    if (Array.isArray(firstItem)) {
      const headers = firstItem;
      const dataRows = rawData.slice(1).map(row => {
        const obj = {};
        if (Array.isArray(row)) {
          headers.forEach((h, i) => {
            if (h !== undefined && h !== null) {
              obj[h] = row[i];
            }
          });
        }
        return obj;
      });
      return { columns: headers, rows: dataRows };
    } 
    
    // Case 2: Array of objects - Fallback if data was saved as JSON objects
    if (typeof firstItem === 'object' && firstItem !== null) {
      const headers = Object.keys(firstItem);
      return { columns: headers, rows: rawData };
    }

    // Case 3: Fallback for unexpected formats
    console.warn('Budget data in unexpected format:', rawData);
    return { columns: [], rows: [] };
  }, [budget]);

  const handleDataUpdate = (updatedRows, updatedHeaders) => {
    const transformedData = [
      updatedHeaders,
      ...updatedRows.map(row => updatedHeaders.map(h => row[h] || ''))
    ];
    handleSave(transformedData);
  };

  if (loading && !budget) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!budget) return null;

  return (
    <div className="h-full bg-white">
      <div className="w-full max-w-[1600px] mx-auto space-y-4 px-6 py-4">
        <div>
          <h1 className="text-xl font-extrabold text-[#1e3a5f] tracking-tight">Budget Summary</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Project: {projectName}</p>
        </div>

        <div className="mt-2">
          <ExcelTableViewer
            key={`budget-summary-${projectName}`}
            columns={columns}
            data={rows}
            fileName={`Budget_Summary_${projectName}`}
            onDataUpdate={handleDataUpdate}
            onRefresh={fetchBudget}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default BudgetSummaryView;
