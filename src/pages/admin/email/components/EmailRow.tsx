import React, { memo } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, CornerDownRight, Reply, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell, TableRow } from "@/components/ui/table";
import type { EmailMessage } from "@/pages/admin/email/types";

export const EmailRow = memo(
  function EmailRow({
    message,
    isSelected,
    isExpanded,
    onToggleSelect,
    onToggleThread,
    onOpenMessage,
    onReply,
    onDelete,
  }: {
    message: EmailMessage;
    isSelected: boolean;
    isExpanded: boolean;
    onToggleSelect: (id: string) => void;
    onToggleThread: (id: string) => void;
    onOpenMessage: (message: EmailMessage) => void;
    onReply: (message: EmailMessage) => void;
    onDelete: (message: EmailMessage) => void;
  }) {
    const replies = message.replies ?? [];
    const hasReplies = replies.length > 0;

    return (
      <React.Fragment>
        {/* MAIN EMAIL ROW */}
        <TableRow
          className={`border-b border-muted/20 hover:bg-white/10 cursor-pointer ${!message.is_read ? "font-bold bg-white/15" : ""}`}
          onClick={() => {
            if (!isSelected) {
              onOpenMessage(message);
            }
          }}
        >
          <TableCell onClick={(e) => e.stopPropagation()}>
            <Checkbox
              className="rounded-[4px] mt-0.5"
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(message.id)}
            />
          </TableCell>
          <TableCell className="text-white">
            <div className="flex items-center gap-4">
              {hasReplies ? (
                <button
                  type="button"
                  aria-label={isExpanded ? "Collapse replies" : "Expand replies"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleThread(message.id);
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-muted/30 bg-transparent text-muted-foreground transition-colors hover:bg-white/10 ttttttttttttt"
                >
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              ) : (
                <span className="h-6 w-6" />
              )}
              <span>{message.from_email}</span>
            </div>
          </TableCell>
          <TableCell className="text-white">{message.subject}</TableCell>
          <TableCell className="text-white whitespace-nowrap">
            {format(new Date(message.date_received), "MMM d yyyy HH:mm")}
          </TableCell>
          <TableCell>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="bg-muted/20 hover:bg-muted/40 rounded-[8px] border-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onReply(message);
                }}
              >
                <Reply className="h-4 w-4 text-white" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="bg-red-600 hover:bg-red-700 rounded-[8px] border-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(message);
                }}
              >
                <Trash2 className="h-4 w-4 text-white" />
              </Button>
            </div>
          </TableCell>
        </TableRow>

        {/* REPLIES THREAD */}
        {hasReplies && isExpanded && (
          <TableRow className="border-b border-muted/20 bg-transparent hover:bg-white/10">
            <TableCell colSpan={5} className="bg-transparent pt-0 pb-4">
              <div className="pl-10 pr-6 pt-6">
                <div className="space-y-3">
                  {replies.map((reply) => (
                    <div key={reply.id} className="flex gap-4 border-b border-muted/20 pb-3 last:border-0 last:pb-0">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <Badge
                            variant="outline"
                            className="rounded-full px-2 py-0 text-[0.65rem] leading-5 border-muted-foreground/50"
                          >
                            <CornerDownRight className="h-4 w-4 mr-2 text-white" /> Reply
                          </Badge>
                          <span className="font-normal normal-case tracking-normal">
                            {format(new Date(reply.created_at), "MMM d yyyy HH:mm")}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-white">{reply.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    );
  },
  (prev, next) =>
    prev.message === next.message && prev.isSelected === next.isSelected && prev.isExpanded === next.isExpanded
);

