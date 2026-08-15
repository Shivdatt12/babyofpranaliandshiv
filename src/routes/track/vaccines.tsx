import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, CalendarPlus } from "lucide-react";
import { AppShell, PageHeader, SoftCard } from "@/components/babybond/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useBabyBond } from "@/lib/babybond-store";
import {
  formatDate,
  formatFullDate,
  toDateInput,
  toTimeInput,
  fromDateTimeInputs,
  type Vaccine,
} from "@/lib/babybond-data";
import {
  VACCINE_SCHEDULE_NOTE,
  VACCINE_STATUS_LABEL,
  vaccineStatus,
  type VaccineStatus,
} from "@/lib/babybond-vaccines";

export const Route = createFileRoute("/track/vaccines")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Vaccination tracker — BabyBond" },
      { name: "description", content: "Track upcoming, completed and missed vaccines with reminders and doctor notes." },
      { property: "og:title", content: "Vaccination tracker — BabyBond" },
      { property: "og:description", content: "Upcoming, completed and missed vaccines for your newborn." },
    ],
  }),
  component: Vaccines,
});

const STATUS_CLASS: Record<VaccineStatus, string> = {
  completed: "bg-secondary text-secondary-foreground",
  "not-applicable": "bg-muted text-muted-foreground",
  overdue: "bg-destructive/15 text-destructive",
  due: "bb-gradient text-primary-foreground",
  upcoming: "bg-secondary text-secondary-foreground",
};

function dueLabel(v: Vaccine) {
  if (v.dueEndAt && v.dueEndAt > v.dueAt) return `Due ${formatDate(v.dueAt)} – ${formatDate(v.dueEndAt)}`;
  return `Due ${formatFullDate(v.dueAt)}`;
}

