import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Filter, RotateCcw, ChevronDown, Check } from 'lucide-react';
import Select from 'react-select';

const FilterDrawer = ({ 
  isOpen, 
  onClose, 
  activeFilters, 
  setActiveFilters, 
  filterOptions,
  sections = [
    { id: 'department', label: 'Department', placeholder: 'Select departments...' },
    { id: 'role', label: 'Role', placeholder: 'Select roles...' },
    { id: 'status', label: 'Status', placeholder: 'Select status...' },
    { id: 'project_name', label: 'Project Name', placeholder: 'Select projects...' }
  ],
  title = "Filters",
  subtitle = "Refine your data list"
}) => {
  // Local state for the drawer to allow "Apply" pattern
  const [localFilters, setLocalFilters] = useState(activeFilters);

  // Sync local filters when drawer opens
  React.useEffect(() => {
    if (isOpen) setLocalFilters(activeFilters);
  }, [isOpen, activeFilters]);

  const handleApply = () => {
    setActiveFilters(localFilters);
    onClose();
  };

  const handleClear = () => {
    const cleared = {};
    sections.forEach(s => { cleared[s.id] = []; });
    setLocalFilters(cleared);
  };

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      backgroundColor: 'transparent',
      borderColor: state.isFocused ? '#3B82F6' : '#cbd5e1',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.1)' : 'none',
      '&:hover': { borderColor: '#3B82F6' },
      minHeight: '38px',
      fontSize: '13px'
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: '#fff',
      zIndex: 100
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected ? '#3B82F6' : state.isFocused ? '#f1f5f9' : 'transparent',
      color: state.isSelected ? '#fff' : '#334155',
      cursor: 'pointer',
      fontSize: '13px'
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: '#eff6ff',
      borderRadius: '4px'
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: '#1e40af',
      fontSize: '12px',
      fontWeight: '500'
    })
  };

  const darkSelectStyles = {
    ...selectStyles,
    control: (base, state) => ({
      ...base,
      backgroundColor: '#1e293b',
      borderColor: state.isFocused ? '#3B82F6' : '#475569',
      color: '#fff',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : 'none',
      '&:hover': { borderColor: '#3B82F6' },
      minHeight: '38px',
      fontSize: '13px'
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: '#1e293b',
      zIndex: 100,
      border: '1px solid #475569'
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected ? '#3B82F6' : state.isFocused ? '#334155' : 'transparent',
      color: '#fff',
      cursor: 'pointer',
      fontSize: '13px'
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
      borderRadius: '4px'
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: '#fff',
      fontSize: '12px'
    }),
    input: (base) => ({ ...base, color: '#fff' }),
    singleValue: (base) => ({ ...base, color: '#fff' })
  };

  const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark' || document.body.classList.contains('dark');
  const styles = isDarkMode ? darkSelectStyles : selectStyles;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[60]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white dark:bg-slate-900 shadow-2xl z-[70] flex flex-col border-l border-slate-200 dark:border-slate-800"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <Filter className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{subtitle}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              {/* Filter Categories */}
              {sections.map(section => (
                <div key={section.id} className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      {section.label}
                    </label>
                    {localFilters[section.id]?.length > 0 && (
                      <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-bold">
                        {localFilters[section.id].length}
                      </span>
                    )}
                  </div>
                  <Select
                    isMulti
                    options={(filterOptions[section.id] || []).map(opt => ({ value: opt, label: opt }))}
                    value={(localFilters[section.id] || []).map(opt => ({ value: opt, label: opt }))}
                    onChange={(selected) => {
                      setLocalFilters({ ...localFilters, [section.id]: selected ? selected.map(s => s.value) : [] });
                    }}
                    styles={styles}
                    placeholder={section.placeholder}
                    className="react-select-container"
                    classNamePrefix="react-select"
                    maxMenuHeight={250}
                  />
                </div>
              ))}

              {/* Information Note for Scalability */}
              <div className="mt-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                <div className="flex gap-3">
                  <div className="mt-0.5">
                    <Check className="h-4 w-4 text-emerald-500" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Filters are applied instantly to the table data. Searchable dropdowns allow you to handle thousands of records efficiently without slowing down the interface.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3">
              <button
                onClick={handleClear}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
              <button
                onClick={handleApply}
                className="flex-1 bg-blue-600 text-white text-sm font-bold py-2.5 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98]"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FilterDrawer;
