import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Bell, Download, Upload, Camera, RotateCcw, Info, LogIn, LogOut, UserPlus, Copy } from "lucide-react";
import { AppShell, PageHeader, SoftCard, ThemeToggle, BabyAvatar } from "@/components/babybond/shell";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useBabyBond } from "@/lib/babybond-store";
import { toDateInput } from "@/lib/babybond-data";

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
  const { baby, setBaby, parents, updateParent, settings, updateSettings, exportData, importData, resetData } =
    useBabyBond();
  const photoRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pickPhoto = (file: File | undefined) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      setBaby({ photo: String(r.result) });
      toast.success("Baby photo updated");
    };
    r.readAsDataURL(file);
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
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                className="flex items-center gap-2 rounded-2xl bg-secondary px-4 py-2 text-xs font-semibold text-secondary-foreground"
              >
                <Camera className="size-4" /> Change photo
              </button>
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => pickPhoto(e.target.files?.[0])}
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
              <SoftCard key={p.id} className="flex items-center gap-3 py-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-lg">{p.emoji}</span>
                <Input
                  value={p.name}
                  onChange={(e) => updateParent(p.id, { name: e.target.value })}
                  className="h-10 flex-1 rounded-2xl"
                />
                <span className="text-xs font-semibold text-muted-foreground">{p.role}</span>
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
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Reminder timing</h2>
          <div className="space-y-2">
            {[
              { key: "feedGapHours", label: "Feed reminder after (hours)", min: 1, max: 6 },
              { key: "vaccineLeadDays", label: "Vaccine reminder lead (days)", min: 0, max: 14 },
              { key: "doctorLeadHours", label: "Appointment reminder lead (hours)", min: 1, max: 72 },
            ].map((f) => (
              <SoftCard key={f.key} className="flex items-center gap-3 py-3">
                <span className="flex-1 text-sm font-semibold">{f.label}</span>
                <Input
                  type="number"
                  min={f.min}
                  max={f.max}
                  value={settings[f.key as "feedGapHours"]}
                  onChange={(e) => updateSettings({ [f.key]: Number(e.target.value) || 1 })}
                  className="h-10 w-20 rounded-2xl text-center"
                />
              </SoftCard>
            ))}
          </div>
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
              toast.success("Sample data restored");
            }}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-3xl bg-card p-3 text-sm font-semibold text-destructive bb-shadow"
          >
            <RotateCcw className="size-4" /> Reset to sample data
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
