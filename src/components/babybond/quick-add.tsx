import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FeatureIcon } from "./feature-icon";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useBabyBond } from "@/lib/babybond-store";
import { formatTime } from "@/lib/babybond-data";

const LINKS = [
  { to: "/track/milk", label: "Breastfeed", icon: "feeding" },
  { to: "/track/milk", label: "Formula", icon: "feeding" },
  { to: "/track/potty", label: "Potty", icon: "potty" },
  { to: "/track/sleep", label: "Sleep", icon: "sleep" },
  { to: "/track/medicines", label: "Medicine", icon: "medicine" },
  { to: "/track/doctor", label: "Doctor visit", icon: "doctor" },
  { to: "/track/weight", label: "Weight", icon: "weight" },
  { to: "/track/bilirubin", label: "Bilirubin", icon: "bilirubin" },
] as const;

export function QuickAdd() {
  const { addEntry } = useBabyBond();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          type="button"
          aria-label="Quick add"
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-[max(1rem,calc(50%-13rem))] z-40 grid size-14 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-float)]"
        >
          <Plus className="size-7" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[85dvh] max-w-md overflow-y-auto border-border bg-card px-5 pb-[max(2rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="px-0">
          <SheetTitle className="border-b-2 border-border pb-3 text-left font-display text-2xl font-bold uppercase">Quick log</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              addEntry({ type: "pee" } as never);
              setOpen(false);
              toast.success("Pee logged 💛", { description: formatTime(Date.now()) });
            }}
            className="flex h-auto min-h-24 flex-col items-center justify-center gap-2 p-3"
          >
            <FeatureIcon name="pee" className="size-6" />
            <span className="text-xs font-semibold">Pee</span>
          </Button>
          {LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              onClick={() => setOpen(false)}
              className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg bg-secondary p-3 text-secondary-foreground bb-shadow transition-transform duration-150 active:scale-[0.97]"
            >
              <FeatureIcon name={l.icon} className="size-6" />
              <span className="text-center text-xs font-semibold">{l.label}</span>
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
