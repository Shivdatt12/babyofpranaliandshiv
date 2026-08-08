import { createFileRoute } from "@tanstack/react-router";
import { AppShell, PageHeader, SoftCard } from "@/components/babybond/shell";
import { useBabyBond } from "@/lib/babybond-store";
import { durationLabel, formatDate, formatTime, type Entry } from "@/lib/babybond-data";

export const Route = createFileRoute("/timeline")({
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
      return { emoji: "⚖️", title: "Weight", detail: `${(e.grams / 1000).toFixed(2)} kg` };
    case "bilirubin":
      return { emoji: "🩸", title: "Bilirubin", detail: `${e.value} · ${e.method} test` };
    case "medicine":
      return { emoji: "💊", title: e.name, detail: e.dose };
    case "visit":
      return { emoji: "🩺", title: e.doctor, detail: `${e.hospital}${e.note ? ` · ${e.note}` : ""}` };
    case "vaccine":
      return { emoji: "🛡️", title: e.name, detail: e.note ? `vaccine · ${e.note}` : "vaccine given" };
  }
}


function Timeline() {
  const { entries } = useBabyBond();
  const groups = entries.reduce<Record<string, Entry[]>>((acc, e) => {
    const key = new Date(e.at).toDateString();
    (acc[key] ||= []).push(e);
    return acc;
  }, {});

  return (
    <AppShell>
      <PageHeader title="Timeline" subtitle="Everything, from both parents" />
      <div className="space-y-6 px-5 pb-6">
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
