import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useBabyBond, useTodayDoses } from "@/lib/babybond-store";
import { formatDate, formatTime, todayOccurrence, isMedicineActiveOn } from "@/lib/babybond-data";
import {
  checkDueNow,
  clearAllReminders,
  enableBackgroundChecks,
  pushSchedule,
  registerReminderWorker,
  requestNotificationPermission,
  resolveReminder,
  snoozeReminder,
  type NotificationPrefs,
  type ScheduledReminder,
} from "@/lib/babybond-push";

const MED_ACTIONS = [
  { action: "given", title: "Given" },
  { action: "snooze", title: "Snooze 10m" },
  { action: "skip", title: "Skip" },
];

const DAY = 86400000;
const HOUR = 3600_000;

/**
 * Single source of reminder scheduling for medicines, feeds, vaccines and
 * doctor visits. Occurrences are handed to the service worker, which owns the
 * whole notification lifecycle (first reminder, one automatic follow-up after a
 * swipe, snooze, and stop on Given/Skip). Nothing is notified twice.
 */
export function MedicineReminders() {
  const { logMedicine, now, entries, medicines, vaccines, appointments, settings, authed, familyId, hasBaby } =
    useBabyBond();
  const doses = useTodayDoses();
  const toasted = useRef<Set<string>>(new Set());
  const active = authed && !!familyId && hasBaby;

  const prefs = useMemo<NotificationPrefs>(
    () => ({
      snoozeMs: Math.max(1, settings.snoozeMinutes) * 60_000,
      silent: settings.soundMode === "silent",
      vibrate: settings.vibrate,
    }),
    [settings.snoozeMinutes, settings.soundMode, settings.vibrate],
  );

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
    toasted.current.clear();
    if (!active) void clearAllReminders();
  }, [active, familyId]);

  // notification actions coming back from the worker
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const handler = (event: MessageEvent) => {
      const msg = event.data as {
        type?: string;
        action?: string;
        data?: { medicineId?: string; id?: string; doseKey?: string };
      };
      if (msg?.type !== "reminder-action") return;
      const medicineId = msg.data?.medicineId;
      if (msg.action === "given" && medicineId) logMedicine(medicineId, "given");
      if (msg.action === "skip" && medicineId) logMedicine(medicineId, "skipped");
      if (msg.data?.id && (msg.action === "given" || msg.action === "skip")) toasted.current.add(msg.data.id);
    };
    navigator.serviceWorker.addEventListener("message", handler);
    return () => navigator.serviceWorker.removeEventListener("message", handler);
  }, [logMedicine]);

  /* -------- one schedule, one lifecycle owner -------- */
  const items = useMemo<ScheduledReminder[]>(() => {
    if (!active || !familyId) return [];
    const base = Date.now();
    const lead = Math.max(0, settings.reminderLeadMinutes) * 60_000;
    const list: ScheduledReminder[] = [];

    if (settings.medicineReminders) {
      for (const m of medicines) {
        if (!isMedicineActiveOn(m, base)) continue;
        for (const t of m.times.length ? m.times : [m.time]) {
          for (const dayOffset of [0, 1]) {
            const dueAt = todayOccurrence(t, base + dayOffset * DAY);
            const at = dueAt - lead;
            if (at < base - 5 * 60_000) continue;
            list.push({
              id: `med-${m.id}-${t}-${new Date(dueAt).toDateString()}`,
              at,
              dueAt,
              familyId,
              title: `💊 ${m.name} is due`,
              body: `${m.dose} · ${formatTime(dueAt)}`,
              kind: "medicine",
              medicineId: m.id,
              doseKey: `${m.id}-${t}`,
              actions: MED_ACTIONS,
            });
          }
        }
      }
    }

    if (settings.vaccineReminders) {
      for (const v of vaccines) {
        if (v.doneAt || !v.reminder) continue;
        const dueAt = v.dueAt - settings.vaccineLeadDays * DAY;
        const at = dueAt - lead;
        if (at < base - 5 * 60_000) continue;
        list.push({
          id: `vac-${v.id}`,
          at,
          dueAt,
          familyId,
          title: `🛡️ ${v.name}`,
          body: `Vaccine due ${formatDate(v.dueAt)}`,
          kind: "vaccine",
          actions: [{ action: "snooze", title: `Snooze ${settings.snoozeMinutes}m` }],
        });
      }
    }

    if (settings.doctorReminders) {
      for (const a of appointments) {
        if (!a.reminder) continue;
        const dueAt = a.at - settings.doctorLeadHours * HOUR;
        const at = dueAt - lead;
        if (at < base - 5 * 60_000) continue;
        list.push({
          id: `apt-${a.id}`,
          at,
          dueAt,
          familyId,
          title: `🩺 ${a.doctor}`,
          body: `${a.hospital} · ${formatDate(a.at)} at ${formatTime(a.at)}`,
          kind: "doctor",
          actions: [{ action: "snooze", title: `Snooze ${settings.snoozeMinutes}m` }],
        });
      }
    }

    if (settings.feedReminders) {
      const lastFeed = entries.find((e) => e.type === "breast" || e.type === "formula");
      if (lastFeed) {
        // due time comes from the saved feed gap — never a hardcoded value
        const dueAt = lastFeed.at + settings.feedGapHours * HOUR;
        const at = dueAt - lead;
        if (at > base - 5 * 60_000) {
          list.push({
            id: `feed-${lastFeed.id}`,
            at,
            dueAt,
            familyId,
            title: "🍼 Feed reminder",
            body: `Next feed around ${formatTime(dueAt)} · ${settings.feedGapHours}h gap`,
            kind: "feed",
            actions: [{ action: "snooze", title: `Snooze ${settings.snoozeMinutes}m` }],
          });
        }
      }
    }

    return list;
  }, [active, familyId, medicines, vaccines, appointments, entries, settings]);

  useEffect(() => {
    void pushSchedule(items, active && familyId ? familyId : null, prefs);
  }, [items, active, familyId, prefs]);

  // keep the worker awake while a tab is open so due items fire on time
  useEffect(() => {
    if (!active) return;
    void checkDueNow();
    const i = setInterval(() => void checkDueNow(), 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void checkDueNow();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(i);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active]);

  /* -------- in-app toast (the OS notification is the worker's job) -------- */
  useEffect(() => {
    if (!active || !settings.medicineReminders) return;
    for (const d of doses) {
      if (d.status !== "due") continue;
      const id = `med-${d.medicine.id}-${d.key.split("-").slice(-1)[0]}-${new Date(d.at).toDateString()}`;
      if (toasted.current.has(d.key)) continue;
      toasted.current.add(d.key);
      toast(`💊 ${d.medicine.name} is due`, {
        description: `${d.medicine.dose} · scheduled ${formatTime(d.at)}`,
        duration: 60_000,
        action: {
          label: "Given",
          onClick: () => {
            logMedicine(d.medicine.id, "given");
            void resolveReminder(id);
            toast.success(`${d.medicine.name} marked given`);
          },
        },
        cancel: {
          label: `Snooze ${settings.snoozeMinutes}m`,
          onClick: () => {
            void snoozeReminder(id, settings.snoozeMinutes * 60_000);
            toasted.current.delete(d.key);
            toast(`Snoozed for ${settings.snoozeMinutes} minutes`);
          },
        },
      });
    }
  }, [doses, now, logMedicine, settings.medicineReminders, settings.snoozeMinutes, active]);

  // vaccines / appointments — gentle in-app notice only, once each
  useEffect(() => {
    if (!active) return;
    if (settings.vaccineReminders) {
      for (const v of vaccines) {
        if (v.doneAt || !v.reminder) continue;
        if (v.dueAt - now > settings.vaccineLeadDays * DAY) continue;
        const key = `vaccine-${v.id}`;
        if (toasted.current.has(key)) continue;
        toasted.current.add(key);
        toast(`🛡️ ${v.name}`, {
          description: v.dueAt < now ? `Missed — was due ${formatDate(v.dueAt)}` : `Due ${formatDate(v.dueAt)}`,
          duration: 20_000,
        });
      }
    }
    if (settings.doctorReminders) {
      for (const a of appointments) {
        if (!a.reminder || a.at < now) continue;
        if (a.at - now > settings.doctorLeadHours * HOUR) continue;
        const key = `visit-${a.id}`;
        if (toasted.current.has(key)) continue;
        toasted.current.add(key);
        toast(`🩺 ${a.doctor}`, {
          description: `${a.hospital} · ${formatDate(a.at)} at ${formatTime(a.at)}`,
          duration: 20_000,
        });
      }
    }
  }, [vaccines, appointments, now, settings, active]);

  return null;
}
