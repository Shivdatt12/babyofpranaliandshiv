import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Download, ImagePlus, Trash2, Loader2, Maximize2 } from "lucide-react";
import { AppShell, PageHeader, SoftCard, BabyAvatar } from "@/components/babybond/shell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useBabyBond } from "@/lib/babybond-store";
import { formatDate, formatTime, type Entry } from "@/lib/babybond-data";
import {
  ACCEPTED_IMAGE_TYPES,
  downloadMedia,
  MediaError,
  removeMedia,
  uploadMedia,
  useMediaUrl,
} from "@/lib/babybond-media";

export const Route = createFileRoute("/track/album")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Photo album — BabyBond" },
      { name: "description", content: "Monthly photos and everyday moments of your baby, kept in one soft shared album." },
      { property: "og:title", content: "Photo album — BabyBond" },
      { property: "og:description", content: "Monthly photos and precious moments, shared with both parents." },
    ],
  }),
  component: Album,
});

type PhotoEntry = Extract<Entry, { type: "photo" }>;

function Album() {
  const { baby, entries, familyId, addEntry, deleteEntry } = useBabyBond();
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  const photos = entries.filter((e): e is PhotoEntry => e.type === "photo");

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    let saved = 0;
    for (const file of Array.from(files)) {
      try {
        const path = await uploadMedia(familyId, "album", file);
        addEntry({ type: "photo", path, ...(caption.trim() ? { caption: caption.trim() } : {}) } as never);
        saved += 1;
      } catch (err) {
        toast.error(err instanceof MediaError ? err.message : "That photo could not be uploaded.");
      }
    }
    setBusy(false);
    setCaption("");
    if (saved) toast.success(`${saved} photo${saved > 1 ? "s" : ""} added 📸`);
  };

  return (
    <AppShell>
      <PageHeader title="Album" subtitle={`${baby.name}'s moments`} />
      <div className="space-y-4 px-5 pb-6">
        <SoftCard className="space-y-3">
          <Input
            placeholder="Caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="h-11 rounded-2xl"
          />
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => galleryRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-2xl bb-gradient p-4 text-sm font-bold text-primary-foreground active:scale-95 disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />} Gallery
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => cameraRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-2xl bg-secondary p-4 text-sm font-bold text-secondary-foreground active:scale-95 disabled:opacity-60"
            >
              <Camera className="size-5" /> Camera
            </button>
          </div>
          <input
            ref={galleryRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            multiple
            className="hidden"
            onChange={(e) => {
              void upload(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={cameraRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES}
            capture="environment"
            className="hidden"
            onChange={(e) => {
              void upload(e.target.files);
              e.target.value = "";
            }}
          />
          <p className="text-[11px] text-muted-foreground">
            Photos are stored privately in your family account and stay after refresh, sign-out and reinstall.
          </p>
        </SoftCard>

        <SoftCard className="p-3">
          <BabyAvatar className="aspect-square w-full rounded-2xl text-5xl" />
          <p className="mt-2 px-1 text-sm font-bold">{baby.name}</p>
          <p className="px-1 text-xs text-muted-foreground">Born {formatDate(baby.bornAt)}</p>
        </SoftCard>

        <div>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Moments {photos.length ? `· ${photos.length}` : ""}
          </h2>
          {photos.length === 0 ? (
            <SoftCard className="text-center text-sm text-muted-foreground">
              No photos yet — add your first moment above.
            </SoftCard>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {photos.map((p) => (
                <PhotoTile
                  key={p.id}
                  photo={p}
                  onDelete={() => {
                    deleteEntry(p.id);
                    void removeMedia(p.path);
                    toast.success("Photo deleted");
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function PhotoTile({ photo, onDelete }: { photo: PhotoEntry; onDelete: () => void }) {
  const url = useMediaUrl(photo.path);
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const blob = await downloadMedia(photo.path);
      const extension =
        blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
      const day = new Date(photo.at).toISOString().slice(0, 10);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `baby-photo-${day}.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000);
      toast.success("Photo downloaded");
    } catch (error) {
      console.error("Album photo download failed", error);
      toast.error(error instanceof MediaError ? error.message : "Photo download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <SoftCard className="space-y-2 p-2">
        <Button
          type="button"
          variant="ghost"
          aria-label={`Open ${photo.caption ?? "baby photo"} in large view`}
          disabled={!url}
          onClick={() => setOpen(true)}
          className="group relative aspect-square h-auto w-full overflow-hidden rounded-2xl bg-secondary p-0"
        >
          {url ? (
            <img src={url} alt={photo.caption ?? "Baby photo"} loading="lazy" className="size-full object-cover" />
          ) : (
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          )}
          {url ? (
            <span className="absolute bottom-2 right-2 grid size-8 place-items-center rounded-full bg-background/80 text-foreground shadow-sm backdrop-blur-sm">
              <Maximize2 className="size-4" />
            </span>
          ) : null}
        </Button>
        <div className="flex items-center gap-1 px-1 pb-1">
          <div className="min-w-0 flex-1">
            {photo.caption ? <p className="truncate text-xs font-bold">{photo.caption}</p> : null}
            <p className="text-[10px] text-muted-foreground">
              {formatDate(photo.at)} · {formatTime(photo.at)} · {photo.by}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Download photo"
            disabled={!url || downloading}
            onClick={() => void download()}
            className="size-8 text-muted-foreground"
          >
            {downloading ? <Loader2 className="animate-spin" /> : <Download />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Delete photo"
            onClick={onDelete}
            className="size-8 text-muted-foreground"
          >
            <Trash2 />
          </Button>
        </div>
      </SoftCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-3xl flex-col gap-3 overflow-hidden rounded-2xl border-border/70 p-3 sm:p-4">
          <DialogHeader className="min-w-0 pr-10 text-left">
            <DialogTitle className="truncate text-base">{photo.caption || "Baby photo"}</DialogTitle>
            <DialogDescription>
              {formatDate(photo.at)} at {formatTime(photo.at)}
            </DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-secondary">
            {url ? (
              <img
                src={url}
                alt={photo.caption ?? "Baby photo"}
                className="max-h-[70dvh] max-w-full object-contain"
              />
            ) : null}
          </div>
          <Button
            type="button"
            onClick={() => void download()}
            disabled={!url || downloading}
            className="h-11 w-full rounded-xl"
          >
            {downloading ? <Loader2 className="animate-spin" /> : <Download />}
            {downloading ? "Downloading…" : "Download photo"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
