export type FeedSide = "left" | "right" | "both";

export type Entry =
  | { id: string; type: "breast"; at: number; side: FeedSide; minutes: number; note?: string; by: string }
  | { id: string; type: "formula"; at: number; ml: number; note?: string; by: string }
  | { id: string; type: "pee"; at: number; by: string }
  | { id: string; type: "potty"; at: number; kind: PottyKind; note?: string; by: string }
  | { id: string; type: "sleep"; at: number; minutes: number; by: string }
  | { id: string; type: "weight"; at: number; grams: number; by: string }
  | { id: string; type: "bilirubin"; at: number; value: number; method: "skin" | "blood"; by: string }
  | { id: string; type: "medicine"; at: number; name: string; dose: string; by: string }
  | { id: string; type: "visit"; at: number; doctor: string; hospital: string; note?: string; by: string };

export type PottyKind = "normal" | "loose" | "green" | "yellow" | "black";

export const POTTY_KINDS: { key: PottyKind; label: string }[] = [
  { key: "normal", label: "Normal" },
  { key: "loose", label: "Loose" },
  { key: "green", label: "Green" },
  { key: "yellow", label: "Yellow" },
  { key: "black", label: "Black" },
];

export type Medicine = {
  id: string;
  name: string;
  dose: string;
  time: string;
  active: boolean;
};

export type Appointment = {
  id: string;
  doctor: string;
  hospital: string;
  at: number;
  note?: string;
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
  bornAt: number;
  gender: "girl" | "boy";
  bloodGroup: string;
};

export type Parent = { id: string; name: string; role: "Mother" | "Father"; emoji: string; online: boolean };

const uid = () => Math.random().toString(36).slice(2, 10);

const HOUR = 3600_000;
const DAY = 24 * HOUR;

export function makeSeed(now: number) {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
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
    { id: uid(), type: "medicine", at: t(8), name: "Vitamin D", dose: "400 IU", by: "Father" },
    { id: uid(), type: "sleep", at: t(9.5), minutes: 140, by: "Father" },
    { id: uid(), type: "pee", at: t(10.5), by: "Mother" },
    { id: uid(), type: "breast", at: t(11), side: "right", minutes: 18, by: "Mother" },
    { id: uid(), type: "weight", at: now - 2 * DAY, grams: 3480, by: "Mother" },
    { id: uid(), type: "weight", at: now - 9 * DAY, grams: 3220, by: "Mother" },
    { id: uid(), type: "weight", at: now - 16 * DAY, grams: 3050, by: "Father" },
    { id: uid(), type: "bilirubin", at: now - 1 * DAY, value: 8.4, method: "skin", by: "Father" },
    { id: uid(), type: "bilirubin", at: now - 4 * DAY, value: 11.2, method: "blood", by: "Mother" },
    { id: uid(), type: "bilirubin", at: now - 7 * DAY, value: 13.6, method: "blood", by: "Mother" },
    { id: uid(), type: "visit", at: now - 5 * DAY, doctor: "Dr. Ananya Rao", hospital: "Rainbow Children's", note: "Weight check — all good", by: "Mother" },
  ];

  const medicines: Medicine[] = [
    { id: uid(), name: "Vitamin D drops", dose: "400 IU · 1 drop", time: "09:00", active: true },
    { id: uid(), name: "Iron supplement", dose: "0.6 ml", time: "18:00", active: true },
    { id: uid(), name: "Colic drops", dose: "as needed", time: "21:30", active: false },
  ];

  const appointments: Appointment[] = [
    { id: uid(), doctor: "Dr. Ananya Rao", hospital: "Rainbow Children's", at: now + 2 * DAY + 3 * HOUR, note: "6 week check-up", reminder: true },
    { id: uid(), doctor: "Dr. Vikram Shah", hospital: "City Clinic", at: now + 12 * DAY, note: "Vaccination — 6 in 1", reminder: true },
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

  return { entries, medicines, appointments, milestones, baby, parents };
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