function Vaccines() {
  const { vaccines, addVaccine, updateVaccine, deleteVaccine, completeVaccine, syncDefaultVaccines, baby, me, now } =
    useBabyBond();
  const [name, setName] = useState("");
  const [due, setDue] = useState("");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState<Vaccine | null>(null);

  const groups = useMemo(() => {
    const withStatus = vaccines.map((v) => ({ v, status: vaccineStatus(v, now) }));
    return {
      overdue: withStatus.filter((x) => x.status === "overdue"),
      due: withStatus.filter((x) => x.status === "due"),
      upcoming: withStatus.filter((x) => x.status === "upcoming"),
      completed: withStatus.filter((x) => x.status === "completed"),
      na: withStatus.filter((x) => x.status === "not-applicable"),
    };
  }, [vaccines, now]);

  const Section = ({
    title,
    list,
    tone,
  }: {
    title: string;
    list: { v: Vaccine; status: VaccineStatus }[];
    tone?: "health";
  }) => (
    <div>
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {title} {list.length ? `· ${list.length}` : ""}
      </h2>
      <div className="space-y-2">
        {list.length === 0 ? (
          <SoftCard>
            <p className="text-xs text-muted-foreground">Nothing here.</p>
          </SoftCard>
        ) : null}
        {list.map(({ v, status }) => (
          <SoftCard key={v.id} tone={tone} className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-lg">🛡️</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-bold">{v.name}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_CLASS[status]}`}>
                  {VACCINE_STATUS_LABEL[status]}
                </span>
                {v.conditional ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    Programme dependent
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {v.stage ? `${v.stage} · ` : ""}
                {dueLabel(v)}
              </p>
              {v.doneAt ? (
                <p className="text-xs font-semibold text-foreground/80">
                  Given {formatFullDate(v.doneAt)}
                  {v.completedBy ? ` · by ${v.completedBy}` : ""}
                </p>
              ) : null}
              {v.doctor || v.hospital || v.batch ? (
                <p className="text-[11px] text-muted-foreground">
                  {[v.doctor, v.hospital, v.batch ? `Batch ${v.batch}` : ""].filter(Boolean).join(" · ")}
                </p>
              ) : null}
              {v.scheduleNote ? <p className="mt-1 text-[11px] text-muted-foreground">{v.scheduleNote}</p> : null}
              <Textarea
                placeholder="Doctor note"
                value={v.doctorNote ?? ""}
                onChange={(e) => updateVaccine(v.id, { doctorNote: e.target.value })}
                className="mt-2 min-h-9 rounded-2xl bg-card/80 text-xs"
              />
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(v)}
                className={
                  v.doneAt
                    ? "rounded-full bg-secondary px-3 py-1 text-[11px] font-bold text-secondary-foreground"
                    : "rounded-full bb-gradient px-3 py-1 text-[11px] font-bold text-primary-foreground"
                }
              >
                {v.doneAt ? "Edit record" : "Mark as Done"}
              </button>
              <button
                type="button"
                onClick={() => {
                  updateVaccine(v.id, { notApplicable: !v.notApplicable });
                  toast.success(v.notApplicable ? `${v.name} back on the schedule` : `${v.name} marked not applicable`);
                }}
                className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-secondary-foreground"
              >
                {v.notApplicable ? "Applicable" : "Not applicable"}
              </button>
              <button
                type="button"
                aria-label={`Delete ${v.name}`}
                onClick={() => deleteVaccine(v.id)}
                className="grid size-8 place-items-center rounded-full bg-secondary text-secondary-foreground"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </SoftCard>
        ))}
      </div>
    </div>
  );

  return (
    <AppShell>
      <PageHeader title="Vaccines" subtitle="Schedule & reminders" />
      <div className="space-y-4 px-5 pb-6">
        <SoftCard tone="health">
          <p className="text-[11px] leading-relaxed text-muted-foreground">{VACCINE_SCHEDULE_NOTE}</p>
          <Button
            variant="secondary"
            className="mt-3 h-10 w-full rounded-2xl"
            onClick={() => {
              if (!baby.bornAt) {
                toast.error("Add the baby's date of birth first");
                return;
              }
              const added = syncDefaultVaccines();
              toast.success(added ? `${added} vaccines added to the checklist` : "Checklist already up to date");
            }}
          >
            <CalendarPlus className="mr-2 size-4" /> Load default schedule
          </Button>
        </SoftCard>

        <Section title="Overdue" list={groups.overdue} />
        <Section title="Due now" list={groups.due} tone="health" />
        <Section title="Upcoming" list={groups.upcoming} tone="health" />
        <Section title="Completed" list={groups.completed} />
        <Section title="Not applicable" list={groups.na} />

        <SoftCard tone="health">
          <p className="text-sm font-bold">Add vaccine</p>
          <div className="mt-3 space-y-2">
            <Input placeholder="Vaccine name" value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-2xl bg-card/80" />
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="h-11 rounded-2xl bg-card/80" />
            <Textarea placeholder="Doctor note" value={note} onChange={(e) => setNote(e.target.value)} className="rounded-2xl bg-card/80" />
            <Button
              className="h-11 w-full rounded-2xl bb-gradient text-primary-foreground"
              onClick={() => {
                if (!name) return;
                addVaccine({
                  name,
                  dueAt: due ? new Date(due).getTime() : Date.now(),
                  doneAt: null,
                  doctorNote: note,
                  reminder: true,
                });
                setName("");
                setDue("");
                setNote("");
                toast.success("Vaccine added with a reminder");
              }}
            >
              <Plus className="mr-2 size-4" /> Add vaccine
            </Button>
          </div>
        </SoftCard>
      </div>

      <MarkDoneSheet
        vaccine={editing}
        parentName={me.name}
        parentId={me.id}
        onClose={() => setEditing(null)}
        onSave={(patch, firstTime) => {
          if (!editing) return;
          if (firstTime) completeVaccine(editing.id, patch.doneAt ?? Date.now());
          updateVaccine(editing.id, patch);
          setEditing(null);
          toast.success("Vaccination record saved");
        }}
        onUndo={() => {
          if (!editing) return;
          if (editing.doneAt) completeVaccine(editing.id);
          updateVaccine(editing.id, { completedBy: undefined, completedById: undefined });
          setEditing(null);
          toast.success("Marked as pending again");
        }}
      />
    </AppShell>
  );
}

function MarkDoneSheet({
  vaccine,
  parentName,
  parentId,
  onClose,
  onSave,
  onUndo,
}: {
  vaccine: Vaccine | null;
  parentName: string;
  parentId: string;
  onClose: () => void;
  onSave: (patch: Partial<Vaccine>, firstTime: boolean) => void;
  onUndo: () => void;
}) {
  const base = vaccine?.doneAt ?? Date.now();
  const [date, setDate] = useState(toDateInput(base));
  const [time, setTime] = useState(toTimeInput(base));
  const [by, setBy] = useState(vaccine?.completedBy ?? parentName);
  const [doctor, setDoctor] = useState(vaccine?.doctor ?? "");
  const [hospital, setHospital] = useState(vaccine?.hospital ?? "");
  const [batch, setBatch] = useState(vaccine?.batch ?? "");
  const [notes, setNotes] = useState(vaccine?.doctorNote ?? "");

  // reset the form each time a different vaccine is opened
  const [openedId, setOpenedId] = useState<string | null>(null);
  if (vaccine && vaccine.id !== openedId) {
    setOpenedId(vaccine.id);
    const at = vaccine.doneAt ?? Date.now();
    setDate(toDateInput(at));
    setTime(toTimeInput(at));
    setBy(vaccine.completedBy ?? parentName);
    setDoctor(vaccine.doctor ?? "");
    setHospital(vaccine.hospital ?? "");
    setBatch(vaccine.batch ?? "");
    setNotes(vaccine.doctorNote ?? "");
  }

  return (
    <Sheet open={!!vaccine} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>{vaccine?.doneAt ? "Edit vaccination record" : "Mark as Done"}</SheetTitle>
        </SheetHeader>
        {vaccine ? (
          <div className="space-y-3 pb-6">
            <p className="text-sm font-bold">{vaccine.name}</p>
            <p className="text-xs text-muted-foreground">{dueLabel(vaccine)}</p>
            <div className="grid grid-cols-2 gap-2">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-2xl bg-card/80" />
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-11 rounded-2xl bg-card/80" />
            </div>
            <Input placeholder="Recorded by" value={by} onChange={(e) => setBy(e.target.value)} className="h-11 rounded-2xl bg-card/80" />
            <Input placeholder="Doctor (optional)" value={doctor} onChange={(e) => setDoctor(e.target.value)} className="h-11 rounded-2xl bg-card/80" />
            <Input placeholder="Hospital / clinic (optional)" value={hospital} onChange={(e) => setHospital(e.target.value)} className="h-11 rounded-2xl bg-card/80" />
            <Input placeholder="Batch number (optional)" value={batch} onChange={(e) => setBatch(e.target.value)} className="h-11 rounded-2xl bg-card/80" />
            <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-2xl bg-card/80" />
            <Button
              className="h-11 w-full rounded-2xl bb-gradient text-primary-foreground"
              onClick={() => {
                const at = fromDateTimeInputs(date, time || "00:00") || Date.now();
                onSave(
                  {
                    doneAt: at,
                    completedBy: by.trim() || parentName,
                    completedById: parentId,
                    doctor: doctor.trim() || undefined,
                    hospital: hospital.trim() || undefined,
                    batch: batch.trim() || undefined,
                    doctorNote: notes,
                  },
                  !vaccine.doneAt,
                );
              }}
            >
              Save record
            </Button>
            {vaccine.doneAt ? (
              <Button variant="secondary" className="h-11 w-full rounded-2xl" onClick={onUndo}>
                Undo — mark as pending
              </Button>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
