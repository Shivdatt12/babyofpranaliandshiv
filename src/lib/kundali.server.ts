import {
  NAKSHATRAS,
  PLANET_LABELS,
  VIMSHOTTARI_ORDER,
  VIMSHOTTARI_YEARS,
  kundaliSignature,
  type BirthPlace,
  type DashaPeriod,
  type Kundali,
  type PlanetPosition,
} from "./kundali-data";

const DAY = 86_400_000;
const YEAR_DAYS = 365.2425;
const NAK_SPAN = 360 / 27;
const SIGN_SPAN = 30;

const mod = (n: number, d = 360) => ((n % d) + d) % d;

/** Lahiri/Chitrapaksha mean ayanamsa around J2000 with standard precession rate. */
function lahiriAyanamsa(date: Date) {
  const year = date.getUTCFullYear() + (date.getUTCMonth() + 0.5) / 12;
  return 23.8530556 + (year - 2000) * 0.013968878;
}

function buildDasha(birthAt: number, moonLongitude: number): DashaPeriod[] {
  const nakIndex = Math.floor(mod(moonLongitude) / NAK_SPAN);
  const firstLord = NAKSHATRAS[nakIndex]?.lord ?? "Ketu";
  const firstIndex = VIMSHOTTARI_ORDER.indexOf(firstLord);
  const elapsedFraction = mod(moonLongitude, NAK_SPAN) / NAK_SPAN;
  const firstYears = VIMSHOTTARI_YEARS[firstLord] ?? 7;
  let cursor = birthAt - elapsedFraction * firstYears * YEAR_DAYS * DAY;
  const periods: DashaPeriod[] = [];
  for (let i = 0; i < 9; i += 1) {
    const lord = VIMSHOTTARI_ORDER[(firstIndex + i) % 9] ?? "Ketu";
    const years = VIMSHOTTARI_YEARS[lord] ?? 7;
    const startAt = cursor;
    const endAt = startAt + years * YEAR_DAYS * DAY;
    let antarCursor = startAt;
    const antar: DashaPeriod[] = [];
    const lordIndex = VIMSHOTTARI_ORDER.indexOf(lord);
    for (let j = 0; j < 9; j += 1) {
      const antarLord = VIMSHOTTARI_ORDER[(lordIndex + j) % 9] ?? "Ketu";
      const antarYears = (years * (VIMSHOTTARI_YEARS[antarLord] ?? 7)) / 120;
      const antarEnd = antarCursor + antarYears * YEAR_DAYS * DAY;
      antar.push({ lord: antarLord, lordMr: PLANET_LABELS[antarLord]?.mr ?? antarLord, startAt: antarCursor, endAt: antarEnd });
      antarCursor = antarEnd;
    }
    periods.push({ lord, lordMr: PLANET_LABELS[lord]?.mr ?? lord, startAt, endAt, antar });
    cursor = endAt;
  }
  return periods;
}

export async function calculateKundali(input: {
  bornAt: number;
  place: BirthPlace;
}): Promise<Kundali> {
  const Astronomy = await import("astronomy-engine");
  const instant = new Date(input.bornAt);
  if (!Number.isFinite(instant.getTime())) throw new Error("Invalid birth date or time");
  const birthAt = instant.getTime();
  const ayanamsa = lahiriAyanamsa(instant);
  const bodies = [
    ["Sun", Astronomy.Body.Sun], ["Moon", Astronomy.Body.Moon], ["Mars", Astronomy.Body.Mars],
    ["Mercury", Astronomy.Body.Mercury], ["Jupiter", Astronomy.Body.Jupiter], ["Venus", Astronomy.Body.Venus],
    ["Saturn", Astronomy.Body.Saturn],
  ] as const;
  const positions: { name: string; longitude: number }[] = bodies.map(([name, body]) => {
    const tropical = Astronomy.Ecliptic(Astronomy.GeoVector(body, instant, true)).elon;
    const sidereal = mod(tropical - ayanamsa);
    return { name, longitude: sidereal };
  });
  // Mean lunar node, Meeus polynomial. Rahu and Ketu are always opposite.
  const t = (birthAt / DAY + 2440587.5 - 2451545.0) / 36525;
  const meanNodeTropical = mod(125.044555 - 1934.1361849 * t + 0.0020762 * t * t + (t * t * t) / 467410);
  const rahu = mod(meanNodeTropical - ayanamsa);
  positions.push({ name: "Rahu", longitude: rahu }, { name: "Ketu", longitude: mod(rahu + 180) });

  // Local sidereal time gives the tropical ascendant; convert to Lahiri sidereal.
  const lst = mod(Astronomy.SiderealTime(instant) * 15 + input.place.longitude);
  const eps = (23.439291 - 0.0130042 * t) * Math.PI / 180;
  const theta = lst * Math.PI / 180;
  const phi = input.place.latitude * Math.PI / 180;
  const ascTropical = mod(Math.atan2(-Math.cos(theta), Math.sin(theta) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)) * 180 / Math.PI);
  const lagnaLongitude = mod(ascTropical - ayanamsa);
  const lagnaSignIndex = Math.floor(lagnaLongitude / SIGN_SPAN);

  const planets: PlanetPosition[] = positions.map(({ name, longitude }) => {
    const signIndex = Math.floor(longitude / SIGN_SPAN);
    const nakshatraIndex = Math.floor(longitude / NAK_SPAN);
    return {
      key: name.toLowerCase(), name, nameMr: PLANET_LABELS[name]?.mr ?? name, longitude,
      signIndex, degreeInSign: mod(longitude, SIGN_SPAN),
      house: mod(signIndex - lagnaSignIndex, 12) + 1,
      nakshatraIndex, pada: Math.floor(mod(longitude, NAK_SPAN) / (NAK_SPAN / 4)) + 1,
      retrograde: false,
    };
  });
  const moon = planets.find((p) => p.name === "Moon");
  const sun = planets.find((p) => p.name === "Sun");
  if (!moon || !sun) throw new Error("Could not calculate the luminaries");
  const houses = Array.from({ length: 12 }, (_, i) => ({
    house: i + 1,
    signIndex: mod(lagnaSignIndex + i, 12),
    planets: planets.filter((p) => p.house === i + 1).map((p) => p.name),
  }));
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: input.place.timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(instant).map((p) => [p.type, p.value]));
  const localAsUtc = Date.UTC(Number(parts['year']), Number(parts['month']) - 1, Number(parts['day']), Number(parts['hour']), Number(parts['minute']));
  const utcOffsetMinutes = Math.round((localAsUtc - birthAt) / 60000);
  return {
    signature: kundaliSignature(birthAt, input.place), generatedAt: Date.now(),
    config: { ayanamsa: "Lahiri (Chitrapaksha)", ayanamsaValue: ayanamsa, houseSystem: "Whole sign", engine: "Astronomy Engine VSOP87" },
    birth: { at: birthAt, place: input.place, utcOffsetMinutes },
    moonSignIndex: moon.signIndex, sunSignIndex: sun.signIndex, lagnaSignIndex,
    lagnaDegree: mod(lagnaLongitude, 30), nakshatraIndex: moon.nakshatraIndex, nakshatraPada: moon.pada,
    planets, houses, dasha: buildDasha(birthAt, moon.longitude),
  };
}
