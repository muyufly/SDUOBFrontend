export type Orbit = {
  rx: number;
  ry: number;
  /** Light core radius in CSS pixels, independent of the scene's camera fit. */
  radius: number;
  phase: number;
  seconds: number;
  color: string;
};

// Mist blue, soft teal and pale lilac, with variation inside each hue family.
const LIGHT_HUES = [198, 158, 252] as const;

/** Concentric, co-axial ellipses with strictly increasing axes cannot intersect.
 * A stable seed makes existing orbits stay put when the article count grows. */
export function makeOrbits(count: number, seed: number): Orbit[] {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  let rx = 51,
    ry = 26;
  return Array.from({ length: Math.max(0, Math.floor(count)) }, (_, index) => {
    rx += 20 + random() * 16;
    ry += 13 + random() * 9;
    const radius = 1.9 + random() * 0.5;
    const phase = random();
    const seconds = 26 + index * 3 + random() * 28;
    const tone = random() * LIGHT_HUES.length;
    const shade = tone % 1;
    const hue = Math.round(LIGHT_HUES[Math.floor(tone)] + shade * 18);
    return {
      rx,
      ry,
      radius,
      phase,
      seconds,
      color: `hsl(${hue} 14% ${Math.round(54 + shade * 8)}%)`,
    };
  });
}
