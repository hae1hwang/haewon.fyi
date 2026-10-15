"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Wallpaper } from "./Wallpaper";
import { DesktopIcon } from "./DesktopIcon";
import { Footer } from "./Footer";
import { PullIndicator, usePullToRefresh } from "./PullToRefresh";
import { Window } from "./Window";
import { NoteIcon, MailIcon, WorkFolderIcon, FunFolderIcon } from "./icons";
import { AboutWindow } from "./windows/AboutWindow";
import { FinderWindow } from "./windows/FinderWindow";
import { site } from "@/data/site";
import { ContactWindow } from "./windows/ContactWindow";
import { ProjectWindow } from "./windows/ProjectWindow";
import { parseProjectWindowId, projectWindowId } from "./projects";

type Offset = { x: number; y: number };

// the icons on the desktop; project windows are opened from the work folder
// and only get an id when opened
type DesktopId = "about" | "fun" | "work" | "contact";
type WindowId = string;

type AppContext = {
  openProject: (folder: string, title: string, origin: Offset) => void;
};

const APPS: Record<
  DesktopId,
  {
    title: string;
    icon: React.ReactNode;
    iconSize?: number;
    iconOffsetTop?: number;
    initial: { x: number; y: number };
    width: number;
    // rough opening height, only used to keep a random position on screen
    height: number;
    render: (ctx: AppContext) => React.ReactNode;
  }
> = {
  about: {
    title: "about.txt",
    icon: <NoteIcon shadowed />,
    initial: { x: 40, y: 60 },
    width: 460,
    height: 545,
    render: ({ openProject }) => <AboutWindow onOpenProject={openProject} />,
  },
  fun: {
    title: "fun",
    icon: <FunFolderIcon shadowed />,
    initial: { x: 90, y: 100 },
    width: 420,
    height: 415,
    render: ({ openProject }) => (
      <FinderWindow
        root="fun"
        folders={site.funFolders}
        firstColumnLabel="Name"
        showPlatform={false}
        onOpenProject={openProject}
      />
    ),
  },
  work: {
    title: "work",
    icon: <WorkFolderIcon shadowed />,
    initial: { x: 60, y: 40 },
    width: 420,
    height: 415,
    render: ({ openProject }) => (
      <FinderWindow
        root="work"
        folders={site.workFolders}
        firstColumnLabel="Team"
        showPlatform
        onOpenProject={openProject}
      />
    ),
  },
  contact: {
    title: "Contact",
    icon: <MailIcon shadowed />,
    iconSize: 96,
    iconOffsetTop: 10,
    initial: { x: 120, y: 150 },
    width: 420,
    height: 320,
    render: () => <ContactWindow />,
  },
};

const DESKTOP_ICONS: { id: DesktopId; label: string }[] = [
  { id: "about", label: "about.txt" },
  { id: "work", label: "work" },
  { id: "fun", label: "fun" },
  { id: "contact", label: "Contact" },
];

const PROJECT_WINDOW = { width: 520, height: 260 };

// Picks where a new window opens on desktop: random, but preferring spots
// that don't cover the windows already open (a little overlap is fine).
// On mobile windows are centered by CSS, so the fallback is used as-is.
function pickWindowPosition(width: number, height: number, fallback: Offset): Offset {
  if (window.matchMedia("(max-width: 639px)").matches) return fallback;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(vw * 0.92, width);
  const h = Math.min(vh * 0.88, height);
  const EDGE = 20;
  const FOOTER = 60;
  const maxX = Math.max(0, vw - w - EDGE);
  const maxY = Math.max(0, vh - h - FOOTER);
  const taken = Array.from(document.querySelectorAll(".aqua-window")).map((el) =>
    el.getBoundingClientRect()
  );

  const candidates = Array.from({ length: 24 }, () => {
    const x = EDGE + Math.random() * Math.max(0, maxX - EDGE);
    const y = EDGE + Math.random() * Math.max(0, maxY - EDGE);
    let overlap = 0;
    for (const t of taken) {
      const ix = Math.max(0, Math.min(x + w, t.right) - Math.max(x, t.left));
      const iy = Math.max(0, Math.min(y + h, t.bottom) - Math.max(y, t.top));
      overlap += ix * iy;
    }
    return { x, y, overlap: overlap / (w * h) };
  });
  const roomy = candidates.filter((c) => c.overlap <= 0.3);
  const pool = roomy.length ? roomy : [candidates.reduce((a, b) => (b.overlap < a.overlap ? b : a))];
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return { x: Math.round(pick.x), y: Math.round(pick.y) };
}

