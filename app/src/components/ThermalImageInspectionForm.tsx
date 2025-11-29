import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { api, API_ENDPOINTS } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Printer, Save, History, RotateCcw, Clock, Eye, ArrowLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ThermalImageInspectionFormProps {
  inspectionId: string;
  transformerNo: string;
  inspectionDate?: string;
  analysisImageUrl?: string; // The image with bounding boxes
  thermalImageUrl?: string;
  anomalies?: any[];
  onClose?: () => void;
}

interface ThermalInspectionReport {
  id?: number;
  inspectionId: number;
  transformerNo: string;
  reportData?: string;
  version?: number;
  isCurrent?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

interface ThermalReportData {
  // Header Info
  inspectionDate: string;
  inspectionTime: string;
  weatherCondition: string;
  ambientTemp: string;
  humidity: string;
  
  // Equipment Info
  equipmentType: string;
  equipmentId: string;
  manufacturer: string;
  ratedCapacity: string;
  voltage: string;
  installationDate: string;
  
  // Thermal Analysis
  maxTemp: string;
  minTemp: string;
  avgTemp: string;
  hotspotLocation: string;
  tempRise: string;
  referenceTemp: string;
  
  // Severity Classification
  severity: "Normal" | "Attention" | "Intermediate" | "Serious" | "Critical";
  severityDescription: string;
  
  // Inspection Details
  inspectorName: string;
  inspectorId: string;
  cameraModel: string;
  cameraSerial: string;
  emissivity: string;
  distance: string;
  
  // Findings
  findings: string;
  anomaliesDetected: string;
  
  // Recommendations
  recommendation: string;
  priorityLevel: "Low" | "Medium" | "High" | "Urgent";
  nextInspectionDate: string;
  
  // Sign-off
  reviewedBy: string;
  reviewedDate: string;
  approvedBy: string;
  approvedDate: string;
  
