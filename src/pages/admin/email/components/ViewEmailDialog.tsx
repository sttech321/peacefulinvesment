import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { EmailMessage } from "@/pages/admin/email/types";

export function ViewEmailDialog({
  open,
  onOpenChange,
  message,
  backendUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: EmailMessage | null;
  backendUrl: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0">
        <DialogHeader className="p-6">
          <DialogTitle>{message?.subject}</DialogTitle>
          <DialogDescription className=" text-black/80 font-inter">{message?.from_email}</DialogDescription>
        </DialogHeader>
        <div className="px-6 mb-4 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
          {message?.body_html ? <div dangerouslySetInnerHTML={{ __html: message.body_html }} /> : <pre>{message?.body_text}</pre>}
        </div>

        {message?.attachments?.length > 0 && (
          <div className="p-6 border-t mt-0">
            <div className="font-semibold mb-0">Attachments</div>

            <div className="space-y-2">
              {message.attachments.map((att) => (
                <div key={att.part} className="flex items-center justify-between border-0 rounded p-0">
                  <div className="text-sm pr-4">{att.filename}</div>
                  <a
                    href={`${backendUrl}/api/emails/attachment?email_account_id=${message.email_account?.id}&uid=${message.id.split("-").pop()}&part=${att.part}&filename=${encodeURIComponent(att.filename)}&mimeType=${encodeURIComponent(att.mimeType)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-0 text-sm  bg-primary text-primary-foreground hover:bg-primary-600 shadow-sm hover:shadow-md h-10 px-5 py-2 rounded-[8px] gap-0 flex items-center justify-center"
                  >
                    {att.mimeType === "application/pdf" ? "View PDF" : "Download Attachments"}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

