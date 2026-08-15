/* माझी चिमणी — background reminder worker.
   Shows real OS notifications (with Given / Snooze / Skip actions) even when
   no tab is in the foreground, and accepts Web Push payloads.

   Lifecycle per occurrence:
     first notification  -> lead minutes before the due time
     swipe / dismiss     -> exactly ONE automatic follow-up after snoozeMs
     second dismiss      -> stop (status stays pending)
     Given / Skip        -> resolved, no further reminders
     Snooze              -> one reminder after snoozeMs (does not count as a follow-up) */

const STORE = "babybond-schedule";
const SCHEDULE_URL = "/__babybond_schedule";
const SESSION_URL = "/__babybond_session";
const PREFS_URL = "/__babybond_prefs";

const DEFAULT_PREFS = { snoozeMs: 600000, silent: false, vibrate: true };

async function readJson(url, fallback) {
  try {
    const cache = await caches.open(STORE);
    const res = await cache.match(url);
    return res ? await res.json() : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(url, value) {
  const cache = await caches.open(STORE);
  await cache.put(url, new Response(JSON.stringify(value)));
}

const readSchedule = () => readJson(SCHEDULE_URL, []);
const writeSchedule = (items) => writeJson(SCHEDULE_URL, items);
const readPrefs = async () => ({ ...DEFAULT_PREFS, ...(await readJson(PREFS_URL, {})) });
const writePrefs = (p) => writeJson(PREFS_URL, p);
const readSession = async () => (await readJson(SESSION_URL, { session: null })).session ?? null;
const writeSession = (session) => writeJson(SESSION_URL, { session });

async function clearAll() {
  await writeSchedule([]);
  await writeSession(null);
  const shown = await self.registration.getNotifications();
  for (const n of shown) n.close();
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "clear") {
    event.waitUntil(clearAll());
    return;
  }
  if (data.type === "prefs") {
    event.waitUntil(writePrefs({ ...DEFAULT_PREFS, ...(data.prefs || {}) }));
    return;
  }
  if (data.type === "schedule") {
    event.waitUntil(
      (async () => {
        // a new session owns the schedule: drop anything from a previous family
        const prev = await readSession();
        if (prev !== (data.session ?? null)) await clearAll();
        if (!data.session) return; // signed out — nothing may be scheduled
        await writeSession(data.session);
        if (data.prefs) await writePrefs({ ...DEFAULT_PREFS, ...data.prefs });

        const existing = await readSchedule();
        const byId = new Map(existing.map((i) => [i.id, i]));
        const merged = (data.items || [])
          .filter((i) => i.familyId === data.session)
          .map((incoming) => {
            const old = byId.get(incoming.id);
            if (!old) return { ...incoming, shown: false, followUps: 0, resolved: false };
            // never rewind a snoozed / followed-up occurrence back to its first slot
            return {
              ...incoming,
              at: old.overrideAt ?? incoming.at,
              overrideAt: old.overrideAt,
              shown: old.shown,
              followUps: old.followUps ?? 0,
              resolved: old.resolved ?? false,
            };
          });
        // keep resolved/snoozed occurrences the client no longer sends, so they
        // cannot be re-created as a fresh reminder
        for (const old of existing) {
          if (!merged.some((m) => m.id === old.id) && (old.resolved || old.overrideAt)) merged.push(old);
        }
        await writeSchedule(merged);
        await fireDue();
      })(),
    );
    return;
  }
  if (data.type === "resolve") {
    event.waitUntil(resolveItem(data.id));
    return;
  }
  if (data.type === "snooze") {
    event.waitUntil(snoozeItem(data.id, data.ms));
    return;
  }
  if (data.type === "check") event.waitUntil(fireDue());
});

async function patchItem(id, patch) {
  const items = await readSchedule();
  const next = items.map((i) => (i.id === id ? { ...i, ...patch } : i));
  await writeSchedule(next);
  return next.find((i) => i.id === id) ?? null;
}

