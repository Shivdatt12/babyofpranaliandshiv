import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from "react";
import {
  makeSeed,
  newId,
  startOfToday,
  type Appointment,
  type Baby,
  type Entry,
  type Medicine,
  type Milestone,
  type Parent,
} from "./babybond-data";

type Store = {
  now: number;
  baby: Baby;
  parents: Parent[];
  me: Parent;
  entries: Entry[];
  medicines: Medicine[];
  appointments: Appointment[];
  milestones: Milestone[];
  addEntry: (e: Omit<Entry, "id" | "at" | "by"> & { at?: number }) => void;
  setBaby: (b: Partial<Baby>) => void;
  toggleMedicine: (id: string) => void;
  addMedicine: (m: Omit<Medicine, "id">) => void;
  addAppointment: (a: Omit<Appointment, "id">) => void;
  toggleMilestone: (id: string) => void;
  switchParent: (id: string) => void;
};

const Ctx = createContext<Store | null>(null);

export function BabyBondProvider({ children }: { children: ReactNode }) {
  const [seed] = useState(() => makeSeed(Date.now()));
  const [now, setNow] = useState(() => Date.now());
  const [baby, setBabyState] = useState<Baby>(seed.baby);
  const [entries, setEntries] = useState<Entry[]>(seed.entries);
  const [medicines, setMedicines] = useState<Medicine[]>(seed.medicines);
  const [appointments, setAppointments] = useState<Appointment[]>(seed.appointments);
  const [milestones, setMilestones] = useState<Milestone[]>(seed.milestones);
  const [meId, setMeId] = useState("m");

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const value = useMemo<Store>(() => {
    const me = (seed.parents.find((p) => p.id === meId) ?? seed.parents[0]) as Parent;
    return {
      now,
      baby,
      parents: seed.parents,
      me,
      entries: [...entries].sort((a, b) => b.at - a.at),
      medicines,
      appointments: [...appointments].sort((a, b) => a.at - b.at),
      milestones,
      addEntry: (e) =>
        setEntries((prev) => [
          { ...(e as Entry), id: newId(), at: e.at ?? Date.now(), by: me.role },
          ...prev,
        ]),
      setBaby: (b) => setBabyState((prev) => ({ ...prev, ...b })),
      toggleMedicine: (id) =>
        setMedicines((prev) => prev.map((m) => (m.id === id ? { ...m, active: !m.active } : m))),
      addMedicine: (m) => setMedicines((prev) => [...prev, { ...m, id: newId() }]),
      addAppointment: (a) => setAppointments((prev) => [...prev, { ...a, id: newId() }]),
      toggleMilestone: (id) =>
        setMilestones((prev) =>
          prev.map((m) => (m.id === id ? { ...m, achievedAt: m.achievedAt ? null : Date.now() } : m)),
        ),
      switchParent: setMeId,
    };
  }, [now, baby, entries, medicines, appointments, milestones, meId, seed.parents]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBabyBond() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBabyBond must be used inside BabyBondProvider");
  return ctx;
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
