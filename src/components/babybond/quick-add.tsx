import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useBabyBond } from "@/lib/babybond-store";
import { formatTime } from "@/lib/babybond-data";

const LINKS = [
  { to: "/track/milk", label: "Breastfeed", emoji: "🤱" },
  { to: "/track/milk", label: "Formula", emoji: "🍼" },
  { to: "/track/potty", label: "Potty", emoji: "💩" },
  { to: "/track/sleep", label: "Sleep", emoji: "🌙" },
  { to: "/track/medicines", label: "Medicine", emoji: "💊" },
  { to: "/track/doctor", label: "Doctor visit", emoji: "🩺" },
  { to: "/track/weight", label: "Weight", emoji: "⚖️" },
  { to: "/track/bilirubin", label: "Bilirubin", emoji: "🩸" },
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
          className="fixed bottom-24 right-[max(0.75rem,calc(50%-13rem))] z-50 grid size-14 place-items-center rounded-full bb-gradient text-primary-foreground bb-shadow-float transition-transform active:scale-90"
        >
          <Plus className="size-7" />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-[2rem] border-border/60 bg-card px-5 pb-8">
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
            className="flex flex-col items-center gap-1 rounded-3xl bg-pee p-4 text-pee-foreground bb-shadow transition-transform active:scale-95"
          >
            <span className="text-2xl">💛</span>
            <span className="text-xs font-semibold">Pee</span>
          </button>
          {LINKS.map((l) => (
            <Link
              key={l.label}
              to={l.to}
              onClick={() => setOpen(false)}
              className="flex flex-col items-center gap-1 rounded-3xl bg-secondary p-4 text-secondary-foreground bb-shadow transition-transform active:scale-95"
            >
              <span className="text-2xl">{l.emoji}</span>
              <span className="text-center text-xs font-semibold">{l.label}</span>
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
