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
import { getCaseStudy } from "@/data/caseStudies";
import { lock as lockVault } from "@/lib/vault";
import { track } from "@/lib/analytics";
import { parseProjectWindowId, projectWindowId } from "./projects";

type Offset = { x: number; y: number };

// how long a password keeps protected projects open
const UNLOCK_MS = 3 * 60 * 60 * 1000;

// the icons on the desktop; project windows are opened from the work folder
// and only get an id when opened
type DesktopId = "about" | "fun" | "work" | "contact";
type WindowId = string;

const FINDER_IDS: WindowId[] = ["work", "fun"];
const HOLD_ESC_MS = 550; // how long Esc is held to close all windows

type AppContext = {
  openProject: (folder: string, title: string, origin: Offset) => void;
  // whether this window should respond to arrow keys / Enter right now
  keyboardActive: boolean;
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
    // "left": opens on the left of the screen, near vertical centre, instead of at a random spot
    placement?: "left";
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
    render: ({ openProject, keyboardActive }) => (
      <FinderWindow
        root="fun"
        folders={site.funFolders}
        firstColumnLabel="Name"
        showPlatform={false}
        onOpenProject={openProject}
        keyboardActive={keyboardActive}
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
    placement: "left",
    render: ({ openProject, keyboardActive }) => (
      <FinderWindow
        root="work"
        folders={site.workFolders}
        firstColumnLabel="Team"
        showPlatform
        onOpenProject={openProject}
        keyboardActive={keyboardActive}
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
//
// On desktop the window also keeps clear of the "close all" pill at the bottom
// and leaves a buffer at the top: it lives in a band between PROJECT_BAND.top
// and PROJECT_BAND.bottom, and is kept shorter than that band by
// PROJECT_BAND.cascadeRoom so the cascade has a step of room up and down.
const PROJECT_WINDOW = {
  maxHeight: 943,
  heightVh: 87,
  maxWidth: 754, // 0.8 x maxHeight
  widthRatio: 0.8,
};
const PROJECT_BAND = { top: 24, bottom: 72, cascadeRoom: 64 };
const PROJECT_MIN_HEIGHT = 300;
// the same sizes as CSS, for the window itself
const PROJECT_HEIGHT_CSS = `max(${PROJECT_MIN_HEIGHT}px, min(${PROJECT_WINDOW.heightVh}vh, ${PROJECT_WINDOW.maxHeight}px, 100vh - ${
  PROJECT_BAND.top + PROJECT_BAND.bottom + PROJECT_BAND.cascadeRoom
}px))`;
const PROJECT_WIDTH_CSS = `min(92vw, ${PROJECT_WINDOW.maxWidth}px, calc(${PROJECT_WINDOW.widthRatio} * ${PROJECT_HEIGHT_CSS}))`;

function projectWindowSize(vw: number, vh: number) {
  const h = Math.max(
    PROJECT_MIN_HEIGHT,
    Math.min(
      (vh * PROJECT_WINDOW.heightVh) / 100,
      PROJECT_WINDOW.maxHeight,
      vh - (PROJECT_BAND.top + PROJECT_BAND.bottom + PROJECT_BAND.cascadeRoom)
    )
  );
  const w = Math.min(vw * 0.92, PROJECT_WINDOW.maxWidth, h * PROJECT_WINDOW.widthRatio);
  return { w, h };
}

// The part of the screen new windows open in, as fractions of the viewport:
// roughly the middle, leaving the edges and the footer clear (and biased to
// the top half, see pickWindowPosition).
const OPEN_REGION = { left: 0.13, right: 0.915, top: 0.185, bottom: 0.86 };

// The work folder opens on the left, roughly centred vertically, so project
// windows (which open to the right of it) can sit beside it instead of on top.
const LEFT_PLACEMENT_X = 0.08; // fraction of the screen width
const LEFT_PLACEMENT_CENTRE_Y = 0.47; // fraction of the screen height

function leftPlacementX(vw: number, w: number) {
  return Math.max(20, Math.min(vw * LEFT_PLACEMENT_X, vw - 20 - w));
}

// Where project windows are centred horizontally: the right-hand side of the
// screen, and always clear of the work window even when it has widened.
function projectBaseCentreX(vw: number, w: number) {
  const workW = Math.min(vw * 0.92, FINDER_EXPANDED_WIDTH.withPlatform);
  const workRight = leftPlacementX(vw, workW) + workW;
  const wanted = Math.max(vw * 0.63, workRight + 24 + w / 2);
  // keep one cascade step of room on the right, so the second window isn't cut off
  return Math.min(Math.max(wanted, w / 2 + 12), vw - w / 2 - 12 - CASCADE_STEP.x);
}

// Picks where a new window opens on desktop: random within OPEN_REGION, but
// preferring spots that don't cover the windows already open (a little overlap
// is fine). `growTo` is for windows that widen when a folder is opened: room
// is kept for that width and the position leans left. On mobile windows are
// centered by CSS, so the fallback is used as-is.
function pickWindowPosition(
  width: number,
  height: number,
  fallback: Offset,
  growTo?: number,
  placement?: "left"
): Offset {
  if (window.matchMedia("(max-width: 639px)").matches) return fallback;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.min(vw * 0.92, growTo ?? width);
  const h = Math.min(vh * 0.88, height);
  if (placement === "left") {
    // left side, near the vertical middle, with a little variation so it isn't robotic
    const jitter = (Math.random() - 0.5) * vh * 0.06;
    const y = vh * LEFT_PLACEMENT_CENTRE_Y - h / 2 + jitter;
    return {
      x: Math.round(leftPlacementX(vw, w)),
      y: Math.round(Math.max(20, Math.min(y, vh - h - 60))),
    };
  }
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
// one after another on macOS. The first sits at the base position (vertically
// centred, on the right-hand side of the screen, clear of the work window);
// each next one steps down-right so the previous window's title bar stays
// visible. Every step has its own x and y, so no two windows line up on either
// axis.
//
// The diagonal only has so much room, so once the steps run out the cascade
// wraps: it restarts from the top-left end of the same diagonal and works
// its way back down towards the base.
const CASCADE_STEP = { x: 30, y: 32 }; // y matches the title bar height

// offset of a project window from the exact centre of the screen
function slotOffset(slot: number): Offset {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isPhone = window.matchMedia("(max-width: 639px)").matches;
  const size = projectWindowSize(vw, vh);
  const w = size.w;
  // phones don't have the pill band, so their cascade keeps the full-height sizing
  const h = isPhone
    ? Math.min((vh * PROJECT_WINDOW.heightVh) / 100, PROJECT_WINDOW.maxHeight)
    : size.h;
  // on phones windows fill the screen, so the cascade starts dead centre; on
  // larger screens it starts to the right of centre, clear of the work window
  const baseCentre = isPhone ? vw / 2 : projectBaseCentreX(vw, w);
  const baseX = baseCentre - vw / 2;
  const stepsRight = (vw - (baseCentre + w / 2) - 12) / CASCADE_STEP.x;
  const stepsLeft = (baseCentre - w / 2 - 12) / CASCADE_STEP.x;
  // on desktop the window sits in the middle of the band above the "close all"
  // pill, and the cascade stays inside that band; phones use the whole screen
  const baseY = isPhone ? 0 : (PROJECT_BAND.top - PROJECT_BAND.bottom) / 2;
  const roomBelow = isPhone ? vh / 2 - h / 2 - 48 : vh / 2 - baseY - h / 2 - PROJECT_BAND.bottom; // footer / pill
  const roomAbove = isPhone ? vh / 2 - h / 2 - 12 : vh / 2 + baseY - h / 2 - PROJECT_BAND.top;
  const downSteps = Math.min(stepsRight, (roomBelow + 0.5) / CASCADE_STEP.y);
  const upSteps = Math.min(stepsLeft, (roomAbove + 0.5) / CASCADE_STEP.y);
  // always allow at least one step each way, even on small screens
  const down = Math.max(1, Math.floor(downSteps));
  const up = Math.max(1, Math.floor(upSteps));
  // order of positions along the diagonal: base, then down-right to the far
  // end, then wrap to the far up-left end and come back to just before the base
  const order = [
    0,
    ...Array.from({ length: down }, (_, i) => i + 1),
    ...Array.from({ length: up }, (_, i) => i - up),
  ];
  const step = order[slot % order.length];
  // if even the wrapped cascade fills up, each extra lap is shifted a little so
  // a window never lands exactly on top of another
  const lap = Math.floor(slot / order.length);
  return {
    x: baseX + step * CASCADE_STEP.x + lap * 10,
    y: baseY + step * CASCADE_STEP.y + lap * 8,
  };
}

type WinState = {
  open: boolean;
  z: number;
  origin?: Offset;
  initial?: Offset;
  // project windows: which stagger position around the centre this one holds
  slot?: number;
  // opened in place of another window, at exactly `initial`
  detached?: boolean;
};

export function Desktop({ lastUpdated }: { lastUpdated: string }) {
  const [windows, setWindows] = useState<Record<WindowId, WinState>>({
    about: { open: false, z: 0 },
    fun: { open: false, z: 0 },
    work: { open: false, z: 0 },
    contact: { open: false, z: 0 },
  });
  const [zCounter, setZCounter] = useState(1);
  // protected projects: one correct password unlocks them all, but only until the page
  // is left (closed, reloaded or navigated away from) or UNLOCK_MS has passed. It lives in
  // memory only, so nothing is remembered between visits.
  const [unlockedAt, setUnlockedAt] = useState<number | null>(null);
  const unlocked = unlockedAt !== null;
  useEffect(() => {
    if (unlockedAt === null) return;
    const lock = () => {
      lockVault();
      setUnlockedAt(null);
    };
    const timer = window.setTimeout(lock, Math.max(0, unlockedAt + UNLOCK_MS - Date.now()));
    // timers pause while a laptop sleeps, so also check the clock when the tab comes back
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - unlockedAt >= UNLOCK_MS) lock();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [unlockedAt]);
  // drag offsets from each icon's natural place in the centered row, so the
  // row keeps reflowing on resize and dragged icons simply sit on top of it
  const [iconOffset, setIconOffset] = useState<Partial<Record<DesktopId, Offset>>>({});
  const [lastDragged, setLastDragged] = useState<DesktopId | null>(null);
  const draggingRef = useRef(false);
  // "show desktop": clicking the background slides open windows to the edges
  const [windowsHidden, setWindowsHidden] = useState(false);
  // bumped by the "close all" button; every open window closes itself in response
  const [closeAllSignal, setCloseAllSignal] = useState(0);
  const pullToRefresh = usePullToRefresh();
  // the folder window (work / fun) that was last in front; it keeps getting the
  // arrow keys while one of its project windows is on top, so you can step to
  // the next project without clicking back into it
  const [lastFinderId, setLastFinderId] = useState<WindowId | null>(null);

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

  // holding Esc closes every window (a tap still just closes the front one)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function stop() {
      clearTimeout(timer);
      timer = undefined;
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape" || e.repeat || timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        // the tap that started the hold has already closed the front window
        setCloseAllSignal((n) => n + 1);
      }, HOLD_ESC_MS);
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === "Escape") stop();
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", stop);
    return () => {
      stop();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", stop);
    };
  }, []);

  function nextZ() {
    const z = zCounter + 1;
    setZCounter(z);
    return z;
  }

  // origin is the icon's center, so the window can grow out of it
  function openWindow(id: WindowId, origin: Offset) {
    setWindowsHidden(false);
    if (!windows[id]?.open) track(`open/${id}`, id);
    if (FINDER_IDS.includes(id)) setLastFinderId(id);
    const app = APPS[id as DesktopId];
    const initial = windows[id]?.open
      ? undefined
      : pickWindowPosition(app.width, app.height, app.initial, app.growsTo, app.placement);
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
    if (!alreadyOpen) track(`project/${folder}/${title}`, `${title} · ${folder}`);
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

  // "Next project" (phones): every openable project in the same list (work or fun),
  // in the order they appear
  function projectSequence(folderName: string) {
    const list = site.workFolders.some((f) => f.name === folderName)
      ? site.workFolders
      : site.funFolders;
    return list.flatMap((f) =>
      f.items.filter((i) => !i.comingSoon).map((i) => ({ folder: f.name, title: i.title }))
    );
  }

  // swaps this window for the next (or previous) project, in place (no new window), unless that
  // project is already open, in which case it just comes to the front
  // `from` is where the current window sits on screen: on desktop the next
  // project opens exactly there, even if the window had been dragged
  function goToAdjacentProject(id: WindowId, step: 1 | -1, from?: DOMRect) {
    const cur = parseProjectWindowId(id);
    if (!cur) return;
    const seq = projectSequence(cur.folder);
    const i = seq.findIndex((p) => p.folder === cur.folder && p.title === cur.title);
    if (seq.length < 2 || i < 0) return;
    const next = seq[(i + step + seq.length) % seq.length];
    const nextId = projectWindowId(next.folder, next.title);
    const isPhone = window.matchMedia("(max-width: 639px)").matches;
    if (!windows[nextId]?.open) track(`project/${next.folder}/${next.title}`, `${next.title} · ${next.folder}`);
    setWindowsHidden(false);
    setWindows((w) =>
      // the next project is already open: leave this window where it is and
      // just bring that one to the front
      w[nextId]?.open
        ? { ...w, [nextId]: { ...w[nextId], z: nextZ() } }
        : {
            ...w,
            // otherwise swap this window for the next project, in place
            [id]: { ...w[id], open: false },
            [nextId]: {
              open: true,
              z: nextZ(),
              slot: w[id]?.slot,
              initial: from && !isPhone ? { x: from.left, y: from.top } : w[id]?.initial,
              detached: !!from && !isPhone,
            },
          }
    );
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
      render: () => (
        <ProjectWindow
          message={folder?.placeholder ?? "Coming soon"}
          caseStudy={project && !folder?.locked ? getCaseStudy(project.folder, project.title) : undefined}
          protectedProject={project && folder?.locked ? project : undefined}
          title={project?.title}
          locked={!!folder?.locked && !unlocked}
          onUnlock={() => {
            track("unlock");
            setUnlockedAt(Date.now());
          }}
        />
      ),
    };
  }

  function focusWindow(id: WindowId) {
    setWindowsHidden(false);
    if (FINDER_IDS.includes(id)) setLastFinderId(id);
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
    const isTouch = e.pointerType === "touch";
    // a finger wobbles more than a mouse, so a touch needs to travel further
    // before it counts as a drag rather than a tap
    const dragThreshold = isTouch ? 8 : 4;
    // the icon owns this touch, so it mustn't also start a pull-to-refresh
    if (isTouch) e.stopPropagation();
    draggingRef.current = true;

    function onMove(ev: PointerEvent) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && Math.abs(dx) <= dragThreshold && Math.abs(dy) <= dragThreshold) return;
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
    let top = null as WindowId | null;
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

  const keyboardFinderId: WindowId | null =
    activeId && FINDER_IDS.includes(activeId)
      ? activeId
      : activeId?.startsWith("project:") && lastFinderId && windows[lastFinderId]?.open
        ? lastFinderId
        : null;

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
            windowHeight={id in APPS ? undefined : PROJECT_HEIGHT_CSS}
            windowWidth={id in APPS ? undefined : PROJECT_WIDTH_CSS}
            hidden={windowsHidden}
            startDetached={w.detached}
            titlebarAction={
              id in APPS || projectSequence(parseProjectWindowId(id)?.folder ?? "").length < 2 ? undefined : (
                <>
                  <button
                    type="button"
                    data-titlebar-button
                    onClick={(e) =>
                      goToAdjacentProject(id, -1, e.currentTarget.closest(".aqua-window")?.getBoundingClientRect())
                    }
                    aria-label="Previous project"
                    className="prev-project-btn"
                  >
                    <svg viewBox="0 0 6 10" className="h-[9px] w-[6px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="m5 1-4 4 4 4" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    data-titlebar-button
                    onClick={(e) =>
                      goToAdjacentProject(id, 1, e.currentTarget.closest(".aqua-window")?.getBoundingClientRect())
                    }
                    aria-label="Next project"
                    className="next-project-btn"
                  >
                    Next
                    <svg viewBox="0 0 6 10" className="h-[9px] w-[6px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="m1 1 4 4-4 4" />
                    </svg>
                  </button>
                </>
              )
            }
            closeAllSignal={closeAllSignal}
            closeAllDelay={openIds.indexOf(id) * 45}
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
            {app.render({ openProject, keyboardActive: id === keyboardFinderId })}
          </Window>
        );
      })}

      {/* with two or more windows open, one button closes them all */}
      <button
        type="button"
        onClick={() => {
          setWindowsHidden(false);
          setCloseAllSignal((n) => n + 1);
        }}
        aria-label="Close all windows"
        aria-hidden={openIds.length < 2}
        tabIndex={openIds.length < 2 ? -1 : 0}
        className={`close-all-fab ${openIds.length < 2 ? "is-hidden" : ""}`}
      >
        <span className="aqua-dot aqua-dot-red" aria-hidden />
        Close all
      </button>
      <PullIndicator pull={pullToRefresh.pull} refreshing={pullToRefresh.refreshing} />
      <Footer lastUpdated={lastUpdated} faded={openIds.length >= 2} />
    </main>
  );
}
