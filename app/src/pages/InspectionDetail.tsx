import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, Upload, Eye, Trash2, Search, ZoomIn, MoreHorizontal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const INSPECTION_DETAIL_URL = (id: string) => `http://localhost:5509/transformer-thermal-inspection/inspection-management/view/${id}`;
const IMAGE_UPLOAD_URL = `http://localhost:5509/transformer-thermal-inspection/image-inspection-management/upload`;
const BASELINE_FETCH_URL = (transformerNo: string) => `http://localhost:5509/transformer-thermal-inspection/image-inspection-management/baseline/${transformerNo}`;

const THERMAL_FETCH_URL = (inspectionNo: string) => `http://localhost:5509/transformer-thermal-inspection/image-inspection-management/thermal/${inspectionNo}`;

// Analysis API endpoints
const ANALYSIS_RESULT_URL = (inspectionNo: string) => `http://localhost:5509/transformer-thermal-inspection/image-analysis/result/${inspectionNo}`;
const ANALYZE_URL = (inspectionNo: string) => `http://localhost:5509/transformer-thermal-inspection/image-analysis/analyze/${inspectionNo}`;

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

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  thermalImage: string | null;
  analysisResult: string | null;
  inspection: InspectionView;
  analysisData: any;
}

function AnalysisModal({ 
  isOpen, 
  onClose, 
  thermalImage, 
  analysisResult, 
  inspection,
  analysisData
}: AnalysisModalProps) {
  const [comparisonPosition, setComparisonPosition] = useState(50);
  const [hoveredImage, setHoveredImage] = useState<'thermal' | 'result' | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 600, height: 500 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [viewMode, setViewMode] = useState<'side-by-side' | 'slider'>('side-by-side');
  const [isDragging, setIsDragging] = useState(false);

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
                      className="relative bg-gray-100 rounded-lg overflow-hidden group cursor-crosshair border-2 border-gray-200 hover:border-blue-400 transition-colors flex items-center justify-center min-h-[300px]"
                      onMouseMove={handleMouseMove}
                      onMouseEnter={() => setHoveredImage('thermal')}
                      onMouseLeave={() => setHoveredImage(null)}
                    >
                      <img 
                        src={thermalImage} 
                        alt="Thermal image" 
                        className="max-w-full max-h-[500px] object-contain rounded"
                      />
                      {hoveredImage === 'thermal' && imageSize.width > 0 && (
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
                      className="relative bg-gray-100 rounded-lg overflow-hidden group cursor-crosshair border-2 border-gray-200 hover:border-green-400 transition-colors flex items-center justify-center min-h-[300px]"
                      onMouseMove={handleMouseMove}
                      onMouseEnter={() => setHoveredImage('result')}
                      onMouseLeave={() => setHoveredImage(null)}
                    >
                      <img 
                        src={analysisResult} 
                        alt="Analysis result" 
                        className="max-w-full max-h-[500px] object-contain rounded"
                      />
                      {hoveredImage === 'result' && imageSize.width > 0 && (
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
        const res = await fetch(INSPECTION_DETAIL_URL(id));
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

    const url = BASELINE_FETCH_URL(encodeURIComponent(tfNo));

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

    const url = THERMAL_FETCH_URL(encodeURIComponent(inspNo));

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

      const res = await fetch(IMAGE_UPLOAD_URL, {
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
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(file, type);
      }
    };
    input.click();
  };

  const handleDeleteImage = async (type: 'baseline' | 'thermal') => {
    try {
      const targetUrl = type === 'baseline'
        ? BASELINE_FETCH_URL(encodeURIComponent(inspection.transformerNo ?? '-'))
        : THERMAL_FETCH_URL(encodeURIComponent(inspection.id ?? '-'));

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
      const res = await fetch(THERMAL_FETCH_URL(encodeURIComponent(inspNo)));
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
      const res = await fetch(ANALYSIS_RESULT_URL(inspection.id));
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
      const res = await fetch(ANALYZE_URL(inspection.id), {
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
            {/* Tabs for Thermal Comparison and Annotation Tools */}
            <Tabs defaultValue="comparison" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="comparison">Thermal Image Comparison</TabsTrigger>
                <TabsTrigger value="annotation">Annotation Tools</TabsTrigger>
              </TabsList>

              <TabsContent value="comparison" className="mt-6">
                {/* Thermal Image Upload/Comparison */}
                {(baselineImage && thermalImage) ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Thermal Image Comparison</span>
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
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Current Image */}
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

                    {/* Baseline Image */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Baseline</h3>
                        {baselineImage && (
                          <div className="flex gap-2">
                            <Button variant="outline" size="icon" onClick={() => openInNewTab(baselineImage)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => handleDeleteImage('baseline')}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="bg-primary/5 rounded-lg border-2 border-dashed border-primary/20 flex items-center justify-center min-h-[300px] p-4">
                        {baselineImage ? (
                          <img 
                            src={baselineImage} 
                            alt="Baseline thermal image" 
                            className="max-w-full max-h-[500px] object-contain rounded-lg"
                          />
                        ) : (
                          <div className="text-center text-muted-foreground">
                            <div className="text-sm">No baseline image</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
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
              </TabsContent>

              <TabsContent value="annotation" className="mt-6">
                {/* Annotation Tools */}
                <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Annotation Tools
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                      </svg>
                    </Button>
                    <Button variant="outline" size="icon">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      </svg>
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(inspection.status === 'Completed' || inspection.status === 'completed') && analysisResult ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium flex items-center gap-2">
                          <svg className="h-4 w-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M9 12l2 2 4-4"/>
                            <circle cx="12" cy="12" r="10"/>
                          </svg>
                          Analysis Result Image
                        </h4>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={handleZoomIn}>
                            <ZoomIn className="h-4 w-4 mr-1" />
                            Zoom In
                          </Button>
                          <Button variant="outline" size="sm" onClick={handleZoomOut}>
                            <ZoomIn className="h-4 w-4 mr-1 rotate-180" />
                            Zoom Out
                          </Button>
                          <Button variant="outline" size="sm" onClick={handleResetZoom}>
                            <svg className="h-4 w-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                              <path d="M21 3v5h-5"/>
                              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                              <path d="M3 21v-5h5"/>
                            </svg>
                            Reset
                          </Button>
                        </div>
                      </div>
                      <div 
                        className="bg-green-50 rounded-lg border-2 border-green-200 overflow-hidden min-h-[400px] relative"
                        style={{ cursor: annotationZoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                      >
                        <div 
                          className="flex items-center justify-center p-4"
                          style={{
                            transform: `translate(${annotationPosition.x}px, ${annotationPosition.y}px) scale(${annotationZoom})`,
                            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                          }}
                        >
                          <img 
                            src={analysisResult} 
                            alt="Analysis result with annotations" 
                            className="max-w-full max-h-[400px] object-contain rounded-lg select-none"
                            draggable={false}
                          />
                        </div>
                      </div>
                      {annotationZoom > 1 && (
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          Drag the image to pan • Zoom: {(annotationZoom * 100).toFixed(0)}%
                        </p>
                      )}
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" size="sm" onClick={() => openInNewTab(analysisResult)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Full Size
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={openAnalysisModal}
                        >
                          <Search className="h-4 w-4 mr-2" />
                          Compare Images
                        </Button>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <p className="text-sm text-muted-foreground">
                        The analysis result image shows detected anomalies and annotations. 
                        Use the annotation tools above to add your own notes and markings.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <svg className="h-12 w-12 mx-auto mb-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M14.828 14.828a4 4 0 0 1-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
                    </svg>
                    <div className="text-sm">
                      {inspection.status === 'Completed' || inspection.status === 'completed' 
                        ? (!analysisResult 
                            ? 'Loading analysis result image...' 
                            : 'Analysis result image will appear here'
                          )
                        : 'Annotation tools will be available when analysis is completed'
                      }
                    </div>
                    {(inspection.status === 'Completed' || inspection.status === 'completed') && !analysisResult && (
                      <div className="mt-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto"></div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
              </TabsContent>
            </Tabs>
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
      />
    </Layout>
  );
}