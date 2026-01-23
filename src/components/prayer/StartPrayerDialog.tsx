import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export type StartPrayerDialogTimezoneOption = { value: string; label: string };

export type StartPrayerDialogForm = {
  name: string;
  email: string;
  phone_country_code: string;
  phone_number: string;
  person_needs_help: string;
  start_date: string;
  end_date?: string;
  prayer_time: string;
  timezone: string;
};

export type TraditionalDateRange = {
  start_date: string;
  end_date: string;
  label?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  submitting?: boolean;
  submitDisabled?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  showStartDatePicker?: boolean;
  traditionalDates?: TraditionalDateRange;
  form: StartPrayerDialogForm;
  setForm: (next: StartPrayerDialogForm) => void;
  timezoneOptions: StartPrayerDialogTimezoneOption[];
  onSubmit: () => void;
};

export function StartPrayerDialog({
  open,
  onOpenChange,
  title,
  description,
  submitting = false,
  submitDisabled = false,
  submitLabel = "Start Prayer",
  cancelLabel = "Cancel",
  showStartDatePicker = true,
  traditionalDates,
  form,
  setForm,
  timezoneOptions,
  onSubmit,
}: Props) {
  const isTraditionalApplied =
    Boolean(traditionalDates?.start_date && traditionalDates?.end_date) &&
    form.start_date === traditionalDates?.start_date &&
    String(form.end_date || "") === traditionalDates?.end_date;

  const applyTraditionalDates = () => {
    if (!traditionalDates) return;
    setForm({ ...form, start_date: traditionalDates.start_date, end_date: traditionalDates.end_date });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription className="font-inter text-black/50">{description}</DialogDescription> : null}
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="prayer-instance-name">Your Name *</Label>
            <Input
              id="prayer-instance-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your full name"
              className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
              style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
            />
          </div>

          <div>
            <Label htmlFor="prayer-instance-email">Your Email *</Label>
            <Input
              id="prayer-instance-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="your.email@example.com"
              className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
              style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
            />
          </div>

          <div>
            <Label htmlFor="prayer-instance-phone">Phone Number</Label>
            <div className="mt-1 flex gap-2">
              <Input
                id="prayer-instance-phone-cc"
                type="tel"
                value={form.phone_country_code}
                onChange={(e) => setForm({ ...form, phone_country_code: e.target.value.replace(/[^\d+]/g, "") })}
                placeholder="+91"
                className="w-[88px] rounded-[8px] shadow-none border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
                style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
              />
              <Input
                id="prayer-instance-phone"
                type="tel"
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value.replace(/\D/g, "") })}
                placeholder="1234569879"
                className="flex-1 rounded-[8px] shadow-none border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
                style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="prayer-instance-person">Person Who Needs Help (Optional)</Label>
            <Input
              id="prayer-instance-person"
              value={form.person_needs_help}
              onChange={(e) => setForm({ ...form, person_needs_help: e.target.value })}
              placeholder="e.g., JEFF"
              className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
              style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
            />
          </div>

          <div>
            <Label htmlFor="prayer-instance-prayer-time">Daily Prayer Time *</Label>
            {traditionalDates ? (
              <div className="mt-2 space-y-2">
                <div className="rounded-[8px] border border-muted-foreground/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Traditional / Fixed Dates</p>
                      <p className="text-sm font-medium text-black/90">
                        {(traditionalDates.label || `${traditionalDates.start_date} – ${traditionalDates.end_date}`).trim()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">These dates are fixed and cannot be edited.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-[8px] border-white/30 text-black bg-transparent hover:bg-white/10"
                      onClick={applyTraditionalDates}
                    >
                      {isTraditionalApplied ? "Applied" : "Use Dates"}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="prayer-instance-prayer-time" className="text-xs text-muted-foreground">
                    Daily Time *
                  </Label>
                  <Input
                    id="prayer-instance-prayer-time"
                    type="time"
                    value={form.prayer_time}
                    onChange={(e) => setForm({ ...form, prayer_time: e.target.value })}
                    className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
                    style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                  />
                </div>
              </div>
            ) : showStartDatePicker ? (
              <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="prayer-instance-start-date" className="text-xs text-muted-foreground">
                    Start Date *
                  </Label>
                  <Input
                    id="prayer-instance-start-date"
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value, end_date: undefined })}
                    className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
                    style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                  />
                </div>
                <div>
                  <Label htmlFor="prayer-instance-prayer-time" className="text-xs text-muted-foreground">
                    Daily Time *
                  </Label>
                  <Input
                    id="prayer-instance-prayer-time"
                    type="time"
                    value={form.prayer_time}
                    onChange={(e) => setForm({ ...form, prayer_time: e.target.value })}
                    className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
                    style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-1">
                <Label htmlFor="prayer-instance-prayer-time" className="text-xs text-muted-foreground">
                  Daily Time *
                </Label>
                <Input
                  id="prayer-instance-prayer-time"
                  type="time"
                  value={form.prayer_time}
                  onChange={(e) => setForm({ ...form, prayer_time: e.target.value })}
                  className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
                  style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">You'll receive reminders at this time daily</p>
          </div>

          <div>
            <Label htmlFor="prayer-instance-timezone">Timezone *</Label>
            <Select value={form.timezone} onValueChange={(value) => setForm({ ...form, timezone: value })}>
              <SelectTrigger
                className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
                style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-secondary-foreground bg-black/90 text-white">
                {timezoneOptions.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              className="border-0 rounded-[8px] hover:bg-white/80"
              variant="outline"
              onClick={() => onOpenChange(false)}
              type="button"
            >
              {cancelLabel}
            </Button>
            <Button
              className="border-0 rounded-[8px] hover:bg-primary/80 gap-0"
              onClick={onSubmit}
              disabled={submitting || submitDisabled}
              type="button"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                submitLabel
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

