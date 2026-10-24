import type { Orbit } from "./orbits";

type Point = { x: number; y: number; z: number };
type Projection = { x: number; y: number; z: number; scale: number };
export type GalaxyView = {
  time: number;
  yaw: number;
  pitch: number;
  zoom: number;
};
type Dot = Point & { size: number; color: string };
type Mark = { depth: number; draw: () => void };
const TAU = Math.PI * 2;
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** A spherical point cloud is part of the star, separate from article planets. */
const cloud: Dot[] = Array.from({ length: 620 }, (_, i) => {
  const latitude = Math.acos(1 - (2 * (i + 0.5)) / 620),
    longitude = i * Math.PI * (3 - Math.sqrt(5));
  const radius = 27 + (Math.sin(i * 13.37) + 1) * 2;
  const tone = (Math.sin(i * 7.17) + 1) / 2;
  const mix = (a: number, b: number) => Math.round(a + (b - a) * tone);
  return {
    x: radius * Math.sin(latitude) * Math.cos(longitude),
    y: radius * Math.cos(latitude),
    z: radius * Math.sin(latitude) * Math.sin(longitude),
    size: 0.65 + (Math.sin(i * 3.23) + 1) * 0.42,
    color: `rgb(${mix(33, 199)},${mix(36, 176)},${mix(31, 123)})`,
  };
});

