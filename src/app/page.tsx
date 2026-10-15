import { Desktop } from "@/components/desktop/Desktop";

// this runs at build time (the site is a static export built on GitHub's UTC
// servers), so the zone is pinned rather than left to the machine's default
const TIME_ZONE = "America/New_York";

function formatLastUpdated(date: Date) {
  const day = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: TIME_ZONE,
  });
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TIME_ZONE,
  });
  return `Last updated ${day} @ ${time}`;
}

export default function Home() {
  const lastUpdated = formatLastUpdated(new Date());
  return <Desktop lastUpdated={lastUpdated} />;
}
