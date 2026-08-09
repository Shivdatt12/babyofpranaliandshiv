import { createContext, useContext, useMemo, useState, useEffect, useRef, type ReactNode } from "react";
import {
  makeSeed,
  newId,
  startOfToday,
  todayOccurrence,
  isMedicineActiveOn,
  type Appointment,
  type Baby,
  type Entry,
  type Medicine,
  type Milestone,
  type Parent,
  type Vaccine,
  type Settings,
  DEFAULT_SETTINGS,
} from "./babybond-data";

type Snapshot = {
  baby: Baby;
  entries: Entry[];
  medicines: Medicine[];
  appointments: Appointment[];
  vaccines: Vaccine[];
  milestones: Milestone[];
  meId: string;
  parents?: Parent[];
  settings?: Settings;
};

type Store = {
  now: number;
  baby: Baby;
  parents: Parent[];
  me: Parent;
  entries: Entry[];
  medicines: Medicine[];
  appointments: Appointment[];
  vaccines: Vaccine[];
  milestones: Milestone[];
  online: boolean;
  lastSyncedAt: number;
  addEntry: (e: Omit<Entry, "id" | "at" | "by"> & { at?: number }) => void;
  setBaby: (b: Partial<Baby>) => void;
  toggleMedicine: (id: string) => void;
  addMedicine: (m: Omit<Medicine, "id">) => void;
  updateMedicine: (id: string, m: Partial<Medicine>) => void;
  deleteMedicine: (id: string) => void;
  logMedicine: (id: string, status: "given" | "skipped", at?: number) => void;
  addAppointment: (a: Omit<Appointment, "id">) => void;
  updateAppointment: (id: string, a: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  addVaccine: (v: Omit<Vaccine, "id">) => void;
  updateVaccine: (id: string, v: Partial<Vaccine>) => void;
  deleteVaccine: (id: string) => void;
  completeVaccine: (id: string, at?: number) => void;
  toggleMilestone: (id: string) => void;
  switchParent: (id: string) => void;
  updateParent: (id: string, p: Partial<Parent>) => void;
  settings: Settings;
  updateSettings: (s: Partial<Settings>) => void;
  exportData: () => string;
  importData: (json: string) => boolean;
  resetData: () => void;
};

const Ctx = createContext<Store | null>(null);

const STORAGE_KEY = "babybond:v2";
const CHANNEL = "babybond-sync";

function loadSnapshot(): Snapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Snapshot) : null;
  } catch {
    return null;
  }
}

