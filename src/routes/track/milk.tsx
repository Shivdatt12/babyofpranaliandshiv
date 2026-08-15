import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Play, Square, Trash2, X } from "lucide-react";
import { AppShell, PageHeader, SoftCard, StatTile } from "@/components/babybond/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useBabyBond, useBreastEstimate, useTodayStats } from "@/lib/babybond-store";
import {
  durationLabel,
  formatTime,
  fromDateTimeInputs,
  timeAgo,
  toDateInput,
  toTimeInput,
  type Entry,
  type FeedSide,
} from "@/lib/babybond-data";

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

type BreastEntry = Extract<Entry, { type: "breast" }>;
type FormulaEntry = Extract<Entry, { type: "formula" }>;

function MilkTracker() {
  const { addEntry, deleteEntry, entries, now, timers, startTimer, updateTimer, stopTimer, cancelTimer } =
    useBabyBond();
  const s = useTodayStats();
  const active = timers.find((t) => t.kind === "breast");
  const [side, setSide] = useState<FeedSide>("left");
  const [note, setNote] = useState("");
  const [custom, setCustom] = useState("");
  const [editing, setEditing] = useState<BreastEntry | FormulaEntry | null>(null);

  const logFormula = (ml: number) => {
    if (!ml) return;
    addEntry({ type: "formula", ml } as never);
    toast.success(`${ml} ml formula logged 🍼`);
    setCustom("");
  };

  const feeds = entries.filter((e) => e.type === "breast" || e.type === "formula").slice(0, 12) as (
    | BreastEntry
    | FormulaEntry
  )[];
  const currentSide = (active?.side as FeedSide | undefined) ?? side;
  const liveMinutes = active ? Math.max(0, Math.floor((now - active.startedAt) / 60000)) : 0;

  return (
    <AppShell>
      <PageHeader title="Milk" subtitle="Breastfeed & formula" />
      <div className="space-y-4 px-5 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <StatTile tone="formula" emoji="🍼" label="Formula" value={`${s.formulaMl} ml`} hint="measured" />
          <StatTile
            tone="milk"
            emoji="🤱"
            label="Estimated Breastmilk"
            value={`${s.breastMl} ml`}
            hint={`${s.breastCount} sessions · ${durationLabel(s.breastMinutes)}`}
          />
        </div>
        <SoftCard className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm font-bold">Total today</p>
            <p className="text-[11px] text-muted-foreground">Formula + Estimated Breastmilk</p>
          </div>
          <p className="font-display text-xl font-bold">{s.milkMl} ml</p>
        </SoftCard>

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
                <p className="mt-1 text-xs font-semibold">
                  Estimated Breastmilk · {breastMl(liveMinutes)} ml
                </p>
              </div>

              <div className="mt-4 flex gap-2">
                {active ? (
                  <>
                    <Button
                      className="h-12 flex-1 rounded-2xl bb-gradient text-primary-foreground"
                      onClick={() => {
                        stopTimer("breast");
                        toast.success("Breastfeed saved", {
                          description: `Estimated Breastmilk · ${breastMl(Math.max(1, liveMinutes))} ml`,
                        });
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
              <p className="text-[11px] opacity-70">Saves with the current time</p>
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
            </SoftCard>
            <ManualFormula />
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
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">
                    {e.type === "breast"
                      ? `${e.side[0]?.toUpperCase()}${e.side.slice(1)} · ${durationLabel(e.minutes)}`
                      : `${e.ml} ml formula`}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {e.type === "breast" ? `Estimated Breastmilk ${breastMl(e.minutes)} ml · ` : ""}
                    {formatTime(e.at)} · {timeAgo(e.at, now)} · {e.by}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Edit feed"
                  onClick={() => setEditing(e)}
                  className="grid size-9 place-items-center rounded-2xl bg-secondary text-muted-foreground"
                >
                  <Pencil className="size-4" />
                </button>
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

      <EditFeedSheet entry={editing} onClose={() => setEditing(null)} />
    </AppShell>
  );
}

/** Historical formula feed — the chosen date/time is the real feeding time. */
function ManualFormula() {
  const { addEntry } = useBabyBond();
  const [date, setDate] = useState(toDateInput(Date.now()));
  const [time, setTime] = useState(toTimeInput(Date.now()));
  const [ml, setMl] = useState("");
  const [note, setNote] = useState("");

  return (
    <SoftCard tone="formula" className="space-y-3">
      <p className="text-sm font-bold">Add manually</p>
      <div className="grid grid-cols-2 gap-2">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-2xl bg-card/80" />
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-11 rounded-2xl bg-card/80" />
      </div>
      <Input
        inputMode="numeric"
        placeholder="Quantity in ml"
        value={ml}
        onChange={(e) => setMl(e.target.value)}
        className="h-11 rounded-2xl bg-card/80"
      />
      <Textarea placeholder="Notes" value={note} onChange={(e) => setNote(e.target.value)} className="rounded-2xl bg-card/70" />
      <Button
        className="h-12 w-full rounded-2xl bb-gradient text-primary-foreground"
        onClick={() => {
          const at = fromDateTimeInputs(date, time);
          const amount = Number(ml);
          if (!at) {
            toast.error("Pick the date and time of the feed");
            return;
          }
          if (!Number.isFinite(amount) || amount <= 0) {
            toast.error("Enter the amount in ml");
            return;
          }
          addEntry({ type: "formula", ml: Math.round(amount), at, ...(note ? { note } : {}) } as never);
          setMl("");
          setNote("");
          toast.success(`${Math.round(amount)} ml saved · ${formatTime(at)}`);
        }}
      >
        Save formula feed
      </Button>
    </SoftCard>
  );
}

function EditFeedSheet({ entry, onClose }: { entry: BreastEntry | FormulaEntry | null; onClose: () => void }) {
  const { updateEntry, deleteEntry } = useBabyBond();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [loadedId, setLoadedId] = useState<string | null>(null);

  if (entry && entry.id !== loadedId) {
    setLoadedId(entry.id);
    setDate(toDateInput(entry.at));
    setTime(toTimeInput(entry.at));
    setValue(entry.type === "formula" ? String(entry.ml) : String(entry.minutes));
    setNote(entry.note ?? "");
  }

  return (
    <Sheet open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-[2rem] bg-card px-5 pb-8">
        <SheetHeader className="px-0">
          <SheetTitle className="font-display text-lg">
            {entry?.type === "formula" ? "Edit formula feed" : "Edit breastfeed"}
          </SheetTitle>
        </SheetHeader>
        {entry ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-2xl" />
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-11 rounded-2xl" />
            </div>
            <Input
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={entry.type === "formula" ? "ml" : "minutes"}
              className="h-11 rounded-2xl"
            />
            {entry.type === "breast" ? (
              <p className="text-xs text-muted-foreground">
                Estimated Breastmilk · {breastMl(Number(value) || 0)} ml
              </p>
            ) : null}
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notes" className="rounded-2xl" />
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="h-11 rounded-2xl bb-gradient text-primary-foreground"
                onClick={() => {
                  const at = fromDateTimeInputs(date, time);
                  const num = Number(value);
                  if (!at) {
                    toast.error("Pick a valid date and time");
                    return;
                  }
                  if (!Number.isFinite(num) || num <= 0) {
                    toast.error("Enter a valid amount");
                    return;
                  }
                  updateEntry(entry.id, {
                    at,
                    note,
                    ...(entry.type === "formula" ? { ml: Math.round(num) } : { minutes: Math.round(num) }),
                  } as never);
                  toast.success("Feed updated");
                  onClose();
                }}
              >
                Save
              </Button>
              <Button
                variant="secondary"
                className="h-11 rounded-2xl text-destructive"
                onClick={() => {
                  deleteEntry(entry.id);
                  toast.success("Feed deleted");
                  onClose();
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
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

  const startedAt = fromDateTimeInputs(startDate, startTime);
  const endedAt = fromDateTimeInputs(endDate, endTime);
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
      <p className="text-xs opacity-70">
        Duration · {minutes > 0 ? durationLabel(minutes) : "—"} · Estimated Breastmilk{" "}
        {minutes > 0 ? breastMl(minutes) : 0} ml
      </p>
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
          toast.success(`Breastfeed saved · ${durationLabel(minutes)}`, {
            description: `Estimated Breastmilk · ${breastMl(minutes)} ml`,
          });
        }}
      >
        Save breastfeed
      </Button>
    </SoftCard>
  );
}
