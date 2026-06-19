const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'VPProjectDashboard.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

const importStr = "import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';\n";
if (!content.includes('import { Table,')) {
    const lastImportIdx = content.lastIndexOf('import ');
    const endOfLastImport = content.indexOf('\n', lastImportIdx);
    content = content.slice(0, endOfLastImport + 1) + importStr + content.slice(endOfLastImport + 1);
}

content = content.replace(/<table\b([^>]*)>/g, '<Table$1>');
content = content.replace(/<\/table\s*>/g, '</Table>');
content = content.replace(/<thead\b([^>]*)>/g, '<TableHeader$1>');
content = content.replace(/<\/thead\s*>/g, '</TableHeader>');
content = content.replace(/<tbody\b([^>]*)>/g, '<TableBody$1>');
content = content.replace(/<\/tbody\s*>/g, '</TableBody>');
content = content.replace(/<tr\b([^>]*)>/g, '<TableRow$1>');
content = content.replace(/<\/tr\s*>/g, '</TableRow>');
content = content.replace(/<th\b([^>]*)>/g, '<TableHead$1>');
content = content.replace(/<\/th\s*>/g, '</TableHead>');
content = content.replace(/<td\b([^>]*)>/g, '<TableCell$1>');
content = content.replace(/<\/td\s*>/g, '</TableCell>');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Tables replaced.');
