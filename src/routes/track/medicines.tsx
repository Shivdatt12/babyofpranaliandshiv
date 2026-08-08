import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Bell, Plus } from "lucide-react";
import { AppShell, PageHeader, SoftCard } from "@/components/babybond/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useBabyBond } from "@/lib/babybond-store";
import { formatTime, timeAgo, type Entry } from "@/lib/babybond-data";

export const Route = createFileRoute("/track/medicines")({
  head: () => ({
    meta: [
      { title: "Medicines & reminders — BabyBond" },
      { name: "description", content: "Keep vitamin D and every medicine on schedule with gentle push reminders." },
      { property: "og:title", content: "Medicines & reminders — BabyBond" },
      { property: "og:description", content: "Medicine schedule and dose history for your newborn." },
    ],
  }),
  component: Medicines,
});

function Medicines() {
  const { medicines, toggleMedicine, addMedicine, addEntry, entries, now } = useBabyBond();
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [time, setTime] = useState("09:00");

  const doses = (entries.filter((e) => e.type === "medicine") as Extract<Entry, { type: "medicine" }>[]).slice(0, 8);

  return (
    <AppShell>
      <PageHeader title="Medicines" subtitle="Doses & reminders" />
      <div className="space-y-4 px-5 pb-6">
        <div className="space-y-2">
          {medicines.map((m) => (
            <SoftCard key={m.id} className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-lg">💊</span>
              <div className="flex-1">
                <p className="text-sm font-bold">{m.name}</p>
                <p className="text-xs text-muted-foreground">
                  {m.dose} · daily at {m.time}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Switch checked={m.active} onCheckedChange={() => toggleMedicine(m.id)} />
                <button
                  type="button"
                  onClick={() => {
                    addEntry({ type: "medicine", name: m.name, dose: m.dose } as never);
                    toast.success(`${m.name} given`);
                  }}
                  className="rounded-full bb-gradient px-3 py-1 text-[11px] font-bold text-primary-foreground"
                >
                  Log dose
                </button>
              </div>
            </SoftCard>
          ))}
        </div>

        <SoftCard tone="health">
          <p className="text-sm font-bold">Add medicine</p>
          <div className="mt-3 space-y-2">
            <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="h-11 rounded-2xl bg-card/80" />
            <div className="flex gap-2">
              <Input placeholder="Dose" value={dose} onChange={(e) => setDose(e.target.value)} className="h-11 rounded-2xl bg-card/80" />
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-11 w-32 rounded-2xl bg-card/80" />
            </div>
            <Button
              className="h-11 w-full rounded-2xl bb-gradient text-primary-foreground"
              onClick={() => {
                if (!name) return;
                addMedicine({ name, dose: dose || "1 dose", time, active: true });
                setName("");
                setDose("");
                toast.success("Medicine added with a daily reminder");
              }}
            >
              <Plus className="mr-2 size-4" /> Add
            </Button>
          </div>
        </SoftCard>

        <SoftCard className="flex items-center gap-3">
          <Bell className="size-5 text-muted-foreground" />
          <p className="flex-1 text-xs text-muted-foreground">
            Both parents get the reminder — whoever gives the dose logs it, and it disappears for the other.
          </p>
        </SoftCard>

        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent doses</h2>
          <div className="space-y-2">
            {doses.map((d) => (
              <SoftCard key={d.id} className="flex items-center gap-3 py-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-lg">💊</span>
                <div className="flex-1">
                  <p className="text-sm font-bold">{d.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.dose} · {formatTime(d.at)} · {timeAgo(d.at, now)} · {d.by}
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
