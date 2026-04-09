import fs from 'fs';

const dashboardPath = 'src/pages/Dashboard.jsx';
let dCode = fs.readFileSync(dashboardPath, 'utf8');

// 1. Remove hooks related to profileMenu and header
const profileStart = dCode.indexOf('  // Click outside for profile menu');
const profileEnd = dCode.indexOf('  // Open master submodule');
if (profileStart !== -1 && profileEnd !== -1) {
    dCode = dCode.substring(0, profileStart) + dCode.substring(profileEnd);
}

const stateProfileMenuStart = dCode.indexOf('  const [profileMenuOpen');
const stateNotificationsEnd = dCode.indexOf('  const [hoveredModule,');
if (stateProfileMenuStart !== -1 && stateNotificationsEnd !== -1) {
    dCode = dCode.substring(0, stateProfileMenuStart) + dCode.substring(stateNotificationsEnd);
}

const refProfileStart = dCode.indexOf('  const profileMenuRef = useRef(null);');
const refProfileEnd = dCode.indexOf('  const sidebarRef = useRef(null);');
if (refProfileStart !== -1 && refProfileEnd !== -1) {
    dCode = dCode.substring(0, refProfileStart) + dCode.substring(refProfileEnd);
}

const stateProfilePosStart = dCode.indexOf('  const [profileMenuPosition');
if (stateProfilePosStart !== -1) {
    const nextLine = dCode.indexOf('\n', stateProfilePosStart) + 1;
    dCode = dCode.substring(0, stateProfilePosStart) + dCode.substring(nextLine);
}

// 2. Remove all renderFunctions (from renderProjectDashboardModule to before return)
const renderFunctionsStartIdx = dCode.indexOf('  // ==========================================================================\n  // RENDER FUNCTIONS - ALL WITH BLACK TEXT\n  // ==========================================================================\n\n  const renderProjectDashboardModule');
const renderReturnIdx = dCode.indexOf('  return (\n    <div className="h-screen flex');

if (renderFunctionsStartIdx !== -1 && renderReturnIdx !== -1) {
    dCode = dCode.substring(0, renderFunctionsStartIdx) + dCode.substring(renderReturnIdx);
}

// 3. Replace inline Sidebar HTML with <Sidebar> component
const inlineSidebarStart = dCode.indexOf('        {/* Sidebar - Centralized Product UI Styles */}');
const inlineSidebarEnd = dCode.indexOf('        {/* Main Content Area */}');

if (inlineSidebarStart !== -1 && inlineSidebarEnd !== -1) {
    const sidebarReplacement = "        <Sidebar \n          activeModule={activeModule}\n          hoveredModule={hoveredModule}\n          setHoveredModule={setHoveredModule}\n          expandedModules={expandedModules}\n          sidebarCollapsed={sidebarCollapsed}\n          setSidebarCollapsed={setSidebarCollapsed}\n          sidebarRef={sidebarRef}\n          handleModuleClick={handleModuleClick}\n          toggleModuleExpansion={toggleModuleExpansion}\n          projectDashboardModules={projectDashboardModules}\n          uploadTrackerModules={uploadTrackerModules}\n          mastersSubmodules={mastersSubmodules}\n          otherModules={otherModules}\n          isFileSelected={isFileSelected}\n          handleFileModuleClick={handleFileModuleClick}\n          handleProjectFileClick={handleProjectFileClick}\n        />\n\n";
    dCode = dCode.substring(0, inlineSidebarStart) + sidebarReplacement + dCode.substring(inlineSidebarEnd);
}

// 4. Replace inline Header HTML with <Header> component
const inlineHeaderStart = dCode.indexOf('          {/* Header */}');
const inlineHeaderEnd = dCode.indexOf('          {/* Main Content */}');

if (inlineHeaderStart !== -1 && inlineHeaderEnd !== -1) {
    const headerReplacement = "          <Header \n            title={getHeaderTitle()}\n            user={user}\n            logout={logout}\n            currentTime={currentTime}\n            currentDate={currentDate}\n            userInitial={getUserInitial()}\n          />\n\n";
    dCode = dCode.substring(0, inlineHeaderStart) + headerReplacement + dCode.substring(inlineHeaderEnd);
}

fs.writeFileSync(dashboardPath, dCode);
console.log('Dashboard.jsx successfully modified to use Header and Sidebar components.');
