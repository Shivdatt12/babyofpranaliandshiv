import { supabase } from "@/integrations/supabase/client";
import type { Appointment, Baby, Entry, Medicine, Milestone, Settings, Vaccine } from "./babybond-data";

export type DocTable = "medicines" | "appointments" | "vaccines" | "milestones";
export type SyncTable = DocTable | "entries" | "babies" | "family_settings";

export const uuid = () =>
  typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}-4000-8000-${Math.random()
        .toString(16)
        .slice(2, 14)}`;

/** Existing local ids are short strings; the cloud needs UUIDs. */
export const asUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : uuid();

type Row = { id: string; data?: Record<string, unknown> | null; [k: string]: unknown };

export function entryToRow(e: Entry, familyId: string, userId: string | null) {
  const { id, at, type, ...rest } = e as Entry & Record<string, unknown>;
  return { id, family_id: familyId, at: new Date(at).toISOString(), type, data: rest, created_by: userId };
}

export function rowToEntry(r: Row & { at: string; type: string }): Entry {
  return { id: r.id, type: r.type, at: new Date(r.at).getTime(), ...(r.data ?? {}) } as unknown as Entry;
}

export function docToRow(doc: { id: string }, familyId: string, userId: string | null) {
  const { id, ...rest } = doc as { id: string } & Record<string, unknown>;
  return { id, family_id: familyId, data: rest, created_by: userId };
}

export function rowToDoc<T>(r: Row): T {
  return { id: r.id, ...(r.data ?? {}) } as T;
}

export type CloudSnapshot = {
  baby: Baby | null;
  settings: Partial<Settings> | null;
  entries: Entry[];
  medicines: Medicine[];
  appointments: Appointment[];
  vaccines: Vaccine[];
  milestones: Milestone[];
};

export async function loadFamilyData(familyId: string): Promise<CloudSnapshot> {
  const [baby, settings, entries, medicines, appointments, vaccines, milestones] = await Promise.all([
    supabase.from("babies").select("data").eq("family_id", familyId).maybeSingle(),
    supabase.from("family_settings").select("data").eq("family_id", familyId).maybeSingle(),
    supabase.from("entries").select("*").eq("family_id", familyId).order("at", { ascending: false }).limit(5000),
    supabase.from("medicines").select("*").eq("family_id", familyId),
    supabase.from("appointments").select("*").eq("family_id", familyId),
    supabase.from("vaccines").select("*").eq("family_id", familyId),
    supabase.from("milestones").select("*").eq("family_id", familyId),
  ]);

  return {
    baby: (baby.data?.data as Baby | undefined) ?? null,
    settings: (settings.data?.data as Partial<Settings> | undefined) ?? null,
    entries: ((entries.data ?? []) as never[]).map(rowToEntry),
    medicines: ((medicines.data ?? []) as Row[]).map((r) => rowToDoc<Medicine>(r)),
    appointments: ((appointments.data ?? []) as Row[]).map((r) => rowToDoc<Appointment>(r)),
    vaccines: ((vaccines.data ?? []) as Row[]).map((r) => rowToDoc<Vaccine>(r)),
    milestones: ((milestones.data ?? []) as Row[]).map((r) => rowToDoc<Milestone>(r)),
  };
}

/* ---------------- offline queue ---------------- */

export type QueuedOp =
  | { kind: "upsert"; table: SyncTable; row: Record<string, unknown> }
  | { kind: "delete"; table: SyncTable; id: string };

const QUEUE_KEY = "babybond:queue:v1";

export function readQueue(): QueuedOp[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(QUEUE_KEY) ?? "[]") as QueuedOp[];
  } catch {
    return [];
  }
}

export function writeQueue(ops: QueuedOp[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(ops));
  } catch {
    /* quota */
  }
}

/** Collapse repeated writes to the same row so a long offline session replays cleanly. */
export function pushOp(op: QueuedOp) {
  const key = op.kind === "delete" ? op.id : String(op.row['id'] ?? op.row['family_id']);
  const next = readQueue().filter((o) => {
    const k = o.kind === "delete" ? o.id : String(o.row['id'] ?? o.row['family_id']);
    return !(o.table === op.table && k === key);
  });
  next.push(op);
  writeQueue(next);
}

let flushing = false;

/** Replays queued writes. Upserts are idempotent (client-generated ids), so no duplicates. */
export async function flushQueue(): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  let done = 0;
  try {
    let ops = readQueue();
    while (ops.length) {
      const op = ops[0]!;
      const onConflict = op.table === "babies" || op.table === "family_settings" ? "family_id" : "id";
      const table = supabase.from(op.table) as unknown as {
        upsert: (row: unknown, o: { onConflict: string }) => Promise<{ error: unknown }>;
        delete: () => { eq: (c: string, v: string) => Promise<{ error: unknown }> };
      };
      const res = op.kind === "upsert" ? await table.upsert(op.row, { onConflict }) : await table.delete().eq("id", op.id);
      if (res.error) break; // still offline / transient — keep the rest queued
      ops = ops.slice(1);
      writeQueue(ops);
      done += 1;
    }

  } finally {
    flushing = false;
  }
  return done;
}
