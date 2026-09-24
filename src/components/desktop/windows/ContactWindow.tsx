import { site } from "@/data/site";
import { MailIcon } from "../icons";

export function ContactWindow() {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="aqua-toolbar flex shrink-0 gap-4 px-3 py-1.5 text-[12px] text-black/70">
        {["File", "Edit", "Actions", "Help"].map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
        <MailIcon className="h-16 w-16" />

        <div>
          <p className="text-[16px] font-semibold text-black">{site.name}</p>
          <p className="text-[12px] text-[#777]">
            {site.role} · {site.location}
          </p>
        </div>

        <a
          href={`mailto:${site.email}`}
          className="aqua-button px-5 py-1.5 text-[13px] font-semibold"
        >
          {site.email}
        </a>

        <div className="flex gap-5 text-[12px]">
          {site.socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              className="text-accent underline hover:opacity-70"
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
