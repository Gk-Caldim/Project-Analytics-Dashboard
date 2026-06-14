import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Download, Settings, GripVertical, Mail, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { PDFViewer, pdf } from '@react-pdf/renderer';
import ReportDocument from './ReportDocument';

const PdfPreviewModal = ({ 
  show, 
  onClose, 
  activeProject, 
  milestones, 
  criticalIssues, 
  sopData, 
  summaryData, 
  visibleSections,
  availablePhases,
  getTrackerForPhase,
  budgetTableData,
  selectedBudgetProject,
  masterProjects,
  budgetCurrency,
  chartImages,
  ganttDeptFilter = 'All',
  ganttTypeFilter = 'All',
  ganttStatusFilter = 'All'
}) => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [sectionOrder, setSectionOrder] = useState([]);
  const [activeTab, setActiveTab] = useState('layout');

  const [pdfConfig, setPdfConfig] = useState({
    headerTitle: activeProject?.name || 'Project Dashboard',
    subHeading: 'Executive Dashboard Analytics Report',
    footerText: 'Project Dashboard Report',
    backgroundColor: '#ffffff',
    watermarkText: '',
    watermarkOpacity: 0.1,
    showProjectName: true,
    showGenerationDate: true,
    showActiveFilters: true
  });

  const [debouncedPdfConfig, setDebouncedPdfConfig] = useState(pdfConfig);

  // Sync pdfConfig when activeProject changes or load from localStorage
  useEffect(() => {
    const storageKey = `pdf_config_${activeProject?.id || activeProject?.name || 'default'}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setPdfConfig(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      setPdfConfig({
        headerTitle: activeProject?.name || 'Project Dashboard',
        subHeading: 'Executive Dashboard Analytics Report',
        footerText: 'Project Dashboard Report',
        backgroundColor: '#ffffff',
        watermarkText: '',
        watermarkOpacity: 0.1,
        showProjectName: true,
        showGenerationDate: true,
        showActiveFilters: true
      });
    }
  }, [activeProject]);

  // Debounce effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedPdfConfig(pdfConfig);
    }, 500);
    return () => clearTimeout(handler);
  }, [pdfConfig]);

  const updatePdfConfig = (updates) => {
    setPdfConfig(prev => {
      const next = { ...prev, ...updates };
      const storageKey = `pdf_config_${activeProject?.id || activeProject?.name || 'default'}`;
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const [watermarkSelect, setWatermarkSelect] = useState('');

  // Sync watermarkSelect when pdfConfig.watermarkText changes
  useEffect(() => {
    const currentText = pdfConfig.watermarkText || '';
    if (['', 'CONFIDENTIAL', 'INTERNAL USE ONLY', 'RESTRICTED', 'DRAFT'].includes(currentText)) {
      setWatermarkSelect(currentText);
    } else {
      setWatermarkSelect('__custom__');
    }
  }, [pdfConfig.watermarkText]);
  // Tracks whether sectionOrder has been initialised for the current modal open.
  // Prevents the effect from re-merging (and corrupting) the order while modal is open.
  const sectionOrderInitialisedRef = useRef(false);

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(sectionOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    // Deduplicate as a safety net against any stale-closure edge-cases
    setSectionOrder(Array.from(new Set(items)));
  };

  const budgetStatus = masterProjects?.find(p => p.name === selectedBudgetProject)?.status || activeProject?.status || 'Active';

  // Gather all visible phases/trackers that have data
  const visiblePhaseList = useMemo(() => {
    return [
      { id: 'design', label: 'Design' },
      { id: 'partDevelopment', label: 'Part Development' },
      { id: 'build', label: 'Build' },
      { id: 'gateway', label: 'Gateway' },
      { id: 'validation', label: 'Validation' },
      { id: 'qualityIssues', label: 'Quality Issues' },
      ...(activeProject?.submodules || []).map(sub => ({ id: sub.id, label: sub.displayName || sub.name, isDynamic: true }))
    ].filter((phase, index, self) => {
      // Deduplicate by ID
      const isDuplicate = self.findIndex(p => p.id === phase.id) !== index;
      if (isDuplicate) return false;

      // Filter out dynamic submodules that are already covered by default phases
      if (phase.isDynamic) {
          const defaultIds = ['design', 'partDevelopment', 'build', 'gateway', 'validation', 'qualityIssues'];
          const isAlreadyMapped = defaultIds.some(id => {
              const tracker = getTrackerForPhase(id);
              return tracker && tracker.id === phase.id;
          });
          if (isAlreadyMapped) return false;
      }

      // Final visibility check - must be in visibleSections AND available for this project
      return visibleSections?.[phase.id] && availablePhases?.[phase.id];
    });
  }, [activeProject, visibleSections, availablePhases, getTrackerForPhase]);

  // Initialise sectionOrder exactly ONCE each time the modal opens.
  // Using a ref flag ensures we never re-run the merge logic while the modal is open,
  // which was the root cause of the duplication bug: the effect was re-firing (because
  // visiblePhaseList.length is derived from a useMemo that recomputes on every parent
  // re-render), and its merge logic was appending uniqueCurrent onto the already-reordered
  // prev array before Set could deduplicate, creating phantom duplicate entries.
  useEffect(() => {
    if (show) {
      // Guard: if already initialised for this open, do nothing
      if (sectionOrderInitialisedRef.current) return;
      sectionOrderInitialisedRef.current = true;

      const allPossibleSections = ['milestones', 'charts', 'criticalIssues', 'budget', 'resource', 'quality'];
      const currentVisible = allPossibleSections.filter(key => {
        if (key === 'charts') {
          return visibleSections?.metricsSummary || visiblePhaseList.length > 0;
        }
        return !!visibleSections?.[key];
      });
      setSectionOrder(Array.from(new Set(currentVisible)));
    } else {
      // Modal closed: reset so next open re-initialises cleanly
      sectionOrderInitialisedRef.current = false;
      setSectionOrder([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, visibleSections, visiblePhaseList.length]);

  const downloadPdf = async () => {
    try {
      const blob = await pdf(
        <ReportDocument 
          activeProject={activeProject}
          milestones={milestones}
          criticalIssues={criticalIssues}
          sopData={sopData}
          summaryData={summaryData}
          visibleSections={visibleSections}
          visiblePhaseList={visiblePhaseList}
          budgetTableData={budgetTableData}
          budgetCurrency={budgetCurrency}
          budgetStatus={budgetStatus}
          chartImages={chartImages}
          sectionOrder={sectionOrder}
          headerTitle={pdfConfig.headerTitle}
          subHeading={pdfConfig.subHeading}
          footerText={pdfConfig.footerText}
          backgroundColor={pdfConfig.backgroundColor}
          watermarkText={pdfConfig.watermarkText}
          watermarkOpacity={pdfConfig.watermarkOpacity}
          ganttDeptFilter={ganttDeptFilter}
          ganttTypeFilter={ganttTypeFilter}
          ganttStatusFilter={ganttStatusFilter}
          showProjectName={pdfConfig.showProjectName}
          showGenerationDate={pdfConfig.showGenerationDate}
          showActiveFilters={pdfConfig.showActiveFilters}
        />
      ).toBlob();
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${activeProject?.name || 'Project'}_Dashboard_Report.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Error generating PDF. Please try again.');
    }
  };

  if (!show) return null;

  return (
    <div style={{
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000,
      padding: '40px',
      height: '100vh',
      width: '100vw',
      position: 'fixed',
      top: 0,
      left: 0
    }}>
      <div style={{
        backgroundColor: 'var(--bg)',
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'none',
        overflow: 'hidden'
      }}>
        {/* Modal Controls */}
        <div style={{
          padding: '10px 20px',
          backgroundColor: 'var(--surface)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '12px',
          zIndex: 10
        }}>
          <button
            onClick={downloadPdf}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            style={{
              padding: '8px 16px',
              backgroundColor: showSidebar ? 'var(--accent)' : 'var(--bg)',
              color: showSidebar ? 'white' : 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Settings size={18} />
            Customize Layout
          </button>
          <button
            onClick={onClose}
            style={{
              height: '38px',
              width: '38px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              cursor: 'pointer',
              color: '#991b1b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* PDF Content Area */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          backgroundColor: 'var(--border-subtle)',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Customization Sidebar */}
          {showSidebar && (
            <div style={{ 
              width: '320px', 
              backgroundColor: 'var(--surface)', 
              borderRight: '1px solid var(--border-subtle)', 
              display: 'flex',
              flexDirection: 'column',
              zIndex: 100,
              boxShadow: '0 0 15px rgba(0,0,0,0.05)',
              height: '100%'
            }}>
              {/* Sidebar Header */}
              <div style={{ padding: '16px 16px 12px 16px', borderBottom: '1px solid var(--border-subtle)' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>Customize PDF Layout</h3>
                <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', marginBottom: 0 }}>
                  Personalize sections, branding, and styling.
                </p>
              </div>

              {/* Sidebar Tabs */}
              <div style={{ 
                display: 'flex', 
                borderBottom: '1px solid var(--border-subtle)', 
                padding: '0 16px',
                gap: '8px',
                backgroundColor: 'var(--surface)'
              }}>
                <button
                  onClick={() => setActiveTab('layout')}
                  style={{
                    flex: 1,
                    padding: '12px 0',
                    border: 'none',
                    borderBottom: activeTab === 'layout' ? '2px solid var(--accent)' : '2px solid transparent',
                    backgroundColor: 'transparent',
                    color: activeTab === 'layout' ? 'var(--accent)' : 'var(--text-secondary)',
                    fontWeight: activeTab === 'layout' ? 'bold' : '500',
                    cursor: 'pointer',
                    fontSize: '13px',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  Sections
                </button>
                <button
                  onClick={() => setActiveTab('style')}
                  style={{
                    flex: 1,
                    padding: '12px 0',
                    border: 'none',
                    borderBottom: activeTab === 'style' ? '2px solid var(--accent)' : '2px solid transparent',
                    backgroundColor: 'transparent',
                    color: activeTab === 'style' ? 'var(--accent)' : 'var(--text-secondary)',
                    fontWeight: activeTab === 'style' ? 'bold' : '500',
                    cursor: 'pointer',
                    fontSize: '13px',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  Content & Style
                </button>
              </div>

              {/* Tab Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                {activeTab === 'layout' ? (
                  <>
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: 0, marginBottom: '16px' }}>
                      Drag to reorder report sections:
                    </p>
                    <DragDropContext onDragEnd={onDragEnd}>
                      <Droppable droppableId="sidebar-sections">
                        {(provided) => (
                          <div 
                            {...provided.droppableProps}
                            ref={provided.innerRef}
                            style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                          >
                            {sectionOrder.map((key, index) => {
                              const labels = {
                                milestones: 'Project Milestones',
                                criticalIssues: 'Critical Issues',
                                budget: 'Budget Summary',
                                resource: 'Resource Summary',
                                quality: 'Quality Summary',
                                charts: 'Project Metrics'
                              };
                              const label = labels[key] || key;

                              return (
                                <Draggable key={key} draggableId={key} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      style={{ 
                                        ...provided.draggableProps.style,
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                                        padding: '10px 12px', border: '1px solid var(--border-subtle)', borderRadius: '6px',
                                        backgroundColor: snapshot.isDragging ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg)',
                                        zIndex: snapshot.isDragging ? 1000 : 1,
                                        boxShadow: snapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <div {...provided.dragHandleProps} style={{ color: '#94a3b8', cursor: 'grab' }}>
                                          <GripVertical size={16} />
                                        </div>
                                        <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>
                                          {label}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Header Title</label>
                      <input
                        type="text"
                        value={pdfConfig.headerTitle}
                        onChange={(e) => updatePdfConfig({ headerTitle: e.target.value })}
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-subtle)', borderRadius: '6px', backgroundColor: 'var(--bg)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                        placeholder="Project Dashboard"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sub Heading</label>
                      <input
                        type="text"
                        value={pdfConfig.subHeading}
                        onChange={(e) => updatePdfConfig({ subHeading: e.target.value })}
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-subtle)', borderRadius: '6px', backgroundColor: 'var(--bg)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                        placeholder="Executive Dashboard Analytics Report"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Footer Text</label>
                      <input
                        type="text"
                        value={pdfConfig.footerText}
                        onChange={(e) => updatePdfConfig({ footerText: e.target.value })}
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-subtle)', borderRadius: '6px', backgroundColor: 'var(--bg)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                        placeholder="Project Dashboard Report"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Background Color</label>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {[
                          { name: 'White', color: '#ffffff' },
                          { name: 'Slate', color: '#f8fafc' },
                          { name: 'Ice', color: '#f0f9ff' },
                          { name: 'Cream', color: '#fefaf0' },
                          { name: 'Sage', color: '#f0fdf4' }
                        ].map((preset) => (
                          <button
                            key={preset.color}
                            title={preset.name}
                            onClick={() => updatePdfConfig({ backgroundColor: preset.color })}
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              backgroundColor: preset.color,
                              border: pdfConfig.backgroundColor.toLowerCase() === preset.color.toLowerCase() ? '2px solid var(--accent)' : '1px solid #cbd5e1',
                              cursor: 'pointer',
                              padding: 0,
                              boxShadow: pdfConfig.backgroundColor.toLowerCase() === preset.color.toLowerCase() ? '0 0 4px rgba(0,0,0,0.15)' : 'none',
                              transition: 'transform 0.1s',
                              transform: pdfConfig.backgroundColor.toLowerCase() === preset.color.toLowerCase() ? 'scale(1.1)' : 'scale(1)'
                            }}
                          />
                        ))}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Custom:</span>
                          <input
                            type="color"
                            value={pdfConfig.backgroundColor}
                            onChange={(e) => updatePdfConfig({ backgroundColor: e.target.value })}
                            style={{
                              border: 'none',
                              width: '24px',
                              height: '24px',
                              padding: 0,
                              backgroundColor: 'transparent',
                              cursor: 'pointer'
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Watermark</label>
                      <select
                        value={watermarkSelect}
                        onChange={(e) => {
                          const val = e.target.value;
                          setWatermarkSelect(val);
                          if (val !== '__custom__') {
                            updatePdfConfig({ watermarkText: val });
                          } else {
                            updatePdfConfig({ watermarkText: pdfConfig.watermarkText || 'CUSTOM WATERMARK' });
                          }
                        }}
                        style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-subtle)', borderRadius: '6px', backgroundColor: 'var(--bg)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                      >
                        <option value="">None</option>
                        <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                        <option value="INTERNAL USE ONLY">INTERNAL USE ONLY</option>
                        <option value="RESTRICTED">RESTRICTED</option>
                        <option value="DRAFT">DRAFT</option>
                        <option value="__custom__">Custom Text...</option>
                      </select>
                    </div>

                    {watermarkSelect === '__custom__' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Custom Watermark Text</label>
                        <input
                          type="text"
                          value={pdfConfig.watermarkText}
                          onChange={(e) => updatePdfConfig({ watermarkText: e.target.value })}
                          style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border-subtle)', borderRadius: '6px', backgroundColor: 'var(--bg)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                          placeholder="e.g. COMPANY NAME"
                        />
                      </div>
                    )}

                    {pdfConfig.watermarkText && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Watermark Opacity</label>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>{Math.round(pdfConfig.watermarkOpacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.05"
                          max="0.30"
                          step="0.01"
                          value={pdfConfig.watermarkOpacity}
                          onChange={(e) => updatePdfConfig({ watermarkOpacity: parseFloat(e.target.value) })}
                          style={{ width: '100%', cursor: 'pointer' }}
                        />
                      </div>
                    )}

                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Header Options</label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={pdfConfig.showProjectName !== false}
                            onChange={(e) => updatePdfConfig({ showProjectName: e.target.checked })}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          Show Project Name
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={pdfConfig.showGenerationDate !== false}
                            onChange={(e) => updatePdfConfig({ showGenerationDate: e.target.checked })}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          Show Generation Date
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={pdfConfig.showActiveFilters !== false}
                            onChange={(e) => updatePdfConfig({ showActiveFilters: e.target.checked })}
                            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                          />
                          Show Active Filters
                        </label>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const defaults = {
                          headerTitle: activeProject?.name || 'Project Dashboard',
                          subHeading: 'Executive Dashboard Analytics Report',
                          footerText: 'Project Dashboard Report',
                          backgroundColor: '#ffffff',
                          watermarkText: '',
                          watermarkOpacity: 0.1,
                          showProjectName: true,
                          showGenerationDate: true,
                          showActiveFilters: true
                        };
                        updatePdfConfig(defaults);
                        setWatermarkSelect('');
                        toast.success('Reset customization to defaults');
                      }}
                      style={{
                        width: '100%',
                        padding: '8px',
                        backgroundColor: 'transparent',
                        color: '#ef4444',
                        border: '1px dashed #fca5a5',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        marginTop: '10px',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <RotateCcw size={14} />
                      Reset to Defaults
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ flex: 1, height: '100%' }}>
            {/* key forces PDFViewer to remount whenever sectionOrder or design customization changes.
                PDFViewer renders into an iframe via a web worker and does NOT
                propagate child prop changes to its internal renderer on its own.
                Without this, the preview stays frozen on the initial render. */}
            <PDFViewer key={`${sectionOrder.join('|')}|${debouncedPdfConfig.headerTitle}|${debouncedPdfConfig.subHeading}|${debouncedPdfConfig.footerText}|${debouncedPdfConfig.backgroundColor}|${debouncedPdfConfig.watermarkText}|${debouncedPdfConfig.watermarkOpacity}|${debouncedPdfConfig.showProjectName}|${debouncedPdfConfig.showGenerationDate}|${debouncedPdfConfig.showActiveFilters}|${ganttDeptFilter}|${ganttTypeFilter}|${ganttStatusFilter}`} style={{ width: '100%', height: '100%', border: 'none' }} showToolbar={false}>
              <ReportDocument 
                activeProject={activeProject}
                milestones={milestones}
                criticalIssues={criticalIssues}
                sopData={sopData}
                summaryData={summaryData}
                visibleSections={visibleSections}
                visiblePhaseList={visiblePhaseList}
                budgetTableData={budgetTableData}
                budgetCurrency={budgetCurrency}
                budgetStatus={budgetStatus}
                chartImages={chartImages}
                sectionOrder={sectionOrder}
                headerTitle={debouncedPdfConfig.headerTitle}
                subHeading={debouncedPdfConfig.subHeading}
                footerText={debouncedPdfConfig.footerText}
                backgroundColor={debouncedPdfConfig.backgroundColor}
                watermarkText={debouncedPdfConfig.watermarkText}
                watermarkOpacity={debouncedPdfConfig.watermarkOpacity}
                ganttDeptFilter={ganttDeptFilter}
                ganttTypeFilter={ganttTypeFilter}
                ganttStatusFilter={ganttStatusFilter}
                showProjectName={debouncedPdfConfig.showProjectName}
                showGenerationDate={debouncedPdfConfig.showGenerationDate}
                showActiveFilters={debouncedPdfConfig.showActiveFilters}
              />
            </PDFViewer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfPreviewModal;
