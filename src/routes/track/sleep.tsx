import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { AppShell, PageHeader, SoftCard, StatTile } from "@/components/babybond/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBabyBond, useTodayStats } from "@/lib/babybond-store";
import { durationLabel, formatTime, timeAgo, toDateInput } from "@/lib/babybond-data";

export const Route = createFileRoute("/track/sleep")({
  ssr: false,
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

function clock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(total / 3600))}:${p(Math.floor((total % 3600) / 60))}:${p(total % 60)}`;
}

function SleepTracker() {
  const { entries, now, deleteEntry, timers, startTimer, stopTimer, cancelTimer } = useBabyBond();
  const s = useTodayStats();
  const active = timers.find((t) => t.kind === "sleep");
  const naps = entries.filter((e) => e.type === "sleep").slice(0, 12);

  return (
    <AppShell>
      <PageHeader title="Sleep" subtitle="Naps & night sleep" />
      <div className="space-y-4 px-5 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <StatTile tone="sleep" emoji="🌙" label="Slept today" value={durationLabel(s.sleepMinutes)} />
          <StatTile tone="sleep" emoji="😴" label="Naps" value={`${naps.filter((n) => n.at >= now - 86400000).length}`} />
        </div>

        <Tabs defaultValue="timer">
          <TabsList className="grid w-full grid-cols-2 rounded-2xl">
            <TabsTrigger value="timer" className="rounded-xl">
              Timer
            </TabsTrigger>
            <TabsTrigger value="manual" className="rounded-xl">
              Manual
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timer" className="mt-4">
            <SoftCard tone="sleep" className="text-center">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                {active ? `Sleeping since ${formatTime(active.startedAt)} · started by ${active.by}` : "Not sleeping"}
              </p>
              <p className="mt-2 font-display text-5xl font-bold tabular-nums">
                {clock(active ? now - active.startedAt : 0)}
              </p>
              <div className="mt-4 flex gap-2">
                <Button
                  className="h-12 flex-1 rounded-2xl bb-gradient text-primary-foreground"
                  onClick={() => {
                    if (active) {
                      stopTimer("sleep");
                      toast.success("Sleep saved");
                    } else {
                      startTimer("sleep");
                      toast("Sweet dreams 🌙");
                    }
                  }}
                >
                  {active ? "End sleep" : "Start sleep"}
                </Button>
                {active ? (
                  <Button
                    variant="secondary"
                    className="h-12 rounded-2xl"
                    onClick={() => {
                      cancelTimer("sleep");
                      toast("Timer discarded");
                    }}
                  >
                    Discard
                  </Button>
                ) : null}
              </div>
              <p className="mt-3 text-[11px] opacity-70">
                Runs in the cloud — close the app or switch phones and it keeps counting.
              </p>
            </SoftCard>
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <ManualSleep />
          </TabsContent>
        </Tabs>

        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Sleep timeline</h2>
          <div className="space-y-2">
            {naps.map((e) => (
              <SoftCard key={e.id} className="flex items-center gap-3 py-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-lg">🌙</span>
                <div className="flex-1">
                  <p className="text-sm font-bold">{durationLabel(e.type === "sleep" ? e.minutes : 0)}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.type === "sleep" && e.startedAt
                      ? `${formatTime(e.startedAt)} → ${formatTime(e.endedAt ?? e.at)}`
                      : formatTime(e.at)}{" "}
                    · {timeAgo(e.at, now)} · {e.by}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Delete sleep"
                  onClick={() => {
                    deleteEntry(e.id);
                    toast.success("Sleep deleted");
                  }}
                  className="grid size-9 place-items-center rounded-2xl bg-secondary text-muted-foreground"
                >
                  <Trash2 className="size-4" />
                </button>
              </SoftCard>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function ManualSleep() {
  const { addEntry } = useBabyBond();
  const today = toDateInput(Date.now());
  const [startDate, setStartDate] = useState(today);
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState(today);
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");

  const startedAt = startDate && startTime ? new Date(`${startDate}T${startTime}`).getTime() : 0;
  const endedAt = endDate && endTime ? new Date(`${endDate}T${endTime}`).getTime() : 0;
  const minutes = startedAt && endedAt ? Math.round((endedAt - startedAt) / 60000) : 0;

  return (
    <SoftCard tone="sleep" className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-11 rounded-2xl bg-card/80" />
        <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-11 rounded-2xl bg-card/80" />
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-11 rounded-2xl bg-card/80" />
        <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="h-11 rounded-2xl bg-card/80" />
      </div>
      <Textarea
        placeholder="Notes"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="rounded-2xl bg-card/70"
      />
      <p className="text-xs opacity-70">Duration · {minutes > 0 ? durationLabel(minutes) : "—"}</p>
      <Button
        className="h-12 w-full rounded-2xl bb-gradient text-primary-foreground"
        onClick={() => {
          if (!startedAt || !endedAt) {
            toast.error("Please fill start and end time");
            return;
          }
          if (minutes <= 0) {
            toast.error("End time must be after the start time");
            return;
          }
          addEntry({ type: "sleep", minutes, startedAt, endedAt, at: endedAt, ...(note ? { note } : {}) } as never);
          setNote("");
          setStartTime("");
          setEndTime("");
          toast.success(`Sleep saved · ${durationLabel(minutes)}`);
        }}
      >
        Save sleep
      </Button>
    </SoftCard>
  );
}
