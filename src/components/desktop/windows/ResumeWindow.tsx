import { site } from "@/data/site";

export function ResumeWindow() {
  return (
    <div className="flex h-full flex-col">
      <div className="aqua-toolbar flex shrink-0 items-center justify-between gap-4 px-3 py-1.5 text-[12px] text-black/70">
        <div className="flex gap-4">
          {["File", "Edit", "View", "Help"].map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
        <a href={site.resumeUrl} className="aqua-button px-3 py-1 text-[11px] font-medium">
          Download PDF
        </a>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-white p-5 text-[13px] leading-relaxed text-[#1a1a1a]">
        <div className="mb-4 flex items-baseline justify-between border-b-2 border-[#1a1a1a] pb-2">
          <span className="italic">{site.name.toLowerCase()}</span>
          <span className="text-[11px] text-[#777]">haewon.fyi</span>
        </div>

        <h2 className="mb-2 text-[15px] font-semibold">Experience</h2>
        <div className="mb-4 flex flex-col gap-4">
          {site.experience.map((entry) => (
            <div
              key={entry.company}
              className="flex flex-col gap-1 sm:grid sm:grid-cols-[100px_1fr] sm:gap-3"
            >
              <div>
                <p className="font-semibold">{entry.company}</p>
                <p className="text-[11px] text-[#777]">{entry.period}</p>
              </div>
              <div className="flex flex-col gap-2.5">
                {entry.roles.map((role) => (
                  <div key={role.title}>
                    <p className="font-semibold">{role.title}</p>
                    <p className="text-[12px] text-[#444]">{role.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <h2 className="mb-2 text-[15px] font-semibold">Education</h2>
        <div className="flex flex-col gap-2">
          {site.education.map((entry) => (
            <div
              key={entry.school}
              className="flex flex-col gap-1 sm:grid sm:grid-cols-[100px_1fr] sm:gap-3"
            >
              <div>
                <p className="font-semibold">{entry.school}</p>
                <p className="text-[11px] text-[#777]">{entry.period}</p>
              </div>
              <p className="text-[12px] text-[#444]">{entry.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
