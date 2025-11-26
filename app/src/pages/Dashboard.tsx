import { useEffect, useState, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddTransformerModal } from "@/components/AddTransformerModal";
import { AddInspectionModal } from "@/components/AddInspectionModal";
import { StatusBadge } from "@/components/StatusBadge";
import { Chatbot } from "@/components/Chatbot";
import { AIOverview } from "@/components/AIOverview";
import {
  Search,
  Filter,
  Star,
  Trash2,
  Activity,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Zap,
  ThermometerSun,
  LayoutGrid,
  List,
  ImageIcon,
  Pencil,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api, API_ENDPOINTS } from "@/lib/api";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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

// Helper to safely unwrap ApiResponse<T> or return the raw payload if it's already a list
async function fetchUnwrap<T>(url: string): Promise<T> {
  const res = await api.get(url);
  const body = res.data;
  if (body && Array.isArray(body.responseData)) return body.responseData as T;
  if (body && Array.isArray(body)) return body as T;
  if (body && typeof body === "object" && Array.isArray(body.data))
    return body.data as T;
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
  regions?: string;
  type?: string;
  status?: string;
  location?: string;
  maintenanceDate?: string;
};

const toInspection = (x: ApiItem): Inspection => {
  let maintenanceDate: string | undefined = undefined;
  if (x.maintenanceDate) {
    try {
      if (typeof x.maintenanceDate === "string") {
        const parsed = new Date(x.maintenanceDate);
        if (!isNaN(parsed.getTime())) {
          maintenanceDate = parsed.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          });
        } else {
          maintenanceDate = x.maintenanceDate;
        }
      }
    } catch {
      maintenanceDate = undefined;
    }
  }

  return {
    id: x.id,
    transformerNo: x.transformerNo,
    inspectionNo: x.id,
    inspectedDate:
      x.dateOfInspection && x.time
        ? `${x.dateOfInspection} ${x.time}`
        : x.dateOfInspection ?? undefined,
    maintenanceDate,
    status: x.status,
  };
};

