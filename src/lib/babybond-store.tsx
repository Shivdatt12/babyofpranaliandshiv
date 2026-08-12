import { createContext, useContext, useMemo, useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  startOfToday,
  todayOccurrence,
  isMedicineActiveOn,
  defaultMilestones,
  EMPTY_BABY,
  type Appointment,
  type Baby,
  type Entry,
  type Medicine,
  type Milestone,
  type Parent,
  type Vaccine,
  type Settings,
  DEFAULT_SETTINGS,
  normalizeRole,
  roleEmoji,
} from "./babybond-data";
import {
  asUuid,
  docToRow,
  entryToRow,
  flushQueue,
  loadFamilyData,
  pushOp,
  readQueue,
  writeQueue,
  uuid,
  timerToRow,
  type DocTable,
  type ActiveTimer,
  type TimerKind,
} from "./babybond-cloud";
import { clearAllReminders } from "./babybond-push";

type Snapshot = {
  baby: Baby | null;
  entries: Entry[];
  medicines: Medicine[];
  appointments: Appointment[];
  vaccines: Vaccine[];
  milestones: Milestone[];
  meId: string;
  parents?: Parent[];
  settings?: Settings;
  timers?: ActiveTimer[];
};

type Store = {
  now: number;
  /** never demo data — EMPTY_BABY until the family creates a profile */
  baby: Baby;
  hasBaby: boolean;
  /** auth + first family load finished */
  ready: boolean;
  loading: boolean;
  parents: Parent[];
  me: Parent;
  entries: Entry[];
  medicines: Medicine[];
  appointments: Appointment[];
  vaccines: Vaccine[];
  milestones: Milestone[];
  /** live breastfeed / sleep sessions shared by the whole family */
  timers: ActiveTimer[];
  online: boolean;
  lastSyncedAt: number;
  /* cloud account */
  authed: boolean;
  authEmail: string | null;
  familyId: string | null;
  inviteCode: string | null;
  pendingCount: number;
  joinFamily: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
  createBaby: (b: Baby) => Promise<void>;
  addEntry: (e: Omit<Entry, "id" | "at" | "by"> & { at?: number }) => void;
  updateEntry: (id: string, patch: Partial<Entry>) => void;
  deleteEntry: (id: string) => void;
  startTimer: (kind: TimerKind, extra?: { side?: string; note?: string }) => void;
  updateTimer: (kind: TimerKind, extra: { side?: string; note?: string }) => void;
  stopTimer: (kind: TimerKind) => void;
  cancelTimer: (kind: TimerKind) => void;
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

/** Per-family offline cache. Nothing is cached outside a signed-in family. */
const cacheKey = (familyId: string) => `babybond:cache:${familyId}`;
const CHANNEL = "babybond-sync";
const LEGACY_KEYS = ["babybond:v1", "babybond:v2"];

function loadCache(familyId: string): Snapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(familyId));
    return raw ? (JSON.parse(raw) as Snapshot) : null;
  } catch {
    return null;
  }
}

