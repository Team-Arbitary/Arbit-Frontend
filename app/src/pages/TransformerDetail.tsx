import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { AddInspectionModal } from "@/components/AddInspectionModal";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Star, Eye, Trash2, Upload, Search, Filter } from "lucide-react";

const INSPECTION_VIEW_URL = (id: string) => `https://arbit-backend-1.onrender.com/transformer-thermal-inspection/transformer-management/view/${id}`;
const INSPECTION_LIST_URL = "https://arbit-backend-1.onrender.com/transformer-thermal-inspection/inspection-management/view-all";
const DELETE_INSPECTION_URL = (id: string) => `https://arbit-backend-1.onrender.com/transformer-thermal-inspection/inspection-management/delete/${id}`;
const IMAGE_UPLOAD_URL = `https://arbit-backend-1.onrender.com/transformer-thermal-inspection/image-inspection-management/upload`;
const BASELINE_FETCH_URL = (transformerNo: string) => `https://arbit-backend-1.onrender.com/transformer-thermal-inspection/image-inspection-management/baseline/${encodeURIComponent(transformerNo)}`;

type ApiEnvelope<T> = { responseCode?: string; responseDescription?: string; responseData?: T } | T;

type TransformerView = {
  id: string;
  transformerNo: string;
  location?: string;
  regions?: string;
  poleNo?: string;
  capacity?: string;
  type?: string;
  feeders?: string;
  lastInspected?: string;
  status?: "in-progress" | "pending" | "completed" | string;
};

const inspectionData: Array<{ id: string; inspectionNo: string; inspectedDate: string; maintenanceDate: string; status: "in-progress" | "pending" | "completed" }> = [];

