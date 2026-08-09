import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Bell, Pencil, Plus, Trash2, X } from "lucide-react";
import { AppShell, PageHeader, SoftCard } from "@/components/babybond/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useBabyBond, useTodayDoses } from "@/lib/babybond-store";
import {
  MEDICINE_FREQUENCIES,
  MEDICINE_TYPES,
  formatDate,
  formatTime,
  timeAgo,
  toDateInput,
  type Entry,
  type Medicine,
  type MedicineFrequency,
  type MedicineType,
} from "@/lib/babybond-data";

export const Route = createFileRoute("/track/medicines")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Medicines & reminders — BabyBond" },
      { name: "description", content: "Add, edit and schedule every medicine with multiple daily reminders and a full dose history." },
      { property: "og:title", content: "Medicines & reminders — BabyBond" },
      { property: "og:description", content: "Medicine schedule, reminders and dose history for your newborn." },
    ],
  }),
  component: Medicines,
});

type Draft = {
  name: string;
  type: MedicineType;
  dose: string;
  frequency: MedicineFrequency;
  times: string[];
  start: string;
  end: string;
  notes: string;
};

const emptyDraft = (): Draft => ({
  name: "",
  type: "Drops",
  dose: "",
  frequency: "Once daily",
  times: ["09:00"],
  start: toDateInput(Date.now()),
  end: "",
  notes: "",
});

const fromMedicine = (m: Medicine): Draft => ({
  name: m.name,
  type: m.type,
  dose: m.dose,
  frequency: m.frequency,
  times: m.times.length ? m.times : [m.time],
  start: toDateInput(m.startAt),
  end: m.endAt ? toDateInput(m.endAt) : "",
  notes: m.notes ?? "",
});

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-full bb-gradient px-3 py-1.5 text-[11px] font-bold text-primary-foreground"
          : "rounded-full bg-card/80 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground"
      }
    >
      {children}
    </button>
  );
}

