import { useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Note } from "@/api/types";

export function ArticleGallery({
  images,
  title,
}: {
  images: Note["images"];
  title: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const swipe = useRef<{ x: number; y: number; pointerId: number } | null>(
    null,
  );
  const stageId = useId();
  const thumbnails = useRef<HTMLDivElement>(null);
  const index = Math.max(
    0,
    images.findIndex((image) => image.id === selectedId),
  );
  useEffect(() => {
    const strip = thumbnails.current;
    const button = strip?.querySelector<HTMLButtonElement>(
      '[aria-pressed="true"]',
    );
    if (!strip || !button) return;
    const left = button.offsetLeft;
    const right = left + button.offsetWidth;
    if (left < strip.scrollLeft) strip.scrollLeft = left;
    else if (right > strip.scrollLeft + strip.clientWidth)
      strip.scrollLeft = right - strip.clientWidth;
  }, [index, images.length]);
  if (!images.length) return null;
  const current = images[index];
  const multiple = images.length > 1;
  const move = (direction: number) =>
    setSelectedId(
      images[(index + direction + images.length) % images.length].id,
    );

  return (
    <section
      className="article-gallery"
      role="region"
      aria-roledescription={multiple ? "轮播图" : undefined}
      aria-label="文章图片"
      tabIndex={multiple ? 0 : undefined}
      onKeyDown={(event) => {
        if (!multiple) return;
        switch (event.key) {
          case "ArrowLeft":
            event.preventDefault();
            move(-1);
            break;
          case "ArrowRight":
            event.preventDefault();
            move(1);
            break;
          case "Home":
            event.preventDefault();
            setSelectedId(images[0].id);
            break;
          case "End":
            event.preventDefault();
            setSelectedId(images[images.length - 1].id);
            break;
        }
      }}
    >
      <div
        id={stageId}
        className={`article-gallery-stage ${multiple ? "is-swipeable" : ""}`}
        role="group"
        aria-roledescription={multiple ? "幻灯片" : undefined}
        aria-label={`第 ${index + 1} 张，共 ${images.length} 张`}
        onPointerDown={(event) => {
          if (!multiple || !event.isPrimary || event.button !== 0) return;
          swipe.current = {
            x: event.clientX,
            y: event.clientY,
            pointerId: event.pointerId,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerUp={(event) => {
          const start = swipe.current;
          swipe.current = null;
          if (!start || start.pointerId !== event.pointerId) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          const threshold = Math.max(
            44,
            event.currentTarget.clientWidth * 0.12,
          );
          if (Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy) * 1.3)
            move(dx < 0 ? 1 : -1);
        }}
        onPointerCancel={() => {
          swipe.current = null;
        }}
        onLostPointerCapture={() => {
          swipe.current = null;
        }}
      >
        <img
          key={current.id}
          src={current.url}
          alt={`${title || "文章"} · 图片 ${index + 1}`}
          draggable={false}
        />
      </div>
      {multiple && (
        <>
          <div className="article-gallery-toolbar">
            <span
              className="article-gallery-count"
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              {index + 1} / {images.length}
            </span>
            <div className="article-gallery-controls">
              <button
                type="button"
                className="btn btn-secondary"
                aria-label="上一张图片"
                aria-controls={stageId}
                onClick={() => move(-1)}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                aria-label="下一张图片"
                aria-controls={stageId}
                onClick={() => move(1)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
          <div
            ref={thumbnails}
            className="article-gallery-thumbnails"
            role="group"
            aria-label="选择图片"
          >
            {images.map((image, i) => (
              <button
                type="button"
                key={image.id}
                aria-label={`查看第 ${i + 1} 张图片`}
                aria-pressed={i === index}
                aria-controls={stageId}
                onClick={() => setSelectedId(image.id)}
              >
                <img src={image.url} alt="" loading="lazy" draggable={false} />
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
