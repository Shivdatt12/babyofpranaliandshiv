import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Droplets, Baby as BabyIcon, Moon, Scale, Activity, Pill, Syringe, Stethoscope, Images, Sparkles, ChevronRight } from "lucide-react";
import { AppShell, SoftCard, StatTile, ThemeToggle, BabyAvatar } from "@/components/babybond/shell";
import { VACCINE_STATUS_LABEL, vaccineStatus } from "@/lib/babybond-vaccines";
import { useBabyBond, useTodayDoses, useTodayStats } from "@/lib/babybond-store";
import { durationLabel, formatTime, timeAgo } from "@/lib/babybond-data";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "BabyBond — Today with your little one" },
      {
        name: "description",
        content:
          "See today's feeds, nappies, sleep and health for your newborn at a glance, shared live between mother and father.",
      },
      { property: "og:title", content: "BabyBond — Today with your little one" },
      {
        property: "og:description",
        content: "Feeds, nappies, sleep and health for your newborn, shared live between both parents.",
      },
    ],
  }),
  component: Dashboard,
});

const TRACKERS = [
  { to: "/track/milk", label: "Milk", emoji: "🍼", icon: Droplets },
  { to: "/track/sleep", label: "Sleep", emoji: "🌙", icon: Moon },
  { to: "/track/weight", label: "Weight", emoji: "⚖️", icon: Scale },
  { to: "/track/bilirubin", label: "Bilirubin", emoji: "🩸", icon: Activity },
  { to: "/track/medicines", label: "Medicines", emoji: "💊", icon: Pill },
  { to: "/track/vaccines", label: "Vaccines", emoji: "🛡️", icon: Syringe },
  { to: "/track/doctor", label: "Doctor", emoji: "🩺", icon: Stethoscope },
  { to: "/track/album", label: "Album", emoji: "📸", icon: Images },
  { to: "/track/milestones", label: "Milestones", emoji: "✨", icon: Sparkles },
  { to: "/names", label: "Baby Names", emoji: "💕", icon: Sparkles },
] as const;

function Countdown({ target, now }: { target: number; now: number }) {
  const diff = target - now;
  const overdue = diff <= 0;
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  const s = Math.floor((abs % 60000) / 1000);
  return (
    <span className="font-display text-2xl font-bold tabular-nums">
      {overdue ? "+" : ""}
      {h}h {String(m).padStart(2, "0")}m {String(s).padStart(2, "0")}s
    </span>
  );
}

