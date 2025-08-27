import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";

const TRANSFORMER_CREATE_URL = "http://localhost:5509/transformer-thermal-inspection/transformer-management/create";
type ApiEnvelope<T> = { responseCode?: string; responseDescription?: string; responseData?: T } | T;

interface AddTransformerModalProps {
  trigger?: React.ReactNode;
  onAdd?: (transformer: any) => void;
}

export function AddTransformerModal({ trigger, onAdd }: AddTransformerModalProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    region: "",
    transformerNo: "",
    poleNo: "",
    type: "",
    locationDetails: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // Map UI fields -> API payload
    const payload = {
      regions: formData.region, // API expects plural key
      poleNo: formData.poleNo,
      transformerNo: formData.transformerNo,
      type: formData.type,
      location: formData.locationDetails,
    };

    try {
      const res = await fetch(TRANSFORMER_CREATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }

      const raw: ApiEnvelope<any> = await res.json();
      const created = (raw as any)?.responseData ?? raw;

      // Build an item for UI list update
      const newTransformer = {
        id: created?.id ?? Math.random().toString(36).substr(2, 9),
        region: formData.region,
        transformerNo: formData.transformerNo,
        poleNo: formData.poleNo,
        type: formData.type,
        locationDetails: formData.locationDetails,
        ...created, // prefer server-returned fields
      };

      onAdd?.(newTransformer);

      // reset & close
      setOpen(false);
      setFormData({ region: "", transformerNo: "", poleNo: "", type: "", locationDetails: "" });
    } catch (err: any) {
      setError(err?.message || "Failed to save transformer");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Add Transformer</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>Add Transformer</DialogTitle>
          {/* <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            className="h-6 w-6"
          >
            <X className="h-4 w-4" />
          </Button> */}
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="region">Regions</Label>
            <Select value={formData.region} onValueChange={(value) => setFormData(prev => ({ ...prev, region: value }))}>
              <SelectTrigger disabled={submitting}>
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nugegoda">Nugegoda</SelectItem>
                <SelectItem value="maharagama">Maharagama</SelectItem>
                <SelectItem value="colombo">Colombo</SelectItem>
              </SelectContent>
            </Select>
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

          <div className="space-y-2">
            <Label htmlFor="poleNo">Pole No</Label>
            <Input
              id="poleNo"
              placeholder="Pole No"
              value={formData.poleNo}
              onChange={(e) => setFormData(prev => ({ ...prev, poleNo: e.target.value }))}
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
              <SelectTrigger disabled={submitting}>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bulk">Bulk</SelectItem>
                <SelectItem value="distribution">Distribution</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="locationDetails">Location</Label>
            <Input
              id="locationDetails"
              list="location-options"
              placeholder="Start typing or select location"
              value={formData.locationDetails}
              onChange={(e) => setFormData(prev => ({ ...prev, locationDetails: e.target.value }))}
              disabled={submitting}
            />
            <datalist id="location-options">
              <option value="Colombo" />
              <option value="Kandy" />
              <option value="Galle" />
              <option value="Matara" />
              <option value="Negombo" />
              <option value="Jaffna" />
              <option value="Anuradhapura" />
              <option value="Polonnaruwa" />
              <option value="Kurunegala" />
              <option value="Ratnapura" />
              <option value="Badulla" />
              <option value="Nuwara Eliya" />
              <option value="Batticaloa" />
              <option value="Trincomalee" />
              <option value="Kalutara" />
              <option value="Hambantota" />
              <option value="Puttalam" />
              <option value="Ampara" />
              <option value="Monaragala" />
              <option value="Kilinochchi" />
            </datalist>
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