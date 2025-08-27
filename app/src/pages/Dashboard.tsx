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
import { Search, Filter, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

// --- Types for API data ---
type Transformer = {
  id: string;
  transformerNo: string;
  poleNo?: string;
  region?: string;
  type?: string;
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
const TRANSFORMERS_URL = "http://localhost:5509/transformer-thermal-inspection/transformer-management/view-all";
const INSPECTIONS_URL = "http://localhost:5509/transformer-thermal-inspection/inspection-management/view-all";
const TRANSFORMERS_FILTER_URL = "http://localhost:5509/transformer-thermal-inspection/transformer-management/filter";

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
};

const toInspection = (x: ApiItem): Inspection => ({
  id: x.id,
  transformerNo: x.transformerNo,
  inspectionNo: undefined,
  inspectedDate: x.dateOfInspection && x.time ? `${x.dateOfInspection} ${x.time}` : x.dateOfInspection ?? undefined,
  maintenanceDate: undefined,
  status: "pending",
});

const toTransformer = (x: ApiItem): Transformer => ({
  id: x.id,
  transformerNo: x.transformerNo,
  poleNo: x.poleNo,
  region: (x.region ?? x.regions) || undefined, // support both singular and plural keys
  type: x.type,     // backend sample doesn't provide; leave undefined
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
      filterValues.push({ columnName: "regions", operation: "eq", value: [region] });
    }
    if (type !== "all-types") {
      filterValues.push({ columnName: "type", operation: "eq", value: [type] });
    }

    const payload = {
      filterValues,
      limit: 200, // sensible default page size
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

  const handleViewInspection = (inspectionId: string) => {
    navigate(`/inspection/${inspectionId}`);
  };

  const addTransformer = (transformer: Transformer) => {
    setTransformers([...transformers, transformer]);
  };

  const addInspection = (inspection: Inspection) => {
    setInspections([...inspections, inspection]);
  };

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
                <div className="text-xs text-muted-foreground mt-1">Count: 1428</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <div className="text-2xl font-bold text-success">59</div>
                </div>
                <div className="text-sm text-muted-foreground">Currently Operating</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <div className="text-2xl font-bold text-warning">8</div>
                </div>
                <div className="text-sm text-muted-foreground">Maintenance Required</div>
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
                      <TableHead></TableHead>
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
                        <TableCell>
                          <Button 
                            size="sm" 
                            onClick={() => handleViewTransformer(transformer.id)}
                          >
                            View
                          </Button>
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

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transformer No.</TableHead>
                      <TableHead>Inspection No</TableHead>
                      <TableHead>Inspected Date</TableHead>
                      <TableHead>Maintenance Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inspections.map((inspection) => (
                      <TableRow key={inspection.id}>
                        <TableCell className="font-medium">{inspection.transformerNo}</TableCell>
                        <TableCell>{inspection.inspectionNo}</TableCell>
                        <TableCell>{inspection.inspectedDate}</TableCell>
                        <TableCell>{inspection.maintenanceDate}</TableCell>
                        <TableCell>
                          <StatusBadge status={inspection.status} />
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm"
                            onClick={() => handleViewInspection(inspection.id)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}