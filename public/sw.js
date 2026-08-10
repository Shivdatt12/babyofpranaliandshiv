/* माझी चिमणी — background reminder worker.
   Shows real OS notifications (with Given / Snooze / Skip actions) even when
   no tab is in the foreground, and accepts Web Push payloads. */

const STORE = "babybond-schedule";
const SCHEDULE_URL = "/__babybond_schedule";

async function readSchedule() {
  try {
    const cache = await caches.open(STORE);
    const res = await cache.match(SCHEDULE_URL);
    return res ? await res.json() : [];
  } catch {
    return [];
  }
}

async function writeSchedule(items) {
  const cache = await caches.open(STORE);
  await cache.put(SCHEDULE_URL, new Response(JSON.stringify(items)));
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "schedule") {
    event.waitUntil(
      (async () => {
        const existing = await readSchedule();
        const shown = new Set(existing.filter((i) => i.shown).map((i) => i.id));
        const merged = (data.items || []).map((i) => ({ ...i, shown: shown.has(i.id) }));
        await writeSchedule(merged);
        await fireDue();
      })(),
    );
  }
  if (data.type === "check") event.waitUntil(fireDue());
});

async function fireDue() {
  const items = await readSchedule();
  const now = Date.now();
  let changed = false;
  for (const item of items) {
    if (item.shown || item.at > now || item.at < now - 6 * 3600000) continue;
    await self.registration.showNotification(item.title, {
      body: item.body,
      tag: item.id,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: item,
      requireInteraction: true,
      actions: item.actions || [],
    });
    item.shown = true;
    changed = true;
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
    self.registration.showNotification(payload.title || "माझी चिमणी", {
      body: payload.body || "",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data: payload,
      requireInteraction: true,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const message = { type: "reminder-action", action: event.action, data: event.notification.data };
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (clients.length) {
        clients[0].postMessage(message);
        if ("focus" in clients[0]) await clients[0].focus();
        return;
      }
      const win = await self.clients.openWindow("/");
      if (win) setTimeout(() => win.postMessage(message), 1500);
    })(),
  );
});
