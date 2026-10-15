"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const SLIVER = 48;

export function Window({
  title,
  zIndex,
  isActive,
  initial,
  width = 480,
  hidden = false,
  origin,
  getCloseOrigin,
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
  hidden?: boolean;
  origin?: { x: number; y: number };
  getCloseOrigin?: () => { x: number; y: number } | undefined;
  onClose: () => void;
  onFocus: () => void;
  children: ReactNode;
}) {
  const [pos, setPos] = useState(initial);
  const [dragging, setDragging] = useState(false);
  const windowRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, winX: 0, winY: 0, w: 0, h: 0 });

  // grow out of the icon it was opened from (mount == open)
  useLayoutEffect(() => {
    const el = windowRef.current;
    if (!el || !origin) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // offset* ignore transforms, so a re-run (StrictMode) mid-animation
    // still measures the window's real resting place
    const dx = origin.x - (el.offsetLeft + el.offsetWidth / 2);
    const dy = origin.y - (el.offsetTop + el.offsetHeight / 2);
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) scale(0.1)`, opacity: 0 },
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
      ],
      { duration: 270, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
    );
    // runs once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // slide to the nearest side edge, leaving a sliver to click to bring it back
  useEffect(() => {
    const el = windowRef.current;
    if (!el) return;
    if (!hidden) {
      el.style.transform = "";
      return;
    }
    const rect = el.getBoundingClientRect();
    const toLeft = rect.left + rect.width / 2 < window.innerWidth / 2;
    const dx = toLeft ? -(rect.right - SLIVER) : window.innerWidth - rect.left - SLIVER;
    el.style.transform = `translateX(${dx}px)`;
  }, [hidden]);

  // inverse of the open animation: shrink back into the icon, then unmount
  function requestClose() {
    if (closingRef.current) return;
    const el = windowRef.current;
    const target = getCloseOrigin?.() ?? origin;
    if (
      !el ||
      !target ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      onClose();
      return;
    }
    closingRef.current = true;
    const dx = target.x - (el.offsetLeft + el.offsetWidth / 2);
    const dy = target.y - (el.offsetTop + el.offsetHeight / 2);
    const anim = el.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.1)`, opacity: 0 },
      ],
      { duration: 270, easing: "cubic-bezier(0.32, 0, 0.67, 0)", fill: "forwards" }
    );
    anim.onfinish = onClose;
  }

  useEffect(() => {
    if (!isActive || hidden) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, hidden, onClose, getCloseOrigin, origin]);

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
        transition: "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
      }}
      onPointerDown={onFocus}
    >
      <div
        onPointerDown={onTitlePointerDown}
        className={`flex shrink-0 touch-none select-none items-center py-1.5 pl-3 pr-3 ${
          isActive ? "aqua-titlebar" : "aqua-titlebar-inactive"
        }`}
      >
        <div className="flex shrink-0 items-center">
          <button
            data-titlebar-button
            aria-label="Close"
            onClick={requestClose}
            className="aqua-dot aqua-dot-red"
          >
            <span className="aqua-dot-glyph">✕</span>
          </button>
        </div>
        <span className="flex-1 truncate px-2 text-center text-[13px] font-medium text-black/80">
          {title}
        </span>
        <div className="w-[13px] shrink-0" aria-hidden />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-chrome">{children}</div>
    </div>
  );
}
