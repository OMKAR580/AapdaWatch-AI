import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.output.hashFunction = "xxhash64";
    return config;
  },
};

export default nextConfig;
