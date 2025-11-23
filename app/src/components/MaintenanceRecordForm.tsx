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
import { Printer, Save, History, FileText, CheckSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
      const res = await api.get(
        API_ENDPOINTS.MAINTENANCE_GET_BY_TRANSFORMER(transformerNo)
      );
      if (res.data.responseData) {
        setHistory(res.data.responseData);
      }
    } catch (error) {
      console.error("Failed to fetch history", error);
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
      <div className="p-8 bg-white text-black min-h-screen">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <Button variant="outline" onClick={() => setIsPreviewMode(false)}>
            <History className="mr-2 h-4 w-4" /> Back to Edit
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print Report
          </Button>
        </div>

        {/* Report Header */}
        <div className="border-b-2 border-black pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">Transformers</h1>
              <div className="mt-2 flex gap-4 text-sm">
                <span className="bg-gray-100 px-2 py-1 rounded">Transformer No: {transformerNo}</span>
                <span className="bg-gray-100 px-2 py-1 rounded">Branch: Nugegoda</span>
                <span className="bg-gray-100 px-2 py-1 rounded">Inspected By: {reportData.inspectedBy}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Last updated: {new Date().toLocaleString()}</div>
              <div className="mt-1 text-green-600 font-medium border border-green-600 px-2 py-0.5 rounded inline-block">
                Inspection Completed
              </div>
            </div>
          </div>
        </div>

        {/* Maintenance Record Section */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 border-b border-gray-300 pb-2">1. Maintenance Record</h2>
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div>
              <div className="text-xs text-gray-500 uppercase">Start Time</div>
              <div className="font-medium">{reportData.startTime}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Completion Time</div>
              <div className="font-medium">{reportData.completionTime}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Supervised By</div>
              <div className="font-medium">{reportData.supervisedBy}</div>
            </div>
          </div>

          <div className="mb-6">
            <div className="text-xs text-gray-500 uppercase mb-2">Gang Composition</div>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded">
              <div className="flex justify-between"><span>Tech I:</span> <span className="font-medium">{reportData.gangComposition.tech1}</span></div>
              <div className="flex justify-between"><span>Tech II:</span> <span className="font-medium">{reportData.gangComposition.tech2}</span></div>
              <div className="flex justify-between"><span>Tech III:</span> <span className="font-medium">{reportData.gangComposition.tech3}</span></div>
              <div className="flex justify-between"><span>Helpers:</span> <span className="font-medium">{reportData.gangComposition.helpers}</span></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <div className="flex justify-between border-b border-gray-200 pb-1">
              <span className="text-gray-600">Inspected By:</span>
              <span className="font-medium">{reportData.inspectedBy} ({reportData.inspectedDate})</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-1">
              <span className="text-gray-600">Rectified By:</span>
              <span className="font-medium">{reportData.rectifiedBy} ({reportData.rectifiedDate})</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-1">
              <span className="text-gray-600">Re Inspected By:</span>
              <span className="font-medium">{reportData.reInspectedBy} ({reportData.reInspectedDate})</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-1">
              <span className="text-gray-600">CSS:</span>
              <span className="font-medium">{reportData.css} ({reportData.cssDate})</span>
            </div>
          </div>
        </div>

        {/* Work Data Sheet Section */}
        <div className="mb-8 page-break-inside-avoid">
          <h2 className="text-xl font-bold mb-4 border-b border-gray-300 pb-2">2. Work - Data Sheet</h2>
          
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div>
              <div className="text-xs text-gray-500 uppercase">Gang Leader</div>
              <div className="font-medium">{reportData.gangLeader}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Date</div>
              <div className="font-medium">{reportData.jobDate}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Job Started Time</div>
              <div className="font-medium">{reportData.jobStartedTime}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-6">
            <div>
              <div className="text-xs text-gray-500 uppercase">Serial No.</div>
              <div className="font-medium">{reportData.serialNo}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">kVA</div>
              <div className="font-medium">{reportData.kva}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Make</div>
              <div className="font-medium">{reportData.make}</div>
            </div>
          </div>

          <div className="mb-6">
            <div className="text-xs text-gray-500 uppercase mb-2">Notes / Anomalies</div>
            <div className="bg-gray-50 p-4 rounded border border-gray-200 text-sm whitespace-pre-wrap">
              {reportData.notes || "No notes recorded."}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm">
            {Object.entries(reportData.checklist).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center border-b border-gray-100 py-1">
                <span>{key}</span>
                {value ? <CheckSquare className="h-4 w-4 text-black" /> : <span className="h-4 w-4 border border-gray-300 rounded"></span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Maintenance Record</h2>
          <p className="text-muted-foreground">Transformer: {transformerNo}</p>
        </div>
        <div className="flex gap-2">
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
