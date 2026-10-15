"use client";

import { useState } from "react";
import { site } from "@/data/site";
import { FolderIcon } from "../icons";

export function WorkWindow() {
  const [query, setQuery] = useState("");
  // search only covers this folder, and only project titles for now
  const q = query.trim().toLowerCase();
  const projects = q
    ? site.projects.filter((p) => p.title.toLowerCase().includes(q))
    : site.projects;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 bg-chrome px-3 py-2 text-[12px] text-black/70">
        <span className="aqua-field flex-1 px-2.5 py-1">
          haewon.fyi ▸ work
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
            aria-label="Search work"
            spellCheck={false}
            autoComplete="off"
            className="w-full min-w-0 select-text bg-transparent py-[3px] pl-6 pr-6 text-[12px] text-black outline-none placeholder:text-black/40"
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

      <div className="aqua-field m-2 min-h-0 flex-1 overflow-y-auto">
        <div className="hidden border-b border-black/10 bg-[#f6f7f9] px-3 py-1.5 text-[11px] font-semibold text-black/60 sm:grid sm:grid-cols-[1fr_140px_100px] sm:gap-2">
          <span>Name</span>
          <span>Type</span>
          <span>Date</span>
        </div>
        {projects.length === 0 && (
          <p className="px-3 py-6 text-center text-[12px] text-black/50">
            No results for “{query.trim()}”
          </p>
        )}
        {projects.map((project, i) => (
          <a
            key={project.slug}
            href={`#${project.slug}`}
            className={`flex flex-col gap-1.5 border-b border-black/5 px-3 py-2.5 text-[12px] hover:bg-accent hover:text-white sm:grid sm:grid-cols-[1fr_140px_100px] sm:items-start sm:gap-2 ${
              i % 2 === 0 ? "bg-white" : "bg-[#f2f5fb]"
            }`}
          >
            <span className="flex items-start gap-2">
              <FolderIcon className="mt-0.5 h-6 w-7 shrink-0" />
              <span>
                <span className="block font-semibold">{project.title}</span>
                <span className="mt-0.5 block text-[11px] opacity-80">
                  {project.summary}
                </span>
              </span>
            </span>
            <span className="pl-9 text-[11px] opacity-80 sm:pl-0 sm:pt-0.5 sm:opacity-100">
              {project.tags.join(", ")} · {project.year}
            </span>
          </a>
        ))}
      </div>

      <div className="flex shrink-0 items-center border-t border-black/10 bg-chrome px-3 py-1.5 text-[11px] text-black/60">
        {projects.length} {projects.length === 1 ? "item" : "items"}
      </div>
    </div>
  );
}
