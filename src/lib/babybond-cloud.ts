import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type {
  Appointment,
  Baby,
  Entry,
  LifetimeRecord,
  MedicalDocument,
  Medicine,
  Milestone,
  Settings,
  Vaccine,
} from "./babybond-data";
import { nameKey, type NameIdea, type NameVote } from "./babybond-names";


export type DocTable = "medicines" | "appointments" | "vaccines" | "milestones";
export type SyncTable =
  | DocTable
  | "entries"
  | "babies"
  | "family_settings"
  | "active_timers"
  | "name_ideas"
  | "lifetime_records"
  | "medical_documents";


export type TimerKind = "breast" | "sleep";
export type ActiveTimer = {
  kind: TimerKind;
  startedAt: number;
  by: string;
  side?: string;
  note?: string;
};


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

export type EntryRow = { id: string; family_id: string; at: string; type: string; data: Json; created_by: string | null };
export type DocRow = { id: string; family_id: string; data: Json; created_by: string | null };

export function entryToRow(e: Entry, familyId: string, userId: string | null): EntryRow {
  const { id, at, type, ...rest } = e as Entry & Record<string, unknown>;
  return { id, family_id: familyId, at: new Date(at).toISOString(), type, data: rest as Json, created_by: userId };
}

export function rowToEntry(r: Row & { at: string; type: string }): Entry {
  return { id: r.id, type: r.type, at: new Date(r.at).getTime(), ...(r.data ?? {}) } as unknown as Entry;
}

export function docToRow(doc: { id: string }, familyId: string, userId: string | null): DocRow {
  const { id, ...rest } = doc as { id: string } & Record<string, unknown>;
  return { id, family_id: familyId, data: rest as Json, created_by: userId };
}


export function rowToDoc<T>(r: Row): T {
  return { id: r.id, ...(r.data ?? {}) } as T;
}

export type CloudSnapshot = {
  babyId: string | null;
  baby: Baby | null;
  settings: Partial<Settings> | null;
  entries: Entry[];
  medicines: Medicine[];
  appointments: Appointment[];
  vaccines: Vaccine[];
  milestones: Milestone[];
  timers: ActiveTimer[];
  nameIdeas: NameIdea[];
  lifetimeRecords: LifetimeRecord[];
  medicalDocuments: MedicalDocument[];
};

export function lifetimeRecordToRow(
  record: LifetimeRecord,
  familyId: string,
  babyId: string,
  userId: string | null,
) {
  return {
    id: record.id,
    family_id: familyId,
    baby_id: babyId,
    category: record.category,
    event_type: record.eventType,
    event_at: new Date(record.eventAt).toISOString(),
    has_time: record.hasTime,
    title: record.title,
    description: record.description ?? null,
    notes: record.notes ?? null,
    details: record.details as Json,
    media_paths: record.mediaPaths,
    created_by: record.byId ?? userId,
    source: record.source,
    source_device: record.sourceDevice ?? null,
    archived_at: record.archivedAt ? new Date(record.archivedAt).toISOString() : null,
  };
}

export function rowToLifetimeRecord(r: Record<string, unknown>): LifetimeRecord {
  return {
    id: String(r['id']),
    category: r['category'] as LifetimeRecord['category'],
    eventType: String(r['event_type']),
    eventAt: new Date(String(r['event_at'])).getTime(),
    hasTime: Boolean(r['has_time']),
    title: String(r['title']),
    ...(r['description'] ? { description: String(r['description']) } : {}),
    ...(r['notes'] ? { notes: String(r['notes']) } : {}),
    details: (r['details'] as LifetimeRecord['details']) ?? {},
    mediaPaths: (r['media_paths'] as string[] | null) ?? [],
    by: "Parent",
    ...(r['created_by'] ? { byId: String(r['created_by']) } : {}),
    source: String(r['source'] ?? "parent"),
    ...(r['source_device'] ? { sourceDevice: String(r['source_device']) } : {}),
    archivedAt: r['archived_at'] ? new Date(String(r['archived_at'])).getTime() : null,
    createdAt: new Date(String(r['created_at'])).getTime(),
    updatedAt: new Date(String(r['updated_at'])).getTime(),
  };
}

export function medicalDocumentToRow(
  document: MedicalDocument,
  familyId: string,
  babyId: string,
  userId: string | null,
) {
  return {
    id: document.id,
    family_id: familyId,
    baby_id: babyId,
    category: document.category,
    title: document.title,
    note: document.note ?? null,
    document_at: new Date(document.documentAt).toISOString(),
    object_path: document.objectPath,
    original_name: document.originalName,
    mime_type: document.mimeType,
    size_bytes: document.sizeBytes,
    created_by: document.byId ?? userId,
    source: document.source,
    archived_at: document.archivedAt ? new Date(document.archivedAt).toISOString() : null,
  };
}

export function rowToMedicalDocument(r: Record<string, unknown>): MedicalDocument {
  return {
    id: String(r['id']),
    category: r['category'] as MedicalDocument['category'],
    title: String(r['title']),
    ...(r['note'] ? { note: String(r['note']) } : {}),
    documentAt: new Date(String(r['document_at'])).getTime(),
    objectPath: String(r['object_path']),
    originalName: String(r['original_name']),
    mimeType: String(r['mime_type']),
    sizeBytes: Number(r['size_bytes']),
    by: "Parent",
    ...(r['created_by'] ? { byId: String(r['created_by']) } : {}),
    source: String(r['source'] ?? "parent"),
    archivedAt: r['archived_at'] ? new Date(String(r['archived_at'])).getTime() : null,
    createdAt: new Date(String(r['created_at'])).getTime(),
    updatedAt: new Date(String(r['updated_at'])).getTime(),
  };
}

