import { describe, expect, it } from "vitest";
import { makeOrbits } from "../../src/features/discovery/orbits";
describe("article galaxy", () => {
  it("has exactly one planet per public article, including an empty service", () => {
    for (const count of [0, 1, 12, 500])
      expect(makeOrbits(count, 7)).toHaveLength(count);
  });
  it("keeps both axes strictly increasing so random ellipses never intersect", () => {
    for (const seed of [0, 1, 42, 999]) {
      const paths = makeOrbits(500, seed);
      for (let i = 1; i < paths.length; i++) {
        expect(paths[i].rx).toBeGreaterThan(paths[i - 1].rx);
        expect(paths[i].ry).toBeGreaterThan(paths[i - 1].ry);
        expect(paths[i].ry - paths[i - 1].ry).toBeGreaterThan(
          paths[i].radius + paths[i - 1].radius,
        );
      }
    }
  });
  it("keeps existing trajectories stable as articles arrive, but varies by seed", () => {
    expect(makeOrbits(9, 22).slice(0, 8)).toEqual(makeOrbits(8, 22));
    expect(makeOrbits(8, 22)).not.toEqual(makeOrbits(8, 23));
  });
});
