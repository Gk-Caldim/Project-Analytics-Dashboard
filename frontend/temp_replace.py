import re

path = r'd:\Project-Dashboard\Project-Analytics-Dashboard\frontend\src\pages\VPProjectDashboard.jsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import_str = "import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';\n"
if 'import { Table,' not in content:
    last_import_idx = content.rfind('import ')
    end_of_last_import = content.find('\n', last_import_idx)
    content = content[:end_of_last_import+1] + import_str + content[end_of_last_import+1:]

content = re.sub(r'<table\b([^>]*)>', r'<Table\1>', content)
content = re.sub(r'</table\s*>', r'</Table>', content)

content = re.sub(r'<thead\b([^>]*)>', r'<TableHeader\1>', content)
content = re.sub(r'</thead\s*>', r'</TableHeader>', content)

content = re.sub(r'<tbody\b([^>]*)>', r'<TableBody\1>', content)
content = re.sub(r'</tbody\s*>', r'</TableBody>', content)

content = re.sub(r'<tr\b([^>]*)>', r'<TableRow\1>', content)
content = re.sub(r'</tr\s*>', r'</TableRow>', content)

content = re.sub(r'<th\b([^>]*)>', r'<TableHead\1>', content)
content = re.sub(r'</th\s*>', r'</TableHead>', content)

content = re.sub(r'<td\b([^>]*)>', r'<TableCell\1>', content)
content = re.sub(r'</td\s*>', r'</TableCell>', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Replacement complete.')
