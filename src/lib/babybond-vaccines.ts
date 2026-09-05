import type { Vaccine } from "./babybond-data";
import { startOfToday } from "./babybond-data";

/**
 * Default dose checklist based on the IAP–ACVIP recommended immunization
 * schedule (2025). Every dose is a separate record so it can carry its own
 * due date, status, given date and notes.
 *
 * `conditional: true` marks doses whose applicability depends on the region,
 * availability, a medical condition or the pediatrician's advice — those are
 * shown with a "Check with your pediatrician" note and can be switched to
 * "Not applicable" by a parent.
 */
export type VaccineTemplate = {
  code: string;
  /** older code(s) used by earlier versions of the checklist — never duplicated */
  aliases?: string[];
  name: string;
  /** dose number / label, e.g. "Dose 1" or "Booster 1" */
  dose: string;
  /** age group heading, e.g. "6 weeks" */
  stage: string;
  /** sort weight of the age group */
  group: number;
  /** offset from date of birth */
  weeks?: number;
  months?: number;
  years?: number;
  /** end of the recommended window */
  endWeeks?: number;
  endMonths?: number;
  endYears?: number;
  conditional?: boolean;
  scheduleNote?: string;
};

const PED = "Check with your pediatrician.";

export const DEFAULT_VACCINE_SCHEDULE: VaccineTemplate[] = [
  /* ---------- Birth ---------- */
  { code: "bcg", name: "BCG", dose: "Birth dose", stage: "Birth", group: 0, weeks: 0 },
  {
    code: "hepb1",
    aliases: ["hepb0"],
    name: "Hepatitis B",
    dose: "Dose 1 (birth)",
    stage: "Birth",
    group: 0,
    weeks: 0,
    endWeeks: 3,
    scheduleNote: "Ideally within 24 hours of birth.",
  },
  { code: "opv0", name: "OPV", dose: "Dose 0 (birth)", stage: "Birth", group: 0, weeks: 0, endWeeks: 2 },

  /* ---------- 6 weeks ---------- */
  { code: "dtp1", aliases: ["penta1"], name: "DTwP / DTaP", dose: "Dose 1", stage: "6 weeks", group: 1, weeks: 6 },
  { code: "ipv1", aliases: ["fipv1"], name: "IPV", dose: "Dose 1", stage: "6 weeks", group: 1, weeks: 6 },
  { code: "hib1", name: "Hib", dose: "Dose 1", stage: "6 weeks", group: 1, weeks: 6 },
  { code: "hepb2", name: "Hepatitis B", dose: "Dose 2", stage: "6 weeks", group: 1, weeks: 6 },
  { code: "rota1", name: "Rotavirus", dose: "Dose 1", stage: "6 weeks", group: 1, weeks: 6 },
  { code: "pcv1", name: "PCV", dose: "Dose 1", stage: "6 weeks", group: 1, weeks: 6 },

  /* ---------- 10 weeks ---------- */
  { code: "dtp2", aliases: ["penta2"], name: "DTwP / DTaP", dose: "Dose 2", stage: "10 weeks", group: 2, weeks: 10 },
  { code: "ipv2", name: "IPV", dose: "Dose 2", stage: "10 weeks", group: 2, weeks: 10 },
  { code: "hib2", name: "Hib", dose: "Dose 2", stage: "10 weeks", group: 2, weeks: 10 },
  { code: "hepb3", name: "Hepatitis B", dose: "Dose 3", stage: "10 weeks", group: 2, weeks: 10 },
  { code: "rota2", name: "Rotavirus", dose: "Dose 2", stage: "10 weeks", group: 2, weeks: 10 },
  { code: "pcv2", name: "PCV", dose: "Dose 2", stage: "10 weeks", group: 2, weeks: 10 },

  /* ---------- 14 weeks ---------- */
  { code: "dtp3", aliases: ["penta3"], name: "DTwP / DTaP", dose: "Dose 3", stage: "14 weeks", group: 3, weeks: 14 },
  { code: "ipv3", aliases: ["fipv2"], name: "IPV", dose: "Dose 3", stage: "14 weeks", group: 3, weeks: 14 },
  { code: "hib3", name: "Hib", dose: "Dose 3", stage: "14 weeks", group: 3, weeks: 14 },
  { code: "hepb4", name: "Hepatitis B", dose: "Dose 4", stage: "14 weeks", group: 3, weeks: 14 },
  {
    code: "rota3",
    name: "Rotavirus",
    dose: "Dose 3",
    stage: "14 weeks",
    group: 3,
    weeks: 14,
    conditional: true,
    scheduleNote: `A third dose applies only to the pentavalent rotavirus vaccine. ${PED}`,
  },
  { code: "pcv3", name: "PCV", dose: "Dose 3", stage: "14 weeks", group: 3, weeks: 14 },

  /* ---------- 6 months ---------- */
  {
    code: "flu1",
    name: "Influenza (annual)",
    dose: "Dose 1",
    stage: "6 months",
    group: 4,
    months: 6,
    endMonths: 7,
    conditional: true,
    scheduleNote: `Seasonal vaccine — timing depends on the flu season. ${PED}`,
  },
  { code: "opv1", name: "OPV", dose: "Dose 1", stage: "6 months", group: 4, months: 6 },
  {
    code: "flu2",
    name: "Influenza (annual)",
    dose: "Dose 2",
    stage: "7 months",
    group: 5,
    months: 7,
    endMonths: 8,
    conditional: true,
    scheduleNote: `Second dose four weeks after the first, in the first year of vaccination. ${PED}`,
  },

  /* ---------- 9 months ---------- */
  { code: "mmr1", aliases: ["mr1"], name: "MMR", dose: "Dose 1", stage: "9 months", group: 6, months: 9, endMonths: 12 },
  { code: "opv2", name: "OPV", dose: "Dose 2", stage: "9 months", group: 6, months: 9 },
  {
    code: "tcv",
    name: "Typhoid conjugate (TCV)",
    dose: "Dose 1",
    stage: "9–12 months",
    group: 7,
    months: 9,
    endMonths: 12,
  },

  /* ---------- 12 months onwards ---------- */
  { code: "hepa1", name: "Hepatitis A", dose: "Dose 1", stage: "12 months", group: 8, months: 12, endMonths: 15 },
  { code: "pcvb", name: "PCV", dose: "Booster", stage: "12–15 months", group: 9, months: 12, endMonths: 15 },
  { code: "mmr2", name: "MMR", dose: "Dose 2", stage: "15 months", group: 10, months: 15, endMonths: 18 },
  { code: "var1", name: "Varicella", dose: "Dose 1", stage: "15 months", group: 10, months: 15, endMonths: 18 },

  { code: "dtpb1", aliases: ["dptb1"], name: "DTwP / DTaP", dose: "Booster 1", stage: "16–18 months", group: 11, months: 16, endMonths: 18 },
  { code: "ipvb1", name: "IPV", dose: "Booster 1", stage: "16–18 months", group: 11, months: 16, endMonths: 18 },
  { code: "hibb1", name: "Hib", dose: "Booster 1", stage: "16–18 months", group: 11, months: 16, endMonths: 18 },
  {
    code: "hepa2",
    name: "Hepatitis A",
    dose: "Dose 2",
    stage: "18 months",
    group: 12,
    months: 18,
    endMonths: 21,
    conditional: true,
    scheduleNote: `A second dose is needed for the killed vaccine only. ${PED}`,
  },

  /* ---------- 2 years ---------- */
  {
    code: "tcvb",
    name: "Typhoid conjugate (TCV)",
    dose: "Booster",
    stage: "2 years",
    group: 13,
    years: 2,
    endYears: 3,
    conditional: true,
    scheduleNote: `A booster is advised in some situations. ${PED}`,
  },

  /* ---------- 4–6 years ---------- */
  { code: "dtpb2", name: "DTwP / DTaP", dose: "Booster 2", stage: "4–6 years", group: 14, years: 4, endYears: 6 },
  { code: "ipvb2", name: "IPV", dose: "Booster 2", stage: "4–6 years", group: 14, years: 4, endYears: 6 },
  { code: "mmr3", aliases: ["mr2"], name: "MMR", dose: "Dose 3", stage: "4–6 years", group: 14, years: 4, endYears: 6 },
  { code: "var2", name: "Varicella", dose: "Dose 2", stage: "4–6 years", group: 14, years: 4, endYears: 6 },

  /* ---------- 9–15 years ---------- */
  {
    code: "hpv1",
    name: "HPV",
    dose: "Dose 1",
    stage: "9–14 years",
    group: 15,
    years: 9,
    endYears: 14,
    conditional: true,
    scheduleNote: `Two doses six months apart when started at 9–14 years. ${PED}`,
  },
  {
    code: "hpv2",
    name: "HPV",
    dose: "Dose 2",
    stage: "9–15 years",
    group: 15,
    years: 9,
    endYears: 15,
    conditional: true,
    scheduleNote: `Given 6–12 months after the first dose. ${PED}`,
  },
  { code: "tdap", name: "Tdap / Td", dose: "Booster", stage: "10–12 years", group: 16, years: 10, endYears: 12 },

  /* ---------- Special situations ---------- */
  {
    code: "je1",
    name: "Japanese encephalitis",
    dose: "Dose 1",
    stage: "Special situations",
    group: 17,
    months: 9,
    endMonths: 12,
    conditional: true,
    scheduleNote: `Only in JE-endemic districts. ${PED}`,
  },
  {
    code: "je2",
    name: "Japanese encephalitis",
    dose: "Dose 2",
    stage: "Special situations",
    group: 17,
    months: 16,
    endMonths: 24,
    conditional: true,
    scheduleNote: `Only in JE-endemic districts. ${PED}`,
  },
  {
    code: "mcv",
    name: "Meningococcal conjugate",
    dose: "As advised",
    stage: "Special situations",
    group: 17,
    months: 9,
    endMonths: 24,
    conditional: true,
    scheduleNote: `For high-risk children, outbreaks or travel. ${PED}`,
  },
  {
    code: "rabies_pre",
    name: "Rabies (pre-exposure)",
    dose: "As advised",
    stage: "Special situations",
    group: 17,
    years: 1,
    endYears: 5,
    conditional: true,
    scheduleNote: `Considered in high-risk settings. ${PED}`,
  },
  {
    code: "cholera",
    name: "Cholera",
    dose: "As advised",
    stage: "Special situations",
    group: 17,
    year: undefined,
    months: 12,
    endMonths: 60,
    conditional: true,
    scheduleNote: `Only for endemic areas or outbreaks. ${PED}`,
  } as VaccineTemplate,
];