function Medicines() {
  const { medicines, toggleMedicine, addMedicine, updateMedicine, deleteMedicine, logMedicine, entries, now } =
    useBabyBond();
  const doses = useTodayDoses();
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const history = (entries.filter((e) => e.type === "medicine") as Extract<Entry, { type: "medicine" }>[]).slice(0, 20);
  const nextDose = doses.find((d) => d.status === "upcoming");

  const save = () => {
    if (!draft.name.trim()) {
      toast.error("Medicine name is required");
      return;
    }
    const times = draft.times.filter(Boolean);
    const payload = {
      name: draft.name.trim(),
      type: draft.type,
      dose: draft.dose || "1 dose",
      frequency: draft.frequency,
      times: times.length ? times : ["09:00"],
      time: times[0] ?? "09:00",
      startAt: draft.start ? new Date(draft.start).getTime() : Date.now(),
      endAt: draft.end ? new Date(draft.end).getTime() : null,
      notes: draft.notes,
      active: true,
    };
    if (editing) {
      updateMedicine(editing, payload);
      toast.success("Medicine updated");
    } else {
      addMedicine(payload);
      toast.success("Medicine added with reminders");
    }
    setDraft(emptyDraft());
    setEditing(null);
    setOpen(false);
  };

  return (
    <AppShell>
      <PageHeader title="Medicines" subtitle="Schedule, reminders & history" />
      <div className="space-y-4 px-5 pb-6">
        <SoftCard tone="health" className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-card/70 text-xl">⏰</span>
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">Next medicine</p>
            <p className="font-display text-lg font-bold">
              {nextDose ? `${nextDose.medicine.name} · ${formatTime(nextDose.at)}` : "Nothing left today"}
            </p>
            {nextDose ? (
              <p className="text-[11px] opacity-70">
                in {Math.max(0, Math.round((nextDose.at - now) / 60000))} min · {nextDose.medicine.dose}
              </p>
            ) : null}
          </div>
        </SoftCard>

        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Today's medicines</h2>
          <div className="space-y-2">
            {doses.length === 0 ? (
              <SoftCard>
                <p className="text-xs text-muted-foreground">No medicines scheduled for today.</p>
              </SoftCard>
            ) : null}
            {doses.map((d) => (
              <SoftCard key={d.key} className="flex items-center gap-3 py-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-secondary text-lg">💊</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{d.medicine.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {d.medicine.dose} · {formatTime(d.at)}
                    {d.loggedBy ? ` · ${d.status === "skipped" ? "skipped" : "given"} by ${d.loggedBy}` : ""}
                  </p>
                </div>
                {d.status === "given" || d.status === "skipped" ? (
                  <span
                    className={
                      d.status === "given"
                        ? "rounded-full bg-health px-3 py-1 text-[11px] font-bold text-health-foreground"
                        : "rounded-full bg-secondary px-3 py-1 text-[11px] font-bold text-secondary-foreground"
                    }
                  >
                    {d.status === "given" ? "Given" : "Skipped"}
                  </span>
                ) : (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        logMedicine(d.medicine.id, "given");
                        toast.success(`${d.medicine.name} given`, { description: "Synced with your partner" });
                      }}
                      className="rounded-full bb-gradient px-3 py-1 text-[11px] font-bold text-primary-foreground"
                    >
                      Given
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        logMedicine(d.medicine.id, "skipped");
                        toast("Dose skipped");
                      }}
                      className="rounded-full bg-secondary px-3 py-1 text-[11px] font-bold text-secondary-foreground"
                    >
                      Skip
                    </button>
                  </div>
                )}
              </SoftCard>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">All medicines</h2>
            <button
              type="button"
              onClick={() => {
                setDraft(emptyDraft());
                setEditing(null);
                setOpen(true);
              }}
              className="rounded-full bb-gradient px-3 py-1 text-[11px] font-bold text-primary-foreground"
            >
              <Plus className="mr-1 inline size-3" /> Add
            </button>
          </div>
          <div className="space-y-2">
            {medicines.map((m) => (
              <SoftCard key={m.id} className="flex items-start gap-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-lg">💊</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.type} · {m.dose} · {m.frequency}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ⏰ {(m.times.length ? m.times : [m.time]).join(", ")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatDate(m.startAt)} → {m.endAt ? formatDate(m.endAt) : "ongoing"}
                  </p>
                  {m.notes ? <p className="mt-1 text-[11px] text-muted-foreground">{m.notes}</p> : null}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Switch checked={m.active} onCheckedChange={() => toggleMedicine(m.id)} />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-label={`Edit ${m.name}`}
                      onClick={() => {
                        setDraft(fromMedicine(m));
                        setEditing(m.id);
                        setOpen(true);
                      }}
                      className="grid size-8 place-items-center rounded-full bg-secondary text-secondary-foreground"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${m.name}`}
                      onClick={() => {
                        deleteMedicine(m.id);
                        toast("Medicine removed");
                      }}
                      className="grid size-8 place-items-center rounded-full bg-secondary text-secondary-foreground"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </SoftCard>
            ))}
          </div>
        </div>

        {open ? (
          <SoftCard tone="health">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">{editing ? "Edit medicine" : "Add medicine"}</p>
              <button type="button" aria-label="Close" onClick={() => setOpen(false)}>
                <X className="size-4" />
              </button>
            </div>
            <div className="mt-3 space-y-3">
              <Input
                placeholder="Medicine name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="h-11 rounded-2xl bg-card/80"
              />
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-70">Type</p>
                <div className="flex flex-wrap gap-1.5">
                  {MEDICINE_TYPES.map((t) => (
                    <Chip key={t} active={draft.type === t} onClick={() => setDraft({ ...draft, type: t })}>
                      {t}
                    </Chip>
                  ))}
                </div>
              </div>
              <Input
                placeholder="Dosage e.g. 0.6 ml"
                value={draft.dose}
                onChange={(e) => setDraft({ ...draft, dose: e.target.value })}
                className="h-11 rounded-2xl bg-card/80"
              />
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-70">Frequency</p>
                <div className="flex flex-wrap gap-1.5">
                  {MEDICINE_FREQUENCIES.map((f) => (
                    <Chip key={f} active={draft.frequency === f} onClick={() => setDraft({ ...draft, frequency: f })}>
                      {f}
                    </Chip>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-70">Reminder times</p>
                <div className="space-y-2">
                  {draft.times.map((t, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        type="time"
                        value={t}
                        onChange={(e) => {
                          const times = [...draft.times];
                          times[i] = e.target.value;
                          setDraft({ ...draft, times });
                        }}
                        className="h-11 flex-1 rounded-2xl bg-card/80"
                      />
                      <button
                        type="button"
                        aria-label="Remove reminder"
                        onClick={() => setDraft({ ...draft, times: draft.times.filter((_, j) => j !== i) })}
                        className="grid size-11 place-items-center rounded-2xl bg-card/80"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, times: [...draft.times, "12:00"] })}
                    className="rounded-full bg-card/80 px-3 py-1.5 text-[11px] font-semibold"
                  >
                    <Plus className="mr-1 inline size-3" /> Add another reminder
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-70">Start</p>
                  <Input
                    type="date"
                    value={draft.start}
                    onChange={(e) => setDraft({ ...draft, start: e.target.value })}
                    className="h-11 rounded-2xl bg-card/80"
                  />
                </div>
                <div className="flex-1">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide opacity-70">End</p>
                  <Input
                    type="date"
                    value={draft.end}
                    onChange={(e) => setDraft({ ...draft, end: e.target.value })}
                    className="h-11 rounded-2xl bg-card/80"
                  />
                </div>
              </div>
              <Textarea
                placeholder="Notes"
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                className="rounded-2xl bg-card/80"
              />
              <Button className="h-11 w-full rounded-2xl bb-gradient text-primary-foreground" onClick={save}>
                {editing ? "Save changes" : "Add medicine"}
              </Button>
            </div>
          </SoftCard>
        ) : null}

        <SoftCard className="flex items-center gap-3">
          <Bell className="size-5 text-muted-foreground" />
          <p className="flex-1 text-xs text-muted-foreground">
            Both parents get the reminder — tap Given, Snooze 10 min or Skip. Whoever acts first, the other sees it
            instantly.
          </p>
        </SoftCard>

        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Medicine history</h2>
          <div className="space-y-2">
            {history.map((d) => (
              <SoftCard key={d.id} className="flex items-center gap-3 py-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-lg">💊</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{d.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDate(d.at)} · {formatTime(d.at)} · {d.by} · {timeAgo(d.at, now)}
                  </p>
                </div>
                <span
                  className={
                    (d.status ?? "given") === "given"
                      ? "rounded-full bg-health px-3 py-1 text-[11px] font-bold text-health-foreground"
                      : "rounded-full bg-secondary px-3 py-1 text-[11px] font-bold text-secondary-foreground"
                  }
                >
                  {(d.status ?? "given") === "given" ? "Given" : "Skipped"}
                </span>
              </SoftCard>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
