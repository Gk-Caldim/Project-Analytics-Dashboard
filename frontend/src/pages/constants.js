// constants.js - Meeting Minutes of Meeting (MOM) Constants

// Criticality/Importance Levels - Simplified
export const CRITICALITY_OPTIONS = [
  { 
    value: 'high', 
    label: 'High', 
    color: 'bg-red-50 text-red-700 border-red-200',
    badge: 'bg-red-500'
  },
  { 
    value: 'medium', 
    label: 'Medium', 
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    badge: 'bg-yellow-500'
  },
  { 
    value: 'low', 
    label: 'Low', 
    color: 'bg-green-50 text-green-700 border-green-200',
    badge: 'bg-green-500'
  }
];

// Status Options
export const STATUS_OPTIONS = [
  { 
    value: 'pending', 
    label: 'Pending', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: 'Clock'
  },
  { 
    value: 'in-progress', 
    label: 'In Progress', 
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: 'PlayCircle'
  },
  { 
    value: 'completed', 
    label: 'Completed', 
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: 'CheckCircle'
  },
  { 
    value: 'on-hold', 
    label: 'On Hold', 
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: 'PauseCircle'
  }
];

// Function/Department Options
export const FUNCTION_OPTIONS = [
  { value: 'engineering', label: 'Engineering' },
  { value: 'sales', label: 'Sales' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'hr', label: 'Human Resources' },
  { value: 'finance', label: 'Finance' },
  { value: 'operations', label: 'Operations' },
  { value: 'it', label: 'IT Support' },
  { value: 'management', label: 'Management' },
  { value: 'production', label: 'Production' },
  { value: 'quality', label: 'Quality Assurance' },
  { value: 'purchase', label: 'Purchase' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'rnd', label: 'Research & Development' },
  { value: 'admin', label: 'Administration' }
];

// Reminder Frequency Options
export const REMINDER_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom' },
  { value: 'none', label: 'None' }
];

