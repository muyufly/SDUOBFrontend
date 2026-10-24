import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import type { Note, Page } from "@/api/types";
import { useApi } from "@/api/hooks";
import { makeOrbits } from "./orbits";
import { mountGalaxy, type GalaxyView } from "./galaxy-renderer";

function readSeed() {
  try {
    const saved = localStorage.getItem("sdu.galaxy-seed");
    if (saved !== null && Number.isFinite(Number(saved))) return Number(saved);
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    localStorage.setItem("sdu.galaxy-seed", String(seed));
    return seed;
  } catch {
    return 314159;
  }
}

export function ArticleGalaxy() {
  // Deliberately independent of homepage filters, follows and pagination.
  // The public API total excludes private drafts and hidden content.
  const query = useApi<Page<Note>>("/notes?feed=latest&page=1&pageSize=1");
  const [seed] = useState(readSeed);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const canvas = useRef<HTMLCanvasElement>(null);
  const view = useRef<GalaxyView>({ time: 0, yaw: -0.2, pitch: 0.67, zoom: 1 });
  const total = query.data?.total;
  const orbits = useMemo(() => makeOrbits(total ?? 0, seed), [total, seed]);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(preference.matches);
    preference.addEventListener("change", change);
    return () => preference.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) void query.refetch();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [query.refetch]);
  useEffect(() => {
    if (canvas.current)
      return mountGalaxy(
        canvas.current,
        orbits,
        view.current,
        !paused && !reduced,
      );
  }, [paused, reduced, orbits]);
  const label =
    total === undefined
      ? "正在读取文章星系"
      : `文章星系：${total} 篇公开文章，${total} 颗行星`;
  return (
    <figure className="article-galaxy">
      <canvas
        ref={canvas}
        className="galaxy-canvas"
        role="img"
        aria-label={
          label +
          "。按住左键拖动或使用方向键上下左右环绕，滚轮或加减键缩放，Home 键复位。"
        }
        tabIndex={0}
        data-planets={total ?? ""}
        data-orbits={orbits.length}
        data-motion={!paused && !reduced ? "running" : "paused"}
      >
        文章星系：每篇公开文章对应一颗行星。中央恒星由球形点云构成。
      </canvas>
      <figcaption>
        <span aria-live="polite">
          {query.isError ? (
            "星系数据暂不可用"
          ) : total === undefined ? (
            "正在读取星系…"
          ) : (
            <>
              <strong>{total}</strong> 篇文章 · <strong>{total}</strong> 颗行星
            </>
          )}
        </span>
        {query.isError ? (
          <button
            className="galaxy-control"
            onClick={() => void query.refetch()}
            aria-label="重新读取星系"
          >
            <RotateCcw size={14} />
            重试
          </button>
        ) : !reduced && total !== undefined ? (
          <button
            className="galaxy-control"
            onClick={() => setPaused(!paused)}
            aria-label={paused ? "继续星系动画" : "暂停星系动画"}
          >
            {paused ? <Play size={14} /> : <Pause size={14} />}
          </button>
        ) : null}
      </figcaption>
      {total === 0 && <p className="galaxy-hint">等待第一颗行星</p>}
    </figure>
  );
}