type WinState = { open: boolean; z: number; origin?: Offset; initial?: Offset };

export function Desktop({ lastUpdated }: { lastUpdated: string }) {
  const [windows, setWindows] = useState<Record<WindowId, WinState>>({
    about: { open: false, z: 0 },
    fun: { open: false, z: 0 },
    work: { open: false, z: 0 },
    contact: { open: false, z: 0 },
  });
  const [zCounter, setZCounter] = useState(1);
  // drag offsets from each icon's natural place in the centered row, so the
  // row keeps reflowing on resize and dragged icons simply sit on top of it
  const [iconOffset, setIconOffset] = useState<Partial<Record<DesktopId, Offset>>>({});
  const [lastDragged, setLastDragged] = useState<DesktopId | null>(null);
  const draggingRef = useRef(false);
  // "show desktop": clicking the background slides open windows to the edges
  const [windowsHidden, setWindowsHidden] = useState(false);
  const pullToRefresh = usePullToRefresh();

  useEffect(() => {
    let width = window.innerWidth;
    function onResize() {
      // reflow resets the arrangement so nothing is stranded off-screen
      // (ignore height-only changes, e.g. mobile address bar)
      if (window.innerWidth === width || draggingRef.current) return;
      width = window.innerWidth;
      setIconOffset({});
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function nextZ() {
    const z = zCounter + 1;
    setZCounter(z);
    return z;
  }

  // origin is the icon's center, so the window can grow out of it
  function openWindow(id: WindowId, origin: Offset) {
    setWindowsHidden(false);
    const app = APPS[id as DesktopId];
    const initial = windows[id]?.open
      ? undefined
      : pickWindowPosition(app.width, app.height, app.initial);
    setWindows((w) => ({
      ...w,
      [id]: { open: true, z: nextZ(), origin, initial: initial ?? w[id]?.initial },
    }));
  }

  // each project file opens in its own window
  function openProject(folder: string, title: string, origin: Offset) {
    const id = projectWindowId(folder, title);
    setWindowsHidden(false);
    const initial = windows[id]?.open
      ? undefined
      : pickWindowPosition(PROJECT_WINDOW.width, PROJECT_WINDOW.height, { x: 140, y: 90 });
    setWindows((w) => ({
      ...w,
      [id]: { open: true, z: nextZ(), origin, initial: initial ?? w[id]?.initial },
    }));
  }

  function getApp(id: WindowId) {
    if (id in APPS) return APPS[id as DesktopId];
    const project = parseProjectWindowId(id);
    return {
      title: project?.title ?? "",
      icon: <NoteIcon />,
      initial: { x: 140, y: 90 },
      width: PROJECT_WINDOW.width,
      height: PROJECT_WINDOW.height,
      render: () => <ProjectWindow folder={project?.folder ?? ""} title={project?.title ?? ""} />,
    };
  }

  function focusWindow(id: WindowId) {
    setWindowsHidden(false);
    setWindows((w) => ({ ...w, [id]: { ...w[id], z: nextZ() } }));
  }

  function closeWindow(id: WindowId) {
    setWindows((w) => ({ ...w, [id]: { ...w[id], open: false } }));
  }

  // A tap on the empty background tucks windows away / brings them back. It
  // fires on release, and only if the pointer barely moved, so a touch that
  // turns into the browser's pull-to-refresh (pointercancel) or a scroll
  // doesn't count as a tap.
  function handleBackgroundPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("button, a, .aqua-window")) return;
    const { clientX: startX, clientY: startY } = e;

    function cleanup() {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", cleanup);
    }
    function onUp(ev: PointerEvent) {
      cleanup();
      if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 10) {
        setWindowsHidden((h) => !h);
      }
    }
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", cleanup);
  }

  function handleIconPointerDown(id: DesktopId, e: React.PointerEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const orig = iconOffset[id] ?? { x: 0, y: 0 };
    const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;
    // icons are fixed in place on mobile; only windows can be dragged there
    const canDrag = !window.matchMedia("(max-width: 639px)").matches;
    draggingRef.current = true;

    function onMove(ev: PointerEvent) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!canDrag) {
        // icons stay put on mobile, but a touch that travels is a swipe or
        // pull, not a tap, so it must not open the window
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) moved = true;
        return;
      }
      if (!moved && Math.abs(dx) <= 4 && Math.abs(dy) <= 4) return;
      if (!moved) {
        moved = true;
        setLastDragged(id);
      }
      // keep the whole 140px box inside the viewport
      const cx = Math.min(Math.max(dx, -rect.left), window.innerWidth - rect.right);
      const cy = Math.min(Math.max(dy, -rect.top), window.innerHeight - rect.bottom);
      setIconOffset((o) => ({ ...o, [id]: { x: orig.x + cx, y: orig.y + cy } }));
    }

    function cleanup() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", cleanup);
      draggingRef.current = false;
    }
    function onUp() {
      cleanup();
      if (!moved) openWindow(id, origin);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    // the browser took the touch over (e.g. pull-to-refresh): not a tap
    window.addEventListener("pointercancel", cleanup);
  }

  const activeId = useMemo(() => {
    let top: WindowId | null = null;
    let topZ = -1;
    (Object.keys(windows) as WindowId[]).forEach((id) => {
      const w = windows[id];
      if (w.open && w.z > topZ) {
        topZ = w.z;
        top = id;
      }
    });
    return top;
  }, [windows]);

  const openIds = (Object.keys(windows) as WindowId[]).filter(
    (id) => windows[id].open
  );

  return (
    <main
      onPointerDown={handleBackgroundPointerDown}
      className="relative h-full w-full select-none overflow-hidden"
    >
      <Wallpaper />

      <div
        onPointerDown={pullToRefresh.onPointerDown}
        // on iOS the page handles the pull itself, so the browser mustn't
        // claim the touch first
        className={`absolute inset-0 z-[1] flex items-center justify-center ${
          pullToRefresh.isIOS ? "touch-none" : ""
        }`}
      >
        <div className="flex max-w-[calc(100vw-32px)] flex-row flex-wrap justify-center gap-[8px]">
          {DESKTOP_ICONS.map((d) => (
            <div
              key={d.id}
              data-icon-id={d.id}
              className="relative"
              style={{
                transform: `translate(${iconOffset[d.id]?.x ?? 0}px, ${iconOffset[d.id]?.y ?? 0}px)`,
                zIndex: lastDragged === d.id ? 10 : undefined,
              }}
            >
              <DesktopIcon
                label={d.label}
                icon={APPS[d.id].icon}
                iconSize={APPS[d.id].iconSize}
                iconOffsetTop={APPS[d.id].iconOffsetTop}
                onPointerDown={(e) => handleIconPointerDown(d.id, e)}
                onKeyboardOpen={(rect) => openWindow(d.id, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })}
              />
            </div>
          ))}
        </div>
      </div>

      {openIds.map((id) => {
        const w = windows[id];
        const app = getApp(id);
        return (
          <Window
            key={id}
            title={app.title}
            icon={app.icon}
            zIndex={w.z}
            isActive={id === activeId}
            initial={w.initial ?? app.initial}
            width={app.width}
            expandOnMobile={!(id in APPS)}
            hidden={windowsHidden}
            origin={w.origin}
            getCloseOrigin={() => {
              const r = document
                .querySelector(`[data-icon-id="${id}"], [data-project-id="${id}"]`)
                ?.getBoundingClientRect();
              return r && { x: r.left + r.width / 2, y: r.top + r.height / 2 };
            }}
            onClose={() => closeWindow(id)}
            onFocus={() => focusWindow(id)}
          >
            {app.render({ openProject })}
          </Window>
        );
      })}

      <PullIndicator pull={pullToRefresh.pull} refreshing={pullToRefresh.refreshing} />
      <Footer lastUpdated={lastUpdated} />
    </main>
  );
}