async function resolveItem(id) {
  await patchItem(id, { resolved: true, shown: true });
  const shown = await self.registration.getNotifications({ tag: id });
  for (const n of shown) n.close();
}

async function snoozeItem(id, ms) {
  const prefs = await readPrefs();
  const at = Date.now() + (ms || prefs.snoozeMs);
  await patchItem(id, { at, overrideAt: at, shown: false });
}

async function fireDue() {
  const session = await readSession();
  if (!session) return; // signed out: never fire
  const prefs = await readPrefs();
  const items = await readSchedule();
  const now = Date.now();
  let changed = false;

  for (const item of items) {
    if (item.familyId !== session) continue;
    if (item.resolved || item.shown) continue;
    if (item.at > now || item.at < now - 6 * 3600000) continue;

    // one visible notification per occurrence — never stack duplicates
    const already = await self.registration.getNotifications({ tag: item.id });
    if (already.length) {
      item.shown = true;
      changed = true;
      continue;
    }

    const actions = item.actions || [];
    try {
      await self.registration.showNotification(item.title, {
        body: item.body,
        tag: item.id,
        renotify: true,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: item,
        silent: !!prefs.silent,
        vibrate: prefs.vibrate ? [200, 100, 200] : [],
        // only actionable reminders stay on screen; plain ones auto-dismiss
        requireInteraction: actions.length > 0,
        actions,
      });
      item.shown = true;
      changed = true;
    } catch {
      /* permission revoked or unsupported — try again on the next check */
    }
  }

  const kept = items.filter((i) => i.at > now - 24 * 3600000);
  if (changed || kept.length !== items.length) await writeSchedule(kept);
}

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "babybond-reminders") event.waitUntil(fireDue());
});
self.addEventListener("sync", (event) => {
  if (event.tag === "babybond-reminders") event.waitUntil(fireDue());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "माझी चिमणी", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    (async () => {
      const prefs = await readPrefs();
      await self.registration.showNotification(payload.title || "माझी चिमणी", {
        body: payload.body || "",
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        data: payload,
        silent: !!prefs.silent,
        vibrate: prefs.vibrate ? [200, 100, 200] : [],
        requireInteraction: false,
      });
    })(),
  );
});

async function tellClients(message) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  if (clients.length) {
    for (const c of clients) c.postMessage(message);
    return clients[0];
  }
  return null;
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const item = event.notification.data || {};
  const action = event.action;
  const message = { type: "reminder-action", action, data: item };

  event.waitUntil(
    (async () => {
      const prefs = await readPrefs();
      if (action === "snooze") {
        await snoozeItem(item.id, prefs.snoozeMs);
      } else if (action === "given" || action === "skip") {
        await resolveItem(item.id);
      } else {
        // body tap — treat as handled by the user opening the app
        await resolveItem(item.id);
      }
      const client = await tellClients(message);
      if (client && "focus" in client) {
        await client.focus();
        return;
      }
      if (!client) {
        const win = await self.clients.openWindow("/");
        if (win) setTimeout(() => win.postMessage(message), 1500);
      }
    })(),
  );
});

/* Swipe / dismiss: never changes status, schedules exactly ONE follow-up. */
self.addEventListener("notificationclose", (event) => {
  const item = event.notification.data || {};
  if (!item.id) return;
  event.waitUntil(
    (async () => {
      const prefs = await readPrefs();
      const items = await readSchedule();
      const current = items.find((i) => i.id === item.id);
      if (!current || current.resolved) return;
      if ((current.followUps ?? 0) >= 1) {
        // second dismissal — stop reminding, keep the dose pending
        await patchItem(item.id, { resolved: true, shown: true });
        return;
      }
      const at = Date.now() + prefs.snoozeMs;
      await patchItem(item.id, { followUps: (current.followUps ?? 0) + 1, at, overrideAt: at, shown: false });
      await tellClients({ type: "reminder-dismissed", data: current });
    })(),
  );
});
