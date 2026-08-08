import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useBabyBond, useTodayDoses } from "@/lib/babybond-store";
import { formatTime } from "@/lib/babybond-data";

/**
 * Watches today's medicine schedule and raises a reminder when a dose is due.
 * Actions: Given · Snooze 10 min · Skip.
 */
export function MedicineReminders() {
  const { logMedicine, now } = useBabyBond();
  const doses = useTodayDoses();
  const notified = useRef<Set<string>>(new Set());
  const snoozedUntil = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    for (const d of doses) {
      if (d.status !== "due") continue;
      const snooze = snoozedUntil.current.get(d.key) ?? 0;
      if (snooze > now) continue;
      if (notified.current.has(d.key)) continue;
      notified.current.add(d.key);

      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        try {
          new Notification(`${d.medicine.name} is due`, { body: `${d.medicine.dose} · ${formatTime(d.at)}` });
        } catch {
          /* notifications unavailable */
        }
      }

      toast(`💊 ${d.medicine.name} is due`, {
        description: `${d.medicine.dose} · scheduled ${formatTime(d.at)}`,
        duration: 60_000,
        action: {
          label: "Given",
          onClick: () => {
            logMedicine(d.medicine.id, "given");
            toast.success(`${d.medicine.name} marked given`);
          },
        },
        cancel: {
          label: "Snooze 10m",
          onClick: () => {
            snoozedUntil.current.set(d.key, Date.now() + 10 * 60_000);
            notified.current.delete(d.key);
            toast("Snoozed for 10 minutes");
          },
        },
      });
    }
  }, [doses, now, logMedicine]);

  return null;
}
