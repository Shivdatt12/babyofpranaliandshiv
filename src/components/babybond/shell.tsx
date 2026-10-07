import { Link, useRouterState } from "@tanstack/react-router";
import { Home, CalendarClock, FileBarChart2, User, Moon, Sun, ArrowLeft, Users, WifiOff, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useBabyBond } from "@/lib/babybond-store";
import { useMediaUrl } from "@/lib/babybond-media";
import { FeatureIcon, type FeatureIconName } from "./feature-icon";
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
      className="grid size-12 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground transition-transform duration-150 active:scale-[0.96]"
    >
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-border/70 bg-card/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
      <div className="grid grid-cols-4 items-center">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-semibold transition-all duration-150 active:scale-[0.97]",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className={cn("grid h-8 min-w-16 place-items-center rounded-full transition-colors", active && "bg-secondary text-primary")}>
                <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppShell({ children, nav = true }: { children: ReactNode; nav?: boolean }) {
  const { loading, authed, hasBaby, online } = useBabyBond();
  const gate = loading ? (
    <LoadingScreen />
  ) : !authed ? (
    <SignInPrompt />
  ) : !hasBaby ? (
    <CreateBabyProfile />
  ) : null;
  const showNav = nav && !gate;
  return (
    <div className="bb-app mx-auto min-h-dvh w-full max-w-md bg-background pb-28">
      {!gate && !online ? (
        <div className="sticky top-0 z-50 flex min-h-8 items-center justify-center gap-1.5 bg-secondary px-4 text-[11px] font-bold text-secondary-foreground">
          <WifiOff className="size-3.5" /> Offline · changes will sync automatically
        </div>
      ) : null}
      <div className="bb-page-enter">{gate ?? children}</div>
      <MedicineReminders />
      {showNav ? <QuickAdd /> : null}
      {showNav ? <BottomNav /> : null}
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { me } = useBabyBond();
  return (
    <header className="sticky top-0 z-30 grid min-h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-border/55 bg-background/95 px-3 py-2 backdrop-blur-xl">
      <Link
        to="/"
        className="grid size-12 shrink-0 place-items-center rounded-full text-foreground transition-colors duration-150 active:scale-[0.96] active:bg-secondary"
        aria-label="Back home"
      >
        <ArrowLeft className="size-5" />
      </Link>
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold leading-tight">{title}</h1>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      <span className="bb-chip shrink-0 text-secondary-foreground">
        <Users className="mr-1 inline size-3" /> {me.role}
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
    <div className={cn("rounded-lg p-4 bb-shadow", tones[tone ?? "card"], className)}>
      {children}
    </div>
  );
}

export function StatusChip({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "live" | "success" | "warning" | "danger" | "neutral";
}) {
  const tones = {
    live: "border-primary/25 bg-primary/10 text-primary",
    success: "border-health-foreground/15 bg-health text-health-foreground",
    warning: "border-potty-foreground/15 bg-potty text-potty-foreground",
    danger: "border-destructive/20 bg-destructive/10 text-destructive",
    neutral: "border-border bg-secondary text-secondary-foreground",
  };
  return (
    <span className={cn("bb-chip uppercase tracking-wide", tones[tone])}>
      {tone === "live" ? <span className="size-1.5 animate-pulse rounded-full bg-current" /> : null}
      {label}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="bb-empty">
      <span className="bb-icon-well"><Icon className="size-5" /></span>
      <p className="mt-3 text-sm font-bold">{title}</p>
      <p className="mt-1 max-w-64 text-xs text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  emoji,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  emoji: string;
  icon?: FeatureIconName;
  tone?: "milk" | "formula" | "pee" | "potty" | "sleep" | "health" | "card" | undefined;
}) {
  return (
    <SoftCard tone={tone} className="flex flex-col gap-1">
      <span className="bb-icon-well text-xl leading-none">
        {icon ? <FeatureIcon name={icon} /> : emoji}
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</span>
      <span className="font-display text-xl font-bold leading-tight text-foreground">{value}</span>
      {hint ? <span className="text-[11px] opacity-70">{hint}</span> : null}
    </SoftCard>
  );
}

/** The family's own baby photo — falls back to an initial, never a stock/demo image. */
export function BabyAvatar({ className, alt }: { className?: string; alt?: string }) {
  const { baby } = useBabyBond();
  const url = useMediaUrl(baby.photo);
  if (url) {
    return (
      <img
        src={url}
        alt={alt ?? baby.name}
        loading="lazy"
        className={cn("object-cover", className)}
      />
    );
  }
  return (
    <div
      className={cn(
        "grid place-items-center bg-secondary font-display font-bold text-secondary-foreground",
        className,
      )}
    >
      {baby.name ? baby.name.slice(0, 1).toUpperCase() : "🐦"}
    </div>
  );
}
