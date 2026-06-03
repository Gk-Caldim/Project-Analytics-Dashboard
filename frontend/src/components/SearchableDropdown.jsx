import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

const SearchableDropdown = ({ 
  options = [], 
  value = '', 
  onChange, 
  placeholder = 'Select an option...',
  className = '',
  controlClassName = '',
  disabled = false,
  required = false,
  isMulti = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getLabel = (option) => {
    if (typeof option === 'object' && option !== null) {
      return option.label || option.name || option.value || '';
    }
    return option?.toString() || '';
  };

  const getValue = (option) => {
    if (typeof option === 'object' && option !== null) {
      return option.value !== undefined ? option.value : (option.id !== undefined ? option.id : option);
    }
    return option;
  };

  const filteredOptions = options.filter(option =>
    getLabel(option).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const valueArray = Array.isArray(value) 
    ? value 
    : (typeof value === 'string' && value ? value.split(',').map(s => s.trim()).filter(Boolean) : []);

  const handleSelect = (option) => {
    const optValue = getValue(option);
    
    if (isMulti) {
      const isSelected = valueArray.includes(optValue);
      let newValueArray;
      if (isSelected) {
        newValueArray = valueArray.filter(v => v !== optValue);
      } else {
        newValueArray = [...valueArray, optValue];
      }
      // Pass the new array and the current option to onChange
      onChange(newValueArray, option);
      // We don't close the dropdown or clear search on multi-select
    } else {
      // Pass both the primitive value and the full option object for flexibility
      onChange(optValue, option);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(isMulti ? [] : '', null);
    setSearchTerm('');
  };

  const handleRemoveTag = (e, valToRemove) => {
    e.stopPropagation();
    const newValueArray = valueArray.filter(v => v !== valToRemove);
    onChange(newValueArray, null);
  };

  // Find the label for the current value (single select)
  const selectedOption = options.find(opt => getValue(opt) === value);
  const displayLabel = selectedOption ? getLabel(selectedOption) : (value || placeholder);

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      <div
        className={`
          flex items-center justify-between w-full border cursor-pointer transition-all duration-200
          px-3 py-2 text-sm rounded-lg border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-blue-400 dark:hover:border-blue-500 text-gray-900 dark:text-slate-100
          ${controlClassName}
          ${disabled ? 'bg-gray-50 dark:bg-slate-800 cursor-not-allowed opacity-60' : ''}
          ${isOpen ? 'border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/20' : ''}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex-1 truncate">
          {isMulti ? (
            valueArray.length > 0 ? (
              <div className="flex flex-wrap gap-1 my-[-2px]">
                {valueArray.map((v, i) => {
                  const opt = options.find(o => getValue(o) === v);
                  const label = opt ? getLabel(opt) : v;
                  return (
                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/50">
                      {label}
                      <button
                        type="button"
                        onClick={(e) => handleRemoveTag(e, v)}
                        className="ml-1 text-blue-600 dark:text-blue-400 hover:text-red-500 dark:hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            ) : (
              <span className="text-gray-400 dark:text-slate-500 font-normal">{placeholder}</span>
            )
          ) : (
            <span className={value ? "" : "text-gray-400 dark:text-slate-500 font-normal"}>
              {displayLabel}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1 ml-2">
          {value && !disabled && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl animate-in fade-in zoom-in duration-200 origin-top">
          <div className="p-2 border-b border-gray-100 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2 text-sm border-0 focus:ring-0 bg-gray-50 dark:bg-slate-800 rounded-md text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const optValue = getValue(option);
                const isSelected = isMulti ? valueArray.includes(optValue) : optValue === value;
                return (
                  <div
                    key={index}
                    className={`
                      flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-colors
                      ${isSelected ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'}
                    `}
                    onClick={() => handleSelect(option)}
                  >
                    <span className="truncate">{getLabel(option)}</span>
                    {isSelected && <Check className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2" />}
                  </div>
                );
              })
            ) : (
              <div className="px-3 py-6 text-center">
                <p className="text-sm text-gray-400">No results found</p>
                {searchTerm && (
                   <button 
                     onClick={() => handleSelect(searchTerm)}
                     className="mt-2 text-xs text-blue-600 hover:underline font-medium"
                   >
                     Use "{searchTerm}" anyway
                   </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableDropdown;
