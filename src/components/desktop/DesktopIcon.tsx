"use client";

import type { ReactNode } from "react";

export function DesktopIcon({
  label,
  icon,
  iconSize = 110,
  iconOffsetTop = 0,
  onOpen,
}: {
  label: string;
  icon: ReactNode;
  iconSize?: number;
  iconOffsetTop?: number;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="group relative h-[140px] w-[140px] shrink-0 outline-none"
    >
      <span
        className="absolute left-1/2 -translate-x-1/2 drop-shadow-[0_4px_5px_rgba(0,0,0,0.55)] transition-transform group-active:scale-95 [&>img]:h-full [&>img]:w-full [&>svg]:h-full [&>svg]:w-full"
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
