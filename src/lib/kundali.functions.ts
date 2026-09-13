import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calculateKundali } from "./kundali.server";

const placeSchema = z.object({
  name: z.string().min(2).max(180),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().min(3).max(80),
});

export const searchBirthPlaces = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ query: z.string().trim().min(3).max(100) }).parse(input))
  .handler(async ({ data }) => {
    const response = await fetch(
      `https://photon.komoot.io/api/?q=${encodeURIComponent(data.query)}&limit=5&lang=en`,
      { headers: { "User-Agent": "BabyBond/1.0" } },
    );
    if (!response.ok) throw new Error("Birth-place search is temporarily unavailable");
    const json = (await response.json()) as {
      features?: {
        geometry?: { coordinates?: [number, number] };
        properties?: Record<string, string>;
      }[];
    };
    return (json.features ?? []).flatMap((feature) => {
      const coordinates = feature.geometry?.coordinates;
      if (!coordinates) return [];
      const p = feature.properties ?? {};
      return [
        {
          name: [p["name"], p["city"], p["state"], p["country"]]
            .filter((v, i, a) => v && a.indexOf(v) === i)
            .join(", "),
          latitude: coordinates[1],
          longitude: coordinates[0],
        },
      ];
    });
  });

export const resolveBirthPlace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ name: z.string().min(2), latitude: z.number(), longitude: z.number() }).parse(input),
  )
  .handler(async ({ data }) => {
    const response = await fetch(
      `https://timeapi.io/api/timezone/coordinate?latitude=${data.latitude}&longitude=${data.longitude}`,
    );
    if (!response.ok) throw new Error("Could not resolve the timezone for this place");
    const json = (await response.json()) as { timeZone?: string };
    return placeSchema.parse({ ...data, timezone: json.timeZone });
  });

export const generateKundali = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ bornAt: z.number().positive(), place: placeSchema }).parse(input),
  )
  .handler(async ({ data }) => calculateKundali(data));
