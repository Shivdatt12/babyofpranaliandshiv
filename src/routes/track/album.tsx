import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { AppShell, PageHeader, SoftCard } from "@/components/babybond/shell";
import { useBabyBond } from "@/lib/babybond-store";
import { formatDate } from "@/lib/babybond-data";

export const Route = createFileRoute("/track/album")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Photo album — BabyBond" },
      { name: "description", content: "Monthly photos and everyday moments of your baby, kept in one soft shared album." },
      { property: "og:title", content: "Photo album — BabyBond" },
      { property: "og:description", content: "Monthly photos and precious moments, shared with both parents." },
    ],
  }),
  component: Album,
});

function Album() {
  const { baby, now } = useBabyBond();
  const months = [0, 1, 2, 3, 4, 5];

  return (
    <AppShell>
      <PageHeader title="Album" subtitle={`${baby.name}'s moments`} />
      <div className="space-y-4 px-5 pb-6">
        <button
          type="button"
          onClick={() => toast("Camera", { description: "Photo upload arrives with the backend build." })}
          className="flex w-full items-center gap-3 rounded-3xl bb-gradient p-5 text-primary-foreground bb-shadow-float active:scale-95"
        >
          <Camera className="size-6" />
          <span className="flex-1 text-left font-display text-lg font-bold">Add today's photo</span>
        </button>

        <SoftCard className="p-3">
          <BabyAvatar className="aspect-square w-full rounded-2xl text-5xl" />
          <p className="mt-2 px-1 text-sm font-bold">{baby.name}</p>
          <p className="px-1 text-xs text-muted-foreground">Born {formatDate(baby.bornAt)}</p>
        </SoftCard>

        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Monthly photos</h2>
          <div className="grid grid-cols-3 gap-3">
            {months.map((m) => {
              const unlocked = baby.bornAt + m * 30 * 86400000 <= now;
              return (
                <div
                  key={m}
                  className={`grid aspect-square place-items-center rounded-3xl text-center text-xs font-bold bb-shadow ${
                    unlocked ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {unlocked ? (
                    <span>
                      Month
                      <br />
                      {m}
                    </span>
                  ) : (
                    <span>
                      Month
                      <br />
                      {m}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
