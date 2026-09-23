import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { AppShell, PageHeader, SoftCard } from "@/components/babybond/shell";
import { useBabyBond } from "@/lib/babybond-store";
import { dayKey, formatDate, formatTime, type Milestone } from "@/lib/babybond-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/track/milestones")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Milestones — BabyBond" },
      { name: "description", content: "Celebrate first smiles, first rolls and every little first with a shared milestone list." },
      { property: "og:title", content: "Milestones — BabyBond" },
      { property: "og:description", content: "First smile, first roll, first tooth — captured together." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Milestones,
});

function Milestones() {
  const { milestones, toggleMilestone, addMilestone, updateMilestone, deleteMilestone } = useBabyBond();
  const done = milestones.filter((m) => m.achievedAt).length;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Milestone | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(dayKey(Date.now()));
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const openForm = (milestone?: Milestone) => {
    setEditing(milestone ?? null);
    setTitle(milestone?.label ?? "");
    setDate(dayKey(milestone?.achievedAt ?? Date.now()));
    setTime(
      milestone?.achievedAt
        ? new Date(milestone.achievedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })
        : "",
    );
    setNote(milestone?.note ?? "");
    setOpen(true);
  };

  const save = async () => {
    if (!title.trim()) {
      toast.error("Please enter a milestone title.");
      return;
    }
    if (!date) {
      toast.error("Please select the milestone date.");
      return;
    }
    const eventAt = new Date(`${date}T${time || "12:00"}`).getTime();
    if (!Number.isFinite(eventAt)) {
      toast.error("Please select a valid milestone date.");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateMilestone(editing.id, {
          label: title.trim(),
          achievedAt: eventAt,
          ...(note.trim() ? { note: note.trim() } : {}),
        });
      } else {
        await addMilestone({
          label: title.trim(),
          emoji: "✨",
          achievedAt: eventAt,
          ...(note.trim() ? { note: note.trim() } : {}),
        });
      }
      setOpen(false);
      toast.success(editing ? "Milestone updated" : "Milestone added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The milestone could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <PageHeader title="Milestones" subtitle={`${done} of ${milestones.length} unlocked`} />
      <div className="space-y-2 px-5 pb-6">
        <Button className="mb-2 w-full rounded-2xl" onClick={() => openForm()}>
          <Plus /> Add Milestone
        </Button>
        {milestones.length === 0 ? (
          <SoftCard className="text-center text-sm text-muted-foreground">
            No milestones yet. Add a special moment from your baby's journey.
          </SoftCard>
        ) : null}
        {milestones.map((m) => (
          <SoftCard
            key={m.id}
            tone={m.achievedAt ? "health" : "card"}
            className="flex items-center gap-3 py-3"
          >
            <span className="grid size-11 place-items-center rounded-2xl bg-card/70 text-xl">{m.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{m.label}</p>
              <p className="text-xs opacity-70">
                {m.achievedAt
                  ? `Achieved ${formatDate(m.achievedAt)}${new Date(m.achievedAt).getHours() === 12 && new Date(m.achievedAt).getMinutes() === 0 ? "" : ` · ${formatTime(m.achievedAt)}`}`
                  : "Not yet — soon 💗"}
              </p>
              {m.note ? <p className="mt-1 text-xs text-muted-foreground">{m.note}</p> : null}
            </div>
            <Button size="icon" variant="ghost" aria-label={`Edit ${m.label}`} onClick={() => openForm(m)}>
              <Pencil />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Delete ${m.label}`}
              onClick={() => {
                if (!window.confirm(`Delete ${m.label}?`)) return;
                void deleteMilestone(m.id)
                  .then(() => toast.success("Milestone deleted"))
                  .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "The milestone could not be deleted."));
              }}
            >
              <Trash2 />
            </Button>
            <button
              type="button"
              onClick={() => {
                toggleMilestone(m.id);
                if (!m.achievedAt) toast.success(`${m.label} unlocked! 🎉`);
              }}
              className={`grid size-9 place-items-center rounded-full transition-transform active:scale-90 ${
                m.achievedAt ? "bb-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
              aria-label={`Toggle ${m.label}`}
            >
              <Check className="size-4" />
            </button>
          </SoftCard>
        ))}
      </div>
      <Dialog open={open} onOpenChange={(next) => !saving && setOpen(next)}>
        <DialogContent className="max-w-[calc(100%-2rem)] rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Milestone" : "Add Milestone"}</DialogTitle>
            <DialogDescription>Save the moment on the date it actually happened.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label htmlFor="milestone-title" className="mb-1 block text-xs font-bold">Title</label>
              <Input id="milestone-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ear Piercing" disabled={saving} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="milestone-date" className="mb-1 block text-xs font-bold">Date</label>
                <Input id="milestone-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} disabled={saving} />
              </div>
              <div>
                <label htmlFor="milestone-time" className="mb-1 block text-xs font-bold">Time (optional)</label>
                <Input id="milestone-time" type="time" value={time} onChange={(event) => setTime(event.target.value)} disabled={saving} />
              </div>
            </div>
            <div>
              <label htmlFor="milestone-note" className="mb-1 block text-xs font-bold">Note (optional)</label>
              <Textarea id="milestone-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Baby's ears were pierced." disabled={saving} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="secondary" disabled={saving} onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={() => void save()}>
              {saving ? <Loader2 className="animate-spin" /> : null}
              {editing ? "Save changes" : "Save Milestone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