export function nameToRow(idea: NameIdea, familyId: string, userId: string | null) {
  const { id, votes, ...rest } = idea;
  return {
    id,
    family_id: familyId,
    name_key: nameKey(idea.name),
    data: rest as unknown as Json,
    votes: (votes ?? {}) as unknown as Json,
    created_by: idea.byId ?? userId,
  };
}

export function rowToName(r: Row & { votes?: unknown }): NameIdea {
  return {
    id: r.id,
    votes: (r.votes as Record<string, NameVote> | null) ?? {},
    ...(r.data ?? {}),
  } as NameIdea;
}

export async function loadFamilyData(familyId: string): Promise<CloudSnapshot> {
  const [baby, settings, entries, medicines, appointments, vaccines, milestones, timers, names, lifetime, documents] = await Promise.all([
    supabase.from("babies").select("id,data").eq("family_id", familyId).maybeSingle(),
    supabase.from("family_settings").select("data").eq("family_id", familyId).maybeSingle(),
    supabase.from("entries").select("*").eq("family_id", familyId).order("at", { ascending: false }).limit(5000),
    supabase.from("medicines").select("*").eq("family_id", familyId),
    supabase.from("appointments").select("*").eq("family_id", familyId),
    supabase.from("vaccines").select("*").eq("family_id", familyId),
    supabase.from("milestones").select("*").eq("family_id", familyId),
    supabase.from("active_timers").select("*").eq("family_id", familyId),
    supabase.from("name_ideas").select("*").eq("family_id", familyId),
    supabase.from("lifetime_records").select("*").eq("family_id", familyId).order("event_at", { ascending: false }).limit(500),
    supabase.from("medical_documents").select("*").eq("family_id", familyId).order("document_at", { ascending: false }).limit(500),
  ]);

  return {
    babyId: baby.data?.id ?? null,
    baby: (baby.data?.data as Baby | undefined) ?? null,
    settings: (settings.data?.data as Partial<Settings> | undefined) ?? null,
    entries: ((entries.data ?? []) as never[]).map(rowToEntry),
    medicines: ((medicines.data ?? []) as Row[]).map((r) => rowToDoc<Medicine>(r)),
    appointments: ((appointments.data ?? []) as Row[]).map((r) => rowToDoc<Appointment>(r)),
    vaccines: ((vaccines.data ?? []) as Row[]).map((r) => rowToDoc<Vaccine>(r)),
    milestones: ((milestones.data ?? []) as Row[]).map((r) => rowToDoc<Milestone>(r)),
    nameIdeas: ((names.data ?? []) as unknown as Row[]).map((r) => rowToName(r)),
    timers: ((timers.data ?? []) as unknown as {
      kind: TimerKind;
      started_at: string;
      data: Record<string, unknown> | null;
    }[]).map((t) => ({
      kind: t.kind,
      startedAt: new Date(t.started_at).getTime(),
      by: String(t.data?.['by'] ?? ""),
      ...(t.data?.['side'] ? { side: String(t.data['side']) } : {}),
      ...(t.data?.['note'] ? { note: String(t.data['note']) } : {}),
    })),
    lifetimeRecords: ((lifetime.data ?? []) as unknown as Record<string, unknown>[]).map(rowToLifetimeRecord),
    medicalDocuments: ((documents.data ?? []) as unknown as Record<string, unknown>[]).map(rowToMedicalDocument),
  };
}


export function timerToRow(timer: ActiveTimer, familyId: string, userId: string | null) {
  const { kind, startedAt, ...rest } = timer;
  return {
    family_id: familyId,
    kind,
    started_at: new Date(startedAt).toISOString(),
    started_by: userId,
    data: rest as Json,
  };
}

/* ---------------- offline queue ---------------- */

export type QueuedOp =
  | { kind: "upsert"; table: SyncTable; row: Record<string, unknown> }
  | { kind: "delete"; table: SyncTable; id: string }
  | { kind: "deleteTimer"; table: "active_timers"; familyId: string; timerKind: TimerKind };


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

function opKey(op: QueuedOp): string {
  if (op.kind === "delete") return op.id;
  if (op.kind === "deleteTimer") return `${op.familyId}:${op.timerKind}`;
  return String(op.row['id'] ?? `${op.row['family_id']}:${op.row['kind'] ?? ""}`);
}

/** Collapse repeated writes to the same row so a long offline session replays cleanly. */
export function pushOp(op: QueuedOp) {
  const key = opKey(op);
  const next = readQueue().filter((o) => !(o.table === op.table && opKey(o) === key));
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
      const onConflict =
        op.table === "babies" || op.table === "family_settings"
          ? "family_id"
          : op.table === "active_timers"
            ? "family_id,kind"
            : "id";
      const table = supabase.from(op.table) as unknown as {
        upsert: (row: unknown, o: { onConflict: string }) => Promise<{ error: unknown }>;
        delete: () => {
          eq: (c: string, v: string) => Promise<{ error: unknown }> & {
            eq: (c: string, v: string) => Promise<{ error: unknown }>;
          };
        };
      };
      const res =
        op.kind === "upsert"
          ? await table.upsert(op.row, { onConflict })
          : op.kind === "deleteTimer"
            ? await table.delete().eq("family_id", op.familyId).eq("kind", op.timerKind)
            : await table.delete().eq("id", op.id);
      if (res.error) {
        // a duplicate name (same name added by both parents offline) must not wedge the queue
        const code = (res.error as { code?: string }).code;
        if (op.table === "name_ideas" && code === "23505") {
          ops = ops.slice(1);
          writeQueue(ops);
          continue;
        }
        break; // still offline / transient — keep the rest queued
      }

      ops = ops.slice(1);
      writeQueue(ops);
      done += 1;
    }
  } finally {
    flushing = false;
  }
  return done;
}

