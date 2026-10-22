import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ordersApi } from "@/lib/api/orders";

interface AcceptOrderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    user_id: string;
    total_amount: number;
  } | null;
}

export const AcceptOrderDialog = ({ isOpen, onClose, order }: AcceptOrderDialogProps) => {
  const [trackingId, setTrackingId] = useState("");
  const [consignmentId, setConsignmentId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleAccept = async () => {
    if (!order) return;

    if (!trackingId.trim()) {
      toast.error("Please enter the Steadfast tracking ID");
      return;
    }

    setIsSubmitting(true);

    try {
      await ordersApi.accept(order.id, {
        trackingId: trackingId.trim(),
        consignmentId: consignmentId.trim() || undefined,
        courierName: "Steadfast",
      });

      toast.success("Order accepted and tracking ID added");
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
      handleClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to accept order";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTrackingId("");
    setConsignmentId("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Accept Order
          </DialogTitle>
          <DialogDescription>
            Enter courier tracking details to mark this order as processing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="tracking-id">Steadfast Tracking ID *</Label>
            <Input
              id="tracking-id"
              placeholder="e.g. STF-849201"
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="consignment-id">Consignment ID (Optional)</Label>
            <Input
              id="consignment-id"
              placeholder="e.g. 849201"
              value={consignmentId}
              onChange={(e) => setConsignmentId(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleAccept} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Accepting...
              </>
            ) : (
              "Accept & Dispatch"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
