import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, CalendarPlus, ChevronDown, CheckCircle2 } from "lucide-react";
import { AppShell, PageHeader, SoftCard } from "@/components/babybond/shell";
import { FeatureIcon } from "@/components/babybond/feature-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useBabyBond } from "@/lib/babybond-store";
import { formatDate, formatFullDate, toDateInput, type Vaccine } from "@/lib/babybond-data";
import {
  VACCINE_PEDIATRICIAN_NOTE,
  VACCINE_SCHEDULE_NOTE,
  VACCINE_STATUS_DOT,
  VACCINE_STATUS_LABEL,
  vaccineFullName,
  vaccineStatus,
  type VaccineStatus,
} from "@/lib/babybond-vaccines";

export const Route = createFileRoute("/track/vaccines")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Vaccination tracker — BabyBond" },
      {
        name: "description",
        content:
          "Track every vaccine dose from the IAP-ACVIP schedule with due dates, reminders and given records.",
      },
      { property: "og:title", content: "Vaccination tracker — BabyBond" },
      {
        property: "og:description",
        content: "Age-wise vaccine doses, due dates and reminders for your baby.",
      },
    ],
  }),
  component: Vaccines,
});

const STATUS_CLASS: Record<VaccineStatus, string> = {
  given: "bg-secondary text-secondary-foreground",
  "not-applicable": "bg-muted text-muted-foreground",
  overdue: "bg-destructive/15 text-destructive",
  "due-today": "bb-gradient text-primary-foreground",
  "due-soon": "bg-secondary text-secondary-foreground",
  upcoming: "bg-muted text-muted-foreground",
};

function dueLabel(v: Vaccine) {
  if (v.dueEndAt && v.dueEndAt > v.dueAt)
    return `Due ${formatDate(v.dueAt)} – ${formatDate(v.dueEndAt)}`;
  return `Due ${formatFullDate(v.dueAt)}`;
}

type Row = { v: Vaccine; status: VaccineStatus };

