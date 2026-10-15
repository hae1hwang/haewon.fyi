import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // static HTML/CSS/JS in `out/`, which is what GitHub Pages serves
  output: "export",
  devIndicators: false,
};

export default nextConfig;
