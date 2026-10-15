import { site } from "@/data/site";

export function ContactWindow() {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex flex-1 flex-col items-center justify-center gap-5 p-8 text-center">
        <a
          href={`mailto:${site.email}`}
          className="aqua-button px-5 py-1.5 text-[13px] font-semibold"
        >
          {site.email}
        </a>

        <div className="flex gap-5 text-[12px]">
          {site.socials
            .filter((s) => s.label === "LinkedIn")
            .map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
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