function ActiveTimerBanner() {
  const { timers, now, stopTimer } = useBabyBond();
  if (!timers.length) return null;
  return (
    <div className="space-y-2 px-5 pt-4">
      {timers.map((t) => {
        const mins = Math.max(0, Math.floor((now - t.startedAt) / 60000));
        const secs = Math.max(0, Math.floor((now - t.startedAt) / 1000) % 60);
        return (
          <div
            key={t.kind}
            className="flex items-center gap-3 rounded-3xl bg-card p-4 bb-shadow"
          >
            <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-lg">
              {t.kind === "breast" ? "🤱" : "😴"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">
                {t.kind === "breast" ? "Breastfeeding in progress" : "Sleep in progress"}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {mins}m {String(secs).padStart(2, "0")}s · started {formatTime(t.startedAt)} by {t.by}
              </p>
            </div>
            <button
              type="button"
              onClick={() => stopTimer(t.kind)}
              className="rounded-2xl bb-gradient px-4 py-2 text-xs font-bold text-primary-foreground active:scale-95"
            >
              Stop
            </button>
          </div>
        );
      })}
    </div>
  );
}

function NameJourneyCard() {
  const { baby, nameIdeas } = useBabyBond();
  if (baby.nameStatus === "final") return null;
  return (
    <div className="px-5 pt-4">
      <Link to="/names" className="flex items-center gap-3 rounded-3xl bg-card p-4 bb-shadow active:scale-95">
        <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-lg">💕</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Still choosing her name? 💕</p>
          <p className="text-xs text-muted-foreground">
            {nameIdeas.length ? `${nameIdeas.length} names shortlisted` : "Start the name journey together"}
          </p>
        </div>
        <span className="rounded-2xl bb-gradient px-3 py-1.5 text-[11px] font-bold text-primary-foreground">
          Continue
        </span>
      </Link>
    </div>
  );
}

function Dashboard() {

  const { baby, parents, me, addEntry, now } = useBabyBond();
  const s = useTodayStats();
  const { vaccines, appointments } = useBabyBond();
  const doses = useTodayDoses();
  const nextDose = doses.find((d) => d.status === "upcoming" || d.status === "due");
  const nextVaccine = vaccines.filter((v) => !v.doneAt && !v.notApplicable)[0];
  const vaccineStatusLabel = nextVaccine ? VACCINE_STATUS_LABEL[vaccineStatus(nextVaccine, now)] : null;
  const vaccineDays = nextVaccine ? Math.round((nextVaccine.dueAt - now) / 86400_000) : 0;
  const nextVisit = appointments.find((a) => a.at >= now);

  return (
    <AppShell>
      <div className="bb-hero rounded-b-[2.5rem] px-5 pb-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/60">BabyBond</p>
            <p className="text-sm text-foreground/70">Hi {me.name}, here's today 💗</p>
          </div>
          <ThemeToggle />
        </div>

        <div className="mt-5 flex items-center gap-4">
          <BabyAvatar className="size-20 rounded-3xl text-3xl ring-4 ring-card/70 bb-shadow-float" />
          <div className="min-w-0">
            <h1 className="truncate font-display text-2xl font-bold">{baby.name}</h1>
            <p className="text-sm text-foreground/70">
              {s.ageDays} days old · {baby.gender === "girl" ? "Girl" : "Boy"} · {baby.bloodGroup}
            </p>
            <div className="mt-1 flex gap-1">
              {parents.map((p) => (
                <span
                  key={p.id}
                  className="rounded-full bg-card/70 px-2 py-0.5 text-[11px] font-semibold"
                >
                  {p.emoji} {p.role} {p.online ? "· live" : ""}
                </span>
              ))}
            </div>
          </div>
        </div>

        <SoftCard className="mt-5 flex items-center justify-between bg-card/85">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Next feed in · {s.feedGapHours}h gap
            </p>
            <Countdown target={s.nextFeedAt} now={now} />
            <p className="text-[11px] text-muted-foreground">
              Last feed{" "}
              {s.lastFeed
                ? `${formatTime(s.lastFeed.at)} · ${timeAgo(s.lastFeed.at, now)} by ${s.lastFeed.by}`
                : "—"}
            </p>
          </div>
          <span className="text-3xl">🍼</span>
        </SoftCard>

      </div>

      <ActiveTimerBanner />

      <NameJourneyCard />


      <section className="px-5 py-5">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              addEntry({ type: "pee" } as never);
              toast.success("Pee logged 💛", { description: formatTime(Date.now()) });
            }}
            className="rounded-3xl bg-pee p-5 text-left text-pee-foreground bb-shadow transition-transform active:scale-95"
          >
            <span className="text-3xl">💛</span>
            <p className="mt-2 font-display text-xl font-bold">+ Pee</p>
            <p className="text-xs opacity-70">{s.peeCount} today · one tap</p>
          </button>
          <Link
            to="/track/potty"
            className="rounded-3xl bg-potty p-5 text-left text-potty-foreground bb-shadow transition-transform active:scale-95"
          >
            <span className="text-3xl">💩</span>
            <p className="mt-2 font-display text-xl font-bold">+ Potty</p>
            <p className="text-xs opacity-70">{s.pottyCount} today · with type</p>
          </Link>
        </div>

        <h2 className="mt-6 mb-3 font-display text-base font-bold">Today</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatTile
            tone="milk"
            emoji="🥛"
            label="Today's milk"
            value={`${s.milkMl} ml`}
            hint="formula + estimated breastmilk"
          />
          <StatTile tone="formula" emoji="🍼" label="Formula" value={`${s.formulaMl} ml`} hint="bottle feeds" />
          <StatTile
            tone="milk"
            emoji="🤱"
            label="Estimated Breastmilk"
            value={`${s.breastMl} ml`}
            hint={`${s.breastCount} feeds · ${durationLabel(s.breastMinutes)}`}
          />
          <StatTile tone="sleep" emoji="🌙" label="Sleep" value={durationLabel(s.sleepMinutes)} hint="total today" />

          <StatTile
            tone="health"
            emoji="⚖️"
            label="Weight"
            value={s.weight ? `${(s.weight.grams / 1000).toFixed(2)} kg` : "—"}
            hint={
              s.weight && s.prevWeight
                ? `${s.weight.grams - s.prevWeight.grams > 0 ? "+" : ""}${s.weight.grams - s.prevWeight.grams} g`
                : "no history"
            }
          />
          <StatTile
            tone="health"
            emoji="🩸"
            label="Bilirubin"
            value={s.bilirubin ? `${s.bilirubin.value}` : "—"}
            hint={s.bilirubin ? `${s.bilirubin.method} test` : "not measured"}
          />
        </div>

        <h2 className="mt-6 mb-3 font-display text-base font-bold">Care</h2>
        <div className="space-y-2">
          <Link to="/track/medicines" className="flex items-center gap-3 rounded-3xl bg-card p-4 bb-shadow">
            <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-lg">💊</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">
                {nextDose ? nextDose.medicine.name : "No medicine left today"}
              </p>
              <p className="text-xs text-muted-foreground">
                {nextDose
                  ? `${nextDose.medicine.dose} · ${formatTime(nextDose.at)} · in ${Math.max(0, Math.round((nextDose.at - now) / 60000))} min`
                  : `${doses.length} scheduled today`}
              </p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
          <Link to="/track/vaccines" className="flex items-center gap-3 rounded-3xl bg-card p-4 bb-shadow">
            <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-lg">🛡️</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{nextVaccine ? nextVaccine.name : "All vaccines done"}</p>
              <p className="text-xs text-muted-foreground">
                {nextVaccine
                  ? `${vaccineStatusLabel} · Due ${new Date(nextVaccine.dueAt).toLocaleDateString([], { day: "numeric", month: "short" })} · ${
                      vaccineDays >= 0 ? `in ${vaccineDays}d` : `${Math.abs(vaccineDays)}d overdue`
                    }`
                  : "Nothing pending"}
              </p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
          <Link to="/track/doctor" className="flex items-center gap-3 rounded-3xl bg-card p-4 bb-shadow">
            <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-lg">🩺</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{nextVisit ? nextVisit.doctor : "No upcoming visit"}</p>
              <p className="text-xs text-muted-foreground">
                {nextVisit
                  ? `${nextVisit.hospital} · ${new Date(nextVisit.at).toLocaleDateString([], { day: "numeric", month: "short" })} ${formatTime(nextVisit.at)}`
                  : "Book one from the doctor page"}
              </p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
        </div>

        <h2 className="mt-6 mb-3 font-display text-base font-bold">Trackers</h2>
        <div className="grid grid-cols-2 gap-3">
          {TRACKERS.map((t) => (
            <Link
              key={t.to}
              to={t.to}
              className="flex items-center gap-3 rounded-3xl bg-card p-4 bb-shadow transition-transform active:scale-95"
            >
              <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-lg">{t.emoji}</span>
              <span className="flex-1 text-sm font-semibold">{t.label}</span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </div>

        <Link
          to="/timeline"
          className="mt-4 flex items-center gap-3 rounded-3xl bg-secondary p-4 text-secondary-foreground bb-shadow"
        >
          <BabyIcon className="size-5" />
          <span className="flex-1 text-sm font-semibold">See the full day timeline</span>
          <ChevronRight className="size-4" />
        </Link>
      </section>
    </AppShell>
  );
}
