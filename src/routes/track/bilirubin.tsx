import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell, PageHeader, SoftCard, StatTile } from "@/components/babybond/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBabyBond } from "@/lib/babybond-store";
import { bilirubinLevel, formatDate, type Entry } from "@/lib/babybond-data";

export const Route = createFileRoute("/track/bilirubin")({
  head: () => ({
    meta: [
      { title: "Bilirubin tracker — BabyBond" },
      { name: "description", content: "Log skin and blood bilirubin readings and watch the jaundice trend come down." },
      { property: "og:title", content: "Bilirubin tracker — BabyBond" },
      { property: "og:description", content: "Jaundice readings and trend graph for your newborn." },
    ],
  }),
  component: BilirubinTracker,
});

const LEVEL_TEXT: Record<string, string> = {
  normal: "Normal range",
  watch: "Slightly raised — keep watching",
  high: "High — check with your doctor",
};

function BilirubinTracker() {
  const { addEntry, entries } = useBabyBond();
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<"skin" | "blood">("skin");

  const list = (entries.filter((e) => e.type === "bilirubin") as Extract<Entry, { type: "bilirubin" }>[])
    .slice()
    .sort((a, b) => a.at - b.at);
  const data = list.map((b) => ({ date: formatDate(b.at), value: b.value }));
  const latest = list[list.length - 1];
  const level = latest ? bilirubinLevel(latest.value) : "normal";

  return (
    <AppShell>
      <PageHeader title="Bilirubin" subtitle="Jaundice monitoring" />
      <div className="space-y-4 px-5 pb-6">
        <div className="grid grid-cols-2 gap-3">
          <StatTile tone="health" emoji="🩸" label="Latest" value={latest ? `${latest.value}` : "—"} hint={latest?.method} />
          <StatTile tone="health" emoji="📉" label="Readings" value={`${list.length}`} hint="all time" />
        </div>

        {latest ? (
          <SoftCard
            className={`flex items-center gap-3 py-3 ${
              level === "high" ? "bg-destructive/10" : level === "watch" ? "bg-potty" : ""
            }`}
          >
            <span className="grid size-10 place-items-center rounded-2xl bg-card/70 text-lg">
              {level === "high" ? "⚠️" : level === "watch" ? "👀" : "✅"}
            </span>
            <div className="flex-1">
              <p className="text-sm font-bold">
                {latest.value} mg/dL · {LEVEL_TEXT[level]}
              </p>
              <p className="text-xs opacity-70">
                {latest.method} test · {formatDate(latest.at)} · {latest.by}
              </p>
            </div>
          </SoftCard>
        ) : null}

        <SoftCard>
          <p className="text-sm font-bold">Trend</p>
          <div className="mt-3 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="bili" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    color: "var(--card-foreground)",
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="value" stroke="var(--chart-1)" strokeWidth={3} fill="url(#bili)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SoftCard>

        <SoftCard tone="health">
          <p className="text-sm font-bold">Add reading</p>
          <div className="mt-3 flex gap-2">
            {(["skin", "blood"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={`flex-1 rounded-2xl py-2.5 text-sm font-semibold capitalize transition-transform active:scale-95 ${
                  method === m ? "bb-gradient text-primary-foreground" : "bg-card/80"
                }`}
              >
                {m} test
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            <Input
              inputMode="decimal"
              placeholder="mg/dL e.g. 8.4"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-12 rounded-2xl bg-card/80"
            />
            <Input
              placeholder="Note (optional) — e.g. under phototherapy"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-12 rounded-2xl bg-card/80"
            />
            <Button
              className="h-12 w-full rounded-2xl bb-gradient text-primary-foreground"
              onClick={() => {
                const v = Number(value);
                if (!v) return;
                addEntry({ type: "bilirubin", value: v, method, ...(note ? { note } : {}) } as never);
                setValue("");
                setNote("");
                toast.success(`Bilirubin ${v} saved`);
              }}
            >
              Save
            </Button>
          </div>
        </SoftCard>

        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">History</h2>
          <div className="space-y-2">
            {list
              .slice()
              .reverse()
              .map((b) => {
                const l = bilirubinLevel(b.value);
                return (
                  <SoftCard
                    key={b.id}
                    className={`flex items-center gap-3 py-3 ${l === "high" ? "bg-destructive/10" : l === "watch" ? "bg-potty text-potty-foreground" : ""}`}
                  >
                    <span className="grid size-10 place-items-center rounded-2xl bg-card/70 text-lg">
                      {l === "normal" ? "🩸" : l === "watch" ? "👀" : "⚠️"}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{b.value} mg/dL</p>
                      <p className="text-xs capitalize opacity-70">
                        {b.method} test · {formatDate(b.at)} · {b.by}
                        {b.note ? ` · ${b.note}` : ""}
                      </p>
                    </div>
                  </SoftCard>
                );
              })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
