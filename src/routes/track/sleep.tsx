import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader, SoftCard, StatTile } from "@/components/babybond/shell";
import { useBabyBond, useTodayStats } from "@/lib/babybond-store";
import { durationLabel, formatTime, timeAgo } from "@/lib/babybond-data";

export const Route = createFileRoute("/track/sleep")({
  head: () => ({
    meta: [
      { title: "Sleep tracker — BabyBond" },
      { name: "description", content: "Start and end naps with automatic duration, and see your baby's sleep rhythm." },
      { property: "og:title", content: "Sleep tracker — BabyBond" },
      { property: "og:description", content: "Nap timer and sleep timeline for your newborn." },
    ],
  }),
  component: SleepTracker,
});

function SleepTracker() {
  const { addEntry, entries, now } = useBabyBond();
  const s = useTodayStats();
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (startedAt === null) return;
    const i = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(i);
  }, [startedAt]);

  const elapsed = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
  const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  void tick;

  const naps = entries.filter((e) => e.type === "sleep").slice(0, 10);

  return (
    <AppShell>
      <PageHeader title="Sleep" subtitle="Naps & night sleep" />
      <div className="space-y-4 px-5 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <StatTile tone="sleep" emoji="🌙" label="Slept today" value={durationLabel(s.sleepMinutes)} />
          <StatTile tone="sleep" emoji="😴" label="Naps" value={`${naps.filter((n) => n.at >= now - 86400000).length}`} />
        </div>

        <SoftCard tone="sleep" className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            {startedAt ? "Sleeping since " + formatTime(startedAt) : "Not sleeping"}
          </p>
          <p className="mt-2 font-display text-5xl font-bold tabular-nums">
            {hh}:{mm}:{ss}
          </p>
          <button
            type="button"
            onClick={() => {
              if (startedAt) {
                const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
                addEntry({ type: "sleep", minutes } as never);
                setStartedAt(null);
                toast.success(`Sleep saved · ${durationLabel(minutes)}`);
              } else {
                setStartedAt(Date.now());
                toast("Sweet dreams 🌙");
              }
            }}
            className="mt-4 w-full rounded-2xl bb-gradient py-4 font-display text-lg font-bold text-primary-foreground transition-transform active:scale-95"
          >
            {startedAt ? "End sleep" : "Start sleep"}
          </button>
        </SoftCard>

        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Sleep timeline</h2>
          <div className="space-y-2">
            {naps.map((e) => (
              <SoftCard key={e.id} className="flex items-center gap-3 py-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-lg">🌙</span>
                <div className="flex-1">
                  <p className="text-sm font-bold">{durationLabel(e.type === "sleep" ? e.minutes : 0)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(e.at)} · {timeAgo(e.at, now)} · {e.by}
                  </p>
                </div>
              </SoftCard>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
