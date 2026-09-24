"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function Window({
  title,
  zIndex,
  isActive,
  initial,
  width = 480,
  onClose,
  onFocus,
  children,
}: {
  title: string;
  icon?: ReactNode;
  zIndex: number;
  isActive: boolean;
  initial: { x: number; y: number };
  width?: number;
  onClose: () => void;
  onFocus: () => void;
  children: ReactNode;
}) {
  const [pos, setPos] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const windowRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, winX: 0, winY: 0, w: 0, h: 0 });

  useEffect(() => {
    function clampToViewport() {
      const el = windowRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPos((p) => ({
        x: clamp(p.x, 0, Math.max(0, window.innerWidth - rect.width)),
        y: clamp(p.y, 0, Math.max(0, window.innerHeight - rect.height)),
      }));
    }
    clampToViewport();
    window.addEventListener("resize", clampToViewport);
    return () => window.removeEventListener("resize", clampToViewport);
  }, []);

  useEffect(() => {
    if (!dragging) return;

    function onMove(e: PointerEvent) {
      const dx = e.clientX - dragStart.current.mouseX;
      const dy = e.clientY - dragStart.current.mouseY;
      setPos({
        x: clamp(
          dragStart.current.winX + dx,
          0,
          Math.max(0, window.innerWidth - dragStart.current.w)
        ),
        y: clamp(
          dragStart.current.winY + dy,
          0,
          Math.max(0, window.innerHeight - dragStart.current.h)
        ),
      });
    }
    function onUp() {
      setDragging(false);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging]);

  function onTitlePointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("[data-titlebar-button]")) return;
    onFocus();
    const rect = windowRef.current?.getBoundingClientRect();
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      winX: pos.x,
      winY: pos.y,
      w: rect?.width ?? 0,
      h: rect?.height ?? 0,
    };
    setDragging(true);
  }

  return (
    <div
      ref={windowRef}
      className="aqua-window absolute flex flex-col"
      style={{
        left: pos.x,
        top: pos.y,
        width: `min(92vw, ${width}px)`,
        maxHeight: "88vh",
        zIndex,
      }}
      onPointerDown={onFocus}
    >
      <div
        onPointerDown={onTitlePointerDown}
        className={`flex shrink-0 touch-none select-none items-center py-1.5 pl-3 pr-3 ${
          isActive ? "aqua-titlebar" : "aqua-titlebar-inactive"
        }`}
      >
        <div className="flex shrink-0 items-center gap-[7px]">
          <button
            data-titlebar-button
            aria-label="Close"
            onClick={onClose}
            className="aqua-dot aqua-dot-red"
          >
            <span className="aqua-dot-glyph">✕</span>
          </button>
          <span className="aqua-dot aqua-dot-yellow" aria-hidden />
          <span className="aqua-dot aqua-dot-green" aria-hidden />
        </div>
        <span className="flex-1 truncate px-2 text-center text-[13px] font-medium text-black/80">
          {title}
        </span>
        <div className="w-[52px] shrink-0" aria-hidden />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-chrome">{children}</div>
    </div>
  );
}
