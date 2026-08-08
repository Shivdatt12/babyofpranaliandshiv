import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { AppShell, PageHeader, SoftCard } from "@/components/babybond/shell";
import { useBabyBond } from "@/lib/babybond-store";
import { formatDate } from "@/lib/babybond-data";

export const Route = createFileRoute("/track/milestones")({
  head: () => ({
    meta: [
      { title: "Milestones — BabyBond" },
      { name: "description", content: "Celebrate first smiles, first rolls and every little first with a shared milestone list." },
      { property: "og:title", content: "Milestones — BabyBond" },
      { property: "og:description", content: "First smile, first roll, first tooth — captured together." },
    ],
  }),
  component: Milestones,
});

function Milestones() {
  const { milestones, toggleMilestone } = useBabyBond();
  const done = milestones.filter((m) => m.achievedAt).length;

  return (
    <AppShell>
      <PageHeader title="Milestones" subtitle={`${done} of ${milestones.length} unlocked`} />
      <div className="space-y-2 px-5 pb-6">
        {milestones.map((m) => (
          <SoftCard
            key={m.id}
            tone={m.achievedAt ? "health" : "card"}
            className="flex items-center gap-3 py-3"
          >
            <span className="grid size-11 place-items-center rounded-2xl bg-card/70 text-xl">{m.emoji}</span>
            <div className="flex-1">
              <p className="text-sm font-bold">{m.label}</p>
              <p className="text-xs opacity-70">
                {m.achievedAt ? `Achieved ${formatDate(m.achievedAt)}` : "Not yet — soon 💗"}
              </p>
            </div>
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
    </AppShell>
  );
}
