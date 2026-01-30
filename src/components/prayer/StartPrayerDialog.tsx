import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { locationService } from "@/services/location/LocationService";

export type StartPrayerDialogTimezoneOption = { value: string; label: string };

export type StartPrayerDialogScheduleMode = "FIXED" | "DAILY_UNLIMITED";

export type StartPrayerDialogForm = {
  name: string;
  email: string;
  phone_country_code: string;
  phone_number: string;
  times_per_day: number;
  person_needs_help: string;
  start_date: string;
  end_date?: string;
  schedule_mode?: StartPrayerDialogScheduleMode;
  /**
   * Optional per-user override.
   * When schedule_mode === "FIXED", this can be used to compute end_date from start_date.
   */
  duration_days?: number;
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
  defaultScheduleMode?: StartPrayerDialogScheduleMode;
  defaultDurationDays?: number | null;
  durationPresets?: number[];
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
  defaultScheduleMode,
  defaultDurationDays = null,
  durationPresets = [9, 14, 30],
  form,
  setForm,
  timezoneOptions,
  onSubmit,
}: Props) {
  type BeginChoice = "today" | "traditional" | "custom";
  const [step, setStep] = useState<"begin" | "details">("begin");
  const [beginChoice, setBeginChoice] = useState<BeginChoice | null>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [customDurationText, setCustomDurationText] = useState<string>("");

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
    if (!open) return;
    setStep("begin");
    setBeginChoice(null);
    setShowValidation(false);
    setCustomDurationText("");
  }, [open]);

  const getLocalTodayYmd = useCallback((): string => {
    const d = new Date();
    // Convert to local date ISO string (avoids UTC date shifting near midnight).
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  }, []);

  const applyBeginChoice = useCallback(
    (choice: BeginChoice) => {
      const today = getLocalTodayYmd();
      if (choice === "today") {
        setForm({ ...form, start_date: today, end_date: undefined });
        return;
      }
      if (choice === "traditional") {
        if (!traditionalDates?.start_date) return;
        setForm({ ...form, start_date: traditionalDates.start_date, end_date: traditionalDates.end_date });
        return;
      }
      // custom
      setForm({ ...form, start_date: String(form.start_date || today), end_date: undefined });
    },
    [form, getLocalTodayYmd, setForm, traditionalDates]
  );

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

  const effectiveTraditionalDates = beginChoice === "traditional" ? traditionalDates : undefined;
  const showStartDatePickerEffective = true; // always allow editing dates after the begin step

  const addDaysToYmd = useCallback((yyyyMmDd: string, daysToAdd: number): string => {
    const m = String(yyyyMmDd || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return yyyyMmDd;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(Date.UTC(y, mo, d + Math.max(0, daysToAdd)));
    return dt.toISOString().slice(0, 10);
  }, []);

  const normalizePositiveInt = useCallback((v: unknown): number | null => {
    const n = Math.floor(Number(v));
    if (!Number.isFinite(n) || n < 1) return null;
    return n;
  }, []);

  const parseDurationToDays = useCallback(
    (raw: string): number | null => {
      const s = String(raw || "").trim().toLowerCase();
      if (!s) return null;

      // Accept:
      // - "14", "14 days", "14d"
      // - "2 weeks", "2w", "2wk", "2wks"
      const m = s.match(/^(?<n>\d+)\s*(?<unit>d|day|days|w|wk|wks|week|weeks)?$/i);
      if (!m?.groups?.n) return null;
      const n = normalizePositiveInt(m.groups.n);
      if (!n) return null;

      const unit = String(m.groups.unit || "days").toLowerCase();
      if (unit === "w" || unit === "wk" || unit === "wks" || unit === "week" || unit === "weeks") return n * 7;
      return n;
    },
    [normalizePositiveInt]
  );

  const effectiveScheduleMode: StartPrayerDialogScheduleMode = (() => {
    const raw = String((form as any)?.schedule_mode || "").trim();
    if (raw === "DAILY_UNLIMITED") return "DAILY_UNLIMITED";
    return "FIXED";
  })();

  const isUnlimitedSelected = effectiveScheduleMode === "DAILY_UNLIMITED" || (form as any)?.end_date == null;

  // Default schedule mode + duration when the dialog opens (best-effort; keeps the form controlled by the parent).
  useEffect(() => {
    if (!open) return;

    const next: any = { ...(form as any) };
    let changed = false;

    const desiredMode: StartPrayerDialogScheduleMode =
      defaultScheduleMode ||
      (normalizePositiveInt(defaultDurationDays) ? "FIXED" : "DAILY_UNLIMITED");

    if (!String(next.schedule_mode || "").trim()) {
      next.schedule_mode = desiredMode;
      changed = true;
    }

    if (String(next.schedule_mode || "") === "DAILY_UNLIMITED") {
      if (next.end_date != null) {
        next.end_date = undefined;
        changed = true;
      }
      if (next.duration_days != null) {
        next.duration_days = undefined;
        changed = true;
      }
    } else {
      // FIXED
      const dd = normalizePositiveInt(next.duration_days);
      const fallbackDd = normalizePositiveInt(defaultDurationDays);
      if (!dd && fallbackDd) {
        next.duration_days = fallbackDd;
        changed = true;
      }
      const start = String(next.start_date || "").trim();
      const duration = normalizePositiveInt(next.duration_days);
      if (start && duration && !String(next.end_date || "").trim()) {
        next.end_date = addDaysToYmd(start, duration - 1);
        changed = true;
      }
    }

    if (changed) {
      setForm(next as StartPrayerDialogForm);
    }
  }, [addDaysToYmd, defaultDurationDays, defaultScheduleMode, form, normalizePositiveInt, open, setForm]);

  // Auto-recompute end_date when using a fixed duration and start_date changes (non-traditional path).
  useEffect(() => {
    if (!open) return;
    if (effectiveTraditionalDates) return; // traditional mode supports manual dates
    if (effectiveScheduleMode !== "FIXED") return;
    const duration = normalizePositiveInt((form as any)?.duration_days);
    const start = String(form.start_date || "").trim();
    if (!duration || !start) return;

    const nextEnd = addDaysToYmd(start, duration - 1);
    if (String(form.end_date || "").trim() === nextEnd) return;
    setForm({ ...form, end_date: nextEnd });
  }, [addDaysToYmd, effectiveScheduleMode, effectiveTraditionalDates, form, normalizePositiveInt, open, setForm]);

  const effectiveTimezoneOptions = useMemo(() => {
    const seen = new Set<string>();
    const base = (timezoneOptions || []).filter((tz) => {
      const v = String(tz?.value || "").trim();
      if (!v) return false;
      if (seen.has(v)) return false;
      seen.add(v);
      return true;
    });

    const currentTz = String(form.timezone || "").trim();
    if (currentTz && !seen.has(currentTz)) {
      return [{ value: currentTz, label: `${currentTz} (Detected)` }, ...base];
    }
    return base;
  }, [form.timezone, timezoneOptions]);

  const validationErrors = useMemo(() => {
    if (step !== "details") return {} as Record<string, string>;

    const errs: Record<string, string> = {};
    const name = String(form.name || "").trim();
    const email = String(form.email || "").trim();
    const phoneDigits = String(form.phone_number || "").replace(/\D/g, "");
    const cc = normalizeDialCode(String(form.phone_country_code || ""));
    const startDate = String(form.start_date || "").trim();
    const prayerTime = String(form.prayer_time || "").trim();
    const tz = String(form.timezone || "").trim();
    const timesPerDay = Math.max(1, Math.floor(Number((form as any).times_per_day || 1)));
    const scheduleMode = String((form as any)?.schedule_mode || "").trim() === "DAILY_UNLIMITED" ? "DAILY_UNLIMITED" : "FIXED";
    const durationDays = normalizePositiveInt((form as any)?.duration_days);
    const endDate = String((form as any)?.end_date || "").trim();

    if (!name) errs.name = "Name is required.";
    if (!email) errs.email = "Email is required.";
    if (!cc) errs.phone_country_code = "Country code is required.";
    if (!phoneDigits) errs.phone_number = "Phone number is required.";

    // Dates: start date is always required (Begin Today auto-fills it, but user can still edit later).
    if (!startDate) errs.start_date = "Start date is required.";
    if (scheduleMode === "FIXED") {
      if (!durationDays && !endDate) errs.duration_days = "Please choose how many days (or select Every day).";
    }

    if (!prayerTime) errs.prayer_time = "Daily time is required.";
    if (!tz) errs.timezone = "Timezone is required.";
    else if (!effectiveTimezoneOptions.some((o) => o.value === tz)) errs.timezone = "Please select a valid timezone.";
    if (!Number.isFinite(timesPerDay) || timesPerDay < 1) errs.times_per_day = "Prayer frequency must be at least 1.";

    return errs;
  }, [effectiveTimezoneOptions, form, normalizeDialCode, normalizePositiveInt, step]);

  const canSubmitLocal = step === "details" && Object.keys(validationErrors).length === 0;

  const handleSubmitClick = () => {
    setShowValidation(true);

    // Best-effort: if user chose "Begin Today" and start_date is empty, fill it before submit.
    if (beginChoice === "today" && !String(form.start_date || "").trim()) {
      setForm({ ...form, start_date: getLocalTodayYmd(), end_date: form.end_date });
    }

    if (!canSubmitLocal) return;
    onSubmit();
  };

  const isTraditionalApplied =
    Boolean(effectiveTraditionalDates?.start_date && effectiveTraditionalDates?.end_date) &&
    form.start_date === effectiveTraditionalDates?.start_date &&
    String(form.end_date || "") === effectiveTraditionalDates?.end_date;

  const applyTraditionalDates = () => {
    if (!effectiveTraditionalDates) return;
    setForm({ ...form, start_date: effectiveTraditionalDates.start_date, end_date: effectiveTraditionalDates.end_date });
  };

  const setScheduleMode = (mode: StartPrayerDialogScheduleMode) => {
    if (mode === "DAILY_UNLIMITED") {
      setForm({ ...(form as any), schedule_mode: "DAILY_UNLIMITED", end_date: undefined, duration_days: undefined });
      return;
    }

    // FIXED
    const start = String(form.start_date || "").trim();
    const duration = normalizePositiveInt((form as any)?.duration_days) || normalizePositiveInt(defaultDurationDays) || 9;
    const end = start ? addDaysToYmd(start, duration - 1) : String((form as any)?.end_date || "").trim();
    setForm({ ...(form as any), schedule_mode: "FIXED", duration_days: duration, end_date: end || undefined });
  };

  const applyDurationDays = (days: number) => {
    const d = normalizePositiveInt(days);
    if (!d) return;
    const start = String(form.start_date || "").trim();
    const end = start ? addDaysToYmd(start, d - 1) : String((form as any)?.end_date || "").trim();
    setForm({ ...(form as any), schedule_mode: "FIXED", duration_days: d, end_date: end || undefined });
    setCustomDurationText(`${d} days`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`max-w-md p-0 ${
          step === "details" && effectiveTraditionalDates ? "p-0" : ""
        }`}
        onInteractOutside={(e) => {
          // Keep the modal open when clicking outside the dialog content.
          // Closing should only happen via explicit UI controls (e.g., the Close button).
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          // Keep behavior consistent with "only close via Close button".
          e.preventDefault();
        }}
      >
        <DialogHeader>
          {step === "begin" ? (
            <div className="flex items-center justify-between gap-3 p-4 pb-0">
              <DialogTitle className="text-[22px] leading-tight">When Would You Like to Begin?</DialogTitle>
              
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 p-4 pb-1">
                <div className="min-w-0">
                  <DialogTitle className="text-[22px] pb-2">{title}</DialogTitle>
                   
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-[8px] border-0 bg-primary hover:bg-primary/80 text-black mr-6"
                  onClick={() => setStep("begin")}
                >
                  Change
                </Button>
              </div>
            </>
          )}
        </DialogHeader>

        {step === "begin" ? (
          <div className="space-y-3 pt-0 p-4">
            <button
              type="button"
              onClick={() => {
                setBeginChoice("today");
                applyBeginChoice("today");
              }}
              className={`w-full text-left rounded-[16px] border p-5 transition-colors ${
                beginChoice === "today" ? "border-black/70 bg-black/[0.03]" : "border-muted-foreground/30 bg-transparent"
              }`}
            >
              <div className="text-lg font-semibold text-black/90">Begin Today</div>
              <div className="text-sm text-muted-foreground mt-1">Start your prayer journey right away.</div>
            </button>

            <button
              type="button"
              disabled={!traditionalDates}
              onClick={() => {
                if (!traditionalDates) return;
                setBeginChoice("traditional");
                applyBeginChoice("traditional");
              }}
              className={`w-full text-left rounded-[16px] border p-5 transition-colors ${
                !traditionalDates
                  ? "border-muted-foreground/20 bg-muted/10 text-muted-foreground cursor-not-allowed"
                  : beginChoice === "traditional"
                    ? "border-black/70 bg-black/[0.03]"
                    : "border-muted-foreground/30 bg-transparent"
              }`}
            >
              <div className="text-lg font-semibold">Follow Traditional Timing</div>
              <div className="text-sm text-muted-foreground mt-1">
                {traditionalDates
                  ? `Join others on the traditional dates: ${traditionalDates.start_date}${traditionalDates.end_date ? ` – ${traditionalDates.end_date}` : ""}.`
                  : "Traditional dates are not available for this prayer."}
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setBeginChoice("custom");
                applyBeginChoice("custom");
              }}
              className={`w-full text-left rounded-[16px] border p-5 transition-colors ${
                beginChoice === "custom" ? "border-black/70 bg-black/[0.03]" : "border-muted-foreground/30 bg-transparent"
              }`}
            >
              <div className="text-lg font-semibold text-black/90">Pick Your Own Date</div>
              <div className="text-sm text-muted-foreground mt-1">Choose a start date that works best for your schedule.</div>
            </button>

             
            <div className="flex items-center justify-between gap-3">
           
              <Button
                type="button"
                className="rounded-[8px] px-6 mt-2 bg-primary hover:bg-primary/80 border-0"
                disabled={!beginChoice || (beginChoice === "traditional" && !traditionalDates)}
                onClick={() => {
                  if (!beginChoice) return;
                  applyBeginChoice(beginChoice);
                  setStep("details");
                }}
              >
                Next
              </Button>
            </div>
          
          </div>
        ) : (
          <div className="space-y-4 px-4 mb-4 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent">
          <div>
            <Label htmlFor="prayer-instance-name">Your Name *</Label>
            <Input
              id="prayer-instance-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your full name"
              aria-invalid={showValidation && Boolean(validationErrors.name)}
              className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
              style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
            />
            {showValidation && validationErrors.name ? (
              <p className="text-xs text-red-600 mt-1">{validationErrors.name}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="prayer-instance-email">Your Email *</Label>
            <Input
              id="prayer-instance-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="your.email@example.com"
              aria-invalid={showValidation && Boolean(validationErrors.email)}
              className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
              style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
            />
            {showValidation && validationErrors.email ? (
              <p className="text-xs text-red-600 mt-1">{validationErrors.email}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="prayer-instance-phone">Phone Number *</Label>
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
                    aria-invalid={showValidation && Boolean(validationErrors.phone_country_code)}
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
                placeholder="Enter phone number"
                autoComplete="tel"
                inputMode="numeric"
                aria-required="true"
                aria-invalid={showValidation && Boolean(validationErrors.phone_number)}
                className="flex-1 rounded-[8px] shadow-none border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
                style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
              />
            </div>
            {showValidation && (validationErrors.phone_country_code || validationErrors.phone_number) ? (
              <p className="text-xs text-red-600 mt-1">
                {validationErrors.phone_country_code || validationErrors.phone_number}
              </p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="prayer-instance-person">Prayer Intension (Optional)</Label>
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
            <Label htmlFor="prayer-instance-times-per-day">Prayer Frequency (Times per day) *</Label>
            <Input
              id="prayer-instance-times-per-day"
              type="number"
              min={1}
              step={1}
              value={String(Number.isFinite(form.times_per_day) ? form.times_per_day : 1)}
              onChange={(e) => {
                const n = Math.max(1, Number(e.target.value || 1));
                setForm({ ...form, times_per_day: Number.isFinite(n) ? Math.floor(n) : 1 });
              }}
              placeholder="1"
              aria-invalid={showValidation && Boolean(validationErrors.times_per_day)}
              className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
              style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
            />
            {showValidation && validationErrors.times_per_day ? (
              <p className="text-xs text-red-600 mt-1">{validationErrors.times_per_day}</p>
            ) : (
            <p className="text-xs text-muted-foreground mt-1">Set your daily goal (you can log multiple completions per day).</p>
            )}
          </div>

          <div>
            <Label htmlFor="prayer-instance-prayer-time">Daily Prayer Time *</Label>
            {effectiveTraditionalDates ? (
              <div className="mt-2 space-y-2">
                <div className="rounded-[8px] border border-muted-foreground/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Traditional / Suggested Dates</p>
                      <p className="text-sm font-medium text-black/90">
                        {(effectiveTraditionalDates.label ||
                          `${effectiveTraditionalDates.start_date} – ${effectiveTraditionalDates.end_date}`).trim()}
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

                <div className="rounded-[8px] border border-muted-foreground/30 p-3">
                  <p className="text-xs text-muted-foreground mb-2">Days</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className={`rounded-[8px] border ${effectiveScheduleMode === "FIXED" ? "border-black/70" : "border-muted-foreground/30"}`}
                      onClick={() => setScheduleMode("FIXED")}
                    >
                      Use end date
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={`rounded-[8px] border ${effectiveScheduleMode === "DAILY_UNLIMITED" ? "border-black/70" : "border-muted-foreground/30"}`}
                      onClick={() => setScheduleMode("DAILY_UNLIMITED")}
                    >
                      Every day
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
                      aria-invalid={showValidation && Boolean(validationErrors.start_date)}
                      className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
                      style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                    />
                    {showValidation && validationErrors.start_date ? (
                      <p className="text-xs text-red-600 mt-1">{validationErrors.start_date}</p>
                    ) : null}
                  </div>
                  {effectiveScheduleMode === "FIXED" ? (
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
                  ) : null}
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
                    aria-invalid={showValidation && Boolean(validationErrors.prayer_time)}
                    className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
                    style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                  />
                  {showValidation && validationErrors.prayer_time ? (
                    <p className="text-xs text-red-600 mt-1">{validationErrors.prayer_time}</p>
                  ) : null}
                </div>
              </div>
            ) : showStartDatePickerEffective ? (
              <div className="mt-1 space-y-2">
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
                      aria-invalid={showValidation && Boolean(validationErrors.start_date)}
                      className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
                      style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                    />
                    {showValidation && validationErrors.start_date ? (
                      <p className="text-xs text-red-600 mt-1">{validationErrors.start_date}</p>
                    ) : null}
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
                      aria-invalid={showValidation && Boolean(validationErrors.prayer_time)}
                      className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
                      style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                    />
                    {showValidation && validationErrors.prayer_time ? (
                      <p className="text-xs text-red-600 mt-1">{validationErrors.prayer_time}</p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[8px] border border-muted-foreground/30 p-3">
                  <p className="text-xs text-muted-foreground mb-2">Days *</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className={`rounded-[8px] border ${effectiveScheduleMode === "DAILY_UNLIMITED" ? "border-black/70" : "border-muted-foreground/30"}`}
                      onClick={() => setScheduleMode("DAILY_UNLIMITED")}
                    >
                      Every day
                    </Button>

                    {durationPresets.map((d) => (
                      <Button
                        key={d}
                        type="button"
                        variant="outline"
                        className={`rounded-[8px] border ${
                          effectiveScheduleMode === "FIXED" && Number((form as any).duration_days) === d
                            ? "border-black/70"
                            : "border-muted-foreground/30"
                        }`}
                        onClick={() => applyDurationDays(d)}
                      >
                        {d} days
                      </Button>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="prayer-instance-custom-days" className="text-xs text-muted-foreground">
                        Custom duration
                      </Label>
                      <Input
                        id="prayer-instance-custom-days"
                        type="text"
                        value={customDurationText}
                        onChange={(e) => {
                          const next = e.target.value;
                          setCustomDurationText(next);
                          const days = parseDurationToDays(next);
                          if (days) applyDurationDays(days);
                        }}
                        placeholder="e.g., 14 days or 2 weeks"
                        aria-invalid={showValidation && Boolean(validationErrors.duration_days)}
                        className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
                        style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
                      />
                      {showValidation && validationErrors.duration_days ? (
                        <p className="text-xs text-red-600 mt-1">{validationErrors.duration_days}</p>
                      ) : null}
                    </div>
                    <div className="flex items-end">
                      <div className="text-xs text-muted-foreground">
                        {effectiveScheduleMode === "DAILY_UNLIMITED"
                          ? "No end date."
                          : form.end_date
                            ? `Ends on ${form.end_date}.`
                            : "End date will be calculated."}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground mt-1">You'll receive reminders at this time daily</p>
          </div>

          <div>
            <Label htmlFor="prayer-instance-timezone">Timezone *</Label>
            <Select value={form.timezone} onValueChange={(value) => setForm({ ...form, timezone: value })}>
              <SelectTrigger
                className="rounded-[8px] shadow-none mt-1 border-muted-foreground/60 hover:border-muted-foreground focus-visible:border-black/70 box-shadow-none data-[placeholder]:text-gray-400 resize-none"
                aria-invalid={showValidation && Boolean(validationErrors.timezone)}
                style={{ "--tw-ring-offset-width": "0", boxShadow: "none", outline: "none" } as React.CSSProperties}
              >
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent className="border-secondary-foreground bg-black/90 text-white">
                {effectiveTimezoneOptions.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showValidation && validationErrors.timezone ? (
              <p className="text-xs text-red-600 mt-1">{validationErrors.timezone}</p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 pt-4 pb-2">
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
              onClick={handleSubmitClick}
              disabled={submitting || submitDisabled || !canSubmitLocal}
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
        )}
      </DialogContent>
    </Dialog>
  );
}

