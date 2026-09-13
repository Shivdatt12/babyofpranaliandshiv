import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Download, Info, RefreshCw, Share2, Sparkles } from "lucide-react";
import { AppShell, PageHeader, SoftCard } from "@/components/babybond/shell";
import { KundaliChart } from "@/components/babybond/kundali-chart";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useBabyBond } from "@/lib/babybond-store";
import { generateKundali } from "@/lib/kundali.functions";
import {
  degreeLabel,
  kundaliSignature,
  NAKSHATRAS,
  NAKSHATRA_SYLLABLES,
  PLANET_LABELS,
  RASHIS,
  type Kundali,
} from "@/lib/kundali-data";

export const Route = createFileRoute("/kundali")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "जन्मकुंडली & ज्योतिष — माझी चिमणी" },
      {
        name: "description",
        content:
          "Your baby's optional traditional Vedic birth chart, calculated from exact birth details.",
      },
      { property: "og:title", content: "जन्मकुंडली & ज्योतिष — माझी चिमणी" },
      {
        property: "og:description",
        content: "A family-shared traditional Vedic birth chart for your baby.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: KundaliPage,
});

const dateLabel = (at: number) =>
  new Date(at).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
const timeLabel = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const rashi = (index: number) => RASHIS[index] ?? RASHIS[0]!;

