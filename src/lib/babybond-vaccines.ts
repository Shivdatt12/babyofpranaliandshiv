import type { Vaccine } from "./babybond-data";
import { startOfToday } from "./babybond-data";

/**
 * Default checklist based on the Indian National Immunization Schedule (NIS).
 * `conditional: true` marks doses the official schedule applies only in selected
 * states / programmes — they are added but can be switched to "Not applicable".
 */
export type VaccineTemplate = {
  code: string;
  name: string;
  stage: string;
  /** offset from date of birth */
  weeks?: number;
  months?: number;
  /** end of the recommended window */
  endWeeks?: number;
  endMonths?: number;
  conditional?: boolean;
  scheduleNote?: string;
};

export const DEFAULT_VACCINE_SCHEDULE: VaccineTemplate[] = [
  { code: "bcg", name: "BCG", stage: "At birth", weeks: 0 },
  { code: "hepb0", name: "Hepatitis B — Birth dose", stage: "At birth", weeks: 0, endWeeks: 3, scheduleNote: "Within the birth-dose window (ideally within 24 hours)." },
  { code: "opv0", name: "OPV-0", stage: "At birth", weeks: 0, endWeeks: 2, scheduleNote: "Birth dose window." },

  { code: "opv1", name: "OPV-1", stage: "6 weeks", weeks: 6 },
  { code: "penta1", name: "Pentavalent-1", stage: "6 weeks", weeks: 6 },
  { code: "fipv1", name: "fIPV-1", stage: "6 weeks", weeks: 6 },
  { code: "rota1", name: "Rotavirus-1", stage: "6 weeks", weeks: 6, conditional: true, scheduleNote: "Given where the rotavirus vaccine programme applies." },
  { code: "pcv1", name: "PCV-1", stage: "6 weeks", weeks: 6, conditional: true, scheduleNote: "Given where the PCV programme applies." },

  { code: "opv2", name: "OPV-2", stage: "10 weeks", weeks: 10 },
  { code: "penta2", name: "Pentavalent-2", stage: "10 weeks", weeks: 10 },
  { code: "rota2", name: "Rotavirus-2", stage: "10 weeks", weeks: 10, conditional: true, scheduleNote: "Given where the rotavirus vaccine programme applies." },

  { code: "opv3", name: "OPV-3", stage: "14 weeks", weeks: 14 },
  { code: "penta3", name: "Pentavalent-3", stage: "14 weeks", weeks: 14 },
  { code: "fipv2", name: "fIPV-2", stage: "14 weeks", weeks: 14 },
  { code: "rota3", name: "Rotavirus-3", stage: "14 weeks", weeks: 14, conditional: true, scheduleNote: "Given where the rotavirus vaccine programme applies." },
  { code: "pcv2", name: "PCV-2", stage: "14 weeks", weeks: 14, conditional: true, scheduleNote: "Given where the PCV programme applies." },

  { code: "mr1", name: "MR-1", stage: "9–12 months", months: 9, endMonths: 12 },
  { code: "vita1", name: "Vitamin A — 1st dose", stage: "9 months", months: 9, endMonths: 12 },
  { code: "je1", name: "JE-1", stage: "9–12 months", months: 9, endMonths: 12, conditional: true, scheduleNote: "Only in JE-endemic districts." },
  { code: "pcvb", name: "PCV Booster", stage: "9 months", months: 9, endMonths: 12, conditional: true, scheduleNote: "Given where the PCV programme applies." },

  { code: "dptb1", name: "DPT Booster-1", stage: "16–24 months", months: 16, endMonths: 24 },
  { code: "opvb", name: "OPV Booster", stage: "16–24 months", months: 16, endMonths: 24 },
  { code: "mr2", name: "MR-2", stage: "16–24 months", months: 16, endMonths: 24 },
  { code: "je2", name: "JE-2", stage: "16–24 months", months: 16, endMonths: 24, conditional: true, scheduleNote: "Only in JE-endemic districts." },

  {
    code: "vita2",
    name: "Vitamin A — 2nd dose",
    stage: "16–18 months",
    months: 16,
    endMonths: 18,
    scheduleNote: "Further Vitamin A doses continue every 6 months up to 5 years, as per the applicable schedule.",
  },
];

export const VACCINE_SCHEDULE_NOTE =
  "Schedule is based on the Indian National Immunization Schedule. Please verify with your pediatrician and the baby's vaccination card.";

const WEEK = 7 * 86400_000;

function addMonths(ts: number, months: number) {
  const d = new Date(ts);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d.getTime();
}

export function templateDue(t: VaccineTemplate, bornAt: number) {
  const start = t.months != null ? addMonths(bornAt, t.months) : bornAt + (t.weeks ?? 0) * WEEK;
  const end =
    t.endMonths != null ? addMonths(bornAt, t.endMonths) : t.endWeeks != null ? bornAt + t.endWeeks * WEEK : null;
  return { start, end };
}

/** Build the checklist rows (without ids) for a given date of birth. */
export function buildDefaultVaccines(bornAt: number): Omit<Vaccine, "id">[] {
  return DEFAULT_VACCINE_SCHEDULE.map((t) => {
    const { start, end } = templateDue(t, bornAt);
    return {
      name: t.name,
      dueAt: start,
      dueEndAt: end,
      doneAt: null,
      reminder: true,
      code: t.code,
      stage: t.stage,
      ...(t.conditional ? { conditional: true } : {}),
      ...(t.scheduleNote ? { scheduleNote: t.scheduleNote } : {}),
    };
  });
}

export type VaccineStatus = "completed" | "not-applicable" | "overdue" | "due" | "upcoming";

/** Never overdue before the end of its recommended window. */
export function vaccineStatus(v: Vaccine, now: number): VaccineStatus {
  if (v.doneAt) return "completed";
  if (v.notApplicable) return "not-applicable";
  const today = startOfToday(now);
  const windowEnd = v.dueEndAt ?? v.dueAt;
  if (windowEnd < today) return "overdue";
  if (v.dueAt <= now) return "due";
  return "upcoming";
}

export const VACCINE_STATUS_LABEL: Record<VaccineStatus, string> = {
  completed: "Completed",
  "not-applicable": "Not applicable",
  overdue: "Overdue",
  due: "Due",
  upcoming: "Upcoming",
};
