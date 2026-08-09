import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Camera, ImagePlus, Trash2, X } from "lucide-react";
import { AppShell, PageHeader, SoftCard } from "@/components/babybond/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useBabyBond } from "@/lib/babybond-store";
import { formatDate, formatTime, type Entry, type FollowUpStatus } from "@/lib/babybond-data";

export const Route = createFileRoute("/track/doctor")({
  head: () => ({
    meta: [
      { title: "Doctor visits — BabyBond" },
      { name: "description", content: "Plan paediatrician appointments, store prescriptions and get reminders before each visit." },
      { property: "og:title", content: "Doctor visits — BabyBond" },
      { property: "og:description", content: "Appointments, prescriptions, diagnosis and reminders in one place." },
    ],
  }),
  component: Doctor,
});

const FOLLOW_UPS: { key: FollowUpStatus; label: string }[] = [
  { key: "pending", label: "Follow-up pending" },
  { key: "done", label: "Follow-up done" },
  { key: "not-needed", label: "No follow-up" },
];

function readFiles(files: FileList | null): Promise<string[]> {
  if (!files || !files.length) return Promise.resolve([]);
  return Promise.all(
    Array.from(files).map(
      (f) =>
        new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = () => resolve(String(r.result));
          r.onerror = reject;
          r.readAsDataURL(f);
        }),
    ),
  );
}

