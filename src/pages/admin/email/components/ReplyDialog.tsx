import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function ReplyDialog({
  open,
  onOpenChange,
  toEmail,
  replyBody,
  onChangeReplyBody,
  replyLoading,
  onCancel,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toEmail?: string;
  replyBody: string;
  onChangeReplyBody: (value: string) => void;
  replyLoading: boolean;
  onCancel: () => void;
  onSend: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reply</DialogTitle>
          <DialogDescription className="pt-2 text-gray-600 font-inter">To: {toEmail}</DialogDescription>
        </DialogHeader>

        <Textarea
          className="rounded-[8px] shadow-none mt-1 boder-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none resize-none"
          style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
          placeholder="Write your reply..."
          rows={6}
          value={replyBody}
          onChange={(e) => onChangeReplyBody(e.target.value)}
        />

        <DialogFooter>
          <Button variant="outline" className="rounded-[8px] hover:bg-muted/20 border-0" onClick={onCancel}>
            Cancel
          </Button>

          <Button className="rounded-[8px] border-0 hover:bg-primary/80 bg-primary" disabled={replyLoading} onClick={onSend}>
            {replyLoading ? "Sending..." : "Send Reply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

