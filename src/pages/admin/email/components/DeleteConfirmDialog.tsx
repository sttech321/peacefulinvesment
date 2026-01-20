import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  deleting,
  onCancel,
  onConfirm,
  confirmLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  deleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="pt-4 text-black">{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-[8px] hover:bg-muted/10 border-0"
            onClick={onCancel}
            disabled={!!deleting}
          >
            Cancel
          </Button>

          <Button variant="destructive" className="rounded-[8px]" disabled={!!deleting} onClick={onConfirm}>
            {deleting ? "Deleting..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

