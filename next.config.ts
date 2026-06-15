import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This tells Next.js to build to a folder called 'dist' 
  // instead of '.next', which prevents the file locking error.
  distDir: 'dist', 
};

export default nextConfig;