export type FeedSide = "left" | "right" | "both";

export type MedicineStatus = "given" | "skipped";

export type Entry =
  | { id: string; type: "breast"; at: number; side: FeedSide; minutes: number; note?: string; by: string }
  | { id: string; type: "formula"; at: number; ml: number; note?: string; by: string }
  | { id: string; type: "pee"; at: number; by: string }
  | { id: string; type: "potty"; at: number; kind: PottyKind; note?: string; by: string }
  | { id: string; type: "sleep"; at: number; minutes: number; by: string }
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
const DAY = 24 * HOUR;

export function makeSeed(now: number) {
  const t = (hoursAgo: number) => Math.round(now - hoursAgo * HOUR);

  const entries: Entry[] = [
    { id: uid(), type: "breast", at: t(0.6), side: "left", minutes: 14, by: "Mother" },
    { id: uid(), type: "pee", at: t(1.1), by: "Father" },
    { id: uid(), type: "formula", at: t(2.4), ml: 40, by: "Father" },
    { id: uid(), type: "sleep", at: t(3.2), minutes: 95, by: "Mother" },
    { id: uid(), type: "potty", at: t(4.1), kind: "yellow", note: "Seedy, normal", by: "Mother" },
    { id: uid(), type: "breast", at: t(5), side: "both", minutes: 22, by: "Mother" },
    { id: uid(), type: "pee", at: t(5.8), by: "Mother" },
    { id: uid(), type: "formula", at: t(7), ml: 30, by: "Father" },
    { id: uid(), type: "medicine", at: t(8), name: "Vitamin D", dose: "400 IU", status: "given", by: "Father" },
    { id: uid(), type: "sleep", at: t(9.5), minutes: 140, by: "Father" },
    { id: uid(), type: "pee", at: t(10.5), by: "Mother" },
    { id: uid(), type: "breast", at: t(11), side: "right", minutes: 18, by: "Mother" },
    { id: uid(), type: "weight", at: now - 2 * DAY, grams: 3480, note: "Morning, before feed", by: "Mother" },
    { id: uid(), type: "weight", at: now - 9 * DAY, grams: 3220, by: "Mother" },
    { id: uid(), type: "weight", at: now - 16 * DAY, grams: 3050, by: "Father" },
    { id: uid(), type: "bilirubin", at: now - 1 * DAY, value: 8.4, method: "skin", by: "Father" },
    { id: uid(), type: "bilirubin", at: now - 4 * DAY, value: 11.2, method: "blood", by: "Mother" },
    { id: uid(), type: "bilirubin", at: now - 7 * DAY, value: 13.6, method: "blood", by: "Mother" },
    { id: uid(), type: "visit", at: now - 5 * DAY, doctor: "Dr. Ananya Rao", hospital: "Rainbow Children's", note: "Weight check — all good", by: "Mother" },
  ];

  const medicines: Medicine[] = [
    {
      id: uid(),
      name: "Vitamin D drops",
      dose: "400 IU · 1 drop",
      time: "09:00",
      type: "Drops",
      frequency: "Once daily",
      times: ["09:00"],
      startAt: now - 20 * DAY,
      endAt: null,
      notes: "After the morning feed",
      active: true,
    },
    {
      id: uid(),
      name: "Iron supplement",
      dose: "0.6 ml",
      time: "18:00",
      type: "Syrup",
      frequency: "Twice daily",
      times: ["09:30", "18:00"],
      startAt: now - 10 * DAY,
      endAt: now + 20 * DAY,
      active: true,
    },
    {
      id: uid(),
      name: "Colic drops",
      dose: "as needed",
      time: "21:30",
      type: "Drops",
      frequency: "As needed",
      times: ["21:30"],
      startAt: now - 5 * DAY,
      endAt: null,
      active: false,
    },
  ];

  const appointments: Appointment[] = [
    {
      id: uid(),
      doctor: "Dr. Ananya Rao",
      hospital: "Rainbow Children's",
      at: now + 2 * DAY + 3 * HOUR,
      reason: "6 week check-up",
      note: "Carry the growth booklet",
      prescription: null,
      nextVisitAt: null,
      reminder: true,
    },
    {
      id: uid(),
      doctor: "Dr. Vikram Shah",
      hospital: "City Clinic",
      at: now + 12 * DAY,
      reason: "Vaccination — 6 in 1",
      prescription: null,
      nextVisitAt: null,
      reminder: true,
    },
  ];

  const vaccines: Vaccine[] = [
    { id: uid(), name: "BCG", dueAt: now - 26 * DAY, doneAt: now - 26 * DAY, doctorNote: "Given at birth", reminder: false },
    { id: uid(), name: "Hepatitis B — birth dose", dueAt: now - 25 * DAY, doneAt: now - 25 * DAY, reminder: false },
    { id: uid(), name: "OPV — 0 dose", dueAt: now - 18 * DAY, doneAt: null, doctorNote: "Missed, reschedule", reminder: true },
    { id: uid(), name: "6 in 1 — 1st dose", dueAt: now + 12 * DAY, doneAt: null, reminder: true },
    { id: uid(), name: "Rotavirus — 1st dose", dueAt: now + 12 * DAY, doneAt: null, reminder: true },
    { id: uid(), name: "PCV — 1st dose", dueAt: now + 40 * DAY, doneAt: null, reminder: true },
  ];

  const milestones: Milestone[] = [
    { id: uid(), label: "First smile", emoji: "😊", achievedAt: now - 3 * DAY },
    { id: uid(), label: "First roll", emoji: "🤸", achievedAt: null },
    { id: uid(), label: "First tooth", emoji: "🦷", achievedAt: null },
    { id: uid(), label: "First steps", emoji: "👣", achievedAt: null },
    { id: uid(), label: "First laugh", emoji: "😄", achievedAt: now - 1 * DAY },
    { id: uid(), label: "Sleeps through night", emoji: "🌙", achievedAt: null },
  ];

  const baby: Baby = {
    name: "Aarohi",
    bornAt: now - 26 * DAY,
    gender: "girl",
    bloodGroup: "O+",
  };

  const parents: Parent[] = [
    { id: "m", name: "Priya", role: "Mother", emoji: "👩", online: true },
    { id: "f", name: "Rohit", role: "Father", emoji: "👨", online: true },
  ];

  return { entries, medicines, appointments, vaccines, milestones, baby, parents };
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
