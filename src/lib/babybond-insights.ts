import type { Entry, Medicine, Vaccine } from "./babybond-data";
import { durationLabel, estimatedBreastMl, formatDate, formatTime, startOfToday } from "./babybond-data";
import { vaccineFullName, vaccineStatus } from "./babybond-vaccines";

export type InsightCategory =
  | "feeding"
  | "sleep"
  | "pee"
  | "weight"
  | "bilirubin"
  | "medicines"
  | "vaccines";

export type InsightBucket = "today" | "week" | "trend";

export type Insight = {
  id: string;
  category: InsightCategory;
  bucket: InsightBucket;
  icon: string;
  text: string;
  /** optional supporting numbers, always derived from recorded entries */
  detail?: string;
  /** event time this insight refers to, when there is one */
  at?: number;
  /** lower number = shown earlier on the dashboard */
  priority: number;
};

export const INSIGHT_CATEGORY_LABEL: Record<InsightCategory, string> = {
  feeding: "Feeding",
  sleep: "Sleep",
  pee: "Pee/Potty",
  weight: "Weight",
  bilirubin: "Bilirubin",
  medicines: "Medicines",
  vaccines: "Vaccines",
};

export const INSIGHT_CATEGORY_ICON: Record<InsightCategory, string> = {
  feeding: "🍼",
  sleep: "😴",
  pee: "💧",
  weight: "⚖️",
  bilirubin: "🩸",
  medicines: "💊",
  vaccines: "💉",
};

export const INSIGHTS_DISCLAIMER =
  "These are simple observations from your recorded data, not medical advice. Consider discussing any trend with your pediatrician if you are concerned.";

const DAY = 86_400_000;

