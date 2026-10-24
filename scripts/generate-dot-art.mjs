// Original divider artwork, built from discrete ink-to-gold dots.
import fs from "node:fs";
const mix = (a, b, t) => Math.round(a + (b - a) * t);
const color = (t) =>
  `rgb(${mix(35, 199, t)},${mix(37, 179, t)},${mix(33, 128, t)})`;
const rule = Array.from({ length: 160 }, (_, i) => {
  const t = i / 159;
  return `<circle cx="${i * 8 + 2}" cy="3" r="${(1.1 + (1 - t) * 0.45).toFixed(2)}" fill="${color(t)}"/>`;
});
fs.writeFileSync(
  "public/dot-rule.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 6">${rule.join("")}</svg>`,
);
