import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Baby, Droplet, Moon, Pill, Plus, Scale, Stethoscope, Toilet, Activity } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useBabyBond } from "@/lib/babybond-store";
import { formatTime } from "@/lib/babybond-data";

const LINKS = [
  { to: "/track/milk", label: "Breastfeed", icon: Baby },
  { to: "/track/milk", label: "Formula", icon: Baby },
  { to: "/track/potty", label: "Potty", icon: Toilet },
  { to: "/track/sleep", label: "Sleep", icon: Moon },
  { to: "/track/medicines", label: "Medicine", icon: Pill },
  { to: "/track/doctor", label: "Doctor visit", icon: Stethoscope },
  { to: "/track/weight", label: "Weight", icon: Scale },
  { to: "/track/bilirubin", label: "Bilirubin", icon: Activity },
] as const;

export function QuickAdd() {
  const { addEntry } = useBabyBond();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Quick add"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-[max(1rem,calc(50%-13rem))] z-50 grid size-14 place-items-center rounded-lg bb-gradient text-primary-foreground bb-shadow-float transition-transform duration-150 active:scale-[0.94]"
        >
          <Plus className="size-7" />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-h-[85dvh] max-w-md overflow-y-auto border-border/60 bg-card px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <SheetHeader className="px-0">
          <SheetTitle className="font-display text-lg">Quick log</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => {
              addEntry({ type: "pee" } as never);
              setOpen(false);
              toast.success("Pee logged 💛", { description: formatTime(Date.now()) });
            }}
            className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg bg-pee p-3 text-pee-foreground bb-shadow transition-transform duration-150 active:scale-[0.97]"
          >
            <Droplet className="size-6" />
            <span className="text-xs font-semibold">Pee</span>
          </button>
          {LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              onClick={() => setOpen(false)}
              className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg bg-secondary p-3 text-secondary-foreground bb-shadow transition-transform duration-150 active:scale-[0.97]"
            >
              <l.icon className="size-6" />
              <span className="text-center text-xs font-semibold">{l.label}</span>
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
