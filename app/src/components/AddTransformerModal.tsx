import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { API_ENDPOINTS, type ApiEnvelope } from "@/lib/api";

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
    transformerNoPrefix: "",
    transformerNoNumber: "",
    poleNoPrefix: "",
    poleNoNumber: "",
    type: "",
    locationDetails: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // Merge prefix + number for transformer and pole
    const transformerNo = `${formData.transformerNoPrefix}${formData.transformerNoNumber}`;
    const poleNo = `${formData.poleNoPrefix}${formData.poleNoNumber}`;

    // Map UI fields -> API payload
    const payload = {
      regions: formData.region, // API expects plural key
      poleNo: poleNo,
      transformerNo: transformerNo,
      type: formData.type,
      location: formData.locationDetails,
    };

    try {
      const res = await fetch(API_ENDPOINTS.TRANSFORMER_CREATE, {
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
        transformerNo: transformerNo,
        poleNo: poleNo,
        type: formData.type,
        locationDetails: formData.locationDetails,
        ...created, // prefer server-returned fields
      };

      onAdd?.(newTransformer);

      // reset & close
      setOpen(false);
      setFormData({ 
        region: "", 
        transformerNoPrefix: "", 
        transformerNoNumber: "", 
        poleNoPrefix: "", 
        poleNoNumber: "", 
        type: "", 
        locationDetails: "" 
      });
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
            <Label htmlFor="region">Region</Label>
            <Select value={formData.region} onValueChange={(value) => setFormData(prev => ({ ...prev, region: value }))}>
              <SelectTrigger disabled={submitting}>
                <SelectValue placeholder="Select region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Colombo">Colombo</SelectItem>
                <SelectItem value="Nugegoda">Nugegoda</SelectItem>
                <SelectItem value="Maharagama">Maharagama</SelectItem>
                <SelectItem value="Kotte">Kotte</SelectItem>
                <SelectItem value="Dehiwala">Dehiwala</SelectItem>
                <SelectItem value="Moratuwa">Moratuwa</SelectItem>
                <SelectItem value="Panadura">Panadura</SelectItem>
                <SelectItem value="Kalutara">Kalutara</SelectItem>
                <SelectItem value="Galle">Galle</SelectItem>
                <SelectItem value="Matara">Matara</SelectItem>
                <SelectItem value="Kandy">Kandy</SelectItem>
                <SelectItem value="Gampaha">Gampaha</SelectItem>
                <SelectItem value="Negombo">Negombo</SelectItem>
                <SelectItem value="Kurunegala">Kurunegala</SelectItem>
                <SelectItem value="Anuradhapura">Anuradhapura</SelectItem>
                <SelectItem value="Jaffna">Jaffna</SelectItem>
                <SelectItem value="Batticaloa">Batticaloa</SelectItem>
                <SelectItem value="Trincomalee">Trincomalee</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transformerNo">Transformer No</Label>
            <div className="flex gap-2">
              <Select 
                value={formData.transformerNoPrefix} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, transformerNoPrefix: value }))}
              >
                <SelectTrigger className="w-[140px]" disabled={submitting}>
                  <SelectValue placeholder="Prefix" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRF-">TRF-</SelectItem>
                  <SelectItem value="TX-">TX-</SelectItem>
                  <SelectItem value="T-">T-</SelectItem>
                  <SelectItem value="TR-">TR-</SelectItem>
                  <SelectItem value="DIST-">DIST-</SelectItem>
                  <SelectItem value="SUB-">SUB-</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Number"
                value={formData.transformerNoNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, transformerNoNumber: e.target.value }))}
                disabled={submitting}
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="poleNo">Pole No</Label>
            <div className="flex gap-2">
              <Select 
                value={formData.poleNoPrefix} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, poleNoPrefix: value }))}
              >
                <SelectTrigger className="w-[140px]" disabled={submitting}>
                  <SelectValue placeholder="Prefix" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="P-">P-</SelectItem>
                  <SelectItem value="POLE-">POLE-</SelectItem>
                  <SelectItem value="PL-">PL-</SelectItem>
                  <SelectItem value="EN-">EN-</SelectItem>
                  <SelectItem value="EP-">EP-</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Number"
                value={formData.poleNoNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, poleNoNumber: e.target.value }))}
                disabled={submitting}
                className="flex-1"
              />
            </div>
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
              placeholder="Enter location details"
              value={formData.locationDetails}
              onChange={(e) => setFormData(prev => ({ ...prev, locationDetails: e.target.value }))}
              disabled={submitting}
            />
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