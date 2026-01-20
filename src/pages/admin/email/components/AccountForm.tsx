import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type EmailAccountFormValues = {
  email: string;
  password: string;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  provider: string;
  sync_enabled: boolean;
};

export function AccountForm({
  form,
  setForm,
  isEdit = false,
}: {
  form: EmailAccountFormValues;
  setForm: React.Dispatch<React.SetStateAction<EmailAccountFormValues>>;
  isEdit?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 pt-4">
      <div>
        <Label>Email</Label>
        <Input
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
          style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
        />
      </div>

      <div>
        <Label>Password {isEdit && "(leave blank to keep)"}</Label>
        <Input
          required
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
          style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
        />
      </div>

      <div>
        <Label>IMAP Host</Label>
        <Input
          required
          value={form.imap_host}
          onChange={(e) => setForm({ ...form, imap_host: e.target.value })}
          className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
          style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
        />
      </div>

      <div>
        <Label>IMAP Port</Label>
        <Input
          required
          type="number"
          value={form.imap_port}
          onChange={(e) => setForm({ ...form, imap_port: Number(e.target.value) })}
          className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
          style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
        />
      </div>

      <div>
        <Label>SMTP Host</Label>
        <Input
          required
          value={form.smtp_host}
          onChange={(e) => setForm({ ...form, smtp_host: e.target.value })}
          className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
          style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
        />
      </div>

      <div>
        <Label>SMTP Port</Label>
        <Input
          required
          type="number"
          value={form.smtp_port}
          onChange={(e) => setForm({ ...form, smtp_port: Number(e.target.value) })}
          className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
          style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
        />
      </div>

      <div>
        <Label>Provider</Label>
        <Select required value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v })}>
          <SelectTrigger
            className="rounded-[8px] border-muted-foreground/60 hover:border-muted-foreground shadow-none focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-offset-transparent data-[placeholder]:text-gray-400 h-[40px]"
            style={{ "--tw-ring-offset-width": "0" } as React.CSSProperties}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-secondary-foreground bg-black/90 text-white">
            <SelectItem value="custom">Custom</SelectItem>
            <SelectItem value="gmail">Gmail</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