  // Checklist
  checklist: {
    [key: string]: boolean;
  };
}

const defaultReportData: ThermalReportData = {
  inspectionDate: new Date().toISOString().split('T')[0],
  inspectionTime: "",
  weatherCondition: "",
  ambientTemp: "",
  humidity: "",
  
  equipmentType: "Distribution Transformer",
  equipmentId: "",
  manufacturer: "",
  ratedCapacity: "",
  voltage: "",
  installationDate: "",
  
  maxTemp: "",
  minTemp: "",
  avgTemp: "",
  hotspotLocation: "",
  tempRise: "",
  referenceTemp: "",
  
  severity: "Normal",
  severityDescription: "",
  
  inspectorName: "",
  inspectorId: "",
  cameraModel: "",
  cameraSerial: "",
  emissivity: "0.95",
  distance: "",
  
  findings: "",
  anomaliesDetected: "",
  
  recommendation: "",
  priorityLevel: "Medium",
  nextInspectionDate: "",
  
  reviewedBy: "",
  reviewedDate: "",
  approvedBy: "",
  approvedDate: "",
  
  checklist: {
    "Visual inspection completed": false,
    "Thermal scan completed": false,
    "Load conditions verified": false,
    "Environmental factors recorded": false,
    "Reference temperature measured": false,
    "Hot spots identified": false,
    "Temperature rise calculated": false,
    "Severity classification done": false,
    "Photos captured": false,
    "Previous records reviewed": false,
    "Safety protocols followed": false,
    "Report generated": false,
  },
};

export function ThermalImageInspectionForm({
  inspectionId,
  transformerNo,
  inspectionDate,
  analysisImageUrl,
  thermalImageUrl,
  anomalies = [],
  onClose,
}: ThermalImageInspectionFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("analysis");
  const [record, setRecord] = useState<ThermalInspectionReport>({
    inspectionId: parseInt(inspectionId),
    transformerNo,
  });
  const [reportData, setReportData] = useState<ThermalReportData>(defaultReportData);
  
  // History management
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<ThermalInspectionReport[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<ThermalInspectionReport | null>(null);
  const [previewReportData, setPreviewReportData] = useState<ThermalReportData | null>(null);

  useEffect(() => {
    fetchRecord();
  }, [inspectionId]);

  useEffect(() => {
    // Auto-fill anomalies data
    if (anomalies && anomalies.length > 0) {
      const anomalyText = anomalies
        .map((a: any, i: number) => 
          `${i + 1}. ${a.riskType || a.anomalyState || 'Unknown'} - ${a.description || 'No description'} (Confidence: ${a.confidenceScore || 0}%)`
        )
        .join('\n');
      
      // Find hottest spot
      const maxConfidence = Math.max(...anomalies.map((a: any) => a.confidenceScore || 0));
      const hottest = anomalies.find((a: any) => a.confidenceScore === maxConfidence);
      
      setReportData(prev => ({
        ...prev,
        anomaliesDetected: anomalyText,
        findings: `Thermal inspection detected ${anomalies.length} anomalies:\n${anomalyText}`,
        hotspotLocation: hottest ? `Box at (${Math.round(hottest.startX || 0)}, ${Math.round(hottest.startY || 0)})` : prev.hotspotLocation,
        severity: determineSeverity(anomalies),
      }));
    }
  }, [anomalies]);

  const determineSeverity = (anomalies: any[]): ThermalReportData['severity'] => {
    const hasSerious = anomalies.some((a: any) => 
      a.anomalyState === 'Faulty' || 
      a.riskType === 'Transformer overload' ||
      (a.confidenceScore && a.confidenceScore > 80)
    );
    const hasPotential = anomalies.some((a: any) => 
      a.anomalyState === 'Potentially Faulty' ||
      (a.confidenceScore && a.confidenceScore > 50)
    );
    
    if (hasSerious) return "Critical";
    if (hasPotential) return "Intermediate";
    if (anomalies.length > 0) return "Attention";
    return "Normal";
  };

  const fetchRecord = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.THERMAL_INSPECTION_GET(inspectionId));
      const data = response.data?.responseData || response.data;
      if (data) {
        setRecord(data);
        if (data.reportData) {
          try {
            setReportData(JSON.parse(data.reportData));
          } catch (e) {
            console.error("Failed to parse report data:", e);
          }
        }
      }
    } catch (error) {
      // Record doesn't exist yet, use defaults
      setReportData(prev => ({
        ...prev,
        equipmentId: transformerNo,
        inspectionDate: inspectionDate || new Date().toISOString().split('T')[0],
      }));
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.THERMAL_INSPECTION_HISTORY(inspectionId));
      const data = response.data?.responseData || response.data || [];
      setHistory(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch history",
        variant: "destructive",
      });
    }
  };

  const handlePreviewVersion = (item: ThermalInspectionReport) => {
    setPreviewRecord(item);
    if (item.reportData) {
      try {
        setPreviewReportData(JSON.parse(item.reportData));
      } catch (e) {
        setPreviewReportData(null);
      }
    } else {
      setPreviewReportData(null);
    }
    setShowPreview(true);
  };

  const restoreVersion = async (version: number) => {
    try {
      setLoading(true);
      await api.post(API_ENDPOINTS.THERMAL_INSPECTION_RESTORE(inspectionId, version));
      toast({
        title: "Success",
        description: `Version ${version} restored successfully`,
      });
      await fetchRecord();
      await fetchHistory();
      setShowHistory(false);
      setShowPreview(false);
      setPreviewRecord(null);
      setPreviewReportData(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to restore version",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post(API_ENDPOINTS.THERMAL_INSPECTION_SAVE, {
        ...record,
        inspectionId: parseInt(inspectionId),
        transformerNo,
        reportData: JSON.stringify(reportData),
      });
      toast({
        title: "Success",
        description: "Thermal inspection report saved successfully",
      });
      fetchRecord();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save thermal inspection report",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Please allow popups to print",
        variant: "destructive",
      });
      return;
    }

    const severityColors: Record<string, string> = {
      Normal: '#22c55e',
      Attention: '#eab308',
      Intermediate: '#f97316',
      Serious: '#ef4444',
      Critical: '#dc2626',
    };

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Thermal Image Inspection Form - ${transformerNo}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            padding: 15px; 
            color: #000;
            background: #fff;
            font-size: 11px;
          }
          .header { 
            text-align: center; 
            margin-bottom: 15px; 
            padding-bottom: 10px;
            border-bottom: 2px solid #000;
          }
          .header h1 { font-size: 16px; margin-bottom: 5px; text-transform: uppercase; }
          .header p { font-size: 11px; color: #666; }
          
          .analysis-image { 
            width: 100%; 
            max-height: 250px; 
            object-fit: contain; 
            border: 2px solid #333;
            margin-bottom: 15px;
            display: block;
          }
          
          .severity-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            color: white;
            font-weight: bold;
            font-size: 12px;
            margin-bottom: 10px;
          }
          
          .section { 
            margin-bottom: 12px; 
            page-break-inside: avoid;
          }
          .section-title { 
            font-size: 12px; 
            font-weight: bold; 
            margin-bottom: 6px; 
            background: #f0f0f0;
            padding: 4px 8px;
            border-left: 3px solid #333;
          }
          
          .grid { display: grid; gap: 6px; margin-bottom: 8px; }
          .grid-4 { grid-template-columns: repeat(4, 1fr); }
          .grid-3 { grid-template-columns: repeat(3, 1fr); }
          .grid-2 { grid-template-columns: repeat(2, 1fr); }
          
          .field { font-size: 10px; }
          .field-label { color: #666; display: block; margin-bottom: 1px; font-size: 9px; }
          .field-value { font-weight: 500; padding: 3px 0; border-bottom: 1px dotted #ccc; min-height: 18px; }
          
          .notes-box { 
            background: #f9f9f9; 
            padding: 8px; 
            border-radius: 4px;
            white-space: pre-wrap;
            font-size: 10px;
            min-height: 40px;
            border: 1px solid #e0e0e0;
          }
          
          .checklist { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; }
          .checklist-item { 
            font-size: 9px; 
            display: flex; 
            align-items: center; 
            gap: 4px; 
          }
          .checkbox { 
            width: 10px; 
            height: 10px; 
            border: 1px solid #333; 
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
          }
          .checkbox.checked::after { content: "✓"; }
          
          .signature-row {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px solid #ccc;
          }
          .signature-box {
            text-align: center;
          }
          .signature-line {
            border-bottom: 1px solid #000;
            height: 30px;
            margin-bottom: 5px;
          }
          
          @media print {
            body { padding: 10mm; }
            @page { size: A4; margin: 8mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Thermal Image Inspection Form</h1>
          <p>Equipment: ${transformerNo} | Date: ${reportData.inspectionDate}</p>
        </div>

        ${analysisImageUrl ? `
          <div style="text-align: center; margin-bottom: 15px;">
            <img src="${analysisImageUrl}" class="analysis-image" alt="Thermal Analysis Result" />
            <p style="font-size: 9px; color: #666;">Thermal Analysis Result with Detected Anomalies</p>
          </div>
        ` : ''}

        <div style="text-align: center; margin-bottom: 10px;">
          <span class="severity-badge" style="background-color: ${severityColors[reportData.severity]}">
            SEVERITY: ${reportData.severity.toUpperCase()}
          </span>
        </div>

        <div class="section">
          <div class="section-title">1. INSPECTION DETAILS</div>
          <div class="grid grid-4">
            <div class="field">
              <span class="field-label">Date</span>
              <div class="field-value">${reportData.inspectionDate || '-'}</div>
            </div>
            <div class="field">
              <span class="field-label">Time</span>
              <div class="field-value">${reportData.inspectionTime || '-'}</div>
            </div>
            <div class="field">
              <span class="field-label">Weather</span>
              <div class="field-value">${reportData.weatherCondition || '-'}</div>
            </div>
            <div class="field">
              <span class="field-label">Ambient Temp</span>
              <div class="field-value">${reportData.ambientTemp || '-'}</div>
            </div>
          </div>
          <div class="grid grid-3">
            <div class="field">
              <span class="field-label">Inspector Name</span>
              <div class="field-value">${reportData.inspectorName || '-'}</div>
            </div>
            <div class="field">
              <span class="field-label">Inspector ID</span>
              <div class="field-value">${reportData.inspectorId || '-'}</div>
            </div>
            <div class="field">
              <span class="field-label">Humidity</span>
              <div class="field-value">${reportData.humidity || '-'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">2. EQUIPMENT INFORMATION</div>
          <div class="grid grid-3">
            <div class="field">
              <span class="field-label">Equipment Type</span>
              <div class="field-value">${reportData.equipmentType || '-'}</div>
            </div>
            <div class="field">
              <span class="field-label">Equipment ID</span>
              <div class="field-value">${reportData.equipmentId || '-'}</div>
            </div>
            <div class="field">
              <span class="field-label">Manufacturer</span>
              <div class="field-value">${reportData.manufacturer || '-'}</div>
            </div>
            <div class="field">
              <span class="field-label">Rated Capacity</span>
              <div class="field-value">${reportData.ratedCapacity || '-'}</div>
            </div>
            <div class="field">
              <span class="field-label">Voltage</span>
              <div class="field-value">${reportData.voltage || '-'}</div>
            </div>
            <div class="field">
              <span class="field-label">Installation Date</span>
              <div class="field-value">${reportData.installationDate || '-'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">3. THERMAL ANALYSIS DATA</div>
          <div class="grid grid-3">
            <div class="field">
              <span class="field-label">Max Temperature</span>
              <div class="field-value">${reportData.maxTemp || '-'}</div>
            </div>
            <div class="field">
              <span class="field-label">Min Temperature</span>
              <div class="field-value">${reportData.minTemp || '-'}</div>
            </div>
            <div class="field">
              <span class="field-label">Avg Temperature</span>
              <div class="field-value">${reportData.avgTemp || '-'}</div>
            </div>
            <div class="field">
              <span class="field-label">Hotspot Location</span>
              <div class="field-value">${reportData.hotspotLocation || '-'}</div>
            </div>
            <div class="field">
              <span class="field-label">Temperature Rise</span>
              <div class="field-value">${reportData.tempRise || '-'}</div>
            </div>
            <div class="field">
              <span class="field-label">Reference Temp</span>
              <div class="field-value">${reportData.referenceTemp || '-'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">4. CAMERA SETTINGS</div>
          <div class="grid grid-4">
            <div class="field">
              <span class="field-label">Camera Model</span>
              <div class="field-value">${reportData.cameraModel || '-'}</div>
            </div>
            <div class="field">
              <span class="field-label">Serial No.</span>
              <div class="field-value">${reportData.cameraSerial || '-'}</div>
            </div>
            <div class="field">
              <span class="field-label">Emissivity</span>
              <div class="field-value">${reportData.emissivity || '-'}</div>
            </div>
            <div class="field">
              <span class="field-label">Distance</span>
              <div class="field-value">${reportData.distance || '-'}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">5. FINDINGS & ANOMALIES</div>
          <div class="notes-box">${reportData.findings || 'No findings recorded'}</div>
        </div>

        <div class="section">
          <div class="section-title">6. RECOMMENDATIONS</div>
          <div class="grid grid-3" style="margin-bottom: 8px;">
            <div class="field">
              <span class="field-label">Priority Level</span>
              <div class="field-value">${reportData.priorityLevel || '-'}</div>
            </div>
            <div class="field">
              <span class="field-label">Severity</span>
              <div class="field-value">${reportData.severity || '-'}</div>
            </div>
            <div class="field">
              <span class="field-label">Next Inspection</span>
              <div class="field-value">${reportData.nextInspectionDate || '-'}</div>
            </div>
          </div>
          <div class="notes-box">${reportData.recommendation || 'No recommendations recorded'}</div>
        </div>

        <div class="section">
          <div class="section-title">7. INSPECTION CHECKLIST</div>
          <div class="checklist">
            ${Object.entries(reportData.checklist).map(([key, value]) => `
              <div class="checklist-item">
                <span class="checkbox ${value ? 'checked' : ''}"></span>
                <span>${key}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="signature-row">
          <div class="signature-box">
            <div class="signature-line"></div>
            <div style="font-size: 9px;">
              <strong>Reviewed By:</strong> ${reportData.reviewedBy || '_____________'}
              <br />
              <strong>Date:</strong> ${reportData.reviewedDate || '_____________'}
            </div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div style="font-size: 9px;">
              <strong>Approved By:</strong> ${reportData.approvedBy || '_____________'}
              <br />
              <strong>Date:</strong> ${reportData.approvedDate || '_____________'}
            </div>
          </div>
        </div>

        <div style="margin-top: 20px; font-size: 9px; color: #666; text-align: center; border-top: 1px solid #eee; padding-top: 8px;">
          Generated on ${new Date().toLocaleString()} | Version ${record.version || 1}
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  };

  const updateReport = (field: keyof ThermalReportData, value: any) => {
    setReportData(prev => ({ ...prev, [field]: value }));
  };

  const updateChecklist = (field: string, value: boolean) => {
    setReportData(prev => ({
      ...prev,
      checklist: { ...prev.checklist, [field]: value },
    }));
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      Normal: "bg-green-500",
      Attention: "bg-yellow-500",
      Intermediate: "bg-orange-500",
      Serious: "bg-red-500",
      Critical: "bg-red-700",
    };
    return colors[severity] || "bg-gray-500";
  };

  if (loading && !record.id) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold">Thermal Image Inspection Form</h2>
          <p className="text-muted-foreground">
            Transformer: {transformerNo}
            {record.version && (
              <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                Version {record.version} {record.isCurrent && "(Current)"}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showHistory} onOpenChange={(open) => {
            setShowHistory(open);
            if (open) fetchHistory();
            if (!open) {
              setShowPreview(false);
              setPreviewRecord(null);
              setPreviewReportData(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <History className="mr-2 h-4 w-4" />
                History
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>
                  {showPreview && previewRecord 
                    ? `Preview - Version ${previewRecord.version}` 
                    : "Report History"
                  }
                </DialogTitle>
              </DialogHeader>
              
              {showPreview && previewRecord && previewReportData ? (
                <div className="flex flex-col h-full">
                  <ScrollArea className="flex-1 max-h-[60vh] pr-4">
                    <div className="bg-white text-black p-6 rounded-lg border">
                      <div className="flex justify-between items-center mb-4 pb-4 border-b">
                        <div>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            Version {previewRecord.version}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            {previewRecord.createdAt ? new Date(previewRecord.createdAt).toLocaleString() : ""}
                          </span>
                        </div>
                        {previewRecord.isCurrent && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Current</span>
                        )}
                      </div>
                      <div className="space-y-4 text-sm">
                        <div>
                          <h4 className="font-semibold text-black">Severity</h4>
                          <Badge className={getSeverityColor(previewReportData.severity)}>
                            {previewReportData.severity}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div><span className="text-gray-500">Max Temp:</span> {previewReportData.maxTemp || '-'}</div>
                          <div><span className="text-gray-500">Min Temp:</span> {previewReportData.minTemp || '-'}</div>
                          <div><span className="text-gray-500">Avg Temp:</span> {previewReportData.avgTemp || '-'}</div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-black">Findings</h4>
                          <p className="text-gray-700 whitespace-pre-wrap">{previewReportData.findings || 'None'}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-black">Recommendations</h4>
                          <p className="text-gray-700">{previewReportData.recommendation || 'None'}</p>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                  
                  <DialogFooter className="mt-4 flex justify-between items-center">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowPreview(false);
                        setPreviewRecord(null);
                        setPreviewReportData(null);
                      }}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to History
                    </Button>
                    {!previewRecord.isCurrent && (
                      <Button 
                        onClick={() => restoreVersion(previewRecord.version!)}
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        {loading ? "Restoring..." : "Restore This Version"}
                      </Button>
                    )}
                  </DialogFooter>
                </div>
              ) : (
                <div className="max-h-[400px] overflow-y-auto">
                  {history.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No history available</p>
                      <p className="text-sm">Save a report to start tracking history</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Version</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.map((item) => {
                          let itemSeverity = "Unknown";
                          try {
                            if (item.reportData) {
                              const parsed = JSON.parse(item.reportData);
                              itemSeverity = parsed.severity || "Unknown";
                            }
                          } catch {}
                          return (
                            <TableRow key={item.id}>
                              <TableCell>v{item.version}</TableCell>
                              <TableCell>
                                {item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge className={getSeverityColor(itemSeverity)}>
                                  {itemSeverity}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {item.isCurrent ? (
                                  <Badge variant="secondary">Current</Badge>
                                ) : (
                                  <Badge variant="outline">Archived</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handlePreviewVersion(item)}
                                  >
                                    <Eye className="mr-1 h-3 w-3" />
                                    Preview
                                  </Button>
                                  {!item.isCurrent && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => restoreVersion(item.version!)}
                                      disabled={loading}
                                    >
                                      <RotateCcw className="mr-1 h-3 w-3" />
                                      Restore
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={handleSubmit} size="sm" className="bg-blue-600 hover:bg-blue-700">
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-5 mb-4">
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="thermal">Thermal Data</TabsTrigger>
          <TabsTrigger value="findings">Findings</TabsTrigger>
          <TabsTrigger value="signoff">Sign-off</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto pr-2">
          {/* Tab 1: Analysis Image */}
          <TabsContent value="analysis" className="space-y-4 mt-0">
            <Card>
              <CardContent className="pt-6">
                {analysisImageUrl ? (
                  <div className="space-y-4">
                    <div className="border rounded-lg overflow-hidden bg-black/5">
                      <img 
                        src={analysisImageUrl} 
                        alt="Thermal Analysis Result" 
                        className="w-full max-h-[400px] object-contain"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      Thermal analysis result showing detected anomalies with bounding boxes
                    </p>
                  </div>
                ) : thermalImageUrl ? (
                  <div className="space-y-4">
                    <div className="border rounded-lg overflow-hidden bg-black/5">
                      <img 
                        src={thermalImageUrl} 
                        alt="Thermal Image" 
                        className="w-full max-h-[400px] object-contain"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground text-center">
                      Original thermal image (No analysis result available)
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 border border-dashed rounded-lg">
                    <p className="text-muted-foreground">No analysis image available</p>
                  </div>
                )}
                
                <div className="mt-6 flex items-center justify-center gap-4">
                  <div className="text-center">
                    <Label className="text-sm text-muted-foreground">Severity Classification</Label>
                    <div className="mt-2">
                      <Badge className={`${getSeverityColor(reportData.severity)} text-white text-lg px-4 py-2`}>
                        {reportData.severity}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {anomalies && anomalies.length > 0 && (
                  <div className="mt-6">
                    <Label className="text-base font-semibold">Detected Anomalies ({anomalies.length})</Label>
                    <div className="mt-2 space-y-2">
                      {anomalies.map((a: any, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <span className="font-medium">{a.riskType || a.anomalyState || 'Unknown'}</span>
                            <span className="text-sm text-muted-foreground ml-2">
                              {a.description || 'No description'}
                            </span>
                          </div>
                          <Badge variant="outline">{a.confidenceScore || 0}% confidence</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Equipment Info */}
          <TabsContent value="equipment" className="space-y-4 mt-0">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <Label>Equipment Type</Label>
                    <Select value={reportData.equipmentType} onValueChange={(val) => updateReport("equipmentType", val)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Distribution Transformer">Distribution Transformer</SelectItem>
                        <SelectItem value="Power Transformer">Power Transformer</SelectItem>
                        <SelectItem value="Switchgear">Switchgear</SelectItem>
                        <SelectItem value="Circuit Breaker">Circuit Breaker</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Equipment ID</Label>
                    <Input 
                      value={reportData.equipmentId} 
                      onChange={(e) => updateReport("equipmentId", e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Manufacturer</Label>
                    <Input 
                      value={reportData.manufacturer} 
                      onChange={(e) => updateReport("manufacturer", e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rated Capacity (kVA)</Label>
                    <Input 
                      value={reportData.ratedCapacity} 
                      onChange={(e) => updateReport("ratedCapacity", e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Voltage (kV)</Label>
                    <Input 
                      value={reportData.voltage} 
                      onChange={(e) => updateReport("voltage", e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Installation Date</Label>
                    <Input 
                      type="date"
                      value={reportData.installationDate} 
                      onChange={(e) => updateReport("installationDate", e.target.value)} 
                    />
                  </div>
                </div>

                <div className="border-t pt-6 mt-6">
                  <Label className="text-base font-semibold mb-4 block">Inspection Conditions</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Inspection Date</Label>
                      <Input 
                        type="date"
                        value={reportData.inspectionDate} 
                        onChange={(e) => updateReport("inspectionDate", e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Inspection Time</Label>
                      <Input 
                        type="time"
                        value={reportData.inspectionTime} 
                        onChange={(e) => updateReport("inspectionTime", e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Weather Condition</Label>
                      <Select value={reportData.weatherCondition} onValueChange={(val) => updateReport("weatherCondition", val)}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Clear">Clear</SelectItem>
                          <SelectItem value="Cloudy">Cloudy</SelectItem>
                          <SelectItem value="Rainy">Rainy</SelectItem>
                          <SelectItem value="Windy">Windy</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Ambient Temperature (°C)</Label>
                      <Input 
                        value={reportData.ambientTemp} 
                        onChange={(e) => updateReport("ambientTemp", e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Humidity (%)</Label>
                      <Input 
                        value={reportData.humidity} 
                        onChange={(e) => updateReport("humidity", e.target.value)} 
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6 mt-6">
                  <Label className="text-base font-semibold mb-4 block">Camera Settings</Label>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>Camera Model</Label>
                      <Input 
                        value={reportData.cameraModel} 
                        onChange={(e) => updateReport("cameraModel", e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Camera Serial</Label>
                      <Input 
                        value={reportData.cameraSerial} 
                        onChange={(e) => updateReport("cameraSerial", e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Emissivity</Label>
                      <Input 
                        value={reportData.emissivity} 
                        onChange={(e) => updateReport("emissivity", e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Distance (m)</Label>
                      <Input 
                        value={reportData.distance} 
                        onChange={(e) => updateReport("distance", e.target.value)} 
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Thermal Data */}
          <TabsContent value="thermal" className="space-y-4 mt-0">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="space-y-2">
                    <Label>Maximum Temperature (°C)</Label>
                    <Input 
                      value={reportData.maxTemp} 
                      onChange={(e) => updateReport("maxTemp", e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Minimum Temperature (°C)</Label>
                    <Input 
                      value={reportData.minTemp} 
                      onChange={(e) => updateReport("minTemp", e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Average Temperature (°C)</Label>
                    <Input 
                      value={reportData.avgTemp} 
                      onChange={(e) => updateReport("avgTemp", e.target.value)} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <Label>Hotspot Location</Label>
                    <Input 
                      value={reportData.hotspotLocation} 
                      onChange={(e) => updateReport("hotspotLocation", e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Temperature Rise (ΔT °C)</Label>
                    <Input 
                      value={reportData.tempRise} 
                      onChange={(e) => updateReport("tempRise", e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reference Temperature (°C)</Label>
                    <Input 
                      value={reportData.referenceTemp} 
                      onChange={(e) => updateReport("referenceTemp", e.target.value)} 
                    />
                  </div>
                </div>

                <div className="border-t pt-6 mt-6">
                  <Label className="text-base font-semibold mb-4 block">Severity Classification</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Severity Level</Label>
                      <Select value={reportData.severity} onValueChange={(val: any) => updateReport("severity", val)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Normal">Normal (No action required)</SelectItem>
                          <SelectItem value="Attention">Attention (Monitor)</SelectItem>
                          <SelectItem value="Intermediate">Intermediate (Schedule repair)</SelectItem>
                          <SelectItem value="Serious">Serious (Urgent repair)</SelectItem>
                          <SelectItem value="Critical">Critical (Immediate action)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Priority Level</Label>
                      <Select value={reportData.priorityLevel} onValueChange={(val: any) => updateReport("priorityLevel", val)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label>Severity Description</Label>
                    <Textarea 
                      value={reportData.severityDescription} 
                      onChange={(e) => updateReport("severityDescription", e.target.value)} 
                      placeholder="Describe the severity classification reasoning..."
                      className="min-h-[80px]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Findings & Recommendations */}
          <TabsContent value="findings" className="space-y-4 mt-0">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Findings</Label>
                    <Textarea 
                      value={reportData.findings} 
                      onChange={(e) => updateReport("findings", e.target.value)} 
                      placeholder="Describe the inspection findings..."
                      className="min-h-[150px]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Detected Anomalies</Label>
                    <Textarea 
                      value={reportData.anomaliesDetected} 
                      onChange={(e) => updateReport("anomaliesDetected", e.target.value)} 
                      placeholder="List detected anomalies..."
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Recommendations</Label>
                    <Textarea 
                      value={reportData.recommendation} 
                      onChange={(e) => updateReport("recommendation", e.target.value)} 
                      placeholder="Provide recommendations..."
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Next Inspection Date</Label>
                      <Input 
                        type="date"
                        value={reportData.nextInspectionDate} 
                        onChange={(e) => updateReport("nextInspectionDate", e.target.value)} 
                      />
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <Label className="text-base font-semibold mb-4 block">Inspection Checklist</Label>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                      {Object.entries(reportData.checklist).map(([key, value]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`check-${key}`} 
                            checked={value}
                            onCheckedChange={(checked) => updateChecklist(key, !!checked)}
                          />
                          <Label htmlFor={`check-${key}`} className="text-sm font-normal cursor-pointer">
                            {key}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 5: Sign-off */}
          <TabsContent value="signoff" className="space-y-4 mt-0">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <Label>Inspector Name</Label>
                    <Input 
                      value={reportData.inspectorName} 
                      onChange={(e) => updateReport("inspectorName", e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Inspector ID</Label>
                    <Input 
                      value={reportData.inspectorId} 
                      onChange={(e) => updateReport("inspectorId", e.target.value)} 
                    />
                  </div>
                </div>

                <div className="border-t pt-6 mt-6">
                  <Label className="text-base font-semibold mb-4 block">Review & Approval</Label>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4 p-4 border rounded-lg">
                      <h4 className="font-medium">Reviewed By</h4>
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input 
                          value={reportData.reviewedBy} 
                          onChange={(e) => updateReport("reviewedBy", e.target.value)} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input 
                          type="date"
                          value={reportData.reviewedDate} 
                          onChange={(e) => updateReport("reviewedDate", e.target.value)} 
                        />
                      </div>
                    </div>
                    <div className="space-y-4 p-4 border rounded-lg">
                      <h4 className="font-medium">Approved By</h4>
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input 
                          value={reportData.approvedBy} 
                          onChange={(e) => updateReport("approvedBy", e.target.value)} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Date</Label>
                        <Input 
                          type="date"
                          value={reportData.approvedDate} 
                          onChange={(e) => updateReport("approvedDate", e.target.value)} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