function clearAllLocalData() {
  if (typeof window === "undefined") return;
  try {
    for (const k of Object.keys(window.localStorage)) {
      if (k.startsWith("babybond:")) window.localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
  writeQueue([]);
}

export function BabyBondProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(() => Date.now());
  const [baby, setBabyState] = useState<Baby | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [timers, setTimers] = useState<ActiveTimer[]>([]);
  const [meId, setMeId] = useState("");
  const [parents, setParents] = useState<Parent[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [online, setOnline] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState(() => Date.now());
  const applyingRemote = useRef(false);

  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [dataLoaded, setDataLoaded] = useState(false);

  const familyRef = useRef<string | null>(null);
  familyRef.current = familyId;
  const userRef = useRef<string | null>(null);
  userRef.current = session?.user.id ?? null;

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const clearMemory = useCallback(() => {
    applyingRemote.current = true;
    setBabyState(null);
    setEntries([]);
    setMedicines([]);
    setAppointments([]);
    setVaccines([]);
    setMilestones([]);
    setTimers([]);
    setParents([]);
    setSettings(DEFAULT_SETTINGS);
    setDataLoaded(false);
  }, []);

  const applySnapshot = useCallback((s: Snapshot) => {
    applyingRemote.current = true;
    setBabyState(s.baby ?? null);
    setEntries(s.entries ?? []);
    setMedicines(s.medicines ?? []);
    setAppointments(s.appointments ?? []);
    setVaccines(s.vaccines ?? []);
    setMilestones(s.milestones ?? []);
    setTimers(s.timers ?? []);
    if (s.parents) setParents(s.parents);
    if (s.settings) setSettings({ ...DEFAULT_SETTINGS, ...s.settings });
    setLastSyncedAt(Date.now());
  }, []);

  // network state only — no local demo hydration
  useEffect(() => {
    for (const k of LEGACY_KEYS) {
      try {
        window.localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    }
    setOnline(navigator.onLine);
    setPendingCount(readQueue().length);
    const on = () => {
      setOnline(true);
      void flushQueue().then(() => setPendingCount(readQueue().length));
    };
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  /* ---------------- auth ---------------- */
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setAuthReady(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // make sure the signed-in parent has a profile and a family
  useEffect(() => {
    if (!session) {
      setFamilyId(null);
      setInviteCode(null);
      clearMemory();
      void clearAllReminders();
      return;
    }
    let cancelled = false;
    void (async () => {
      const uid = session.user.id;
      const meta = session.user.user_metadata as { name?: string; role?: string; full_name?: string };
      let { data: profile } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
      if (!profile) {
        const role = normalizeRole(meta.role);
        const insert = await supabase
          .from("profiles")
          .insert({
            id: uid,
            display_name: meta.name || meta.full_name || session.user.email?.split("@")[0] || "Parent",
            role,
            emoji: roleEmoji(role),
          })
          .select("*")
          .maybeSingle();
        profile = insert.data;
      }
      if (!profile || cancelled) return;

      let fid = profile.family_id;
      if (!fid) {
        const fam = await supabase.from("families").insert({ created_by: uid }).select("*").maybeSingle();
        if (!fam.data) return;
        fid = fam.data.id;
        await supabase.from("profiles").update({ family_id: fid }).eq("id", uid);
      }
      if (cancelled || !fid) return;

      const famRow = await supabase.from("families").select("invite_code").eq("id", fid).maybeSingle();
      if (!cancelled) setInviteCode(famRow.data?.invite_code ?? null);
      if (!cancelled) setFamilyId(fid);
    })();
    return () => {
      cancelled = true;
    };
  }, [session, clearMemory]);

  /* ---------------- cloud load + realtime ---------------- */
  const reload = useCallback(async (fid: string) => {
    const cloud = await loadFamilyData(fid);
    const { data: profileRows } = await supabase.from("profiles").select("*").eq("family_id", fid);
    applyingRemote.current = true;
    setBabyState(cloud.baby ?? null);
    setSettings({ ...DEFAULT_SETTINGS, ...(cloud.settings ?? {}) });
    setEntries(cloud.entries);
    setMedicines(cloud.medicines);
    setAppointments(cloud.appointments);
    setVaccines(cloud.vaccines);
    setMilestones(cloud.milestones);
    setTimers(cloud.timers);
    setParents(
      (profileRows ?? []).map((p) => ({
        id: p.id,
        name: p.display_name,
        role: normalizeRole(p.role),
        emoji: p.emoji,
        online: true,
        avatar: (p as { avatar_url?: string | null }).avatar_url ?? null,
      })),
    );
    setLastSyncedAt(Date.now());
    setDataLoaded(true);
  }, []);

  useEffect(() => {
    if (!familyId) return;
    let alive = true;

    // warm start from this family's own cache (never another family's)
    const cached = loadCache(familyId);
    if (cached) applySnapshot(cached);

    void flushQueue().then(() => {
      setPendingCount(readQueue().length);
      if (alive) void reload(familyId).catch(() => setDataLoaded(true));
    });
    if (session?.user.id) setMeId(session.user.id);

    let timer: ReturnType<typeof setTimeout> | undefined;
    const bump = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (alive) void reload(familyId);
      }, 250);
    };

    const channel = supabase.channel(`family-${familyId}`);
    for (const table of [
      "entries",
      "medicines",
      "appointments",
      "vaccines",
      "milestones",
      "babies",
      "family_settings",
      "profiles",
      "active_timers",
    ]) {
      channel.on("postgres_changes", { event: "*", schema: "public", table, filter: `family_id=eq.${familyId}` }, bump);
    }
    channel.subscribe();

    const retry = setInterval(() => {
      if (navigator.onLine) void flushQueue().then(() => setPendingCount(readQueue().length));
    }, 20000);

    return () => {
      alive = false;
      clearTimeout(timer);
      clearInterval(retry);
      void supabase.removeChannel(channel);
    };
  }, [familyId, session?.user.id, reload, applySnapshot]);

  // live sync between tabs on this device — scoped to the same family
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = (ev) => {
      if (ev.data?.type !== "snapshot") return;
      if (!familyId || ev.data.familyId !== familyId) return;
      applySnapshot(ev.data.payload as Snapshot);
    };
    return () => ch.close();
  }, [applySnapshot, familyId]);

  // persist per-family offline cache + broadcast
  useEffect(() => {
    if (!familyId || !dataLoaded) return;
    const snapshot: Snapshot = {
      baby,
      entries,
      medicines,
      appointments,
      vaccines,
      milestones,
      meId,
      parents,
      settings,
      timers,
    };
    try {
      window.localStorage.setItem(cacheKey(familyId), JSON.stringify(snapshot));
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
      ch.postMessage({ type: "snapshot", familyId, payload: snapshot });
      ch.close();
    }
  }, [familyId, dataLoaded, baby, entries, medicines, appointments, vaccines, milestones, meId, parents, settings, timers]);

  const value = useMemo<Store>(() => {
    const me =
      (parents.find((p) => p.id === meId) ?? parents[0]) ??
      ({ id: meId || "me", name: "Parent", role: "Mother", emoji: "👩", online: true } as Parent);

    const fid = familyRef.current;
    const uid = userRef.current;
    const sync = () => {
      if (navigator.onLine) void flushQueue().then(() => setPendingCount(readQueue().length));
      else setPendingCount(readQueue().length);
    };

    const saveEntry = (e: Entry) => {
      if (!fid) return;
      pushOp({ kind: "upsert", table: "entries", row: entryToRow(e, fid, uid) });
      sync();
    };
    const saveDoc = (table: DocTable, doc: { id: string }) => {
      if (!fid) return;
      pushOp({ kind: "upsert", table, row: docToRow(doc, fid, uid) });
      sync();
    };
    const removeDoc = (table: DocTable, id: string) => {
      if (!fid) return;
      pushOp({ kind: "delete", table, id });
      sync();
    };
    const saveBaby = (b: Baby) => {
      if (!fid) return;
      pushOp({ kind: "upsert", table: "babies", row: { family_id: fid, data: b } });
      sync();
    };
    const saveSettings = (s: Settings) => {
      if (!fid) return;
      pushOp({ kind: "upsert", table: "family_settings", row: { family_id: fid, data: s } });
      sync();
    };

    const push = (e: Entry) => {
      setEntries((prev) => [e, ...prev]);
      saveEntry(e);
    };

    const patchDoc = <T extends { id: string }>(
      table: DocTable,
      list: T[],
      setList: (fn: (prev: T[]) => T[]) => void,
      id: string,
      patch: Partial<T>,
    ) => {
      const next = list.map((d) => (d.id === id ? { ...d, ...patch } : d));
      setList(() => next);
      const doc = next.find((d) => d.id === id);
      if (doc) saveDoc(table, doc);
    };

    return {
      now,
      baby: baby ?? EMPTY_BABY,
      hasBaby: !!baby && !!baby.name,
      ready: authReady && (!session || dataLoaded),
      loading: !authReady || (!!session && !dataLoaded),
      parents,
      me,
      entries: [...entries].sort((a, b) => b.at - a.at),
      medicines,
      appointments: [...appointments].sort((a, b) => a.at - b.at),
      vaccines: [...vaccines].sort((a, b) => a.dueAt - b.dueAt),
      milestones,
      timers,
      online,
      lastSyncedAt,
      authed: !!session,
      authEmail: session?.user.email ?? null,
      familyId,
      inviteCode,
      pendingCount,
      joinFamily: async (code) => {
        const { data, error } = await supabase.rpc("join_family_by_code", { _code: code });
        if (error) throw error;
        clearMemory();
        setFamilyId(data as string);
      },
      signOut: async () => {
        // stop every reminder belonging to this session before the session goes away
        await clearAllReminders();
        setFamilyId(null);
        setInviteCode(null);
        setMeId("");
        clearMemory();
        clearAllLocalData();
        setPendingCount(0);
        await supabase.auth.signOut();
      },
      createBaby: async (b) => {
        if (!fid) return;
        setBabyState(b);
        setDataLoaded(true);
        await supabase.from("babies").upsert({ family_id: fid, data: b }, { onConflict: "family_id" });
        if (!milestones.length) {
          const seeded = defaultMilestones();
          setMilestones(seeded);
          await supabase.from("milestones").upsert(
            seeded.map((m) => docToRow(m, fid, uid)),
            { onConflict: "id" },
          );
        }
        if (b.birthWeightGrams) {
          const entry: Entry = {
            id: uuid(),
            type: "weight",
            at: b.bornAt,
            grams: b.birthWeightGrams,
            note: "Birth weight",
            by: me.role,
          };
          setEntries((prev) => [entry, ...prev]);
          saveEntry(entry);
        }
      },
      addEntry: (e) => push({ ...(e as Entry), id: uuid(), at: e.at ?? Date.now(), by: me.role }),
      updateEntry: (id, patch) => {
        const next = entries.map((x) => (x.id === id ? ({ ...x, ...patch } as Entry) : x));
        setEntries(next);
        const doc = next.find((x) => x.id === id);
        if (doc) saveEntry(doc);
      },
      deleteEntry: (id) => {
        setEntries((prev) => prev.filter((x) => x.id !== id));
        if (!fid) return;
        pushOp({ kind: "delete", table: "entries", id });
        sync();
      },
      startTimer: (kind, extra) => {
        if (!fid) return;
        if (timers.some((t) => t.kind === kind)) return; // one active session per kind, per family
        const timer: ActiveTimer = { kind, startedAt: Date.now(), by: me.role, ...(extra ?? {}) };
        setTimers((prev) => [...prev.filter((t) => t.kind !== kind), timer]);
        pushOp({ kind: "upsert", table: "active_timers", row: timerToRow(timer, fid, uid) });
        sync();
      },
      updateTimer: (kind, extra) => {
        if (!fid) return;
        const current = timers.find((t) => t.kind === kind);
        if (!current) return;
        const timer: ActiveTimer = { ...current, ...extra };
        setTimers((prev) => prev.map((t) => (t.kind === kind ? timer : t)));
        pushOp({ kind: "upsert", table: "active_timers", row: timerToRow(timer, fid, uid) });
        sync();
      },
      stopTimer: (kind) => {
        if (!fid) return;
        const current = timers.find((t) => t.kind === kind);
        if (!current) return;
        const endedAt = Date.now();
        const minutes = Math.max(1, Math.round((endedAt - current.startedAt) / 60000));
        setTimers((prev) => prev.filter((t) => t.kind !== kind));
        pushOp({ kind: "deleteTimer", table: "active_timers", familyId: fid, timerKind: kind });
        const base = { id: uuid(), at: endedAt, startedAt: current.startedAt, endedAt, minutes, by: me.role };
        const entry = (
          kind === "breast"
            ? { ...base, type: "breast", side: (current.side ?? "both") as never, ...(current.note ? { note: current.note } : {}) }
            : { ...base, type: "sleep", ...(current.note ? { note: current.note } : {}) }
        ) as Entry;
        push(entry);
      },
      cancelTimer: (kind) => {
        if (!fid) return;
        setTimers((prev) => prev.filter((t) => t.kind !== kind));
        pushOp({ kind: "deleteTimer", table: "active_timers", familyId: fid, timerKind: kind });
        sync();
      },
      setBaby: (b) => {
        const next = { ...(baby ?? EMPTY_BABY), ...b };
        setBabyState(next);
        saveBaby(next);
      },
      toggleMedicine: (id) => {
        const m = medicines.find((x) => x.id === id);
        if (m) patchDoc("medicines", medicines, setMedicines, id, { active: !m.active });
      },
      addMedicine: (m) => {
        const doc = { ...m, id: uuid() };
        setMedicines((prev) => [...prev, doc]);
        saveDoc("medicines", doc);
      },
      updateMedicine: (id, patch) => patchDoc("medicines", medicines, setMedicines, id, patch),
      deleteMedicine: (id) => {
        setMedicines((prev) => prev.filter((m) => m.id !== id));
        removeDoc("medicines", id);
      },
      logMedicine: (id, status, at) => {
        const m = medicines.find((x) => x.id === id);
        if (!m) return;
        push({
          id: uuid(),
          type: "medicine",
          at: at ?? Date.now(),
          name: m.name,
          dose: m.dose,
          medicineId: m.id,
          status,
          by: me.role,
        });
      },
      addAppointment: (a) => {
        const doc = { ...a, id: uuid() };
        setAppointments((prev) => [...prev, doc]);
        saveDoc("appointments", doc);
      },
      updateAppointment: (id, patch) => patchDoc("appointments", appointments, setAppointments, id, patch),
      deleteAppointment: (id) => {
        setAppointments((prev) => prev.filter((a) => a.id !== id));
        removeDoc("appointments", id);
      },
      addVaccine: (v) => {
        const doc = { ...v, id: uuid() };
        setVaccines((prev) => [...prev, doc]);
        saveDoc("vaccines", doc);
      },
      updateVaccine: (id, patch) => patchDoc("vaccines", vaccines, setVaccines, id, patch),
      deleteVaccine: (id) => {
        setVaccines((prev) => prev.filter((v) => v.id !== id));
        removeDoc("vaccines", id);
      },
      completeVaccine: (id, at) => {
        const v = vaccines.find((x) => x.id === id);
        if (!v) return;
        const when = at ?? Date.now();
        patchDoc("vaccines", vaccines, setVaccines, id, { doneAt: v.doneAt ? null : when });
        if (!v.doneAt) {
          push({
            id: uuid(),
            type: "vaccine",
            at: when,
            name: v.name,
            by: me.role,
            ...(v.doctorNote ? { note: v.doctorNote } : {}),
          });
        }
      },
      toggleMilestone: (id) => {
        const m = milestones.find((x) => x.id === id);
        if (m) patchDoc("milestones", milestones, setMilestones, id, { achievedAt: m.achievedAt ? null : Date.now() });
      },
      switchParent: (id) => {
        if (session) return; // signed in — you are always yourself
        setMeId(id);
      },
      updateParent: (id, patch) => {
        setParents((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
        if (session && id === session.user.id) {
          void supabase
            .from("profiles")
            .update({
              ...(patch.name !== undefined ? { display_name: patch.name } : {}),
              ...(patch.role !== undefined ? { role: patch.role } : {}),
              ...(patch.emoji !== undefined ? { emoji: patch.emoji } : {}),
              ...(patch.avatar !== undefined ? { avatar_url: patch.avatar } : {}),
            })
            .eq("id", id);
        }
      },
      settings,
      updateSettings: (patch) => {
        const next = { ...settings, ...patch };
        setSettings(next);
        saveSettings(next);
      },
      exportData: () =>
        JSON.stringify({ baby, entries, medicines, appointments, vaccines, milestones, meId, parents, settings, timers }, null, 2),
      importData: (json) => {
        try {
          const parsed = JSON.parse(json) as Snapshot;
          if (!parsed || !parsed.baby || !Array.isArray(parsed.entries)) return false;
          applySnapshot(parsed);
          if (fid && uid) {
            void (async () => {
              await supabase.from("babies").upsert({ family_id: fid, data: parsed.baby }, { onConflict: "family_id" });
              const rows = parsed.entries.map((e) => entryToRow({ ...e, id: asUuid(e.id) }, fid, uid));
              if (rows.length) await supabase.from("entries").upsert(rows, { onConflict: "id" });
              const docs: [DocTable, { id: string }[]][] = [
                ["medicines", parsed.medicines ?? []],
                ["appointments", parsed.appointments ?? []],
                ["vaccines", parsed.vaccines ?? []],
                ["milestones", parsed.milestones ?? []],
              ];
              for (const [table, list] of docs) {
                if (!list.length) continue;
                await supabase.from(table).upsert(
                  list.map((d) => docToRow({ ...d, id: asUuid(d.id) }, fid, uid)),
                  { onConflict: "id" },
                );
              }
              await reload(fid);
            })();
          }
          return true;
        } catch {
          return false;
        }
      },
      resetData: () => {
        // drop the local cache and re-read the family's own cloud data
        if (familyId) {
          try {
            window.localStorage.removeItem(cacheKey(familyId));
          } catch {
            /* ignore */
          }
          void reload(familyId);
        }
      },
    };
  }, [
    now,
    baby,
    entries,
    medicines,
    appointments,
    vaccines,
    milestones,
    timers,
    meId,
    parents,
    settings,
    online,
    lastSyncedAt,
    session,
    authReady,
    dataLoaded,
    familyId,
    inviteCode,
    pendingCount,
    applySnapshot,
    clearMemory,
    reload,
  ]);

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
      ageDays: baby.bornAt ? Math.max(0, Math.floor((now - baby.bornAt) / 86400000)) : 0,
    };
  }, [entries, now, baby.bornAt]);
}
