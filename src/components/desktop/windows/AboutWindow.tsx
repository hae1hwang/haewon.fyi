import { site } from "@/data/site";

// underlines each case-study keyword; hrefs are placeholders until the
// case studies exist
function withLinks(text: string, links: string[] = []) {
  if (links.length === 0) return text;
  const pattern = new RegExp(`\\b(${links.join("|")})\\b`);
  return text.split(pattern).map((part, i) =>
    links.includes(part) ? (
      <a key={i} href="#" className="underline hover:opacity-60">
        {part}
      </a>
    ) : (
      part
    )
  );
}

export function AboutWindow() {
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto bg-white p-5 text-[13px] leading-relaxed text-[#1a1a1a]">
        <p className="mb-4 font-semibold text-black/60">
          {site.name} · {site.location}
        </p>
        <div className="space-y-4">
          {site.about.timeline.map((entry) => (
            <div key={entry.year} className="grid grid-cols-[44px_1fr] gap-3">
              <span className="font-bold">{entry.year}</span>
              <p>{withLinks(entry.text, "links" in entry ? entry.links : [])}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-[#777]">{site.about.education}</p>
        <p className="mt-6 text-[11px] text-[#777]">
          <a
            href={site.resumeUrl}
            download
            className="underline hover:text-[#101010]"
          >
            Download PDF
          </a>
        </p>
      </div>
    </div>
  );
}
