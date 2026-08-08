import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { AppShell, PageHeader, SoftCard } from "@/components/babybond/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useBabyBond } from "@/lib/babybond-store";
import { formatDate, startOfToday } from "@/lib/babybond-data";

export const Route = createFileRoute("/track/vaccines")({
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

function Vaccines() {
  const { vaccines, addVaccine, updateVaccine, deleteVaccine, completeVaccine, now } = useBabyBond();
  const [name, setName] = useState("");
  const [due, setDue] = useState("");
  const [note, setNote] = useState("");

  const today = startOfToday(now);
  const completed = vaccines.filter((v) => v.doneAt);
  const missed = vaccines.filter((v) => !v.doneAt && v.dueAt < today);
  const upcoming = vaccines.filter((v) => !v.doneAt && v.dueAt >= today);

  const Section = ({ title, list, tone }: { title: string; list: typeof vaccines; tone?: "health" }) => (
    <div>
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h2>
      <div className="space-y-2">
        {list.length === 0 ? (
          <SoftCard>
            <p className="text-xs text-muted-foreground">Nothing here.</p>
          </SoftCard>
        ) : null}
        {list.map((v) => (
          <SoftCard key={v.id} tone={tone} className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-lg">🛡️</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{v.name}</p>
              <p className="text-xs text-muted-foreground">
                {v.doneAt ? `Given ${formatDate(v.doneAt)}` : `Due ${formatDate(v.dueAt)}`}
              </p>
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
                onClick={() => {
                  completeVaccine(v.id);
                  toast.success(v.doneAt ? "Marked as pending" : `${v.name} marked completed`);
                }}
                className={
                  v.doneAt
                    ? "rounded-full bg-secondary px-3 py-1 text-[11px] font-bold text-secondary-foreground"
                    : "rounded-full bb-gradient px-3 py-1 text-[11px] font-bold text-primary-foreground"
                }
              >
                {v.doneAt ? "Undo" : "Mark done"}
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
        <Section title="Upcoming" list={upcoming} tone="health" />
        <Section title="Missed" list={missed} />
        <Section title="Completed" list={completed} />

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
    </AppShell>
  );
}
