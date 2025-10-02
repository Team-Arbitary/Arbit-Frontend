import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";

const INSPECTION_CREATE_URL = "http://localhost:5509/transformer-thermal-inspection/inspection-management/create";
type ApiEnvelope<T> = { responseCode?: string; responseDescription?: string; responseData?: T } | T;

interface AddInspectionModalProps {
  trigger?: React.ReactNode;
  onAdd?: (inspection: any) => void;
  defaultTransformerNo?: string; // Pre-fill transformer number
}

export function AddInspectionModal({ trigger, onAdd, defaultTransformerNo }: AddInspectionModalProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    batch: "",
    transformerNo: defaultTransformerNo || "",
    date: undefined as Date | undefined,
    time: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const dateStr = formData.date ? format(formData.date, "yyyy-MM-dd") : undefined;
    const timeStr = formData.time ? (formData.time.length === 5 ? `${formData.time}:00` : formData.time) : undefined;

    const payload = {
      branch: formData.batch,
      transformerNo: formData.transformerNo,
      dateOfInspection: dateStr,
      maintenanceDate: dateStr,
      time: timeStr,
    };

    try {
      const res = await fetch(INSPECTION_CREATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

      const raw: ApiEnvelope<any> = await res.json();
      const created = (raw as any)?.responseData ?? raw;

      const uiItem = {
        id: created?.id ?? Math.random().toString(36).substr(2, 9),
        transformerNo: payload.transformerNo ?? "",
        inspectionNo: `000${Math.floor(Math.random() * 99999)}`,
        inspectedDate: payload.dateOfInspection && payload.time ? `${payload.dateOfInspection} ${payload.time}` : payload.dateOfInspection,
        maintenanceDate: undefined,
        status: "pending" as const,
      };

      onAdd?.(uiItem);

      setOpen(false);
      setFormData({ batch: "", transformerNo: defaultTransformerNo || "", date: undefined, time: "" });
    } catch (err: any) {
      setError(err?.message || "Failed to save inspection");
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form when modal opens with default transformer number
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      // Reset form with default transformer number when opening
      setFormData({ 
        batch: "", 
        transformerNo: defaultTransformerNo || "", 
        date: undefined, 
        time: "" 
      });
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || <Button>New Inspection</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>New Inspection</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="batch">Batch</Label>
            <Input
              id="batch"
              placeholder="e.g., Batch-2025-B"
              value={formData.batch}
              onChange={(e) => setFormData(prev => ({ ...prev, batch: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transformerNo">Transformer No</Label>
            <Input
              id="transformerNo"
              placeholder="Transformer No"
              value={formData.transformerNo}
              onChange={(e) => setFormData(prev => ({ ...prev, transformerNo: e.target.value }))}
              disabled={submitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date of Inspection</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    disabled={submitting}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.date ? format(formData.date, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.date}
                    onSelect={(date) => setFormData(prev => ({ ...prev, date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.time.split(':')[0] || ''}
                  onValueChange={(hour) => {
                    const minute = formData.time.split(':')[1] || '00';
                    setFormData(prev => ({ ...prev, time: `${hour}:${minute}` }));
                  }}
                  disabled={submitting}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Hour" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = i.toString().padStart(2, '0');
                      return (
                        <SelectItem key={hour} value={hour}>
                          {hour}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <span className="flex items-center">:</span>
                <Select
                  value={formData.time.split(':')[1] || ''}
                  onValueChange={(minute) => {
                    const hour = formData.time.split(':')[0] || '00';
                    setFormData(prev => ({ ...prev, time: `${hour}:${minute}` }));
                  }}
                  disabled={submitting}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Min" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 60 }, (_, i) => {
                      const minute = i.toString().padStart(2, '0');
                      return (
                        <SelectItem key={minute} value={minute}>
                          {minute}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={submitting}>
              {submitting ? "Saving..." : "Confirm"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}