function SummaryValue({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-secondary/40 p-3">
      <span className="text-lg">{icon}</span>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}

function KundaliPage() {
  const { baby, setBaby, online } = useBabyBond();
  const generate = useServerFn(generateKundali);
  const [chart, setChart] = useState<Kundali | null>(baby.kundaliCache ?? null);
  const [busy, setBusy] = useState(false);
  const place = baby.birthPlace;
  const expectedSignature = place ? kundaliSignature(baby.bornAt, place) : "";
  const complete = baby.bornAt > 0 && !!place?.timezone;
  const cacheFresh = !!chart && chart.signature === expectedSignature;

  useEffect(() => {
    const cached = baby.kundaliCache;
    if (cached?.signature === expectedSignature) setChart(cached);
    else setChart(null);
  }, [baby.kundaliCache, expectedSignature]);

  useEffect(() => {
    if (!complete || cacheFresh || !online || busy) return;
    setBusy(true);
    void generate({ data: { bornAt: baby.bornAt, place } })
      .then((result) => {
        setChart(result);
        setBaby({ kundaliCache: result });
      })
      .catch(() => toast.error("Birth chart could not be generated right now"))
      .finally(() => setBusy(false));
  }, [baby.bornAt, busy, cacheFresh, complete, generate, online, place, setBaby]);

  const currentDasha = useMemo(() => {
    if (!chart) return null;
    const now = Date.now();
    const maha = chart.dasha.find((d) => d.startAt <= now && d.endAt > now);
    return maha
      ? { maha, antar: maha.antar?.find((d) => d.startAt <= now && d.endAt > now) }
      : null;
  }, [chart]);

  const buildPdf = async () => {
    if (!chart) return null;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const nak = NAKSHATRAS[chart.nakshatraIndex]!;
    let y = 48;
    doc.setFontSize(20);
    doc.text(`${baby.name} - Vedic Birth Chart`, 42, y);
    y += 24;
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(
      "Optional traditional astrology information — not medical or scientifically established guidance.",
      42,
      y,
    );
    y += 25;
    doc.setTextColor(25);
    doc.setFontSize(11);
    [
      `Date: ${dateLabel(chart.birth.at)}`,
      `Time: ${timeLabel(chart.birth.at)}`,
      `Place: ${chart.birth.place.name}`,
      `Moon sign: ${rashi(chart.moonSignIndex).en}`,
      `Nakshatra: ${nak.en}, Pada ${chart.nakshatraPada}`,
      `Lagna: ${rashi(chart.lagnaSignIndex).en}`,
      `Sun sign: ${rashi(chart.sunSignIndex).en}`,
    ].forEach((line) => {
      doc.text(line, 42, y);
      y += 17;
    });
    y += 8;
    doc.setFontSize(15);
    doc.text("Planetary positions", 42, y);
    y += 19;
    doc.setFontSize(9);
    chart.planets.forEach((p) => {
      doc.text(
        `${p.name.padEnd(9)} ${rashi(p.signIndex).en.padEnd(12)} ${degreeLabel(p.degreeInSign)}   House ${p.house}   ${NAKSHATRAS[p.nakshatraIndex]?.en ?? ""}`,
        42,
        y,
      );
      y += 14;
    });
    y += 8;
    doc.setFontSize(15);
    doc.text("Houses", 42, y);
    y += 19;
    doc.setFontSize(9);
    chart.houses.forEach((h) => {
      doc.text(
        `${h.house}. ${rashi(h.signIndex).en}${h.planets.length ? ` — ${h.planets.join(", ")}` : ""}`,
        42,
        y,
      );
      y += 13;
    });
    if (currentDasha) {
      y += 8;
      doc.setFontSize(15);
      doc.text("Vimshottari Dasha", 42, y);
      y += 18;
      doc.setFontSize(9);
      doc.text(
        `Mahadasha: ${currentDasha.maha.lord} (${dateLabel(currentDasha.maha.startAt)} – ${dateLabel(currentDasha.maha.endAt)})`,
        42,
        y,
      );
      y += 14;
      if (currentDasha.antar)
        doc.text(
          `Antardasha: ${currentDasha.antar.lord} (${dateLabel(currentDasha.antar.startAt)} – ${dateLabel(currentDasha.antar.endAt)})`,
          42,
          y,
        );
    }
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`Convention: ${chart.config.ayanamsa}; ${chart.config.houseSystem} houses.`, 42, 800);
    doc.addPage();
    doc.setTextColor(25);
    doc.setFontSize(16);
    doc.text("North Indian birth chart", 42, 48);
    const left = 100;
    const top = 100;
    const size = 395;
    const midX = left + size / 2;
    const midY = top + size / 2;
    doc.rect(left, top, size, size);
    doc.line(left, top, left + size, top + size);
    doc.line(left + size, top, left, top + size);
    doc.line(left, top, midX, midY);
    doc.line(left + size, top, midX, midY);
    doc.line(left + size, top + size, midX, midY);
    doc.line(left, top + size, midX, midY);
    const pdfCells = [
      [50, 11],
      [75, 24],
      [88, 50],
      [75, 76],
      [50, 89],
      [25, 76],
      [12, 50],
      [25, 24],
      [50, 37],
      [63, 50],
      [50, 63],
      [37, 50],
    ];
    doc.setFontSize(8);
    chart.houses.forEach((house, index) => {
      const cell = pdfCells[index];
      if (!cell) return;
      const planets = house.planets.map((p) => PLANET_LABELS[p]?.short ?? p.slice(0, 2)).join(" ");
      doc.text(
        `${house.house} ${rashi(house.signIndex).en}${planets ? ` / ${planets}` : ""}`,
        left + ((cell[0] ?? 0) / 100) * size,
        top + ((cell[1] ?? 0) / 100) * size,
        { align: "center" },
      );
    });
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      "Traditional astrology information; not medical or scientifically established guidance.",
      42,
      800,
    );
    return doc;
  };

  const download = async () => {
    const doc = await buildPdf();
    doc?.save(`${baby.name || "baby"}-birth-chart.pdf`);
  };
  const share = async () => {
    const doc = await buildPdf();
    if (!doc) return;
    const file = new File([doc.output("blob")], `${baby.name || "baby"}-birth-chart.pdf`, {
      type: "application/pdf",
    });
    const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };
    if (nav.canShare?.({ files: [file] }))
      await nav.share({ files: [file], title: `${baby.name}'s birth chart` });
    else {
      doc.save(file.name);
      toast("Sharing is unavailable here", { description: "The PDF was downloaded instead." });
    }
  };

  if (!complete)
    return (
      <AppShell>
        <PageHeader title="जन्मकुंडली & ज्योतिष" subtitle="Optional traditional astrology" />
        <div className="px-5">
          <SoftCard className="py-8 text-center">
            <span className="text-4xl">🔮</span>
            <h2 className="mt-3 font-display text-lg font-bold">
              Complete your baby’s birth details to generate the birth chart.
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Exact birth date, time, and a selected birth place are required. Nothing is guessed.
            </p>
            <Button asChild className="mt-5 rounded-2xl">
              <Link to="/settings">
                Update Birth Details <ChevronRight className="ml-1 size-4" />
              </Link>
            </Button>
          </SoftCard>
        </div>
      </AppShell>
    );

  if (!chart || !cacheFresh)
    return (
      <AppShell>
        <PageHeader title="जन्मकुंडली & ज्योतिष" subtitle="Optional traditional astrology" />
        <div className="px-5">
          <SoftCard className="py-10 text-center">
            <RefreshCw className={`mx-auto size-8 text-primary ${busy ? "animate-spin" : ""}`} />
            <h2 className="mt-3 font-display text-lg font-bold">
              {online ? "Updating birth chart…" : "Birth chart needs an internet connection"}
            </h2>
            <p className="mt-2 text-xs text-muted-foreground">
              The chart is calculated only from the exact saved birth details.
            </p>
          </SoftCard>
        </div>
      </AppShell>
    );

  const nak = NAKSHATRAS[chart.nakshatraIndex]!;
  const syllable = NAKSHATRA_SYLLABLES[chart.nakshatraIndex]?.[chart.nakshatraPada - 1];
  return (
    <AppShell>
      <PageHeader title="जन्मकुंडली & ज्योतिष" subtitle="Optional traditional astrology" />
      <main className="space-y-4 px-5 pb-6">
        <SoftCard className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="bb-icon-well text-xl">👶</span>
            <div>
              <h2 className="font-display text-lg font-bold">{baby.name}</h2>
              <p className="text-xs text-muted-foreground">
                {dateLabel(chart.birth.at)} · {timeLabel(chart.birth.at)}
              </p>
              <p className="text-xs text-muted-foreground">📍 {chart.birth.place.name}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <SummaryValue
              icon="🌙"
              label="चंद्र राशी"
              value={`${rashi(chart.moonSignIndex).mr} · ${rashi(chart.moonSignIndex).en}`}
            />
            <SummaryValue icon="⭐" label="जन्म नक्षत्र" value={`${nak.mr} · ${nak.en}`} />
            <SummaryValue icon="🔢" label="नक्षत्र पाद" value={`पाद ${chart.nakshatraPada}`} />
            <SummaryValue
              icon="🌅"
              label="लग्न"
              value={`${rashi(chart.lagnaSignIndex).mr} · ${degreeLabel(chart.lagnaDegree)}`}
            />
            <div className="col-span-2">
              <SummaryValue
                icon="☀️"
                label="सूर्य राशी"
                value={`${rashi(chart.sunSignIndex).mr} · ${rashi(chart.sunSignIndex).en}`}
              />
            </div>
          </div>
        </SoftCard>

        <SoftCard>
          <h2 className="mb-3 font-display text-base font-bold">📜 जन्मकुंडली</h2>
          <KundaliChart chart={chart} />
        </SoftCard>

        <SoftCard>
          <h2 className="mb-3 font-display text-base font-bold">🪐 ग्रह स्थिती</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="pb-2">ग्रह</th>
                  <th>राशी</th>
                  <th>अंश</th>
                  <th>भाव</th>
                  <th>नक्षत्र</th>
                </tr>
              </thead>
              <tbody>
                {chart.planets.map((p) => (
                  <tr key={p.key} className="border-t border-border/50">
                    <td className="py-2 font-semibold">
                      {p.nameMr}
                      <span className="block text-[9px] font-normal text-muted-foreground">
                        {p.name}
                      </span>
                    </td>
                    <td>{rashi(p.signIndex).mr}</td>
                    <td className="whitespace-nowrap">{degreeLabel(p.degreeInSign)}</td>
                    <td>{p.house}</td>
                    <td>{NAKSHATRAS[p.nakshatraIndex]?.mr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SoftCard>

        <SoftCard>
          <Accordion type="multiple">
            <AccordionItem value="houses">
              <AccordionTrigger>🏠 भाव स्थिती</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-2">
                  {chart.houses.map((h) => (
                    <div key={h.house} className="rounded-xl bg-secondary/50 p-3">
                      <p className="text-xs font-bold">
                        भाव {h.house} · {rashi(h.signIndex).mr}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {h.planets.length
                          ? h.planets.map((p) => PLANET_LABELS[p]?.mr ?? p).join(", ")
                          : "कोणताही ग्रह नाही"}
                      </p>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="nak">
              <AccordionTrigger>⭐ जन्म नक्षत्र</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-xs">
                  <p>
                    <b>
                      {nak.mr} ({nak.en})
                    </b>{" "}
                    · पाद {chart.nakshatraPada}
                  </p>
                  <p>
                    स्वामी ग्रह: {PLANET_LABELS[nak.lord]?.mr ?? nak.lord} · देवता: {nak.deity}
                  </p>
                  <p>
                    पारंपरिक चिन्ह: {nak.symbol}
                    {syllable ? ` · नामाक्षर: ${syllable}` : ""}
                  </p>
                  <p className="rounded-xl bg-secondary/50 p-3">
                    पारंपरिक मान्यतेनुसार: {nak.note}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="dasha">
              <AccordionTrigger>🔄 विम्शोत्तरी दशा</AccordionTrigger>
              <AccordionContent>
                {currentDasha ? (
                  <div className="space-y-2 text-xs">
                    <p>
                      <b>महादशा:</b> {currentDasha.maha.lordMr} ·{" "}
                      {dateLabel(currentDasha.maha.startAt)} – {dateLabel(currentDasha.maha.endAt)}
                    </p>
                    {currentDasha.antar ? (
                      <p>
                        <b>अंतर्दशा:</b> {currentDasha.antar.lordMr} ·{" "}
                        {dateLabel(currentDasha.antar.startAt)} –{" "}
                        {dateLabel(currentDasha.antar.endAt)}
                      </p>
                    ) : null}
                    <div className="mt-3 space-y-1">
                      {chart.dasha.map((d) => (
                        <div
                          key={d.startAt}
                          className="flex justify-between rounded-xl bg-secondary/50 p-2"
                        >
                          <b>{d.lordMr}</b>
                          <span>
                            {dateLabel(d.startAt)} – {dateLabel(d.endAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No current period in the generated timeline.
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="traditional">
              <AccordionTrigger>✨ ज्योतिषीय अर्थ</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-xs">
                  <p>
                    वैदिक ज्योतिषानुसार चंद्र राशी मन व भावविश्वाशी, तर लग्न व्यक्त होण्याच्या
                    पद्धतीशी परंपरेने जोडले जाते.
                  </p>
                  <p>
                    पारंपरिक मान्यतेनुसार {nak.mr} नक्षत्र: {nak.note}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-secondary/50 p-3">
                      <b>🎨 शुभ रंग</b>
                      <p>{nak.colors.join(", ")}</p>
                    </div>
                    <div className="rounded-xl bg-secondary/50 p-3">
                      <b>🔢 शुभ अंक</b>
                      <p>{nak.numbers.join(", ")}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground">
                    ही सांस्कृतिक/पारंपरिक माहिती आहे; वैज्ञानिकदृष्ट्या सिद्ध तथ्य किंवा निश्चित
                    भविष्यवाणी नाही.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="about">
              <AccordionTrigger>ℹ️ Calculation convention</AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <p>
                    Sidereal zodiac using {chart.config.ayanamsa} ayanamsa (
                    {chart.config.ayanamsaValue.toFixed(4)}°) and{" "}
                    {chart.config.houseSystem.toLowerCase()} houses.
                  </p>
                  <p>
                    Planet positions use {chart.config.engine}; lunar nodes use the mean-node
                    convention. Birth time is interpreted with the saved IANA timezone for the
                    selected coordinates.
                  </p>
                  <p>
                    This optional chart is traditional astrology content. It is separate from health
                    insights and must not guide medical, developmental, or safety decisions.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </SoftCard>

        {!online ? (
          <p className="rounded-xl bg-secondary p-3 text-center text-xs text-muted-foreground">
            Offline · showing the last family-synced chart
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" className="rounded-2xl" onClick={() => void download()}>
            <Download className="mr-2 size-4" /> PDF
          </Button>
          <Button className="rounded-2xl" onClick={() => void share()}>
            <Share2 className="mr-2 size-4" /> Share
          </Button>
        </div>
        <p className="flex gap-2 px-1 text-[10px] leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 size-3 shrink-0" />
          Cached with the exact birth details and shared with both parents. Editing the date, time,
          or selected place invalidates this chart.
        </p>
      </main>
    </AppShell>
  );
}
