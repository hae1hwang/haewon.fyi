import { site } from "@/data/site";

export function Footer({ lastUpdated }: { lastUpdated: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex justify-center px-4 py-2.5 text-[11px] text-[#101010]/70">
      <span className="text-center">
        {site.name} · {lastUpdated}
      </span>
    </div>
  );
}
