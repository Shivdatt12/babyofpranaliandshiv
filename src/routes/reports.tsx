import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { FileDown, Share2 } from "lucide-react";
import { AppShell, PageHeader, SoftCard } from "@/components/babybond/shell";
import { Button } from "@/components/ui/button";
import { useBabyBond } from "@/lib/babybond-store";
import { durationLabel, type Entry } from "@/lib/babybond-data";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — BabyBond" },
      { name: "description", content: "Summarise feeds, nappies, sleep, weight and health into a shareable baby report." },
      { property: "og:title", content: "Reports — BabyBond" },
      { property: "og:description", content: "Beautiful summaries of your newborn's week, ready to share with your doctor." },
    ],
  }),
  component: Reports,
});

const RANGES = [
  { key: 1, label: "Today" },
  { key: 7, label: "7 days" },
  { key: 30, label: "30 days" },
] as const;

function Reports() {
  const { entries, baby, now } = useBabyBond();
  const [days, setDays] = useState<number>(7);
  const from = now - days * 86400000;
  const scoped = entries.filter((e) => e.at >= from);

  const sum = (t: Entry["type"]) => scoped.filter((e) => e.type === t);
  const formula = sum("formula") as Extract<Entry, { type: "formula" }>[];
  const breast = sum("breast") as Extract<Entry, { type: "breast" }>[];
  const sleep = sum("sleep") as Extract<Entry, { type: "sleep" }>[];
  const weights = sum("weight") as Extract<Entry, { type: "weight" }>[];
  const bili = sum("bilirubin") as Extract<Entry, { type: "bilirubin" }>[];

  const rows = [
    { emoji: "🍼", label: "Formula", value: `${formula.reduce((s, e) => s + e.ml, 0)} ml`, sub: `${formula.length} bottles` },
    { emoji: "🤱", label: "Breastfeeding", value: durationLabel(breast.reduce((s, e) => s + e.minutes, 0)), sub: `${breast.length} sessions` },
    { emoji: "🥛", label: "Total milk", value: `${formula.reduce((s, e) => s + e.ml, 0) + breast.reduce((s, e) => s + e.minutes * 8, 0)} ml`, sub: "estimated intake" },
    { emoji: "💛", label: "Pee", value: `${sum("pee").length}`, sub: "nappy changes" },
    { emoji: "💩", label: "Potty", value: `${sum("potty").length}`, sub: "bowel movements" },
    { emoji: "🌙", label: "Sleep", value: durationLabel(sleep.reduce((s, e) => s + e.minutes, 0)), sub: `${sleep.length} naps` },
    { emoji: "⚖️", label: "Weight", value: weights[0] ? `${(weights[0].grams / 1000).toFixed(2)} kg` : "—", sub: `${weights.length} readings` },
    { emoji: "🩸", label: "Bilirubin", value: bili[0] ? `${bili[0].value}` : "—", sub: `${bili.length} tests` },
    { emoji: "💊", label: "Medicines", value: `${sum("medicine").length}`, sub: "doses given" },
    { emoji: "🩺", label: "Doctor visits", value: `${sum("visit").length}`, sub: "appointments" },
  ];

  return (
    <AppShell>
      <PageHeader title="Reports" subtitle={`${baby.name}'s care summary`} />
      <div className="px-5 pb-6">
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setDays(r.key)}
              className={`flex-1 rounded-2xl px-3 py-2 text-sm font-semibold transition-colors ${
                days === r.key ? "bb-gradient text-primary-foreground" : "bg-card text-muted-foreground bb-shadow"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {rows.map((r) => (
            <SoftCard key={r.label} className="flex items-center gap-3 py-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-lg">{r.emoji}</span>
              <div className="flex-1">
                <p className="text-sm font-bold">{r.label}</p>
                <p className="text-xs text-muted-foreground">{r.sub}</p>
              </div>
              <p className="font-display text-base font-bold">{r.value}</p>
            </SoftCard>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button
            className="h-12 rounded-2xl bb-gradient text-primary-foreground"
            onClick={() => toast.success("Report ready", { description: "PDF export is wired up in the full build." })}
          >
            <FileDown className="mr-2 size-4" /> PDF
          </Button>
          <Button
            variant="secondary"
            className="h-12 rounded-2xl"
            onClick={() => toast("Share sheet", { description: "Send to partner, paediatrician or save." })}
          >
            <Share2 className="mr-2 size-4" /> Share
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
