import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Archive, FilePlus2, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader, SoftCard } from "@/components/babybond/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBabyBond } from "@/lib/babybond-store";
import { formatDate, formatTime } from "@/lib/babybond-data";
import { buildUnifiedRecords } from "@/lib/lifetime-records";
import {
  ACCEPTED_DOCUMENT_TYPES,
  MediaError,
  mediaUrl,
  removeMedia,
  uploadDocument,
} from "@/lib/babybond-media";
import type { LifetimeCategory, MedicalDocumentCategory } from "@/lib/babybond-data";

export const Route = createFileRoute("/records")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Lifetime records — माझी चिमणी" },
      { name: "description", content: "A private lifetime child record for your family." },
    ],
  }),
  component: Records,
});

const categories: { value: LifetimeCategory; label: string }[] = [
  { value: "life_event", label: "Life event" },
  { value: "important_event", label: "Important event" },
  { value: "health", label: "Health history" },
  { value: "growth", label: "Growth & development" },
];

const documentCategories: { value: MedicalDocumentCategory; label: string }[] = [
  { value: "prescription", label: "Prescription" },
  { value: "lab_report", label: "Lab report" },
  { value: "vaccination_certificate", label: "Vaccination certificate" },
  { value: "discharge_summary", label: "Discharge summary" },
  { value: "doctor_document", label: "Doctor document" },
  { value: "medical_photo", label: "Medical photo" },
  { value: "other", label: "Other" },
];

