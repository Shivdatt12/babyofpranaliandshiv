/**
 * Traditional Vedic (sidereal) reference tables + shared types.
 * Client-safe: no calculations, no secrets.
 */

export type BirthPlace = {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export type PlanetPosition = {
  key: string;
  /** English name, e.g. "Sun" */
  name: string;
  /** Marathi/Sanskrit name, e.g. "सूर्य" */
  nameMr: string;
  /** sidereal longitude 0–360 */
  longitude: number;
  signIndex: number;
  degreeInSign: number;
  house: number;
  nakshatraIndex: number;
  pada: number;
  retrograde: boolean;
};

export type HouseInfo = {
  house: number;
  signIndex: number;
  planets: string[];
};

export type DashaPeriod = {
  lord: string;
  lordMr: string;
  startAt: number;
  endAt: number;
  antar?: DashaPeriod[];
};

export type Kundali = {
  /** cache signature: birth details + calculation config */
  signature: string;
  generatedAt: number;
  config: { ayanamsa: string; ayanamsaValue: number; houseSystem: string; engine: string };
  birth: { at: number; place: BirthPlace; utcOffsetMinutes: number };
  moonSignIndex: number;
  sunSignIndex: number;
  lagnaSignIndex: number;
  lagnaDegree: number;
  nakshatraIndex: number;
  nakshatraPada: number;
  planets: PlanetPosition[];
  houses: HouseInfo[];
  dasha: DashaPeriod[];
};

export const RASHIS: { en: string; mr: string; lord: string }[] = [
  { en: "Aries", mr: "मेष", lord: "Mars" },
  { en: "Taurus", mr: "वृषभ", lord: "Venus" },
  { en: "Gemini", mr: "मिथुन", lord: "Mercury" },
  { en: "Cancer", mr: "कर्क", lord: "Moon" },
  { en: "Leo", mr: "सिंह", lord: "Sun" },
  { en: "Virgo", mr: "कन्या", lord: "Mercury" },
  { en: "Libra", mr: "तूळ", lord: "Venus" },
  { en: "Scorpio", mr: "वृश्चिक", lord: "Mars" },
  { en: "Sagittarius", mr: "धनु", lord: "Jupiter" },
  { en: "Capricorn", mr: "मकर", lord: "Saturn" },
  { en: "Aquarius", mr: "कुंभ", lord: "Saturn" },
  { en: "Pisces", mr: "मीन", lord: "Jupiter" },
];

export const PLANET_LABELS: Record<string, { mr: string; short: string }> = {
  Sun: { mr: "सूर्य", short: "Su" },
  Moon: { mr: "चंद्र", short: "Mo" },
  Mars: { mr: "मंगळ", short: "Ma" },
  Mercury: { mr: "बुध", short: "Me" },
  Jupiter: { mr: "गुरु", short: "Ju" },
  Venus: { mr: "शुक्र", short: "Ve" },
  Saturn: { mr: "शनि", short: "Sa" },
  Rahu: { mr: "राहू", short: "Ra" },
  Ketu: { mr: "केतू", short: "Ke" },
};

export type NakshatraInfo = {
  en: string;
  mr: string;
  lord: string;
  deity: string;
  symbol: string;
  colors: string[];
  numbers: number[];
  note: string;
};

/** 27 nakshatras with their traditional (cultural) associations. */
export const NAKSHATRAS: NakshatraInfo[] = [
  {
    en: "Ashwini",
    mr: "अश्विनी",
    lord: "Ketu",
    deity: "अश्विनीकुमार",
    symbol: "घोड्याचे मुख",
    colors: ["Red"],
    numbers: [7, 9],
    note: "उत्साही व चपळ स्वभावाशी जोडले जाणारे नक्षत्र.",
  },
  {
    en: "Bharani",
    mr: "भरणी",
    lord: "Venus",
    deity: "यम",
    symbol: "योनी",
    colors: ["Bright Red"],
    numbers: [6, 9],
    note: "सहनशीलता व निष्ठेशी जोडले जाणारे नक्षत्र.",
  },
  {
    en: "Krittika",
    mr: "कृत्तिका",
    lord: "Sun",
    deity: "अग्नी",
    symbol: "कुऱ्हाड",
    colors: ["White"],
    numbers: [1, 6],
    note: "तेजस्वी व स्पष्टवक्ता स्वभावाशी संबंधित.",
  },
  {
    en: "Rohini",
    mr: "रोहिणी",
    lord: "Moon",
    deity: "ब्रह्मा",
    symbol: "रथ",
    colors: ["White"],
    numbers: [2, 4],
    note: "सौंदर्य, कला व वाढीशी जोडले जाणारे नक्षत्र.",
  },
  {
    en: "Mrigashira",
    mr: "मृगशीर्ष",
    lord: "Mars",
    deity: "सोम",
    symbol: "हरणाचे मस्तक",
    colors: ["Silver Grey"],
    numbers: [9, 5],
    note: "जिज्ञासू व शोधक वृत्तीशी संबंधित.",
  },
  {
    en: "Ardra",
    mr: "आर्द्रा",
    lord: "Rahu",
    deity: "रुद्र",
    symbol: "अश्रुबिंदू",
    colors: ["Green"],
    numbers: [4, 8],
    note: "बदल व नव्या सुरुवातीशी जोडले जाणारे नक्षत्र.",
  },
  {
    en: "Punarvasu",
    mr: "पुनर्वसु",
    lord: "Jupiter",
    deity: "अदिती",
    symbol: "भाता",
    colors: ["Yellow"],
    numbers: [3, 7],
    note: "पुनरुज्जीवन व मांगल्याशी संबंधित.",
  },
  {
    en: "Pushya",
    mr: "पुष्य",
    lord: "Saturn",
    deity: "बृहस्पती",
    symbol: "कमळ",
    colors: ["Dark Blue"],
    numbers: [8, 3],
    note: "शुभ, पोषक व स्थिर मानले जाणारे नक्षत्र.",
  },
  {
    en: "Ashlesha",
    mr: "आश्लेषा",
    lord: "Mercury",
    deity: "नाग",
    symbol: "वेटोळे",
    colors: ["Dark Brown"],
    numbers: [5, 7],
    note: "सूक्ष्म निरीक्षण व अंतर्ज्ञानाशी संबंधित.",
  },
  {
    en: "Magha",
    mr: "मघा",
    lord: "Ketu",
    deity: "पितर",
    symbol: "राजसिंहासन",
    colors: ["Ivory"],
    numbers: [7, 1],
    note: "परंपरा व कुटुंबाच्या वारशाशी जोडलेले.",
  },
  {
    en: "Purva Phalguni",
    mr: "पूर्वा फाल्गुनी",
    lord: "Venus",
    deity: "भग",
    symbol: "झूला",
    colors: ["Light Brown"],
    numbers: [6, 3],
    note: "आनंद व सृजनशीलतेशी संबंधित.",
  },
  {
    en: "Uttara Phalguni",
    mr: "उत्तरा फाल्गुनी",
    lord: "Sun",
    deity: "अर्यमा",
    symbol: "पलंग",
    colors: ["Bright Blue"],
    numbers: [1, 4],
    note: "मैत्री व सहकार्याशी जोडलेले नक्षत्र.",
  },
  {
    en: "Hasta",
    mr: "हस्त",
    lord: "Moon",
    deity: "सवितृ",
    symbol: "हस्त",
    colors: ["Light Green"],
    numbers: [2, 5],
    note: "कौशल्य व हस्तकलेशी संबंधित.",
  },
  {
    en: "Chitra",
    mr: "चित्रा",
    lord: "Mars",
    deity: "त्वष्टा",
    symbol: "मोती",
    colors: ["Black"],
    numbers: [9, 6],
    note: "कलात्मकता व सौंदर्यदृष्टीशी जोडलेले.",
  },
  {
    en: "Swati",
    mr: "स्वाती",
    lord: "Rahu",
    deity: "वायू",
    symbol: "अंकुर",
    colors: ["Black"],
    numbers: [4, 6],
    note: "स्वतंत्र वृत्ती व लवचिकतेशी संबंधित.",
  },
  {
    en: "Vishakha",
    mr: "विशाखा",
    lord: "Jupiter",
    deity: "इंद्राग्नी",
    symbol: "तोरण",
    colors: ["Golden"],
    numbers: [3, 9],
    note: "ध्येयनिष्ठा व चिकाटीशी जोडलेले.",
  },
  {
    en: "Anuradha",
    mr: "अनुराधा",
    lord: "Saturn",
    deity: "मित्र",
    symbol: "कमळपुष्प",
    colors: ["Reddish Brown"],
    numbers: [8, 2],
    note: "मैत्री व सहकार्याच्या भावनेशी संबंधित.",
  },
  {
    en: "Jyeshtha",
    mr: "ज्येष्ठा",
    lord: "Mercury",
    deity: "इंद्र",
    symbol: "छत्र",
    colors: ["Cream"],
    numbers: [5, 9],
    note: "जबाबदारी व नेतृत्वाशी जोडलेले.",
  },
  {
    en: "Mula",
    mr: "मूळ",
    lord: "Ketu",
    deity: "निर्ऋती",
    symbol: "मूळ",
    colors: ["Brownish Yellow"],
    numbers: [7, 3],
    note: "मूलगामी विचार व शोधवृत्तीशी संबंधित.",
  },
  {
    en: "Purva Ashadha",
    mr: "पूर्वाषाढा",
    lord: "Venus",
    deity: "आप",
    symbol: "पंखा",
    colors: ["Black"],
    numbers: [6, 8],
    note: "आत्मविश्वास व उत्साहाशी जोडलेले.",
  },
  {
    en: "Uttara Ashadha",
    mr: "उत्तराषाढा",
    lord: "Sun",
    deity: "विश्वेदेव",
    symbol: "हस्तिदंत",
    colors: ["Copper"],
    numbers: [1, 8],
    note: "स्थैर्य व सचोटीशी संबंधित.",
  },
  {
    en: "Shravana",
    mr: "श्रवण",
    lord: "Moon",
    deity: "विष्णू",
    symbol: "तीन पावले",
    colors: ["Light Blue"],
    numbers: [2, 1],
    note: "ऐकण्याची व शिकण्याची वृत्ती दर्शवणारे.",
  },
  {
    en: "Dhanishta",
    mr: "धनिष्ठा",
    lord: "Mars",
    deity: "वसु",
    symbol: "मृदंग",
    colors: ["Silver Grey"],
    numbers: [9, 8],
    note: "लय, संगीत व समृद्धीशी जोडलेले.",
  },
  {
    en: "Shatabhisha",
    mr: "शततारका",
    lord: "Rahu",
    deity: "वरुण",
    symbol: "वर्तुळ",
    colors: ["Blue Green"],
    numbers: [4, 7],
    note: "संशोधक व स्वतंत्र वृत्तीशी संबंधित.",
  },
  {
    en: "Purva Bhadrapada",
    mr: "पूर्वा भाद्रपदा",
    lord: "Jupiter",
    deity: "अजैकपाद",
    symbol: "तलवार",
    colors: ["Silver Grey"],
    numbers: [3, 8],
    note: "चिंतनशील व तत्त्वनिष्ठ वृत्तीशी जोडलेले.",
  },
  {
    en: "Uttara Bhadrapada",
    mr: "उत्तरा भाद्रपदा",
    lord: "Saturn",
    deity: "अहिर्बुध्न्य",
    symbol: "जुळे पाय",
    colors: ["Purple"],
    numbers: [8, 7],
    note: "शांत, संयमी स्वभावाशी संबंधित.",
  },
  {
    en: "Revati",
    mr: "रेवती",
    lord: "Mercury",
    deity: "पूषा",
    symbol: "मासा",
    colors: ["Brown"],
    numbers: [5, 3],
    note: "कोमल, प्रेमळ स्वभावाशी जोडलेले नक्षत्र.",
  },
];

/** Marathi first-syllable suggestions traditionally linked to each nakshatra pada. */
export const NAKSHATRA_SYLLABLES: string[][] = [
  ["चू", "चे", "चो", "ला"],
  ["ली", "लू", "ले", "लो"],
  ["अ", "ई", "उ", "ए"],
  ["ओ", "वा", "वी", "वू"],
  ["वे", "वो", "का", "की"],
  ["कू", "घ", "ङ", "छ"],
  ["के", "को", "हा", "ही"],
  ["हू", "हे", "हो", "डा"],
  ["डी", "डू", "डे", "डो"],
  ["मा", "मी", "मू", "मे"],
  ["मो", "टा", "टी", "टू"],
  ["टे", "टो", "पा", "पी"],
  ["पू", "ष", "ण", "ठ"],
  ["पे", "पो", "रा", "री"],
  ["रू", "रे", "रो", "ता"],
  ["ती", "तू", "ते", "तो"],
  ["ना", "नी", "नू", "ने"],
  ["नो", "या", "यी", "यू"],
  ["ये", "यो", "भा", "भी"],
  ["भू", "धा", "फा", "ढा"],
  ["भे", "भो", "जा", "जी"],
  ["खी", "खू", "खे", "खो"],
  ["गा", "गी", "गू", "गे"],
  ["गो", "सा", "सी", "सू"],
  ["से", "सो", "दा", "दी"],
  ["दू", "थ", "झ", "ञ"],
  ["दे", "दो", "चा", "ची"],
];

export const VIMSHOTTARI_YEARS: Record<string, number> = {
  Ketu: 7,
  Venus: 20,
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17,
};

export const VIMSHOTTARI_ORDER = [
  "Ketu",
  "Venus",
  "Sun",
  "Moon",
  "Mars",
  "Rahu",
  "Jupiter",
  "Saturn",
  "Mercury",
];

export function degreeLabel(deg: number) {
  const d = Math.floor(deg);
  const m = Math.floor((deg - d) * 60);
  return `${d}° ${String(m).padStart(2, "0")}'`;
}

/** Stable cache key from the exact birth details + calculation configuration. */
export function kundaliSignature(
  bornAt: number,
  place: BirthPlace,
  config = "lahiri-whole-sign-v1",
) {
  return [
    bornAt,
    place.name,
    place.latitude.toFixed(4),
    place.longitude.toFixed(4),
    place.timezone,
    config,
  ].join("|");
}
