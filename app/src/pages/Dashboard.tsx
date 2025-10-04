import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddTransformerModal } from "@/components/AddTransformerModal";
import { AddInspectionModal } from "@/components/AddInspectionModal";
import { StatusBadge } from "@/components/StatusBadge";
import { Search, Filter, Star, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

// --- Types for API data ---
type Transformer = {
  id: string;
  transformerNo: string;
  poleNo?: string;
  region?: string;
  type?: string;
  location?: string;
};

type Inspection = {
  id: string;
  transformerNo: string;
  inspectionNo?: string;
  inspectedDate?: string;
  maintenanceDate?: string;
  status?: "in-progress" | "pending" | "completed" | string;
};

// --- API endpoints ---
const TRANSFORMERS_URL = "https://arbit-backend-1.onrender.com/transformer-thermal-inspection/transformer-management/view-all";
const INSPECTIONS_URL = "https://arbit-backend-1.onrender.com/transformer-thermal-inspection/inspection-management/view-all";
const TRANSFORMERS_FILTER_URL = "https://arbit-backend-1.onrender.com/transformer-thermal-inspection/transformer-management/filter";
const DELETE_TRANSFORMER_URL = (id: string) => `https://arbit-backend-1.onrender.com/transformer-thermal-inspection/transformer-management/delete/${id}`;
const DELETE_INSPECTION_URL = (id: string) => `https://arbit-backend-1.onrender.com/transformer-thermal-inspection/inspection-management/delete/${id}`;
const UPDATE_TRANSFORMER_URL = "https://arbit-backend-1.onrender.com/transformer-thermal-inspection/transformer-management/update";

// Helper to safely unwrap ApiResponse<T> or return the raw payload if it's already a list
async function fetchUnwrap<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const body = await res.json();
  // New: handle { responseData: [...] }
  if (body && Array.isArray(body.responseData)) return body.responseData as T;
  // If backend wraps as { data: [...] }, return data; otherwise return body directly
  if (body && Array.isArray(body)) return body as T;
  if (body && typeof body === "object" && Array.isArray(body.data)) return body.data as T;
  // Some backends might use `content` or `result` keys; try them too
  if (body && Array.isArray(body.content)) return body.content as T;
  if (body && Array.isArray(body.result)) return body.result as T;
  return body as T;
}

type ApiItem = {
  id: string;
  batch?: string;
  transformerNo: string;
  dateOfInspection?: string;
  time?: string;
  poleNo?: string;
  region?: string;
  regions?: string; // some backends use plural key
  type?: string;
  status?: string;
  location?: string;
  maintenanceDate?: string;
};

const toInspection = (x: ApiItem): Inspection => {
  // Parse maintenance date from various possible formats
  let maintenanceDate: string | undefined = undefined;
  if (x.maintenanceDate) {
    try {
      // If it looks like a date string, parse it
      if (typeof x.maintenanceDate === "string") {
        const parsed = new Date(x.maintenanceDate);
        if (!isNaN(parsed.getTime())) {
          maintenanceDate = parsed.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
          });
        } else {
          // Use as-is if can't parse
          maintenanceDate = x.maintenanceDate;
        }
      }
    } catch {
      // If parsing fails, leave undefined
      maintenanceDate = undefined;
    }
  }

  return {
    id: x.id,
    transformerNo: x.transformerNo,
    inspectionNo: x.id, // Use the actual inspection ID
    inspectedDate: x.dateOfInspection && x.time ? `${x.dateOfInspection} ${x.time}` : x.dateOfInspection ?? undefined,
    maintenanceDate,
    status: x.status,
  };
};

const toTransformer = (x: ApiItem): Transformer => ({
  id: x.id,
  transformerNo: x.transformerNo,
  poleNo: x.poleNo,
  region: (x.region ?? x.regions) || undefined, // support both singular and plural keys
  type: x.type,     // backend sample doesn't provide; leave undefined
  location: x.location,
});

