"use client";

import { useMemo, useState } from "react";
import { Wallpaper } from "./Wallpaper";
import { DesktopIcon } from "./DesktopIcon";
import { Window } from "./Window";
import { FolderIcon, NoteIcon, ResumeIcon, MailIcon } from "./icons";
import { AboutWindow } from "./windows/AboutWindow";
import { ResumeWindow } from "./windows/ResumeWindow";
import { WorkWindow } from "./windows/WorkWindow";
import { ContactWindow } from "./windows/ContactWindow";

type WindowId = "about" | "resume" | "work" | "contact";

const APPS: Record<
  WindowId,
  {
    title: string;
    icon: React.ReactNode;
    iconSize?: number;
    iconOffsetTop?: number;
    initial: { x: number; y: number };
    width: number;
    render: () => React.ReactNode;
  }
> = {
  about: {
    title: "about.txt",
    icon: <NoteIcon />,
    initial: { x: 40, y: 60 },
    width: 460,
    render: () => <AboutWindow />,
  },
  resume: {
    title: "resume.doc",
    icon: <ResumeIcon />,
    initial: { x: 90, y: 100 },
    width: 560,
    render: () => <ResumeWindow />,
  },
  work: {
    title: "work",
    icon: <FolderIcon />,
    initial: { x: 60, y: 40 },
    width: 620,
    render: () => <WorkWindow />,
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

const DESKTOP_ICONS: { id: WindowId; label: string }[] = [
  { id: "about", label: "about.txt" },
  { id: "work", label: "work" },
  { id: "resume", label: "resume.doc" },
  { id: "contact", label: "Contact" },
];

type WinState = { open: boolean; z: number };

export function Desktop() {
  const [windows, setWindows] = useState<Record<WindowId, WinState>>({
    about: { open: false, z: 0 },
    resume: { open: false, z: 0 },
    work: { open: false, z: 0 },
    contact: { open: false, z: 0 },
  });
  const [zCounter, setZCounter] = useState(1);

  function nextZ() {
    const z = zCounter + 1;
    setZCounter(z);
    return z;
  }

  function openWindow(id: WindowId) {
    setWindows((w) => ({ ...w, [id]: { open: true, z: nextZ() } }));
  }

  function focusWindow(id: WindowId) {
    setWindows((w) => ({ ...w, [id]: { ...w[id], z: nextZ() } }));
  }

  function closeWindow(id: WindowId) {
    setWindows((w) => ({ ...w, [id]: { ...w[id], open: false } }));
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
    <main className="relative h-full w-full select-none overflow-hidden">
      <Wallpaper />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex max-w-[calc(100vw-32px)] flex-row flex-wrap justify-center gap-[8px]">
          {DESKTOP_ICONS.map((d) => (
            <DesktopIcon
              key={d.id}
              label={d.label}
              icon={APPS[d.id].icon}
              iconSize={APPS[d.id].iconSize}
              iconOffsetTop={APPS[d.id].iconOffsetTop}
              onOpen={() => openWindow(d.id)}
            />
          ))}
        </div>
      </div>

      {openIds.map((id) => {
        const w = windows[id];
        const app = APPS[id];
        return (
          <Window
            key={id}
            title={app.title}
            icon={app.icon}
            zIndex={w.z}
            isActive={id === activeId}
            initial={app.initial}
            width={app.width}
            onClose={() => closeWindow(id)}
            onFocus={() => focusWindow(id)}
          >
            {app.render()}
          </Window>
        );
      })}
    </main>
  );
}
