import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { AppShell, PageHeader, SoftCard, StatTile } from "@/components/babybond/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useBabyBond, useTodayStats } from "@/lib/babybond-store";
import {
  POTTY_KINDS,
  formatTime,
  fromDateTimeInputs,
  timeAgo,
  toDateInput,
  toTimeInput,
  type Entry,
  type PottyKind,
} from "@/lib/babybond-data";

export const Route = createFileRoute("/track/potty")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nappy tracker — BabyBond" },
      { name: "description", content: "One-tap pee and potty logging with colour and consistency notes for your newborn." },
      { property: "og:title", content: "Nappy tracker — BabyBond" },
      { property: "og:description", content: "Log pee and potty in one tap, with type and notes." },
    ],
  }),
  component: PottyTracker,
});

type NappyEntry = Extract<Entry, { type: "pee" } | { type: "potty" }>;

function PottyTracker() {
  const { addEntry, entries, now, deleteEntry } = useBabyBond();
  const s = useTodayStats();
  const [kind, setKind] = useState<PottyKind>("normal");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState<NappyEntry | null>(null);

  const nappies = entries.filter((e) => e.type === "pee" || e.type === "potty").slice(0, 12) as NappyEntry[];

  return (
    <AppShell>
      <PageHeader title="Nappies" subtitle="Pee & potty" />
      <div className="space-y-4 px-5 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <StatTile tone="pee" emoji="💛" label="Pee today" value={`${s.peeCount}`} />
          <StatTile tone="potty" emoji="💩" label="Potty today" value={`${s.pottyCount}`} />
        </div>

        <button
          type="button"
          onClick={() => {
            addEntry({ type: "pee" } as never);
            toast.success("Pee logged 💛");
          }}
          className="w-full rounded-[2rem] bg-pee p-7 text-pee-foreground bb-shadow-float transition-transform active:scale-95"
        >
          <span className="text-4xl">💛</span>
          <p className="mt-2 font-display text-2xl font-bold">+ Pee</p>
          <p className="text-xs opacity-70">saves with the current time</p>
        </button>

        <ManualPee />

        <SoftCard tone="potty">
          <p className="font-display text-lg font-bold">Potty</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {POTTY_KINDS.map((k) => (
              <button
                key={k.key}
                type="button"
                onClick={() => setKind(k.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-transform active:scale-95 ${
                  kind === k.key ? "bb-gradient text-primary-foreground" : "bg-card/80"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Notes (smell, amount, blood…)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="mt-3 rounded-2xl bg-card/80"
          />
          <button
            type="button"
            onClick={() => {
              addEntry({ type: "potty", kind, note } as never);
              setNote("");
              toast.success(`Potty logged 💩 · ${kind}`);
            }}
            className="mt-3 w-full rounded-2xl bb-gradient py-4 font-display text-lg font-bold text-primary-foreground transition-transform active:scale-95"
          >
            + Potty
          </button>
        </SoftCard>

        <ManualPotty />

        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent changes</h2>
          <div className="space-y-2">
            {nappies.map((e) => (
              <SoftCard key={e.id} className="flex items-center gap-3 py-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-lg">
                  {e.type === "pee" ? "💛" : "💩"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold capitalize">
                    {e.type === "pee" ? "Pee" : `Potty · ${e.kind}`}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatTime(e.at)} · {timeAgo(e.at, now)} · {e.by}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Edit entry"
                  onClick={() => setEditing(e)}
                  className="grid size-9 place-items-center rounded-2xl bg-secondary text-muted-foreground"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Delete entry"
                  onClick={() => {
                    deleteEntry(e.id);
                    toast.success("Entry deleted");
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

      <EditNappySheet entry={editing} onClose={() => setEditing(null)} />
    </AppShell>
  );
}

function ManualPee() {
  const { addEntry } = useBabyBond();
  const [date, setDate] = useState(toDateInput(Date.now()));
  const [time, setTime] = useState(toTimeInput(Date.now()));
  const [note, setNote] = useState("");

  return (
    <SoftCard tone="pee" className="space-y-3">
      <p className="text-sm font-bold">Add pee manually</p>
      <div className="grid grid-cols-2 gap-2">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-2xl bg-card/80" />
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-11 rounded-2xl bg-card/80" />
      </div>
      <Textarea placeholder="Notes" value={note} onChange={(e) => setNote(e.target.value)} className="rounded-2xl bg-card/80" />
      <Button
        className="h-12 w-full rounded-2xl bb-gradient text-primary-foreground"
        onClick={() => {
          const at = fromDateTimeInputs(date, time);
          if (!at) {
            toast.error("Pick the date and time");
            return;
          }
          addEntry({ type: "pee", at, ...(note ? { note } : {}) } as never);
          setNote("");
          toast.success(`Pee saved · ${formatTime(at)}`);
        }}
      >
        Save pee
      </Button>
    </SoftCard>
  );
}

function ManualPotty() {
  const { addEntry } = useBabyBond();
  const [date, setDate] = useState(toDateInput(Date.now()));
  const [time, setTime] = useState(toTimeInput(Date.now()));
  const [kind, setKind] = useState<PottyKind>("normal");
  const [note, setNote] = useState("");

  return (
    <SoftCard tone="potty" className="space-y-3">
      <p className="text-sm font-bold">Add potty manually</p>
      <div className="grid grid-cols-2 gap-2">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-2xl bg-card/80" />
        <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-11 rounded-2xl bg-card/80" />
      </div>
      <div className="flex flex-wrap gap-2">
        {POTTY_KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            onClick={() => setKind(k.key)}
            className={`rounded-full px-4 py-2 text-xs font-semibold ${
              kind === k.key ? "bb-gradient text-primary-foreground" : "bg-card/80"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>
      <Textarea placeholder="Notes" value={note} onChange={(e) => setNote(e.target.value)} className="rounded-2xl bg-card/80" />
      <Button
        className="h-12 w-full rounded-2xl bb-gradient text-primary-foreground"
        onClick={() => {
          const at = fromDateTimeInputs(date, time);
          if (!at) {
            toast.error("Pick the date and time");
            return;
          }
          addEntry({ type: "potty", kind, at, ...(note ? { note } : {}) } as never);
          setNote("");
          toast.success(`Potty saved · ${formatTime(at)}`);
        }}
      >
        Save potty
      </Button>
    </SoftCard>
  );
}

function EditNappySheet({ entry, onClose }: { entry: NappyEntry | null; onClose: () => void }) {
  const { updateEntry, deleteEntry } = useBabyBond();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [kind, setKind] = useState<PottyKind>("normal");
  const [note, setNote] = useState("");
  const [loadedId, setLoadedId] = useState<string | null>(null);

  if (entry && entry.id !== loadedId) {
    setLoadedId(entry.id);
    setDate(toDateInput(entry.at));
    setTime(toTimeInput(entry.at));
    setKind(entry.type === "potty" ? entry.kind : "normal");
    setNote((entry as { note?: string }).note ?? "");
  }

  return (
    <Sheet open={!!entry} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-[2rem] bg-card px-5 pb-8">
        <SheetHeader className="px-0">
          <SheetTitle className="font-display text-lg">
            {entry?.type === "potty" ? "Edit potty" : "Edit pee"}
          </SheetTitle>
        </SheetHeader>
        {entry ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-2xl" />
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-11 rounded-2xl" />
            </div>
            {entry.type === "potty" ? (
              <div className="flex flex-wrap gap-2">
                {POTTY_KINDS.map((k) => (
                  <button
                    key={k.key}
                    type="button"
                    onClick={() => setKind(k.key)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold ${
                      kind === k.key ? "bb-gradient text-primary-foreground" : "bg-secondary"
                    }`}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            ) : null}
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notes" className="rounded-2xl" />
            <div className="grid grid-cols-2 gap-2">
              <Button
                className="h-11 rounded-2xl bb-gradient text-primary-foreground"
                onClick={() => {
                  const at = fromDateTimeInputs(date, time);
                  if (!at) {
                    toast.error("Pick a valid date and time");
                    return;
                  }
                  updateEntry(entry.id, {
                    at,
                    note,
                    ...(entry.type === "potty" ? { kind } : {}),
                  } as never);
                  toast.success("Entry updated");
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
                  toast.success("Entry deleted");
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