function Vaccines() {
  const {
    vaccines,
    addVaccine,
    updateVaccine,
    deleteVaccine,
    markVaccineGiven,
    undoVaccineGiven,
    syncDefaultVaccines,
    baby,
    now,
  } = useBabyBond();
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [due, setDue] = useState("");
  const [confirming, setConfirming] = useState<Vaccine | null>(null);
  const [naTarget, setNaTarget] = useState<Vaccine | null>(null);
  const [editing, setEditing] = useState<Vaccine | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const rows: Row[] = vaccines.map((v) => ({ v, status: vaccineStatus(v, now) }));
    const map = new Map<string, { stage: string; order: number; rows: Row[] }>();
    for (const r of rows) {
      const stage = r.v.stage || "Other doses";
      const g = map.get(stage) ?? { stage, order: r.v.group ?? 99, rows: [] };
      g.order = Math.min(g.order, r.v.group ?? 99);
      g.rows.push(r);
      map.set(stage, g);
    }
    return [...map.values()]
      .map((g) => ({ ...g, rows: g.rows.sort((a, b) => a.v.dueAt - b.v.dueAt) }))
      .sort((a, b) => a.order - b.order || (a.rows[0]?.v.dueAt ?? 0) - (b.rows[0]?.v.dueAt ?? 0));
  }, [vaccines, now]);

  const pending = vaccines.filter((v) => !v.doneAt && !v.notApplicable);
  const overdueCount = pending.filter((v) => vaccineStatus(v, now) === "overdue").length;

  const isOpen = (stage: string, rows: Row[]) =>
    open[stage] ??
    rows.some(
      (r) => r.status !== "given" && r.status !== "not-applicable" && r.status !== "upcoming",
    );

  return (
    <AppShell>
      <PageHeader title="Vaccines" subtitle="IAP-ACVIP dose tracker" />
      <div className="space-y-4 px-5 pb-6">
        <SoftCard tone="health">
          <p className="text-sm font-bold">
            {pending.length ? `${pending.length} doses pending` : <span className="inline-flex items-center gap-1"><CheckCircle2 className="size-4" /> Vaccines up to date</span>}
            {overdueCount ? ` · ${overdueCount} overdue` : ""}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            {VACCINE_SCHEDULE_NOTE}
          </p>
          <Button
            variant="secondary"
            className="mt-3 h-10 w-full rounded-2xl"
            onClick={() => {
              if (!baby.bornAt) {
                toast.error("Add the baby's date of birth first");
                return;
              }
              const added = syncDefaultVaccines();
              toast.success(
                added ? `${added} doses added to the schedule` : "Schedule already up to date",
              );
            }}
          >
            <CalendarPlus className="mr-2 size-4" /> Load IAP-ACVIP schedule
          </Button>
        </SoftCard>

        {groups.length === 0 ? (
          <SoftCard>
            <p className="text-xs text-muted-foreground">
              No doses yet — load the schedule above to see every dose from birth onwards.
            </p>
          </SoftCard>
        ) : null}

        {groups.map((g) => {
          const expanded = isOpen(g.stage, g.rows);
          const doneCount = g.rows.filter((r) => r.status === "given").length;
          return (
            <div key={g.stage}>
              <button
                type="button"
                onClick={() => setOpen((p) => ({ ...p, [g.stage]: !expanded }))}
                className="flex w-full items-center justify-between rounded-3xl bg-card px-4 py-3 bb-shadow"
              >
                <span className="text-left">
                  <span className="block text-sm font-bold uppercase tracking-wide">{g.stage}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {doneCount}/{g.rows.length} given
                  </span>
                </span>
                <ChevronDown
                  className={`size-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
                />
              </button>
              {expanded ? (
                <div className="mt-2 space-y-2">
                  {g.rows.map(({ v, status }) => (
                    <SoftCard key={v.id} className="flex items-start gap-3">
                      <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-lg">
                        <FeatureIcon name="vaccine" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-bold">{vaccineFullName(v)}</p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_CLASS[status]}`}
                          >
                            {VACCINE_STATUS_DOT[status]} {VACCINE_STATUS_LABEL[status]}
                          </span>
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
                            {[v.doctor, v.hospital, v.batch ? `Batch ${v.batch}` : ""]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        ) : null}
                        {v.conditional ? (
                          <p className="mt-1 text-[11px] font-semibold text-muted-foreground">
                            🤔 {VACCINE_PEDIATRICIAN_NOTE}
                          </p>
                        ) : null}
                        {v.scheduleNote ? (
                          <p className="text-[11px] text-muted-foreground">{v.scheduleNote}</p>
                        ) : null}
                        {v.doctorNote ? (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            📝 {v.doctorNote}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <button
                          type="button"
                          onClick={() => (v.doneAt ? setEditing(v) : setConfirming(v))}
                          className={
                            v.doneAt
                              ? "rounded-full bg-secondary px-3 py-1 text-[11px] font-bold text-secondary-foreground"
                              : "rounded-full bb-gradient px-3 py-1 text-[11px] font-bold text-primary-foreground"
                          }
                        >
                          {v.doneAt ? "Edit record" : "Mark as Given"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (v.notApplicable) {
                              updateVaccine(v.id, { notApplicable: false });
                              toast.success(`${v.name} back on the schedule`);
                            } else {
                              setNaTarget(v);
                            }
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
              ) : null}
            </div>
          );
        })}

        <SoftCard tone="health">
          <p className="text-sm font-bold">Add another dose</p>
          <div className="mt-3 space-y-2">
            <Input
              placeholder="Vaccine name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-2xl bg-card/80"
            />
            <Input
              placeholder="Dose label (optional)"
              value={dose}
              onChange={(e) => setDose(e.target.value)}
              className="h-11 rounded-2xl bg-card/80"
            />
            <Input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className="h-11 rounded-2xl bg-card/80"
            />
            <Button
              className="h-11 w-full rounded-2xl bb-gradient text-primary-foreground"
              onClick={() => {
                if (!name) return;
                addVaccine({
                  name,
                  dose: dose.trim() || "Dose",
                  dueAt: due ? new Date(due).getTime() : Date.now(),
                  doneAt: null,
                  reminder: true,
                  stage: "Other doses",
                  group: 99,
                });
                setName("");
                setDose("");
                setDue("");
                toast.success("Dose added with a reminder");
              }}
            >
              <Plus className="mr-2 size-4" /> Add dose
            </Button>
          </div>
        </SoftCard>
      </div>

      {/* explicit parent confirmation before anything is ever marked as given */}
      <AlertDialog open={!!confirming} onOpenChange={(o) => (!o ? setConfirming(null) : undefined)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Was this vaccine given?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirming ? `${vaccineFullName(confirming)} · ${dueLabel(confirming)}` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl"
              onClick={() => {
                setEditing(confirming);
                setConfirming(null);
              }}
            >
              Confirm Given
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!naTarget} onOpenChange={(o) => (!o ? setNaTarget(null) : undefined)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as not applicable?</AlertDialogTitle>
            <AlertDialogDescription>
              {naTarget ? `${vaccineFullName(naTarget)} will stop showing reminders. ` : ""}
              {VACCINE_PEDIATRICIAN_NOTE} before skipping a dose.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl"
              onClick={() => {
                if (naTarget) {
                  updateVaccine(naTarget.id, { notApplicable: true });
                  toast.success(`${naTarget.name} marked not applicable`);
                }
                setNaTarget(null);
              }}
            >
              Yes, not applicable
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <GivenSheet
        vaccine={editing}
        onClose={() => setEditing(null)}
        onSave={(givenAt, note, extra) => {
          if (!editing) return;
          markVaccineGiven(editing.id, givenAt, note);
          updateVaccine(editing.id, extra);
          setEditing(null);
          toast.success("Vaccination record saved");
        }}
        onUndo={() => {
          if (!editing) return;
          undoVaccineGiven(editing.id);
          setEditing(null);
          toast.success("Marked as pending again");
        }}
      />
    </AppShell>
  );
}

