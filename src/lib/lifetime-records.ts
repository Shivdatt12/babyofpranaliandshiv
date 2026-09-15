import { describe } from "@/routes/timeline";
import type {
  Appointment,
  Entry,
  LifetimeCategory,
  LifetimeRecord,
  MedicalDocument,
  Milestone,
  Vaccine,
} from "./babybond-data";

export type UnifiedRecord = {
  id: string;
  source: "entry" | "appointment" | "vaccine" | "milestone" | "lifetime" | "document";
  at: number;
  category: "daily_care" | "health" | "growth" | "life_event" | "memory" | "document";
  title: string;
  detail: string;
  emoji: string;
  by?: string;
};

const entryCategory = (entry: Entry): UnifiedRecord["category"] => {
  if (["weight", "bilirubin"].includes(entry.type)) return "growth";
  if (["medicine", "vaccine", "visit"].includes(entry.type)) return "health";
  if (entry.type === "photo") return "memory";
  return "daily_care";
};

const lifetimeCategory = (category: LifetimeCategory): UnifiedRecord["category"] =>
  category === "important_event" ? "life_event" : category;

export function buildUnifiedRecords(input: {
  entries: Entry[];
  appointments: Appointment[];
  vaccines: Vaccine[];
  milestones: Milestone[];
  lifetimeRecords: LifetimeRecord[];
  medicalDocuments: MedicalDocument[];
  breastMlPerMinute: number;
}): UnifiedRecord[] {
  const entryIds = new Set(input.entries.map((entry) => entry.id));
  const records: UnifiedRecord[] = input.entries.map((entry) => {
    const item = describe(entry, input.breastMlPerMinute);
    return {
      id: `entry:${entry.id}`,
      source: "entry",
      at: entry.at,
      category: entryCategory(entry),
      title: item.title,
      detail: item.detail,
      emoji: item.emoji,
      by: entry.by,
    };
  });

  for (const appointment of input.appointments) {
    if (entryIds.has(`visit-${appointment.id}`)) continue;
    records.push({
      id: `appointment:${appointment.id}`,
      source: "appointment",
      at: appointment.at,
      category: "health",
      title: appointment.doctor || "Doctor visit",
      detail: [appointment.hospital, appointment.reason].filter(Boolean).join(" · "),
      emoji: "🩺",
    });
  }

  for (const vaccine of input.vaccines) {
    if (!vaccine.doneAt || entryIds.has(`vax-${vaccine.id}`)) continue;
    records.push({
      id: `vaccine:${vaccine.id}`,
      source: "vaccine",
      at: vaccine.doneAt,
      category: "health",
      title: vaccine.name,
      detail: vaccine.dose ? `${vaccine.dose} · vaccine given` : "Vaccine given",
      emoji: "🛡️",
      ...(vaccine.completedBy ? { by: vaccine.completedBy } : {}),
    });
  }

  for (const milestone of input.milestones) {
    if (!milestone.achievedAt) continue;
    records.push({
      id: `milestone:${milestone.id}`,
      source: "milestone",
      at: milestone.achievedAt,
      category: "life_event",
      title: milestone.label,
      detail: "Milestone achieved",
      emoji: milestone.emoji,
    });
  }

  for (const record of input.lifetimeRecords) {
    if (record.archivedAt) continue;
    records.push({
      id: `lifetime:${record.id}`,
      source: "lifetime",
      at: record.eventAt,
      category: lifetimeCategory(record.category),
      title: record.title,
      detail: record.description || record.notes || record.eventType.replaceAll("_", " "),
      emoji:
        record.category === "growth"
          ? "📏"
          : record.category === "health"
            ? "🩺"
            : record.category === "important_event"
              ? "⭐"
              : "🎈",
      by: record.by,
    });
  }

  for (const document of input.medicalDocuments) {
    if (document.archivedAt) continue;
    records.push({
      id: `document:${document.id}`,
      source: "document",
      at: document.documentAt,
      category: "document",
      title: document.title,
      detail: document.category.replaceAll("_", " "),
      emoji: document.mimeType === "application/pdf" ? "📄" : "🖼️",
      by: document.by,
    });
  }

  return records.sort((a, b) => b.at - a.at || a.id.localeCompare(b.id));
}