const toTransformer = (x: ApiItem): Transformer => ({
  id: x.id,
  transformerNo: x.transformerNo,
  poleNo: x.poleNo,
  region: (x.region ?? x.regions) || undefined,
  type: x.type,
  location: x.location,
});

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";

  // Track regeneration keys for AI Overview - updates when tab becomes active
  const [aiRegenerateKeys, setAiRegenerateKeys] = useState({
    overview: Date.now(),
    transformers: Date.now(),
    inspections: Date.now(),
  });

  // Update regenerate key when tab changes
  useEffect(() => {
    setAiRegenerateKeys(prev => ({
      ...prev,
      [activeTab]: Date.now(),
    }));
  }, [activeTab]);

  const [transformers, setTransformers] = useState<Transformer[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [regionOptions, setRegionOptions] = useState<string[]>([]);
  const [typeOptions, setTypeOptions] = useState<string[]>([]);

  const [selectedRegion, setSelectedRegion] = useState<string>("all-regions");
  const [selectedType, setSelectedType] = useState<string>("all-types");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const [inspectionSearchQuery, setInspectionSearchQuery] =
    useState<string>("");
  const [inspectionStatusFilter, setInspectionStatusFilter] =
    useState<string>("all-statuses");
  const [currentInspectionPage, setCurrentInspectionPage] = useState<number>(1);
  const inspectionsPerPage = 10;

  const [editingTransformer, setEditingTransformer] =
    useState<Transformer | null>(null);
  const [editId, setEditId] = useState<string>("");
  const [editTransformerNo, setEditTransformerNo] = useState<string>("");
  const [editPoleNo, setEditPoleNo] = useState<string>("");
  const [editRegion, setEditRegion] = useState<string>("");
  const [editType, setEditType] = useState<string>("");
  const [editLocation, setEditLocation] = useState<string>("");

  const loadTransformers = async (region: string, type: string) => {
    const useFilter = region !== "all-regions" || type !== "all-types";
    if (!useFilter) {
      const txRaw = await fetchUnwrap<ApiItem[]>(
        API_ENDPOINTS.TRANSFORMER_VIEW_ALL
      );
      setTransformers((txRaw || []).map(toTransformer));
      return;
    }

    const filterValues: Array<{
      columnName: string;
      operation: string;
      value: any[];
    }> = [];
    if (region !== "all-regions") {
      filterValues.push({
        columnName: "regions",
        operation: "Equal",
        value: [region],
      });
    }
    if (type !== "all-types") {
      filterValues.push({
        columnName: "type",
        operation: "Equal",
        value: [type],
      });
    }

    const payload = {
      filterValues,
      limit: 200,
      offset: 0,
    };

    const res = await api.post(API_ENDPOINTS.TRANSFORMER_FILTER, payload);
    const body = res.data;
    const data: ApiItem[] = Array.isArray(body?.responseData)
      ? body.responseData
      : Array.isArray(body)
      ? body
      : [];
    setTransformers((data || []).map(toTransformer));
  };

  const refresh = async () => {
    try {
      setLoading(true);
      setError(null);
      const [insRaw] = await Promise.all([
        fetchUnwrap<ApiItem[]>(API_ENDPOINTS.INSPECTION_VIEW_ALL),
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
          .map((t) => t.region)
          .filter((x): x is string => Boolean(x && x.trim().length > 0))
      )
    );
    const types = Array.from(
      new Set(
        (transformers || [])
          .map((t) => t.type)
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
    const ok = window.confirm(
      "Are you sure you want to delete this transformer?"
    );
    if (!ok) return;
    try {
      await api.delete(API_ENDPOINTS.TRANSFORMER_DELETE(transformerId));
      setTransformers((prev) => prev.filter((t) => t.id !== transformerId));
    } catch (e: any) {
      alert(`Failed to delete transformer: ${e?.message || "Unknown error"}`);
    }
  };

  const handleViewInspection = (inspectionId: string) => {
    navigate(`/inspection/${inspectionId}`);
  };

  const handleDeleteInspection = async (inspectionId: string) => {
    const ok = window.confirm(
      "Are you sure you want to delete this inspection?"
    );
    if (!ok) return;
    try {
      await api.delete(API_ENDPOINTS.INSPECTION_DELETE(inspectionId));
      setInspections((prev) => prev.filter((i) => i.id !== inspectionId));
    } catch (e: any) {
      alert(`Failed to delete inspection: ${e?.message || "Unknown error"}`);
    }
  };

  const addTransformer = (transformer: Transformer) => {
    setTransformers((prev) => [...prev, transformer]);
    void refresh();
  };

  const addInspection = (inspection: Inspection) => {
    setInspections((prev) => [...prev, inspection]);
    void refresh();
  };

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
        regions: editRegion,
        poleNo: editPoleNo,
        transformerNo: editTransformerNo,
        type: editType,
        location: editLocation,
      };

      await api.put(API_ENDPOINTS.TRANSFORMER_UPDATE, payload);

      await refresh();
      closeEdit();
    } catch (err: any) {
      alert(`Failed to update transformer: ${err?.message || "Unknown error"}`);
    }
  };

  // Calculate stats from real data
  const activeInspectionsCount = inspections.filter((i) => {
    const status = i.status?.toLowerCase();
    return (
      status === "in-progress" ||
      status === "pending" ||
      status === "in progress" ||
      status === "not started"
    );
  }).length;

  const completedInspectionsCount = inspections.filter(
    (i) => i.status?.toLowerCase() === "completed"
  ).length;

  // Calculate anomaly distribution from inspections
  const anomalyStats = {
    faulty: 0,
    potentiallyFaulty: 0,
    normal: 0,
  };

  // Calculate transformer status distribution
  const transformersByStatus = {
    operational: transformers.length - activeInspectionsCount,
    underInspection: activeInspectionsCount,
    maintenance: 0,
    critical: 0,
  };

  // Generate chart data from real inspections
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    return {
      month: date.toLocaleDateString("en-US", { month: "short" }),
      inspections: 0,
      anomalies: 0,
    };
  });

  // Count inspections per month
  inspections.forEach((inspection) => {
    if (inspection.inspectedDate) {
      try {
        const date = new Date(inspection.inspectedDate);
        const monthIndex = last6Months.findIndex((m) => {
          const checkDate = new Date();
          checkDate.setMonth(
            checkDate.getMonth() - (5 - last6Months.indexOf(m))
          );
          return (
            date.getMonth() === checkDate.getMonth() &&
            date.getFullYear() === checkDate.getFullYear()
          );
        });
        if (monthIndex !== -1) {
          last6Months[monthIndex].inspections++;
        }
      } catch (e) {
        // Skip invalid dates
      }
    }
  });

  const anomalyDistribution = [
    { name: "Faulty", value: anomalyStats.faulty || 1, color: "#ef4444" },
    {
      name: "Potentially Faulty",
      value: anomalyStats.potentiallyFaulty || 1,
      color: "#f97316",
    },
    {
      name: "Normal",
      value:
        anomalyStats.normal ||
        completedInspectionsCount -
          anomalyStats.faulty -
          anomalyStats.potentiallyFaulty ||
        1,
      color: "#10b981",
    },
  ];

  const transformerStatusData = [
    { status: "Operational", count: transformersByStatus.operational },
    { status: "Under Inspection", count: transformersByStatus.underInspection },
    { status: "Maintenance", count: transformersByStatus.maintenance },
    { status: "Critical", count: transformersByStatus.critical },
  ];

  // Recent activity from latest inspections
  const recentActivity = inspections.slice(0, 4).map((inspection, index) => ({
    id: index + 1,
    transformer: inspection.transformerNo,
    status: inspection.status || "Pending",
    time: inspection.inspectedDate || "N/A",
  }));

  // Calculate health score
  const totalAnomalies = anomalyStats.faulty + anomalyStats.potentiallyFaulty;
  const healthScore =
    completedInspectionsCount > 0
      ? (
          ((completedInspectionsCount - totalAnomalies) /
            completedInspectionsCount) *
          100
        ).toFixed(1)
      : "N/A";

  // AI Overview context builders for each tab
  const overviewContext = useMemo(() => {
    return `Dashboard Overview Data:
- Total Transformers: ${transformers.length}
- Total Inspections: ${inspections.length}
- Active Inspections: ${activeInspectionsCount}
- Completed Inspections: ${completedInspectionsCount}
- Anomalies Detected: ${totalAnomalies} (Faulty: ${anomalyStats.faulty}, Potentially Faulty: ${anomalyStats.potentiallyFaulty})
- Health Score: ${healthScore}${healthScore !== "N/A" ? "%" : ""}
- Regions covered: ${regionOptions.join(", ") || "N/A"}
- Transformer types: ${typeOptions.join(", ") || "N/A"}
- Recent activity: ${recentActivity.map(a => `${a.transformer}: ${a.status}`).join("; ") || "No recent activity"}`;
  }, [transformers.length, inspections.length, activeInspectionsCount, completedInspectionsCount, totalAnomalies, anomalyStats, healthScore, regionOptions, typeOptions, recentActivity]);

  const transformersContext = useMemo(() => {
    const regionDistribution: Record<string, number> = {};
    const typeDistribution: Record<string, number> = {};
    transformers.forEach(t => {
      if (t.region) regionDistribution[t.region] = (regionDistribution[t.region] || 0) + 1;
      if (t.type) typeDistribution[t.type] = (typeDistribution[t.type] || 0) + 1;
    });
    return `Transformer Fleet Data:
- Total Transformers: ${transformers.length}
- Distribution by Region: ${Object.entries(regionDistribution).map(([r, c]) => `${r}: ${c}`).join(", ") || "N/A"}
- Distribution by Type: ${Object.entries(typeDistribution).map(([t, c]) => `${t}: ${c}`).join(", ") || "N/A"}
- Status: ${transformersByStatus.operational} operational, ${transformersByStatus.underInspection} under inspection
- Sample transformers: ${transformers.slice(0, 5).map(t => `${t.transformerNo} (${t.region || "Unknown region"})`).join(", ")}`;
  }, [transformers, transformersByStatus]);

  const inspectionsContext = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    inspections.forEach(i => {
      const status = i.status || "Unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    const recentInspections = inspections.slice(0, 5);
    return `Inspection Overview Data:
- Total Inspections: ${inspections.length}
- Status Distribution: ${Object.entries(statusCounts).map(([s, c]) => `${s}: ${c}`).join(", ")}
- Active/Pending: ${activeInspectionsCount}
- Completed: ${completedInspectionsCount}
- Recent inspections: ${recentInspections.map(i => `${i.transformerNo || "Unknown"} (${i.status || "Unknown"}, ${i.inspectedDate || "No date"})`).join("; ")}`;
  }, [inspections, activeInspectionsCount, completedInspectionsCount]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Main Navigation Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(val) => setSearchParams({ tab: val })}
          className="w-full"
        >
          <div className="flex items-center justify-between backdrop-blur-xl bg-card/50 border border-border/50 rounded-2xl p-4">
            <TabsList className="grid w-fit grid-cols-3 bg-secondary/80 backdrop-blur-sm border border-border/50">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-orange-500 data-[state=active]:text-white"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="transformers"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-orange-500 data-[state=active]:text-white"
              >
                Transformers
              </TabsTrigger>
              <TabsTrigger
                value="inspections"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-orange-500 data-[state=active]:text-white"
              >
                Inspections
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              {loading && (
                <span className="text-xs text-muted-foreground">Loading…</span>
              )}
              {error && <span className="text-xs text-red-400">{error}</span>}
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                className="backdrop-blur-sm bg-secondary/50 border-border text-foreground hover:bg-secondary"
              >
                Refresh
              </Button>
            </div>
          </div>

          {/* OVERVIEW TAB - Analytics Dashboard */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Header */}
            <div className="backdrop-blur-xl bg-card/80 border border-border/50 rounded-2xl p-6">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Analytics Overview
              </h1>
              <p className="text-muted-foreground">
                Real-time insights into transformer health and inspection status
              </p>
            </div>

            {/* AI Overview */}
            <AIOverview context={overviewContext} pageType="overview" regenerateKey={aiRegenerateKeys.overview} />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="backdrop-blur-xl bg-card/80 border border-border/50 hover:border-orange-500/50 transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Transformers
                  </CardTitle>
                  <ThermometerSun className="h-5 w-5 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">
                    {transformers.length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Active in system</p>
                </CardContent>
              </Card>

              <Card className="backdrop-blur-xl bg-card/80 border border-border/50 hover:border-orange-500/50 transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Inspections
                  </CardTitle>
                  <Activity className="h-5 w-5 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">
                    {inspections.length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeInspectionsCount} in progress
                  </p>
                </CardContent>
              </Card>

              <Card className="backdrop-blur-xl bg-card/80 border border-border/50 hover:border-orange-500/50 transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Anomalies Detected
                  </CardTitle>
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">
                    {totalAnomalies}
                  </div>
                  <p className="text-xs text-red-400 flex items-center mt-1">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {anomalyStats.faulty} critical
                  </p>
                </CardContent>
              </Card>

              <Card className="backdrop-blur-xl bg-card/80 border border-border/50 hover:border-orange-500/50 transition-all">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Health Score
                  </CardTitle>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">
                    {healthScore}
                    {typeof healthScore === "string" && healthScore !== "N/A"
                      ? "%"
                      : ""}
                  </div>
                  <p className="text-xs text-green-500 flex items-center mt-1">
                    <Zap className="h-3 w-3 mr-1" />
                    {typeof healthScore === "number" &&
                    parseFloat(healthScore) > 90
                      ? "Excellent"
                      : "Good"}{" "}
                    condition
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Inspection Trend */}
              <Card className="backdrop-blur-xl bg-card/80 border border-border/50">
                <CardHeader>
                  <CardTitle className="text-foreground">
                    Inspection Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={last6Months}>
                      <defs>
                        <linearGradient
                          id="colorInspections"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#f97316"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#f97316"
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient
                          id="colorAnomalies"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#ef4444"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#ef4444"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                      <XAxis dataKey="month" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          border: "1px solid #374151",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "#f3f4f6" }}
                      />
                      <Legend wrapperStyle={{ color: "#9ca3af" }} />
                      <Area
                        type="monotone"
                        dataKey="inspections"
                        stroke="#f97316"
                        fillOpacity={1}
                        fill="url(#colorInspections)"
                      />
                      <Area
                        type="monotone"
                        dataKey="anomalies"
                        stroke="#ef4444"
                        fillOpacity={1}
                        fill="url(#colorAnomalies)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Anomaly Distribution */}
              <Card className="backdrop-blur-xl bg-card/80 border border-border/50">
                <CardHeader>
                  <CardTitle className="text-foreground">
                    Anomaly Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={anomalyDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {anomalyDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          border: "1px solid #374151",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Transformer Status */}
              <Card className="backdrop-blur-xl bg-card/80 border border-border/50">
                <CardHeader>
                  <CardTitle className="text-foreground">
                    Transformer Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={transformerStatusData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                      <XAxis dataKey="status" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1f2937",
                          border: "1px solid #374151",
                          borderRadius: "8px",
                        }}
                        labelStyle={{ color: "#f3f4f6" }}
                      />
                      <Bar
                        dataKey="count"
                        fill="#f97316"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="backdrop-blur-xl bg-card/80 border border-border/50">
                <CardHeader>
                  <CardTitle className="text-foreground">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.length > 0 ? (
                      recentActivity.map((activity) => (
                        <div
                          key={activity.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                activity.status.toLowerCase() === "critical"
                                  ? "bg-red-500"
                                  : activity.status
                                      .toLowerCase()
                                      .includes("progress")
                                  ? "bg-orange-500"
                                  : "bg-green-500"
                              }`}
                            />
                            <div>
                              <p className="text-foreground font-medium">
                                {activity.transformer}
                              </p>
                              <p className="text-muted-foreground text-sm">
                                {activity.status}
                              </p>
                            </div>
                          </div>
                          <span className="text-muted-foreground text-sm">
                            {activity.time}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        No recent activity
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TRANSFORMERS TAB */}
          <TabsContent value="transformers" className="space-y-4 mt-6">
            {/* AI Overview for Transformers */}
            <AIOverview context={transformersContext} pageType="transformers" regenerateKey={aiRegenerateKeys.transformers} />

            <Card className="backdrop-blur-xl bg-card/80 border border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-foreground">
                    Transformers
                  </h2>
                  <AddTransformerModal
                    trigger={
                      <Button className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600">
                        Add Transformer
                      </Button>
                    }
                    onAdd={addTransformer}
                  />
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search Transformer"
                      className="pl-10 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <Select
                    value={selectedRegion}
                    onValueChange={setSelectedRegion}
                  >
                    <SelectTrigger className="w-48 bg-secondary/50 border-border text-foreground">
                      <SelectValue placeholder="All Regions" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-border">
                      <SelectItem value="all-regions">All Regions</SelectItem>
                      {regionOptions.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-48 bg-secondary/50 border-border text-foreground">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-border">
                      <SelectItem value="all-types">All Types</SelectItem>
                      {typeOptions.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedRegion("all-regions");
                      setSelectedType("all-types");
                    }}
                    className="bg-secondary/50 border-border text-foreground hover:bg-secondary"
                  >
                    Reset Filters
                  </Button>
                  <div className="flex items-center border border-border rounded-md overflow-hidden">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setViewMode("list")}
                      className={`rounded-none h-9 w-9 ${
                        viewMode === "list"
                          ? "bg-secondary text-foreground"
                          : "bg-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setViewMode("grid")}
                      className={`rounded-none h-9 w-9 ${
                        viewMode === "grid"
                          ? "bg-secondary text-foreground"
                          : "bg-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {viewMode === "list" ? (
                  <div className="rounded-lg border border-white/10 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10 hover:bg-secondary/50">
                          <TableHead className="text-muted-foreground"></TableHead>
                          <TableHead className="text-muted-foreground">
                            Transformer No.
                          </TableHead>
                          <TableHead className="text-muted-foreground">
                            Pole No.
                          </TableHead>
                          <TableHead className="text-muted-foreground">
                            Region
                          </TableHead>
                          <TableHead className="text-muted-foreground">
                            Type
                          </TableHead>
                          <TableHead className="text-right text-muted-foreground"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transformers.map((transformer) => (
                          <TableRow
                            key={transformer.id}
                            className="border-white/10 hover:bg-secondary/50"
                          >
                            <TableCell>
                              <Star className="h-4 w-4 text-muted-foreground" />
                            </TableCell>
                            <TableCell className="font-medium text-foreground">
                              {transformer.transformerNo}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {transformer.poleNo}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {transformer.region}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {transformer.type}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEdit(transformer)}
                                  className="bg-secondary/50 border-border text-foreground hover:bg-secondary"
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() =>
                                    handleDeleteTransformer(transformer.id)
                                  }
                                  title="Delete transformer"
                                  aria-label="Delete transformer"
                                  className="text-red-400 hover:bg-red-500/20"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleViewTransformer(transformer.id)
                                  }
                                  className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
                                >
                                  View
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {transformers.map((transformer) => (
                      <Card
                        key={transformer.id}
                        className="overflow-hidden backdrop-blur-xl bg-card/50 border border-border/50 hover:border-orange-500/50 transition-all group"
                      >
                        <div className="aspect-video w-full bg-secondary/30 relative overflow-hidden">
                          <img
                            src={API_ENDPOINTS.IMAGE_BASELINE(
                              transformer.transformerNo
                            )}
                            alt={`Transformer ${transformer.transformerNo}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                              e.currentTarget.nextElementSibling?.classList.remove(
                                "hidden"
                              );
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-secondary/30 hidden">
                            <div className="flex flex-col items-center text-muted-foreground">
                              <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
                              <span className="text-xs">No Image Available</span>
                            </div>
                          </div>
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-8 w-8 bg-black/60 hover:bg-black/80 text-white border-0"
                              onClick={() => openEdit(transformer)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="destructive"
                              className="h-8 w-8 bg-red-500/80 hover:bg-red-600 text-white border-0"
                              onClick={() =>
                                handleDeleteTransformer(transformer.id)
                              }
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold text-foreground truncate">
                                {transformer.transformerNo}
                              </h3>
                              <p className="text-xs text-muted-foreground">
                                {transformer.type || "Unknown Type"}
                              </p>
                            </div>
                            <StatusBadge status="operational" />
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground mb-4">
                            <div className="flex justify-between">
                              <span>Region:</span>
                              <span className="text-foreground">
                                {transformer.region || "N/A"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Pole No:</span>
                              <span className="text-foreground">
                                {transformer.poleNo || "N/A"}
                              </span>
                            </div>
                          </div>
                          <Button
                            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
                            onClick={() =>
                              handleViewTransformer(transformer.id)
                            }
                          >
                            View Details
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* INSPECTIONS TAB */}
          <TabsContent value="inspections" className="space-y-4 mt-6">
            {/* AI Overview for Inspections */}
            <AIOverview context={inspectionsContext} pageType="inspections" regenerateKey={aiRegenerateKeys.inspections} />

            <Card className="backdrop-blur-xl bg-card/80 border border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-foreground">
                    All Inspections
                  </h2>
                  <AddInspectionModal
                    trigger={
                      <Button className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600">
                        Add Inspection
                      </Button>
                    }
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
                        setCurrentInspectionPage(1);
                      }}
                      className="pl-10 bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <Select
                    value={inspectionStatusFilter}
                    onValueChange={(value) => {
                      setInspectionStatusFilter(value);
                      setCurrentInspectionPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[180px] bg-secondary/50 border-border text-foreground">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-border">
                      <SelectItem value="all-statuses">All Statuses</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg border border-white/10 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-secondary/50">
                        <TableHead className="text-muted-foreground">
                          Inspection No
                        </TableHead>
                        <TableHead className="text-muted-foreground">
                          Transformer No.
                        </TableHead>
                        <TableHead className="text-muted-foreground">
                          Inspected Date
                        </TableHead>
                        <TableHead className="text-muted-foreground">
                          Maintenance Date
                        </TableHead>
                        <TableHead className="text-muted-foreground">Status</TableHead>
                        <TableHead className="text-muted-foreground"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        let filtered = inspections.filter((inspection) => {
                          const searchLower =
                            inspectionSearchQuery.toLowerCase();
                          const matchesSearch =
                            !inspectionSearchQuery ||
                            (inspection.inspectionNo || inspection.id)
                              .toLowerCase()
                              .includes(searchLower) ||
                            inspection.transformerNo
                              .toLowerCase()
                              .includes(searchLower);

                          const matchesStatus =
                            inspectionStatusFilter === "all-statuses" ||
                            inspection.status?.toLowerCase() ===
                              inspectionStatusFilter.toLowerCase() ||
                            (inspectionStatusFilter === "in-progress" &&
                              inspection.status
                                ?.toLowerCase()
                                .includes("progress"));

                          return matchesSearch && matchesStatus;
                        });

                        const startIndex =
                          (currentInspectionPage - 1) * inspectionsPerPage;
                        const endIndex = startIndex + inspectionsPerPage;
                        const paginatedInspections = filtered.slice(
                          startIndex,
                          endIndex
                        );

                        if (paginatedInspections.length === 0) {
                          return (
                            <TableRow>
                              <TableCell
                                colSpan={6}
                                className="text-center text-muted-foreground py-8"
                              >
                                No inspections found matching your criteria.
                              </TableCell>
                            </TableRow>
                          );
                        }

                        return paginatedInspections.map((inspection) => (
                          <TableRow
                            key={inspection.id}
                            className="border-white/10 hover:bg-secondary/50"
                          >
                            <TableCell className="font-medium text-foreground">
                              {inspection.inspectionNo || inspection.id}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {inspection.transformerNo}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {inspection.inspectedDate}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {inspection.maintenanceDate || "-"}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={inspection.status as any} />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() =>
                                    handleDeleteInspection(inspection.id)
                                  }
                                  title="Delete inspection"
                                  aria-label="Delete inspection"
                                  className="text-red-400 hover:bg-red-500/20"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleViewInspection(inspection.id)
                                  }
                                  className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
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
                </div>

                {/* Pagination Controls */}
                {(() => {
                  const filtered = inspections.filter((inspection) => {
                    const searchLower = inspectionSearchQuery.toLowerCase();
                    const matchesSearch =
                      !inspectionSearchQuery ||
                      (inspection.inspectionNo || inspection.id)
                        .toLowerCase()
                        .includes(searchLower) ||
                      inspection.transformerNo
                        .toLowerCase()
                        .includes(searchLower);
                    const matchesStatus =
                      inspectionStatusFilter === "all-statuses" ||
                      inspection.status?.toLowerCase() ===
                        inspectionStatusFilter.toLowerCase() ||
                      (inspectionStatusFilter === "in-progress" &&
                        inspection.status?.toLowerCase().includes("progress"));
                    return matchesSearch && matchesStatus;
                  });

                  const totalPages = Math.ceil(
                    filtered.length / inspectionsPerPage
                  );

                  if (totalPages <= 1) return null;

                  return (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                      <div className="text-sm text-muted-foreground">
                        Showing{" "}
                        {(currentInspectionPage - 1) * inspectionsPerPage + 1}{" "}
                        to{" "}
                        {Math.min(
                          currentInspectionPage * inspectionsPerPage,
                          filtered.length
                        )}{" "}
                        of {filtered.length} inspections
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentInspectionPage(1)}
                          disabled={currentInspectionPage === 1}
                          className="bg-secondary/50 border-border text-foreground hover:bg-secondary disabled:opacity-50"
                        >
                          First
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentInspectionPage((prev) =>
                              Math.max(1, prev - 1)
                            )
                          }
                          disabled={currentInspectionPage === 1}
                          className="bg-secondary/50 border-border text-foreground hover:bg-secondary disabled:opacity-50"
                        >
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from(
                            { length: Math.min(5, totalPages) },
                            (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentInspectionPage <= 3) {
                                pageNum = i + 1;
                              } else if (
                                currentInspectionPage >=
                                totalPages - 2
                              ) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentInspectionPage - 2 + i;
                              }

                              return (
                                <Button
                                  key={pageNum}
                                  variant={
                                    currentInspectionPage === pageNum
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() =>
                                    setCurrentInspectionPage(pageNum)
                                  }
                                  className={`w-10 ${
                                    currentInspectionPage === pageNum
                                      ? "bg-gradient-to-r from-orange-600 to-orange-500"
                                      : "bg-secondary/50 border-border text-foreground hover:bg-secondary"
                                  }`}
                                >
                                  {pageNum}
                                </Button>
                              );
                            }
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentInspectionPage((prev) =>
                              Math.min(totalPages, prev + 1)
                            )
                          }
                          disabled={currentInspectionPage === totalPages}
                          className="bg-secondary/50 border-border text-foreground hover:bg-secondary disabled:opacity-50"
                        >
                          Next
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentInspectionPage(totalPages)}
                          disabled={currentInspectionPage === totalPages}
                          className="bg-secondary/50 border-border text-foreground hover:bg-secondary disabled:opacity-50"
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

      {/* Chatbot with context */}
      <Chatbot
        context={{
          transformerCount: transformers.length,
          inspectionCount: inspections.length,
          activeInspections: activeInspectionsCount,
          completedInspections: completedInspectionsCount,
          anomaliesDetected: totalAnomalies,
          healthScore: healthScore,
          currentTab: activeTab,
          recentActivity: recentActivity,
        }}
      />

      {/* Edit Transformer Modal */}
      {editingTransformer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="backdrop-blur-xl bg-black/80 border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-foreground">
              Edit Transformer
            </h3>
            <form onSubmit={submitEdit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1 text-muted-foreground">
                    Transformer No.
                  </label>
                  <Input
                    value={editTransformerNo}
                    onChange={(e) => setEditTransformerNo(e.target.value)}
                    required
                    className="bg-secondary/50 border-border text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-muted-foreground">
                    Pole No.
                  </label>
                  <Input
                    value={editPoleNo}
                    onChange={(e) => setEditPoleNo(e.target.value)}
                    className="bg-secondary/50 border-border text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-muted-foreground">
                    Region
                  </label>
                  <Input
                    value={editRegion}
                    onChange={(e) => setEditRegion(e.target.value)}
                    className="bg-secondary/50 border-border text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1 text-muted-foreground">
                    Type
                  </label>
                  <Input
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="bg-secondary/50 border-border text-foreground"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1 text-muted-foreground">
                    Location
                  </label>
                  <Input
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="bg-secondary/50 border-border text-foreground"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeEdit}
                  className="bg-secondary/50 border-border text-foreground hover:bg-secondary"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
