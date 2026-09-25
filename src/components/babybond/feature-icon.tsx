import {
  Activity,
  Baby,
  BarChart3,
  Bell,
  CalendarDays,
  Clock3,
  Droplet,
  Image,
  Moon,
  Pill,
  Ruler,
  Scale,
  Settings,
  Sparkles,
  Stethoscope,
  Syringe,
  Toilet,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type FeatureIconName =
  | "feeding"
  | "sleep"
  | "pee"
  | "potty"
  | "weight"
  | "height"
  | "bilirubin"
  | "medicine"
  | "vaccine"
  | "doctor"
  | "memory"
  | "milestone"
  | "timeline"
  | "reports"
  | "baby"
  | "settings"
  | "family"
  | "notification"
  | "calendar"
  | "insights";

const ICONS: Record<FeatureIconName, LucideIcon> = {
  feeding: Baby,
  sleep: Moon,
  pee: Droplet,
  potty: Toilet,
  weight: Scale,
  height: Ruler,
  bilirubin: Activity,
  medicine: Pill,
  vaccine: Syringe,
  doctor: Stethoscope,
  memory: Image,
  milestone: Trophy,
  timeline: Clock3,
  reports: BarChart3,
  baby: Baby,
  settings: Settings,
  family: Users,
  notification: Bell,
  calendar: CalendarDays,
  insights: Sparkles,
};

export function FeatureIcon({
  name,
  className,
  strokeWidth = 2,
}: {
  name: FeatureIconName;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = ICONS[name];
  return <Icon aria-hidden="true" className={cn("size-5", className)} strokeWidth={strokeWidth} />;
}

export function featureIconForType(type: string): FeatureIconName {
  if (type === "breast" || type === "formula" || type === "feeding") return "feeding";
  if (type === "pee") return "pee";
  if (type === "potty") return "potty";
  if (type === "sleep") return "sleep";
  if (type === "weight") return "weight";
  if (type === "height") return "height";
  if (type === "bilirubin") return "bilirubin";
  if (type === "medicine" || type === "medicines") return "medicine";
  if (type === "vaccine" || type === "vaccines") return "vaccine";
  if (type === "visit" || type === "doctor") return "doctor";
  if (type === "photo" || type === "memory" || type === "memories") return "memory";
  if (type === "milestone") return "milestone";
  return "timeline";
}