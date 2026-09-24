import { site } from "@/data/site";
import { FolderIcon } from "../icons";

export function WorkWindow() {
  return (
    <div className="flex h-full flex-col">
      <div className="aqua-toolbar flex shrink-0 items-center gap-4 px-3 py-1.5 text-[12px] text-black/70">
        {["File", "Edit", "View", "Favorites", "Help"].map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
      <div className="flex shrink-0 items-center gap-2 bg-chrome px-3 py-2 text-[12px] text-black/70">
        <span>Address</span>
        <span className="aqua-field flex-1 px-2.5 py-1">
          Macintosh HD ▸ Portfolio ▸ Work
        </span>
      </div>

      <div className="aqua-field m-2 min-h-0 flex-1 overflow-y-auto">
        <div className="hidden border-b border-black/10 bg-[#f6f7f9] px-3 py-1.5 text-[11px] font-semibold text-black/60 sm:grid sm:grid-cols-[1fr_140px_100px] sm:gap-2">
          <span>Name</span>
          <span>Type</span>
          <span>Date</span>
        </div>
        {site.projects.map((project, i) => (
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
        {site.projects.length} items
      </div>
    </div>
  );
}
