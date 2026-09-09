import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBabyBond } from "@/lib/babybond-store";
import {
  durationLabel,
  estimatedBreastMl,
  formatTime,
  startOfToday,
  type Entry,
} from "@/lib/babybond-data";

type JourneyRoute =
  | "/track/milk"
  | "/track/potty"
  | "/track/sleep"
  | "/track/weight"
  | "/track/bilirubin"
  | "/track/medicines"
  | "/track/vaccines"
  | "/track/doctor"
  | "/track/album"
  | "/track/milestones";

type JourneyItem = {
  id: string;
  at: number;
  emoji: string;
  title: string;
  detail: string;
  by?: string;
  to: JourneyRoute;
};

type DayPeriod = "night-early" | "morning" | "afternoon" | "evening" | "night-late";

const PERIODS: Record<DayPeriod, { icon: string; label: string }> = {
  "night-early": { icon: "🌙", label: "Night" },
  morning: { icon: "🌅", label: "Morning" },
  afternoon: { icon: "☀️", label: "Afternoon" },
  evening: { icon: "🌆", label: "Evening" },
  "night-late": { icon: "🌙", label: "Night" },
};

const PERIOD_ORDER: DayPeriod[] = ["night-early", "morning", "afternoon", "evening", "night-late"];
const MAX_VISIBLE = 8;

function periodFor(at: number): DayPeriod {
  const hour = new Date(at).getHours();
  if (hour < 5) return "night-early";
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night-late";
}

function entryToJourney(e: Entry, mlPerMinute: number): JourneyItem {
  const common = { id: `entry-${e.id}`, at: e.at, by: e.by };
  switch (e.type) {
    case "breast":
      return {
        ...common,
        emoji: "🤱",
        title: "Breastfeeding",
        detail: `${durationLabel(e.minutes)} · ${e.side} · Est. ${estimatedBreastMl(e.minutes, mlPerMinute)} ml`,
        to: "/track/milk",
      };
    case "formula":
      return { ...common, emoji: "🍼", title: "Formula", detail: `${e.ml} ml`, to: "/track/milk" };
    case "pee":
      return { ...common, emoji: "💧", title: "Pee", detail: e.note || "Pee recorded", to: "/track/potty" };
    case "potty":
      return {
        ...common,
        emoji: "💩",
        title: "Potty",
        detail: `${e.kind}${e.note ? ` · ${e.note}` : ""}`,
        to: "/track/potty",
      };
    case "sleep":
      return { ...common, emoji: "😴", title: "Sleep", detail: durationLabel(e.minutes), to: "/track/sleep" };
    case "weight":
      return {
        ...common,
        emoji: "⚖️",
        title: "Weight",
        detail: `${(e.grams / 1000).toFixed(2)} kg${e.note ? ` · ${e.note}` : ""}`,
        to: "/track/weight",
      };
    case "bilirubin":
      return {
        ...common,
        emoji: "🩸",
        title: "Bilirubin",
        detail: `${e.value} · ${e.method} test`,
        to: "/track/bilirubin",
      };
    case "medicine":
      return {
        ...common,
        emoji: "💊",
        title: e.name,
        detail: `${e.dose}${e.status ? ` · ${e.status}` : ""}`,
        to: "/track/medicines",
      };
    case "vaccine":
      return {
        ...common,
        emoji: "💉",
        title: e.name,
        detail: e.note || "Given",
        to: "/track/vaccines",
      };
    case "visit":
      return {
        ...common,
        emoji: "👨‍⚕️",
        title: e.doctor || "Doctor visit",
        detail: [e.hospital, e.note].filter(Boolean).join(" · ") || "Visit recorded",
        to: "/track/doctor",
      };
    case "photo":
      return {
        ...common,
        emoji: "📸",
        title: "Memory added",
        detail: e.caption || "Added to the album",
        to: "/track/album",
      };
  }
}

function liveElapsed(now: number, startedAt: number) {
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return `${hours ? `${hours}:` : ""}${String(minutes).padStart(hours ? 2 : 1, "0")}:${String(rest).padStart(2, "0")}`;
}