function dayStart(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Average per day over the N complete days before today, counting only days that have data. */
function dailyAverage(values: Map<number, number>, todayStartTs: number, days: number) {
  let sum = 0;
  let counted = 0;
  for (let i = 1; i <= days; i++) {
    const key = todayStartTs - i * DAY;
    const v = values.get(key);
    if (v === undefined) continue;
    sum += v;
    counted += 1;
  }
  if (counted < 2) return null;
  return { avg: sum / counted, days: counted };
}

function bucketByDay(list: { at: number }[], value: (e: never) => number) {
  const map = new Map<number, number>();
  for (const e of list) {
    const key = dayStart(e.at);
    map.set(key, (map.get(key) ?? 0) + value(e as never));
  }
  return map;
}

function compareWord(today: number, avg: number) {
  const diff = today - avg;
  const rel = avg === 0 ? (today === 0 ? 0 : 1) : diff / avg;
  if (Math.abs(rel) < 0.15) return "in line with";
  return rel > 0 ? "higher than" : "lower than";
}

export type InsightInput = {
  entries: Entry[];
  medicines: Medicine[];
  vaccines: Vaccine[];
  now: number;
  breastMlPerMinute: number;
};

export function buildInsights({
  entries,
  vaccines,
  now,
  breastMlPerMinute,
}: InsightInput): Insight[] {
  const out: Insight[] = [];
  const todayFrom = startOfToday(now);
  const of = <T extends Entry["type"]>(type: T) =>
    entries.filter((e) => e.type === type) as Extract<Entry, { type: T }>[];

  const breast = of("breast");
  const formula = of("formula");
  const sleep = of("sleep");
  const pee = of("pee");
  const potty = of("potty");
  const weights = of("weight");
  const bili = of("bilirubin");
  const meds = of("medicine");

  const today = <T extends { at: number }>(list: T[]) => list.filter((e) => e.at >= todayFrom);

  /* ---------------- feeding ---------------- */
  const breastToday = today(breast);
  const breastMinsToday = breastToday.reduce((s, e) => s + e.minutes, 0);
  const breastAvg = dailyAverage(
    bucketByDay(breast, (e: Extract<Entry, { type: "breast" }>) => e.minutes),
    todayFrom,
    7,
  );
  if (breastToday.length) {
    if (breastAvg) {
      out.push({
        id: "breast-vs-avg",
        category: "feeding",
        bucket: "today",
        icon: "🍼",
        text: `Breastfeeding duration today is ${compareWord(breastMinsToday, breastAvg.avg)} your recent average.`,
        detail: `${durationLabel(breastMinsToday)} today · ${durationLabel(Math.round(breastAvg.avg))} average over ${breastAvg.days} recorded days`,
        priority: 1,
      });
      out.push({
        id: "breast-ml-trend",
        category: "feeding",
        bucket: "trend",
        icon: "🥛",
        text: `Estimated breastmilk today is ${compareWord(breastMinsToday, breastAvg.avg)} the recent average.`,
        detail: `${estimatedBreastMl(breastMinsToday, breastMlPerMinute)} ml today · ${estimatedBreastMl(Math.round(breastAvg.avg), breastMlPerMinute)} ml average (estimate only)`,
        priority: 6,
      });
    }
    out.push({
      id: "breast-sessions",
      category: "feeding",
      bucket: "today",
      icon: "🤱",
      text: `${breastToday.length} breastfeeding session${breastToday.length === 1 ? "" : "s"} recorded today.`,
      detail: `${durationLabel(breastMinsToday)} in total`,
      priority: 3,
    });
  }

  const formulaToday = today(formula);
  const formulaMlToday = formulaToday.reduce((s, e) => s + e.ml, 0);
  const formulaAvg = dailyAverage(
    bucketByDay(formula, (e: Extract<Entry, { type: "formula" }>) => e.ml),
    todayFrom,
    7,
  );
  if (formulaToday.length && formulaAvg) {
    out.push({
      id: "formula-vs-avg",
      category: "feeding",
      bucket: "today",
      icon: "🍼",
      text: `Recorded formula intake today is ${compareWord(formulaMlToday, formulaAvg.avg)} the recent average.`,
      detail: `${formulaMlToday} ml today · ${Math.round(formulaAvg.avg)} ml average over ${formulaAvg.days} recorded days`,
      priority: 2,
    });
  } else if (formulaToday.length) {
    out.push({
      id: "formula-today",
      category: "feeding",
      bucket: "today",
      icon: "🍼",
      text: `${formulaMlToday} ml formula recorded today.`,
      detail: `${formulaToday.length} bottle feed${formulaToday.length === 1 ? "" : "s"}`,
      priority: 4,
    });
  }

  const feedsToday = [...breastToday, ...formulaToday].sort((a, b) => a.at - b.at);
  if (feedsToday.length >= 2) {
    let longest = 0;
    let at = feedsToday[0]!.at;
    for (let i = 1; i < feedsToday.length; i++) {
      const gap = feedsToday[i]!.at - feedsToday[i - 1]!.at;
      if (gap > longest) {
        longest = gap;
        at = feedsToday[i]!.at;
      }
    }
    const mins = Math.round(longest / 60000);
    out.push({
      id: "feed-gap",
      category: "feeding",
      bucket: "today",
      icon: "⏱️",
      text: `Longest recorded gap between feeds today was ${durationLabel(mins)}.`,
      detail: `Ended at ${formatTime(at)}`,
      at,
      priority: 7,
    });
  }

  /* ---------------- sleep ---------------- */
  const sleepToday = today(sleep);
  const sleepMinsToday = sleepToday.reduce((s, e) => s + e.minutes, 0);
  const sleepAvg = dailyAverage(
    bucketByDay(sleep, (e: Extract<Entry, { type: "sleep" }>) => e.minutes),
    todayFrom,
    7,
  );
  if (sleepToday.length) {
    if (sleepAvg) {
      out.push({
        id: "sleep-vs-avg",
        category: "sleep",
        bucket: "today",
        icon: "😴",
        text: `Sleep recorded today is ${compareWord(sleepMinsToday, sleepAvg.avg)} the last recorded days.`,
        detail: `${durationLabel(sleepMinsToday)} today · ${durationLabel(Math.round(sleepAvg.avg))} average over ${sleepAvg.days} recorded days`,
        priority: 2,
      });
    }
    out.push({
      id: "sleep-sessions",
      category: "sleep",
      bucket: "today",
      icon: "🌙",
      text: `${sleepToday.length} sleep session${sleepToday.length === 1 ? "" : "s"} recorded today.`,
      detail: `${durationLabel(sleepMinsToday)} in total`,
      priority: 5,
    });
  }
  const sleepWeek = sleep.filter((e) => e.at >= todayFrom - 6 * DAY).reduce((s, e) => s + e.minutes, 0);
  const sleepPrevWeek = sleep
    .filter((e) => e.at >= todayFrom - 13 * DAY && e.at < todayFrom - 6 * DAY)
    .reduce((s, e) => s + e.minutes, 0);
  if (sleepWeek > 0 && sleepPrevWeek > 0) {
    out.push({
      id: "sleep-week",
      category: "sleep",
      bucket: "week",
      icon: "📅",
      text: `Recorded sleep this week is ${compareWord(sleepWeek, sleepPrevWeek)} last week.`,
      detail: `${durationLabel(sleepWeek)} this week · ${durationLabel(sleepPrevWeek)} previous week`,
      priority: 8,
    });
  }

  /* ---------------- pee / potty ---------------- */
  const peeToday = today(pee);
  const peeAvg = dailyAverage(bucketByDay(pee, () => 1), todayFrom, 7);
  if (peeToday.length || peeAvg) {
    out.push({
      id: "pee-today",
      category: "pee",
      bucket: "today",
      icon: "💧",
      text: `${peeToday.length} pee entr${peeToday.length === 1 ? "y" : "ies"} recorded today.`,
      detail: peeAvg
        ? `${compareWord(peeToday.length, peeAvg.avg) === "in line with" ? "In line with" : compareWord(peeToday.length, peeAvg.avg) === "higher than" ? "Higher than" : "Lower than"} the recent average of ${peeAvg.avg.toFixed(1)} per day`
        : "Not enough past days recorded for a comparison yet.",
      priority: 3,
    });
  }
  const pottyToday = today(potty);
  const pottyAvg = dailyAverage(bucketByDay(potty, () => 1), todayFrom, 7);
  if (pottyToday.length || pottyAvg) {
    out.push({
      id: "potty-today",
      category: "pee",
      bucket: "today",
      icon: "💩",
      text: `${pottyToday.length} potty entr${pottyToday.length === 1 ? "y" : "ies"} recorded today.`,
      detail: pottyAvg
        ? `Recent average ${pottyAvg.avg.toFixed(1)} per day over ${pottyAvg.days} recorded days`
        : "Not enough past days recorded for a comparison yet.",
      priority: 4,
    });
  }

  /* ---------------- weight ---------------- */
  const wSorted = [...weights].sort((a, b) => b.at - a.at);
  const latestW = wSorted[0];
  const prevW = wSorted[1];
  if (latestW) {
    out.push({
      id: "weight-latest",
      category: "weight",
      bucket: "trend",
      icon: "⚖️",
      text: `Latest recorded weight is ${(latestW.grams / 1000).toFixed(2)} kg.`,
      detail: `Measured ${formatDate(latestW.at)} · ${formatTime(latestW.at)}`,
      at: latestW.at,
      priority: 5,
    });
    if (prevW) {
      const diff = latestW.grams - prevW.grams;
      out.push({
        id: "weight-change",
        category: "weight",
        bucket: "trend",
        icon: diff >= 0 ? "📈" : "📉",
        text:
          diff === 0
            ? "Weight is unchanged since the previous measurement."
            : `Weight ${diff > 0 ? "increased" : "decreased"} by ${Math.abs(diff)} g since the previous measurement.`,
        detail: `${(prevW.grams / 1000).toFixed(2)} kg on ${formatDate(prevW.at)} → ${(latestW.grams / 1000).toFixed(2)} kg on ${formatDate(latestW.at)}`,
        at: latestW.at,
        priority: 6,
      });
    }
  }

  /* ---------------- bilirubin (observations only) ---------------- */
  const bSorted = [...bili].sort((a, b) => b.at - a.at);
  const latestB = bSorted[0];
  const prevB = bSorted[1];
  if (latestB) {
    out.push({
      id: "bili-latest",
      category: "bilirubin",
      bucket: "trend",
      icon: "🩸",
      text: `Latest recorded bilirubin value is ${latestB.value}.`,
      detail: `${latestB.method} test · ${formatDate(latestB.at)} ${formatTime(latestB.at)}`,
      at: latestB.at,
      priority: 9,
    });
    if (prevB) {
      const diff = +(latestB.value - prevB.value).toFixed(2);
      out.push({
        id: "bili-change",
        category: "bilirubin",
        bucket: "trend",
        icon: "📊",
        text:
          diff === 0
            ? "Bilirubin value is the same as the previous entry."
            : `This value changed by ${diff > 0 ? "+" : ""}${diff} compared with the previous entry.`,
        detail: `${prevB.value} on ${formatDate(prevB.at)} → ${latestB.value} on ${formatDate(latestB.at)}`,
        at: latestB.at,
        priority: 10,
      });
    }
  }

  /* ---------------- medicines ---------------- */
  const medsToday = today(meds);
  if (medsToday.length) {
    const given = medsToday.filter((m) => (m.status ?? "given") === "given").length;
    const skipped = medsToday.filter((m) => m.status === "skipped").length;
    out.push({
      id: "med-today",
      category: "medicines",
      bucket: "today",
      icon: "💊",
      text: `${given} medicine dose${given === 1 ? "" : "s"} recorded as given today.`,
      detail: skipped ? `${skipped} recorded as skipped` : undefined,
      priority: 11,
    });
  }
  const lastMed = meds[0];
  if (lastMed) {
    out.push({
      id: "med-last",
      category: "medicines",
      bucket: "trend",
      icon: "🕒",
      text: `Most recent medicine entry: ${lastMed.name}.`,
      detail: `${formatDate(lastMed.at)} ${formatTime(lastMed.at)} · by ${lastMed.by}`,
      at: lastMed.at,
      priority: 13,
    });
  }

  /* ---------------- vaccines ---------------- */
  const pending = vaccines
    .filter((v) => !v.doneAt && !v.notApplicable)
    .sort((a, b) => a.dueAt - b.dueAt);
  const overdue = pending.filter((v) => vaccineStatus(v, now) === "overdue");
  const next = overdue[0] ?? pending[0];
  if (next) {
    const days = Math.round((next.dueAt - now) / DAY);
    out.push({
      id: "vaccine-next",
      category: "vaccines",
      bucket: "trend",
      icon: overdue.length ? "⚠️" : "💉",
      text: overdue.length
        ? `${overdue.length} vaccine dose${overdue.length === 1 ? "" : "s"} are past the recommended date.`
        : "Next vaccine dose is coming up.",
      detail: `${vaccineFullName(next)} · ${days > 0 ? `due in ${days} day${days === 1 ? "" : "s"}` : days === 0 ? "due today" : `recommended ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`}`,
      at: next.dueAt,
      priority: 12,
    });
  }
  const doneVaccines = vaccines
    .filter((v) => v.doneAt)
    .sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0));
  const lastDone = doneVaccines[0];
  if (lastDone?.doneAt) {
    out.push({
      id: "vaccine-done",
      category: "vaccines",
      bucket: "trend",
      icon: "✅",
      text: `Most recently completed dose: ${vaccineFullName(lastDone)}.`,
      detail: `Given ${formatDate(lastDone.doneAt)}${lastDone.completedBy ? ` · marked by ${lastDone.completedBy}` : ""}`,
      at: lastDone.doneAt,
      priority: 14,
    });
  }

  return out.sort((a, b) => a.priority - b.priority);
}