function GivenSheet({
  vaccine,
  onClose,
  onSave,
  onUndo,
}: {
  vaccine: Vaccine | null;
  onClose: () => void;
  onSave: (givenAt: number, note: string, extra: Partial<Vaccine>) => void;
  onUndo: () => void;
}) {
  const base = vaccine?.doneAt ?? Date.now();
  const [date, setDate] = useState(toDateInput(base));
  const [doctor, setDoctor] = useState(vaccine?.doctor ?? "");
  const [hospital, setHospital] = useState(vaccine?.hospital ?? "");
  const [batch, setBatch] = useState(vaccine?.batch ?? "");
  const [notes, setNotes] = useState(vaccine?.doctorNote ?? "");

  // reset the form each time a different dose is opened
  const [openedId, setOpenedId] = useState<string | null>(null);
  if (vaccine && vaccine.id !== openedId) {
    setOpenedId(vaccine.id);
    setDate(toDateInput(vaccine.doneAt ?? Date.now()));
    setDoctor(vaccine.doctor ?? "");
    setHospital(vaccine.hospital ?? "");
    setBatch(vaccine.batch ?? "");
    setNotes(vaccine.doctorNote ?? "");
  }

  return (
    <Sheet open={!!vaccine} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader>
          <SheetTitle>
            {vaccine?.doneAt ? "Edit vaccination record" : "Given date & notes"}
          </SheetTitle>
        </SheetHeader>
        {vaccine ? (
          <div className="space-y-3 pb-6">
            <p className="text-sm font-bold">{vaccineFullName(vaccine)}</p>
            <p className="text-xs text-muted-foreground">
              {dueLabel(vaccine)} · recommended date is kept as it is
            </p>
            <label className="block text-[11px] font-semibold text-muted-foreground">
              Actual given date
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 h-11 rounded-2xl bg-card/80"
              />
            </label>
            <Input
              placeholder="Doctor (optional)"
              value={doctor}
              onChange={(e) => setDoctor(e.target.value)}
              className="h-11 rounded-2xl bg-card/80"
            />
            <Input
              placeholder="Hospital / clinic (optional)"
              value={hospital}
              onChange={(e) => setHospital(e.target.value)}
              className="h-11 rounded-2xl bg-card/80"
            />
            <Input
              placeholder="Batch number (optional)"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              className="h-11 rounded-2xl bg-card/80"
            />
            <Textarea
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-2xl bg-card/80"
            />
            <Button
              className="h-11 w-full rounded-2xl bb-gradient text-primary-foreground"
              onClick={() => {
                const at = date ? new Date(`${date}T09:00`).getTime() : Date.now();
                onSave(Number.isFinite(at) ? at : Date.now(), notes, {
                  doctor: doctor.trim(),
                  hospital: hospital.trim(),
                  batch: batch.trim(),
                });
              }}
            >
              Save as Given
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
