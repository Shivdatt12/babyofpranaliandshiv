/** Service-worker backed reminders: real OS notifications with action buttons,
 *  delivered even when no tab is in the foreground (where the browser allows it). */

export type ReminderKind = "medicine" | "feed" | "vaccine" | "doctor";

export type ScheduledReminder = {
  id: string;
  /** when the first notification fires (already lead-adjusted) */
  at: number;
  /** the real event time, used for copy */
  dueAt?: number;
  title: string;
  body: string;
  kind: ReminderKind;
  /** family the reminder belongs to — never fires for another/signed-out session */
  familyId: string;
  medicineId?: string;
  doseKey?: string;
  actions?: { action: string; title: string }[];
};

export type NotificationPrefs = { snoozeMs: number; silent: boolean; vibrate: boolean };

let registration: ServiceWorkerRegistration | null = null;

export async function registerReminderWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  if (registration) return registration;
  try {
    registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    return registration;
  } catch {
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

/** Ask the browser to wake the worker periodically so reminders fire with the app closed. */
export async function enableBackgroundChecks() {
  const reg = await registerReminderWorker();
  if (!reg) return false;
  const periodic = (reg as ServiceWorkerRegistration & {
    periodicSync?: { register: (tag: string, o: { minInterval: number }) => Promise<void> };
  }).periodicSync;
  if (!periodic) return false;
  try {
    await periodic.register("babybond-reminders", { minInterval: 15 * 60 * 1000 });
    return true;
  } catch {
    return false;
  }
}

async function post(message: Record<string, unknown>) {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const reg = await registerReminderWorker();
  const target = reg?.active ?? navigator.serviceWorker?.controller;
  target?.postMessage(message);
}

export async function pushSchedule(
  items: ScheduledReminder[],
  familyId: string | null,
  prefs?: NotificationPrefs,
) {
  await post({ type: "schedule", items, session: familyId, prefs });
}

export async function pushPrefs(prefs: NotificationPrefs) {
  await post({ type: "prefs", prefs });
}

/** Nudge the worker to fire anything that became due while the app was open. */
export async function checkDueNow() {
  await post({ type: "check" });
}

/** Given / Skip handled inside the app: stop the occurrence in the worker too. */
export async function resolveReminder(id: string) {
  await post({ type: "resolve", id });
}

export async function snoozeReminder(id: string, ms: number) {
  await post({ type: "snooze", id, ms });
}

/** Sign-out / session change: stop every scheduled reminder and dismiss visible ones. */
export async function clearAllReminders() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const target = reg?.active ?? navigator.serviceWorker.controller;
    target?.postMessage({ type: "clear" });
    if (reg) {
      const shown = await reg.getNotifications();
      for (const n of shown) n.close();
      const sub = await reg.pushManager?.getSubscription?.();
      await sub?.unsubscribe().catch(() => undefined);
    }
  } catch {
    /* ignore */
  }
}

/** Immediate notification through the worker so it survives a backgrounded tab. */
export async function notifyNow(
  id: string,
  title: string,
  body: string,
  options?: {
    actions?: { action: string; title: string }[];
    data?: Record<string, unknown>;
    prefs?: NotificationPrefs;
  },
) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return false;
  const reg = await registerReminderWorker();
  const actions = options?.actions ?? [];
  const prefs = options?.prefs;
  if (reg) {
    await reg.showNotification(title, {
      body,
      tag: id,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      requireInteraction: actions.length > 0,
      silent: prefs ? prefs.silent : false,
      vibrate: prefs && !prefs.vibrate ? [] : [200, 100, 200],
      data: { id, ...(options?.data ?? {}) },
      ...(actions.length ? { actions } : {}),
    } as NotificationOptions);
    return true;
  }
  try {
    new Notification(title, { body, tag: id });
    return true;
  } catch {
    return false;
  }
}
