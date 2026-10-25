import { site } from "@/data/site";

// on mobile the footer fills the 40px strip left under an expanded window
// (MOBILE_FOOTER_ROOM in Window.tsx) and centers its text in it
// `faded` hides the text while the "close all" pill is using that strip;
// the text is half-strength so it doesn't compete with the windows
export function Footer({
  lastUpdated,
  faded = false,
}: {
  lastUpdated: string;
  faded?: boolean;
}) {
  return (
    <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex justify-center px-4 py-2.5 text-[11px] max-sm:h-10 max-sm:items-center max-sm:py-0 text-[var(--desktop-footer)] transition-opacity duration-200 ${
        faded ? "opacity-0" : "opacity-50"
      }`}>
      <span className="text-center">
        {site.name} · {lastUpdated} · Made in NYC ♡
      </span>
    </div>
  );
}
