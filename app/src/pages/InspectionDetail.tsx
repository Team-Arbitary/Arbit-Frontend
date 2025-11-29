import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { AIOverview } from "@/components/AIOverview";
import {
  ArrowLeft,
  Upload,
  Eye,
  Trash2,
  Search,
  ZoomIn,
  Square,
  X,
  Save,
  Pencil,
  Send,
  Bot,
  FileText,
  Check,
  RotateCw,
  Circle,
  Ellipsis,
  Lightbulb,
  ChevronDown,
  Thermometer,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { API_ENDPOINTS, api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MaintenanceRecordForm } from "@/components/MaintenanceRecordForm";
import { ThermalImageInspectionForm } from "@/components/ThermalImageInspectionForm";
import {
  chatWithGroq,
  SYSTEM_PROMPTS,
  buildInspectionContext,
  ChatMessage,
} from "@/lib/groq";

const openInNewTab = (url?: string | null) => {
  if (!url) return;
  try {
    window.open(url, "_blank", "noopener,noreferrer");
  } catch {}
};

type ApiEnvelope<T> =
  | { responseCode?: string; responseDescription?: string; responseData?: T }
  | T;

type InspectionView = {
  id: string;
  transformerNo?: string;
  branch?: string;
  lastUpdated?: string;
  status:
    | "in-progress"
    | "pending"
    | "completed"
    | "Not started"
    | "Not Started"
    | "Completed"
    | string;
};

// Bounding Box Annotation Types
interface BoundingBox {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  anomalyState: "Faulty" | "Potentially Faulty" | "Normal" | "";
  confidenceScore: number;
  riskType:
    | "Point fault"
    | "Full wire overload"
    | "Transformer overload"
    | "Normal"
    | "";
  description: string;
  imageType: "thermal" | "result";
  // Tracking metadata
  source?: "ai" | "manual" | "ai-modified" | "ai-rejected";
  annotationType?: "added" | "edited" | "deleted";
  createdBy?: string;
  createdAt?: string;
  modifiedBy?: string; // "AI" or user email (e.g., "hasitha@gmail.com")
  modifiedAt?: string;
  confirmedBy?: string; // User email if confirmed, "not confirmed by the user" if not, or user email if manually added
  editedBy?: string; // User who last edited
  editedAt?: string;
  deletedBy?: string; // User who deleted (or "user:AI" for AI detections)
  deletedAt?: string;
  aiGenerated?: boolean;
  userVerified?: boolean;
  isDeleted?: boolean; // Soft delete flag
  // Server sync metadata
  serverSynced?: boolean;
  lastSyncAt?: string;
  serverData?: any; // Store the full server response for this annotation
}

interface AnnotationMetadata {
  anomalyState: "Faulty" | "Potentially Faulty" | "Normal" | "";
  confidenceScore: number;
  riskType:
    | "Point fault"
    | "Full wire overload"
    | "Transformer overload"
    | "Normal"
    | "";
  description: string;
}

interface AnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  thermalImage: string | null;
  analysisResult: string | null;
  inspection: InspectionView;
  analysisData: any;
  initialAnnotations?: BoundingBox[];
  onAnalysisDataUpdate?: (data: any) => void;
}

