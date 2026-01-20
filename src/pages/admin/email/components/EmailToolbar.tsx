import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EmailAccount } from "@/pages/admin/email/types";

export function EmailToolbar({
  accounts,
  selectedAccount,
  onChangeSelectedAccount,
  searchTerm,
  onChangeSearchTerm,
  selectedCount,
  onOpenBulkDelete,
}: {
  accounts: EmailAccount[];
  selectedAccount: string | "all";
  onChangeSelectedAccount: (value: string | "all") => void;
  searchTerm: string;
  onChangeSearchTerm: (value: string) => void;
  selectedCount: number;
  onOpenBulkDelete: () => void;
}) {
  return (
    <div className="flex gap-2 mb-4">
      <Select value={selectedAccount} onValueChange={onChangeSelectedAccount}>
        <SelectTrigger
          className="w-100 min-w-96 max-w-lg rounded-[8px] border-0 shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400 h-10"
          style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
        >
          <SelectValue placeholder="All Accounts" />
        </SelectTrigger>
        <SelectContent className="border-secondary-foreground bg-black/90 text-white">
          <SelectItem value="all">All Accounts</SelectItem>
          {accounts.map((acc) => (
            <SelectItem key={acc.id} value={acc.id}>
              {acc.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        placeholder="Search..."
        className="w-100 min-w-96 max-w-lg rounded-[8px] shadow-none mt-0 focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 h-10 border-0"
        style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
        value={searchTerm}
        onChange={(e) => onChangeSearchTerm(e.target.value)}
      />

      {selectedCount > 0 && (
        <Button variant="destructive" className="rounded-[8px]" onClick={onOpenBulkDelete}>
          Delete Selected ({selectedCount})
        </Button>
      )}
    </div>
  );
}

