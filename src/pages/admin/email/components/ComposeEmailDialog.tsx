import React from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ComposeFormValues = {
  to: string;
  subject: string;
  body: string;
};

export function ComposeEmailDialog({
  open,
  onOpenChange,
  composeForm,
  onChangeComposeForm,
  attachments,
  fileInputRef,
  onAttachmentChange,
  onRemoveAttachment,
  composeLoading,
  onCancel,
  onSend,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  composeForm: ComposeFormValues;
  onChangeComposeForm: (next: ComposeFormValues) => void;
  attachments: File[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  onAttachmentChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (index: number) => void;
  composeLoading: boolean;
  onCancel: () => void;
  onSend: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Compose Email</DialogTitle>
          <DialogDescription className="pt-1 text-gray-600">Send a new email</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>To</Label>
            <Input
              type="email"
              className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
              style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
              placeholder="recipient@example.com"
              value={composeForm.to}
              onChange={(e) => onChangeComposeForm({ ...composeForm, to: e.target.value })}
            />
          </div>

          <div>
            <Label>Subject</Label>
            <Input
              placeholder="Subject"
              className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
              style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
              value={composeForm.subject}
              onChange={(e) => onChangeComposeForm({ ...composeForm, subject: e.target.value })}
            />
          </div>

          <div>
            <Label>Message</Label>
            <Textarea
              rows={6}
              className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
              style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
              placeholder="Write your message..."
              value={composeForm.body}
              onChange={(e) => onChangeComposeForm({ ...composeForm, body: e.target.value })}
            />
          </div>

          <div>
            <Label>Attachments</Label>
            <Input
              ref={fileInputRef}
              type="file"
              className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
              style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
              multiple
              onChange={onAttachmentChange}
            />

            {attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {attachments.map((file, i) => (
                  <div key={i} className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{file.name}</span>
                    <Button size="sm" variant="ghost" onClick={() => onRemoveAttachment(i)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="outline" className="rounded-[8px] border-0 hover:bg-muted/10" onClick={onCancel}>
            Cancel
          </Button>

          <Button className="rounded-[8px] border-0 hover:bg-primary/80" disabled={composeLoading} onClick={onSend}>
            {composeLoading ? "Sending..." : "Send Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

