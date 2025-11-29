import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { 
  FileText, 
  Thermometer, 
  ClipboardList,
  Search,
  Calendar,
  Building2
} from "lucide-react";
import { api, API_ENDPOINTS } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { MaintenanceRecordForm } from "@/components/MaintenanceRecordForm";
import { ThermalImageInspectionForm } from "@/components/ThermalImageInspectionForm";

interface Inspection {
  id: string;
  inspectionNo: string;
  transformerNo: string;
  branch: string;
  dateOfInspection: string;
  status: string;
}

export default function Reports() {
  const { toast } = useToast();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showThermalModal, setShowThermalModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchInspections();
  }, []);

  const fetchInspections = async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ENDPOINTS.INSPECTION_VIEW_ALL);
      const data = response.data?.responseData || response.data || [];
      setInspections(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch inspections",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredInspections = inspections.filter(
    (inspection) =>
      inspection.transformerNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.inspectionNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.branch?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenMaintenanceReport = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setShowMaintenanceModal(true);
  };

  const handleOpenThermalReport = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setShowThermalModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "bg-green-500/20 text-green-500";
      case "in-progress":
      case "in progress":
        return "bg-blue-500/20 text-blue-500";
      case "pending":
        return "bg-yellow-500/20 text-yellow-500";
      default:
        return "bg-gray-500/20 text-gray-500";
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Reports</h1>
            <p className="text-muted-foreground mt-1">
              Generate and manage inspection reports
            </p>
          </div>
        </div>

        {/* Report Types Overview */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-orange-500/20">
                  <ClipboardList className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <CardTitle>Maintenance Record</CardTitle>
                  <CardDescription>
                    Track maintenance activities, gang composition, and work data
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Maintenance personnel & timing details</li>
                <li>• Gang composition tracking</li>
                <li>• Work checklist & data sheets</li>
                <li>• Version history management</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-500/20">
                  <Thermometer className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <CardTitle>Thermal Inspection Form</CardTitle>
                  <CardDescription>
                    Document thermal analysis findings and recommendations
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Analysis image with detected anomalies</li>
                <li>• Temperature measurements & severity</li>
                <li>• Equipment details & camera settings</li>
                <li>• Findings & recommendations</li>
              </ul>
            </CardContent>
          </Card>
        </div> */}

        {/* Inspections List for Report Generation */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Select Inspection</CardTitle>
                <CardDescription>
                  Choose an inspection to generate reports
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search inspections..."
                    className="pl-9 pr-4 py-2 text-sm border rounded-lg bg-background w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
              </div>
            ) : filteredInspections.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No inspections found</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {filteredInspections.map((inspection) => (
                  <div
                    key={inspection.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {inspection.inspectionNo || `INS-${inspection.id}`}
                          <Badge className={getStatusColor(inspection.status)}>
                            {inspection.status || "Unknown"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {inspection.transformerNo}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {inspection.dateOfInspection || "No date"}
                          </span>
                          {inspection.branch && (
                            <span>{inspection.branch}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenMaintenanceReport(inspection)}
                      >
                        <ClipboardList className="h-4 w-4 mr-2" />
                        Maintenance
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenThermalReport(inspection)}
                      >
                        <Thermometer className="h-4 w-4 mr-2" />
                        Thermal Form
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Maintenance Record Modal */}
      <Dialog open={showMaintenanceModal} onOpenChange={setShowMaintenanceModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedInspection && (
            <MaintenanceRecordForm
              inspectionId={selectedInspection.id}
              transformerNo={selectedInspection.transformerNo || ""}
              inspectionDate={selectedInspection.dateOfInspection}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Thermal Inspection Form Modal */}
      <Dialog open={showThermalModal} onOpenChange={setShowThermalModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {selectedInspection && (
            <ThermalImageInspectionForm
              inspectionId={selectedInspection.id}
              transformerNo={selectedInspection.transformerNo || ""}
              inspectionDate={selectedInspection.dateOfInspection}
            />
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
