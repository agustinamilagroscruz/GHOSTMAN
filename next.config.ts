import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false, // evita que `next dev` regenere AGENTS.md/CLAUDE.md en cada arranque
  devIndicators: false, // el overlay de dev intercepta teclado/mouse sobre el canvas del juego
};

export default nextConfig;
