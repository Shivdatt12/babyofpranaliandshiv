import { PLANET_LABELS, RASHIS, type Kundali } from "@/lib/kundali-data";

export function KundaliChart({ chart }: { chart: Kundali }) {
  const labels = chart.houses.map((house) => {
    const planets = house.planets.map((p) => PLANET_LABELS[p]?.short ?? p.slice(0, 2)).join(" ");
    return `${house.house} · ${RASHIS[house.signIndex]?.mr ?? ""}${planets ? `\n${planets}` : ""}`;
  });
  const cells = [
    ["50", "11", 0],
    ["75", "24", 1],
    ["88", "50", 2],
    ["75", "76", 3],
    ["50", "89", 4],
    ["25", "76", 5],
    ["12", "50", 6],
    ["25", "24", 7],
    ["50", "37", 8],
    ["63", "50", 9],
    ["50", "63", 10],
    ["37", "50", 11],
  ] as const;
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label="North Indian style Vedic birth chart"
      className="mx-auto w-full max-w-sm text-foreground"
    >
      <rect
        x="1"
        y="1"
        width="98"
        height="98"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M1 1L99 99M99 1L1 99M1 1L50 50L99 1L50 50L99 99L50 50L1 99Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="0.7"
      />
      {cells.map(([x, y, i]) => (
        <text
          key={i}
          x={x}
          y={y}
          textAnchor="middle"
          className="fill-current text-[4px] font-semibold whitespace-pre"
        >
          <tspan x={x}>{labels[i]?.split("\n")[0]}</tspan>
          <tspan x={x} dy="5">
            {labels[i]?.split("\n")[1]}
          </tspan>
        </text>
      ))}
      <text x="50" y="49" textAnchor="middle" className="fill-current text-[3.4px] font-bold">
        लग्न
      </text>
    </svg>
  );
}
