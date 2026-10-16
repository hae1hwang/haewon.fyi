import type { Metadata } from "next";
import "./globals.css";
import { site } from "@/data/site";

const title = `${site.name} — ${site.role}`;

export const metadata: Metadata = {
  // lets the share-image tags below use absolute https://haewon.fyi/... URLs,
  // which link previews (iMessage, Slack, X) require
  metadataBase: new URL("https://haewon.fyi"),
  title,
  description: site.tagline,
  openGraph: {
    type: "website",
    url: "/",
    siteName: site.name,
    title,
    description: site.tagline,
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: site.tagline,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
