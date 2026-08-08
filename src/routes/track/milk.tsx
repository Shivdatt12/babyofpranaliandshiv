import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Pause, Play, RotateCcw } from "lucide-react";
import { AppShell, PageHeader, SoftCard, StatTile } from "@/components/babybond/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBabyBond, useTodayStats } from "@/lib/babybond-store";
import { durationLabel, formatTime, timeAgo, type FeedSide } from "@/lib/babybond-data";

export const Route = createFileRoute("/track/milk")({
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

function MilkTracker() {
  const { addEntry, entries, now } = useBabyBond();
  const s = useTodayStats();
  const [side, setSide] = useState<FeedSide>("left");
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [note, setNote] = useState("");
  const [custom, setCustom] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      timer.current = setInterval(() => setSeconds((v) => v + 1), 1000);
    }
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  const logFormula = (ml: number) => {
    if (!ml) return;
    addEntry({ type: "formula", ml } as never);
    toast.success(`${ml} ml formula logged 🍼`);
    setCustom("");
  };

  const feeds = entries.filter((e) => e.type === "breast" || e.type === "formula").slice(0, 8);

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
          <TabsList className="grid w-full grid-cols-2 rounded-2xl">
            <TabsTrigger value="breast" className="rounded-xl">
              Breastfeed
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
                    onClick={() => setSide(sd.key)}
                    className={`rounded-2xl py-3 text-sm font-bold transition-transform active:scale-95 ${
                      side === sd.key ? "bb-gradient text-primary-foreground" : "bg-card/70"
                    }`}
                  >
                    <span className="block text-lg">{sd.emoji}</span>
                    {sd.label}
                  </button>
                ))}
              </div>

              <div className="mt-5 text-center">
                <p className="font-display text-5xl font-bold tabular-nums">
                  {mm}:{ss}
                </p>
                <p className="text-xs opacity-70">timer · {side} side</p>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  className="h-12 flex-1 rounded-2xl bb-gradient text-primary-foreground"
                  onClick={() => setRunning((v) => !v)}
                >
                  {running ? <Pause className="mr-2 size-4" /> : <Play className="mr-2 size-4" />}
                  {running ? "Pause" : "Start"}
                </Button>
                <Button
                  variant="secondary"
                  className="h-12 rounded-2xl"
                  onClick={() => {
                    setRunning(false);
                    setSeconds(0);
                  }}
                >
                  <RotateCcw className="size-4" />
                </Button>
              </div>

              <Textarea
                placeholder="Notes (latch, fussiness, spit-up…)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-3 rounded-2xl bg-card/70"
              />

              <Button
                className="mt-3 h-12 w-full rounded-2xl bb-gradient text-primary-foreground"
                onClick={() => {
                  const minutes = Math.max(1, Math.round(seconds / 60));
                  addEntry({ type: "breast", side, minutes, note } as never);
                  setSeconds(0);
                  setRunning(false);
                  setNote("");
                  toast.success(`Breastfeed saved · ${durationLabel(minutes)}`);
                }}
              >
                Save breastfeed
              </Button>
            </SoftCard>
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
              </SoftCard>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
