import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { AddInspectionModal } from "@/components/AddInspectionModal";
import { ArrowLeft, Star, Eye, Trash2 } from "lucide-react";

const INSPECTION_VIEW_URL = (id: string) => `http://localhost:5509/transformer-thermal-inspection/transformer-management/view/${id}`;
const INSPECTION_LIST_URL = "http://localhost:5509/transformer-thermal-inspection/inspection-management/view-all";

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
  const { id } = useParams();
  const navigate = useNavigate();
  const [inspections, setInspections] = useState<typeof inspectionData>([]);
  const [transformer, setTransformer] = useState<TransformerView | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
          status: "in-progress",
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
          const iso = it.dateOfInspection && it.time ? `${it.dateOfInspection}T${it.time}` : it.dateOfInspection;
          let inspectedDate = "-";
          try {
            inspectedDate = iso ? new Date(iso).toLocaleString() : "-";
          } catch {}
          return {
            id: String(it.id ?? crypto.randomUUID?.() ?? Math.random()),
            inspectionNo: String(it.batch ?? it.id ?? "-"),
            inspectedDate,
            maintenanceDate: "-",
            status: "in-progress" as const,
          };
        };

        const filtered = (data || []).filter(sameTx).map(toDisplay);
        if (!cancelled) setInspections(filtered);
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

  const addInspection = (inspection: any) => {
    setInspections([...inspections, { ...inspection, id: Date.now().toString() }]);
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
              <h1 className="text-2xl font-bold">{transformer.transformerNo ?? "-"}</h1>
              <p className="text-muted-foreground">
                Last updated: {transformer.lastInspected ?? "-"}
              </p>
            </div>
          </div>
          <div className="ml-auto">
            <StatusBadge status={transformer.status} />
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
            <CardContent className="p-4 flex items-center gap-3">
              <Button className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                Baseline Image
                
              </Button>
              <Button variant="outline" size="icon">
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
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
            />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
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
                    <TableCell>
                      <Star className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell className="font-medium">{inspection.inspectionNo}</TableCell>
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
      </div>
    </Layout>
  );
}