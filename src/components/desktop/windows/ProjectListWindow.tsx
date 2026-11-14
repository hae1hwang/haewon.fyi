"use client";

import { useEffect, useRef, useState } from "react";
import type { WorkFolder, WorkIcon } from "@/data/site";
import { GooglePhotosIcon, LockIcon, NoteIcon, YouTubeIcon, YouTubeTvIcon } from "../icons";
import { projectWindowId } from "../projects";
import { FinderToolbar, rowClass } from "./FinderWindow";

// width of the work window: project, team, platform and keywords columns
export const PROJECT_LIST_WIDTH = 720;

// the columns share these widths between the header and the rows; Keywords takes what's left
const PROJECT_COL = "w-[150px] shrink-0";
const TEAM_COL = "w-[110px] shrink-0";
const PLATFORM_COL = "w-[130px] shrink-0";
const KEYWORDS_COL = "min-w-0 flex-1";
// the table keeps its full-size columns in a narrower window (a phone, say) and scrolls sideways
// instead: side padding + the three fixed columns + room for the longest keywords
const TABLE_MIN_WIDTH = "min-w-[660px]";
// the columns do their own spacing, so the row's usual gap would push them off the header's
const ROW_STYLE = { gap: 0 };

// the logo (or emoji) shown beside a project
function RowIcon({ icon }: { icon?: WorkIcon }) {
  const cls = "h-4 w-4 shrink-0";
  if (icon === "youtube-tv") return <YouTubeTvIcon className={cls} />;
  if (icon === "youtube") return <YouTubeIcon className={cls} />;
  if (icon === "google-photos") return <GooglePhotosIcon className={cls} />;
  if (icon) {
    return (
      <span className={`${cls} text-center text-[13px] leading-4`} aria-hidden>
        {icon.emoji}
      </span>
    );
  }
  return <NoteIcon className={cls} />;
}

// Flat list of every project with the team or company it was for. The data is still
// grouped by team (that's what ties a project to its case study); this just lays the
// groups out as one list instead of a folder column.
export function ProjectListWindow({
  root,
  folders,
  onOpenProject,
  keyboardActive = false,
}: {
  root: string;
  folders: WorkFolder[];
  onOpenProject: (folder: string, title: string, origin: { x: number; y: number }) => void;
  // whether arrow keys / Enter should drive this window right now
  keyboardActive?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();
  // projects marked comingSoon stay in the data but aren't listed until they go live
  const rows = folders
    .flatMap((f) =>
      f.items.filter((item) => !item.comingSoon).map((item) => ({ ...item, team: f.name, locked: f.locked, icon: f.icon, id: projectWindowId(f.name, item.title) }))
    )
    .filter(
      (r) =>
        !q ||
        r.title.toLowerCase().includes(q) ||
        r.team.toLowerCase().includes(q) ||
        (r.platform ?? "").toLowerCase().includes(q) ||
        (r.keywords ?? "").toLowerCase().includes(q)
    );

  function open(row: (typeof rows)[number], origin: { x: number; y: number }) {
    setSelectedId(row.id);
    onOpenProject(row.team, row.title, origin);
  }

  // Up/Down move the highlight; Enter opens it
  useEffect(() => {
    if (!keyboardActive) return;
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (!["ArrowUp", "ArrowDown", "Enter"].includes(e.key)) return;
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable='true']")) return;
      if (target.closest("button, a") && !target.closest("[data-finder-row]")) return;
      e.preventDefault();

      if (e.key === "Enter") {
        const row = rows.find((r) => r.id === selectedId);
        if (!row) return;
        const r = rootRef.current?.querySelector(`[data-project-id="${row.id}"]`)?.getBoundingClientRect();
        open(row, r
          ? { x: r.left + r.width / 2, y: r.top + r.height / 2 }
          : { x: window.innerWidth / 2, y: window.innerHeight / 2 });
        return;
      }
      if (rows.length === 0) return;
      const dir = e.key === "ArrowDown" ? 1 : -1;
      const i = rows.findIndex((r) => r.id === selectedId);
      const next = i === -1 ? (dir === 1 ? 0 : rows.length - 1) : Math.min(Math.max(i + dir, 0), rows.length - 1);
      setSelectedId(rows[next].id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    rootRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [selectedId]);

  return (
    <div
      ref={rootRef}
      className="flex h-full flex-col"
      // clicking anywhere that isn't a project row clears the highlight
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("[data-finder-row]")) setSelectedId(null);
      }}
    >
      <FinderToolbar root={root} query={query} onQueryChange={setQuery} />

      {/* one scroll area for both directions (27px of header + 280px of rows), so a sideways swipe
          works wherever the pointer is; the header stays put while the rows scroll under it */}
      <div className="h-[307px] shrink-0 overflow-auto overscroll-contain scroll-pt-8 border-b border-black/10 bg-white">
        <div className={TABLE_MIN_WIDTH}>
          {/* same 14px side inset as the rows (list padding + row padding), so the columns line up */}
          <div className="sticky top-0 z-10 flex border-y border-black/10 bg-[#f6f7f9] px-3.5 text-[12px] text-black/55">
            <div className={`${PROJECT_COL} py-1`}>Project</div>
            <div className={`${TEAM_COL} border-l border-black/15 py-1 pl-2.5`}>Team</div>
            <div className={`${PLATFORM_COL} border-l border-black/15 py-1 pl-2.5`}>Platform</div>
            <div className={`${KEYWORDS_COL} border-l border-black/15 py-1 pl-2.5`}>Keywords</div>
          </div>

          <div className="p-1.5">
            {rows.length === 0 && (
              <p className="px-3 py-6 text-center text-[12px] text-black/50">No results for “{query.trim()}”</p>
            )}
            {rows.map((row) => {
              const selected = row.id === selectedId;
              // Platform and Keywords are the quiet columns: grey, like a row that isn't live used to be
              const quiet = selected ? "opacity-80" : "text-black/40";
              return (
                <button
                  key={row.id}
                  data-finder-row
                  data-selected={selected}
                  data-project-id={row.id}
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    open(row, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
                  }}
                  className={rowClass(selected)}
                  style={ROW_STYLE}
                >
                  <span className={`${PROJECT_COL} flex items-center gap-2`}>
                    <RowIcon icon={row.icon} />
                    <span className="truncate font-medium">{row.title}</span>
                    {row.locked && <LockIcon className="ml-0.5 h-[11px] w-[10px] shrink-0 opacity-50" />}
                  </span>
                  <span className={`${TEAM_COL} truncate pl-2.5 opacity-60`}>{row.team}</span>
                  <span className={`${PLATFORM_COL} truncate pl-2.5 ${quiet}`}>{row.platform}</span>
                  <span className={`${KEYWORDS_COL} truncate pl-2.5 ${quiet}`}>{row.keywords}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center bg-chrome px-3 py-1.5 text-[11px] text-black/60">
        {rows.length} {rows.length === 1 ? "item" : "items"}
      </div>
    </div>
  );
}
