import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits `.next/standalone`, a self-contained server the runtime image can
  // run without dev dependencies. `docker/Dockerfile` copies it in the runtime
  // stage and its last COPY fails without this (`specs/init.md` -> 10).
  output: "standalone",
};

export default nextConfig;
