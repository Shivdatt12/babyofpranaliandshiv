import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell, PageHeader, SoftCard, StatTile } from "@/components/babybond/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBabyBond } from "@/lib/babybond-store";
import { formatDate, type Entry } from "@/lib/babybond-data";

export const Route = createFileRoute("/track/weight")({
  head: () => ({
    meta: [
      { title: "Weight & growth — BabyBond" },
      { name: "description", content: "Record your baby's weight and follow the growth curve against WHO reference bands." },
      { property: "og:title", content: "Weight & growth — BabyBond" },
      { property: "og:description", content: "Growth timeline and WHO reference chart for your newborn." },
    ],
  }),
  component: WeightTracker,
});

function WeightTracker() {
  const { addEntry, entries, baby } = useBabyBond();
  const [grams, setGrams] = useState("");

  const weights = (entries.filter((e) => e.type === "weight") as Extract<Entry, { type: "weight" }>[]).slice().sort((a, b) => a.at - b.at);
  const data = weights.map((w) => {
    const day = Math.max(0, Math.round((w.at - baby.bornAt) / 86400000));
    return {
      day,
      kg: +(w.grams / 1000).toFixed(2),
      who: +(3.2 + day * 0.03).toFixed(2),
    };
  });

  const latest = weights[weights.length - 1];
  const first = weights[0];

  return (
    <AppShell>
      <PageHeader title="Weight" subtitle="Growth timeline" />
      <div className="space-y-4 px-5 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            tone="health"
            emoji="⚖️"
            label="Current"
            value={latest ? `${(latest.grams / 1000).toFixed(2)} kg` : "—"}
          />
          <StatTile
            tone="health"
            emoji="📈"
            label="Gained"
            value={latest && first ? `${latest.grams - first.grams} g` : "—"}
            hint="since first entry"
          />
        </div>

        <SoftCard>
          <p className="text-sm font-bold">Growth vs WHO median</p>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis domain={["auto", "auto"]} tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--card-foreground)",
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="who" stroke="var(--chart-2)" strokeDasharray="4 4" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="kg" stroke="var(--chart-1)" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-muted-foreground">Day of life · kilograms</p>
        </SoftCard>

        <SoftCard tone="health">
          <p className="text-sm font-bold">Add weight</p>
          <div className="mt-3 flex gap-2">
            <Input
              inputMode="numeric"
              placeholder="grams e.g. 3600"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
              className="h-12 rounded-2xl bg-card/80"
            />
            <Button
              className="h-12 rounded-2xl bb-gradient text-primary-foreground"
              onClick={() => {
                const g = Number(grams);
                if (!g) return;
                addEntry({ type: "weight", grams: g } as never);
                setGrams("");
                toast.success(`Weight saved · ${(g / 1000).toFixed(2)} kg`);
              }}
            >
              Save
            </Button>
          </div>
        </SoftCard>

        <div className="space-y-2">
          {weights
            .slice()
            .reverse()
            .map((w) => (
              <SoftCard key={w.id} className="flex items-center gap-3 py-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-lg">⚖️</span>
                <div className="flex-1">
                  <p className="text-sm font-bold">{(w.grams / 1000).toFixed(2)} kg</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(w.at)} · {w.by}
                  </p>
                </div>
              </SoftCard>
            ))}
        </div>
      </div>
    </AppShell>
  );
}
