import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader, SoftCard } from "@/components/babybond/shell";
import {
  INSIGHTS_DISCLAIMER,
  INSIGHT_CATEGORY_ICON,
  INSIGHT_CATEGORY_LABEL,
  type InsightBucket,
  type InsightCategory,
} from "@/lib/babybond-insights";
import { useInsights } from "@/lib/use-insights";
import { formatDate, formatTime } from "@/lib/babybond-data";

export const Route = createFileRoute("/insights")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Smart Baby Insights — माझी चिमणी" },
      {
        name: "description",
        content:
          "Simple observations and trends from the feeds, sleep, nappies and health data you already recorded for your baby.",
      },
      { property: "og:title", content: "Smart Baby Insights — माझी चिमणी" },
      {
        property: "og:description",
        content: "Simple observations and trends from your baby's recorded data.",
      },
    ],
  }),
  component: InsightsPage,
});

const BUCKETS: { key: InsightBucket; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "trend", label: "Trends" },
];

const CATEGORIES = Object.keys(INSIGHT_CATEGORY_LABEL) as InsightCategory[];

function InsightsPage() {
  const insights = useInsights();
  const [filter, setFilter] = useState<InsightCategory | "all">("all");

  const filtered = useMemo(
    () => (filter === "all" ? insights : insights.filter((i) => i.category === filter)),
    [insights, filter],
  );

  return (
    <AppShell>
      <PageHeader title="🧠 Smart Baby Insights" subtitle="Simple observations from your baby's recorded data" />

      <div className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1">
        {(["all", ...CATEGORIES] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={`shrink-0 rounded-2xl px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === c ? "bb-gradient text-primary-foreground" : "bg-card text-muted-foreground"
            }`}
          >
            {c === "all" ? "All" : `${INSIGHT_CATEGORY_ICON[c]} ${INSIGHT_CATEGORY_LABEL[c]}`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <SoftCard>
          <p className="text-sm text-muted-foreground">
            Not enough data yet — keep recording for better insights.
          </p>
        </SoftCard>
      ) : (
        <div className="space-y-5">
          {BUCKETS.map((b) => {
            const list = filtered.filter((i) => i.bucket === b.key);
            if (!list.length) return null;
            return (
              <section key={b.key}>
                <h2 className="mb-2 font-display text-base font-bold">{b.label}</h2>
                <div className="space-y-2">
                  {list.map((i) => (
                    <div key={i.id} className="flex gap-3 rounded-3xl bg-card p-4 bb-shadow">
                      <span className="text-xl leading-none">{i.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-snug">{i.text}</p>
                        {i.detail ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">{i.detail}</p>
                        ) : null}
                        {i.at ? (
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {formatDate(i.at)} · {formatTime(i.at)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">{INSIGHTS_DISCLAIMER}</p>
    </AppShell>
  );
}
