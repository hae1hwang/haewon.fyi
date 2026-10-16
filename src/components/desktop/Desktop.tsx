"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Wallpaper } from "./Wallpaper";
import { DesktopIcon } from "./DesktopIcon";
import { Footer } from "./Footer";
import { PullIndicator, usePullToRefresh } from "./PullToRefresh";
import { Window } from "./Window";
import { NoteIcon, MailIcon, WorkFolderIcon, FunFolderIcon } from "./icons";
import { AboutWindow } from "./windows/AboutWindow";
import { FinderWindow, FINDER_EXPANDED_WIDTH } from "./windows/FinderWindow";
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
    // width the window grows to when a folder opens (Finder-style windows)
    growsTo?: number;
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
    growsTo: FINDER_EXPANDED_WIDTH.withoutPlatform,
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
    growsTo: FINDER_EXPANDED_WIDTH.withPlatform,
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
    title: "contact",
    icon: <MailIcon shadowed />,
    iconSize: 96,
    iconOffsetTop: 10,
    initial: { x: 120, y: 150 },
    // wide enough that the "Or email · LinkedIn" line stays on one row beside the
    // Send button (even while it says "Sending…")
    width: 480,
    height: 320,
    render: () => <ContactWindow />,
  },
};

// When the four icons no longer fit in one row (under 616px: 4 x 140px + 3 x 8px
// gaps + 16px of margin each side) they wrap into a 2 x 2 grid. Visually
// regroup it as the two folders on top and about.txt + contact below; the row
// on wider screens keeps the DOM order.
const WRAPPED_ORDER: Record<DesktopId, string> = {
  work: "max-[615px]:order-1",
  fun: "max-[615px]:order-2",
  about: "max-[615px]:order-3",
  contact: "max-[615px]:order-4",
};

const DESKTOP_ICONS: { id: DesktopId; label: string }[] = [
  { id: "about", label: "about.txt" },
  { id: "work", label: "work" },
  { id: "fun", label: "fun" },
  { id: "contact", label: "contact" },
];

// Project windows are sized like a PDF open in Preview: a tall, narrow page
// (roughly letter proportions) so they work well on vertical screens. The
// width follows the height, so the window stays portrait even on a short
// screen. Content scrolls inside.
const PROJECT_WINDOW = {
  maxHeight: 943,
  heightVh: 87,
  maxWidth: 698, // 0.74 x maxHeight
  widthVh: 64.4, // 0.74 x heightVh
  // the same sizes as CSS, for the window itself
  heightCss: "min(87vh, 943px)",
  widthCss: "min(92vw, 698px, 64.4vh)",
};

// The part of the screen new windows open in, as fractions of the viewport:
// roughly the middle, leaving the edges and the footer clear (and biased to
// the top half, see pickWindowPosition).
const OPEN_REGION = { left: 0.13, right: 0.915, top: 0.185, bottom: 0.86 };

