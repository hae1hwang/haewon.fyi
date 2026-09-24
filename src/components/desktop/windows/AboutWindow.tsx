import { site } from "@/data/site";

export function AboutWindow() {
  return (
    <div className="flex h-full flex-col">
      <div className="aqua-toolbar flex shrink-0 gap-4 px-3 py-1.5 text-[12px] text-black/70">
        {["File", "Edit", "Format", "View", "Help"].map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-white p-5 text-[13px] leading-relaxed text-[#1a1a1a]">
        <p className="mb-3 font-semibold text-black/60">about.txt</p>
        {site.about.bio.map((p, i) => (
          <p key={i} className="mb-3 whitespace-pre-wrap">
            {p}
          </p>
        ))}
        <p className="mt-4 text-[#777]">
          Previously at: {site.about.companies.join(", ")}
        </p>
      </div>
    </div>
  );
}