export function BabyBondProvider({ children }: { children: ReactNode }) {
  const [seed] = useState(() => makeSeed(Date.now()));
  const [now, setNow] = useState(() => Date.now());
  const [baby, setBabyState] = useState<Baby>(seed.baby);
  const [entries, setEntries] = useState<Entry[]>(seed.entries);
  const [medicines, setMedicines] = useState<Medicine[]>(seed.medicines);
  const [appointments, setAppointments] = useState<Appointment[]>(seed.appointments);
  const [vaccines, setVaccines] = useState<Vaccine[]>(seed.vaccines);
  const [milestones, setMilestones] = useState<Milestone[]>(seed.milestones);
  const [meId, setMeId] = useState("m");
  const [parents, setParents] = useState<Parent[]>(seed.parents);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [online, setOnline] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState(() => Date.now());
  const applyingRemote = useRef(false);

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const applySnapshot = (s: Snapshot) => {
    applyingRemote.current = true;
    setBabyState(s.baby);
    setEntries(s.entries);
    setMedicines(s.medicines);
    setAppointments(s.appointments);
    setVaccines(s.vaccines ?? []);
    setMilestones(s.milestones);
    if (s.parents) setParents(s.parents);
    if (s.settings) setSettings({ ...DEFAULT_SETTINGS, ...s.settings });
    setLastSyncedAt(Date.now());
  };

  // hydrate from the offline cache
  useEffect(() => {
    const saved = loadSnapshot();
    if (saved) applySnapshot(saved);
    setHydrated(true);
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // live sync between devices/tabs sharing this family account
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = (ev) => {
      if (ev.data?.type === "snapshot") applySnapshot(ev.data.payload as Snapshot);
    };
    return () => ch.close();
  }, []);

  // persist + broadcast
  useEffect(() => {
    if (!hydrated) return;
    const snapshot: Snapshot = { baby, entries, medicines, appointments, vaccines, milestones, meId, parents, settings };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      /* quota — keep working from memory */
    }
    if (applyingRemote.current) {
      applyingRemote.current = false;
      return;
    }
    setLastSyncedAt(Date.now());
    if (typeof BroadcastChannel !== "undefined") {
      const ch = new BroadcastChannel(CHANNEL);
      ch.postMessage({ type: "snapshot", payload: snapshot });
      ch.close();
    }
  }, [hydrated, baby, entries, medicines, appointments, vaccines, milestones, meId, parents, settings]);

  const value = useMemo<Store>(() => {
    const me = (parents.find((p) => p.id === meId) ?? parents[0]) as Parent;
    const push = (e: Entry) => setEntries((prev) => [e, ...prev]);
    return {
      now,
      baby,
      parents,
      me,
      entries: [...entries].sort((a, b) => b.at - a.at),
      medicines,
      appointments: [...appointments].sort((a, b) => a.at - b.at),
      vaccines: [...vaccines].sort((a, b) => a.dueAt - b.dueAt),
      milestones,
      online,
      lastSyncedAt,
      addEntry: (e) => push({ ...(e as Entry), id: newId(), at: e.at ?? Date.now(), by: me.role }),
      setBaby: (b) => setBabyState((prev) => ({ ...prev, ...b })),
      toggleMedicine: (id) =>
        setMedicines((prev) => prev.map((m) => (m.id === id ? { ...m, active: !m.active } : m))),
      addMedicine: (m) => setMedicines((prev) => [...prev, { ...m, id: newId() }]),
      updateMedicine: (id, patch) =>
        setMedicines((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m))),
      deleteMedicine: (id) => setMedicines((prev) => prev.filter((m) => m.id !== id)),
      logMedicine: (id, status, at) => {
        const m = medicines.find((x) => x.id === id);
        if (!m) return;
        push({
          id: newId(),
          type: "medicine",
          at: at ?? Date.now(),
          name: m.name,
          dose: m.dose,
          medicineId: m.id,
          status,
          by: me.role,
        });
      },
      addAppointment: (a) => setAppointments((prev) => [...prev, { ...a, id: newId() }]),
      updateAppointment: (id, patch) =>
        setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a))),
      deleteAppointment: (id) => setAppointments((prev) => prev.filter((a) => a.id !== id)),
      addVaccine: (v) => setVaccines((prev) => [...prev, { ...v, id: newId() }]),
      updateVaccine: (id, patch) =>
        setVaccines((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v))),
      deleteVaccine: (id) => setVaccines((prev) => prev.filter((v) => v.id !== id)),
      completeVaccine: (id, at) => {
        const v = vaccines.find((x) => x.id === id);
        if (!v) return;
        const when = at ?? Date.now();
        setVaccines((prev) => prev.map((x) => (x.id === id ? { ...x, doneAt: x.doneAt ? null : when } : x)));
        if (!v.doneAt) {
          push({ id: newId(), type: "vaccine", at: when, name: v.name, by: me.role, ...(v.doctorNote ? { note: v.doctorNote } : {}) });
        }
      },
      toggleMilestone: (id) =>
        setMilestones((prev) =>
          prev.map((m) => (m.id === id ? { ...m, achievedAt: m.achievedAt ? null : Date.now() } : m)),
        ),
      switchParent: setMeId,
      updateParent: (id, patch) => setParents((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p))),
      settings,
      updateSettings: (patch) => setSettings((prev) => ({ ...prev, ...patch })),
      exportData: () =>
        JSON.stringify({ baby, entries, medicines, appointments, vaccines, milestones, meId, parents, settings }, null, 2),
      importData: (json) => {
        try {
          const parsed = JSON.parse(json) as Snapshot;
          if (!parsed || !parsed.baby || !Array.isArray(parsed.entries)) return false;
          applySnapshot(parsed);
          return true;
        } catch {
          return false;
        }
      },
      resetData: () => {
        const fresh = makeSeed(Date.now());
        applySnapshot({ ...fresh, meId, settings: DEFAULT_SETTINGS });
      },
    };
  }, [now, baby, entries, medicines, appointments, vaccines, milestones, meId, parents, settings, online, lastSyncedAt]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBabyBond() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBabyBond must be used inside BabyBondProvider");
  return ctx;
}

