import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useBabyBond, useTodayDoses } from "@/lib/babybond-store";
import { formatDate, formatTime, todayOccurrence, isMedicineActiveOn } from "@/lib/babybond-data";
import {
  enableBackgroundChecks,
  notifyNow,
  pushSchedule,
  registerReminderWorker,
  requestNotificationPermission,
  type ScheduledReminder,
} from "@/lib/babybond-push";

const MED_ACTIONS = [
  { action: "given", title: "Given" },
  { action: "snooze", title: "Snooze 10m" },
  { action: "skip", title: "Skip" },
];

/**
 * Watches the schedule and raises reminders for medicines, feeds,
 * vaccinations and doctor appointments — through the service worker so they
 * still arrive when the app is in the background.
 */
export function MedicineReminders() {
  const { logMedicine, now, entries, medicines, vaccines, appointments, settings, authed, familyId, hasBaby } =
    useBabyBond();
  const doses = useTodayDoses();
  const notified = useRef<Set<string>>(new Set());
  const snoozedUntil = useRef<Map<string, number>>(new Map());
  const active = authed && !!familyId && hasBaby;

  useEffect(() => {
    if (!active) return;
    void (async () => {
      await registerReminderWorker();
      await requestNotificationPermission();
      await enableBackgroundChecks();
    })();
  }, [active]);

  // a session change wipes anything left over from the previous account
  useEffect(() => {
    notified.current.clear();
    snoozedUntil.current.clear();
    if (!active) void clearAllReminders();
  }, [active, familyId]);


  // notification action buttons coming back from the worker
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const handler = (event: MessageEvent) => {
      const msg = event.data as { type?: string; action?: string; data?: { medicineId?: string; id?: string } };
      if (msg?.type !== "reminder-action" || !msg.data?.medicineId) return;
      if (msg.action === "given") logMedicine(msg.data.medicineId, "given");
      if (msg.action === "skip") logMedicine(msg.data.medicineId, "skipped");
      if (msg.action === "snooze" && msg.data.id) {
        snoozedUntil.current.set(msg.data.id, Date.now() + 10 * 60_000);
        notified.current.delete(msg.data.id);
      }
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [logMedicine]);

  // hand the upcoming schedule to the worker so it can fire without an open tab
  useEffect(() => {
    if (!active || !familyId) {
      void pushSchedule([], null);
      return;
    }
    const items: ScheduledReminder[] = [];
    const base = Date.now();

    if (settings.medicineReminders) {
      for (const m of medicines) {
        if (!isMedicineActiveOn(m, base)) continue;
        for (const t of m.times.length ? m.times : [m.time]) {
          for (const dayOffset of [0, 1]) {
            const at = todayOccurrence(t, base + dayOffset * 86400000);
            if (at < base) continue;
            items.push({
              id: `med-${m.id}-${t}-${new Date(at).toDateString()}`,
              at,
              familyId,
              title: `💊 ${m.name} is due`,
              body: `${m.dose} · ${formatTime(at)}`,
              kind: "medicine",
              medicineId: m.id,
              actions: MED_ACTIONS,
            });
          }
        }
      }
    }
    if (settings.vaccineReminders) {
      for (const v of vaccines) {
        if (v.doneAt || !v.reminder) continue;
        const at = v.dueAt - settings.vaccineLeadDays * 86400000;
        if (at < base) continue;
        items.push({ id: `vac-${v.id}`, at, familyId, title: `🛡️ ${v.name}`, body: `Vaccine due ${formatDate(v.dueAt)}`, kind: "vaccine" });
      }
    }
    if (settings.doctorReminders) {
      for (const a of appointments) {
        if (!a.reminder) continue;
        const at = a.at - settings.doctorLeadHours * 3600_000;
        if (at < base) continue;
        items.push({
          id: `apt-${a.id}`,
          at,
          familyId,
          title: `🩺 ${a.doctor}`,
          body: `${a.hospital} · ${formatDate(a.at)} at ${formatTime(a.at)}`,
          kind: "doctor",
        });
      }
    }
    if (settings.feedReminders) {
      const lastFeed = entries.find((e) => e.type === "breast" || e.type === "formula");
      if (lastFeed) {
        const at = lastFeed.at + settings.feedGapHours * 3600_000;
        if (at > base) {
          items.push({
            id: `feed-${lastFeed.id}`,
            at,
            familyId,
            title: "🍼 Feed reminder",
            body: `It has been ${settings.feedGapHours}h since the last feed`,
            kind: "feed",
          });
        }
      }
    }
    void pushSchedule(items, familyId);
  }, [medicines, vaccines, appointments, entries, settings, active, familyId]);


  // medicines — live, while the app is open
  useEffect(() => {
    if (!settings.medicineReminders) return;
    for (const d of doses) {
      if (d.status !== "due") continue;
      const snooze = snoozedUntil.current.get(d.key) ?? 0;
      if (snooze > now) continue;
      if (notified.current.has(d.key)) continue;
      notified.current.add(d.key);

      void notifyNow(d.key, `${d.medicine.name} is due`, `${d.medicine.dose} · ${formatTime(d.at)}`, MED_ACTIONS, {
        medicineId: d.medicine.id,
      });

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
    void notifyNow(key, "Feed reminder", `No feed for ${settings.feedGapHours} hours`);
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
      void notifyNow(key, overdue ? "Vaccine overdue" : "Vaccine due soon", `${v.name} · ${formatDate(v.dueAt)}`);
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
      void notifyNow(key, "Doctor appointment", `${a.doctor} · ${formatDate(a.at)} ${formatTime(a.at)}`);
      toast(`🩺 ${a.doctor}`, {
        description: `${a.hospital} · ${formatDate(a.at)} at ${formatTime(a.at)}`,
        duration: 20_000,
      });
    }
  }, [appointments, now, settings.doctorReminders, settings.doctorLeadHours]);

  return null;
}
