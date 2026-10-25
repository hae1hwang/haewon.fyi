"use client";

import { useEffect, useRef, useState } from "react";
import type { WorkFolder } from "@/data/site";
import { useRequestedWidth } from "../Window";
import { FolderIcon, LockIcon, NoteIcon } from "../icons";
import { projectWindowId } from "../projects";

// window width once a folder is open: first column + project (+ platform) column
export const FINDER_EXPANDED_WIDTH = { withPlatform: 620, withoutPlatform: 520 };

function Chevron() {
  return (
    <svg
      viewBox="0 0 6 10"
      className="ml-auto h-[9px] w-[6px] shrink-0 opacity-50"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m1 1 4 4-4 4" />
    </svg>
  );
}

// `muted` is a selection in the column that doesn't have keyboard focus (grey, like Finder)
const rowClass = (active: boolean, dim = false, muted = false) =>
  `flex w-full items-center gap-2 rounded-[5px] px-2 py-[3px] text-left text-[13px] font-normal ${
    active
      ? muted
        ? "bg-black/10 text-black"
        : "bg-accent text-white"
      : dim
        ? "text-black/40"
        : "text-black"
  }`;

// Finder-style column view shared by the work and fun folders
export function FinderWindow({
  root,
  folders: allFolders,
  firstColumnLabel,
  showPlatform,
  onOpenProject,
  keyboardActive = false,
}: {
  root: string;
  folders: WorkFolder[];
  firstColumnLabel: string;
  showPlatform: boolean;
  onOpenProject: (folder: string, title: string, origin: { x: number; y: number }) => void;
  // whether arrow keys / Enter should drive this window right now
  keyboardActive?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  // which column the keyboard is in (0 = folders, 1 = projects)
  const [focusColumn, setFocusColumn] = useState<0 | 1>(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = allFolders.find((f) => f.name === selectedName);

  // opening a folder grows the window to the right to make room for its column
  useRequestedWidth(
    selected
      ? showPlatform
        ? FINDER_EXPANDED_WIDTH.withPlatform
        : FINDER_EXPANDED_WIDTH.withoutPlatform
      : undefined
  );

  // search only covers this folder: folder names, and project titles inside
  const q = query.trim().toLowerCase();
  const matches = (text: string) => text.toLowerCase().includes(q);
  const folders = q
    ? allFolders.filter(
        (f) => matches(f.name) || f.items.some((item) => matches(item.title))
      )
    : allFolders;
  const items = !selected
    ? []
    : !q || matches(selected.name)
      ? selected.items
      : selected.items.filter((item) => matches(item.title));

  const openable = items.filter((item) => !item.comingSoon);

  // Arrow keys move through the lists like a Finder column view, and Enter
  // opens the highlighted project (nothing opens just by arrowing past it).
  useEffect(() => {
    if (!keyboardActive) return;
    const clamp = (n: number, len: number) => Math.min(Math.max(n, 0), len - 1);

    function openHighlighted() {
      if (!selected || !selectedItem) return;
      const row = rootRef.current?.querySelector(
        `[data-project-id="${projectWindowId(selected.name, selectedItem)}"]`
      );
      const r = row?.getBoundingClientRect();
      onOpenProject(selected.name, selectedItem, r
        ? { x: r.left + r.width / 2, y: r.top + r.height / 2 }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 });
    }
    function stepIntoProjects() {
      if (!selected || openable.length === 0) return;
      setFocusColumn(1);
      setSelectedItem(openable[0].title);
    }

    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"].includes(e.key)) return;
      const target = e.target as HTMLElement;
      // typing in a field, or a button that isn't one of this window's rows, keeps its own keys
      if (target.closest("input, textarea, select, [contenteditable='true']")) return;
      if (target.closest("button, a") && !target.closest("[data-finder-row]")) return;
      e.preventDefault();

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const dir = e.key === "ArrowDown" ? 1 : -1;
        if (focusColumn === 0 || !selected) {
          const names = folders.map((f) => f.name);
          if (names.length === 0) return;
          const i = selectedName ? names.indexOf(selectedName) : -1;
          const next = i === -1 ? (dir === 1 ? 0 : names.length - 1) : clamp(i + dir, names.length);
          setFocusColumn(0);
          setSelectedName(names[next]);
          setSelectedItem(null);
        } else {
          const titles = openable.map((item) => item.title);
          if (titles.length === 0) return;
          const i = selectedItem ? titles.indexOf(selectedItem) : -1;
          const next = i === -1 ? (dir === 1 ? 0 : titles.length - 1) : clamp(i + dir, titles.length);
          setSelectedItem(titles[next]);
        }
      } else if (e.key === "ArrowRight") {
        if (!selected) {
          if (folders[0]) setSelectedName(folders[0].name);
          return;
        }
        if (focusColumn === 0) stepIntoProjects();
      } else if (e.key === "ArrowLeft") {
        if (focusColumn === 1) {
          setFocusColumn(0);
          setSelectedItem(null);
        }
      } else if (e.key === "Enter") {
        if (focusColumn === 1) openHighlighted();
        else stepIntoProjects();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // keep the highlighted row in view when the lists scroll
  useEffect(() => {
    rootRef.current
      ?.querySelector(`[data-col="${focusColumn}"][data-selected="true"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedName, selectedItem, focusColumn]);

  return (
    <div ref={rootRef} className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 bg-chrome px-3 py-2 text-[12px] text-black/70">
        <span className="aqua-field min-w-0 flex-1 truncate px-2.5 py-1">
          {/* on mobile, once a folder is open, the root collapses to "…" so the
              path stays on one line */}
          {selected ? (
            <>
              <span className="sm:hidden">…</span>
              <span className="hidden sm:inline">haewon.fyi</span>
            </>
          ) : (
            "haewon.fyi"
          )}{" "}
          ▸ {root}{selected && ` ▸ ${selected.name}`}
        </span>
        <label className="relative flex w-[150px] shrink-0 items-center rounded-[5px] border border-black/20 bg-white shadow-[inset_0_1px_1px_rgba(0,0,0,0.06)] focus-within:border-[#4d90fe] focus-within:ring-[3px] focus-within:ring-[#4d90fe]/40 sm:w-[200px]">
          <svg
            viewBox="0 0 16 16"
            className="pointer-events-none absolute left-2 h-[11px] w-[11px] text-black/40"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden
          >
            <circle cx="6.5" cy="6.5" r="4.5" />
            <path d="m10 10 4.5 4.5" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // Esc clears the search first; with nothing to clear it falls
              // through and closes the window
              if (e.key === "Escape" && query) {
                e.stopPropagation();
                setQuery("");
              }
            }}
            placeholder="Search"
            aria-label={`Search ${root}`}
            spellCheck={false}
            autoComplete="off"
            className="w-full min-w-0 select-text bg-transparent py-[3px] pl-6 pr-6 text-[16px] text-black outline-none sm:text-[12px] placeholder:text-black/40"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute right-1.5 flex h-[13px] w-[13px] items-center justify-center rounded-full bg-black/30 text-[9px] leading-none text-white hover:bg-black/45"
            >
              ✕
            </button>
          )}
        </label>
      </div>

      {/* column headers mirror the two columns below, so their divider lines up */}
      <div className="flex shrink-0 border-t border-black/10 bg-[#f6f7f9] text-[12px] text-black/55">
        <div className="min-w-0 flex-1 px-3.5 py-1 sm:w-[270px] sm:flex-none">{firstColumnLabel}</div>
        <div
          className={`min-w-0 flex-1 items-center border-l border-black/15 px-3.5 py-1 sm:flex ${
            selected ? "flex" : "hidden"
          }`}
        >
          <span className="flex-1">Project</span>
          {selected && showPlatform && (
            <span className="hidden w-[120px] shrink-0 sm:block">Platform</span>
          )}
        </div>
      </div>

      <div className="flex h-[280px] shrink-0 border-y border-black/10 bg-white">
        <div
          className="min-w-0 flex-1 overflow-y-auto overscroll-contain p-1.5 sm:w-[270px] sm:flex-none"
          // clicking the empty space under the folders deselects the open one
          onClick={(e) => {
            if (e.target !== e.currentTarget) return;
            setSelectedName(null);
            setSelectedItem(null);
            setFocusColumn(0);
          }}
        >
          {folders.length === 0 && (
            <p className="px-3 py-6 text-center text-[12px] text-black/50">
              No results for “{query.trim()}”
            </p>
          )}
          {folders.map((folder) => (
            <button
              key={folder.name}
              data-finder-row
              data-col="0"
              data-selected={folder.name === selectedName}
              onClick={() => {
                setSelectedName(folder.name);
                setSelectedItem(null);
                setFocusColumn(0);
              }}
              className={rowClass(folder.name === selectedName, false, focusColumn === 1)}
            >
              <FolderIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">{folder.name}</span>
              <Chevron />
            </button>
          ))}
        </div>

        <div
          className={`min-w-0 flex-1 overflow-y-auto overscroll-contain border-l border-black/15 p-1.5 ${
            selected ? "" : "hidden sm:block"
          }`}
        >
          {selected && items.length === 0 && (
            <p className="px-3 py-6 text-center text-[12px] text-black/50">
              No results
            </p>
          )}
          {items.map((item) =>
            item.comingSoon ? (
              <div key={item.title} className={rowClass(false, true)}>
                <NoteIcon className="h-4 w-4 shrink-0 opacity-50" />
                <span className="truncate">{item.title}</span>
              </div>
            ) : (
              <button
                key={item.title}
                data-finder-row
                data-col="1"
                data-selected={item.title === selectedItem}
                data-project-id={projectWindowId(selected?.name ?? "", item.title)}
                onClick={(e) => {
                  setSelectedItem(item.title);
                  setFocusColumn(1);
                  const r = e.currentTarget.getBoundingClientRect();
                  onOpenProject(selected?.name ?? "", item.title, {
                    x: r.left + r.width / 2,
                    y: r.top + r.height / 2,
                  });
                }}
                className={rowClass(item.title === selectedItem)}
              >
                <NoteIcon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.title}</span>
                {selected?.locked && (
                  <LockIcon className="ml-1.5 h-[11px] w-[10px] shrink-0 opacity-50" />
                )}
                <span className="flex-1" />
                {showPlatform && (
                  <span className="hidden w-[120px] shrink-0 truncate opacity-60 sm:block">
                    {item.platform}
                  </span>
                )}
              </button>
            )
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center bg-chrome px-3 py-1.5 text-[11px] text-black/60">
        {folders.length} {folders.length === 1 ? "item" : "items"}
      </div>
    </div>
  );
}