export type MedicineDose = {
  key: string;
  medicine: Medicine;
  at: number;
  status: "given" | "skipped" | "due" | "upcoming";
  loggedBy?: string;
  loggedAt?: number;
};

/** Every scheduled dose for today, merged with what has already been logged. */
export function useTodayDoses(): MedicineDose[] {
  const { medicines, entries, now } = useBabyBond();
  return useMemo(() => {
    const from = startOfToday(now);
    const logs = entries.filter(
      (e): e is Extract<Entry, { type: "medicine" }> => e.type === "medicine" && e.at >= from,
    );
    const used = new Set<string>();
    const doses: MedicineDose[] = [];

    for (const m of medicines) {
      if (!isMedicineActiveOn(m, now)) continue;
      const times = m.times.length ? m.times : [m.time];
      for (const t of times) {
        const at = todayOccurrence(t, now);
        const log = logs.find((l) => l.medicineId === m.id && !used.has(l.id));
        if (log) used.add(log.id);
        doses.push({
          key: `${m.id}-${t}`,
          medicine: m,
          at,
          status: log ? (log.status ?? "given") : at <= now ? "due" : "upcoming",
          ...(log ? { loggedBy: log.by, loggedAt: log.at } : {}),
        });
      }
    }
    return doses.sort((a, b) => a.at - b.at);
  }, [medicines, entries, now]);
}

export function useTodayStats() {
  const { entries, now, baby } = useBabyBond();
  return useMemo(() => {
    const from = startOfToday(now);
    const today = entries.filter((e) => e.at >= from);
    const breast = today.filter((e) => e.type === "breast");
    const formula = today.filter((e) => e.type === "formula") as Extract<Entry, { type: "formula" }>[];
    const sleep = today.filter((e) => e.type === "sleep") as Extract<Entry, { type: "sleep" }>[];
    const weights = entries.filter((e) => e.type === "weight") as Extract<Entry, { type: "weight" }>[];
    const bili = entries.filter((e) => e.type === "bilirubin") as Extract<Entry, { type: "bilirubin" }>[];
    const feeds = entries.filter((e) => e.type === "breast" || e.type === "formula");
    const lastFeed = feeds[0] ?? null;

    const formulaMl = formula.reduce((s, e) => s + e.ml, 0);
    const breastMinutes = (breast as Extract<Entry, { type: "breast" }>[]).reduce((s, e) => s + e.minutes, 0);

    return {
      breastCount: breast.length,
      breastMinutes,
      formulaMl,
      milkMl: formulaMl + breastMinutes * 8,
      peeCount: today.filter((e) => e.type === "pee").length,
      pottyCount: today.filter((e) => e.type === "potty").length,
      sleepMinutes: sleep.reduce((s, e) => s + e.minutes, 0),
      weight: weights[0] ?? null,
      prevWeight: weights[1] ?? null,
      bilirubin: bili[0] ?? null,
      lastFeed,
      nextFeedAt: lastFeed ? lastFeed.at + 3 * 3600_000 : now,
      ageDays: Math.max(0, Math.floor((now - baby.bornAt) / 86400000)),
    };
  }, [entries, now, baby.bornAt]);
}
