import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useBabyBond, useTodayDoses } from "@/lib/babybond-store";
import { formatDate, formatTime } from "@/lib/babybond-data";

function notify(title: string, body: string) {
  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try {
      new Notification(title, { body, tag: title });
    } catch {
      /* notifications unavailable */
    }
  }
}

/**
 * Watches the schedule and raises reminders for medicines, feeds,
 * vaccinations and doctor appointments.
 */
export function MedicineReminders() {
  const { logMedicine, now, entries, vaccines, appointments, settings } = useBabyBond();
  const doses = useTodayDoses();
  const notified = useRef<Set<string>>(new Set());
  const snoozedUntil = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => undefined);
    }
  }, []);

  // medicines
  useEffect(() => {
    if (!settings.medicineReminders) return;
    for (const d of doses) {
      if (d.status !== "due") continue;
      const snooze = snoozedUntil.current.get(d.key) ?? 0;
      if (snooze > now) continue;
      if (notified.current.has(d.key)) continue;
      notified.current.add(d.key);

      notify(`${d.medicine.name} is due`, `${d.medicine.dose} · ${formatTime(d.at)}`);

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
  }, [doses, now, logMedicine, settings.medicineReminders]);

  // feed gap
  useEffect(() => {
    if (!settings.feedReminders) return;
    const lastFeed = entries.find((e) => e.type === "breast" || e.type === "formula");
    if (!lastFeed) return;
    const due = lastFeed.at + settings.feedGapHours * 3600_000;
    if (now < due) return;
    const key = `feed-${lastFeed.id}`;
    const snooze = snoozedUntil.current.get(key) ?? 0;
    if (snooze > now || notified.current.has(key)) return;
    notified.current.add(key);
    notify("Feed reminder", `No feed for ${settings.feedGapHours} hours`);
    toast("🍼 Feed reminder", {
      description: `Last feed was ${formatTime(lastFeed.at)} · over ${settings.feedGapHours}h ago`,
      duration: 60_000,
      cancel: {
        label: "Snooze 10m",
        onClick: () => {
          snoozedUntil.current.set(key, Date.now() + 10 * 60_000);
          notified.current.delete(key);
        },
      },
    });
  }, [entries, now, settings.feedReminders, settings.feedGapHours]);

  // vaccines
  useEffect(() => {
    if (!settings.vaccineReminders) return;
    for (const v of vaccines) {
      if (v.doneAt || !v.reminder) continue;
      if (v.dueAt - now > settings.vaccineLeadDays * 86400000) continue;
      const key = `vaccine-${v.id}`;
      if (notified.current.has(key)) continue;
      notified.current.add(key);
      const overdue = v.dueAt < now;
      notify(overdue ? "Vaccine overdue" : "Vaccine due soon", `${v.name} · ${formatDate(v.dueAt)}`);
      toast(`🛡️ ${v.name}`, {
        description: overdue ? `Missed — was due ${formatDate(v.dueAt)}` : `Due ${formatDate(v.dueAt)}`,
        duration: 20_000,
      });
    }
  }, [vaccines, now, settings.vaccineReminders, settings.vaccineLeadDays]);

  // appointments
  useEffect(() => {
    if (!settings.doctorReminders) return;
    for (const a of appointments) {
      if (!a.reminder || a.at < now) continue;
      if (a.at - now > settings.doctorLeadHours * 3600_000) continue;
      const key = `visit-${a.id}`;
      if (notified.current.has(key)) continue;
      notified.current.add(key);
      notify("Doctor appointment", `${a.doctor} · ${formatDate(a.at)} ${formatTime(a.at)}`);
      toast(`🩺 ${a.doctor}`, {
        description: `${a.hospital} · ${formatDate(a.at)} at ${formatTime(a.at)}`,
        duration: 20_000,
      });
    }
  }, [appointments, now, settings.doctorReminders, settings.doctorLeadHours]);

  return null;
}
