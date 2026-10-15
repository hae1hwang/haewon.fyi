"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Wallpaper } from "./Wallpaper";
import { DesktopIcon } from "./DesktopIcon";
import { Footer } from "./Footer";
import { Window } from "./Window";
import { FolderIcon, NoteIcon, MailIcon } from "./icons";
import { AboutWindow } from "./windows/AboutWindow";
import { FunWindow } from "./windows/FunWindow";
import { WorkWindow } from "./windows/WorkWindow";
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
    render: (ctx: AppContext) => React.ReactNode;
  }
> = {
  about: {
    title: "about.txt",
    icon: <NoteIcon />,
    initial: { x: 40, y: 60 },
    width: 460,
    render: () => <AboutWindow />,
  },
  fun: {
    title: "fun",
    icon: <FolderIcon />,
    initial: { x: 90, y: 100 },
    width: 560,
    render: () => <FunWindow />,
  },
  work: {
    title: "work",
    icon: <FolderIcon />,
    initial: { x: 60, y: 40 },
    width: 420,
    render: ({ openProject }) => <WorkWindow onOpenProject={openProject} />,
  },
  contact: {
    title: "Contact",
    icon: <MailIcon />,
    iconSize: 96,
    iconOffsetTop: 10,
    initial: { x: 120, y: 150 },
    width: 420,
    render: () => <ContactWindow />,
  },
};

const DESKTOP_ICONS: { id: DesktopId; label: string }[] = [
  { id: "about", label: "about.txt" },
  { id: "work", label: "work" },
  { id: "fun", label: "fun" },
  { id: "contact", label: "Contact" },
];

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
    setWindows((w) => ({ ...w, [id]: { open: true, z: nextZ(), origin } }));
  }

  // each project file opens in its own window, cascaded from the last one
  function openProject(folder: string, title: string, origin: Offset) {
    const id = projectWindowId(folder, title);
    setWindowsHidden(false);
    setWindows((w) => {
      const n = Object.keys(w).filter((k) => k.startsWith("project:") && w[k].open).length;
      const initial = w[id]?.initial ?? { x: 140 + n * 28, y: 90 + n * 28 };
      return { ...w, [id]: { open: true, z: nextZ(), origin, initial } };
    });
  }

  function getApp(id: WindowId) {
    if (id in APPS) return APPS[id as DesktopId];
    const project = parseProjectWindowId(id);
    return {
      title: project?.title ?? "",
      icon: <NoteIcon />,
      initial: windows[id]?.initial ?? { x: 140, y: 90 },
      width: 520,
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

  function handleBackgroundPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("button, a, .aqua-window")) return;
    setWindowsHidden((h) => !h);
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
      if (!canDrag) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
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

    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      draggingRef.current = false;
      if (!moved) openWindow(id, origin);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
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

      <div className="absolute inset-0 z-[1] flex items-center justify-center">
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
            initial={app.initial}
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

      <Footer lastUpdated={lastUpdated} />
    </main>
  );
}