/** Perspective camera and depth-sorted primitives; no external 3D runtime required. */
export function mountGalaxy(
  canvas: HTMLCanvasElement,
  orbits: Orbit[],
  view: GalaxyView,
  motion: boolean,
) {
  const context = canvas.getContext("2d");
  if (!context) return () => {};
  const ctx = context;
  let width = 1,
    height = 1,
    raf = 0,
    last = 0,
    dragging = false,
    lastX = 0,
    lastY = 0,
    dirty = true;
  let activePointer: number | null = null;
  const outer = orbits.at(-1);
  const rx = outer?.rx ?? 53,
    ry = outer?.ry ?? 50;
  const sceneRadius = Math.max(32, outer?.rx ?? 0, outer?.ry ?? 0);
  const distance = Math.max(300, rx * 4);
  const segments = orbits.map((orbit) =>
    Array.from({ length: 121 }, (_, i) => ({
      x: orbit.rx * Math.cos((i / 120) * TAU),
      y: 0,
      z: orbit.ry * Math.sin((i / 120) * TAU),
    })),
  );
  function project(point: Point): Projection {
    const cy = Math.cos(view.yaw),
      sy = Math.sin(view.yaw),
      cp = Math.cos(view.pitch),
      sp = Math.sin(view.pitch);
    const x = point.x * cy + point.z * sy,
      z = -point.x * sy + point.z * cy;
    const y = point.y * cp - z * sp,
      depth = point.y * sp + z * cp;
    // Fit a bounding sphere once per viewport, independent of camera angles.
    // Rotation must not change zoom, including when crossing either pole.
    const fittedScale =
      (Math.min(width, height) / (2 * (sceneRadius + 12))) * 0.9;
    const scale = fittedScale * view.zoom;
    const perspective = distance / (distance - depth);
    return {
      x: width / 2 + x * scale * perspective,
      y: height / 2 + y * scale * perspective,
      z: depth,
      scale: scale * perspective,
    };
  }
  function draw() {
    ctx.clearRect(0, 0, width, height);
    const marks: Mark[] = [];
    for (let i = 0; i < orbits.length; i++) {
      const orbit = orbits[i],
        path = segments[i].map(project);
      for (let j = 1; j < path.length; j++) {
        const a = path[j - 1],
          b = path[j];
        const depth = (a.z + b.z) / 2;
        marks.push({
          depth,
          draw: () => {
            ctx.globalAlpha = 0.2 + 0.23 * clamp((depth + ry) / (ry * 2), 0, 1);
            ctx.strokeStyle = "#8c918a";
            ctx.lineWidth = 0.65;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          },
        });
      }
      const angle = orbit.phase * TAU + (view.time / orbit.seconds) * TAU;
      const planet = project({
        x: orbit.rx * Math.cos(angle),
        y: 0,
        z: orbit.ry * Math.sin(angle),
      });
      // Keep the light small on large canvases; depth only changes it slightly.
      const radius = orbit.radius * clamp(planet.scale, 0.95, 1.15);
      marks.push({
        depth: planet.z,
        draw: () => {
          const haloRadius = radius * 3.5;
          const halo = ctx.createRadialGradient(
            planet.x,
            planet.y,
            0,
            planet.x,
            planet.y,
            haloRadius,
          );
          halo.addColorStop(0, orbit.color);
          halo.addColorStop(0.25, orbit.color);
          halo.addColorStop(1, "transparent");
          ctx.globalAlpha = 0.14;
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(planet.x, planet.y, haloRadius, 0, TAU);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.fillStyle = orbit.color;
          ctx.beginPath();
          ctx.arc(planet.x, planet.y, radius, 0, TAU);
          ctx.fill();
        },
      });
    }
    const spin = view.time * 0.12,
      cos = Math.cos(spin),
      sin = Math.sin(spin);
    for (const dot of cloud) {
      const p = project({
        x: dot.x * cos + dot.z * sin,
        y: dot.y,
        z: -dot.x * sin + dot.z * cos,
      });
      marks.push({
        depth: p.z,
        draw: () => {
          ctx.globalAlpha = 0.24 + 0.76 * clamp((p.z + 32) / 64, 0, 1);
          ctx.fillStyle = dot.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.55, dot.size * p.scale * 0.78), 0, TAU);
          ctx.fill();
        },
      });
    }
    marks.sort((a, b) => a.depth - b.depth).forEach((mark) => mark.draw());
    ctx.globalAlpha = 1;
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    dirty = true;
  }
  function frame(now: number) {
    const delta = last ? Math.min((now - last) / 1000, 0.1) : 0;
    if (motion && !document.hidden) view.time += delta;
    if (dirty || (motion && !document.hidden)) {
      draw();
      dirty = false;
    }
    last = now;
    raf = requestAnimationFrame(frame);
  }
  function down(event: PointerEvent) {
    if (event.button !== 0 || !event.isPrimary) return;
    activePointer = event.pointerId;
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    canvas.focus({ preventScroll: true });
  }
  function move(event: PointerEvent) {
    if (!dragging || event.pointerId !== activePointer) return;
    view.yaw = (view.yaw + (event.clientX - lastX) * 0.006) % TAU;
    view.pitch = (view.pitch + (event.clientY - lastY) * 0.004) % TAU;
    lastX = event.clientX;
    lastY = event.clientY;
    dirty = true;
  }
  function up(event: PointerEvent) {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    dragging = false;
    if (canvas.hasPointerCapture(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
  }
  function zoomBy(factor: number) {
    view.zoom = clamp(view.zoom * factor, 0.55, 2.5);
    dirty = true;
  }
  function wheel(event: WheelEvent) {
    event.preventDefault();
    const unit =
      event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1;
    const delta = clamp(event.deltaY * unit, -240, 240);
    zoomBy(Math.exp(-delta * 0.0015));
  }
  function key(event: KeyboardEvent) {
    const changes: Record<string, [number, number]> = {
      ArrowLeft: [-0.12, 0],
      ArrowRight: [0.12, 0],
      ArrowUp: [0, -0.08],
      ArrowDown: [0, 0.08],
    };
    if (changes[event.key]) {
      event.preventDefault();
      view.yaw = (view.yaw + changes[event.key][0]) % TAU;
      view.pitch = (view.pitch + changes[event.key][1]) % TAU;
      dirty = true;
    }
    if (event.key === "Home") {
      event.preventDefault();
      view.yaw = -0.2;
      view.pitch = 0.67;
      view.zoom = 1;
      dirty = true;
    }
    if (["+", "=", "-", "_"].includes(event.key)) {
      event.preventDefault();
      zoomBy(event.key === "-" || event.key === "_" ? 1 / 1.15 : 1.15);
    }
  }
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("lostpointercapture", up);
  canvas.addEventListener("wheel", wheel, { passive: false });
  canvas.addEventListener("keydown", key);
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  raf = requestAnimationFrame(frame);
  return () => {
    cancelAnimationFrame(raf);
    observer.disconnect();
    canvas.removeEventListener("pointerdown", down);
    canvas.removeEventListener("pointermove", move);
    canvas.removeEventListener("pointerup", up);
    canvas.removeEventListener("pointercancel", up);
    canvas.removeEventListener("lostpointercapture", up);
    canvas.removeEventListener("wheel", wheel);
    canvas.removeEventListener("keydown", key);
  };
}
