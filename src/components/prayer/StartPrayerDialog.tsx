import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { locationService } from "@/services/location/LocationService";

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
  const normalizeDialCode = useCallback((val: string): string => {
    const trimmed = String(val || "").trim();
    if (!trimmed) return "";
    const digits = trimmed.replace(/[^\d]/g, "");
    if (!digits) return "";
    return `+${digits}`;
  }, []);

  const phoneCountries = useMemo(() => {
    try {
      return locationService
        .getAllCountries()
        .filter((c) => String((c as any).callingCode || "").trim())
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch {
      return [];
    }
  }, []);

  // Keep a stable "selected country" even when multiple countries share the same dial code (e.g. +1).
  const [phoneCountryIso, setPhoneCountryIso] = useState<string>("");

  useEffect(() => {
    const currentDial = normalizeDialCode(form.phone_country_code);
    const current = phoneCountries.find((c) => c.code === phoneCountryIso);
    const currentMatches = current && normalizeDialCode(String((current as any).callingCode || "")) === currentDial;
    if (currentMatches) return;

    if (!currentDial) {
      setPhoneCountryIso("");
      return;
    }

    const firstMatch = phoneCountries.find((c) => normalizeDialCode(String((c as any).callingCode || "")) === currentDial);
    setPhoneCountryIso(firstMatch?.code || "");
  }, [form.phone_country_code, phoneCountries, phoneCountryIso]);

  // Auto-set country dial code based on the user's country (best-effort, no prompts):
  // 1) Browser locale region (e.g. "en-US" -> "US")
  // 2) If that fails, do nothing (user can still pick manually)
  useEffect(() => {
    if (!open) return;
    if (normalizeDialCode(form.phone_country_code)) return; // already set
    if (!phoneCountries.length) return;

    const locale =
      (typeof navigator !== "undefined" && (navigator.language || (navigator as any).userLanguage)) ||
      Intl.DateTimeFormat().resolvedOptions().locale ||
      "";
    const region = String(locale)
      .trim()
      .match(/[-_](?<r>[A-Za-z]{2})$/)?.groups?.r
      ?.toUpperCase();
    if (!region) return;

    const country = phoneCountries.find((c) => c.code === region);
    if (!country) return;

    const dial = normalizeDialCode(String((country as any).callingCode || ""));
    if (!dial) return;

    setPhoneCountryIso(country.code);
    setForm({ ...form, phone_country_code: dial });
  }, [form, normalizeDialCode, open, phoneCountries, setForm]);

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
              <div className="w-[160px]">
                <Select
                  value={phoneCountryIso}
                  onValueChange={(iso) => {
                    setPhoneCountryIso(iso);
                    const country = phoneCountries.find((c) => c.code === iso);
                    const dial = normalizeDialCode(String((country as any)?.callingCode || ""));
                    setForm({ ...form, phone_country_code: dial });
                  }}
                >
                  <SelectTrigger
                    id="prayer-instance-phone-cc"
                    className="rounded-[8px] shadow-none border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none h-[40px]"
                    style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                  >
                    <SelectValue placeholder={form.phone_country_code || "+Code"}>
                      {(() => {
                        const selected = phoneCountries.find((c) => c.code === phoneCountryIso);
                        const dial = selected ? normalizeDialCode(String((selected as any).callingCode || "")) : normalizeDialCode(form.phone_country_code);
                        const flag = selected ? String((selected as any).flag || "") : "";
                        return `${flag ? `${flag} ` : ""}${dial || "+Code"}`;
                      })()}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="border-secondary-foreground bg-black/90 text-white max-h-[320px]">
                    {phoneCountries.map((c) => {
                      const dial = normalizeDialCode(String((c as any).callingCode || ""));
                      return (
                        <SelectItem key={c.code} value={c.code}>
                          <div className="flex items-center justify-between gap-3 w-full">
                            <span className="flex items-center gap-2">
                              <span>{String((c as any).flag || "")}</span>
                              <span>{c.name}</span>
                            </span>
                            <span className="opacity-80">{dial}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
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
                      <p className="text-xs text-muted-foreground">Traditional / Suggested Dates</p>
                      <p className="text-sm font-medium text-black/90">
                        {(traditionalDates.label || `${traditionalDates.start_date} – ${traditionalDates.end_date}`).trim()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        These dates are pre-filled as a suggestion. You can change them below if needed.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-[8px] border-white/30 text-black bg-transparent hover:bg-white/10"
                      onClick={applyTraditionalDates}
                      disabled={isTraditionalApplied}
                    >
                      {isTraditionalApplied ? "Applied" : "Reset"}
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="prayer-instance-start-date" className="text-xs text-muted-foreground">
                      Start Date *
                    </Label>
                    <Input
                      id="prayer-instance-start-date"
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
                      style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                    />
                  </div>
                  <div>
                    <Label htmlFor="prayer-instance-end-date" className="text-xs text-muted-foreground">
                      End Date
                    </Label>
                    <Input
                      id="prayer-instance-end-date"
                      type="date"
                      value={form.end_date || ""}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value || undefined })}
                      className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
                      style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                    />
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

