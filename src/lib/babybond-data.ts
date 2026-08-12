export type FeedSide = "left" | "right" | "both";

export type MedicineStatus = "given" | "skipped";

export type ParentRole = "Mother" | "Father" | "Parent";

export type Entry =
  | {
      id: string;
      type: "breast";
      at: number;
      side: FeedSide;
      minutes: number;
      /** set for timer + manual sessions so history can show the real window */
      startedAt?: number;
      endedAt?: number;
      note?: string;
      by: string;
    }
  | { id: string; type: "formula"; at: number; ml: number; note?: string; by: string }
  | { id: string; type: "pee"; at: number; by: string }
  | { id: string; type: "potty"; at: number; kind: PottyKind; note?: string; by: string }
  | {
      id: string;
      type: "sleep";
      at: number;
      minutes: number;
      startedAt?: number;
      endedAt?: number;
      note?: string;
      by: string;
    }
  | { id: string; type: "weight"; at: number; grams: number; note?: string; by: string }
  | { id: string; type: "bilirubin"; at: number; value: number; method: "skin" | "blood"; note?: string; by: string }
  | {
      id: string;
      type: "medicine";
      at: number;
      name: string;
      dose: string;
      medicineId?: string;
      status?: MedicineStatus;
      by: string;
    }
  | { id: string; type: "visit"; at: number; doctor: string; hospital: string; note?: string; by: string }
  | { id: string; type: "photo"; at: number; path: string; caption?: string; by: string }
  | { id: string; type: "vaccine"; at: number; name: string; note?: string; by: string };


export type PottyKind = "normal" | "loose" | "green" | "yellow" | "black";

export const POTTY_KINDS: { key: PottyKind; label: string }[] = [
  { key: "normal", label: "Normal" },
  { key: "loose", label: "Loose" },
  { key: "green", label: "Green" },
  { key: "yellow", label: "Yellow" },
  { key: "black", label: "Black" },
];

export const MEDICINE_TYPES = ["Drops", "Syrup", "Tablet", "Injection", "Ointment", "Other"] as const;
export type MedicineType = (typeof MEDICINE_TYPES)[number];

export const MEDICINE_FREQUENCIES = ["Once daily", "Twice daily", "Thrice daily", "Every 6 hours", "As needed"] as const;
export type MedicineFrequency = (typeof MEDICINE_FREQUENCIES)[number];

export type Medicine = {
  id: string;
  name: string;
  /** kept for backwards compatibility with older entries */
  dose: string;
  /** first reminder time — mirrors times[0] */
  time: string;
  type: MedicineType;
  frequency: MedicineFrequency;
  times: string[];
  startAt: number;
  endAt: number | null;
  notes?: string;
  active: boolean;
};

export type FollowUpStatus = "pending" | "done" | "not-needed";

export type Appointment = {
  id: string;
  doctor: string;
  hospital: string;
  at: number;
  reason?: string;
  note?: string;
  diagnosis?: string;
  /** legacy single prescription image */
  prescription?: string | null;
  /** data-URL prescription photos (camera or gallery) */
  prescriptions?: string[];
  nextVisitAt?: number | null;
  followUp?: FollowUpStatus;
  reminder: boolean;
};

export type Vaccine = {
  id: string;
  name: string;
  dueAt: number;
  doneAt: number | null;
  doctorNote?: string;
  reminder: boolean;
};

export type Milestone = {
  id: string;
  label: string;
  emoji: string;
  achievedAt: number | null;
};

export type Baby = {
  name: string;
  /** date + time of birth */
  bornAt: number;
  gender: "girl" | "boy";
  bloodGroup: string;
  birthWeightGrams?: number | null;
  photo?: string | null;
};

export type Parent = { id: string; name: string; role: "Mother" | "Father"; emoji: string; online: boolean };

export type Settings = {
  medicineReminders: boolean;
  feedReminders: boolean;
  vaccineReminders: boolean;
  doctorReminders: boolean;
  feedGapHours: number;
  vaccineLeadDays: number;
  doctorLeadHours: number;
};

export const DEFAULT_SETTINGS: Settings = {
  medicineReminders: true,
  feedReminders: true,
  vaccineReminders: true,
  doctorReminders: true,
  feedGapHours: 3,
  vaccineLeadDays: 2,
  doctorLeadHours: 24,
};

/** Rough newborn jaundice bands (mg/dL) used only to highlight readings. */
export function bilirubinLevel(value: number): "normal" | "watch" | "high" {
  if (value >= 15) return "high";
  if (value >= 12) return "watch";
  return "normal";
}

const uid = () => Math.random().toString(36).slice(2, 10);

const HOUR = 3600_000;

/** A brand-new family starts completely empty — no demo or seeded records, ever. */
export const EMPTY_BABY: Baby = { name: "", bornAt: 0, gender: "girl", bloodGroup: "", photo: null };

/** Milestone checklist template used when a baby profile is first created. */
export function defaultMilestones(): Milestone[] {
  return [
    { id: uid(), label: "First smile", emoji: "😊", achievedAt: null },
    { id: uid(), label: "First roll", emoji: "🤸", achievedAt: null },
    { id: uid(), label: "First tooth", emoji: "🦷", achievedAt: null },
    { id: uid(), label: "First laugh", emoji: "😄", achievedAt: null },
    { id: uid(), label: "First steps", emoji: "👣", achievedAt: null },
    { id: uid(), label: "Sleeps through night", emoji: "🌙", achievedAt: null },
  ];
}

export function newId() {
  return uid();
}

export function startOfToday(now: number) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString([], { day: "numeric", month: "short" });
}

export function timeAgo(ts: number, now: number) {
  const mins = Math.max(0, Math.round((now - ts) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return m ? `${h}h ${m}m ago` : `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function durationLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function countdownLabel(ms: number) {
  const abs = Math.abs(ms);
  const h = Math.floor(abs / HOUR);
  const m = Math.floor((abs % HOUR) / 60000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return h ? `${h}h ${m}m` : `${m}m`;
}

/** next occurrence (timestamp) of a HH:mm reminder relative to `from` */
export function nextTimeOccurrence(hhmm: string, from: number) {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  const d = new Date(from);
  d.setHours(h, m, 0, 0);
  if (d.getTime() <= from) d.setDate(d.getDate() + 1);
  return d.getTime();
}

export function todayOccurrence(hhmm: string, from: number) {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  const d = new Date(from);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export function isMedicineActiveOn(m: Medicine, ts: number) {
  if (!m.active) return false;
  if (m.startAt > ts) return false;
  if (m.endAt && m.endAt < startOfToday(ts)) return false;
  return true;
}

export function toDateInput(ts: number) {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function toDateTimeInput(ts: number) {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${toDateInput(ts)}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
