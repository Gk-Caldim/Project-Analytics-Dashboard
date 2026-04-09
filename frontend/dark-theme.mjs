import fs from 'fs';
import path from 'path';

const files = [
    'src/pages/Masters/EmployeeMaster.jsx',
    'src/pages/Masters/EmployeeAccess.jsx',
    'src/pages/Masters/ProjectMaster.jsx',
    'src/pages/Masters/DepartmentMaster.jsx'
];

const replacements = [
    { p: /bg-white(?!\w)/g, r: 'bg-white dark:bg-slate-800' },
    { p: /bg-gray-50\/50/g, r: 'bg-slate-50/50 dark:bg-slate-900/50' },
    { p: /bg-gray-50(?!\w|\/)/g, r: 'bg-slate-50 dark:bg-slate-800/80' },
    { p: /bg-gray-100(?!\w)/g, r: 'bg-slate-100 dark:bg-slate-800' },
    { p: /bg-gray-200(?!\w)/g, r: 'bg-slate-200 dark:bg-slate-700' },
    { p: /border-gray-200(?!\w)/g, r: 'border-slate-200 dark:border-slate-700' },
    { p: /border-gray-300(?!\w)/g, r: 'border-slate-300 dark:border-slate-600' },
    { p: /text-gray-900(?!\w)/g, r: 'text-slate-900 dark:text-slate-100' },
    { p: /text-gray-700(?!\w)/g, r: 'text-slate-700 dark:text-slate-300' },
    { p: /text-gray-600(?!\w)/g, r: 'text-slate-600 dark:text-slate-400' },
    { p: /text-gray-500(?!\w)/g, r: 'text-slate-500 dark:text-slate-400' },
    { p: /text-gray-400(?!\w)/g, r: 'text-slate-400 dark:text-slate-500' },
    { p: /hover:bg-gray-50(?!\w)/g, r: 'hover:bg-slate-50 dark:hover:bg-slate-700' },
    { p: /hover:bg-gray-100(?!\w)/g, r: 'hover:bg-slate-100 dark:hover:bg-slate-700' }
];

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    for (const { p, r } of replacements) {
        content = content.replace(p, r);
    }
    // cleanup duplicates if any
    content = content.replace(/(dark:[\w-]+\s)\1+/g, '$1');
    fs.writeFileSync(file, content);
}
console.log('Script ran perfectly!');
