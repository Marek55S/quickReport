import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Cloud Run container.
  output: "standalone",
  // gRPC-based Google Cloud clients must not be bundled.
  serverExternalPackages: ["@google-cloud/firestore", "@google-cloud/storage"],
};

export default nextConfig;