const toLocalInput = (at: number) => {
  const date = new Date(at - new Date(at).getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
};

function Records() {
  const store = useBabyBond();
  const fileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<LifetimeCategory>("life_event");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [at, setAt] = useState(toLocalInput(Date.now()));
  const [docCategory, setDocCategory] = useState<MedicalDocumentCategory>("other");
  const [uploading, setUploading] = useState(false);
  const [visible, setVisible] = useState(30);

  const unified = useMemo(
    () =>
      buildUnifiedRecords({
        entries: store.entries,
        appointments: store.appointments,
        vaccines: store.vaccines,
        milestones: store.milestones,
        lifetimeRecords: store.lifetimeRecords,
        medicalDocuments: store.medicalDocuments,
        breastMlPerMinute: store.settings.breastMlPerMinute,
      }),
    [store],
  );
  const filtered = unified.filter((item) =>
    `${item.title} ${item.detail} ${item.category}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const saveEvent = () => {
    if (!title.trim()) {
      toast.error("Add a title for this memory or record.");
      return;
    }
    store.addLifetimeRecord({
      category,
      eventType: category,
      eventAt: new Date(at).getTime(),
      hasTime: true,
      title: title.trim(),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      details: {},
      mediaPaths: [],
      archivedAt: null,
    });
    setTitle("");
    setNotes("");
    toast.success("Added to the lifetime record");
  };

  const addDocument = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadDocument(store.familyId, file);
      store.addMedicalDocument({
        category: docCategory,
        title: file.name.replace(/\.[^.]+$/, ""),
        documentAt: Date.now(),
        objectPath: path,
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        archivedAt: null,
      });
      toast.success("Document saved privately");
    } catch (error) {
      toast.error(error instanceof MediaError ? error.message : "Document upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <AppShell>
      <PageHeader title="Lifetime records" subtitle={`${store.baby.name}'s story, health and documents`} />
      <div className="space-y-4 px-5 pb-6">
        <SoftCard className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="bb-icon-well"><Archive className="size-5" /></span>
            <div><p className="font-bold">A record that grows with your child</p><p className="text-xs text-muted-foreground">Existing trackers remain the source of truth.</p></div>
          </div>
        </SoftCard>

        <Tabs defaultValue="history">
          <TabsList className="grid h-auto grid-cols-3 rounded-2xl">
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="event">Add event</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
          <TabsContent value="history" className="space-y-3">
            <div className="relative"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search all records" className="rounded-2xl pl-9" /></div>
            {filtered.length === 0 ? <SoftCard className="text-center text-sm text-muted-foreground">No matching records yet.</SoftCard> : filtered.slice(0, visible).map((item) => (
              <SoftCard key={item.id} className="flex gap-3 p-4">
                <span className="bb-icon-well text-lg">{item.emoji}</span>
                <div className="min-w-0 flex-1"><p className="font-bold">{item.title}</p><p className="text-sm text-muted-foreground">{item.detail}</p><p className="mt-1 text-[11px] text-muted-foreground">{formatDate(item.at)} · {formatTime(item.at)}{item.by ? ` · ${item.by}` : ""}</p></div>
              </SoftCard>
            ))}
            {visible < filtered.length ? <Button variant="secondary" className="w-full rounded-2xl" onClick={() => setVisible((v) => v + 30)}>Load more</Button> : null}
          </TabsContent>
          <TabsContent value="event">
            <SoftCard className="space-y-3">
              <select value={category} onChange={(e) => setCategory(e.target.value as LifetimeCategory)} className="h-11 w-full rounded-2xl border bg-background px-3 text-sm">{categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What happened?" className="rounded-2xl" />
              <Input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className="rounded-2xl" />
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="rounded-2xl" />
              <Button onClick={saveEvent} className="w-full rounded-2xl"><Plus className="mr-2 size-4" />Add to record</Button>
            </SoftCard>
          </TabsContent>
          <TabsContent value="documents" className="space-y-3">
            <SoftCard className="space-y-3">
              <select value={docCategory} onChange={(e) => setDocCategory(e.target.value as MedicalDocumentCategory)} className="h-11 w-full rounded-2xl border bg-background px-3 text-sm">{documentCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
              <Button disabled={uploading} onClick={() => fileRef.current?.click()} className="w-full rounded-2xl">{uploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FilePlus2 className="mr-2 size-4" />}Upload private document</Button>
              <input ref={fileRef} type="file" accept={ACCEPTED_DOCUMENT_TYPES} className="hidden" onChange={(e) => { void addDocument(e.target.files?.[0]); e.target.value = ""; }} />
              <p className="text-[11px] text-muted-foreground">Images and PDFs are protected by your family account.</p>
            </SoftCard>
            {store.medicalDocuments.length === 0 ? <SoftCard className="text-center text-sm text-muted-foreground">No medical documents saved.</SoftCard> : store.medicalDocuments.map((document) => (
              <SoftCard key={document.id} className="flex items-center gap-3 p-4">
                <span className="bb-icon-well">{document.mimeType === "application/pdf" ? "📄" : "🖼️"}</span>
                <button className="min-w-0 flex-1 text-left" onClick={() => void mediaUrl(document.objectPath).then((url) => url && window.open(url, "_blank", "noopener,noreferrer"))}><p className="truncate font-bold">{document.title}</p><p className="text-xs capitalize text-muted-foreground">{document.category.replaceAll("_", " ")} · {formatDate(document.documentAt)}</p></button>
                <button aria-label="Delete document" onClick={() => { if (!window.confirm("Delete this document permanently?")) return; store.deleteMedicalDocument(document.id); void removeMedia(document.objectPath); toast.success("Document deleted"); }}><Trash2 className="size-4 text-muted-foreground" /></button>
              </SoftCard>
            ))}
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-2 gap-2 text-xs"><Link to="/track/weight" className="rounded-2xl bg-secondary p-3 text-center font-bold">Growth tracker</Link><Link to="/track/doctor" className="rounded-2xl bg-secondary p-3 text-center font-bold">Doctor visits</Link><Link to="/track/album" className="rounded-2xl bg-secondary p-3 text-center font-bold">Memories</Link><Link to="/timeline" search={{ days: 0, type: "all" }} className="rounded-2xl bg-secondary p-3 text-center font-bold">Daily timeline</Link></div>
      </div>
    </AppShell>
  );
}