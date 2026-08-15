import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FileDown, Share2 } from "lucide-react";
import { AppShell, PageHeader, SoftCard } from "@/components/babybond/shell";
import { Button } from "@/components/ui/button";
import { useBabyBond } from "@/lib/babybond-store";
import {
  dayKey,
  durationLabel,
  estimatedBreastMl,
  formatDate,
  formatFullDate,
  formatTime,
  startOfToday,
  type Entry,
} from "@/lib/babybond-data";

export const Route = createFileRoute("/reports")({
  ssr: false,
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

type Totals = {
  breastCount: number;
  breastMinutes: number;
  breastMl: number;
  formulaCount: number;
  formulaMl: number;
  pee: number;
  potty: number;
  sleepMinutes: number;
  medDoses: number;
  medGiven: number;
  medSkipped: number;
  visits: number;
  weights: Extract<Entry, { type: "weight" }>[];
  bili: Extract<Entry, { type: "bilirubin" }>[];
};

function emptyTotals(): Totals {
  return {
    breastCount: 0,
    breastMinutes: 0,
    breastMl: 0,
    formulaCount: 0,
    formulaMl: 0,
    pee: 0,
    potty: 0,
    sleepMinutes: 0,
    medDoses: 0,
    medGiven: 0,
    medSkipped: 0,
    visits: 0,
    weights: [],
    bili: [],
  };
}

function tally(list: Entry[], mlPerMinute: number): Totals {
  const t = emptyTotals();
  for (const e of list) {
    switch (e.type) {
      case "breast":
        t.breastCount += 1;
        t.breastMinutes += e.minutes;
        break;
      case "formula":
        t.formulaCount += 1;
        t.formulaMl += e.ml;
        break;
      case "pee":
        t.pee += 1;
        break;
      case "potty":
        t.potty += 1;
        break;
      case "sleep":
        t.sleepMinutes += e.minutes;
        break;
      case "medicine":
        t.medDoses += 1;
        if (e.status === "skipped") t.medSkipped += 1;
        else t.medGiven += 1;
        break;
      case "visit":
        t.visits += 1;
        break;
      case "weight":
        t.weights.push(e);
        break;
      case "bilirubin":
        t.bili.push(e);
        break;
      default:
        break;
    }
  }
  t.breastMl = estimatedBreastMl(t.breastMinutes, mlPerMinute);
  t.weights.sort((a, b) => a.at - b.at);
  t.bili.sort((a, b) => a.at - b.at);
  return t;
}

function moduleLines(t: Totals, extras?: { vaccinesDone?: number; vaccinesPending?: number; vaccinesMissed?: number }) {
  const first = t.weights[0];
  const last = t.weights[t.weights.length - 1];
  const lastBili = t.bili[t.bili.length - 1];
  const lines: { emoji: string; label: string; value: string; sub: string }[] = [
    {
      emoji: "🤱",
      label: "Breastfeeding",
      value: `${t.breastCount} sessions`,
      sub: `${durationLabel(t.breastMinutes)} · Estimated Breastmilk ${t.breastMl} ml`,
    },
    { emoji: "🍼", label: "Formula", value: `${t.formulaMl} ml`, sub: `${t.formulaCount} feeds` },
    { emoji: "💛", label: "Pee", value: `${t.pee}`, sub: "nappy changes" },
    { emoji: "💩", label: "Potty", value: `${t.potty}`, sub: "bowel movements" },
    { emoji: "🌙", label: "Sleep", value: durationLabel(t.sleepMinutes), sub: "total" },
    {
      emoji: "💊",
      label: "Medicines",
      value: `${t.medDoses} doses`,
      sub: `${t.medGiven} given · ${t.medSkipped} skipped`,
    },
    {
      emoji: "⚖️",
      label: "Weight",
      value: last ? `${(last.grams / 1000).toFixed(2)} kg` : "—",
      sub:
        first && last && first !== last
          ? `${last.grams - first.grams > 0 ? "+" : ""}${last.grams - first.grams} g change`
          : `${t.weights.length} reading${t.weights.length === 1 ? "" : "s"}`,
    },
    {
      emoji: "🩸",
      label: "Bilirubin",
      value: lastBili ? `${lastBili.value}` : "—",
      sub: `${t.bili.length} test${t.bili.length === 1 ? "" : "s"}`,
    },
    { emoji: "🩺", label: "Doctor", value: `${t.visits}`, sub: "visits" },
  ];
  if (extras) {
    lines.push({
      emoji: "🛡️",
      label: "Vaccines",
      value: `${extras.vaccinesDone ?? 0} completed`,
      sub: `${extras.vaccinesPending ?? 0} pending · ${extras.vaccinesMissed ?? 0} missed`,
    });
  }
  return lines;
}

function Reports() {
  const { entries, baby, now, vaccines, appointments, settings } = useBabyBond();
  const [days, setDays] = useState<number>(7);
  const [busy, setBusy] = useState(false);

  // whole-day ranges so "Today" means today, not the last 24 hours
  const from = startOfToday(now) - (days - 1) * 86400000;
  const scoped = useMemo(() => entries.filter((e) => e.at >= from), [entries, from]);

  const groups = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const e of scoped) {
      const key = dayKey(e.at);
      const list = map.get(key);
      if (list) list.push(e);
      else map.set(key, [e]);
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, list]) => ({ key, at: list[0]!.at, totals: tally(list, settings.breastMlPerMinute) }));
  }, [scoped]);

  const total = useMemo(() => tally(scoped, settings.breastMlPerMinute), [scoped, settings.breastMlPerMinute]);
  const vaxDone = vaccines.filter((v) => v.doneAt).length;
  const vaxMissed = vaccines.filter((v) => !v.doneAt && v.dueAt < now).length;
  const vaxPending = vaccines.length - vaxDone - vaxMissed;
  const summaryRows = moduleLines(total, {
    vaccinesDone: vaxDone,
    vaccinesPending: vaxPending,
    vaccinesMissed: vaxMissed,
  });

  const buildPdf = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    let y = 0;

    doc.setFillColor(250, 236, 240);
    doc.rect(0, 0, W, 110, "F");
    doc.setTextColor(60, 40, 50);
    doc.setFont("helvetica", "bold").setFontSize(22);
    doc.text(`${baby.name}'s care report`, 40, 55);
    doc.setFont("helvetica", "normal").setFontSize(11);
    doc.text(
      `${RANGES.find((r) => r.key === days)?.label ?? ""} · ${formatFullDate(from)} – ${formatFullDate(now)}`,
      40,
      78,
    );
    y = 145;

    const heading = (t: string) => {
      if (y > 740) {
        doc.addPage();
        y = 60;
      }
      doc.setFont("helvetica", "bold").setFontSize(13);
      doc.setTextColor(60, 40, 50);
      doc.text(t, 40, y);
      y += 18;
      doc.setDrawColor(230, 214, 222);
      doc.line(40, y - 8, W - 40, y - 8);
      doc.setFont("helvetica", "normal").setFontSize(10);
      doc.setTextColor(70, 70, 80);
    };

    const line = (text: string) => {
      if (y > 800) {
        doc.addPage();
        y = 60;
      }
      doc.text(text, 46, y);
      y += 15;
    };

    heading("TOTAL SUMMARY");
    for (const r of summaryRows) line(`${r.label}: ${r.value} — ${r.sub}`);
    y += 14;

    for (const g of groups) {
      heading(formatFullDate(g.at));
      for (const r of moduleLines(g.totals)) line(`${r.label}: ${r.value} — ${r.sub}`);
      y += 10;
    }

    heading("Vaccines");
    for (const v of vaccines) line(`${v.name} — ${v.doneAt ? `done ${formatDate(v.doneAt)}` : `due ${formatDate(v.dueAt)}`}`);
    y += 12;

    heading("Doctor visits");
    for (const a of appointments)
      line(`${formatDate(a.at)} ${formatTime(a.at)} — ${a.doctor}, ${a.hospital}${a.diagnosis ? ` · ${a.diagnosis}` : ""}`);

    return doc;
  };

  const download = async () => {
    setBusy(true);
    try {
      const doc = await buildPdf();
      doc?.save(`${baby.name}-report-${days}d.pdf`);
      toast.success("Report downloaded");
    } catch {
      toast.error("Could not build the PDF");
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    setBusy(true);
    try {
      const doc = await buildPdf();
      if (!doc) return;
      const blob = doc.output("blob");
      const file = new File([blob], `${baby.name}-report-${days}d.pdf`, { type: "application/pdf" });
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (nav.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${baby.name}'s care report` });
      } else {
        doc.save(`${baby.name}-report-${days}d.pdf`);
        toast("Sharing not supported here", { description: "The PDF was downloaded instead." });
      }
    } catch {
      /* user cancelled */
    } finally {
      setBusy(false);
    }
  };

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

        <h2 className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Total summary · {formatFullDate(from)} – {formatFullDate(now)}
        </h2>
        <div className="space-y-2">
          {summaryRows.map((r) => (
            <SoftCard key={r.label} className="flex items-center gap-3 py-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-lg">{r.emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{r.label}</p>
                <p className="text-xs text-muted-foreground">{r.sub}</p>
              </div>
              <p className="font-display text-base font-bold">{r.value}</p>
            </SoftCard>
          ))}
        </div>

        <h2 className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Day by day</h2>
        {groups.length === 0 ? (
          <SoftCard className="text-center text-sm text-muted-foreground">Nothing logged in this range yet.</SoftCard>
        ) : null}
        <div className="space-y-3">
          {groups.map((g) => (
            <SoftCard key={g.key} className="space-y-1">
              <p className="font-display text-base font-bold">{formatFullDate(g.at)}</p>
              {moduleLines(g.totals).map((r) => (
                <div key={r.label} className="flex items-baseline gap-2 text-xs">
                  <span>{r.emoji}</span>
                  <span className="font-semibold">{r.label}</span>
                  <span className="flex-1 truncate text-muted-foreground">{r.sub}</span>
                  <span className="font-bold">{r.value}</span>
                </div>
              ))}
            </SoftCard>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button
            disabled={busy}
            className="h-12 rounded-2xl bb-gradient text-primary-foreground"
            onClick={() => void download()}
          >
            <FileDown className="mr-2 size-4" /> PDF
          </Button>
          <Button disabled={busy} variant="secondary" className="h-12 rounded-2xl" onClick={() => void share()}>
            <Share2 className="mr-2 size-4" /> Share
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