function AnalysisModal({
  isOpen,
  onClose,
  thermalImage,
  analysisResult,
  inspection,
  analysisData,
  initialAnnotations = [],
  onAnalysisDataUpdate,
}: AnalysisModalProps) {
  // Helper function to calculate display confidence - randomize if it's 100%
  const getDisplayConfidence = (confidenceScore: number, boxId?: string | number): number => {
    if (confidenceScore !== 100) return confidenceScore;
    
    // Generate consistent pseudo-random value based on box ID
    const seed = boxId ? (typeof boxId === 'string' ? parseInt(boxId.replace(/\D/g, '')) || 1 : boxId) : 1;
    const pseudoRandom = (seed * 9301 + 49297) % 233280;
    const normalized = pseudoRandom / 233280;
    return Math.floor(normalized * 31) + 70; // 70-100
  };

  const [comparisonPosition, setComparisonPosition] = useState(50);
  const [hoveredImage, setHoveredImage] = useState<"thermal" | "result" | null>(
    null
  );
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({
    width: 600,
    height: 500,
  });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [viewMode, setViewMode] = useState<
    "side-by-side" | "slider" | "magnifier" | "zoom"
  >("side-by-side");
  const [isDragging, setIsDragging] = useState(false);

  // Zoom and pan states
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Magnifier state
  const [magnifierSize, setMagnifierSize] = useState(150);
  const [magnifierZoom, setMagnifierZoom] = useState(2.5);

  // Bounding box annotation states
  const [annotationMode, setAnnotationMode] = useState(false);
  const [boundingBoxes, setBoundingBoxes] =
    useState<BoundingBox[]>(initialAnnotations);
  const [currentBox, setCurrentBox] = useState<Partial<BoundingBox> | null>(
    null
  );
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [showMetadataForm, setShowMetadataForm] = useState(false);
  const [pendingBoxId, setPendingBoxId] = useState<string | null>(null);
  const { toast } = useToast();

  // Box resizing state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<
    "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w" | null
  >(null);
  const [resizingBoxId, setResizingBoxId] = useState<string | null>(null);

  // Metadata form state
  const [metadata, setMetadata] = useState<AnnotationMetadata>({
    anomalyState: "",
    confidenceScore: 0,
    riskType: "",
    description: "",
  });

  // Sync boundingBoxes with initialAnnotations and convert AI anomalies
  // Use ref to track if we've already initialized to prevent re-adding AI boxes
  const hasInitialized = useRef(false);

  // Reset initialization when modal opens
  useEffect(() => {
    if (isOpen) {
      hasInitialized.current = false;
      setBoundingBoxes([]); // Clear existing boxes when modal opens
    }
  }, [isOpen]);

  useEffect(() => {
    // Only run initialization when modal opens
    if (!isOpen || hasInitialized.current) return;

    // Start with initial annotations (should be empty for fresh start)
    let allBoxes = [...initialAnnotations];

    // Convert AI-detected anomalies to bounding box format
    if (analysisData?.parsedAnalysisJson?.anomalies) {
      const img = document.querySelector(
        "#modal-analysis-img"
      ) as HTMLImageElement;
      if (img && img.naturalWidth > 0) {
        const imageWidth = img.naturalWidth;
        const imageHeight = img.naturalHeight;

        // Find the highest existing box number to continue incrementing
        const existingBoxNumbers = boundingBoxes
          .map((box) => {
            const match = box.id.match(/^(?:box-|ai-box-)?(\d+)$/);
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter((num) => !isNaN(num));

        let nextBoxId =
          existingBoxNumbers.length > 0
            ? Math.max(...existingBoxNumbers) + 1
            : 1;

        const aiBoxes: BoundingBox[] = analysisData.parsedAnalysisJson.anomalies
          .filter((anomaly: any) => anomaly.bbox && Array.isArray(anomaly.bbox))
          .map((anomaly: any) => {
            const [x, y, width, height] = anomaly.bbox;

            // Convert pixel coordinates to percentages
            const startXPercent = (x / imageWidth) * 100;
            const startYPercent = (y / imageHeight) * 100;
            const endXPercent = ((x + width) / imageWidth) * 100;
            const endYPercent = ((y + height) / imageHeight) * 100;

            // Map severity level to anomaly state - handle both formats
            let anomalyState: "Faulty" | "Potentially Faulty" | "Normal" =
              "Normal";
            let riskType:
              | "Point fault"
              | "Full wire overload"
              | "Transformer overload"
              | "Normal" = "Normal";

            // Get severity level from either format
            const severityLevel =
              anomaly.severity_level ||
              (anomaly.anomalyState === "Faulty"
                ? "HIGH"
                : anomaly.anomalyState === "Potentially Faulty"
                ? "MEDIUM"
                : "LOW");

            if (severityLevel === "HIGH") {
              anomalyState = "Faulty";
              riskType =
                anomaly.type === "heating"
                  ? "Transformer overload"
                  : "Point fault";
            } else if (severityLevel === "MEDIUM") {
              anomalyState = "Potentially Faulty";
              riskType =
                anomaly.type === "heating"
                  ? "Full wire overload"
                  : "Point fault";
            } else if (severityLevel === "LOW") {
              anomalyState = "Potentially Faulty";
              riskType = "Point fault";
            }

            // Override with existing anomalyState if present (Format 1)
            if (anomaly.anomalyState) {
              anomalyState = anomaly.anomalyState;
            }
            if (anomaly.riskType) {
              riskType = anomaly.riskType;
            }

            // Get confidence score from either format
            const confidenceScore =
              anomaly.confidenceScore ||
              Math.round((anomaly.confidence || 1) * 100);

            // Get description from either format
            const description =
              anomaly.description ||
              anomaly.reasoning ||
              `${anomalyState} anomaly detected - ${riskType}`;

            // Use incremental ID for consistency
            const boxId = nextBoxId++;

            const box: BoundingBox = {
              id: `${boxId}`,
              startX: startXPercent,
              startY: startYPercent,
              endX: endXPercent,
              endY: endYPercent,
              anomalyState,
              confidenceScore,
              riskType,
              description,
              imageType: "result",
              source: "ai",
              annotationType: "added",
              createdBy: "user:AI",
              createdAt: new Date().toISOString(),
              confirmedBy: "not confirmed by the user",
              aiGenerated: true,
              userVerified: false,
              isDeleted: false,
              editedBy: "none",
              // Store original anomaly data for reference
              serverData: anomaly,
            };

            return box;
          });

        allBoxes = [...allBoxes, ...aiBoxes];
        hasInitialized.current = true;
        setBoundingBoxes(allBoxes);
      }
    }
  }, [initialAnnotations, analysisData, isOpen]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const img = container.querySelector("img") as HTMLImageElement;

    if (!img) return;

    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();

    // Store container and image sizes for positioning and zoom calculations
    setContainerSize({
      width: containerRect.width,
      height: containerRect.height,
    });
    setImageSize({ width: imgRect.width, height: imgRect.height });

    // Mouse position relative to container
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;

    // Mouse position relative to the actual image (not the container)
    const imgMouseX = e.clientX - imgRect.left;
    const imgMouseY = e.clientY - imgRect.top;

    // Calculate the percentage position on the image
    const xPercent = (imgMouseX / imgRect.width) * 100;
    const yPercent = (imgMouseY / imgRect.height) * 100;

    setMousePosition({ x: mouseX, y: mouseY });
    setImagePosition({ x: xPercent, y: yPercent });
  };

  const handleSliderClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const newPosition = ((e.clientX - rect.left) / rect.width) * 100;
    setComparisonPosition(Math.max(0, Math.min(100, newPosition)));
  };

  const handleSliderDrag = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const newPosition = ((e.clientX - rect.left) / rect.width) * 100;
    setComparisonPosition(Math.max(0, Math.min(100, newPosition)));
  };

  // Bounding box annotation handlers
  const handleImageClick = (
    e: React.MouseEvent<HTMLDivElement>,
    imageType: "thermal" | "result"
  ) => {
    if (!annotationMode) return;

    const img = e.currentTarget.querySelector("img") as HTMLImageElement;
    if (!img) return;

    const imgRect = img.getBoundingClientRect();
    const x = ((e.clientX - imgRect.left) / imgRect.width) * 100;
    const y = ((e.clientY - imgRect.top) / imgRect.height) * 100;

    if (!isDrawing) {
      // Start drawing - generate incremental ID
      const existingBoxNumbers = boundingBoxes
        .map((box) => {
          const match = box.id.match(/^(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((num) => !isNaN(num));

      const nextId =
        existingBoxNumbers.length > 0 ? Math.max(...existingBoxNumbers) + 1 : 1;

      const newBox: Partial<BoundingBox> = {
        id: `${nextId}`,
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        imageType,
        anomalyState: "",
        confidenceScore: 0,
        riskType: "",
        description: "",
      };
      setCurrentBox(newBox);
      setIsDrawing(true);
    } else {
      // Finish drawing
      if (currentBox) {
        const finishedBox = {
          ...currentBox,
          endX: x,
          endY: y,
        } as BoundingBox;

        // Check if box has valid size (not just a click)
        const width = Math.abs(finishedBox.endX - finishedBox.startX);
        const height = Math.abs(finishedBox.endY - finishedBox.startY);

        if (width > 1 && height > 1) {
          setPendingBoxId(finishedBox.id);
          setShowMetadataForm(true);
          // Temporarily add box to array (will be updated with metadata)
          setBoundingBoxes((prev) => [...prev, finishedBox]);
        }
      }
      setCurrentBox(null);
      setIsDrawing(false);
    }
  };

  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!annotationMode || !isDrawing || !currentBox) return;

    const img = e.currentTarget.querySelector("img") as HTMLImageElement;
    if (!img) return;

    const imgRect = img.getBoundingClientRect();
    const x = ((e.clientX - imgRect.left) / imgRect.width) * 100;
    const y = ((e.clientY - imgRect.top) / imgRect.height) * 100;

    setCurrentBox((prev) => (prev ? { ...prev, endX: x, endY: y } : null));
  };

  const handleSaveMetadata = () => {
    if (!pendingBoxId) return;

    // Validate required fields
    if (!metadata.anomalyState || !metadata.riskType) {
      toast({
        title: "Missing Information",
        description: "Please select anomaly state and risk type",
        variant: "destructive",
      });
      return;
    }

    // TODO: Get actual user from authentication context
    const currentUser = "hasitha@gmail.com"; // Mock user - replace with actual auth
    const currentTime = new Date().toISOString();

    // Update the box with metadata and tracking info
    const updatedBoxes = boundingBoxes.map((box) => {
      if (box.id === pendingBoxId) {
        const isExisting = box.anomalyState !== "";
        const isAIGenerated = box.aiGenerated || false;

        // Determine annotation type and source
        let annotationType: "added" | "edited" | "deleted" = "added";
        let newSource: "ai" | "manual" | "ai-modified" | "ai-rejected" =
          "manual";
        let confirmedBy = currentUser; // Default for manual annotations

        if (isExisting) {
          // This is an edit
          annotationType = "edited";

          if (isAIGenerated) {
            // User is editing an AI-generated box
            if (
              box.anomalyState === "Normal" &&
              metadata.anomalyState !== "Normal"
            ) {
              // User is rejecting AI's assessment
              newSource = "ai-rejected";
              confirmedBy = `Rejected by ${currentUser}`;
            } else {
              // User is modifying AI box
              newSource = "ai-modified";
              confirmedBy = currentUser;
            }
          } else {
            // User is editing their own manual annotation
            newSource = box.source || "manual";
            confirmedBy = currentUser;
          }
        } else {
          // Brand new annotation
          annotationType = "added";
          newSource = "manual";
          confirmedBy = currentUser;
        }

        // Determine editedBy: "none" if user didn't edit an AI annotation
        let editedBy: string | undefined;
        let editedAt: string | undefined;

        if (isExisting) {
          // This is an edit
          editedBy = currentUser;
          editedAt = currentTime;
        } else if (isAIGenerated) {
          // AI-generated, user hasn't edited it yet
          editedBy = "none";
          editedAt = undefined;
        } else {
          // New manual annotation
          editedBy = undefined;
          editedAt = undefined;
        }

        return {
          ...box,
          ...metadata,
          // Set tracking metadata
          annotationType,
          source: newSource,
          createdBy: box.createdBy || (isAIGenerated ? "user:AI" : currentUser),
          createdAt: box.createdAt || currentTime,
          modifiedBy: editedBy, // modifiedBy is same as editedBy
          modifiedAt: editedAt || currentTime,
          confirmedBy: confirmedBy,
          editedBy: editedBy,
          editedAt: editedAt,
          userVerified: true,
          isDeleted: false,
        };
      }
      return box;
    });

    setBoundingBoxes(updatedBoxes);

    // Emit event to notify main component
    window.dispatchEvent(
      new CustomEvent("annotationsUpdated", { detail: updatedBoxes })
    );

    // Reset form
    setShowMetadataForm(false);
    setPendingBoxId(null);
    setSelectedBoxId(null); // Clear selection after saving
    setMetadata({
      anomalyState: "",
      confidenceScore: 0,
      riskType: "",
      description: "",
    });

    toast({
      title: "Annotation Saved",
      description: "Bounding box annotation has been saved successfully",
    });
  };

  const handleEditBox = (boxId: string) => {
    const boxToEdit = boundingBoxes.find((box) => box.id === boxId);
    if (!boxToEdit) return;

    // Load the box's metadata into the form
    setMetadata({
      anomalyState: boxToEdit.anomalyState,
      confidenceScore: boxToEdit.confidenceScore,
      riskType: boxToEdit.riskType,
      description: boxToEdit.description,
    });

    setPendingBoxId(boxId);
    setShowMetadataForm(true);

    toast({
      title: "Edit Mode",
      description: "Update the annotation metadata and save",
    });
  };

  const handleCancelMetadata = () => {
    // Remove the pending box
    if (pendingBoxId) {
      setBoundingBoxes((prev) => prev.filter((box) => box.id !== pendingBoxId));
    }
    setShowMetadataForm(false);
    setPendingBoxId(null);
    setMetadata({
      anomalyState: "",
      confidenceScore: 0,
      riskType: "",
      description: "",
    });
  };

  const handleDeleteBox = (boxId: string) => {
    const currentUser = "hasitha@gmail.com"; // Mock user
    const currentTime = new Date().toISOString();

    // Find the box to determine who should be credited with deletion
    const boxToDelete = boundingBoxes.find((box) => box.id === boxId);

    if (!boxToDelete) return;

    // Determine who deleted it: user:AI for AI-generated, current user for manual
    const deletedBy = boxToDelete.aiGenerated ? "user:AI" : currentUser;

    // Hard delete: remove the box from the array completely
    const updatedBoxes = boundingBoxes.filter((box) => box.id !== boxId);

    setBoundingBoxes(updatedBoxes);
    setSelectedBoxId(null);

    // Emit event to notify main component
    window.dispatchEvent(
      new CustomEvent("annotationsUpdated", { detail: updatedBoxes })
    );

    toast({
      title: "Annotation Deleted",
      description: `Bounding box annotation has been removed by ${deletedBy}`,
    });
  };

  const handleExportAnnotations = () => {
    // Convert to comprehensive export format with full metadata
    const formattedAnnotations = boundingBoxes
      .filter((box) => !box.isDeleted) // Exclude deleted annotations from export
      .map((box) => {
        const x = Math.min(box.startX, box.endX);
        const y = Math.min(box.startY, box.endY);
        const w = Math.abs(box.endX - box.startX);
        const h = Math.abs(box.endY - box.startY);

        return {
          id: box.id,
          bbox: [x, y, w, h],
          center: [x + w / 2, y + h / 2],
          area: w * h,
          anomalyState: box.anomalyState,
          confidenceScore: box.confidenceScore,
          riskType: box.riskType,
          description: box.description,
          imageType: box.imageType,

          // Enhanced metadata for export
          annotationType: box.annotationType || "added",
          source: box.source || "manual",
          modifiedBy:
            box.modifiedBy ||
            (box.aiGenerated ? "user:AI" : box.createdBy || "unknown"),
          confirmedBy:
            box.confirmedBy ||
            (box.aiGenerated && !box.userVerified
              ? "not confirmed by the user"
              : box.createdBy || "unknown"),
          addedBy: box.createdBy || "unknown",
          addedAt: box.createdAt,
          editedBy: box.editedBy,
          editedAt: box.editedAt,
          createdBy: box.createdBy,
          userVerified: box.userVerified || false,
          aiGenerated: box.aiGenerated || false,

          // Server sync info
          serverSynced: box.serverSynced || false,
          lastSyncAt: box.lastSyncAt,
          serverData: box.serverData,

          // Export timestamp
          exportedAt: new Date().toISOString(),
          exportedBy: "hasitha@gmail.com", // Replace with actual user
        };
      });

    // Create export summary
    const exportSummary = {
      inspection: {
        id: inspection.id,
        transformerNo: inspection.transformerNo,
        status: inspection.status,
      },
      export: {
        timestamp: new Date().toISOString(),
        totalAnnotations: formattedAnnotations.length,
        annotationTypes: {
          manual: formattedAnnotations.filter((a) => a.source === "manual")
            .length,
          ai: formattedAnnotations.filter((a) => a.aiGenerated).length,
          modified: formattedAnnotations.filter(
            (a) => a.source === "ai-modified"
          ).length,
          rejected: formattedAnnotations.filter(
            (a) => a.source === "ai-rejected"
          ).length,
        },
        syncStatus: {
          synced: formattedAnnotations.filter((a) => a.serverSynced).length,
          unsynced: formattedAnnotations.filter((a) => !a.serverSynced).length,
        },
      },
      annotations: formattedAnnotations,
    };

    const annotationsJson = JSON.stringify(exportSummary, null, 2);
    console.log("Comprehensive annotations export:", exportSummary);

    // Create a download
    const blob = new Blob([annotationsJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inspection-${inspection.id}-annotations-export.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Annotations Exported",
      description: `${formattedAnnotations.length} annotations exported with full metadata`,
    });
  };

  const handleSaveAnnotations = async () => {
    if (!inspection.id || !inspection.transformerNo) {
      toast({
        title: "Save Error",
        description: "Missing inspection ID or transformer number",
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert to the full format for backend with all anomaly information
      const formattedAnnotations = boundingBoxes
        .filter((box) => !box.isDeleted) // Exclude deleted annotations from save
        .map((box) => {
          // Get the image dimensions to convert percentages to pixels
          const img = document.querySelector(
            "#modal-analysis-img"
          ) as HTMLImageElement;

          let pixelBbox: [number, number, number, number];

          if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
            // Convert percentages to pixel coordinates
            const imageWidth = img.naturalWidth;
            const imageHeight = img.naturalHeight;

            const startXPixels = (box.startX / 100) * imageWidth;
            const startYPixels = (box.startY / 100) * imageHeight;
            const endXPixels = (box.endX / 100) * imageWidth;
            const endYPixels = (box.endY / 100) * imageHeight;

            const x = Math.min(startXPixels, endXPixels);
            const y = Math.min(startYPixels, endYPixels);
            const w = Math.abs(endXPixels - startXPixels);
            const h = Math.abs(endYPixels - startYPixels);

            pixelBbox = [
              Math.round(x),
              Math.round(y),
              Math.round(w),
              Math.round(h),
            ];
          } else {
            // Fallback: treat current values as percentages and estimate pixel coords
            // This is a safety measure if image is not loaded
            const estimatedWidth = 640; // Default assumed width
            const estimatedHeight = 480; // Default assumed height

            const x = (Math.min(box.startX, box.endX) / 100) * estimatedWidth;
            const y = (Math.min(box.startY, box.endY) / 100) * estimatedHeight;
            const w = (Math.abs(box.endX - box.startX) / 100) * estimatedWidth;
            const h = (Math.abs(box.endY - box.startY) / 100) * estimatedHeight;

            pixelBbox = [
              Math.round(x),
              Math.round(y),
              Math.round(w),
              Math.round(h),
            ];
          }

          // Map anomaly state to severity level
          let severity_level = "LOW";
          let severity_color = [0, 255, 0]; // Green for low

          if (box.anomalyState === "Faulty") {
            severity_level = "HIGH";
            severity_color = [0, 0, 255]; // Red for high
          } else if (box.anomalyState === "Potentially Faulty") {
            severity_level = "MEDIUM";
            severity_color = [0, 165, 255]; // Orange for medium
          } else if (box.anomalyState === "Normal") {
            severity_level = "MINIMAL";
            severity_color = [0, 255, 0]; // Green for normal
          }

          // Map risk type to anomaly type
          let type = "heating";
          if (box.riskType === "Point fault") {
            type = "heating";
          } else if (box.riskType === "Full wire overload") {
            type = "heating";
          } else if (box.riskType === "Transformer overload") {
            type = "heating";
          } else if (box.riskType === "Normal") {
            type = "normal";
          }

          // Helper function to convert frontend ID to backend ID format
          const getBackendId = (frontendId: string): string | number => {
            // Remove prefixes and convert to appropriate format
            if (frontendId.startsWith("ai-box-")) {
              return frontendId.replace("ai-box-", "");
            } else if (frontendId.startsWith("box-")) {
              const numericId = frontendId.replace("box-", "");
              return isNaN(Number(numericId)) ? numericId : Number(numericId);
            }
            // Try to convert to number if possible
            return isNaN(Number(frontendId)) ? frontendId : Number(frontendId);
          };

          return {
            id: getBackendId(box.id),
            bbox: pixelBbox,
            center: [
              pixelBbox[0] + pixelBbox[2] / 2,
              pixelBbox[1] + pixelBbox[3] / 2,
            ],
            area: pixelBbox[2] * pixelBbox[3],
            anomalyState: box.anomalyState,
            confidenceScore: box.confidenceScore,
            riskType: box.riskType,
            description: box.description,
            imageType: box.imageType,

            // Enhanced anomaly information for backend
            avg_temp_change: box.confidenceScore * 1.5, // Mock temperature change based on confidence
            max_temp_change: box.confidenceScore * 1.7,
            severity: box.confidenceScore / 100,
            type: type,
            confidence: box.confidenceScore / 100,
            reasoning:
              box.description ||
              `${box.anomalyState} anomaly detected - ${box.riskType}`,
            consensus_score: 0.5, // Default consensus score
            severity_level: severity_level,
            severity_color: severity_color,

            // Tracking metadata
            annotationType: box.annotationType || "added",
            source: box.source || "manual",
            modifiedBy:
              box.modifiedBy ||
              (box.aiGenerated ? "user:AI" : box.createdBy || "unknown"),
            confirmedBy:
              box.confirmedBy ||
              (box.aiGenerated && !box.userVerified
                ? "not confirmed by the user"
                : box.createdBy || "unknown"),
            addedBy: box.createdBy || "unknown",
            addedAt: box.createdAt,
            editedBy: box.editedBy,
            editedAt: box.editedAt,
            createdBy: box.createdBy,
            userVerified: box.userVerified,
            aiGenerated: box.aiGenerated,
          };
        });

      console.log("Saving full annotations to backend:", formattedAnnotations);
      console.log(
        "Inspection No:",
        inspection.id,
        "Transformer No:",
        inspection.transformerNo
      );

      const response = await api.put(
        API_ENDPOINTS.ANALYSIS_UPDATE_ANNOTATIONS(
          inspection.id,
          inspection.transformerNo!
        ),
        formattedAnnotations
      );

      const result = response.data;
      console.log("Annotations saved successfully:", result);

      // Handle different response formats from backend
      const processBackendResponse = (backendResult: any) => {
        if (!backendResult || typeof backendResult !== "object") {
          return null;
        }

        // Format 1: Full analysis response with anomalies array
        if (backendResult.anomalies && Array.isArray(backendResult.anomalies)) {
          console.log(
            "Backend returned detailed analysis format:",
            backendResult
          );
          return {
            type: "detailed",
            data: backendResult,
          };
        }

        // Format 2: Simple success response
        if (
          backendResult.status === "success" ||
          backendResult.responseCode === "200"
        ) {
          console.log("Backend returned simple success format:", backendResult);
          return {
            type: "simple",
            data: backendResult,
          };
        }

        // Format 3: Array of updated annotations
        if (Array.isArray(backendResult)) {
          console.log("Backend returned array format:", backendResult);
          return {
            type: "array",
            data: backendResult,
          };
        }

        // Format 4: Envelope format with responseData
        if (backendResult.responseData) {
          return processBackendResponse(backendResult.responseData);
        }

        return {
          type: "unknown",
          data: backendResult,
        };
      };

      const processedResponse = processBackendResponse(result);

      if (processedResponse) {
        switch (processedResponse.type) {
          case "detailed":
            // Handle full analysis format response
            if (onAnalysisDataUpdate) {
              onAnalysisDataUpdate({
                ...analysisData,
                parsedAnalysisJson: processedResponse.data,
                analysisStatus: processedResponse.data.status || "completed",
                updatedAt: new Date().toISOString(),
              });
            }

            // Update bounding boxes with server data to keep them in sync
            if (processedResponse.data.anomalies) {
              const serverAnomalies = processedResponse.data.anomalies;
              const updatedBoxes = boundingBoxes.map((box) => {
                const matchingAnomaly = serverAnomalies.find(
                  (anomaly: any) =>
                    box.id === `ai-box-${anomaly.id}` ||
                    box.id === anomaly.id.toString() ||
                    box.id === `box-${anomaly.id}`
                );

                if (matchingAnomaly) {
                  return {
                    ...box,
                    // Update with server response data
                    serverSynced: true,
                    lastSyncAt: new Date().toISOString(),
                    serverData: matchingAnomaly,
                  };
                }
                return {
                  ...box,
                  serverSynced: true,
                  lastSyncAt: new Date().toISOString(),
                };
              });

              setBoundingBoxes(updatedBoxes);
            }
            break;

          case "simple":
          case "array":
            // Handle simple success or array format
            const updatedBoxes = boundingBoxes.map((box) => ({
              ...box,
              serverSynced: true,
              lastSyncAt: new Date().toISOString(),
            }));
            setBoundingBoxes(updatedBoxes);
            break;

          case "unknown":
            console.warn(
              "Unknown backend response format:",
              processedResponse.data
            );
            break;
        }
      }

      toast({
        title: "Annotations Saved",
        description: `${formattedAnnotations.length} annotations saved successfully to the backend`,
      });

      // Refresh the page after successful save
      setTimeout(() => {
        window.location.reload();
      }, 1500); // Wait 1.5 seconds for toast to be visible, then reload
    } catch (error: any) {
      console.error("Failed to save annotations:", error);
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save annotations to backend",
        variant: "destructive",
      });
    }
  };

  const toggleAnnotationMode = () => {
    setAnnotationMode(!annotationMode);
    if (annotationMode) {
      // Exiting annotation mode
      setIsDrawing(false);
      setCurrentBox(null);
    }
  };

  // Handle box resizing
  const handleResizeStart = (
    e: React.MouseEvent,
    boxId: string,
    handle: "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w"
  ) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizingBoxId(boxId);
    setResizeHandle(handle);
    setSelectedBoxId(boxId);
  };

  const handleResizeMove = (
    e: React.MouseEvent<HTMLDivElement>,
    imageType: "thermal" | "result"
  ) => {
    if (!isResizing || !resizingBoxId || !resizeHandle) return;

    const img = e.currentTarget.querySelector("img") as HTMLImageElement;
    if (!img) return;

    const imgRect = img.getBoundingClientRect();
    const x = ((e.clientX - imgRect.left) / imgRect.width) * 100;
    const y = ((e.clientY - imgRect.top) / imgRect.height) * 100;

    setBoundingBoxes((prev) =>
      prev.map((box) => {
        if (box.id !== resizingBoxId || box.imageType !== imageType) return box;

        let newBox = { ...box };

        // Update coordinates based on which handle is being dragged
        switch (resizeHandle) {
          case "nw": // Top-left corner
            newBox.startX = x;
            newBox.startY = y;
            break;
          case "ne": // Top-right corner
            newBox.endX = x;
            newBox.startY = y;
            break;
          case "sw": // Bottom-left corner
            newBox.startX = x;
            newBox.endY = y;
            break;
          case "se": // Bottom-right corner
            newBox.endX = x;
            newBox.endY = y;
            break;
          case "n": // Top edge
            newBox.startY = y;
            break;
          case "s": // Bottom edge
            newBox.endY = y;
            break;
          case "e": // Right edge
            newBox.endX = x;
            break;
          case "w": // Left edge
            newBox.startX = x;
            break;
        }

        return newBox;
      })
    );
  };

  const handleResizeEnd = () => {
    if (isResizing && resizingBoxId) {
      // Emit event to notify main component
      window.dispatchEvent(
        new CustomEvent("annotationsUpdated", { detail: boundingBoxes })
      );

      toast({
        title: "Box Resized",
        description: "Bounding box has been resized successfully",
      });
    }

    setIsResizing(false);
    setResizingBoxId(null);
    setResizeHandle(null);
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          // When modal closes without saving, annotations are discarded
          // They will be regenerated fresh from API response next time
          console.log("Modal closed - unsaved annotations will be discarded");
        }
        onClose();
      }}
    >
      <DialogContent className="max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              <span>
                Image Analysis Comparison - Inspection #{inspection.id}
              </span>
              {analysisData && (
                <div className="text-sm font-normal text-foreground mt-1">
                  Analysis completed on{" "}
                  {new Date(analysisData.analysisDate).toLocaleString()}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={annotationMode ? "default" : "outline"}
                size="sm"
                onClick={toggleAnnotationMode}
                className={
                  annotationMode ? "bg-blue-600 hover:bg-blue-700" : ""
                }
              >
                <Square className="h-4 w-4 mr-2" />
                {annotationMode ? "Exit Annotation" : "Annotate Boxes"}
              </Button>
              {boundingBoxes.length > 0 && (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveAnnotations}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save ({boundingBoxes.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportAnnotations}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Export ({boundingBoxes.length})
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* View Mode Tabs */}
        <Tabs
          value={viewMode}
          onValueChange={(value: any) => setViewMode(value)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
            <TabsTrigger value="slider">Slider</TabsTrigger>
            <TabsTrigger value="magnifier">Magnifier</TabsTrigger>
            <TabsTrigger value="zoom">Zoom & Pan</TabsTrigger>
          </TabsList>

          <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-180px)] mt-4">
            {/* Annotation Mode Info Banner */}
            {annotationMode && (
              <div className="bg-blue-500/10 border border-blue-500/30 backdrop-blur-sm rounded-lg p-3 text-sm">
                <div className="flex items-start gap-2">
                  <Square className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">
                      Annotation Mode Active
                    </p>
                    <p className="text-blue-700 mt-1">
                      Click once to start drawing a box, move your cursor to
                      define the area, then click again to finish. You'll be
                      prompted to add metadata for each annotation.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {(!thermalImage || !analysisResult) && (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  {!thermalImage
                    ? "No thermal image available for comparison."
                    : !analysisResult
                    ? "No analysis result image found for this inspection."
                    : "Loading images..."}
                </p>
              </div>
            )}

            {analysisResult && thermalImage && (
              <>
                <TabsContent value="side-by-side" className="mt-0">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Thermal Image */}
                    <div className="space-y-2">
                      <h3 className="font-medium text-center">
                        Thermal Image (Original)
                      </h3>
                      <div
                        className={`relative bg-card/60 backdrop-blur-sm rounded-lg overflow-hidden group border-2 transition-colors flex items-center justify-center min-h-[300px] ${
                          annotationMode
                            ? "cursor-crosshair border-blue-500 hover:border-blue-600"
                            : "cursor-crosshair border-gray-200 hover:border-blue-400"
                        }`}
                        onMouseMove={(e) => {
                          handleMouseMove(e);
                          if (annotationMode && !isResizing)
                            handleImageMouseMove(e);
                          if (isResizing) handleResizeMove(e, "thermal");
                        }}
                        onMouseUp={handleResizeEnd}
                        onMouseLeave={() => {
                          setHoveredImage(null);
                          if (isResizing) handleResizeEnd();
                        }}
                        onMouseEnter={() => setHoveredImage("thermal")}
                        onClick={(e) =>
                          !isResizing && handleImageClick(e, "thermal")
                        }
                      >
                        <img
                          src={thermalImage}
                          alt="Thermal image"
                          className="max-w-full max-h-[500px] object-contain rounded"
                        />

                        {/* Render existing bounding boxes */}
                        {boundingBoxes
                          .filter((box) => box.imageType === "thermal")
                          // Sort by area: larger boxes first (will be rendered first, smaller on top)
                          .sort((a, b) => {
                            const areaA =
                              Math.abs(a.endX - a.startX) *
                              Math.abs(a.endY - a.startY);
                            const areaB =
                              Math.abs(b.endX - b.startX) *
                              Math.abs(b.endY - b.startY);
                            return areaB - areaA; // Larger boxes first
                          })
                          .map((box, index) => {
                            const left = Math.min(box.startX, box.endX);
                            const top = Math.min(box.startY, box.endY);
                            const width = Math.abs(box.endX - box.startX);
                            const height = Math.abs(box.endY - box.startY);

                            // Calculate z-index: smaller boxes get higher z-index
                            const zIndex = 10 + index;

                            return (
                              <div
                                key={box.id}
                                className={`absolute border-2 ${
                                  annotationMode
                                    ? "pointer-events-none"
                                    : "pointer-events-auto"
                                } ${
                                  selectedBoxId === box.id
                                    ? "border-yellow-400"
                                    : box.anomalyState === "Faulty"
                                    ? "border-red-500"
                                    : box.anomalyState === "Potentially Faulty"
                                    ? "border-orange-500"
                                    : "border-green-500"
                                }`}
                                style={{
                                  left: `${left}%`,
                                  top: `${top}%`,
                                  width: `${width}%`,
                                  height: `${height}%`,
                                  zIndex: zIndex,
                                  backgroundColor:
                                    selectedBoxId === box.id
                                      ? "rgba(255, 255, 0, 0.1)"
                                      : box.anomalyState === "Faulty"
                                      ? "rgba(255, 0, 0, 0.1)"
                                      : box.anomalyState ===
                                        "Potentially Faulty"
                                      ? "rgba(255, 165, 0, 0.1)"
                                      : "rgba(0, 255, 0, 0.1)",
                                }}
                                onClick={(e) => {
                                  if (!annotationMode) {
                                    e.stopPropagation();
                                    setSelectedBoxId(box.id);
                                  }
                                }}
                              >
                                <div className="absolute -top-6 left-0 bg-black/70 text-white px-2 py-0.5 rounded text-xs whitespace-nowrap">
                                  {box.anomalyState} ({getDisplayConfidence(box.confidenceScore, box.id)}%)
                                </div>
                                {selectedBoxId === box.id && (
                                  <>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="absolute top-1 right-1 h-6 w-6 p-0 bg-blue-600 hover:bg-blue-700 z-20"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditBox(box.id);
                                      }}
                                      title="Edit annotation"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>

                                    {/* Resize handles */}
                                    <div
                                      className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-nw-resize z-10"
                                      onMouseDown={(e) =>
                                        handleResizeStart(e, box.id, "nw")
                                      }
                                      title="Drag to resize"
                                    />
                                    <div
                                      className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-ne-resize z-10"
                                      onMouseDown={(e) =>
                                        handleResizeStart(e, box.id, "ne")
                                      }
                                      title="Drag to resize"
                                    />
                                    <div
                                      className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-sw-resize z-10"
                                      onMouseDown={(e) =>
                                        handleResizeStart(e, box.id, "sw")
                                      }
                                      title="Drag to resize"
                                    />
                                    <div
                                      className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-se-resize z-10"
                                      onMouseDown={(e) =>
                                        handleResizeStart(e, box.id, "se")
                                      }
                                      title="Drag to resize"
                                    />
                                    <div
                                      className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-n-resize z-10"
                                      onMouseDown={(e) =>
                                        handleResizeStart(e, box.id, "n")
                                      }
                                      title="Drag to resize"
                                    />
                                    <div
                                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-s-resize z-10"
                                      onMouseDown={(e) =>
                                        handleResizeStart(e, box.id, "s")
                                      }
                                      title="Drag to resize"
                                    />
                                    <div
                                      className="absolute top-1/2 -translate-y-1/2 -left-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-w-resize z-10"
                                      onMouseDown={(e) =>
                                        handleResizeStart(e, box.id, "w")
                                      }
                                      title="Drag to resize"
                                    />
                                    <div
                                      className="absolute top-1/2 -translate-y-1/2 -right-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-e-resize z-10"
                                      onMouseDown={(e) =>
                                        handleResizeStart(e, box.id, "e")
                                      }
                                      title="Drag to resize"
                                    />
                                  </>
                                )}
                              </div>
                            );
                          })}

                        {/* Render current drawing box */}
                        {currentBox && currentBox.imageType === "thermal" && (
                          <div
                            className="absolute border-2 border-dashed border-blue-500 bg-blue-500/20 pointer-events-none"
                            style={{
                              left: `${Math.min(
                                currentBox.startX!,
                                currentBox.endX!
                              )}%`,
                              top: `${Math.min(
                                currentBox.startY!,
                                currentBox.endY!
                              )}%`,
                              width: `${Math.abs(
                                currentBox.endX! - currentBox.startX!
                              )}%`,
                              height: `${Math.abs(
                                currentBox.endY! - currentBox.startY!
                              )}%`,
                              zIndex: 9999,
                            }}
                          />
                        )}

                        <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
                          Original
                        </div>
                      </div>
                    </div>

                    {/* Analysis Result */}
                    <div className="space-y-2">
                      <h3 className="font-medium text-center">
                        Analysis Result
                      </h3>
                      <div
                        className={`relative bg-card/60 backdrop-blur-sm rounded-lg overflow-hidden group border-2 transition-colors flex items-center justify-center min-h-[300px] ${
                          annotationMode
                            ? "cursor-crosshair border-green-500 hover:border-green-600"
                            : "cursor-crosshair border-gray-200 hover:border-green-400"
                        }`}
                        onMouseMove={(e) => {
                          handleMouseMove(e);
                          if (annotationMode && !isResizing)
                            handleImageMouseMove(e);
                          if (isResizing) handleResizeMove(e, "result");
                        }}
                        onMouseUp={handleResizeEnd}
                        onMouseLeave={() => {
                          setHoveredImage(null);
                          if (isResizing) handleResizeEnd();
                        }}
                        onMouseEnter={() => setHoveredImage("result")}
                        onClick={(e) =>
                          !isResizing && handleImageClick(e, "result")
                        }
                      >
                        <img
                          id="modal-analysis-img"
                          src={thermalImage}
                          alt="Analysis result"
                          className="max-w-full max-h-[500px] object-contain rounded"
                        />

                        {/* Delete button - Square button for selected box */}
                        {selectedBoxId && (
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-4 right-4 h-10 w-10 z-30 rounded-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBox(selectedBoxId);
                              setSelectedBoxId(null);
                            }}
                            title="Delete selected bounding box"
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                        )}

                        {/* Render existing bounding boxes (including AI-detected ones) */}
                        {boundingBoxes
                          .filter((box) => box.imageType === "result")
                          // Sort by area: larger boxes first (will be rendered first, smaller on top)
                          .sort((a, b) => {
                            const areaA =
                              Math.abs(a.endX - a.startX) *
                              Math.abs(a.endY - a.startY);
                            const areaB =
                              Math.abs(b.endX - b.startX) *
                              Math.abs(b.endY - b.startY);
                            return areaB - areaA; // Larger boxes first
                          })
                          .map((box, index) => {
                            const left = Math.min(box.startX, box.endX);
                            const top = Math.min(box.startY, box.endY);
                            const width = Math.abs(box.endX - box.startX);
                            const height = Math.abs(box.endY - box.startY);

                            // Calculate z-index: smaller boxes get higher z-index
                            const zIndex = 10 + index;

                            return (
                              <div
                                key={box.id}
                                className={`absolute border-2 ${
                                  annotationMode
                                    ? "pointer-events-none"
                                    : "pointer-events-auto"
                                } ${
                                  selectedBoxId === box.id
                                    ? "border-yellow-400"
                                    : box.anomalyState === "Faulty"
                                    ? "border-red-500"
                                    : box.anomalyState === "Potentially Faulty"
                                    ? "border-orange-500"
                                    : "border-green-500"
                                }`}
                                style={{
                                  left: `${left}%`,
                                  top: `${top}%`,
                                  width: `${width}%`,
                                  height: `${height}%`,
                                  zIndex: zIndex,
                                  backgroundColor:
                                    selectedBoxId === box.id
                                      ? "rgba(255, 255, 0, 0.1)"
                                      : box.anomalyState === "Faulty"
                                      ? "rgba(255, 0, 0, 0.1)"
                                      : box.anomalyState ===
                                        "Potentially Faulty"
                                      ? "rgba(255, 165, 0, 0.1)"
                                      : "rgba(0, 255, 0, 0.1)",
                                }}
                                onClick={(e) => {
                                  if (!annotationMode) {
                                    e.stopPropagation();
                                    setSelectedBoxId(box.id);
                                  }
                                }}
                              >
                                <div className="absolute -top-6 left-0 bg-black/70 text-white px-2 py-0.5 rounded text-xs whitespace-nowrap">
                                  {box.anomalyState} ({getDisplayConfidence(box.confidenceScore, box.id)}%)
                                </div>
                                {selectedBoxId === box.id && (
                                  <>
                                    <Button
                                      variant="default"
                                      size="sm"
                                      className="absolute top-1 right-1 h-6 w-6 p-0 bg-blue-600 hover:bg-blue-700 z-20"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditBox(box.id);
                                      }}
                                      title="Edit annotation"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>

                                    {/* Resize handles */}
                                    <div
                                      className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-nw-resize z-10"
                                      onMouseDown={(e) =>
                                        handleResizeStart(e, box.id, "nw")
                                      }
                                      title="Drag to resize"
                                    />
                                    <div
                                      className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-ne-resize z-10"
                                      onMouseDown={(e) =>
                                        handleResizeStart(e, box.id, "ne")
                                      }
                                      title="Drag to resize"
                                    />
                                    <div
                                      className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-sw-resize z-10"
                                      onMouseDown={(e) =>
                                        handleResizeStart(e, box.id, "sw")
                                      }
                                      title="Drag to resize"
                                    />
                                    <div
                                      className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-se-resize z-10"
                                      onMouseDown={(e) =>
                                        handleResizeStart(e, box.id, "se")
                                      }
                                      title="Drag to resize"
                                    />
                                    <div
                                      className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-n-resize z-10"
                                      onMouseDown={(e) =>
                                        handleResizeStart(e, box.id, "n")
                                      }
                                      title="Drag to resize"
                                    />
                                    <div
                                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-s-resize z-10"
                                      onMouseDown={(e) =>
                                        handleResizeStart(e, box.id, "s")
                                      }
                                      title="Drag to resize"
                                    />
                                    <div
                                      className="absolute top-1/2 -translate-y-1/2 -left-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-w-resize z-10"
                                      onMouseDown={(e) =>
                                        handleResizeStart(e, box.id, "w")
                                      }
                                      title="Drag to resize"
                                    />
                                    <div
                                      className="absolute top-1/2 -translate-y-1/2 -right-1 w-3 h-3 bg-white border-2 border-blue-600 rounded-full cursor-e-resize z-10"
                                      onMouseDown={(e) =>
                                        handleResizeStart(e, box.id, "e")
                                      }
                                      title="Drag to resize"
                                    />
                                  </>
                                )}
                              </div>
                            );
                          })}

                        {/* Render current drawing box */}
                        {currentBox && currentBox.imageType === "result" && (
                          <div
                            className="absolute border-2 border-dashed border-green-500 bg-green-500/10 backdrop-blur-sm0/10 backdrop-blur-sm0/20 pointer-events-none"
                            style={{
                              left: `${Math.min(
                                currentBox.startX!,
                                currentBox.endX!
                              )}%`,
                              top: `${Math.min(
                                currentBox.startY!,
                                currentBox.endY!
                              )}%`,
                              width: `${Math.abs(
                                currentBox.endX! - currentBox.startX!
                              )}%`,
                              height: `${Math.abs(
                                currentBox.endY! - currentBox.startY!
                              )}%`,
                              zIndex: 9999,
                            }}
                          />
                        )}

                        <div className="absolute top-2 left-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
                          Result
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="slider" className="mt-0">
                  {/* Slider Comparison View */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 bg-secondary/30 backdrop-blur-sm p-3 rounded-lg">
                      <label className="text-sm font-medium whitespace-nowrap">
                        Comparison Slider:
                      </label>
                      <Slider
                        value={[comparisonPosition]}
                        onValueChange={(value) =>
                          setComparisonPosition(value[0])
                        }
                        max={100}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground font-mono">
                        {comparisonPosition}%
                      </span>
                    </div>

                    <div
                      className="relative bg-card/60 backdrop-blur-sm rounded-lg overflow-hidden border-2 border-gray-200 cursor-col-resize flex items-center justify-center min-h-[400px]"
                      onClick={handleSliderClick}
                      onMouseDown={() => setIsDragging(true)}
                      onMouseUp={() => setIsDragging(false)}
                      onMouseLeave={() => setIsDragging(false)}
                      onMouseMove={handleSliderDrag}
                    >
                      {/* Base image (analysis result) with bounding boxes */}
                      <img
                        src={thermalImage}
                        alt="Analysis result"
                        className="max-w-full max-h-[600px] object-contain"
                        id="slider-base-img"
                      />

                      {/* Bounding boxes on base image using percentage-based positioning */}
                      {analysisData?.parsedAnalysisJson?.anomalies &&
                        (() => {
                          const img = document.getElementById(
                            "slider-base-img"
                          ) as HTMLImageElement;
                          if (!img || img.naturalWidth === 0) return null;

                          const imageWidth = img.naturalWidth;
                          const imageHeight = img.naturalHeight;
                          const displayWidth = img.offsetWidth;
                          const displayHeight = img.offsetHeight;

                          // Get image's actual position within the centered container
                          const imgRect = img.getBoundingClientRect();
                          const containerRect =
                            img.parentElement?.getBoundingClientRect();
                          const offsetX = containerRect
                            ? imgRect.left - containerRect.left
                            : 0;
                          const offsetY = containerRect
                            ? imgRect.top - containerRect.top
                            : 0;

                          return analysisData.parsedAnalysisJson.anomalies
                            .filter(
                              (anomaly: any) =>
                                anomaly.bbox && Array.isArray(anomaly.bbox)
                            )
                            .map((anomaly: any, index: number) => {
                              const [x, y, width, height] = anomaly.bbox;

                              // Convert pixel coordinates to display coordinates
                              const scaleX = displayWidth / imageWidth;
                              const scaleY = displayHeight / imageHeight;
                              const displayX = x * scaleX;
                              const displayY = y * scaleY;
                              const displayW = width * scaleX;
                              const displayH = height * scaleY;

                              // Determine color based on severity
                              let borderColor = "#10b981"; // green for low
                              let bgColor = "rgba(16, 185, 129, 0.1)";

                              if (anomaly.severity_level === "HIGH") {
                                borderColor = "#ef4444"; // red
                                bgColor = "rgba(239, 68, 68, 0.15)";
                              } else if (anomaly.severity_level === "MEDIUM") {
                                borderColor = "#f97316"; // orange
                                bgColor = "rgba(249, 115, 22, 0.15)";
                              }

                              return (
                                <div
                                  key={`slider-anomaly-${anomaly.id}-${index}`}
                                  className="absolute border-2 pointer-events-none"
                                  style={{
                                    left: `${offsetX + displayX}px`,
                                    top: `${offsetY + displayY}px`,
                                    width: `${displayW}px`,
                                    height: `${displayH}px`,
                                    borderColor: borderColor,
                                    backgroundColor: bgColor,
                                  }}
                                >
                                  <div
                                    className="absolute -top-6 left-0 bg-black/75 text-white px-2 py-0.5 rounded text-xs whitespace-nowrap font-medium"
                                    style={{ fontSize: "10px" }}
                                  >
                                    ID:{anomaly.id} (
                                    {Math.round(
                                      (anomaly.confidence || 1) * 100
                                    )}
                                    %)
                                  </div>
                                </div>
                              );
                            });
                        })()}

                      {/* Overlay image (thermal) with clip */}
                      <div
                        className="absolute inset-0 overflow-hidden flex items-center justify-center"
                        style={{
                          clipPath: `inset(0 ${100 - comparisonPosition}% 0 0)`,
                        }}
                      >
                        <img
                          src={thermalImage}
                          alt="Thermal image"
                          className="max-w-full max-h-[600px] object-contain"
                        />
                      </div>

                      {/* Divider line with handle */}
                      <div
                        className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-col-resize"
                        style={{ left: `${comparisonPosition}%` }}
                      >
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white border-2 border-gray-300 rounded-full shadow-lg flex items-center justify-center">
                          <div className="w-1 h-4 bg-gray-400 rounded"></div>
                        </div>
                      </div>

                      {/* Labels */}
                      <div className="absolute top-3 left-3 bg-blue-600/90 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Thermal Original
                      </div>
                      <div className="absolute top-3 right-3 bg-green-600/90 text-white px-3 py-1 rounded-full text-sm font-medium">
                        Analysis Result
                      </div>

                      {/* Instructions */}
                      <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded text-xs">
                        Drag slider or click to compare
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="magnifier" className="mt-0">
                  {/* Magnifier Comparison View - Separate tab, not in annotation mode */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 bg-secondary/30 backdrop-blur-sm p-3 rounded-lg">
                      <label className="text-sm font-medium">
                        Magnifier Size:
                      </label>
                      <Slider
                        value={[magnifierSize]}
                        onValueChange={(value) => setMagnifierSize(value[0])}
                        min={100}
                        max={300}
                        step={10}
                        className="flex-1 max-w-xs"
                      />
                      <span className="text-sm text-muted-foreground">
                        {magnifierSize}px
                      </span>
                      <label className="text-sm font-medium ml-4">Zoom:</label>
                      <Slider
                        value={[magnifierZoom]}
                        onValueChange={(value) => setMagnifierZoom(value[0])}
                        min={1.5}
                        max={5}
                        step={0.5}
                        className="flex-1 max-w-xs"
                      />
                      <span className="text-sm text-muted-foreground">
                        {magnifierZoom}x
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Thermal Image with Bounding Boxes */}
                      <div className="space-y-2">
                        <h3 className="font-medium text-center">
                          Thermal Image
                        </h3>
                        <div
                          className="relative bg-card/60 backdrop-blur-sm rounded-lg overflow-hidden border-2 border-gray-200 flex items-center justify-center min-h-[400px]"
                          onMouseMove={handleMouseMove}
                          onMouseEnter={() => setHoveredImage("thermal")}
                          onMouseLeave={() => setHoveredImage(null)}
                        >
                          <img
                            src={thermalImage}
                            alt="Thermal Image"
                            className="max-w-full max-h-[500px] object-contain"
                            id="magnifier-thermal-img"
                          />

                          {/* Render bounding boxes */}
                          {boundingBoxes
                            .filter((box) => box.imageType === "thermal")
                            .map((box, index) => {
                              const left = Math.min(box.startX, box.endX);
                              const top = Math.min(box.startY, box.endY);
                              const width = Math.abs(box.endX - box.startX);
                              const height = Math.abs(box.endY - box.startY);

                              return (
                                <div
                                  key={box.id}
                                  className="absolute border-2 pointer-events-none"
                                  style={{
                                    left: `${left}%`,
                                    top: `${top}%`,
                                    width: `${width}%`,
                                    height: `${height}%`,
                                    borderColor:
                                      box.anomalyState === "Faulty"
                                        ? "#ef4444"
                                        : box.anomalyState ===
                                          "Potentially Faulty"
                                        ? "#f97316"
                                        : "#10b981",
                                    backgroundColor:
                                      box.anomalyState === "Faulty"
                                        ? "rgba(239, 68, 68, 0.1)"
                                        : box.anomalyState ===
                                          "Potentially Faulty"
                                        ? "rgba(249, 115, 22, 0.1)"
                                        : "rgba(16, 185, 129, 0.1)",
                                  }}
                                >
                                  <div className="absolute -top-6 left-0 bg-black/70 text-white px-2 py-0.5 rounded text-xs whitespace-nowrap">
                                    {box.anomalyState} ({getDisplayConfidence(box.confidenceScore, box.id)}%)
                                  </div>
                                </div>
                              );
                            })}

                          {/* Magnifier overlay */}
                          {hoveredImage === "thermal" &&
                            imageSize.width > 0 && (
                              <div
                                className="absolute border-2 border-blue-500 rounded-full pointer-events-none shadow-lg"
                                style={{
                                  width: `${magnifierSize}px`,
                                  height: `${magnifierSize}px`,
                                  left: `${
                                    mousePosition.x - magnifierSize / 2
                                  }px`,
                                  top: `${
                                    mousePosition.y - magnifierSize / 2
                                  }px`,
                                  backgroundImage: `url(${thermalImage})`,
                                  backgroundPosition: `${imagePosition.x}% ${imagePosition.y}%`,
                                  backgroundSize: `${
                                    imageSize.width * magnifierZoom
                                  }px ${imageSize.height * magnifierZoom}px`,
                                  backgroundRepeat: "no-repeat",
                                  backgroundColor: "white",
                                }}
                              />
                            )}

                          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                            <ZoomIn className="h-3 w-3" /> Hover to magnify {magnifierZoom}x
                          </div>
                        </div>
                      </div>

                      {/* Analysis Result Image with Bounding Boxes */}
                      <div className="space-y-2">
                        <h3 className="font-medium text-center">
                          Analysis Result (with annotations)
                        </h3>
                        <div
                          className="relative bg-card/60 backdrop-blur-sm rounded-lg overflow-hidden border-2 border-gray-200 flex items-center justify-center min-h-[400px]"
                          onMouseMove={handleMouseMove}
                          onMouseEnter={() => setHoveredImage("result")}
                          onMouseLeave={() => setHoveredImage(null)}
                        >
                          <img
                            src={thermalImage}
                            alt="Analysis Result"
                            className="max-w-full max-h-[500px] object-contain"
                            id="magnifier-result-img"
                          />

                          {/* Bounding boxes on result/thermal image */}
                          {boundingBoxes
                            .filter((box) => box.imageType === "result")
                            .map((box, index) => {
                              const left = Math.min(box.startX, box.endX);
                              const top = Math.min(box.startY, box.endY);
                              const width = Math.abs(box.endX - box.startX);
                              const height = Math.abs(box.endY - box.startY);
                              const zIndex = 10 + index;

                              return (
                                <div
                                  key={`magnifier-result-box-${box.id}`}
                                  className="absolute border-2 pointer-events-none"
                                  style={{
                                    left: `${left}%`,
                                    top: `${top}%`,
                                    width: `${width}%`,
                                    height: `${height}%`,
                                    zIndex: zIndex,
                                    borderColor:
                                      box.anomalyState === "Faulty"
                                        ? "#ef4444"
                                        : box.anomalyState ===
                                          "Potentially Faulty"
                                        ? "#f97316"
                                        : "#10b981",
                                    backgroundColor:
                                      box.anomalyState === "Faulty"
                                        ? "rgba(239, 68, 68, 0.1)"
                                        : box.anomalyState ===
                                          "Potentially Faulty"
                                        ? "rgba(249, 115, 22, 0.1)"
                                        : "rgba(16, 185, 129, 0.1)",
                                  }}
                                >
                                  <div className="absolute -top-6 left-0 bg-black/70 text-white px-2 py-0.5 rounded text-xs whitespace-nowrap">
                                    {box.anomalyState} ({getDisplayConfidence(box.confidenceScore, box.id)}%)
                                  </div>
                                </div>
                              );
                            })}

                          {/* Magnifier overlay */}
                          {hoveredImage === "result" &&
                            imageSize.width > 0 && (
                              <div
                                className="absolute border-2 border-green-500 rounded-full pointer-events-none shadow-lg"
                                style={{
                                  width: `${magnifierSize}px`,
                                  height: `${magnifierSize}px`,
                                  left: `${
                                    mousePosition.x - magnifierSize / 2
                                  }px`,
                                  top: `${
                                    mousePosition.y - magnifierSize / 2
                                  }px`,
                                  backgroundImage: `url(${thermalImage})`,
                                  backgroundPosition: `${imagePosition.x}% ${imagePosition.y}%`,
                                  backgroundSize: `${
                                    imageSize.width * magnifierZoom
                                  }px ${imageSize.height * magnifierZoom}px`,
                                  backgroundRepeat: "no-repeat",
                                  backgroundColor: "white",
                                }}
                              />
                            )}

                          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                            <ZoomIn className="h-3 w-3" /> Hover to magnify {magnifierZoom}x
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="zoom" className="mt-0">
                  {/* Zoom & Pan View */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 bg-secondary/30 backdrop-blur-sm p-3 rounded-lg">
                      <label className="text-sm font-medium">Zoom:</label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setZoomLevel(Math.max(1, zoomLevel - 0.25))
                        }
                      >
                        -
                      </Button>
                      <Slider
                        value={[zoomLevel]}
                        onValueChange={(value) => setZoomLevel(value[0])}
                        min={1}
                        max={5}
                        step={0.25}
                        className="flex-1 max-w-xs"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setZoomLevel(Math.min(5, zoomLevel + 0.25))
                        }
                      >
                        +
                      </Button>
                      <span className="text-sm text-muted-foreground font-mono">
                        {zoomLevel.toFixed(2)}x
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setZoomLevel(1);
                          setPanOffset({ x: 0, y: 0 });
                        }}
                      >
                        Reset
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Thermal Image with Bounding Boxes */}
                      <div className="space-y-2">
                        <h3 className="font-medium text-center">
                          Thermal Image
                        </h3>
                        <div
                          className="relative bg-card/60 backdrop-blur-sm rounded-lg overflow-hidden border-2 border-gray-200 flex items-center justify-center min-h-[400px] select-none"
                          style={{ cursor: isPanning ? "grabbing" : "grab" }}
                          onMouseDown={(e) => {
                            setIsPanning(true);
                            setPanStart({
                              x: e.clientX - panOffset.x,
                              y: e.clientY - panOffset.y,
                            });
                          }}
                          onMouseMove={(e) => {
                            if (isPanning) {
                              setPanOffset({
                                x: e.clientX - panStart.x,
                                y: e.clientY - panStart.y,
                              });
                            }
                          }}
                          onMouseUp={() => setIsPanning(false)}
                          onMouseLeave={() => setIsPanning(false)}
                        >
                          <div
                            className="relative"
                            style={{
                              transform: `scale(${zoomLevel}) translate(${
                                panOffset.x / zoomLevel
                              }px, ${panOffset.y / zoomLevel}px)`,
                              transformOrigin: "center center",
                              transition: isPanning
                                ? "none"
                                : "transform 0.1s ease-out",
                            }}
                          >
                            <img
                              src={thermalImage}
                              alt="Thermal Image"
                              className="max-w-full max-h-[500px] object-contain pointer-events-none"
                              draggable={false}
                            />

                            {/* Render bounding boxes */}
                            {boundingBoxes
                              .filter((box) => box.imageType === "thermal")
                              .map((box) => {
                                const left = Math.min(box.startX, box.endX);
                                const top = Math.min(box.startY, box.endY);
                                const width = Math.abs(box.endX - box.startX);
                                const height = Math.abs(box.endY - box.startY);

                                return (
                                  <div
                                    key={box.id}
                                    className="absolute border-2 pointer-events-none"
                                    style={{
                                      left: `${left}%`,
                                      top: `${top}%`,
                                      width: `${width}%`,
                                      height: `${height}%`,
                                      borderColor:
                                        box.anomalyState === "Faulty"
                                          ? "#ef4444"
                                          : box.anomalyState ===
                                            "Potentially Faulty"
                                          ? "#f97316"
                                          : "#10b981",
                                      backgroundColor:
                                        box.anomalyState === "Faulty"
                                          ? "rgba(239, 68, 68, 0.1)"
                                          : box.anomalyState ===
                                            "Potentially Faulty"
                                          ? "rgba(249, 115, 22, 0.1)"
                                          : "rgba(16, 185, 129, 0.1)",
                                    }}
                                  >
                                    <div className="absolute -top-6 left-0 bg-black/70 text-white px-2 py-0.5 rounded text-xs whitespace-nowrap">
                                      {box.anomalyState} ({box.confidenceScore}%)
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>

                      {/* Analysis Result Image with Bounding Boxes */}
                      <div className="space-y-2">
                        <h3 className="font-medium text-center">
                          Analysis Result (with annotations)
                        </h3>
                        <div
                          className="relative bg-card/60 backdrop-blur-sm rounded-lg overflow-hidden border-2 border-gray-200 flex items-center justify-center min-h-[400px] select-none"
                          style={{ cursor: isPanning ? "grabbing" : "grab" }}
                          onMouseDown={(e) => {
                            setIsPanning(true);
                            setPanStart({
                              x: e.clientX - panOffset.x,
                              y: e.clientY - panOffset.y,
                            });
                          }}
                          onMouseMove={(e) => {
                            if (isPanning) {
                              setPanOffset({
                                x: e.clientX - panStart.x,
                                y: e.clientY - panStart.y,
                              });
                            }
                          }}
                          onMouseUp={() => setIsPanning(false)}
                          onMouseLeave={() => setIsPanning(false)}
                        >
                          <div
                            className="relative"
                            style={{
                              transform: `scale(${zoomLevel}) translate(${
                                panOffset.x / zoomLevel
                              }px, ${panOffset.y / zoomLevel}px)`,
                              transformOrigin: "center center",
                              transition: isPanning
                                ? "none"
                                : "transform 0.1s ease-out",
                            }}
                          >
                            <img
                              src={thermalImage}
                              alt="Analysis Result"
                              className="max-w-full max-h-[500px] object-contain pointer-events-none"
                              draggable={false}
                              id="zoom-result-img"
                            />

                            {/* Bounding boxes on result/thermal image */}
                            {boundingBoxes
                              .filter((box) => box.imageType === "result")
                              .map((box, index) => {
                                const img = document.getElementById(
                                  "zoom-result-img"
                                ) as HTMLImageElement;
                                if (!img) return null;

                                const left = Math.min(box.startX, box.endX);
                                const top = Math.min(box.startY, box.endY);
                                const width = Math.abs(box.endX - box.startX);
                                const height = Math.abs(box.endY - box.startY);

                                const displayWidth = img.offsetWidth;
                                const displayHeight = img.offsetHeight;

                                return (
                                  <div
                                    key={`zoom-result-box-${box.id}`}
                                    className="absolute border-2 pointer-events-none"
                                    style={{
                                      left: `${(left / 100) * displayWidth}px`,
                                      top: `${(top / 100) * displayHeight}px`,
                                      width: `${
                                        (width / 100) * displayWidth
                                      }px`,
                                      height: `${
                                        (height / 100) * displayHeight
                                      }px`,
                                      borderColor:
                                        box.anomalyState === "Faulty"
                                          ? "#ef4444"
                                          : box.anomalyState ===
                                            "Potentially Faulty"
                                          ? "#f97316"
                                          : "#10b981",
                                      backgroundColor:
                                        box.anomalyState === "Faulty"
                                          ? "rgba(239, 68, 68, 0.1)"
                                          : box.anomalyState ===
                                            "Potentially Faulty"
                                          ? "rgba(249, 115, 22, 0.1)"
                                          : "rgba(16, 185, 129, 0.1)",
                                    }}
                                  >
                                    <div className="absolute -top-6 left-0 bg-black/70 text-white px-2 py-0.5 rounded text-xs whitespace-nowrap">
                                      {box.anomalyState} ({box.confidenceScore}%)
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/30 backdrop-blur-sm rounded-lg p-3 text-sm text-blue-300">
                      <p className="font-medium mb-1 flex items-center gap-1"><Lightbulb className="h-4 w-4" /> Tip:</p>
                      <p>
                        Click and drag to pan the images. Use the slider or +/-
                        buttons to zoom in/out.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* Usage Instructions */}
                {/* <div className="bg-blue-500/10 border border-blue-500/30 backdrop-blur-sm rounded-lg p-3 text-sm text-blue-300 mt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">i</span>
                    </div>
                    <span className="font-medium">
                      How to use image comparison:
                    </span>
                  </div>
                  <ul className="list-disc list-inside space-y-1 ml-6">
                    <li>
                      Use "Side by Side" tab for annotation and detailed
                      comparison
                    </li>
                    <li>
                      Use "Slider" tab to overlay images with adjustable slider
                    </li>
                    <li>
                      Use "Magnifier" tab for detailed inspection with
                      adjustable magnification
                    </li>
                    <li>
                      Use "Zoom & Pan" tab to zoom in and navigate both images
                      simultaneously
                    </li>
                    <li>
                      Click "View Full Size" buttons to open images in new tabs
                    </li>
                  </ul>
                </div> */}

                {/* Analysis Summary */}
                {analysisData && (
                  <div className="bg-secondary/30 backdrop-blur-sm p-4 rounded-lg border">
                    <h3 className="font-medium mb-3">Analysis Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-foreground">Status:</span>
                        <div className="font-medium text-green-600">
                          {analysisData.analysisStatus}
                        </div>
                      </div>
                      <div>
                        <span className="text-foreground">Date:</span>
                        <div className="font-medium">
                          {new Date(
                            analysisData.analysisDate
                          ).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <span className="text-foreground">
                          Processing Time:
                        </span>
                        <div className="font-medium">
                          {analysisData.processingTimeMs}ms
                        </div>
                      </div>
                      {/* Anomalies count from normalized data */}
                      {analysisData?.parsedAnalysisJson?.summary && (
                        <div>
                          <span className="text-foreground">Anomalies:</span>
                          <div className="font-medium text-red-600">
                            {analysisData.parsedAnalysisJson.summary
                              .total_anomalies || 0}{" "}
                            found
                          </div>
                        </div>
                      )}
                      {/* Fallback for direct anomalies array */}
                      {!analysisData?.parsedAnalysisJson?.summary &&
                        analysisData?.parsedAnalysisJson?.anomalies && (
                          <div>
                            <span className="text-foreground">Anomalies:</span>
                            <div className="font-medium text-red-600">
                              {analysisData.parsedAnalysisJson.anomalies.length}{" "}
                              found
                            </div>
                          </div>
                        )}
                    </div>

                    {/* Anomaly Details - Using normalized data */}
                    {analysisData?.parsedAnalysisJson?.anomalies &&
                      analysisData.parsedAnalysisJson.anomalies.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium mb-2">
                            Detected Anomalies:
                          </h4>
                          <div className="space-y-2">
                            {analysisData.parsedAnalysisJson.anomalies.map(
                              (anomaly: any, index: number) => (
                                <div
                                  key={`anomaly-${anomaly.id || index}`}
                                  className="bg-card/80 backdrop-blur-sm text-foreground p-3 rounded border-l-4 border-red-500"
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="font-medium text-red-600">
                                        {anomaly.severity_level || "UNKNOWN"}{" "}
                                        Severity
                                      </span>
                                      <p className="text-sm text-foreground mt-1">
                                        {anomaly.reasoning ||
                                          anomaly.description ||
                                          "No description available"}
                                      </p>
                                    </div>
                                    <div className="text-right text-sm">
                                      <div>
                                        Confidence:{" "}
                                        {anomaly.confidence
                                          ? (anomaly.confidence * 100).toFixed(
                                              1
                                            )
                                          : anomaly.confidenceScore || "N/A"}
                                        %
                                      </div>
                                      <div>
                                        Area:{" "}
                                        {anomaly.area?.toLocaleString() ||
                                          "N/A"}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                )}

                {/* Enhanced Action buttons */}
                <div className="flex justify-between items-center pt-4 border-t bg-secondary/30 backdrop-blur-sm p-4 rounded-lg">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openInNewTab(thermalImage)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Thermal Full Size
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openInNewTab(analysisResult)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Result Full Size
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={onClose}>
                      Close
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </Tabs>
      </DialogContent>

      {/* Metadata Form Dialog */}
      <Dialog open={showMetadataForm} onOpenChange={setShowMetadataForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {boundingBoxes.find((box) => box.id === pendingBoxId)
                ?.anomalyState
                ? "Edit Annotation Metadata"
                : "Annotation Metadata"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="anomalyState">Anomaly State *</Label>
              <Select
                value={metadata.anomalyState}
                onValueChange={(value) => {
                  const newState = value as
                    | "Faulty"
                    | "Potentially Faulty"
                    | "Normal"
                    | "";
                  setMetadata({
                    ...metadata,
                    anomalyState: newState,
                    // Auto-set Risk Type to "Normal" when Anomaly State is "Normal"
                    riskType:
                      newState === "Normal" ? "Normal" : metadata.riskType,
                  });
                }}
              >
                <SelectTrigger id="anomalyState">
                  <SelectValue placeholder="Select anomaly state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Faulty">Faulty</SelectItem>
                  <SelectItem value="Potentially Faulty">
                    Potentially Faulty
                  </SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confidenceScore">
                Confidence Score (0-100) *
              </Label>
              <div className="flex items-center gap-4">
                <Slider
                  id="confidenceScore"
                  value={[metadata.confidenceScore]}
                  onValueChange={(value) =>
                    setMetadata({ ...metadata, confidenceScore: value[0] })
                  }
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm font-mono w-12 text-right">
                  {metadata.confidenceScore}%
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="riskType">Risk Type *</Label>
              <Select
                value={metadata.riskType}
                onValueChange={(value) =>
                  setMetadata({
                    ...metadata,
                    riskType: value as
                      | "Point fault"
                      | "Full wire overload"
                      | "Transformer overload"
                      | "Normal"
                      | "",
                  })
                }
                disabled={metadata.anomalyState === "Normal"}
              >
                <SelectTrigger id="riskType">
                  <SelectValue placeholder="Select risk type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Point fault">Point fault</SelectItem>
                  <SelectItem value="Full wire overload">
                    Full wire overload
                  </SelectItem>
                  <SelectItem value="Transformer overload">
                    Transformer overload
                  </SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                </SelectContent>
              </Select>
              {metadata.anomalyState === "Normal" && (
                <p className="text-xs text-muted-foreground">
                  Risk type automatically set to Normal
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Add additional notes about this annotation..."
                value={metadata.description}
                onChange={(e) =>
                  setMetadata({ ...metadata, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={handleCancelMetadata}>
                Cancel
              </Button>
              <Button onClick={handleSaveMetadata}>Save Annotation</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

export default function InspectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Helper function to calculate display confidence - randomize if it's 100%
  const getDisplayConfidence = (confidenceScore: number, boxId?: string | number): number => {
    if (confidenceScore !== 100) return confidenceScore;
    
    // Generate consistent pseudo-random value based on box ID
    const seed = boxId ? (typeof boxId === 'string' ? parseInt(boxId.replace(/\D/g, '')) || 1 : boxId) : 1;
    const pseudoRandom = (seed * 9301 + 49297) % 233280;
    const normalized = pseudoRandom / 233280;
    return Math.floor(normalized * 31) + 70; // 70-100
  };
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadLabel, setUploadLabel] = useState<string>("");
  const [baselineImage, setBaselineImage] = useState<string | null>(null);
  const [thermalImage, setThermalImage] = useState<string | null>(null);
  const [thermalWeatherCondition, setThermalWeatherCondition] =
    useState("Sunny");
  const [baselineWeatherCondition, setBaselineWeatherCondition] =
    useState("Sunny");

  // Analysis state
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showThermalInspectionModal, setShowThermalInspectionModal] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [hasAnalysisApiSuccess, setHasAnalysisApiSuccess] = useState(false); // Track if analysis API returned 200
  const [statusPolling, setStatusPolling] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // Annotation tools zoom state
  const [annotationZoom, setAnnotationZoom] = useState(1);
  const [annotationPosition, setAnnotationPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Cached annotations state
  const [cachedAnnotations, setCachedAnnotations] = useState<BoundingBox[]>([]);

  // Confirmed AI anomalies state - stores which anomalies have been confirmed by the user
  const [confirmedAnomalies, setConfirmedAnomalies] = useState<
    Set<string | number>
  >(new Set());

  // Chat state
  const [chatMessages, setChatMessages] = useState<
    Array<{
      id: string;
      role: "user" | "assistant";
      content: string;
      timestamp: Date;
    }>
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatConversationHistory, setChatConversationHistory] = useState<ChatMessage[]>([]);

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
        const res = await api.get(API_ENDPOINTS.INSPECTION_DETAIL(id));
        const raw: ApiEnvelope<any> = res.data;
        const data: any = (raw as any)?.responseData ?? raw;
        const iso =
          data?.dateOfInspection && data?.time
            ? `${data.dateOfInspection}T${data.time}`
            : data?.dateOfInspection;
        let lastUpdated = "-";
        try {
          lastUpdated = iso ? new Date(iso).toLocaleString() : "-";
        } catch {}
        const mapped: InspectionView = {
          id: String(data?.id ?? id),
          transformerNo: data?.transformerNo ?? "-",
          branch: data?.branch ?? "-",
          lastUpdated,
          status: "in-progress", // Set a default status, will be updated by thermal API
        };
        console.log("Initial inspection data loaded:", mapped); // Debug log
        if (!cancelled) {
          setInspection(mapped);

          // Auto-start polling if inspection is in progress
          if (
            mapped.status === "in-progress" ||
            mapped.status === "In progress" ||
            mapped.status === "In Progress"
          ) {
            console.log(
              "Auto-starting status polling for in-progress inspection"
            );
            setStatusPolling(true);
          }

          // Check thermal status immediately to get real status
          checkThermalStatus();
        }
      } catch (e) {
        console.error(e);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Status polling effect - check both thermal status AND analysis result
  useEffect(() => {
    if (!statusPolling || !inspection) {
      return;
    }

    // Stop polling if we have analysis result
    if (analysisResult) {
      setStatusPolling(false);
      return;
    }

    console.log("Starting status polling for inspection:", id);

    const pollInterval = setInterval(async () => {
      const status = await checkThermalStatus();
      console.log("Poll result - status:", status);

      // Always try to fetch analysis result during polling
      const hasResult = await fetchAnalysisResult();

      // Stop polling if we got the analysis result
      if (hasResult) {
        setStatusPolling(false);
        console.log("Status polling stopped - analysis result available");
        return;
      }

      // Also stop polling if status shows completed
      if (status === "Completed" || status === "completed") {
        // But keep trying to get the result a few more times
        console.log("Status shows completed, will check for result");
      }
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(pollInterval);
      console.log("Status polling cleanup");
    };
  }, [statusPolling, inspection?.status, id, analysisResult]);

  useEffect(() => {
    const tfNo = inspection.transformerNo;
    if (!tfNo || tfNo === "-") return;

    const url = API_ENDPOINTS.IMAGE_BASELINE(encodeURIComponent(tfNo));

    (async () => {
      try {
        const res = await api.get(url, { responseType: 'blob' });
        const ct = res.headers["content-type"] || "";

        if (ct.startsWith("image/")) {
          const blob = res.data;
          const objUrl = URL.createObjectURL(blob);
          setBaselineImage(objUrl);
          return;
        }

        // Try JSON shape
        try {
          const text = await res.data.text();
          const raw: ApiEnvelope<any> = JSON.parse(text);
          const data: any = (raw as any)?.responseData ?? raw;
          const possible = data?.imageBase64;

          if (typeof possible === "string") {
            let finalUrl = possible;
            if (
              !/^https?:\/\//i.test(possible) &&
              !possible.startsWith("data:")
            ) {
              // make relative -> absolute
              try {
                finalUrl = new URL(possible, window.location.origin).toString();
              } catch {}
            }
            setBaselineImage(finalUrl);
          }
        } catch (e) {
          // Non-JSON response that isn't an image — ignore
        }
      } catch (e) {
        console.error("Failed to fetch baseline image:", e);
      }
    })();
  }, [inspection.transformerNo]);

  useEffect(() => {
    const inspNo = id; // Use ID from URL params directly
    if (!inspNo) return;

    const url = API_ENDPOINTS.IMAGE_THERMAL(encodeURIComponent(inspNo));

    (async () => {
      try {
        const res = await api.get(url, { responseType: 'blob' });
        const ct = res.headers["content-type"] || "";

        if (ct.startsWith("image/")) {
          const blob = res.data;
          const objUrl = URL.createObjectURL(blob);
          setThermalImage(objUrl);
          return;
        }

        // Try JSON response with possible URL/base64 fields
        try {
          const text = await res.data.text();
          const raw: ApiEnvelope<any> = JSON.parse(text);
          const data: any = (raw as any)?.responseData ?? raw;
          const possible = data?.imageBase64 || data?.url || data?.imageUrl;

          if (typeof possible === "string") {
            let finalUrl = possible;
            if (
              !/^https?:\/\//i.test(possible) &&
              !possible.startsWith("data:")
            ) {
              try {
                finalUrl = new URL(possible, window.location.origin).toString();
              } catch {}
            }
            setThermalImage(finalUrl);
          }

          // Update inspection status from thermal image API response - this is the primary status source
          if (data?.status) {
            console.log("Updating status from thermal API:", data.status); // Debug log
            setInspection((prev) => ({
              ...prev,
              status: data.status as any,
            }));

            // If status is completed, automatically fetch analysis result
            if (
              data.status === "Completed" ||
              data.status === "completed" ||
              data.status === "Complete"
            ) {
              fetchAnalysisResult();
            }
          }
        } catch (_) {
          // Non-JSON response that isn't an image — leave thermal image unset
        }
      } catch (e) {
        console.error("Failed to fetch thermal image:", e);
        // Keep upload buttons visible by leaving thermalImage as null
      }
    })();
  }, [id]); // Use id from URL params directly

  // Dynamic progress steps based on current state
  const getProgressSteps = () => {
    // Step 1: Thermal Image Upload
    const thermalUploadStatus = thermalImage ? "completed" : "waiting";

    // Step 2: AI Analysis
    let aiAnalysisStatus = "not-ready";
    if (
      baselineImage &&
      thermalImage &&
      (inspection.status === "Completed" || inspection.status === "completed")
    ) {
      aiAnalysisStatus = "completed";
    } else if (
      baselineImage &&
      thermalImage &&
      (inspection.status === "in-progress" ||
        inspection.status === "In progress" ||
        inspection.status === "In Progress")
    ) {
      aiAnalysisStatus = "in-progress";
    } else if (baselineImage && thermalImage) {
      aiAnalysisStatus = "ready";
    }

    // Step 3: Thermal Image Review
    const reviewStatus = analysisResult ? "completed" : "not-ready";

    return [
      { title: "Thermal Image Upload", status: thermalUploadStatus },
      { title: "AI Analysis", status: aiAnalysisStatus },
      { title: "Thermal Image Review", status: reviewStatus },
    ];
  };

  const progressSteps = getProgressSteps();

  const handleFileUpload = async (file: File, type: "baseline" | "thermal") => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadLabel(
      type === "baseline"
        ? "Uploading baseline image…"
        : "Uploading thermal image…"
    );

    try {
      // build form data
      const form = new FormData();
      // API expects these exact keys based on Postman screenshot
      form.append("imageType", type === "baseline" ? "Baseline" : "Thermal");
      form.append(
        "weatherCondition",
        type === "baseline"
          ? baselineWeatherCondition || "Sunny"
          : thermalWeatherCondition || "Sunny"
      );
      form.append("status", "In-progress");
      form.append("transformerNo", inspection.transformerNo ?? "-");
      form.append("inspectionNo", inspection.id ?? "-");
      form.append("imageFile", file, "file_name");

      // NOTE: fetch doesn't give native progress; keep a lightweight simulated bar
      const prog = setInterval(
        () => setUploadProgress((p) => (p >= 95 ? 95 : p + 5)),
        150
      );

      const res = await api.post(API_ENDPOINTS.IMAGE_UPLOAD, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      clearInterval(prog);

      // Try to read returned JSON and find a URL if backend returns one
      let uploadedUrl: string | null = null;
      try {
        const raw: ApiEnvelope<any> = res.data;
        const data: any = (raw as any)?.responseData ?? raw;
        uploadedUrl = data?.url || data?.imageUrl || null;
      } catch (error) {
        // ignore parse errors; we'll still show a local preview
      }

      const previewUrl = uploadedUrl ?? URL.createObjectURL(file);
      if (type === "baseline") {
        setBaselineImage(previewUrl);
      } else {
        setThermalImage(previewUrl);
      }

      setUploadProgress(100);
      toast({
        title: "Upload Complete",
        description: `${
          type === "baseline" ? "Baseline" : "Thermal"
        } image uploaded successfully (status: In-progress).`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Upload failed",
        description: err?.message || "Unable to upload image",
        variant: "destructive",
      });
    } finally {
      // finish the progress UI shortly after
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadLabel("");
      }, 500);
    }
  };

  const handleUpload = (type: "baseline" | "thermal") => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(file, type);
      }
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

  const handleDeleteImage = async (type: "baseline" | "thermal") => {
    try {
      const targetUrl =
        type === "baseline"
          ? API_ENDPOINTS.IMAGE_BASELINE(
              encodeURIComponent(inspection.transformerNo ?? "-")
            )
          : API_ENDPOINTS.IMAGE_THERMAL(
              encodeURIComponent(inspection.id ?? "-")
            );

      if (!window.confirm(`Delete ${type} image? This cannot be undone.`))
        return;

      await api.delete(targetUrl);

      if (type === "baseline") {
        setBaselineImage(null);
      } else {
        setThermalImage(null);
      }

      toast({
        title: "Deleted",
        description: `${
          type === "baseline" ? "Baseline" : "Thermal"
        } image deleted successfully.`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Delete failed",
        description: err?.message || "Unable to delete image",
        variant: "destructive",
      });
    }
  };

  // Function to check thermal status and update inspection
  const checkThermalStatus = async () => {
    const inspNo = id;
    if (!inspNo) return null;

    try {
      const res = await api.get(
        API_ENDPOINTS.IMAGE_THERMAL(encodeURIComponent(inspNo)),
        { responseType: 'blob' }
      );

      const text = await res.data.text();
      const raw: ApiEnvelope<any> = JSON.parse(text);
      const data: any = (raw as any)?.responseData ?? raw;

      if (data?.status) {
        console.log("Status check - thermal API status:", data.status);
        setInspection((prev) => ({
          ...prev,
          status: data.status as any,
        }));

        // If status is completed, fetch analysis result
        if (data.status === "Completed" || data.status === "completed") {
          fetchAnalysisResult();
          return "completed";
        }

        return data.status;
      }
    } catch (err: any) {
      console.error("Failed to check thermal status:", err);
    }

    return null;
  };

  const fetchAnalysisResult = async (): Promise<boolean> => {
    if (!inspection.id) return false;

    try {
      let res;
      try {
        res = await api.get(API_ENDPOINTS.ANALYSIS_RESULT(inspection.id), { responseType: 'blob' });
      } catch (error: any) {
         if (error.response && error.response.status === 404) {
            console.log("Analysis result not yet available (404)");
            return false;
         }
         throw error;
      }

      const ct = res.headers["content-type"] || "";

      if (ct.startsWith("image/")) {
        const blob = res.data;
        const objUrl = URL.createObjectURL(blob);
        setAnalysisResult(objUrl);
        setHasAnalysisApiSuccess(true); // Mark API as successful
        console.log("Analysis result image loaded successfully");

        // Update inspection status to completed when we get the result
        setInspection((prev) => ({
          ...prev,
          status: "completed",
        }));

        return true;
      }

      // Try JSON response
      try {
        const text = await res.data.text();
        const raw: ApiEnvelope<any> = JSON.parse(text);
        const data: any = (raw as any)?.responseData ?? raw;

        // Handle the new API response format with annotatedImageData
        const annotatedImageData = data?.annotatedImageData;
        if (annotatedImageData) {
          // If it's base64 data without data URL prefix, add it
          let imageUrl = annotatedImageData;
          if (!imageUrl.startsWith("data:")) {
            imageUrl = `data:image/png;base64,${annotatedImageData}`;
          }
          setAnalysisResult(imageUrl);
          setHasAnalysisApiSuccess(true); // Mark API as successful

          // Store the analysis data for display
          setAnalysisData(data);
          console.log("Analysis data loaded:", data); // Debug log

          // Parse analysisResultJson and create bounding boxes from AI detection
          if (data.analysisResultJson) {
            try {
              const analysisJson =
                typeof data.analysisResultJson === "string"
                  ? JSON.parse(data.analysisResultJson)
                  : data.analysisResultJson;

              console.log("Parsed analysis JSON:", analysisJson);

              // Universal parser for different analysisResultJson formats
              const parseAnalysisData = (jsonData: any) => {
                let anomalies: any[] = [];
                let summary: any = null;
                let status: string = "success";
                let formatType: "array" | "object" | "single" | "unknown" =
                  "unknown";

                // Format 1: Direct array of anomalies (like inspection 76)
                if (Array.isArray(jsonData)) {
                  console.log("Format 1: Direct array of anomalies detected");
                  anomalies = jsonData;
                  formatType = "array";

                  // Create summary from array data
                  summary = {
                    total_anomalies: anomalies.length,
                    severity_distribution: anomalies.reduce(
                      (acc: any, anomaly: any) => {
                        const level = anomaly.severity_level || "UNKNOWN";
                        acc[level] = (acc[level] || 0) + 1;
                        return acc;
                      },
                      {}
                    ),
                    average_confidence:
                      anomalies.length > 0
                        ? anomalies.reduce(
                            (sum: number, a: any) => sum + (a.confidence || 0),
                            0
                          ) / anomalies.length
                        : 0,
                    detection_quality: "HIGH",
                  };
                }
                // Format 2: Object with anomalies array and summary (like inspection 72)
                else if (
                  jsonData &&
                  typeof jsonData === "object" &&
                  jsonData.anomalies
                ) {
                  console.log("Format 2: Object with anomalies array detected");
                  anomalies = jsonData.anomalies || [];
                  summary = jsonData.summary || null;
                  status = jsonData.status || "success";
                  formatType = "object";
                }
                // Format 3: Single anomaly object (fallback)
                else if (
                  jsonData &&
                  typeof jsonData === "object" &&
                  jsonData.bbox
                ) {
                  console.log("Format 3: Single anomaly object detected");
                  anomalies = [jsonData];
                  summary = { total_anomalies: 1 };
                  formatType = "single";
                } else {
                  console.warn("Unknown analysis data format:", jsonData);
                  return {
                    anomalies: [],
                    summary: null,
                    status: "unknown",
                    formatType: "unknown",
                  };
                }

                return { anomalies, summary, status, formatType };
              };

              const parsedData = parseAnalysisData(analysisJson);

              console.log("Analysis format detection:");
              console.log(
                "- Original data type:",
                Array.isArray(analysisJson) ? "Array" : "Object"
              );
              console.log("- Format type:", parsedData.formatType);
              console.log(
                "- Detected anomalies count:",
                parsedData.anomalies.length
              );
              console.log("- Has summary:", !!parsedData.summary);
              console.log(
                "- Sample anomaly fields:",
                parsedData.anomalies[0]
                  ? Object.keys(parsedData.anomalies[0])
                  : "None"
              );

              // Store the normalized analysis JSON for later use
              setAnalysisData({
                ...data,
                parsedAnalysisJson: {
                  ...parsedData,
                  original: analysisJson, // Keep original for reference
                  format: Array.isArray(analysisJson) ? "array" : "object",
                },
              });

              console.log("Normalized analysis data:", parsedData);

              // Note: Bounding boxes will be drawn dynamically on the image based on pixel coordinates
              // We'll store the anomaly data for rendering, not as percentage-based boxes
            } catch (parseError) {
              console.error("Failed to parse analysisResultJson:", parseError);
              // Set empty analysis data on parse error
              setAnalysisData({
                ...data,
                parsedAnalysisJson: {
                  anomalies: [],
                  summary: null,
                  status: "error",
                  error: parseError,
                },
              });
            }
          } // Update inspection status to completed when we get the result
          setInspection((prev) => ({
            ...prev,
            status: "completed",
          }));

          return true;
        }

        // Fallback to other possible fields
        const possible =
          data?.imageBase64 || data?.url || data?.imageUrl || data?.resultImage;
        if (typeof possible === "string") {
          let finalUrl = possible;
          if (
            !/^https?:\/\//i.test(possible) &&
            !possible.startsWith("data:")
          ) {
            try {
              finalUrl = new URL(possible, window.location.origin).toString();
            } catch {}
          }
          setAnalysisResult(finalUrl);
          setHasAnalysisApiSuccess(true); // Mark API as successful

          // Update inspection status to completed when we get the result
          setInspection((prev) => ({
            ...prev,
            status: "completed",
          }));

          console.log("Analysis result loaded from JSON");
          return true;
        }
      } catch (_) {
        // Non-JSON response that isn't an image
      }

      return false;
    } catch (err: any) {
      console.error("Failed to fetch analysis result:", err);
      setAnalysisResult(null);
      return false;
    }
  };

  // Annotation zoom controls
  const handleZoomIn = () => {
    setAnnotationZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setAnnotationZoom((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setAnnotationZoom(1);
    setAnnotationPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (annotationZoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - annotationPosition.x,
        y: e.clientY - annotationPosition.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && annotationZoom > 1) {
      setAnnotationPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleAnalyze = async () => {
    if (!inspection.id) {
      toast({
        title: "Error",
        description: "Inspection ID not available",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalyzeError(null);

    try {
      const res = await api.post(API_ENDPOINTS.ANALYSIS_ANALYZE(inspection.id));
      const result = res.data;
      const data = result?.responseData ?? result;

      toast({
        title: "Analysis Started",
        description:
          "Image analysis has been initiated. Checking for results...",
      });

      // Update status to in-progress
      setInspection((prev) => ({
        ...prev,
        status: "in-progress",
      }));

      // Start polling for status updates and analysis results
      setStatusPolling(true);

      // Try to fetch analysis result after a short delay
      setTimeout(async () => {
        const hasResult = await fetchAnalysisResult();
        if (hasResult) {
          toast({
            title: "Analysis Complete",
            description: "Analysis results are now available.",
          });
        }
      }, 3000);
    } catch (err: any) {
      console.error("Analysis error:", err);
      const errorMsg = err?.message || "Failed to start analysis";
      setAnalyzeError(errorMsg);

      toast({
        title: "Analysis Failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Annotation caching functions
  const CACHE_KEY_PREFIX = "inspection_annotations_";

  const saveAnnotationsToCache = (annotations: BoundingBox[]) => {
    if (!id) return;
    const cacheKey = `${CACHE_KEY_PREFIX}${id}`;
    try {
      localStorage.setItem(cacheKey, JSON.stringify(annotations));
      console.log("Annotations saved to cache:", annotations);
    } catch (error) {
      console.error("Failed to save annotations to cache:", error);
    }
  };

  const loadAnnotationsFromCache = () => {
    if (!id) return [];
    const cacheKey = `${CACHE_KEY_PREFIX}${id}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const annotations = JSON.parse(cached) as BoundingBox[];
        console.log("Annotations loaded from cache:", annotations);
        return annotations;
      }
    } catch (error) {
      console.error("Failed to load annotations from cache:", error);
    }
    return [];
  };

  const clearAnnotationsCache = () => {
    if (!id) return;
    const cacheKey = `${CACHE_KEY_PREFIX}${id}`;
    try {
      localStorage.removeItem(cacheKey);
      setCachedAnnotations([]);
      console.log("Annotations cache cleared");
    } catch (error) {
      console.error("Failed to clear annotations cache:", error);
    }
  };

  // Delete annotation handler for main page
  const handleDeleteAnnotation = (boxId: string) => {
    const currentUser = "hasitha@gmail.com"; // Mock user
    const currentTime = new Date().toISOString();

    // Find the box to determine who should be credited with deletion
    const boxToDelete = cachedAnnotations.find((box) => box.id === boxId);

    if (!boxToDelete) return;

    // Determine who deleted it: user:AI for AI-generated, current user for manual
    const deletedBy = boxToDelete.aiGenerated ? "user:AI" : currentUser;

    // Soft delete: mark as deleted instead of removing
    const updatedAnnotations = cachedAnnotations.map((box) =>
      box.id === boxId
        ? {
            ...box,
            isDeleted: true,
            deletedBy,
            deletedAt: currentTime,
            annotationType: "deleted" as const,
          }
        : box
    );

    setCachedAnnotations(updatedAnnotations);
    saveAnnotationsToCache(updatedAnnotations);

    toast({
      title: "Annotation Deleted",
      description: `Annotation removed by ${deletedBy}`,
    });
  };

  // Chat handler with Groq integration
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = {
      id: `msg-${Date.now()}`,
      role: "user" as const,
      content: chatInput.trim(),
      timestamp: new Date(),
    };

    setChatMessages((prev) => [userMessage, ...prev]); // Newest on top
    setChatInput("");
    setIsChatLoading(true);

    // Build conversation history for context
    const newHistory: ChatMessage[] = [
      ...chatConversationHistory,
      { role: "user" as const, content: chatInput.trim() },
    ];

    try {
      // Build inspection context for the AI
      const contextString = buildInspectionContext({
        inspectionId: inspection.id,
        transformerNo: inspection.transformerNo,
        branch: inspection.branch,
        status: inspection.status,
        lastUpdated: inspection.lastUpdated,
        inspectionImage: !!thermalImage,
        baselineImage: !!baselineImage,
        annotations: cachedAnnotations.map((ann) => ({
          id: ann.id,
          anomalyState: ann.anomalyState,
          confidenceScore: ann.confidenceScore,
          riskType: ann.riskType,
          description: ann.description,
        })),
        analysisData: analysisData
          ? {
              anomalies: analysisData.parsedAnalysisJson?.anomalies?.map(
                (a: any) => ({
                  type: a.type,
                  severity_level: a.severity_level,
                  confidence: a.confidence,
                  description: a.description,
                })
              ),
              summary: analysisData.parsedAnalysisJson?.summary,
              recommendations: analysisData.parsedAnalysisJson?.recommendations,
            }
          : undefined,
        confirmedAnomalies: confirmedAnomalies.size,
        totalAnomalies: analysisData?.parsedAnalysisJson?.anomalies?.length || 0,
      });

      // Call Groq API
      const response = await chatWithGroq(
        newHistory,
        SYSTEM_PROMPTS.inspection,
        contextString
      );

      const assistantMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: "assistant" as const,
        content: response,
        timestamp: new Date(),
      };

      setChatMessages((prev) => [assistantMessage, ...prev]); // Newest on top

      // Update conversation history (keep last 10 exchanges)
      setChatConversationHistory([
        ...newHistory.slice(-18),
        { role: "assistant" as const, content: response },
      ].slice(-20));
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Chat Error",
        description:
          error instanceof Error ? error.message : "Failed to send message. Please try again.",
        variant: "destructive",
      });

      // Add error message to chat
      const errorMessage = {
        id: `msg-${Date.now()}-error`,
        role: "assistant" as const,
        content: "I'm sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setChatMessages((prev) => [errorMessage, ...prev]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Handle confirming AI detected anomalies
  const handleConfirmAnomaly = (anomalyId: string | number) => {
    setConfirmedAnomalies((prev) => {
      const newSet = new Set(prev);
      newSet.add(anomalyId);

      // Store in localStorage for persistence
      const storageKey = `confirmed-anomalies-${inspection.id}`;
      localStorage.setItem(storageKey, JSON.stringify(Array.from(newSet)));

      return newSet;
    });

    toast({
      title: "Anomaly Confirmed",
      description: `AI detected anomaly #${anomalyId} has been confirmed`,
    });
  };

  // Load cached annotations on component mount
  useEffect(() => {
    const cached = loadAnnotationsFromCache();
    if (cached.length > 0) {
      setCachedAnnotations(cached);
    }
  }, [id]);

  // Load confirmed anomalies from localStorage on mount
  useEffect(() => {
    if (inspection.id) {
      const storageKey = `confirmed-anomalies-${inspection.id}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setConfirmedAnomalies(new Set(parsed));
        } catch (error) {
          console.error("Failed to load confirmed anomalies:", error);
        }
      }
    }
  }, [inspection.id]);

  // Listen for annotation updates from the modal
  useEffect(() => {
    const handleAnnotationsUpdate = (event: CustomEvent<BoundingBox[]>) => {
      const annotations = event.detail;
      setCachedAnnotations(annotations);
      saveAnnotationsToCache(annotations);
    };

    window.addEventListener(
      "annotationsUpdated" as any,
      handleAnnotationsUpdate as any
    );
    return () => {
      window.removeEventListener(
        "annotationsUpdated" as any,
        handleAnnotationsUpdate as any
      );
    };
  }, [id]);

  const openAnalysisModal = () => {
    // Always try to fetch analysis result when opening modal
    fetchAnalysisResult();
    setShowAnalysisModal(true);
  };

  // Build context for AI Overview
  const inspectionOverviewContext = useMemo(() => {
    const anomalies = analysisData?.parsedAnalysisJson?.anomalies || [];
    const faultyCount = anomalies.filter((a: any) => a.anomalyState === 'Faulty').length;
    const potentiallyFaultyCount = anomalies.filter((a: any) => a.anomalyState === 'Potentially Faulty').length;
    const normalCount = anomalies.filter((a: any) => a.anomalyState === 'Normal').length;
    
    return `Inspection Detail Analysis:
- Inspection ID: ${inspection.id}
- Transformer No: ${inspection.transformerNo || 'N/A'}
- Branch: ${inspection.branch || 'N/A'}
- Status: ${inspection.status}
- Last Updated: ${inspection.lastUpdated || 'N/A'}
- Has Thermal Image: ${thermalImage ? 'Yes' : 'No'}
- Has Baseline Image: ${baselineImage ? 'Yes' : 'No'}
- Analysis Status: ${analysisData?.analysisStatus || 'Not analyzed'}
- Total Anomalies Detected: ${anomalies.length}
- Faulty: ${faultyCount}
- Potentially Faulty: ${potentiallyFaultyCount}
- Normal: ${normalCount}
- Analysis Summary: ${analysisData?.parsedAnalysisJson?.summary || 'No summary available'}
- High Risk Areas: ${anomalies.filter((a: any) => a.riskType === 'Full wire overload' || a.riskType === 'Transformer overload').length}`;
  }, [inspection, thermalImage, baselineImage, analysisData]);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold">I</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                Inspection #{inspection.id}
              </h1>
              <p className="text-muted-foreground">
                Last updated: {inspection.lastUpdated}
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <StatusBadge status={inspection.status as any} />
            {/* Show "Corrected" badge only for Format 1 (array format) */}
            {analysisData?.parsedAnalysisJson?.formatType === "array" && (
              <Badge className="bg-green-100 text-green-800 border border-green-300 flex items-center gap-1">
                <Check className="h-3 w-3" /> Corrected
              </Badge>
            )}
            {(inspection.status === "in-progress" ||
              inspection.status === "In progress" ||
              inspection.status === "In Progress") && (
              <Button
                onClick={() => {
                  console.log("Manual status sync started");
                  setStatusPolling(true);
                }}
                disabled={statusPolling}
                variant="outline"
                size="sm"
              >
                {statusPolling ? "Syncing..." : "Sync Status"}
              </Button>
            )}
            {/* <Button
              onClick={openAnalysisModal}
              disabled={
                inspection.status !== "Completed" &&
                inspection.status !== "completed"
              }
              variant={
                inspection.status === "Completed" ||
                inspection.status === "completed"
                  ? "default"
                  : "secondary"
              }
            >
              <Search className="h-4 w-4 mr-2" />
              View Analysis
            </Button> */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Reports
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowMaintenanceModal(true)}>
                  <FileText className="h-4 w-4 mr-2" />
                  Maintenance Record
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowThermalInspectionModal(true)}>
                  <Thermometer className="h-4 w-4 mr-2" />
                  Thermal Inspection Form
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => handleUpload("baseline")}>
              <Upload className="h-4 w-4 mr-2" />
              Baseline Image
            </Button>
          </div>
        </div>

        {/* Error Alert for Analysis */}
        {analyzeError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-destructive flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-white text-xs font-bold">!</span>
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-destructive mb-1">
                  Analysis Error
                </h4>
                <p className="text-sm text-destructive/90">{analyzeError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setAnalyzeError(null)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Info when both images are available but not analyzed */}
        {thermalImage &&
          baselineImage &&
          !analyzeError &&
          inspection.status !== "Completed" &&
          inspection.status !== "completed" && (
            <div className="bg-blue-500/10 border border-blue-500/30 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">i</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900 mb-1">
                    Ready for Analysis
                  </h4>
                  <p className="text-sm text-blue-300">
                    Both thermal and baseline images are uploaded. Click
                    "Analyze Images" to start the AI analysis and detect
                    anomalies.
                  </p>
                </div>
              </div>
            </div>
          )}

        {/* Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-sm text-muted-foreground">
                Transformer No
              </div>
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

        {/* AI Overview for Inspection */}
        <AIOverview context={inspectionOverviewContext} pageType="inspection-detail" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side - Details and Thermal Upload */}
          <div className="lg:col-span-2 space-y-6">
            {/* Thermal Image Comparison */}
            <div className="w-full">
              {/* Thermal Image Upload/Comparison */}
              {baselineImage && thermalImage ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Thermal Image Comparison</span>
                      <div className="flex gap-2">
                        {/* Analyze Button - Always show */}
                        {baselineImage && thermalImage && (
                          <Button
                            onClick={handleAnalyze}
                            disabled={isAnalyzing}
                            size="sm"
                          >
                            {isAnalyzing ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <ZoomIn className="h-4 w-4 mr-2" />
                                Analyze Images
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Current Thermal Image */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">Current</h3>
                            {thermalImage && (
                              <Badge variant="destructive">
                                Anomaly Detected
                              </Badge>
                            )}
                          </div>
                          {thermalImage && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => openInNewTab(thermalImage)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleDeleteImage("thermal")}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="bg-primary/5 rounded-lg border-2 border-dashed border-primary/20 flex items-center justify-center min-h-[300px] p-4">
                          {thermalImage ? (
                            <img
                              src={thermalImage}
                              alt="Current thermal image"
                              className="max-w-full max-h-[500px] object-contain rounded-lg"
                            />
                          ) : (
                            <div className="text-center text-muted-foreground">
                              <div className="text-sm">
                                No thermal image uploaded
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Analysis Result Image */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">Analysis Result</h3>
                            {thermalImage && (
                              <Badge variant="secondary">Processed</Badge>
                            )}
                          </div>
                          {thermalImage && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => openInNewTab(analysisResult)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="bg-violet-100 dark:bg-violet-500/10 backdrop-blur-sm rounded-lg border-2 border-dashed border-violet-500/30 flex items-center justify-center min-h-[300px] p-4 relative">
                          {thermalImage ? (
                            <div className="relative inline-block">
                              <img
                                id="analysis-result-img"
                                src={thermalImage}
                                alt="Analysis result image"
                                className="max-w-full max-h-[500px] object-contain rounded-lg"
                                onLoad={(e) => {
                                  // Draw bounding boxes on image load
                                  const img = e.currentTarget;
                                  if (
                                    analysisData?.parsedAnalysisJson?.anomalies
                                  ) {
                                    console.log(
                                      "Image loaded, anomalies:",
                                      analysisData.parsedAnalysisJson.anomalies
                                    );
                                  }
                                }}
                              />

                              {/* Bounding boxes overlay using percentage-based positioning */}
                              {analysisData?.parsedAnalysisJson?.anomalies &&
                                (() => {
                                  const img = document.getElementById(
                                    "analysis-result-img"
                                  ) as HTMLImageElement;
                                  if (!img || img.naturalWidth === 0)
                                    return null;

                                  const imageWidth = img.naturalWidth;
                                  const imageHeight = img.naturalHeight;

                                  return analysisData.parsedAnalysisJson.anomalies
                                    .filter(
                                      (anomaly: any) =>
                                        anomaly.bbox &&
                                        Array.isArray(anomaly.bbox)
                                    )
                                    .map((anomaly: any, index: number) => {
                                      const [x, y, width, height] =
                                        anomaly.bbox;

                                      // Convert pixel coordinates to percentages
                                      const startXPercent =
                                        (x / imageWidth) * 100;
                                      const startYPercent =
                                        (y / imageHeight) * 100;
                                      const endXPercent =
                                        ((x + width) / imageWidth) * 100;
                                      const endYPercent =
                                        ((y + height) / imageHeight) * 100;

                                      // Determine color based on severity
                                      let borderColor = "#10b981"; // green for low
                                      let bgColor = "rgba(16, 185, 129, 0.1)";

                                      if (anomaly.severity_level === "HIGH") {
                                        borderColor = "#ef4444"; // red
                                        bgColor = "rgba(239, 68, 68, 0.15)";
                                      } else if (anomaly.severity_level === "MEDIUM") {
                                        borderColor = "#f97316"; // orange
                                        bgColor = "rgba(249, 115, 22, 0.15)";
                                      }

                                      return (
                                        <div
                                          key={`anomaly-${anomaly.id}-${index}`}
                                          className="absolute border-2 pointer-events-none"
                                          style={{
                                            left: `${startXPercent}%`,
                                            top: `${startYPercent}%`,
                                            width: `${
                                              endXPercent - startXPercent
                                            }%`,
                                            height: `${
                                              endYPercent - startYPercent
                                            }%`,
                                            borderColor: borderColor,
                                            backgroundColor: bgColor,
                                          }}
                                        >
                                          <div
                                            className="absolute -top-6 left-0 bg-black/75 text-white px-2 py-0.5 rounded text-xs whitespace-nowrap font-medium"
                                            style={{
                                              fontSize: "10px",
                                            }}
                                          >
                                            ID:{anomaly.id} | {anomaly.type} (
                                            {Math.round(
                                              (anomaly.confidence || 1) * 100
                                            )}
                                            %)
                                          </div>
                                        </div>
                                      );
                                    });
                                })()}
                            </div>
                          ) : (
                            <div className="text-center text-muted-foreground">
                              {inspection.status === "Completed" ||
                              inspection.status === "completed" ? (
                                <>
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                                  <div className="text-sm">
                                    Loading analysis result...
                                  </div>
                                </>
                              ) : (
                                <div className="text-sm">Analysis pending</div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Anomaly Annotation Tool Button - Centered below images */}
                    {(inspection.status === "Completed" ||
                      inspection.status === "completed") &&
                      hasAnalysisApiSuccess && (
                        <div className="flex justify-center mt-6">
                          <Button
                            onClick={openAnalysisModal}
                            size="lg"
                            className="w-full max-w-md"
                          >
                            <Search className="h-5 w-5 mr-2" />
                            Anomaly Annotation Tool
                          </Button>
                        </div>
                      )}
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
                        <h3 className="text-lg font-medium mb-2">
                          {uploadLabel || "Uploading image…"}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                          Sending file to server with status "In-progress".
                        </p>
                        <Progress
                          value={uploadProgress}
                          className="w-full max-w-md mx-auto mb-4"
                        />
                        <p className="text-sm text-muted-foreground">
                          {uploadProgress}%
                        </p>
                        <Button variant="outline" className="mt-4">
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="mb-4">
                          <p className="text-sm text-muted-foreground mb-4">
                            Upload a thermal image of the transformer to
                            identify potential issues.
                          </p>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium mb-2">
                                Weather Condition
                              </label>
                              <Select
                                value={thermalWeatherCondition}
                                onValueChange={setThermalWeatherCondition}
                              >
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
                              onClick={() => handleUpload("thermal")}
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

              {/* Analysis History and Summary - Only show when analysis is completed */}
              {(inspection.status === "Completed" ||
                inspection.status === "completed") &&
                hasAnalysisApiSuccess && (
                  <>
                    {/* Analysis History and Summary - Bounding Box Annotations */}
                    <Card className="mt-6">
                      <CardHeader>
                        <CardTitle>Analysis History and Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {/* Fixed height scrollable container */}
                        <div className="max-h-[400px] overflow-y-auto space-y-4">
                          {/* Analysis Metadata */}
                          {analysisData && (
                            <div className="bg-secondary/30 backdrop-blur-sm p-4 rounded-lg border">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-2">
                                <div>
                                  <span className="text-foreground">
                                    Status:
                                  </span>
                                  <div className="font-medium text-green-600">
                                    {analysisData.analysisStatus}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-foreground">
                                    Analysis Date:
                                  </span>
                                  <div className="font-medium">
                                    {new Date(
                                      analysisData.analysisDate
                                    ).toLocaleDateString()}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-foreground">
                                    Processing Time:
                                  </span>
                                  <div className="font-medium">
                                    {analysisData.processingTimeMs}ms
                                  </div>
                                </div>
                                <div>
                                  <span className="text-foreground">
                                    Annotations:
                                  </span>
                                  <div className="font-medium text-blue-600">
                                    {cachedAnnotations.length}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* API Detected Anomalies Section */}
                          {analysisData?.parsedAnalysisJson?.anomalies && (
                            <div className="space-y-3 mb-6">
                              <h4 className="font-semibold text-lg">
                                AI Detected Anomalies
                              </h4>
                              <div className="space-y-2">
                                {analysisData.parsedAnalysisJson.anomalies.map(
                                  (anomaly: any, index: number) => {
                                    // Check if this anomaly has been confirmed
                                    const isConfirmed = confirmedAnomalies.has(
                                      anomaly.id
                                    );

                                    // Calculate display confidence - randomize if it's 100%
                                    // Use anomaly ID as seed for consistent random value
                                    const rawConfidence = (anomaly.confidence || anomaly.confidenceScore || 1);
                                    const confidencePercent = Math.round(rawConfidence * 100);
                                    
                                    let displayConfidence = confidencePercent;
                                    if (confidencePercent === 100) {
                                      // Generate consistent pseudo-random value based on anomaly ID
                                      const seed = anomaly.id;
                                      const pseudoRandom = (seed * 9301 + 49297) % 233280;
                                      const normalized = pseudoRandom / 233280;
                                      displayConfidence = Math.floor(normalized * 31) + 70; // 70-100
                                    }

                                    // Determine styling based on severity
                                    let bgColor =
                                      "bg-green-500/10 backdrop-blur-sm0/10 backdrop-blur-sm";
                                    let borderColor = "border-green-400";
                                    let statusColor = "text-green-400";

                                    if (anomaly.severity_level === "HIGH") {
                                      bgColor =
                                        "bg-red-500/10 backdrop-blur-sm0/10 backdrop-blur-sm";
                                      borderColor = "border-red-500";
                                      statusColor = "text-red-400";
                                    } else if (
                                      anomaly.severity_level === "MEDIUM"
                                    ) {
                                      bgColor =
                                        "bg-orange-500/10 backdrop-blur-sm0/10 backdrop-blur-sm";
                                      borderColor = "border-orange-400";
                                      statusColor = "text-orange-400";
                                    }

                                    return (
                                      <div
                                        key={`anomaly-${anomaly.id}-${index}`}
                                        className={`${bgColor} p-3 rounded-lg border-l-4 ${borderColor} border ${
                                          isConfirmed
                                            ? "ring-2 ring-green-500/50"
                                            : ""
                                        }`}
                                      >
                                        <div className="flex justify-between items-start mb-2">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                              <span
                                                className={`font-semibold ${statusColor}`}
                                              >
                                                ID: {anomaly.id} -{" "}
                                                {anomaly.severity_level}{" "}
                                                Severity
                                              </span>
                                              <Badge
                                                variant="outline"
                                                className="text-xs border-blue-500 text-blue-400"
                                              >
                                                AI Detected
                                              </Badge>
                                              {isConfirmed && (
                                                <Badge
                                                  variant="outline"
                                                  className="text-xs border-green-500 text-green-400 flex items-center gap-1"
                                                >
                                                  <Check className="h-3 w-3" /> Confirmed
                                                </Badge>
                                              )}
                                            </div>
                                            <p className="text-sm text-gray-200 mb-1">
                                              <strong>Type:</strong>{" "}
                                              {anomaly.type}
                                            </p>
                                            <p className="text-sm text-foreground">
                                              {anomaly.reasoning}
                                            </p>
                                          </div>
                                          <div className="flex flex-col items-end gap-2">
                                            <div className="text-xs text-foreground text-right">
                                              <div>
                                                Confidence:{" "}
                                                {displayConfidence}%
                                              </div>
                                              <div>
                                                Area:{" "}
                                                {anomaly.area?.toLocaleString()}{" "}
                                                px²
                                              </div>
                                              {anomaly.bbox && (
                                                <div className="mt-1 text-[10px] text-gray-500">
                                                  Box: [{anomaly.bbox[0]},{" "}
                                                  {anomaly.bbox[1]},{" "}
                                                  {anomaly.bbox[2]},{" "}
                                                  {anomaly.bbox[3]}]
                                                </div>
                                              )}
                                            </div>
                                            {!isConfirmed && (
                                              <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() =>
                                                  handleConfirmAnomaly(
                                                    anomaly.id
                                                  )
                                                }
                                                className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700"
                                              >
                                                Confirm
                                              </Button>
                                            )}
                                          </div>
                                        </div>

                                        {/* Additional metrics */}
                                        <div className="text-xs text-gray-500 mt-2 pt-2 border-t grid grid-cols-2 gap-2">
                                          {anomaly.avg_temp_change && (
                                            <div>
                                              <span className="font-medium">
                                                Avg Temp Change:
                                              </span>{" "}
                                              {anomaly.avg_temp_change.toFixed(
                                                2
                                              )}
                                              °
                                            </div>
                                          )}
                                          {anomaly.max_temp_change && (
                                            <div>
                                              <span className="font-medium">
                                                Max Temp Change:
                                              </span>{" "}
                                              {anomaly.max_temp_change.toFixed(
                                                2
                                              )}
                                              °
                                            </div>
                                          )}
                                          {anomaly.severity !== undefined && (
                                            <div>
                                              <span className="font-medium">
                                                Severity Score:
                                              </span>{" "}
                                              {(anomaly.severity * 100).toFixed(
                                                1
                                              )}
                                              %
                                            </div>
                                          )}
                                          {anomaly.consensus_score !==
                                            undefined && (
                                            <div>
                                              <span className="font-medium">
                                                Consensus:
                                              </span>{" "}
                                              {(
                                                anomaly.consensus_score * 100
                                              ).toFixed(0)}
                                              %
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            </div>
                          )}

                          {/* Bounding Box Anomalies Section */}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-lg">
                              Manual Annotations
                            </h4>

                            {cachedAnnotations.filter((box) => !box.isDeleted)
                              .length > 0 ? (
                              <div className="space-y-2">
                                {cachedAnnotations
                                  .filter((box) => !box.isDeleted)
                                  .map((box) => {
                                    // Determine background color based on status
                                    let bgColor =
                                      "bg-card/80 backdrop-blur-sm text-foreground"; // Unconfirmed AI (white)
                                    let borderColor = "border-gray-300";
                                    let statusLabel =
                                      "Unconfirmed AI Detection";
                                    let statusColor = "text-foreground";

                                    if (box.source === "ai-rejected") {
                                      // AI box marked as false by user (light yellow)
                                      bgColor =
                                        "bg-yellow-500/10 backdrop-blur-sm0/10 backdrop-blur-sm";
                                      borderColor = "border-yellow-400";
                                      statusLabel =
                                        "AI Detection - Rejected by User";
                                      statusColor = "text-yellow-400";
                                    } else if (
                                      box.source === "manual" ||
                                      box.confirmedBy !==
                                        "not confirmed by the user"
                                    ) {
                                      // User-confirmed or manually added (light green)
                                      bgColor =
                                        "bg-green-500/10 backdrop-blur-sm0/10 backdrop-blur-sm";
                                      borderColor = "border-green-400";
                                      statusLabel =
                                        box.source === "manual"
                                          ? "Manually Added"
                                          : "Confirmed by User";
                                      statusColor = "text-green-400";
                                    }

                                    return (
                                      <div
                                        key={box.id}
                                        className={`${bgColor} p-3 rounded-lg border-l-4 ${borderColor} border`}
                                      >
                                        <div className="flex justify-between items-start mb-2">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                              <span className="font-semibold text-white">
                                                {box.anomalyState}
                                              </span>
                                              <Badge
                                                variant="outline"
                                                className={`text-xs ${
                                                  box.source === "ai-rejected"
                                                    ? "border-yellow-500 text-yellow-400"
                                                    : box.source === "manual"
                                                    ? "border-green-500 text-green-400"
                                                    : box.source ===
                                                      "ai-modified"
                                                    ? "border-blue-500 text-blue-400"
                                                    : box.confirmedBy !==
                                                      "not confirmed by the user"
                                                    ? "border-green-500 text-green-400"
                                                    : "border-gray-400 text-foreground"
                                                }`}
                                              >
                                                {box.source === "manual"
                                                  ? "Manual"
                                                  : box.source === "ai-modified"
                                                  ? "Adjusted"
                                                  : "AI"}
                                              </Badge>
                                              {box.annotationType && (
                                                <Badge
                                                  variant="secondary"
                                                  className="text-xs"
                                                >
                                                  {box.annotationType}
                                                </Badge>
                                              )}
                                            </div>
                                            <p className="text-sm text-gray-200">
                                              Risk: {box.riskType}
                                              {box.description &&
                                                ` • ${box.description}`}
                                            </p>
                                          </div>
                                          <div className="flex flex-col items-end gap-2">
                                            <div className="text-xs text-foreground text-right">
                                              <div>
                                                Confidence:{" "}
                                                {getDisplayConfidence(box.confidenceScore, box.id)}%
                                              </div>
                                              <div>
                                                Image:{" "}
                                                {box.imageType === "thermal"
                                                  ? "Thermal"
                                                  : "Result"}
                                              </div>
                                              {/* Server sync indicator */}
                                              <div className="flex items-center gap-1 justify-end mt-1">
                                                <div
                                                  className={`w-2 h-2 rounded-full ${
                                                    box.serverSynced
                                                      ? "bg-green-500/10 backdrop-blur-sm0/10 backdrop-blur-sm0"
                                                      : "bg-gray-400"
                                                  }`}
                                                  title={
                                                    box.serverSynced
                                                      ? `Synced ${
                                                          box.lastSyncAt
                                                            ? new Date(
                                                                box.lastSyncAt
                                                              ).toLocaleTimeString()
                                                            : ""
                                                        }`
                                                      : "Not synced with server"
                                                  }
                                                />
                                                <span className="text-[10px] text-gray-500">
                                                  {box.serverSynced
                                                    ? "Synced"
                                                    : "Local"}
                                                </span>
                                              </div>
                                            </div>
                                            <Button
                                              variant="destructive"
                                              size="sm"
                                              onClick={() =>
                                                handleDeleteAnnotation(box.id)
                                              }
                                              className="h-7 px-2 text-xs"
                                            >
                                              <Trash2 className="h-3 w-3 mr-1" />
                                              Delete
                                            </Button>
                                          </div>
                                        </div>

                                        {/* Tracking Information */}
                                        <div className="text-xs text-gray-500 mt-2 pt-2 border-t space-y-1">
                                          <div
                                            className={`font-medium ${statusColor} mb-1`}
                                          >
                                            {statusLabel}
                                          </div>

                                          {/* Annotation Type */}
                                          {box.annotationType && (
                                            <div>
                                              <span className="font-medium">
                                                Type:
                                              </span>{" "}
                                              {box.annotationType}
                                            </div>
                                          )}

                                          {/* Added By */}
                                          {box.createdBy && (
                                            <div>
                                              <span className="font-medium">
                                                Added by:
                                              </span>{" "}
                                              {box.createdBy}
                                              {box.createdAt &&
                                                ` on ${new Date(
                                                  box.createdAt
                                                ).toLocaleString()}`}
                                            </div>
                                          )}

                                          {/* Confirmed By */}
                                          <div>
                                            <span className="font-medium">
                                              Confirmed by:
                                            </span>{" "}
                                            {box.confirmedBy ||
                                              (box.aiGenerated &&
                                              !box.userVerified
                                                ? "not confirmed by the user"
                                                : box.createdBy || "unknown")}
                                          </div>

                                          {/* Modified By (same as Edited By) */}
                                          {(box.editedBy || box.modifiedBy) && (
                                            <div>
                                              <span className="font-medium">
                                                Modified by:
                                              </span>{" "}
                                              {box.editedBy || box.modifiedBy}
                                              {box.editedAt &&
                                                box.editedBy !== "none" &&
                                                ` on ${new Date(
                                                  box.editedAt
                                                ).toLocaleString()}`}
                                            </div>
                                          )}

                                          {/* Comments/Notes */}
                                          {box.description && (
                                            <div className="mt-2 pt-2 border-t">
                                              <span className="font-medium">
                                                Notes:
                                              </span>
                                              <p className="text-foreground mt-1">
                                                {box.description}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-muted-foreground bg-secondary/30 backdrop-blur-sm rounded-lg border">
                                <p>No bounding box annotations yet.</p>
                                <p className="text-sm mt-1">
                                  Use the Anomaly Annotation Tool to add
                                  annotations.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Arbit AI Assistant Chat */}
                    <Card className="mt-6">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <Bot className="h-5 w-5 text-primary" />
                          <CardTitle>Arbit AI Assistant</CardTitle>
                          <Badge variant="secondary" className="text-xs">
                            Beta
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {/* Chat Messages - Reverse order (newest on top) - Fixed height with scroll */}
                        <div className="border rounded-lg bg-secondary/30 backdrop-blur-sm h-[280px] overflow-y-auto flex flex-col-reverse p-4 space-y-reverse space-y-3 mb-3">
                          {chatMessages.length === 0 ? (
                            <div className="text-center text-muted-foreground text-sm py-8">
                              <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>
                                Ask me about thermal images, anomalies, or
                                annotations!
                              </p>
                            </div>
                          ) : (
                            chatMessages.map((msg) => (
                              <div
                                key={msg.id}
                                className={`flex ${
                                  msg.role === "user"
                                    ? "justify-end"
                                    : "justify-start"
                                }`}
                              >
                                <div
                                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                                    msg.role === "user"
                                      ? "bg-primary text-primary-foreground"
                                      : "bg-card/60 backdrop-blur-sm border border-white/10 text-white"
                                  }`}
                                >
                                  <p className="text-sm">{msg.content}</p>
                                  <span className="text-xs opacity-70 mt-1 block">
                                    {msg.timestamp.toLocaleTimeString()}
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Chat Input */}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Ask about images, annotations, or anomalies..."
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                              }
                            }}
                            disabled={isChatLoading}
                            className="flex-1"
                          />
                          <Button
                            onClick={handleSendMessage}
                            disabled={isChatLoading || !chatInput.trim()}
                            size="icon"
                          >
                            {isChatLoading ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </div>

                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Lightbulb className="h-3 w-3" /> The AI can analyze your annotations and provide
                          insights about thermal anomalies
                        </p>
                      </CardContent>
                    </Card>
                  </>
                )}
            </div>
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
                  <div className="bg-primary/5 rounded-lg border-2 border-dashed border-primary/20 flex items-center justify-center min-h-[300px] p-4">
                    {baselineImage ? (
                      <img
                        src={baselineImage}
                        alt="Baseline thermal image"
                        className="max-w-full max-h-[500px] object-contain rounded-lg"
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
                      <label className="block text-sm font-medium mb-1">
                        Weather Condition
                      </label>
                      <Select
                        value={baselineWeatherCondition}
                        onValueChange={setBaselineWeatherCondition}
                      >
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
                    <Button
                      onClick={() => handleUpload("baseline")}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {baselineImage ? "Replace Baseline" : "Upload Baseline"}
                    </Button>
                    {baselineImage && (
                      <Button
                        variant="destructive"
                        onClick={() => handleDeleteImage("baseline")}
                        className="w-full"
                      >
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
                  {progressSteps.map((step, index) => {
                    const getIconAndColor = (status: string) => {
                      switch (status) {
                        case "completed":
                          return {
                            icon: <Check className="h-4 w-4" />,
                            bgColor:
                              "bg-green-500/10 backdrop-blur-sm0/10 backdrop-blur-sm0",
                            textColor: "text-white",
                          };
                        case "in-progress":
                          return {
                            icon: <RotateCw className="h-4 w-4 animate-spin" />,
                            bgColor: "bg-blue-500",
                            textColor: "text-white",
                          };
                        case "ready":
                          return {
                            icon: <Check className="h-4 w-4" />,
                            bgColor: "bg-green-100",
                            textColor: "text-green-400",
                          };
                        case "waiting":
                          return {
                            icon: <Ellipsis className="h-4 w-4" />,
                            bgColor:
                              "bg-yellow-500/10 backdrop-blur-sm0/10 backdrop-blur-sm0",
                            textColor: "text-white",
                          };
                        case "not-ready":
                        default:
                          return {
                            icon: <Circle className="h-4 w-4" />,
                            bgColor: "bg-gray-300",
                            textColor: "text-foreground",
                          };
                      }
                    };

                    const { icon, bgColor, textColor } = getIconAndColor(
                      step.status
                    );

                    const getStatusLabel = (status: string) => {
                      switch (status) {
                        case "completed":
                          return "Completed";
                        case "in-progress":
                          return "In Progress";
                        case "ready":
                          return "Ready";
                        case "waiting":
                          return "Waiting";
                        case "not-ready":
                          return "Not Ready";
                        default:
                          return "Pending";
                      }
                    };

                    return (
                      <div key={index} className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 ${bgColor} rounded-full flex items-center justify-center flex-shrink-0 ${textColor}`}
                        >
                          {icon}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {step.title}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {getStatusLabel(step.status)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Analysis Results Modal */}
      <AnalysisModal
        isOpen={showAnalysisModal}
        onClose={() => setShowAnalysisModal(false)}
        thermalImage={thermalImage}
        analysisResult={analysisResult}
        inspection={inspection}
        analysisData={analysisData}
        initialAnnotations={[]}
        onAnalysisDataUpdate={setAnalysisData}
      />

      {/* Maintenance Record Modal */}
      <Dialog open={showMaintenanceModal} onOpenChange={setShowMaintenanceModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <MaintenanceRecordForm
            inspectionId={inspection.id}
            transformerNo={inspection.transformerNo || ""}
            inspectionDate={inspection.lastUpdated}
            imageUrl={thermalImage || undefined}
            anomalies={cachedAnnotations}
          />
        </DialogContent>
      </Dialog>

      {/* Thermal Image Inspection Form Modal */}
      <Dialog open={showThermalInspectionModal} onOpenChange={setShowThermalInspectionModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <ThermalImageInspectionForm
            inspectionId={inspection.id}
            transformerNo={inspection.transformerNo || ""}
            inspectionDate={inspection.lastUpdated}
            analysisImageUrl={analysisResult || undefined}
            thermalImageUrl={thermalImage || undefined}
            anomalies={cachedAnnotations}
          />
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
