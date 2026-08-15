import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Bell, Download, Upload, Camera, RotateCcw, Info, LogIn, LogOut, UserPlus, Copy } from "lucide-react";
import { AppShell, PageHeader, SoftCard, ThemeToggle, BabyAvatar } from "@/components/babybond/shell";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useBabyBond } from "@/lib/babybond-store";
import { PARENT_ROLES, roleEmoji, toDateInput, type ParentRole } from "@/lib/babybond-data";
import { ACCEPTED_IMAGE_TYPES, MediaError, removeMedia, uploadMedia } from "@/lib/babybond-media";
import { notifyNow, pushPrefs, requestNotificationPermission } from "@/lib/babybond-push";


export const Route = createFileRoute("/settings")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Settings — BabyBond" },
      { name: "description", content: "Baby profile, parent details, reminder times, backup and restore for your BabyBond family account." },
      { property: "og:title", content: "Settings — BabyBond" },
      { property: "og:description", content: "Profiles, notifications, reminder times, data export and backup." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { baby, setBaby, parents, updateParent, settings, updateSettings, exportData, importData, resetData, familyId } =
    useBabyBond();
  const photoRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    const previous = baby.photo;
    try {
      const path = await uploadMedia(familyId, "baby", file);
      setBaby({ photo: path });
      void removeMedia(previous);
      toast.success("Baby photo updated");
    } catch (err) {
      toast.error(err instanceof MediaError ? err.message : "Photo upload failed — please try again.");
    } finally {
      setUploading(false);
    }
  };

  const backup = () => {
    const blob = new Blob([exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `babybond-backup-${toDateInput(Date.now())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded");
  };

  const restore = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    const text = await file.text();
    setBusy(false);
    if (importData(text)) toast.success("Backup restored");
    else toast.error("That file doesn't look like a BabyBond backup");
  };

  const toggles = [
    { key: "medicineReminders", label: "Medicine reminders" },
    { key: "feedReminders", label: `Feed reminder after ${settings.feedGapHours}h` },
    { key: "vaccineReminders", label: "Vaccination reminders" },
    { key: "doctorReminders", label: "Doctor appointment reminders" },
  ] as const;

  return (
    <AppShell>
      <PageHeader title="Settings" subtitle="Profiles, reminders & data" />
      <div className="space-y-4 px-5 pb-6">
        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Account</h2>
          <AccountCard />
        </div>

        <div>

          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Baby profile</h2>
          <SoftCard className="space-y-3">
            <div className="flex items-center gap-4">
              <BabyAvatar className="size-16 rounded-2xl text-2xl" />
              <div className="flex flex-1 flex-wrap gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => photoRef.current?.click()}
                  className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground disabled:opacity-60"
                >
                  <Camera className="size-4" /> {uploading ? "Uploading…" : "Gallery"}
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => cameraRef.current?.click()}
                  className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground disabled:opacity-60"
                >
                  <Camera className="size-4" /> Camera
                </button>
                {baby.photo ? (
                  <button
                    type="button"
                    onClick={() => {
                      const previous = baby.photo;
                      setBaby({ photo: null });
                      void removeMedia(previous);
                      toast.success("Photo removed");
                    }}
                    className="rounded-2xl bg-secondary px-4 py-2 text-xs font-semibold text-destructive"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <input
                ref={photoRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES}
                className="hidden"
                onChange={(e) => {
                  void pickPhoto(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <input
                ref={cameraRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES}
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  void pickPhoto(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
            <Input value={baby.name} onChange={(e) => setBaby({ name: e.target.value })} className="h-11 rounded-2xl" />
            <Input
              type="date"
              value={toDateInput(baby.bornAt)}
              onChange={(e) => setBaby({ bornAt: new Date(e.target.value).getTime() })}
              className="h-11 rounded-2xl"
            />
            <div className="flex gap-2">
              {(["girl", "boy"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setBaby({ gender: g })}
                  className={`flex-1 rounded-2xl py-2 text-sm font-semibold capitalize ${
                    baby.gender === g ? "bb-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <Input
              value={baby.bloodGroup}
              onChange={(e) => setBaby({ bloodGroup: e.target.value })}
              placeholder="Blood group"
              className="h-11 rounded-2xl"
            />
          </SoftCard>
        </div>

        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Parents</h2>
          <div className="space-y-2">
            {parents.map((p) => (
              <SoftCard key={p.id} className="space-y-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-lg">{p.emoji}</span>
                  <Input
                    value={p.name}
                    onChange={(e) => updateParent(p.id, { name: e.target.value })}
                    className="h-10 flex-1 rounded-2xl"
                  />
                </div>
                <div className="flex gap-2">
                  {PARENT_ROLES.map((r: ParentRole) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        updateParent(p.id, { role: r, emoji: roleEmoji(r) });
                        toast.success(`Role saved · ${r}`);
                      }}
                      className={`flex-1 rounded-2xl py-2 text-xs font-semibold ${
                        p.role === r ? "bb-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {roleEmoji(r)} {r}
                    </button>
                  ))}
                </div>
              </SoftCard>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Notifications</h2>
          <div className="space-y-2">
            {toggles.map((t) => (
              <SoftCard key={t.key} className="flex items-center gap-3 py-3">
                <Bell className="size-5 text-muted-foreground" />
                <span className="flex-1 text-sm font-semibold">{t.label}</span>
                <Switch checked={settings[t.key]} onCheckedChange={(v) => updateSettings({ [t.key]: v })} />
              </SoftCard>
            ))}
            <button
              type="button"
              onClick={() => {
                if (typeof Notification === "undefined") {
                  toast.error("Notifications unsupported here");
                  return;
                }
                void Notification.requestPermission().then((p) =>
                  p === "granted" ? toast.success("Notifications allowed") : toast("Notifications blocked"),
                );
              }}
              className="w-full rounded-3xl bg-secondary p-3 text-sm font-semibold text-secondary-foreground bb-shadow"
            >
              Allow device notifications
            </button>

            <SoftCard className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="flex-1 text-sm font-semibold">Notification sound</span>
                <div className="flex gap-2">
                  {(["default", "silent"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => updateSettings({ soundMode: m })}
                      className={`rounded-2xl px-4 py-2 text-xs font-semibold capitalize ${
                        settings.soundMode === m
                          ? "bb-gradient text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex-1 text-sm font-semibold">Vibration</span>
                <Switch checked={settings.vibrate} onCheckedChange={(v) => updateSettings({ vibrate: v })} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Sound and vibration follow your device's notification channel. Android may keep its own sound setting for
                the installed app.
              </p>
              <Button
                variant="secondary"
                className="h-11 w-full rounded-2xl"
                onClick={() => {
                  void (async () => {
                    const prefs = {
                      snoozeMs: settings.snoozeMinutes * 60_000,
                      silent: settings.soundMode === "silent",
                      vibrate: settings.vibrate,
                    };
                    const permission = await requestNotificationPermission();
                    if (permission !== "granted") {
                      toast.error("Allow device notifications first");
                      return;
                    }
                    await pushPrefs(prefs);
                    const shown = await notifyNow(
                      "babybond-test",
                      "🔔 Test notification",
                      `Sound: ${settings.soundMode} · Vibration: ${settings.vibrate ? "on" : "off"}`,
                      { prefs },
                    );
                    if (settings.vibrate) navigator.vibrate?.([200, 100, 200]);
                    if (shown) toast.success("Test notification sent");
                    else toast.error("Could not show a notification here");
                  })();
                }}
              >
                Test notification
              </Button>
            </SoftCard>
          </div>
        </div>


        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Feeding</h2>
          <BreastEstimateSetting />
        </div>

        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Reminder timing</h2>
          <ReminderTiming />
        </div>


        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Data</h2>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" className="h-12 rounded-2xl" onClick={backup}>
              <Download className="mr-2 size-4" /> Backup
            </Button>
            <Button
              disabled={busy}
              variant="secondary"
              className="h-12 rounded-2xl"
              onClick={() => restoreRef.current?.click()}
            >
              <Upload className="mr-2 size-4" /> Restore
            </Button>
            <input
              ref={restoreRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => void restore(e.target.files?.[0])}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              resetData();
              toast.success("Reloaded from your family account");
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-3xl bg-card p-3 text-sm font-semibold text-destructive bb-shadow"
          >
            <RotateCcw className="size-4" /> Reload from cloud
          </button>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <span className="flex-1 text-sm font-semibold">Light / dark mode</span>
        </div>

        <SoftCard className="flex items-start gap-3">
          <Info className="mt-0.5 size-5 text-muted-foreground" />
          <div>
            <p className="text-sm font-bold">About BabyBond</p>
            <p className="text-xs text-muted-foreground">
              A gentle shared journal for new parents. Data stays on your device and syncs live between the family's open
              sessions.
            </p>
          </div>
        </SoftCard>
      </div>
    </AppShell>
  );
}

const REMINDER_FIELDS = [
  { key: "feedGapHours", label: "Feed reminder after (hours)", min: 1, max: 12 },
  { key: "vaccineLeadDays", label: "Vaccine reminder lead (days)", min: 0, max: 30 },
  { key: "doctorLeadHours", label: "Appointment reminder lead (hours)", min: 1, max: 72 },
  { key: "reminderLeadMinutes", label: "Notify before due (minutes)", min: 0, max: 120 },
  { key: "snoozeMinutes", label: "Snooze / follow-up (minutes)", min: 1, max: 60 },
] as const;

type ReminderKey = (typeof REMINDER_FIELDS)[number]["key"];

/** Editable as free text so a value can be cleared and retyped, then saved explicitly. */
function ReminderTiming() {
  const { settings, updateSettings } = useBabyBond();
  const saved = useMemo(
    () => Object.fromEntries(REMINDER_FIELDS.map((f) => [f.key, String(settings[f.key])])) as Record<ReminderKey, string>,
    [settings],
  );
  const [draft, setDraft] = useState<Record<ReminderKey, string>>(saved);
  useEffect(() => setDraft(saved), [saved]);

  const dirty = REMINDER_FIELDS.some((f) => draft[f.key] !== saved[f.key]);

  const save = () => {
    const patch: Partial<Record<ReminderKey, number>> = {};
    for (const f of REMINDER_FIELDS) {
      const raw = draft[f.key].trim();
      if (raw === "") {
        toast.error(`${f.label} cannot be empty`);
        return;
      }
      const value = Number(raw);
      if (!Number.isFinite(value) || value < f.min || value > f.max) {
        toast.error(`${f.label} must be between ${f.min} and ${f.max}`);
        return;
      }
      patch[f.key] = Math.round(value);
    }
    updateSettings(patch);
    toast.success("Reminder settings updated successfully.");
  };

  return (
    <div className="space-y-2">
      {REMINDER_FIELDS.map((f) => (
        <SoftCard key={f.key} className="flex items-center gap-3 py-3">
          <span className="flex-1 text-sm font-semibold">{f.label}</span>
          <Input
            type="number"
            inputMode="numeric"
            min={f.min}
            max={f.max}
            value={draft[f.key]}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setDraft((prev) => ({ ...prev, [f.key]: e.target.value }))}
            className="h-10 w-20 rounded-2xl text-center"
          />
        </SoftCard>
      ))}
      <div className="grid grid-cols-2 gap-2">
        <Button disabled={!dirty} className="h-11 rounded-2xl bb-gradient text-primary-foreground" onClick={save}>
          Save
        </Button>
        <Button disabled={!dirty} variant="secondary" className="h-11 rounded-2xl" onClick={() => setDraft(saved)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function AccountCard() {
  const { authed, authEmail, inviteCode, joinFamily, signOut, online, pendingCount } = useBabyBond();
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);

  if (!authed) {
    return (
      <SoftCard className="space-y-3">
        <div className="flex items-center gap-3">
          <LogIn className="size-5 text-muted-foreground" />
          <p className="flex-1 text-sm font-semibold">Not signed in</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Sign in to sync this journal live between both parents' phones and keep a cloud backup.
        </p>
        <Button asChild className="h-11 w-full rounded-2xl bb-gradient text-primary-foreground">
          <Link to="/auth">Sign in / create account</Link>
        </Button>
      </SoftCard>
    );
  }

  return (
    <div className="space-y-2">
      <SoftCard className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-lg">👤</span>
          <div className="flex-1">
            <p className="text-sm font-bold">{authEmail}</p>
            <p className="text-[11px] text-muted-foreground">
              {online ? "Synced live" : "Offline"}
              {pendingCount ? ` · ${pendingCount} change${pendingCount > 1 ? "s" : ""} waiting` : ""}
            </p>
          </div>
        </div>

        {inviteCode && (
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(inviteCode);
              toast.success("Invite code copied", { description: "Share it with your partner." });
            }}
            className="flex w-full items-center gap-3 rounded-2xl bg-secondary p-3 text-secondary-foreground"
          >
            <UserPlus className="size-5" />
            <span className="flex-1 text-left text-sm font-semibold">
              Invite code · <span className="font-display tracking-widest">{inviteCode}</span>
            </span>
            <Copy className="size-4" />
          </button>
        )}

        <div className="flex gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Partner's code"
            className="h-11 flex-1 rounded-2xl tracking-widest"
          />
          <Button
            variant="secondary"
            disabled={joining || code.length < 4}
            className="h-11 rounded-2xl"
            onClick={() => {
              setJoining(true);
              void joinFamily(code)
                .then(() => toast.success("Joined the family journal"))
                .catch(() => toast.error("That code didn't work"))
                .finally(() => setJoining(false));
            }}
          >
            Join
          </Button>
        </div>
      </SoftCard>

      <button
        type="button"
        onClick={() => void signOut().then(() => toast.success("Signed out"))}
        className="flex w-full items-center justify-center gap-2 rounded-3xl bg-card p-3 text-sm font-semibold text-destructive bb-shadow"
      >
        <LogOut className="size-4" /> Sign out
      </button>
    </div>
  );
}

/** Family-wide breastmilk estimate rate (ml per minute of breastfeeding). */
function BreastEstimateSetting() {
  const { settings, updateSettings } = useBabyBond();
  const saved = String(settings.breastMlPerMinute);
  const [draft, setDraft] = useState(saved);
  useEffect(() => setDraft(saved), [saved]);
  const dirty = draft !== saved;

  const save = () => {
    const value = Number(draft.trim());
    if (!draft.trim() || !Number.isFinite(value) || value <= 0) {
      toast.error("Milk per minute must be greater than 0");
      return;
    }
    updateSettings({ breastMlPerMinute: value });
    toast.success("Breastfeeding estimate updated successfully.");
  };

  return (
    <div className="space-y-2">
      <SoftCard className="space-y-2 py-3">
        <p className="text-sm font-bold">Breastfeeding milk estimate</p>
        <p className="text-xs text-muted-foreground">
          Estimated breastmilk volume used for tracking. This is only an estimate.
        </p>
        <div className="flex items-center gap-3 pt-1">
          <span className="flex-1 text-sm font-semibold">Milk per minute (ml/min)</span>
          <Input
            type="number"
            inputMode="decimal"
            step="0.1"
            min={0.1}
            value={draft}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setDraft(e.target.value)}
            className="h-10 w-20 rounded-2xl text-center"
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          This is an estimated value for tracking only, not a measurement of actual breastmilk intake.
        </p>
      </SoftCard>
      <div className="grid grid-cols-2 gap-2">
        <Button disabled={!dirty} className="h-11 rounded-2xl bb-gradient text-primary-foreground" onClick={save}>
          Save
        </Button>
        <Button disabled={!dirty} variant="secondary" className="h-11 rounded-2xl" onClick={() => setDraft(saved)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
