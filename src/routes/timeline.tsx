import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, PageHeader, SoftCard } from "@/components/babybond/shell";
import { useBabyBond } from "@/lib/babybond-store";
import { durationLabel, formatDate, formatTime, type Entry } from "@/lib/babybond-data";

export const Route = createFileRoute("/timeline")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Timeline — BabyBond" },
      { name: "description", content: "Every feed, nappy, nap and check-up in one gentle chronological baby timeline." },
      { property: "og:title", content: "Timeline — BabyBond" },
      { property: "og:description", content: "A chronological record of your newborn's day, logged by both parents." },
    ],
  }),
  component: Timeline,
});

export function describe(e: Entry): { emoji: string; title: string; detail: string } {
  switch (e.type) {
    case "breast":
      return { emoji: "🤱", title: "Breastfeed", detail: `${e.side} · ${durationLabel(e.minutes)}` };
    case "formula":
      return { emoji: "🍼", title: "Formula", detail: `${e.ml} ml` };
    case "pee":
      return { emoji: "💛", title: "Pee", detail: "nappy change" };
    case "potty":
      return { emoji: "💩", title: "Potty", detail: e.kind + (e.note ? ` · ${e.note}` : "") };
    case "sleep":
      return { emoji: "🌙", title: "Sleep", detail: durationLabel(e.minutes) };
    case "weight":
      return { emoji: "⚖️", title: "Weight", detail: `${(e.grams / 1000).toFixed(2)} kg${e.note ? ` · ${e.note}` : ""}` };
    case "bilirubin":
      return { emoji: "🩸", title: "Bilirubin", detail: `${e.value} · ${e.method} test` };
    case "medicine":
      return { emoji: "💊", title: e.name, detail: `${e.dose}${e.status ? ` · ${e.status}` : ""}` };
    case "visit":
      return { emoji: "🩺", title: e.doctor, detail: `${e.hospital}${e.note ? ` · ${e.note}` : ""}` };
    case "vaccine":
      return { emoji: "🛡️", title: e.name, detail: e.note ? `vaccine · ${e.note}` : "vaccine given" };
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
] as const;

const RANGES = [
  { key: 1, label: "Today" },
  { key: 7, label: "7 days" },
  { key: 30, label: "30 days" },
  { key: 0, label: "All" },
] as const;

function Timeline() {
  const { entries, now } = useBabyBond();
  const [type, setType] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [days, setDays] = useState<number>(7);

  const filtered = useMemo(() => {
    const from = days ? new Date(new Date(now).setHours(0, 0, 0, 0)).getTime() - (days - 1) * 86400000 : 0;
    return entries.filter((e) => e.at >= from && (type === "all" || e.type === type));
  }, [entries, type, days, now]);

  const groups = filtered.reduce<Record<string, Entry[]>>((acc, e) => {
    const key = new Date(e.at).toDateString();
    (acc[key] ||= []).push(e);
    return acc;
  }, {});

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
                days === r.key ? "bb-gradient text-primary-foreground" : "bg-card text-muted-foreground bb-shadow"
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
                type === f.key ? "bb-gradient text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              {f.emoji} {f.label}
            </button>
          ))}
        </div>

        {Object.keys(groups).length === 0 ? (
          <SoftCard className="text-center text-sm text-muted-foreground">Nothing logged for this filter yet.</SoftCard>
        ) : null}

        {Object.entries(groups).map(([day, list]) => (
          <section key={day}>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {new Date(day).toDateString() === new Date().toDateString() ? "Today" : formatDate(new Date(day).getTime())}
            </h2>
            <div className="space-y-2">
              {list.map((e) => {
                const d = describe(e);
                return (
                  <SoftCard key={e.id} className="flex items-center gap-3 py-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-secondary text-lg">
                      {d.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{d.title}</p>
                      <p className="truncate text-xs capitalize text-muted-foreground">{d.detail}</p>
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
