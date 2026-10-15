import { site, type AboutLink } from "@/data/site";

type OpenProject = (folder: string, title: string, origin: { x: number; y: number }) => void;

// links get a very light blue highlight on hover (box-decoration-clone keeps it
// tidy when a link wraps onto two lines)
const linkClass =
  "-mx-0.5 rounded-[3px] px-0.5 underline [box-decoration-break:clone] hover:bg-[#d9ebff]";

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// underlines each linked phrase; clicking it opens that project's window
function withLinks(text: string, links: AboutLink[] = [], onOpenProject: OpenProject) {
  if (links.length === 0) return text;
  const pattern = new RegExp(`\\b(${links.map((l) => escapeRegExp(l.text)).join("|")})\\b`);
  return text.split(pattern).map((part, i) => {
    const link = links.find((l) => l.text === part);
    if (!link) return part;
    return (
      <a
        key={i}
        href="#"
        onClick={(e) => {
          e.preventDefault();
          const r = e.currentTarget.getBoundingClientRect();
          onOpenProject(link.folder, link.project, {
            x: r.left + r.width / 2,
            y: r.top + r.height / 2,
          });
        }}
        className={`${linkClass} text-black`}
      >
        {part}
      </a>
    );
  });
}

export function AboutWindow({ onOpenProject }: { onOpenProject: OpenProject }) {
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto bg-white p-5 text-[13px] leading-relaxed text-[#666]">
        <p className="mb-4">
          {site.name} · {site.location}
        </p>
        <div className="space-y-4">
          {site.about.timeline.map((entry) => (
            <div key={entry.year} className="grid grid-cols-[44px_1fr] gap-3">
              <span className="font-bold text-[#8c8c8c]">{entry.year}</span>
              <p>{withLinks(entry.text, "links" in entry ? entry.links : [], onOpenProject)}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-[#666]">{site.about.education}</p>
        <p className="mt-6 text-[#666]">
          <a
            href={site.resumeUrl}
            // opens in the browser's own PDF viewer in a new tab, not a download
            target="_blank"
            rel="noopener noreferrer"
            className={`${linkClass} hover:text-[#101010]`}
          >
            Download resume
          </a>
          {/* diagonal arrow: the usual "opens in a new tab" cue */}
          <svg
            viewBox="0 0 24 24"
            className="ml-1 inline-block h-[0.85em] w-[0.85em] -translate-y-px"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M7 17 17 7" />
            <path d="M8 7h9v9" />
          </svg>
        </p>
      </div>
    </div>
  );
}
