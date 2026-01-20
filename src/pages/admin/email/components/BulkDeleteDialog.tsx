import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function BulkDeleteDialog({
  open,
  onOpenChange,
  count,
  deleting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count: number;
  deleting: boolean;
  onConfirm: () => Promise<void> | void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Emails</DialogTitle>
          <DialogDescription className="pt-4 text-black">
            Are you sure you want to delete <strong>{count}</strong> selected emails? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" className="rounded-[8px]" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>

          <Button
            variant="destructive"
            className="rounded-[8px]"
            disabled={deleting}
            onClick={async () => {
              await onConfirm();
              onOpenChange(false);
            }}
          >
            {deleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

