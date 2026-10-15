import { site } from "@/data/site";

// on mobile the footer fills the 40px strip left under an expanded window
// (MOBILE_FOOTER_ROOM in Window.tsx) and centers its text in it
export function Footer({ lastUpdated }: { lastUpdated: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex justify-center px-4 py-2.5 text-[11px] max-sm:h-10 max-sm:items-center max-sm:py-0 text-[var(--desktop-footer)]">
      <span className="text-center">
        {site.name} · {lastUpdated} · Coded with Claude ♡
      </span>
    </div>
  );
}
