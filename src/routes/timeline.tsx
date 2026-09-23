import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, PageHeader, SoftCard } from "@/components/babybond/shell";
import { useBabyBond } from "@/lib/babybond-store";
import {
  dayKey,
  durationLabel,
  estimatedBreastMl,
  formatFullDate,
  formatTime,
  type Entry,
  type Milestone,
} from "@/lib/babybond-data";

export const Route = createFileRoute("/timeline")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    days: [0, 1, 7, 30].includes(Number(search["days"])) ? Number(search["days"]) : 7,
    type: FILTERS.some((filter) => filter.key === search["type"])
      ? (search["type"] as (typeof FILTERS)[number]["key"])
      : "all",
  }),
  head: () => ({
    meta: [
      { title: "Timeline — BabyBond" },
      {
        name: "description",
        content: "Every feed, nappy, nap and check-up in one gentle chronological baby timeline.",
      },
      { property: "og:title", content: "Timeline — BabyBond" },
      {
        property: "og:description",
        content: "A chronological record of your newborn's day, logged by both parents.",
      },
    ],
  }),
  component: Timeline,
});

export function describe(
  e: Entry,
  mlPerMinute?: number,
): { emoji: string; title: string; detail: string } {
  switch (e.type) {
    case "breast":
      return {
        emoji: "🤱",
        title: "Breastfeed",
        detail: `${e.side} · ${durationLabel(e.minutes)} · Estimated Breastmilk ${estimatedBreastMl(e.minutes, mlPerMinute)} ml`,
      };
    case "formula":
      return { emoji: "🍼", title: "Formula", detail: `${e.ml} ml` };
    case "pee":
      return { emoji: "💛", title: "Pee", detail: e.note || "nappy change" };
    case "potty":
      return { emoji: "💩", title: "Potty", detail: e.kind + (e.note ? ` · ${e.note}` : "") };
    case "sleep":
      return { emoji: "🌙", title: "Sleep", detail: durationLabel(e.minutes) };
    case "weight":
      return {
        emoji: "⚖️",
        title: "Weight",
        detail: `${(e.grams / 1000).toFixed(2)} kg${e.note ? ` · ${e.note}` : ""}`,
      };
    case "bilirubin":
      return { emoji: "🩸", title: "Bilirubin", detail: `${e.value} · ${e.method} test` };
    case "medicine":
      return { emoji: "💊", title: e.name, detail: `${e.dose}${e.status ? ` · ${e.status}` : ""}` };
    case "visit":
      return {
        emoji: "🩺",
        title: e.doctor,
        detail: `${e.hospital}${e.note ? ` · ${e.note}` : ""}`,
      };
    case "photo":
      return { emoji: "📸", title: "Photo", detail: e.caption || "added to the album" };
    case "vaccine":
      return {
        emoji: "🛡️",
        title: e.name,
        detail: e.note ? `vaccine · ${e.note}` : "vaccine given",
      };
  }
}

const FILTERS = [
  { key: "all", label: "All", emoji: "✨" },
  { key: "breast", label: "Breastfeed", emoji: "🤱" },
  { key: "formula", label: "Formula", emoji: "🍼" },
  { key: "pee", label: "Pee", emoji: "💛" },
  { key: "potty", label: "Potty", emoji: "💩" },
  { key: "sleep", label: "Sleep", emoji: "🌙" },
  { key: "medicine", label: "Medicine", emoji: "💊" },
  { key: "weight", label: "Weight", emoji: "⚖️" },
  { key: "bilirubin", label: "Bilirubin", emoji: "🩸" },
  { key: "vaccine", label: "Vaccine", emoji: "🛡️" },
  { key: "visit", label: "Doctor", emoji: "🩺" },
  { key: "milestone", label: "Milestone", emoji: "✨" },
] as const;

type TimelineItem = {
  id: string;
  at: number;
  type: Entry["type"] | "milestone";
  emoji: string;
  title: string;
  detail: string;
  by?: string;
};

function milestoneItem(milestone: Milestone): TimelineItem | null {
  if (!milestone.achievedAt) return null;
  return {
    id: `milestone-${milestone.id}`,
    at: milestone.achievedAt,
    type: "milestone",
    emoji: milestone.emoji || "✨",
    title: milestone.label,
    detail: milestone.note || "Milestone achieved",
    ...(milestone.by ? { by: milestone.by } : {}),
  };
}

const RANGES = [
  { key: 1, label: "Today" },
  { key: 7, label: "7 days" },
  { key: 30, label: "30 days" },
  { key: 0, label: "All" },
] as const;

function Timeline() {
  const { entries, milestones, now, settings } = useBabyBond();
  const search = Route.useSearch();
  const [type, setType] = useState<(typeof FILTERS)[number]["key"]>(search.type);
  const [days, setDays] = useState<number>(search.days);

  const filtered = useMemo(() => {
    const from = days
      ? new Date(new Date(now).setHours(0, 0, 0, 0)).getTime() - (days - 1) * 86400000
      : 0;
    const entryItems: TimelineItem[] = entries.map((entry) => {
      const display = describe(entry, settings.breastMlPerMinute);
      return { ...entry, ...display };
    });
    const milestoneItems = milestones
      .map(milestoneItem)
      .filter((item): item is TimelineItem => !!item);
    return [...entryItems, ...milestoneItems].filter(
      (item) => item.at >= from && (type === "all" || item.type === type),
    );
  }, [entries, milestones, type, days, now, settings.breastMlPerMinute]);

  // One section per calendar date, with both dates and events newest first.
  const groups = useMemo(() => {
    const map = new Map<string, TimelineItem[]>();
    for (const e of filtered) {
      const key = dayKey(e.at);
      const list = map.get(key);
      if (list) list.push(e);
      else map.set(key, [e]);
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(
        ([key, list]) =>
          [key, [...list].sort((a, b) => b.at - a.at || a.id.localeCompare(b.id))] as const,
      );
  }, [filtered]);

  return (
    <AppShell>
      <PageHeader title="Timeline" subtitle="Everything, from both parents" />
      <div className="space-y-4 px-5 pb-6">
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setDays(r.key)}
              className={`flex-1 rounded-2xl px-3 py-2 text-xs font-semibold transition-colors ${
                days === r.key
                  ? "bb-gradient text-primary-foreground"
                  : "bg-card text-muted-foreground bb-shadow"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setType(f.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                type === f.key
                  ? "bb-gradient text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {f.emoji} {f.label}
            </button>
          ))}
        </div>

        {groups.length === 0 ? (
          <SoftCard className="text-center text-sm text-muted-foreground">
            Nothing logged for this filter yet.
          </SoftCard>
        ) : null}

        {groups.map(([day, list]) => (
          <section key={day}>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {day === dayKey(now)
                ? `Today · ${formatFullDate(list[0]!.at)}`
                : formatFullDate(list[0]!.at)}
            </h2>
            <div className="space-y-2">
              {list.map((e) => {
                return (
                  <SoftCard key={e.id} className="flex items-center gap-3 py-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-secondary text-lg">
                      {e.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{e.title}</p>
                      <p className="truncate text-xs capitalize text-muted-foreground">
                        {e.detail}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold">{formatTime(e.at)}</p>
                      <p className="text-[11px] text-muted-foreground">{e.by}</p>
                    </div>
                  </SoftCard>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </AppShell>
  );
}
