import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, Upload, Eye, Trash2, Search, ZoomIn, MoreHorizontal, Square, X, Save, Pencil, Send, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { API_ENDPOINTS } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const openInNewTab = (url?: string | null) => {
  if (!url) return;
  try { window.open(url, '_blank', 'noopener,noreferrer'); } catch {}
};

type ApiEnvelope<T> = { responseCode?: string; responseDescription?: string; responseData?: T } | T;

type InspectionView = {
  id: string;
  transformerNo?: string;
  branch?: string;
  lastUpdated?: string;
  status: "in-progress" | "pending" | "completed" | "Not started" | "Not Started" | "Completed" | string;
};

// Bounding Box Annotation Types
interface BoundingBox {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  anomalyState: "Faulty" | "Potentially Faulty" | "Normal" | "";
  confidenceScore: number;
  riskType: "Point fault" | "Full wire overload" | "Transformer overload" | "Normal" | "";
  description: string;
  imageType: "thermal" | "result";
}

interface AnnotationMetadata {
  anomalyState: "Faulty" | "Potentially Faulty" | "Normal" | "";
  confidenceScore: number;
  riskType: "Point fault" | "Full wire overload" | "Transformer overload" | "Normal" | "";
  description: string;
}

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  thermalImage: string | null;
  analysisResult: string | null;
  inspection: InspectionView;
  analysisData: any;
  initialAnnotations?: BoundingBox[];
}

