import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Bell, UserPlus, LogOut, ChevronRight, Wifi, RefreshCw } from "lucide-react";
import babyPhoto from "@/assets/baby.jpg";
import { AppShell, PageHeader, SoftCard, ThemeToggle } from "@/components/babybond/shell";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useBabyBond, useTodayStats } from "@/lib/babybond-store";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Family profile — BabyBond" },
      { name: "description", content: "Manage your baby's profile, invite your partner and tune reminders in BabyBond." },
      { property: "og:title", content: "Family profile — BabyBond" },
      { property: "og:description", content: "Baby details, family members, reminders and sync settings." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { baby, setBaby, parents, me, switchParent } = useBabyBond();
  const s = useTodayStats();

  return (
    <AppShell>
      <PageHeader title="Profile" subtitle="Family account" />
      <div className="space-y-4 px-5 pb-6">
        <SoftCard className="flex items-center gap-4">
          <img
            src={babyPhoto}
            alt={`${baby.name}`}
            loading="lazy"
            width={768}
            height={768}
            className="size-16 rounded-2xl object-cover"
          />
          <div className="flex-1">
            <Input
              value={baby.name}
              onChange={(e) => setBaby({ name: e.target.value })}
              className="h-10 rounded-2xl font-display text-base font-bold"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {s.ageDays} days old · {baby.bloodGroup}
            </p>
          </div>
        </SoftCard>

        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Family</h2>
          <div className="space-y-2">
            {parents.map((p) => (
              <SoftCard key={p.id} className="flex items-center gap-3 py-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-lg">{p.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold">
                    {p.name} <span className="text-xs font-medium text-muted-foreground">· {p.role}</span>
                  </p>
                  <p className="text-[11px] text-health-foreground">Online · syncing live</p>
                </div>
                <button
                  type="button"
                  onClick={() => switchParent(p.id)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                    me.id === p.id ? "bb-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {me.id === p.id ? "You" : "Switch"}
                </button>
              </SoftCard>
            ))}
            <button
              type="button"
              onClick={() => toast.success("Invite link copied", { description: "Share it with your partner." })}
              className="flex w-full items-center gap-3 rounded-3xl bg-secondary p-4 text-secondary-foreground bb-shadow active:scale-95"
            >
              <UserPlus className="size-5" />
              <span className="flex-1 text-left text-sm font-semibold">Invite partner</span>
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Reminders</h2>
          <div className="space-y-2">
            {[
              { label: "Feed due after 3 hours", icon: Bell, on: true },
              { label: "Medicine reminders", icon: Bell, on: true },
              { label: "Doctor appointments", icon: Bell, on: true },
              { label: "Vaccination reminders", icon: Bell, on: false },
            ].map((r) => (
              <SoftCard key={r.label} className="flex items-center gap-3 py-3">
                <r.icon className="size-5 text-muted-foreground" />
                <span className="flex-1 text-sm font-semibold">{r.label}</span>
                <Switch defaultChecked={r.on} />
              </SoftCard>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Sync</h2>
          <SoftCard tone="health" className="flex items-center gap-3 py-3">
            <Wifi className="size-5" />
            <span className="flex-1 text-sm font-semibold">Real-time sync active</span>
            <RefreshCw className="size-4" />
          </SoftCard>
          <p className="mt-2 px-1 text-[11px] text-muted-foreground">
            Entries are cached on your phone and upload automatically when you're back online.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <span className="flex-1 text-sm font-semibold">Light / dark mode</span>
        </div>

        <Link
          to="/auth"
          className="flex items-center justify-center gap-2 rounded-3xl bg-card p-4 text-sm font-semibold text-destructive bb-shadow"
        >
          <LogOut className="size-4" /> Sign out
        </Link>
      </div>
    </AppShell>
  );
}