function Doctor() {
  const { appointments, addAppointment, updateAppointment, deleteAppointment, entries, now } = useBabyBond();
  const [doctor, setDoctor] = useState("");
  const [hospital, setHospital] = useState("");
  const [when, setWhen] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [nextVisit, setNextVisit] = useState("");
  const [reminder, setReminder] = useState(true);
  const [shots, setShots] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const past = (entries.filter((e) => e.type === "visit") as Extract<Entry, { type: "visit" }>[]).slice(0, 6);

  const addTo = async (id: string, files: FileList | null) => {
    const imgs = await readFiles(files);
    if (!imgs.length) return;
    const a = appointments.find((x) => x.id === id);
    updateAppointment(id, { prescriptions: [...(a?.prescriptions ?? []), ...imgs] });
    toast.success(`${imgs.length} prescription photo${imgs.length > 1 ? "s" : ""} added`);
  };

  return (
    <AppShell>
      <PageHeader title="Doctor" subtitle="Appointments, prescriptions & notes" />
      <div className="space-y-4 px-5 pb-6">
        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Upcoming & recent</h2>
          <div className="space-y-2">
            {appointments.map((a) => (
              <SoftCard key={a.id} tone="health" className="space-y-2">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 place-items-center rounded-2xl bg-card/70 text-lg">🩺</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{a.doctor}</p>
                    <p className="text-xs opacity-80">{a.hospital}</p>
                    {a.reason ? <p className="mt-1 text-xs opacity-70">Reason · {a.reason}</p> : null}
                    {a.diagnosis ? <p className="text-xs opacity-70">Diagnosis · {a.diagnosis}</p> : null}
                    {a.note ? <p className="text-xs opacity-70">Notes · {a.note}</p> : null}
                    <p className="mt-1 text-[11px] font-semibold">
                      {formatDate(a.at)} · {formatTime(a.at)}
                      {a.at >= now ? ` · in ${Math.max(0, Math.round((a.at - now) / 86400000))} days` : ""}
                    </p>
                    {a.nextVisitAt ? (
                      <p className="text-[11px] font-semibold">
                        Next visit · {formatDate(a.nextVisitAt)} {formatTime(a.nextVisitAt)}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    aria-label="Delete appointment"
                    onClick={() => deleteAppointment(a.id)}
                    className="grid size-8 place-items-center rounded-full bg-card/70"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {FOLLOW_UPS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => updateAppointment(a.id, { followUp: f.key })}
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                        (a.followUp ?? "pending") === f.key ? "bb-gradient text-primary-foreground" : "bg-card/70"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {(a.prescriptions ?? []).length ? (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {(a.prescriptions ?? []).map((src, i) => (
                      <button key={i} type="button" onClick={() => setPreview(src)} className="shrink-0">
                        <img
                          src={src}
                          alt={`Prescription ${i + 1} from ${a.doctor}`}
                          loading="lazy"
                          className="size-20 rounded-2xl object-cover"
                        />
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="flex gap-2">
                  <label className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-card/70 py-2 text-xs font-semibold">
                    <Camera className="size-4" /> Camera
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => void addTo(a.id, e.target.files)}
                    />
                  </label>
                  <label className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-card/70 py-2 text-xs font-semibold">
                    <ImagePlus className="size-4" /> Gallery
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => void addTo(a.id, e.target.files)}
                    />
                  </label>
                </div>
              </SoftCard>
            ))}
          </div>
        </div>

        <SoftCard>
          <p className="text-sm font-bold">New appointment</p>
          <div className="mt-3 space-y-2">
            <Input placeholder="Doctor name" value={doctor} onChange={(e) => setDoctor(e.target.value)} className="h-11 rounded-2xl" />
            <Input placeholder="Hospital / clinic" value={hospital} onChange={(e) => setHospital(e.target.value)} className="h-11 rounded-2xl" />
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="h-11 rounded-2xl" />
            <Input placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} className="h-11 rounded-2xl" />
            <Input placeholder="Diagnosis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} className="h-11 rounded-2xl" />
            <Textarea placeholder="Doctor notes" value={note} onChange={(e) => setNote(e.target.value)} className="rounded-2xl" />
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Next visit</p>
              <Input type="datetime-local" value={nextVisit} onChange={(e) => setNextVisit(e.target.value)} className="h-11 rounded-2xl" />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-secondary py-2.5 text-xs font-semibold text-secondary-foreground"
              >
                <Camera className="size-4" /> Camera
              </button>
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-secondary py-2.5 text-xs font-semibold text-secondary-foreground"
              >
                <ImagePlus className="size-4" /> Gallery
              </button>
              <input
                ref={cameraRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={async (e) => setShots((prev) => [...prev, ...(await readFiles(e.target.files))])}
              />
              <input
                ref={galleryRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (e) => setShots((prev) => [...prev, ...(await readFiles(e.target.files))])}
              />
            </div>

            {shots.length ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {shots.map((src, i) => (
                  <div key={i} className="relative shrink-0">
                    <img src={src} alt={`Prescription ${i + 1}`} loading="lazy" className="size-20 rounded-2xl object-cover" />
                    <button
                      type="button"
                      aria-label="Remove photo"
                      onClick={() => setShots((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-card bb-shadow"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex items-center gap-3 rounded-2xl bg-secondary px-4 py-3">
              <span className="flex-1 text-sm font-semibold">Reminder before visit</span>
              <Switch checked={reminder} onCheckedChange={setReminder} />
            </div>

            <Button
              className="h-11 w-full rounded-2xl bb-gradient text-primary-foreground"
              onClick={() => {
                if (!doctor) return;
                addAppointment({
                  doctor,
                  hospital: hospital || "—",
                  at: when ? new Date(when).getTime() : Date.now() + 86400000,
                  reason,
                  note,
                  diagnosis,
                  prescriptions: shots,
                  nextVisitAt: nextVisit ? new Date(nextVisit).getTime() : null,
                  followUp: "pending",
                  reminder,
                });
                setDoctor("");
                setHospital("");
                setWhen("");
                setReason("");
                setNote("");
                setDiagnosis("");
                setNextVisit("");
                setShots([]);
                toast.success("Appointment saved", { description: "Both parents will be reminded." });
              }}
            >
              <CalendarPlus className="mr-2 size-4" /> Save with reminder
            </Button>
          </div>
        </SoftCard>

        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Past visits</h2>
          <div className="space-y-2">
            {past.map((v) => (
              <SoftCard key={v.id} className="flex items-center gap-3 py-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-secondary text-lg">🏥</span>
                <div className="flex-1">
                  <p className="text-sm font-bold">{v.doctor}</p>
                  <p className="text-xs text-muted-foreground">
                    {v.hospital} · {formatDate(v.at)}
                  </p>
                  {v.note ? <p className="text-xs text-muted-foreground">{v.note}</p> : null}
                </div>
              </SoftCard>
            ))}
          </div>
        </div>
      </div>

      {preview ? (
        <button
          type="button"
          aria-label="Close preview"
          onClick={() => setPreview(null)}
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/70 p-6 backdrop-blur"
        >
          <img src={preview} alt="Prescription" className="max-h-[80vh] w-full rounded-3xl object-contain" />
        </button>
      ) : null}
    </AppShell>
  );
}