// Picks where a new window opens on desktop: random within OPEN_REGION, but
// preferring spots that don't cover the windows already open (a little overlap
// is fine). `growTo` is for windows that widen when a folder is opened: room
// is kept for that width and the position leans left. On mobile windows are
// centered by CSS, so the fallback is used as-is.
function pickWindowPosition(
  width: number,
  height: number,
  fallback: Offset,
  growTo?: number
): Offset {
  if (window.matchMedia("(max-width: 639px)").matches) return fallback;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(vw * 0.92, growTo ?? width);
  const h = Math.min(vh * 0.88, height);
  const minX = vw * OPEN_REGION.left;
  const minY = vh * OPEN_REGION.top;
  const maxX = Math.max(minX, vw * OPEN_REGION.right - w);
  // windows open mostly in the top half: the window's centre never goes below
  // the middle of the screen, so they don't land south of the desktop icons
  const maxY = Math.max(minY, Math.min(vh * OPEN_REGION.bottom - h, vh * 0.5 - h / 2));
  const taken = Array.from(document.querySelectorAll(".aqua-window")).map((el) =>
    el.getBoundingClientRect()
  );

  const candidates = Array.from({ length: 24 }, () => {
    // squaring the random number crowds the pick towards the left edge
    const along = growTo ? Math.random() ** 2 : Math.random();
    const x = minX + along * (maxX - minX);
    // squaring the random number favours the upper part of that range
    const y = minY + Math.random() ** 2 * (maxY - minY);
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

// Project windows cascade diagonally down and to the right, like files opening
// one after another on macOS. The first is dead centre; each next one steps
// down-right so the previous window's title bar stays visible. Every step has
// its own x and y, so no two windows line up on either axis.
//
// The diagonal only has so much room, so once the steps run out the cascade
// wraps: it restarts from the top-left end of the same diagonal and works
// its way back down towards the centre.
const CASCADE_STEP = { x: 30, y: 32 }; // y matches the title bar height

function slotOffset(slot: number): Offset {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(vw * 0.92, PROJECT_WINDOW.maxWidth, (vh * PROJECT_WINDOW.widthVh) / 100);
  const h = Math.min((vh * PROJECT_WINDOW.heightVh) / 100, PROJECT_WINDOW.maxHeight);
  const stepsX = ((vw - w) / 2 - 12) / CASCADE_STEP.x;
  const downSteps = Math.min(stepsX, (vh / 2 - h / 2 - 48) / CASCADE_STEP.y); // footer below
  const upSteps = Math.min(stepsX, (vh / 2 - h / 2 - 12) / CASCADE_STEP.y);
  // always allow at least one step each way, even on small screens
  const down = Math.max(1, Math.floor(downSteps));
  const up = Math.max(1, Math.floor(upSteps));
  // order of positions along the diagonal: centre, then down-right to the far
  // end, then wrap to the far up-left end and come back to just before centre
  const order = [
    0,
    ...Array.from({ length: down }, (_, i) => i + 1),
    ...Array.from({ length: up }, (_, i) => i - up),
  ];
  const step = order[slot % order.length];
  // if even the wrapped cascade fills up, each extra lap is shifted a little so
  // a window never lands exactly on top of another
  const lap = Math.floor(slot / order.length);
  return { x: step * CASCADE_STEP.x + lap * 10, y: step * CASCADE_STEP.y + lap * 8 };
}

type WinState = {
  open: boolean;
  z: number;
  origin?: Offset;
  initial?: Offset;
  // project windows: which stagger position around the centre this one holds
  slot?: number;
};

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
      : pickWindowPosition(app.width, app.height, app.initial, app.growsTo);
    setWindows((w) => ({
      ...w,
      [id]: { open: true, z: nextZ(), origin, initial: initial ?? w[id]?.initial },
    }));
  }

  // each project file opens in its own window, centered on screen
  function openProject(folder: string, title: string, origin: Offset) {
    const id = projectWindowId(folder, title);
    setWindowsHidden(false);
    // the first project window is dead centre; each further one takes the
    // lowest stagger slot not held by a window that is still open
    const alreadyOpen = windows[id]?.open;
    const taken = new Set(
      Object.entries(windows)
        .filter(([k, v]) => k.startsWith("project:") && v.open)
        .map(([, v]) => v.slot)
    );
    let slot = 0;
    while (taken.has(slot)) slot++;
    setWindows((w) => ({
      ...w,
      [id]: { open: true, z: nextZ(), origin, slot: alreadyOpen ? w[id]?.slot : slot },
    }));
  }

  function getApp(id: WindowId) {
    if (id in APPS) return APPS[id as DesktopId];
    const project = parseProjectWindowId(id);
    const folder = [...site.workFolders, ...site.funFolders].find((f) => f.name === project?.folder);
    return {
      // "Project · Team", e.g. "Multiview · YouTube TV"
      title: project ? `${project.title} · ${project.folder}` : "",
      icon: <NoteIcon />,
      initial: { x: 140, y: 90 },
      width: PROJECT_WINDOW.maxWidth,
      render: () => <ProjectWindow message={folder?.placeholder ?? "Coming soon"} />,
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
              className={`relative ${WRAPPED_ORDER[d.id]}`}
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
            centerOnOpen={!(id in APPS)}
            centerOffset={slotOffset(w.slot ?? 0)}
            windowHeight={id in APPS ? undefined : PROJECT_WINDOW.heightCss}
            windowWidth={id in APPS ? undefined : PROJECT_WINDOW.widthCss}
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
