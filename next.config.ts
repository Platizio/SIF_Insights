import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray lockfile in the user's home directory makes Turbopack infer the
  // wrong workspace root. Pin it to this project.
  turbopack: {
    root: path.resolve(__dirname),
  },

  images: {
    // Next 16 rejects any quality not listed here — a bare quality={85} on
    // <Image> is silently downgraded in the srcset and 400s if requested
    // directly. 85 exists for the hero banner: its sky and water are wide
    // smooth gradients, which are exactly what WebP bands at 75.
    qualities: [75, 85],
  },
};

export default nextConfig;
