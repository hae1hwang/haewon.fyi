"use client";

import type { ReactNode } from "react";

export function DesktopIcon({
  label,
  icon,
  iconSize = 110,
  iconOffsetTop = 0,
  onPointerDown,
  onKeyboardOpen,
}: {
  label: string;
  icon: ReactNode;
  iconSize?: number;
  iconOffsetTop?: number;
  onPointerDown: (e: React.PointerEvent) => void;
  onKeyboardOpen: () => void;
}) {
  return (
    <button
      onPointerDown={onPointerDown}
      // pointer clicks are handled by the drag logic; detail === 0 is a
      // keyboard-triggered click (Enter / Space)
      onClick={(e) => {
        if (e.detail === 0) onKeyboardOpen();
      }}
      className="group relative h-[140px] w-[140px] shrink-0 touch-none outline-none"
    >
      <span
        className="absolute left-1/2 -translate-x-1/2 drop-shadow-[0_4px_5px_rgba(0,0,0,0.55)] [&>img]:pointer-events-none [&>img]:h-full [&>img]:w-full [&>img]:[-webkit-user-drag:none] [&>svg]:h-full [&>svg]:w-full"
        style={{ height: iconSize, width: iconSize, top: iconOffsetTop }}
      >
        {icon}
      </span>
      <span
        className="absolute bottom-0 left-1/2 flex h-[20px] w-max -translate-x-1/2 items-center justify-center whitespace-nowrap rounded-md px-1.5 text-center text-[12px] leading-tight text-white group-hover:bg-[var(--aqua-accent)]/85 group-focus-visible:bg-[var(--aqua-accent)]/85"
        style={{ textShadow: "0 1px 3px rgba(0,0,0,0.55)" }}
      >
        {label}
      </span>
    </button>
  );
}