export default function Dashboard() {
  const navigate = useNavigate();
  const [transformers, setTransformers] = useState<Transformer[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [regionOptions, setRegionOptions] = useState<string[]>([]);
  const [typeOptions, setTypeOptions] = useState<string[]>([]);

  const [selectedRegion, setSelectedRegion] = useState<string>("all-regions");
  const [selectedType, setSelectedType] = useState<string>("all-types");

  // --- Inspection search and pagination state ---
  const [inspectionSearchQuery, setInspectionSearchQuery] = useState<string>("");
  const [inspectionStatusFilter, setInspectionStatusFilter] = useState<string>("all-statuses");
  const [currentInspectionPage, setCurrentInspectionPage] = useState<number>(1);
  const inspectionsPerPage = 10;

  // --- Edit dialog state ---
  const [editingTransformer, setEditingTransformer] = useState<Transformer | null>(null);
  const [editId, setEditId] = useState<string>("");
  const [editTransformerNo, setEditTransformerNo] = useState<string>("");
  const [editPoleNo, setEditPoleNo] = useState<string>("");
  const [editRegion, setEditRegion] = useState<string>("");
  const [editType, setEditType] = useState<string>("");
  const [editLocation, setEditLocation] = useState<string>("");

  const loadTransformers = async (region: string, type: string) => {
    // decide whether to call /filter or /view-all
    const useFilter = region !== "all-regions" || type !== "all-types";
    if (!useFilter) {
      const txRaw = await fetchUnwrap<ApiItem[]>(TRANSFORMERS_URL);
      setTransformers((txRaw || []).map(toTransformer));
      return;
    }

    const filterValues: Array<{ columnName: string; operation: string; value: any[] }> = [];
    if (region !== "all-regions") {
      filterValues.push({ columnName: "regions", operation: "Equal", value: [region] });
    }
    if (type !== "all-types") {
      filterValues.push({ columnName: "type", operation: "Equal", value: [type] });
    }

    const payload = {
      filterValues,
      limit: 200,
      offset: 0,
    };

    const res = await fetch(TRANSFORMERS_FILTER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const body = await res.json();
    const data: ApiItem[] = Array.isArray(body?.responseData) ? body.responseData : Array.isArray(body) ? body : [];
    setTransformers((data || []).map(toTransformer));
  };

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const [insRaw] = await Promise.all([
        fetchUnwrap<ApiItem[]>(INSPECTIONS_URL),
      ]);
      setInspections((insRaw || []).map(toInspection));
      await loadTransformers(selectedRegion, selectedType);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        await loadTransformers(selectedRegion, selectedType);
      } catch (e: any) {
        setError(e?.message ?? "Failed to filter transformers");
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedRegion, selectedType]);

  useEffect(() => {
    const regions = Array.from(
      new Set(
        (transformers || [])
          .map(t => t.region)
          .filter((x): x is string => Boolean(x && x.trim().length > 0))
      )
    );
    const types = Array.from(
      new Set(
        (transformers || [])
          .map(t => t.type)
          .filter((x): x is string => Boolean(x && x.trim().length > 0))
      )
    );
    setRegionOptions(regions);
    setTypeOptions(types);
  }, [transformers]);

  const handleViewTransformer = (transformerId: string) => {
    navigate(`/transformer/${transformerId}`);
  };

  const handleDeleteTransformer = async (transformerId: string) => {
    const ok = window.confirm("Are you sure you want to delete this transformer?");
    if (!ok) return;
    try {
      // Try DELETE first
      let res = await fetch(DELETE_TRANSFORMER_URL(transformerId), { method: 'DELETE' });
      if (!res.ok) {
        // Fallback to GET in case backend maps deletion to GET
        res = await fetch(DELETE_TRANSFORMER_URL(transformerId), { method: 'GET' });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      }
      // Remove from local state on success
      setTransformers(prev => prev.filter(t => t.id !== transformerId));
    } catch (e: any) {
      alert(`Failed to delete transformer: ${e?.message || 'Unknown error'}`);
    }
  };

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

  const addTransformer = (transformer: Transformer) => {
    // Optimistically update UI
    setTransformers(prev => [...prev, transformer]);
    // Then pull fresh data from backend so IDs/counters/derived fields are correct
    void refresh();
  };

  const addInspection = (inspection: Inspection) => {
    // Optimistically update UI
    setInspections(prev => [...prev, inspection]);
    // Ensure list reflects server state immediately after creation
    void refresh();
  };

  // ---- Edit handlers ----
  const openEdit = (t: Transformer) => {
    setEditingTransformer(t);
    setEditId(t.id);
    setEditTransformerNo(t.transformerNo || "");
    setEditPoleNo(t.poleNo || "");
    setEditRegion(t.region || "");
    setEditType(t.type || "");
    setEditLocation(t.location || "");
  };

  const closeEdit = () => {
    setEditingTransformer(null);
  };

  const submitEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const payload = {
        id: editId,
        regions: editRegion,          // backend expects "regions"
        poleNo: editPoleNo,
        transformerNo: editTransformerNo,
        type: editType,
        location: editLocation,
      };

      const res = await fetch(UPDATE_TRANSFORMER_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }

      // Refresh list and close dialog
      await refresh();
      closeEdit();
    } catch (err: any) {
      alert(`Failed to update transformer: ${err?.message || "Unknown error"}`);
    }
  };

  // Calculate stats (case-insensitive status comparison)
  const activeInspectionsCount = inspections.filter(
    (i) => {
      const status = i.status?.toLowerCase();
      return status === "in-progress" || status === "pending" || status === "in progress" || status === "Not started" || status === "not started" || status === "not started";
    }
  ).length;
  
  const completedInspectionsCount = inspections.filter(
    (i) => i.status?.toLowerCase() === "completed"
  ).length;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <div className="text-2xl font-bold text-primary">{transformers.length}</div>
                </div>
                <div className="text-sm text-muted-foreground">Total Transformers</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <div className="text-2xl font-bold text-blue-600">{activeInspectionsCount}</div>
                </div>
                <div className="text-sm text-muted-foreground">Active Inspections</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <div className="text-2xl font-bold text-success">{completedInspectionsCount}</div>
                </div>
                <div className="text-sm text-muted-foreground">Completed Inspections</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <AddInspectionModal
                  trigger={<Button className="w-full">New Inspection</Button>}
                  onAdd={addInspection}
                />
                <div className="text-xs text-muted-foreground mt-2">
                  Initiate a new inspection and record transformer health.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="transformers" className="w-full">
          <div className="flex items-center justify-between">
            <TabsList className="grid w-fit grid-cols-2">
              <TabsTrigger value="transformers">Transformers</TabsTrigger>
              <TabsTrigger value="inspections">Inspections</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              {loading && <span className="text-xs text-muted-foreground">Loading…</span>}
              {error && <span className="text-xs text-destructive">{error}</span>}
              <Button variant="outline" size="sm" onClick={refresh}>Refresh</Button>
            </div>
          </div>

          <TabsContent value="transformers" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Transformers</h2>
                  <AddTransformerModal 
                    trigger={<Button>Add Transformer</Button>}
                    onAdd={addTransformer}
                  />
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input placeholder="Search Transformer" className="pl-10" />
                  </div>
                  <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Regions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-regions">All Regions</SelectItem>
                      {regionOptions.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-types">All Types</SelectItem>
                      {typeOptions.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={() => { setSelectedRegion("all-regions"); setSelectedType("all-types"); }}>
                    Reset Filters
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead></TableHead>
                      <TableHead>Transformer No.</TableHead>
                      <TableHead>Pole No.</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transformers.map((transformer) => (
                      <TableRow key={transformer.id}>
                        <TableCell>
                          <Star className="h-4 w-4 text-muted-foreground" />
                        </TableCell>
                        <TableCell className="font-medium">{transformer.transformerNo}</TableCell>
                        <TableCell>{transformer.poleNo}</TableCell>
                        <TableCell>{transformer.region}</TableCell>
                        <TableCell>{transformer.type}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => openEdit(transformer)}
                            >
                              Edit
                            </Button>
                            <Button 
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteTransformer(transformer.id)}
                              title="Delete transformer"
                              aria-label="Delete transformer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => handleViewTransformer(transformer.id)}
                            >
                              View
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inspections" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">All Inspections</h2>
                  <AddInspectionModal 
                    trigger={<Button>Add Inspection</Button>}
                    onAdd={addInspection}
                  />
                </div>

                {/* Search and Filter Tools */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by Inspection ID or Transformer No..."
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
                      <TableHead>Transformer No.</TableHead>
                      <TableHead>Inspected Date</TableHead>
                      <TableHead>Maintenance Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      // Filter inspections
                      let filtered = inspections.filter((inspection) => {
                        // Search filter
                        const searchLower = inspectionSearchQuery.toLowerCase();
                        const matchesSearch = !inspectionSearchQuery || 
                          (inspection.inspectionNo || inspection.id).toLowerCase().includes(searchLower) ||
                          inspection.transformerNo.toLowerCase().includes(searchLower);

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
                            <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                              No inspections found matching your criteria.
                            </TableCell>
                          </TableRow>
                        );
                      }

                      return paginatedInspections.map((inspection) => (
                        <TableRow key={inspection.id}>
                          <TableCell className="font-medium">{inspection.inspectionNo || inspection.id}</TableCell>
                          <TableCell>{inspection.transformerNo}</TableCell>
                          <TableCell>{inspection.inspectedDate}</TableCell>
                          <TableCell>{inspection.maintenanceDate || "-"}</TableCell>
                          <TableCell>
                            <StatusBadge status={inspection.status as any} />
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
                      (inspection.inspectionNo || inspection.id).toLowerCase().includes(searchLower) ||
                      inspection.transformerNo.toLowerCase().includes(searchLower);
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Transformer Modal */}
      {editingTransformer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-neutral-900 rounded-md shadow-lg w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Transformer</h3>
            <form onSubmit={submitEdit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Transformer No.</label>
                  <Input value={editTransformerNo} onChange={(e) => setEditTransformerNo(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm mb-1">Pole No.</label>
                  <Input value={editPoleNo} onChange={(e) => setEditPoleNo(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm mb-1">Region</label>
                  <Input value={editRegion} onChange={(e) => setEditRegion(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm mb-1">Type</label>
                  <Input value={editType} onChange={(e) => setEditType(e.target.value)} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1">Location</label>
                  <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeEdit}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}