/** Secure family media (baby photo, album photos, prescriptions).
 *  Files live in a private bucket under `<familyId>/<folder>/<uuid>.<ext>` so
 *  storage RLS only lets that family read them. We store the *path* in the
 *  database and resolve short-lived signed URLs on demand — never blob: URLs. */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uuid } from "./babybond-cloud";

export const MEDIA_BUCKET = "family-media";
export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp";

export type MediaFolder = "baby" | "album" | "prescriptions" | "parents";

/** A stored object path (not a data URL, blob URL or remote URL). */
export function isStoragePath(value?: string | null): value is string {
  if (!value) return false;
  return !/^(data:|blob:|https?:)/i.test(value);
}

/** Downscale + re-encode so Android camera shots don't blow up storage or scrolling. */
async function compress(file: File, max = 1600): Promise<Blob> {
  if (typeof document === "undefined" || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export class MediaError extends Error {}

/** Uploads one image and returns its storage path. Throws MediaError with a readable message. */
export async function uploadMedia(familyId: string | null, folder: MediaFolder, file: File): Promise<string> {
  if (!familyId) throw new MediaError("Sign in first so photos can be saved to your family account.");
  if (!file.type.startsWith("image/")) throw new MediaError("Please choose an image (JPG, PNG or WebP).");
  if (file.size > 25 * 1024 * 1024) throw new MediaError("That image is too large (max 25 MB).");

  const body = await compress(file);
  const ext = body.type === "image/jpeg" ? "jpg" : (file.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
  const path = `${familyId}/${folder}/${uuid()}.${ext}`;
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, body, { contentType: body.type || file.type, upsert: false });
  if (error) throw new MediaError(error.message || "Upload failed. Please check your connection and try again.");
  return path;
}

export async function removeMedia(path?: string | null) {
  if (!isStoragePath(path)) return;
  await supabase.storage.from(MEDIA_BUCKET).remove([path]);
}

const urlCache = new Map<string, { url: string; expires: number }>();

/** Signed URL for a stored path; passes data/blob/http values straight through. */
export async function mediaUrl(src?: string | null): Promise<string | null> {
  if (!src) return null;
  if (!isStoragePath(src)) return src;
  const hit = urlCache.get(src);
  if (hit && hit.expires > Date.now()) return hit.url;
  const { data } = await supabase.storage.from(MEDIA_BUCKET).createSignedUrl(src, 3600);
  if (!data?.signedUrl) return null;
  urlCache.set(src, { url: data.signedUrl, expires: Date.now() + 55 * 60_000 });
  return data.signedUrl;
}

export function clearMediaUrlCache() {
  urlCache.clear();
}

/** Resolves a stored image path to a displayable URL. */
export function useMediaUrl(src?: string | null): string | null {
  const [url, setUrl] = useState<string | null>(() => (src && !isStoragePath(src) ? src : null));
  useEffect(() => {
    let alive = true;
    if (!src) {
      setUrl(null);
      return;
    }
    if (!isStoragePath(src)) {
      setUrl(src);
      return;
    }
    void mediaUrl(src).then((u) => {
      if (alive) setUrl(u);
    });
    return () => {
      alive = false;
    };
  }, [src]);
  return url;
}
