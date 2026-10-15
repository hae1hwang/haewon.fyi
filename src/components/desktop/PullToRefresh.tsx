"use client";

import { useState, useSyncExternalStore } from "react";

// iOS browsers (Safari and Chrome alike, since they all use WebKit) don't
// start their own pull-to-refresh on a page that fills the screen and has
// nothing to scroll, so on iOS the gesture is built here. Everywhere else the
// browser's native behavior is left alone.
const TRIGGER = 55; // px of (damped) pull needed to reload
const MAX_PULL = 80;

function detectIOS() {
  const ua = navigator.userAgent;
  // iPadOS reports itself as a Mac, so also check for a touch screen
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function usePullToRefresh() {
  const isIOS = useSyncExternalStore(
    () => () => {},
    detectIOS,
    () => false
  );
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  function onPointerDown(e: React.PointerEvent) {
    if (!isIOS || e.pointerType !== "touch" || refreshing) return;
    const startX = e.clientX;
    const startY = e.clientY;
    let active = false; // true once the touch is clearly a downward pull
    let current = 0;

    function cleanup() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    }
    function onMove(ev: PointerEvent) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!active) {
        if (dy > 10 && dy > Math.abs(dx) * 1.5) active = true;
        else if (Math.abs(dx) > 10 || dy < -10) return cleanup(); // sideways/upwards: not a pull
        else return;
      }
      current = Math.min(Math.max(dy, 0) * 0.5, MAX_PULL); // damped, like a rubber band
      setPull(current);
    }
    function onEnd() {
      cleanup();
      if (!active) return;
      if (current >= TRIGGER) {
        setRefreshing(true);
        setPull(TRIGGER);
        setTimeout(() => window.location.reload(), 350);
      } else {
        setPull(0);
      }
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd);
    window.addEventListener("pointercancel", onEnd);
  }

  return { isIOS, pull, refreshing, onPointerDown };
}

export function PullIndicator({ pull, refreshing }: { pull: number; refreshing: boolean }) {
  if (pull <= 0 && !refreshing) return null;
  const ready = pull >= TRIGGER;
  return (
    <div
      className="pointer-events-none fixed left-1/2 z-[60] flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-accent shadow-[0_2px_8px_rgba(0,0,0,0.25)]"
      style={{
        top: "env(safe-area-inset-top, 0px)",
        transform: `translate(-50%, ${pull - 44}px)`,
        opacity: Math.min(1, pull / 30),
      }}
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
        style={refreshing ? undefined : { transform: `rotate(${ready ? 180 : pull * 3}deg)` }}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {refreshing ? (
          <path d="M21 12a9 9 0 1 1-3-6.7" />
        ) : (
          <>
            <path d="M12 5v14" />
            <path d="m6 13 6 6 6-6" />
          </>
        )}
      </svg>
    </div>
  );
}
