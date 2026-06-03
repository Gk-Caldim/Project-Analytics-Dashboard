import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Download, Settings, GripVertical, Mail } from 'lucide-react';
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
  chartImages
}) => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [sectionOrder, setSectionOrder] = useState([]);
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

      const allPossibleSections = ['charts', 'criticalIssues', 'budget', 'resource', 'quality'];
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
              width: '280px', 
              backgroundColor: 'var(--surface)', 
              borderRight: '1px solid var(--border-subtle)', 
              padding: '16px', 
              zIndex: 100,
              boxShadow: '0 0 10px rgba(0,0,0,0.05)'
            }}>
              <h3 style={{ fontSize: '15px', color: 'var(--text-primary)', marginTop: 0, marginBottom: '8px' }}>Section Order</h3>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
                Drag to reorder sections in the PDF.
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
                                  backgroundColor: snapshot.isDragging ? 'var(--blue-50)' : 'var(--bg)',
                                  zIndex: snapshot.isDragging ? 1000 : 1
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div {...provided.dragHandleProps} style={{ color: '#94a3b8', cursor: 'grab' }}>
                                    <GripVertical size={16} />
                                  </div>
                                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
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
            </div>
          )}

          <div style={{ flex: 1, height: '100%' }}>
            {/* key forces PDFViewer to remount whenever sectionOrder changes.
                PDFViewer renders into an iframe via a web worker and does NOT
                propagate child prop changes to its internal renderer on its own.
                Without this, the preview stays frozen on the initial render while
                the downloaded PDF (which calls pdf() at click-time) is always correct. */}
            <PDFViewer key={sectionOrder.join('|')} style={{ width: '100%', height: '100%', border: 'none' }} showToolbar={false}>
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
              />
            </PDFViewer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfPreviewModal;
