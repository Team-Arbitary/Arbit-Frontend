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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, API_ENDPOINTS } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Printer, Save, History, FileText, CheckSquare, RotateCcw, Clock, Eye, ArrowLeft, X } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MaintenanceRecordFormProps {
  inspectionId: string;
  transformerNo: string;
  inspectionDate?: string;
  imageUrl?: string;
  anomalies?: any[];
  onClose?: () => void;
}

interface MaintenanceRecord {
  id?: number;
  inspectionId: number;
  inspectorName: string;
  status: string;
  voltageReading: string;
  currentReading: string;
  recommendedAction: string;
  remarks: string;
  reportData?: string; // JSON string of full report
  version?: number;
  isCurrent?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface FullReportData {
  // Maintenance Record Tab
  startTime: string;
  completionTime: string;
  supervisedBy: string;
  gangComposition: {
    tech1: string;
    tech2: string;
    tech3: string;
    helpers: string;
  };
  inspectedBy: string;
  inspectedDate: string;
  rectifiedBy: string;
  rectifiedDate: string;
  reInspectedBy: string;
  reInspectedDate: string;
  css: string;
  cssDate: string;
  spotsCorrectedCss: string;
  spotsCorrectedDate: string;

  // Work - Data Sheet Tab
  gangLeader: string;
  jobDate: string;
  jobStartedTime: string;
  serialNo: string;
  kva: string;
  make: string;
  tapPosition: string;
  txCtRatio: string;
  manufactureYear: string;
  earthResistance: string;
  neutral: string;
  bodyType: "Surge" | "Body";
  fdsFuseRatings: {
    f1: boolean; f1Amps: string;
    f2: boolean; f2Amps: string;
    f3: boolean; f3Amps: string;
    f4: boolean; f4Amps: string;
    f5: boolean; f5Amps: string;
  };
  jobCompletedTime: string;
  notes: string;
  checklist: {
    [key: string]: boolean;
  };
}

const INITIAL_REPORT_DATA: FullReportData = {
  startTime: "9.00am",
  completionTime: "9.16am",
  supervisedBy: "A-221",
  gangComposition: {
    tech1: "T-112",
    tech2: "A-110",
    tech3: "A-110",
    helpers: "H-245",
  },
  inspectedBy: "A-110",
  inspectedDate: "",
  rectifiedBy: "P-453",
  rectifiedDate: "",
  reInspectedBy: "A-110",
  reInspectedDate: "",
  css: "A-110",
  cssDate: "",
  spotsCorrectedCss: "A-110",
  spotsCorrectedDate: "",
  gangLeader: "P-453",
  jobDate: "",
  jobStartedTime: "9.16am",
  serialNo: "J-14-V016010026",
  kva: "50",
  make: "LTL",
  tapPosition: "1",
  txCtRatio: "300",
  manufactureYear: "2014",
  earthResistance: "-",
  neutral: "-",
  bodyType: "Surge",
  fdsFuseRatings: {
    f1: true, f1Amps: "A",
    f2: false, f2Amps: "A",
    f3: false, f3Amps: "A",
    f4: false, f4Amps: "A",
    f5: false, f5Amps: "A",
  },
  jobCompletedTime: "11.05am",
  notes: "",
  checklist: {
    "16mm2 Copper wire": true,
    "70mm2 ABC wire": false,
    "Aluminum binding 14mm2": false,
    "50mm2 Earth Wire": false,
    "60mm2 AAC": false,
    "150mm2 AAC": false,
    "FDS": false,
    "100A HRC Fuse": false,
    "125A HRC Fuse": false,
    "160A HRC Fuse": false,
    "H Connecter 60/60mm2": false,
    "H Connecter 60/16mm2": false,
    "H Connecter 150/150mm2": false,
    "H Connecter 150/16mm2": false,
    "Copper Lug 16mm2": true,
    "Copper Lug 50mm2": false,
    "C/T Lug 2.5mm2": false,
    "Bimetallic Lug 35mm2": false,
    "Bimetallic Lug 50mm2": false,
    "Bimetallic Lug 70mm2": false,
    "T-Off": false,
    "Split Bolt": false,
    "S/S Bolt": false,
    "Strap": false,
    "Strap Buckles": false,
    "DDLO COUT": false,
    "DDLO COUT Fuse holder": false,
    "Lighting Arrestsr": false,
  },
};

export function MaintenanceRecordForm({
  inspectionId,
  transformerNo,
  inspectionDate,
  imageUrl,
  anomalies,
  onClose,
}: MaintenanceRecordFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("record");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  const [record, setRecord] = useState<MaintenanceRecord>({
    inspectionId: parseInt(inspectionId),
    inspectorName: "",
    status: "OK",
    voltageReading: "",
    currentReading: "",
    recommendedAction: "",
    remarks: "",
  });

  const [reportData, setReportData] = useState<FullReportData>(INITIAL_REPORT_DATA);
  const [history, setHistory] = useState<MaintenanceRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [previewRecord, setPreviewRecord] = useState<MaintenanceRecord | null>(null);
  const [previewReportData, setPreviewReportData] = useState<FullReportData | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchRecord();
    // Auto-fill dates
    const today = new Date().toISOString().split('T')[0];
    setReportData(prev => ({
      ...prev,
      inspectedDate: inspectionDate || today,
      rectifiedDate: today,
      reInspectedDate: today,
      cssDate: today,
      spotsCorrectedDate: today,
      jobDate: today,
    }));

    // Auto-fill anomalies into notes
    if (anomalies && anomalies.length > 0) {
      const anomalyText = anomalies.map(a => 
        `Detected ${a.anomalyState || 'anomaly'} (${a.confidenceScore}% confidence): ${a.description || a.riskType}`
      ).join('\n');
      
      setReportData(prev => {
        // Avoid duplicating if already present
        if (prev.notes && prev.notes.includes("Detected")) return prev;
        
        return {
          ...prev,
          notes: prev.notes ? prev.notes + '\n\n' + anomalyText : anomalyText
        };
      });
    }
  }, [inspectionId, anomalies]);

  const fetchRecord = async () => {
    try {
      const res = await api.get(
        API_ENDPOINTS.MAINTENANCE_GET_BY_INSPECTION(inspectionId)
      );
      if (res.data.responseData) {
        const data = res.data.responseData;
        setRecord(data);
        if (data.reportData) {
          try {
            setReportData(JSON.parse(data.reportData));
          } catch (e) {
            console.error("Failed to parse report data", e);
          }
        }
      }
    } catch (error) {
      // No record exists yet
    }
  };

  const fetchHistory = async () => {
    try {
      // Fetch history for this specific inspection only
      const res = await api.get(
        API_ENDPOINTS.MAINTENANCE_GET_HISTORY(inspectionId)
      );
      if (res.data.responseData) {
        setHistory(res.data.responseData);
      }
    } catch (error) {
      console.error("Failed to fetch history", error);
    }
  };

  const handlePreviewVersion = (item: MaintenanceRecord) => {
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
      await api.post(
        API_ENDPOINTS.MAINTENANCE_RESTORE_VERSION(inspectionId, version)
      );
      toast({
        title: "Success",
        description: `Version ${version} restored successfully`,
      });
      // Refresh the current record and history
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
      await api.post(API_ENDPOINTS.MAINTENANCE_SAVE, {
        ...record,
        inspectionId: parseInt(inspectionId),
        reportData: JSON.stringify(reportData),
      });
      toast({
        title: "Success",
        description: "Maintenance record saved successfully",
      });
      fetchRecord();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save maintenance record",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    setIsPreviewMode(true);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const updateReport = (field: keyof FullReportData, value: any) => {
    setReportData(prev => ({ ...prev, [field]: value }));
  };

  const updateNestedReport = (parent: keyof FullReportData, field: string, value: any) => {
    setReportData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent] as any),
        [field]: value
      }
    }));
  };

  if (isPreviewMode) {
    return (
      <div className="print-container">
        {/* Screen-only header with buttons */}
        <div className="flex justify-between items-center mb-6 no-print">
          <Button 
            variant="outline" 
            onClick={() => setIsPreviewMode(false)}
            className="bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Edit
          </Button>
          <Button 
            onClick={() => window.print()}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <Printer className="mr-2 h-4 w-4" /> Print Report
          </Button>
        </div>

        {/* Printable content */}
        <div className="print-content bg-white text-black p-8">
          {/* Report Header */}
          <div className="border-b-2 border-black pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-black">Transformer Maintenance Report</h1>
                <div className="mt-2 flex gap-4 text-sm">
                  <span className="bg-gray-100 px-2 py-1 rounded text-black">Transformer No: {transformerNo}</span>
                  <span className="bg-gray-100 px-2 py-1 rounded text-black">Branch: Nugegoda</span>
                  <span className="bg-gray-100 px-2 py-1 rounded text-black">Inspected By: {reportData.inspectedBy}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Generated: {new Date().toLocaleString()}</div>
                <div className="mt-1 text-green-700 font-medium border border-green-700 px-2 py-0.5 rounded inline-block text-sm">
                  Inspection Completed
                </div>
              </div>
            </div>
          </div>

          {/* Maintenance Record Section */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b border-gray-300 pb-2 text-black">1. Maintenance Record</h2>
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div>
                <div className="text-xs text-gray-600 uppercase">Start Time</div>
                <div className="font-medium text-black">{reportData.startTime}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 uppercase">Completion Time</div>
                <div className="font-medium text-black">{reportData.completionTime}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 uppercase">Supervised By</div>
                <div className="font-medium text-black">{reportData.supervisedBy}</div>
              </div>
            </div>

            <div className="mb-6">
              <div className="text-xs text-gray-600 uppercase mb-2">Gang Composition</div>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded border border-gray-200">
                <div className="flex justify-between text-black"><span>Tech I:</span> <span className="font-medium">{reportData.gangComposition.tech1}</span></div>
                <div className="flex justify-between text-black"><span>Tech II:</span> <span className="font-medium">{reportData.gangComposition.tech2}</span></div>
                <div className="flex justify-between text-black"><span>Tech III:</span> <span className="font-medium">{reportData.gangComposition.tech3}</span></div>
                <div className="flex justify-between text-black"><span>Helpers:</span> <span className="font-medium">{reportData.gangComposition.helpers}</span></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span className="text-gray-700">Inspected By:</span>
                <span className="font-medium text-black">{reportData.inspectedBy} ({reportData.inspectedDate})</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span className="text-gray-700">Rectified By:</span>
                <span className="font-medium text-black">{reportData.rectifiedBy} ({reportData.rectifiedDate})</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span className="text-gray-700">Re Inspected By:</span>
                <span className="font-medium text-black">{reportData.reInspectedBy} ({reportData.reInspectedDate})</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1">
                <span className="text-gray-700">CSS:</span>
                <span className="font-medium text-black">{reportData.css} ({reportData.cssDate})</span>
              </div>
            </div>
          </div>

          {/* Work Data Sheet Section */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 border-b border-gray-300 pb-2 text-black">2. Work - Data Sheet</h2>
            
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div>
                <div className="text-xs text-gray-600 uppercase">Gang Leader</div>
                <div className="font-medium text-black">{reportData.gangLeader}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 uppercase">Date</div>
                <div className="font-medium text-black">{reportData.jobDate}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 uppercase">Job Started Time</div>
                <div className="font-medium text-black">{reportData.jobStartedTime}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-6">
              <div>
                <div className="text-xs text-gray-600 uppercase">Serial No.</div>
                <div className="font-medium text-black">{reportData.serialNo}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 uppercase">kVA</div>
                <div className="font-medium text-black">{reportData.kva}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 uppercase">Make</div>
                <div className="font-medium text-black">{reportData.make}</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-6">
              <div>
                <div className="text-xs text-gray-600 uppercase">Tap Position</div>
                <div className="font-medium text-black">{reportData.tapPosition}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 uppercase">TX CT Ratio</div>
                <div className="font-medium text-black">{reportData.txCtRatio}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 uppercase">Manufacture Year</div>
                <div className="font-medium text-black">{reportData.manufactureYear}</div>
              </div>
            </div>

            <div className="mb-6">
              <div className="text-xs text-gray-600 uppercase mb-2">Notes / Anomalies</div>
              <div className="bg-gray-50 p-4 rounded border border-gray-200 text-sm whitespace-pre-wrap text-black">
                {reportData.notes || "No notes recorded."}
              </div>
            </div>

            <div className="mb-6">
              <div className="text-xs text-gray-600 uppercase mb-2">Work Checklist</div>
              <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
                {Object.entries(reportData.checklist).map(([key, value]) => (
                  <div key={key} className="flex justify-between items-center border-b border-gray-100 py-1">
                    <span className="text-black">{key}</span>
                    {value ? (
                      <span className="text-green-700 font-bold">✓</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-6 pt-4 border-t border-gray-300">
              <div>
                <div className="text-xs text-gray-600 uppercase">Job Completed Time</div>
                <div className="font-medium text-black">{reportData.jobCompletedTime}</div>
              </div>
              <div>
                <div className="text-xs text-gray-600 uppercase">Earth Resistance</div>
                <div className="font-medium text-black">{reportData.earthResistance}</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t-2 border-black pt-4 mt-8 text-center text-sm text-gray-600">
            <p>Transformer Thermal Inspection System - Generated Report</p>
            <p className="text-xs mt-1">Inspection ID: {inspectionId} | Version: {record.version || 1}</p>
          </div>
        </div>

        {/* Print-specific styles */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-container, .print-container * {
              visibility: visible;
            }
            .print-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
            .print-content {
              padding: 20mm;
              margin: 0;
              box-shadow: none;
            }
            @page {
              size: A4;
              margin: 10mm;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Maintenance Record</h2>
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
              <Button variant="outline">
                <History className="mr-2 h-4 w-4" />
                History
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>
                  {showPreview && previewRecord 
                    ? `Preview - Version ${previewRecord.version}` 
                    : "Maintenance Record History"
                  }
                </DialogTitle>
              </DialogHeader>
              
              {showPreview && previewRecord && previewReportData ? (
                // Preview Mode
                <div className="flex flex-col h-full">
                  <ScrollArea className="flex-1 max-h-[60vh] pr-4">
                    <div className="bg-white text-black p-6 rounded-lg border">
                      {/* Preview Header */}
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

                      {/* Preview Content */}
                      <div className="space-y-6">
                        {/* Maintenance Record */}
                        <div>
                          <h3 className="font-semibold text-black mb-3">1. Maintenance Record</h3>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div><span className="text-gray-500">Start Time:</span> <span className="font-medium">{previewReportData.startTime}</span></div>
                            <div><span className="text-gray-500">Completion:</span> <span className="font-medium">{previewReportData.completionTime}</span></div>
                            <div><span className="text-gray-500">Supervised By:</span> <span className="font-medium">{previewReportData.supervisedBy}</span></div>
                          </div>
                          <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                            <div className="font-medium mb-2 text-black">Gang Composition</div>
                            <div className="grid grid-cols-2 gap-2">
                              <div><span className="text-gray-500">Tech I:</span> {previewReportData.gangComposition.tech1}</div>
                              <div><span className="text-gray-500">Tech II:</span> {previewReportData.gangComposition.tech2}</div>
                              <div><span className="text-gray-500">Tech III:</span> {previewReportData.gangComposition.tech3}</div>
                              <div><span className="text-gray-500">Helpers:</span> {previewReportData.gangComposition.helpers}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                            <div><span className="text-gray-500">Inspected By:</span> {previewReportData.inspectedBy} ({previewReportData.inspectedDate})</div>
                            <div><span className="text-gray-500">Rectified By:</span> {previewReportData.rectifiedBy} ({previewReportData.rectifiedDate})</div>
                            <div><span className="text-gray-500">Re Inspected By:</span> {previewReportData.reInspectedBy} ({previewReportData.reInspectedDate})</div>
                            <div><span className="text-gray-500">CSS:</span> {previewReportData.css} ({previewReportData.cssDate})</div>
                          </div>
                        </div>

                        {/* Work Data Sheet */}
                        <div>
                          <h3 className="font-semibold text-black mb-3">2. Work - Data Sheet</h3>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div><span className="text-gray-500">Gang Leader:</span> <span className="font-medium">{previewReportData.gangLeader}</span></div>
                            <div><span className="text-gray-500">Date:</span> <span className="font-medium">{previewReportData.jobDate}</span></div>
                            <div><span className="text-gray-500">Started:</span> <span className="font-medium">{previewReportData.jobStartedTime}</span></div>
                            <div><span className="text-gray-500">Serial No:</span> <span className="font-medium">{previewReportData.serialNo}</span></div>
                            <div><span className="text-gray-500">kVA:</span> <span className="font-medium">{previewReportData.kva}</span></div>
                            <div><span className="text-gray-500">Make:</span> <span className="font-medium">{previewReportData.make}</span></div>
                          </div>
                          {previewReportData.notes && (
                            <div className="mt-3">
                              <div className="text-gray-500 text-sm mb-1">Notes:</div>
                              <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap text-black">
                                {previewReportData.notes}
                              </div>
                            </div>
                          )}
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
                // History List
                <div className="max-h-[400px] overflow-y-auto">
                  {history.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No history available</p>
                      <p className="text-sm">Save a record to start tracking history</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Version</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Inspector</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.map((item) => (
                          <TableRow key={item.id} className={item.isCurrent ? "bg-blue-500/10" : ""}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">v{item.version}</span>
                                {item.isCurrent && (
                                  <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">
                                    Current
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {item.createdAt 
                                ? new Date(item.createdAt).toLocaleString() 
                                : "-"}
                            </TableCell>
                            <TableCell>{item.status || "-"}</TableCell>
                            <TableCell>{item.inspectorName || "-"}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
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
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print Report
          </Button>
          <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="record">1. Maintenance Record</TabsTrigger>
          <TabsTrigger value="sheet">2. Work - Data Sheet</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto pr-2">
          <TabsContent value="record" className="space-y-6 mt-0">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Input 
                      value={reportData.startTime} 
                      onChange={(e) => updateReport("startTime", e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Completion Time</Label>
                    <Input 
                      value={reportData.completionTime} 
                      onChange={(e) => updateReport("completionTime", e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Supervised By</Label>
                    <Input 
                      value={reportData.supervisedBy} 
                      onChange={(e) => updateReport("supervisedBy", e.target.value)} 
                    />
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <Label className="text-base font-semibold">Gang Composition</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tech I</Label>
                      <Input 
                        value={reportData.gangComposition.tech1} 
                        onChange={(e) => updateNestedReport("gangComposition", "tech1", e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tech II</Label>
                      <Input 
                        value={reportData.gangComposition.tech2} 
                        onChange={(e) => updateNestedReport("gangComposition", "tech2", e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tech III</Label>
                      <Input 
                        value={reportData.gangComposition.tech3} 
                        onChange={(e) => updateNestedReport("gangComposition", "tech3", e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Helpers</Label>
                      <Input 
                        value={reportData.gangComposition.helpers} 
                        onChange={(e) => updateNestedReport("gangComposition", "helpers", e.target.value)} 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Inspected By</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={reportData.inspectedBy} 
                        onChange={(e) => updateReport("inspectedBy", e.target.value)} 
                      />
                      <Input 
                        type="date" 
                        value={reportData.inspectedDate} 
                        onChange={(e) => updateReport("inspectedDate", e.target.value)} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Rectified By</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={reportData.rectifiedBy} 
                        onChange={(e) => updateReport("rectifiedBy", e.target.value)} 
                      />
                      <Input 
                        type="date" 
                        value={reportData.rectifiedDate} 
                        onChange={(e) => updateReport("rectifiedDate", e.target.value)} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Re Inspected By</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={reportData.reInspectedBy} 
                        onChange={(e) => updateReport("reInspectedBy", e.target.value)} 
                      />
                      <Input 
                        type="date" 
                        value={reportData.reInspectedDate} 
                        onChange={(e) => updateReport("reInspectedDate", e.target.value)} 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>CSS</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={reportData.css} 
                        onChange={(e) => updateReport("css", e.target.value)} 
                      />
                      <Input 
                        type="date" 
                        value={reportData.cssDate} 
                        onChange={(e) => updateReport("cssDate", e.target.value)} 
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sheet" className="space-y-6 mt-0">
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="space-y-2">
                    <Label>Gang Leader</Label>
                    <Input 
                      value={reportData.gangLeader} 
                      onChange={(e) => updateReport("gangLeader", e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input 
                      type="date"
                      value={reportData.jobDate} 
                      onChange={(e) => updateReport("jobDate", e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Job Started Time</Label>
                    <Input 
                      value={reportData.jobStartedTime} 
                      onChange={(e) => updateReport("jobStartedTime", e.target.value)} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="space-y-2">
                    <Label>Serial No.</Label>
                    <Input 
                      value={reportData.serialNo} 
                      onChange={(e) => updateReport("serialNo", e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>kVA</Label>
                    <Select value={reportData.kva} onValueChange={(val) => updateReport("kva", val)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="160">160</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Make</Label>
                    <Input 
                      value={reportData.make} 
                      onChange={(e) => updateReport("make", e.target.value)} 
                    />
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <Label>Notes (Auto-filled with Anomalies)</Label>
                  <Textarea 
                    value={reportData.notes} 
                    onChange={(e) => updateReport("notes", e.target.value)} 
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-semibold">Work Checklist</Label>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                    {Object.entries(reportData.checklist).map(([key, value]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`check-${key}`} 
                          checked={value}
                          onCheckedChange={(checked) => updateNestedReport("checklist", key, checked)}
                        />
                        <Label htmlFor={`check-${key}`} className="text-sm font-normal cursor-pointer">
                          {key}
                        </Label>
                      </div>
                    ))}
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