// Action Taken Approval Status
export const APPROVAL_OPTIONS = [
  { value: 'approved', label: 'Approved', color: 'bg-green-50 text-green-700' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-50 text-red-700' },
  { value: 'pending-approval', label: 'Pending Approval', color: 'bg-yellow-50 text-yellow-700' },
  { value: 'under-review', label: 'Under Review', color: 'bg-blue-50 text-blue-700' },
  { value: 'not-applicable', label: 'Not Applicable', color: 'bg-gray-50 text-gray-700' }
];

// Column Data Types
export const COLUMN_TYPES = [
  { value: 'text', label: 'Text', icon: 'Type' },
  { value: 'number', label: 'Number', icon: 'Hash' },
  { value: 'textarea', label: 'Text Area', icon: 'FileText' },
  { value: 'date', label: 'Date', icon: 'Calendar' },
  { value: 'select', label: 'Dropdown', icon: 'ChevronDown' },
  { value: 'email', label: 'Email', icon: 'Mail' },
  { value: 'phone', label: 'Phone', icon: 'Phone' }
];

// Default Columns in your specified order
export const DEFAULT_COLUMNS = [
  // S.No - Serial Number
  { 
    id: 'sno', 
    label: 'S.No', 
    visible: true, 
    sortable: true, 
    type: 'number', 
    editable: true, 
    deletable: false, 
    required: true,
    width: '80px',
    min: 1
  },
  
  // Function - Department/Team
  { 
    id: 'function', 
    label: 'Function', 
    visible: true, 
    sortable: true, 
    type: 'select', 
    editable: true, 
    deletable: false, 
    required: true,
    width: '140px',
    options: FUNCTION_OPTIONS,
    helpText: 'Select department/function'
  },
  
  // Project Name
  { 
    id: 'project_name', 
    label: 'Project Name', 
    visible: true, 
    sortable: true, 
    type: 'text', 
    editable: true, 
    deletable: false, 
    required: true,
    width: '180px',
    helpText: 'Enter project name'
  },
  
  // Criticality
  { 
    id: 'criticality', 
    label: 'Criticality', 
    visible: true, 
    sortable: true, 
    type: 'select', 
    editable: true, 
    deletable: false, 
    required: true,
    width: '120px',
    options: CRITICALITY_OPTIONS,
    helpText: 'Priority level'
  },
  
  // Action Points Discussed - FIXED: Changed id from 'Discussion Point' to 'discussion_point'
  { 
    id: 'discussion_point', 
    label: 'Discussion Point', 
    visible: true, 
    sortable: false, 
    type: 'textarea', 
    editable: true, 
    deletable: false, 
    required: true,
    width: '250px',
    helpText: 'Detailed discussion points and action items'
  },
  
  // Responsibility
  { 
    id: 'responsibility', 
    label: 'Responsibility', 
    visible: true, 
    sortable: true, 
    type: 'text', 
    editable: true, 
    deletable: false, 
    required: true,
    width: '150px',
    helpText: 'Person responsible'
  },
  
  // Target Date
  { 
    id: 'target', 
    label: 'Target', 
    visible: true, 
    sortable: true, 
    type: 'date', 
    editable: true, 
    deletable: false, 
    required: true,
    width: '120px',
    helpText: 'Target completion date'
  },
  
  // Reminder
  { 
    id: 'remainder', 
    label: 'Remainder', 
    visible: true, 
    sortable: true, 
    type: 'select', 
    editable: true, 
    deletable: false, 
    required: false,
    width: '130px',
    options: REMINDER_OPTIONS,
    helpText: 'Reminder frequency'
  },
  
  // Status
  { 
    id: 'status', 
    label: 'Status', 
    visible: true, 
    sortable: true, 
    type: 'select', 
    editable: true, 
    deletable: false, 
    required: true,
    width: '130px',
    options: STATUS_OPTIONS,
    helpText: 'Current status of action'
  },
  
  // Action Taken Approval
  { 
    id: 'action_taken_approval', 
    label: 'Action Taken Approval', 
    visible: true, 
    sortable: true, 
    type: 'select', 
    editable: true, 
    deletable: false, 
    required: false,
    width: '160px',
    options: APPROVAL_OPTIONS,
    helpText: 'Approval status of action taken'
  },
  
  
  // Delete Action - This is for the delete button column
  { 
    id: 'delete_action', 
    label: 'Delete', 
    visible: true, 
    sortable: false, 
    type: 'action', 
    editable: false, 
    deletable: false, 
    required: false,
    width: '80px',
    helpText: 'Delete this row'
  }
];

// Column groups for organization
export const COLUMN_GROUPS = {
  identification: ['sno', 'function', 'project_name'],
  priority: ['criticality'],
  action: ['discussion_point', 'responsibility', 'target'],
  tracking: ['remainder', 'status', 'action_taken_approval'],
  operations: ['edit_action', 'delete_action']
};

// Default meeting template - FIXED: Changed 'Discussion Point' to 'discussion_point'
export const DEFAULT_MEETING_TEMPLATE = {
  sno: 1,
  function: 'engineering',
  project_name: '',
  criticality: 'medium',
  discussion_point: '',
  responsibility: '',
  target: new Date().toISOString().split('T')[0],
  remainder: 'weekly',
  status: 'pending',
  action_taken_approval: 'pending-approval'
};

// Table configuration
export const TABLE_CONFIG = {
  defaultSort: { key: 'sno', direction: 'asc' },
  rowsPerPage: 50,
  showRowNumbers: true,
  allowColumnReorder: true,
  allowColumnResize: true,
  allowInlineEdit: true,
  showExport: true,
  showSearch: true
};

// Helper functions
export const getColumnById = (columnId) => {
  return DEFAULT_COLUMNS.find(col => col.id === columnId);
};

export const getColumnOptions = (columnId) => {
  const column = getColumnById(columnId);
  if (column?.options) return column.options;
  
  switch(columnId) {
    case 'criticality':
      return CRITICALITY_OPTIONS;
    case 'status':
      return STATUS_OPTIONS;
    case 'function':
      return FUNCTION_OPTIONS;
    case 'remainder':
      return REMINDER_OPTIONS;
    case 'action_taken_approval':
      return APPROVAL_OPTIONS;
    default:
      return [];
  }
};

// Export everything
export default {
  CRITICALITY_OPTIONS,
  STATUS_OPTIONS,
  FUNCTION_OPTIONS,
  REMINDER_OPTIONS,
  APPROVAL_OPTIONS,
  COLUMN_TYPES,
  DEFAULT_COLUMNS,
  COLUMN_GROUPS,
  DEFAULT_MEETING_TEMPLATE,
  TABLE_CONFIG,
  getColumnById,
  getColumnOptions
};