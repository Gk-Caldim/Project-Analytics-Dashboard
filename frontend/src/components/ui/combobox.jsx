import React, { createContext, useContext, useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

// Helper utilities to adapt seamlessly to both primitives and complex objects
const getLabel = (item) => {
  if (typeof item === 'object' && item !== null) {
    return item.label || item.name || item.value || '';
  }
  return item?.toString() || '';
};

const getValue = (item) => {
  if (typeof item === 'object' && item !== null) {
    return item.value !== undefined ? item.value : (item.id !== undefined ? item.id : item);
  }
  return item;
};

const ComboboxContext = createContext(null);

/**
 * Reusable Stateful Adaptive Combobox
 * Supports controlled/uncontrolled values, primitive arrays, object arrays,
 * and standard React compound patterns.
 */
export const Combobox = ({ 
  items = [], 
  value: controlledValue, 
  onChange, 
  defaultValue,
  children, 
  className 
}) => {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue || '');
  const isControlled = controlledValue !== undefined;
  const activeValue = isControlled ? controlledValue : uncontrolledValue;

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const containerRef = useRef(null);

  // Sync selected option display label
  const selectedOption = useMemo(() => {
    return items.find(item => getValue(item) === activeValue);
  }, [items, activeValue]);

  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (selectedOption) {
      setInputValue(getLabel(selectedOption));
    } else {
      setInputValue(activeValue ? activeValue.toString() : '');
    }
  }, [selectedOption, activeValue]);

  // Click outside listener to auto-close and reset display text
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        // Revert input text back to current selection label on close
        if (selectedOption) {
          setInputValue(getLabel(selectedOption));
        } else {
          setInputValue(activeValue ? activeValue.toString() : '');
        }
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption, activeValue]);

  const handleSelect = (val, item) => {
    if (!isControlled) {
      setUncontrolledValue(val);
    }
    if (onChange) {
      onChange(val, item);
    }
    setIsOpen(false);
    setSearchTerm('');
  };

  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    return items.filter(item => 
      getLabel(item).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  return (
    <ComboboxContext.Provider value={{
      items,
      value: activeValue,
      isOpen,
      setIsOpen,
      searchTerm,
      setSearchTerm,
      inputValue,
      setInputValue,
      filteredItems,
      handleSelect,
      selectedOption
    }}>
      <div 
        ref={containerRef} 
        className={cn("relative w-full", className)}
      >
        {children}
      </div>
    </ComboboxContext.Provider>
  );
};

export const ComboboxInput = ({ 
  placeholder = "Select option...", 
  className, 
  disabled = false,
  hideSearch = false,
  hideClear = false,
  readOnly = false
}) => {
  const { 
    isOpen, 
    setIsOpen, 
    searchTerm, 
    setSearchTerm, 
    inputValue, 
    setInputValue,
    value,
    handleSelect,
    selectedOption
  } = useContext(ComboboxContext);

  const handleInputChange = (e) => {
    if (readOnly) return;
    setInputValue(e.target.value);
    setSearchTerm(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleFocus = () => {
    if (disabled) return;
    setIsOpen(true);
    if (!readOnly) {
      setInputValue(''); // Clear current label text so they can search immediately
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    handleSelect('', null);
  };

  // Keyboard navigation shortcuts
  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Escape') {
      setIsOpen(false);
      if (selectedOption) {
        setInputValue(getLabel(selectedOption));
      }
      setSearchTerm('');
    }
    if (e.key === 'ArrowDown' && !isOpen) {
      setIsOpen(true);
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between w-full px-3 py-2 text-sm border rounded-lg cursor-pointer bg-white dark:bg-slate-900 transition-all duration-200",
        disabled ? "opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-800" : "hover:border-blue-400 dark:hover:border-blue-500",
        isOpen ? "border-blue-500 ring-2 ring-blue-100 dark:ring-blue-900/20" : "border-gray-300 dark:border-slate-700",
        className
      )}
      onClick={() => !disabled && setIsOpen(!isOpen)}
    >
      <div className="relative flex-1 flex items-center">
        {!hideSearch && <Search className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          placeholder={selectedOption ? getLabel(selectedOption) : placeholder}
          className="w-full bg-transparent border-0 p-0 focus:ring-0 placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-0 cursor-pointer"
          style={{ fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit' }}
          disabled={disabled}
        />
      </div>
      <div className="flex items-center space-x-1 ml-2">
        {value && !disabled && !hideClear && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <ChevronDown 
          className={cn(
            "h-4 w-4 text-gray-400 transition-transform duration-200",
            isOpen ? "rotate-180" : ""
          )} 
        />
      </div>
    </div>
  );
};

export const ComboboxContent = ({ children, className, position = "bottom" }) => {
  const { isOpen } = useContext(ComboboxContext);
  const isTop = position === "top";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={isTop ? { opacity: 0, y: 4, scale: 0.98 } : { opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={isTop ? { opacity: 0, y: 4, scale: 0.98 } : { opacity: 0, y: -4, scale: 0.98 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          className={cn(
            "absolute z-[100] w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden",
            isTop ? "bottom-full mb-1.5 origin-bottom" : "top-full mt-1.5 origin-top",
            className
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const ComboboxEmpty = ({ children }) => {
  const { filteredItems } = useContext(ComboboxContext);

  if (filteredItems.length !== 0) return null;

  return (
    <div className="px-3 py-6 text-center text-sm text-gray-400 dark:text-slate-500 animate-in fade-in duration-200">
      {children}
    </div>
  );
};

export const ComboboxList = ({ children, className }) => {
  const { filteredItems } = useContext(ComboboxContext);

  if (filteredItems.length === 0) return null;

  return (
    <div className={cn("max-h-60 overflow-y-auto py-1", className)}>
      {typeof children === 'function' 
        ? filteredItems.map((item, idx) => children(item, idx))
        : children
      }
    </div>
  );
};

export const ComboboxItem = ({ value, children, className }) => {
  const { value: selectedVal, handleSelect, items } = useContext(ComboboxContext);

  const matchedItem = useMemo(() => {
    return items.find(item => getValue(item) === value);
  }, [items, value]);

  const isSelected = selectedVal === value;

  const handleClick = (e) => {
    e.stopPropagation();
    handleSelect(value, matchedItem || value);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex items-center justify-between px-3 py-2 text-sm cursor-pointer select-none transition-colors",
        isSelected 
          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium" 
          : "text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800",
        className
      )}
    >
      <span className="truncate">{children}</span>
      {isSelected && <Check className="h-4 w-4 text-blue-600 flex-shrink-0 ml-2" />}
    </div>
  );
};
