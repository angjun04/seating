import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";
const repoBase = "/seating";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  basePath: isProd ? repoBase : "",
  assetPrefix: isProd ? `${repoBase}/` : "",
};

export default nextConfig;