export function BabyDayJourney() {
  const { entries, milestones, timers, now, settings, stopTimer } = useBabyBond();
  const from = startOfToday(now);
  const until = from + 86_400_000;

  const allItems = useMemo(() => {
    const eventItems = entries
      .filter((entry) => entry.at >= from && entry.at < until)
      .map((entry) => entryToJourney(entry, settings.breastMlPerMinute));
    const milestoneItems: JourneyItem[] = milestones
      .filter((milestone) => milestone.achievedAt && milestone.achievedAt >= from && milestone.achievedAt < until)
      .map((milestone) => ({
        id: `milestone-${milestone.id}`,
        at: milestone.achievedAt ?? from,
        emoji: milestone.emoji || "🏆",
        title: milestone.label,
        detail: "Milestone achieved",
        to: "/track/milestones",
      }));
    return [...eventItems, ...milestoneItems].sort((a, b) => a.at - b.at);
  }, [entries, from, milestones, settings.breastMlPerMinute, until]);

  const visibleItems = allItems.length > MAX_VISIBLE ? allItems.slice(-MAX_VISIBLE) : allItems;
  const groups = PERIOD_ORDER.map((period) => ({
    period,
    items: visibleItems.filter((item) => periodFor(item.at) === period),
  })).filter((group) => group.items.length > 0);
  const todayEntries = entries.filter((entry) => entry.at >= from && entry.at < until);
  const feedCount = todayEntries.filter((entry) => entry.type === "breast" || entry.type === "formula").length;
  const sleepMinutes = todayEntries
    .filter((entry): entry is Extract<Entry, { type: "sleep" }> => entry.type === "sleep")
    .reduce((sum, entry) => sum + entry.minutes, 0);
  const peeCount = todayEntries.filter((entry) => entry.type === "pee").length;
  const pottyCount = todayEntries.filter((entry) => entry.type === "potty").length;
  const summary = [
    feedCount ? `🍼 ${feedCount} feed${feedCount === 1 ? "" : "s"}` : null,
    sleepMinutes ? `😴 ${durationLabel(sleepMinutes)}` : null,
    peeCount ? `💧 ${peeCount}` : null,
    pottyCount ? `💩 ${pottyCount}` : null,
  ].filter((item): item is string => Boolean(item));

  return (
    <section className="px-5 pt-4" aria-labelledby="baby-day-journey-title">
      <div className="overflow-hidden rounded-3xl bg-card bb-shadow">
        <div className="border-b border-border/60 px-4 py-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Today</p>
          <h2 id="baby-day-journey-title" className="mt-0.5 font-display text-lg font-bold">
            🌤️ Baby Day Journey
          </h2>
          <p className="text-[11px] text-muted-foreground">Your baby’s day, one little moment at a time</p>
          {summary.length ? (
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-foreground/80">
              {summary.map((item) => <span key={item}>{item}</span>)}
            </div>
          ) : null}
        </div>

        {timers.length ? (
          <div className="space-y-2 border-b border-border/60 bg-secondary/35 p-3">
            {timers.map((timer) => (
              <div key={timer.kind} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-card p-3 bb-shadow animate-fade-in">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-secondary text-lg">
                  {timer.kind === "breast" ? "🤱" : "😴"}
                </span>
                <Link to={timer.kind === "breast" ? "/track/milk" : "/track/sleep"} className="min-w-0 active:opacity-70">
                  <div className="flex items-center gap-1.5">
                    <span className="size-1.5 animate-pulse rounded-full bg-destructive motion-reduce:animate-none" />
                    <span className="text-[10px] font-bold uppercase tracking-wide text-destructive">Live</span>
                  </div>
                  <p className="truncate text-sm font-bold">{timer.kind === "breast" ? "Breastfeeding" : "Sleep"}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    <span className="font-semibold tabular-nums text-foreground">{liveElapsed(now, timer.startedAt)}</span>
                    {` · Started ${formatTime(timer.startedAt)} · ${timer.by}`}
                  </p>
                </Link>
                <Button type="button" size="sm" variant="secondary" className="h-8 shrink-0 rounded-xl px-3 text-xs" onClick={() => stopTimer(timer.kind)}>
                  Stop
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        {groups.length ? (
          <div className="px-4 py-3">
            {groups.map(({ period, items }) => (
              <div key={period} className="mb-3 last:mb-0">
                <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {PERIODS[period].icon} {PERIODS[period].label}
                </h3>
                <div>
                  {items.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-[2.8rem_1.75rem_minmax(0,1fr)] gap-2 animate-fade-in motion-reduce:animate-none">
                      <time className="pt-2 text-right text-[10px] font-semibold tabular-nums text-muted-foreground">{formatTime(item.at)}</time>
                      <div className="relative flex justify-center">
                        {index < items.length - 1 ? <span className="absolute bottom-0 top-7 w-px bg-border" /> : null}
                        <span className="relative z-10 mt-1 grid size-7 place-items-center rounded-full bg-secondary text-sm ring-4 ring-card">{item.emoji}</span>
                      </div>
                      <Link to={item.to} className="mb-1.5 grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl bg-muted/55 px-3 py-2 transition-transform active:scale-[0.98]">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold">{item.title}</p>
                          <p className="truncate text-[10px] capitalize text-muted-foreground">
                            {item.detail}{item.by ? ` · ${item.by}` : ""}
                          </p>
                        </div>
                        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : !timers.length ? (
          <div className="px-5 py-8 text-center">
            <span className="text-3xl" aria-hidden="true">🌱</span>
            <p className="mt-2 text-sm font-bold">No moments recorded yet</p>
            <p className="text-xs text-muted-foreground">Start tracking your baby’s day</p>
          </div>
        ) : null}

        {(allItems.length > MAX_VISIBLE || allItems.length > 0) ? (
          <Link
            to="/timeline"
            search={{ days: 1, type: "all" }}
            className="flex items-center justify-center gap-1 border-t border-border/60 px-4 py-3 text-xs font-bold text-primary transition-colors active:bg-secondary/60"
          >
            View full day <ChevronRight className="size-3.5" />
          </Link>
        ) : null}
      </div>
    </section>
  );
}