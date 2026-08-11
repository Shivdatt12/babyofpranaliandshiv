import { Link, useRouterState } from "@tanstack/react-router";
import { Home, CalendarClock, FileBarChart2, User, Moon, Sun, ArrowLeft } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useBabyBond } from "@/lib/babybond-store";
import { QuickAdd } from "./quick-add";
import { MedicineReminders } from "./reminders";
import { CreateBabyProfile, LoadingScreen, SignInPrompt } from "./onboarding";

const NAV = [
  { to: "/", label: "Home", icon: Home },
  { to: "/timeline", label: "Timeline", icon: CalendarClock },
  { to: "/reports", label: "Reports", icon: FileBarChart2 },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
      }}
      className="grid size-10 place-items-center rounded-full bg-card/70 text-foreground bb-shadow transition-transform active:scale-90"
    >
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md px-3 pb-3">
      <div className="flex items-center justify-between rounded-3xl border border-border/60 bg-card/95 p-1.5 backdrop-blur bb-shadow-float">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-semibold transition-all duration-300",
                active
                  ? "bb-gradient text-primary-foreground scale-[1.02]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppShell({ children, nav = true }: { children: ReactNode; nav?: boolean }) {
  const { loading, authed, hasBaby } = useBabyBond();
  const gate = loading ? <LoadingScreen /> : !authed ? <SignInPrompt /> : !hasBaby ? <CreateBabyProfile /> : null;
  const showNav = nav && !gate;
  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-background pb-28">
      {gate ?? children}
      <MedicineReminders />
      {showNav ? <QuickAdd /> : null}
      {showNav ? <BottomNav /> : null}
    </div>
  );
}


export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { me } = useBabyBond();
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 bg-background/85 px-5 py-4 backdrop-blur">
      <Link
        to="/"
        className="grid size-10 place-items-center rounded-full bg-card text-foreground bb-shadow transition-transform active:scale-90"
        aria-label="Back home"
      >
        <ArrowLeft className="size-5" />
      </Link>
      <div className="flex-1">
        <h1 className="text-lg font-bold leading-tight">{title}</h1>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-secondary-foreground">
        {me.emoji} {me.role}
      </span>
    </header>
  );
}

export function SoftCard({
  children,
  className,
  tone,
}: {
  children: ReactNode;
  className?: string | undefined;
  tone?: "milk" | "formula" | "pee" | "potty" | "sleep" | "health" | "card" | undefined;
}) {
  const tones: Record<string, string> = {
    milk: "bg-milk text-milk-foreground",
    formula: "bg-formula text-formula-foreground",
    pee: "bg-pee text-pee-foreground",
    potty: "bg-potty text-potty-foreground",
    sleep: "bg-sleep text-sleep-foreground",
    health: "bg-health text-health-foreground",
    card: "bg-card text-card-foreground",
  };
  return (
    <div className={cn("rounded-3xl p-4 bb-shadow", tones[tone ?? "card"], className)}>{children}</div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  emoji,
  tone,
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  emoji: string;
  tone?: "milk" | "formula" | "pee" | "potty" | "sleep" | "health" | "card" | undefined;
}) {
  return (
    <SoftCard tone={tone} className="flex flex-col gap-1">
      <span className="text-xl leading-none">{emoji}</span>
      <span className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</span>
      <span className="font-display text-xl font-bold leading-tight">{value}</span>
      {hint ? <span className="text-[11px] opacity-70">{hint}</span> : null}
    </SoftCard>
  );
}
