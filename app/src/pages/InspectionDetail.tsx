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

type ApiEnvelope<T> = { responseCode?: string; responseDescription?: string; responseData?: T } | T;

type InspectionView = {
  id: string;
  transformerNo?: string;
  batch?: string;
  lastUpdated?: string;
  status: "in-progress" | "pending" | "completed" | string;
};

export default function InspectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [baselineImage, setBaselineImage] = useState<string | null>(null);
  const [thermalImage, setThermalImage] = useState<string | null>(null);
  const [weatherCondition, setWeatherCondition] = useState("sunny");

  const [inspection, setInspection] = useState<InspectionView>({
    id: id ?? "-",
    transformerNo: "-",
    batch: "-",
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
          batch: data?.batch ?? "-",
          lastUpdated,
          status: data?.progress ?? "in-progress",
        };
        if (!cancelled) setInspection(mapped);
      } catch (e) {
        console.error(e);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [id]);

  const progressSteps = [
    { title: "Thermal Image Upload", status: "pending" },
    { title: "AI Analysis", status: "pending" },
    { title: "Thermal Image Review", status: "pending" },
  ];

  const handleFileUpload = async (file: File, type: 'baseline' | 'thermal') => {
    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          
          // Create a preview URL for the uploaded file
          const previewUrl = URL.createObjectURL(file);
          if (type === 'baseline') {
            setBaselineImage(previewUrl);
          } else {
            setThermalImage(previewUrl);
          }
          
          toast({
            title: "Upload Complete",
            description: `${type === 'baseline' ? 'Baseline' : 'Thermal'} image uploaded successfully.`,
          });
          
          return 100;
        }
        return prev + 10;
      });
    }, 200);
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
              <h1 className="text-2xl font-bold">{inspection.batch}</h1>
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
              <div className="font-semibold">{inspection.batch}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-sm text-muted-foreground">Inspected By</div>
              <div className="font-semibold">{inspection.inspectedBy}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side - Details and Thermal Upload */}
          <div className="lg:col-span-2 space-y-6">
            {/* Thermal Image Upload/Comparison */}
            {(baselineImage || thermalImage) ? (
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
                            <Button variant="outline" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon">
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
                      <h3 className="text-lg font-medium mb-2">Thermal image uploading.</h3>
                      <p className="text-muted-foreground mb-4">
                        Thermal image is being uploaded and Reviewed.
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
                            <Select value={weatherCondition} onValueChange={setWeatherCondition}>
                              <SelectTrigger className="w-full max-w-xs mx-auto">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="sunny">Sunny</SelectItem>
                                <SelectItem value="cloudy">Cloudy</SelectItem>
                                <SelectItem value="rainy">Rainy</SelectItem>
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
                  <Button onClick={() => handleUpload('baseline')} className="w-full">
                    <Upload className="h-4 w-4 mr-2" />
                    {baselineImage ? 'Replace Baseline' : 'Upload Baseline'}
                  </Button>
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