export default function TransformerDetail() {
  const { toast } = useToast();
  const [weatherCondition, setWeatherCondition] = useState<string>("Sunny");
  const [isUploadingBaseline, setIsUploadingBaseline] = useState<boolean>(false);
  const [isViewingBaseline, setIsViewingBaseline] = useState<boolean>(false);
  const [baselinePreview, setBaselinePreview] = useState<string | null>(null);
  const [isDeletingBaseline, setIsDeletingBaseline] = useState<boolean>(false);
  const [hasBaseline, setHasBaseline] = useState<boolean>(false);

  const { id } = useParams();
  const navigate = useNavigate();
  const [inspections, setInspections] = useState<typeof inspectionData>([]);
  const [transformer, setTransformer] = useState<TransformerView | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // --- Inspection search and pagination state ---
  const [inspectionSearchQuery, setInspectionSearchQuery] = useState<string>("");
  const [inspectionStatusFilter, setInspectionStatusFilter] = useState<string>("all-statuses");
  const [currentInspectionPage, setCurrentInspectionPage] = useState<number>(1);
  const inspectionsPerPage = 10;

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(INSPECTION_VIEW_URL(id));
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const raw: ApiEnvelope<any> = await res.json();
        const data = (raw as any)?.responseData ?? raw;
        if (!data) throw new Error("Empty response");
        const mapped: TransformerView = {
          id: data.id,
          transformerNo: data.transformerNo,
          location: data.location ?? data.batch, // prefer API "location"; fall back to legacy "batch" if present
          regions: data.regions,
          poleNo: data.poleNo,
          capacity: undefined,
          type: data.type,
          feeders: undefined,
          lastInspected: undefined,
          status: "Not started",
        };
        if (!cancelled) setTransformer(mapped);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load transformer");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!transformer) return;
      try {
        const res = await fetch(INSPECTION_LIST_URL);
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const raw: ApiEnvelope<any> = await res.json();
        const data: any[] = (raw as any)?.responseData ?? (Array.isArray(raw) ? raw : []);

        const sameTx = (item: any) => {
          // Prefer explicit transformerId if backend adds it later; otherwise match on transformerNo
          if (item.transformerId && transformer.id) return item.transformerId === transformer.id;
          return item.transformerNo && transformer.transformerNo && item.transformerNo === transformer.transformerNo;
        };

        const toDisplay = (it: any) => {
          // Normalize date/time coming from backend
          const rawDate = (it.dateOfInspection ?? '').toString().trim();
          const rawTime = (it.time ?? '').toString().trim();

          let iso: string | null = null;
          if (rawDate) {
            if (/\d{2}:\d{2}(:\d{2})?/.test(rawDate)) {
              // dateOfInspection already contains a time e.g. "2025-08-24 14:30:00"
              iso = rawDate.replace(' ', 'T');
            } else if (rawTime) {
              // separate date and time fields
              iso = `${rawDate}T${rawTime}`;
            } else {
              // date only
              iso = rawDate;
            }
          }

          let inspectedDate = "-";
          try {
            inspectedDate = iso ? new Date(iso).toLocaleString() : "-";
          } catch {}

          // Maintenance date may be just a date (YYYY-MM-DD) or full timestamp
          let maintenanceDate = "-";
          const rawMaint = (it.maintenanceDate ?? '').toString().trim();
          if (rawMaint) {
            let mIso = rawMaint;
            if (/^\d{4}-\d{2}-\d{2}$/.test(rawMaint)) {
              mIso = `${rawMaint}T00:00:00`;
            } else if (rawMaint.includes(' ')) {
              mIso = rawMaint.replace(' ', 'T');
            }
            try { maintenanceDate = new Date(mIso).toLocaleDateString(); } catch {}
          }

          return {
            id: String(it.id ?? crypto.randomUUID?.() ?? Math.random()),
            inspectionNo: String(it.id ?? it.inspectionNo ?? it.batch ?? "-"),
            inspectedDate,
            maintenanceDate,
            status: String(it.status ?? 'Not started') as any,
          };
        };

        const filtered = (data || []).filter(sameTx).map(toDisplay);
        if (!cancelled) {
          setInspections(filtered);
          
          // Update transformer's lastInspected with the most recent inspection date
          if (filtered.length > 0) {
            // Find the most recent inspection
            const mostRecentInspection = filtered.reduce((latest, current) => {
              if (current.inspectedDate === "-") return latest;
              if (latest.inspectedDate === "-") return current;
              
              try {
                const latestDate = new Date(latest.inspectedDate);
                const currentDate = new Date(current.inspectedDate);
                return currentDate > latestDate ? current : latest;
              } catch {
                return latest;
              }
            }, filtered[0]);
            
            // Update the transformer with the last inspected date
            setTransformer(prev => prev ? {
              ...prev,
              lastInspected: mostRecentInspection.inspectedDate !== "-" 
                ? mostRecentInspection.inspectedDate 
                : "No inspections yet"
            } : prev);
          }
        }
      } catch (e) {
        // non-fatal: keep existing inspections if fetch fails
        console.error(e);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [transformer]);

  // Check if baseline image exists
  useEffect(() => {
    let cancelled = false;
    const checkBaseline = async () => {
      if (!transformer?.transformerNo) return;
      try {
        const res = await fetch(BASELINE_FETCH_URL(transformer.transformerNo));
        if (res.ok) {
          const ct = res.headers.get('content-type') || '';
          if (ct.startsWith('image/')) {
            if (!cancelled) setHasBaseline(true);
          } else {
            try {
              const raw: ApiEnvelope<any> = await res.json();
              const data: any = (raw as any)?.responseData ?? raw;
              const possible = data?.imageBase64 || data?.url || data?.imageUrl;
              if (possible && typeof possible === 'string') {
                if (!cancelled) setHasBaseline(true);
              } else {
                if (!cancelled) setHasBaseline(false);
              }
            } catch {
              if (!cancelled) setHasBaseline(false);
            }
          }
        } else {
          if (!cancelled) setHasBaseline(false);
        }
      } catch {
        if (!cancelled) setHasBaseline(false);
      }
    };
    checkBaseline();
    return () => {
      cancelled = true;
    };
  }, [transformer?.transformerNo]);

  const handleFileUploadBaseline = async (file: File) => {
    setIsUploadingBaseline(true);
    try {
      const form = new FormData();
      form.append('imageType', 'Baseline');
      form.append('weatherCondition', weatherCondition || 'Sunny');
      form.append('status', 'In-progress');
      form.append('transformerNo', transformer?.transformerNo ?? "-");
      // Use a best-effort inspectionNo from the first listed inspection if available
      const firstInsp = inspections?.[0]?.inspectionNo ?? inspections?.[0]?.id ?? "-";
      form.append('inspectionNo', String(firstInsp));
      form.append('imageFile', file, "file_name");
  
      const res = await fetch(IMAGE_UPLOAD_URL, { method: 'POST', body: form });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  
      setHasBaseline(true);
      toast({ title: "Baseline uploaded", description: "Baseline image uploaded successfully (status: In-progress)." });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Upload failed", description: err?.message || "Unable to upload image", variant: "destructive" });
    } finally {
      setIsUploadingBaseline(false);
    }
  };

  const handleUploadBaseline = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFileUploadBaseline(file);
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

  // --- Baseline preview/delete helpers ---
  const resolveImageFromResponse = async (res: Response) => {
    const ct = res.headers.get('content-type') || '';
    if (ct.startsWith('image/')) {
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    }
    try {
      const raw: ApiEnvelope<any> = await res.json();
      const data: any = (raw as any)?.responseData ?? raw;
      const possible = data?.imageBase64 || data?.url || data?.imageUrl;
      if (typeof possible === 'string') {
        if (/^data:|^https?:\/\//i.test(possible)) return possible;
        try { return new URL(possible, window.location.origin).toString(); } catch { return null; }
      }
    } catch {
      // ignore parse error
    }
    return null;
  };

  const openBaselinePreview = async () => {
    if (!transformer?.transformerNo) {
      toast({ title: "No transformer number", description: "Cannot fetch baseline without transformer number.", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch(BASELINE_FETCH_URL(transformer.transformerNo));
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const src = await resolveImageFromResponse(res);
      if (!src) throw new Error("No baseline image available");
      setBaselinePreview(src);
      setIsViewingBaseline(true);
    } catch (err: any) {
      toast({ title: "Preview failed", description: err?.message || "Unable to load baseline image", variant: "destructive" });
    }
  };

  const closeBaselinePreview = () => {
    if (baselinePreview && baselinePreview.startsWith("blob:")) {
      try { URL.revokeObjectURL(baselinePreview); } catch {}
    }
    setIsViewingBaseline(false);
  };

  const handleDeleteBaseline = async () => {
    if (!transformer?.transformerNo) {
      toast({ title: "No transformer number", description: "Cannot delete baseline without transformer number.", variant: "destructive" });
      return;
    }
    const ok = window.confirm("Delete baseline image? This cannot be undone.");
    if (!ok) return;
    try {
      setIsDeletingBaseline(true);
      const res = await fetch(BASELINE_FETCH_URL(transformer.transformerNo), { method: "DELETE" });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setHasBaseline(false);
      toast({ title: "Deleted", description: "Baseline image deleted successfully." });
      // If a preview is open, close it
      if (isViewingBaseline) closeBaselinePreview();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err?.message || "Unable to delete baseline image", variant: "destructive" });
    } finally {
      setIsDeletingBaseline(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Loading transformer…</h2>
          <Button onClick={() => navigate("/")}>Back to Dashboard</Button>
        </div>
      </Layout>
    );
  }

  if (error || !transformer) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Transformer not found</h2>
          {error && <p className="text-muted-foreground mb-4">{error}</p>}
          <Button onClick={() => navigate("/")}>Back to Dashboard</Button>
        </div>
      </Layout>
    );
  }

  const handleViewInspection = (inspectionId: string) => {
    navigate(`/inspection/${inspectionId}`);
  };

  const handleDeleteInspection = async (inspectionId: string) => {
    const ok = window.confirm("Are you sure you want to delete this inspection?");
    if (!ok) return;
    try {
      let res = await fetch(DELETE_INSPECTION_URL(inspectionId), { method: 'DELETE' });
      if (!res.ok) {
        res = await fetch(DELETE_INSPECTION_URL(inspectionId), { method: 'GET' });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      }
      setInspections(prev => prev.filter(i => i.id !== inspectionId));
    } catch (e: any) {
      alert(`Failed to delete inspection: ${e?.message || 'Unknown error'}`);
    }
  };

  const addInspection = async (inspection: any) => {
    // Optimistically add to UI
    setInspections([...inspections, { ...inspection, id: Date.now().toString() }]);
    
    // Refetch the inspections list to get the actual data from server
    try {
      const res = await fetch(INSPECTION_LIST_URL);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const raw: ApiEnvelope<any> = await res.json();
      const data: any[] = (raw as any)?.responseData ?? (Array.isArray(raw) ? raw : []);

      const sameTx = (item: any) => {
        if (item.transformerId && transformer.id) return item.transformerId === transformer.id;
        return item.transformerNo && transformer.transformerNo && item.transformerNo === transformer.transformerNo;
      };

      const toDisplay = (it: any) => {
        const rawDate = (it.dateOfInspection ?? '').toString().trim();
        const rawTime = (it.time ?? '').toString().trim();

        let iso: string | null = null;
        if (rawDate) {
          if (/\d{2}:\d{2}(:\d{2})?/.test(rawDate)) {
            iso = rawDate.replace(' ', 'T');
          } else if (rawTime) {
            iso = `${rawDate}T${rawTime}`;
          } else {
            iso = rawDate;
          }
        }

        let inspectedDate = "-";
        try {
          inspectedDate = iso ? new Date(iso).toLocaleString() : "-";
        } catch {}

        let maintenanceDate = "-";
        const rawMaint = (it.maintenanceDate ?? '').toString().trim();
        if (rawMaint) {
          let mIso = rawMaint;
          if (/^\d{4}-\d{2}-\d{2}$/.test(rawMaint)) {
            mIso = `${rawMaint}T00:00:00`;
          } else if (rawMaint.includes(' ')) {
            mIso = rawMaint.replace(' ', 'T');
          }
          try { maintenanceDate = new Date(mIso).toLocaleDateString(); } catch {}
        }

        return {
          id: String(it.id ?? crypto.randomUUID?.() ?? Math.random()),
          inspectionNo: String(it.id ?? it.inspectionNo ?? it.batch ?? "-"),
          inspectedDate,
          maintenanceDate,
          status: String(it.status ?? 'Not started') as any,
        };
      };

      const filtered = (data || []).filter(sameTx).map(toDisplay);
      setInspections(filtered);
    } catch (e) {
      console.error('Failed to refresh inspections:', e);
      // Keep the optimistically added inspection if refresh fails
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold">T</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Transformer {transformer.transformerNo ?? "-"}</h1>
              <p className="text-muted-foreground">
                Last updated: {transformer.lastInspected ?? "-"}
              </p>
            </div>
          </div>
          <div className="ml-auto">
            <StatusBadge status={transformer.status as any} />
          </div>
        </div>

        {/* Transformer Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-sm text-muted-foreground">Transformer No</div>
              <div className="font-semibold">{transformer.transformerNo ?? "-"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-sm text-muted-foreground">Pole No</div>
              <div className="font-semibold">{transformer.poleNo ?? "-"}</div>
            </CardContent>
          </Card>
          {/* temporarily map batch → Branch */}
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-sm text-muted-foreground">Location</div>
              <div className="font-semibold">{transformer.location ?? "-"}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-sm text-muted-foreground">Inspected By</div>
              <div className="font-semibold">A-110</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-sm text-muted-foreground">Type</div>
              <div className="text-2xl font-bold">{transformer.type ?? "-"}</div>
              <div className="text-sm text-muted-foreground">Transformer Type</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-sm text-muted-foreground">Regions</div>
              <div className="text-2xl font-bold">{transformer.regions ?? "-"}</div>
              <div className="text-sm text-muted-foreground">Service Region</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              {hasBaseline ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-700">Baseline Image Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={openBaselinePreview}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDeleteBaseline}
                        disabled={isDeletingBaseline}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {isDeletingBaseline ? "Deleting..." : "Delete"}
                      </Button>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={handleUploadBaseline}
                    disabled={isUploadingBaseline}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploadingBaseline ? "Uploading…" : "Replace Baseline"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center py-4">
                    <div className="text-center">
                      {/* <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-2">
                        <Eye className="h-6 w-6 text-muted-foreground" />
                      </div> */}
                      {/* <p className="text-sm font-medium text-muted-foreground mb-1">No Baseline Image</p> */}
                      <p className="text-xs text-muted-foreground">Upload a baseline image to compare with inspections</p>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleUploadBaseline}
                    disabled={isUploadingBaseline}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploadingBaseline ? "Uploading…" : "Upload Baseline"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Inspections Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Transformer Inspections</CardTitle>
            <AddInspectionModal 
              trigger={<Button>Add Inspection</Button>}
              onAdd={addInspection}
              defaultTransformerNo={transformer?.transformerNo}
            />
          </CardHeader>
          <CardContent>
            {/* Search and Filter Tools */}
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by Inspection ID..."
                  value={inspectionSearchQuery}
                  onChange={(e) => {
                    setInspectionSearchQuery(e.target.value);
                    setCurrentInspectionPage(1); // Reset to first page on search
                  }}
                  className="pl-10"
                />
              </div>
              <Select
                value={inspectionStatusFilter}
                onValueChange={(value) => {
                  setInspectionStatusFilter(value);
                  setCurrentInspectionPage(1); // Reset to first page on filter
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-statuses">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inspection No</TableHead>
                  <TableHead>Inspected Date</TableHead>
                  <TableHead>Maintenance Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  // Filter inspections
                  let filtered = inspections.filter((inspection) => {
                    // Search filter
                    const searchLower = inspectionSearchQuery.toLowerCase();
                    const matchesSearch = !inspectionSearchQuery || 
                      inspection.inspectionNo.toLowerCase().includes(searchLower) ||
                      inspection.id.toLowerCase().includes(searchLower);

                    // Status filter
                    const matchesStatus = inspectionStatusFilter === "all-statuses" ||
                      inspection.status?.toLowerCase() === inspectionStatusFilter.toLowerCase() ||
                      (inspectionStatusFilter === "in-progress" && inspection.status?.toLowerCase().includes("progress"));

                    return matchesSearch && matchesStatus;
                  });

                  // Pagination
                  const startIndex = (currentInspectionPage - 1) * inspectionsPerPage;
                  const endIndex = startIndex + inspectionsPerPage;
                  const paginatedInspections = filtered.slice(startIndex, endIndex);

                  if (paginatedInspections.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No inspections found matching your criteria.
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return paginatedInspections.map((inspection) => (
                    <TableRow key={inspection.id}>
                      <TableCell className="font-medium">{inspection.inspectionNo}</TableCell>
                      <TableCell>{inspection.inspectedDate}</TableCell>
                      <TableCell>{inspection.maintenanceDate}</TableCell>
                      <TableCell>
                        <StatusBadge status={inspection.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteInspection(inspection.id)}
                            title="Delete inspection"
                            aria-label="Delete inspection"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleViewInspection(inspection.id)}
                          >
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ));
                })()}
              </TableBody>
            </Table>

            {/* Pagination Controls */}
            {(() => {
              // Calculate filtered count for pagination
              const filtered = inspections.filter((inspection) => {
                const searchLower = inspectionSearchQuery.toLowerCase();
                const matchesSearch = !inspectionSearchQuery || 
                  inspection.inspectionNo.toLowerCase().includes(searchLower) ||
                  inspection.id.toLowerCase().includes(searchLower);
                const matchesStatus = inspectionStatusFilter === "all-statuses" ||
                  inspection.status?.toLowerCase() === inspectionStatusFilter.toLowerCase() ||
                  (inspectionStatusFilter === "in-progress" && inspection.status?.toLowerCase().includes("progress"));
                return matchesSearch && matchesStatus;
              });

              const totalPages = Math.ceil(filtered.length / inspectionsPerPage);

              if (totalPages <= 1) return null;

              return (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentInspectionPage - 1) * inspectionsPerPage) + 1} to {Math.min(currentInspectionPage * inspectionsPerPage, filtered.length)} of {filtered.length} inspections
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentInspectionPage(1)}
                      disabled={currentInspectionPage === 1}
                    >
                      First
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentInspectionPage(prev => Math.max(1, prev - 1))}
                      disabled={currentInspectionPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentInspectionPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentInspectionPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentInspectionPage - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentInspectionPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentInspectionPage(pageNum)}
                            className="w-10"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentInspectionPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentInspectionPage === totalPages}
                    >
                      Next
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentInspectionPage(totalPages)}
                      disabled={currentInspectionPage === totalPages}
                    >
                      Last
                    </Button>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
      {/* Baseline Image Preview Modal */}
      {isViewingBaseline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={closeBaselinePreview}>
          <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-lg font-semibold">Baseline Image Preview</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleDeleteBaseline} disabled={isDeletingBaseline}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeletingBaseline ? "Deleting..." : "Delete"}
                </Button>
                <Button variant="ghost" size="icon" onClick={closeBaselinePreview}>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </Button>
              </div>
            </div>
            <div className="p-6 overflow-auto max-h-[calc(90vh-80px)] bg-gray-50 dark:bg-neutral-950 flex items-center justify-center">
              {baselinePreview ? (
                <img src={baselinePreview} alt="Baseline preview" className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
              ) : (
                <div className="text-center text-muted-foreground py-16">No image to display</div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}