export const VACCINE_SCHEDULE_NOTE =
  "Vaccine schedule is based on IAP-ACVIP recommendations. Your pediatrician's advice takes priority, especially for catch-up vaccination, special medical conditions, or region-specific vaccines.";

export const VACCINE_PEDIATRICIAN_NOTE = "Check with your pediatrician";

const WEEK = 7 * 86400_000;

function addMonths(ts: number, months: number) {
  const d = new Date(ts);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d.getTime();
}

export function templateDue(t: VaccineTemplate, bornAt: number) {
  const start =
    t.years != null
      ? addMonths(bornAt, t.years * 12)
      : t.months != null
        ? addMonths(bornAt, t.months)
        : bornAt + (t.weeks ?? 0) * WEEK;
  const end =
    t.endYears != null
      ? addMonths(bornAt, t.endYears * 12)
      : t.endMonths != null
        ? addMonths(bornAt, t.endMonths)
        : t.endWeeks != null
          ? bornAt + t.endWeeks * WEEK
          : null;
  return { start, end };
}

/** Build the dose rows (without ids) for a given date of birth. */
export function buildDefaultVaccines(bornAt: number): Omit<Vaccine, "id">[] {
  return DEFAULT_VACCINE_SCHEDULE.map((t) => {
    const { start, end } = templateDue(t, bornAt);
    return {
      name: t.name,
      dose: t.dose,
      dueAt: start,
      dueEndAt: end,
      doneAt: null,
      reminder: true,
      code: t.code,
      stage: t.stage,
      group: t.group,
      ...(t.conditional ? { conditional: true } : {}),
      ...(t.scheduleNote ? { scheduleNote: t.scheduleNote } : {}),
    };
  });
}

