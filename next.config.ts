import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false, // evita que `next dev` regenere AGENTS.md/CLAUDE.md en cada arranque
};

export default nextConfig;
