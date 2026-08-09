import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { FileDown, Share2 } from "lucide-react";
import { AppShell, PageHeader, SoftCard } from "@/components/babybond/shell";
import { Button } from "@/components/ui/button";
import { useBabyBond } from "@/lib/babybond-store";
import { durationLabel, formatDate, formatTime, type Entry } from "@/lib/babybond-data";

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
  const { entries, baby, now, vaccines, appointments } = useBabyBond();
  const [days, setDays] = useState<number>(7);
  const [busy, setBusy] = useState(false);
  const from = now - days * 86400000;
  const scoped = entries.filter((e) => e.at >= from);

  const sum = (t: Entry["type"]) => scoped.filter((e) => e.type === t);
  const formula = sum("formula") as Extract<Entry, { type: "formula" }>[];
  const breast = sum("breast") as Extract<Entry, { type: "breast" }>[];
  const sleep = sum("sleep") as Extract<Entry, { type: "sleep" }>[];
  const weights = sum("weight") as Extract<Entry, { type: "weight" }>[];
  const bili = sum("bilirubin") as Extract<Entry, { type: "bilirubin" }>[];

  const formulaMl = formula.reduce((s, e) => s + e.ml, 0);
  const breastMin = breast.reduce((s, e) => s + e.minutes, 0);

  const rows = [
    { emoji: "🍼", label: "Formula", value: `${formulaMl} ml`, sub: `${formula.length} bottles` },
    { emoji: "🤱", label: "Breastfeeding", value: durationLabel(breastMin), sub: `${breast.length} sessions` },
    { emoji: "🥛", label: "Total milk", value: `${formulaMl + breastMin * 8} ml`, sub: "estimated intake" },
    { emoji: "💛", label: "Pee", value: `${sum("pee").length}`, sub: "nappy changes" },
    { emoji: "💩", label: "Potty", value: `${sum("potty").length}`, sub: "bowel movements" },
    { emoji: "🌙", label: "Sleep", value: durationLabel(sleep.reduce((s, e) => s + e.minutes, 0)), sub: `${sleep.length} naps` },
    { emoji: "⚖️", label: "Weight", value: weights[0] ? `${(weights[0].grams / 1000).toFixed(2)} kg` : "—", sub: `${weights.length} readings` },
    { emoji: "🩸", label: "Bilirubin", value: bili[0] ? `${bili[0].value}` : "—", sub: `${bili.length} tests` },
    { emoji: "💊", label: "Medicines", value: `${sum("medicine").length}`, sub: "doses logged" },
    { emoji: "🛡️", label: "Vaccines", value: `${vaccines.filter((v) => v.doneAt).length}/${vaccines.length}`, sub: "completed" },
    { emoji: "🩺", label: "Doctor visits", value: `${sum("visit").length}`, sub: "appointments" },
  ];

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
      `${RANGES.find((r) => r.key === days)?.label ?? ""} · generated ${formatDate(now)} ${formatTime(now)}`,
      40,
      78,
    );
    y = 145;

    const heading = (t: string) => {
      if (y > 760) {
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

    heading("Summary");
    for (const r of rows) line(`${r.label}: ${r.value} (${r.sub})`);
    y += 12;

    const section = (title: string, list: Entry[], fmt: (e: Entry) => string) => {
      if (!list.length) return;
      heading(title);
      for (const e of list.slice(0, 60)) line(`${formatDate(e.at)} ${formatTime(e.at)} — ${fmt(e)} · ${e.by}`);
      y += 12;
    };

    section("Breastfeeding", breast, (e) => `${(e as Extract<Entry, { type: "breast" }>).side} · ${durationLabel((e as Extract<Entry, { type: "breast" }>).minutes)}`);
    section("Formula", formula, (e) => `${(e as Extract<Entry, { type: "formula" }>).ml} ml`);
    section("Pee", sum("pee"), () => "nappy change");
    section("Potty", sum("potty"), (e) => (e as Extract<Entry, { type: "potty" }>).kind);
    section("Sleep", sleep, (e) => durationLabel((e as Extract<Entry, { type: "sleep" }>).minutes));
    section("Weight", weights, (e) => `${((e as Extract<Entry, { type: "weight" }>).grams / 1000).toFixed(2)} kg`);
    section("Bilirubin", bili, (e) => `${(e as Extract<Entry, { type: "bilirubin" }>).value} mg/dL (${(e as Extract<Entry, { type: "bilirubin" }>).method})`);
    section("Medicines", sum("medicine"), (e) => {
      const m = e as Extract<Entry, { type: "medicine" }>;
      return `${m.name} · ${m.dose} · ${m.status ?? "given"}`;
    });

    heading("Vaccines");
    for (const v of vaccines) line(`${v.name} — ${v.doneAt ? `done ${formatDate(v.doneAt)}` : `due ${formatDate(v.dueAt)}`}`);
    y += 12;

    heading("Doctor visits");
    for (const a of appointments) line(`${formatDate(a.at)} ${formatTime(a.at)} — ${a.doctor}, ${a.hospital}${a.diagnosis ? ` · ${a.diagnosis}` : ""}`);

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
