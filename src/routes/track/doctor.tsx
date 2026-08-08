import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarPlus } from "lucide-react";
import { AppShell, PageHeader, SoftCard } from "@/components/babybond/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useBabyBond } from "@/lib/babybond-store";
import { formatDate, formatTime, type Entry } from "@/lib/babybond-data";

export const Route = createFileRoute("/track/doctor")({
  head: () => ({
    meta: [
      { title: "Doctor visits — BabyBond" },
      { name: "description", content: "Plan paediatrician appointments, keep hospital notes and get reminders before each visit." },
      { property: "og:title", content: "Doctor visits — BabyBond" },
      { property: "og:description", content: "Appointments, hospital notes and reminders in one place." },
    ],
  }),
  component: Doctor,
});

function Doctor() {
  const { appointments, addAppointment, entries, now } = useBabyBond();
  const [doctor, setDoctor] = useState("");
  const [hospital, setHospital] = useState("");
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");

  const past = (entries.filter((e) => e.type === "visit") as Extract<Entry, { type: "visit" }>[]).slice(0, 6);

  return (
    <AppShell>
      <PageHeader title="Doctor" subtitle="Appointments & notes" />
      <div className="space-y-4 px-5 pb-6">
        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Upcoming</h2>
          <div className="space-y-2">
            {appointments.map((a) => (
              <SoftCard key={a.id} tone="health" className="flex items-start gap-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-card/70 text-lg">🩺</span>
                <div className="flex-1">
                  <p className="text-sm font-bold">{a.doctor}</p>
                  <p className="text-xs opacity-80">{a.hospital}</p>
                  {a.note ? <p className="mt-1 text-xs opacity-70">{a.note}</p> : null}
                  <p className="mt-1 text-[11px] font-semibold">
                    {formatDate(a.at)} · {formatTime(a.at)} · in {Math.max(0, Math.round((a.at - now) / 86400000))} days
                  </p>
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
            <Textarea placeholder="Notes / reason" value={note} onChange={(e) => setNote(e.target.value)} className="rounded-2xl" />
            <Button
              className="h-11 w-full rounded-2xl bb-gradient text-primary-foreground"
              onClick={() => {
                if (!doctor) return;
                addAppointment({
                  doctor,
                  hospital: hospital || "—",
                  at: when ? new Date(when).getTime() : Date.now() + 86400000,
                  note,
                  reminder: true,
                });
                setDoctor("");
                setHospital("");
                setWhen("");
                setNote("");
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
    </AppShell>
  );
}
