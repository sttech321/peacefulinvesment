import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EmailMessage } from "@/pages/admin/email/types";
import { EmailRow } from "@/pages/admin/email/components/EmailRow";

export function EmailTable({
  tableBodyKey,
  messages,
  isAllSelected,
  isSelected,
  isExpanded,
  onToggleSelectAll,
  onToggleSelectEmail,
  onToggleThread,
  onOpenMessage,
  onReply,
  onDelete,
}: {
  tableBodyKey: string;
  messages: EmailMessage[];
  isAllSelected: boolean;
  isSelected: (id: string) => boolean;
  isExpanded: (id: string) => boolean;
  onToggleSelectAll: (checked: boolean) => void;
  onToggleSelectEmail: (id: string) => void;
  onToggleThread: (id: string) => void;
  onOpenMessage: (message: EmailMessage) => void;
  onReply: (message: EmailMessage) => void;
  onDelete: (message: EmailMessage) => void;
}) {
  return (
    <div className="rounded-md border border-muted/20 overflow-x-auto">
      <Table className="border-none p-0 rounded-lg bg-white/5">
        <TableHeader>
          <TableRow className="border-b border-muted/20 hover:bg-white/15 bg-white/15 text-white">
            <TableHead className="w-[40px]">
              <Checkbox
                className="rounded-[4px] mt-0.5"
                checked={isAllSelected}
                onCheckedChange={(checked) => onToggleSelectAll(!!checked)}
              />
            </TableHead>
            <TableHead className="text-white pl-16">From</TableHead>
            <TableHead className="text-white">Subject</TableHead>
            <TableHead className="text-white">Date</TableHead>
            <TableHead className="text-white w-[150px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody key={tableBodyKey}>
          {messages.map((m) => (
            <EmailRow
              key={m.id}
              message={m}
              isSelected={isSelected(m.id)}
              isExpanded={isExpanded(m.id)}
              onToggleSelect={onToggleSelectEmail}
              onToggleThread={onToggleThread}
              onOpenMessage={onOpenMessage}
              onReply={onReply}
              onDelete={onDelete}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