/** Every code that identifies a dose, including codes used by older versions. */
export function templateCodes(t: VaccineTemplate) {
  return [t.code, ...(t.aliases ?? [])];
}

export type VaccineStatus = "given" | "not-applicable" | "overdue" | "due-today" | "due-soon" | "upcoming";

/** Days before the due date at which a dose starts showing as "Due soon". */
export const DUE_SOON_DAYS = 7;

/** A dose is never overdue before the end of its recommended window. */
export function vaccineStatus(v: Vaccine, now: number, soonDays = DUE_SOON_DAYS): VaccineStatus {
  if (v.doneAt) return "given";
  if (v.notApplicable) return "not-applicable";
  const today = startOfToday(now);
  const windowEnd = v.dueEndAt ?? v.dueAt;
  const dueDay = startOfToday(v.dueAt);
  if (windowEnd < today) return "overdue";
  if (dueDay <= today) return "due-today";
  if (dueDay - today <= soonDays * 86400_000) return "due-soon";
  return "upcoming";
}

export const VACCINE_STATUS_LABEL: Record<VaccineStatus, string> = {
  given: "Given",
  "not-applicable": "Not applicable",
  overdue: "Overdue",
  "due-today": "Due today",
  "due-soon": "Due soon",
  upcoming: "Upcoming",
};

export const VACCINE_STATUS_DOT: Record<VaccineStatus, string> = {
  given: "🟢",
  "not-applicable": "⚪",
  overdue: "🔴",
  "due-today": "🟠",
  "due-soon": "🟡",
  upcoming: "🟡",
};

/** Sort order used everywhere a pending dose has to be picked first. */
export function vaccineSortKey(v: Vaccine) {
  return v.dueAt;
}

export function vaccineFullName(v: Vaccine) {
  return v.dose ? `${v.name} — ${v.dose}` : v.name;
}
