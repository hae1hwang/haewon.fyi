import { Desktop } from "@/components/desktop/Desktop";

function formatLastUpdated(date: Date) {
  const day = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${day} · ${time}`;
}

export default function Home() {
  const lastUpdated = formatLastUpdated(new Date());
  return <Desktop lastUpdated={lastUpdated} />;
}
