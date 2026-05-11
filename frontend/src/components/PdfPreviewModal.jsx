import React, { useState, useEffect } from 'react';
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
  const [sectionOrder, setSectionOrder] = useState([
    'charts', 'criticalIssues', 'budget', 'milestones', 'resource', 'quality'
  ]);


  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(sectionOrder);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setSectionOrder(items);
  };

  const budgetStatus = masterProjects?.find(p => p.name === selectedBudgetProject)?.status || activeProject?.status || 'Active';

  // Gather all visible phases/trackers that have data
  const visiblePhaseList = [
    { id: 'design', label: 'Design' },
    { id: 'partDevelopment', label: 'Part Development' },
    { id: 'build', label: 'Build' },
    { id: 'gateway', label: 'Gateway' },
    { id: 'validation', label: 'Validation' },
    { id: 'qualityIssues', label: 'Quality Issues' },
    ...(activeProject?.submodules || []).map(sub => ({ id: sub.id, label: sub.displayName || sub.name, isDynamic: true }))
  ].filter((phase, index, self) => {
    const isDuplicate = self.findIndex(p => p.id === phase.id) !== index;
    if (isDuplicate) return false;

    if (phase.isDynamic) {
        const defaultIds = ['design', 'partDevelopment', 'build', 'gateway', 'validation', 'qualityIssues'];
        const isAlreadyMapped = defaultIds.some(id => {
            const tracker = getTrackerForPhase(id);
            return tracker && tracker.id === phase.id;
        });
        if (isAlreadyMapped) return false;
    }

    return visibleSections?.[phase.id] && availablePhases?.[phase.id];
  });

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
        backgroundColor: '#f8fafc',
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
          backgroundColor: 'white',
          borderBottom: '1px solid #e2e8f0',
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
              backgroundColor: '#1e3a5f',
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
              backgroundColor: showSidebar ? '#1e3a5f' : '#f1f5f9',
              color: showSidebar ? 'white' : '#64748b',
              border: '1px solid #e2e8f0',
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
          backgroundColor: '#e2e8f0',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Customization Sidebar */}
          {showSidebar && (
            <div style={{ 
              width: '280px', 
              backgroundColor: 'white', 
              borderRight: '1px solid #cbd5e1', 
              padding: '16px', 
              zIndex: 100,
              boxShadow: '0 0 10px rgba(0,0,0,0.05)'
            }}>
              <h3 style={{ fontSize: '15px', color: '#1e3a5f', marginTop: 0, marginBottom: '8px' }}>Section Order</h3>
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
                        const isCharts = key === 'charts';
                        const isVisible = isCharts ? (visibleSections?.metricsSummary && visiblePhaseList.length > 0) : visibleSections?.[key];
                        
                        const labels = {
                          milestones: 'Milestones',
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
                                  padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px',
                                  backgroundColor: snapshot.isDragging ? '#f0f7ff' : (isVisible ? '#f8fafc' : '#f1f5f9'),
                                  opacity: isVisible ? 1 : 0.5,
                                  zIndex: snapshot.isDragging ? 1000 : 1
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div {...provided.dragHandleProps} style={{ color: '#94a3b8', cursor: 'grab' }}>
                                    <GripVertical size={16} />
                                  </div>
                                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e3a5f' }}>
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
            <PDFViewer style={{ width: '100%', height: '100%', border: 'none' }} showToolbar={false}>
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