function AnalysisModal({ 
  isOpen, 
  onClose, 
  thermalImage, 
  analysisResult, 
  inspection,
  analysisData,
  initialAnnotations = []
}: AnalysisModalProps) {
  const [comparisonPosition, setComparisonPosition] = useState(50);
  const [hoveredImage, setHoveredImage] = useState<'thermal' | 'result' | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 600, height: 500 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [viewMode, setViewMode] = useState<'side-by-side' | 'slider'>('side-by-side');
  const [isDragging, setIsDragging] = useState(false);
  
  // Bounding box annotation states
  const [annotationMode, setAnnotationMode] = useState(false);
  const [boundingBoxes, setBoundingBoxes] = useState<BoundingBox[]>(initialAnnotations);
  const [currentBox, setCurrentBox] = useState<Partial<BoundingBox> | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [showMetadataForm, setShowMetadataForm] = useState(false);
  const [pendingBoxId, setPendingBoxId] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Box resizing state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null>(null);
  const [resizingBoxId, setResizingBoxId] = useState<string | null>(null);
  
  // Metadata form state
  const [metadata, setMetadata] = useState<AnnotationMetadata>({
    anomalyState: "",
    confidenceScore: 0,
    riskType: "",
    description: ""
  });

  // Sync boundingBoxes with initialAnnotations when they change
  useEffect(() => {
    if (initialAnnotations && initialAnnotations.length > 0) {
      setBoundingBoxes(initialAnnotations);
    }
  }, [initialAnnotations]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const img = container.querySelector('img') as HTMLImageElement;
    
    if (!img) return;
    
    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    
    // Store container and image sizes for positioning and zoom calculations
    setContainerSize({ width: containerRect.width, height: containerRect.height });
    setImageSize({ width: imgRect.width, height: imgRect.height });
    
    // Mouse position relative to container
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    
    // Mouse position relative to the actual image (not the container)
    const imgMouseX = e.clientX - imgRect.left;
    const imgMouseY = e.clientY - imgRect.top;
    
    // Calculate the percentage position on the image
    const xPercent = (imgMouseX / imgRect.width) * 100;
    const yPercent = (imgMouseY / imgRect.height) * 100;
    
    setMousePosition({ x: mouseX, y: mouseY });
    setImagePosition({ x: xPercent, y: yPercent });
  };

  const handleSliderClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const newPosition = ((e.clientX - rect.left) / rect.width) * 100;
    setComparisonPosition(Math.max(0, Math.min(100, newPosition)));
  };

  const handleSliderDrag = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const newPosition = ((e.clientX - rect.left) / rect.width) * 100;
    setComparisonPosition(Math.max(0, Math.min(100, newPosition)));
  };

  // Bounding box annotation handlers
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>, imageType: 'thermal' | 'result') => {
    if (!annotationMode) return;
    
    const img = e.currentTarget.querySelector('img') as HTMLImageElement;
    if (!img) return;
    
    const imgRect = img.getBoundingClientRect();
    const x = ((e.clientX - imgRect.left) / imgRect.width) * 100;
    const y = ((e.clientY - imgRect.top) / imgRect.height) * 100;
    
    if (!isDrawing) {
      // Start drawing
      const newBox: Partial<BoundingBox> = {
        id: `box-${Date.now()}`,
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        imageType,
        anomalyState: "",
        confidenceScore: 0,
        riskType: "",
        description: ""
      };
      setCurrentBox(newBox);
      setIsDrawing(true);
    } else {
      // Finish drawing
      if (currentBox) {
        const finishedBox = {
          ...currentBox,
          endX: x,
          endY: y
        } as BoundingBox;
        
        // Check if box has valid size (not just a click)
        const width = Math.abs(finishedBox.endX - finishedBox.startX);
        const height = Math.abs(finishedBox.endY - finishedBox.startY);
        
        if (width > 1 && height > 1) {
          setPendingBoxId(finishedBox.id);
          setShowMetadataForm(true);
          // Temporarily add box to array (will be updated with metadata)
          setBoundingBoxes(prev => [...prev, finishedBox]);
        }
      }
      setCurrentBox(null);
      setIsDrawing(false);
    }
  };

  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!annotationMode || !isDrawing || !currentBox) return;
    
    const img = e.currentTarget.querySelector('img') as HTMLImageElement;
    if (!img) return;
    
    const imgRect = img.getBoundingClientRect();
    const x = ((e.clientX - imgRect.left) / imgRect.width) * 100;
    const y = ((e.clientY - imgRect.top) / imgRect.height) * 100;
    
    setCurrentBox(prev => prev ? { ...prev, endX: x, endY: y } : null);
  };

  const handleSaveMetadata = () => {
    if (!pendingBoxId) return;
    
    // Validate required fields
    if (!metadata.anomalyState || !metadata.riskType) {
      toast({
        title: "Missing Information",
        description: "Please select anomaly state and risk type",
        variant: "destructive"
      });
      return;
    }
    
    // Update the box with metadata
    const updatedBoxes = boundingBoxes.map(box => 
      box.id === pendingBoxId 
        ? { ...box, ...metadata }
        : box
    );
    setBoundingBoxes(updatedBoxes);
    
    // Emit event to notify main component
    window.dispatchEvent(new CustomEvent('annotationsUpdated', { detail: updatedBoxes }));
    
    // Reset form
    setShowMetadataForm(false);
    setPendingBoxId(null);
    setSelectedBoxId(null); // Clear selection after saving
    setMetadata({
      anomalyState: "",
      confidenceScore: 0,
      riskType: "",
      description: ""
    });
    
    toast({
      title: "Annotation Saved",
      description: "Bounding box annotation has been saved successfully",
    });
  };

  const handleEditBox = (boxId: string) => {
    const boxToEdit = boundingBoxes.find(box => box.id === boxId);
    if (!boxToEdit) return;
    
    // Load the box's metadata into the form
    setMetadata({
      anomalyState: boxToEdit.anomalyState,
      confidenceScore: boxToEdit.confidenceScore,
      riskType: boxToEdit.riskType,
      description: boxToEdit.description
    });
    
    setPendingBoxId(boxId);
    setShowMetadataForm(true);
    
    toast({
      title: "Edit Mode",
      description: "Update the annotation metadata and save",
    });
  };

  const handleCancelMetadata = () => {
    // Remove the pending box
    if (pendingBoxId) {
      setBoundingBoxes(prev => prev.filter(box => box.id !== pendingBoxId));
    }
    setShowMetadataForm(false);
    setPendingBoxId(null);
    setMetadata({
      anomalyState: "",
      confidenceScore: 0,
      riskType: "",
      description: ""
    });
  };

  const handleDeleteBox = (boxId: string) => {
    const updatedBoxes = boundingBoxes.filter(box => box.id !== boxId);
    setBoundingBoxes(updatedBoxes);
    setSelectedBoxId(null);
    
    // Emit event to notify main component
    window.dispatchEvent(new CustomEvent('annotationsUpdated', { detail: updatedBoxes }));
    
    toast({
      title: "Annotation Deleted",
      description: "Bounding box annotation has been removed",
    });
  };

  const handleExportAnnotations = () => {
    // Convert to the new format with bbox and center
    const formattedAnnotations = boundingBoxes.map(box => {
      const x = Math.min(box.startX, box.endX);
      const y = Math.min(box.startY, box.endY);
      const w = Math.abs(box.endX - box.startX);
      const h = Math.abs(box.endY - box.startY);
      
      return {
        id: box.id,
        bbox: [x, y, w, h],
        center: [x + w / 2, y + h / 2],
        anomalyState: box.anomalyState,
        confidenceScore: box.confidenceScore,
        riskType: box.riskType,
        description: box.description,
        imageType: box.imageType
      };
    });
    
    const annotationsJson = JSON.stringify(formattedAnnotations, null, 2);
    console.log('Annotations to be sent to backend:', annotationsJson);
    
    // Create a download for now
    const blob = new Blob([annotationsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspection-${inspection.id}-annotations.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Annotations Exported",
      description: `${boundingBoxes.length} annotations exported. Ready to send to backend.`,
    });
  };

  const toggleAnnotationMode = () => {
    setAnnotationMode(!annotationMode);
    if (annotationMode) {
      // Exiting annotation mode
      setIsDrawing(false);
      setCurrentBox(null);
    }
  };

  // Handle box resizing
  const handleResizeStart = (e: React.MouseEvent, boxId: string, handle: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w') => {
    e.stopPropagation();
    setIsResizing(true);
    setResizingBoxId(boxId);
    setResizeHandle(handle);
    setSelectedBoxId(boxId);
  };

  const handleResizeMove = (e: React.MouseEvent<HTMLDivElement>, imageType: 'thermal' | 'result') => {
    if (!isResizing || !resizingBoxId || !resizeHandle) return;
    
    const img = e.currentTarget.querySelector('img') as HTMLImageElement;
    if (!img) return;
    
    const imgRect = img.getBoundingClientRect();
    const x = ((e.clientX - imgRect.left) / imgRect.width) * 100;
    const y = ((e.clientY - imgRect.top) / imgRect.height) * 100;
    
    setBoundingBoxes(prev => prev.map(box => {
      if (box.id !== resizingBoxId || box.imageType !== imageType) return box;
      
      let newBox = { ...box };
      
      // Update coordinates based on which handle is being dragged
      switch (resizeHandle) {
        case 'nw': // Top-left corner
          newBox.startX = x;
          newBox.startY = y;
          break;
        case 'ne': // Top-right corner
          newBox.endX = x;
          newBox.startY = y;
          break;
        case 'sw': // Bottom-left corner
          newBox.startX = x;
          newBox.endY = y;
          break;
        case 'se': // Bottom-right corner
          newBox.endX = x;
          newBox.endY = y;
          break;
        case 'n': // Top edge
          newBox.startY = y;
          break;
        case 's': // Bottom edge
          newBox.endY = y;
          break;
        case 'e': // Right edge
          newBox.endX = x;
          break;
        case 'w': // Left edge
          newBox.startX = x;
          break;
      }
      
      return newBox;
    }));
  };

  const handleResizeEnd = () => {
    if (isResizing && resizingBoxId) {
      // Emit event to notify main component
      window.dispatchEvent(new CustomEvent('annotationsUpdated', { detail: boundingBoxes }));
      
      toast({
        title: "Box Resized",
        description: "Bounding box has been resized successfully",
      });
    }
    
    setIsResizing(false);
    setResizingBoxId(null);
    setResizeHandle(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              <span>Image Analysis Comparison - Inspection #{inspection.id}</span>
              {analysisData && (
                <div className="text-sm font-normal text-gray-600 mt-1">
                  Analysis completed on {new Date(analysisData.analysisDate).toLocaleString()}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={annotationMode ? "default" : "outline"}
                size="sm"
                onClick={toggleAnnotationMode}
                className={annotationMode ? "bg-blue-600 hover:bg-blue-700" : ""}
              >
                <Square className="h-4 w-4 mr-2" />
                {annotationMode ? 'Exit Annotation' : 'Annotate Boxes'}
              </Button>
              {boundingBoxes.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportAnnotations}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Export ({boundingBoxes.length})
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode(viewMode === 'side-by-side' ? 'slider' : 'side-by-side')}
              >
                {viewMode === 'side-by-side' ? 'Slider Compare' : 'Side by Side'}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Annotation Mode Info Banner */}
          {annotationMode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
              <div className="flex items-start gap-2">
                <Square className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Annotation Mode Active</p>
                  <p className="text-blue-700 mt-1">
                    Click once to start drawing a box, move your cursor to define the area, then click again to finish. 
                    You'll be prompted to add metadata for each annotation.
                  </p>
                </div>
              </div>
            </div>
          )}
          {(!thermalImage || !analysisResult) && (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                {!thermalImage ? 'No thermal image available for comparison.' : 
                 !analysisResult ? 'No analysis result image found for this inspection.' : 
                 'Loading images...'}
              </p>
            </div>
          )}

          {analysisResult && thermalImage && (
            <>
              {viewMode === 'side-by-side' ? (
                <div className="grid grid-cols-2 gap-4">
                  {/* Thermal Image */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-center">Thermal Image (Original)</h3>
                    <div 
                      className={`relative bg-gray-100 rounded-lg overflow-hidden group border-2 transition-colors flex items-center justify-center min-h-[300px] ${
                        annotationMode 
                          ? 'cursor-crosshair border-blue-500 hover:border-blue-600' 
                          : 'cursor-crosshair border-gray-200 hover:border-blue-400'
                      }`}
                      onMouseMove={(e) => {
                        handleMouseMove(e);
                        if (annotationMode && !isResizing) handleImageMouseMove(e);
                        if (isResizing) handleResizeMove(e, 'thermal');
                      }}
                      onMouseUp={handleResizeEnd}
                      onMouseLeave={() => {
                        setHoveredImage(null);
                        if (isResizing) handleResizeEnd();
                      }}
                      onMouseEnter={() => setHoveredImage('thermal')}
                      onClick={(e) => !isResizing && handleImageClick(e, 'thermal')}
                    >
                      <img 
                        src={thermalImage} 
                        alt="Thermal image" 
                        className="max-w-full max-h-[500px] object-contain rounded"
                      />
                      
                      {/* Render existing bounding boxes */}
                      {boundingBoxes.filter(box => box.imageType === 'thermal').map(box => {
                        const left = Math.min(box.startX, box.endX);
                        const top = Math.min(box.startY, box.endY);
                        const width = Math.abs(box.endX - box.startX);
                        const height = Math.abs(box.endY - box.startY);
                        
                        return (
                          <div
                            key={box.id}
                            className={`absolute border-2 pointer-events-auto ${
                              selectedBoxId === box.id ? 'border-yellow-400' : 
                              box.anomalyState === 'Faulty' ? 'border-red-500' :
                              box.anomalyState === 'Potentially Faulty' ? 'border-orange-500' :
                              'border-green-500'
                            }`}
                            style={{
                              left: `${left}%`,
                              top: `${top}%`,
                              width: `${width}%`,
                              height: `${height}%`,
                              backgroundColor: selectedBoxId === box.id ? 'rgba(255, 255, 0, 0.1)' :
                                box.anomalyState === 'Faulty' ? 'rgba(255, 0, 0, 0.1)' :
                                box.anomalyState === 'Potentially Faulty' ? 'rgba(255, 165, 0, 0.1)' :
                                'rgba(0, 255, 0, 0.1)'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBoxId(box.id);
                            }}
                          >
                            <div className="absolute -top-6 left-0 bg-black/70 text-white px-2 py-0.5 rounded text-xs whitespace-nowrap">
                              {box.anomalyState} ({box.confidenceScore}%)
                            </div>
                            {selectedBoxId === box.id && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="absolute -top-8 -right-16 h-6 w-6 p-0 bg-blue-600 hover:bg-blue-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditBox(box.id);
                                  }}
                                  title="Edit annotation"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="absolute -top-8 -right-8 h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteBox(box.id);
                                  }}
                                  title="Delete annotation"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                                
                                {/* Resize handles */}
                                <div className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-nw-resize z-10" 
                                     onMouseDown={(e) => handleResizeStart(e, box.id, 'nw')} title="Drag to resize" />
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-ne-resize z-10" 
                                     onMouseDown={(e) => handleResizeStart(e, box.id, 'ne')} title="Drag to resize" />
                                <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-sw-resize z-10" 
                                     onMouseDown={(e) => handleResizeStart(e, box.id, 'sw')} title="Drag to resize" />
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-se-resize z-10" 
                                     onMouseDown={(e) => handleResizeStart(e, box.id, 'se')} title="Drag to resize" />
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-n-resize z-10" 
                                     onMouseDown={(e) => handleResizeStart(e, box.id, 'n')} title="Drag to resize" />
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-s-resize z-10" 
                                     onMouseDown={(e) => handleResizeStart(e, box.id, 's')} title="Drag to resize" />
                                <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-w-resize z-10" 
                                     onMouseDown={(e) => handleResizeStart(e, box.id, 'w')} title="Drag to resize" />
                                <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-e-resize z-10" 
                                     onMouseDown={(e) => handleResizeStart(e, box.id, 'e')} title="Drag to resize" />
                              </>
                            )}
                          </div>
                        );
                      })}
                      
                      {/* Render current drawing box */}
                      {currentBox && currentBox.imageType === 'thermal' && (
                        <div
                          className="absolute border-2 border-dashed border-blue-500 bg-blue-500/20 pointer-events-none"
                          style={{
                            left: `${Math.min(currentBox.startX!, currentBox.endX!)}%`,
                            top: `${Math.min(currentBox.startY!, currentBox.endY!)}%`,
                            width: `${Math.abs(currentBox.endX! - currentBox.startX!)}%`,
                            height: `${Math.abs(currentBox.endY! - currentBox.startY!)}%`,
                          }}
                        />
                      )}
                      
                      {!annotationMode && hoveredImage === 'thermal' && imageSize.width > 0 && (
                        <>
                          <div 
                            className="absolute pointer-events-none shadow-lg z-10 rounded-lg overflow-hidden"
                            style={{
                              left: Math.max(10, Math.min(mousePosition.x - 75, containerSize.width - 160)),
                              top: Math.max(10, Math.min(mousePosition.y - 75, containerSize.height - 160)),
                              width: 150,
                              height: 150,
                              backgroundImage: `url(${thermalImage})`,
                              backgroundPosition: `${imagePosition.x}% ${imagePosition.y}%`,
                              backgroundSize: `${imageSize.width * 3}px ${imageSize.height * 3}px`,
                              backgroundRepeat: 'no-repeat',
                              backgroundColor: 'white',
                              border: '3px solid #3b82f6',
                              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                            }}
                          />
                          <div 
                            className="absolute pointer-events-none bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium z-20"
                            style={{
                              left: Math.max(10, Math.min(mousePosition.x - 20, containerSize.width - 70)),
                              top: Math.max(165, Math.min(mousePosition.y + 80, containerSize.height - 40)),
                            }}
                          >
                            3x Zoom
                          </div>
                        </>
                      )}
                      <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                        Original
                      </div>
                      {/* Magnification hint */}
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        🔍 Hover to zoom
                      </div>
                    </div>
                  </div>

                  {/* Analysis Result */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-center">Analysis Result</h3>
                    <div 
                      className={`relative bg-gray-100 rounded-lg overflow-hidden group border-2 transition-colors flex items-center justify-center min-h-[300px] ${
                        annotationMode 
                          ? 'cursor-crosshair border-green-500 hover:border-green-600' 
                          : 'cursor-crosshair border-gray-200 hover:border-green-400'
                      }`}
                      onMouseMove={(e) => {
                        handleMouseMove(e);
                        if (annotationMode && !isResizing) handleImageMouseMove(e);
                        if (isResizing) handleResizeMove(e, 'result');
                      }}
                      onMouseUp={handleResizeEnd}
                      onMouseLeave={() => {
                        setHoveredImage(null);
                        if (isResizing) handleResizeEnd();
                      }}
                      onMouseEnter={() => setHoveredImage('result')}
                      onClick={(e) => !isResizing && handleImageClick(e, 'result')}
                    >
                      <img 
                        src={analysisResult} 
                        alt="Analysis result" 
                        className="max-w-full max-h-[500px] object-contain rounded"
                      />
                      
                      {/* Render existing bounding boxes */}
                      {boundingBoxes.filter(box => box.imageType === 'result').map(box => {
                        const left = Math.min(box.startX, box.endX);
                        const top = Math.min(box.startY, box.endY);
                        const width = Math.abs(box.endX - box.startX);
                        const height = Math.abs(box.endY - box.startY);
                        
                        return (
                          <div
                            key={box.id}
                            className={`absolute border-2 pointer-events-auto ${
                              selectedBoxId === box.id ? 'border-yellow-400' : 
                              box.anomalyState === 'Faulty' ? 'border-red-500' :
                              box.anomalyState === 'Potentially Faulty' ? 'border-orange-500' :
                              'border-green-500'
                            }`}
                            style={{
                              left: `${left}%`,
                              top: `${top}%`,
                              width: `${width}%`,
                              height: `${height}%`,
                              backgroundColor: selectedBoxId === box.id ? 'rgba(255, 255, 0, 0.1)' :
                                box.anomalyState === 'Faulty' ? 'rgba(255, 0, 0, 0.1)' :
                                box.anomalyState === 'Potentially Faulty' ? 'rgba(255, 165, 0, 0.1)' :
                                'rgba(0, 255, 0, 0.1)'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBoxId(box.id);
                            }}
                          >
                            <div className="absolute -top-6 left-0 bg-black/70 text-white px-2 py-0.5 rounded text-xs whitespace-nowrap">
                              {box.anomalyState} ({box.confidenceScore}%)
                            </div>
                            {selectedBoxId === box.id && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="absolute -top-8 -right-16 h-6 w-6 p-0 bg-blue-600 hover:bg-blue-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditBox(box.id);
                                  }}
                                  title="Edit annotation"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="absolute -top-8 -right-8 h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteBox(box.id);
                                  }}
                                  title="Delete annotation"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                                
                                {/* Resize handles */}
                                <div className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-nw-resize z-10" 
                                     onMouseDown={(e) => handleResizeStart(e, box.id, 'nw')} title="Drag to resize" />
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-ne-resize z-10" 
                                     onMouseDown={(e) => handleResizeStart(e, box.id, 'ne')} title="Drag to resize" />
                                <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-sw-resize z-10" 
                                     onMouseDown={(e) => handleResizeStart(e, box.id, 'sw')} title="Drag to resize" />
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-se-resize z-10" 
                                     onMouseDown={(e) => handleResizeStart(e, box.id, 'se')} title="Drag to resize" />
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-n-resize z-10" 
                                     onMouseDown={(e) => handleResizeStart(e, box.id, 'n')} title="Drag to resize" />
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-s-resize z-10" 
                                     onMouseDown={(e) => handleResizeStart(e, box.id, 's')} title="Drag to resize" />
                                <div className="absolute top-1/2 -translate-y-1/2 -left-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-w-resize z-10" 
                                     onMouseDown={(e) => handleResizeStart(e, box.id, 'w')} title="Drag to resize" />
                                <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-e-resize z-10" 
                                     onMouseDown={(e) => handleResizeStart(e, box.id, 'e')} title="Drag to resize" />
                              </>
                            )}
                          </div>
                        );
                      })}
                      
                      {/* Render current drawing box */}
                      {currentBox && currentBox.imageType === 'result' && (
                        <div
                          className="absolute border-2 border-dashed border-green-500 bg-green-500/20 pointer-events-none"
                          style={{
                            left: `${Math.min(currentBox.startX!, currentBox.endX!)}%`,
                            top: `${Math.min(currentBox.startY!, currentBox.endY!)}%`,
                            width: `${Math.abs(currentBox.endX! - currentBox.startX!)}%`,
                            height: `${Math.abs(currentBox.endY! - currentBox.startY!)}%`,
                          }}
                        />
                      )}
                      
                      {!annotationMode && hoveredImage === 'result' && imageSize.width > 0 && (
                        <>
                          <div 
                            className="absolute pointer-events-none shadow-lg z-10 rounded-lg overflow-hidden"
                            style={{
                              left: Math.max(10, Math.min(mousePosition.x - 75, containerSize.width - 160)),
                              top: Math.max(10, Math.min(mousePosition.y - 75, containerSize.height - 160)),
                              width: 150,
                              height: 150,
                              backgroundImage: `url(${analysisResult})`,
                              backgroundPosition: `${imagePosition.x}% ${imagePosition.y}%`,
                              backgroundSize: `${imageSize.width * 3}px ${imageSize.height * 3}px`,
                              backgroundRepeat: 'no-repeat',
                              backgroundColor: 'white',
                              border: '3px solid #10b981',
                              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                            }}
                          />
                          <div 
                            className="absolute pointer-events-none bg-green-600 text-white px-2 py-1 rounded text-xs font-medium z-20"
                            style={{
                              left: Math.max(10, Math.min(mousePosition.x - 20, containerSize.width - 70)),
                              top: Math.max(165, Math.min(mousePosition.y + 80, containerSize.height - 40)),
                            }}
                          >
                            3x Zoom
                          </div>
                        </>
                      )}
                      <div className="absolute top-2 left-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
                        Result
                      </div>
                      {/* Magnification hint */}
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        🔍 Hover to zoom
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Slider Comparison View */
                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-lg">
                    <label className="text-sm font-medium whitespace-nowrap">Comparison Slider:</label>
                    <Slider
                      value={[comparisonPosition]}
                      onValueChange={(value) => setComparisonPosition(value[0])}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground font-mono">{comparisonPosition}%</span>
                  </div>
                  
                  <div 
                    className="relative bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 cursor-col-resize flex items-center justify-center min-h-[400px]"
                    onClick={handleSliderClick}
                    onMouseDown={() => setIsDragging(true)}
                    onMouseUp={() => setIsDragging(false)}
                    onMouseLeave={() => setIsDragging(false)}
                    onMouseMove={handleSliderDrag}
                  >
                    {/* Base image (analysis result) */}
                    <img 
                      src={analysisResult} 
                      alt="Analysis result" 
                      className="max-w-full max-h-[600px] object-contain"
                    />
                    
                    {/* Overlay image (thermal) with clip */}
                    <div 
                      className="absolute inset-0 overflow-hidden flex items-center justify-center"
                      style={{ clipPath: `inset(0 ${100 - comparisonPosition}% 0 0)` }}
                    >
                      <img 
                        src={thermalImage} 
                        alt="Thermal image" 
                        className="max-w-full max-h-[600px] object-contain"
                      />
                    </div>
                    
                    {/* Divider line with handle */}
                    <div 
                      className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-col-resize"
                      style={{ left: `${comparisonPosition}%` }}
                    >
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white border-2 border-gray-300 rounded-full shadow-lg flex items-center justify-center">
                        <div className="w-1 h-4 bg-gray-400 rounded"></div>
                      </div>
                    </div>
                    
                    {/* Labels */}
                    <div className="absolute top-3 left-3 bg-blue-600/90 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Thermal Original
                    </div>
                    <div className="absolute top-3 right-3 bg-green-600/90 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Analysis Result
                    </div>
                    
                    {/* Instructions */}
                    <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded text-xs">
                      Drag slider or click to compare
                    </div>
                  </div>
                </div>
              )}

              {/* Usage Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 mt-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">i</span>
                  </div>
                  <span className="font-medium">How to use image comparison:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 ml-6">
                  <li>Hover over images to activate 2x magnification zoom</li>
                  <li>Use "Side by Side" view for detailed comparison</li>
                  <li>Use "Slider Compare" view to overlay images with adjustable slider</li>
                  <li>Click "View Full Size" buttons to open images in new tabs</li>
                </ul>
              </div>

              {/* Analysis Summary */}
              {analysisData && (
                <div className="bg-gray-50 p-4 rounded-lg border">
                  <h3 className="font-medium mb-3">Analysis Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <div className="font-medium text-green-600">{analysisData.analysisStatus}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Date:</span>
                      <div className="font-medium">{new Date(analysisData.analysisDate).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Processing Time:</span>
                      <div className="font-medium">{analysisData.processingTimeMs}ms</div>
                    </div>
                    {analysisData.analysisResultJson && (() => {
                      try {
                        const resultJson = JSON.parse(analysisData.analysisResultJson);
                        return (
                          <div>
                            <span className="text-gray-600">Anomalies:</span>
                            <div className="font-medium text-red-600">
                              {resultJson.summary?.total_anomalies || 0} found
                            </div>
                          </div>
                        );
                      } catch {
                        return null;
                      }
                    })()}
                  </div>
                  
                  {/* Anomaly Details */}
                  {analysisData.analysisResultJson && (() => {
                    try {
                      const resultJson = JSON.parse(analysisData.analysisResultJson);
                      if (resultJson.anomalies && resultJson.anomalies.length > 0) {
                        return (
                          <div className="mt-4">
                            <h4 className="font-medium mb-2">Detected Anomalies:</h4>
                            <div className="space-y-2">
                              {resultJson.anomalies.map((anomaly: any, index: number) => (
                                <div key={index} className="bg-white p-3 rounded border-l-4 border-red-500">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="font-medium text-red-600">
                                        {anomaly.severity_level} Severity
                                      </span>
                                      <p className="text-sm text-gray-600 mt-1">{anomaly.reasoning}</p>
                                    </div>
                                    <div className="text-right text-sm">
                                      <div>Confidence: {(anomaly.confidence * 100).toFixed(1)}%</div>
                                      <div>Area: {anomaly.area?.toLocaleString()}</div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                    } catch {
                      return null;
                    }
                    return null;
                  })()}
                </div>
              )}

              {/* Enhanced Action buttons */}
              <div className="flex justify-between items-center pt-4 border-t bg-gray-50 p-4 rounded-lg">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openInNewTab(thermalImage)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Thermal Full Size
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => openInNewTab(analysisResult)}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Result Full Size
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose}>Close</Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
      
      {/* Metadata Form Dialog */}
      <Dialog open={showMetadataForm} onOpenChange={setShowMetadataForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {boundingBoxes.find(box => box.id === pendingBoxId)?.anomalyState ? 'Edit Annotation Metadata' : 'Annotation Metadata'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="anomalyState">Anomaly State *</Label>
              <Select 
                value={metadata.anomalyState} 
                onValueChange={(value) => {
                  const newState = value as "Faulty" | "Potentially Faulty" | "Normal" | "";
                  setMetadata({
                    ...metadata, 
                    anomalyState: newState,
                    // Auto-set Risk Type to "Normal" when Anomaly State is "Normal"
                    riskType: newState === "Normal" ? "Normal" : metadata.riskType
                  });
                }}
              >
                <SelectTrigger id="anomalyState">
                  <SelectValue placeholder="Select anomaly state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Faulty">Faulty</SelectItem>
                  <SelectItem value="Potentially Faulty">Potentially Faulty</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confidenceScore">Confidence Score (0-100) *</Label>
              <div className="flex items-center gap-4">
                <Slider
                  id="confidenceScore"
                  value={[metadata.confidenceScore]}
                  onValueChange={(value) => setMetadata({...metadata, confidenceScore: value[0]})}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm font-mono w-12 text-right">{metadata.confidenceScore}%</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="riskType">Risk Type *</Label>
              <Select 
                value={metadata.riskType} 
                onValueChange={(value) => setMetadata({...metadata, riskType: value as "Point fault" | "Full wire overload" | "Transformer overload" | "Normal" | ""})}
                disabled={metadata.anomalyState === "Normal"}
              >
                <SelectTrigger id="riskType">
                  <SelectValue placeholder="Select risk type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Point fault">Point fault</SelectItem>
                  <SelectItem value="Full wire overload">Full wire overload</SelectItem>
                  <SelectItem value="Transformer overload">Transformer overload</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                </SelectContent>
              </Select>
              {metadata.anomalyState === "Normal" && (
                <p className="text-xs text-muted-foreground">Risk type automatically set to Normal</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Add additional notes about this annotation..."
                value={metadata.description}
                onChange={(e) => setMetadata({...metadata, description: e.target.value})}
                rows={3}
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCancelMetadata}>
                Cancel
              </Button>
              <Button onClick={handleSaveMetadata}>
                Save Annotation
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

export default function InspectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadLabel, setUploadLabel] = useState<string>("");
  const [baselineImage, setBaselineImage] = useState<string | null>(null);
  const [thermalImage, setThermalImage] = useState<string | null>(null);
  const [thermalWeatherCondition, setThermalWeatherCondition] = useState("Sunny");
  const [baselineWeatherCondition, setBaselineWeatherCondition] = useState("Sunny");
  
  // Analysis state
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [statusPolling, setStatusPolling] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  
  // Annotation tools zoom state
  const [annotationZoom, setAnnotationZoom] = useState(1);
  const [annotationPosition, setAnnotationPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Cached annotations state
  const [cachedAnnotations, setCachedAnnotations] = useState<BoundingBox[]>([]);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<Array<{id: string, role: 'user' | 'assistant', content: string, timestamp: Date}>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const [inspection, setInspection] = useState<InspectionView>({
    id: id ?? "-",
    transformerNo: "-",
    branch: "-",
    lastUpdated: "-",
    status: "in-progress",
  });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!id) return;
      try {
        const res = await fetch(API_ENDPOINTS.INSPECTION_DETAIL(id));
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const raw: ApiEnvelope<any> = await res.json();
        const data: any = (raw as any)?.responseData ?? raw;
        const iso = data?.dateOfInspection && data?.time ? `${data.dateOfInspection}T${data.time}` : data?.dateOfInspection;
        let lastUpdated = "-";
        try { lastUpdated = iso ? new Date(iso).toLocaleString() : "-"; } catch {}
        const mapped: InspectionView = {
          id: String(data?.id ?? id),
          transformerNo: data?.transformerNo ?? "-",
          branch: data?.branch ?? "-",
          lastUpdated,
          status: "in-progress", // Set a default status, will be updated by thermal API
        };
        console.log('Initial inspection data loaded:', mapped); // Debug log
        if (!cancelled) {
          setInspection(mapped);
          
          // Auto-start polling if inspection is in progress
          if (mapped.status === 'in-progress' || mapped.status === 'In progress' || mapped.status === 'In Progress') {
            console.log('Auto-starting status polling for in-progress inspection');
            setStatusPolling(true);
          }
          
          // Check thermal status immediately to get real status
          checkThermalStatus();
        }
      } catch (e) {
        console.error(e);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [id]);

  // Status polling effect - check both thermal status AND analysis result
  useEffect(() => {
    if (!statusPolling || !inspection) {
      return;
    }

    // Stop polling if we have analysis result
    if (analysisResult) {
      setStatusPolling(false);
      return;
    }

    console.log('Starting status polling for inspection:', id);
    
    const pollInterval = setInterval(async () => {
      const status = await checkThermalStatus();
      console.log('Poll result - status:', status);
      
      // Always try to fetch analysis result during polling
      const hasResult = await fetchAnalysisResult();
      
      // Stop polling if we got the analysis result
      if (hasResult) {
        setStatusPolling(false);
        console.log('Status polling stopped - analysis result available');
        return;
      }
      
      // Also stop polling if status shows completed
      if (status === 'Completed' || status === 'completed') {
        // But keep trying to get the result a few more times
        console.log('Status shows completed, will check for result');
      }
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(pollInterval);
      console.log('Status polling cleanup');
    };
  }, [statusPolling, inspection?.status, id, analysisResult]);

  useEffect(() => {
    const tfNo = inspection.transformerNo;
    if (!tfNo || tfNo === "-") return;

    const url = API_ENDPOINTS.IMAGE_BASELINE(encodeURIComponent(tfNo));

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const ct = res.headers.get('content-type') || '';

        if (ct.startsWith('image/')) {
          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);
          setBaselineImage(objUrl);
          return;
        }

        // Try JSON shape
        try {
          const raw: ApiEnvelope<any> = await res.json();
          const data: any = (raw as any)?.responseData ?? raw;
          const possible = data?.imageBase64;

          if (typeof possible === 'string') {
            let finalUrl = possible;
            if (!/^https?:\/\//i.test(possible) && !possible.startsWith('data:')) {
              // make relative -> absolute
              try { finalUrl = new URL(possible, window.location.origin).toString(); } catch {}
            }
            setBaselineImage(finalUrl);
          }
        } catch (e) {
          // Non-JSON response that isn't an image — ignore
        }
      } catch (e) {
        console.error('Failed to fetch baseline image:', e);
      }
    })();
  }, [inspection.transformerNo]);

  useEffect(() => {
    const inspNo = id; // Use ID from URL params directly
    if (!inspNo) return;

    const url = API_ENDPOINTS.IMAGE_THERMAL(encodeURIComponent(inspNo));

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const ct = res.headers.get('content-type') || '';

        if (ct.startsWith('image/')) {
          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);
          setThermalImage(objUrl);
          return;
        }

        // Try JSON response with possible URL/base64 fields
        try {
          const raw: ApiEnvelope<any> = await res.json();
          const data: any = (raw as any)?.responseData ?? raw;
          const possible = data?.imageBase64 || data?.url || data?.imageUrl;

          if (typeof possible === 'string') {
            let finalUrl = possible;
            if (!/^https?:\/\//i.test(possible) && !possible.startsWith('data:')) {
              try { finalUrl = new URL(possible, window.location.origin).toString(); } catch {}
            }
            setThermalImage(finalUrl);
          }

          // Update inspection status from thermal image API response - this is the primary status source
          if (data?.status) {
            console.log('Updating status from thermal API:', data.status); // Debug log
            setInspection(prev => ({
              ...prev,
              status: data.status as any,
            }));
            
            // If status is completed, automatically fetch analysis result
            if (data.status === 'Completed' || data.status === 'completed' || data.status === 'Complete') {
              fetchAnalysisResult();
            }
          }
        } catch (_) {
          // Non-JSON response that isn't an image — leave thermal image unset
        }
      } catch (e) {
        console.error('Failed to fetch thermal image:', e);
        // Keep upload buttons visible by leaving thermalImage as null
      }
    })();
  }, [id]); // Use id from URL params directly

  // Dynamic progress steps based on current state
  const getProgressSteps = () => {
    // Step 1: Thermal Image Upload
    const thermalUploadStatus = thermalImage ? "completed" : "waiting";
    
    // Step 2: AI Analysis
    let aiAnalysisStatus = "not-ready";
    if (baselineImage && thermalImage && (inspection.status === 'Completed' || inspection.status === 'completed')) {
      aiAnalysisStatus = "completed";
    } else if (baselineImage && thermalImage && (inspection.status === 'in-progress' || inspection.status === 'In progress' || inspection.status === 'In Progress')) {
      aiAnalysisStatus = "in-progress";
    } else if (baselineImage && thermalImage) {
      aiAnalysisStatus = "ready";
    }
    
    // Step 3: Thermal Image Review
    const reviewStatus = analysisResult ? "completed" : "not-ready";
    
    return [
      { title: "Thermal Image Upload", status: thermalUploadStatus },
      { title: "AI Analysis", status: aiAnalysisStatus },
      { title: "Thermal Image Review", status: reviewStatus },
    ];
  };

  const progressSteps = getProgressSteps();

  const handleFileUpload = async (file: File, type: 'baseline' | 'thermal') => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadLabel(type === 'baseline' ? 'Uploading baseline image…' : 'Uploading thermal image…');

    try {
      // build form data
      const form = new FormData();
      // API expects these exact keys based on Postman screenshot
      form.append('imageType', type === 'baseline' ? 'Baseline' : 'Thermal');
      form.append('weatherCondition', type === 'baseline' ? (baselineWeatherCondition || 'Sunny') : (thermalWeatherCondition || 'Sunny'));
      form.append('status', 'In-progress');
      form.append('transformerNo', inspection.transformerNo ?? "-");
      form.append('inspectionNo', inspection.id ?? "-");
      form.append('imageFile', file, "file_name");

      // NOTE: fetch doesn't give native progress; keep a lightweight simulated bar
      const prog = setInterval(() => setUploadProgress((p) => (p >= 95 ? 95 : p + 5)), 150);

      const res = await fetch(API_ENDPOINTS.IMAGE_UPLOAD, {
        method: 'POST',
        body: form,
      });

      clearInterval(prog);
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }

      // Try to read returned JSON and find a URL if backend returns one
      let uploadedUrl: string | null = null;
      try {
        const raw: ApiEnvelope<any> = await res.json();
        const data: any = (raw as any)?.responseData ?? raw;
        uploadedUrl = data?.url || data?.imageUrl || null;
      } catch (_) {
        // ignore parse errors; we'll still show a local preview
      }

      const previewUrl = uploadedUrl ?? URL.createObjectURL(file);
      if (type === 'baseline') {
        setBaselineImage(previewUrl);
      } else {
        setThermalImage(previewUrl);
      }

      setUploadProgress(100);
      toast({
        title: 'Upload Complete',
        description: `${type === 'baseline' ? 'Baseline' : 'Thermal'} image uploaded successfully (status: In-progress).`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Upload failed',
        description: err?.message || 'Unable to upload image',
        variant: 'destructive',
      });
    } finally {
      // finish the progress UI shortly after
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadLabel('');
      }, 500);
    }
  };

  const handleUpload = (type: 'baseline' | 'thermal') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(file, type);
      }
      // Clean up
      document.body.removeChild(input);
    };
    
    input.oncancel = () => {
      // Clean up if user cancels
      document.body.removeChild(input);
    };
    
    // Add to DOM, click, and let the event handlers handle cleanup
    document.body.appendChild(input);
    input.click();
  };

  const handleDeleteImage = async (type: 'baseline' | 'thermal') => {
    try {
      const targetUrl = type === 'baseline'
        ? API_ENDPOINTS.IMAGE_BASELINE(encodeURIComponent(inspection.transformerNo ?? '-'))
        : API_ENDPOINTS.IMAGE_THERMAL(encodeURIComponent(inspection.id ?? '-'));

      if (!window.confirm(`Delete ${type} image? This cannot be undone.`)) return;

      const res = await fetch(targetUrl, { method: 'DELETE' });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

      if (type === 'baseline') {
        setBaselineImage(null);
      } else {
        setThermalImage(null);
      }

      toast({ title: 'Deleted', description: `${type === 'baseline' ? 'Baseline' : 'Thermal'} image deleted successfully.` });
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Delete failed', description: err?.message || 'Unable to delete image', variant: 'destructive' });
    }
  };

  // Function to check thermal status and update inspection
  const checkThermalStatus = async () => {
    const inspNo = id;
    if (!inspNo) return null;

    try {
      const res = await fetch(API_ENDPOINTS.IMAGE_THERMAL(encodeURIComponent(inspNo)));
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      
      const raw: ApiEnvelope<any> = await res.json();
      const data: any = (raw as any)?.responseData ?? raw;
      
      if (data?.status) {
        console.log('Status check - thermal API status:', data.status);
        setInspection(prev => ({
          ...prev,
          status: data.status as any,
        }));
        
        // If status is completed, fetch analysis result
        if (data.status === 'Completed' || data.status === 'completed') {
          fetchAnalysisResult();
          return 'completed';
        }
        
        return data.status;
      }
    } catch (err: any) {
      console.error('Failed to check thermal status:', err);
    }
    
    return null;
  };

  const fetchAnalysisResult = async (): Promise<boolean> => {
    if (!inspection.id) return false;
    
    try {
      const res = await fetch(API_ENDPOINTS.ANALYSIS_RESULT(inspection.id));
      if (!res.ok) {
        // If 404, analysis not ready yet
        if (res.status === 404) {
          console.log('Analysis result not yet available (404)');
          return false;
        }
        throw new Error(`${res.status} ${res.statusText}`);
      }
      
      const ct = res.headers.get('content-type') || '';
      
      if (ct.startsWith('image/')) {
        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);
        setAnalysisResult(objUrl);
        console.log('Analysis result image loaded successfully');
        
        // Update inspection status to completed when we get the result
        setInspection(prev => ({
          ...prev,
          status: 'completed'
        }));
        
        return true;
      }
      
      // Try JSON response
      try {
        const raw: ApiEnvelope<any> = await res.json();
        const data: any = (raw as any)?.responseData ?? raw;
        
        // Handle the new API response format with annotatedImageData
        const annotatedImageData = data?.annotatedImageData;
        if (annotatedImageData) {
          // If it's base64 data without data URL prefix, add it
          let imageUrl = annotatedImageData;
          if (!imageUrl.startsWith('data:')) {
            imageUrl = `data:image/png;base64,${annotatedImageData}`;
          }
          setAnalysisResult(imageUrl);
          
          // Store the analysis data for display
          setAnalysisData(data);
          console.log('Analysis data loaded:', data); // Debug log
          
          // Update inspection status to completed when we get the result
          setInspection(prev => ({
            ...prev,
            status: 'completed'
          }));
          
          return true;
        }
        
        // Fallback to other possible fields
        const possible = data?.imageBase64 || data?.url || data?.imageUrl || data?.resultImage;
        if (typeof possible === 'string') {
          let finalUrl = possible;
          if (!/^https?:\/\//i.test(possible) && !possible.startsWith('data:')) {
            try { finalUrl = new URL(possible, window.location.origin).toString(); } catch {}
          }
          setAnalysisResult(finalUrl);
          
          // Update inspection status to completed when we get the result
          setInspection(prev => ({
            ...prev,
            status: 'completed'
          }));
          
          console.log('Analysis result loaded from JSON');
          return true;
        }
      } catch (_) {
        // Non-JSON response that isn't an image
      }
      
      return false;
    } catch (err: any) {
      console.error('Failed to fetch analysis result:', err);
      setAnalysisResult(null);
      return false;
    }
  };

  // Annotation zoom controls
  const handleZoomIn = () => {
    setAnnotationZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setAnnotationZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setAnnotationZoom(1);
    setAnnotationPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (annotationZoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - annotationPosition.x,
        y: e.clientY - annotationPosition.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && annotationZoom > 1) {
      setAnnotationPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleAnalyze = async () => {
    if (!inspection.id) {
      toast({
        title: 'Error',
        description: 'Inspection ID not available',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalyzeError(null);

    try {
      const res = await fetch(API_ENDPOINTS.ANALYSIS_ANALYZE(inspection.id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = `${res.status} ${res.statusText}`;
        
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.responseDescription || errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const result = await res.json();
      const data = result?.responseData ?? result;

      toast({
        title: 'Analysis Started',
        description: 'Image analysis has been initiated. Checking for results...',
      });

      // Update status to in-progress
      setInspection(prev => ({
        ...prev,
        status: 'in-progress'
      }));

      // Start polling for status updates and analysis results
      setStatusPolling(true);

      // Try to fetch analysis result after a short delay
      setTimeout(async () => {
        const hasResult = await fetchAnalysisResult();
        if (hasResult) {
          toast({
            title: 'Analysis Complete',
            description: 'Analysis results are now available.',
          });
        }
      }, 3000);

    } catch (err: any) {
      console.error('Analysis error:', err);
      const errorMsg = err?.message || 'Failed to start analysis';
      setAnalyzeError(errorMsg);
      
      toast({
        title: 'Analysis Failed',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Annotation caching functions
  const CACHE_KEY_PREFIX = 'inspection_annotations_';
  
  const saveAnnotationsToCache = (annotations: BoundingBox[]) => {
    if (!id) return;
    const cacheKey = `${CACHE_KEY_PREFIX}${id}`;
    try {
      localStorage.setItem(cacheKey, JSON.stringify(annotations));
      console.log('Annotations saved to cache:', annotations);
    } catch (error) {
      console.error('Failed to save annotations to cache:', error);
    }
  };

  const loadAnnotationsFromCache = () => {
    if (!id) return [];
    const cacheKey = `${CACHE_KEY_PREFIX}${id}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const annotations = JSON.parse(cached) as BoundingBox[];
        console.log('Annotations loaded from cache:', annotations);
        return annotations;
      }
    } catch (error) {
      console.error('Failed to load annotations from cache:', error);
    }
    return [];
  };

  const clearAnnotationsCache = () => {
    if (!id) return;
    const cacheKey = `${CACHE_KEY_PREFIX}${id}`;
    try {
      localStorage.removeItem(cacheKey);
      setCachedAnnotations([]);
      console.log('Annotations cache cleared');
    } catch (error) {
      console.error('Failed to clear annotations cache:', error);
    }
  };

  // Chat handler
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = {
      id: `msg-${Date.now()}`,
      role: 'user' as const,
      content: chatInput.trim(),
      timestamp: new Date()
    };
    
    setChatMessages(prev => [userMessage, ...prev]); // Newest on top
    setChatInput('');
    setIsChatLoading(true);
    
    try {
      // TODO: Replace with actual RAG backend API call
      // For now, create a mock response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const assistantMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant' as const,
        content: `I'm Arbit AI Assistant. I can help you analyze thermal images and annotations. (RAG integration pending)`,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [assistantMessage, ...prev]); // Newest on top
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Chat Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  // Load cached annotations on component mount
  useEffect(() => {
    const cached = loadAnnotationsFromCache();
    if (cached.length > 0) {
      setCachedAnnotations(cached);
    }
  }, [id]);

  // Listen for annotation updates from the modal
  useEffect(() => {
    const handleAnnotationsUpdate = (event: CustomEvent<BoundingBox[]>) => {
      const annotations = event.detail;
      setCachedAnnotations(annotations);
      saveAnnotationsToCache(annotations);
    };

    window.addEventListener('annotationsUpdated' as any, handleAnnotationsUpdate as any);
    return () => {
      window.removeEventListener('annotationsUpdated' as any, handleAnnotationsUpdate as any);
    };
  }, [id]);

  const openAnalysisModal = () => {
    // Always try to fetch analysis result when opening modal
    fetchAnalysisResult();
    setShowAnalysisModal(true);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold">I</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Inspection #{inspection.id}</h1>
              <p className="text-muted-foreground">
                Last updated: {inspection.lastUpdated}
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <StatusBadge status={inspection.status as any} />
            {(inspection.status === 'in-progress' || inspection.status === 'In progress' || inspection.status === 'In Progress') && (
              <Button 
                onClick={() => {
                  console.log('Manual status sync started');
                  setStatusPolling(true);
                }}
                disabled={statusPolling}
                variant="outline"
                size="sm"
              >
                {statusPolling ? 'Syncing...' : 'Sync Status'}
              </Button>
            )}
            <Button 
              onClick={openAnalysisModal}
              disabled={inspection.status !== 'Completed' && inspection.status !== 'completed'}
              variant={inspection.status === 'Completed' || inspection.status === 'completed' ? 'default' : 'secondary'}
            >
              <Search className="h-4 w-4 mr-2" />
              View Analysis
            </Button>
            <Button onClick={() => handleUpload('baseline')}>
              <Upload className="h-4 w-4 mr-2" />
              Baseline Image
            </Button>
          </div>
        </div>

        {/* Error Alert for Analysis */}
        {analyzeError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-destructive flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-destructive mb-1">Analysis Error</h4>
                <p className="text-sm text-destructive/90">{analyzeError}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => setAnalyzeError(null)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Info when both images are available but not analyzed */}
        {thermalImage && baselineImage && !analyzeError && (inspection.status !== 'Completed' && inspection.status !== 'completed') && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">i</span>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-blue-900 mb-1">Ready for Analysis</h4>
                <p className="text-sm text-blue-800">
                  Both thermal and baseline images are uploaded. Click "Analyze Images" to start the AI analysis and detect anomalies.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-sm text-muted-foreground">Transformer No</div>
              <div className="font-semibold">{inspection.transformerNo}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-sm text-muted-foreground">Pole No</div>
              <div className="font-semibold">EN-122-A</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-sm text-muted-foreground">Batch</div>
              <div className="font-semibold">{inspection.branch}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-sm text-muted-foreground">Inspected By</div>
              <div className="font-semibold">A-110</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side - Details and Thermal Upload */}
          <div className="lg:col-span-2 space-y-6">
            {/* Thermal Image Comparison */}
            <div className="w-full">
                {/* Thermal Image Upload/Comparison */}
                {(baselineImage && thermalImage) ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Thermal Image Comparison</span>
                    <div className="flex gap-2">
                      {/* Analyze Button - Show when not yet completed */}
                      {(inspection.status !== 'Completed' && inspection.status !== 'completed') && (
                        <Button 
                          onClick={handleAnalyze}
                          disabled={isAnalyzing}
                          size="sm"
                        >
                          {isAnalyzing ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <ZoomIn className="h-4 w-4 mr-2" />
                              Analyze Images
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Current Thermal Image */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">Current</h3>
                          {thermalImage && <Badge variant="destructive">Anomaly Detected</Badge>}
                        </div>
                        {thermalImage && (
                          <div className="flex gap-2">
                            <Button variant="outline" size="icon" onClick={() => openInNewTab(thermalImage)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => handleDeleteImage('thermal')}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="bg-primary/5 rounded-lg border-2 border-dashed border-primary/20 flex items-center justify-center min-h-[300px] p-4">
                        {thermalImage ? (
                          <img 
                            src={thermalImage} 
                            alt="Current thermal image" 
                            className="max-w-full max-h-[500px] object-contain rounded-lg"
                          />
                        ) : (
                          <div className="text-center text-muted-foreground">
                            <div className="text-sm">No thermal image uploaded</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Analysis Result Image */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">Analysis Result</h3>
                          {analysisResult && <Badge variant="secondary">Processed</Badge>}
                        </div>
                        {analysisResult && (
                          <div className="flex gap-2">
                            <Button variant="outline" size="icon" onClick={() => openInNewTab(analysisResult)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="bg-violet-50 rounded-lg border-2 border-dashed border-violet-200 flex items-center justify-center min-h-[300px] p-4 relative">
                        {analysisResult ? (
                          <div className="relative inline-block">
                            <img 
                              src={analysisResult} 
                              alt="Analysis result image" 
                              className="max-w-full max-h-[500px] object-contain rounded-lg"
                            />
                            {/* Render cached bounding boxes */}
                            {cachedAnnotations.filter(box => box.imageType === 'result').map(box => {
                              const left = Math.min(box.startX, box.endX);
                              const top = Math.min(box.startY, box.endY);
                              const width = Math.abs(box.endX - box.startX);
                              const height = Math.abs(box.endY - box.startY);
                              
                              return (
                                <div
                                  key={box.id}
                                  className={`absolute border-2 pointer-events-none ${
                                    box.anomalyState === 'Faulty' ? 'border-red-500' :
                                    box.anomalyState === 'Potentially Faulty' ? 'border-orange-500' :
                                    'border-green-500'
                                  }`}
                                  style={{
                                    left: `${left}%`,
                                    top: `${top}%`,
                                    width: `${width}%`,
                                    height: `${height}%`,
                                    backgroundColor: box.anomalyState === 'Faulty' ? 'rgba(255, 0, 0, 0.1)' :
                                      box.anomalyState === 'Potentially Faulty' ? 'rgba(255, 165, 0, 0.1)' :
                                      'rgba(0, 255, 0, 0.1)'
                                  }}
                                >
                                  <div className="absolute -top-6 left-0 bg-black/70 text-white px-2 py-0.5 rounded text-xs whitespace-nowrap">
                                    {box.anomalyState} ({box.confidenceScore}%)
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center text-muted-foreground">
                            {(inspection.status === 'Completed' || inspection.status === 'completed') ? (
                              <>
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                                <div className="text-sm">Loading analysis result...</div>
                              </>
                            ) : (
                              <div className="text-sm">Analysis pending</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Anomaly Annotation Tool Button - Centered below images */}
                  {(inspection.status === 'Completed' || inspection.status === 'completed') && analysisResult && (
                    <div className="flex justify-center mt-6">
                      <Button 
                        onClick={openAnalysisModal}
                        size="lg"
                        className="w-full max-w-md"
                      >
                        <Search className="h-5 w-5 mr-2" />
                        Anomaly Annotation Tool
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Upload Section */
              <Card>
                <CardHeader>
                  <CardTitle>Thermal Image</CardTitle>
                </CardHeader>
                <CardContent>
                  {isUploading ? (
                    <div className="text-center py-12">
                      <h3 className="text-lg font-medium mb-2">{uploadLabel || 'Uploading image…'}</h3>
                      <p className="text-muted-foreground mb-4">
                        Sending file to server with status "In-progress".
                      </p>
                      <Progress value={uploadProgress} className="w-full max-w-md mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">{uploadProgress}%</p>
                      <Button variant="outline" className="mt-4">
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="mb-4">
                        <p className="text-sm text-muted-foreground mb-4">
                          Upload a thermal image of the transformer to identify potential issues.
                        </p>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-2">Weather Condition</label>
                            <Select value={thermalWeatherCondition} onValueChange={setThermalWeatherCondition}>
                              <SelectTrigger className="w-full max-w-xs mx-auto">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Sunny">Sunny</SelectItem>
                                <SelectItem value="Cloudy">Cloudy</SelectItem>
                                <SelectItem value="Rainy">Rainy</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button 
                            onClick={() => handleUpload('thermal')}
                            className="w-full max-w-xs"
                          >
                            Upload thermal image
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
              
            {/* Analysis Summary and Arbit AI Assistant - Only show when analysis is completed */}
            {(inspection.status === 'Completed' || inspection.status === 'completed') && analysisResult && (
              <>
                {/* Analysis Summary - Fixed height with scroll */}
                {analysisData && (
                  <Card className="mt-6">
                    <CardHeader>
                      <CardTitle>Analysis Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Fixed height scrollable container */}
                      <div className="max-h-[320px] overflow-y-auto">
                        <div className="bg-gray-50 p-4 rounded-lg border">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Status:</span>
                              <div className="font-medium text-green-600">{analysisData.analysisStatus}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Date:</span>
                              <div className="font-medium">{new Date(analysisData.analysisDate).toLocaleDateString()}</div>
                            </div>
                            <div>
                              <span className="text-gray-600">Processing Time:</span>
                              <div className="font-medium">{analysisData.processingTimeMs}ms</div>
                            </div>
                            {analysisData.analysisResultJson && (() => {
                              try {
                                const resultJson = JSON.parse(analysisData.analysisResultJson);
                                return (
                                  <div>
                                    <span className="text-gray-600">Anomalies:</span>
                                    <div className="font-medium text-red-600">
                                      {resultJson.summary?.total_anomalies || 0} found
                                    </div>
                                  </div>
                                );
                              } catch {
                                return null;
                              }
                            })()}
                          </div>
                          
                          {/* Anomaly Details */}
                          {analysisData.analysisResultJson && (() => {
                            try {
                              const resultJson = JSON.parse(analysisData.analysisResultJson);
                              if (resultJson.anomalies && resultJson.anomalies.length > 0) {
                                return (
                                  <div className="mt-4">
                                    <h4 className="font-medium mb-2">Detected Anomalies:</h4>
                                    <div className="space-y-2">
                                      {resultJson.anomalies.map((anomaly: any, index: number) => (
                                        <div key={index} className="bg-white p-3 rounded border-l-4 border-red-500">
                                          <div className="flex justify-between items-start">
                                            <div>
                                              <span className="font-medium text-red-600">
                                                {anomaly.severity_level} Severity
                                              </span>
                                              <p className="text-sm text-gray-600 mt-1">{anomaly.reasoning}</p>
                                            </div>
                                            <div className="text-right text-sm">
                                              <div>Confidence: {(anomaly.confidence * 100).toFixed(1)}%</div>
                                              <div>Area: {anomaly.area?.toLocaleString()}</div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              }
                            } catch {
                              return null;
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Arbit AI Assistant Chat */}
                <Card className="mt-6">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Bot className="h-5 w-5 text-primary" />
                      <CardTitle>Arbit AI Assistant</CardTitle>
                      <Badge variant="secondary" className="text-xs">Beta</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Chat Messages - Reverse order (newest on top) - Fixed height with scroll */}
                    <div className="border rounded-lg bg-gray-50 h-[280px] overflow-y-auto flex flex-col-reverse p-4 space-y-reverse space-y-3 mb-3">
                      {chatMessages.length === 0 ? (
                        <div className="text-center text-muted-foreground text-sm py-8">
                          <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>Ask me about thermal images, anomalies, or annotations!</p>
                        </div>
                      ) : (
                        chatMessages.map((msg) => (
                          <div 
                            key={msg.id}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div 
                              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                                msg.role === 'user' 
                                  ? 'bg-primary text-primary-foreground' 
                                  : 'bg-white border'
                              }`}
                            >
                              <p className="text-sm">{msg.content}</p>
                              <span className="text-xs opacity-70 mt-1 block">
                                {msg.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    {/* Chat Input */}
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Ask about images, annotations, or anomalies..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        disabled={isChatLoading}
                        className="flex-1"
                      />
                      <Button 
                        onClick={handleSendMessage}
                        disabled={isChatLoading || !chatInput.trim()}
                        size="icon"
                      >
                        {isChatLoading ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-2">
                      💡 The AI can analyze your annotations and provide insights about thermal anomalies
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
            </div>
          </div>

          {/* Right Side - Progress and Baseline Upload */}
          <div className="space-y-6">
            {/* Baseline Image Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Baseline Image</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-primary/5 rounded-lg border-2 border-dashed border-primary/20 flex items-center justify-center min-h-[300px] p-4">
                    {baselineImage ? (
                      <img 
                        src={baselineImage} 
                        alt="Baseline thermal image" 
                        className="max-w-full max-h-[500px] object-contain rounded-lg"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <Upload className="h-8 w-8 mx-auto mb-2" />
                        <div className="text-sm">No baseline image</div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div>
                      <label className="block text-sm font-medium mb-1">Weather Condition</label>
                      <Select value={baselineWeatherCondition} onValueChange={setBaselineWeatherCondition}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select weather" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sunny">Sunny</SelectItem>
                          <SelectItem value="Cloudy">Cloudy</SelectItem>
                          <SelectItem value="Rainy">Rainy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={() => handleUpload('baseline')} className="w-full">
                      <Upload className="h-4 w-4 mr-2" />
                      {baselineImage ? 'Replace Baseline' : 'Upload Baseline'}
                    </Button>
                    {baselineImage && (
                      <Button variant="destructive" onClick={() => handleDeleteImage('baseline')} className="w-full">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Baseline
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {progressSteps.map((step, index) => {
                    const getIconAndColor = (status: string) => {
                      switch (status) {
                        case "completed":
                          return { 
                            icon: "✓", 
                            bgColor: "bg-green-500", 
                            textColor: "text-white" 
                          };
                        case "in-progress":
                          return { 
                            icon: "↻", 
                            bgColor: "bg-blue-500", 
                            textColor: "text-white" 
                          };
                        case "ready":
                          return { 
                            icon: "✓", 
                            bgColor: "bg-green-100", 
                            textColor: "text-green-700" 
                          };
                        case "waiting":
                          return { 
                            icon: "⋯", 
                            bgColor: "bg-yellow-500", 
                            textColor: "text-white" 
                          };
                        case "not-ready":
                        default:
                          return { 
                            icon: "○", 
                            bgColor: "bg-gray-300", 
                            textColor: "text-gray-600" 
                          };
                      }
                    };

                    const { icon, bgColor, textColor } = getIconAndColor(step.status);
                    
                    const getStatusLabel = (status: string) => {
                      switch (status) {
                        case "completed": return "Completed";
                        case "in-progress": return "In Progress";
                        case "ready": return "Ready";
                        case "waiting": return "Waiting";
                        case "not-ready": return "Not Ready";
                        default: return "Pending";
                      }
                    };

                    return (
                      <div key={index} className="flex items-center gap-3">
                        <div className={`w-8 h-8 ${bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                          <span className={`text-sm font-medium ${textColor}`}>{icon}</span>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{step.title}</div>
                          <div className="text-xs text-muted-foreground mt-1">{getStatusLabel(step.status)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Analysis Results Modal */}
      <AnalysisModal 
        isOpen={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        thermalImage={thermalImage}
        analysisResult={analysisResult}
        inspection={inspection}
        analysisData={analysisData}
        initialAnnotations={cachedAnnotations}
      />
    </Layout>
  );
}