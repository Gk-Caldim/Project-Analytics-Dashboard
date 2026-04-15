import os

filepath = 'c:/Project_Dashboard/Project-Analytics-Dashboard/frontend/src/pages/ProjectDashboard.jsx'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

out = []
skip = False
for i, line in enumerate(lines):
    if '<div id="project-dashboard-main-content">' in line:
        out.append(line)
        out.append('              <VPProjectDashboard activeProject={activeProject} dashboardData={dashboardData} onConfigure={() => setShowSimulateModal(true)} onSendMail={() => setShowEmailModal(true)} />\n')
        skip = True
        continue
    
    if skip and '{/* End project-dashboard-main-content */}' in line:
        out.append('            </div>\n')
        out.append(line)
        skip = False
        continue
        
    if not skip:
        out.append(line)

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(out)
