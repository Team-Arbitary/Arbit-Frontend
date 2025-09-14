import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft, Upload, Eye, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const INSPECTION_DETAIL_URL = (id: string) => `http://localhost:5509/transformer-thermal-inspection/inspection-management/view/${id}`;
const IMAGE_UPLOAD_URL = `http://localhost:5509/transformer-thermal-inspection/image-inspection-management/upload`;
const BASELINE_FETCH_URL = (transformerNo: string) => `http://localhost:5509/transformer-thermal-inspection/image-inspection-management/baseline/${transformerNo}`;

const THERMAL_FETCH_URL = (inspectionNo: string) => `http://localhost:5509/transformer-thermal-inspection/image-inspection-management/thermal/${inspectionNo}`;

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
  status: "in-progress" | "pending" | "completed" | "Not started" | "Completed" | string;
};

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
          status: (data?.status ?? "in-progress") as InspectionView["status"],
        };
        if (!cancelled) setInspection(mapped);
      } catch (e) {
        console.error(e);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [id]);

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
    const inspNo = inspection.id;
    if (!inspNo || inspNo === "-") return;

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
        } catch (_) {
          // Non-JSON response that isn't an image — leave thermal image unset
        }
      } catch (e) {
        console.error('Failed to fetch thermal image:', e);
        // Keep upload buttons visible by leaving thermalImage as null
      }
    })();
  }, [inspection.id]);

  const progressSteps = [
    { title: "Thermal Image Upload", status: "pending" },
    { title: "AI Analysis", status: "pending" },
    { title: "Thermal Image Review", status: "pending" },
  ];

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
              <span className="text-primary-foreground font-bold">T</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{inspection.branch}</h1>
              <p className="text-muted-foreground">
                Last updated: {inspection.lastUpdated}
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <StatusBadge status={inspection.status} />
            <Button onClick={() => handleUpload('baseline')}>
              <Upload className="h-4 w-4 mr-2" />
              Baseline Image
            </Button>
          </div>
        </div>

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
            {/* Thermal Image Upload/Comparison */}
            {(baselineImage && thermalImage) ? (
              <Card>
                <CardHeader>
                  <CardTitle>Thermal Image Comparison</CardTitle>
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
                      <div className="aspect-video bg-primary/5 rounded-lg border-2 border-dashed border-primary/20 flex items-center justify-center">
                        {thermalImage ? (
                          <img 
                            src={thermalImage} 
                            alt="Current thermal image" 
                            className="w-full h-full object-cover rounded-lg"
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
                      <div className="aspect-video bg-primary/5 rounded-lg border-2 border-dashed border-primary/20 flex items-center justify-center">
                        {baselineImage ? (
                          <img 
                            src={baselineImage} 
                            alt="Baseline thermal image" 
                            className="w-full h-full object-cover rounded-lg"
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
            </Card>
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
                  <div className="aspect-video bg-primary/5 rounded-lg border-2 border-dashed border-primary/20 flex items-center justify-center">
                    {baselineImage ? (
                      <img 
                        src={baselineImage} 
                        alt="Baseline thermal image" 
                        className="w-full h-full object-cover rounded-lg"
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
                  {progressSteps.map((step, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-warning rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-medium">!</span>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{step.title}</div>
                        <StatusBadge status="pending" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}