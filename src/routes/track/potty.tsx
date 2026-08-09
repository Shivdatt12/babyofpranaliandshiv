import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader, SoftCard, StatTile } from "@/components/babybond/shell";
import { Textarea } from "@/components/ui/textarea";
import { useBabyBond, useTodayStats } from "@/lib/babybond-store";
import { POTTY_KINDS, formatTime, timeAgo, type PottyKind } from "@/lib/babybond-data";

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

function PottyTracker() {
  const { addEntry, entries, now } = useBabyBond();
  const s = useTodayStats();
  const [kind, setKind] = useState<PottyKind>("normal");
  const [note, setNote] = useState("");

  const nappies = entries.filter((e) => e.type === "pee" || e.type === "potty").slice(0, 10);

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

        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Recent changes</h2>
          <div className="space-y-2">
            {nappies.map((e) => (
              <SoftCard key={e.id} className="flex items-center gap-3 py-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-lg">
                  {e.type === "pee" ? "💛" : "💩"}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold capitalize">
                    {e.type === "pee" ? "Pee" : `Potty · ${e.kind}`}
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
