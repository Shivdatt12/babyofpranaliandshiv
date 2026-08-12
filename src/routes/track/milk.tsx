import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Play, Square, Trash2, X } from "lucide-react";
import { AppShell, PageHeader, SoftCard, StatTile } from "@/components/babybond/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBabyBond, useTodayStats } from "@/lib/babybond-store";
import { durationLabel, formatTime, timeAgo, toDateInput, type FeedSide } from "@/lib/babybond-data";

export const Route = createFileRoute("/track/milk")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Milk tracker — BabyBond" },
      { name: "description", content: "Time breastfeeds on each side and log formula bottles with one-tap amounts." },
      { property: "og:title", content: "Milk tracker — BabyBond" },
      { property: "og:description", content: "Breastfeed timer and formula quick-log for your newborn." },
    ],
  }),
  component: MilkTracker,
});

const SIDES: { key: FeedSide; label: string; emoji: string }[] = [
  { key: "left", label: "Left", emoji: "👈" },
  { key: "right", label: "Right", emoji: "👉" },
  { key: "both", label: "Both", emoji: "🤝" },
];

const QUICK = [10, 20, 30, 40, 50, 60];

function clock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(total / 3600))}:${p(Math.floor((total % 3600) / 60))}:${p(total % 60)}`;
}

function MilkTracker() {
  const { addEntry, deleteEntry, entries, now, timers, startTimer, updateTimer, stopTimer, cancelTimer } =
    useBabyBond();
  const s = useTodayStats();
  const active = timers.find((t) => t.kind === "breast");
  const [side, setSide] = useState<FeedSide>("left");
  const [note, setNote] = useState("");
  const [custom, setCustom] = useState("");

  const logFormula = (ml: number) => {
    if (!ml) return;
    addEntry({ type: "formula", ml } as never);
    toast.success(`${ml} ml formula logged 🍼`);
    setCustom("");
  };

  const feeds = entries.filter((e) => e.type === "breast" || e.type === "formula").slice(0, 8);
  const currentSide = (active?.side as FeedSide | undefined) ?? side;

  return (
    <AppShell>
      <PageHeader title="Milk" subtitle="Breastfeed & formula" />
      <div className="space-y-4 px-5 pb-6">
        <div className="grid grid-cols-3 gap-3">
          <StatTile tone="milk" emoji="🥛" label="Milk" value={`${s.milkMl} ml`} />
          <StatTile tone="formula" emoji="🍼" label="Formula" value={`${s.formulaMl} ml`} />
          <StatTile tone="milk" emoji="🤱" label="Feeds" value={`${s.breastCount}`} />
        </div>

        <Tabs defaultValue="breast">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl">
            <TabsTrigger value="breast" className="rounded-xl">
              Timer
            </TabsTrigger>
            <TabsTrigger value="manual" className="rounded-xl">
              Manual
            </TabsTrigger>
            <TabsTrigger value="formula" className="rounded-xl">
              Formula
            </TabsTrigger>
          </TabsList>

          <TabsContent value="breast" className="mt-4 space-y-3">
            <SoftCard tone="milk">
              <div className="grid grid-cols-3 gap-2">
                {SIDES.map((sd) => (
                  <button
                    key={sd.key}
                    type="button"
                    onClick={() => {
                      setSide(sd.key);
                      if (active) updateTimer("breast", { side: sd.key });
                    }}
                    className={`rounded-2xl py-3 text-sm font-bold transition-transform active:scale-95 ${
                      currentSide === sd.key ? "bb-gradient text-primary-foreground" : "bg-card/70"
                    }`}
                  >
                    <span className="block text-lg">{sd.emoji}</span>
                    {sd.label}
                  </button>
                ))}
              </div>

              <div className="mt-5 text-center">
                <p className="font-display text-5xl font-bold tabular-nums">
                  {clock(active ? now - active.startedAt : 0)}
                </p>
                <p className="text-xs opacity-70">
                  {active
                    ? `running since ${formatTime(active.startedAt)} · started by ${active.by}`
                    : `timer · ${currentSide} side`}
                </p>
              </div>

              <div className="mt-4 flex gap-2">
                {active ? (
                  <>
                    <Button
                      className="h-12 flex-1 rounded-2xl bb-gradient text-primary-foreground"
                      onClick={() => {
                        stopTimer("breast");
                        toast.success("Breastfeed saved");
                      }}
                    >
                      <Square className="mr-2 size-4" /> Stop &amp; save
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-12 rounded-2xl"
                      onClick={() => {
                        cancelTimer("breast");
                        toast("Timer discarded");
                      }}
                    >
                      <X className="size-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    className="h-12 flex-1 rounded-2xl bb-gradient text-primary-foreground"
                    onClick={() => {
                      startTimer("breast", { side, ...(note ? { note } : {}) });
                      toast.success("Feeding started 🤱", { description: "Both phones see this live." });
                    }}
                  >
                    <Play className="mr-2 size-4" /> Start feeding
                  </Button>
                )}
              </div>

              <Textarea
                placeholder="Notes (latch, fussiness, spit-up…)"
                value={active?.note ?? note}
                onChange={(e) => {
                  setNote(e.target.value);
                  if (active) updateTimer("breast", { note: e.target.value });
                }}
                className="mt-3 rounded-2xl bg-card/70"
              />
              <p className="mt-2 text-[11px] opacity-70">
                The timer runs in the cloud — close the app, switch phones, it keeps counting.
              </p>
            </SoftCard>
          </TabsContent>

          <TabsContent value="manual" className="mt-4">
            <ManualFeed />
          </TabsContent>

          <TabsContent value="formula" className="mt-4 space-y-3">
            <SoftCard tone="formula">
              <p className="text-sm font-bold">Quick amounts</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {QUICK.map((ml) => (
                  <button
                    key={ml}
                    type="button"
                    onClick={() => logFormula(ml)}
                    className="rounded-2xl bg-card/80 py-4 font-display text-lg font-bold transition-transform active:scale-95"
                  >
                    {ml} ml
                  </button>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <Input
                  inputMode="numeric"
                  placeholder="Custom ml"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  className="h-12 rounded-2xl bg-card/80"
                />
                <Button
                  className="h-12 rounded-2xl bb-gradient text-primary-foreground"
                  onClick={() => logFormula(Number(custom))}
                >
                  Add
                </Button>
              </div>
              <p className="mt-3 text-xs opacity-70">Daily intake updates automatically for both parents.</p>
            </SoftCard>
          </TabsContent>
        </Tabs>

        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent feeds</h2>
          <div className="space-y-2">
            {feeds.map((e) => (
              <SoftCard key={e.id} className="flex items-center gap-3 py-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-lg">
                  {e.type === "breast" ? "🤱" : "🍼"}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold">
                    {e.type === "breast"
                      ? `${e.side[0]?.toUpperCase()}${e.side.slice(1)} · ${durationLabel(e.minutes)}`
                      : `${e.ml} ml formula`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(e.at)} · {timeAgo(e.at, now)} · {e.by}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Delete feed"
                  onClick={() => {
                    deleteEntry(e.id);
                    toast.success("Feed deleted");
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

function ManualFeed() {
  const { addEntry } = useBabyBond();
  const today = toDateInput(Date.now());
  const [side, setSide] = useState<FeedSide>("left");
  const [startDate, setStartDate] = useState(today);
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState(today);
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");

  const startedAt = startDate && startTime ? new Date(`${startDate}T${startTime}`).getTime() : 0;
  const endedAt = endDate && endTime ? new Date(`${endDate}T${endTime}`).getTime() : 0;
  const minutes = startedAt && endedAt ? Math.round((endedAt - startedAt) / 60000) : 0;

  return (
    <SoftCard tone="milk" className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {SIDES.map((sd) => (
          <button
            key={sd.key}
            type="button"
            onClick={() => setSide(sd.key)}
            className={`rounded-2xl py-2 text-sm font-bold ${
              side === sd.key ? "bb-gradient text-primary-foreground" : "bg-card/70"
            }`}
          >
            {sd.emoji} {sd.label}
          </button>
        ))}
      </div>
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
          addEntry({
            type: "breast",
            side,
            minutes,
            startedAt,
            endedAt,
            at: endedAt,
            ...(note ? { note } : {}),
          } as never);
          setNote("");
          setStartTime("");
          setEndTime("");
          toast.success(`Breastfeed saved · ${durationLabel(minutes)}`);
        }}
      >
        Save breastfeed
      </Button>
    </SoftCard>
  );
}
